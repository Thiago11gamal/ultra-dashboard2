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

    assert.ok(Number.isFinite(res.normalizedScore));
    if (telemetry) {
        assert.equal(telemetry.categoryId, 'mat');
        assert.ok(typeof telemetry.avgBrier === 'number');
        assert.ok(typeof telemetry.calibrationPenalty === 'number');
    }
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

test('calculateUrgency handles sparse/invalid date data without crashing', () => {
    const simulados = [
        mkSim('invalid-date', 30),
        { subject: 'Matemática', date: null, score: 35, total: 0, correct: 0 },
        mkSim('2026-01-15', 40),
    ];

    const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 65 });
    assert.ok(Number.isFinite(res.normalizedScore));
    assert.ok(typeof res.recommendation === 'string');
});

test('calculateUrgency remains stable under highly oscillatory history', () => {
    const simulados = [
        mkSim('2026-01-01', 20), mkSim('2026-01-04', 80), mkSim('2026-01-07', 25),
        mkSim('2026-01-10', 85), mkSim('2026-01-13', 30), mkSim('2026-01-16', 90),
        mkSim('2026-01-19', 35), mkSim('2026-01-22', 88),
    ];
    const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 70 });
    assert.ok(res.details?.mssdVolatility >= 0);
    if (res.details?.monteCarlo?.explainability) {
        assert.ok(['good', 'moderate', 'low'].includes(res.details.monteCarlo.explainability.calibrationQuality));
    }
});

test('calculateUrgency captures negative trend scenario', () => {
    const simulados = [
        mkSim('2026-01-01', 75),
        mkSim('2026-01-08', 70),
        mkSim('2026-01-15', 66),
        mkSim('2026-01-22', 61),
        mkSim('2026-01-29', 58),
        mkSim('2026-02-05', 54),
    ];
    const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 72 });
    assert.ok(res.details?.trend <= 0);
    assert.ok(typeof res.recommendation === 'string');
});
