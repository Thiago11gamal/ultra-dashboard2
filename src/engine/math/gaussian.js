// src/engine/math/gaussian.js
import { getPercentile } from './percentile.js';

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
    const iqr = getPercentile(allScores, 0.75) - getPercentile(allScores, 0.25);
    const scottFactor = iqr > 0 ? Math.min(projectedSD, iqr / 1.34) : projectedSD;
    const h = 0.9 * scottFactor * Math.pow(safeSimulations, -0.2);

    // REVISION: KDE using 300 Bins for higher UI resolution
    const BIN_COUNT = 300;
    const binWidth = (plotMax - plotMin) / BIN_COUNT;

    // CORREÇÃO: Adicionado o piso rígido mínimo '0.001' na fórmula de largura de banda.
    // Isso evita que um desvio padrão de 0 cause divisão por zero (Infinity) e oculte o gráfico.
    const bandwidth = Math.max(0.001, h, binWidth, Math.min(1.0, projectedSD * 0.15));
    const bins = new Float32Array(BIN_COUNT);

    for (let i = 0; i < safeSimulations; i++) {
        let s = Math.max(minScore, Math.min(maxScore, allScores[i]));
        if (s > plotMax || s < plotMin) continue;
        const idx = Math.min(BIN_COUNT - 1, Math.floor((s - plotMin) / binWidth));
        bins[idx]++;
    }

    const invBandwidth = 1 / bandwidth;
    
    // FIX MATEMÁTICO: A normalização usa a base total de simulações para 
    // evitar inflar o pico visual quando há muitos outliers fora da tela.
    const normFactor = 1 / (safeSimulations * bandwidth * Math.sqrt(2 * Math.PI));

    let maxY = 0;
    const rawData = [];

    // FASE 1: Calcular e encontrar o maxY (sem criar objetos descartáveis)
    for (let i = 0; i <= plotSteps; i++) {
        let x = plotMin + i * stepSize;
        
        // VISUAL FIX: No step mais próximo da média, forçar o valor exato da média 
        // para garantir que o pico da Gaussiana seja capturado no gráfico.
        if (Math.abs(x - projectedMean) < stepSize / 2) x = projectedMean;

        let density = 0;

        for (let j = 0; j < BIN_COUNT; j++) {
            if (bins[j] === 0) continue;
            const binX = plotMin + (j + 0.5) * binWidth;
            
            // BUG 7 FIX: Boundary Correction (Data Folding Method)
            const invBand = invBandwidth;
            const dist = (x - binX) * invBand;
            let localDensity = Math.exp(-0.5 * dist * dist);
            
            // RIGOR FIX: Se binX está exatamente na borda (Massa de Dirac), o rebatimento
            // duplicaria a densidade localmente de forma errônea (1.0 + 1.0).
            // Aplicamos um fator de atenuação se o ponto estiver a menos de 0.1% do limite.
            const epsilon = (maxScore - minScore) * 0.001;

            let distMin = 999;
            if (binX > minScore + epsilon) {
                distMin = (x - (2 * minScore - binX)) * invBand;
                localDensity += Math.exp(-0.5 * distMin * distMin);
            }
            
            let distMax = 999;
            if (binX < maxScore - epsilon) {
                distMax = (x - (2 * maxScore - binX)) * invBand;
                localDensity += Math.exp(-0.5 * distMax * distMax);
            }

            // RIGOR FIX: Increased Z-cutoff to 4.0 to avoid tail steps in high volatility
            if (Math.abs(dist) < 4.0 || Math.abs(distMin) < 4.0 || Math.abs(distMax) < 4.0) {
                density += bins[j] * localDensity;
            }
        }
        density *= normFactor;
        
        // Cortar probabilidades matemáticas irreais fora do domínio fechado da prova
        if (x < minScore || x > maxScore) {
            density = 0;
        }

        if (density > maxY) maxY = density;
        rawData.push({ x, density }); 
    }

    // FASE 2: Formatar diretamente para o array final devolvido
    return rawData.map(d => ({
        x: Number(d.x.toFixed(2)),
        y: maxY > 0 ? Number((d.density / maxY).toFixed(4)) : 0
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

    // Sorteia um número uniforme restrito APENAS ao espaço válido da curva
    const u = rng(); 
    const p = cdfMin + u * diff;

    const zScore = inverseNormalCDF(p);
    const rawScore = mean + (zScore * sd);

    // FIX NUMÉRICO: Clamp garantindo que o retorno jamais quebre os bounds por erro do IEEE 754
    return Math.max(min, Math.min(max, rawScore));
}
