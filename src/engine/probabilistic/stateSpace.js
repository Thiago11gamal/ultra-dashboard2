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
import { normalizeDate } from '../../utils/dateHelper.js';
import { kahanSum } from '../math/kahan.js';

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
  if (rawDate === null || rawDate === undefined || rawDate === '' || typeof rawDate === 'boolean') return NaN;
  if (typeof rawDate === 'number') {
    return Number.isFinite(rawDate) && rawDate > 0 ? (rawDate < 1e11 ? rawDate * 1000 : rawDate) : NaN;
  }

  const normalized = normalizeDate(rawDate);
  if (normalized && !Number.isNaN(normalized.getTime())) {
    return normalized.getTime();
  }
  const parsed = Date.parse(String(rawDate));
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Estima habilidade e tendência usando filtro de Kalman simplificado.
 * Compatível com o código do coach que espera campos como abilitySd/trendPerDay.
 */
export function kalmanAbilityTrend(observations = [], options = {}) {
  const maxScore = clampNumber(options.maxScore ?? 100, 1, 1_000_000);
  const minScore = clampNumber(options.minScore ?? 0, -1_000_000, maxScore);
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

  // Ruído de medição estimado por diferenças sucessivas detrendadas:
  // Var((y_t - y_{t-1}) - drift) ≈ 2 * sigma_eps^2, isolando ruído observacional da evolução real.
  let observationVariance = Math.pow(domain * 0.08, 2);

  const qAbility = Math.pow(domain * 0.005, 2);
  const qTrend = Math.pow(domain * 0.001, 2);

  if (scores.length >= 3) {
    const diffs = [];
    const dts = [];
    for (let i = 1; i < obs.length; i++) {
      const dt = clampNumber((obs[i].time - obs[i - 1].time) / 86400000, 0.25, 60);
      diffs.push(scores[i] - scores[i - 1]);
      dts.push(dt);
    }
    const totalDt = kahanSum(dts);
    const driftPerDay = totalDt > 1e-6 ? kahanSum(diffs) / totalDt : 0;
    let sumNoiseSq = 0;
    for (let i = 0; i < diffs.length; i++) {
      const detrended = diffs[i] - driftPerDay * dts[i];
      // Subtrai difusão de processo esperada qAbility * dt_i para isolar 2 * sigma_eps^2
      const pureMeasSq = Math.max(0, detrended * detrended - qAbility * dts[i]);
      sumNoiseSq += pureMeasSq;
    }
    const diffVar = sumNoiseSq / Math.max(1, diffs.length - 1);
    const estMeasurementVar = 0.5 * diffVar;

    observationVariance = Math.max(
      Math.pow(domain * 0.04, 2),
      Math.min(Math.pow(domain * 0.25, 2), estMeasurementVar + Math.pow(domain * 0.02, 2))
    );
  }

  // Prior difuso centrado no ponto médio da escala antes de observar i = 0
  // (elimina look-ahead em y_1, y_2 e dupla contagem de y_0).
  const initialAbility = minScore + domain * 0.5;
  let ability = initialAbility;
  let trend = 0;

  let P00 = Math.max(observationVariance * 4, Math.pow(domain * 0.35, 2));
  let P01 = 0;
  let P11 = Math.pow(domain * 0.01, 2);

  // FIX-PARAM: maxTrendPerDay reduzido de 0.015 para 0.005 do domínio.
  // Antes: domain=100 → 1.5 pts/dia = 45 pts/mês (irrealista).
  // Agora: domain=100 → 0.5 pts/dia = 15 pts/mês (realista).
  const maxTrendPerDay = Math.max(domain * 0.0005, domain * 0.005);

  let previousTime = obs[0].time;
  let logLikelihood = 0;

  for (let i = 0; i < obs.length; i++) {
    const current = obs[i];
    const y = clampNumber(current.score, minScore, maxScore);

    if (i > 0) {
      const dtDays = clampNumber((current.time - previousTime) / 86400000, 0.25, 60);

      ability = clampNumber(ability + trend * dtDays, minScore, maxScore);

      // Matriz Q(dt) integrada em tempo contínuo para modelo local linear trend
      const dt2 = dtDays * dtDays;
      const dt3 = dt2 * dtDays;
      const nextP00 =
        P00 + 2 * dtDays * P01 + dt2 * P11 + qAbility * dtDays + (qTrend * dt3) / 3;
      const nextP01 = P01 + dtDays * P11 + 0.5 * qTrend * dt2;
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

    const prevAbilityStep = ability;
    const prevTrendStep = trend;
    ability = clampNumber(ability + K0 * innovation, minScore, maxScore);
    trend = clampNumber(trend + K1 * innovation, -maxTrendPerDay, maxTrendPerDay);

    // Ganho efetivo sob restrição de caixa (evita colapso artificial de variância na fronteira)
    const hasInnovation = Math.abs(innovation) > 1e-9;
    const K0Eff = hasInnovation ? clampNumber((ability - prevAbilityStep) / innovation, 0, K0) : K0;
    const K1Eff = hasInnovation
      ? (K1 >= 0 ? clampNumber((trend - prevTrendStep) / innovation, 0, K1) : clampNumber((trend - prevTrendStep) / innovation, K1, 0))
      : K1;

    const A00 = 1 - K0Eff;
    const A01 = 0;
    const A10 = -K1Eff;
    const A11 = 1;

    const AP00 = A00 * P00 + A01 * P01;
    const AP01 = A00 * P01 + A01 * P11;
    const AP10 = A10 * P00 + A11 * P01;
    const AP11 = A10 * P01 + A11 * P11;

    const newP00 =
      AP00 * A00 +
      AP01 * A01 +
      K0Eff * observationVariance * K0Eff;

    const newP01 =
      AP00 * A10 +
      AP01 * A11 +
      K0Eff * observationVariance * K1Eff;

    const newP11 =
      AP10 * A10 +
      AP11 * A11 +
      K1Eff * observationVariance * K1Eff;

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
    abilityTrendCov: P01,
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
 * Executa o mesmo Filtro de Kalman Local-Linear-Trend retornando toda a série
 * passo a passo para visualização (habilidade latente vs. notas brutas + IC 95%).
 */
export function kalmanAbilitySeries(observations = [], options = {}) {
  const maxScore = clampNumber(options.maxScore ?? 100, 1, 1_000_000);
  const minScore = clampNumber(options.minScore ?? 0, -1_000_000, maxScore);
  const domain = Math.max(1e-6, maxScore - minScore);

  const obs = (Array.isArray(observations) ? observations : [])
    .map((entry, index) => {
      const score = getSafeScore(entry, maxScore, minScore);
      const time = parseObservationTime(entry);
      const rawDate = entry?.date ?? entry?.createdAt ?? entry?.timestamp ?? null;
      return {
        index,
        score: Number.isFinite(score) ? clampNumber(score, minScore, maxScore) : NaN,
        time,
        rawDate,
      };
    })
    .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);

  if (obs.length < 2) {
    return { points: [], summary: null };
  }

  const scores = obs.map((entry) => entry.score);
  let observationVariance = Math.pow(domain * 0.08, 2);
  const qAbility = Math.pow(domain * 0.005, 2);
  const qTrend = Math.pow(domain * 0.001, 2);

  if (scores.length >= 3) {
    const diffs = [];
    const dts = [];
    for (let i = 1; i < obs.length; i++) {
      const dt = clampNumber((obs[i].time - obs[i - 1].time) / 86400000, 0.25, 60);
      diffs.push(scores[i] - scores[i - 1]);
      dts.push(dt);
    }
    const totalDt = kahanSum(dts);
    const driftPerDay = totalDt > 1e-6 ? kahanSum(diffs) / totalDt : 0;
    let sumNoiseSq = 0;
    for (let i = 0; i < diffs.length; i++) {
      const detrended = diffs[i] - driftPerDay * dts[i];
      const pureMeasSq = Math.max(0, detrended * detrended - qAbility * dts[i]);
      sumNoiseSq += pureMeasSq;
    }
    const diffVar = sumNoiseSq / Math.max(1, diffs.length - 1);
    const estMeasurementVar = 0.5 * diffVar;
    observationVariance = Math.max(
      Math.pow(domain * 0.04, 2),
      Math.min(Math.pow(domain * 0.25, 2), estMeasurementVar + Math.pow(domain * 0.02, 2))
    );
  }

  const obsSd = Math.sqrt(Math.max(1e-9, observationVariance));
  let ability = minScore + domain * 0.5;
  let trend = 0;
  let P00 = Math.max(observationVariance * 4, Math.pow(domain * 0.35, 2));
  let P01 = 0;
  let P11 = Math.pow(domain * 0.01, 2);
  const maxTrendPerDay = Math.max(domain * 0.0005, domain * 0.005);

  let previousTime = obs[0].time;
  const points = [];

  for (let i = 0; i < obs.length; i++) {
    const current = obs[i];
    const y = clampNumber(current.score, minScore, maxScore);

    if (i > 0) {
      const dtDays = clampNumber((current.time - previousTime) / 86400000, 0.25, 60);
      ability = clampNumber(ability + trend * dtDays, minScore, maxScore);
      const dt2 = dtDays * dtDays;
      const dt3 = dt2 * dtDays;
      P00 = Math.max(1e-12, P00 + 2 * dtDays * P01 + dt2 * P11 + qAbility * dtDays + (qTrend * dt3) / 3);
      P01 = P01 + dtDays * P11 + 0.5 * qTrend * dt2;
      P11 = Math.max(1e-12, P11 + qTrend * dtDays);
      previousTime = current.time;
    }

    const predictedAbility = ability;
    const innovation = y - predictedAbility;
    const S = P00 + observationVariance;

    if (Number.isFinite(S) && S > 1e-12) {
      const K0 = P00 / S;
      const K1 = P01 / S;
      const prevAbilityStep = ability;
      const prevTrendStep = trend;
      ability = clampNumber(ability + K0 * innovation, minScore, maxScore);
      trend = clampNumber(trend + K1 * innovation, -maxTrendPerDay, maxTrendPerDay);

      const hasInnovation = Math.abs(innovation) > 1e-9;
      const K0Eff = hasInnovation ? clampNumber((ability - prevAbilityStep) / innovation, 0, K0) : K0;
      const K1Eff = hasInnovation
        ? (K1 >= 0 ? clampNumber((trend - prevTrendStep) / innovation, 0, K1) : clampNumber((trend - prevTrendStep) / innovation, K1, 0))
        : K1;

      const A00 = 1 - K0Eff;
      const A10 = -K1Eff;
      const AP00 = A00 * P00;
      const AP01 = A00 * P01;
      const AP10 = A10 * P00 + P01;
      const AP11 = A10 * P01 + P11;

      P00 = Math.max(1e-12, AP00 * A00 + K0Eff * observationVariance * K0Eff);
      P01 = AP00 * A10 + AP01 + K0Eff * observationVariance * K1Eff;
      P11 = Math.max(1e-12, AP10 * A10 + AP11 + K1Eff * observationVariance * K1Eff);
    }

    const abilitySd = Math.sqrt(Math.max(0, P00));
    const ci95Low = clampNumber(ability - 1.96 * abilitySd, minScore, maxScore);
    const ci95High = clampNumber(ability + 1.96 * abilitySd, minScore, maxScore);
    const innovationSigma = i > 0 && obsSd > 1e-6 ? Math.abs(innovation) / Math.sqrt(Math.max(1e-9, S)) : 0;

    const dtObj = new Date(current.time);
    const isoDate = `${dtObj.getFullYear()}-${String(dtObj.getMonth() + 1).padStart(2, '0')}-${String(dtObj.getDate()).padStart(2, '0')}`;
    const displayDate = `${String(dtObj.getDate()).padStart(2, '0')}/${String(dtObj.getMonth() + 1).padStart(2, '0')}`;

    points.push({
      date: typeof current.rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(current.rawDate) ? current.rawDate.slice(0, 10) : isoDate,
      displayDate,
      timestamp: current.time,
      rawScore: Number(y.toFixed(2)),
      ability: Number(ability.toFixed(2)),
      abilitySd: Number(abilitySd.toFixed(2)),
      ciBand: [Number(ci95Low.toFixed(2)), Number(ci95High.toFixed(2))],
      ci95Low: Number(ci95Low.toFixed(2)),
      ci95High: Number(ci95High.toFixed(2)),
      innovation: Number(innovation.toFixed(2)),
      isOutlier: innovationSigma >= 1.5,
      trendPerMonth: Number(clampNumber(trend * 30, -domain, domain).toFixed(2)),
    });
  }

  const last = points[points.length - 1];
  const outlierCount = points.filter((p) => p.isOutlier).length;
  const rawSd = kahanStd(scores);

  return {
    points,
    summary: {
      ability: last.ability,
      abilitySd: last.abilitySd,
      trendPerDay: Number(clampNumber(trend, -maxTrendPerDay, maxTrendPerDay).toFixed(4)),
      trendPerMonth: last.trendPerMonth,
      observationSd: Number(obsSd.toFixed(2)),
      rawSd: Number(rawSd.toFixed(2)),
      noiseReductionPct: rawSd > 1e-6 ? Math.max(0, Math.min(99, Math.round((1 - last.abilitySd / rawSd) * 100))) : 0,
      outlierCount,
      sampleSize: points.length,
    },
  };
}

/**
 * Filtro de Kalman simplificado para estimativa de habilidade.
 */
export function runStateSpaceModel(scores, options = {}) {
  const toPositiveOpt = (val, fallback) => {
    if (val === null || val === undefined || val === '' || typeof val === 'boolean') return fallback;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const rawMax = Number(options?.maxScore);
  const rawMin = Number(options?.minScore);
  let safeMax = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
  let safeMin = Number.isFinite(rawMin) ? rawMin : 0;
  if (safeMin >= safeMax) {
    safeMin = Math.min(0, safeMax - 1);
  }
  const domain = Math.max(1e-6, safeMax - safeMin);

  // Default parameters scaled to domain to ensure scale invariance
  const defaultProcessNoise = Math.pow(domain * 0.01, 2);
  const defaultObservationNoise = Math.pow(domain * 0.10, 2);
  const defaultInitialVariance = Math.pow(domain * 0.35, 2);

  const processNoise = toPositiveOpt(options?.processNoise, defaultProcessNoise);
  const observationNoise = toPositiveOpt(options?.observationNoise, defaultObservationNoise);
  const initialVariance = toPositiveOpt(options?.initialVariance, defaultInitialVariance);

  const fallbackMean = (safeMax + safeMin) / 2;

  const rawEntries = (Array.isArray(scores) ? scores : [])
    .map((s) => {
      const score = typeof s === 'number' ? s : getSafeScore(s, safeMax, safeMin);
      const time = parseObservationTime(s);
      return { score, time };
    })
    .filter((item) => Number.isFinite(item.score));

  if (rawEntries.length === 0) {
    return {
      ability: fallbackMean,
      variance: initialVariance,
      trend: 0,
      insufficientData: true,
    };
  }

  // Ordena cronologicamente se todos os itens possuírem timestamp válido
  const allHaveTime = rawEntries.every((item) => Number.isFinite(item.time));
  const validEntries = allHaveTime
    ? rawEntries.slice().sort((a, b) => a.time - b.time)
    : rawEntries;

  // Inicialização causal sem usar média futura da série inteira como prior
  let ability = fallbackMean;
  let variance = Math.max(initialVariance, Math.pow((safeMax - safeMin) * 0.35, 2));

  let trendSum = 0;
  let trendTimeSum = 0;
  let trendCount = 0;
  let prevAbility = ability;
  let prevTime = validEntries[0].time;

  for (let i = 0; i < validEntries.length; i++) {
    const { score, time } = validEntries[i];
    const dtDays = i === 0
      ? 0
      : (Number.isFinite(time) && Number.isFinite(prevTime)
        ? clampNumber((time - prevTime) / 86400000, 0.25, 60)
        : 1);

    // Predição escalada pelo intervalo temporal dtDays
    const predictedVariance = variance + processNoise * dtDays;

    // Atualização (gain)
    const gain = predictedVariance / (predictedVariance + observationNoise);

    // Inovação
    const innovation = score - ability;

    // Atualização de estado (clampado nos limites seguros)
    ability = clampNumber(ability + gain * innovation, safeMin, safeMax);
    variance = Math.max(1e-9, (1 - gain) * predictedVariance);

    // Trend
    if (trendCount > 0) {
      trendSum += ability - prevAbility;
      trendTimeSum += dtDays;
    }
    trendCount++;

    prevAbility = ability;
    if (Number.isFinite(time)) prevTime = time;
  }

  const trend = trendCount > 1 && trendTimeSum > 0 ? trendSum / trendTimeSum : 0;

  return {
    ability,
    variance,
    std: Math.sqrt(variance),
    trend,
    n: validEntries.length,
    insufficientData: validEntries.length < 3,
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
  kalmanAbilitySeries,
  kahanMean,
  kahanVariance,
  kahanStd,
};

