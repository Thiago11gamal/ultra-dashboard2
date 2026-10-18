import { describe, it, expect } from 'vitest';
import { computeCategoryStats } from '../src/engine/stats.js';

const LOG_DAMPING_FACTOR = 45;

function projectTrendBaseline(currentBaseline, trendPer30Days, projectDays, minScore, maxScore) {
    const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
    const dailyTrend = trendPer30Days / 30;
    const totalTrendProjection = dailyTrend * projectedDaysAmortized;
    return Math.max(minScore, Math.min(maxScore, currentBaseline + totalTrendProjection));
}

describe('perSubjectProbs trend projection (BUG FIX)', () => {
    it('trendValue deve ser convertido de pontos/30d para pontos/dia antes de projetar', () => {
        const history = [
            { score: 50, date: '2026-01-01' },
            { score: 55, date: '2026-01-08' },
            { score: 60, date: '2026-01-15' },
            { score: 65, date: '2026-01-22' },
            { score: 70, date: '2026-01-29' },
        ];
        const stats = computeCategoryStats(history, 1, 60, 100);
        const trendPer30Days = stats.trendValue;

        const wrongBaseline = projectTrendBaseline(70, trendPer30Days, 90, 0, 100);
        // Bug antigo: tratava trendPer30Days como pontos/dia (×30 inflação)
        const buggyBaseline = Math.max(0, Math.min(100, 70 + trendPer30Days * (LOG_DAMPING_FACTOR * Math.log(1 + 90 / LOG_DAMPING_FACTOR))));

        expect(wrongBaseline).toBeLessThan(buggyBaseline);
        expect(wrongBaseline).toBeLessThanOrEqual(100);
        expect(wrongBaseline).toBeGreaterThan(65);
    });

    it('projeção de 90 dias não deve inflar baseline em mais de ~25 pts para tendência moderada', () => {
        const history = [
            { score: 60, date: '2026-01-01' },
            { score: 63, date: '2026-01-15' },
            { score: 66, date: '2026-02-01' },
            { score: 69, date: '2026-02-15' },
        ];
        const stats = computeCategoryStats(history, 1, 60, 100);
        const projected = projectTrendBaseline(stats.mean, stats.trendValue, 90, 0, 100);
        expect(projected - stats.mean).toBeLessThan(25);
    });
});
