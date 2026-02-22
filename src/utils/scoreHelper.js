/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;

    // Se a prova já tiver um .score calculado e armazenado corretamente, nós o consumimos integralmente.
    if (historyRow.score != null) {
        return Number(historyRow.score);
    }

    // Fallback de retrocompatibilidade: provas antigas só tinham .correct e .total.
    if (historyRow.total && historyRow.total > 0) {
        return (historyRow.correct / historyRow.total) * 100;
    }

    return 0; // Prevenção de NaN
}
