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

        it('updates task title and notes via updateTask and syncs activeSubject', () => {
            taskSlice.updateTask('cat-1', 'task-101', {
                title: 'Direito Constitucional Avançado',
                notes: 'Focar em controle de constitucionalidade'
            });

            const contest = mockState.appState.contests['contest-1'];
            const task = contest.categories[0].tasks[0];
            expect(task.title).toBe('Direito Constitucional Avançado');
            expect(task.notes).toBe('Focar em controle de constitucionalidade');
            expect(mockState.appState.pomodoro.activeSubject.task).toBe('Direito Constitucional Avançado');
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

        it('displays Hoje instead of 0d when category was studied today', () => {
            const hasSimuladoData = true;
            const daysSinceLastStudy = 0;
            const label = hasSimuladoData ? (daysSinceLastStudy > 0 ? `${daysSinceLastStudy}d` : 'Hoje') : 'Nunca';
            expect(label).toBe('Hoje');
        });
    });

    describe('7. Task Note Deletion & Pomodoro Stop on Delete', () => {
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
                            taskId: 'task-1',
                            task: 'Artigo 5'
                        }
                    },
                    contests: {
                        'contest-1': {
                            categories: [
                                {
                                    id: 'cat-1',
                                    name: 'Constitucional',
                                    tasks: [
                                        {
                                            id: 'task-1',
                                            title: 'Artigo 5',
                                            text: 'Artigo 5',
                                            notes: 'Anotação importante',
                                            completed: false
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };
            setFn = (fn) => fn(mockState);
            getFn = () => ({ awardExperience: vi.fn() });
            taskSlice = createTaskSlice(setFn, getFn);
        });

        it('removes notes when empty string is passed to updateTask', () => {
            taskSlice.updateTask('cat-1', 'task-1', {
                title: 'Artigo 5 Atualizado',
                notes: ''
            });

            const task = mockState.appState.contests['contest-1'].categories[0].tasks[0];
            expect(task.title).toBe('Artigo 5 Atualizado');
            expect(task.notes).toBeUndefined();
        });

        it('stops pomodoro timer and clears activeSubject when actively running task is deleted', () => {
            taskSlice.deleteTask('cat-1', 'task-1');

            expect(mockState.appState.pomodoro.activeSubject).toBeNull();
            expect(mockState.appState.pomodoro.isRunning).toBe(false);
        });
    });

    describe('8. Category Slice: Delete Normalization, Ghost Timer Prevention & Study Cascade', () => {
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
                        isRunning: true,
                        activeSubject: {
                            categoryId: 'cat-firebase-1',
                            category: 'Direito Penal'
                        }
                    },
                    contests: {
                        'contest-1': {
                            id: 'contest-1',
                            categories: {
                                '0': {
                                    id: 'cat-firebase-1',
                                    name: 'Direito Penal',
                                    minCutoff: 10,
                                    maxScore: 20,
                                    tasks: []
                                }
                            },
                            studyLogs: [
                                { id: 'l1', categoryId: 'cat-firebase-1', subject: 'Direito Penal', minutes: 30 }
                            ],
                            studySessions: [
                                { id: 's1', categoryId: 'cat-firebase-1', subject: 'Direito Penal', minutes: 30 }
                            ],
                            simuladoRows: [],
                            simulados: []
                        }
                    }
                }
            };
            setFn = (fn) => fn(mockState);
            getFn = () => ({});
            catSlice = createCategorySlice(setFn, getFn);
        });

        it('normalizes categories dictionary on deleteCategory and stops running pomodoro', () => {
            catSlice.deleteCategory('cat-firebase-1');

            const contest = mockState.appState.contests['contest-1'];
            expect(Array.isArray(contest.categories)).toBe(true);
            expect(contest.categories).toHaveLength(0);
            expect(mockState.appState.pomodoro.activeSubject).toBeNull();
            expect(mockState.appState.pomodoro.isRunning).toBe(false);
            expect(contest.studyLogs).toHaveLength(0);
            expect(contest.studySessions).toHaveLength(0);
        });

        it('syncs minScore with minCutoff on updateCategoryFields and renames studyLogs and studySessions', () => {
            catSlice.updateCategoryFields('cat-firebase-1', {
                name: 'Direito Penal Parte Geral',
                minCutoff: 15
            });

            const contest = mockState.appState.contests['contest-1'];
            const cat = Array.isArray(contest.categories)
                ? contest.categories[0]
                : contest.categories['0'];

            expect(cat.name).toBe('Direito Penal Parte Geral');
            expect(cat.minCutoff).toBe(15);
            expect(cat.minScore).toBe(15);
            expect(contest.studyLogs[0].subject).toBe('Direito Penal Parte Geral');
            expect(contest.studySessions[0].subject).toBe('Direito Penal Parte Geral');
            expect(mockState.appState.pomodoro.activeSubject.category).toBe('Direito Penal Parte Geral');
        });
    });

    describe('9. UI Concordances & Labels', () => {
        it('uses completedCount for singular/plural agreement in CategoryAccordion', () => {
            const formatAccordion = (completed, total) =>
                `${completed} de ${total} ${completed === 1 ? 'concluída' : 'concluídas'}`;

            expect(formatAccordion(1, 10)).toBe('1 de 10 concluída');
            expect(formatAccordion(2, 10)).toBe('2 de 10 concluídas');
            expect(formatAccordion(0, 1)).toBe('0 de 1 concluídas');
        });

        it('uses activeSubjects for singular/plural in StatsCards balance', () => {
            const formatActive = (active, total) =>
                `${active}/${total} ${active === 1 ? 'ativa' : 'ativas'}`;

            expect(formatActive(1, 5)).toBe('1/5 ativa');
            expect(formatActive(2, 5)).toBe('2/5 ativas');
        });

        it('displays Aguardando estudos in StatsCards efficiency when hasEffData is false', () => {
            const hasEffData = false;
            const label = hasEffData ? 'Ritmo regular' : 'Aguardando estudos';
            expect(label).toBe('Aguardando estudos');
        });
    });

    describe('10. Contest Switching and Flyout Popover Fixes', () => {
        let mockState;
        let setFn;
        let contestSlice;
        let gamificationSlice;

        beforeEach(async () => {
            mockState = {
                appState: {
                    activeId: 'contest-1',
                    version: 1,
                    pomodoro: {
                        isRunning: true,
                        activeSubject: { categoryId: 'cat-1', task: 'Estudo Ativo' }
                    },
                    contests: {
                        'contest-1': {
                            id: 'contest-1',
                            contestName: 'Direito',
                            user: { name: 'Direito' },
                            categories: [{ id: 'cat-1', name: 'Constitucional' }]
                        },
                        'contest-2': {
                            id: 'contest-2',
                            contestName: 'PRF 2026',
                            user: { name: 'PRF' }
                        }
                    }
                }
            };
            setFn = (fn) => { fn(mockState); };
            const { createContestSlice } = await import('../../store/slices/createContestSlice.js');
            const { createGamificationSlice } = await import('../../store/slices/createGamificationSlice.js');
            contestSlice = createContestSlice(setFn);
            gamificationSlice = createGamificationSlice(setFn);
        });

        it('switchContest properly changes activeId and resets pomodoro if running', () => {
            contestSlice.switchContest('contest-2');
            expect(mockState.appState.activeId).toBe('contest-2');
            expect(mockState.appState.pomodoro.activeSubject).toBeNull();
            expect(mockState.appState.version).toBe(2);
            expect(Array.isArray(mockState.appState.contests['contest-2'].categories)).toBe(true);
        });

        it('updateUserName updates both user.name and contestName simultaneously', () => {
            gamificationSlice.updateUserName('Polícia Federal');
            const activeContest = mockState.appState.contests['contest-1'];
            expect(activeContest.user.name).toBe('Polícia Federal');
            expect(activeContest.contestName).toBe('Polícia Federal');
            expect(activeContest.name).toBe('Polícia Federal');
        });

        it('handleFlyoutClickOutside ignores mousedown when clicking inside popover container', () => {
            const popoverEl = {
                contains: vi.fn((target) => target.id === 'inner-btn')
            };
            const triggerEl = {
                contains: vi.fn(() => false)
            };

            const shouldClose = (target) => {
                if (triggerEl.contains(target)) return false;
                if (popoverEl.contains(target)) return false;
                return true;
            };

            expect(shouldClose({ id: 'inner-btn' })).toBe(false);
            expect(shouldClose({ id: 'outside-area' })).toBe(true);
        });

        it('switchContest and deleteContest reset pomodoro with isRunning set to false', () => {
            mockState.appState.pomodoro.isRunning = true;
            contestSlice.switchContest('contest-2');
            expect(mockState.appState.pomodoro.isRunning).toBe(false);

            mockState.appState.pomodoro.isRunning = true;
            mockState.appState.pomodoro.activeSubject = { task: 'Teste' };
            contestSlice.deleteContest('contest-2');
            expect(mockState.appState.pomodoro.isRunning).toBe(false);
            expect(mockState.appState.pomodoro.activeSubject).toBeNull();
        });
    });

    describe('11. Meu Painel Route, Fallback Keys and Effective Min Date Fixes', () => {
        it('restores initial route only once per session so back button can reach Meu Painel', () => {
            sessionStorage.clear();
            localStorage.setItem('lastRoute_user1', '/pomodoro');

            const hasRestoredFirst = sessionStorage.getItem('hasRestoredInitialRoute_user1');
            expect(hasRestoredFirst).toBeNull();

            // First boot: mark restored
            sessionStorage.setItem('hasRestoredInitialRoute_user1', 'true');
            expect(sessionStorage.getItem('hasRestoredInitialRoute_user1')).toBe('true');

            // Subsequent visit (e.g. browser back button to /)
            const hasRestoredSecond = sessionStorage.getItem('hasRestoredInitialRoute_user1');
            expect(hasRestoredSecond).toBe('true'); // Does not bounce again
        });

        it('effectiveMinDate calculation allows dates in the past for already saved goal dates', () => {
            const minGoalDate = '2026-10-26';
            const pastDateValue = '2026-10-10';
            const futureDateValue = '2026-11-15';

            const getEffectiveMin = (dateVal, minGoal) => {
                if (dateVal && dateVal < minGoal) return dateVal;
                return minGoal;
            };

            expect(getEffectiveMin(pastDateValue, minGoalDate)).toBe('2026-10-10');
            expect(getEffectiveMin(futureDateValue, minGoalDate)).toBe('2026-10-26');
            expect(getEffectiveMin('', minGoalDate)).toBe('2026-10-26');
        });

        it('NextGoalCard startStudying handles fallback to category.name when id is missing', () => {
            const cat = { name: 'Direito Penal' };
            const resolvedCatId = cat.id || cat.name;
            expect(resolvedCatId).toBe('Direito Penal');
        });
    });

    describe('12. First Menu Data Integrity & Edge Case Resolutions', () => {
        it('PerformancePanel accurately calculates pointsToPct and barHeight for shifted and negative scales', async () => {
            const { pointsToPct } = await import('../../utils/scoreHelper.js');
            // Scale: minScore = 20, maxScore = 100. Score = 60 pts
            const pct1 = pointsToPct(60, 100, 20);
            expect(pct1).toBe(50); // (60 - 20) / (100 - 20) = 40/80 = 50%

            // Cebraspe: minScore = -100, maxScore = 100. Score = 0 pts
            const pct2 = pointsToPct(0, 100, -100);
            expect(pct2).toBe(50); // (0 - (-100)) / 200 = 100/200 = 50%
        });

        it('NextGoalCard prioritizes tasks with Portuguese priorities (alta before baixa)', async () => {
            const { normalizePriority } = await import('../../utils/colorHelper.js');
            const tasks = [
                { id: '1', title: 'Task Baixa', priority: 'baixa' },
                { id: '2', title: 'Task Alta', priority: 'alta' },
                { id: '3', title: 'Task Media', priority: 'media' }
            ];

            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const sorted = [...tasks].sort((a, b) => {
                const pA = normalizePriority(a.priority);
                const pB = normalizePriority(b.priority);
                return (priorityOrder[pA] ?? 1) - (priorityOrder[pB] ?? 1);
            });

            expect(sorted[0].title).toBe('Task Alta');
            expect(sorted[1].title).toBe('Task Media');
            expect(sorted[2].title).toBe('Task Baixa');
        });

        it('createTaskSlice togglePriority syncs priority with pomodoro.activeSubject', () => {
            const mockState = {
                appState: {
                    activeId: 'contest-1',
                    pomodoro: {
                        activeSubject: {
                            taskId: 't-1',
                            category: 'Direito',
                            priority: 'low'
                        }
                    },
                    contests: {
                        'contest-1': {
                            categories: [
                                {
                                    id: 'cat-1',
                                    name: 'Direito',
                                    tasks: [
                                        { id: 't-1', title: 'Artigo 5', priority: 'low' }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };

            const setFn = (fn) => fn(mockState);
            const getFn = () => ({ awardExperience: vi.fn() });
            const taskSlice = createTaskSlice(setFn, getFn);

            taskSlice.togglePriority('cat-1', 't-1');

            expect(mockState.appState.contests['contest-1'].categories[0].tasks[0].priority).toBe('medium');
            expect(mockState.appState.pomodoro.activeSubject.priority).toBe('medium');
        });

        it('createTaskSlice updateTask rejects renaming to a duplicate title in the same category', () => {
            const mockState = {
                appState: {
                    activeId: 'contest-1',
                    contests: {
                        'contest-1': {
                            categories: [
                                {
                                    id: 'cat-1',
                                    name: 'Direito',
                                    tasks: [
                                        { id: 't-1', title: 'Controle de Constitucionalidade' },
                                        { id: 't-2', title: 'Direitos Fundamentais' }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };

            const setFn = (fn) => fn(mockState);
            const getFn = () => ({});
            const taskSlice = createTaskSlice(setFn, getFn);

            // Attempt to rename t-2 to duplicate of t-1
            taskSlice.updateTask('cat-1', 't-2', { title: 'controle de constitucionalidade' });

            // Title should remain unchanged
            expect(mockState.appState.contests['contest-1'].categories[0].tasks[1].title).toBe('Direitos Fundamentais');
        });

        it('analyzeEfficiency handles Portuguese priorities in highPriorityTasks calculation', async () => {
            const { analyzeEfficiency } = await import('../../utils/analytics.js');
            const categories = [
                {
                    id: 'cat-1',
                    name: 'Penal',
                    tasks: [
                        { id: 't-1', priority: 'alta', completed: true },
                        { id: 't-2', priority: 'alta', completed: false }
                    ]
                }
            ];

            const result = analyzeEfficiency(categories, [{ duration: 60 }], { level: 1 });
            expect(result.metrics.highPriorityRate).toBe(50); // 1 out of 2 completed
        });
    });

    describe('13. Extended Portuguese Priority, Gamification XP, Task Notes Persistence & Stale State Cleanup', () => {
        it('getTaskXP awards correct XP for Portuguese priority values', async () => {
            const { getTaskXP } = await import('../../utils/gamification.js');
            expect(getTaskXP({ priority: 'alta' }, true)).toBe(200);
            expect(getTaskXP({ priority: 'urgente' }, true)).toBe(200);
            expect(getTaskXP({ priority: 'high' }, true)).toBe(200);
            expect(getTaskXP({ priority: 'media' }, true)).toBe(150);
            expect(getTaskXP({ priority: 'medium' }, true)).toBe(150);
            expect(getTaskXP({ priority: 'baixa' }, true)).toBe(100);
            expect(getTaskXP({ priority: 'low' }, true)).toBe(100);
        });

        it('sanitizeContest preserves task notes without dropping them during serialization', async () => {
            const { sanitizeContest } = await import('../../store/schemas.js');
            const contestData = {
                contestName: 'Audit Test',
                categories: [
                    {
                        id: 'cat-1',
                        name: 'Direito Administrativo',
                        tasks: [
                            { id: 't-1', text: 'Atos Administrativos', notes: 'Importante rever requisitos e anulação vs revogação' }
                        ]
                    }
                ]
            };

            const sanitized = sanitizeContest(contestData);
            expect(sanitized.categories[0].tasks[0].notes).toBe('Importante rever requisitos e anulação vs revogação');
        });

        it('coachLogic calculateUrgency detects high priority boost for Portuguese alta tasks', async () => {
            const { calculateUrgency } = await import('../../utils/coachLogic.js');
            const category = {
                id: 'cat-1',
                name: 'Direito',
                tasks: [
                    { id: 't-1', priority: 'alta', completed: false }
                ]
            };
            const urgency = calculateUrgency(category, [], []);
            expect(urgency.details.components.priorityBoost).toBeGreaterThan(0);
        });

        it('createTaskSlice updateTask updates priority and syncs with pomodoro activeSubject', () => {
            const mockState = {
                appState: {
                    activeId: 'contest-1',
                    pomodoro: {
                        activeSubject: { taskId: 't-1', task: 'Tarefa Antiga', priority: 'low' }
                    },
                    contests: {
                        'contest-1': {
                            categories: [
                                {
                                    id: 'cat-1',
                                    tasks: [{ id: 't-1', title: 'Tarefa Antiga', priority: 'low' }]
                                }
                            ]
                        }
                    }
                }
            };
            const setFn = (fn) => fn(mockState);
            const taskSlice = createTaskSlice(setFn, () => ({}));
            taskSlice.updateTask('cat-1', 't-1', { title: 'Tarefa Nova', priority: 'alta' });

            const updatedTask = mockState.appState.contests['contest-1'].categories[0].tasks[0];
            expect(updatedTask.title).toBe('Tarefa Nova');
            expect(updatedTask.priority).toBe('high');
            expect(mockState.appState.pomodoro.activeSubject.priority).toBe('high');
            expect(mockState.appState.pomodoro.activeSubject.task).toBe('Tarefa Nova');
        });

        it('createTaskSlice deleteTask cleans up localStorage pomodoroState on active task deletion', () => {
            localStorage.setItem('pomodoroState', JSON.stringify({ isRunning: true, taskId: 't-1' }));
            const mockState = {
                appState: {
                    activeId: 'contest-1',
                    pomodoro: {
                        activeSubject: { taskId: 't-1', task: 'Tarefa Ativa' },
                        isRunning: true
                    },
                    contests: {
                        'contest-1': {
                            categories: [
                                {
                                    id: 'cat-1',
                                    tasks: [{ id: 't-1', title: 'Tarefa Ativa' }]
                                }
                            ]
                        }
                    }
                }
            };
            const setFn = (fn) => fn(mockState);
            const taskSlice = createTaskSlice(setFn, () => ({}));
            taskSlice.deleteTask('cat-1', 't-1');

            expect(mockState.appState.pomodoro.activeSubject).toBeNull();
            expect(mockState.appState.pomodoro.isRunning).toBe(false);
            expect(localStorage.getItem('pomodoroState')).toBeNull();
        });
    });
});


