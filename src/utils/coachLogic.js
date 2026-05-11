// ==================== CONSTANTES ====================
import { standardDeviation } from '../engine/stats.js';
import { calculateMSSD, calculateSlope } from '../engine/projection.js';
import { computeForgettingRisk } from '../engine/diagnostics.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
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
export { deriveAdaptiveRiskThresholds, computeContinuousMcBoost, deriveBacktestWeights, clearMcCache, runCoachMonteCarlo };


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
    const currentPct = currentScore / maxScore;
    
    // Fator de amortecimento: se o aluno tirou 40%, damping = 0.6. Se tirou 95%, damping = 0.05.
    const damping = Math.max(0, 1 - currentPct);
    
    // Curva de exigência: Inicia agressiva (ex: 4~5% para novatos) e cai para um mínimo de 0.2% para veteranos.
    const baseRequirement = 0.05; 
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002; 
    
    return dynamicPct * maxScore;
}

// ==================== FUNÇÕES AUXILIARES ====================

const normalizeDate = (dateInput) => {
    if (!dateInput) return new Date(0);
    try {
        const d = typeof dateInput === 'string' && dateInput.length === 10
            ? new Date(`${dateInput}T12:00:00`)
            : new Date(dateInput);
        if (isNaN(d.getTime())) return new Date(0);
        d.setHours(0, 0, 0, 0);
        return d;
    } catch {
        return new Date(0);
    }
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getDaysDiff = (newer, older) => {
    const newerDate = normalizeDate(newer);
    const olderDate = normalizeDate(older);
    return Math.max(0, Math.floor((newerDate.getTime() - olderDate.getTime()) / MS_PER_DAY));
};

function getCrunchMultiplier(daysToExam, historyStartDate) {
    if (daysToExam === undefined || daysToExam === null || daysToExam < 0) return 1.0;
    
    // 1. Descobre a extensão total do projeto do aluno
    let totalJourneyDays = 90; // Default razoável
    if (historyStartDate && historyStartDate.getTime() > 0) {
        const elapsed = (Date.now() - historyStartDate.getTime()) / MS_PER_DAY;
        totalJourneyDays = Math.max(30, elapsed + daysToExam);
    }

    // 2. Midpoint Dinâmico: A "reta final" é definida como os últimos 15% do tempo de preparação, com limites sãos.
    const dynamicMidpoint = Math.min(60, Math.max(5, totalJourneyDays * 0.15));
    
    // 3. Inclinação Dinâmica (steepness): Garante que a transição de "calmo" para "desespero" ocorra suavemente dentro desse espaço.
    const dynamicSteepness = 1.8 / dynamicMidpoint; 

    if (daysToExam > dynamicMidpoint * 3) return 1.0; // Poupando CPU

    const x = Number(daysToExam);
    const logistic = 1 / (1 + Math.exp(dynamicSteepness * (x - dynamicMidpoint)));
    const scaled = 1 + (1.5 * logistic);

    return Math.max(1.0, Math.min(2.5, scaled));
}

function getSRSBoost(history, daysSince, maxScore, cfg) {
    // Calcula a estabilidade da memória do aluno baseada no histórico real de notas
    const forgettingData = computeForgettingRisk(history, maxScore);
    
    // retentionPct é a curva de Ebbinghaus real do usuário (100% a 0%)
    const retention = forgettingData.retentionPct;

    if (retention < 30) return { boost: cfg.SRS_BOOST * 2.0, label: "⚠️ Memória Crítica (Risco de Branco)" };
    if (retention < 55) return { boost: cfg.SRS_BOOST * 1.4, label: "🧠 Revisão Necessária (Curva de Esquecimento)" };
    if (retention < 75) return { boost: cfg.SRS_BOOST * 0.8, label: "🔄 Revisão de Reforço" };
    
    // Se a retenção está alta (ex: 90%), o aluno não precisa revisar, mesmo que faça 20 dias.
    return { boost: 0, label: null };
}

// MATH-03 / LEAK-01 FIX: Expose cache invalidation for session/contest changes.


// ==================== FUNÇÃO PRINCIPAL ====================

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const logger = options.logger;
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


    const rawMaxScore = Number(options.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;
    const rawMinScore = Number(options.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;
    const rawTargetScore = Number(options.targetScore ?? (maxScore * 0.8));
    const fallbackTarget = maxScore * 0.8;
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));
    const parsedWeight = Number(safeCategory.weight);
    const rawWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 5;
    const boundedWeight = Math.min(10, Math.max(1, rawWeight));
    // MATH-WEIGHT-ASYMMETRY FIX: era rawWeight * 10, cujo teto (rawWeight=10 → weight=100 → deviation=0)
    // nunca produzia multiplier > 1.0 — nem a matéria mais importante recebia bônus de recência.
    // Com * 20: rawWeight=5 (médio) = ponto neutro (mult=1.0), rawWeight=10 = mult=1.5, rawWeight=1 = mult=0.6.
    const weight = boundedWeight * 20;
    const weightLabel = boundedWeight <= 3 ? '1 — Baixa' : boundedWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        try {
            const examDate = normalizeDate(options.user.goalDate);
            // FIX: Proteger contra datas inválidas na string
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(new Date());
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", options.user.goalDate);
        }
    }

    try {
        // 1. Weighted Average Score
        const catNormalized = normalize(safeCategory?.name || "Sem Nome");
        const relevantSimulados = (simulados || []).filter(s => s && normalize(s.subject || "") === catNormalized);
        relevantSimulados.sort((a, b) => normalizeDate(b.date || b.createdAt).getTime() - normalizeDate(a.date || a.createdAt).getTime());
        const simuladosWithMaxScore = relevantSimulados;

        let averageScore = 0;
        if (relevantSimulados.length > 0) {
            const coachAdaptive = deriveCoachAdaptiveParams(simuladosToHistory(relevantSimulados, maxScore), maxScore, cfg);
            const today = normalizeDate(new Date());
            const K = coachAdaptive.decayK;
            const PESO_MIN = coachAdaptive.minWeight;
            const DELTA = coachAdaptive.scoreClampDelta;

            const calculateExponentialScore = (dataset) => {
                let weightedSum = 0;
                let totalWeight = 0;
                dataset.forEach(s => {
                    const sScore = getSafeScore(s, maxScore);
                    const simDate = normalizeDate(s.date || s.createdAt);
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

            // CORREÇÃO LÓGICA: Removido 'normalizeDate(new Date())' para prevenir o 
            // "Bug da Meia-Noite" e ignorar lotes importados subitamente.
            // Consideramos "sessão anterior" qualquer nota gerada pelo menos 1 hora antes do teste mais recente.
            const mostRecentSimDate = relevantSimulados.length > 0 
                ? new Date(relevantSimulados[0].date || relevantSimulados[0].createdAt).getTime() 
                : Date.now();
            const SESSION_GAP_MS = 60 * 60 * 1000; // 1 Hora

            const pastSimulados = relevantSimulados.filter(s => {
                const sTime = new Date(s.date || s.createdAt).getTime();
                return sTime < (mostRecentSimDate - SESSION_GAP_MS);
            });
            
            const notaBruta = calculateExponentialScore(relevantSimulados);

            if (pastSimulados.length > 0) {
                const notaAnterior = calculateExponentialScore(pastSimulados);
                const diff = notaBruta - notaAnterior;
                let clampedDiff = diff;
                if (diff > DELTA) clampedDiff = DELTA;
                else if (diff < -DELTA) clampedDiff = -DELTA;
                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            // BUG-19 FIX: Fallback deve respeitar a escala da prova (50% do maxScore)
            averageScore = maxScore / 2;
        }

        // 2. Days Since Last Study
        let daysSinceLastStudy = 0;
        let recencyUnknown = true;
        let lastDate = normalizeDate(new Date(0));

        if (simuladosWithMaxScore.length > 0) {
            const simDate = normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt);
            if (simDate > lastDate) lastDate = simDate;
        }

        const categoryStudyLogs = (studyLogs || []).filter(log =>
            log?.categoryId === categoryId &&
            normalizeDate(log.date).getTime() > 0
        );
        if (categoryStudyLogs.length > 0) {
            const sortedLogs = [...categoryStudyLogs].sort((a, b) => normalizeDate(b.date).getTime() - normalizeDate(a.date).getTime());
            const logDate = normalizeDate(sortedLogs[0].date);
            if (logDate > lastDate) lastDate = logDate;
        }

        if (lastDate.getTime() > 0) {
            const today = normalizeDate(new Date());
            daysSinceLastStudy = getDaysDiff(today, lastDate);
            recencyUnknown = false;
        }

        // 3. Trend (Garantir 10 mais recentes para cálculo de tendência)
        const trendHistory = [...simuladosWithMaxScore]
            .sort((a, b) => normalizeDate(b.date || b.createdAt).getTime() - normalizeDate(a.date || a.createdAt).getTime())
            .slice(0, 10)
            .map(s => ({
                score: getSafeScore(s, maxScore),
                date: s.date || s.createdAt
            })).reverse();
        const lastNScores = trendHistory.map(t => t.score);
        const backtestWeights = deriveBacktestWeights(lastNScores, maxScore);
        // CORREÇÃO (Fix Matemático Final - Invariância de Escala):

        // Garantir que a derivada (slope) e a variância (MSSD) operam no mesmo espaço vetorial 
        // absoluto (maxScore) que a média e os percentis.
        const rawTrend = calculateSlope(trendHistory, maxScore) * 30;
        const limiteSuperior = maxScore - averageScore;
        const limiteInferior = -averageScore;
        const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

        // ─────────────────────────────────────────────────────────
        // MC-03: MSSD Volatility — BUG-MATH-01 FIX: usa calculateMSSD real
        // Não castiga crescimento legítimo (50→60→70).
        // ─────────────────────────────────────────────────────────
        const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, 10), maxScore);
        const mssdVolatility = mcHistory.length >= 3
            ? calculateMSSD(mcHistory, maxScore)
            : (lastNScores.length >= 2
                ? standardDeviation(lastNScores, maxScore)
                : (lastNScores.length === 1 ? maxScore * 0.05 : maxScore * 0.1)); // scale-aware fallback uncertainty

        // ─────────────────────────────────────────────────────────
        // MC-04: Monte Carlo leve — probabilidade real de bater a meta
        // ─────────────────────────────────────────────────────────
        const mcAdaptive = {
            ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
            calibrationBaseline: rollingCalibration.baseline,
            calibrationMaxPenalty: rollingCalibration.maxPenalty
        };
        const adaptiveSimCount = lastNScores.length <= 5 ? Math.max(cfg.MC_SIMULATIONS, 1200) : cfg.MC_SIMULATIONS;

        // Lógica de Meta Proximal Dinâmica (ZDP)
        const DISTANCE_THRESHOLD = 0.15 * maxScore; // Se a meta está a mais de 15% de distância
        let effectiveMCTarget = targetScore;

        if (targetScore - averageScore > DISTANCE_THRESHOLD) {
            // O alvo passa a ser a média atual + 1 salto equivalente à volatilidade da pessoa + margem empírica (2%)
            effectiveMCTarget = averageScore + Math.max(mssdVolatility, maxScore * 0.05) + (maxScore * 0.02);
            // Garantia para nunca ultrapassar a meta final
            effectiveMCTarget = Math.min(effectiveMCTarget, targetScore); 
        }

        // 🎯 ADAPT-NEUTRAL: O "Neutro" do aluno é a média global dele em todas as matérias combinadas.
        let globalBaselinePct = 50;
        const allSimsForBaseline = (options.allCategories || []).flatMap(c => {
            const catNorm = normalize(c.name || "");
            return (simulados || []).filter(s => normalize(s.subject) === catNorm);
        });
        if (allSimsForBaseline.length > 0) {
            const totalPoints = allSimsForBaseline.reduce((acc, s) => acc + getSafeScore(s, maxScore), 0);
            globalBaselinePct = (totalPoints / (allSimsForBaseline.length * maxScore)) * 100;
        }

        const effectiveCfg = { 
            ...cfg, 
            MC_SIMULATIONS: adaptiveSimCount,
            MC_CALIBRATION_NEUTRAL_PCT: globalBaselinePct 
        };

        // Passamos o 'effectiveMCTarget' como alvo do motor estocástico
        const mcResult = runCoachMonteCarlo(
            simuladosWithMaxScore, 
            effectiveMCTarget, // <-- Novo Alvo Dinâmico
            effectiveCfg, 
            categoryId, 
            maxScore, 
            mcAdaptive
        );
        const mcProbability = mcResult ? mcResult.probability : null;
        const mcHasData = mcResult !== null;

        if (mcHasData && typeof options.onCalibrationMetric === 'function') {
            options.onCalibrationMetric({
                categoryId,
                categoryName: safeCategory?.name,
                avgBrier: Number((mcResult.avgBrier || 0).toFixed(4)),
                ece: Number((mcResult.ece || 0).toFixed(4)),
                reliability: Array.isArray(mcResult.reliability) ? mcResult.reliability : [],
                calibrationPenalty: Number((mcResult.calibrationPenalty || 0).toFixed(4)),
                probability: Number((mcResult.probability || 0).toFixed(2)),
                timestamp: Date.now()
            });
        }

        // --- COMPONENTS ---
        
        // 🎯 1. Diagnóstico do "Perfil de Dor" (Pain Profile) do aluno
        const forgetting = computeForgettingRisk(simuladosWithMaxScore, maxScore);
        const performanceDeficit = Math.max(0, targetScore - averageScore); // Falta de Conhecimento
        const memoryRisk = forgetting.risk === 'critical' ? 40 : (forgetting.risk === 'high' ? 20 : 5); // Risco de Esquecimento
        const volatilityRisk = mssdVolatility; // Instabilidade Estatística

        const totalPain = performanceDeficit + memoryRisk + volatilityRisk || 1; // Evita div/0

        // 🎯 2. Alocação Dinâmica de Pesos (O Total Base é sempre 110, mas a distribuição muda)
        const dynamicScoreMax = Math.max(20, (performanceDeficit / totalPain) * 110);
        const dynamicRecencyMax = Math.max(15, (memoryRisk / totalPain) * 110);
        const dynamicInstabilityMax = Math.max(10, (volatilityRisk / totalPain) * 110);

        // A. Performance Score
        // BUG-19 FIX: Garantir invariância de escala através da normalização para base 100
        const normalizedAvg = (averageScore / maxScore) * 100;
        const scoreComponent = Math.min(dynamicScoreMax, (100 - normalizedAvg) * (dynamicScoreMax / 100)) * backtestWeights.scoreWeight;

        // B. Recency
        const weightDeviation = (weight / 100) - 1;
        const dampenedWeightMultiplier = 1 + (weightDeviation * 0.5);
        const effectiveRiskDays = daysSinceLastStudy * dampenedWeightMultiplier;
        
        // Encontre a data do simulado ou estudo mais antigo (a raiz da jornada)
        const firstActivityDate = (relevantSimulados.length > 0) 
            ? normalizeDate(relevantSimulados[relevantSimulados.length - 1].date || relevantSimulados[relevantSimulados.length - 1].createdAt) 
            : normalizeDate(new Date());

        const crunchMultiplier = getCrunchMultiplier(daysToExam, firstActivityDate);
        const recencyComponent = dynamicRecencyMax * (1 - Math.exp(-effectiveRiskDays / 7)) * crunchMultiplier * backtestWeights.recencyWeight;

        // ─────────────────────────────────────────────────────────
        let instabilityComponent = mssdVolatility * (dynamicInstabilityMax / cfg.INSTABILITY_MSSD_DIVISOR) * (100 / maxScore);
        const trendThreshold = getDynamicTrendThreshold(averageScore, maxScore);

        if (trend > trendThreshold) {
            instabilityComponent *= 0.5;
        } else if (trend < -trendThreshold) {
            instabilityComponent *= 1.3;
        }
        instabilityComponent = Math.min(cfg.INSTABILITY_MAX, instabilityComponent * backtestWeights.instabilityWeight);


        // ─────────────────────────────────────────────────────────
        // MC-05: Probability Urgency Boost
        // ─────────────────────────────────────────────────────────
        let mcUrgencyBoost = 0;
        let mcRiskLabel = null;
        const adaptiveRisk = deriveAdaptiveRiskThresholds(lastNScores, mssdVolatility, cfg, maxScore);

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
        }


        const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;

        // D. Priority Boost
        const hasHighPriorityTasks = safeCategory.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        // D2. Execution Efficiency Bridge (Meu Painel -> Coach/Monte Carlo)
        const allTasks = Array.isArray(safeCategory.tasks) ? safeCategory.tasks : [];
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t?.completed).length;
        const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0.5;
        const inefficiency = Math.max(0, 1 - completionRate);
        
        let empiricalTrust = 1.0;
        if (!hasData) {
            // Avalia o histórico global de disciplina do utilizador
            const globalSignal = computeAdaptiveCoachWeight(lastNScores); 
            // Garante um piso de 20% e um teto de 100% consoante a estabilidade real do aluno
            empiricalTrust = Math.max(0.2, globalSignal.confidenceWeight);
        }

        const efficiencyBridgeBoost = cfg.EFFICIENCY_MAX * inefficiency * empiricalTrust;

        // E. Burnout detection
        const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const totalHours = totalMinutes / 60;

        // 1. Descobrir a capacidade semanal base do aluno (ignorar semanas fantasma)
        const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
        
        // CORREÇÃO LÓGICA: Em vez de usar um divisor estático de tempo civil (Date.now - start),
        // contamos apenas as semanas onde efetivamente houve registo de estudo.
        // Assim, meses de abandono não destroem o baseline do utilizador.
        const activeWeeksSet = new Set();
        categoryStudyLogs.forEach(log => {
            const logTime = normalizeDate(log.date).getTime();
            const weekNumber = Math.floor(logTime / MS_PER_WEEK);
            activeWeeksSet.add(weekNumber);
        });
        
        const trueActiveWeeks = Math.max(1, activeWeeksSet.size);
        const baselineHoursPerWeek = (totalHours / trueActiveWeeks);

        // 2. Definir o limiar dinâmico: Burnout acontece se ele exceder 1.8x o que está acostumado
        const dynamicBurnoutThreshold = Math.max(3.0, baselineHoursPerWeek * 1.8);

        // E2. Balance Bridge (equilíbrio entre matérias do Meu Painel -> Coach)
        const activeCategories = (options.allCategories || []).filter(c => (c?.tasks || []).length > 0);
        const activeCount = activeCategories.length > 0 ? activeCategories.length : 1;
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        
        const currentLambda = mcAdaptive?.decayK || 0.03; 
        const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));

        const windowStart = normalizeDate(new Date()).getTime() - (dynamicWindowDays * MS_PER_DAY);
        const recentAllLogs = (studyLogs || []).filter(log => normalizeDate(log?.date).getTime() >= windowStart);
        const totalRecentMinutesAll = recentAllLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const totalRecentMinutesCat = recentAllLogs
            .filter(log => log?.categoryId === categoryId)
            .reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const observedShare = totalRecentMinutesAll > 0 ? totalRecentMinutesCat / totalRecentMinutesAll : (1 / activeCount);
        const totalActiveWeight = activeCategories.reduce((acc, c) => {
            const parsedW = Number(c.weight);
            const w = (c.weight !== undefined && Number.isFinite(parsedW) && parsedW > 0) ? parsedW : 5;
            return acc + w;
        }, 0);
        const idealShare = totalActiveWeight > 0 ? rawWeight / totalActiveWeight : (1 / activeCount);
        const underAllocation = Math.max(0, idealShare - observedShare);
        const balanceBridgeBoost = Math.min(cfg.EFFICIENCY_MAX, underAllocation * cfg.EFFICIENCY_MAX * 2.0);

        // F. SRS Boost
        let srsBoost = 0;
        let srsLabel = null;

        if (hasData && !recencyUnknown) {
            const srsResult = getSRSBoost(simuladosWithMaxScore, daysSinceLastStudy, maxScore, cfg);
            srsBoost = srsResult.boost;
            srsLabel = srsResult.label;
        }

        // G. Rotation Penalty (Dinâmico)
        let rotationPenalty = 0;
        if (daysSinceLastStudy < 1) {
            const normalizedVolatility = mssdVolatility / maxScore; 
            const dynamicPenalty = Math.min(25, (averageScore / maxScore) * 15 * (1 + (normalizedVolatility * 2)));
            
            // CORREÇÃO MATH: Substituir o degrau (if-else abrupto) por uma transição 
            // linear/logística suave. Penalidade começa a escalar a partir dos 40%.
            const rawRatio = averageScore / maxScore;
            const smoothingFactor = Math.max(0, Math.min(1, (rawRatio - 0.4) * 2.5)); // 0 a 1
            
            rotationPenalty = dynamicPenalty * smoothingFactor;

        } else if (daysSinceLastStudy === 1 && !srsLabel) {
            rotationPenalty = mssdVolatility > (maxScore * 0.05) ? 8 : 2; 
        }
        if (srsBoost > 0) rotationPenalty *= 0.1;

        // --- RAW MAX ---
        const effectiveRecencyMax = cfg.RECENCY_MAX * crunchMultiplier;
        const RAW_MAX_BASE = cfg.SCORE_MAX + effectiveRecencyMax + cfg.INSTABILITY_MAX;

        const maxSrsBoost = cfg.SRS_BOOST * 2.0;
        const RAW_MAX_ACTUAL = cfg.SCORE_MAX
            + (effectiveRecencyMax * 0.8) 
            + cfg.INSTABILITY_MAX
            + (cfg.PRIORITY_BOOST + maxSrsBoost) * (1 + (crunchMultiplier - 1) * 0.5)
            + (cfg.MC_BOOST_DANGER_BASE + cfg.MC_BOOST_DANGER_RANGE) 
            + cfg.EFFICIENCY_MAX 
            + (cfg.EFFICIENCY_MAX * 2.0);

        const currentPriorityBoost = priorityBoost * crunchMultiplier;
        const currentSrsBoost = srsBoost * crunchMultiplier;
        const rawScore = (scoreComponent + recencyComponent + instabilityComponent + currentPriorityBoost + currentSrsBoost + mcUrgencyBoost + efficiencyBridgeBoost + balanceBridgeBoost) - rotationPenalty;

        const weightedRaw = rawScore;
        const normalized = Math.max(0, Math.min(100, Math.round((weightedRaw / RAW_MAX_ACTUAL) * 100)));

        // --- RECOMMENDATION ---
        let recommendation = "";
        const oneWeekAgo = normalizeDate(new Date()).getTime() - (7 * 24 * 60 * 60 * 1000);
        const recentLogs = categoryStudyLogs.filter(log => {
            const d = normalizeDate(log.date);
            return d && d.getTime() >= oneWeekAgo;
        });
        const recentHours = recentLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0) / 60;
        const recentStudyDays = new Set(recentLogs.map(log => normalizeDate(log.date).getTime())).size;
        
        const isHighVolume = recentHours > dynamicBurnoutThreshold;
        const isHighFrequency = recentStudyDays >= 5;
        const isStagnant = trend <= trendThreshold;

        const burnoutMsg = isHighVolume && isStagnant 
            ? `Você estudou ${recentHours.toFixed(1)}h esta semana (seu normal é ~${baselineHoursPerWeek.toFixed(1)}h), mas a nota estagnou.` 
            : '';

        const isBurnoutRisk = (isHighVolume || isHighFrequency) && isStagnant && recentStudyDays >= 3;

        if (mcHasData && mcRiskLabel === 'critical') {
            const burnoutNote = isBurnoutRisk ? ` (⚠️ ${burnoutMsg || 'Sinais de estafa — mude o método.'})` : '';
            const targetInfo = effectiveMCTarget < targetScore ? ` (Meta ZDP: ${formatValue(effectiveMCTarget)})` : '';
            recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${targetInfo}${burnoutNote}`;
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

        const result = {
            score: weightedRaw,
            normalizedScore: normalized,
            recommendation,
            details: {
                averageScore: Number(averageScore.toFixed(2)),
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
                    rankQuality: Number(backtestWeights.rankQuality.toFixed(4)),
                    uplift: Number(backtestWeights.uplift.toFixed(4)),
                    scoreWeight: Number(backtestWeights.scoreWeight.toFixed(3)),
                    recencyWeight: Number(backtestWeights.recencyWeight.toFixed(3)),
                    instabilityWeight: Number(backtestWeights.instabilityWeight.toFixed(3))
                },
                humanReadable: {
                    "Média": formatPercent((averageScore / maxScore) * 100),
                    "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                    "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                    "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                    "Probabilidade (MC)": mcHasData ? formatPercent(mcProbability) : "Dados insuf.",
                    "Peso da Matéria": weightLabel,
                    "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
                },
                components: {
                    scoreComponent: Number(scoreComponent.toFixed(2)),
                    recencyComponent: Number(recencyComponent.toFixed(2)),
                    instabilityComponent: Number(instabilityComponent.toFixed(2)),
                    priorityBoost: Number(priorityBoost.toFixed(2)),
                    srsBoost: Number(srsBoost.toFixed(2)),
                    rotationPenalty: Number(rotationPenalty.toFixed(2)),
                    mcUrgencyBoost: Number(mcUrgencyBoost.toFixed(2)),
                    efficiencyBridgeBoost: Number(efficiencyBridgeBoost.toFixed(2)),
                    balanceBridgeBoost: Number(balanceBridgeBoost.toFixed(2)),
                }
            }
        };

        if (typeof logger === 'function') {
            try { logger({ categoryId, name: safeCategory?.name, urgency: result }); } catch { /* ignore */ }
        }

        return result;
    } catch (err) {
        console.error("[CoachLogic] Critical error in calculateUrgency:", err);
        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo: " + err.message,
            details: { hasData: false, daysSinceLastStudy: 0, error: err.message, stack: err.stack, humanReadable: { "Status": "Erro" } }
        };
    }
};

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || categories.length === 0) return null;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    const top = ranked[0];
    if (!top) return null;

    const maxScore = options.maxScore ?? 100;
    return {
        ...top,
        weakestTopic: getWeakestTopic(top, simulados, maxScore)
    };
};

const _topicsCache = new Map();

function _getTopicsHash(simulados = [], maxScore = 100) {
    if (!simulados || simulados.length === 0) return `0-${maxScore}`;
    const sample = simulados.slice(-5).map(s => `${s.id || s.createdAt}-${s.correct}/${s.total}`).join('|');
    return `${simulados.length}-${maxScore}-${sample}`;
}

function _buildSortedTopics(category, simulados = [], maxScore = 100) {
    const catId = category.id || category.name;
    const hash = _getTopicsHash(simulados, maxScore);
    const cacheKey = `${catId}-${hash}`;

    if (_topicsCache.has(cacheKey)) return _topicsCache.get(cacheKey);

    const result = _buildSortedTopicsImpl(category, simulados, maxScore);
    
    if (_topicsCache.size > 200) {
        const firstKey = _topicsCache.keys().next().value;
        _topicsCache.delete(firstKey);
    }
    
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

    history.forEach(entry => {
        if (!entry) return;
        const entryDate = new Date(entry.date || entry.createdAt || 0);
        
        const daysOld = Math.max(0, (todayForTopics.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        const timeWeight = Math.max(0.01, Math.exp(-0.015 * daysOld));

        const topics = entry.topics || [];
        topics.forEach(t => {
            if (!t) return;
            let rawName = t.name;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";
            const name = rawName.trim();
            if (!topicMap[name]) {
                topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: false, scores: [] };
            }
            let topicTotal = parseInt(t.total, 10) || 0;
            let topicCorrect = Math.min(topicTotal, parseInt(t.correct, 10) || 0);

            const isTotalMissing = t.total === undefined || t.total === null || String(t.total).trim() === "";
            if (t.score != null && isTotalMissing) {
                topicTotal = getSyntheticTotal(maxScore);
                topicCorrect = Math.round((getSafeScore(t, maxScore) / maxScore) * topicTotal);
            } else if (topicTotal === 0) {
                return;
            }

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
            topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: !!task.completed, scores: [] };
            topicMap[name].hasUnfinishedTask = !task.completed;
        } else {
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
            daysSince = 60;
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
            completed: data.completed
        };
    });

    topics.sort((a, b) => {
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
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
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    const topCategories = ranked.slice(0, 10);

    const performDeepCheck = (category) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTime = thirtyDaysAgo.getTime();

        const recentLogs = studyLogs.filter(l => l.categoryId === category.id && new Date(l.date || 0).getTime() >= cutoffTime);
        const catNormalized = normalize(category.name);
        const recentSims = simulados.filter(s => normalize(s.subject) === catNormalized && new Date(s.date || s.createdAt || 0).getTime() >= cutoffTime);

        const totalHours = recentLogs.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => {
            const sTotal = Number(s.total) || 0;
            if (sTotal === 0 && s.score != null) {
                return acc + (maxScore > 0 ? Math.min(maxScore, 80) : 80);
            }
            return acc + sTotal;
        }, 0);

        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Nos últimos 30 dias você estudou ${totalHours.toFixed(2)}h de ${category.name} mas fez poucas questões (${questionsPerHour.toFixed(2)}/h). Meta para seu nível: >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };


    let allGeneratedTasks = [];

    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);

    const safeUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    topCategories.forEach((cat) => {
        const weakTopics = getWeakestTopicsList(cat, simulados, maxScore, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;

        const iterations = tasksPerCategory;

        for (let i = 0; i < iterations; i++) {
            const weakTopic = weakTopics[i] || null;
            const priorityLabel = allGeneratedTasks.length < 3 ? '[PROTOCOLO PRIORITÁRIO] ' : '';
            const topicLabel = weakTopic ? `${priorityLabel}[${weakTopic.name}] ` : `${priorityLabel}[OTIMIZAÇÃO DE BASE] `;

            const uniqueIdSuffix = weakTopic ? (weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '') + weakTopic.total) : `geral-${i}`;

            const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
            const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;

            if (mc && mc.probabilityRaw < adaptiveDanger && i === 0) {
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-danger-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance. Medidas drásticas necessárias.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Zona de Perigo",
                        details: `Apenas ${probPct}% de chance de bater a meta de ${targetScore}% em 90 dias. Projeção: ${mc.meanProjected}% (IC95: ${mc.ci95Low}–${mc.ci95High}%).`,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: `Probabilidade crítica detectada (${cfg.MC_SIMULATIONS} simulações). Abandone estudos passivos e mude de método imediatamente.`
                    }
                });
            } else if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && mc.probabilityRaw < cfg.MC_PROB_SAFE && i === 0) {
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-chaos-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado. Consolide o núcleo antes de avançar.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Caos Estatístico",
                        details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)} (limiar: ${(cfg.MC_VOLATILITY_HIGH * (maxScore / 100)).toFixed(2)}). Probabilidade atual: ${probPct}%.`,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível. Reduza as oscilações."
                    }
                });
            } else if (mc && mc.probabilityRaw >= adaptiveSafe && i === 0) {
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-safe-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🏆 CRUZEIRO SEGURO: Estabilidade operacional em ${probPct}%. Mantenha o fluxo de manutenção.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Cruzeiro Seguro",
                        details: `${probPct}% de probabilidade de atingir ${targetScore}% em 90 dias. Projeção: ${mc.meanProjected}% (IC95: ${mc.ci95Low}–${mc.ci95High}%).`,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Mantenha o ritmo atual. Manutenção leve é suficiente para proteger essa posição."
                    }
                });
            } else if (cat.urgency?.details?.srsLabel && i === 0) {
                allGeneratedTasks.push({
                    id: `${cat.id}-srs-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🧠 ${cat.urgency.details.srsLabel}. Revise para não esquecer!`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Revisão Espaçada (SRS) Ativada",
                        label: cat.urgency.details.srsLabel,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                    }
                });
            } else if (performDeepCheck(cat).isTrap && i === 0) {
                allGeneratedTasks.push({
                    id: `${cat.id}-trap-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}⚠️ ANOMALIA DE MÉTODO: Teoria excedente. Foco TOTAL em processamento de questões.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Detector de Pseudo-Estudo",
                        details: "Alta carga horária com baixíssimo volume de exercícios.",
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                    }
                });
            } else if (weakTopic && (weakTopic.percentage < 70 || weakTopic.isUntested || weakTopic.priorityBoost > 0)) {
                let taskTitle = "";
                let reasonStr = "";
                if (weakTopic.isUntested) {
                    taskTitle = `🚨 (Novo). Comece agora!`;
                    reasonStr = "Tópico Novo / Não Testado";
                } else if (weakTopic.manualPriority > 0) {
                    taskTitle = `🚨 (Prioridade). Nota: ${Math.round(weakTopic.percentage)}%`;
                    reasonStr = "Alta Prioridade Manual";
                } else {
                    taskTitle = `🚨 (${Math.round(weakTopic.percentage)}% de acerto). Revise agora!`;
                    reasonStr = "Baixa Performance";
                }
                allGeneratedTasks.push({
                    id: `${cat.id}-weaktopic-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}${taskTitle}`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: `Tópico Selecionado: ${weakTopic.name}`,
                        details: reasonStr,
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        categoryDetails: {
                            "Urgência Total": Math.round(cat.urgency.score),
                            ...cat.urgency.details.components
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
                allGeneratedTasks.push({
                    id: `${cat.id}-general-review-${uniqueIdSuffix}-${safeUUID}-it${i}`,
                    text: `${cat.name}: ${topicLabel}Revisão Geral Complementar (Volume ${i + 1})`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Revisão Geral Complementar",
                        metrics: cat.urgency.details.humanReadable,
                        monteCarlo: mc,
                        categoryDetails: {
                            "Total Urgency": Math.round(cat.urgency.score),
                            ...cat.urgency.details.components
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

    let focusMinutes = stats.consecutiveMinutes || 0;
    let hadBreaks = false;

    if (focusMinutes === 0 && (stats.pomodorosCompleted || 0) > 0) {
        focusMinutes = stats.pomodorosCompleted * (stats.settings?.pomodoroWork || 25);
        hadBreaks = true;
    }

    const userLevel = stats.user?.level || 1;
    const levelMultiplier = 1 + (userLevel * 0.05);
    
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
            const parsedTime = new Date(studiedAt).getTime();
            
            if (studiedAt && !isNaN(parsedTime)) {
                const days = Math.max(0, (Date.now() - parsedTime) / (1000 * 60 * 60 * 24));
                const urgenciaPorEsquecimento = 40 * (1 - Math.exp(-0.05 * days));
                score += urgenciaPorEsquecimento;
            } else {
                // FIX BUG 5: Matéria inédita/não estudada é prioridade estrutural (falta de base).
                // 45 pontos garante que passe na frente de matérias velhas.
                score += 45; 
            }

            // Fator 3: Taxa de Erro
            // MATH-ERRORRATE-SCALE FIX: errorRate pode estar em 0-1 ou 0-100 dependendo da fonte.
            // Normalizar para 0-1 antes de usar para evitar que um campo de 0-100 produza score+=3200.
            if (task.errorRate) {
                const normalizedErrorRate = task.errorRate > 1 ? task.errorRate / 100 : task.errorRate;
                score += normalizedErrorRate * 40; // 0-40 pts (equivalente a: (rate*100)*0.4)
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
