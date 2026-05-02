import { describe, it, expect } from 'vitest';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral, computeRollingCalibrationParams } from '../src/utils/calibration.js';

describe('Calibration Utilities', () => {
    it('computeBrierScore clamps probability and computes squared error', () => {
        expect(Math.abs(computeBrierScore(0.8, 1) - 0.04)).toBeLessThan(1e-9);
        expect(computeBrierScore(1.5, 0)).toBe(1);
        expect(computeBrierScore(-1, 1)).toBe(1);
    });

    it('summarizeCalibration returns neutral values for empty input', () => {
        const res = summarizeCalibration([]);
        expect(res.avgBrier).toBe(0);
        expect(res.calibrationPenalty).toBe(0);
    });

    it('summarizeCalibration caps penalty at 0.25', () => {
        const res = summarizeCalibration([1, 1, 1]);
        expect(res.avgBrier).toBe(1);
        expect(res.calibrationPenalty).toBe(0.25);
    });

    it('summarizeCalibration supports configurable baseline and cap', () => {
        const res = summarizeCalibration([0.5, 0.5], { baseline: 0.1, maxPenalty: 0.2 });
        expect(res.avgBrier).toBe(0.5);
        expect(res.calibrationPenalty).toBe(0.2);
    });

    it('shrinkProbabilityToNeutral applies bounded penalty', () => {
        const shrunk = shrinkProbabilityToNeutral(80, 0.2, 50);
        expect(shrunk).toBe(74);

        const bounded = shrinkProbabilityToNeutral(90, 0.9, 50);
        expect(bounded).toBe(70);

        const customBound = shrinkProbabilityToNeutral(90, 0.9, 40, 0.2);
        expect(customBound).toBe(80);
    });

    it('computeRollingCalibrationParams adapts baseline and cap from history', () => {
        const hist = [{ avgBrier: 0.22 }, { avgBrier: 0.3 }, { avgBrier: 0.24 }, { avgBrier: 0.18 }];
        const params = computeRollingCalibrationParams(hist, { baseline: 0.18, maxPenalty: 0.25 });
        expect(params.baseline).toBeGreaterThanOrEqual(0.12);
        expect(params.baseline).toBeLessThanOrEqual(0.3);
        expect(params.maxPenalty).toBeGreaterThanOrEqual(0.12);
        expect(params.maxPenalty).toBeLessThanOrEqual(0.4);
    });
});
