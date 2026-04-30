/**
 * Utilitários de Matemática Adaptativa para o Motor Estatístico
 */

export function getConfidenceMultiplier(sampleSize) {
    const n = Math.max(1, Number(sampleSize) || 1);
    if (n <= 2) return 2.8;

    // Aproximação contínua do t crítico bicaudal 95%
    const z = 1.959963984540054;
    const df = Math.max(1, n - 1);
    const c1 = (Math.pow(z, 3) + z) / (4 * df);
    const c2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
    const tApprox = z + c1 + c2;

    return Math.max(1.96, Math.min(3.2, tApprox));
}

export function winsorizeSeries(values, lowerPct = 0.05, upperPct = 0.95) {
    if (!Array.isArray(values) || values.length < 5) return values || [];

    const sorted = [...values].sort((a, b) => a - b);
    const lowIndex = Math.floor((sorted.length - 1) * lowerPct);
    const highIndex = Math.ceil((sorted.length - 1) * upperPct);
    const low = sorted[Math.max(0, lowIndex)];
    const high = sorted[Math.min(sorted.length - 1, highIndex)];

    return values.map(v => Math.max(low, Math.min(high, v)));
}

export function deriveAdaptiveConfig(scores = []) {
    const n = scores.length;
    const mean = n > 0 ? scores.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 1 ? scores.reduce((acc, s) => acc + ((s - mean) ** 2), 0) / (n - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const cv = mean !== 0 ? Math.min(2, Math.abs(sd / mean)) : 1;

    // Meia-vida dinâmica baseada em n e volatilidade
    const halfLife = Math.max(2, Math.round(Math.min(14, Math.sqrt(Math.max(1, n)) * (1 + cv))));
    const lambda = Math.pow(0.5, 1 / halfLife);
    const dynamicTail = Math.min(0.12, Math.max(0.03, 0.08 * (1 / Math.sqrt(Math.max(1, n))) + (cv * 0.02)));
    const trendSensitivity = 0.05 + Math.min(0.07, cv * 0.04);
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
    if (!Array.isArray(scores) || scores.length === 0) {
        return { effectiveN: 1, trendStrength: 0, adaptiveWinsor: { low: 0.05, high: 0.95 }, ciInflation: 1 };
    }

    const cfg = deriveAdaptiveConfig(scores);

    const weighted = [];
    for (let i = 0; i < scores.length; i++) {
        const age = scores.length - 1 - i;
        weighted.push(Math.pow(cfg.lambda, age));
    }

    const sumW = weighted.reduce((a, b) => a + b, 0);
    const sumW2 = weighted.reduce((a, b) => a + (b * b), 0);
    const effectiveN = Math.max(1, (sumW * sumW) / Math.max(1e-9, sumW2));

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, s) => acc + ((s - mean) ** 2), 0) / Math.max(1, scores.length - 1);
    const sd = Math.sqrt(Math.max(0, variance));
    const lastDelta = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;
    const trendStrength = sd > 0 ? Math.min(2.5, Math.abs(lastDelta) / sd) : 0;

    const ciInflation = Math.min(cfg.maxCIInflation, 1 + (trendStrength * cfg.trendSensitivity));

    return { effectiveN, trendStrength, adaptiveWinsor: { low: cfg.lowWinsor, high: cfg.highWinsor }, ciInflation };
}

export function deriveCoachAdaptiveParams(history = [], maxScore = 100, baseSimulations = 800) {
    const n = history.length;
    if (n === 0) {
        return { decayK: 0.07, minWeight: 0.03, scoreClampDelta: maxScore * 0.3, mcSimulations: baseSimulations };
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
    const mcSimulations = Math.round(Math.max(400, Math.min(2500, baseSimulations * (0.8 + cv * 0.7) * coverageFactor)));

    return { decayK, minWeight, scoreClampDelta, mcSimulations };
}
