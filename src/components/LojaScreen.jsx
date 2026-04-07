import { useState } from 'react'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { trackShopPurchase, trackShopEquip, trackShopTabChanged, trackShopOpened } from '../services/analytics'

const SKINS = [
  { id: 'quita-real', name: 'Quita Original', desc: 'A porquinha clássica', price: 0, preview: '/models/quita-original-preview.png', glb: '/models/quita-real.glb', color: '#7C3AED' },
  { id: 'quita-praia', name: 'Quita Praia', desc: 'Modo férias ativado', price: 150, preview: '/models/quita-praia-preview.png', glb: '/models/quita-praia.glb', color: '#06B6D4' },
  { id: 'quita-praia-f', name: 'Quita Praia ♀', desc: 'Férias com estilo', price: 150, preview: '/models/quita-praia-f-preview.png', glb: '/models/quita-praia-f.glb', color: '#06B6D4' },
  { id: 'quita-natal', name: 'Quita Natal', desc: 'Ho ho ho financeiro', price: 200, preview: '/models/quita-natal-preview.png', glb: '/models/quita-natal.glb', color: '#EF4444' },
  { id: 'quita-natal-f', name: 'Quita Natal ♀', desc: 'Noel fashionista', price: 200, preview: '/models/quita-natal-f-preview.png', glb: '/models/quita-natal-f.glb', color: '#EF4444' },
  { id: 'quita-gamer', name: 'Quita Gamer', desc: 'Level up nas finanças', price: 250, preview: '/models/quita-gamer-preview.png', glb: '/models/quita-gamer.glb', color: '#7C3AED' },
  { id: 'quita-gamer-f', name: 'Quita Gamer ♀', desc: 'Player 2 entrou', price: 250, preview: '/models/quita-gamer-f-preview.png', glb: '/models/quita-gamer-f.glb', color: '#7C3AED' },
]

const BACKGROUNDS = [
  { id: 'padrao', name: 'Padrão', desc: 'Fundo roxo clássico', price: 0, colors: ['#1A0A2E','#3B1578','#6D28D9'] },
  { id: 'praia', name: 'Pôr do Sol', desc: 'Praia tropical ao entardecer', price: 100, colors: ['#FF6B35','#87CEEB','#0E7490'] },
  { id: 'gamer', name: 'Neon Gamer', desc: 'Luzes neon e clima noturno', price: 120, colors: ['#0F0326','#4C1D95','#7C3AED'] },
  { id: 'escritorio', name: 'Aconchego', desc: 'Ambiente quente e acolhedor', price: 100, colors: ['#FEF3C7','#D4A574','#451A03'] },
  { id: 'natal', name: 'Noite Estrelada', desc: 'Céu azul de inverno', price: 120, colors: ['#1E3A5F','#2563EB','#0F172A'] },
]

export default function LojaScreen({ state, setState, save, loadModel, setBackground, onBack, NavBar }) {
  const [selected, setSelected] = useState(null) // {type:'skin'|'bg', item}
  const [tab, setTab] = useState('skins')
  const coins = state.coins || 0
  const ownedSkins = state.ownedSkins || ['quita-real']
  const equippedSkin = state.equippedSkin || 'quita-real'
  const ownedBgs = state.ownedBackgrounds || ['padrao']
  const equippedBg = state.equippedBackground || 'padrao'

  const buyItem = (type, item) => {
    if (coins < item.price) return
    trackShopPurchase(type, item.id, item.price, coins - item.price)
    setState(prev => {
      const n = { ...prev, coins: (prev.coins || 0) - item.price }
      if (type === 'skin') n.ownedSkins = [...(prev.ownedSkins || ['quita-real']), item.id]
      else n.ownedBackgrounds = [...(prev.ownedBackgrounds || ['padrao']), item.id]
      save(n); return n
    })
  }

  const equipItem = (type, item) => {
    trackShopEquip(type, item.id)
    setState(prev => {
      const n = { ...prev }
      if (type === 'skin') n.equippedSkin = item.id
      else n.equippedBackground = item.id
      save(n); return n
    })
    // Call 3D functions outside setState
    if (type === 'skin' && loadModel) loadModel(item.glb)
    if (type === 'bg' && setBackground) setBackground(item.id)
  }

  const isOwned = (type, id) => (type === 'skin' ? ownedSkins : ownedBgs).includes(id)
  const isEquipped = (type, id) => type === 'skin' ? equippedSkin === id : equippedBg === id

  return (
    <div style={{ background: '#F0EDF8', minHeight: '100vh', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)', padding: 'calc(var(--sat, 0px) + 16px) 20px 20px', borderRadius: '0 0 28px 28px', boxShadow: '0 8px 32px rgba(30,10,60,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1, fontSize: 20, fontWeight: 800, color: '#fff' }}>Loja</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '6px 14px' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E' }}>$</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FBBF24' }}>{coins}</span>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 3 }}>
          {[{ id: 'skins', label: 'Skins' }, { id: 'fundos', label: 'Fundos' }, { id: 'itens', label: 'Itens' }].map(t => (
            <button key={t.id} onClick={() => { trackShopTabChanged(t.id); setTab(t.id) }} style={{
              flex: 1, padding: 8, borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
              background: tab === t.id ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {/* ── Skins ── */}
        {tab === 'skins' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {SKINS.map(skin => {
              const owned = isOwned('skin', skin.id), eq = isEquipped('skin', skin.id), canBuy = coins >= skin.price
              return (
                <div key={skin.id} onClick={() => setSelected({ type: 'skin', item: skin })} style={{
                  background: '#fff', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
                  border: eq ? '2.5px solid #7C3AED' : '1.5px solid rgba(0,0,0,0.06)',
                  boxShadow: eq ? '0 4px 16px rgba(124,58,237,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ height: 150, background: `linear-gradient(135deg,${skin.color}12,${skin.color}06)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <img src={skin.preview} alt={skin.name} style={{ height: 130, objectFit: 'contain', filter: !owned && skin.price > 0 ? 'brightness(0.7)' : 'none' }} />
                    {eq && <div style={{ position: 'absolute', top: 8, right: 8, background: '#7C3AED', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}><Check size={10} color="#fff" /><span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>Usando</span></div>}
                    {!owned && <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '3px 8px' }}><Lock size={10} color="#fff" /></div>}
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0A2E' }}>{skin.name}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{skin.desc}</div>
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      {eq ? <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>Equipada</span>
                        : owned ? <span style={{ fontSize: 11, fontWeight: 600, color: '#22C55E' }}>Desbloqueada</span>
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, fontWeight: 800, color: '#92400E' }}>$</span></div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: canBuy ? '#F59E0B' : '#CCC' }}>{skin.price}</span>
                          </div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Fundos ── */}
        {tab === 'fundos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {BACKGROUNDS.map(bg => {
              const owned = isOwned('bg', bg.id), eq = isEquipped('bg', bg.id), canBuy = coins >= bg.price
              return (
                <div key={bg.id} onClick={() => setSelected({ type: 'bg', item: bg })} style={{
                  background: '#fff', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
                  border: eq ? '2.5px solid #7C3AED' : '1.5px solid rgba(0,0,0,0.06)',
                  boxShadow: eq ? '0 4px 16px rgba(124,58,237,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ height: 100, background: `linear-gradient(135deg,${bg.colors[0]},${bg.colors[1]},${bg.colors[2]})`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Mini circle preview */}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)' }} />
                    {eq && <div style={{ position: 'absolute', top: 8, right: 8, background: '#7C3AED', borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}><Check size={10} color="#fff" /><span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>Usando</span></div>}
                    {!owned && <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '3px 8px' }}><Lock size={10} color="#fff" /></div>}
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0A2E' }}>{bg.name}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{bg.desc}</div>
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      {eq ? <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>Equipado</span>
                        : owned ? <span style={{ fontSize: 11, fontWeight: 600, color: '#22C55E' }}>Desbloqueado</span>
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, fontWeight: 800, color: '#92400E' }}>$</span></div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: canBuy ? '#F59E0B' : '#CCC' }}>{bg.price}</span>
                          </div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Itens ── */}
        {tab === 'itens' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#DBEAFE,#93C5FD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧊</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A0A2E' }}>Streak Freeze</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2, lineHeight: 1.4 }}>Protege seu streak por 1 dia se você não completar uma lição</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '10px 14px', background: '#F8F7FE', borderRadius: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>Você tem</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{state.streakFreezes || 0} <span style={{ fontSize: 12, fontWeight: 500, color: '#999' }}>unidades</span></div>
                </div>
                <button onClick={() => {
                  if (coins < 50) return
                  setState(prev => {
                    const n = { ...prev, streakFreezes: (prev.streakFreezes || 0) + 1, coins: prev.coins - 50 }
                    save(n)
                    return n
                  })
                }} style={{
                  padding: '10px 20px', borderRadius: 12, border: 'none', cursor: coins >= 50 ? 'pointer' : 'default',
                  background: coins >= 50 ? 'linear-gradient(135deg,#3B82F6,#2563EB)' : '#E5E5E5',
                  color: coins >= 50 ? '#fff' : '#999', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: coins >= 50 ? 'rgba(255,255,255,0.3)' : '#CCC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800 }}>$</span>
                  </div>
                  50
                </button>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>Como funciona?</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7 }}>
                Seu streak conta apenas quando você <span style={{ fontWeight: 700, color: '#7C3AED' }}>completa pelo menos 1 lição por dia</span>.
                Se você não completar nenhuma lição, o streak reseta no dia seguinte.
                Com o Streak Freeze, você ganha 1 dia de proteção — o freeze é consumido automaticamente.
                Acumule até quantos quiser!
              </div>
            </div>
          </div>
        )}
      </div>

      {NavBar && <NavBar />}

      {/* ── Detail modal ── */}
      {selected && (() => {
        const { type, item } = selected
        const owned = isOwned(type, item.id), eq = isEquipped(type, item.id), canBuy = coins >= item.price
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,10,46,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setSelected(null)}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 20px 36px' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, background: '#E5E5E5', borderRadius: 2, margin: '0 auto 20px' }} />
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {type === 'skin' ? (
                  <div style={{ width: 180, height: 180, margin: '0 auto 16px', background: `linear-gradient(135deg,${item.color}12,${item.color}06)`, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={item.preview} alt={item.name} style={{ height: 160, objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 120, margin: '0 auto 16px', background: `linear-gradient(135deg,${item.colors[0]},${item.colors[1]},${item.colors[2]})`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)' }} />
                  </div>
                )}
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1A0A2E' }}>{item.name}</div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{item.desc}</div>
              </div>

              {eq ? (
                <div style={{ padding: 14, borderRadius: 16, background: '#F5F3FF', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#7C3AED' }}>{type === 'skin' ? 'Skin equipada' : 'Fundo equipado'}</div>
                </div>
              ) : owned || item.price === 0 ? (
                <button onClick={() => { equipItem(type, item); setSelected(null) }} style={{
                  width: '100%', padding: 15, borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)', color: '#fff',
                  fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(30,10,60,0.35)',
                }}>Equipar</button>
              ) : (
                <button onClick={() => { if (canBuy) buyItem(type, item) }} disabled={!canBuy} style={{
                  width: '100%', padding: 15, borderRadius: 16, border: 'none',
                  cursor: canBuy ? 'pointer' : 'default',
                  background: canBuy ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : '#E5E5E5',
                  color: canBuy ? '#92400E' : '#999', fontSize: 16, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: canBuy ? 'rgba(146,64,14,0.15)' : 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>$</span>
                  </div>
                  {canBuy ? `Comprar por ${item.price} moedas` : `Moedas insuficientes (${coins}/${item.price})`}
                </button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
