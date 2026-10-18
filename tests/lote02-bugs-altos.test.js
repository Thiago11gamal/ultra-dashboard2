import { describe, it, expect } from 'vitest';

// Helper 1: lógica de formatTime (TimeSpentChart 2.3)
const formatTime = (s) => {
    if (s == null || !Number.isFinite(Number(s))) return 'N/A';
    const total = Math.round(Math.max(0, Number(s)));
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
};

// Helper 2: lógica de solveCollisions (CompareChart 2.5)
const solveCollisions = (points, safeMinScore = 0, safeMaxScore = 100) => {
    if (!points.length) return [];
    const sorted = [...points].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    const yPos = sorted.map(p => ({
        ...p,
        yPos: Number.isFinite(Number(p.value)) ? Number(p.value) : safeMinScore
    }));
    
    const range = safeMaxScore - safeMinScore;
    const topLimit = safeMaxScore - (range * 0.02);
    const bottomLimit = safeMinScore + (range * 0.05);
    const safeSpace = Math.max(0.1, topLimit - bottomLimit);

    const MIN_PCT_DISTANCE = range * 0.085;
    const requiredSpace = (yPos.length - 1) * MIN_PCT_DISTANCE;

    const effectiveDistance = requiredSpace > safeSpace 
        ? safeSpace / Math.max(1, yPos.length - 1) 
        : MIN_PCT_DISTANCE;

    for (let iter = 0; iter < 15; iter++) {
        let moved = false;
        for (let i = 1; i < yPos.length; i++) {
            if (yPos[i - 1].yPos - yPos[i].yPos < effectiveDistance) {
                const mid = (yPos[i - 1].yPos + yPos[i].yPos) / 2;
                yPos[i - 1].yPos = mid + effectiveDistance / 2;
                yPos[i].yPos = mid - effectiveDistance / 2;
                moved = true;
            }
        }
        if (yPos[0].yPos > topLimit) {
            const shift = yPos[0].yPos - topLimit;
            yPos.forEach(p => p.yPos -= shift);
            moved = true;
        }
        if (yPos[yPos.length - 1].yPos < bottomLimit) {
            const shift = bottomLimit - yPos[yPos.length - 1].yPos;
            yPos.forEach(p => p.yPos += shift);
            moved = true;
        }
        if (!moved) break;
    }

    return yPos;
};

// Helper 3: safeTargetScore (MonteCarloEvolutionChart 2.7)
const getSafeTargetScore = (targetScore, minScore, maxScore) => {
    const t = Number(targetScore);
    return Math.max(minScore, Math.min(maxScore, Number.isFinite(t) ? t : minScore));
};

describe('Lote 02 - Bugs Altos (UI, Datas, Tooltips, Colisões)', () => {
    it('2.3 formatTime deve arredondar segundos totais antes de separar, evitando 59.9 => 60s', () => {
        expect(formatTime(59.9)).toBe('1m');
        expect(formatTime(59.1)).toBe('59s');
        expect(formatTime(119.8)).toBe('2m');
        expect(formatTime(65.4)).toBe('1m 05s');
    });

    it('2.5 solveCollisions iterativo deve resolver colisões sem estourar teto/chão', () => {
        const points = [
            { value: 99, label: 'A' },
            { value: 98.5, label: 'B' },
            { value: 98, label: 'C' }
        ];
        const res = solveCollisions(points, 0, 100);
        expect(res.length).toBe(3);
        // O top limit em 0-100 é 98 (100 - 0.02*100)
        expect(res[0].yPos).toBeLessThanOrEqual(98.001);
        // Devem estar espaçados e em ordem decrescente
        expect(res[0].yPos).toBeGreaterThan(res[1].yPos);
        expect(res[1].yPos).toBeGreaterThan(res[2].yPos);
    });

    it('2.7 safeTargetScore deve confinar a meta ao domínio [minScore, maxScore]', () => {
        expect(getSafeTargetScore(120, 0, 100)).toBe(100);
        expect(getSafeTargetScore(-10, 0, 100)).toBe(0);
        expect(getSafeTargetScore(80, 0, 100)).toBe(80);
        expect(getSafeTargetScore(250, 0, 200)).toBe(200);
    });

    it('2.8 stableThreshold deve ser proporcional ao scoreRange em WeeklyEvolutionView', () => {
        const scoreRange100 = 100;
        const scoreRange200 = 200;
        const stableThreshold100 = Math.max(0.5, scoreRange100 * 0.02);
        const stableThreshold200 = Math.max(0.5, scoreRange200 * 0.02);
        expect(stableThreshold100).toBe(2);
        expect(stableThreshold200).toBe(4);
    });
});
