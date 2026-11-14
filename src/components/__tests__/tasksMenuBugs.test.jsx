import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PersonalRanking from '../PersonalRanking';
import VolumeRanking from '../VolumeRanking';
import PerformanceTable from '../PerformanceTable';
import SubtopicsTable from '../SubtopicsTable';
import { createSimuladoSlice } from '../../store/slices/createSimuladoSlice';
import {
    resolveContestScoreDomain,
    resolveCategoryDomain,
    extractQuestionCounts,
    computeCategoryPerformanceStats
} from '../../utils/tasksStatsHelper';

describe('Menu Tarefas (/tasks) Bug Fixes & Improvements', () => {
    describe('1. Score Domain & Nullable Number Parsing (Number(null) === 0 fix)', () => {
        it('does not treat minScore: null or empty string as 0 when contest has custom minScore', () => {
            const contest = { maxScore: 1000, minScore: 200 };
            const categories = [
                { id: 'c1', name: 'Linguagens', maxScore: null, minScore: null },
                { id: 'c2', name: 'Matemática', maxScore: '', minScore: '' }
            ];

            const domain = resolveContestScoreDomain(contest, categories);
            expect(domain.maxScore).toBe(1000);
            expect(domain.minScore).toBe(200);

            const catDomain = resolveCategoryDomain(categories[0], domain.maxScore, domain.minScore);
            expect(catDomain.maxScore).toBe(1000);
            expect(catDomain.minScore).toBe(200);
            expect(catDomain.range).toBe(800);
        });

        it('derives correct count from score when correct is null or empty string', () => {
            const entryWithNullCorrect = {
                date: '2026-06-01',
                total: 20,
                correct: null,
                score: 80
            };
            const counts = extractQuestionCounts(entryWithNullCorrect, 100, 0);
            expect(counts.valid).toBe(true);
            expect(counts.total).toBe(20);
            expect(counts.correct).toBe(16);
            expect(counts.wrong).toBe(4);
        });

        it('aggregates question counts from topics when header total is missing or 0', () => {
            const entryWithTopicsOnly = {
                date: '2026-06-01',
                topics: {
                    t0: { name: 'Crase', total: 10, correct: 8, wrong: 2 },
                    t1: { name: 'Sintaxe', total: 5, correct: 4, wrong: 1 }
                }
            };
            const counts = extractQuestionCounts(entryWithTopicsOnly, 100, 0);
            expect(counts.valid).toBe(true);
            expect(counts.total).toBe(15);
            expect(counts.correct).toBe(12);
            expect(counts.wrong).toBe(3);
        });

        it('ignores invalid or unvalidated history entries and null items', () => {
            const cat = {
                id: 'c1',
                name: 'Direito Constitucional',
                maxScore: 100,
                minScore: 0,
                simuladoStats: {
                    history: [
                        null,
                        undefined,
                        { date: '2026-06-01', total: 20, correct: 18, valid: false },
                        { date: '2026-06-02', total: 20, correct: 15, validated: false },
                        { date: '2026-06-03', total: 10, correct: 9, valid: true }
                    ]
                }
            };

            const stats = computeCategoryPerformanceStats(cat, 100, 0);
            expect(stats.total).toBe(10);
            expect(stats.correct).toBe(9);
            expect(stats.wrong).toBe(1);
            expect(stats.balance).toBe(8);
            expect(stats.percentCorrect).toBe(90);
        });
    });

    describe('2. PersonalRanking Fixes', () => {
        it('does not crown a single negative-balance category as MVP Dominante', () => {
            const categories = [
                {
                    id: 'cat-neg',
                    name: 'Informática',
                    simuladoStats: {
                        history: [
                            { date: '2026-06-01', total: 10, correct: 2, wrong: 8 }
                        ]
                    }
                }
            ];

            const html = renderToStaticMarkup(<PersonalRanking categories={categories} />);
            expect(html).toContain('Informática');
            expect(html).toContain('-6');
            // MVP Dominante should show "Aguardando dados" while Alerta de Risco shows Informática
            expect(html).toContain('Aguardando dados');
        });

        it('does not crash when history contains null items', () => {
            const categories = [
                {
                    id: 'cat-1',
                    name: 'Português',
                    simuladoStats: {
                        history: [null, { date: '2026-06-01', total: 10, correct: 8, wrong: 2 }]
                    }
                }
            ];

            const html = renderToStaticMarkup(<PersonalRanking categories={categories} />);
            expect(html).toContain('Português');
            expect(html).toContain('+6');
        });
    });

    describe('3. VolumeRanking Fixes', () => {
        it('handles null history entries and topics-only entries without crashing', () => {
            const categories = [
                {
                    id: 'cat-1',
                    name: 'Direito Administrativo',
                    simuladoStats: {
                        history: [
                            null,
                            {
                                date: '2026-06-01',
                                topics: [{ name: 'Atos', total: 12, correct: 10, wrong: 2 }]
                            }
                        ]
                    }
                }
            ];

            const html = renderToStaticMarkup(<VolumeRanking categories={categories} />);
            expect(html).toContain('Direito Administrativo');
            expect(html).toContain('12 Total');
            expect(html).toContain('Líder de Produção');
        });

        it('renders #1 rank instead of a Medal when category has 0 volume', () => {
            const categories = [
                {
                    id: 'cat-zero',
                    name: 'Contabilidade',
                    simuladoStats: { history: [] }
                }
            ];

            const html = renderToStaticMarkup(<VolumeRanking categories={categories} />);
            expect(html).toContain('Contabilidade');
            expect(html).toContain('#1');
            expect(html).toContain('Aguardando dados');
        });
    });

    describe('4. PerformanceTable Fixes', () => {
        it('displays real syllabus progress instead of hardcoded Level 0 Scholar', () => {
            const categories = [
                {
                    id: 'cat-1',
                    name: 'Direito Constitucional',
                    tasks: [
                        { id: 't1', title: 'Direitos Fundamentais', completed: true },
                        { id: 't2', title: 'Controle de Constitucionalidade', completed: false }
                    ],
                    simuladoStats: {
                        history: [{ date: '2026-06-01', total: 10, correct: 8, wrong: 2 }]
                    }
                }
            ];

            const html = renderToStaticMarkup(<PerformanceTable categories={categories} />);
            expect(html).toContain('1/2 tópicos (50%)');
            expect(html).not.toContain('Level 0 Scholar');
        });
    });

    describe('5. SubtopicsTable Fixes', () => {
        it('handles topics stored as a Firebase dictionary object and merges by taskId', () => {
            const categories = [
                {
                    id: 'cat-1',
                    name: 'Português',
                    tasks: [
                        { id: 'task-crase', title: 'Crase Avançada', completed: true }
                    ],
                    simuladoStats: {
                        history: [
                            {
                                date: '2026-06-01',
                                // Firebase dictionary object for topics + older topic name linked by taskId
                                topics: {
                                    0: {
                                        taskId: 'task-crase',
                                        name: 'Crase',
                                        total: 10,
                                        correct: null,
                                        score: 80
                                    }
                                }
                            }
                        ]
                    }
                }
            ];

            const html = renderToStaticMarkup(<SubtopicsTable categories={categories} />);
            expect(html).toContain('Crase Avançada');
            expect(html).toContain('8 AC');
            expect(html).toContain('2 ER');
            expect(html).toContain('+6');
            expect(html).toContain('80%');
        });
    });

    describe('6. SimuladoSlice resetSimuladoStats Firebase Dictionary Support', () => {
        it('resets simuladoStats even when categories is a Firebase dictionary object', () => {
            const mockState = {
                appState: {
                    activeId: 'default',
                    version: 1,
                    contests: {
                        default: {
                            simuladoRows: [{ id: 'r1', total: 10, correct: 8 }],
                            simulados: [{ id: 's1', score: 80 }],
                            categories: {
                                c0: {
                                    id: 'cat-1',
                                    name: 'Português',
                                    minScore: 10,
                                    simuladoStats: {
                                        history: [{ total: 10, correct: 8 }],
                                        average: 80,
                                        lastAttempt: 80,
                                        trend: 'up',
                                        level: 'ALTO'
                                    }
                                }
                            }
                        }
                    }
                }
            };

            const setFn = vi.fn((updater) => updater(mockState));
            const slice = createSimuladoSlice(setFn);

            expect(() => slice.resetSimuladoStats()).not.toThrow();

            const activeContest = mockState.appState.contests.default;
            expect(Array.isArray(activeContest.categories)).toBe(true);
            expect(activeContest.categories[0].simuladoStats.history).toEqual([]);
            expect(activeContest.categories[0].simuladoStats.average).toBe(0);
            expect(activeContest.categories[0].simuladoStats.lastAttempt).toBe(10);
            expect(activeContest.simuladoRows).toEqual([]);
            expect(activeContest.simulados).toEqual([]);
            expect(mockState.appState.version).toBe(2);
        });
    });
});
