import { monteCarloSimulation } from './projection.js';
import { runMonteCarloAnalysis, simulateNormalDistribution } from './monteCarlo.js';
import { resetGaussianCache } from './math/gaussian.ts';

// FIX APLICADO: Remove default parameters para respeitar passagem explícita de `undefined`.
function safeNum(val, fallback) {
    // CORREÇÃO: Se o fallback explícito for undefined, e for passado explicitamente, preservamos esse undefined.
    // Isso é vital para as overrides do motor não caírem acidentalmente para 0 absoluto.
    const hasFallback = arguments.length > 1;
    const cleanFallback = hasFallback ? fallback : 0;
    
    if (val === undefined || val === null) return cleanFallback;
    
    const num = Number(val);
    return Number.isFinite(num) ? num : cleanFallback;
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
    
    // CORREÇÃO: Removemos a limpeza global indiscriminada que causava colisões 
    // entre promessas paralelas de disciplinas distintas. O reset agora é contido.
    if (typeof resetGaussianCache === 'function') {
        resetGaussianCache(); 
    }
    
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
                    forcedVolatility: input.forcedVolatility !== undefined ? safeNum(input.forcedVolatility, 0) : undefined,
                    forcedBaseline: input.forcedBaseline !== undefined ? safeNum(input.forcedBaseline, 0) : undefined,
                    currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, 0) : undefined,
                    minScore: input.minScore !== undefined ? safeNum(input.minScore, 0) : undefined,
                    maxScore: input.maxScore !== undefined ? safeNum(input.maxScore, 100) : undefined,
                    historicalCutoffs: input.historicalCutoffs !== undefined ? (Array.isArray(input.historicalCutoffs) ? input.historicalCutoffs.map(Number).filter(Number.isFinite) : []) : undefined,
                    flashcardImmunity: input.flashcardImmunity !== undefined ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                };
                result = runMonteCarloAnalysis(sanitizedInput);
            } else if (Array.isArray(payload.inputOrMean)) {
                const hist = sanitizeHistory(payload.inputOrMean);
                const options = sanitizeOptions(payload.options);
                const sanitizedInput = {
                    values: hist.map(h => typeof h === 'object' ? h.score : h),
                    dates: hist.map(h => typeof h === 'object' ? h.date : ''),
                    targetScore: safeNum(payload.targetScore, 0),
                    projectionDays: safeNum(payload.projectionDays, 90),
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
                    historicalCutoffs: options.historicalCutoffs,
                    flashcardImmunity: options.flashcardImmunity
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
                unclampedLow: payload.bayesianCI.unclampedLow !== undefined ? safeNum(payload.bayesianCI.unclampedLow, 0) : undefined,
                unclampedHigh: payload.bayesianCI.unclampedHigh !== undefined ? safeNum(payload.bayesianCI.unclampedHigh, 100) : undefined,
                n: payload.bayesianCI.n !== undefined ? safeNum(payload.bayesianCI.n, 1) : undefined,
            } : undefined;

            const sanitizedSubjects = Array.isArray(payload.subjects)
                ? payload.subjects.map(s => ({
                    name: s?.name ? String(s.name) : undefined,
                    mean: safeNum(s?.mean, 0),
                    sd: Math.max(0.01, safeNum(s?.sd, 1)), // Piso de proteção contra desvio zero
                    minCutoff: safeNum(s?.minCutoff, 0),
                    maxScore: safeNum(s?.maxScore, 100),
                    minScore: safeNum(s?.minScore, 0),
                    immunityFactor: safeNum(s?.immunityFactor, 1.0)
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
                flashcardImmunity: payload.flashcardImmunity !== undefined ? safeNum(payload.flashcardImmunity, 1.0) : undefined,
            });
        } else {
            self.postMessage({ id, type: 'error', error: `Tipo de mensagem desconhecido: ${type}` });
            return;
        }
        self.postMessage({ id, type: 'result', result: sanitizePayloadForWorker(result) });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ id, type: 'error', error: errorMessage });
    }
};

// PATCH 3: Prevenir falhas silenciosas do algoritmo de Structured Clone
function sanitizePayloadForWorker(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (Number.isNaN(value)) return null; 
        if (value === Number.POSITIVE_INFINITY) return Number.MAX_VALUE;
        if (value === Number.NEGATIVE_INFINITY) return -Number.MAX_VALUE;
        return value;
    }));
}
