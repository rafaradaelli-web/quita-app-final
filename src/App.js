import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

const LESSONS = [
  {
    id: 1, title: "Raio-X da dívida", subtitle: "Mapeie todas as suas dívidas", xp: 30, theme: "divida",
    content: "Você sabe exatamente quanto deve? A maioria dos brasileiros não sabe. O primeiro passo pra sair das dívidas não é pagar nada — é anotar tudo. Cada dívida: pra quem deve, quanto, qual o juros, e a parcela mínima.",
    highlight: { number: "80,2% das famílias", label: "têm alguma dívida. Você não está sozinho." },
    questions: [
      { q: "Qual é o primeiro passo pra sair das dívidas?", opts: ["Cortar o cartão", "Anotar todas as dívidas", "Pegar empréstimo"], correct: 1, explain: "Antes de qualquer ação, saiba o tamanho do problema." },
      { q: "O que anotar sobre cada dívida?", opts: ["Só o valor total", "Credor, valor, juros e parcela", "Só o nome do banco"], correct: 1, explain: "Cada detalhe importa. O juros define a urgência." },
      { q: "Qual % de famílias tem dívida?", opts: ["Cerca de 50%", "Cerca de 65%", "Mais de 80%"], correct: 2, explain: "80,2%! Você não está sozinho nessa." },
    ]
  },
  {
    id: 2, title: "Juros compostos", subtitle: "O inimigo silencioso", xp: 30, theme: "divida",
    content: "R$ 1.000 no cartão a 15%/mês. Se não pagar, no mês seguinte são R$ 1.150. Depois R$ 1.322. Em 12 meses: R$ 5.350. Juros sobre juros — sua dívida acelera. Pagar só o mínimo é armadilha.",
    highlight: { number: "R$ 1.000 → R$ 5.350", label: "em 12 meses com juros de cartão." },
    questions: [
      { q: "O que são juros compostos?", opts: ["Juros fixos", "Juros sobre o valor original", "Juros sobre juros"], correct: 2, explain: "Juros sobre o valor atualizado — por isso acelera." },
      { q: "R$ 1.000 a 15%/mês vira quanto em 1 ano?", opts: ["R$ 2.800", "R$ 5.350", "R$ 1.500"], correct: 1, explain: "Multiplica por 5x em 12 meses!" },
      { q: "Por que o mínimo do cartão é perigoso?", opts: ["Banco cancela", "Juros crescem no saldo", "Perde pontos"], correct: 1, explain: "O restante rende juros compostos todo mês." },
    ]
  },
  {
    id: 3, title: "Método bola de neve", subtitle: "Quite dívidas mais rápido", xp: 30, theme: "divida",
    content: "3 dívidas: R$ 300, R$ 1.200 e R$ 4.000. Pague o mínimo em todas e jogue tudo extra na menor. Quando quitar, use o valor livre pra próxima. Vitórias rápidas = motivação.",
    highlight: { number: "3 dívidas → 0", label: "Pague a menor primeiro, use o valor pra próxima." },
    questions: [
      { q: "No bola de neve, qual pagar primeiro?", opts: ["Maior valor", "Menor valor", "Mais antiga"], correct: 1, explain: "Menor = quitada rápido = motivação!" },
      { q: "Quitou a de R$ 300. E agora?", opts: ["Guardar na poupança", "Comemorar gastando", "Somar na próxima dívida"], correct: 2, explain: "Soma ao pagamento da próxima. A bola cresce." },
      { q: "Por que bola de neve > avalanche?", opts: ["Economiza mais juros", "Vitórias rápidas motivam", "Bancos dão desconto"], correct: 1, explain: "Matematicamente o avalanche é melhor, mas a maioria desiste." },
    ]
  },
  {
    id: 4, title: "Pra onde vai seu dinheiro", subtitle: "Encontre gastos invisíveis", xp: 30, theme: "gastos",
    content: "R$ 15 no café, R$ 25 no delivery, R$ 12 no app. Parecem nada, somam R$ 500+/mês. Anote tudo por 1 semana e descubra pelo menos R$ 200/mês em gastos que nem sabia.",
    highlight: { number: "R$ 200+/mês", label: "em gastos invisíveis que a maioria descobre." },
    questions: [
      { q: "Melhor forma de saber pra onde vai o dinheiro?", opts: ["Extrato no fim do mês", "Anotar cada gasto por 1 semana", "Lembrar de cabeça"], correct: 1, explain: "Anotar em tempo real é muito mais preciso." },
      { q: "Por que gastos pequenos são perigosos?", opts: ["Banco cobra taxa", "Somam muito no mês", "São desnecessários"], correct: 1, explain: "R$ 15 aqui, R$ 25 ali = R$ 500+/mês." },
      { q: "Quanto se descobre em gastos invisíveis?", opts: ["Menos de R$ 50", "Mais de R$ 200", "Nada"], correct: 1, explain: "R$ 200+ por mês! Dinheiro que pode ir pra meta." },
    ]
  },
  {
    id: 5, title: "A regra 50-30-20", subtitle: "A regra de ouro", xp: 30, theme: "gastos",
    content: "50% necessidades (aluguel, luz, mercado). 30% desejos (delivery, streaming). 20% futuro (dívidas, reserva). Ganha R$ 3.000? = R$ 1.500 + R$ 900 + R$ 600. Não consegue 20%? Comece com 5%.",
    highlight: { number: "50 | 30 | 20", label: "Necessidades | Desejos | Futuro" },
    questions: [
      { q: "Na regra 50-30-20, necessidades =", opts: ["20%", "30%", "50%"], correct: 2, explain: "Metade da renda vai pra essenciais." },
      { q: "Delivery e streaming são:", opts: ["Necessidades (50%)", "Desejos (30%)", "Futuro (20%)"], correct: 1, explain: "Coisas que quer, mas poderia viver sem." },
      { q: "Não consigo 20%. O que fazer?", opts: ["Desistir", "Começar com 5% ou 10%", "Esperar ganhar mais"], correct: 1, explain: "Qualquer valor > zero. O hábito importa mais." },
    ]
  },
];

const CATEGORIES = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Educação", "Delivery", "Assinaturas", "Outros"];

const initState = () => {
  try {
    const saved = localStorage.getItem("quita_state");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    xp: 0, streak: 0, lastActiveDate: null, level: 1,
    completedLessons: [], currentLesson: 0,
    expenses: [], goals: [{ id: 1, name: "Quitar cartão", target: 2000, saved: 0, createdAt: Date.now() }],
    debts: [{ id: 1, name: "Cartão Nubank", total: 2000, paid: 0, rate: 15 }],
    achievements: [], weeklyXp: 0, league: "Bronze",
    profileCompletion: 25, income: 0,
  };
};

const LEVELS = [
  { name: "Perdido", xp: 0 }, { name: "Curioso", xp: 200 }, { name: "Consciente", xp: 600 },
  { name: "Focado", xp: 1200 }, { name: "Organizado", xp: 2500 }, { name: "Estratégico", xp: 5000 },
  { name: "Livre", xp: 10000 }, { name: "Mestre", xp: 20000 },
];

const getLevel = (xp) => {
  let lvl = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) { if (xp >= LEVELS[i].xp) { lvl = i; break; } }
  return lvl;
};

const calcProfile = (s) => {
  let p = 0;
  if (s.income > 0) p += 15;
  if (s.debts.length > 0) p += 15;
  if (s.goals.length > 0) p += 10;
  const recent7 = s.expenses.filter(e => Date.now() - e.date < 7 * 86400000).length;
  p += Math.min(20, recent7 * 4);
  const recent30 = s.expenses.filter(e => Date.now() - e.date < 30 * 86400000).length;
  p += Math.min(25, recent30 * 2.5);
  const cats = new Set(s.expenses.map(e => e.category)).size;
  p += Math.min(15, cats * 5);
  return Math.min(100, Math.round(p));
};

export default function QuitaApp() {
  const [state, setState] = useState(initState);
  const [screen, setScreen] = useState("home");
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
  const [excelPreview, setExcelPreview] = useState(null);
  const [excelMapping, setExcelMapping] = useState({ name: "", amount: "", category: "", date: "" });
  const [importStep, setImportStep] = useState(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);

  const save = useCallback((s) => { try { localStorage.setItem("quita_state", JSON.stringify(s)); } catch(e) {} }, []);

  const addXp = useCallback((amount, msg) => {
    setState(prev => {
      const n = { ...prev, xp: prev.xp + amount, weeklyXp: prev.weeklyXp + amount };
      n.level = getLevel(n.xp);
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
    if (msg) { setToast(`+${amount} XP — ${msg}`); setTimeout(() => setToast(null), 2500); }
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

  useEffect(() => { checkStreak(); }, [checkStreak]);

  const startLesson = (idx) => {
    setScreen("lesson"); setLessonStep("content"); setQIdx(0);
    setSelected(-1); setAnswered(false); setLives(3); setLessonXp(0);
    setState(p => ({ ...p, currentLesson: idx }));
  };

  const nextQuestion = () => {
    const lesson = LESSONS[state.currentLesson];
    if (qIdx < lesson.questions.length - 1) {
      setQIdx(q => q + 1); setSelected(-1); setAnswered(false);
    } else {
      const perfect = lessonXp === 30;
      const bonus = perfect ? 20 : 0;
      const totalXp = lessonXp + bonus;
      addXp(totalXp, perfect ? "Lição perfeita!" : "Lição completa!");
      addXp(15, "Streak mantido");
      setState(p => {
        const cl = [...p.completedLessons];
        if (!cl.includes(lesson.id)) cl.push(lesson.id);
        const n = { ...p, completedLessons: cl };
        save(n);
        return n;
      });
      setLessonStep("done");
    }
  };

  const checkAnswer = () => {
    const lesson = LESSONS[state.currentLesson];
    const q = lesson.questions[qIdx];
    setAnswered(true);
    if (selected === q.correct) {
      setLessonXp(x => x + 10);
    } else {
      setLives(l => l - 1);
    }
  };

  const addExpense = () => {
    if (!expName || !expAmount) return;
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    setState(prev => {
      const n = { ...prev, expenses: [...prev.expenses, { id: Date.now(), name: expName, amount: amt, category: expCat, date: Date.now() }] };
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
    addXp(5, "Gasto registrado");
    checkStreak();
    setExpName(""); setExpAmount(""); setShowExpenseForm(false);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (data.length === 0) { setToast("Planilha vazia"); setTimeout(() => setToast(null), 2500); return; }
        const cols = Object.keys(data[0]);
        const guessName = cols.find(c => /descr|nome|item|gasto|detalh/i.test(c)) || cols[0];
        const guessAmount = cols.find(c => /valor|amount|preco|preço|total|quantia/i.test(c)) || cols[1] || "";
        const guessCat = cols.find(c => /categ|tipo|class/i.test(c)) || "";
        const guessDate = cols.find(c => /data|date|dia|quando/i.test(c)) || "";
        setExcelMapping({ name: guessName, amount: guessAmount, category: guessCat, date: guessDate });
        setExcelPreview({ data, cols });
        setImportStep("mapping");
      } catch (err) {
        setToast("Erro ao ler arquivo"); setTimeout(() => setToast(null), 2500);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const parseExcelDate = (val) => {
    if (!val) return Date.now();
    if (typeof val === "number") {
      const d = new Date((val - 25569) * 86400000);
      return isNaN(d.getTime()) ? Date.now() : d.getTime();
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  };

  const confirmImport = () => {
    if (!excelPreview || !excelMapping.name || !excelMapping.amount) return;
    const newExpenses = [];
    let imported = 0;
    excelPreview.data.forEach((row, i) => {
      const name = String(row[excelMapping.name] || "").trim();
      const rawAmt = row[excelMapping.amount];
      const amt = parseFloat(String(rawAmt).replace(/[^\d.,\-]/g, "").replace(",", "."));
      if (!name || isNaN(amt) || amt <= 0) return;
      let cat = "Outros";
      if (excelMapping.category && row[excelMapping.category]) {
        const rc = String(row[excelMapping.category]).trim();
        const match = CATEGORIES.find(c => c.toLowerCase() === rc.toLowerCase());
        cat = match || rc;
      }
      const date = excelMapping.date ? parseExcelDate(row[excelMapping.date]) : Date.now();
      newExpenses.push({ id: Date.now() + i, name, amount: amt, category: cat, date });
      imported++;
    });
    if (imported === 0) { setToast("Nenhum gasto válido encontrado"); setTimeout(() => setToast(null), 2500); return; }
    setState(prev => {
      const n = { ...prev, expenses: [...prev.expenses, ...newExpenses] };
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
    const xpGained = Math.min(imported * 5, 50);
    addXp(xpGained, `${imported} gastos importados!`);
    checkStreak();
    setExcelPreview(null); setImportStep(null);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setPdfParsing(true);
    setImportStep("pdf-loading");

    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Erro ao ler arquivo"));
        r.readAsDataURL(file);
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 }
              },
              {
                type: "text",
                text: `Analise este PDF (fatura de cartão, extrato bancário ou lista de gastos) e extraia TODOS os gastos/transações encontrados.

Responda APENAS com um JSON válido, sem markdown, sem backticks, sem texto adicional. O formato deve ser:
{"expenses": [{"name": "descrição do gasto", "amount": 99.90, "category": "Categoria", "date": "2026-03-15"}]}

Regras:
- "amount" deve ser um número positivo (sem R$, sem vírgula como decimal — use ponto)
- "category" deve ser UMA dessas: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Delivery, Assinaturas, Outros
- "date" no formato YYYY-MM-DD. Se não tiver data, use "2026-03-29"
- Ignore pagamentos, créditos ou estornos — só gastos/compras
- "name" deve ser a descrição da transação, limpa e legível
- Se não encontrar gastos, retorne {"expenses": []}`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.expenses && parsed.expenses.length > 0) {
        setPdfPreview(parsed.expenses.map((exp, i) => ({
          ...exp,
          id: Date.now() + i,
          amount: Math.abs(parseFloat(exp.amount)) || 0,
          selected: true
        })));
        setImportStep("pdf-preview");
      } else {
        setToast("Nenhum gasto encontrado no PDF");
        setTimeout(() => setToast(null), 2500);
        setImportStep(null);
      }
    } catch (err) {
      console.error(err);
      setToast("Erro ao processar PDF. Tente novamente.");
      setTimeout(() => setToast(null), 2500);
      setImportStep(null);
    }
    setPdfParsing(false);
  };

  const togglePdfItem = (idx) => {
    setPdfPreview(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const updatePdfItemCategory = (idx, cat) => {
    setPdfPreview(prev => prev.map((item, i) => i === idx ? { ...item, category: cat } : item));
  };

  const confirmPdfImport = () => {
    if (!pdfPreview) return;
    const selected = pdfPreview.filter(e => e.selected && e.amount > 0);
    if (selected.length === 0) { setToast("Selecione pelo menos 1 gasto"); setTimeout(() => setToast(null), 2500); return; }
    const newExpenses = selected.map((e, i) => ({
      id: Date.now() + i,
      name: e.name,
      amount: e.amount,
      category: CATEGORIES.includes(e.category) ? e.category : "Outros",
      date: e.date ? new Date(e.date).getTime() || Date.now() : Date.now()
    }));
    setState(prev => {
      const n = { ...prev, expenses: [...prev.expenses, ...newExpenses] };
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
    const xpGained = Math.min(selected.length * 5, 50);
    addXp(xpGained, `${selected.length} gastos importados via PDF!`);
    checkStreak();
    setPdfPreview(null); setImportStep(null);
  };

  const addGoal = () => {
    if (!goalName || !goalTarget) return;
    const t = parseFloat(goalTarget);
    if (isNaN(t) || t <= 0) return;
    setState(prev => {
      const n = { ...prev, goals: [...prev.goals, { id: Date.now(), name: goalName, target: t, saved: 0, createdAt: Date.now() }] };
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
    setGoalName(""); setGoalTarget(""); setShowGoalForm(false);
  };

  const setIncome = () => {
    const v = parseFloat(incomeInput);
    if (isNaN(v) || v <= 0) return;
    setState(prev => { const n = { ...prev, income: v }; n.profileCompletion = calcProfile(n); save(n); return n; });
    setShowIncomeForm(false); setIncomeInput("");
    addXp(10, "Renda cadastrada");
  };

  const addToGoal = (gid, amount) => {
    setState(prev => {
      const goals = prev.goals.map(g => g.id === gid ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g);
      const goal = goals.find(g => g.id === gid);
      const n = { ...prev, goals };
      if (goal && goal.saved >= goal.target) { addXp(300, "Meta atingida!"); }
      save(n);
      return n;
    });
  };

  const totalExpenses = state.expenses.filter(e => Date.now() - e.date < 30 * 86400000).reduce((s, e) => s + e.amount, 0);
  const levelInfo = LEVELS[state.level];
  const nextLevel = LEVELS[state.level + 1];
  const levelProgress = nextLevel ? ((state.xp - levelInfo.xp) / (nextLevel.xp - levelInfo.xp)) * 100 : 100;

  const ph = { background: "#7B2FF2", color: "#fff", padding: "16px 20px 20px", borderRadius: "0 0 24px 24px" };
  const card = { background: "white", borderRadius: 16, padding: "16px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" };
  const btn = { background: "#7B2FF2", color: "#fff", border: "none", borderRadius: 14, padding: "14px", width: "100%", fontSize: 16, fontWeight: 500, cursor: "pointer" };
  const btnOut = { ...btn, background: "transparent", color: "#7B2FF2", border: "2px solid #7B2FF2" };
  const pill = { background: "#EEEDFE", color: "#7B2FF2", borderRadius: 12, padding: "4px 12px", fontSize: 12, fontWeight: 500 };
  const pillGreen = { ...pill, background: "#DCFCE7", color: "#16A34A" };
  const input = { width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid #E5E5E5", fontSize: 15, outline: "none", boxSizing: "border-box" };
  const nav = { display: "flex", justifyContent: "space-around", padding: "10px 0 24px", background: "#fff", borderTop: "1px solid #F0F0F0", position: "sticky", bottom: 0 };
  const navItem = (active) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, color: active ? "#7B2FF2" : "#999", cursor: "pointer", border: "none", background: "none" });

  const NavBar = () => (
    <div style={nav}>
      {[["home", "Início", "M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"],
        ["expenses", "Gastos", "M4 6h16M4 12h10M4 18h14"],
        ["goals", "Metas", "M12 8v4l2.5 2.5M12 3a9 9 0 100 18 9 9 0 000-18z"],
        ["profile", "Perfil", "M12 12a4 4 0 100-8 4 4 0 000 8zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"]
      ].map(([id, label, d]) => (
        <button key={id} style={navItem(screen === id)} onClick={() => setScreen(id)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  const Toast = () => toast ? (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#7B2FF2", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 14, fontWeight: 500, zIndex: 99, animation: "fadeIn .3s", boxShadow: "0 4px 12px rgba(123,47,242,0.3)" }}>{toast}</div>
  ) : null;

  // HOME
  const Home = () => (
    <div style={{ background: "#F8F8F8", minHeight: "100vh" }}>
      <div style={ph}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>Boa noite</div>
        <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 12 }}>Jogador</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px", fontSize: 13 }}>🔥 {state.streak} {state.streak === 1 ? "dia" : "dias"}</span>
          <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 14, padding: "4px 12px", fontSize: 12, marginLeft: "auto" }}>{state.xp.toLocaleString()} XP</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Nível {state.level + 1} — {levelInfo.name}</div>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, height: 6, marginTop: 6 }}>
          <div style={{ background: "#fff", borderRadius: 4, height: "100%", width: `${Math.round(levelProgress)}%`, transition: "width 0.5s" }}/>
        </div>
        {nextLevel && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{nextLevel.xp - state.xp} XP pro nível {state.level + 2}</div>}
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 12, color: "#999", fontWeight: 500, marginBottom: 8, letterSpacing: 0.5 }}>QUALIDADE DO PERFIL</div>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#666" }}>Seu perfil</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#7B2FF2" }}>{state.profileCompletion}%</span>
          </div>
          <div style={{ background: "#EEEDFE", borderRadius: 4, height: 8 }}>
            <div style={{ background: "#7B2FF2", borderRadius: 4, height: "100%", width: `${state.profileCompletion}%`, transition: "width 0.5s" }}/>
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            {state.profileCompletion < 50 ? "Registre mais dados pra ativar o Coach IA" : state.profileCompletion < 75 ? "Coach IA disponível! Quase lá." : "Perfil excelente!"}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#999", fontWeight: 500, marginBottom: 8, letterSpacing: 0.5 }}>TRILHA DO DIA</div>
        {LESSONS.map((l, i) => {
          const done = state.completedLessons.includes(l.id);
          const current = !done && state.completedLessons.length === i;
          const locked = !done && !current;
          return (
            <div key={l.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14, opacity: locked ? 0.5 : 1, cursor: locked ? "default" : "pointer" }}
              onClick={() => !locked && startLesson(i)}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: done ? "#22C55E" : current ? "#7B2FF2" : "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done ? <svg width="20" height="20" viewBox="0 0 20 20"><path d="M6 10l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : current ? <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="8" width="12" height="8" rx="2" stroke="#999" strokeWidth="1.5" fill="none"/><path d="M6 8V5a3 3 0 016 0v3" stroke="#999" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{l.title}</div>
                <div style={{ fontSize: 13, color: "#999" }}>{l.subtitle}</div>
              </div>
              <span style={done ? pillGreen : pill}>{done ? "✓ 30 XP" : `+${l.xp} XP`}</span>
            </div>
          );
        })}

        <div style={{ fontSize: 12, color: "#999", fontWeight: 500, marginBottom: 8, marginTop: 8, letterSpacing: 0.5 }}>RANKING SEMANAL</div>
        <div style={card}>
          {[{ name: "Lucas", xp: 2180, color: "#FF9500" }, { name: "Você", xp: state.weeklyXp, color: "#7B2FF2" }, { name: "Ana", xp: 980, color: "#22C55E" }]
            .sort((a, b) => b.xp - a.xp)
            .map((u, i) => (
              <div key={u.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid #F0F0F0" : "none" }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#999", width: 20, textAlign: "center" }}>{i + 1}</span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: u.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 500 }}>{u.name[0]}</div>
                <span style={{ flex: 1, fontSize: 14, color: u.name === "Você" ? "#7B2FF2" : "#333", fontWeight: u.name === "Você" ? 500 : 400 }}>{u.name}</span>
                <span style={{ fontSize: 13, color: "#999", fontWeight: 500 }}>{u.xp.toLocaleString()} XP</span>
              </div>
            ))}
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#7B2FF2" }}>Liga: {state.league}</div>
        </div>
      </div>
      <div style={{ height: 20 }}/>
      <NavBar/>
    </div>
  );

  // LESSON
  const Lesson = () => {
    const lesson = LESSONS[state.currentLesson];
    if (!lesson) return null;
    const q = lesson.questions[qIdx];
    const progress = lessonStep === "content" ? 0 : lessonStep === "done" ? 100 : ((qIdx + (answered ? 1 : 0)) / lesson.questions.length) * 100;

    return (
      <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
          <button onClick={() => setScreen("home")} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0F0F0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <div style={{ flex: 1, height: 8, background: "#F0F0F0", borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${Math.round(progress)}%`, background: "#7B2FF2", borderRadius: 4, transition: "width 0.4s" }}/>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {[0, 1, 2].map(i => (
              <svg key={i} width="16" height="16" viewBox="0 0 16 16"><path d="M8 14s-6-4.35-6-8.5A3.5 3.5 0 018 3.28 3.5 3.5 0 0114 5.5C14 9.65 8 14 8 14z" fill={i < lives ? "#EF4444" : "#E5E5E5"}/></svg>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, padding: "0 24px", overflowY: "auto" }}>
          {lessonStep === "content" && (
            <>
              <div style={{ fontSize: 12, color: "#7B2FF2", fontWeight: 500, marginBottom: 8 }}>Lição {state.currentLesson + 1} de {LESSONS.length}</div>
              <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8, color: "#333" }}>{lesson.title}</h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>{lesson.content}</p>
              <div style={{ background: "#F5F3FF", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #E4E0F7" }}>
                <div style={{ fontSize: 26, fontWeight: 500, color: "#7B2FF2", marginBottom: 4 }}>{lesson.highlight.number}</div>
                <div style={{ fontSize: 13, color: "#6B5FA0" }}>{lesson.highlight.label}</div>
              </div>
            </>
          )}

          {lessonStep === "quiz" && q && (
            <>
              <div style={{ fontSize: 12, color: "#7B2FF2", fontWeight: 500, marginBottom: 8 }}>Pergunta {qIdx + 1} de {lesson.questions.length}</div>
              <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: "#333" }}>{q.q}</h3>
              {q.opts.map((opt, i) => {
                let bg = "#fff", border = "1.5px solid #E5E5E5", col = "#333";
                if (answered && i === q.correct) { bg = "#F0FDF4"; border = "1.5px solid #22C55E"; col = "#16A34A"; }
                else if (answered && i === selected && i !== q.correct) { bg = "#FEF2F2"; border = "1.5px solid #EF4444"; col = "#DC2626"; }
                else if (!answered && i === selected) { bg = "#F5F3FF"; border = "1.5px solid #7B2FF2"; col = "#7B2FF2"; }
                return (
                  <button key={i} onClick={() => !answered && setSelected(i)}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", marginBottom: 10, borderRadius: 14, border, background: bg, cursor: answered ? "default" : "pointer", fontSize: 15, color: col, textAlign: "left" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
              {answered && (
                <div style={{ background: selected === q.correct ? "#F0FDF4" : "#FEF2F2", borderRadius: 14, padding: 16, marginTop: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: selected === q.correct ? "#16A34A" : "#DC2626", marginBottom: 4 }}>
                    {selected === q.correct ? "Isso mesmo!" : "Não foi dessa vez"}
                  </div>
                  <div style={{ fontSize: 13, color: selected === q.correct ? "#15803D" : "#991B1B" }}>{q.explain} {selected === q.correct && "+10 XP"}</div>
                </div>
              )}
            </>
          )}

          {lessonStep === "done" && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 500, color: "#333", marginBottom: 8 }}>Lição completa!</h2>
              <div style={{ fontSize: 32, fontWeight: 500, color: "#7B2FF2", marginBottom: 8 }}>+{lessonXp + (lessonXp === 30 ? 20 : 0)} XP</div>
              {lessonXp === 30 && <div style={pillGreen}>Lição perfeita! +20 XP bônus</div>}
              <div style={{ fontSize: 14, color: "#999", marginTop: 16 }}>Streak: {state.streak} {state.streak === 1 ? "dia" : "dias"} 🔥</div>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px 32px" }}>
          {lessonStep === "content" && <button style={btn} onClick={() => setLessonStep("quiz")}>Começar quiz</button>}
          {lessonStep === "quiz" && !answered && <button style={{ ...btn, opacity: selected === -1 ? 0.5 : 1 }} disabled={selected === -1} onClick={checkAnswer}>Verificar</button>}
          {lessonStep === "quiz" && answered && <button style={btn} onClick={nextQuestion}>Continuar</button>}
          {lessonStep === "done" && <button style={btn} onClick={() => setScreen("home")}>Voltar pro início</button>}
        </div>
      </div>
    );
  };

  // EXPENSES
  const Expenses = () => (
    <div style={{ background: "#F8F8F8", minHeight: "100vh" }}>
      <div style={{ ...ph, paddingBottom: 24 }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>Gastos do mês</div>
        <div style={{ fontSize: 28, fontWeight: 500 }}>R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        {state.income > 0 && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{Math.round((totalExpenses / state.income) * 100)}% da renda</div>}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button style={{ ...btn, flex: 1, fontSize: 14, padding: "12px 8px" }} onClick={() => setShowExpenseForm(true)}>+ Registrar gasto</button>
          <label style={{ ...btnOut, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "12px 8px", fontSize: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ marginRight: 4 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/></svg>
            Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: "none" }}/>
          </label>
          <label style={{ ...btnOut, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: pdfParsing ? "wait" : "pointer", padding: "12px 8px", fontSize: 14, opacity: pdfParsing ? 0.6 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ marginRight: 4 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>
            {pdfParsing ? "Lendo..." : "PDF"}
            <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={pdfParsing} style={{ display: "none" }}/>
          </label>
        </div>
        {!importStep && !showExpenseForm && (
          <div style={{ fontSize: 12, color: "#999", textAlign: "center", marginBottom: 14 }}>Importe fatura do cartão ou extrato bancário em PDF — a IA categoriza automaticamente</div>
        )}

        {importStep === "pdf-loading" && (
          <div style={{ ...card, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🐷</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#333", marginBottom: 4 }}>Analisando seu PDF...</div>
            <div style={{ fontSize: 13, color: "#999" }}>O porquinho tá lendo cada linha da sua fatura</div>
            <div style={{ marginTop: 16, height: 6, background: "#EEEDFE", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#7B2FF2", borderRadius: 3, width: "60%", animation: "loading 1.5s ease-in-out infinite alternate" }}/>
            </div>
            <style>{`@keyframes loading { from { width: 20%; margin-left: 0; } to { width: 60%; margin-left: 40%; } }`}</style>
          </div>
        )}

        {importStep === "pdf-preview" && pdfPreview && (
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🐷</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#333" }}>Gastos encontrados!</span>
            </div>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
              Encontrei {pdfPreview.length} gastos. Desmarque os que não quiser importar:
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 14 }}>
              {pdfPreview.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F0F0F0" }}>
                  <button onClick={() => togglePdfItem(i)}
                    style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${item.selected ? "#7B2FF2" : "#DDD"}`, background: item.selected ? "#7B2FF2" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                    {item.selected && <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 8l4 4 6-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: item.selected ? "#333" : "#BBB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <select value={item.category}
                      onChange={e => updatePdfItemCategory(i, e.target.value)}
                      style={{ fontSize: 11, color: "#7B2FF2", background: "#EEEDFE", border: "none", borderRadius: 6, padding: "2px 6px", marginTop: 2, cursor: "pointer" }}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: item.selected ? "#7B2FF2" : "#BBB", whiteSpace: "nowrap" }}>
                    R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ background: "#F5F3FF", borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#6B5FA0" }}>{pdfPreview.filter(e => e.selected).length} selecionados</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#7B2FF2" }}>
                R$ {pdfPreview.filter(e => e.selected).reduce((s, e) => s + e.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btn, flex: 1 }} onClick={confirmPdfImport}>
                Importar ({pdfPreview.filter(e => e.selected).length} gastos)
              </button>
              <button style={{ ...btnOut, flex: 1 }} onClick={() => { setPdfPreview(null); setImportStep(null); }}>Cancelar</button>
            </div>
          </div>
        )}

        {importStep === "mapping" && excelPreview && (
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#333", marginBottom: 4 }}>Mapear colunas</div>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>{excelPreview.data.length} linhas encontradas. Diga qual coluna é o quê:</div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Descrição do gasto *</label>
              <select style={input} value={excelMapping.name} onChange={e => setExcelMapping(m => ({ ...m, name: e.target.value }))}>
                <option value="">Selecione...</option>
                {excelPreview.cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Valor (R$) *</label>
              <select style={input} value={excelMapping.amount} onChange={e => setExcelMapping(m => ({ ...m, amount: e.target.value }))}>
                <option value="">Selecione...</option>
                {excelPreview.cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Categoria (opcional)</label>
              <select style={input} value={excelMapping.category} onChange={e => setExcelMapping(m => ({ ...m, category: e.target.value }))}>
                <option value="">Nenhuma — usar "Outros"</option>
                {excelPreview.cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 4 }}>Data (opcional)</label>
              <select style={input} value={excelMapping.date} onChange={e => setExcelMapping(m => ({ ...m, date: e.target.value }))}>
                <option value="">Nenhuma — usar data de hoje</option>
                {excelPreview.cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ background: "#F5F3FF", borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#7B2FF2", marginBottom: 8 }}>Prévia (primeiras 3 linhas)</div>
              {excelPreview.data.slice(0, 3).map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B5FA0", padding: "3px 0", borderBottom: i < 2 ? "1px solid #E4E0F7" : "none" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{excelMapping.name ? row[excelMapping.name] : "—"}</span>
                  <span style={{ fontWeight: 500, marginLeft: 8 }}>{excelMapping.amount ? `R$ ${row[excelMapping.amount]}` : "—"}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btn, flex: 1, opacity: (!excelMapping.name || !excelMapping.amount) ? 0.5 : 1 }}
                disabled={!excelMapping.name || !excelMapping.amount}
                onClick={confirmImport}>
                Importar {excelPreview.data.length} gastos
              </button>
              <button style={{ ...btnOut, flex: 1 }} onClick={() => { setImportStep(null); setExcelPreview(null); }}>Cancelar</button>
            </div>
          </div>
        )}

        {showExpenseForm && (
          <div style={{ ...card, padding: 20 }}>
            <input style={{ ...input, marginBottom: 10 }} placeholder="O que gastou?" value={expName} onChange={e => setExpName(e.target.value)}/>
            <input style={{ ...input, marginBottom: 10 }} placeholder="Quanto? (R$)" type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)}/>
            <select style={{ ...input, marginBottom: 12 }} value={expCat} onChange={e => setExpCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btn, flex: 1 }} onClick={addExpense}>Salvar (+5 XP)</button>
              <button style={{ ...btnOut, flex: 1 }} onClick={() => setShowExpenseForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {CATEGORIES.map(cat => {
          const catExpenses = state.expenses.filter(e => e.category === cat && Date.now() - e.date < 30 * 86400000);
          if (catExpenses.length === 0) return null;
          const catTotal = catExpenses.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={cat} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{cat}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: "#7B2FF2" }}>R$ {catTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              {catExpenses.slice(-3).reverse().map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#999", padding: "4px 0" }}>
                  <span>{e.name}</span>
                  <span>R$ {e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          );
        })}
        {state.expenses.length === 0 && !importStep && <div style={{ textAlign: "center", color: "#999", padding: 40, fontSize: 14 }}>Nenhum gasto registrado ainda. Registre manualmente ou importe uma planilha!</div>}
      </div>
      <div style={{ height: 20 }}/>
      <NavBar/>
    </div>
  );

  // GOALS
  const Goals = () => (
    <div style={{ background: "#F8F8F8", minHeight: "100vh" }}>
      <div style={{ ...ph, paddingBottom: 24 }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>Suas metas</div>
        <div style={{ fontSize: 22, fontWeight: 500 }}>{state.goals.length} {state.goals.length === 1 ? "meta ativa" : "metas ativas"}</div>
      </div>
      <div style={{ padding: 16 }}>
        <button style={{ ...btn, marginBottom: 16 }} onClick={() => setShowGoalForm(true)}>+ Nova meta</button>

        {showGoalForm && (
          <div style={{ ...card, padding: 20 }}>
            <input style={{ ...input, marginBottom: 10 }} placeholder="Nome da meta (ex: Quitar cartão)" value={goalName} onChange={e => setGoalName(e.target.value)}/>
            <input style={{ ...input, marginBottom: 12 }} placeholder="Valor alvo (R$)" type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}/>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btn, flex: 1 }} onClick={addGoal}>Criar meta</button>
              <button style={{ ...btnOut, flex: 1 }} onClick={() => setShowGoalForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {state.goals.map(g => {
          const pct = Math.round((g.saved / g.target) * 100);
          return (
            <div key={g.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{g.name}</span>
                <span style={pct >= 100 ? pillGreen : pill}>{pct >= 100 ? "Concluída!" : `${pct}%`}</span>
              </div>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>R$ {g.saved.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ {g.target.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div style={{ background: "#EEEDFE", borderRadius: 4, height: 8, marginBottom: 10 }}>
                <div style={{ background: pct >= 100 ? "#22C55E" : "#7B2FF2", borderRadius: 4, height: "100%", width: `${Math.min(100, pct)}%`, transition: "width 0.5s" }}/>
              </div>
              {pct < 100 && (
                <div style={{ display: "flex", gap: 8 }}>
                  {[50, 100, 200].map(v => (
                    <button key={v} onClick={() => addToGoal(g.id, v)}
                      style={{ flex: 1, padding: "8px", borderRadius: 10, border: "1.5px solid #E5E5E5", background: "#fff", fontSize: 13, cursor: "pointer", color: "#7B2FF2", fontWeight: 500 }}>
                      +R$ {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: 20 }}/>
      <NavBar/>
    </div>
  );

  // PROFILE
  const Profile = () => (
    <div style={{ background: "#F8F8F8", minHeight: "100vh" }}>
      <div style={{ ...ph, paddingBottom: 24, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 32 }}>🐷</div>
        <div style={{ fontSize: 22, fontWeight: 500 }}>Jogador</div>
        <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Nível {state.level + 1} — {levelInfo.name}</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[["XP Total", state.xp.toLocaleString()], ["Streak", `${state.streak} dias`], ["Lições", `${state.completedLessons.length}/${LESSONS.length}`], ["Liga", state.league]].map(([l, v]) => (
            <div key={l} style={{ ...card, textAlign: "center", marginBottom: 0 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: "#7B2FF2" }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "#999", fontWeight: 500, marginBottom: 8, letterSpacing: 0.5 }}>QUALIDADE DO PERFIL</div>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: "#333" }}>Completude</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#7B2FF2" }}>{state.profileCompletion}%</span>
          </div>
          <div style={{ background: "#EEEDFE", borderRadius: 4, height: 10 }}>
            <div style={{ background: "#7B2FF2", borderRadius: 4, height: "100%", width: `${state.profileCompletion}%`, transition: "width 0.5s" }}/>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
            {state.income <= 0 && <div style={{ marginBottom: 6 }}>⬜ Renda não cadastrada</div>}
            {state.income > 0 && <div style={{ marginBottom: 6, color: "#16A34A" }}>✓ Renda: R$ {state.income.toLocaleString("pt-BR")}</div>}
            <div style={{ color: state.debts.length > 0 ? "#16A34A" : "#999", marginBottom: 6 }}>{state.debts.length > 0 ? "✓" : "⬜"} Dívidas cadastradas</div>
            <div style={{ color: state.goals.length > 0 ? "#16A34A" : "#999", marginBottom: 6 }}>{state.goals.length > 0 ? "✓" : "⬜"} Metas ativas</div>
            <div style={{ color: state.expenses.length >= 7 ? "#16A34A" : "#999" }}>{state.expenses.length >= 7 ? "✓" : "⬜"} 7+ gastos registrados</div>
          </div>
        </div>

        {state.income <= 0 && (
          <>
            <button style={{ ...btnOut, marginBottom: 12 }} onClick={() => setShowIncomeForm(true)}>Cadastrar renda (+10 XP)</button>
            {showIncomeForm && (
              <div style={{ ...card, padding: 20 }}>
                <input style={{ ...input, marginBottom: 12 }} placeholder="Sua renda mensal (R$)" type="number" value={incomeInput} onChange={e => setIncomeInput(e.target.value)}/>
                <button style={btn} onClick={setIncome}>Salvar</button>
              </div>
            )}
          </>
        )}

        <div style={{ fontSize: 12, color: "#999", fontWeight: 500, marginBottom: 8, marginTop: 16, letterSpacing: 0.5 }}>CONQUISTAS</div>
        <div style={card}>
          {[
            { name: "Primeira lição", done: state.completedLessons.length >= 1, icon: "📖" },
            { name: "Semana perfeita", done: state.streak >= 7, icon: "🔥" },
            { name: "Detetive de gastos", done: state.expenses.length >= 50, icon: "🔍" },
            { name: "Mês de ferro", done: state.streak >= 30, icon: "💪" },
            { name: "Bola de neve", done: state.debts.some(d => d.paid >= d.total), icon: "⛄" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 4 ? "1px solid #F0F0F0" : "none", opacity: a.done ? 1 : 0.4 }}>
              <span style={{ fontSize: 20 }}>{a.done ? a.icon : "🔒"}</span>
              <span style={{ fontSize: 14, color: a.done ? "#333" : "#999" }}>{a.name}</span>
              {a.done && <span style={{ ...pillGreen, marginLeft: "auto" }}>Desbloqueada</span>}
            </div>
          ))}
        </div>

        <button style={{ ...btnOut, marginTop: 16, color: "#EF4444", borderColor: "#EF4444" }}
          onClick={() => { localStorage.removeItem("quita_state"); setState(initState()); setScreen("home"); }}>
          Resetar dados (dev)
        </button>
      </div>
      <div style={{ height: 20 }}/>
      <NavBar/>
    </div>
  );

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: "0 auto", position: "relative" }}>
      <Toast/>
      {screen === "home" && <Home/>}
      {screen === "lesson" && <Lesson/>}
      {screen === "expenses" && <Expenses/>}
      {screen === "goals" && <Goals/>}
      {screen === "profile" && <Profile/>}
    </div>
  );
}
