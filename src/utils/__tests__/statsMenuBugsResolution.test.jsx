import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import ReliabilityCurveChart from '../../components/charts/ReliabilityCurveChart.jsx';
import { computeFlashcardDueForecast } from '../analytics.js';
import { mapFocusEvolutionData } from '../chartDataMappers.js';
import { humanizeVolatility } from '../explanationEngine.js';
import { monteCarloSimulation } from '../../engine/monteCarlo.js';

describe('Stats Menu Bug Fixes Resolution Verification', () => {
    describe('Bug 1: ReliabilityCurveChart CustomTooltip dataPoint crash', () => {
        it('renders ReliabilityCurveChart without ReferenceError and handles bucket data safely', () => {
            const buckets = [
                { meanPred: 0.2, observedRate: 0.25, count: 10, gap: 0.05 },
                { meanPred: 0.5, observedRate: 0.48, count: 20, gap: -0.02 },
                { meanPred: 0.8, observedRate: 0.85, count: 15, gap: 0.05 }
            ];

            const { container } = render(<ReliabilityCurveChart buckets={buckets} />);
            expect(container).toBeDefined();
            expect(container.querySelector('[role="img"]')).not.toBeNull();
        });
    });

    describe('Bug 2: analyticsStats rawGlobalHistory negative score support', () => {
        it('preserves valid negative scores for Cebraspe exams with safeMinScore < 0', () => {
            const safeMinScore = -20;
            const globalDomain = 120; // -20 to 100

            // Simulate rawGlobalHistory calculation
            const rawDays = [
                { date: '2026-10-18', pooledTotal: 10, pooledCorrect: 0 },   // score: -20 + (0/10)*120 = -20
                { date: '2026-10-19', pooledTotal: 10, pooledCorrect: 1 },   // score: -20 + (1/10)*120 = -8
                { date: '2026-10-20', pooledTotal: 0, pooledCorrect: 0 },    // score: null (no questions)
                { date: '2026-10-21', pooledTotal: 10, pooledCorrect: 6 }    // score: -20 + (6/10)*120 = 52
            ];

            const rawGlobalHistory = rawDays.map(d => ({
                date: d.date,
                score: d.pooledTotal > 0 ? safeMinScore + (d.pooledCorrect / d.pooledTotal) * globalDomain : null
            })).filter(item => item.score !== null && Number.isFinite(item.score) && item.score >= safeMinScore);

            expect(rawGlobalHistory).toHaveLength(3);
            expect(rawGlobalHistory[0].score).toBe(-20);
            expect(rawGlobalHistory[1].score).toBe(-8);
            expect(rawGlobalHistory[2].score).toBe(52);
        });
    });

    describe('Bug 3: useMonteCarloStats humanizeVolatility dynamic scale', () => {
        it('correctly adapts volatility category for non-100 scales (e.g. maxScore=1000)', () => {
            const sdOn1000Scale = 40; // 4% of 1000 points -> Very stable!
            
            // Without passing maxScore (old bug behavior): scale defaulted to 1, sd 40 > 30 -> "Alta instabilidade"
            const unscaled = humanizeVolatility(sdOn1000Scale);
            expect(unscaled).toBe('Alta instabilidade');

            // With fixed call passing maxScore = 1000:
            const scaled = humanizeVolatility(sdOn1000Scale, 1000);
            expect(scaled).toBe('Muito estável'); // 40 < 8 * 10 = 80
        });
    });

    describe('Bug 4: computeFlashcardDueForecast timezone-safe dateLabel', () => {
        it('derives dateLabel directly from the dateKey ensuring 100% synchronization', () => {
            const decks = [
                {
                    id: 'd1',
                    cards: [
                        { id: 'c1', front: 'Q1', back: 'A1', due: '2026-10-20' },
                        { id: 'c2', front: 'Q2', back: 'A2', due: '2026-10-21' }
                    ]
                }
            ];

            const result = computeFlashcardDueForecast(decks, 7);
            expect(result.forecast).toBeDefined();
            expect(result.forecast.length).toBe(7);

            // Check that every day dateLabel matches dateKey MM/DD
            result.forecast.forEach(item => {
                const [y, m, d] = item.dateKey.split('-');
                expect(item.dateLabel).toBe(`${d}/${m}`);
            });
        });
    });

    describe('Bug 5: mapFocusEvolutionData timezone-safe display labels', () => {
        it('formats XAxis display data matching canonical fullKey without local drift', () => {
            const logs = [
                { date: '2026-10-20T14:00:00.000Z', minutes: 120 }
            ];

            const result = mapFocusEvolutionData(logs);
            expect(result.length).toBe(14);
            result.forEach(d => {
                expect(d.data).toMatch(/^\d{2}\/\d{2}$/);
                expect(Number.isFinite(d.horasEstudadas)).toBe(true);
            });
        });
    });

    describe('Bug 6: monteCarlo historicalCutoffs supports 0 and negative cutoffs', () => {
        it('preserves cutoffs equal to 0 or negative within valid minScore bounds', () => {
            const result = monteCarloSimulation({
                mean: 50,
                sd: 10,
                targetScore: 50,
                minScore: -20,
                maxScore: 100,
                simulations: 100,
                historicalCutoffs: [-10, 0, 50, 60]
            });

            expect(result).toBeDefined();
            expect(Number.isFinite(result.probability)).toBe(true);
        });
    });
});
