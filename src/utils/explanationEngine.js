// ==========================================
// HUMAN EXPLANATION ENGINE
// Traduz telemetria matemática em linguagem natural
// ==========================================

export function buildHumanExplanation({
    calibrationPenalty,
    volatility,
    trend,
    confidenceTier,
    intervalWidth,
}) {
    const messages = [];

    if (confidenceTier === 'HIGH') {
        messages.push('Seu desempenho recente está consistente.');
    }

    if (volatility > 15) {
        messages.push('Suas notas recentes oscilaram bastante.');
    }

    if (trend > 5) {
        messages.push('Seu desempenho mostrou melhora recente.');
    }

    if (trend < -5) {
        messages.push('Seu desempenho recente apresentou queda.');
    }

    if (calibrationPenalty > 0.08) {
        messages.push('O sistema ampliou a margem de incerteza para evitar excesso de confiança.');
    }

    if (intervalWidth > 40) {
        messages.push('A faixa provável ficou mais ampla devido à alta variabilidade recente.');
    }

    return messages;
}

export function getConfidenceTier({
    calibrationPenalty,
    volatility,
    sampleSize,
}) {
    // Tolerância adaptativa: volatility is absolute standard deviation, max 100
    // calibrationPenalty is between 0 and 1. 0.1 means 10% penalty.
    const instability = (calibrationPenalty * 100) + (volatility * 0.2);

    if (sampleSize < 3) {
        return {
            tier: 'LOW',
            label: 'Baixa confiabilidade (Poucos dados)',
            color: '#ef4444',
            glow: 'shadow-red-500/30',
        };
    }

    if (instability < 18) {
        return {
            tier: 'HIGH',
            label: 'Alta confiabilidade',
            color: '#22c55e',
            glow: 'shadow-green-500/30',
        };
    }

    if (instability < 35) {
        return {
            tier: 'MEDIUM',
            label: 'Confiabilidade moderada',
            color: '#f59e0b',
            glow: 'shadow-yellow-500/30',
        };
    }

    return {
        tier: 'LOW',
        label: 'Baixa confiabilidade',
        color: '#ef4444',
        glow: 'shadow-red-500/30',
    };
}

export function detectPerformanceDrift({
    recentMean,
    baselineMean,
    recentVolatility,
}) {
    const alerts = [];

    if (recentMean < baselineMean - 12) {
        alerts.push({
            type: 'performance_drop',
            severity: 'high',
            message: 'Seu desempenho recente caiu significativamente.',
        });
    }

    if (recentVolatility > 20) {
        alerts.push({
            type: 'high_volatility',
            severity: 'medium',
            message: 'Suas notas recentes estão muito instáveis.',
        });
    }

    return alerts;
}

export function buildPredictionMood({
    probability,
    confidenceTier,
}) {
    if (probability >= 80 && confidenceTier === 'HIGH') {
        return 'stable';
    }
    if (probability >= 50) {
        return 'moderate';
    }
    return 'risk';
}
