import React, { useState, useEffect, useCallback, useRef } from 'react'
import { sb } from '../services/supabase'
import LESSONS from '../services/lessons.json'
import {
  CATEGORIES, DEFAULT_STATE, LEVELS, getLevel, calcProfile,
  RECEITA_TIPOS, CAT_NORM, CAT_GRUPOS,
} from '../services/gameConfig'
import { useQuitaScene } from '../hooks/useQuitaScene'
import TrilhaScreen from './TrilhaScreen'
import ExpensesScreen from './ExpensesScreen'
import ReceitasScreen from './ReceitasScreen'
import DebtsScreen from './DebtsScreen'
import PlanejamentoScreen from './PlanejamentoScreen'
import DiagnosticoScreen from './DiagnosticoScreen'
import * as XLSX from 'xlsx'

export default function QuitaApp({ user, onSignOut }) {
const [state, setState] = useState(DEFAULT_STATE);
  const [screen, setScreen] = useState("home");
  const [isExpanded, setIsExpanded] = useState(false);
  const [lessonStep, setLessonStep] = useState("content");
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(-1);
  const [answered, setAnswered] = useState(false);
  const [lives, setLives] = useState(3);
  const [lessonXp, setLessonXp] = useState(0);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCat, setExpCat] = useState("Alimentação");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [incomeInput, setIncomeInput] = useState("");
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showLessonsModal, setShowLessonsModal] = useState(false);
  const [importStep, setImportStep] = useState(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [catFilters, setCatFilters] = useState([]);
  const [monthFilter, setMonthFilter] = useState("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [detailFaturaId, setDetailFaturaId] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const saveTimer = useRef(null);

  // ── Carregar dados do Supabase ──
  useEffect(() => {
    const load = async () => {
      setDbLoading(true);
      const { data } = await sb.from("user_data").select("data").eq("user_id", user.id).single();
      if (data?.data) {
        const loaded = { ...DEFAULT_STATE(), ...data.data };
        loaded.level = getLevel(loaded.xp);
        loaded.profileCompletion = calcProfile(loaded);
        setState(loaded);
      }
      setDbLoading(false);
    };
    load();
  }, [user.id]);

  // ── Salvar no Supabase com debounce ──
  const save = useCallback((s) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await sb.from("user_data").upsert({ user_id: user.id, data: s, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    }, 1000);
  }, [user.id]);

  const addXp = useCallback((amount, msg) => {
    setState(prev => {
      const n = { ...prev, xp: prev.xp + amount, weeklyXp: prev.weeklyXp + amount };
      n.level = getLevel(n.xp);
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
    if (msg) { setToast("+" + amount + " XP — " + msg); setTimeout(() => setToast(null), 2500); }
  }, [save]);

  const checkStreak = useCallback(() => {
    const today = new Date().toDateString();
    setState(prev => {
      if (prev.lastActiveDate === today) return prev;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const n = { ...prev, lastActiveDate: today };
      if (prev.lastActiveDate === yesterday) { n.streak = prev.streak + 1; }
      else if (prev.lastActiveDate !== today) { n.streak = 1; }
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
  }, [save]);

  useEffect(() => { if (!dbLoading) checkStreak(); }, [dbLoading]);

  const startLesson = (idx) => {
    setScreen("lesson"); setLessonStep("content"); setQIdx(0);
    setSelected(-1); setAnswered(false); setLives(3); setLessonXp(0);
    setState(p => ({ ...p, currentLesson: idx }));
  };

  const checkAnswer = () => {
    const lesson = LESSONS[state.currentLesson];
    const q = lesson.questions[qIdx];
    setAnswered(true);
    if (selected === q.correct) { setLessonXp(x => x + 10); } else { setLives(l => l - 1); }
  };

  const addExpense = () => {
    if (!expName || !expAmount) return;
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    setState(prev => {
      const n = { ...prev, expenses: [...prev.expenses, { id: Date.now(), name: expName, amount: amt, category: expCat, date: Date.now() }] };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
    addXp(5, "Gasto registrado");
    checkStreak();
    setExpName(""); setExpAmount(""); setShowExpenseForm(false);
  };

  const toggleOcultar = useCallback((expId) => {
    setState(prev => {
      const n = { ...prev, expenses: prev.expenses.map(e => e.id === expId ? { ...e, oculto: !e.oculto } : e) };
      n.profileCompletion = calcProfile(n);
      Promise.resolve().then(() => save(n));
      return n;
    });
  }, [save]);

  const updateExpenseCategory = useCallback((expId, newCat) => {
    setState(prev => {
      const exp = prev.expenses.find(e => e.id === expId);
      if (!exp || exp.category === newCat) return prev;
      const updated = prev.expenses.map(e => e.id === expId ? { ...e, category: newCat } : e);
      const n = { ...prev, expenses: updated };
      n.profileCompletion = calcProfile(n);
      // save assíncrono para não causar re-render extra que reseta scroll
      Promise.resolve().then(() => save(n));
      return n;
    });
  }, [save]);

  const deleteExpense = (expId) => {
    setState(prev => {
      const n = { ...prev, expenses: prev.expenses.filter(e => e.id !== expId) };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
  };

  const handleDetailFatura = async (faturaId, e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    setDetailFaturaId(faturaId); setPdfParsing(true); setImportStep("pdf-loading");
    try {
      let content, isPdf = false;
      if (file.name.match(/\.pdf$/i)) {
        isPdf = true;
        content = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = () => rej(); r.readAsDataURL(file); });
      } else {
        const buf = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(); r.readAsArrayBuffer(file); });
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        content = raw.map(row => row.filter(c => String(c).trim()).join(" | ")).filter(l => l.trim().length > 3).slice(0, 200).join("\n");
      }
      const prompt2 = 'Esta é uma FATURA DE CARTÃO DE CRÉDITO. Extraia TODOS os gastos/compras individuais.\n\nResponda APENAS com JSON válido:\n{"expenses":[{"name":"descrição","amount":99.90,"category":"Categoria","date":"2026-01-15"}]}\n\nCategorias: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Delivery, Assinaturas, Impostos, Trabalho, Outros\n- amount SEMPRE positivo\n- date formato YYYY-MM-DD\n- Ignore juros, multas, encargos, pagamentos anteriores\n- Se não encontrar: {"expenses":[]}';
      const messages = isPdf
        ? [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: content } }, { type: "text", text: prompt2 }] }]
        : [{ role: "user", content: prompt2 + "\n\nDados:\n" + content }];
      const response = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages }) });
      const data = await response.json();
      if (data.error) { setToast("Erro: " + (data.error.message || "")); setTimeout(() => setToast(null), 3000); setImportStep(null); setPdfParsing(false); setDetailFaturaId(null); return; }
      const text = data.content?.map(c => c.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (parsed.expenses && parsed.expenses.length > 0) {
        setState(prev => {
          const n = { ...prev, expenses: prev.expenses.filter(e => e.id !== faturaId) };
          parsed.expenses.forEach((exp, i) => { n.expenses.push({ id: Date.now() + i, name: exp.name, amount: Math.abs(parseFloat(exp.amount)) || 0, category: CATEGORIES.includes(exp.category) ? exp.category : "Outros", date: exp.date ? new Date(exp.date).getTime() || Date.now() : Date.now() }); });
          n.profileCompletion = calcProfile(n); save(n); return n;
        });
        addXp(Math.min(parsed.expenses.length * 5, 100), parsed.expenses.length + " itens detalhados!");
        setImportStep(null);
      } else { setToast("Nenhum gasto na fatura"); setTimeout(() => setToast(null), 2500); setImportStep(null); }
    } catch (err) { setToast("Erro ao processar fatura"); setTimeout(() => setToast(null), 2500); setImportStep(null); }
    setPdfParsing(false); setDetailFaturaId(null);
  };

  const sendToAI = async (content, isPdf) => {
    setPdfParsing(true); setImportStep("pdf-loading");
    try {
      const prompt = 'Analise este extrato/fatura e extraia APENAS os GASTOS (valores negativos, débitos, pagamentos, compras, boletos, pix enviados).\n\nIGNORE: saldos diários, transferências recebidas, créditos, investimentos recebidos, equilíbrio entre contas, IOF, transferências enviadas para si mesmo.\n\nIMPORTANTE: se aparecer "Pagamento de fatura do cartão", categorize como "Cartão de Crédito".\n\nCategorize INTELIGENTEMENTE:\n- Alimentação: supermercado, restaurante, padaria\n- Delivery: iFood, Rappi, Uber Eats\n- Transporte: Uber, 99, combustível, estacionamento\n- Moradia: aluguel, condomínio, energia, água, gás\n- Assinaturas: Netflix, Spotify, streaming\n- Saúde: farmácia, médico, plano de saúde\n- Educação: escola, curso, livros\n- Lazer: cinema, viagem, roupas\n- Impostos: DAS, DARF, IPVA, IR\n- Trabalho: contabilidade, ferramentas\n- Cartão de Crédito: pagamento de fatura\n- Transferências: Pix para pessoas\n- Investimentos: aportes, aplicações\n- Outros: demais\n\nResponda APENAS com JSON válido:\n{"expenses":[{"name":"descrição curta","amount":99.90,"category":"Categoria","date":"2026-01-15"}]}\n\n- amount SEMPRE positivo\n- date no formato YYYY-MM-DD\n- Se não encontrar gastos: {"expenses":[]}';

      // Verificar tamanho antes de enviar (base64 de PDF grande causa 504)
      if (isPdf && content.length > 3_000_000) {
        setToast("PDF muito grande. Use um extrato menor ou exporte como Excel/CSV.");
        setTimeout(() => setToast(null), 5000);
        setImportStep(null); setPdfParsing(false); return;
      }

      const messages = isPdf
        ? [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: content } }, { type: "text", text: prompt }] }]
        : [{ role: "user", content: prompt + "\n\nDados:\n" + content }];

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages })
      });

      const data = await response.json();

      if (response.status === 504 || response.status === 408) {
        setToast("⏱ Tempo esgotado. Tente um PDF menor ou use Excel/CSV.");
        setTimeout(() => setToast(null), 5000);
        setImportStep(null); setPdfParsing(false); return;
      }
      if (response.status === 413) {
        setToast("📄 PDF muito grande. Exporte o extrato como Excel/CSV e tente novamente.");
        setTimeout(() => setToast(null), 5000);
        setImportStep(null); setPdfParsing(false); return;
      }
      if (data.error) {
        setToast("Erro: " + (data.error.message || "tente novamente"));
        setTimeout(() => setToast(null), 4000);
        setImportStep(null); setPdfParsing(false); return;
      }

      const text = data.content?.map(c => c.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (parsed.expenses && parsed.expenses.length > 0) {
        setPdfPreview(parsed.expenses.map((exp, i) => ({ ...exp, id: Date.now() + i, amount: Math.abs(parseFloat(exp.amount)) || 0, selected: true })));
        setImportStep("pdf-preview");
      } else {
        setToast("Nenhum gasto encontrado no arquivo.");
        setTimeout(() => setToast(null), 3000);
        setImportStep(null);
      }
    } catch (err) {
      setToast("Erro de conexão. Verifique internet e tente novamente.");
      setTimeout(() => setToast(null), 4000);
      setImportStep(null);
    }
    setPdfParsing(false);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (raw.length < 2) { setToast("Planilha vazia"); setTimeout(() => setToast(null), 2500); return; }
        sendToAI(raw.map(row => row.filter(c => String(c).trim()).join(" | ")).filter(l => l.trim().length > 3).slice(0, 200).join("\n"), false);
      } catch (err) { setToast("Erro ao ler arquivo"); setTimeout(() => setToast(null), 2500); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    try {
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = () => rej(); r.readAsDataURL(file); });
      sendToAI(base64, true);
    } catch (err) { setToast("Erro ao ler PDF"); setTimeout(() => setToast(null), 2500); }
  };

  const togglePdfItem = (idx) => { setPdfPreview(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item)); };
  const updatePdfItemCategory = (idx, cat) => { setPdfPreview(prev => prev.map((item, i) => i === idx ? { ...item, category: cat } : item)); };

  const confirmPdfImport = () => {
    if (!pdfPreview) return;
    const sel = pdfPreview.filter(e => e.selected && e.amount > 0);
    if (sel.length === 0) { setToast("Selecione pelo menos 1 gasto"); setTimeout(() => setToast(null), 2500); return; }
    const ne = sel.map((e, i) => ({
      id: Date.now() + i,
      name: e.name,
      amount: e.amount,
      category: CATEGORIES.includes(e.category) ? e.category : "Outros",
      date: e.date ? (new Date(e.date).getTime() || Date.now()) : Date.now()
    }));
    setState(prev => {
      const n = { ...prev, expenses: [...prev.expenses, ...ne] };
      n.profileCompletion = calcProfile(n);
      // Save imediato (sem debounce) para garantir persistência
      if (saveTimer.current) clearTimeout(saveTimer.current);
      sb.from("user_data").upsert({ user_id: user.id, data: n, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      return n;
    });
    addXp(Math.min(sel.length * 5, 50), sel.length + " gastos importados!");
    checkStreak();
    setPdfPreview(null);
    setImportStep(null);
  };

  const addGoal = () => {
    if (!goalName || !goalTarget) return;
    const t = parseFloat(goalTarget);
    if (isNaN(t) || t <= 0) return;
    setState(prev => { const n = { ...prev, goals: [...prev.goals, { id: Date.now(), name: goalName, target: t, saved: 0, createdAt: Date.now() }] }; n.profileCompletion = calcProfile(n); save(n); return n; });
    setGoalName(""); setGoalTarget(""); setShowGoalForm(false);
  };

  const setIncome = () => {
    const v = parseFloat(incomeInput);
    if (isNaN(v) || v <= 0) return;
    setState(prev => { const n = { ...prev, income: v }; n.profileCompletion = calcProfile(n); save(n); return n; });
    setShowIncomeForm(false); setIncomeInput("");
    addXp(10, "Renda cadastrada");
  };

  const deleteGoal = useCallback((gid) => {
    setState(prev => { const n = { ...prev, goals: prev.goals.filter(g => g.id !== gid) }; n.profileCompletion = calcProfile(n); save(n); return n; });
  }, [save]);

  const addToGoal = (gid, amount) => {
    setState(prev => {
      const goals = prev.goals.map(g => g.id === gid ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g);
      const goal = goals.find(g => g.id === gid);
      const n = { ...prev, goals };
      if (goal && goal.saved >= goal.target) { addXp(300, "Meta atingida!"); }
      save(n); return n;
    });
  };

  const filterByMonth = (e) => {
    if (monthFilter === "all") return true;
    if (monthFilter === "custom") {
      if (!customRange.start && !customRange.end) return true;
      const d = new Date(e.date);
      const start = customRange.start ? new Date(customRange.start) : null;
      const end = customRange.end ? new Date(customRange.end + "T23:59:59") : null;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    }
    const d = new Date(e.date);
    return (d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0")) === monthFilter;
  };

  const totalExpenses = state.expenses.filter(filterByMonth).filter(e => !e.oculto).reduce((s, e) => s + e.amount, 0);
  const levelInfo = LEVELS[state.level] || LEVELS[0];
  const nextLevel = LEVELS[state.level + 1];
  const levelProgress = nextLevel ? ((state.xp - levelInfo.xp) / (nextLevel.xp - levelInfo.xp)) * 100 : 100;
  const userName = user.user_metadata?.name || state.name || user.email?.split("@")[0] || "Jogador";

  const rendaTotal = (state.receitas||[]).reduce((s,r) => s+(r.amount||0), 0) || state.income || 0;

  const addReceita = useCallback((receita) => {
    setState(prev => {
      const dataTs = receita.dataStr ? new Date(receita.dataStr).getTime() : Date.now();
      const n = { ...prev, receitas: [...(prev.receitas||[]), { ...receita, id: Date.now(), date: dataTs }] };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
    addXp(10, "Receita registrada!");
  }, [save]);

  const deleteReceita = useCallback((id) => {
    setState(prev => {
      const n = { ...prev, receitas: (prev.receitas||[]).filter(r => r.id !== id) };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
  }, [save]);

  const savePlano = useCallback((plano) => {
    setState(prev => { const n = { ...prev, plano }; save(n); return n; });
  }, [save]);

  const addDebt = useCallback((debt) => {
    setState(prev => {
      const n = { ...prev, debts: [...prev.debts, { ...debt, id: Date.now(), createdAt: Date.now() }] };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
    addXp(20, "Divida cadastrada!");
  }, [save]);

  const deleteDebt = useCallback((id) => {
    setState(prev => {
      const n = { ...prev, debts: prev.debts.filter(d => d.id !== id) };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
  }, [save]);

    // ── Estilos ──
  const ph = { background: "linear-gradient(135deg, #6B21E8 0%, #7B2FF2 50%, #9B5FF7 100%)", color: "#fff", padding: "20px 20px 24px", borderRadius: "0 0 28px 28px", boxShadow: "0 8px 32px rgba(107,33,232,0.25)" };
  const card = { background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: 20, padding: "18px", marginBottom: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.7)" };
  const btn = { background: "linear-gradient(135deg, #6B21E8, #7B2FF2)", color: "#fff", border: "none", borderRadius: 16, padding: "15px", width: "100%", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(123,47,242,0.35)", letterSpacing: 0.2 };
  const btnOut = { ...btn, background: "transparent", color: "#7B2FF2", border: "2px solid #7B2FF2", boxShadow: "none" };
  const pill = { background: "linear-gradient(135deg, #EDE9FE, #DDD6FE)", color: "#7B2FF2", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600 };
  const pillGreen = { ...pill, background: "linear-gradient(135deg, #DCFCE7, #BBF7D0)", color: "#16A34A" };
  const input = { width: "100%", padding: "14px", borderRadius: 14, border: "1.5px solid #E5E5E5", fontSize: 15, outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
  const nav = { display: "flex", justifyContent: "space-around", padding: "10px 0 28px", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)", position: "sticky", bottom: 0, boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" };
  const navItem = (active) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, color: active ? "#7B2FF2" : "#AAA", cursor: "pointer", border: "none", background: "none", fontWeight: active ? 600 : 400 });

  // ── Hook 3D (sempre antes de qualquer return condicional — regra dos hooks) ──
  const { celebrate, cardRef } = useQuitaScene(state.xp, state.level, isExpanded)

  // focus-mode gerenciado dentro do useQuitaScene


  const nextQuestionWith3D = () => {
    const lesson = LESSONS[state.currentLesson]
    if (qIdx < lesson.questions.length - 1) {
      setQIdx(q => q + 1); setSelected(-1); setAnswered(false)
    } else {
      const perfect = lessonXp === 30
      const bonus = perfect ? 20 : 0
      addXp(lessonXp + bonus, perfect ? 'Lição perfeita!' : 'Lição completa!')
      addXp(15, 'Streak mantido')
      setState(p => {
        const cl = [...p.completedLessons]
        if (!cl.includes(lesson.id)) cl.push(lesson.id)
        const n = { ...p, completedLessons: cl }
        save(n)
        celebrate(cl.length)
        return n
      })
      setLessonStep('done')
    }
  }

  if (dbLoading) return (
    <div style={{ background: "transparent", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>Carregando seus dados...</div>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.2)", borderTop: "3px solid #A855F7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  // Verificação de segurança: state deve ter a estrutura mínima
  if (!state || typeof state.xp === 'undefined') return (
    <div style={{ background: "transparent", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.2)", borderTop: "3px solid #A855F7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );


  const NavBar = () => (
    React.createElement("div", { style: nav },
      [["home","Início","M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"],
       ["trilha","Trilha","M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"],
       ["receitas","Receitas","M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"],
       ["expenses","Gastos","M4 6h16M4 12h10M4 18h14"],
       ["debts","Dívidas","M13 10V3L4 14h7v7l9-11h-7z"],
       ["diagnostico","Saúde","M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"],
       ["plano","Plano","M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"],
       ["goals","Metas","M12 8v4l2.5 2.5M12 3a9 9 0 100 18 9 9 0 000-18z"],
       ["profile","Perfil","M12 12a4 4 0 100-8 4 4 0 000 8zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"]
      ].map(([id, label, d]) => (
        <button key={id} style={navItem(screen === id)} onClick={() => setScreen(id)}>
          <div style={{ width: 44, height: 30, borderRadius: 15, background: screen === id ? "linear-gradient(135deg,#EDE9FE,#DDD6FE)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={screen === id ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
          </div>
          <span>{label}</span>
        </button>
      ))
    )
  );

  const Toast = () => toast ? <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#6B21E8,#7B2FF2)", color: "#fff", padding: "12px 24px", borderRadius: 24, fontSize: 14, fontWeight: 600, zIndex: 99, boxShadow: "0 8px 24px rgba(123,47,242,0.4)", letterSpacing: 0.2, whiteSpace: "nowrap" }}>{toast}</div> : null;

  const Home = () => {
    const completedCount = state.completedLessons.length;
    const totalLessons   = LESSONS.length;
    const allDone        = completedCount === totalLessons;
    const pct            = Math.round((completedCount / totalLessons) * 100);
    const ICONS          = ["💳","📈","⛄","🔍","⚖️"];

    return (
      <div style={{ background: "#F2F0F8", minHeight: "100vh" }}>

        {/* ── HEADER roxo ── */}
        <div style={ph}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 500, letterSpacing: 0.8 }}>OLÁ 👋</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{userName}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.2)" }}>🔥 {state.streak}d</span>
              <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.2)" }}>⚡ {state.xp.toLocaleString()} XP</span>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 600 }}>Nv {state.level + 1}</span>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.2)", borderRadius: 4, height: 5 }}>
              <div style={{ background: "linear-gradient(90deg,#fff,rgba(255,255,255,0.6))", borderRadius: 4, height: "100%", width: Math.round(levelProgress) + "%", transition: "width 0.6s" }} />
            </div>
            <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 600 }}>{levelInfo.name}</span>
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>

          {/* ── CARD DA QUITA 3D — substitui o card de trilha ── */}
          <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>QUITA</div>
          <div style={{
            borderRadius: 20, marginBottom: 12,
            background: "linear-gradient(160deg, #2D1458 0%, #4C1D95 60%, #6D28D9 100%)",
            boxShadow: "0 8px 32px rgba(45,20,88,0.35)",
            position: "relative",
          }}>
            {/* Âncora de posição — o hook lê getBoundingClientRect deste div */}
            <div ref={cardRef} style={{ height: 300, position: "relative", borderRadius: 12 }}>
              {/* canvas fixo (index.html) é posicionado aqui pelo hook */}
              {/* Gradiente de fade nas bordas */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
                background: "linear-gradient(to top, rgba(109,40,217,0.8), transparent)",
                pointerEvents: "none", zIndex: 2 }} />

              {/* Botão expandir */}
              <button onClick={() => setIsExpanded(e => !e)}
                style={{ position: "absolute", top: 10, right: 10, zIndex: 10,
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  {isExpanded
                    ? <><path d="M8 3v3a2 2 0 01-2 2H3"/><path d="M21 8h-3a2 2 0 01-2-2V3"/><path d="M3 16h3a2 2 0 012 2v3"/><path d="M16 21v-3a2 2 0 012-2h3"/></>
                    : <><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></>
                  }
                </svg>
              </button>
            </div>

            {/* Dica de interação */}
            <div style={{ textAlign: "center", padding: "6px 0 2px", opacity: 0.45 }}>
              <span style={{ fontSize: 10, color: "#EDE9FE", fontWeight: 500, letterSpacing: 0.5 }}>
                ↔ ARRASTE · TOQUE PARA ANIMAR
              </span>
            </div>
            {/* Rodapé do card com botão de ação */}
            <div style={{ padding: "8px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  {allDone ? "🎓 Trilha completa!" : `Lição ${completedCount + 1} de ${totalLessons}`}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                  {allDone ? "Volte amanhã" : LESSONS[completedCount]?.subtitle}
                </div>
              </div>
              <button
                onClick={() => !allDone && setShowLessonsModal(true)}
                style={{
                  background: allDone
                    ? "linear-gradient(135deg,#16A34A,#22C55E)"
                    : "linear-gradient(135deg,#fff,#EDE9FE)",
                  color: allDone ? "#fff" : "#6B21E8",
                  border: "none", borderRadius: 20,
                  padding: "9px 18px", fontSize: 12, fontWeight: 800,
                  cursor: allDone ? "default" : "pointer",
                  boxShadow: allDone
                    ? "0 4px 12px rgba(22,163,74,0.5), 0 0 0 2px rgba(34,197,94,0.3)"
                    : "0 4px 12px rgba(255,255,255,0.25)",
                  letterSpacing: 0.3, transition: "all 0.2s",
                }}>
                {allDone ? "✓ Completo" : "Ver lições →"}
              </button>
            </div>

            {/* Barra de progresso da trilha */}
            <div style={{ padding: "0 16px 14px" }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 4, height: 4 }}>
                <div style={{ background: "linear-gradient(90deg,#A78BFA,#fff)", borderRadius: 4, height: "100%", width: pct + "%", transition: "width 0.8s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{pct}% concluído</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{completedCount}/{totalLessons} lições</span>
              </div>
            </div>
          </div>

          {/* ── MODAL DE LIÇÕES ── */}
          {showLessonsModal && (
            <div style={{ position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(26,10,46,0.7)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "flex-end" }}
              onClick={() => setShowLessonsModal(false)}>
              <div style={{ background: "#fff", borderRadius: "24px 24px 0 0",
                width: "100%", maxWidth: 430, margin: "0 auto",
                padding: "24px 20px 40px", maxHeight: "75vh", overflowY: "auto" }}
                onClick={e => e.stopPropagation()}>
                <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, margin: "0 auto 20px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A0A2E", marginBottom: 16 }}>Atividades do dia</div>
                {LESSONS.map((l, i) => {
                  const done      = state.completedLessons.includes(l.id);
                  const isCurrent = !done && i === completedCount;
                  const locked    = !done && !isCurrent;
                  return (
                    <div key={l.id}
                      onClick={() => { if (!locked) { setShowLessonsModal(false); startLesson(i); } }}
                      style={{ display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 16px", borderRadius: 14, marginBottom: 8,
                        background: done ? "#F0FDF4" : isCurrent ? "#F5F3FF" : "#FAFAFA",
                        border: done ? "1.5px solid #BBF7D0" : isCurrent ? "2px solid #7B2FF2" : "1.5px solid #F0F0F0",
                        cursor: locked ? "default" : "pointer", opacity: locked ? 0.45 : 1 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: done ? "#DCFCE7" : isCurrent ? "#EDE9FE" : "#F0F0F0",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        {done ? "✅" : locked ? "🔒" : ICONS[i]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: done ? "#16A34A" : isCurrent ? "#6B21E8" : "#999" }}>{l.title}</div>
                        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{l.subtitle}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: done ? "#16A34A" : "#9B8EBE" }}>
                        {done ? `+${l.xp} XP ✓` : `+${l.xp} XP`}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setShowLessonsModal(false)}
                  style={{ width: "100%", marginTop: 8, padding: "14px", borderRadius: 14,
                    border: "none", background: "#F5F3FF", color: "#7B2FF2", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* ── RANKING ── */}
          <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>RANKING SEMANAL</div>
          <div style={card}>
            {[{ name: "Lucas", xp: 2180, color: "#F59E0B" }, { name: userName, xp: state.weeklyXp, color: "#7B2FF2" }, { name: "Ana", xp: 980, color: "#22C55E" }]
              .sort((a, b) => b.xp - a.xp)
              .map((u, i) => (
                <div key={u.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid #F0F0F0" : "none" }}>
                  <span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: u.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{u.name[0]}</div>
                  <span style={{ flex: 1, fontSize: 14, color: u.name === userName ? "#7B2FF2" : "#333", fontWeight: u.name === userName ? 700 : 400 }}>{u.name}</span>
                  <span style={{ fontSize: 13, color: "#999", fontWeight: 500 }}>{u.xp.toLocaleString()} XP</span>
                </div>
              ))}
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#7B2FF2", fontWeight: 600 }}>Liga: {state.league}</div>
          </div>

        </div>
        <div style={{ height: 20 }} /><NavBar />
      </div>
    );
  };


  const Lesson = () => {
    const lesson = LESSONS[state.currentLesson]; if (!lesson) return null; const q = lesson.questions[qIdx];
    const progress = lessonStep === "content" ? 0 : lessonStep === "done" ? 100 : ((qIdx + (answered ? 1 : 0)) / lesson.questions.length) * 100;
    return (
      <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
          <button onClick={() => setScreen("home")} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0F0F0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
          <div style={{ flex: 1, height: 8, background: "#F0F0F0", borderRadius: 4 }}><div style={{ height: "100%", width: Math.round(progress) + "%", background: "#7B2FF2", borderRadius: 4, transition: "width 0.4s" }} /></div>
          <div style={{ display: "flex", gap: 2 }}>{[0, 1, 2].map(i => <svg key={i} width="16" height="16" viewBox="0 0 16 16"><path d="M8 14s-6-4.35-6-8.5A3.5 3.5 0 018 3.28 3.5 3.5 0 0114 5.5C14 9.65 8 14 8 14z" fill={i < lives ? "#EF4444" : "#E5E5E5"} /></svg>)}</div>
        </div>
        <div style={{ flex: 1, padding: "0 24px", overflowY: "auto" }}>
          {lessonStep === "content" && <><div style={{ fontSize: 12, color: "#7B2FF2", fontWeight: 500, marginBottom: 8 }}>Lição {state.currentLesson + 1} de {LESSONS.length}</div><h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8, color: "#333" }}>{lesson.title}</h2><p style={{ fontSize: 15, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>{lesson.content}</p><div style={{ background: "#F5F3FF", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #E4E0F7" }}><div style={{ fontSize: 26, fontWeight: 500, color: "#7B2FF2", marginBottom: 4 }}>{lesson.highlight.number}</div><div style={{ fontSize: 13, color: "#6B5FA0" }}>{lesson.highlight.label}</div></div></>}
          {lessonStep === "quiz" && q && <><div style={{ fontSize: 12, color: "#7B2FF2", fontWeight: 500, marginBottom: 8 }}>Pergunta {qIdx + 1} de {lesson.questions.length}</div><h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: "#333" }}>{q.q}</h3>
            {q.opts.map((opt, i) => { let bg = "#fff", border = "1.5px solid #E5E5E5", col = "#333"; if (answered && i === q.correct) { bg = "#F0FDF4"; border = "1.5px solid #22C55E"; col = "#16A34A"; } else if (answered && i === selected && i !== q.correct) { bg = "#FEF2F2"; border = "1.5px solid #EF4444"; col = "#DC2626"; } else if (!answered && i === selected) { bg = "#F5F3FF"; border = "1.5px solid #7B2FF2"; col = "#7B2FF2"; } return (<button key={i} onClick={() => !answered && setSelected(i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", marginBottom: 10, borderRadius: 14, border, background: bg, cursor: answered ? "default" : "pointer", fontSize: 15, color: col, textAlign: "left" }}><span style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid " + col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>{opt}</button>); })}
            {answered && <div style={{ background: selected === q.correct ? "#F0FDF4" : "#FEF2F2", borderRadius: 14, padding: 16, marginTop: 8 }}><div style={{ fontSize: 15, fontWeight: 500, color: selected === q.correct ? "#16A34A" : "#DC2626", marginBottom: 4 }}>{selected === q.correct ? "Isso mesmo!" : "Não foi dessa vez"}</div><div style={{ fontSize: 13, color: selected === q.correct ? "#15803D" : "#991B1B" }}>{q.explain}{selected === q.correct && " +10 XP"}</div></div>}</>}
          {lessonStep === "done" && <div style={{ textAlign: "center", paddingTop: 40 }}><div style={{ fontSize: 64, marginBottom: 16, textAlign: "center" }}>🎉</div><h2 style={{ fontSize: 22, fontWeight: 500, color: "#333", marginBottom: 8 }}>Lição completa!</h2><div style={{ fontSize: 32, fontWeight: 500, color: "#7B2FF2", marginBottom: 8 }}>+{lessonXp + (lessonXp === 30 ? 20 : 0)} XP</div>{lessonXp === 30 && <div style={pillGreen}>Lição perfeita! +20 XP bônus</div>}<div style={{ fontSize: 14, color: "#999", marginTop: 16 }}>Streak: {state.streak} {state.streak === 1 ? "dia" : "dias"} 🔥</div></div>}
        </div>
        <div style={{ padding: "16px 24px 32px" }}>
          {lessonStep === "content" && <button style={btn} onClick={() => setLessonStep("quiz")}>Começar quiz</button>}
          {lessonStep === "quiz" && !answered && <button style={{ ...btn, opacity: selected === -1 ? 0.5 : 1 }} disabled={selected === -1} onClick={checkAnswer}>Verificar</button>}
          {lessonStep === "quiz" && answered && <button style={btn} onClick={nextQuestionWith3D}>Continuar</button>}
          {lessonStep === "done" && <button style={btn} onClick={() => setScreen("home")}>Voltar pro início</button>}
        </div>
      </div>
    );
  };

  const Goals = React.memo(() => {
    const [localGoalName, setLocalGoalName] = useState("");
    const [localGoalTarget, setLocalGoalTarget] = useState("");
    const [localShowForm, setLocalShowForm] = useState(false);
    const [customAmounts, setCustomAmounts] = useState({});

    const handleAddGoal = () => {
      if (!localGoalName || !localGoalTarget) return;
      const t = parseFloat(localGoalTarget);
      if (isNaN(t) || t <= 0) return;
      setState(prev => { const n = { ...prev, goals: [...prev.goals, { id: Date.now(), name: localGoalName, target: t, saved: 0, createdAt: Date.now() }] }; n.profileCompletion = calcProfile(n); save(n); return n; });
      setLocalGoalName(""); setLocalGoalTarget(""); setLocalShowForm(false);
    };

    return (
      <div style={{ background: "rgba(248,246,255,0.88)", minHeight: "100vh", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <div style={{ ...ph, paddingBottom: 24 }}>
          <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500, letterSpacing: 0.3 }}>Suas metas</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{state.goals.length} {state.goals.length === 1 ? "meta ativa" : "metas ativas"}</div>
        </div>
        <div style={{ padding: 16 }}>
          <button style={{ ...btn, marginBottom: 16 }} onClick={() => setLocalShowForm(true)}>+ Nova meta</button>
          {localShowForm && <div style={{ ...card, padding: 20 }}>
            <input style={{ ...input, marginBottom: 10 }} placeholder="Nome da meta" value={localGoalName} onChange={e => setLocalGoalName(e.target.value)} autoFocus />
            <input style={{ ...input, marginBottom: 12 }} placeholder="Valor alvo (R$)" type="number" value={localGoalTarget} onChange={e => setLocalGoalTarget(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btn, flex: 1 }} onClick={handleAddGoal}>Criar</button>
              <button style={{ ...btnOut, flex: 1 }} onClick={() => setLocalShowForm(false)}>Cancelar</button>
            </div>
          </div>}
          {state.goals.map(g => {
            const pct = Math.round((g.saved / g.target) * 100);
            const customVal = customAmounts[g.id] || "";
            return (
              <div key={g.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{g.name}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={pct >= 100 ? pillGreen : pill}>{pct >= 100 ? "Concluída!" : pct + "%"}</span>
                    <button onClick={() => { if(window.confirm("Excluir a meta '"+g.name+"'?")) deleteGoal(g.id); }} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:"#CCC",fontSize:16}} title="Excluir meta">✕</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>R$ {g.saved.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ {g.target.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <div style={{ background: "#EEEDFE", borderRadius: 4, height: 8, marginBottom: 12 }}>
                  <div style={{ background: pct >= 100 ? "#22C55E" : "#7B2FF2", borderRadius: 4, height: "100%", width: Math.min(100, pct) + "%", transition: "width 0.5s" }} />
                </div>
                {pct < 100 && <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {[50, 100, 200].map(v => <button key={v} onClick={() => addToGoal(g.id, v)} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "1.5px solid #E5E5E5", background: "#fff", fontSize: 13, cursor: "pointer", color: "#7B2FF2", fontWeight: 500 }}>+R$ {v}</button>)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...input, marginBottom: 0, flex: 1 }}
                      placeholder="Outro valor (R$)"
                      type="number"
                      value={customVal}
                      onChange={e => setCustomAmounts(prev => ({ ...prev, [g.id]: e.target.value }))}
                    />
                    <button onClick={() => {
                      const v = parseFloat(customVal);
                      if (!isNaN(v) && v > 0) { addToGoal(g.id, v); setCustomAmounts(prev => ({ ...prev, [g.id]: "" })); }
                    }} style={{ ...btn, width: "auto", padding: "12px 16px", flexShrink: 0, fontSize: 14 }}>+</button>
                  </div>
                </>}
              </div>
            );
          })}
        </div>
        <div style={{ height: 20 }} /><NavBar />
      </div>
    );
  });

  const Profile = React.memo(() => {
    const [localIncomeInput, setLocalIncomeInput] = useState("");
    const [localShowIncomeForm, setLocalShowIncomeForm] = useState(false);

    const handleSetIncome = () => {
      const v = parseFloat(localIncomeInput);
      if (isNaN(v) || v <= 0) return;
      setState(prev => { const n = { ...prev, income: v }; n.profileCompletion = calcProfile(n); save(n); return n; });
      setLocalShowIncomeForm(false); setLocalIncomeInput("");
      addXp(10, "Renda cadastrada");
    };

    return (
    <div style={{ background: "rgba(248,246,255,0.88)", minHeight: "100vh", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
      <div style={{ ...ph, paddingBottom: 24, textAlign: "center" }}>
        <div style={{ width: 90, height: 90, margin: "0 auto 12px" }} />
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>{userName}</div>
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{user.email}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4, fontWeight: 500 }}>Nível {state.level + 1} — {levelInfo.name}</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>{[["XP Total", state.xp.toLocaleString() + "⚡"], ["Streak", state.streak + " dias🔥"], ["Lições", state.completedLessons.length + "/" + LESSONS.length + "📖"], ["Liga", state.league + "🏆"]].map(([l, v]) => <div key={l} style={{ ...card, textAlign: "center", marginBottom: 0, padding: "14px 10px" }}><div style={{ fontSize: 10, color: "#BBB", fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>{l.toUpperCase()}</div><div style={{ fontSize: 17, fontWeight: 700, color: "#7B2FF2" }}>{v}</div></div>)}</div>
        <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>QUALIDADE DO PERFIL</div>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>Completude</span><span style={{ fontSize: 14, fontWeight: 700, color: "#7B2FF2" }}>{state.profileCompletion}%</span></div>
          <div style={{ background: "#EDE9FE", borderRadius: 8, height: 12 }}><div style={{ background: "linear-gradient(90deg,#6B21E8,#9B5FF7)", borderRadius: 8, height: "100%", width: state.profileCompletion + "%", transition: "width 0.6s ease", boxShadow: "0 2px 8px rgba(123,47,242,0.3)" }} /></div>
          <div style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
            {(state.receitas||[]).length === 0 ? <div style={{ marginBottom: 8, color: "#BBB" }}>⬜ Nenhuma receita cadastrada</div> : <div style={{ marginBottom: 8, color: "#16A34A", fontWeight: 500 }}>✅ {(state.receitas||[]).length} receita{(state.receitas||[]).length > 1 ? "s" : ""} cadastrada{(state.receitas||[]).length > 1 ? "s" : ""}</div>}
            <div style={{ color: state.debts.length > 0 ? "#16A34A" : "#BBB", marginBottom: 8, fontWeight: state.debts.length > 0 ? 500 : 400 }}>{state.debts.length > 0 ? "✅" : "⬜"} Dívidas cadastradas</div>
            <div style={{ color: state.goals.length > 0 ? "#16A34A" : "#BBB", marginBottom: 8, fontWeight: state.goals.length > 0 ? 500 : 400 }}>{state.goals.length > 0 ? "✅" : "⬜"} Metas ativas</div>
            <div style={{ color: state.expenses.length >= 7 ? "#16A34A" : "#BBB", fontWeight: state.expenses.length >= 7 ? 500 : 400 }}>{state.expenses.length >= 7 ? "✅" : "⬜"} 7+ gastos registrados</div>
          </div>
        </div>
        <button style={{ ...btnOut, marginBottom: 12 }} onClick={() => setScreen("receitas")}>
          💰 Gerenciar receitas
        </button>
        <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 8, marginTop: 16, letterSpacing: 1 }}>CONQUISTAS</div>
        <div style={card}>{[{ name: "Primeira lição", done: state.completedLessons.length >= 1, icon: "📖" }, { name: "Semana perfeita", done: state.streak >= 7, icon: "🔥" }, { name: "Detetive de gastos", done: state.expenses.length >= 50, icon: "🔍" }, { name: "Mês de ferro", done: state.streak >= 30, icon: "💪" }, { name: "Bola de neve", done: state.debts.some(d => d.paid >= d.total), icon: "⛄" }].map((a, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 4 ? "1px solid #F5F5F5" : "none", opacity: a.done ? 1 : 0.35 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: a.done ? "linear-gradient(135deg,#EDE9FE,#DDD6FE)" : "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{a.done ? a.icon : "🔒"}</div><span style={{ fontSize: 14, color: a.done ? "#333" : "#BBB", fontWeight: a.done ? 600 : 400, flex: 1 }}>{a.name}</span>{a.done && <span style={pillGreen}>✓</span>}</div>)}</div>
        <button style={{ ...btnOut, marginTop: 16, color: "#EF4444", borderColor: "#EF4444", boxShadow: "none" }} onClick={onSignOut}>Sair da conta</button>
      </div>
      <div style={{ height: 20 }} /><NavBar />
    </div>
  );});

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif", maxWidth: 430, margin: "0 auto", position: "relative", background: "#F2F0F8", minHeight: "100vh", color: "#1A0A2E" }}>
      <Toast />

      {/* ── MODO EXPANDIDO (fullscreen) ── */}
      {isExpanded && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "linear-gradient(160deg,#1A0A2E,#2D1458,#4C1D95)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          {/* canvas fixo é posicionado em fullscreen pelo hook */}
          {/* Botão fechar — sempre visível */}
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              position: "fixed", top: 20, left: "calc(50% - 215px)",
              width: 44, height: 44,
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              borderRadius: "50%",
              color: "#fff", cursor: "pointer", zIndex: 400,
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0,
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
        </div>
      )}

      {screen === "home" && <Home />}
      {screen === "trilha" && <TrilhaScreen state={state} styles={{ph,card}} startLesson={startLesson} NavBar={NavBar} />}
      {screen === "lesson" && <Lesson />}
      {screen === "receitas" && <ReceitasScreen state={state} styles={{ph,card,btn,btnOut,input,NavBar}} addReceita={addReceita} deleteReceita={deleteReceita} />}
      {screen === "expenses" && <ExpensesScreen
        state={state}
        styles={{ph,card,btn,btnOut,input,NavBar}}
        handlers={{updateExpenseCategory,deleteExpense,handleExcelUpload,handlePdfUpload,handleDetailFatura,confirmPdfImport,togglePdfItem,updatePdfItemCategory,addExpense,toggleOcultar}}
        filters={{monthFilter,setMonthFilter,catFilters,setCatFilters,customRange,setCustomRange,showCustomRange,setShowCustomRange,importStep,setImportStep,pdfParsing,pdfPreview,setPdfPreview,showExpenseForm,setShowExpenseForm,expName,setExpName,expAmount,setExpAmount,expCat,setExpCat,totalExpenses,rendaTotal,filterByMonth}}
      />}
      {screen === "debts" && <DebtsScreen state={state} styles={{ph,card,btn,btnOut,input}} addDebt={addDebt} deleteDebt={deleteDebt} NavBar={NavBar} />}
      {screen === "plano" && <PlanejamentoScreen state={state} styles={{ph,card,btn,btnOut,input,NavBar}} setScreen={setScreen} savePlano={savePlano} />}
      {screen === "goals" && <Goals />}
      {screen === "diagnostico" && <DiagnosticoScreen state={state} styles={{ph,card,btn,btnOut,input,NavBar}} setScreen={setScreen} />}
      {screen === "profile" && <Profile />}

    </div>
  );

}
