/**
 * Utilitários de Matemática Adaptativa para o Motor Estatístico
 */

export function getConfidenceMultiplier(sampleSize) {
    const nRaw = Number(sampleSize);
    const n = Math.max(1, Number.isFinite(nRaw) ? nRaw : 1);
    const df = Math.max(1, n - 1);

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
    const medianIndex = Math.floor((sorted.length - 1) * 0.5);
    const low = sorted[Math.max(0, lowIndex)];
    const high = sorted[Math.min(sorted.length - 1, highIndex)];
    const median = sorted[Math.max(0, Math.min(sorted.length - 1, medianIndex))];

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

    const weightedMean = finiteScores.reduce((acc, s, i) => acc + (s * weighted[i]), 0) / Math.max(1e-9, sumW);
    const weightedVariance = finiteScores.reduce((acc, s, i) => {
        const d = s - weightedMean;
        return acc + (weighted[i] * d * d);
    }, 0) / Math.max(1e-9, sumW);
    const sd = Math.sqrt(Math.max(0, weightedVariance));
    const lastDelta = finiteScores.length >= 2
        ? finiteScores[finiteScores.length - 1] - finiteScores[finiteScores.length - 2]
        : 0;
    // BUGFIX: quando sd≈0, qualquer delta pequeno explodia numericamente.
    const trendStrength = sd > 1e-9 ? Math.min(2.5, Math.abs(lastDelta) / sd) : 0;

    const ciInflationRaw = 1 + (trendStrength * cfg.trendSensitivity);
    const ciInflation = Math.max(1, Math.min(cfg.maxCIInflation, ciInflationRaw));

    return { effectiveN, trendStrength, adaptiveWinsor: { low: cfg.lowWinsor, high: cfg.highWinsor }, ciInflation };
}

// NOTE: deriveCoachAdaptiveParams lives in coachAdaptive.js (canonical version).
// This file previously had a duplicate with a slightly different signature.
// Removed to avoid confusion and dead code.
