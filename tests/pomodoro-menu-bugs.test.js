import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore.js';
import { countPomodorosToday } from '../src/utils/analytics.js';
import { cleanTaskTitle, parseTaskDisplay } from '../src/utils/taskTitleHelper.js';

describe('Pomodoro Menu - Comprehensive 9 Bugs Regression Suite', () => {
    beforeEach(() => {
        useAppStore.setState({
            appState: {
                activeId: 'default',
                contests: {
                    default: {
                        id: 'default',
                        name: 'Test Contest',
                        categories: [
                            {
                                id: 'cat-1',
                                name: 'Matemática',
                                tasks: [
                                    { id: 't1', text: 'Equações', completed: false, priority: 'high' },
                                    { text: 'Sem ID Task', completed: false, priority: 'medium' }
                                ]
                            }
                        ],
                        coachPlan: [],
                        coachPlanner: {},
                        studyLogs: [],
                        studySessions: []
                    }
                },
                pomodoro: {
                    activeSubject: null,
                    sessions: 1,
                    targetCycles: 1,
                    completedCycles: 0,
                    accumulatedMinutes: 0,
                    mode: 'break',
                    neuralQueue: [],
                    neuralMode: false
                }
            }
        });
    });

    it('Bug 1 & 7: countPomodorosToday uses extraCompletedCycles only when accumulatedMinutes > 0', () => {
        const todayStr = new Date().toISOString();
        const studyLogs = [
            { date: todayStr, minutes: 25 },
            { date: todayStr, minutes: 25 }
        ];

        // Se accumulatedMinutes = 0, unloggedCycles deve ser 0 e contar apenas os logs = 2
        const countWhenZeroAccum = countPomodorosToday(studyLogs, 25, 0);
        expect(countWhenZeroAccum).toBe(2);

        // Se accumulatedMinutes > 0, soma unloggedCycles (por ex 1 ciclo) = 3
        const countWhenPendingAccum = countPomodorosToday(studyLogs, 25, 1);
        expect(countWhenPendingAccum).toBe(3);
    });

    it('Bug 2 & 8: startNeuralSession and advanceNeuralQueue set targetCycles to 1 and reset accumulatedMinutes', () => {
        const store = useAppStore.getState();
        store.startNeuralSession([
            { id: 't1', text: 'Task 1', categoryId: 'cat-1' },
            { id: 't2', text: 'Task 2', categoryId: 'cat-1' }
        ], 0);

        let pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.targetCycles).toBe(1);
        expect(pomodoroState.neuralMode).toBe(true);

        // Simulate cycle ending in break mode with accumulated minutes
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'break';
            state.appState.pomodoro.completedCycles = 1;
            state.appState.pomodoro.accumulatedMinutes = 25;
            return state;
        });

        const advanced = store.advanceNeuralQueue();
        expect(advanced).toBe(true);
        pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.mode).toBe('work');
        expect(pomodoroState.targetCycles).toBe(1);
        expect(pomodoroState.completedCycles).toBe(0);
        expect(pomodoroState.accumulatedMinutes).toBe(0);
        expect(pomodoroState.activeSubject.taskId).toBe('t2');
    });

    it('Bug 3: setPomodoroTargetCycles clamps completedCycles when mode is "work"', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.completedCycles = 4;
            return state;
        });

        store.setPomodoroTargetCycles(3);
        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.targetCycles).toBe(3);
        expect(pomodoroState.completedCycles).toBe(2); // max is targetCycles - 1 in work mode
    });

    it('Bug 4: setPomodoroActiveSubject(null) clears neuralMode and neuralQueue', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.neuralQueue = [{ id: 't1', text: 'Task 1' }];
            return state;
        });

        store.setPomodoroActiveSubject(null);
        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.activeSubject).toBeNull();
        expect(pomodoroState.neuralMode).toBe(false);
        expect(pomodoroState.neuralQueue).toEqual([]);
    });

    it('Bug 5: rewindPomodoroPhase never allows negative accumulatedMinutes', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'break';
            state.appState.pomodoro.completedCycles = 1;
            state.appState.pomodoro.accumulatedMinutes = 10; // less than 25
            return state;
        });

        store.rewindPomodoroPhase();
        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.mode).toBe('work');
        expect(pomodoroState.completedCycles).toBe(0);
        expect(pomodoroState.accumulatedMinutes).toBe(0); // Protected against negative
    });

    it('Bug 6: cleanTaskTitle and parseTaskDisplay strip brackets and simplify same category name', () => {
        const cleaned = cleanTaskTitle('[PROTOCOLO PRIORITÁRIO] Matemática: Matemática', 'Matemática');
        expect(cleaned).toBe('Revisão Geral');

        const parsed = parseTaskDisplay('[ALERTA MESTRE] Física: Leitura de Leis', 'Física');
        expect(parsed.displayTopic).toBe('Leitura de Leis');
        expect(parsed.secondaryText).toBe('Física');
    });

    it('Bug 7 (Store): setPomodoroActiveSubject with manual task clears neuralMode', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.neuralQueue = [{ id: 't1', text: 'Task 1' }];
            return state;
        });

        store.setPomodoroActiveSubject({
            taskId: 'manual-1',
            task: 'Manual Task',
            source: 'manual'
        });

        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.activeSubject.taskId).toBe('manual-1');
        expect(pomodoroState.neuralMode).toBe(false);
        expect(pomodoroState.neuralQueue).toEqual([]);
    });

    it('Bug 8 & 9: toggleNeuralTask searches categories and awards XP properly', () => {
        const store = useAppStore.getState();
        let awarded = 0;
        store.awardExperience = (xp) => { awarded += xp; };

        store.toggleNeuralTask('t1');

        const activeData = useAppStore.getState().appState.contests.default;
        const task = activeData.categories[0].tasks[0];
        expect(task.completed).toBe(true);
        expect(awarded).toBeGreaterThan(0);
    });

    it('Extra Edge Cases: cleanTaskTitle global tags, setPomodoroCompletedCycles clamp, and syncPomodoroState validation', () => {
        const cleaned = cleanTaskTitle('[PROTOCOLO PRIORITÁRIO] [ALERTA MESTRE] Matemática: Equações');
        expect(cleaned).toBe('Equações');

        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.targetCycles = 3;
            state.appState.pomodoro.completedCycles = 0;
            return state;
        });

        store.setPomodoroCompletedCycles(10);
        let p = useAppStore.getState().appState.pomodoro;
        expect(p.completedCycles).toBe(2); // clamped to max(0, targetCycles - 1) in work mode

        store.syncPomodoroState({ completedCycles: 5, accumulatedMinutes: -20 });
        p = useAppStore.getState().appState.pomodoro;
        expect(p.completedCycles).toBe(2);
        expect(p.accumulatedMinutes).toBe(0);
    });
});
