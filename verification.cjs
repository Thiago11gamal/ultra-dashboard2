
const { simulateNormalDistribution } = require('./src/engine/monteCarlo.js');
const { monteCarloSimulation } = require('./src/engine/projection.js');
const { computeBayesianLevel } = require('./src/engine/stats.js');
const { getSafeScore } = require('./src/utils/scoreHelper.js');

console.log('--- MC-06: getSafeScore ---');
const score06 = getSafeScore({ score: 0.75, total: 100 });
console.log('Score (0.75/100):', score06); // Should be 0.75, not normalized to 0.75% if fix is working? 
// Wait, the audit said: "Se uma entrada inválida tiver score=0.75 (intencionado como 75%) com total=100, a condição dispara: s = (0.75/100)*100 = 0.75. O score retornado é 0.75% em vez de 75%."
// the fix was: if (total <= 10) normalize. So for total=100, it stays 0.75.
// if it was 75% intended, it should have been 75. 
// The audit said: "Para total > 10, score=0.75 não faz sentido — retornar 0 ou deixar como está"
console.log('Result MC-06:', score06 === 0.75 ? 'PASS (stays 0.75, no incorrect normalization)' : 'FAIL');

console.log('\n--- MC-03: computeBayesianLevel ---');
const res03 = computeBayesianLevel([{ total: 3, correct: 2 }]);
console.log('Bayesian res with total=3:', res03.n); // Should be > 6 (3+3 prior + 3 actual)
console.log('Result MC-03:', res03.n === 9 ? 'PASS' : 'FAIL');

console.log('\n--- MC-01: simulateNormalDistribution Consistency ---');
// mean=80, sd=5, target=85. Prob should be around 16%.
// if bayesianCI makes SD=10. Prob should be recalculated to around 31%.
const res01 = simulateNormalDistribution({ 
    mean: 80, 
    sd: 5, 
    targetScore: 85, 
    simulations: 10000,
    bayesianCI: { ciLow: 60, ciHigh: 100 } // Inferred SD approx 10.2
});
console.log('Result MC-01 Prob:', res01.probability.toFixed(1) + '%');
console.log('Result MC-01 SD:', res01.sd);
// For mean=80, target=85, SD=10.2, Z = (85-80)/10.2 = 0.49. P(Z>0.49) approx 31.2%
console.log('Result MC-01:', res01.probability > 30 && res01.probability < 33 ? 'PASS' : 'FAIL');

console.log('\n--- MC-02: monteCarloSimulation Projection Stability ---');
const history = [
    { date: '2024-01-01', score: 70 },
    { date: '2024-01-02', score: 72 },
    { date: '2024-01-03', score: 71 }
];
// 90 days projection. volatility=1.5 (default min). 
// Without scaling, SD after 90 days would be 1.5 * sqrt(90) = 14.2.
// With scaling 0.4, SD should be 1.5 * sqrt(90) * 0.4 = 5.7.
const res02 = monteCarloSimulation(history, 80, 90, 10000);
console.log('Result MC-02 SD (90 days):', res02.sd);
console.log('Result MC-02:', res02.sd < 10 ? 'PASS (Dampened)' : 'FAIL (Exploded)');
