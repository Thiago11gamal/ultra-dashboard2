import { describe, it, expect } from 'vitest';
import { computeAdaptiveSignal, deriveAdaptiveConfig, getConfidenceMultiplier, winsorizeSeries } from '../src/utils/adaptiveMath.js';

describe('Adaptive Math Utilities', () => {
    it('getConfidenceMultiplier decreases toward asymptotic normal value', () => {
        const small = getConfidenceMultiplier(3);
        const large = getConfidenceMultiplier(100);
        expect(small).toBeGreaterThan(large);
        expect(large).toBeGreaterThanOrEqual(1.96);
    });

    it('winsorizeSeries clamps extremes', () => {
        const values = [10, 11, 12, 13, 200];
        const clamped = winsorizeSeries(values, 0.2, 0.6);
        expect(clamped[4]).toBeLessThan(200);
    });

    it('deriveAdaptiveConfig returns bounded parameters', () => {
        const cfg = deriveAdaptiveConfig([50, 52, 49, 60, 55, 58]);
        expect(cfg.lambda).toBeGreaterThan(0);
        expect(cfg.lambda).toBeLessThan(1);
        expect(cfg.lowWinsor).toBeGreaterThanOrEqual(0.03);
        expect(cfg.lowWinsor).toBeLessThanOrEqual(0.12);
        expect(cfg.highWinsor).toBeGreaterThan(cfg.lowWinsor);
    });

    it('computeAdaptiveSignal returns effective sample and inflation', () => {
        const signal = computeAdaptiveSignal([40, 42, 41, 45, 47, 44, 46]);
        expect(signal.effectiveN).toBeGreaterThanOrEqual(1);
        expect(signal.ciInflation).toBeGreaterThanOrEqual(1);
    });
});
