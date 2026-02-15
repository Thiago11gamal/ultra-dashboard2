
import { runMonteCarloAnalysis } from './src/engine/monteCarlo.js';
import { calculateSlope, projectScore } from './src/engine/projection.js';

// Mock Data: 5 days of history, slight upward trend
const historyValues = [60, 62, 63, 65, 66];
const historyDates = [
    '2023-01-01',
    '2023-01-02',
    '2023-01-03',
    '2023-01-04',
    '2023-01-05'
];

console.log("=== VERIFYING INSTITUTIONAL ENGINE ===");

// 1. Test calculation of slope directly
const historyObjs = historyValues.map((v, i) => ({ score: v, date: historyDates[i] }));
const slope = calculateSlope(historyObjs);
console.log(`Slope (should be positive): ${slope.toFixed(4)}`);

// 2. Test Projection
const projected = projectScore(historyObjs, 30);
console.log(`Projected Score (30 days): ${projected.toFixed(2)}`);

// 3. Test Full Monte Carlo Analysis (Integration)
// Note: We use the Object interface which triggers the new 'Institutional' path
const result = runMonteCarloAnalysis({
    values: historyValues,
    dates: historyDates,
    meta: 70, // Target
    simulations: 1000,
    projectionDays: 30
});

console.log("\n=== MONTE CARLO RESULTS ===");
console.log(`Probability: ${result.probability.toFixed(1)}%`);
console.log(`Mean: ${result.mean}`);
console.log(`SD: ${result.sd}`);
console.log(`CI 95%: [${result.ci95Low}, ${result.ci95High}]`);
console.log(`Drift: ${result.drift}`);
console.log(`Volatility: ${result.volatility}`);

if (result.probability > 0 && result.mean > 60) {
    console.log("\n✅ SUCCESS: Engine produced valid results.");
} else {
    console.log("\n❌ FAILURE: Results look suspicious (zeros or invalid).");
}
