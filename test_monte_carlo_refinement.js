
import { calculateSlope, monteCarloSimulation } from './src/engine/projection.js';

console.log('--- Teste de Refinamento Estatístico ---');

const maxScore = 100;

// Cenário 1: Evolução Explosiva (Antigo absoluteMax=0.85, Novo=0.4)
const historyExplosive = [
    { date: '2024-01-01', score: 60 },
    { date: '2024-01-05', score: 80 } // Ganho de 20 pontos em 4 dias = 5pp/dia
];

const slope = calculateSlope(historyExplosive, maxScore);
console.log(`Slope Explosivo (Máximo esperado ~0.4): ${slope.toFixed(4)}`);

if (slope <= 0.4001) {
    console.log('✅ PASS: Slope limitado corretamente.');
} else {
    console.log('❌ FAIL: Slope excedeu o novo limite de 0.4.');
}

// Cenário 2: Estabilidade do baseLimit
const historyStable = [
    { date: '2024-01-01', score: 70 },
    { date: '2024-01-30', score: 75 } // Ganho de 5 pontos em 30 dias = ~0.16pp/dia
];

const slopeStable = calculateSlope(historyStable, maxScore);
console.log(`Slope Estável: ${slopeStable.toFixed(4)}`);

// Cenário 3: Incerteza do Monte Carlo
const resMC = monteCarloSimulation(historyStable, 80, 90, 5000);
console.log(`Monte Carlo SD (90 dias): ${resMC.sd.toFixed(2)}`);
if (resMC.sd < 10) {
    console.log('✅ PASS: Incerteza controlada.');
} else {
    console.log('❌ FAIL: Incerteza explodiu.');
}

console.log('--- Teste Finalizado ---');
