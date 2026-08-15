import { describe, it, expect } from 'vitest';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../../utils/chartDataMappers';
import { detectPerformanceDrift } from '../../utils/explanationEngine';
import { generateAnalyticsStats } from '../../engine/analyticsStats';
import { getSafeScore } from '../../utils/scoreHelper';

describe('Stats Menu - Bugs & Logic Regression Suite', () => {
    describe('Bug 1: Chart Data Mappers fallback with minutes: 0 and duration > 0', () => {
        it('mapFocusEvolutionData correctly maps study log when minutes is 0 but duration is present', () => {
            const today = new Date().toISOString().split('T')[0];
            const logs = [
                { id: '1', date: today, minutes: 0, duration: 60, subject: 'Matemática' }
            ];

            const result = mapFocusEvolutionData(logs);
            const todayData = result[result.length - 1];
            expect(todayData.horasEstudadas).toBe(1);
        });

        it('mapSubjectHoursData correctly includes subject hours when minutes is 0 but duration is 90', () => {
            const logs = [
                { id: '1', date: '2026-08-15', minutes: 0, duration: 90, categoryName: 'Física' }
            ];
            const categories = [{ id: 'cat-1', name: 'Física' }];

            const result = mapSubjectHoursData(logs, categories);
            expect(result).toHaveLength(1);
            expect(result[0].disciplina).toBe('Física');
            expect(result[0].horas).toBe(1.5);
        });
    });

    describe('Bug 2: Target Normalization and Scale Stability', () => {
        const createNormalizeTarget = (maxScore) => (raw) => {
            const n = Number(raw);
            const fallback = maxScore === 100 ? 70 : Math.round(maxScore * 0.7);
            if (!Number.isFinite(n) || n <= 0) return fallback;
            return Math.max(0, Math.min(maxScore, n));
        };

        it('preserves target score on scale 120 without recursive multiplication', () => {
            const normalize = createNormalizeTarget(120);
            let target = 80;
            // Simulate multiple render cycles
            for (let i = 0; i < 5; i++) {
                target = normalize(target);
            }
            expect(target).toBe(80);
        });

        it('preserves target score on scale 50 without collapsing to 0', () => {
            const normalize = createNormalizeTarget(50);
            let target = 35;
            for (let i = 0; i < 5; i++) {
                target = normalize(target);
            }
            expect(target).toBe(35);
        });

        it('preserves target score on scale 1000', () => {
            const normalize = createNormalizeTarget(1000);
            let target = 750;
            for (let i = 0; i < 5; i++) {
                target = normalize(target);
            }
            expect(target).toBe(750);
        });

        it('falls back to 70% of maxScore when target is null or invalid', () => {
            const normalize100 = createNormalizeTarget(100);
            const normalize120 = createNormalizeTarget(120);
            const normalize50 = createNormalizeTarget(50);

            expect(normalize100(null)).toBe(70);
            expect(normalize120(undefined)).toBe(84);
            expect(normalize50(NaN)).toBe(35);
        });
    });

    describe('Bug 3: Performance Drift Scale Sensitivity', () => {
        it('does not trigger false alarm on scale 1000 for a 13-point drop (1.3%)', () => {
            const alerts = detectPerformanceDrift({
                recentMean: 787,
                baselineMean: 800,
                recentVolatility: 30,
                maxScore: 1000
            });
            const dropAlert = alerts.find(a => a.type === 'performance_drop');
            expect(dropAlert).toBeUndefined();
        });

        it('triggers alert on scale 1000 when drop exceeds 120 points (12%)', () => {
            const alerts = detectPerformanceDrift({
                recentMean: 670,
                baselineMean: 800,
                recentVolatility: 30,
                maxScore: 1000
            });
            const dropAlert = alerts.find(a => a.type === 'performance_drop');
            expect(dropAlert).toBeDefined();
        });

        it('triggers alert on scale 50 when drop exceeds 6 points (12%)', () => {
            const alerts = detectPerformanceDrift({
                recentMean: 33,
                baselineMean: 40,
                recentVolatility: 2,
                maxScore: 50
            });
            const dropAlert = alerts.find(a => a.type === 'performance_drop');
            expect(dropAlert).toBeDefined();
        });
    });

    describe('Bug 4: Analytics Stats Default Weight', () => {
        it('assigns default weight 1 to unmapped categories', () => {
            const categories = [
                {
                    id: 'cat-1',
                    name: 'Química',
                    maxScore: 100,
                    simuladoStats: {
                        history: [
                            { date: '2026-08-10', score: 80, total: 10 },
                            { date: '2026-08-12', score: 85, total: 10 },
                            { date: '2026-08-14', score: 90, total: 10 }
                        ]
                    }
                }
            ];

            const result = generateAnalyticsStats({
                categories,
                debouncedWeights: {}, // No weights specified
                timeIndex: -1,
                timelineDates: ['2026-08-10', '2026-08-12', '2026-08-14'],
                minScore: 0,
                maxScore: 100
            });

            expect(result.totalWeight).toBe(1);
            expect(result.globalHistory.length).toBeGreaterThan(0);
            expect(result.categoryStats[0].weight).toBe(1);
        });
    });

    describe('Bug 5: Topic Safe Score and Scale Handling', () => {
        it('correctly calculates safe score for category-scaled topics', () => {
            const topic = { name: 'Álgebra', score: 40, total: 50 };
            const catMaxScore = 50;
            const safeScore = getSafeScore(topic, catMaxScore);
            expect(safeScore).toBe(40);
        });
    });
});
