import { monteCarloSimulation } from '../engine/monteCarlo.js';
import { getSafeScore } from './scoreHelper.js';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral, computeCalibrationDiagnostics } from './calibration.js';

// MATH-ADAPTIVE-SCALE FIX: adicionado parâmetro maxScore (default=100).
// Antes, os scores em escala [0, maxScore] eram usados diretamente na fórmula q(0.25)*0.55,
// que produzia limiares de probabilidade dependentes da escala da prova.
// Ex: maxScore=50 → danger ≈ 16 (muito baixo); maxScore=100 → danger ≈ 30 (correto).
// Agora os scores são normalizados para [0,100] antes de calcular os quantis.
export function deriveAdaptiveRiskThresholds(scores = [], volatility = null, cfg = {}, maxScore = 100) {
  const fallbackDanger = Number(cfg.MC_PROB_DANGER) || 30;
  const fallbackSafe = Number(cfg.MC_PROB_SAFE) || 90;
  const rawScores = (scores || []).map(Number).filter(Number.isFinite);
  if (rawScores.length < 4) return { danger: fallbackDanger, safe: fallbackSafe };

  // Normalizar para [0,100] para garantir invariância de escala na comparação com mcProbability
  const safeMax = maxScore > 0 ? maxScore : 100;
  const cleanScores = rawScores.map(s => (s / safeMax) * 100);

  const sorted = [...cleanScores].sort((a, b) => a - b);
  const q = (p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)))];

  let danger = Math.max(15, Math.min(45, q(0.25) * 0.55));
  let safe = Math.max(75, Math.min(95, q(0.75) * 1.08));

  if (Number.isFinite(volatility)) {
    const highVol = Number(cfg.MC_VOLATILITY_HIGH) || 8;
    if (volatility > highVol * 0.9) {
      danger = Math.min(50, danger + 4);
      safe = Math.min(97, safe + 2);
    } else if (volatility < highVol * 0.45) {
      danger = Math.max(12, danger - 3);
      safe = Math.max(72, safe - 2);
    }
  }

  if (safe - danger < 25) safe = Math.min(97, danger + 25);
  return { danger, safe };
}

export function computeContinuousMcBoost(probability, dangerThreshold, safeThreshold, volatility, maxScore, cfg = {}) {
  const p = Math.max(0, Math.min(100, Number(probability) || 0));
  const d = Math.max(1, Math.min(99, Number(dangerThreshold) || cfg.MC_PROB_DANGER));
  const s = Math.max(d + 1, Math.min(99, Number(safeThreshold) || cfg.MC_PROB_SAFE));

  const center = (d + s) / 2;
  const width = Math.max(8, (s - d) / 2);
  const k = 4 / width;
  const z = (center - p) * k;
  const sigmoid = 1 / (1 + Math.exp(-z));

  const maxBoost = cfg.MC_BOOST_DANGER_BASE + cfg.MC_BOOST_DANGER_RANGE;
  let boost = cfg.MC_BOOST_SAFE_PENALTY + (maxBoost - cfg.MC_BOOST_SAFE_PENALTY) * sigmoid;

  const lowVolLimit = (cfg.MC_VOLATILITY_HIGH * 0.7) * (maxScore / 100);
  if (Number.isFinite(volatility) && volatility >= lowVolLimit && boost < 0) {
    boost *= 0.25;
  }

  let riskLabel = 'ok';
  if (p < d) riskLabel = 'critical';
  else if (p < center) riskLabel = 'moderate';
  else if (p >= s && boost < 0) riskLabel = 'safe';

  return { boost, riskLabel };
}

export function deriveBacktestWeights(scores = [], maxScore = 100) {
  const clean = (scores || []).map(Number).filter(Number.isFinite);
  if (clean.length < 6) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 0, uplift: 0 };

  const split = Math.max(3, Math.floor(clean.length * 0.7));
  const train = clean.slice(0, split);
  const test = clean.slice(split);
  if (test.length === 0) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 0, uplift: 0 };

  const trainMean = train.reduce((a, b) => a + b, 0) / train.length;
  const trainDelta = train.length >= 2 ? (train[train.length - 1] - train[0]) / (train.length - 1) : 0;

  const baselineMae = test.reduce((acc, y) => acc + Math.abs(y - trainMean), 0) / test.length;
  const trendMae = test.reduce((acc, y, i) => {
    const pred = train[train.length - 1] + trainDelta * (i + 1);
    return acc + Math.abs(y - pred);
  }, 0) / test.length;

  const rankQualityRaw = baselineMae > 1e-4 ? (baselineMae - trendMae) / baselineMae : 0;
  const rankQuality = Math.max(-0.5, Math.min(0.5, rankQualityRaw));

  const testMean = test.reduce((a, b) => a + b, 0) / test.length;
  const upliftRaw = (testMean - trainMean) / Math.max(1, maxScore);
  const uplift = Math.max(-0.3, Math.min(0.3, upliftRaw));

  const scoreWeight = Math.max(0.8, Math.min(1.2, 1 - rankQuality * 0.25));
  const recencyWeight = Math.max(0.75, Math.min(1.25, 1 - rankQuality * 0.2 - uplift * 0.25));
  const instabilityWeight = Math.max(0.8, Math.min(1.25, 1 - rankQuality * 0.15 + (uplift < 0 ? 0.15 : -0.05)));

  return { scoreWeight, recencyWeight, instabilityWeight, rankQuality, uplift };
}

/**
 * MC-01: Mapper simulados → history para monteCarloSimulation
 */
export function simuladosToHistory(simulados, maxScore = 100) {
    return (simulados || [])
        .filter(s => s && (s.total > 0 || s.score != null))
        .map((s, idx) => {
            const parsed = Date.parse(s?.date || '');
            return {
                score: getSafeScore(s, maxScore),
                date: Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null,
                _idx: idx
            };
        })
        .sort((a, b) => {
            const ta = a.date ? Date.parse(a.date) : Number.POSITIVE_INFINITY;
            const tb = b.date ? Date.parse(b.date) : Number.POSITIVE_INFINITY;
            if (ta !== tb) return ta - tb;
            return a._idx - b._idx;
        })
        .map(({ score, date }) => ({ score, date }));
}

const mcCache = new Map();
const MC_CACHE_MAX = 50;

export function clearMcCache() { 
    mcCache.clear(); 
}

export function deriveCoachAdaptiveParams(history = [], maxScore = 100, cfg = {}) {
    const n = history.length;
    if (n === 0) {
        return { decayK: 0.07, minWeight: 0.03, scoreClampDelta: maxScore * 0.3, mcSimulations: cfg.MC_SIMULATIONS || 800 };
    }

    const scores = history.map(h => Number(h.score) || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? scores.reduce((acc, s) => acc + ((s - mean) ** 2), 0) / (n - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const cv = mean > 0 ? Math.min(2, sd / mean) : 1;

    const coverageFactor = Math.max(0.8, Math.min(1.3, Math.sqrt(10 / Math.max(2, n))));
    const decayK = Math.max(0.03, Math.min(0.12, 0.07 * coverageFactor));
    const minWeight = Math.max(0.01, Math.min(0.08, 0.015 + (cv * 0.02)));
    const scoreClampDelta = Math.max(maxScore * 0.12, Math.min(maxScore * 0.45, (0.2 + cv * 0.15) * maxScore));
    const mcSimulations = Math.round(Math.max(400, Math.min(2500, (cfg.MC_SIMULATIONS || 800) * (0.8 + cv * 0.7) * coverageFactor)));

    return { decayK, minWeight, scoreClampDelta, mcSimulations };
}

/**
 * MC-02: Monte Carlo leve para uso no Coach.
 */
export function runCoachMonteCarlo(relevantSimulados, targetScore, cfg, categoryId, maxScore = 100, adaptive = null, days = 90) {
    const history = simuladosToHistory(relevantSimulados, maxScore);
    if (history.length < (cfg.MC_MIN_DATA_POINTS || 5)) return null;
    const lowSampleThreshold = Math.max(Number(cfg.MC_LOW_SAMPLE_THRESHOLD) || 10, (cfg.MC_MIN_DATA_POINTS || 5) + 2);
    const isLowSample = history.length < lowSampleThreshold;

    const sumCorrect = (relevantSimulados || []).reduce((a, s) => a + getSafeScore(s, maxScore), 0);
    const sequenceChecksum = (relevantSimulados || []).reduce((acc, sim, idx) => {
        const score = getSafeScore(sim, maxScore);
        const date = String(sim?.date || '');
        const subject = String(sim?.subject || '');
        let charSum = 0;
        const token = `${date}|${subject}`;
        for (let i = 0; i < token.length; i++) charSum += token.charCodeAt(i);
        return acc + ((idx + 1) * Math.round(score * 100)) + charSum;
    }, 0);
    const firstDate = history[0]?.date || '';
    const lastDate = history[history.length - 1]?.date || '';
    const hash = `${categoryId}-${maxScore}-${history.length}-${Number(sumCorrect).toFixed(2)}-${targetScore}-${sequenceChecksum}-${firstDate}-${lastDate}-${days}`;
    if (mcCache.has(hash)) return mcCache.get(hash);

    try {
        const result = monteCarloSimulation(
            history,
            targetScore,
            days,
            adaptive?.mcSimulations || cfg.MC_SIMULATIONS || 800,
            { maxScore }
        );

        const enableAdaptiveCalibration = cfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false;

        let calibrationPenalty = 0;
        let avgBrier = 0;
        let ece = 0;
        let reliability = [];
        if (enableAdaptiveCalibration && history.length >= 8) {
            const dynamicHorizon = Math.max(
                cfg.MC_BACKTEST_HORIZON || 3,
                Math.min(Number(cfg.MC_BACKTEST_HORIZON_MAX) || 6, Math.floor(history.length / 3))
            );
            const horizon = Math.min(dynamicHorizon, history.length - (cfg.MC_MIN_DATA_POINTS || 5));
            const brierScores = [];
            const predObsPairs = [];
            for (let i = 1; i <= horizon; i++) {
                const train = history.slice(0, history.length - i);
                const observed = history[history.length - i].score >= targetScore ? 1 : 0;
                try {
                    const bt = monteCarloSimulation(
                        train,
                        targetScore,
                        days,
                        Math.min(500, Math.max(200, Math.floor((adaptive?.mcSimulations || cfg.MC_SIMULATIONS || 800) * 0.35))),
                        { maxScore }
                    );
                    const p = Math.max(0, Math.min(1, (bt.probability || 0) / 100));
                    brierScores.push(computeBrierScore(p, observed));
                    predObsPairs.push({ probability: p, observed });
                } catch {
                    // ignore
                }
            }
            if (brierScores.length > 0) {
                const summary = summarizeCalibration(brierScores, {
                    baseline: adaptive?.calibrationBaseline ?? cfg.MC_CALIBRATION_BRIER_BASELINE ?? 0.18,
                    maxPenalty: adaptive?.calibrationMaxPenalty ?? cfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25
                });
                calibrationPenalty = summary.calibrationPenalty;
                avgBrier = summary.avgBrier;
                const adaptiveBins = predObsPairs.length >= 18
                    ? (Number(cfg.MC_ECE_BINS_MAX) || 8)
                    : predObsPairs.length >= 10
                        ? (Number(cfg.MC_ECE_BINS_MID) || 6)
                        : (Number(cfg.MC_ECE_BINS_MIN) || 4);
                const diagnostics = computeCalibrationDiagnostics(predObsPairs, { bins: adaptiveBins });
                ece = diagnostics.ece;
                reliability = diagnostics.reliability;

                // Penalidade composta: Brier (nível) + ECE (calibração) com blending conservador.
                const eceScaled = Math.max(0, Math.min(1, ece / 0.25));
                const composedPenalty = Math.min(
                    adaptive?.calibrationMaxPenalty ?? cfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25,
                    (calibrationPenalty * 0.8) + (eceScaled * 0.2 * (adaptive?.calibrationMaxPenalty ?? cfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25))
                );
                calibrationPenalty = composedPenalty;
            }
        }

        const rawProb = Math.max(0, Math.min(100, Number(result.probability) || 0));
        const probability = enableAdaptiveCalibration
            ? shrinkProbabilityToNeutral(
                rawProb,
                calibrationPenalty,
                cfg.MC_CALIBRATION_NEUTRAL_PCT || 50,
                cfg.MC_CALIBRATION_MAX_APPLIED_PENALTY || 0.5
            )
            : rawProb;

        const extraLowSampleShrink = isLowSample
            ? Math.min(0.35, (lowSampleThreshold - history.length) / lowSampleThreshold)
            : 0;
        const adjustedProbability = isLowSample
            ? shrinkProbabilityToNeutral(probability, extraLowSampleShrink, cfg.MC_CALIBRATION_NEUTRAL_PCT || 50, 0.5)
            : probability;

        const ciLow = Number(result.ci95Low) || 0;
        const ciHigh = Number(result.ci95High) || 0;
        const ciMid = (ciLow + ciHigh) / 2;
        const ciExpand = isLowSample ? (1 + extraLowSampleShrink * 1.8) : 1;
        const widenedCiLow = Math.max(0, ciMid - ((ciMid - ciLow) * ciExpand));
        const widenedCiHigh = Math.min(maxScore, ciMid + ((ciHigh - ciMid) * ciExpand));

        const finalResult = {
            probability: adjustedProbability,
            volatility: (Number(result.volatility) || 0) * (1 + (enableAdaptiveCalibration ? calibrationPenalty * 0.8 : 0)),
            mean: result.mean,
            ci95Low: widenedCiLow,
            ci95High: widenedCiHigh,
            calibrationPenalty,
            avgBrier,
            ece,
            reliability,
            sampleSize: history.length,
            lowSampleAdjustment: Number(extraLowSampleShrink.toFixed(4))
        };

        if (mcCache.size >= MC_CACHE_MAX) {
            const firstKey = mcCache.keys().next().value;
            mcCache.delete(firstKey);
        }
        mcCache.set(hash, finalResult);
        return finalResult;
    } catch (e) {
        if (typeof console !== 'undefined') {
            console.warn('[CoachMC] Simulação falhou:', e.message, { n: history.length });
        }
        return null;
    }
}
