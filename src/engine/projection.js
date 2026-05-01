// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, randomNormal, makeNormalRng } from './random.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { logger } from '../utils/logger.js';

// Helper: Complementary Cumulative Distribution Function (1 - CDF) for Normal(0,1)
import { normalCDF_complement, generateKDE, sampleTruncatedNormal } from './math/gaussian.js';
import { Z_95 } from './math/constants.js';

// Helper: Ensure history is sorted by date and filter out invalid dates
export function getSortedHistory(history) {
    if (!history) return [];
    return [...history]
        .filter(h => h && h.date && !isNaN(new Date(h.date).getTime()))
        .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            // BUGFIX M2: Use local time methods to avoid UTC-offset grouping errors in regions like Brazil.
            const local_A = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
            const local_B = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
            return local_A - local_B;
        });
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
function weightedRegression(history, lambda = 0.08, maxScore = 100) {
    // Ensure sorted history for correct time calculations
    const sortedHistory = getSortedHistory(history);

    if (!sortedHistory || sortedHistory.length < 2) {
        return { slope: 0, intercept: 0, slopeStdError: 0 };
    }
    // BUGFIX H4: Com exatamente 2 pontos, n-2 = 0 → divisão por 0.001 infla variance 1000×.
    // Retornar slope simples (sem erro padrão) é mais honesto matematicamente.
    if (sortedHistory.length === 2) {
        const p0 = sortedHistory[0];
        const p1 = sortedHistory[1];
        const dy = getSafeScore(p1, maxScore) - getSafeScore(p0, maxScore);
        const dt = Math.max(1, (new Date(p1.date) - new Date(p0.date)) / (1000 * 60 * 60 * 24));
        const slope = dy / dt;
        const intercept = getSafeScore(p1, maxScore);
        // BUGFIX M4: Utilizar prior variância estipulada em ~20 em vez de hardcode 2.0
        // Para dt altos, o standard error cai (mais certeza no slope).
        const slopeStdError = Math.max(0.002 * maxScore, (maxScore * 0.045) / dt);
        return { slope, intercept, slopeStdError };
    }

    // BUG-2.3 FIX: Use last valid date or today to avoid time travel and collapse
    const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date).getTime();
    const now = Math.max(Date.now(), lastDate); 


    const data = sortedHistory.map(h => {
        const time = new Date(h.date).getTime();
        const daysAgo = (now - time) / (1000 * 60 * 60 * 24);
        // BUGFIX: Prevenção de "Viagem no Tempo" (datas futuras destruindo pesos).
        // Se a data for futura (erro de registro ou clock desync), tratamos como "agora" (daysAgo=0).
        const safeDaysAgo = Math.max(0, daysAgo);
        const weight = Math.exp(-lambda * safeDaysAgo);
        // BUGFIX M2: Volume weighting (WLS Refined). 
        // Larger exams have higher square-root information value.
        const volumeWeight = Math.sqrt(Math.max(1, Number(h.total) || 0));
        const finalWeight = weight * volumeWeight;

        return {
            x: -safeDaysAgo,
            y: getSafeScore(h, maxScore),
            w: finalWeight
        };
    });

    const Sw = data.reduce((a, p) => a + p.w, 0);
    const Sx = data.reduce((a, p) => a + p.w * p.x, 0);
    const Sy = data.reduce((a, p) => a + p.w * p.y, 0);
    const Sxx = data.reduce((a, p) => a + p.w * p.x * p.x, 0);
    const Sxy = data.reduce((a, p) => a + p.w * p.x * p.y, 0);

    const denom = Sw * Sxx - Sx * Sx;

    if (denom === 0) {
        return { slope: 0, intercept: 0, slopeStdError: 0 };
    }

    const slope = (Sw * Sxy - Sx * Sy) / denom;
    const intercept = (Sy - slope * Sx) / Sw;

    // FIX MATEMÁTICO: Calcular o Effective Sample Size (Kish) para variância
    const sumW = data.reduce((a, p) => a + p.w, 0);
    const sumW2 = data.reduce((a, p) => a + p.w * p.w, 0);
    const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : data.length;

    const wrss = data.reduce((acc, p) =>
        acc + p.w * Math.pow(p.y - (slope * p.x + intercept), 2), 0
    );

    // BUGFIX M3: Unbiased WLS variance estimator for weighted degrees of freedom.
    // Use Kish's approximation for effective sample size (N_eff)
    // BUGFIX B6: Usar o máximo entre Kish N_eff e contagem mínima de observações
    const rawN = data.length;
    const safeDOF = Math.max(0.5, Math.min(effectiveN, rawN) - 2);
    const variance = Math.max(0, (wrss / sumW) * (effectiveN / Math.max(0.01, safeDOF)));
    const stdError = Math.sqrt(variance);

    const Sxx_centered = Sxx - (Sx * Sx) / Sw;

    const slopeStdError = Sxx_centered > 1e-8 ? Math.sqrt(variance / Sxx_centered) : 0;

    return { slope, intercept, slopeStdError };
}

// 🎯 calculateSlope (compatível)
export function calculateSlope(history, maxScore = 100) {
    if (!history || history.length < 2) return 0;
    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return 0;

    const { slope, slopeStdError } = weightedRegression(sorted, 0.08, maxScore);
    const n = sorted.length;

    // FIX MATEMÁTICO: Invariância de Escala
    const scaleFactor = maxScore / 100;

    const normalizedStdError = slopeStdError / scaleFactor;

    const confidence =
        1 / (1 + normalizedStdError / 0.5);

    const historyBoost =
        Math.min(1.5, 0.9 + n / 15); // Baseline increased from 0.7 to 0.9

    const baseLimit = 0.4 * scaleFactor; // Escalonado

    // 🎯 REFINAMENTO PSICOMÉTRICO: Estrangulamento da Curva de Aprendizagem (Limites Dinâmicos)
    // Alunos com notas baixas podem ter picos de evolução maiores (catching up).
    // Alunos na faixa dos 85%+ ficam estrangulados em crescimentos mais lentos (plateau).
    const currentLevel = getSafeScore(sorted[sorted.length - 1], maxScore) / maxScore; // 0-1
    const proficiencyFriction = Math.max(0, Math.min(1, currentLevel));

    // Teto dinâmico: reduzido de 0.85 para 0.4 conforme plano de refinamento
    const absoluteMax = (0.40 - (0.15 * proficiencyFriction)) * scaleFactor;

    // 🎯 REFINAMENTO: Fricção Direcional (Gravidade Livre vs Platô de Teto)
    // O absoluteMax (estrangulamento) só deve limitar o crescimento (slope positivo).
    // Quedas de desempenho (slope negativo) não devem sofrer fricção, permitindo
    // feedback imediato sobre esquecimento/regressão.
    const dynamicRiseLimit = Math.min(
        absoluteMax,
        baseLimit * historyBoost
    );

    // Limite de queda mais generoso (sem fricção de teto)
    const dynamicFallLimit = baseLimit * historyBoost * (n > 10 ? 3 : 2);

    const dampenedSlope = slope * confidence; // Atenua primeiro com base na incerteza

    // Em seguida, aplica os tetos de fricção no valor já atenuado
    const clamped = Math.max(
        -dynamicFallLimit,
        Math.min(dynamicRiseLimit, dampenedSlope)
    );

    return clamped;
}

export const calculateAdaptiveSlope = calculateSlope; // Alias

// 📈 projectScore (inalterado externamente)
export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return 0;

    const { slope: rawSlope, slopeStdError } = sortedHistory.length >= 2
        ? weightedRegression(sortedHistory, 0.08, maxScore)
        : { slope: 0, slopeStdError: 0 };

    const slope = calculateSlope(sortedHistory, maxScore);

    const lastRawScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    let ema = getSafeScore(sortedHistory[0], maxScore); 
    let currentScore = lastRawScore;

    for (let i = 1; i < sortedHistory.length; i++) {
        const daysSinceLast = Math.max(1, (new Date(sortedHistory[i].date) - new Date(sortedHistory[i - 1].date)) / 86400000);
        ema = calculateDynamicEMA(getSafeScore(sortedHistory[i], maxScore), ema, i + 1, daysSinceLast);
    }
    currentScore = ema;

    // Relaxed damping: 45 instead of 30, allows more linear projection for longer
    const effectiveDays =
        45 * Math.log(1 + projectDays / 45);

    const projected =
        currentScore + slope * effectiveDays;

    // MATH BUG FIX: Using empirical volatility to calculate the Standard Error of the Mean.
    // The previous formula used `sortedHistory.length` as the denominator for a binomial proportion,
    // which dimensionally confused "Number of Tests" with "Number of Questions".
    const empiricalSD = calculateVolatility(sortedHistory, maxScore, minScore);
    const n_tilde = sortedHistory.length;
    // Standard error of the mean = SD / sqrt(N)
    const effectiveSd = empiricalSD / Math.sqrt(Math.max(1, n_tilde));

    // A incerteza do dia da prova = Incerteza angular da reta + Volatilidade natural (SD)
    // BUGFIX GEMINI: O rigor matemático provém do slopeStdError * effectiveDays (amortecido), 
    // impedindo que o "funil" de incerteza angular abra ao infinito em projeções muito longas.
    const angularUncertainty = slopeStdError * effectiveDays;
    // MATH-04 FIX: Removed effectiveSd (SE of mean = empiricalSD / √N) from quadrature.
    // For a *single future observation*, the correct prediction variance is:
    //   σ²_pred = σ²_angular + σ²_daily
    // Adding effectiveSd double-counts the daily volatility (it's just SD/√N).
    const predictionSD = Math.sqrt(
        Math.pow(angularUncertainty, 2) + 
        Math.pow(empiricalSD, 2)
    );
    const marginOfError = Z_95 * predictionSD;

    // BUG-E FIX: projectScore must respect dynamic scoring bounds.
    // Previously hardcoded [0, 100] which truncated projections for exams
    // with maxScore > 100 (e.g. concurso 0-120).
    const projectedFinal = Math.max(minScore, Math.min(maxScore, projected));

    return {
        projected: projectedFinal,
        marginOfError
    };
}

// MATH BUG FIX 1: Standardization of MSSD Volatility.
// Standardizing residuals by dividing by binomial volatility removes the boundary effect.
// This allows measurement of intrinsic learner volatility, preventing "double damping"
// in Monte Carlo simulations.
export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    // Ensure sorted history
    const sorted = getSortedHistory(history);

    // FIX-VOL1: Escalar o fallback pelo maxScore para manter invariância de escala.
    // Antes retornava 1.5 fixo, o que inflava o sigma para maxScore < 100 e deflava para > 100.
    const scaleFactorEarly = maxScore / 100;
    if (sorted.length < 2) {
        return 1.5 * scaleFactorEarly;
    }

    // BUGFIX M1: Para exatamente 2 pontos (1 resíduo), a centralização falha. 
    // Extraímos a volatilidade empiricamente pelo 'spread normalizado'.
    if (sorted.length === 2) {
        const dt = Math.max(1, (new Date(sorted[1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000);
        const diff = Math.abs(getSafeScore(sorted[1], maxScore) - getSafeScore(sorted[0], maxScore));
        // REVISION: Floor standardized (escalonado)
        const midScore = (getSafeScore(sorted[0], maxScore) + getSafeScore(sorted[1], maxScore)) / 2;
        const scoreRange = (maxScore - minScore) || 1;
        const pMid = Math.max(0.001, Math.min(0.999, (midScore - minScore) / scoreRange));
        const binomialVol = Math.pow(Math.max(0.05, 4 * pMid * (1 - pMid)), 0.5);
        const rawVol = diff / Math.sqrt(dt) / binomialVol;
        const scaleFactor = maxScore / 100;
        return Math.max(1.0 * scaleFactor, Math.min(maxScore * 0.15, rawVol));
    }
    // C2 FIX: Use rawDrift (unbiased WLS slope) for detrending instead of clamped calculateSlope.
    const { slope: rawDriftVol } = weightedRegression(sorted, 0.08, maxScore);
    const now = new Date(sorted[sorted.length - 1].date).getTime();

    // Calculate weighted sum of squared differences (MSSD)
    let sumSw = 0;
    let sumResidualsWeighted = 0;
    let sumWeights = 0;

    const scoreRange = (maxScore - minScore) || maxScore || 1;

    for (let i = 1; i < sorted.length; i++) {
        const h0 = sorted[i - 1];
        const h1 = sorted[i];

        const prevScore = getSafeScore(h0, maxScore);
        const actualChange = getSafeScore(h1, maxScore) - prevScore;
        const time1 = new Date(h1.date).getTime();
        const time0 = new Date(h0.date).getTime();

        const daysAgo = (now - time1) / (1000 * 60 * 60 * 24);
        const rawDaysBetween = Math.max(0.1, (time1 - time0) / (1000 * 60 * 60 * 24));
        const daysBetween = Math.min(90, rawDaysBetween);

        const detrendedDiff = actualChange - (rawDriftVol * daysBetween);
        const timeScaleVol = Math.max(0.1, Math.sqrt(daysBetween));

        // BUG 1 FIX: Standardize by binomial volatility to remove boundary effect
        const pPrev = Math.max(0.001, Math.min(0.999, (prevScore - minScore) / scoreRange));
        const historicalBinomialVol = Math.pow(Math.max(0.05, 4 * pPrev * (1 - pPrev)), 0.5);

        const residual = (detrendedDiff / timeScaleVol) / historicalBinomialVol;

        // Exponential weight focusing on recent volatility (lambda=0.05)
        const weight = Math.exp(-0.05 * daysAgo);

        const scaleFactor = maxScore / 100;
        const dynamicClamp = 50 * scaleFactor; // ~50 pts/√dia para maxScore=100 (Bug 2 Fix)
        const clampedResidual = Math.max(-dynamicClamp, Math.min(dynamicClamp, residual));
        const dailyVariance = clampedResidual * clampedResidual;

        sumSw += dailyVariance * weight;
        sumResidualsWeighted += clampedResidual * weight;
        sumWeights += weight;
    }

    const scaleFactorFallback = maxScore / 100;
    if (sumWeights === 0) return 1.5 * scaleFactorFallback;

    // 🎯 FIX MATEMÁTICO: Centralização da Variância Ponderada
    // Subtrai o (Expectation)^2 para garantir que estamos medindo Variância e não o Momento Bruto.
    const expectedResidual = sumResidualsWeighted / sumWeights;
    const mssdVariance = (sumSw / sumWeights) - (expectedResidual * expectedResidual);

    // REVISION: Standardized SD floor escalonado
    return Math.sqrt(Math.max(Math.pow(1.0 * scaleFactorFallback, 2), mssdVariance));
}

// -----------------------------
// Helper: Bootstrap Sampler
// -----------------------------
export function getRandomElement(arr, rng) {
    // Usa o RNG seedado para consistência
    const idx = Math.floor(rng() * arr.length);
    const safeIdx = Math.max(0, Math.min(arr.length - 1, idx));
    return arr[safeIdx];
}

export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 5000,
    options = {}
) {
    // CACHE BUG FIX: destructure currentMean from options.
    // Previously only forcedVolatility and forcedBaseline were read; options.currentMean
    // (the proper weighted mean passed from MonteCarloGauge) was silently dropped,
    // causing the returned currentMean to always use the last raw score from the
    // composite global history instead of the caller-computed weighted mean.
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100 } = options;
    const sortedHistory = getSortedHistory(history);
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    // Safety check - allow at least 1 point for a flat projection
    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Fix: Baseline uses a more responsive EMA or forced value (Bayesian) to avoid anchoring.
    // BUG-04 FIX: Priority to forcedBaseline for stability as requested.
    const currentScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    // BUGFIX M2: Priority fallback to optionsCurrentMean (weighted average) to align UI and Chart.
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;

    if (sortedHistory.length > 0) {
        // BUG-2.2 FIX: EMA initialization for baseline
        let ema = getSafeScore(sortedHistory[0], maxScore);
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (new Date(sortedHistory[i].date) - new Date(sortedHistory[i - 1].date)) / 86400000);
            ema = calculateDynamicEMA(getSafeScore(sortedHistory[i], maxScore), ema, i + 1, daysSinceLast);
        }
        
        if (forcedBaseline === undefined) {
            baselineScore = ema;
        }
    }

    // Bayesian Pooling: Incorporate weighted mean into smoothing if available
    // BUG-05 FIX: Move out of conditional to ensure optionsCurrentMean is always factored in
    if (optionsCurrentMean !== undefined) {
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
        const daysToNow = Math.max(1, (Date.now() - lastDate.getTime()) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }

    // 🎯 1. Calcular Tendência (Drift) + Incerteza (Epistemic)
    const { slope: rawDrift, slopeStdError } = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore)
        // FIX: O fallback de 1.5 precisa ser escalonado pela base da prova (senão fica inútil no Enem/OAB)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    const drift = calculateSlope(sortedHistory, maxScore); // Tendência clampeada para a média determinística
    const simulationDays = days; // Hoisted for C1 cap below
    // C1 FIX: Cap drift uncertainty to prevent bimodal explosion with short history.
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    // ESCALA INVARIANTE: O teto 1.5 foi reduzido para 0.4 para evitar colapso bimodal
    // em projeções longas com baixa confiança.
    const driftUncertainty = Math.min(rawDriftUncertainty, 0.4 * scaleFactor);

    // Calcula volatilidade clássica para normalização O-U
    const volatility = forcedVolatility !== undefined ? forcedVolatility : calculateVolatility(sortedHistory, maxScore, minScore);
    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    const thetaOU = Math.max(0.005, 0.1 / (1 + normalizedVolOU * 0.05));

    // 2. Extrair Resíduos (Bootstrap Source) NORMALIZADOS PELO TEMPO E SEM TENDÊNCIA
    // BUG 2 FIX: use getSafeScore() to handle entries without direct .score field
    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;

        const time1 = new Date(h.date).getTime();
        const time0 = new Date(sortedHistory[i - 1].date).getTime();

        const rawDays = Math.max(0.1, (time1 - time0) / 86400000);
        const daysBetween = Math.min(90, rawDays);

        const detrendedChange = actualChange - (rawDrift * daysBetween);

        // M-02 FIX: Resíduo bruto normalizado pela Variância Assintótica O-U
        const varOU = (1 - Math.exp(-2 * thetaOU * daysBetween)) / (2 * thetaOU);
        const timeScale = Math.max(0.1, Math.sqrt(varOU));

        const currentScoreRange = (maxScore - minScore) || maxScore || 1;
        const pPrev = Math.max(0.001, Math.min(0.999, (prev - minScore) / currentScoreRange));
        const historicalBinomialVol = Math.pow(Math.max(0.05, 4 * pPrev * (1 - pPrev)), 0.5);

        return (detrendedChange / timeScale) / historicalBinomialVol;
    }).slice(1) : [];

    // Math Fix: Centralizar resíduos para garantir que a média do choque seja rigorosamente zero.
    // Isso impede que o "sucesso" histórico do aluno vaze para o bootstrap inflando o drift.
    if (residuals.length > 0) {
        const resMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
        residuals = residuals.map(r => r - resMean);
    }

    // Fallback: Se histórico for muito curto (< 15), Bootstrap é perigoso 
    // e gerará curvas com "ondas" (artefato discreto no KDE) devido ao pool de amostras ínfimo.
    // Exigimos n >= 15 para o bootstrap representar uma distribuição minimamente rica.
    const useBootstrap = residuals.length >= 15;

    const lastScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    const scoreSum = Math.round(sortedHistory.reduce((s, h) => s + getSafeScore(h, maxScore), 0));
    // BUG-10 FIX: Preservar 2 casas decimais na entropia do seed
    // BUG-2.1 FIX: Utilizar seed passada ou fazer fallback para entropia histórica
    const seed = options.seed !== undefined 
        ? options.seed 
        : (sortedHistory.length * 997 + scoreSum * 13 + Math.round(lastScore * 100) * 31);
    // RNG initialization moved inside the loop (Bugfix M1: Seed Desync)

    let success = 0;
    // Math fix 2: Welford's online algorithm for numerically stable variance
    // Avoids catastrophic cancellation in (ΣX²/n − (ΣX/n)²) when mean is large
    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    if (days === 0) {
        const baseline = forcedBaseline !== undefined ? forcedBaseline : baselineScore;
        const { ciLow, ciHigh } = (typeof options.bayesianCI === 'object' && options.bayesianCI !== null) ? options.bayesianCI : {
            ciLow: baseline - (volatility * 1.96),
            ciHigh: baseline + (volatility * 1.96)
        };
        // REVISION: Escalonamento do SD e Conversão p/ Z-score
        const high = (options.bayesianCI?.unclampedHigh !== undefined) ? options.bayesianCI.unclampedHigh : ciHigh;
        const low = (options.bayesianCI?.unclampedLow !== undefined) ? options.bayesianCI.unclampedLow : ciLow;
        const inferredSD = Math.max(1.0 * scaleFactorFallback, (high - low) / 3.92);
        
        let rawProb = 0;
        if (targetScore <= minScore) {
            rawProb = 100;
        } else if (targetScore < maxScore) {
            const zScore = (targetScore - baseline) / (Number.isFinite(inferredSD) && inferredSD > 0 ? inferredSD : 1.0 * scaleFactorFallback);
            rawProb = normalCDF_complement(Number.isFinite(zScore) ? zScore : 0) * 100;
        } else {
            rawProb = 0;
        }
        // BUGFIX: Generate empirical samples for KDE even in static mode (days=0)
        // This ensures the visual GaussianPlot uses the same path logic as the projection.
        const safeSimulations = Math.max(1, simulations);
        const allFinalScores = new Float64Array(safeSimulations);
        const rng = mulberry32(seed);
        for (let i = 0; i < safeSimulations; i++) {
            allFinalScores[i] = sampleTruncatedNormal(baseline, inferredSD, minScore, maxScore, rng);
        }
        allFinalScores.sort((a, b) => a - b);

        return {
            probability: Number(rawProb.toFixed(2)),
            mean: Number(baseline.toFixed(2)),
            sd: Number(inferredSD.toFixed(2)),
            sdLeft: Number(inferredSD.toFixed(2)),
            sdRight: Number(inferredSD.toFixed(2)),
            ci95Low: Number(Math.max(minScore, ciLow).toFixed(2)),
            ci95High: Number(Math.min(maxScore, ciHigh).toFixed(2)),
            currentMean: Number((optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore).toFixed(2)),
            projectedMean: baseline,
            projectedSD: inferredSD,
            kdeData: generateKDE(allFinalScores, baseline, inferredSD, safeSimulations, minScore, maxScore),
            drift: 0,
            volatility,
            minScore,
            maxScore,
            method: options.bayesianCI ? "bayesian_static" : "normal_static"
        };
    }

    // Math fix 1: Collect all final scores for empirical CI percentiles
    const safeSimulations = Math.max(1, simulations);
    const allFinalScores = new Float64Array(safeSimulations);

    // BUG 4 FIX: Uncertaintiy follows Random Walk (sqrt of time)
    // We use volatility directly as the standard deviation of each daily step.
    const sigma = volatility;

    // MATH-M3 FIX: Resíduos já foram centralizados (L291-293), consumindo 1 DoF.
    // O estimador imparcial para a variância residual exige n-1.
    const _residualSD = (useBootstrap && residuals.length > 1)
        ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (residuals.length - 1))
        : 0;

    // BUG-B FIX: Adaptive cap based on residual sample size.
    // BUGFIX GEMINI: Estrangulamento severo para N < 10 para evitar multiplicadores absurdos em ruído zero.
    const adaptiveMaxScale = Math.min(
        residuals.length < 10 ? 3.0 : 15.0,
        3.0 + Math.sqrt(Math.max(1, residuals.length))
    );
    const bootstrapTargetScale = _residualSD > 0
        ? Math.min(adaptiveMaxScale, volatility / _residualSD)
        : 1;

    // simulationDays hoisted to line ~277 for C1 drift uncertainty cap
    // O 'drift' (slope) de calculateSlope já retorna pontos/dia diretos.

    // BUG 1 FIX: Hyperbolic decay for theta (OU mean-reversion speed).
    // ESCALA INVARIANTE CAUSAVA BUG NO ENEM. Volatility crua corrompia 'theta'.
    const scoreRange = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVol = (volatility / scoreRange) * 100;
    const theta = Math.max(0.005, 0.1 / (1 + normalizedVol * 0.05));

    // 2. O Atrator (μ - Mu).
    // Até onde o aluno naturally chegaria com a tendência atual.
    // MELHORIA 1: Diminishing Returns (Log-Damping do tempo) para o atrator Monte Carlo.
    const effectiveAttractorDays = 45 * Math.log(1 + simulationDays / 45);

    // BUG 1 FIX: Adicionar uma salvaguarda para o escopo do domínio 
    // antes do loop de simulação para evitar colapso de domínio.
    const safeMaxScore = maxScore <= minScore ? minScore + 1 : maxScore;

    // Início do Monte Carlo
    for (let s = 0; s < safeSimulations; s++) {
        // BUGFIX M1: Re-initialize RNG for each universe 's' to ensure independence from 'days' slider
        const rng = mulberry32(seed + s);
        const normalRng = makeNormalRng(rng);
        const pathRng = mulberry32(seed + s + 777);
        
        let score = baselineScore;

        // 🎯 FIX MATEMÁTICO: O atrator O-U deve respeitar a gravidade do platô (effective days)
        // Caso contrário, a nuvem do Monte Carlo descola da linha principal de projeção.
        const targetChange = drift * effectiveAttractorDays;
        const convergenceFactor = 1 - Math.exp(-theta * simulationDays);
        const unboundedMu = baselineScore + (targetChange / Math.max(0.01, convergenceFactor));
        
        // BUGFIX B2: Clampar o atrator ANTES do ruído epistêmico
        const adjustedTargetMu = Math.max(minScore, Math.min(safeMaxScore, unboundedMu));

        const epistemicNoise = normalRng() * driftUncertainty * effectiveAttractorDays;
        const simMu = adjustedTargetMu + epistemicNoise;

        for (let d = 0; d < simulationDays; d++) {
            let shock;

            // Extração do Ruído (Empírico ou Teórico)
            if (useBootstrap) {
                // MELHORIA 3: Injeção de "Black Swan". 
                // Mistura 90% Empírico (Bootstrap) com 10% Gaussiano (Teórico).
                // 🎯 ALERTA 3.1 FIX: Usar pathRng para não desalinhar o cache do Box-Muller (rng).
                // BUG 3 FIX: Sempre consumimos dois para manter o estado da semente em paridade.
                const u = pathRng();
                const u2 = pathRng();
                if (u < 0.90) {
                    const idx = Math.min(residuals.length - 1, Math.floor(u2 * residuals.length));
                    const randomResidual = residuals[idx];
                    shock = randomResidual * bootstrapTargetScale;
                } else {
                    shock = normalRng() * sigma;
                }
            } else {
                shock = normalRng() * sigma;
            }

            // 🧲 1. A Tração Determinística (Ornstein-Uhlenbeck)
            // ESCALONAMENTO DE WIENER: Atração e Choque escalonados pelo passo temporal (dt).
            const dt = 1; // Passo de 1 dia
            const deterministicPull = theta * (simMu - score) * dt;

            // 📊 2. Heterocedasticidade (Difusão de Jacobi)
            // BUGFIX M1: Retorna 1 no meio (50%) e tende a 0 nas bordas (0% ou 100%).
            // Esmaga a variância nas fronteiras conforme processo de Jacobi.
            const currentScoreRange = (maxScore - minScore) || maxScore || 1;
            const p = Math.max(0.001, Math.min(0.999, (score - minScore) / currentScoreRange));
            const boundaryCompression = 4 * p * (1 - p);
            // BUGFIX M3: O choque aleatório TEM de ser multiplicado por sqrt(dt)
            const dynamicSigma = sigma * Math.sqrt(Math.max(0.05, boundaryCompression)) * Math.sqrt(dt);

            // ⚙️ 3. O Passo Estocástico (Euler-Maruyama)
            // FIX-RNG2: normalRng() só é consumido no branch não-bootstrap para evitar
            // desalinhamento de estado do Box-Muller quando useBootstrap muda (histórico cruza n=15).
            // Antes, gaussianNoise era gerado incondicionalmente e descartado no modo bootstrap,
            // causando salto de ~2–5pp na probabilidade ao cruzar o threshold.
            let stochasticTerm;
            if (useBootstrap) {
                stochasticTerm = shock * Math.sqrt(Math.max(0.05, boundaryCompression)) * Math.sqrt(dt);
            } else {
                const gaussianNoise = normalRng();
                stochasticTerm = gaussianNoise * dynamicSigma;
            }
            let newScore = score + deterministicPull + stochasticTerm;

            // 🎯 REFLECTING BOUNDARY (Fronteira Refletora)
            // 🎯 BUGFIX M3: Resolving multiple bounces for high-energy shocks.
            // Uses a while loop to ensure the score stays within [minScore, maxScore]
            // regardless of the shock magnitude, preventing "glued to floor/ceiling" artifacts.
            while (newScore > safeMaxScore || newScore < minScore) {
                if (newScore > safeMaxScore) {
                    newScore = safeMaxScore - (newScore - safeMaxScore);
                }
                if (newScore < minScore) {
                    newScore = minScore + (minScore - newScore);
                }
            }

            // Final safety clamp just in case of multiple reflections or extreme shocks
            score = Math.max(minScore, Math.min(safeMaxScore, newScore));
        }

        // Score já está no domínio [minScore, maxScore] graças ao step-clamping acima.
        // Safety net redundante para defesa em profundidade.
        const viableScore = score;
        const EPSILON = 1e-6; // Tolerância de precisão
        if (viableScore >= targetScore - EPSILON) success++;

        allFinalScores[s] = viableScore;

        // O algoritmo de Welford continua idêntico para estabilidade numérica
        welfordCount++;
        const delta = viableScore - welfordMean;
        welfordMean += delta / welfordCount;
        const delta2 = viableScore - welfordMean;
        welfordM2 += delta * delta2;
    }

    const projectedMean = welfordMean;
    const projectedVariance = welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0;
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    // 🎯 BUG-O7 FIX: Ordenação numérica explícita (a-b).
    allFinalScores.sort((a, b) => a - b);
    // B1 FIX: Use shared getPercentile (linear interpolation) instead of raw index.
    // Previously used asymmetric floor/round that created 0.02pp CI asymmetry.
    // Now consistent with simulateNormalDistribution's percentile calculation.
    const rawLow = getPercentile(allFinalScores, 0.025);
    const rawHigh = getPercentile(allFinalScores, 0.975);

    // Display stats (Corte visual apenas para a UI)
    const ci95Low = Number(Math.max(minScore, rawLow).toFixed(2));
    const ci95High = Number(Math.min(maxScore, rawHigh).toFixed(2));

    const displayMean = Math.max(minScore, Math.min(maxScore, projectedMean));

    // 🎯 ALERTA 3.2 FIX: Probabilidade Analítica Normalizada para Truncamento [minScore, maxScore].
    // P(X >= target | X in [min, max]) = [Φ(target') - Φ(max')] / [Φ(min') - Φ(max')]
    // O cálculo anterior via zScore puro ignorava o fator de truncamento das barreiras,
    // gerando gaps > 3% em metas extremas (ex: OAB 40 pontos).
    const safeSD = projectedSD || 0.0001;
    const phiMin = normalCDF_complement((minScore - projectedMean) / safeSD);
    const phiMax = normalCDF_complement((maxScore - projectedMean) / safeSD);
    const phiTarget = normalCDF_complement((targetScore - projectedMean) / safeSD);

    // Clamp phiTarget para garantir que fique no domínio [phiMax, phiMin]
    const clampedPhiTarget = Math.max(phiMax, Math.min(phiMin, phiTarget));
    const truncNormFactor = Math.max(1e-10, phiMin - phiMax);

    let analyticalProbability;
    if (targetScore >= maxScore) {
        analyticalProbability = 0;
    } else if (targetScore <= minScore) {
        analyticalProbability = 100;
    } else {
        analyticalProbability = ((clampedPhiTarget - phiMax) / truncNormFactor) * 100;
    }

    // MC-02: Use raw empirical probability
    const empiricalProbability = safeSimulations > 0 ? (success / safeSimulations) * 100 : 0;

    const gap = Math.abs(empiricalProbability - analyticalProbability);
    if (gap > 3 && projectedSD > 0.1) {
        logger.warn(`MC gap: empírica=${empiricalProbability.toFixed(2)} analítica=${analyticalProbability.toFixed(2)} gap=${gap.toFixed(2)}`);
    }

    // BUG 5 FIX: Compute median for asymmetric sdLeft/sdRight anchoring
    const empMedian = getPercentile(allFinalScores, 0.5);

    return {
        // 🎯 BUG-C6 FIX: Remoção dos clamps (0.1/99.9).
        probability: Number.isFinite(empiricalProbability) ? empiricalProbability : (Number.isFinite(analyticalProbability) ? analyticalProbability : 0),
        analyticalProbability: Number.isFinite(analyticalProbability) ? analyticalProbability : 0,
        mean: Number(displayMean.toFixed(2)),
        sd: Number(projectedSD.toFixed(2)),
        // BUG-D + BUG 5 FIX: sdLeft/sdRight from empirical p16/p84 percentiles
        // anchored on MEDIAN (not mean). With skewed OU distributions, mean can
        // fall outside [p16, p84], producing misleading or clamped-to-floor values.
        // Median is always between p16 and p84 by definition.
        sdLeft: Number(Math.max(0.1, empMedian - getPercentile(allFinalScores, 0.16)).toFixed(2)),
        sdRight: Number(Math.max(0.1, getPercentile(allFinalScores, 0.84) - empMedian).toFixed(2)),
        ci95Low,
        ci95High,
        currentMean: Number((optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore).toFixed(2)),
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allFinalScores, displayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift,
        volatility,
        minScore,
        maxScore,
        method: useBootstrap ? "bootstrap" : "normal"
    };
}


// -----------------------------
// 🔥 Média Móvel Dinâmica (Melhoria 3)
// -----------------------------
/**
 * Calcula EMA com K (Alpha) dinâmico baseado na quantidade de dados.
 * - Poucos dados (Início): K mais alto (0.25) -> Reage rápido
 * - Muitos dados (Veterano): K mais baixo (0.12) -> Mais estável, mas sem ancorar demais o Monte Carlo
 */
export function calculateDynamicEMA(currentScore, previousEMA, dataCount, daysSinceLast = 1) {
    // D-06 FIX: K's reduzidos para preservação histórica.
    let baseK = 0.15; // Veterano (15+ dados)
    if (dataCount < 5) {
        baseK = 0.40; // Start frio
    } else if (dataCount < 15) {
        baseK = 0.25; // Intermediário
    }

    // ALERTA 1 FIX: Decaimento temporal injetado na EMA.
    // Se passou muito tempo desde o último teste, o novo teste ganha mais peso
    // para reagir ao esquecimento ou evolução do período sabático.
    // Half-life ~14 dias (lambda=0.05)
    const timeK = 1 - Math.exp(-0.05 * Math.max(1, daysSinceLast));

    // Pega o maior peso entre a volumetria bruta e a degradação pelo tempo
    const K = Math.max(baseK, timeK);

    // EMA Formula: Price(t) * k + EMA(y) * (1 – k)
    return (currentScore * K) + (previousEMA * (1 - K));
}

// ==========================================
// ADAPTERS FOR BACKWARD COMPATIBILITY
// ==========================================

export function calculateCurrentWeightedMean(categoryStats, totalWeight) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const safeWeight = Number(cat.weight) || 0;
        const normalizedWeight = safeWeight / totalWeight;
        return acc + (cat.mean * normalizedWeight);
    }, 0);
}

export default {
    calculateSlope,
    projectScore,
    monteCarloSimulation,
    calculateDynamicEMA, // Exportando a nova função
    calculateCurrentWeightedMean
};
