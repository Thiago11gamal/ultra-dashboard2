
export const BAYESIAN_DECAY_FACTOR = 0.985;
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
// BUG-08 FIX: Importar calculateSlope para consistência com Monte Carlo
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
export const POPULATION_SD_FACTOR = 0.15; // Unificado: 15% da escala do concurso

export function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr, maxScore = 100, customMean = null) {
    if (!arr || arr.length < 1) return 0;

    const n = arr.length;
    const m = customMean !== null ? customMean : mean(arr);

    // B-02 FIX: n=1 has no sample variance, use pure prior (shrinkage)
    const sampleVar = n > 1
        ? arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1)
        : 0;

    // MATH FIX: O prior de incerteza (POPULATION_SD) deve ser ancorado na escala do concurso (maxScore)
    const POPULATION_SD = maxScore * POPULATION_SD_FACTOR;
    const KAPPA = 1;

    const adjustedVar =
        ((n - 1) * sampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) /
        ((n - 1) + KAPPA);

    const finalSdFloor = MIN_SD_FLOOR * maxScore;
    return Math.max(finalSdFloor, Math.sqrt(adjustedVar));

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
    let maxAlphaEver = alpha0;

    const now = Date.now();
    // NOTE: DECAY_FACTOR = 0.985 ≈ exp(-0.015) – consistente com λ=0.015 (meia-vida ~46 dias)

    if (history && history.length > 0) {
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (let i = 0; i < sortedHistory.length; i++) {
            const h = sortedHistory[i];
            let total = Number(h.total) || 0;
            let correct = Number(h.correct) || 0;

            const scoreRef = h.isPercentage ? 100 : maxScore;
            if (total > 0 && correct === 0 && h.score != null && h.score > 0) {
                correct = Math.round((Number(h.score) / scoreRef) * total);
            } else if (total === 0 && h.score != null) {
                const pct = Math.min(1, Math.max(0, Number(h.score) / scoreRef));
                total = getSyntheticTotal(maxScore);
                correct = Math.round(pct * total);
            }

            if (total < 1) continue;

            const safeCorrect = Math.min(total, correct);
            const acertosHoje = safeCorrect;
            const errosHoje = total - safeCorrect;

            const DECAY_FACTOR = BAYESIAN_DECAY_FACTOR; 
            const entryDate = new Date(h.date);
            const prevDate = i > 0 ? new Date(sortedHistory[i - 1].date) : entryDate;
            const gapDays = Math.max(0, Math.floor((entryDate - prevDate) / (1000 * 60 * 60 * 24)));
            const entryDecay = i > 0 ? Math.pow(DECAY_FACTOR, gapDays) : 1.0;
            
            // 🎯 DRIFT BAYESIANO (Fix): Preservar o ratio atual durante o decaimento.
            // Em vez de decair alpha e beta independentemente para alpha0/beta0,
            // reduzimos o "peso" (n) da evidência mantendo a proporção de acertos.
            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;
                const currentP = alpha / nBeforeDecay;
                const nAfterDecay = Math.max(2, nBeforeDecay * entryDecay); // Mínimo de n=2 (Laplace)
                alpha = nAfterDecay * currentP;
                beta = nAfterDecay * (1 - currentP);
            }

            // AMNÉSIA BAYESIANA: Piso de retenção permanente (30% do maior alpha alcançado)
            const retentionFloor = maxAlphaEver * 0.3;
            if (alpha < retentionFloor) {
                const nBeforeRetention = alpha + beta;
                alpha = retentionFloor;
                beta = Math.max(0.5, nBeforeRetention - retentionFloor); // N constante, beta >= 0.5 para evitar posterior degenerada
            }

            alpha += acertosHoje;
            beta += errosHoje;
            
            if (alpha > maxAlphaEver) maxAlphaEver = alpha;
        }
        
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
        const gapToToday = Math.max(0, Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (gapToToday > 0) {
            const finalDecay = Math.pow(BAYESIAN_DECAY_FACTOR, gapToToday);
            const nBeforeDecay = alpha + beta;
            const currentP = alpha / nBeforeDecay;
            const nAfterDecay = Math.max(2, nBeforeDecay * finalDecay);
            alpha = nAfterDecay * currentP;
            beta = nAfterDecay * (1 - currentP);

            const retentionFloor = maxAlphaEver * 0.3;
            if (alpha < retentionFloor) {
                // nAfterDecay já contém alpha + beta atualizado
                alpha = retentionFloor;
                beta = Math.max(0.5, nAfterDecay - retentionFloor); // N constante, beta >= 0.5 para evitar posterior degenerada
            }
        }
    }

    const n = alpha + beta;
    if (!Number.isFinite(n) || n <= 0) {
        return {
            mean: 0,
            sd: 0,
            ciLow: 0,
            ciHigh: 0,
            alpha: alpha0,
            beta: beta0,
            n: 0,
        };
    }
    // FIX: Aumentar o teto de confiabilidade para permitir que usuários de alta volumetria
    // cheguem mais perto dos 100% reais, sem o bloqueio assintótico precoce.
    const MAX_EFFECTIVE_N = 250; 
    const effectiveN = Math.min(n, MAX_EFFECTIVE_N);

    // Média de saída estrita (p real)
    const p = alpha / n;
    const bayesianMean = p * maxScore;

    const effectiveAlpha = p * effectiveN;

    // CORREÇÃO B: Intervalo de Confiança Agresti-Coull.
    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    // BUGFIX: Predictive Variance (Epistemic + Aleatoric)
    // Prevents Monte Carlo collapse for large N by assumin    // BUG-BAYES-01 FIX: escalar pelo maxScore real da prova
    // Antes: hardcoded 100, subestimava variance para provas > 100 pts e superestimava para < 100 pts
    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(maxScore));
    const epistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const aleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    // Margem ancorada na proporção ajustada
    const marginOfError = Z_95 * effectiveSd * maxScore;

    // BUGFIX M1: Center the CI on p_tilde (the Agresti-Coull estimator) instead of raw mean.
    // This prevents CI lower bounds from becoming overly negative for low-success histories.
    const centerForCI = p_tilde * maxScore;
    let ciLow = centerForCI - marginOfError;
    let ciHigh = centerForCI + marginOfError;

    // Proteções de Segurança Padrão
    ciHigh = Math.max(bayesianMean, ciHigh);
    ciLow = Math.min(bayesianMean, ciLow);

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
        mean: Number(bayesianMean.toFixed(2)),
        sd: Number((effectiveSd * maxScore).toFixed(2)),
        ciLow: Number(strictLow.toFixed(2)),
        ciHigh: Number(strictHigh.toFixed(2)),
        // 🎯 SD SQUASH (Fix): Exportar os valores não truncados para o Monte Carlo
        // evitar subestimação de desvio padrão em alunos de alta performance.
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > MAX_EFFECTIVE_N ? MAX_EFFECTIVE_N : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100) {
    if (!history || history.length === 0) return null;

    // MATH FIX: O filtro destruía as amostras que os usuários cadastravam só como "%" (total=0),
    // arruinando regressões inteiras da estatística se não houvesse input manual de volume de questões.
    const syntheticTotal = getSyntheticTotal(maxScore);
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

    let variance = 0;
    if (historyToUse.length > 1) {
        // 🎯 FALÁCIA ECOLÓGICA (Fix): Variância entre simulados (tests), não entre questões.
        // O peso do simulado deve levado em conta, mas o DOF é baseado no N de simulados (histórico).
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0; // Somatório dos pesos ao quadrado
        historyToUse.forEach(h => {
            const w = Number(h.total) || 1;
            wVarSum += w * Math.pow(getSafeScore(h, maxScore) - m, 2);
            sumW += w;
            sumW2 += w * w;
        });

        // Estimador imparcial de variância ponderada (Kish / Reliability weights)
        // FIX-KISH4: quando um exame domina em volume (ex: 1000 vs 10 questões),
        // sumW - sumW2/sumW → 0, causando sampleVar = Infinity.
        // Aplicar floor defensivo no denominador preserva a estimativa correta na maioria dos casos.
        const kishDenom = sumW - (sumW2 / sumW);
        const sampleVar = sumW > 0 && kishDenom > 1e-6
            ? wVarSum / kishDenom
            : wVarSum / Math.max(1e-6, sumW * 0.01);

        const POPULATION_SD = maxScore * POPULATION_SD_FACTOR;
        const KAPPA = 1.5;

        // 🎯 Kish Effective Sample Size (Fix): Usa o volume de questões real para o shrinkage bayesiano
        // em vez da contagem bruta de simulados.
        const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : historyToUse.length;
        const n_eff = effectiveN;

        variance = ((n_eff - 1) * sampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n_eff - 1) + KAPPA);
    } else {
        variance = Math.pow(standardDeviation(scores, maxScore, m), 2);
    }

    const sd = Math.max(Math.sqrt(variance), 0.001 * maxScore);
    const safeSD = sd;

    const slopePerDay = calculateSlope(historyToUse, maxScore);
    // Converter para pp/30-dias para comparação com threshold
    // BUG-TREND-01 FIX: unificar com coachLogic.js (0.02 * maxScore = 2 pts/mês para maxScore=100)
    // Antes: 0.005 * maxScore era 4x menos sensível, causando inconsistência nos rótulos
    const trendThreshold = 0.02 * maxScore;
    
    // FIX-SORT3: historyToUse pode não estar ordenado por data (é um filter() do map() original).
    // calculateSlope() ordena internamente, mas o cap de tendência precisa do score mais recente.
    const sortedForTrendCap = [...historyToUse].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const lastScore = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], maxScore)
        : m;
    const limiteSuperior = maxScore - lastScore; // O que falta pra gabaritar a partir de agora
    const limiteInferior = -lastScore; // O que falta pra zerar a partir de agora
    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, slopePerDay * 30));

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
