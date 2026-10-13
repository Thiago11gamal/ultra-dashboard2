# Motor Matemático, Estatístico e Probabilístico (src/engine)

> Arquivos neste módulo: **35** | Linhas: **14.127** | Tamanho: **475.5 KB**

## Arquivos:
1. `src/engine/analyticsStats.js` (525 linhas)
2. `src/engine/causal/policyEngine.js` (353 linhas)
3. `src/engine/causal/upliftModel.js` (908 linhas)
4. `src/engine/diagnostics.js` (742 linhas)
5. `src/engine/evaluation/coachEvaluator.js` (665 linhas)
6. `src/engine/evaluation/strategyBacktester.js` (437 linhas)
7. `src/engine/heatmap.worker.js` (16 linhas)
8. `src/engine/index.js` (18 linhas)
9. `src/engine/insightGenerator.js` (347 linhas)
10. `src/engine/math/bootstrap.js` (117 linhas)
11. `src/engine/math/constants.js` (14 linhas)
12. `src/engine/math/date.js` (90 linhas)
13. `src/engine/math/gaussian.js` (505 linhas)
14. `src/engine/math/kahan.js` (66 linhas)
15. `src/engine/math/percentile.js` (176 linhas)
16. `src/engine/math/safe.js` (139 linhas)
17. `src/engine/mc.worker.js` (300 linhas)
18. `src/engine/monteCarlo.js` (822 linhas)
19. `src/engine/observability/driftMonitor.js` (502 linhas)
20. `src/engine/observability/modelHealth.js` (566 linhas)
21. `src/engine/optimization/autoTuner.js` (379 linhas)
22. `src/engine/optimization/flagOptimizer.js` (685 linhas)
23. `src/engine/orchestrator/coachOrchestrator.js` (628 linhas)
24. `src/engine/probabilistic/bayesianTopics.js` (347 linhas)
25. `src/engine/probabilistic/decisionEngine.js` (361 linhas)
26. `src/engine/probabilistic/fsrs.js` (237 linhas)
27. `src/engine/probabilistic/knowledgeGraph.js` (294 linhas)
28. `src/engine/probabilistic/posteriorPredictive.js` (353 linhas)
29. `src/engine/probabilistic/stateSpace.js` (352 linhas)
30. `src/engine/probabilistic/volatility.js` (331 linhas)
31. `src/engine/projection.js` (1017 linhas)
32. `src/engine/random.js` (58 linhas)
33. `src/engine/simulationCache.js` (33 linhas)
34. `src/engine/stats.js` (1229 linhas)
35. `src/engine/variance.js` (515 linhas)

---

### Arquivo: `src/engine/analyticsStats.js`
*Linhas: 525 | Tamanho: 21.6 KB*

```javascript
import {
    computeCategoryStats,
    computeBayesianLevel,
    computeWeightedVariance,
    calculateVolatility,
    getAdaptiveInterSubjectCorrelation,
    computeHierarchicalAdjustment
} from './index.js';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { getDateKey, normalizeDate } from '../utils/dateHelper.js';
import {
    getConfidenceMultiplier,
    winsorizeSeries,
    computeAdaptiveSignal
} from '../utils/adaptiveMath.js';

export const VOLATILITY_REGULARIZATION_FACTOR = 0.035;
export const INFORMATIVE_PRIOR_MAX_STRENGTH = 5.0;
export const MAX_CALIBRATION_PENALTY = 0.15;
export const CALIBRATION_LAMBDA_DAYS = 30; // Meia-vida de decaimento (30 dias)

// FIX: piso mínimo de incerteza — nunca afirmar volatilidade próxima de zero
export const VOLATILITY_FLOOR_PCT = 0.03;

// FIX: amostra efetiva mínima (soma dos pesos de decaimento) antes de
// aplicar penalidade de calibração. Evita punir o modelo com 1-2 eventos ruidosos.
export const CALIBRATION_MIN_EFFECTIVE_SAMPLES = 5.0;

const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

// T-011 FIX: clamp defensivo de acertos.
// Impede que correct > total gere accuracy/projeção acima de 100%.
const clampCorrectToTotal = (correct, total) => {
    const t = Number(total);
    if (!Number.isFinite(t) || t <= 0) return 0;

    const c = Number(correct);
    if (!Number.isFinite(c)) return 0;

    return Math.max(0, Math.min(t, c));
};

// FIX: parseInt truncava pesos decimais ("2.5" -> 2).
// Agora aceita decimais e arredonda de forma previsível.
export const sanitizeWeightUnit = (value) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return 0;
    }
    let numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        numeric = parseInt(String(value), 10);
    }

    if (Number.isNaN(numeric)) return 0;

    return Math.max(0, Math.min(999, Math.round(numeric)));
};

export const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

export function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const safeSD = Number.isFinite(dailySD) ? Math.max(0, dailySD) : 0;
    const safeDomain = Number.isFinite(domain) && domain > 1e-9 ? domain : 100;

    const informativeSD = VOLATILITY_REGULARIZATION_FACTOR * safeDomain;

    // FIX: horizontes de projeção mais longos exigem mais incerteza epistêmica.
    // O prior informativo cresce suavemente com os dias projetados (fator máx. 2x).
    const horizonFactor = Math.min(2, 1 + (Math.max(0, projectionDays) / 180));

    const priorStrength = Math.max(
        1.0,
        (INFORMATIVE_PRIOR_MAX_STRENGTH - Math.log2(historyLength + 1)) * horizonFactor
    );

    const n = Math.max(1, historyLength);

    const regularizedVariance =
        (safeSD * safeSD * n + informativeSD * informativeSD * priorStrength) /
        (n + priorStrength);

    const regularizedSD = Math.sqrt(Math.max(0, regularizedVariance));

    // FIX: piso de 3% do domínio. Sem isso, histórico muito estável + N alto
    // produzia SD quase zero e probabilidades degeneradas (0% ou 100%).
    const floorSD = VOLATILITY_FLOOR_PCT * safeDomain;

    return Math.max(floorSD, regularizedSD);
}

export function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null, minScore = 0) {
    if (!Array.isArray(mcHistory) || mcHistory.length === 0 || !Array.isArray(globalHistory) || globalHistory.length === 0) {
        return 0;
    }

    // T-017 FIX: maxScore seguro para evitar divisão por zero
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0
        ? maxScore
        : 100;
    const safeMinScore = Number.isFinite(minScore) ? Math.min(minScore, safeMaxScore) : 0;
    const globalDomain = Math.max(1, safeMaxScore - safeMinScore);

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const LAMBDA = Math.log(2) / (CALIBRATION_LAMBDA_DAYS * MS_PER_DAY);
    const now = Date.now();

    let brierWeightSum = 0;
    let brierSum = 0;
    let residualWeightSum = 0;
    let residualSum = 0;

    const todayKey = getDateKey(new Date());

    mcHistory.forEach(snapshot => {
        if (!snapshot) return;

        const snapshotKey = getDateKey(snapshot.date || snapshot.timestamp);
        if (snapshotKey === todayKey) return;

        const snapTime = normalizeDate(snapshot.date || snapshot.timestamp)?.getTime() || NaN;
        if (isNaN(snapTime)) return;

        const targetTime = snapshot.targetDate ? normalizeDate(snapshot.targetDate)?.getTime() : null;

        let actual = null;

        if (targetTime && !isNaN(targetTime)) {
            let minDiff = Infinity;

            globalHistory.forEach(h => {
                const hTime = normalizeDate(h.date)?.getTime() || NaN;

                if (hTime > snapTime) {
                    const diff = Math.abs(hTime - targetTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        actual = h;
                    }
                }
            });
        } else {
            actual = [...globalHistory].reverse().find(h => (normalizeDate(h.date)?.getTime() || NaN) > snapTime);
        }

        if (!actual) return;

        // FIX: blindagem contra resultado real inválido
        const actualScore = Number(actual.score);
        if (!Number.isFinite(actualScore)) return;

        const age = Math.max(0, now - snapTime);
        const weight = Math.exp(-LAMBDA * age);

        // FIX: calibrar contra a PREVISÃO REALMENTE FEITA (projectedMean),
        // não contra a média corrente do dia do snapshot.
        // O campo mean era "onde estou", projectedMean era "onde projetei chegar".
        const meanPrediction = Number(snapshot.projectedMean ?? snapshot.mean) || 0;

        const targetVal = Number(snapshot.target);
        if (meanPrediction > 0 && safeMaxScore > 0 && Number.isFinite(targetVal) && targetVal > 0) {
            const err = Math.abs(meanPrediction - actualScore) / globalDomain;
            residualSum += err * weight;
            residualWeightSum += weight;
        }

        const rawProb = Number(snapshot.probability);
        const p = Number.isFinite(rawProb) ? Math.max(0, Math.min(1, rawProb / 100)) : 0;
        const target = Number(snapshot.target) || 0;

        if (target > 0) {
            const observed = actualScore >= target ? 1 : 0;
            const brierScore = (p - observed) ** 2;
            brierSum += brierScore * weight;
            brierWeightSum += weight;
        }
    });

    let calibrationPenalty = 0;

    // ✅ PATCH-05: Penalidade com amostra insuficiente
    // Conta eventos REAIS (não apenas peso de decaimento)
    const actualEventCount = mcHistory.filter(snapshot => {
        if (!snapshot) return false;
        const snapTime = normalizeDate(snapshot.date || snapshot.timestamp)?.getTime();
        return Number.isFinite(snapTime);
    }).length;
    
    const hasEffectiveSample =
        actualEventCount >= 3 && // Mínimo de eventos reais
        (brierWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES ||
         residualWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES);

    if (hasEffectiveSample && (brierWeightSum > 0 || residualWeightSum > 0)) {
        const avgBrier = brierWeightSum > 0 ? brierSum / brierWeightSum : 0;
        const avgResidual = residualWeightSum > 0 ? residualSum / residualWeightSum : 0;

        const rawBrierPenalty = Math.max(0, avgBrier - 0.18);
        const combinedPenalty = (rawBrierPenalty * 0.7) + (avgResidual * 0.3);

        calibrationPenalty = Math.min(MAX_CALIBRATION_PENALTY, combinedPenalty);
    }

    if (summary && summary.avgBrier > 0) {
        const summaryPenalty = Math.max(0, (summary.avgBrier - 0.18) * 0.8);
        calibrationPenalty = Math.max(calibrationPenalty, Math.min(MAX_CALIBRATION_PENALTY * 0.9, summaryPenalty));
    }

    return calibrationPenalty;
}

export function generateAnalyticsStats({
    categories,
    debouncedWeights,
    timeIndex,
    timelineDates,
    minScore,
    maxScore,
    simuladoRows = [],
    targetScore = null
}) {
    // FIX: domínios globais seguros
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
    const safeMinScore = Number.isFinite(minScore) ? Math.min(minScore, safeMaxScore) : 0;
    const globalDomain = Math.max(1e-6, safeMaxScore - safeMinScore);

    let categoryStats = [];
    let totalWeight = 0;

    // FIX: pooling bayesiano agora é feito em PROPORÇÃO padronizada (0-1),
    // não em alpha/beta absolutos misturados entre domínios diferentes.
    let weightedPropAlpha = 0;
    let weightedPropBeta = 0;

    const scoresByDate = {};
    const weightsByKey = new Map();
    const maxScoreByKey = new Map();
    const bayesianStats = [];

    const cutoffDate = (timeIndex >= 0 && timeIndex < timelineDates.length)
        ? timelineDates[timeIndex]
        : null;

    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});

    safeCategories.forEach(cat => {
        const historyRaw = cat.simuladoStats?.history || [];
        const historyArray = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});

        if (historyArray.length > 0) {
            const catMaxScore = Number(cat.maxScore) || safeMaxScore;
            const catMinScore = Number.isFinite(Number(cat.minScore))
              ? Number(cat.minScore)
              : safeMinScore;
            const catMinCutoff = Number.isFinite(Number(cat.minCutoff))
              ? Number(cat.minCutoff)
              : 0;
            const catDomain = Math.max(1e-6, catMaxScore - catMinScore);

            const history = [...historyArray]
                .filter(h => {
                    if (!cutoffDate) return true;
                    const dateString = getDateKey(getHistoryDate(h));
                    if (!dateString) return false;
                    return dateString <= cutoffDate;
                })
                .map(h => ({ h, t: normalizeDate(getHistoryDate(h))?.getTime() ?? 0 }))
                .sort((a, b) => a.t - b.t)
                .map(item => item.h);

            if (history.length === 0) return;

            const weightKey = cat.id || cat.name;
            const weight = sanitizeWeightUnit(debouncedWeights[weightKey] ?? 1);

            // ✅ LOTE-01 FIX (C3): propagar o piso da disciplina para o nível bayesiano
            const baye = computeBayesianLevel(history, 1, 1, catMaxScore, { minScore: catMinScore });
            const stats = computeCategoryStats(history, weight, 60, catMaxScore, catMinScore);
            const vol = calculateVolatility(history, catMaxScore, catMinScore);

            if (stats && weight > 0) {
                totalWeight += weight;

                // FIX: padronizar a média bayesiana da disciplina em proporção
                // do seu próprio domínio ANTES do pooling global.
                //
                // Antes: alpha/(alpha+beta) * maxScore global.
                // Problema 1: disciplinas com maxScore diferente contaminavam a média.
                // Problema 2: minScore != 0 era ignorado.
                const rawBayeMean = Number(baye.mean);
                const safeBayeMean = Number.isFinite(rawBayeMean)
                    ? rawBayeMean
                    : (catMinScore + catDomain * 0.5);

                const catProp = clamp((safeBayeMean - catMinScore) / catDomain, 0, 1);

                // Força da evidência (pseudo-contagens), limitada para nenhuma
                // disciplina dominar o pooling global sozinha.
                const strength = (Number(baye.alpha) || 0) + (Number(baye.beta) || 0);
                const CONFIDENCE_CAP = 50;
                const cappedStrength = Math.min(Math.max(strength, 1e-9), CONFIDENCE_CAP);

                weightedPropAlpha += catProp * cappedStrength * weight;
                weightedPropBeta += (1 - catProp) * cappedStrength * weight;

                weightsByKey.set(weightKey, weight);
                maxScoreByKey.set(weightKey, catMaxScore);

                history.forEach(h => {
                    const currentScore = getSafeScore(h, catMaxScore, catMinScore);

                    // RIGOR FIX: Proteção contra Corrupção de Dados e o "0s Bug".
                    // 1. Evita que um NaN vicie a média do dia e destrua o dia inteiro.
                    if (!Number.isFinite(currentScore)) return;

                    // 2. Filtramos o infame "0s bug" originário do simulado timer
                    // para não desabar artificialmente a projeção do Monte Carlo.
                    const tTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                    if (tTs !== null && tTs <= 0 && currentScore === 0) return;

                    const dk = getDateKey(getHistoryDate(h));

                    if (dk) {
                        if (!scoresByDate[dk]) scoresByDate[dk] = {};

                        const existing = scoresByDate[dk][weightKey];

                        const currentTotal = Number(h.total) || 0;

                        // T-011 FIX: clamp de correct por total antes de agregar
                        const currentCorrect = currentTotal > 0
                            ? clampCorrectToTotal(h.correct, currentTotal)
                            : 0;

                        if (existing) {
                            const newTotal = existing.total + currentTotal;
                            const newCorrect = existing.correct + currentCorrect;

                            // T-011 FIX: clamp também após soma agregada
                            const safeNewCorrect = newTotal > 0
                                ? Math.max(0, Math.min(newTotal, newCorrect))
                                : newCorrect;

                            const newScore = newTotal > 0
                                ? catMinScore + (safeNewCorrect / newTotal) * catDomain
                                : (existing.score + currentScore) / 2;

                            scoresByDate[dk][weightKey] = {
                                score: newScore,
                                correct: safeNewCorrect,
                                total: newTotal,
                                minScore: catMinScore, // ✅ LOTE-01 FIX (C4)
                                maxScore: catMaxScore  // ✅ LOTE-01 FIX (C4)
                            };
                        } else {
                            scoresByDate[dk][weightKey] = {
                                score: currentScore,
                                correct: currentCorrect,
                                total: currentTotal,
                                minScore: catMinScore, // ✅ LOTE-01 FIX (C4)
                                maxScore: catMaxScore  // ✅ LOTE-01 FIX (C4)
                            };
                        }
                    }
                });

                categoryStats.push({
                    key: weightKey,
                    name: cat.name,
                    ...stats,
                    maxScore: catMaxScore,
                    minScore: catMinScore,
                    minCutoff: catMinCutoff,
                    bayesianMean: baye.mean,
                    bayesianSd: baye.sd,
                    volatility: vol,
                    weight
                });

                bayesianStats.push({ sd: baye.sd, weight, n: history.length });
            }
        }
    });

    if (categoryStats.length === 0 || totalWeight === 0) return null;

    // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
    // normalizeDate já é usado no projeto para ancorar datas com mais segurança.
    const sortedDates = Object.keys(scoresByDate).sort((a, b) => {
        const da = normalizeDate(a)?.getTime() ?? 0;
        const db = normalizeDate(b)?.getTime() ?? 0;
        return da - db;
    });
    const subjectNames = categoryStats.map(cat => cat.key || cat.name);

    const estimatedRho = getAdaptiveInterSubjectCorrelation(
        categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })),
        simuladoRows,
        subjectNames,
        undefined,
        safeMaxScore
    );

    const pooledVariance = computeWeightedVariance(
        categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })),
        totalWeight,
        estimatedRho
    );

    const pooledSD = totalWeight > 0 ? Math.sqrt(Math.max(0, pooledVariance)) : 0;

    categoryStats = computeHierarchicalAdjustment(categoryStats, pooledSD);

    // FIX: média bayesiana global em proporção, mapeada para o domínio global
    // respeitando minScore. Sem dados, assume o ponto médio (não zero).
    const propSum = weightedPropAlpha + weightedPropBeta;
    const globalProp = propSum > 0 ? (weightedPropAlpha / propSum) : 0.5;
    const bayesianMean = safeMinScore + (globalProp * globalDomain);

    const pooledBayesianVar = computeWeightedVariance(bayesianStats, totalWeight, estimatedRho);
    const pooledBayesianSD = Math.sqrt(Math.max(0, pooledBayesianVar));

    const rawGlobalHistory = sortedDates.map(date => {
        let pooledCorrect = 0;
        let pooledTotal = 0;

        Object.keys(scoresByDate[date]).forEach(name => {
            const w = weightsByKey.get(name) ?? 0;
            const catMaxScore = maxScoreByKey.get(name) || safeMaxScore;
            const metrics = scoresByDate[date][name];

            if (w > 0 && metrics !== undefined) {
                const rawTotal = Number(metrics.total) || getSyntheticTotal(catMaxScore);
                // ✅ LOTE-01 FIX (C4): minScore agora é gravado no agregado diário.
                // Fallback 0 mantido apenas para registros legados.
                const catMinScore = Number.isFinite(Number(metrics.minScore)) ? Number(metrics.minScore) : 0;
                const catDomain = Math.max(1e-9, catMaxScore - catMinScore);

                const total = Number.isFinite(rawTotal) && rawTotal > 0
                    ? rawTotal
                    : getSyntheticTotal(catMaxScore);

                const rawCorrect = (metrics.correct !== undefined && metrics.total > 0)
                    ? Number(metrics.correct)
                    : ((Number(metrics.score) - catMinScore) / catDomain) * total;

                // T-011 FIX: clamp final antes de ponderar no histórico global
                const correct = Math.max(
                    0,
                    Math.min(total, Number.isFinite(rawCorrect) ? rawCorrect : 0)
                );

                pooledCorrect += correct * w;
                pooledTotal += total * w;
            }
        });

        return { date, score: pooledTotal > 0 ? safeMinScore + (pooledCorrect / pooledTotal) * globalDomain : -1 };
    }).filter(item => item.score >= 0 && !isNaN(item.score));

    const adaptiveSignal = computeAdaptiveSignal(rawGlobalHistory);
    const confidenceMultiplier = getConfidenceMultiplier(adaptiveSignal.effectiveN) * adaptiveSignal.ciInflation;

    const weightedLow = Math.max(safeMinScore, bayesianMean - confidenceMultiplier * pooledBayesianSD);
    const weightedHigh = Math.min(safeMaxScore, bayesianMean + confidenceMultiplier * pooledBayesianSD);

    const globalHistory = rawGlobalHistory;

    const winsorizedScores = winsorizeSeries(
        globalHistory.map(h => getSafeScore(h, safeMaxScore, safeMinScore)),
        adaptiveSignal.adaptiveWinsor.low,
        adaptiveSignal.adaptiveWinsor.high
    );

    const robustGlobalHistory = globalHistory.map((h, idx) => ({ ...h, score: winsorizedScores[idx] }));

    const temporalVolatility = calculateVolatility(robustGlobalHistory, safeMaxScore, safeMinScore);
    const dailySD = temporalVolatility > 0 ? temporalVolatility : pooledSD;

    const avgCV = totalWeight > 0
        ? categoryStats.reduce((acc, cat) => acc + ((cat.mean > 1 ? (cat.sd / cat.mean) * 100 : 0) * (cat.weight / totalWeight)), 0)
        : 0;

    const hLen = robustGlobalHistory.length;
    const firstScore = hLen > 0 ? (robustGlobalHistory[0].score || 0).toFixed(4) : '0';
    const lastScore = hLen > 0 ? (robustGlobalHistory[hLen - 1].score || 0).toFixed(4) : '0';
    const scoreFingerprint = `${hLen}-${firstScore}-${lastScore}`;

    const cutoffs = categoryStats.map(c => c.minCutoff || 0).join('-');

    // T-016 FIX: incluir pesos no hash.
    // Sem isso, mudar pesos podia não disparar nova simulação se a média global
    // e o fingerprint permanecessem parecidos.
    const weightFingerprint = categoryStats
      .map(c => `${c.key}:${Number(c.weight || 0).toFixed(2)}`)
      .join('|');

    const safeTotalWeight = Number.isFinite(totalWeight)
      ? Number(totalWeight.toFixed(2))
      : 0;

    const safeTargetScore = Number.isFinite(Number(targetScore)) ? Number(targetScore) : 'na';
    const statsHash = `${bayesianMean.toFixed(4)}-${pooledSD.toFixed(4)}-${safeMinScore}-${safeMaxScore}-${scoreFingerprint}-tw[${safeTotalWeight}]-w[${weightFingerprint}]-cutoffs[${cutoffs}]-tgt[${safeTargetScore}]`;

    return {
        categoryStats,
        bayesianMean,
        pooledSD,
        totalWeight,
        bayesianCI: { ciLow: weightedLow, ciHigh: weightedHigh },
        globalHistory,
        dailySD,
        estimatedRho,
        consistencyScore: Math.max(0, 100 - avgCV),
        statsHash
    };
}


```

---

### Arquivo: `src/engine/causal/policyEngine.js`
*Linhas: 353 | Tamanho: 10.2 KB*

```javascript
/**
 * policyEngine.js
 *
 * Lote 11 — Personalized Policy Engine
 *
 * Usa uplift causal para personalizar recomendações.
 */

import { normalizeCausalUplift } from './upliftModel.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Infere tipo de ação a partir do texto.
 */
export function inferActionType(text = '') {
  const s = String(text || '').toLowerCase();

  if (/agilidade|cronômetro|cronometro|tempo|velocidade/.test(s)) {
    return 'agility_training';
  }

  if (/revisão espaçada|revisao espacada|srs|flashcard|memória|memoria|retenção|retencao/.test(s)) {
    return 'srs_review';
  }

  if (/simulado|prova|mock|exame/.test(s)) {
    return 'mock_exam';
  }

  if (/revisão geral|revisao geral|geral|manutenção|manutencao/.test(s)) {
    return 'general_review';
  }

  if (/questões|questoes|exercícios|exercicios|prática|pratica|bateria/.test(s)) {
    return 'weak_topic_practice';
  }

  return 'weak_topic_practice';
}

/**
 * Converte tópicos fracos em candidatos de ação.
 */
export function candidatesFromWeakTopics(topics = [], category = {}, options = {}) {
  const safeTopics = Array.isArray(topics) ? topics : Object.values(topics || {});
  const maxTopics = Math.round(clampFinite(options.maxTopics, 1, 30, 8));

  return safeTopics
    .filter(Boolean)
    .slice(0, maxTopics)
    .map((topic, index) => {
      const rawProficiency = Number.isFinite(topic.bayesianProficiency)
        ? topic.bayesianProficiency
        : Number.isFinite(topic.percentage)
          ? topic.percentage
          : 50;

      const weakness = clampFinite(1 - rawProficiency / 100, 0, 1, 0.5);

      const uncertainty = Number.isFinite(topic.bayesianUncertainty)
        ? topic.bayesianUncertainty
        : topic.isUntested
          ? 0.8
          : 0.35;

      const evidence = Number.isFinite(topic.bayesianEvidence)
        ? topic.bayesianEvidence
        : clampFinite((topic.total || 0) / ((topic.total || 0) + 10), 0, 1, 0);

      return {
        id: `topic:${category?.id || 'category'}:${topic.name || index}`,
        type: 'weak_topic_practice',
        name: topic.name || `Tópico ${index + 1}`,
        categoryId: category?.id || null,
        categoryName: category?.name || null,
        decisionUtility: Number.isFinite(topic.decisionUtility)
          ? topic.decisionUtility
          : clampFinite((topic.urgencyScore || 0) / 2, 0, 100, 40),
        features: {
          weakness,
          uncertainty,
          evidence,
          recencyDays: Number.isFinite(topic.daysSince) ? topic.daysSince : 21,
          costMinutes: Number.isFinite(topic.costMinutes) ? topic.costMinutes : 35,
          priority: topic.manualPriority >= 40 ? 'high' : 'medium',
          fsrsDue: Boolean(topic.srsDue),
        },
      };
    });
}

/**
 * Adiciona ações sistêmicas: SRS, agilidade, revisão geral, simulado crítico.
 */
export function addSystemActionCandidates(candidates = [], metrics = {}, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? [...candidates] : [];

  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;

  const hasType = (type) =>
    safeCandidates.some((candidate) => candidate?.type === type);

  if (metrics?.srsLabel && !hasType('srs_review')) {
    safeCandidates.push({
      id: `system:srs:${categoryId || 'global'}`,
      type: 'srs_review',
      name: 'Revisão Espaçada (SRS)',
      categoryId,
      categoryName,
      decisionUtility: 78,
      features: {
        weakness: 0.35,
        uncertainty: 0.25,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 25,
        priority: 'high',
        fsrsDue: true,
      },
    });
  }

  const avgSeconds = Number(metrics?.avgSeconds);

  if (Number.isFinite(avgSeconds) && avgSeconds > 150 && !hasType('agility_training')) {
    safeCandidates.push({
      id: `system:agility:${categoryId || 'global'}`,
      type: 'agility_training',
      name: 'Treino de Agilidade',
      categoryId,
      categoryName,
      decisionUtility: 65,
      features: {
        weakness: 0.30,
        uncertainty: 0.30,
        evidence: 0.65,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 30,
        priority: 'medium',
      },
    });
  }

  const probability = Number(metrics?.mcProbability);

  if (
    Number.isFinite(probability) &&
    probability < 35 &&
    !hasType('mock_exam')
  ) {
    safeCandidates.push({
      id: `system:critical-mock:${categoryId || 'global'}`,
      type: 'mock_exam',
      name: 'Simulado de Intervenção',
      categoryId,
      categoryName,
      decisionUtility: 82,
      features: {
        weakness: 0.55,
        uncertainty: 0.45,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 5,
        costMinutes: 90,
        priority: 'high',
      },
    });
  }

  if (!hasType('general_review')) {
    safeCandidates.push({
      id: `system:general-review:${categoryId || 'global'}`,
      type: 'general_review',
      name: 'Revisão Geral',
      categoryId,
      categoryName,
      decisionUtility: 48,
      features: {
        weakness: 0.30,
        uncertainty: 0.40,
        evidence: 0.5,
        recencyDays: metrics.daysSinceLastStudy ?? 10,
        costMinutes: 45,
        priority: 'medium',
      },
    });
  }

  return safeCandidates;
}

function getCausalEstimateForCandidate(candidate, causalModel) {
  if (!causalModel || typeof causalModel !== 'object') {
    return null;
  }

  const actions = causalModel.actions || {};

  return (
    actions[candidate?.type] ||
    actions.global ||
    causalModel.global ||
    null
  );
}

/**
 * Pontua candidatos combinando utilidade e uplift causal.
 */
export function scoreCandidatesWithCausal(candidates = [], causalModel = null, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const baseCausalWeight = clampFinite(options.causalWeight, 0, 0.85, 0.35);

  return safeCandidates
    .filter(Boolean)
    .map((candidate) => {
      const causalEstimate = getCausalEstimateForCandidate(candidate, causalModel);

      const uplift = Number.isFinite(causalEstimate?.uplift)
        ? causalEstimate.uplift
        : 0;

      const sampleSize = Number.isFinite(causalEstimate?.sampleSize)
        ? causalEstimate.sampleSize
        : Number.isFinite(causalEstimate?.diagnostics?.n)
          ? causalEstimate.diagnostics.n
          : 0;

      const evidenceFactor = sampleSize / (sampleSize + 20);

      const effectiveCausalWeight =
        baseCausalWeight * (0.25 + 0.75 * evidenceFactor);

      const causalScore = normalizeCausalUplift(uplift, maxScore) * 100;

      const baseUtility = clampFinite(candidate.decisionUtility, 0, 100, 40);

      const finalPolicyScore =
        baseUtility * (1 - effectiveCausalWeight) +
        causalScore * effectiveCausalWeight;

      return {
        ...candidate,
        causalUplift: Number(uplift.toFixed(4)),
        causalSampleSize: sampleSize,
        causalMethod: causalEstimate?.method || null,
        causalScore: Number(causalScore.toFixed(2)),
        effectiveCausalWeight: Number(effectiveCausalWeight.toFixed(4)),
        finalPolicyScore: Number(finalPolicyScore.toFixed(2)),
      };
    })
    .sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
}

/**
 * Seleciona ações personalizadas.
 */
export function selectPersonalizedActions(candidates = [], causalModel = null, options = {}) {
  let scored = scoreCandidatesWithCausal(candidates, causalModel, options);

  const healthStatus = String(options.healthStatus || '').toLowerCase();

  if (healthStatus === 'critical') {
    scored = scored.map((candidate) => {
      let adjustedScore = candidate.finalPolicyScore;

      if (candidate.type === 'mock_exam') {
        adjustedScore *= 0.75;
      }

      if (
        candidate.type === 'srs_review' ||
        candidate.type === 'general_review'
      ) {
        adjustedScore *= 1.08;
      }

      const costMinutes = Number(candidate?.features?.costMinutes) || 0;

      if (costMinutes > 75) {
        adjustedScore *= 0.85;
      }

      return {
        ...candidate,
        finalPolicyScore: Number(adjustedScore.toFixed(2)),
      };
    });

    scored.sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
  }

  const topK = Math.round(clampFinite(options.topK, 1, 30, 5));

  const selected = scored.slice(0, topK);

  return selected.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    rationale: `${candidate.type} | utilidade ${candidate.decisionUtility ?? 0} | uplift ${candidate.causalUplift} | evidência ${candidate.causalSampleSize}`,
    policy: {
      personalized: true,
      causalModelAvailable: Boolean(causalModel),
      healthStatus: healthStatus || 'unknown',
    },
  }));
}

/**
 * Gera relatório de política personalizada.
 */
export function buildPolicyReport(selectedActions = [], causalModel = null, options = {}) {
  const safeSelected = Array.isArray(selectedActions) ? selectedActions : [];

  return {
    generatedAt: Date.now(),
    maxScore: options.maxScore ?? 100,
    healthStatus: options.healthStatus || null,
    selectedActions,
    globalUplift: causalModel?.global?.uplift ?? null,
    actionUplifts: causalModel?.actions || {},
    sampleSize: causalModel?.sampleSize ?? null,
    recommendations: safeSelected.map((action) => ({
      rank: action.rank,
      id: action.id,
      name: action.name,
      type: action.type,
      score: action.finalPolicyScore,
      uplift: action.causalUplift,
      evidence: action.causalSampleSize,
      rationale: action.rationale,
    })),
  };
}

export default {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  scoreCandidatesWithCausal,
  selectPersonalizedActions,
  buildPolicyReport,
};


```

---

### Arquivo: `src/engine/causal/upliftModel.js`
*Linhas: 908 | Tamanho: 22.5 KB*

```javascript
/**
 * upliftModel.js
 *
 * Lote 11 — Causal Uplift Engine
 *
 * Estima o efeito causal de ações de estudo usando dados observacionais.
 *
 * Métodos:
 * - naive uplift;
 * - regression adjustment;
 * - IPTW (Inverse Probability of Treatment Weighting);
 * - Doubly Robust estimation;
 * - bootstrap opcional para intervalo de confiança.
 */

const CAUSAL_MODEL_KEY = 'coach_causal_model_v1';

export const DEFAULT_CAUSAL_COVARIATES = [
  'baselineScore',
  'volatility',
  'daysSince',
  'weight',
  'uncertainty',
];

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function meanValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return 0;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function sdValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length < 2) return 0;

  const mean = meanValues(finite);

  const variance =
    finite.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    (finite.length - 1);

  return Math.sqrt(Math.max(0, variance));
}

function sigmoid(z) {
  const safeZ = clampFinite(z, -35, 35, 0);

  if (safeZ > 30) return 1;
  if (safeZ < -30) return 0;

  return 1 / (1 + Math.exp(-safeZ));
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);

  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Resolve sistema linear Ax = b usando eliminação gaussiana com pivoteamento.
 */
function solveLinearSystem(A, b) {
  const n = A.length;

  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotValue = Math.abs(M[col][col]);

    for (let row = col + 1; row < n; row++) {
      const currentValue = Math.abs(M[row][col]);

      if (currentValue > pivotValue) {
        pivotValue = currentValue;
        pivotRow = row;
      }
    }

    if (pivotValue < 1e-12) {
      continue;
    }

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];

    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;

      const factor = M[row][col];

      if (Math.abs(factor) < 1e-15) continue;

      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row, i) => {
    const diag = row[i];
    return Math.abs(diag) < 1e-12 ? 0 : row[n];
  });
}

/**
 * Regressão linear com ridge.
 *
 * X deve conter intercepto na primeira coluna.
 */
function fitLinearRegression(X, y, ridge = 1e-3) {
  const n = X.length;

  if (n === 0) return [];

  const p = X[0].length;

  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    const row = X[i];

    for (let j = 0; j < p; j++) {
      Xty[j] += row[j] * y[i];

      for (let k = 0; k < p; k++) {
        XtX[j][k] += row[j] * row[k];
      }
    }
  }

  for (let j = 0; j < p; j++) {
    // Não regularizar o intercepto.
    if (j > 0) {
      XtX[j][j] += ridge;
    }
  }

  return solveLinearSystem(XtX, Xty);
}

function predictLinear(coefficients, row) {
  if (!Array.isArray(coefficients) || !Array.isArray(row)) return 0;

  let sum = 0;

  for (let i = 0; i < Math.min(coefficients.length, row.length); i++) {
    sum += coefficients[i] * row[i];
  }

  return sum;
}

/**
 * Prepara eventos causais.
 *
 * Evento esperado:
 * {
 *   treated: boolean | 0 | 1,
 *   outcomeDelta: number,
 *   baselineScore: number,
 *   volatility: number,
 *   daysSince: number,
 *   weight: number,
 *   uncertainty: number,
 *   actionType: string
 * }
 */
export function prepareCausalEvents(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const rawEvents = safeArray(events)
    .map((event, index) => {
      const treatedRaw =
        event?.treated ??
        event?.completed ??
        event?.treatment ??
        event?.isTreated ??
        0;

      const treated =
        treatedRaw === true ||
        treatedRaw === 1 ||
        treatedRaw === '1' ||
        treatedRaw === 'true'
          ? 1
          : 0;

      const outcomeDelta = toFinite(event?.outcomeDelta, NaN);

      if (!Number.isFinite(outcomeDelta)) return null;

      const normalized = {
        id: event?.id || `causal-event-${index}`,
        timestamp: toFinite(event?.timestamp, Date.now()),
        treated,
        outcomeDelta: clampFinite(outcomeDelta, -maxScore, maxScore, 0),
        actionType: String(event?.actionType || event?.type || 'global'),
      };

      covariates.forEach((key) => {
        normalized[key] = toFinite(event?.[key], NaN);
      });

      return normalized;
    })
    .filter(Boolean);

  if (rawEvents.length === 0) return [];

  // Preenche covariáveis ausentes com média observada.
  covariates.forEach((key) => {
    const observed = rawEvents
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const fillValue = observed.length > 0 ? meanValues(observed) : 0;

    rawEvents.forEach((event) => {
      if (!Number.isFinite(event[key])) {
        event[key] = fillValue;
      }
    });
  });

  return rawEvents;
}

/**
 * Uplift naive: média dos tratados - média dos controles.
 */
export function estimateNaiveUplift(events = []) {
  const safeEvents = safeArray(events).filter(
    (event) => Number.isFinite(event?.outcomeDelta)
  );

  if (safeEvents.length === 0) {
    return {
      method: 'naive',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treated = safeEvents.filter((event) => event.treated === 1);
  const control = safeEvents.filter((event) => event.treated === 0);

  const treatedMean = meanValues(treated.map((event) => event.outcomeDelta));
  const controlMean = meanValues(control.map((event) => event.outcomeDelta));

  return {
    method: 'naive',
    uplift: Number((treatedMean - controlMean).toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount: treated.length,
    controlCount: control.length,
    diagnostics: {
      treatedMean: Number(treatedMean.toFixed(6)),
      controlMean: Number(controlMean.toFixed(6)),
    },
  };
}

function computeStandardizers(events, covariates) {
  return covariates.map((key) => {
    const values = events
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const mean = values.length > 0 ? meanValues(values) : 0;
    const sd = values.length > 1 ? sdValues(values) : 1;

    return {
      key,
      mean,
      sd: Math.max(1e-6, sd),
    };
  });
}

function covariateVector(event, standardizers) {
  return standardizers.map((standardizer) => {
    const raw = toFinite(event?.[standardizer.key], standardizer.mean);
    return (raw - standardizer.mean) / standardizer.sd;
  });
}

/**
 * Uplift ajustado por regressão linear.
 */
export function estimateRegressionAdjustedUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 8 || treatedCount < 2 || controlCount < 2) {
    return {
      ...naive,
      method: 'naive_fallback_regression',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const X = safeEvents.map((event) => {
    return [
      1,
      event.treated,
      ...covariateVector(event, standardizers),
    ];
  });

  const y = safeEvents.map((event) => event.outcomeDelta);

  const coefficients = fitLinearRegression(X, y, options.ridge ?? 1e-3);

  const uplift = coefficients[1] || 0;

  return {
    method: 'regression_adjusted',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      coefficients: coefficients.map((c) => Number(c.toFixed(6))),
      covariates: ['intercept', 'treatment', ...covariates],
    },
  };
}

/**
 * Propensity score via regressão logística simples com gradiente descendente.
 */
function fitPropensityScores(events, standardizers, options = {}) {
  const treatedCount = events.filter((e) => e.treated === 1).length;
  const controlCount = events.length - treatedCount;

  const pTreat =
    events.length > 0
      ? clampFinite(treatedCount / events.length, 0.01, 0.99, 0.5)
      : 0.5;

  if (treatedCount === 0 || controlCount === 0) {
    return {
      probabilities: events.map(() => pTreat),
      pTreat,
    };
  }

  const p = standardizers.length;
  const weights = new Array(p + 1).fill(0);

  const iterations = Math.round(clampFinite(options.iterations, 20, 1000, 220));
  const learningRate = clampFinite(options.learningRate, 1e-4, 1, 0.05);
  const l2 = clampFinite(options.l2, 0, 1, 1e-3);

  const X = events.map((event) => [1, ...covariateVector(event, standardizers)]);
  const y = events.map((event) => event.treated);

  for (let iter = 0; iter < iterations; iter++) {
    const gradient = new Array(p + 1).fill(0);

    for (let i = 0; i < X.length; i++) {
      const row = X[i];

      let z = 0;
      for (let j = 0; j < row.length; j++) {
        z += weights[j] * row[j];
      }

      const pred = sigmoid(z);
      const error = pred - y[i];

      for (let j = 0; j < row.length; j++) {
        gradient[j] += error * row[j];
      }
    }

    for (let j = 0; j < weights.length; j++) {
      const regularization = j === 0 ? 0 : l2 * weights[j];
      weights[j] -= learningRate * (gradient[j] / X.length + regularization);
    }
  }

  const probabilities = X.map((row) => {
    let z = 0;

    for (let j = 0; j < row.length; j++) {
      z += weights[j] * row[j];
    }

    return clampFinite(sigmoid(z), 0.02, 0.98, pTreat);
  });

  return {
    probabilities,
    pTreat,
    weights,
  };
}

/**
 * IPTW uplift.
 */
export function estimateIPTWUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 10 || treatedCount < 3 || controlCount < 3) {
    return {
      ...naive,
      method: 'naive_fallback_iptw',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const pTreat = propensity.pTreat;

  let weightedTreatedSum = 0;
  let weightedTreatedWeight = 0;

  let weightedControlSum = 0;
  let weightedControlWeight = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    if (event.treated === 1) {
      const weight = clampFinite(pTreat / e, 0.05, 20, 1);
      weightedTreatedSum += event.outcomeDelta * weight;
      weightedTreatedWeight += weight;
    } else {
      const weight = clampFinite((1 - pTreat) / (1 - e), 0.05, 20, 1);
      weightedControlSum += event.outcomeDelta * weight;
      weightedControlWeight += weight;
    }
  });

  const weightedTreatedMean =
    weightedTreatedWeight > 0
      ? weightedTreatedSum / weightedTreatedWeight
      : 0;

  const weightedControlMean =
    weightedControlWeight > 0
      ? weightedControlSum / weightedControlWeight
      : 0;

  const uplift = weightedTreatedMean - weightedControlMean;

  return {
    method: 'iptw',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      weightedTreatedMean: Number(weightedTreatedMean.toFixed(6)),
      weightedControlMean: Number(weightedControlMean.toFixed(6)),
      pTreat: Number(pTreat.toFixed(6)),
    },
  };
}

/**
 * Doubly Robust uplift.
 */
export function estimateDoublyRobustUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxOutcome = clampFinite(
    options.maxOutcome ?? options.maxScore,
    1,
    1_000_000,
    100
  );

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 12 || treatedCount < 4 || controlCount < 4) {
    return estimateRegressionAdjustedUplift(safeEvents, options);
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const X = safeEvents.map((event) => [
    1,
    event.treated,
    ...covariateVector(event, standardizers),
  ]);

  const y = safeEvents.map((event) => event.outcomeDelta);

  const outcomeCoefficients = fitLinearRegression(
    X,
    y,
    options.ridge ?? 1e-3
  );

  let sumDR = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    const covariatesRow = covariateVector(event, standardizers);

    const mu1 = predictLinear(outcomeCoefficients, [1, 1, ...covariatesRow]);
    const mu0 = predictLinear(outcomeCoefficients, [1, 0, ...covariatesRow]);

    const observed = event.outcomeDelta;

    let drScore = mu1 - mu0;

    if (event.treated === 1) {
      drScore += (observed - mu1) / e;
    } else {
      drScore -= (observed - mu0) / (1 - e);
    }

    drScore = clampFinite(drScore, -maxOutcome, maxOutcome, 0);

    sumDR += drScore;
  });

  const uplift = safeEvents.length > 0 ? sumDR / safeEvents.length : 0;

  return {
    method: 'doubly_robust',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      pTreat: Number(propensity.pTreat.toFixed(6)),
      meanDRScore: Number(uplift.toFixed(6)),
    },
  };
}

/**
 * Estimador principal.
 */
export function estimateCausalUplift(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const safeEvents = prepareCausalEvents(events, {
    ...options,
    covariates,
  });

  if (safeEvents.length === 0) {
    return {
      method: 'none',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  let method = options.method || 'auto';

  if (method === 'auto') {
    if (
      safeEvents.length >= 30 &&
      treatedCount >= 10 &&
      controlCount >= 10
    ) {
      method = 'doubly_robust';
    } else if (
      safeEvents.length >= 12 &&
      treatedCount >= 3 &&
      controlCount >= 3
    ) {
      method = 'regression_adjusted';
    } else {
      method = 'naive';
    }
  }

  let estimate = null;

  if (method === 'doubly_robust') {
    estimate = estimateDoublyRobustUplift(safeEvents, options);
  } else if (method === 'iptw') {
    estimate = estimateIPTWUplift(safeEvents, options);
  } else if (method === 'regression_adjusted') {
    estimate = estimateRegressionAdjustedUplift(safeEvents, options);
  } else {
    estimate = estimateNaiveUplift(safeEvents);
  }

  if (!estimate || !Number.isFinite(estimate.uplift)) {
    estimate = estimateNaiveUplift(safeEvents);
  }

  let ci = null;

  const bootstrapIterations = Math.round(
    clampFinite(options.bootstrapIterations, 0, 1000, 0)
  );

  if (bootstrapIterations > 0 && safeEvents.length >= 8) {
    const seed = options.seed ?? `causal-bootstrap-${safeEvents.length}`;
    const rng = mulberry32(hashSeed(seed));

    const bootstrapEstimates = [];

    for (let i = 0; i < bootstrapIterations; i++) {
      const sample = [];

      for (let j = 0; j < safeEvents.length; j++) {
        const idx = Math.floor(rng() * safeEvents.length);
        sample.push(safeEvents[idx]);
      }

      try {
        let sampleEstimate = null;

        if (method === 'doubly_robust') {
          sampleEstimate = estimateDoublyRobustUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'iptw') {
          sampleEstimate = estimateIPTWUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'regression_adjusted') {
          sampleEstimate = estimateRegressionAdjustedUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else {
          sampleEstimate = estimateNaiveUplift(sample);
        }

        if (Number.isFinite(sampleEstimate?.uplift)) {
          bootstrapEstimates.push(sampleEstimate.uplift);
        }
      } catch {
        // ignore bootstrap sample failures
      }
    }

    if (bootstrapEstimates.length >= 10) {
      const sorted = [...bootstrapEstimates].sort((a, b) => a - b);

      ci = {
        low: Number(quantileSorted(sorted, 0.025).toFixed(6)),
        high: Number(quantileSorted(sorted, 0.975).toFixed(6)),
        iterations: bootstrapEstimates.length,
      };
    }
  }

  return {
    ...estimate,
    ci,
    covariates,
  };
}

/**
 * Estima uplift por tipo de ação.
 */
export function estimateUpliftByAction(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);

  const minSamplesPerAction = Math.round(
    clampFinite(options.minSamplesPerAction, 3, 200, 8)
  );

  const groups = {};

  safeEvents.forEach((event) => {
    const actionType = event.actionType || 'global';

    if (!groups[actionType]) {
      groups[actionType] = [];
    }

    groups[actionType].push(event);
  });

  const actions = {};

  Object.entries(groups).forEach(([actionType, groupEvents]) => {
    if (groupEvents.length < minSamplesPerAction) return;

    actions[actionType] = estimateCausalUplift(groupEvents, {
      ...options,
      bootstrapIterations:
        options.bootstrapActions === true
          ? options.bootstrapIterations ?? 80
          : 0,
    });
  });

  const global =
    safeEvents.length >= minSamplesPerAction
      ? estimateCausalUplift(safeEvents, options)
      : estimateNaiveUplift(safeEvents);

  return {
    global,
    actions,
    sampleSize: safeEvents.length,
    actionCounts: Object.fromEntries(
      Object.entries(groups).map(([actionType, groupEvents]) => [
        actionType,
        groupEvents.length,
      ])
    ),
  };
}

/**
 * Normaliza uplift para escala de decisão.
 */
export function normalizeCausalUplift(uplift, maxScore = 100) {
  const safeMaxScore = clampFinite(maxScore, 1, 1_000_000, 100);
  const safeUplift = toFinite(uplift, 0);

  const scale = safeMaxScore * 0.15;

  return clampFinite(0.5 + safeUplift / scale, 0, 1, 0.5);
}

/**
 * Salva modelo causal.
 */
export function saveCausalModel(model) {
  try {
    localStorage.setItem(CAUSAL_MODEL_KEY, JSON.stringify(model || {}));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega modelo causal.
 */
export function loadCausalModel() {
  try {
    const raw = localStorage.getItem(CAUSAL_MODEL_KEY);
    const parsed = JSON.parse(raw || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Limpa modelo causal.
 */
export function clearCausalModel() {
  try {
    localStorage.removeItem(CAUSAL_MODEL_KEY);
  } catch {
    // ignore
  }
}

export default {
  DEFAULT_CAUSAL_COVARIATES,
  prepareCausalEvents,
  estimateNaiveUplift,
  estimateRegressionAdjustedUplift,
  estimateIPTWUplift,
  estimateDoublyRobustUplift,
  estimateCausalUplift,
  estimateUpliftByAction,
  normalizeCausalUplift,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
};


```

---

### Arquivo: `src/engine/diagnostics.js`
*Linhas: 742 | Tamanho: 28.6 KB*

```javascript
/**
 * DIAGNOSTICS ENGINE v1.0 — Motor de Diagnóstico Avançado
 * Análises estatísticas avançadas para diagnóstico de performance.
 */

import { getSafeScore } from '../utils/scoreHelper.js';
import { kahanMean, kahanSum } from './math/kahan.js';
import { pruneHistoryForMemory, getSortedHistory } from './stats.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
// ✅ LOTE-03: importar do módulo probabilístico unificado
import { fsrsRetrievability } from './probabilistic/fsrs.js';
// ✅ LOTE-01 FIX (C5): MSSD real para o risco de esquecimento
import { calculateMSSD } from './projection.js';

function _getEntryDate(entry) {
  const raw = entry?.date || entry?.createdAt;
  if (!raw) return null;
  const parsed = safeDateParse(raw);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function _normalizeDiagnosticHistory(historyRaw, maxScore = 100, minScore = 0) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const parsedDate = _getEntryDate(entry);
      if (!parsedDate) return null;
      const score = getSafeScore(entry, maxScore, minScore);
      if (!Number.isFinite(score)) return null;
      return { ...entry, date: parsedDate.toISOString(), score };
    })
    .filter(Boolean);
}

function _median(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function _mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return kahanMean(arr);
}

function _variance(arr, mu = null) {
  const clean = Array.isArray(arr)
    ? arr.filter(v => Number.isFinite(v))
    : [];

  if (clean.length < 2) return 0;

  const m = Number.isFinite(mu) ? mu : _mean(clean);
  if (!Number.isFinite(m)) return 0;

  const devs = clean.map(v => (v - m) ** 2);
  const sum = kahanSum(devs);
  const variance = sum / (clean.length - 1);

  return Number.isFinite(variance) ? variance : 0;
}

function _std(arr, mu = null) {
  const variance = _variance(arr, mu);
  if (!Number.isFinite(variance)) return 0;
  return Math.sqrt(Math.max(0, variance));
}

export function detectDataAnomalies(historyRaw = [], maxScore = 100) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  const issues = [];
  if (!Array.isArray(history) || history.length === 0) {
    issues.push({ type: 'data', severity: 'info', msg: 'Sem histórico para análise.' });
    return issues;
  }

  const parsed = history.map((h, idx) => {
    const score = getSafeScore(h, maxScore);
    const dateRaw = h?.date || h?.createdAt;
    const d = dateRaw ? new Date(dateRaw) : null;
    const t = d && !isNaN(d.getTime()) ? d.getTime() : null;
    return { ...h, idx, score, date: dateRaw, t, finite: Number.isFinite(score) };
  });

  const finites = parsed.filter(p => p.finite);
  const nFinite = finites.length;

  const invalidRate = history.length > 0 ? (history.length - nFinite) / history.length : 0;
  if (invalidRate > 0.2) {
    issues.push({ type: 'data', severity: 'warning', msg: `${Math.round(invalidRate * 100)}% dos registros têm score inválido/NaN.`, count: history.length - nFinite });
  }

  const uniqueScores = new Set(finites.map(p => p.score));
  if (nFinite >= 3 && uniqueScores.size === 1) {
    issues.push({ type: 'data', severity: 'warning', msg: 'Todos os scores são idênticos — variância zero. Adicione variedade ou verifique input.', count: nFinite });
  }

  const dateMap = new Map();
  finites.forEach(p => {
    const rawDate = p.date || p.createdAt;
    if (!rawDate) return;
    
    const dayKey = getDateKey(rawDate);
    if (!dayKey) return;
  
    const groupKey = [
      dayKey,
      p.categoryId || p.subject || 'geral',
      p.id || p.simuladoId || 'sem-id',
    ].join('|');
  
    if (!dateMap.has(groupKey)) dateMap.set(groupKey, []);
    dateMap.get(groupKey).push(p.score);
  });
  
  for (const [key, scores] of dateMap) {
    const uniq = new Set(scores);
  
    if (uniq.size > 1) {
      issues.push({
        type: 'data',
        severity: 'warning',
        msg: `Registro duplicado/conflitante detectado (${key}): ${[...uniq].join(', ')}.`,
      });
    }
  }

  const times = finites.map(p => p.t).filter(t => t != null);
  if (times.length >= 2) {
    let unsortedGaps = 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] < times[i - 1]) unsortedGaps++;
    }
    if (unsortedGaps > 0) {
      issues.push({ type: 'data', severity: 'info', msg: `${unsortedGaps} registros fora de ordem cronológica.`, count: unsortedGaps });
    }
  }

  const future = finites.filter(p => p.t && p.t > Date.now() + 86400000 * 2).length;
  if (future > 0) issues.push({ type: 'data', severity: 'warning', msg: `${future} registros com data futura.`, count: future });

  if (nFinite >= 6) {
    const vals = finites.map(p => p.score);
    const med = _median(vals);
    const devs = vals.map(v => Math.abs(v - med));
    const mad = _median(devs) || 1e-9;
    const threshold = 3.5;
    let outliers = 0;
    for (const v of vals) {
      const mz = 0.6745 * Math.abs(v - med) / mad;
      if (mz > threshold) outliers++;
    }
    if (outliers >= 2) {
      issues.push({ type: 'data', severity: 'info', msg: `${outliers} possíveis outliers detectados.`, count: outliers });
    }
  }

  if (issues.length === 0) issues.push({ type: 'data', severity: 'ok', msg: 'Dados parecem limpos.' });

  return issues;
}

function _interSessionGaps(historyRaw) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  if (!Array.isArray(history) || history.length < 2) return [];
  const times = history
    .map((h) => { const d = _getEntryDate(h); return d ? d.getTime() : null; })
    .filter((t) => t !== null && Number.isFinite(t))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < times.length; i++) {
    const diffDays = (times[i] - times[i - 1]) / 86400000;
    if (diffDays > 0) gaps.push(diffDays);
  }
  return gaps;
}

export function computeHurstExponent(scores) {
  const fallback = { H: 0.5, confidence: 'low', interpretation: 'Dados insuficientes', rSquared: 0 };
  if (!Array.isArray(scores)) return fallback;

  const clean = scores.map(Number).filter(Number.isFinite);
  if (clean.length < 10) return fallback;

  const minLag = 2;
  const maxLag = Math.floor(clean.length / 2);
  if (maxLag < minLag) return fallback;

  const logRS = [];
  const logN = [];

  for (let tau = minLag; tau <= maxLag; tau = Math.ceil(tau * 1.4)) {
    const nBlocks = Math.floor(clean.length / tau);
    if (nBlocks < 2) break;

    let rsSum = 0;
    let validBlocks = 0;

    for (let b = 0; b < nBlocks; b++) {
      const block = clean.slice(b * tau, (b + 1) * tau);
      if (block.length < 2) continue;

      const mu = _mean(block);
      let accum = 0;
      let maxAccum = -Infinity;
      let minAccum = Infinity;
      for (const v of block) {
        accum += v - mu;
        if (accum > maxAccum) maxAccum = accum;
        if (accum < minAccum) minAccum = accum;
      }

      const range = maxAccum - minAccum;
      const sigma = _std(block, mu);

      if (sigma > 1e-9) {
        rsSum += range / sigma;
        validBlocks++;
      }
    }

    if (validBlocks > 0) {
      logRS.push(Math.log(Math.max(1e-9, rsSum / validBlocks)));
      logN.push(Math.log(tau));
    }
  }

  if (logRS.length < 3) return fallback;

  const cleanPairs = logN.map((x, i) => ({ x, y: logRS[i] }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (cleanPairs.length < 3) return fallback;

  const muX = _mean(cleanPairs.map(p => p.x));
  const muY = _mean(cleanPairs.map(p => p.y));

  const Sxy = kahanSum(cleanPairs.map(p => (p.x - muX) * (p.y - muY)));
  const Sxx = kahanSum(cleanPairs.map(p => (p.x - muX) ** 2));

  const H = Sxx > 1e-10 ? Sxy / Sxx : 0.5;
  const clampedH = Math.max(0.1, Math.min(0.9, H));

  let interpretation = 'Passeio Aleatório (Random Walk)';
  if (clampedH > 0.65) interpretation = 'Série Persistente (Tendência Robusta)';
  else if (clampedH < 0.4) interpretation = 'Reversão à Média (Alta Instabilidade / Efeito Ioiô)';

  const SSR = kahanSum(cleanPairs.map((p) => (p.y - (muY + H * (p.x - muX))) ** 2));
  const SST = kahanSum(cleanPairs.map((p) => (p.y - muY) ** 2));
  const rSquared = SST > 0 ? 1 - (SSR / SST) : 0;

  return {
    H: Number(clampedH.toFixed(3)),
    rSquared: Number(rSquared.toFixed(3)),
    confidence: rSquared > 0.7 && logRS.length >= 5 ? 'high' : rSquared > 0.4 ? 'medium' : 'low',
    interpretation
  };
}

export function generateMathDiagnostic(history, maxScore = 100) {
  const scores = history.map(h => getSafeScore(h, maxScore));
  const hurst = computeHurstExponent(scores);

  const optimalLambda = hurst.H < 0.45 ? 0.12 : hurst.H > 0.65 ? 0.04 : 0.08;

  return {
    profile: hurst.interpretation,
    momentumHurst: hurst.H,
    recommendedLambda: optimalLambda,
    isDataNoisy: hurst.H < 0.5 && hurst.confidence !== 'low',
    hurstData: hurst
  };
}

export function computeKLDivergenceNormal(mu1, sd1, mu2, sd2) {
  const s1 = Math.max(1e-15, Number(sd1) || 1e-15);
  const s2 = Math.max(1e-15, Number(sd2) || 1e-15);
  const m1 = Number(mu1) || 0;
  const m2 = Number(mu2) || 0;

  const kl = Math.log(s2 / s1) + (s1 * s1 + (m1 - m2) ** 2) / (2 * s2 * s2) - 0.5;
  const safekl = Math.max(0, kl);

  let interpretation;
  if (safekl < 0.1) interpretation = 'Performance muito próxima do alvo.';
  else if (safekl < 0.5) interpretation = 'Distância moderada da distribuição alvo.';
  else if (safekl < 2.0) interpretation = 'Lacuna significativa em relação ao alvo.';
  else interpretation = 'Distribuição muito afastada do alvo — foco intenso necessário.';

  return { kl: Number(safekl.toFixed(4)), interpretation };
}

// ✅ LOTE-03: wrapper para compatibilidade com código existente.
// Delega para fsrsRetrievability, que é a mesma fórmula (1+t/9S)^-1,
// mas sem o clamp inferior de 0.1 que a versão antiga aplicava.
export function computeEbbinghausRetention(daysSince, stabilityDays) {
    return fsrsRetrievability(daysSince, stabilityDays);
}

export function estimateMemoryStability(history, maxScore = 100, baselineScore = null, minScore = 0) {
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const domain = Math.max(1e-9, safeMax - safeMin);
  const normalized = _normalizeDiagnosticHistory(history, safeMax, safeMin);
  if (normalized.length === 0) return 3;

  const sorted = getSortedHistory(normalized);
  let stability = 3.0;

  const safeBaseline = baselineScore !== null ? baselineScore : _mean(sorted.map(h => getSafeScore(h, safeMax, safeMin)));
  const dynamicSuccessThreshold = Math.min(0.7, Math.max(0.5, (safeBaseline - safeMin) / domain));

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    const pct = Math.min(1, Math.max(0, (getSafeScore(h, safeMax, safeMin) - safeMin) / domain));

    let currentRetention = 1.0;
    if (i > 0) {
      const gap = (_getEntryDate(h).getTime() - _getEntryDate(sorted[i - 1]).getTime()) / 86400000;
      // ✅ LOTE-03: usar fsrsRetrievability em vez de computeEbbinghausRetention
      currentRetention = fsrsRetrievability(gap, stability);

      if (gap > 0.1) {
        if (pct >= dynamicSuccessThreshold) {
          const elasticGrowth = 1 + 2 * Math.pow(1 - currentRetention, 2);
          stability *= elasticGrowth;
        } else {
          const dynamicDecay = Math.max(0.3, 1.0 - (0.6 * currentRetention));
          stability *= dynamicDecay;
          stability = Math.max(1, stability);
        }
      }
    }
    stability = Math.min(180, Math.max(1, stability));
  }
  return Number(stability.toFixed(1));
}

export function computeOptimalReviewInterval(stability, targetRetention = 0.7, mssdVolatility = null, effectiveN = null, maxScore = 100, currentMean = null, agilityPenalty = 0, minScore = 0) {
  const S = Math.max(0.5, Number(stability) || 7);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  let baseInterval = Math.max(1, 9 * S * ((1 / R) - 1));

  if (mssdVolatility != null && effectiveN != null && !Number.isNaN(Number(mssdVolatility))) {
    const rmssd = Number(mssdVolatility);
    const domain = Math.max(1e-6, maxScore - minScore);
    const normalizedMssd = rmssd / domain;

    const fragilityPenalty = Math.max(0.4, 1 - (normalizedMssd * 3));

    let crystallizationBonus = 1.0;
    if (effectiveN >= 3 && normalizedMssd < 0.08) {
      const confidence = Math.min(1, effectiveN / 15);
      const stabilityBonus = Math.max(0, 0.08 - normalizedMssd) * 12;
      const performanceFactor = currentMean !== null ? Math.max(0, ((currentMean - minScore) / domain) - 0.5) * 2.5 : 1;
      crystallizationBonus = 1 + (confidence * stabilityBonus * performanceFactor);
    }
    baseInterval = baseInterval * fragilityPenalty * crystallizationBonus;
  }

  const safeAgilityPenalty = Math.max(0, Math.min(0.4, Number(agilityPenalty) || 0));
  baseInterval = baseInterval * (1 - safeAgilityPenalty);

  return Math.max(1, Math.round(baseInterval));
}

export function computeForgettingRisk(history, maxScore = 100, baselineScore = null, mssdVolatility = null, effectiveN = null, daysSinceOverride = null, agilityPenalty = 0, minScore = 0) {
  const noData = { risk: 'low', retentionPct: 100, stabilityDays: 3, optimalIntervalDays: 3, daysSinceLast: 0 };
  const normalized = _normalizeDiagnosticHistory(history, maxScore, minScore);
  if (normalized.length === 0) return noData;

  const sorted = [...getSortedHistory(normalized)].filter(h => h != null && typeof h === 'object').reverse();

  const daysSinceLast = daysSinceOverride !== null ? daysSinceOverride : Math.max(0, (Date.now() - _getEntryDate(sorted[0]).getTime()) / 86400000);
  const stability = estimateMemoryStability([...sorted].reverse(), maxScore, baselineScore, minScore);
  // ✅ LOTE-03: usar fsrsRetrievability em vez de computeEbbinghausRetention
  const retention = fsrsRetrievability(daysSinceLast, stability);
  const retentionPct = Number((retention * 100).toFixed(1));

  const currentMean = _mean(sorted.map(h => getSafeScore(h, maxScore, minScore)));
  // ✅ LOTE-01 FIX (C5): computeOptimalReviewInterval usa a MESMA base FSRS
  // (9 * S * (1/R - 1)) mas consome mssdVolatility/effectiveN/agilityPenalty,
  // que antes eram recebidos e ignorados silenciosamente.
  const optimalIntervalDays = computeOptimalReviewInterval(
    stability,
    0.7,
    mssdVolatility,
    effectiveN,
    maxScore,
    currentMean,
    agilityPenalty,
    minScore
  );

  let risk;
  if (retentionPct < 30) risk = 'critical';
  else if (retentionPct < 55) risk = 'high';
  else if (retentionPct < 75 && daysSinceLast >= optimalIntervalDays * 0.8) risk = 'medium';
  else risk = 'low';

  return { risk, retentionPct, stabilityDays: stability, optimalIntervalDays, daysSinceLast: Number(daysSinceLast.toFixed(1)) };
}

export function computeLearningVelocity(history, maxScore = 100) {
  const fallback = { velocity: 0, velocityLabel: 'Dados insuficientes', plateau: maxScore * 0.7, timeToPlateauDays: null };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const validHistory = history.filter(h => _getEntryDate(h) !== null);
  const sorted = getSortedHistory(validHistory);
  if (sorted.length < 4) return fallback;

  const t0 = _getEntryDate(sorted[0]).getTime();
  const data = sorted.map((h, idx) => ({
    t: Math.max(0.001 * idx, (_getEntryDate(h).getTime() - t0) / 86400000),
    y: Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore))),
  })).filter(d => Number.isFinite(d.y));

  const lastThree = data.slice(-3).map((d) => d.y);
  const plateauEst = Math.min(maxScore, Math.max(maxScore * 0.5, Math.max(...lastThree) * 1.1));

  const linearPts = data.filter((d) => d.y < plateauEst * 0.98 && d.y > 0);
  if (linearPts.length < 3) return { ...fallback, plateau: plateauEst };

  const ys = linearPts.map((d) => Math.log(Math.max(1e-6, 1 - d.y / plateauEst)));
  const ts = linearPts.map((d) => d.t);

  const Sty = kahanSum(ts.map((t, i) => t * ys[i]));
  const Stt = kahanSum(ts.map((t) => t * t));
  const k = Stt > 1e-15 ? Math.max(1e-4, -Sty / Stt) : 1e-3;

  const tNow = data[data.length - 1].t;
  const velocity = plateauEst * k * Math.exp(-k * tNow);

  const timeToPlateauDays = tNow < 1 ? null : Math.max(0, Math.round(Math.log(0.1) / -k) - tNow);

  let velocityLabel;
  const vPerMonth = velocity * 30;

  const currentScore = data[data.length - 1].y;
  const roomToGrow = Math.max(1, plateauEst - currentScore);
  const relativeVelocity = vPerMonth / roomToGrow;

  if (relativeVelocity > 0.15) velocityLabel = `Acelerado (Alta Tração Logística)`;
  else if (relativeVelocity > 0.05) velocityLabel = `Constante (Fechando lacunas ativamente)`;
  else if (relativeVelocity > 0.01) velocityLabel = `Lento (Requer revisão de método)`;
  else velocityLabel = 'Platô atingido / Estagnado';

  return {
    velocity: Number(velocity.toFixed(4)),
    velocityLabel,
    plateau: Number(plateauEst.toFixed(1)),
    timeToPlateauDays: timeToPlateauDays !== null ? Math.min(999, timeToPlateauDays) : null,
  };
}

export function computeConsistencyIndex(history, maxScore = 100) {
  const fallback = { index: 0.5, label: 'Dados insuficientes' };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const sorted = getSortedHistory(history);

  if (sorted.length < 4) return fallback;

  const scores = sorted.map((h) => Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore)))).filter(Number.isFinite);
  if (scores.length < 4) return fallback;
  const mu = _mean(scores);

  const med = _median(scores);
  const mad = _median(scores.map((s) => Math.abs(s - med)));
  const robustSD = 1.4826 * mad;

  const referenceScale = Math.max(1, mu);
  const cv = robustSD / referenceScale;

  const index = Math.max(0, 1 - Math.tanh(cv * 1.5));

  let label;
  if (index >= 0.8) label = 'Muito consistente';
  else if (index >= 0.6) label = 'Consistente';
  else if (index >= 0.4) label = 'Moderadamente instável';
  else if (index >= 0.2) label = 'Instável';
  else label = 'Muito errático';

  return { index: Number(index.toFixed(3)), label };
}

export function computeStudyEfficiency(studySessions, simulados, maxScore = 100, categoryId = null, normalizeSubject = null) {
  const _noData = { efficiency: 0, questionsPerHour: 0, accuracyRate: 0, totalMinutes: 0, totalQuestions: 0, label: 'Sem dados' };

  const sessions = (studySessions || []).filter((s) => !categoryId || s?.categoryId === categoryId);
  const totalMinutes = sessions.reduce((acc, s) => acc + (Number(s?.duration) || 0), 0);

  const _normalize = typeof normalizeSubject === 'function'
    ? normalizeSubject
    : (value) => String(value || '').toLowerCase().trim();

  const relevantSims = categoryId
    ? (simulados || []).filter((s) => s?.categoryId === categoryId)
    : (simulados || []);

  const totalQuestions = relevantSims.reduce((acc, s) => acc + (Number(s?.total) || 0), 0);
  const totalCorrect = relevantSims.reduce((acc, s) => {
    const total = Number(s?.total) || 0;
    if (total === 0) return acc;
    if (s?.correct != null) {
      const correctNum = Number(s.correct);
      if (Number.isFinite(correctNum)) return acc + correctNum;
    }
    const score = Math.min(1, Math.max(0, (Number(s?.score) || 0) / maxScore));
    return acc + score * total;
  }, 0);

  const totalHours = totalMinutes / 60;
  const questionsPerHour = totalHours > 0 ? totalQuestions / totalHours : 0;
  const accuracyRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  const efficiency = questionsPerHour * accuracyRate;

  const historicalPace = 15;
  const efficiencyRatio = questionsPerHour / Math.max(1, historicalPace);

  let label;
  if (questionsPerHour === 0) label = 'Sem questões registradas';
  else if (efficiencyRatio >= 1.3 && accuracyRate >= 0.7) label = 'Alta Performance (Acima do seu normal)';
  else if (efficiencyRatio >= 0.8 && accuracyRate >= 0.6) label = 'Ritmo Sólido';
  else if (questionsPerHour < (historicalPace * 0.5)) label = 'Fricção Detectada (Muito tempo, pouco processamento)';
  else label = 'Acurácia precisa melhorar';

  return {
    efficiency: Number(efficiency.toFixed(2)),
    questionsPerHour: Number(questionsPerHour.toFixed(1)),
    accuracyRate: Number(accuracyRate.toFixed(3)),
    totalMinutes: Number(totalMinutes.toFixed(0)),
    totalQuestions,
    label,
  };
}

export function computeAdaptiveLambda(history) {
  const DEFAULT_LAMBDA = 0.08;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_LAMBDA;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_LAMBDA;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(0.5, Math.min(90, medianGap));
  const lambda = 0.03 + 0.08 * Math.exp(-safeMedian / 10);

  return Number(Math.max(0.03, Math.min(0.12, lambda)).toFixed(4));
}

export function computeAdaptiveDecayFactor(history) {
  const DEFAULT_DECAY = 0.985;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_DECAY;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_DECAY;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(1, Math.min(90, medianGap));

  const halfLife = Math.max(7, safeMedian * 2);
  const decayFactor = Math.pow(0.5, 1 / halfLife);

  return Number(Math.max(0.906, Math.min(0.995, decayFactor)).toFixed(5));
}

export function computeAR1Coefficient(residuals) {
  if (!Array.isArray(residuals) || residuals.length < 5) return { rho: 0, significant: false };

  const clean = residuals.map(Number).filter(Number.isFinite);
  if (clean.length < 5) return { rho: 0, significant: false };

  const mu = _mean(clean);
  const centered = clean.map((r) => r - mu);

  const n = centered.length;
  const lag1 = centered.slice(1);
  const lag0 = centered.slice(0, n - 1);

  const numerator = lag0.reduce((s, v, i) => s + v * lag1[i], 0);
  const denom0 = lag0.reduce((s, v) => s + v * v, 0);
  const rho = denom0 > 1e-10 ? numerator / denom0 : 0;
  const clampedRho = Math.max(-1, Math.min(1, rho));

  const bartlettThreshold = 1.96 / Math.sqrt(Math.max(1, n));

  return {
    rho: Number(clampedRho.toFixed(3)),
    significant: Math.abs(clampedRho) > bartlettThreshold
  };
}

export function computeCategoryCorrelation(categoryHistories, maxScore = 100) {
  if (!categoryHistories || typeof categoryHistories !== 'object') return [];

  const ids = Object.keys(categoryHistories);
  if (ids.length < 2) return [];

  const monthly = {};
  for (const id of ids) {
    const hist = categoryHistories[id] || [];
    const byMonth = {};
    for (const h of hist) {
      const rawDate = h?.date || h?.createdAt;
      if (!rawDate) continue;
      const fullKey = getDateKey(rawDate);
      if (!fullKey) continue;
      const key = fullKey.slice(0, 7);

      const s = getSafeScore(h, maxScore) / maxScore;

      if (Number.isFinite(s)) {
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(s);
      }
    }
    monthly[id] = Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, _mean(v)]));
  }

  const result = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = monthly[ids[i]];
      const b = monthly[ids[j]];

      const keys = Object.keys(a).filter((k) => k in b);
      if (keys.length < 4) continue;

      const xs = keys.map((k) => a[k]);
      const ys = keys.map((k) => b[k]);

      const muX = _mean(xs);
      const muY = _mean(ys);
      const Sxy = kahanSum(xs.map((x, k) => (x - muX) * (ys[k] - muY)));
      const Sxx = kahanSum(xs.map((x) => (x - muX) ** 2));
      const Syy = kahanSum(ys.map((y) => (y - muY) ** 2));
      const epsilon = 1e-15;
      const denom = Math.sqrt((Math.max(0, Sxx) + epsilon) * (Math.max(0, Syy) + epsilon));
      const r = Sxy / denom;
      const clampedR = Math.max(-1, Math.min(1, r));

      let strength;
      const absR = Math.abs(clampedR);
      if (absR >= 0.7) strength = 'forte';
      else if (absR >= 0.4) strength = 'moderada';
      else if (absR >= 0.2) strength = 'fraca';
      else strength = 'negligível';

      result.push({ catA: ids[i], catB: ids[j], correlation: Number(clampedR.toFixed(3)), strength, commonMonths: keys.length });
    }
  }

  return result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

export function computeCategoryDiagnostics({
  history = [],
  studySessions = [],
  simulados = [],
  maxScore = 100,
  categoryId = null,
  targetScore = null,
  bayesianStats = null,
  normalizeSubject = null,
} = {}) {

  const histArray = Array.isArray(history) ? history : Object.values(history || {});
  const safeHistory = histArray.length > 2500 ? pruneHistoryForMemory(histArray, 1500) : histArray;

  const _scores = safeHistory
    .map((h) => getSafeScore(h, maxScore))
    .filter(Number.isFinite);

  const diagnostic = generateMathDiagnostic(safeHistory, maxScore);
  const hurst = diagnostic.hurstData;
  // ✅ LOTE-01 FIX (C5): diagnostic.mssd não existia (generateMathDiagnostic
  // não retorna esse campo) → mssdVolatility era sempre undefined.
  // Calculamos o MSSD real em unidades de desvio padrão
  const mssdSD = calculateMSSD(safeHistory, maxScore);
  const forgetting = computeForgettingRisk(safeHistory, maxScore, null, mssdSD, safeHistory.length);
  const consistency = computeConsistencyIndex(safeHistory, maxScore);
  const velocity = computeLearningVelocity(safeHistory, maxScore);

  let klToTarget = null;
  if (bayesianStats && targetScore !== null) {
    const targetMu = Number(targetScore);
    const targetSd = maxScore * 0.05;
    klToTarget = computeKLDivergenceNormal(
      bayesianStats.mean ?? 0,
      bayesianStats.sd ?? maxScore * 0.1,
      targetMu,
      targetSd,
    );
  }

  const efficiency = computeStudyEfficiency(
    studySessions.filter((s) => !categoryId || s?.categoryId === categoryId),
    simulados,
    maxScore,
    categoryId,
    normalizeSubject,
  );

  const dataAnomalies = detectDataAnomalies(safeHistory, maxScore);
  const dataErrorCount = dataAnomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;

  const flags = [];
  if (forgetting.risk === 'critical') flags.push({ type: 'danger', msg: `Retenção crítica: ~${forgetting.retentionPct}% — revise imediatamente (${forgetting.daysSinceLast.toFixed(0)} dias sem estudar).` });
  if (forgetting.risk === 'high') flags.push({ type: 'warning', msg: `Risco de esquecimento alto: retenção ~${forgetting.retentionPct}%. Revisão urgente.` });
  if (consistency.index < 0.35) flags.push({ type: 'warning', msg: `Performance muito errática (índice ${consistency.index.toFixed(2)}). Consolide a base antes de avançar.` });
  if (hurst.H > 0.65 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Tendência persistente detectada (H=${hurst.H}). Mantenha o momentum atual.` });
  if (hurst.H < 0.35 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Reversão à média detectada (H=${hurst.H}). Após uma boa nota, prepare-se para oscilação.` });
  if (velocity.velocityLabel?.includes('Estagnado')) flags.push({ type: 'warning', msg: 'Platô de aprendizagem detectado. Mude a estratégia de estudo.' });
  if (efficiency.questionsPerHour < 5 && efficiency.totalMinutes > 60) flags.push({ type: 'warning', msg: `Volume baixo de questões (${efficiency.questionsPerHour.toFixed(1)}/h). Priorize exercícios práticos.` });

  dataAnomalies.forEach(a => {
    if (a.severity === 'error') flags.push({ type: 'danger', msg: a.msg });
    else if (a.severity === 'warning') flags.push({ type: 'warning', msg: a.msg });
    else if (a.severity === 'info' && dataErrorCount > 0) flags.push({ type: 'info', msg: a.msg });
  });

  return {
    hurst,
    diagnostic,
    forgetting,
    consistency,
    velocity,
    klToTarget,
    efficiency,
    flags,
    dataAnomalies,
    dataQualityScore: Math.max(0, 1 - Math.min(1, dataErrorCount / 4)),
    adaptiveLambda: diagnostic.recommendedLambda,
    adaptiveDecayFactor: computeAdaptiveDecayFactor(safeHistory),
  };
}

```

---

### Arquivo: `src/engine/evaluation/coachEvaluator.js`
*Linhas: 665 | Tamanho: 19.9 KB*

```javascript
/**
 * coachEvaluator.js
 *
 * Lote 8 — Evaluation engine para o Coach.
 *
 * Mede:
 * - calibração de probabilidade;
 * - erro de previsão de nota;
 * - qualidade de ranking de tópicos;
 * - uplift de tarefas;
 * - comparação entre estratégias.
 */
import {
  computeNDCGAtK,
  computeUplift,
} from '../../utils/coachBacktest.js';
import {
  computeBrierScore,
  computeLogLoss,
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const EVAL_STORAGE_KEY = 'coach_evaluation_results_v1';
const EVAL_STORAGE_MAX = 500;

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// FIX: remove acentos (NFD) para casar "Funções" ≙ "funcoes"
function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Avalia uma probabilidade prevista contra um resultado binário.
 */
export function evaluateProbabilityPrediction(
  predictedProbabilityPct,
  observedSuccess,
  _options = {}
) {
  const predictedPct = clampFinite(Number(predictedProbabilityPct), 0, 100, 50);
  const predictedProbability01 = predictedPct / 100;
  const observed = observedSuccess ? 1 : 0;
  const brier = computeBrierScore(predictedProbability01, observed);
  const logLoss = computeLogLoss(predictedProbability01, observed);

  return {
    predictedProbabilityPct: Number(predictedPct.toFixed(2)),
    predictedProbability01: Number(predictedProbability01.toFixed(6)),
    observed,
    observedSuccess: observed === 1,
    brier: Number.isFinite(brier) ? Number(brier.toFixed(6)) : null,
    logLoss: Number.isFinite(logLoss) ? Number(logLoss.toFixed(6)) : null,
    absoluteError: Number(Math.abs(predictedProbability01 - observed).toFixed(6)),
    hit:
      predictedProbability01 >= 0.5
        ? observed === 1
        : observed === 0,
  };
}

/**
 * Avalia previsão de nota contínua.
 */
export function evaluateScorePrediction(
  predictedScore,
  observedScore,
  options = {}
) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const predicted = clampFinite(Number(predictedScore), 0, maxScore, null);
  const observed = clampFinite(Number(observedScore), 0, maxScore, null);

  if (predicted === null || observed === null) {
    return null;
  }

  const error = observed - predicted;
  const absoluteError = Math.abs(error);
  const normalizedError = absoluteError / maxScore;

  return {
    predicted: Number(predicted.toFixed(2)),
    observed: Number(observed.toFixed(2)),
    error: Number(error.toFixed(2)),
    absoluteError: Number(absoluteError.toFixed(2)),
    normalizedError: Number(normalizedError.toFixed(6)),
    maxScore,
  };
}

/**
 * Avalia ranking de tópicos usando NDCG, Precision@K e Recall@K.
 *
 * predictedTopics:
 * [{ name: 'Probabilidade', urgencyScore: 80 }]
 *
 * actualTopics:
 * [{ name: 'Probabilidade', relevance: 2 }]
 *
 * ou apenas:
 * ['Probabilidade', 'Funções']
 */
export function evaluateTopicRanking(
  predictedTopics = [],
  actualTopics = [],
  options = {}
) {
  const k = Math.max(1, Math.round(clampFinite(options.k, 1, 20, 5)));

  const rawPredicted = (Array.isArray(predictedTopics) ? predictedTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        score: toFinite(
          topic?.urgencyScore ?? topic?.score ?? topic?.decisionScore,
          predictedTopics.length - index
        ),
      };
    });

  // FIX: deduplicar para evitar collision hits inflando o Recall
  const predictedMap = new Map();
  for (const p of rawPredicted) {
    if (!predictedMap.has(p.id) || p.score > predictedMap.get(p.id).score) {
      predictedMap.set(p.id, p);
    }
  }
  const safePredicted = Array.from(predictedMap.values()).sort((a, b) => b.score - a.score);

  const rawActual = (Array.isArray(actualTopics) ? actualTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      if (typeof topic === 'string') {
        return {
          id: normalizeName(topic),
          originalName: topic,
          relevance: 1,
        };
      }
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `actual-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        relevance: toFinite(topic?.relevance ?? topic?.weight ?? topic?.score, 1),
      };
    });

  const actualMap = new Map();
  for (const a of rawActual) {
    if (!actualMap.has(a.id) || a.relevance > actualMap.get(a.id).relevance) {
      actualMap.set(a.id, a);
    }
  }
  const safeActual = Array.from(actualMap.values());

  if (safePredicted.length === 0 || safeActual.length === 0) {
    return {
      k,
      ndcg: 0,
      precisionAtK: 0,
      recallAtK: 0,
      hits: 0,
      predictedCount: safePredicted.length,
      actualCount: safeActual.length,
    };
  }

  const ndcgPredicted = safePredicted.map((topic) => ({ id: topic.id }));
  const ndcgActual = safeActual.map((topic) => ({
    id: topic.id,
    relevance: topic.relevance,
  }));
  const ndcg = computeNDCGAtK(ndcgPredicted, ndcgActual, k);

  const topK = safePredicted.slice(0, k);
  const hits = topK.filter((topic) => actualMap.has(topic.id)).length;
  const precisionAtK = topK.length > 0 ? hits / topK.length : 0;
  const recallAtK = actualMap.size > 0 ? hits / actualMap.size : 0;

  return {
    k,
    ndcg: Number(ndcg.toFixed(6)),
    precisionAtK: Number(precisionAtK.toFixed(6)),
    recallAtK: Number(recallAtK.toFixed(6)),
    hits,
    predictedCount: safePredicted.length,
    actualCount: safeActual.length,
  };
}

/**
 * Avalia uplift de tarefas concluídas vs não concluídas.
 *
 * events:
 * [
 *   { taskId, completed, preScore, postScore }
 * ]
 */
export function evaluateTaskUplift(events = [], _options = {}) {
  const safeEvents = (Array.isArray(events) ? events : []).filter(Boolean);
  const completedDeltas = [];
  const controlDeltas = [];

  safeEvents.forEach((event) => {
    const pre = toFinite(event?.preScore, NaN);
    const post = toFinite(event?.postScore, NaN);
    if (!Number.isFinite(pre) || !Number.isFinite(post)) return;
    const delta = post - pre;
    if (event?.completed === true) {
      completedDeltas.push(delta);
    } else {
      controlDeltas.push(delta);
    }
  });

  const avgCompletedDelta = meanValues(completedDeltas);
  const avgControlDelta = meanValues(controlDeltas);
  const uplift = computeUplift(controlDeltas, completedDeltas);

  return {
    completedCount: completedDeltas.length,
    controlCount: controlDeltas.length,
    avgCompletedDelta:
      avgCompletedDelta === null ? null : Number(avgCompletedDelta.toFixed(4)),
    avgControlDelta:
      avgControlDelta === null ? null : Number(avgControlDelta.toFixed(4)),
    uplift: Number.isFinite(uplift) ? Number(uplift.toFixed(4)) : null,
  };
}

/**
 * Avalia um snapshot do Coach contra um resultado futuro.
 */
export function evaluateCoachSnapshot(snapshot = {}, outcome = {}, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const targetScore = clampFinite(options.targetScore, 0, maxScore, maxScore * 0.8);
  const predictedProbability = toFinite(snapshot?.probability, null);

  let observedSuccess = outcome?.success;
  if (observedSuccess === undefined || observedSuccess === null) {
    const observedScore = toFinite(outcome?.score, null);
    if (observedScore !== null) {
      observedSuccess = observedScore >= targetScore;
    }
  }

  const probabilityEvaluation =
    predictedProbability !== null && observedSuccess !== null
      ? evaluateProbabilityPrediction(predictedProbability, observedSuccess)
      : null;

  const scoreEvaluation = evaluateScorePrediction(
    snapshot?.predictedMean,
    outcome?.score,
    { maxScore }
  );

  let topicEvaluation = null;
  if (
    options.evaluateTopics !== false &&
    Array.isArray(snapshot?.weakTopics) &&
    snapshot.weakTopics.length > 0 &&
    Array.isArray(outcome?.relevantTopics) &&
    outcome.relevantTopics.length > 0
  ) {
    topicEvaluation = evaluateTopicRanking(
      snapshot.weakTopics,
      outcome.relevantTopics,
      {
        k: options.k ?? 5,
      }
    );
  }

  return {
    id:
      snapshot?.id ||
      `eval_${snapshot?.strategyId || 'strategy'}_${snapshot?.categoryId || 'category'}_${Date.now()}`,
    timestamp: toFinite(snapshot?.timestamp, Date.now()),
    strategyId: snapshot?.strategyId ?? null,
    categoryId: snapshot?.categoryId ?? null,
    categoryName: snapshot?.categoryName ?? null,
    normalizedScore: toFinite(snapshot?.normalizedScore, null),
    targetScore,
    maxScore,
    probabilityEvaluation,
    scoreEvaluation,
    topicEvaluation,
    taskUpliftEvaluation: null,
    meta: {
      snapshotKeys: Object.keys(snapshot || {}),
      outcomeKeys: Object.keys(outcome || {}),
    },
  };
}

/**
 * Resume várias avaliações.
 *
 * FIX: um único loop (reduce) em vez de 10 arrays + forEach separados —
 * mesma saída, menos alocação e menos passadas.
 */
export function summarizeCoachEvaluations(evaluations = [], options = {}) {
  const safeEvaluations = (Array.isArray(evaluations) ? evaluations : []).filter(
    Boolean
  );

  const acc = safeEvaluations.reduce(
    (result, evaluation) => {
      const probability = evaluation?.probabilityEvaluation;
      if (probability) {
        result.probabilityPairs.push({
          probability: probability.predictedProbability01,
          observed: probability.observed,
        });
        if (Number.isFinite(probability.brier)) result.briers.push(probability.brier);
        if (Number.isFinite(probability.logLoss)) result.logLosses.push(probability.logLoss);
        if (Number.isFinite(probability.absoluteError)) {
          result.probabilityAbsoluteErrors.push(probability.absoluteError);
        }
      }

      const score = evaluation?.scoreEvaluation;
      if (score) {
        if (Number.isFinite(score.absoluteError)) {
          result.scoreAbsoluteErrors.push(score.absoluteError);
        }
        if (Number.isFinite(score.normalizedError)) {
          result.scoreNormalizedErrors.push(score.normalizedError);
        }
      }

      const topics = evaluation?.topicEvaluation;
      if (topics) {
        if (Number.isFinite(topics.ndcg)) result.ndcgs.push(topics.ndcg);
        if (Number.isFinite(topics.precisionAtK)) result.precisions.push(topics.precisionAtK);
        if (Number.isFinite(topics.recallAtK)) result.recalls.push(topics.recallAtK);
      }

      const uplift = evaluation?.taskUpliftEvaluation?.uplift;
      if (Number.isFinite(uplift)) result.uplifts.push(uplift);

      return result;
    },
    {
      probabilityPairs: [],
      briers: [],
      logLosses: [],
      probabilityAbsoluteErrors: [],
      scoreAbsoluteErrors: [],
      scoreNormalizedErrors: [],
      ndcgs: [],
      precisions: [],
      recalls: [],
      uplifts: [],
    }
  );

  const diagnostics =
    acc.probabilityPairs.length >= 3
      ? computeCalibrationDiagnostics(acc.probabilityPairs, {
          bins: options.bins ?? 6,
        })
      : {
          ece: 0,
          mce: 0,
          reliability: [],
        };

  const avgBrier = meanValues(acc.briers);
  const avgLogLoss = meanValues(acc.logLosses);
  const avgProbabilityAbsoluteError = meanValues(acc.probabilityAbsoluteErrors);
  const mae = meanValues(acc.scoreAbsoluteErrors);
  const meanNormalizedError = meanValues(acc.scoreNormalizedErrors);
  const avgNdcg = meanValues(acc.ndcgs);
  const avgPrecisionAtK = meanValues(acc.precisions);
  const avgRecallAtK = meanValues(acc.recalls);
  const avgUplift = meanValues(acc.uplifts);

  return {
    count: safeEvaluations.length,
    generatedAt: Date.now(),
    probability: {
      count: acc.probabilityPairs.length,
      avgBrier: avgBrier === null ? null : Number(avgBrier.toFixed(6)),
      avgLogLoss: avgLogLoss === null ? null : Number(avgLogLoss.toFixed(6)),
      avgAbsoluteError:
        avgProbabilityAbsoluteError === null
          ? null
          : Number(avgProbabilityAbsoluteError.toFixed(6)),
      ece: diagnostics && Number.isFinite(diagnostics.ece) ? Number(diagnostics.ece.toFixed(6)) : null,
      mce: diagnostics && Number.isFinite(diagnostics.mce) ? Number(diagnostics.mce.toFixed(6)) : null,
      reliability: diagnostics.reliability || [],
    },
    score: {
      count: acc.scoreAbsoluteErrors.length,
      mae: mae === null ? null : Number(mae.toFixed(4)),
      meanNormalizedError:
        meanNormalizedError === null
          ? null
          : Number(meanNormalizedError.toFixed(6)),
    },
    topics: {
      count: acc.ndcgs.length,
      avgNdcg: avgNdcg === null ? null : Number(avgNdcg.toFixed(6)),
      avgPrecisionAtK:
        avgPrecisionAtK === null ? null : Number(avgPrecisionAtK.toFixed(6)),
      avgRecallAtK:
        avgRecallAtK === null ? null : Number(avgRecallAtK.toFixed(6)),
    },
    tasks: {
      count: acc.uplifts.length,
      avgUplift: avgUplift === null ? null : Number(avgUplift.toFixed(4)),
    },
    strategyIds: [
      ...new Set(
        safeEvaluations
          .map((evaluation) => evaluation?.strategyId)
          .filter(Boolean)
      ),
    ],
  };
}

/**
 * Compara dois summaries.
 *
 * FIX: heurística clampada em [-1, 1] (pesos fracionários 0.40/0.25/0.35)
 * para não produzir scores fora da faixa quando os deltas normalizados
 * excedem [-1, 1].
 */
export function compareEvaluationSummaries(baseline = {}, candidate = {}) {
  const baseProbability = baseline?.probability || {};
  const candProbability = candidate?.probability || {};
  const baseScore = baseline?.score || {};
  const candScore = candidate?.score || {};
  const baseTopics = baseline?.topics || {};
  const candTopics = candidate?.topics || {};

  const deltaBrier =
    toFinite(candProbability.avgBrier, 0) - toFinite(baseProbability.avgBrier, 0);
  const deltaLogLoss =
    toFinite(candProbability.avgLogLoss, 0) -
    toFinite(baseProbability.avgLogLoss, 0);
  const deltaEce =
    toFinite(candProbability.ece, 0) - toFinite(baseProbability.ece, 0);
  const deltaMae =
    toFinite(candScore.mae, 0) - toFinite(baseScore.mae, 0);
  const deltaNdcg =
    toFinite(candTopics.avgNdcg, 0) - toFinite(baseTopics.avgNdcg, 0);
  const deltaPrecision =
    toFinite(candTopics.avgPrecisionAtK, 0) -
    toFinite(baseTopics.avgPrecisionAtK, 0);

  const normBrier = deltaBrier / Math.max(0.001, Math.abs(toFinite(baseProbability.avgBrier, 0.2)));
  const normNdcg = deltaNdcg / Math.max(0.001, Math.abs(toFinite(baseTopics.avgNdcg, 0.5)));
  const normEce = deltaEce / Math.max(0.001, Math.abs(toFinite(baseProbability.ece, 0.15)));

  // FIX: clamp [-1, 1]
  const heuristicScore = Math.max(-1, Math.min(1,
    -normBrier * 0.40 +
    -normEce * 0.25 +
    normNdcg * 0.35
  ));

  let winner = 'tie';
  if (heuristicScore > 0.001) {
    winner = 'candidate';
  } else if (heuristicScore < -0.001) {
    winner = 'baseline';
  }

  return {
    baselineCount: baseline?.count ?? 0,
    candidateCount: candidate?.count ?? 0,
    delta: {
      brier: Number(deltaBrier.toFixed(6)),
      logLoss: Number(deltaLogLoss.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
      mae: Number(deltaMae.toFixed(4)),
      ndcg: Number(deltaNdcg.toFixed(6)),
      precisionAtK: Number(deltaPrecision.toFixed(6)),
    },
    heuristicScore: Number(heuristicScore.toFixed(6)),
    winner,
  };
}

/**
 * Constrói dados prontos para dashboard.
 */
export function buildEvaluationDashboardData(summary = {}) {
  if (!summary || typeof summary !== 'object') return null;

  const probability = summary.probability || {};
  const score = summary.score || {};
  const topics = summary.topics || {};
  const tasks = summary.tasks || {};

  return {
    generatedAt: summary.generatedAt || Date.now(),
    count: summary.count || 0,
    cards: [
      {
        id: 'samples',
        label: 'Avaliações',
        value: summary.count || 0,
      },
      {
        id: 'brier',
        label: 'Brier médio',
        value: probability.avgBrier ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ece',
        label: 'ECE',
        value: probability.ece ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'mae',
        label: 'MAE de nota',
        value: score.mae ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ndcg',
        label: 'NDCG de tópicos',
        value: topics.avgNdcg ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'uplift',
        label: 'Uplift de tarefas',
        value: tasks.avgUplift ?? null,
        goodDirection: 'higher',
      },
    ],
    probability: {
      count: probability.count || 0,
      avgBrier: probability.avgBrier ?? null,
      avgLogLoss: probability.avgLogLoss ?? null,
      avgAbsoluteError: probability.avgAbsoluteError ?? null,
      ece: probability.ece ?? null,
      mce: probability.mce ?? null,
      reliability: probability.reliability || [],
    },
    score: {
      count: score.count || 0,
      mae: score.mae ?? null,
      meanNormalizedError: score.meanNormalizedError ?? null,
    },
    topics: {
      count: topics.count || 0,
      avgNdcg: topics.avgNdcg ?? null,
      avgPrecisionAtK: topics.avgPrecisionAtK ?? null,
      avgRecallAtK: topics.avgRecallAtK ?? null,
    },
    tasks: {
      count: tasks.count || 0,
      avgUplift: tasks.avgUplift ?? null,
    },
    strategyIds: summary.strategyIds || [],
  };
}

/**
 * Salva avaliações no localStorage.
 */
export function saveEvaluationResult(result) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];
    const toAdd = Array.isArray(result) ? result : [result];
    const next = [...current, ...toAdd]
      .filter(Boolean)
      .slice(-EVAL_STORAGE_MAX);
    storage.setItem(EVAL_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega avaliações salvas.
 */
export function loadEvaluationResults() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa avaliações salvas.
 */
export function clearEvaluationResults() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(EVAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateProbabilityPrediction,
  evaluateScorePrediction,
  evaluateTopicRanking,
  evaluateTaskUplift,
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
  buildEvaluationDashboardData,
  saveEvaluationResult,
  loadEvaluationResults,
  clearEvaluationResults,
};


```

---

### Arquivo: `src/engine/evaluation/strategyBacktester.js`
*Linhas: 437 | Tamanho: 11.5 KB*

```javascript
/**
 * strategyBacktester.js
 *
 * Lote 8 — Backtest offline de estratégias do Coach.
 *
 * Este módulo compara diferentes configurações de flags usando dados históricos.
 * Ele não altera o Coach em produção.
 */

import {
  calculateUrgency,
  getSuggestedFocus,
  clearUrgencyCache,
  clearMcCache,
} from '../../utils/coachLogic.js';

import { getSafeScore } from '../../utils/scoreHelper.js';
import { normalizeDate } from '../../utils/dateHelper.js';
import { isSubjectMatch } from '../../utils/normalization.js';

import {
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
} from './coachEvaluator.js';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

function filterLogsBefore(studyLogs = [], cutoff = null) {
  const cutoffTime = toTime(cutoff);

  if (!Number.isFinite(cutoffTime)) {
    return safeArray(studyLogs);
  }

  return safeArray(studyLogs).filter((log) => {
    const logTime = toTime(log?.date ?? log?.createdAt);

    if (!Number.isFinite(logTime)) return false;

    return logTime <= cutoffTime;
  });
}

/**
 * Estratégias padrão: baseline vs todos os lotes ativos.
 */
export function getDefaultCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
  ];
}

/**
 * Estratégias granulares para comparar lote por lote.
 */
export function getGranularCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior MC',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
  ];
}

/**
 * Constrói splits temporais para uma categoria.
 */
export function buildCategorySplits(category, simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const targetScore = Number.isFinite(Number(options.targetScore))
    ? Number(options.targetScore)
    : maxScore * 0.8;

  const minTrain = Math.max(3, Math.round(Number(options.minTrain) || 5));
  const horizon = Math.max(1, Math.round(Number(options.horizon) || 1));
  const maxSplits = Math.max(1, Math.round(Number(options.maxSplits) || 8));

  const categoryName = category?.name || '';
  const categoryId = category?.id || categoryName || 'unknown';

  const categorySimulados = safeArray(simulados)
    .filter((simulado) => {
      if (!simulado) return false;
      return isSubjectMatch(simulado.subject || '', categoryName);
    })
    .sort((a, b) => {
      const timeA = toTime(a?.date ?? a?.createdAt);
      const timeB = toTime(b?.date ?? b?.createdAt);

      if (Number.isFinite(timeA) && Number.isFinite(timeB)) {
        return timeA - timeB;
      }

      return 0;
    });

  const splits = [];

  for (let i = minTrain - 1; i < categorySimulados.length - 1; i++) {
    const train = categorySimulados.slice(0, i + 1);
    const future = categorySimulados.slice(i + 1, i + 1 + horizon);

    if (future.length === 0) break;

    const observedScores = future
      .map((simulado) => getSafeScore(simulado, maxScore))
      .filter((score) => Number.isFinite(score));

    if (observedScores.length === 0) continue;

    const observedScore =
      observedScores.reduce((acc, score) => acc + score, 0) /
      observedScores.length;

    const lastTrain = train[train.length - 1];
    const trainLastDate = lastTrain?.date ?? lastTrain?.createdAt ?? null;

    splits.push({
      categoryId,
      categoryName,
      train,
      future,
      trainLastDate,
      observedScore,
      observedSuccess: observedScore >= targetScore,
    });

    if (splits.length >= maxSplits) break;
  }

  return splits;
}

/**
 * Executa backtest de estratégias do Coach.
 */
export function runCoachStrategyBacktest(config = {}) {
  const categories = safeArray(config.categories);
  const simulados = safeArray(config.simulados);
  const studyLogs = safeArray(config.studyLogs);

  const maxScore = Number(config.maxScore) > 0 ? Number(config.maxScore) : 100;

  const targetScore = Number.isFinite(Number(config.targetScore))
    ? Number(config.targetScore)
    : maxScore * 0.8;

  const strategies =
    Array.isArray(config.strategies) && config.strategies.length > 0
      ? config.strategies
      : getDefaultCoachStrategies();

  const minTrain = Math.max(3, Math.round(Number(config.minTrain) || 5));
  const horizon = Math.max(1, Math.round(Number(config.horizon) || 1));
  const maxSplits = Math.max(1, Math.round(Number(config.maxSplits) || 6));

  const includeTopics = config.includeTopics === true;
  const clearCaches = config.clearCaches !== false;

  const rawByStrategy = {};

  strategies.forEach((strategy) => {
    rawByStrategy[strategy.id] = [];
  });

  categories.forEach((category) => {
    const splits = buildCategorySplits(category, simulados, {
      maxScore,
      targetScore,
      minTrain,
      horizon,
      maxSplits,
    });

    splits.forEach((split) => {
      const logsBefore = filterLogsBefore(studyLogs, split.trainLastDate);

      strategies.forEach((strategy) => {
        if (clearCaches) {
          try {
            clearUrgencyCache();
            clearMcCache();
          } catch {
            // ignore
          }
        }

        try {
          const runOptions = {
            ...(config.options || {}),
            maxScore,
            targetScore,
            now: split.trainLastDate,
            features: {
              ...(config.baseFeatures || {}),
              ...(strategy.features || {}),
            },
            allCategories: categories,
          };

          let urgency = null;
          let weakTopics = [];

          if (includeTopics) {
            const focus = getSuggestedFocus(
              [category],
              split.train,
              logsBefore,
              runOptions
            );

            urgency = focus?.urgency || null;
            weakTopics = focus?.weakestTopic ? [focus.weakestTopic] : [];
          } else {
            urgency = calculateUrgency(
              category,
              split.train,
              logsBefore,
              runOptions
            );
          }

          const snapshot = {
            strategyId: strategy.id,
            categoryId: split.categoryId,
            categoryName: split.categoryName,
            timestamp: toTime(split.trainLastDate) || Date.now(),
            normalizedScore: urgency?.normalizedScore ?? null,
            probability:
              urgency?.details?.monteCarlo?.probability ??
              null,
            predictedMean:
              urgency?.details?.monteCarlo?.meanProjected ??
              urgency?.details?.averageScore ??
              null,
            weakTopics,
          };

          const outcomeTopics =
            typeof config.getOutcomeTopics === 'function'
              ? config.getOutcomeTopics(split, category, strategy)
              : [];

          const outcome = {
            score: split.observedScore,
            success: split.observedSuccess,
            relevantTopics: Array.isArray(outcomeTopics) ? outcomeTopics : [],
          };

          const evaluation = evaluateCoachSnapshot(snapshot, outcome, {
            maxScore,
            targetScore,
            k: config.topicK ?? 5,
            evaluateTopics: includeTopics,
          });

          rawByStrategy[strategy.id].push(evaluation);
        } catch (err) {
          console.warn(
            `[StrategyBacktester] Failed strategy ${strategy.id}:`,
            err
          );
        }
      });
    });
  });

  const summaries = {};

  Object.entries(rawByStrategy).forEach(([strategyId, evaluations]) => {
    summaries[strategyId] = summarizeCoachEvaluations(evaluations, {
      bins: config.calibrationBins ?? 6,
    });
  });

  const comparisons = {};

  if (summaries.baseline) {
    Object.keys(summaries).forEach((strategyId) => {
      if (strategyId === 'baseline') return;

      comparisons[`${strategyId}_vs_baseline`] = compareEvaluationSummaries(
        summaries.baseline,
        summaries[strategyId]
      );
    });
  }

  return {
    generatedAt: Date.now(),
    config: {
      maxScore,
      targetScore,
      minTrain,
      horizon,
      maxSplits,
      includeTopics,
      clearCaches,
      strategyIds: strategies.map((strategy) => strategy.id),
    },
    summaries,
    comparisons,
    raw: rawByStrategy,
  };
}

export default {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  buildCategorySplits,
  runCoachStrategyBacktest,
};


```

---

### Arquivo: `src/engine/heatmap.worker.js`
*Linhas: 16 | Tamanho: 0.5 KB*

```javascript
import { aggregateHeatmap } from '../utils/heatmapAggregation.js';

self.onmessage = (e) => {
    try {
        const { id, payload } = e.data;
        const { filtered, granularity, targetScore } = payload;
        
        const result = aggregateHeatmap(filtered, granularity, targetScore);
        
        self.postMessage({ id, type: 'success', result });
    } catch (err) {
        self.postMessage({ id: e.data?.id, type: 'error', error: err.message });
    }
};


```

---

### Arquivo: `src/engine/index.js`
*Linhas: 18 | Tamanho: 0.4 KB*

```javascript
/**
 * Monte Carlo Engine - Unified Export
 */

export * from './stats.js';
export * from './projection.js';
export * from './variance.js';
export * from './random.js';
export * from './monteCarlo.js';
export * from './diagnostics.js';
export * from './math/gaussian.js';

// BUG-M4: Centralized export
export { getSafeScore } from '../utils/scoreHelper.js';

export * from './math/bootstrap.js';


```

---

### Arquivo: `src/engine/insightGenerator.js`
*Linhas: 347 | Tamanho: 17.9 KB*

```javascript
import { normalizeDate, toDateMs } from "../utils/dateHelper.js";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper.js";
import { pointsToRatio } from "../utils/scoreHelper.conversions.js";

const toHistoryArray = (history) => {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
};

const safeFinite = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const sortByValidDate = (history) => {
    return toHistoryArray(history)
        .filter(h => {
            const raw = h?.date || h?.createdAt;
            return raw && Number.isFinite(normalizeDate(raw)?.getTime());
        })
        .sort((a, b) => {
            const ta = normalizeDate(a?.date || a?.createdAt)?.getTime() ?? 0;
            const tb = normalizeDate(b?.date || b?.createdAt)?.getTime() ?? 0;
            return ta - tb;
        });
};

export function generateEvolutionInsights({
    timeline,
    focusCategory,
    activeEngine,
    categories,
    unit = '%',
    maxScore = 100,
    minScore = 0
}) {
    const defaultTitle = "Análise do Sistema";

    if (!timeline?.length) {
        return {
            type: 'info', icon: "📊", title: defaultTitle,
            text: "Ainda não existem dados suficientes.",
            details: "Continue realizando simulados para desbloquear insights avançados."
        };
    }

    if (!focusCategory) {
        switch (activeEngine) {
            case "raw_weekly":
                return { type: 'info', icon: "📅", title: "Visão Global: Mapa de Calor", text: "Análise da sua frequência e eficiência geral.", details: "Selecione uma disciplina acima para uma análise profunda." };
            case "raw":
                return { type: 'info', icon: "📊", title: "Visão Global: Resultados Brutos", text: "Visão geral da sua volatilidade diária.", details: "Selecione uma disciplina acima para analisar a estabilidade." };
            case "bayesian":
                return { type: 'info', icon: "🧠", title: "Visão Global: Nível Bayesiano", text: "Domínio probabilístico estimado de todas as matérias.", details: "Selecione uma disciplina acima para ver o intervalo de confiança." };
            case "stats":
                return { type: 'info', icon: "📐", title: "Visão Global: Média Histórica", text: "Desempenho acumulado em todas as frentes.", details: "Selecione uma disciplina acima para ver a média específica." };
            case "compare":
                return { type: 'info', icon: "⚡", title: "Visão Global: Projeção Monte Carlo", text: "Visão probabilística global do seu futuro.", details: "Selecione uma disciplina acima para descobrir o que está segurando sua nota." };
            case "subtopics":
                return { type: 'info', icon: "🔬", title: "Visão Global: Auditoria de Assuntos", text: "Mapeamento completo de todos os seus subtópicos.", details: "Selecione uma disciplina acima para auditar pontos fracos." };
            case "mc_density":
                return { type: 'info', icon: "🚀", title: "Visão Global: Rastreador de Aprovação", text: "Acompanhamento global das suas projeções de sucesso.", details: "Selecione uma disciplina acima para ver como ela afeta a sua aprovação." };
            case "time_spent":
                return { type: 'info', icon: "⏳", title: "Visão Global: Agilidade AI", text: "Visão geral da sua velocidade de resolução.", details: "Selecione uma disciplina acima para mapear gargalos de tempo específicos." };
            case "weekly_diff":
                return { type: 'info', icon: "📆", title: "Visão Global: Acelerômetro Semanal", text: "Balanço geral de ganhos e perdas na semana.", details: "Selecione uma disciplina acima para focar no esforço semanal." };
            case "today_vs_general":
                return { type: 'info', icon: "⚖️", title: "Visão Global: Hoje vs Geral", text: "Comparativo do seu dia contra a média histórica geral.", details: "Selecione uma disciplina acima para um comparativo específico." };
            default:
                return {
                    type: 'info', icon: "📊", title: "Visão Global",
                    text: "Selecione uma disciplina acima para insights detalhados.",
                    details: "A inteligência artificial analisa cada disciplina individualmente para gerar conselhos."
                };
        }
    }

    const lastPoint = timeline[timeline.length - 1];
    const getLastValid = (key) => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            if (timeline[i][key] != null) return timeline[i][key];
        }
        return null;
    };

    const raw = getLastValid(`raw_${focusCategory.id}`);
    const bayesian = getLastValid(`bay_${focusCategory.id}`);
    // ✅ BUG-4 FIX: Não reatribuir o parâmetro; criar variável local sanitizada
    const safeMaxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const safeMinScore = safeFinite(minScore, 0);
    // ✅ BUG-4 FIX: scale usa a amplitude real (maxScore - minScore) em vez de maxScore sozinho
    const scale = Math.max(0.01, (safeMaxScore - safeMinScore) / 100);

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const DAY_NAMES_PLURAL = ['domingos', 'segundas-feiras', 'terças-feiras', 'quartas-feiras', 'quintas-feiras', 'sextas-feiras', 'sábados'];
        const dayStats = {};
        const now = new Date();
        
        const safeCategories = Array.isArray(categories)
            ? categories.filter(Boolean)
            : Object.values(categories || {}).filter(Boolean);

        safeCategories.forEach(cat => {
            const history = toHistoryArray(cat.simuladoStats?.history);

            const rawHistory = history
                .filter(h => {
                    const d = normalizeDate(h?.date || h?.createdAt);
                    return d && Number.isFinite(d.getTime()) && d.getTime() <= now.getTime();
                })
                .map(h => ({ ...h, score: getSafeScore(h, safeMaxScore, safeMinScore) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const d = normalizeDate(h?.date || h?.createdAt);
                if (!d || !Number.isFinite(d.getTime())) return;

                const dow = d.getDay();
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };

                let tot = Number(h.total);
                if (!Number.isFinite(tot) || tot <= 0) {
                    tot = getSyntheticTotal(safeMaxScore);
                }

                if (!Number.isFinite(tot) || tot <= 0) return;

                dayStats[dow].correct += (pointsToRatio(h.score, safeMaxScore, safeMinScore) * tot);
                dayStats[dow].total += tot;
            });
        });

        const dayEntries = Object.entries(dayStats)
            .filter(([, s]) => s.total >= 5)
            .map(([dow, s]) => ({ dow: Number(dow), pct: (s.correct / s.total) * 100, total: s.total }))
            .sort((a, b) => b.pct - a.pct);

        if (dayEntries.length >= 2) {
            const best = dayEntries[0];
            const worst = dayEntries[dayEntries.length - 1];
            return {
                type: 'success', icon: "📅", title: "Padrão Semanal de Rendimento",
                text: `Seu rendimento de pico costuma ser: ${DAY_NAMES_SINGULAR[best.dow]}.`,
                details: `++Melhor dia: ${DAY_NAMES_SINGULAR[best.dow]} (${best.pct.toFixed(1)}%, ${best.total}q).++ !!Pior: ${DAY_NAMES_SINGULAR[worst.dow]} (${worst.pct.toFixed(1)}%).!!`,
                advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho ++acima da meta++, !!vermelhas!! indicam necessidade de atenção."
        };
    }

    // Lógica de Alertas de Burnout de Alta Prioridade
    const safeRaw = safeFinite(raw, NaN);
    const safeBayesianFallback = safeFinite(bayesian, NaN);

    if (Number.isFinite(safeRaw) && Number.isFinite(safeBayesianFallback)) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const history = toHistoryArray(focusCategory.simuladoStats?.history);

        const recentVolumeAlert = history
            .filter(h => {
                const d = toDateMs(h?.date || h?.createdAt);
                return Number.isFinite(d) && (nowMs - d) >= -86400000 && (nowMs - d) <= sevenDaysMs;
            })
            .reduce((sum, h) => {
                const parsedTotal = parseInt(h?.total, 10);
                const fallbackTotal = h?.score != null ? getSyntheticTotal(maxScore) : 0;
                const safeTotal = Number.isFinite(parsedTotal) && parsedTotal > 0
                    ? parsedTotal
                    : fallbackTotal;

                return sum + Math.max(0, safeFinite(safeTotal, 0));
            }, 0);

        if (recentVolumeAlert > 40 && safeRaw < safeBayesianFallback - 10 * scale) {
            return {
                type: 'danger',
                icon: "🚨",
                title: "!!Alerta de Burnout!!",
                text: `Volume alto (${recentVolumeAlert}q em 7 dias), com nota em !!queda!!.`,
                details: `Nota recente (${safeRaw.toFixed(1)}${unit}) está abaixo do seu nível bayesiano (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "Dê um passo atrás, reduza o volume de simulados e recupere o foco."
            };
        }

        if (safeRaw > safeBayesianFallback + 8 * scale) {
            return {
                type: 'success',
                icon: "💡",
                title: "++Conhecimento Consolidado++",
                text: `Desempenho recente (${safeRaw.toFixed(1)}${unit}) ++muito acima da média++.`,
                details: `Superando o nível bayesiano projetado (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "O conhecimento assentou de vez. Pronto para aumentar a dificuldade."
            };
        }
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const history = sortByValidDate(focusCategory.simuladoStats?.history);
        const scores = history.map(h => getSafeScore(h, safeMaxScore, safeMinScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        
        // CORREÇÃO M4: Guarda contra array vazio (Math.max(...[]) = -Infinity → crash)
        if (recentScores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };
        
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);

        if (maxSwing > 25 * scale) return { type: 'warning', icon: "⚠️", title: "!!Alta Volatilidade Detectada!!", text: `!!Variação de ${maxSwing.toFixed(0)}${unit}.!!`, advice: "Oscilações altas indicam !!'chute'!! ou !!gaps de base!!." };
        if (maxSwing < 8 * scale) return { type: 'success', icon: "✅", title: "++Consistência Sólida++", text: `++Variação mínima de ${maxSwing.toFixed(0)}${unit}.++`, advice: "Pronto para subir a dificuldade." };
        
        return { type: 'info', icon: "📊", title: "Desempenho Estável", text: `Oscilação de ${maxSwing.toFixed(0)}${unit}.` };
    }

    // Lógica do Motor Bayesiano
    if (activeEngine === "bayesian") {
        const safeBayesian = safeFinite(bayesian, NaN);
        if (!Number.isFinite(safeBayesian)) {
            return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
        }

        const ciLow = safeFinite(lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? Math.abs(ciHigh - ciLow) : null;

        if (ciWidth != null && ciWidth < 5 * scale) return { type: 'success', icon: "🎯", title: "++Alta Precisão Bayesiana++", text: `Seu nível real é ${safeBayesian.toFixed(1)}${unit}.`, advice: "++Convergência máxima++ do algoritmo." };
        if (ciWidth != null && ciWidth > 20 * scale) return { type: 'warning', icon: "🧠", title: "!!Incerteza Elevada!!", text: `Nível estimado: ${safeBayesian.toFixed(1)}${unit}.`, advice: "Faça mais simulados para estreitar a estimativa." };
        
        return { type: 'info', icon: "🧠", title: "Estimativa Bayesiana", text: `Nível Real: ${safeBayesian.toFixed(1)}${unit}.` };
    }

    // Lógica da Média Histórica (Stats)
    if (activeEngine === "stats") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        if (!Number.isFinite(statsVal)) {
            return { type: 'info', icon: "📐", title: "Média Histórica", text: "Aguardando mais dados..." };
        }

        return {
            type: 'info',
            icon: "📐",
            title: "Média Histórica Global",
            text: `Sua média histórica acumulada é ${statsVal.toFixed(1)}${unit}.`,
            advice: "Lembre-se que a média demora a refletir seu conhecimento recente."
        };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        const bayVal = safeFinite(bayesian, null);
        const textMsg = bayVal != null 
            ? `Nível Bayesiano: ${bayVal.toFixed(1)}${unit} com projeção estatística ativa.` 
            : "Visualizando simulações estatísticas futuras.";
        return { 
            type: 'info', 
            icon: "⚡", 
            title: "Projeção Monte Carlo & Raio-X", 
            text: textMsg, 
            details: "O cone roxo projeta sua faixa provável de aprovação até a data do exame.",
            advice: "Use esta projeção para saber se sua curva está no rumo da aprovação." 
        };
    }

    // Lógica Raio-X de Assuntos (Subtopics)
    if (activeEngine === "subtopics") {
        return { 
            type: 'info', 
            icon: "🔬", 
            title: "Auditoria de Assuntos", 
            text: `Navegando nos subtópicos de ${focusCategory.name}.`, 
            details: "Identifique exatamente quais tópicos concentram a maior perda de pontos.",
            advice: "Ataque os !!blocos vermelhos!! para subir seu percentual rapidamente." 
        };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        const ciLow = safeFinite(lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? (ciHigh - ciLow) : null;
        return { 
            type: 'info', 
            icon: "🚀", 
            title: "Rastreador de Aprovação", 
            text: ciWidth != null ? `Incerteza na sua aprovação: ±${(ciWidth / 2).toFixed(1)}${unit}.` : "Histórico das suas chances reais de aprovação.", 
            details: "Mede o quanto cada simulado aproxima ou afasta você da sua nota de corte.",
            advice: "Se a linha estiver ++subindo++, sua rotina de estudos está funcionando. Mantenha!" 
        };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        return { 
            type: 'info', 
            icon: "📆", 
            title: "Acelerômetro Semanal", 
            text: `Tração do estudo em ${focusCategory.name}.`, 
            details: "Compara os ganhos e perdas percentuais semana a semana.",
            advice: "Monitore semanas !!negativas!! para evitar a !!curva do esquecimento!!." 
        };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        const diff = (Number.isFinite(safeRaw) && Number.isFinite(statsVal)) ? (safeRaw - statsVal) : null;
        const diffText = diff != null 
            ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${unit} vs média histórica.` 
            : "Seu foco de hoje contra sua média.";
        return { 
            type: diff != null && diff >= 0 ? 'success' : 'info', 
            icon: "⚖️", 
            title: "Desempenho Diário", 
            text: diffText, 
            details: `Último simulado: ${Number.isFinite(safeRaw) ? safeRaw.toFixed(1) + unit : '—'}.`,
            advice: "Use o ritmo de hoje para calibrar o volume das próximas sessões." 
        };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        return { 
            type: 'info', 
            icon: "⏳", 
            title: "Velocidade de Resolução", 
            text: `Mapeando velocidade média em ${focusCategory.name}.`, 
            details: "Compara o tempo gasto por questão contra seu histórico geral.",
            advice: "Cuidado com matérias !!lentas!!, elas roubam preciosos minutos da prova." 
        };
    }

    return { type: 'info', icon: "✅", title: "++Rendimento de Mestre++", text: `Operando na zona de ++máxima eficiência++.`, advice: "Mantenha o ritmo." };
}


```

---

### Arquivo: `src/engine/math/bootstrap.js`
*Linhas: 117 | Tamanho: 3.5 KB*

```javascript
import { kahanSum } from './kahan.js';

/**
 * Percentile bootstrap CI for robust uncertainty estimation.
 * Útil quando suposições de normalidade são fracas.
 *
 * CORREÇÃO: bootstrap não-paramétrico puro.
 * O smoothed bootstrap (ruído gaussiano para N < 5) foi removido
 * porque inflava artificialmente o intervalo de confiança.
 */
export function bootstrapCI(samples, statFn, {
  iterations = 1000,
  alpha = 0.05,
  seed = 42,
} = {}) {
  const clean = (samples || []).map(Number).filter(Number.isFinite);
  if (clean.length === 0) return { estimate: 0, low: 0, high: 0, n: 0 };

  const fn = typeof statFn === 'function'
    ? statFn
    : (values) => kahanSum(values) / values.length;

  const estimateRaw = Number(fn(clean));
  const estimate = estimateRaw;
  const n = clean.length;
  const iters = Math.max(500, Math.floor(Number(iterations) || 1000));
  const safeAlpha = Math.max(0.001, Math.min(0.5, Number(alpha) || 0.05));
  const qLow = safeAlpha / 2;
  const qHigh = 1 - qLow;

  // Caso degenerado: 1 observação → IC colapsa no ponto
  if (n === 1) {
    return { estimate, low: estimate, high: estimate, n, iterations: 0, method: 'degenerate' };
  }

  // PRNG determinístico (LCG)
  let state = (Number(seed) >>> 0) || 42;
  const rand = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };

  // ✅ Bootstrap percentílico puro — sem ruído artificial
  const dist = new Array(iters);
  for (let i = 0; i < iters; i++) {
    const bag = new Array(n);
    for (let j = 0; j < n; j++) {
      bag[j] = clean[Math.min(n - 1, Math.floor(rand() * n))];
    }
    const value = Number(fn(bag));
    dist[i] = Number.isFinite(value) ? value : estimate;
  }

  dist.sort((a, b) => a - b);

  const quantile = (p) => {
    const idx = (dist.length - 1) * Math.max(0, Math.min(1, p));
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return dist[lo];
    const w = idx - lo;
    return dist[lo] * (1 - w) + dist[hi] * w;
  };

  return {
    estimate,
    low: quantile(qLow),
    high: quantile(qHigh),
    n,
    iterations: iters,
    alpha: safeAlpha,
    method: 'percentile_bootstrap',
  };
}

/**
 * Split-conformal prediction interval.
 *
 * CORREÇÃO: usa resíduos ABSOLUTOS |y - ŷ|, não resíduos com sinal.
 * O quantil conformal é o ceil((n+1)(1-α))-ésimo menor resíduo absoluto.
 */
export function conformalPredictionInterval(residuals = [], alpha = 0.05, pointEstimate = 0) {
  const clean = residuals.map(Number).filter(Number.isFinite);
  const p = Number.isFinite(Number(pointEstimate)) ? Number(pointEstimate) : 0;
  const a = Math.max(0.001, Math.min(0.5, Number(alpha) || 0.05));

  if (clean.length < 3) {
    const fallbackMargin = Math.max(1, Math.abs(p) * 0.08 || 8);
    return {
      lower: p - fallbackMargin,
      upper: p + fallbackMargin,
      coverage: 1 - a,
      n: clean.length,
      method: 'fallback_insufficient_data',
    };
  }

  // ✅ Resíduos absolutos ordenados
  const absResiduals = clean.map(Math.abs).sort((x, y) => x - y);
  const n = absResiduals.length;

  // Rank conformal: ceil((n+1)(1-α)) - 1, limitado a [0, n-1]
  const rank = Math.min(n - 1, Math.max(0, Math.ceil((n + 1) * (1 - a)) - 1));
  const q = absResiduals[rank];

  return {
    lower: p - q,
    upper: p + q,
    conformalQuantile: Number(q.toFixed(6)),
    n,
    alpha: a,
    coverage: 1 - a,
    method: 'split_conformal_absolute_residual',
  };
}


```

---

### Arquivo: `src/engine/math/constants.js`
*Linhas: 14 | Tamanho: 0.4 KB*

```javascript
/**
 * Monte Carlo Engine - Math Constants
 * 
 * Centralized statistical constants to avoid duplication and circular dependencies.
 */

// Z-Score for 95% Confidence Interval (two-tailed)
// P(-1.96 <= Z <= 1.96) ≈ 0.95
export const Z_95 = 1.959963984540054;

// Minimal Standard Deviation to avoid division by zero in calculations
export const MIN_SD_FLOOR = 0.0001;


```

---

### Arquivo: `src/engine/math/date.js`
*Linhas: 90 | Tamanho: 1.8 KB*

```javascript
export const safeDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const getLocalMidnight = (date = new Date()) => {
  const d = safeDate(date) || new Date();

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0,
    0,
    0,
    0
  );
};

export const getLocalEndOfDay = (date = new Date()) => {
  const d = safeDate(date) || new Date();

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  );
};

export const isSameLocalDay = (a, b) => {
  const da = safeDate(a);
  const db = safeDate(b);

  if (!da || !db) return false;

  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

export const daysBetween = (a, b) => {
  const da = safeDate(a);
  const db = safeDate(b);

  if (!da || !db) return NaN;

  const ms = db.getTime() - da.getTime();

  return ms / 86400000;
};

export const ageInDays = (date, reference = new Date()) => {
  const d = safeDate(date);
  const ref = safeDate(reference);

  if (!d || !ref) return 0;

  const days = (ref.getTime() - d.getTime()) / 86400000;

  return Number.isFinite(days) && days > 0 ? days : 0;
};

export const ageInHours = (date, reference = new Date()) => {
  const d = safeDate(date);
  const ref = safeDate(reference);

  if (!d || !ref) return 0;

  const hours = (ref.getTime() - d.getTime()) / 3600000;

  return Number.isFinite(hours) && hours > 0 ? hours : 0;
};


```

---

### Arquivo: `src/engine/math/gaussian.js`
*Linhas: 505 | Tamanho: 18.2 KB*

```javascript
// src/engine/math/gaussian.js
import { getPercentile } from './percentile.js';
import { MIN_SD_FLOOR } from './constants.js';

/**
 * Abramowitz & Stegun approximation (formula 7.1.26) for Normal(0,1) CDF
 * Returns 1 - P(X <= z)
 */
export function normalCDF_complement(z) {
    if (z === Number.POSITIVE_INFINITY) return 0;
    if (z === Number.NEGATIVE_INFINITY) return 1;
    if (Number.isNaN(z)) return 0.5;
    if (z > 8) return 0;
    if (z < -8) return 1;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? p : 1 - p;
}

/**
 * Standard Normal PDF: φ(z) = (1/√(2π)) · exp(-z²/2)
 */
export function normalPDF(z) {
    if (!Number.isFinite(z)) return 0;
    return 0.3989422804014327 * Math.exp(-0.5 * z * z);
}

/**
 * Média Exata da Normal Truncada em [a, b] com parâmetros (μ, σ).
 */
export function truncatedNormalMean(mean, sd, a, b) {
    if (!Number.isFinite(sd) || sd <= 1e-10) return Math.max(a, Math.min(b, mean));
    
    const alpha = (a - mean) / sd;
    const beta = (b - mean) / sd;
    
    let denominator;
    let phiAlpha;

    if (alpha > 0 && beta > 0) {
        // Evita cancelamento catastrófico na cauda direita usando a Função de Sobrevivência (S)
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        denominator = sAlpha - sBeta;
        phiAlpha = 1 - sAlpha;
    } else if (alpha < 0 && beta < 0) {
        // Evita cancelamento catastrófico na cauda esquerda usando simetria: Φ(z) = S(-z)
        const sNegBeta = normalCDF_complement(-beta);
        const sNegAlpha = normalCDF_complement(-alpha);
        denominator = sNegBeta - sNegAlpha;
        phiAlpha = sNegAlpha;
    } else {
        phiAlpha = 1 - normalCDF_complement(alpha);
        const phiBeta = 1 - normalCDF_complement(beta);
        denominator = phiBeta - phiAlpha;
    }
    
    if (denominator < 1e-15) return Math.max(a, Math.min(b, mean));
    
    const pdfAlpha = normalPDF(alpha);
    const pdfBeta = normalPDF(beta);
    
    const truncMean = mean + sd * (pdfAlpha - pdfBeta) / denominator;
    return Math.max(a, Math.min(b, truncMean));
}
// ✅ LOTE-04 FIX: `let` para permitir reset real (o worker chama a cada mensagem)
let rngCache = new WeakMap();

export const generateGaussian = (rng = Math.random) => {
    if (typeof rng !== 'function') rng = Math.random;
    if (rngCache.has(rng)) {
        const result = rngCache.get(rng);
        rngCache.delete(rng);
        return result;
    }

    let u1 = 0, u2 = 0;
    let attempts = 0;
    
    while (u1 === 0 && attempts < 100) {
        u1 = rng(); 
        attempts++;
    }
    if (u1 === 0) u1 = 1e-15;
    
    let attemptsU2 = 0;
    while (u2 === 0 && attemptsU2 < 100) {
        u2 = rng();
        attemptsU2++;
    }
    if (u2 === 0) u2 = 1e-15;
    
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);
    
    rngCache.set(rng, z1);
    return z0;
};

// ✅ LOTE-04 FIX: antes era no-op. Agora descarta sobras de Box-Muller
// (2º valor cacheado) entre execuções do worker, garantindo isolamento.
export function resetGaussianCache() {
    rngCache = new WeakMap();
}

export function asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor = 1) {
    const rawSd = x < mean ? sdLeft : sdRight;
    const currentSd = Math.max(1e-6, rawSd);
    // Removemos o normFactor do cálculo final para normalizar o pico visual (Peak = heightFactor),
    // de forma idêntica à normalização (invMaxY) feita pelo gerador KDE, evitando achatamento total.
    return heightFactor * Math.exp(-0.5 * Math.pow((x - mean) / currentSd, 2));
}

export function generateGaussianPoints(xMin, xMax, steps, mean, sdLeft, sdRight, heightFactor, xp, yp) {
    const points = [];
    const safeXp = typeof xp === 'function' ? xp : (v) => v;
    const safeYp = typeof yp === 'function' ? yp : (v) => v;
    const safeSteps = Number.isFinite(steps) ? Math.max(1, Math.floor(steps)) : 1;
    const stepSize = (xMax - xMin) / safeSteps;

    for (let i = 0; i <= safeSteps; i++) {
        const x = xMin + stepSize * i;
        const y = asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor);
        points.push({ x, y });
    }

    if (mean >= xMin && mean <= xMax) {
        points.push({ x: mean, y: asymmetricGaussian(mean, mean, sdLeft, sdRight, heightFactor) });
    }

    return points
        .sort((a, b) => a.x - b.x)
        .map(p => ({ x: safeXp(p.x), y: safeYp(p.y) }));
}

export function generateKDE(allScores, projectedMean, projectedSD, safeSimulations, minScore = 0, maxScore = 100) {
    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || minScore >= maxScore) {
        return [];
    }
    if (!allScores || allScores.length === 0) return [];

    const safeMean = Number.isFinite(projectedMean) ? projectedMean : (maxScore / 2);
    const safeSD = (Number.isFinite(projectedSD) && projectedSD > 0) ? projectedSD : (maxScore * 0.1);

    const slack = Math.max(maxScore * 0.05, safeSD * 0.5, 1.0);
    let plotMin = Math.max(minScore - slack, safeMean - 3.5 * safeSD);
    let plotMax = Math.min(maxScore + slack, safeMean + 3.5 * safeSD);

    const vMin = minScore - slack;
    const vMax = maxScore + slack;

    if (plotMax - plotMin < 1) {
        plotMin = Math.max(vMin, safeMean - 0.5);
        plotMax = Math.min(vMax, safeMean + 0.5);

        if (plotMax >= maxScore && maxScore - minScore >= 1) plotMin = Math.max(vMin, plotMax - 1);
        if (plotMin <= minScore && maxScore - minScore >= 1) plotMax = Math.min(vMax, plotMin + 1);
    }

    const plotSteps = 200; 
    const stepSize = (plotMax - plotMin) / plotSteps;

    const safeSimCount = Number.isFinite(safeSimulations) && safeSimulations > 0
        ? safeSimulations
        : Math.max(1, allScores.length);
    const iqr = getPercentile(allScores, 0.75, true) - getPercentile(allScores, 0.25, true);
    const scottFactor = iqr > 0 ? Math.min(safeSD, iqr / 1.34) : safeSD;
    const h = 0.9 * scottFactor * Math.pow(safeSimCount, -0.2);

    const BIN_COUNT = 300;
    const binWidth = (plotMax - plotMin) / BIN_COUNT;

    const finiteH = Number.isFinite(h) && h > 0 ? h : 0;
    
    const minPhysicalBandwidth = Math.max(1e-9, (plotMax - plotMin) * 0.015); 
    
    const bandwidth = Math.max(minPhysicalBandwidth, finiteH, binWidth * 2, safeSD * 0.15);
    const bins = new Float32Array(BIN_COUNT);

    for (let i = 0; i < allScores.length; i++) {
        let s = Math.max(minScore, Math.min(maxScore, allScores[i]));
        if (s > plotMax || s < plotMin) continue;
        const idx = Math.min(BIN_COUNT - 1, Math.floor((s - plotMin) / binWidth));
        bins[idx]++;
    }

    const invBandwidth = 1 / bandwidth;

    const normFactor = 1 / (Math.max(1, safeSimCount) * Math.max(1e-10, bandwidth) * 2.506628274631);

    const xOut = new Float64Array(plotSteps + 1);
    const densityOut = new Float64Array(plotSteps + 1);
    let maxY = 0;

    for (let i = 0; i <= plotSteps; i++) {
        const x = plotMin + i * stepSize;
        let density = 0;
        if (x < minScore || x > maxScore) {
            density = 0;
        } else {
            for (let j = 0; j < BIN_COUNT; j++) {
                if (bins[j] === 0) continue;
                const binX = plotMin + (j + 0.5) * binWidth;

                const dist = (x - binX) * invBandwidth;
                const distReflMin = (x - (2 * minScore - binX)) * invBandwidth;
                const distReflMax = (x - (2 * maxScore - binX)) * invBandwidth;

                if (Math.abs(dist) < 4.0 || Math.abs(distReflMin) < 4.0 || Math.abs(distReflMax) < 4.0) {
                    let localDensity = Math.exp(-0.5 * dist * dist);
                    localDensity += Math.exp(-0.5 * distReflMin * distReflMin);
                    localDensity += Math.exp(-0.5 * distReflMax * distReflMax);
                    density += bins[j] * localDensity;
                }
            }
            density *= normFactor;
        }

        if (density > maxY) maxY = density;
        xOut[i] = x;
        densityOut[i] = density;
    }

    let totalArea = 0;
    let kahanC = 0;
    for (let i = 1; i <= plotSteps; i++) {
        const area = (densityOut[i] + densityOut[i-1]) * stepSize * 0.5;
        const y = area - kahanC;
        const t = totalArea + y;
        kahanC = (t - totalArea) - y;
        totalArea = t;
    }
        
    const normFactor2 = totalArea > 1e-15 ? 1 / totalArea : 1;
    const invMaxY = maxY > 1e-15 ? 1 / maxY : 0;

    const finalPlot = new Array(plotSteps + 1);
    for (let i = 0; i <= plotSteps; i++) {
        const den = Math.max(0, densityOut[i]);
        finalPlot[i] = {
            x: Number(xOut[i].toFixed(2)),
            y: Number((den * invMaxY).toFixed(4)), 
            density: den * normFactor2
        };
    }
    
    return finalPlot;
}

export function inverseNormalCDF(p) {
    if (p <= 0) return -8; 
    if (p >= 1) return 8;  

    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
        0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
        0.0000321767881768, 0.0000002888167364, 3.960315187e-7]; // Wichura coefficient fix

    let x = p - 0.5;
    if (Math.abs(x) < 0.42) {
        let r = x * x;
        return x * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) /
            ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1.0);
    } else {
        let r = p;
        if (x > 0) r = 1.0 - p;
        r = Math.log(-Math.log(r));
        let z = c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * (c[5] + r * (c[6] + r * (c[7] + r * c[8])))))));
        return x < 0 ? -z : z;
    }
}

export function sampleTruncatedNormal(mean, sd, min, max, rng, options) {
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || !Number.isFinite(min) || !Number.isFinite(max)) {
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : lo;
        return Math.max(lo, Math.min(hi, (lo + hi) / 2));
    }

    if (min > max) {
        const temp = min;
        min = max;
        max = temp;
    }

    if (sd <= MIN_SD_FLOOR) return Math.max(min, Math.min(max, mean));

    const alpha = (min - mean) / sd;
    const beta = (max - mean) / sd;
    let diff;
    let cdfMin;

    if (alpha > 0 && beta > 0) {
        // Evita cancelamento catastrófico na cauda direita usando a Função de Sobrevivência (S)
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        diff = sAlpha - sBeta;
        cdfMin = 1 - sAlpha;
    } else if (alpha < 0 && beta < 0) {
        // Evita cancelamento catastrófico na cauda esquerda usando simetria: Φ(z) = S(-z)
        const sNegBeta = normalCDF_complement(-beta);
        const sNegAlpha = normalCDF_complement(-alpha);
        diff = sNegBeta - sNegAlpha;
        cdfMin = sNegAlpha;
    } else {
        cdfMin = 1 - normalCDF_complement(alpha);
        const cdfMax = 1 - normalCDF_complement(beta);
        diff = cdfMax - cdfMin;
    }
    if (diff < 1e-16) {
        return Math.max(min, Math.min(max, mean));
    }

    const strictDeterminism = options && options.strict === true;
    if (typeof rng !== 'function') {
        if (strictDeterminism) {
            throw new Error('STRICT_DETERMINISM: sampleTruncatedNormal requires a deterministic RNG function');
        }
        if (!globalThis.__MC_WARNED_FALLBACK_RNG__) {
            console.warn('sampleTruncatedNormal: no RNG provided, falling back to Math.random() (non-deterministic)');
            globalThis.__MC_WARNED_FALLBACK_RNG__ = true;
        }
        rng = Math.random;
    }
    const sampledU = rng();
    const u = Number.isFinite(sampledU)
        ? Math.max(0, Math.min(1, sampledU))
        : 0.5;
    const p = cdfMin + u * diff;

    const zScore = inverseNormalCDF(p);
    const rawScore = mean + (zScore * sd);

    return Math.max(min, Math.min(max, rawScore));
}

export function truncatedNormalFromUniform(mean, sd, min, max, u) {
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || !Number.isFinite(min) || !Number.isFinite(max)) {
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : lo;
        return Math.max(lo, Math.min(hi, (lo + hi) / 2));
    }

    if (min > max) {
        const temp = min;
        min = max;
        max = temp;
    }

    if (sd <= MIN_SD_FLOOR) return Math.max(min, Math.min(max, mean));

    const alpha = (min - mean) / sd;
    const beta = (max - mean) / sd;
    let diff;
    let cdfMin;

    if (alpha > 0 && beta > 0) {
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        diff = sAlpha - sBeta;
        cdfMin = 1 - sAlpha;
    } else if (alpha < 0 && beta < 0) {
        const sNegBeta = normalCDF_complement(-beta);
        const sNegAlpha = normalCDF_complement(-alpha);
        diff = sNegBeta - sNegAlpha;
        cdfMin = sNegAlpha;
    } else {
        cdfMin = 1 - normalCDF_complement(alpha);
        const cdfMax = 1 - normalCDF_complement(beta);
        diff = cdfMax - cdfMin;
    }
    if (diff < 1e-16) {
        return Math.max(min, Math.min(max, mean));
    }

    const safeU = Number.isFinite(u) ? Math.max(0, Math.min(1, u)) : 0.5;
    const p = cdfMin + safeU * diff;
    const zScore = inverseNormalCDF(p);
    const rawScore = mean + (zScore * sd);

    return Math.max(min, Math.min(max, rawScore));
}

export function ensurePositiveSemiDefinite(matrix, baseJitter = 1e-9) {
    const n = matrix.length;
    const cloneBase = matrix.map(row => [...row]);

    let diagMax = 0;
    for (let i = 0; i < n; i++) {
        diagMax = Math.max(diagMax, Math.abs(cloneBase[i][i] || 0));
    }

    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const factor = attempt === 0 ? 0 : attempt * 10;
        const jitter = Math.max(baseJitter, (diagMax * 1e-8)) + (baseJitter * factor);
        const psdMatrix = cloneBase.map((row, i) => row.map((v, j) => (i === j ? (v + jitter) : v)));

        try {
            const L = choleskyDecomposition(psdMatrix);
            let ok = true;
            for (let k = 0; k < L.length; k++) {
                if (!Number.isFinite(L[k][k]) || L[k][k] <= 0) { ok = false; break; }
            }
            if (ok) return psdMatrix;
        } catch {
            // continue
        }
    }

    const fallbackJitter = Math.max(baseJitter, diagMax * 1e-6);
    return cloneBase.map((row, i) => row.map((v, j) => (i === j ? (v + fallbackJitter) : v)));
}

export function choleskyDecomposition(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) return [];
    const n = matrix.length;
    if (matrix.some(row => !Array.isArray(row) || row.length !== n)) {
        throw new Error('CHOLESKY_INVALID_MATRIX: matriz deve ser quadrada');
    }

    const lower = Array.from({ length: n }, () => Array(n).fill(0));
    const EPS = 1e-12;

    // ✅ PERF FIX: buffer pré-alocado para soma de Kahan
    // Evita alocação de new Array(j) a cada iteração
    const sumBuffer = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            let c = 0; // compensador Kahan

            if (j > 0) {
                // Preencher buffer e somar com Kahan inline
                for (let k = 0; k < j; k++) {
                    sumBuffer[k] = lower[i][k] * lower[j][k];
                }
                for (let k = 0; k < j; k++) {
                    const y = sumBuffer[k] - c;
                    const t = sum + y;
                    c = (t - sum) - y;
                    sum = t;
                }
            }

            if (j === i) {
                const diag = Number(matrix[i][i]) - sum;
                if (!Number.isFinite(diag) || diag <= EPS) {
                    throw new Error(`CHOLESKY_NOT_POSITIVE_DEFINITE: pivot ${i} = ${diag}`);
                }
                lower[i][j] = Math.sqrt(diag);
            } else {
                const denom = lower[j][j];
                if (!(denom > EPS)) {
                    throw new Error(`CHOLESKY_ZERO_PIVOT: pivot ${j}`);
                }
                const value = (Number(matrix[i][j]) - sum) / denom;
                if (!Number.isFinite(value)) {
                    throw new Error(`CHOLESKY_NONFINITE: elemento ${i},${j}`);
                }
                lower[i][j] = value;
            }
        }
    }

    return lower;
}

export function applyCovariance(choleskyLower, zVector, targetVector) {
    if (!choleskyLower || !zVector || choleskyLower.length !== zVector.length) {
        if (targetVector && zVector && targetVector !== zVector) {
            for(let i=0; i<zVector.length; i++) targetVector[i] = zVector[i];
            return targetVector;
        }
        return zVector ? (targetVector === zVector ? targetVector : [...zVector]) : [];
    }
    const n = zVector.length;
    const isInPlace = (targetVector === zVector);
    const result = targetVector || Array(n).fill(0);
    
    if (isInPlace) {
        // Iteração reversa garante estabilidade na mutação do próprio buffer em modo in-place
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = 0; j <= i; j++) {
                sum += choleskyLower[i][j] * zVector[j];
            }
            result[i] = sum;
        }
    } else {
        for (let i = 0; i < n; i++) result[i] = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                result[i] += choleskyLower[i][j] * zVector[j];
            }
        }
    }
    return result;
}


```

---

### Arquivo: `src/engine/math/kahan.js`
*Linhas: 66 | Tamanho: 2.2 KB*

```javascript
/**
 * Helper: verifica se o valor é um array-like iterável com .length
 * Suporta Array, Float64Array, Float32Array, Int32Array, etc.
 */
function isArrayLike(arr) {
    return arr != null && typeof arr.length === 'number' && arr.length >= 0;
}

/**
 * Algoritmo de Soma de Kahan (Kahan Summation Algorithm)
 * Minimiza o erro de ponto flutuante (IEEE 754) em somatórios de grandes séries.
 * 
 * @param {number[]|Float64Array|Float32Array} arr - Array de números para somar.
 * @returns {number} Soma matematicamente precisa.
 */
export function kahanSum(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    let sum = 0.0;
    let c = 0.0; // Um compensador para os bits de baixa ordem perdidos
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;
        
        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        
        let y = val - c;     // c é zero na primeira iteração, depois carrega o erro anterior
        let t = sum + y;     // Adiciona o valor compensado à soma total
        c = (t - sum) - y;   // Calcula o erro de arredondamento desta iteração
        sum = t;             // Atualiza a soma principal
    }
    
    return sum;
}

/**
 * Calcula a média utilizando a Soma de Kahan para máxima precisão.
 * Suporta Array, Float64Array, Float32Array, etc.
 */
export function kahanMean(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    // Para TypedArrays, filtrar NaN/Infinity in-line sem .filter()
    let count = 0;
    let sum = 0.0;
    let c = 0.0;
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;

        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        const y = val - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;
        count++;
    }
    
    return count === 0 ? 0 : sum / count;
}


```

---

### Arquivo: `src/engine/math/percentile.js`
*Linhas: 176 | Tamanho: 6.1 KB*

```javascript
// ==========================================
// SHARED STATISTICAL UTILITIES
// ==========================================

/**
 * Linear interpolation percentile calculator.
 * B1 FIX: Shared between simulateNormalDistribution (monteCarlo.js) and
 * monteCarloSimulation (projection.js) for consistent CI percentile calculation.
 * 
 * @param {Float64Array|Float32Array|number[]} arr - Sorted array of values
 * @param {number} p - Percentile (0 to 1, e.g. 0.025 for 2.5th percentile)
 * @returns {number} Interpolated percentile value
 */
export const getPercentile = (arr, p, isAlreadySorted = false) => {
    if (!arr || arr.length === 0) return 0;

    let sorted;
    if (isAlreadySorted) {
        if (arr instanceof Float64Array || arr instanceof Float32Array) {
            let hasNaN = false;
            for (let i = 0; i < arr.length; i++) {
                if (!Number.isFinite(arr[i])) {
                    hasNaN = true;
                    break;
                }
            }
            if (!hasNaN) {
                sorted = arr;
            } else {
                const finiteData = [];
                for (let i = 0; i < arr.length; i++) {
                    if (Number.isFinite(arr[i])) finiteData.push(arr[i]);
                }
                if (finiteData.length === 0) return 0;
                // Ordenar explicitamente — a ordem original NÃO é confiável com NaNs
                finiteData.sort((a, b) => a - b);
                sorted = new arr.constructor(finiteData);
            }
        } else {
            const hasNaN = arr.some(v => !Number.isFinite(Number(v)));
            if (!hasNaN) {
                sorted = arr;
            } else {
                const finite = Array.from(arr).filter(v => Number.isFinite(Number(v)));
                if (finite.length === 0) return 0;
                sorted = finite.sort((a, b) => Number(a) - Number(b));
            }
        }
    } else if (arr instanceof Float64Array || arr instanceof Float32Array) {
        const finiteData = [];
        for (let i = 0; i < arr.length; i++) {
            if (Number.isFinite(arr[i])) finiteData.push(arr[i]);
        }
        if (finiteData.length === 0) return 0;
        sorted = new arr.constructor(finiteData).sort();
    } else {
        const finite = Array.from(arr).filter(v => Number.isFinite(Number(v)));
        if (finite.length === 0) return 0;
        sorted = [...finite].sort((a, b) => a - b);
    }

    // NOVAS PROTEÇÕES
    if (!Number.isFinite(Number(p))) return 0;
    const safeP = Number(p);
    if (safeP <= 0) return sorted[0]; // Retorna primeiro elemento se percentil <= 0
    if (safeP >= 1) return sorted[sorted.length - 1]; // Retorna último elemento se percentil >= 1
    
    const idx = (sorted.length - 1) * safeP;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

/**
 * Algoritmo Quickselect In-place (Média O(N), Memória O(1))
 * Encontra o k-ésimo menor elemento sem ordenar o array inteiro.
 */
// BUG-AUDIT-09 FIX: Cria cópia defensiva para não corromper o array original.
// O particionamento in-place reordenava o Float64Array do chamador, fazendo
// chamadas subsequentes (ex: iLow, iMedian, iHigh) retornarem valores incorretos.
export const quickSelect = (arr, k) => {
    if (!arr || arr.length === 0) return 0;

    let copy;
    if (arr instanceof Float64Array || arr instanceof Float32Array) {
        let allFinite = true;
        const finite = [];
        for (let i = 0; i < arr.length; i++) {
            if (Number.isFinite(arr[i])) {
                finite.push(arr[i]);
            } else {
                allFinite = false;
            }
        }
        if (finite.length === 0) return 0;
        copy = allFinite ? new arr.constructor(arr) : new arr.constructor(finite);
    } else {
        copy = [];
        for (const value of arr) {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) copy.push(numeric);
        }
        if (copy.length === 0) return 0;
    }

    const rawK = Math.floor(Number(k));
    const safeK = Number.isFinite(rawK)
        ? Math.max(0, Math.min(copy.length - 1, rawK))
        : 0;
    return _quickSelectInPlace(copy, safeK, 0, copy.length - 1);
};

const _quickSelectInPlace = (arr, k, left = 0, right = arr.length - 1) => {
    while (left < right) {
        let pivotIndex = partition(arr, left, right);
        if (pivotIndex === k) return arr[k];
        if (k < pivotIndex) right = pivotIndex - 1;
        else left = pivotIndex + 1;
    }
    return arr[k];
};

function partition(arr, left, right) {
    const pivotIndex = Math.floor((left + right) / 2);
    const pivot = arr[pivotIndex];
    let temp = arr[pivotIndex];
    arr[pivotIndex] = arr[right];
    arr[right] = temp;

    let storeIndex = left;
    for (let i = left; i < right; i++) {
        if (arr[i] < pivot) {
            temp = arr[storeIndex];
            arr[storeIndex] = arr[i];
            arr[i] = temp;
            storeIndex++;
        }
    }

    temp = arr[storeIndex];
    arr[storeIndex] = arr[right];
    arr[right] = temp;
    return storeIndex;
}

export function findScoreForPercentile(targetPercentile, minScore, maxScore, cdfFunction, tolerance = 0.0001) {
  let low = minScore;
  let high = maxScore;
  let maxIter = 100; // Bailout / Trava de segurança
  
  // Tratamento de ponta (Edge case high performers)
  if (targetPercentile >= 0.9999) return maxScore;
  if (targetPercentile <= 0.0001) return minScore;

  for (let i = 0; i < maxIter; i++) {
    const mid = low + (high - low) / 2;
    const currentPercentile = cdfFunction(mid);
    
    if (Math.abs(currentPercentile - targetPercentile) <= tolerance) {
      return mid;
    }
    
    if (currentPercentile < targetPercentile) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return low + (high - low) / 2; // Retorna a melhor aproximação ao atingir maxIter
}



```

---

### Arquivo: `src/engine/math/safe.js`
*Linhas: 139 | Tamanho: 3.2 KB*

```javascript
export const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

export const parseNumericString = (value) => {
  if (typeof value === 'number') return value;

  if (typeof value !== 'string') return NaN;

  const trimmed = value.trim();

  if (!trimmed || /^[+-]?$/.test(trimmed) || /^\.$/.test(trimmed)) return NaN;

  // Formato pt-BR: 1.234,56
  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    return Number(normalized);
  }

  // Se tem múltiplos pontos: 1.234.567 -> 1234567
  const parts = trimmed.split('.');

  if (parts.length > 2) {
    return Number(parts.join(''));
  }

  // Se tem um ponto e exatamente 3 casas decimais, tratar como milhar:
  // 1.234 -> 1234
  if (parts.length === 2) {
    const integerPart = parts[0];
    const decimalPart = parts[1];

    if (integerPart.length > 0 && decimalPart.length === 3) {
      return Number(integerPart + decimalPart);
    }
  }

  return Number(trimmed);
};

export const toFinite = (value, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = parseNumericString(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
};

export const clamp = (value, min, max) => {
  const v = toFinite(value, NaN);
  const lo = toFinite(min, -Infinity);
  const hi = toFinite(max, Infinity);

  if (!Number.isFinite(v)) return lo;
  if (v < lo) return lo;
  if (v > hi) return hi;

  return v;
};

export const safeDivide = (numerator, denominator, fallback = 0) => {
  const a = toFinite(numerator, NaN);
  const b = toFinite(denominator, NaN);

  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return fallback;
  }

  const result = a / b;

  return Number.isFinite(result) ? result : fallback;
};

export const positiveNumberOrDefault = (value, fallback = 0) => {
  const n = toFinite(value, NaN);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return n;
};

export const positiveIntegerOrDefault = (value, fallback = 0) => {
  const n = toFinite(value, NaN);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.floor(n);
};

export const toArray = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value);
  }

  return [];
};

export const ensureArray = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value);
  }

  return [];
};

export const normalizeProbability = (value) => {
  const p = toFinite(value, NaN);

  if (!Number.isFinite(p)) return NaN;

  if (p >= 0 && p <= 1) return p;

  if (p > 1 && p <= 100) return p / 100;

  return clamp(p, 0, 1);
};

export const normalizePercent = (value, fallback = 0) => {
  const p = normalizeProbability(value);

  if (!Number.isFinite(p)) return fallback;

  return clamp(p * 100, 0, 100);
};


```

---

### Arquivo: `src/engine/mc.worker.js`
*Linhas: 300 | Tamanho: 14.4 KB*

```javascript
import { monteCarloSimulation } from './projection.js';
import { runMonteCarloAnalysis, simulateNormalDistribution } from './monteCarlo.js';
import { resetGaussianCache } from './math/gaussian.js';

function safeNum(val, fallback) {
    const hasFallback = arguments.length > 1;
    const cleanFallback = hasFallback ? fallback : 0;

    if (val === undefined || val === null || val === '') return cleanFallback;

    const num = Number(val);
    return Number.isFinite(num) ? num : cleanFallback;
}

function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => ({
        ...s,
        name: s?.name ? String(s.name) : undefined,
        mean: safeNum(s?.mean, 0),
        sd: Math.max(0.01, safeNum(s?.sd, 1)),
        minCutoff: safeNum(s?.minCutoff, 0),
        maxScore: safeNum(s?.maxScore, 100),
        minScore: safeNum(s?.minScore, 0),
        immunityFactor: safeNum(s?.immunityFactor, 1.0),
        weight: safeNum(s?.weight, 1.0)
    }));
}

function sanitizeBayesianCI(ci) {
    if (!ci || typeof ci !== 'object') return undefined;

    const out = {};

    if (ci.ciLow !== undefined) out.ciLow = safeNum(ci.ciLow, 0);
    if (ci.ciHigh !== undefined) out.ciHigh = safeNum(ci.ciHigh, 100);
    if (ci.unclampedLow !== undefined) out.unclampedLow = safeNum(ci.unclampedLow, 0);
    if (ci.unclampedHigh !== undefined) out.unclampedHigh = safeNum(ci.unclampedHigh, 100);
    if (ci.n !== undefined) out.n = safeNum(ci.n, 1);

    return Object.keys(out).length ? out : undefined;
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history.map(h => {
        if (h === null || h === undefined) return null;

        if (typeof h === 'number') {
            return Number.isFinite(h) ? h : null;
        }

        if (typeof h === 'object') {
            const newH = { ...h };

            if (h.score !== undefined) newH.score = safeNum(h.score, NaN);
            if (h.value !== undefined) newH.value = safeNum(h.value, NaN);
            if (h.total !== undefined) newH.total = safeNum(h.total, 20);
            if (h.weight !== undefined) newH.weight = safeNum(h.weight, 1.0);
            if (h.difficulty !== undefined) newH.difficulty = safeNum(h.difficulty, 1.0);

            const hasFiniteScore = Number.isFinite(newH.score) || Number.isFinite(newH.value);
            return hasFiniteScore ? newH : null;
        }

        const parsed = Number(h);
        return Number.isFinite(parsed) ? parsed : null;
    }).filter(v => v !== null && v !== undefined && !Number.isNaN(v));
}

function sanitizeOptions(options) {
    if (!options || typeof options !== 'object') return {};

    const newOpts = { ...options };

    if (options.forcedVolatility !== undefined) newOpts.forcedVolatility = safeNum(options.forcedVolatility, undefined);
    if (options.forcedBaseline !== undefined) newOpts.forcedBaseline = safeNum(options.forcedBaseline, undefined);
    if (options.currentMean !== undefined) newOpts.currentMean = safeNum(options.currentMean, undefined);
    if (options.minScore !== undefined) newOpts.minScore = safeNum(options.minScore, 0);
    if (options.maxScore !== undefined) newOpts.maxScore = safeNum(options.maxScore, 100);

    if (options.seed !== undefined) newOpts.seed = safeNum(options.seed, undefined);
    if (options.subjects !== undefined) newOpts.subjects = sanitizeSubjects(options.subjects);
    if (options.history !== undefined) newOpts.history = sanitizeHistory(options.history);
    if (options.flashcardImmunity !== undefined) newOpts.flashcardImmunity = safeNum(options.flashcardImmunity, 1.0);
    if (options.bayesianCI !== undefined) newOpts.bayesianCI = sanitizeBayesianCI(options.bayesianCI);
    if (options.simulations !== undefined) newOpts.simulations = safeNum(options.simulations, 5000);

    if (options.historicalCutoffs !== undefined) {
        newOpts.historicalCutoffs = Array.isArray(options.historicalCutoffs)
            ? options.historicalCutoffs.map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0)
            : [];
    }

    return newOpts;
}

self.onmessage = function(e) {
    const { type, payload, id } = e.data;

    // ✅ PATCH-21: Validação defensiva
    if (!type || !payload) {
        self.postMessage({ id, type: 'error', error: 'Payload inválido' });
        return;
    }

    if (typeof resetGaussianCache === 'function') {
        resetGaussianCache();
    }

    try {
        let result;

        if (type === 'runMonteCarloAnalysis') {
            if (payload.isObjectCall) {
                const input = payload.input || {};

                if (input.mode === 'normal' || (input.mean !== undefined && !Array.isArray(input.values))) {
                    result = simulateNormalDistribution({
                        mean: safeNum(input.mean, 0),
                        sd: safeNum(input.sd, 0),
                        targetScore: safeNum(input.targetScore, 0),
                        simulations: safeNum(input.simulations, 5000),
                        seed: input.seed,
                        currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, 0) : undefined,
                        categoryName: input.categoryName,
                        bayesianCI: sanitizeBayesianCI(input.bayesianCI),
                        minScore: safeNum(input.minScore, 0),
                        maxScore: safeNum(input.maxScore, 100),
                        historyLength: safeNum(input.historyLength, 0),
                        subjects: input.subjects !== undefined ? sanitizeSubjects(input.subjects) : undefined,
                        historicalCutoffs: input.historicalCutoffs !== undefined
                            ? (Array.isArray(input.historicalCutoffs)
                                ? input.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                                : [])
                            : undefined,
                        flashcardImmunity: input.flashcardImmunity !== undefined ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                        simuladoRows: input.simuladoRows,
                        categoryNames: input.categoryNames,
                    });
                } else {
                    const sanitizedInput = {
                        ...input,
                        // FIX: Mantém o objeto inteiro para não perder metadata (fatigueFlag, weight, difficulty)
                        values: Array.isArray(input.values) ? input.values.map(v => {
                            if (typeof v === 'object' && v !== null) {
                                return { ...v, score: safeNum(v.score ?? v.value, NaN) };
                            }
                            return safeNum(v, NaN);
                        }) : [],
                        dates: Array.isArray(input.dates) ? input.dates.map(d => d == null ? '' : String(d)) : [],
                        meta: safeNum(input.meta, 0),
                        targetScore: input.targetScore !== undefined ? safeNum(input.targetScore, 0) : undefined,
                        simulations: safeNum(input.simulations, 5000),
                        projectionDays: safeNum(input.projectionDays, 90),
                        forcedVolatility: input.forcedVolatility !== undefined ? safeNum(input.forcedVolatility, 0) : undefined,
                        forcedBaseline: input.forcedBaseline !== undefined ? safeNum(input.forcedBaseline, 0) : undefined,
                        currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, 0) : undefined,
                        minScore: input.minScore !== undefined ? safeNum(input.minScore, 0) : undefined,
                        maxScore: input.maxScore !== undefined ? safeNum(input.maxScore, 100) : undefined,
                        historicalCutoffs: input.historicalCutoffs !== undefined
                            ? (Array.isArray(input.historicalCutoffs)
                                ? input.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                                : [])
                            : undefined,
                        flashcardImmunity: input.flashcardImmunity !== undefined ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                        subjects: input.subjects !== undefined ? sanitizeSubjects(input.subjects) : undefined
                    };

                    result = runMonteCarloAnalysis(sanitizedInput);
                }
            } else if (Array.isArray(payload.inputOrMean)) {
                const hist = sanitizeHistory(payload.inputOrMean);
                const options = sanitizeOptions(payload.options);

                const sanitizedInput = {
                    // FIX: Mantém o objeto inteiro
                    values: hist.map(h => typeof h === 'object' && h !== null ? { ...h, score: (h.score ?? h.value ?? NaN) } : h),
                    dates: hist.map(h => typeof h === 'object' && h !== null ? (h.date ?? '') : ''),
                    targetScore: safeNum(payload.targetScore, 0),
                    projectionDays: safeNum(payload.projectionDays, 90),
                    ...options
                };

                result = runMonteCarloAnalysis(sanitizedInput);
            } else {
                const options = sanitizeOptions(payload.options);

                result = simulateNormalDistribution({
                    mean: safeNum(payload.inputOrMean, 0),
                    sd: safeNum(payload.pooledSD, 0),
                    targetScore: safeNum(payload.targetScore, 0),
                    simulations: safeNum(options.simulations, 5000),
                    seed: options.seed,
                    currentMean: options.currentMean,
                    categoryName: options.categoryName,
                    bayesianCI: options.bayesianCI,
                    minScore: safeNum(options.minScore, 0),
                    maxScore: safeNum(options.maxScore, 100),
                    historyLength: (options.history || []).length,
                    subjects: options.subjects,
                    historicalCutoffs: options.historicalCutoffs,
                    flashcardImmunity: options.flashcardImmunity
                });
            }
        } else if (type === 'monteCarloSimulation') {
            const history = sanitizeHistory(payload.history);
            const targetScore = safeNum(payload.targetScore, 0);
            const projectionDays = safeNum(payload.projectionDays, 30);
            const simulations = safeNum(payload.simulations, 5000);
            const options = sanitizeOptions(payload.options);

            result = monteCarloSimulation(history, targetScore, projectionDays, simulations, options);
        } else if (type === 'simulateNormalDistribution') {
            const mean = safeNum(payload.mean, 0);
            const sd = safeNum(payload.sd, 0);
            const targetScore = safeNum(payload.targetScore, 0);
            const simulations = safeNum(payload.simulations, 5000);
            const seed = payload.seed !== undefined ? safeNum(payload.seed, undefined) : undefined;
            const currentMean = payload.currentMean !== undefined ? safeNum(payload.currentMean, undefined) : undefined;
            const categoryName = payload.categoryName ? String(payload.categoryName) : undefined;
            const minScore = safeNum(payload.minScore, 0);
            const maxScore = safeNum(payload.maxScore, 100);
            const bayesianCI = sanitizeBayesianCI(payload.bayesianCI);

            const sanitizedSubjects = Array.isArray(payload.subjects)
                ? sanitizeSubjects(payload.subjects)
                : undefined;

            result = simulateNormalDistribution({
                mean,
                sd,
                targetScore,
                simulations,
                seed,
                currentMean,
                categoryName,
                bayesianCI,
                minScore,
                maxScore,
                historyLength: safeNum(payload.historyLength, 0),
                subjects: sanitizedSubjects,
                historicalCutoffs: payload.historicalCutoffs !== undefined
                    ? (Array.isArray(payload.historicalCutoffs)
                        ? payload.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                        : [])
                    : undefined,
                flashcardImmunity: payload.flashcardImmunity !== undefined ? safeNum(payload.flashcardImmunity, 1.0) : undefined,
                simuladoRows: payload.simuladoRows,
                categoryNames: payload.categoryNames,
            });
        } else {
            self.postMessage({ id, type: 'error', error: `Tipo de mensagem desconhecido: ${type}` });
            return;
        }

        // ✅ PATCH-21: Validar resultado antes de enviar
        if (result && typeof result === 'object') {
            if (Number.isFinite(result.probability)) {
                result.probability = Math.max(0, Math.min(100, result.probability));
            }
            if (Number.isFinite(result.mean)) {
                const effectiveMin = Number.isFinite(result.minScore)
                    ? result.minScore
                    : safeNum(payload?.minScore ?? payload?.options?.minScore, 0);
                const effectiveMax = Number.isFinite(result.maxScore)
                    ? result.maxScore
                    : safeNum(payload?.maxScore ?? payload?.options?.maxScore, 100);
                result.mean = Math.max(effectiveMin, Math.min(effectiveMax, result.mean));
            }
        }
        self.postMessage({ id, type: 'result', result: sanitizePayloadForWorker(result) });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ id, type: 'error', error: errorMessage });
    }
};

function sanitizePayloadForWorker(obj) {
    try {
        return JSON.parse(JSON.stringify(obj, (key, value) => {
            if (Number.isNaN(value)) return null;
            if (value === Number.POSITIVE_INFINITY) return Number.MAX_VALUE;
            if (value === Number.NEGATIVE_INFINITY) return -Number.MAX_VALUE;
            return value;
        }));
    } catch {
        return null;
    }
}

export const __workerTesting = {
  safeNum,
  sanitizeHistory,
  sanitizeOptions,
};


```

---

### Arquivo: `src/engine/monteCarlo.js`
*Linhas: 822 | Tamanho: 32.1 KB*

```javascript
import { mulberry32 } from './random.js';
import {
    normalCDF_complement,
    generateKDE,
    sampleTruncatedNormal,
    truncatedNormalMean,
    ensurePositiveSemiDefinite,
    choleskyDecomposition,
    applyCovariance,
    inverseNormalCDF,
    truncatedNormalFromUniform
} from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };

import { getPercentile } from './math/percentile.js';
import { kahanSum } from './math/kahan.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getDateKey } from '../utils/dateHelper.js';
import { getCachedSimulation, setCachedSimulation, clearSimulationCache } from './simulationCache.js';

export { getPercentile };

const DEFAULT_SIMULATIONS = 5000;
const MAX_SIMULATIONS = 50000;
const TARGET_PROB_SE = 0.008;
const DEFAULT_DOMAIN_MIN = 0;
const DEFAULT_DOMAIN_MAX = 100;

function toFiniteNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function sanitizeDomain(minScore, maxScore) {
    const rawMin = toFiniteNumber(minScore, DEFAULT_DOMAIN_MIN);
    const rawMax = toFiniteNumber(maxScore, DEFAULT_DOMAIN_MAX);

    if (rawMin <= rawMax) {
        return { minScore: rawMin, maxScore: rawMax };
    }

    return { minScore: rawMax, maxScore: rawMin };
}

function sanitizeSimulations(simulations) {
    const normalized = Math.floor(toFiniteNumber(simulations, DEFAULT_SIMULATIONS));
    return clamp(normalized, 1, MAX_SIMULATIONS);
}

function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => {
        const safeMean = toFiniteNumber(s?.mean, 0);
        const safeSd = Math.max(1e-6, toFiniteNumber(s?.sd, 1));
        const safeMinCutoff = toFiniteNumber(s?.minCutoff, 0);
        const safeMinScore = toFiniteNumber(s?.minScore, DEFAULT_DOMAIN_MIN);
        const safeMaxScore = toFiniteNumber(s?.maxScore, DEFAULT_DOMAIN_MAX);
        const safeImmunity = toFiniteNumber(s?.immunityFactor, 1.0);
        const safeWeight = Math.max(1e-6, toFiniteNumber(s?.weight, 1));   // ✅ LOTE-01

        return {
            ...s,
            mean: safeMean,
            sd: safeSd,
            minCutoff: safeMinCutoff,
            minScore: safeMinScore,
            maxScore: safeMaxScore,
            immunityFactor: safeImmunity,
            weight: safeWeight                                              // ✅ LOTE-01
        };
    });
}

export function recommendSimulationCount(targetProb = 0.7, targetSE = TARGET_PROB_SE, minSims = 2000, maxSims = MAX_SIMULATIONS) {
    const p = Math.max(0.05, Math.min(0.95, targetProb));
    const varBernoulli = p * (1 - p);
    const needed = Math.ceil(varBernoulli / (targetSE * targetSE));
    return clamp(needed, minSims, maxSims);
}

function generateStableSeed(historyCount, categoryName, _targetScore, _currentMean) {
    let h = 2166136261;

    const safeCatId = typeof categoryName === 'object' && categoryName !== null
        ? String(categoryName.id || categoryName.name || 'global')
        : String(categoryName || 'global');

    const safeHistoryCount = toFiniteNumber(historyCount, 0);
    const safeTarget = toFiniteNumber(_targetScore, 0);
    const safeMeanInt = Number.isFinite(Number(_currentMean)) ? Math.floor(Number(_currentMean) * 10) : 0;

    const seedStr = `${safeHistoryCount}-${safeCatId}-${safeTarget}-${safeMeanInt}`;

    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    return h >>> 0;
}

export function simulateNormalDistribution(
    meanOrObj,
    sd,
    targetScore,
    simulations,
    seed,
    currentMean,
    categoryName,
    bayesianCI,
    historyLength = 0
) {
    let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
    let minScore = DEFAULT_DOMAIN_MIN;
    let maxScore = DEFAULT_DOMAIN_MAX;

    let subjects = [];
    let historicalCutoffs = [];
    let flashcardImmunity = 1.0;

    if (typeof meanOrObj === 'object' && meanOrObj !== null) {
        mean = meanOrObj.mean ?? mean;
        sd = meanOrObj.sd ?? sd;
        targetScore = meanOrObj.targetScore ?? targetScore;
        simulations = meanOrObj.simulations ?? simulations;
        seed = meanOrObj.seed ?? seed;
        currentMean = meanOrObj.currentMean ?? currentMean;
        categoryName = meanOrObj.categoryName ?? categoryName;
        bayesianCI = meanOrObj.bayesianCI ?? bayesianCI;
        minScore = meanOrObj.minScore ?? minScore;
        maxScore = meanOrObj.maxScore ?? maxScore;
        historyLength = meanOrObj.historyLength ?? 0;
        subjects = meanOrObj.subjects ?? [];
        historicalCutoffs = meanOrObj.historicalCutoffs ?? [];
        flashcardImmunity = meanOrObj.flashcardImmunity ?? 1.0;
    }

    if (!Number.isFinite(mean)) mean = (minScore + maxScore) / 2;

    subjects = sanitizeSubjects(subjects);

    historicalCutoffs = Array.isArray(historicalCutoffs)
        ? historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
        : [];

    flashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);
    historyLength = Math.max(0, Math.floor(toFiniteNumber(historyLength, 0)));

    if (!meanOrObj?.simulations && !simulations) {
        const refMean = Number.isFinite(currentMean) ? currentMean
                      : Number.isFinite(mean) ? mean
                      : (minScore + maxScore) / 2;
        const domain = Math.max(1, maxScore - minScore);
        const roughProb = Math.max(0.1, Math.min(0.9, (refMean - minScore) / domain));
        simulations = recommendSimulationCount(roughProb);
    }

    const safeDomain = sanitizeDomain(minScore, maxScore);
    minScore = safeDomain.minScore;
    maxScore = safeDomain.maxScore;

    const safeMean = clamp(toFiniteNumber(mean, (minScore + maxScore) / 2), minScore, maxScore);
    const safeCurrentMean = toFiniteNumber(currentMean, safeMean);

    const sdNum = toFiniteNumber(sd, NaN);
    const hasExplicitDeterministicSD = Number.isFinite(sdNum) && sdNum <= 0;
    const isExplicitCoachSD = Number.isFinite(sdNum) && sdNum > 0;

    let safeSD = Number.isFinite(sdNum) && sdNum > 0 ? sdNum : 0;

    if (bayesianCI) {
        let high = bayesianCI.unclampedHigh !== undefined ? bayesianCI.unclampedHigh : bayesianCI.ciHigh;
        let low = bayesianCI.unclampedLow !== undefined ? bayesianCI.unclampedLow : bayesianCI.ciLow;

        high = toFiniteNumber(high, NaN);
        low = toFiniteNumber(low, NaN);

        if (Number.isFinite(high) && Number.isFinite(low) && high < low) {
            const tmp = high;
            high = low;
            low = tmp;
        }

        if (Number.isFinite(high) && Number.isFinite(low)) {
            const effectiveN = Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1));
            const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });

            let inferredSD = (high - low) / (tMultiplier * 2);
            const distToBoundary = Math.min(safeMean - minScore, maxScore - safeMean);

            if (Number.isFinite(inferredSD) && inferredSD >= 1e-10) {
                if (distToBoundary < inferredSD * 1.5) {
                    const correctionFactor = 1 + (1 - distToBoundary / (inferredSD * 1.5));
                    inferredSD *= Math.min(1.5, correctionFactor);
                }
            }

            if (Number.isFinite(inferredSD) && inferredSD > 0) {
                safeSD = inferredSD;
            }
        }
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    if (!hasExplicitDeterministicSD && historyLength < 15 && !bayesianCI && !isExplicitCoachSD) {
        const rangeMassa = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
        const floorVolatility = rangeMassa * 0.04;
        const confidence = Math.min(1, historyLength / 8);
        safeSD = (safeSD * confidence) + (floorVolatility * (1 - confidence));
    }

    const safeFlashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);

    if (safeFlashcardImmunity < 1.0 && safeSD > 0) {
        safeSD = safeSD * Math.max(0.80, safeFlashcardImmunity);
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    const effectiveTarget = clamp(toFiniteNumber(targetScore, minScore), minScore, maxScore);
    const safeSimulations = sanitizeSimulations(simulations);

    if (safeSD < 1e-5) {
        // ✅ FIX: Com sd ≈ 0, a distribuição é degenerada.
        // Usar comparação com tolerância relativa ao domínio.
        const domainWidth = Math.max(1e-9, maxScore - minScore);
        const EPS = domainWidth * 1e-6;
        let prob;
        if (safeMean > effectiveTarget + EPS) {
            prob = 100;
        } else if (safeMean < effectiveTarget - EPS) {
            prob = 0;
        } else {
            prob = 50; // Fronteira exata
        }

        const kdeOffset = Math.max(1e-4, domainWidth * 0.001);
        return {
            simulationCount: safeSimulations,
            probability: prob,
            analyticalProbability: prob,
            recommendedProbability: prob,
            probabilityPolicy: 'deterministic',
            mean: safeMean,
            sd: 0,
            sdVisual: 0,
            sdLeft: 0,
            sdRight: 0,
            ci95StatLow: safeMean,
            ci95StatHigh: safeMean,
            ci95Low: safeMean,
            ci95High: safeMean,
            ci95VisualLow: safeMean,
            ci95VisualHigh: safeMean,
            ci95VisualClamped: false,
            currentMean: safeCurrentMean,
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                safeMean > minScore ? { x: safeMean - kdeOffset, y: 0, density: 0 } : null,
                { x: safeMean, y: 1, density: 1 },
                safeMean < maxScore ? { x: safeMean + kdeOffset, y: 0, density: 0 } : null
            ].filter(Boolean),
            drift: 0,
            volatility: 0,
            minScore,
            maxScore,
            method: bayesianCI ? 'bayesian_static_hybrid' : 'deterministic'
        };
    }

    const numericSeed = toFiniteNumber(seed, NaN);
    const stableSeed = Number.isFinite(numericSeed)
        ? (numericSeed >>> 0)
        : generateStableSeed(historyLength, categoryName, targetScore, safeCurrentMean);

    const rng = mulberry32(stableSeed);

    let success = 0;
    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    const allScores = new Float64Array(safeSimulations);

    let muParam = safeMean;

    if (safeSD > 0) {
        const distMin = safeMean - minScore;
        const distMax = maxScore - safeMean;

        if (distMin < safeSD * 1.5 || distMax < safeSD * 1.5) {
            const domainSpan = Math.max(1e-9, maxScore - minScore);
            const spread = Math.max(safeSD * 30, domainSpan * 3);
            let muLow = minScore - spread;
            let muHigh = maxScore + spread;
            const tol = Math.max(1e-7, domainSpan * 0.0001);

            for (let iter = 0; iter < 35; iter++) {
                const currentTruncMean = truncatedNormalMean(muParam, safeSD, minScore, maxScore);
                if (!Number.isFinite(currentTruncMean)) break;

                const error = currentTruncMean - safeMean;
                if (Math.abs(error) < tol) break;

                if (error > 0) muHigh = muParam;
                else muLow = muParam;

                muParam = (muLow + muHigh) / 2;
            }
        }
    }

    if (!Number.isFinite(muParam)) muParam = safeMean;

    let cutoffsMean = 0;
    let cutoffsSD = 0;

    const numericCutoffs = historicalCutoffs;
    const hasCutoffs = numericCutoffs.length > 0;

    if (hasCutoffs) {
        cutoffsMean = kahanSum(numericCutoffs) / numericCutoffs.length;

        if (numericCutoffs.length > 1) {
            const devs = numericCutoffs.map(v => Math.pow(v - cutoffsMean, 2));
            cutoffsSD = Math.sqrt(Math.max(0, kahanSum(devs) / (numericCutoffs.length - 1)));
        } else {
            cutoffsSD = cutoffsMean * 0.05;
        }

        if (!Number.isFinite(cutoffsSD) || cutoffsSD <= 0) {
            cutoffsSD = Math.max(1e-6, cutoffsMean * 0.05);
        }
    }

    // ✅ LOTE-01 FIX (C1): o score composto deve amostrar TODAS as matérias.
    // Antes, apenas matérias com minCutoff > 0 entravam aqui, e o score global
    // era sobrescrito pela média SÓ delas — as demais eram descartadas da
    // probabilidade silenciosamente. minCutoff agora só afeta a restrição de
    // aprovação (passedMins), nunca a composição do score.
    const allSubjects = sanitizeSubjects(subjects);
    const subjectStats = allSubjects.map(s => {
        const safeSd = Math.max(1e-6, toFiniteNumber(s.sd, 1));
        const safeImmunity = toFiniteNumber(s.immunityFactor, 1.0);
        return {
            ...s,
            sd: safeSd * Math.max(0.80, safeImmunity)
        };
    });

    let subjectCholesky = null;

    if (subjectStats.length > 1) {
        const adaptiveRhoContext = meanOrObj?.simuladoRows
            ? {
                simuladoRows: meanOrObj.simuladoRows,
                categoryNames: subjectStats.map(s => String(s?.name ?? s?.id ?? 'subject'))
            }
            : null;

        try {
            // Gaussian Copula: decompor a matriz de CORRELAÇÃO R (sd = 1).
            // Desta forma, Z = L*W possui variância unitária e u = Phi(Z) é genuinamente
            // uniforme em (0, 1), permitindo que truncatedNormalFromUniform aplique
            // o desvio padrão real de cada matéria sem inflar a variância ao quadrado.
            const corrStats = subjectStats.map(s => ({ ...s, sd: 1 }));
            const corr = buildCovarianceMatrix(corrStats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
            const psdCorr = ensurePositiveSemiDefinite(corr);
            subjectCholesky = choleskyDecomposition(psdCorr);
        } catch (err) {
            console.warn('[MonteCarlo] Cholesky falhou, usando disciplinas independentes:', err?.message || err);
            subjectCholesky = null;
        }

        // ✅ FIX BUG-06: Validar e substituir elementos quase-zero na diagonal da Cholesky
        // Previne singularidades na multiplicação downstream que arruínam as simulações
        if (subjectCholesky) {
            for (let i = 0; i < subjectCholesky.length; i++) {
                if (!Number.isFinite(subjectCholesky[i][i]) || subjectCholesky[i][i] < 1e-8) {
                    subjectCholesky[i][i] = 1e-8;
                }
            }
        }
    }

    const choleskySize = subjectStats.length;

    // Buffers pré-alocados (reutilizados em todas as 5000 simulações)
    const independentBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const latentBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const sampledSubjectsBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    // Pré-computar parâmetros das marginais (não mudam entre simulações)
    const subjectParams = subjectStats.map(s => ({
        mean: toFiniteNumber(s.mean, 0),
        sd: Math.max(1e-6, toFiniteNumber(s.sd, 1)),
        minScore: clamp(toFiniteNumber(s.minScore, minScore), minScore, maxScore),
        maxScore: clamp(toFiniteNumber(s.maxScore, maxScore), minScore, maxScore),
        minCutoff: toFiniteNumber(s.minCutoff, 0),
        weight: Math.max(1e-6, toFiniteNumber(s.weight, 1)),
        immunityFactor: toFiniteNumber(s.immunityFactor, 1.0)
    }));

    for (let i = 0; i < safeSimulations; i++) {
        let currentTarget = effectiveTarget;

        if (hasCutoffs) {
            currentTarget = sampleTruncatedNormal(cutoffsMean, cutoffsSD, minScore, maxScore, rng);
            if (!Number.isFinite(currentTarget)) currentTarget = effectiveTarget;
        }

        let score = sampleTruncatedNormal(muParam, safeSD, minScore, maxScore, rng);
        if (!Number.isFinite(score)) score = clamp(safeMean, minScore, maxScore);

        let passedMins = true;

        if (subjectParams.length > 0) {
            let subjectSum = 0;
            let weightSum = 0;

            if (subjectCholesky && choleskySize > 1) {
                // Preencher buffer de normais independentes
                for (let k = 0; k < choleskySize; k++) {
                    const rawU = rng();
                    const u = Number.isFinite(rawU) ? Math.max(1e-12, Math.min(1 - 1e-12, rawU)) : 0.5;
                    independentBuffer[k] = inverseNormalCDF(u);
                }

                // Aplicar correlação via Cholesky (reutilizando buffers)
                applyCovariance(subjectCholesky, independentBuffer, latentBuffer);

                // Transformar cada marginal para normal truncada (reutilizando buffer)
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const u = 1 - normalCDF_complement(latentBuffer[j]);
                    sampledSubjectsBuffer[j] = truncatedNormalFromUniform(
                        sp.mean, sp.sd, sp.minScore, sp.maxScore, u
                    );
                }

                // Calcular média ponderada e verificar mínimos
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const subjScore = clamp(sampledSubjectsBuffer[j], sp.minScore, sp.maxScore);
                    subjectSum += subjScore * sp.weight;
                    weightSum += sp.weight;
                    // ✅ LOTE-01: corte só reprova quando existe (minCutoff > 0)
                    if (!Number.isFinite(subjScore) || (sp.minCutoff > 0 && subjScore < sp.minCutoff)) {
                        passedMins = false;
                    }
                }
            } else {
                // Caminho independente (sem correlação)
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const effSd = sp.sd;
                    const sScore = sampleTruncatedNormal(sp.mean, effSd, sp.minScore, sp.maxScore, rng);
                    subjectSum += sScore * sp.weight;
                    weightSum += sp.weight;
                    // ✅ LOTE-01: corte só reprova quando existe (minCutoff > 0)
                    if (!Number.isFinite(sScore) || (sp.minCutoff > 0 && sScore < sp.minCutoff)) {
                        passedMins = false;
                    }
                }
            }

            score = weightSum > 0 ? subjectSum / weightSum : score;
        }

        if (score >= currentTarget && passedMins) success++;

        allScores[i] = score;

        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (score - welfordMean);
    }

    const projectedMeanRaw = welfordMean;
    const projectedMean = Number.isFinite(projectedMeanRaw) ? projectedMeanRaw : safeMean;

    const rawProjectedVar = welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0;
    const projectedSD = Math.sqrt(Math.max(0, Number.isFinite(rawProjectedVar) ? rawProjectedVar : 0));

    allScores.sort();

    const nScores = allScores.length;

    const at = (p) => allScores[Math.max(0, Math.min(nScores - 1, Math.floor(nScores * p)))];

    const statisticalCi95Low = at(0.025);
    const statisticalCi95High = at(0.975);
    const empMedian = at(0.5);
    const rawLeft = at(0.16);
    const rawRight = at(0.84);

    let rawLow = statisticalCi95Low;
    let rawHigh = statisticalCi95High;

    const empiricalProbability = (success / safeSimulations) * 100;

    const posteriorAlpha = success + 0.5;
    const posteriorBeta = (safeSimulations - success) + 0.5;
    const bayesEmpiricalProbability = (posteriorAlpha / (posteriorAlpha + posteriorBeta)) * 100;

    const displayMeanRaw = bayesianCI ? safeMean : projectedMean;
    const safeDisplayMean = clamp(toFiniteNumber(displayMeanRaw, safeMean), minScore, maxScore);

    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const MIN_SPREAD = Math.max(0.5, range * 0.005);

    const clampedDisplayMean = safeDisplayMean;
    const wasVisualCIClamped = (rawHigh - rawLow < MIN_SPREAD);

    if (wasVisualCIClamped) {
        const availableSpan = maxScore - minScore;

        if (availableSpan < MIN_SPREAD) {
            rawLow = minScore;
            rawHigh = maxScore;
        } else {
            rawLow = Math.max(minScore, clampedDisplayMean - MIN_SPREAD / 2);
            rawHigh = Math.min(maxScore, clampedDisplayMean + MIN_SPREAD / 2);

            if (rawHigh === maxScore && rawLow < maxScore - MIN_SPREAD) {
                rawLow = maxScore - MIN_SPREAD;
            } else if (rawLow === minScore && rawHigh > minScore + MIN_SPREAD) {
                rawHigh = minScore + MIN_SPREAD;
            }
        }
    }

    if (!Number.isFinite(rawLow)) rawLow = minScore;
    if (!Number.isFinite(rawHigh)) rawHigh = maxScore;

    const displayLow = rawLow;
    const displayHigh = rawHigh;

    const effectiveNForSD = bayesianCI
        ? Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1))
        : Math.max(1, historyLength || 1);

    const tMultiplierForSDRaw = getConfidenceMultiplier(effectiveNForSD, { allowFractional: true });
    const tMultiplierForSD = Number.isFinite(tMultiplierForSDRaw) && tMultiplierForSDRaw > 0
        ? tMultiplierForSDRaw
        : 3.92;

    const rawVisualSD = wasVisualCIClamped
        ? (rawHigh - rawLow) / (tMultiplierForSD * 2)
        : projectedSD;

    const visualSD = Number.isFinite(rawVisualSD) ? Math.max(0, rawVisualSD) : projectedSD;

    const safePhi = (v) => Number.isFinite(v) ? v : 0;

    const phiMin = safePhi(normalCDF_complement((minScore - muParam) / safeSD));
    const phiMax = safePhi(normalCDF_complement((maxScore - muParam) / safeSD));
    const phiTarget = safePhi(normalCDF_complement((effectiveTarget - muParam) / safeSD));

    let rawTruncNormFactor = phiMin - phiMax;
    if (!Number.isFinite(rawTruncNormFactor)) rawTruncNormFactor = 0;

    const isUnderflowStress = rawTruncNormFactor < 1e-15;

    const clampedPhiTarget = Number.isFinite(phiTarget)
        ? Math.max(phiMax, Math.min(phiMin, phiTarget))
        : phiMax;

    let truncNormFactor = isUnderflowStress ? 1e-6 : rawTruncNormFactor;
    if (!Number.isFinite(truncNormFactor) || truncNormFactor <= 0) truncNormFactor = 1e-6;

    let analyticalProbability;

    if (effectiveTarget >= maxScore && !hasCutoffs) {
        analyticalProbability = 0;
    } else if (effectiveTarget <= minScore && !hasCutoffs) {
        analyticalProbability = 100;
    } else {
        analyticalProbability = (isUnderflowStress || hasCutoffs || subjectParams.length > 0)
            ? bayesEmpiricalProbability
            : ((clampedPhiTarget - phiMax) / truncNormFactor) * 100;
    }

    if (!Number.isFinite(analyticalProbability)) analyticalProbability = empiricalProbability;

    const finalAnalyticalProbability = analyticalProbability;

    const finiteEmpiricalProbability = Number.isFinite(bayesEmpiricalProbability) ? bayesEmpiricalProbability : 0;
    const finiteAnalyticalProbability = Number.isFinite(finalAnalyticalProbability) ? finalAnalyticalProbability : 0;

    const empiricalVsAnalyticalGap = Math.abs(finiteEmpiricalProbability - finiteAnalyticalProbability);

    const lowSimulation = safeSimulations < 1200;
    const highTruncationStress = isUnderflowStress || truncNormFactor < 1e-6;

    const pHat = finiteEmpiricalProbability / 100;
    const empiricalStdErrRaw = Math.sqrt(Math.max(1e-12, (pHat * (1 - pHat)) / Math.max(1, safeSimulations))) * 100;
    const empiricalStdErr = Number.isFinite(empiricalStdErrRaw) ? empiricalStdErrRaw : 0;

    const GOLD_STANDARD_SIMS = 15000;
    const empiricalConfidence = Math.min(1, Math.max(0, safeSimulations / GOLD_STANDARD_SIMS));
    const truncationPenalty = highTruncationStress ? 0.55 : 1;
    const uncertaintyScaledGap = empiricalVsAnalyticalGap / Math.max(1, empiricalStdErr * 2.2);
    const disagreementPenalty = Math.max(0.35, 1 - (uncertaintyScaledGap / 6));

    const analyticalWeight = Math.min(0.9, Math.max(0, (1 - empiricalConfidence) * truncationPenalty * disagreementPenalty));

    const blendedProbability = (finiteAnalyticalProbability * analyticalWeight)
        + (finiteEmpiricalProbability * (1 - analyticalWeight));

    const recommendedProbability = Number.isFinite(blendedProbability) ? blendedProbability : finiteEmpiricalProbability;

    const safeEmpMedian = toFiniteNumber(empMedian, safeMean);
    const safeRawLeft = toFiniteNumber(rawLeft, safeMean);
    const safeRawRight = toFiniteNumber(rawRight, safeMean);

    const diagnostics = {
        simulationCount: safeSimulations,
        empiricalStdErr: Number(empiricalStdErr.toFixed(3)),
        analyticalWeight: Number(analyticalWeight.toFixed(3)),
        rhoUsed: null,
        effectiveN: Math.max(1, toFiniteNumber(historyLength, safeSimulations / 10)),
        shrinkageApplied: null,
        volatilitySources: {
            withinSubject: Number(safeSD.toFixed(2)),
            betweenSubjectContribution: 0
        },
        convergence: {
            targetSE: TARGET_PROB_SE,
            achievedSE: Number(empiricalStdErr.toFixed(4)),
            sufficient: empiricalStdErr < TARGET_PROB_SE * 1.5
        },
        policy: lowSimulation ? 'low_sample' : (highTruncationStress ? 'truncated' : 'standard'),
        flashcardImmunityApplied: safeFlashcardImmunity < 1.0 ? Number(safeFlashcardImmunity.toFixed(3)) : null
    };

    return {
        simulationCount: safeSimulations,
        probability: finiteEmpiricalProbability,
        analyticalProbability: finiteAnalyticalProbability,
        recommendedProbability,
        probabilityPolicy: lowSimulation
            ? 'blended_low_sample_policy'
            : (highTruncationStress ? 'blended_truncated_policy' : 'blended_adaptive_policy'),
        analyticalWeight,
        empiricalStdErr,
        empiricalProbabilityRaw: empiricalProbability,
        empiricalProbabilityBayes: finiteEmpiricalProbability,
        mean: safeDisplayMean,
        sd: projectedSD,
        sdVisual: visualSD,
        sdLeft: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeEmpMedian - safeRawLeft)
        ),
        sdRight: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeRawRight - safeEmpMedian)
        ),
        ci95StatLow: statisticalCi95Low,
        ci95StatHigh: statisticalCi95High,
        ci95Low: displayLow,
        ci95High: displayHigh,
        ci95VisualLow: displayLow,
        ci95VisualHigh: displayHigh,
        ci95VisualClamped: wasVisualCIClamped,
        ciConformalLow: statisticalCi95Low,
        ciConformalHigh: statisticalCi95High,
        currentMean: safeCurrentMean,
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allScores, safeDisplayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal',
        diagnostics
    };
}


function hashObject(obj) {
    try {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'function') return `[fn:${key}]`;
            if (value === undefined) return `[undefined:${key}]`;
            if (typeof value === 'bigint') return value.toString();
            return value;
        });
    } catch {
        return null;
    }
}

export function runMonteCarloAnalysis(params = {}, ...legacyArgs) {
    let resolvedParams = params;
    if (Array.isArray(params)) {
        const [meta, projectionDays, simulations, options] = legacyArgs;
        resolvedParams = {
            values: params,
            meta,
            projectionDays,
            simulations,
            ...(options && typeof options === 'object' ? options : {})
        };
    } else if (!params || typeof params !== 'object') {
        console.warn("[MC Engine] Fallback acionado. 'runMonteCarloAnalysis' requer objeto. Ignorando chamada bruta.");
        return monteCarloSimulation([], 85, 90, 5000, {});
    }

    // ✅ LOTE-04 FIX (A4): aceitar chave pré-computada (ex.: pureStatsHash do hook)
    // para evitar JSON.stringify de payloads enormes a cada chamada.
    const cacheKey = (typeof resolvedParams.cacheKey === 'string' && resolvedParams.cacheKey.length > 0)
        ? resolvedParams.cacheKey
        : hashObject(resolvedParams);
    const cached = getCachedSimulation(cacheKey);
    if (cached) return cached;

    const {
        values = [],
        dates = [],
        meta = 0,
        targetScore: objTargetScore,
        simulations = 5000,
        projectionDays = 90,
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: objMinScore,
        maxScore: objMaxScore,
        subjects: objSubjects,
        historicalCutoffs: objHistoricalCutoffs,
        cacheKey: _providedCacheKey, // ✅ LOTE-04: não vazar para mergedOptions
        ...options
    } = resolvedParams;

    const safeDomain = sanitizeDomain(objMinScore, objMaxScore);
    const domainMin = safeDomain.minScore;
    const domainMax = safeDomain.maxScore;

    const rawResolvedTarget = objTargetScore ?? Number(meta || 0);
    const resolvedTarget = clamp(toFiniteNumber(rawResolvedTarget, domainMin), domainMin, domainMax);

    const safeSimulations = sanitizeSimulations(simulations);
    // ✅ LOTE-03 FIX: "simular hoje" é um caso de uso válido (effectiveSimulateToday)
    const safeProjectionDays = Math.max(0, Math.floor(toFiniteNumber(projectionDays, 90)));

    const safeSubjects = objSubjects === undefined ? undefined : sanitizeSubjects(objSubjects);

    const safeHistoricalCutoffs = objHistoricalCutoffs === undefined
        ? undefined
        : (Array.isArray(objHistoricalCutoffs)
            ? objHistoricalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
            : []);

    const mergedOptions = {
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: domainMin,
        maxScore: domainMax,
        subjects: safeSubjects,
        historicalCutoffs: safeHistoricalCutoffs,
        ...options,
    };

    const extractScore = (value) => {
        if (value && typeof value === 'object') {
            return value.score ?? value.value;
        }
        return value;
    };

    const safeDates = dates || [];
    const safeValues = values || [];

    const history = safeValues
        .map((score, index) => {
            const rawScore = extractScore(score);
            const isNuloOuVazio = rawScore === null || rawScore === undefined || String(rawScore).trim() === '';
            
            const baseObj = (typeof score === 'object' && score !== null) ? score : {};

            return {
                ...baseObj,
                score: isNuloOuVazio ? NaN : Number(rawScore),
                date: safeDates[index] || baseObj.date || getDateKey(new Date())
            };
        })
        .filter(row => Number.isFinite(row.score));

    const result = monteCarloSimulation(history, resolvedTarget, safeProjectionDays, safeSimulations, mergedOptions);
    
    if (cacheKey) {
        setCachedSimulation(cacheKey, result);
    }
    
    return result;
}

export function clearEngineMcCache() {
    clearSimulationCache();
}

export default {
    runMonteCarloAnalysis,
    clearEngineMcCache
};


```

---

### Arquivo: `src/engine/observability/driftMonitor.js`
*Linhas: 502 | Tamanho: 13.1 KB*

```javascript
/**
 * driftMonitor.js
 *
 * Lote 9 — Drift Guard para o Coach.
 *
 * Detecta:
 * - drift de nota;
 * - drift de volatilidade;
 * - drift de calibração;
 * - drift de probabilidade/calibração preditiva;
 *
 * Técnicas:
 * - EWMA control chart;
 * - CUSUM simples;
 * - comparação baseline vs janela recente;
 * - effect size + z-score aproximado.
 */

import {
  computeCalibrationDiagnostics,
  computeBrierScore,
} from '../../utils/calibration.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function finiteSeries(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function meanValues(values) {
  const safe = finiteSeries(values);
  if (safe.length === 0) return 0;
  return safe.reduce((acc, val) => acc + val, 0) / safe.length;
}

function varianceValues(values) {
  const safe = finiteSeries(values);
  if (safe.length < 2) return 0;

  const mean = meanValues(safe);
  const devs = safe.map((value) => Math.pow(value - mean, 2));

  return devs.reduce((acc, val) => acc + val, 0) / (safe.length - 1);
}

function sdValues(values) {
  return Math.sqrt(Math.max(0, varianceValues(values)));
}

/**
 * EWMA control chart.
 */
export function computeEwmaControlChart(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 3) {
    return null;
  }

  const lambda = clampFinite(options.lambda, 0.05, 0.95, 0.2);
  const L = clampFinite(options.L, 1, 5, 2.7);

  const center = meanValues(safe);
  const sigma = sdValues(safe);

  const sigmaEwma = sigma * Math.sqrt(lambda / (2 - lambda));

  let ewma = center;
  const chart = [];
  let violationCount = 0;

  for (let i = 0; i < safe.length; i++) {
    ewma = lambda * safe[i] + (1 - lambda) * ewma;

    const upper = center + L * sigmaEwma;
    const lower = center - L * sigmaEwma;

    const outOfControl = ewma > upper || ewma < lower;

    if (outOfControl) {
      violationCount++;
    }

    chart.push({
      index: i,
      value: safe[i],
      ewma: Number(ewma.toFixed(6)),
      upper: Number(upper.toFixed(6)),
      lower: Number(lower.toFixed(6)),
      outOfControl,
    });
  }

  const last = chart[chart.length - 1];

  return {
    model: 'ewma_control_chart',
    center: Number(center.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    sigmaEwma: Number(sigmaEwma.toFixed(6)),
    lambda,
    L,
    ewma: last.ewma,
    upper: last.upper,
    lower: last.lower,
    outOfControl: last.outOfControl,
    violationCount,
    chart: chart.slice(-30),
  };
}

/**
 * CUSUM simples para detectar mudança de média.
 */
export function cusumDrift(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 5) {
    return null;
  }

  const baselineSize = Math.max(3, Math.floor(safe.length * 0.6));
  const baseline = safe.slice(0, baselineSize);

  const target = meanValues(baseline);
  const sigma = sdValues(baseline) || 1e-6;

  const k = clampFinite(options.k, 0, 5, 0.5) * sigma;
  const h = clampFinite(options.h, 1, 20, 4) * sigma;

  let sPos = 0;
  let sNeg = 0;
  let alarm = null;

  const series = [];

  for (const value of safe) {
    const deviation = value - target;

    sPos = Math.max(0, sPos + deviation - k);
    sNeg = Math.max(0, sNeg - deviation - k);

    if (!alarm && (sPos > h || sNeg > h)) {
      alarm = sPos > h ? 'up' : 'down';
    }

    series.push({
      value,
      sPos: Number(sPos.toFixed(6)),
      sNeg: Number(sNeg.toFixed(6)),
    });
  }

  return {
    model: 'cusum',
    target: Number(target.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    k: Number(k.toFixed(6)),
    h: Number(h.toFixed(6)),
    alarm,
    sPos: Number(sPos.toFixed(6)),
    sNeg: Number(sNeg.toFixed(6)),
    series: series.slice(-30),
  };
}

/**
 * Detecta drift genérico em uma série numérica.
 */
export function detectDriftInSeries(values, options = {}) {
  const safe = finiteSeries(values);

  const recentWindow = Math.round(clampFinite(options.recentWindow, 2, 30, 5));
  const minSamples = Math.round(clampFinite(options.minSamples, 4, 200, 8));

  if (safe.length < minSamples) {
    return null;
  }

  const recent = safe.slice(-recentWindow);

  const baseline = safe.slice(
    0,
    Math.max(3, safe.length - recent.length)
  );

  if (baseline.length < 3 || recent.length < 2) {
    return null;
  }

  const baselineMean = meanValues(baseline);
  const recentMean = meanValues(recent);

  const baselineSd = sdValues(baseline);
  const recentSd = sdValues(recent);

  const delta = recentMean - baselineMean;

  const epsilon = Math.max(
    1e-6,
    Number(options.epsilon) || Math.abs(baselineMean) * 0.02 || 1
  );

  const effectSize = delta / Math.max(epsilon, baselineSd);

  const se = Math.sqrt(
    (baselineSd * baselineSd) / baseline.length +
    (recentSd * recentSd) / recent.length
  );

  const zScore = se > 1e-9 ? delta / se : 0;

  const effectThresholdLow = clampFinite(options.effectThresholdLow, 0, 5, 0.5);
  const effectThresholdMedium = clampFinite(options.effectThresholdMedium, 0, 6, 1.0);
  const effectThresholdHigh = clampFinite(options.effectThresholdHigh, 0, 8, 1.8);

  let severity = 'none';

  const absEffect = Math.abs(effectSize);
  const absZ = Math.abs(zScore);

  if (absEffect >= effectThresholdHigh || absZ >= 3) {
    severity = 'high';
  } else if (absEffect >= effectThresholdMedium || absZ >= 2) {
    severity = 'medium';
  } else if (absEffect >= effectThresholdLow) {
    severity = 'low';
  }

  let direction = 'none';

  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';

  const ewma = computeEwmaControlChart(safe, options);
  const cusum = cusumDrift(safe, options);

  const outOfControl =
    Boolean(ewma?.outOfControl) ||
    Boolean(cusum?.alarm && cusum.alarm === direction);

  return {
    model: 'baseline_recent_drift',
    direction,
    severity,
    baselineMean: Number(baselineMean.toFixed(6)),
    recentMean: Number(recentMean.toFixed(6)),
    delta: Number(delta.toFixed(6)),
    effectSize: Number(effectSize.toFixed(6)),
    zScore: Number(zScore.toFixed(6)),
    baselineSize: baseline.length,
    recentSize: recent.length,
    sampleSize: safe.length,
    outOfControl,
    ewma,
    cusum,
  };
}

/**
 * Detecta drift de notas.
 */
export function detectScoreDrift(scores = [], options = {}) {
  const result = detectDriftInSeries(scores, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'score',
    badDirection: 'down',
    isBadDrift: result.direction === 'down' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de volatilidade.
 */
export function detectVolatilityDrift(volatilities = [], options = {}) {
  const result = detectDriftInSeries(volatilities, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'volatility',
    badDirection: 'up',
    isBadDrift: result.direction === 'up' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de calibração usando eventos de telemetria.
 *
 * Eventos esperados:
 * { timestamp, avgBrier, ece, calibrationPenalty }
 */
export function detectCalibrationDrift(events = [], options = {}) {
  const safeEvents = (Array.isArray(events) ? events : [])
    .filter(Boolean)
    .filter(
      (event) =>
        Number.isFinite(Number(event?.avgBrier)) ||
        Number.isFinite(Number(event?.ece)) ||
        Number.isFinite(Number(event?.calibrationPenalty))
    )
    .sort((a, b) => {
      const timeA = Number(a?.timestamp) || 0;
      const timeB = Number(b?.timestamp) || 0;
      return timeA - timeB;
    });

  if (safeEvents.length < 6) {
    return null;
  }

  const extract = (key) =>
    safeEvents
      .map((event) => Number(event?.[key]))
      .filter((value) => Number.isFinite(value));

  const brierSeries = extract('avgBrier');
  const eceSeries = extract('ece');
  const penaltySeries = extract('calibrationPenalty');

  const brierDrift = detectDriftInSeries(brierSeries, options);
  const eceDrift = detectDriftInSeries(eceSeries, options);
  const penaltyDrift = detectDriftInSeries(penaltySeries, options);

  const enrichBadDirection = (drift) => {
    if (!drift) return null;

    return {
      ...drift,
      badDirection: 'up',
      isBadDrift: drift.direction === 'up' && drift.severity !== 'none',
    };
  };

  const enrichedBrier = enrichBadDirection(brierDrift);
  const enrichedEce = enrichBadDirection(eceDrift);
  const enrichedPenalty = enrichBadDirection(penaltyDrift);

  const candidates = [enrichedBrier, enrichedEce, enrichedPenalty].filter(
    Boolean
  );

  const hasDrift = candidates.some(
    (candidate) => candidate.isBadDrift
  );

  const severityRank = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  const worst = candidates.reduce(
    (acc, candidate) => {
      if (!candidate?.isBadDrift) return acc;

      const candidateRank = severityRank[candidate.severity] || 0;
      const accRank = severityRank[acc?.severity] || 0;

      return candidateRank > accRank ? candidate : acc;
    },
    null
  );

  return {
    metric: 'calibration',
    brier: enrichedBrier,
    ece: enrichedEce,
    penalty: enrichedPenalty,
    hasDrift,
    worstSeverity: worst?.severity || 'none',
    worstMetric: worst?.metric || null,
    sampleSize: safeEvents.length,
  };
}

/**
 * Detecta drift de calibração em pares probabilidade vs resultado.
 *
 * pairs:
 * [{ probability: 0.62, observed: 1 }]
 */
export function detectProbabilityCalibrationDrift(pairs = [], options = {}) {
  const safePairs = (Array.isArray(pairs) ? pairs : [])
    .map((pair) => ({
      probability: clampFinite(pair?.probability, 0, 1, NaN),
      observed: clampFinite(pair?.observed, 0, 1, NaN),
      timestamp: Number(pair?.timestamp) || 0,
    }))
    .filter(
      (pair) =>
        Number.isFinite(pair.probability) &&
        Number.isFinite(pair.observed)
    )
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp && a.timestamp > 0 && b.timestamp > 0) {
        return a.timestamp - b.timestamp;
      }
      return 0;
    });

  if (safePairs.length < 8) {
    return null;
  }

  const recentFraction = clampFinite(options.recentFraction, 0.2, 0.6, 0.4);
  const splitIndex = Math.floor(safePairs.length * (1 - recentFraction));

  const baselinePairs = safePairs.slice(0, splitIndex);
  const recentPairs = safePairs.slice(splitIndex);

  if (baselinePairs.length < 4 || recentPairs.length < 4) {
    return null;
  }

  const baselineDiagnostics = computeCalibrationDiagnostics(baselinePairs, {
    bins: options.bins ?? 5,
  });

  const recentDiagnostics = computeCalibrationDiagnostics(recentPairs, {
    bins: options.bins ?? 5,
  });

  const baselineBrier = meanValues(
    baselinePairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const recentBrier = meanValues(
    recentPairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const deltaBrier = recentBrier - baselineBrier;
  const safeRecentEce = Number.isFinite(recentDiagnostics.ece) ? recentDiagnostics.ece : 0;
  const safeBaselineEce = Number.isFinite(baselineDiagnostics.ece) ? baselineDiagnostics.ece : 0;
  const deltaEce = safeRecentEce - safeBaselineEce;

  let severity = 'none';

  if (
    deltaBrier > 0.05 ||
    deltaEce > 0.08
  ) {
    severity = 'high';
  } else if (
    deltaBrier > 0.02 ||
    deltaEce > 0.04
  ) {
    severity = 'medium';
  } else if (deltaBrier > 0.01 || deltaEce > 0.02) {
    severity = 'low';
  }

  return {
    metric: 'probability_calibration',
    severity,
    direction: severity === 'none' ? 'none' : 'degraded',
    baseline: {
      count: baselinePairs.length,
      brier: Number(baselineBrier.toFixed(6)),
      ece: Number.isFinite(baselineDiagnostics.ece) ? Number(baselineDiagnostics.ece.toFixed(6)) : null,
      mce: Number.isFinite(baselineDiagnostics.mce) ? Number(baselineDiagnostics.mce.toFixed(6)) : null,
    },
    recent: {
      count: recentPairs.length,
      brier: Number(recentBrier.toFixed(6)),
      ece: Number.isFinite(recentDiagnostics.ece) ? Number(recentDiagnostics.ece.toFixed(6)) : null,
      mce: Number.isFinite(recentDiagnostics.mce) ? Number(recentDiagnostics.mce.toFixed(6)) : null,
    },
    deltas: {
      brier: Number(deltaBrier.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
      mce: (Number.isFinite(recentDiagnostics.mce) && Number.isFinite(baselineDiagnostics.mce)) 
             ? Number((recentDiagnostics.mce - baselineDiagnostics.mce).toFixed(6)) 
             : null,
    },
    isBadDrift: severity !== 'none',
  };
}

export default {
  computeEwmaControlChart,
  cusumDrift,
  detectDriftInSeries,
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
};


```

---

### Arquivo: `src/engine/observability/modelHealth.js`
*Linhas: 566 | Tamanho: 14.7 KB*

```javascript
/**
 * modelHealth.js
 *
 * Lote 9 — Model health scoring para o Coach.
 *
 * Combina:
 * - drift de calibração;
 * - drift de probabilidade;
 * - drift de nota;
 * - drift de volatilidade;
 * - qualidade de calibração atual;
 * - volume amostral;
 * - governança de flags experimentais.
 */

import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from './driftMonitor.js';

import {
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const HEALTH_STORAGE_KEY = 'coach_model_health_v1';
const HEALTH_STORAGE_MAX = 100;

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function createAlert({
  id,
  type,
  severity,
  message,
  metric = null,
}) {
  return {
    id,
    type,
    severity,
    message,
    metric,
    createdAt: Date.now(),
  };
}

/**
 * Avalia a saúde matemática do modelo.
 */
export function evaluateModelHealth(input = {}, options = {}) {
  const alerts = [];
  const metrics = {};

  let healthScore = 100;

  const calibrationEvents = Array.isArray(input.calibrationEvents)
    ? input.calibrationEvents
    : [];

  const probabilityPairs = Array.isArray(input.probabilityPairs)
    ? input.probabilityPairs
    : [];

  const scores = Array.isArray(input.scores) ? input.scores : [];
  const volatilities = Array.isArray(input.volatilities)
    ? input.volatilities
    : [];

  const features = input.features && typeof input.features === 'object'
    ? input.features
    : {};

  // ==================== CALIBRATION DRIFT ====================
  const calibrationDrift = detectCalibrationDrift(
    calibrationEvents,
    options.calibration || {}
  );

  metrics.calibrationDrift = calibrationDrift;

  if (calibrationDrift?.hasDrift) {
    const severity = calibrationDrift.worstSeverity;

    if (severity === 'high') {
      healthScore -= 25;

      alerts.push(
        createAlert({
          id: 'calibration_drift_high',
          type: 'calibration_drift',
          severity: 'high',
          message:
            'A calibração do modelo degradou significativamente nas amostras recentes.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'medium') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'calibration_drift_medium',
          type: 'calibration_drift',
          severity: 'medium',
          message:
            'A calibração do modelo apresentou degradação moderada recentemente.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'low') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'calibration_drift_low',
          type: 'calibration_drift',
          severity: 'low',
          message: 'Leve degradação de calibração detectada.',
          metric: calibrationDrift.worstMetric,
        })
      );
    }
  }

  // ==================== PROBABILITY CALIBRATION DRIFT ====================
  const probabilityCalibrationDrift = detectProbabilityCalibrationDrift(
    probabilityPairs,
    options.probabilityPairs || {}
  );

  metrics.probabilityCalibrationDrift = probabilityCalibrationDrift;

  if (probabilityCalibrationDrift?.isBadDrift) {
    if (probabilityCalibrationDrift.severity === 'high') {
      healthScore -= 20;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_high',
          type: 'probability_calibration_drift',
          severity: 'high',
          message:
            'As probabilidades previstas estão perdendo confiabilidade recentemente.',
          metric: 'probability_pairs',
        })
      );
    } else if (probabilityCalibrationDrift.severity === 'medium') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_medium',
          type: 'probability_calibration_drift',
          severity: 'medium',
          message:
            'Há sinais de degradação na confiabilidade das probabilidades previstas.',
          metric: 'probability_pairs',
        })
      );
    } else {
      healthScore -= 4;
    }
  }

  // ==================== CURRENT CALIBRATION QUALITY ====================
  if (probabilityPairs.length >= 5) {
    const diagnostics = computeCalibrationDiagnostics(probabilityPairs, {
      bins: options.bins ?? 6,
    });

    metrics.currentCalibration = {
      count: probabilityPairs.length,
      ece: Number.isFinite(diagnostics.ece) ? Number(diagnostics.ece.toFixed(6)) : 0,
      mce: Number.isFinite(diagnostics.mce) ? Number(diagnostics.mce.toFixed(6)) : 0,
      reliability: diagnostics.reliability || [],
      brierDecomposition: diagnostics.brierDecomposition || null,
    };

    if (diagnostics.ece !== null && diagnostics.ece > 0.15) {
      healthScore -= 15;

      alerts.push(
        createAlert({
          id: 'current_calibration Poor',
          type: 'current_calibration',
          severity: 'high',
          message: 'O erro de calibração atual está alto.',
          metric: 'ece',
        })
      );
    } else if (diagnostics.ece > 0.10) {
      healthScore -= 8;

      alerts.push(
        createAlert({
          id: 'current_calibration_moderate',
          type: 'current_calibration',
          severity: 'medium',
          message: 'O erro de calibração atual está moderado.',
          metric: 'ece',
        })
      );
    }
  } else {
    metrics.currentCalibration = {
      count: probabilityPairs.length,
      status: 'insufficient_data',
    };
  }

  // ==================== SCORE DRIFT ====================
  const scoreDrift = detectScoreDrift(scores, options.score || {});
  metrics.scoreDrift = scoreDrift;

  if (scoreDrift?.isBadDrift) {
    if (scoreDrift.severity === 'high') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'score_drift_high',
          type: 'performance_drift',
          severity: 'high',
          message: 'Queda relevante de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    } else if (scoreDrift.severity === 'medium') {
      healthScore -= 6;

      alerts.push(
        createAlert({
          id: 'score_drift_medium',
          type: 'performance_drift',
          severity: 'medium',
          message: 'Queda moderada de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    }
  }

  // ==================== VOLATILITY DRIFT ====================
  const volatilityDrift = detectVolatilityDrift(
    volatilities,
    options.volatility || {}
  );

  metrics.volatilityDrift = volatilityDrift;

  if (volatilityDrift?.isBadDrift) {
    if (volatilityDrift.severity === 'high') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'volatility_drift_high',
          type: 'volatility_drift',
          severity: 'high',
          message: 'A volatilidade do desempenho aumentou significativamente.',
          metric: 'volatility',
        })
      );
    } else if (volatilityDrift.severity === 'medium') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'volatility_drift_medium',
          type: 'volatility_drift',
          severity: 'medium',
          message: 'A volatilidade do desempenho aumentou moderadamente.',
          metric: 'volatility',
        })
      );
    }
  }

  // ==================== SAMPLE ADEQUACY ====================
  const sampleSize = Number.isFinite(Number(input.sampleSize))
    ? Number(input.sampleSize)
    : scores.length;

  metrics.sampleSize = sampleSize;

  if (sampleSize < 5) {
    healthScore -= 15;

    alerts.push(
      createAlert({
        id: 'low_sample_size',
        type: 'data_adequacy',
        severity: 'high',
        message:
          'Há poucos dados para confiar nas projeções atuais. O sistema deve operar com mais conservadorismo.',
        metric: 'sample_size',
      })
    );
  } else if (sampleSize < 10) {
    healthScore -= 7;

    alerts.push(
      createAlert({
        id: 'moderate_sample_size',
        type: 'data_adequacy',
        severity: 'medium',
        message:
          'A quantidade de dados ainda é moderada. Projeções devem ser interpretadas com cautela.',
        metric: 'sample_size',
      })
    );
  }

  // ==================== FLAG GOVERNANCE ====================
  const experimentalFlags = [
    'useStateSpace',
    'useDynamicVolatility',
    'usePosteriorMonteCarlo',
    'useBayesianTopics',
    'useDecisionUtility',
    'useBanditPlanner',
    'useKnowledgeGraph',
    'useAdvancedFsrs',
  ];

  const activeExperimentalFlags = experimentalFlags.filter(
    (flag) => features[flag] === true
  );

  metrics.activeExperimentalFlags = activeExperimentalFlags;

  if (activeExperimentalFlags.length > 4) {
    healthScore -= 6;

    alerts.push(
      createAlert({
        id: 'too_many_experimental_flags',
        type: 'flag_governance',
        severity: 'medium',
        message:
          'Muitas flags experimentais estão ativas simultaneamente. Isso dificulta atribuir causa a mudanças de desempenho.',
        metric: 'experimental_flags',
      })
    );
  }

  // ==================== TELEMETRY STALENESS ====================
  const lastTelemetryTimestamp = Number(input.lastTelemetryTimestamp) || 0;

  if (lastTelemetryTimestamp > 0) {
    const daysSinceTelemetry =
      (Date.now() - lastTelemetryTimestamp) / 86400000;

    metrics.daysSinceLastTelemetry = Number(daysSinceTelemetry.toFixed(2));

    if (daysSinceTelemetry > 14) {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'stale_telemetry',
          type: 'telemetry',
          severity: 'low',
          message:
            'A telemetria de calibração está antiga. A avaliação de saúde pode estar defasada.',
          metric: 'telemetry_age',
        })
      );
    }
  } else {
    metrics.daysSinceLastTelemetry = null;
  }

  healthScore = clampFinite(healthScore, 0, 100, 100);

  let status = 'healthy';

  if (healthScore < 60) {
    status = 'critical';
  } else if (healthScore < 80) {
    status = 'degraded';
  }

  const recommendations = [];

  if (status === 'critical') {
    recommendations.push(
      'Reduza flags experimentais e volte para uma configuração mais conservadora.'
    );
  }

  if (alerts.some((alert) => alert.type === 'calibration_drift')) {
    recommendations.push(
      'Revise os thresholds de calibração e aumente o shrinkage de probabilidade.'
    );
  }

  if (alerts.some((alert) => alert.type === 'volatility_drift')) {
    recommendations.push(
      'Aumente a suavização de volatilidade e reduza a confiança em tendências recentes.'
    );
  }

  if (alerts.some((alert) => alert.type === 'performance_drift')) {
    recommendations.push(
      'Verifique se houve mudança real de nível do aluno ou apenas ruído amostral.'
    );
  }

  if (alerts.some((alert) => alert.type === 'data_adequacy')) {
    recommendations.push(
      'Evite decisões agressivas enquanto houver poucos dados.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'O sistema está estável. Mantenha monitoramento contínuo.'
    );
  }

  return {
    healthScore: Number(healthScore.toFixed(2)),
    status,
    generatedAt: Date.now(),
    alerts,
    metrics,
    recommendations,
  };
}

/**
 * Gera dados prontos para dashboard.
 */
export function generateHealthDashboard(health = {}) {
  if (!health || typeof health !== 'object') return null;

  const metrics = health.metrics || {};
  const alerts = health.alerts || [];

  return {
    generatedAt: health.generatedAt || Date.now(),
    healthScore: health.healthScore ?? null,
    status: health.status ?? 'unknown',
    cards: [
      {
        id: 'health_score',
        label: 'Health Score',
        value: health.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'sample_size',
        label: 'Amostras',
        value: metrics.sampleSize ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'calibration_drift',
        label: 'Drift de Calibração',
        value: metrics.calibrationDrift?.worstSeverity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'score_drift',
        label: 'Drift de Nota',
        value: metrics.scoreDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'volatility_drift',
        label: 'Drift de Volatilidade',
        value: metrics.volatilityDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'experimental_flags',
        label: 'Flags Experimentais',
        value: Array.isArray(metrics.activeExperimentalFlags)
          ? metrics.activeExperimentalFlags.length
          : 0,
        goodDirection: 'lower',
      },
    ],
    alerts,
    recommendations: health.recommendations || [],
    metrics,
  };
}

/**
 * Salva snapshot de saúde.
 */
export function saveModelHealthSnapshot(snapshot) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];

    const next = [...current, snapshot]
      .filter(Boolean)
      .slice(-HEALTH_STORAGE_MAX);

    storage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega snapshots de saúde.
 */
export function loadModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa snapshots de saúde.
 */
export function clearModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(HEALTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
};


```

---

### Arquivo: `src/engine/optimization/autoTuner.js`
*Linhas: 379 | Tamanho: 9.4 KB*

```javascript
/**
 * autoTuner.js
 *
 * Lote 10 — Auto Tuner do Coach.
 *
 * Combina:
 * - avaliações do Lote 8;
 * - health snapshots do Lote 9;
 * - backtests salvos;
 * - flagOptimizer.
 */

import {
  rankStrategies,
  recommendFlagConfig,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
} from './flagOptimizer.js';

const TUNER_HISTORY_KEY = 'coach_auto_tuner_history_v1';
const BACKTEST_REPORT_KEY = 'coach_strategy_backtest_v1';
const EVALUATION_RESULTS_KEY = 'coach_evaluation_results_v1';
const MODEL_HEALTH_KEY = 'coach_model_health_v1';

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function loadJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return null;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

/**
 * Salva relatório de backtest para uso pelo AutoTuner.
 */
export function saveBacktestReport(report) {
  return saveJson(BACKTEST_REPORT_KEY, report || null);
}

/**
 * Carrega último relatório de backtest salvo.
 */
export function loadLastBacktestReport() {
  return loadJson(BACKTEST_REPORT_KEY, null);
}

/**
 * Carrega avaliações salvas pelo Lote 8.
 */
export function loadEvaluationResultsLocal() {
  const parsed = loadJson(EVALUATION_RESULTS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Carrega health snapshots salvos pelo Lote 9.
 */
export function loadHealthSnapshotsLocal() {
  const parsed = loadJson(MODEL_HEALTH_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Resume avaliações por estratégia quando não há backtest salvo.
 */
export function summarizeEvaluationsByStrategy(evaluations = []) {
  const safeEvaluations = Array.isArray(evaluations)
    ? evaluations.filter(Boolean)
    : [];

  const groups = {};

  safeEvaluations.forEach((evaluation) => {
    const strategyId = evaluation?.strategyId || 'unknown';

    if (!groups[strategyId]) {
      groups[strategyId] = {
        brier: [],
        logLoss: [],
        probabilityAbsoluteError: [],
        mae: [],
        ndcg: [],
        uplift: [],
      };
    }

    const group = groups[strategyId];

    const probability = evaluation?.probabilityEvaluation;

    if (probability) {
      if (Number.isFinite(probability.brier)) {
        group.brier.push(probability.brier);
      }

      if (Number.isFinite(probability.logLoss)) {
        group.logLoss.push(probability.logLoss);
      }

      if (Number.isFinite(probability.absoluteError)) {
        group.probabilityAbsoluteError.push(probability.absoluteError);
      }
    }

    const score = evaluation?.scoreEvaluation;

    if (score && Number.isFinite(score.absoluteError)) {
      group.mae.push(score.absoluteError);
    }

    const topics = evaluation?.topicEvaluation;

    if (topics && Number.isFinite(topics.ndcg)) {
      group.ndcg.push(topics.ndcg);
    }

    const uplift = evaluation?.taskUpliftEvaluation?.uplift;

    if (Number.isFinite(uplift)) {
      group.uplift.push(uplift);
    }
  });

  const summaries = {};

  Object.entries(groups).forEach(([strategyId, group]) => {
    const count = Math.max(
      group.brier.length,
      group.mae.length,
      group.ndcg.length,
      group.uplift.length,
      1
    );

    summaries[strategyId] = {
      count,
      probability: {
        avgBrier: meanValues(group.brier),
        avgLogLoss: meanValues(group.logLoss),
        avgAbsoluteError: meanValues(group.probabilityAbsoluteError),
      },
      score: {
        mae: meanValues(group.mae),
      },
      topics: {
        avgNdcg: meanValues(group.ndcg),
      },
      tasks: {
        avgUplift: meanValues(group.uplift),
      },
    };
  });

  return summaries;
}

/**
 * Salva histórico do AutoTuner.
 */
export function saveTunerHistory(report) {
  const current = loadJson(TUNER_HISTORY_KEY, []);
  const safeCurrent = Array.isArray(current) ? current : [];

  const next = [...safeCurrent, report].filter(Boolean).slice(-50);

  return saveJson(TUNER_HISTORY_KEY, next);
}

/**
 * Carrega histórico do AutoTuner.
 */
export function loadTunerHistory() {
  const parsed = loadJson(TUNER_HISTORY_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Executa um ciclo completo de auto-tuning.
 */
export function runAutoTunerCycle(options = {}) {
  loadPersistedCoachFlags();

  const evaluations = Array.isArray(options.evaluations)
    ? options.evaluations
    : loadEvaluationResultsLocal();

  const healthSnapshots = Array.isArray(options.healthSnapshots)
    ? options.healthSnapshots
    : loadHealthSnapshotsLocal();

  const latestHealth =
    healthSnapshots.length > 0
      ? healthSnapshots[healthSnapshots.length - 1]
      : null;

  const backtestReport =
    options.backtestReport !== undefined
      ? options.backtestReport
      : loadLastBacktestReport();

  let summaries = {};

  if (
    backtestReport &&
    backtestReport.summaries &&
    typeof backtestReport.summaries === 'object' &&
    Object.keys(backtestReport.summaries).length > 0
  ) {
    summaries = backtestReport.summaries;
  } else {
    summaries = summarizeEvaluationsByStrategy(evaluations);
  }

  const ranked = rankStrategies(summaries, latestHealth, {
    maxScore: options.maxScore ?? 100,
    strategySpace: options.strategySpace,
  });

  const recommendation = recommendFlagConfig({
    ranked,
    latestHealth,
    currentFeatures: globalThis.__COACH_FEATURES__ || {},
    minImprovement: options.minImprovement ?? 0.02,
    allowRollback: options.allowRollback !== false,
    exploration: options.exploration === true,
    seed: options.seed,
  });

  let applied = false;

  if (options.autoApply === true) {
    applied = applyRecommendedFlags(recommendation, {
      force: options.forceApply === true,
    });
  }

  const report = {
    generatedAt: Date.now(),
    mode: {
      autoApply: options.autoApply === true,
      forceApply: options.forceApply === true,
      exploration: options.exploration === true,
      allowRollback: options.allowRollback !== false,
    },
    inputs: {
      evaluationsCount: evaluations.length,
      healthSnapshotsCount: healthSnapshots.length,
      summariesCount: Object.keys(summaries).length,
      hasBacktestReport: Boolean(backtestReport),
    },
    latestHealth: latestHealth
      ? {
          healthScore: latestHealth.healthScore ?? null,
          status: latestHealth.status ?? null,
          alertsCount: Array.isArray(latestHealth.alerts)
            ? latestHealth.alerts.length
            : 0,
        }
      : null,
    ranked: ranked.map((strategy) => ({
      id: strategy.id,
      label: strategy.label,
      score: Number(strategy.score.toFixed(6)),
      hasEvidence: strategy.hasEvidence,
      evaluation: strategy.evaluation,
    })),
    recommendation: {
      action: recommendation.action,
      strategyId: recommendation.strategyId,
      reason: recommendation.reason,
      features: recommendation.features,
      score: recommendation.score ?? null,
      baselineScore: recommendation.baselineScore ?? null,
    },
    applied,
  };

  if (options.saveHistory !== false) {
    saveTunerHistory(report);
  }

  return report;
}

/**
 * Constrói dashboard simples do AutoTuner.
 */
export function buildAutoTunerDashboard(report = {}) {
  if (!report || typeof report !== 'object') return null;

  return {
    generatedAt: report.generatedAt || Date.now(),
    cards: [
      {
        id: 'recommended_action',
        label: 'Ação recomendada',
        value: report.recommendation?.action || 'unknown',
      },
      {
        id: 'recommended_strategy',
        label: 'Estratégia recomendada',
        value: report.recommendation?.strategyId || 'baseline',
      },
      {
        id: 'health_score',
        label: 'Health Score',
        value: report.latestHealth?.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'evaluations',
        label: 'Avaliações',
        value: report.inputs?.evaluationsCount ?? 0,
      },
      {
        id: 'summaries',
        label: 'Estratégias avaliadas',
        value: report.inputs?.summariesCount ?? 0,
      },
      {
        id: 'applied',
        label: 'Aplicado automaticamente',
        value: report.applied ? 'Sim' : 'Não',
      },
    ],
    recommendation: report.recommendation || null,
    ranked: report.ranked || [],
    latestHealth: report.latestHealth || null,
  };
}

export default {
  saveBacktestReport,
  loadLastBacktestReport,
  loadEvaluationResultsLocal,
  loadHealthSnapshotsLocal,
  summarizeEvaluationsByStrategy,
  saveTunerHistory,
  loadTunerHistory,
  runAutoTunerCycle,
  buildAutoTunerDashboard,
};


```

---

### Arquivo: `src/engine/optimization/flagOptimizer.js`
*Linhas: 685 | Tamanho: 17.0 KB*

```javascript
/**
 * flagOptimizer.js
 *
 * Lote 10 — Meta Optimization & Auto Flags
 *
 * Responsável por:
 * - definir estratégias de flags;
 * - pontuar estratégias com base em avaliação e saúde;
 * - recomendar promoção/manutenção/rollback;
 * - aplicar flags com segurança;
 * - persistir configuração ativa.
 */

const OPTIMIZER_STATE_KEY = 'coach_flag_optimizer_state_v1';
const ACTIVE_FLAGS_KEY = 'coach_active_flags_v1';

import { writeFlags, readFlags } from '../../utils/coachFeatureStore.js';

export const EXPERIMENTAL_MATH_FLAGS = [
  'useStateSpace',
  'useStateSpaceAverage',
  'useStateSpaceTrend',

  'useDynamicVolatility',
  'useGarchVolatility',
  'useDynamicVolatilityOverride',

  'usePosteriorMonteCarlo',
  'usePosteriorMonteCarloOverride',

  'useBayesianTopics',
  'useBayesianTopicsForUrgency',

  'useDecisionUtility',
  'useDecisionUtilityForTopics',
  'useDecisionUtilityForBestTask',
  'useBanditPlanner',

  'useKnowledgeGraph',
  'useKnowledgeGraphForTopics',
  'useAdvancedFsrs',
  'useFsrsForSrsBoost',
  'useFsrsTopicScheduling',

  'useCausalUplift',
  'usePersonalizedPolicy',
  'useCausalTaskSelection',
  'useCausalBootstrap',
];

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function loadJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleBeta(alpha, beta, rng) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));

  const gaussian = () => {
    let u = rng();
    let v = rng();

    let attemptsU = 0;
    while (u === 0 && attemptsU < 100) { u = rng(); attemptsU++; }
    if (u <= 0) u = 1e-15;

    let attemptsV = 0;
    while (v === 0 && attemptsV < 100) { v = rng(); attemptsV++; }
    if (v <= 0) v = 1e-15;

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  return clampFinite(mean + gaussian() * sd, 0, 1, mean);
}

/**
 * Retorna a configuração segura de baseline.
 */
export function getSafeBaselineFeatures() {
  const safe = {};

  EXPERIMENTAL_MATH_FLAGS.forEach((flag) => {
    safe[flag] = false;
  });

  return safe;
}

/**
 * Carrega flags persistidas e aplica no globalThis.__COACH_FEATURES__.
 */
export function loadPersistedCoachFlags() {
  const persisted = loadJson(ACTIVE_FLAGS_KEY, null);

  if (persisted && typeof persisted === 'object') {
    writeFlags(persisted);
  }

  return readFlags();
}

/**
 * Persiste flags ativas.
 */
export function persistCoachFlags(flags) {
  return saveJson(ACTIVE_FLAGS_KEY, flags || {});
}

/**
 * Espaço de estratégias.
 */
export function getStrategySpace() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior Monte Carlo',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'lot11-causal-policy',
      label: 'Lote 11 — Causal Uplift & Policy',
      features: {
        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
    {
      id: 'conservative',
      label: 'Conservador — Lotes 1 + 2',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'balanced',
      label: 'Equilibrado — Lotes 1 + 2 + 3 + 4',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
        usePosteriorMonteCarlo: true,
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'all-math-lots',
      label: 'Completo — Todos os lotes matemáticos',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,

        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
  ];
}

/**
 * Pontua uma estratégia com base em avaliação e saúde.
 */
export function scoreStrategyEvaluation(summary = {}, latestHealth = null, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const count = Math.max(0, Math.round(Number(summary?.count) || 0));

  const brier = clampFinite(summary?.probability?.avgBrier, 0, 1, NaN);

  const calibrationError = Number.isFinite(summary?.probability?.ece)
    ? summary.probability.ece
    : Number.isFinite(summary?.probability?.avgAbsoluteError)
      ? summary.probability.avgAbsoluteError
      : NaN;

  const mae = clampFinite(summary?.score?.mae, 0, maxScore, NaN);
  const ndcg = clampFinite(summary?.topics?.avgNdcg, 0, 1, NaN);
  const uplift = clampFinite(summary?.tasks?.avgUplift, -maxScore, maxScore, NaN);

  // Scores normalizados.
  const brierScore = Number.isFinite(brier)
    ? 1 - clampFinite(brier / 0.30, 0, 1, 1)
    : 0.35;

  const calibrationScore = Number.isFinite(calibrationError)
    ? 1 - clampFinite(calibrationError / 0.20, 0, 1, 1)
    : 0.35;

  const maeScore = Number.isFinite(mae)
    ? 1 - clampFinite(mae / (maxScore * 0.10), 0, 1, 1)
    : 0.35;

  const ndcgScore = Number.isFinite(ndcg)
    ? clampFinite(ndcg, 0, 1, 0.35)
    : 0.35;

  const upliftScore = Number.isFinite(uplift)
    ? 0.5 + clampFinite(uplift / (maxScore * 0.10), -0.5, 0.5, 0)
    : 0.5;

  const quality =
    brierScore * 0.35 +
    calibrationScore * 0.15 +
    maeScore * 0.20 +
    ndcgScore * 0.20 +
    upliftScore * 0.10;

  const healthScore = latestHealth?.healthScore != null
    ? clampFinite(latestHealth.healthScore, 0, 100, 80) / 100
    : 0.8;

  const sampleConfidence = count / (count + 10);

  const finalScore =
    (quality * 0.70 + healthScore * 0.30) *
    (0.45 + 0.55 * sampleConfidence);

  return {
    strategyId: summary?.strategyId ?? null,
    final: Number(finalScore.toFixed(6)),
    quality: Number(quality.toFixed(6)),
    healthScore: Number(healthScore.toFixed(4)),
    sampleConfidence: Number(sampleConfidence.toFixed(4)),
    components: {
      brierScore: Number(brierScore.toFixed(4)),
      calibrationScore: Number(calibrationScore.toFixed(4)),
      maeScore: Number(maeScore.toFixed(4)),
      ndcgScore: Number(ndcgScore.toFixed(4)),
      upliftScore: Number(upliftScore.toFixed(4)),
    },
  };
}

/**
 * Ranqueia estratégias.
 */
export function rankStrategies(summaries = {}, latestHealth = null, options = {}) {
  const strategySpace = Array.isArray(options.strategySpace)
    ? options.strategySpace
    : getStrategySpace();

  const ranked = strategySpace.map((strategy) => {
    const summary = summaries?.[strategy.id] || null;

    const evaluation = scoreStrategyEvaluation(
      summary
        ? {
            ...summary,
            strategyId: strategy.id,
          }
        : {
            count: 0,
            strategyId: strategy.id,
          },
      latestHealth,
      options
    );

    return {
      ...strategy,
      hasEvidence: Boolean(summary && Number(summary.count) > 0),
      score: summary ? evaluation.final : 0,
      evaluation,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Estado do otimizador para Thompson Sampling.
 */
export function loadOptimizerState() {
  const state = loadJson(OPTIMIZER_STATE_KEY, {});
  return state && typeof state === 'object' ? state : {};
}

export function saveOptimizerState(state) {
  return saveJson(OPTIMIZER_STATE_KEY, state || {});
}

export function clearOptimizerState() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(OPTIMIZER_STATE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Registra recompensa de uma estratégia.
 */
export function recordStrategyOutcome(strategyId, reward, options = {}) {
  if (!strategyId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadOptimizerState();
  const key = String(strategyId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  entry.alpha = Math.min(maxCount, (entry.alpha || 0) + normalizedReward);
  entry.beta = Math.min(maxCount, (entry.beta || 0) + (1 - normalizedReward));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveOptimizerState(state);

  return entry;
}

/**
 * Seleciona estratégia por Thompson Sampling.
 */
export function selectStrategyThompson(rankedStrategies = [], options = {}) {
  const safeRanked = Array.isArray(rankedStrategies)
    ? rankedStrategies.filter(Boolean)
    : [];

  if (safeRanked.length === 0) return 'baseline';

  const state = loadOptimizerState();

  const seed = options.seed ?? `optimizer-${Date.now()}`;
  const rng = mulberry32(hashSeed(seed));

  const sampled = safeRanked.map((strategy) => {
    const entry = state?.[strategy.id] || {};

    const baseScore = clampFinite(strategy.score, 0, 1, 0);

    const alpha =
      1 +
      (entry.alpha || 0) +
      baseScore * 5;

    const beta =
      1 +
      (entry.beta || 0) +
      (1 - baseScore) * 5;

    const sampledScore = sampleBeta(alpha, beta, rng);

    return {
      ...strategy,
      sampledScore,
    };
  });

  sampled.sort((a, b) => b.sampledScore - a.sampledScore);

  return sampled[0]?.id || 'baseline';
}

/**
 * Recomenda uma ação: keep, promote, rollback ou explore.
 */
export function recommendFlagConfig(input = {}) {
  const ranked = Array.isArray(input.ranked) ? input.ranked : [];

  const latestHealth = input.latestHealth || null;

  const currentFeatures =
    input.currentFeatures && typeof input.currentFeatures === 'object'
      ? input.currentFeatures
      : readFlags();

  const minImprovement = clampFinite(input.minImprovement, 0, 1, 0.02);

  const baseline = ranked.find((strategy) => strategy.id === 'baseline') || null;
  const best = ranked[0] || null;

  // Rollback por saúde crítica.
  if (latestHealth?.status === 'critical' && input.allowRollback !== false) {
    return {
      action: 'rollback',
      strategyId: 'baseline',
      features: {},
      reason:
        'Health score crítico detectado. Recomendação automática: retornar ao baseline.',
      latestHealthScore: latestHealth?.healthScore ?? null,
      ranked: ranked.slice(0, 5),
    };
  }

  // Exploração opcional.
  if (input.exploration === true && ranked.length > 1) {
    const selectedId = selectStrategyThompson(ranked, input);

    if (selectedId && selectedId !== 'baseline') {
      const selectedStrategy = ranked.find((s) => s.id === selectedId);

      if (selectedStrategy) {
        return {
          action: 'explore',
          strategyId: selectedStrategy.id,
          features: selectedStrategy.features,
          reason:
            'Modo de exploração ativo. Estratégia selecionada por Thompson Sampling.',
          ranked: ranked.slice(0, 5),
        };
      }
    }
  }

  if (!best || !best.hasEvidence) {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: currentFeatures,
      reason: 'Sem evidência suficiente para promover mudança.',
      ranked: ranked.slice(0, 5),
    };
  }

  const baselineScore = baseline?.score ?? 0;

  if (best.id === 'baseline') {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: {},
      reason: 'O baseline é a melhor estratégia comprovada.',
      score: best.score,
      baselineScore,
      ranked: ranked.slice(0, 5),
    };
  }

  if (best.score < baselineScore + minImprovement) {
    return {
      action: 'keep',
      strategyId: best.id,
      features: currentFeatures,
      reason:
        'A estratégia candidata supera o baseline, mas a margem é insuficiente para justificar mudança.',
      score: best.score,
      baselineScore,
      minImprovement,
      ranked: ranked.slice(0, 5),
    };
  }

  return {
    action: 'promote',
    strategyId: best.id,
    features: best.features,
    reason: 'Estratégia candidata supera o baseline com margem mínima.',
    score: best.score,
    baselineScore,
    ranked: ranked.slice(0, 5),
  };
}

/**
 * Aplica recomendação de flags.
 *
 * Só aplica se:
 * - options.force === true; ou
 * - globalThis.__COACH_FEATURES__.useAutoFlagApplication === true.
 */
export function applyRecommendedFlags(recommendation, options = {}) {
  if (!recommendation || typeof recommendation !== 'object') return false;

  const allowAuto =
    options.force === true ||
    readFlags().useAutoFlagApplication === true;

  if (!allowAuto) return false;

  if (recommendation.action === 'keep') return false;

  const current = readFlags();
  const safeBaseline = getSafeBaselineFeatures();

  let next = { ...current };

  if (recommendation.action === 'rollback') {
    next = {
      ...next,
      ...safeBaseline,
    };
  } else if (recommendation.action === 'promote') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else if (recommendation.action === 'explore') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else {
    return false;
  }

  writeFlags(next);
  persistCoachFlags(next);

  return true;
}

export default {
  EXPERIMENTAL_MATH_FLAGS,
  getSafeBaselineFeatures,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getStrategySpace,
  scoreStrategyEvaluation,
  rankStrategies,
  loadOptimizerState,
  saveOptimizerState,
  clearOptimizerState,
  recordStrategyOutcome,
  selectStrategyThompson,
  recommendFlagConfig,
  applyRecommendedFlags,
};


```

---

### Arquivo: `src/engine/orchestrator/coachOrchestrator.js`
*Linhas: 628 | Tamanho: 19.1 KB*

```javascript
/**
 * coachOrchestrator.js
 *
 * Lote 12 — Unified Coach Orchestrator
 *
 * Orquestra o ecossistema completo do Coach:
 * - motor principal;
 * - flags matemáticas;
 * - observabilidade;
 * - causal uplift;
 * - LLM explicativo;
 * - auto-tuner.
 *
 * Importante:
 * Este módulo não substitui o motor principal.
 * Ele coordena os módulos existentes e retorna um objeto unificado.
 */
import {
  getSuggestedFocus,
  generateDailyGoals,
  getBestTask,
  clearUrgencyCache,
  clearTopicsCache,
  clearMcCache,
} from '../../utils/coachLogic.js';
import { writeFlags, readFlags } from '../../utils/coachFeatureStore.js';

const ORCHESTRATOR_VERSION = '12.0.0';
// FIX (BUG-34): timeout padrão para não pendurar a UI em operações longas
const DEFAULT_TIMEOUT_MS = 30000;

import * as coachOptimizerMod from '../../utils/coachOptimizer.js';
import * as coachObservabilityMod from '../../utils/coachObservability.js';
import * as coachCausalMod from '../../utils/coachCausal.js';

const STATIC_MODULES = {
  coachOptimizer: coachOptimizerMod,
  coachObservability: coachObservabilityMod,
  coachCausal: coachCausalMod,
};

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getFeature(features, key, fallback = false) {
  try {
    if (features && typeof features[key] === 'boolean') {
      return features[key];
    }
    const storeFlags = readFlags();
    if (typeof storeFlags[key] === 'boolean') {
      return storeFlags[key];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Carrega módulos opcionais com fallback seguro (agora usando registro estático).
 */
async function loadOptionalModule(name, meta) {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__COACH_MODULES__ &&
      globalThis.__COACH_MODULES__[name]
    ) {
      meta.modules[name] = 'registry';
      return globalThis.__COACH_MODULES__[name];
    }
    if (STATIC_MODULES[name]) {
      meta.modules[name] = true;
      return STATIC_MODULES[name];
    }
    meta.modules[name] = false;
    return null;
  } catch (err) {
    meta.modules[name] = false;
    meta.errors.push({ module: name, message: err?.message || String(err) });
    return null;
  }
}

/**
 * Limpa caches principais do Coach.
 */
export function clearCoachCaches() {
  try {
    clearUrgencyCache();
  } catch {
    // ignore
  }
  try {
    clearTopicsCache();
  } catch {
    // ignore
  }
  try {
    clearMcCache();
  } catch {
    // ignore
  }
}

/**
 * Orquestrador principal.
 *
 * FIX (BUG-34): timeout configurável via options.timeoutMs (default 30s).
 * Passos verificam controller.signal.aborted e pulam adiante se estourar.
 */
export async function runCoachOrchestrator(input = {}, options = {}) {
  const startedAt = Date.now();
  const meta = {
    version: ORCHESTRATOR_VERSION,
    modules: {},
    errors: [],
    flags: {},
  };

  // FIX: validar input antes de processar
  const safeInput = input && typeof input === 'object' ? input : {};
  const categories = safeArray(safeInput.categories);
  const simulados = safeArray(safeInput.simulados);
  const studyLogs = safeArray(safeInput.studyLogs);
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const targetScore = clampFinite(
    options.targetScore,
    0,
    maxScore,
    maxScore * 0.8
  );

  // FIX (BUG-34): timeout + AbortController
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const checkAbort = (stepName) => {
    if (controller.signal.aborted) {
      meta.errors.push({ step: stepName, message: 'Timeout exceeded' });
      throw new Error(`Orchestrator aborted at step: ${stepName}`);
    }
    return false;
  };

  try {
    // Flags iniciais.
    let features = {};
    const baseFeatures = readFlags();
    const optionFeatures = options.features || {};
    for (const [k, v] of Object.entries({ ...baseFeatures, ...optionFeatures })) {
      if (typeof k === 'string' && typeof v === 'boolean') features[k] = v;
    }
    writeFlags(features);

    const orchestratorEnabled =
      options.force === true ||
      getFeature(features, 'useCoachOrchestrator', false);

    if (!orchestratorEnabled) {
      return {
        ok: false,
        skipped: true,
        reason: 'useCoachOrchestrator disabled',
        generatedAt: Date.now(),
        meta,
      };
    }

    // ==========================================================
    // 1. Bootstrap de flags persistidas
    // ==========================================================
    const optimizerModule = await loadOptionalModule('coachOptimizer', meta);
    if (
      optimizerModule?.bootstrapCoachFlags &&
      options.loadPersistedFlags !== false
    ) {
      try {
        optimizerModule.bootstrapCoachFlags();
        const updatedBase = readFlags();
        features = {};
        for (const [k, v] of Object.entries({ ...updatedBase, ...optionFeatures })) {
          if (typeof k === 'string' && typeof v === 'boolean') features[k] = v;
        }
        writeFlags(features);
      } catch (err) {
        meta.errors.push({
          step: 'bootstrapCoachFlags',
          message: err?.message || String(err),
        });
      }
    }
    meta.flags = features;

    // ==========================================================
    // 2. Observabilidade / Health Guard
    // ==========================================================
    let health = null;
    const shouldRunHealth =
      options.runHealth !== false &&
      (
        getFeature(features, 'useObservability', false) ||
        getFeature(features, 'useDriftGuard', false) ||
        getFeature(features, 'useOrchestratorHealth', false)
      );

    if (shouldRunHealth && !checkAbort('observability')) {
      const observabilityModule = await loadOptionalModule(
        'coachObservability',
        meta
      );
      if (observabilityModule?.runCoachDriftGuard) {
        try {
          let series = {
            scores: [],
            volatilities: [],
            sampleSize: 0,
          };
          if (observabilityModule.extractObservabilitySeries) {
            series = observabilityModule.extractObservabilitySeries(simulados, {
              maxScore,
            });
          }
          health = observabilityModule.runCoachDriftGuard({
            scores: series.scores || [],
            volatilities: series.volatilities || [],
            sampleSize: series.sampleSize ?? 0,
            features,
            saveSnapshot: options.saveHealthSnapshots === true,
          });
        } catch (err) {
          meta.errors.push({
            step: 'observability',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 3. Causal Uplift / Policy Engine
    // ==========================================================
    let causalModule = null;
    let causalModel = null;
    const shouldLoadCausal =
      getFeature(features, 'useCausalUplift', false) ||
      getFeature(features, 'usePersonalizedPolicy', false) ||
      getFeature(features, 'useCausalTaskSelection', false);

    if (shouldLoadCausal && !checkAbort('causal')) {
      causalModule = await loadOptionalModule('coachCausal', meta);
      if (causalModule) {
        try {
          if (typeof causalModule.loadCausalModel === 'function') {
            causalModel = causalModule.loadCausalModel();
          }
          if (!causalModel && options.trainCausalModel === true) {
            const events = causalModule.buildCausalEventsFromHistory?.(
              categories,
              simulados,
              studyLogs,
              {
                maxScore,
                minTreatmentMinutes: options.minTreatmentMinutes ?? 60,
                maxHorizonDays: options.maxHorizonDays ?? 45,
              }
            );
            if (Array.isArray(events) && events.length > 0) {
              causalModel = causalModule.trainCausalModel?.(events, {
                maxScore,
                method: options.causalMethod || 'auto',
                useBootstrap: getFeature(features, 'useCausalBootstrap', false),
                bootstrapIterations: options.causalBootstrapIterations ?? 100,
                save: true,
              });
            }
          }
        } catch (err) {
          meta.errors.push({
            step: 'causal',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 4. Motor principal do Coach
    // ==========================================================
    const coachOptions = {
      ...options,
      maxScore,
      targetScore,
      features,
      allCategories: categories,
    };

    let focus = null;
    let tasks = [];
    let bestTask = null;

    try {
      focus = getSuggestedFocus(categories, simulados, studyLogs, coachOptions);
    } catch (err) {
      meta.errors.push({
        step: 'getSuggestedFocus',
        message: err?.message || String(err),
      });
    }

    try {
      tasks = generateDailyGoals(categories, simulados, studyLogs, coachOptions);
    } catch (err) {
      meta.errors.push({
        step: 'generateDailyGoals',
        message: err?.message || String(err),
      });
    }

    try {
      bestTask = getBestTask(categories, options.excludeTaskId ?? null);
    } catch (err) {
      meta.errors.push({
        step: 'getBestTask',
        message: err?.message || String(err),
      });
    }

    // ==========================================================
    // 5. Reordenação causal de tarefas
    // ==========================================================
    if (
      getFeature(features, 'useCausalTaskSelection', false) &&
      causalModule?.rerankCoachTasksWithCausalPolicy &&
      causalModel &&
      Array.isArray(tasks) &&
      tasks.length > 0 &&
      !checkAbort('causalTaskRerank')
    ) {
      try {
        tasks = causalModule.rerankCoachTasksWithCausalPolicy(
          tasks,
          causalModel,
          {
            maxScore,
            healthStatus: health?.status || null,
            causalWeight: options.causalWeight ?? 0.35,
          }
        );
      } catch (err) {
        meta.errors.push({
          step: 'causalTaskRerank',
          message: err?.message || String(err),
        });
      }
    }

    // ==========================================================
    // 6. Explicação LLM opcional
    // ==========================================================
    let llmExplanation = null;
    const shouldRunLLM =
      options.runLLM !== false &&
      (
        getFeature(features, 'useLLMExplanations', false) ||
        getFeature(features, 'useOrchestratorLLM', false)
      );

    if (shouldRunLLM && focus?.urgency && !checkAbort('llmExplanation')) {
      const explanationModule = await loadOptionalModule(
        'explanationAgent',
        meta
      );
      if (explanationModule?.enhanceCoachResultWithLLM) {
        try {
          const llmTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LLM timeout')), 5000)
          );
          const enhanced = await Promise.race([
            explanationModule.enhanceCoachResultWithLLM(
              focus.urgency,
              {
                features,
                context: {
                  categoryName: focus.name || focus.categoryName || null,
                  maxScore,
                  targetScore,
                },
              }
            ),
            llmTimeout
          ]);
          llmExplanation = enhanced?.llmExplanation || null;
          if (llmExplanation && focus.urgency) {
            focus.urgency.llmExplanation = llmExplanation;
          }
        } catch (err) {
          meta.errors.push({
            step: 'llmExplanation',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 7. AutoTuner opcional
    // ==========================================================
    let tuner = null;
    const shouldRunTuner =
      options.runAutoTuner === true &&
      (
        getFeature(features, 'useAutoTuner', false) ||
        getFeature(features, 'useOrchestratorAutoTuner', false)
      );

    if (shouldRunTuner && !checkAbort('autoTuner')) {
      const tunerModule =
        optimizerModule || (await loadOptionalModule('coachOptimizer', meta));
      if (tunerModule?.runCoachAutoTuner) {
        try {
          tuner = tunerModule.runCoachAutoTuner({
            maxScore,
            force: true,
            autoApply: options.autoApplyTuner === true,
            forceApply: options.forceApplyTuner === true,
            minImprovement: options.minImprovement ?? 0.02,
            exploration: options.exploration === true,
          });
          if (tuner?.applied) {
            clearCoachCaches();
          }
        } catch (err) {
          meta.errors.push({
            step: 'autoTuner',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 8. Resultado unificado
    // ==========================================================
    return {
      ok: true,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      version: ORCHESTRATOR_VERSION,
      aborted: controller.signal.aborted,
      focus,
      tasks: Array.isArray(tasks) ? tasks : [],
      bestTask,
      health: health || null,
      causal: {
        available: Boolean(causalModel),
        model: causalModel
          ? {
              generatedAt: causalModel.generatedAt ?? null,
              sampleSize: causalModel.sampleSize ?? null,
              method: causalModel.method ?? null,
              globalUplift: causalModel.global?.uplift ?? null,
              actionCount: causalModel.actions
                ? Object.keys(causalModel.actions).length
                : 0,
            }
          : null,
      },
      llmExplanation,
      tuner: tuner || null,
      meta,
    };
  } catch (err) {
    return {
      ok: false,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      version: ORCHESTRATOR_VERSION,
      aborted: controller.signal.aborted,
      error: err?.message || String(err),
      meta,
    };
  } finally {
    // FIX (BUG-34): sempre limpar o timer de timeout
    clearTimeout(timeoutId);
  }
}

/**
 * Constrói um dashboard simples a partir do resultado do orquestrador.
 */
export function buildCoachOrchestratorDashboard(result = {}) {
  // FIX: validar result antes de processar
  if (!result || typeof result !== 'object') return null;

  const safeResult = result;
  const focus = safeResult.focus || null;
  const health = safeResult.health || null;
  const causal = safeResult.causal || null;
  const llm = safeResult.llmExplanation || null;
  const tuner = safeResult.tuner || null;
  const meta = safeResult.meta || {};

  return {
    generatedAt: safeResult.generatedAt || Date.now(),
    durationMs: safeResult.durationMs ?? null,
    version: safeResult.version || ORCHESTRATOR_VERSION,
    cards: [
      {
        id: 'focus_category',
        label: 'Foco principal',
        value: focus?.name || focus?.categoryName || null,
      },
      {
        id: 'focus_urgency',
        label: 'Urgência',
        value: focus?.urgency?.normalizedScore ?? null,
        goodDirection: 'contextual',
      },
      {
        id: 'tasks_count',
        label: 'Tarefas geradas',
        value: Array.isArray(safeResult.tasks) ? safeResult.tasks.length : 0,
      },
      {
        id: 'health_score',
        label: 'Health Score',
        value: health?.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'causal_model',
        label: 'Modelo causal',
        value: causal?.available ? 'Ativo' : 'Indisponível',
      },
      {
        id: 'llm_explanation',
        label: 'Explicação LLM',
        value: llm?.headline || null,
      },
      {
        id: 'tuner_action',
        label: 'Ação do AutoTuner',
        value: tuner?.recommendation?.action || null,
      },
    ],
    focus: focus
      ? {
          id: focus.id || null,
          name: focus.name || focus.categoryName || null,
          normalizedScore: focus.urgency?.normalizedScore ?? null,
          recommendation: focus.urgency?.recommendation ?? null,
          probability:
            focus.urgency?.details?.monteCarlo?.probability ?? null,
          llmExplanation: focus.urgency?.llmExplanation || null,
        }
      : null,
    tasks: Array.isArray(safeResult.tasks)
      ? safeResult.tasks.filter(Boolean).slice(0, 12).map((task) => ({
          id: task?.id || null,
          text: task?.text || null,
          priority: ['high', 'medium', 'low'].includes(task?.priority) ? task.priority : 'medium',
          categoryId: task?.categoryId || null,
          categoryName: task?.catName || task?.category || null,
          topicName: task?.topicName || null,
        }))
      : [],
    bestTask: safeResult.bestTask
      ? {
          id: safeResult.bestTask.id || null,
          text: safeResult.bestTask.text || null,
          priority: safeResult.bestTask.priority || null,
          catName: safeResult.bestTask.catName || null,
        }
      : null,
    health: health
      ? {
          healthScore: health.healthScore ?? null,
          status: health.status ?? null,
          alertsCount: Array.isArray(health.alerts)
            ? health.alerts.length
            : 0,
        }
      : null,
    causal,
    llm: llm
      ? {
          headline: llm.headline || null,
          severity: llm.severity || null,
          recommendation: llm.recommendation || null,
          confidence: llm.confidence ?? null,
          source: llm.source || null,
        }
      : null,
    tuner: tuner
      ? {
          action: tuner.recommendation?.action || null,
          strategyId: tuner.recommendation?.strategyId || null,
          reason: tuner.recommendation?.reason || null,
          applied: tuner.applied === true,
        }
      : null,
    errors: Array.isArray(meta.errors) ? meta.errors : [],
    modules: meta.modules || {},
    flags: meta.flags || {},
  };
}

export default {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};


```

---

### Arquivo: `src/engine/probabilistic/bayesianTopics.js`
*Linhas: 347 | Tamanho: 11.7 KB*

```javascript
/**
 * bayesianTopics.js
 *
 * Lote 4 — Bayesian Topic Proficiency
 *
 * Modelo:
 * - Beta-Binomial com prior empírico por disciplina/global.
 * - Cada tópico recebe uma distribuição posterior Beta(alpha, beta).
 * - Tópicos com poucas questões ficam com maior incerteza.
 * - Tópicos não testados não herdam automaticamente a média global.
 *
 * Saída por tópico:
 * - proficiencyMean: média posterior;
 * - proficiencySd: desvio posterior;
 * - ciLow / ciHigh: intervalo credível por quantis reais da Beta;
 * - evidence: confiança baseada no volume amostral;
 * - uncertainty: incerteza normalizada;
 * - isUntested: se o tópico não possui evidência.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  let str = String(value).trim();
  str = str.replace(/[%\s]/g, '');
  if (!str) return fallback;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}

function sumValues(values) {
  let sum = 0;
  let c = 0;
  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }
  return sum;
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return sumValues(finite) / finite.length;
}

function varianceValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length < 2) return 0;
  const mean = meanValues(finite);
  const devs = finite.map((v) => Math.pow(v - mean, 2));
  return sumValues(devs) / (finite.length - 1);
}

// ============================================================
// NOVO: logGamma (Lanczos approximation)
// Necessário para a função beta regularizada incompleta.
// ============================================================
function logGamma(z) {
  /* eslint-disable no-loss-of-precision */
  const cof = [
    57.15623566586292, -59.59796035547549, 14.136097974741747,
    -0.4919138160976202, 0.3399464998481189e-4, 0.4652362892704858e-4,
    -0.9837447530487956e-4, 0.1580887032249125e-3,
    -0.2102644417241049e-3, 0.2174396181152126e-3,
    -0.1643181065367639e-3, 0.8441822398385274e-4,
    -0.2619083840158141e-4, 0.3689918265953162e-5,
  ];
  /* eslint-enable no-loss-of-precision */
  if (z <= 0) return NaN;
  let x = z;
  let y = x;
  let tmp = x + 5.2421875;
  tmp = (x + 0.5) * Math.log(tmp) - tmp;
  let ser = 0.9999999999999971;
  for (let j = 0; j < cof.length; j++) ser += cof[j] / ++y;
  return tmp + Math.log(2.5066282746310007 * ser / x);
}

// ============================================================
// NOVO: Fração continuada da função beta incompleta (Lentz)
// ============================================================
function betaContinuedFraction(a, b, x) {
  const MAX_ITER = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// ============================================================
// NOVO: Função beta regularizada incompleta I_x(a, b)
// ============================================================
function regularizedIncompleteBeta(x, a, b) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(x)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log1p(-x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction(a, b, x) / a;
  }
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}

// ============================================================
// NOVO: Quantil da distribuição Beta por busca binária
// Substitui a aproximação simétrica mean ± 1.96*sd.
// ============================================================
function betaQuantile(p, a, b) {
  const safeP = Math.max(1e-8, Math.min(1 - 1e-8, Number(p) || 0.5));
  if (!(a > 0) || !(b > 0)) return 0.5;

  let lo = 0;
  let hi = 1;
  // 80 iterações de busca binária → precisão ~1e-24
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const cdf = regularizedIncompleteBeta(mid, a, b);
    if (!Number.isFinite(cdf) || cdf >= safeP) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// ============================================================
// FUNÇÃO PRINCIPAL (alteração: IC por quantis Beta)
// ============================================================
export function estimateTopicProficiencies(topics = [], options = {}) {
  const untestedPriorMean = clampFinite(options.untestedPriorMean, 0, 1, 0.25);
  const untestedPriorWeight = clampFinite(options.untestedPriorWeight, 0, 1, 0.45);
  const minPriorStrength = clampFinite(options.minPriorStrength, 1, 50, 3);
  const maxPriorStrength = clampFinite(options.maxPriorStrength, 1, 200, 22);

  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  const parsedTopics = safeTopics.map((topic, index) => {
    const name = String(topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`);
    const total = Math.max(0, toFiniteNumber(topic?.total, 0));
    let correct = toFiniteNumber(topic?.correct ?? topic?.acertos, NaN);
    if (!Number.isFinite(correct) && Number.isFinite(topic?.percentage) && total > 0) {
      correct = (Number(topic.percentage) / 100) * total;
    }
    correct = Number.isFinite(correct) ? correct : 0;
    correct = Math.max(0, Math.min(total, correct));
    return { name, total, correct, isUntested: total <= 0 };
  });

  const topicsWithData = parsedTopics.filter((t) => t.total > 0);
  const globalTotal = sumValues(topicsWithData.map((t) => t.total));
  const globalCorrect = sumValues(topicsWithData.map((t) => t.correct));
  const globalMean =
    globalTotal > 0
      ? clampFinite(globalCorrect / globalTotal, 0, 1, untestedPriorMean)
      : untestedPriorMean;

  let priorStrength =
    minPriorStrength +
    Math.sqrt(Math.max(0, globalTotal)) * 0.12 +
    topicsWithData.length * 0.25;

  // Empirical Bayes: prior mais fraco quando tópicos variam muito
  if (topicsWithData.length >= 3) {
    const topicRates = topicsWithData.map((t) => t.correct / t.total);
    const rateMean = meanValues(topicRates);
    const rateVariance = varianceValues(topicRates);
    const averageBinomialNoise = meanValues(
      topicsWithData.map((t) => {
        const n = Math.max(1, t.total);
        return (rateMean * (1 - rateMean)) / n;
      })
    );
    const tau2 = Math.max(0, rateVariance - averageBinomialNoise);
    if (tau2 > 1e-6) {
      const momentK = (rateMean * (1 - rateMean)) / tau2 - 1;
      priorStrength = Math.min(
        priorStrength,
        clampFinite(momentK, minPriorStrength, maxPriorStrength, priorStrength)
      );
    }
  }

  priorStrength = clampFinite(
    priorStrength, minPriorStrength, maxPriorStrength, minPriorStrength
  );

  const globalAlpha0 = Math.max(1e-6, globalMean * priorStrength);
  const globalBeta0 = Math.max(1e-6, (1 - globalMean) * priorStrength);

  const enrichedTopics = parsedTopics.map((topic) => {
    let alpha;
    let beta;
    let priorMean = globalMean;

    if (topic.isUntested) {
      priorMean = untestedPriorMean;
      const localK = Math.max(0.5, priorStrength * untestedPriorWeight);
      alpha = Math.max(1e-6, priorMean * localK);
      beta = Math.max(1e-6, (1 - priorMean) * localK);
    } else {
      alpha = globalAlpha0 + topic.correct;
      beta = globalBeta0 + Math.max(0, topic.total - topic.correct);
    }

    const posteriorStrength = alpha + beta;
    const proficiencyMean =
      posteriorStrength > 0
        ? clampFinite(alpha / posteriorStrength, 0, 1, priorMean)
        : priorMean;
    const proficiencyVariance =
      posteriorStrength > 0
        ? (alpha * beta) /
          (posteriorStrength * posteriorStrength * (posteriorStrength + 1))
        : 0;
    const proficiencySd = Math.sqrt(Math.max(0, proficiencyVariance));

    // ✅ CORREÇÃO PRINCIPAL: IC por quantis reais da posterior Beta.
    // Antes: mean ± 1.96 * sd (aproximação simétrica, inválida aqui).
    // Agora: quantis 2.5% e 97.5% da Beta(alpha, beta).
    const ciLow = betaQuantile(0.025, alpha, beta);
    const ciHigh = betaQuantile(0.975, alpha, beta);

    const evidence = topic.isUntested
      ? 0
      : clampFinite(topic.total / (topic.total + priorStrength), 0, 1, 0);
    const uncertainty = clampFinite(proficiencySd / 0.25, 0, 1, 0);

    return {
      name: topic.name,
      total: topic.total,
      correct: topic.correct,
      isUntested: topic.isUntested,
      priorMean,
      priorStrength: topic.isUntested
        ? priorStrength * untestedPriorWeight
        : priorStrength,
      posteriorAlpha: alpha,
      posteriorBeta: beta,
      posteriorStrength,
      proficiencyMean,
      proficiencySd,
      proficiencyPct: proficiencyMean * 100,
      ciLow,
      ciHigh,
      evidence,
      uncertainty,
    };
  });

  return {
    model: 'beta_binomial_empirical_bayes',
    global: {
      globalTotal,
      globalCorrect,
      globalMean,
      priorStrength,
      alpha0: globalAlpha0,
      beta0: globalBeta0,
      topicsWithData: topicsWithData.length,
      untestedPriorMean,
      untestedPriorWeight,
    },
    topics: enrichedTopics,
  };
}

export function computeBayesianTopicUtility(topic = {}, options = {}) {
  const proficiencyMean = clampFinite(topic.proficiencyMean, 0, 1, 0.5);
  const uncertainty = clampFinite(topic.uncertainty, 0, 1, 0.5);
  const evidence = clampFinite(topic.evidence, 0, 1, 0);
  const weakness = clampFinite(1 - proficiencyMean, 0, 1, 0.5);
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 1, 0.65);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 1, 0.35);
  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight;
  const utility = baseUtility * (0.65 + 0.35 * evidence);
  return clampFinite(utility, 0, 1, 0);
}

export default {
  estimateTopicProficiencies,
  computeBayesianTopicUtility,
};


```

---

### Arquivo: `src/engine/probabilistic/decisionEngine.js`
*Linhas: 361 | Tamanho: 10.0 KB*

```javascript
/**
 * decisionEngine.js
 *
 * Lote 5 — Decision Utility + Contextual Bandit leve
 *
 * Objetivo:
 * - rankear tópicos/tarefas por utilidade esperada;
 * - combinar fraqueza, incerteza, evidência, recência, prioridade e custo;
 * - permitir exploração opcional via Thompson Sampling aproximado;
 * - criar base para aprendizado futuro com recompensas.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGaussianSampler(rng) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = rng();
    let v = rng();

    let attemptsU = 0;
    while (u === 0 && attemptsU < 100) { u = rng(); attemptsU++; }
    if (u <= 0) u = 1e-15;

    let attemptsV = 0;
    while (v === 0 && attemptsV < 100) { v = rng(); attemptsV++; }
    if (v <= 0) v = 1e-15;

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * v);
    const z1 = magnitude * Math.sin(2.0 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

/**
 * Amostra aproximada de uma distribuição Beta.
 * Usa aproximação normal, suficiente para exploração leve.
 */
function sampleBeta(alpha, beta, rng, gaussianSampler) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));
  if (!Number.isFinite(sd) || sd <= 0) return mean;

  const gaussian = typeof gaussianSampler === 'function'
    ? gaussianSampler
    : createGaussianSampler(rng);

  const sampled = mean + gaussian() * sd;
  return clampFinite(sampled, 0, 1, mean);
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

const BANDIT_STORAGE_KEY = 'coach_decision_bandit_v1';

function loadBanditState() {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(BANDIT_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBanditState(state) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(BANDIT_STORAGE_KEY, JSON.stringify(state || {}));
  } catch {
    // ignore storage errors
  }
}

/**
 * Calcula utilidade de decisão para um candidato.
 *
 * Candidato pode ser tópico ou tarefa.
 */
export function computeDecisionUtility(candidate = {}, options = {}) {
  const weakness = clampFinite(candidate.weakness, 0, 1, 0.5);
  const uncertainty = clampFinite(candidate.uncertainty, 0, 1, 0.35);
  const evidence = clampFinite(candidate.evidence, 0, 1, 0);
  const recencyDays = clampFinite(candidate.recencyDays, 0, 180, 21);
  const errorRate = clampFinite(candidate.errorRate, 0, 1, 0);
  const weight = clampFinite(candidate.weight, 1, 10, 5);
  const costMinutes = clampFinite(candidate.costMinutes, 0, 480, 30);
  const fatigue = clampFinite(candidate.fatigue, 0, 100, 100);

  let priorityScore = clampFinite(candidate.priorityValue, 0, 1, NaN);

  if (!Number.isFinite(priorityScore)) {
    const priority = String(candidate.priority || '').toLowerCase();

    if (priority === 'high') priorityScore = 1;
    else if (priority === 'medium') priorityScore = 0.55;
    else if (priority === 'low') priorityScore = 0.2;
    else priorityScore = 0.45;
  }

  let mcRiskScore = 0.35;

  const mcRisk = String(candidate.mcRisk || '').toLowerCase();
  if (mcRisk === 'critical') mcRiskScore = 1;
  else if (mcRisk === 'elevated_global_risk') mcRiskScore = 0.7;
  else if (mcRisk === 'moderate') mcRiskScore = 0.4;
  else if (mcRisk === 'safe') mcRiskScore = 0.08;

  const weightFactor = (weight - 1) / 9;
  const recencyRisk = 1 - Math.exp(-recencyDays / 15);

  const evidenceQuality =
    evidence * 0.7 +
    (1 - uncertainty) * 0.3;

  // Pesques padrão.
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 100, 36);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 100, 10);
  const evidenceWeight = clampFinite(options.evidenceWeight, 0, 100, 10);
  const priorityWeight = clampFinite(options.priorityWeight, 0, 100, 18);
  const recencyWeight = clampFinite(options.recencyWeight, 0, 100, 10);
  const errorWeight = clampFinite(options.errorWeight, 0, 100, 8);
  const riskWeight = clampFinite(options.riskWeight, 0, 100, 8);
  const weightWeight = clampFinite(options.weightWeight, 0, 100, 6);

  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight +
    evidenceQuality * evidenceWeight +
    priorityScore * priorityWeight +
    recencyRisk * recencyWeight +
    errorRate * errorWeight +
    mcRiskScore * riskWeight +
    weightFactor * weightWeight;

  const costPenalty = (costMinutes / 240) * 8;
  const fatiguePenalty = (1 - fatigue / 100) * 12;

  const utility = clampFinite(
    baseUtility - costPenalty - fatiguePenalty,
    0,
    100,
    0
  );

  return {
    utility: Number(utility.toFixed(2)),
    components: {
      weakness: Number(weakness.toFixed(4)),
      uncertainty: Number(uncertainty.toFixed(4)),
      evidence: Number(evidence.toFixed(4)),
      evidenceQuality: Number(evidenceQuality.toFixed(4)),
      priorityScore: Number(priorityScore.toFixed(4)),
      recencyRisk: Number(recencyRisk.toFixed(4)),
      errorRate: Number(errorRate.toFixed(4)),
      mcRiskScore: Number(mcRiskScore.toFixed(4)),
      weightFactor: Number(weightFactor.toFixed(4)),
      costPenalty: Number(costPenalty.toFixed(4)),
      fatiguePenalty: Number(fatiguePenalty.toFixed(4)),
    },
  };
}

/**
 * Retorna posterior Beta para um candidato.
 * Usa histórico salvo + prior baseado na utilidade atual.
 */
export function getBanditPosterior(actionId, utility = 50) {
  const state = loadBanditState();
  const entry = state?.[String(actionId)] || {};

  const safeUtility = clampFinite(utility, 0, 100, 50);

  const priorAlpha = 1 + safeUtility / 25;
  const priorBeta = 1 + (100 - safeUtility) / 25;

  const successes = clampFinite(entry.alpha, 0, 10000, 0);
  const failures = clampFinite(entry.beta, 0, 10000, 0);

  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
    successes,
    failures,
    trials: successes + failures,
  };
}

/**
 * Registra recompensa de uma ação.
 *
 * reward:
 * - true / 1 = ação útil;
 * - false / 0 = ação não útil;
 * - 0..1 = recompensa parcial.
 */
export function recordDecisionOutcome(actionId, reward, options = {}) {
  if (!actionId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadBanditState();
  const key = String(actionId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  entry.alpha = Math.min(maxCount, (entry.alpha || 0) + normalizedReward);
  entry.beta = Math.min(maxCount, (entry.beta || 0) + (1 - normalizedReward));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveBanditState(state);

  return entry;
}

/**
 * Limpa memória do bandit.
 */
export function clearDecisionBandit() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(BANDIT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Rankeia candidatos usando utilidade + exploração opcional.
 */
export function rankDecisionCandidates(candidates = [], options = {}) {
  const safeCandidates = Array.isArray(candidates)
    ? candidates.filter(Boolean)
    : Object.values(candidates || {}).filter(Boolean);

  if (safeCandidates.length === 0) return [];

  const seed = options.seed ?? `decision-${safeCandidates.length}`;
  const rng = mulberry32(hashSeed(seed));
  const gaussianSampler = createGaussianSampler(rng);

  const useBandit = options.useBandit === true;
  const explorationScale = clampFinite(options.explorationScale, 0, 100, 18);

  const enriched = safeCandidates.map((candidate, index) => {
    const decision = computeDecisionUtility(candidate, options);

    let explorationBonus = 0;
    let posterior = null;

    if (useBandit) {
      const actionId = String(
        candidate.id ?? candidate.name ?? `candidate-${index}`
      );

      posterior = getBanditPosterior(actionId, decision.utility);

      const sampledRewardProbability = sampleBeta(
        posterior.alpha,
        posterior.beta,
        rng,
        gaussianSampler
      );

      explorationBonus = sampledRewardProbability * explorationScale;
    }

    const decisionScore = decision.utility + explorationBonus;

    return {
      ...candidate,
      decision,
      posterior,
      explorationBonus: Number(explorationBonus.toFixed(2)),
      decisionScore: Number(decisionScore.toFixed(2)),
    };
  });

  return enriched.sort((a, b) => b.decisionScore - a.decisionScore);
}

export default {
  computeDecisionUtility,
  rankDecisionCandidates,
  getBanditPosterior,
  recordDecisionOutcome,
  clearDecisionBandit,
};


```

---

### Arquivo: `src/engine/probabilistic/fsrs.js`
*Linhas: 237 | Tamanho: 8.7 KB*

```javascript
// src/engine/probabilistic/fsrs.js
// ============================================================================
// FSRS — Free Spaced Repetition Scheduler (núcleo probabilístico)
// Fonte única das fórmulas de retenção e intervalo usadas por diagnostics.js
// e coachLogic.js.
// Fórmula base: R(t, S) = (1 + t / (9 * S))^-1
// ============================================================================

import {
    clamp,
    normalizeArray,
    toDateMs,
    toFiniteNumber,
    MS_PER_DAY
} from '../../utils/retentionCore.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

/**
 * Retrievability FSRS: probabilidade de lembrança após `daysSince` dias.
 * R(t, S) = (1 + t / (9 * S))^-1
 * @param {number} daysSince - dias desde a última revisão/estudo
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @returns {number} retenção em [0, 1]
 */
export function fsrsRetrievability(daysSince, stabilityDays) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const t = Math.max(0, Number(daysSince) || 0);
  const r = Math.pow(1 + t / (9 * S), -1);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}

/**
 * Intervalo que produz a retenção-alvo R.
 * Derivado de R = (1 + t/(9S))^-1  =>  t = 9 * S * (1/R - 1)
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @param {number} targetRetention - retenção desejada (padrão 0.7)
 * @returns {number} intervalo em dias (inteiro, mínimo 1)
 */
export function fsrsIntervalForRetention(stabilityDays, targetRetention = 0.7) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  const interval = 9 * S * ((1 / R) - 1);
  return Number.isFinite(interval) ? Math.max(1, Math.round(interval)) : 1;
}

/**
 * Estimativa FSRS por tópico individual.
 * Usa histórico de scores + dias desde a última revisão para calcular
 * estabilidade, retenção atual e próximo intervalo de revisão.
 *
 * Consumidor: coachLogic.js → topic.fsrs = estimateTopicFsrs(...)
 *   usa topic.fsrs.retentionPct e topic.fsrs.due
 *
 * @param {Object} topic - { name, scores, lastSeen, daysSince, total, percentage }
 * @param {Object} options - { maxScore, desiredRetention }
 * @returns {Object|null}
 */
export function estimateTopicFsrs(topic, options = {}) {
  if (!topic) return null;

  const now = options.now ?? Date.now();
  const desiredRetention = clamp(toFiniteNumber(options.desiredRetention, 0.85), 0.5, 0.95);

  const scores = normalizeArray(topic.scores)
    .map(item => toFiniteNumber(item?.score ?? item, null))
    .filter(value => value != null);

  if (scores.length === 0) return null;

  const lastStudiedMs = toDateMs(
    topic.lastStudiedAt ?? topic.lastReviewedAt ?? topic.lastSeen ?? topic.date
  );

  let daysSince = toFiniteNumber(topic.daysSince, null);

  if (daysSince == null || !Number.isFinite(daysSince)) {
    daysSince = lastStudiedMs == null
      ? 0
      : Math.max(0, (now - lastStudiedMs) / MS_PER_DAY);
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;

  const sd = Math.sqrt(Math.max(0, variance));

  const metaMaxScore = toFiniteNumber(topic.maxScore, null);
  const maxScoreSeen = Math.max(...scores);

  const scoreScale = Math.max(
    1,
    options.scoreScale ??
      (Number.isFinite(metaMaxScore) && metaMaxScore > 0
        ? metaMaxScore
        : maxScoreSeen <= 1
          ? 1
          : 100)
  );

  const metaMinScore = toFiniteNumber(topic.minScore ?? options.minScore, 0);
  const domain = Math.max(1e-6, scoreScale - metaMinScore);

  const consistencyFactor = clamp(1 - (sd / domain), 0.1, 1);
  const performanceFactor = clamp((mean - metaMinScore) / domain, 0, 1);
  const reviewFactor = Math.min(1, Math.log1p(scores.length) / Math.log1p(20));

  const rawDiff = toFiniteNumber(topic.difficulty, 1.0);
  let difficulty;
  if (rawDiff > 2) {
    // Escala Anki/FSRS tradicional 1..10
    difficulty = clamp((rawDiff - 1) / 9, 0, 1);
  } else if (rawDiff >= 0.6 && rawDiff <= 2.0) {
    // Escala do app: 0.7 (facil), 1.0 (medio), 1.3 (dificil), 1.6 (expert)
    // Mapeia monotonicamente [0.7, 1.6] para [0.2, 0.9]
    difficulty = clamp(((rawDiff - 0.7) / (1.6 - 0.7)) * 0.7 + 0.2, 0.1, 0.95);
  } else {
    difficulty = clamp(rawDiff, 0, 1);
  }

  const difficultyFactor = 1 - (difficulty * 0.35);

  const baseStability =
    (3 + (21 * consistencyFactor * performanceFactor * reviewFactor)) *
    difficultyFactor;

  const stability = clamp(baseStability, 1, 180);

  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;

  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);
  const due = daysSince >= optimalIntervalDays * 0.8;
  const dueAtMs = lastStudiedMs != null
    ? lastStudiedMs + (optimalIntervalDays * MS_PER_DAY)
    : null;

  return {
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    due,
    dueAtMs,
    daysSince: Number(daysSince.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

/**
 * Boost FSRS por categoria (agregado de todo o histórico).
 * Usado pelo Coach para calcular o SRS boost de urgência.
 *
 * Consumidor: coachLogic.js → estimateCategoryFsrsBoost(history, {daysSince, maxScore, cfg, desiredRetention})
 *   usa o retorno como { boost, label }
 *
 * @param {Array} history - histórico de simulados da categoria
 * @param {Object} options - { daysSince, maxScore, cfg, desiredRetention }
 * @returns {Object|null} { boost, label, retentionPct, stabilityDays, ... }
 */
export function estimateCategoryFsrsBoost(history, options = {}) {
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  if (safeHistory.length === 0) return null;

  const cfg = options.cfg || {};
  const maxScore = Math.max(1, Number(options.maxScore) || 100);
  const desiredRetention = Math.max(0.5, Math.min(0.95, Number(options.desiredRetention) || 0.85));
  const daysSince = Math.max(0, Number(options.daysSince) || 0);

  const minScore = Number(options.minScore) || 0;
  const domain = Math.max(1e-6, maxScore - minScore);

  const scores = safeHistory
    .map(h => getSafeScore(h, maxScore, minScore))
    .filter(Number.isFinite);
  if (scores.length === 0) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;
  const sd = Math.sqrt(Math.max(0, variance));

  const consistencyFactor = Math.max(0.1, 1 - (sd / domain));
  const performanceFactor = Math.max(0.1, (mean - minScore) / domain);
  const baseStability = 3 + (14 * consistencyFactor * performanceFactor * Math.min(1, scores.length / 5));

  const stability = Math.max(1, Math.min(180, baseStability));
  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;
  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);

  if (retentionPct < 75) {
    const intensity = Math.pow((75 - retentionPct) / 75, 1.2);
    const boost = (Number(cfg.SRS_BOOST) || 16) * 2.0 * intensity;
    let label;
    if (retentionPct < 30) {
      label = '⚠️ Memória Crítica (FSRS)';
    } else if (retentionPct < 55) {
      label = '🧠 Revisão Necessária (FSRS)';
    } else {
      label = '🔄 Revisão de Reforço (FSRS)';
    }
    return {
      boost: Number(boost.toFixed(4)),
      label,
      retentionPct: Number(retentionPct.toFixed(2)),
      stabilityDays: Number(stability.toFixed(2)),
      optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
      nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
      model: 'fsrs_power_law',
    };
  }

  return {
    boost: 0,
    label: null,
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

export default {
  fsrsRetrievability,
  fsrsIntervalForRetention,
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
};


```

---

### Arquivo: `src/engine/probabilistic/knowledgeGraph.js`
*Linhas: 294 | Tamanho: 7.8 KB*

```javascript
/**
 * knowledgeGraph.js
 *
 * Lote 7 — Knowledge Graph + PageRank para priorização estrutural de tópicos.
 *
 * Conceitos:
 * - edges: pré-requisito -> tópico dependente
 * - PageRank: mede importância estrutural do tópico
 * - prereqReadiness: quão pronto está o pré-requisito
 * - blockedBy: pré-requisitos fracos que bloqueiam o tópico
 *
 * Configuração global opcional:
 *
 * globalThis.__COACH_KNOWLEDGE_GRAPH__ = {
 *   "Matemática": {
 *     prerequisites: {
 *       "Derivadas": ["Funções", "Limites"],
 *       "Integração": ["Derivadas"]
 *     }
 *   }
 * };
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeGraphName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna o grafo configurado para uma categoria.
 */
export function getKnowledgeGraphForCategory(categoryName) {
  try {
    const root = globalThis.__COACH_KNOWLEDGE_GRAPH__;
    if (!root || typeof root !== 'object') return null;

    const target = normalizeGraphName(categoryName);

    const key = Object.keys(root).find(
      (k) => normalizeGraphName(k) === target
    );

    if (key) return root[key];

    return root.default || null;
  } catch {
    return null;
  }
}

/**
 * Calcula métricas de grafo para tópicos.
 *
 * @param {Array<Object>} topics
 * Exemplo:
 * [
 *   { name: 'Funções', proficiency: 0.75, evidence: 0.8 },
 *   { name: 'Derivadas', proficiency: 0.35, evidence: 0.6 }
 * ]
 *
 * @param {Object} graphConfig
 * Exemplo:
 * {
 *   prerequisites: {
 *     "Derivadas": ["Funções", "Limites"]
 *   }
 * }
 *
 * @param {Object} options
 */
export function computeTopicGraphMetrics(topics = [], graphConfig = {}, options = {}) {
  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  if (safeTopics.length === 0) {
    return {
      global: {
        nodeCount: 0,
        edgeCount: 0,
      },
      topics: [],
    };
  }

  const displayName = new Map();
  const proficiency = new Map();
  const evidence = new Map();

  safeTopics.forEach((topic, index) => {
    const norm = normalizeGraphName(topic?.name ?? `topic-${index}`);

    displayName.set(norm, String(topic?.name ?? norm));

    const rawProficiency = Number(topic?.proficiency);
    const rawPercentage = Number(topic?.percentage);

    let safeProficiency = 0.25;

    if (Number.isFinite(rawProficiency)) {
      safeProficiency = clampFinite(rawProficiency, 0, 1, 0.25);
    } else if (Number.isFinite(rawPercentage)) {
      safeProficiency = clampFinite(rawPercentage / 100, 0, 1, 0.25);
    }

    proficiency.set(norm, safeProficiency);

    const rawEvidence = Number(topic?.evidence);
    evidence.set(norm, Number.isFinite(rawEvidence) ? clampFinite(rawEvidence, 0, 1, 0) : 0);
  });

  const nodes = [...displayName.keys()];
  const nodeSet = new Set(nodes);

  const rawEdges = [];
  const prereqMap = new Map();

  nodes.forEach((node) => {
    prereqMap.set(node, []);
  });

  function addEdge(from, to, weight = 1) {
    const fromNorm = normalizeGraphName(from);
    const toNorm = normalizeGraphName(to);

    if (!fromNorm || !toNorm || fromNorm === toNorm) return;

    const safeWeight = Math.max(0.1, Number(weight) || 1);

    rawEdges.push({
      from: fromNorm,
      to: toNorm,
      weight: safeWeight,
    });

    if (nodeSet.has(toNorm)) {
      const current = prereqMap.get(toNorm) || [];
      if (!current.includes(fromNorm)) {
        current.push(fromNorm);
        prereqMap.set(toNorm, current);
      }
    }
  }

  // Formato 1: edges
  if (Array.isArray(graphConfig?.edges)) {
    graphConfig.edges.forEach((edge) => {
      addEdge(
        edge?.from ?? edge?.prerequisite,
        edge?.to ?? edge?.topic,
        edge?.weight
      );
    });
  }

  // Formato 2: prerequisites
  if (graphConfig?.prerequisites && typeof graphConfig.prerequisites === 'object') {
    Object.entries(graphConfig.prerequisites).forEach(([topic, prerequisites]) => {
      const list = Array.isArray(prerequisites)
        ? prerequisites
        : [prerequisites];

      list.forEach((prerequisite) => {
        addEdge(prerequisite, topic, 1);
      });
    });
  }

  const outgoing = new Map(nodes.map((node) => [node, []]));
  const incoming = new Map(nodes.map((node) => [node, []]));
  const outWeight = new Map(nodes.map((node) => [node, 0]));

  rawEdges.forEach((edge) => {
    if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) return;

    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);

    outWeight.set(
      edge.from,
      (outWeight.get(edge.from) || 0) + edge.weight
    );
  });

  const damping = clampFinite(options.damping, 0, 1, 0.85);
  const iterations = Math.round(clampFinite(options.iterations, 5, 100, 35));

  let pageRank = new Map(nodes.map((node) => [node, 1 / nodes.length]));

  for (let i = 0; i < iterations; i++) {
    const next = new Map(
      nodes.map((node) => [node, (1 - damping) / nodes.length])
    );

    nodes.forEach((node) => {
      const inbound = incoming.get(node) || [];

      inbound.forEach((edge) => {
        const weightFrom = outWeight.get(edge.from) || 0;
        if (weightFrom <= 0) return;

        const contribution =
          (pageRank.get(edge.from) || 0) * (edge.weight / weightFrom);

        next.set(node, (next.get(node) || 0) + damping * contribution);
      });
    });

    const sum = [...next.values()].reduce((acc, val) => acc + val, 0) || 1;

    nodes.forEach((node) => {
      next.set(node, (next.get(node) || 0) / sum);
    });

    pageRank = next;
  }

  let maxPageRank = 1e-9;
  for (const pr of pageRank.values()) {
    if (pr > maxPageRank) maxPageRank = pr;
  }
  const readinessThreshold = clampFinite(options.readinessThreshold, 0, 1, 0.6);

  const topicMetrics = nodes.map((node) => {
    const prerequisites = prereqMap.get(node) || [];

    let prereqReadiness = 1;
    let prereqGap = 0;
    const blockedBy = [];

    if (prerequisites.length > 0) {
      const values = prerequisites.map((prereq) => {
        return proficiency.get(prereq) ?? 0.35;
      });

      const sum = values.reduce((acc, val) => acc + val, 0);
      prereqReadiness = sum / values.length;

      prereqGap = Math.max(0, readinessThreshold - prereqReadiness);

      prerequisites.forEach((prereq, idx) => {
        const prereqProficiency = values[idx] ?? 0.35;
        if (prereqProficiency < readinessThreshold) {
          blockedBy.push(displayName.get(prereq) || prereq);
        }
      });
    }

    const rawPageRank = pageRank.get(node) || 0;
    const normalizedPageRank = rawPageRank / maxPageRank;

    return {
      name: displayName.get(node) || node,
      normalizedKey: node,
      pageRank: Number(rawPageRank.toFixed(6)),
      normalizedPageRank: Number(normalizedPageRank.toFixed(6)),
      graphImportance: Number(normalizedPageRank.toFixed(6)),
      indegree: (incoming.get(node) || []).length,
      outdegree: (outgoing.get(node) || []).length,
      prerequisiteCount: prerequisites.length,
      prereqReadiness: Number(prereqReadiness.toFixed(4)),
      prereqGap: Number(prereqGap.toFixed(4)),
      blockedBy,
    };
  });

  return {
    global: {
      nodeCount: nodes.length,
      edgeCount: rawEdges.filter(
        (edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to)
      ).length,
      damping,
      iterations,
    },
    topics: topicMetrics,
  };
}

export default {
  normalizeGraphName,
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
};


```

---

### Arquivo: `src/engine/probabilistic/posteriorPredictive.js`
*Linhas: 353 | Tamanho: 8.5 KB*

```javascript
/**
 * posteriorPredictive.js
 *
 * Lote 3 — Posterior Predictive Monte Carlo para o Coach.
 *
 * Objetivo:
 * - estimar P(score futuro >= meta) usando distribuição posterior aproximada;
 * - incorporar incerteza de habilidade, tendência e volatilidade;
 * - reduzir overconfidence em cenários com poucos dados;
 * - permitir blend conservador com o Monte Carlo legado.
 *
 * Modelo simplificado:
 *
 * ability_i ~ Normal(ability, abilitySd)
 * trendShift_i ~ Normal(trendMean, trendSd)
 * noise_i ~ Normal(0, sigma * sqrt(horizon))
 * score_future_i = ability_i + trendShift_i + noise_i
 *
 * Onde:
 * - ability = nível atual estimado;
 * - abilitySd = incerteza do nível atual;
 * - trendMean = tendência futura amortecida;
 * - sigma = volatilidade diária estimada;
 * - horizon = dias até o horizonte efetivo.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function kahanSumLocal(values) {
  let sum = 0;
  let c = 0;

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }

  return sum;
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGaussianSampler(rng) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = rng();
    let v = rng();

    let attemptsU = 0;
    while (u === 0 && attemptsU < 100) { u = rng(); attemptsU++; }
    if (u <= 0) u = 1e-15;

    let attemptsV = 0;
    while (v === 0 && attemptsV < 100) { v = rng(); attemptsV++; }
    if (v <= 0) v = 1e-15;

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * v);
    const z1 = magnitude * Math.sin(2.0 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Estima a probabilidade posterior preditiva de atingir a meta.
 *
 * @param {Object} input
 * @param {number} [input.ability]
 * @param {number} [input.abilitySd]
 * @param {number} [input.trendPerDay]
 * @param {number} [input.trendSd]
 * @param {number} [input.dailyVolatility]
 * @param {number} [input.horizonDays]
 * @param {number} [input.targetScore]
 * @param {number} [input.minScore]
 * @param {number} [input.maxScore]
 * @param {number} [input.sampleSize]
 * @param {number} [input.baseProbability]
 * @param {Object} options
 * @param {number} [options.simulations]
 * @param {string} [options.seed]
 * @param {boolean} [options.blendWithBase]
 * @param {number} [options.trendHalfLifeDays]
 * @returns {Object|null}
 */
export function estimatePosteriorPredictive(input = {}, options = {}) {
  const maxScore = clampFinite(input.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(input.minScore, 0, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const ability = clampFinite(
    input.ability,
    minScore,
    maxScore,
    minScore + domain * 0.5
  );

  const targetScore = clampFinite(
    input.targetScore,
    minScore,
    maxScore,
    minScore + domain * 0.8
  );

  const horizonDays = clampFinite(input.horizonDays, 0, 180, 30);

  const simulations = Math.round(
    clampFinite(options.simulations ?? input.simulations, 200, 3000, 800)
  );

  const seed =
    options.seed ??
    `ppm_${ability.toFixed(2)}_${targetScore.toFixed(2)}_${horizonDays}_${simulations}`;

  const rng = mulberry32(hashSeed(seed));
  const gaussian = createGaussianSampler(rng);

  const abilitySd = clampFinite(
    input.abilitySd,
    0,
    domain * 0.25,
    domain * 0.05
  );

  const trendPerDay = clampFinite(
    input.trendPerDay,
    -domain * 0.02,
    domain * 0.02,
    0
  );

  const trendSd = clampFinite(
    input.trendSd,
    0,
    domain * 0.01,
    domain * 0.002
  );

  const dailyVolatility = clampFinite(
    input.dailyVolatility,
    0,
    domain * 0.25,
    domain * 0.03
  );

  const sampleSize = Math.max(
    0,
    Math.round(clampFinite(input.sampleSize, 0, 10000, 0))
  );

  // A tendência não deve ser projetada linearmente para sempre.
  // Usamos um amortecimento estilo meia-vida.
  const trendHalfLifeDays = clampFinite(
    options.trendHalfLifeDays,
    7,
    120,
    45
  );

  const effectiveTrendDays =
    trendHalfLifeDays * (1 - Math.exp(-horizonDays / trendHalfLifeDays));

  const meanTrendShift = trendPerDay * effectiveTrendDays;

  const trendShiftSd = Math.max(
    1e-9,
    trendSd * effectiveTrendDays * 0.6
  );

  const baseNoiseSd =
    dailyVolatility * Math.sqrt(Math.max(0, horizonDays));

  // Casos extremos.
  if (targetScore <= minScore) {
    return {
      model: 'posterior_predictive_normal_trend_damped',
      probability: 100,
      probabilityRaw: 100,
      mean: ability,
      ciLow: minScore,
      ciHigh: maxScore,
      horizonDays,
      simulations,
      sampleSize,
      sampleTrust: 1,
      inputs: {
        ability,
        abilitySd,
        trendPerDay,
        trendSd,
        dailyVolatility,
        targetScore,
        minScore,
        maxScore,
      },
      diagnostics: {
        effectiveTrendDays,
        meanTrendShift,
        trendShiftSd,
        baseNoiseSd,
        successCount: simulations,
      },
    };
  }

  const samples = new Array(simulations);
  let successCount = 0;

  for (let i = 0; i < simulations; i++) {
    const sampledAbility = ability + gaussian() * abilitySd;

    const sampledTrendShift =
      meanTrendShift + gaussian() * trendShiftSd;

    // Volatilidade heteroscedástica leve + cauda pesada ocasional.
    let volatilityMultiplier = 0.8 + 0.4 * rng();

    if (rng() < 0.07) {
      volatilityMultiplier *= 1.65;
    }

    const noise = gaussian() * baseNoiseSd * volatilityMultiplier;

    let futureScore = sampledAbility + sampledTrendShift + noise;

    if (futureScore < minScore) futureScore = minScore;
    if (futureScore > maxScore) futureScore = maxScore;

    samples[i] = futureScore;

    if (futureScore >= targetScore) {
      successCount++;
    }
  }

  const sortedSamples = samples.slice().sort((a, b) => a - b);

  const mean = kahanSumLocal(samples) / simulations;
  const ciLow = quantileSorted(sortedSamples, 0.025);
  const ciHigh = quantileSorted(sortedSamples, 0.975);

  const rawProbability = (successCount / simulations) * 100;

  // Confiança baseada no tamanho amostral.
  const sampleTrust =
    sampleSize > 0
      ? Math.min(1, sampleSize / (sampleSize + 8))
      : 0.35;

  const baseProbability = clampFinite(input.baseProbability, 0, 100, NaN);

  let probability = rawProbability;

  if (options.blendWithBase !== false && Number.isFinite(baseProbability)) {
    probability =
      sampleTrust * rawProbability +
      (1 - sampleTrust) * baseProbability;
  }

  probability = clampFinite(probability, 0, 100, rawProbability);

  return {
    model: 'posterior_predictive_normal_trend_damped',
    probability,
    probabilityRaw: rawProbability,
    mean,
    ciLow,
    ciHigh,
    horizonDays,
    simulations,
    sampleSize,
    sampleTrust,
    inputs: {
      ability,
      abilitySd,
      trendPerDay,
      trendSd,
      dailyVolatility,
      targetScore,
      minScore,
      maxScore,
    },
    diagnostics: {
      effectiveTrendDays,
      meanTrendShift,
      trendShiftSd,
      baseNoiseSd,
      successCount,
    },
  };
}

export default {
  estimatePosteriorPredictive,
};


```

---

### Arquivo: `src/engine/probabilistic/stateSpace.js`
*Linhas: 352 | Tamanho: 9.2 KB*

```javascript
/**
 * stateSpace.js
 *
 * Lote 1 — State-Space / Kalman Filter para habilidade e tendência.
 *
 * Modelo:
 *
 * ability_t = ability_{t-1} + trend_{t-1} * dt + eta_t
 * trend_t   = trend_{t-1} + zeta_t
 * score_t   = ability_t + epsilon_t
 *
 * Onde:
 * - ability = nível real latente do aluno;
 * - trend = tendência em pontos por dia;
 * - dt = dias decorridos entre observações;
 * - eta/zeta = ruído de processo;
 * - epsilon = ruído de medição.
 *
 * Este módulo não substitui o motor atual por padrão.
 * Ele só será usado se as feature flags estiverem ativas.
 */

import { getSafeScore } from '../../utils/scoreHelper.js';

/**
 * State Space Model para estimativa de habilidade latente.
 * Usa filtro de Kalman simplificado com média de Kahan corrigida.
 */

/**
 * ✅ CORRIGE BUG-003: Média de Kahan agora divide pelo contador de valores válidos,
 * não pelo length original do array.
 *
 * Antes: sum / values.length (errado com NaN)
 * Depois: sum / count (correto)
 */
function kahanMean(values) {
  if (!Array.isArray(values) || values.length === 0) return null; // ✅ FIX #5: null ao invés de 0

  let sum = 0;
  let c = 0;
  let count = 0; // ✅ contador de valores válidos

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  // ✅ FIX #5: Se nenhum valor válido, retorna null (sem dados), não 0 (média zero)
  // Permite consumidor diferenciar "sem dados" de "média é zero"
  return count === 0 ? null : sum / count;
}

/**
 * Variância com soma de Kahan.
 */
function kahanVariance(values, mean = null) {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const validValues = values.map(Number).filter(Number.isFinite);
  if (validValues.length === 0) return 0;

  const avg = mean ?? kahanMean(validValues);

  let sum = 0;
  let c = 0;
  let count = 0;

  for (const value of validValues) {
    const diff = (value - avg) ** 2;
    const y = diff - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  return count <= 1 ? 0 : sum / (count - 1);
}

/**
 * Desvio padrão com soma de Kahan.
 */
function kahanStd(values, mean = null) {
  const variance = kahanVariance(values, mean);
  if (!Number.isFinite(variance)) return 0;
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Helpers para o modelo State-Space/Kalman usado pelo coach.
 */
function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function parseObservationTime(entry) {
  if (!entry || typeof entry !== 'object') return NaN;

  const rawDate = entry.date ?? entry.createdAt ?? entry.timestamp ?? entry.time;
  if (!rawDate) return NaN;

  const parsed = Date.parse(rawDate);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Estima habilidade e tendência usando filtro de Kalman simplificado.
 * Compatível com o código do coach que espera campos como abilitySd/trendPerDay.
 */
export function kalmanAbilityTrend(observations = [], options = {}) {
  const maxScore = clampNumber(options.maxScore ?? 100, 1, 100000);
  const minScore = clampNumber(options.minScore ?? 0, 0, maxScore);
  const domain = Math.max(1e-6, maxScore - minScore);

  const obs = (Array.isArray(observations) ? observations : [])
    .map((entry, index) => {
      const score = getSafeScore(entry, maxScore, minScore);
      const time = parseObservationTime(entry);

      return {
        index,
        score: Number.isFinite(score) ? clampNumber(score, minScore, maxScore) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);

  if (obs.length < 2) {
    return null;
  }

  const scores = obs.map((entry) => entry.score);

  const initialAbility = clampNumber(
    kahanMean(scores.slice(0, Math.min(3, scores.length))) ?? scores[0],
    minScore,
    maxScore
  );

  let observationVariance = Math.pow(domain * 0.08, 2);

  if (scores.length >= 3) {
    const mean = kahanMean(scores);
    const variance =
      scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
      Math.max(1, scores.length - 1);

    observationVariance = Math.max(
      Math.pow(domain * 0.04, 2),
      Math.min(Math.pow(domain * 0.25, 2), (variance * 0.75) + Math.pow(domain * 0.03, 2))
    );
  }

  let ability = initialAbility;
  let trend = 0;

  let P00 = Math.max(observationVariance, Math.pow(domain * 0.12, 2));
  let P01 = 0;
  let P11 = Math.pow(domain * 0.01, 2);

  const qAbility = Math.pow(domain * 0.005, 2);
  const qTrend = Math.pow(domain * 0.001, 2);
  const maxTrendPerDay = Math.max(0.05, domain * 0.015);

  let previousTime = obs[0].time;
  let logLikelihood = 0;

  for (let i = 0; i < obs.length; i++) {
    const current = obs[i];
    const y = clampNumber(current.score, minScore, maxScore);

    if (i > 0) {
      const dtDays = clampNumber((current.time - previousTime) / 86400000, 0.25, 60);

      ability = clampNumber(ability + trend * dtDays, minScore, maxScore);

      const nextP00 =
        P00 + 2 * dtDays * P01 + dtDays * dtDays * P11 + qAbility * dtDays;
      const nextP01 = P01 + dtDays * P11;
      const nextP11 = P11 + qTrend * dtDays;

      P00 = Math.max(1e-12, nextP00);
      P01 = nextP01;
      P11 = Math.max(1e-12, nextP11);

      previousTime = current.time;
    }

    const innovation = y - ability;
    const S = P00 + observationVariance;

    if (!Number.isFinite(S) || S <= 1e-12) {
      continue;
    }

    const K0 = P00 / S;
    const K1 = P01 / S;

    ability = clampNumber(ability + K0 * innovation, minScore, maxScore);
    trend = clampNumber(trend + K1 * innovation, -maxTrendPerDay, maxTrendPerDay);

    const A00 = 1 - K0;
    const A01 = 0;
    const A10 = -K1;
    const A11 = 1;

    const AP00 = A00 * P00 + A01 * P01;
    const AP01 = A00 * P01 + A01 * P11;
    const AP10 = A10 * P00 + A11 * P01;
    const AP11 = A10 * P01 + A11 * P11;

    const newP00 =
      AP00 * A00 +
      AP01 * A01 +
      K0 * observationVariance * K0;

    const newP01 =
      AP00 * A01 +
      AP01 * A11 +
      K0 * observationVariance * K1;

    const newP11 =
      AP10 * A01 +
      AP11 * A11 +
      K1 * observationVariance * K1;

    P00 = Math.max(1e-12, newP00);
    P01 = newP01;
    P11 = Math.max(1e-12, newP11);

    logLikelihood +=
      -0.5 * Math.log(2 * Math.PI * S) -
      0.5 * ((innovation * innovation) / S);
  }

  const trendPerMonth = clampNumber(trend * 30, -domain, domain);

  return {
    model: 'local_level_trend_kalman',
    ability: clampNumber(ability, minScore, maxScore),
    trendPerDay: clampNumber(trend, -maxTrendPerDay, maxTrendPerDay),
    trendPerMonth,
    abilitySd: Math.sqrt(Math.max(0, P00)),
    trendSd: Math.sqrt(Math.max(0, P11)),
    observationVariance,
    processNoise: {
      ability: qAbility,
      trend: qTrend,
    },
    logLikelihood,
    sampleSize: obs.length,
    maxScore,
    minScore,
  };
}

/**
 * Filtro de Kalman simplificado para estimativa de habilidade.
 */
export function runStateSpaceModel(scores, options = {}) {
  const {
    processNoise = 0.1,
    observationNoise = 1.0,
    initialVariance = 100,
  } = options;

  const validScores = Array.isArray(scores)
    ? scores.map(Number).filter(Number.isFinite)
    : [];

  if (validScores.length === 0) {
    return {
      ability: 0,
      variance: initialVariance,
      trend: 0,
      insufficientData: true,
    };
  }

  // ✅ CORRIGE BUG-003: usa kahanMean corrigido
  const initialAbility = kahanMean(validScores) ?? 50; // ✅ FIX #5: fallback para 50 se null
  const initialStd = kahanStd(validScores, initialAbility);

  let ability = initialAbility;
  let variance = Math.max(initialVariance, initialStd ** 2);

  let trendSum = 0;
  let trendCount = 0;
  let prevAbility = ability;

  for (const score of validScores) {
    // Predição
    const predictedVariance = variance + processNoise;

    // Atualização (gain)
    const gain = predictedVariance / (predictedVariance + observationNoise);

    // Inovação
    const innovation = score - ability;

    // Atualização de estado
    ability = ability + gain * innovation;
    variance = (1 - gain) * predictedVariance;

    // Trend
    if (trendCount > 0) {
      trendSum += ability - prevAbility;
    }
    trendCount++;

    prevAbility = ability;
  }

  const trend = trendCount > 1 ? trendSum / (trendCount - 1) : 0;

  return {
    ability,
    variance,
    std: Math.sqrt(variance),
    trend,
    n: validScores.length,
    insufficientData: validScores.length < 3,
  };
}

/**
 * Wrapper para compatibilidade com código existente.
 */
export function estimateAbility(scores, options = {}) {
  return runStateSpaceModel(scores, options);
}

export default {
  runStateSpaceModel,
  estimateAbility,
  kalmanAbilityTrend,
  kahanMean,
  kahanVariance,
  kahanStd,
};


```

---

### Arquivo: `src/engine/probabilistic/volatility.js`
*Linhas: 331 | Tamanho: 9.4 KB*

```javascript
/**
 * volatility.js
 *
 * Lote 2 — Volatilidade dinâmica EWMA/GARCH para o Coach.
 *
 * Objetivo:
 * - estimar volatilidade condicional futura;
 * - reduzir reação excessiva a ruído antigo;
 * - aumentar reação a instabilidade recente;
 * - fornecer base para Monte Carlo posterior preditivo no Lote 3.
 *
 * Modelos:
 * - EWMA:
 *   sigma2_t = lambda * sigma2_{t-1} + (1 - lambda) * r_t^2
 *
 * - GARCH(1,1) simplificado:
 *   sigma2_t = omega + alpha * r_t^2 + beta * sigma2_{t-1}
 *
 * Importante:
 * Este módulo não substitui o motor atual por padrão.
 * Ele só afeta o sistema se as feature flags estiverem ativas.
 */

import { kahanSum } from '../math/kahan.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseTime(value) {
  if (value === null || value === undefined) return NaN;

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return NaN;
  const sorted = [...values]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return NaN;

  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Estima volatilidade dinâmica a partir do histórico de simulados.
 *
 * @param {Array<{score:number,date?:string,createdAt?:string}|number>} history
 * @param {Object} options
 * @param {number} [options.maxScore=100]
 * @param {number} [options.minScore=0]
 * @param {boolean} [options.useGarch=false]
 * @param {boolean} [options.override=false]
 * @param {number} [options.horizonDays]
 * @returns {Object|null}
 */
export function estimateDynamicVolatility(history = [], options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(options.minScore, 0, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const useGarch = options.useGarch === true;
  const override = options.override === true;

  const rawHistory = Array.isArray(history)
    ? history
    : Object.values(history || {});

  const observations = rawHistory
    .map((entry, index) => {
      const score = Number(entry?.score ?? entry);
      const time = parseTime(entry?.date ?? entry?.createdAt ?? entry?.timestamp);

      return {
        index,
        score: Number.isFinite(score) ? clampFinite(score, minScore, maxScore, score) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      const hasTimeA = Number.isFinite(a.time);
      const hasTimeB = Number.isFinite(b.time);

      if (hasTimeA && hasTimeB && a.time !== b.time) {
        return a.time - b.time;
      }

      return a.index - b.index;
    });

  if (observations.length < 3) {
    return null;
  }

  const scores = observations.map((entry) => entry.score);
  const n = scores.length;

  // Volatilidade fallback: desvio padrão amostral com shrinkage.
  const mean = kahanSum(scores) / n;
  const sampleVariance =
    n > 1
      ? kahanSum(scores.map((score) => Math.pow(score - mean, 2))) / (n - 1)
      : 0;

  const fallbackVolatility =
    Math.sqrt(Math.max(0, sampleVariance)) * (n / (n + 4)) +
    domain * 0.08 * (4 / (n + 4));

  // Retornos diários aproximados.
  const returns = [];
  const dts = [];

  for (let i = 1; i < observations.length; i++) {
    const prev = observations[i - 1];
    const curr = observations[i];

    let dtDays = 1;

    if (
      Number.isFinite(prev.time) &&
      Number.isFinite(curr.time) &&
      curr.time > prev.time
    ) {
      dtDays = clampFinite((curr.time - prev.time) / 86400000, 0.25, 60, 1);
    }

    const diff = curr.score - prev.score;
    const dailyReturn = diff / Math.sqrt(dtDays);

    if (Number.isFinite(dailyReturn)) {
      returns.push(dailyReturn);
      dts.push(dtDays);
    }
  }

  if (returns.length < 2) {
    return null;
  }

  const medianGapDays = clampFinite(median(dts), 0.5, 60, 7);
  const horizonDays = clampFinite(options.horizonDays, 1, 90, medianGapDays);

  // Winsorização leve dos retornos para reduzir outliers.
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const lower = quantileSorted(sortedReturns, 0.05);
  const upper = quantileSorted(sortedReturns, 0.95);

  const winsorizedReturns = returns.map((r) =>
    clampFinite(r, lower, upper, r)
  );

  const returnMean = kahanSum(winsorizedReturns) / winsorizedReturns.length;

  const returnVariance =
    winsorizedReturns.length > 1
      ? kahanSum(
          winsorizedReturns.map((r) => Math.pow(r - returnMean, 2))
        ) / (winsorizedReturns.length - 1)
      : 0;

  const unconditionalDailyVariance = Math.max(
    Math.pow(domain * 0.0015, 2),
    returnVariance
  );

  let sigma2Daily = unconditionalDailyVariance;
  let model = 'ewma';
  let omega = null;
  let alpha = null;
  let beta = null;
  let persistence = 0.94;

  const maxSigma2 = Math.pow(domain * 0.25, 2);

  if (useGarch && returns.length >= 5) {
    model = 'garch11';

    alpha = returns.length >= 12 ? 0.10 : 0.14;
    beta = returns.length >= 12 ? 0.82 : 0.72;

    // Estacionaridade: alpha + beta < 1.
    if (alpha + beta > 0.95) {
      beta = 0.95 - alpha;
    }

    omega = Math.max(
      1e-12,
      unconditionalDailyVariance * Math.max(0.03, 1 - alpha - beta)
    );

    persistence = alpha + beta;

    for (let i = 0; i < returns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const shock = returns[i] * returns[i];
      const betaEffective = Math.pow(beta, dt);

      const omegaAdjusted = omega * (1 - betaEffective) / (1 - beta);
      sigma2Daily =
        omegaAdjusted +
        alpha * shock +
        betaEffective * sigma2Daily;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  } else {
    model = 'ewma';

    const lambda = 0.94;
    persistence = lambda;

    for (let i = 0; i < returns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const lambdaEffective = Math.pow(lambda, dt);
      const shock = returns[i] * returns[i];

      sigma2Daily =
        lambdaEffective * sigma2Daily +
        (1 - lambdaEffective) * shock;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  }

  const dailyVolatility = Math.sqrt(Math.max(0, sigma2Daily));

  // Converte volatilidade diária em volatilidade esperada para o intervalo típico.
  const modelVolatility =
    dailyVolatility * Math.sqrt(Math.max(1, horizonDays));

  // Shrinkage bayesiano simples por tamanho amostral.
  const sampleTrust = Math.min(1, returns.length / (returns.length + 8));

  const blendedVolatility =
    sampleTrust * modelVolatility +
    (1 - sampleTrust) * fallbackVolatility;

  const rawVolatility = override ? modelVolatility : blendedVolatility;

  const volatility = clampFinite(
    rawVolatility,
    0,
    domain * 0.65,
    fallbackVolatility
  );

  return {
    model,
    volatility,
    modelVolatility: clampFinite(modelVolatility, 0, domain * 0.65, modelVolatility),
    fallbackVolatility: clampFinite(fallbackVolatility, 0, domain * 0.65, fallbackVolatility),
    dailyVolatility: clampFinite(dailyVolatility, 0, domain * 0.20, dailyVolatility),
    horizonDays,
    medianGapDays,
    sampleSize: returns.length,
    parameters: {
      omega,
      alpha,
      beta,
      persistence,
    },
    diagnostics: {
      returnMean,
      returnVariance,
      unconditionalDailyVariance,
      maxSigma2,
    },
  };
}

const isDev =
  typeof process !== 'undefined' &&
  process.env &&
  process.env.NODE_ENV !== 'production';

if (isDev) {
  // Teste: a variância de longo prazo deve convergir para ω/(1-α-β)
  // independentemente do valor de dt
  const alphaG = 0.05, betaG = 0.75;
  const unconditionalVarG = 25; // σ²_∞ desejado
  const omegaG = (1 - alphaG - betaG) * unconditionalVarG; // = 5

  let testSigma2 = unconditionalVarG;
  for (let i = 0; i < 500; i++) {
    const dt = 1 + Math.random() * 5; // dt variável entre 1 e 6 dias
    const betaEff = Math.pow(betaG, dt);
    const omegaAdj = omegaG * (1 - betaEff) / (1 - betaG);
    const shock = (Math.random() - 0.5) * 10;
    testSigma2 = omegaAdj + alphaG * shock * shock + betaEff * testSigma2;
  }
  console.assert(Math.abs(testSigma2 - unconditionalVarG) < unconditionalVarG * 0.3,
    `Variância deveria convergir para ~${unconditionalVarG}, obteve ${testSigma2}`);
}

export default {
  estimateDynamicVolatility,
};


```

---

### Arquivo: `src/engine/projection.js`
*Linhas: 1.017 | Tamanho: 49.4 KB*

```javascript
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
// ✅ LOTE-04 FIX: Z_95 e MIN_SD_FLOOR removidos — não eram usados aqui
// (Z_95 vive em stats.js; MIN_SD_FLOOR vive em gaussian.js)
import { kahanSum, kahanMean } from './math/kahan.js';
import { weightedRegression, getSortedHistory, calculateSlopePerDay } from './stats.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
// ✅ LOTE-04 FIX: re-export removido. Estes símbolos já são exportados por
// stats.js; o engine/index.js faz `export *` dos dois, e a duplicidade criava
// ambiguidade de star-export. O import interno acima continua intacto.

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
export function computeNonLinearTrend(history, maxScore = 100, lambda = 0.08, minScore = 0) {
  const sorted = getSortedHistory(history);
  if (sorted.length < 4) return { slope: 0, intercept: 50, type: 'linear' };

  const now = Date.now();
  const t0 = getSafeTime(sorted[0].date || sorted[0].createdAt);

  // Fit simple model: y ~ a + b * log(1 + days)
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

  sorted.forEach(h => {
    const y = getSafeScore(h, maxScore, minScore);
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
    const validSorted = sorted.filter(h => Number.isFinite(getSafeScore(h, maxScore, minScore)));
    if (validSorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    const _scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(validSorted, lambda, maxScore, { ...options, minScore });
    // CORREÇÃO: Defesa estrita contra null/undefined que disparam TypeError no getTime()
    const d0 = safeDateParse(validSorted[0].date || validSorted[0].createdAt);
    const t0_vol = (d0 && !Number.isNaN(d0.getTime())) ? d0.getTime() : Date.now();
    
    // OTIMIZAÇÃO DE PERFORMANCE: Fusão de loops O(5N) para O(N)
    let sumWeights = 0, sumResidualsWeighted = 0, sumSw = 0;

    const residualSamples = validSorted.map(h => {
        const hDate = h.date || h.createdAt;
        const parsed = safeDateParse(hDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        const x = (parsed.getTime() - t0_vol) / 86400000;
        const t = Math.max(0, (now - parsed.getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore, minScore);
        const val = y - (intercept + slope * x); // Resíduo (detrended)
        
        // Acumulação numa única passagem
        sumWeights += w;
        sumResidualsWeighted += val * w;
        sumSw += val * val * w;

        return { value: val, weight: w }; 
    }).filter(Boolean);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-15 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-15 ? (sumResidualsWeighted / safeWeights) : 0;
    const n_res = validSorted.length - 1;
    const bessel = n_res > 1 ? n_res / (n_res - 1) : 1;
    const mssdVariance = ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = sortedArr.reduce((acc, it) => acc + it.weight, 0);
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
    const robustVariance = Math.pow(1.4826 * mad, 2);
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
    const scores = history.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
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
    return 0.05 * range;
  }
  
  const firstDateObj = safeDateParse(safeHistory[0].date || safeHistory[0].createdAt);
  const t0 = firstDateObj ? firstDateObj.getTime() : Date.now();
  
  // ✅ FIX: Create aligned pairs to prevent index misalignment
  const validPairs = [];
  for (let i = 0; i < safeHistory.length; i++) {
    const h = safeHistory[i];
    const score = getSafeScore(h, maxScore, minScore);
    const dateObj = safeDateParse(h.date || h.createdAt);
    const t = dateObj ? dateObj.getTime() : NaN;
    
    if (Number.isFinite(score) && Number.isFinite(t)) {
      validPairs.push({
        score: score,
        timeX: (t - t0) / 86400000,
        fatigueFlag: h.fatigueFlag
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
      const isFatigueDrop = diff < 0 && validPairs[i]?.fatigueFlag;
      const effectiveDiff = isFatigueDrop ? diff * 0.5 : diff;
      sumSqDiff += Math.pow(effectiveDiff, 2);
      validTransitions++;
    }
  }
  
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
// ✅ FIX: calculateSlope com clamp proporcional à escala
export function calculateSlope(trendOrHistory, maxScoreOrOptions = 100, options = {}) {
  if (Array.isArray(trendOrHistory)) {
    const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
    const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
    
    const normalizedHistory = trendOrHistory
      .filter(item => item != null)
      .map(item => {
      if (typeof item === 'number') {
        return { score: item, date: null };
      }
      if (item && typeof item === 'object') {
        const score = Number(item.score ?? item.value);
        return {
          score: Number.isFinite(score) ? score : NaN,
          date: item.date || item.createdAt || null
        };
      }
      return { score: NaN, date: null };
    }).filter(item => Number.isFinite(item.score));
    
    if (normalizedHistory.length < 2) return 0;
    const result = calculateAdaptiveSlope(normalizedHistory, maxScore, opts);
    return Number.isFinite(result) ? result : 0;
  }
  
  // ✅ FIX: Clamp proporcional à amplitude real (maxScore - minScore) da prova
  const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
  const safeMax = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
  const safeMin = Number.isFinite(opts?.minScore) ? opts.minScore : 0;
  const range = Math.max(1e-9, safeMax - safeMin);
  // 0.4% do range por dia como limite máximo
  const absoluteMax = 0.004 * range;
  let slope = Number(trendOrHistory) || 0;
  if (!Number.isFinite(slope)) return 0;
  if (slope > absoluteMax) slope = absoluteMax;
  if (slope < -absoluteMax) slope = -absoluteMax;
  return slope;
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    const minScore = Number.isFinite(options?.minScore) ? options.minScore : 0;
    const trend = calculateSlopePerDay(history, maxScore, minScore);
    return calculateSlope(trend, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const minScore = options?.minScore || 0;
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
    if (historicalScores.length < 4) return { isLogistic: false };
    
    const meanVal = kahanSum(historicalScores) / Math.max(1, historicalScores.length);
    const devs = historicalScores.map(b => Math.pow(b - meanVal, 2));
    const currentVariance = Math.sqrt(kahanSum(devs) / Math.max(1, historicalScores.length - 1));

    let L = maxScore;
    if (historicalScores.length >= 4) {
        const validScores = historicalScores;
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
        const recentTrend = calculateSlopePerDay(recentAsObjects, maxScore, minScore);
        const recentSlope = calculateSlope(recentTrend, maxScore, options);
        const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (maxScore * 0.01)) : 0;
        
        L = robustPeak + (dynamicHeadroom * slopeMultiplier);
        L = Math.min(maxScore + 0.1, Math.max(validScores[validScores.length - 1] + 0.1, L));
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
        
        let y = getSafeScore(h, maxScore, minScore);
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
    if (!sortedHistory || sortedHistory.length === 0) return { projected: minScore, marginOfError: 0 };

    const logisticFit = logisticRegression(sortedHistory, maxScore, options);
    let projectedScore;
    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    
    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, { ...options, minScore }) : { slopeStdError: 0 };
    let eventVolatility = calculateMSSD(sortedHistory, maxScore, minScore);

    // Bug 2.3 Fix: Divergência Asintótica no Amortecimento
    let linearSlope = 0;
    if (!(logisticFit.isLogistic && logisticFit.k > 0)) {
        let trend = calculateSlopePerDay(sortedHistory, maxScore, minScore);
        linearSlope = calculateSlope(trend, maxScore, options);
    }

    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift: linearSlope,
        driftUncertainty: slopeStdError,
        scaleFactor: (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100,
        normalizedVol: (eventVolatility / (maxScore - minScore > 0 ? maxScore - minScore : maxScore)) * 100
    });

    const maxEffectiveDays = dampingBase * Math.log(1 + projectDays / dampingBase);
    const effectiveDaysForDrift = Math.min(projectDays, maxEffectiveDays);

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = options.minScore !== undefined ? options.minScore : (minScore || 0);
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        // Removemos a mistura corrompida. O EMA continuará a usar o `linearSlope`
        // para projetar o futuro no Random Walk.

        const rawScore = getSafeScore(sortedHistory[0], maxScore, minScore);
        let ema = Number.isFinite(rawScore) ? rawScore : minScore;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore, minScore);
            
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

    const tLast = getSafeTime(sortedHistory[sortedHistory.length - 1]?.date || sortedHistory[sortedHistory.length - 1]?.createdAt);
    const tFirst = getSafeTime(sortedHistory[0]?.date || sortedHistory[0]?.createdAt);
    const rawGapDays = sortedHistory.length > 1
        ? ((tLast - tFirst) / 86400000) / Math.max(1, sortedHistory.length - 1)
        : 7;
    const avgGapDays = Number.isFinite(rawGapDays) && rawGapDays > 0 ? rawGapDays : 7;
        
    // AGILIDADE AI: Punição de Volatilidade baseada no tempo de resposta lento
    if (options.agilityPenalty) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        eventVolatility = eventVolatility * (1 + safePenalty * 1.5);
    }
    
    // A incerteza do Random Walk espalha-se com a raiz do número de EVENTOS ESPERADOS, não dos dias.
    const expectedFutureEvents = Math.max(1, projectDays / Math.max(0.5, avgGapDays));
    const randomWalkUncertainty = eventVolatility * Math.sqrt(expectedFutureEvents);
    
    // Aplica o amortecimento do drift à incerteza angular (evita explosão da incerteza a longo prazo)
    const angularUncertainty = slopeStdError * effectiveDaysForDrift;
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    // Usar T-Student adaptativo para amostras pequenas em vez de Z=1.96 fixo
    const tMult = getConfidenceMultiplier(sortedHistory.length);
    const marginOfError = Math.min((maxScore - minScore), tMult * predictionSD); 

    return {
        // FIX #2: Precisão completa
        projected: Number.isNaN(projectedScore) ? minScore : Math.max(minScore, Math.min(maxScore, projectedScore)),
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
        mean: minScore,
        sd: 0,
        ci95Low: minScore,
        ci95High: minScore,
        currentMean: minScore,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Find the last valid score in the sorted history
    let validCurrentScore = NaN;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const s = getSafeScore(sortedHistory[i], maxScore, minScore);
        if (Number.isFinite(s)) {
            validCurrentScore = s;
            break;
        }
    }
    const currentScore = Number.isFinite(validCurrentScore) ? validCurrentScore : minScore;
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;
    if (sortedHistory.length > 0) {
        const rawScore = getSafeScore(sortedHistory[0], maxScore, minScore);
        let ema = Number.isFinite(rawScore) ? rawScore : minScore;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore, minScore);

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
        baselineScore = optionsCurrentMean;
    }
    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;   // ✅ LOTE-03
    // ✅ LOTE-06 FIX (SCENARIO-1): meanBiasFactor é percentual do maxScore, não do range.
    // Com minScore > 0, usar range distorcia o bias (ex: 2.5% de 800 em vez de 2.5% de 1000).
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
    const histScores = sortedHistory.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
    const historicalMean = histScores.length > 0 ? kahanMean(histScores) : baselineScore;
    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, { ...options, minScore })
        : { slope: 0, slopeStdError: 0.05 * scaleFactorFallback };

    let effectiveDriftSlope = regressionResult.slope;

    trendType = 'linear';
    if (sortedHistory.length >= 4) {
        try {
            const nl = computeNonLinearTrend(sortedHistory, maxScore, 0.08, minScore);
            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
                trendType = 'log_time_available';
                // NOTE: Do not blend nl.slope directly (different units).
                // Drift uses pure linear slope for correctness.
            }
        } catch { /* ignore */ }
    }

    const slopeStdError = regressionResult.slopeStdError;
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * range;   // antes: * maxScore
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
        ? Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore), forcedVolatility)
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
    
    // ✅ FIX: thetaOU agora escala com a confiança da amostra.
    // Poucos dados → reversão mais forte (conservador).
    // Muitos dados → reversão mais fraca (confia na tendência).
    const sampleConfidence = Math.min(1, sortedHistory.length / 15);
    const thetaOU = Math.min(
      0.15,
      (0.02 + 0.06 * (1 - sampleConfidence)) + 0.002 * Math.min(40, normalizedVolOU)
    );

    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore, minScore);
        const actualChange = getSafeScore(h, maxScore, minScore) - prev;
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
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore, minScore)}-${sortedHistory.length}`;
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
    // A volatilidade estocástica diária deve ser escalada pelo gap médio entre provas
    // para que a variância cresça corretamente como um Random Walk/OU process.
    const dailyVolatility = Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore),
      volatility / Math.sqrt(Math.max(1, medianGap)));

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
    // ✅ LOTE-01 FIX (A7): clamp de sanidade do GARCH proporcional ao RANGE real,
    // não ao teto absoluto (consistente com as correções LOTE-03 do arquivo).
    const rangeVolClamp = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const maxVolSqClamp = Math.pow(rangeVolClamp * 0.2, 2);

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
          categoryNames: cutoffSubjects.map(s => String(s?.name ?? s?.id ?? 'subject')) 
      } : null;
      
      try {
        const cov = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
        const psdCov = ensurePositiveSemiDefinite(cov);
        subjectCholesky = choleskyDecomposition(psdCov);
      } catch (err) {
        console.warn('[Projection] Cholesky falhou, usando disciplinas independentes:', err?.message || err);
        subjectCholesky = null;
      }
    }

    function calculateSkewness(residuals, mean) {
        if (!residuals || residuals.length < 3) return 0;
        const n = residuals.length;
        let sumSquared = 0;
        for (let i = 0; i < n; i++) sumSquared += Math.pow(residuals[i] - mean, 2);
        const variance = sumSquared / n;
        const standardizer = Math.sqrt(variance);
        
        if (standardizer === 0) return 0;

        let m3 = 0;
        for (let i = 0; i < n; i++) m3 += Math.pow(residuals[i] - mean, 3);
        m3 /= n;

        return m3 / Math.pow(standardizer, 3);
    }
    
    // PATCH 1: Recalcular a média real do subconjunto filtrado
    const subsetMean = safeResiduals.length > 0 
        ? safeResiduals.reduce((acc, val) => acc + val, 0) / safeResiduals.length 
        : 0;

    const residualsSkew = calculateSkewness(safeResiduals, subsetMean);

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
        let accumulatedDrift = 0;

        for (let d = 1; d <= simulationDays; d++) {
            // [RIGOR-FIX] Drift Damping Adaptativo: O impacto da tendência diminui com o tempo (Log-decay)
            // dampingBase varia de 30 (conservador) a 60 (confiante) conforme qualidade do sinal.
            const driftDamping = 1 / (1 + d / dampingBase); 
            const driftEffect = sampledDrift * driftDamping;

            // Reversão de Ornstein-Uhlenbeck em relação à trajetória estrutural esperada antes do passo diário
            const prevTarget = Math.max(minScore, Math.min(maxScore, baselineScore + accumulatedDrift));
            let meanReversion = Math.max(0.005, thetaOU) * (prevTarget - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            // Prevent extreme reversion pulls that cause artificial boundary piling in long simulations
            const maxReversionPull = adaptiveVol * 3;
            meanReversion = Math.max(-maxReversionPull, Math.min(maxReversionPull, meanReversion));

            // Atualiza a trajetória esperada acumulada com o drift do dia
            accumulatedDrift += driftEffect;
            const maxDrift = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) * 0.5;
            accumulatedDrift = Math.max(-maxDrift, Math.min(maxDrift, accumulatedDrift));
            
            // CORREÇÃO: Padrão Ouro de Filtered Historical Simulation (FHS)
            // O choque empírico tem de ser escalado para a volatilidade GARCH atual
            let shock = 0;
            if (safeResiduals.length >= 15) {
                // 90% Bootstrap (Histórico Empírico) / 10% Gaussiano Assimétrico (Black Swan)
                if (rng() > 0.10) {
                    const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                    shock = (rawEmpirical / standardizer) * adaptiveVol; 
                } else {
                    // PATCH: Gaussian Skew Adjustment (Cornish-Fisher expansion to maintain zero mean)
                    const z = generateGaussian(rng);
                    const zCF = z + (residualsSkew * (z * z - 1)) / 6.0; 
                    shock = zCF * adaptiveVol;
                }
            } else if (safeResiduals.length > 5 && rng() > 0.3) {
                const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                shock = (rawEmpirical / standardizer) * adaptiveVol; 
            } else {
                shock = generateGaussian(rng) * adaptiveVol;
            }
            
            // ✅ LOTE-03 FIX: o clamp por dailyVolatility sufocava choques quando o GARCH
            // já tinha elevado adaptiveVol — a trajetória não podia realizar a própria variância
            const shockLimit = Math.max(dailyVolatility, adaptiveVol) * 3;
            const clampedShock = Math.max(-shockLimit, Math.min(shockLimit, shock));
            
            // Evolução da Volatilidade GARCH(1,1): Var(t+1) = w + a*e^2 + b*Var(t)
            currentVolSq = omega + alphaG * Math.pow(clampedShock, 2) + betaG * currentVolSq;
            
            // Clamp de sanidade para evitar divergência explosiva em projeções longas
            currentVolSq = Math.min(currentVolSq, maxVolSqClamp); // ✅ LOTE-01 FIX (A7)
            
            currentSimScore += driftEffect + meanReversion + clampedShock; // consistente com GARCH
            
            // Simple clamp to bounds (mean reversion + historical target should keep trajectories reasonable).
            // Removed complex RBM reflection which was causing boundary piling bias in declining series (scores clustering at minScore, skewing means low).
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Number.isNaN(currentSimScore) ? minScore : Math.max(minScore, Math.min(maxScore, currentSimScore));
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
                    // PATCH 2: Cholesky L matrix already contains standard deviations on its diagonal
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
    const conformal = conformalPredictionInterval(mcResiduals, 0.05, meanResult); // 95% coverage
    const rawCiLow = conformal.lower ?? getPercentile(results, 0.025, true);
    const rawCiHigh = conformal.upper ?? getPercentile(results, 0.975, true);
    const safeCiLow = Math.max(minScore, Math.min(maxScore, rawCiLow));
    const safeCiHigh = Math.max(minScore, Math.min(maxScore, rawCiHigh));

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
        ci95Low: safeCiLow,
        ci95High: safeCiHigh,
        ciConformalLow: safeCiLow,
        ciConformalHigh: safeCiHigh,
        currentMean: baselineScore,
        drift: (drift * 30),
        volatility,
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high',
        // NEW: non-linear trend availability
        trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
        diagnostics: {
            trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
            effectiveDriftSlope: typeof effectiveDriftSlope !== 'undefined' ? effectiveDriftSlope : 0,
            conformalCoverage: 0.95,
            simulationCount: safeSimulations,
            historicalMean: historicalMean || null,
            effectiveN: Math.max(1, sortedHistory.length)
        }
    };
}


```

---

### Arquivo: `src/engine/random.js`
*Linhas: 58 | Tamanho: 1.6 KB*

```javascript
export function mulberry32(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// BUGFIX H3: Box-Muller completo com cache do 2° valor.
// Antes: sin() era calculado e descartado, dobrando as chamadas ao RNG.
// Agora: o 2° valor é guardado em closure e retornado na próxima chamada.
// ⚠️ ATENÇÃO: altera a sequência do RNG — seeds existentes produzirão valores diferentes.
// Se reprodutibilidade de seeds históricas for crítica, manter o código antigo e comentar esta mudança.
export function makeNormalRng(rng) {
  let spare;
  let hasSpare = false;
  
  const next = () => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    let u = 0, v = 0;
    let attemptsU = 0;
    while (u === 0 && attemptsU < 100) {
      u = rng();
      attemptsU++;
    }
    if (u === 0) u = 1e-15;

    let attemptsV = 0;
    while (v === 0 && attemptsV < 100) {
      v = rng();
      attemptsV++;
    }
    if (v === 0) v = 1e-15;
    
    const mag = Math.sqrt(-2.0 * Math.log(u));
    spare = mag * Math.sin(2.0 * Math.PI * v);
    hasSpare = true;
    return mag * Math.cos(2.0 * Math.PI * v);
  };
  
  // ✅ FIX: função reset para limpar estado interno quando seed muda
  const reset = () => {
    spare = undefined;
    hasSpare = false;
  };
  
  // Retorna função com propriedade reset anexada
  next.reset = reset;
  return next;
}



```

---

### Arquivo: `src/engine/simulationCache.js`
*Linhas: 33 | Tamanho: 0.8 KB*

```javascript
export const simulationCache = new Map();
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function getCachedSimulation(seed) {
  const entry = simulationCache.get(seed);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    simulationCache.delete(seed);
    return null;
  }
  
  // LRU bump
  simulationCache.delete(seed);
  simulationCache.set(seed, entry);
  
  return entry.value;
}

export function setCachedSimulation(seed, result) {
  if (simulationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = simulationCache.keys().next().value;
    simulationCache.delete(firstKey);
  }
  simulationCache.set(seed, { value: result, timestamp: Date.now() });
}

export function clearSimulationCache() {
  simulationCache.clear();
}


```

---

### Arquivo: `src/engine/stats.js`
*Linhas: 1.229 | Tamanho: 48.9 KB*

```javascript
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { normalizeDate, safeDateParse } from '../utils/dateHelper.js';
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { computeAdaptiveLambda } from './diagnostics.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';

export const BAYESIAN_DECAY_FACTOR = 0.985;
export const RETENTION_DECAY_SHORT = 0.94;
export const RETENTION_DECAY_LONG = 0.992;

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

function safeFinite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function safeMaxScoreValue(maxScore, fallback = 100) {
    const n = Number(maxScore);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safeMinScoreValue(minScore, fallback = 0) {
    const n = Number(minScore);
    return Number.isFinite(n) ? n : fallback;
}

export function computeImprovedRetentionProbability(historyLength, lastGapDays = 7, maxAlpha = 0.9) {
    const shortDecay = Math.pow(RETENTION_DECAY_SHORT, Math.max(0, lastGapDays));
    const longDecay = Math.pow(RETENTION_DECAY_LONG, Math.max(0, lastGapDays * 0.6));
    const blended = 0.6 * shortDecay + 0.4 * longDecay;
    return Math.max(0.15, Math.min(maxAlpha, blended * maxAlpha));
}

export function getSortedHistory(history) {
    const histArray = toHistoryArray(history);
    if (!histArray.length) return [];

    return histArray
        .map((h, index) => {
            if (typeof h === 'number') {
                return { original: h, time: index };
            }

            const dateValue = h?.date ?? h?.createdAt;
            const parsed = safeDateParse(dateValue);
            const t = parsed ? parsed.getTime() : 0;

            return { original: h, time: t };
        })
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return String(a.original?.id || '').localeCompare(String(b.original?.id || ''));
        })
        .map(item => item.original);
}

export function pruneHistoryForMemory(history = [], maxPoints = 1500, maxAgeDays = 365 * 5) {
    const sorted = getSortedHistory(history);
    if (!sorted.length) return sorted;

    const now = Date.now();
    const cutoff = now - maxAgeDays * 86400000;

    let filtered = sorted.filter(h => {
        const t = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        return Number.isFinite(t) && t >= cutoff;
    });

    if (filtered.length <= maxPoints) return filtered;

    const recentCount = Math.max(10, Math.floor(maxPoints * 0.2));
    const older = filtered.slice(0, -recentCount);
    const recent = filtered.slice(-recentCount);

    if (older.length <= maxPoints - recentCount) return filtered;

    const targetCount = maxPoints - recentCount;
    const factor = older.length / targetCount;
    const sampledOlder = [];

    for (let i = 0; i < targetCount; i++) {
        sampledOlder.push(older[Math.floor(i * factor)]);
    }

    return [...sampledOlder, ...recent].slice(0, maxPoints);
}

export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    let effectiveLambda = 0.08;
    let effectiveMaxScore = 100;
    let effectiveOptions = options;

    if (typeof lambda === 'object' && lambda !== null) {
        effectiveOptions = lambda;
        effectiveLambda = Number.isFinite(effectiveOptions.lambda) ? effectiveOptions.lambda : 0.08;
        effectiveMaxScore = safeMaxScoreValue(effectiveOptions.maxScore, 100);
    } else {
        effectiveLambda = Math.max(0, Math.min(1, Number.isFinite(Number(lambda)) ? Number(lambda) : 0.08));
        effectiveMaxScore = safeMaxScoreValue(maxScore, 100);
    }

    const minScore = safeMinScoreValue(effectiveOptions?.minScore, 0);
    const scaleFactor = Math.max(1e-6, (effectiveMaxScore - minScore) / 100);
    const defaultSlopeStdError = 0.05 * scaleFactor;

    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return { slope: 0, intercept: 0, slopeStdError: defaultSlopeStdError };

    const sorted = getSortedHistory(safeHistory);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: defaultSlopeStdError };

    const parsedReferenceDate = effectiveOptions.referenceDate != null ? safeDateParse(effectiveOptions.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const firstValid = sorted.find(h => Number.isFinite(safeDateParse(h?.date || h?.createdAt)?.getTime()));
    const t0 = firstValid ? safeDateParse(firstValid.date || firstValid.createdAt).getTime() : now;

    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, effectiveMaxScore, minScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-effectiveLambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);
        const x = (timeMs - t0) / 86400000;

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

    const RIDGE_PENALTY = Math.max(1e-8, (sumWXX > 0 ? sumWXX / Math.max(1, sumW) : 1) * 1e-4);
    const safeSumW = Math.max(1e-15, sumW);
    const varianceX = Math.max(0, sumWXX - (sumWX * sumWX) / safeSumW);
    const covXY = sumWXY - (sumWX * sumWY) / safeSumW;
    const regularizedDenominator = varianceX + RIDGE_PENALTY;

    if (safeSumW < 1e-15 || regularizedDenominator < 1e-15) {
        const fallbackScore = getSafeScore(sorted[sorted.length - 1], effectiveMaxScore, minScore);
        return { slope: 0, intercept: Number.isFinite(fallbackScore) ? fallbackScore : 0, slopeStdError: defaultSlopeStdError };
    }

    let slope = covXY / regularizedDenominator;
    const maxSlopeLimit = effectiveMaxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, effectiveLambda, effectiveMaxScore, { ...effectiveOptions, minScore });

    return { slope, intercept, slopeStdError };
}

export function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    maxScore = safeMaxScoreValue(maxScore, 100);
    const minScore = safeMinScoreValue(options?.minScore, 0);

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const firstValid = sorted.find(h => Number.isFinite(safeDateParse(h?.date || h?.createdAt)?.getTime()));
    const t0 = firstValid ? safeDateParse(firstValid.date || firstValid.createdAt).getTime() : now;

    let sumW = 0, cW = 0;
    let sumW2 = 0, cW2 = 0;
    let sumWX = 0, cWX = 0;
    let sumWXX = 0, cWXX = 0;
    let rss = 0, cRSS = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore, minScore);
        if (!Number.isFinite(y)) continue;

        const x = (timeMs - t0) / 86400000;
        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const w = Math.max(EPSILON_WEIGHT, Math.exp(-lambda * t));
        const pred = intercept + slope * x;
        const residualSq = Math.pow(y - pred, 2);

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

    const scaleFactorFallback = Math.max(1e-6, (maxScore - minScore) / 100);
    const defaultSlopeStdError = 0.05 * scaleFactorFallback;

    if (sumW2 <= 1e-15) return defaultSlopeStdError;

    const effectiveN = (sumW * sumW) / sumW2;

    if (effectiveN <= 2.1) return defaultSlopeStdError;

    const variance = (rss / sumW) * (effectiveN / (effectiveN - 2));
    const varX = (sumWXX - (sumWX * sumWX) / sumW) / sumW;

    if (varX <= 1e-8) {
        return Math.sqrt(Math.max(0, rss / sumW)) / Math.sqrt(effectiveN);
    }

    const det = sumW * sumWXX - sumWX * sumWX;
    const calculatedStdError = Math.sqrt(Math.max(0, (variance * sumW) / det));
    const maxSlopeSe = 0.04 * (maxScore - minScore);
    return Math.min(maxSlopeSe, calculatedStdError);
}

function getHistoryDateValue(entry) {
    return entry?.date ?? entry?.createdAt ?? null;
}

function getHistoryTime(entry) {
    const parsed = normalizeDate(getHistoryDateValue(entry));
    return parsed ? parsed.getTime() : NaN;
}

function getDynamicTrendThreshold(currentScore, maxScore, minScore = 0) {
    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeMinScore = safeMinScoreValue(minScore, 0);
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    const safeCurrent = safeFinite(currentScore, safeMinScore);
    const currentPct = (safeCurrent - safeMinScore) / safeRange;

    if (!Number.isFinite(currentPct)) return 0.002 * safeRange;

    const damping = Math.max(0, 1 - Math.min(1, Math.max(0, currentPct)));
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;

    return dynamicPct * safeRange;
}

// ✅ FIX: getDynamicPriorSD trata array de números nus e respeita safeRange (invariância de escala)
function getDynamicPriorSD(history, maxScore, minScore = 0) {
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  const safeMinScore = safeMinScoreValue(minScore, 0);
  const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
  const safeHistory = toHistoryArray(history);
  
  if (safeHistory.length < 5) return safeRange * 0.15;
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const scores = safeHistory.map(h => {
    if (typeof h === 'number') return h;
    return getSafeScore(h, safeMaxScore, safeMinScore);
  }).filter(Number.isFinite);
  
  if (scores.length < 5) return safeRange * 0.15;
  
  const globalMean = mean(scores);
  const globalVar = scores.length > 1
    ? kahanSum(scores.map(s => Math.pow(s - globalMean, 2))) / (scores.length - 1)
    : 0;
  
  const empiricalSD = Math.sqrt(Math.max(0, globalVar));
  return Math.max(safeRange * 0.05, Math.min(safeRange * 0.20, empiricalSD));
}

export function mean(arr) {
    return kahanMean(arr);
}

export const calcularMedia = mean;

// ✅ FIX: standardDeviation aceita array de números nus
export function standardDeviation(arr, maxScore = 100, customMean = null, minScore = 0) {
  if (!arr || arr.length < 1) return 0;
  
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  const safeMinScore = safeMinScoreValue(minScore, 0);
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const clean = arr
    .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMaxScore, safeMinScore))
    .filter(Number.isFinite);
  
  if (clean.length < 1) return 0;
  
  const n = clean.length;
  const m = customMean !== null && Number.isFinite(Number(customMean)) ? Number(customMean) : mean(clean);
  
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
  
  const POPULATION_SD = getDynamicPriorSD(arr, safeMaxScore, safeMinScore);
  const KAPPA = 1;
  
  const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);
  
  const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
  const finalSdFloor = MIN_SD_FLOOR * safeRange;
  return Math.max(finalSdFloor, Math.sqrt(Math.max(0, adjustedVar)));
}

export const calcularDesvioPadrao = (arr, isSample = false) => {
    if (!arr || arr.length === 0) return 0;

    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length <= 1) return 0;

    const m = kahanMean(clean);
    const sumSq = clean.map(x => Math.pow(x - m, 2));
    const denom = isSample ? (clean.length - 1) : clean.length;
    const v = denom > 0 ? kahanSum(sumSq) / denom : 0;

    return Math.sqrt(Math.max(0, v));
};

export function calcularAssimetria(arr, maxScore = 100, minScore = 0) {
    if (!arr || arr.length < 3) return 0;

    const safeMax = safeMaxScoreValue(maxScore, 100);
    const safeMin = safeMinScoreValue(minScore, 0);

    const clean = toHistoryArray(arr)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMax, safeMin))
        .filter(Number.isFinite);

    const n = clean.length;
    if (n < 3) return 0;

    const m = mean(clean);
    const sumSq = kahanSum(clean.map(val => Math.pow(val - m, 2)));
    const sampleVar = sumSq / (n - 1);
    const s = Math.sqrt(Math.max(0, sampleVar));

    if (s < 1e-5) return 0;

    const cubeDiffs = clean.map(val => Math.pow(val - m, 3));
    const sumCube = kahanSum(cubeDiffs);
    const safeS = Math.max(1e-5, s);
    const skewness = (n * sumCube) / ((n - 1) * (n - 2) * Math.pow(safeS, 3));

    if (!Number.isFinite(skewness)) return 0;

    return Math.max(-5, Math.min(5, skewness));
}

export function computeBayesianLevel(
    historyOrScore,
    arg1 = 1,
    arg2 = 1,
    arg3 = 100,
    arg4 = {}
) {
    let history, alpha, beta, safeMaxScore, options;
    let singleScore = null;
    let singleNEff = 1;
    if (Array.isArray(historyOrScore)) {
        history = toHistoryArray(historyOrScore);
        const safeAlphaArg = Number(arg1);
        const safeBetaArg = Number(arg2);
        alpha = Number.isFinite(safeAlphaArg) && safeAlphaArg >= 0 ? safeAlphaArg : 1;
        beta = Number.isFinite(safeBetaArg) && safeBetaArg >= 0 ? safeBetaArg : 1;
        safeMaxScore = safeMaxScoreValue(arg3, 100);
        options = arg4 || {};
    } else {
        history = [];
        singleScore = Math.max(0, Number(historyOrScore) || 0);
        const nEffArg = Number(arg1);
        singleNEff = Number.isFinite(nEffArg) && nEffArg >= 0 ? nEffArg : 1;
        safeMaxScore = safeMaxScoreValue(arg2, 100);
        options = arg3 || {};
    }
    // ✅ LOTE-01 FIX (C3): normalização no INTERVALO ÚTIL [minScore, maxScore].
    // Antes a proporção era score/maxScore — errado em escalas com piso != 0
    // (ex.: 200–1000: nota 600 virava 60% quando deveria ser 50%).
    const safeMinScore = Math.min(
        Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 0,
        safeMaxScore
    );
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    if (singleScore !== null) {
        const pct = Math.max(0, Math.min(1, (singleScore - safeMinScore) / safeRange));
        alpha = pct * singleNEff;
        beta = (1 - pct) * singleNEff;
    }

    const alpha0 = alpha;
    const beta0 = beta;

    let maxNEver = alpha + beta;

    const syntheticTotalValue = getSyntheticTotal(safeMaxScore);
    const safeSyntheticTotal = Number.isFinite(syntheticTotalValue) ? syntheticTotalValue : 20;

    const safeTotalEntry = (h) => {
        const n = Number(h?.total);
        return Number.isFinite(n) && n > 0 ? n : safeSyntheticTotal;
    };

    const gaps = [];

    const historyWithTime = history
        .map(h => ({ original: h, time: getHistoryTime(h) }))
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => a.time - b.time);

    const historySortedForGaps = historyWithTime.map(item => item.original);

    if (historyWithTime.length > 1) {
        for (let i = 1; i < historyWithTime.length; i++) {
            const gap = (historyWithTime[i].time - historyWithTime[i - 1].time) / 86400000;
            if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
        }
    }

    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? kahanSum(gaps) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;
    const totalQuestionsHist = history.length ? kahanSum(history.map(safeTotalEntry)) : 0;

    const historyDays = historyWithTime.length > 1
        ? Math.max(1, (historyWithTime[historyWithTime.length - 1].time - historyWithTime[0].time) / 86400000)
        : 1;

    const questionsPerDay = totalQuestionsHist / historyDays;
    const volumeCapacity = questionsPerDay * 30;
    const rawCap = Math.min(baseCapacity, volumeCapacity);
    const dynamicAlphaCap = Math.max(250, Math.floor(Number.isFinite(rawCap) ? rawCap : 250));
    const dynamicEffectiveN = dynamicAlphaCap;

    const refDateObj = options.referenceDate ? normalizeDate(options.referenceDate) : null;
    const now = refDateObj && Number.isFinite(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();

    // ✅ LOTE-01 FIX: priors calculados SOBRE O MESMO ARRAY iterado abaixo.
    // Antes o slice(-2000) acontecia depois, desalinhando runningPriors[i].
    const MAX_ITERATIONS = 2000;
    const itemsToProcess = historyWithTime.length > MAX_ITERATIONS
        ? historyWithTime.slice(-MAX_ITERATIONS)
        : historyWithTime;
    const historyToProcess = itemsToProcess.map(item => item.original);

    const runningPriors = new Float64Array(historyToProcess.length);
    if (historyToProcess.length > 0) {
        let priorSum = 0, priorC = 0, priorCount = 0;
        for (let j = 0; j < historyToProcess.length; j++) {
            const sScore = getSafeScore(historyToProcess[j], safeMaxScore, safeMinScore);
            if (Number.isFinite(sScore)) {
                let rawPct = (sScore - safeMinScore) / safeRange;
                rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
                const validPct = Math.min(1, rawPct);
                const y = validPct - priorC;
                const t = priorSum + y;
                priorC = (t - priorSum) - y;
                priorSum = t;
                priorCount++;
            }
            runningPriors[j] = priorCount > 0 ? priorSum / priorCount : 0.5;
        }
    }

    const avgTotalRaw = history.length > 0
        ? totalQuestionsHist / history.length
        : safeSyntheticTotal;

    const avgTotal = Number.isFinite(avgTotalRaw) && avgTotalRaw > 0 ? avgTotalRaw : safeSyntheticTotal;

    const rawBaseLambda = history.length > 0 ? computeAdaptiveLambda(historySortedForGaps) : 0.08;
    const baseAdaptiveLambda = Number.isFinite(rawBaseLambda)
        ? Math.max(0.005, Math.min(1, rawBaseLambda))
        : 0.08;

    if (history.length > 0) {

        for (let i = 0; i < historyToProcess.length; i++) {
            const h = historyToProcess[i];

            const totalRaw = Number(h?.total);
            const hasTotal = Number.isFinite(totalRaw) && totalRaw > 0;
            const total = hasTotal ? totalRaw : 0;

            const normalizedScore = getSafeScore(h, safeMaxScore, safeMinScore);
            if (!Number.isFinite(normalizedScore)) continue;

            const isPurePercentage = !hasTotal;

            let rawPct = (normalizedScore - safeMinScore) / safeRange;
            rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
            const pct = Math.min(1, rawPct);

            const timeEntry = itemsToProcess[i].time;
            const timePrev = i > 0 ? itemsToProcess[i - 1].time : timeEntry;

            const gapDays = Number.isFinite(timeEntry) && Number.isFinite(timePrev)
                ? Math.max(0, Math.floor((timeEntry - timePrev) / 86400000))
                : 0;

            const lambda = Math.max(0.01, Math.min(0.08, baseAdaptiveLambda));

            const entryDecayRaw = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;
            const entryDecay = Number.isFinite(entryDecayRaw) ? Math.max(0, Math.min(1, entryDecayRaw)) : 1.0;

            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapDays || 0)));

            // ✅ FIX: Piso de retenção proporcional ao decaimento, NÃO ao histórico máximo.
            // Usa um piso fixo pequeno (3-10) que decai com o tempo, permitindo
            // que o aluno realmente "esqueça" após longos períodos sem estudo.
            const retentionFloor = Math.max(5.0, Math.min(20.0, cappedMaxN * 0.10)) * macroDecay;

            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;

                if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                    const currentP = alpha / nBeforeDecay;
                    const minN = retentionFloor;
                    const HARD_FLOOR = 3.0;
                    const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);

                    const nAfterDecayRaw = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * entryDecay)));
                    const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : safeFloor;

                    let regressedP = currentP;
                    if (gapDays > 21) {
                        const priorP = i > 0 ? runningPriors[i - 1] : runningPriors[0] || 0.5;
                        const safePriorP = Number.isFinite(priorP) ? priorP : 0.5;
                        const forgettingDecay = Math.exp(-lambda * (gapDays - 21));
                        const regressedPRaw = (currentP * forgettingDecay) + (safePriorP * (1 - forgettingDecay));
                        regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;
                    }

                    alpha = nAfterDecay * regressedP;
                    beta = nAfterDecay * (1 - regressedP);
                }
            }

            const rawItemWeight = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const itemWeight = Math.max(0.001, Number.isFinite(rawItemWeight) ? rawItemWeight : 1.0);

            const stepCap = dynamicAlphaCap;

            if (isPurePercentage) {
                const syntheticNRaw = avgTotal * itemWeight;
                const syntheticN = Number.isFinite(syntheticNRaw) && syntheticNRaw > 0 ? syntheticNRaw : 0;

                let alphaHoje = pct * syntheticN;
                let betaHoje = (1 - pct) * syntheticN;

                const sumHoje = alphaHoje + betaHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    alphaHoje *= clampDiario;
                    betaHoje *= clampDiario;
                }

                alpha += Number.isFinite(alphaHoje) ? alphaHoje : 0;
                beta += Number.isFinite(betaHoje) ? betaHoje : 0;
            } else if (total >= 1) {
                let correct = Math.max(0, Math.round(pct * total));
                const safeCorrect = Math.max(0, Math.min(total, correct));

                let acertosHoje = Math.max(0, safeCorrect * itemWeight);
                let errosHoje = Math.max(0, (total - safeCorrect) * itemWeight);

                const sumHoje = acertosHoje + errosHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    acertosHoje *= clampDiario;
                    errosHoje *= clampDiario;
                }

                alpha += Number.isFinite(acertosHoje) ? acertosHoje : 0;
                beta += Number.isFinite(errosHoje) ? errosHoje : 0;
            }

            // ✅ Renormalização incremental a cada 50 iterações
            if (i % 50 === 0 && (alpha + beta) > dynamicAlphaCap * 2) {
              const factor = dynamicAlphaCap / (alpha + beta);
              alpha *= factor;
              beta *= factor;
            }

            // ✅ Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar
            if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
              alpha = alpha0;
              beta = beta0;
            }

            const currentN = alpha + beta;
            if (!Number.isFinite(currentN)) {
                alpha = alpha0;
                beta = beta0;
                break;
            }

            if (currentN > maxNEver) {
                maxNEver = Math.min(currentN, dynamicAlphaCap);
            }
        }
    }

    const nAfterLoop = alpha + beta;
    if (Number.isFinite(nAfterLoop) && nAfterLoop > dynamicAlphaCap && nAfterLoop > 0) {
        const globalClamp = dynamicAlphaCap / nAfterLoop;
        alpha *= globalClamp;
        beta *= globalClamp;
    }

    const lastItem = historyWithTime.length > 0 ? historyWithTime[historyWithTime.length - 1] : null;
    const lastEntry = lastItem ? lastItem.original : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastTime = lastItem ? lastItem.time : normalizeDate(lastDateStr)?.getTime();
        const gapToToday = Number.isFinite(lastTime) ? Math.max(0, Math.floor((now - lastTime) / 86400000)) : 0;

        if (gapToToday > 0) {
            const finalLambda = Math.max(0.01, Math.min(0.08, baseAdaptiveLambda));

            const finalDecayRaw = Math.exp(-finalLambda * gapToToday);
            const finalDecay = Number.isFinite(finalDecayRaw) ? Math.max(0, Math.min(1, finalDecayRaw)) : 1;

            const nBeforeDecay = alpha + beta;

            if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                const currentP = alpha / nBeforeDecay;

                const epistemicDecayRaw = Math.pow(finalDecay, 0.35);
                const epistemicDecay = Number.isFinite(epistemicDecayRaw) ? Math.max(0, Math.min(1, epistemicDecayRaw)) : 1;

                const safeMaxNEver = Number.isFinite(maxNEver) ? maxNEver : 0;
                const epistemicFloor = Math.max(3.0, Math.min(10.0, safeMaxNEver * 0.05));

                const nAfterDecayRaw = Math.max(epistemicFloor, Math.min(nBeforeDecay, nBeforeDecay * epistemicDecay));
                const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : Math.max(epistemicFloor, Math.min(nBeforeDecay, epistemicFloor));

                let regressedP = currentP;
                if (gapToToday > 14) {
                    const empiricalPriorFinal = runningPriors.length > 0 ? runningPriors[runningPriors.length - 1] : 0.5;
                    const safeEmpiricalPriorFinal = Number.isFinite(empiricalPriorFinal) ? empiricalPriorFinal : 0.5;
                    const forgettingDecay = Math.exp(-finalLambda * (gapToToday - 14));
                    const regressedPRaw = (currentP * forgettingDecay) + (safeEmpiricalPriorFinal * (1 - forgettingDecay));
                    regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;
                }

                alpha = nAfterDecay * regressedP;
                beta = nAfterDecay * (1 - regressedP);
            }
        }
    }

    // FIX: Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar para prior
    if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
      alpha = alpha0;
      beta = beta0;
    }

    const n = alpha + beta;

    if (!Number.isFinite(n) || n <= 0) {
        return { mean: 0, sd: 0, ciLow: 0, ciHigh: 0, alpha: alpha0, beta: beta0, n: 0 };
    }

    const effectiveN = Math.min(n, dynamicEffectiveN);
    const p = alpha / n;
    const effectiveAlpha = p * effectiveN;

    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    const mediaDeQuestoesDoAlunoRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : 100;

    const mediaDeQuestoesDoAluno = Number.isFinite(mediaDeQuestoesDoAlunoRaw) && mediaDeQuestoesDoAlunoRaw > 0
        ? mediaDeQuestoesDoAlunoRaw
        : 100;

    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(mediaDeQuestoesDoAluno));

    const rawEpistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const epistemicVar = Number.isFinite(rawEpistemicVar) ? Math.max(1e-6, rawEpistemicVar) : 1e-6;

    const rawAleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;
    const aleatoricVar = Number.isFinite(rawAleatoricVar) ? Math.max(1e-6, rawAleatoricVar) : 1e-6;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });
    // ✅ LOTE-01 FIX (C3): margem/centro escalam pelo RANGE, não pelo teto
    const marginOfError = tMultiplier * effectiveSd * safeRange;
    const adjustedMarginOfError = Number.isFinite(marginOfError) ? marginOfError : 0;

    const centerForCI = safeMinScore + p_tilde * safeRange;
    const trueMean = safeMinScore + p * safeRange;

    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

    if (!Number.isFinite(ciLow)) ciLow = Math.max(safeMinScore, trueMean);
    if (!Number.isFinite(ciHigh)) ciHigh = Math.min(safeMaxScore, trueMean);

    if (trueMean < ciLow) ciLow = trueMean;
    if (trueMean > ciHigh) ciHigh = trueMean;

    const strictLow = Number.isFinite(ciLow) ? Math.max(safeMinScore, ciLow) : safeMinScore;
    const strictHigh = Number.isFinite(ciHigh) ? Math.min(safeMaxScore, ciHigh) : safeMaxScore;

    let alphaOut = alpha;
    let betaOut = beta;

    if (n > dynamicEffectiveN && n > 0) {
        const factor = dynamicEffectiveN / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean: trueMean,
        sd: effectiveSd * safeRange, // ✅ LOTE-01 FIX (C3)
        ciLow: strictLow,
        ciHigh: strictHigh,
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > dynamicEffectiveN ? dynamicEffectiveN : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100, minScore = 0) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return null;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeMinScore = safeMinScoreValue(minScore, 0);
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    if (!Number.isFinite(safeRange)) return null;

    const rawSynthetic = getSyntheticTotal(safeMaxScore);
    const syntheticTotal = Number.isFinite(rawSynthetic) ? rawSynthetic : 20;

    const historyWithSynthetics = safeHistory
        .map(h => {
            const score = getSafeScore(h, safeMaxScore, minScore);
            const total = Number(h?.total);

            if ((!Number.isFinite(total) || total <= 0) && Number.isFinite(score)) {
                if (typeof h === 'number') {
                    return { score: h, total: syntheticTotal };
                }

                return {
                    ...(h && typeof h === 'object' ? h : { original: h }),
                    total: syntheticTotal
                };
            }

            return h;
        })
        .filter(Boolean);

    const validHistory = historyWithSynthetics.filter(h => {
        const total = Number(h?.total);
        return Number.isFinite(total) && total > 0;
    });

    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    const scores = historyToUse
        .map(h => getSafeScore(h, safeMaxScore, minScore))
        .filter(Number.isFinite);

    const validHistoryForMean = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore, minScore))
    );

    let sumWeightMean = 0;
    let sumScoreMean = 0;

    validHistoryForMean.forEach(h => {
        const totalWeight = Number(h?.total);
        if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

        const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
        const diffWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
        const effW = totalWeight * diffWeight;

        sumWeightMean += effW;
        sumScoreMean += getSafeScore(h, safeMaxScore, minScore) * effW;
    });

    const mRaw = sumWeightMean > 0 ? sumScoreMean / sumWeightMean : mean(scores);
    const m = Number.isFinite(mRaw) ? mRaw : 0;

    let variance = 0;

    if (historyToUse.length > 1) {
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0;

        const sortedScores = [...scores].sort((a, b) => a - b);

        const median = sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)];

        const absoluteDeviations = scores
            .map(s => Math.abs(s - median))
            .sort((a, b) => a - b);

        const rawMad = absoluteDeviations.length % 2 === 0
            ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
            : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];

        const mad = Number.isFinite(rawMad) && rawMad > 0 ? rawMad * 1.4826 : 0.001 * safeMaxScore;
        const clampLimit = 3.5 * mad;

        validHistoryForMean.forEach(h => {
            const totalWeight = Number(h?.total);
            if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

            const safeScore = getSafeScore(h, safeMaxScore, minScore);
            if (!Number.isFinite(safeScore)) return;

            const robustScore = Number.isFinite(median) && Number.isFinite(clampLimit)
                ? Math.max(median - clampLimit, Math.min(median + clampLimit, safeScore))
                : safeScore;

            const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const difficultyWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
            const effectiveWeight = totalWeight * difficultyWeight;

            wVarSum += effectiveWeight * Math.pow(robustScore - m, 2);
            sumW += effectiveWeight;
            sumW2 += Math.pow(effectiveWeight, 2);
        });

        const kishDifference = sumW - (sumW > 0 ? (sumW2 / sumW) : 0);
        const kishDenom = kishDifference > 1e-4 ? kishDifference : Math.max(1e-4, sumW);

        const rawSampleVar = sumW > 0 ? wVarSum / kishDenom : 0;
        const sampleVar = Number.isFinite(rawSampleVar) ? Math.max(0, rawSampleVar) : 0;

        const POPULATION_SD = getDynamicPriorSD(historyToUse, safeMaxScore, safeMinScore);
        const safePopulationSD = Number.isFinite(POPULATION_SD) ? POPULATION_SD : 0;
        const popVar = Math.pow(safePopulationSD, 2);

        const safeStudentVar = Math.max(popVar * 0.05, sampleVar);
        const ratio = safeStudentVar > 0 ? popVar / safeStudentVar : 3.0;

        let KAPPA = Math.max(0.1, Math.min(3.0, Number.isFinite(ratio) ? ratio : 3.0));

        const sortedForDates = getSortedHistory(historyToUse);
        const firstDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[0]));
        const lastDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[sortedForDates.length - 1]));

        const firstDateMs = firstDateParsed && Number.isFinite(firstDateParsed.getTime())
            ? firstDateParsed.getTime()
            : Date.now();

        const lastDateMs = lastDateParsed && Number.isFinite(lastDateParsed.getTime())
            ? lastDateParsed.getTime()
            : Date.now();

        const timeSpreadDays = Math.max(0, (lastDateMs - firstDateMs) / 86400000);

        if (
            historyToUse.length >= 2 &&
            sampleVar < (0.0004 * safeRange * safeRange) &&
            timeSpreadDays > 7
        ) {
            KAPPA = KAPPA * Math.exp(-timeSpreadDays / 14);
        }

        const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : historyToUse.length;
        const n_eff = Number.isFinite(effectiveN) ? Math.max(1, effectiveN) : 1;
        const kishDenomTerm = n_eff > 1.5 ? (n_eff - 1) : 1;

        const rawVariance = (kishDenomTerm * sampleVar + KAPPA * popVar) / (kishDenomTerm + KAPPA);
        variance = Number.isFinite(rawVariance) ? Math.max(0, rawVariance) : popVar;
    } else {
        const priorSD = getDynamicPriorSD(historyToUse, safeMaxScore, safeMinScore);
        variance = Math.pow(Number.isFinite(priorSD) ? priorSD : 0, 2);
    }

    const sd = Math.max(Math.sqrt(Math.max(0, variance)), 0.001 * safeRange);
    const safeSD = Number.isFinite(sd) ? sd : 0.001 * safeRange;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore, { minScore: safeMinScore });
    const safeSlope = Number.isFinite(slopePerDay) ? slopePerDay : 0;

    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore, safeMinScore);

    const validHistoryForTrend = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore, minScore))
    );

    const sortedForTrendCap = getSortedHistory(validHistoryForTrend);

    const lastScoreRaw = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore, minScore)
        : m;

    const safeLastScore = Number.isFinite(lastScoreRaw) ? lastScoreRaw : m;

    const limiteSuperior = safeMaxScore - safeLastScore;
    const limiteInferior = safeMinScore - safeLastScore;

    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, safeSlope * 30));
    const safeRawTrend = Number.isFinite(rawTrend) ? rawTrend : 0;

    let trendLabel = 'stable';
    if (safeRawTrend > trendThreshold) trendLabel = 'up';
    else if (safeRawTrend < -trendThreshold) trendLabel = 'down';

    const level = m > (safeMinScore + 0.7 * safeRange) ? 'ALTO' : m > (safeMinScore + 0.4 * safeRange) ? 'MÉDIO' : 'BAIXO';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight,
        history: safeHistory,
        trend: trendLabel,
        trendValue: safeRawTrend,
        level,
        minScore: safeMinScore,
        maxScore: safeMaxScore
    };
}

export const calculateEMA = (scores, alpha = 0.25, maxScore = 100, minScore = 0) => {
    const safeMax = safeMaxScoreValue(maxScore, 100);
    const safeMin = safeMinScoreValue(minScore, 0);

    const clean = toHistoryArray(scores)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMax, safeMin))
        .filter(Number.isFinite);

    if (!clean.length) return 0;

    let ema = clean[0];
    const maxObserved = clean.reduce((a, b) => Math.max(a, b), 1);

    for (let i = 1; i < clean.length; i++) {
        const delta = clean[i] - ema;
        const range = maxObserved;
        const absDelta = Math.abs(delta);

        const upBonus = Math.min(0.10, 0.05 * (absDelta / range));
        const downBonus = Math.min(0.03, 0.015 * (absDelta / range));
        const trendBonus = delta >= 0 ? upBonus : downBonus;
        const currentAlpha = Math.min(1, alpha + trendBonus);

        ema = (clean[i] * currentAlpha) + (ema * (1 - currentAlpha));
    }

    return Number.isFinite(ema) ? ema : 0;
};

export const calculateTimeWeightedEMA = (historicData, lambda = 0.05) => {
    const safeHistory = toHistoryArray(historicData);
    if (!safeHistory.length) return null;

    const validData = safeHistory.filter(d =>
        Number.isFinite(d?.score) && (d?.timestamp != null || d?.date != null)
    );

    if (!validData.length) return null;

    const getTime = (d) => {
        if (d?.timestamp != null && Number.isFinite(d.timestamp)) return d.timestamp;

        if (d?.date != null) {
            const ms = new Date(d.date).getTime();
            return Number.isFinite(ms) ? ms : NaN;
        }

        return NaN;
    };

    validData.sort((a, b) => getTime(a) - getTime(b));

    let ema = validData[0].score;
    let lastTime = getTime(validData[0]);

    for (let i = 1; i < validData.length; i++) {
        const currentItem = validData[i];
        const currentTime = getTime(currentItem);

        if (!Number.isFinite(currentTime) || !Number.isFinite(lastTime)) continue;

        const deltaDays = Math.max(0, (currentTime - lastTime) / 86400000);
        const dynamicAlpha = 1 - Math.exp(-lambda * deltaDays);
        const safeAlpha = Math.max(0.1, Math.min(1.0, dynamicAlpha));

        ema = safeAlpha * currentItem.score + (1 - safeAlpha) * ema;
        lastTime = currentTime;
    }

    return Number.isFinite(ema) ? ema : null;
};

export {
    computeBrierScore,
    computeLogLoss,
    summarizeCalibration,
    computeCalibrationDiagnostics,
    shrinkProbabilityToNeutral
} from '../utils/calibration.js';

export function computeHierarchicalAdjustment(categories, pooledSD) {
    const safeCategories = toHistoryArray(categories);
    if (!safeCategories.length) return safeCategories;

    const validCategories = safeCategories.filter(c =>
        Number.isFinite(c.mean) && Number.isFinite(c.n) && c.n > 0
    );

    if (!validCategories.length) return safeCategories;

    const globalMean = kahanSum(validCategories.map(c => c.mean || 0)) / Math.max(1, validCategories.length);

    const tau2 = kahanSum(validCategories.map(c => Math.pow((c.mean || 0) - globalMean, 2))) /
        Math.max(1, validCategories.length - 1);

    return safeCategories.map(cat => {
        if (!Number.isFinite(cat.mean) || !cat.n) {
            return { ...cat, bayesianMean: cat.mean, bayesianSd: cat.sd };
        }

        const localSD = Number.isFinite(cat.sd) ? cat.sd : (pooledSD || 15);
        const localVar = Math.pow(localSD, 2) / Math.max(1, cat.n);
        const denom = localVar + tau2;
        const B = denom > 1e-15 ? localVar / denom : 0;

        const bayesianMean = B * globalMean + (1 - B) * cat.mean;
        const popVar = Math.pow(pooledSD || 15, 2);
        const bayesianSd = Math.sqrt(Math.max(0, B * popVar + (1 - B) * Math.pow(localSD, 2)));

        return {
            ...cat,
            bayesianMean,
            bayesianSd,
            shrinkage: B
        };
    });
}

export function computeAgilityMetrics(history, targetSeconds = 120) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return { avgSeconds: 0, agilityPenalty: 0 };

    let totalTimeSpent = 0;
    let totalTimedQuestions = 0;

    for (const h of safeHistory) {
        if (h.timeSpent != null && h.timedQuestoes != null) {
            const ts = Number(h.timeSpent);
            const tq = Number(h.timedQuestoes);

            if (Number.isFinite(ts) && Number.isFinite(tq) && ts > 0 && tq > 0) {
                totalTimeSpent += ts;
                totalTimedQuestions += tq;
            }
        }
    }

    const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;
    const safeTarget = Math.max(30, Number(targetSeconds) || 120);

    const agilityPenalty = avgSeconds > safeTarget
        ? Math.min(0.4, (avgSeconds - safeTarget) / (safeTarget * 1.25))
        : 0;

    return {
        avgSeconds: Math.round(avgSeconds),
        agilityPenalty: Number(agilityPenalty.toFixed(4))
    };
}

export function calculateSlopePerDay(history, maxScore = 100, minScore = 0) {
    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return 0;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeMinScore = safeMinScoreValue(minScore, 0);

    // ✅ FIX: Filtrar entradas com datas válidas e ordenar apenas 1 vez com timestamps retidos.
    const validEntries = [];
    for (let i = 0; i < safeHistory.length; i++) {
        const h = safeHistory[i];
        if (typeof h === 'number') continue;
        const dateValue = h?.date ?? h?.createdAt;
        const dateParsed = safeDateParse(dateValue);
        const time = dateParsed?.getTime();
        const y = getSafeScore(h, safeMaxScore, safeMinScore);
        if (Number.isFinite(time) && Number.isFinite(y)) {
            validEntries.push({ time, y, id: h?.id });
        }
    }

    if (validEntries.length < 2) {
        // Fallback: regressão por índice se não houver datas válidas
        const cleanScores = safeHistory
            .map(h => typeof h === 'number' ? h : getSafeScore(h, safeMaxScore, safeMinScore))
            .filter(Number.isFinite);
        if (cleanScores.length < 2) return 0;
        let sX = 0, sY = 0, sXY = 0, sX2 = 0;
        const n = cleanScores.length;
        for (let i = 0; i < n; i++) {
            sX += i;
            sY += cleanScores[i];
            sXY += i * cleanScores[i];
            sX2 += i * i;
        }
        const denom = (n * sX2) - (sX * sX);
        if (Math.abs(denom) < 1e-12) return 0;
        const indexSlope = ((n * sXY) - (sX * sY)) / denom;
        return Number.isFinite(indexSlope) ? indexSlope : 0;
    }

    validEntries.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return String(a.id || '').localeCompare(String(b.id || ''));
    });

    // ✅ FIX: firstDate agora é garantidamente válido
    const firstDate = validEntries[0].time;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const validN = validEntries.length;

    for (let i = 0; i < validN; i++) {
        const x = (validEntries[i].time - firstDate) / 86400000;
        const y = validEntries[i].y;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    const denominator = (validN * sumX2) - (sumX * sumX);
    if (Math.abs(denominator) < 1e-12) {
        // Fallback: todas as provas na mesma data, calcular por sequência de prova
        let sX = 0, sY = 0, sXY = 0, sX2 = 0;
        for (let i = 0; i < validN; i++) {
            sX += i;
            sY += validEntries[i].y;
            sXY += i * validEntries[i].y;
            sX2 += i * i;
        }
        const denom = (validN * sX2) - (sX * sX);
        if (Math.abs(denom) < 1e-12) return 0;
        const indexSlope = ((validN * sXY) - (sX * sY)) / denom;
        return Number.isFinite(indexSlope) ? indexSlope : 0;
    }

    const slopePerDay = ((validN * sumXY) - (sumX * sumY)) / denominator;
    // ✅ LOTE-01 FIX: slope POR DIA. O "* 10" anterior inflava trendValue em 10×
    // e fazia o clamp do calculateSlope saturar uma ordem de grandeza antes.
    return Number.isFinite(slopePerDay) ? slopePerDay : 0;
}

/**
 * @deprecated Use calculateSlopePerDay instead. Renomeado no Lote 05 para indicar a unidade explícita [pts/dia].
 */
export const calculateTrend = calculateSlopePerDay;




```

---

### Arquivo: `src/engine/variance.js`
*Linhas: 515 | Tamanho: 21.0 KB*

```javascript
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

    // Build aligned score rows: one object per "simulado day" { "Matematica": 82, "Direito": 71, ... }
    const byDate = {};
    safeSimuladoRows.forEach(row => {
      const dateKey = getDateKey(row.date || row.createdAt);
      if (!dateKey) return;
      const subj = normalize(row.subject || row.categoryName || row.name);
      const rowMax = Number.isFinite(Number(row.maxScore)) && Number(row.maxScore) > 0 ? Number(row.maxScore) : maxScore;
      const rowMin = Number.isFinite(Number(row.minScore)) ? Math.min(Number(row.minScore), rowMax) : 0;
      const score = getSafeScore(row, rowMax, rowMin);
      if (!Number.isFinite(score)) return;

      if (!byDate[dateKey]) byDate[dateKey] = {};
      byDate[dateKey][subj] = score;
    });

    const alignedRows = Object.values(byDate);
    if (alignedRows.length < 4) return fallback;

    const estimated = estimateInterSubjectCorrelation(alignedRows, categoryNames, fallback);
    // Blend a little toward prior for stability (never go full data-driven with limited history)
    const blend = Math.min(1, alignedRows.length / 12);
    return estimated * blend + fallback * (1 - blend);
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
            // NEW: Use the full adaptive estimator with blending
            rho = getAdaptiveInterSubjectCorrelation(stats, optionsOrRho.simuladoRows, optionsOrRho.categoryNames, INTER_SUBJECT_CORRELATION);
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
        finalVar *= effectiveTotalWeight;
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
                const x = typeof rawX === 'object' && rawX !== null ? Number(rawX?.score) : Number(rawX);
                const rawY = getRowValue(row, bName, origBName);
                const y = typeof rawY === 'object' && rawY !== null ? Number(rawY?.score) : Number(rawY);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    xs.push(x);
                    ys.push(y);
                }
            });

            const n = xs.length;
            if (n < 4) continue;

            const meanX = kahanSum(xs) / n;
            const meanY = kahanSum(ys) / n;

            let cov = 0.0, c_cov = 0.0;
            let varX = 0.0, c_x = 0.0;
            let varY = 0.0, c_y = 0.0;

            for (let k = 0; k < n; k++) {
                const dx = xs[k] - meanX;
                const dy = ys[k] - meanY;
                
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

            const epsilon = 1e-15;
            const safeVarX = Math.max(0, varX);
            const safeVarY = Math.max(0, varY);
            const denom = Math.sqrt((safeVarX + epsilon) * (safeVarY + epsilon));
            const corr = cov / denom;

            // Mecanismo de Controlo de Effective Sample Size (ESS) para regular o encolhimento de pares com sobreposição fraca (n < 8)
            const essFloor = 8;
            const pairShrink = n / (n + essFloor);
            const robustCorr = (corr * pairShrink) + (fallback * (1 - pairShrink));

            pairwise.push({ corr: robustCorr, n });
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
    
    // Shrinkage empírico-bayesiano
    const shrink = Math.max(0, Math.min(1, (avgOverlap / (avgOverlap + 10)) * (essPairs / (essPairs + 6))));
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

    const getScoreA = (h) => {
        const s = getSafeScore(h, maxScoreA, minScoreA);
        return Number.isFinite(s) ? s : 0;
    };
    const getScoreB = (h) => {
        const s = getSafeScore(h, maxScoreB, minScoreB);
        return Number.isFinite(s) ? s : 0;
    };

    const getDateStr = (h) => {
        return getDateKey(h?.date || h?.createdAt);
    };

    const mapA = new Map();

    safeHistoryA.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d) mapA.set(d, getScoreA(h));
    });

    const xs = [];
    const ys = [];

    safeHistoryB.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d && mapA.has(d)) {
            xs.push(mapA.get(d));
            ys.push(getScoreB(h));
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
    const denominator = Math.sqrt(safeVarX * safeVarY);

    if (!Number.isFinite(denominator) || denominator === 0) return fallback;

    const pearsonR = cov / denominator;

    if (!Number.isFinite(pearsonR)) return fallback;

    return Math.max(-0.3, Math.min(0.8, pearsonR));
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
        defaultRho
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
            const rhoJI = (rhoMatrix && rhoMatrix[j] && rhoMatrix[j][i] != null) ? rhoMatrix[j][i] : effectiveDefaultRho;
            
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


```

---

