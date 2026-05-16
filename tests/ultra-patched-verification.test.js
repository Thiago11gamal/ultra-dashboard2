import { describe, it, expect } from 'vitest';
import { 
    computeLogLoss, 
    computeBrierScore, 
    computeCalibrationDiagnostics,
    shrinkProbabilityToNeutral,
    computeBayesianLevel
} from '../src/engine/stats.js';

describe('Ultra-Patched Mathematical Verification', () => {

    describe('Log Loss (Entropy) vs Brier Score', () => {
        it('Log Loss should penalize "False Sense of Mastery" more severely than Brier', () => {
            // Overconfident prediction: 99% probability, but failure (0)
            const prob = 0.99;
            const observed = 0;
            
            const brier = computeBrierScore(prob, observed === 1);
            const logLoss = computeLogLoss(prob, observed === 1);
            
            // Brier = (0.99 - 0)^2 = 0.9801
            // LogLoss = -ln(1 - 0.99) = -ln(0.01) ≈ 4.605
            
            expect(brier).toBeLessThan(1); 
            expect(logLoss).toBeGreaterThan(4);
            expect(logLoss).toBeGreaterThan(brier * 4); // Log loss is much more sensitive to near-zero/one failures
        });

        it('Log Loss should handle epsilon clamping for 0 and 1 probabilities', () => {
            expect(Number.isFinite(computeLogLoss(0, false))).toBe(true);
            expect(Number.isFinite(computeLogLoss(1, true))).toBe(true);
            expect(computeLogLoss(1, false)).toBeGreaterThan(30); // Very high penalty for being 100% wrong
        });
    });

    describe('Calibration Diagnostics (Reliability Diagram)', () => {
        it('should correctly calculate ECE (Expected Calibration Error)', () => {
            const pairs = [
                { probability: 0.1, observed: 0 },
                { probability: 0.1, observed: 0 },
                { probability: 0.9, observed: 1 },
                { probability: 0.9, observed: 1 },
            ];
            // Perfect calibration: 
            // Bin 1 (prob ~0.1): 0/2 observed = 0.0 rate. Gap = 0.1
            // Bin 2 (prob ~0.9): 2/2 observed = 1.0 rate. Gap = 0.1
            // ECE = (2/4 * 0.1) + (2/4 * 0.1) = 0.1
            
            const diag = computeCalibrationDiagnostics(pairs, { bins: 5 });
            expect(diag.ece).toBeCloseTo(0.1, 2);
        });

        it('should detect high MCE (Maximum Calibration Error)', () => {
            const pairs = [
                { probability: 0.1, observed: 1 }, // 100% wrong in this bin
                { probability: 0.9, observed: 1 },
            ];
            const diag = computeCalibrationDiagnostics(pairs, { bins: 10 });
            expect(diag.mce).toBeGreaterThan(0.8);
        });
    });

    describe('Bayesian Variance Clamping', () => {
        it('should prevent variance collapse to zero even with identical perfect scores', () => {
            const history = [
                { score: 100, total: 100, date: '2026-05-01' },
                { score: 100, total: 100, date: '2026-05-02' },
                { score: 100, total: 100, date: '2026-05-03' }
            ];
            const stats = computeBayesianLevel(history, 1, 1, 100);
            
            // n should be high, but SD should be clamped
            expect(stats.sd).toBeGreaterThan(0);
            expect(stats.sd).toBeGreaterThanOrEqual(0.01); // At least 0.01% or something significant
        });
    });

    describe('Probability Shrinkage to Neutral', () => {
        it('should anchor predictions to the neutral (bayesian mean) value', () => {
            const rawProb = 90;
            const penalty = 0.2;
            const neutral = 60; // Aluno tem média 60%
            
            const shrunk = shrinkProbabilityToNeutral(rawProb, penalty, neutral);
            // 90 * (1 - 0.2) + 60 * 0.2 = 72 + 12 = 84
            expect(shrunk).toBe(84);
        });
    });

});
