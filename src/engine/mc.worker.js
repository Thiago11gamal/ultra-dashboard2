import { monteCarloSimulation } from './projection.js';
import { runMonteCarloAnalysis, simulateNormalDistribution } from './monteCarlo.js';
import { resetGaussianCache } from './math/gaussian.ts';

function safeNum(val, fallback) {
    const hasFallback = arguments.length > 1;
    const cleanFallback = hasFallback ? fallback : 0;

    if (val === undefined || val === null || val === '') return cleanFallback;

    const num = Number(val);
    return Number.isFinite(num) ? num : cleanFallback;
}

function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => ({
        ...s,
        name: s?.name ? String(s.name) : undefined,
        mean: safeNum(s?.mean, 0),
        sd: Math.max(0.01, safeNum(s?.sd, 1)),
        minCutoff: safeNum(s?.minCutoff, 0),
        maxScore: safeNum(s?.maxScore, 100),
        minScore: safeNum(s?.minScore, 0),
        immunityFactor: safeNum(s?.immunityFactor, 1.0)
    }));
}

function sanitizeBayesianCI(ci) {
    if (!ci || typeof ci !== 'object') return undefined;

    const out = {};

    if (ci.ciLow !== undefined) out.ciLow = safeNum(ci.ciLow, 0);
    if (ci.ciHigh !== undefined) out.ciHigh = safeNum(ci.ciHigh, 100);
    if (ci.unclampedLow !== undefined) out.unclampedLow = safeNum(ci.unclampedLow, 0);
    if (ci.unclampedHigh !== undefined) out.unclampedHigh = safeNum(ci.unclampedHigh, 100);
    if (ci.n !== undefined) out.n = safeNum(ci.n, 1);

    return Object.keys(out).length ? out : undefined;
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history.map(h => {
        if (h === null || h === undefined) return null;

        if (typeof h === 'number') {
            return Number.isFinite(h) ? h : null;
        }

        if (typeof h === 'object') {
            const newH = { ...h };

            if (h.score !== undefined) newH.score = safeNum(h.score, NaN);
            if (h.value !== undefined) newH.value = safeNum(h.value, NaN);
            if (h.total !== undefined) newH.total = safeNum(h.total, 20);
            if (h.weight !== undefined) newH.weight = safeNum(h.weight, 1.0);
            if (h.difficulty !== undefined) newH.difficulty = safeNum(h.difficulty, 1.0);

            const hasFiniteScore = Number.isFinite(newH.score) || Number.isFinite(newH.value);
            return hasFiniteScore ? newH : null;
        }

        const parsed = Number(h);
        return Number.isFinite(parsed) ? parsed : null;
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

    if (options.seed !== undefined) newOpts.seed = safeNum(options.seed, undefined);
    if (options.subjects !== undefined) newOpts.subjects = sanitizeSubjects(options.subjects);
    if (options.history !== undefined) newOpts.history = sanitizeHistory(options.history);
    if (options.flashcardImmunity !== undefined) newOpts.flashcardImmunity = safeNum(options.flashcardImmunity, 1.0);
    if (options.bayesianCI !== undefined) newOpts.bayesianCI = sanitizeBayesianCI(options.bayesianCI);
    if (options.simulations !== undefined) newOpts.simulations = safeNum(options.simulations, 5000);

    if (options.historicalCutoffs !== undefined) {
        newOpts.historicalCutoffs = Array.isArray(options.historicalCutoffs)
            ? options.historicalCutoffs.map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0)
            : [];
    }

    return newOpts;
}

self.onmessage = function(e) {
    const { type, payload, id } = e.data;

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
                    // FIX: Mantém o objeto inteiro para não perder metadata (fatigueFlag, weight, difficulty)
                    values: Array.isArray(input.values) ? input.values.map(v => {
                        if (typeof v === 'object' && v !== null) {
                            return { ...v, score: safeNum(v.score ?? v.value, NaN) };
                        }
                        return safeNum(v, NaN);
                    }) : [],
                    dates: Array.isArray(input.dates) ? input.dates.map(d => d == null ? '' : String(d)) : [],
                    meta: safeNum(input.meta, 0),
                    targetScore: input.targetScore !== undefined ? safeNum(input.targetScore, 0) : undefined,
                    simulations: safeNum(input.simulations, 5000),
                    projectionDays: safeNum(input.projectionDays, 90),
                    forcedVolatility: input.forcedVolatility !== undefined ? safeNum(input.forcedVolatility, 0) : undefined,
                    forcedBaseline: input.forcedBaseline !== undefined ? safeNum(input.forcedBaseline, 0) : undefined,
                    currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, 0) : undefined,
                    minScore: input.minScore !== undefined ? safeNum(input.minScore, 0) : undefined,
                    maxScore: input.maxScore !== undefined ? safeNum(input.maxScore, 100) : undefined,
                    historicalCutoffs: input.historicalCutoffs !== undefined
                        ? (Array.isArray(input.historicalCutoffs)
                            ? input.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                            : [])
                        : undefined,
                    flashcardImmunity: input.flashcardImmunity !== undefined ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                    subjects: input.subjects !== undefined ? sanitizeSubjects(input.subjects) : undefined
                };

                result = runMonteCarloAnalysis(sanitizedInput);
            } else if (Array.isArray(payload.inputOrMean)) {
                const hist = sanitizeHistory(payload.inputOrMean);
                const options = sanitizeOptions(payload.options);

                const sanitizedInput = {
                    // FIX: Mantém o objeto inteiro
                    values: hist.map(h => typeof h === 'object' && h !== null ? { ...h, score: (h.score ?? h.value ?? NaN) } : h),
                    dates: hist.map(h => typeof h === 'object' && h !== null ? (h.date ?? '') : ''),
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
            const bayesianCI = sanitizeBayesianCI(payload.bayesianCI);

            const sanitizedSubjects = Array.isArray(payload.subjects)
                ? sanitizeSubjects(payload.subjects)
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
                historicalCutoffs: payload.historicalCutoffs !== undefined
                    ? (Array.isArray(payload.historicalCutoffs)
                        ? payload.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                        : [])
                    : undefined,
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

function sanitizePayloadForWorker(obj) {
    try {
        return JSON.parse(JSON.stringify(obj, (key, value) => {
            if (Number.isNaN(value)) return null;
            if (value === Number.POSITIVE_INFINITY) return Number.MAX_VALUE;
            if (value === Number.NEGATIVE_INFINITY) return -Number.MAX_VALUE;
            return value;
        }));
    } catch {
        return null;
    }
}

export const __workerTesting = {
  safeNum,
  sanitizeHistory,
  sanitizeOptions,
};
