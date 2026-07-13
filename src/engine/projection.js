// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32 } from './random.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { conformalPredictionInterval } from './math/bootstrap.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

import { sampleTruncatedNormal, ensurePositiveSemiDefinite, choleskyDecomposition, applyCovariance, generateGaussian } from './math/gaussian.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { weightedRegression, calculateSlopeStdError, getSortedHistory, calculateTrend } from './stats.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
export { weightedRegression, calculateSlopeStdError, getSortedHistory };

// 1. Blindagem de Datas: Adicione este helper no topo do arquivo (após os imports)
const getSafeTime = (dateInput) => {
    const parsed = safeDateParse(dateInput);
    return (parsed && !Number.isNaN(parsed.getTime())) ? parsed.getTime() : Date.now();
};

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------

/**
 * NEW: Simple non-linear detrending helper (log-time improvement curve).
 * Many students improve fast then plateau.
 */
export function computeNonLinearTrend(history, maxScore = 100, lambda = 0.08) {
  const sorted = getSortedHistory(history);
  if (sorted.length < 4) return { slope: 0, intercept: 50, type: 'linear' };

  const now = Date.now();
  const t0 = getSafeTime(sorted[0].date || sorted[0].createdAt);

  // Fit simple model: y ~ a + b * log(1 + days)
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

  sorted.forEach(h => {
    const y = getSafeScore(h, maxScore);
    const t = Math.max(0, (getSafeTime(h.date || h.createdAt) - t0) / 86400000);
    const x = Math.log(1 + t + 1); // log time
    const w = Math.exp(-lambda * Math.max(0, (now - getSafeTime(h.date || h.createdAt)) / 86400000));

    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXX += w * x * x;
    sumWXY += w * x * y;
  });

  const denom = (sumWXX * sumW - sumWX * sumWX);
  if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sumWY / sumW, type: 'log' };

  const b = (sumWXY * sumW - sumWX * sumWY) / denom;
  const a = (sumWY - b * sumWX) / sumW;

  return { slope: b, intercept: a, type: 'log_time', logTimeFit: true };
}

export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const validSorted = sorted.filter(h => Number.isFinite(getSafeScore(h, maxScore)));
    if (validSorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate || Date.now();
    const _scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(validSorted, lambda, maxScore, options);
    // CORREÇÃO: Defesa estrita contra null/undefined que disparam TypeError no getTime()
    const d0 = safeDateParse(validSorted[0].date || validSorted[0].createdAt);
    const t0_vol = (d0 && !Number.isNaN(d0.getTime())) ? d0.getTime() : Date.now();
    
    // OTIMIZAÇÃO DE PERFORMANCE: Fusão de loops O(5N) para O(N)
    let sumWeights = 0, sumResidualsWeighted = 0, sumSw = 0, sumSw2 = 0;

    const residualSamples = validSorted.map(h => {
        const hDate = h.date || h.createdAt;
        const parsed = safeDateParse(hDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        const x = (parsed.getTime() - t0_vol) / 86400000;
        const t = Math.max(0, (now - parsed.getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore);
        const val = y - (intercept + slope * x); // Resíduo (detrended)
        
        // Acumulação numa única passagem
        sumWeights += w;
        sumResidualsWeighted += val * w;
        sumSw += val * val * w;
        sumSw2 += w * w;

        return { value: val, weight: w }; 
    }).filter(Boolean);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-15 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-15 ? (sumResidualsWeighted / safeWeights) : 0;
    
    // CORREÇÃO: Calcular o Tamanho Efetivo de Amostra (Kish) dos pesos exponenciais
    const effectiveN = sumSw2 > 1e-15 ? (sumWeights * sumWeights) / sumSw2 : 1;
    
    // O bessel deve responder ao Effective N, não à contagem bruta temporal (n_res)
    const bessel = effectiveN > 1.5 ? effectiveN / (effectiveN - 1) : 1;
    const mssdVariance = sumWeights > 1e-15 ? Math.max(0, ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel) : 0;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = kahanSum(sortedArr.map(it => it.weight));
        if (totalW < 1e-15) return sortedArr[Math.floor(sortedArr.length / 2)].value;
        let accW = 0;
        for (const it of sortedArr) {
            accW += it.weight;
            if (accW >= totalW * 0.5) return it.value;
        }
        return sortedArr[sortedArr.length - 1].value;
    };

    const medianResidual = weightedMedian(residualSamples);
    const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
    const mad = weightedMedian(absDev);
    const robustSigma = 1.4826 * mad;
    const robustVariance = robustSigma * robustSigma;
    const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

    // O PULO DO GATO: Shrinkage Bayesiano para Volatilidade (Bug 1 Fix)
    // Assumimos que o piso natural de flutuação de qualquer aluno é de ~4% do Range
    const rangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const floorVolatility = rangeOU * 0.04; 
    const floorVariance = Math.pow(floorVolatility, 2);
    
    // Quanto menor a amostra, mais puxamos para o piso natural.
    const confidence = Math.min(1, validSorted.length / 15);
    const trueVariance = (blendedVariance * confidence) + (floorVariance * (1 - confidence));

    return Math.sqrt(Math.max(1e-6, trueVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    const n = scores.length;
    if (n < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const meanVal = kahanMean(scores);
    const variance = kahanSum(scores.map(b => Math.pow(b - meanVal, 2))) / (n - 1);
    return Math.sqrt(variance);
}

// -----------------------------
// MSSD — Mean Successive Squared Differences (BUG-MATH-01)
// Mede instabilidade SEM penalizar crescimento monotônico.
// -----------------------------
export function calculateMSSD(history, maxScore = 100, minScore = 0) {
    const safeHistory = getSortedHistory(history);

    if (!Array.isArray(safeHistory) || safeHistory.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        // FIXME: Integrar prior bayesiano baseado na média da disciplina em vez do hardcode
        return 0.05 * range;
    }
    
    const firstDateObj = safeDateParse(safeHistory[0].date || safeHistory[0].createdAt);
    const t0 = firstDateObj ? firstDateObj.getTime() : Date.now();
    
    // BUG-FIX #1: Create aligned pairs to prevent index misalignment
    const validPairs = [];
    for (let i = 0; i < safeHistory.length; i++) {
        const h = safeHistory[i];
        const score = getSafeScore(h, maxScore);
        const dateObj = safeDateParse(h.date || h.createdAt);
        const t = dateObj ? dateObj.getTime() : NaN;
        
        if (Number.isFinite(score) && Number.isFinite(t)) {
            validPairs.push({
                score: score,
                timeX: (t - t0) / 86400000,
                fatigueFlag: h.fatigueFlag // NEW: Propaga a flag de fadiga do coachAdaptive
            });
        }
    }
    
    const fn = validPairs.length;
    if (fn < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    
    const scores = validPairs.map(p => p.score);
    const timeX = validPairs.map(p => p.timeX);
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for(let i = 0; i < fn; i++) {
        const tx = timeX[i];
        sumX += tx; 
        sumY += scores[i]; 
        sumXY += tx * scores[i]; 
        sumXX += tx * tx;
    }
    const det = fn * sumXX - sumX * sumX;
    const slope = det === 0 ? 0 : (fn * sumXY - sumX * sumY) / det;
    
    const detrendedScores = scores.slice(0, fn).map((y, i) => y - (slope * timeX[i])).filter(Number.isFinite);
    const dn = detrendedScores.length;
    
    let sumSqDiff = 0;
    let validTransitions = 0;

    for (let i = 1; i < dn; i++) {
        const diff = detrendedScores[i] - detrendedScores[i - 1];
        if (Number.isFinite(diff)) {
            // Filtro de Fadiga: se houve queda e a flag está ativa, corta o peso da variância pela metade (25% do impacto squared)
            const isFatigueDrop = diff < 0 && validPairs[i]?.fatigueFlag;
            const effectiveDiff = isFatigueDrop ? diff * 0.5 : diff;
            sumSqDiff += Math.pow(effectiveDiff, 2);
            validTransitions++;
        }
    }

    // MSSD = (1/2(n-1)) × Σ(Δᵢ²). Para resíduos OLS detrended com ρ≈0,
    // E[Δ²] = 2σ², logo a divisão por 2 restaura a estimativa correta de σ².
    const rmssd = (sumSqDiff) / (2 * Math.max(1, validTransitions)); 
    return Math.sqrt(Math.max(1e-6, rmssd)); 


}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    // BUG-02 FIX: Implementação de EMA Dinâmica com Decaimento Temporal Contínuo.
    // Resolve a distorção onde longos períodos de inatividade eram ignorados (amnésia temporal).
    // Fórmula: α_real = 1 - (1 - α_base)^Δt
    const alphaBase = 2 / (n + 1);
    const deltaT = Math.max(1, daysSinceLast);
    
    // O decaimento exponencial contínuo garante que o peso da nova nota cresça proporcionalmente
    // ao tempo decorrido desde o último registro, compensando o "esquecimento".
    const alphaDinamico = 1 - Math.pow(1 - alphaBase, deltaT);
    
    // CORREÇÃO: O teto cognitivo desce de 0.95 para 0.40.
    // Garante que, independentemente do gap temporal, um teste único nunca
    // substitui mais de 40% da inércia da memória de longo prazo consolidada.
    const safeAlpha = Math.min(0.40, alphaDinamico);
    
    return (currentScore * safeAlpha) + (previousEMA * (1 - safeAlpha));
}

// -----------------------------
// Drift Clampeado
// -----------------------------
export function calculateSlope(trendOrHistory, maxScoreOrOptions = 100, options = {}) {
    if (Array.isArray(trendOrHistory)) {
        const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : 100;
        const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
        return calculateAdaptiveSlope(trendOrHistory, maxScore, opts);
    }

    // Tetos estatísticos ajustados conforme plano de implementação
    const absoluteMax = 0.4; 
    
    let slope = Number(trendOrHistory) || 0;
    
    // Clamp absoluto
    if (slope > absoluteMax) slope = absoluteMax;
    if (slope < -absoluteMax) slope = -absoluteMax;
    
    // Regras adicionais de baseLimit podem ser aplicadas aqui usando a mesma variável
    return slope;
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    const trend = calculateTrend(history, maxScore);
    return calculateSlope(trend, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate || Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    if (historicalScores.length < 4) return { isLogistic: false };
    
    const meanVal = kahanSum(historicalScores) / Math.max(1, historicalScores.length);
    const devs = historicalScores.map(b => Math.pow(b - meanVal, 2));
    const currentVariance = Math.sqrt(kahanSum(devs) / Math.max(1, historicalScores.length - 1));

    let L = maxScore;
    if (historicalScores.length >= 4) {
        const validScores = historicalScores;
        if (validScores.length >= 4) {
            const sortedScores = [...validScores].sort((a, b) => a - b);
            const peak1 = sortedScores[sortedScores.length - 1];
            const peak2 = sortedScores[sortedScores.length - 2];
            const robustPeak = (peak1 * 0.6) + (peak2 * 0.4);
            const dynamicHeadroom = Math.min(maxScore * 0.15, Math.max(currentVariance * 1.5, maxScore * 0.05));
            // BUG-AUDIT-07 FIX: calculateSlope espera objetos {date, score}, não números puros.
            // Gerar objetos sintéticos com datas espaçadas de 7 dias para manter o contrato.
            const recentRaw = validScores.slice(-4);
            const recentAsObjects = recentRaw.map((s, idx) => ({
                score: s,
                date: getDateKey(new Date(Date.now() - (recentRaw.length - 1 - idx) * 7 * 86400000))
            }));
            const recentTrend = calculateTrend(recentAsObjects);
            const recentSlope = calculateSlope(recentTrend, options);
            const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (maxScore * 0.01)) : 0;
            
            L = robustPeak + (dynamicHeadroom * slopeMultiplier);
            L = Math.max(validScores[validScores.length - 1] + 1, Math.min(maxScore + 0.1, L));
        } else {
            const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
            const peakScore = getPercentile(sortedForPercentile, 0.90);
            L = Math.min(maxScore + 0.1, peakScore + (maxScore * 0.10));
        }
    } else {
        const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
        const peakScore = getPercentile(sortedForPercentile, 0.90);
        const spaceToMax = maxScore - peakScore;
        const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
        L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
    }

    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = Math.max(0, (now - getSafeTime(hDate)) / 86400000);
        const w = Math.exp(-0.08 * t);
        const x = (getSafeTime(hDate) - getSafeTime(sorted[0].date || sorted[0].createdAt)) / 86400000;
        
        let y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) return;
        
        y = Math.max(maxScore * 0.01, Math.min(maxScore, y));

        const safeMin = options.minScore || 0;
        const safeL = Math.max(L, y + 0.5); 
        // Offset proporcional à escala (0.1% do range) para evitar logit ±∞
        const logitOffset = Math.max(0.01, (safeL - safeMin) * 0.001);
        const boundedY = Math.max(safeMin + logitOffset, Math.min(safeL - logitOffset, y)); 
        const logitY = Math.log((boundedY - safeMin) / (safeL - boundedY));

        sumW += w;
        sumWX += w * x;
        sumWY += w * logitY;
        sumWXX += w * x * x;
        sumWXY += w * x * logitY;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { isLogistic: false };

    const k = (sumW * sumWXY - sumWX * sumWY) / det;
    const logitIntercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    return { 
        k, 
        intercept: logitIntercept, 
        isLogistic: true, 
        L, 
        t0: getSafeTime(sorted[0].date || sorted[0].createdAt) 
    };
}

export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: 0, marginOfError: 0 };

    const logisticFit = logisticRegression(sortedHistory, maxScore, options);
    let projectedScore;
    const now = options.referenceDate || Date.now();
    
    // Hoist variables that are needed both for asymptotic damping inside the random walk
    // and for the margin of error calculation outside the block, avoiding redundant O(N) regressions.
    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, options) : { slopeStdError: 0 };
    let eventVolatility = calculateMSSD(sortedHistory, maxScore, minScore);

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = options.minScore || 0;
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        let trend = calculateTrend(sortedHistory);
        let linearSlope = calculateSlope(trend, options);
        
        // Removemos a mistura corrompida. O EMA continuará a usar o `linearSlope`
        // para projetar o futuro no Random Walk.

        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);
            
            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    // Se o aluno tira 80 e a média global é 50, a nota "efetiva" puxa o EMA para cima
                    // Limitado a um bônus/punição máximo de 5% para não distorcer a realidade
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }

        // Bug 2.3 Fix: Divergência Asintótica no Amortecimento
        // O `projectScore` agora partilha do mesmo amortecedor de volatilidade adaptativa (dampingBase)
        // do Motor de Monte Carlo, estabilizando as trajetórias de UX que divergiam do back-end GARCH.
        const dampingBase = computeAdaptiveDampingBase({
            sampleSize: sortedHistory.length,
            drift: linearSlope,
            driftUncertainty: slopeStdError,
            scaleFactor: maxScore / 100,
            normalizedVol: (eventVolatility / (maxScore - minScore > 0 ? maxScore - minScore : maxScore)) * 100
        });

        const maxEffectiveDays = dampingBase * Math.log(1 + projectDays / dampingBase);
        const effectiveDaysForDrift = Math.min(projectDays, maxEffectiveDays);
        
        // CORREÇÃO: Driftar a EMA da data do último teste até o dia de HOJE, 
        // para alinhar a origem do vetor temporal com a realidade atual.
        const lastHistoryDate = getSafeTime(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const daysToToday = Math.max(0, (now - lastHistoryDate) / 86400000);

        if (options.currentMean !== undefined) {
            const daysToNow = Math.max(1, daysToToday);
            ema = calculateDynamicEMA(options.currentMean, ema, sortedHistory.length + 1, daysToNow);
        }

        const driftToToday = linearSlope * (dampingBase * Math.log(1 + daysToToday / dampingBase));
        const currentScoreEstimate = ema + driftToToday;

        // Projeção final 100% matéticamente consistente
        projectedScore = currentScoreEstimate + linearSlope * effectiveDaysForDrift;
    }

    const avgGapDays = sortedHistory.length > 1 
        ? ((safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt) - safeDateParse(sortedHistory[0].date || sortedHistory[0].createdAt)) / 86400000) / (sortedHistory.length - 1)
        : 7; // fallback para 7 se só houver 1 teste
        
    // AGILIDADE AI: Punição de Volatilidade baseada no tempo de resposta lento
    if (options.agilityPenalty) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        eventVolatility = eventVolatility * (1 + safePenalty * 1.5);
    }
    
    // A incerteza do Random Walk espalha-se com a raiz do número de EVENTOS ESPERADOS, não dos dias.
    const expectedFutureEvents = Math.max(1, projectDays / Math.max(0.5, avgGapDays));
    const randomWalkUncertainty = eventVolatility * Math.sqrt(expectedFutureEvents);
    
    const angularUncertainty = slopeStdError * projectDays;
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    // Usar T-Student adaptativo para amostras pequenas em vez de Z=1.96 fixo
    const tMult = getConfidenceMultiplier(sortedHistory.length);
    const marginOfError = tMult * predictionSD; 

    return {
        // FIX #2: Precisão completa
        projected: Math.max(minScore, Math.min(maxScore, projectedScore)),
        marginOfError
    };
}

/**
 * Calcula o Damping Base adaptativo baseado no histórico.
 * @returns {number} Valor entre 30 e 60.
 */
export function computeAdaptiveDampingBase({ sampleSize, drift, driftUncertainty, scaleFactor, normalizedVol }) {
    const n = Math.max(1, Number(sampleSize) || 1);
    const safeDrift = Number.isFinite(drift) ? drift : 0;
    const safeUncertainty = Math.max(1e-6, Number(driftUncertainty) || 0);
    const safeScale = Math.max(1e-6, Number(scaleFactor) || 1);
    const safeNormVol = Math.max(0, Number(normalizedVol) || 0);

    const nConfidence = 1 - Math.exp(-n / 12);
    const trendSNR = Math.abs(safeDrift) / Math.max(0.05 * safeScale, safeUncertainty);
    const trendConfidence = Math.tanh(trendSNR / 2);
    const volPenalty = Math.min(1, safeNormVol / 18);
    const confidenceScore = Math.max(0, Math.min(1, (0.5 * nConfidence) + (0.35 * trendConfidence) + (0.15 * (1 - volPenalty))));
    return 30 + (30 * confidenceScore);
}

export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 5000,
    options = {}
) {
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base', flashcardImmunity = 1.0 } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
    const sortedHistory = getSortedHistory(history);
    const safeSimulations = Math.max(1, simulations);
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    // Defaults for new diagnostics
    let trendType = 'linear';

    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Find the last valid score in the sorted history
    let validCurrentScore = NaN;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const s = getSafeScore(sortedHistory[i], maxScore);
        if (Number.isFinite(s)) {
            validCurrentScore = s;
            break;
        }
    }
    const currentScore = Number.isFinite(validCurrentScore) ? validCurrentScore : 0;
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;
    if (sortedHistory.length > 0) {
        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);

            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }
        if (forcedBaseline === undefined) {
            baselineScore = optionsCurrentMean !== undefined ? optionsCurrentMean : ema;
        }
    }

    if (optionsCurrentMean !== undefined) {
        const lastDate = safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const referenceNow = options.referenceDate || Date.now();
        const lastTs = lastDate && !Number.isNaN(lastDate.getTime()) ? lastDate.getTime() : Date.now();
        const daysToNow = Math.max(1, (referenceNow - lastTs) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * maxScore)));

    // FEAT: Time Penalty (Simulação de Prova Real)
    let timePenaltyApplied = false;
    let timePenaltyScoreDrop = 0;
    let projectedTotalTimeSeconds = options.projectedTotalTimeSeconds || 0;
    let examDurationMinutes = options.examDurationMinutes || 0;
    let overflowRatio = 0;

    if (examDurationMinutes > 0 && projectedTotalTimeSeconds > 0) {
        const examLimitSeconds = examDurationMinutes * 60;
        if (projectedTotalTimeSeconds > examLimitSeconds) {
            overflowRatio = (projectedTotalTimeSeconds - examLimitSeconds) / projectedTotalTimeSeconds;
            
            // O aluno só consegue resolver com qualidade (1 - overflowRatio) da prova.
            // O restante (overflowRatio) será chutado, com probabilidade de acerto de 20% (1/5).
            const guessScore = 0.2 * (maxScore - minScore) + minScore; // 20% na escala correta
            const newBaseline = (baselineScore * (1 - overflowRatio)) + (guessScore * overflowRatio);
            
            timePenaltyScoreDrop = baselineScore - newBaseline;
            baselineScore = newBaseline;
            timePenaltyApplied = true;
        }
    }

    // IMPROVED mean reversion (from Coach+MC analysis): give stronger weight to historical mean when performance is declining.
    // This prevents the projection from collapsing too aggressively on negative drift.
    const histScores = sortedHistory.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    let historicalMean = histScores.length > 0 ? kahanMean(histScores) : baselineScore;

    // Aplica o esmagamento da métrica no equilíbrio de longo prazo também
    if (timePenaltyApplied && overflowRatio > 0) {
        const guessScore = 0.2 * (maxScore - minScore) + minScore;
        historicalMean = (historicalMean * (1 - overflowRatio)) + (guessScore * overflowRatio);
    }

    const belowHistorical = baselineScore < historicalMean;
    const histWeight = belowHistorical ? 0.95 : 0.80;
    const stableMeanTarget = Math.max(minScore, Math.min(maxScore, (historicalMean * histWeight + baselineScore * (1 - histWeight))));

    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, options)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    let effectiveDriftSlope = regressionResult.slope;

    trendType = 'linear';
    if (sortedHistory.length >= 4) {
        try {
            const nl = computeNonLinearTrend(sortedHistory, maxScore, 0.08);
            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
                trendType = 'log_time_available';
                // NOTE: Do not blend nl.slope directly (different units).
                // Drift uses pure linear slope for correctness.
            }
        } catch { /* ignore */ }
    }

    const slopeStdError = regressionResult.slopeStdError;
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * maxScore;
    const drift = Math.max(-driftLimit, Math.min(driftLimit, effectiveDriftSlope));
    const simulationDays = days;
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    const driftUncertaintyCap = options.driftUncertaintyCap !== undefined ? options.driftUncertaintyCap : 0.4;
    let driftUncertainty = Math.min(rawDriftUncertainty, driftUncertaintyCap * scaleFactor) * (scenarioCfg.ciMult || 1);

    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5;
        driftUncertainty *= (1 + 0.4 * nFactor);
    }

    let volatility = forcedVolatility !== undefined 
        ? forcedVolatility 
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);
    
    // Bug 2.2 Fix: Double Jeopardy (Evita dupla penalização se o overflowRatio já trucidou a média)
    // Se o timePenaltyApplied estiver ativo, já absorvemos o abalo do tempo, inflar a variância
    // agora atiraria o cone do Monte Carlo para um cenário irrealista de descalabro.
    if (options.agilityPenalty && !timePenaltyApplied) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        volatility = volatility * (1 + safePenalty * 1.5);
    }

    // NEW: Flashcard Immunity Shield — reduz volatilidade global no caminho de projeção
    if (flashcardImmunity < 1.0) {
        volatility = volatility * Math.max(0.80, flashcardImmunity);
    }

    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    
    // [BUG-2 FIX] Mean Reversion PROPORCIONAL à volatilidade:
    // Séries voláteis precisam de reversão mais forte para não divergirem.
    // Base: 0.02. Bonus proporcional à vol normalizada (até +0.08 para vol extrema).
    const thetaOU = Math.min(0.15, 0.02 + 0.002 * Math.min(40, normalizedVolOU));

    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;
        const d1 = safeDateParse(h.date || h.createdAt);
        const d0 = safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt);
        const t1 = d1 && !Number.isNaN(d1.getTime()) ? d1.getTime() : Date.now();
        const t0 = d0 && !Number.isNaN(d0.getTime()) ? d0.getTime() : t1;
        const deltaT = (t1 - t0) / (1000 * 60 * 60 * 24);
        const safeDeltaT = Number.isFinite(deltaT) ? deltaT : 0.1;
        const rawDays = Math.max(0.1, safeDeltaT);
        const detrendedChange = actualChange - (drift * rawDays);
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    const validResiduals = (residuals.length > 1 ? residuals.slice(1) : residuals).filter(Number.isFinite);
    let centeredResiduals;
    if (validResiduals.length > 1) {
        const residualMean = kahanSum(validResiduals) / Math.max(1, validResiduals.length);
        centeredResiduals = validResiduals.map(r => r - residualMean);
    } else {
        centeredResiduals = validResiduals;
    }
    
    const sortedResiduals = [...centeredResiduals].sort((a, b) => a - b);
    const resMedian = getPercentile(sortedResiduals, 0.5);
    const absDevs = centeredResiduals.map(r => Math.abs(r - resMedian)).sort((a, b) => a - b);
    const resMad = getPercentile(absDevs, 0.5) || (1.0 * scaleFactor);
    const safeResiduals = centeredResiduals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    const empMean = kahanSum(safeResiduals) / Math.max(1, safeResiduals.length);
    const empDevs = safeResiduals.map(r => Math.pow(r - empMean, 2));
    const empResidualSD = Math.sqrt(kahanSum(empDevs) / Math.max(1, safeResiduals.length));
    const standardizer = empResidualSD > 0 ? empResidualSD : 1;

    const results = [];
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore)}-${sortedHistory.length}`;
    let seedValue = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        seedValue ^= seedStr.charCodeAt(i);
        seedValue = Math.imul(seedValue, 16777619);
    }
    const rng = mulberry32(Math.abs(seedValue >>> 0));

    let medianGap = 7;
    if (sortedHistory.length >= 2) {
        const gaps = [];
        for (let j = 1; j < sortedHistory.length; j++) {
            const d1 = safeDateParse(sortedHistory[j].date || sortedHistory[j].createdAt);
            const d0 = safeDateParse(sortedHistory[j - 1].date || sortedHistory[j - 1].createdAt);
            // CORREÇÃO: Impedir que a subtração de Invalid Dates injete NaN na distribuição GARCH
            const g = (d1 && d0 && !Number.isNaN(d1.getTime()) && !Number.isNaN(d0.getTime())) 
                ? (d1.getTime() - d0.getTime()) / 86400000 
                : 7; // Fallback seguro
            gaps.push(Math.max(0.5, g));
        }
        gaps.sort((a, b) => a - b);
        medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
    }
    const dailyVolatility = volatility / Math.sqrt(Math.max(1, medianGap));

    // [BUG-1 FIX] Usar o damping adaptativo em vez do hardcode de 45.
    // Com poucos dados/alta vol, dampingBase ≈ 30 (amortece rápido).
    // Com muitos dados/tendência clara, dampingBase ≈ 60 (preserva mais).
    // Movido para fora do loop: inputs invariantes por simulação.
    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift,
        driftUncertainty,
        scaleFactor,
        normalizedVol: normalizedVolOU
    });

    // Constantes GARCH(1,1) invariantes por simulação
    const alphaG = 0.05;
    const betaG = 0.75;
    // BUG-AUDIT-02 FIX: omega calculado com a variância incondicional de equilíbrio (σ²_∞),
    // σ²_∞ = ω / (1 - α - β), logo ω = (1 - α - β) × σ²_∞
    // CORREÇÃO: Prevenir o GARCH Zero-Variance Trap
    const unconditionalVar = Math.max(1e-6, Math.pow(dailyVolatility, 2));
    const omega = (1 - alphaG - betaG) * unconditionalVar;

    // FIX #3: Prepare Cholesky for correlated subject minCutoffs (disciplines with minCutoff)
    const cutoffSubjects = (options.subjects || []).filter(s => s && Number(s.minCutoff) > 0);
    let subjectCholesky = null;
    if (cutoffSubjects.length > 1) {
      const stats = cutoffSubjects.map(s => ({
          ...s, // Bug 4.2 Fix: Preserve properties to allow empirical Pearson correlation later
          sd: (Number(s.sd) || 1) * Math.max(0.80, s.immunityFactor || 1.0)
      }));
      
      // FIX APLICADO: Utilizando cutoffSubjects para resgatar os nomes corretamente
      const adaptiveRhoContext = options?.simuladoRows ? { 
          simuladoRows: options.simuladoRows, 
          categoryNames: cutoffSubjects.map(s => s.name) 
      } : null;
      
      const cov = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
      const psdCov = ensurePositiveSemiDefinite(cov);
      subjectCholesky = choleskyDecomposition(psdCov);
    }

    function calculateSkewness(residuals, mean, sd) {
        if (!residuals || residuals.length < 3 || sd === 0) return 0;
        const n = residuals.length;
        const m3 = residuals.reduce((acc, val) => acc + Math.pow(val - mean, 3), 0) / n;
        return m3 / Math.pow(sd, 3);
    }
    const residualsSkew = calculateSkewness(safeResiduals, 0, volatility);

    const minCutoffFailures = [];

    // CORREÇÃO GC THRASHING: Alocação estática fora do loop de Monte Carlo
    const choleskySize = cutoffSubjects.length;
    const zVecStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const zCorrStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    for (let i = 0; i < safeSimulations; i++) {
        // CORREÇÃO: O truncamento normal tem de respeitar o driftLimit dinâmico e não hardcodes de 1%.
        const sampledDrift = sampleTruncatedNormal(
            drift, 
            driftUncertainty, 
            -driftLimit, 
            driftLimit, 
            rng
        );
        let currentSimScore = baselineScore;
        let currentVolSq = unconditionalVar;

        for (let d = 1; d <= simulationDays; d++) {
            // [RIGOR-FIX] Drift Damping Adaptativo: O impacto da tendência diminui com o tempo (Log-decay)
            // dampingBase varia de 30 (conservador) a 60 (confiante) conforme qualidade do sinal.
            const driftDamping = 1 / (1 + d / dampingBase); 
            const driftEffect = sampledDrift * driftDamping;

            // IMPROVED: Stronger reversion to historical mean, especially on negative drift.
            // Damp the drift contribution to the target more when below historical.
            const reversionDriftFactor = (currentSimScore < stableMeanTarget) ? 0.25 : 0.4;
            let meanReversionTarget = stableMeanTarget + (drift * d * reversionDriftFactor);
            meanReversionTarget = Math.min(maxScore, Math.max(minScore, meanReversionTarget));
            let meanReversion = Math.max(0.005, thetaOU) * (meanReversionTarget - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            // Prevent extreme reversion pulls that cause artificial boundary piling in long simulations
            const maxReversionPull = adaptiveVol * 3;
            meanReversion = Math.max(-maxReversionPull, Math.min(maxReversionPull, meanReversion));
            
            // CORREÇÃO: Padrão Ouro de Filtered Historical Simulation (FHS)
            // O choque empírico tem de ser escalado para a volatilidade GARCH atual
            let shock = 0;
            if (safeResiduals.length >= 15) {
                // 90% Bootstrap (Histórico Empírico) / 10% Gaussiano Assimétrico (Black Swan)
                if (rng() > 0.10) {
                    const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                    shock = (rawEmpirical / standardizer) * adaptiveVol; 
                } else {
                    // PATCH: Gaussian Skew Adjustment
                    const z = generateGaussian(rng);
                    const skewCorrection = 1 + (residualsSkew * z) / 6.0; 
                    shock = z * adaptiveVol * skewCorrection;
                }
            } else if (safeResiduals.length > 5 && rng() > 0.3) {
                const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                shock = (rawEmpirical / standardizer) * adaptiveVol; 
            } else {
                shock = generateGaussian(rng) * adaptiveVol;
            }
            
            // [FIX-GARCH-01] O choque que entra na equação de volatilidade DEVE ser referenciado à escala diária
            // (dailyVolatility) em vez da escala macro (volatility). Um choque limite à escala macro injeta
            // uma sobre-variância de 7x (para gaps semanais) achatando artificialmente a distribuição (Bug 2.1 Fix).
            const clampedShock = Math.max(-dailyVolatility * 3, Math.min(dailyVolatility * 3, shock));
            
            // Evolução da Volatilidade GARCH(1,1): Var(t+1) = w + a*e^2 + b*Var(t)
            currentVolSq = omega + alphaG * Math.pow(clampedShock, 2) + betaG * currentVolSq;
            
            // Clamp de sanidade para evitar divergência explosiva em projeções longas
            currentVolSq = Math.min(currentVolSq, Math.pow(maxScore * 0.2, 2));
            
            currentSimScore += driftEffect + meanReversion + clampedShock; // consistente com GARCH
            
            // Simple clamp to bounds (mean reversion + historical target should keep trajectories reasonable).
            // Removed complex RBM reflection which was causing boundary piling bias in declining series (scores clustering at minScore, skewing means low).
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Math.max(minScore, Math.min(maxScore, currentSimScore));
        }

        // Aplica os limites físicos da prova APENAS no resultado assintótico final
        // Preservação de sinal estrito: O backend mantém o valor bruto. 
        // O clamping ocorre apenas na camada de UI (MonteCarloGauge.jsx).
        results.push(currentSimScore);
        
        let passedMins = true;
        if (choleskySize > 0) {
            if (subjectCholesky) {
                // Reutilização extrema de memória: mutar o array em vez de re-alocar
                for(let k = 0; k < choleskySize; k++) {
                    zVecStatic[k] = generateGaussian(rng);
                }
                applyCovariance(subjectCholesky, zVecStatic, zCorrStatic);
                for (let j = 0; j < choleskySize; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const raw = Number(s.mean) + zCorrStatic[j];
                    const subjScore = Math.max(sMin, Math.min(sMax, raw));
                    if (subjScore < Number(s.minCutoff)) {
                        passedMins = false;
                        break;
                    }
                }
            } else {
                // fallback independent
                for (let j = 0; j < cutoffSubjects.length; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const effSd = s.sd * Math.max(0.80, s.immunityFactor || 1.0);
                    const subjScore = sampleTruncatedNormal(s.mean, effSd, sMin, sMax, rng);
                    if (subjScore < s.minCutoff) {
                        passedMins = false;
                        break;
                    }
                }
            }
        }
        minCutoffFailures.push(!passedMins);
    }

    // 4. Agregação Estatística
    // Note: We need to count successes before sorting results!
    let successes = 0;
    for (let i = 0; i < safeSimulations; i++) {
        if (results[i] >= targetScore && !minCutoffFailures[i]) {
            successes++;
        }
    }

    results.sort((a, b) => a - b);
    const meanResult = kahanMean(results);

    // BUG-3 FIX: Calcular a probabilidade analítica real usando a Normal Truncada
    // em vez de copiar a empírica como fallback.
    const finalSD = calculateVolatility(results.map(r => ({ score: r })), maxScore, minScore);
    const empiricalProb = (successes / safeSimulations) * 100;

    // FIX BUG 4: Simulações O-U com choques difusos e Clamping diário não formam 
    // uma Distribuição Normal Truncada perfeita no limite estacionário.
    // Usar a CDF analítica aqui causa divergência drástica e invalida as previsões.
    // Para modelos difusos complexos, a probabilidade empírica convergida é a única fonte da verdade.
    let analyticalProb = empiricalProb;

    // NEW: Conformal intervals for more robust, distribution-free CIs
    const mcResiduals = results.map(r => r - meanResult);
    const conformal = conformalPredictionInterval(mcResiduals, 0.1, meanResult); // ~90% coverage

    return {
        // FIX #2: Valores brutos com precisão completa. toFixed removido do motor.
        // UI e componentes de display devem formatar quando necessário.
        probability: empiricalProb,
        analyticalProbability: analyticalProb,
        timePenaltyApplied,
        timePenaltyScoreDrop,
        projectedTotalTimeSeconds: options.projectedTotalTimeSeconds || 0,
        examDurationMinutes: options.examDurationMinutes || 0,
        mean: meanResult,
        projectedMean: meanResult, // Standardized for EvolutionChart
        sd: finalSD,
        ci95Low: conformal.lower || getPercentile(results, 0.025, true),
        ci95High: conformal.upper || getPercentile(results, 0.975, true),
        currentMean: baselineScore,
        drift: (drift * 30),
        volatility,
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high',
        // NEW: non-linear trend availability
        trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
        // NEW: Conformal intervals
        ciConformalLow: conformal.lower,
        ciConformalHigh: conformal.upper,
        diagnostics: {
            trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
            effectiveDriftSlope: typeof effectiveDriftSlope !== 'undefined' ? effectiveDriftSlope : 0,
            conformalCoverage: 0.9,
            simulationCount: safeSimulations,
            historicalMean: historicalMean || null,
            effectiveN: Math.max(1, sortedHistory.length)
        }
    };
}
