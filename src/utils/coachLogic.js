// ==================== CONSTANTES ====================
import { standardDeviation } from '../engine/stats.js';
import { calculateVolatility, monteCarloSimulation, calculateSlope } from '../engine/projection.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
import { normalize } from './normalization.js';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral, computeRollingCalibrationParams } from './calibration.js';

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
    MC_MIN_DATA_POINTS: 5,
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    INSTABILITY_MSSD_DIVISOR: 10,
    MC_BACKTEST_HORIZON: 3,
    MC_CALIBRATION_BRIER_BASELINE: 0.18,
    MC_CALIBRATION_MAX_PENALTY: 0.25,
    MC_CALIBRATION_NEUTRAL_PCT: 50,
    MC_CALIBRATION_MAX_APPLIED_PENALTY: 0.5,
    MC_ENABLE_ADAPTIVE_CALIBRATION: true,

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

function getSRSBoost(daysSince, cfg) {
    if (daysSince >= 30) return { boost: cfg.SRS_BOOST * 2.0, label: "Revisão Crítica (30+ dias)" };
    if (daysSince >= 7) return { boost: cfg.SRS_BOOST * 1.4, label: `Revisão de 7 dias${daysSince > 10 ? ' [ATRASADA]' : ''}` };
    if (daysSince >= 3) return { boost: cfg.SRS_BOOST * 1.0, label: `Revisão de 3 dias${daysSince > 4 ? ' [ATRASADA]' : ''}` };
    if (daysSince >= 1) return { boost: cfg.SRS_BOOST * 0.7, label: `Revisão de 24h${daysSince > 1 ? ' [ATRASADA]' : ''}` };
    return { boost: 0, label: null };
}

function getCrunchMultiplier(daysToExam) {
    if (daysToExam === undefined || daysToExam === null || daysToExam > 60) return 1.0;
    if (daysToExam < 0) return 1.0;
    if (daysToExam <= 3) return 2.5;
    if (daysToExam <= 7) return 2.0;
    if (daysToExam <= 14) return 1.5;
    if (daysToExam <= 30) return 1.2;
    return 1.0;
}

/**
 * MC-01: Mapper simulados → history para monteCarloSimulation
 */
function simuladosToHistory(simulados, maxScore = 100) {
    return simulados
        .filter(s => s.total > 0 || s.score != null)
        .map(s => ({
            // FIX: Utilizar o helper seguro para prevenir que notas como 85% virem 170%
            score: getSafeScore(s, maxScore),
            date: s.date
        }));
}

const mcCache = new Map();
const MC_CACHE_MAX = 50; // BUG-21 FIX: Limitar cache para evitar memory leak

export function deriveCoachAdaptiveParams(history = [], maxScore = 100, cfg = DEFAULT_CONFIG) {
    const n = history.length;
    if (n === 0) {
        return { decayK: 0.07, minWeight: 0.03, scoreClampDelta: maxScore * 0.3, mcSimulations: cfg.MC_SIMULATIONS };
    }

    const scores = history.map(h => Number(h.score) || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? scores.reduce((acc, s) => acc + ((s - mean) ** 2), 0) / (n - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const cv = mean > 0 ? Math.min(2, sd / mean) : 1;

    const coverageFactor = Math.max(0.8, Math.min(1.3, Math.sqrt(10 / Math.max(2, n))));
    const decayK = Math.max(0.03, Math.min(0.12, 0.07 * coverageFactor));
    const minWeight = Math.max(0.01, Math.min(0.08, 0.015 + (cv * 0.02)));
    const scoreClampDelta = Math.max(maxScore * 0.12, Math.min(maxScore * 0.45, (0.2 + cv * 0.15) * maxScore));
    const mcSimulations = Math.round(Math.max(400, Math.min(2500, cfg.MC_SIMULATIONS * (0.8 + cv * 0.7) * coverageFactor)));

    return { decayK, minWeight, scoreClampDelta, mcSimulations };
}

/**
 * MC-02: Monte Carlo leve (800 sims) para uso no Coach.
 * Retorna null se dados insuficientes para evitar falsos positivos.
 */
export function runCoachMonteCarlo(relevantSimulados, targetScore, cfg, categoryId, maxScore = 100, adaptive = null) {
    const history = simuladosToHistory(relevantSimulados, maxScore);
    if (history.length < cfg.MC_MIN_DATA_POINTS) return null;

    const sumCorrect = relevantSimulados.reduce((a, s) => a + getSafeScore(s, maxScore), 0);
    // FIX-HASH: adicionar lastScore evita colisão quando soma é igual mas distribuição difere
    const lastScore = history.length > 0 ? Number(history[history.length - 1].score).toFixed(2) : '0';
    const hash = `${categoryId}-${maxScore}-${history.length}-${Number(sumCorrect).toFixed(2)}-${targetScore}-${lastScore}-${relevantSimulados[0]?.date || ''}`;
    if (mcCache.has(hash)) return mcCache.get(hash);

    try {
        const result = monteCarloSimulation(
            history,
            targetScore,
            90,
            adaptive?.mcSimulations || cfg.MC_SIMULATIONS,
            { maxScore }
        );

        const enableAdaptiveCalibration = cfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false;

        // Backtest leve de calibração (walk-forward curto) para reduzir overconfidence.
        let calibrationPenalty = 0;
        let avgBrier = 0;
        if (enableAdaptiveCalibration && history.length >= 8) {
            const horizon = Math.min(cfg.MC_BACKTEST_HORIZON || 3, history.length - cfg.MC_MIN_DATA_POINTS);
            const brierScores = [];
            for (let i = 1; i <= horizon; i++) {
                const train = history.slice(0, history.length - i);
                const observed = history[history.length - i].score >= targetScore ? 1 : 0;
                try {
                    const bt = monteCarloSimulation(
                        train,
                        targetScore,
                        30,
                        Math.min(500, Math.max(200, Math.floor((adaptive?.mcSimulations || cfg.MC_SIMULATIONS) * 0.35))),
                        { maxScore }
                    );
                    const p = Math.max(0, Math.min(1, (bt.probability || 0) / 100));
                    brierScores.push(computeBrierScore(p, observed));
                } catch {
                    // ignora ponto de backtest inválido
                }
            }
            if (brierScores.length > 0) {
                const summary = summarizeCalibration(brierScores, {
                    baseline: adaptive?.calibrationBaseline ?? cfg.MC_CALIBRATION_BRIER_BASELINE,
                    maxPenalty: adaptive?.calibrationMaxPenalty ?? cfg.MC_CALIBRATION_MAX_PENALTY
                });
                calibrationPenalty = summary.calibrationPenalty;
                avgBrier = summary.avgBrier;
            }
        }

        const rawProb = Math.max(0, Math.min(100, Number(result.probability) || 0));
        const probability = enableAdaptiveCalibration
            ? shrinkProbabilityToNeutral(
                rawProb,
                calibrationPenalty,
                cfg.MC_CALIBRATION_NEUTRAL_PCT,
                cfg.MC_CALIBRATION_MAX_APPLIED_PENALTY
            )
            : rawProb;

        const finalResult = {
            probability,
            volatility: (Number(result.volatility) || 0) * (1 + (enableAdaptiveCalibration ? calibrationPenalty * 0.8 : 0)),
            mean: result.mean,
            ci95Low: result.ci95Low,
            ci95High: result.ci95High,
            calibrationPenalty,
            avgBrier
        };
        // BUG-21 FIX: Evict oldest entries when cache exceeds limit
        if (mcCache.size >= MC_CACHE_MAX) {
            const firstKey = mcCache.keys().next().value;
            mcCache.delete(firstKey);
        }
        mcCache.set(hash, finalResult);
        return finalResult;
    } catch (e) {
        if (import.meta.env?.DEV) {
            console.warn('[CoachMC] Simulação falhou:', e.message, { n: history.length });
        }
        return null;
    }
}

// ==================== FUNÇÃO PRINCIPAL ====================

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const logger = options.logger;
    const calibrationHistory = options.calibrationHistoryByCategory?.[category.id] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY
    });

    const maxScore = options.maxScore ?? 100;
    const targetScore = options.targetScore ?? (maxScore * 0.8);
    const rawWeight = (category.weight !== undefined && category.weight > 0) ? category.weight : 5;
    const weight = rawWeight * 10;
    const weightLabel = rawWeight <= 3 ? '1 — Baixa' : rawWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        try {
            const examDate = new Date(options.user.goalDate);
            // FIX: Proteger contra datas inválidas na string
            if (!isNaN(examDate.getTime())) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                daysToExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", options.user.goalDate);
        }
    }

    try {
        // 1. Weighted Average Score
        const catNormalized = normalize(category?.name || "Sem Nome");
        const relevantSimulados = (simulados || []).filter(s => s && normalize(s.subject) === catNormalized);
        relevantSimulados.sort((a, b) => normalizeDate(b.date).getTime() - normalizeDate(a.date).getTime());
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
                    const simDate = normalizeDate(s.date);
                    const days = getDaysDiff(today, simDate);
                    let peso = Math.exp(-K * days);
                    if (peso < PESO_MIN) peso = PESO_MIN;
                    weightedSum += sScore * peso;
                    totalWeight += peso;
                });
                return totalWeight > 0 ? weightedSum / totalWeight : (maxScore / 2);
            };

            const currentBound = normalizeDate(new Date());
            const pastSimulados = relevantSimulados.filter(s => normalizeDate(s.date) < currentBound);
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
        let daysSinceLastStudy = 30;
        let lastDate = normalizeDate(new Date(0));

        // CORREÇÃO: Usar o array com as datas mais recentes primeiro
        if (simuladosWithMaxScore.length > 0) {
            const simDate = normalizeDate(simuladosWithMaxScore[0].date);
            if (simDate > lastDate) lastDate = simDate;
        }

        const categoryStudyLogs = (studyLogs || []).filter(log => log?.categoryId === category.id);
        if (categoryStudyLogs.length > 0) {
            const sortedLogs = [...categoryStudyLogs].sort((a, b) => normalizeDate(b.date).getTime() - normalizeDate(a.date).getTime());
            const logDate = normalizeDate(sortedLogs[0].date);
            if (logDate > lastDate) lastDate = logDate;
        }

        if (lastDate.getTime() > 0) {
            const today = normalizeDate(new Date());
            daysSinceLastStudy = getDaysDiff(today, lastDate);
        }

        // 3. Trend (Garantir 10 mais recentes para cálculo de tendência)
        const trendHistory = [...simuladosWithMaxScore]
            .sort((a, b) => normalizeDate(b.date).getTime() - normalizeDate(a.date).getTime())
            .slice(0, 10)
            .map(s => ({
                score: getSafeScore(s, maxScore),
                date: s.date
            })).reverse();
        const lastNScores = trendHistory.map(t => t.score);
        // CORREÇÃO (Fix Matemático Final - Invariância de Escala):
        // Garantir que a derivada (slope) e a variância (MSSD) operam no mesmo espaço vetorial 
        // absoluto (maxScore) que a média e os percentis.
        const rawTrend = calculateSlope(trendHistory, maxScore) * 30;
        const limiteSuperior = maxScore - averageScore;
        const limiteInferior = -averageScore;
        const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

        // ─────────────────────────────────────────────────────────
        // MC-03: MSSD Volatility — substitui standardDeviation cega
        // Não castiga crescimento legítimo (50→60→70).
        // ─────────────────────────────────────────────────────────
        const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, 10), maxScore);
        const mssdVolatility = mcHistory.length >= 3
            ? calculateVolatility(mcHistory, maxScore)
            : (lastNScores.length >= 2 ? standardDeviation(lastNScores, maxScore) : (lastNScores.length === 1 ? 5 : 10)); // Higher fallback for uncertainty

        // ─────────────────────────────────────────────────────────
        // MC-04: Monte Carlo leve — probabilidade real de bater a meta
        // ─────────────────────────────────────────────────────────
        const mcAdaptive = {
            ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
            calibrationBaseline: rollingCalibration.baseline,
            calibrationMaxPenalty: rollingCalibration.maxPenalty
        };
        const mcResult = runCoachMonteCarlo(simuladosWithMaxScore, targetScore, cfg, category.id, maxScore, mcAdaptive);
        const mcProbability = mcResult ? mcResult.probability : null;
        const mcHasData = mcResult !== null;

        if (mcHasData && typeof options.onCalibrationMetric === 'function') {
            options.onCalibrationMetric({
                categoryId: category.id,
                categoryName: category.name,
                avgBrier: Number((mcResult.avgBrier || 0).toFixed(4)),
                calibrationPenalty: Number((mcResult.calibrationPenalty || 0).toFixed(4)),
                probability: Number((mcResult.probability || 0).toFixed(2)),
                timestamp: Date.now()
            });
        }

        // --- COMPONENTS ---

        // A. Performance Score
        // BUG-19 FIX: Garantir invariância de escala através da normalização para base 100
        const normalizedAvg = (averageScore / maxScore) * 100;
        const scoreComponent = Math.min(cfg.SCORE_MAX, (100 - normalizedAvg) * (cfg.SCORE_MAX / 100));

        // B. Recency
        const weightDeviation = (weight / 100) - 1;
        const dampenedWeightMultiplier = 1 + (weightDeviation * 0.5);
        const effectiveRiskDays = daysSinceLastStudy * dampenedWeightMultiplier;
        const crunchMultiplier = getCrunchMultiplier(daysToExam);
        const recencyComponent = cfg.RECENCY_MAX * (1 - Math.exp(-effectiveRiskDays / 7)) * crunchMultiplier;

        // ─────────────────────────────────────────────────────────
        // C. Instability via MSSD (divisor recalibrado: 5 vs. 15 antes)
        // MSSD típica: 2–8 → output 12–48 antes do cap.
        // stdDev típica era: 8–15 → output 16–30. Escala equivalente.
        // ─────────────────────────────────────────────────────────
        let instabilityComponent = mssdVolatility * (cfg.INSTABILITY_MAX / cfg.INSTABILITY_MSSD_DIVISOR) * (100 / maxScore);
        const trendThreshold = 0.02 * maxScore; // FIX: 2%/mês mínimo para reduzir penalidade de instabilidade (era 0.5%/mês, baixo demais)
        if (trend > trendThreshold) {
            instabilityComponent *= 0.5;
        } else if (trend < -trendThreshold) {
            instabilityComponent *= 1.3;
        }
        instabilityComponent = Math.min(cfg.INSTABILITY_MAX, instabilityComponent);

        // ─────────────────────────────────────────────────────────
        // MC-05: Probability Urgency Boost
        // ─────────────────────────────────────────────────────────
        let mcUrgencyBoost = 0;
        let mcRiskLabel = null;

        if (mcHasData && mcProbability !== null) {
            if (mcProbability < cfg.MC_PROB_DANGER) {
                // Risco crítico: boost cresce linearmente de MC_BOOST_DANGER_BASE (na fronteira)
                // até MC_BOOST_DANGER_BASE + MC_BOOST_DANGER_RANGE (quando prob = 0%)
                const t = 1 - mcProbability / cfg.MC_PROB_DANGER;
                mcUrgencyBoost = cfg.MC_BOOST_DANGER_BASE + cfg.MC_BOOST_DANGER_RANGE * t;
                mcRiskLabel = 'critical';

            } else if (mcProbability < cfg.MC_PROB_SAFE) {
                if (mcProbability < cfg.MC_MODERATE_MIDPOINT) {
                    // Zona moderate: boost desce de MC_BOOST_MODERATE_BASE até 0
                    const t = (mcProbability - cfg.MC_PROB_DANGER) / (cfg.MC_MODERATE_MIDPOINT - cfg.MC_PROB_DANGER);
                    mcUrgencyBoost = cfg.MC_BOOST_MODERATE_BASE * (1 - t);
                    mcRiskLabel = 'moderate';
                } else {
                    // Zona ok (55–89.9%): sem boost, sem penalidade
                    mcUrgencyBoost = 0;
                    mcRiskLabel = 'ok';
                }

            } else { // Cruzeiro seguro (>= 90%)
                // ALERTA 2 FIX: A penalidade de manutenção (-8) só deve ser ativada 
                // se a volatilidade for baixa. Se ele é volátil, não está seguro.
                if (mssdVolatility < (cfg.MC_VOLATILITY_HIGH * 0.7) * (maxScore / 100)) {
                    mcUrgencyBoost = cfg.MC_BOOST_SAFE_PENALTY;
                    mcRiskLabel = 'safe';
                } else {
                    mcUrgencyBoost = 0; // A volatilidade alta cancela a penalidade
                    mcRiskLabel = 'moderate'; 
                }
            }
        }

        // D. Priority Boost
        const hasHighPriorityTasks = category.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        // E. Burnout detection
        const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const totalHours = totalMinutes / 60;

        const oneWeekAgo = normalizeDate(new Date()).getTime() - (7 * 24 * 60 * 60 * 1000);
        const recentLogs = categoryStudyLogs.filter(log => normalizeDate(log.date).getTime() >= oneWeekAgo);
        const recentHours = recentLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0) / 60;
        const recentStudyDays = new Set(recentLogs.map(log => normalizeDate(log.date).getTime())).size;

        // F. SRS Boost
        const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;
        let srsBoost = 0;
        let srsLabel = null;

        if (hasData && (daysToExam === null || daysToExam >= 0)) {
            const srsResult = getSRSBoost(daysSinceLastStudy, cfg);
            srsBoost = srsResult.boost;
            srsLabel = srsResult.label;
        }

        // G. Rotation Penalty
        let rotationPenalty = 0;
        if (daysSinceLastStudy < 1) {
            rotationPenalty = averageScore < 0.6 * maxScore ? 0 : 15;
        } else if (daysSinceLastStudy === 1 && !srsLabel) {
            rotationPenalty = 5;
        }
        if (srsBoost > 0) rotationPenalty *= 0.1;

        // --- RAW MAX ---
        const effectiveRecencyMax = cfg.RECENCY_MAX * crunchMultiplier;
        const RAW_MAX_BASE = cfg.SCORE_MAX + effectiveRecencyMax + cfg.INSTABILITY_MAX;

        // BUGFIX B3: Denominador dinâmico para garantir ranqueamento justo em crunch mode.
        // O teto deve escalar junto com os bônus para evitar saturação em 100%.
        const maxSrsBoost = cfg.SRS_BOOST * 2.0;
        const RAW_MAX_ACTUAL = cfg.SCORE_MAX
            + effectiveRecencyMax
            + cfg.INSTABILITY_MAX
            + (cfg.PRIORITY_BOOST + maxSrsBoost) * crunchMultiplier
            + (cfg.MC_BOOST_DANGER_BASE + cfg.MC_BOOST_DANGER_RANGE); // headroom MC

        // FIX: Scale boosts by crunchMultiplier to prevent dilution when the exam is near
        const currentPriorityBoost = priorityBoost * crunchMultiplier;
        const currentSrsBoost = srsBoost * crunchMultiplier;
        const rawScore = (scoreComponent + recencyComponent + instabilityComponent + currentPriorityBoost + currentSrsBoost + mcUrgencyBoost) - rotationPenalty;

        const weightedRaw = rawScore;
        const normalized = Math.max(0, Math.min(100, Math.round((weightedRaw / RAW_MAX_ACTUAL) * 100)));

        // --- RECOMMENDATION ---
        let recommendation = "";
        
        // Calibragem Burnout: Volume alto (>8h/semana na matéria) OU Frequência alta (5+ dias)
        // AND nota estagnada ou caindo.
        const isHighVolume = recentHours > 8;
        const isHighFrequency = recentStudyDays >= 5;
        const isStagnant = trend <= 0.1 * maxScore; // Menos de 10% de evolução no mês
        const isBurnoutRisk = (isHighVolume || isHighFrequency) && isStagnant && recentStudyDays >= 3;

        if (mcHasData && mcRiskLabel === 'critical') {
            const burnoutNote = isBurnoutRisk ? ' (⚠️ Sinais de estafa — mude o método, não descanse.)' : '';
            // BUG-19 FIX: mcProbability já está em escala 0-100, não multiplicar por 100
            recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${burnoutNote}`;
        } else if (isBurnoutRisk) {
            recommendation = `🛑 Risco de Estafa: Você estudou pesadamente nos últimos dias mas a nota não reagiu. Descanse.`;
        } else if (mcHasData && mcRiskLabel === 'safe') {
            // BUG-19 FIX: mcProbability já está em escala 0-100
            recommendation = `🏆 Cruzeiro Seguro (${formatPercent(mcProbability)} nas projeções). Modo de manutenção ativado.`;
        } else if (srsBoost > 0) {
            recommendation = `${srsLabel} - Não pule essa revisão!`;
        } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && trend > 0) {
            recommendation = `Evolução Frágil (Volatilidade MSSD: ±${formatValue(mssdVolatility)}). Consolide a base.`;
        } else if (daysSinceLastStudy > 14) {
            recommendation = `${daysSinceLastStudy} dias sem estudo - Risco de esquecer!`;
        } else if (trend < -trendThreshold) {
            recommendation = `Nota caindo (${formatValue(trend)} pts) - Atenção urgente`;
        } else if (averageScore < targetScore - (0.2 * maxScore)) {
            // FIX-PCT5: converter para % real antes de exibir (averageScore está em [0, maxScore])
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
                standardDeviation: Number(mssdVolatility.toFixed(2)), // Legado: mantido para compatibilidade
                mssdVolatility: Number(mssdVolatility.toFixed(2)),
                trend: Number(trend.toFixed(2)),
                totalHours: Number(totalHours.toFixed(2)),
                hasData: relevantSimulados.length > 0 || categoryStudyLogs.length > 0,
                hasSimulados: relevantSimulados.length > 0,
                hasHighPriorityTasks,
                weight,
                srsLabel,
                isBurnoutRisk,
                crunchMultiplier: Number(crunchMultiplier.toFixed(2)),
                monteCarlo: mcHasData ? {
                    // BUG-19 FIX: mcProbability já está em 0-100, não multiplicar
                    probability: Number(mcProbability.toFixed(2)),
                    probabilityRaw: mcProbability,
                    riskLabel: mcRiskLabel,
                    volatility: Number(mcResult.volatility.toFixed(2)),
                    meanProjected: Number(mcResult.mean.toFixed(2)),
                    ci95Low: Number(mcResult.ci95Low.toFixed(2)),
                    ci95High: Number(mcResult.ci95High.toFixed(2)),
                    urgencyBoost: Number(mcUrgencyBoost.toFixed(2)),
                    calibrationPenalty: Number((mcResult.calibrationPenalty || 0).toFixed(4)),
                    avgBrier: Number((mcResult.avgBrier || 0).toFixed(4)),
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
                humanReadable: {
                    // FIX-PCT5: normalizar averageScore para [0,100] antes do formatPercent
                    "Média": formatPercent((averageScore / maxScore) * 100),
                    "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                    "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                    "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                    // BUG-19 FIX: mcProbability já está em 0-100
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
                }
            }
        };

        if (typeof logger === 'function') {
            try { logger({ categoryId: category.id, name: category.name, urgency: result }); } catch { /* ignore */ }
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
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    const top = ranked[0];
    if (!top) return null;

    const maxScore = options.maxScore ?? 100;
    return {
        ...top,
        weakestTopic: getWeakestTopic(top, simulados, maxScore)
    };
};

// Cache keyed by `category` object identity.
// Entries: Map<simulados_hash_string, topics_array>
// Usando WeakMap: o GC coleta automaticamente quando `category` é removida do estado.
const _topicsCache = new WeakMap();

function _getTopicsHash(simulados, maxScore) {
    if (!simulados?.length) return `empty-${maxScore}`;
    // BUG FIX: hash sum of all characters in the date to prevent collisions
    const dateSum = simulados.reduce((acc, s) => {
        const dStr = s.date || '';
        let sum = 0;
        for (let i = 0; i < dStr.length; i++) sum += dStr.charCodeAt(i);
        return acc + sum;
    }, 0);
    return `hash-${dateSum}-${simulados.length}-${maxScore}`;
}

// Wrapper público — mantém a assinatura original
const _buildSortedTopics = (category, simulados = [], maxScore = 100) => {
    // Verificar cache por identidade de `category` + hash dos simulados
    let catCache = _topicsCache.get(category);
    const hash = _getTopicsHash(simulados, maxScore);

    if (catCache) {
        const cached = catCache.get(hash);
        if (cached) return cached;
    } else {
        catCache = new Map();
        _topicsCache.set(category, catCache);
    }

    const result = _buildSortedTopicsImpl(category, simulados, maxScore);

    // Evitar acúmulo: cada categoria guarda no máximo 3 hashes diferentes
    // (ex: maxScore mudou ou simulados cresceram)
    if (catCache.size >= 3) {
        const firstKey = catCache.keys().next().value;
        catCache.delete(firstKey);
    }
    catCache.set(hash, result);
    return result;
};

// Renomear a implementação atual de _buildSortedTopics para _buildSortedTopicsImpl
// (o corpo da função permanece 100% idêntico — apenas o nome muda)
const _buildSortedTopicsImpl = (category, simulados = [], maxScore = 100) => {
    const tasks = category.tasks || [];
    const topicMap = {};

    const catNorm = normalize(category.name);
    const relevantSimulados = simulados.filter(s => normalize(s.subject) === catNorm);
    const categorySimuladoCount = relevantSimulados.length;

    const history = (category.simuladoStats && category.simuladoStats.history) ? category.simuladoStats.history : [];

    history.forEach(entry => {
        if (!entry) return;
        const entryDate = new Date(entry.date || 0);
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

            if (t.score != null && topicTotal === 0) {
                topicTotal = getSyntheticTotal(maxScore);
                topicCorrect = Math.round((getSafeScore(t, maxScore) / maxScore) * topicTotal);
            }

            topicMap[name].total += topicTotal;
            topicMap[name].correct += topicCorrect;

            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
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

        topicMap[name].manualPriority = Math.max(topicMap[name].manualPriority || 0, newTaskPriority);
    });

    const today = new Date();
    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateSlope(topicHistory, maxScore) * 30 : 0;
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 60;
        } else {
            daysSince = getDaysDiff(today, data.lastSeen);
        }
        const priorityBoost = data.manualPriority || 0;
        let urgencyScore = ((100 - percentage) * 2) + daysSince + priorityBoost;
        if (percentage === 0 && data.scores.length === 0 && categorySimuladoCount > 3) {
            urgencyScore *= 0.7;
        }
        if (trend < -0.5) urgencyScore *= 1.2;
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

// Helper customizado para pegar os N tópicos mais fracos em vez de apenas 1
const getWeakestTopicsList = (category, simulados = [], maxScore = 100, limit = 3) => {
    return _buildSortedTopics(category, simulados, maxScore).slice(0, limit);
};


export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore ?? 80;
    const maxScore = options.maxScore ?? 100;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    // Expandido para preencher o calendário: tentamos pegar as 10 categorias mais urgentes
    // Se o usuário tiver poucas categorias (ex: 3), vamos extrair múltiplos tópicos por categoria
    const topCategories = ranked.slice(0, 10);

    const performDeepCheck = (category) => {
        // FIX: Limitar o cálculo de burnout aos últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTime = thirtyDaysAgo.getTime();

        // Filtra logs e simulados recentes
        const recentLogs = studyLogs.filter(l => l.categoryId === category.id && new Date(l.date || 0).getTime() >= cutoffTime);
        const catNormalized = normalize(category.name);
        const recentSims = simulados.filter(s => normalize(s.subject) === catNormalized && new Date(s.date || 0).getTime() >= cutoffTime);

        const totalHours = recentLogs.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => {
            const sTotal = Number(s.total) || 0;
            // FIX: Se o simulado tem nota mas não registrou o total de questões (cadastro só em %), 
            // assumimos um peso sintético para evitar divisão por zero no questionsPerHour.
            if (sTotal === 0 && s.score != null) {
                return acc + (maxScore > 0 ? Math.min(maxScore, 80) : 80);
            }
            return acc + sTotal;
        }, 0);

        // FIX: Exigir um mínimo de 15 minutos (0.25h) para calcular a taxa de questões, evitando Infinity
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

    // Se o usuário tiver poucas matérias (< 5), geramos múltiplas tarefas por matéria
    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);

    const safeUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    topCategories.forEach((cat) => {
        const weakTopics = getWeakestTopicsList(cat, simulados, maxScore, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;

        // --- PATCH: Limita as iterações aos tópicos reais encontrados, 
        // mas garante 1 iterada mínima para aplicar o Fallback Geral.
        const maxIterations = Math.max(1, weakTopics.length);
        const iterations = Math.min(tasksPerCategory, maxIterations);

        for (let i = 0; i < iterations; i++) {
            const weakTopic = weakTopics[i] || null;
            const priorityLabel = allGeneratedTasks.length < 3 ? '[PROTOCOLO PRIORITÁRIO] ' : '';
            const topicLabel = weakTopic ? `${priorityLabel}[${weakTopic.name}] ` : `${priorityLabel}[OTIMIZAÇÃO DE BASE] `;

            // Unique ID per topic string to avoid react-beautiful-dnd collisions
            const uniqueIdSuffix = weakTopic ? (weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '') + weakTopic.total) : `geral-${i}`;

            // ─────────────────────────────────────────────────────────
            // MC-07: ALERTAS DE MONTE CARLO (checados primeiro)
            // ─────────────────────────────────────────────────────────

            // 🚨 Zona de Perigo: Prob < 30%
            if (mc && mc.probabilityRaw < DEFAULT_CONFIG.MC_PROB_DANGER && i === 0) {
                // BUG-19 FIX: probabilityRaw já está em 0-100
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
                        verdict: `Probabilidade crítica detectada (${DEFAULT_CONFIG.MC_SIMULATIONS} simulações). Abandone estudos passivos e mude de método imediatamente.`
                    }
                });
            }

            // 🌪️ Caos Estatístico: Volatilidade MSSD Alta + prob não crítica
            if (mc && mc.volatility > DEFAULT_CONFIG.MC_VOLATILITY_HIGH * (maxScore / 100) && mc.probabilityRaw >= DEFAULT_CONFIG.MC_PROB_DANGER && mc.probabilityRaw < DEFAULT_CONFIG.MC_PROB_SAFE && i === 0) {
                // BUG-19 FIX: probabilityRaw já está em 0-100
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-chaos-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado. Consolide o núcleo antes de avançar.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Caos Estatístico",
                        details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)} (limiar: ${(DEFAULT_CONFIG.MC_VOLATILITY_HIGH * (maxScore / 100)).toFixed(2)}). Probabilidade atual: ${probPct}%.`,
                        metrics: cat.urgency.details.humanReadable,
                        verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível. Reduza as oscilações."
                    }
                });
            }

            // 🏆 Cruzeiro Seguro: Prob > 90%
            if (mc && mc.probabilityRaw >= DEFAULT_CONFIG.MC_PROB_SAFE && i === 0) {
                // BUG-19 FIX: probabilityRaw já está em 0-100
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
                        verdict: "Mantenha o ritmo atual. Manutenção leve é suficiente para proteger essa posição."
                    }
                });
            }

            if (cat.urgency?.details?.srsLabel && i === 0) {
                allGeneratedTasks.push({
                    id: `${cat.id}-srs-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🧠 ${cat.urgency.details.srsLabel}. Revise para não esquecer!`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Revisão Espaçada (SRS) Ativada",
                        label: cat.urgency.details.srsLabel,
                        metrics: cat.urgency.details.humanReadable,
                        verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                    }
                });
            }

            const trapCheck = performDeepCheck(cat);
            if (trapCheck.isTrap && i === 0) {
                allGeneratedTasks.push({
                    id: `${cat.id}-trap-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}⚠️ ANOMALIA DE MÉTODO: Teoria excedente. Foco TOTAL em processamento de questões.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Detector de Pseudo-Estudo",
                        details: "Alta carga horária com baixíssimo volume de exercícios.",
                        metrics: cat.urgency.details.humanReadable,
                        verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                    }
                });
            }

            if (weakTopic && (weakTopic.percentage < 70 || weakTopic.isUntested || weakTopic.priorityBoost > 0)) {
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
            } else if (i === 0) {
                // BUG FIX: O Fallback Geral só deve entrar na 1ª iteração, 
                // e APENAS se não houver um tópico fraco explícito cobrindo a quota.
                allGeneratedTasks.push({
                    id: `${cat.id}-general-review-${uniqueIdSuffix}-${safeUUID}`,
                    text: `${cat.name}: ${topicLabel}Revisar erros e fazer 10 questões gerais`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Revisão Geral Complementar",
                        metrics: cat.urgency.details.humanReadable,
                        categoryDetails: {
                            "Total Urgency": Math.round(cat.urgency.score),
                            ...cat.urgency.details.components
                        }
                    }
                });
            }
        }
    });

    // Limita estritamente a 12 tarefas para não engolir a tela inteira do Backlog
    return allGeneratedTasks.slice(0, 12);
};

/**
 * --- AI PRODUCTIVITY COACH ENGINE ---
 * Lógica específica para o Pomodoro e Produtividade em Tempo Real
 */

/**
 * Curva de Fadiga Cognitiva
 * Baseada no modelo de decaimento: R(t) = 100 * e^(-0.003 * t)
 */
export function getCognitiveState(stats) {
    // FIX: Prevenção contra undefined na fase de hidratação do Zustand
    if (!stats) return 100;

    let focusMinutes = stats.consecutiveMinutes || 0;

    // Fallback ou acréscimo se a pessoa acabou de fechar pomodoros na sessão ativa
    // Mas note que a conta no Pomodoro.jsx já soma todos os studyLogs.
    if (focusMinutes === 0) {
        focusMinutes = (stats.pomodorosCompleted || 0) * (stats.settings?.pomodoroWork || 25);
    }

    // 🎯 MATH BUG FIX: Curva de Fadiga Elástica.
    // Alunos Nível 1 cansam em ~2h. Alunos Nível 10 aguentam ~3h.
    // O coeficiente de decaimento torna-se elástico em relação à maturidade do aluno.
    const userLevel = stats.user?.level || 1;
    const levelMultiplier = 1 + (userLevel * 0.05);
    const dynamicDecay = 0.003 / levelMultiplier;

    const fatigueScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-dynamicDecay * focusMinutes))));
    return fatigueScore; // 100 = descansado, <70 = fadigado
}

/**
 * Algoritmo de Prioridade (ROI)
 * Descobre exatamente o que você deve estudar agora com base em múltiplos fatores.
 */
export function getBestTask(categories, excludeTaskId = null) {
    let bestTask = null;
    let highestScore = -Infinity;

    (categories || []).forEach(cat => {
        (cat.tasks || []).forEach(task => {
            if (task.completed || (excludeTaskId && task.id === excludeTaskId)) return;

            let score = 0;

            // Fator 1: Prioridade do Usuário
            if (task.priority === 'high') score += 50;
            else if (task.priority === 'medium') score += 20;

            // Fator 2: Curva de Esquecimento (Dias sem estudar)
            const studiedAt = task.lastStudiedAt || cat.lastStudiedAt;
            if (studiedAt) {
                // BUG 4 FIX: Adicionar um piso de 0 para proteger contra "Viagem no Tempo" (desync de relógio)
                const days = Math.max(0, (Date.now() - new Date(studiedAt).getTime()) / (1000 * 60 * 60 * 24));
                score += Math.min(days * 5, 30); // Teto de 30 pontos
            } else {
                score += 15; // Tarefas novas ganham bônus
            }

            // Fator 3: Taxa de Erro (se o seu sistema gravar isso depois)
            if (task.errorRate) score += (task.errorRate * 100) * 0.4;

            if (score > highestScore) {
                highestScore = score;
                bestTask = { ...task, catName: cat.name, catColor: cat.color, catIcon: cat.icon, catId: cat.id };
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

    if (fatigueScore < 70) {
        return {
            type: 'danger',
            title: 'ALERTA: ESGOTAMENTO NEURAL',
            text: `Carga cognitiva em nível crítico (**${fatigueScore}%**). Taxa de retenção em declínio acentuado. Protocolo de resfriamento (pausa) recomendado.`,
            color: 'red',
            iconType: 'Alert'
        };
    }

    // --- PATCH: Optional Chaining (stats?) para prevenir TypeError no arranque ---
    if (stats?.pomodorosCompleted >= 3) {
        return {
            type: 'success',
            title: 'ESTADO: SINCRONIA TOTAL',
            text: `Sincronia neural otimizada! Estabilidade cognitiva blindada em **${fatigueScore}%**. Fluxo de dados em alta fidelidade detectado.`,
            color: 'emerald',
            iconType: 'Zap'
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
