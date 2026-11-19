// ==========================================
// HUMAN EXPLANATION ENGINE
// Traduz telemetria matemática em linguagem natural
// ==========================================

function safeDomainScale(maxScore = 100, minScore = 0, minScale = 0.01) {
    const safeMin = (minScore !== null && minScore !== undefined && typeof minScore !== 'boolean' && String(minScore).trim() !== '' && Number.isFinite(Number(minScore)))
        ? Number(minScore)
        : 0;
    const rawMax = (maxScore !== null && maxScore !== undefined && typeof maxScore !== 'boolean' && String(maxScore).trim() !== '' && Number.isFinite(Number(maxScore)))
        ? Number(maxScore)
        : Math.max(100, safeMin + 100);
    const safeMax = rawMax > safeMin ? rawMax : safeMin + 100;
    return {
        safeMin,
        safeMax,
        scale: Math.max(minScale, Math.max(1e-9, safeMax - safeMin) / 100),
    };
}

function toFiniteMetric(val) {
    if (val === null || val === undefined || typeof val === 'boolean' || String(val).trim() === '') return NaN;
    const n = Number(val);
    return Number.isFinite(n) ? n : NaN;
}

export function buildHumanExplanation({
    calibrationPenalty,
    volatility,
    trend,
    confidenceTier,
    intervalWidth,
    maxScore = 100,
    minScore = 0
} = {}) {
    const { scale } = safeDomainScale(maxScore, minScore, 0.01);
    const messages = [];

    if (confidenceTier === 'HIGH' && !(volatility > 15 * scale)) {
        messages.push('Seu desempenho recente está consistente.');
    }

    if (volatility > 15 * scale) {
        messages.push('Suas notas recentes oscilaram bastante.');
    }

    if (trend > 5 * scale) {
        messages.push('Seu desempenho mostrou melhora recente.');
    }

    if (trend < -5 * scale) {
        messages.push('Seu desempenho recente apresentou queda.');
    }

    if (calibrationPenalty > 0.08) {
        messages.push('O sistema ampliou a margem de incerteza para evitar excesso de confiança.');
    }

    if (intervalWidth > 40 * scale) {
        messages.push('A faixa provável ficou mais ampla devido à alta variabilidade recente.');
    }

    // ✅ FIX: Retornar mensagem padrão se não houver mensagens
    return messages.length > 0 ? messages : ['Desempenho estável dentro do padrão esperado.'];
}

export function getConfidenceTier({
    calibrationPenalty,
    volatility,
    sampleSize,
    maxScore = 100,
    minScore = 0
} = {}) {
    const { scale } = safeDomainScale(maxScore, minScore, 0.01);
    const safeSampleSize = toFiniteMetric(sampleSize);
    const safeVolatility = toFiniteMetric(volatility);
    const safeCalibrationPenalty = toFiniteMetric(calibrationPenalty);

    if (!Number.isFinite(safeSampleSize) || safeSampleSize < 3 || !Number.isFinite(safeVolatility) || !Number.isFinite(safeCalibrationPenalty)) {
        return {
            tier: 'LOW',
            label: !Number.isFinite(safeSampleSize) || safeSampleSize < 3
                ? 'Baixa confiabilidade (Poucos dados)'
                : 'Baixa confiabilidade',
            color: '#ef4444',
            glow: 'shadow-red-500/30',
        };
    }

    // Tolerância adaptativa: normalizar a volatilidade para a escala base de 100
    // FIX: peso 0.65 na volatilidade (antes 0.2 nunca ultrapassava 10 < 18 pela desigualdade de Popoviciu)
    // + penalidade leve para amostras pequenas (< 6)
    const normalizedVolatility = safeVolatility / scale;
    const smallSamplePenalty = safeSampleSize < 6 ? (6 - safeSampleSize) * 3 : 0;
    const instability = (safeCalibrationPenalty * 100) + (normalizedVolatility * 0.65) + smallSamplePenalty;

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
    maxScore = 100,
    minScore = 0,
    margin = 2 // % do domínio
} = {}) {
    const alerts = [];
    const { scale } = safeDomainScale(maxScore, minScore, 0.01);
    const diff = recentMean - baselineMean;
    const isHighVol = Number.isFinite(Number(recentVolatility)) && Number(recentVolatility) > (20 * scale);

    if (isHighVol) {
        alerts.push({
            type: 'high_volatility',
            severity: 'medium',
            message: 'Suas notas recentes estão muito instáveis.',
        });
    }

    // ✅ PATCH-12: Só emite 'plateau' estável quando não há alta instabilidade mascarando a média
    if (Math.abs(diff) <= (margin * scale)) {
        if (!isHighVol) {
            alerts.push({
                type: 'plateau',
                severity: 'low',
                message: 'Desempenho estável, em fase de consolidação.'
            });
        }
        return alerts;
    }

    if (diff < -(12 * scale)) {
        alerts.push({
            type: 'performance_drop',
            severity: 'high',
            message: 'Seu desempenho recente caiu significativamente.',
        });
    }

    return alerts;
}

export function buildPredictionMood({
    probability,
    confidenceTier,
} = {}) {
    const prob = toFiniteMetric(probability);
    if (!Number.isFinite(prob)) return 'unknown';

    if (prob >= 80) {
        return confidenceTier === 'HIGH' ? 'stable' : 'moderate';
    }
    if (prob >= 50) {
        return 'moderate';
    }
    return 'risk';
}

export function normalizeAlertSeverity(severity, confidenceTier) {
    if (severity === 'low') {
        return {
            color: '#38bdf8',
            label: 'Informação',
            glow: 'shadow-sky-500/20'
        };
    }
    if (severity === 'medium' || (severity === 'high' && confidenceTier === 'LOW')) {
        return {
            color: '#f59e0b',
            label: 'Atenção moderada',
            glow: 'shadow-orange-500/20'
        };
    }
    return {
        color: '#ef4444',
        label: 'Alerta importante',
        glow: 'shadow-red-500/20'
    };
}

export function smoothConfidenceTier({ previousTier, currentTier, stabilityCounter = 0 } = {}) {
    if (previousTier && previousTier !== currentTier && stabilityCounter < 3) {
        return { tier: previousTier, stabilityCounter: stabilityCounter + 1 };
    }
    return { tier: currentTier, stabilityCounter: 0 };
}

export function humanizeVolatility(sd, maxScore = 100, minScore = 0) {
    const safeSd = toFiniteMetric(sd);
    if (!Number.isFinite(safeSd)) return 'Dados insuficientes';
    const { scale } = safeDomainScale(maxScore, minScore, 0.01);
    if (safeSd < 8 * scale) return 'Muito estável';
    if (safeSd < 18 * scale) return 'Relativamente estável';
    if (safeSd < 30 * scale) return 'Oscilação moderada';
    return 'Alta instabilidade';
}

export function validatePrediction({ probability, interval, confidenceTier } = {}) {
    const safeProb = toFiniteMetric(probability);
    if (!Number.isFinite(safeProb)) {
        throw new Error('Invalid probability');
    }
    const low = toFiniteMetric(interval?.low);
    const high = toFiniteMetric(interval?.high);
    if (!interval || typeof interval !== 'object' || !Number.isFinite(low) || !Number.isFinite(high) || low > high) {
        throw new Error('Invalid conformal interval');
    }
    if (!confidenceTier || typeof confidenceTier !== 'string') {
        throw new Error('Missing confidence tier');
    }
    return true;
}
