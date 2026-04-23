/**
 * ProgressStateEngine
 * 
 * Detects qualified stagnation states and differentiates from
 * evolution, regression, and instability.
 */

const DEFAULT_CONFIG = {
    window_size: 10,
    stagnation_threshold: 5.0, // Alinhado com estabilidade de 5% da escala (rigoroso)
    low_level_limit: 60,
    high_level_limit: 75,
    mastery_limit: 80, // Sincronizado com targetScore padrão
    trend_tolerance: 0.5 // Alinhado com 0.5 pp/30d (unificado)
};

export function analyzeProgressState(scores, config = {}) {
    const {
        window_size,
        stagnation_threshold: raw_stagnation,
        low_level_limit,
        high_level_limit,
        mastery_limit,
        trend_tolerance: raw_trend,
        maxScore = 100
    } = { ...DEFAULT_CONFIG, ...config };

    // SCALE FIX: Escalonar thresholds pela amplitude da escala (maxScore)
    const scaleFactor = maxScore / 100;
    const stagnation_threshold = raw_stagnation * scaleFactor;
    const trend_tolerance = raw_trend * scaleFactor;

    // Safety: Window size must be at least 3 for meaningful variance and MAV calculation
    // (With only 2 points, variance = one single squared difference — not representative)
    const safeWindowSize = Math.max(3, window_size);

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
    const recentData = scores.slice(-safeWindowSize);
    const recentScores = recentData.map(d => typeof d === 'object' ? d.score : d);
    const recentDates = recentData.map(d => typeof d === 'object' ? new Date(d.date).getTime() : 0);

    // 5.1 Mean (Absolute Level)
    const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

    // 5.2 Delta (Mean Absolute Variation)
    let variationTotal = 0;
    for (let i = 1; i < recentScores.length; i++) {
        variationTotal += Math.abs(recentScores[i] - recentScores[i - 1]);
    }
    const delta = variationTotal / (recentScores.length - 1);

    // 5.3 Variance (Consistency)
    const variance = recentScores.reduce((acc, score) =>
        acc + Math.pow(score - mean, 2), 0) / (recentScores.length - 1);

    // 5.4 Trend (Linear Regression Slope - TIME AWARE)
    // 🎯 MATH BUG FIX: Transição da Regressão Linear do índice (Cego ao tempo) 
    // para o eixo X de dias reais passados.
    const n = recentScores.length;
    const startTime = recentDates[0] || Date.now();
    const xDays = recentDates.map(d => (d - startTime) / 86400000);
    const xMean = xDays.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (xDays[i] - xMean) * (recentScores[i] - mean);
        denominator += Math.pow(xDays[i] - xMean, 2);
    }

    // slope em pontos/dia. Se denominator é 0 (todos no mesmo dia), usamos 0.
    const rawSlope = denominator > 0.0001 ? numerator / denominator : 0; 
    
    // Normalização para 30 dias para alinhar com trend_tolerance (pp/30d)
    const normalizedSlope = rawSlope * 30;
    // 6. Stagnation Detection
    const stagnated = delta <= stagnation_threshold && Math.abs(normalizedSlope) <= trend_tolerance;

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
        const isVeryUnstable = variance > 25; 

        // FIX 3.2 (Visual e Lógica): A instabilidade não deve proteger um aluno em queda livre.
        // Se a inclinação (slope) é fortemente negativa, é regressão, independentemente da variância.
        if (normalizedSlope < -trend_tolerance) {
            state = 'regression';
            label = isVeryUnstable ? 'Queda Acentuada (Instável)' : 'Em regressão';
            severity = 'high'; 
        } else if (normalizedSlope > trend_tolerance && !isVeryUnstable) {
            state = 'progression';
            label = 'Em evolução';
            severity = 'none';
        } else {
            state = 'unstable'; 
            label = 'Instável / Flutuação';
            severity = 'medium';
        }
    }

    // 8. Standardized Output
    return {
    // FIX 1.1: O trend_slope retorna o valor bruto em "pontos/prova" (pp/índice).
    // O motor está calibrado para este valor; compará-lo com pp/dia (calculateSlope) causaria confusão.
        state,
        label,
        mean_score: Number(mean.toFixed(2)),
        delta: Number(delta.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        trend_slope: Number(rawSlope.toFixed(4)),
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
