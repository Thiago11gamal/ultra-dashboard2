import { describe, it, expect } from 'vitest';
import { simulateNormalDistribution } from '../src/engine/monteCarlo.js';
import { getCombinedHistory } from '../src/utils/coachLogic.js';

describe('Monte Carlo Gaussian Copula & Probability Audit', () => {
    it('accurately preserves compound standard deviation across correlated subjects', () => {
        // 3 subjects, each with mean 60, sd 10, equal weight
        // Under correlation rho = 0.25:
        // Compound variance = (1/3)^2 * [ 3*(10^2) + 6*(0.25*10*10) ]
        // = (1/9) * [ 300 + 150 ] = 450 / 9 = 50
        // Expected compound SD = sqrt(50) = 7.071
        // Previously, due to covariance decomposition double-scaling, compound SD blew up to ~29!
        const subjects = [
            { id: 'mat', name: 'Matematica', mean: 60, sd: 10, weight: 1, minScore: 0, maxScore: 100 },
            { id: 'fis', name: 'Fisica', mean: 60, sd: 10, weight: 1, minScore: 0, maxScore: 100 },
            { id: 'qui', name: 'Quimica', mean: 60, sd: 10, weight: 1, minScore: 0, maxScore: 100 }
        ];

        const result = simulateNormalDistribution({
            mean: 60,
            sd: 10,
            targetScore: 70,
            simulations: 6000,
            seed: 42,
            minScore: 0,
            maxScore: 100,
            subjects
        });

        expect(result.mean).toBeGreaterThan(58);
        expect(result.mean).toBeLessThan(62);

        // SD should be close to theoretical 7.07 (definitely not 29!)
        expect(result.sd).toBeGreaterThan(6.0);
        expect(result.sd).toBeLessThan(8.5);

        // Probability of score >= 70 with mean 60 and SD ~ 7.07:
        // Z = (70 - 60) / 7.07 = 1.414 -> P(Z >= 1.414) ~ 7.8% - 8.5%
        expect(result.probability).toBeGreaterThan(6);
        expect(result.probability).toBeLessThan(12);

        // Recommended probability matches empirical probability
        expect(result.recommendedProbability).toBeCloseTo(result.probability, 1);
    });

    it('sets analyticalProbability to empiricalProbability when multidimensional subjects are present', () => {
        const subjects = [
            { id: 's1', name: 'S1', mean: 75, sd: 5, weight: 1, minScore: 0, maxScore: 100 },
            { id: 's2', name: 'S2', mean: 75, sd: 5, weight: 1, minScore: 0, maxScore: 100 }
        ];

        const result = simulateNormalDistribution({
            mean: 50, // Single-variable mean differs from subjects
            sd: 20,
            targetScore: 75,
            simulations: 3000,
            seed: 123,
            subjects
        });

        // The analytical probability must not skew the empirical result
        expect(result.analyticalProbability).toBe(result.probability);
        expect(result.recommendedProbability).toBe(result.probability);
    });
});

describe('Coach AI History Scaling with non-zero minScore', () => {
    it('properly scales legacy history rows between [minScore, maxScore]', () => {
        const history = [
            { date: '2026-03-01', correct: 5, total: 10 } // 50%
        ];
        const simulados = [];

        // Scale 200 - 1000: 50% should be 600, not 500
        const combined = getCombinedHistory(history, simulados, 1000, 200);
        expect(combined.length).toBe(1);
        expect(combined[0].score).toBe(600);
    });
});
