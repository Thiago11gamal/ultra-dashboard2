/**
 * Monte Carlo Engine - Variance Module
 * 
 * Implements weighted variance calculation and time uncertainty
 * All formulas are statistically correct and auditable
 */
import { kahanSum } from './math/kahan.js';
import { getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { normalize } from '../utils/normalization.js';

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

function toStrictFiniteNumber(value) {
    if (value === null || value === undefined || typeof value === 'boolean') return NaN;
    if (typeof value === 'string' && value.trim() === '') return NaN;
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

/**
 * Compute weighted variance from category statistics
 * Formula: Var = (1 - ρ) × [Σ wi² × σi²] + ρ × [Σ (wi × σi)]²
 * Calcula a variância ponderada interpolando entre a hipótese de independência 
 * das disciplinas (ρ = 0) e a hipótese de correlação perfeita (ρ = 1).
 * 
 * BUG-M3: This formula is statistically correct under the assumption of
 * independence between subjects. If subjects are strongly correlated
 * (shared test-day effects), the true variance lies between this value
 * and the correlated formula (Σ w_i*σ_i)².
 * 
 * CONTRACT: totalWeight must be the sum of all raw weights. If stats weights are 
 * already normalized (0-1), totalWeight MUST be passed as 1 for correct computations.
 * 
 * @param {Object[]} stats - Array of { sd, weight } objects
 * @param {number} totalWeight - Sum of all weights (use 1 if stats weights are normalized)
 * @returns {number} Weighted variance
 */
// CORREÇÃO: Alinhamento com Modelos TRI (Teoria de Resposta ao Item).
// 0.25 capta melhor a covariância psicológica (stress do dia) 
// sem esmagar o Desvio Padrão Agregado (Pooled SD) do candidato.
export const INTER_SUBJECT_CORRELATION = 0.25; // Prior / fallback correlation between subjects (stress day effect)

/**
 * Adaptive version of INTER_SUBJECT_CORRELATION.
 * Tries to estimate from real user performance history (simulado rows) when sufficient data exists.
 * Falls back gracefully to the conservative prior.
 */
export function getAdaptiveInterSubjectCorrelation(_stats = [], simuladoRows = [], categoryNames = [], fallback = INTER_SUBJECT_CORRELATION, maxScore = 100) {
  try {
    const safeSimuladoRows = (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})).filter(Boolean);
    if (!Array.isArray(safeSimuladoRows) || safeSimuladoRows.length < 5 || !Array.isArray(categoryNames) || categoryNames.length < 2) {
      return fallback;
    }

    const safeGlobalMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const bucketsByDate = {};

    safeSimuladoRows.forEach(row => {
      const dateKey = getDateKey(row.date || row.createdAt);
      if (!dateKey) return;
      const subj = normalize(row.subject || row.categoryName || row.name);
      if (!subj) return;

      const rawRowMax = toStrictFiniteNumber(row.maxScore);
      const rowMax = Number.isFinite(rawRowMax) && rawRowMax > 0 ? rawRowMax : safeGlobalMax;
      const rawRowMin = toStrictFiniteNumber(row.minScore);
      const rowMin = Number.isFinite(rawRowMin) && rawRowMin < rowMax ? rawRowMin : 0;
      const score = getSafeScore(row, rowMax, rowMin);
      if (!Number.isFinite(score)) return;

      const normalizedScore = ((score - rowMin) / Math.max(1e-9, rowMax - rowMin)) * safeGlobalMax;
      const rawWeight = toStrictFiniteNumber(row.total ?? row.questions);
      const weight = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 1;

      if (!bucketsByDate[dateKey]) bucketsByDate[dateKey] = {};
      if (!bucketsByDate[dateKey][subj]) bucketsByDate[dateKey][subj] = { weightedSum: 0, totalWeight: 0 };
      bucketsByDate[dateKey][subj].weightedSum += normalizedScore * weight;
      bucketsByDate[dateKey][subj].totalWeight += weight;
    });

    const byDate = {};
    Object.entries(bucketsByDate).forEach(([dateKey, subjMap]) => {
      byDate[dateKey] = {};
      Object.entries(subjMap).forEach(([subj, agg]) => {
        if (agg.totalWeight > 0) {
          byDate[dateKey][subj] = agg.weightedSum / agg.totalWeight;
        }
      });
    });

    const alignedRows = Object.values(byDate);
    if (alignedRows.length < 4) return fallback;

    // estimateInterSubjectCorrelation já aplica shrinkage Empírico-Bayesiano em espaço Fisher-Z
    return estimateInterSubjectCorrelation(alignedRows, categoryNames, fallback);
  } catch {
    /* ignore */
    return fallback;
  }
}

export function computeEffectiveSampleSizeFromWeights(weights = []) {
    const clean = Array.isArray(weights) ? weights.map(w => Number(w)).filter(w => Number.isFinite(w) && w > 0) : [];
    if (clean.length === 0) return 0;
    
    // Normalizar pesos localmente ANTES de calcular o Kish
    const rawSumW = clean.reduce((sum, w) => sum + w, 0);
    if (rawSumW <= 0) return 0;
    const normalized = clean.map(w => w / rawSumW);
    
    const sumW = normalized.reduce((sum, w) => sum + w, 0); // ~1.0
    const sumW2 = normalized.reduce((sum, w) => sum + w * w, 0);
    
    return sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
}

// MELHORIA: Permite a injeção de parâmetros dinâmicos ou cálculo on-the-fly do rho
export function computeWeightedVariance(statsRaw, totalWeight, optionsOrRho = INTER_SUBJECT_CORRELATION) {
    const stats = Array.isArray(statsRaw) ? statsRaw : Object.values(statsRaw || {});
    if (stats.length === 0) return 0;

    let rho = INTER_SUBJECT_CORRELATION;
    let preserveScale = false;

    // Extrai rho dinâmico se um objeto de opções for passado
    if (typeof optionsOrRho === 'object' && optionsOrRho !== null) {
        preserveScale = optionsOrRho.preserveScale || false;
        if (typeof optionsOrRho.rho === 'number') {
            rho = optionsOrRho.rho;
        } else if (optionsOrRho.scoreRows && optionsOrRho.subjectNames) {
            rho = estimateInterSubjectCorrelation(optionsOrRho.scoreRows, optionsOrRho.subjectNames, INTER_SUBJECT_CORRELATION);
        } else if (optionsOrRho.simuladoRows && optionsOrRho.categoryNames) {
            rho = getAdaptiveInterSubjectCorrelation(
                stats,
                optionsOrRho.simuladoRows,
                optionsOrRho.categoryNames,
                INTER_SUBJECT_CORRELATION,
                optionsOrRho.maxScore ?? 100
            );
        }
    } else {
        // Fallback de compatibilidade
        rho = Number.isFinite(optionsOrRho) ? optionsOrRho : INTER_SUBJECT_CORRELATION;
    }

    const toFiniteNonNegative = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : 0;
    };

    const toFiniteSd = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    const calculatedTotalWeight = kahanSum(stats.map(cat => toFiniteNonNegative(cat?.weight)));
    const effectiveTotalWeight = (Number.isFinite(totalWeight) && totalWeight > 0) ? totalWeight : calculatedTotalWeight;

    if (effectiveTotalWeight === 0) return 0;

    // ✅ LOTE-03 FIX (M2): piso de ρ unificado em 0.0 conforme a intenção documentada.
    // ρ negativo podia gerar variância/covariância não-PSD e falhas de Cholesky;
    // o clamp final Math.max(0, ...) apenas mascarava o problema na saída.
    const validRho = Math.max(0, Math.min(0.85, rho));
    const rawWeights = stats.map(cat => toFiniteNonNegative(cat?.weight));
    const adjustedSDs = stats.map(cat => toFiniteSd(cat?.sd));

    const sumRawWeights = kahanSum(rawWeights);
    if (!Number.isFinite(sumRawWeights) || sumRawWeights <= 0) return 0;
    
    // Bug 3.2 Fix: Explosão Dimensional na Variância Ponderada
    // Se preserveScale estivesse ativo, os pesos em bruto (e.g. 100) seriam elevados ao quadrado,
    // explodindo a variância (10,000 * SD^2). Normalizamos sempre internamente para manter 
    // estabilidade nas combinações de SDs independentes e coerentes.
    const normalizedWeights = rawWeights.map(w => w / sumRawWeights);

    const independentVar = kahanSum(normalizedWeights.map((w, i) => Math.pow(w, 2) * Math.pow(adjustedSDs[i], 2)));
    const weightedSumSD = kahanSum(normalizedWeights.map((w, i) => w * adjustedSDs[i]));
    const coherentVar = Math.pow(weightedSumSD, 2);

    let finalVar = (1 - validRho) * independentVar + (validRho * coherentVar);

    // Se preserveScale for pedido, escalonamos a variância final linearmente pelo 
    // peso efetivo, prevenindo o colapso quadrático anterior que quebrava o motor.
    if (preserveScale) {
        finalVar *= Math.pow(effectiveTotalWeight, 2);
    }

    return Math.max(0, Number.isFinite(finalVar) ? finalVar : 0);
}

/**
 * Computes the pooled standard deviation across subjects.
 * 
 * NOTA CONCEITUAL: Cuidado com a mistura de unidades aqui!
 * Este Pooled SD reflete a variabilidade estática "entre provas" (disciplinas).
 * Ele NÃO representa a incerteza dinâmica da trajetória temporal (Random Walk/Drift).
 * Usar isto isoladamente para calcular o Margin of Error da Projeção subestima
 * drasticamente o cone de incerteza no longo prazo.
 */
export function computePooledSD(stats, totalWeight, rho = INTER_SUBJECT_CORRELATION) {
    // ✅ LOTE-03 FIX (M2): clamp alinhado com computeWeightedVariance [0.0, 0.85]
    const validRho = Number.isFinite(rho) ? Math.max(0, Math.min(0.85, rho)) : INTER_SUBJECT_CORRELATION;
    const weightedVariance = computeWeightedVariance(stats, totalWeight, validRho);
    return Math.sqrt(weightedVariance);
}

/**
 * Estimate inter-subject correlation from historical aligned score rows.
 * Uses pairwise Pearson correlations with overlap checks and shrinkage toward fallback.
 *
 * @param {Object[]} scoreRows - Array of date-aligned rows: { [subjectName]: score }
 * @param {string[]} subjectNames - Subject names to include
 * @param {number} fallback - Fallback correlation when data is insufficient
 * @returns {number} Estimated rho in [0,1]
 */
export function estimateInterSubjectCorrelation(
    scoreRows = [],
    subjectNames = [],
    fallback = INTER_SUBJECT_CORRELATION
) {
    const safeScoreRows = Array.isArray(scoreRows) ? scoreRows : Object.values(scoreRows || {});
    if (safeScoreRows.length < 4 || !Array.isArray(subjectNames) || subjectNames.length < 2) {
        return fallback;
    }

    const pairwise = [];
    const getRowValue = (row, normName, origName) => {
        if (!row || typeof row !== 'object') return undefined;
        if (row[normName] !== undefined) return row[normName];
        if (origName && row[origName] !== undefined) return row[origName];
        for (const key of Object.keys(row)) {
            if (normalize(key) === normName) {
                return row[key];
            }
        }
        return undefined;
    };

    for (let i = 0; i < subjectNames.length; i++) {
        for (let j = i + 1; j < subjectNames.length; j++) {
            const aName = normalize(subjectNames[i]);
            const bName = normalize(subjectNames[j]);
            const origAName = subjectNames[i];
            const origBName = subjectNames[j];

            const xs = [];
            const ys = [];
            safeScoreRows.forEach(row => {
                const rawX = getRowValue(row, aName, origAName);
                const valX = typeof rawX === 'object' && rawX !== null ? rawX?.score : rawX;
                const x = toStrictFiniteNumber(valX);
                const rawY = getRowValue(row, bName, origBName);
                const valY = typeof rawY === 'object' && rawY !== null ? rawY?.score : rawY;
                const y = toStrictFiniteNumber(valY);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    xs.push(x);
                    ys.push(y);
                }
            });

            const n = xs.length;
            if (n < 4) continue;

            // Para séries com n >= 6, remover tendência linear secular para isolar correlação de choques de prova
            let seriesX = xs;
            let seriesY = ys;
            if (n >= 6) {
                const tMean = (n - 1) / 2;
                let sTT = 0, sTX = 0, sTY = 0;
                const rawMeanX = kahanSum(xs) / n;
                const rawMeanY = kahanSum(ys) / n;
                for (let k = 0; k < n; k++) {
                    const dt = k - tMean;
                    sTT += dt * dt;
                    sTX += dt * (xs[k] - rawMeanX);
                    sTY += dt * (ys[k] - rawMeanY);
                }
                if (sTT > 1e-12) {
                    const betaX = sTX / sTT;
                    const betaY = sTY / sTT;
                    const detX = xs.map((v, k) => v - (rawMeanX + betaX * (k - tMean)));
                    const detY = ys.map((v, k) => v - (rawMeanY + betaY * (k - tMean)));
                    const detVarX = kahanSum(detX.map(v => v * v));
                    const detVarY = kahanSum(detY.map(v => v * v));
                    if (detVarX > 1e-9 && detVarY > 1e-9) {
                        seriesX = detX;
                        seriesY = detY;
                    }
                }
            }

            const meanX = kahanSum(seriesX) / n;
            const meanY = kahanSum(seriesY) / n;

            let cov = 0.0, c_cov = 0.0;
            let varX = 0.0, c_x = 0.0;
            let varY = 0.0, c_y = 0.0;

            for (let k = 0; k < n; k++) {
                const dx = seriesX[k] - meanX;
                const dy = seriesY[k] - meanY;
                
                const y_cov = (dx * dy) - c_cov;
                const t_cov = cov + y_cov;
                c_cov = (t_cov - cov) - y_cov;
                cov = t_cov;

                const y_x = (dx * dx) - c_x;
                const t_x = varX + y_x;
                c_x = (t_x - varX) - y_x;
                varX = t_x;

                const y_y = (dy * dy) - c_y;
                const t_y = varY + y_y;
                c_y = (t_y - varY) - y_y;
                varY = t_y;
            }

            const safeVarX = Math.max(0, varX);
            const safeVarY = Math.max(0, varY);
            if (safeVarX <= 1e-12 || safeVarY <= 1e-12) continue;

            const epsilon = 1e-15;
            const denom = Math.sqrt((safeVarX + epsilon) * (safeVarY + epsilon));
            const corr = cov / denom;

            // Preservar r bruto para ponderação ótima (n - 3) em espaço Fisher-Z + shrinkage Empírico-Bayesiano único
            pairwise.push({ corr, n });
        }
    }

    if (pairwise.length === 0) return fallback;

    // Weight by information size (overlap) and use Fisher Z transformation for averaging
    // Pearson correlations (r) are not additive; averaging them directly biases toward zero.
    let sumZ = 0;
    let sumW = 0;
    pairwise.forEach(p => {
        // Peso informacional assintoticamente ótimo para Fisher Z ~ N(0, 1/(n-3))
        const w = Math.max(1, p.n - 3);
        // Fisher Z transform: Z = 0.5 * ln((1+r)/(1-r))
        // BUGFIX GEMINI: Permitir correlações negativas no cálculo para não inflar a média
        const r = Math.max(-0.999, Math.min(0.999, p.corr));
        const z = 0.5 * Math.log((1 + r) / (1 - r));
        sumZ += z * w;
        sumW += w;
    });

    const avgZ = sumW > 0 ? sumZ / sumW : 0;
    // Inverse Fisher Z: r = (exp(2z) - 1) / (exp(2z) + 1)
    const empirical = (Math.exp(2 * avgZ) - 1) / (Math.exp(2 * avgZ) + 1);

    const overlaps = pairwise.map(p => p.n);
    const avgOverlap = kahanSum(overlaps) / overlaps.length;
    const essPairs = computeEffectiveSampleSizeFromWeights(pairwise.map(p => Math.max(1, p.n - 3)));
    const maxPossiblePairs = Math.max(1, (subjectNames.length * (subjectNames.length - 1)) / 2);
    const pairCoverage = Math.min(1, essPairs / Math.min(6, maxPossiblePairs));
    
    // Shrinkage empírico-bayesiano
    const shrink = Math.max(0, Math.min(1, (avgOverlap / (avgOverlap + 10)) * (0.5 + 0.5 * pairCoverage)));
    const blended = (shrink * empirical) + ((1 - shrink) * fallback);

    // ✅ LOTE-03 FIX (M2): limite inferior 0.0 (PSD-safe), como o comentário já
    // determinava. Correlações negativas continuam sendo calculadas INTERNAMENTE
    // no Fisher Z (para não inflar a média), mas o ρ entregue ao motor nunca é negativo.
    return Math.max(0, Math.min(0.85, blended));
}

/**
 * Get variance breakdown for debugging/auditing
 * 
 * @param {Object[]} stats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @returns {Object} Detailed variance breakdown
 */
export function getVarianceBreakdown(stats, totalWeight) {
    const weightedVariance = computeWeightedVariance(stats, totalWeight);
    const pooledVariance = weightedVariance;
    // SAFETY: computeWeightedVariance may return negative due to floating-point rounding
    // in the cross-term subtraction. Clamp to 0 before sqrt to prevent NaN propagation.
    const pooledSD = Math.sqrt(Math.max(0, pooledVariance));

    return {
        weightedVariance: Number(Number.isFinite(weightedVariance) ? weightedVariance.toFixed(4) : 0),
        timeUncertainty: 0,
        timeVariance: 0,
        pooledVariance: Number(Number.isFinite(pooledVariance) ? pooledVariance.toFixed(4) : 0),
        pooledSD: Number(Number.isFinite(pooledSD) ? pooledSD.toFixed(4) : 0)
    };
}

/**
 * PATCH: Calcula a correlação de Pearson empírica entre duas séries de notas.
 * Emparelha os dados apenas onde o usuário estudou ambas as matérias num intervalo <= 24h.
 */
function calculateDynamicCorrelation(historyA, historyB, fallback = 0.15, maxScoreA = 100, minScoreA = 0, maxScoreB = maxScoreA, minScoreB = minScoreA) {
    const safeHistoryA = toHistoryArray(historyA);
    const safeHistoryB = toHistoryArray(historyB);

    if (!safeHistoryA.length || !safeHistoryB.length) return fallback;

    let pairedCount = 0;

    const getDateStr = (h) => {
        return getDateKey(h?.date || h?.createdAt);
    };

    const aggMapA = new Map();
    safeHistoryA.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        const s = getSafeScore(h, maxScoreA, minScoreA);
        if (d && Number.isFinite(s)) {
            const prev = aggMapA.get(d) || { sum: 0, count: 0 };
            prev.sum += s;
            prev.count += 1;
            aggMapA.set(d, prev);
        }
    });

    const aggMapB = new Map();
    safeHistoryB.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        const s = getSafeScore(h, maxScoreB, minScoreB);
        if (d && Number.isFinite(s)) {
            const prev = aggMapB.get(d) || { sum: 0, count: 0 };
            prev.sum += s;
            prev.count += 1;
            aggMapB.set(d, prev);
        }
    });

    const xs = [];
    const ys = [];

    aggMapB.forEach((valB, d) => {
        if (aggMapA.has(d)) {
            const valA = aggMapA.get(d);
            xs.push(valA.sum / valA.count);
            ys.push(valB.sum / valB.count);
            pairedCount++;
        }
    });

    if (pairedCount < 5) return fallback;

    const n = pairedCount;
    let meanX = 0;
    let meanY = 0;

    for (let i = 0; i < n; i++) {
        meanX += xs[i];
        meanY += ys[i];
    }

    meanX /= n;
    meanY /= n;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        cov += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
    }

    const safeVarX = Math.max(0, varX);
    const safeVarY = Math.max(0, varY);
    if (safeVarX <= 1e-12 || safeVarY <= 1e-12) return fallback;

    const denominator = Math.sqrt(safeVarX * safeVarY);

    if (!Number.isFinite(denominator) || denominator === 0) return fallback;

    const pearsonR = cov / denominator;

    if (!Number.isFinite(pearsonR)) return fallback;

    const shrink = n / (n + 8);
    const blendedR = (pearsonR * shrink) + (fallback * (1 - shrink));
    return Math.max(0, Math.min(0.85, blendedR));
}

/**
 * Constrói a Matriz de Covariância completa NxN a partir dos desvios padrão
 * individuais e do fator de correlação (Rho). Necessária para alimentar
 * o Cholesky Decomposition para Monte Carlo multidimensional.
 */
export function buildCovarianceMatrix(stats, rhoMatrix = null, defaultRho = INTER_SUBJECT_CORRELATION, adaptiveContext = null) {
    const n = stats.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    // NEW: Support full adaptive rho from context
    let effectiveDefaultRho = Number.isFinite(defaultRho) ? defaultRho : INTER_SUBJECT_CORRELATION;
    if (adaptiveContext && adaptiveContext.simuladoRows && adaptiveContext.categoryNames) {
      effectiveDefaultRho = getAdaptiveInterSubjectCorrelation(
        stats,
        adaptiveContext.simuladoRows,
        adaptiveContext.categoryNames,
        defaultRho,
        adaptiveContext.maxScore ?? 100
      );
    }
    
    // FIX 5: Estrutura O(N^2) reduzida via simetria de matriz
    for (let i = 0; i < n; i++) {
        const sdI = Math.max(0, Number.isFinite(stats[i]?.sd) ? Number(stats[i].sd) : 0);
        matrix[i][i] = sdI * sdI; // A variância pura ocupa apenas a diagonal principal

        for (let j = i + 1; j < n; j++) {
            const sdJ = Math.max(0, Number.isFinite(stats[j]?.sd) ? Number(stats[j].sd) : 0);
            
            const rawRhoIJ = (rhoMatrix && rhoMatrix[i] && rhoMatrix[i][j] != null) ? rhoMatrix[i][j] : effectiveDefaultRho;
            const rhoIJ = Math.max(-0.999, Math.min(0.999, Number.isFinite(Number(rawRhoIJ)) ? Number(rawRhoIJ) : effectiveDefaultRho));
            const rawRhoJI = (rhoMatrix && rhoMatrix[j] && rhoMatrix[j][i] != null) ? rhoMatrix[j][i] : effectiveDefaultRho;
            const rhoJI = Math.max(-0.999, Math.min(0.999, Number.isFinite(Number(rawRhoJI)) ? Number(rawRhoJI) : effectiveDefaultRho));
            
            let currentRho = (Number(rhoIJ) + Number(rhoJI)) / 2;
            if (!Number.isFinite(currentRho)) currentRho = effectiveDefaultRho;
            currentRho = Math.max(-0.999, Math.min(0.999, currentRho));

            if (stats[i]?.simuladoStats?.history && stats[j]?.simuladoStats?.history) {
                const maxA = stats[i]?.maxScore ?? adaptiveContext?.maxScore ?? 100;
                const minA = stats[i]?.minScore ?? adaptiveContext?.minScore ?? 0;
                const maxB = stats[j]?.maxScore ?? adaptiveContext?.maxScore ?? 100;
                const minB = stats[j]?.minScore ?? adaptiveContext?.minScore ?? 0;
                currentRho = calculateDynamicCorrelation(
                    stats[i].simuladoStats.history,
                    stats[j].simuladoStats.history,
                    currentRho,
                    maxA,
                    minA,
                    maxB,
                    minB
                );
            }

            const covariance = currentRho * sdI * sdJ;
            matrix[i][j] = covariance; 
            matrix[j][i] = covariance; // Espelho simétrico, poupa dupla iteração.
        }
    }
    return matrix;
}

export function calcularVariancia(arr) {
    if (!Array.isArray(arr) || arr.length <= 1) return 0;

    // Welford online: estável para magnitudes extremas (evita overflow em v²)
    let count = 0;
    let mean = 0;
    let m2 = 0;
    
    for (let i = 0; i < arr.length; i++) {
        const raw = Number(arr[i]);
        if (!Number.isFinite(raw)) continue;
        
        count += 1;
        const delta = raw - mean;
        mean += delta / count;
        const delta2 = raw - mean;
        m2 += delta * delta2;
    }
    
    const variance = count > 1 ? m2 / (count - 1) : 0;
    return Number.isFinite(variance) ? Math.max(0, variance) : 0;
}

export default {
    computeWeightedVariance,
    computePooledSD,
    getVarianceBreakdown,
    estimateInterSubjectCorrelation,
    computeEffectiveSampleSizeFromWeights,
    calcularVariancia,
    buildCovarianceMatrix
};

