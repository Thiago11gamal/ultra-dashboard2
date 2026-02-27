/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;

    // Se a prova já tiver um .score calculado e armazenado corretamente, nós o consumimos integralmente.
    if (historyRow.score != null) {
        const parsed = Number(historyRow.score);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
    }

    // Fallback de retrocompatibilidade: provas antigas só tinham .correct e .total.
    if (historyRow.total && historyRow.total > 0) {
        const pct = (Number(historyRow.correct || 0) / Number(historyRow.total)) * 100;
        if (Number.isFinite(pct)) return Math.max(0, Math.min(100, pct));
    }

    return 0; // Prevenção de NaN
}
