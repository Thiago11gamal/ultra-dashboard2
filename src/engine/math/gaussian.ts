// src/engine/math/gaussian.ts
import { getPercentile } from './percentile.js';
import { MIN_SD_FLOOR } from './constants.js';
import { kahanSum } from './kahan.js';

/**
 * Abramowitz & Stegun approximation (formula 7.1.26) for Normal(0,1) CDF
 * Returns 1 - P(X <= z)
 */
export function normalCDF_complement(z: number): number {
    if (z === Number.POSITIVE_INFINITY) return 0;
    if (z === Number.NEGATIVE_INFINITY) return 1;
    if (Number.isNaN(z)) return 0.5;
    if (z > 8) return 0;
    if (z < -8) return 1;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? p : 1 - p;
}

/**
 * Standard Normal PDF: φ(z) = (1/√(2π)) · exp(-z²/2)
 */
export function normalPDF(z: number): number {
    if (!Number.isFinite(z)) return 0;
    return 0.3989422804014327 * Math.exp(-0.5 * z * z);
}

/**
 * Média Exata da Normal Truncada em [a, b] com parâmetros (μ, σ).
 */
export function truncatedNormalMean(mean: number, sd: number, a: number, b: number): number {
    if (!Number.isFinite(sd) || sd <= 0) return Math.max(a, Math.min(b, mean));
    
    const alpha = (a - mean) / sd;
    const beta = (b - mean) / sd;
    
    let denominator: number;
    let phiAlpha: number;

    if (alpha > 0 && beta > 0) {
        // Evita cancelamento catastrófico na cauda direita usando a Função de Sobrevivência (S)
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        denominator = sAlpha - sBeta;
        phiAlpha = 1 - sAlpha;
    } else {
        phiAlpha = 1 - normalCDF_complement(alpha);
        const phiBeta = 1 - normalCDF_complement(beta);
        denominator = phiBeta - phiAlpha;
    }
    
    if (denominator < 1e-15) return Math.max(a, Math.min(b, mean));
    
    const pdfAlpha = normalPDF(alpha);
    const pdfBeta = normalPDF(beta);
    
    const truncMean = mean + sd * (pdfAlpha - pdfBeta) / denominator;
    return Math.max(a, Math.min(b, truncMean));
}
const rngCache = new WeakMap<Function, number>();

export const generateGaussian = (rng: () => number = Math.random): number => {
    if (rngCache.has(rng)) {
        const result = rngCache.get(rng)!;
        rngCache.delete(rng);
        return result;
    }

    let u1 = 0, u2 = 0;
    let attempts = 0;
    
    while (u1 === 0 && attempts < 100) {
        u1 = rng(); 
        attempts++;
    }
    if (u1 === 0) u1 = 1e-15;
    
    let attemptsU2 = 0;
    while (u2 === 0 && attemptsU2 < 100) {
        u2 = rng();
        attemptsU2++;
    }
    if (u2 === 0) u2 = 1e-15;
    
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);
    
    rngCache.set(rng, z1);
    return z0;
};

export function resetGaussianCache(): void {}

export function asymmetricGaussian(x: number, mean: number, sdLeft: number, sdRight: number, heightFactor: number = 1): number {
    const rawSd = x < mean ? sdLeft : sdRight;
    const currentSd = Math.max(1e-6, rawSd);
    return heightFactor * Math.exp(-0.5 * Math.pow((x - mean) / currentSd, 2));
}

export function generateGaussianPoints(xMin: number, xMax: number, steps: number, mean: number, sdLeft: number, sdRight: number, heightFactor: number, xp: (v: number) => number, yp: (v: number) => number): string[] {
    const points: Array<{x: number, y: number}> = [];
    const safeXp = typeof xp === 'function' ? xp : (v: number) => v;
    const safeYp = typeof yp === 'function' ? yp : (v: number) => v;
    const safeSteps = Number.isFinite(steps) ? Math.max(1, Math.floor(steps)) : 1;
    const stepSize = (xMax - xMin) / safeSteps;

    for (let i = 0; i <= safeSteps; i++) {
        const x = xMin + stepSize * i;
        const y = asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor);
        points.push({ x, y });
    }

    if (mean >= xMin && mean <= xMax) {
        points.push({ x: mean, y: asymmetricGaussian(mean, mean, sdLeft, sdRight, heightFactor) });
    }

    return points
        .sort((a, b) => a.x - b.x)
        .map(p => `${safeXp(p.x)},${safeYp(p.y)}`);
}

export type PlotPoint = { x: number, y: number, density: number };

export function generateKDE(allScores: Float32Array | number[], projectedMean: number, projectedSD: number, safeSimulations: number, minScore: number = 0, maxScore: number = 100): PlotPoint[] {
    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || minScore >= maxScore) {
        return [];
    }
    if (!allScores || allScores.length === 0) return [];

    const safeMean = Number.isFinite(projectedMean) ? projectedMean : (maxScore / 2);
    const safeSD = (Number.isFinite(projectedSD) && projectedSD > 0) ? projectedSD : (maxScore * 0.1);

    const slack = Math.max(maxScore * 0.05, safeSD * 0.5, 1.0);
    let plotMin = Math.max(minScore - slack, safeMean - 3.5 * safeSD);
    let plotMax = Math.min(maxScore + slack, safeMean + 3.5 * safeSD);

    const vMin = minScore - slack;
    const vMax = maxScore + slack;

    if (plotMax - plotMin < 1) {
        plotMin = Math.max(vMin, safeMean - 0.5);
        plotMax = Math.min(vMax, safeMean + 0.5);

        if (plotMax >= maxScore && maxScore - minScore >= 1) plotMin = Math.max(vMin, plotMax - 1);
        if (plotMin <= minScore && maxScore - minScore >= 1) plotMax = Math.min(vMax, plotMin + 1);
    }

    const plotSteps = 200; 
    const stepSize = (plotMax - plotMin) / plotSteps;

    const safeSimCount = Number.isFinite(safeSimulations) && safeSimulations > 0
        ? safeSimulations
        : Math.max(1, allScores.length);
    const iqr = getPercentile(allScores, 0.75, true) - getPercentile(allScores, 0.25, true);
    const scottFactor = iqr > 0 ? Math.min(safeSD, iqr / 1.34) : safeSD;
    const h = 0.9 * scottFactor * Math.pow(safeSimCount, -0.2);

    const BIN_COUNT = 300;
    const binWidth = (plotMax - plotMin) / BIN_COUNT;

    const finiteH = Number.isFinite(h) && h > 0 ? h : 0;
    
    const minPhysicalBandwidth = Math.max(1e-9, (plotMax - plotMin) * 0.015); 
    
    const bandwidth = Math.max(minPhysicalBandwidth, finiteH, binWidth * 2, safeSD * 0.15);
    const bins = new Float32Array(BIN_COUNT);

    for (let i = 0; i < allScores.length; i++) {
        let s = Math.max(minScore, Math.min(maxScore, allScores[i]));
        if (s > plotMax || s < plotMin) continue;
        const idx = Math.min(BIN_COUNT - 1, Math.floor((s - plotMin) / binWidth));
        bins[idx]++;
    }

    const invBandwidth = 1 / bandwidth;

    const normFactor = 1 / (Math.max(1, safeSimCount) * Math.max(1e-10, bandwidth) * 2.506628274631);

    const xOut = new Float64Array(plotSteps + 1);
    const densityOut = new Float64Array(plotSteps + 1);
    let maxY = 0;

    for (let i = 0; i <= plotSteps; i++) {
        const x = plotMin + i * stepSize;
        let density = 0;

        for (let j = 0; j < BIN_COUNT; j++) {
            if (bins[j] === 0) continue;
            const binX = plotMin + (j + 0.5) * binWidth;

            const dist = (x - binX) * invBandwidth;
            const distReflMin = (x - (2 * minScore - binX)) * invBandwidth;
            const distReflMax = (x - (2 * maxScore - binX)) * invBandwidth;

            if (Math.abs(dist) < 4.0 || Math.abs(distReflMin) < 4.0 || Math.abs(distReflMax) < 4.0) {
                let localDensity = Math.exp(-0.5 * dist * dist);
                localDensity += Math.exp(-0.5 * distReflMin * distReflMin);
                localDensity += Math.exp(-0.5 * distReflMax * distReflMax);
                density += bins[j] * localDensity;
            }
        }
        density *= normFactor;

        if (density > maxY) maxY = density;
        xOut[i] = x;
        densityOut[i] = density;
    }

    let totalArea = 0;
    let kahanC = 0;
    for (let i = 1; i <= plotSteps; i++) {
        const area = (densityOut[i] + densityOut[i-1]) * stepSize * 0.5;
        const y = area - kahanC;
        const t = totalArea + y;
        kahanC = (t - totalArea) - y;
        totalArea = t;
    }
        
    const normFactor2 = totalArea > 1e-15 ? 1 / totalArea : 1;
    const invMaxY = maxY > 1e-15 ? 1 / maxY : 0;

    const finalPlot: PlotPoint[] = new Array(plotSteps + 1);
    for (let i = 0; i <= plotSteps; i++) {
        const den = Math.max(0, densityOut[i]);
        finalPlot[i] = {
            x: Number(xOut[i].toFixed(2)),
            y: Number((den * invMaxY).toFixed(4)), 
            density: den * normFactor2
        };
    }
    
    return finalPlot;
}

export function inverseNormalCDF(p: number): number {
    if (p <= 0) return -8; 
    if (p >= 1) return 8;  

    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
        0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
        0.0000321767881768, 0.0000002888167364, 3.960315187e-7]; // Wichura coefficient fix

    let x = p - 0.5;
    if (Math.abs(x) < 0.42) {
        let r = x * x;
        return x * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) /
            ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1.0);
    } else {
        let r = p;
        if (x > 0) r = 1.0 - p;
        r = Math.log(-Math.log(r));
        let z = c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * (c[5] + r * (c[6] + r * (c[7] + r * c[8])))))));
        return x < 0 ? -z : z;
    }
}

export function sampleTruncatedNormal(mean: number, sd: number, min: number, max: number, rng?: () => number, options?: { strict?: boolean }): number {
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || !Number.isFinite(min) || !Number.isFinite(max)) {
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : lo;
        return Math.max(lo, Math.min(hi, (lo + hi) / 2));
    }

    if (min > max) {
        const temp = min;
        min = max;
        max = temp;
    }

    if (sd <= MIN_SD_FLOOR) return Math.max(min, Math.min(max, mean));

    let diff: number;
    let cdfMin: number;

    if (alpha > 0 && beta > 0) {
        // Evita cancelamento catastrófico na cauda direita usando a Função de Sobrevivência (S)
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        diff = sAlpha - sBeta;
        cdfMin = 1 - sAlpha;
    } else {
        cdfMin = 1 - normalCDF_complement(alpha);
        const cdfMax = 1 - normalCDF_complement(beta);
        diff = cdfMax - cdfMin;
    }
    if (diff < 1e-16) {
        return Math.max(min, Math.min(max, mean));
    }

    const strictDeterminism = options && options.strict === true;
    if (typeof rng !== 'function') {
        if (strictDeterminism) {
            throw new Error('STRICT_DETERMINISM: sampleTruncatedNormal requires a deterministic RNG function');
        }
        if (!(globalThis as any).__MC_WARNED_FALLBACK_RNG__) {
            console.warn('sampleTruncatedNormal: no RNG provided, falling back to Math.random() (non-deterministic)');
            (globalThis as any).__MC_WARNED_FALLBACK_RNG__ = true;
        }
        rng = Math.random;
    }
    const sampledU = rng();
    const u = Number.isFinite(sampledU)
        ? Math.max(0, Math.min(1, sampledU))
        : 0.5;
    const p = cdfMin + u * diff;

    const zScore = inverseNormalCDF(p);
    const rawScore = mean + (zScore * sd);

    return Math.max(min, Math.min(max, rawScore));
}

export function ensurePositiveSemiDefinite(matrix: number[][], baseJitter: number = 1e-9): number[][] {
    const n = matrix.length;
    const cloneBase = matrix.map(row => [...row]);

    let diagMax = 0;
    for (let i = 0; i < n; i++) {
        diagMax = Math.max(diagMax, Math.abs(cloneBase[i][i] || 0));
    }

    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const factor = attempt === 0 ? 0 : attempt * 10;
        const jitter = Math.max(baseJitter, (diagMax * 1e-8)) + (baseJitter * factor);
        const psdMatrix = cloneBase.map((row, i) => row.map((v, j) => (i === j ? (v + jitter) : v)));

        try {
            const L = choleskyDecomposition(psdMatrix);
            let ok = true;
            for (let k = 0; k < L.length; k++) {
                if (!Number.isFinite(L[k][k]) || L[k][k] <= 0) { ok = false; break; }
            }
            if (ok) return psdMatrix;
        } catch {
            // continue
        }
    }

    const fallbackJitter = Math.max(baseJitter, diagMax * 1e-6);
    return cloneBase.map((row, i) => row.map((v, j) => (i === j ? (v + fallbackJitter) : v)));
}

export function choleskyDecomposition(matrix: number[][]): number[][] {
    const n = matrix.length;
    const lower = Array(n).fill(0).map(() => Array(n).fill(0));
    const EPS = 1e-12;

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            if (j === i) {
                const diagTerms = [];
                for (let k = 0; k < j; k++) diagTerms.push(Math.pow(lower[j][k], 2));
                const sum = kahanSum(diagTerms);
                const diagVal = matrix[j][j] - sum;
                lower[j][j] = Math.sqrt(Math.max(EPS, diagVal));
            } else {
                const offTerms = [];
                for (let k = 0; k < j; k++) offTerms.push(lower[i][k] * lower[j][k]);
                const sum = kahanSum(offTerms);
                const denom = lower[j][j];
                lower[i][j] = denom > EPS ? (matrix[i][j] - sum) / denom : 0;
            }
        }
    }

    for (let i = 0; i < n; i++) {
        if (!Number.isFinite(lower[i][i]) || lower[i][i] < EPS) {
            lower[i][i] = EPS;
            for (let k = 0; k < i; k++) {
                lower[i][k] = 0;
            }
        }
    }

    return lower;
}

export function applyCovariance(choleskyLower: number[][] | null | undefined, zVector: number[] | Float64Array | null | undefined, targetVector?: number[] | Float64Array): number[] | Float64Array {
    if (!choleskyLower || !zVector || choleskyLower.length !== zVector.length) {
        if (targetVector && zVector && targetVector !== zVector) {
            for(let i=0; i<zVector.length; i++) targetVector[i] = zVector[i];
            return targetVector;
        }
        return zVector ? (targetVector === zVector ? targetVector : [...zVector] as number[]) : [];
    }
    const n = zVector.length;
    const isInPlace = (targetVector === zVector);
    const result = targetVector || Array(n).fill(0);
    
    if (isInPlace) {
        // Iteração reversa garante estabilidade na mutação do próprio buffer em modo in-place
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = 0; j <= i; j++) {
                sum += choleskyLower[i][j] * zVector[j];
            }
            result[i] = sum;
        }
    } else {
        for (let i = 0; i < n; i++) result[i] = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                result[i] += choleskyLower[i][j] * zVector[j];
            }
        }
    }
    return result;
}
