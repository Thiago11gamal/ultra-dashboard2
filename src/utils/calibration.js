export function computeBrierScore(probability01, observedBinary) {
    const p = Math.max(0, Math.min(1, Number(probability01) || 0));
    const y = observedBinary ? 1 : 0;
    return (p - y) ** 2;
}

export function summarizeCalibration(scores = [], options = {}) {
    const maxPenalty = Math.max(0, Math.min(1, Number(options.maxPenalty) || 0.25));
    const baseline = Number.isFinite(options.baseline) ? options.baseline : 0.18;

    if (!Array.isArray(scores) || scores.length === 0) {
        return { avgBrier: 0, calibrationPenalty: 0 };
    }

    const avgBrier = scores.reduce((a, b) => a + b, 0) / scores.length;
    const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
    return { avgBrier, calibrationPenalty };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
    const p = Math.max(0, Math.min(100, Number(probabilityPct) || 0));
    const limit = Math.max(0, Math.min(1, Number(maxAppliedPenalty) || 0.5));
    const k = Math.max(0, Math.min(limit, Number(penalty) || 0));
    return p * (1 - k) + neutralPct * k;
}

export function computeRollingCalibrationParams(history = [], defaults = {}) {
    const fallbackBaseline = Number.isFinite(defaults.baseline) ? defaults.baseline : 0.18;
    const fallbackCap = Number.isFinite(defaults.maxPenalty) ? defaults.maxPenalty : 0.25;
    const nowTs = Number.isFinite(defaults.nowTs) ? defaults.nowTs : Date.now();
    const windowDays = Number.isFinite(defaults.windowDays) ? defaults.windowDays : 60;
    const minSamples = Number.isFinite(defaults.minSamples) ? defaults.minSamples : 4;
    const maxSamples = Number.isFinite(defaults.maxSamples) ? defaults.maxSamples : 20;

    if (!Array.isArray(history) || history.length === 0) {
        return { baseline: fallbackBaseline, maxPenalty: fallbackCap };
    }

    const windowStart = nowTs - windowDays * 24 * 60 * 60 * 1000;
    const withinWindow = history.filter(h => Number(h?.timestamp || 0) >= windowStart);
    const source = withinWindow.length >= minSamples ? withinWindow : history;

    const trimmed = source
        .slice(-maxSamples)
        .map(h => Number(h?.avgBrier))
        .filter(v => Number.isFinite(v))
        .slice(-maxSamples);

    if (trimmed.length === 0) return { baseline: fallbackBaseline, maxPenalty: fallbackCap };

    const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    const variance = trimmed.reduce((acc, v) => acc + ((v - mean) ** 2), 0) / Math.max(1, trimmed.length - 1);
    const sd = Math.sqrt(Math.max(0, variance));

    const baseline = Math.max(0.12, Math.min(0.3, mean * 0.7 + fallbackBaseline * 0.3));
    const maxPenalty = Math.max(0.12, Math.min(0.4, fallbackCap + sd * 0.5));
    return { baseline, maxPenalty };
}


// Governance Playbook Constants
export const CRITICAL_BRIER_THRESHOLD = 0.28;
export const HIGH_PENALTY_THRESHOLD = 0.20;
export const ALERT_COOLDOWN_MS = 1000 * 60 * 60 * 12; // 12h
