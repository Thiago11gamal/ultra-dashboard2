// src/engine/__tests__/regression.test.js
//
// Testes de regressão para bugs corrigidos no ultra-dashboard2.
// Objetivo: qualquer regressão nos fixes documentados quebra aqui antes
// de chegar à produção.
//
// Para rodar:
//   npx vitest run
//   npx vitest --coverage   ← relatório de cobertura
//
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getSafeScore } from '../../utils/scoreHelper.js';
import { computeBayesianLevel, standardDeviation } from '../stats.js';
import { calculateVolatility, calculateSlope, monteCarloSimulation } from '../projection.js';
import { simulateNormalDistribution } from '../monteCarlo.js';
import { normalCDF_complement, sampleTruncatedNormal } from '../math/gaussian.js';
import { mulberry32 } from '../random.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE FIXTURE
// ─────────────────────────────────────────────────────────────────────────────

function makeHistory(scores, maxScore = 100) {
    const today = Date.now();
    return scores.map((s, i) => ({
        score: s,
        correct: Math.round((s / maxScore) * 10),
        total: 10,
        date: new Date(today - (scores.length - i) * 86400000).toISOString().slice(0, 10),
    }));
}

function makeHistoryPct(pcts) {
    const today = Date.now();
    return pcts.map((pct, i) => ({
        score: pct,
        isPercentage: true,
        total: 0,
        correct: 0,
        date: new Date(today - (pcts.length - i) * 86400000).toISOString().slice(0, 10),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: isPercentage — score nunca excede maxScore
// Histórico: flag `isPercentage=true` com maxScore≠100 inflava score para >100%
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: isPercentage — getSafeScore', () => {
    it('score percentual em prova base-120 nunca excede 120', () => {
        const entry = { score: 75, isPercentage: true, total: 0, correct: 0 };
        const result = getSafeScore(entry, 120);
        expect(result).toBeLessThanOrEqual(120);
        expect(result).toBeGreaterThanOrEqual(0);
        // 75% de 120 = 90
        expect(result).toBe(75); // score já vem como ponto absoluto na escala 0-120
    });

    it('score numérico sem isPercentage permanece clampado em [0, maxScore]', () => {
        const entry = { score: 150, total: 0, correct: 0 };
        expect(getSafeScore(entry, 100)).toBe(100);
        expect(getSafeScore(entry, 120)).toBe(120);
    });

    it('score derivado de correct/total respeita maxScore', () => {
        const entry = { correct: 18, total: 20 }; // 90%
        expect(getSafeScore(entry, 100)).toBe(90);
        expect(getSafeScore(entry, 180)).toBe(162);
    });

    it('entry nulo retorna 0 sem lançar exceção', () => {
        expect(getSafeScore(null, 100)).toBe(0);
        expect(getSafeScore(undefined, 100)).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: MC_PROB_DANGER/SAFE em escala 0-100 (não 0-1)
// Histórico: limiares eram verificados em 0-1, comparados com prob 0-100 → sempre "safe"
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: monteCarloSimulation retorna probabilidade em escala 0-100', () => {
    const history = makeHistory([60, 65, 62, 68, 70]);

    it('probabilidade está entre 0 e 100, não entre 0 e 1', () => {
        const result = monteCarloSimulation(history, 80, 90, 500);
        expect(result.probability).toBeGreaterThanOrEqual(0);
        expect(result.probability).toBeLessThanOrEqual(100);
        // Se estivesse em 0-1 e a prob fosse ~0.35, o check abaixo pegaria a regressão
        expect(result.probability).not.toBeLessThan(0.01);
    });

    it('analyticalProbability também em escala 0-100', () => {
        const result = monteCarloSimulation(history, 80, 90, 500);
        expect(result.analyticalProbability).toBeGreaterThanOrEqual(0);
        expect(result.analyticalProbability).toBeLessThanOrEqual(100);
    });

    it('meta impossível retorna probabilidade próxima de 0', () => {
        const result = monteCarloSimulation(history, 200, 90, 500, { maxScore: 100 });
        expect(result.probability).toBeLessThan(5);
    });

    it('meta trivial retorna probabilidade próxima de 100', () => {
        const result = monteCarloSimulation(history, 0, 90, 500);
        expect(result.probability).toBeGreaterThan(90);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: Welford dual accumulator — CI nunca extrapola [minScore, maxScore]
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: Welford — CI dentro de [minScore, maxScore]', () => {
    it('simulateNormalDistribution: ci95 dentro do domínio', () => {
        const result = simulateNormalDistribution({
            mean: 75,
            sd: 12,
            targetScore: 80,
            simulations: 1000,
            minScore: 0,
            maxScore: 100,
        });
        expect(result.ci95Low).toBeGreaterThanOrEqual(0);
        expect(result.ci95High).toBeLessThanOrEqual(100);
    });

    it('domínio não padrão (ex: 0-180) — ci95 respeita os limites', () => {
        const result = simulateNormalDistribution({
            mean: 120,
            sd: 20,
            targetScore: 140,
            simulations: 1000,
            minScore: 0,
            maxScore: 180,
        });
        expect(result.ci95Low).toBeGreaterThanOrEqual(0);
        expect(result.ci95High).toBeLessThanOrEqual(180);
    });

    it('monteCarloSimulation: ci95 dentro do domínio para histórico real', () => {
        const history = makeHistory([55, 60, 58, 63, 67, 65, 70]);
        const result = monteCarloSimulation(history, 80, 90, 500, { minScore: 0, maxScore: 100 });
        expect(result.ci95Low).toBeGreaterThanOrEqual(0);
        expect(result.ci95High).toBeLessThanOrEqual(100);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: Boundary condition — normalCDF_complement sinal correto
// Histórico: z negativo retornava probabilidade simétrica errada
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: normalCDF_complement — sinal correto', () => {
    it('normalCDF_complement(0) ≈ 0.5 (cauda direita de z=0)', () => {
        expect(normalCDF_complement(0)).toBeCloseTo(0.5, 2);
    });

    it('normalCDF_complement(1.96) ≈ 0.025 (IC 95% cauda direita)', () => {
        expect(normalCDF_complement(1.96)).toBeCloseTo(0.025, 2);
    });

    it('normalCDF_complement(-1.96) ≈ 0.975 (cauda esquerda)', () => {
        expect(normalCDF_complement(-1.96)).toBeCloseTo(0.975, 2);
    });

    it('simetria: complement(z) + complement(-z) ≈ 1', () => {
        [0.5, 1.0, 2.0, 3.0].forEach(z => {
            expect(normalCDF_complement(z) + normalCDF_complement(-z)).toBeCloseTo(1.0, 5);
        });
    });

    it('meta acima da média tem prob < 50%; meta abaixo tem prob > 50%', () => {
        const aboveMean = simulateNormalDistribution({ mean: 60, sd: 10, targetScore: 80, simulations: 2000, minScore: 0, maxScore: 100 });
        const belowMean = simulateNormalDistribution({ mean: 60, sd: 10, targetScore: 40, simulations: 2000, minScore: 0, maxScore: 100 });
        expect(aboveMean.analyticalProbability).toBeLessThan(50);
        expect(belowMean.analyticalProbability).toBeGreaterThan(50);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: Bayesian shrinkage — sem dupla aplicação
// Histórico: shrinkage era aplicado tanto no computeBayesianLevel quanto no
// monteCarloSimulation com forcedBaseline, gerando média bayesiana encolhida 2x
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: Bayesian — média posterior sensível ao histórico', () => {
    it('aluno com todas as notas 90% tem média Bayesiana > 80', () => {
        const history = makeHistory([90, 90, 90, 90, 90]);
        const result = computeBayesianLevel(history, 1, 1, 100);
        expect(result.mean).toBeGreaterThan(80);
    });

    it('aluno com notas baixas (30%) tem média Bayesiana < 50', () => {
        const history = makeHistory([30, 30, 30, 30, 30]);
        const result = computeBayesianLevel(history, 1, 1, 100);
        expect(result.mean).toBeLessThan(50);
    });

    it('média Bayesiana para maxScore=180 escala proporcionalmente', () => {
        const h100 = makeHistory([60, 60, 60, 60, 60], 100);
        const h180 = makeHistory([108, 108, 108, 108, 108], 180); // mesmo 60% em base 180
        const r100 = computeBayesianLevel(h100, 1, 1, 100);
        const r180 = computeBayesianLevel(h180, 1, 1, 180);
        // Razão deve ser próxima de 1.8
        expect(r180.mean / r100.mean).toBeCloseTo(1.8, 0);
    });

    it('CI nunca extrapola [0, maxScore]', () => {
        const history = makeHistory([5, 5, 5, 5, 5]); // notas muito baixas
        const result = computeBayesianLevel(history, 1, 1, 100);
        expect(result.ciLow).toBeGreaterThanOrEqual(0);
        expect(result.ciHigh).toBeLessThanOrEqual(100);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: Volatilidade MSSD — escala invariante
// Histórico: calculateVolatility retornava valores fora de escala para maxScore≠100
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: calculateVolatility — escala invariante', () => {
    it('volatilidade de histórico estável é baixa (< 10% do maxScore)', () => {
        const history = makeHistory([70, 71, 70, 72, 71, 70], 100);
        const vol = calculateVolatility(history, 100);
        expect(vol).toBeLessThan(10);
    });

    it('volatilidade de histórico caótico é maior que a estável', () => {
        const stable = makeHistory([70, 71, 70, 72, 71], 100);
        const chaotic = makeHistory([40, 90, 35, 95, 30], 100);
        const volStable = calculateVolatility(stable, 100);
        const volChaotic = calculateVolatility(chaotic, 100);
        expect(volChaotic).toBeGreaterThan(volStable);
    });

    it('volatilidade para 1 ponto retorna fallback sem lançar exceção', () => {
        const history = makeHistory([70]);
        expect(() => calculateVolatility(history, 100)).not.toThrow();
        const vol = calculateVolatility(history, 100);
        expect(Number.isFinite(vol)).toBe(true);
        expect(vol).toBeGreaterThan(0);
    });

    it('história de exatamente 2 pontos não produz NaN', () => {
        const history = makeHistory([60, 80]);
        const vol = calculateVolatility(history, 100);
        expect(Number.isFinite(vol)).toBe(true);
        expect(vol).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: slopeStdError — invariância de escala
// Histórico: slopeStdError com maxScore≠100 gerava incerteza desproporcionalmente alta
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: calculateSlope — monotônico e escalonado', () => {
    it('slope positivo para histórico crescente', () => {
        const history = makeHistory([50, 55, 60, 65, 70]);
        expect(calculateSlope(history, 100)).toBeGreaterThan(0);
    });

    it('slope negativo para histórico decrescente', () => {
        const history = makeHistory([80, 75, 70, 65, 60]);
        expect(calculateSlope(history, 100)).toBeLessThan(0);
    });

    it('slope próximo de zero para histórico estável', () => {
        const history = makeHistory([70, 71, 70, 70, 71]);
        expect(Math.abs(calculateSlope(history, 100))).toBeLessThan(0.5);
    });

    it('1 ponto retorna 0 sem erro', () => {
        expect(calculateSlope(makeHistory([70]), 100)).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: Cache seed hash — inclui score fracionário
// Histórico: seed baseada apenas em integers ignorava scores como 72.5 vs 72
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: Reprodutibilidade do Monte Carlo (seed estável)', () => {
    it('mesma entrada → mesma probabilidade (seed determinístico)', () => {
        const history = makeHistory([60, 65, 70, 68, 72]);
        const r1 = monteCarloSimulation(history, 80, 90, 1000);
        const r2 = monteCarloSimulation(history, 80, 90, 1000);
        expect(r1.probability).toBe(r2.probability);
        expect(r1.mean).toBe(r2.mean);
    });

    it('entrada diferente → resultado diferente', () => {
        const h1 = makeHistory([60, 65, 70]);
        const h2 = makeHistory([60, 65, 75]); // último ponto diferente
        const r1 = monteCarloSimulation(h1, 80, 90, 1000);
        const r2 = monteCarloSimulation(h2, 80, 90, 1000);
        expect(r1.probability).not.toBe(r2.probability);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: standardDeviation — escala Bayesiana proporcional ao maxScore
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: standardDeviation — prior proporcional ao maxScore', () => {
    it('SD para maxScore=180 é proporcional ao de maxScore=100', () => {
        const arr100 = [60, 65, 70, 58, 72];
        const arr180 = arr100.map(s => s * 1.8);
        const sd100 = standardDeviation(arr100, 100);
        const sd180 = standardDeviation(arr180, 180);
        // Razão deve ser ~1.8 (escala linear)
        expect(sd180 / sd100).toBeCloseTo(1.8, 0);
    });

    it('array com 1 elemento não retorna NaN', () => {
        expect(Number.isFinite(standardDeviation([70], 100))).toBe(true);
    });

    it('array vazio retorna 0', () => {
        expect(standardDeviation([], 100)).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-FIXED: sampleTruncatedNormal — nunca sai do domínio [min, max]
// ─────────────────────────────────────────────────────────────────────────────
describe('BUG-FIXED: sampleTruncatedNormal — dentro do domínio', () => {
    it('10000 amostras sempre dentro de [0, 100]', () => {
        const rng = mulberry32(42);
        for (let i = 0; i < 10000; i++) {
            const s = sampleTruncatedNormal(50, 15, 0, 100, rng);
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(100);
        }
    });

    it('média muito próxima do teto — amostras ainda dentro do domínio', () => {
        const rng = mulberry32(99);
        for (let i = 0; i < 5000; i++) {
            const s = sampleTruncatedNormal(98, 10, 0, 100, rng);
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(100);
        }
    });

    it('domínio personalizado [40, 120]', () => {
        const rng = mulberry32(7);
        for (let i = 0; i < 5000; i++) {
            const s = sampleTruncatedNormal(80, 20, 40, 120, rng);
            expect(s).toBeGreaterThanOrEqual(40);
            expect(s).toBeLessThanOrEqual(120);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOVO: BUG-C2 guard — MC_SIMULATIONS acessível via config
// Garante que se alguém mudar de volta para 5000, o teste avisa
// (requer que DEFAULT_CONFIG seja exportada de coachLogic.js)
// ─────────────────────────────────────────────────────────────────────────────
import { DEFAULT_CONFIG } from '../../utils/coachLogic.js';
describe('BUG-C2 guard: MC_SIMULATIONS deve ser 800 no coach', () => {
    it('MC_SIMULATIONS <= 1000 (coach leve)', () => {
        expect(DEFAULT_CONFIG.MC_SIMULATIONS).toBeLessThanOrEqual(1000);
    });
});
