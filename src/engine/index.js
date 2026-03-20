/**
 * Monte Carlo Engine - Unified Export
 */

export * from './stats.js';
export * from './projection.js';
export * from './variance.js';
export * from './random.js';
export * from './monteCarlo.js';

// BUG-M4: Centralized export
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;
    if (historyRow.isPercentage) return Number(historyRow.score) || 0;
    const total = Number(historyRow.total) || 0;
    if (total === 0) return Number(historyRow.score) || 0;
    return (Number(historyRow.correct) / total) * 100;
}
