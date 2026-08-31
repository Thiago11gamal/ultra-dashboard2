export const MS_PER_DAY = 86_400_000;

export function clamp(value, min, max) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return min;
  }

  return Math.min(max, Math.max(min, n));
}

export function toFiniteNumber(value, fallback = 0) {
  if (value == null) return fallback;

  if (typeof value?.toNumber === 'function') {
    value = value.toNumber();
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

export function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean);
  }

  return [];
}

export function toDateMs(value) {
  if (value == null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;

    // Heurística segura:
    // - valores >= 100_000_000_000 geralmente são milliseconds
    // - valores menores geralmente são seconds
    if (value >= 100_000_000_000) return value;

    return value * 1000;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value?.toMillis === 'function') {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();

    return date instanceof Date
      ? (Number.isNaN(date.getTime()) ? null : date.getTime())
      : null;
  }

  if (typeof value === 'object') {
    if (Number.isFinite(value?.seconds)) {
      return value.seconds * 1000 + Math.round((value.nanoseconds || 0) / 1_000_000);
    }

    if (Number.isFinite(value?.ms)) {
      return value.ms;
    }

    if (value?.timestamp != null) {
      return toDateMs(value.timestamp);
    }
  }

  return null;
}

export function normalizeAccuracy(value, maxScore = 100) {
  const raw = toFiniteNumber(value, null);

  if (raw == null) return 0;

  const max = Math.max(1, toFiniteNumber(maxScore, 100));

  // Heurística:
  // Se maxScore > 1 e o valor está entre 0 e 1, provavelmente é uma razão/probabilidade.
  // Ex.: bayesianStats.mean = 0.82 => 82%.
  if (max > 1 && raw >= 0 && raw <= 1) {
    return clamp(raw, 0, 1);
  }

  return clamp(raw / max, 0, 1);
}

export function getTotalQuestions(entity) {
  const direct = toFiniteNumber(entity?.simuladoStats?.totalQuestions, null);

  if (direct != null && direct >= 0) {
    return direct;
  }

  const history = normalizeArray(entity?.simuladoStats?.history);

  return history.reduce((sum, item) => {
    const total = Math.max(0, toFiniteNumber(item?.total, 0));
    return sum + total;
  }, 0);
}

export function getMasterySignal(entity, fallbackEntity = null) {
  const totalQ =
    getTotalQuestions(entity) ||
    getTotalQuestions(fallbackEntity);

  const maxScore = Math.max(
    1,
    toFiniteNumber(entity?.maxScore ?? fallbackEntity?.maxScore, 100)
  );

  const accuracyRaw =
    entity?.bayesianStats?.mean ??
    entity?.simuladoStats?.average ??
    fallbackEntity?.bayesianStats?.mean ??
    fallbackEntity?.simuladoStats?.average ??
    null;

  const accuracy = normalizeAccuracy(accuracyRaw, maxScore);

  const qNorm = clamp(totalQ / 120, 0, 1);
  const accNorm = clamp((accuracy - 0.5) / 0.4, 0, 1);

  const masterySignal = clamp((0.6 * qNorm) + (0.4 * accNorm), 0, 1);

  return {
    totalQ,
    accuracy,
    qNorm,
    accNorm,
    masterySignal
  };
}

export function halfLifeFromMastery(masterySignal, base = 7, range = 23) {
  return base + range * clamp(masterySignal, 0, 1);
}

export function retentionFromHalfLife(days, halfLife) {
  const safeDays = Math.max(0, toFiniteNumber(days, 0));
  const safeHalfLife = Math.max(1e-6, toFiniteNumber(halfLife, 1));

  return clamp(
    Math.round(100 * Math.exp(-Math.LN2 * safeDays / safeHalfLife)),
    0,
    100
  );
}

export function getLatestStudyMs(entity, tasks = []) {
  const candidates = [
    toDateMs(entity?.lastStudiedAt),
    ...normalizeArray(tasks).map(task =>
      toDateMs(task?.lastStudiedAt ?? task?.completedAt)
    )
  ].filter(ms => Number.isFinite(ms));

  return candidates.length ? Math.max(...candidates) : null;
}
