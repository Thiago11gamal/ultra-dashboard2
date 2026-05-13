
export const BAYESIAN_DECAY_FACTOR = 0.985;
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
// BUG-08 FIX: Importar calculateSlope para consistência com Monte Carlo
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';

import { computeAdaptiveLambda } from './diagnostics.js';

function getDynamicTrendThreshold(currentScore, maxScore) {
    const currentPct = currentScore / maxScore;
    
    // Fator de amortecimento: se o aluno tirou 40%, damping = 0.6. Se tirou 95%, damping = 0.05.
    const damping = Math.max(0, 1 - currentPct);
    
    // Curva de exigência: Inicia agressiva (ex: 4~5% para novatos) e cai para um mínimo de 0.2% para veteranos.
    const baseRequirement = 0.05; 
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002; 
    
    return dynamicPct * maxScore;
}

// O desvio padrão a priori passa a ser a própria volatilidade do usuário, 
// com um piso de 5% e teto de 20% para evitar colapso bayesiano.
function getDynamicPriorSD(history, maxScore) {
    if (!history || history.length < 5) return maxScore * 0.15; // Fallback inicial seguro
    const scores = history.map(h => getSafeScore(h, maxScore));
    const globalMean = mean(scores);
    const globalVar = scores.length > 1
        ? scores.reduce((acc, s) => acc + Math.pow(s - globalMean, 2), 0) / (scores.length - 1)
        : 0;
    
    const empiricalSD = Math.sqrt(globalVar);
    return Math.max(maxScore * 0.05, Math.min(maxScore * 0.20, empiricalSD));
}

export function mean(arr) {
    if (!arr || !arr.length) return 0;
    const clean = arr.map(Number).filter(Number.isFinite);
    if (!clean.length) return 0;
    return clean.reduce((a, b) => a + b, 0) / clean.length;
}
export const calcularMedia = mean;

export function standardDeviation(arr, maxScore = 100, customMean = null) {
    if (!arr || arr.length < 1) return 0;
    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length < 1) return 0;

    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const n = clean.length;
    const m = customMean !== null && Number.isFinite(Number(customMean)) ? Number(customMean) : mean(clean);


    // Cálculo de Desvio Padrão Robusto (sample + MAD)
    const sampleVar = n > 1
        ? clean.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1)
        : 0;

    const sorted = [...clean].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDev.length % 2 === 0
        ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
        : absDev[Math.floor(absDev.length / 2)];

    const robustSigma = 1.4826 * mad;
    const robustVar = robustSigma * robustSigma;
    const blendedSampleVar = (0.8 * sampleVar) + (0.2 * robustVar);

    // MATH FIX: O prior de incerteza (POPULATION_SD) deve ser ancorado na escala do concurso (maxScore)
    const POPULATION_SD = getDynamicPriorSD(arr, safeMaxScore);
    const KAPPA = 1;

    const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);

    const finalSdFloor = MIN_SD_FLOOR * safeMaxScore;
    return Math.max(finalSdFloor, Math.sqrt(adjustedVar));

}
export const calcularDesvioPadrao = standardDeviation;



/**
 * Nível Bayesiano Real — Modelo Beta-Binomial Conjugado
 * Prior: Beta(1,1) = Uniforme (Laplace Smoothing).
 * Assumimos total desconhecimento do Nível inicial do aluno (mais justo).
 * A cada simulado: alpha += acertos, beta += erros.
 * Retorna média posterior + IC 95%.
 */
export function computeBayesianLevel(history, alpha0 = 1, beta0 = 1, maxScore = 100, options = {}) {
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    let alpha = alpha0;
    let beta = beta0;
    let maxNEver = alpha0 + beta0;
    
    // 🎯 O Teto é vivo. Baseia-se na constância do aluno.
    // No início da função computeBayesianLevel, substitua o bloco do dynamicAlphaCap:
    const sessionGaps = history && history.length > 1 
        ? history.map((h, i) => i > 0 ? (new Date(h.date) - new Date(history[i-1].date)) / 86400000 : 0) 
        : [0];
    const avgGap = Math.max(0.1, sessionGaps.reduce((a, b) => a + b, 0) / Math.max(1, sessionGaps.length - 1));

    // CORREÇÃO: Estimar capacidade viva baseada no volume diário real
    const totalQuestionsHist = history ? history.reduce((acc, h) => acc + (Number(h.total) || 20), 0) : 0;
    const historyDays = history && history.length > 1 
        ? Math.max(1, (new Date(history[history.length-1].date) - new Date(history[0].date)) / 86400000) 
        : 1;
    const questionsPerDay = totalQuestionsHist / historyDays;

    // Capacidade base (Tempo) vs Capacidade de Volume (30 dias de memória ativa)
    const baseCapacity = 250 / avgGap;
    const volumeCapacity = questionsPerDay * 30;
    
    // O teto adapta-se à realidade hiperativa do aluno
    const dynamicAlphaCap = Math.max(250, Math.floor(Math.min(baseCapacity, volumeCapacity)));
    const dynamicEffectiveN = dynamicAlphaCap;
    
    const now = Date.now();

    if (history && history.length > 0) {
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        for (let i = 0; i < sortedHistory.length; i++) {
            const h = sortedHistory[i];
            let total = Number(h.total) || 0;
            const isPurePercentage = (total === 0 && h.score != null);

            const normalizedScore = getSafeScore(h, safeMaxScore);
            let rawPct = normalizedScore / safeMaxScore;

            if (options.isPenalizedFormat) {
                rawPct = Math.max(0.05, (rawPct + 1) / 2);
            } else {
                rawPct = Math.max(0, rawPct);
            }
            const pct = Math.min(1, rawPct);

            // 1. O cálculo de tempo (gap) e esquecimento tem de ocorrer ANTES de injetar o novo simulado
            const entryDate = new Date(h.date);
            const prevDate = i > 0 ? new Date(sortedHistory[i - 1].date) : entryDate;
            const gapDays = Math.max(0, Math.floor((entryDate - prevDate) / (1000 * 60 * 60 * 24)));

            const adaptiveLambdaBase = computeAdaptiveLambda(sortedHistory);
            const rawLambda = adaptiveLambdaBase * Math.exp(-0.15 * i);
            const lambda = Math.max(0.005, rawLambda); 
            const entryDecay = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;

            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapDays || 0))); 
            const retentionFloor = (cappedMaxN * 0.3) * macroDecay;

            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;
                const currentP = nBeforeDecay > 0 ? alpha / nBeforeDecay : 0.5;
                const minN = retentionFloor;
                const HARD_FLOOR = 3.0;
                
                const nAfterDecay = nBeforeDecay < minN 
                    ? Math.max(HARD_FLOOR, nBeforeDecay * entryDecay)
                    : Math.max(Math.max(minN, HARD_FLOOR), nBeforeDecay * entryDecay);
                
                alpha = nAfterDecay * currentP;
                beta = nAfterDecay * (1 - currentP);
            }

            // 2. Agora injetamos a nota na matemática (SEM usar `continue`)
            if (isPurePercentage) {
                alpha += pct * 0.5;
                beta += (1 - pct) * 0.5;
            } else {
                let correct = Math.round(pct * total);
                if (total >= 1) {
                    // Sanitização de acertos
                    const safeCorrect = Math.max(0, Math.min(total, correct));
                    const acertosHoje = safeCorrect;
                    const errosHoje = total - safeCorrect;
                    alpha += acertosHoje;
                    beta += errosHoje;
                }
            }

            // 3. Atualizamos o teto global com os novos valores
            const currentN = alpha + beta;
            if (currentN > maxNEver) maxNEver = Math.min(currentN, dynamicAlphaCap);
        }
        
        // Decaimento final até o dia de hoje
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
        const gapToToday = Math.max(0, Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (gapToToday > 0) {
            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            // [DEPOIS] Piso dinâmico que esvazia com o tempo
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapToToday || 0))); 
            const retentionFloor = (cappedMaxN * 0.3) * macroDecay;
            
            const finalLambdaBase = computeAdaptiveLambda(sortedHistory);
            
            // CORREÇÃO MATH: O mesmo piso é aplicado aqui para consistência assintótica.
            const rawFinalLambda = finalLambdaBase * Math.exp(-0.15 * sortedHistory.length);
            const finalLambda = Math.max(0.005, rawFinalLambda);
            
            const finalDecay = Math.exp(-finalLambda * gapToToday);
            const nBeforeDecay = alpha + beta;
            const currentP = nBeforeDecay > 0 ? alpha / nBeforeDecay : 0.5;
            
            const minN = retentionFloor;
            // [CORREÇÃO MATH-BUG-1] Aplica a mesma lógica de não-inflação artificial
            const HARD_FLOOR = 3.0;
            const nAfterDecay = nBeforeDecay < minN 
                ? Math.max(HARD_FLOOR, nBeforeDecay * finalDecay)
                : Math.max(Math.max(minN, HARD_FLOOR), nBeforeDecay * finalDecay);
            
            // CORREÇÃO: Apenas decair o N, mantendo o P atual
            alpha = nAfterDecay * currentP;
            beta = nAfterDecay * (1 - currentP);
        }
    }

    const n = alpha + beta;
    if (!Number.isFinite(n) || n <= 0) {
        return { mean: 0, sd: 0, ciLow: 0, ciHigh: 0, alpha: alpha0, beta: beta0, n: 0 };
    }
    
    const effectiveN = Math.min(n, dynamicEffectiveN);

    const p = alpha / n;
    const bayesianMean = p * safeMaxScore;
    const effectiveAlpha = p * effectiveN;

    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    // CORREÇÃO: Em vez de Math.max(20, ...), permitimos que o tamanho físico 
    // real da prova não seja artificialmente distorcido se for uma prova pequena.
    const TAMANHO_PROVA_ESTIMADO = Math.max(1, Math.round(safeMaxScore));
    const epistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const aleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const marginOfError = Z_95 * effectiveSd * safeMaxScore;

    const centerForCI = p_tilde * safeMaxScore;
    let ciLow = centerForCI - marginOfError;
    let ciHigh = centerForCI + marginOfError;

    // FIX BUG 1: Remover o clamp estrito contra a bayesianMean. 
    // O intervalo de Agresti-Coull (Shrinkage) PODE legitimamente não conter 
    // a média amostral bruta em casos de pontuações perfeitas (0% ou 100%) com amostra pequena.
    const strictLow = Math.max(0, ciLow);
    const strictHigh = Math.min(safeMaxScore, ciHigh);

    let alphaOut = alpha;
    let betaOut = beta;
    if (n > dynamicEffectiveN) {
        const factor = dynamicEffectiveN / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean: Number(bayesianMean.toFixed(2)),
        sd: Number((effectiveSd * safeMaxScore).toFixed(2)),
        ciLow: Number(strictLow.toFixed(2)),
        ciHigh: Number(strictHigh.toFixed(2)),
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > dynamicEffectiveN ? dynamicEffectiveN : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100) {
    if (!history || history.length === 0) return null;

    // MATH FIX: O filtro destruía as amostras que os usuários cadastravam só como "%" (total=0),
    // arruinando regressões inteiras da estatística se não houvesse input manual de volume de questões.
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const rawSynthetic = getSyntheticTotal(safeMaxScore);
    const syntheticTotal = Number.isFinite(rawSynthetic) ? rawSynthetic : 20;
    
    const historyWithSynthetics = history.map(h => {
        if ((Number(h.total) || 0) === 0 && h.score != null) {
            return { ...h, total: syntheticTotal };
        }
        return h;
    });

    const validHistory = historyWithSynthetics.filter(h => (Number(h.total) || 0) > 0);
    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    // BUG 4b FIX: Pass maxScore to getSafeScore
    const scores = historyToUse.map(h => getSafeScore(h, safeMaxScore));

    const totalQ = historyToUse.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
    const m = totalQ > 0
        ? historyToUse.reduce((acc, h) => acc + getSafeScore(h, safeMaxScore) * (Number(h.total) || 0), 0) / totalQ
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
            wVarSum += w * Math.pow(getSafeScore(h, safeMaxScore) - m, 2);
            sumW += w;
            sumW2 += w * w;
        });

        // Estimador imparcial de variância ponderada (Kish / Reliability weights)
        const kishDenom = Math.max(1e-4, sumW - (sumW2 / sumW));
        const sampleVar = sumW > 0 && kishDenom > 1e-6
            ? wVarSum / kishDenom
            : wVarSum / Math.max(1e-6, sumW * 0.01);

        const POPULATION_SD = getDynamicPriorSD(historyToUse, safeMaxScore);
        
        // 🎯 Teoria de Credibilidade de Bühlmann (Shrinkage Perfeito)
        // K = (Variância da População) / (Variância Esperada do Indivíduo)
        const popVar = Math.pow(POPULATION_SD, 2);
        // O piso da variância do aluno não pode ser zero absoluto (1e-6) 
        const safeStudentVar = Math.max(popVar * 0.05, sampleVar); 
        const KAPPA = Math.max(0.1, Math.min(3.0, popVar / safeStudentVar)); // Teto reduzido para 3.0

        // 🎯 Kish Effective Sample Size (Fix): Usa o volume de questões real para o shrinkage bayesiano
        // em vez da contagem bruta de simulados.
        const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : historyToUse.length;
        const n_eff = Number.isFinite(effectiveN) ? Math.max(1, effectiveN) : 1;

        const kishDenomTerm = Number.isFinite(n_eff) ? Math.max(0.001, (n_eff - 1)) : 0.001;
        variance = (kishDenomTerm * sampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / (kishDenomTerm + KAPPA);
    } else {
        variance = Math.pow(standardDeviation(scores, maxScore, m), 2);
    }

    const sd = Math.max(Math.sqrt(variance), 0.001 * maxScore);
    const safeSD = sd;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore);
    // Converter para pp/30-dias para comparação com threshold
    // BUG-TREND-01 FIX: unificar com coachLogic.js (0.02 * maxScore = 2 pts/mês para maxScore=100)
    // Antes: 0.005 * maxScore era 4x menos sensível, causando inconsistência nos rótulos
    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore);
    
    // FIX-SORT3: historyToUse pode não estar ordenado por data (é um filter() do map() original).
    // calculateSlope() ordena internamente, mas o cap de tendência precisa do score mais recente.
    const sortedForTrendCap = [...historyToUse].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const lastScore = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore)
        : m;
    const limiteSuperior = safeMaxScore - lastScore; // O que falta pra gabaritar a partir de agora
    const limiteInferior = -lastScore; // O que falta pra zerar a partir de agora
    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, slopePerDay * 30));

    let trendLabel = 'stable';
    if (rawTrend > trendThreshold) trendLabel = 'up';
    else if (rawTrend < -trendThreshold) trendLabel = 'down';

    const level = m > 0.7 * safeMaxScore ? 'ALTO' : m > 0.4 * safeMaxScore ? 'MÉDIO' : 'BAIXO';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight: weight,
        history: history,
        trend: trendLabel,
        trendValue: rawTrend,
        level
    };
}
