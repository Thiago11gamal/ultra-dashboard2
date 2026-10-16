import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChartData } from '../../hooks/useChartData.js';
import { filterHistoryByTimeWindow } from '../../hooks/useSubjectAggData.js';
import { mapSubjectHoursData } from '../chartDataMappers.js';
import { repairContestHistory } from '../../store/schemas.js';
import { safeDisplayNumber } from '../scoreHelper.js';
import { getDateKey } from '../dateHelper.js';

describe('Stats Menu Bug Audit Verification Suite', () => {
  describe('BUG-STATS-01: globalMetrics never returns NaN', () => {
    it('returns 0 and finite numbers even when history has invalid totals or corrupt scores', () => {
      const today = getDateKey(new Date());
      const categories = [
        {
          id: 'cat1',
          name: 'Direito',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              { date: today, total: NaN, correct: NaN, score: NaN },
              { date: today, total: 'invalid', correct: 'none', score: 'bad' },
              { date: today, total: -10, correct: -5, score: NaN },
            ]
          }
        }
      ];

      const { result } = renderHook(() => useChartData(categories));
      const { globalMetrics } = result.current;

      expect(Number.isFinite(globalMetrics.totalQuestions)).toBe(true);
      expect(Number.isFinite(globalMetrics.totalCorrect)).toBe(true);
      expect(Number.isFinite(globalMetrics.globalAccuracy)).toBe(true);
      expect(globalMetrics.totalQuestions).toBe(0);
      expect(globalMetrics.totalCorrect).toBe(0);
      expect(globalMetrics.globalAccuracy).toBe(0);
    });

    it('accurately accumulates valid items without NaN contamination', () => {
      const today = getDateKey(new Date());
      const categories = [
        {
          id: 'cat1',
          name: 'Direito',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              { date: today, total: 50, correct: 40, score: 80 },
              { date: today, total: null, correct: undefined, score: NaN }
            ]
          }
        }
      ];

      const { result } = renderHook(() => useChartData(categories));
      const { globalMetrics } = result.current;

      expect(globalMetrics.totalQuestions).toBe(50);
      expect(globalMetrics.totalCorrect).toBe(40);
      expect(globalMetrics.globalAccuracy).toBe(80);
    });
  });

  describe('BUG-STATS-02: repairContestHistory preserves score when total/correct is 0 or omitted', () => {
    it('does not reset direct score to minScore during repair', () => {
      const rawData = {
        categories: [
          {
            id: 'cat_dir',
            name: 'Direito Administrativo',
            maxScore: 100,
            minScore: 0,
            simuladoStats: {
              history: []
            }
          }
        ],
        simuladoRows: [
          {
            categoryId: 'cat_dir',
            subject: 'Direito Administrativo',
            date: '2026-10-10',
            score: 85,
            total: 0,
            correct: 0
          }
        ]
      };

      const repaired = repairContestHistory(rawData);
      const cat = repaired.categories[0];
      expect(cat.simuladoStats.history).toHaveLength(1);
      expect(cat.simuladoStats.history[0].score).toBe(85);
      expect(cat.simuladoStats.lastAttempt).toBe(85);
    });

    it('works with scorePoints when score is not present', () => {
      const rawData = {
        categories: [
          {
            id: 'cat_const',
            name: 'Direito Constitucional',
            maxScore: 100,
            minScore: 0,
            simuladoStats: {
              history: []
            }
          }
        ],
        simuladoRows: [
          {
            categoryId: 'cat_const',
            subject: 'Direito Constitucional',
            date: '2026-10-11',
            scorePoints: 92
          }
        ]
      };

      const repaired = repairContestHistory(rawData);
      const cat = repaired.categories[0];
      expect(cat.simuladoStats.history).toHaveLength(1);
      expect(cat.simuladoStats.history[0].score).toBe(92);
    });
  });

  describe('BUG-STATS-04: Category weight is respected in computeCategoryStats in useChartData', () => {
    it('passes category weight instead of hardcoded 100 to cumulative stats', () => {
      const today = getDateKey(new Date());
      const categories = [
        {
          id: 'cat1',
          name: 'Matéria Pesada',
          weight: 5,
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [{ date: today, total: 10, correct: 8, score: 80 }]
          }
        }
      ];

      const { result } = renderHook(() => useChartData(categories, { cat1: 5 }));
      expect(result.current.timeline).toHaveLength(1);
      expect(result.current.timeline[0].stats_cat1).toBeDefined();
    });
  });

  describe('BUG-STATS-05: activeCategories rejects corrupted non-object histories', () => {
    it('does not accept string "abc" or empty objects as valid history', () => {
      const categories = [
        {
          id: 'cat1',
          name: 'Corrupt Cat',
          simuladoStats: {
            history: 'abc'
          }
        },
        {
          id: 'cat2',
          name: 'Empty Obj Cat',
          simuladoStats: {
            history: {}
          }
        },
        {
          id: 'cat3',
          name: 'Valid Cat',
          simuladoStats: {
            history: [{ date: '2026-10-10', total: 10, correct: 8, score: 80 }]
          }
        }
      ];

      const { result } = renderHook(() => useChartData(categories));
      expect(result.current.activeCategories).toHaveLength(1);
      expect(result.current.activeCategories[0].id).toBe('cat3');
    });
  });

  describe('BUG-STATS-08: mapSubjectHoursData prevents duplicates from casing and spacing', () => {
    it('groups all variants into a single entry with accumulated hours', () => {
      const categories = [{ id: 'cat1', name: 'Direito Penal' }];
      const studyLogs = [
        { categoryId: 'cat1', minutes: 60 },
        { subject: ' direito penal ', minutes: 30 },
        { categoryName: 'DIREITO PENAL', duration: 30 },
        { categoryName: 'Direito penal', minutes: 60 }
      ];

      const mapped = mapSubjectHoursData(studyLogs, categories);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].disciplina).toBe('Direito Penal');
      expect(mapped[0].horas).toBe(3.0); // 180 min = 3.0h
    });
  });

  describe('BUG-STATS-30: safeDisplayNumber handles non-finite numbers safely', () => {
    it('returns numbers when finite, and fallback otherwise', () => {
      expect(safeDisplayNumber(85.5)).toBe(85.5);
      expect(safeDisplayNumber(0)).toBe(0);
      expect(safeDisplayNumber('42')).toBe(42);
      expect(safeDisplayNumber(NaN)).toBe('—');
      expect(safeDisplayNumber(Infinity)).toBe('—');
      expect(safeDisplayNumber(-Infinity)).toBe('—');
      expect(safeDisplayNumber(undefined)).toBe('—');
      expect(safeDisplayNumber(null)).toBe('—');
      expect(safeDisplayNumber('abc', 'N/A')).toBe('N/A');
    });
  });

  describe('BUG-STATS-32: filterHistoryByTimeWindow excludes future dates even in "all"', () => {
    it('filters out records with future dates', () => {
      const today = getDateKey(new Date());
      const history = [
        { id: '1', date: '2026-05-01', total: 10, correct: 8 },
        { id: '2', date: today, total: 10, correct: 9 },
        { id: '3', date: '2099-12-31', total: 10, correct: 10 }
      ];

      const filteredAll = filterHistoryByTimeWindow(history, 'all');
      expect(filteredAll).toHaveLength(2);
      expect(filteredAll.some(h => h.id === '3')).toBe(false);
    });
  });
});
