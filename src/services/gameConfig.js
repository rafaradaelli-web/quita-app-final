export const CATEGORIES = [
  "Moradia","Alimentação","Delivery","Transporte","Saúde",
  "Estilo de vida","Assinaturas","Educação","Impostos","Outros"
]

export const DEFAULT_STATE = () => ({
  xp: 0, streak: 0, lastActiveDate: null, level: 1, coins: 0,
  completedLessons: [], currentLesson: 0,
  expenses: [], goals: [{ id: 1, name: "Quitar cartão", target: 2000, saved: 0 }],
  debts: [], achievements: [], weeklyXp: 0, league: "Bronze",
  profileCompletion: 25, income: 0, name: "", receitas: [], plano: null,
  wrongAnswers: [], billChecks: {}, lastWeeklyReview: null, actionPlan: null,
  equippedSkin: 'quita-real', ownedSkins: ['quita-real'],
  equippedBackground: 'padrao', ownedBackgrounds: ['padrao'],
  patrimonio: { reserva: 0, investimentos: {} },
  noDebts: false, noPatrimonio: false, budgets: {},
  lives: 3, lastLifeLost: 0,
  onboardingDone: false, dificuldade: null,
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
  let score = 0, total = 7
  const exp = (s.expenses||[]).filter(e => !e.oculto)
  if (s.name && s.name.length >= 2) score++
  if ((s.receitas||[]).length > 0) score++
  if (exp.length >= 3) score++
  if ((s.debts||[]).length > 0 || s.noDebts) score++
  if ((s.goals||[]).length > 0) score++
  if ((s.patrimonio?.reserva || 0) > 0 || Object.values(s.patrimonio?.investimentos || {}).some(v => v > 0) || s.noPatrimonio) score++
  if (s.savedDiagnostic) score++
  return Math.round((score / total) * 100)
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
  "Moradia":"necessidades","Alimentação":"necessidades","Transporte":"necessidades",
  "Saúde":"necessidades","Educação":"necessidades","Impostos":"necessidades",
  "Delivery":"desejos","Estilo de vida":"desejos","Assinaturas":"desejos",
  "Outros":"outros",
}

export const CAT_GRUPOS = {
  necessidades:"necessidades", desejos:"desejos",
  dividas:"dividas", futuro:"futuro", outros:"outros",
}

export const QUITA_IMG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><ellipse cx='50' cy='58' rx='32' ry='28' fill='%23F9A8D4'/><ellipse cx='50' cy='40' rx='24' ry='22' fill='%23F9A8D4'/><ellipse cx='50' cy='48' rx='12' ry='9' fill='%23F472B6'/><ellipse cx='44' cy='46' rx='3.5' ry='4' fill='%23BE185D'/><ellipse cx='56' cy='46' rx='3.5' ry='4' fill='%23BE185D'/><circle cx='43' cy='45' r='1.5' fill='%23111'/><circle cx='55' cy='45' r='1.5' fill='%23111'/><ellipse cx='50' cy='51' rx='5' ry='3' fill='%23EC4899'/><circle cx='47' cy='51' r='1.2' fill='%23BE185D'/><circle cx='53' cy='51' r='1.2' fill='%23BE185D'/></svg>`

export const COIN_REWARDS = {
  lessonComplete: 10, lessonPerfect: 5,
  expenseRegistered: 2, incomeRegistered: 3, debtRegistered: 5,
  streakDaily: 3, weeklyReview: 25, billCheck: 10,
  missionComplete: 15, buyLife: 30,
}

// ── VIDAS ──
export const LIVES_CONFIG = {
  max: 3,
  rechargeMinutes: 180, // 1 vida a cada 3 horas
  buyPrice: 30, // moedas por vida
}

// ── LIGAS ──
export const LEAGUES = ['Bronze', 'Prata', 'Ouro', 'Diamante']
export const LEAGUE_RULES = {
  promoteTop: 3, // top 3 sobem
  demoteBottom: 2, // últimos 2 descem
  minPlayers: 5, // mínimo pra ter promoção/rebaixamento
}

// ── MISSÕES SEMANAIS ──
export const WEEKLY_MISSIONS = [
  { id: 'lessons_10', label: 'Complete 10 lições', target: 10, type: 'lessons', xp: 50, coins: 20, icon: 'book' },
  { id: 'lessons_20', label: 'Complete 20 lições', target: 20, type: 'lessons', xp: 100, coins: 40, icon: 'book' },
  { id: 'lessons_30', label: 'Complete 30 lições', target: 30, type: 'lessons', xp: 150, coins: 60, icon: 'book' },
  { id: 'perfect_3', label: '3 lições sem errar', target: 3, type: 'perfect', xp: 60, coins: 25, icon: 'star' },
  { id: 'perfect_7', label: '7 lições sem errar', target: 7, type: 'perfect', xp: 120, coins: 50, icon: 'star' },
  { id: 'expenses_5', label: 'Registre 5 gastos', target: 5, type: 'expenses', xp: 30, coins: 10, icon: 'credit' },
  { id: 'expenses_15', label: 'Registre 15 gastos', target: 15, type: 'expenses', xp: 60, coins: 25, icon: 'credit' },
  { id: 'streak_5', label: 'Streak de 5 dias', target: 5, type: 'streak', xp: 60, coins: 25, icon: 'flame' },
  { id: 'streak_7', label: 'Streak de 7 dias', target: 7, type: 'streak', xp: 100, coins: 40, icon: 'flame' },
  { id: 'xp_200', label: 'Ganhe 200 XP', target: 200, type: 'xp', xp: 40, coins: 15, icon: 'zap' },
  { id: 'xp_500', label: 'Ganhe 500 XP', target: 500, type: 'xp', xp: 80, coins: 35, icon: 'zap' },
  { id: 'combo_5', label: 'Combo de 5 acertos', target: 5, type: 'combo', xp: 50, coins: 20, icon: 'target' },
]

// Selecionar 3 missões da semana (determinístico por semana, sem repetir tipo)
export const getWeeklyMissions = () => {
  const now = new Date()
  const weekNum = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000))
  const pool = [...WEEKLY_MISSIONS]
  const selected = []
  const usedTypes = new Set()
  // Selecionar 3, cada um de tipo diferente
  for (let attempt = 0; selected.length < 3 && attempt < 30; attempt++) {
    const idx = (weekNum * 7 + attempt * 13 + 3) % pool.length
    const m = pool[idx]
    if (!usedTypes.has(m.type)) {
      usedTypes.add(m.type)
      selected.push(m)
      pool.splice(idx, 1)
    }
  }
  return selected
}

// ── MENSAGENS DO MASCOTE ──
export const MASCOT_MESSAGES = {
  streakRisk: [
    'Faz {days} dia{s} que você não estuda... seu streak tá em risco! 🐷',
    'Oi! A Quita tá com saudade. Volta pra manter seu streak de {streak} dias!',
  ],
  welcome: [
    'Bom te ver de volta! Bora aprender?',
    'Que bom que voltou! Sua lição de hoje te espera.',
  ],
  celebrate: [
    'Streak de {streak} dias! Você tá voando! 🔥',
    'Nível {level}! A cada dia mais perto da liberdade financeira.',
  ],
  nudge: [
    'Uma lição por dia muda sua vida financeira. Só 2 minutinhos!',
    'Sabia que quem estuda finanças 5 min/dia economiza 23% mais? (pesquisa BCB)',
  ],
}

export const STREAK_MILESTONES = [
  { days:7, xp:50, coins:25 }, { days:14, xp:100, coins:50 },
  { days:30, xp:200, coins:100 }, { days:60, xp:300, coins:150 },
  { days:100, xp:400, coins:200 }, { days:200, xp:600, coins:300 },
  { days:365, xp:1000, coins:500 },
]

export const getStreakMultiplier = (streak) => Math.min(2.5, 1 + (1.5 * streak / 365))

export const getStreakColor = (streak) => {
  if (streak >= 30) return '#3B82F6'
  if (streak >= 7) return '#EF4444'
  return '#F97316'
}

export const getLeagueColor = (league) => {
  const colors = { Bronze:'#CD7F32', Prata:'#A1A1AA', Ouro:'#FBBF24', Diamante:'#60A5FA' }
  return colors[league] || '#CD7F32'
}

// Formatadores de DINHEIRO
export const fmtM = (v) => {
  return (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export const fmtM2 = (v) => {
  return (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Formatadores de DATA
export const fmtDt = (ts) => {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtMonth = (ts) => {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export const fmtMonthLong = (ts) => {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export const calcDebtSummary = (debts) => {
  if (!debts || debts.length === 0) return { total: 0, monthly: 0, count: 0 }
  const total = debts.reduce((s, d) => s + (d.total || d.amount || 0), 0)
  const monthly = debts.reduce((s, d) => s + (d.parcela || d.minPayment || 0), 0)
  return { total, monthly, count: debts.length }
}

// ── DESIGN SYSTEM ──
// Type scale: 6 sizes only (mobile-first, 4pt grid)
export const T = {
  // Sizes
  hero: 28,     // números grandes (saldo, total)
  title: 18,    // títulos de tela/card
  body: 15,     // texto principal, inputs
  sub: 13,      // subtítulos, labels de lista
  caption: 11,  // metadados, timestamps
  micro: 10,    // badges, tags, progress labels

  // Weights (apenas 3)
  bold: 700,
  semi: 600,
  regular: 400,

  // Colors — texto
  ink: '#1A0A2E',        // texto principal (escuro profundo)
  secondary: '#6B6580',  // texto secundário (roxo-cinza)
  muted: '#9B94A7',      // texto terciário (captions, timestamps)
  disabled: '#C4BFD0',   // texto desabilitado
  accent: '#6D28D9',     // roxo principal (links, destaques)
  success: '#16A34A',    // verde (positivo)
  danger: '#DC2626',     // vermelho (negativo/alerta)
  warning: '#D97706',    // amarelo (atenção)
  onDark: '#FFFFFF',     // texto sobre fundo escuro
  onDarkSub: 'rgba(255,255,255,0.6)',  // secundário sobre fundo escuro
  onDarkMuted: 'rgba(255,255,255,0.4)', // terciário sobre fundo escuro

  // Line heights
  tight: 1.15,
  normal: 1.45,
  relaxed: 1.65,

  // Letter spacing
  lsTitle: -0.5,
  lsNormal: 0,
  lsWide: 0.8,
}
