/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;

    if (historyRow.score != null) {
        let s = Number(historyRow.score);
        return Number.isFinite(s) ? Math.max(0, Math.min(100, s)) : 0;
    }

    const total = Number(historyRow.total) || 0;
    const correct = Number(historyRow.correct) || 0;

    // FIX 2.1 (Estrutural): Respeito absoluto à flag isPercentage.
    // Removida a condicional bizarra (corr > total) que distorcia e inflava notas.
    if (historyRow.isPercentage) {
        return Number.isFinite(correct) ? Math.max(0, Math.min(100, correct)) : 0;
    }

    // Fallback de retrocompatibilidade para provas clássicas (correct / total)
    if (total > 0) {
        return (correct / total) * 100;
    }

    return 0; // Prevenção de NaN
}
