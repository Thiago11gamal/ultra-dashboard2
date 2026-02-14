
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

console.log('\n--- Result ---');
console.log('Probability:', (result.probability * 100).toFixed(2) + '%');
console.log('Projected Mean from Sim:', result.projectedMean.toFixed(2));
console.log('Projected SD from Sim:', result.projectedSD.toFixed(2));

console.log('\n--- Expected (if sampling once) ---');
// If we just sampled once from N(75, pooledSD):
// Z = (70 - 75) / pooledSD
// Prob = P(Z >= (70-75)/pooledSD)
const z = (targetScore - weightedMean) / pooledSD;
console.log('Z-score:', z.toFixed(4));
// Simple normal approximation for probability
function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - p : p;
}
console.log('Theoretical Prob:', ((1 - normalCDF(z)) * 100).toFixed(2) + '%');
