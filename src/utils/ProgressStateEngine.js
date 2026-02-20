/**
 * ProgressStateEngine
 * 
 * Detects qualified stagnation states and differentiates from
 * evolution, regression, and instability.
 */

const DEFAULT_CONFIG = {
    window_size: 10,
    stagnation_threshold: 1.0,  // Aumentado levemente para 1.0 (evita micro-ruídos)
    low_level_limit: 60,        // L1
    high_level_limit: 75,       // L2
    mastery_limit: 85,          // L3 (Teto)
    trend_tolerance: 0.5        // Slope deadzone
};

export function analyzeProgressState(scores, config = {}) {
    const {
        window_size,
        stagnation_threshold,
        low_level_limit,
        high_level_limit,
        mastery_limit,
        trend_tolerance
    } = { ...DEFAULT_CONFIG, ...config };

    // Safety: Window size must be at least 2 for variance calculation
    const safeWindowSize = Math.max(2, window_size);

    // 3. Pre-condition check
    if (!scores || scores.length < safeWindowSize) {
        return {
            state: 'insufficient_data',
            label: 'Dados Insuficientes',
            mean_score: 0,
            delta: 0,
            variance: 0,
            trend_slope: 0,
            severity: 'none'
        };
    }

    // 4. Extract window
    const recentScores = scores.slice(-safeWindowSize);

    // 5.1 Mean (Absolute Level)
    const mean = recentScores.reduce((a, b) => a + b, 0) / safeWindowSize;

    // 5.2 Delta (Mean Absolute Variation)
    let variationTotal = 0;
    for (let i = 1; i < recentScores.length; i++) {
        variationTotal += Math.abs(recentScores[i] - recentScores[i - 1]);
    }
    const delta = variationTotal / (safeWindowSize - 1);

    // 5.3 Variance (Consistency) — FIX Bug 5: Use sample variance (N-1) not population (N)
    const variance = recentScores.reduce((acc, score) =>
        acc + Math.pow(score - mean, 2), 0) / (safeWindowSize - 1);

    // 5.4 Trend (Linear Regression Slope)
    const xMean = (safeWindowSize - 1) / 2;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < safeWindowSize; i++) {
        numerator += (i - xMean) * (recentScores[i] - mean);
        denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // 6. Stagnation Detection
    const stagnated = delta <= stagnation_threshold;

    // 7. Semantic Classification
    let state = '';
    let label = '';
    let severity = 'none';

    if (stagnated) {
        // 7.1 Qualified Stagnation or Mastery
        if (mean >= mastery_limit) {
            state = 'mastery';
            label = 'Domínio (Consistente no Topo)';
            severity = 'none';
        } else if (mean < low_level_limit) {
            state = 'stagnation_negative';
            label = 'Estagnação em nível baixo';
            severity = 'high';
        } else if (mean < high_level_limit) {
            state = 'stagnation_neutral';
            label = 'Estagnação em nível médio';
            severity = 'medium';
        } else {
            state = 'stagnation_positive';
            label = 'Estagnação em nível alto';
            severity = 'low';
        }
    } else {
        // 7.2 Dynamic States (Not Stagnated) with Trend Tolerance
        if (slope > trend_tolerance) {
            state = 'progression';
            label = 'Em evolução';
            severity = 'none';
        } else if (slope < -trend_tolerance) {
            state = 'regression';
            label = 'Em regressão';
            severity = 'high';
        } else {
            state = 'unstable';
            label = 'Instável / Flutuação';
            severity = 'medium';
        }
    }

    // 8. Standardized Output
    return {
        state,
        label,
        mean_score: Number(mean.toFixed(2)),
        delta: Number(delta.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        trend_slope: Number(slope.toFixed(4)),
        severity
    };
}

export function getUIHints(state) {
    const hints = {
        insufficient_data: { color: 'slate', icon: 'minus' },
        mastery: { color: 'violet', icon: 'award' },
        stagnation_negative: { color: 'red', icon: 'alert-triangle' },
        stagnation_neutral: { color: 'yellow', icon: 'pause-circle' },
        stagnation_positive: { color: 'green', icon: 'shield-check' },
        progression: { color: 'blue', icon: 'trending-up' },
        regression: { color: 'red', icon: 'trending-down' },
        unstable: { color: 'orange', icon: 'activity' }
    };

    return hints[state] || hints.insufficient_data;
}

export default { analyzeProgressState, getUIHints };
