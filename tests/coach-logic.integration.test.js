import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateUrgency } from '../src/utils/coachLogic.js';

const baseCategory = { id: 'mat', name: 'Matemática', weight: 7 };
const mkSim = (date, score) => ({ subject: 'Matemática', date, score, total: 100, correct: score });

test('calculateUrgency emits calibration telemetry callback when MC has enough data', () => {
    const simulados = [
        mkSim('2026-01-01', 45),
        mkSim('2026-01-08', 48),
        mkSim('2026-01-15', 50),
        mkSim('2026-01-22', 52),
        mkSim('2026-01-29', 53),
        mkSim('2026-02-05', 55),
        mkSim('2026-02-12', 56),
        mkSim('2026-02-19', 58),
        mkSim('2026-02-26', 57),
    ];

    let telemetry = null;
    const res = calculateUrgency(baseCategory, simulados, [], {
        maxScore: 100,
        targetScore: 70,
        onCalibrationMetric: (payload) => { telemetry = payload; }
    });

    assert.ok(res.details?.monteCarlo);
    assert.ok(telemetry, 'Expected onCalibrationMetric callback to be called');
    assert.equal(telemetry.categoryId, 'mat');
    assert.ok(typeof telemetry.avgBrier === 'number');
    assert.ok(typeof telemetry.calibrationPenalty === 'number');
});

test('calculateUrgency returns explainability payload for monteCarlo', () => {
    const simulados = [
        mkSim('2026-01-01', 40),
        mkSim('2026-01-05', 42),
        mkSim('2026-01-10', 41),
        mkSim('2026-01-15', 44),
        mkSim('2026-01-20', 43),
        mkSim('2026-01-25', 46),
    ];

    const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 65 });
    const explainability = res.details?.monteCarlo?.explainability;

    assert.ok(explainability);
    assert.ok(['good', 'moderate', 'low'].includes(explainability.calibrationQuality));
    assert.ok(typeof explainability.confidenceAdjusted === 'boolean');
    assert.ok(typeof explainability.note === 'string');
});
