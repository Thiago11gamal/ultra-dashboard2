/**
 * Monte Carlo Engine - Simulation Module
 * 
 * Implements Monte Carlo simulation with:
 * - Adaptive simulation count (10k/20k based on SD)
 * - Explicit seed for reproducibility and auditing
 * - Truncated normal distribution [0, 100]
 * - Box-Muller transform for Gaussian sampling
 */

/**
 * Mulberry32 PRNG - Deterministic random number generator
 * @param {number} seed - Initial seed value
 * @returns {function} Random number generator returning [0, 1)
 */
function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Box-Muller transform - Generate normally distributed random number
 * @param {function} random - PRNG function
 * @param {number} mean - Distribution mean
 * @param {number} sd - Distribution standard deviation
 * @returns {number} Random sample from N(mean, sd)
 */
function boxMuller(random, mean, sd) {
    let u = 0, v = 0;
    while (u === 0) u = random();
    while (v === 0) v = random();

    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * sd + mean;
}

/**
 * Generate simulation seed for auditing
 * @returns {number} Seed value based on current time
 */
export function generateSeed() {
    return Date.now() % 100000;
}

/**
 * Determine optimal simulation count based on uncertainty
 * Higher SD = more simulations needed for stability
 * 
 * @param {number} sd - Pooled standard deviation
 * @returns {number} Number of simulations to run
 */
export function getSimulationCount(sd) {
    return sd > 10 ? 20000 : 10000;
}

/**
 * Run Monte Carlo simulation
 * 
 * @param {number} mean - Projected mean
 * @param {number} sd - Pooled standard deviation
 * @param {Object} options - Simulation options
 * @param {number} options.seed - Explicit seed for reproducibility
 * @param {number} options.simulations - Number of simulations (optional)
 * @returns {Object} Simulation results
 */
export function runSimulation(mean, sd, options = {}) {
    const seed = options.seed ?? generateSeed();
    const simulations = options.simulations ?? getSimulationCount(sd);

    const random = mulberry32(seed);
    const scores = [];

    for (let i = 0; i < simulations; i++) {
        const rawScore = boxMuller(random, mean, sd);
        // Truncate to valid range [0, 100]
        const clampedScore = Math.min(100, Math.max(0, rawScore));
        scores.push(clampedScore);
    }

    scores.sort((a, b) => a - b);

    return {
        scores,
        seed,
        simulations,
        mean,
        sd
    };
}

/**
 * Calculate simulation result metrics
 * 
 * @param {number[]} scores - Sorted array of simulation scores
 * @param {number} target - Target score to measure probability against
 * @returns {Object} Result metrics
 */
export function calculateResultMetrics(scores, target) {
    const simulations = scores.length;

    // Probability of reaching target
    const successCount = scores.filter(s => s >= target).length;
    const probability = (successCount / simulations) * 100;

    // 95% Confidence Interval (percentile method)
    const ci95LowIndex = Math.floor(simulations * 0.025);
    const ci95HighIndex = Math.min(Math.floor(simulations * 0.975), simulations - 1);
    const ci95Low = scores[ci95LowIndex];
    const ci95High = scores[ci95HighIndex];

    // Median
    const medianIndex = Math.floor(simulations / 2);
    const median = scores[medianIndex];

    return {
        probability: Number(probability.toFixed(1)),
        ci95Low: Number(ci95Low.toFixed(1)),
        ci95High: Number(ci95High.toFixed(1)),
        median: Number(median.toFixed(1)),
        simulations
    };
}

/**
 * Complete Monte Carlo analysis
 * Combines simulation and result calculation
 * 
 * @param {number} mean - Projected mean
 * @param {number} sd - Pooled standard deviation
 * @param {number} target - Target score
 * @param {Object} options - Simulation options
 * @returns {Object} Complete analysis result
 */
export function runMonteCarloAnalysis(mean, sd, target, options = {}) {
    const simulation = runSimulation(mean, sd, options);
    const metrics = calculateResultMetrics(simulation.scores, target);

    return {
        ...metrics,
        seed: simulation.seed,
        simulationId: `MC-${simulation.seed}`,
        mean: Number(mean.toFixed(2)),
        sd: Number(sd.toFixed(2)),
        target
    };
}

export default {
    generateSeed,
    getSimulationCount,
    runSimulation,
    calculateResultMetrics,
    runMonteCarloAnalysis
};
