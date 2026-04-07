import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Sparkles, TrendingUp, Shield, BookOpen, Target, Flame, AlertTriangle, ChevronRight, MessageCircle, Zap, Gift, Eye, FileText, Loader } from 'lucide-react'
import { T } from '../services/gameConfig'
import LESSONS_DATA from '../services/lessons.json'

// ══════════════════════════════════════════════════════════════════
// DIAGNÓSTICO FINANCEIRO — baseado em:
// • Financial Health Network (FinHealth Score) — 4 pilares
// • CFPB Financial Well-Being Scale (Consumer Financial Protection Bureau)
// • BCB — Índice de Saúde Financeira do Brasileiro
// ══════════════════════════════════════════════════════════════════
function calcDiagnostic(state) {
  const receitas = state.receitas || []
  // Renda recorrente (base mensal fixa)
  const rendaRecorrente = receitas.reduce((s, r) => s + (r.recorrente ? r.amount : 0), 0) || state.income || 0
  // Renda variável do último mês completo
  const hoje = new Date()
  const mesAtual = hoje.getMonth(), anoAtual = hoje.getFullYear()
  const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1
  const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual
  const mes2Atras = mesAnterior === 0 ? 11 : mesAnterior - 1
  const anoMes2Atras = mesAnterior === 0 ? anoMesAnterior - 1 : anoMesAnterior
  const inMonth = (e, m, y) => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y }
  const rendaVariavelMes = receitas.filter(r => !r.recorrente && inMonth(r, mesAnterior, anoMesAnterior)).reduce((s, r) => s + r.amount, 0)
  const income = rendaRecorrente + rendaVariavelMes

  const expenses = (state.expenses || []).filter(e => !e.oculto)
  const debts = state.debts || [], goals = state.goals || []
  const patrimonio = state.patrimonio || { reserva: 0, investimentos: {} }

  const MONTH_NAMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const lastMonthName = MONTH_NAMES[mesAnterior]
  const prevMonthName = MONTH_NAMES[mes2Atras]

  const last30 = expenses.filter(e => inMonth(e, mesAnterior, anoMesAnterior))
  const prev30 = expenses.filter(e => inMonth(e, mes2Atras, anoMes2Atras))
  const gastosMes = last30.reduce((s, e) => s + e.amount, 0)
  const gastosPrev = prev30.reduce((s, e) => s + e.amount, 0)
  const parcelasMes = debts.reduce((s, d) => s + (d.installment || d.parcela || 0), 0)
  const sobraMensal = income - gastosMes
  const catMap = {}, catPrevMap = {}
  last30.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount })
  prev30.forEach(e => { catPrevMap[e.category] = (catPrevMap[e.category] || 0) + e.amount })

  // ── 1. COMPROMETIMENTO (peso 0.20) ──
  // Quanto da renda é consumido APENAS por gastos registrados (sem somar parcelas — evita dupla contagem)
  // Faixas definidas com CNPI: <50% excelente, 50-70% ideal, 70-85% atenção, 85-100% crítico, >100% emergência
  let cr = 50
  if (income > 0) {
    const p = (gastosMes / income) * 100
    cr = p <= 50 ? Math.round(85 + (50 - p) / 50 * 15) : p <= 70 ? Math.round(60 + (70 - p) / 20 * 25) : p <= 85 ? Math.round(25 + (85 - p) / 15 * 35) : p <= 100 ? Math.round(5 + (100 - p) / 15 * 20) : Math.max(0, Math.round(5 - (p - 100) / 10 * 5))
  } else { cr = 10 }

  // ── 2. ENDIVIDAMENTO (peso 0.25) ──
  // Melhoria: considera prazo restante, calcula CET aproximado, usa parcela/renda
  let ne = 100
  if (debts.length > 0) {
    const PESO_TIPO = { cartao: 5, cheque: 5, pessoal: 3, carne: 3, veiculo: 2, imovel: 1 }

    // CET aproximado por dívida: taxa + IOF estimado (0.38% flat + 0.0082%/dia ≈ 0.6%/mês extra pra pessoal)
    const IOF_EXTRA = { pessoal: 0.6, carne: 0.3, cartao: 0, cheque: 0, veiculo: 0.2, imovel: 0.1 }

    let totalPenalty = 0
    debts.forEach(d => {
      const saldo = d.balance || d.total || d.amount || 0
      const taxa = (d.rate || 0) + (IOF_EXTRA[d.type] || 0) // CET aproximado
      const parcRestantes = d.installmentsLeft || (d.installment > 0 ? Math.ceil(saldo / d.installment) : 12)
      const peso = PESO_TIPO[d.type] || 3

      // Gravidade = saldo ponderado por tipo × fator de urgência (taxa alta + curto prazo = mais urgente)
      const urgencia = Math.min(3, 1 + taxa / 10 + (parcRestantes < 6 ? 0 : parcRestantes < 24 ? 0.5 : 1))
      totalPenalty += (saldo * peso * urgencia) / (income > 0 ? income : 3000)
    })

    ne = Math.max(0, Math.round(100 - totalPenalty * 2))
    if (debts.some(d => d.type === 'cartao' && (d.rate || 0) > 10)) ne = Math.max(0, ne - 15) // rotativo
    if (debts.some(d => d.type === 'cheque')) ne = Math.max(0, ne - 10)
    if (income > 0 && parcelasMes / income > 0.3) ne = Math.max(0, ne - 10)
  } else if (state.noDebts) { ne = 100 }

  // ── 3. CAPACIDADE DE POUPANÇA (peso 0.20) ──
  // Diferente do comprometimento: mede COMPORTAMENTO REAL de acumulação, não só sobra teórica
  // Verifica: patrimônio cresceu? Metas têm aportes? Reserva aumentou?
  let cp = 0
  if (income > 0) {
    let acumulacao = 0

    // a) Sobra teórica (peso 30% da nota)
    const pctSobra = (sobraMensal / income) * 100
    const notaSobra = pctSobra >= 25 ? 100 : pctSobra >= 15 ? 80 : pctSobra >= 5 ? 50 : pctSobra > 0 ? 20 : 0
    acumulacao += notaSobra * 0.3

    // b) Aportes em metas (peso 30%) — evidência concreta de poupança
    const totalAportado = goals.reduce((s, g) => s + (g.saved || 0), 0)
    const notaMetas = totalAportado > 0 ? Math.min(100, Math.round(totalAportado / income * 100 * 2)) : 0
    acumulacao += notaMetas * 0.3

    // c) Patrimônio relativo à renda (peso 40%) — resultado acumulado
    const inv = patrimonio.investimentos || {}
    const patrimonioLiquido = (patrimonio.reserva || 0) + Object.values(inv).reduce((s, v) => s + (v || 0), 0)
    const mesesPatrimonio = patrimonioLiquido / (income * 0.6 || 1)
    const notaPatrimonio = mesesPatrimonio >= 12 ? 100 : mesesPatrimonio >= 6 ? 80 : mesesPatrimonio >= 3 ? 55 : mesesPatrimonio >= 1 ? 30 : Math.round(mesesPatrimonio * 30)
    acumulacao += notaPatrimonio * 0.4

    cp = Math.round(acumulacao)
  }

  // ── 4. RESERVA DE EMERGÊNCIA (peso 0.20) ──
  // Ponderação por liquidez (validada com CNPI):
  // Poupança/CDB/Renda Fixa = 100%, FIIs = 70%, Ações BR/Internacional = 50%
  // Veículos e Imóveis = 0% (ilíquidos, não servem como reserva)
  const LIQUIDEZ = { poupanca: 1.0, renda_fixa: 1.0, fiis: 0.7, acoes_br: 0.5, acoes_int: 0.5, cripto: 0.4, previdencia: 0.3, veiculos: 0, imoveis: 0, outros: 0.3 }
  let reservaPonderada = patrimonio.reserva || 0 // reserva de emergência = 100% líquida
  Object.entries(patrimonio.investimentos || {}).forEach(([classe, valor]) => {
    reservaPonderada += (valor || 0) * (LIQUIDEZ[classe] ?? 0.3)
  })
  let re = 0
  const despesaEssencial = income > 0 ? income * 0.6 : gastosMes > 0 ? gastosMes * 0.7 : 1
  if (despesaEssencial > 0) {
    const meses = reservaPonderada / despesaEssencial
    re = meses >= 12 ? 100 : meses >= 6 ? Math.round(85 + (meses - 6) / 6 * 15) : meses >= 3 ? Math.round(55 + (meses - 3) / 3 * 30) : meses >= 1 ? Math.round(25 + (meses - 1) * 15) : Math.round(meses * 25)
  } else if (state.noPatrimonio) { re = 0 }

  // ── 5. PLANEJAMENTO (peso 0.10) ──
  let pl = 0
  if (goals.length > 0) {
    const goalsWithProgress = goals.filter(g => g.saved > 0).length
    const avgProgress = goals.reduce((s, g) => s + Math.min(1, g.saved / g.target), 0) / goals.length
    pl = Math.round((goalsWithProgress > 0 ? 30 : 10) + avgProgress * 50 + Math.min(goals.length, 3) * 5)
    if (goals.some(g => g.saved >= g.target)) pl = Math.min(100, pl + 10)
  }

  // ── 6. PROTEÇÃO PATRIMONIAL (peso 0.05) ──
  let pp = 0
  const classes = Object.entries(patrimonio.investimentos || {}).filter(([_, v]) => v > 0)
  const patrimonioTotal = (patrimonio.reserva || 0) + Object.values(patrimonio.investimentos || {}).reduce((s, v) => s + (v || 0), 0)
  // Patrimônio gerador de renda: investimentos + bens marcados como "investimento" (gera renda)
  // Exclui bens de uso próprio
  const bensFinalidade = patrimonio.bensFinalidade || {}
  const BENS_IDS = ['veiculos', 'imoveis']
  const patrimonioGerador = (patrimonio.reserva || 0) + Object.entries(patrimonio.investimentos || {}).reduce((s, [k, v]) => {
    if (BENS_IDS.includes(k)) {
      // Bem: só conta se finalidade é 'investimento'
      return s + ((bensFinalidade[k] === 'investimento') ? (v || 0) : 0)
    }
    return s + (v || 0) // Investimento: sempre conta
  }, 0)
  if (patrimonioTotal > 0) {
    pp = Math.min(30, Math.round(patrimonioTotal / (income > 0 ? income : 3000) * 10))
    pp += Math.min(30, classes.length * 10)
    if (patrimonio.reserva > 0) pp += 10
    if (classes.length >= 2) pp += 10
    if (patrimonioTotal > despesaEssencial * 12) pp += 20
    pp = Math.min(100, pp)
  } else if (state.noPatrimonio) { pp = 0 }

  const dims = [
    { key:'cr', label:'Comprometimento', value:cr, weight:0.20, Icon:TrendingUp, color:'#7C3AED' },
    { key:'ne', label:'Endividamento', value:ne, weight:0.25, Icon:Shield, color:'#EF4444' },
    { key:'cp', label:'Poupança', value:cp, weight:0.20, Icon:Target, color:'#22C55E' },
    { key:'re', label:'Reserva', value:re, weight:0.20, Icon:Shield, color:'#3B82F6' },
    { key:'pl', label:'Planejamento', value:pl, weight:0.10, Icon:BookOpen, color:'#F59E0B' },
    { key:'pp', label:'Patrimônio', value:pp, weight:0.05, Icon:Flame, color:'#F97316' },
  ]
  const score = Math.round(dims.reduce((s, d) => s + d.value * d.weight, 0))
  return { dims, score, income, rendaRecorrente, rendaVariavelMes, gastosMes, gastosPrev, parcelasMes, sobraMensal, debts, catMap, catPrevMap, reservaPonderada, patrimonioTotal, patrimonioGerador, goals, despesaEssencial, lastMonthName, prevMonthName }
}

// ══════════════════════════════════════════════════════════════════
// ENGINE DE ANÁLISE ESTATÍSTICA
// Médias móveis, medianas, desvio padrão, tendência, sazonalidade
// ══════════════════════════════════════════════════════════════════
function calcAnalytics(state) {
  const expenses = (state.expenses || []).filter(e => !e.oculto)
  const receitas = state.receitas || []
  const rendaRecorrente = receitas.reduce((s, r) => s + (r.recorrente ? r.amount : 0), 0) || state.income || 0
  // Renda variável do último mês completo
  const hoje = new Date()
  const mAnt = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1
  const yAnt = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear()
  const rendaVarMes = receitas.filter(r => !r.recorrente).filter(r => { const d = new Date(r.date); return d.getMonth() === mAnt && d.getFullYear() === yAnt }).reduce((s, r) => s + r.amount, 0)
  const income = rendaRecorrente + rendaVarMes
  const now = Date.now(), ms30 = 30 * 86400000

  // ── Agrupar gastos por mês ──
  const byMonth = {}
  expenses.forEach(e => {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!byMonth[key]) byMonth[key] = { total: 0, cats: {}, count: 0 }
    byMonth[key].total += e.amount
    byMonth[key].cats[e.category] = (byMonth[key].cats[e.category] || 0) + e.amount
    byMonth[key].count++
  })
  const months = Object.keys(byMonth).sort()
  const monthTotals = months.map(m => byMonth[m].total)

  // ── Agrupar por semana do mês (1-4) ──
  const byWeek = [0, 0, 0, 0]
  const weekCounts = [0, 0, 0, 0]
  expenses.filter(e => now - e.date < ms30 * 3).forEach(e => {
    const w = Math.min(3, Math.floor((new Date(e.date).getDate() - 1) / 7))
    byWeek[w] += e.amount
    weekCounts[w]++
  })
  const weekAvgs = byWeek.map((t, i) => weekCounts[i] > 0 ? t / Math.max(1, months.length) : 0)

  // ── Funções auxiliares ──
  const median = (arr) => {
    if (arr.length === 0) return 0
    const s = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }

  const stdDev = (arr) => {
    if (arr.length < 2) return 0
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length
    return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / arr.length)
  }

  const movingAvg = (arr, window) => {
    if (arr.length < window) return arr.length > 0 ? arr.reduce((s,v) => s+v, 0) / arr.length : 0
    const slice = arr.slice(-window)
    return slice.reduce((s, v) => s + v, 0) / window
  }

  // Tendência linear (regressão simples)
  const linearTrend = (arr) => {
    if (arr.length < 2) return { slope: 0, direction: 'estável' }
    const n = arr.length
    const xMean = (n - 1) / 2
    const yMean = arr.reduce((s, v) => s + v, 0) / n
    let num = 0, den = 0
    arr.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += Math.pow(x - xMean, 2) })
    const slope = den > 0 ? num / den : 0
    const pctChange = yMean > 0 ? (slope / yMean) * 100 : 0
    return {
      slope: Math.round(slope),
      pctChange: Math.round(pctChange),
      direction: pctChange > 5 ? 'subindo' : pctChange < -5 ? 'caindo' : 'estável',
      projNext: Math.round(yMean + slope * (n / 2))
    }
  }

  // ── Análises por categoria ──
  const catAnalysis = {}
  const allCats = new Set()
  months.forEach(m => Object.keys(byMonth[m].cats).forEach(c => allCats.add(c)))
  allCats.forEach(cat => {
    const values = months.map(m => byMonth[m].cats[cat] || 0)
    const nonZero = values.filter(v => v > 0)
    catAnalysis[cat] = {
      media: nonZero.length > 0 ? Math.round(nonZero.reduce((s, v) => s + v, 0) / nonZero.length) : 0,
      mediana: Math.round(median(nonZero)),
      desvio: Math.round(stdDev(nonZero)),
      mediaMovel3m: Math.round(movingAvg(values, 3)),
      tendencia: linearTrend(values),
      meses: nonZero.length,
      atual: values.length > 0 ? values[values.length - 1] : 0,
    }
  })

  // ── Análise geral ──
  const gastoTotal = {
    media: monthTotals.length > 0 ? Math.round(monthTotals.reduce((s, v) => s + v, 0) / monthTotals.length) : 0,
    mediana: Math.round(median(monthTotals)),
    desvio: Math.round(stdDev(monthTotals)),
    mediaMovel3m: Math.round(movingAvg(monthTotals, 3)),
    tendencia: linearTrend(monthTotals),
    mesesDeDados: months.length,
  }

  // ── Detecção de anomalias (gastos fora do padrão) ──
  const anomalias = []
  if (monthTotals.length >= 3) {
    const avg = gastoTotal.media, sd = gastoTotal.desvio
    const atual = monthTotals[monthTotals.length - 1]
    if (sd > 0 && atual > avg + 1.5 * sd) {
      anomalias.push({ tipo: 'gasto_alto', msg: `Mês atual R$ ${atual.toFixed(0)} — ${Math.round((atual/avg-1)*100)}% acima da média`, severidade: 'alta' })
    }
  }
  // Anomalias por categoria
  Object.entries(catAnalysis).forEach(([cat, a]) => {
    if (a.meses >= 2 && a.desvio > 0 && a.atual > a.media + 1.5 * a.desvio) {
      anomalias.push({ tipo: 'cat_alta', cat, msg: `${cat}: R$ ${a.atual} — ${Math.round((a.atual/a.media-1)*100)}% acima do normal`, severidade: 'media' })
    }
  })

  // ── Sazonalidade (padrão semanal) ──
  const weekLabels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']
  const semanaMaisCara = weekAvgs.indexOf(Math.max(...weekAvgs))
  const sazonalidade = weekAvgs[semanaMaisCara] > weekAvgs.reduce((s,v) => s+v, 0) / 4 * 1.3
    ? { detectada: true, semana: weekLabels[semanaMaisCara], pct: Math.round((weekAvgs[semanaMaisCara] / (weekAvgs.reduce((s,v)=>s+v,0)/4) - 1) * 100) }
    : { detectada: false }

  // ── Top categorias com potencial de corte ──
  const cortePotencial = Object.entries(catAnalysis)
    .filter(([cat, a]) => !['Moradia', 'Saúde', 'Educação', 'Impostos'].includes(cat) && a.media > 0)
    .sort((a, b) => b[1].media - a[1].media)
    .slice(0, 3)
    .map(([cat, a]) => ({ cat, media: a.media, corte30: Math.round(a.media * 0.3), corte50: Math.round(a.media * 0.5) }))

  return { gastoTotal, catAnalysis, anomalias, sazonalidade, cortePotencial, weekAvgs, months, byMonth }
}

function generateInsights(state, diag) {
  const { income, gastosMes, parcelasMes, debts, sobraMensal, catMap, catPrevMap, reservaPonderada, patrimonioTotal, patrimonioGerador, goals, despesaEssencial, lastMonthName, prevMonthName } = diag
  const ins = []

  // ── ALERTAS (vermelhos — severidade alta, ação urgente) ──
  const rot = debts.find(d => d.type === 'cartao' && (d.rate || 0) > 10)
  if (rot) {
    const t = rot.balance || rot.total || rot.amount || 0
    const taxa = rot.rate || 15
    ins.push({ type:'alerta', Icon:AlertTriangle, color:'#EF4444', severity: 10, title:'Rotativo do cartão ativo',
      desc:`R$ ${t.toFixed(0)} a ${taxa}%/mês vira R$ ${(t*Math.pow(1+taxa/100,12)).toFixed(0)} em 12 meses se não pagar. É a dívida mais cara do Brasil.`,
      action:'Prioridade máxima: ligue pro banco e negocie parcelamento com taxa menor. Qualquer taxa abaixo de 8%/mês já é melhor que o rotativo.' })
  }
  const cheque = debts.find(d => d.type === 'cheque')
  if (cheque) {
    const t = cheque.balance || cheque.total || cheque.amount || 0
    ins.push({ type:'alerta', Icon:AlertTriangle, color:'#EF4444', severity: 9, title:'Cheque especial ativo',
      desc:`R$ ${t.toFixed(0)} a ${cheque.rate||8}%/mês. Segunda pior dívida depois do rotativo do cartão.`,
      action:'Solicite ao banco um crédito pessoal pra cobrir o cheque especial — a taxa será menor. Depois cancele o limite do cheque especial.' })
  }
  if (sobraMensal < 0 && income > 0) {
    const hasVariavel = (diag.rendaVariavelMes || 0) > 0
    ins.push({ type:'alerta', Icon:AlertTriangle, color:'#EF4444', severity: 8,
    title:`Déficit de R$ ${Math.abs(sobraMensal).toFixed(0)}/mês`,
    desc:`Gastos de ${lastMonthName || 'último mês'} (R$ ${gastosMes.toFixed(0)}) superam a renda total (R$ ${income.toFixed(0)}${hasVariavel ? `, sendo R$ ${diag.rendaRecorrente.toFixed(0)} fixo + R$ ${diag.rendaVariavelMes.toFixed(0)} variável` : ''}).`,
    action:`Revise seus gastos por categoria e identifique onde cortar R$ ${Math.abs(sobraMensal).toFixed(0)} pra equilibrar.${hasVariavel ? ' Atenção: parte da sua renda é variável — nos meses com renda menor, o déficit pode ser ainda maior.' : ''}` })
  }
  if (income > 0 && parcelasMes / income > 0.3) ins.push({ type:'alerta', Icon:AlertTriangle, color:'#EF4444', severity: 7,
    title:`Parcelas: ${Math.round(parcelasMes/income*100)}% da renda`,
    desc:`R$ ${parcelasMes.toFixed(0)}/mês comprometidos com dívidas. O BCB recomenda no máximo 30%.`,
    action:'Evite assumir novas dívidas até esse % cair. Considere antecipar parcelas das dívidas com juros maiores.' })

  // ── OPORTUNIDADES (amarelos — atenção, algo pode estar fugindo do controle) ──
  const deliveryAtual = catMap['Delivery'] || 0, deliveryPrev = catPrevMap['Delivery'] || 0
  const alimAtual = catMap['Alimentação'] || 0, alimPrev = catPrevMap['Alimentação'] || 0
  if (deliveryPrev > 0 && deliveryAtual < deliveryPrev * 0.7 && alimAtual > alimPrev * 1.2 && alimPrev > 0) {
    ins.push({ type:'oportunidade', Icon:Eye, color:'#F59E0B', severity: 4,
      title:'Delivery → Alimentação?',
      desc:`Delivery caiu R$ ${(deliveryPrev - deliveryAtual).toFixed(0)} mas Alimentação subiu R$ ${(alimAtual - alimPrev).toFixed(0)} (${prevMonthName || 'mês anterior'} → ${lastMonthName || 'último mês'}). Pode ser que o gasto só mudou de lugar.`,
      action:'Compare os totais somados (Delivery + Alimentação) dos dois períodos pra ver se realmente economizou.' })
  }
  Object.entries(catMap).forEach(([c, v]) => {
    const p = catPrevMap[c] || 0
    if (p > 0 && v > p * 1.3 && v > 100) {
      const diff = v - p
      ins.push({ type:'oportunidade', Icon:Eye, color:'#F59E0B', severity: 5,
        title:`${c} subiu ${Math.round((v/p-1)*100)}%`,
        desc:`De R$ ${p.toFixed(0)} em ${prevMonthName || 'mês anterior'} pra R$ ${v.toFixed(0)} em ${lastMonthName || 'último mês'}. São R$ ${diff.toFixed(0)} a mais.`,
        action:`Verifique se foi um gasto pontual ou se virou padrão. Se for recorrente, isso significa R$ ${(diff*12).toFixed(0)} a mais por ano.` })
    }
  })
  if (deliveryAtual > 0 && income > 0 && deliveryAtual / income > 0.08) ins.push({ type:'oportunidade', Icon:Eye, color:'#F59E0B', severity: 5,
    title:`Delivery: ${Math.round(deliveryAtual/income*100)}% da renda`,
    desc:`R$ ${deliveryAtual.toFixed(0)}/mês em delivery. Em 1 ano são R$ ${(deliveryAtual*12).toFixed(0)}.`,
    action:`Reduzindo 50% você libera R$ ${(deliveryAtual/2).toFixed(0)}/mês — o suficiente pra construir uma reserva de emergência em ${income > 0 ? Math.ceil(income * 3 / (deliveryAtual/2)) : '?'} meses.` })
  if (income > 0 && reservaPonderada < despesaEssencial * 3) {
    const mesesCob = despesaEssencial > 0 ? (reservaPonderada / despesaEssencial).toFixed(1) : '0'
    ins.push({ type:'oportunidade', Icon:Eye, color:'#F59E0B', severity: 6,
      title:'Reserva abaixo de 3 meses',
      desc:`Você tem ${mesesCob} meses de cobertura em investimentos líquidos. O BCB recomenda mínimo 6 meses.`,
      action:'Comece com Tesouro Selic ou CDB de liquidez diária. Até poupança serve pra começar. O importante é ter o dinheiro acessível.' })
  }
  if (goals.length === 0) ins.push({ type:'oportunidade', Icon:Eye, color:'#F59E0B', severity: 3,
    title:'Sem metas definidas',
    desc:'Pesquisa BCB: pessoas com metas claras poupam 2x mais do que quem não tem.',
    action:'Crie pelo menos 1 meta no app (aba Financeiro > Metas). Pode ser simples: "Reserva de R$ 1.000 em 3 meses".' })

  // ── CONQUISTAS (verdes — celebrações com próximo passo) ──
  if (sobraMensal > 0 && diag.gastosPrev > 0 && gastosMes < diag.gastosPrev) {
    const saved = diag.gastosPrev - gastosMes
    ins.push({ type:'celebracao', Icon:Gift, color:'#22C55E', severity: 0,
      title:`Gastos caíram ${Math.round((1-gastosMes/diag.gastosPrev)*100)}%`,
      desc:`De R$ ${diag.gastosPrev.toFixed(0)} em ${prevMonthName || 'mês anterior'} pra R$ ${gastosMes.toFixed(0)} em ${lastMonthName || 'último mês'}. Você economizou R$ ${saved.toFixed(0)}!`,
      action:`Se mantiver essa economia, são R$ ${(saved*12).toFixed(0)} a mais por ano. Considere direcionar esse valor pra investimentos.` })
  }
  if ((debts.length === 0 && !state.noDebts === false) || state.noDebts) ins.push({ type:'celebracao', Icon:Gift, color:'#22C55E', severity: 0,
    title:'Livre de dívidas!',
    desc:'Sem dívidas você pode focar 100% em construir patrimônio.',
    action:'Próximo passo: direcione o valor que iria pra parcelas pro investimento. Comece pela reserva de emergência.' })
  if (reservaPonderada > despesaEssencial * 6) ins.push({ type:'celebracao', Icon:Gift, color:'#22C55E', severity: 0,
    title:'Reserva acima de 6 meses',
    desc:`${(reservaPonderada / despesaEssencial).toFixed(1)} meses de cobertura. Proteção sólida contra imprevistos.`,
    action:'Com a reserva completa, você pode começar a investir em ativos de maior risco/retorno (ações, FIIs) com o excedente.' })

  // ── PROJEÇÕES (azuis — futuro com plano concreto) ──
  if (sobraMensal > 0 && income > 0) {
    const falta = Math.max(0, despesaEssencial * 6 - reservaPonderada)
    if (falta > 0) { const m = Math.ceil(falta / sobraMensal); ins.push({ type:'projecao', Icon:TrendingUp, color:'#3B82F6', severity: 2,
      title:`Reserva completa em ${m} meses`,
      desc:`Guardando R$ ${sobraMensal.toFixed(0)}/mês, você atinge 6 meses de cobertura (R$ ${(despesaEssencial*6).toFixed(0)}).`,
      action:'Configure uma transferência automática no dia do pagamento. Dinheiro que não passa pela conta corrente não é gasto.' }) }
  }
  if (goals.length > 0) {
    const metaMaisProx = goals.filter(g => g.saved < g.target).sort((a, b) => (a.target - a.saved) - (b.target - b.saved))[0]
    if (metaMaisProx && sobraMensal > 0) {
      const falta = metaMaisProx.target - metaMaisProx.saved

      if (metaMaisProx.rendaPassivaMensal || /renda passiva/i.test(metaMaisProx.name)) {
        // Meta de renda passiva: patrimônio = (renda mensal × 12) / yield 6% a.a.
        let rendaMensal = metaMaisProx.rendaPassivaMensal
        // Migração: se não tem rendaPassivaMensal salvo, inferir do target
        if (!rendaMensal) {
          // Se target parece ser renda mensal (< 200.000), converter
          // Se target parece ser patrimônio (>= 200.000), calcular renda mensal reversa
          if (metaMaisProx.target < 200000) {
            rendaMensal = metaMaisProx.target
          } else {
            rendaMensal = Math.round((metaMaisProx.target * 0.06) / 12)
          }
        }
        const patrimonioAlvo = Math.round((rendaMensal * 12) / 0.06)
        // Patrimônio atual = apenas ativos geradores de renda (exclui bens de uso próprio)
        const patrimonioAtual = patrimonioGerador || 0
        const faltaPatrimonio = Math.max(0, patrimonioAlvo - patrimonioAtual)
        const pctAtingido = patrimonioAtual > 0 ? Math.min(100, Math.round((patrimonioAtual / patrimonioAlvo) * 100)) : 0
        const rendaAtual = patrimonioAtual > 0 ? Math.round((patrimonioAtual * 0.06) / 12) : 0

        ins.push({ type:'projecao', Icon:TrendingUp, color:'#3B82F6', severity: 2,
          title:`Renda passiva: R$ ${rendaMensal.toLocaleString('pt-BR')}/mês`,
          desc:`Patrimônio necessário: R$ ${patrimonioAlvo.toLocaleString('pt-BR')} (yield 6% a.a. em proventos).${patrimonioAtual > 0 ? ` Atual: R$ ${patrimonioAtual.toLocaleString('pt-BR')} (${pctAtingido}%) — gerando ~R$ ${rendaAtual.toLocaleString('pt-BR')}/mês.` : ` Faltam R$ ${faltaPatrimonio.toLocaleString('pt-BR')}.`}`,
          action:'Consideramos um yield de 6% a.a. em proventos, factível para uma carteira diversificada entre classes como FIIs, ações pagadoras de dividendos e renda fixa com cupom.' })
      } else {
        // Meta normal
        const m = Math.ceil(falta / sobraMensal)
        ins.push({ type:'projecao', Icon:TrendingUp, color:'#3B82F6', severity: 2,
          title:`Meta "${metaMaisProx.name}" em ${m} meses`,
          desc:`Faltam R$ ${falta.toLocaleString('pt-BR')} pra atingir.`,
          action:`Se separar R$ ${(falta / m).toFixed(0)}/mês exclusivamente pra essa meta, você chega lá.` })
      }
    }
  }

  // ── DICAS (roxos — educacional com direcionamento) ──
  if (income === 0) ins.push({ type:'conexao', Icon:BookOpen, color:'#7C3AED', severity: 6, title:'Cadastre sua renda',
    desc:'Sem renda cadastrada, o diagnóstico fica incompleto — não é possível calcular comprometimento, poupança e projeções.',
    action:'Vá em Financeiro > Receitas e adicione sua renda mensal (salário, freelance, etc.).' })
  if (diag.dims.find(d => d.key === 'ne')?.value < 40) ins.push({ type:'conexao', Icon:BookOpen, color:'#7C3AED', severity: 5,
    title:'Endividamento é seu ponto fraco',
    desc:'Dívidas com juros altos corroem patrimônio mais rápido do que qualquer investimento consegue render.',
    action:'Use o método avalanche: liste suas dívidas por taxa de juros e foque toda energia na de juros mais alto primeiro. As outras, pague o mínimo.' })

  // Ordenar por severidade (mais grave primeiro) e limitar a 6
  return ins.sort((a, b) => (b.severity || 0) - (a.severity || 0)).slice(0, 6)
}

function renderMd(text) {
  if (!text) return text
  const parts = []; let key = 0, lastIndex = 0, match
  const regex = /\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|\n/g
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[1]||match[2]) parts.push(<strong key={key++} style={{fontWeight:700}}>{match[1]||match[2]}</strong>)
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>)
    else if (match[0]==='\n') parts.push(<br key={key++}/>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : text
}

function Hexagon({ dims, size = 320, onDimClick }) {
  const cx=size/2,cy=size/2,r=size*0.26
  const ang = dims.map((_,i)=>(Math.PI*2*i/6)-Math.PI/2)
  const outer = ang.map(a=>`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`).join(' ')
  const vals = dims.map((d,i)=>{ const rv=r*(d.value/100); return `${cx+rv*Math.cos(ang[i])},${cy+rv*Math.sin(ang[i])}` }).join(' ')
  const grids = [0.25,0.5,0.75].map(p=>ang.map(a=>`${cx+r*p*Math.cos(a)},${cy+r*p*Math.sin(a)}`).join(' '))
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{width:'100%',maxWidth:size,display:'block',margin:'0 auto'}}>
      {grids.map((p,i)=><polygon key={i} points={p} fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth="0.5"/>)}
      <polygon points={outer} fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="1"/>
      {ang.map((a,i)=><line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="rgba(124,58,237,0.08)" strokeWidth="0.5"/>)}
      <polygon points={vals} fill="rgba(124,58,237,0.15)" stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"/>
      {dims.map((d,i)=>{ const rv=r*(d.value/100); return <circle key={i} cx={cx+rv*Math.cos(ang[i])} cy={cy+rv*Math.sin(ang[i])} r="3" fill={d.color}/> })}
      {dims.map((d,i)=>{ const lr=r+24,lx=cx+lr*Math.cos(ang[i]),ly=cy+lr*Math.sin(ang[i]); const anc=Math.abs(Math.cos(ang[i]))<0.3?'middle':Math.cos(ang[i])>0?'start':'end'; return (
        <g key={`l${i}`} onClick={()=>onDimClick?.(d)} style={{cursor:'pointer'}}>
          <text x={lx} y={ly-5} textAnchor={anc} fontSize="8" fontWeight="700" fill="#555">{d.label}</text>
          <text x={lx} y={ly+6} textAnchor={anc} fontSize="8" fontWeight="600" fill={d.color}>{d.value}</text>
        </g>
      ) })}
    </svg>
  )
}

const INSIGHT_LABELS = { alerta:'Alerta', oportunidade:'Oportunidade', celebracao:'Conquista', projecao:'Projeção', conexao:'Dica' }

const DIM_EXPLANATIONS = {
  cr: {
    name: 'Comprometimento de Renda',
    weight: '20%',
    what: 'Mede quanto da sua renda mensal total (recorrente + variável) é consumida por gastos. Quanto menor o comprometimento, mais folga financeira você tem.',
    how: 'Fórmula: (Gastos do último mês completo ÷ Renda total do mês) × 100. A renda inclui salário fixo + qualquer renda variável recebida no período. Score 100 = gasta menos de 50%. Score 0 = gasta mais de 100%.',
    tip: 'O ideal é comprometer no máximo 70% da renda, deixando 30% pra poupança e investimentos.',
  },
  ne: {
    name: 'Nível de Endividamento',
    weight: '25%',
    what: 'Avalia o peso das suas dívidas em relação à renda. É a dimensão com maior peso porque dívidas com juros altos podem comprometer toda a saúde financeira.',
    how: 'Fórmula: (Total de parcelas mensais ÷ Renda mensal) × 100. Score 100 = sem dívidas. Score 0 = parcelas acima de 50% da renda.',
    tip: 'Referência BCB: comprometimento com dívidas acima de 30% da renda é sinal de alerta.',
  },
  cp: {
    name: 'Capacidade de Poupança',
    weight: '20%',
    what: 'Mede se sobra dinheiro no fim do mês. Considera tanto a sobra teórica (renda - gastos) quanto aportes reais em metas e patrimônio acumulado.',
    how: 'Fórmula base: (Renda total - Gastos do mês) ÷ Renda × 100. Parcelas de dívida já estão incluídas nos gastos, não são subtraídas separadamente. Além da sobra, avalia aportes em metas e patrimônio relativo à renda.',
    tip: 'Poupar pelo menos 10% da renda é o mínimo recomendado. 20%+ é o ideal pra construir patrimônio.',
  },
  re: {
    name: 'Reserva de Emergência',
    weight: '20%',
    what: 'Avalia se você tem dinheiro líquido (investimentos de alta liquidez) suficiente pra cobrir emergências.',
    how: 'Fórmula: Reserva líquida ponderada ÷ Despesa essencial mensal. Score 100 = cobre 6+ meses. Score 0 = sem reserva.',
    tip: 'Recomendação BCB: mínimo 6 meses de despesas essenciais em investimentos de liquidez diária (poupança, CDB DI, Tesouro Selic).',
  },
  pl: {
    name: 'Planejamento Financeiro',
    weight: '10%',
    what: 'Avalia se você tem metas financeiras definidas e está trabalhando pra alcançá-las.',
    how: 'Score baseado no número de metas ativas. 3+ metas = score 100. 0 metas = score 0.',
    tip: 'Pesquisa BCB: pessoas com metas claras poupam 2x mais que quem não tem.',
  },
  pp: {
    name: 'Construção de Patrimônio',
    weight: '5%',
    what: 'Avalia o tamanho do patrimônio (investimentos + bens) em relação à renda. Peso menor porque leva tempo pra construir.',
    how: 'Fórmula: Patrimônio total ÷ (Renda anual). Score 100 = patrimônio acima de 5x a renda anual.',
    tip: 'O patrimônio cresce com o tempo. O importante é estar na direção certa, investindo regularmente.',
  },
}

export default function CoachScreen({ state, setState, save, onBack, navigate, NavBar }) {
  const [tab, setTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  const [plan, setPlan] = useState(state.actionPlan || null)
  const [savedDiag, setSavedDiag] = useState(state.savedDiagnostic || null)
  const [commitments, setCommitments] = useState(state.planCommitments || {})
  const [skipModal, setSkipModal] = useState(null)
  const [dimModal, setDimModal] = useState(null) // modal de explicação da dimensão
  const [regenIdx, setRegenIdx] = useState(null)
  const chatEndRef = useRef(null)

  // Fresh calc (usado pro chat context e pra gerar diagnóstico)
  const diag = calcDiagnostic(state)
  const analytics = calcAnalytics(state)
  const scoreFromDiag = (d) => ({
    color: d.score >= 71 ? '#16A34A' : d.score >= 51 ? '#F59E0B' : d.score >= 26 ? '#F97316' : '#EF4444',
    label: d.score >= 86 ? 'Liberdade' : d.score >= 71 ? 'Crescimento' : d.score >= 51 ? 'Controle' : d.score >= 26 ? 'Reorganização' : 'Sobrevivência'
  })

  // Icon map for reconstructing saved diagnostics
  const DIM_ICONS = { cr: TrendingUp, ne: Shield, cp: Target, re: Shield, pl: BookOpen, pp: Flame }
  const INSIGHT_ICONS = { alerta: AlertTriangle, oportunidade: Eye, celebracao: Gift, projecao: TrendingUp, conexao: BookOpen }

  // Reconstruct Icons from saved data
  const hydrateDims = (dims) => dims?.map(d => ({ ...d, Icon: DIM_ICONS[d.key] || Shield })) || []
  const hydrateInsights = (ins) => ins?.map(i => ({ ...i, Icon: INSIGHT_ICONS[i.type] || Sparkles })) || []

  // Displayed diagnostic (saved snapshot with Icons reconstructed)
  const displayDiag = savedDiag?.diag ? { ...savedDiag.diag, dims: hydrateDims(savedDiag.diag.dims) } : diag
  const displayInsights = savedDiag?.insights ? hydrateInsights(savedDiag.insights) : []
  const { color: scoreColor, label: scoreLabel } = scoreFromDiag(displayDiag)

  const generateDiagnostic = () => {
    const freshDiag = calcDiagnostic(state)
    const freshInsights = generateInsights(state, freshDiag)
    const freshAnalytics = calcAnalytics(state)
    // Strip Icon components before saving (can't serialize React components)
    const saveDims = freshDiag.dims.map(({ Icon, ...rest }) => rest)
    const saveInsights = freshInsights.map(({ Icon, ...rest }) => rest)
    const snapshot = { diag: { ...freshDiag, dims: saveDims }, insights: saveInsights, analytics: freshAnalytics, generatedAt: new Date().toISOString() }
    setSavedDiag(snapshot)
    setState(prev => {
      const n = { ...prev, savedDiagnostic: snapshot }
      save(n)
      return n
    })
  }

  const buildContext = () => {
    const debts = state.debts || [], catMap = diag.catMap
    const patrimonio = state.patrimonio || { reserva: 0, investimentos: {} }
    const chatMemory = state.chatMemory || []
    const memoryStr = chatMemory.length > 0 ? '\n\nMEMÓRIA DE CONVERSAS ANTERIORES:\n' + chatMemory.slice(-5).map(m => `[${m.date}] ${m.summary}`).join('\n') : ''
    const mesesCobertura = diag.despesaEssencial > 0 ? (diag.reservaPonderada / diag.despesaEssencial).toFixed(1) : '0'

    // Analytics avançado
    const a = analytics
    let analyticsStr = ''
    if (a.gastoTotal.mesesDeDados >= 2) {
      analyticsStr = `\n\nANÁLISE ESTATÍSTICA (${a.gastoTotal.mesesDeDados} meses de dados):`
      analyticsStr += `\nGasto mensal — média: R$ ${a.gastoTotal.media}, mediana: R$ ${a.gastoTotal.mediana}, desvio: R$ ${a.gastoTotal.desvio}`
      analyticsStr += `\nMédia móvel 3 meses: R$ ${a.gastoTotal.mediaMovel3m}`
      analyticsStr += `\nTendência: ${a.gastoTotal.tendencia.direction} (${a.gastoTotal.tendencia.pctChange > 0 ? '+' : ''}${a.gastoTotal.tendencia.pctChange}%/mês)`
      if (a.gastoTotal.tendencia.projNext > 0) analyticsStr += ` — projeção próximo mês: R$ ${a.gastoTotal.tendencia.projNext}`
      if (a.sazonalidade.detectada) analyticsStr += `\nSazonalidade: ${a.sazonalidade.semana} é ${a.sazonalidade.pct}% mais cara que a média`
      if (a.anomalias.length > 0) analyticsStr += `\nANOMALIAS: ${a.anomalias.map(an => an.msg).join('; ')}`
      if (a.cortePotencial.length > 0) analyticsStr += `\nPOTENCIAL DE CORTE: ${a.cortePotencial.map(c => `${c.cat}: média R$ ${c.media}, cortar 30% = -R$ ${c.corte30}/mês`).join('; ')}`
      const catsTrend = Object.entries(a.catAnalysis).filter(([_, v]) => v.meses >= 2).sort((a, b) => b[1].media - a[1].media).slice(0, 5)
      if (catsTrend.length > 0) analyticsStr += `\nCATEGORIAS (média/mediana/tendência): ${catsTrend.map(([c, v]) => `${c}: R$ ${v.media}/R$ ${v.mediana} (${v.tendencia.direction})`).join(', ')}`
    }

    return `DADOS FINANCEIROS DO USUÁRIO:
Renda mensal total: R$ ${diag.income.toFixed(0)} (recorrente: R$ ${(diag.rendaRecorrente||0).toFixed(0)} + variável ${diag.lastMonthName||'último mês'}: R$ ${(diag.rendaVariavelMes||0).toFixed(0)})
Gastos ${diag.lastMonthName||'último mês'}: R$ ${diag.gastosMes.toFixed(0)}
Gastos ${diag.prevMonthName||'mês anterior'}: R$ ${diag.gastosPrev.toFixed(0)}
Parcelas de dívidas: R$ ${diag.parcelasMes.toFixed(0)}/mês
Sobra mensal (renda - gastos): R$ ${diag.sobraMensal.toFixed(0)}
Patrimônio total: R$ ${diag.patrimonioTotal.toFixed(0)} (reserva R$ ${(patrimonio.reserva||0).toFixed(0)})
Patrimônio gerador de renda: R$ ${(diag.patrimonioGerador||0).toFixed(0)} (exclui bens de uso próprio)
Reserva ponderada por liquidez: R$ ${diag.reservaPonderada.toFixed(0)} = ${mesesCobertura} meses de cobertura
Score Quita: ${diag.score}/100 (${scoreLabel})
DIMENSÕES: ${diag.dims.map(d=>`${d.label}:${d.value}`).join(', ')}
DÍVIDAS (${debts.length}): ${debts.map(d=>`${d.name||d.type}: R$${(d.balance||d.total||d.amount||0).toFixed(0)} (${d.rate||0}%/mês, ${d.installmentsLeft||'?'} parcelas)`).join('; ')||'Nenhuma'}
GASTOS POR CATEGORIA: ${Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:R$${v.toFixed(0)}`).join(', ')||'Nenhum'}
ORÇAMENTO POR CATEGORIA: ${Object.keys(state.budgets||{}).length > 0 ? Object.entries(state.budgets).map(([k,v])=>`${k}:R$${v}`).join(', ') : 'Não definido'}${Object.keys(state.budgets||{}).length > 0 ? '\nCATEGORIAS ACIMA DO ORÇAMENTO: ' + (Object.entries(state.budgets).filter(([k,v])=>(catMap[k]||0)>v).map(([k,v])=>`${k}: gastou R$${(catMap[k]||0).toFixed(0)} de R$${v} (${Math.round(((catMap[k]||0)/v)*100)}%)`).join('; ') || 'Nenhuma') : ''}
METAS: ${(state.goals||[]).map(g=>`${g.name}: R$${g.saved||0} de R$${g.target}`).join('; ')||'Nenhuma'}${analyticsStr}${memoryStr}`
  }

  // ── SYSTEM PROMPT ADAPTATIVO ──
  const profileTone = diag.score < 30
    ? 'O usuário está em situação CRÍTICA. Seja empática mas direta. Foque APENAS em: parar sangria (dívidas caras), cortar gastos urgentes, sobreviver o mês. NÃO fale de investimentos ou patrimônio. Cada real importa.'
    : diag.score < 50
    ? 'O usuário está em REORGANIZAÇÃO. Seja motivacional e prática. Foque em: quitar dívidas por ordem de juros, criar orçamento simples, pequenas vitórias. Celebre qualquer progresso. Comece a mencionar reserva de emergência.'
    : diag.score < 70
    ? 'O usuário está em CONTROLE. Seja coaching e analítica. Foque em: otimizar gastos por categoria, acelerar quitação de dívidas, montar reserva de 6 meses. Pode falar de metas financeiras e planejamento.'
    : 'O usuário está em CRESCIMENTO. Seja estratégica e avançada. Pode falar de: diversificação de patrimônio, investimentos (sem recomendar ativos específicos), planejamento de longo prazo, independência financeira.'

  const SYSTEM_PROMPT = `Você é a Quita, a porquinha IA de finanças pessoais do app Quita. Você é a melhor amiga financeira do usuário — direta, honesta, empática e baseada em dados.

PERFIL DO USUÁRIO:
Nome: ${state.name || 'Usuário'}
Idade: ${state.age ? state.age + ' anos' : 'não informada'}
${profileTone}
${state.age && state.age < 25 ? 'JOVEM: horizonte longo de investimentos, pode correr mais risco, foque em educação financeira e hábitos.' : ''}
${state.age && state.age >= 50 ? 'MATURIDADE: horizonte mais curto, priorize preservação de capital, renda passiva e previdência.' : ''}

REGRAS:
1. SEMPRE use dados financeiros reais do usuário incluindo as ANÁLISES ESTATÍSTICAS quando disponíveis (médias, medianas, tendências). Nunca conselhos genéricos.
2. NUNCA julgue ou faça o usuário se sentir culpado.
3. SEMPRE inclua números concretos (R$, %, projeções). Use médias e tendências pra embasar.
4. Quando sugerir corte de gastos, cite a MÉDIA e MEDIANA da categoria pra contextualizar.
5. Tom informal brasileiro. Referências: iFood, Pix, Nubank, 13º, FGTS.
6. Se não tem dados suficientes, peça que cadastre mais informações.
7. NUNCA conselho de investimento específico (qual ação, qual fundo). Eduque e direcione.
8. Celebre conquistas reais com dados. Sem frases motivacionais vazias.
9. Respostas curtas e diretas. Máximo 3 parágrafos.
10. Use **negrito** só para valores e ações importantes. Não use listas com marcadores.
11. Se detectar ANOMALIA nos gastos, mencione proativamente.
12. Quando houver memória de conversas anteriores, conecte com o assunto atual se relevante.
13. Se o usuário perguntar sobre tendência, use os dados de tendência linear e média móvel.
14. RENDA PASSIVA é PROVENTOS — dividendos de FIIs, dividendos de ações, cupons de renda fixa. NÃO confundir com RENTABILIDADE (juros, valorização de cotas/ações). Sempre diferencie os dois conceitos quando o assunto surgir.
15. Para calcular patrimônio necessário pra renda passiva: (renda mensal desejada × 12) ÷ 0,06. O 6% a.a. é o yield médio de uma carteira diversificada em proventos. Carteiras mais conservadoras podem render 4-5% a.a.
16. Quando falar de renda passiva, exemplifique: FIIs pagam aluguéis mensais, ações pagam dividendos trimestrais/anuais, RF com cupom paga juros semestrais. Tudo isso são proventos.`

  const sendMessage = async (directMsg) => {
    const userMsg = (typeof directMsg === 'string' ? directMsg : input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role:'user', content:userMsg }])
    setLoading(true)
    try {
      const hist = messages.slice(-6).map(m=>`${m.role==='user'?'Usuário':'Quita'}: ${m.content}`).join('\n')
      const content = `${SYSTEM_PROMPT}\n\n${buildContext()}\n\n${hist ? 'Histórico da conversa atual:\n'+hist+'\n\n' : ''}Pergunta: ${userMsg}`
      const res = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content}]}) })
      const data = await res.json()
      const text = data.content?.map(c=>c.text||'').join('') || 'Desculpe, tente novamente.'
      setMessages(prev => [...prev, { role:'assistant', content:text }])

      // ── MEMÓRIA: salvar resumo da conversa a cada 4 mensagens ──
      const newMsgs = [...messages, { role:'user', content:userMsg }, { role:'assistant', content:text }]
      if (newMsgs.length >= 4 && newMsgs.length % 4 === 0) {
        try {
          const summaryPrompt = `Resuma em 1-2 frases curtas os pontos financeiros importantes desta conversa. Foque em: decisões tomadas, dúvidas do usuário, planos mencionados, conselhos dados. Responda APENAS o resumo, sem prefixo.\n\nConversa:\n${newMsgs.slice(-6).map(m=>`${m.role==='user'?'Usuário':'Quita'}: ${m.content}`).join('\n')}`
          const sumRes = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:150,messages:[{role:'user',content:summaryPrompt}]}) })
          const sumData = await sumRes.json()
          const summary = sumData.content?.map(c=>c.text||'').join('') || ''
          if (summary && summary.length > 10) {
            setState(prev => {
              const mem = [...(prev.chatMemory || []), { date: new Date().toLocaleDateString('pt-BR'), summary }].slice(-10)
              const n = { ...prev, chatMemory: mem }
              save(n)
              return n
            })
          }
        } catch(e) { /* silencioso — memória é bonus */ }
      }
    } catch(e) { setMessages(prev => [...prev, { role:'assistant', content:'Erro de conexão. Tente novamente.' }]) }
    setLoading(false)
  }

  // CAMADA 4 — Plano de Ação com sistema de comprometimento
  const getCommitmentsContext = () => {
    const c = state.planCommitments || {}
    const entries = Object.entries(c)
    if (entries.length === 0) return ''
    const accepted = entries.filter(([_,v]) => v.status === 'accepted')
    const skipped = entries.filter(([_,v]) => v.status === 'skipped')
    let ctx = '\n\nDECISÕES ANTERIORES DO USUÁRIO:'
    if (accepted.length > 0) ctx += `\nACEITOU (${accepted.length}): ${accepted.map(([k,v]) => k).join('; ')}`
    if (skipped.length > 0) ctx += `\nPULOU (${skipped.length}): ${skipped.map(([k,v]) => `"${k}" — motivo: ${v.reason||'não informou'}`).join('; ')}`
    ctx += '\nADAPTE as novas sugestões com base nessas decisões. Não repita sugestões que o usuário já pulou sem abordar o motivo.'
    return ctx
  }

  const acceptAction = (action, idx) => {
    const key = action.acao.slice(0, 60)
    const valor = parseFloat((action.impacto || '').replace(/[^\d]/g, '')) || 0
    // Criar meta automaticamente
    const goalId = Date.now()
    setState(prev => {
      const newGoal = { id: goalId, name: '📋 ' + action.acao.slice(0, 50), target: valor > 0 ? valor : 100, saved: 0, createdAt: Date.now(), fromPlan: true, prazo: action.prazo || '30 dias' }
      const newCommitments = { ...prev.planCommitments || {}, [key]: { status: 'accepted', goalId, date: new Date().toISOString() } }
      const n = { ...prev, goals: [...(prev.goals || []), newGoal], planCommitments: newCommitments }
      save(n)
      return n
    })
    setCommitments(prev => ({ ...prev, [key]: { status: 'accepted', goalId, date: new Date().toISOString() } }))
  }

  const skipAction = (action, reason) => {
    const key = action.acao.slice(0, 60)
    setState(prev => {
      const newCommitments = { ...prev.planCommitments || {}, [key]: { status: 'skipped', reason, date: new Date().toISOString() } }
      const n = { ...prev, planCommitments: newCommitments }
      save(n)
      return n
    })
    setCommitments(prev => ({ ...prev, [key]: { status: 'skipped', reason, date: new Date().toISOString() } }))
    setSkipModal(null)
  }

  const regenAction = async (idx) => {
    setRegenIdx(idx)
    try {
      const action = plan.imediato[idx]
      const prompt = `Você é a Quita. O usuário REJEITOU esta sugestão do plano: "${action.acao}".
${buildContext()}${getCommitmentsContext()}
Gere UMA nova sugestão alternativa diferente, considerando que o usuário não quis fazer a anterior.
Responda APENAS JSON: {"acao":"string","impacto":"R$ X","urgencia":"alta|media|baixa","etapa":"nome","prazo":"X dias"}`
      const res = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:300,messages:[{role:'user',content:prompt}]}) })
      const data = await res.json()
      const text = data.content?.map(c=>c.text||'').join('') || ''
      const newAction = JSON.parse(text.replace(/```json|```/g,'').trim())
      setPlan(prev => {
        const updated = { ...prev, imediato: prev.imediato.map((a, i) => i === idx ? newAction : a) }
        setState(p => { const n = { ...p, actionPlan: updated }; save(n); return n })
        return updated
      })
    } catch(e) { /* silencioso */ }
    setRegenIdx(null)
  }

  const generatePlan = async () => {
    setPlanLoading(true)
    try {
      const prompt = `Você é a Quita, a porquinha IA de finanças pessoais. Gere um plano de ação personalizado.

${buildContext()}${getCommitmentsContext()}

REGRAS:
1. Priorize por IMPACTO e URGÊNCIA (juros altos primeiro).
2. Ordem: quitar dívidas caras > reduzir gastos > montar reserva > investir.
3. Cada ação DEVE ter descrição, impacto em R$, prazo em dias, e etapa da trilha.
4. Horizonte imediato: máximo 4 ações executáveis em 30 dias.
5. Horizonte médio: 1 meta por mês, 3 meses.
6. Horizonte longo: projeção de 6 e 12 meses COM números.
7. Dados REAIS do usuário. Tom direto, empático, com números.
8. Se tem rotativo ou cheque especial, é SEMPRE prioridade 1.
9. Se o usuário pulou sugestões anteriores, adapte com alternativas realistas.

Responda APENAS JSON válido sem markdown:
{"resumo":"2-3 frases","imediato":[{"acao":"string","impacto":"R$ X","urgencia":"alta|media|baixa","etapa":"nome da etapa","prazo":"30 dias"}],"medio":[{"mes":1,"meta":"string","indicador":"string"}],"longo":{"em6m":{"score":0,"conquistas":["string"]},"em12m":{"score":0,"conquistas":["string"]}}}`
      const res = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:prompt}]}) })
      const data = await res.json()
      const text = data.content?.map(c=>c.text||'').join('') || ''
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim())
      parsed.generatedAt = Date.now()
      setPlan(parsed)
      // Persist plan
      setState(prev => { const n = { ...prev, actionPlan: parsed }; save(n); return n })
    } catch(e) { setPlan({ error: true }) }
    setPlanLoading(false)
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const Card = ({children, style}) => <div style={{background:'rgba(255,255,255,0.95)',borderRadius:20,padding:18,marginBottom:12,boxShadow:'0 2px 16px rgba(30,10,60,0.08)',border:'1px solid rgba(0,0,0,0.04)',...style}}>{children}</div>

  const _hasReceitas = (state.receitas||[]).length > 0
  const _hasExpenses = (state.expenses||[]).length >= 3
  const _hasDebts = (state.debts||[]).length > 0 || state.noDebts
  const _hasPatrimonio = (state.patrimonio?.reserva || 0) > 0 || Object.keys(state.patrimonio?.investimentos || {}).length > 0 || state.noPatrimonio
  const dataReady = _hasReceitas && _hasExpenses && _hasDebts && _hasPatrimonio
  const missingItems = []
  if (!_hasReceitas) missingItems.push({label:'Receitas', desc:'Cadastre pelo menos 1 receita', screen:'receitas'})
  if (!_hasExpenses) missingItems.push({label:'Gastos (mín. 3)', desc:'Registre seus gastos mensais', screen:'expenses'})
  if (!_hasDebts) missingItems.push({label:'Dívidas', desc:'Cadastre ou marque "Não tenho dívidas"', screen:'debts'})
  if (!_hasPatrimonio) missingItems.push({label:'Patrimônio', desc:'Informe reserva/investimentos ou marque que não tem', screen:'patrimonio'})

  const LockMessage = () => (
    <div style={{padding:'40px 24px',textAlign:'center'}}>
      <div style={{width:80,height:80,borderRadius:24,background:'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      </div>
      <div style={{fontSize:18,fontWeight:800,color:'#1A0A2E',marginBottom:6}}>Quase lá!</div>
      <div style={{fontSize:13,color:'#888',lineHeight:1.6,marginBottom:20}}>Para a Quita gerar seu {tab === 'diagnostico' ? 'diagnóstico financeiro' : 'plano de ação personalizado'}, preencha os dados que faltam:</div>
      <div style={{display:'flex',flexDirection:'column',gap:8,maxWidth:320,margin:'0 auto 24px'}}>
        {missingItems.map(m => (
          <div key={m.label} onClick={() => navigate(m.screen)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#fff',borderRadius:14,border:'1.5px solid rgba(239,68,68,0.15)',cursor:'pointer',textAlign:'left'}}>
            <div style={{width:32,height:32,borderRadius:10,background:'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v4M12 16h.01"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#333'}}>{m.label}</div>
              <div style={{fontSize:11,color:'#999',marginTop:1}}>{m.desc}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{background:'#F0EDF8',height:'100vh',overflow:'hidden',display:'flex',flexDirection:'column',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:'linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)',padding:'calc(var(--sat, 0px) + 16px) 20px 20px',borderRadius:'0 0 28px 28px',boxShadow:'0 8px 32px rgba(30,10,60,0.4)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <button onClick={onBack} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:12,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><ArrowLeft size={18} color="#fff"/></button>
          <div style={{flex:1}}><div style={{fontSize:T.title,fontWeight:T.bold,color:T.onDark}}>Quita IA</div></div>
        </div>
        <div style={{display:'flex',gap:3,background:'rgba(0,0,0,0.2)',borderRadius:12,padding:3}}>
          {[{id:'chat',label:'Chat'},{id:'diagnostico',label:'Diagnóstico'},{id:'plano',label:'Plano'}].map(t=>{
            const locked = (t.id === 'diagnostico' || t.id === 'plano') && !dataReady
            return (
              <button key={t.id} onClick={()=>{ setTab(t.id) }} style={{flex:1,padding:8,borderRadius:10,border:'none',fontSize:T.caption,fontWeight:T.semi,background:tab===t.id?'rgba(255,255,255,0.15)':'transparent',color:locked&&tab!==t.id?T.onDarkMuted:tab===t.id?T.onDark:T.onDarkSub,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                {locked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={tab===t.id?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.35)"} strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lock message */}
      {(tab === 'diagnostico' || tab === 'plano') && !dataReady && <div style={{flex:1,overflowY:'auto'}}><LockMessage /></div>}
      {(tab === 'diagnostico' || tab === 'plano') && !dataReady && NavBar && <NavBar />}

      {/* TAB: Diagnóstico */}
      {tab === 'diagnostico' && dataReady && !savedDiag && (
        <>
        <div style={{flex:1,overflowY:'auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{textAlign:'center',padding:'40px 24px'}}>
            <div style={{width:80,height:80,borderRadius:24,background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div style={{fontSize:T.title+4,fontWeight:T.bold,color:T.ink,marginBottom:8}}>Diagnóstico Financeiro</div>
            <div style={{fontSize:T.sub,color:T.secondary,lineHeight:T.relaxed,marginBottom:24}}>A Quita vai analisar seus dados e gerar um diagnóstico completo com score, 6 dimensões e insights personalizados.</div>
            <button onClick={generateDiagnostic} style={{padding:'14px 32px',borderRadius:16,border:'none',background:'linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(30,10,60,0.35)',display:'inline-flex',alignItems:'center',gap:8}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Gerar diagnóstico
            </button>
          </div>
        </div>
        {NavBar && <NavBar />}
        </>
      )}
      {tab === 'diagnostico' && dataReady && savedDiag && (
        <>
        <div style={{flex:1,overflowY:'auto'}}>
        <div style={{padding:'16px 16px 100px'}}>
          <Card style={{textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#999',letterSpacing:1,marginBottom:4}}>SCORE QUITA</div>
            <div style={{fontSize:48,fontWeight:800,color:scoreColor,lineHeight:1}}>{displayDiag.score}</div>
            <div style={{fontSize:14,fontWeight:700,color:scoreColor,marginTop:4}}>{scoreLabel}</div>
            <div style={{marginTop:12,background:'#F5F3FF',borderRadius:8,height:8,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${displayDiag.score}%`,background:`linear-gradient(90deg,${scoreColor},${scoreColor}cc)`,borderRadius:8,transition:'width 1s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:8,color:'#BBB',fontWeight:500}}>
              <span>Sobrevivência</span><span>Reorganização</span><span>Controle</span><span>Crescimento</span><span>Liberdade</span>
            </div>
          </Card>

          <Card>
            <div style={{fontSize:13,fontWeight:700,color:'#333',marginBottom:2}}>Suas 6 dimensões</div>
            <div style={{fontSize:11,color:'#999',marginBottom:8}}>Toque em uma dimensão pra entender</div>
            <Hexagon dims={displayDiag.dims} size={280} onDimClick={d => setDimModal(d)}/>
            <div style={{marginTop:8}}>
              {displayDiag.dims.map(d=>(
                <div key={d.key} onClick={() => setDimModal(d)} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer',padding:'4px 0',borderRadius:8}}>
                  <d.Icon size={14} color={d.color}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:11,fontWeight:600,color:'#555'}}>{d.label}</span><span style={{fontSize:11,fontWeight:700,color:d.color}}>{d.value}</span></div>
                    <div style={{background:'#F0F0F0',borderRadius:4,height:4}}><div style={{background:d.color,borderRadius:4,height:'100%',width:`${d.value}%`,transition:'width 1s'}}/></div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          </Card>

          {/* Modal de explicação da dimensão */}
          {dimModal && (
            <div onClick={() => setDimModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
              <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:24,padding:'24px 20px',maxWidth:340,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
                {(() => {
                  const exp = DIM_EXPLANATIONS[dimModal.key] || {}
                  return (
                    <>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                        <div style={{width:40,height:40,borderRadius:12,background:`${dimModal.color}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <dimModal.Icon size={20} color={dimModal.color}/>
                        </div>
                        <div>
                          <div style={{fontSize:16,fontWeight:800,color:'#1A0A2E'}}>{dimModal.label}</div>
                          <div style={{fontSize:12,color:'#999'}}>Peso: {exp.weight || '—'}</div>
                        </div>
                        <div style={{marginLeft:'auto',fontSize:28,fontWeight:800,color:dimModal.color}}>{dimModal.value}</div>
                      </div>

                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',letterSpacing:0.5,marginBottom:4}}>O QUE MEDE</div>
                        <div style={{fontSize:13,color:'#555',lineHeight:1.5}}>{exp.what || '—'}</div>
                      </div>

                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',letterSpacing:0.5,marginBottom:4}}>COMO É CALCULADO</div>
                        <div style={{fontSize:13,color:'#555',lineHeight:1.5}}>{exp.how || '—'}</div>
                      </div>

                      <div style={{background:'#F5F3FF',borderRadius:12,padding:12,marginBottom:16}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',letterSpacing:0.5,marginBottom:4}}>DICA</div>
                        <div style={{fontSize:13,color:'#555',lineHeight:1.5}}>{exp.tip || '—'}</div>
                      </div>

                      <button onClick={() => setDimModal(null)} style={{width:'100%',padding:12,borderRadius:14,border:'none',background:'linear-gradient(135deg,#7C3AED,#6D28D9)',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Entendi</button>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {displayInsights.length > 0 && <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:'#333',marginBottom:10}}>Insights personalizados</div>
            {displayInsights.map((ins,i)=>(
              <Card key={i} style={{padding:'14px 16px',border:`1px solid ${ins.color}20`}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:10,background:`${ins.color}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}><ins.Icon size={16} color={ins.color}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,fontWeight:600,color:ins.color,marginBottom:2}}>{INSIGHT_LABELS[ins.type]||''}</div>
                    <div style={{fontSize:13,fontWeight:700,color:'#333'}}>{ins.title}</div>
                    <div style={{fontSize:12,color:'#666',marginTop:3,lineHeight:1.5}}>{ins.desc}</div>
                    {ins.action && <div style={{fontSize:11,color:ins.color,fontWeight:600,marginTop:6}}>{ins.action}</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>}

          <button onClick={()=>setTab('chat')} style={{width:'100%',padding:14,borderRadius:16,border:'none',cursor:'pointer',background:'linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)',color:'#fff',fontSize:15,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 16px rgba(30,10,60,0.35)'}}><MessageCircle size={18}/> Tirar dúvidas com a Quita</button>
          {savedDiag?.generatedAt && <div style={{textAlign:'center',fontSize:11,color:'#BBB',marginTop:12}}>Gerado em {new Date(savedDiag.generatedAt).toLocaleDateString('pt-BR')}</div>}
          <button onClick={()=>{ if(window.confirm('Atualizar diagnóstico com seus dados mais recentes?')) generateDiagnostic() }} style={{width:'100%',marginTop:10,padding:12,borderRadius:14,border:'1.5px solid rgba(124,58,237,0.2)',background:'transparent',color:'#7C3AED',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Atualizar diagnóstico
          </button>
          <div style={{height:90}} />
        </div>
        </div>
        {NavBar && <NavBar />}
        </>
      )}

      {/* TAB: Plano de Ação */}
      {tab === 'plano' && dataReady && (
        <>
        <div style={{flex:1,overflowY:'auto'}}>
        <div style={{padding:'16px 16px 100px'}}>
          {planLoading && <div style={{textAlign:'center',padding:'60px 20px'}}><Loader size={32} color="#7C3AED" style={{animation:'spin 1s linear infinite'}}/><div style={{fontSize:14,color:'#999',marginTop:12}}>A Quita está analisando seus dados e montando seu plano personalizado...</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}

          {plan && plan.error && <Card style={{textAlign:'center',padding:30}}><AlertTriangle size={32} color="#EF4444" style={{margin:'0 auto 12px'}}/><div style={{fontSize:15,fontWeight:700,color:'#333'}}>Não foi possível gerar o plano</div><div style={{fontSize:13,color:'#999',marginTop:4}}>Verifique sua conexão e tente novamente.</div><button onClick={generatePlan} style={{marginTop:16,padding:'10px 24px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#7C3AED,#6D28D9)',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Tentar novamente</button></Card>}

          {plan && !plan.error && <>
            {/* Resumo */}
            <Card style={{background:`linear-gradient(135deg,${scoreColor}10,${scoreColor}05)`,border:`1px solid ${scoreColor}20`}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:12,background:`${scoreColor}18`,display:'flex',alignItems:'center',justifyContent:'center'}}><FileText size={18} color={scoreColor}/></div>
                <div><div style={{fontSize:14,fontWeight:700,color:'#1E0A3C'}}>Seu Plano de Ação</div><div style={{fontSize:11,color:'#999'}}>Score atual: {diag.score} — {scoreLabel}</div></div>
              </div>
              <div style={{fontSize:13,color:'#555',lineHeight:1.6}}>{plan.resumo}</div>
            </Card>

            {/* Progresso dos compromissos */}
            {(() => {
              const total = (plan.imediato||[]).length
              const accepted = (plan.imediato||[]).filter(a => commitments[a.acao?.slice(0,60)]?.status === 'accepted').length
              const skipped = (plan.imediato||[]).filter(a => commitments[a.acao?.slice(0,60)]?.status === 'skipped').length
              const pending = total - accepted - skipped
              if (accepted + skipped > 0) return (
                <Card style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#333'}}>Seus compromissos</div>
                    <div style={{fontSize:11,color:'#999'}}>{accepted} de {total} aceitos</div>
                  </div>
                  <div style={{display:'flex',gap:3,height:6,borderRadius:3,overflow:'hidden',background:'#F0F0F0'}}>
                    {accepted > 0 && <div style={{flex:accepted,background:'#22C55E',borderRadius:3}}/>}
                    {skipped > 0 && <div style={{flex:skipped,background:'#F59E0B',borderRadius:3}}/>}
                    {pending > 0 && <div style={{flex:pending,background:'#E5E5E5',borderRadius:3}}/>}
                  </div>
                  <div style={{display:'flex',gap:12,marginTop:6}}>
                    <div style={{fontSize:10,color:'#22C55E',fontWeight:600}}>Aceitos: {accepted}</div>
                    <div style={{fontSize:10,color:'#F59E0B',fontWeight:600}}>Pulados: {skipped}</div>
                    {pending > 0 && <div style={{fontSize:10,color:'#999',fontWeight:600}}>Pendentes: {pending}</div>}
                  </div>
                </Card>
              )
              return null
            })()}

            {/* Recalibração empática se muitos skips */}
            {(() => {
              const total = (plan.imediato||[]).length
              const skipped = (plan.imediato||[]).filter(a => commitments[a.acao?.slice(0,60)]?.status === 'skipped').length
              if (total > 0 && skipped >= total - 1 && skipped >= 2) return (
                <Card style={{background:'#FFFBEB',border:'1px solid #FDE68A',padding:'14px 16px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{fontSize:20,flexShrink:0,marginTop:2}}>🐷</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#92400E'}}>Essas sugestões fazem sentido pra você?</div>
                      <div style={{fontSize:12,color:'#A16207',marginTop:4,lineHeight:1.5}}>Percebi que a maioria das sugestões não se encaixou na sua realidade. Quer que eu gere um novo plano mais adaptado?</div>
                      <button onClick={()=>{ setCommitments({}); setState(prev=>{ const n={...prev,planCommitments:{}}; save(n); return n }); generatePlan() }} style={{marginTop:10,padding:'8px 16px',borderRadius:10,border:'none',background:'#F59E0B',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Recalibrar plano</button>
                    </div>
                  </div>
                </Card>
              )
              return null
            })()}

            {/* Ações imediatas interativas */}
            <div style={{fontSize:12,fontWeight:700,color:'#7C3AED',marginBottom:8,marginTop:8}}>Próximos 30 dias</div>
            {(plan.imediato||[]).map((a,i)=>{
              const key = a.acao?.slice(0,60)
              const status = commitments[key]?.status
              const isRegen = regenIdx === i
              return (
              <Card key={i} style={{padding:'14px 16px', opacity: isRegen ? 0.5 : 1, border: status === 'accepted' ? '1.5px solid #22C55E' : status === 'skipped' ? '1.5px solid #F59E0B' : '1px solid rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{width:28,height:28,borderRadius:10,background: status === 'accepted' ? '#F0FDF4' : status === 'skipped' ? '#FFFBEB' : a.urgencia==='alta'?'#FEF2F2':a.urgencia==='media'?'#FFFBEB':'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}>
                    {status === 'accepted' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                     : status === 'skipped' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                     : <span style={{fontSize:12,fontWeight:800,color:a.urgencia==='alta'?'#EF4444':a.urgencia==='media'?'#F59E0B':'#22C55E'}}>{i+1}</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color: status === 'skipped' ? '#999' : '#333',lineHeight:1.4,textDecoration: status === 'skipped' ? 'line-through' : 'none'}}>{a.acao}</div>
                    <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,fontWeight:600,color:'#22C55E',background:'#F0FDF4',padding:'2px 8px',borderRadius:6}}>{a.impacto}</span>
                      {a.prazo && <span style={{fontSize:10,fontWeight:600,color:'#3B82F6',background:'#EFF6FF',padding:'2px 8px',borderRadius:6}}>{a.prazo}</span>}
                      {a.etapa && <span style={{fontSize:10,fontWeight:600,color:'#7C3AED',background:'#F5F3FF',padding:'2px 8px',borderRadius:6}}>{a.etapa}</span>}
                    </div>
                    {/* Botões de compromisso */}
                    {!status && !isRegen && (
                      <div style={{display:'flex',gap:6,marginTop:10}}>
                        <button onClick={()=>acceptAction(a,i)} style={{flex:1,padding:'8px',borderRadius:10,border:'none',background:'#22C55E',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg> Aceitar
                        </button>
                        <button onClick={()=>setSkipModal(i)} style={{flex:1,padding:'8px',borderRadius:10,border:'1.5px solid #F59E0B',background:'transparent',color:'#F59E0B',fontSize:11,fontWeight:700,cursor:'pointer'}}>Pular</button>
                        <button onClick={()=>regenAction(i)} style={{width:36,padding:'8px',borderRadius:10,border:'1.5px solid #DDD',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                        </button>
                      </div>
                    )}
                    {isRegen && <div style={{fontSize:11,color:'#999',marginTop:8}}>Gerando nova sugestão...</div>}
                    {status === 'accepted' && <div style={{fontSize:11,color:'#22C55E',fontWeight:600,marginTop:8}}>Compromisso aceito — meta criada automaticamente</div>}
                    {status === 'skipped' && commitments[key]?.reason && <div style={{fontSize:11,color:'#F59E0B',marginTop:6}}>Motivo: {commitments[key].reason}</div>}
                  </div>
                </div>
              </Card>
            )})}

            {/* Modal de motivo do skip */}
            {skipModal !== null && plan.imediato[skipModal] && (
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
                <div style={{background:'#fff',borderRadius:24,padding:24,maxWidth:340,width:'100%',boxShadow:'0 16px 48px rgba(0,0,0,0.2)'}}>
                  <div style={{fontSize:16,fontWeight:800,color:'#1A0A2E',marginBottom:4}}>Por que pular?</div>
                  <div style={{fontSize:12,color:'#999',marginBottom:16,lineHeight:1.5}}>Isso ajuda a Quita a te dar sugestões melhores da próxima vez.</div>
                  {['Não consigo fazer agora','Não faz sentido pra mim','Já estou fazendo isso','Acho muito difícil','Prefiro não dizer'].map(reason => (
                    <button key={reason} onClick={()=>skipAction(plan.imediato[skipModal], reason)} style={{display:'block',width:'100%',padding:'12px 14px',marginBottom:6,borderRadius:12,border:'1.5px solid #F0F0F0',background:'#FAFAFA',color:'#555',fontSize:13,fontWeight:500,cursor:'pointer',textAlign:'left'}}>{reason}</button>
                  ))}
                  <button onClick={()=>setSkipModal(null)} style={{width:'100%',marginTop:8,padding:10,borderRadius:12,border:'none',background:'transparent',color:'#999',fontSize:12,cursor:'pointer'}}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Médio prazo */}
            {plan.medio && plan.medio.length > 0 && <>
              <div style={{fontSize:12,fontWeight:700,color:'#3B82F6',marginBottom:8,marginTop:16}}>Próximos 3 meses</div>
              {plan.medio.map((m,i)=>(
                <Card key={i} style={{padding:'12px 16px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#3B82F6',marginBottom:4}}>Mês {m.mes}</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#333'}}>{m.meta}</div>
                  <div style={{fontSize:11,color:'#999',marginTop:3}}>{m.indicador}</div>
                </Card>
              ))}
            </>}

            {/* Longo prazo */}
            {plan.longo && <div style={{marginTop:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'#22C55E',marginBottom:8}}>Projeção de futuro</div>
              <div style={{display:'flex',gap:10}}>
                {plan.longo.em6m && <Card style={{flex:1,padding:'14px',textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#999'}}>Em 6 meses</div>
                  <div style={{fontSize:28,fontWeight:800,color:'#22C55E',marginTop:4}}>{plan.longo.em6m.score}</div>
                  <div style={{fontSize:9,color:'#999'}}>Score estimado</div>
                  {(plan.longo.em6m.conquistas||[]).map((c,i)=><div key={i} style={{fontSize:10,color:'#555',marginTop:4,lineHeight:1.3}}>{c}</div>)}
                </Card>}
                {plan.longo.em12m && <Card style={{flex:1,padding:'14px',textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#999'}}>Em 12 meses</div>
                  <div style={{fontSize:28,fontWeight:800,color:'#16A34A',marginTop:4}}>{plan.longo.em12m.score}</div>
                  <div style={{fontSize:9,color:'#999'}}>Score estimado</div>
                  {(plan.longo.em12m.conquistas||[]).map((c,i)=><div key={i} style={{fontSize:10,color:'#555',marginTop:4,lineHeight:1.3}}>{c}</div>)}
                </Card>}
              </div>
            </div>}

            {plan.generatedAt && <div style={{textAlign:'center',fontSize:11,color:'#BBB',marginTop:12}}>Gerado em {new Date(plan.generatedAt).toLocaleDateString('pt-BR')}</div>}
            <button onClick={()=>{ if(window.confirm('Tem certeza? O plano atual será substituído.')) { setCommitments({}); setState(prev=>{ const n={...prev,planCommitments:{}}; save(n); return n }); generatePlan() } }} style={{width:'100%',marginTop:12,padding:12,borderRadius:14,border:'1.5px solid rgba(124,58,237,0.2)',background:'transparent',color:'#7C3AED',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              Atualizar plano
            </button>
          </>}

          {!plan && !planLoading && <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300}}>
            <div style={{textAlign:'center',padding:'40px 24px'}}>
              <div style={{width:80,height:80,borderRadius:24,background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <FileText size={36} color="#7C3AED"/>
              </div>
              <div style={{fontSize:22,fontWeight:800,color:'#1A0A2E',marginBottom:8}}>Plano de Ação</div>
              <div style={{fontSize:14,color:'#888',lineHeight:1.6,marginBottom:24}}>A Quita vai analisar seus dados e montar um plano personalizado com ações concretas para os próximos meses.</div>
              <button onClick={generatePlan} style={{padding:'14px 32px',borderRadius:16,border:'none',background:'linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(30,10,60,0.35)',display:'inline-flex',alignItems:'center',gap:8}}>
                <FileText size={18} color="#fff"/>
                Gerar meu plano
              </button>
            </div>
          </div>}
          <div style={{height:90}} />
        </div>
        </div>
        {NavBar && <NavBar />}
        </>
      )}

      {/* TAB: Chat */}
      {tab === 'chat' && (
        <>
        <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
          <div style={{flex:1,overflowY:'auto',padding:'16px 16px 8px'}}>
            {messages.length === 0 && (
              <div style={{textAlign:'center',padding:'16px 16px'}}>
                <img src="/models/quita-ia.png" alt="Quita" style={{width:140,height:140,objectFit:'contain',margin:'0 auto 4px',display:'block'}}/>
                <div style={{fontSize:20,fontWeight:800,color:'#1A0A2E',marginBottom:6}}>Fale com a Quita</div>
                <div style={{fontSize:14,color:'#888',lineHeight:1.5,marginBottom:18}}>Ela conhece seus dados financeiros e responde com base na sua situação real.</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {['Posso parcelar uma compra de R$ 800?','Como reduzir meus gastos com delivery?','Qual dívida devo pagar primeiro?','O que fazer com o 13º?'].map((q,i)=>(
                    <button key={i} onClick={()=>sendMessage(q)} style={{padding:'10px 14px',borderRadius:12,border:'1px solid rgba(124,58,237,0.15)',background:'rgba(255,255,255,0.8)',color:'#7C3AED',fontSize:13,fontWeight:500,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8}}><ChevronRight size={14}/> {q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg,i)=>(
              <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',marginBottom:10}}>
                {msg.role==='assistant' && <img src="/models/quita-ia.png" alt="" style={{width:56,height:56,borderRadius:12,objectFit:'contain',marginRight:10,marginTop:4,flexShrink:0}}/>}
                <div style={{maxWidth:'80%',padding:'12px 14px',borderRadius:16,background:msg.role==='user'?'linear-gradient(135deg,#7C3AED,#6D28D9)':'rgba(255,255,255,0.95)',color:msg.role==='user'?'#fff':'#333',fontSize:14,lineHeight:1.55,borderBottomRightRadius:msg.role==='user'?4:16,borderBottomLeftRadius:msg.role==='assistant'?4:16,boxShadow:msg.role==='assistant'?'0 1px 6px rgba(0,0,0,0.06)':'none'}}>
                  {msg.role==='user'?msg.content:renderMd(msg.content)}
                </div>
              </div>
            ))}
            {loading && <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><img src="/models/quita-ia.png" alt="" style={{width:56,height:56,borderRadius:12,objectFit:'contain'}}/><div style={{background:'rgba(255,255,255,0.95)',borderRadius:16,padding:'12px 16px',fontSize:13,color:'#999'}}>Analisando seus dados...</div></div>}
            <div ref={chatEndRef}/>
          </div>
          <div style={{padding:'8px 16px',flexShrink:0,background:'#F0EDF8'}}>
            <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Pergunte à Quita..." style={{flex:1,padding:'12px 16px',borderRadius:16,border:'1.5px solid rgba(124,58,237,0.15)',background:'#fff',fontSize:14,outline:'none',color:'#333'}}/>
              <button onClick={()=>sendMessage()} disabled={!input.trim()||loading} style={{width:44,height:44,borderRadius:14,border:'none',cursor:input.trim()?'pointer':'default',background:input.trim()?'linear-gradient(135deg,#7C3AED,#6D28D9)':'#E5E5E5',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Send size={18} color={input.trim()?'#fff':'#999'}/></button>
            </div>
          </div>
        </div>
        {NavBar && <NavBar />}
        </>
      )}
    </div>
  )
}
