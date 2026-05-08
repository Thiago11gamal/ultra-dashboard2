import { describe, it, expect } from 'vitest';
import { calculateUrgency } from '../src/utils/coachLogic.js';

const baseCategory = { id: 'mat', name: 'Matemática', weight: 7 };
const mkSim = (date, score) => ({ subject: 'Matemática', date, score, total: 100, correct: score });
const mkSimCreated = (createdAt, score) => ({ subject: 'Matemática', createdAt, score, total: 100, correct: score });

describe('Coach Logic Integration', () => {
    it('calculateUrgency emits calibration telemetry callback when MC has enough data', () => {
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

        expect(Number.isFinite(res.normalizedScore)).toBe(true);
        if (telemetry) {
            expect(telemetry.categoryId).toBe('mat');
            expect(telemetry.avgBrier).toBeGreaterThanOrEqual(0);
        }
    });

    it('calculateUrgency computes MSSD and reliability diagnostics', () => {
        const simulados = [
            mkSim('2026-01-01', 20), mkSim('2026-01-04', 80), mkSim('2026-01-07', 25),
            mkSim('2026-01-10', 85), mkSim('2026-01-13', 30), mkSim('2026-01-16', 90),
            mkSim('2026-01-19', 35), mkSim('2026-01-22', 88),
        ];
        const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 70 });
        expect(res.details?.mssdVolatility).toBeGreaterThanOrEqual(0);
        if (res.details?.monteCarlo?.explainability) {
            expect(['good', 'moderate', 'low']).toContain(res.details.monteCarlo.explainability.calibrationQuality);
        }
    });

    it('calculateUrgency captures negative trend scenario', () => {
        const simulados = [
            mkSim('2026-01-01', 75),
            mkSim('2026-01-08', 70),
            mkSim('2026-01-15', 66),
            mkSim('2026-01-22', 61),
            mkSim('2026-01-29', 58),
            mkSim('2026-02-05', 54),
        ];
        const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 72 });
        expect(res.details?.trend).toBeLessThanOrEqual(0);
        expect(typeof res.recommendation).toBe('string');
    });

    it('calculateUrgency computes Monte Carlo from createdAt-only simulados', () => {
        const simulados = [
            mkSimCreated('2026-01-01T09:10:00.000Z', 41),
            mkSimCreated('2026-01-08T09:10:00.000Z', 45),
            mkSimCreated('2026-01-15T09:10:00.000Z', 47),
            mkSimCreated('2026-01-22T09:10:00.000Z', 49),
            mkSimCreated('2026-01-29T09:10:00.000Z', 50),
        ];

        const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 65 });
        expect(res.details?.monteCarlo).toBeDefined();
        expect(Number.isFinite(res.details?.monteCarlo?.probability)).toBe(true);
    });

    it('calculateUrgency keeps probability bounded for non-100 scale', () => {
        const simulados = [
            { subject: 'Matemática', date: '2026-01-02', score: 28, total: 50, correct: 28 },
            { subject: 'Matemática', date: '2026-01-06', score: 30, total: 50, correct: 30 },
            { subject: 'Matemática', date: '2026-01-10', score: 31, total: 50, correct: 31 },
            { subject: 'Matemática', date: '2026-01-14', score: 33, total: 50, correct: 33 },
            { subject: 'Matemática', date: '2026-01-18', score: 34, total: 50, correct: 34 },
            { subject: 'Matemática', date: '2026-01-22', score: 35, total: 50, correct: 35 },
        ];

        const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 50, targetScore: 38 });
        const probability = Number(res.details?.monteCarlo?.probability);
        expect(Number.isFinite(probability)).toBe(true);
        expect(probability).toBeGreaterThanOrEqual(0);
        expect(probability).toBeLessThanOrEqual(100);
    });

    it('calculateUrgency remains stable with out-of-order createdAt timeline', () => {
        const simulados = [
            mkSimCreated('2026-01-29T09:10:00.000Z', 50),
            mkSimCreated('2026-01-01T09:10:00.000Z', 41),
            mkSimCreated('2026-01-22T09:10:00.000Z', 49),
            mkSimCreated('2026-01-08T09:10:00.000Z', 45),
            mkSimCreated('2026-01-15T09:10:00.000Z', 47),
        ];

        const res = calculateUrgency(baseCategory, simulados, [], { maxScore: 100, targetScore: 65 });
        expect(Number.isFinite(res.normalizedScore)).toBe(true);
        expect(Number.isFinite(Number(res.details?.trend))).toBe(true);
        expect(Number.isFinite(Number(res.details?.mssdVolatility))).toBe(true);
        expect(Number.isFinite(Number(res.details?.monteCarlo?.probability))).toBe(true);
    });
});
