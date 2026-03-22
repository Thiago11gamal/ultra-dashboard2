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
    // B-09 FIX: KAPPA fixo (prior equivalente a 2 simulados "fantasmas")
    const KAPPA = 2;

    const adjustedVar =
        ((n - 1) * sampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) /
        ((n - 1) + KAPPA);

    return Math.sqrt(adjustedVar);
}

export function calculateTrend(history) {
    if (!history || history.length < 3) return 0;

    // B-05 FIX: Ordenar antes de qualquer cálculo
    const sorted = [...history]
        .filter(h => h && h.date && !isNaN(new Date(h.date)))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sorted.length < 3) return 0;

    const lastValidItem = sorted[sorted.length - 1];
    if (!lastValidItem || !lastValidItem.date) return 0;

    const lastTime = new Date(lastValidItem.date).getTime();
    if (isNaN(lastTime)) return 0;
    const lastTimeDays = lastTime / (1000 * 60 * 60 * 24);

    const data = sorted.slice(-10).map(h => {
        if (!h || !h.date) return { x: 0, y: 0 };
        const time = new Date(h.date).getTime();
        return {
            x: isNaN(time) ? 0 : (time / (1000 * 60 * 60 * 24)) - lastTimeDays, // relative days from last exam
            y: getSafeScore(h)
        };
    });
    const n = data.length;
    if (n < 3) return 0;

    const x = data.map(p => p.x);
    const y = data.map(p => p.y);

    const meanX = mean(x);
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
            6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23
        };
        const tCrit = tDist95[df] || 2.0;

        if (Math.abs(tStat) < tCrit) return 0;
    }

    return slope * 10; // Normalized slope for UI display
}

/**
 * Nível Bayesiano Real — Modelo Beta-Binomial Conjugado
 * Prior: Beta(1,1) = Uniforme (Laplace Smoothing).
 * Assumimos total desconhecimento do Nível inicial do aluno (mais justo).
 * A cada simulado: alpha += acertos, beta += erros.
 * Retorna média posterior + IC 95%.
 */
export function computeBayesianLevel(history, alpha0 = 1, beta0 = 1) {
    let alpha = alpha0;
    let beta  = beta0;

    if (history && history.length > 0) {
        for (const h of history) {
            let total   = Number(h.total)   || 0;
            let correct = Number(h.correct) || 0;
            
            // LOGIC-1 FIX: Se não tem total/correct, usar score para criar entrada sintética (base 10 questões)
            if (total === 0 && h.score != null) {
                const pct = Math.min(1, Math.max(0, Number(h.score) / 100));
                // SYNTHETIC_TOTAL_QUESTIONS = 5
                total = 5;
                correct = Math.round(pct * 5);
            }
            
            if (total < 1) continue;
            alpha += correct;
            beta  += (total - correct);
        }
    }

    const n    = alpha + beta;
    const p    = alpha / n;
    const mean = p * 100;

    const variance    = (alpha * beta) / (n * n * (n + 1));
    const sd          = Math.sqrt(variance);
    const MIN_SD_PROP = 0.02; // floor epistêmico: mínimo 2 pontos percentuais de incerteza
    const effectiveSd = Math.max(sd, MIN_SD_PROP);

    const ciLow  = Math.max(0,   (p - 1.96 * effectiveSd) * 100);
    const ciHigh = Math.min(100, (p + 1.96 * effectiveSd) * 100);

    return {
        mean:  Number(mean.toFixed(2)),
        ciLow:  Number(ciLow.toFixed(2)),
        ciHigh: Number(ciHigh.toFixed(2)),
        alpha,
        beta,
        n,
    };
}

export function computeCategoryStats(history, weight) {
    if (!history || history.length === 0) return null;

    const validHistory = history.filter(h => (Number(h.total) || 0) > 0);
    const historyToUse = validHistory.length > 0 ? validHistory : history;

    const scores = historyToUse.map(h => getSafeScore(h));

    const totalQ = historyToUse.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
    const totalC = historyToUse.reduce((acc, h) => acc + (Number(h.correct) || 0), 0);
    const m = totalQ > 0 ? (totalC / totalQ) * 100 : mean(scores);

    const sd = standardDeviation(scores);
    // AUDIT FIX: SD fallback floor reduced to 2% (2 points) to respect Bayesian shrinkage and reward high consistency
    const safeSD = Math.max(sd, 2);
    const rawTrend = calculateTrend(historyToUse);

    let trendLabel = 'stable';
    if (rawTrend > 0.5) trendLabel = 'up';
    else if (rawTrend < -0.5) trendLabel = 'down';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight: weight,
        history: history,
        trend: trendLabel,
        trendValue: rawTrend,
        level: m > 70 ? 'ALTO' : m > 40 ? 'MÉDIO' : 'BAIXO'
    };
}
