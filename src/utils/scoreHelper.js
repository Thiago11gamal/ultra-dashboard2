/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */
export function getSafeScore(historyRow, maxScore = 100) {
    if (!historyRow) return 0;

    if (historyRow.score != null) {
        let rawScore = historyRow.score;
        if (typeof rawScore === 'string') rawScore = rawScore.replace(',', '.');
        let s = Number(rawScore);
        
        // BUGFIX M3: se isPercentage for true, tratamos o score existente como %
        if (historyRow.isPercentage && s > maxScore) {
            s = (s / 100) * maxScore;
        }

        return Number.isFinite(s) ? Math.max(0, Math.min(maxScore, s)) : 0;
    }

    const total = Number(historyRow.total) || 0;
    const correct = Number(historyRow.correct) || 0;

    // FIX 2.1 (Estrutural): Respeito absoluto à flag isPercentage.
    if (historyRow.isPercentage) {
        // BUGFIX M2: percentage must be scaled by maxScore (e.g. 80% of 120 = 96)
        const scoreFromPercentage = (correct / 100) * maxScore;
        return Number.isFinite(scoreFromPercentage) ? Math.max(0, Math.min(maxScore, scoreFromPercentage)) : 0;
    }

    // Fallback de retrocompatibilidade para provas clássicas (correct / total)
    if (total > 0) {
        // BUG 4 FIX: Use maxScore instead of hardcoded 100.
        // BUG 1 HARDENING: Strict clamp [0, maxScore] to prevent overflows from typos.
        return Math.max(0, Math.min(maxScore, (correct / total) * maxScore));
    }

    return 0; // Prevenção de NaN
}
