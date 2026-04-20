// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, randomNormal } from './random.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';

// Helper: Complementary Cumulative Distribution Function (1 - CDF) for Normal(0,1)
import { normalCDF_complement, generateKDE } from './math/gaussian.js';

// Helper: Ensure history is sorted by date and filter out invalid dates
export function getSortedHistory(history) {
    if (!history) return [];
    return [...history]
        .filter(h => h && h.date && !isNaN(new Date(h.date).getTime()))
        .sort((a, b) => {
            // CORREÇÃO: Forçar Meia-Noite UTC absoluto
            // Evita que o peso de decaimento Exponencial (Lambda) mude
            // se um aluno resolve a prova às 08h e o outro às 23h.
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            const utc_A = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
            const utc_B = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
            return utc_A - utc_B;
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

    const now = new Date(sortedHistory[sortedHistory.length - 1].date).getTime();

    const data = sortedHistory.map(h => {
        const time = new Date(h.date).getTime();
        const daysAgo = (now - time) / (1000 * 60 * 60 * 24);
        const weight = Math.exp(-lambda * daysAgo);

        return {
            x: -daysAgo,
            // Bug fix: h.score can be undefined when score is stored in other fields
            // (percentage, or computed from correct/total). getSafeScore() normalizes all formats.
            y: getSafeScore(h, maxScore),
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

    // FIX MATEMÁTICO: Calcular o Effective Sample Size (Kish) para variância
    const sumW = data.reduce((a, p) => a + p.w, 0);
    const sumW2 = data.reduce((a, p) => a + p.w * p.w, 0);
    const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : data.length;

    const wrss = data.reduce((acc, p) =>
        acc + p.w * Math.pow(p.y - (slope * p.x + intercept), 2), 0
    );
    // BUGFIX M3: O effectiveN (Kish) pode cair para perto de 2 em amostras antigas (λ=0.08).
    // Quando effectiveN -> 2, a variância explode (wrss / 0.001).
    // Implementamos um piso de (effectiveN - 1) graduado para estabilizar o erro padrão.
    // CORREÇÃO: Graus de liberdade exatos para regressão linear (N - 2).
    // O piso de 0.01 impede divisão nula sem subestimar a incerteza de amostras pequenas.
    const variance = wrss / Math.max(0.01, effectiveN - 2.0);
    // Nota: Sw já foi calculado acima como: const Sw = data.reduce((a, p) => a + p.w, 0);

    // ⚠️ ALERTA MATEMÁTICO: Sxx DEVE ser a soma dos quadrados CENTRALIZADA na média.
    // Sxx_centered = \\sum w_i (x_i - \\bar{x})^2 = Sxx - Sx^2 / Sw
    const Sxx_centered = Sxx - (Sx * Sx) / Sw;

    const slopeStdError = Sxx_centered > 0 ? Math.sqrt(variance / Sxx_centered) : 0;

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

    const baseLimit = 0.3 * scaleFactor; // Escalonado
    const absoluteMax = 0.45 * scaleFactor; // Escalonado

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
export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return 0;

    const slope = calculateSlope(sortedHistory, maxScore);

    const lastRawScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    let currentScore = lastRawScore;

    if (sortedHistory.length > 2) {
        let ema = getSafeScore(sortedHistory[0], maxScore);
        for (let i = 1; i < sortedHistory.length; i++) {
            ema = calculateDynamicEMA(getSafeScore(sortedHistory[i], maxScore), ema, i + 1);
        }
        // MELHORIA 2: Ancoragem Dinâmica. Veteranos (história longa) confiam mais na EMA.
        const emaWeight = Math.min(0.70, 0.10 + (sortedHistory.length * 0.03));
        const rawWeight = 1 - emaWeight;
        currentScore = (lastRawScore * rawWeight) + (ema * emaWeight);
    }

    // Relaxed damping: 45 instead of 30, allows more linear projection for longer
    const effectiveDays =
        45 * Math.log(1 + projectDays / 45);

    const projected =
        currentScore + slope * effectiveDays;

    // BUG-E FIX: projectScore must respect dynamic scoring bounds.
    // Previously hardcoded [0, 100] which truncated projections for exams
    // with maxScore > 100 (e.g. concurso 0-120).
    return Math.max(minScore, Math.min(maxScore, projected));
}

export function calculateVolatility(history, maxScore = 100) {
    if (!history || history.length < 2) {
        return 1.5;
    }

    // Ensure sorted history
    const sorted = getSortedHistory(history);

    // BUGFIX M1: Para exatamente 2 pontos (1 resíduo), a centralização falha. 
    // Extraímos a volatilidade empiricamente pelo 'spread normalizado'.
    if (sorted.length === 2) {
        const dt = Math.max(1, (new Date(sorted[1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000);
        const diff = Math.abs(getSafeScore(sorted[1], maxScore) - getSafeScore(sorted[0], maxScore));
        // REVISION: Floor standardized (escalonado)
        const scaleFactor = maxScore / 100;
        return Math.max(1.0 * scaleFactor, Math.min(maxScore * 0.15, diff / Math.sqrt(dt)));
    }
    // C2 FIX: Use rawDrift (unbiased WLS slope) for detrending instead of clamped calculateSlope.
    // calculateSlope applies confidence attenuation + dynamic limits — correct for deterministic
    // projection but biases statistical detrending, leaving systematic trend in residuals.
    const { slope: rawDriftVol } = weightedRegression(sorted, 0.08, maxScore);
    const now = new Date(sorted[sorted.length - 1].date).getTime();

    // Calculate weighted sum of squared differences (MSSD)
    let sumSw = 0;
    let sumWeights = 0;

    for (let i = 1; i < sorted.length; i++) {
        const h0 = sorted[i - 1];
        const h1 = sorted[i];

        const diff = getSafeScore(h1, maxScore) - getSafeScore(h0, maxScore);
        const time1 = new Date(h1.date).getTime();
        const time0 = new Date(h0.date).getTime();

        const daysAgo = (now - time1) / (1000 * 60 * 60 * 24);
        // FIX: Piso de tempo menor (0.1) para registrar a volatilidade extraída
        // de múltiplos simulados prestados num intervalo menor que 24h.
        const rawDaysBetween = Math.max(0.1, (time1 - time0) / (1000 * 60 * 60 * 24));
        const daysBetween = Math.min(90, rawDaysBetween); // RIGOR-08 FIX: Aumentado para 90d (era 30) para evitar inflar volatilidade em alunos infrequentes

        const detrendedDiff = diff - (rawDriftVol * daysBetween);
        // BUG 8 FIX: Consistência na normalização do tempo. 
        // Usamos um piso de 1.0 dia para evitar inflar a volatilidade intraday (daysBetween < 1).
        const timeScaleVol = Math.max(1.0, Math.sqrt(daysBetween));
        const residual = detrendedDiff / timeScaleVol;

        // Exponential weight focusing on recent volatility (lambda=0.05)
        const weight = Math.exp(-0.05 * daysAgo);

        // 🎯 BUG-V2 FIX: MSSD Robusto (Outlier Clamping).
        // Resíduos extremos (> 35pp/√dia) após longos gaps distorcem a volatilidade. 
        // Clampeamos em 3.5 SDs (assumindo sigma médio ~10) para manter robustez.
        // ESCALA INVARIANTE: 35 é re-escalonado.
        const scaleFactor = maxScore / 100;
        const clampedResidual = Math.max(-35 * scaleFactor, Math.min(35 * scaleFactor, residual));
        const dailyVariance = clampedResidual * clampedResidual;

        sumSw += dailyVariance * weight;
        sumWeights += weight;
    }

    const scaleFactorFallback = maxScore / 100;
    if (sumWeights === 0) return 1.5 * scaleFactorFallback;

    // MSSD (Mean Successive Squared Differences)
    const mssdVariance = sumSw / sumWeights;

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
    const currentScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : currentScore;

    if (forcedBaseline === undefined && sortedHistory.length > 2) {
        let ema = getSafeScore(sortedHistory[0], maxScore);
        for (let i = 1; i < sortedHistory.length; i++) {
            ema = calculateDynamicEMA(getSafeScore(sortedHistory[i], maxScore), ema, i + 1);
        }
        // MELHORIA 2: Ancoragem Dinâmica - Veteranos confiam mais no histórico (EMA).
        const emaWeight = Math.min(0.70, 0.10 + (sortedHistory.length * 0.03));
        const rawWeight = 1 - emaWeight;
        baselineScore = (currentScore * rawWeight) + (ema * emaWeight);
    }

    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;
    
    // 🎯 1. Calcular Tendência (Drift) + Incerteza (Epistemic)
    const { slope: rawDrift, slopeStdError } = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore)
        // FIX: O fallback de 1.5 precisa ser escalonado pela base da prova (senão fica inútil no Enem/OAB)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    const drift = calculateSlope(sortedHistory, maxScore); // Tendência clampeada para a média determinística
    const simulationDays = days; // Hoisted for C1 cap below
    // C1 FIX: Cap drift uncertainty to prevent bimodal explosion with short history.
    // ESCALA INVARIANTE: O teto 1.5 é escalonado via maxScore.
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    // BUG 2 FIX: A incerteza do slope em regressão linear cresce com T, não com sqrt(T).
    // Removemos a divisão por sqrt(simulationDays) para permitir a expansão linear correta.
    const driftUncertainty = Math.min(rawDriftUncertainty, 1.5 * scaleFactor);

    // 2. Extrair Resíduos (Bootstrap Source) NORMALIZADOS PELO TEMPO E SEM TENDÊNCIA
    // BUG 2 FIX: use getSafeScore() to handle entries without direct .score field
    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;

        const time1 = new Date(h.date).getTime();
        const time0 = new Date(sortedHistory[i - 1].date).getTime();
        
        // FIX: Consistência com o calculateVolatility, permitindo eventos intraday (0.1 dias mínimo)
        const rawDays = Math.max(0.1, (time1 - time0) / (1000 * 60 * 60 * 24));
        const daysBetween = Math.min(90, rawDays); // Alinhar com calculateVolatility

        // EXTRA FIX: Removemos o drift linear do 'change' para não haver double-counting
        // pois o loop de projeção já injeta o 'dayDrift' em cada iteração a cada passo.
        // FIX BUG 3: use daysBetween consistently
        // C2 FIX: Use rawDrift (unbiased WLS slope) for detrending residuals.
        // The clamped 'drift' applies confidence attenuation — correct for deterministic
        // projection but biases statistical detrending, leaving systematic trend in residuals.
        const detrendedChange = actualChange - (rawDrift * daysBetween);

        // M-02 FIX: Resíduo bruto normalizado pelo tempo.
        // CORREÇÃO (Fix Matemático 1):
        // O ruído de observação não deve ser dividido pela raiz de frações de tempo.
        // Adicionamos um piso de 1 dia (Math.max) para estabilizar a variância.
        const timeScale = Math.max(1.0, Math.sqrt(daysBetween));
        
        // 🎯 MATH BUG FIX 2: Reverter a Compressão de Fronteira Histórica.
        // Precisamos do 'Choque Standardizado'. Se não dividirmos pela restrição
        // de fronteira daquela data, o Monte Carlo vai amortecer a volatilidade DUAS vezes
        // (a primeira aqui no passado, a segunda durante o loop de simulação).
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

    // Calcula volatilidade clássica apenas para fallback
    const volatility = forcedVolatility !== undefined ? forcedVolatility : calculateVolatility(sortedHistory, maxScore);

    const lastScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    const scoreSum = Math.round(sortedHistory.reduce((s, h) => s + getSafeScore(h, maxScore), 0));
    // BUG-10 FIX: Preservar 2 casas decimais na entropia do seed
    const seed = sortedHistory.length * 997 + scoreSum * 13 + Math.round(lastScore * 100) * 31;
    const rng = mulberry32(seed);

    // 🎯 ALERTA 3.1 FIX: RNG Isolado para Decisões de Caminho (Path Choice)
    // Evita consumir o estado do PRNG principal entre chamadas ao Box-Muller (randomNormal),
    // garantindo que a sequência de choques (volatilidade) seja idêntica com a mesma seed
    // mesmo se as condições lógicas internas mudarem.
    const pathRng = mulberry32(seed + 777);

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
        const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;
        const inferredSD = Math.max(1.0 * scaleFactorFallback, (ciHigh - ciLow) / 3.92);
        const zScore = (targetScore - baseline) / (Number.isFinite(inferredSD) && inferredSD > 0 ? inferredSD : 1.0 * scaleFactorFallback);
        const rawProb = normalCDF_complement(Number.isFinite(zScore) ? zScore : 0) * 100;
        const probability = Number.isFinite(rawProb) ? rawProb : 0;

        return {
            probability: Number(probability.toFixed(1)),
            mean: Number(baseline.toFixed(1)),
            sd: Number(inferredSD.toFixed(1)),
            // BUG 3 FIX: Return all fields that the UI expects so GaussianPlot
            // doesn't fall back to the geometric solver when in "Hoje" mode.
            sdLeft: Number(inferredSD.toFixed(2)),
            sdRight: Number(inferredSD.toFixed(2)),
            ci95Low: Number(Math.max(minScore, ciLow).toFixed(1)),
            ci95High: Number(Math.min(maxScore, ciHigh).toFixed(1)),
            currentMean: Number((optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore).toFixed(1)),
            projectedMean: baseline,
            projectedSD: inferredSD,
            drift: 0,
            volatility,
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
    // With few residuals (2-3 points), the ratio volatility/_residualSD can be
    // highly unstable (e.g. 10-15×), causing shock amplification that pushes
    // simulations to absorbing barriers → bimodal KDE and CI=[0,100%].
    // Cap grows with √n: 2 res→4.4×, 5→5.2×, 25→8×, 144+→15×.
    const adaptiveMaxScale = Math.min(15.0, 3.0 + Math.sqrt(Math.max(1, residuals.length)));
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
    // Até onde o aluno naturalmente chegaria com a tendência atual.
    // MELHORIA 1: Diminishing Returns (Log-Damping do tempo) para o atrator Monte Carlo.
    const effectiveAttractorDays = 45 * Math.log(1 + simulationDays / 45);

    const bootstrapInvSqrt = 1.0;

    // Início do Monte Carlo
    for (let s = 0; s < safeSimulations; s++) {
        let score = baselineScore;

        // 🎯 Incerteza Epistêmica sobre o Potencial (Atrator)
        // Cada universo paralelo (simulação) tem um "Teto de Vidro" levemente diferente,
        // gerado pelo erro padrão da regressão linear.
        // SCALE-BOUNDS: clamp to dynamic domain
        // BUG 6 FIX: O processo OU é assintótico. Para que a média intersete o alvo no dia T,
        // o atrator (simMu) deve ser colocado além do alvo projetado.
        const targetChange = drift * effectiveAttractorDays;
        const convergenceFactor = 1 - Math.exp(-theta * simulationDays);
        const adjustedTargetMu = baselineScore + (targetChange / Math.max(0.01, convergenceFactor));

        const simMu = Math.max(
            minScore,
            Math.min(maxScore, adjustedTargetMu + (randomNormal(rng) * driftUncertainty * simulationDays))
        );

        for (let d = 0; d < simulationDays; d++) {
            let shock;

            // Extração do Ruído (Empírico ou Teórico)
            if (useBootstrap && residuals.length >= 6) {
                // MELHORIA 3: Injeção de "Black Swan". 
                // Mistura 90% Empírico (Bootstrap) com 10% Gaussiano (Teórico).
                // 🎯 ALERTA 3.1 FIX: Usar pathRng para não desalinhar o cache do Box-Muller (rng).
                if (pathRng() < 0.90) {
                    const randomResidual = residuals[Math.floor(pathRng() * residuals.length)];
                    shock = randomResidual * bootstrapTargetScale * bootstrapInvSqrt;
                } else {
                    shock = randomNormal(rng) * sigma;
                }
            } else {
                shock = randomNormal(rng) * sigma;
            }

            // 🧲 1. A Tração Determinística (Ornstein-Uhlenbeck)
            const deterministicPull = theta * (simMu - score);

            // 📊 2. Heterocedasticidade (Fator Binomial)
            // SCALE-BOUNDS FIX: Normalizar pela escala real da prova em vez de 100 fixo.
            // Mapeia score para [0, 1] relativo ao domínio real da prova.
            // 🎯 BUG 1.2 FIX: Proteção contra scoreRange = 0 para simulações estritas.
            const currentScoreRange = (maxScore - minScore) || maxScore || 1;
            const p = Math.max(0.001, Math.min(0.999, (score - minScore) / currentScoreRange));
            // BUG 2 FIX: Gentle power-law boundary damping instead of linear compression.
            // Previously: sqrt(p(1-p))*2 peaked at 1.0 (center) but dropped to 0.44 at
            // extremes, systematically compressing shocks by ~50% for non-centered scores.
            // New: 4p(1-p) raised to 0.25 gives smoother bounds dampening, preventing
            // harsh density piling at exact 0% and 100% barriers under massive volatility.
            // CORREÇÃO: Processo de Jacobi Exato (raiz quadrada) para amortecimento de fronteira correto.
            // Evita colisões violentas em 0 e maxScore que causam bimodalidade.
            const binomialVolatility = Math.pow(Math.max(0.05, 4 * p * (1 - p)), 0.5);

            // ⚙️ 3. O Passo Estocástico (Método Numérico de Euler-Maruyama)
            // BUG 1 FIX: Re-introdução da Heterocedasticidade Binomial.
            // O choque Gaussiano é modulado pela volatilidade binomial calculada acima.
            score += deterministicPull + (shock * binomialVolatility);

            // 🎯 ABSORBING BARRIER (Barreira Absorvente por Passo)
            // A truncatura é aplicada A CADA PASSO DIÁRIO, não pós-hoc.
            // Motivo matemático: numa prova de 0–100, um score de 102 não existe — o aluno tirou 100.
            // Ao clampar aqui, o loop OU continua no próximo dia com score=100 (teto real),
            // e a tração de reversão à média (theta * (mu - 100)) puxa-o naturalmente para baixo.
            // Resultado: nenhuma acumulação artificial de massa na fronteira (fim do pico espurio bimodal)
            // e nenhuma ficção (reflexão 102→98 que nunca aconteceu na realidade).
            score = Math.max(minScore, Math.min(maxScore, score));
        }

        // Score já está no domínio [minScore, maxScore] graças ao step-clamping acima.
        // Safety net redundante para defesa em profundidade.
        const viableScore = score;
        if (viableScore >= targetScore) success++;

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
    const ci95Low = Number(Math.max(minScore, rawLow).toFixed(1));
    const ci95High = Number(Math.min(maxScore, rawHigh).toFixed(1));

    const displayMean = Math.max(minScore, Math.min(maxScore, projectedMean));

    // 🎯 ALERTA 3.2 FIX: Probabilidade Analítica Normalizada para Truncamento [minScore, maxScore].
    // P(X >= target | X in [min, max]) = [Φ(target') - Φ(max')] / [Φ(min') - Φ(max')]
    // O cálculo anterior via zScore puro ignorava o fator de truncamento das barreiras,
    // gerando gaps > 3% em metas extremas (ex: OAB 40 pontos).
    const safeSD = projectedSD || 0.0001;
    const phiMin    = normalCDF_complement((minScore - projectedMean) / safeSD);
    const phiMax    = normalCDF_complement((maxScore - projectedMean) / safeSD);
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
        console.warn(`MC gap: empírica=${empiricalProbability.toFixed(1)} analítica=${analyticalProbability.toFixed(1)} gap=${gap.toFixed(1)}`);
    }

    // BUG 5 FIX: Compute median for asymmetric sdLeft/sdRight anchoring
    const empMedian = getPercentile(allFinalScores, 0.5);

    return {
        // 🎯 BUG-C6 FIX: Remoção dos clamps (0.1/99.9).
        probability: Number.isFinite(empiricalProbability) ? empiricalProbability : (Number.isFinite(analyticalProbability) ? analyticalProbability : 0),
        analyticalProbability: Number.isFinite(analyticalProbability) ? analyticalProbability : 0,
        mean: Number(displayMean.toFixed(1)),
        sd: Number(projectedSD.toFixed(1)),
        // BUG-D + BUG 5 FIX: sdLeft/sdRight from empirical p16/p84 percentiles
        // anchored on MEDIAN (not mean). With skewed OU distributions, mean can
        // fall outside [p16, p84], producing misleading or clamped-to-floor values.
        // Median is always between p16 and p84 by definition.
        sdLeft: Number(Math.max(0.1, empMedian - getPercentile(allFinalScores, 0.16)).toFixed(2)),
        sdRight: Number(Math.max(0.1, getPercentile(allFinalScores, 0.84) - empMedian).toFixed(2)),
        ci95Low,
        ci95High,
        currentMean: Number((optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore).toFixed(1)),
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allFinalScores, projectedMean, projectedSD, safeSimulations, minScore, maxScore),
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
