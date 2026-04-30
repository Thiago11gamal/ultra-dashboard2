/**
 * Monte Carlo Engine - Math Constants
 * 
 * Centralized statistical constants to avoid duplication and circular dependencies.
 */

// Z-Score for 95% Confidence Interval (two-tailed)
// P(-1.96 <= Z <= 1.96) ≈ 0.95
export const Z_95 = 1.96;

// Minimal Standard Deviation to avoid division by zero in calculations
export const MIN_SD_FLOOR = 0.0001;
