import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SubtopicsTable from '../SubtopicsTable';

describe('SubtopicsTable rendering and accuracy calculation', () => {
    it('renders empty state when categories are empty', () => {
        const html = renderToStaticMarkup(<SubtopicsTable categories={[]} />);
        expect(html).toContain('Nenhuma disciplina cadastrada ainda');
    });

    it('handles topics with custom category maxScore and correctly computes accuracy percentage', () => {
        const categories = [
            {
                id: 'cat-port',
                name: 'Língua Portuguesa',
                maxScore: 20,
                minScore: 0,
                color: '#3b82f6',
                icon: '📖',
                tasks: [
                    { id: 't1', title: 'Crase' }
                ],
                simuladoStats: {
                    history: [
                        {
                            date: '2026-06-01',
                            topics: [
                                {
                                    name: 'Crase',
                                    total: 10,
                                    correct: 8,
                                    wrong: 2,
                                    score: 16 // 80% of 20 = 16 pts
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        const html = renderToStaticMarkup(<SubtopicsTable categories={categories} maxScore={100} />);
        expect(html).toContain('Crase');
        expect(html).toContain('Língua Portuguesa');
        expect(html).toContain('8 AC');
        expect(html).toContain('2 ER');
        expect(html).toContain('+6'); // 8 - 2 = 6
        expect(html).toContain('80%'); // Acertos% must be 80%, not 16%
    });

    it('prioritizes correct and wrong in penalizing/Cebraspe exams for subtopics', () => {
        const categories = [
            {
                id: 'cat-penal',
                name: 'Direito Penal',
                maxScore: 100,
                minScore: 0,
                tasks: [],
                simuladoStats: {
                    history: [
                        {
                            date: '2026-06-02',
                            topics: [
                                {
                                    name: 'Tipicidade',
                                    total: 50,
                                    correct: 40,
                                    wrong: 10,
                                    score: 30 // Cebraspe net: 40 - 10 = 30 pts
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        const html = renderToStaticMarkup(<SubtopicsTable categories={categories} maxScore={100} />);
        expect(html).toContain('Tipicidade');
        expect(html).toContain('40 AC');
        expect(html).toContain('10 ER');
        expect(html).toContain('+30');
        expect(html).toContain('80%');
    });
});
