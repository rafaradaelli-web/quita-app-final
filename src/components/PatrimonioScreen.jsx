import { useState } from 'react'

const BENS_IDS = ['veiculos', 'imoveis']

const INVEST_CLASSES = [
  { id: 'poupanca', label: 'Poupança', color: '#F59E0B', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'renda_fixa', label: 'Renda Fixa', desc: 'CDB, LCI, LCA, Tesouro', color: '#3B82F6', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'acoes_br', label: 'Ações BR', color: '#22C55E', icon: 'M23 6l-9.5 9.5-5-5L1 18' },
  { id: 'fiis', label: 'FIIs', desc: 'Fundos Imobiliários', color: '#8B5CF6', icon: 'M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7H3l2-4h14l2 4M5 21V10.7' },
  { id: 'acoes_int', label: 'Ações Internacionais', color: '#06B6D4', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z' },
  { id: 'cripto', label: 'Criptomoedas', color: '#F97316', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { id: 'previdencia', label: 'Previdência Privada', color: '#EC4899', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { id: 'outros', label: 'Outros', color: '#6B7280', icon: 'M4 6h16M4 12h16M4 18h16' },
]

const BENS_CLASSES = [
  { id: 'veiculos', label: 'Veículos', desc: 'Carros, motos', color: '#14B8A6', icon: 'M5 17h14M7 17V7a2 2 0 012-2h6a2 2 0 012 2v10M5 17a2 2 0 01-2-2v-2l2-4h14l2 4v2a2 2 0 01-2 2M7 13h.01M17 13h.01' },
  { id: 'imoveis', label: 'Imóveis', desc: 'Casas, apartamentos, terrenos', color: '#D946EF', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4h4v4a1 1 0 001 1h3a1 1 0 001-1V10' },
]

const ALL_CLASSES = [...INVEST_CLASSES, ...BENS_CLASSES]

export default function PatrimonioScreen({ state, setState, save, FinTabs }) {
  const patrimonio = state.patrimonio || { reserva: 0, investimentos: {} }
  const [editingReserva, setEditingReserva] = useState(false)
  const [reservaInput, setReservaInput] = useState(String(patrimonio.reserva || ''))
  const [editingClass, setEditingClass] = useState(null)
  const [classInput, setClassInput] = useState('')

  const bensFinalidade = patrimonio.bensFinalidade || {}

  const inv = patrimonio.investimentos || {}
  const totalInvest = Object.entries(inv).filter(([k]) => !BENS_IDS.includes(k)).reduce((s, [_, v]) => s + (v || 0), 0)
  const totalBens = Object.entries(inv).filter(([k]) => BENS_IDS.includes(k)).reduce((s, [_, v]) => s + (v || 0), 0)
  const totalPatrimonio = (patrimonio.reserva || 0) + totalInvest + totalBens

  const parseBR = (str) => {
    const clean = str.replace(/[^\d,.]/g, '')
    // Brazilian format: 1.000,50 → 1000.50
    if (clean.includes(',')) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0
    }
    // Plain number or decimal with dot
    return parseFloat(clean) || 0
  }

  const saveReserva = () => {
    const val = parseBR(reservaInput)
    setState(prev => {
      const n = { ...prev, noPatrimonio: false, patrimonio: { ...prev.patrimonio || {}, reserva: val, investimentos: prev.patrimonio?.investimentos || {} } }
      save(n); return n
    })
    setEditingReserva(false)
  }

  const saveClass = (classId) => {
    const val = parseBR(classInput)
    setState(prev => {
      const inv = { ...(prev.patrimonio?.investimentos || {}), [classId]: val }
      if (val === 0) delete inv[classId]
      const n = { ...prev, noPatrimonio: false, patrimonio: { reserva: prev.patrimonio?.reserva || 0, investimentos: inv } }
      save(n); return n
    })
    setEditingClass(null)
    setClassInput('')
  }

  const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(160deg, #1E0A3C 0%, #3B1578 35%, #6D28D9 100%)', color: '#fff', padding: '20px 20px 24px', paddingTop: 'calc(20px + var(--sat, 0px))', borderRadius: '0 0 28px 28px', boxShadow: '0 8px 32px rgba(30,10,60,0.4)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>Patrimônio total</div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>{fmt(totalPatrimonio)}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div><div style={{ fontSize: 10, opacity: 0.5 }}>Reserva</div><div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(patrimonio.reserva)}</div></div>
          <div><div style={{ fontSize: 10, opacity: 0.5 }}>Investimentos</div><div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(totalInvest)}</div></div>
          {totalBens > 0 && <div><div style={{ fontSize: 10, opacity: 0.5 }}>Bens</div><div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(totalBens)}</div></div>}
        </div>
        {FinTabs && <FinTabs />}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '16px 16px 100px' }}>

      {/* Reserva de Emergência */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Reserva de Emergência</div>
      <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {editingReserva ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>R$</span>
            <input value={reservaInput} onChange={e => setReservaInput(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveReserva()}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #7C3AED', fontSize: 16, fontWeight: 600, outline: 'none', color: '#333' }} />
            <button onClick={saveReserva} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Salvar</button>
          </div>
        ) : (
          <div onClick={() => { setReservaInput(String(patrimonio.reserva || '')); setEditingReserva(true) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>{fmt(patrimonio.reserva)}</div>
              {state.income > 0 && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{((patrimonio.reserva || 0) / state.income).toFixed(1)}x sua renda mensal</div>}
            </div>
            <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>Editar</div>
          </div>
        )}
      </div>

      {/* Investimentos por classe */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Investimentos</div>

      {/* Allocation bar - apenas investimentos */}
      {totalInvest > 0 && (
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 10, marginBottom: 12 }}>
          {INVEST_CLASSES.filter(c => (patrimonio.investimentos?.[c.id] || 0) > 0).map(c => (
            <div key={c.id} style={{ flex: patrimonio.investimentos[c.id], background: c.color, transition: 'flex 0.3s' }} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {INVEST_CLASSES.map(c => {
          const val = patrimonio.investimentos?.[c.id] || 0
          const pct = totalInvest > 0 ? ((val / totalInvest) * 100).toFixed(1) : 0
          const isEditing = editingClass === c.id
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: val > 0 ? `1.5px solid ${c.color}20` : '1.5px solid transparent' }}>
              {isEditing ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{c.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>R$</span>
                    <input value={classInput} onChange={e => setClassInput(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveClass(c.id)}
                      placeholder="0" style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${c.color}`, fontSize: 14, fontWeight: 600, outline: 'none', color: '#333' }} />
                    <button onClick={() => saveClass(c.id)} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: c.color, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                    <button onClick={() => setEditingClass(null)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #E5E5E5', background: 'transparent', color: '#999', fontSize: 12, cursor: 'pointer' }}>X</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => { setEditingClass(c.id); setClassInput(val > 0 ? String(val) : '') }} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${c.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{c.label}</div>
                    {c.desc && <div style={{ fontSize: 10, color: '#BBB' }}>{c.desc}</div>}
                  </div>
                  {val > 0 ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{fmt(val)}</div>
                      <div style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>{pct}%</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#CCC' }}>+ Adicionar</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bens (baixa liquidez) */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 4 }}>Bens</div>
      <div style={{ fontSize: 10, color: '#BBB', marginBottom: 8 }}>Baixa liquidez — não contam como reserva de emergência</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {BENS_CLASSES.map(c => {
          const val = patrimonio.investimentos?.[c.id] || 0
          const isEditing = editingClass === c.id
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: val > 0 ? `1.5px solid ${c.color}20` : '1.5px solid transparent' }}>
              {isEditing ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{c.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>R$</span>
                    <input value={classInput} onChange={e => setClassInput(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveClass(c.id)}
                      placeholder="0" style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${c.color}`, fontSize: 14, fontWeight: 600, outline: 'none', color: '#333' }} />
                    <button onClick={() => saveClass(c.id)} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: c.color, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                    <button onClick={() => setEditingClass(null)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #E5E5E5', background: 'transparent', color: '#999', fontSize: 12, cursor: 'pointer' }}>X</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => { setEditingClass(c.id); setClassInput(val > 0 ? String(val) : '') }} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${c.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{c.label}</div>
                    {c.desc && <div style={{ fontSize: 10, color: '#BBB' }}>{c.desc}</div>}
                  </div>
                  {val > 0 ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{fmt(val)}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#CCC' }}>+ Adicionar</div>
                  )}
                </div>
              )}
              {/* Toggle de finalidade quando tem valor */}
              {val > 0 && !isEditing && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, background: '#F5F3FF', borderRadius: 8, padding: 3 }}>
                  {[
                    { id: 'proprio', label: 'Uso próprio' },
                    { id: 'investimento', label: 'Gera renda' },
                  ].map(opt => {
                    const selected = (bensFinalidade[c.id] || 'proprio') === opt.id
                    return (
                      <button key={opt.id} onClick={(e) => {
                        e.stopPropagation()
                        setState(prev => {
                          const p = { ...(prev.patrimonio || {}), bensFinalidade: { ...(prev.patrimonio?.bensFinalidade || {}), [c.id]: opt.id } }
                          const n = { ...prev, patrimonio: p }; save(n); return n
                        })
                      }} style={{
                        flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: selected ? 700 : 500,
                        background: selected ? '#7C3AED' : 'transparent', color: selected ? '#fff' : '#999', cursor: 'pointer', transition: 'all 0.2s'
                      }}>{opt.label}</button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Opção sem patrimônio */}
      {totalPatrimonio === 0 && (
        <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 20 }}>
          {!state.noPatrimonio ? (
            <button onClick={() => {
              setState(prev => { const n = { ...prev, noPatrimonio: true }; save(n); return n })
            }} style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #3B82F6', background: 'rgba(59,130,246,0.06)', color: '#3B82F6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: 6 }}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Ainda não tenho reserva nem investimentos
            </button>
          ) : (
            <div style={{ padding: '10px 16px', borderRadius: 12, background: '#DBEAFE', color: '#2563EB', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Informação registrada — a Quita vai te ajudar a começar!
            </div>
          )}
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
