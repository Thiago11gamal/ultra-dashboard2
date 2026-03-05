/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;

    // Se a prova já tiver um .score calculado e armazenado corretamente, nós o consumimos integralmente.
    if (historyRow.score != null) {
        const s = Number(historyRow.score);
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
