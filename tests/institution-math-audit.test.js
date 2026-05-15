import { describe, it, expect } from 'vitest';
import { 
    monteCarloSimulation, 
    calculateRobustVolatility,
    weightedRegression
} from '../src/engine/projection.js';
import { computeStackingWeights } from '../src/utils/calibration.js';

describe('Auditoria de Nova Matemática - Suporte Institucional', () => {

    describe('Domínios Não-Zero (minScore > 0)', () => {
        it('monteCarloSimulation deve respeitar o piso minScore via Reflected Brownian Motion', () => {
            const history = [
                { date: '2026-05-01', score: 60 },
                { date: '2026-05-02', score: 65 }
            ];
            // Projeção com volatilidade forçada alta para testar os limites
            const result = monteCarloSimulation(history, 80, 60, 1000, { 
                forcedVolatility: 40,
                maxScore: 100,
                minScore: 50
            });

            expect(result.mean).toBeGreaterThanOrEqual(50);
            expect(result.ci95Low).toBeGreaterThanOrEqual(50);
            expect(result.ci95High).toBeLessThanOrEqual(100);
        });

        it('calculateRobustVolatility deve escalar o piso (4%) baseado no range (max - min)', () => {
            const history = [{ date: '2026-05-01', score: 75 }];
            // Com N=1, o fallback é 0.05 * range (conforme linha 163 de projection.js)
            // Range = 100 - 50 = 50. 5% de 50 = 2.5.
            const vol = calculateRobustVolatility(history, 100, 50);
            expect(vol).toBeCloseTo(2.5, 1);
        });
    });

    describe('Calibração e Stacking (Log Loss)', () => {
        it('computeStackingWeights deve penalizar severamente "falsas certezas" via Log Loss', () => {
            const observed = [1, 0];
            
            // Candidato A: Acertou com 80% e Errou com 20% (Bom)
            // Candidato B: Acertou com 99% e Errou com 99% (Falsa Certeza Desastrosa no segundo)
            const candidateA = [0.8, 0.2];
            const candidateB = [0.99, 0.99]; 
            
            const weights = computeStackingWeights([candidateA, candidateB], observed);
            
            // O peso do Candidato A deve ser muito superior ao de B devido à Log Loss (entropia)
            expect(weights[0]).toBeGreaterThan(0.9);
            expect(weights[1]).toBeLessThan(0.1);
        });
    });

    describe('Regressão e Drift Damping', () => {
        it('O drift deve sofrer damping logarítmico em projeções longas', () => {
            const history = [
                { date: '2026-01-01', score: 10 },
                { date: '2026-01-30', score: 20 }
            ];
            // Projeção curta (1 dia) -> Drift quase total
            const resShort = monteCarloSimulation(history, 90, 1, 1000);
            
            // Projeção longa (365 dias) -> O drift médio diário deve ser menor devido ao damping 1/(1 + d/45)
            const resLong = monteCarloSimulation(history, 90, 365, 1000);
            
            // Calculamos o ganho médio diário a partir do currentMean (baseline real)
            const dailyGainShort = (resShort.mean - resShort.currentMean) / 1;
            const dailyGainLong = (resLong.mean - resLong.currentMean) / 365;
            
            // O ganho diário na projeção longa deve ser significativamente menor que na curta
            expect(dailyGainLong).toBeLessThan(dailyGainShort);
        });
    });

});
