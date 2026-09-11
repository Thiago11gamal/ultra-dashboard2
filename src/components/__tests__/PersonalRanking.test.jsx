import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PersonalRanking from '../PersonalRanking';

describe('PersonalRanking rendering contracts and accuracy', () => {
    it('renders empty state when categories are empty', () => {
        const html = renderToStaticMarkup(<PersonalRanking categories={[]} />);
        expect(html).toContain('Nenhuma disciplina cadastrada ainda');
    });

    it('handles categories with custom scales and Cebraspe net score without crashing or zero division', () => {
        const categories = [
            {
                id: 'cat-port',
                name: 'Português',
                maxScore: 20,
                minScore: 0,
                color: '#3b82f6',
                icon: '📖',
                simuladoStats: {
                    history: [
                        // 10 questions: 8 correct, 2 wrong. In Cebraspe, 8 - 2 = 6 net score.
                        { date: '2026-06-01', total: 10, correct: 8, wrong: 2, score: 6 }
                    ]
                }
            },
            {
                id: 'cat-dir',
                name: 'Direito Penal',
                maxScore: 100,
                minScore: 100, // Edge case: minScore === maxScore (range = 0)
                color: '#ef4444',
                icon: '⚖️',
                simuladoStats: {
                    history: [
                        { date: '2026-06-01', total: 5, correct: 1, wrong: 4, score: 20 }
                    ]
                }
            }
        ];

        const html = renderToStaticMarkup(<PersonalRanking categories={categories} />);
        expect(html).toContain('Português');
        // Saldo líquido of Portuguese must be +6 (8 - 2), not -8 or +2
        expect(html).toContain('+6');
        expect(html).toContain('Direito Penal');
    });
});
