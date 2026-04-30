const TELEMETRY_KEY = 'coach_calibration_events_v1';

export function logCalibrationTelemetryEvent(metric) {
    if (!metric || !metric.categoryId) return;
    try {
        const current = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
        const next = [...current, metric].slice(-1000);
        localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
    } catch {
        // best effort telemetry
    }
}
