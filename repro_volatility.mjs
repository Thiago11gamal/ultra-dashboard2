
import { monteCarloSimulation } from './src/engine/projection.js';

console.log('🔍 Testing Volatility Inflation on Trend Change...');

// Scenario: User was bad (50%) for a long time, then suddenly became good (90%) and consistent.
// The linear regression will try to fit a line.
// If valid, the volatility (SD) should be low (reflecting recent consistency), 
// but if unweighted, the old points will look like huge errors against the new trend.

const history = [];

// 20 days of bad performance (50%)
for (let i = 0; i < 20; i++) {
    history.push({
        date: new Date(2023, 0, i + 1).toISOString(),
        score: 50 // Consistent bad
    });
}

// 10 days of excellent performance (90%)
for (let i = 0; i < 10; i++) {
    history.push({
        date: new Date(2023, 0, 21 + i).toISOString(),
        score: 90 // Consistent good
    });
}

console.log(`History: 20 days @ 50%, then 10 days @ 90%`);

// Run Simulation
const result = monteCarloSimulation(history, 80, 30, 2000);

console.log('--- Result ---');
console.log(`Mean: ${result.mean}%`);
console.log(`SD (Volatility): ±${result.sd}%`);
console.log(`Probability: ${result.probability.toFixed(1)}%`);

// Expectation:
// If volatility is unweighted, SD will be huge because the 50s are far from the regression line of the 90s (or the average slope).
// If SD is > 10, it's problematic because the user IS consistent (just shifted level).

if (parseFloat(result.sd) > 10) {
    console.log('⚠️  High Volatility Detected! Old data is polluting the consistency metric.');
} else {
    console.log('✅ Volatility is handled correctly.');
}
