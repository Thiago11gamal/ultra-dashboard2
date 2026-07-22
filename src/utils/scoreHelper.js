export function getSyntheticTotal(_maxScore = 100) {
  return 20;
}

export const normalizePercentInput = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return n;
};

// ✅ FIX: Parser robusto para números com separadores BR (1.234,56)
export function parseLocaleNumber(value, fallback = NaN) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined) return fallback;
  
  let raw = String(value).trim();
  if (!raw) return fallback;
  
  raw = raw.replace(/\s/g, '');
  
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Formato BR: 1.234,56
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    const parts = raw.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastComma === -1 && parts.length === 2 && lastPart.length === 3) {
      // Formato US: 1.234 (milhar)
      raw = raw.replace(/\./g, '');
    } else {
      // Formato US: 1,234.56
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
  
  if (typeof historyRow === 'number') {
    return Math.max(0, Math.min(safeMaxScore, historyRow));
  }
  
  if (!historyRow) return NaN;
  
  if (historyRow.score != null) {
    let s;
    if (typeof historyRow.score === 'number') {
      s = historyRow.score;
    } else {
      // ✅ FIX: Usa parseLocaleNumber para tratar 1.234,56
      s = parseLocaleNumber(historyRow.score, NaN);
    }
    
    // ✅ FIX: isPercentage agora escala corretamente para qualquer maxScore
    if (historyRow.isPercentage) {
      const pctValue = normalizePercentInput(s);
      if (!Number.isFinite(pctValue)) return NaN;
      // ✅ FIX: Clamp do percentual entre 0 e 100 antes de escalar
      const clampedPct = Math.max(0, Math.min(100, pctValue));
      s = (clampedPct / 100) * safeMaxScore;
    }
    
    return Number.isFinite(s) ? Math.max(0, Math.min(safeMaxScore, s)) : NaN;
  }
  
  // ✅ FIX: Usa parseLocaleNumber para total e correct
  const total = parseLocaleNumber(historyRow.total, NaN);
  const correct = parseLocaleNumber(historyRow.correct, NaN);
  
  if (historyRow.isPercentage) {
    if (!Number.isFinite(correct)) return NaN;
    const pValue = normalizePercentInput(correct);
    if (!Number.isFinite(pValue)) return NaN;
    const clampedPct = Math.max(0, Math.min(100, pValue));
    const scoreFromPercentage = (clampedPct / 100) * safeMaxScore;
    return Number.isFinite(scoreFromPercentage) ? Math.max(0, Math.min(safeMaxScore, scoreFromPercentage)) : NaN;
  }
  
  if (total > 0) {
    return Math.max(0, Math.min(safeMaxScore, (correct / total) * safeMaxScore));
  }
  
  return NaN;
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
    total, correct: boundedCorrect, wrong, score,
    percentage: (boundedCorrect / total) * 100,
    hasData: true, isSynthetic
  };
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '0%';
  let num;
  if (typeof value === 'number') {
    num = value;
  } else {
    num = parseLocaleNumber(value, 0);
  }
  const formatted = parseFloat(num.toFixed(2));
  return `${formatted}%`;
}

export function formatValue(value) {
  if (value === null || value === undefined) return '0';
  let num;
  if (typeof value === 'number') {
    num = value;
  } else {
    num = parseLocaleNumber(value, 0);
  }
  return String(parseFloat(num.toFixed(2)));
}
