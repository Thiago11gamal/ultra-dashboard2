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
    const windowFactor = Math.sqrt(10 / Math.max(3, window_size));
    const stagnation_threshold = raw_stagnation * scaleFactor * windowFactor;
    const trend_tolerance = raw_trend * scaleFactor * windowFactor;

    // FIX 3: Escalonar limites de nível (Mastery/Low) para suportar escalas diferentes de 100
    const scaled_low = low_level_limit * scaleFactor;
    const scaled_high = high_level_limit * scaleFactor;
    const scaled_mastery = mastery_limit * scaleFactor;

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
    // --- PATCH: Prevenir contaminação matemática por datas inválidas no Array.sort ---
    const sortedScores = [...scores].sort((a, b) => {
        let tA = typeof a === 'object' ? new Date(a.date).getTime() : 0;
        let tB = typeof b === 'object' ? new Date(b.date).getTime() : 0;
        if (isNaN(tA)) tA = 0;
        if (isNaN(tB)) tB = 0;
        return tA - tB;
    });

    const recentData = sortedScores.slice(-safeWindowSize);
    const recentScores = recentData.map(d => typeof d === 'object' ? d.score : d);

    // FIX MATH-2026-05-05: Sanitizar score para manter mean/variance/slope estáveis com entradas inválidas.
    const finiteRecentScores = recentScores.map(v => Number.isFinite(v) ? v : 0);

    // FIX LOGIC-2026-05-05: Evitar Date.now() múltiplo (não determinístico) dentro do mesmo cálculo.
    // Captura uma âncora temporal única para estabilidade reprodutível.
    const syntheticNow = Date.now();

    // FIX: Prevenir a contaminação matemática por 'NaN' se a data for inválida ou inexistente.
    const recentDates = recentData.map((d, index) => {
        if (typeof d === 'object') {
            const time = new Date(d.date).getTime();
            // Se a data for inválida, criamos uma data sintética linear baseada no índice para não quebrar o declive
            return isNaN(time) ? syntheticNow + (index * 86400000) : time; 
        }
        // Se d for primitivo, simula um intervalo de 1 dia por teste
        return syntheticNow + (index * 86400000); 
    });

    // 5.1 Mean (Absolute Level)
    const mean = finiteRecentScores.reduce((a, b) => a + b, 0) / finiteRecentScores.length;

    // 5.2 Delta (Mean Absolute Variation)
    let variationTotal = 0;
    for (let i = 1; i < finiteRecentScores.length; i++) {
        variationTotal += Math.abs(finiteRecentScores[i] - finiteRecentScores[i - 1]);
    }
    const delta = variationTotal / (finiteRecentScores.length - 1);

    // 5.3 Variance (Consistency)
    const variance = finiteRecentScores.reduce((acc, score) =>
        acc + Math.pow(score - mean, 2), 0) / (finiteRecentScores.length - 1);

    // 5.4 Trend (Linear Regression Slope - TIME AWARE)
    // 🎯 MATH BUG FIX: Transição da Regressão Linear do índice (Cego ao tempo) 
    // para o eixo X de dias reais passados.
    const n = finiteRecentScores.length;
    const startTime = recentDates[0] || Date.now();
    // CORREÇÃO: Forçar spread artificial mínimo (micro-passos) se os testes colidirem no mesmo dia (Bug 1.1 Fix)
    const xDays = [];
    recentDates.forEach((d, i) => {
        let days = (d - startTime) / 86400000;
        if (i > 0 && days <= xDays[i - 1]) {
            days = xDays[i - 1] + 0.01; // Adiciona um micro-delta temporal (~14 minutos)
        }
        xDays.push(days);
    });
    const xMean = xDays.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (xDays[i] - xMean) * (finiteRecentScores[i] - mean);
        denominator += Math.pow(xDays[i] - xMean, 2);
    }

    // FIX: Clamp do denominador para impedir distorção por "Time Crunch" (testes em curtos intervalos)
    // Se o denominador for menor que 0.25 (1/4 de dia), assumimos um valor seguro para diluir o impacto
    const safeDenominator = denominator < 0.25 ? 0.25 : denominator;

    // slope em pontos/dia.
    const rawSlope = safeDenominator > 0 ? numerator / safeDenominator : 0; 
    
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
        if (mean >= scaled_mastery) {
            state = 'mastery';
            label = 'Domínio (Consistente no Topo)';
            severity = 'none';
        } else if (mean < scaled_low) {
            state = 'stagnation_negative';
            label = 'Estagnação em nível baixo';
            severity = 'high';
        } else if (mean < scaled_high) {
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
        // BUG-GLOBAL-06 FIX: Usar Coeficiente de Variação (CV) em vez de variância bruta.
        // Antes: variance > 25*scaleFactor² era calibrado para window_size=10 e falha com n diferentes.
        // CV > 15% é invariante ao n e à escala da prova.
        const cv = mean > 1e-6 ? Math.sqrt(variance) / mean : 0;
        const isVeryUnstable = cv > 0.15;

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
