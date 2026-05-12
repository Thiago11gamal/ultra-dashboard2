import { mulberry32 } from './random.js';
import { normalCDF_complement, generateKDE, sampleTruncatedNormal } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };
import { getPercentile } from './math/percentile.js';

export { getPercentile };

const DEFAULT_SIMULATIONS = 5000;
const MAX_SIMULATIONS = 50000;
const DEFAULT_DOMAIN_MIN = 0;
const DEFAULT_DOMAIN_MAX = 100;

function toFiniteNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function sanitizeDomain(minScore, maxScore) {
    const rawMin = toFiniteNumber(minScore, DEFAULT_DOMAIN_MIN);
    const rawMax = toFiniteNumber(maxScore, DEFAULT_DOMAIN_MAX);
    if (rawMin <= rawMax) {
        return { minScore: rawMin, maxScore: rawMax };
    }
    // Auto-correct invalid domain (min > max) to preserve resilience.
    return { minScore: rawMax, maxScore: rawMin };
}

function sanitizeSimulations(simulations) {
    // DOS GUARD: evita consumo extremo de CPU com entradas hostis/acidentais.
    const normalized = Math.floor(toFiniteNumber(simulations, DEFAULT_SIMULATIONS));
    return clamp(normalized, 1, MAX_SIMULATIONS);
}

// CORREÇÃO VISUAL E MATEMÁTICA: Geração de semente estável (FNV-1a Hash)
// Ancoramos a semente na volumetria e topologia do histórico, não na flutuação da média.
function generateStableSeed(historyCount, categoryName, targetScore) {
    let h = 2166136261; // Offset base FNV
    const seedStr = `${historyCount}-${String(categoryName || 'global')}-${Math.floor(targetScore || 0)}`;
    
    for(let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619); // Primo FNV
    }
    return h >>> 0;
}

export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI, historyLength = 0) {
    let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
    let minScore = DEFAULT_DOMAIN_MIN;
    let maxScore = DEFAULT_DOMAIN_MAX;

    if (typeof meanOrObj === 'object' && meanOrObj !== null) {
        mean = meanOrObj.mean ?? mean;
        sd = meanOrObj.sd ?? sd;
        targetScore = meanOrObj.targetScore ?? targetScore;
        simulations = meanOrObj.simulations ?? simulations;
        seed = meanOrObj.seed ?? seed;
        currentMean = meanOrObj.currentMean ?? currentMean;
        categoryName = meanOrObj.categoryName ?? categoryName;
        bayesianCI = meanOrObj.bayesianCI ?? bayesianCI;
        minScore = meanOrObj.minScore ?? minScore;
        maxScore = meanOrObj.maxScore ?? maxScore;
        historyLength = meanOrObj.historyLength ?? 0;
    }

    const safeDomain = sanitizeDomain(minScore, maxScore);
    minScore = safeDomain.minScore;
    maxScore = safeDomain.maxScore;

    const safeMean = Number.isFinite(mean) ? mean : 0;
    let safeSD = Number.isFinite(sd) && sd > 0 ? sd : 0; 

    // FIX: Unificar a inferência do SD nos dois caminhos
    if (bayesianCI) {
        // SD SQUASH (Fix): Usar os limites NÃO truncados para inferir o SD real.
        // Se usarmos ciHigh truncado em 100, o SD será subestimado para alunos de elite.
        const high = bayesianCI.unclampedHigh !== undefined ? bayesianCI.unclampedHigh : bayesianCI.ciHigh;
        const low = bayesianCI.unclampedLow !== undefined ? bayesianCI.unclampedLow : bayesianCI.ciLow;
        
        if (high !== undefined && low !== undefined) {
            let inferredSD = (high - low) / 3.92;
            const distToBoundary = Math.min(safeMean - minScore, maxScore - safeMean);

            // Se a média estiver muito próxima do limite (0 ou 100), o intervalo de 95% 
            // fica comprimido. Inflamos o SD para refletir a incerteza real.
            if (distToBoundary < inferredSD * 1.5) {
                const correctionFactor = 1 + (1 - distToBoundary / (inferredSD * 1.5));
                inferredSD *= Math.min(1.5, correctionFactor);
            }
            if (Number.isFinite(inferredSD) && inferredSD > 0) {
                safeSD = inferredSD;
            }
        }
    }
    // MATH-05/10 FIX: Use same effective target for empirical and analytic
    // Clamp target to simulation domain
    const effectiveTarget = Math.max(minScore, Math.min(maxScore, targetScore));

    const safeSimulations = sanitizeSimulations(simulations);

    if (safeSD < 1e-5) {
        const prob = safeMean >= effectiveTarget ? 100 : 0;
        return {
            simulationCount: safeSimulations,
            probability: prob,
            analyticalProbability: prob,
            recommendedProbability: prob,
            probabilityPolicy: 'deterministic',
            mean: Number(safeMean.toFixed(2)),
            sd: 0,
            sdVisual: 0,
            sdLeft: 0, 
            sdRight: 0, 
            ci95StatLow: Number(safeMean.toFixed(2)),
            ci95StatHigh: Number(safeMean.toFixed(2)),
            ci95Low: Number(safeMean.toFixed(2)),
            ci95High: Number(safeMean.toFixed(2)),
            ci95VisualLow: Number(safeMean.toFixed(2)),
            ci95VisualHigh: Number(safeMean.toFixed(2)),
            ci95VisualClamped: false,
            currentMean: Number((currentMean || safeMean).toFixed(2)),
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                { x: Math.max(minScore, safeMean - 0.1), y: 0 },
                { x: safeMean, y: 1 },
                { x: Math.min(maxScore, safeMean + 0.1), y: 0 }
            ], 
            drift: 0,
            volatility: 0,
            minScore,
            maxScore,
            method: bayesianCI ? 'bayesian_static_hybrid' : 'deterministic'
        };
    }

    // SUBSTITUIÇÃO DA LÓGICA DE SEMENTE ANTIGA:
    // Remover o hash fraco (Math.floor(safeMean * 10000)) que causava o layout shift.
    const stableSeed = seed ?? generateStableSeed(historyLength, categoryName, targetScore);

    const rng = mulberry32(stableSeed);
    let success = 0;

    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    const allScores = new Float64Array(safeSimulations);

    // FIX BUG 2: Remover a heurística de shift artificial.
    // A Normal Truncada já acumula densidade fisicamente correta nas bordas.
    // Forçar o muParam corrompe a amostragem de Monte Carlo e a CDF analítica.
    let muParam = safeMean; 

    for (let i = 0; i < safeSimulations; i++) {
        let score = sampleTruncatedNormal(muParam, safeSD, minScore, maxScore, rng);
        
        if (score >= effectiveTarget) success++;
        allScores[i] = score;

        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (score - welfordMean);
    }

    const projectedMean = welfordMean;
    const projectedSD = Math.sqrt(Math.max(0, welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0));

    allScores.sort((a, b) => a - b);

    const statisticalCi95Low = getPercentile(allScores, 0.025);
    const statisticalCi95High = getPercentile(allScores, 0.975);
    let rawLow = statisticalCi95Low;
    let rawHigh = statisticalCi95High;

    const empiricalProbability = (success / safeSimulations) * 100;
    // Suavização Bayesiana (Jeffreys prior) para reduzir ruído em baixa amostra.
    const posteriorAlpha = success + 0.5;
    const posteriorBeta = (safeSimulations - success) + 0.5;
    const bayesEmpiricalProbability = (posteriorAlpha / (posteriorAlpha + posteriorBeta)) * 100;
    const displayMean = bayesianCI ? safeMean : projectedMean;

    // FORÇAR INCERTEZA MÍNIMA: Evitar que o cone colapse num traço liso na UI
    // MATH FIX: Tornar o spread proporcional à escala total do concurso (0.5% do maxScore)
    // Garante que o cone não fique gigante num teste de 10 pontos ou invisível num de 1000.
    const MIN_SPREAD = Math.max(0.5, maxScore * 0.005);
    
    // FIX BUG 2: Prender a média visual dentro dos limites da prova
    const clampedDisplayMean = Math.max(minScore, Math.min(maxScore, displayMean));
    
    const wasVisualCIClamped = (rawHigh - rawLow < MIN_SPREAD);
    if (wasVisualCIClamped) {
        // FIX BUG 6: Compensação assimétrica.
        // Se bater no teto, o recuo do MIN_SPREAD tem de ser integralmente descontado do piso,
        // garantindo que o spread final nunca seja menor que MIN_SPREAD.
        rawLow = Math.max(minScore, clampedDisplayMean - MIN_SPREAD / 2);
        rawHigh = Math.min(maxScore, clampedDisplayMean + MIN_SPREAD / 2);

        if (rawHigh === maxScore) {
            rawLow = Math.max(minScore, maxScore - MIN_SPREAD);
        } else if (rawLow === minScore) {
            rawHigh = Math.min(maxScore, minScore + MIN_SPREAD);
        }

        if (rawLow > rawHigh) {
            rawLow = minScore;
            rawHigh = maxScore;
        }
    }

    const displayLow = rawLow;
    const displayHigh = rawHigh;

    // BUGFIX M3: Sync the exported 'sd' with the visual clamp to avoid mathematical inconsistency
    // for external consumers of the statistical JSON.
    const visualSD = wasVisualCIClamped
        ? (rawHigh - rawLow) / 3.92 
        : projectedSD;

    const phiMin    = normalCDF_complement((minScore - muParam) / safeSD); 
    const phiMax    = normalCDF_complement((maxScore - muParam) / safeSD); 
    const phiTarget = normalCDF_complement((effectiveTarget - muParam) / safeSD); 
    
    // CORREÇÃO: Prevenir a anulação catastrófica (Underflow) em caudas severamente truncadas,
    // garantindo que a matemática analítica sobrevive a amostras estatisticamente extremas.
    const truncNormFactor = Math.max(1e-25, phiMin - phiMax);
    const clampedPhiTarget = Math.max(phiMax, Math.min(phiMin, phiTarget));

    let analyticalProbability;
    if (effectiveTarget >= maxScore) {
        analyticalProbability = 0;
    } else if (effectiveTarget <= minScore) {
        analyticalProbability = 100;
    } else {
        analyticalProbability = truncNormFactor > 1e-25 
            ? ((clampedPhiTarget - phiMax) / truncNormFactor) * 100 
            : empiricalProbability; 
    }
    analyticalProbability = Math.min(100, Math.max(0, analyticalProbability));

    const empMedian = getPercentile(allScores, 0.5);
    const rawLeft = getPercentile(allScores, 0.16);
    const rawRight = getPercentile(allScores, 0.84);

    const finiteEmpiricalProbability = Number.isFinite(bayesEmpiricalProbability) ? bayesEmpiricalProbability : 0;
    const finiteAnalyticalProbability = Number.isFinite(analyticalProbability) ? analyticalProbability : 0;
    const empiricalVsAnalyticalGap = Math.abs(finiteEmpiricalProbability - finiteAnalyticalProbability);
    const lowSimulation = safeSimulations < 1200;
    const highTruncationStress = truncNormFactor < 1e-6;
    const pHat = finiteEmpiricalProbability / 100;
    const empiricalStdErr = Math.sqrt(Math.max(1e-12, (pHat * (1 - pHat)) / Math.max(1, safeSimulations))) * 100;

    // Fusão adaptativa avançada (empírico + analítico):
    // - peso analítico cresce com tamanho amostral efetivo
    // - reduz peso analítico sob truncamento extremo
    // - penaliza divergência alta entre os dois estimadores
    // Fusão adaptativa avançada (empírico + analítico) corrigida:
    const requestedSims = typeof simulations === 'number' && simulations > 200 ? simulations : 5000;
    const dynamicDenom = Math.max(100, requestedSims - 200);

    // [CORREÇÃO MATH-BUG-2] Confiança no Monte Carlo (Empírico)
    const empiricalConfidence = Math.min(1, Math.max(0, (safeSimulations - 200) / dynamicDenom));
    
    const truncationPenalty = highTruncationStress ? 0.55 : 1;
    const uncertaintyScaledGap = empiricalVsAnalyticalGap / Math.max(1, empiricalStdErr * 2.2);
    const disagreementPenalty = Math.max(0.35, 1 - (uncertaintyScaledGap / 6));
    
    // O peso ANALÍTICO deve cair conforme a confiança EMPÍRICA sobe (1 - empiricalConfidence)
    const analyticalWeight = Math.min(0.9, Math.max(0.1, (1 - empiricalConfidence) * truncationPenalty * disagreementPenalty));

    const blendedProbability = (finiteAnalyticalProbability * analyticalWeight)
        + (finiteEmpiricalProbability * (1 - analyticalWeight));
    const recommendedProbability = Math.min(100, Math.max(0, blendedProbability));

    return {
        simulationCount: safeSimulations,
        probability: finiteEmpiricalProbability,
        analyticalProbability: finiteAnalyticalProbability,
        recommendedProbability,
        probabilityPolicy: lowSimulation
            ? 'blended_low_sample_policy'
            : (highTruncationStress ? 'blended_truncated_policy' : 'blended_adaptive_policy'),
        analyticalWeight: Number(analyticalWeight.toFixed(4)),
        empiricalStdErr: Number(empiricalStdErr.toFixed(4)),
        empiricalProbabilityRaw: Number(empiricalProbability.toFixed(4)),
        empiricalProbabilityBayes: Number(finiteEmpiricalProbability.toFixed(4)),
        mean: Number((bayesianCI ? safeMean : displayMean).toFixed(2)),
        // sd = estatístico (não visual), para evitar viés de interpretação
        sd: Number(projectedSD.toFixed(2)),
        // sdVisual reflete o cone após clamp mínimo de UX
        sdVisual: Number(visualSD.toFixed(2)),
        // 📊 ESTATÍSTICA: Nomes alterados para empSigma (Empirical Sigma)
        // Indica a distância real dos quartis P16/P84, respeitando a assimetria da Normal Truncada.
        sdLeft: Number(Math.max(Math.max((maxScore - minScore) * 0.001, 1e-6), empMedian - rawLeft).toFixed(4)),
        sdRight: Number(Math.max(Math.max((maxScore - minScore) * 0.001, 1e-6), rawRight - empMedian).toFixed(4)),
        ci95StatLow: Number(statisticalCi95Low.toFixed(2)),
        ci95StatHigh: Number(statisticalCi95High.toFixed(2)),
        ci95Low: Number(displayLow.toFixed(2)),
        ci95High: Number(displayHigh.toFixed(2)),
        ci95VisualLow: Number(displayLow.toFixed(2)),
        ci95VisualHigh: Number(displayHigh.toFixed(2)),
        ci95VisualClamped: wasVisualCIClamped,
        currentMean: Number((currentMean || safeMean).toFixed(2)),
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allScores, displayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal'
    };
}

export function runMonteCarloAnalysis(inputOrMean, pooledSD, targetScore, options = {}) {
    if (typeof inputOrMean === 'object' && inputOrMean !== null && !Array.isArray(inputOrMean)) {
        const {
            values = [],
            dates = [],
            meta = 0,
            targetScore: objTargetScore,
            simulations = 5000,
            projectionDays = 90,
            forcedVolatility: objForcedVolatility,
            forcedBaseline: objForcedBaseline,
            currentMean: objCurrentMean,
            minScore: objMinScore,
            maxScore: objMaxScore,
        } = inputOrMean;

        const safeDomain = sanitizeDomain(objMinScore, objMaxScore);
        const domainMin = safeDomain.minScore;
        const domainMax = safeDomain.maxScore;
        const rawResolvedTarget = objTargetScore ?? Number(meta || 0);
        const resolvedTarget = clamp(toFiniteNumber(rawResolvedTarget, domainMin), domainMin, domainMax);
        const safeSimulations = sanitizeSimulations(simulations);
        const safeProjectionDays = Math.max(1, Math.floor(toFiniteNumber(projectionDays, 90)));

        const mergedOptions = {
            forcedVolatility: objForcedVolatility,
            forcedBaseline: objForcedBaseline,
            currentMean: objCurrentMean,
            minScore: domainMin,
            maxScore: domainMax,
            ...options,
        };

        const safeDates = dates || [];
        const safeValues = values || [];

        const history = safeValues
            .map((score, index) => ({
                score: Number(score),
                date: safeDates[index] || new Date().toISOString().slice(0, 10)
            }))
            .filter((row) => Number.isFinite(row.score));

        return monteCarloSimulation(history, resolvedTarget, safeProjectionDays, safeSimulations, mergedOptions);
    }

    const safeDomain = sanitizeDomain(options.minScore, options.maxScore);

    return simulateNormalDistribution({
        mean: toFiniteNumber(inputOrMean, 0),
        sd: toFiniteNumber(pooledSD, 0),
        targetScore: clamp(toFiniteNumber(targetScore, safeDomain.minScore), safeDomain.minScore, safeDomain.maxScore),
        simulations: sanitizeSimulations(options.simulations),
        seed: options.seed,
        currentMean: options.currentMean,
        categoryName: options.categoryName,
        bayesianCI: options.bayesianCI,
        minScore: safeDomain.minScore,
        maxScore: safeDomain.maxScore,
        historyLength: (options.history || []).length
    });
}

export default {
    runMonteCarloAnalysis
};
/**
 * Motor Estocástico com Teto Logístico e Heteroscedasticidade
 */
export const runMonteCarloSimulation = (historicoNotas, diasProjecao, totalQuestoesFeitas) => {
    // Extrai última nota e desvio padrão histórico
    const ultimaNota = historicoNotas.length > 0 ? historicoNotas[historicoNotas.length - 1] : 0.5;
    const varianciaBase = 0.05; // 5% de ruído basal
    
    // A volatilidade CAI quanto mais o aluno estuda (Lei dos Grandes Números)
    const volatilidadeAdaptativa = varianciaBase / Math.sqrt(Math.max(totalQuestoesFeitas, 1));
    
    // Parâmetros da curva logística
    const limiteAssintotico = 0.96; // Ninguém tira mais que 96% de forma consistente
    const taxaCrescimento = 0.005; // "Drift" de aprendizado por dia
    
    let simulacoes = [];
    
    // Simular 1000 caminhos possíveis
    for(let sim = 0; sim < 1000; sim++) {
        let caminho = [ultimaNota];
        let notaAtual = ultimaNota;
        
        for(let dia = 1; dia <= diasProjecao; dia++) {
            // Gerador Gaussiano Simples (Box-Muller transform simplificado)
            let u1 = Math.max(1e-9, Math.random());
            let u2 = Math.max(1e-9, Math.random());
            let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            
            let ruido = z0 * volatilidadeAdaptativa;
            
            // Fórmula Logística (S-Curve) impedindo crescimento linear irreal
            // notaAtual = L / (1 + e^(-k*t) * (L - n0)/n0)
            const n0 = Math.max(0.01, ultimaNota);
            const logisticPart = Math.exp(-taxaCrescimento * dia) * ((limiteAssintotico - n0) / n0);
            notaAtual = limiteAssintotico / (1 + logisticPart);
            
            // Adiciona o ruído estocástico respeitando limites físicos
            notaAtual = Math.max(0, Math.min(limiteAssintotico, notaAtual + ruido));
            caminho.push(notaAtual);
        }
        simulacoes.push(caminho);
    }
    
    // Agregação simples para retornar percentis se necessário ou o array completo
    return simulacoes;
};
