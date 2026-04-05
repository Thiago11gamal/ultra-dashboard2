// src/engine/math/gaussian.js

/**
 * Abramowitz & Stegun approximation (formula 7.1.26) for Normal(0,1) CDF
 * Returns 1 - P(X <= z)
 */
export function normalCDF_complement(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? p : 1 - p;
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
        points.push({ x, y });
    }

    // Ensure the mean (peak) is precisely included
    if (mean >= xMin && mean <= xMax) {
        points.push({ x: mean, y: asymmetricGaussian(mean, mean, sdLeft, sdRight, heightFactor) });
    }

    // Sort to maintain chronological path order
    return points
        .sort((a, b) => a.x - b.x)
        .map(p => `${xp(p.x)},${yp(p.y)}`);
}

/**
 * Fast Kernel Density Estimation (KDE) using Binning for large Monte Carlo samples.
 * Returns normalized density points (x, y) for SVG plotting.
 */
export function generateKDE(allScores, projectedMean, projectedSD, safeSimulations) {
    if (!allScores || allScores.length === 0) return [];

    // RIGOR-10 FIX: Anchor domain dynamically to projectedMean to avoid excessive whitespace.
    const plotMin = Math.max(0, projectedMean - 3.5 * projectedSD);
    const plotMax = Math.min(100, projectedMean + 3.5 * projectedSD);
    
    const plotSteps = 100;
    const stepSize = (plotMax - plotMin) / plotSteps;

    const empiricalData = [];

    // Silverman's Rule of Thumb para suavização ideal do Kernel
    const iqr = allScores[Math.floor(safeSimulations * 0.75)] - allScores[Math.floor(safeSimulations * 0.25)];
    const h = 0.9 * Math.min(projectedSD, iqr / 1.34) * Math.pow(safeSimulations, -0.2);

    // REVISION: KDE using 200 Bins for higher UI resolution
    const BIN_COUNT = 200;
    const binWidth = (plotMax - plotMin) / BIN_COUNT;

    // BUG-CRÍTICO FIX: Piso dinâmico proporcional ao SD evita o over-smoothing grave
    const bandwidth = Math.max(h, binWidth, Math.min(1.0, projectedSD * 0.15));
    const bins = new Float32Array(BIN_COUNT);

    // 🎯 MATH FIX: Remover overflowCount e underflowCount e fazer Data Folding
    for (let i = 0; i < safeSimulations; i++) {
        let s = allScores[i];
        
        // Data Folding: Rebater os limites intransponíveis da realidade (0 e 100)
        if (s < 0) s = Math.abs(s); 
        if (s > 100) s = 200 - s; 

        // Agora verificamos apenas o enquadramento do plot visual (Zoom do Gráfico)
        if (s > plotMax || s < plotMin) continue;

        // Scores garantidamente dentro do domínio visual e com a massa preservada
        const idx = Math.min(BIN_COUNT - 1, Math.floor((s - plotMin) / binWidth));
        bins[idx]++;
    }

    // Como os dados foram rebatidos, todos que importam estão no domínio.
    const inDomainCount = bins.reduce((a, b) => a + b, 0);
    const safeDomainCount = Math.max(1, inDomainCount); // Previne divisão por zero

    const invBandwidth = 1 / bandwidth;
    const normFactor = 1 / (safeDomainCount * bandwidth * Math.sqrt(2 * Math.PI));

    let maxY = 0;
    for (let i = 0; i <= plotSteps; i++) {
        const x = plotMin + i * stepSize;
        let density = 0;

        for (let j = 0; j < BIN_COUNT; j++) {
            if (bins[j] === 0) continue;
            const binX = plotMin + (j + 0.5) * binWidth;
            const dist = (x - binX) * invBandwidth;

            // Otimização de convolução (descarta interações a > 3.5 sigmas)
            if (Math.abs(dist) < 3.5) {
                density += bins[j] * Math.exp(-0.5 * dist * dist);
                
                // BUG-08 FIX: Boundary Reflection (Reflection correction at 0 and 100)
                if (x < bandwidth * 3.5 || x > 100 - bandwidth * 3.5) {
                    const distL = (x + binX) * invBandwidth; // Mirror at A=0
                    if (Math.abs(distL) < 3.5) density += bins[j] * Math.exp(-0.5 * distL * distL);
                    
                    const distR = (x - (200 - binX)) * invBandwidth; // Mirror at B=100
                    if (Math.abs(distR) < 3.5) density += bins[j] * Math.exp(-0.5 * distR * distR);
                }
            }
        }
        density *= normFactor;
        if (density > maxY) maxY = density;
        empiricalData.push({ x, y: density });
    }

    // MATH-04 FIX: Normalizando Y para que o pico seja 1 (100% da altura visual do SVG).
    return empiricalData.map(d => ({
        x: Number(d.x.toFixed(2)),
        y: maxY > 0 ? Number((d.y / maxY).toFixed(4)) : 0
    }));
}
