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
 * Nível Bayesiano Real — Modelo Beta-Binomial Conjugado
 * Prior: Beta(1,1) = Uniforme (Laplace Smoothing).
 * Assumimos total desconhecimento do Nível inicial do aluno (mais justo).
 * A cada simulado: alpha += acertos, beta += erros.
 * Retorna média posterior + IC 95%.
 */
export function computeBayesianLevel(history, alpha0 = 1, beta0 = 1, maxScore = 100) {
    let alpha = alpha0;
    let beta = beta0;

    const now = Date.now();
    const LAMBDA_FORGET = 0.015; // Decaimento mais suave que o Monte Carlo (meia-vida ~46 dias)

    if (history && history.length > 0) {
        for (const h of history) {
            let total = Number(h.total) || 0;
            let correct = Number(h.correct) || 0;

            if (total === 0 && h.score != null) {
                const pct = Math.min(1, Math.max(0, Number(h.score) / maxScore));
                // CORREÇÃO A: O N sintético agora escala com a realidade da prova (maxScore)
                // e não assume rigidamente "100", nivelando a prioridade estatística.
                total = maxScore > 0 ? maxScore : 100;
                correct = Math.round(pct * total);
            }

            if (total < 1) continue;

            const safeCorrect = Math.min(total, correct);
            const acertosHoje = safeCorrect;
            const errosHoje = total - safeCorrect;

            // 🎯 REFINAMENTO BAYESIANO: Decaimento Temporal de Hiperparâmetros.
            // Em vez de apenas ponderar a entrada, aplicamos decaimento na inércia anterior
            // (alphaAnterior * DECAY), permitindo que o sistema esqueça a "identidade antiga"
            // do aluno e responda rapidamente a mudanças de performance.
            // Fator 0.985 ≈ Meia-vida de 45 registros.
            const DECAY_FACTOR = 0.985; 
            
            alpha = (alpha * DECAY_FACTOR) + acertosHoje;
            beta = (beta * DECAY_FACTOR) + errosHoje;
        }
    }

    const n = alpha + beta;
    const MAX_EFFECTIVE_N = 100;
    const effectiveN = Math.min(n, MAX_EFFECTIVE_N);

    // Média de saída estrita (p real)
    const p = alpha / n;
    const mean = p * maxScore;

    // 🎯 MATH BUG FIX 1: Escalar o alpha para a realidade do effectiveN.
    // Sem isto, alphas gigantescos (>100) criam probabilidades p_tilde > 100%, 
    // gerando um NaN fatal no cálculo da raiz quadrada abaixo.
    const effectiveAlpha = p * effectiveN;

    // CORREÇÃO B: Intervalo de Confiança Agresti-Coull.
    // Adiciona ~2 sucessos e ~2 falhas (z^2/2) para recentrar a variância,
    // resolvendo o vazamento matemático (IC > 100%) perto das bordas.
    const z = 1.96;
    const z2 = z * z;
    const n_tilde = effectiveN + z2;
    // Usamos agora o effectiveAlpha em vez do alpha cumulativo bruto
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    // BUGFIX M4: Proteção IEEE 754 contra resíduos microscópicos negativos (NaN).
    const varianceArg = (p_tilde * (1 - p_tilde)) / n_tilde;
    const effectiveSd = Math.sqrt(Math.max(0, varianceArg));

    // Margem ancorada na proporção ajustada
    const marginOfError = z * effectiveSd * maxScore;

    // BUGFIX M1: Center the CI on p_tilde (the Agresti-Coull estimator) instead of raw mean.
    // This prevents CI lower bounds from becoming overly negative for low-success histories.
    const centerForCI = p_tilde * maxScore;
    let ciLow = centerForCI - marginOfError;
    let ciHigh = centerForCI + marginOfError;

    // Proteções de Segurança Padrão
    ciHigh = Math.max(mean, ciHigh);
    ciLow = Math.min(mean, ciLow);

    const strictLow = Math.max(0, ciLow);
    const strictHigh = Math.min(maxScore, ciHigh);

    let alphaOut = alpha;
    let betaOut = beta;
    if (n > MAX_EFFECTIVE_N) {
        const factor = MAX_EFFECTIVE_N / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean: Number(mean.toFixed(2)),
        sd: Number((effectiveSd * maxScore).toFixed(2)),
        ciLow: Number(strictLow.toFixed(2)),
        ciHigh: Number(strictHigh.toFixed(2)),
        alpha: alphaOut,
        beta: betaOut,
        n: n > MAX_EFFECTIVE_N ? MAX_EFFECTIVE_N : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100) {
    if (!history || history.length === 0) return null;

    // MATH FIX: O filtro destruía as amostras que os usuários cadastravam só como "%" (total=0),
    // arruinando regressões inteiras da estatística se não houvesse input manual de volume de questões.
    const syntheticTotal = Math.max(1, Math.round(maxScore || SYNTHETIC_TOTAL_QUESTIONS));
    const historyWithSynthetics = history.map(h => {
        if ((Number(h.total) || 0) === 0 && h.score != null) {
            return { ...h, total: syntheticTotal };
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

        // 🎯 MATH BUG FIX 3: Bloqueio estrito de Divisão por Zero.
        // O correto (estimador de confiabilidade, formulação de Kish simplificada):
        const numSessions = historyToUse.length;
        variance = wVarSum / Math.max(1, ((numSessions - 1) / numSessions) * totalQ);
    } else {
        variance = Math.pow(standardDeviation(scores, maxScore), 2);
    }

    const sd = Math.max(Math.sqrt(variance), 0.001 * maxScore);
    const safeSD = sd;

    const slopePerDay = calculateSlope(historyToUse, maxScore);
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
