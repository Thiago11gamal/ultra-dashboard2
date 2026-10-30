import { safeSetItem } from './coachStorage.js';

const TELEMETRY_KEY = 'coach_calibration_events_v1';
const TELEMETRY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;

function toNullableFinite(val) {
    if (val === null || val === undefined || val === '' || typeof val === 'boolean') return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
}

async function sendToFirebaseAnalytics(metric) {
    try {
        const { getAppAnalytics, isLocalMode } = await import('../services/firebase.js');
        if (isLocalMode || typeof getAppAnalytics !== 'function') return;
        const analytics = await getAppAnalytics();
        if (!analytics) return;
        const { logEvent } = await import('firebase/analytics');
        const payload = {
            event_type: String(metric.eventType || 'calibration'),
            category_id: String(metric.categoryId || 'unknown'),
            calibration_penalty: Number(metric.calibrationPenalty ?? 0),
            probability: Number(metric.probability ?? 0),
        };
        if (Number.isFinite(metric.avgBrier)) {
            payload.avg_brier = metric.avgBrier;
        }
        if (Number.isFinite(metric.ece)) {
            payload.ece = metric.ece;
        }
        logEvent(analytics, 'coach_calibration_event', payload);
    } catch {
        // analytics unavailable in this runtime
    }
}

export function logCalibrationTelemetryEvent(metric) {
    if (!metric || !metric.categoryId) return;
    try {
        const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
        const current = Array.isArray(currentRaw) ? currentRaw : [];
        const normalizedMetric = {
            eventType: metric.eventType || 'calibration',
            categoryId: String(metric.categoryId || 'unknown'),
            avgBrier: toNullableFinite(metric.avgBrier),
            calibrationPenalty: toNullableFinite(metric.calibrationPenalty) ?? 0,
            probability: toNullableFinite(metric.probability),
            ece: toNullableFinite(metric.ece),
            timestamp: Number(metric.timestamp || Date.now())
        };
        const cutoff = Date.now() - TELEMETRY_RETENTION_MS;
        const next = [...current, normalizedMetric]
            .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= cutoff)
            .slice(-1000);
        safeSetItem(TELEMETRY_KEY, JSON.stringify(next));
        void sendToFirebaseAnalytics(normalizedMetric);
    } catch {
        console.warn('[CalibrationTelemetry] Falha ao registrar telemetria (best effort)');
    }
}

export function getCalibrationTelemetrySummary(categoryId = null) {
  try {
    const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
    const current = Array.isArray(currentRaw) ? currentRaw : [];
    const filtered = categoryId
      ? current.filter(item => String(item.categoryId) === String(categoryId))
      : current;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgBrier: null,
        avgPenalty: null,
        lastTimestamp: null
      };
    }

    const validBriers = filtered
      .map(item => toNullableFinite(item?.avgBrier))
      .filter(v => v !== null);
    const validPenalties = filtered
      .map(item => toNullableFinite(item?.calibrationPenalty))
      .filter(v => v !== null);

    const avgBrier = validBriers.length > 0
      ? Number((validBriers.reduce((s, v) => s + v, 0) / validBriers.length).toFixed(4))
      : null;
    const avgPenalty = validPenalties.length > 0
      ? Number((validPenalties.reduce((s, v) => s + v, 0) / validPenalties.length).toFixed(4))
      : null;

    return {
      count: filtered.length,
      avgBrier,
      avgPenalty,
      lastTimestamp: filtered[filtered.length - 1]?.timestamp || null
    };
  } catch {
    return {
      count: 0,
      avgBrier: null,
      avgPenalty: null,
      lastTimestamp: null
    };
  }
}

export function clearCalibrationTelemetry() {
  try {
    localStorage.removeItem(TELEMETRY_KEY);
  } catch {
    // ignore
  }
}
