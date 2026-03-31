/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow) {
    if (!historyRow) return 0;

    if (historyRow.score != null) {
        let s = Number(historyRow.score);

        // BUGFIX M1: Se a entrada foi salva com isPercentage=true, confiar diretamente no valor.
        // Isso resolve a ambiguidade de score=10 total=10 (10/10 = 100%, não 10%).
        if (historyRow.isPercentage) {
            return Number.isFinite(s) ? Math.max(0, Math.min(100, s)) : 0;
        }

        // Normalização universal (entradas sem isPercentage):
        // Removido o comportamento de dividir `s / total` quando `score` já está presente,
        // pois causava ambiguidade onde scores percentuais como 70% num teste de 80 questões 
        // viravam 87.5% (70/80). O campo 'score' agora é sempre considerado o valor percentual final.
        return Number.isFinite(s) ? Math.max(0, Math.min(100, s)) : 0;
    }

    // Fallback de retrocompatibilidade: provas antigas só tinham .correct e .total.
    const total = Number(historyRow.total) || 0;
    const correct = Number(historyRow.correct) || 0;
    if (total > 0) {
        return (correct / total) * 100;
    }

    return 0; // Prevenção de NaN
}
