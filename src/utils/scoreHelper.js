/**
 * Saneador universal de Notas (Scores) do Histórico.
 * Recupera o valor exato no passado ou reconstrói dinamicamente caso a prova
 * advenha de um banco de dados legado sem o campo "score" calculado (Bug 5).
 */

export function getSyntheticTotal(_maxScore = 100) {
    // CORREÇÃO: Uma entrada puramente percentual tem peso estatístico fixo e 
    // equivalente a uma prova curta/média (ex: 20 tentativas de Bernoulli).
    return 20; 
}

export const normalizePercentInput = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    
    // Remova a inferência perigosa baseada em startsWith('0.'). 
    // O backend ou o form deve dizer explicitamente se é decimal.
    // Retorne o número puro e deixe isPercentage fazer o trabalho sujo de formatação.
    return n;
};

export function parseLocaleNumber(value, fallback = NaN) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (value === null || value === undefined) return fallback;

    let raw = String(value).trim();
    if (!raw) return fallback;

    raw = raw.replace(/\s/g, '');
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');

    if (lastComma > lastDot) {
        raw = raw.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        const parts = raw.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastComma === -1 && parts.length === 2 && lastPart.length === 3) {
            // Heurística de milhar: checa se os 3 dígitos são compatíveis com nota arredondada de milhar
            if (/000|500/.test(lastPart)) {
                raw = raw.replace(/\./g, '');
            } else {
                raw = raw.replace(/,/g, ''); // Trata como float padrão
            }
        } else {
            raw = raw.replace(/,/g, '');
        }
    } else {
        raw = raw.replace(/[,.]/g, '');
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSafeScore(historyRow, maxScore = 100) {
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    
    // Suporte para entrada direta de números (utilitários matemáticos)
    if (typeof historyRow === 'number') {
        return Math.max(0, Math.min(safeMaxScore, historyRow));
    }

    if (!historyRow) return NaN;

    if (historyRow.score != null) {
        let s;
        if (typeof historyRow.score === 'number') {
            s = historyRow.score;
        } else {
            let rawScore = String(historyRow.score);
            const lastComma = rawScore.lastIndexOf(',');
            const lastDot = rawScore.lastIndexOf('.');
            
            if (lastComma > lastDot) {
                // Formato BR: 1.000,50 ou 1.000
                rawScore = rawScore.replace(/\./g, '').replace(',', '.');
            } else if (lastDot > lastComma) {
                // Formato US: 1,000.50 ou 1,000
                // OU BR: 1.000 (ambíguo)
                const parts = rawScore.split('.');
                const lastPart = parts[parts.length - 1];
                if (lastComma === -1 && parts.length === 2 && lastPart.length === 3 && !historyRow.isPercentage) {
                    // Heurística: ponto único seguido de exatamente 3 dígitos -> Milhar (apenas se NÃO for porcentagem explícita)
                    rawScore = rawScore.replace(/\./g, '');
                } else {
                    rawScore = rawScore.replace(/,/g, '');
                }
            } else {
                // Caso extremo sem nenhum separador (ou strings vazias tratadas pelo caller)
                rawScore = rawScore.replace(/[,.]/g, '');
            }
            s = parseFloat(rawScore);
        }
        
        if (historyRow.isPercentage) {
            s = (normalizePercentInput(s) / 100) * safeMaxScore;
        }

        return Number.isFinite(s) ? Math.max(0, Math.min(safeMaxScore, s)) : NaN;
    }

    // CORREÇÃO: Tratar campos vazios como Inválidos (NaN) e não como Zeros absolutos.
    let rawTotal = String(historyRow.total !== null && historyRow.total !== undefined ? historyRow.total : '');
    const ltC = rawTotal.lastIndexOf(',');
    const ltD = rawTotal.lastIndexOf('.');
    if (ltC > ltD) {
        rawTotal = rawTotal.replace(/\./g, '').replace(',', '.');
    } else if (ltD > ltC) {
        const parts = rawTotal.split('.');
        const lastPart = parts[parts.length - 1];
        if (ltC === -1 && parts.length === 2 && lastPart.length === 3) {
            rawTotal = rawTotal.replace(/\./g, '');
        } else {
            rawTotal = rawTotal.replace(/,/g, '');
        }
    } else {
        rawTotal = rawTotal.replace(/[,.]/g, '');
    }
    
    const hasValidTotal = rawTotal !== undefined && rawTotal !== null && rawTotal !== '' && rawTotal !== 'NaN';
    const total = hasValidTotal && Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : NaN;

    let rawCorrect = String(historyRow.correct !== null && historyRow.correct !== undefined ? historyRow.correct : '');
    const lcX = rawCorrect.lastIndexOf(',');
    const ldX = rawCorrect.lastIndexOf('.');
    if (lcX > ldX) {
        rawCorrect = rawCorrect.replace(/\./g, '').replace(',', '.');
    } else if (ldX > lcX) {
        const parts = rawCorrect.split('.');
        const lastPart = parts[parts.length - 1];
        if (lcX === -1 && parts.length === 2 && lastPart.length === 3) {
            rawCorrect = rawCorrect.replace(/\./g, '');
        } else {
            rawCorrect = rawCorrect.replace(/,/g, '');
        }
    } else {
        rawCorrect = rawCorrect.replace(/[,.]/g, '');
    }

    const hasValidCorrect = rawCorrect !== undefined && rawCorrect !== null && rawCorrect !== '' && rawCorrect !== 'NaN';
    const correct = hasValidCorrect && Number.isFinite(Number(rawCorrect)) ? Number(rawCorrect) : NaN;

    // PRIORIDADE MÁXIMA: Flag isPercentage deve ser respeitada mesmo que total > 0.
    // Isso evita corrupção de dados em registros híbridos de bancos legados.
    if (historyRow.isPercentage) {
        // BUG: se correct for NaN, pValue = 0, e scoreFromPercentage = 0, enviesando a estatística.
        if (!Number.isFinite(correct)) return NaN;
        
        // FIX: score já foi verificado como null, então usamos `correct` como valor percentual direto.
        const pValue = normalizePercentInput(correct);
        const scoreFromPercentage = (pValue / 100) * safeMaxScore;
        return Number.isFinite(scoreFromPercentage) ? Math.max(0, Math.min(safeMaxScore, scoreFromPercentage)) : NaN;
    }

    // Fallback de retrocompatibilidade para provas clássicas (correct / total)
    if (total > 0) {
        return Math.max(0, Math.min(safeMaxScore, (correct / total) * safeMaxScore));
    }

    return NaN; // Prevenção de NaN (antigo fallback 0 removido para evitar bias de volatilidade)
}

export function getSafeQuestionStats(historyRow, maxScore = 100, options = {}) {
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const syntheticTotal = Number.isFinite(Number(options.syntheticTotal))
        ? Math.max(0, Number(options.syntheticTotal))
        : getSyntheticTotal(safeMaxScore);

    if (!historyRow || typeof historyRow !== 'object') {
        return { total: 0, correct: 0, wrong: 0, score: NaN, percentage: 0, hasData: false, isSynthetic: false };
    }

    const rawTotal = parseLocaleNumber(historyRow.total, NaN);
    const rawCorrect = parseLocaleNumber(historyRow.correct, NaN);
    const rawWrong = parseLocaleNumber(historyRow.wrong, NaN);
    const safeScore = getSafeScore(historyRow, safeMaxScore);
    const hasExplicitTotal = Number.isFinite(rawTotal) && rawTotal > 0;

    let total = hasExplicitTotal ? rawTotal : 0;
    let correct = NaN;
    let isSynthetic = false;

    if (total > 0) {
        if (Number.isFinite(rawCorrect) && !historyRow.isPercentage) {
            correct = rawCorrect;
        } else if (Number.isFinite(safeScore)) {
            correct = (safeScore / safeMaxScore) * total;
        } else if (Number.isFinite(rawWrong)) {
            correct = total - rawWrong;
        }
    } else if (Number.isFinite(rawCorrect) || Number.isFinite(rawWrong)) {
        const c = Math.max(0, Number.isFinite(rawCorrect) ? rawCorrect : 0);
        const w = Math.max(0, Number.isFinite(rawWrong) ? rawWrong : 0);
        total = c + w;
        correct = c;
    } else if (Number.isFinite(safeScore) && syntheticTotal > 0) {
        total = syntheticTotal;
        correct = (safeScore / safeMaxScore) * total;
        isSynthetic = true;
    }

    if (!(total > 0)) {
        return { total: 0, correct: 0, wrong: 0, score: NaN, percentage: 0, hasData: false, isSynthetic };
    }

    const boundedCorrect = Math.max(0, Math.min(total, Number.isFinite(correct) ? correct : 0));
    const wrong = Math.max(0, total - boundedCorrect);
    const score = (boundedCorrect / total) * safeMaxScore;

    return {
        total,
        correct: boundedCorrect,
        wrong,
        score,
        percentage: (boundedCorrect / total) * 100,
        hasData: true,
        isSynthetic
    };
}

/**
 * Formata um percentual de forma inteligente:
 * 75.45 -> 75.45%
 * 75.00 -> 75%
 */
export function formatPercent(value) {
    if (value === null || value === undefined) return '0%';
    
    let num;
    if (typeof value === 'number') {
        num = value;
    } else {
        let raw = String(value || '');
        const lastC = raw.lastIndexOf(',');
        const lastD = raw.lastIndexOf('.');
        if (lastC > lastD) {
            raw = raw.replace(/\./g, '').replace(',', '.');
        } else if (lastD > lastC) {
            const parts = raw.split('.');
            const lastPart = parts[parts.length - 1];
            if (lastC === -1 && parts.length === 2 && lastPart.length === 3) {
                if (/000|500/.test(lastPart)) {
                    raw = raw.replace(/\./g, '');
                } else {
                    raw = raw.replace(/,/g, '');
                }
            } else {
                raw = raw.replace(/,/g, '');
            }
        } else {
            raw = raw.replace(/[,.]/g, '');
        }
        num = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }
    
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
    
    let num;
    if (typeof value === 'number') {
        num = value;
    } else {
        let raw = String(value || '');
        const lastC = raw.lastIndexOf(',');
        const lastD = raw.lastIndexOf('.');
        if (lastC > lastD) {
            raw = raw.replace(/\./g, '').replace(',', '.');
        } else if (lastD > lastC) {
            const parts = raw.split('.');
            const lastPart = parts[parts.length - 1];
            if (lastC === -1 && parts.length === 2 && lastPart.length === 3) {
                if (/000|500/.test(lastPart)) {
                    raw = raw.replace(/\./g, '');
                } else {
                    raw = raw.replace(/,/g, '');
                }
            } else {
                raw = raw.replace(/,/g, '');
            }
        } else {
            raw = raw.replace(/[,.]/g, '');
        }
        num = (Number.isFinite(Number(raw)) ? Number(raw) : 0);
    }
    
    return String(parseFloat(num.toFixed(2)));
}
