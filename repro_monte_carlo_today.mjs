
import { computePooledSD } from './src/engine/variance.js';
import { runMonteCarloAnalysis } from './src/engine/monteCarlo.js';
import { calculateWeightedProjectedMean } from './src/engine/projection.js';

console.log('🔍 Testing Monte Carlo "Today" (0 days)...');

// Mock Data
const mockStats = [
    { name: 'Math', mean: 70, sd: 5, weight: 50, n: 10, history: [{ date: '2023-01-01', score: 70 }, { date: '2023-01-02', score: 70 }] },
    { name: 'Physics', mean: 60, sd: 10, weight: 50, n: 10, history: [{ date: '2023-01-01', score: 60 }, { date: '2023-01-02', score: 60 }] }
];
const totalWeight = 100;
const target = 70;

// Test 0 Days
const projectDays = 0;

// 1. Calculate SD
const pooledSD = computePooledSD(mockStats, totalWeight, projectDays);
console.log(`Pooled SD (0 days): ${pooledSD.toFixed(2)}`);

// 2. Calculate Mean
const weightedMean = calculateWeightedProjectedMean(mockStats, totalWeight, projectDays);
console.log(`Weighted Mean (0 days): ${weightedMean.toFixed(2)}`);

if (weightedMean !== 65) {
    console.error('❌ Weighted Mean should be 65 ((70+60)/2)');
}

// 3. Run Simulation (Legacy)
const result = runMonteCarloAnalysis(weightedMean, pooledSD, target, {
    seed: 12345,
    simulations: 2000
});

console.log('Simulation Result (Today):', result);

if (result.sd === "0.0") {
    console.error('❌ Deviation is 0.0! This means no variance/risk is being simulated for "Today".');
} else {
    console.log('✅ Deviation present. Risk is being calculated.');
}
