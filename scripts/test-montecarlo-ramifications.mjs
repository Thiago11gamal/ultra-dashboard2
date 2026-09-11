import { simulateNormalDistribution } from '../src/engine/monteCarlo.js';
import { projectScore } from '../src/engine/projection.js';
import { computeCategoryStats } from '../src/engine/stats.js';

console.log('=== VERIFICAÇÃO DE REGRESSÃO: MONTE CARLO + RAMIFICAÇÕES ===\n');

let failed = 0;
let passed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
        passed++;
    } else {
        console.error(`[FAIL] ${message}`);
        failed++;
    }
}

// -----------------------------------------------------------------------------
// 1. monteCarlo.js:567 — highTruncationStress no underflow mais severo
// -----------------------------------------------------------------------------
console.log('--- 1. Teste do highTruncationStress (Monte Carlo Underflow) ---');
const mcUnderflowResult = simulateNormalDistribution({
    mean: 0.01,
    sd: 3,
    targetScore: 99,
    minScore: 0,
    maxScore: 100,
    simulations: 2000
});

assert(
    mcUnderflowResult.probabilityPolicy === 'blended_truncated_policy',
    `probabilityPolicy deve ser 'blended_truncated_policy' sob stress de underflow severo (obtido: '${mcUnderflowResult.probabilityPolicy}')`
);

// -----------------------------------------------------------------------------
// 2. projection.js:414-415 — projectScore (ramo não logístico) propagando maxScore
// -----------------------------------------------------------------------------
console.log('\n--- 2. Teste da Propagação de maxScore no projectScore (Ramo Não-Logístico) ---');
// Criar histórico com < 4 pontos para forçar ramo não-logístico
const hist100 = [
    { date: '2026-07-01', score: 10 },
    { date: '2026-07-02', score: 30 },
    { date: '2026-07-03', score: 50 }
];
const hist1000 = [
    { date: '2026-07-01', score: 100 },
    { date: '2026-07-02', score: 300 },
    { date: '2026-07-03', score: 500 }
];

const proj100 = projectScore(hist100, 30, 0, 100, {});
const proj1000 = projectScore(hist1000, 30, 0, 1000, {});

// Projeção em proporção da escala deve ser praticamente idêntica (ex: 50% + ganho proporcional)
const ratio100 = proj100.projected / 100;
const ratio1000 = proj1000.projected / 1000;
const diffRatio = Math.abs(ratio100 - ratio1000);

assert(
    diffRatio < 1e-4,
    `Projeção em escala 100 vs 1000 deve ser proporcionalmente idêntica (diff: ${diffRatio.toFixed(6)}, ratio100: ${ratio100.toFixed(4)}, ratio1000: ${ratio1000.toFixed(4)})`
);

// -----------------------------------------------------------------------------
// 3. stats.js:864-865 — computeCategoryStats: invariante à ordem do histórico
// -----------------------------------------------------------------------------
console.log('\n--- 3. Teste de Invariância à Ordem no computeCategoryStats (SD) ---');
const chronologicalHistory = [
    { date: '2026-07-01', score: 60, total: 20 },
    { date: '2026-07-05', score: 70, total: 20 },
    { date: '2026-07-10', score: 65, total: 20 },
    { date: '2026-07-20', score: 80, total: 20 }
];

const shuffledHistory = [
    { date: '2026-07-20', score: 80, total: 20 },
    { date: '2026-07-01', score: 60, total: 20 },
    { date: '2026-07-10', score: 65, total: 20 },
    { date: '2026-07-05', score: 70, total: 20 }
];

const statsChronological = computeCategoryStats(chronologicalHistory, 1, 60, 100);
const statsShuffled = computeCategoryStats(shuffledHistory, 1, 60, 100);

const sdDiff = Math.abs(statsChronological.sd - statsShuffled.sd);
assert(
    sdDiff < 1e-6,
    `O desvio padrão (sd) deve ser idêntico independentemente da ordem das entradas no array (cronológico: ${statsChronological.sd.toFixed(6)}, embaralhado: ${statsShuffled.sd.toFixed(6)})`
);

console.log(`\nResumo: ${passed} passaram, ${failed} falharam.`);

if (failed > 0) {
    process.exit(1);
} else {
    console.log('✅ Todas as 3 verificações de bugs em Monte Carlo + Ramificações passaram!');
    process.exit(0);
}
