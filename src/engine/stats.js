
export const BAYESIAN_DECAY_FACTOR = 0.985;
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { normalizeDate } from '../utils/dateHelper.js';
// BUG-08 FIX: Importar calculateSlope para consistência com Monte Carlo
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { safeDateParse } from '../utils/dateHelper.js';

import { computeAdaptiveLambda } from './diagnostics.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';

// Helper: Ensure history is sorted by date and filter out invalid dates
export function getSortedHistory(history) {
    if (!Array.isArray(history)) return [];
    
    // OTIMIZAÇÃO DE MEMÓRIA (Schwartzian Transform): 
    // Evita instanciar objetos Date O(N log N) vezes dentro do .sort()
    return history
        .map(h => ({ 
            original: h, 
            time: h && (h.date || h.createdAt) ? safeDateParse(h.date || h.createdAt).getTime() : NaN 
        }))
        .filter(item => !Number.isNaN(item.time))
        .sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            // Desempate determinístico
            return (a.original.id || "").localeCompare(b.original.id || "");
        })
        .map(item => item.original);
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const now = options.referenceDate || Date.now();
    // Kahan summation imperativo (Inline Performance Pura) - [BUG-MEMORY-01 FIX]
    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for(let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const hDate = h.date || h.createdAt;
        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - safeDateParse(hDate).getTime()) / 86400000);
        
        // Calcula o peso exponencial, mas NUNCA deixa zerar completamente (Bug 2 Fix)
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);

        const x = ((safeDateParse(hDate).getTime() - safeDateParse(sorted[0].date || sorted[0].createdAt).getTime()) / 86400000) + (i * 1e-5);

        // Kahan summation imperativo para evitar O(N) alocações de map
        const yW = w - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;
        
        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;
        
        const valWY = w * y;
        const yWY = valWY - cWY; const tWY = sumWY + yWY; cWY = (tWY - sumWY) - yWY; sumWY = tWY;
        
        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;
        
        const valWXY = w * x * y;
        const yWXY = valWXY - cWXY; const tWXY = sumWXY + yWXY; cWXY = (tWXY - sumWXY) - yWXY; sumWXY = tWXY;
    }

    // Regularização de Tikhonov (Ridge) para estabilizar a matriz inversa da Regressão WLS
    // Adicionamos um lambda epsilon baseado na escala dos dias. (Bug 4 Fix)
    const RIDGE_PENALTY = 0.0001; 
    const safeSumW = Math.max(1e-15, sumW);
    // CORREÇÃO: Impedir o underflow de precisão (IEEE 754) que gera variâncias X negativas
    const varianceX = Math.max(0, sumWXX - (sumWX * sumWX) / safeSumW);
    const covXY = sumWXY - (sumWX * sumWY) / safeSumW;

    const regularizedDenominator = varianceX + RIDGE_PENALTY;
    
    // Na hora da divisão final da regressão, adicione proteção contra pesos nulos (Bug 2 Fix)
    if (safeSumW < 1e-15 || regularizedDenominator < 1e-15) {
        const fallbackScore = getSafeScore(sorted[sorted.length - 1], maxScore);
        return { slope: 0, intercept: Number.isFinite(fallbackScore) ? fallbackScore : 0, slopeStdError: 1.5 };
    }
    
    let slope = covXY / regularizedDenominator;

    // Clamp de segurança: um aluno não consegue aprender (nem desaprender) mais do 
    // que 5% ao dia sustentadamente. (Ref: Evolução Pedagógica Institucional)
    const maxSlopeLimit = maxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;

    // Erro padrão robusto (ajustado para small samples via Kish Effective N)
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

export function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    const now = options.referenceDate || Date.now();
    const t0 = safeDateParse(sorted[0].date || sorted[0].createdAt).getTime();
    
    // Kahan summation para precisão institucional O(N)
    let sumW = 0, cW = 0;
    let sumW2 = 0, cW2 = 0;
    let sumWX = 0, cWX = 0;
    let sumWXX = 0, cWXX = 0;
    let rss = 0, cRSS = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const hDate = h.date || h.createdAt;
        const x = (safeDateParse(hDate).getTime() - t0) / 86400000;
        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - safeDateParse(hDate).getTime()) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const w = Math.max(EPSILON_WEIGHT, Math.exp(-lambda * t));

        const pred = intercept + slope * x;
        const residualSq = Math.pow(y - pred, 2);
        
        // Inline Kahan Summation (Performance Crítica)
        const valW = w;
        const yW = valW - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;
        
        const valW2 = w * w;
        const yW2 = valW2 - cW2; const tW2 = sumW2 + yW2; cW2 = (tW2 - sumW2) - yW2; sumW2 = tW2;
        
        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;
        
        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;
        
        const valRSS = w * residualSq;
        const yRSS = valRSS - cRSS; const tRSS = rss + yRSS; cRSS = (tRSS - rss) - yRSS; rss = tRSS;
    }

    if (sumW2 <= 1e-15) return 1.5 * (maxScore / 100);
    
    const effectiveN = (sumW * sumW) / sumW2;
    const scaleFactorFallback = maxScore / 100;

    if (effectiveN <= 2.1) return 1.5 * scaleFactorFallback;

    const variance = (rss / sumW) * (effectiveN / (effectiveN - 2));
    const det = sumW * sumWXX - sumWX * sumWX;

    if (Math.abs(det) < 1e-6) return 1.5;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

function getHistoryDateValue(entry) {
    return entry?.date || entry?.createdAt || null;
}

function getHistoryTime(entry) {
    const parsed = normalizeDate(getHistoryDateValue(entry));
    return parsed ? parsed.getTime() : NaN;
}

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
    return kahanMean(arr);
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
        ? kahanSum(clean.map(val => Math.pow(val - m, 2))) / (n - 1)
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
    
    const sumSq = clean.map(x => Math.pow(x - m, 2));
    // Este helper é usado pelos testes rigorosos como desvio padrão populacional (ddof=0).
    const v = clean.length > 0 ? kahanSum(sumSq) / clean.length : 0;
    
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
    const cubeDiffs = clean.map(val => Math.pow(val - m, 3));
    const sumCube = kahanSum(cubeDiffs);
    
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
    const historySortedForGaps = history ? history
        .map(h => ({ original: h, time: getHistoryTime(h) }))
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => a.time - b.time)
        .map(item => item.original) : [];
    if (historySortedForGaps.length > 1) {
        for (let i = 1; i < historySortedForGaps.length; i++) {
            const time1 = getHistoryTime(historySortedForGaps[i]);
            const time0 = getHistoryTime(historySortedForGaps[i - 1]);
            const gap = (time1 - time0) / 86400000;
            if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
        }
    }
    // CORREÇÃO: Impedir que a micro-frequência crie inércia infinita (Assuma mínimo de meio dia) (Bug 1.2 Fix)
    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;

    const totalQuestionsHist = history ? kahanSum(history.map(h => Number(h.total) || 20)) : 0;
    // CORREÇÃO: Usar obrigatoriamente a linha do tempo previamente ordenada (historySortedForGaps) 
    // para não distorcer o fluxo de tempo e explodir a memória ativa.
    const historyDays = historySortedForGaps && historySortedForGaps.length > 1 
        ? Math.max(1, (getHistoryTime(historySortedForGaps[historySortedForGaps.length - 1]) - getHistoryTime(historySortedForGaps[0])) / 86400000) 
        : 1;
    const questionsPerDay = totalQuestionsHist / historyDays;

    const volumeCapacity = questionsPerDay * 30;
    
    // O teto adapta-se à realidade hiperativa do aluno
    const dynamicAlphaCap = Math.max(250, Math.floor(Math.min(baseCapacity, volumeCapacity)));
    const dynamicEffectiveN = dynamicAlphaCap;
    
    const now = options.referenceDate ? normalizeDate(options.referenceDate).getTime() : Date.now();

    if (history && history.length > 0) {
        // OTIMIZAÇÃO: Pré-calcular tempos para evitar vazamento de memória no sort
        const historyWithTime = history.map(h => ({
            ...h,
            _parsedTime: getHistoryTime(h)
        }));
        
        const sortedHistory = historyWithTime.sort((a, b) => {
            const timeA = Number.isFinite(a._parsedTime) ? a._parsedTime : 0;
            const timeB = Number.isFinite(b._parsedTime) ? b._parsedTime : 0;
            return timeA - timeB;
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
            const entryDate = normalizeDate(getHistoryDateValue(h));
            const prevDate = i > 0 ? normalizeDate(getHistoryDateValue(sortedHistory[i - 1])) : entryDate;
            
            // CORREÇÃO: Impedir que Invalid Dates gerem NaNs.
            const timeEntry = entryDate?.getTime();
            const timePrev = prevDate?.getTime();
            const gapDays = (Number.isFinite(timeEntry) && Number.isFinite(timePrev)) 
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
            // [TRI FIX]: Se houver um peso/dificuldade no item, escalamos a confiança bayesiana.
            // Acertos em questões difíceis pesam mais na subida do nível.
            const itemWeight = Number(h.weight || h.difficulty || 1.0);
            
            if (isPurePercentage) {
                const syntheticN = getSyntheticTotal(safeMaxScore) * itemWeight;
                alpha += pct * syntheticN;
                beta += (1 - pct) * syntheticN;
            } else {
                let correct = Math.round(pct * total);
                if (total >= 1) {
                    const safeCorrect = Math.max(0, Math.min(total, correct));
                    const acertosHoje = safeCorrect * itemWeight;
                    const errosHoje = (total - safeCorrect) * itemWeight;
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
    }
    
    // Decaimento final até o dia de hoje (ou data de referência do gráfico)
    const sortedHistory = getSortedHistory(history);
    const lastEntry = (sortedHistory && sortedHistory.length > 0) ? sortedHistory[sortedHistory.length - 1] : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastDate = normalizeDate(lastDateStr);
        const gapToToday = Math.max(0, Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        if (gapToToday > 0) {
            const finalLambdaBase = (sortedHistory && sortedHistory.length > 0) ? computeAdaptiveLambda(sortedHistory) : 0.08;
            const rawFinalLambda = finalLambdaBase * Math.exp(-0.15 * ((sortedHistory ? sortedHistory.length : 0) || 1));
            const finalLambda = Math.max(0.005, rawFinalLambda);
            
            const finalDecay = Math.exp(-finalLambda * gapToToday);
            const nBeforeDecay = alpha + beta;
            const currentP = nBeforeDecay > 0 ? alpha / nBeforeDecay : 0.5;
            
            const epistemicDecay = Math.pow(finalDecay, 0.35); 
            const epistemicFloor = Math.max(3.0, Math.min(10.0, maxNEver * 0.05));
            const nAfterDecay = Math.max(epistemicFloor, Math.min(nBeforeDecay, nBeforeDecay * epistemicDecay));
            
            const regressedP = (currentP * finalDecay) + (0.5 * (1 - finalDecay));

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
    const _bayesianMean = p * safeMaxScore;
    const effectiveAlpha = p * effectiveN;

    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    const mediaDeQuestoesDoAluno = history && history.length > 0 
        ? history.reduce((acc, h) => acc + (Number(h.total) || 20), 0) / history.length 
        : 100;
    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(mediaDeQuestoesDoAluno));
    
    // CORREÇÃO: Clamp matemático. A incerteza epistêmica (falta de dados infinitos) 
    // nunca pode ser estatisticamente igual a zero (1e-6 previne o colapso do Monte Carlo).
    const rawEpistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const epistemicVar = Math.max(1e-6, rawEpistemicVar);
    
    const rawAleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;
    const aleatoricVar = Math.max(1e-6, rawAleatoricVar);

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(predictiveVariance);

    // FIX: Substituição do Z_95 estático pelo Multiplicador T-Student Adaptativo.
    // Expande corretamente o cone de incerteza para N pequeno ou muito decaído no tempo.
    const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });
    const marginOfError = tMultiplier * effectiveSd * safeMaxScore;

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
        mean: Number(centerForCI.toFixed(2)), // 🎯 FIX: Média de Shrinkage (Center) para alinhar com CI
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
        const score = getSafeScore(h, safeMaxScore);
        // CORREÇÃO: Se não há volume (total=0) mas a nota é válida, injetamos o volume sintético.
        // Protegemos contra a perda do valor caso 'h' seja um número puro (polimorfismo).
        if ((Number(h?.total) || 0) === 0 && !Number.isNaN(score)) {
            if (typeof h === 'number') {
                return { score: h, total: syntheticTotal };
            }
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
    
    const weightedScores = validHistoryForMean.map(h => getSafeScore(h, safeMaxScore) * (Number(h.total) || 0));
    const m = actualTotalQ > 0
        ? kahanSum(weightedScores) / actualTotalQ
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
                // [TRI] Peso adicional de dificuldade se disponível
                const difficultyWeight = Number(h.weight || h.difficulty || 1.0);
                const effectiveWeight = w * difficultyWeight;
                
                wVarSum += effectiveWeight * Math.pow(safeScore - m, 2);
                sumW += effectiveWeight;
                sumW2 += Math.pow(effectiveWeight, 2);
            }
        });

        // Estimador imparcial de variância ponderada com blindagem contra pesos dominantes únicos
        const kishDifference = sumW - (sumW2 / sumW);
        
        // FIX: Se a diferença for muito pequena (um simulado engoliu 99% do peso), 
        // evitamos o magic number anterior e recuamos de forma conservadora para a soma bruta.
        const kishDenom = kishDifference > 1e-4 ? kishDifference : Math.max(1e-4, sumW);

        const sampleVar = sumW > 0 
            ? wVarSum / kishDenom
            : 0; // Se não há pesos, não há variância.

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

        // BUG-AUDIT-06 FIX: Threshold unificado (1.5) com projection.js para evitar discrepância 4x.
        const kishDenomTerm = Number.isFinite(n_eff) && n_eff > 1.5 ? (n_eff - 1) : 1;
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
        const timeA = safeDateParse(a.date).getTime();
        const timeB = safeDateParse(b.date).getTime();
        return (timeA || 0) - (timeB || 0);
    });
    
    const lastScore = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore)
        : m;
        
    const limiteSuperior = safeMaxScore - lastScore; 
    // A maior queda possível é perder o que já se tem (chegar a 0)
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

/**
 * Calcula a Média Móvel Exponencial (EMA) com correção de viés de inicialização.
 * O Marco Zero (T0) é o primeiro valor empírico, prevenindo a âncora no zero.
 */
export const calculateEMA = (scores, alpha = 0.25) => {
    if (!scores || scores.length === 0) return 0;
    
    // O Marco Zero da EMA é estritamente o valor empírico mais antigo, NÃO ZERO. (Bug 4 Fix)
    let ema = scores[0]; 
    
    // Começa a iteração a partir do 1 (segundo simulado)
    for (let i = 1; i < scores.length; i++) {
        // Dinamismo: O alpha deve ser maior se a nota subiu muito (absorvemos o sucesso rápido,
        // mas resistimos à queda brusca - Princípio do Benefício da Dúvida).
        const trendBonus = scores[i] > ema ? 0.05 : 0;
        const currentAlpha = Math.min(1, alpha + trendBonus);
        
        ema = (scores[i] * currentAlpha) + (ema * (1 - currentAlpha));
    }
    
    return ema;
};

/**
 * Calcula a Time-Weighted Exponential Moving Average (T-EMA).
 * Resolve a distorção temporal onde simulados com gaps de meses recebem o mesmo
 * peso que simulados diários. O peso Alpha (esquecimento) é função do tempo real.
 */
export const calculateTimeWeightedEMA = (historicData, lambda = 0.05) => {
    if (!historicData || historicData.length === 0) return 0;
    
    // Assumimos que historicData possui { score: number, timestamp: number }
    // O timestamp deve estar em milissegundos.
    let ema = historicData[0].score;
    let lastTime = historicData[0].timestamp;
    
    for(let i = 1; i < historicData.length; i++) {
        const currentItem = historicData[i];
        // Gap em dias entre as provas
        const deltaDays = Math.max(0, (currentItem.timestamp - lastTime) / 86400000);
        
        // Se deltaDays é grande, o alpha sobe muito, forçando a EMA a "esquecer" 
        // o passado distante e ancorar na nota nova.
        const dynamicAlpha = 1 - Math.exp(-lambda * deltaDays);
        // Garantir um alpha mínimo mesmo se fez simulados no mesmo dia
        const safeAlpha = Math.max(0.1, Math.min(1.0, dynamicAlpha)); 
        
        ema = safeAlpha * currentItem.score + (1 - safeAlpha) * ema;
        lastTime = currentItem.timestamp;
    }
    
    return ema;
};

/**
 * Calcula o Brier Score (Erro Quadrático Médio das Probabilidades).
 * Mede a acurácia das previsões probabilísticas: (P - Y)^2.
 */
export function computeBrierScore(probability01, observedBinary) {
    const rawP = Number(probability01);
    const p = Math.max(0, Math.min(1, Number.isFinite(rawP) ? rawP : 0));
    const y = observedBinary ? 1 : 0;
    return (p - y) ** 2;
}

/**
 * Neutraliza NaN poisoning em cálculos de Log Loss (Entropia Cruzada).
 * Implementa epsilon clamping (1e-15) conforme exigência técnica.
 */
export function computeLogLoss(probability01, observedBinary) {
    const epsilon = 1e-15;
    const rawP = Number(probability01);
    const safeP = Number.isFinite(rawP) ? rawP : 0.5;
    const p = Math.max(epsilon, Math.min(1 - epsilon, safeP));
    const y = observedBinary ? 1 : 0;
    return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
}

/**
 * Resume a calibração de um conjunto de previsões.
 * Retorna o Brier Score médio e a penalidade de calibração sugerida.
 */
export function summarizeCalibration(scores = [], options = {}) {
    const maxPenalty = Math.max(0, Math.min(1, Number(options.maxPenalty) || 0.25));
    const baseline = Number.isFinite(options.baseline) ? options.baseline : 0.18;

    if (!Array.isArray(scores) || scores.length === 0) {
        return { avgBrier: 0, calibrationPenalty: 0 };
    }

    const finiteScores = scores.map(v => Number(v)).filter(Number.isFinite);
    if (finiteScores.length === 0) return { avgBrier: 0, calibrationPenalty: 0 };
    const sorted = [...finiteScores].sort((a, b) => a - b);
    const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
    const core = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
    const avgBrier = core.reduce((a, b) => a + b, 0) / core.length;
    
    // A penalidade agora é baseada no Brier Score, mas o motor deve monitorar Log Loss
    // para diagnósticos de "falsa sensação de domínio" (Entropia).
    const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
    
    return { avgBrier, calibrationPenalty, sampleSize: finiteScores.length };
}

/**
 * Diagnóstico de Calibração Avançado (Reliability Diagram).
 * Calcula ECE (Expected Calibration Error) e decomposição do Brier Score.
 */
export function computeCalibrationDiagnostics(pairs = [], options = {}) {
  const bins = Math.max(2, Number(options.bins) || 5);
  if (!Array.isArray(pairs) || pairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };

  const cleanPairs = pairs
    .map((p) => ({
      probability: Math.max(0, Math.min(1, Number(p?.probability))),
      observed: Math.max(0, Math.min(1, Number(p?.observed)))
    }))
    .filter((p) => Number.isFinite(p.probability) && Number.isFinite(p.observed));
  if (cleanPairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };

  const sorted = [...cleanPairs].sort((a, b) => a.probability - b.probability);
  let ece = 0;
  let mce = 0;
  const reliability = [];
  const overallObserved = cleanPairs.reduce((a, b) => a + b.observed, 0) / cleanPairs.length;
  let relTerm = 0;
  let resTerm = 0;
  
  // [FIX 3] Usar bins de largura fixa (Equal Width) para evitar aglomeração visual
  for (let i = 0; i < bins; i++) {
    const binMin = i / bins;
    const binMax = (i + 1) / bins;
    
    // Filtra pares que caem dentro deste intervalo de probabilidade
    const slice = sorted.filter(p => p.probability >= binMin && p.probability < (i === bins - 1 ? 1.01 : binMax));
    
    if (slice.length === 0) continue;
    
    const meanPred = slice.reduce((a, b) => a + b.probability, 0) / slice.length;
    const observedRate = slice.reduce((a, b) => a + b.observed, 0) / slice.length;
    const gap = Math.abs(meanPred - observedRate);
    const weight = slice.length / cleanPairs.length;
    ece += weight * gap;
    mce = Math.max(mce, gap);
    relTerm += weight * ((meanPred - observedRate) ** 2);
    resTerm += weight * ((observedRate - overallObserved) ** 2);
    reliability.push({ bin: i + 1, count: slice.length, meanPred, observedRate, gap });
  }
  const uncertainty = overallObserved * (1 - overallObserved);
  return {
    ece,
    mce,
    reliability,
    brierDecomposition: {
      reliability: relTerm,
      resolution: resTerm,
      uncertainty
    }
  };
}

/**
 * Encolhe a probabilidade em direção ao valor neutro (50%) com base na penalidade.
 */
export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
    const p = Math.max(0, Math.min(100, Number(probabilityPct) || 0));
    const limit = Math.max(0, Math.min(1, Number(maxAppliedPenalty) || 0.5));
    const k = Math.max(0, Math.min(limit, Number(penalty) || 0));
    const neutral = Math.max(0, Math.min(100, Number(neutralPct) || 50));
    return p * (1 - k) + neutral * k;
}
