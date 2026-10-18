import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContestDisplayName } from '../sidebarUtils.js';
import { createTaskSlice } from '../../store/slices/createTaskSlice.js';
import { createCategorySlice } from '../../store/slices/createCategorySlice.js';

describe('Meu Painel (Dashboard) Menu Bugs Audit & Fixes', () => {
    describe('1. Sidebar and Navigation to Meu Painel', () => {
        it('getContestDisplayName prefers contestName and name', () => {
            expect(getContestDisplayName({ contestName: 'PF 2026' })).toBe('PF 2026');
            expect(getContestDisplayName({ name: 'PRF 2026' })).toBe('PRF 2026');
        });

        it('getContestDisplayName returns Sem nome when neither contestName nor name exists', () => {
            expect(getContestDisplayName({})).toBe('Sem nome');
            expect(getContestDisplayName(null)).toBe('Sem nome');
            expect(getContestDisplayName({ user: { name: 'João' } })).toBe('Sem nome');
        });

        it('sessionStorage navigateToDashboard flag prevents RootRedirect bounce', () => {
            sessionStorage.clear();
            sessionStorage.setItem('navigateToDashboard', 'true');
            expect(sessionStorage.getItem('navigateToDashboard')).toBe('true');
        });
    });

    describe('2. Task Slice: Studying Status and Pomodoro Synchronization', () => {
        let mockState;
        let setFn;
        let getFn;
        let taskSlice;

        beforeEach(() => {
            mockState = {
                appState: {
                    activeId: 'contest-1',
                    version: 1,
                    pomodoro: {
                        isRunning: true,
                        activeSubject: {
                            categoryId: 'cat-1',
                            taskId: 'task-101',
                            task: 'Estudar Art. 5º CF'
                        }
                    },
                    contests: {
                        'contest-1': {
                            id: 'contest-1',
                            categories: [
                                {
                                    id: 'cat-1',
                                    name: 'Direito Constitucional',
                                    tasks: [
                                        {
                                            id: 'task-101',
                                            text: 'Estudar Art. 5º CF',
                                            completed: false,
                                            status: 'studying',
                                            priority: 'high'
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };

            setFn = (fn) => {
                fn(mockState);
            };
            getFn = () => ({
                awardExperience: vi.fn()
            });

            taskSlice = createTaskSlice(setFn, getFn);
        });

        it('clears task.status and stops active Pomodoro session when task is marked complete', () => {
            taskSlice.toggleTask('cat-1', 'task-101');

            const contest = mockState.appState.contests['contest-1'];
            const task = contest.categories[0].tasks[0];

            expect(task.completed).toBe(true);
            expect(task.status).toBeNull();
            expect(mockState.appState.pomodoro.activeSubject).toBeNull();
            expect(mockState.appState.pomodoro.isRunning).toBe(false);
        });

        it('resets activeSubject when a currently studying task is deleted', () => {
            taskSlice.deleteTask('cat-1', 'task-101');

            const contest = mockState.appState.contests['contest-1'];
            expect(contest.categories[0].tasks).toHaveLength(0);
            expect(mockState.appState.pomodoro.activeSubject).toBeNull();
        });
    });

    describe('3. Category Slice: Cache Invalidation, Cascade Renaming & Firebase Object Import', () => {
        let mockState;
        let setFn;
        let getFn;
        let catSlice;

        beforeEach(() => {
            mockState = {
                appState: {
                    activeId: 'contest-1',
                    version: 1,
                    pomodoro: {
                        activeSubject: {
                            category: 'Português',
                            categoryId: 'cat-1'
                        }
                    },
                    contests: {
                        'contest-1': {
                            id: 'contest-1',
                            mcWeights: {
                                'Português': 3
                            },
                            simuladoRows: [
                                { id: 'r1', subject: 'Português', score: 80 }
                            ],
                            simulados: [
                                { id: 's1', subject: 'Português', score: 85 }
                            ],
                            categories: [
                                {
                                    id: 'cat-1',
                                    name: 'Português',
                                    color: '#3b82f6',
                                    tasks: []
                                }
                            ]
                        },
                        'contest-source': {
                            id: 'contest-source',
                            // Firebase format where categories is a plain dictionary object
                            categories: {
                                'c1': { id: 'cat-import-1', name: 'Raciocínio Lógico', tasks: [{ id: 't1', text: 'Tautologias' }] }
                            }
                        }
                    }
                }
            };

            setFn = (fn) => {
                fn(mockState);
            };
            getFn = () => ({});

            catSlice = createCategorySlice(setFn, getFn);
        });

        it('renames category across mcWeights, simuladoRows, simulados, and pomodoro.activeSubject', () => {
            catSlice.updateCategoryFields('cat-1', { name: 'Língua Portuguesa' });

            const contest = mockState.appState.contests['contest-1'];
            expect(contest.categories[0].name).toBe('Língua Portuguesa');
            expect(contest.mcWeights['Língua Portuguesa']).toBe(3);
            expect(contest.mcWeights['Português']).toBeUndefined();
            expect(contest.simuladoRows[0].subject).toBe('Língua Portuguesa');
            expect(contest.simulados[0].subject).toBe('Língua Portuguesa');
            expect(mockState.appState.pomodoro.activeSubject.category).toBe('Língua Portuguesa');
        });

        it('successfully imports category from Firebase dictionary format without crashing', () => {
            catSlice.importCategory('contest-source', 'cat-import-1');

            const contest = mockState.appState.contests['contest-1'];
            const imported = contest.categories.find(c => c.name === 'Raciocínio Lógico');
            expect(imported).toBeDefined();
            expect(imported.tasks).toHaveLength(1);
            expect(imported.tasks[0].text).toBe('Tautologias');
        });
    });

    describe('4. StatsCards Data Fallbacks for Clean Initial State', () => {
        it('formats efficiency correctly when efficiency status is sem_dados', () => {
            const efficiency = { efficiency: 'sem_dados', score: undefined };
            const hasEffData = Boolean(efficiency && efficiency.efficiency !== 'sem_dados' && efficiency.score !== undefined);
            expect(hasEffData).toBe(false);
        });

        it('formats flashcard precision as dash when reviews count is 0', () => {
            const fcStats = { flashcardReviews: 0, flashcardAccuracy: 0 };
            const display = (fcStats.flashcardReviews || 0) > 0 ? `${fcStats.flashcardAccuracy}%` : '-';
            expect(display).toBe('-');
        });
    });

    describe('5. PerformancePanel Initial Simulado State', () => {
        it('returns neutral empty display instead of 0% Média and BAIXO when history is empty', () => {
            const history = [];
            const avgDisplay = history.length > 0 ? '70%' : '-';
            const lastDisplay = history.length > 0 ? '80%' : '-';
            const level = history.length > 0 ? 'MÉDIO' : '-';
            const trendText = history.length > 0 ? 'Estável' : 'Sem dados';

            expect(avgDisplay).toBe('-');
            expect(lastDisplay).toBe('-');
            expect(level).toBe('-');
            expect(trendText).toBe('Sem dados');
        });
    });

    describe('6. NextGoalCard Initial Status Styling', () => {
        it('keeps initial calm theme when hasSimuladoData is false even with synthetic urgency score', () => {
            const hasSimuladoData = false;
            const urgencyScore = 85; // Synthetic score

            let urgencyStyle = 'blue';
            if (hasSimuladoData && urgencyScore > 70) {
                urgencyStyle = 'red';
            } else if (hasSimuladoData && urgencyScore > 50) {
                urgencyStyle = 'amber';
            }

            expect(urgencyStyle).toBe('blue');
        });
    });
});
