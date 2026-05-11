// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, makeNormalRng } from './random.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

// Helper: Complementary Cumulative Distribution Function (1 - CDF) for Normal(0,1)
import { sampleTruncatedNormal, normalCDF_complement } from './math/gaussian.js';
import { Z_95 } from './math/constants.js';

// Helper: Ensure history is sorted by date and filter out invalid dates
export function getSortedHistory(history) {
    if (!Array.isArray(history)) return [];
    return [...history]
        .filter(h => h && (h.date || h.createdAt) && !isNaN(new Date(h.date || h.createdAt).getTime()))
        .sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt);
            const dateB = new Date(b.date || b.createdAt);
            // Ordenação determinística por "dia UTC" para evitar variação por timezone do runtime.
            const utcA = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
            const utcB = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
            if (utcA !== utcB) return utcA - utcB;
            // Desempate determinístico intra-dia para evitar depender da estabilidade do sort do runtime.
            return dateA.getTime() - dateB.getTime();
        });
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const now = options.referenceDate || Date.now();
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = (now - new Date(hDate).getTime()) / (1000 * 60 * 60 * 24);
        const w = Math.exp(-lambda * t);
        const x = (new Date(hDate).getTime() - new Date(sorted[0].date || sorted[0].createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const y = getSafeScore(h, maxScore);

        sumW += w;
        sumWX += w * x;
        sumWY += w * y;
        sumWXX += w * x * x;
        sumWXY += w * x * y;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { slope: 0, intercept: sumWY / sumW, slopeStdError: 1.5 };

    const slope = (sumW * sumWXY - sumWX * sumWY) / det;
    const intercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    // Erro padrão robusto (ajustado para small samples)
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    const now = options.referenceDate || Date.now();
    const t0 = new Date(sorted[0].date || sorted[0].createdAt).getTime();
    let rss = 0, sumW = 0, sumWXX = 0, sumWX = 0;

    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const x = (new Date(hDate).getTime() - t0) / (1000 * 60 * 60 * 24);
        const y = getSafeScore(h, maxScore);
        const w = Math.exp(-lambda * (now - new Date(hDate).getTime()) / 86400000);
        const pred = intercept + slope * x;
        rss += w * Math.pow(y - pred, 2);
        sumW += w;
        sumWX += w * x;
        sumWXX += w * x * x;
    });

    const n = sorted.length;
    const variance = rss / Math.max(1, (n - 2));
    const det = sumW * sumWXX - sumWX * sumWX;

    if (Math.abs(det) < 1e-6) return 1.5;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------
export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate || Date.now();
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    let sumWeights = 0;
    let sumResidualsWeighted = 0;
    let sumSw = 0;

    const residualSamples = sorted.map(h => {
        const hDate = h.date || h.createdAt;
        const t = (now - new Date(hDate).getTime()) / 86400000;
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore);
        return { value: y, weight: w };
    });

    residualSamples.forEach(it => {
        sumWeights += it.weight;
        sumResidualsWeighted += it.weight * it.value;
        sumSw += it.weight * it.value * it.value;
    });

    const expectedResidual = sumResidualsWeighted / Math.max(1e-9, sumWeights);
    const n_res = sorted.length - 1;
    const bessel = n_res > 1 ? n_res / (n_res - 1) : 1;
    const mssdVariance = ((sumSw / Math.max(1e-9, sumWeights)) - (expectedResidual * expectedResidual)) * bessel;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = sortedArr.reduce((acc, it) => acc + it.weight, 0);
        let accW = 0;
        for (const it of sortedArr) {
            accW += it.weight;
            if (accW >= totalW * 0.5) return it.value;
        }
        return sortedArr[sortedArr.length - 1].value;
    };

    const medianResidual = weightedMedian(residualSamples);
    const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
    const mad = weightedMedian(absDev);
    const robustSigma = 1.4826 * mad;
    const robustVariance = robustSigma * robustSigma;
    const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

    return Math.sqrt(Math.max(Math.pow(1.0 * scaleFactorFallback, 2), blendedVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore));
    const meanVal = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / (scores.length - 1);
    return Math.sqrt(variance);
}

// -----------------------------
// MSSD — Mean Successive Squared Differences (BUG-MATH-01)
// Mede instabilidade SEM penalizar crescimento monotônico.
// Ex: [50,60,70] → SD=10 (penaliza), MSSD_root=10 (mesmo)
// Ex: [50,70,50,70] → SD=11.5, MSSD_root=20 (detecta oscilação)
// Ex: [50,55,60,65] → SD=6.5 (penaliza crescimento), MSSD_root=5 (correto: baixa instabilidade)
// -----------------------------
export function calculateMSSD(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore));
    let sumSqDiff = 0;
    for (let i = 1; i < scores.length; i++) {
        sumSqDiff += Math.pow(scores[i] - scores[i - 1], 2);
    }
    const mssd = sumSqDiff / (scores.length - 1);
    return Math.sqrt(mssd);
}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    const baseAlpha = 2 / (n + 1);
    // Ajusta alpha pelo tempo: quanto mais tempo passou, mais peso damos ao score atual (decay da memória)
    const timeWeight = 1 - Math.exp(-daysSinceLast / 7); // 7 dias como constante de tempo
    const alpha = Math.min(0.8, baseAlpha + (1 - baseAlpha) * timeWeight);
    return alpha * currentScore + (1 - alpha) * previousEMA;
}

// -----------------------------
// Drift Clampeado (Prevenção de outliers)
// IMP-MATH-06: λ adaptativo baseado no gap mediano entre sessões
// -----------------------------
export function calculateSlope(history, maxScore = 100, options = {}) {
    // Calcular λ adaptativo: alunos com sessões frequentes usam λ maior (memória curta)
    const sorted = getSortedHistory(history);
    let lambda = 0.08; // default
    if (sorted.length >= 3) {
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            const gap = Math.max(0.5, (new Date(sorted[i].date || sorted[i].createdAt) - new Date(sorted[i - 1].date || sorted[i - 1].createdAt)) / 86400000);
            gaps.push(gap);
        }
        gaps.sort((a, b) => a - b);
        const medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
        // λ ∈ [0.03, 0.12]: sessões frequentes → λ alto (esquece rápido), sessões espaçadas → λ baixo
        lambda = Math.max(0.03, Math.min(0.12, 0.03 + 0.08 * Math.exp(-medianGap / 10)));
    }
    const { slope } = weightedRegression(history, lambda, maxScore, options);
    // Limita drift diário a no máximo 0.5% da escala total (ex: 0.5 pts por dia no Enem)
    const limit = 0.005 * maxScore;
    return Math.max(-limit, Math.min(limit, slope));
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    return calculateSlope(history, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// Mapeia pontuações via transformação Logit para prever platôs reais
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    // Se histórico for muito curto, não há como formar uma curva em S
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate || Date.now();
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    
    // Limite assintótico (105% do teto para evitar estourar a matemática de limites)
    const L = maxScore + (maxScore * 0.05); 

    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = (now - new Date(hDate).getTime()) / 86400000;
        const w = Math.exp(-0.08 * t);
        const x = (new Date(hDate).getTime() - new Date(sorted[0].date || sorted[0].createdAt).getTime()) / 86400000;
        
        let y = getSafeScore(h, maxScore);
        // Protege contra log(0)
        y = Math.max(maxScore * 0.01, Math.min(maxScore * 0.99, y));

        // Transformação Logit
        const logitY = Math.log(y / (L - y));

        sumW += w;
        sumWX += w * x;
        sumWY += w * logitY;
        sumWXX += w * x * x;
        sumWXY += w * x * logitY;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { isLogistic: false };

    const k = (sumW * sumWXY - sumWX * sumWY) / det; // Taxa de crescimento
    const logitIntercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    return { 
        k, 
        intercept: logitIntercept, 
        isLogistic: true, 
        L, 
        t0: new Date(sorted[0].date || sorted[0].createdAt).getTime() 
    };
}

// -----------------------------
// Função projectScore Atualizada com Curva-S
// -----------------------------
export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: 0, marginOfError: 0 };

    const empiricalSD = calculateVolatility(sortedHistory, maxScore, minScore);
    
    // Tenta aplicar o modelo de regressão logística (Curva S)
    const logisticFit = logisticRegression(sortedHistory, maxScore, options);

    let projectedScore;
    const now = options.referenceDate || Date.now();

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        // 💡 Caminho A: Aplica a Curva-S para prever platô
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        
        // Reverte o logit para calcular a nota predita: Y = L / (1 + e^-(kX + intercept))
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent)); // Impede overflow
        
        projectedScore = L / (1 + Math.exp(safeExponent));
    } else {
        // Caminho B: Fallback Clássico Linear se os dados forem caóticos ou muito curtos
        const slope = calculateSlope(sortedHistory, maxScore, options);
        let ema = getSafeScore(sortedHistory[0], maxScore); 
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (new Date(sortedHistory[i].date || sortedHistory[i].createdAt) - new Date(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            ema = calculateDynamicEMA(getSafeScore(sortedHistory[i], maxScore), ema, i + 1, daysSinceLast);
        }
        const effectiveDays = 45 * Math.log(1 + projectDays / 45);
        projectedScore = ema + slope * effectiveDays;
    }

    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, options) : { slopeStdError: 0 };
    const effectiveDaysForError = 45 * Math.log(1 + projectDays / 45);
    const angularUncertainty = slopeStdError * effectiveDaysForError;
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(empiricalSD, 2));
    const marginOfError = 1.96 * predictionSD; 

    return {
        projected: Math.max(minScore, Math.min(maxScore, projectedScore)),
        marginOfError: Number(marginOfError.toFixed(2))
    };
}

/**
 * Calcula o Damping Base adaptativo baseado no histórico.
 * @returns {number} Valor entre 30 e 60.
 */
export function computeAdaptiveDampingBase({ sampleSize, drift, driftUncertainty, scaleFactor, normalizedVol }) {
    const n = Math.max(1, Number(sampleSize) || 1);
    const safeDrift = Number.isFinite(drift) ? drift : 0;
    const safeUncertainty = Math.max(1e-6, Number(driftUncertainty) || 0);
    const safeScale = Math.max(1e-6, Number(scaleFactor) || 1);
    const safeNormVol = Math.max(0, Number(normalizedVol) || 0);

    const nConfidence = 1 - Math.exp(-n / 12);
    const trendSNR = Math.abs(safeDrift) / Math.max(0.05 * safeScale, safeUncertainty);
    const trendConfidence = Math.tanh(trendSNR / 2);
    const volPenalty = Math.min(1, safeNormVol / 18);
    const confidenceScore = Math.max(0, Math.min(1, (0.5 * nConfidence) + (0.35 * trendConfidence) + (0.15 * (1 - volPenalty))));
    return 30 + (30 * confidenceScore);
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
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base' } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
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
            const daysSinceLast = Math.max(1, (new Date(sortedHistory[i].date || sortedHistory[i].createdAt) - new Date(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            ema = calculateDynamicEMA(getSafeScore(sortedHistory[i], maxScore), ema, i + 1, daysSinceLast);
        }
        
        if (forcedBaseline === undefined) {
            baselineScore = ema;
        }
    }

    // Bayesian Pooling: Incorporate weighted mean into smoothing if available
    // BUG-05 FIX: Move out of conditional to ensure optionsCurrentMean is always factored in
    if (optionsCurrentMean !== undefined) {
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const referenceNow = options.referenceDate || Date.now();
        const daysToNow = Math.max(1, (referenceNow - lastDate.getTime()) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * maxScore)));

    // 🎯 1. Calcular Tendência (Drift) + Incerteza (Epistemic)
    const { slopeStdError } = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, options)
        // FIX: O fallback de 1.5 precisa ser escalonado pela base da prova (senão fica inútil no Enem/OAB)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    const drift = calculateSlope(sortedHistory, maxScore, options); // Tendência clampeada para a média determinística
    const simulationDays = days; // Hoisted for C1 cap below
    // C1 FIX: Cap drift uncertainty to prevent bimodal explosion with short history.
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    // ESCALA INVARIANTE: O teto 1.5 foi reduzido para 0.4 para evitar colapso bimodal
    // em projeções longas com baixa confiança.
    let driftUncertainty = Math.min(rawDriftUncertainty, 0.4 * scaleFactor) * (scenarioCfg.ciMult || 1);

    // LOW-N ROBUSTNESS: Inflate epistemic uncertainty for small samples
    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5; // 1.0 at n=5, 0 at n=10
        driftUncertainty *= (1 + 0.4 * nFactor); // Inflate up to 40% at n=5
    }


    // 🎯 2. Calcular Volatilidade Robusta (MSSD + MAD Blended)
    const volatility = forcedVolatility !== undefined 
        ? forcedVolatility 
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);
    
    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    const thetaOU = Math.max(0.005, 0.1 / (1 + normalizedVolOU * 0.05));

    // 2. Extrair Resíduos (Bootstrap Source) NORMALIZADOS PELO TEMPO E SEM TENDÊNCIA
    // BUG 2 FIX: use getSafeScore() to handle entries without direct .score field
    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;

        const time1 = new Date(h.date || h.createdAt).getTime();
        const time0 = new Date(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt).getTime();

        const rawDays = Math.max(0.1, (time1 - time0) / (1000 * 60 * 60 * 24));
        const detrendedChange = actualChange - (drift * rawDays);

        // Normalização pela raiz do tempo (movimento browniano)
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    // Clamping de resíduos extremos (Huber-like)
    const resMedian = getPercentile(residuals, 50);
    const resMad = getPercentile(residuals.map(r => Math.abs(r - resMedian)), 50) || (1.0 * scaleFactor);
    const safeResiduals = residuals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    // 3. Simulação de Monte Carlo
    const results = [];
    // Seed fixa baseada na data e histórico para determinismo intra-dia
    // FIX-DETERMINISM: Removido baselineScore da semente para que cenários (base, cons, opt)
    // usem a mesma sequência de ruído, permitindo comparação direta estável.
    const seedStr = `${new Date().toISOString().split('T')[0]}-${sortedHistory.length}`;
    let seedValue = 0;
    for (let i = 0; i < seedStr.length; i++) seedValue = (seedValue << 5) - seedValue + seedStr.charCodeAt(i);
    const rng = mulberry32(Math.abs(seedValue));
    const normalRng = makeNormalRng(rng);

    // Damping factor: reduz a incerteza ao longo do tempo (reversão à média/estabilidade)
    // BUG-06 FIX: Damping factor adaptativo baseado na qualidade do histórico


    // BUG-MATH-02 FIX: O-U deve reverter para a média histórica ponderada, não para o baseline (último EMA).
    // Reverter para o baseline causa ancoragem: os ICs ficam artificialmente estreitos porque toda simulação
    // "puxa" de volta para a nota mais recente, impedindo cenários realistas de melhora ou piora.
    const historicalScores = sortedHistory.map(h => getSafeScore(h, maxScore));
    const historicalWeightedMean = historicalScores.length > 0
        ? historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length
        : baselineScore;
    // Blend: 70% média histórica + 30% baseline recente (para não ignorar completamente a tendência recente)
    const ouTarget = 0.7 * historicalWeightedMean + 0.3 * baselineScore;

    // BUG-MATH-01 FIX: Normalização da Volatilidade Diária
    // A volatilidade clássica (SD) é total. Para o laço diário do Monte Carlo, 
    // precisamos da taxa diária (SD_daily = SD_total / sqrt(gap_médio)).
    let medianGap = 7;
    if (sortedHistory.length >= 2) {
        const gaps = [];
        for (let j = 1; j < sortedHistory.length; j++) {
            const g = (new Date(sortedHistory[j].date || sortedHistory[j].createdAt) - new Date(sortedHistory[j - 1].date || sortedHistory[j - 1].createdAt)) / 86400000;
            gaps.push(Math.max(0.5, g));
        }
        gaps.sort((a, b) => a - b);
        medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
    }
    const dailyVolatility = volatility / Math.sqrt(Math.max(1, medianGap));

    for (let i = 0; i < simulations; i++) {
        // Sample epistemic uncertainty (Drift)
        // BUG 1 FIX: Use truncated normal for drift to avoid "black swan" slopes in long projections
        const sampledDrift = sampleTruncatedNormal(drift, driftUncertainty, -0.01 * maxScore, 0.01 * maxScore, rng);

        let currentSimScore = baselineScore;
        for (let d = 1; d <= simulationDays; d++) {
            const driftEffect = sampledDrift * 1;
            // BUG-MATH-02 FIX: O alvo de reversão deve se mover junto com a tendência (Trend-Stationary O-U)
            // para evitar o achatamento artificial da curva de projeção (Flatlining).
            const dynamicOuTarget = ouTarget + (sampledDrift * d);
            const meanReversion = thetaOU * (dynamicOuTarget - currentSimScore) * 1;
            let shock;
            if (safeResiduals.length > 5 && rng() > 0.3) {
                shock = safeResiduals[Math.floor(rng() * safeResiduals.length)];
            } else {
                // BUG-MATH-01: Usar dailyVolatility em vez da volatilidade total
                shock = normalRng() * dailyVolatility;
            }
            currentSimScore += driftEffect + meanReversion + shock;
        }

        results.push(Math.max(minScore, Math.min(maxScore, currentSimScore)));
    }

    // 4. Agregação Estatística
    results.sort((a, b) => a - b);
    const meanResult = results.reduce((a, b) => a + b, 0) / simulations;
    const successes = results.filter(r => r >= targetScore).length;

    // BUG-3 FIX: Calcular a probabilidade analítica real usando a Normal Truncada
    // em vez de copiar a empírica como fallback.
    const finalSD = calculateVolatility(results.map(r => ({ score: r })), maxScore, minScore);
    const empiricalProb = (successes / simulations) * 100;

    let analyticalProb = empiricalProb; // fallback
    // BUG-3 FIX: Calcular via fórmula truncada direta (normalCDF_complement importado no topo)
    if (finalSD > 1e-6) {
        const phiMin = normalCDF_complement((minScore - meanResult) / finalSD);
        const phiMax = normalCDF_complement((maxScore - meanResult) / finalSD);
        const phiTarget = normalCDF_complement((targetScore - meanResult) / finalSD);
        const truncFactor = Math.max(1e-10, phiMin - phiMax);
        const clampedPhiTarget = Math.max(phiMax, Math.min(phiMin, phiTarget));

        if (targetScore >= maxScore) {
            analyticalProb = 0;
        } else if (targetScore <= minScore) {
            analyticalProb = 100;
        } else {
            analyticalProb = truncFactor > 1e-18
                ? ((clampedPhiTarget - phiMax) / truncFactor) * 100
                : empiricalProb;
        }
        analyticalProb = Math.min(100, Math.max(0, analyticalProb));
    }

    return {
        probability: empiricalProb,
        analyticalProbability: Number(analyticalProb.toFixed(4)),
        mean: Number(meanResult.toFixed(2)),
        sd: Number(finalSD.toFixed(2)),
        // BUG-GLOBAL-01 FIX: getPercentile espera p em [0,1], não [0,100].
        // Antes: 2.5 e 97.5 → p>=1 retornava último elemento → CI = [minScore, maxScore] sempre.
        ci95Low: Number(getPercentile(results, 0.025).toFixed(2)),
        ci95High: Number(getPercentile(results, 0.975).toFixed(2)),
        currentMean: Number(baselineScore.toFixed(2)),
        drift: Number((drift * 30).toFixed(2)),
        volatility: Number(volatility.toFixed(2)),
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high'
    };
}
