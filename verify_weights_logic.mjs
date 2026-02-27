import { monteCarloSimulation } from './src/engine/projection.js';

// Mock categories and weights
const categories = [
    { name: 'Matemática', id: 'cat1' },
    { name: 'Português', id: 'cat2' }
];

console.log("--- Verifying Simulation with Discrete Weights ---");

// Test with Peso 1 for both
const history = [
    { date: '2026-01-01', score: 50, category: 'Matemática', weight: 1 },
    { date: '2026-01-02', score: 60, category: 'Matemática', weight: 1 },
    { date: '2026-01-01', score: 70, category: 'Português', weight: 1 },
    { date: '2026-01-02', score: 80, category: 'Português', weight: 1 },
];

// Note: the engine expects a flattened/weighted global history or specific format.
// In the app, MonteCarloGauge.jsx calculates the global weighted average.

function calculateGlobalHistory(history, weights) {
    const pointsByDate = {};
    const categoryState = {};

    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    history.forEach(p => {
        categoryState[p.category] = { score: p.score, weight: weights[p.category] || 1 };

        let totalScore = 0;
        let totalWeight = 0;
        Object.values(categoryState).forEach(state => {
            totalScore += state.score * state.weight;
            totalWeight += state.weight;
        });

        if (totalWeight > 0) {
            pointsByDate[p.date] = totalScore / totalWeight;
        }
    });

    return Object.keys(pointsByDate).map(date => ({ date, score: pointsByDate[date] }));
}

const wEqual = { 'Matemática': 1, 'Português': 1 };
const globalEqual = calculateGlobalHistory(history, wEqual);
console.log("Global History (Equal Weights):", globalEqual);

const simEqual = monteCarloSimulation(globalEqual, 70, 0, 100);
console.log("Sim Result (Equal):", simEqual.mean);

// Test with Peso 3 for Matemática (stronger influence from 50-60%)
const wMathHeavy = { 'Matemática': 3, 'Português': 1 };
const globalMathHeavy = calculateGlobalHistory(history, wMathHeavy);
console.log("Global History (Math Heavy):", globalMathHeavy);

const simMathHeavy = monteCarloSimulation(globalMathHeavy, 70, 0, 100);
console.log("Sim Result (Math Heavy - should be lower mean):", simMathHeavy.mean);

if (simMathHeavy.mean < simEqual.mean) {
    console.log("✅ Weighting logic verified: Higher weight for lower performing subject decreased global mean.");
} else {
    console.log("❌ Weighting logic failed or results too close.");
}
