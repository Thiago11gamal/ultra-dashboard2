import { mulberry32 } from './random.js';
import { normalCDF_complement, generateKDE, sampleTruncatedNormal, truncatedNormalMean } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };
import { getPercentile } from './math/percentile.js';
import { kahanMean, kahanSum } from './math/kahan.js';
import { generateGaussian } from './math/gaussian.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';

export { getPercentile };

const DEFAULT_SIMULATIONS = 5000;
const MAX_SIMULATIONS = 50000;
const DEFAULT_DOMAIN_MIN = 0;
const DEFAULT_DOMAIN_MAX = 100;

// Removido Pool de Memória global estático para garantir thread-safety 
// e concorrência segura em múltiplos workers/chamadas simultâneas.

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
function generateStableSeed(historyCount, categoryName, _targetScore) {
    let h = 2166136261;
    // Extração defensiva para evitar "[object Object]" que colapsa a entropia da semente
    const safeCatId = typeof categoryName === 'object' && categoryName !== null 
        ? String(categoryName.id || categoryName.name || 'global') 
        : String(categoryName || 'global');
    
    const seedStr = `${historyCount}-${safeCatId}`;
    
    for(let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI, historyLength = 0) {
    let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
    let minScore = DEFAULT_DOMAIN_MIN;
    let maxScore = DEFAULT_DOMAIN_MAX;
    // BUG-FIX: Moved to outer scope so they are accessible in the simulation loop
    // regardless of whether meanOrObj is an object or a number.
    let subjects = [];
    let historicalCutoffs = [];

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
        subjects = meanOrObj.subjects ?? [];
        historicalCutoffs = meanOrObj.historicalCutoffs ?? [];
    }

    const safeDomain = sanitizeDomain(minScore, maxScore);
    minScore = safeDomain.minScore;
    maxScore = safeDomain.maxScore;

    const safeMean = Number.isFinite(mean) ? mean : 0;
    const hasExplicitDeterministicSD = Number.isFinite(sd) && sd <= 0;
    let safeSD = Number.isFinite(sd) && sd > 0 ? sd : 0; 

    // FIX: Unificar a inferência do SD nos dois caminhos
    if (bayesianCI) {
        // SD SQUASH (Fix): Usar os limites NÃO truncados para inferir o SD real.
        // Se usarmos ciHigh truncado em 100, o SD será subestimado para alunos de elite.
        const high = bayesianCI.unclampedHigh !== undefined ? bayesianCI.unclampedHigh : bayesianCI.ciHigh;
        const low = bayesianCI.unclampedLow !== undefined ? bayesianCI.unclampedLow : bayesianCI.ciLow;
        
        if (high !== undefined && low !== undefined) {
            // CORREÇÃO: Usar o mesmo T-Multiplier dinâmico que gerou o CI, em vez da constante estática 3.92
            const effectiveN = bayesianCI.n || Math.max(1, historyLength);
            const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });
            
            let inferredSD = (high - low) / (tMultiplier * 2);
            const distToBoundary = Math.min(safeMean - minScore, maxScore - safeMean);
 
            // Se a média estiver muito próxima do limite (0 ou 100), o intervalo de 95% 
            // fica comprimido. Inflamos o SD para refletir a incerteza real.
            if (Number.isFinite(inferredSD) && inferredSD >= 1e-10) {
                if (distToBoundary < inferredSD * 1.5) {
                    const correctionFactor = 1 + (1 - distToBoundary / (inferredSD * 1.5));
                    inferredSD *= Math.min(1.5, correctionFactor);
                }
            }
            if (Number.isFinite(inferredSD) && inferredSD > 0) {
                safeSD = inferredSD;
            }
        }
    }
 
    // O PULO DO GATO: Shrinkage Bayesiano para safeSD (Bug 1 Fix)
    // Se temos um histórico curto, não podemos confiar em SD=0.
    if (!hasExplicitDeterministicSD && historyLength < 15) {
        const floorVolatility = maxScore * 0.04;
        const confidence = historyLength / 15;
        safeSD = (safeSD * confidence) + (floorVolatility * (1 - confidence));
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
            currentMean: Number((currentMean ?? safeMean).toFixed(2)),
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                // BUGFIX VISUAL: Adicionada a chave 'density' para evitar quebra do Recharts
                safeMean > minScore ? { x: safeMean - 0.1, y: 0, density: 0 } : null,
                { x: safeMean, y: 1, density: 1 },
                safeMean < maxScore ? { x: safeMean + 0.1, y: 0, density: 0 } : null
            ].filter(Boolean), 
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

    // Instanciação local para garantir thread-safety e evitar data races
    const allScores = new Float64Array(safeSimulations);

    // CORREÇÃO MATEMÁTICA: Compensação Exata da Média da Normal Truncada
    // Substitui a heurística de repulsão exponencial pela fórmula analítica exata:
    // E[X] = μ + σ·(φ(α) - φ(β))/(Φ(β) - Φ(α))
    // Isso garante que a média empírica das simulações convirja para o valor correto
    // em todos os cenários (bordas, centro, qualquer escala).
    //
    // Para o cálculo ANALÍTICO da probabilidade, usamos safeMean diretamente (sem
    // compensação), pois a fórmula da P(X ≥ target) na Normal Truncada já é exata.
    // A compensação de muParam só serve para a amostragem (onde precisamos deslocar
    // μ para que as amostras tenham E[X] = safeMean após truncagem).
    let muParam = safeMean;
    
    if (safeSD > 0) {
        // Calcular a média real que a Normal Truncada produziria com μ = safeMean
        const expectedTruncMean = truncatedNormalMean(safeMean, safeSD, minScore, maxScore);
        // O viés introduzido pela truncagem
        const truncationBias = expectedTruncMean - safeMean;
        // Compensar: se a truncagem puxa a média para cima, desloco μ para baixo
        muParam = safeMean - truncationBias;
    }

    // FEATURE 2: Preparar distribuição de cortes históricos se houver
    let cutoffsMean = 0;
    let cutoffsSD = 0;
    const hasCutoffs = Array.isArray(historicalCutoffs) && historicalCutoffs.length > 0;
    if (hasCutoffs) {
        // BUG-8 FIX: Usar acumulador explícito com initial value 0 para evitar
        // que o primeiro elemento (potencialmente string) seja usado como seed.
        const numericCutoffs = historicalCutoffs.map(v => Number(v)).filter(Number.isFinite);
        if (numericCutoffs.length > 0) {
            cutoffsMean = numericCutoffs.reduce((acc, v) => acc + v, 0) / numericCutoffs.length;
            if (numericCutoffs.length > 1) {
                cutoffsSD = Math.sqrt(
                    numericCutoffs.reduce((acc, v) => acc + Math.pow(v - cutoffsMean, 2), 0) / (numericCutoffs.length - 1)
                );
            } else {
                cutoffsSD = cutoffsMean * 0.05; // 5% default SD
            }
        }
    }

    for (let i = 0; i < safeSimulations; i++) {
        let currentTarget = effectiveTarget;
        if (hasCutoffs) {
            // Sorteio inteligente do cutoff usando a distribuição dos cortes históricos
            currentTarget = sampleTruncatedNormal(cutoffsMean, cutoffsSD, minScore, maxScore, rng);
        }

        let score = sampleTruncatedNormal(muParam, safeSD, minScore, maxScore, rng);
        
        let passedMins = true;
        if (subjects && subjects.length > 0) {
            for (let j = 0; j < subjects.length; j++) {
                const s = subjects[j];
                if (s.minCutoff > 0) {
                    const sScore = sampleTruncatedNormal(s.mean, s.sd, minScore, maxScore, rng);
                    if (sScore < s.minCutoff) {
                        passedMins = false;
                        break;
                    }
                }
            }
        }
        
        if (score >= currentTarget && passedMins) success++;
        allScores[i] = score;

        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (score - welfordMean);
    }

    const projectedMean = welfordMean;
    const projectedSD = Math.sqrt(Math.max(0, welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0));

    // MELHORIA-3: Ordenação única em vez de 5× quickSelect (que criava 5 cópias de Float64Array).
    // Para N=5000, isso reduz de ~125KB de alocações para ~40KB (1 cópia ordenada).
    // A ordenação nativa de Float64Array usa radix sort no V8 (O(N)), tão rápida quanto quickSelect.
    const sortedScores = new Float64Array(allScores);
    sortedScores.sort();
    
    const nAll = sortedScores.length;
    const iLow = Math.min(Math.floor((nAll - 1) * 0.025), nAll - 1);
    const iHigh = Math.min(Math.floor((nAll - 1) * 0.975), nAll - 1);
    const iMedian = Math.min(Math.floor((nAll - 1) * 0.5), nAll - 1);
    const i16 = Math.min(Math.floor((nAll - 1) * 0.16), nAll - 1);
    const i84 = Math.min(Math.floor((nAll - 1) * 0.84), nAll - 1);

    // Leitura direta por índice do array já ordenado (O(1) cada)
    const statisticalCi95Low = sortedScores[iLow];
    const statisticalCi95High = sortedScores[iHigh];
    const empMedian = sortedScores[iMedian];
    const rawLeft = sortedScores[i16];
    const rawRight = sortedScores[i84];

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
    // BUG-AUDIT-10 FIX: Usar o T-multiplier dinâmico em vez do hardcode 3.92 (=2×1.96).
    // Para N pequeno o CI usa T(df) >> 1.96, e dividir por 3.92 inflava o SD visual ~3x.
    const effectiveNForSD = Math.max(1, historyLength || 1);
    const tMultiplierForSD = getConfidenceMultiplier(effectiveNForSD, { allowFractional: true });
    const visualSD = wasVisualCIClamped
        ? (rawHigh - rawLow) / (tMultiplierForSD * 2) 
        : projectedSD;

    // CORREÇÃO: A probabilidade analítica usa safeMean (não muParam) para consistência.
    // muParam é deslocado para compensar o viés de truncagem na AMOSTRAGEM,
    // mas a fórmula analítica P(X ≥ target | X ∈ [min,max]) usa μ original.
    const phiMin    = normalCDF_complement((minScore - safeMean) / safeSD); 
    const phiMax    = normalCDF_complement((maxScore - safeMean) / safeSD); 
    const phiTarget = normalCDF_complement((effectiveTarget - safeMean) / safeSD); 
    
    // CORREÇÃO: Prevenir a anulação catastrófica (Underflow) em caudas severamente truncadas,
    // garantindo que a matemática analítica sobrevive a amostras estatisticamente extremas.
    const rawTruncNormFactor = phiMin - phiMax;
    const isUnderflowStress = rawTruncNormFactor < 1e-15;
    
    let truncNormFactor = rawTruncNormFactor;
    if (isUnderflowStress) {
        // Adiciona escape empírico absoluto: se a variância convergir para zero na borda,
        // força um fator nominal e delega a decisão para o motor empírico de Monte Carlo
        const zScoreMin = safeSD > 0 ? (minScore - muParam) / safeSD : 0;
        const extremeFactor = Math.exp(-0.5 * zScoreMin * zScoreMin) / (Math.abs(zScoreMin) + 1e-6);
        truncNormFactor = Number.isFinite(extremeFactor) && extremeFactor > 1e-15 ? extremeFactor : 1e-6;
    }
    const clampedPhiTarget = Math.max(phiMax, Math.min(phiMin, phiTarget));

    let analyticalProbability;
    if (effectiveTarget >= maxScore) {
        analyticalProbability = 0;
    } else if (effectiveTarget <= minScore) {
        analyticalProbability = 100;
    } else {
        // CORREÇÃO: Se houve stress de underflow (valores atómicos irreais),
        // abdicamos do integral analítico para não gerar falsos Zeros (0/1e-15)
        // e confiamos 100% no motor de Monte Carlo bruto (Empírico).
        analyticalProbability = isUnderflowStress 
            ? empiricalProbability 
            : ((clampedPhiTarget - phiMax) / truncNormFactor) * 100; 
    }
    const finalAnalyticalProbability = analyticalProbability;

    const finiteEmpiricalProbability = Number.isFinite(bayesEmpiricalProbability) ? bayesEmpiricalProbability : 0;
    const finiteAnalyticalProbability = Number.isFinite(finalAnalyticalProbability) ? finalAnalyticalProbability : 0;
    const empiricalVsAnalyticalGap = Math.abs(finiteEmpiricalProbability - finiteAnalyticalProbability);
    const lowSimulation = safeSimulations < 1200;
    const highTruncationStress = truncNormFactor < 1e-6;
    const pHat = finiteEmpiricalProbability / 100;
    const empiricalStdErr = Math.sqrt(Math.max(1e-12, (pHat * (1 - pHat)) / Math.max(1, safeSimulations))) * 100;

    // [AUDIT-FIX-03] Fusão adaptativa avançada (empírico + analítico):
    // O "Padrão Ouro" para confiança total no Monte Carlo de cauda é alto.
    const GOLD_STANDARD_SIMS = 15000;

    // Confiança varia suavemente dependendo do volume real processado frente ao Padrão Ouro
    const empiricalConfidence = Math.min(1, Math.max(0, safeSimulations / GOLD_STANDARD_SIMS));
    
    const truncationPenalty = highTruncationStress ? 0.55 : 1;
    const uncertaintyScaledGap = empiricalVsAnalyticalGap / Math.max(1, empiricalStdErr * 2.2);
    const disagreementPenalty = Math.max(0.35, 1 - (uncertaintyScaledGap / 6));
    
    // O peso ANALÍTICO responde verdadeiramente ao poder computacional:
    // cai conforme a confiança EMPÍRICA sobe.
    const analyticalWeight = Math.min(0.9, Math.max(0.05, (1 - empiricalConfidence) * truncationPenalty * disagreementPenalty));

    const blendedProbability = (finiteAnalyticalProbability * analyticalWeight)
        + (finiteEmpiricalProbability * (1 - analyticalWeight));
    const recommendedProbability = blendedProbability;

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
        currentMean: Number((currentMean ?? safeMean).toFixed(2)),
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
            subjects: objSubjects,
            historicalCutoffs: objHistoricalCutoffs,
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
            subjects: objSubjects,
            historicalCutoffs: objHistoricalCutoffs,
            ...options,
        };

        const safeDates = dates || [];
        const safeValues = values || [];

        const history = safeValues
            .map((score, index) => {
                // Impede que null, arrays vazios ou strings vazias se transformem no número 0
                const isNuloOuVazio = score === null || score === undefined || String(score).trim() === '';
                return {
                    score: isNuloOuVazio ? NaN : Number(score),
                    date: safeDates[index] || new Date().toISOString().slice(0, 10)
                };
            })
            .filter((row) => Number.isFinite(row.score));

        return monteCarloSimulation(history, resolvedTarget, safeProjectionDays, safeSimulations, mergedOptions);
    }

    if (Array.isArray(inputOrMean)) {
        // EvolutionChart sends: runAnalysis(hist, targetScore, projectDays, options)
        const hist = inputOrMean;
        const actualTargetScore = pooledSD;
        const projectDays = targetScore;
        return monteCarloSimulation(hist, actualTargetScore, projectDays, options.simulations || 5000, options);
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
        historyLength: (options.history || []).length,
        subjects: options.subjects,
        historicalCutoffs: options.historicalCutoffs
    });
}

export default {
    runMonteCarloAnalysis
};
/**
 * Motor Estocástico com Teto Logístico e Heteroscedasticidade
 */
export const runMonteCarloSimulation = (historicoNotas, diasProjecao, totalQuestoesFeitas, numSimulations = 1000) => {
    const ultimoRegisto = historicoNotas.length > 0 ? historicoNotas[historicoNotas.length - 1] : 0.5;
    // Forçar extração numérica segura do objeto, ou manter o valor se já for numérico
    const ultimaNota = typeof ultimoRegisto === 'object' && ultimoRegisto !== null 
        ? Number(ultimoRegisto.score || 0) 
        : Number(ultimoRegisto);
    
    // [CORREÇÃO] Em vez de olhar apenas para a última nota, procurar no histórico inteiro (Bug 1.2 Fix)
    // Se o aluno obteve 0 na última prova, o motor não pode assumir que o exame vale 1.0.
    const picoHistorico = historicoNotas.reduce((max, reg) => {
        const val = typeof reg === 'object' && reg !== null ? Number(reg.score || 0) : Number(reg);
        return Math.max(max, val);
    }, 0);
    
    // CORREÇÃO: Triagem heurística adaptável que suporta escalas de faculdade [0 a 10]
    let escala = 100;
    if (picoHistorico <= 1.0 && picoHistorico > 0) {
        escala = 1.0;
    } else if (picoHistorico > 1.0 && picoHistorico <= 10.0) {
        // Se todas as notas na vida do aluno couberem entre 0 e 10, protege a curva de saltar para 100.
        escala = 10;
    } else if (picoHistorico === 0) {
        escala = 100; // Ignorância máxima
    }
    
    const varianciaBase = 0.05 * escala; 
    
    const volatilidadeAdaptativa = varianciaBase / Math.sqrt(Math.max(totalQuestoesFeitas, 1));
    
    // Limite superior adaptativo que respeita notas altíssimas reais sem prender no 1 artificial
    const limiteAssintotico = Math.max(0.96 * escala, Math.min(escala, ultimaNota * 1.05)); 
    const taxaCrescimento = 0.005; 
    
    let simulacoes = [];
    const n0 = Math.max(0.01 * escala, ultimaNota);
    
    const stableSeed = generateStableSeed(historicoNotas.length, "monteCarloSimulation", totalQuestoesFeitas);
    const rng = mulberry32(stableSeed);

    // [BUG-1A FIX] Pré-calcular o drift logístico fora do loop de simulações (determinístico)
    const driftsDiarios = new Float64Array(diasProjecao + 1);
    const mediasDiarias = new Float64Array(diasProjecao + 1);
    for (let d = 1; d <= diasProjecao; d++) {
        const logisticaOntem = limiteAssintotico / (1 + Math.exp(-taxaCrescimento * (d - 1)) * ((limiteAssintotico - n0) / n0));
        const logisticaHoje  = limiteAssintotico / (1 + Math.exp(-taxaCrescimento * d) * ((limiteAssintotico - n0) / n0));
        driftsDiarios[d] = logisticaHoje - logisticaOntem;
        mediasDiarias[d] = logisticaHoje;
    }
    
    // [BUG-3 & 4 FIX] Injetar Memória Estocástica (AR-1) e Absorção Fria (Piso/Teto)
    const PHI_AR1 = 0.35; // 35% do choque de ontem se transfere para hoje

    const safeNumSim = Math.max(100, Math.min(MAX_SIMULATIONS, Math.floor(numSimulations) || 1000));
    for(let sim = 0; sim < safeNumSim; sim++) {
        let caminho = [ultimaNota];
        let notaAtual = ultimaNota;
        let previousShock = 0; 
        
        for(let dia = 1; dia <= diasProjecao; dia++) {
            const z0 = generateGaussian(rng);
            
            // 1. Inércia Cognitiva (Processo AR-1 Verdadeiro)
            // CORREÇÃO: Escalar o ruído de inovação para preservar a variância incondicional.
            // Sem isto, a variância final seria inflacionada em (1 / (1 - PHI^2)).
            const ar1Correction = Math.sqrt(1 - Math.pow(PHI_AR1, 2));
            const pureNoise = (z0 * volatilidadeAdaptativa) * ar1Correction;
            
            // O choque efetivo soma o ruído de hoje com a inércia de ontem
            const effectiveShock = pureNoise + (PHI_AR1 * previousShock);
            
            const driftDiario = driftsDiarios[dia];
            
            // 2. Absorção Fria (Piso e Teto Físicos) e Gravidade
            let effectiveDrift = driftDiario;
            let currentVolatility = volatilidadeAdaptativa;
            
            // CORREÇÃO: Âncora de estabilização estocástica (Ornstein-Uhlenbeck simplificado).
            // Impede que o desvio padrão cresça indefinidamente sob a raiz do tempo.
            const forcaGravitacional = 0.05 * (mediasDiarias[dia] - notaAtual);
            effectiveDrift += forcaGravitacional;

            if (notaAtual <= (0.05 * escala) && driftDiario < 0) {
                effectiveDrift = driftDiario * 0.1; // O Drift afunda contra o chão
                currentVolatility = volatilidadeAdaptativa * (notaAtual / (0.05 * escala)); // Volatilidade cai a zero
            } else if (notaAtual >= (0.95 * escala) && driftDiario > 0) {
                effectiveDrift = driftDiario * 0.1;
                currentVolatility = volatilidadeAdaptativa * ((escala - notaAtual) / (0.05 * escala));
            }

            // OTIMIZAÇÃO: Comprimir o ruído à medida que a nota se aproxima do teto logístico
            const margemTeto = Math.max(0, limiteAssintotico - notaAtual); 
            const compressaoRuido = 1 - Math.exp(-5 * (margemTeto / escala));
            const ruidoAjustado = effectiveShock * Math.max(0.1, compressaoRuido) * (currentVolatility / volatilidadeAdaptativa);
            
            previousShock = ruidoAjustado; // ← memória do choque realmente aplicado
            
            notaAtual = Math.max(0, Math.min(limiteAssintotico, notaAtual + effectiveDrift + ruidoAjustado));
            caminho.push(notaAtual);
        }
        simulacoes.push(caminho);
    }
    
    return simulacoes;
};

/**
 * Interface simplificada para Backtesting e Regressão
 * Suporta o formato do teste coach-math-regressions.test.js
 */
export function simularMonteCarlo(metricas, simulacoes = 1000) {
    if (metricas && metricas.volumeSemanasAnteriores) {
        const history = metricas.volumeSemanasAnteriores;
        if (!history || history.length === 0) return { p50: 0, p10: 0, p90: 0 };
        
        const avgVal = kahanMean(history);
        // CORREÇÃO: Impedir SD = 0 que corrompe o gerador de Monte Carlo
        const sd = metricas.focoMedio 
            ? Math.max(1e-5, (1 - metricas.focoMedio) * avgVal) 
            : avgVal * 0.1;
        
        const results = new Float64Array(simulacoes);
        const histHash = metricas.volumeSemanasAnteriores
            ? kahanSum(metricas.volumeSemanasAnteriores.map((v, i) => v * (i + 1)))
            : 0;
        const rng = mulberry32(generateStableSeed(history.length, "simularMC", histHash)); 

        const maxScore = metricas.maxScore || 100;
        const minScore = metricas.minScore || 0;

        for (let i = 0; i < simulacoes; i++) {
            // SUBSTITUIÇÃO: Remoção do while loop amador. Uso da matemática correta para Normal Truncada.
            results[i] = sampleTruncatedNormal(avgVal, sd, minScore, maxScore, rng);
        }
        
        // MELHORIA-5: Ordenação única em vez de 3× quickSelect com .slice()
        // Cada .slice() em Float64Array criava uma cópia; agora 1 sort + 3 leituras.
        const sorted = new Float64Array(results);
        sorted.sort();
        const i10 = Math.floor(sorted.length * 0.1);
        const i50 = Math.floor(sorted.length * 0.5);
        const i90 = Math.floor(sorted.length * 0.9);

        return {
            p50: sorted[i50],
            p10: sorted[i10],
            p90: sorted[i90]
        };
    }
    // FALLBACK SEGURO: Preservar o contrato de interface (Object com Quantis) em vez de devolver Array bruto.
    if (!Array.isArray(metricas)) return { p50: 0, p10: 0, p90: 0 };
    const caminhos = runMonteCarloSimulation(metricas, 7, 100);
    const finais = new Float64Array(caminhos.length);
    for(let c = 0; c < caminhos.length; c++) finais[c] = caminhos[c][caminhos[c].length - 1];
    
    // MELHORIA-5: Ordenação única em vez de 3× quickSelect com .slice()
    finais.sort();
    const i10 = Math.floor(finais.length * 0.1);
    const i50 = Math.floor(finais.length * 0.5);
    const i90 = Math.floor(finais.length * 0.9);

    return {
        p50: finais[i50],
        p10: finais[i10],
        p90: finais[i90]
    };
}
