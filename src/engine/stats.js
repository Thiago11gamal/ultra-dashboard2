
export const BAYESIAN_DECAY_FACTOR = 0.985;

// NEW: Multi-timescale decay for better retention modeling
export const RETENTION_DECAY_SHORT = 0.94; // fast forgetting (recent cramming)
export const RETENTION_DECAY_LONG = 0.992;  // long term consolidation

/**
 * NEW: Improved retention probability using dual timescale decay.
 * Combines short-term rapid decay with long-term slow decay.
 */
export function computeImprovedRetentionProbability(historyLength, lastGapDays = 7, maxAlpha = 0.9) {
  const shortDecay = Math.pow(RETENTION_DECAY_SHORT, Math.max(0, lastGapDays));
  const longDecay = Math.pow(RETENTION_DECAY_LONG, Math.max(0, lastGapDays * 0.6));
  const blended = 0.6 * shortDecay + 0.4 * longDecay;
  return Math.max(0.15, Math.min(maxAlpha, blended * maxAlpha));
}
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

/**
 * MEMORY SAFETY: Prune very old or excessive history points while preserving
 * statistical integrity (recent + evenly spaced older samples).
 * Helps prevent unbounded memory growth in long-term users without destroying
 * long-term trend signals for projections/volatility.
 */
export function pruneHistoryForMemory(history = [], maxPoints = 1500, maxAgeDays = 365 * 5) {
    const sorted = getSortedHistory(history);
    if (!sorted.length) return sorted;
    const now = Date.now();
    const cutoff = now - maxAgeDays * 86400000;

    // Filter by age
    let filtered = sorted.filter(h => {
        const t = safeDateParse(h.date || h.createdAt).getTime();
        return Number.isFinite(t) && t >= cutoff;
    });

    if (filtered.length <= maxPoints) return filtered;

    // Keep all recent (last 20%), plus evenly spaced older
    const recentCount = Math.max(10, Math.floor(maxPoints * 0.2));
    const older = filtered.slice(0, -recentCount);
    const recent = filtered.slice(-recentCount);

    if (older.length <= maxPoints - recentCount) return filtered;

    // 🐛 FIX 1: Utilizar interpolação de ponto flutuante em vez de Math.ceil
    // Garante que recolhemos exatamente as amostras necessárias de forma uniforme, sem saltar dados.
    const targetCount = maxPoints - recentCount;
    const factor = older.length / targetCount;
    const sampledOlder = [];
    
    for (let i = 0; i < targetCount; i++) {
        sampledOlder.push(older[Math.floor(i * factor)]);
    }

    return [...sampledOlder, ...recent].slice(0, maxPoints);
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    lambda = Math.max(0, Math.min(1, lambda ?? 0.08));
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
        const timeMs = safeDateParse(hDate).getTime();
        
        if (Number.isNaN(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - timeMs) / 86400000);
        
        // Calcula o peso exponencial, mas NUNCA deixa zerar completamente (Bug 2 Fix)
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);

        // FIX #6: Removido hack de jitter (processedIdx * 1e-5).
        // Usar tempo puro em dias. A ridge penalty já estabiliza matrizes singulares
        // ou com x duplicados. O desempate temporal fica por conta do sort estável em getSortedHistory.
        const x = ((safeDateParse(hDate).getTime() - safeDateParse(sorted[0].date || sorted[0].createdAt).getTime()) / 86400000);

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
    // Ridge penalty proporcional à variância dos dados para estabilidade independente da escala
    const RIDGE_PENALTY = Math.max(1e-8, (sumWXX > 0 ? sumWXX / Math.max(1, sumW) : 1) * 1e-4); 
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
        const timeMs = safeDateParse(hDate).getTime();
        if (Number.isNaN(timeMs)) continue;
        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        // FIX #6: Removido hack de jitter (processedIdx * 1e-5).
        // Tempo puro. Ridge e verificação de det já cuidam de singularidade.
        const x = ((timeMs - t0) / 86400000);

        const t = Math.max(0, (now - timeMs) / 86400000);
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

    if (Math.abs(det) < 1e-6) return 1.5 * (maxScore / 100);
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
        ? kahanSum(scores.map(s => Math.pow(s - globalMean, 2))) / (scores.length - 1)
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
    const m = kahanMean(clean);
    
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
    const n = clean.length;
    if (n < 3) return 0;
    
    const m = mean(clean);
    
    // CORREÇÃO: Utilizar a variância amostral (N-1) para o cálculo do Fisher-Pearson G1
    const sumSq = kahanSum(clean.map(val => Math.pow(val - m, 2)));
    const sampleVar = sumSq / (n - 1);
    const s = Math.sqrt(sampleVar);
    
    // Tolerância de underflow. Se o desvio for inferior a 0.00001,
    // a assimetria é considerada estatisticamente nula.
    if (s < 1e-5) return 0;

    const cubeDiffs = clean.map(val => Math.pow(val - m, 3));
    const sumCube = kahanSum(cubeDiffs);
    
    // FIX 3: Proteção sobre a raiz do desvio e não sobre o produto ao cubo.
    // Preserva o sinal e a magnitude de desvios padrão pequenos (ex: SD = 0.001)
    const safeS = Math.max(1e-5, s);
    const skewness = (n * sumCube) / ((n - 1) * (n - 2) * Math.pow(safeS, 3));
    
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
        alpha = Math.max(0, Number(arg1) || 1);
        beta = Math.max(0, Number(arg2) || 1);
        const rawMax = Number(arg3);
        safeMaxScore = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
        options = arg4 || {};
    } else {
        // Modo B: Score Direto (score, n, maxScore, options)
        history = [];
        const score = Math.max(0, Number(historyOrScore) || 0);
        const n_eff = Math.max(0, Number(arg1) || 1);
        const rawMax = Number(arg2);
        safeMaxScore = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
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
    
    const refDateObj = options.referenceDate ? normalizeDate(options.referenceDate) : null;
    const now = refDateObj ? refDateObj.getTime() : Date.now();

    const _computeEmpiricalPrior = (histSlice, safeMaxScore, options) => {
        if (!histSlice || histSlice.length === 0) return 0.5;
        const val = kahanMean(histSlice.map(x => {
            let rawPct = getSafeScore(x, safeMaxScore) / safeMaxScore;
            if (options.isPenalizedFormat) {
                rawPct = Math.max(0.05, (rawPct + 1) / 2);
            } else {
                rawPct = Math.max(0, rawPct);
            }
            return Math.min(1, rawPct);
        }));
        return Number.isFinite(val) ? val : 0.5;
    };

    const globalEmpiricalPrior = _computeEmpiricalPrior(historySortedForGaps, safeMaxScore, options);

    if (history && history.length > 0) {
        const sortedHistory = historySortedForGaps;
        
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
                
                // CORREÇÃO: A regressão à média em tempos de inatividade deve ancorar-se 
                // no patamar consolidado do aluno, não num lançamento de moeda (0.5).
                const priorP = globalEmpiricalPrior;
                const regressedP = (currentP * entryDecay) + (priorP * (1 - entryDecay));

                alpha = nAfterDecay * regressedP;
                beta = nAfterDecay * (1 - regressedP);
            }

            // 2. Agora injetamos a nota na matemática (SEM usar `continue`)
            // [TRI FIX]: Se houver um peso/dificuldade no item, escalamos a confiança bayesiana.
            // Acertos em questões difíceis pesam mais na subida do nível.
            const itemWeight = Math.max(0.001, Number(h.weight || h.difficulty || 1.0));
            
            // FIX #5: Synthetic N mais inteligente
            // Em vez de fixo em 20, usa média dos totais reais do histórico quando disponível.
            // Isso evita sub ou superestimar "equivalente de questões" para entradas de % pura.
            const avgTotal = history.length > 0 
                ? (kahanSum(history.map(hh => Number(hh.total) || 20)) / history.length) 
                : getSyntheticTotal(safeMaxScore);
            
            const stepCap = dynamicAlphaCap; // O limite cognitivo vivo

            // FIX 2: Blindagem contra Wipeout de Volume
            // Limitamos a inovação (choque diário) ANTES de a somar ao histórico acumulado.
            // Impede que um dia com 2000 questões destrua o peso das 5000 questões feitas no passado.
            if (isPurePercentage) {
                const syntheticN = Math.max(0, avgTotal * itemWeight);
                let alphaHoje = pct * syntheticN;
                let betaHoje = (1 - pct) * syntheticN;
                
                if ((alphaHoje + betaHoje) > stepCap) {
                    const clampDiario = stepCap / (alphaHoje + betaHoje);
                    alphaHoje *= clampDiario;
                    betaHoje *= clampDiario;
                }
                alpha += alphaHoje;
                beta += betaHoje;
            } else {
                let correct = Math.max(0, Math.round(pct * total));
                if (total >= 1) {
                    const safeCorrect = Math.max(0, Math.min(total, correct));
                    let acertosHoje = Math.max(0, safeCorrect * itemWeight);
                    let errosHoje = Math.max(0, (total - safeCorrect) * itemWeight);
                    
                    if ((acertosHoje + errosHoje) > stepCap) {
                        const clampDiario = stepCap / (acertosHoje + errosHoje);
                        acertosHoje *= clampDiario;
                        errosHoje *= clampDiario;
                    }
                    alpha += acertosHoje;
                    beta += errosHoje;
                }
            }

            // 3. O teto global atua agora de forma segura (Shrinkage)
            const currentN = alpha + beta;

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
    const lastEntry = (historySortedForGaps && historySortedForGaps.length > 0) ? historySortedForGaps[historySortedForGaps.length - 1] : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastDate = normalizeDate(lastDateStr);
        const gapToToday = Math.max(0, Math.floor((now - (lastDate ? lastDate.getTime() : now)) / (1000 * 60 * 60 * 24)));
        
        if (gapToToday > 0) {
            const finalLambdaBase = (historySortedForGaps && historySortedForGaps.length > 0) ? computeAdaptiveLambda(historySortedForGaps) : 0.08;
            const rawFinalLambda = finalLambdaBase * Math.exp(-0.15 * ((historySortedForGaps ? historySortedForGaps.length : 0) || 1));
            const finalLambda = Math.max(0.005, rawFinalLambda);
            
            const finalDecay = Math.exp(-finalLambda * gapToToday);
            const nBeforeDecay = alpha + beta;
            const currentP = nBeforeDecay > 0 ? alpha / nBeforeDecay : 0.5;
            
            const epistemicDecay = Math.pow(finalDecay, 0.35); 
            const epistemicFloor = Math.max(3.0, Math.min(10.0, maxNEver * 0.05));
            const nAfterDecay = Math.max(epistemicFloor, Math.min(nBeforeDecay, nBeforeDecay * epistemicDecay));
            
            // O mesmo tratamento de patamar empírico para o gap final (Hoje)
            const empiricalPriorFinal = globalEmpiricalPrior;
            const regressedP = (currentP * finalDecay) + (empiricalPriorFinal * (1 - finalDecay));

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
    const trueMean = p * safeMaxScore;
    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

    // GUARD: Garantir que a verdadeira média Bayesiana SEMPRE esteja dentro do CI
    if (trueMean < ciLow) ciLow = trueMean;
    if (trueMean > ciHigh) ciHigh = trueMean;

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
        // FIX #5: Retornar precisão completa (sem toFixed prematuro). Formatação na UI.
        mean: trueMean,
        sd: effectiveSd * safeMaxScore,
        ciLow: strictLow,
        ciHigh: strictHigh,
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
    const scores = historyToUse.map(h => getSafeScore(h, safeMaxScore)).filter(Number.isFinite);

    // CORREÇÃO: Filtrar notas corrompidas ANTES de aplicar o peso de Kish na média,
    // garantindo que não dividimos por um denominador fantasma.
    const validHistoryForMean = historyToUse.filter(h => !Number.isNaN(getSafeScore(h, safeMaxScore)));
    
    let sumWeightMean = 0;
    let sumScoreMean = 0;

    validHistoryForMean.forEach(h => {
        const w = Number(h.total) || 0;
        if (w > 0) {
            // A média agora respeita o mesmo tensor geométrico da variância
            const diffWeight = Number(h.weight || h.difficulty || 1.0);
            const effW = w * diffWeight;
            sumWeightMean += effW;
            sumScoreMean += getSafeScore(h, safeMaxScore) * effW;
        }
    });

    const m = sumWeightMean > 0 ? sumScoreMean / sumWeightMean : mean(scores);

    let variance = 0;
    if (historyToUse.length > 1) {
        // 🎯 FALÁCIA ECOLÓGICA (Fix): Variância entre simulados (tests), não entre questões.
        // O peso do simulado deve levado em conta, mas o DOF é baseado no N de simulados (histórico).
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0; // Somatório dos pesos ao quadrado

        // Mecanismo de robustez contra outliers: cálculo de desvio absoluto mediano (MAD) para Winsorização
        const sortedScores = [...scores].sort((a, b) => a - b);
        const median = sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)];
        
        const absoluteDeviations = scores.map(s => Math.abs(s - median)).sort((a, b) => a - b);
        const rawMad = absoluteDeviations.length % 2 === 0
            ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
            : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];
        const mad = rawMad > 0 ? rawMad * 1.4826 : 0.001 * safeMaxScore; 
        const clampLimit = 3.5 * mad;

        // CORREÇÃO: Usar estritamente o validHistoryForMean para que os pesos (w) 
        // e a variância ponderada (wVarSum) sejam calculados numa amostra matematicamente pura.
        validHistoryForMean.forEach(h => {
            // Se não tem volume, o peso É ZERO. Não pode forçar 1. (Bug 1.1 Fix)
            const w = Number(h.total) || 0; 
            if (w > 0) {
                const safeScore = getSafeScore(h, safeMaxScore);
                // Winsorização robusta a outliers baseado no desvio absoluto mediano (MAD)
                const robustScore = Math.max(median - clampLimit, Math.min(median + clampLimit, safeScore));
                
                // [TRI] Peso adicional de dificuldade se disponível
                const difficultyWeight = Number(h.weight || h.difficulty || 1.0);
                const effectiveWeight = w * difficultyWeight;
                
                wVarSum += effectiveWeight * Math.pow(robustScore - m, 2);
                sumW += effectiveWeight;
                sumW2 += Math.pow(effectiveWeight, 2);
            }
        });

        // Estimador imparcial de variância ponderada com blindagem contra pesos dominantes únicos
        const kishDifference = sumW - (sumW > 0 ? (sumW2 / sumW) : 0);
        
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
        let KAPPA = Math.max(0.1, Math.min(3.0, popVar / safeStudentVar)); // Teto reduzido para 3.0

        // PATCH 1: Acelerador de Confiança
        const firstDateMs = new Date(historyToUse[0].date || historyToUse[0].createdAt).getTime();
        const lastDateMs = new Date(historyToUse[historyToUse.length - 1].date || historyToUse[historyToUse.length - 1].createdAt).getTime();
        const timeSpreadDays = Math.max(0, (lastDateMs - firstDateMs) / (1000 * 60 * 60 * 24));
        
        if (historyToUse.length >= 2 && sampleVar < (0.0004 * safeMaxScore * safeMaxScore) && timeSpreadDays > 7) {
            KAPPA = KAPPA * Math.exp(-timeSpreadDays / 14); 
        }

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

    const sd = Math.max(Math.sqrt(variance), 0.001 * safeMaxScore);
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
        const timeA = safeDateParse(a.date || a.createdAt).getTime();
        const timeB = safeDateParse(b.date || b.createdAt).getTime();
        return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
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
    const maxObserved = scores.reduce((a, b) => Math.max(a, b), 1);
    
    // Começa a iteração a partir do 1 (segundo simulado)
    for (let i = 1; i < scores.length; i++) {
        // Dinamismo: O alpha deve ser maior se a nota subiu muito (absorvemos o sucesso rápido,
        // mas resistimos à queda brusca - Princípio do Benefício da Dúvida).
        const delta = scores[i] - ema;
        const range = maxObserved; // âncora na escala máxima observada e não no primeiro score
        const absDelta = Math.abs(delta);
        // Benefício da dúvida: absorve sucesso (delta > 0) rápido,
        // resiste à queda (delta < 0) com alpha menor
        const upBonus = Math.min(0.10, 0.05 * (absDelta / range));
        const downBonus = Math.min(0.03, 0.015 * (absDelta / range));
        const trendBonus = delta >= 0 ? upBonus : downBonus;
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
    if (!Array.isArray(historicData) || historicData.length === 0) return null;
    
    const validData = historicData.filter(d => 
        Number.isFinite(d?.score) && (d?.timestamp != null || d?.date != null)
    );
    if (validData.length === 0) return null;
    
    // Assumimos que historicData possui { score: number, timestamp: number }
    // O timestamp deve estar em milissegundos.
    const getTime = (d) => {
        if (d?.timestamp != null && Number.isFinite(d.timestamp)) return d.timestamp;
        if (d?.date != null) {
            const ms = new Date(d.date).getTime();
            return Number.isFinite(ms) ? ms : NaN;
        }
        return NaN;
    };

    let ema = validData[0].score;
    let lastTime = getTime(validData[0]);
    
    for(let i = 1; i < validData.length; i++) {
        const currentItem = validData[i];
        const currentTime = getTime(currentItem);
        if (!Number.isFinite(currentTime) || !Number.isFinite(lastTime)) continue;
        // Gap em dias entre as provas
        const deltaDays = Math.max(0, (currentTime - lastTime) / 86400000);
        
        // Se deltaDays é grande, o alpha sobe muito, forçando a EMA a "esquecer" 
        // o passado distante e ancorar na nota nova.
        const dynamicAlpha = 1 - Math.exp(-lambda * deltaDays);
        // Garantir um alpha mínimo mesmo se fez simulados no mesmo dia
        const safeAlpha = Math.max(0.1, Math.min(1.0, dynamicAlpha)); 
        
        ema = safeAlpha * currentItem.score + (1 - safeAlpha) * ema;
        lastTime = currentTime;
    }
    
    return ema;
};

/**
 * Calcula o Brier Score (Erro Quadrático Médio das Probabilidades).
 * Mede a acurácia das previsões probabilísticas: (P - Y)^2.
 */
// Consolidated re-exports from canonical source (utils/calibration.js) 
// to eliminate duplication bugs that could cause divergent diagnostics/math behavior or data errors.
export { 
  computeBrierScore,
  computeLogLoss,
  summarizeCalibration,
  computeCalibrationDiagnostics,
  shrinkProbabilityToNeutral 
} from '../utils/calibration.js';

/**
 * Aplica um ajuste Hierárquico Bayesiano (Shrinkage) aos dados das categorias.
 * Categorias com poucos dados (menor 'n') sofrem "encolhimento" em direção à média global.
 * @param {Array} categories Array de categorias com { mean, sd, n }
 * @param {Number} pooledSD Desvio padrão global/agrupado
 * @returns {Array} Categorias atualizadas com bayesianMean e bayesianSd
 */
export function computeHierarchicalAdjustment(categories, pooledSD) {
    if (!Array.isArray(categories) || categories.length === 0) return categories;

    const validCategories = categories.filter(c => Number.isFinite(c.mean) && Number.isFinite(c.n) && c.n > 0);
    if (validCategories.length === 0) return categories;

    // Calcular média global (ponderada pelo 'n' de cada disciplina)
    const globalSum = kahanSum(validCategories.map(c => (c.mean || 0) * (c.n || 0)));
    const globalN = kahanSum(validCategories.map(c => c.n || 0));
    const globalMean = globalSum / Math.max(1, globalN);

    // Variância empírica entre as médias das categorias (tau^2)
    const tau2 = kahanSum(validCategories.map(c => Math.pow((c.mean || 0) - globalMean, 2))) / Math.max(1, validCategories.length - 1);

    return categories.map(cat => {
        if (!Number.isFinite(cat.mean) || !cat.n) {
            return { ...cat, bayesianMean: cat.mean, bayesianSd: cat.sd };
        }
        
        // Variância da estimativa da média local (sigma^2 / n)
        // Se a disciplina não tiver SD próprio, usamos o pooledSD
        const localSD = Number.isFinite(cat.sd) ? cat.sd : (pooledSD || 15);
        const localVar = Math.pow(localSD, 2) / Math.max(1, cat.n);
        
        // BUG-FIX: Added parentheses to fix operator precedence. Was `localVar + tau2 || 1`
        // which parsed as `localVar + (tau2 || 1)`, returning `localVar + 1` when tau2=0,
        // making every B always ≈1 and shrinking all categories to the global mean.
        const denom = localVar + tau2;
        const B = denom > 1e-15 ? localVar / denom : 0;
        
        // Média ajustada empiricamente (Bayes)
        const bayesianMean = B * globalMean + (1 - B) * cat.mean;
        
        // Atualizamos também o SD, que pode ser afetado, mas na implementação simples mantemos o localSD
        const bayesianSd = localSD;
        
        return {
            ...cat,
            bayesianMean,
            bayesianSd,
            shrinkage: B
        };
    });
}
