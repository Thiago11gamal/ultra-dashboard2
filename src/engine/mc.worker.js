/**
 * Monte Carlo Web Worker
 * Offloads heavy simulation work from the main thread.
 * 
 * Receives messages with { type, payload } and responds with { type, result }.
 * Vite bundles this as a module worker via `new Worker(url, { type: 'module' })`.
 */

import { monteCarloSimulation } from './projection.js';
import { simulateNormalDistribution, runMonteCarloAnalysis } from './monteCarlo.js';

self.onmessage = function(e) {
    const { type, payload, id } = e.data;

    try {
        let result;

        if (type === 'runMonteCarloAnalysis') {
            // Supports both object and positional signatures
            if (payload.isObjectCall) {
                result = runMonteCarloAnalysis(payload.input);
            } else {
                result = runMonteCarloAnalysis(
                    payload.inputOrMean,
                    payload.pooledSD,
                    payload.targetScore,
                    payload.options
                );
            }
        } else if (type === 'monteCarloSimulation') {
            result = monteCarloSimulation(
                payload.history,
                payload.targetScore,
                payload.projectionDays,
                payload.simulations,
                payload.options
            );
        } else if (type === 'simulateNormalDistribution') {
            result = simulateNormalDistribution(
                payload.mean,
                payload.sd,
                payload.targetScore,
                payload.simulations,
                payload.seed,
                payload.currentMean,
                payload.categoryName,
                payload.bayesianCI
            );
        }

        self.postMessage({ id, type: 'result', result });
    } catch (error) {
        self.postMessage({ id, type: 'error', error: error.message });
    }
};
