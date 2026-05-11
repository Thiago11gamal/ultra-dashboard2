/**
 * Utilitários de Matemática Adaptativa para o Motor Estatístico
 */

export function getConfidenceMultiplier(sampleSize, options = {}) {
    const nRaw = Number(sampleSize);
    const allowFractional = options?.allowFractional === true;
    const nBase = Number.isFinite(nRaw) ? nRaw : 1;
    const n = Math.max(1, allowFractional ? nBase : Math.round(nBase));
    const df = Math.max(allowFractional ? 0.1 : 1, n - 1);

    // t crítico bicaudal 95% (quantil 0.975) para amostras pequenas.
    // Evita subestimar IC quando n é baixo.
    const smallSampleTCritical = {
        1: 12.706,
        2: 4.303,
        3: 3.182,
        4: 2.776,
        5: 2.571,
        6: 2.447,
        7: 2.365,
        8: 2.306,
        9: 2.262,
        10: 2.228,
        11: 2.201,
        12: 2.179,
        13: 2.160,
        14: 2.145,
        15: 2.131,
        16: 2.120,
        17: 2.110,
        18: 2.101,
        19: 2.093,
        20: 2.086,
        21: 2.080,
        22: 2.074,
        23: 2.069,
        24: 2.064,
        25: 2.060,
        26: 2.056,
        27: 2.052,
        28: 2.048,
        29: 2.045,
        30: 2.042
    };

    if (df <= 30) {
        const lowDf = Math.floor(df);
        const highDf = Math.ceil(df);
        const lowT = smallSampleTCritical[lowDf] ?? smallSampleTCritical[1];
        const highT = smallSampleTCritical[highDf] ?? smallSampleTCritical[30];
        if (lowDf === highDf) return lowT;
        const w = df - lowDf;
        return (lowT * (1 - w)) + (highT * w);
    }

    // Aproximação assintótica para df altos (erro pequeno para df > 30)
    const z = 1.959963984540054;
    const c1 = (Math.pow(z, 3) + z) / (4 * df);
    const c2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
    const tApprox = z + c1 + c2;

    // Limites de sanidade (sem truncar agressivamente amostras pequenas)
    return Math.max(1.96, Math.min(6.0, tApprox));
}

export function winsorizeSeries(values, lowerPct = 0.05, upperPct = 0.95) {
    if (!Array.isArray(values)) return [];

    // Sanitiza percentis para evitar intervalos inválidos (ex: lower > upper)
    const lowerClamped = Number.isFinite(lowerPct) ? Math.min(1, Math.max(0, lowerPct)) : 0.05;
    const upperClamped = Number.isFinite(upperPct) ? Math.min(1, Math.max(0, upperPct)) : 0.95;
    const lowQ = Math.min(lowerClamped, upperClamped);
    const highQ = Math.max(lowerClamped, upperClamped);

    // CORREÇÃO: Se mais de 50% dos dados forem inválidos, não forçar estabilidade
    const nullCount = values.filter(v => !Number.isFinite(v)).length;
    if (nullCount > values.length * 0.5) {
        // Retorna a série original para que o motor detete a incerteza alta
        return values.map(v => Number.isFinite(v) ? v : 0); 
    }
 
    const finiteValues = values.filter(v => Number.isFinite(v));
    // BUGFIX (data-shape): preservar o comprimento da série mesmo sem valores finitos.
    // Alguns consumidores assumem alinhamento 1:1 com a série original.
    if (finiteValues.length === 0) return values.map(() => 0);
    if (finiteValues.length < 5) {
        const fallback = finiteValues.length > 0
            ? finiteValues.reduce((a, b) => a + b, 0) / finiteValues.length
            : 0;
        return values.map(v => Number.isFinite(v) ? v : fallback);
    }

    const sorted = [...finiteValues].sort((a, b) => a - b);
    const lowIndex = Math.floor((sorted.length - 1) * lowQ);
    const highIndex = Math.ceil((sorted.length - 1) * highQ);
    const low = sorted[Math.max(0, lowIndex)];
    const high = sorted[Math.min(sorted.length - 1, highIndex)];
    const mid = sorted.length / 2;
    const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[Math.floor(mid)];

    return values.map((v) => {
        if (!Number.isFinite(v)) return median;
        return Math.max(low, Math.min(high, v));
    });
}

export function deriveAdaptiveConfig(scores = []) {
    const finiteScores = Array.isArray(scores) ? scores.filter(v => Number.isFinite(v)) : [];
    const n = finiteScores.length;
    const mean = n > 0 ? finiteScores.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 1 ? finiteScores.reduce((acc, s) => acc + ((s - mean) ** 2), 0) / (n - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const cv = mean !== 0 ? Math.min(2, Math.abs(sd / mean)) : 1;

    // Meia-vida dinâmica baseada em n e volatilidade
    const halfLife = Math.max(2, Math.round(Math.min(14, Math.sqrt(Math.max(1, n)) * (1 + cv))));
    const lambda = Math.pow(0.5, 1 / halfLife);
    const dynamicTail = Math.min(0.12, Math.max(0.03, 0.08 * (1 / Math.sqrt(Math.max(1, n))) + (cv * 0.02)));
    // BUGFIX: sensibilidade mínima muito alta ampliava ruído em séries curtas.
    const trendSensitivity = 0.03 + Math.min(0.06, cv * 0.04);
    const maxCIInflation = 1.1 + Math.min(0.25, cv * 0.12);

    return {
        lambda,
        lowWinsor: dynamicTail,
        highWinsor: 1 - dynamicTail,
        trendSensitivity,
        maxCIInflation
    };
}

export function computeAdaptiveSignal(scores = []) {
    const finiteScores = Array.isArray(scores) ? scores.filter(v => Number.isFinite(v)) : [];
    if (finiteScores.length === 0) {
        return { effectiveN: 1, trendStrength: 0, adaptiveWinsor: { low: 0.05, high: 0.95 }, ciInflation: 1 };
    }

    const cfg = deriveAdaptiveConfig(finiteScores);

    const weighted = [];
    for (let i = 0; i < finiteScores.length; i++) {
        const age = finiteScores.length - 1 - i;
        weighted.push(Math.pow(cfg.lambda, age));
    }

    const sumW = weighted.reduce((a, b) => a + b, 0);
    const sumW2 = weighted.reduce((a, b) => a + (b * b), 0);
    const effectiveN = Math.max(1, (sumW * sumW) / Math.max(1e-9, sumW2));
    
    // FIX BUG 6: Denominador de Kish previne subestimação da variância (Overconfidence)
    const kishDenom = Math.max(1e-9, sumW - (sumW2 / sumW));

    const weightedMean = finiteScores.reduce((acc, s, i) => acc + (s * weighted[i]), 0) / Math.max(1e-9, sumW);

    // Robustez adaptativa: Huber-like clipping guiado por MAD para reduzir impacto de outliers
    const sorted = [...finiteScores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDev.length % 2 === 0
        ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
        : absDev[Math.floor(absDev.length / 2)];
    const robustSigma = Math.max(1e-6, 1.4826 * mad);
    const huberK = 2.5 * robustSigma;

    const weightedVariance = finiteScores.reduce((acc, s, i) => {
        const d = s - weightedMean;
        const clipped = Math.max(-huberK, Math.min(huberK, d));
        return acc + (weighted[i] * clipped * clipped);
    }, 0) / kishDenom; // Aplicar a divisão de Kish aqui!
    const sd = Math.sqrt(Math.max(0, weightedVariance));
    // Reduz sensibilidade a ruído usando média dos últimos deltas (até 4 passos).
    const k = Math.min(4, Math.max(1, finiteScores.length - 1));
    const recentDeltas = [];
    for (let i = finiteScores.length - k; i < finiteScores.length; i++) {
        if (i <= 0) continue;
        recentDeltas.push(finiteScores[i] - finiteScores[i - 1]);
    }
    const avgRecentDelta = recentDeltas.length > 0
        ? recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length
        : 0;
    // BUGFIX: quando sd≈0, qualquer delta pequeno explodia numericamente.
    const trendStrength = sd > 1e-9 ? Math.min(2.5, Math.abs(avgRecentDelta) / sd) : 0;

    const ciInflationRaw = 1 + (trendStrength * cfg.trendSensitivity);
    const ciInflation = Math.max(1, Math.min(cfg.maxCIInflation, ciInflationRaw));

    return { effectiveN, trendStrength, adaptiveWinsor: { low: cfg.lowWinsor, high: cfg.highWinsor }, ciInflation };
}

// NOTE: deriveCoachAdaptiveParams lives in coachAdaptive.js (canonical version).
// This file previously had a duplicate with a slightly different signature.
// Removed to avoid confusion and dead code.

// ─────────────────────────────────────────────────────────────────
// ADAPT-03: Unified Adaptive Confidence Shrinkage
// Substitui os 3 padrões diferentes de shrinkage espalhados pelo codebase:
//   1. shrinkProbabilityToNeutral (calibration.js) — penalidade de calibração
//   2. extraLowSampleShrink (coachAdaptive.js:278) — amostra pequena
//   3. POPULATION_SD prior (stats.js:44) — prior Bayesiano
//
// Esta função unifica o conceito: dado um estimador (probabilidade, média, etc.),
// qual é o fator de shrinkage adequado considerando TODOS os sinais de incerteza?
// ─────────────────────────────────────────────────────────────────
export function adaptiveConfidenceShrinkage(options = {}) {
    const {
        sampleSize = 1,
        calibrationPenalty = 0,
        trendStrength = 0,
        neutralValue = 50,
        maxShrink = 0.6
    } = options;

    const n = Math.max(1, Number(sampleSize) || 1);
    const calPen = Math.max(0, Math.min(1, Number(calibrationPenalty) || 0));
    const trend = Math.max(0, Math.min(5, Number(trendStrength) || 0));

    // Componente 1: Sample size shrinkage (1/√n decay)
    // n<5: forte shrinkage (~0.45), n=15: moderado (~0.26), n>30: mínimo (~0.18)
    const sampleShrink = Math.max(0, 1 / Math.sqrt(n));

    // Componente 2: Calibração (quanto pior a calibração, mais puxamos para o neutro)
    const calibShrink = calPen * 0.8; // escalar para não dominar

    // Componente 3: Trend uncertainty (tendência forte = mais incerteza no futuro, não no presente)
    const trendShrink = Math.min(0.15, trend * 0.04);

    // FIX BUG 3: A tendência foi removida da contração da média. 
    // Pesos redistribuídos para amostra (60%) e calibração (40%)
    const rawShrink = (sampleShrink * 0.60) + (calibShrink * 0.40); 
    const finalShrink = Math.max(0, Math.min(maxShrink, rawShrink));

    return {
        shrinkFactor: Number(finalShrink.toFixed(4)),
        trendUncertaintyPenalty: Number(trendShrink.toFixed(4)), // Exporta para o Monte Carlo inflar o desvio padrão
        components: {
            sampleShrink: Number(sampleShrink.toFixed(4)),
            calibShrink: Number(calibShrink.toFixed(4)),
            trendShrink: Number(trendShrink.toFixed(4))
        },
        // Helper: aplica o shrinkage a um valor
        apply: (value) => {
            const v = Number(value) || 0;
            return v * (1 - finalShrink) + neutralValue * finalShrink;
        }
    };
}

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-07: Ponte entre computeAdaptiveSignal e o pipeline do Coach
// Exporta um peso consolidado que indica quanta confiança o motor deve
// depositar nas previsões atuais vs. recuar para priors conservadores.
// ─────────────────────────────────────────────────────────────────
export function computeAdaptiveCoachWeight(scores = []) {
    const signal = computeAdaptiveSignal(scores);
    
    // effectiveN alto + trendStrength baixo = alta confiança
    // effectiveN baixo OU trendStrength alto = baixa confiança (mais conservador)
    const nConfidence = Math.min(1, signal.effectiveN / 15); // Satura em ~15 amostras efetivas
    const trendUncertainty = Math.min(1, signal.trendStrength / 2.5); // Normaliza para [0,1]
    
    // Peso de confiança: 0 = totalmente conservador, 1 = totalmente empírico
    const confidenceWeight = Math.max(0, Math.min(1, 
        nConfidence * 0.7 + (1 - trendUncertainty) * 0.3
    ));

    return {
        confidenceWeight: Number(confidenceWeight.toFixed(4)),
        effectiveN: Number(signal.effectiveN.toFixed(2)),
        trendStrength: Number(signal.trendStrength.toFixed(4)),
        ciInflation: Number(signal.ciInflation.toFixed(4)),
        adaptiveWinsor: signal.adaptiveWinsor
    };
}
