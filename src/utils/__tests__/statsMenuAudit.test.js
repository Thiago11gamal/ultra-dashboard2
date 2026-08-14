import { describe, it, expect } from 'vitest';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../chartDataMappers.js';
import { analyzeProgressState } from '../ProgressStateEngine.js';
import { getDateKey, normalizeDate, APP_TIMEZONE, formatDatePtBR } from '../dateHelper.js';
import { computeFlashcardDueForecast, getFlashcardTotalCards, getFlashcardDueTodayCount } from '../analytics.js';

describe('Stats Menu Audit & Regression Tests', () => {
    describe('mapFocusEvolutionData', () => {
        it('deve gerar exatamente 14 dias sem shift de fuso', () => {
            const result = mapFocusEvolutionData([]);
            expect(result).toHaveLength(14);
            expect(result[13].horasEstudadas).toBe(0);
        });

        it('deve acumular horas estudadas corretamente com minutes e duration', () => {
            const todayMidday = normalizeDate(getDateKey(new Date()));
            const logs = [
                { date: todayMidday.toISOString(), minutes: 60, categoryId: '1' },
                { date: todayMidday.toISOString(), duration: 30, categoryId: '2' },
            ];

            const result = mapFocusEvolutionData(logs);
            expect(result[13].horasEstudadas).toBe(1.5);
        });
    });

    describe('mapSubjectHoursData', () => {
        it('deve agrupar por id e por nome de matéria com fallback', () => {
            const categories = [
                { id: '1', name: 'Direito Constitucional' },
                { id: '2', name: 'Direito Administrativo' }
            ];

            const logs = [
                { categoryId: '1', minutes: 120 },
                { categoryId: '2', duration: 60 },
                { subject: 'Direito Constitucional', minutes: 30 }, // match por subject
                { categoryName: 'Informática', minutes: 45 } // matéria nova sem id
            ];

            const result = mapSubjectHoursData(logs, categories);
            expect(result).toHaveLength(3);
            
            const constItem = result.find(r => r.disciplina === 'Direito Constitucional');
            expect(constItem.horas).toBe(2.5); // (120 + 30) / 60

            const admItem = result.find(r => r.disciplina === 'Direito Administrativo');
            expect(admItem.horas).toBe(1.0); // 60 / 60

            const infoItem = result.find(r => r.disciplina === 'Informática');
            expect(infoItem.horas).toBe(0.75); // 45 / 60
        });
    });

    describe('Flashcards Indicators Resilience', () => {
        it('deve processar decks e cards estruturados como arrays ou mapas de objetos sem crash', () => {
            const decksAsMap = {
                deck1: {
                    id: 'deck1',
                    cards: {
                        c1: { id: 'c1', due: '2026-08-14', reviews: 4, interval: 10 },
                        c2: { id: 'c2', due: '2026-08-15', reviews: 2, interval: 2 }
                    }
                },
                deck2: {
                    id: 'deck2',
                    cards: [
                        { id: 'c3', due: '2026-08-14', reviews: 5, interval: 25 }
                    ]
                }
            };

            const total = getFlashcardTotalCards(decksAsMap);
            expect(total).toBe(3);

            const forecast = computeFlashcardDueForecast(decksAsMap, 7);
            expect(forecast.forecast).toHaveLength(7);
            expect(forecast.totalDueInHorizon).toBeGreaterThanOrEqual(2);
        });
    });

    describe('ProgressStateEngine Scale Invariance', () => {
        it('deve produzir os mesmos estados proporcionais em maxScore=100 e maxScore=1000', () => {
            const scores100 = [
                { score: 80, date: new Date('2026-08-01T12:00:00-04:00').getTime() },
                { score: 82, date: new Date('2026-08-02T12:00:00-04:00').getTime() },
                { score: 85, date: new Date('2026-08-03T12:00:00-04:00').getTime() },
                { score: 88, date: new Date('2026-08-04T12:00:00-04:00').getTime() },
                { score: 90, date: new Date('2026-08-05T12:00:00-04:00').getTime() }
            ];

            const scores1000 = scores100.map(s => ({
                score: s.score * 10,
                date: s.date
            }));

            const analysis100 = analyzeProgressState(scores100, {
                window_size: 5,
                stagnation_threshold: 4,
                low_level_limit: 60,
                high_level_limit: 70,
                mastery_limit: 70,
                maxScore: 100
            });

            const analysis1000 = analyzeProgressState(scores1000, {
                window_size: 5,
                stagnation_threshold: 4,
                low_level_limit: 60,
                high_level_limit: 70,
                mastery_limit: 70,
                maxScore: 1000
            });

            expect(analysis100.state).toBe(analysis1000.state);
            expect(analysis1000.mean_score).toBeCloseTo(analysis100.mean_score * 10, 1);
        });
    });
});
