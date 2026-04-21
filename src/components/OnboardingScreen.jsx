import { useState } from 'react'
import { trackOnboardingStep } from '../services/analytics'

const RENDAS = [
  { id: 'ate1500', label: 'Até R$ 1.500', value: 1500 },
  { id: '1500a3000', label: 'R$ 1.500 – R$ 3.000', value: 2250 },
  { id: '3000a5000', label: 'R$ 3.000 – R$ 5.000', value: 4000 },
  { id: '5000a8000', label: 'R$ 5.000 – R$ 8.000', value: 6500 },
  { id: '8000a12000', label: 'R$ 8.000 – R$ 12.000', value: 10000 },
  { id: 'acima12000', label: 'Acima de R$ 12.000', value: 15000 },
]

const DIFICULDADES = [
  { id: 'dividas', label: 'Sair das dívidas', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', desc: 'Tenho dívidas e quero quitar' },
  { id: 'gastos', label: 'Controlar gastos', icon: 'M21 4H3v16h18V4zM3 10h18', desc: 'Gasto mais do que deveria' },
  { id: 'sobrar', label: 'Fazer sobrar dinheiro', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2', desc: 'No fim do mês nunca sobra nada' },
  { id: 'investir', label: 'Começar a investir', icon: 'M23 6l-9.5 9.5-5-5L1 18', desc: 'Quero fazer meu dinheiro render' },
  { id: 'reserva', label: 'Montar reserva', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', desc: 'Preciso de segurança financeira' },
  { id: 'organizar', label: 'Me organizar', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', desc: 'Não tenho controle das finanças' },
]

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [renda, setRenda] = useState(null)
  const [dificuldade, setDificuldade] = useState(null)
  const [dailyGoal, setDailyGoal] = useState(null)

  const totalSteps = 5 // 0: nome/idade, 1: renda, 2: dificuldade, 3: meta diária, 4: pronto

  const canProceed = step === 0 ? name.trim().length >= 2 && age.trim().length > 0 && parseInt(age) >= 10 && parseInt(age) <= 120
    : step === 1 ? renda !== null
    : step === 2 ? dificuldade !== null
    : step === 3 ? dailyGoal !== null
    : true

  const next = () => {
    trackOnboardingStep(step + 1, step === 0 ? { name_length: name.trim().length, age: parseInt(age) } : step === 1 ? { renda } : step === 2 ? { dificuldade } : step === 3 ? { dailyGoal } : {})
    if (step < totalSteps - 1) setStep(step + 1)
    else {
      const rendaObj = RENDAS.find(r => r.id === renda)
      onComplete({ name: name.trim(), age: parseInt(age), income: rendaObj?.value || 0, dificuldade, dailyGoal })
    }
  }

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background: 'linear-gradient(160deg, #1E0A3C 0%, #2D1458 30%, #4C1D95 60%, #6D28D9 100%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '24px 0 16px', paddingTop: 'calc(24px + var(--sat, 0px))' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 3,
            background: i <= step ? '#A855F7' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', overflowY: 'auto' }}>

        {/* Step 0: Nome */}
        {step === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <img src="/models/quita-original-preview.png" alt="Quita" style={{ width: 140, height: 140, objectFit: 'contain', margin: '0 auto 24px', display: 'block' }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: 8 }}>Olá! Eu sou a Quita</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32, lineHeight: 1.5 }}>Sua parceira na jornada financeira. Como posso te chamar?</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" autoFocus
              style={{ width: '100%', padding: '16px 20px', borderRadius: 16, border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 18, fontWeight: 600, outline: 'none', textAlign: 'center', boxSizing: 'border-box', marginBottom: 12 }} />
            <input value={age} onChange={e => setAge(e.target.value.replace(/\D/g,'').slice(0,3))} onKeyDown={e => e.key === 'Enter' && canProceed && next()} placeholder="Sua idade" type="tel" inputMode="numeric"
              style={{ width: '100%', padding: '16px 20px', borderRadius: 16, border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 18, fontWeight: 600, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 8 }}>A idade ajuda a Quita a personalizar recomendações</div>
          </div>
        )}

        {/* Step 1: Renda */}
        {step === 1 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6, marginTop: 20 }}>Qual sua faixa de renda, {name.split(' ')[0]}?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24, lineHeight: 1.5 }}>Isso ajuda a personalizar suas metas. Pode ser aproximado.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RENDAS.map(r => (
                <button key={r.id} onClick={() => setRenda(r.id)} style={{
                  padding: '16px 18px', borderRadius: 14,
                  background: renda === r.id ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.2))' : 'rgba(255,255,255,0.06)',
                  border: renda === r.id ? '2px solid #A855F7' : '2px solid rgba(255,255,255,0.08)',
                  color: renda === r.id ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: renda === r.id ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}>{r.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Dificuldade */}
        {step === 2 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6, marginTop: 20 }}>Qual sua maior dificuldade?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.5 }}>Vamos focar no que mais importa pra você agora.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DIFICULDADES.map(d => (
                <button key={d.id} onClick={() => setDificuldade(d.id)} style={{
                  padding: '14px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14,
                  background: dificuldade === d.id ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.2))' : 'rgba(255,255,255,0.06)',
                  border: dificuldade === d.id ? '2px solid #A855F7' : '2px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: dificuldade === d.id ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dificuldade === d.id ? '#A855F7' : 'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d.icon} /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: dificuldade === d.id ? 700 : 500, color: dificuldade === d.id ? '#fff' : 'rgba(255,255,255,0.7)' }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{d.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Meta diária */}
        {step === 3 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6, marginTop: 20 }}>Quanto tempo por dia?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24, lineHeight: 1.5 }}>Esse compromisso diário vai te ajudar a manter o ritmo.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: '5min', label: '5 minutos', desc: 'Rápido e consistente', icon: '⚡' },
                { id: '10min', label: '10 minutos', desc: 'O equilíbrio perfeito', icon: '🎯', recommended: true },
                { id: '15min', label: '15 minutos', desc: 'Aprendizado acelerado', icon: '🚀' },
              ].map(g => (
                <button key={g.id} onClick={() => setDailyGoal(g.id)} style={{
                  padding: '16px 18px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14,
                  background: dailyGoal === g.id ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.2))' : 'rgba(255,255,255,0.06)',
                  border: dailyGoal === g.id ? '2px solid #A855F7' : '2px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative',
                }}>
                  <span style={{ fontSize: 28 }}>{g.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: dailyGoal === g.id ? 700 : 500, color: dailyGoal === g.id ? '#fff' : 'rgba(255,255,255,0.7)' }}>{g.label}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{g.desc}</div>
                  </div>
                  {g.recommended && <span style={{ position: 'absolute', top: -8, right: 12, background: '#F59E0B', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>RECOMENDADO</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Pronto */}
        {step === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <img src="/models/quita-ia.png" alt="Quita" style={{ width: 180, height: 180, objectFit: 'contain', margin: '0 auto 20px', display: 'block' }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>Tudo pronto, {name.split(' ')[0]}!</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 8 }}>Vou te guiar pelo app pra você conhecer cada funcionalidade.</div>
            <div style={{ margin: '16px auto', padding: '14px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 300 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>SEU FOCO</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, fontWeight: 500 }}>
                {dificuldade === 'dividas' && 'Sair das dívidas e negociar melhores taxas.'}
                {dificuldade === 'gastos' && 'Identificar padrões de gasto e cortar o desnecessário.'}
                {dificuldade === 'sobrar' && 'Criar uma sobra mensal consistente.'}
                {dificuldade === 'investir' && 'Preparar o terreno pra começar a investir.'}
                {dificuldade === 'reserva' && 'Montar sua reserva de emergência.'}
                {dificuldade === 'organizar' && 'Organizar toda sua vida financeira do zero.'}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom */}
      <div style={{ padding: '16px 24px 36px' }}>
        <button onClick={next} disabled={!canProceed} style={{
          width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: canProceed ? 'linear-gradient(135deg, #A855F7, #7C3AED)' : 'rgba(255,255,255,0.08)',
          color: canProceed ? '#fff' : 'rgba(255,255,255,0.25)',
          fontSize: 17, fontWeight: 700, cursor: canProceed ? 'pointer' : 'default',
          boxShadow: canProceed ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
          transition: 'all 0.3s',
        }}>
          {step === 4 ? 'Conhecer o app' : 'Continuar'}
        </button>
        {step > 0 && step < 4 && (
          <button onClick={() => setStep(step - 1)} style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 14, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Voltar</button>
        )}
      </div>
    </div>
  )
}
