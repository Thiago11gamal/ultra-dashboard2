/**
 * Monte Carlo Engine - Unified Export
 * 
 * This module provides a complete statistical engine for
 * Monte Carlo simulation of academic performance.
 */

export * from './stats.js';
export * from './projection.js';
export * from './variance.js';
export * from './random.js';
export * from './bayesianEngine.js';
// Explicitly re-exporting ensure to avoid tree-shaking issues
export { computeCategoryStats } from './stats.js';
