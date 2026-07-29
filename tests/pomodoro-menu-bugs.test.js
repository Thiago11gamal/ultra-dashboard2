import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore.js';

describe('Pomodoro Menu - Comprehensive Bugfix Regression Suite', () => {
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

    it('Bug 1: advanceNeuralQueue resets mode back to "work" when transitioning tasks', () => {
        const store = useAppStore.getState();
        store.startNeuralSession([
            { id: 't1', text: 'Task 1', categoryId: 'cat-1' },
            { id: 't2', text: 'Task 2', categoryId: 'cat-1' }
        ], 0);

        // Simulate ending cycle in break mode
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'break';
            state.appState.pomodoro.completedCycles = 1;
            state.appState.pomodoro.accumulatedMinutes = 25;
            return state;
        });

        const advanced = store.advanceNeuralQueue();
        expect(advanced).toBe(true);
        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.mode).toBe('work');
        expect(pomodoroState.completedCycles).toBe(0);
        expect(pomodoroState.accumulatedMinutes).toBe(0);
        expect(pomodoroState.activeSubject.taskId).toBe('t2');
    });

    it('Bug 2: toggleNeuralTask searches inside activeData.categories and awards XP', () => {
        const store = useAppStore.getState();
        let awarded = 0;
        store.awardExperience = (xp) => { awarded += xp; };

        // Toggle task t1 which is only in categories.tasks
        store.toggleNeuralTask('t1');

        const activeData = useAppStore.getState().appState.contests.default;
        const task = activeData.categories[0].tasks[0];
        expect(task.completed).toBe(true);
        expect(task.completedAt).toBeDefined();
        expect(awarded).toBeGreaterThan(0);
    });

    it('Bug 3: toggleTask matches tasks by id OR text when id is absent', () => {
        const store = useAppStore.getState();
        // The second task in cat-1 has no 'id' property, only 'text': 'Sem ID Task'
        store.toggleTask('cat-1', 'Sem ID Task');

        const activeData = useAppStore.getState().appState.contests.default;
        const task = activeData.categories[0].tasks[1];
        expect(task.completed).toBe(true);
    });
});
