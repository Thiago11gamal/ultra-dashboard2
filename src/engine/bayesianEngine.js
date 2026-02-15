export function updatePosteriorNormal({
    priorMean,
    priorVariance,
    sampleMean,
    sampleVariance,
    n
}) {
    const safeN = Number.isFinite(n) ? Math.max(0, n) : 0;
    const safePriorVariance = Number.isFinite(priorVariance) ? Math.max(priorVariance, 1e-6) : 1;
    const safeSampleVariance = Number.isFinite(sampleVariance) ? Math.max(sampleVariance, 1e-6) : 1;

    if (safeN < 1) {
        return {
            mean: priorMean,
            variance: safePriorVariance
        };
    }

    const posteriorVariance =
        1 / ((1 / safePriorVariance) +
            (safeN / safeSampleVariance));

    const posteriorMean =
        posteriorVariance *
        ((priorMean / safePriorVariance) +
            (safeN * sampleMean / safeSampleVariance));

    return {
        mean: posteriorMean,
        variance: posteriorVariance
    };
}
