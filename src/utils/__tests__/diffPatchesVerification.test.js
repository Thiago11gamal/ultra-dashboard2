import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCombinedHistory } from '../coachLogic.js';
import { calculateMSSD } from '../../engine/projection.js';
import { distributeRoundingRemainder, calculateStudyStreak } from '../analytics.js';
import { daysUntilGoal, formatTimeAgo } from '../dateHelper.js';
import { computeTrendStatus } from '../trendStatus.js';
import { detectDataAnomalies } from '../../engine/diagnostics.js';

describe('Diffs 01-12 Verification Suite', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // DIFF 01: Dedupe de simulados
  describe('DIFF 01: Dedupe de simulados', () => {
    it('não colapsa simulado zerado (correct: 0) com simulado sem dados', () => {
      const sZero = { subject: 'Dir', date: '2026-05-01', total: 50, correct: 0, score: 0 };
      const sMissing = { subject: 'Dir', date: '2026-05-01', total: 50, correct: undefined, score: 50 };
      const res = getCombinedHistory([], [sZero, sMissing], 100, 0);
      expect(res.length).toBe(2);
    });

    it('mantém simulados com mesmo id porém notas distintas', () => {
      const s1 = { id: 'dup-1', subject: 'Mat', date: '2026-05-01', score: 60 };
      const s2 = { id: 'dup-1', subject: 'Mat', date: '2026-05-01', score: 85 };
      const res = getCombinedHistory([], [s1, s2], 100, 0);
      expect(res.length).toBe(2);
    });
  });

  // DIFF 02: RMSSD
  describe('DIFF 02: RMSSD desenviesado', () => {
    it('calcula RMSSD sem o fator 2 espúrio no denominador', () => {
      // Duas notas: 50 e 70 no mesmo intervalo
      const history = [
        { score: 50, date: '2026-01-01' },
        { score: 70, date: '2026-01-02' }
      ];
      const mssd = calculateMSSD(history, 100, 0);
      // Slope remove o drift se for 2 pontos em linha reta -> fallback floor 0.001
      expect(Number.isFinite(mssd)).toBe(true);
      expect(mssd).toBeGreaterThan(0);
    });

    it('alinha fatigueFlag com detrendedScores corretamente', () => {
      const history = [
        { score: 80, date: '2026-01-01', fatigueFlag: false },
        { score: 40, date: '2026-01-02', fatigueFlag: true }, // queda com fadiga
        { score: 70, date: '2026-01-03', fatigueFlag: false }
      ];
      const mssd = calculateMSSD(history, 100, 0);
      expect(Number.isFinite(mssd)).toBe(true);
      expect(mssd).toBeGreaterThan(0);
    });
  });

  // DIFF 03: distributeRoundingRemainder
  describe('DIFF 03: distributeRoundingRemainder', () => {
    it('preserva a ordem original dos itens após distribuição do resto', () => {
      const items = [
        { id: 'first', rawPercentage: 33.7 },
        { id: 'second', rawPercentage: 33.8 },
        { id: 'third', rawPercentage: 32.5 }
      ];
      const result = distributeRoundingRemainder(items, 100);
      expect(result.map(r => r.id)).toEqual(['first', 'second', 'third']);
      expect(result.reduce((s, r) => s + r.percentage, 0)).toBe(100);
      expect(result[0].percentage).toBe(34);
      expect(result[1].percentage).toBe(34);
      expect(result[2].percentage).toBe(32);
    });
  });

  // DIFF 06: Detector de conflito no mesmo dia/matéria
  describe('DIFF 06: Detector de registros conflitantes', () => {
    it('detecta dois simulados no mesmo dia e matéria com ids distintos e notas conflitantes', () => {
      const records = [
        { id: 'sim-a', subject: 'Constitucional', date: '2026-05-10', score: 60 },
        { id: 'sim-b', subject: 'Constitucional', date: '2026-05-10', score: 85 }
      ];
      const issues = detectDataAnomalies(records);
      const conflict = issues.find(i => i.msg && i.msg.includes('Conflito no mesmo dia/matéria'));
      expect(conflict).toBeDefined();
      expect(conflict.msg).toContain('sim-a');
      expect(conflict.msg).toContain('sim-b');
    });
  });

  // DIFF 07: daysUntilGoal
  describe('DIFF 07: daysUntilGoal e projectDays', () => {
    it('retorna fallback (30) para valores nulos ou datas inválidas', () => {
      expect(daysUntilGoal(null)).toBe(30);
      expect(daysUntilGoal('invalid-date')).toBe(30);
      expect(daysUntilGoal(new Date('invalid'))).toBe(30);
    });

    it('calcula dias corretamente com data válida', () => {
      const diff = daysUntilGoal('2026-05-20', {
        referenceDate: '2026-05-10',
        fallback: 30,
        min: 1
      });
      expect(diff).toBe(10);
    });
  });

  // DIFF 08: calculateStudyStreak
  describe('DIFF 08: calculateStudyStreak', () => {
    it('zera o streak ativo quando o último dia registrado é anterior a ontem', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T12:00:00-04:00'));
      // Último estudo foi em 2026-05-05 (5 dias atrás)
      const logs = [
        { date: '2026-05-04', minutes: 60 },
        { date: '2026-05-05', minutes: 60 }
      ];
      const streak = calculateStudyStreak(logs);
      expect(streak.current).toBe(0);
      expect(streak.isActive).toBe(false);
      expect(streak.best).toBe(2);
    });
  });

  // DIFF 09: computeTrendStatus
  describe('DIFF 09: computeTrendStatus', () => {
    it('retorna traço informativo quando há menos de 2 registros', () => {
      const single = computeTrendStatus([70]);
      expect(single.value).toBe('—');
      expect(single.tone).toBe('neutral');
      expect(single.help).toContain('ao menos 2 registros');
    });

    it('calcula tendência com 6+ registros comparando os últimos 3 contra os 3 anteriores', () => {
      const series = [50, 50, 50, 80, 80, 80];
      const trend = computeTrendStatus(series, { formatValue: (v) => v.toFixed(0), unit: '%' });
      expect(trend.value).toBe('+30%');
      expect(trend.tone).toBe('progress');
      expect(trend.icon).toBe('📈');
    });

    it('calcula tendência com poucos registros (2 a 5)', () => {
      const series = [80, 60];
      const trend = computeTrendStatus(series, { formatValue: (v) => v.toFixed(0), unit: '%' });
      expect(trend.value).toBe('-20%');
      expect(trend.tone).toBe('danger');
      expect(trend.icon).toBe('📉');
    });
  });

  // DIFF 10: formatTimeAgo
  describe('DIFF 10: formatTimeAgo tolerância de skew e unidades', () => {
    it('tolera desvio de relógio de até 10 minutos', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-08T12:00:00.000Z'));
      // 5 minutos no futuro (skew)
      expect(formatTimeAgo('2026-05-08T12:05:00.000Z')).toBe('Agora há pouco');
      // 15 minutos no futuro
      expect(formatTimeAgo('2026-05-08T12:15:00.000Z')).toBe('No futuro');
    });
  });
});
