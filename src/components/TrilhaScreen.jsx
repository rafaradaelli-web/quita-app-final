import { useState, useEffect, useRef } from 'react'
import LESSONS_DATA from '../services/lessons.json'

const ZIGZAG = [
  { xPct: 50 }, { xPct: 22 }, { xPct: 72 }, { xPct: 18 }, { xPct: 68 },
]
const NODE = 80, NODE_CUR = 94, ROW_H = 180, HEADER_H = 160

// ── SVG Mini-icons (replace all emojis) ──
const S = (d, w = 16) => ({ __html: `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>` })
const SVG_ICONS = {
  compass: S('<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z"/>'),
  brain: S('<path d="M12 2a5 5 0 015 5c0 1.1-.4 2.1-1 2.9M12 2a5 5 0 00-5 5c0 1.1.4 2.1 1 2.9M7 9.1A5 5 0 003 14c0 2.8 2.2 5 5 5h1M17 9.1A5 5 0 0121 14c0 2.8-2.2 5-5 5h-1M12 2v20"/>'),
  percent: S('<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
  handshake: S('<path d="M20 12V8H6l-2 4"/><path d="M4 12v4h14l2-4"/><path d="M12 8v8"/>'),
  'pie-chart': S('<path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/>'),
  target: S('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  book: S('<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>'),
  wallet: S('<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>'),
  scissors: S('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>'),
  zap: S('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
  heart: S('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'),
  users: S('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
  puzzle: S('<path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 01-.837.276c-.47-.07-.802-.48-.743-.95"/>'),
  'credit-card': S('<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>'),
  'alert-triangle': S('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  tag: S('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  clock: S('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  flag: S('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'),
  snowflake: S('<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>'),
  'trending-up': S('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
  shield: S('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  'list-ordered': S('<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
  clipboard: S('<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>'),
  search: S('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  'eye-off': S('<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'),
  activity: S('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
  filter: S('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'),
  repeat: S('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>'),
  phone: S('<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>'),
  'plus-circle': S('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'),
  eye: S('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
  layers: S('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
  scale: S('<line x1="12" y1="3" x2="12" y2="21"/><polyline points="3 9 12 3 21 9"/><path d="M3 9l3 9h12l3-9"/>'),
  inbox: S('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>'),
  settings: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>'),
  calculator: S('<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/>'),
  lock: S('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'),
  check: S('<path d="M20 6L9 17l-5-5"/>'),
  hourglass: S('<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22"/><path d="M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2"/>'),
  chevron: S('<polyline points="6 9 12 15 18 9"/>', 14),
}

function Icon({ name, size = 16, color = 'currentColor' }) {
  const ico = SVG_ICONS[name]
  if (!ico) return null
  return <span style={{ color, display: 'inline-flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: ico.__html.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`) }} />
}

function CheckIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
}
function LockIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
}

export default function TrilhaScreen({ state, styles, startLesson, NavBar, embedded, onSpecialComplete, lives: livesProps, nextLifeStr }) {
  const [mounted, setMounted] = useState(false)
  const [openMod, setOpenMod] = useState(null)
  const [selOpen, setSelOpen] = useState(false)
  const [chestModal, setChestModal] = useState(null)
  const [challengeModal, setChallengeModal] = useState(null)
  const [challengeAnswer, setChallengeAnswer] = useState(-1)
  const [challengeResult, setChallengeResult] = useState(null)
  const scrollRef = useRef(null)
  const etapaRefs = useRef({})

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t) }, [])

  const journeys = LESSONS_DATA.journeys || []
  const doneIds = state.completedLessons || []

  // ── Gerar posições de baús (pseudo-random determinístico, 4-11 módulos entre cada) ──
  const chestPositions = new Set()
  let nextChest = 3 + ((journeys.length * 7) % 5) // seed baseado nos dados
  while (nextChest < journeys.reduce((s, j) => s + j.modules.length, 0)) {
    chestPositions.add(nextChest)
    nextChest += 4 + ((nextChest * 13 + 7) % 8) // 4 a 11 de distância
  }

  // ── Challenge positions: 1 por jornada, no meio ──
  const challengePositions = new Set()
  let modAccum = 0
  journeys.forEach(j => {
    const mid = modAccum + Math.floor(j.modules.length / 2)
    challengePositions.add(mid)
    modAccum += j.modules.length
  })

  const allMods = []
  let globalIdx = 0
  journeys.forEach((et, ei) => {
    et.modules.forEach((mod, mi) => {
      // Inserir baú ANTES deste módulo se a posição bate
      if (chestPositions.has(globalIdx)) {
        allMods.push({ type: 'chest', id: 'chest-' + globalIdx, ei, eColor: et.color, gi: allMods.length })
      }
      // Inserir desafio ANTES deste módulo
      if (challengePositions.has(globalIdx)) {
        allMods.push({ type: 'challenge', id: 'challenge-' + ei, ei, eName: et.name, eColor: et.color, gi: allMods.length })
      }
      allMods.push({ ...mod, type: 'module', ei, eName: et.name, eSub: et.subtitle || '', eColor: et.color, eIcon: et.icon, mi, gi: allMods.length })
      globalIdx++
    })
    // Checkpoint no final de cada jornada (exceto a última)
    if (ei < journeys.length - 1) {
      allMods.push({ type: 'checkpoint', id: 'checkpoint-' + ei, ei, eName: et.name, eColor: et.color, gi: allMods.length })
    }
  })

  const validL = (m) => m.type === 'module' ? m.lessons.filter(l => l.questions && l.questions.length > 0) : []
  const pr = (m) => { if (m.type !== 'module') return { t: 0, d: 0, p: 0 }; const vl = validL(m); const t = vl.length; const d = vl.filter(l => doneIds.includes(l.id)).length; return { t, d, p: t > 0 ? Math.round(d / t * 100) : 0 } }
  const mDone = (m) => { if (m.type !== 'module') { return (state.completedSpecials || []).includes(m.id) }; const vl = validL(m); return vl.length > 0 && vl.every(l => doneIds.includes(l.id)) }
  const curIdx = (() => { const i = allMods.findIndex(m => !mDone(m)); return i >= 0 ? i : allMods.length })()
  const isEtapaLocked = (ei) => ei > 0 && !journeys[ei - 1].modules.every(m => mDone(m))

  // ── Desafios financeiros (complexidade superior, sem necessidade de calculadora) ──
  const CHALLENGES = [
    { q: 'Ana ganha R$ 4.000/mês. Tem R$ 2.000 no rotativo a 14%/mês e R$ 5.000 de empréstimo pessoal a 3%/mês. Sobram R$ 500/mês. O que faz primeiro?', opts: ['Dividir R$ 250 em cada dívida','Quitar o rotativo primeiro, depois o pessoal','Guardar os R$ 500 como reserva e pagar o mínimo','Quitar o empréstimo pessoal primeiro'], correct: 1, why: 'O rotativo a 14%/mês é 5x mais caro. Cada mês que passa, os R$ 2.000 viram R$ 2.280. Prioridade máxima sempre na dívida com maior taxa (método avalanche).' },
    { q: 'Carlos tem R$ 20.000 guardados, gasta R$ 3.000/mês e quer investir. Não tem reserva de emergência separada. O que deve fazer?', opts: ['Investir tudo em ações pra render mais','Separar R$ 18.000 como reserva (6 meses) e investir R$ 2.000','Investir metade em renda fixa e metade em ações','Deixar tudo na poupança por segurança'], correct: 1, why: 'Regra dos 6 meses: reserva deve cobrir 6× os gastos essenciais (~R$ 18.000). Sem isso, qualquer imprevisto obriga a vender investimentos na hora errada. Os R$ 2.000 restantes podem começar a ser investidos.' },
    { q: 'Maria recebe uma proposta de financiamento: TV de R$ 3.000 em 12x de R$ 300 "sem juros". Ela tem R$ 3.000 na conta mas reserva de emergência incompleta. Melhor decisão?', opts: ['Parcelar, já que é "sem juros"','Pagar à vista pra não ter prestação','Não comprar agora e completar a reserva primeiro','Parcelar em menos vezes pra terminar antes'], correct: 2, why: 'A reserva de emergência é prioridade sobre consumo. TV não é urgente. E "sem juros" no Brasil quase sempre tem juros embutidos no preço — pagar à vista costuma dar desconto de 5-15%.' },
    { q: 'Pedro ganha R$ 6.000 e gasta R$ 5.400 (90% da renda). Quer começar a investir. Qual o primeiro passo real?', opts: ['Abrir conta na corretora e começar com R$ 100/mês','Cortar gastos pra gastar no máximo 70% da renda','Pegar um empréstimo pra investir e ganhar a diferença','Esperar ganhar mais pra ter sobra natural'], correct: 1, why: 'Com 90% comprometido, reduzir pra 70% é ideal mas pode ser irreal de imediato. Começar com R$ 100/mês cria o hábito — o valor importa menos que a consistência. Cortar gastos vem em paralelo, não como pré-requisito.' },
    { q: 'Júlia tem streak de 45 dias no Quita e recebe oferta de TV por R$ 89/mês "que cabe no bolso". Seus gastos com Estilo de vida já são 25% da renda. O que a Quita diria?', opts: ['"Cabe no orçamento, pode fazer"','R$ 89 parece pouco mas são R$ 1.068/ano — quase uma viagem. Estilo de vida já está alto."','Parcela sempre vale a pena se não tem juros"','Compre e compense cortando delivery'], correct: 1, why: 'A armadilha das parcelas pequenas: R$ 89 parece irrelevante mas acumula R$ 1.068/ano. Com 25% da renda já em estilo de vida, adicionar mais compromete a capacidade de poupança.' },
    { q: 'Roberto tem R$ 50.000 em um CDB a 100% do CDI e ouve que ações "rendem mais". Ele nunca investiu em renda variável e precisa do dinheiro em 2 anos pra entrada de um apartamento. Deve migrar?', opts: ['Sim, ações rendem mais no longo prazo','Migrar metade pra ações e manter metade no CDB','Não, manter no CDB — prazo curto e meta definida','Migrar pra cripto que rende ainda mais'], correct: 2, why: 'Com meta definida em 2 anos, renda variável é arriscada — uma queda de 20% reduziria seus R$ 50.000 pra R$ 40.000 bem na hora de comprar. CDB a 100% CDI é adequado pra prazo curto com objetivo claro.' },
  ]

  const CHEST_REWARDS = [
    { type: 'coins', amount: 30, label: '30 moedas' },
    { type: 'coins', amount: 50, label: '50 moedas' },
    { type: 'coins', amount: 75, label: '75 moedas' },
    { type: 'xp', amount: 40, label: '40 XP' },
    { type: 'xp', amount: 60, label: '60 XP' },
    { type: 'freeze', amount: 1, label: '1 Streak Freeze' },
  ]

  const openChest = (node) => {
    const reward = CHEST_REWARDS[(node.gi * 7 + 3) % CHEST_REWARDS.length]
    setChestModal({ node, reward })
  }

  const claimChest = () => {
    if (!chestModal) return
    const { node, reward } = chestModal
    if (onSpecialComplete) onSpecialComplete(node.id, reward)
    setChestModal(null)
  }

  const startChallenge = (node) => {
    const challenge = CHALLENGES[node.ei % CHALLENGES.length]
    setChallengeModal({ node, challenge })
    setChallengeAnswer(-1)
    setChallengeResult(null)
  }

  const checkChallengeAnswer = () => {
    if (!challengeModal || challengeAnswer < 0) return
    const correct = challengeAnswer === challengeModal.challenge.correct
    setChallengeResult(correct)
    if (correct && onSpecialComplete) {
      onSpecialComplete(challengeModal.node.id, { type: 'xp', amount: 80, label: '80 XP (Desafio!)' })
    }
  }
  const getY = (gi) => {
    let y = 100; let prevEi = -1
    for (let i = 0; i <= gi; i++) {
      if (allMods[i].ei !== prevEi) { if (prevEi !== -1) y += HEADER_H; prevEi = allMods[i].ei }
      if (i > 0) y += ROW_H
    }
    return y
  }
  const getX = (gi) => ZIGZAG[gi % ZIGZAG.length].xPct

  // Calculate etapa header positions — centered in gap between etapas
  const etapaHeaderY = {}
  const HEADER_CARD_H = 85 // approximate height of header card
  journeys.forEach((et, ei) => {
    const firstModGi = allMods.findIndex(m => m.ei === ei)
    if (firstModGi < 0) return
    const firstModY = getY(firstModGi)
    if (ei === 0) {
      // First etapa: place header above first module
      etapaHeaderY[ei] = firstModY - HEADER_CARD_H - 20
    } else {
      // Find last module of previous etapa
      const prevMods = allMods.filter(m => m.ei === ei - 1)
      const lastModPrevY = getY(prevMods[prevMods.length - 1].gi)
      // Center header in the gap between last prev module and first cur module
      const gapCenter = (lastModPrevY + NODE + firstModY) / 2
      etapaHeaderY[ei] = gapCenter - HEADER_CARD_H / 2
    }
  })
  const TOTAL_H = getY(allMods.length - 1) + ROW_H + 350

  const scrollToEtapa = (ei) => {
    setSelOpen(false)
    if (etapaRefs.current[ei]) etapaRefs.current[ei].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (mounted && curIdx < allMods.length) {
      const y = getY(curIdx)
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTo({ top: Math.max(0, y - 300), behavior: 'smooth' }) }, 400)
    }
  }, [mounted])

  const curEtapaColor = curIdx < allMods.length ? allMods[curIdx].eColor : '#7C3AED'
  const curEtapaIdx = curIdx < allMods.length ? allMods[curIdx].ei : 0
  const curEtapa = journeys[curEtapaIdx] || journeys[0]

  const css = `
    @keyframes qP{0%,100%{box-shadow:0 0 0 0 ${curEtapaColor}80,0 0 30px ${curEtapaColor}40,0 8px 32px rgba(0,0,0,.3)}50%{box-shadow:0 0 0 14px ${curEtapaColor}00,0 0 30px ${curEtapaColor}40,0 8px 32px rgba(0,0,0,.3)}}
    @keyframes qF{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes qI{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  `

  return (
    <div ref={scrollRef} style={{
      background: embedded ? 'transparent' : 'linear-gradient(180deg,#F0EDF8 0%,#E8E4F2 100%)',
      minHeight: embedded ? 'auto' : '100vh',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      overflowY: embedded ? 'visible' : 'auto', height: embedded ? 'auto' : '100vh',
    }}>
      <style>{css}</style>

      {/* ── Single selector dropdown ── */}
      <div style={{ position:'sticky',top:0,zIndex:40, background: embedded ? 'linear-gradient(180deg,rgba(44,20,88,.98) 0%,rgba(44,20,88,.85) 80%,transparent 100%)' : 'linear-gradient(180deg,#F0EDF8 0%,#F0EDF8 85%,transparent 100%)', padding: embedded ? '10px 16px 14px' : 'calc(10px + var(--sat, 0px)) 16px 14px' }}>
        {/* Vidas */}
        {!embedded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8, gap: 6 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0,1,2].map(i => <svg key={i} width="18" height="18" viewBox="0 0 16 16"><path d="M8 14s-6-4.35-6-8.5A3.5 3.5 0 018 3.28 3.5 3.5 0 0114 5.5C14 9.65 8 14 8 14z" fill={i < (livesProps ?? 3) ? "#EF4444" : "#E5E5E5"} /></svg>)}
            </div>
            {nextLifeStr ? (
              <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nextLifeStr}</span>
            ) : null}
          </div>
        )}
        <div style={{ position:'relative' }}>
          <button onClick={() => setSelOpen(!selOpen)} style={{
            width:'100%', padding:'10px 14px', borderRadius:14,
            background: `linear-gradient(135deg,${curEtapa.color}18,${curEtapa.color}08)`,
            border: `1.5px solid ${curEtapa.color}25`,
            display:'flex', alignItems:'center', gap:10, cursor:'pointer',
          }}>
            <div style={{ width:28,height:28,borderRadius:8,background:`${curEtapa.color}20`,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Icon name={curEtapa.icon} size={14} color={curEtapa.color} />
            </div>
            <div style={{ flex:1,textAlign:'left' }}>
              <div style={{ fontSize:14,fontWeight:700,color:'#1E0A3C' }}>{curEtapaIdx + 1} – {curEtapa.name}</div>
              <div style={{ fontSize:10,color:'#999',marginTop:1 }}>{curEtapa.subtitle || 'Toque para navegar entre etapas'}</div>
            </div>
            <Icon name="chevron" size={14} color="#999" />
          </button>

          {/* Dropdown list */}
          {selOpen && (
            <div style={{
              position:'absolute',top:'100%',left:0,right:0,marginTop:4,
              background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
              overflow:'hidden',zIndex:50,animation:'qI 0.15s ease both',
            }}>
              {journeys.map((j, i) => {
                const jT = j.modules.reduce((s, m) => s + m.lessons.length, 0)
                const jD = j.modules.reduce((s, m) => s + m.lessons.filter(l => doneIds.includes(l.id)).length, 0)
                const complete = jD === jT
                const locked = isEtapaLocked(i)
                const active = i === curEtapaIdx
                return (
                  <div key={j.id} onClick={() => scrollToEtapa(i)} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer',
                    background: active ? `${j.color}10` : 'transparent',
                    borderBottom: i < journeys.length - 1 ? '1px solid #F0F0F0' : 'none',
                  }}>
                    <div style={{ width:28,height:28,borderRadius:8,background: locked ? '#F5F5F5' : `${j.color}15`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                      {locked ? <Icon name="lock" size={13} color="#CCC" /> : complete ? <Icon name="check" size={13} color="#16A34A" /> : <Icon name={j.icon} size={13} color={j.color} />}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:600,color: locked ? '#BBB' : '#333' }}>
                        {i+1}. {j.name}
                      </div>
                      {j.subtitle && <div style={{ fontSize:10,color: locked ? '#DDD' : '#999',marginTop:2 }}>{j.subtitle}</div>}
                    </div>
                    <div style={{ fontSize:10,fontWeight:600,color: complete ? '#16A34A' : locked ? '#DDD' : `${j.color}88` }}>
                      {complete ? 'Completo' : `${jD}/${jT}`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {selOpen && <div onClick={() => setSelOpen(false)} style={{ position:'fixed',inset:0,zIndex:35 }} />}

      {/* ── Continuous trail map ── */}
      <div style={{ position:'relative',width:'100%',height:TOTAL_H,paddingTop:10 }}>

        {/* Etapa region backgrounds */}
        {journeys.map((et, ei) => {
          const ms = allMods.filter(m => m.ei === ei)
          if (!ms.length) return null
          const fy = getY(ms[0].gi), ly = getY(ms[ms.length - 1].gi)
          return <div key={`bg-${ei}`} style={{ position:'absolute',left:0,right:0,top:fy-70,height:ly-fy+ROW_H+80, background:`linear-gradient(180deg,${et.color}05 0%,${et.color}0a 50%,${et.color}03 100%)`,pointerEvents:'none' }} />
        })}

        {/* Etapa headers — positioned above first module with margin */}
        {journeys.map((et, ei) => {
          const y = etapaHeaderY[ei]
          if (y === undefined) return null
          const locked = isEtapaLocked(ei)
          const eT = et.modules.reduce((s, m) => s + m.lessons.length, 0)
          const eD = et.modules.reduce((s, m) => s + m.lessons.filter(l => doneIds.includes(l.id)).length, 0)
          return (
            <div key={`h-${ei}`} ref={el => etapaRefs.current[ei] = el}
              style={{ position:'absolute',left:16,right:16,top:y,zIndex:5 }}>
              <div style={{
                padding:'14px 18px',borderRadius:18,
                background: locked ? 'rgba(0,0,0,0.02)' : `${et.color}10`,
                border:`1px solid ${et.color}${locked?'08':'18'}`,
                opacity: locked ? 0.45 : 1,
              }}>
                <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:11,flexShrink:0, background: locked ? 'rgba(0,0,0,0.04)' : `${et.color}18`, display:'flex',alignItems:'center',justifyContent:'center',marginTop:2 }}>
                    {locked ? <Icon name="lock" size={16} color="#BBB" /> : <Icon name={et.icon} size={16} color={et.color} />}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:18,fontWeight:800,color: locked ? '#999' : et.color,lineHeight:1.25,wordWrap:'break-word',overflowWrap:'break-word' }}>
                      {ei+1} – {et.name}
                    </div>
                    {et.subtitle && <div style={{ fontSize:12,color: locked ? '#BBB' : `${et.color}80`,marginTop:3,fontWeight:500 }}>{et.subtitle}</div>}
                  </div>
                  <div style={{ fontSize:11,fontWeight:600,color: locked ? '#CCC' : `${et.color}66`,flexShrink:0,marginTop:4 }}>{eD}/{eT}</div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Connectors */}
        <svg style={{ position:'absolute',top:0,left:0,width:'100%',height:TOTAL_H,pointerEvents:'none' }} viewBox={`0 0 100 ${TOTAL_H}`} preserveAspectRatio="none">
          {allMods.map((m, i) => {
            if (i >= allMods.length - 1) return null
            const ax = getX(i), ay = getY(i) + NODE/2, bx = getX(i+1), by = getY(i+1) + NODE/2
            const d = mDone(m) && !isEtapaLocked(m.ei), c = m.eColor
            return <path key={i} d={`M ${ax} ${ay} C ${ax} ${ay+(by-ay)*0.4}, ${bx} ${ay+(by-ay)*0.6}, ${bx} ${by}`}
              fill="none" stroke={d ? c : `${c}35`} strokeWidth={d ? '1.8' : '1.3'} strokeDasharray={d ? 'none' : '6 5'} strokeLinecap="round" opacity={d ? 0.8 : 0.5} />
          })}
        </svg>

        {/* Module nodes */}
        {allMods.map((m, i) => {
          const c = m.eColor, eLocked = isEtapaLocked(m.ei), rd = mDone(m)
          const isDone = eLocked ? false : rd
          const isCur = eLocked ? false : (i === curIdx)
          const justCompleted = false
          const isWait = false
          const isLocked = eLocked || (!rd && !isCur)
          const x = getX(i), y = getY(i)
          const lbl = x > 50

          // ── NÓ ESPECIAL: BAÚ ──
          if (m.type === 'chest') {
            const canOpen = !isLocked && !isDone && i <= curIdx
            const sz = 60
            return (
              <div key={m.id} style={{ animation: mounted ? `qI 0.4s ease ${Math.min(i*0.05,1)}s both` : 'none' }}>
                {canOpen && <div style={{ position:'absolute',left:`calc(${x}% - ${sz}px)`,top:y-sz/2, width:sz*2,height:sz*2, background:'radial-gradient(circle,#FBBF2440 0%,transparent 70%)', pointerEvents:'none',zIndex:1 }} />}
                <div style={{ position:'absolute',top:y+sz/2-10, ...(lbl ? {right:`calc(${100-x}% + ${sz/2+10}px)`} : {left:`calc(${x}% + ${sz/2+10}px)`}), textAlign:lbl?'right':'left', pointerEvents:'none' }}>
                  <div style={{ fontSize:11,fontWeight:700,color: isDone ? '#16A34A' : canOpen ? '#F59E0B' : '#C4B5FD' }}>{isDone ? 'Aberto!' : canOpen ? 'Abrir baú' : 'Baú'}</div>
                </div>
                <div onClick={() => canOpen && !isDone && openChest(m)} style={{
                  position:'absolute',left:`calc(${x}% - ${sz/2}px)`,top:y, width:sz,height:sz,borderRadius:16,
                  cursor:canOpen?'pointer':'default', display:'flex',alignItems:'center',justifyContent:'center',
                  background: isDone ? 'linear-gradient(145deg,#86EFAC,#22C55E)' : canOpen ? 'linear-gradient(145deg,#FDE68A,#F59E0B)' : 'rgba(196,181,253,0.15)',
                  border: isDone ? '2px solid #16A34A' : canOpen ? '2px solid #FBBF24' : '2px solid rgba(196,181,253,0.2)',
                  boxShadow: canOpen ? '0 4px 0 #D97706,0 6px 20px rgba(245,158,11,0.3)' : 'none',
                  fontSize: 28, zIndex:5, animation: canOpen ? 'qP 2.5s ease-in-out infinite' : 'none',
                }}>{isDone ? '✓' : '🎁'}</div>
              </div>
            )
          }

          // ── NÓ ESPECIAL: DESAFIO ──
          if (m.type === 'challenge') {
            const canPlay = !isLocked && !isDone && i <= curIdx
            const sz = 70
            return (
              <div key={m.id} style={{ animation: mounted ? `qI 0.4s ease ${Math.min(i*0.05,1)}s both` : 'none' }}>
                {canPlay && <div style={{ position:'absolute',left:`calc(${x}% - ${sz}px)`,top:y-sz/2, width:sz*2,height:sz*2, background:'radial-gradient(circle,#7C3AED40 0%,transparent 70%)', pointerEvents:'none',zIndex:1 }} />}
                <div style={{ position:'absolute',top:y+sz/2-10, ...(lbl ? {right:`calc(${100-x}% + ${sz/2+10}px)`} : {left:`calc(${x}% + ${sz/2+10}px)`}), textAlign:lbl?'right':'left', pointerEvents:'none', maxWidth: 110 }}>
                  <div style={{ fontSize:11,fontWeight:700,color: isDone ? '#16A34A' : canPlay ? '#7C3AED' : '#C4B5FD' }}>{isDone ? 'Concluído!' : 'Desafio'}</div>
                  <div style={{ fontSize:9,color:'#999',marginTop:1 }}>XP dobrado</div>
                </div>
                <div onClick={() => canPlay && !isDone && startChallenge(m)} style={{
                  position:'absolute',left:`calc(${x}% - ${sz/2}px)`,top:y, width:sz,height:sz,borderRadius:'50%',
                  cursor:canPlay?'pointer':'default', display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
                  background: isDone ? 'linear-gradient(145deg,#86EFAC,#22C55E)' : canPlay ? 'linear-gradient(145deg,#A78BFA,#7C3AED)' : 'rgba(196,181,253,0.15)',
                  border: isDone ? '3px solid #16A34A' : canPlay ? '3px solid rgba(255,255,255,0.4)' : '2px solid rgba(196,181,253,0.2)',
                  boxShadow: canPlay ? '0 5px 0 #6D28D9,0 8px 24px rgba(124,58,237,0.4)' : 'none',
                  zIndex:5, animation: canPlay ? 'qP 2s ease-in-out infinite' : 'none',
                }}>
                  {isDone ? <CheckIcon /> : <span style={{ fontSize: 26 }}>⚡</span>}
                </div>
              </div>
            )
          }

          // ── NÓ ESPECIAL: CHECKPOINT ──
          if (m.type === 'checkpoint') {
            const canPlay = !isLocked && !isDone && i <= curIdx
            const sz = 74
            return (
              <div key={m.id} style={{ animation: mounted ? `qI 0.4s ease ${Math.min(i*0.05,1)}s both` : 'none' }}>
                {canPlay && <div style={{ position:'absolute',left:`calc(${x}% - ${sz}px)`,top:y-sz/2, width:sz*2,height:sz*2, background:'radial-gradient(circle,#F5920040 0%,transparent 70%)', pointerEvents:'none',zIndex:1 }} />}
                <div style={{ position:'absolute',top:y+sz/2-10, ...(lbl ? {right:`calc(${100-x}% + ${sz/2+10}px)`} : {left:`calc(${x}% + ${sz/2+10}px)`}), textAlign:lbl?'right':'left', pointerEvents:'none', maxWidth: 120 }}>
                  <div style={{ fontSize:11,fontWeight:700,color: isDone ? '#16A34A' : canPlay ? '#F59E0B' : '#C4B5FD' }}>{isDone ? 'Aprovado!' : 'Checkpoint'}</div>
                  <div style={{ fontSize:9,color:'#999',marginTop:1 }}>Revisão da etapa</div>
                </div>
                <div onClick={() => canPlay && !isDone && startChallenge(m)} style={{
                  position:'absolute',left:`calc(${x}% - ${sz/2}px)`,top:y, width:sz,height:sz,borderRadius:18,
                  cursor:canPlay?'pointer':'default', display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
                  background: isDone ? 'linear-gradient(145deg,#86EFAC,#22C55E)' : canPlay ? 'linear-gradient(145deg,#FDE68A,#FBBF24)' : 'rgba(196,181,253,0.15)',
                  border: isDone ? '3px solid #16A34A' : canPlay ? '3px solid rgba(255,255,255,0.5)' : '2px solid rgba(196,181,253,0.2)',
                  boxShadow: canPlay ? '0 5px 0 #D97706,0 8px 24px rgba(245,158,11,0.4)' : 'none',
                  zIndex:5, animation: canPlay ? 'qP 2s ease-in-out infinite' : 'none',
                }}>
                  {isDone ? <CheckIcon /> : <span style={{ fontSize: 26 }}>🏆</span>}
                </div>
              </div>
            )
          }

          // ── NÓ NORMAL: MÓDULO ──
          const sz = (isCur || justCompleted) ? NODE_CUR : NODE
          const p = pr(m)

          return (
            <div key={m.id} style={{ animation: mounted ? `qI 0.4s ease ${Math.min(i*0.05,1)}s both` : 'none' }}>
              {(isDone || isCur) && <div style={{ position:'absolute',left:`calc(${x}% - ${sz}px)`,top:y-sz/2, width:sz*2,height:sz*2, background:`radial-gradient(circle,${c}${isDone?'30':'20'} 0%,transparent 70%)`, pointerEvents:'none',zIndex:1 }} />}

              {(isCur || justCompleted) && <div style={{ position:'absolute',left:`calc(${x}% - 50px)`,top:y-65, width:100,height:100,display:'flex',alignItems:'center',justifyContent:'center', animation:'qF 2.5s ease-in-out infinite', filter:`drop-shadow(0 8px 16px ${c}80)`,zIndex:10 }}>
                <img src={justCompleted ? "/models/quita-celebrate.png" : "/models/quita-study.png"} alt="Quita" style={{ width:'100%',height:'100%',objectFit:'contain' }} />
              </div>}

              <div style={{ position:'absolute',top:y+sz/2-28, ...(lbl ? {right:`calc(${100-x}% + ${sz/2+14}px)`} : {left:`calc(${x}% + ${sz/2+14}px)`}), textAlign:lbl?'right':'left', maxWidth:130, pointerEvents:'none' }}>
                <div style={{ fontSize:12,fontWeight:700,lineHeight:1.25, color:isDone||isCur?c:'#A89BC2' }}>{m.name}</div>
                <div style={{ fontSize:10,fontWeight:600,marginTop:2, display:'flex',alignItems:'center',gap:3, justifyContent:lbl?'flex-end':'flex-start', color: isDone?'#16A34A':isWait?c:isCur?`${c}bb`:'#C4B5FD' }}>
                  {isDone && <><Icon name="check" size={11} color="#16A34A" /> {p.t} lições</>}
                  {!isDone && !eLocked && `${p.d}/${p.t} lições`}
                  {eLocked && <Icon name="lock" size={11} color="#C4B5FD" />}
                </div>
              </div>

              <div onClick={() => (isDone||isCur||justCompleted) && setOpenMod(m)} style={{
                position:'absolute',left:`calc(${x}% - ${sz/2}px)`,top:y, width:sz,height:sz,borderRadius:'50%',
                cursor:(isDone||isCur||justCompleted)?'pointer':'default',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
                userSelect:'none',zIndex:5,transition:'transform 0.15s',
                background: isDone ? `linear-gradient(145deg,${c}cc,${c})` : (isCur||justCompleted) ? `linear-gradient(145deg,${c}aa,${c}dd)` : 'rgba(196,181,253,0.2)',
                border: isDone ? '3px solid rgba(255,255,255,0.3)' : (isCur||justCompleted) ? '3px solid rgba(255,255,255,0.5)' : '2.5px solid rgba(196,181,253,0.3)',
                boxShadow: isDone ? `0 6px 0 ${c}99,0 8px 20px ${c}40` : (isCur||justCompleted) ? `0 6px 0 ${c}88,0 8px 28px ${c}50` : '0 3px 0 rgba(167,139,250,0.2)',
                animation: isCur ? 'qP 2s ease-in-out infinite' : 'none',
              }}>
                {isDone && <CheckIcon />}
                {(isCur||justCompleted) && <Icon name={m.icon} size={24} color="#fff" />}
                {(isCur||justCompleted) && <span style={{ fontSize:8,color:'#fff',fontWeight:700,opacity:0.8 }}>{p.d}/{p.t}</span>}
                {isLocked && <LockIcon />}
              </div>
            </div>
          )
        })}

        {/* End-of-trail message — always visible */}
        {(() => {
          const lastY = getY(allMods.length - 1)
          const allComplete = curIdx >= allMods.length
          return (
            <div style={{
              position:'absolute', left:20, right:20,
              top: lastY + ROW_H + 40,
              textAlign:'center', zIndex:5,
              animation: mounted ? 'qI 0.5s ease 0.5s both' : 'none',
            }}>
              {allComplete && (
                <div style={{ marginBottom:20 }}>
                  <img src="/models/quita-celebrate.png" alt="Quita" style={{ width:120,height:120,objectFit:'contain',margin:'0 auto 8px',display:'block' }} />
                  <div style={{ fontSize:22,fontWeight:800,color:'#6D28D9' }}>Parabéns!</div>
                  <div style={{ fontSize:13,color:'#7C6FA0',marginTop:4,lineHeight:1.5 }}>
                    Você completou todas as etapas disponíveis.
                  </div>
                </div>
              )}
              <div style={{
                padding:'20px 16px', borderRadius:18,
                background:'linear-gradient(135deg, rgba(109,40,217,0.06), rgba(168,85,247,0.04))',
                border:'1.5px dashed rgba(109,40,217,0.15)',
              }}>
                <Icon name="flag" size={24} color="#A78BFA" />
                <div style={{ fontSize:15,fontWeight:700,color:'#7C6FA0',marginTop:8 }}>
                  Novos blocos em breve
                </div>
                <div style={{ fontSize:12,color:'#A89BC2',marginTop:4,lineHeight:1.5 }}>
                  {allComplete
                    ? 'Continue praticando as lições anteriores enquanto preparamos as próximas etapas da sua jornada financeira.'
                    : 'Continue avançando para desbloquear as próximas etapas da sua jornada financeira.'}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Lessons modal ── */}
      {openMod && (() => {
        const c = openMod.eColor, p = pr(openMod)
        return (
          <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(26,10,46,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end' }} onClick={() => setOpenMod(null)}>
            <div style={{ background:'#fff',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:430,margin:'0 auto',padding:'24px 20px 40px',maxHeight:'75vh',overflowY:'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ width:40,height:4,background:'#E5E5E5',borderRadius:2,margin:'0 auto 16px' }} />
              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:4 }}>
                <div style={{ width:48,height:48,borderRadius:16,background:`${c}18`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Icon name={openMod.icon} size={22} color={c} />
                </div>
                <div>
                  <div style={{ fontSize:18,fontWeight:700,color:'#1A0A2E' }}>{openMod.name}</div>
                  <div style={{ fontSize:12,color:'#999' }}>{openMod.description}</div>
                </div>
              </div>
              <div style={{ fontSize:11,color:c,fontWeight:600,marginBottom:12,paddingLeft:60 }}>{openMod.ei+1} – {openMod.eName} {openMod.eSub ? `· ${openMod.eSub}` : ''}</div>
              <div style={{ background:`${c}15`,borderRadius:8,height:6,marginBottom:16 }}>
                <div style={{ background:`linear-gradient(90deg,${c},${c}cc)`,borderRadius:8,height:'100%',width:p.p+'%',transition:'width 0.5s' }} />
              </div>
              {openMod.lessons.map((l, i) => {
                const d = doneIds.includes(l.id), prev = i === 0 || doneIds.includes(openMod.lessons[i-1].id)
                const cur = !d && prev, lk = !d && !cur
                return (
                  <div key={l.id} onClick={() => { if (!lk) { setOpenMod(null); startLesson(l) } }}
                    style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:14,marginBottom:8,
                      background: d ? '#F0FDF4' : cur ? `${c}08` : '#FAFAFA',
                      border: d ? '1.5px solid #BBF7D0' : cur ? `2px solid ${c}` : '1.5px solid #F0F0F0',
                      cursor: lk ? 'default' : 'pointer', opacity: lk ? 0.45 : 1 }}>
                    <div style={{ width:40,height:40,borderRadius:12,flexShrink:0, background: d ? '#DCFCE7' : cur ? `${c}15` : '#F0F0F0', display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700, color: d ? '#16A34A' : cur ? c : '#CCC' }}>
                      {d ? <Icon name="check" size={16} color="#16A34A" /> : lk ? <Icon name="lock" size={14} color="#CCC" /> : i+1}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:700,color: d ? '#16A34A' : cur ? c : '#999' }}>{l.title}</div>
                      <div style={{ fontSize:12,color:'#999',marginTop:2 }}>{l.subtitle}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:12,fontWeight:700,color: d ? '#16A34A' : '#9B8EBE' }}>+{l.xp} XP</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {!embedded && <><div style={{ height:90 }} /><NavBar /></>}

      {/* ── Modal: Baú ── */}
      {chestModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div style={{ background:'#fff',borderRadius:28,padding:'32px 24px',maxWidth:320,width:'100%',textAlign:'center' }}>
            <div style={{ fontSize:64,marginBottom:16,animation:'qF 1s ease-in-out infinite' }}>🎁</div>
            <div style={{ fontSize:20,fontWeight:800,color:'#1A0A2E',marginBottom:6 }}>Baú do Tesouro!</div>
            <div style={{ fontSize:14,color:'#888',marginBottom:20 }}>Você encontrou um baú na trilha</div>
            <div style={{ background:'linear-gradient(135deg,#FEF3C7,#FDE68A)',borderRadius:16,padding:'16px',marginBottom:20 }}>
              <div style={{ fontSize:28,fontWeight:800,color:'#92400E' }}>{chestModal.reward.label}</div>
              <div style={{ fontSize:12,color:'#A16207',marginTop:4 }}>
                {chestModal.reward.type === 'coins' ? 'Moedas pra gastar na loja' : chestModal.reward.type === 'xp' ? 'XP bônus!' : 'Proteção pro seu streak'}
              </div>
            </div>
            <button onClick={claimChest} style={{ width:'100%',padding:14,borderRadius:16,border:'none',background:'linear-gradient(135deg,#F59E0B,#FBBF24)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(245,158,11,0.4)' }}>Coletar!</button>
          </div>
        </div>
      )}

      {/* ── Modal: Desafio / Checkpoint ── */}
      {challengeModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
          <div style={{ background:'#fff',borderRadius:24,padding:'24px 20px',maxWidth:360,width:'100%' }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
              <span style={{ fontSize:28 }}>{challengeModal.node.type === 'checkpoint' ? '🏆' : '⚡'}</span>
              <div>
                <div style={{ fontSize:16,fontWeight:800,color:'#1A0A2E' }}>{challengeModal.node.type === 'checkpoint' ? 'Checkpoint' : 'Desafio Financeiro'}</div>
                <div style={{ fontSize:11,color:'#999' }}>{challengeModal.node.type === 'checkpoint' ? 'Revisão da etapa' : 'XP dobrado se acertar'}</div>
              </div>
            </div>
            <div style={{ fontSize:14,color:'#333',lineHeight:1.6,marginBottom:18,background:'#F8F7FE',borderRadius:14,padding:16 }}>{challengeModal.challenge.q}</div>
            {challengeModal.challenge.opts.map((opt, oi) => {
              const isSelected = challengeAnswer === oi
              const showResult = challengeResult !== null
              const isCorrect = oi === challengeModal.challenge.correct
              return (
                <button key={oi} onClick={() => !showResult && setChallengeAnswer(oi)} style={{
                  display:'block',width:'100%',padding:'12px 14px',marginBottom:6,borderRadius:14,
                  border: showResult ? (isCorrect ? '2px solid #22C55E' : isSelected ? '2px solid #EF4444' : '1.5px solid #E5E5E5') : isSelected ? '2px solid #7C3AED' : '1.5px solid #E5E5E5',
                  background: showResult ? (isCorrect ? '#F0FDF4' : isSelected && !isCorrect ? '#FEF2F2' : '#fff') : isSelected ? '#F5F3FF' : '#fff',
                  color: showResult ? (isCorrect ? '#16A34A' : isSelected ? '#EF4444' : '#333') : '#333',
                  fontSize:13,fontWeight:isSelected?600:400,cursor:showResult?'default':'pointer',textAlign:'left'
                }}>{opt}</button>
              )
            })}
            {challengeResult === null && (
              <button onClick={checkChallengeAnswer} disabled={challengeAnswer < 0} style={{
                width:'100%',marginTop:10,padding:14,borderRadius:16,border:'none',
                background: challengeAnswer >= 0 ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : '#E5E5E5',
                color: challengeAnswer >= 0 ? '#fff' : '#999',fontSize:15,fontWeight:700,cursor:challengeAnswer>=0?'pointer':'default'
              }}>Confirmar</button>
            )}
            {challengeResult !== null && (
              <div style={{ marginTop:12 }}>
                <div style={{ padding:14,borderRadius:14,background: challengeResult ? '#F0FDF4' : '#FEF2F2',marginBottom:12 }}>
                  <div style={{ fontSize:14,fontWeight:700,color: challengeResult ? '#16A34A' : '#EF4444',marginBottom:4 }}>
                    {challengeResult ? 'Correto! +80 XP' : 'Errou — mas aprendeu!'}
                  </div>
                  <div style={{ fontSize:12,color:'#666',lineHeight:1.6 }}>{challengeModal.challenge.why}</div>
                </div>
                <button onClick={() => { setChallengeModal(null); setChallengeAnswer(-1); setChallengeResult(null) }} style={{
                  width:'100%',padding:14,borderRadius:16,border:'none',
                  background: challengeResult ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
                  color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer'
                }}>Continuar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
