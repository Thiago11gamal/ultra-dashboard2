
import { runMonteCarloAnalysis } from './src/engine/monteCarlo.js';
import { computePooledSD } from './src/engine/variance.js';
import { calculateWeightedProjectedMean } from './src/engine/projection.js';

// Mock data
const categoryStats = [
    { name: 'Matematica', mean: 75, sd: 5, weight: 1, n: 10, history: [{ date: '2024-01-01', score: 75 }, { date: '2024-01-10', score: 75 }] },
];
const totalWeight = 1;
const projectDays = 30;
const targetScore = 70;

const weightedMean = calculateWeightedProjectedMean(categoryStats, totalWeight, projectDays);
const pooledSD = computePooledSD(categoryStats, totalWeight, projectDays);

console.log('--- Inputs ---');
console.log('Project Days:', projectDays);
console.log('Weighted Mean (Projected):', weightedMean);
console.log('Pooled SD (Projected):', pooledSD);

const result = runMonteCarloAnalysis(weightedMean, pooledSD, targetScore, {
    seed: 42,
    days: 30
});

console.log('\n--- Result (New Structure) ---');
console.log('Probability (0-100):', result.probability.toFixed(2) + '%');
console.log('Mean (String):', result.mean);
console.log('SD (String):', result.sd);
console.log('CI 95% Low (String):', result.ci95Low);
console.log('CI 95% High (String):', result.ci95High);

// Verification
const probScaleOk = result.probability > 1; // Should be around 80, not 0.8
const fieldsPresent = result.mean && result.sd && result.ci95Low && result.ci95High;

console.log('\n--- Verification ---');
console.log('Probability scale OK:', probScaleOk);
console.log('All required UI fields present:', !!fieldsPresent);

if (!probScaleOk || !fieldsPresent) {
    console.error('FAILED: Output structure not correct for UI');
    throw new Error('Output structure not correct for UI');
} else {
    console.log('PASSED: Structure matches UI expectations');
}
