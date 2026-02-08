/**
 * Monte Carlo Engine - Unified Export
 * 
 * This module provides a complete statistical engine for
 * Monte Carlo simulation of academic performance.
 * 
 * Modules:
 * - stats: Mean, SD, trend detection, adaptive floor
 * - projection: Linear regression, temporal projection
 * - variance: Weighted variance, time uncertainty
 * - monteCarlo: Simulation, Box-Muller, result metrics
 */

export * from './stats';
export * from './projection';
export * from './variance';
export * from './monteCarlo';

// Re-export defaults for convenience
export { default as stats } from './stats';
export { default as projection } from './projection';
export { default as variance } from './variance';
export { default as monteCarlo } from './monteCarlo';
