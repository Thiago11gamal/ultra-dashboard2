
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

export function standardDeviation(arr, maxScore = 100, customMean = null) {
    if (!arr || arr.length < 1) return 0;
    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length < 1) return 0;

    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const n = clean.length;
    const m = customMean !== null && Number.isFinite(Number(customMean)) ? Number(customMean) : mean(clean);

    // B-02 FIX: n=1 has no sample variance, use pure prior (shrinkage)
    const sampleVar = n > 1
        ? clean.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1)
        : 0;

    // Robustez adicional: MAD reduz influência de outliers em séries curtas/ruidosas.
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

    const adjustedVar =
        ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) /
        ((n - 1) + KAPPA);

    const finalSdFloor = MIN_SD_FLOOR * safeMaxScore;
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
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    let alpha = alpha0;
    let beta = beta0;
    let maxAlphaEver = alpha0;
    
    // 🎯 O Teto é vivo. Baseia-se na constância do aluno.
    const sessionGaps = history && history.length > 1 
        ? history.map((h, i) => i > 0 ? (new Date(h.date) - new Date(history[i-1].date)) / 86400000 : 0) 
        : [0];
    const avgGap = sessionGaps.reduce((a, b) => a + b, 0) / Math.max(1, sessionGaps.length - 1);

    // Fórmula Estocástica: Quanto menor o buraco médio entre estudos (avgGap), maior a capacidade
    // do cérebro de reter N amostras ativas. Ex: Se estuda a cada 2 dias = Cap de ~1200 questões vivas.
    // FIX BUG-MATH-04: Ajustar constante de 2500 para 250 (escala correta de questões "vivas")
    // Isso garante que o modelo reaja a mudanças de nível após ~250 questões.
    const dynamicAlphaCap = Math.max(100, Math.floor(250 / Math.max(1, avgGap)));
    const dynamicEffectiveN = dynamicAlphaCap;
    
    const now = Date.now();

    if (history && history.length > 0) {
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        for (let i = 0; i < sortedHistory.length; i++) {
            const h = sortedHistory[i];
            let total = Number(h.total) || 0;
            let correct = Number(h.correct) || 0;

            const normalizedScore = getSafeScore(h, maxScore);
            
            // FIX BUG 4: Heurística Anti-Colapso para provas penalizadas
            // Se a nota líquida for próxima de zero, a pessoa acertou ~50% e errou ~50% (chute).
            // O pior cenário teórico é 0 absoluto (onde pct vira 0.05).
            let rawPct = normalizedScore / safeMaxScore;
            if (rawPct < 0.1 && (h.total || 0) > 0) {
                // Se o aluno deixou muitas em branco, a nota líquida baixa não significa 
                // necessariamente um acerto de 50% (chute).
                const blankPenaltyMitigation = (correct > 0) ? 0.2 : 0.5;
                rawPct = Math.max(0.05, (rawPct + 1) / (2 - blankPenaltyMitigation));
            }
            
            const pct = Math.min(1, Math.max(0, rawPct));
            
            if (total > 0 && correct === 0 && Number.isFinite(normalizedScore)) {
                correct = Math.round(pct * total);
            } else if (total === 0 && Number.isFinite(normalizedScore)) {
                total = getSyntheticTotal(safeMaxScore);
                correct = Math.round(pct * total);
            }

            if (total < 1) continue;

            const safeCorrect = Math.max(0, Math.min(total, correct));
            
            // 💡 1. TRI Pseudo-Adaptativa: Multiplicador de Dificuldade
            // Lê do histórico ou assume peso neutro (1.0)
            const acertosHoje = safeCorrect;
            const errosHoje = total - safeCorrect;

            const entryDate = new Date(h.date);
            const prevDate = i > 0 ? new Date(sortedHistory[i - 1].date) : entryDate;
            const gapDays = Math.max(0, Math.floor((entryDate - prevDate) / (1000 * 60 * 60 * 24)));
            
            // 💡 2. Decaimento Bayesiano Dinâmico (Curva de Ebbinghaus)
            // CORREÇÃO MATH: Adicionado piso de Math.max(0.005) para prevenir Underflow a zero absoluto
            // que causava o "Bug da Memória Imortal" após dezenas de sessões.
            const adaptiveLambdaBase = computeAdaptiveLambda(sortedHistory);
            const rawLambda = adaptiveLambdaBase * Math.exp(-0.15 * i);
            const lambda = Math.max(0.005, rawLambda); 
            const entryDecay = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;
            
            // Retenção do Ratio Bayesiano
            const cappedMaxAlpha = Math.min(maxAlphaEver, dynamicAlphaCap);
            const retentionFloor = cappedMaxAlpha * 0.3;
            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;
                const currentP = alpha / nBeforeDecay;
                
                const minN = retentionFloor / Math.max(0.01, currentP);
                const nAfterDecay = Math.max(minN, nBeforeDecay * entryDecay);
                
                alpha = nAfterDecay * currentP;
                beta = nAfterDecay * (1 - currentP);
            }

            alpha += acertosHoje;
            beta += errosHoje;
            
            if (alpha > maxAlphaEver) maxAlphaEver = Math.min(alpha, dynamicAlphaCap);
        }
        
        // Decaimento final até o dia de hoje
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
        const gapToToday = Math.max(0, Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (gapToToday > 0) {
            const cappedMaxAlpha = Math.min(maxAlphaEver, dynamicAlphaCap);
            const retentionFloor = cappedMaxAlpha * 0.3;
            const finalLambdaBase = computeAdaptiveLambda(sortedHistory);
            
            // CORREÇÃO MATH: O mesmo piso é aplicado aqui para consistência assintótica.
            const rawFinalLambda = finalLambdaBase * Math.exp(-0.15 * sortedHistory.length);
            const finalLambda = Math.max(0.005, rawFinalLambda);
            
            const finalDecay = Math.exp(-finalLambda * gapToToday);
            const nBeforeDecay = alpha + beta;
            const currentP = alpha / nBeforeDecay;
            
            const minN = retentionFloor / Math.max(0.01, currentP);
            const nAfterDecay = Math.max(minN, nBeforeDecay * finalDecay);
            
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

    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(safeMaxScore));
    const epistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const aleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const marginOfError = Z_95 * effectiveSd * safeMaxScore;

    const centerForCI = p_tilde * safeMaxScore;
    let ciLow = centerForCI - marginOfError;
    let ciHigh = centerForCI + marginOfError;

    ciHigh = Math.max(bayesianMean, ciHigh);
    ciLow = Math.min(bayesianMean, ciLow);

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
        const studentVar = Math.max(1e-6, sampleVar); // Evita colapso se aluno só tirou a mesma nota
        const KAPPA = Math.max(0.1, Math.min(5.0, popVar / studentVar));

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
