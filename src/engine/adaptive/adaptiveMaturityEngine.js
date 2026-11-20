/**
 * adaptiveMaturityEngine.js
 *
 * Controlador de Maturidade Progressiva (Estágios N0 → N5).
 * Observa os dados reais acumulados no concurso ativo e ativa gradualmente
 * os lotes já existentes do motor estatístico/Coach (stateSpace, dynamicVolatility,
 * posteriorMC, decisionUtility, observability, causalUplift, autoTuner) conforme
 * há massa crítica suficiente — evitando overfitting no Cold Start e respeitando
 * overrides manuais do Control Center.
 */
import { getDateKey, toDateMs } from '../../utils/dateHelper.js';
import { readFlags, writeFlags } from '../../utils/coachFeatureStore.js';
import { safeGetJSON } from '../../utils/coachStorage.js';

const MANUAL_OVERRIDES_PREFIX = 'coach_manual_flag_overrides_v1';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

export const ADAPTIVE_STAGES = [
  {
    stage: 0,
    code: 'N0',
    name: 'Cold Start',
    shortLabel: 'Base Inicial',
    description: 'Priors conservadores, pesos do edital e ritmo linear do Burnup.',
    flags: [],
  },
  {
    stage: 1,
    code: 'N1',
    name: 'Calibração Inicial',
    shortLabel: 'Kalman + FSRS + ACWR',
    description: 'Ativa Filtro de Kalman, tópicos bayesianos, FSRS avançado e fadiga ACWR adaptativa.',
    flags: ['useStateSpace', 'useBayesianTopics', 'useAdvancedFsrs', 'useFsrsForSrsBoost'],
  },
  {
    stage: 2,
    code: 'N2',
    name: 'Dinâmica & Risco',
    shortLabel: 'Volatilidade + MC + Risco',
    description: 'Ativa volatilidade dinâmica, Posterior Monte Carlo, Decision Utility e decomposição de eliminação.',
    flags: ['useDynamicVolatility', 'usePosteriorMonteCarlo', 'useDecisionUtility', 'useDecisionUtilityForTopics'],
  },
  {
    stage: 3,
    code: 'N3',
    name: 'Regimes & Memória',
    shortLabel: 'Drift + Regimes + Retenção',
    description: 'Ativa telemetria de avaliação, Observability/Drift Guard, meia-vida empírica e grade ótima.',
    flags: ['useEvaluationTelemetry', 'useObservability', 'useDriftGuard', 'useModelHealthTelemetry', 'useKnowledgeGraph'],
  },
  {
    stage: 4,
    code: 'N4',
    name: 'Personalização Causal',
    shortLabel: 'Causal + IRT + Markowitz',
    description: 'Ativa Uplift Causal por ação/modalidade, política personalizada, Bandit Planner e TRI/IRT.',
    flags: ['useCausalUplift', 'usePersonalizedPolicy', 'useBanditPlanner', 'useDecisionUtilityForBestTask'],
  },
  {
    stage: 5,
    code: 'N5',
    name: 'Auto-Otimização',
    shortLabel: 'AutoTuner + AutoRollback',
    description: 'Ativa AutoTuner com backtest contínuo e rollback automático caso o Drift Guard detecte degradação.',
    flags: ['useMetaOptimizer', 'useAutoTuner', 'useAutoRollback', 'useCoachOrchestrator'],
  },
];

/**
 * Fator de shrinkage bayesiano suave em [0, 1].
 * Com n = 0 -> 0 (100% prior); com n = k0 -> 0.5; com n >> k0 -> ~1 (empírico puro).
 */
export function shrinkageAlpha(sampleSize, priorStrength = 4) {
  const n = Math.max(0, Number(sampleSize) || 0);
  const k0 = Math.max(1e-6, Number(priorStrength) || 4);
  return n / (n + k0);
}

export function blendPriorEmpirical(priorVal, empiricalVal, sampleSize, priorStrength = 4) {
  const p = Number(priorVal);
  const e = Number(empiricalVal);
  if (!Number.isFinite(e)) return Number.isFinite(p) ? p : 0;
  if (!Number.isFinite(p)) return e;
  const alpha = shrinkageAlpha(sampleSize, priorStrength);
  return p * (1 - alpha) + e * alpha;
}

/**
 * Avalia a maturidade real de dados de um concurso e devolve estágio (0..5),
 * flags recomendadas, progresso para o próximo nível e telemetria de suporte.
 */
export function evaluateContestMaturity(contest = {}) {
  const safeContest = contest && typeof contest === 'object' ? contest : {};
  const categories = safeArr(safeContest.categories);
  const studyLogs = safeArr(safeContest.studyLogs).filter((l) => l && l.type !== 'flashcard');
  const simuladoRows = safeArr(safeContest.simuladoRows).filter((r) => r && r.valid !== false && r.validated !== false);
  const calibrationEvents = safeArr(safeContest.calibrationEvents);
  const auditLogs = safeArr(safeContest.calibrationAuditLog);

  let historySimCount = 0;
  let categoriesWithSims = 0;
  const activeWeeks = new Set();

  categories.forEach((cat) => {
    const hist = safeArr(cat?.simuladoStats?.history).filter((h) => h && h.valid !== false && h.validated !== false);
    if (hist.length > 0) categoriesWithSims += 1;
    historySimCount += hist.length;
    hist.forEach((h) => {
      const ms = toDateMs(h.date || h.createdAt);
      if (Number.isFinite(ms)) activeWeeks.add(Math.floor(ms / (7 * 86_400_000)));
    });
  });

  let totalMinutes = 0;
  let studyModeCount = 0;
  let energyLogCount = 0;
  studyLogs.forEach((log) => {
    const m = Math.max(0, Number(log.minutes ?? log.minutos ?? log.duration) || 0);
    totalMinutes += m;
    if (log.studyMode) studyModeCount += 1;
    if (Number.isFinite(Number(log.energyLevel))) energyLogCount += 1;
    const ms = toDateMs(log.date || log.createdAt);
    if (Number.isFinite(ms)) activeWeeks.add(Math.floor(ms / (7 * 86_400_000)));
  });

  let confidenceCount = 0;
  let errorTypeCount = 0;
  let timedQuestionCount = 0;
  simuladoRows.forEach((row) => {
    const tel = safeArr(row.questionTelemetry);
    tel.forEach((q) => {
      if (q.confidence) confidenceCount += 1;
      if (q.errorType) errorTypeCount += 1;
      if (Number(q.timeSec) > 0) timedQuestionCount += 1;
    });
  });

  const simuladoCount = Math.max(historySimCount, simuladoRows.length);
  const totalStudyHours = Number((totalMinutes / 60).toFixed(1));
  const studySessionsCount = studyLogs.length;
  const weeksActive = activeWeeks.size;
  const resolvedCalibPairs = calibrationEvents.filter((e) => e && e.resolved).length + auditLogs.length;

  let stage = 0;
  if (simuladoCount >= 3 || totalStudyHours >= 5) stage = 1;
  if (simuladoCount >= 6 && categoriesWithSims >= 2) stage = 2;
  if (simuladoCount >= 10 && (weeksActive >= 3 || studySessionsCount >= 10)) stage = 3;
  if (simuladoCount >= 15 && studySessionsCount >= 15) stage = 4;
  if (simuladoCount >= 25 && resolvedCalibPairs >= 8) stage = 5;

  const unlockedFlags = {};
  for (let i = 1; i <= stage; i++) {
    ADAPTIVE_STAGES[i].flags.forEach((flagKey) => {
      unlockedFlags[flagKey] = true;
    });
  }

  const stageMeta = ADAPTIVE_STAGES[stage];
  const nextStageMeta = stage < 5 ? ADAPTIVE_STAGES[stage + 1] : null;

  let progressToNextPct = 100;
  let nextHint = 'Todos os motores adaptativos desbloqueados!';
  if (stage === 0) {
    progressToNextPct = Math.min(99, Math.round(Math.max(simuladoCount / 3, totalStudyHours / 5) * 100));
    nextHint = `Faltam ${Math.max(0, 3 - simuladoCount)} simulado(s) ou ${Math.max(0, 5 - totalStudyHours).toFixed(1)}h para ativar Kalman + FSRS + ACWR.`;
  } else if (stage === 1) {
    progressToNextPct = Math.min(99, Math.round(((Math.min(simuladoCount, 6) / 6) * 0.7 + (Math.min(categoriesWithSims, 2) / 2) * 0.3) * 100));
    nextHint = `Faltam ${Math.max(0, 6 - simuladoCount)} simulado(s) em ≥2 matérias para ativar Volatilidade Dinâmica e Posterior MC.`;
  } else if (stage === 2) {
    progressToNextPct = Math.min(99, Math.round((Math.min(simuladoCount, 10) / 10) * 100));
    nextHint = `Faltam ${Math.max(0, 10 - simuladoCount)} simulado(s) para ativar Observability, Regimes e Drift Guard.`;
  } else if (stage === 3) {
    progressToNextPct = Math.min(99, Math.round(((Math.min(simuladoCount, 15) / 15) * 0.6 + (Math.min(studySessionsCount, 15) / 15) * 0.4) * 100));
    nextHint = `Faltam ${Math.max(0, 15 - simuladoCount)} simulado(s) e ${Math.max(0, 15 - studySessionsCount)} sessões para ativar Causal Uplift e Política Personalizada.`;
  } else if (stage === 4) {
    progressToNextPct = Math.min(99, Math.round(((Math.min(simuladoCount, 25) / 25) * 0.6 + (Math.min(resolvedCalibPairs, 8) / 8) * 0.4) * 100));
    nextHint = `Faltam ${Math.max(0, 25 - simuladoCount)} simulado(s) e ${Math.max(0, 8 - resolvedCalibPairs)} auditorias para ativar AutoTuner + Rollback Automático.`;
  }

  return {
    stage,
    code: stageMeta.code,
    name: stageMeta.name,
    shortLabel: stageMeta.shortLabel,
    description: stageMeta.description,
    nextStage: nextStageMeta ? { code: nextStageMeta.code, name: nextStageMeta.name } : null,
    progressToNextPct,
    nextHint,
    unlockedFlags,
    unlockedFlagCount: Object.keys(unlockedFlags).length,
    metrics: {
      simuladoCount,
      categoriesWithSims,
      totalStudyHours,
      studySessionsCount,
      weeksActive,
      resolvedCalibPairs,
      studyModeCount,
      energyLogCount,
      confidenceCount,
      errorTypeCount,
      timedQuestionCount,
    },
    evaluatedAt: getDateKey(new Date()),
  };
}

/**
 * Sincroniza automaticamente as feature flags desbloqueadas no coachFeatureStore,
 * hidratando flags/overrides persistidos no documento do concurso (Firestore) e
 * preservando qualquer override manual configurado pelo usuário no Control Center.
 */
export function syncAdaptiveFeatureFlags(contest, contestId = 'default', options = {}) {
  const maturity = evaluateContestMaturity(contest);
  const scope = String(contestId || 'default');
  const respectOverrides = options.respectOverrides !== false;

  const manualKey = scope === 'default' ? MANUAL_OVERRIDES_PREFIX : `${MANUAL_OVERRIDES_PREFIX}:${scope}`;
  const localOverrides = respectOverrides ? (safeGetJSON(manualKey, {}) || {}) : {};
  const cloudOverrides = (respectOverrides && contest?.coachManualFlagOverrides && typeof contest.coachManualFlagOverrides === 'object')
    ? contest.coachManualFlagOverrides
    : {};
  const manualOverrides = { ...cloudOverrides, ...localOverrides };

  // Hidrata flags salvas no documento do concurso (Firestore) caso o dispositivo local esteja limpo
  const cloudFlags = (contest?.coachFeatureFlags && typeof contest.coachFeatureFlags === 'object')
    ? contest.coachFeatureFlags
    : {};
  const current = { ...cloudFlags, ...readFlags(scope) };

  const patch = {};
  let changed = false;

  // Aplicar cloudFlags que ainda não estão no registry local
  Object.entries(cloudFlags).forEach(([flagKey, val]) => {
    if (typeof val !== 'boolean') return;
    if (readFlags(scope)[flagKey] !== val) {
      patch[flagKey] = val;
      changed = true;
    }
  });

  // Aplicar overrides manuais (nuvem ou local)
  Object.entries(manualOverrides).forEach(([flagKey, val]) => {
    if (typeof val !== 'boolean') return;
    if (readFlags(scope)[flagKey] !== val) {
      patch[flagKey] = val;
      changed = true;
    }
  });

  Object.entries(maturity.unlockedFlags).forEach(([flagKey, val]) => {
    if (respectOverrides && Object.prototype.hasOwnProperty.call(manualOverrides, flagKey)) {
      return;
    }
    if (current[flagKey] !== val || readFlags(scope)[flagKey] !== val) {
      patch[flagKey] = val;
      changed = true;
    }
  });

  if (changed) {
    writeFlags(patch, scope);
  }

  const finalFlags = readFlags(scope);
  return {
    maturity,
    appliedPatch: patch,
    changed,
    finalFlags,
    manualOverrides,
  };
}

export default {
  ADAPTIVE_STAGES,
  shrinkageAlpha,
  blendPriorEmpirical,
  evaluateContestMaturity,
  syncAdaptiveFeatureFlags,
};
