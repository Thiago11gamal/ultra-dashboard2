import { getSafeScore } from '../utils/scoreHelper.js';

export function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Cálculo de Desvio Padrão com Shrinkage Bayesiano (Melhoria 1)
 * Estabiliza a volatilidade para alunos com poucos dados (< 10 simulados).
 */
export function standardDeviation(arr) {
    if (!arr || arr.length < 2) return 0;

    const n = arr.length;
    const m = mean(arr);

    // Variância da Amostra (cálculo clássico)
    const sampleVar = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1);

    // --- SHRINKAGE BAYESIANO ---
    // Evita que o desvio seja zero ou explosivo com poucos dados.
    // POPULATION_SD = 12 (Volatilidade típica de concurseiro)
    // KAPPA = 3 (Força do prior - equivale a ter 3 provas "fantasmas" na média)
    const POPULATION_SD = 12;
    const KAPPA = 3;

    const adjustedVar =
        ((n - 1) * sampleVar + KAPPA * (Math.pow(POPULATION_SD, 2))) /
        ((n - 1) + KAPPA);

    return Math.sqrt(adjustedVar);
}

/**
 * Cálculo de Tendência com Teste de Significância (Melhoria 2)
 * Retorna o slope apenas se T-Stat > 2.0 (95% confiança).
 * Caso contrário, retorna 0 (estável), evitando falsos alarmes.
 */
export function calculateTrend(scores) {
    if (!scores || scores.length < 3) return 0;

    // Foca na tendência recente (últimos 10)
    const recentScores = scores.slice(-10);
    const n = recentScores.length;

    const x = recentScores.map((_, i) => i);
    const y = recentScores;

    const meanX = (n - 1) / 2;
    const meanY = mean(y);

    let num = 0;
    let den = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        num += dx * (y[i] - meanY);
        den += dx * dx;
    }

    if (den === 0) return 0;

    const slope = num / den;

    // Cálculo do Erro Padrão (Standard Error) da inclinação
    let rss = 0; // Residual Sum of Squares
    for (let i = 0; i < n; i++) {
        const pred = meanY + slope * (x[i] - meanX);
        rss += Math.pow(y[i] - pred, 2);
    }

    const sigma2 = rss / (n - 2); // Variância dos resíduos
    const seSlope = Math.sqrt(sigma2 / den); // Erro padrão do slope

    // T-Statistic: Aplica Student's t-distribution para punir amostras pequenas (<10)
    if (seSlope > 0) {
        const tStat = slope / seSlope;
        const df = n - 2;

        // Tabela empírica para distribuição T-Student (95% confiança)
        const tDist95 = {
            1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57,
            6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23
        };
        const tCrit = tDist95[df] || 2.0;

        if (Math.abs(tStat) < tCrit) return 0;
    }

    // Normaliza para "pontos por 10 simulados" para facilitar leitura humana
    return slope * 10;
}

/**
 * Legacy support for UI components
 * Aggregates history data into a stats object
 */
export function computeCategoryStats(history, weight) {
    if (!history || history.length === 0) return null;

    // Garante extração estatística segura através do Helper Universal
    const scores = history.map(h => getSafeScore(h));

    const m = mean(scores);

    // FIX 1: Usa o novo Desvio Padrão Bayesiano
    const sd = standardDeviation(scores);

    // SafeSD: Mantém um piso mínimo de 2% da média para cálculos de risco
    const safeSD = Math.max(sd, m * 0.02);

    // FIX 2: Usa a nova Tendência com Significância
    const rawTrend = calculateTrend(scores);

    let trendLabel = 'stable';
    if (rawTrend > 0.5) trendLabel = 'up'; // Leve tolerância
    else if (rawTrend < -0.5) trendLabel = 'down';

    return {
        mean: m,
        sd: safeSD,
        n: history.length,
        weight: weight,
        history: history,
        trend: trendLabel,
        trendValue: rawTrend // Valor numérico para gráficos avançados
    };
}
