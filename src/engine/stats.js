
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
    
    // CORREÇÃO MÁXIMA: Polimorfismo para ler corretamente arrays de números nus 
    // ou arrays de objetos complexos (impedindo NaN poisoning no Prior Bayesiano).
    const scores = history.map(h => {
        if (typeof h === 'number') return h;
        return getSafeScore(h, maxScore);
    }).filter(Number.isFinite);
    
    if (scores.length < 5) return maxScore * 0.15;
    
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
export const calcularDesvioPadrao = (arr) => {
    if (!arr || arr.length <= 1) return 0;
    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length <= 1) return 0;
    const m = clean.reduce((a, b) => a + b, 0) / clean.length;
    
    // CORREÇÃO: Divisão por (N - 1) para gerar Desvio Padrão Amostral não viesado
    const v = clean.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / (clean.length - 1);
    
    return Math.sqrt(v);
};

/**
 * Calcula a Assimetria (Skewness) da série usando ajuste para amostras pequenas (G1 de Fisher-Pearson).
 * Crucial para alimentar o 'sdLeft' e 'sdRight' de uma curva de Gauss Assimétrica real.
 */
export function calcularAssimetria(arr) {
    if (!arr || arr.length < 3) return 0;
    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length < 3) return 0;
    
    const m = mean(clean);
    const sd = calcularDesvioPadrao(clean);
    
    // CORREÇÃO MÁXIMA: Tolerância de underflow. Se o desvio for inferior a 0.00001,
    // a assimetria é considerada estatisticamente nula.
    if (sd < 1e-5) return 0;

    const n = clean.length;
    const sumCube = clean.reduce((acc, val) => acc + Math.pow(val - m, 3), 0);
    
    // Fator de correção de viés estatístico
    const skewness = (n * sumCube) / ((n - 1) * (n - 2) * Math.pow(sd, 3));
    
    // Fallback absoluto: Se a divisão gerar valores indefinidos, exporta 0 (Simetria perfeita)
    if (Number.isNaN(skewness) || !Number.isFinite(skewness)) return 0;
    
    return Math.max(-5, Math.min(5, skewness)); // Clamp para proteção de outliers
}



/**
 * Calcula o nível Bayesiano (Beta-Binomial ou Normal Shrinkage) de proficiência.
 * Protege contra escalas inválidas e adapta a confiança ao volume da coorte.
 * 
 * @param {Array|number} historyOrScore - Array de histórico ou score normalizado.
 * @param {number} effectiveNOrAlpha - Tamanho da amostra ou Alpha inicial.
 * @param {number} maxScore - Escala máxima da prova.
 * @param {Object} options - Configurações extras (maxEffectiveN, priorMean, etc).
 */
export function computeBayesianLevel(
    historyOrScore, 
    arg1 = 1, 
    arg2 = 1, 
    arg3 = 100, 
    arg4 = {}
) {
    let history, alpha, beta, safeMaxScore, options;
    
    // 1. Polimorfismo de Assinatura
    if (Array.isArray(historyOrScore)) {
        // Modo A: Histórico de Simulados (history, alpha0, beta0, maxScore, options)
        history = historyOrScore;
        alpha = Number(arg1) || 1;
        beta = Number(arg2) || 1;
        safeMaxScore = Number(arg3) || 100;
        options = arg4 || {};
    } else {
        // Modo B: Score Direto (score, n, maxScore, options)
        history = [];
        const score = Number(historyOrScore) || 0;
        const n_eff = Number(arg1) || 1;
        safeMaxScore = Number(arg2) || 100;
        options = arg3 || {};
        
        const pct = Math.max(0, Math.min(1, score / safeMaxScore));
        alpha = pct * n_eff;
        beta = (1 - pct) * n_eff;
    }

    const alpha0 = alpha;
    const beta0 = beta;

    let maxNEver = alpha + beta;
    const gaps = [];
    // CORREÇÃO: Fallback absoluto para (0) na ordenação temporal caso a data 
    // esteja ilegível, protegendo a cronologia matemática da V8 engine
    const historySortedForGaps = history ? [...history].sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return (timeA || 0) - (timeB || 0);
    }) : [];
    if (historySortedForGaps.length > 1) {
        for (let i = 1; i < historySortedForGaps.length; i++) {
            const time1 = new Date(historySortedForGaps[i].date).getTime();
            const time0 = new Date(historySortedForGaps[i - 1].date).getTime();
            if (!isNaN(time1) && !isNaN(time0)) {
                const gap = (time1 - time0) / 86400000;
                if (gap > 0) gaps.push(gap);
            }
        }
    }
    // CORREÇÃO: Impedir que a micro-frequência crie inércia infinita (Assuma mínimo de meio dia) (Bug 1.2 Fix)
    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;

    const totalQuestionsHist = history ? history.reduce((acc, h) => acc + (Number(h.total) || 20), 0) : 0;
    // CORREÇÃO: Usar obrigatoriamente a linha do tempo previamente ordenada (historySortedForGaps) 
    // para não distorcer o fluxo de tempo e explodir a memória ativa.
    const historyDays = historySortedForGaps && historySortedForGaps.length > 1 
        ? Math.max(1, (new Date(historySortedForGaps[historySortedForGaps.length - 1].date).getTime() - new Date(historySortedForGaps[0].date).getTime()) / 86400000) 
        : 1;
    const questionsPerDay = totalQuestionsHist / historyDays;

    const volumeCapacity = questionsPerDay * 30;
    
    // O teto adapta-se à realidade hiperativa do aluno
    const dynamicAlphaCap = Math.max(250, Math.floor(Math.min(baseCapacity, volumeCapacity)));
    const dynamicEffectiveN = dynamicAlphaCap;
    
    const now = Date.now();

    if (history && history.length > 0) {
        const sortedHistory = [...history].sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            return (timeA || 0) - (timeB || 0);
        });
        
        for (let i = 0; i < sortedHistory.length; i++) {
            const h = sortedHistory[i];
            let total = Number(h.total) || 0;
            // CORREÇÃO: Em vez de confiar na chave estrita 'score', utiliza a resiliência 
            // do getSafeScore para confirmar se o registo representa uma percentagem real
            const isPurePercentage = ((!total || total === 0) && !Number.isNaN(getSafeScore(h, safeMaxScore)));

            const normalizedScore = getSafeScore(h, safeMaxScore);
            
            // CORREÇÃO BLINDADA: Evita a injeção de veneno (NaN) nas pontuações Bayesianas
            if (Number.isNaN(normalizedScore)) continue;

            let rawPct = normalizedScore / safeMaxScore;

            if (options.isPenalizedFormat) {
                rawPct = Math.max(0.05, (rawPct + 1) / 2);
            } else {
                rawPct = Math.max(0, rawPct);
            }
            const pct = Math.min(1, rawPct);

            // 1. O cálculo de tempo (gap) e esquecimento tem de ocorrer ANTES de injetar o novo simulado
            // CORREÇÃO: Impedir que Invalid Dates gerem NaNs. Se a data for corrompida, 
            // assumimos gap zero para não destruir os alphas e betas em cadeia.
            const entryDate = new Date(h.date);
            const prevDate = i > 0 ? new Date(sortedHistory[i - 1].date) : entryDate;
            
            // CORREÇÃO: Impedir que Invalid Dates gerem NaNs.
            const timeEntry = entryDate.getTime();
            const timePrev = prevDate.getTime();
            const gapDays = (!isNaN(timeEntry) && !isNaN(timePrev)) 
                ? Math.max(0, Math.floor((timeEntry - timePrev) / 86400000)) 
                : 0;

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
                const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);
                const nAfterDecay = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * entryDecay)));
                
                // CORREÇÃO: Regressão à média (0.5) proporcional ao esquecimento (Bug 1.1 Fix)
                const priorP = 0.5;
                const regressedP = (currentP * entryDecay) + (priorP * (1 - entryDecay));

                alpha = nAfterDecay * regressedP;
                beta = nAfterDecay * (1 - regressedP);
            }

            // 2. Agora injetamos a nota na matemática (SEM usar `continue`)
            if (isPurePercentage) {
                const syntheticN = getSyntheticTotal(safeMaxScore);
                alpha += pct * syntheticN;
                beta += (1 - pct) * syntheticN;
            } else {
                let correct = Math.round(pct * total);
                if (total >= 1) {
                    const safeCorrect = Math.max(0, Math.min(total, correct));
                    const acertosHoje = safeCorrect;
                    const errosHoje = total - safeCorrect;
                    alpha += acertosHoje;
                    beta += errosHoje;
                }
            }

            // 3. Atualizamos o teto global com os novos valores
            const currentN = alpha + beta;
            const stepCap = dynamicAlphaCap; // O limite cognitivo vivo

            if (currentN > stepCap) {
                const clampFactor = stepCap / currentN;
                alpha = alpha * clampFactor;
                beta = beta * clampFactor;
            }

            if (currentN > maxNEver) {
                maxNEver = Math.min(currentN, dynamicAlphaCap);
            }
        }
        
        // Decaimento final até o dia de hoje
        const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
        const gapToToday = Math.max(0, Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (gapToToday > 0) {
            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapToToday || 0))); 
            const retentionFloor = (cappedMaxN * 0.3) * macroDecay;
            
            const finalLambdaBase = computeAdaptiveLambda(sortedHistory);
            const rawFinalLambda = finalLambdaBase * Math.exp(-0.15 * sortedHistory.length);
            const finalLambda = Math.max(0.005, rawFinalLambda);
            
            const finalDecay = Math.exp(-finalLambda * gapToToday);
            const nBeforeDecay = alpha + beta;
            const currentP = nBeforeDecay > 0 ? alpha / nBeforeDecay : 0.5;
            
            const minN = retentionFloor;
            const HARD_FLOOR = 3.0;
            const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);
            
            // MATH-CLIFF-FIX: Unifica a aplicação do piso de proteção de forma contínua
            const nAfterDecay = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * finalDecay)));
            
            // CORREÇÃO: Regressão à média (0.5) proporcional ao esquecimento final (Bug 1.1 Fix)
            const priorP = 0.5;
            const regressedP = (currentP * finalDecay) + (priorP * (1 - finalDecay));

            alpha = nAfterDecay * regressedP;
            beta = nAfterDecay * (1 - regressedP);
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

    const mediaDeQuestoesDoAluno = history && history.length > 0 
        ? history.reduce((acc, h) => acc + (Number(h.total) || 20), 0) / history.length 
        : 100;
    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(mediaDeQuestoesDoAluno));
    const epistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const aleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const marginOfError = Z_95 * effectiveSd * safeMaxScore;

    // CORREÇÃO: Removida a continuityCorrection de Yates (Bug 1.3 Fix)
    // Agresti-Coull + Epistemic/Aleatoric Var já resolvem o intervalo para N pequeno.
    const adjustedMarginOfError = marginOfError;

    const centerForCI = p_tilde * safeMaxScore;
    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

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
        // CORREÇÃO: Avaliar se possui uma pontuação válida via getSafeScore, 
        // em vez de confiar cegamente que a chave 'score' não é nula.
        if ((Number(h.total) || 0) === 0 && !Number.isNaN(getSafeScore(h, safeMaxScore))) {
            return { ...h, total: syntheticTotal };
        }
        return h;
    });

    const validHistory = historyWithSynthetics.filter(h => (Number(h.total) || 0) > 0);
    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    // BUG 4b FIX: Pass maxScore to getSafeScore
    const scores = historyToUse.map(h => getSafeScore(h, safeMaxScore));

    // CORREÇÃO: Filtrar notas corrompidas ANTES de aplicar o peso de Kish na média,
    // garantindo que não dividimos por um denominador fantasma.
    const validHistoryForMean = historyToUse.filter(h => !Number.isNaN(getSafeScore(h, safeMaxScore)));
    const actualTotalQ = validHistoryForMean.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
    
    const m = actualTotalQ > 0
        ? validHistoryForMean.reduce((acc, h) => acc + getSafeScore(h, safeMaxScore) * (Number(h.total) || 0), 0) / actualTotalQ
        : mean(scores);

    let variance = 0;
    if (historyToUse.length > 1) {
        // 🎯 FALÁCIA ECOLÓGICA (Fix): Variância entre simulados (tests), não entre questões.
        // O peso do simulado deve levado em conta, mas o DOF é baseado no N de simulados (histórico).
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0; // Somatório dos pesos ao quadrado
        // CORREÇÃO: Usar estritamente o validHistoryForMean para que os pesos (w) 
        // e a variância ponderada (wVarSum) sejam calculados numa amostra matematicamente pura.
        validHistoryForMean.forEach(h => {
            // Se não tem volume, o peso É ZERO. Não pode forçar 1. (Bug 1.1 Fix)
            const w = Number(h.total) || 0; 
            if (w > 0) {
                const safeScore = getSafeScore(h, safeMaxScore);
                wVarSum += w * Math.pow(safeScore - m, 2);
                sumW += w;
                sumW2 += w * w;
            }
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
        // Para N=1, assuma a ignorância máxima usando o Prior Populacional fixado na média
        variance = Math.pow(getDynamicPriorSD(historyToUse, safeMaxScore), 2);
    }

    const sd = Math.max(Math.sqrt(variance), 0.001 * maxScore);
    const safeSD = sd;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore);
    
    // CORREÇÃO: Limpar falhas de regressão linear (divisões por zero no delta Time).
    // Se o slope explodir, assume inclinação 0 (estável).
    // CORREÇÃO MÁXIMA: Infinity bypass. Protege contra divisões por zero temporais (Delta-T = 0)
    // ao assumir inclinação nula se o algoritmo matemático retornar Infinitos ou NaNs.
    const safeSlope = !Number.isFinite(slopePerDay) ? 0 : slopePerDay;
    
    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore);
    // CORREÇÃO: Filtrar o array que determina o limite da tendência para garantir
    // que o último ponto (lastScore) é matematicamente viável e não corrompe a regressão.
    const validHistoryForTrend = historyToUse.filter(h => !Number.isNaN(getSafeScore(h, safeMaxScore)));
    
    const sortedForTrendCap = [...validHistoryForTrend].sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return (timeA || 0) - (timeB || 0);
    });
    
    const lastScore = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore)
        : m;
        
    const limiteSuperior = safeMaxScore - lastScore; 
    const limiteInferior = -lastScore; 

    
    // Aplicação agora segura
    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, safeSlope * 30));

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
