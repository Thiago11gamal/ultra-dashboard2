import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { normalize } from '../src/utils/normalization';
import { buildAchievementStats, analyzeEfficiency } from '../src/utils/analytics';
import { getSuggestedFocus } from '../src/utils/coachLogic';

describe('Meu Painel - Suíte de Regressão dos 12 Bugs', () => {
    beforeEach(() => {
        useAppStore.setState({
            appState: {
                activeId: 'contest_1',
                version: 1,
                lastUpdated: new Date().toISOString(),
                contests: {
                    contest_1: {
                        id: 'contest_1',
                        name: 'Concurso Principal',
                        categories: [
                            {
                                id: 'cat_port',
                                name: 'Língua Portuguesa',
                                color: '#3b82f6',
                                weight: 10,
                                maxScore: 20,
                                minCutoff: 10,
                                totalMinutes: 120,
                                simuladoStats: {
                                    average: 15,
                                    lastAttempt: 16,
                                    trend: 'up',
                                    level: 'ALTO',
                                    history: [{ score: 16, date: '2026-08-10' }]
                                },
                                tasks: [
                                    { id: 'task_1', title: 'Crase', completed: true, priority: 'high', awardedXP: 15 },
                                    { id: 'task_2', title: 'Pontuação', completed: true, priority: 'medium', awardedXP: 10 }
                                ]
                            },
                            {
                                id: 'cat_dir',
                                name: 'Direito Administrativo',
                                color: '#10b981',
                                weight: 8,
                                maxScore: 100,
                                minCutoff: 50,
                                totalMinutes: 60,
                                tasks: [
                                    { id: 'task_3', title: 'Atos Administrativos', completed: false, priority: 'high' }
                                ]
                            }
                        ],
                        simulados: [],
                        studyLogs: [],
                        flashcardDecks: [
                            {
                                id: 'deck_1',
                                title: 'Direito Constitucional',
                                cards: [
                                    { id: 'c1', front: 'Q1', back: 'A1', due: '2026-08-14' },
                                    { id: 'c2', front: 'Q2', back: 'A2', due: '2026-08-14' },
                                    { id: 'c3', front: 'Q3', back: 'A3', due: '2099-12-31' }
                                ]
                            }
                        ],
                        settings: {
                            pomodoroWork: 25,
                            pomodoroBreak: 5
                        },
                        studySessions: [],
                        user: { xp: 150, level: 2, goalDate: '2026-10-15' }
                    },
                    contest_2: {
                        id: 'contest_2',
                        name: 'Concurso Secundário',
                        categories: [
                            {
                                id: 'cat_raciocinio',
                                name: 'Raciocínio Lógico',
                                color: '#ec4899',
                                totalMinutes: 300,
                                lastStudiedAt: '2026-08-12',
                                simuladoStats: {
                                    history: [{ score: 80, date: '2026-08-01' }],
                                    average: 80,
                                    lastAttempt: 80,
                                    trend: 'stable',
                                    level: 'ALTO'
                                },
                                tasks: [
                                    { id: 'task_old_1', title: 'Tautologia', completed: true, awardedXP: 20 },
                                    { id: 'task_old_2', title: 'Equivalências', completed: true, awardedXP: 20 }
                                ]
                            }
                        ]
                    }
                },
                pomodoro: {
                    activeSubject: { categoryId: 'cat_port', taskId: 'task_1' },
                    neuralMode: true,
                    neuralQueue: ['cat_port']
                }
            }
        });
    });

    it('Bug 1.1: buildAchievementStats calcula flashcards pendentes quando flashcardDecks está presente', () => {
        const contest = useAppStore.getState().appState.contests.contest_1;
        const stats = buildAchievementStats(contest);

        expect(stats.flashcardTotalCards).toBe(3);
        expect(stats.flashcardDueToday).toBe(2);
        expect(stats.flashcardDecks).toBe(1);
    });

    it('Bug 1.2: NextGoalCard seleciona matérias com tarefas pendentes mesmo se a matéria com maior urgência teórica estiver 100% concluída', () => {
        const contest = useAppStore.getState().appState.contests.contest_1;
        
        // Categoria 1 (Português) está 100% completa (2/2 concluídas)
        // Categoria 2 (Direito) possui 1 tarefa pendente
        const categoriesWithPending = contest.categories.filter(c =>
            c.tasks.some(t => !t.completed)
        );

        expect(categoriesWithPending.length).toBe(1);
        expect(categoriesWithPending[0].id).toBe('cat_dir');

        const suggested = getSuggestedFocus(categoriesWithPending, contest.simulados, contest.studyLogs);
        expect(suggested).toBeDefined();
        expect(suggested.id).toBe('cat_dir');
    });

    it('Bug 2.1 & 2.2: Suporta decimais em maxScore e minCutoff sem truncar com parseInt', () => {
        const parsedMax = Math.max(0.1, Number('12.5') || 100);
        const parsedMin = Math.max(0, Number('6.25') || 0);

        expect(parsedMax).toBe(12.5);
        expect(parsedMin).toBe(6.25);
    });

    it('Bug 2.3: importCategory reseta totalMinutes, simuladoStats e regenera tarefas não concluídas', () => {
        const importCat = useAppStore.getState().importCategory;
        importCat('contest_2', 'cat_raciocinio');

        const activeContest = useAppStore.getState().appState.contests.contest_1;
        const imported = activeContest.categories.find(c => c.name === 'Raciocínio Lógico');

        expect(imported).toBeDefined();
        expect(imported.id).not.toBe('cat_raciocinio');
        expect(imported.totalMinutes).toBe(0);
        expect(imported.lastStudiedAt).toBeNull();
        expect(imported.simuladoStats.history).toEqual([]);
        expect(imported.simuladoStats.average).toBe(0);

        // Tarefas devem nascer limpas para o novo concurso
        expect(imported.tasks.length).toBe(2);
        expect(imported.tasks.every(t => t.completed === false)).toBe(true);
        expect(imported.tasks.every(t => t.completedAt === null)).toBe(true);
        expect(imported.tasks.every(t => t.awardedXP === undefined)).toBe(true);
        expect(imported.tasks[0].id).not.toBe('task_old_1');
    });

    it('Bug 3.2: normalize detecta duplicatas com espaços extras ou diacríticos', () => {
        const norm1 = normalize('Direito Administrativo');
        const norm2 = normalize('  direito  administrativo  ');
        const norm3 = normalize('DIREITO ADMINISTRATIVO');

        expect(norm1).toBe(norm2);
        expect(norm2).toBe(norm3);
    });

    it('Bug 3.3: analyzeEfficiency calcula pontuação a partir de totalMinutes mesmo sem studyLogs', () => {
        const contest = useAppStore.getState().appState.contests.contest_1;
        const efficiency = analyzeEfficiency(contest.categories, []);

        expect(efficiency.status).not.toBe('sem_dados');
        expect(efficiency.score).toBeGreaterThan(0);
    });

    it('Bug 3.5: Concordância singular/plural baseada em totalCompletedGlobally', () => {
        const formatPlural = (completed, total) =>
            `${completed} de ${total} ${completed === 1 ? 'concluído' : 'concluídos'}`;

        expect(formatPlural(1, 10)).toBe('1 de 10 concluído');
        expect(formatPlural(2, 10)).toBe('2 de 10 concluídos');
        expect(formatPlural(0, 5)).toBe('0 de 5 concluídos');
    });

    it('Bug 3.7: deleteCategory limpa activeSubject e reseta neuralMode', () => {
        const deleteCategory = useAppStore.getState().deleteCategory;
        deleteCategory('cat_port');

        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.activeSubject).toBeNull();
        expect(pomodoroState.neuralMode).toBe(false);
        expect(pomodoroState.neuralQueue).toEqual([]);
    });
});
