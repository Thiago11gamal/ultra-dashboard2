import { describe, expect, it, vi } from 'vitest';
import { createPomodoroSlice } from '../../store/slices/createPomodoroSlice';
import { formatTime, SPEED_OPTIONS, MAX_TARGET_CYCLES } from '../pomodoroHelpers';
import { calculateStudyStreak, countPomodorosToday } from '../analytics';

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

  it('limita targetCycles a MAX_TARGET_CYCLES no slice', () => {
    const { slice, getState } = createMockStore();

    slice.setPomodoroTargetCycles(100);
    expect(getState().appState.pomodoro.targetCycles).toBe(MAX_TARGET_CYCLES);
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const logs = [{ date: '2026-02-09T12:00:00Z', minutes: 25 }];
    const streak = calculateStudyStreak(logs);

    expect(streak.current).toBeGreaterThanOrEqual(1);
    expect(streak.isActive).toBe(true);

    vi.useRealTimers();
  });
});

describe('Pomodoro Slice - Unhydrated State Safety & Contest Switching', () => {
  it('setPomodoroActiveSubject não quebra quando pomodoro está undefined no store', () => {
    let state = {
      appState: {
        activeId: 'contest-1',
        pomodoro: undefined
      }
    };
    const set = (updater) => {
      if (typeof updater === 'function') updater(state);
      else Object.assign(state, updater);
    };
    const get = () => state;
    const slice = createPomodoroSlice(set, get);

    expect(() => slice.setPomodoroActiveSubject(null)).not.toThrow();
  });

  it('countPomodorosToday calcula ciclos com base nos minutos salvos em studyLogs', () => {
    const now = new Date().toISOString();
    // 2 ciclos de 25 min concluídos e já registrados nos logs
    const studyLogs = [
      { date: now, minutes: 25 },
      { date: now, minutes: 25 }
    ];

    const count = countPomodorosToday(studyLogs, 25, 0);
    expect(count).toBe(2);
  });
});

describe('Pomodoro Regressions - Multi-tab, Speed Recalculation & Structured endsAt', () => {
  it('reseta isRunning e limpa endsAt ao trocar para nova sessão ativa', () => {
    const removedKeys = [];
    globalThis.localStorage = {
      removeItem: (k) => { removedKeys.push(k); },
      getItem: () => null,
      setItem: () => {}
    };

    let state = {
      appState: {
        activeId: 'contest-1',
        pomodoro: {
          isRunning: true,
          activeSubject: { taskId: 'task-old', sessionInstanceId: 'inst-1' }
        }
      }
    };
    const set = (updater) => {
      if (typeof updater === 'function') updater(state);
      else Object.assign(state, updater);
    };
    const get = () => state;
    const slice = createPomodoroSlice(set, get);

    slice.setPomodoroActiveSubject({ taskId: 'task-new', sessionInstanceId: 'inst-2' });

    expect(state.appState.pomodoro.isRunning).toBe(false);
    expect(state.appState.pomodoro.activeSubject.taskId).toBe('task-new');
    expect(removedKeys).toContain('pomodoro-endsAt');
    expect(removedKeys).toContain('pomodoroState');
  });

  it('recalcula endsAt corretamente na mudança de velocidade suportada sem inflar o cronômetro', () => {
    const currentLeft = 1200; // 20 minutos restantes
    const parsedSpeed = 10; // velocidade suportada [1, 10, 100]
    expect(SPEED_OPTIONS).toContain(parsedSpeed);
    const now = 1000000;
    
    // Cálculo corrigido: agora + (segundos restantes * 1000) / velocidade
    const calculatedEndsAt = now + (currentLeft * 1000) / parsedSpeed;
    
    // O tempo real de relógio restante deve ser 120 segundos (2 minutos reais a 10x)
    expect(calculatedEndsAt - now).toBe(120 * 1000);
  });

  it('valida payload estruturado de endsAt isolando por taskId e sessionInstanceId', () => {
    const parseStoredEndsAt = (raw, expectedTaskId, expectedSessionId) => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          if (expectedTaskId && parsed.taskId && parsed.taskId !== expectedTaskId) return null;
          if (expectedSessionId && parsed.sessionInstanceId && parsed.sessionInstanceId !== expectedSessionId) return null;
          return Number(parsed.endsAt);
        }
        return Number(parsed);
      } catch {
        return Number(raw);
      }
    };

    const validPayload = JSON.stringify({ endsAt: 1700000000000, taskId: 'task-1', sessionInstanceId: 'sess-1' });
    const wrongTaskPayload = JSON.stringify({ endsAt: 1700000000000, taskId: 'task-2', sessionInstanceId: 'sess-1' });
    const legacyPayload = '1700000000000';

    expect(parseStoredEndsAt(validPayload, 'task-1', 'sess-1')).toBe(1700000000000);
    expect(parseStoredEndsAt(wrongTaskPayload, 'task-1', 'sess-1')).toBeNull();
    expect(parseStoredEndsAt(legacyPayload, 'task-1', 'sess-1')).toBe(1700000000000);
  });

  it('suporta tarefas neurais identificadas apenas por title no start e advance da fila', () => {
    let state = {
      appState: {
        activeId: 'contest-1',
        pomodoro: {
          isRunning: false,
          neuralMode: false,
          neuralQueue: []
        }
      }
    };
    const set = (updater) => {
      if (typeof updater === 'function') updater(state);
      else Object.assign(state, updater);
    };
    const get = () => state;
    const slice = createPomodoroSlice(set, get);

    const tasks = [
      { title: 'Revisão de Direito Constitucional', category: 'Direito' },
      { title: 'Exercícios de Português', category: 'Português' }
    ];

    slice.startNeuralSession(tasks, 0);

    const p1 = state.appState.pomodoro;
    expect(p1.neuralMode).toBe(true);
    expect(p1.activeSubject.taskId).toBe('Revisão de Direito Constitucional');
    expect(p1.activeSubject.task).toBe('Revisão de Direito Constitucional');

    // Avança para a próxima tarefa
    const hasNext = slice.advanceNeuralQueue();
    expect(hasNext).toBe(true);
    const p2 = state.appState.pomodoro;
    expect(p2.activeSubject.taskId).toBe('Exercícios de Português');
    expect(p2.activeSubject.task).toBe('Exercícios de Português');
  });
});

