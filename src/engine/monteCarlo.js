/*******************************
 * MOTOR MATEMÁTICO - SaaS Core
 *******************************/

/* =============================
   PSEUDO-RANDOM NUMBER GENERATOR (PRNG)
   Algorithm: Mulberry32
   Fast, deterministic, and sufficient for visual Monte Carlo.
============================= */

function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/* =============================
   HASHING FUNCTION (String/Object -> Seed)
   Algorithm: cyrb53 (simple & effective hash)
   Used to generate deterministic seeds from inputs.
============================= */

function cyrb53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function generateSeedFromInputs(inputs) {
    // Stringify inputs to create a unique hash source
    // Order of keys matters in JSON.stringify, but usually consistent enough for this purpose
    // if strictly equal inputs are provided.
    const str = JSON.stringify(inputs);
    return cyrb53(str);
}

/* =============================
   ESTATÍSTICA BÁSICA (Pure Functions)
============================= */

function mean(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values) {
    if (!values || values.length < 2) return 0;
    const m = mean(values);
    return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
}

function standardDeviation(values) {
    return Math.sqrt(variance(values));
}

export { mean, variance, standardDeviation };


/* =============================
   MONTE CARLO FACTORY
============================= */

/**
 * Creates a Monte Carlo engine instance with a specific seed.
 * @param {number|string|object} seedInput - Seed value or object/string to hash.
 */
export function createMonteCarloEngine(seedInput) {
    // Determine seed: use direct number or hash the input
    const seed = (typeof seedInput === 'number')
        ? seedInput
        : generateSeedFromInputs(seedInput);

    // Initialize PRNG
    const rng = mulberry32(seed);

    /**
     * Generates a random number from a normal distribution (Gaussian).
     * Uses Box-Muller transform with the instance's seeded RNG.
     */
    function randomNormal(meanVal, sdVal) {
        const u1 = rng();
        const u2 = rng();

        const z0 = Math.sqrt(-2.0 * Math.log(u1 || 1e-10)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * sdVal + meanVal;
    }

    /**
     * Simulates Geometric Brownian Motion path
     */
    function simulateGeometricProcess(initialValue, drift, volatility, days) {
        let value = initialValue;

        for (let d = 0; d < days; d++) {
            // Standard Normal Z ~ N(0, 1)
            const z = randomNormal(0, 1);

            // GBM Step
            const growthFactor = Math.exp(
                (drift - 0.5 * volatility * volatility) +
                volatility * z
            );

            value = value * growthFactor;
        }
        return value;
    }

    /**
     * Runs the Monte Carlo simulation suite
     */
    function runMonteCarlo(
        currentValue,
        slope,          // Daily linear slope
        days,
        varianceValue,  // Daily variance
        target,
        simulations = 5000
    ) {
        const results = [];

        // Approx Drift (mu)
        const drift = currentValue > 0 ? slope / currentValue : 0;

        // Approx Volatility (sigma)
        const dailySD = Math.sqrt(varianceValue);
        const volatility = currentValue > 0 ? dailySD / currentValue : 0;

        for (let i = 0; i < simulations; i++) {
            const finalValue = simulateGeometricProcess(
                currentValue,
                drift,
                volatility,
                days
            );

            // Clamp to valid [0, 100] range
            const clampedValue = Math.min(100, Math.max(0, finalValue));
            results.push(clampedValue);
        }

        results.sort((a, b) => a - b);

        const meanResult = mean(results);
        const stdResult = standardDeviation(results);

        const probability = results.filter((r) => r >= target).length / results.length;

        const ci95 = [
            results[Math.floor(0.025 * simulations)] || 0,
            results[Math.floor(0.975 * simulations)] || 100,
        ];

        return {
            mean: Number(meanResult.toFixed(2)),
            std: Number(stdResult.toFixed(2)),
            probability: Number((probability * 100).toFixed(1)),
            ci95: [Number(ci95[0].toFixed(1)), Number(ci95[1].toFixed(1))],
            simulations,
            scores: results
        };
    }

    return {
        runMonteCarlo,
        randomNormal // Exposed for testing context if needed
    };
}


/* =============================
   ADAPTER / LEGACY EXPORT
============================= */

/**
 * Main entry point for the simulation.
 * Automatically handles seeding if not provided.
 */
export function runMonteCarloAnalysis(meanVal, sdVal, target, options = {}) {
    // Default values
    const slope = options.slope || 0;
    const days = options.days || 30; // Default 30 day projection
    const simulations = options.simulations || 5000;

    // Variance = SD^2
    const varianceValue = sdVal * sdVal;

    // INTELLIGENT SEEDING STRATEGY
    // If a seed is explicitly provided in options, use it.
    // Otherwise, generate a deterministic seed based on the inputs.
    // This ensures: 
    // 1. Stability: Same inputs -> Same seed -> Same result.
    // 2. Sensitivity: Inputs change -> Seed changes -> New result.

    let seedInput = options.seed;

    if (seedInput === undefined || seedInput === null) {
        // Construct a unique signature for this simulation scenario
        // Include 'simulations' count so changing precision changes seed too (?) - optional
        // Include 'days' because projecting further is a different scenario
        seedInput = {
            mean: meanVal,
            sd: sdVal,
            target: target,
            slope: slope,
            days: days,
            simulations: simulations
        };
    }

    // Create the engine instance
    const engine = createMonteCarloEngine(seedInput);

    // Run
    const result = engine.runMonteCarlo(meanVal, slope, days, varianceValue, target, simulations);

    return {
        ...result,
        target,
        // Legacy fields for UI compatibility:
        ci95Low: result.ci95[0],
        ci95High: result.ci95[1],
        median: result.mean
    };
}

// Default export object for older import styles
export default {
    mean,
    variance,
    standardDeviation,
    createMonteCarloEngine,
    runMonteCarloAnalysis
};
