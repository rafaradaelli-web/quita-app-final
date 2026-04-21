import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Flame, Zap, Trophy, BookOpen, CreditCard, TrendingUp, Snowflake, Search, Scale, GraduationCap, Wallet, Target, Dumbbell, Lock, Sparkles, CheckCircle, ArrowRight, Medal, Coins } from 'lucide-react'
import { sb } from '../services/supabase'
import { initAnalytics, identifyUser, updateUserProps, trackSessionStart, trackOnboardingStep, trackOnboardingComplete, trackOnboardingSkipTutorial, trackLessonStart, trackLessonComplete, trackQuizAnswer, trackModuleComplete, trackLessonAbandoned, trackStreakMaintained, trackLevelUp, trackXpGained, trackCoinsEarned, trackExpenseAdded, trackExpenseBulkImport, trackReceitaAdded, trackDebtAdded, trackGoalCreated, trackShopPurchase, trackShopOpened, trackScreenView, trackNavBarTap, trackFinanceiroTabChanged, track3DExpanded, trackCheckContasStarted, trackCheckContasComplete, trackRevisaoSemanalStarted, trackLogout, trackError, trackApiCall } from '../services/analytics'
import LESSONS_DATA from '../services/lessons.json'
import {
  CATEGORIES, DEFAULT_STATE, LEVELS, getLevel, calcProfile,
  RECEITA_TIPOS, CAT_NORM, CAT_GRUPOS,
  getStreakMultiplier, getStreakColor, STREAK_MILESTONES, getLeagueColor,
  COIN_REWARDS, LIVES_CONFIG, LEAGUES, LEAGUE_RULES, getWeeklyMissions, MASCOT_MESSAGES,
} from '../services/gameConfig'
import { useQuitaScene } from '../hooks/useQuitaScene'
import TrilhaScreen from './TrilhaScreen'
import ExpensesScreen from './ExpensesScreen'
import ReceitasScreen from './ReceitasScreen'
import DebtsScreen from './DebtsScreen'
import CheckContasScreen from './CheckContasScreen'
import RevisaoSemanalScreen from './RevisaoSemanalScreen'
import CoachScreen from './CoachScreen'
import LojaScreen from './LojaScreen'
import OnboardingScreen from './OnboardingScreen'
import PatrimonioScreen from './PatrimonioScreen'
import * as XLSX from 'xlsx'

export default function QuitaApp({ user, onSignOut }) {
const [state, setState] = useState(DEFAULT_STATE);
  const [screen, setScreen] = useState("home");
  const [lessonStep, setLessonStep] = useState("content");
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(-1);
  const [answered, setAnswered] = useState(false);
  // ── Vidas persistentes com regeneração ──
  const livesFromState = state.lives ?? 3
  const lastLifeLost = state.lastLifeLost || 0
  const [now, setNow] = useState(Date.now())

  // Calcular vidas regeneradas desde lastLifeLost
  const livesRegen = lastLifeLost > 0 && livesFromState < LIVES_CONFIG.max
    ? Math.min(LIVES_CONFIG.max - livesFromState, Math.floor((now - lastLifeLost) / (LIVES_CONFIG.rechargeMinutes * 60000)))
    : 0
  const lives = Math.min(LIVES_CONFIG.max, livesFromState + livesRegen)

  // Timer: atualiza a cada segundo quando vidas < max
  useEffect(() => {
    if (lives >= LIVES_CONFIG.max) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [lives])

  // Persistir vidas regeneradas
  useEffect(() => {
    if (livesRegen > 0) {
      setState(prev => {
        const newLives = Math.min(LIVES_CONFIG.max, (prev.lives ?? 3) + livesRegen)
        const n = { ...prev, lives: newLives, lastLifeLost: newLives >= LIVES_CONFIG.max ? 0 : prev.lastLifeLost }
        save(n); return n
      })
    }
  }, [livesRegen])

  // Tempo restante pra próxima vida (mm:ss)
  const nextLifeSeconds = lives < LIVES_CONFIG.max && lastLifeLost > 0
    ? Math.max(0, LIVES_CONFIG.rechargeMinutes * 60 - Math.floor(((now - lastLifeLost) % (LIVES_CONFIG.rechargeMinutes * 60000)) / 1000))
    : 0
  const nextLifeStr = nextLifeSeconds > 0
    ? `${Math.floor(nextLifeSeconds / 3600)}:${String(Math.floor((nextLifeSeconds % 3600) / 60)).padStart(2, '0')}:${String(nextLifeSeconds % 60).padStart(2, '0')}`
    : ''

  const loseLife = () => {
    setState(prev => {
      const newLives = Math.max(0, (prev.lives ?? 3) - 1)
      const n = { ...prev, lives: newLives, lastLifeLost: Date.now() }
      save(n); return n
    })
  }

  const restoreAllLives = () => {
    setState(prev => {
      const n = { ...prev, lives: LIVES_CONFIG.max, lastLifeLost: 0 }
      save(n); return n
    })
  }
  const [lessonXp, setLessonXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [streakRestoreModal, setStreakRestoreModal] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCat, setExpCat] = useState("Alimentação");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [incomeInput, setIncomeInput] = useState("");
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showLessonsModal, setShowLessonsModal] = useState(false);
  const [trilhaBarOpen, setTrilhaBarOpen] = useState(true);
  const [importStep, setImportStep] = useState(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [filePasswordModal, setFilePasswordModal] = useState(null); // { type: 'excel'|'pdf', file, resolve }
  const [filePassword, setFilePassword] = useState('');
  const [pdfPreview, setPdfPreview] = useState(null);
  const [catFilters, setCatFilters] = useState([]);
  const [monthFilter, setMonthFilter] = useState("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [detailFaturaId, setDetailFaturaId] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [ranking, setRanking] = useState([]);
  const [profileModal, setProfileModal] = useState(null);
  const [finTab, setFinTab] = useState("expenses");
  const [tourStep, setTourStep] = useState(null);
  const saveTimer = useRef(null);
  const dataLoaded = useRef(false);

  // Navegação inteligente — redireciona sub-screens para as sub-tabs corretas
  const navigate = useCallback((target) => {
    trackScreenView(target);
    const finScreens = ["receitas", "expenses", "debts", "goals", "patrimonio"];
    if (finScreens.includes(target)) { setScreen("financeiro"); setFinTab(target); }
    else if (target === "plano" || target === "diagnostico" || target === "saude") { setScreen("coach"); }
    else { setScreen(target); }
  }, []);

  // ── Helpers para nova estrutura de lições ──
  const allLessons = (LESSONS_DATA.journeys || []).flatMap(j => j.modules.flatMap(m => m.lessons))
  const totalLessonsCount = allLessons.length
  const currentLessonRef = useRef(null)

  // ── Carregar dados do Supabase ──
  useEffect(() => {
    const load = async () => {
      setDbLoading(true);
      try {
        const { data, error } = await sb.from("user_data").select("data").eq("user_id", user.id).single();
        if (error && error.code !== 'PGRST116') {
          // Erro real (não é "row not found") — NÃO marcar como loaded pra não sobrescrever
          console.error('[Quita] Erro ao carregar dados:', error);
          setDbLoading(false);
          return;
        }
        if (data?.data) {
          const loaded = { ...DEFAULT_STATE(), ...data.data };
          loaded.level = getLevel(loaded.xp);
          loaded.profileCompletion = calcProfile(loaded);
          setState(loaded);
          if (loaded.onboardingDone) { try { localStorage.setItem('quita_onboarding_' + user.id, 'true') } catch(e) {} }
          console.log('[Quita] Dados carregados:', { xp: loaded.xp, coins: loaded.coins, lessons: loaded.completedLessons?.length || 0 });
        } else {
          console.log('[Quita] Novo usuário — sem dados salvos');
        }
        dataLoaded.current = true;
        setDbLoading(false);
        // Analytics
        initAnalytics();
        const loadedState = data?.data || {};
        identifyUser(user.id, { email: user.email, name: loadedState.name, income: loadedState.income, dificuldade: loadedState.dificuldade, onboardingDone: loadedState.onboardingDone, createdAt: loadedState.createdAt });
        updateUserProps(loadedState);
        trackSessionStart(loadedState);
      } catch (err) {
        console.error('[Quita] Falha na conexão:', err);
        setDbLoading(false);
        // NÃO marcar dataLoaded — impede qualquer save que sobrescreveria dados
      }
    };
    load();
  }, [user.id]);

  // ── Buscar ranking real (via função segura) ──
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const { data } = await sb.rpc('get_ranking');
        if (data) {
          const players = data.map(row => ({
            id: row.user_id,
            name: row.name || 'Jogador',
            totalXp: row.total_xp || 0,
            streak: row.streak || 0,
            league: row.league || 'Bronze',
            equippedSkin: row.equipped_skin || 'quita-real',
            equippedBg: row.equipped_bg || 'padrao',
            level: row.level || 1,
            profilePhoto: row.profile_photo || null,
            isMe: row.user_id === user.id,
          }));
          setRanking(players);
        }
      } catch (e) { console.error('Ranking fetch error:', e) }
    };
    fetchRanking();
    const interval = setInterval(fetchRanking, 60000);
    return () => clearInterval(interval);
  }, [user.id]);

  // ── Salvar no Supabase com debounce ──
  const save = useCallback((s) => {
    // PROTEÇÃO: nunca salvar antes de carregar dados do Supabase
    if (!dataLoaded.current) { console.warn('[Quita] Save bloqueado — dados ainda não carregados'); return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await sb.from("user_data").upsert({ user_id: user.id, data: s, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    }, 1000);
  }, [user.id]);

  const addXp = useCallback((amount, msg, applyMultiplier = true) => {
    const prevLevel = state.level;
    setState(prev => {
      const multi = applyMultiplier ? getStreakMultiplier(prev.streak) : 1;
      const boosted = Math.round(amount * multi);
      trackXpGained(boosted, msg || 'unknown');
      const n = { ...prev, xp: prev.xp + boosted, weeklyXp: prev.weeklyXp + boosted };
      n.level = getLevel(n.xp);
      if (n.level > prevLevel) trackLevelUp(n.level + 1, LEVELS[n.level]?.name || '');
      n.profileCompletion = calcProfile(n);
      save(n);
      return n;
    });
    if (msg) {
      const multi = getStreakMultiplier(state.streak);
      const boosted = applyMultiplier ? Math.round(amount * multi) : amount;
      const multiLabel = applyMultiplier && multi > 1.01 ? ` (${multi.toFixed(2)}x)` : "";
      setToast("+" + boosted + " XP — " + msg + multiLabel);
      setTimeout(() => setToast(null), 2500);
    }
  }, [save, state.streak]);

  const addCoins = useCallback((amount) => {
    if (!amount || amount <= 0) return;
    setState(prev => {
      const n = { ...prev, coins: (prev.coins || 0) + amount };
      save(n);
      return n;
    });
  }, [save]);

  // ── Atualizar progresso de missões semanais ──
  const trackMission = useCallback((type, amount = 1) => {
    setState(prev => {
      const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toDateString() })()
      const wm = prev.weeklyMissions || {}
      const isSameWeek = wm.weekStart === weekStart
      const progress = isSameWeek ? { ...(wm.progress || {}) } : {}
      progress[type] = (progress[type] || 0) + amount
      const n = { ...prev, weeklyMissions: { weekStart, progress, claimed: isSameWeek ? (wm.claimed || []) : [] } }
      save(n)
      return n
    })
  }, [save])

  const checkStreak = useCallback(() => {
    const today = new Date().toDateString();
    setState(prev => {
      // Se já verificou hoje, não fazer nada
      if (prev.streakCheckedToday === today) return prev;
      const n = { ...prev, streakCheckedToday: today };
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const lastLesson = prev.lastLessonDate || prev.lastActiveDate;

      // Se última lição foi ontem ou hoje, streak ok (não precisa fazer nada aqui)
      if (lastLesson === today || lastLesson === yesterday) return n;

      // Se última lição foi antes de ontem: streak deveria resetar
      if (lastLesson && lastLesson !== today && lastLesson !== yesterday) {
        // Tentar usar streak freeze
        if ((prev.streakFreezes || 0) > 0 && prev.streak > 0) {
          n.streakFreezes = prev.streakFreezes - 1;
          n.lastLessonDate = yesterday; // Simula que completou ontem
          setTimeout(() => {
            setToast("🧊 Streak freeze usado! Streak de " + prev.streak + " dias protegido.");
            setTimeout(() => setToast(null), 3500);
          }, 500);
        } else if (prev.streak > 1) {
          // Oferecer restauração por moedas
          n.lostStreak = prev.streak;
          n.streak = 0;
          setTimeout(() => setStreakRestoreModal(true), 800);
        }
      }
      save(n);
      return n;
    });
  }, [save]);

  // Chamado APENAS ao completar uma lição
  const markLessonStreak = useCallback(() => {
    const today = new Date().toDateString();
    setState(prev => {
      if (prev.lastLessonDate === today) return prev; // Já contou hoje
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const n = { ...prev, lastLessonDate: today, lastActiveDate: today };
      if (prev.lastLessonDate === yesterday || (!prev.lastLessonDate && prev.lastActiveDate === yesterday)) {
        n.streak = (prev.streak || 0) + 1;
      } else if (!prev.lastLessonDate || (prev.lastLessonDate !== today && prev.lastLessonDate !== yesterday)) {
        n.streak = 1;
      }
      n.coins = (n.coins || 0) + COIN_REWARDS.streakDaily;
      n.profileCompletion = calcProfile(n);
      const milestone = STREAK_MILESTONES.find(m => m.days === n.streak);
      if (milestone) {
        n.xp = (n.xp || 0) + milestone.xp;
        n.weeklyXp = (n.weeklyXp || 0) + milestone.xp;
        n.coins = (n.coins || 0) + (milestone.coins || 0);
        n.level = getLevel(n.xp);
        setTimeout(() => {
          setToast("🎉 " + milestone.label + "! +" + milestone.xp + " XP +" + milestone.coins + " moedas");
          setTimeout(() => setToast(null), 3500);
        }, 500);
      }
      save(n);
      return n;
    });
  }, [save]);

  useEffect(() => { if (!dbLoading) checkStreak(); }, [dbLoading]);

  // ── League weekly check ──
  useEffect(() => {
    if (dbLoading || !state.onboardingDone) return
    const now = new Date()
    const weekId = `${now.getFullYear()}-W${Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000))}`
    if (state.lastLeagueWeek === weekId) return
    // Nova semana: resetar weeklyXp e verificar promoção/rebaixamento
    setState(prev => {
      const n = { ...prev, lastLeagueWeek: weekId }
      const leagueIdx = LEAGUES.indexOf(prev.league || 'Bronze')
      // Promoção/rebaixamento baseado no ranking da semana anterior
      if (ranking.length >= LEAGUE_RULES.minPlayers) {
        const myRank = ranking.findIndex(u => u.isMe) + 1
        if (myRank > 0 && myRank <= LEAGUE_RULES.promoteTop && leagueIdx < LEAGUES.length - 1) {
          n.league = LEAGUES[leagueIdx + 1]
          setTimeout(() => { setToast('🎉 Promovido pra Liga ' + n.league + '!'); setTimeout(() => setToast(null), 4000) }, 1000)
        } else if (myRank > ranking.length - LEAGUE_RULES.demoteBottom && leagueIdx > 0) {
          n.league = LEAGUES[leagueIdx - 1]
          setTimeout(() => { setToast('Liga rebaixada pra ' + n.league + '. Recupere na próxima semana!'); setTimeout(() => setToast(null), 4000) }, 1000)
        }
      }
      n.weeklyXp = 0
      save(n)
      return n
    })
  }, [dbLoading, ranking])

  const startLesson = (lesson) => {
    currentLessonRef.current = lesson;
    trackLessonStart(lesson);
    setScreen("lesson"); setLessonStep("content"); setQIdx(0);
    setSelected(-1); setAnswered(false); restoreAllLives(); setLessonXp(0); setCombo(0);
  };

  const checkAnswer = () => {
    const lesson = currentLessonRef.current;
    if (!lesson) return;
    const q = lesson.questions[qIdx];
    setAnswered(true);
    const correct = selected === q.correct;
    trackQuizAnswer(lesson.id, qIdx, correct, selected);
    if (correct) {
      setLessonXp(x => x + 10);
      setCombo(c => c + 1);
    } else {
      loseLife();
      setCombo(0);
      setState(prev => {
        const wa = [...(prev.wrongAnswers || [])];
        if (!wa.find(w => w.lessonId === lesson.id && w.qIdx === qIdx)) {
          wa.push({ lessonId: lesson.id, qIdx, q: q.q, options: q.options, correct: q.correct, selected, type: q.type || 'multiple', date: Date.now() });
          if (wa.length > 50) wa.shift();
        }
        return { ...prev, wrongAnswers: wa };
      });
    }
  };

  const addExpense = () => {
    if (!expName || !expAmount) return;
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    const dateTs = expDate ? new Date(expDate + 'T12:00:00').getTime() : Date.now();
    setState(prev => {
      const n = { ...prev, expenses: [...prev.expenses, { id: Date.now(), name: expName, amount: amt, category: expCat, date: dateTs }] };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
    addXp(5, "Gasto registrado");
    addCoins(COIN_REWARDS.expenseRegistered);
    trackMission('expenses');
    trackExpenseAdded('manual', expCat, amt, state.expenses.length + 1);
    setExpName(""); setExpAmount(""); setExpDate(new Date().toISOString().slice(0, 10)); setShowExpenseForm(false);
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
      // Aprender categorização
      if (exp.name) {
        const key = exp.name.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúç\s]/gi, '').trim().slice(0, 40)
        if (key.length > 2) n.catDict = { ...(n.catDict || {}), [key]: newCat }
      }
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
      const prompt2 = 'Esta é uma FATURA DE CARTÃO DE CRÉDITO. Extraia TODOS os gastos/compras individuais.\n\nResponda APENAS com JSON válido:\n{"expenses":[{"name":"descrição curta","amount":99.90,"category":"Categoria","date":"2026-01-15"}]}\n\nCategorias: Moradia, Alimentação, Delivery, Transporte, Saúde, Estilo de vida, Assinaturas, Educação, Impostos, Outros\n- amount SEMPRE positivo e SEMPRE em REAIS (BRL)\n- COMPRAS INTERNACIONAIS: se a compra está em moeda estrangeira (US$, EUR, etc), use o valor TOTAL convertido em reais (R$), não o valor na moeda original. Cuidado para não confundir a taxa de câmbio (valor de 1 unidade da moeda estrangeira) com o valor total da compra convertida — use sempre o valor total da compra em R$. Linhas que mostram apenas a cotação/câmbio não são gastos e devem ser ignoradas.\n- date formato YYYY-MM-DD\n- Ignore juros, multas, encargos, pagamentos anteriores, cotação de moeda\n- Se não encontrar: {"expenses":[]}';
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
      // Dicionário de categorias aprendido com correções do usuário
      const catDict = state.catDict || {}
      const dictEntries = Object.entries(catDict).slice(-30)
      const dictStr = dictEntries.length > 0 ? '\n\nCATEGORIZAÇÃO APRENDIDA (use estas preferências do usuário):\n' + dictEntries.map(([k, v]) => `"${k}" → ${v}`).join(', ') : ''

      const prompt = 'Analise este extrato/fatura e extraia APENAS os GASTOS (valores negativos, débitos, pagamentos, compras, boletos, pix enviados).\n\nIGNORE: saldos diários, transferências recebidas, créditos, investimentos recebidos, equilíbrio entre contas, IOF, transferências enviadas para si mesmo, cotação de moeda.\n\nCOMPRAS INTERNACIONAIS: se a compra está em moeda estrangeira (US$, EUR, etc), use o valor TOTAL convertido em reais (R$), não o valor na moeda original. Cuidado para não confundir a taxa de câmbio (valor de 1 unidade da moeda estrangeira) com o valor total da compra convertida — use sempre o valor total da compra em R$. Linhas que mostram apenas a cotação/câmbio não são gastos e devem ser ignoradas.\n\nCategorize INTELIGENTEMENTE:\n- Moradia: aluguel, condomínio, energia, água, gás, internet\n- Alimentação: supermercado, restaurante, padaria, açougue\n- Delivery: iFood, Rappi, Uber Eats, delivery de comida\n- Transporte: Uber, 99, combustível, estacionamento, pedágio\n- Saúde: farmácia, médico, plano de saúde, academia\n- Estilo de vida: roupas, lazer, cinema, bar, viagem, beleza, salão, pet, presentes, compras pessoais, entretenimento\n- Assinaturas: Netflix, Spotify, streaming, apps mensais\n- Educação: escola, curso, livros, materiais\n- Impostos: DAS, DARF, IPVA, IR, taxas, contabilidade\n- Outros: transferências, Pix, trabalho, demais' + dictStr + '\n\nResponda APENAS com JSON válido:\n{"expenses":[{"name":"descrição curta","amount":99.90,"category":"Categoria","date":"2026-01-15"}]}\n\n- amount SEMPRE positivo e SEMPRE em REAIS (BRL)\n- date no formato YYYY-MM-DD\n- Se não encontrar gastos: {"expenses":[]}';

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

  const tryReadExcel = (arrayBuffer, password) => {
    try {
      const opts = { type: "array" };
      if (password) opts.password = password;
      const wb = XLSX.read(arrayBuffer, opts);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (raw.length < 2) { setToast("Planilha vazia"); setTimeout(() => setToast(null), 2500); return; }
      sendToAI(raw.map(row => row.filter(c => String(c).trim()).join(" | ")).filter(l => l.trim().length > 3).slice(0, 200).join("\n"), false);
    } catch (err) {
      const msg = String(err.message || err).toLowerCase();
      if (msg.includes('password') || msg.includes('encrypt') || msg.includes('cfb')) {
        return 'needs_password';
      }
      setToast("Erro ao ler arquivo"); setTimeout(() => setToast(null), 2500);
    }
    return 'ok';
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buf = evt.target.result;
      const result = tryReadExcel(buf);
      if (result === 'needs_password') {
        setFilePassword('');
        setFilePasswordModal({ type: 'excel', buffer: buf });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadPdfJs = () => {
    return new Promise((resolve) => {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return }
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
        resolve(window.pdfjsLib)
      }
      script.onerror = () => { console.error('[Quita] pdf.js failed to load'); resolve(null) }
      document.head.appendChild(script)
    })
  }

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    try {
      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuf).reduce((s, b) => s + String.fromCharCode(b), ''));

      // Try sending to Claude first
      setImportStep("pdf-loading"); setPdfParsing(true);
      const response = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4000,
          messages: [{ role: "user", content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: 'Extraia TODOS os gastos/compras individuais desta fatura/extrato.\n\nResponda APENAS com JSON válido:\n{"expenses":[{"name":"descrição curta","amount":99.90,"category":"Categoria","date":"2026-01-15"}]}\n\nCategorias: Moradia, Alimentação, Delivery, Transporte, Saúde, Estilo de vida, Assinaturas, Educação, Impostos, Outros\n- amount SEMPRE positivo e SEMPRE em REAIS (BRL)\n- COMPRAS INTERNACIONAIS: se a compra está em moeda estrangeira (US$, EUR, etc), use o valor TOTAL convertido em reais (R$), não o valor na moeda original. Cuidado para não confundir a taxa de câmbio (valor de 1 unidade da moeda estrangeira) com o valor total da compra convertida — use sempre o valor total da compra em R$. Linhas que mostram apenas a cotação/câmbio não são gastos e devem ser ignoradas.\n- date formato YYYY-MM-DD\n- Ignore saldos, juros, IOF, cotação de moeda\n- Se não encontrar: {"expenses":[]}' }
          ]}]
        })
      });
      const data = await response.json();
      setPdfParsing(false);

      // Check if it failed (likely encrypted)
      if (!response.ok || data.error) {
        const errMsg = String(data.error?.message || '').toLowerCase();
        if (errMsg.includes('password') || errMsg.includes('encrypt') || errMsg.includes('could not process') || response.status === 400) {
          setImportStep(null);
          setFilePassword('');
          setFilePasswordModal({ type: 'pdf', arrayBuffer: arrayBuf });
          return;
        }
        setToast(data.error?.message || "Erro ao processar PDF"); setTimeout(() => setToast(null), 3000); setImportStep(null);
        return;
      }

      // Parse successful response
      const text = data.content?.map(c => c.text || '').join('') || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.expenses?.length > 0) {
          setPdfPreview(parsed.expenses.map(exp => ({ ...exp, amount: Math.abs(parseFloat(exp.amount)) || 0, selected: true, category: exp.category || "Outros" })));
          setImportStep("pdf-preview");
        } else { setToast("Nenhum gasto encontrado"); setTimeout(() => setToast(null), 2500); setImportStep(null); }
      } else { setToast("Erro ao processar resposta"); setTimeout(() => setToast(null), 2500); setImportStep(null); }

    } catch (err) { setPdfParsing(false); setToast("Erro ao ler PDF"); setTimeout(() => setToast(null), 2500); setImportStep(null); }
  };

  const handlePasswordSubmit = async () => {
    if (!filePasswordModal || !filePassword) return;
    const { type } = filePasswordModal;

    if (type === 'excel') {
      try {
        setToast("Desbloqueando Excel..."); setTimeout(() => setToast(null), 8000);

        // Converte ArrayBuffer -> base64 para enviar via JSON
        const bytes = new Uint8Array(filePasswordModal.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const fileBase64 = btoa(binary);

        const resp = await fetch("/api/decrypt-xlsx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64, password: filePassword }),
        });
        const data = await resp.json();

        if (resp.status === 401 || data.error === 'wrong_password') {
          setToast("Senha incorreta"); setTimeout(() => setToast(null), 2500);
          return;
        }
        if (!resp.ok || !data.ok || !data.fileBase64) {
          console.error('[Quita] decrypt-xlsx error:', data);
          setToast("Erro ao desbloquear Excel. Tente novamente."); setTimeout(() => setToast(null), 3000);
          return;
        }

        // Decodifica o Excel limpo de volta para ArrayBuffer
        const decBinary = atob(data.fileBase64);
        const decBytes = new Uint8Array(decBinary.length);
        for (let i = 0; i < decBinary.length; i++) decBytes[i] = decBinary.charCodeAt(i);

        // Agora lê o Excel já descriptografado usando o tryReadExcel normal (sem senha)
        const result = tryReadExcel(decBytes.buffer);
        if (result === 'needs_password') {
          // Não deveria acontecer, mas por segurança
          setToast("Arquivo continua protegido. Tente novamente."); setTimeout(() => setToast(null), 3000);
          return;
        }
        setFilePasswordModal(null); setFilePassword('');
      } catch (err) {
        console.error('[Quita] Excel decrypt error:', err);
        setToast("Erro de conexão. Verifique internet e tente novamente."); setTimeout(() => setToast(null), 3000);
      }
      return;
    }

    if (type === 'pdf') {
      try {
        setToast("Desbloqueando PDF..."); setTimeout(() => setToast(null), 8000);
        const pdfjsLib = await loadPdfJs();
        if (!pdfjsLib) { setToast("Erro ao carregar leitor de PDF. Tente salvar o PDF sem senha."); setTimeout(() => setToast(null), 4000); return; }

        const task = pdfjsLib.getDocument({ data: new Uint8Array(filePasswordModal.arrayBuffer), password: filePassword });
        const pdf = await task.promise;

        // Render pages as images
        const pages = [];
        const maxPages = Math.min(pdf.numPages, 10);
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          pages.push(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        }

        setFilePasswordModal(null); setFilePassword('');
        setImportStep("pdf-loading"); setPdfParsing(true);
        setToast("Lendo " + pages.length + " página" + (pages.length > 1 ? "s" : "") + "..."); setTimeout(() => setToast(null), 5000);

        // Send images to Claude
        const content = [];
        pages.forEach(p => {
          content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: p } });
        });
        content.push({ type: "text", text: 'Esta é uma fatura/extrato bancário. Extraia TODOS os gastos/compras individuais.\n\nResponda APENAS com JSON válido:\n{"expenses":[{"name":"descrição curta","amount":99.90,"category":"Categoria","date":"2026-01-15"}]}\n\nCategorias: Moradia, Alimentação, Delivery, Transporte, Saúde, Estilo de vida, Assinaturas, Educação, Impostos, Outros\n- amount SEMPRE positivo e SEMPRE em REAIS (BRL)\n- COMPRAS INTERNACIONAIS: se a compra está em moeda estrangeira (US$, EUR, etc), use o valor TOTAL convertido em reais (R$), não o valor na moeda original. Cuidado para não confundir a taxa de câmbio (valor de 1 unidade da moeda estrangeira) com o valor total da compra convertida — use sempre o valor total da compra em R$. Linhas que mostram apenas a cotação/câmbio não são gastos e devem ser ignoradas.\n- date formato YYYY-MM-DD\n- Ignore saldos, juros, IOF, cotação de moeda, transferências recebidas\n- Se não encontrar: {"expenses":[]}' });

        const response = await fetch("/api/claude", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content }] })
        });
        const data = await response.json();
        setPdfParsing(false);

        if (data.error) { setToast(data.error.message || "Erro na API"); setTimeout(() => setToast(null), 3000); setImportStep(null); return; }

        const text = data.content?.map(c => c.text || '').join('') || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.expenses?.length > 0) {
            setPdfPreview(parsed.expenses.map(exp => ({ ...exp, amount: Math.abs(parseFloat(exp.amount)) || 0, selected: true, category: exp.category || "Outros" })));
            setImportStep("pdf-preview");
          } else { setToast("Nenhum gasto encontrado"); setTimeout(() => setToast(null), 2500); setImportStep(null); }
        } else { setToast("Erro ao processar resposta"); setTimeout(() => setToast(null), 2500); setImportStep(null); }
      } catch (err) {
        setPdfParsing(false);
        const msg = String(err.message || '').toLowerCase();
        if (msg.includes('password') || msg.includes('incorrect')) {
          setToast("Senha incorreta. Tente novamente."); setTimeout(() => setToast(null), 3000);
        } else {
          console.error('[Quita] PDF password error:', err);
          setToast("Erro ao ler PDF: " + (err.message || '')); setTimeout(() => setToast(null), 3000);
          setFilePasswordModal(null); setFilePassword('');
          setImportStep(null);
        }
      }
    }
  };

  const togglePdfItem = (idx) => { setPdfPreview(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item)); };
  const updatePdfItemCategory = (idx, cat) => {
    setPdfPreview(prev => {
      const updated = prev.map((item, i) => i === idx ? { ...item, category: cat } : item)
      // Aprender categorização: salvar mapeamento nome → categoria
      const item = prev[idx]
      if (item && item.name && cat) {
        const key = item.name.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúç\s]/gi, '').trim().slice(0, 40)
        if (key.length > 2) {
          setState(p => {
            const dict = { ...(p.catDict || {}), [key]: cat }
            const n = { ...p, catDict: dict }
            save(n)
            return n
          })
        }
      }
      return updated
    })
  };

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
    trackMission('expenses', sel.length);
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

  const onSpecialComplete = useCallback((specialId, reward) => {
    setState(prev => {
      const specials = [...(prev.completedSpecials || [])]
      if (!specials.includes(specialId)) specials.push(specialId)
      const n = { ...prev, completedSpecials: specials }
      if (reward.type === 'coins') n.coins = (n.coins || 0) + reward.amount
      else if (reward.type === 'xp') { n.xp = (n.xp || 0) + reward.amount; n.weeklyXp = (n.weeklyXp || 0) + reward.amount; n.level = getLevel(n.xp) }
      else if (reward.type === 'freeze') n.streakFreezes = (n.streakFreezes || 0) + reward.amount
      save(n)
      return n
    })
  }, [save])

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

  // Salvar nome no state pra aparecer no ranking
  useEffect(() => {
    if (!state.name && userName !== "Jogador") {
      setState(prev => { const n = { ...prev, name: userName }; save(n); return n });
    }
  }, [userName, state.name]);

  const rendaTotal = (state.receitas||[]).reduce((s,r) => s+(r.amount||0), 0) || state.income || 0;

  const addReceita = useCallback((receita) => {
    setState(prev => {
      const dataTs = receita.dataStr ? new Date(receita.dataStr).getTime() : Date.now();
      const n = { ...prev, receitas: [...(prev.receitas||[]), { ...receita, id: Date.now(), date: dataTs }] };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
    addXp(10, "Receita registrada!");
    addCoins(COIN_REWARDS.incomeRegistered);
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
      const n = { ...prev, debts: [...prev.debts, { ...debt, id: Date.now(), createdAt: Date.now() }], noDebts: false };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
    addXp(20, "Divida cadastrada!");
    addCoins(COIN_REWARDS.debtRegistered);
  }, [save]);

  const deleteDebt = useCallback((id) => {
    setState(prev => {
      const n = { ...prev, debts: prev.debts.filter(d => d.id !== id) };
      n.profileCompletion = calcProfile(n); save(n); return n;
    });
  }, [save]);

    // ── Estilos ──
  const ph = { background: "linear-gradient(160deg, #1E0A3C 0%, #3B1578 35%, #6D28D9 100%)", color: "#fff", padding: "20px 20px 24px", paddingTop: "calc(20px + var(--sat, 0px))", borderRadius: "0 0 28px 28px", boxShadow: "0 8px 32px rgba(30,10,60,0.4)", position: "relative", overflow: "hidden" };
  const card = { background: "rgba(255,255,255,0.95)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: 20, padding: "18px", marginBottom: 12, boxShadow: "0 2px 16px rgba(30,10,60,0.08)", border: "1px solid rgba(0,0,0,0.04)" };
  const btn = { background: "linear-gradient(160deg, #1E0A3C 0%, #3B1578 50%, #6D28D9 100%)", color: "#fff", border: "none", borderRadius: 16, padding: "15px", width: "100%", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(30,10,60,0.35)", letterSpacing: 0.3 };
  const btnOut = { ...btn, background: "transparent", color: "#3B1578", border: "2px solid rgba(59,21,120,0.25)", boxShadow: "none", fontWeight: 600 };
  const pill = { background: "linear-gradient(135deg, #EDE9FE, #DDD6FE)", color: "#5B21B6", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600 };
  const pillGreen = { ...pill, background: "linear-gradient(135deg, #DCFCE7, #BBF7D0)", color: "#16A34A" };
  const input = { width: "100%", padding: "14px 16px", borderRadius: 14, border: "1.5px solid rgba(0,0,0,0.08)", fontSize: 15, outline: "none", boxSizing: "border-box", background: "#FAFAFA", transition: "border-color 0.2s" };
  const nav = { display: "flex", justifyContent: "space-around", padding: "10px 0", paddingBottom: "calc(10px + var(--sab, 0px))", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)", position: "sticky", bottom: 0, boxShadow: "0 -4px 20px rgba(0,0,0,0.06)", zIndex: 20 };
  const navItem = (active) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, color: active ? "#5B21B6" : "#AAA", cursor: "pointer", border: "none", background: "none", fontWeight: active ? 600 : 400 });

  // ── Hook 3D (sempre antes de qualquer return condicional — regra dos hooks) ──
  const modelPath = `/models/${state.equippedSkin || 'quita-real'}.glb`
  const bgId = state.equippedBackground || 'padrao'
  const { celebrate, cardRef, setCanvasRef, loadModel, setBackground } = useQuitaScene(state.xp, state.level, false, modelPath, bgId)

  // Gradientes CSS para fundos equipados
  const BG_CSS = {
    padrao:     { card: 'linear-gradient(160deg, #2D1458 0%, #4C1D95 60%, #6D28D9 100%)', fade: 'rgba(109,40,217,0.8)', world: 'linear-gradient(160deg,#1A0A2E 0%,#2D1458 40%,#4C1D95 100%)', worldFade: 'rgba(44,20,88,0.95)' },
    praia:      { card: 'linear-gradient(160deg, #FF6B35 0%, #F7931E 30%, #87CEEB 70%, #0E7490 100%)', fade: 'rgba(14,116,144,0.8)', world: 'linear-gradient(160deg,#FF6B35 0%,#87CEEB 50%,#0E7490 100%)', worldFade: 'rgba(14,116,144,0.95)' },
    gamer:      { card: 'linear-gradient(160deg, #0F0326 0%, #2D1B69 40%, #4C1D95 70%, #7C3AED 100%)', fade: 'rgba(45,27,105,0.8)', world: 'linear-gradient(160deg,#0F0326 0%,#2D1B69 40%,#7C3AED 100%)', worldFade: 'rgba(15,3,38,0.95)' },
    escritorio: { card: 'linear-gradient(160deg, #FEF3C7 0%, #FBBF24 30%, #D4A574 70%, #92400E 100%)', fade: 'rgba(146,64,14,0.8)', world: 'linear-gradient(160deg,#FEF3C7 0%,#D4A574 50%,#451A03 100%)', worldFade: 'rgba(69,26,3,0.95)' },
    natal:      { card: 'linear-gradient(160deg, #1E3A5F 0%, #2563EB 40%, #1E40AF 70%, #0F172A 100%)', fade: 'rgba(30,58,95,0.8)', world: 'linear-gradient(160deg,#1E3A5F 0%,#2563EB 50%,#0F172A 100%)', worldFade: 'rgba(15,23,42,0.95)' },
  }
  const bgStyle = BG_CSS[bgId] || BG_CSS.padrao

  // focus-mode gerenciado dentro do useQuitaScene


  const nextQuestionWith3D = () => {
    const lesson = currentLessonRef.current
    if (!lesson) return
    if (qIdx < lesson.questions.length - 1) {
      setQIdx(q => q + 1); setSelected(-1); setAnswered(false)
    } else {
      markLessonStreak()
      const perfect = lessonXp === 30
      const bonus = perfect ? 20 : 0
      trackLessonComplete(lesson, lessonXp + bonus, perfect, lives)
      addXp(lessonXp + bonus, perfect ? 'Lição perfeita!' : 'Lição completa!')
      addCoins(COIN_REWARDS.lessonComplete + (perfect ? COIN_REWARDS.lessonPerfect : 0))
      // Missões semanais
      trackMission('lessons')
      if (perfect) trackMission('perfect')
      if (combo >= 5) trackMission('combo', combo)
      setState(p => {
        const cl = [...p.completedLessons]
        if (!cl.includes(lesson.id)) cl.push(lesson.id)
        const n = { ...p, completedLessons: cl }
        const parentModule = (LESSONS_DATA.journeys || []).flatMap(j => j.modules).find(m => m.lessons.some(l => l.id === lesson.id))
        if (parentModule && parentModule.lessons.every(l => cl.includes(l.id))) {
          n.lastModuleCompleteDate = new Date().toDateString()
          trackModuleComplete(parentModule.id, parentModule.etapa || '')
        }
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


  // ── Onboarding check ──
  const handleOnboardingComplete = ({ name, age, income, dificuldade, dailyGoal }) => {
    trackOnboardingComplete({ name, age, income, dificuldade, dailyGoal });
    setState(prev => {
      const n = { ...prev, name, age, income, onboardingDone: true, dificuldade, dailyGoal: dailyGoal || '10min', createdAt: new Date().toISOString() }
      n.profileCompletion = calcProfile(n)
      sb.from("user_data").upsert({ user_id: user.id, data: n, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .then(() => console.log('[Quita] Onboarding salvo no Supabase'))
        .catch(e => console.error('[Quita] Erro ao salvar onboarding:', e))
      try { localStorage.setItem('quita_onboarding_' + user.id, 'true') } catch(e) {}
      return n
    })
    // Iniciar tour guiado
    setTimeout(() => setTourStep(0), 600)
  }

  // Onboarding — mostrar se usuário nunca completou
  const onboardingBackup = (() => { try { return localStorage.getItem('quita_onboarding_' + user.id) === 'true' } catch(e) { return false } })()
  // Se localStorage diz que já fez onboarding mas state não, corrigir
  if (!dbLoading && state && !state.onboardingDone && onboardingBackup) {
    setState(prev => { const n = { ...prev, onboardingDone: true }; save(n); return n })
  }
  if (!dbLoading && state && !state.onboardingDone && !onboardingBackup) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }


  const NavBar = () => (
    React.createElement("div", { style: nav },
      [["home","Início","M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"],
       ["world","Trilha","M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"],
       ["coach","Quita IA","M12 3l1.5 3.7 3.8.6-2.7 2.7.6 3.8L12 12l-3.2 1.8.6-3.8L6.7 7.3l3.8-.6zM19 15l.8 1.9 2 .3-1.4 1.4.3 2-1.7-.9-1.7.9.3-2-1.4-1.4 2-.3z"],
       ["financeiro","Financeiro","M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"],
       ["profile","Perfil","M12 12a4 4 0 100-8 4 4 0 000 8zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"]
      ].map(([id, label, d]) => (
        <button key={id} style={navItem(screen === id)} onClick={() => { trackNavBarTap(id); setScreen(id) }}>
          <div style={{ width: 44, height: 30, borderRadius: 15, background: screen === id ? "linear-gradient(135deg,#EDE9FE,#DDD6FE)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={screen === id ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
          </div>
          <span>{label}</span>
        </button>
      ))
    )
  );

  const FinTabs = () => (
    <div style={{ display: "flex", gap: 3, background: "rgba(0,0,0,0.15)", borderRadius: 12, padding: 3, marginTop: 12 }}>
      {[{id:"expenses",label:"Gastos"},{id:"receitas",label:"Receitas"},{id:"debts",label:"Dívidas"},{id:"patrimonio",label:"Patrimônio"},{id:"goals",label:"Metas"}].map(t => (
        <button key={t.id} onClick={() => { trackFinanceiroTabChanged(t.id); setFinTab(t.id) }}
          style={{ flex: 1, padding: 8, borderRadius: 10, border: "none", fontSize: 11, fontWeight: 600,
            background: finTab === t.id ? "rgba(255,255,255,0.2)" : "transparent",
            color: finTab === t.id ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer", transition: "all 0.2s" }}>
          {t.label}
        </button>
      ))}
    </div>
  );

  const Toast = () => toast ? <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#6B21E8,#7B2FF2)", color: "#fff", padding: "12px 24px", borderRadius: 24, fontSize: 14, fontWeight: 600, zIndex: 99, boxShadow: "0 8px 24px rgba(123,47,242,0.4)", letterSpacing: 0.2, whiteSpace: "nowrap" }}>{toast}</div> : null;

  const Home = () => {
    const completedCount = state.completedLessons.length;
    const totalLessons   = totalLessonsCount;
    const allDone        = completedCount === totalLessons;

    // Progresso por jornada (bloco atual)
    const journeys = LESSONS_DATA.journeys || []
    const currentJourney = journeys.find(j => {
      const jLessons = j.modules.flatMap(m => m.lessons)
      return jLessons.some(l => !state.completedLessons.includes(l.id))
    }) || journeys[journeys.length - 1]
    const jLessons = currentJourney ? currentJourney.modules.flatMap(m => m.lessons) : []
    const jCompleted = jLessons.filter(l => state.completedLessons.includes(l.id)).length
    const jTotal = jLessons.length
    const jPct = jTotal > 0 ? Math.round((jCompleted / jTotal) * 100) : 0
    const jName = currentJourney?.name || 'Trilha'

    const ICONS          = [<CreditCard size={18} color="#fff" />,<TrendingUp size={18} color="#fff" />,<Snowflake size={18} color="#fff" />,<Search size={18} color="#fff" />,<Scale size={18} color="#fff" />];

    return (
      <div style={{ background: "#F2F0F8", minHeight: "100vh" }}>

        {/* ── HEADER COMPACTO ── */}
        <div style={{
          background: "linear-gradient(160deg, #1E0A3C 0%, #3B1578 35%, #6D28D9 100%)",
          color: "#fff", padding: "calc(var(--sat, 0px) + 16px) 20px 16px",
          borderRadius: "0 0 28px 28px",
          boxShadow: "0 8px 32px rgba(30,10,60,0.4)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -20, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)" }} />

          {/* Row 1: Avatar + Name + Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, position: "relative" }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: "linear-gradient(135deg, rgba(168,85,247,0.5), rgba(109,40,217,0.8))",
              border: "2px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
              flexShrink: 0,
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 600, letterSpacing: 1, marginBottom: 1 }}>OLÁ</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            </div>
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              <span style={{ background: "rgba(255,255,255,0.10)", borderRadius: 20, padding: "5px 10px", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 4 }}><Flame size={15} color={getStreakColor(state.streak)} /> {state.streak}</span>
              <span style={{ background: "rgba(255,255,255,0.10)", borderRadius: 20, padding: "5px 10px", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 4 }}><Zap size={15} color="#FBBF24" /> {state.xp.toLocaleString()}</span>
              <span onClick={() => setScreen("loja")} style={{ background: "rgba(255,255,255,0.10)", borderRadius: 20, padding: "5px 10px", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><Coins size={15} color="#FBBF24" /> {(state.coins||0)}</span>
            </div>
          </div>

          {/* Row 2: Level bar slim */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "rgba(255,255,255,0.12)", borderRadius: 8,
              padding: "2px 8px", fontSize: 10, fontWeight: 800, flexShrink: 0,
            }}>Nv {state.level + 1}</span>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.10)", borderRadius: 6, height: 6, overflow: "hidden" }}>
              <div style={{
                background: "linear-gradient(90deg, #A855F7, #C4B5FD)",
                borderRadius: 6, height: "100%",
                width: Math.round(levelProgress) + "%",
                transition: "width 0.6s",
                boxShadow: "0 0 8px rgba(168,85,247,0.4)",
              }} />
            </div>
            <span style={{ fontSize: 10, opacity: 0.45, fontWeight: 600, flexShrink: 0 }}>{levelInfo.name}</span>
          </div>
        </div>

        <div style={{ padding: "12px 16px 0" }}>

          {/* ── CARD DA QUITA 3D ── */}
          <div style={{
            borderRadius: 20, marginBottom: 12,
            background: bgStyle.card,
            boxShadow: "0 8px 32px rgba(45,20,88,0.35)",
            position: "relative",
          }}>
            <div ref={cardRef} style={{ height: trilhaBarOpen ? 320 : 380, position: "relative", borderRadius: 12, transition: "height 0.3s ease" }}>
              <canvas ref={setCanvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 12, zIndex: 1, cursor: "grab" }} />
              {/* Botões loja + expandir */}
              <div style={{ position: "absolute", top: 10, right: 10, zIndex: 3, display: "flex", gap: 8 }}>
                <button onClick={() => setScreen("loja")} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.20)", border: "1.5px solid rgba(255,255,255,0.30)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                </button>
                <button onClick={() => setScreen("quita3d")} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.20)", border: "1.5px solid rgba(255,255,255,0.30)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                </button>
              </div>
              {/* Gradiente de fade nas bordas */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
                background: `linear-gradient(to top, ${bgStyle.fade}, transparent)`,
                pointerEvents: "none", zIndex: 2 }} />
            </div>

            {/* Rodapé colapsável */}
            {trilhaBarOpen ? (
              <>
                <div style={{ padding: "8px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                      {allDone ? <><GraduationCap size={18} /> Trilha completa!</> : jName}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                      {allDone ? "Volte amanhã" : `Lição ${jCompleted + 1} de ${jTotal}`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (allDone) { setTrilhaBarOpen(false); }
                      else { setScreen("world"); }
                    }}
                    style={{
                      background: allDone
                        ? "linear-gradient(135deg,#16A34A,#22C55E)"
                        : "linear-gradient(135deg,#fff,#EDE9FE)",
                      color: allDone ? "#fff" : "#6B21E8",
                      border: "none", borderRadius: 20,
                      padding: "9px 18px", fontSize: 12, fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: allDone
                        ? "0 4px 12px rgba(22,163,74,0.5), 0 0 0 2px rgba(34,197,94,0.3)"
                        : "0 4px 12px rgba(255,255,255,0.25)",
                      letterSpacing: 0.3, transition: "all 0.2s",
                    }}>
                    {allDone ? "✓ Concluído" : "Ver lições →"}
                  </button>
                </div>
                <div style={{ padding: "0 16px 12px" }}>
                  <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 4, height: 4 }}>
                    <div style={{ background: "linear-gradient(90deg,#A78BFA,#fff)", borderRadius: 4, height: "100%", width: jPct + "%", transition: "width 0.8s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{jPct}% concluído</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{jCompleted}/{jTotal} lições</span>
                  </div>
                </div>
              </>
            ) : (
              /* Barra minimizada — clicável para reabrir */
              <div
                onClick={() => setTrilhaBarOpen(true)}
                style={{
                  padding: "10px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 4, height: 4, width: 60 }}>
                    <div style={{ background: "linear-gradient(90deg,#A78BFA,#fff)", borderRadius: 4, height: "100%", width: jPct + "%", transition: "width 0.8s ease" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{jPct}%</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                  Trilha ▲
                </span>
              </div>
            )}
          </div>


          {/* ── MISSÃO DIÁRIA / STREAK REMINDER ── */}
          {(() => {
            const today = new Date().toDateString()
            const lessonDoneToday = state.lastLessonDate === today
            const nextLesson = allLessons.find(l => !state.completedLessons.includes(l.id))
            const parentMod = nextLesson ? (LESSONS_DATA.journeys || []).flatMap(j => j.modules).find(m => m.lessons.some(l => l.id === nextLesson.id)) : null
            const modLessons = parentMod ? parentMod.lessons : []
            const modDone = parentMod ? modLessons.filter(l => state.completedLessons.includes(l.id)).length : 0
            const modTotal = modLessons.length

            if (nextLesson && parentMod) {
              return (
                <div onClick={() => setScreen("world")} style={{ ...card, cursor: "pointer", padding: "16px", marginBottom: 12, background: lessonDoneToday ? "linear-gradient(135deg,rgba(34,197,94,0.06),rgba(34,197,94,0.02))" : "linear-gradient(135deg,rgba(109,40,217,0.06),rgba(168,85,247,0.03))", border: lessonDoneToday ? "1.5px solid rgba(34,197,94,0.15)" : "1.5px solid rgba(109,40,217,0.1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: lessonDoneToday ? "#DCFCE7" : "linear-gradient(135deg,#EDE9FE,#DDD6FE)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {lessonDoneToday ? <CheckCircle size={22} color="#22C55E" /> : <Flame size={22} color={getStreakColor(state.streak)} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1E0A3C" }}>
                        {lessonDoneToday ? `Streak garantido! Continue estudando` : state.streak > 0 ? `Complete 1 lição pra manter seu streak de ${state.streak} dia${state.streak > 1 ? 's' : ''}!` : 'Complete sua primeira lição!'}
                        {!lessonDoneToday && (state.streakFreezes || 0) > 0 && <span style={{ fontSize: 10, color: '#3B82F6', display: 'block', marginTop: 2 }}>🧊 {state.streakFreezes} freeze{state.streakFreezes > 1 ? 's' : ''} disponíve{state.streakFreezes > 1 ? 'is' : 'l'}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{parentMod.name} — lição {modDone + 1} de {modTotal}</div>
                    </div>
                    <ArrowRight size={18} color="#7C3AED" />
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* ── MENSAGEM DO MASCOTE ── */}
          {(() => {
            const daysSinceLesson = state.lastLessonDate ? Math.floor((Date.now() - new Date(state.lastLessonDate).getTime()) / 86400000) : null
            let msg = null
            if (daysSinceLesson !== null && daysSinceLesson >= 2) {
              msg = MASCOT_MESSAGES.streakRisk[0].replace('{days}', daysSinceLesson).replace('{s}', daysSinceLesson > 1 ? 's' : '').replace('{streak}', state.streak)
            } else if (state.streak >= 7) {
              msg = MASCOT_MESSAGES.celebrate[0].replace('{streak}', state.streak).replace('{level}', state.level + 1)
            } else if (daysSinceLesson === 1) {
              msg = MASCOT_MESSAGES.nudge[Math.floor(Date.now() / 86400000) % 2]
            }
            if (!msg) return null
            return (
              <div style={{ ...card, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#FFF7ED,#FEF3C7)", border: "1.5px solid #FDE68A" }}>
                <img src="/models/quita-ia.png" alt="" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: "#92400E", fontWeight: 500, lineHeight: 1.4 }}>{msg}</div>
              </div>
            )
          })()}

          {/* ── MISSÕES SEMANAIS ── */}

          {/* ── PRIMEIROS PASSOS (checklist simples pra quem pulou o tour) ── */}
          {!state.tourDone && !state.tourStep && (() => {
            const steps = [
              { id: 'expense', label: 'Registre seus gastos', done: (state.expenses || []).length > 0 },
              { id: 'income', label: 'Cadastre sua renda', done: (state.income > 0 || (state.receitas || []).length > 0) },
              { id: 'lesson', label: 'Complete uma lição', done: (state.completedLessons || []).length > 0 },
              { id: 'diag', label: 'Gere seu diagnóstico', done: !!state.lastDiagnosticDate },
            ]
            const doneCount = steps.filter(s => s.done).length
            if (doneCount === steps.length) {
              setTimeout(() => setState(prev => { const n = { ...prev, tourDone: true }; save(n); return n }), 1000)
              return null
            }
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>PRIMEIROS PASSOS — {doneCount}/{steps.length}</div>
                <div style={card}>
                  <div style={{ background: "#F0F0F0", borderRadius: 4, height: 5, marginBottom: 10 }}>
                    <div style={{ background: "linear-gradient(90deg,#7C3AED,#A78BFA)", height: "100%", borderRadius: 4, width: `${(doneCount / steps.length) * 100}%`, transition: "width 0.5s" }} />
                  </div>
                  {steps.map((s, i) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: s.done ? "#22C55E" : "#777" }}>
                      {s.done ? <CheckCircle size={14} color="#22C55E" /> : <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #DDD" }} />}
                      <span style={{ textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── MISSÕES SEMANAIS ── */}
          {(() => {
            const missions = getWeeklyMissions()
            const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toDateString() })()
            const wm = state.weeklyMissions || {}
            const isSameWeek = wm.weekStart === weekStart
            const progress = isSameWeek ? (wm.progress || {}) : {}
            const claimed = isSameWeek ? (wm.claimed || []) : []

            const getProgress = (m) => {
              switch (m.type) {
                case 'lessons': return Math.min(m.target, progress.lessons || 0)
                case 'perfect': return Math.min(m.target, progress.perfect || 0)
                case 'expenses': return Math.min(m.target, progress.expenses || 0)
                case 'streak': return Math.min(m.target, state.streak || 0)
                case 'xp': return Math.min(m.target, state.weeklyXp || 0)
                case 'combo': return Math.min(m.target, progress.combo || 0)
                default: return 0
              }
            }

            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>MISSÕES DA SEMANA</div>
                <div style={card}>
                  {missions.map((m, i) => {
                    const prog = getProgress(m)
                    const done = prog >= m.target
                    const isClaimed = claimed.includes(m.id)
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < missions.length - 1 ? "1px solid #F0F0F0" : "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: done ? "#F0FDF4" : "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isClaimed ? <CheckCircle size={16} color="#22C55E" /> : done ? <Sparkles size={16} color="#22C55E" /> : (() => {
                            const MISSION_ICONS = { book: BookOpen, star: Sparkles, credit: CreditCard, flame: Flame, zap: Zap, target: Target }
                            const Icon = MISSION_ICONS[m.icon] || Target
                            return <Icon size={16} color="#7C3AED" />
                          })()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isClaimed ? "#22C55E" : "#333" }}>{m.label}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                            <div style={{ background: "#F0F0F0", borderRadius: 3, height: 4, flex: 1 }}>
                              <div style={{ background: done ? "#22C55E" : "#7C3AED", height: "100%", borderRadius: 3, width: Math.min(100, Math.max(0, prog) / m.target * 100) + "%", transition: "width 0.5s" }} />
                            </div>
                            <span style={{ fontSize: 9, color: "#BBB", fontWeight: 600, flexShrink: 0 }}>+{m.xp}XP +{m.coins}$</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {isClaimed ? <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 600 }}>Coletado</span> : done ? (
                            <button onClick={() => {
                              addXp(m.xp, 'Missão: ' + m.label); addCoins(m.coins)
                              setState(prev => {
                                const curWm = prev.weeklyMissions || {}
                                const n = { ...prev, weeklyMissions: { ...curWm, claimed: [...(curWm.claimed || []), m.id] } }
                                save(n); return n
                              })
                            }} style={{ padding: "4px 10px", borderRadius: 8, border: "none", background: "#22C55E", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Coletar</button>
                          ) : <span style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{prog}/{m.target}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* ── REVISÃO DE ERROS ── */}
          {(state.wrongAnswers || []).length >= 3 && (
            <div onClick={() => setScreen("reviewErrors")} style={{ ...card, cursor: "pointer", padding: "14px 16px", marginBottom: 12, background: "linear-gradient(135deg,rgba(239,68,68,0.04),rgba(239,68,68,0.02))", border: "1.5px solid rgba(239,68,68,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1E0A3C" }}>Revisão de erros</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{(state.wrongAnswers || []).length} perguntas pra revisar</div>
                </div>
                <ArrowRight size={18} color="#EF4444" />
              </div>
            </div>
          )}

          {/* ── LIGA ── */}
          {(() => {
            const leagueIdx = LEAGUES.indexOf(state.league || 'Bronze')
            const canPromote = ranking.length >= LEAGUE_RULES.minPlayers
            const myRank = ranking.findIndex(u => u.isMe) + 1
            const isTop = myRank > 0 && myRank <= LEAGUE_RULES.promoteTop && canPromote
            const isBottom = myRank > 0 && myRank > ranking.length - LEAGUE_RULES.demoteBottom && canPromote
            return (
              <div style={{ ...card, padding: "14px 16px", marginBottom: 12, background: `linear-gradient(135deg,${getLeagueColor(state.league)}08,${getLeagueColor(state.league)}03)`, border: `1.5px solid ${getLeagueColor(state.league)}18` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Trophy size={28} color={getLeagueColor(state.league)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1E0A3C" }}>Liga {state.league}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                      {myRank > 0 ? `Posição ${myRank}° de ${ranking.length}` : 'Carregando...'}
                      {isTop && leagueIdx < LEAGUES.length - 1 && <span style={{ color: "#22C55E", fontWeight: 700 }}> — Zona de promoção!</span>}
                      {isBottom && leagueIdx > 0 && <span style={{ color: "#EF4444", fontWeight: 700 }}> — Zona de rebaixamento</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: getLeagueColor(state.league) }}>{state.weeklyXp || 0} XP/sem</div>
                </div>
              </div>
            )
          })()}

          {/* ── RANKING ── */}
          <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>RANKING</div>
          <div style={card}>
            {ranking.length === 0 && <div style={{ textAlign: "center", padding: "16px 0", color: "#BBB", fontSize: 13 }}>Carregando ranking...</div>}
            {ranking.slice(0, 10).map((u, i) => {
              const COLORS = ["#7B2FF2","#F59E0B","#22C55E","#EF4444","#3B82F6","#EC4899","#14B8A6","#F97316"];
              const color = u.isMe ? "#7B2FF2" : COLORS[i % COLORS.length];
              return (
                <div key={u.id} onClick={() => { if (!u.isMe) setProfileModal(u) }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < Math.min(ranking.length, 10) - 1 ? "1px solid #F0F0F0" : "none", cursor: u.isMe ? "default" : "pointer" }}>
                  <span style={{ width: 30, display: "flex", justifyContent: "center" }}>
                    {i < 3 ? <Medal size={28} color={i === 0 ? "#FBBF24" : i === 1 ? "#A1A1AA" : "#D97706"} /> : <span style={{ fontSize: 14, fontWeight: 700, color: "#CCC" }}>{i + 1}</span>}
                  </span>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, overflow: "hidden" }}>
                    {u.profilePhoto ? <img src={u.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (u.name || 'J')[0].toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: u.isMe ? "#7B2FF2" : "#333", fontWeight: u.isMe ? 700 : 400 }}>{u.isMe ? (u.name || 'Você') : u.name}</span>
                  <span style={{ fontSize: 13, color: "#999", fontWeight: 500 }}>{u.totalXp.toLocaleString()} XP</span>
                  {!u.isMe && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>}
                </div>
              );
            })}
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#5B21B6", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Trophy size={24} color={getLeagueColor(state.league)} /> Liga: {state.league}</div>
          </div>

          {/* Modal perfil do jogador */}
          {profileModal && (
            <div onClick={() => setProfileModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 28, padding: "28px 24px", maxWidth: 320, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative", zIndex: 201 }}>
                {/* Avatar com fundo */}
                {(() => {
                  const BG_COLORS = { padrao: ['#1A0A2E','#3B1578','#6D28D9'], praia: ['#FF6B35','#87CEEB','#0E7490'], gamer: ['#0F0326','#4C1D95','#7C3AED'], escritorio: ['#FEF3C7','#D4A574','#451A03'], natal: ['#1E3A5F','#2563EB','#0F172A'] }
                  const bgColors = BG_COLORS[profileModal.equippedBg] || BG_COLORS.padrao
                  const skinPreview = `/models/${profileModal.equippedSkin || 'quita-real'}-preview.png`
                  return (
                    <div style={{ background: `linear-gradient(160deg, ${bgColors[0]}, ${bgColors[1]}, ${bgColors[2]})`, borderRadius: 20, padding: "24px 16px", marginBottom: 16 }}>
                      <img src={skinPreview} alt={profileModal.name} style={{ height: 140, objectFit: "contain", display: "block", margin: "0 auto" }} onError={e => { e.target.src = '/models/quita-original-preview.png' }} />
                    </div>
                  )
                })()}
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1A0A2E", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {profileModal.profilePhoto && <img src={profileModal.profilePhoto} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid #E5E5E5" }} />}
                  {profileModal.name}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>Nível {profileModal.level} — Liga {profileModal.league}</div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ background: "#F5F3FF", borderRadius: 14, padding: "10px 16px", flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#7B2FF2" }}>{profileModal.totalXp.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>XP TOTAL</div>
                  </div>
                  <div style={{ background: "#FFF7ED", borderRadius: 14, padding: "10px 16px", flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#F97316" }}>{profileModal.streak}</div>
                    <div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>STREAK</div>
                  </div>
                </div>
                <button onClick={() => setProfileModal(null)} style={{ width: "100%", padding: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Fechar</button>
              </div>
            </div>
          )}

          <div style={{ height: 20 }} />
        </div>
        <NavBar />
      </div>
    );
  };


  const Lesson = () => {
    const lesson = currentLessonRef.current; if (!lesson) return null;
    const q = lesson.questions[qIdx];

    // Find parent module and lesson position
    const parentModule = (LESSONS_DATA.journeys || []).flatMap(j => j.modules).find(m => m.lessons.some(l => l.id === lesson.id));
    const lessonIdx = parentModule ? parentModule.lessons.findIndex(l => l.id === lesson.id) : 0;
    const totalInModule = parentModule ? parentModule.lessons.length : 1;
    const parentJourney = (LESSONS_DATA.journeys || []).find(j => j.modules.some(m => m.id === parentModule?.id));
    const jColor = parentJourney?.color || '#7C3AED';

    // Progress: content=0-10%, quiz=10-90%, done=100%
    const quizPct = lesson.questions.length > 0 ? ((qIdx + (answered ? 1 : 0)) / lesson.questions.length) : 1;
    const progress = lessonStep === "content" ? 5 : lessonStep === "done" ? 100 : 10 + quizPct * 85;

    const perfect = lessonXp === 30;
    const totalXpEarned = Math.round((lessonXp + (perfect ? 20 : 0)) * getStreakMultiplier(state.streak));
    const coinsEarned = COIN_REWARDS.lessonComplete + (perfect ? COIN_REWARDS.lessonPerfect : 0);

    // Check if this was the last lesson in module
    const wasLastLesson = parentModule && lessonIdx === totalInModule - 1;

    return (
      <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header with progress */}
        <div style={{ padding: "calc(var(--sat, 0px) + 16px) 20px 16px", background: "#fff", borderBottom: lessonStep !== "done" ? "1px solid #F5F5F5" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <button onClick={() => setScreen("world")} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0F0F0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: jColor }}>{parentModule?.name || ''}</div>
              <div style={{ fontSize: 10, color: "#BBB", marginTop: 1 }}>Lição {lessonIdx + 1} de {totalInModule}</div>
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {[0, 1, 2].map(i => <svg key={i} width="16" height="16" viewBox="0 0 16 16"><path d="M8 14s-6-4.35-6-8.5A3.5 3.5 0 018 3.28 3.5 3.5 0 0114 5.5C14 9.65 8 14 8 14z" fill={i < lives ? "#EF4444" : "#E5E5E5"} /></svg>)}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: "#F0F0F0", borderRadius: 3 }}>
            <div style={{ height: "100%", width: Math.round(progress) + "%", background: `linear-gradient(90deg, ${jColor}, ${jColor}cc)`, borderRadius: 3, transition: "width 0.5s ease" }} />
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 16px" }}>

          {/* ── Content step ── */}
          {lessonStep === "content" && <>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "inline-block", background: `${jColor}12`, borderRadius: 10, padding: "4px 12px", fontSize: 11, fontWeight: 600, color: jColor, marginBottom: 12 }}>
                {lesson.subtitle}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: "#1A0A2E", lineHeight: 1.25, letterSpacing: -0.3 }}>{lesson.title}</h2>
              <div style={{ fontSize: 15, color: "#555", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: lesson.content }} />
            </div>
          </>}

          {/* ── Quiz step ── */}
          {lessonStep === "quiz" && lives <= 0 && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
                {[0,1,2].map(i => <svg key={i} width="32" height="32" viewBox="0 0 16 16"><path d="M8 14s-6-4.35-6-8.5A3.5 3.5 0 018 3.28 3.5 3.5 0 0114 5.5C14 9.65 8 14 8 14z" fill="#E5E5E5" /></svg>)}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#EF4444", marginBottom: 6 }}>Vidas esgotadas!</h2>
              <p style={{ fontSize: 14, color: "#888", marginBottom: 24, lineHeight: 1.5 }}>Você errou 3 vezes. Revise o conteúdo e tente novamente!</p>
              <button onClick={() => { restoreAllLives(); setQIdx(0); setSelected(-1); setAnswered(false); setLessonXp(0); setLessonStep("content") }} style={{ ...btn, background: `linear-gradient(135deg,${jColor},${jColor}dd)`, marginBottom: 10, width: "100%" }}>Tentar novamente</button>
              {(state.coins || 0) >= LIVES_CONFIG.buyPrice && (
                <button onClick={() => {
                  setState(prev => { const n = { ...prev, coins: prev.coins - LIVES_CONFIG.buyPrice }; save(n); return n })
                  restoreAllLives()
                }} style={{ ...btnOut, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ fontSize: 12 }}>💰</span> Comprar 3 vidas ({LIVES_CONFIG.buyPrice} moedas)
                </button>
              )}
              <button onClick={() => setScreen("world")} style={{ marginTop: 10, padding: 12, border: "none", background: "transparent", color: "#999", fontSize: 13, cursor: "pointer", width: "100%" }}>Voltar pra trilha</button>
            </div>
          )}

          {lessonStep === "quiz" && q && lives > 0 && <>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ background: `${jColor}12`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: jColor }}>
                  Pergunta {qIdx + 1} de {lesson.questions.length}
                </div>
                {answered && selected === q.correct && <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#16A34A" }}>+10 XP</div>}
                {combo >= 3 && <div style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#F59E0B", animation: "qP 1.5s ease-in-out infinite", display: "flex", alignItems: "center", gap: 3 }}>🔥 {combo}x combo</div>}
              </div>

              {/* ── VERDADEIRO OU FALSO ── */}
              {q.type === 'truefalse' && <>
                <div style={{ background: "#F5F3FF", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1A0A2E", lineHeight: 1.5, margin: 0 }}>{q.q}</h3>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {["Verdadeiro", "Falso"].map((opt, i) => {
                    const isCorrect = i === q.correct
                    const isSelected = i === selected
                    let bg = "#fff", border = "2px solid #E8E8E8", col = "#333"
                    if (answered && isCorrect) { bg = "#F0FDF4"; border = "2px solid #22C55E"; col = "#16A34A" }
                    else if (answered && isSelected && !isCorrect) { bg = "#FEF2F2"; border = "2px solid #EF4444"; col = "#DC2626" }
                    else if (!answered && isSelected) { bg = "#F5F3FF"; border = `2px solid ${jColor}`; col = jColor }
                    return (
                      <button key={i} onClick={() => !answered && setSelected(i)} style={{
                        flex: 1, padding: "24px 16px", borderRadius: 20, border, background: bg,
                        cursor: answered ? "default" : "pointer", transition: "all 0.2s",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {i === 0 ? <path d="M20 6L9 17l-5-5"/> : <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>}
                        </svg>
                        <span style={{ fontSize: 16, fontWeight: 700, color: col }}>{opt}</span>
                      </button>
                    )
                  })}
                </div>
              </>}

              {/* ── COMPLETAR A FRASE ── */}
              {q.type === 'fill' && <>
                <div style={{ background: "#F5F3FF", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1A0A2E", lineHeight: 1.6, margin: 0 }}>
                    {q.q.split('___').map((part, pi, arr) => (
                      <span key={pi}>
                        {part}
                        {pi < arr.length - 1 && (
                          <span style={{
                            display: "inline-block", minWidth: 80, borderBottom: `3px solid ${answered ? (selected === q.correct ? "#22C55E" : "#EF4444") : selected >= 0 ? jColor : "#CCC"}`,
                            textAlign: "center", padding: "2px 8px", margin: "0 4px", fontWeight: 800,
                            color: answered ? (selected === q.correct ? "#16A34A" : "#DC2626") : selected >= 0 ? jColor : "transparent",
                          }}>
                            {selected >= 0 ? q.options[selected] : '\u00A0\u00A0\u00A0'}
                          </span>
                        )}
                      </span>
                    ))}
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {q.options.map((opt, i) => {
                    let bg = "#fff", border = "1.5px solid #E8E8E8", col = "#333"
                    if (answered && i === q.correct) { bg = "#F0FDF4"; border = "2px solid #22C55E"; col = "#16A34A" }
                    else if (answered && i === selected && i !== q.correct) { bg = "#FEF2F2"; border = "2px solid #EF4444"; col = "#DC2626" }
                    else if (!answered && i === selected) { bg = "#F5F3FF"; border = `2px solid ${jColor}`; col = jColor }
                    return (
                      <button key={i} onClick={() => !answered && setSelected(i)} style={{
                        padding: "14px 12px", borderRadius: 14, border, background: bg,
                        cursor: answered ? "default" : "pointer", fontSize: 14, fontWeight: 600,
                        color: col, transition: "all 0.2s", textAlign: "center",
                      }}>{opt}</button>
                    )
                  })}
                </div>
              </>}

              {/* ── ALTERNATIVAS (padrão) ── */}
              {(!q.type || q.type === 'multiple') && <>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#1A0A2E", lineHeight: 1.4 }}>{q.q}</h3>
                {q.options.map((opt, i) => {
                  let bg = "#fff", border = "1.5px solid #E8E8E8", col = "#333", shadow = "0 1px 4px rgba(0,0,0,0.04)";
                  if (answered && i === q.correct) { bg = "#F0FDF4"; border = "2px solid #22C55E"; col = "#16A34A"; shadow = "0 2px 12px rgba(34,197,94,0.15)"; }
                  else if (answered && i === selected && i !== q.correct) { bg = "#FEF2F2"; border = "2px solid #EF4444"; col = "#DC2626"; shadow = "0 2px 12px rgba(239,68,68,0.15)"; }
                  else if (!answered && i === selected) { bg = "#F5F3FF"; border = `2px solid ${jColor}`; col = jColor; shadow = `0 2px 12px ${jColor}20`; }
                  return (
                    <button key={i} onClick={() => !answered && setSelected(i)} style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "15px 16px", marginBottom: 10,
                      borderRadius: 16, border, background: bg, cursor: answered ? "default" : "pointer",
                      fontSize: 15, color: col, textAlign: "left", boxShadow: shadow, transition: "all 0.2s",
                    }}>
                      <span style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0,
                        background: (answered && i === q.correct) ? "#22C55E" : (answered && i === selected && i !== q.correct) ? "#EF4444" : "transparent",
                        color: (answered && (i === q.correct || (i === selected && i !== q.correct))) ? "#fff" : col,
                        borderColor: (answered && i === q.correct) ? "#22C55E" : (answered && i === selected && i !== q.correct) ? "#EF4444" : col,
                      }}>
                        {answered && i === q.correct ? "✓" : answered && i === selected && i !== q.correct ? "✕" : String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ flex: 1 }}>{opt}</span>
                    </button>
                  );
                })}
              </>}
            </div>

            {answered && (
              <div style={{
                background: selected === q.correct ? "linear-gradient(135deg,#F0FDF4,#DCFCE7)" : "linear-gradient(135deg,#FEF2F2,#FFE4E6)",
                borderRadius: 16, padding: "14px 16px", marginTop: 8,
                border: selected === q.correct ? "1px solid #BBF7D0" : "1px solid #FECACA",
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: selected === q.correct ? "#16A34A" : "#DC2626", marginBottom: 2 }}>
                  {selected === q.correct ? (combo >= 3 ? `🔥 ${combo}x combo! Correto!` : "Correto!") : "Resposta incorreta"}
                </div>
                <div style={{ fontSize: 13, color: selected === q.correct ? "#15803D" : "#B91C1C", opacity: 0.8 }}>
                  {selected === q.correct
                    ? (combo >= 3 ? `Sequência de ${combo} acertos! +10 XP` : "Excelente, +10 XP ganhos")
                    : q.type === 'truefalse' ? `A afirmação é ${q.correct === 0 ? 'verdadeira' : 'falsa'}.${q.explanation ? ' ' + q.explanation : ''}`
                    : q.type === 'fill' ? `A resposta certa era: ${q.options[q.correct]}.${q.explanation ? ' ' + q.explanation : ''}`
                    : `A resposta certa era: ${String.fromCharCode(65 + q.correct)}`
                  }
                </div>
              </div>
            )}
          </>}

          {/* ── Done step ── */}
          {lessonStep === "done" && (
            <div style={{ textAlign: "center", paddingTop: 32 }}>
              <img src={(perfect || wasLastLesson) ? "/models/quita-celebrate.png" : "/models/quita-study.png"} alt="Quita" style={{ width: wasLastLesson ? 140 : 110, height: wasLastLesson ? 140 : 110, objectFit: "contain", margin: "0 auto 16px", display: "block" }} />

              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A0A2E", marginBottom: 4 }}>
                {wasLastLesson ? "Módulo completo!" : "Lição completa!"}
              </h2>
              <div style={{ fontSize: 14, color: "#999", marginBottom: 20 }}>
                {wasLastLesson ? parentModule?.name : lesson.title}
              </div>

              {/* Stats */}
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ background: `${jColor}10`, borderRadius: 16, padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: jColor }}>+{totalXpEarned}</div>
                  <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginTop: 2 }}>XP</div>
                </div>
                <div style={{ background: "#FEF3C7", borderRadius: 16, padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#F59E0B" }}>+{coinsEarned}</div>
                  <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginTop: 2 }}>Moedas</div>
                </div>
                <div style={{ background: "#FEF2F2", borderRadius: 16, padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Flame size={20} color={getStreakColor(state.streak)} />
                    <span style={{ fontSize: 24, fontWeight: 800, color: getStreakColor(state.streak) }}>{state.streak}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginTop: 2 }}>Streak</div>
                </div>
              </div>

              {/* Badges */}
              {perfect && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", borderRadius: 12, padding: "8px 16px", marginBottom: 12 }}>
                  <Sparkles size={16} color="#F59E0B" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Lição perfeita!</span>
                </div>
              )}
              {getStreakMultiplier(state.streak) > 1.01 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${jColor}10`, borderRadius: 12, padding: "8px 16px", marginBottom: 12, marginLeft: perfect ? 8 : 0 }}>
                  <Zap size={14} color={jColor} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: jColor }}>Multiplicador {getStreakMultiplier(state.streak).toFixed(1)}x</span>
                </div>
              )}

              {/* Module progress (non-last lesson) */}
              {parentModule && !wasLastLesson && (
                <div style={{ background: "#F8F7FF", borderRadius: 16, padding: "16px", marginTop: 16, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7C6FA0", marginBottom: 8 }}>Progresso no módulo</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {parentModule.lessons.filter(l => l.questions && l.questions.length > 0).map((l, i) => {
                      const done = state.completedLessons.includes(l.id);
                      return (
                        <div key={l.id} style={{ flex: 1, height: 6, borderRadius: 3, background: done ? jColor : "#E5E0F5", transition: "background 0.5s" }} />
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>
                    {state.completedLessons.filter(id => parentModule.lessons.filter(l => l.questions && l.questions.length > 0).some(l => l.id === id)).length} de {totalInModule} lições completas
                  </div>
                </div>
              )}

              {/* Celebration card - module complete */}
              {wasLastLesson && (
                <div style={{ background: "linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)", borderRadius: 20, padding: "24px 20px", marginTop: 16, textAlign: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, left: -20, width: 80, height: 80, background: "rgba(255,255,255,0.03)", borderRadius: "50%" }} />
                  <div style={{ position: "absolute", bottom: -30, right: -10, width: 100, height: 100, background: "rgba(255,255,255,0.02)", borderRadius: "50%" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 20v2M12 2v5M8 9h8a1 1 0 001-1V8a1 1 0 00-1-1H8a1 1 0 00-1 1v0a1 1 0 001 1z"/></svg>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Módulo completo!</div>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 12 }}>Excelente! Você completou "{parentModule?.name}". O próximo módulo já está liberado!</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                    <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#FBBF24" }}>{state.streak}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>DIAS</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#A78BFA" }}>{state.completedLessons?.length || 0}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>LIÇÕES</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom button */}
        <div style={{ padding: "16px 24px 32px", background: "linear-gradient(0deg, #fff 80%, transparent)" }}>
          {lessonStep === "content" && (
            <button style={{ ...btn, background: `linear-gradient(135deg,${jColor},${jColor}dd)` }} onClick={() => setLessonStep("quiz")}>Iniciar quiz</button>
          )}
          {lessonStep === "quiz" && !answered && (
            <button style={{ ...btn, background: selected === -1 ? "#E5E5E5" : `linear-gradient(135deg,${jColor},${jColor}dd)`, color: selected === -1 ? "#999" : "#fff", boxShadow: selected === -1 ? "none" : `0 4px 16px ${jColor}40` }} disabled={selected === -1} onClick={checkAnswer}>Confirmar</button>
          )}
          {lessonStep === "quiz" && answered && (
            <button style={{ ...btn, background: `linear-gradient(135deg,${jColor},${jColor}dd)` }} onClick={nextQuestionWith3D}>
              {qIdx < lesson.questions.length - 1 ? "Próxima pergunta" : "Ver resultado"}
            </button>
          )}
          {lessonStep === "done" && (() => {
            // Encontrar próxima lição disponível
            const allL = (LESSONS_DATA.journeys || []).flatMap(j => j.modules.flatMap(m => m.lessons))
            const nextL = allL.find(l => !state.completedLessons.includes(l.id) && l.questions && l.questions.length > 0)
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {nextL && (
                  <button style={{ ...btn, background: `linear-gradient(135deg,${jColor},${jColor}dd)` }} onClick={() => startLesson(nextL)}>
                    Próxima lição →
                  </button>
                )}
                <button style={{ padding: "12px 24px", borderRadius: 16, border: `1.5px solid ${jColor}30`, background: "transparent", color: jColor, fontSize: 15, fontWeight: 600, cursor: "pointer" }} onClick={() => setScreen("world")}>
                  Voltar pra trilha
                </button>
              </div>
            )
          })()}
        </div>
      </div>
    );
  };

  const Goals = React.memo(() => {
    const [localGoalName, setLocalGoalName] = useState("");
    const [localGoalTarget, setLocalGoalTarget] = useState("");
    const [localGoalDeadline, setLocalGoalDeadline] = useState("");
    const [localShowForm, setLocalShowForm] = useState(false);
    const [customAmounts, setCustomAmounts] = useState({});

    const TEMPLATES = [
      { icon: '🛡️', label: 'Reserva de emergência', name: 'Reserva de emergência', calcTarget: () => Math.round((state.income || 3000) * 0.6 * 6) },
      { icon: '🚗', label: 'Quitar veículo', name: '', useDbt: 'veiculo' },
      { icon: '💳', label: 'Quitar dívida', name: '', useDbt: 'any' },
      { icon: '💰', label: 'Juntar valor específico', name: '' },
      { icon: '📈', label: 'Renda passiva mensal', name: 'Renda passiva', isRendaPassiva: true },
      { icon: '✈️', label: 'Viagem', name: 'Viagem' },
    ]

    const [rendaPassivaInput, setRendaPassivaInput] = useState('')

    const selectTemplate = (t) => {
      if (t.isRendaPassiva) {
        setLocalGoalName('Renda passiva')
        setLocalGoalTarget('')
        setRendaPassivaInput('')
        setLocalShowForm(true)
        return
      }
      if (t.useDbt) {
        const debt = t.useDbt === 'any' ? (state.debts || [])[0] : (state.debts || []).find(d => d.type === t.useDbt)
        if (debt) {
          setLocalGoalName('Quitar: ' + (debt.name || debt.type))
          setLocalGoalTarget(String(debt.balance || debt.total || debt.amount || 0))
        } else {
          setLocalGoalName(t.label)
          setLocalGoalTarget('')
        }
      } else {
        setLocalGoalName(t.name || '')
        setLocalGoalTarget(t.calcTarget ? String(t.calcTarget()) : '')
      }
      setLocalShowForm(true)
    }

    const handleAddGoal = () => {
      if (!localGoalName || !localGoalTarget) return;
      const t = parseFloat(localGoalTarget);
      if (isNaN(t) || t <= 0) return;
      const goalData = { id: Date.now(), name: localGoalName, target: t, saved: 0, createdAt: Date.now(), deadline: localGoalDeadline || null }
      if (localGoalName === 'Renda passiva' && rendaPassivaInput) goalData.rendaPassivaMensal = parseFloat(rendaPassivaInput)
      setState(prev => { const n = { ...prev, goals: [...prev.goals, goalData] }; n.profileCompletion = calcProfile(n); save(n); return n; });
      setLocalGoalName(""); setLocalGoalTarget(""); setLocalGoalDeadline(""); setRendaPassivaInput(''); setLocalShowForm(false);
    };

    const daysLeft = (deadline) => {
      if (!deadline) return null
      const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
      return diff
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <div style={{ ...ph, paddingBottom: 24, flexShrink: 0 }}>
          <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500, letterSpacing: 0.3 }}>Suas metas</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{state.goals.length} {state.goals.length === 1 ? "meta ativa" : "metas ativas"}</div>
          <FinTabs />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: 16 }}>
          {/* Templates */}
          {!localShowForm && <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 10 }}>Criar nova meta</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => selectTemplate(t)} style={{ padding: "14px 10px", borderRadius: 14, border: "1.5px solid #E5E5E5", background: "#fff", fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <button style={{ ...btnOut, width: "100%", marginBottom: 16 }} onClick={() => setLocalShowForm(true)}>Meta personalizada</button>
          </>}

          {/* Form */}
          {localShowForm && <div style={{ ...card, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>Nova meta</div>
            <input style={{ ...input, marginBottom: 10 }} placeholder="Nome da meta" value={localGoalName} onChange={e => setLocalGoalName(e.target.value)} autoFocus />
            {localGoalName === 'Renda passiva' ? (
              <>
                <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600, marginBottom: 4 }}>Renda passiva desejada (R$/mês)</div>
                <input style={{ ...input, marginBottom: 6 }} placeholder="Ex: 5000" type="number" value={rendaPassivaInput} onChange={e => {
                  setRendaPassivaInput(e.target.value)
                  const v = parseFloat(e.target.value)
                  if (v > 0) setLocalGoalTarget(String(Math.round((v * 12) / 0.06)))
                  else setLocalGoalTarget('')
                }} />
                {rendaPassivaInput && parseFloat(rendaPassivaInput) > 0 && (
                  <div style={{ background: "#F5F3FF", borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 11, color: "#555", lineHeight: 1.5 }}>
                    Pra gerar <strong style={{color:"#7C3AED"}}>R$ {parseFloat(rendaPassivaInput).toLocaleString("pt-BR")}/mês</strong> em proventos, considerando 6% a.a. de yield, você precisa acumular <strong style={{color:"#7C3AED"}}>R$ {Math.round((parseFloat(rendaPassivaInput) * 12) / 0.06).toLocaleString("pt-BR")}</strong> em investimentos.
                  </div>
                )}
              </>
            ) : (
              <input style={{ ...input, marginBottom: 10 }} placeholder="Valor alvo (R$)" type="number" value={localGoalTarget} onChange={e => setLocalGoalTarget(e.target.value)} />
            )}
            <div style={{ fontSize: 11, color: "#999", marginBottom: 4, fontWeight: 600 }}>Prazo (opcional)</div>
            <input type="date" style={{ ...input, marginBottom: 12, WebkitAppearance: "none" }} value={localGoalDeadline} onChange={e => setLocalGoalDeadline(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btn, flex: 1 }} onClick={handleAddGoal}>Criar meta</button>
              <button style={{ ...btnOut, flex: 1 }} onClick={() => { setLocalShowForm(false); setLocalGoalName(""); setLocalGoalTarget(""); setLocalGoalDeadline(""); setRendaPassivaInput(''); }}>Cancelar</button>
            </div>
          </div>}

          {/* Lista de metas */}
          {state.goals.map(g => {
            const pct = Math.round((g.saved / g.target) * 100);
            const customVal = customAmounts[g.id] || "";
            const dl = daysLeft(g.deadline)
            return (
              <div key={g.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{g.name}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={pct >= 100 ? pillGreen : pill}>{pct >= 100 ? "Concluída!" : pct + "%"}</span>
                    <button onClick={() => { if(window.confirm("Excluir a meta '"+g.name+"'?")) deleteGoal(g.id); }} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:"#CCC",fontSize:16}} title="Excluir meta">✕</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>R$ {g.saved.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ {g.target.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                {g.rendaPassivaMensal && <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600, marginBottom: 4 }}>Objetivo: R$ {g.rendaPassivaMensal.toLocaleString("pt-BR")}/mês em proventos (6% a.a.) — Patrimônio necessário: R$ {Math.round((g.rendaPassivaMensal * 12) / 0.06).toLocaleString("pt-BR")}</div>}
                {!g.rendaPassivaMensal && /renda passiva/i.test(g.name) && g.target < 200000 && <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600, marginBottom: 4 }}>Objetivo: R$ {g.target.toLocaleString("pt-BR")}/mês em proventos (6% a.a.) — Patrimônio necessário: R$ {Math.round((g.target * 12) / 0.06).toLocaleString("pt-BR")}</div>}
                {dl !== null && <div style={{ fontSize: 11, color: dl <= 0 ? "#EF4444" : dl <= 30 ? "#F59E0B" : "#3B82F6", fontWeight: 600, marginBottom: 6 }}>{dl <= 0 ? "Prazo expirado" : `${dl} dias restantes`} — {new Date(g.deadline).toLocaleDateString("pt-BR")}</div>}
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
          {state.goals.length === 0 && !localShowForm && <div style={{ textAlign: "center", color: "#BBB", padding: 32, fontSize: 13 }}>Escolha um template acima para começar!</div>}
        </div>
        </div>
      </div>
    );
  });

  const Profile = React.memo(() => {
    const [editName, setEditName] = useState(false);
    const [nameInput, setNameInput] = useState(state.name || '');
    const [editAge, setEditAge] = useState(false);
    const [ageInput, setAgeInput] = useState(String(state.age || ''));
    const fileInputRef = useRef(null);
    const [cropImg, setCropImg] = useState(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
    const dragRef = useRef(null);
    const saveName = () => { if (nameInput.trim().length >= 2) { setState(prev => { const n = { ...prev, name: nameInput.trim() }; save(n); return n }); setEditName(false) } };
    const saveAge = () => { const a = parseInt(ageInput); if (a >= 10 && a <= 120) { setState(prev => { const n = { ...prev, age: a }; save(n); return n }); setEditAge(false) } };

    const handlePhotoSelect = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => { setCropImg(ev.target.result); setCropZoom(1); setCropPos({ x: 0, y: 0 }) }
      reader.readAsDataURL(file)
      e.target.value = ''
    }

    const handleCropConfirm = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 160; canvas.height = 160
        const ctx = canvas.getContext('2d')
        const viewSize = 240
        const scaledW = img.width * cropZoom, scaledH = img.height * cropZoom
        const drawW = viewSize, drawH = viewSize
        // Mapear posição do crop para coordenadas da imagem
        const srcSize = Math.min(img.width, img.height) / cropZoom
        const centerX = img.width / 2 - (cropPos.x / viewSize) * srcSize
        const centerY = img.height / 2 - (cropPos.y / viewSize) * srcSize
        const sx = centerX - srcSize / 2, sy = centerY - srcSize / 2
        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, 160, 160)
        const base64 = canvas.toDataURL('image/jpeg', 0.7)
        setState(prev => { const n = { ...prev, profilePhoto: base64 }; save(n); return n })
        setCropImg(null)
      }
      img.src = cropImg
    }

    const handleDragStart = (clientX, clientY) => { dragRef.current = { startX: clientX - cropPos.x, startY: clientY - cropPos.y } }
    const handleDragMove = (clientX, clientY) => {
      if (!dragRef.current) return
      const maxOffset = 120 * (cropZoom - 1) + 40
      setCropPos({ x: Math.max(-maxOffset, Math.min(maxOffset, clientX - dragRef.current.startX)), y: Math.max(-maxOffset, Math.min(maxOffset, clientY - dragRef.current.startY)) })
    }
    const handleDragEnd = () => { dragRef.current = null }
    const pinchRef = useRef(null)
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        pinchRef.current = { startDist: d, startZoom: cropZoom }
      } else if (e.touches.length === 1) {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        const scale = d / pinchRef.current.startDist
        setCropZoom(Math.max(1, Math.min(3, pinchRef.current.startZoom * scale)))
      } else if (e.touches.length === 1 && !pinchRef.current) {
        e.preventDefault()
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current = null
      if (e.touches.length === 0) handleDragEnd()
    }

    const totalCoins = state.coins || 0;
    const completedCount = state.completedLessons?.length || 0;
    const [badgeModal, setBadgeModal] = useState(null);
    const badges = [
      { name: "Primeiro passo", desc: "Complete sua primeira lição", howTo: "Vá na trilha e complete qualquer lição.", done: completedCount >= 1, Icon: BookOpen, color: "#7B2FF2" },
      { name: "Semana perfeita", desc: "Mantenha streak de 7 dias", howTo: "Complete pelo menos 1 lição por dia durante 7 dias seguidos.", done: state.streak >= 7, Icon: Flame, color: "#F97316" },
      { name: "Detetive de gastos", desc: "Registre 50+ gastos", howTo: "Registre ou importe seus gastos até atingir 50 no total.", done: state.expenses.length >= 50, Icon: Search, color: "#3B82F6", progress: `${Math.min(50, state.expenses.length)}/50` },
      { name: "Mês de ferro", desc: "Streak de 30 dias seguidos", howTo: "Complete 1 lição por dia durante 30 dias sem falhar.", done: state.streak >= 30, Icon: Dumbbell, color: "#EF4444", progress: `${Math.min(30, state.streak)}/30` },
      { name: "Livre de dívidas", desc: "Quite todas as dívidas ou não tenha nenhuma", howTo: "Quite todas as dívidas cadastradas ou marque que não tem dívidas.", done: state.noDebts || (state.debts || []).every(d => (d.paid || 0) >= (d.total || d.balance || 0)), Icon: Snowflake, color: "#06B6D4" },
      { name: "Cofre cheio", desc: "Acumule 1.000 moedas", howTo: "Ganhe moedas completando lições, registrando gastos e mantendo streak.", done: totalCoins >= 1000, Icon: Coins, color: "#F59E0B", progress: `${Math.min(1000, totalCoins)}/1000` },
      { name: "Explorador", desc: "Complete 50 lições", howTo: "Continue estudando na trilha — cada lição te aproxima!", done: completedCount >= 50, Icon: Target, color: "#22C55E", progress: `${Math.min(50, completedCount)}/50` },
      { name: "Mestre financeiro", desc: "Complete 100 lições", howTo: "Aprofunde seus conhecimentos completando 100 lições.", done: completedCount >= 100, Icon: GraduationCap, color: "#8B5CF6", progress: `${Math.min(100, completedCount)}/100` },
    ];
    const unlockedCount = badges.filter(b => b.done).length;

    return (
    <div style={{ background: "#F0EDF8", minHeight: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(160deg,#1E0A3C 0%,#3B1578 35%,#6D28D9 100%)", padding: "24px 20px 28px", paddingTop: "calc(24px + var(--sat, 0px))", borderRadius: "0 0 28px 28px", boxShadow: "0 8px 32px rgba(30,10,60,0.4)", textAlign: "center" }}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
        <div onClick={() => fileInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#A855F7,#7C3AED)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(255,255,255,0.2)", fontSize: 32, fontWeight: 800, color: "#fff", cursor: "pointer", overflow: "hidden", position: "relative" }}>
          {state.profilePhoto ? (
            <img src={state.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (userName || 'J')[0].toUpperCase()}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "2px 0", fontSize: 8, color: "#fff", fontWeight: 600 }}>EDITAR</div>
        </div>
        {editName ? (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", margin: "0 auto", maxWidth: 250 }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()} autoFocus
              style={{ padding: "8px 14px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 16, fontWeight: 600, outline: "none", textAlign: "center", flex: 1 }} />
            <button onClick={saveName} style={{ padding: "8px 14px", borderRadius: 12, border: "none", background: "#A855F7", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>OK</button>
          </div>
        ) : (
          <div onClick={() => { setNameInput(state.name || userName); setEditName(true) }} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{userName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>toque pra editar</div>
          </div>
        )}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{user.email}</div>
        {editAge ? (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", margin: "8px auto 0", maxWidth: 180 }}>
            <input value={ageInput} onChange={e => setAgeInput(e.target.value.replace(/\D/g,'').slice(0,3))} onKeyDown={e => e.key === 'Enter' && saveAge()} autoFocus type="tel" inputMode="numeric" placeholder="Idade"
              style={{ padding: "6px 12px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, fontWeight: 600, outline: "none", textAlign: "center", width: 70 }} />
            <button onClick={saveAge} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#A855F7", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>OK</button>
            <button onClick={() => setEditAge(false)} style={{ padding: "6px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>X</button>
          </div>
        ) : (
          <div onClick={() => { setAgeInput(String(state.age || '')); setEditAge(true) }} style={{ cursor: "pointer", marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{state.age ? `${state.age} anos` : 'Adicionar idade'}</span>
            {!state.age && <span style={{ fontSize: 10, color: "#A855F7", marginLeft: 6 }}>+ adicionar</span>}
          </div>
        )}
        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 14px" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#A855F7" }}>Nv {state.level + 1}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>—</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{levelInfo.name}</span>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            ["XP Total", state.xp.toLocaleString(), Zap, "#FBBF24"],
            ["Streak", state.streak + " dias", Flame, "#F97316"],
            ["Lições", completedCount + "/" + totalLessonsCount, BookOpen, "#7B2FF2"],
            ["Liga", state.league, Trophy, getLeagueColor(state.league)],
          ].map(([l, v, Icon, c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 16, padding: "14px 12px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <Icon size={22} color={c} style={{ margin: "0 auto 6px", display: "block" }} />
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1A0A2E" }}>{v}</div>
              <div style={{ fontSize: 10, color: "#AAA", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Moedas + Loja */}
        <div onClick={() => setScreen("loja")} style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", borderRadius: 16, padding: "14px 18px", marginBottom: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, border: "1.5px solid #FCD34D" }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#F59E0B,#FBBF24)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Coins size={22} color="#92400E" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#92400E" }}>{totalCoins} moedas</div>
            <div style={{ fontSize: 11, color: "#B45309", marginTop: 1 }}>Toque pra abrir a loja</div>
          </div>
          <ArrowRight size={18} color="#B45309" />
        </div>

        {/* Conquistas */}
        <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 10, letterSpacing: 1, display: "flex", justifyContent: "space-between" }}>
          <span>CONQUISTAS</span>
          <span style={{ color: "#7C3AED" }}>{unlockedCount}/{badges.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {badges.map((b, i) => (
            <div key={i} onClick={() => setBadgeModal(b)} style={{ background: "#fff", borderRadius: 16, padding: "14px 8px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.03)", opacity: b.done ? 1 : 0.4, cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: b.done ? `${b.color}15` : "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                {b.done ? <b.Icon size={22} color={b.color} /> : <Lock size={18} color="#CCC" />}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: b.done ? "#333" : "#CCC", lineHeight: 1.3 }}>{b.name}</div>
            </div>
          ))}
        </div>

        {/* Modal da conquista */}
        {badgeModal && (
          <div onClick={() => setBadgeModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", maxWidth: 320, width: "100%", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: badgeModal.done ? `${badgeModal.color}15` : "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {badgeModal.done ? <badgeModal.Icon size={32} color={badgeModal.color} /> : <Lock size={28} color="#CCC" />}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: badgeModal.done ? "#1A0A2E" : "#999", marginBottom: 4 }}>{badgeModal.name}</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{badgeModal.desc}</div>
              {badgeModal.done ? (
                <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>Conquista desbloqueada!</div>
                </div>
              ) : (
                <div style={{ background: "#F8F7FE", borderRadius: 12, padding: "12px 16px", marginBottom: 16, textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 4 }}>COMO DESBLOQUEAR</div>
                  <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{badgeModal.howTo}</div>
                  {badgeModal.progress && <div style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginTop: 8 }}>Progresso: {badgeModal.progress}</div>}
                </div>
              )}
              <button onClick={() => setBadgeModal(null)} style={{ width: "100%", padding: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Fechar</button>
            </div>
          </div>
        )}

        {/* Dados financeiros */}
        <div style={{ fontSize: 11, color: "#9B8EBE", fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>DADOS FINANCEIROS</div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Dados preenchidos</span><span style={{ fontSize: 13, fontWeight: 700, color: "#7B2FF2" }}>{state.profileCompletion}%</span></div>
          <div style={{ background: "#EDE9FE", borderRadius: 6, height: 8, marginBottom: 12 }}><div style={{ background: "linear-gradient(90deg,#6B21E8,#9B5FF7)", borderRadius: 6, height: "100%", width: state.profileCompletion + "%", transition: "width 0.6s" }} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              [state.name && state.name.length >= 2, "Nome preenchido", () => { setNameInput(state.name || ''); setEditName(true) }],
              [(state.receitas||[]).length > 0, "Receitas cadastradas", () => navigate("receitas")],
              [(state.expenses||[]).filter(e=>!e.oculto).length >= 3, "3+ gastos registrados", () => navigate("expenses")],
              [(state.debts||[]).length > 0 || state.noDebts, "Dívidas mapeadas", () => navigate("debts")],
              [(state.goals||[]).length > 0, "Metas definidas", () => navigate("goals")],
              [(state.patrimonio?.reserva || 0) > 0 || Object.values(state.patrimonio?.investimentos || {}).some(v => v > 0) || state.noPatrimonio, "Patrimônio informado", () => navigate("patrimonio")],
              [!!state.savedDiagnostic, "Diagnóstico gerado", () => navigate("diagnostico")],
            ].map(([done, label, action], i) => (
              <div key={i} onClick={action} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 0" }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: done ? "#DCFCE7" : "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done ? <CheckCircle size={12} color="#16A34A" /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DDD" }} />}
                </div>
                <span style={{ fontSize: 12, color: done ? "#16A34A" : "#AAA", fontWeight: done ? 600 : 400, flex: 1 }}>{label}</span>
                {!done && <ArrowRight size={12} color="#CCC" />}
              </div>
            ))}
          </div>
        </div>

        {/* Sair */}
        {/* Feedback */}
        <button onClick={() => window.open('https://forms.gle/NALCNNwm19oKVNh4A', '_blank')} style={{ width: "100%", padding: 14, borderRadius: 14, border: "1.5px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.04)", color: "#7C3AED", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Dar feedback
        </button>

        <button onClick={() => { trackLogout(); onSignOut() }} style={{ width: "100%", padding: 14, borderRadius: 14, border: "1.5px solid #FECACA", background: "rgba(254,226,226,0.3)", color: "#EF4444", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Sair da conta</button>
      </div>

      {/* Modal de crop da foto */}
      {cropImg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Ajustar foto</div>
          {/* Área de crop circular */}
          <div style={{ width: 240, height: 240, borderRadius: "50%", overflow: "hidden", position: "relative", border: "3px solid rgba(255,255,255,0.3)", touchAction: "none" }}
            onMouseDown={e => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={e => handleDragMove(e.clientX, e.clientY)}
            onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img src={cropImg} alt="" draggable={false} style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(calc(-50% + ${cropPos.x}px), calc(-50% + ${cropPos.y}px)) scale(${cropZoom})`, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", userSelect: "none" }} />
          </div>
          {/* Zoom slider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, width: 240 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/></svg>
            <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={e => setCropZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: "#7C3AED" }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M11 8v6M8 11h6"/></svg>
          </div>
          {/* Botões */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, width: 240 }}>
            <button onClick={() => setCropImg(null)} style={{ flex: 1, padding: 12, borderRadius: 14, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            <button onClick={handleCropConfirm} style={{ flex: 1, padding: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Confirmar</button>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );});

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif", maxWidth: 430, margin: "0 auto", position: "relative", background: "#F2F0F8", minHeight: "100vh", color: "#1A0A2E" }}>
      <Toast />

      {/* Modal de restauração de streak */}
      {streakRestoreModal && state.lostStreak > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(26,10,46,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😢</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1A0A2E", marginBottom: 6 }}>Seu streak acabou!</h2>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 4, lineHeight: 1.5 }}>Você tinha um streak de <strong style={{ color: "#F97316" }}>{state.lostStreak} dias</strong></p>
            <p style={{ fontSize: 13, color: "#BBB", marginBottom: 20 }}>Restaure seu streak por moedas ou comece do zero.</p>
            {(state.coins || 0) >= 100 ? (
              <button onClick={() => {
                setState(prev => {
                  const n = { ...prev, streak: prev.lostStreak, coins: prev.coins - 100, lostStreak: 0 }
                  save(n); return n
                })
                setStreakRestoreModal(false)
                setToast("🔥 Streak de " + state.lostStreak + " dias restaurado!")
                setTimeout(() => setToast(null), 3500)
              }} style={{ width: "100%", padding: 14, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#F59E0B,#FBBF24)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span>Restaurar streak</span>
                <span style={{ background: "rgba(255,255,255,0.3)", borderRadius: 8, padding: "2px 8px", fontSize: 12 }}>100 moedas</span>
              </button>
            ) : (
              <div style={{ background: "#FEF2F2", borderRadius: 12, padding: 12, marginBottom: 8, fontSize: 13, color: "#DC2626" }}>
                Você precisa de 100 moedas para restaurar (tem {state.coins || 0})
              </div>
            )}
            <button onClick={() => {
              setState(prev => { const n = { ...prev, lostStreak: 0 }; save(n); return n })
              setStreakRestoreModal(false)
            }} style={{ width: "100%", padding: 12, borderRadius: 14, border: "1.5px solid #E5E5E5", background: "transparent", color: "#999", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Começar do zero
            </button>
          </div>
        </div>
      )}

      {/* Modal de senha para arquivos protegidos */}
      {filePasswordModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(26,10,46,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 360, boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1A0A2E" }}>Arquivo protegido</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 6, lineHeight: 1.5 }}>
                Este {filePasswordModal.type === 'excel' ? 'Excel' : 'PDF'} está protegido por senha. Digite a senha para continuar.
              </div>
            </div>
            <input
              type="password" value={filePassword} onChange={e => setFilePassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Senha do arquivo" autoFocus
              style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "1.5px solid rgba(124,58,237,0.15)", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12, background: "#FAFAFA", color: "#333" }}
            />
            <button onClick={handlePasswordSubmit} disabled={!filePassword} style={{
              width: "100%", padding: 14, borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700, cursor: filePassword ? "pointer" : "default",
              background: filePassword ? "linear-gradient(160deg,#1E0A3C,#3B1578,#6D28D9)" : "#E5E5E5",
              color: filePassword ? "#fff" : "#999", marginBottom: 8,
            }}>Desbloquear</button>
            <button onClick={() => { setFilePasswordModal(null); setFilePassword('') }} style={{
              width: "100%", padding: 12, borderRadius: 14, border: "none", background: "transparent", color: "#999", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>Cancelar</button>
          </div>
        </div>
      )}

      {screen === "home" && <Home />}

      {/* ── QUITA 3D VIEWER (tela cheia) ── */}
      {screen === "quita3d" && (
        <div style={{ background: bgStyle.world, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "fixed", inset: 0, touchAction: "none" }}>
          <button onClick={() => setScreen("home")} style={{
            position: "absolute", top: "calc(20px + var(--sat, 0px))", left: 16,
            width: 44, height: 44, zIndex: 3, background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: "50%",
            color: "#fff", cursor: "pointer", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div ref={cardRef} style={{ width: "100%", maxWidth: 430, height: "40vh", maxHeight: 340, position: "relative", borderRadius: 20 }}>
            <canvas ref={setCanvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 20, cursor: "grab" }} />
          </div>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Arraste pra rotacionar</div>
          </div>
        </div>
      )}
      {screen === "world" && (
        <TrilhaScreen state={state} styles={{ph,card}} startLesson={startLesson} NavBar={NavBar} embedded={false} onSpecialComplete={onSpecialComplete} lives={lives} nextLifeStr={nextLifeStr} />
      )}

      {/* ── FINANCEIRO (sub-tabs) ── */}
      {screen === "financeiro" && (
        <div style={{ background: "#F2F0F8", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {finTab === "receitas" && <ReceitasScreen state={state} styles={{ph,card,btn,btnOut,input,NavBar:()=>null}} addReceita={addReceita} deleteReceita={deleteReceita} FinTabs={FinTabs} />}
          {finTab === "expenses" && <ExpensesScreen
            state={state}
            styles={{ph,card,btn,btnOut,input,NavBar:()=>null}}
            handlers={{updateExpenseCategory,deleteExpense,handleExcelUpload,handlePdfUpload,handleDetailFatura,confirmPdfImport,togglePdfItem,updatePdfItemCategory,addExpense,toggleOcultar}}
            filters={{monthFilter,setMonthFilter,catFilters,setCatFilters,customRange,setCustomRange,showCustomRange,setShowCustomRange,importStep,setImportStep,pdfParsing,pdfPreview,setPdfPreview,showExpenseForm,setShowExpenseForm,expName,setExpName,expAmount,setExpAmount,expCat,setExpCat,expDate,setExpDate,totalExpenses,rendaTotal,filterByMonth}}
            FinTabs={FinTabs}
          />}
          {finTab === "debts" && <DebtsScreen state={state} setState={setState} save={save} styles={{ph,card,btn,btnOut,input}} addDebt={addDebt} deleteDebt={deleteDebt} NavBar={()=>null} FinTabs={FinTabs} />}
          {finTab === "patrimonio" && <PatrimonioScreen state={state} setState={setState} save={save} FinTabs={FinTabs} />}
          {finTab === "goals" && <Goals />}
          <div style={{ flexShrink: 0 }}><NavBar /></div>
        </div>
      )}

      {/* ── DIAGNÓSTICO (sub-tabs) ── */}
      {screen === "lesson" && <Lesson />}

      {/* ── REVISÃO DE ERROS ── */}
      {screen === "reviewErrors" && (() => {
        const wrongs = state.wrongAnswers || []
        return (
          <div style={{ background: "#F2F0F8", minHeight: "100vh" }}>
            <div style={{ background: "linear-gradient(160deg,#7F1D1D,#DC2626)", color: "#fff", padding: "calc(var(--sat, 0px) + 16px) 20px 20px", borderRadius: "0 0 28px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setScreen("home")} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                </button>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>Revisão de erros</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{wrongs.length} perguntas pra revisar</div>
                </div>
              </div>
            </div>
            <div style={{ padding: 16, paddingBottom: 100 }}>
              {wrongs.length === 0 ? (
                <div style={{ ...card, textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>Tudo revisado!</div>
                  <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Continue estudando pra não acumular erros.</div>
                </div>
              ) : wrongs.map((w, idx) => (
                <div key={idx} style={{ ...card, marginBottom: 12, padding: 16 }}>
                  <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 6 }}>Pergunta {idx + 1} de {wrongs.length}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1E0A3C", marginBottom: 14, lineHeight: 1.4 }}>{w.q}</div>

                  {/* Sua resposta (errada) */}
                  <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 6, background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.25)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>Sua resposta</div>
                        <span style={{ fontSize: 13, color: "#DC2626", fontWeight: 600 }}>
                          {w.type === 'truefalse'
                            ? (w.selected === 0 ? 'Verdadeiro' : 'Falso')
                            : w.options && w.selected != null ? w.options[w.selected] : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resposta correta */}
                  <div style={{ padding: "10px 14px", borderRadius: 12, marginBottom: 6, background: "rgba(34,197,94,0.06)", border: "1.5px solid rgba(34,197,94,0.25)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>Resposta correta</div>
                        <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 600 }}>
                          {w.type === 'truefalse'
                            ? (w.correct === 0 ? 'Verdadeiro' : 'Falso')
                            : w.options ? w.options[w.correct] : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {wrongs.length > 0 && (
                <button onClick={() => {
                  if (window.confirm("Limpar todas as perguntas revisadas?")) {
                    setState(prev => { const n = { ...prev, wrongAnswers: [] }; save(n); return n })
                    setScreen("home")
                  }
                }} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#22C55E,#16A34A)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Já revisei tudo — limpar erros
                </button>
              )}
            </div>
          </div>
        )
      })()}
      {screen === "profile" && <Profile />}
      {screen === "checkContas" && <CheckContasScreen state={state} setState={setState} save={save} addXp={addXp} addCoins={addCoins} onBack={() => setScreen("home")} />}
      {screen === "revisaoSemanal" && <RevisaoSemanalScreen state={state} setState={setState} save={save} addXp={addXp} addCoins={addCoins} onBack={() => setScreen("home")} />}
      {screen === "coach" && <CoachScreen state={state} setState={setState} save={save} onBack={() => setScreen("home")} navigate={navigate} NavBar={NavBar} />}
      {screen === "loja" && <LojaScreen state={state} setState={setState} save={save} loadModel={loadModel} setBackground={setBackground} onBack={() => setScreen("home")} NavBar={NavBar} />}

      {/* ── TOUR GUIADO (tooltips in-app) ── */}
      {tourStep !== null && (() => {
        const TOUR = [
          { title: "Aba Financeiro", desc: "Aqui você controla todo o seu dinheiro. Vamos conhecer cada seção.", screen: "financeiro", tab: "expenses", pos: "nav", navIdx: 3 },
          { title: "Gastos", desc: "Registre seus gastos manualmente ou importe a fatura do cartão. A Quita categoriza tudo automaticamente.", screen: "financeiro", tab: "expenses", pos: "tab", tabIdx: 0 },
          { title: "Receitas", desc: "Cadastre sua renda mensal e receitas extras pra ter um retrato completo da sua situação.", screen: "financeiro", tab: "receitas", pos: "tab", tabIdx: 1 },
          { title: "Dívidas", desc: "Cadastre suas dívidas com valor e juros. A IA vai considerar tudo pra montar seu plano.", screen: "financeiro", tab: "debts", pos: "tab", tabIdx: 2 },
          { title: "Patrimônio", desc: "Registre seus bens e investimentos pra um raio-x completo.", screen: "financeiro", tab: "patrimonio", pos: "tab", tabIdx: 3 },
          { title: "Metas", desc: "Crie metas financeiras com prazo e valor. O app acompanha seu progresso.", screen: "financeiro", tab: "goals", pos: "tab", tabIdx: 4 },
          { title: "Aba Trilha", desc: "Aprenda sobre finanças com lições curtas e gamificadas. Ganhe XP, moedas e suba no ranking.", screen: "world", pos: "nav", navIdx: 1 },
          { title: "Aba Quita IA", desc: "Sua mentora financeira pessoal. Tem 3 funções que vou te mostrar.", screen: "coach", pos: "nav", navIdx: 2 },
          { title: "Chat", desc: "Converse sobre suas finanças. A IA conhece todos os seus dados e dá orientações personalizadas.", screen: "coach", pos: "coachTab", coachTabIdx: 0 },
          { title: "Diagnóstico", desc: "Gera um score de 0 a 100 com base nas suas finanças reais. Mostra seus pontos fortes e o que melhorar.", screen: "coach", pos: "coachTab", coachTabIdx: 1 },
          { title: "Plano de ação", desc: "A IA monta um plano personalizado com ações concretas pra melhorar suas finanças mês a mês.", screen: "coach", pos: "coachTab", coachTabIdx: 2 },
          { title: "Aba Início", desc: "Aqui você acompanha missões semanais, ranking e seu progresso. Comece registrando seus gastos!", screen: "home", pos: "nav", navIdx: 0 },
        ]

        const step = TOUR[tourStep]
        if (!step) return null
        const total = TOUR.length
        const isLast = tourStep === total - 1

        const goToStep = (idx) => {
          const s = TOUR[idx]
          if (s.screen) setScreen(s.screen)
          if (s.tab) setFinTab(s.tab)
          setTourStep(idx)
        }

        const next = () => {
          if (isLast) {
            setTourStep(null)
            setState(prev => { const n = { ...prev, tourDone: true }; save(n); return n })
          } else {
            goToStep(tourStep + 1)
          }
        }

        const skip = () => {
          setTourStep(null)
          setScreen("home")
          setState(prev => { const n = { ...prev, tourDone: true }; save(n); return n })
        }

        // Posições do tooltip
        const tooltipStyle = (() => {
          const base = { position: "fixed", left: 16, right: 16, zIndex: 9999, background: "#fff", borderRadius: 18, padding: "16px 18px", boxShadow: "0 8px 40px rgba(0,0,0,0.2)", animation: "qI 0.25s ease both" }
          if (step.pos === "tab" || step.pos === "coachTab") return { ...base, top: "calc(var(--sat, 0px) + 140px)" }
          if (step.pos === "nav") return { ...base, bottom: "calc(var(--sab, 0px) + 75px)" }
          return { ...base, top: "50%", transform: "translateY(-50%)" }
        })()

        // Seta apontando pro elemento
        const arrowEl = (() => {
          const base = { position: "absolute", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent" }

          if (step.pos === "nav") {
            const navPositions = [10, 30, 50, 70, 90]
            const leftPct = step.navIdx !== undefined ? navPositions[step.navIdx] : 50
            return <div style={{ ...base, bottom: -10, left: `${leftPct}%`, transform: "translateX(-50%)", borderTop: "10px solid #fff" }} />
          }

          if (step.pos === "tab") {
            const tabPositions = [10, 28, 48, 68, 88]
            const leftPct = step.tabIdx !== undefined ? tabPositions[step.tabIdx] : 50
            return <div style={{ ...base, top: -10, left: `${leftPct}%`, transform: "translateX(-50%)", borderBottom: "10px solid #fff" }} />
          }

          if (step.pos === "coachTab") {
            const coachPositions = [20, 50, 80]
            const leftPct = step.coachTabIdx !== undefined ? coachPositions[step.coachTabIdx] : 50
            return <div style={{ ...base, top: -10, left: `${leftPct}%`, transform: "translateX(-50%)", borderBottom: "10px solid #fff" }} />
          }

          return null
        })()

        return (
          <>
            <div onClick={next} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 9998 }} />

            {step.pos === "nav" && step.navIdx !== undefined && (
              <div style={{
                position: "fixed", bottom: 0, left: `${step.navIdx * 20}%`, width: "20%",
                height: "calc(var(--sab, 0px) + 56px)", background: "rgba(124,58,237,0.12)",
                borderTop: "2px solid #7C3AED", zIndex: 9998, pointerEvents: "none",
              }} />
            )}

            <div style={tooltipStyle}>
              {arrowEl}

              <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 12 }}>
                {TOUR.map((_, i) => (
                  <div key={i} style={{
                    width: i === tourStep ? 16 : 5, height: 5, borderRadius: 3,
                    background: i === tourStep ? "#7C3AED" : i < tourStep ? "#C4B5FD" : "#E8E8E8",
                    transition: "all 0.3s",
                  }} />
                ))}
              </div>

              <div style={{ fontSize: 15, fontWeight: 800, color: "#1E0A3C", marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5, marginBottom: 14 }}>{step.desc}</div>

              <div style={{ display: "flex", gap: 8 }}>
                {!isLast && (
                  <button onClick={skip} style={{
                    padding: "10px 16px", borderRadius: 12, border: "1.5px solid #E8E8E8",
                    background: "#fff", color: "#999", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>Pular</button>
                )}
                <button onClick={next} style={{
                  flex: 1, padding: "10px 16px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>{isLast ? "Começar!" : `Próximo (${tourStep + 1}/${total})`}</button>
              </div>
            </div>
          </>
        )
      })()}

    </div>
  );

}