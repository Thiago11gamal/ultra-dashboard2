import { describe, it, expect, vi } from 'vitest';
import { repairContestHistory, sanitizeContest } from '../src/store/schemas.js';
import { useAppStore } from '../src/store/useAppStore.js';
import { deduplicateSimulados } from '../src/utils/measurement.js';
import { shrinkProbabilityToNeutral, computeCalibrationDiagnostics } from '../src/utils/calibration.js';
import { getPercentile } from '../src/engine/math/percentile.js';
import { formatDisplayDate, getLocalMidnight } from '../src/utils/dateHelper.js';
import { toSafeNumber } from '../src/utils/normalize.js';
import { applyScenarioAdjustments } from '../src/utils/monteCarloScenario.js';
import { getSafeId } from '../src/utils/idGenerator.js';
import { safeGetJSON } from '../src/utils/storageSafe.js';

describe('Patches Verification Test Suite (PATCH-001 to PATCH-035)', () => {
  it('PATCH-001: repairContestHistory does not crash when categories is an Object', () => {
    const rawData = {
      categories: {
        cat1: { id: 'c1', name: 'Direito', simuladoStats: { history: [] } }
      },
      simuladoRows: [
        { id: 'r1', categoryId: 'c1', subject: 'Direito', score: 80, date: '2026-01-01' }
      ]
    };
    expect(() => repairContestHistory(rawData)).not.toThrow();
  });

  it('PATCH-002: sanitizeContest does not convert coachPlan string to character array', () => {
    const raw = {
      coachPlan: 'invalid_string'
    };
    const sanitized = sanitizeContest(raw);
    expect(Array.isArray(sanitized.coachPlan)).toBe(true);
    expect(sanitized.coachPlan).toEqual([]);
  });

  it('PATCH-003: sanitizeContest deduplicates tasks with multiple internal spaces', () => {
    const raw = {
      categories: [
        {
          id: 'cat-1',
          name: 'Português',
          tasks: [
            { id: 't1', text: 'Direito  Constitucional' },
            { id: 't2', text: 'Direito Constitucional' }
          ]
        }
      ]
    };
    const sanitized = sanitizeContest(raw);
    expect(sanitized.categories[0].tasks.length).toBe(1);
  });

  it('PATCH-004: setAppState preserves undo/redo history', () => {
    const store = useAppStore.getState();
    const mockHistory = [{ action: 'test', timestamp: 12345 }];
    store.setAppState({
      ...store.appState,
      history: mockHistory
    });
    expect(useAppStore.getState().appState.history).toEqual(mockHistory);
  });

  it('PATCH-007: deduplicateSimulados deduplicates rows without explicit id', () => {
    const simulados = [
      { subject: 'Matemática', date: '2026-01-01', score: 80, points: 80 },
      { subject: 'Matemática', date: '2026-01-01', score: 80, points: 80 }
    ];
    const deduped = deduplicateSimulados(simulados);
    expect(deduped.length).toBe(1);
  });

  it('PATCH-008 & PATCH-021: calibration functions are resilient to NaN and empty inputs', () => {
    const shrunk = shrinkProbabilityToNeutral(NaN, 0.2, 50);
    expect(Number.isFinite(shrunk)).toBe(true);
    expect(shrunk).toBe(50);

    const diag = computeCalibrationDiagnostics([]);
    expect(diag.ece).toBeNull();
    expect(diag.mce).toBeNull();
  });

  it('PATCH-009: getPercentile handles NaN percentile gracefully', () => {
    const arr = [10, 20, 30, 40, 50];
    const val = getPercentile(arr, NaN);
    expect(Number.isFinite(val)).toBe(true);
    expect(val).toBe(0);
  });

  it('PATCH-011: formatDisplayDate formats 10-digit unix timestamps in seconds', () => {
    // 1704067200 = 2024-01-01T00:00:00Z
    const formatted = formatDisplayDate(1704067200);
    expect(formatted).toMatch(/^\d{2}\/\d{2}$/);
  });

  it('PATCH-012: getLocalMidnight returns local midnight (hours=0, minutes=0, seconds=0)', () => {
    const midnight = getLocalMidnight(new Date('2026-05-10T15:30:00Z'));
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getSeconds()).toBe(0);
  });

  it('PATCH-027: getSafeId produces deterministic id for task without id', () => {
    const taskA = { text: 'Estudar Crase' };
    const taskB = { text: 'Estudar Crase' };
    const idA = getSafeId(taskA);
    const idB = getSafeId(taskB);
    expect(idA).toBe(idB);
  });

  it('PATCH-028: safeGetJSON removes key from localStorage on validation failure', () => {
    localStorage.setItem('test-key', JSON.stringify({ invalid: true }));
    const result = safeGetJSON('test-key', null, (val) => val.valid === true);
    expect(result).toBeNull();
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('PATCH-032: toSafeNumber returns fallback for empty string', () => {
    expect(toSafeNumber('', 42)).toBe(42);
    expect(toSafeNumber(null, 42)).toBe(42);
    expect(toSafeNumber(undefined, 42)).toBe(42);
    expect(toSafeNumber('0', 42)).toBe(0);
    expect(toSafeNumber(10, 42)).toBe(10);
  });

  it('PATCH-033: applyScenarioAdjustments does not produce NaN probability', () => {
    const data = [{ mean: 70, probability: NaN, ciRange: [60, 80] }];
    const res = applyScenarioAdjustments(data, 'conservative', 100, 0);
    expect(Number.isFinite(res[0].probability)).toBe(true);
    expect(res[0].probability).toBe(0);
  });
});
