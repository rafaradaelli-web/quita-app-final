// src/services/parseFaturaExcel.js
//
// Parser de fatura de cartão exportada em Excel (.xlsx)
// Detecta o vencimento automaticamente a partir do nome do arquivo
// ou das células do topo da planilha.
//
// Aceita 3 formas de input:
//   1. File: parseFaturaExcel(file)
//   2. ArrayBuffer: parseFaturaExcel(arrayBuffer)
//   3. Objeto: parseFaturaExcel({ buffer: ArrayBuffer, fileName: 'nome.xlsx' })
//      (use esta quando o arquivo original está protegido por senha
//       e você já tem o buffer descriptografado)

import * as XLSX from 'xlsx';

export async function parseFaturaExcel(input, options = {}) {
  const { diasParaFechamento = 10 } = options;
  let { dataVencimento } = options;

  // 1) Resolver o input
  let buffer, fileName = '';
  if (input instanceof File) {
    buffer = await input.arrayBuffer();
    fileName = input.name;
  } else if (input && typeof input === 'object' && input.buffer) {
    buffer = input.buffer;
    fileName = input.fileName || '';
  } else {
    buffer = input;
  }

  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

  // 2) Detectar vencimento (se não veio nas options)
  if (!dataVencimento) {
    dataVencimento = detectarVencimento(rows, fileName);
  }

  if (!dataVencimento || isNaN(dataVencimento.getTime())) {
    throw new Error(
      'Não consegui identificar a data de vencimento da fatura. ' +
      'Verifique se o nome do arquivo segue o padrão "AAAA-MM-DD_Fatura_..." ' +
      'ou se a planilha tem a célula "Vencimento" preenchida.'
    );
  }

  // 3) Localizar a maior tabela de transações
  // (pode haver tabelas menores no topo: pagamentos, créditos)
  const allHeaders = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (
      Array.isArray(r) &&
      r.some(c => /^data$/i.test(String(c).trim())) &&
      r.some(c => /descri/i.test(String(c).trim())) &&
      r.some(c => /valor/i.test(String(c).trim()))
    ) {
      allHeaders.push(i);
    }
  }

  if (allHeaders.length === 0) {
    throw new Error('Cabeçalho da tabela de transações não encontrado.');
  }

  const tabelaIdx = allHeaders.reduce((maior, idx) => {
    let count = 0;
    for (let j = idx + 1; j < rows.length; j++) {
      const row = rows[j] || [];
      if (row.every(c => !String(c).trim())) break;
      count++;
    }
    return count > maior.count ? { idx, count } : maior;
  }, { idx: allHeaders[0], count: 0 }).idx;

  const header = rows[tabelaIdx].map(c => String(c).trim().toLowerCase());
  const colData = header.findIndex(c => c === 'data');
  const colDesc = header.findIndex(c => /descri/i.test(c));
  const colValor = header.findIndex(c => /valor/i.test(c));
  const colTipo = header.findIndex(c => /tipo/i.test(c));
  const colCartao = header.findIndex(c => /final.*cart/i.test(c));

  // 4) Data de competência (mês em que a fatura impacta o caixa)
  const dataCompetencia = new Date(dataVencimento);
  dataCompetencia.setDate(dataCompetencia.getDate() - diasParaFechamento);
  dataCompetencia.setHours(12, 0, 0, 0);

  // 5) Iterar linhas, agrupando descrições multi-linha
  const transacoes = [];
  const avisos = [];
  let i = tabelaIdx + 1;

  while (i < rows.length) {
    const row = rows[i] || [];

    if (row.every(c => !String(c).trim())) {
      i++;
      continue;
    }

    let dataRaw = String(row[colData] || '').trim();
    let descRaw = String(row[colDesc] || '').trim();
    const valorRaw = String(row[colValor] || '').trim();
    const tipoRaw = colTipo >= 0 ? String(row[colTipo] || '').trim() : '';
    const cartaoRaw = colCartao >= 0 ? String(row[colCartao] || '').trim() : '';

    // Concatena descrição multi-linha
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

    if (!dataRaw || !valorRaw) {
      if (descRaw) {
        avisos.push({ linha: i + 1, motivo: 'sem_data_ou_valor', dataRaw, valorRaw, descRaw });
      }
      i++;
      continue;
    }

    const dataCompra = parsearDataDDMM(dataRaw, dataVencimento);
    if (!dataCompra) {
      avisos.push({ linha: i + 1, motivo: 'data_invalida', dataRaw, descRaw, valorRaw });
      i++;
      continue;
    }

    const valor = parsearValor(valorRaw);
    if (valor === null) {
      avisos.push({ linha: i + 1, motivo: 'valor_invalido', dataRaw, descRaw, valorRaw });
      i++;
      continue;
    }

    // Detectar parcela (X/Y) e ajustar data se não for a 1ª
    const matchParcela = descRaw.match(/\((\d+)\/(\d+)\)/);
    let dataFinal = dataCompra;
    let metaParcela = null;

    if (matchParcela) {
      const parcelaAtual = parseInt(matchParcela[1], 10);
      const parcelaTotal = parseInt(matchParcela[2], 10);
      metaParcela = { atual: parcelaAtual, total: parcelaTotal };

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
        dataOriginalCompra: dataCompra,
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
 * Detecta o vencimento em 3 lugares (em ordem de confiança):
 *   1. Nome do arquivo: "AAAA-MM-DD_Fatura_..."
 *   2. Célula "Vencimento" + cabeçalho "Mês/AAAA"
 *   3. Apenas "Mês/AAAA" (assume dia 5)
 */
function detectarVencimento(rows, fileName) {
  if (fileName) {
    const m = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const meses = {
    janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  };

  let mesAnoFatura = null;
  let venDiaMes = null;

  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();

      const mAno = cell.match(/^(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*\/\s*(\d{4})$/i);
      if (mAno) {
        const nomeMes = mAno[1].toLowerCase().replace('ç', 'c');
        mesAnoFatura = { mes: meses[nomeMes], ano: parseInt(mAno[2], 10) };
      }

      if (/^vencimento$/i.test(cell)) {
        for (let cc = c + 1; cc < row.length; cc++) {
          const next = String(row[cc] || '').trim();
          const mDM = next.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
          if (mDM) {
            venDiaMes = {
              dia: parseInt(mDM[1], 10),
              mes: parseInt(mDM[2], 10),
              ano: mDM[3] ? parseInt(mDM[3], 10) : null,
            };
            break;
          }
        }
      }
    }
  }

  if (venDiaMes) {
    let ano = venDiaMes.ano;
    if (!ano && mesAnoFatura) ano = mesAnoFatura.ano;
    if (ano) {
      const d = new Date(ano, venDiaMes.mes - 1, venDiaMes.dia, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  if (mesAnoFatura) {
    const d = new Date(mesAnoFatura.ano, mesAnoFatura.mes - 1, 5, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

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

  const d = new Date(ano, mes - 1, dia, 12, 0, 0);
  if (isNaN(d.getTime())) return null;
  if (d.getDate() !== dia || d.getMonth() !== mes - 1) return null;
  return d;
}

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
