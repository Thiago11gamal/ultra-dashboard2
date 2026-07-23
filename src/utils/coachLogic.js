// ==================== CONSTANTES ====================
import { calculateMSSD, calculateSlope, getSortedHistory } from '../engine/projection.js';
import { useAppStore } from '../store/useAppStore.js';
import { computeForgettingRisk } from '../engine/diagnostics.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
import { safeDateParse as _safeDateParse, normalizeDate, getDateKey } from './dateHelper.js';
import { normalize } from './normalization.js';
import { computeRollingCalibrationParams } from './calibration.js';
import { 
    deriveAdaptiveRiskThresholds, 
    computeContinuousMcBoost, 
    deriveBacktestWeights,
    deriveCoachAdaptiveParams,
    runCoachMonteCarlo,
    clearMcCache,
    simuladosToHistory
} from './coachAdaptive.js';
import { computeAdaptiveCoachWeight } from './adaptiveMath.js';
import { kahanSum } from '../engine/math/kahan.js';
import { computeAgilityMetrics } from '../engine/stats.js';
export { deriveAdaptiveRiskThresholds, computeContinuousMcBoost, deriveBacktestWeights, clearMcCache, runCoachMonteCarlo };

// LRU Cache for urgency calculations
export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();
export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();

const sanitizeMinutes = (mins) => Math.min(720, Math.max(0, Number(mins) || 0));


export const DEFAULT_CONFIG = {
    SCORE_MAX: 50,
    RECENCY_MAX: 30,
    INSTABILITY_MAX: 30,
    PRIORITY_BOOST: 30,
    EFFICIENCY_MAX: 15,
    SRS_BOOST: 20,
    BASE_HOURS_THRESHOLD: 5,

    // Monte Carlo
    MC_SIMULATIONS: 800,          // ← BUG-C2 FIX: era 5000 (conflitava com o comentário "MC leve")
    MC_MIN_DATA_POINTS: 3,
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    INSTABILITY_MSSD_DIVISOR: 10,
    MC_BACKTEST_HORIZON: 3,
    MC_BACKTEST_HORIZON_MAX: 6,
    MC_CALIBRATION_BRIER_BASELINE: 0.18,
    MC_CALIBRATION_MAX_PENALTY: 0.25,
    MC_CALIBRATION_NEUTRAL_PCT: 50,
    MC_CALIBRATION_MAX_APPLIED_PENALTY: 0.5,
    MC_ENABLE_ADAPTIVE_CALIBRATION: true,
    MC_CALIB_WINDOW_DAYS: 60,
    MC_CALIB_MIN_SAMPLES: 4,
    MC_CALIB_MAX_SAMPLES: 20,
    MC_ECE_BINS_MIN: 4,
    MC_ECE_BINS_MID: 6,
    MC_ECE_BINS_MAX: 8,
    MC_LOW_SAMPLE_THRESHOLD: 10,

    // ── A) Constantes do urgency boost nomeadas ──────────────────────────────
    // Antes: mcUrgencyBoost = 12 + 13 * (1 - p/MC_PROB_DANGER)
    //        → 12 = boost base na fronteira de perigo
    //        → 25 = boost máximo quando probabilidade é 0% (12+13)
    //        → -8 = recompensa passiva quando em modo cruzeiro (prob >= 90%)
    MC_BOOST_DANGER_BASE: 12,     // boost quando prob está exactly no limiar (30%)
    MC_BOOST_DANGER_RANGE: 13,    // faixa adicional conforme prob se aproxima de 0%
    MC_BOOST_MODERATE_BASE: 12,   // boost na transição danger→moderate
    MC_BOOST_SAFE_PENALTY: -8,    // redução de urgência quando prob >= 90% (modo cruzeiro)
    MC_MODERATE_MIDPOINT: 55,     // prob (%) que separa zona moderate-alta de moderate-baixa
};

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMax = maxScore > 0 ? maxScore : 100;
    const currentPct = currentScore / safeMax;
    
    // Fator de amortecimento: se o aluno tirou 40%, damping = 0.6. Se tirou 95%, damping = 0.05.
    const damping = Math.max(0, 1 - currentPct);
    
    // Curva de exigência: Inicia agressiva (ex: 4~5% para novatos) e cai para um mínimo de 0.2% para veteranos.
    const baseRequirement = 0.05; 
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002; 
    
    return dynamicPct * maxScore;
}

// ==================== FUNÇÕES AUXILIARES ====================

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getDaysDiff = (newer, older) => {
    const d1 = normalizeDate(newer) || new Date(0);
    const d2 = normalizeDate(older) || new Date(0);
    // Math.round absorve variações de +/- 1 hora causadas pelo DST
    return Math.max(0, Math.round((d1.getTime() - d2.getTime()) / MS_PER_DAY));
};

/**
 * Calcula o multiplicador de urgência baseado nos dias restantes para a prova.
 * Substituição da escada em degraus por uma curva Exponencial Contínua.
 */
// ✅ FIX: getCrunchMultiplier com proteção contra datas inválidas
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
  if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
  if (daysToExam < 0) return 1.0;
  if (daysToExam === 0) return 2.0;
  
  let timeDivisor = 21;
  
  const safeFirstActivity = normalizeDate(firstActivityDate);
  if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
    const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
    const refTime = referenceDate.getTime();
    const firstTime = safeFirstActivity.getTime();
    
    // ✅ FIX: Proteção contra datas futuras e valores NaN.
    if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;
    
    // ✅ FIX: Usar Math.abs para lidar com firstActivityDate no futuro.
    // ✅ FIX: Se a data está no futuro, tratamos como se o aluno tivesse começado hoje (sem viagens no tempo com valores negativos).
    const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
    const totalJourneyDays = Math.max(1, journeyDays) + Math.max(0, daysToExam);
    timeDivisor = Math.max(14, totalJourneyDays * 0.15);
  }
  
  const urgency = 1.0 + Math.exp(-daysToExam / timeDivisor);
  return Number(Math.min(2.0, urgency).toFixed(4));
}

function _getSRSBoost(history, daysSince, maxScore, cfg, mssdVolatility = null, effectiveN = null) {
    // CORREÇÃO: Transmitir a recência real (dias desde a última interação teórica ou prática)
    const forgettingData = computeForgettingRisk(history, maxScore, null, mssdVolatility, effectiveN, daysSince);
    
    const retention = forgettingData.retentionPct;

    if (retention < 30) return { boost: cfg.SRS_BOOST * 2.0, label: "⚠️ Memória Crítica (Risco de Branco)" };
    if (retention < 55) return { boost: cfg.SRS_BOOST * 1.4, label: "🧠 Revisão Necessária (Curva de Esquecimento)" };
    if (retention < 75) return { boost: cfg.SRS_BOOST * 0.8, label: "🔄 Revisão de Reforço" };
    
    return { boost: 0, label: null };
}

/**
 * Calcula a proficiência bayesiana de um tópico, tratando o Prior de forma adaptativa.
 * [AUDIT-FIX-01] Resolve o "Efeito Halo": Tópicos nunca estudados assumem 25% de ignorância,
 * impedindo que a média global do aluno oculte lacunas de base.
 */
export const computeBayesianProficiency = (acertos, total, mediaGlobal = 0.5, globalTotal = 0) => {
    const rawAcertos = Number(acertos) || 0;
    const rawTotal = Number(total) || 0;

    // Fator de suavização (K) adaptativo baseado na experiência global do aluno
    const K = Math.max(3, Math.min(15, Math.log10(Math.max(0, globalTotal) + 1) * 3));
    
    // Quando o aluno começa a estudar, aí sim a média global atua como âncora de segurança
    const smoothedAcertos = rawAcertos + (mediaGlobal * K);
    const smoothedTotal = rawTotal + K;
    
    return smoothedAcertos / smoothedTotal;
};

/**
 * Calcula uma volatilidade robusta para o Coach, combinando o desvio padrão empírico
 * com um piso de incerteza (Bayesian shrinkage) para evitar subestimar o risco em amostras pequenas.
 */
export function computeRobustVolatilityForCoach(history = [], maxScore = 100) {
    const n = history.length;
    const fallbackVol = 0.08 * maxScore; // Piso de incerteza (8%)
    if (n < 2) return fallbackVol;
    
    // CORREÇÃO MÁXIMA: Sanitizar vírgulas usando getSafeScore e remover provas nulas
    // (NaN) em vez de injetar Zeros absolutos que arruínam a variância empírica.
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const validScores = safeHistory
        .map(h => getSafeScore(h, maxScore))
        .filter(s => Number.isFinite(s));
        
    const validN = validScores.length;
    if (validN < 2) return fallbackVol;

    const mean = kahanSum(validScores) / validN;
    const devs = validScores.map(val => Math.pow(val - mean, 2));
    const variance = kahanSum(devs) / (validN - 1);
    const nPenalty = Math.max(1, 4 / validN); // Penaliza amostras muito pequenas
    const empiricalVol = Math.sqrt(Math.max(0, variance));
    
    // Combinação Bayesiana simples: 70% empírico, 30% prior (piso) escalado por N
    return (empiricalVol * 0.7) + (fallbackVol * 0.3 * nPenalty);
}

export const sanitizeNum = (val) => {
    if (val === null || val === undefined || val === '') return NaN;
    
    let str = String(val).trim();
    
    // Se possui vírgula, com certeza é formato PT-BR (ex: "1.234,56" ou "1,5")
    if (str.includes(',')) {
        return Number(str.replace(/\./g, '').replace(',', '.'));
    }
    
    // Se tem pontos agrupando de 3 em 3 e não tem vírgula (ex: "1.000" ou "12.345")
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
        return Number(str.replace(/\./g, ''));
    }
    
    // Caso contrário, confia no Number() nativo (ex: "1000" ou "1.5")
    return Number(str);
};

export const getCoachPriorities = (topicsData) => {
    if (!Array.isArray(topicsData)) return [];
    
    const globalCorrect = topicsData.reduce((acc, t) => {
        const parsedAcertos = sanitizeNum(t.acertos);
        const parsedCorrect = sanitizeNum(t.correct);
        const c = Number.isFinite(parsedAcertos) ? parsedAcertos : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        return acc + c;
    }, 0);
    
    const globalTotal = topicsData.reduce((acc, t) => {
        const parsedTotal = sanitizeNum(t.total);
        const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        return acc + tot;
    }, 0);
    
    const mediaGlobal = globalTotal > 0 ? globalCorrect / globalTotal : 0.5;

    return topicsData.map(topic => {
        const parsedAcertos = sanitizeNum(topic.acertos);
        const parsedCorrect = sanitizeNum(topic.correct);
        const parsedTotal = sanitizeNum(topic.total);
        
        const c = Number.isFinite(parsedAcertos) ? parsedAcertos : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        
        let realProficiency = computeBayesianProficiency(c, tot, mediaGlobal, globalTotal);
        
        // CORREÇÃO: Clamp matemático vital para evitar proficiências negativas ou superiores a 100%
        realProficiency = Number.isFinite(realProficiency) ? Math.max(0, Math.min(1, realProficiency)) : 0;
        
        return {
            ...topic,
            realProficiency
        };
    })
    .sort((a, b) => {
        const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1; // NaN vai pro final da fila de prioridade (sabe tudo)
        const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
        return valA - valB;
    });
};


// ==================== FUNÇÃO PRINCIPAL ====================

export const extractMetrics = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const safeCategory = category || {};
    const categoryId = safeCategory.id;
    const calibrationHistory = options.calibrationHistoryByCategory?.[categoryId] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY,
        windowDays: cfg.MC_CALIB_WINDOW_DAYS,
        minSamples: cfg.MC_CALIB_MIN_SAMPLES,
        maxSamples: cfg.MC_CALIB_MAX_SAMPLES
    });

    const referenceDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
    const referenceNow = referenceDate.getTime();

    const rawMaxScore = Number(options.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;
    const rawMinScore = Number(options.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;
    const rawTargetScore = Number(options.targetScore ?? (maxScore * 0.8));
    const fallbackTarget = maxScore * 0.8;
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));
    const targetScoreLabel = options.targetScoreLabel ?? Math.round((targetScore / maxScore) * 100);
    
    let rawWeightVal = safeCategory.weight;
    if (typeof rawWeightVal === 'string') {
      // Remove separadores de milhar BR antes de converter
      rawWeightVal = rawWeightVal.replace(/\./g, '').replace(',', '.');
    }
    const parsedWeight = Number(rawWeightVal);
    
    const rawWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 5;
    const boundedWeight = Math.min(10, Math.max(1, rawWeight));
    const weight = boundedWeight * 20;
    const weightLabel = boundedWeight <= 3 ? '1 — Baixa' : boundedWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        try {
            const examDate = normalizeDate(options.user.goalDate);
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(referenceDate) || referenceDate;
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", options.user.goalDate);
        }
    }

    const catNormalized = normalize(safeCategory?.name || "Sem Nome");
    const safeSimulados = Array.isArray(simulados) ? simulados : Object.values(simulados || {});
    let relevantSimulados = safeSimulados.filter(s => s && normalize(s.subject || "") === catNormalized);
    relevantSimulados.sort((a, b) => {
        const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
        const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
        return timeB - timeA;
    });

    const rootActivityDate = (relevantSimulados.length > 0 
        ? normalizeDate(relevantSimulados[relevantSimulados.length - 1].date || relevantSimulados[relevantSimulados.length - 1].createdAt) 
        : null) || normalizeDate(referenceDate) || referenceDate;

    // BUG-10 FIX: Use immutable slice instead of side-effect mutation of array length
    if (relevantSimulados.length > 50) {
        relevantSimulados = relevantSimulados.slice(0, 50);
    }

    const simuladosWithMaxScore = relevantSimulados;

    let averageScore = 0;
    if (relevantSimulados.length > 0) {
        const coachAdaptive = deriveCoachAdaptiveParams(simuladosToHistory(relevantSimulados, maxScore), maxScore, cfg);
        const today = normalizeDate(referenceDate) || referenceDate;
        const K = coachAdaptive.decayK;
        const PESO_MIN = coachAdaptive.minWeight;
        const DELTA = coachAdaptive.scoreClampDelta;

        const calculateExponentialScore = (dataset) => {
            let weightedSum = 0;
            let totalWeight = 0;
            dataset.forEach(s => {
                const sScore = getSafeScore(s, maxScore);
                if (Number.isNaN(sScore)) return; // Previne corrupção do acumulador matemático
                const simDate = normalizeDate(s.date || s.createdAt) || new Date(0);
                const days = getDaysDiff(today, simDate);
                let timeWeight = Math.exp(-K * days);
                if (timeWeight < PESO_MIN) timeWeight = PESO_MIN;
                
                const rawTotal = Math.max(1, Number(s.total) || getSyntheticTotal(maxScore));
                const volumeWeight = Math.sqrt(Math.min(rawTotal, maxScore * 2));
                const peso = timeWeight * volumeWeight;
                
                weightedSum += sScore * peso;
                totalWeight += peso;
            });
            return totalWeight > 0 ? weightedSum / totalWeight : (maxScore / 2);
        };

        const mostRecentSimDate = relevantSimulados.length > 0 
            ? (normalizeDate(relevantSimulados[0].date || relevantSimulados[0].createdAt) || new Date(0)).getTime() 
            : referenceNow;
        const SESSION_GAP_MS = 60 * 60 * 1000; // 1 Hora

        let pastSimulados = relevantSimulados.filter(s => {
            const sTime = (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime();
            return sTime < (mostRecentSimDate - SESSION_GAP_MS);
        });
        
        // ✅ CORREÇÃO BUG #4: Fallback temporal correto
        // Usa todos exceto o mais recente, mantendo decaimento temporal
        if (pastSimulados.length === 0 && relevantSimulados.length > 1) {
            pastSimulados = relevantSimulados.slice(0, -1); // Remove apenas o último (mais recente)
        }
        
        const notaBruta = calculateExponentialScore(relevantSimulados);

        if (pastSimulados.length > 0) {
            const notaAnterior = calculateExponentialScore(pastSimulados);
            const diff = notaBruta - notaAnterior;
            let clampedDiff = diff;
            if (diff > DELTA) clampedDiff = DELTA;
            else if (diff < -DELTA) clampedDiff = -DELTA;
            
            const hoursSinceLastSim = (referenceNow - mostRecentSimDate) / (1000 * 60 * 60);
            if (hoursSinceLastSim < 24) {
                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            averageScore = notaBruta;
        }
    } else {
        averageScore = maxScore / 2;
    }

    let daysSinceLastStudy = 0;
    let recencyUnknown = true;
    let lastDate = normalizeDate(new Date(0)) || new Date(0);

    if (simuladosWithMaxScore.length > 0) {
        const simDate = normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0);
        if (simDate > lastDate) lastDate = simDate;
    }

    const safeStudyLogs = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    const categoryStudyLogs = safeStudyLogs.filter(log =>
        log?.categoryId === categoryId &&
        (normalizeDate(log.date) || new Date(0)).getTime() > 0
    );
    const MIN_MINUTES_VALID_STUDY = 15; 
    const validStudyLogs = categoryStudyLogs.filter(log => sanitizeMinutes(log.minutes) >= MIN_MINUTES_VALID_STUDY);

    if (validStudyLogs.length > 0) {
        const sortedLogs = [...validStudyLogs].sort((a, b) => (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime());
        const logDate = normalizeDate(sortedLogs[0].date) || new Date(0);
        if (logDate > lastDate) lastDate = logDate;
    }

    if (lastDate.getTime() > 0) {
        const today = normalizeDate(referenceDate) || referenceDate;
        daysSinceLastStudy = getDaysDiff(today, lastDate);
        recencyUnknown = false;
    }

    const trendHistory = [...simuladosWithMaxScore]
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
            return timeB - timeA;
        })
        .slice(0, 10)
        .map(s => ({
            score: getSafeScore(s, maxScore),
            date: s.date || s.createdAt
        }))
        .filter(t => Number.isFinite(t.score))
        .reverse();
    const lastNScores = trendHistory.map(t => t.score);
    const backtestWeights = deriveBacktestWeights(lastNScores, maxScore);

    const rawTrend = calculateSlope(trendHistory, maxScore) * 30;
    const limiteSuperior = maxScore - averageScore;
    const limiteInferior = -averageScore;
    const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

    const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, 10), maxScore);
    const mssdVolatility = mcHistory.length >= 3
        ? calculateMSSD(mcHistory, maxScore)
        : computeRobustVolatilityForCoach(mcHistory, maxScore);

    const mcAdaptive = {
        ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
        calibrationBaseline: rollingCalibration.baseline,
        calibrationMaxPenalty: rollingCalibration.maxPenalty
    };
    const adaptiveSimCount = lastNScores.length <= 5 ? Math.max(cfg.MC_SIMULATIONS, 1200) : cfg.MC_SIMULATIONS;

    const DISTANCE_THRESHOLD = 0.15 * maxScore;
    let effectiveMCTarget = targetScore;
    let effectiveMCDays = 90; 

    if (targetScore - averageScore > DISTANCE_THRESHOLD) {
        effectiveMCTarget = averageScore + Math.max(mssdVolatility, maxScore * 0.05) + (maxScore * 0.02);
        effectiveMCTarget = Math.min(effectiveMCTarget, targetScore); 
        
        if (daysToExam !== null && daysToExam !== undefined) {
            const totalGap = Math.max(1, targetScore - averageScore);
            const proximalGap = effectiveMCTarget - averageScore;
            const gapRatio = Math.min(1, Math.max(0, proximalGap / totalGap));
            effectiveMCDays = daysToExam > 0
                ? Math.max(14, Math.floor(gapRatio * daysToExam))
                : 0;
        } else {
            effectiveMCDays = 21;
        }
    }

    const globalProjectedMean = options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)
        ? options.globalMcStats.projectedMean
        : null;

    // Blend with global projected mean from Coach's MC stats for contest-aware conservatism
    if (globalProjectedMean != null && globalProjectedMean < effectiveMCTarget) {
        const blend = 0.25;
        effectiveMCTarget = effectiveMCTarget * (1 - blend) + globalProjectedMean * blend;
    }

    let globalBaselinePct = 50;
    const validCatNorms = new Set((options.allCategories || []).map(c => normalize(c.name || "")));
    const safeSims = Array.isArray(simulados) ? simulados : Object.values(simulados || {});
    const allSimsForBaseline = safeSims.filter(s => s && validCatNorms.has(normalize(s.subject || "")));
    if (allSimsForBaseline.length > 0) {
        const validGlobalSims = allSimsForBaseline
            .map(s => getSafeScore(s, maxScore))
            .filter(s => !Number.isNaN(s));
            
        if (validGlobalSims.length > 0) {
            const totalPoints = validGlobalSims.reduce((acc, s) => acc + s, 0);
            globalBaselinePct = (totalPoints / (validGlobalSims.length * maxScore)) * 100;
        }
    }

    const effectiveCfg = { 
        ...cfg, 
        MC_SIMULATIONS: adaptiveSimCount,
        MC_CALIBRATION_NEUTRAL_PCT: globalBaselinePct 
    };

    const agilityData = computeAgilityMetrics(safeCategory.simuladoStats?.history || []);
    const agilityPenalty = agilityData.agilityPenalty || 0;
    const avgSeconds = agilityData.avgSeconds || 0;

    const mcResult = runCoachMonteCarlo(
        simuladosWithMaxScore, 
        effectiveMCTarget, 
        effectiveCfg, 
        categoryId, 
        maxScore, 
        mcAdaptive,
        effectiveMCDays,
        agilityPenalty // NEW: pass agilityPenalty down to runCoachMonteCarlo
    );
    const mcProbability = mcResult?.probability ?? null;
    const mcHasData = mcResult != null;

    return {
        cfg,
        safeCategory,
        categoryId,
        rollingCalibration,
        referenceDate,
        referenceNow,
        maxScore,
        minScore,
        targetScore,
        targetScoreLabel,
        rawWeight,
        boundedWeight,
        weight,
        weightLabel,
        daysToExam,
        relevantSimulados,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs,
        categoryStudyLogs,
        validStudyLogs,
        trendHistory,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        mcAdaptive,
        effectiveMCTarget,
        effectiveMCDays,
        globalBaselinePct,
        effectiveCfg,
        mcResult,
        mcProbability,
        mcHasData,
        globalProjectedMean,
        agilityPenalty, // NEW
        avgSeconds
    };
};

export const calculateUrgencyScore = (metrics, options = {}) => {
    const {
        cfg,
        safeCategory,
        boundedWeight,
        daysToExam,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs,
        categoryStudyLogs,
        validStudyLogs,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        mcProbability,
        mcHasData,
        mcResult,
        maxScore,
        globalProjectedMean,
        agilityPenalty
    } = metrics;

    const forgetting = computeForgettingRisk(
        simuladosWithMaxScore,
        maxScore,
        averageScore,
        mssdVolatility,
        backtestWeights?.effectiveN || simuladosWithMaxScore.length,
        recencyUnknown ? null : daysSinceLastStudy,
        agilityPenalty // INTEGRAÇÃO AGILIDADE AI
    );
    const performanceDeficit = Math.max(0, metrics.targetScore - averageScore);
    const memoryRisk = forgetting.risk === 'critical' ? 40 : (forgetting.risk === 'high' ? 20 : 5);
    const volatilityRisk = mssdVolatility;

    const rawPain = performanceDeficit + memoryRisk + volatilityRisk;
    // ✅ CORREÇÃO BUG #2: Piso mais alto para evitar explosão
    const totalPain = Math.max(10, Number.isFinite(rawPain) ? rawPain : 10);

    // ✅ CORREÇÃO BUG #2: Clamp preventivo contra valores extremos
    const dynamicScoreMax = Math.min(110, Math.max(20, (performanceDeficit / totalPain) * 110));
    const dynamicRecencyMax = Math.min(110, Math.max(15, (memoryRisk / totalPain) * 110));
    const dynamicInstabilityMax = Math.min(110, Math.max(10, (volatilityRisk / totalPain) * 110));

    const weightMultiplier = 1 + ((boundedWeight - 5) / 5) * 0.40; 
    
    const normalizedAvg = (averageScore / maxScore) * 100;
    const scoreComponent = Math.max(0, Math.min(dynamicScoreMax, (100 - normalizedAvg) * (dynamicScoreMax / 100)));

    const effectiveRiskDays = recencyUnknown ? cfg.RECENCY_MAX : Math.min(daysSinceLastStudy, 45); 
    const crunchMultiplier = getCrunchMultiplier(daysToExam, rootActivityDate, metrics.referenceDate);
    
    let instabilityComponent = mssdVolatility * (dynamicInstabilityMax / cfg.INSTABILITY_MSSD_DIVISOR) * (100 / maxScore);
    const trendThreshold = getDynamicTrendThreshold(averageScore, maxScore);

    if (trend > trendThreshold) {
        instabilityComponent *= 0.5;
    } else if (trend < -trendThreshold) {
        instabilityComponent *= 1.3;
    }
    instabilityComponent = Math.min(dynamicInstabilityMax, instabilityComponent * backtestWeights.instabilityWeight);

    let mcUrgencyBoost = 0;
    let mcRiskLabel = null;
    const adaptiveRisk = deriveAdaptiveRiskThresholds(
        lastNScores, 
        mssdVolatility, 
        cfg, 
        maxScore, 
        mcResult?.predObsPairs || []
    );

    // EFEITO HALO (Covariância Simples): Se a performance global projetada do aluno 
    // for notavelmente maior que a matéria atual, o sistema assume que a inteligência 
    // geral dele resolverá a deficiência mais rápido, facilitando os thresholds de Monte Carlo.
    if (globalProjectedMean != null && globalProjectedMean > (averageScore + maxScore * 0.1)) {
        const haloBoost = Math.min(10, (globalProjectedMean - averageScore) * 0.3); // max 10%
        adaptiveRisk.danger = Math.min(99, adaptiveRisk.danger + haloBoost);
        adaptiveRisk.safe = Math.min(99, adaptiveRisk.safe + haloBoost);
    }

    if (mcHasData && mcProbability !== null) {
        const continuous = computeContinuousMcBoost(
            mcProbability,
            adaptiveRisk.danger,
            adaptiveRisk.safe,
            mssdVolatility,
            maxScore,
            cfg
        );
        mcUrgencyBoost = continuous.boost;
        mcRiskLabel = continuous.riskLabel;

        // INTEGRATION: if global MC (from useMonteCarloStats) shows worse outlook than this category's, add extra nudge.
        // This makes the Coach consider the overall contest projection.
        const globalProbability = options.globalMcStats && Number.isFinite(options.globalMcStats.probability) 
            ? options.globalMcStats.probability 
            : null;
        if (globalProbability != null && globalProbability < (mcProbability * 0.8)) {
            mcUrgencyBoost += 5; // small global risk boost
            mcRiskLabel = mcRiskLabel || 'elevated_global_risk';
        }
    }

    const hasHighPriorityTasks = safeCategory.tasks?.some(t => !t.completed && t.priority === 'high') || false;
    const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

    const allTasks = Array.isArray(safeCategory.tasks) ? safeCategory.tasks : [];
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t?.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1.0;
    const inefficiency = Math.max(0, 1 - completionRate);
    
    let empiricalTrust = 1.0;
    const hasData = simuladosWithMaxScore.length > 0 || categoryStudyLogs.length > 0;
    if (!hasData) {
        const globalSignal = computeAdaptiveCoachWeight(metrics.trendHistory); 
        empiricalTrust = Math.max(0.2, globalSignal.confidenceWeight);
    }

    const efficiencyBridgeBoost = 0; 
    const inefficiencyPenaltyMultiplier = 1.0 + (inefficiency * 0.3 * empiricalTrust); 
    const recencyComponent = (dynamicRecencyMax * 0.8) * (1 - Math.exp(-effectiveRiskDays / 7)) * crunchMultiplier * backtestWeights.recencyWeight * inefficiencyPenaltyMultiplier;

    const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalHours = totalMinutes / 60;

    const sortedLogsForBurnout = [...categoryStudyLogs].sort((a, b) => (normalizeDate(a.date) || new Date(0)).getTime() - (normalizeDate(b.date) || new Date(0)).getTime());
    const rollingWindowMs = 28 * MS_PER_DAY;
    const nowMs = metrics.referenceNow;
    const recentBaselineLogs = sortedLogsForBurnout.filter(log => (nowMs - (normalizeDate(log.date) || new Date(0)).getTime()) <= rollingWindowMs);
    const recentBaselineHours = recentBaselineLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    
    const firstLogTime = sortedLogsForBurnout.length > 0 
        ? (normalizeDate(sortedLogsForBurnout[0].date) || new Date(nowMs)).getTime() 
        : nowMs;
    const recentSpanDays = recentBaselineLogs.length > 0
        ? Math.max(1, (nowMs - (normalizeDate(recentBaselineLogs[0].date) || new Date(nowMs)).getTime()) / MS_PER_DAY)
        : Math.max(1, (nowMs - firstLogTime) / MS_PER_DAY);
    const activeWeeks = Math.max(1, Math.min(4, recentSpanDays / 7));

    const baselineHoursPerWeek = recentBaselineLogs.length > 0 ? (recentBaselineHours / activeWeeks) : 5.0;
    const dynamicBurnoutThreshold = Math.max(15.0, baselineHoursPerWeek * 1.8);

    const allCategoriesSafe = options.allCategories || [];
    const activeCount = allCategoriesSafe.length > 0 ? allCategoriesSafe.length : 1;
    const MS_PER_DAY_CONST = 24 * 60 * 60 * 1000;
    
    const currentLambda = metrics.mcAdaptive?.decayK || 0.03; 
    const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));

    const windowStart = (normalizeDate(metrics.referenceDate) || metrics.referenceDate).getTime() - (dynamicWindowDays * MS_PER_DAY_CONST);
    const recentAllLogs = (options.studyLogs || studyLogs || []).filter(log => (normalizeDate(log?.date) || new Date(0)).getTime() >= windowStart);
    const totalRecentMinutesAll = recentAllLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalRecentMinutesCat = recentAllLogs
        .filter(log => log?.categoryId === metrics.categoryId)
        .reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const observedShare = totalRecentMinutesAll > 0 ? totalRecentMinutesCat / totalRecentMinutesAll : (1 / activeCount);
    
    const totalSyllabusWeight = allCategoriesSafe.reduce((acc, c) => {
        if (!c) return acc; // Blindagem contra categorias apagadas/fantasmas no estado
        let rawW = c.weight;
        if (typeof rawW === 'string') rawW = rawW.replace(',', '.');
        const parsedW = Number(rawW);
        const w = (c.weight !== undefined && Number.isFinite(parsedW) && parsedW > 0) ? parsedW : 5;
        return acc + w;
    }, 0);
    
    const idealShare = totalSyllabusWeight > 0 ? metrics.rawWeight / totalSyllabusWeight : (1 / activeCount);
    const tolerance = 0.05; 
    const underAllocation = Math.max(0, idealShare - observedShare - tolerance);
    const balanceBridgeBoost = Math.min(cfg.EFFICIENCY_MAX, Math.pow(underAllocation * 10, 1.5));

    let srsBoost = 0;
    let srsLabel = null;

    if (hasData && !recencyUnknown) {
        // CORREÇÃO: Utilizar a engine científica oficial com suporte a MSSD e N efetivo
        const srsData = _getSRSBoost(simuladosWithMaxScore, daysSinceLastStudy, maxScore, cfg, mssdVolatility, backtestWeights?.effectiveN || simuladosWithMaxScore.length);
        srsBoost = srsData.boost;
        srsLabel = srsData.label;
    }

    let exactLastTime = 0;
    if (simuladosWithMaxScore.length > 0) exactLastTime = (normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0)).getTime();
    if (validStudyLogs.length > 0) {
        const logsOrdenados = [...validStudyLogs].sort((a, b) => 
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );
        const logTime = (normalizeDate(logsOrdenados[0].date) || new Date(0)).getTime();
        if (logTime > exactLastTime) exactLastTime = logTime;
    }

    const exactHoursSinceLast = exactLastTime > 0 ? (nowMs - exactLastTime) / (1000 * 60 * 60) : 48;
    let rotationPenalty = 0;
    
    if (exactHoursSinceLast < 24) {
        const fatigueRatio = Math.max(0, Math.min(1, averageScore / maxScore)); 
        const dynamicPenalty = Math.min(25, 15 * fatigueRatio * (1 + (mssdVolatility / maxScore)));
        rotationPenalty = dynamicPenalty;
    } else if (exactHoursSinceLast >= 24 && exactHoursSinceLast < 48 && !srsLabel) {
        rotationPenalty = mssdVolatility > (maxScore * 0.05) ? 8 : 2; 
    }
    if (srsBoost > 0) rotationPenalty *= 0.1;

    // ✅ FIX: Teto de normalização FIXO, independente do crunchMultiplier.
    // O crunchMultiplier ainda afeta o weightedRaw (input), mas a
    // normalização usa uma escala constante para comparabilidade temporal.
    const NORMALIZATION_CEILING = 200; // Constante fixa

    const currentPriorityBoost = priorityBoost * crunchMultiplier;
    const currentSrsBoost = srsBoost * crunchMultiplier;
    const rawScore = Math.max(0, (scoreComponent + recencyComponent + instabilityComponent + currentPriorityBoost + currentSrsBoost + mcUrgencyBoost + efficiencyBridgeBoost + balanceBridgeBoost) - rotationPenalty);

    // O crunchMultiplier continua a amplificar o rawScore (input),
    // mas a normalização é estável:
    const weightedRaw = rawScore * weightMultiplier; 

    let normalized;
    const CRITICAL_THRESHOLD = NORMALIZATION_CEILING * 0.8; // = 160, sempre
    
    if (weightedRaw <= 0) {
        normalized = 0;
    } else if (weightedRaw <= CRITICAL_THRESHOLD) {
        normalized = (weightedRaw / CRITICAL_THRESHOLD) * 80;
    } else {
        const excess = weightedRaw - CRITICAL_THRESHOLD;
        const excessNormalized = 20 * (1 - Math.exp(-excess / (NORMALIZATION_CEILING * 0.4)));
        normalized = 80 + excessNormalized;
    }

    normalized = Number.isFinite(normalized) ? Math.max(0, Math.min(100, Math.round(normalized))) : 0;

    return {
        weightedRaw,
        normalized,
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost,
        srsBoost,
        mcUrgencyBoost,
        efficiencyBridgeBoost,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        forgetting,
        performanceDeficit,
        memoryRisk,
        volatilityRisk,
        totalPain,
        dynamicScoreMax,
        dynamicRecencyMax,
        dynamicInstabilityMax,
        completionRate,
        inefficiencyPenaltyMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        observedShare,
        idealShare,
        srsLabel,
        exactHoursSinceLast,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks
    };
};

export const generateCoachStrings = (weightedRaw, normalized, metrics, scoreInfo, options = {}) => {
    const {
        cfg,
        maxScore,
        targetScore,
        weight,
        weightLabel,
        relevantSimulados,
        averageScore,
        daysSinceLastStudy,
        categoryStudyLogs,
        trend,
        mssdVolatility,
        effectiveMCTarget,
        effectiveMCDays,
        mcResult,
        mcProbability,
        mcHasData,
        globalProjectedMean,
        agilityPenalty // NEW: propaga pro details
    } = metrics;

    const {
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost,
        srsBoost,
        mcUrgencyBoost,
        efficiencyBridgeBoost,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        srsLabel,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        completionRate
    } = scoreInfo;

    let recommendation = "";
    const oneWeekAgo = (normalizeDate(metrics.referenceDate) || metrics.referenceDate).getTime() - (7 * 24 * 60 * 60 * 1000);
    const recentLogs = categoryStudyLogs.filter(log => {
        const d = normalizeDate(log.date) || new Date(0);
        return d && d.getTime() >= oneWeekAgo;
    });
    const recentHours = recentLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    const recentStudyDays = new Set(recentLogs.map(log => (normalizeDate(log.date) || new Date(0)).getTime())).size;
    
    const isHighVolume = recentHours > dynamicBurnoutThreshold;
    const isHighFrequency = recentStudyDays >= 5;
    const isEliteMaintenance = averageScore >= (maxScore * 0.95);
    const trendThreshold = getDynamicTrendThreshold(averageScore, maxScore);
    const lastNScores = metrics.lastNScores;
    const isStagnant = !isEliteMaintenance && trend <= trendThreshold && lastNScores.length >= 2;

    const burnoutMsg = isHighVolume && isStagnant 
        ? `Você estudou ${recentHours.toFixed(1)}h esta semana (seu normal é ~${baselineHoursPerWeek.toFixed(1)}h), mas a nota estagnou.` 
        : '';

    const isBurnoutRisk = (isHighVolume || (isHighFrequency && recentHours > 5.0)) && isStagnant && recentStudyDays >= 3;

    if (mcHasData && mcRiskLabel === 'critical') {
        const burnoutNote = isBurnoutRisk ? ` (⚠️ ${burnoutMsg || 'Sinais de estafa — mude o método.'})` : '';
        const targetInfo = effectiveMCTarget < targetScore ? ` (Meta ZDP: ${formatValue(effectiveMCTarget)})` : '';
        const globalNote = globalProjectedMean != null ? ` [Global: ${formatPercent(globalProjectedMean)}]` : '';
        recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${targetInfo}${globalNote}${burnoutNote}`;
    } else if (isBurnoutRisk) {
        recommendation = `🛑 Risco de Estafa: ${burnoutMsg || 'Você estudou muito mas a nota não reagiu.'} Considere descansar.`;
    } else if (mcHasData && mcRiskLabel === 'safe') {
        recommendation = `🏆 Cruzeiro Seguro (${formatPercent(mcProbability)} nas projeções). Modo de manutenção ativado.`;
    } else if (srsBoost > 0) {
        recommendation = `${srsLabel} - Não pule essa revisão!`;
    } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && trend > 0) {
        recommendation = "Desempenho Oscilante: Foque em preencher lacunas de base";
    } else if (trend < -trendThreshold) {
        recommendation = `Nota caindo (${formatValue(trend)} pts) - Atenção urgente`;
    } else if (averageScore < targetScore - (0.2 * maxScore)) {
        recommendation = `Nota Crítica: ${formatPercent((averageScore / maxScore) * 100)} (Meta ${formatPercent((targetScore / maxScore) * 100)})`;
    } else if (averageScore >= targetScore) {
        recommendation = "No caminho certo! Continue consolidando";
    } else {
        recommendation = "Pratique com regularidade";
    }

    const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;

    const result = {
        score: weightedRaw,
        normalizedScore: normalized,
        recommendation,
        details: {
            averageScore: Number(averageScore.toFixed(2)),
            globalProjectedMean: globalProjectedMean != null ? Number(globalProjectedMean.toFixed(1)) : null,
            daysSinceLastStudy,
            standardDeviation: Number(mssdVolatility.toFixed(2)),
            mssdVolatility: Number(mssdVolatility.toFixed(2)),
            trend: Number(trend.toFixed(2)),
            totalHours: Number(totalHours.toFixed(2)),
            hasData,
            hasSimulados: relevantSimulados.length > 0,
            hasHighPriorityTasks,
            completionRate: Number((completionRate * 100).toFixed(1)),
            efficiencyBridgeBoost: Number(efficiencyBridgeBoost.toFixed(2)),
            balanceBridgeBoost: Number(balanceBridgeBoost.toFixed(2)),
            weight,
            srsLabel,
            isBurnoutRisk,
            crunchMultiplier: Number(crunchMultiplier.toFixed(2)),
            agilityPenalty: agilityPenalty !== undefined ? Number(agilityPenalty.toFixed(4)) : 0, // NEW
            avgSeconds: metrics.avgSeconds || 0, // NEW
            monteCarlo: mcHasData ? {
                probability: Number(mcProbability.toFixed(2)),
                probabilityRaw: mcProbability,
                thresholds: {
                    danger: Number(adaptiveRisk.danger.toFixed(2)),
                    safe: Number(adaptiveRisk.safe.toFixed(2))
                },
                riskLabel: mcRiskLabel,
                volatility: Number(mcResult.volatility.toFixed(2)),
                meanProjected: Number(mcResult.mean.toFixed(2)),
                effectiveMCTarget: Number(effectiveMCTarget.toFixed(2)),
                effectiveMCDays: Number(effectiveMCDays),
                // From global MC stats when provided by Coach page (better integration)
                globalProjectedMean: globalProjectedMean != null ? Number(globalProjectedMean.toFixed(1)) : null,
                diagnostics: mcResult?.diagnostics || null,
                ci95Low: Number(mcResult.ci95Low.toFixed(2)),
                ci95High: Number(mcResult.ci95High.toFixed(2)),
                urgencyBoost: Number(mcUrgencyBoost.toFixed(2)),
                calibrationPenalty: Number((mcResult.calibrationPenalty || 0).toFixed(4)),
                avgBrier: Number((mcResult.avgBrier || 0).toFixed(4)),
                ece: Number((mcResult.ece || 0).toFixed(4)),
                reliability: Array.isArray(mcResult.reliability) ? mcResult.reliability : [],
                explainability: {
                    confidenceAdjusted: (mcResult.calibrationPenalty || 0) > 0,
                    confidenceAdjustmentPct: Number(((mcResult.calibrationPenalty || 0) * 100).toFixed(2)),
                    calibrationQuality: (mcResult.avgBrier || 0) <= cfg.MC_CALIBRATION_BRIER_BASELINE
                        ? 'good'
                        : (mcResult.avgBrier || 0) <= (cfg.MC_CALIBRATION_BRIER_BASELINE + 0.07) ? 'moderate' : 'low',
                    note: (mcResult.calibrationPenalty || 0) > 0
                        ? 'Probabilidade ajustada para reduzir overconfidence após backtest interno.'
                        : 'Sem ajuste de calibração significativo.'
                }
            } : null,
            backtest: {
                rankQuality: Number(metrics.backtestWeights.rankQuality.toFixed(4)),
                uplift: Number(metrics.backtestWeights.uplift.toFixed(4)),
                scoreWeight: Number(metrics.backtestWeights.scoreWeight.toFixed(3)),
                recencyWeight: Number(metrics.backtestWeights.recencyWeight.toFixed(3)),
                instabilityWeight: Number(metrics.backtestWeights.instabilityWeight.toFixed(3))
            },
            humanReadable: {
                "Média": formatPercent((averageScore / maxScore) * 100),
                "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                "Probabilidade (MC)": mcHasData ? formatPercent(mcProbability) : "Dados insuf.",
                "Contexto Global MC": globalProjectedMean != null ? formatPercent(globalProjectedMean) : null,
                "Peso da Matéria": weightLabel,
                "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
            },
            components: {
                scoreComponent: Number((scoreComponent * weightMultiplier).toFixed(2)),
                recencyComponent: Number((recencyComponent * weightMultiplier).toFixed(2)),
                instabilityComponent: Number((instabilityComponent * weightMultiplier).toFixed(2)),
                priorityBoost: Number((priorityBoost * weightMultiplier).toFixed(2)),
                srsBoost: Number((srsBoost * weightMultiplier).toFixed(2)),
                rotationPenalty: Number((rotationPenalty * weightMultiplier).toFixed(2)),
                mcUrgencyBoost: Number((mcUrgencyBoost * weightMultiplier).toFixed(2)),
                efficiencyBridgeBoost: Number((efficiencyBridgeBoost * weightMultiplier).toFixed(2)),
                balanceBridgeBoost: Number((balanceBridgeBoost * weightMultiplier).toFixed(2)),
            }
        }
    };


    // [FIX: Telemetry Pipeline Reconnection]
    if (result.details?.monteCarlo && typeof options.onCalibrationMetric === 'function') {
        options.onCalibrationMetric({
            categoryId: metrics.categoryId || null,
            categoryName: scoreInfo.nome || metrics.categoryName || 'Disciplina',
            timestamp: Date.now(),
            avgBrier: result.details.monteCarlo.avgBrier,
            ece: result.details.monteCarlo.ece,
            calibrationPenalty: result.details.monteCarlo.calibrationPenalty,
            reliability: result.details.monteCarlo.reliability || [],
            calibrationQuality: result.details.monteCarlo.explainability?.calibrationQuality || 'low'
        });
    }

    return result;
};

// ✅ FIX: calculateUrgency com cache key incluindo scoreChecksum
export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
  try {
    const catId = category?.id || 'unknown';
    const simCount = simulados.length;
    const logCount = studyLogs.length;
    
    const todayStr = getDateKey(new Date());
    
    // ✅ FIX: Score checksum para invalidar cache quando notas mudam
    const scoreChecksum = simulados.reduce((acc, s, index) => {
      const parsed = getSafeScore(s, options.maxScore || 100);
      const validVal = Number.isNaN(parsed) ? 0 : parsed;
      return acc + (validVal * (index + 1) * 1.17);
    }, 0).toFixed(2);
    
    const optKey = (options && options.daysToExam !== undefined) ? `_dte${options.daysToExam}` : '';
    const targetKey = `_ts${options?.targetScore ?? 'def'}_ms${options?.maxScore ?? 100}`;
    const lastSim = simCount > 0 ? (simulados[simCount-1].date || simulados[simCount-1].createdAt || '') : '';
    const lastLog = logCount > 0 ? (studyLogs[logCount-1].date || studyLogs[logCount-1].createdAt || '') : '';
    
    const tasksHash = (category?.tasks || []).reduce((acc, t) => acc + (t.completed ? 0 : 1) + (t.priority === 'high' ? 5 : 0), 0);
    const activeId = useAppStore.getState().appState?.activeId || 'default';
    
    // ✅ FIX: Cache key inclui scoreChecksum para invalidar quando notas mudam
    const cacheKey = `urg_${activeId}_${catId}_${simCount}_${logCount}_${scoreChecksum}_${todayStr}${optKey}${targetKey}_${lastSim}_${lastLog}_tsk${tasksHash}`;
    
    if (_urgencyCache.has(cacheKey)) {
      return _urgencyCache.get(cacheKey);
    }
    
    const metrics = extractMetrics(category, simulados, studyLogs, options);
    const scoreInfo = calculateUrgencyScore(metrics, options);
    const result = generateCoachStrings(scoreInfo.weightedRaw, scoreInfo.normalized, metrics, scoreInfo, options);
    
    if (typeof options.logger === 'function') {
      try { options.logger({ categoryId: metrics.categoryId, name: metrics.safeCategory?.name, urgency: result }); } catch { /* ignore */ }
    }
    
    if (_urgencyCache.size > 80) {
      const oldestKey = _urgencyCache.keys().next().value;
      _urgencyCache.delete(oldestKey);
    }
    
    _urgencyCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("[CoachLogic] Critical error in calculateUrgency:", err);
    return {
      score: 0,
      normalizedScore: 0,
      recommendation: "Erro no cálculo: " + err.message,
      details: { hasData: false, daysSinceLastStudy: 0, error: err.message, humanReadable: { "Status": "Erro" } }
    };
  }
};

/**
 * Motor de Regressão Histórica para o Coach AI
 * Valida a consistência entre projeções passadas e resultados reais.
 */
export function analisarDesempenhoHistorico(historico) {
    if (!historico || historico.length === 0) {
        return {
            tendencia: 'neutra',
            confiabilidadeDosDados: 'insuficiente',
            projecaoRetencao: 0
        };
    }
    
    // Converte o formato do teste para o formato esperado pelo computeForgettingRisk
    const formattedHistory = historico.map((h, i) => {
        // Blindagem contra instâncias nulas fantasma no DB
        if (!h) return { score: 0, total: 100, date: new Date().toISOString() };
        // CORREÇÃO FATAL: Impedir o RangeError sanitizando a string ou caindo para o índice (i)
        let rawDias = h.diasRevisao;
        if (typeof rawDias === 'string') rawDias = rawDias.replace(',', '.');
        const diasValidos = (rawDias === null || rawDias === undefined || rawDias === '') ? i : (Number.isFinite(Number(rawDias)) ? Number(rawDias) : i);
        
        const timestamp = Date.now() - (diasValidos * 86400000);
        const safeDate = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();

        const total = Math.max(1, Number(h.total) || 100);
        const acertos = Math.max(0, Number(h.acertos) || 0);
        return {
            score: (acertos / total) * 100,
            total: 100,
            date: safeDate.toISOString()
        };
    });

    const risk = computeForgettingRisk(formattedHistory);
    
    return {
        tendencia: risk.retentionPct > 80 ? 'alta' : (risk.retentionPct > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: risk.retentionPct
    };
}

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || categories.length === 0) return null;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });

    const top = ranked[0];
    if (!top) return null;

    const maxScore = options.maxScore ?? 100;
    const result = {
        ...top,
        weakestTopic: getWeakestTopic(top, simulados, maxScore)
    };

    // Integrate flashcards as measure: surface due cards and SRS boost
    if (options.flashcardDue > 0) {
        result.flashcardDue = options.flashcardDue;
        result.srsRecommendation = `Revisar ${options.flashcardDue} flashcards hoje para reforçar retenção e consistência.`;
        // Light urgency nudge (global indicator, not per-subject)
        if (result.urgency) {
            result.urgency.srsDue = options.flashcardDue;
        }
    }

    // INTEGRATION: Pass global MC stats from useMonteCarloStats so per-subject recommendations have global context.
    if (options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)) {
        const globalMean = Number(options.globalMcStats.projectedMean);
        if (result.urgency && result.urgency.details) {
            result.urgency.details.globalMcContext = {
                projectedMean: Number(globalMean.toFixed(1)),
                volatility: options.globalMcStats.sd ? Number(options.globalMcStats.sd.toFixed(2)) : null,
                source: 'global from useMonteCarloStats (Coach integration)'
            };
        }
        result.globalProjectedMean = Number(globalMean.toFixed(1));
        result.mcIntegrationSource = 'globalMcStats';
    }

    return result;
};




const MAX_CACHE_SIZE = 50; // Metade do tamanho anterior para manter memória baixa

function _buildSortedTopics(category, simulados = [], maxScore = 100) {
    const catId = category.id || category.name;
    const openTasks = (category.tasks || []).filter(t => !t.completed).length;
    
    // ✅ DEPOIS (Cache Isolado Estatisticamente)
    let lastSimTimestamp = 0;
    let historyVolume = 0; // Novo marcador de entropia
    if (simulados.length > 0) {
        const lastSim = simulados.reduce((latest, current) => {
            const latestTime = (normalizeDate(latest.date || latest.createdAt) || new Date(0)).getTime();
            const currTime = (normalizeDate(current.date || current.createdAt) || new Date(0)).getTime();
            return currTime > latestTime ? current : latest;
        }, simulados[0]);
        lastSimTimestamp = (normalizeDate(lastSim.date || lastSim.createdAt) || new Date(0)).getTime();
        historyVolume = simulados.length;
    }

    // Adicione uma soma de controlo (checksum) das notas reais ao hash para invalidar o cache sempre que uma pontuação for alterada internamente.
    // CORREÇÃO: Utilizar o extrator resiliente (getSafeScore) para o Checksum, 
    // garantindo que a entropia numérica varia corretamente a cada edição do utilizador.
    const scoreChecksum = simulados.reduce((acc, s, index) => {
        const parsed = getSafeScore(s, maxScore);
        const validVal = Number.isNaN(parsed) ? 0 : parsed;
        // Injeção de assimetria posicional (index + 1) e ruído primo leve (1.17)
        // para garantir que [30, 70] possua um Hash distinto de [70, 30].
        return acc + (validVal * (index + 1) * 1.17);
    }, 0);

    // Adiciona entropia baseada nas tarefas e no histórico da própria categoria 
    // para evitar colisões de cache entre concursos diferentes (BUG 7)
    const tasksHash = (category.tasks || []).reduce((acc, t) => acc + (t.id || t.text || '').length, 0);
    const historyLen = (category.simuladoStats && category.simuladoStats.history) 
        ? (Array.isArray(category.simuladoStats.history) ? category.simuladoStats.history.length : Object.keys(category.simuladoStats.history).length) 
        : 0;

    // Injeção do volume histórico atua como 'salt' criptográfico para o cache, 
    // garantindo que concursos distintos ou novos dados invalidem o estado corretamente.
    // CORREÇÃO: Injetar entropia temporal (Data Atual ISO) na chave de cache para garantir 
    // que o decaimento por repetição espaçada (SRS) é atualizado dia após dia.
    const todayStr = getDateKey(new Date());
    const userId = category?.userId || simulados[0]?.userId || 'default';
    const hash = `${userId}-${lastSimTimestamp}-${openTasks}-${tasksHash}-${historyLen}-${maxScore}-${historyVolume}-${scoreChecksum.toFixed(1)}-${todayStr}`; 
    const cacheKey = `isolate_${catId}_${hash}`;

    if (_topicsCache.has(cacheKey)) {
        // Renovar a posição na fila do Map (LRU)
        const result = _topicsCache.get(cacheKey);
        _topicsCache.delete(cacheKey);
        _topicsCache.set(cacheKey, result);
        return result;
    }

    // CORREÇÃO: Em vez de destruir 100 itens (Jank Rendering), remove apenas o mais antigo.
    if (_topicsCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = _topicsCache.keys().next().value;
        _topicsCache.delete(oldestKey);
    }

    const result = _buildSortedTopicsImpl(category, simulados, maxScore);
    _topicsCache.set(cacheKey, result);
    return result;
}

const _buildSortedTopicsImpl = (category, simulados = [], maxScore = 100) => {
    const tasks = category.tasks || [];
    const topicMap = {};

    const catNorm = normalize(category.name);
    const relevantSimulados = simulados.filter(s => normalize(s.subject) === catNorm);
    const categorySimuladoCount = relevantSimulados.length;

    const history = (category.simuladoStats && category.simuladoStats.history) ? category.simuladoStats.history : [];

    const todayForTopics = new Date();

    // CORREÇÃO: Organizar o caos temporal antes de mapear os tópicos
    // CORREÇÃO: Aplicar blindagem temporal ao motor de ordenação (sort).
    // Impede o colapso estrutural da lista se uma data do servidor vier ilegível.
    const sortedTopicsHistory = [...history].sort((a, b) => {
        const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
        const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
        return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
    });

    sortedTopicsHistory.forEach(entry => {
        if (!entry) return;
        let entryTime = todayForTopics.getTime();
        if (entry.date || entry.createdAt) {
            entryTime = (normalizeDate(entry.date || entry.createdAt) || new Date(0)).getTime();
        }
        
        // CORREÇÃO: Se a data não fizer sentido estatístico, assume-se tempo presente (0 dias)
        // para que a nota seja contabilizada de forma neutra em vez de ser aniquilada por NaNs.
        const safeEntryTime = Number.isFinite(entryTime) && entryTime > 0 ? entryTime : todayForTopics.getTime();
        const entryDate = normalizeDate(safeEntryTime) || new Date(safeEntryTime);
        
        const daysOld = Math.max(0, (todayForTopics.getTime() - safeEntryTime) / (1000 * 60 * 60 * 24));
        const timeWeight = Math.max(0.01, Math.exp(-0.015 * daysOld));

        const topics = entry.topics || [];
        topics.forEach(t => {
            if (!t) return;
            let rawName = t.name;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";
            const name = rawName.trim();
            if (!topicMap[name]) {
                // CORREÇÃO: Se não há tarefas iniciais, assume-se "neutro", mas sinalizado sem tarefas
                topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: true, hasTasks: false, scores: [] };
                topicMap[name].hasUnfinishedTask = false;
            }
            let rawTotal = Number(t.total);
            let topicTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;
            let topicCorrect = 0;

            // 🎯 FIX: Aceitar total === 0 se houver score válido (heurística isTotalMissing expandida)
            const isTotalMissing = t.total === undefined || t.total === null || String(t.total).trim() === "" || Number(t.total) === 0;

            if (t.score != null && isTotalMissing) {
                // Cenário: Foi inserido apenas a percentagem sem volume
                topicTotal = getSyntheticTotal(maxScore);
                topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
            } else if (topicTotal > 0) {
                // Cenário: Tem volume de questões
                // Cenário: Tem volume de questões
                if (t.correct !== undefined && t.correct !== null && !t.isPercentage) {
                    // CORREÇÃO: Sanitização estrita e resiliente a milhares
                    const rawC = sanitizeNum(t.correct);
                    topicCorrect = Math.min(topicTotal, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    // Fallback seguro em caso de notas penalizadas ao nível do subtópico
                    topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
                }
            } else {
                return; // Se o total for zero (e sem score percentual), sai da iteração para evitar Infinity/NaN
            }

            // Limpeza final de limites matemáticos
            if (Number.isNaN(topicCorrect)) return; // FIX NaN Poisoning!
            topicCorrect = Math.max(0, topicCorrect);

            topicMap[name].total += (topicTotal * timeWeight);
            topicMap[name].correct += (topicCorrect * timeWeight);

            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
                    total: topicTotal,
                    date: entryDate.toISOString()
                });
            }
            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });

    tasks.forEach(task => {
        const name = String(task.text || task.title || "").trim();
        if (!name) return;

        if (!topicMap[name]) {
            topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: !!task.completed, hasTasks: true, scores: [] };
            topicMap[name].hasUnfinishedTask = !task.completed;
        } else {
            topicMap[name].hasTasks = true; // Confirma existência
            if (topicMap[name].hasUnfinishedTask === undefined) {
                topicMap[name].hasUnfinishedTask = !task.completed;
            } else if (!task.completed) {
                topicMap[name].hasUnfinishedTask = true;
            }
            topicMap[name].completed = !topicMap[name].hasUnfinishedTask;
        }

        let newTaskPriority = 0;
        if (task.priority === 'high') newTaskPriority = 40;
        else if (task.priority === 'medium') newTaskPriority = 20;

        if (!task.completed) {
            topicMap[name].manualPriority = Math.max(topicMap[name].manualPriority || 0, newTaskPriority);
        }

    });

    const today = new Date();
    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateSlope(topicHistory, 100) * 30 : 0;
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 30; // Fallback mais brando para datas corrompidas (antes era 60)
        } else {
            daysSince = getDaysDiff(today, data.lastSeen);
        }
        const priorityBoost = data.manualPriority || 0;
        const perfComponent = Math.max(0, Math.min(1, (100 - percentage) / 100));
        const recencyComponent_topic = Math.max(0, Math.min(1, daysSince / 60));
        const priorityComponent = Math.max(0, Math.min(1, priorityBoost / 40));
        const perfRatio = percentage / 100;

        const TOPIC_W_PERF = 0.70 - (0.40 * perfRatio);
        const TOPIC_W_RECENCY = 0.10 + (0.40 * perfRatio);
        const TOPIC_W_PRIORITY = 0.20;

        let urgencyScore = (perfComponent * TOPIC_W_PERF + recencyComponent_topic * TOPIC_W_RECENCY + priorityComponent * TOPIC_W_PRIORITY) * 200;
        if (percentage === 0 && data.scores.length === 0 && categorySimuladoCount > 3) {
            urgencyScore *= 0.7;
        }
        const topicDropThreshold = -2.0; 
        if (trend < topicDropThreshold) {
            const dropSeverity = Math.min(2.0, 1 + Math.abs(trend / topicDropThreshold) * 0.1);
            urgencyScore *= dropSeverity;
        }
        return {
            name, total: data.total, percentage, daysSince,
            trend: Number(trend.toFixed(2)), priorityBoost, urgencyScore,
            isUntested: data.total === 0,
            manualPriority: data.manualPriority || 0,
            completed: data.completed,
            hasTasks: !!data.hasTasks
        };
    });

    topics.sort((a, b) => {
        // CORREÇÃO: Apenas damos prioridade absoluta (Boost) se houver uma tarefa por fazer
        const aNeedsAction = !a.completed && a.hasTasks;
        const bNeedsAction = !b.completed && b.hasTasks;
        
        if (aNeedsAction && !bNeedsAction) return -1;
        if (!aNeedsAction && bNeedsAction) return 1;
        
        return b.urgencyScore - a.urgencyScore;
    });

    return topics;
};

const getWeakestTopic = (category, simulados = [], maxScore = 100) => {
    return _buildSortedTopics(category, simulados, maxScore)[0] || null;
};

const getWeakestTopicsList = (category, simulados = [], maxScore = 100, limit = 3) => {
    return _buildSortedTopics(category, simulados, maxScore).slice(0, limit);
};


export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore ?? 80;
    const maxScore = options.maxScore ?? 100;
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });

    const topCategories = ranked.slice(0, 10);

    // Adicione a averageScore como argumento na verificação profunda
    const performDeepCheck = (category, averageScore) => {
        // CORREÇÃO: Respeitar a âncora temporal da engine (options.now) para suportar Backtesting 
        const baseDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
        const thirtyDaysAgo = new Date(baseDate);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTime = thirtyDaysAgo.getTime();

        const recentLogs = studyLogs.filter(l => l.categoryId === category.id && (normalizeDate(l.date) || new Date(0)).getTime() >= cutoffTime);
        const catNormalized = normalize(category.name);
        const recentSims = simulados.filter(s => normalize(s.subject) === catNormalized && (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime() >= cutoffTime);

        const totalHours = recentLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => acc + (Number(s.total) || getSyntheticTotal(maxScore)), 0);

        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;

        // CORREÇÃO: "Burn-in period". Ignorar alerta se o aluno está a começar a matéria (< 45%)
        const normalizedScore = averageScore !== undefined ? (averageScore / maxScore) * 100 : 100;
        const isFormingBase = normalizedScore < 45;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold && !isFormingBase) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Estudou ${totalHours.toFixed(1)}h de ${category.name} mas resolveu poucas questões (${questionsPerHour.toFixed(1)}/h). O seu nível atual exige prática >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };


    let allGeneratedTasks = [];

    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);

    topCategories.forEach((cat) => {
        const weakTopics = getWeakestTopicsList(cat, simulados, maxScore, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;

        const iterations = tasksPerCategory;

        const priorityLabel = allGeneratedTasks.length < 3 ? '[PROTOCOLO PRIORITÁRIO] ' : '';
        const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
        // BUG-9 FIX: Add timestamp suffix to prevent duplicate React keys across regeneration cycles
        const mcIdSuffix = Date.now().toString(36);
        const mcProbKey = mc ? Math.round(mc.probabilityRaw) : '0';
        const mcVolKey = mc ? Math.round(mc.volatility * 100) : '0';
        const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;

        // 1. Alertas Críticos (Prioridade Máxima, inseridos antes dos tópicos)
        if (mc && mc.probabilityRaw < adaptiveDanger) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-danger-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${priorityLabel}[ALERTA MESTRE] 🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance.`,
                completed: false,
                categoryId: cat.id, category: cat.name, catName: cat.name,
                analysis: {
                    reason: "Monte Carlo — Zona de Perigo",
                    details: `Apenas ${probPct}% de chance de bater a meta de ${options.targetScoreLabel ?? targetScore}% em 90 dias.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Probabilidade crítica detectada. Mude de método imediatamente."
                }
            });
        }
        else if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && mc.probabilityRaw < cfg.MC_PROB_SAFE) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-chaos-${mcVolKey}-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${priorityLabel}[ALERTA MESTRE] 🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado.`,
                completed: false,
                categoryId: cat.id, category: cat.name, catName: cat.name,
                analysis: {
                    reason: "Monte Carlo — Caos Estatístico",
                    details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)}. Probabilidade: ${probPct}%.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível."
                }
            });
        }
        else if (mc && mc.probabilityRaw >= adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-safe-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${priorityLabel}[${cat.name}]`,
                completed: false,
                categoryId: cat.id, category: cat.name, catName: cat.name,
                analysis: {
                    reason: "Monte Carlo — Cruzeiro Seguro",
                    details: `${probPct}% de probabilidade de atingir a meta.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Mantenha o ritmo atual para proteger sua posição."
                }
            });
        }
        else if (cat.urgency?.details?.srsLabel) {
            const srsKey = cat.urgency?.details?.srsLabel.replace(/\s/g, '').substring(0, 15);
            allGeneratedTasks.push({
                id: `${cat.id}-srs-${srsKey}`,
                text: `${cat.name}: ${priorityLabel}[${cat.name}]`,
                completed: false,
                categoryId: cat.id, category: cat.name, catName: cat.name,
                analysis: {
                    reason: "Revisão Espaçada (SRS) Ativada",
                    label: cat.urgency?.details?.srsLabel,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                }
            });
        }
        else if (performDeepCheck(cat, cat.urgency?.details?.averageScore).isTrap) {
            allGeneratedTasks.push({
                id: `${cat.id}-trap-trap`,
                text: `${cat.name}: ${priorityLabel}[${cat.name}]`,
                completed: false,
                categoryId: cat.id, category: cat.name, catName: cat.name,
                analysis: {
                    reason: "Detector de Pseudo-Estudo",
                    details: "Alta carga horária com baixíssimo volume de exercícios.",
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                }
            });
        }

        const agilityData = cat.urgency?.details?.agilityPenalty !== undefined 
            ? { avgSeconds: cat.urgency?.details?.avgSeconds || 0, agilityPenalty: cat.urgency?.details?.agilityPenalty || 0 }
            : computeAgilityMetrics((cat.simuladoStats && Array.isArray(cat.simuladoStats.history)) ? cat.simuladoStats.history : []);
            
        const avgSeconds = agilityData.avgSeconds;
        const targetSeconds = 120;
        const isAgilityProblem = (avgSeconds > targetSeconds + 30) && (cat.urgency?.normalizedScore >= 75); 

        if (isAgilityProblem) {
            allGeneratedTasks.push({
                id: `${cat.id}-agility-${avgSeconds}`,
                text: `${cat.name}: ${priorityLabel}[${cat.name}]`,
                completed: false,
                categoryId: cat.id, category: cat.name, catName: cat.name,
                analysis: {
                    reason: "Motor de Agilidade AI",
                    details: `Seu tempo médio (${avgSeconds}s/questão) está alto, embora sua taxa de acertos seja excelente.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: `Faça baterias curtas com cronômetro para reduzir o seu tempo de ${avgSeconds}s para a meta de ${targetSeconds}s por questão.`
                }
            });
        }

        // 2. Consumo de Tópicos
        let topicCursor = 0;
        for (let i = 0; i < iterations; i++) {
            const weakTopic = (topicCursor < weakTopics.length) ? weakTopics[topicCursor++] : null;
            const topicLabel = weakTopic ? `${priorityLabel}[${weakTopic.name}]` : `${priorityLabel}[${cat.name}]`;
            const uniqueIdSuffix = weakTopic 
                ? (`${weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}-${weakTopic.total}-${i}`) 
                : `geral-${i}`;

            if (weakTopic) {
                let reasonStr = "";
                if (weakTopic.isUntested) {
                    reasonStr = "Tópico Novo / Não Testado";
                } else if (weakTopic.manualPriority > 0) {
                    reasonStr = "Alta Prioridade Manual";
                } else if (weakTopic.percentage < 70) {
                    reasonStr = "Baixa Performance";
                } else {
                    reasonStr = "Aperfeiçoamento Contínuo";
                }
                
                allGeneratedTasks.push({
                    id: `${cat.id}-weaktopic-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}`,
                    completed: false,
                    categoryId: cat.id, category: cat.name, catName: cat.name,
                    analysis: {
                        reason: `Tópico Selecionado: ${weakTopic.name}`,
                        details: reasonStr,
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        categoryDetails: {
                            "Urgência Total": Math.round(cat.urgency.score),
                            ...cat.urgency?.details?.components
                        },
                        topicDetails: {
                            "Nota do Tópico": Math.round(weakTopic.percentage) + "%",
                            "Dias sem Ver": weakTopic.daysSince,
                            "Tendência": weakTopic.trend > 0 ? `↑ ${weakTopic.trend}` : `↓ ${weakTopic.trend}`,
                            "Bônus de Prioridade": weakTopic.priorityBoost,
                            "Urgência Calculada": Math.round(weakTopic.urgencyScore)
                        }
                    }
                });
            } else {
                // Fallback se não houver tópicos fracos ou se todos estiverem bons
                allGeneratedTasks.push({
                    id: `${cat.id}-general-review-${uniqueIdSuffix}-it${i}`,
                    text: `${cat.name}: ${topicLabel}Revisão Geral Complementar (Volume ${i + 1})`,
                    completed: false,
                    categoryId: cat.id, category: cat.name, catName: cat.name,
                    analysis: {
                        reason: "Revisão Geral Complementar",
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        categoryDetails: {
                            "Total Urgency": Math.round(cat.urgency.score),
                            ...cat.urgency?.details?.components
                        }
                    }
                });
            }
        }
    });

    return allGeneratedTasks.slice(0, 12);
};

export function getCognitiveState(stats) {
    if (!stats || typeof stats !== 'object') return 100;

    // FIX: Se não houver minutos na sessão atual, verificar o tempo desde o último estudo
    let focusMinutes = stats.consecutiveMinutes || 0;
    
    if (focusMinutes === 0 && stats.lastActivityTimestamp) {
        const minutesSinceLast = Math.max(0, (Date.now() - stats.lastActivityTimestamp) / 60000);
        // Se passou menos de 30 min, o utilizador ainda está "quente" da sessão anterior
        if (minutesSinceLast < 30) focusMinutes = stats.previousSessionMinutes || 0;
    }
    let hadBreaks = (stats.pomodorosCompleted || 0) > 0;

    if (focusMinutes === 0 && hadBreaks) {
        focusMinutes = stats.pomodorosCompleted * (stats.settings?.pomodoroWork || 25);
    }

    // CORREÇÃO: Forçar a validação matemática do nível do utilizador, assegurando um 
    // multiplicador saudável (fallback para 1) caso a BD entregue uma string ilegível.
    const rawLevel = stats.user?.level;
    const userLevel = (rawLevel === null || rawLevel === undefined || rawLevel === '') ? 1 : (Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : 1);
    const levelMultiplier = Math.max(0.1, 1 + (userLevel * 0.05));
    
    const decayModifier = hadBreaks ? 0.6 : 1.0;
    const dynamicDecay = (0.003 / levelMultiplier) * decayModifier;

    const fatigueScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-dynamicDecay * focusMinutes))));
    return fatigueScore;
}

export function getBestTask(categories, excludeTaskId = null) {
    let bestTask = null;
    let highestScore = -Infinity;

    (categories || []).filter(Boolean).forEach(cat => {
        (cat.tasks || []).filter(Boolean).forEach(task => {
            if (task.completed || (excludeTaskId && (task.id || task.text) === excludeTaskId)) return;

            let score = 0;

            if (task.priority === 'high') score += 50;
            else if (task.priority === 'medium') score += 20;

            const studiedAt = task.lastStudiedAt || cat.lastStudiedAt;
            const normalizedStudyDate = normalizeDate(studiedAt);
            const parsedTime = normalizedStudyDate ? normalizedStudyDate.getTime() : NaN;
            
            if (studiedAt && !isNaN(parsedTime) && parsedTime > 0) {
                const days = Math.max(0, (Date.now() - parsedTime) / (1000 * 60 * 60 * 24));
                const urgenciaPorEsquecimento = 40 * (1 - Math.exp(-0.05 * days));
                score += urgenciaPorEsquecimento;
            } else {
                // FIX BUG 5: Matéria inédita/não estudada é prioridade estrutural (falta de base).
                // 45 pontos garante que passe na frente de matérias velhas.
                score += 45; 
            }

            // Fator 3: Taxa de Erro (dentro de getBestTask)
            if (task.errorRate !== undefined && task.errorRate !== null) {
                let rawError = String(task.errorRate || '0').replace('%', '').replace(',', '.').trim();
                const validErrorRate = Number.isFinite(Number(rawError)) ? Number(rawError) : 0;
                
                let normalizedErrorRate;
                normalizedErrorRate = Math.min(100, Math.max(0, validErrorRate)) / 100;
                
                score += normalizedErrorRate * 40; // 0-40 pts
            }

            if (score > highestScore) {
                highestScore = score;
                bestTask = { 
                    ...task, 
                    id: task.id || task.text, // Normalização de ID
                    catName: cat.name, 
                    catColor: cat.color, 
                    catIcon: cat.icon, 
                    catId: cat.id 
                };
            }
        });
    });

    return bestTask;
}

/**
 * Inteligência do Coach
 * Decide a cor e a mensagem baseada na matemática acima.
 */
export function getCoachInsight(activeSubject, stats) {
    if (!activeSubject) {
        return {
            type: 'info',
            title: 'STATUS: STANDBY',
            text: 'Aguardando inicialização do protocolo de foco. Selecione um vetor de estudo abaixo para ativar o rastreamento neural.',
            color: 'indigo',
            iconType: 'Brain'
        };
    }

    const fatigueScore = getCognitiveState(stats);

    // Ajusta a tolerância à fadiga baseada no fôlego histórico (level)
    const userResilience = stats?.user?.level || 1;
    // Quanto maior o level, mais baixo o score de fadiga precisa cair para acionar o alarme
    const dangerThreshold = Math.max(45, 75 - (userResilience * 2)); 
    const flowThreshold = Math.min(90, 80 + (userResilience * 0.5));

    if (fatigueScore < dangerThreshold) {
        return {
            type: 'danger',
            title: 'ALERTA: ESGOTAMENTO NEURAL',
            text: `Carga cognitiva em nível crítico (**${fatigueScore}%**). Taxa de retenção em declínio acentuado. Protocolo de resfriamento (pausa) recomendado.`,
            color: 'red',
            iconType: 'Alert'
        };
    }

    // LOGIC-FATIGUE-THRESHOLD FIX: antes, pomodorosCompleted >= 3 disparava "SINCRONIA TOTAL"
    // mesmo com fatigueScore=70 (logo acima do limiar de perigo), o que é contraditório.
    // Agora exige fatigueScore >= flowThreshold para indicar estado de alto desempenho.
    if (fatigueScore >= flowThreshold && stats?.pomodorosCompleted >= 3) {
        return {
            type: 'success',
            title: 'ESTADO: SINCRONIA TOTAL',
            text: `Sincronia neural otimizada! Estabilidade cognitiva blindada em **${fatigueScore}%**. Fluxo de dados em alta fidelidade detectado.`,
            color: 'emerald',
            iconType: 'Zap'
        };
    }

    // --- PATCH: Optional Chaining (stats?) para prevenir TypeError no arranque ---
    if (stats?.pomodorosCompleted >= 3) {
        return {
            type: 'info',
            title: 'SESSÃO: PROGRESSO ACUMULADO',
            text: `${stats.pomodorosCompleted} sessões concluídas. Disposição operacional em **${fatigueScore}%**. Considere uma pausa curta para consolidação.`,
            color: 'indigo',
            iconType: 'Brain'
        };
    }

    return {
        type: 'info',
        title: 'SESSÃO: OPERACIONAL',
        text: `Frequência de foco sintonizada. Disposição operacional calculada em **${fatigueScore}%**. Escaneando vetor: **${activeSubject.task || 'ação'}**.`,
        color: 'indigo',
        iconType: 'Brain'
    };
}

/**
 * Deduplicates and combines history rows and simulado rows, returning a sorted history.
 * Groups legacy topic rows into global events if no 'simulados' exist for that date.
 */
export function getCombinedHistory(history, simulados) {
    const deduplicatedMap = new Map();
    const allSimulados = [...(simulados || [])];
    
    // Adiciona os simulados oficiais ao map
    allSimulados.forEach((s, idx) => {
        const safeScore = getSafeScore(s, 100);
        const key = `${s.id || `sim-no-id-${idx}`}|${s.date || s.createdAt}|${Number.isFinite(safeScore) ? safeScore.toFixed(2) : '0.00'}`;
        deduplicatedMap.set(key, { ...s, type: 'simulado' });
    });

    const hasSimuladoForDate = new Set(
      allSimulados
        .map(s => getDateKey(s.date || s.createdAt))
        .filter(Boolean)
    );
    
    // Agrupa e adiciona o histórico legado
    const rowsByDate = {};
    (history || []).forEach(r => {
        const dKey = getDateKey(r.date || r.createdAt);
        if (dKey && !hasSimuladoForDate.has(dKey)) {
            if (!rowsByDate[dKey]) rowsByDate[dKey] = { correct: 0, total: 0 };
            rowsByDate[dKey].correct += (Number(r.correct) || 0);
            rowsByDate[dKey].total += (Number(r.total) || 0);
        }
    });

    Object.entries(rowsByDate).forEach(([dKey, stats]) => {
        if (stats.total > 0) {
            const score = (stats.correct / stats.total) * 100;
            const key = `legacy-${dKey}|${dKey}|${score.toFixed(2)}`;
            if (!deduplicatedMap.has(key)) {
                deduplicatedMap.set(key, { id: `legacy-${dKey}`, date: dKey, score, type: 'simulado' });
            }
        }
    });

    return getSortedHistory(Array.from(deduplicatedMap.values()));
}

