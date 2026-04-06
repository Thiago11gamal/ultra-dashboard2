export const SYNTHETIC_TOTAL_QUESTIONS = 100;
import { getSafeScore } from '../utils/scoreHelper.js';
// BUG-08 FIX: Importar calculateSlope para consistência com Monte Carlo
import { calculateSlope } from './projection.js';

export function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr) {
    if (!arr || arr.length < 1) return 0;

    const n = arr.length;
    const m = mean(arr);

    // B-02 FIX: n=1 has no sample variance, use pure prior (shrinkage)
    const sampleVar = n > 1 
        ? arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1)
        : 0;

    const POPULATION_SD = 12;
    // MATH-02 FIX: Reduzir KAPPA para 1.0 (antes era 2.0). 
    // Prior mais fraco permite que a consistência real do aluno domine o SD mais rápido.
    const KAPPA = 1;

    const adjustedVar =
        ((n - 1) * sampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) /
        ((n - 1) + KAPPA);

    // 🎯 MATH FIX: Piso dinâmico microscópico. 
    // Mantém a segurança de Z-Score sem destruir a precisão matemática de um estudo consistente.
    const MIN_SD_FLOOR = 0.001;
    return Math.max(MIN_SD_FLOOR, Math.sqrt(adjustedVar));

}

/**
 * DEPRECATED / UTILITY: Calcula a tendência histórica (slope) usando OLS linear.
 * Nota: Para o dashboard e Monte Carlo, use calculateSlope de projection.js, 
 * que implementa Regressão Ponderada Temporal (WLS).
 */
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

    const data = sorted.map(h => {
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

        // REVISION: Expanded T-Table (95% confidence) for smoother transition to Z=1.96
        const tDist95 = {
            1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57,
            6: 2.45,  7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23,
            11: 2.20, 12: 2.18, 13: 2.16, 14: 2.14, 15: 2.13,
            20: 2.08, 25: 2.06, 30: 2.04, 40: 2.02, 60: 2.00, 120: 1.98
        };
        
        let tCrit = 1.96;
        if (df <= 15) {
            tCrit = tDist95[df] || 1.96;
        } else {
            // MATH-03 FIX: Implement linear interpolation between table nodes
            const keys = Object.keys(tDist95).map(Number).filter(k => k >= 15).sort((a,b) => a-b);
            
            const lo = keys.filter(k => k <= df).at(-1);
            const hi = keys.find(k => k > df);
            
            if (lo && hi) {
                const t = (df - lo) / (hi - lo);
                tCrit = tDist95[lo] * (1 - t) + tDist95[hi] * t;
            } else {
                tCrit = tDist95[hi || lo] || 1.96;
            }
        }

        if (Math.abs(tStat) < tCrit) return 0;
    }

    // Multiplicar por 30 normaliza o trend para pp/30-dias (mais intuitivo)
    // Logo, um threshold de 0.5 equivale a +1.5pp em um mês
    return slope * 30; // pp/30-dias
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
            
            // LOGIC-1 FIX: Se não tem total/correct, usar score para criar entrada sintética (base 100 questões)
            if (total === 0 && h.score != null) {
                const pct = Math.min(1, Math.max(0, Number(h.score) / 100));
                total = SYNTHETIC_TOTAL_QUESTIONS;
                correct = Math.round(pct * SYNTHETIC_TOTAL_QUESTIONS);
            }
            
            if (total < 1) continue;
            const safeCorrect = Math.min(total, correct);
            alpha += safeCorrect;
            beta  += (total - safeCorrect);
        }
    }

    const n    = alpha + beta;
    const p    = alpha / n;
    const mean = p * 100;

    // FIX: Removido o Math.pow(0.03, 2) arbitrário que corrompia a Conjugação Bayesiana
    const baseVariance = (alpha * beta) / (n * n * (n + 1));
    const effectiveSd = Math.sqrt(baseVariance); 


    // REVISION: Improved CI Clamping to preserve symmetry where possible 
    // while respecting the physical 0-100 boundaries.
    const ciLow  = Math.max(0,   (p - 1.96 * effectiveSd) * 100);
    const ciHigh = Math.min(100, (p + 1.96 * effectiveSd) * 100);

    return {
        mean:  Number(mean.toFixed(2)),
        sd:    Number((effectiveSd * 100).toFixed(2)),
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

    // FIX: Variância Ponderada pelo número de questões por exame
    let variance = 0;
    if (totalQ > 0 && historyToUse.length > 1) {
        let wVarSum = 0;
        historyToUse.forEach(h => {
            const w = (Number(h.total) || 1);
            wVarSum += w * Math.pow(getSafeScore(h) - m, 2);
        });
        variance = wVarSum / totalQ;
    } else {
        variance = Math.pow(standardDeviation(scores), 2);
    }
    
    const sd = Math.max(Math.sqrt(variance), 1.0);
    const safeSD = sd;
    // BUG-08 FIX: Usar calculateSlope (weightedRegression) para consistência com Monte Carlo drift
    // calculateSlope retorna pp/dia (clampeado e atenuado por confiança).
    // Esta é a função CANÔNICA para tendências no dashboard.
    const slopePerDay = calculateSlope(historyToUse);
    // Converter para pp/30-dias para comparação com threshold
    const rawTrend = slopePerDay * 30;

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
        trendValue: rawTrend
    };
}
