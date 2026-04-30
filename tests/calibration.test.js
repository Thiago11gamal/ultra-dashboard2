import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral, computeRollingCalibrationParams } from '../src/utils/calibration.js';

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

test('computeRollingCalibrationParams adapts baseline and cap from history', () => {
    const hist = [{ avgBrier: 0.22 }, { avgBrier: 0.3 }, { avgBrier: 0.24 }, { avgBrier: 0.18 }];
    const params = computeRollingCalibrationParams(hist, { baseline: 0.18, maxPenalty: 0.25 });
    assert.ok(params.baseline >= 0.12 && params.baseline <= 0.3);
    assert.ok(params.maxPenalty >= 0.12 && params.maxPenalty <= 0.4);
});
