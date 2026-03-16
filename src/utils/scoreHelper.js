/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;

    // Se a prova já tiver um .score calculado e armazenado corretamente, nós o consumimos.
    if (historyRow.score != null) {
        let s = Number(historyRow.score);
        
        // Smart Normalization: 
        // Se a nota é <= 10 e temos um Total <= 10, e a nota <= Total,
        // é altamente provável que seja uma escala 0-10 (ex: 8 acertos em 10).
        const total = Number(historyRow.total);
        if (s <= 10 && total > 0 && total <= 10 && s <= total) {
            s = (s / total) * 100;
        } 
        // Se a nota é <= 1 e temos um total plausível, pode ser escala 0-1.
        else if (s <= 1 && total > 0 && s <= total && !historyRow.isPercentage) {
             // Apenas se não for explicitamente marcado como percentual (ex: 0.041 para 4.1%)
             s = (s / total) * 100;
        }

        return Number.isFinite(s) ? s : 0;
    }

    // Fallback de retrocompatibilidade: provas antigas só tinham .correct e .total.
    const total = Number(historyRow.total) || 0;
    const correct = Number(historyRow.correct) || 0;
    if (total > 0) {
        return (correct / total) * 100;
    }

    return 0; // Prevenção de NaN
}
