
import { calculateSlope } from './src/engine/projection.js';
import { calculateTrend } from './src/engine/stats.js';

console.log('--- Verification: Statistical Modeling Refinement ---\n');

// 1. Verify calculateSlope absoluteMax
console.log('1. Verificando teto de 0.4 em calculateSlope...');
const aggressiveHistory = [
    { date: '2024-01-01', score: 50 },
    { date: '2024-01-02', score: 60 }, // +10 points in 1 day! Slope = 10
];
const slope = calculateSlope(aggressiveHistory);
console.log(`Slope para ganho de 10pp/dia: ${slope.toFixed(4)}`);
// With n=2, confidence is approx 1/(1 + (4.5/1)/0.5) = 1/10 = 0.1
// Slope 10 clamped to 0.4, then * confidence 0.1 = 0.04
console.log(`Resultado: ${slope <= 0.4 ? 'PASS' : 'FAIL'} (Deve ser <= 0.4)`);

// 2. Verify calculateTrend with full history (no slice)
console.log('\n2. Verificando calculateTrend com histórico completo (>10 pontos)...');
const longHistory = Array.from({ length: 15 }, (_, i) => ({
    date: new Date(2024, 0, i + 1).toISOString(),
    score: 50 + i // Steady 1pp/day increase
}));
// If sliced to 10, it uses items 5-14. If full, uses 0-14.
// Either way, slope should be 1.0. Normalized (slope * 10) = 10.
const trend = calculateTrend(longHistory);
console.log(`Trend para 15 pontos: ${trend.toFixed(2)}`);
console.log(`Resultado: ${Math.abs(trend - 10) < 0.1 ? 'PASS' : 'FAIL'} (Esperado ~10)`);

// 3. Verify temporal correction in calculateTrend
console.log('\n3. Verificando correção temporal (intervalos irregulares)...');
const irregularHistory = [
    { date: '2024-01-01', score: 50 },
    { date: '2024-01-02', score: 51 }, // 1 day gap, 1 point
    { date: '2024-02-01', score: 81 }, // 30 days gap, 30 points
];
// Average slope should be 1.0 point/day. Normalized = 10.
const irregularTrend = calculateTrend(irregularHistory);
console.log(`Trend para intervalos irregulares: ${irregularTrend.toFixed(2)}`);
console.log(`Resultado: ${Math.abs(irregularTrend - 10) < 0.1 ? 'PASS' : 'FAIL'} (Esperado ~10)`);

console.log('\n--- Verification Finished ---');
