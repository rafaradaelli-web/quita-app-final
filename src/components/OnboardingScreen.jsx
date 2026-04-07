import { useState } from 'react'
import { trackOnboardingStep, trackOnboardingSkipTutorial } from '../services/analytics'

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

const TUTORIAL = [
  {
    icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10',
    color: '#7C3AED',
    title: 'Início',
    desc: 'Sua tela principal. Aqui você vê sua Quita 3D, o streak do dia, XP acumulado, missão pendente e atividades semanais. É o ponto de partida pra tudo — complete 1 módulo por dia e acompanhe seu progresso.',
  },
  {
    icon: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V17H6.5A2.5 2.5 0 004 19.5zM4 19.5V4.5A2.5 2.5 0 016.5 2H20v15',
    color: '#14B8A6',
    title: 'Trilha de Lições',
    desc: 'Seu caminho de aprendizado financeiro. São módulos com 5 lições curtinhas cada — leia o conteúdo, responda o quiz e ganhe XP e moedas. Complete 1 módulo por dia pra manter o streak. A trilha vai desde o básico até investimentos e empreendedorismo.',
  },
  {
    icon: 'M12 3l1.5 3.7 3.8.6-2.7 2.7.6 3.8L12 12l-3.2 1.8.6-3.8L6.7 7.3l3.8-.6zM19 15l.8 1.9 2 .3-1.4 1.4.3 2-1.7-.9-1.7.9.3-2-1.4-1.4 2-.3z',
    color: '#F59E0B',
    title: 'Quita IA',
    desc: 'Sua consultora financeira pessoal. Ela analisa seus dados reais e gera um diagnóstico com 6 dimensões, insights personalizados e um plano de ação com metas de 30 dias, 3 meses e 12 meses. Também tem um chat onde você tira qualquer dúvida financeira.',
  },
  {
    icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    color: '#22C55E',
    title: 'Financeiro',
    desc: 'Controle completo da sua vida financeira. Registre gastos (manual, Excel ou PDF), cadastre receitas e dívidas, defina metas de economia e registre seu patrimônio — reserva de emergência e investimentos por classe de ativo. Tudo isso alimenta a Quita IA.',
  },
  {
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: '#3B82F6',
    title: 'Diagnóstico',
    desc: 'Um raio-x completo da sua saúde financeira. Mostra quanto da renda está comprometida, nível de endividamento, se sobra dinheiro, reserva de emergência e seu progresso na trilha. Quanto melhor o score, mais perto da liberdade financeira.',
  },
  {
    icon: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
    color: '#EC4899',
    title: 'Loja',
    desc: 'Ganhe moedas completando lições e atividades. Use pra comprar skins exclusivas pra sua Quita — praia, natal, gamer — e fundos temáticos que mudam o visual do app. Toque nas moedas no topo da Home pra acessar.',
  },
]

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [renda, setRenda] = useState(null)
  const [dificuldade, setDificuldade] = useState(null)
  const [dailyGoal, setDailyGoal] = useState(null)

  const totalSteps = 5 + TUTORIAL.length // 0-3 data, 4 pronto, 5-9 tutorial
  const isTutorial = step >= 5
  const tutorialIdx = step - 5

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
            background: i <= step ? (isTutorial ? TUTORIAL[Math.min(tutorialIdx, TUTORIAL.length - 1)].color : '#A855F7') : 'rgba(255,255,255,0.15)',
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
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 8 }}>Antes de começar, vou te mostrar rapidamente como o app funciona.</div>
            <div style={{ margin: '16px auto', padding: '14px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 300 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>SEU PLANO PERSONALIZADO</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, fontWeight: 500 }}>
                {dificuldade === 'dividas' && 'Foco em quitar dívidas e negociar melhores taxas com os bancos.'}
                {dificuldade === 'gastos' && 'Foco em identificar padrões de gasto e cortar o que não precisa.'}
                {dificuldade === 'sobrar' && 'Foco em criar uma sobra mensal consistente que vira hábito.'}
                {dificuldade === 'investir' && 'Foco em preparar o terreno financeiro pra começar a investir.'}
                {dificuldade === 'reserva' && 'Foco em montar sua reserva de emergência passo a passo.'}
                {dificuldade === 'organizar' && 'Foco em organizar toda sua vida financeira do zero.'}
              </div>
            </div>
          </div>
        )}

        {/* Steps 5-9: Tutorial slides */}
        {isTutorial && tutorialIdx < TUTORIAL.length && (() => {
          const t = TUTORIAL[tutorialIdx]
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{
                width: 100, height: 100, borderRadius: 28, margin: '0 auto 28px',
                background: `linear-gradient(135deg, ${t.color}30, ${t.color}15)`,
                border: `2px solid ${t.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 12 }}>{t.title}</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 340, margin: '0 auto' }}>{t.desc}</div>
            </div>
          )
        })()}

      </div>

      {/* Bottom */}
      <div style={{ padding: '16px 24px 36px' }}>
        <button onClick={next} disabled={!canProceed} style={{
          width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: canProceed ? (isTutorial ? `linear-gradient(135deg, ${TUTORIAL[Math.min(tutorialIdx, TUTORIAL.length - 1)].color}, ${TUTORIAL[Math.min(tutorialIdx, TUTORIAL.length - 1)].color}cc)` : 'linear-gradient(135deg, #A855F7, #7C3AED)') : 'rgba(255,255,255,0.08)',
          color: canProceed ? '#fff' : 'rgba(255,255,255,0.25)',
          fontSize: 17, fontWeight: 700, cursor: canProceed ? 'pointer' : 'default',
          boxShadow: canProceed ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
          transition: 'all 0.3s',
        }}>
          {step === totalSteps - 1 ? 'Começar minha jornada' : step === 4 ? 'Ver como funciona' : isTutorial ? 'Próximo' : 'Continuar'}
        </button>
        {step > 0 && step < 4 && (
          <button onClick={() => setStep(step - 1)} style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 14, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Voltar</button>
        )}
        {isTutorial && (
          <button onClick={() => { trackOnboardingSkipTutorial(step); const rendaObj = RENDAS.find(r => r.id === renda); onComplete({ name: name.trim(), income: rendaObj?.value || 0, dificuldade, dailyGoal }) }} style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 14, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Pular tutorial</button>
        )}
      </div>
    </div>
  )
}
