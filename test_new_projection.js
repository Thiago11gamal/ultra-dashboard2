
import { calculateAdaptiveSlope, projectScore } from './src/engine/projection.js';

// Mock Data
const historyStable = [
    { date: '2023-01-01', score: 70 },
    { date: '2023-01-02', score: 70.5 },
    { date: '2023-01-03', score: 71 },
    { date: '2023-01-04', score: 71.5 }
];

const historyVolatile = [
    { date: '2023-01-01', score: 60 },
    { date: '2023-01-02', score: 80 },
    { date: '2023-01-03', score: 65 },
    { date: '2023-01-04', score: 75 }
];

console.log("--- TEST: Adaptive Slope ---");
const slopeStable = calculateAdaptiveSlope(historyStable);
console.log("Stable History Slope (expect close to 0.5):", slopeStable.toFixed(4));

const slopeVolatile = calculateAdaptiveSlope(historyVolatile);
console.log("Volatile History Slope (expect lower due to confidence penalty):", slopeVolatile.toFixed(4));

console.log("\n--- TEST: Projection ---");
const projectedStable = projectScore(historyStable, 30);
console.log("Projected Stable (30 days):", projectedStable.toFixed(2));

const projectedVolatile = projectScore(historyVolatile, 30);
console.log("Projected Volatile (30 days):", projectedVolatile.toFixed(2));

console.log("\n--- TEST COMPLETE ---");
