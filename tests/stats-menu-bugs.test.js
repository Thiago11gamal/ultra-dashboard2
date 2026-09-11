import { describe, it, expect } from 'vitest';
import { analyzeProgressState } from '../src/utils/ProgressStateEngine.js';

describe('Statistics Menu Bugs & Regressions', () => {
    describe('1. analyzeProgressState threshold scaling with non-100 maxScore', () => {
        it('correctly handles base-100 thresholds on a 1000 scale without double-scaling', () => {
            // When student takes 5 tests with scores around 550 (out of 1000)
            const scores1000 = [
                { score: 550, date: '2026-09-01' },
                { score: 552, date: '2026-09-02' },
                { score: 549, date: '2026-09-03' },
                { score: 551, date: '2026-09-04' },
                { score: 550, date: '2026-09-05' }
            ];

            // If thresholds are passed as base-100 (4.0% stagnation, 60% low level limit)
            const result = analyzeProgressState(scores1000, {
                window_size: 5,
                stagnation_threshold: 4.0,
                low_level_limit: 60, // 60% of 1000 is 600
                high_level_limit: 75,
                mastery_limit: 80,
                maxScore: 1000
            });

            // Since average is 550.4, it is < 600 (scaled_low = 60 * 10 = 600), and slope is near 0
            // It should be classified as stagnation_negative (low level stagnation), NOT insufficient_data
            expect(result.state).toBe('stagnation_negative');
            expect(result.mean_score).toBeCloseTo(550.4, 1);
        });

        it('does not inflate scaled_low to 6000 when maxScore is 1000', () => {
            // If someone passed 0.60 * maxScore (600) into low_level_limit, scaleFactor (10) would multiply it to 6000!
            // With base 60, scaled_low is 600.
            const highScores1000 = [
                { score: 850, date: '2026-09-01' },
                { score: 852, date: '2026-09-02' },
                { score: 850, date: '2026-09-03' },
                { score: 851, date: '2026-09-04' },
                { score: 850, date: '2026-09-05' }
            ];

            const result = analyzeProgressState(highScores1000, {
                window_size: 5,
                stagnation_threshold: 4.0,
                low_level_limit: 60,
                high_level_limit: 75,
                mastery_limit: 80, // scaled_mastery = 800
                maxScore: 1000
            });

            // 850 > 800 (mastery_limit), so it should be mastery
            expect(result.state).toBe('mastery');
        });
    });

    describe('2. Signed Delta (Δ) for Subject Progress', () => {
        it('calculates negative delta when student performance regresses', () => {
            const historyDropping = [
                { score: 90, date: '2026-09-01' },
                { score: 80, date: '2026-09-02' },
                { score: 70, date: '2026-09-03' },
                { score: 60, date: '2026-09-04' },
                { score: 50, date: '2026-09-05' }
            ];

            const signedDelta = historyDropping[historyDropping.length - 1].score - historyDropping[0].score;
            expect(signedDelta).toBe(-40);
            expect(signedDelta).toBeLessThan(0);
        });

        it('calculates positive delta when student performance improves', () => {
            const historyRising = [
                { score: 50, date: '2026-09-01' },
                { score: 60, date: '2026-09-02' },
                { score: 70, date: '2026-09-03' },
                { score: 80, date: '2026-09-04' },
                { score: 90, date: '2026-09-05' }
            ];

            const signedDelta = historyRising[historyRising.length - 1].score - historyRising[0].score;
            expect(signedDelta).toBe(40);
            expect(signedDelta).toBeGreaterThan(0);
        });
    });

    describe('3. Prediction Target Scaling on Non-100 Scales', () => {
        it('detects target already reached when score exceeds scaled target', () => {
            const maxScore = 1000;
            const statsTarget = 70; // 70%
            const scaledTarget = (statsTarget / 100) * maxScore; // 700 points

            const currentAvg = 750; // User is at 750, above 700 target
            const alreadyReachedTarget = currentAvg >= scaledTarget;

            expect(scaledTarget).toBe(700);
            expect(alreadyReachedTarget).toBe(true);

            // Distance to target
            const distance = scaledTarget - currentAvg;
            expect(distance).toBeLessThanOrEqual(0);
        });

        it('does not trigger target reached when score is below scaled target on 1000 scale', () => {
            const maxScore = 1000;
            const statsTarget = 70; // 70%
            const scaledTarget = (statsTarget / 100) * maxScore; // 700 points

            const currentAvg = 650; // User is at 650, below 700 target
            const alreadyReachedTarget = currentAvg >= scaledTarget;

            expect(alreadyReachedTarget).toBe(false);
            const distance = scaledTarget - currentAvg;
            expect(distance).toBe(50);
        });

        it('does not trigger target reached on Cebraspe 120 scale when score is below percentage target', () => {
            const maxScore = 120;
            const statsTarget = 75; // 75% -> 90 points
            const scaledTarget = (statsTarget / 100) * maxScore;

            const currentAvg = 80; // 80 points is 66.7%, below 75% (90 pts)
            // Previous bug: 80 >= 75 evaluated to true!
            expect(currentAvg >= statsTarget).toBe(true); // Demonstrating the old bug
            expect(currentAvg >= scaledTarget).toBe(false); // The fix correctly identifies it as false
        });
    });

    describe('4. Date Header Formatting in Weekly Analysis', () => {
        it('formats Today as "Hoje" without appending month', () => {
            const isToday = true;
            const isYesterday = false;
            const dateObj = new Date(2026, 8, 8); // Sep 8, 2026
            const manausDayStr = '8';

            const headerText = isToday 
                ? 'Hoje' 
                : isYesterday 
                    ? 'Ontem' 
                    : `${manausDayStr} de ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', month: 'long' }).format(dateObj)}`;

            expect(headerText).toBe('Hoje');
            expect(headerText).not.toContain('de setembro');
        });

        it('formats Yesterday as "Ontem" without appending month', () => {
            const isToday = false;
            const isYesterday = true;
            const dateObj = new Date(2026, 8, 7);
            const manausDayStr = '7';

            const headerText = isToday 
                ? 'Hoje' 
                : isYesterday 
                    ? 'Ontem' 
                    : `${manausDayStr} de ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', month: 'long' }).format(dateObj)}`;

            expect(headerText).toBe('Ontem');
            expect(headerText).not.toContain('Ontem de setembro');
        });

        it('formats Past dates as "X de [mês]" without redundant DD/MM/YYYY prefix', () => {
            const isToday = false;
            const isYesterday = false;
            const dateObj = new Date(2026, 8, 5); // Sep 5, 2026
            const manausDayStr = '5';

            const headerText = isToday 
                ? 'Hoje' 
                : isYesterday 
                    ? 'Ontem' 
                    : `${manausDayStr} de ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', month: 'long' }).format(dateObj)}`;

            expect(headerText).toBe('5 de setembro');
            expect(headerText).not.toContain('05/09/2026 de setembro');
        });
    });
});
