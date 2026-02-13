export function updatePosteriorNormal({
    priorMean,
    priorVariance,
    sampleMean,
    sampleVariance,
    n
}) {
    if (n < 2 || sampleVariance === 0) {
        return {
            mean: priorMean,
            variance: priorVariance
        };
    }

    const posteriorVariance =
        1 / ((1 / priorVariance) +
            (n / sampleVariance));

    const posteriorMean =
        posteriorVariance *
        ((priorMean / priorVariance) +
            (n * sampleMean / sampleVariance));

    return {
        mean: posteriorMean,
        variance: posteriorVariance
    };
}
