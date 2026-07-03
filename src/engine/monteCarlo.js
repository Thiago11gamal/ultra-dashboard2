import { mulberry32 } from './random.js';
import { normalCDF_complement, generateKDE, sampleTruncatedNormal, truncatedNormalMean, ensurePositiveSemiDefinite, choleskyDecomposition, applyCovariance } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };
import { getPercentile } from './math/percentile.js';
import { kahanMean, kahanSum } from './math/kahan.js';
import { generateGaussian } from './math/gaussian.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getDateKey } from '../utils/dateHelper.js';
export { getPercentile };

const DEFAULT_SIMULATIONS = 5000;
const MAX_SIMULATIONS = 50000;
const TARGET_PROB_SE = 0.008; // Target standard error on pass probability (~0.8%) for adaptive stopping
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

/**
 * NEW: Adaptive simulation count based on desired precision on pass probability.
 * Uses rough variance of Bernoulli to estimate needed N.
 */
export function recommendSimulationCount(targetProb = 0.7, targetSE = TARGET_PROB_SE, minSims = 2000, maxSims = MAX_SIMULATIONS) {
  // p(1-p) max at 0.25
  const p = Math.max(0.05, Math.min(0.95, targetProb));
  const varBernoulli = p * (1 - p);
  const needed = Math.ceil(varBernoulli / (targetSE * targetSE));
  return clamp(needed, minSims, maxSims);
}

// CORREÇÃO VISUAL E MATEMÁTICA: Geração de semente estável (FNV-1a Hash)
// Ancoramos a semente na volumetria e topologia do histórico, não na flutuação da média.
function generateStableSeed(historyCount, categoryName, _targetScore) {
    let h = 2166136261;
    // Extração defensiva
    const safeCatId = typeof categoryName === 'object' && categoryName !== null 
        ? String(categoryName.id || categoryName.name || 'global') 
        : String(categoryName || 'global');
    
    // CORREÇÃO B1: Injetar efetivamente o _targetScore (o histHash) na geração da semente
    const safeTarget = _targetScore !== undefined ? _targetScore : 0;
    const seedStr = `${historyCount}-${safeCatId}-${safeTarget}`;
    
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
    // NEW: auto-adapt number of simulations for better convergence when not explicitly provided
    if (!meanOrObj?.simulations && !simulations) {
      const roughProb = Math.max(0.1, Math.min(0.9, (currentMean || mean || 70) / 100));
      simulations = recommendSimulationCount(roughProb);
    }
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
 
    // O PULO DO GATO: Shrinkage Bayesiano para safeSD
    // BUG-FIX #4: Only apply shrinkage to empirical SD, not to provided bayesianCI
    if (!hasExplicitDeterministicSD && historyLength < 15 && !bayesianCI) {
        // Volatilidade baseia-se na amplitude (Max - Min)
        const rangeMassa = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
        const floorVolatility = rangeMassa * 0.04;
        
        // Use gentler shrinkage curve: 8 samples instead of 15
        const confidence = Math.min(1, historyLength / 8);
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
            // FIX #2: Retornar valores com precisão completa (formatação só na UI)
            mean: safeMean,
            sd: 0,
            sdVisual: 0,
            sdLeft: 0, 
            sdRight: 0, 
            ci95StatLow: safeMean,
            ci95StatHigh: safeMean,
            ci95Low: safeMean,
            ci95High: safeMean,
            ci95VisualLow: safeMean,
            ci95VisualHigh: safeMean,
            ci95VisualClamped: false,
            currentMean: (currentMean ?? safeMean),
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
    // FIX 4: Busca Binária (Binary Search) para convergência exata da Média Truncada.
    // Corrige o desvio assimétrico nas caudas (perto de 0 ou de 100), garantindo 
    // que a média empírica das simulações bate certo com a safeMean teórica.
    let muParam = safeMean;
    
    if (safeSD > 0) {
        const distMin = safeMean - minScore;
        const distMax = maxScore - safeMean;
        
        // Só aplica o shift computacional pesado se a média estiver a menos de 1.5 Desvios Padrão da borda
        if (distMin < safeSD * 1.5 || distMax < safeSD * 1.5) {
            let muLow = minScore - safeSD * 3;
            let muHigh = maxScore + Math.max(safeSD * 20, (maxScore - minScore) * 2);
            
            // Reduzido de 30 para 8 iterações com tolerância dinâmica (Performance 4x superior)
            for (let iter = 0; iter < 8; iter++) {
                const currentTruncMean = truncatedNormalMean(muParam, safeSD, minScore, maxScore);
                const error = currentTruncMean - safeMean;
                
                if (Math.abs(error) < 0.25) break; 
                
                if (error > 0) muHigh = muParam;
                else muLow = muParam;
                
                muParam = (muLow + muHigh) / 2;
            }
        }
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
            cutoffsMean = kahanSum(numericCutoffs) / numericCutoffs.length;
            if (numericCutoffs.length > 1) {
                const devs = numericCutoffs.map(v => Math.pow(v - cutoffsMean, 2));
                cutoffsSD = Math.sqrt( kahanSum(devs) / (numericCutoffs.length - 1) );
            } else {
                cutoffsSD = cutoffsMean * 0.05; // 5% default SD
            }
        }
    }

    // FIX #3: Prepare Cholesky for correlated subject minCutoffs (when >1 subjects with minCutoff)
    const cutoffSubjects = (subjects || []).filter(s => s && Number(s.minCutoff) > 0);
    let subjectCholesky = null;
    if (cutoffSubjects.length > 1) {
      const stats = cutoffSubjects.map(s => ({ 
          sd: s.sd !== undefined && s.sd !== null ? Number(s.sd) : 1 
      }));
      const adaptiveRhoContext = (meanOrObj?.simuladoRows) 
        ? { simuladoRows: meanOrObj?.simuladoRows, categoryNames: subjects.map(s => s.name || s) } 
        : null;
      const cov = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
      const psdCov = ensurePositiveSemiDefinite(cov);
      subjectCholesky = choleskyDecomposition(psdCov);
    }

    for (let i = 0; i < safeSimulations; i++) {
        let currentTarget = effectiveTarget;
        if (hasCutoffs) {
            // Sorteio inteligente do cutoff usando a distribuição dos cortes históricos
            currentTarget = sampleTruncatedNormal(cutoffsMean, cutoffsSD, minScore, maxScore, rng);
        }

        let score = sampleTruncatedNormal(muParam, safeSD, minScore, maxScore, rng);
        
        let passedMins = true;
        if (cutoffSubjects.length > 0) {
            if (subjectCholesky) {
                // Generate independent standard normals, apply correlation via Cholesky
                const zVec = cutoffSubjects.map(() => generateGaussian(rng));
                const zCorr = applyCovariance(subjectCholesky, zVec);
                for (let j = 0; j < cutoffSubjects.length; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const raw = Number(s.mean) + zCorr[j];
                    
                    // FIX: Replaced folding reflection with Clamping.
                    // Reflection (folding) at the bounds inverts the sign of the correlated variable,
                    // mathematically destroying the covariance matrix (turns positive correlation into negative).
                    const sScore = Math.max(sMin, Math.min(sMax, raw));
                    
                    if (sScore < Number(s.minCutoff)) {
                        passedMins = false;
                        break;
                    }
                }
            } else {
                // fallback: independent sampling (0 or 1 subject)
                for (let j = 0; j < cutoffSubjects.length; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const sScore = sampleTruncatedNormal(s.mean, s.sd, sMin, sMax, rng);
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
    
    // Leitura usando função de percentil interpolada para consistência matemática no sistema
    const statisticalCi95Low = getPercentile(sortedScores, 0.025, true);
    const statisticalCi95High = getPercentile(sortedScores, 0.975, true);
    const empMedian = getPercentile(sortedScores, 0.5, true);
    const rawLeft = getPercentile(sortedScores, 0.16, true);
    const rawRight = getPercentile(sortedScores, 0.84, true);

    let rawLow = statisticalCi95Low;
    let rawHigh = statisticalCi95High;

    const empiricalProbability = (success / safeSimulations) * 100;
    // Suavização Bayesiana (Jeffreys prior) para reduzir ruído em baixa amostra.
    const posteriorAlpha = success + 0.5;
    const posteriorBeta = (safeSimulations - success) + 0.5;
    const bayesEmpiricalProbability = (posteriorAlpha / (posteriorAlpha + posteriorBeta)) * 100;
    const displayMean = bayesianCI ? safeMean : projectedMean;

    // FORÇAR INCERTEZA MÍNIMA: Evitar que o cone colapse num traço liso na UI
    // CORREÇÃO: Usar amplitude real em vez do maxScore absoluto. 
    // Impede que bases acima do zero (ex: Testes SAT 400-1600) criem cones mastodônticos.
    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const MIN_SPREAD = Math.max(0.5, range * 0.005);
    
    // FIX BUG 2: Prender a média visual dentro dos limites da prova
    const clampedDisplayMean = Math.max(minScore, Math.min(maxScore, displayMean));
    
    const wasVisualCIClamped = (rawHigh - rawLow < MIN_SPREAD);
    if (wasVisualCIClamped) {
        const availableSpan = maxScore - minScore;
        
        // BUG-FIX #3: If domain is too small to fit MIN_SPREAD, use full domain
        if (availableSpan < MIN_SPREAD) {
            rawLow = minScore;
            rawHigh = maxScore;
        } else {
            // Try to center on mean first
            rawLow = Math.max(minScore, clampedDisplayMean - MIN_SPREAD / 2);
            rawHigh = Math.min(maxScore, clampedDisplayMean + MIN_SPREAD / 2);
            
            // Adjust if one side hit boundary - ensure MIN_SPREAD is maintained
            if (rawHigh === maxScore && rawLow < maxScore - MIN_SPREAD) {
                rawLow = maxScore - MIN_SPREAD;
            } else if (rawLow === minScore && rawHigh > minScore + MIN_SPREAD) {
                rawHigh = minScore + MIN_SPREAD;
            }
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
        // CORREÇÃO B5: Inserir a raiz quadrada de 2PI no divisor da densidade Normal
        const SQRT_2PI = 2.506628274631;
        const zScoreMin = safeSD > 0 ? (minScore - muParam) / safeSD : 0;
        
        // Aplicação do Rácio de Mill com PDF regularizada
        const pdfNormal = Math.exp(-0.5 * zScoreMin * zScoreMin) / SQRT_2PI;
        const extremeFactor = pdfNormal / (Math.abs(zScoreMin) + 1e-6);
        
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

    // === NEW: Rich Diagnostics for Transparency ===
    const diagnostics = {
      simulationCount: safeSimulations,
      empiricalStdErr: Number(empiricalStdErr.toFixed(3)),
      analyticalWeight: Number(analyticalWeight.toFixed(3)),
      rhoUsed: null, // filled by caller when adaptive
      effectiveN: Math.max(1, historyLength || safeSimulations / 10),
      shrinkageApplied: null, // populated upstream
      volatilitySources: {
        withinSubject: Number(safeSD.toFixed(2)),
        betweenSubjectContribution: 0
      },
      convergence: {
        targetSE: TARGET_PROB_SE,
        achievedSE: Number(empiricalStdErr.toFixed(4)),
        sufficient: empiricalStdErr < TARGET_PROB_SE * 1.5
      },
      policy: lowSimulation ? 'low_sample' : (highTruncationStress ? 'truncated' : 'standard')
    };

    return {
        simulationCount: safeSimulations,
        probability: finiteEmpiricalProbability,
        analyticalProbability: finiteAnalyticalProbability,
        recommendedProbability,
        probabilityPolicy: lowSimulation
            ? 'blended_low_sample_policy'
            : (highTruncationStress ? 'blended_truncated_policy' : 'blended_adaptive_policy'),
        analyticalWeight,
        empiricalStdErr,
        empiricalProbabilityRaw: empiricalProbability,
        empiricalProbabilityBayes: finiteEmpiricalProbability,
        mean: (bayesianCI ? safeMean : displayMean),
        sd: projectedSD,
        sdVisual: visualSD,
        sdLeft: Math.max(Math.max((maxScore - minScore) * 0.001, 1e-6), empMedian - rawLeft),
        sdRight: Math.max(Math.max((maxScore - minScore) * 0.001, 1e-6), rawRight - empMedian),
        ci95StatLow: statisticalCi95Low,
        ci95StatHigh: statisticalCi95High,
        ci95Low: displayLow,
        ci95High: displayHigh,
        ci95VisualLow: displayLow,
        ci95VisualHigh: displayHigh,
        ci95VisualClamped: wasVisualCIClamped,
        currentMean: (currentMean ?? safeMean),
        projectedMean,
        projectedSD,
        kdeData: generateKDE(sortedScores, displayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal',
        // NEW rich transparency
        diagnostics
    };
}

export function runMonteCarloAnalysis(params = {}) {
    // [STAFF-FIX] Unificação Estrita de Contrato: 
    // Remove o anti-pattern de overload de array/number.
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        console.warn("[MC Engine] Fallback acionado. 'runMonteCarloAnalysis' requer objeto. Ignorando chamada bruta.");
        return monteCarloSimulation([], 85, 90, 5000, {});
    }

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
        ...options
    } = params;

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
            const isNuloOuVazio = score === null || score === undefined || String(score).trim() === '';
            return {
                score: isNuloOuVazio ? NaN : Number(score),
                date: safeDates[index] || getDateKey(new Date())
            };
        })
        .filter((row) => Number.isFinite(row.score));

    return monteCarloSimulation(history, resolvedTarget, safeProjectionDays, safeSimulations, mergedOptions);
}

export default {
    runMonteCarloAnalysis
};
// [STAFF-FIX] Removido funções legadas (runMonteCarloSimulation e simularMonteCarlo)
// O sistema agora opera 100% sobre o monteCarloSimulation do projection.js
