import { monteCarloSimulation } from './projection.js';
import { runMonteCarloAnalysis, simulateNormalDistribution } from './monteCarlo.js';
import { resetGaussianCache } from './math/gaussian.js';

function safeNum(val, fallback) {
    const hasFallback = arguments.length > 1;
    const cleanFallback = hasFallback ? fallback : 0;

    if (val === undefined || val === null || typeof val === 'boolean' || String(val).trim() === '') return cleanFallback;

    const num = Number(val);
    return Number.isFinite(num) ? num : cleanFallback;
}

function safeSeed(val) {
    if (val === undefined || val === null || typeof val === 'boolean') return undefined;
    const str = String(val).trim();
    if (!str) return undefined;
    const num = Number(str);
    return Number.isFinite(num) ? num : str;
}

function sanitizeSubjects(subjects, defaultMin = 0, defaultMax = 100) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => {
        const rawCutoff = s?.minCutoff;
        const hasCutoff = rawCutoff !== null && rawCutoff !== undefined && typeof rawCutoff !== 'boolean' && String(rawCutoff).trim() !== '' && Number.isFinite(Number(rawCutoff));
        return {
            ...s,
            name: s?.name ? String(s.name) : undefined,
            mean: safeNum(s?.mean, 0),
            sd: Math.max(0.01, safeNum(s?.sd, 1)),
            minCutoff: hasCutoff ? Number(rawCutoff) : undefined,
            maxScore: safeNum(s?.maxScore, defaultMax),
            minScore: safeNum(s?.minScore, defaultMin),
            immunityFactor: safeNum(s?.immunityFactor, 1.0),
            weight: safeNum(s?.weight, 1.0)
        };
    });
}

function sanitizeExamGroupCutoffs(cutoffs) {
    if (!cutoffs || typeof cutoffs !== 'object' || Array.isArray(cutoffs)) return undefined;
    const clean = {};
    for (const [grp, val] of Object.entries(cutoffs)) {
        const n = safeNum(val, NaN);
        // D7 FIX: suportar cortes <= 0 (ex.: Cebraspe com piso negativo), alinhado com monteCarlo.js e projection.js
        if (grp && Number.isFinite(n)) {
            clean[String(grp).trim()] = n;
        }
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
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
            if (h.scorePoints !== undefined) newH.scorePoints = safeNum(h.scorePoints, NaN);
            if (h.scorePct !== undefined) newH.scorePct = safeNum(h.scorePct, NaN);
            if (h.total !== undefined) newH.total = safeNum(h.total, 20);
            if (h.weight !== undefined) newH.weight = safeNum(h.weight, 1.0);
            if (h.difficulty !== undefined) newH.difficulty = safeNum(h.difficulty, 1.0);

            const hasFiniteScore =
                Number.isFinite(newH.score) ||
                Number.isFinite(newH.value) ||
                Number.isFinite(newH.scorePoints) ||
                Number.isFinite(newH.scorePct) ||
                (Number.isFinite(Number(h.correct ?? h.acertos ?? h.correctCount)) && Number(newH.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) > 0);
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

    if (options.seed !== undefined) newOpts.seed = safeSeed(options.seed);
    if (options.subjects !== undefined) newOpts.subjects = sanitizeSubjects(options.subjects, newOpts.minScore ?? 0, newOpts.maxScore ?? 100);
    if (options.history !== undefined) newOpts.history = sanitizeHistory(options.history);
    if (options.flashcardImmunity !== undefined) newOpts.flashcardImmunity = safeNum(options.flashcardImmunity, 1.0);
    if (options.bayesianCI !== undefined) newOpts.bayesianCI = sanitizeBayesianCI(options.bayesianCI);
    if (options.simulations !== undefined) newOpts.simulations = safeNum(options.simulations, 5000);

    if (options.historicalCutoffs !== undefined) {
        newOpts.historicalCutoffs = Array.isArray(options.historicalCutoffs)
            ? options.historicalCutoffs
                .filter(v => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '')
                .map(v => Number(v))
                .filter(n => Number.isFinite(n))
            : [];
    }
    if (options.examGroupCutoffs !== undefined) {
        newOpts.examGroupCutoffs = sanitizeExamGroupCutoffs(options.examGroupCutoffs);
    }

    return newOpts;
}

self.onmessage = function (e) {
    const { type, payload, id } = e.data;

    // ✅ PATCH-21: Validação defensiva
    if (!type || !payload) {
        self.postMessage({ id, type: 'error', error: 'Payload inválido' });
        return;
    }

    if (typeof resetGaussianCache === 'function') {
        resetGaussianCache();
    }

    try {
        let result;

        if (type === 'runMonteCarloAnalysis') {
            if (payload.isObjectCall) {
                const input = payload.input || {};

                if (input.mode === 'normal' || (input.mean !== undefined && !Array.isArray(input.values))) {
                    result = simulateNormalDistribution({
                        mean: safeNum(input.mean, 0),
                        sd: safeNum(input.sd, 0),
                        targetScore: safeNum(input.targetScore, 0),
                        simulations: safeNum(input.simulations, 5000),
                        seed: input.seed,
                        currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, 0) : undefined,
                        categoryName: input.categoryName,
                        bayesianCI: sanitizeBayesianCI(input.bayesianCI),
                        minScore: safeNum(input.minScore, 0),
                        maxScore: safeNum(input.maxScore, 100),
                        historyLength: safeNum(input.historyLength, 0),
                        subjects: input.subjects !== undefined ? sanitizeSubjects(input.subjects) : undefined,
                        historicalCutoffs: input.historicalCutoffs !== undefined
                            ? (Array.isArray(input.historicalCutoffs)
                                ? input.historicalCutoffs.map(Number).filter(n => Number.isFinite(n))
                                : [])
                            : undefined,
                        examGroupCutoffs: sanitizeExamGroupCutoffs(input.examGroupCutoffs),
                        flashcardImmunity: input.flashcardImmunity !== undefined ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                        simuladoRows: input.simuladoRows,
                        categoryNames: input.categoryNames,
                    });
                } else {
                    const sanitizedInput = {
                        ...input,
                        // FIX: Mantém o objeto inteiro para não perder metadata (fatigueFlag, weight, difficulty)
                        values: Array.isArray(input.values) ? input.values.map(v => {
                            if (typeof v === 'object' && v !== null) {
                                // D7 FIX: não injetar score: NaN em objetos que só trazem correct/total ou scorePoints
                                if (v.score !== undefined || v.value !== undefined) {
                                    return { ...v, score: safeNum(v.score ?? v.value, NaN) };
                                }
                                return { ...v };
                            }
                            return safeNum(v, NaN);
                        }) : [],
                        dates: Array.isArray(input.dates) ? input.dates.map(d => d == null ? '' : String(d)) : [],
                        meta: safeNum(input.meta, 0),
                        targetScore: input.targetScore != null ? safeNum(input.targetScore, 0) : undefined,
                        simulations: safeNum(input.simulations, 5000),
                        projectionDays: safeNum(input.projectionDays, 90),
                        forcedVolatility: input.forcedVolatility != null ? safeNum(input.forcedVolatility, 0) : undefined,
                        forcedBaseline: input.forcedBaseline != null ? safeNum(input.forcedBaseline, 0) : undefined,
                        currentMean: input.currentMean != null ? safeNum(input.currentMean, 0) : undefined,
                        minScore: input.minScore != null ? safeNum(input.minScore, 0) : undefined,
                        maxScore: input.maxScore != null ? safeNum(input.maxScore, 100) : undefined,
                        historicalCutoffs: input.historicalCutoffs != null
                            ? (Array.isArray(input.historicalCutoffs)
                                ? input.historicalCutoffs.map(Number).filter(n => Number.isFinite(n))
                                : [])
                            : undefined,
                        examGroupCutoffs: sanitizeExamGroupCutoffs(input.examGroupCutoffs),
                        flashcardImmunity: input.flashcardImmunity != null ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                        subjects: input.subjects != null ? sanitizeSubjects(input.subjects) : undefined
                    };

                    result = runMonteCarloAnalysis(sanitizedInput);
                }
            } else if (Array.isArray(payload.inputOrMean)) {
                const hist = sanitizeHistory(payload.inputOrMean);
                const options = sanitizeOptions(payload.options);

                const sanitizedInput = {
                    ...options,
                    // FIX: Mantém o objeto inteiro e protege campos sanitizados contra sobrescrita de options
                    values: hist.map(h => (typeof h === 'object' && h !== null && (h.score !== undefined || h.value !== undefined))
                        ? { ...h, score: (h.score ?? h.value) }
                        : h),
                    dates: hist.map(h => typeof h === 'object' && h !== null ? (h.date ?? h.createdAt ?? '') : ''),
                    targetScore: safeNum(payload.targetScore, 0),
                    projectionDays: safeNum(payload.projectionDays ?? options.projectionDays, 90)
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
                    historyLength: options.historyLength !== undefined ? safeNum(options.historyLength, 0) : (options.history || []).length,
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
            const seed = safeSeed(payload.seed);
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
                        ? payload.historicalCutoffs.map(Number).filter(n => Number.isFinite(n))
                        : [])
                    : undefined,
                flashcardImmunity: payload.flashcardImmunity !== undefined ? safeNum(payload.flashcardImmunity, 1.0) : undefined,
                simuladoRows: payload.simuladoRows,
                categoryNames: payload.categoryNames,
            });
        } else if (type === 'runSubjectBatch') {
            const items = Array.isArray(payload.items) ? payload.items : [];
            const sharedSimuladoRows = Array.isArray(payload.simuladoRows) ? payload.simuladoRows : [];
            const batchOut = [];
            for (let i = 0; i < items.length; i++) {
                const entry = items[i];
                if (!entry || !entry.simKey || !entry.input) continue;
                const inp = entry.input;
                const simRes = simulateNormalDistribution({
                    mean: safeNum(inp.mean, 0),
                    sd: inp.sd !== undefined ? safeNum(inp.sd, 0) : undefined,
                    targetScore: safeNum(inp.targetScore, 0),
                    simulations: safeNum(inp.simulations, 2000),
                    seed: safeSeed(inp.seed),
                    currentMean: inp.currentMean !== undefined ? safeNum(inp.currentMean, undefined) : undefined,
                    categoryName: inp.categoryName ? String(inp.categoryName) : undefined,
                    minScore: safeNum(inp.minScore, 0),
                    maxScore: safeNum(inp.maxScore, 100),
                    flashcardImmunity: inp.flashcardImmunity !== undefined ? safeNum(inp.flashcardImmunity, 1.0) : undefined,
                    historicalCutoffs: Array.isArray(inp.historicalCutoffs)
                        ? inp.historicalCutoffs.map(Number).filter(n => Number.isFinite(n))
                        : undefined,
                    subjects: inp.subjects !== undefined ? sanitizeSubjects(inp.subjects) : undefined,
                    categoryNames: Array.isArray(inp.categoryNames) ? inp.categoryNames.map(String) : undefined,
                    simuladoRows: sharedSimuladoRows,
                    historyLength: safeNum(inp.historyLength, 0),
                    bayesianCI: sanitizeBayesianCI(inp.bayesianCI),
                });
                batchOut.push({ simKey: entry.simKey, result: simRes });
            }
            self.postMessage({ id, type: 'result', result: sanitizePayloadForWorker(batchOut) });
            return;
        } else {
            self.postMessage({ id, type: 'error', error: `Tipo de mensagem desconhecido: ${type}` });
            return;
        }

        // ✅ PATCH-21: Validar resultado antes de enviar
        if (result && typeof result === 'object') {
            if (Number.isFinite(result.probability)) {
                result.probability = Math.max(0, Math.min(100, result.probability));
            }
            if (Number.isFinite(result.mean)) {
                const effectiveMin = Number.isFinite(result.minScore)
                    ? result.minScore
                    : safeNum(payload?.minScore ?? payload?.input?.minScore ?? payload?.options?.minScore, 0);
                const effectiveMax = Number.isFinite(result.maxScore)
                    ? result.maxScore
                    : safeNum(payload?.maxScore ?? payload?.input?.maxScore ?? payload?.options?.maxScore, 100);
                result.mean = Math.max(effectiveMin, Math.min(effectiveMax, result.mean));
            }
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
    sanitizeSubjects,
    sanitizeOptions,
};

