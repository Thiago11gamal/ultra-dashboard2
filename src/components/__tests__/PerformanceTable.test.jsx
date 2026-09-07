import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PerformanceTable from '../PerformanceTable';

describe('PerformanceTable rendering contracts', () => {
    it('renders empty state when categories are empty', () => {
        const html = renderToStaticMarkup(<PerformanceTable categories={[]} />);
        expect(html).toContain('Nenhuma disciplina carregada');
    });

    it('renders categories with history and trend without throwing trendValue is not defined', () => {
        const categories = [
            {
                id: 'cat-1',
                name: 'Direito Constitucional',
                maxScore: 100,
                minScore: 0,
                simuladoStats: {
                    history: [
                        { date: '2026-05-01', score: 70, total: 20 },
                        { date: '2026-05-02', score: 80, total: 20 },
                        { date: '2026-05-03', score: 90, total: 20 },
                    ],
                    trend: 'up'
                }
            },
            {
                id: 'cat-2',
                name: 'Direito Administrativo',
                maxScore: 100,
                minScore: 0,
                simuladoStats: {
                    history: [
                        { date: '2026-05-01', score: 90, total: 10 },
                        { date: '2026-05-02', score: 80, total: 10 },
                        { date: '2026-05-03', score: 70, total: 10 },
                    ],
                    trend: 'down'
                }
            },
            {
                id: 'cat-3',
                name: 'Português',
                maxScore: 100,
                minScore: 0,
                simuladoStats: {
                    history: [],
                    trend: 'stable'
                }
            }
        ];

        const html = renderToStaticMarkup(<PerformanceTable categories={categories} />);
        expect(html).toContain('Direito Constitucional');
        expect(html).toContain('Direito Administrativo');
        expect(html).toContain('Português');
        expect(html).toContain('Tendência recente:');
    });

    it('handles categories with custom scales correctly', () => {
        const categories = [
            {
                id: 'cat-custom',
                name: 'Redação',
                maxScore: 200,
                minScore: 0,
                simuladoStats: {
                    history: [
                        { date: '2026-05-01', score: 140, total: 1 },
                        { date: '2026-05-02', score: 160, total: 1 },
                    ]
                }
            }
        ];

        const html = renderToStaticMarkup(<PerformanceTable categories={categories} />);
        expect(html).toContain('Redação');
    });

    it('correctly calculates volume, accuracy and balance when history items lack total but have correct and wrong', () => {
        const categories = [
            {
                id: 'cat-partial',
                name: 'Legislação Especial',
                maxScore: 100,
                minScore: 0,
                simuladoStats: {
                    history: [
                        { createdAt: '2026-05-01T10:00:00Z', score: 80, correct: 8, wrong: 2 } // total is missing
                    ]
                }
            }
        ];

        const html = renderToStaticMarkup(<PerformanceTable categories={categories} />);
        expect(html).toContain('Legislação Especial');
        // Volume should be 10 (8+2), not 0
        expect(html).toContain('10');
        // Saldo should be +6 (8 - 2)
        expect(html).toContain('+6');
        // Accuracy should be 80%
        expect(html).toContain('80%');
    });

    it('prioritizes ground-truth correct count over net score in penalizing/Cebraspe exams', () => {
        const categories = [
            {
                id: 'cat-cebraspe',
                name: 'Direito Penal',
                maxScore: 100,
                minScore: 0,
                simuladoStats: {
                    history: [
                        // In Cebraspe, 80 correct - 20 wrong = 60 net points. Score is 60, but correct is 80.
                        { date: '2026-06-01', total: 100, correct: 80, wrong: 20, score: 60 }
                    ]
                }
            }
        ];

        const html = renderToStaticMarkup(<PerformanceTable categories={categories} />);
        expect(html).toContain('Direito Penal');
        expect(html).toContain('80 AC');
        expect(html).toContain('20 ER');
        expect(html).toContain('+60');
        expect(html).toContain('80%');
    });
});
