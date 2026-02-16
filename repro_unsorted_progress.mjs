
import { analyzeProgressState } from './src/utils/ProgressStateEngine.js';

console.log('🔍 Testing ProgressStateEngine with Unsorted Data...');

// Scenario: History is unsorted (older date came last)
// Date 1: 50
// Date 3: 90
// Date 2: 70
// Chronological: 50 -> 70 -> 90 (Trend Up)
// Unsorted Input: [50, 90, 70] (Trend looks Down or Stable)

const unsortedScores = [50, 90, 70];

const analysis = analyzeProgressState(unsortedScores, {
    window_size: 3,
    stagnation_threshold: 0.5,
    low_level_limit: 60,
    high_level_limit: 80
});

console.log('--- Result ---');
console.log(`Input: [${unsortedScores.join(', ')}]`);
console.log(`Slope: ${analysis.trend_slope.toFixed(4)}`);
console.log(`State: ${analysis.state}`);

// Expectation:
// If interpreted as 50 -> 90 -> 70, trend is likely flat or down (end is lower than mid).
// But correct trend (50->70->90) is strongly UP.

if (analysis.trend_slope <= 0.5) { // 50->90 slope is big
    console.log('⚠️  Trend misinterpreted due to unsorted data!');
} else {
    console.log('✅ Trend somehow correct?');
}
