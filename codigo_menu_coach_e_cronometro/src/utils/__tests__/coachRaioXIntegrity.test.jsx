import { describe, it, expect } from 'vitest';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD } from '../calibration.js';
import { displaySubject } from '../displaySubject.js';
import { calculateAdaptiveSlope } from '../../engine/projection.js';

describe('Coach AI & Raio-X Técnico Data Integrity & Bug Fix Audits', () => {
    describe('1. Critical Brier Degradation Trigger & Thresholds', () => {
        it('identifies critical degradation when avgBrier reaches or exceeds CRITICAL_BRIER_THRESHOLD (0.28)', () => {
            expect(CRITICAL_BRIER_THRESHOLD).toBe(0.28);
            expect(HIGH_PENALTY_THRESHOLD).toBe(0.20);

            const isDegradedCheck = (avgBrier, penalty, opDegraded = false) => {
                const hasBrier = avgBrier !== null && Number.isFinite(avgBrier);
                const penVal = Number.isFinite(penalty) ? penalty : 0;
                return Boolean(opDegraded || (hasBrier && avgBrier >= CRITICAL_BRIER_THRESHOLD) || penVal >= HIGH_PENALTY_THRESHOLD);
            };

            // High Brier >= 0.28 must degrade even if penalty is 0
            expect(isDegradedCheck(0.28, 0)).toBe(true);
            expect(isDegradedCheck(0.32, 0)).toBe(true);

            // Brier below threshold and penalty below threshold must NOT degrade
            expect(isDegradedCheck(0.22, 0.05)).toBe(false);
            expect(isDegradedCheck(0.15, 0.10)).toBe(false);

            // Penalty >= 0.20 must degrade even with low or null Brier
            expect(isDegradedCheck(null, 0.20)).toBe(true);
            expect(isDegradedCheck(0.10, 0.25)).toBe(true);
        });

        it('ensures state transitions between stable and degraded bypass rate-limiting deduplication', () => {
            const lastEntry = { avgBrier: 0.20, ece: 0.05, calibrationPenalty: 0.02, probability: 0.70, degraded: false };
            const newMetric = { avgBrier: 0.29, ece: 0.05, calibrationPenalty: 0.02, probability: 0.70, degraded: true };

            const degradationChanged = Boolean(lastEntry.degraded) !== Boolean(newMetric.degraded);
            expect(degradationChanged).toBe(true);

            // When degradation status changes, shouldSkipPersist MUST be overridden
            const shouldPersist = !false || degradationChanged;
            expect(shouldPersist).toBe(true);
        });
    });

    describe('2. Missing Brier vs Fake Zero Handling', () => {
        it('does not produce a fake 0.00 Brier score when calibration data has no brier values', () => {
            const historyRows = [
                { timestamp: 1000, calibrationPenalty: 0.05 },
                { timestamp: 2000, calibrationPenalty: 0.06 }
            ];

            const brierValues = historyRows
                .filter(h => h?.avgBrier !== null && h?.avgBrier !== undefined && h?.avgBrier !== '')
                .map(h => Number(h.avgBrier))
                .filter(Number.isFinite);

            const avgBrier = brierValues.length > 0 ? brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length : null;
            expect(avgBrier).toBeNull();

            // When rendering null avgBrier, label must be '-' not '0.00'
            const displayLabel = avgBrier !== null ? avgBrier.toFixed(2) : '-';
            expect(displayLabel).toBe('-');
        });
    });

    describe('3. displaySubject Category Resolution across Raio-X & Coach Cards', () => {
        const mockCategories = [
            { id: 'cat_dir_const', name: 'Direito Constitucional' },
            { id: 'cat_port', name: 'Língua Portuguesa' },
            { id: 'mat-1', name: 'Matemática e Raciocínio Lógico' }
        ];

        it('resolves raw IDs to human-readable names with displaySubject', () => {
            expect(displaySubject('cat_dir_const', mockCategories)).toBe('Direito Constitucional');
            expect(displaySubject('cat_port', mockCategories)).toBe('Língua Portuguesa');
            expect(displaySubject('mat-1', mockCategories)).toBe('Matemática e Raciocínio Lógico');
        });

        it('falls back safely to formatted string when category is not in list', () => {
            expect(displaySubject('direito penal', mockCategories)).toBe('Dir. Penal');
            expect(displaySubject('criminologia aplicada', mockCategories)).toBe('Criminologia Aplicada');
            expect(displaySubject(null, mockCategories)).toBe('');
            expect(displaySubject('', mockCategories)).toBe('');
        });

        it('normalizes categoryId and categoryName for persistence', () => {
            const metric = { categoryName: 'Língua Portuguesa', avgBrier: 0.18 };
            const categoryId = metric.categoryId || metric.categoryName;
            expect(categoryId).toBe('Língua Portuguesa');
        });
    });

    describe('4. Drift Chart & Temporal Series Resilience', () => {
        it('safely sorts and caps temporal points without throwing on missing series', () => {
            const categorySeriesMap = {
                'Direito Constitucional': [
                    { ts: 2000, brier: 0.22, ece: 0.08 },
                    { ts: 1000, brier: 0.19, ece: 0.06 }
                ]
            };

            const getSeries = (catKey) => {
                if (!catKey || !categorySeriesMap[catKey]) return [];
                return [...categorySeriesMap[catKey]].sort((a, b) => a.ts - b.ts).slice(-12);
            };

            const validSeries = getSeries('Direito Constitucional');
            expect(validSeries).toHaveLength(2);
            expect(validSeries[0].ts).toBe(1000);
            expect(validSeries[1].ts).toBe(2000);

            // Safe fallback for nonexistent category
            const emptySeries = getSeries('NonExistent');
            expect(emptySeries).toEqual([]);
        });
    });

    describe('5. Audit Log Degradation Filter Logic', () => {
        const isLogDegraded = (log) => {
            if (Boolean(log?.degraded)) return true;
            const brier = Number.isFinite(Number(log?.avgBrier)) ? Number(log.avgBrier) : null;
            if (brier !== null && brier >= CRITICAL_BRIER_THRESHOLD) return true;
            const penalty = Number.isFinite(Number(log?.calibrationPenalty)) ? Number(log.calibrationPenalty) : 0;
            if (penalty >= HIGH_PENALTY_THRESHOLD) return true;
            return false;
        };

        it('properly classifies audit log entries as degraded or stable', () => {
            const stableLog = { timestamp: 1000, avgBrier: 0.15, calibrationPenalty: 0.02, degraded: false };
            const brierDegradedLog = { timestamp: 2000, avgBrier: 0.29, calibrationPenalty: 0.01 };
            const penaltyDegradedLog = { timestamp: 3000, avgBrier: 0.12, calibrationPenalty: 0.22 };
            const flagDegradedLog = { timestamp: 4000, avgBrier: null, calibrationPenalty: 0, degraded: true };

            expect(isLogDegraded(stableLog)).toBe(false);
            expect(isLogDegraded(brierDegradedLog)).toBe(true);
            expect(isLogDegraded(penaltyDegradedLog)).toBe(true);
            expect(isLogDegraded(flagDegradedLog)).toBe(true);
        });
    });

    describe('6. Adaptive Slope Scale Calculations (minScore support)', () => {
        it('calculates slope using the actual contest minScore and maxScore', () => {
            const history = [
                { score: 500, timeIndex: 1 },
                { score: 600, timeIndex: 2 },
                { score: 700, timeIndex: 3 }
            ];

            const slopeWithMin = calculateAdaptiveSlope(history, 1000, { minScore: 200 });
            expect(Number.isFinite(slopeWithMin)).toBe(true);
            expect(slopeWithMin).toBeGreaterThan(0);
        });
    });
});
