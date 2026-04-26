// src/services/parseFaturaExcel.js
//
// Parser de fatura de cartão exportada em Excel (.xlsx)
// Resolve os 3 bugs identificados no Quita:
//   1. Datas no futuro (ano sendo chutado como ano atual)
//   2. Avalanche de 28/02 (fallback silencioso quando data falha)
//   3. Parcelas datadas no mês da compra original ao invés do mês de competência
//
// Uso:
//   import { parseFaturaExcel } from './parseFaturaExcel';
//   const resultado = await parseFaturaExcel(file, {
//     dataVencimento: new Date('2026-04-10'),  // vem do input do usuário
//     diasParaFechamento: 10                    // opcional, padrão 10
//   });
//   // resultado.transacoes  -> array pronto pra inserir no Supabase
//   // resultado.avisos      -> linhas que precisam de revisão manual
//   // resultado.resumo      -> total, contagens, datas de referência

import * as XLSX from 'xlsx';

export async function parseFaturaExcel(file, options = {}) {
  const { dataVencimento, diasParaFechamento = 10 } = options;

  if (!dataVencimento || !(dataVencimento instanceof Date) || isNaN(dataVencimento.getTime())) {
    throw new Error('parseFaturaExcel: dataVencimento é obrigatória e precisa ser um Date válido.');
  }

  // 1) Ler o arquivo
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // raw:false força conversão pra string formatada (importante pra datas DD/MM virem como texto)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

  // 2) Localizar a linha do cabeçalho dinamicamente
  //    (planilha tem "Total de compras e despesas" no topo, linhas em branco, e só depois o header)
  const headerIdx = rows.findIndex(r =>
    Array.isArray(r) &&
    r.some(c => /^data$/i.test(String(c).trim())) &&
    r.some(c => /descri/i.test(String(c).trim())) &&
    r.some(c => /valor/i.test(String(c).trim()))
  );

  if (headerIdx === -1) {
    throw new Error('Não encontrei o cabeçalho da fatura (precisa ter colunas Data, Descrição e Valor).');
  }

  const header = rows[headerIdx].map(c => String(c).trim().toLowerCase());
  const colData = header.findIndex(c => c === 'data');
  const colDesc = header.findIndex(c => /descri/i.test(c));
  const colValor = header.findIndex(c => /valor/i.test(c));
  const colTipo = header.findIndex(c => /tipo/i.test(c));
  const colCartao = header.findIndex(c => /final.*cart/i.test(c));

  // 3) Data de competência da fatura (= mês em que essa fatura impacta o caixa)
  const dataCompetencia = new Date(dataVencimento);
  dataCompetencia.setDate(dataCompetencia.getDate() - diasParaFechamento);
  dataCompetencia.setHours(12, 0, 0, 0); // meio-dia evita pegadinha de fuso (UTC vs São Paulo)

  // 4) Iterar linhas, agrupando descrições multi-linha
  const transacoes = [];
  const avisos = [];
  let i = headerIdx + 1;

  while (i < rows.length) {
    const row = rows[i] || [];

    // pula linhas totalmente vazias
    if (row.every(c => !String(c).trim())) {
      i++;
      continue;
    }

    let dataRaw = String(row[colData] || '').trim();
    let descRaw = String(row[colDesc] || '').trim();
    let valorRaw = String(row[colValor] || '').trim();
    const tipoRaw = colTipo >= 0 ? String(row[colTipo] || '').trim() : '';
    const cartaoRaw = colCartao >= 0 ? String(row[colCartao] || '').trim() : '';

    // 4a) Se a próxima linha não tem data nem valor mas tem texto na descrição,
    //     ela é continuação (caso "Stars 3640115310 / 36401").
    while (i + 1 < rows.length) {
      const next = rows[i + 1] || [];
      const nextData = String(next[colData] || '').trim();
      const nextValor = String(next[colValor] || '').trim();
      const nextDesc = String(next[colDesc] || '').trim();
      if (!nextData && !nextValor && nextDesc) {
        descRaw = `${descRaw} ${nextDesc}`.replace(/\s+/g, ' ').trim();
        i++;
      } else {
        break;
      }
    }

    // pula se faltam dados essenciais
    if (!dataRaw || !valorRaw) {
      if (descRaw) {
        avisos.push({ linha: i + 1, motivo: 'sem_data_ou_valor', dataRaw, valorRaw, descRaw });
      }
      i++;
      continue;
    }

    // 5) Parse da data
    const dataCompra = parsearDataDDMM(dataRaw, dataVencimento);
    if (!dataCompra) {
      avisos.push({ linha: i + 1, motivo: 'data_invalida', dataRaw, descRaw, valorRaw });
      i++;
      continue;
    }

    // 6) Parse do valor
    const valor = parsearValor(valorRaw);
    if (valor === null) {
      avisos.push({ linha: i + 1, motivo: 'valor_invalido', dataRaw, descRaw, valorRaw });
      i++;
      continue;
    }

    // 7) Detectar parcela "(X/Y)" e ajustar data se não for a 1ª parcela
    const matchParcela = descRaw.match(/\((\d+)\/(\d+)\)/);
    let dataFinal = dataCompra;
    let metaParcela = null;

    if (matchParcela) {
      const parcelaAtual = parseInt(matchParcela[1], 10);
      const parcelaTotal = parseInt(matchParcela[2], 10);
      metaParcela = { atual: parcelaAtual, total: parcelaTotal };

      // Parcelas a partir da 2ª são "fantasmas" da compra original.
      // Pra análise mensal fazer sentido, datamos no mês de competência da fatura.
      if (parcelaAtual > 1) {
        dataFinal = new Date(dataCompetencia);
      }
    }

    transacoes.push({
      data: dataFinal,
      descricao: descRaw,
      valor,
      tipo: tipoRaw,
      finalCartao: cartaoRaw,
      parcela: metaParcela,
      origem: {
        linha: i + 1,
        dataOriginalCompra: dataCompra, // sempre guardamos a data real da compra
      },
    });

    i++;
  }

  const total = transacoes.reduce((s, t) => s + t.valor, 0);

  return {
    transacoes,
    avisos,
    resumo: {
      total,
      qtdTransacoes: transacoes.length,
      qtdAvisos: avisos.length,
      dataCompetencia,
      dataVencimento,
    },
  };
}

// ---------- helpers ----------

/**
 * Parseia "DD/MM" ou "DD/MM/AAAA" inferindo o ano a partir do vencimento.
 * Regra: se mês > mês do vencimento, é do ano anterior.
 *   Ex: vencimento 10/04/2026, transação "14/07" -> 14/07/2025
 *       vencimento 10/04/2026, transação "29/03" -> 29/03/2026
 */
function parsearDataDDMM(raw, dataVencimento) {
  const m = String(raw).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;

  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  let ano = m[3] ? parseInt(m[3], 10) : null;

  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  if (!ano) {
    const anoVenc = dataVencimento.getFullYear();
    const mesVenc = dataVencimento.getMonth() + 1;
    ano = mes > mesVenc ? anoVenc - 1 : anoVenc;
  } else if (ano < 100) {
    ano += 2000;
  }

  // meio-dia local pra blindar contra fuso UTC
  const d = new Date(ano, mes - 1, dia, 12, 0, 0);
  if (isNaN(d.getTime())) return null;
  if (d.getDate() !== dia || d.getMonth() !== mes - 1) return null; // ex: 31/02
  return d;
}

/**
 * Parseia "R$ 1.234,56" -> 1234.56
 */
function parsearValor(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw)
    .replace(/r\$\s?/i, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}
