const TELEMETRY_KEY = 'coach_calibration_events_v1';

async function sendToFirebaseAnalytics(metric) {
    try {
        const { analytics, isLocalMode } = await import('../services/firebase.js');
        if (isLocalMode || !analytics) return;
        const { logEvent } = await import('firebase/analytics');
        logEvent(analytics, 'coach_calibration_event', {
            category_id: String(metric.categoryId || 'unknown'),
            avg_brier: Number(metric.avgBrier || 0),
            calibration_penalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
        });
    } catch {
        // analytics unavailable in this runtime
    }
}

export function logCalibrationTelemetryEvent(metric) {
    if (!metric || !metric.categoryId) return;
    try {
        const current = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
        const next = [...current, metric].slice(-1000);
        localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
    } catch {
        // best effort telemetry
    }
    void sendToFirebaseAnalytics(metric);
}
