// src/engine/math/gaussian.js

/**
 * Abramowitz & Stegun approximation (formula 7.1.26) for Normal(0,1) CDF
 * Returns 1 - P(X <= z)
 */
export function normalCDF_complement(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z >= 0 ? p : 1 - p;
}

/**
 * Calculates Y value for an asymmetric Gaussian curve
 */
export function asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor = 1) {
    const currentSd = x < mean ? sdLeft : sdRight;
    return heightFactor * Math.exp(-0.5 * Math.pow((x - mean) / currentSd, 2));
}

/**
 * Generates SVG path points for a Gaussian curve
 */
export function generateGaussianPoints(xMin, xMax, steps, mean, sdLeft, sdRight, heightFactor, xp, yp) {
    const points = [];
    const stepSize = (xMax - xMin) / steps;
    
    for (let i = 0; i <= steps; i++) {
        const x = xMin + stepSize * i;
        const y = asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor);
        points.push({x, y});
    }

    // Ensure the mean (peak) is precisely included
    if (mean >= xMin && mean <= xMax) {
        points.push({x: mean, y: asymmetricGaussian(mean, mean, sdLeft, sdRight, heightFactor)});
    }

    // Sort to maintain chronological path order
    return points
        .sort((a, b) => a.x - b.x)
        .map(p => `${xp(p.x)},${yp(p.y)}`);
}
