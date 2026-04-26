// src/services/parseFaturaExcel.js
//
// Parser genérico de fatura/extrato em Excel (.xlsx/.xls/.csv).
// Funciona com qualquer instituição financeira que exporte tabela com
// colunas de Data, Descrição e Valor — não está hardcoded pra um banco.
//
// Estratégia:
//   1. Lê o arquivo com cellDates+raw (preserva tipos: number/Date/string).
//   2. Detecta a tabela de transações por palavras-chave em qualquer linha.
//   3. Identifica colunas Data/Descrição/Valor combinando match de header
//      com análise de conteúdo (se o header for esquisito, conteúdo decide).
//   4. Parseia cada linha de forma defensiva (multi-formato).
//   5. Linhas inválidas viram avisos — nunca caem em fallback silencioso.
//
// Aceita 3 formas de input:
//   parseFaturaExcel(file)                                 // File API
//   parseFaturaExcel(arrayBuffer)                          // ArrayBuffer puro
//   parseFaturaExcel({ buffer, fileName })                 // pra arquivos descriptografados
//
// Output:
//   { transacoes: [...], avisos: [...], resumo: {...} }
//
// Cada transação: { data: "YYYY-MM-DDTHH:MM:SS" (local), descricao, valor,
//                   tipo, parcela: {atual, total} | null,
//                   origem: { linha, dataOriginalCompra } }

import * as XLSX from 'xlsx';

// ============================================================================
// PUBLIC API
// ============================================================================

export async function parseFaturaExcel(input, options = {}) {
  const {
    parcelaModo = 'vencimento', // 'vencimento' | 'original'
                                // 'vencimento': parcelas X>1 caem no dia do vencimento da fatura (recomendado, reflete fluxo de caixa real)
                                // 'original':   mantém a data da compra (preserva histórico)
                                // Em ambos os casos, a data original fica em origem.dataOriginalCompra.
  } = options;
  let { dataVencimento } = options;

  // 1) Resolver input
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

  // 2) Ler — não usamos cellDates pq o XLSX cria Date com offset estranho
  // que desloca o dia em fusos negativos (BRT, etc). Tratamos serial number na mão.
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

  if (!rows || rows.length === 0) {
    return { transacoes: [], avisos: [{ motivo: 'planilha_vazia' }], resumo: vazio() };
  }

  // 3) Detectar vencimento (opcional, ajuda a inferir ano em datas DD/MM)
  if (!dataVencimento) {
    dataVencimento = detectarVencimento(rows, fileName);
  }

  // 4) Localizar a tabela de transações
  const tabelaIdx = localizarTabela(rows);
  if (tabelaIdx === -1) {
    return {
      transacoes: [],
      avisos: [{ motivo: 'tabela_nao_encontrada', dica: 'Não encontrei colunas de Data, Descrição e Valor.' }],
      resumo: vazio(),
    };
  }

  const headerRow = rows[tabelaIdx];
  const dataRows = rows.slice(tabelaIdx + 1);

  // 5) Identificar colunas
  const colunas = detectarColunas(headerRow, dataRows, dataVencimento);
  if (colunas.colData === -1 || colunas.colValor === -1 || colunas.colDesc === -1) {
    return {
      transacoes: [],
      avisos: [{ motivo: 'colunas_incompletas', detectado: colunas }],
      resumo: vazio(),
    };
  }

  // 6) Iterar linhas e extrair transações
  const transacoes = [];
  const avisos = [];
  let i = 0;

  while (i < dataRows.length) {
    const row = dataRows[i] || [];
    const linhaPlanilha = tabelaIdx + 2 + i;

    // Pula linhas vazias
    if (row.every(c => c === '' || c === null || c === undefined)) {
      i++;
      continue;
    }

    let dataRaw = row[colunas.colData];
    let descRaw = String(row[colunas.colDesc] ?? '').trim();
    const valorRaw = row[colunas.colValor];
    const tipoRaw = colunas.colTipo >= 0 ? String(row[colunas.colTipo] ?? '').trim() : '';

    // 7a) Concatena descrições multi-linha (próxima linha sem data nem valor)
    while (i + 1 < dataRows.length) {
      const next = dataRows[i + 1] || [];
      const nextData = next[colunas.colData];
      const nextValor = next[colunas.colValor];
      const nextDesc = String(next[colunas.colDesc] ?? '').trim();

      const semDataNemValor =
        (nextData === '' || nextData === null || nextData === undefined) &&
        (nextValor === '' || nextValor === null || nextValor === undefined);

      if (semDataNemValor && nextDesc) {
        descRaw = `${descRaw} ${nextDesc}`.replace(/\s+/g, ' ').trim();
        i++;
      } else {
        break;
      }
    }

    // 7b) Pula se faltam dados essenciais
    const semData = dataRaw === '' || dataRaw === null || dataRaw === undefined;
    const semValor = valorRaw === '' || valorRaw === null || valorRaw === undefined;
    if (semData && semValor) { i++; continue; }
    if (semData || semValor) {
      if (descRaw) avisos.push({ linha: linhaPlanilha, motivo: 'sem_data_ou_valor', descRaw });
      i++;
      continue;
    }

    // 7c) Parse defensivo
    const dataCompra = parsearData(dataRaw, dataVencimento);
    if (!dataCompra) {
      avisos.push({ linha: linhaPlanilha, motivo: 'data_invalida', dataRaw, descRaw });
      i++; continue;
    }

    const valor = parsearValor(valorRaw);
    if (valor === null || valor === 0) {
      avisos.push({ linha: linhaPlanilha, motivo: 'valor_invalido', valorRaw, descRaw });
      i++; continue;
    }

    // 7d) Detectar parcela "(X/Y)"
    const matchParcela = descRaw.match(/\((\d+)\/(\d+)\)/);
    let dataFinal = dataCompra;
    let metaParcela = null;

    if (matchParcela) {
      const atual = parseInt(matchParcela[1], 10);
      const total = parseInt(matchParcela[2], 10);
      metaParcela = { atual, total };

      // Parcelas a partir da 2ª caem no dia do vencimento da fatura
      // (reflete fluxo de caixa real: é quando o pagamento sai da conta).
      // Data original da compra é preservada em origem.dataOriginalCompra.
      if (parcelaModo === 'vencimento' && atual > 1 && dataVencimento) {
        dataFinal = dataVencimento;
      }
    }

    transacoes.push({
      data: toLocalISO(dataFinal),
      descricao: descRaw,
      valor: Math.abs(valor), // app trabalha com gastos positivos
      tipo: tipoRaw,
      parcela: metaParcela,
      origem: {
        linha: linhaPlanilha,
        dataOriginalCompra: toLocalISO(dataCompra),
      },
    });

    i++;
  }

  return {
    transacoes,
    avisos,
    resumo: {
      total: transacoes.reduce((s, t) => s + t.valor, 0),
      qtdTransacoes: transacoes.length,
      qtdAvisos: avisos.length,
      dataVencimento: dataVencimento ? toLocalISO(dataVencimento) : null,
      colunasDetectadas: colunas,
    },
  };
}

// Exporta helpers pra testes
export { parsearValor, parsearData, detectarColunas, localizarTabela, detectarVencimento };

// ============================================================================
// PARSING DE VALOR — robusto contra number, string BR, string US
// ============================================================================

function parsearValor(raw) {
  if (raw === null || raw === undefined || raw === '') return null;

  // Tipo nativo (XLSX retorna number quando célula é numérica)
  if (typeof raw === 'number') {
    return isFinite(raw) ? raw : null;
  }

  let str = String(raw).trim();
  if (!str) return null;

  // Limpa símbolos e espaços
  str = str.replace(/r\$|reais?|brl|usd|us\$|\$/gi, '').replace(/\s/g, '');

  // Sinal: -123, 123-, (123), CR/DB suffix
  let negativo = false;
  if (/^\(.+\)$/.test(str)) { negativo = true; str = str.slice(1, -1); }
  if (str.startsWith('-')) { negativo = true; str = str.slice(1); }
  if (str.endsWith('-')) { negativo = true; str = str.slice(0, -1); }
  if (/[dD]$/.test(str)) { negativo = true; str = str.slice(0, -1); } // sufixo D = débito
  if (/[cC]$/.test(str)) { str = str.slice(0, -1); }                  // sufixo C = crédito

  if (!str) return null;

  // Detecta formato BR vs US olhando posição do último separador
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // BR: "1.234,56" → pontos = milhar, vírgula = decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: "1,234.56" → vírgulas = milhar, ponto = decimal
      str = str.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Só vírgula → BR (decimal)
    str = str.replace(/\./g, '').replace(',', '.');
  }
  // Só ponto ou nada → deixa como está (parseFloat aceita US/decimal)

  const n = parseFloat(str);
  if (!isFinite(n)) return null;
  return negativo ? -n : n;
}

// ============================================================================
// PARSING DE DATA — robusto contra Date, number serial, ISO, DD/MM, DD-MM
// ============================================================================

function parsearData(raw, dataReferencia = null) {
  if (raw === null || raw === undefined || raw === '') return null;

  // Date object nativo (XLSX com cellDates retorna Date pra colunas de data)
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    // O XLSX cria Date como UTC midnight pra "data pura". Se detectar isso,
    // usa accessors UTC (senão num timezone negativo o getDate() retorna dia anterior).
    if (raw.getUTCHours() === 0 && raw.getUTCMinutes() === 0 && raw.getUTCSeconds() === 0) {
      return new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate(), 12, 0, 0);
    }
    return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate(), 12, 0, 0);
  }

  // Número serial Excel (dias desde 1899-12-30).
  // Se vier com fração próxima de inteiro, é offset de timezone — arredondamos.
  if (typeof raw === 'number') {
    if (raw < 1 || raw > 100000) return null;
    // Arredonda se a fração for "perto" de 0 ou 1 (offset de fuso, não horário real)
    const frac = raw - Math.floor(raw);
    const serial = (frac < 0.05 || frac > 0.95) ? Math.round(raw) : raw;
    const ms = (serial - 25569) * 86400 * 1000;
    const utc = new Date(ms);
    if (isNaN(utc.getTime())) return null;
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12, 0, 0);
  }

  const str = String(raw).trim();
  if (!str) return null;

  // ISO YYYY-MM-DD (com ou sem hora)
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), 12, 0, 0);
    return validarData(d, parseInt(m[3]), parseInt(m[2])) ? d : null;
  }

  // DD/MM ou DD/MM/AAAA ou DD/MM/AA
  m = str.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const dia = parseInt(m[1], 10);
    const mes = parseInt(m[2], 10);
    let ano;
    if (m[3]) {
      ano = parseInt(m[3], 10);
      if (ano < 100) ano += ano < 70 ? 2000 : 1900;
    } else if (dataReferencia) {
      // Sem ano: infere a partir do vencimento (regra: mês > mês do venc → ano anterior)
      const anoRef = dataReferencia.getFullYear();
      const mesRef = dataReferencia.getMonth() + 1;
      ano = mes > mesRef ? anoRef - 1 : anoRef;
    } else {
      ano = new Date().getFullYear();
    }
    const d = new Date(ano, mes - 1, dia, 12, 0, 0);
    return validarData(d, dia, mes) ? d : null;
  }

  // DD-MM-AAAA
  m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    let ano = parseInt(m[3], 10);
    if (ano < 100) ano += ano < 70 ? 2000 : 1900;
    const dia = parseInt(m[1], 10);
    const mes = parseInt(m[2], 10);
    const d = new Date(ano, mes - 1, dia, 12, 0, 0);
    return validarData(d, dia, mes) ? d : null;
  }

  return null;
}

function validarData(d, dia, mes) {
  if (!d || isNaN(d.getTime())) return false;
  return d.getDate() === dia && d.getMonth() === mes - 1;
}

// ============================================================================
// LOCALIZAÇÃO DA TABELA DE TRANSAÇÕES
// ============================================================================

function localizarTabela(rows) {
  // Procura linhas com palavras-chave que pareçam header da tabela principal.
  // Pode haver várias tabelas (pagamentos, créditos, transações).
  // Pega a com mais linhas de dados embaixo.

  const candidatos = [];

  for (let i = 0; i < rows.length; i++) {
    const row = (rows[i] || []).map(c => String(c).toLowerCase().trim());

    const hasData = row.some(c =>
      /^(data|dt|date|dia|venc(?:imento)?|movimento|movimentação|d\.\s*lan(?:c|ç)am)/i.test(c)
    );
    const hasValor = row.some(c =>
      /^(valor|vlr|montante|quantia|amount|importância)$/i.test(c) ||
      /\(r?\$\)/i.test(c) ||
      /valor.*r?\$/i.test(c)
    );
    const hasDesc = row.some(c =>
      /^(desc|descri|hist|histór|estab|operação|narrativ|detalhe|description|movimento)/i.test(c)
    );

    if (hasData && (hasValor || hasDesc)) {
      // Conta linhas com algum conteúdo até a próxima linha vazia
      let count = 0;
      for (let j = i + 1; j < rows.length; j++) {
        const r = rows[j] || [];
        if (r.every(c => c === '' || c === null || c === undefined)) break;
        count++;
      }
      candidatos.push({ idx: i, count, hasValor, hasDesc });
    }
  }

  if (candidatos.length === 0) return -1;

  // Preferência: tabela com header completo (data + valor + desc) e maior contagem
  candidatos.sort((a, b) => {
    const aCompleto = a.hasValor && a.hasDesc ? 1 : 0;
    const bCompleto = b.hasValor && b.hasDesc ? 1 : 0;
    if (aCompleto !== bCompleto) return bCompleto - aCompleto;
    return b.count - a.count;
  });

  return candidatos[0].idx;
}

// ============================================================================
// DETECÇÃO DE COLUNAS — combina match de header com análise de conteúdo
// ============================================================================

function detectarColunas(headerRow, dataRows, dataReferencia = null) {
  const numCols = Math.max(
    (headerRow || []).length,
    ...dataRows.slice(0, 30).map(r => (r || []).length)
  );
  const sample = dataRows.slice(0, 30);

  const stats = [];
  for (let c = 0; c < numCols; c++) {
    let dataCount = 0, valorCount = 0, valorMax = 0, textCount = 0, textLen = 0;

    for (const row of sample) {
      const cell = (row || [])[c];
      if (cell === '' || cell === null || cell === undefined) continue;

      // Tenta data
      if (parsearData(cell, dataReferencia)) { dataCount++; continue; }

      // Tenta valor (com sanidade: transações financeiras geralmente entre 0.01 e 10MM)
      const v = parsearValor(cell);
      if (v !== null && typeof v === 'number') {
        const abs = Math.abs(v);
        if (abs >= 0.01 && abs <= 10_000_000) {
          valorCount++;
          if (abs > valorMax) valorMax = abs;
          continue;
        }
      }

      // Texto
      const s = String(cell).trim();
      if (s.length > 0) { textCount++; textLen += s.length; }
    }

    stats[c] = {
      idx: c,
      dataCount, valorCount, valorMax, textCount,
      textLenMedio: textCount > 0 ? textLen / textCount : 0,
      header: String((headerRow || [])[c] ?? '').toLowerCase().trim(),
    };
  }

  // === Coluna DATA ===
  let colData = stats.findIndex(s =>
    /^(data|dt|date|dia)$/i.test(s.header) ||
    /^d\.\s*lan/i.test(s.header) ||
    /^data\s*(do)?\s*movimento/i.test(s.header)
  );
  if (colData === -1) {
    colData = pickByCount(stats, 'dataCount');
  }

  // === Coluna VALOR ===
  let colValor = stats.findIndex((s, i) => i !== colData && (
    /^(valor|vlr|montante|amount|qtd|quantia|importância)$/i.test(s.header) ||
    /\(r?\$\)/i.test(s.header) ||
    /^valor\s*(da)?\s*(transa|opera)/i.test(s.header)
  ));
  if (colValor === -1) {
    colValor = pickByCount(stats.filter((_, i) => i !== colData), 'valorCount');
    if (colValor !== -1) colValor = stats.findIndex(s => s.idx === colValor);
  }

  // === Coluna DESCRIÇÃO ===
  let colDesc = stats.findIndex((s, i) =>
    i !== colData && i !== colValor && (
      /^(desc|descri|hist|histór|estab|operação|narrativ|detalh|movimento|description|memo)/i.test(s.header)
    )
  );
  if (colDesc === -1) {
    // Pega coluna com mais texto e maior comprimento médio
    let best = -1, bestScore = 0;
    stats.forEach((s, i) => {
      if (i === colData || i === colValor) return;
      const score = s.textCount * Math.min(s.textLenMedio, 50);
      if (score > bestScore) { best = i; bestScore = score; }
    });
    colDesc = best;
  }

  // === Coluna TIPO (opcional) ===
  let colTipo = stats.findIndex((s, i) =>
    i !== colData && i !== colValor && i !== colDesc &&
    /^(tipo|categoria|classifi|tipo\s*compra|natureza|operação)/i.test(s.header)
  );

  return { colData, colValor, colDesc, colTipo, stats };
}

function pickByCount(stats, field) {
  let best = -1, bestCount = 0;
  for (const s of stats) {
    if (s[field] > bestCount) { best = s.idx ?? stats.indexOf(s); bestCount = s[field]; }
  }
  return best;
}

// ============================================================================
// DETECÇÃO DE VENCIMENTO — múltiplas estratégias
// ============================================================================

function detectarVencimento(rows, fileName) {
  // Estratégia 1: nome do arquivo no padrão YYYY-MM-DD
  if (fileName) {
    const m = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Estratégia 2: célula "Vencimento" + cabeçalho "Mês/AAAA" (formato BTG)
  const meses = {
    janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  };

  let mesAnoFatura = null;
  let venDiaMes = null;

  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim();
      if (!cell) continue;

      // "Abril/2026" ou "Abril de 2026"
      const mAno = cell.match(/^(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s*[\/\s]?\s*(?:de\s+)?(\d{4})$/i);
      if (mAno) {
        const nomeMes = mAno[1].toLowerCase().replace('ç', 'c');
        if (meses[nomeMes]) {
          mesAnoFatura = { mes: meses[nomeMes], ano: parseInt(mAno[2], 10) };
        }
      }

      // Procura célula "Vencimento" e pega primeiro DD/MM próximo (mesma linha, à direita)
      if (/^vencimento$/i.test(cell) || /vencimento\s*:/i.test(cell)) {
        for (let cc = c + 1; cc < row.length; cc++) {
          const next = String(row[cc] ?? '').trim();
          // Aceita Date object também
          if (row[cc] instanceof Date && !isNaN(row[cc].getTime())) {
            const d = row[cc];
            venDiaMes = { dia: d.getDate(), mes: d.getMonth() + 1, ano: d.getFullYear() };
            break;
          }
          const mDM = next.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
          if (mDM) {
            venDiaMes = {
              dia: parseInt(mDM[1], 10),
              mes: parseInt(mDM[2], 10),
              ano: mDM[3] ? (parseInt(mDM[3], 10) < 100 ? parseInt(mDM[3], 10) + 2000 : parseInt(mDM[3], 10)) : null,
            };
            break;
          }
        }
      }
    }
  }

  if (venDiaMes) {
    const ano = venDiaMes.ano || (mesAnoFatura ? mesAnoFatura.ano : null);
    if (ano) {
      const d = new Date(ano, venDiaMes.mes - 1, venDiaMes.dia, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Estratégia 3: só "Mês/AAAA" → assume dia 5 como vencimento padrão
  if (mesAnoFatura) {
    return new Date(mesAnoFatura.ano, mesAnoFatura.mes - 1, 5, 12, 0, 0);
  }

  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

function toLocalISO(d) {
  // Retorna "YYYY-MM-DDTHH:MM:SS" preservando horário local.
  // Não usamos toISOString() porque ele converte pra UTC e desloca o dia.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function vazio() {
  return { total: 0, qtdTransacoes: 0, qtdAvisos: 0, dataVencimento: null };
}
