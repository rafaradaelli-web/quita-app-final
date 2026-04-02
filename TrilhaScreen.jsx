import { useState, useEffect, useRef } from 'react'
import LESSONS from '../services/lessons.json'
import { LEVELS, getLevel } from '../services/gameConfig'

// ─── Paleta Premium Purple ────────────────────────────────────────────────────
const T = {
  bg:          '#F0EDF8',
  headerFrom:  '#3B0764',
  headerTo:    '#6D28D9',
  nodeDone:    '#7C3AED',
  nodeCurrent: '#A855F7',
  nodeLocked:  '#C4B5FD',
  nodeGlow:    'rgba(168,85,247,0.35)',
  connDone:    '#7C3AED',
  connPending: '#DDD6FE',
  cardBg:      'rgba(255,255,255,0.92)',
  textPrimary: '#1E1040',
  textMuted:   '#7C6FA0',
  xpBar:       'linear-gradient(90deg,#A855F7,#7C3AED,#fff)',
  heartFull:   '#EF4444',
  heartEmpty:  '#E5E7EB',
}

// ─── Posições zig-zag ─────────────────────────────────────────────────────────
const ZIGZAG = [
  { side: 'center', xPct: 50 },
  { side: 'left',   xPct: 22 },
  { side: 'right',  xPct: 72 },
  { side: 'left',   xPct: 18 },
  { side: 'right',  xPct: 68 },
]

const NODE_SIZE    = 76
const NODE_CURRENT = 90
const ROW_H        = 170
const LESSON_ICONS = ['💳','📈','⛄','🔍','⚖️']

// ─── Ícone coração ────────────────────────────────────────────────────────────
function Heart({ filled }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? T.heartFull : T.heartEmpty}>
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.335 3.568 1 6.5 1c1.742 0 3.093.829 4.094 2.077C11.44 1.827 12.8 1 14.5 1 17.432 1 20 3.335 20 7.191c0 4.105-5.371 8.863-11 14.402z"/>
    </svg>
  )
}

// ─── Ícone check ─────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

// ─── Ícone cadeado ────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="rgba(124,111,160,0.7)" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  )
}

// ─── Animação de pulso CSS inline ─────────────────────────────────────────────
const PULSE_STYLE = `
  @keyframes quitaPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.5), 0 8px 32px rgba(109,40,217,0.4); }
    50%      { box-shadow: 0 0 0 12px rgba(168,85,247,0), 0 8px 32px rgba(109,40,217,0.4); }
  }
  @keyframes quitaFloat {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes quitaFadeIn {
    from { opacity:0; transform: translateY(16px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes connDraw {
    from { stroke-dashoffset: 400; }
    to   { stroke-dashoffset: 0; }
  }
`

export default function TrilhaScreen({ state, styles, startLesson, NavBar }) {
  const [mounted, setMounted] = useState(false)
  const [tooltip, setTooltip] = useState(null) // índice da lição com tooltip visível

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const completedIds  = state.completedLessons || []
  const completedCount = completedIds.length
  const totalLessons  = LESSONS.length
  const allDone       = completedCount === totalLessons
  const lives         = 3  // fixo por enquanto — pode vir de state.lives futuramente

  // XP / nível
  const levelInfo  = LEVELS[state.level] || LEVELS[0]
  const nextLevel  = LEVELS[state.level + 1]
  const xpProgress = nextLevel
    ? Math.round(((state.xp - levelInfo.xp) / (nextLevel.xp - levelInfo.xp)) * 100)
    : 100

  // Layout
  const TOTAL_H = totalLessons * ROW_H + 180

  function nodeCenter(i) {
    const z    = ZIGZAG[i] || { xPct: 50 }
    const size = !completedIds.includes(LESSONS[i]?.id) && i === completedCount
      ? NODE_CURRENT : NODE_SIZE
    return {
      xPct: z.xPct,
      y:    100 + i * ROW_H + size / 2,
    }
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{PULSE_STYLE}</style>

      {/* ── HEADER FIXO ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: `linear-gradient(135deg, ${T.headerFrom} 0%, ${T.headerTo} 100%)`,
        padding: '14px 20px 16px',
        boxShadow: '0 4px 20px rgba(59,7,100,0.3)',
      }}>
        {/* Linha 1: título + vidas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: 1 }}>
              SUA JORNADA
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
              Trilha Financeira
            </div>
          </div>

          {/* Vidas */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <Heart key={i} filled={i < lives} />
            ))}
          </div>
        </div>

        {/* Linha 2: streak + XP */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 20,
            padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5,
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <span style={{ fontSize: 15 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {state.streak} {state.streak === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 20,
            padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5,
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <span style={{ fontSize: 15 }}>⚡</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {state.xp.toLocaleString()} XP
            </span>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            {completedCount}/{totalLessons} lições
          </div>
        </div>

        {/* Barra de XP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Nv {state.level + 1}
          </span>
          <div style={{
            flex: 1, height: 7, borderRadius: 4,
            background: 'rgba(255,255,255,0.18)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: xpProgress + '%',
              background: 'linear-gradient(90deg,#C4B5FD,#fff)',
              transition: 'width 0.8s ease',
              boxShadow: '0 0 8px rgba(255,255,255,0.4)',
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {levelInfo.name}
          </span>
        </div>
      </div>

      {/* ── MAPA DA TRILHA ──────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: TOTAL_H, overflowX: 'hidden', paddingTop: 20 }}>

        {/* Linha conectora SVG */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: TOTAL_H, pointerEvents: 'none' }}
          viewBox={`0 0 100 ${TOTAL_H}`}
          preserveAspectRatio="none"
        >
          {LESSONS.map((l, i) => {
            if (i >= LESSONS.length - 1) return null
            const a    = nodeCenter(i)
            const b    = nodeCenter(i + 1)
            const done = completedIds.includes(l.id)
            const ax   = a.xPct
            const bx   = b.xPct
            // Curva cúbica suave
            const cx1  = ax
            const cy1  = a.y + (b.y - a.y) * 0.4
            const cx2  = bx
            const cy2  = a.y + (b.y - a.y) * 0.6

            return (
              <path
                key={i}
                d={`M ${ax} ${a.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${bx} ${b.y}`}
                fill="none"
                stroke={done ? T.connDone : T.connPending}
                strokeWidth={done ? '1.8' : '1.4'}
                strokeDasharray={done ? 'none' : '6 5'}
                strokeLinecap="round"
                opacity={done ? 0.8 : 0.5}
              />
            )
          })}
        </svg>

        {/* Nós das lições */}
        {LESSONS.map((l, i) => {
          const done      = completedIds.includes(l.id)
          const isCurrent = !done && i === completedCount
          const locked    = !done && !isCurrent
          const z         = ZIGZAG[i] || { xPct: 50, side: 'center' }
          const size      = isCurrent ? NODE_CURRENT : NODE_SIZE
          const topY      = 100 + i * ROW_H
          const icon      = LESSON_ICONS[i] || '📖'
          const labelLeft = z.xPct > 50  // label do lado oposto ao nó

          return (
            <div key={l.id} style={{ animation: mounted ? `quitaFadeIn 0.4s ease ${i * 0.08}s both` : 'none' }}>

              {/* Placeholder mascote no nó atual */}
              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  left: `calc(${z.xPct}% - 22px)`,
                  top: topY - 48,
                  width: 44, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                  animation: 'quitaFloat 2.5s ease-in-out infinite',
                  filter: 'drop-shadow(0 4px 8px rgba(109,40,217,0.4))',
                  zIndex: 10,
                }}>
                  🐷
                </div>
              )}

              {/* Label da lição */}
              <div style={{
                position: 'absolute',
                top: topY + size / 2 - 24,
                ...(labelLeft
                  ? { right: `calc(${100 - z.xPct}% + ${size / 2 + 12}px)` }
                  : { left:  `calc(${z.xPct}% + ${size / 2 + 12}px)` }
                ),
                textAlign: labelLeft ? 'right' : 'left',
                maxWidth: 110,
                pointerEvents: 'none',
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, lineHeight: 1.25,
                  color: done ? '#6D28D9' : isCurrent ? '#7C3AED' : '#A89BC2',
                }}>
                  {l.title}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600, marginTop: 2,
                  color: done ? '#16A34A' : isCurrent ? '#A855F7' : '#C4B5FD',
                }}>
                  {done ? `✓ +${l.xp} XP` : isCurrent ? `▶ +${l.xp} XP` : '🔒'}
                </div>
              </div>

              {/* Nó principal */}
              <div
                onClick={() => !locked && startLesson(i)}
                style={{
                  position: 'absolute',
                  left: `calc(${z.xPct}% - ${size / 2}px)`,
                  top: topY,
                  width: size, height: size,
                  borderRadius: '50%',
                  cursor: locked ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s',
                  userSelect: 'none',
                  zIndex: 5,

                  // Visual por estado
                  background: done
                    ? 'linear-gradient(145deg,#8B5CF6,#6D28D9)'
                    : isCurrent
                    ? 'linear-gradient(145deg,#A855F7,#7C3AED)'
                    : 'rgba(196,181,253,0.25)',

                  border: done
                    ? '3px solid rgba(255,255,255,0.3)'
                    : isCurrent
                    ? '3px solid rgba(255,255,255,0.5)'
                    : '2.5px solid rgba(196,181,253,0.4)',

                  boxShadow: done
                    ? '0 6px 0 #4C1D95, 0 8px 20px rgba(109,40,217,0.35)'
                    : isCurrent
                    ? '0 6px 0 #5B21B6, 0 8px 28px rgba(168,85,247,0.45)'
                    : '0 3px 0 rgba(167,139,250,0.3)',

                  animation: isCurrent ? 'quitaPulse 2s ease-in-out infinite' : 'none',
                }}
                onMouseEnter={e => {
                  if (!locked) e.currentTarget.style.transform = 'scale(1.08)'
                  setTooltip(i)
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  setTooltip(null)
                }}
              >
                {done    && <CheckIcon />}
                {isCurrent && <span style={{ fontSize: 28 }}>{icon}</span>}
                {locked  && <LockIcon />}
              </div>

              {/* Tooltip ao hover */}
              {tooltip === i && !locked && (
                <div style={{
                  position: 'absolute',
                  left: `calc(${z.xPct}% - 80px)`,
                  top: topY + size + 8,
                  width: 160,
                  background: '#1E1040',
                  borderRadius: 12,
                  padding: '8px 12px',
                  zIndex: 20,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{l.title}</div>
                  <div style={{ fontSize: 10, color: '#A78BFA' }}>{l.subtitle}</div>
                  <div style={{ fontSize: 10, color: '#C4B5FD', marginTop: 4, fontWeight: 600 }}>
                    {done ? `✅ Concluído · +${l.xp} XP` : `+${l.xp} XP ao completar`}
                  </div>
                  {/* Seta do tooltip */}
                  <div style={{
                    position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '6px solid #1E1040',
                  }} />
                </div>
              )}
            </div>
          )
        })}

        {/* Card de conclusão total */}
        {allDone && (
          <div style={{
            position: 'absolute',
            left: 20, right: 20,
            top: totalLessons * ROW_H + 40,
            background: 'linear-gradient(135deg,#16A34A,#22C55E)',
            borderRadius: 20,
            padding: '20px 24px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(22,163,74,0.35)',
            animation: 'quitaFadeIn 0.5s ease both',
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Trilha completa!</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              Você completou todas as lições. Volte amanhã!
            </div>
          </div>
        )}

      </div>

      {/* Espaço para NavBar */}
      <div style={{ height: 90 }} />
      <NavBar />
    </div>
  )
}
