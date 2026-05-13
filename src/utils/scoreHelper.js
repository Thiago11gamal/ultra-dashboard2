/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */

export function getSyntheticTotal(maxScore = 100) {
    // REDUÇÃO ESTATÍSTICA: Teto reduzido de 80 para 20 para evitar saturação precoce
    // da confiabilidade bayesiana (n) quando o usuário informa apenas a porcentagem.
    return Math.max(1, Math.min(maxScore > 0 ? maxScore : 100, 20));
}

export const normalizePercentInput = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return (n < 1 && n > 0) ? n * 100 : n;
};

export function getSafeScore(historyRow, maxScore = 100) {
    if (!historyRow) return 0;
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;

    if (historyRow.score != null) {
        let rawScore = historyRow.score;
        if (typeof rawScore === 'string') rawScore = rawScore.replace(',', '.');
        let s = parseFloat(rawScore);
        
        if (historyRow.isPercentage) {
            // Passamos false ou a flag apropriada. O frontend DEVE enviar valores de 0-100 na API.
            s = (normalizePercentInput(s) / 100) * safeMaxScore;
        }

        return Number.isFinite(s) ? Math.max(-safeMaxScore, Math.min(safeMaxScore, s)) : 0;
    }

    const total = (Number.isFinite(Number(historyRow.total)) ? Number(historyRow.total) : 0);
    const correct = (Number.isFinite(Number(historyRow.correct)) ? Number(historyRow.correct) : 0);

    // PRIORIDADE MÁXIMA: Flag isPercentage deve ser respeitada mesmo que total > 0.
    // Isso evita corrupção de dados em registros híbridos de bancos legados.
    if (historyRow.isPercentage) {
        // FIX: score já foi verificado como null, então usamos `correct` como valor percentual direto.
        const pValue = normalizePercentInput(correct);
        const scoreFromPercentage = (pValue / 100) * safeMaxScore;
        return Number.isFinite(scoreFromPercentage) ? Math.max(-safeMaxScore, Math.min(safeMaxScore, scoreFromPercentage)) : 0;
    }

    // Fallback de retrocompatibilidade para provas clássicas (correct / total)
    if (total > 0) {
        return Math.max(-safeMaxScore, Math.min(safeMaxScore, (correct / total) * safeMaxScore));
    }

    return 0; // Prevenção de NaN
}

/**
 * Formata um percentual de forma inteligente:
 * 75.45 -> 75.45%
 * 75.00 -> 75%
 */
export function formatPercent(value) {
    if (value === null || value === undefined) return '0%';
    const num = (Number.isFinite(Number(value)) ? Number(value) : 0);
    
    // Remove trailing zeros and unnecessary decimal point
    const formatted = parseFloat(num.toFixed(2));
    return `${formatted}%`;
}

/**
 * Formata um valor numérico para exibição:
 * 75.45 -> "75.45"
 * 75.50 -> "75.5"
 * 75.00 -> "75"
 */
export function formatValue(value) {
    if (value === null || value === undefined) return '0';
    const num = (Number.isFinite(Number(value)) ? Number(value) : 0);
    
    // Remove trailing zeros and unnecessary decimal point
    return String(parseFloat(num.toFixed(2)));
}
