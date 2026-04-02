export const CATEGORIES = [
  "Alimentação","Transporte","Moradia","Lazer","Saúde","Educação",
  "Delivery","Assinaturas","Impostos","Trabalho","Cartão de Crédito",
  "Investimentos","Transferências","Outros"
]

export const DEFAULT_STATE = () => ({
  xp: 0, streak: 0, lastActiveDate: null, level: 1,
  completedLessons: [], currentLesson: 0,
  expenses: [], goals: [{ id: 1, name: "Quitar cartão", target: 2000, saved: 0 }],
  debts: [], achievements: [], weeklyXp: 0, league: "Bronze",
  profileCompletion: 25, income: 0, name: "", receitas: [], plano: null,
})

export const LEVELS = [
  { level:1, xp:0,    name:"Perdido",      color:"#9CA3AF" },
  { level:2, xp:150,  name:"Acordando",    color:"#F59E0B" },
  { level:3, xp:400,  name:"Consciente",   color:"#F97316" },
  { level:4, xp:800,  name:"Controlado",   color:"#7B2FF2" },
  { level:5, xp:1500, name:"Equilibrado",  color:"#6D28D9" },
  { level:6, xp:2500, name:"Organizado",   color:"#2563EB" },
  { level:7, xp:4000, name:"Investidor",   color:"#0891B2" },
  { level:8, xp:6000, name:"Mestre",       color:"#16A34A" },
]

export const getLevel = (xp) => {
  let l = LEVELS[0]
  for (const lv of LEVELS) { if (xp >= lv.xp) l = lv }
  return l.level
}

export const calcProfile = (s) => {
  let score = 25
  const exp = (s.expenses||[]).filter(e => !e.oculto)
  if (s.income > 0) score += 20
  if (exp.filter(e => Date.now()-e.date < 7*86400000).length >= 3) score += 15
  if (exp.filter(e => Date.now()-e.date < 30*86400000).length >= 10) score += 15
  if ((s.debts||[]).length > 0) score += 10
  if ((s.goals||[]).length > 1) score += 10
  const cats = new Set(exp.filter(e => !e.oculto).map(e => e.category)).size
  if (cats >= 4) score += 5
  return Math.min(score, 100)
}

export const DEBT_TYPES = [
  { value:"cartao",     label:"Cartão de crédito" },
  { value:"pessoal",    label:"Empréstimo pessoal" },
  { value:"consignado", label:"Consignado" },
  { value:"imovel",     label:"Financiamento imobiliário" },
  { value:"veiculo",    label:"Financiamento de veículo" },
  { value:"cheque",     label:"Cheque especial" },
]

export const DEBT_ICONS = {
  cartao:"💳", pessoal:"🏦", consignado:"📋",
  imovel:"🏠", veiculo:"🚗", cheque:"📝"
}

export const TYPE_DEFAULTS = {
  cartao:     { amortization:"rotativo", rateLabel:"Taxa mensal rotativo (%)" },
  pessoal:    { amortization:"price",    rateLabel:"Taxa mensal (%)" },
  consignado: { amortization:"price",    rateLabel:"Taxa mensal (%)" },
  imovel:     { amortization:"sac",      rateLabel:"Taxa mensal (%)" },
  veiculo:    { amortization:"price",    rateLabel:"Taxa mensal (%)" },
  cheque:     { amortization:"rotativo", rateLabel:"Taxa mensal cheque (%)" },
}

export const RECEITA_TIPOS = [
  { value:"salario",    label:"Salário fixo" },
  { value:"freelance",  label:"Freelance / Variável" },
  { value:"dividendos", label:"Dividendos / Investimentos" },
  { value:"aluguel",    label:"Aluguel recebido" },
  { value:"outros",     label:"Outros" },
]

export const CAT_NORM = {
  "Alimentação":"necessidades","Moradia":"necessidades","Transporte":"necessidades",
  "Saúde":"necessidades","Educação":"necessidades",
  "Lazer":"desejos","Delivery":"desejos","Assinaturas":"desejos",
  "Cartão de Crédito":"dividas","Impostos":"dividas",
  "Investimentos":"futuro","Transferências":"futuro",
  "Trabalho":"outros","Outros":"outros",
}

export const CAT_GRUPOS = {
  necessidades:"necessidades", desejos:"desejos",
  dividas:"dividas", futuro:"futuro", outros:"outros",
}

export const QUITA_IMG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><ellipse cx='50' cy='58' rx='32' ry='28' fill='%23F9A8D4'/><ellipse cx='50' cy='40' rx='24' ry='22' fill='%23F9A8D4'/><ellipse cx='50' cy='48' rx='12' ry='9' fill='%23F472B6'/><ellipse cx='44' cy='46' rx='3.5' ry='4' fill='%23BE185D'/><ellipse cx='56' cy='46' rx='3.5' ry='4' fill='%23BE185D'/><circle cx='43' cy='45' r='1.5' fill='%23111'/><circle cx='55' cy='45' r='1.5' fill='%23111'/><ellipse cx='50' cy='51' rx='5' ry='3' fill='%23EC4899'/><circle cx='47' cy='51' r='1.2' fill='%23BE185D'/><circle cx='53' cy='51' r='1.2' fill='%23BE185D'/></svg>`
