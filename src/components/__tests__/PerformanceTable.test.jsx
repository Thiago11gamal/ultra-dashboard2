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
});
