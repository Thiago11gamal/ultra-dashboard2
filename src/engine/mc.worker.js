import { monteCarloSimulation } from './projection.js';
import { runMonteCarloAnalysis, simulateNormalDistribution } from './monteCarlo.js';

self.onmessage = function(e) {
    const { type, payload, id } = e.data;
    try {
        let result;
        if (type === 'runMonteCarloAnalysis') {
            if (payload.isObjectCall) {
                result = runMonteCarloAnalysis(payload.input);
            } else {
                result = runMonteCarloAnalysis(payload.inputOrMean, payload.pooledSD, payload.targetScore, payload.options);
            }
        } else if (type === 'monteCarloSimulation') {
            result = monteCarloSimulation(payload.history, payload.targetScore, payload.projectionDays, payload.simulations, payload.options);
        } else if (type === 'simulateNormalDistribution') {
            result = simulateNormalDistribution({
                mean: payload.mean,
                sd: payload.sd,
                targetScore: payload.targetScore,
                simulations: payload.simulations,
                seed: payload.seed,
                currentMean: payload.currentMean,
                categoryName: payload.categoryName,
                bayesianCI: payload.bayesianCI,
                minScore: payload.minScore,
                maxScore: payload.maxScore,
            });
        }
        self.postMessage({ id, type: 'result', result });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ id, type: 'error', error: errorMessage });
    }
};
