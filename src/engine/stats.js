import { getSafeScore } from '../utils/scoreHelper.js';

export function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr) {
    if (!arr || arr.length < 2) return 0;

    const n = arr.length;
    const m = mean(arr);

    const sampleVar = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1);

    const POPULATION_SD = 12;
    const KAPPA = 3;

    const adjustedVar =
        ((n - 1) * sampleVar + KAPPA * (Math.pow(POPULATION_SD, 2))) /
        ((n - 1) + KAPPA);

    return Math.sqrt(adjustedVar);
}

export function calculateTrend(scores) {
    if (!scores || scores.length < 3) return 0;

    const recentScores = scores.slice(-10);
    const n = recentScores.length;

    const x = recentScores.map((_, i) => i);
    const y = recentScores;

    const meanX = (n - 1) / 2;
    const meanY = mean(y);

    let num = 0;
    let den = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        num += dx * (y[i] - meanY);
        den += dx * dx;
    }

    if (den === 0) return 0;

    const slope = num / den;

    let rss = 0;
    for (let i = 0; i < n; i++) {
        const pred = meanY + slope * (x[i] - meanX);
        rss += Math.pow(y[i] - pred, 2);
    }

    if (n <= 2) return 0;

    const sigma2 = rss / (n - 2);
    const seSlope = Math.sqrt(sigma2 / den);

    if (seSlope > 0) {
        const tStat = slope / seSlope;
        const df = n - 2;

        const tDist95 = {
            1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57,
            6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23,
            11: 2.20, 12: 2.18, 13: 2.16, 14: 2.14, 15: 2.13,
            20: 2.09, 25: 2.06, 30: 2.04, 60: 2.00, 120: 1.98
        };

        const getTCrit = (degreesOfFreedom) => {
            if (degreesOfFreedom >= 120) return 1.96;
            if (tDist95[degreesOfFreedom]) return tDist95[degreesOfFreedom];
            // Linear interpolation/fallback for ranges
            if (degreesOfFreedom > 30) return 2.00;
            if (degreesOfFreedom > 10) return 2.10;
            return 2.23;
        };

        const tCrit = getTCrit(df);

        if (Math.abs(tStat) < tCrit) return 0;
    }

    return slope * 10;
}

/**
 * Nível Bayesiano Real — Modelo Beta-Binomial Conjugado
 * Prior: Beta(3,3) = 6 questões fantasma centradas em 50%.
 * A cada simulado: alpha += acertos, beta += erros.
 * Retorna média posterior + IC 95%.
 */
export function computeBayesianLevel(history, alpha0 = 3, beta0 = 3) {
    let alpha = alpha0;
    let beta = beta0;

    if (history && history.length > 0) {
        for (const h of history) {
            let total = Math.max(0, Number(h.total) || 0);
            let correct = Math.min(total, Math.max(0, Number(h.correct) || 0));

            // Fallback: se não há total/correct, reconstruir com n sintético de 10 questões
            if (total === 0 && h.score != null) {
                const pct = Math.min(1, Math.max(0, Number(h.score) / 100));
                total = 10;
                correct = Math.round(pct * 10);
            }

            alpha += correct;
            beta += (total - correct);
        }
    }

    const n = alpha + beta;
    const p = alpha / n;
    const mean = p * 100;

    const variance = (alpha * beta) / (n * n * (n + 1));
    const sd = Math.sqrt(variance);

    const ciLow = Math.max(0, (p - 1.96 * sd) * 100);
    const ciHigh = Math.min(100, (p + 1.96 * sd) * 100);

    return {
        mean: Number(mean.toFixed(2)),
        ciLow: Number(ciLow.toFixed(2)),
        ciHigh: Number(ciHigh.toFixed(2)),
        alpha,
        beta,
        n,
    };
}

export function computeCategoryStats(history, weight) {
    if (!history || history.length === 0) return null;

    const historyToUse = history;

    const scores = historyToUse.map(h => getSafeScore(h));

    const totalQ = historyToUse.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
    const totalC = historyToUse.reduce((acc, h) => acc + (Number(h.correct) || 0), 0);
    const cumulativeMean = totalQ > 0 ? (totalC / totalQ) * 100 : mean(scores);

    // Dynamic Level Estimation (Responsive Baseline)
    let dynamicMean = cumulativeMean;
    if (scores.length > 0) {
        const lastScore = scores[scores.length - 1];
        if (scores.length > 2) {
            // EMA Calculation
            let ema = scores[0];
            for (let i = 1; i < scores.length; i++) {
                let K = 0.30;
                if (i < 5) K = 0.60;
                else if (i < 15) K = 0.45;
                ema = (scores[i] * K) + (ema * (1 - K));
            }
            // 70/30 Blend (Responsive vs Stable)
            dynamicMean = (lastScore * 0.7) + (ema * 0.3);
        } else {
            dynamicMean = lastScore;
        }
    }

    const m = dynamicMean;
    const sd = standardDeviation(scores);
    const safeSD = Math.max(sd, m * 0.02);
    const rawTrend = calculateTrend(scores);

    let trendLabel = 'stable';
    if (rawTrend > 0.5) trendLabel = 'up';
    else if (rawTrend < -0.5) trendLabel = 'down';

    return {
        mean: m,
        sd: safeSD,
        n: history.length,
        weight: weight,
        history: history,
        trend: trendLabel,
        trendValue: rawTrend
    };
}
