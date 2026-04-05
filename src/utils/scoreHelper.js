/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;

    if (historyRow.score != null) {
        let s = Number(historyRow.score);

        // Normalização universal (entradas com ou sem isPercentage):
        // Removido o comportamento de dividir `s / total` quando `score` já está presente,
        // pois causava ambiguidade onde scores percentuais como 70% num teste de 80 questões 
        // viravam 87.5% (70/80). O campo 'score' agora é sempre considerado o valor percentual final.
        return Number.isFinite(s) ? Math.max(0, Math.min(100, s)) : 0;
    }

    // Fallback de retrocompatibilidade: provas antigas só tinham .correct e .total.
    const total = Number(historyRow.total) || 0;
    const correct = Number(historyRow.correct) || 0;
    if (total > 0) {
        let corr = correct;
        // BUG-M2 FIX: Se isPercentage é true e correct já parece ser um percentual (ex: 85),
        // não divida por total para evitar inflar a nota (ex: 85/10*100 = 850%).
        if (historyRow.isPercentage && corr > total && corr <= 100) {
            return corr;
        }
        return (corr / total) * 100;
    }

    return 0; // Prevenção de NaN
}
