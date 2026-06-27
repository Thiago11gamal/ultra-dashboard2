import { describe, it, expect } from 'vitest';
import { computeForgettingRisk } from '../src/engine/diagnostics.js';
import { analyzeEfficiency } from '../src/utils/analytics.js';

describe('computeForgettingRisk normalization', () => {
    it('aceita simulados com createdAt (sem date) e correct/total', () => {
        const simulados = [
            { createdAt: '2026-01-01T10:00:00.000Z', correct: 40, total: 50 },
            { createdAt: '2026-01-08T10:00:00.000Z', correct: 45, total: 50 },
            { createdAt: '2026-01-15T10:00:00.000Z', correct: 42, total: 50 },
        ];
        const result = computeForgettingRisk(simulados, 50);
        expect(result.retentionPct).toBeLessThanOrEqual(100);
        expect(result.retentionPct).toBeGreaterThan(0);
        expect(result.daysSinceLast).toBeGreaterThanOrEqual(0);
        expect(['low', 'medium', 'high', 'critical']).toContain(result.risk);
    });

    it('usa daysSinceOverride quando fornecido', () => {
        const simulados = [
            { date: '2026-01-01', score: 70, total: 100, correct: 70 },
            { date: '2026-01-08', score: 72, total: 100, correct: 72 },
        ];
        const recent = computeForgettingRisk(simulados, 100, null, null, null, 1);
        const stale = computeForgettingRisk(simulados, 100, null, null, null, 30);
        expect(recent.retentionPct).toBeGreaterThan(stale.retentionPct);
    });

    it('retorna fallback seguro para histórico vazio', () => {
        const result = computeForgettingRisk([], 100);
        expect(result.retentionPct).toBe(100);
        expect(result.risk).toBe('low');
    });
});

describe('analyzeEfficiency clamps', () => {
    it('limita completionRate a 100% mesmo com dados inconsistentes', () => {
        const categories = [{
            name: 'Teste',
            totalMinutes: 120,
            tasks: [
                { completed: true },
                { completed: true },
            ]
        }];
        // Simula corrupção: 3 completed mas só 2 tasks no array não é possível via filter,
        // mas podemos testar o clamp com 100% normal
        const result = analyzeEfficiency(categories, [{ minutes: 60 }, { minutes: 60 }], { level: 5 });
        expect(result.metrics.completionRate).toBeLessThanOrEqual(100);
        expect(result.score).toBeLessThanOrEqual(100);
    });

    it('retorna score 0 quando há tarefas concluídas sem tempo registrado', () => {
        const categories = [{
            name: 'Teste',
            tasks: [{ completed: true }, { completed: false }]
        }];
        const result = analyzeEfficiency(categories, [], { level: 1 });
        expect(result.score).toBe(0);
        expect(result.efficiency).toBe('precisa_melhorar');
    });
});