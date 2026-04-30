import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAdaptiveSignal, deriveAdaptiveConfig, getConfidenceMultiplier, winsorizeSeries } from '../src/utils/adaptiveMath.js';

test('getConfidenceMultiplier decreases toward asymptotic normal value', () => {
    const small = getConfidenceMultiplier(3);
    const large = getConfidenceMultiplier(100);
    assert.ok(small > large);
    assert.ok(large >= 1.96);
});

test('winsorizeSeries clamps extremes', () => {
    const values = [10, 11, 12, 13, 200];
    const clamped = winsorizeSeries(values, 0.2, 0.6);
    assert.ok(clamped[4] < 200);
});

test('deriveAdaptiveConfig returns bounded parameters', () => {
    const cfg = deriveAdaptiveConfig([50, 52, 49, 60, 55, 58]);
    assert.ok(cfg.lambda > 0 && cfg.lambda < 1);
    assert.ok(cfg.lowWinsor >= 0.03 && cfg.lowWinsor <= 0.12);
    assert.ok(cfg.highWinsor > cfg.lowWinsor);
});

test('computeAdaptiveSignal returns effective sample and inflation', () => {
    const signal = computeAdaptiveSignal([40, 42, 41, 45, 47, 44, 46]);
    assert.ok(signal.effectiveN >= 1);
    assert.ok(signal.ciInflation >= 1);
});
