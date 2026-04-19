export const SYNTHETIC_TOTAL_QUESTIONS = 100;
import { getSafeScore } from '../utils/scoreHelper.js';
// BUG-08 FIX: Importar calculateSlope para consistência com Monte Carlo
import { calculateSlope } from './projection.js';

export function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr, maxScore = 100) {
    if (!arr || arr.length < 1) return 0;

    const n = arr.length;
    const m = mean(arr);

    // B-02 FIX: n=1 has no sample variance, use pure prior (shrinkage)
    const sampleVar = n > 1 
        ? arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1)
        : 0;

    // MATH FIX: O prior de incerteza (POPULATION_SD) deve ser ancorado na escala do concurso (maxScore),
    // não na nota máxima detectada no array, para evitar que alunos com notas altas
    // tenham uma incerteza "inflada" artificialmente.
    const POPULATION_SD = maxScore * 0.12; // 12% da escala total
    const KAPPA = 1;

    const adjustedVar =
        ((n - 1) * sampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) /
        ((n - 1) + KAPPA);

    // 🎯 MATH FIX: Piso dinâmico microscópico. 
    // Mantém a segurança de Z-Score sem destruir a precisão matemática de um estudo consistente.
    const MIN_SD_FLOOR = 0.0001 * maxScore;
    return Math.max(MIN_SD_FLOOR, Math.sqrt(adjustedVar));

}

/**
 * @internal DEPRECATED / UTILITY: Calcula a tendência histórica (slope) usando OLS linear.
 * Nota: Para o dashboard e Monte Carlo, use calculateSlope de projection.js, 
 * que implementa Regressão Ponderada Temporal (WLS).
 */
function calculateTrend(history, maxScore = 100) {
    if (!history || history.length < 3) return 0;

    const sorted = [...history]
        .filter(h => h && h.date && !isNaN(new Date(h.date)))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const data = sorted.map(h => {
        const time = new Date(h.date).getTime();
        return {
            x: time / (1000 * 60 * 60 * 24),
            y: getSafeScore(h, maxScore)
        };
    });

    const n = data.length;
    if (n <= 2) return 0; // RIGOR FIX: Verificação precoce para evitar n-2 = 0

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

    // MATH FIX: Denominador n-2 seguro devido à verificação n > 2 acima
    const sigma2 = rss / (n - 2);
    const seSlope = Math.sqrt(sigma2 / den);
    
    // ... resto da filtragem por T-score se necessário (usuário pediu foco no den)
    return slope * 30; 
}

/**
 * Nível Bayesiano Real — Modelo Beta-Binomial Conjugado
 * Prior: Beta(1,1) = Uniforme (Laplace Smoothing).
 * Assumimos total desconhecimento do Nível inicial do aluno (mais justo).
 * A cada simulado: alpha += acertos, beta += erros.
 * Retorna média posterior + IC 95%.
 */
export function computeBayesianLevel(history, alpha0 = 1, beta0 = 1, maxScore = 100) {
    let alpha = alpha0;
    let beta  = beta0;

    if (history && history.length > 0) {
        for (const h of history) {
            let total   = Number(h.total)   || 0;
            let correct = Number(h.correct) || 0;
            
            // LOGIC-1 FIX: Se não tem total/correct, usar score para criar entrada sintética (base 100 questões)
            // BUG 4 FIX: Use maxScore instead of hardcoded 100 for score-to-proportion conversion.
            // Previously h.score/100 broke for scales like OAB (0-10): score=7 -> pct=0.07 (7%) instead of 0.7 (70%).
            if (total === 0 && h.score != null) {
                const pct = Math.min(1, Math.max(0, Number(h.score) / maxScore));
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
    const mean = p * maxScore;

    // Incorporação de Correlação Intraclasse (ICC) limitando o "n efetivo".
    // Impede que o desvio padrão caia a níveis microscópicos irreais à medida que o aluno faz mais provas.
    const MAX_EFFECTIVE_N = 100; 
    const effectiveN = Math.min(n, MAX_EFFECTIVE_N);
    
    // Variância Bayesiana ancorada no limite de certeza estatística humana
    const baseVariance = (p * (1 - p)) / (effectiveN + 1);
    const effectiveSd = Math.sqrt(baseVariance); 

    // FIX 1.2: Clamping Inteligente.
    // BUG 4b FIX: Scaling by maxScore.
    const marginOfError = 1.96 * effectiveSd * maxScore;
    
    // Calcula os limites teóricos
    let ciLow  = mean - marginOfError;
    let ciHigh = mean + marginOfError;

    // Proteção de segurança
    ciHigh = Math.max(mean, ciHigh);
    ciLow = Math.min(mean, ciLow);

    // BUG 4b FIX: Limites estritamente contidos no domínio real [0, maxScore]
    const strictLow = Math.max(0, ciLow);
    const strictHigh = Math.min(maxScore, ciHigh);

    // BUG 10 FIX: Escalonamento de Alpha/Beta.
    // Se o n total (alpha + beta) exceder o MAX_EFFECTIVE_N, escalonamos os
    // parâmetros proporcionalmente antes de devolver para persistência.
    // Isso mantém a plasticidade do modelo para novos simulados (Laplace Smoothing).
    let alphaOut = alpha;
    let betaOut = beta;
    if (n > MAX_EFFECTIVE_N) {
        const factor = MAX_EFFECTIVE_N / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean:  Number(mean.toFixed(2)),
        sd:    Number((effectiveSd * maxScore).toFixed(2)),
        ciLow:  Number(strictLow.toFixed(2)),
        ciHigh: Number(strictHigh.toFixed(2)),
        alpha: alphaOut,
        beta:  betaOut,
        n:     n > MAX_EFFECTIVE_N ? MAX_EFFECTIVE_N : n,
    };
}

export function computeCategoryStats(history, weight, daysValue = 60, maxScore = 100) {
    if (!history || history.length === 0) return null;

    // MATH FIX: O filtro destruía as amostras que os usuários cadastravam só como "%" (total=0),
    // arruinando regressões inteiras da estatística se não houvesse input manual de volume de questões.
    const historyWithSynthetics = history.map(h => {
        if ((Number(h.total) || 0) === 0 && h.score != null) {
            return { ...h, total: SYNTHETIC_TOTAL_QUESTIONS };
        }
        return h;
    });

    const validHistory = historyWithSynthetics.filter(h => (Number(h.total) || 0) > 0);
    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    // BUG 4b FIX: Pass maxScore to getSafeScore
    const scores = historyToUse.map(h => getSafeScore(h, maxScore));

    const totalQ = historyToUse.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
    const m = totalQ > 0 
        ? historyToUse.reduce((acc, h) => acc + getSafeScore(h, maxScore) * (Number(h.total) || 0), 0) / totalQ
        : mean(scores);

    // FIX: Variância Ponderada baseada em Frequência (Questões)
    let variance = 0;
    if (historyToUse.length > 1 && totalQ > 1) { 
        let wVarSum = 0;
        historyToUse.forEach(h => {
            const w = (Number(h.total) || 1); // Nunca permitir peso 0 na soma matemática
            wVarSum += w * Math.pow(getSafeScore(h, maxScore) - m, 2);
        });
        
        // 🎯 MATH FIX: O estimador correto da variância quando os pesos são 
        // as frequências exatas (volume de questões) é a soma dos pesos menos 1.
        variance = wVarSum / (totalQ - 1);
    } else {
        variance = Math.pow(standardDeviation(scores, maxScore), 2);
    }
    
    const sd = Math.max(Math.sqrt(variance), 0.001 * maxScore);
    const safeSD = sd;

    const slopePerDay = calculateSlope(historyToUse);
    // Converter para pp/30-dias para comparação com threshold
    // Threshold de 0.5% (base 100) -> proportional limit
    const trendThreshold = 0.005 * maxScore;
    const rawTrend = slopePerDay * 30;

    let trendLabel = 'stable';
    if (rawTrend > trendThreshold) trendLabel = 'up';
    else if (rawTrend < -trendThreshold) trendLabel = 'down';

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
