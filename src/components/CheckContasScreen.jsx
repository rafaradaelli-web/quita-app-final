import { useState } from 'react'
import { CheckCircle, Circle, ArrowLeft, Calendar, AlertTriangle } from 'lucide-react'

export default function CheckContasScreen({ state, setState, save, addXp, addCoins, onBack }) {
  const [showDone, setShowDone] = useState(false)

  // Get current week key (YYYY-Www)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
  const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(),0,1).getTime()) / 86400000 / 7)).padStart(2,'0')}`

  const billChecks = state.billChecks || {}
  const checkedThisWeek = billChecks[weekKey] || []

  // Build bills list from debts + recurring expenses
  const bills = []

  // From debts (monthly payments)
  ;(state.debts || []).forEach(d => {
    bills.push({
      id: `debt-${d.id}`,
      name: d.name || d.type || 'Dívida',
      amount: d.parcela || d.minPayment || 0,
      type: 'debt',
      icon: 'debt',
    })
  })

  // From recurring expenses (appear in last 2 months at least)
  const twoMonthsAgo = Date.now() - 60 * 86400000
  const recentExp = (state.expenses || []).filter(e => e.date > twoMonthsAgo && !e.oculto)
  const expByName = {}
  recentExp.forEach(e => {
    const key = e.name?.toLowerCase().trim()
    if (!key) return
    if (!expByName[key]) expByName[key] = { name: e.name, category: e.category, amounts: [], count: 0 }
    expByName[key].amounts.push(e.amount)
    expByName[key].count++
  })

  Object.values(expByName).forEach(e => {
    if (e.count >= 2) { // Appears at least 2x = recurring
      const avg = Math.round(e.amounts.reduce((a,b) => a+b, 0) / e.amounts.length)
      bills.push({
        id: `exp-${e.name.toLowerCase().replace(/\s/g,'-')}`,
        name: e.name,
        amount: avg,
        type: 'expense',
        category: e.category,
      })
    }
  })

  // Add fixed common bills if no data yet
  if (bills.length === 0) {
    const defaults = [
      { name: 'Aluguel', amount: 0 },
      { name: 'Energia', amount: 0 },
      { name: 'Internet', amount: 0 },
      { name: 'Água', amount: 0 },
      { name: 'Plano de celular', amount: 0 },
    ]
    defaults.forEach((d, i) => {
      bills.push({ id: `default-${i}`, name: d.name, amount: d.amount, type: 'default' })
    })
  }

  const isChecked = (id) => checkedThisWeek.includes(id)
  const allChecked = bills.every(b => isChecked(b.id))

  const toggleBill = (id) => {
    setState(prev => {
      const bc = { ...(prev.billChecks || {}) }
      const week = [...(bc[weekKey] || [])]
      if (week.includes(id)) {
        bc[weekKey] = week.filter(x => x !== id)
      } else {
        bc[weekKey] = [...week, id]
      }
      const n = { ...prev, billChecks: bc }
      save(n)
      return n
    })
  }

  const checkedCount = bills.filter(b => isChecked(b.id)).length
  const pct = bills.length > 0 ? Math.round(checkedCount / bills.length * 100) : 0

  // Reward when all checked (once per week)
  const rewardGiven = checkedThisWeek.includes('__reward__')
  if (allChecked && !rewardGiven && bills.length > 0) {
    setTimeout(() => {
      addXp(30, 'Contas conferidas!')
      addCoins(10)
      setState(prev => {
        const bc = { ...(prev.billChecks || {}) }
        bc[weekKey] = [...(bc[weekKey] || []), '__reward__']
        const n = { ...prev, billChecks: bc }
        save(n)
        return n
      })
      setShowDone(true)
    }, 300)
  }

  return (
    <div style={{ background:'#F0EDF8', minHeight:'100vh', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)', padding:'16px 20px 24px', borderRadius:'0 0 28px 28px', boxShadow:'0 8px 32px rgba(30,10,60,0.4)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:12, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:600, letterSpacing:1 }}>SEGUNDA-FEIRA</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>Check de Contas</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, background:'rgba(255,255,255,0.15)', borderRadius:8, height:6 }}>
            <div style={{ background:'#22C55E', borderRadius:8, height:'100%', width:`${pct}%`, transition:'width 0.5s' }} />
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>{checkedCount}/{bills.length}</span>
        </div>
      </div>

      {/* Info card */}
      <div style={{ margin:'16px 16px 8px', padding:'14px 16px', borderRadius:16, background:'rgba(255,255,255,0.95)', border:'1px solid rgba(109,40,217,0.08)', display:'flex', alignItems:'center', gap:12 }}>
        <Calendar size={20} color="#7C3AED" />
        <div style={{ fontSize:13, color:'#555', lineHeight:1.4 }}>
          Confira suas contas da semana. Marque como <strong>pago</strong> ou deixe pendente.
        </div>
      </div>

      {/* Bills list */}
      <div style={{ padding:'8px 16px 100px' }}>
        {bills.map(bill => {
          const checked = isChecked(bill.id)
          return (
            <div key={bill.id} onClick={() => toggleBill(bill.id)} style={{
              display:'flex', alignItems:'center', gap:14, padding:'16px', marginBottom:8,
              borderRadius:16, cursor:'pointer', transition:'all 0.2s',
              background: checked ? '#F0FDF4' : 'rgba(255,255,255,0.95)',
              border: checked ? '1.5px solid #BBF7D0' : '1.5px solid rgba(0,0,0,0.04)',
              boxShadow: checked ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              {checked
                ? <CheckCircle size={24} color="#16A34A" />
                : <Circle size={24} color="#D4D4D8" />
              }
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, color: checked ? '#16A34A' : '#333', textDecoration: checked ? 'line-through' : 'none' }}>
                  {bill.name}
                </div>
                {bill.category && <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{bill.category}</div>}
              </div>
              {bill.amount > 0 && (
                <div style={{ fontSize:14, fontWeight:700, color: checked ? '#16A34A' : '#7C3AED' }}>
                  R$ {bill.amount.toFixed(2)}
                </div>
              )}
            </div>
          )
        })}

        {/* Empty state */}
        {bills.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#999' }}>
            <AlertTriangle size={32} color="#D4D4D8" style={{ margin:'0 auto 12px' }} />
            <div style={{ fontSize:14, fontWeight:600 }}>Nenhuma conta encontrada</div>
            <div style={{ fontSize:12, marginTop:4 }}>Cadastre dívidas e gastos para ver suas contas aqui.</div>
          </div>
        )}
      </div>

      {/* Done overlay */}
      {showDone && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,10,46,0.8)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}
          onClick={() => { setShowDone(false); onBack(); }}>
          <div style={{ background:'#fff', borderRadius:24, padding:'32px 24px', textAlign:'center', maxWidth:320, margin:16 }}>
            <img src="/models/quita-celebrate.png" alt="" style={{ width:100, height:100, objectFit:'contain', margin:'0 auto 12px', display:'block' }} />
            <div style={{ fontSize:22, fontWeight:800, color:'#16A34A' }}>Tudo conferido!</div>
            <div style={{ fontSize:13, color:'#777', marginTop:6, lineHeight:1.5 }}>Suas contas da semana estão em dia. +30 XP</div>
            <button onClick={() => { setShowDone(false); onBack(); }} style={{
              marginTop:16, background:'linear-gradient(135deg,#16A34A,#22C55E)', color:'#fff',
              border:'none', borderRadius:14, padding:'12px 32px', fontSize:15, fontWeight:700, cursor:'pointer',
            }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
