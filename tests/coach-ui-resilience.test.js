import { describe, it, expect } from 'vitest';

describe('Coach UI & Data Structure Resilience', () => {
  it('prevents crashes when calibration audit logs contain null avgBrier or ece', () => {
    const sortedLogs = [
      { timestamp: 1700000000000, categoryName: 'Direito Constitucional', avgBrier: 0.15, ece: null },
      { timestamp: 1700000001000, categoryName: 'Direito Constitucional', avgBrier: null, ece: 0.08 }
    ];

    const categorySeriesMap = sortedLogs.reduce((acc, log) => {
      const cat = log?.categoryName || 'Categoria';
      const brier = log?.avgBrier !== null && log?.avgBrier !== undefined ? Number(log.avgBrier) : null;
      const ece = log?.ece !== null && log?.ece !== undefined ? Number(log.ece) : null;
      if (brier === null && ece === null) return acc;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        ts: Number(log?.timestamp) || 0,
        brier: brier ?? 0,
        ece: ece ?? 0
      });
      return acc;
    }, {});

    const points = categorySeriesMap['Direito Constitucional'] || [];
    expect(points.length).toBe(2);
    expect(points[0].brier).toBe(0.15);
    expect(points[0].ece).toBe(0);
    expect(points[1].brier).toBe(0);
    expect(points[1].ece).toBe(0.08);

    points.forEach(point => {
      expect(() => {
        const bLabel = Number.isFinite(point?.brier) ? point.brier.toFixed(3) : '-';
        const eLabel = Number.isFinite(point?.ece) ? point.ece.toFixed(3) : '-';
        expect(typeof bLabel).toBe('string');
        expect(typeof eLabel).toBe('string');
      }).not.toThrow();
    });
  });

  it('clamps Monte Carlo gauge probability within visible bounds (1% to 97%)', () => {
    const clampGaugeProb = (prob) => Math.min(97, Math.max(1, prob));

    expect(clampGaugeProb(100)).toBe(97);
    expect(clampGaugeProb(99.5)).toBe(97);
    expect(clampGaugeProb(0)).toBe(1);
    expect(clampGaugeProb(50)).toBe(50);
  });

  it('unifies monteCarlo data retrieval whether located at urgency.monteCarlo or urgency.details.monteCarlo', () => {
    const getMonteCarloData = (suggestion) => {
      const urgency = suggestion?.urgency?.details ?? { hasData: false };
      return suggestion?.urgency?.monteCarlo || suggestion?.urgency?.details?.monteCarlo || urgency?.monteCarlo;
    };

    const suggestionA = {
      urgency: {
        monteCarlo: { probability: 85, explainability: { note: 'Direct MC note' } }
      }
    };

    const suggestionB = {
      urgency: {
        details: {
          monteCarlo: { probability: 72, explainability: { note: 'Nested details MC note' } }
        }
      }
    };

    expect(getMonteCarloData(suggestionA)?.explainability?.note).toBe('Direct MC note');
    expect(getMonteCarloData(suggestionB)?.explainability?.note).toBe('Nested details MC note');
  });
});
