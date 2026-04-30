import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral } from '../src/utils/calibration.js';

test('computeBrierScore clamps probability and computes squared error', () => {
    assert.ok(Math.abs(computeBrierScore(0.8, 1) - 0.04) < 1e-9);
    assert.equal(computeBrierScore(1.5, 0), 1);
    assert.equal(computeBrierScore(-1, 1), 1);
});

test('summarizeCalibration returns neutral values for empty input', () => {
    const res = summarizeCalibration([]);
    assert.equal(res.avgBrier, 0);
    assert.equal(res.calibrationPenalty, 0);
});

test('summarizeCalibration caps penalty at 0.25', () => {
    const res = summarizeCalibration([1, 1, 1]);
    assert.equal(res.avgBrier, 1);
    assert.equal(res.calibrationPenalty, 0.25);
});

test('summarizeCalibration supports configurable baseline and cap', () => {
    const res = summarizeCalibration([0.5, 0.5], { baseline: 0.1, maxPenalty: 0.2 });
    assert.equal(res.avgBrier, 0.5);
    assert.equal(res.calibrationPenalty, 0.2);
});

test('shrinkProbabilityToNeutral applies bounded penalty', () => {
    const shrunk = shrinkProbabilityToNeutral(80, 0.2, 50);
    assert.equal(shrunk, 74);

    const bounded = shrinkProbabilityToNeutral(90, 0.9, 50);
    assert.equal(bounded, 70);

    const customBound = shrinkProbabilityToNeutral(90, 0.9, 40, 0.2);
    assert.equal(customBound, 80);
});
