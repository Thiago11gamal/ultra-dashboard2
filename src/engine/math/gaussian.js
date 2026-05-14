// src/engine/math/gaussian.js
import { getPercentile } from './percentile.js';

/**
 * Abramowitz & Stegun approximation (formula 7.1.26) for Normal(0,1) CDF
 * Returns 1 - P(X <= z)
 */
export function normalCDF_complement(z) {
    // MATH-02 FIX: Clamp extreme z-scores. The Abramowitz & Stegun polynomial
    // loses precision for |z| > 6 and can return slightly negative values for |z| > 8.
    if (z === Number.POSITIVE_INFINITY) return 0;
    if (z === Number.NEGATIVE_INFINITY) return 1;
    if (Number.isNaN(z)) return 0.5;
    if (z > 8) return 0;
    if (z < -8) return 1;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? p : 1 - p;
}

/**
 * Calculates Y value for an asymmetric Gaussian curve
 */
export function asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor = 1) {
    const rawSd = x < mean ? sdLeft : sdRight;
    // Previne divisão por zero se sdLeft/sdRight vierem corrompidos
    const currentSd = Number.isFinite(rawSd) && rawSd > 0 ? rawSd : 1e-6;
    return heightFactor * Math.exp(-0.5 * Math.pow((x - mean) / currentSd, 2));
}

/**
 * Generates SVG path points for a Gaussian curve
 */
export function generateGaussianPoints(xMin, xMax, steps, mean, sdLeft, sdRight, heightFactor, xp, yp) {
    const points = [];
    const safeXp = typeof xp === 'function' ? xp : (v) => v;
    const safeYp = typeof yp === 'function' ? yp : (v) => v;
    const safeSteps = Number.isFinite(steps) ? Math.max(1, Math.floor(steps)) : 1;
    const stepSize = (xMax - xMin) / safeSteps;

    for (let i = 0; i <= safeSteps; i++) {
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
        .map(p => `${safeXp(p.x)},${safeYp(p.y)}`);
}

/**
 * Fast Kernel Density Estimation (KDE) using Binning for large Monte Carlo samples.
 * Returns normalized density points (x, y) for SVG plotting.
 */
/**
 * @param {Float32Array} allScores - sorted simulation output scores
 * @param {number} projectedMean
 * @param {number} projectedSD
 * @param {number} safeSimulations
 * @param {number} [minScore=0]  - Dynamic lower bound (e.g. 0 pts)
 * @param {number} [maxScore=100] - Dynamic upper bound (e.g. 150 pts)
 */
export function generateKDE(allScores, projectedMean, projectedSD, safeSimulations, minScore = 0, maxScore = 100) {
    if (!allScores || allScores.length === 0) return [];

    // FIX VISUAL: Margem dinâmica inteligente que respeita tanto a amplitude
    // do gráfico quanto o desvio padrão, com um piso mínimo (1.0).
    const slack = Math.max(maxScore * 0.05, projectedSD * 0.5, 1.0);
    let plotMin = Math.max(minScore - slack, projectedMean - 3.5 * projectedSD);
    let plotMax = Math.min(maxScore + slack, projectedMean + 3.5 * projectedSD);

    const vMin = minScore - slack;
    const vMax = maxScore + slack;

    // BUG 4 FIX: Ensure a minimum plot width of 1.0 even at domain boundaries.
    if (plotMax - plotMin < 1) {
        plotMin = Math.max(vMin, projectedMean - 0.5);
        plotMax = Math.min(vMax, projectedMean + 0.5);

        // Correct asymmetric squeeze at boundaries respeitando a folga visual
        if (plotMax >= maxScore && maxScore - minScore >= 1) plotMin = Math.max(vMin, vMax - 1);
        if (plotMin <= minScore && maxScore - minScore >= 1) plotMax = Math.min(vMax, vMin + 1);
    }

    const plotSteps = 200; // Aumento de resolução visual
    const stepSize = (plotMax - plotMin) / plotSteps;

    // Silverman's Rule of Thumb para suavização ideal do Kernel
    const safeSimCount = Number.isFinite(safeSimulations) && safeSimulations > 0
        ? safeSimulations
        : Math.max(1, allScores.length);
    const iqr = getPercentile(allScores, 0.75) - getPercentile(allScores, 0.25);
    const scottFactor = iqr > 0 ? Math.min(projectedSD, iqr / 1.34) : projectedSD;
    const h = 0.9 * scottFactor * Math.pow(safeSimCount, -0.2);

    // REVISION: KDE using 300 Bins for higher UI resolution
    const BIN_COUNT = 300;
    const binWidth = (plotMax - plotMin) / BIN_COUNT;

    // CORREÇÃO: Cálculo dinâmico do bandwidth sem o limite rígido de 1.0.
    // Isso evita que escalas maiores (ex: 0-1000) colapsem a resolução do KDE.
    const finiteH = Number.isFinite(h) && h > 0 ? h : 0;
    const finiteProjectedSD = Number.isFinite(projectedSD) && projectedSD > 0 ? projectedSD : 0;
    
    // Garantir que a banda do kernel abranja sempre pelo menos 3 bins físicos (suavização forçada)
    const minPhysicalBandwidth = (plotMax - plotMin) / (BIN_COUNT / 3); 
    const bandwidth = Math.max(minPhysicalBandwidth, finiteH, binWidth * 2, finiteProjectedSD * 0.15);
    const bins = new Float32Array(BIN_COUNT);

    // BUG-KDE-01 FIX: usar allScores.length para evitar acesso OOB se safeSimulations != allScores.length
    for (let i = 0; i < allScores.length; i++) {
        let s = Math.max(minScore, Math.min(maxScore, allScores[i]));
        if (s > plotMax || s < plotMin) continue;
        const idx = Math.min(BIN_COUNT - 1, Math.floor((s - plotMin) / binWidth));
        bins[idx]++;
    }

    const invBandwidth = 1 / bandwidth;



    // FIX MATEMÁTICO: A normalização usa a base total de simulações para 
    // evitar inflar o pico visual quando há muitos outliers fora da tela.
    // FIX: Adicionar proteção contra divisão por zero e underflow
    const normFactor = 1 / (Math.max(1, safeSimCount) * Math.max(1e-10, bandwidth) * Math.sqrt(2 * Math.PI));

    let maxY = 0;
    const rawData = [];

    // FASE 1: Calcular densidades brutas
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

        // FIX BUG 5: Remover o Hard-Cut da densidade.
        // O algoritmo Silverman's Reflection Kernel já cuida de não deixar a densidade vazar 
        // mantendo a integral igual a 1. Forçar a zero destrói a suavização vetorial (SVG) do UI.
        // REMOVIDO: if (x < minScore || x > maxScore) density = 0;

        if (density > maxY) maxY = density;
        rawData.push({ x, density });
    }

    // BUGFIX B5: Normalizar integral da densidade para 1.0 (Reflexão de fronteira infla a integral)
    const totalArea = rawData.reduce((s, d, i) =>
        i > 0 ? s + (d.density + rawData[i - 1].density) * stepSize / 2 : s, 0);
    const normFactor2 = totalArea > 0 ? 1 / totalArea : 1;

    // FASE 2: Formatar (y: 0-1 para visualização, density: área=1 para probabilidades)
    return rawData.map(d => ({
        x: Number(d.x.toFixed(2)),
        y: maxY > 1e-15 ? Number((d.density / maxY).toFixed(4)) : 0, // Proteção contra maxY zero
        density: d.density * normFactor2
    }));
}

/**
 * Inversa da CDF Normal (Função Probit)
 * Método: Aproximação Racional de Beasley-Springer-Moro
 * Converte uma probabilidade (p entre 0 e 1) de volta para um Z-score na curva de Gauss.
 */
export function inverseNormalCDF(p) {
    if (p <= 0) return -8; // Limite estatístico prático inferior
    if (p >= 1) return 8;  // Limite estatístico prático superior

    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
        0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
        0.0000321767881768, 0.0000002888167364, 0.0000003960315187];

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

/**
 * Amostragem Estrita para Normal Truncada
 * Garante números exclusivamente entre [min, max] mantendo a suavidade da curva.
 */
export function sampleTruncatedNormal(mean, sd, min, max, rng) {
    // 1. NOVA PROTEÇÃO: Rejeitar dados não finitos para evitar corrupção do Monte Carlo
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || !Number.isFinite(min) || !Number.isFinite(max)) {
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : lo;
        return Math.max(lo, Math.min(hi, (lo + hi) / 2));
    }

    // 2. NOVA PROTEÇÃO: Swap se min for maior que max
    if (min > max) {
        const temp = min;
        min = max;
        max = temp;
    }

    if (sd <= 0.0001) return Math.max(min, Math.min(max, mean));

    // O normalCDF_complement calcula P(X >= z), logo 1 - normalCDF_complement = P(X <= z)
    const cdfMin = 1 - normalCDF_complement((min - mean) / sd);
    const cdfMax = 1 - normalCDF_complement((max - mean) / sd);

    // BUG 4 FIX: Underflow de Precisão.
    // Se o SD é muito baixo e o mean está longe da janela, cdfMax - cdfMin pode ser 0.
    const diff = cdfMax - cdfMin;
    if (diff < 1e-16) {
        // Se a probabilidade acumulada é nula, retornamos o ponto mais provável no intervalo.
        return Math.max(min, Math.min(max, mean));
    }

    // 3. NOVA PROTEÇÃO: STRICT DETERMINISM - Falha imediatamente se não houver RNG determinístico
    if (typeof rng !== 'function') {
        throw new Error('STRICT_DETERMINISM: Deterministic RNG required. Fallback to Math.random() is forbidden.');
    }
    const sampledU = rng();
    const u = Number.isFinite(sampledU) ? sampledU : rng();
    const p = cdfMin + u * diff;

    const zScore = inverseNormalCDF(p);
    const rawScore = mean + (zScore * sd);

    // FIX NUMÉRICO: Clamp garantindo que o retorno jamais quebre os bounds por erro do IEEE 754
    return Math.max(min, Math.min(max, rawScore));
}

/**
 * Aplica Regularização de Tikhonov (Jitter/Ridge) para garantir
 * que uma matriz empírica de correlação seja Positiva Semi-Definida (PSD)
 * antes de passar pela Decomposição de Cholesky.
 */
export function ensurePositiveSemiDefinite(matrix, jitter = 1e-6) {
    const n = matrix.length;
    const psdMatrix = matrix.map(row => [...row]);
    for (let i = 0; i < n; i++) {
        psdMatrix[i][i] += jitter; // Estabiliza a diagonal principal
    }
    return psdMatrix;
}

/**
 * 💡 Decomposição de Cholesky (A = L * L^T)
 * Converte um array de ruídos normais independentes em ruídos correlacionados.
 */
export function choleskyDecomposition(matrix) {
    const n = matrix.length;
    const lower = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            if (j === i) {
                for (let k = 0; k < j; k++) sum += Math.pow(lower[j][k], 2);
                lower[j][j] = Math.sqrt(Math.max(0, matrix[j][j] - sum));
            } else {
                for (let k = 0; k < j; k++) sum += (lower[i][k] * lower[j][k]);
                // Se a diagonal for 0, previne divisão por zero
                lower[i][j] = lower[j][j] > 0 ? (matrix[i][j] - sum) / lower[j][j] : 0;
            }
        }
    }
    return lower;
}

/**
 * 💡 Aplica a matriz inferior L por um vetor de ruídos Z do Monte Carlo
 * Ex: Pega um choque neutro da sorte diária e espalha ele respeitando 
 * a correlação entre as disciplinas.
 */
export function applyCovariance(choleskyLower, zVector) {
    const n = zVector.length;
    const result = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            result[i] += choleskyLower[i][j] * zVector[j];
        }
    }
    return result;
}
