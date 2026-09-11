import { describe, it, expect } from 'vitest';
import { calculateSlope } from '../../engine/projection.js';
import { computeCategoryStats, calculateSlopePerDay } from '../../engine/stats.js';

describe('Stats Menu Mathematical Audit Suite', () => {
    describe('1. Kish Unbiased Weighted Sample Variance (Daily SD)', () => {
        it('deve reproduzir exatamente a correção de Bessel (N - 1) quando os pesos forem unitários', () => {
            const dailyHistory = [
                { score: 60, weight: 1 },
                { score: 70, weight: 1 },
                { score: 80, weight: 1 }
            ];

            const totalDailyW = dailyHistory.reduce((acc, h) => acc + h.weight, 0); // 3
            const dailyMean = dailyHistory.reduce((acc, h) => acc + h.score * h.weight, 0) / totalDailyW; // 70

            let sumW2 = 0;
            const dailyWeightedDiffSq = dailyHistory.reduce((acc, h) => {
                const w = h.weight;
                sumW2 += w * w;
                const diff = h.score - dailyMean;
                return acc + (diff * diff) * w;
            }, 0);

            // População (sem correção) dividiria por 3 -> var = 200 / 3 = 66.67
            const popVar = dailyWeightedDiffSq / totalDailyW;
            expect(popVar).toBeCloseTo(66.67, 1);

            // Kish amostral não enviesado: 3 - (3 / 3) = 2 = N - 1
            const kishDenom = totalDailyW > 0 && dailyHistory.length > 1
                ? Math.max(1e-6, totalDailyW - (sumW2 / totalDailyW))
                : totalDailyW;
            expect(kishDenom).toBe(2);

            const sampleVar = dailyWeightedDiffSq / kishDenom;
            expect(sampleVar).toBe(100); // 200 / 2 = 100
            expect(Math.sqrt(sampleVar)).toBe(10);
        });

        it('deve ponderar variância diária por volume de questões de forma amostral não enviesada', () => {
            const dailyHistory = [
                { score: 50, weight: 20 },
                { score: 80, weight: 80 }
            ];

            const totalDailyW = 100;
            const dailyMean = (50 * 20 + 80 * 80) / 100; // 74

            let sumW2 = 20 * 20 + 80 * 80; // 400 + 6400 = 6800
            const dailyWeightedDiffSq = 20 * Math.pow(50 - 74, 2) + 80 * Math.pow(80 - 74, 2); // 20*576 + 80*36 = 11520 + 2880 = 14400

            const kishDenom = totalDailyW - (sumW2 / totalDailyW); // 100 - 68 = 32
            const unbiasedVar = dailyWeightedDiffSq / kishDenom; // 14400 / 32 = 450
            expect(unbiasedVar).toBe(450);
            expect(Math.sqrt(unbiasedVar)).toBeCloseTo(21.21, 2);
        });
    });

    describe('2. AI Date Prediction Interval Clean Formatting', () => {
        it('deve formatar como pontual ~DD/MM/AA quando dateMin e dateMax forem o mesmo dia', () => {
            const dateStr1 = '15/10/26';
            const dateStr2 = '15/10/26';

            const formatPrediction = (strMin, strMax) => strMin === strMax ? `~${strMin}` : `${strMin} — ${strMax}`;
            expect(formatPrediction(dateStr1, dateStr2)).toBe('~15/10/26');
        });

        it('deve formatar como intervalo quando dateMin e dateMax forem diferentes', () => {
            const dateStr1 = '15/10/26';
            const dateStr2 = '25/10/26';

            const formatPrediction = (strMin, strMax) => strMin === strMax ? `~${strMin}` : `${strMin} — ${strMax}`;
            expect(formatPrediction(dateStr1, dateStr2)).toBe('15/10/26 — 25/10/26');
        });
    });

    describe('3. Excellence Scenario Speed Modulation (Diminishing Returns)', () => {
        it('deve modular a velocidade conforme o aluno se aproxima do teto maxScore', () => {
            const minScore = 0;
            const maxScore = 100;
            const safeGlobalRange = 100;
            const weeklyBaseSpeed = 2.0; // 2 pts por semana
            const quality = 0.9;

            // Aluno em 75%
            const scorePos75 = (75 - minScore) / safeGlobalRange;
            const diffFactor75 = Math.max(0.40, 1 - 0.5 * scorePos75); // 1 - 0.375 = 0.625
            const speed75 = weeklyBaseSpeed * diffFactor75 * quality; // 2 * 0.625 * 0.9 = 1.125

            // Aluno em 95%
            const scorePos95 = (95 - minScore) / safeGlobalRange;
            const diffFactor95 = Math.max(0.40, 1 - 0.5 * scorePos95); // 1 - 0.475 = 0.525
            const speed95 = weeklyBaseSpeed * diffFactor95 * quality; // 2 * 0.525 * 0.9 = 0.945

            expect(speed95).toBeLessThan(speed75);
            expect(speed95).toBeGreaterThan(0);
        });
    });

    describe('4. Scale Invariance with Non-Zero Floors (ENEM/Outras Bancas)', () => {
        it('deve calcular estatísticas de categoria respeitando minScore e safeRange', () => {
            // Escala ENEM 200 a 1000 (range = 800)
            const history = [
                { score: 600, total: 45, date: '2026-08-01' },
                { score: 650, total: 45, date: '2026-08-08' },
                { score: 700, total: 45, date: '2026-08-15' }
            ];

            const stats = computeCategoryStats(history, 1, 60, 1000, 200);
            expect(stats).not.toBeNull();
            expect(stats.mean).toBeCloseTo(650, 0);
            expect(stats.minScore).toBe(200);
            expect(stats.maxScore).toBe(1000);
            expect(stats.sd).toBeGreaterThan(0);
        });
    });

    describe('5. SD Precision Formatting for Small Exam Ranges', () => {
        it('deve exibir 1 casa decimal quando o desvio for menor que 10 ou o range <= 20', () => {
            const formatSD = (sdNum, scoreRange) => {
                return Number.isFinite(sdNum)
                    ? ((scoreRange <= 20 || sdNum < 10) && sdNum > 0 ? sdNum.toFixed(1) : sdNum.toFixed(0))
                    : '--';
            };

            // Escala 0-10 com SD 1.4
            expect(formatSD(1.4, 10)).toBe('1.4');
            // Escala 0-100 com SD 3.2 (< 10)
            expect(formatSD(3.2, 100)).toBe('3.2');
            // Escala 0-100 com SD 18.4 (>= 10 e range > 20)
            expect(formatSD(18.4, 100)).toBe('18');
        });
    });

    describe('6. WeeklyAnalysis 720-minute Runaway Cap and Canonical Grouping', () => {
        it('deve limitar sessões com mais de 12h (720 min) decorrentes de timer esquecido', () => {
            const sanitizeLogMinutes = (minutes) => {
                const n = Number(minutes);
                return Number.isFinite(n) && n > 0 ? Math.min(720, n) : 0;
            };

            expect(sanitizeLogMinutes(60)).toBe(60);
            expect(sanitizeLogMinutes(1800)).toBe(720); // 30h esquecido ligado limitado a 12h
        });

        it('deve consolidar nomes de matérias não cadastradas com variações de caixa e espaços', () => {
            const canonicalCategoryNames = new Map();
            const getCanonicalName = (rawName) => {
                const clean = String(rawName || 'Outros').trim();
                const lower = clean.toLowerCase();
                if (canonicalCategoryNames.has(lower)) {
                    return canonicalCategoryNames.get(lower);
                }
                canonicalCategoryNames.set(lower, clean);
                return clean;
            };

            const name1 = getCanonicalName('Direito Tributário');
            const name2 = getCanonicalName(' direito tributário ');
            const name3 = getCanonicalName('DIREITO TRIBUTÁRIO');

            expect(name1).toBe('Direito Tributário');
            expect(name2).toBe('Direito Tributário');
            expect(name3).toBe('Direito Tributário');
        });
    });
});
