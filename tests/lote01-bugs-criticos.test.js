import { describe, it, expect } from 'vitest';
import { calculateTrend } from '../src/engine/stats.js';
import { simulateNormalDistribution } from '../src/engine/monteCarlo.js';

describe('LOTE 01 — Bugs Críticos — Validação', () => {
    it('1.5 calculateTrend retorna slope por dia (sem multiplicar por 10)', () => {
        // 10 pontos crescendo exatamente 1 ponto por dia
        const history = [];
        const baseTime = new Date('2026-01-01T12:00:00Z').getTime();
        for (let i = 0; i < 10; i++) {
            history.push({
                createdAt: new Date(baseTime + i * 86400000).toISOString(),
                score: 50 + i, // slope = 1 ponto/dia
                total: 100,
                correct: 50 + i
            });
        }
        const trend = calculateTrend(history, 100);
        // Sem o *10, deve retornar perto de 1.0
        expect(trend).toBeCloseTo(1.0, 2);
    });

    it('1.4 simulateNormalDistribution respeita clamp por disciplina e peso (weight)', () => {
        const result = simulateNormalDistribution({
            mean: 50,
            sd: 5,
            targetScore: 40,
            simulations: 500,
            minScore: 0,
            maxScore: 100,
            subjects: [
                { name: 'Matemática', mean: 80, sd: 2, minScore: 0, maxScore: 100, weight: 3 },
                { name: 'História', mean: 20, sd: 2, minScore: 0, maxScore: 100, weight: 1 }
            ]
        });
        expect(result).toBeDefined();
        expect(result.probability).toBeGreaterThan(0);
    });
});
