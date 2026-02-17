export function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr) {
    if (!arr || arr.length < 2) return 0;

    const m = mean(arr);
    const variance =
        arr.reduce((sum, val) =>
            sum + Math.pow(val - m, 2), 0
        ) / (arr.length - 1);

    return Math.sqrt(variance);
}

/**
 * Legacy support for UI components
 * Aggregates history data into a stats object
 */
export function computeCategoryStats(history, weight) {
    if (!history || history.length === 0) return null;
    const scores = history.map(h => Number(h.score) || 0);
    const m = mean(scores);
    const sd = standardDeviation(scores);

    // FIX 1: SafeSD Relativo (Bug Fix Estatístico)
    // Antes: Math.max(sd, 0.5) -> Punia alunos consistentes
    // Agora: Máximo entre SD real e 2% da média (ruído branco mínimo)
    const safeSD = Math.max(sd, m * 0.02);

    // FIX 2: Tendência com Significância (T-Statistic)
    let trend = 'stable';
    if (scores.length >= 3) {
        const n = scores.length;
        const xMean = (n - 1) / 2;

        // Somas para Regressão Linear Simples
        let numerator = 0; // Sxy
        let denominator = 0; // Sxx

        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (scores[i] - m);
            denominator += Math.pow(i - xMean, 2);
        }

        const slope = denominator !== 0 ? numerator / denominator : 0;

        // Cálculo do Erro Padrão da Inclinação (Slope Standard Error)
        // Isso define se a inclinação é real ou ruído
        let sumSquaredResiduals = 0;
        for (let i = 0; i < n; i++) {
            const predicted = m + slope * (i - xMean);
            sumSquaredResiduals += Math.pow(scores[i] - predicted, 2);
        }

        // Graus de liberdade = n - 2
        const seResiduals = Math.sqrt(sumSquaredResiduals / Math.max(1, n - 2));
        const seSlope = seResiduals / Math.sqrt(denominator);

        // T-Statistic: Quantas vezes o slope é maior que o erro?
        // Usamos 2.0 (aprox 95% confiança) como corte
        const tStat = seSlope > 0 ? Math.abs(slope / seSlope) : 0;

        if (tStat > 2.0) {
            if (slope > 0) trend = 'up';
            else if (slope < 0) trend = 'down';
        }
        // Se tStat < 2.0, mantemos 'stable' pois é ruído estatístico
    }

    return {
        mean: m,
        sd: safeSD,
        n: history.length,
        weight: weight,
        history: history,
        trend
    };
}
