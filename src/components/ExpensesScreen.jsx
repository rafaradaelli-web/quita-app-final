import { useState, useEffect } from 'react'
import { CATEGORIES, T } from '../services/gameConfig'
import * as XLSX from 'xlsx'

export default function ExpensesScreen({ state, styles, handlers, filters, FinTabs }) {
  var ph=styles.ph, card=styles.card, btn=styles.btn, btnOut=styles.btnOut, input=styles.input;
  var NavBar=styles.NavBar;
  var updateExpenseCategory=handlers.updateExpenseCategory, deleteExpense=handlers.deleteExpense, clearAllExpenses=handlers.clearAllExpenses;
  var handleExcelUpload=handlers.handleExcelUpload, handlePdfUpload=handlers.handlePdfUpload;
  var handleDetailFatura=handlers.handleDetailFatura, confirmPdfImport=handlers.confirmPdfImport;
  var togglePdfItem=handlers.togglePdfItem, updatePdfItemCategory=handlers.updatePdfItemCategory;
  var addExpense=handlers.addExpense;
  var toggleOcultar=handlers.toggleOcultar;
  var saveBudgets=handlers.saveBudgets; // novo handler
  var monthFilter=filters.monthFilter, setMonthFilter=filters.setMonthFilter;
  var catFilters=filters.catFilters, setCatFilters=filters.setCatFilters;
  var customRange=filters.customRange, setCustomRange=filters.setCustomRange;
  var showCustomRange=filters.showCustomRange, setShowCustomRange=filters.setShowCustomRange;
  var importStep=filters.importStep, setImportStep=filters.setImportStep;
  var pdfParsing=filters.pdfParsing, pdfPreview=filters.pdfPreview, setPdfPreview=filters.setPdfPreview;
  var showExpenseForm=filters.showExpenseForm, setShowExpenseForm=filters.setShowExpenseForm;
  var expName=filters.expName, setExpName=filters.setExpName;
  var expAmount=filters.expAmount, setExpAmount=filters.setExpAmount;
  var expCat=filters.expCat, setExpCat=filters.setExpCat;
  var expDate=filters.expDate, setExpDate=filters.setExpDate;
  var totalExpenses=filters.totalExpenses, rendaTotal=filters.rendaTotal;
  var filterByMonth=filters.filterByMonth;
  const [view, setView] = useState("dashboard");
  const [registerOpen, setRegisterOpen] = useState(false);

  // ── ORÇAMENTO ──
  // budgets salvo em state.budgets = { Moradia: 1500, Alimentação: 800, ... }
  const budgets = state.budgets || {};
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState({});

  const openBudgetEdit = () => {
    setBudgetDraft({ ...budgets });
    setEditingBudgets(true);
  };

  const saveBudgetDraft = () => {
    // Limpa zeros e valores inválidos
    const cleaned = {};
    Object.entries(budgetDraft).forEach(([cat, val]) => {
      const n = parseFloat(String(val).replace(',', '.'));
      if (n > 0) cleaned[cat] = n;
    });
    if (saveBudgets) saveBudgets(cleaned);
    setEditingBudgets(false);
  };

  // Média histórica por categoria (todos os meses disponíveis)
  const allExpenses = (state.expenses || []).filter(e => !e.oculto);
  const allMonthsSet = [...new Set(allExpenses.map(e => {
    const d = new Date(e.date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }))];
  const monthCount = Math.max(allMonthsSet.length, 1);

  const historicalAvg = (cat) => {
    const total = allExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return Math.round(total / monthCount);
  };

  const months = [...new Set(state.expenses.filter(e => !e.oculto).map(e => { const d = new Date(e.date); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }))].sort().reverse();

  useEffect(() => {
    if (monthFilter === "all" && months.length > 0) {
      setMonthFilter(months[0]);
    }
  }, []);

  const monthLabel = (m) => { if (m === "all") return "Todos"; if (m === "custom") return "Personalizado"; const [y, mo] = m.split("-"); const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]; return names[parseInt(mo) - 1] + " " + y; };
  const COLORS = ["#7B2FF2","#22C55E","#EF4444","#F59E0B","#3B82F6","#EC4899","#14B8A6","#F97316","#8B5CF6","#06B6D4","#84CC16","#E11D48","#6366F1","#999"];
  const expByMonthAll = state.expenses.filter(filterByMonth);
  const expByMonth = expByMonthAll.filter(e => !e.oculto);
  const catData = CATEGORIES.map((cat, i) => {
    const total = expByMonth.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return { cat, total, color: COLORS[i % COLORS.length], count: expByMonth.filter(e => e.category === cat).length };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const grandTotal = catData.reduce((s, c) => s + c.total, 0);
  const displayExpenses = expByMonth.filter(e => catFilters.length === 0 || catFilters.includes(e.category));
  const allMonths = [...new Set(state.expenses.filter(e => !e.oculto).map(e => { const d = new Date(e.date); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }))].sort();
  const monthlyTotals = allMonths.map(m => {
    const t = state.expenses.filter(e => !e.oculto && (function(){ const d = new Date(e.date); return (d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")) === m; })()).reduce((s, e) => s + e.amount, 0);
    return { month: m, total: t, label: monthLabel(m) };
  });
  const maxMonthly = Math.max(...monthlyTotals.map(m => m.total), 1);
  const toggleCatFilter = (cat) => { setCatFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]); };

  // Cor da barra de orçamento
  const budgetBarColor = (pct) => {
    if (pct >= 1) return '#EF4444';    // vermelho
    if (pct >= 0.8) return '#F59E0B';  // amarelo
    return '#22C55E';                   // verde
  };

  const DonutChart = () => {
    if (catData.length === 0) return null;
    const cx = 100, cy = 100, r = 75, r2 = 48; let acc = 0;
    const slices = catData.map(c => {
      const pct = c.total / grandTotal; const start = acc; acc += pct;
      const a1 = start * Math.PI * 2 - Math.PI / 2; const a2 = acc * Math.PI * 2 - Math.PI / 2;
      const large = pct > 0.5 ? 1 : 0;
      const x1o = cx + r * Math.cos(a1), y1o = cy + r * Math.sin(a1);
      const x2o = cx + r * Math.cos(a2), y2o = cy + r * Math.sin(a2);
      const x1i = cx + r2 * Math.cos(a2), y1i = cy + r2 * Math.sin(a2);
      const x2i = cx + r2 * Math.cos(a1), y2i = cy + r2 * Math.sin(a1);
      const d = `M${x1o},${y1o} A${r},${r} 0 ${large} 1 ${x2o},${y2o} L${x1i},${y1i} A${r2},${r2} 0 ${large} 0 ${x2i},${y2i} Z`;
      return { ...c, d, pct, isActive: catFilters.length === 0 || catFilters.includes(c.cat) };
    });
    const selectedTotal = catFilters.length > 0 ? catData.filter(c => catFilters.includes(c.cat)).reduce((s, c) => s + c.total, 0) : grandTotal;
    const centerLabel = catFilters.length === 1 ? catFilters[0] : catFilters.length > 1 ? catFilters.length + " categ." : "Total";
    return (
      <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 220, margin: "0 auto", display: "block" }}>
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth="2.5" style={{ cursor: "pointer", opacity: s.isActive ? 1 : 0.2, transition: "opacity 0.25s" }} onClick={() => toggleCatFilter(s.cat)} />)}
        <text x={cx} y={cy - 10} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: "#888" }}>{centerLabel}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 16, fontWeight: 700, fill: "#333" }}>R$ {selectedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</text>
      </svg>
    );
  };

  // ── VIEW ORÇAMENTO ──
  const BudgetView = () => {
    const catBudgetData = CATEGORIES.map((cat, i) => {
      const spent = expByMonth.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      const limit = budgets[cat] || 0;
      const pct = limit > 0 ? spent / limit : 0;
      const avg = historicalAvg(cat);
      return { cat, spent, limit, pct, avg, color: COLORS[i % COLORS.length] };
    });

    const configured = catBudgetData.filter(c => c.limit > 0);
    const unconfigured = catBudgetData.filter(c => c.limit === 0 && c.spent > 0);
    const alerts = configured.filter(c => c.pct >= 0.8);
    const totalLimit = configured.reduce((s, c) => s + c.limit, 0);
    const totalSpent = configured.reduce((s, c) => s + c.spent, 0);

    if (editingBudgets) {
      return (
        <div style={card}>
          <div style={{ fontSize: T.body, fontWeight: T.bold, color: T.ink, marginBottom: 4 }}>Definir orçamento</div>
          <div style={{ fontSize: T.caption, color: T.secondary, marginBottom: 16 }}>
            Deixe em branco para não monitorar. A sugestão é baseada na sua média histórica.
          </div>
          {CATEGORIES.map((cat, i) => {
            const avg = historicalAvg(cat);
            return (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: T.sub, fontWeight: T.semi, color: T.ink }}>{cat}</span>
                  </div>
                  {avg > 0 && (
                    <button
                      onClick={() => setBudgetDraft(p => ({ ...p, [cat]: avg }))}
                      style={{ fontSize: T.micro, color: T.accent, background: "#EDE9FE", border: "none", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontWeight: T.semi }}
                    >
                      Sugerir R$ {avg.toLocaleString('pt-BR')}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00 (sem limite)"
                  value={budgetDraft[cat] || ''}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9.,]/g, '');
                    setBudgetDraft(p => ({ ...p, [cat]: v }));
                  }}
                  style={{ ...input, marginBottom: 0 }}
                />
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={{ ...btn, flex: 1 }} onClick={saveBudgetDraft}>Salvar</button>
            <button style={{ ...btnOut, flex: 1 }} onClick={() => setEditingBudgets(false)}>Cancelar</button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Alertas */}
        {alerts.length > 0 && (
          <div style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", borderRadius: 14, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: T.sub, fontWeight: T.bold, color: "#92400E", marginBottom: 2 }}>
                {alerts.length === 1 ? '1 categoria no limite' : `${alerts.length} categorias no limite`}
              </div>
              <div style={{ fontSize: T.caption, color: "#B45309" }}>
                {alerts.map(a => `${a.cat} (${Math.round(a.pct * 100)}%)`).join(' · ')}
              </div>
            </div>
          </div>
        )}

        {/* Resumo geral */}
        {configured.length > 0 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: T.sub, fontWeight: T.bold, color: T.ink, marginBottom: 10 }}>Resumo do orçamento</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: T.caption, color: T.secondary }}>Total planejado</span>
              <span style={{ fontSize: T.sub, fontWeight: T.bold, color: T.ink }}>R$ {totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: T.caption, color: T.secondary }}>Total gasto</span>
              <span style={{ fontSize: T.sub, fontWeight: T.bold, color: totalSpent > totalLimit ? T.danger : T.ink }}>
                R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
            {/* Barra geral */}
            {(() => {
              const pctGeral = totalLimit > 0 ? Math.min(totalSpent / totalLimit, 1) : 0;
              return (
                <div style={{ background: "#F3F4F6", borderRadius: 8, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(pctGeral * 100, 100)}%`, height: "100%", background: budgetBarColor(totalSpent / totalLimit), borderRadius: 8, transition: "width 0.4s" }} />
                </div>
              );
            })()}
            {totalLimit > 0 && (
              <div style={{ fontSize: T.caption, color: T.muted, marginTop: 5, textAlign: "right" }}>
                {Math.round((totalSpent / totalLimit) * 100)}% do planejado
              </div>
            )}
          </div>
        )}

        {/* Categorias com orçamento */}
        {configured.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: T.sub, fontWeight: T.bold, color: T.ink, marginBottom: 12 }}>Por categoria</div>
            {configured.map(c => {
              const pctClamped = Math.min(c.pct, 1);
              const isAlert = c.pct >= 0.8;
              const isOver = c.pct >= 1;
              return (
                <div key={c.cat} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: T.sub, fontWeight: T.semi, color: T.ink }}>{c.cat}</span>
                      {isOver && <span style={{ fontSize: T.micro, background: "#FEE2E2", color: T.danger, borderRadius: 6, padding: "2px 6px", fontWeight: T.bold }}>ESTOURADO</span>}
                      {isAlert && !isOver && <span style={{ fontSize: T.micro, background: "#FEF3C7", color: T.warning, borderRadius: 6, padding: "2px 6px", fontWeight: T.bold }}>ATENÇÃO</span>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: T.sub, fontWeight: T.bold, color: isOver ? T.danger : T.ink }}>
                        R$ {c.spent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </span>
                      <span style={{ fontSize: T.caption, color: T.muted }}> / R$ {c.limit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                  <div style={{ background: "#F3F4F6", borderRadius: 8, height: 8, overflow: "hidden" }}>
                    <div style={{
                      width: `${pctClamped * 100}%`,
                      height: "100%",
                      background: budgetBarColor(c.pct),
                      borderRadius: 8,
                      transition: "width 0.4s",
                      boxShadow: isAlert ? `0 0 6px ${budgetBarColor(c.pct)}88` : "none"
                    }} />
                  </div>
                  <div style={{ fontSize: T.caption, color: T.muted, marginTop: 4, textAlign: "right" }}>
                    {Math.round(c.pct * 100)}% · sobra R$ {Math.max(c.limit - c.spent, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Categorias sem orçamento mas com gastos */}
        {unconfigured.length > 0 && (
          <div style={{ ...card, background: "#FAFAFA" }}>
            <div style={{ fontSize: T.caption, fontWeight: T.semi, color: T.muted, marginBottom: 8 }}>Sem orçamento definido</div>
            {unconfigured.map(c => (
              <div key={c.cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F5F5F5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: "#DDD" }} />
                  <span style={{ fontSize: T.sub, color: T.muted }}>{c.cat}</span>
                </div>
                <span style={{ fontSize: T.sub, color: T.muted }}>R$ {c.spent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA quando não tem orçamento ainda */}
        {configured.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
            <div style={{ fontSize: T.body, fontWeight: T.bold, color: T.ink, marginBottom: 6 }}>Defina seu orçamento</div>
            <div style={{ fontSize: T.sub, color: T.secondary, marginBottom: 16 }}>
              Controle quanto planeja gastar por categoria e acompanhe em tempo real.
            </div>
            <button style={{ ...btn, width: "100%" }} onClick={openBudgetEdit}>
              Configurar orçamento
            </button>
          </div>
        )}

        {/* Botão editar (quando já tem) */}
        {configured.length > 0 && (
          <button style={{ ...btnOut, width: "100%", marginTop: 4 }} onClick={openBudgetEdit}>
            ✏️ Editar orçamento
          </button>
        )}
      </>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ ...ph, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: T.sub, opacity: 0.7, fontWeight: T.regular }}>Gastos · {monthLabel(monthFilter)}</div>
            <div style={{ fontSize: T.hero, fontWeight: T.bold, letterSpacing: T.lsTitle }}>R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {state.expenses.filter(e => !e.oculto).length > 0 && [
              { key: "dashboard", label: "Dashboard" },
              { key: "list", label: "Lista" },
              { key: "budget", label: "Orçamento" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setView(tab.key)} style={{ padding: "6px 12px", borderRadius: 12, fontSize: T.caption, fontWeight: view === tab.key ? T.bold : T.regular, border: "none", background: view === tab.key ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {rendaTotal > 0 && <div style={{ fontSize: T.caption, opacity: 0.65, marginTop: 4, fontWeight: T.regular }}>{Math.round((totalExpenses / rendaTotal) * 100)}% da renda mensal</div>}
        {FinTabs && <FinTabs />}
        <div className="month-scroll" style={{ display: "flex", gap: 5, marginTop: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 2 }}>
          <style>{`.month-scroll::-webkit-scrollbar{display:none}`}</style>
          <button onClick={() => { setMonthFilter("all"); setShowCustomRange(false); }} style={{ padding: "5px 12px", borderRadius: 14, fontSize: 12, fontWeight: 600, border: "none", background: monthFilter === "all" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", flexShrink: 0 }}>Todos</button>
          {months.map(m => <button key={m} onClick={() => { setMonthFilter(m); setShowCustomRange(false); }} style={{ padding: "5px 12px", borderRadius: 14, fontSize: 12, fontWeight: monthFilter === m ? 600 : 400, border: "none", background: monthFilter === m ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>{monthLabel(m)}</button>)}
          <button onClick={() => { setMonthFilter("custom"); setShowCustomRange(true); }} style={{ padding: "5px 12px", borderRadius: 14, fontSize: 12, fontWeight: monthFilter === "custom" ? 600 : 400, border: "none", background: monthFilter === "custom" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
          </button>
        </div>
        {showCustomRange && monthFilter === "custom" && <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
          <input type="date" value={customRange.start} onChange={e => setCustomRange(p => ({ ...p, start: e.target.value }))} style={{ flex: 1, padding: "6px 8px", borderRadius: 10, border: "none", fontSize: 12, background: "rgba(255,255,255,0.25)", color: "#fff" }} />
          <span style={{ fontSize: 12, opacity: 0.7 }}>até</span>
          <input type="date" value={customRange.end} onChange={e => setCustomRange(p => ({ ...p, end: e.target.value }))} style={{ flex: 1, padding: "6px 8px", borderRadius: 10, border: "none", fontSize: 12, background: "rgba(255,255,255,0.25)", color: "#fff" }} />
        </div>}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: 16 }}>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <button style={{ ...btn, width: "100%", fontSize: 14, padding: "12px 8px" }} onClick={() => setRegisterOpen(!registerOpen)}>+ Registrar</button>
          {registerOpen && <>
            <div onClick={() => setRegisterOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 31 }}>
              <button onClick={() => { setRegisterOpen(false); setShowExpenseForm(true); }} style={{ width: "100%", padding: "14px 16px", border: "none", background: "transparent", fontSize: 14, fontWeight: 600, color: "#333", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #F0F0F0" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Manual
              </button>
              <label style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#333", borderBottom: "1px solid #F0F0F0" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>
                Excel / CSV
                <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setRegisterOpen(false); handleExcelUpload(e); }} style={{ display: "none" }} />
              </label>
              <label style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, cursor: pdfParsing ? "wait" : "pointer", fontSize: 14, fontWeight: 600, color: "#333", opacity: pdfParsing ? 0.6 : 1 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                {pdfParsing ? "Lendo..." : "Fatura PDF"}
                <input type="file" accept=".pdf" onChange={(e) => { setRegisterOpen(false); handlePdfUpload(e); }} disabled={pdfParsing} style={{ display: "none" }} />
              </label>
            </div>
          </>}
        </div>
        {importStep === "pdf-loading" && <div style={{ ...card, padding: 24, textAlign: "center" }}><div style={{ width: 56, height: 56, border: "4px solid #EDE9FE", borderTop: "4px solid #7B2FF2", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>Analisando...</div><div style={{ fontSize: 13, color: "#999" }}>A Quita está lendo seus dados</div></div>}
        {importStep === "pdf-preview" && pdfPreview && <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><div style={{ width:32,height:32,borderRadius:10,background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>Gastos encontrados!</span></div>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>Encontrei {pdfPreview.length} gastos. Edite valores/datas ou desmarque os que não quiser:</div>
          <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: 14 }}>
            {pdfPreview.map((item, i) => {
              const fmtDate = (d) => { if (!d) return '—'; try { const dt = new Date(d); return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) } catch(e) { return d } };
              return <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #F0F0F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => togglePdfItem(i)} style={{ width: 24, height: 24, borderRadius: 8, border: "2px solid " + (item.selected ? "#7B2FF2" : "#DDD"), background: item.selected ? "linear-gradient(135deg,#6B21E8,#7B2FF2)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>{item.selected && <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 8l4 4 6-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: item.selected ? "#333" : "#BBB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <select value={item.category} onChange={e => updatePdfItemCategory(i, e.target.value)} style={{ fontSize: 11, color: "#7B2FF2", background: "#EDE9FE", border: "none", borderRadius: 6, padding: "2px 6px" }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                      <span style={{ fontSize: 11, color: "#CCC" }}>{fmtDate(item.date)}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: item.selected ? "#7B2FF2" : "#CCC", whiteSpace: "nowrap" }}>R$ {item.amount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                {item.selected && <div style={{ marginTop: 8, marginLeft: 34 }}>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: "#BBB", fontWeight: 600, marginBottom: 2 }}>DESCRIÇÃO</div>
                    <input type="text" defaultValue={item.name}
                      onBlur={e => { if (e.target.value.trim()) setPdfPreview(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value.trim() } : p)) }}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #EDE9FE", fontSize: 13, outline: "none", boxSizing: "border-box", color: "#333" }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: "#BBB", fontWeight: 600, marginBottom: 2 }}>VALOR (R$)</div>
                      <input type="text" defaultValue={item.amount.toFixed(2).replace('.', ',')}
                        onBlur={e => { const v = parseFloat(e.target.value.replace(/[^\d,.]/g, '').replace(',', '.')); if (v > 0) setPdfPreview(prev => prev.map((p, j) => j === i ? { ...p, amount: v } : p)) }}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #EDE9FE", fontSize: 13, outline: "none", boxSizing: "border-box", color: "#333" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: "#BBB", fontWeight: 600, marginBottom: 2 }}>DATA</div>
                      <input type="date" defaultValue={item.date ? item.date.slice(0, 10) : ''}
                        onChange={e => { if (e.target.value) setPdfPreview(prev => prev.map((p, j) => j === i ? { ...p, date: e.target.value } : p)) }}
                        style={{ width: "100%", padding: "5px 8px", borderRadius: 8, border: "1px solid #EDE9FE", fontSize: 12, outline: "none", boxSizing: "border-box", color: "#333" }} />
                    </div>
                  </div>
                </div>}
              </div>
            })}
          </div>
          <div style={{ background: "linear-gradient(135deg,#F5F3FF,#EDE9FE)", borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "#6B5FA0", fontWeight: 500 }}>{pdfPreview.filter(e => e.selected).length} selecionados</span><span style={{ fontSize: 13, fontWeight: 700, color: "#7B2FF2" }}>R$ {pdfPreview.filter(e => e.selected).reduce((s, e) => s + e.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
          <div style={{ display: "flex", gap: 8 }}><button style={{ ...btn, flex: 1 }} onClick={confirmPdfImport}>Importar ({pdfPreview.filter(e => e.selected).length})</button><button style={{ ...btnOut, flex: 1 }} onClick={() => { setPdfPreview(null); setImportStep(null); }}>Cancelar</button></div>
        </div>}
        {showExpenseForm && <div style={{ ...card, padding: 20 }}>
          <input style={{ ...input, marginBottom: 10 }} placeholder="O que gastou?" value={expName} onChange={e => setExpName(e.target.value)} />
          <input style={{ ...input, marginBottom: 10 }} placeholder="Quanto? (R$)" type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <select style={{ ...input, flex: 1, marginBottom: 0 }} value={expCat} onChange={e => setExpCat(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            <input type="date" style={{ ...input, flex: 1, marginBottom: 0 }} value={expDate} onChange={e => setExpDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}><button style={{ ...btn, flex: 1 }} onClick={addExpense}>Salvar (+5 XP)</button><button style={{ ...btnOut, flex: 1 }} onClick={() => setShowExpenseForm(false)}>Cancelar</button></div>
        </div>}

        {view === "dashboard" && state.expenses.length > 0 && !importStep && !showExpenseForm && <>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: T.sub, fontWeight: T.bold, color: T.ink }}>Por categoria</div>
              {catFilters.length > 0 && <button onClick={() => setCatFilters([])} style={{ fontSize: 11, color: "#7B2FF2", background: "#EDE9FE", border: "none", borderRadius: 10, padding: "4px 12px", cursor: "pointer", fontWeight: 600 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg> Limpar</button>}
            </div>
            <DonutChart />
            <div style={{ marginTop: 4, marginBottom: 8, fontSize: 11, color: "#AAA", textAlign: "center" }}>Toque para selecionar · múltipla seleção</div>
            <div style={{ marginTop: 8 }}>
              {catData.map(c => {
                const pct = grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0;
                return <div key={c.cat} onClick={() => toggleCatFilter(c.cat)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, marginBottom: 2, cursor: "pointer", opacity: catFilters.length === 0 || catFilters.includes(c.cat) ? 1 : 0.35, background: catFilters.includes(c.cat) ? "#F5F3FF" : "transparent", transition: "all 0.2s" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: c.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: T.sub, color: T.ink, fontWeight: catFilters.includes(c.cat) ? T.semi : T.regular }}>{c.cat}</span>
                  <span style={{ fontSize: T.caption, color: T.muted }}>{pct}%</span>
                  <span style={{ fontSize: T.sub, fontWeight: T.semi, color: T.ink, minWidth: 80, textAlign: "right" }}>R$ {c.total.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                </div>;
              })}
            </div>
          </div>
          {monthlyTotals.length > 1 && <div style={card}>
            <div style={{ fontSize: T.sub, fontWeight: T.bold, color: T.ink, marginBottom: 12 }}>Evolução mensal</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
              {monthlyTotals.map(m => {
                const h = Math.max(8, (m.total / maxMonthly) * 100);
                const isActive = monthFilter === "all" || monthFilter === m.month;
                return <div key={m.month} onClick={() => setMonthFilter(monthFilter === m.month ? "all" : m.month)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", opacity: isActive ? 1 : 0.35, transition: "all 0.3s" }}>
                  <span style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>R${(m.total / 1000).toFixed(1)}k</span>
                  <div style={{ width: "100%", maxWidth: 40, height: h, background: monthFilter === m.month ? "linear-gradient(180deg,#9B5FF7,#7B2FF2)" : "#DDD6FE", borderRadius: 8, transition: "all 0.3s", boxShadow: monthFilter === m.month ? "0 4px 12px rgba(123,47,242,0.35)" : "none" }} />
                  <span style={{ fontSize: 10, color: monthFilter === m.month ? "#7B2FF2" : "#BBB", fontWeight: monthFilter === m.month ? 700 : 400 }}>{m.label.split(" ")[0]}</span>
                </div>;
              })}
            </div>
          </div>}
          {catFilters.length > 0 && <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{catFilters.length === 1 ? catFilters[0] : catFilters.length + " categorias"}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#7B2FF2" }}>R$ {catData.filter(c => catFilters.includes(c.cat)).reduce((s, c) => s + c.total, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            {displayExpenses.sort((a, b) => b.amount - a.amount).slice(0, 10).map(e => <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F5F5F5" }}>
              <div><div style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>{e.name}</div><div style={{ fontSize: 11, color: "#BBB" }}>{new Date(e.date).toLocaleDateString("pt-BR")}</div></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#7B2FF2" }}>R$ {e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>)}
          </div>}
          {catData.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ ...card, textAlign: "center", marginBottom: 0 }}><div style={{ fontSize: T.caption, color: T.muted, fontWeight: T.semi, letterSpacing: 0.5 }}>LANÇAMENTOS</div><div style={{ fontSize: 22, fontWeight: T.bold, color: T.accent, marginTop: 4 }}>{expByMonth.length}</div></div>
            <div style={{ ...card, textAlign: "center", marginBottom: 0 }}><div style={{ fontSize: T.caption, color: T.muted, fontWeight: T.semi, letterSpacing: 0.5 }}>CATEGORIAS</div><div style={{ fontSize: 22, fontWeight: T.bold, color: T.accent, marginTop: 4 }}>{catData.length}</div></div>
            <div style={{ ...card, textAlign: "center", marginBottom: 0 }}><div style={{ fontSize: T.caption, color: T.muted, fontWeight: T.semi, letterSpacing: 0.5 }}>MAIOR GASTO</div><div style={{ fontSize: T.sub, fontWeight: T.bold, color: T.danger, marginTop: 4 }}>{catData[0]?.cat || "-"}</div></div>
            <div style={{ ...card, textAlign: "center", marginBottom: 0 }}><div style={{ fontSize: T.caption, color: T.muted, fontWeight: T.semi, letterSpacing: 0.5 }}>TICKET MÉDIO</div><div style={{ fontSize: T.sub, fontWeight: T.bold, color: T.ink, marginTop: 4 }}>R$ {expByMonth.length > 0 ? Math.round(grandTotal / expByMonth.length).toLocaleString("pt-BR") : 0}</div></div>
          </div>}
        </>}

        {view === "list" && state.expenses.length > 0 && !importStep && !showExpenseForm && <>
          <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
            {["Todos", ...CATEGORIES].map(cat => {
              const count = cat === "Todos" ? expByMonthAll.length : expByMonthAll.filter(e => e.category === cat).length;
              if (cat !== "Todos" && count === 0) return null;
              const isActive = cat === "Todos" ? (catFilters.length === 0) : catFilters.includes(cat);
              const hiddenCount = cat === "Todos" ? expByMonthAll.filter(e => e.oculto).length : expByMonthAll.filter(e => e.category === cat && e.oculto).length;
              return <button key={cat} onClick={() => cat === "Todos" ? setCatFilters([]) : toggleCatFilter(cat)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, border: isActive ? "1.5px solid #7B2FF2" : "1.5px solid #E5E5E5", background: isActive ? "linear-gradient(135deg,#EDE9FE,#DDD6FE)" : "#fff", color: isActive ? "#7B2FF2" : "#999", cursor: "pointer", fontWeight: isActive ? 600 : 400 }}>{cat} ({count}{hiddenCount > 0 ? ", "+hiddenCount+" ocultos" : ""})</button>;
            })}
          </div>
          {clearAllExpenses && state.expenses.filter(e => !e.oculto).length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button
                onClick={clearAllExpenses}
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#B91C1C", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/></svg>
                Limpar todos os gastos
              </button>
            </div>
          )}
          {CATEGORIES.map(cat => {
            if (catFilters.length > 0 && !catFilters.includes(cat)) return null;
            const ce = expByMonthAll.filter(e => e.category === cat);
            if (ce.length === 0) return null;
            const ct = ce.filter(e => !e.oculto).reduce((s, e) => s + e.amount, 0);
            return (<div key={cat} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#333" }}>{cat}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#7B2FF2" }}>R$ {ct.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  {ce.some(e => e.oculto) && <div style={{ fontSize: 10, color: "#BBB", marginTop: 1 }}>{ce.filter(e => e.oculto).length} oculto{ce.filter(e => e.oculto).length > 1 ? "s" : ""}</div>}
                </div>
              </div>
              {ce.sort((a, b) => b.date - a.date).map(e => <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F5F5F5", opacity: e.oculto ? 0.45 : 1, background: e.oculto ? "#FAFAFA" : "transparent" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{e.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <select value={e.category} onChange={ev => { ev.stopPropagation(); updateExpenseCategory(e.id, ev.target.value); }} style={{ fontSize: 11, color: "#7B2FF2", background: "#EDE9FE", border: "none", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                    <span style={{ fontSize: 11, color: "#CCC" }}>{new Date(e.date).toLocaleDateString("pt-BR")}</span>
                    {e.category === "Cartão de Crédito" && <label style={{ fontSize: 11, color: "#fff", background: "linear-gradient(135deg,#6B21E8,#7B2FF2)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>Detalhar<input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={ev => handleDetailFatura(e.id, ev)} style={{ display: "none" }} /></label>}
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: e.oculto ? "#CCC" : "#7B2FF2", whiteSpace: "nowrap", textDecoration: e.oculto ? "line-through" : "none" }}>R$ {e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <button onClick={() => toggleOcultar(e.id)} title={e.oculto ? "Mostrar nos cálculos" : "Ocultar dos cálculos"} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0, opacity: e.oculto ? 0.4 : 1 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={e.oculto ? "#BBB" : "#7B2FF2"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {e.oculto ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
                <button onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="#CCC" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
              </div>)}
            </div>);
          })}
        </>}

        {view === "budget" && !importStep && !showExpenseForm && BudgetView()}

        {state.expenses.length === 0 && !importStep && !showExpenseForm && <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: T.body, fontWeight: T.bold, color: T.ink, marginBottom: 6 }}>Registre seus gastos</div>
          <div style={{ fontSize: T.sub, color: T.secondary, lineHeight: T.relaxed, marginBottom: 20 }}>Importe uma fatura do cartão ou registre manualmente. A Quita categoriza tudo automaticamente.</div>
          <button onClick={() => setRegisterOpen(true)} style={{ ...btn }}>+ Registrar</button>
        </div>}
      </div>
      </div>
    </div>
  );
}
