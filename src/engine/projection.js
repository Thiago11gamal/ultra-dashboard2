// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, randomNormal } from './random.js';
import { getSafeScore } from '../utils/scoreHelper.js';

// Helper: Complementary Cumulative Distribution Function (1 - CDF) for Normal(0,1)
import { normalCDF_complement } from './math/gaussian.js';

// Helper: Ensure history is sorted by date and filter out invalid dates
export function getSortedHistory(history) {
    if (!history) return [];
    return [...history]
        .filter(h => h && h.date && !isNaN(new Date(h.date).getTime()))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
function weightedRegression(history, lambda = 0.08) {
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
        const dy = getSafeScore(p1) - getSafeScore(p0);
        const dt = Math.max(1, (new Date(p1.date) - new Date(p0.date)) / (1000 * 60 * 60 * 24));
        const slope = dy / dt;
        const intercept = getSafeScore(p1);
        // BUGFIX M4: Utilizar prior variância estipulada em ~20 em vez de hardcode 2.0
        // Para dt altos, o standard error cai (mais certeza no slope).
        const slopeStdError = Math.max(0.2, 4.5 / dt);
        return { slope, intercept, slopeStdError };
    }

    const now = new Date(sortedHistory[sortedHistory.length - 1].date).getTime();

    const data = sortedHistory.map(h => {
        const time = new Date(h.date).getTime();
        const daysAgo = (now - time) / (1000 * 60 * 60 * 24);
        const weight = Math.exp(-lambda * daysAgo);

        return {
            x: -daysAgo,
            // Bug fix: h.score can be undefined when score is stored in other fields
            // (percentage, or computed from correct/total). getSafeScore() normalizes all formats.
            y: getSafeScore(h),
            w: weight
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

// WLS: denominations for statistical degrees of freedom should be sample size-based
// Fix: Use n - 2 for real statistical degrees of freedom instead of Sw - 2
const n = data.length;
const wrss = data.reduce((acc, p) =>
    acc + p.w * Math.pow(p.y - (slope * p.x + intercept), 2), 0
);
const variance = wrss / Math.max(0.001, n - 2);
// Nota: Sw já foi calculado acima como: const Sw = data.reduce((a, p) => a + p.w, 0);

    // ⚠️ ALERTA MATEMÁTICO: Sxx DEVE ser a soma dos quadrados CENTRALIZADA na média.
    // Sxx_centered = \\sum w_i (x_i - \\bar{x})^2 = Sxx - Sx^2 / Sw
    const Sxx_centered = Sxx - (Sx * Sx) / Sw;

    const slopeStdError = Sxx_centered > 0 ? Math.sqrt(variance / Sxx_centered) : 0;

    return { slope, intercept, slopeStdError };
}

// 🎯 calculateSlope (compatível)
export function calculateSlope(history) {
    if (!history || history.length < 2) return 0;
    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return 0;

    const { slope, slopeStdError } = weightedRegression(sorted);
    const n = sorted.length;

    const confidence =
        1 / (1 + slopeStdError / 0.5);

    const historyBoost =
        Math.min(1.5, 0.9 + n / 15); // Baseline increased from 0.7 to 0.9

    const baseLimit = 0.3; // Base conservadora para pouco histórico
    const absoluteMax = 0.5; // Teto real para dados abundantes

    const dynamicLimit = Math.min(
        absoluteMax,
        baseLimit * historyBoost
    );

    const clamped = Math.max(
        -dynamicLimit,
        Math.min(dynamicLimit, slope)
    );

    return clamped * confidence;
}

export const calculateAdaptiveSlope = calculateSlope; // Alias

// 📈 projectScore (inalterado externamente)
export function projectScore(history, projectDays = 60) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return 0;

    const slope = calculateSlope(sortedHistory);

    const lastRawScore = getSafeScore(sortedHistory[sortedHistory.length - 1]);
    let currentScore = lastRawScore;

    if (sortedHistory.length > 2) {
        let ema = getSafeScore(sortedHistory[0]);
        for (let i = 1; i < sortedHistory.length; i++) {
            ema = calculateDynamicEMA(getSafeScore(sortedHistory[i]), ema, i + 1);
        }
        // Consistent blended baseline: 80% raw, 20% EMA
        currentScore = (lastRawScore * 0.8) + (ema * 0.2);
    }

    // Relaxed damping: 45 instead of 30, allows more linear projection for longer
    const effectiveDays =
        45 * Math.log(1 + projectDays / 45);

    const projected =
        currentScore + slope * effectiveDays;

    return Math.max(0, Math.min(100, projected));
}

export function calculateVolatility(history) {
    if (!history || history.length < 2) {
        return 1.5;
    }
    
    // Ensure sorted history
    const sorted = getSortedHistory(history);
    
    // BUGFIX M1: Para exatamente 2 pontos (1 resíduo), a centralização falha. 
    // Extraímos a volatilidade empiricamente pelo 'spread normalizado'.
    if (sorted.length === 2) {
        const dt = Math.max(1, (new Date(sorted[1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000);
        const diff = Math.abs(getSafeScore(sorted[1]) - getSafeScore(sorted[0]));
        // REVISION: Floor standardized to 1.0
        return Math.max(1.0, Math.min(15.0, diff / Math.sqrt(dt)));
    }
    // REVISION: Use RAW (unclamped) slope for detrending to avoid biasing volatility
    // with confidence-weighted or clamped drift.
    const { slope: rawDrift } = weightedRegression(sorted);
    const now = new Date(sorted[sorted.length - 1].date).getTime();
    
    // Calculate weighted sum of squared differences (MSSD)
    let sumSw = 0;
    let sumWeights = 0;

    for (let i = 1; i < sorted.length; i++) {
        const h0 = sorted[i - 1];
        const h1 = sorted[i];

        const diff = getSafeScore(h1) - getSafeScore(h0);
        const time1 = new Date(h1.date).getTime();
        const time0 = new Date(h0.date).getTime();

        const daysAgo = (now - time1) / (1000 * 60 * 60 * 24);
        const rawDaysBetween = Math.max(0.1, (time1 - time0) / (1000 * 60 * 60 * 24));
        const daysBetween = Math.min(30, rawDaysBetween);

        // REVISION: Correct detrending using rawDrift
        const detrendedDiff = diff - (rawDrift * rawDaysBetween);
        const residual = detrendedDiff / Math.sqrt(daysBetween);

        // Exponential weight focusing on recent volatility (lambda=0.05)
        const weight = Math.exp(-0.05 * daysAgo);

        // O quadrado do resíduo já é a variância diária (diff²/days)
        const dailyVariance = residual * residual;

        sumSw += dailyVariance * weight;
        sumWeights += weight;
    }

    if (sumWeights === 0) return 1.5;

    // MSSD (Mean Successive Squared Differences)
    const mssdVariance = sumSw / sumWeights;

    // REVISION: Standardized SD floor to 1.0
    return Math.sqrt(Math.max(1.0, mssdVariance));
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
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean } = options;
    const sortedHistory = getSortedHistory(history);

    // Safety check - allow at least 1 point for a flat projection
    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 0
    };

    // Fix: Baseline uses a more responsive EMA or forced value (Bayesian) to avoid anchoring.
    // BUG-04 FIX: Priority to forcedBaseline for stability as requested.
    const currentScore = getSafeScore(sortedHistory[sortedHistory.length - 1]);
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : currentScore;

    if (forcedBaseline === undefined && sortedHistory.length > 2) {
        let ema = getSafeScore(sortedHistory[0]);
        for (let i = 1; i < sortedHistory.length; i++) {
            ema = calculateDynamicEMA(getSafeScore(sortedHistory[i]), ema, i + 1);
        }
        baselineScore = (currentScore * 0.8) + (ema * 0.2);
    }

    // 1. Calcular Tendência (Drift)
    const { slope: rawDrift } = sortedHistory.length > 1 ? weightedRegression(sortedHistory) : { slope: 0 };
    const drift = calculateSlope(sortedHistory); // Tendência clampeada para o path determinístico

    // 2. Extrair Resíduos (Bootstrap Source) NORMALIZADOS PELO TEMPO
    // BUG 2 FIX: use getSafeScore() to handle entries without direct .score field
    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1]);
        const actualChange = getSafeScore(h) - prev;

        const time1 = new Date(h.date).getTime();
        const time0 = new Date(sortedHistory[i - 1].date).getTime();
        const rawDays = Math.max(1, (time1 - time0) / (1000 * 60 * 60 * 24));
        const daysBetween = Math.min(30, rawDays);

        // M-02 FIX: Resíduo bruto normalizado pelo tempo.
        // A média é removida na centralização abaixo (lines 289-291).
        return actualChange / Math.sqrt(daysBetween);
    }).slice(1) : [];

    // Math Fix: Centralizar resíduos para garantir que a média do choque seja rigorosamente zero.
    // Isso impede que o "sucesso" histórico do aluno vaze para o bootstrap inflando o drift.
    if (residuals.length > 0) {
        const resMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
        residuals = residuals.map(r => r - resMean);
    }

    // Fallback: Se histórico for muito curto (< 5), Bootstrap é perigoso. 
    // .slice(1) já removeu 1 elemento: 5 pontos de histórico → 4 resíduos.
    // Threshold correto para ativar bootstrap com 5 pontos é >= 4.
    const useBootstrap = residuals.length >= 4;

    // Calcula volatilidade clássica apenas para fallback
    const volatility = forcedVolatility !== undefined ? forcedVolatility : calculateVolatility(sortedHistory);

    const lastScore = getSafeScore(sortedHistory[sortedHistory.length - 1]);
    const scoreSum = Math.round(sortedHistory.reduce((s, h) => s + getSafeScore(h), 0));
    // Fix: Enhance seed uniqueness by adding lastScore and better multipliers
    const seed = sortedHistory.length * 997 + scoreSum * 13 + Math.round(lastScore) * 31;
    const rng = mulberry32(seed);

    let success = 0;
    // Math fix 2: Welford's online algorithm for numerically stable variance
    // Avoids catastrophic cancellation in (ΣX²/n − (ΣX/n)²) when mean is large
    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    if (days === 0) {
        const baseline = forcedBaseline !== undefined ? forcedBaseline : baselineScore;
        const { ciLow, ciHigh } = options.bayesianCI || {
            ciLow:  baseline - (volatility * 2),
            ciHigh: baseline + (volatility * 2)
        };
        // REVISION: Standardized floor to 1.0
        const inferredSD = Math.max(1.0, (ciHigh - ciLow) / 3.92);
        const zScore = (targetScore - baseline) / inferredSD;
        const probability = Math.min(99.9, Math.max(0.1, normalCDF_complement(zScore) * 100));

        return {
            probability: Number(probability.toFixed(1)),
            mean: Number(baseline.toFixed(1)),
            sd: Number(inferredSD.toFixed(1)),
            ci95Low: Number(Math.max(0, ciLow).toFixed(1)),
            ci95High: Number(Math.min(100, ciHigh).toFixed(1)),
            currentMean: Number((optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore).toFixed(1)),
            drift: 0,
            volatility,
            method: options.bayesianCI ? "bayesian_static" : "normal_static"
        };
    }

    // Math fix 1: Collect all final scores for empirical CI percentiles
    const safeSimulations = Math.max(1, simulations);
    const allFinalScores = new Float32Array(safeSimulations);

    // Hoist: calcular uma única vez antes dos loops
    // BUGFIX H1: _bootstrapScale só é relevante quando NÃO há forcedVolatility.
    // Quando forcedVolatility está presente, usamos randomNormal * volatility diretamente
    // para evitar a amplificação (volatility / _residualSD) que pode chegar a 10×.
    // BUG-30 FIX: Resíduos já foram centralizados (L291-293), consumindo 1 DoF.
    // Usar n (não n-1) para evitar dupla correção de Bessel.
    const _residualSD = (useBootstrap && residuals.length > 0)
        ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length))
        : 0;

    // BUG-05 FIX: Escala de rescaling para igualar volatility alvo
    // O bootstrapping original pode ter dispersão diferente da volatilidade paramétrica.
    // Garantimos que o SD total convirja para 'volatility'.
    const bootstrapTargetScale = _residualSD > 0
        ? Math.min(3.0, volatility / _residualSD)
        : 1;

    const simulationDays = days;
    const dayDrift = days === 0 ? 0 : drift;

    // BUG-06 FIX: Hoist calculations out of the simulation loops to save Math.sqrt calls
    const sigma = simulationDays > 0 ? volatility / Math.sqrt(simulationDays) : 0;
    const bootstrapInvSqrt = simulationDays > 0 ? (1 / Math.sqrt(simulationDays)) : 0;


    for (let s = 0; s < safeSimulations; s++) {
        let score = baselineScore;

        for (let d = 0; d < simulationDays; d++) {
            let shock;

            if (useBootstrap && residuals.length >= 4) {
                const randomResidual = residuals[Math.floor(rng() * residuals.length)];
                const jitter = (rng() - 0.5) * 0.1;
                // BUG-05/06: Usar escala normalizada e constante hoistada
                shock = (randomResidual + jitter) * bootstrapTargetScale * bootstrapInvSqrt;
            } else {
                // BUG-06: Usar sigma hoistado
                shock = randomNormal(rng) * sigma;
            }

            // MATH-05 FIX: Soma de Riemann centralizada (d + 0.5) para reduzir viés acumulado
            const dampedDrift = dayDrift * (45 / (45 + d + 0.5));
            score += dampedDrift + shock;
        }

        const finalScore = Math.max(0, Math.min(100, score));
        if (finalScore >= targetScore) success++;

        allFinalScores[s] = finalScore;

        // Welford online update (BUG-MATH-01: Usar score bruto, não clampado, para preservar SD real)
        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        const delta2 = score - welfordMean;
        welfordM2 += delta * delta2;
    }

    const projectedMean = welfordMean;
    const projectedVariance = welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0;
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    // Empirical percentiles — sort then pick P2.5 and P97.5
    allFinalScores.sort(); // Float32Array.sort() é numérico e estável sem comparator
    const p025idx = Math.min(safeSimulations - 1, Math.floor(safeSimulations * 0.025));
    // BUG-09 FIX: round é semanticamente correto para estatística de amostra
    const p975idx = Math.min(safeSimulations - 1, Math.round(safeSimulations * 0.975) - 1);
    const ci95Low = Number(Math.max(0, allFinalScores[p025idx]).toFixed(1));
    const ci95High = Number(Math.min(100, allFinalScores[p975idx]).toFixed(1));

    const displayMean = Math.max(0, Math.min(100, projectedMean));
    const ci95LowVal = parseFloat(ci95Low);
    const ci95HighVal = parseFloat(ci95High);
    const inferredSD = (ci95HighVal - ci95LowVal) / 3.92;
    
    // MC-03: Asymmetric SDs for Bayesian consistency (using clamped mean for label consistency)
    const sdLeft = (displayMean - ci95LowVal) / 1.96;
    const sdRight = (ci95HighVal - displayMean) / 1.96;

    // Bug 2: Usar sdLeft quando o teto de 100% artificialmente comprime o inferredSD
    const effectiveSD = (ci95HighVal >= 99.5) ? sdLeft : Math.max(1.0, inferredSD);

    const zScore = (targetScore - projectedMean) / effectiveSD;
    const analyticalProbability = normalCDF_complement(zScore) * 100;
    
    // MC-02: Use raw empirical probability
    const empiricalProbability = (success / safeSimulations) * 100;

    return {
        probability: Math.min(99.9, Math.max(0.1, empiricalProbability)),
        analyticalProbability: Math.min(99.9, Math.max(0.1, analyticalProbability)),
        mean: Number(displayMean.toFixed(1)),
        sd: Number(Math.max(1.0, inferredSD).toFixed(1)),
        sdLeft: Number(Math.max(1.0, sdLeft).toFixed(2)),
        sdRight: Number(Math.max(1.0, sdRight).toFixed(2)),
        ci95Low,
        ci95High,
        currentMean: Number((optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore).toFixed(1)),
        drift,
        volatility,
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
export function calculateDynamicEMA(currentScore, previousEMA, dataCount) {
    // D-06 FIX: K's reduzidos para não saltar violentamente com 1 simulado ruim.
    // Antes: K=0.60/0.45/0.30. Um simulado ruim derrubava baseline de 78→62%.
    // Agora: K=0.40/0.25/0.15. Reage, mas preserva mais o histórico acumulado.
    let K = 0.15; // Veterano (15+ dados) — era 0.30

    if (dataCount < 5) {
        K = 0.40; // Start frio — era 0.60
    } else if (dataCount < 15) {
        K = 0.25; // Intermediário — era 0.45
    }

    // EMA Formula: Price(t) * k + EMA(y) * (1 – k)
    return (currentScore * K) + (previousEMA * (1 - K));
}

// ==========================================
// ADAPTERS FOR BACKWARD COMPATIBILITY
// ==========================================

export function calculateCurrentWeightedMean(categoryStats, totalWeight) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const normalizedWeight = cat.weight / totalWeight;
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
