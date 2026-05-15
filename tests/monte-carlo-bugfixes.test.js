import { describe, it, expect } from 'vitest';
import { simulateNormalDistribution, simularMonteCarlo } from '../src/engine/monteCarlo.js';
import { calculateVolatility, monteCarloSimulation } from '../src/engine/projection.js';

describe('Monte Carlo Bugfixes Validation', () => {

    it('Bug 1: Bayesian Floor deve funcionar para histórico zero', () => {
        const res = simulateNormalDistribution({
            mean: 50,
            simulations: 100,
            historyLength: 0,
            maxScore: 100,
            minScore: 0
        });
        
        // Com o fix, safeSD deve ser floorVolatility (4% de 100 = 4)
        // O SD projetado deve ser próximo de 4, não 0.
        expect(res.volatility).toBeGreaterThan(3.5);
    });

    it('Bug 2: simularMonteCarlo deve usar QuickSelect (implicitamente validado por não travar)', () => {
        const history = [80, 85, 90];
        const res = simularMonteCarlo({ volumeSemanasAnteriores: history }, 1000);
        
        expect(res.p50).toBeGreaterThan(80);
        expect(res.p50).toBeLessThan(90);
        expect(res.p10).toBeLessThan(res.p50);
        expect(res.p90).toBeGreaterThan(res.p50);
    });

    it('Bug 3: calculateVolatility deve retornar fallback de 5% (não NaN) com N=1', () => {
        const history = [{ score: 80 }];
        const sd = calculateVolatility(history, 100, 0);
        // 0.05 * 100 = 5
        expect(sd).toBe(5);
    });

    it('Bug 4: monteCarloSimulation deve lidar com range zero (minScore === maxScore)', () => {
        const history = [{ date: '2026-05-14', score: 100 }];
        const res = monteCarloSimulation(history, 100, 10, 100, {
            minScore: 100,
            maxScore: 100
        });
        
        expect(res.mean).toBe(100);
        expect(Number.isFinite(res.sd)).toBe(true);
    });
    
    it('Bug 5: Reflected Brownian Motion não deve gerar NaN em scores normais', () => {
        const history = [{ date: '2026-05-14', score: 50 }];
        const res = monteCarloSimulation(history, 80, 30, 500);
        
        expect(Number.isFinite(res.mean)).toBe(true);
        expect(res.mean).toBeGreaterThanOrEqual(0);
        expect(res.mean).toBeLessThanOrEqual(100);
    });

});
