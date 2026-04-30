export function computeBrierScore(probability01, observedBinary) {
    const p = Math.max(0, Math.min(1, Number(probability01) || 0));
    const y = observedBinary ? 1 : 0;
    return (p - y) ** 2;
}

export function summarizeCalibration(scores = []) {
    if (!Array.isArray(scores) || scores.length === 0) {
        return { avgBrier: 0, calibrationPenalty: 0 };
    }

    const avgBrier = scores.reduce((a, b) => a + b, 0) / scores.length;
    const calibrationPenalty = Math.min(0.25, Math.max(0, avgBrier - 0.18));
    return { avgBrier, calibrationPenalty };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50) {
    const p = Math.max(0, Math.min(100, Number(probabilityPct) || 0));
    const k = Math.max(0, Math.min(0.5, Number(penalty) || 0));
    return p * (1 - k) + neutralPct * k;
}
