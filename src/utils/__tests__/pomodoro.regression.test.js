import { describe, expect, it } from 'vitest';
import { createPomodoroSlice } from '../../store/slices/createPomodoroSlice';
import { formatTime } from '../pomodoroHelpers';
import { calculateStudyStreak } from '../analytics';

describe('Pomodoro Slice - Skip and Phase Progression Regressions', () => {
  const createMockStore = () => {
    let state = {
      appState: {
        activeId: 'contest-1',
        contests: {
          'contest-1': {
            settings: { pomodoroWork: 25, pomodoroBreak: 5, longBreakAfter: 4 }
          }
        },
        pomodoro: {
          mode: 'work',
          sessions: 1,
          targetCycles: 2,
          completedCycles: 0,
          accumulatedMinutes: 0,
          isRunning: false,
          activeSubject: { taskId: 'task-1', task: 'Matemática', categoryId: 'cat-1' }
        }
      }
    };

    const set = (updater) => {
      if (typeof updater === 'function') {
        updater(state);
      } else {
        Object.assign(state, updater);
      }
    };

    const get = () => state;

    const slice = createPomodoroSlice(set, get);
    return { slice, getState: () => state };
  };

  it('permite pular (skip) a fase de foco sem conceder minutos mas avançando para pausa', () => {
    const { slice, getState } = createMockStore();

    // Pular manualmente com 0 minutos estudados
    slice.completePomodoroPhase(true, 0);

    const pomodoro = getState().appState.pomodoro;
    expect(pomodoro.mode).toBe('break');
    expect(pomodoro.completedCycles).toBe(1);
    expect(pomodoro.accumulatedMinutes).toBe(0);
  });

  it('permite pular com minutos parciais acumulados', () => {
    const { slice, getState } = createMockStore();

    slice.completePomodoroPhase(true, 10);

    const pomodoro = getState().appState.pomodoro;
    expect(pomodoro.mode).toBe('break');
    expect(pomodoro.completedCycles).toBe(1);
    expect(pomodoro.accumulatedMinutes).toBe(10);
  });

  it('conclui a série inteira quando atinge targetCycles', () => {
    const { slice, getState } = createMockStore();
    getState().appState.pomodoro.targetCycles = 1;

    // Completar naturalmente o único ciclo da meta
    slice.completePomodoroPhase(false);

    const pomodoro = getState().appState.pomodoro;
    expect(pomodoro.mode).toBe('work');
    expect(pomodoro.completedCycles).toBe(0);
    expect(pomodoro.sessions).toBe(1);
  });

  it('gerencia setPomodoroRunning corretamente', () => {
    const { slice, getState } = createMockStore();

    slice.setPomodoroRunning(true);
    expect(getState().appState.pomodoro.isRunning).toBe(true);

    slice.setPomodoroRunning(false);
    expect(getState().appState.pomodoro.isRunning).toBe(false);
  });
});

describe('Pomodoro Helpers - formatTime', () => {
  it('arredonda segundos restantes para cima (Math.ceil) para evitar pulo de 1s', () => {
    expect(formatTime(59.9)).toBe('01:00');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(59)).toBe('00:59');
    expect(formatTime(0.5)).toBe('00:01');
    expect(formatTime(0)).toBe('00:00');
  });
});

describe('Pomodoro Analytics - Streak Persistence', () => {
  it('mantém streak ativo se o usuário estudou ontem mesmo sem ter estudado hoje', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString();

    const logs = [{ date: yesterdayIso, minutes: 25 }];
    const streak = calculateStudyStreak(logs);

    expect(streak.current).toBeGreaterThanOrEqual(1);
    expect(streak.isActive).toBe(true);
  });
});
