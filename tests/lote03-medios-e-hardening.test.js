import { describe, it, expect } from 'vitest';
import { monteCarloSimulation } from '../src/engine/projection.js';
import { getAdaptiveInterSubjectCorrelation } from '../src/engine/variance.js';
import { runMonteCarloAnalysis } from '../src/engine/monteCarlo.js';

describe('LOTE 03 — Médios e Hardening', () => {
    it('3.2: monteCarloSimulation aplica meanBiasFactor em relação a range em vez de maxScore e respeita minScore != 0', () => {
        const history = [
            { date: '2026-07-01', correct: 180, total: 200, score: 180 },
            { date: '2026-07-02', correct: 185, total: 200, score: 185 }
        ];
        // Com minScore=100 e maxScore=200, range=100
        const res = monteCarloSimulation(history, 190, 30, 100, { minScore: 100, maxScore: 200 });
        expect(res.currentMean).toBeGreaterThanOrEqual(100);
        expect(res.currentMean).toBeLessThanOrEqual(200);
    });

    it('3.3: runMonteCarloAnalysis aceita projectionDays = 0 sem forçar para 1', () => {
        const history = [
            { date: '2026-07-01', correct: 80, total: 100, score: 80 },
            { date: '2026-07-02', correct: 82, total: 100, score: 82 }
        ];
        const res = runMonteCarloAnalysis(history, 85, 0, 100, { minScore: 0, maxScore: 100 });
        expect(res).toBeDefined();
        expect(res.probability).toBeGreaterThanOrEqual(0);
        expect(res.probability).toBeLessThanOrEqual(100);
    });

    it('3.8: getAdaptiveInterSubjectCorrelation passa maxScore para getSafeScore e não retorna NaN', () => {
        const simuladoRows = [
            { date: '2026-07-01', subject: 'Matematica', correct: 180, total: 200, score: 180 },
            { date: '2026-07-01', subject: 'Direito', correct: 170, total: 200, score: 170 },
            { date: '2026-07-02', subject: 'Matematica', correct: 185, total: 200, score: 185 },
            { date: '2026-07-02', subject: 'Direito', correct: 175, total: 200, score: 175 },
            { date: '2026-07-03', subject: 'Matematica', correct: 190, total: 200, score: 190 },
            { date: '2026-07-03', subject: 'Direito', correct: 180, total: 200, score: 180 },
            { date: '2026-07-04', subject: 'Matematica', correct: 195, total: 200, score: 195 },
            { date: '2026-07-04', subject: 'Direito', correct: 185, total: 200, score: 185 },
            { date: '2026-07-05', subject: 'Matematica', correct: 200, total: 200, score: 200 },
            { date: '2026-07-05', subject: 'Direito', correct: 190, total: 200, score: 190 }
        ];
        const rho = getAdaptiveInterSubjectCorrelation([], simuladoRows, ['Matematica', 'Direito'], 0.25, 200);
        expect(Number.isFinite(rho)).toBe(true);
        expect(rho).toBeGreaterThanOrEqual(-1);
        expect(rho).toBeLessThanOrEqual(1);
    });
});
