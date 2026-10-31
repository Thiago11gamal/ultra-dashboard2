import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import WeeklyAnalysis from '../../components/WeeklyAnalysis';
import {
    isInternalId,
    extractTopicFromInternalId,
    resolveHumanTaskTitle
} from '../taskTitleHelper';
import { createStudySlice } from '../../store/slices/createStudySlice';

describe('Stats Menu & WeeklyAnalysis Human Titles Audit', () => {
    describe('1. isInternalId Detection', () => {
        it('identifica corretamente IDs sintéticos de máquina do AI Coach e do sistema', () => {
            expect(isInternalId('cat-1772560345316-opevcca-topic-c1-0')).toBe(true);
            expect(isInternalId('cat-1772560345316-opevcca-geral-1-nnaz3s')).toBe(true);
            expect(isInternalId('cat-1772560306718-6x9boha-geral-1-18fvwb5')).toBe(true);
            expect(isInternalId('task-1772560306718')).toBe(true);
            expect(isInternalId('session-1772560306718-abc')).toBe(true);
            expect(isInternalId('log-1772560306718-xyz')).toBe(true);
            expect(isInternalId('temp-999-alpha')).toBe(true);
            expect(isInternalId('1772560345316')).toBe(true);
            expect(isInternalId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        });

        it('NÃO marca títulos legítimos de tópicos como IDs internos', () => {
            expect(isInternalId('c1')).toBe(false);
            expect(isInternalId('b1')).toBe(false);
            expect(isInternalId('Revisão Geral')).toBe(false);
            expect(isInternalId('Revisão Geral Complementar')).toBe(false);
            expect(isInternalId('Direito Penal: Teoria do Crime')).toBe(false);
            expect(isInternalId('Artigo 5º da CF')).toBe(false);
            expect(isInternalId('Sessão de Estudo')).toBe(false);
            expect(isInternalId('')).toBe(false);
            expect(isInternalId(null)).toBe(false);
        });
    });

    describe('2. extractTopicFromInternalId', () => {
        const categories = [
            {
                id: 'cat-1772560345316-opevcca',
                name: 'hermenêutica e argumentação jurídica',
                tasks: [
                    { id: 'tsk-c1', text: 'c1' },
                    { id: 'tsk-c2', text: 'c2' }
                ]
            }
        ];

        it('extrai Revisão Geral de IDs com -geral-', () => {
            const title = extractTopicFromInternalId('cat-1772560345316-opevcca-geral-1-nnaz3s', categories[0]);
            expect(title).toBe('Revisão Geral');
        });

        it('extrai e faz match com a tarefa correspondente no tópico', () => {
            const title = extractTopicFromInternalId('cat-1772560345316-opevcca-topic-c1-0', categories[0]);
            expect(title).toBe('c1');
        });

        it('extrai o slug mesmo se a categoria não possuir a tarefa explicitamente cadastrada', () => {
            const title = extractTopicFromInternalId('cat-1772560345316-opevcca-topic-topicoespecifico-0', null);
            expect(title).toBe('topicoespecifico');
        });
    });

    describe('3. resolveHumanTaskTitle', () => {
        const cat = {
            id: 'cat-1772560345316-opevcca',
            name: 'hermenêutica e argumentação jurídica',
            tasks: [{ id: 'tsk-c1', text: 'c1' }]
        };

        it('resolve IDs brutos do AI Coach para títulos humanos elegantes', () => {
            expect(resolveHumanTaskTitle(
                'cat-1772560345316-opevcca-topic-c1-0',
                'cat-1772560345316-opevcca-topic-c1-0',
                cat
            )).toBe('c1');

            expect(resolveHumanTaskTitle(
                'cat-1772560345316-opevcca-geral-1-nnaz3s',
                'cat-1772560345316-opevcca-geral-1-nnaz3s',
                cat
            )).toBe('Revisão Geral');

            expect(resolveHumanTaskTitle(
                '',
                'cat-1772560306718-6x9boha-geral-1-18fvwb5',
                { id: 'cat-2', name: 'Direito das Obrigações' }
            )).toBe('Revisão Geral');
        });

        it('preserva títulos humanos normais', () => {
            expect(resolveHumanTaskTitle('c1', 'tsk-c1', cat)).toBe('c1');
            expect(resolveHumanTaskTitle('Direito Civil: Contratos', 'tsk-1', { name: 'Direito Civil' })).toBe('Contratos');
        });
    });

    describe('4. WeeklyAnalysis UI Integration & Same-day Merging', () => {
        it('renderiza títulos humanos sem expor machine IDs e consolida sessões do mesmo tópico no dia', () => {
            const categories = [
                {
                    id: 'cat-herm',
                    name: 'hermenêutica e argumentação jurídica',
                    color: '#3b82f6',
                    tasks: [{ id: 'tsk-c1', text: 'c1' }]
                },
                {
                    id: 'cat-obrig',
                    name: 'Direito das Obrigações',
                    color: '#10b981',
                    tasks: [{ id: 'tsk-b1', text: 'b1' }]
                }
            ];

            const now = new Date().toISOString();

            // Logs que reproduzem o print do usuário com os IDs sintéticos
            const studyLogs = [
                // Sessão 1 de c1 (manual)
                {
                    id: 'log-1',
                    date: now,
                    categoryId: 'cat-herm',
                    taskId: 'tsk-c1',
                    taskTitle: 'c1',
                    minutes: 50
                },
                // Sessão 2 de c1 (via AI Coach com ID sintético)
                {
                    id: 'log-2',
                    date: now,
                    categoryId: 'cat-herm',
                    taskId: 'cat-herm-topic-c1-0',
                    taskTitle: 'cat-herm-topic-c1-0',
                    minutes: 79
                },
                // Sessão de revisão geral via Coach
                {
                    id: 'log-3',
                    date: now,
                    categoryId: 'cat-herm',
                    taskId: 'cat-herm-geral-1-nnaz3s',
                    taskTitle: 'cat-herm-geral-1-nnaz3s',
                    minutes: 25
                },
                // Direito das Obrigações com geral sintético e b1
                {
                    id: 'log-4',
                    date: now,
                    categoryId: 'cat-obrig',
                    taskId: 'cat-obrig-geral-1-18fvwb5',
                    taskTitle: 'cat-obrig-geral-1-18fvwb5',
                    minutes: 5
                },
                {
                    id: 'log-5',
                    date: now,
                    categoryId: 'cat-obrig',
                    taskId: 'tsk-b1',
                    taskTitle: 'b1',
                    minutes: 25
                }
            ];

            const { container } = render(
                <WeeklyAnalysis studyLogs={studyLogs} categories={categories} />
            );

            const textContent = container.textContent;

            // NENHUM machine ID pode vazar para o DOM!
            expect(textContent).not.toContain('cat-herm-topic-c1-0');
            expect(textContent).not.toContain('cat-herm-geral-1-nnaz3s');
            expect(textContent).not.toContain('cat-obrig-geral-1-18fvwb5');

            // Tópicos humanos devem ser exibidos
            expect(screen.getAllByText('c1').length).toBeGreaterThan(0);
            expect(screen.getAllByText('b1').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Revisão Geral').length).toBeGreaterThan(0);

            // c1 deve ter mesclado 50m + 79m = 129m (2h09)
            expect(textContent).toContain('+2h09');

            // Revisão Geral deve ter +25m
            expect(textContent).toContain('+25m');

            // Hermenêutica deve exibir 2 tarefas (c1 consolidado e Revisão Geral) e NÃO 3
            expect(textContent).toContain('2 tarefas');
        });
    });

    describe('5. createStudySlice Persistence Protection', () => {
        it('nunca persiste IDs de máquina como taskTitle ao registrar sessões de estudo', () => {
            let state = {
                appState: {
                    activeId: 'contest-1',
                    contests: {
                        'contest-1': {
                            categories: [
                                {
                                    id: 'cat-herm',
                                    name: 'hermenêutica e argumentação jurídica',
                                    tasks: [{ id: 'tsk-c1', text: 'c1' }]
                                }
                            ],
                            studyLogs: [],
                            studySessions: []
                        }
                    }
                }
            };

            const set = (fn) => fn(state);
            const get = () => state;
            const slice = createStudySlice(set, get);

            // Simula Pomodoro finalizado via AI Coach
            slice.handleUpdateStudyTime(
                'cat-herm',
                25,
                'cat-herm-topic-c1-0',
                'hermenêutica e argumentação jurídica: c1'
            );

            const activeContest = state.appState.contests['contest-1'];
            const lastLog = activeContest.studyLogs[0];
            const lastSession = activeContest.studySessions[0];

            expect(lastLog.taskTitle).toBe('c1');
            expect(lastSession.taskTitle).toBe('c1');

            // Simula Pomodoro de Revisão Geral via Coach sem override
            slice.handleUpdateStudyTime(
                'cat-herm',
                15,
                'cat-herm-geral-1-nnaz3s'
            );

            const secondLog = activeContest.studyLogs[1];
            expect(secondLog.taskTitle).toBe('Revisão Geral');
            expect(secondLog.taskTitle).not.toContain('cat-herm');
        });
    });
});
