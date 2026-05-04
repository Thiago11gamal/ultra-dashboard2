import { safeClone } from './safeClone.js';
import { INITIAL_DATA } from '../data/initialData';
import { generateId } from '../utils/idGenerator';
import { normalize, aliases } from '../utils/normalization';
import { getDateKey } from '../utils/dateHelper';
import { computeCategoryStats } from '../engine';

export const DEFAULT_TARGET_SCORE = 75; // Unificando como 75 (meio termo entre 70 e 80)

/**
 * Validação Ultra-Resiliente (Sem Zod)
 * Garante que o app sempre tenha uma estrutura válida, mesmo com dados corrompidos.
 */

/**
 * REPAIR ENGINE: Rebuilds category history from raw simulation logs
 * if discrepancies are detected. This is a SILENT repair that happens
 * during each state update from Firebase or LocalStorage.
 */
const repairContestHistory = (data) => {
  if (!data.simuladoRows || data.simuladoRows.length === 0 || !data.categories) return data;

  const rows = data.simuladoRows;
  let hasRepaired = false;

  // DIAGNOSTIC CORE: Log summary of what we are dealing with
  const rawSubjects = [...new Set(rows.map(r => normalize(r.subject)).filter(Boolean))];
  if (import.meta.env.DEV) {
    console.log("%c[Schema-Diag] Matérias brutas na nuvem:", "color: #3b82f6; font-weight: bold;", rawSubjects);
    console.log("%c[Schema-Diag] Categorias no Dashboard:", "color: #a855f7; font-weight: bold;", data.categories.map(c => normalize(c.name)));
  }

  data.categories.forEach(cat => {
    const catNorm = normalize(cat.name);
    const catAliases = aliases[catNorm] || [];

    // AGGRESSIVE MATCHING: Use includes() for partial matches (e.g. 'dir adm' matches 'direitoadministrativo')
    const myRows = rows.filter(r => {
      // 1. Defesa Primária: Match absoluto pelo ID único
      if (r.categoryId && r.categoryId === cat.id) return true;
      
      // 2. Defesa Secundária (Fallback Legado): Tenta string match
      const subNorm = normalize(r.subject);
      if (!subNorm) return false;
      return subNorm === catNorm ||
        catAliases.some(a => normalize(a) === subNorm);
    });

    if (myRows.length === 0) {
      console.warn(`[Schema-Diag] Nenhuma correspondência para: ${cat.name}`);
      return;
    }

    const currentHistory = cat.simuladoStats?.history || [];
    const maxScore = cat.maxScore ?? 100;

    // LETHAL OVERRIDE: If raw logs have significantly more data than aggregated history, rebuild it.
    // Even if history is not 0, we rebuild if discrepancy is high (>50% difference)
    const uniqueDaysInLogs = new Set(myRows.map(r => getDateKey(r.date || r.createdAt || r.date?._seconds || r.createdAt?._seconds)).filter(Boolean)).size;
    const currentUniqueDays = new Set(currentHistory.map(h => getDateKey(h.date))).size;

    // Verificação da flag isPercentage desativada como gatilho de perda (gerava falsos positivos)
    const hasCorruptedHistory = false;
    
    // BUG-FIX LETHAL 2: Detecta se o histórico atual foi esmagado em 1 único dia, enquanto a base de dados
    // original possui vários dias (causado pelo bug antigo de priorizar o createdAt do DB em vez do date do usuário).
    const dateCompressionBug = uniqueDaysInLogs > 1 && currentUniqueDays <= 1 && currentHistory.length > 0;
    const repairThreshold = Math.ceil(currentHistory.length * 1.2);

    if (hasCorruptedHistory || dateCompressionBug || currentHistory.length === 0 || uniqueDaysInLogs > repairThreshold) {
      console.log(`%c[Schema-Diag] REPARANDO ${cat.name}: ${uniqueDaysInLogs} dias vs ${currentHistory.length} no histórico.`, "color: #f59e0b;");
      hasRepaired = true;

      const dailyStats = {};
      myRows.forEach(r => {
        const dk = getDateKey(r.date || r.createdAt);
        if (!dk) return;
        if (!dailyStats[dk]) dailyStats[dk] = { correct: 0, total: 0 };
        
        const rawTotal = parseInt(r.total, 10) || 0;
        const rawCorrect = parseInt(r.correct, 10) || 0;
        
        // BUG-H2 FIX: Handle legacy isPercentage format where 'correct' is the percentual score
        const corrNorm = (r.isPercentage && r.score != null && rawTotal > 0)
          ? Math.round((Math.min(maxScore, Math.max(0, Number(r.score))) / maxScore) * rawTotal)
          : rawCorrect;
          
        dailyStats[dk].correct += corrNorm;
        dailyStats[dk].total += rawTotal;
      });

      const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        correct: stats.correct,
        total: stats.total,
        score: stats.total > 0 ? (stats.correct / stats.total) * maxScore : 0
      })).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0); // FIX: String compare safe for YYYY-MM-DD

      const statsResult = computeCategoryStats(rebuiltHistory, cat.weight || 10, 60, maxScore);

      cat.simuladoStats = {
        history: rebuiltHistory,
        average: Number(statsResult.mean.toFixed(2)),
        trend: statsResult.trend || 'stable',
        lastAttempt: rebuiltHistory.length > 0 ? rebuiltHistory[rebuiltHistory.length - 1].score : 0,
        level: statsResult.level || (statsResult.mean > 0.7 * maxScore ? 'ALTO' : statsResult.mean > 0.4 * maxScore ? 'MÉDIO' : 'BAIXO')
      };
    } else {
      if (import.meta.env.DEV) {
        console.log(`[Schema-Diag] ${cat.name} está íntegro (${currentHistory.length} pontos).`);
      }
    }
  });

  if (hasRepaired) {
    console.log(`%c[Schema-Repair] Cura letal concluída em ${rows.length} registros.`, "color: #10b981; font-weight: bold; font-size: 1.1em;");
    data.lastUpdated = new Date().toISOString();
  }

  return data;
};


const sanitizeContest = (data) => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };

  const source = (data.simuladoRows && data.simuladoRows.length > 0)
    ? repairContestHistory(safeClone(data))
    : data;

  // FORTRESS-01: Defensive initialization for all top-level keys
  return {
    user: {
      ...(source.user && typeof source.user === 'object' ? source.user : {}),
      name: source.user?.name || "Estudante",
      avatar: source.user?.avatar || "👤",
      startDate: source.user?.startDate || new Date().toISOString().split('T')[0],
      goalDate: source.user?.goalDate || null,
      targetScore: (source.user?.targetScore != null) ? Number(source.user.targetScore) : DEFAULT_TARGET_SCORE,
      xp: Number(source.user?.xp) || 0,
      level: Number(source.user?.level) || 1,
      achievements: (Array.isArray(source.user?.achievements) ? source.user.achievements : [])
        .map(a => typeof a === 'string' ? a : a?.id)
        .filter(Boolean),
      studiedEarly: Boolean(source.user?.studiedEarly),
      studiedLate: Boolean(source.user?.studiedLate),
      targetProbability: (source.user?.targetProbability != null && Number.isFinite(Number(source.user.targetProbability)))
        ? Number(source.user.targetProbability)
        : 70
    },
    coachPlan: Array.isArray(source.coachPlan) ? source.coachPlan : [],
    calibrationMetrics: (source.calibrationMetrics && typeof source.calibrationMetrics === 'object') ? source.calibrationMetrics : {},
    coachScore: (source.coachScore && typeof source.coachScore === 'object') ? source.coachScore : null,
    coachPlanner: (source.coachPlanner && typeof source.coachPlanner === 'object')
      ? source.coachPlanner
      : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    categories: (Array.isArray(source.categories) ? source.categories : []).map(cat => ({
      id: cat.id || generateId('cat'),
      name: cat.name || "Sem Nome",
      color: cat.color || "#3b82f6",
      icon: cat.icon || "📚",
      tasks: (Array.isArray(cat.tasks) ? cat.tasks : []).map(t => ({
        id: t.id || generateId('task'),
        text: t.text || t.title || "Nova Tarefa",
        title: t.title || t.text || "Nova Tarefa",
        completed: Boolean(t.completed),
        completedAt: t.completedAt || null,
        lastStudiedAt: t.lastStudiedAt || null,
        priority: t.priority || "medium",
        // BUG-01 & 02 FIX: Preserve awardedXP and studying status during sync/reload
        ...(t.awardedXP != null ? { awardedXP: Number(t.awardedXP) } : {}),
        ...(t.status ? { status: t.status } : {})
      })).filter(t => t.id && (t.text || t.title)), // Skip Corrupted Tasks
      weight: (cat.weight !== undefined && cat.weight !== null) ? Number(cat.weight) : 10,
      maxScore: Number(cat.maxScore) || 100,
      level: Number(cat.level) || 0,
      totalMinutes: Number(cat.totalMinutes) || 0,
      lastStudiedAt: cat.lastStudiedAt || null,
      simuladoStats: {
        // Deep-strip nulls/poison from history. Support both Array and legacy Object formats.
        history: (Array.isArray(cat.simuladoStats?.history) 
          ? cat.simuladoStats.history 
          : Object.values(cat.simuladoStats?.history || {}))
          .filter(h => h && typeof h === 'object' && h.date && (h.total > 0 || h.score != null)),
        average: Number(cat.simuladoStats?.average) || 0,
        lastAttempt: Number(cat.simuladoStats?.lastAttempt) || 0,
        trend: cat.simuladoStats?.trend || "stable",
        level: cat.simuladoStats?.level || "BAIXO"
      }
    })),
    simuladoRows: (Array.isArray(source.simuladoRows) ? source.simuladoRows : []).filter(r => r && r.id),
    simulados: (Array.isArray(source.simulados) ? source.simulados : []).filter(s => s && s.id),
    studyLogs: (Array.isArray(source.studyLogs) ? source.studyLogs : []).filter(l => l && l.id),
    studySessions: (Array.isArray(source.studySessions) ? source.studySessions : []).filter(s => s && s.id),
    notes: typeof source.notes === 'string' ? source.notes : "",
    settings: {
      darkMode: true,
      soundEnabled: source.settings?.soundEnabled ?? true,
      pomodoroWork: Number(source.settings?.pomodoroWork) || 25,
      pomodoroBreak: Number(source.settings?.pomodoroBreak) || 5,
      pomodoroLongBreak: Number(source.settings?.pomodoroLongBreak) || 15,
      longBreakAfter: Number(source.settings?.longBreakAfter) || 4,
      sessions: Number(source.settings?.sessions) || 0,
      completedCycles: Number(source.settings?.completedCycles) || 0,
    },
    mcWeights: (source.mcWeights && typeof source.mcWeights === 'object') ? source.mcWeights : {},
    // BUG-10 REVERSION: monteCarloHistory MUST be an Array for charts and slices to work.
    // Migration: If it's an object (legacy), convert it to an array of {date, probability}.
    monteCarloHistory: (() => {
      const raw = source.monteCarloHistory;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object') {
        return Object.entries(raw).map(([date, data]) => ({
          date,
          probability: typeof data === 'object' ? data.probability : data,
          ...(typeof data === 'object' ? data : {})
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
      return [];
    })(),
    contestName: source.contestName || source.user?.name || "Novo Concurso",
    lastUpdated: (source.lastUpdated && !isNaN(new Date(source.lastUpdated).getTime())) ? source.lastUpdated : new Date().toISOString(),
  };
};

export const extractCore = (obj, depth = 0) => {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;
  if (obj.contests || (obj.categories && Array.isArray(obj.categories))) return obj;
  if (obj.appState) return extractCore(obj.appState, depth + 1);
  if (obj.state) return extractCore(obj.state, depth + 1);
  return null;
};

export const validateAppState = (data) => {
  try {
    if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };

    let coreData = extractCore(data);
    let d = coreData || data;

    // Migração de formato Legado (único concurso) para Multi-Concurso
    if (d.categories && Array.isArray(d.categories) && !d.contests) {
      const contestData = { ...d };
      d = {
        contests: { 'default': contestData },
        activeId: 'default',
        lastUpdated: d.lastUpdated || new Date().toISOString()
      };
    }

    const validatedContests = {};
    const rawContests = d.contests || { 'default': INITIAL_DATA };

    Object.entries(rawContests).forEach(([id, contestData]) => {
      validatedContests[id] = sanitizeContest(contestData);
    });

    let activeId = d.activeId || 'default';

    // C4 FIX: Removed silent auto-redirect to 'Direito' to prevent unexpected focus loss.

    if (!validatedContests[activeId]) activeId = Object.keys(validatedContests)[0] || 'default';

    const finalState = {
      contests: validatedContests,
      activeId: activeId,
      dashboardFilter: d.dashboardFilter || 'all',
      pomodoro: {
        ...(d.pomodoro && typeof d.pomodoro === 'object' ? d.pomodoro : {}),
        activeSubject: d.pomodoro?.activeSubject || null,
        targetCycles: Math.max(1, Number(d.pomodoro?.targetCycles) || 1),
        // 🛡️ [FIX-SCHEMA] Valida campos críticos do pomodoro para blindar contra
        // estado corrompido/legado que poderia crashar o timer silenciosamente.
        mode: ['work', 'break', 'long_break'].includes(d.pomodoro?.mode) ? d.pomodoro.mode : 'work',
        sessions: Math.max(1, Number(d.pomodoro?.sessions) || 1),
        completedCycles: Math.max(0, Number(d.pomodoro?.completedCycles) || 0),
        accumulatedMinutes: Math.max(0, Number(d.pomodoro?.accumulatedMinutes) || 0),
      },

      history: Array.isArray(d.history) ? d.history : [],
      trash: Array.isArray(d.trash) ? d.trash.filter(item => {
        if (!item) return false;
        // BUG LOGIC-02 FIX: Se não tiver deletedAt, assume agora para expirar em 30 dias
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        return (new Date() - deletedAt) / (1000 * 60 * 60 * 24) <= 30;
      }) : [],
      hasSeenTour: Boolean(d.hasSeenTour),
      lastHistoryTime: Number(d.lastHistoryTime) || 0,
      version: Number(d.version) || 0,
      mcEqualWeights: d.mcEqualWeights ?? true,
      lastUpdated: d.lastUpdated || new Date().toISOString()
    };


    return finalState;
  } catch (err) {
    console.error("[Validate] Erro catastrófico, retornando inicial:", err);
    return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };
  }
};
