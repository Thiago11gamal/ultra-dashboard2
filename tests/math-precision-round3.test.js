import { describe, it, expect } from 'vitest';
import { buildAchievementStats, countPomodorosToday, getCompleteReport } from '../src/utils/analytics.js';
import { calculateTimeWeightedEMA } from '../src/engine/stats.js';
import { calculateVolatility } from '../src/engine/projection.js';
import { analisarDesempenhoHistorico } from '../src/utils/coachLogic.js';
import { computeCategoryDiagnostics } from '../src/engine/diagnostics.js';

describe('Math precision round 3', () => {
    it('buildAchievementStats: accuracy usa histórico e simuladoRows juntos', () => {
        const contest = {
            simuladoRows: [],
            studyLogs: [],
            studySessions: [],
            categories: [{
                maxScore: 100,
                simuladoStats: {
                    history: [
                        { score: 80, total: 0, date: '2026-06-20' },
                        { correct: 15, total: 20, date: '2026-06-21' }
                    ]
                },
                tasks: []
            }],
            user: {},
            settings: { pomodoroWork: 25 }
        };

        const stats = buildAchievementStats(contest);
        expect(stats.totalQuestions).toBeGreaterThan(20);
        expect(stats.accuracy).toBeGreaterThan(0);
        expect(stats.accuracy).toBeLessThanOrEqual(100);
    });

    it('countPomodorosToday aceita duration como fallback de minutes', () => {
        const today = new Date().toISOString();
        expect(countPomodorosToday([{ date: today, duration: 50 }], 25, 0)).toBe(2);
    });

    it('getCompleteReport usa pomodoros de hoje, não lifetime', () => {
        const today = new Date().toISOString();
        const report = getCompleteReport({
            studyLogs: [{ date: today, minutes: 25 }],
            studySessions: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, duration: 25, startTime: today })),
            categories: [{ tasks: Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, completed: false, priority: 'high' })) }],
            user: { level: 1 },
            settings: { pomodoroWork: 25 }
        });
        expect(report.goals.current).toBe(1);
        expect(report.goals.daily).toBeGreaterThan(1);
        expect(report.goals.progress).toBeLessThan(100);
    });

    it('calculateTimeWeightedEMA aceita date sem timestamp', () => {
        const ema = calculateTimeWeightedEMA([
            { score: 50, date: '2026-01-01' },
            { score: 60, date: '2026-01-15' },
            { score: 70, date: '2026-02-01' }
        ], 0.08);
        expect(Number.isFinite(ema)).toBe(true);
        expect(ema).toBeGreaterThan(50);
    });

    it('calculateVolatility retorna fallback quando scores filtrados < 2', () => {
        const vol = calculateVolatility([{ score: 'x' }, { score: 'y' }], 100, 0);
        expect(vol).toBeGreaterThan(0);
    });

    it('analisarDesempenhoHistorico normaliza acertos para escala 0-100', () => {
        const result = analisarDesempenhoHistorico([
            { acertos: 15, total: 20, diasRevisao: 1 },
            { acertos: 18, total: 20, diasRevisao: 3 }
        ]);
        expect(result.projecaoRetencao).toBeGreaterThan(50);
    });

    it('computeCategoryDiagnostics usa correct/total via getSafeScore', () => {
        const diag = computeCategoryDiagnostics({
            history: [{ correct: 8, total: 10, date: '2026-06-01' }],
            maxScore: 100
        });
        expect(diag.forgetting).toBeDefined();
        expect(diag.consistency).toBeDefined();
        expect(Number.isFinite(diag.forgetting.retentionPct)).toBe(true);
    });
});
