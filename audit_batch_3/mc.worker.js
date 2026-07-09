import { monteCarloSimulation } from './projection.js';
import { runMonteCarloAnalysis, simulateNormalDistribution } from './monteCarlo.js';
import { resetGaussianCache } from './math/gaussian.js';

// FIX APLICADO: Remove default parameters para respeitar passagem explícita de `undefined`.
function safeNum(val, fallback) {
    // Se nenhum fallback foi passado na chamada, usamos 0.
    // Caso contrário, respeitamos o que foi passado, mesmo que seja undefined.
    const fb = arguments.length > 1 ? fallback : 0;
    
    if (val === undefined || val === null) return fb;
    
    const num = Number(val);
    return Number.isFinite(num) ? num : fb;
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.map(h => {
        if (h === null || h === undefined) return null;
        if (typeof h === 'number') {
            return Number.isFinite(h) ? h : 0;
        }
        if (typeof h === 'object') {
            const newH = { ...h };
            if (h.score !== undefined) newH.score = safeNum(h.score, 0);
            if (h.value !== undefined) newH.value = safeNum(h.value, 0);
            if (h.total !== undefined) newH.total = safeNum(h.total, 20);
            if (h.weight !== undefined) newH.weight = safeNum(h.weight, 1.0);
            if (h.difficulty !== undefined) newH.difficulty = safeNum(h.difficulty, 1.0);
            return newH;
        }
        const parsed = Number(h);
        return Number.isFinite(parsed) ? parsed : 0;
    }).filter(v => v !== null && v !== undefined && !Number.isNaN(v));
}

function sanitizeOptions(options) {
    if (!options || typeof options !== 'object') return {};
    const newOpts = { ...options };
    if (options.forcedVolatility !== undefined) newOpts.forcedVolatility = safeNum(options.forcedVolatility, undefined);
    if (options.forcedBaseline !== undefined) newOpts.forcedBaseline = safeNum(options.forcedBaseline, undefined);
    if (options.currentMean !== undefined) newOpts.currentMean = safeNum(options.currentMean, undefined);
    if (options.minScore !== undefined) newOpts.minScore = safeNum(options.minScore, 0);
    if (options.maxScore !== undefined) newOpts.maxScore = safeNum(options.maxScore, 100);
    if (options.historicalCutoffs !== undefined) newOpts.historicalCutoffs = Array.isArray(options.historicalCutoffs) ? options.historicalCutoffs.map(v => safeNum(v, 0)) : [];
    return newOpts;
}

self.onmessage = function(e) {
    const { type, payload, id } = e.data;
    resetGaussianCache(); // Limpar a cache gaussiana ao iniciar um novo ciclo para garantir determinismo
    try {
        let result;
        if (type === 'runMonteCarloAnalysis') {
            if (payload.isObjectCall) {
                const input = payload.input || {};
                const sanitizedInput = {
                    ...input,
                    values: Array.isArray(input.values) ? input.values.map(v => safeNum(v, 0)) : [],
                    dates: Array.isArray(input.dates) ? input.dates.map(String) : [],
                    meta: safeNum(input.meta, 0),
                    targetScore: input.targetScore !== undefined ? safeNum(input.targetScore, 0) : undefined,
                    simulations: safeNum(input.simulations, 5000),
                    projectionDays: safeNum(input.projectionDays, 90),
                    forcedVolatility: input.forcedVolatility !== undefined ? safeNum(input.forcedVolatility, undefined) : undefined,
                    forcedBaseline: input.forcedBaseline !== undefined ? safeNum(input.forcedBaseline, undefined) : undefined,
                    currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, undefined) : undefined,
                    minScore: input.minScore !== undefined ? safeNum(input.minScore, 0) : undefined,
                    maxScore: input.maxScore !== undefined ? safeNum(input.maxScore, 100) : undefined,
                    historicalCutoffs: input.historicalCutoffs !== undefined ? (Array.isArray(input.historicalCutoffs) ? input.historicalCutoffs.map(Number).filter(Number.isFinite) : []) : undefined,
                };
                result = runMonteCarloAnalysis(sanitizedInput);
            } else if (Array.isArray(payload.inputOrMean)) {
                const hist = sanitizeHistory(payload.inputOrMean);
                const options = sanitizeOptions(payload.options);
                const sanitizedInput = {
                    values: hist.map(h => typeof h === 'object' ? h.score : h),
                    dates: hist.map(h => typeof h === 'object' ? h.date : ''),
                    targetScore: safeNum(payload.pooledSD, 0),
                    projectionDays: safeNum(payload.targetScore, 90),
                    ...options
                };
                result = runMonteCarloAnalysis(sanitizedInput);
            } else {
                const options = sanitizeOptions(payload.options);
                result = simulateNormalDistribution({
                    mean: safeNum(payload.inputOrMean, 0),
                    sd: safeNum(payload.pooledSD, 0),
                    targetScore: safeNum(payload.targetScore, 0),
                    simulations: safeNum(options.simulations, 5000),
                    seed: options.seed,
                    currentMean: options.currentMean,
                    categoryName: options.categoryName,
                    bayesianCI: options.bayesianCI,
                    minScore: safeNum(options.minScore, 0),
                    maxScore: safeNum(options.maxScore, 100),
                    historyLength: (options.history || []).length,
                    subjects: options.subjects,
                    historicalCutoffs: options.historicalCutoffs
                });
            }
        } else if (type === 'monteCarloSimulation') {
            const history = sanitizeHistory(payload.history);
            const targetScore = safeNum(payload.targetScore, 0);
            const projectionDays = safeNum(payload.projectionDays, 30);
            const simulations = safeNum(payload.simulations, 5000);
            const options = sanitizeOptions(payload.options);
            result = monteCarloSimulation(history, targetScore, projectionDays, simulations, options);
        } else if (type === 'simulateNormalDistribution') {
            const mean = safeNum(payload.mean, 0);
            const sd = safeNum(payload.sd, 0);
            const targetScore = safeNum(payload.targetScore, 0);
            const simulations = safeNum(payload.simulations, 5000);
            const seed = payload.seed !== undefined ? safeNum(payload.seed, undefined) : undefined;
            const currentMean = payload.currentMean !== undefined ? safeNum(payload.currentMean, undefined) : undefined;
            const categoryName = payload.categoryName ? String(payload.categoryName) : undefined;
            const minScore = safeNum(payload.minScore, 0);
            const maxScore = safeNum(payload.maxScore, 100);
            
            const bayesianCI = payload.bayesianCI ? {
                ciLow: safeNum(payload.bayesianCI.ciLow, 0),
                ciHigh: safeNum(payload.bayesianCI.ciHigh, 100),
                unclampedLow: payload.bayesianCI.unclampedLow !== undefined ? safeNum(payload.bayesianCI.unclampedLow, undefined) : undefined,
                unclampedHigh: payload.bayesianCI.unclampedHigh !== undefined ? safeNum(payload.bayesianCI.unclampedHigh, undefined) : undefined,
                n: payload.bayesianCI.n !== undefined ? safeNum(payload.bayesianCI.n, 1) : undefined,
            } : undefined;

            // BUG-FIX: Sanitize subjects array to prevent NaN/Infinity from corrupting the simulation.
            const sanitizedSubjects = Array.isArray(payload.subjects)
                ? payload.subjects.map(s => ({
                    name: s?.name ? String(s.name) : undefined,
                    mean: safeNum(s?.mean, 0),
                    sd: Math.max(0, safeNum(s?.sd, 1)),
                    minCutoff: safeNum(s?.minCutoff, 0),
                    maxScore: safeNum(s?.maxScore, 100),
                    minScore: safeNum(s?.minScore, 0)
                }))
                : undefined;

            result = simulateNormalDistribution({
                mean,
                sd,
                targetScore,
                simulations,
                seed,
                currentMean,
                categoryName,
                bayesianCI,
                minScore,
                maxScore,
                historyLength: safeNum(payload.historyLength, 0),
                subjects: sanitizedSubjects,
                historicalCutoffs: payload.historicalCutoffs !== undefined ? (Array.isArray(payload.historicalCutoffs) ? payload.historicalCutoffs.map(Number).filter(Number.isFinite) : []) : undefined,
            });
        } else {
            self.postMessage({ id, type: 'error', error: `Tipo de mensagem desconhecido: ${type}` });
            return;
        }
        self.postMessage({ id, type: 'result', result });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ id, type: 'error', error: errorMessage });
    }
};
