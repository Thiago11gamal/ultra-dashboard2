import { describe, it, expect } from 'vitest';
import { 
    monteCarloSimulation, 
    getSortedHistory, 
    weightedRegression,
    calculateRobustVolatility,
    projectScore
} from '../src/engine/projection.js';

describe('Stochastic Engine - High Precision Audit (Versão 9.5)', () => {

    describe('getSortedHistory (Schwartzian Transform)', () => {
        it('deve ordenar corretamente e lidar com IDs para desempate', () => {
            const history = [
                { id: 'b', date: '2026-05-14T12:00:00Z', score: 80 },
                { id: 'a', date: '2026-05-14T12:00:00Z', score: 90 },
                { id: 'c', date: '2026-05-13T12:00:00Z', score: 70 }
            ];
            const sorted = getSortedHistory(history);
            expect(sorted[0].id).toBe('c'); // Data anterior
            expect(sorted[1].id).toBe('a'); // Desempate por ID (a < b)
            expect(sorted[2].id).toBe('b');
        });

        it('deve lidar com entradas com datas inválidas (Epoch fallback)', () => {
            const history = [
                { date: 'invalid', score: 50 },
                { date: '2026-05-14', score: 60 }
            ];
            const sorted = getSortedHistory(history);
            // safeDateParse retorna new Date(0) para 'invalid'
            expect(sorted.length).toBe(2);
            expect(sorted[0].score).toBe(50); // Epoch 1970 vem primeiro
            expect(sorted[1].score).toBe(60);
        });
    });

    describe('weightedRegression (Kahan & Tikhonov)', () => {
        it('deve ser estável com Ridge Penalty mesmo em amostras quase singulares', () => {
            // Dois pontos idênticos (det ≈ 0 sem regularização)
            const history = [
                { date: '2026-05-14', score: 70 },
                { date: '2026-05-14', score: 70 }
            ];
            const res = weightedRegression(history);
            expect(res.slope).toBeCloseTo(0, 10);
            expect(Number.isFinite(res.slopeStdError)).toBe(true);
        });

        it('deve respeitar o clamp de 5% ao dia sustentadamente', () => {
            const history = [
                { date: '2026-05-01', score: 0 },
                { date: '2026-05-02', score: 100 }
            ];
            const res = weightedRegression(history, 0.08, 100);
            // 100% em 1 dia é muito acima do limite de 5%
            expect(res.slope).toBeLessThanOrEqual(5); 
        });
    });

    describe('GARCH(1,1) & O-U Dynamics', () => {
        it('deve manter a variância estacionária em projeções longas (Omega fix)', () => {
            const history = [
                { date: '2026-05-01', score: 70 },
                { date: '2026-05-02', score: 72 },
                { date: '2026-05-03', score: 69 }
            ];
            // 365 dias de simulação. Sem omega estacionário, a variância implodiria.
            const result = monteCarloSimulation(history, 85, 365, 500);
            expect(result.sd).toBeGreaterThan(0);
            expect(result.ci95High).toBeGreaterThan(result.ci95Low);
        });

        it('deve mostrar reversão à média (O-U) para baselines históricos', () => {
            const history = [
                { date: '2026-05-01', score: 50 },
                { date: '2026-05-02', score: 50 },
                { date: '2026-05-03', score: 90 } // Outlier recente
            ];
            // Com O-U, a média projetada deve ser menor que o último ponto (90) 
            // devido à "gravidade" do baseline (50).
            const result = monteCarloSimulation(history, 95, 60, 500);
            expect(result.mean).toBeLessThan(90);
        });
    });

    describe('Reflected Brownian Motion (RBM)', () => {
        it('nunca deve vazar o domínio [0, 100] via espelhamento contínuo', () => {
            const history = [
                { date: '2026-05-01', score: 95 },
                { date: '2026-05-02', score: 98 }
            ];
            // Projeção agressiva com alta volatilidade forçada
            const result = monteCarloSimulation(history, 100, 90, 500, { 
                forcedVolatility: 50,
                maxScore: 100,
                minScore: 0
            });
            expect(result.ci95High).toBeLessThanOrEqual(100);
            expect(result.ci95Low).toBeGreaterThanOrEqual(0);
        });
    });

    describe('projectScore (Legacy Bridge)', () => {
        it('deve usar Logistic (S-Curve) para históricos maduros', () => {
            const history = [
                { date: '2026-04-01', score: 30 },
                { date: '2026-04-10', score: 50 },
                { date: '2026-04-20', score: 75 },
                { date: '2026-04-30', score: 85 }
            ];
            const res = projectScore(history, 30);
            expect(res.projected).toBeGreaterThan(85);
            expect(res.projected).toBeLessThanOrEqual(100);
        });
    });
});
