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
