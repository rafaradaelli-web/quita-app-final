// ── Analytics Service (PostHog) — Completo ──
// Rastreia todo o ciclo de vida do usuário no Quita

const POSTHOG_KEY = 'phc_uH3au5aEhk8pnJ6VpgmDtE2CqGSnMENPkqZk7BA9r54R' // Substituir pela key real
const POSTHOG_HOST = 'https://us.i.posthog.com'

let identified = false
let sessionStartTime = Date.now()

export function initAnalytics() {
  if (window.posthog || POSTHOG_KEY === '__POSTHOG_KEY__') return
  const script = document.createElement('script')
  script.innerHTML = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageviewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${POSTHOG_KEY}', {
      api_host: '${POSTHOG_HOST}',
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
    });
  `
  document.head.appendChild(script)
  sessionStartTime = Date.now()
}

function track(event, properties = {}) {
  if (!window.posthog) return
  window.posthog.capture(event, {
    ...properties,
    session_duration_s: Math.round((Date.now() - sessionStartTime) / 1000),
    platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    pwa: window.matchMedia('(display-mode: standalone)').matches,
  })
}

// ═══════════════════════════════════════════════════════════════
// IDENTIFICAÇÃO & SESSÃO
// ═══════════════════════════════════════════════════════════════

export function identifyUser(userId, state = {}) {
  if (!window.posthog || identified) return
  window.posthog.identify(userId, {
    email: state.email,
    name: state.name || 'Anônimo',
    faixa_renda: state.income || 0,
    dificuldade: state.dificuldade || '',
    onboarding_done: !!state.onboardingDone,
    signup_date: state.createdAt || new Date().toISOString(),
  })
  identified = true
}

// Atualiza propriedades do usuário (chamar quando dados mudam)
export function updateUserProps(state) {
  if (!window.posthog) return
  window.posthog.setPersonProperties({
    total_xp: state.xp || 0,
    level: (state.level || 0) + 1,
    streak: state.streak || 0,
    league: state.league || 'Bronze',
    coins: state.coins || 0,
    lessons_completed: (state.completedLessons || []).length,
    total_expenses: (state.expenses || []).length,
    total_debts: (state.debts || []).length,
    total_receitas: (state.receitas || []).length,
    has_patrimonio: (state.patrimonio?.reserva || 0) > 0,
    equipped_skin: state.equippedSkin || 'quita-real',
    equipped_bg: state.equippedBackground || 'padrao',
    profile_completion: state.profileCompletion || 0,
  })
}

export function trackSessionStart(state = {}) {
  track('session_started', {
    streak: state.streak || 0,
    total_xp: state.xp || 0,
    level: (state.level || 0) + 1,
    lessons_completed: (state.completedLessons || []).length,
    days_since_signup: state.createdAt ? Math.floor((Date.now() - new Date(state.createdAt).getTime()) / 86400000) : 0,
  })
}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING (funil completo)
// ═══════════════════════════════════════════════════════════════

export function trackOnboardingStep(step, data = {}) {
  const stepNames = ['nome', 'renda', 'dificuldade', 'pronto', 'tutorial_inicio', 'tutorial_trilha', 'tutorial_quita_ia', 'tutorial_financeiro', 'tutorial_diagnostico', 'tutorial_loja']
  track('onboarding_step', {
    step_number: step,
    step_name: stepNames[step] || `step_${step}`,
    ...data,
  })
}

export function trackOnboardingComplete(data) {
  track('onboarding_completed', {
    dificuldade: data.dificuldade,
    faixa_renda: data.income,
    name_length: (data.name || '').length,
  })
}

export function trackOnboardingSkipTutorial(atStep) {
  track('onboarding_tutorial_skipped', { skipped_at_step: atStep })
}

// ═══════════════════════════════════════════════════════════════
// LIÇÕES & TRILHA
// ═══════════════════════════════════════════════════════════════

export function trackLessonStart(lesson) {
  track('lesson_started', {
    lesson_id: lesson.id,
    lesson_title: lesson.title || lesson.subtitle || '',
    module_id: lesson.moduleId || '',
    etapa: lesson.etapa || '',
  })
}

export function trackLessonComplete(lesson, xpEarned, perfect, lives) {
  track('lesson_completed', {
    lesson_id: lesson.id,
    lesson_title: lesson.title || lesson.subtitle || '',
    xp_earned: xpEarned,
    perfect,
    lives_remaining: lives,
  })
}

export function trackQuizAnswer(lessonId, questionIdx, correct, selectedAnswer) {
  track('quiz_answer', {
    lesson_id: lessonId,
    question_index: questionIdx,
    correct,
    selected_answer: selectedAnswer,
  })
}

export function trackModuleComplete(moduleId, etapa, totalLessons) {
  track('module_completed', { module_id: moduleId, etapa, total_lessons: totalLessons })
}

export function trackLessonAbandoned(lessonId, atQuestion) {
  track('lesson_abandoned', { lesson_id: lessonId, abandoned_at_question: atQuestion })
}

// ═══════════════════════════════════════════════════════════════
// STREAK & GAMIFICAÇÃO
// ═══════════════════════════════════════════════════════════════

export function trackStreakMaintained(streak) {
  track('streak_maintained', { streak, milestone: streak % 7 === 0 ? `${streak / 7}w` : null })
}

export function trackStreakLost(lastStreak) {
  track('streak_lost', { last_streak: lastStreak })
}

export function trackLevelUp(newLevel, levelName) {
  track('level_up', { new_level: newLevel, level_name: levelName })
}

export function trackLeagueChange(oldLeague, newLeague) {
  track('league_changed', { from: oldLeague, to: newLeague })
}

export function trackXpGained(amount, source) {
  track('xp_gained', { amount, source })
}

export function trackCoinsEarned(amount, source) {
  track('coins_earned', { amount, source })
}

// ═══════════════════════════════════════════════════════════════
// FINANCEIRO
// ═══════════════════════════════════════════════════════════════

export function trackExpenseAdded(method, category, amount, totalCount) {
  track('expense_added', { method, category, amount_range: amountRange(amount), total_count: totalCount })
}

export function trackExpenseBulkImport(method, count) {
  track('expense_bulk_import', { method, items_imported: count })
}

export function trackReceitaAdded(amount, totalCount) {
  track('receita_added', { amount_range: amountRange(amount), total_count: totalCount })
}

export function trackDebtAdded(type, amount, totalDebts) {
  track('debt_added', { debt_type: type, amount_range: amountRange(amount), total_debts: totalDebts })
}

export function trackGoalCreated(name, target) {
  track('goal_created', { goal_name: name, target_range: amountRange(target) })
}

export function trackPatrimonioUpdated(reserva, totalInvest, classes) {
  track('patrimonio_updated', {
    reserva_range: amountRange(reserva),
    total_invest_range: amountRange(totalInvest),
    classes_count: classes,
    has_reserva: reserva > 0,
    has_investments: totalInvest > 0,
  })
}

// ═══════════════════════════════════════════════════════════════
// QUITA IA (Coach)
// ═══════════════════════════════════════════════════════════════

export function trackCoachTabViewed(tab) {
  track('coach_tab_viewed', { tab }) // diagnostico, plano, chat
}

export function trackDiagnosticoViewed(score, faixa) {
  track('diagnostico_viewed', { score, faixa })
}

export function trackCoachChatMessage(isFirstMessage, questionType) {
  track('coach_chat_message', { is_first: isFirstMessage, type: questionType || 'custom' })
}

export function trackCoachChatSuggestion(question) {
  track('coach_chat_suggestion_used', { question })
}

export function trackCoachPlanGenerated(isRefresh) {
  track('coach_plan_generated', { is_refresh: isRefresh })
}

export function trackInsightViewed(type, title) {
  track('insight_viewed', { insight_type: type, title })
}

// ═══════════════════════════════════════════════════════════════
// LOJA & CUSTOMIZAÇÃO
// ═══════════════════════════════════════════════════════════════

export function trackShopOpened(source) {
  track('shop_opened', { source }) // 'coins_badge', 'profile', '3d_button'
}

export function trackShopPurchase(type, itemId, price, coinsAfter) {
  track('shop_purchase', { type, item_id: itemId, price, coins_remaining: coinsAfter })
}

export function trackShopEquip(type, itemId) {
  track('shop_equip', { type, item_id: itemId })
}

export function trackShopTabChanged(tab) {
  track('shop_tab_changed', { tab })
}

// ═══════════════════════════════════════════════════════════════
// ATIVIDADES SEMANAIS
// ═══════════════════════════════════════════════════════════════

export function trackCheckContasStarted() {
  track('check_contas_started')
}

export function trackCheckContasComplete(billsChecked) {
  track('check_contas_completed', { bills_checked: billsChecked })
}

export function trackRevisaoSemanalStarted() {
  track('revisao_semanal_started')
}

export function trackRevisaoSemanalComplete(correctCount, totalCount) {
  track('revisao_semanal_completed', { correct: correctCount, total: totalCount, accuracy: Math.round((correctCount / totalCount) * 100) })
}

// ═══════════════════════════════════════════════════════════════
// NAVEGAÇÃO & UX
// ═══════════════════════════════════════════════════════════════

export function trackScreenView(screen) {
  track('screen_viewed', { screen })
}

export function trackNavBarTap(tab) {
  track('navbar_tap', { tab })
}

export function trackFinanceiroTabChanged(tab) {
  track('financeiro_tab_changed', { tab })
}

export function trackTrilhaEtapaSelected(etapa) {
  track('trilha_etapa_selected', { etapa })
}

export function track3DExpanded() {
  track('3d_expanded')
}

export function track3DInteraction() {
  track('3d_rotated')
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

export function trackSignup(method) {
  track('user_signup', { method }) // email, google, etc
}

export function trackLogin(method) {
  track('user_login', { method })
}

export function trackLogout() {
  track('user_logout', {
    session_duration_min: Math.round((Date.now() - sessionStartTime) / 60000),
  })
}

// ═══════════════════════════════════════════════════════════════
// ERROS & PERFORMANCE
// ═══════════════════════════════════════════════════════════════

export function trackError(context, error) {
  track('app_error', { context, error_message: String(error).slice(0, 200) })
}

export function trackApiCall(endpoint, success, durationMs) {
  track('api_call', { endpoint, success, duration_ms: durationMs })
}

export function track3DLoadTime(modelPath, durationMs) {
  track('3d_model_loaded', { model: modelPath, duration_ms: durationMs })
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function amountRange(v) {
  if (!v || v <= 0) return 'zero'
  if (v < 100) return '1-99'
  if (v < 500) return '100-499'
  if (v < 1000) return '500-999'
  if (v < 5000) return '1k-4.9k'
  if (v < 10000) return '5k-9.9k'
  if (v < 50000) return '10k-49k'
  if (v < 100000) return '50k-99k'
  return '100k+'
}
