/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */

export function getSyntheticTotal(maxScore = 100) {
    // CORREÇÃO: Uma entrada puramente percentual tem peso estatístico fixo e 
    // equivalente a uma prova curta/média (ex: 20 tentativas de Bernoulli).
    return 20; 
}

export const normalizePercentInput = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    
    // Remova a inferência perigosa baseada em startsWith('0.'). 
    // O backend ou o form deve dizer explicitamente se é decimal.
    // Retorne o número puro e deixe isPercentage fazer o trabalho sujo de formatação.
    return n;
};

export function getSafeScore(historyRow, maxScore = 100) {
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    
    // Suporte para entrada direta de números (utilitários matemáticos)
    if (typeof historyRow === 'number') {
        return Math.max(-safeMaxScore, Math.min(safeMaxScore, historyRow));
    }

    if (!historyRow) return NaN;

    if (historyRow.score != null) {
        let rawScore = String(historyRow.score !== null && historyRow.score !== undefined ? historyRow.score : '');
        // Remove pontos de milhar, troca vírgulas por pontos para blindagem contra truncamento (Bug 2.1)
        rawScore = rawScore.replace(/\./g, '').replace(',', '.'); 
        let s = parseFloat(rawScore);
        
        if (historyRow.isPercentage) {
            // Passamos false ou a flag apropriada. O frontend DEVE enviar valores de 0-100 na API.
            s = (normalizePercentInput(s) / 100) * safeMaxScore;
        }

        return Number.isFinite(s) ? Math.max(-safeMaxScore, Math.min(safeMaxScore, s)) : NaN;
    }

    // CORREÇÃO: Tratar campos vazios como Inválidos (NaN) e não como Zeros absolutos.
    let rawTotal = String(historyRow.total !== null && historyRow.total !== undefined ? historyRow.total : '');
    rawTotal = rawTotal.replace(/\./g, '').replace(',', '.'); 
    const hasValidTotal = rawTotal !== undefined && rawTotal !== null && rawTotal !== '' && rawTotal !== 'NaN';
    const total = hasValidTotal && Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : NaN;

    let rawCorrect = String(historyRow.correct !== null && historyRow.correct !== undefined ? historyRow.correct : '');
    rawCorrect = rawCorrect.replace(/\./g, '').replace(',', '.'); 
    const hasValidCorrect = rawCorrect !== undefined && rawCorrect !== null && rawCorrect !== '' && rawCorrect !== 'NaN';
    const correct = hasValidCorrect && Number.isFinite(Number(rawCorrect)) ? Number(rawCorrect) : NaN;

    // PRIORIDADE MÁXIMA: Flag isPercentage deve ser respeitada mesmo que total > 0.
    // Isso evita corrupção de dados em registros híbridos de bancos legados.
    if (historyRow.isPercentage) {
        // FIX: score já foi verificado como null, então usamos `correct` como valor percentual direto.
        const pValue = normalizePercentInput(correct);
        const scoreFromPercentage = (pValue / 100) * safeMaxScore;
        return Number.isFinite(scoreFromPercentage) ? Math.max(-safeMaxScore, Math.min(safeMaxScore, scoreFromPercentage)) : NaN;
    }

    // Fallback de retrocompatibilidade para provas clássicas (correct / total)
    if (total > 0) {
        return Math.max(-safeMaxScore, Math.min(safeMaxScore, (correct / total) * safeMaxScore));
    }

    return NaN; // Prevenção de NaN (antigo fallback 0 removido para evitar bias de volatilidade)
}

/**
 * Formata um percentual de forma inteligente:
 * 75.45 -> 75.45%
 * 75.00 -> 75%
 */
export function formatPercent(value) {
    if (value === null || value === undefined) return '0%';
    // CORREÇÃO: Blindagem de renderização visual contra separadores decimais não-americanos
    let raw = String(value || '');
    raw = raw.replace(/\./g, '').replace(',', '.'); 
    const num = (Number.isFinite(Number(raw)) ? Number(raw) : 0);
    
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
    let raw = String(value || '');
    raw = raw.replace(/\./g, '').replace(',', '.'); 
    const num = (Number.isFinite(Number(raw)) ? Number(raw) : 0);
    
    return String(parseFloat(num.toFixed(2)));
}
