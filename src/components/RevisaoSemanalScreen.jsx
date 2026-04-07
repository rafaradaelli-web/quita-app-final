import { useState, useMemo } from 'react'
import { ArrowLeft, RotateCcw, Zap } from 'lucide-react'
import LESSONS_DATA from '../services/lessons.json'

export default function RevisaoSemanalScreen({ state, setState, save, addXp, addCoins, onBack }) {
  const [step, setStep] = useState('intro') // intro | quiz | done
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(-1)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [totalXp, setTotalXp] = useState(0)

  // Build 10 questions: wrong answers first, then random from completed lessons
  const questions = useMemo(() => {
    const pool = []

    // 1. Wrong answers (priority — spaced repetition)
    const wrongAnswers = (state.wrongAnswers || [])
      .sort((a, b) => b.date - a.date) // most recent first
      .slice(0, 7) // max 7 from wrong
    wrongAnswers.forEach(wa => {
      pool.push({ q: wa.q, options: wa.options, correct: wa.correct, source: 'wrong', lessonId: wa.lessonId })
    })

    // 2. Random questions from completed lessons
    const allLessons = (LESSONS_DATA.journeys || []).flatMap(j => j.modules.flatMap(m => m.lessons))
    const completed = allLessons.filter(l => (state.completedLessons || []).includes(l.id))
    const shuffled = [...completed].sort(() => Math.random() - 0.5)

    for (const lesson of shuffled) {
      if (pool.length >= 10) break
      for (const q of lesson.questions) {
        if (pool.length >= 10) break
        // Avoid duplicates
        if (!pool.find(p => p.q === q.q)) {
          pool.push({ q: q.q, options: q.options, correct: q.correct, source: 'review', lessonId: lesson.id })
        }
      }
    }

    // Shuffle final pool
    return pool.sort(() => Math.random() - 0.5).slice(0, 10)
  }, [])

  const total = questions.length
  const currentQ = questions[qIdx]

  const handleAnswer = () => {
    if (selected < 0) return
    setAnswered(true)
    if (selected === currentQ.correct) {
      setScore(s => s + 1)
      setTotalXp(x => x + 15)
      // Remove from wrongAnswers if it was there
      if (currentQ.source === 'wrong') {
        setState(prev => {
          const wa = (prev.wrongAnswers || []).filter(w => w.q !== currentQ.q)
          return { ...prev, wrongAnswers: wa }
        })
      }
    } else {
      // Track as wrong answer if not already there
      setState(prev => {
        const wa = [...(prev.wrongAnswers || [])]
        if (!wa.find(w => w.q === currentQ.q)) {
          wa.push({ lessonId: currentQ.lessonId, qIdx: 0, q: currentQ.q, options: currentQ.options, correct: currentQ.correct, date: Date.now() })
          if (wa.length > 50) wa.shift()
        }
        return { ...prev, wrongAnswers: wa }
      })
    }
  }

  const nextQuestion = () => {
    if (qIdx < total - 1) {
      setQIdx(q => q + 1)
      setSelected(-1)
      setAnswered(false)
    } else {
      // Done — give rewards
      const bonusXp = score >= 8 ? 50 : score >= 5 ? 25 : 10
      const finalXp = totalXp + bonusXp
      addXp(finalXp, `Revisão semanal: ${score}/${total}`)
      addCoins(25)
      setState(prev => {
        const n = { ...prev, lastWeeklyReview: new Date().toDateString() }
        save(n)
        return n
      })
      setTotalXp(finalXp)
      setStep('done')
    }
  }

  const pct = total > 0 ? Math.round(((qIdx + (answered ? 1 : 0)) / total) * 100) : 0
  const grade = total > 0 ? Math.round(score / total * 100) : 0

  if (total === 0) {
    return (
      <div style={{ background:'#F0EDF8', minHeight:'100vh', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ background:'linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)', padding:'16px 20px 24px', borderRadius:'0 0 28px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={onBack} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:12, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <ArrowLeft size={18} color="#fff" />
            </button>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>Revisão Semanal</div>
          </div>
        </div>
        <div style={{ textAlign:'center', padding:'60px 24px', color:'#999' }}>
          <RotateCcw size={40} color="#D4D4D8" style={{ margin:'0 auto 16px' }} />
          <div style={{ fontSize:16, fontWeight:700, color:'#666' }}>Complete mais lições primeiro</div>
          <div style={{ fontSize:13, marginTop:6, lineHeight:1.5 }}>A revisão usa perguntas das lições que você já completou. Continue na trilha!</div>
          <button onClick={onBack} style={{ marginTop:20, background:'linear-gradient(135deg,#7C3AED,#6D28D9)', color:'#fff', border:'none', borderRadius:14, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            Voltar pra trilha
          </button>
        </div>
      </div>
    )
  }

  // ── Intro screen ──
  if (step === 'intro') {
    const wrongCount = (state.wrongAnswers || []).length
    return (
      <div style={{ background:'#F0EDF8', minHeight:'100vh', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ background:'linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)', padding:'16px 20px 24px', borderRadius:'0 0 28px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={onBack} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:12, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <ArrowLeft size={18} color="#fff" />
            </button>
            <div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:600, letterSpacing:1 }}>DOMINGO</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>Revisão Semanal</div>
            </div>
          </div>
        </div>
        <div style={{ padding:'24px 16px', textAlign:'center' }}>
          <img src="/models/quita-study.png" alt="Quita" style={{ width:120, height:120, objectFit:'contain', margin:'0 auto 16px', display:'block' }} />
          <div style={{ fontSize:20, fontWeight:800, color:'#1E0A3C', marginBottom:8 }}>Hora de revisar!</div>
          <div style={{ fontSize:14, color:'#666', lineHeight:1.6, marginBottom:24 }}>
            {total} perguntas para fixar o que aprendeu esta semana.
            {wrongCount > 0 && ` Incluindo ${Math.min(wrongCount, 7)} que você errou antes.`}
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginBottom:28 }}>
            <div style={{ background:'rgba(124,58,237,0.08)', borderRadius:14, padding:'12px 18px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:'#7C3AED' }}>{total}</div>
              <div style={{ fontSize:10, color:'#999', fontWeight:600, marginTop:2 }}>Perguntas</div>
            </div>
            <div style={{ background:'rgba(34,197,94,0.08)', borderRadius:14, padding:'12px 18px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:'#22C55E' }}>+{total * 15}</div>
              <div style={{ fontSize:10, color:'#999', fontWeight:600, marginTop:2 }}>XP possível</div>
            </div>
            <div style={{ background:'rgba(245,158,11,0.08)', borderRadius:14, padding:'12px 18px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:'#F59E0B' }}>+25</div>
              <div style={{ fontSize:10, color:'#999', fontWeight:600, marginTop:2 }}>Moedas</div>
            </div>
          </div>
          <button onClick={() => setStep('quiz')} style={{
            background:'linear-gradient(160deg,#1E0A3C 0%,#3B1578 50%,#6D28D9 100%)', color:'#fff',
            border:'none', borderRadius:16, padding:'16px', width:'100%', fontSize:16, fontWeight:700,
            cursor:'pointer', boxShadow:'0 4px 16px rgba(30,10,60,0.35)',
          }}>Começar revisão</button>
        </div>
      </div>
    )
  }

  // ── Done screen ──
  if (step === 'done') {
    return (
      <div style={{ background:'#F0EDF8', minHeight:'100vh', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', padding:'24px' }}>
          <img src={score >= 8 ? "/models/quita-celebrate.png" : "/models/quita-study.png"} alt="" style={{ width:130, height:130, objectFit:'contain', margin:'0 auto 16px', display:'block' }} />
          <div style={{ fontSize:24, fontWeight:800, color: score >= 8 ? '#16A34A' : score >= 5 ? '#F59E0B' : '#7C3AED' }}>
            {score >= 8 ? 'Excelente!' : score >= 5 ? 'Bom trabalho!' : 'Continue praticando!'}
          </div>
          <div style={{ fontSize:48, fontWeight:800, color:'#1E0A3C', marginTop:8 }}>{score}/{total}</div>
          <div style={{ fontSize:14, color:'#999', marginTop:4 }}>Nota: {grade}%</div>

          <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:20, marginBottom:28 }}>
            <div style={{ background:'rgba(34,197,94,0.1)', borderRadius:12, padding:'10px 16px' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#16A34A' }}>+{totalXp} XP</div>
            </div>
            <div style={{ background:'rgba(245,158,11,0.1)', borderRadius:12, padding:'10px 16px' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#F59E0B' }}>+25 moedas</div>
            </div>
          </div>

          {score < total && (
            <div style={{ fontSize:12, color:'#999', marginBottom:16, lineHeight:1.5 }}>
              As perguntas que errou aparecerão na próxima revisão.
            </div>
          )}

          <button onClick={onBack} style={{
            background:'linear-gradient(160deg,#1E0A3C 0%,#3B1578 50%,#6D28D9 100%)', color:'#fff',
            border:'none', borderRadius:16, padding:'14px 32px', fontSize:15, fontWeight:700, cursor:'pointer',
          }}>Voltar</button>
        </div>
      </div>
    )
  }

  // ── Quiz screen ──
  return (
    <div style={{ background:'#F0EDF8', minHeight:'100vh', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)', padding:'14px 20px 20px', borderRadius:'0 0 28px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <ArrowLeft size={16} color="#fff" />
          </button>
          <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Pergunta {qIdx + 1} de {total}</div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <Zap size={14} color="#F59E0B" />
            <span style={{ fontSize:13, fontWeight:700, color:'#F59E0B' }}>{score}/{qIdx + (answered ? 1 : 0)}</span>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:6, height:5 }}>
          <div style={{ background:'#A855F7', borderRadius:6, height:'100%', width:`${pct}%`, transition:'width 0.4s' }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ padding:'24px 16px 100px' }}>
        {currentQ.source === 'wrong' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, padding:'6px 12px', borderRadius:10, background:'rgba(245,158,11,0.08)', width:'fit-content' }}>
            <RotateCcw size={12} color="#F59E0B" />
            <span style={{ fontSize:11, fontWeight:600, color:'#F59E0B' }}>Repetição espaçada</span>
          </div>
        )}

        <div style={{ fontSize:17, fontWeight:700, color:'#1E0A3C', lineHeight:1.45, marginBottom:20 }}>
          {currentQ.q}
        </div>

        {currentQ.options.map((opt, i) => {
          let bg = 'rgba(255,255,255,0.95)', border = '1.5px solid #E5E5E5', col = '#333'
          if (answered && i === currentQ.correct) { bg = '#F0FDF4'; border = '1.5px solid #22C55E'; col = '#16A34A' }
          else if (answered && i === selected && i !== currentQ.correct) { bg = '#FEF2F2'; border = '1.5px solid #EF4444'; col = '#DC2626' }
          else if (!answered && i === selected) { bg = '#F5F3FF'; border = '1.5px solid #7B2FF2'; col = '#7B2FF2' }
          return (
            <button key={i} onClick={() => !answered && setSelected(i)} style={{
              display:'flex', alignItems:'center', gap:12, width:'100%', padding:'14px 16px', marginBottom:10,
              borderRadius:14, border, background:bg, cursor: answered ? 'default' : 'pointer',
              fontSize:15, color:col, textAlign:'left',
            }}>
              <span style={{ width:28, height:28, borderRadius:'50%', border:`1.5px solid ${col}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:500, flexShrink:0 }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          )
        })}

        {answered && (
          <div style={{ background: selected === currentQ.correct ? '#F0FDF4' : '#FEF2F2', borderRadius:14, padding:14, marginTop:8 }}>
            <div style={{ fontSize:14, fontWeight:600, color: selected === currentQ.correct ? '#16A34A' : '#DC2626' }}>
              {selected === currentQ.correct ? 'Correto! +15 XP' : 'Resposta incorreta'}
            </div>
          </div>
        )}

        {/* Action button */}
        <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'16px', background:'linear-gradient(0deg, #F0EDF8 80%, transparent)', maxWidth:430, margin:'0 auto' }}>
          {!answered ? (
            <button onClick={handleAnswer} disabled={selected < 0} style={{
              width:'100%', padding:'15px', borderRadius:16, border:'none', fontSize:16, fontWeight:700, cursor: selected >= 0 ? 'pointer' : 'default',
              background: selected >= 0 ? 'linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)' : '#E5E5E5',
              color: selected >= 0 ? '#fff' : '#999',
            }}>Confirmar</button>
          ) : (
            <button onClick={nextQuestion} style={{
              width:'100%', padding:'15px', borderRadius:16, border:'none', fontSize:16, fontWeight:700, cursor:'pointer',
              background:'linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)', color:'#fff',
            }}>{qIdx < total - 1 ? 'Próxima' : 'Ver resultado'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
