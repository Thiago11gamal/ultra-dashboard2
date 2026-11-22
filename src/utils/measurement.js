import { normalizeDate } from "./dateHelper.js";

const isStrictNumericInput = (value) => (
  value !== null &&
  value !== undefined &&
  typeof value !== "boolean" &&
  String(value).trim() !== "" &&
  Number.isFinite(Number(value))
);

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const mapCollection = (collection, mapper) => {
  if (Array.isArray(collection)) {
    return collection.map(mapper);
  }

  if (collection && typeof collection === "object") {
    return Object.fromEntries(
      Object.entries(collection).map(([key, value]) => [key, mapper(value, key)])
    );
  }

  return collection;
};

/**
 * Clamp seguro que NÃO propaga NaN.
 */
export function clampFinite(value, min, max, fallback = min) {
  let safeMin = Number(min);
  let safeMax = Number(max);
  if (!Number.isFinite(safeMin)) safeMin = 0;
  if (!Number.isFinite(safeMax)) safeMax = safeMin;
  if (safeMin > safeMax) { const tmp = safeMin; safeMin = safeMax; safeMax = tmp; }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const fb = Number(fallback);
    return Number.isFinite(fb)
      ? Math.min(safeMax, Math.max(safeMin, fb))
      : safeMin;
  }
  return Math.min(safeMax, Math.max(safeMin, n));
}

/**
 * Domínio seguro da prova/matéria.
 */
export function safeDomain(maxScore, minScore = 0) {
  let rawMax = Number(maxScore);
  let max = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
  let min = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  if (min > max) { const tmp = min; min = max; max = tmp; }
  const range = Math.max(1e-9, max - min);
  return { min, max, range };
}

export function sanitizeMaxScore(value) {
  return clampFinite(value, 1, 1_000_000, 100);
}

const asDomain = (domainOrMax, minScore = 0) => {
  if (
    domainOrMax &&
    typeof domainOrMax === "object" &&
    "min" in domainOrMax &&
    "max" in domainOrMax &&
    "range" in domainOrMax
  ) {
    return domainOrMax;
  }

  return safeDomain(domainOrMax, minScore);
};

/**
 * Converte pontos para porcentagem dentro do intervalo útil [min, max].
 */
export function pointsToPct(points, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const pct = ((Number(points) - domain.min) / domain.range) * 100;
  return clampFinite(pct, 0, 100, 0);
}

/**
 * Converte porcentagem para pontos dentro do intervalo útil [min, max].
 */
export function pctToPoints(pct, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const safePct = clampFinite(pct, 0, 100, 0);
  return domain.min + (safePct / 100) * domain.range;
}

export function ratioToPoints(ratio, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const safeRatio = clampFinite(ratio, 0, 1, 0);
  return domain.min + safeRatio * domain.range;
}

/**
 * Probabilidade interna deve ser sempre 0-1.
 */
export function toProb01(value, unit = "auto") {
  if (value == null) return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  if (unit === "prob") return clampFinite(n, 0, 1, 0);
  if (unit === "pct") return clampFinite(n, 0, 100, 0) / 100;

  // auto
  if (n >= 0 && n <= 1) return n;
  if (n > 1 && n <= 100) return n / 100;

  return clampFinite(n, 0, 1, n < 0 ? 0 : 1);
}

export function toProbPct(value, unit = "auto") {
  const p = toProb01(value, unit);
  return p == null ? null : p * 100;
}

export function safeDivide(num, den, fallback = 0) {
  const n = Number(num);
  const d = Number(den);

  if (!Number.isFinite(n) || !Number.isFinite(d) || Math.abs(d) < 1e-12) {
    return fallback;
  }

  return n / d;
}

export function safeTime(value, fallback = NaN) {
  if (value === null || value === undefined || typeof value === "boolean") return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;

  try {
    if (value instanceof Date) {
      const t = value.getTime();
      return Number.isFinite(t) ? t : fallback;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    const norm = normalizeDate(value);
    if (norm instanceof Date && !Number.isNaN(norm.getTime())) {
      return norm.getTime();
    }
    const d = new Date(value);
    const t = d?.getTime?.();
    return Number.isFinite(t) ? t : fallback;
  } catch {
    return fallback;
  }
}

const defaultGetDateKey = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];
  }

  const t = safeTime(value, NaN);
  if (!Number.isFinite(t)) return null;

  const d = new Date(t);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export function normalizeSubjectKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function sortChronologically(rows, getDate = (row) => row?.date || row?.createdAt) {
  return [...safeArray(rows)].sort((a, b) => {
    const ta = safeTime(getDate(a), 0);
    const tb = safeTime(getDate(b), 0);
    return ta - tb;
  });
}

export function latestByDate(rows, getDate = (row) => row?.date || row?.createdAt) {
  let best = null;

  for (const row of safeArray(rows)) {
    const rawDate = typeof row?.date === 'string' ? row.date.trim() : row?.date;
    const rawCreated = typeof row?.createdAt === 'string' ? row.createdAt.trim() : row?.createdAt;
    const dateVal = rawDate || rawCreated || (typeof getDate === 'function' ? getDate(row) : null);
    const t = safeTime(dateVal, NaN);
    if (!Number.isFinite(t)) continue;

    if (!best || t > best.t) {
      best = { t, row };
    }
  }

  return best?.row || null;
}

export function resolveTargetPoints(value, domainOrMax, minScore = 0, unit = "auto") {
  const domain = asDomain(domainOrMax, typeof minScore === "number" ? minScore : 0);
  const actualUnit = typeof minScore === "string" && unit === "auto" ? minScore : unit;

  if (value && typeof value === "object") {
    if (Number.isFinite(value.points)) return clampFinite(value.points, domain.min, domain.max, domain.min);
    if (Number.isFinite(value.pct)) return pctToPoints(value.pct, domain);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return domain.min;
  if (actualUnit === "points") return clampFinite(n, domain.min, domain.max, domain.min);
  if (actualUnit === "pct") return pctToPoints(n, domain);
  return clampFinite(n, domain.min, domain.max, domain.min);
}

/**
 * Normaliza qualquer registro de score para o motor interno.
 * Retorna sempre:
 * - points: pontos no domínio [min, max]
 * - pct: porcentagem no intervalo útil
 * - ratio: 0-1
 */
export function normalizeScoreValue(row, maxScore, minScore = 0) {
  const r = row && typeof row === "object" ? row : {};
  const domain = safeDomain(maxScore, minScore);
  const totalRaw = Number(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions);
  const total = Number.isFinite(totalRaw) ? Math.max(0, Math.trunc(totalRaw)) : 0;

  const rawCorrectVal = r.correct ?? r.acertos ?? r.correctCount;
  const hasExplicitCorrect = isStrictNumericInput(rawCorrectVal);
  const hasAnyScoreField =
    isStrictNumericInput(r.scorePoints) ||
    isStrictNumericInput(r.scorePct) ||
    isStrictNumericInput(r.score) ||
    isStrictNumericInput(r.value);

  let correct = 0;
  if (total > 0 && hasExplicitCorrect) {
    const correctRaw = Number(rawCorrectVal);
    correct = Math.max(0, Math.min(total, Math.trunc(correctRaw)));
  }

  // ── 1) total/correct ──────────────────────────────────────
  if (total > 0 && (hasExplicitCorrect || !hasAnyScoreField)) {
    const penaltyPerWrong = Number(r.penaltyPerWrong) || 0;
    const ratio = penaltyPerWrong > 0
      ? computeEffectiveScoreRatio(correct, total, {
          blanks: Number(r.blanks) || 0,
          penaltyPerWrong,
          minScore: domain.min,
          maxScore: domain.max,
        }).ratio
      : Math.max(0, Math.min(1, correct / total));
    return {
      points: domain.min + ratio * domain.range,
      pct: ratio * 100,
      ratio,
      total,
      correct,
      totalValid: true,
      domain,
      ambiguous: false,
      source: "total-correct",
    };
  }

  const withDerivedCorrect = (res) => {
    if (total > 0 && Number.isFinite(res.ratio)) {
      const derivedC = Math.max(0, Math.min(total, Math.round(res.ratio * total)));
      return { ...res, total, correct: derivedC, totalValid: true };
    }
    return res;
  };

  // ── 2) scorePoints explícito ──────────────────────────────
  const scorePointsRaw = isStrictNumericInput(r.scorePoints) ? Number(r.scorePoints) : NaN;
  if (Number.isFinite(scorePointsRaw)) {
    const points = clampFinite(scorePointsRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    return withDerivedCorrect({
      points, pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "scorePoints",
    });
  }

  // ── 3) scorePct explícito ─────────────────────────────────
  const scorePctRaw = isStrictNumericInput(r.scorePct) ? Number(r.scorePct) : NaN;
  if (Number.isFinite(scorePctRaw)) {
    const pct = clampFinite(scorePctRaw, 0, 100, 0);
    const points = pctToPoints(pct, domain);
    return withDerivedCorrect({
      points, pct,
      ratio: clampFinite(pct / 100, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "scorePct",
    });
  }

  // ── 4) campo score ────────────────────────────────────────
  const scoreRaw = isStrictNumericInput(r.score) ? Number(r.score) : NaN;
  if (Number.isFinite(scoreRaw)) {
    const unit = r.unit || r.scoreUnit;
    const explicitPct    = unit === "pct"    || r.isPercentage === true;
    const explicitPoints = unit === "points" || r.isPercentage === false;

    if (explicitPct) {
      // ✅ FIX: Clamp no domínio de porcentagem ANTES de converter
      const pct = clampFinite(scoreRaw, 0, 100, 0);
      const points = pctToPoints(pct, domain);
      // ✅ FIX: Garantir que points está dentro do domínio
      const safePoints = clampFinite(points, domain.min, domain.max, domain.min);
      const ratio = clampFinite((safePoints - domain.min) / domain.range, 0, 1, 0);
      return withDerivedCorrect({
        points: safePoints,
        pct,
        ratio,
        total, correct, totalValid: false, domain,
        ambiguous: false, source: "score-explicit-pct",
      });
    }
    if (explicitPoints) {
      // ✅ FIX: Clamp direto no domínio
      const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
      const pct = pointsToPct(points, domain);
      const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
      return withDerivedCorrect({
        points, pct, ratio,
        total, correct, totalValid: false, domain,
        ambiguous: false, source: "score-explicit-points",
      });
    }

    // ✅ FIX: SEM auto-detecção. Tratar como PONTOS.
    const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
    const ambiguous = domain.max > 100 && scoreRaw >= 0 && scoreRaw <= 100 && r.isPercentage !== false;
    
    return withDerivedCorrect({
      points, pct, ratio,
      total, correct, totalValid: false, domain,
      ambiguous,
      source: ambiguous ? "score-ambiguous-as-points" : "score-auto-points",
    });
  }

  // ── 5) fallback campo value (dados legados) ───────────────
  const valueRaw = isStrictNumericInput(r.value) ? Number(r.value) : NaN;
  if (Number.isFinite(valueRaw)) {
    const points = clampFinite(valueRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    return withDerivedCorrect({
      points, pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "value-field",
    });
  }

  return {
    points: NaN, pct: NaN, ratio: 0,
    total, correct, totalValid: false, domain,
    ambiguous: false, source: "missing", invalid: true,
  };
}

export function extractTopicsTotals(entry, maxScore = 100, minScore = 0) {
  const rawTopics = entry?.topics;
  const topicsList = Array.isArray(rawTopics)
    ? rawTopics
    : (rawTopics && typeof rawTopics === "object" ? Object.values(rawTopics) : []);
  if (!topicsList.length) return { total: 0, correct: 0, hasTopicsScore: false, score: NaN };

  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0
    ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore))
    ? Math.min(Number(minScore), safeMax) : 0;
  const safeRange = Math.max(1e-9, safeMax - safeMin);
  let sumTotal = 0;
  let sumCorrect = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  const parentPenalty = Number(entry?.penaltyPerWrong) || 0;

  for (const t of topicsList) {
    if (!t || typeof t !== "object") continue;
    const tEff = (t.penaltyPerWrong == null && parentPenalty > 0)
      ? { ...t, penaltyPerWrong: parentPenalty }
      : t;
    const tTot = Math.max(0, Number(tEff.total ?? tEff.questoes ?? tEff.totalQuestoes ?? tEff.questions) || 0);
    const hasTC =
      (tEff.correct !== undefined && tEff.correct !== null && String(tEff.correct).trim() !== "") ||
      (tEff.acertos !== undefined && tEff.acertos !== null && String(tEff.acertos).trim() !== "") ||
      (tEff.correctCount !== undefined && tEff.correctCount !== null && String(tEff.correctCount).trim() !== "");
    const parsedTC = Number(tEff.correct ?? tEff.acertos ?? tEff.correctCount);
    const tScore = getSafeScore(tEff, safeMax, safeMin);
    if (tTot > 0) {
      if (!hasTC && !Number.isFinite(tScore)) continue;
      sumTotal += tTot;
      const effC = resolveEffectiveCorrect(
        tEff,
        tScore,
        tTot,
        !tEff.isPercentage && hasTC && Number.isFinite(parsedTC),
        parsedTC,
        safeMax,
        safeMin
      );
      sumCorrect += Math.max(0, Math.min(tTot, effC));
    } else if (Number.isFinite(tScore)) {
      scoreSum += tScore;
      scoreCount += 1;
    }
  }

  if (sumTotal > 0) {
    const derivedScore = safeMin + (sumCorrect / sumTotal) * safeRange;
    return { total: sumTotal, correct: sumCorrect, hasTopicsScore: true, score: derivedScore };
  }
  if (scoreCount > 0) {
    return { total: 0, correct: 0, hasTopicsScore: true, score: scoreSum / scoreCount };
  }
  return { total: 0, correct: 0, hasTopicsScore: false, score: NaN };
}

/**
 * Para motores matemáticos, retorne SEMPRE pontos.
 */
export function getSafeScore(row, maxScore, minScore = 0) {
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0
    ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore))
    ? Math.min(Number(minScore), safeMax) : 0;
  const range = Math.max(1e-9, safeMax - safeMin);

  if (row == null) return NaN; // ✅ NaN para dados nulos

  let score;

  const parseNum = (val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.includes(',')) {
        const clean = trimmed.replace(/\./g, '').replace(',', '.');
        return Number(clean);
      }
      // Apenas trata ponto como milhar se houver múltiplos pontos (1.234.567) ou se não começar com zero (excluindo 0.125)
      if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(trimmed)) {
        return Number(trimmed.replace(/\./g, ''));
      }
      return Number(trimmed);
    }
    return typeof val === "boolean" ? NaN : Number(val);
  };

  if (typeof row === "number") {
    score = row;
  } else if (isStrictNumericInput(row.scorePoints)) {
    score = Number(row.scorePoints);
  } else if (isStrictNumericInput(row.scorePct)) {
    score = safeMin + (Math.max(0, Math.min(100, Number(row.scorePct))) / 100) * range;
  } else if (row.score != null && typeof row.score !== "boolean" && String(row.score).trim() !== "") {
    score = parseNum(row.score);
    let isPct = Boolean(row.isPercentage || row.unit === 'pct' || row.unit === 'percentage' || row.scoreUnit === 'pct');
    // Compatibilidade com linhas manuais legadas gravadas pelo SimuladoAnalysis em [0..100] sem flag isPercentage
    if (!isPct && Number.isFinite(score) && row.source === 'manual' && row.scoreUnit !== 'points' && row.isPercentage === undefined && row.unit == null) {
      const total = Number(row.total ?? row.questoes ?? row.totalQuestoes ?? row.questions);
      const correct = Number(row.correct ?? row.acertos ?? row.correctCount);
      if (Number.isFinite(total) && total > 0 && Number.isFinite(correct)) {
        const expectedPct = Math.min(100, (Math.max(0, Math.min(total, correct)) / total) * 100);
        if (Math.abs(score - expectedPct) <= 0.1) {
          isPct = true;
        }
      }
    }
    if (isPct && Number.isFinite(score)) {
      score = safeMin + (Math.max(0, Math.min(100, score)) / 100) * range;
    } else if (
      Number.isFinite(score) &&
      isStrictNumericInput(row.sourceMinScore) &&
      isStrictNumericInput(row.sourceMaxScore) &&
      Number(row.sourceMaxScore) > Number(row.sourceMinScore)
    ) {
      const srcMin = Number(row.sourceMinScore);
      const srcMax = Number(row.sourceMaxScore);
      if (srcMin !== safeMin || srcMax !== safeMax) {
        const clampedProp = Math.max(0, Math.min(1, (score - srcMin) / (srcMax - srcMin)));
        score = safeMin + clampedProp * range;
      }
    }
  } else if (row.value != null && row.value !== '') {
    score = parseNum(row.value);
    const isPct = Boolean(row.isPercentage || row.unit === 'pct' || row.unit === 'percentage' || row.scoreUnit === 'pct');
    if (isPct && Number.isFinite(score)) {
      score = safeMin + (Math.max(0, Math.min(100, score)) / 100) * range;
    } else if (
      Number.isFinite(score) &&
      isStrictNumericInput(row.sourceMinScore) &&
      isStrictNumericInput(row.sourceMaxScore) &&
      Number(row.sourceMaxScore) > Number(row.sourceMinScore)
    ) {
      const srcMin = Number(row.sourceMinScore);
      const srcMax = Number(row.sourceMaxScore);
      if (srcMin !== safeMin || srcMax !== safeMax) {
        const clampedProp = Math.max(0, Math.min(1, (score - srcMin) / (srcMax - srcMin)));
        score = safeMin + clampedProp * range;
      }
    }
  } else if ((row.correct != null || row.acertos != null || row.correctCount != null) && (row.total != null || row.questoes != null || row.totalQuestoes != null || row.questions != null)) {
    const total = Number(row.total ?? row.questoes ?? row.totalQuestoes ?? row.questions);
    const correct = Number(row.correct ?? row.acertos ?? row.correctCount);
    // ✅ FIX: proteger contra total=0 → divisão por zero e respeitar penalidade Cebraspe/brancos
    if (Number.isFinite(total) && total > 0 && Number.isFinite(correct)) {
      const penaltyPerWrong = Number(row.penaltyPerWrong) || 0;
      if (penaltyPerWrong > 0) {
        const eff = computeEffectiveScoreRatio(correct, total, {
          blanks: Number(row.blanks) || 0,
          penaltyPerWrong,
          minScore: safeMin,
          maxScore: safeMax,
        });
        score = safeMin + eff.ratio * range;
      } else {
        score = safeMin + (Math.max(0, Math.min(total, correct)) / total) * range;
      }
    }
  }

  if (typeof row === "object" && row.topics != null) {
    const headerTotal = Number(row.total ?? row.questoes ?? row.totalQuestoes ?? row.questions) || 0;
    if (!Number.isFinite(score) || (headerTotal <= 0 && score === safeMin)) {
      const topicFallback = extractTopicsTotals(row, safeMax, safeMin);
      if (topicFallback.hasTopicsScore && Number.isFinite(topicFallback.score)) {
        score = topicFallback.score;
      }
    }
  }

  // ✅ NaN é propagado para o consumidor filtrar
  // (evita tratar dado corrompido como "nota zero")
  if (!Number.isFinite(score)) return NaN;
  return Math.max(safeMin, Math.min(safeMax, score));
}

export function clampCorrectToTotal(correct, total) {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return 0;

  const c = Number(correct);
  if (!Number.isFinite(c)) return 0;

  const safeTotal = Math.max(0, Math.trunc(t));
  const safeCorrect = Math.max(0, Math.trunc(c));

  return Math.min(safeTotal, safeCorrect);
}

/**
 * Resolve o número efetivo de acertos respeitando penalidades (CEBRASPE),
 * questões em branco e notas autoritativas (ENEM TRI / scorePoints / scorePct),
 * sem distorcer arredondamentos inteiros simples (ex.: 2/3 com score: 67).
 */
export function resolveEffectiveCorrect(
  entry,
  score,
  rawTotal,
  hasExplicitCorrect,
  rawCorrect,
  maxScore = 100,
  minScore = 0
) {
  const safeTotal = Math.max(0, Number(rawTotal) || 0);
  if (safeTotal <= 0) return 0;

  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
  const safeRange = Math.max(1e-9, safeMax - safeMin);
  const hasScore = Number.isFinite(Number(score));
  const scoreRatio = hasScore ? clampFinite((Number(score) - safeMin) / safeRange, 0, 1, 0) : NaN;

  const hasValidRaw = Boolean(hasExplicitCorrect && !entry?.isPercentage && Number.isFinite(Number(rawCorrect)));
  const clampedRaw = hasValidRaw ? Math.max(0, Math.min(safeTotal, Number(rawCorrect))) : NaN;

  if (!hasValidRaw) {
    return Number.isFinite(scoreRatio) ? Math.max(0, Math.min(safeTotal, scoreRatio * safeTotal)) : 0;
  }

  if (!Number.isFinite(scoreRatio)) {
    return clampedRaw;
  }

  const rawRatio = clampedRaw / safeTotal;
  const hasPenalizedOrTRI =
    (Number(entry?.penaltyPerWrong) > 0) ||
    (Number(entry?.blanks) > 0) ||
    isStrictNumericInput(entry?.netPoints) ||
    isStrictNumericInput(entry?.scorePoints) ||
    isStrictNumericInput(entry?.scorePct);

  const hasDivergentExplicitScore =
    isStrictNumericInput(entry?.score) && Math.abs(scoreRatio - rawRatio) > 0.01;

  if ((hasPenalizedOrTRI && Math.abs(scoreRatio - rawRatio) > 1e-4) || hasDivergentExplicitScore) {
    return Math.max(0, Math.min(safeTotal, scoreRatio * safeTotal));
  }

  return clampedRaw;
}

/**
 * Sanitiza linha de simulado garantindo invariantes:
 * - total >= 0
 * - correct >= 0
 * - correct <= total
 * - score interno em pontos
 * - scorePct para UI
 */
export function sanitizeSimuladoRow(row, maxScore = 100, minScore = 0) {
  const r = row && typeof row === "object" ? row : {};
  const warnings = [];
  const domain = safeDomain(maxScore, minScore);

  const rawTotal = Number(r.total);
  const rawCorrect = Number(r.correct);

  const norm = normalizeScoreValue(r, domain.max, domain.min);

  if (Number.isFinite(rawCorrect) && rawCorrect > 0 && norm.total === 0) {
    warnings.push("correct > 0 com total = 0 → correct zerado");
  }

  if (
    Number.isFinite(rawCorrect) &&
    Number.isFinite(rawTotal) &&
    rawTotal > 0 &&
    rawCorrect > rawTotal
  ) {
    warnings.push(`correct(${rawCorrect}) > total(${rawTotal}) → clamp aplicado`);
  }

  const rawDate = r.date || r.createdAt || null;
  const t = safeTime(rawDate, NaN);
  const hasValidDate = Number.isFinite(t) && t > 0;

  if (!hasValidDate) {
    warnings.push("data inválida");
  }

  // ✅ PATCH-04: expor ambiguidade para o consumidor
  const hasAmbiguousWarning = norm.ambiguous && norm.source.startsWith("score-ambiguous");
  if (hasAmbiguousWarning && !warnings.includes("score-ambiguous")) {
    warnings.push(
      `Score "${r.score}" ambíguo na escala [${domain.min}–${domain.max}]. ` +
      `Tratado como pontos. Defina "unit" ou "isPercentage" explicitamente.`
    );
  }

  return {
    ...r,
    date: hasValidDate ? rawDate : null,
    createdAt: hasValidDate ? (r.createdAt || rawDate) : null,
    valid: hasValidDate,
    total: norm.total,
    correct: norm.correct,
    scorePoints: norm.points,
    scorePct: norm.pct,
    score: norm.points,          // motores internos usam pontos
    isPercentage: false,         // após normalização nunca é pct
    originalIsPercentage: Boolean(r.isPercentage),
    scoreUnit: "points",
    ambiguousScore: norm.ambiguous,
    warnings,
  };
}

/**
 * Calcula a proporção efetiva de pontuação considerando penalidade da banca (ex.: CEBRASPE)
 * e questões deixadas em branco. Quando penaltyPerWrong <= 0, equivale exatamente a correct / total.
 */
export function computeEffectiveScoreRatio(
  correct,
  total,
  { blanks = 0, penaltyPerWrong = 0, minScore = 0, maxScore = 100 } = {}
) {
  const safeT = Math.max(0, Number(total) || 0);
  if (safeT <= 0) {
    return { ratio: 0, netPoints: 0, wrong: 0, blanks: 0, penaltyApplied: false };
  }
  const safeC = Math.max(0, Math.min(safeT, Number(correct) || 0));
  const safePenalty = Math.max(0, Number(penaltyPerWrong) || 0);
  const safeBlanks = Math.max(0, Math.min(safeT - safeC, Number(blanks) || 0));
  const wrong = Math.max(0, safeT - safeC - safeBlanks);

  if (safePenalty <= 0) {
    return { ratio: safeC / safeT, netPoints: safeC, wrong, blanks: safeBlanks, penaltyApplied: false };
  }

  const rawNet = safeC - wrong * safePenalty;
  if (Number(minScore) < 0 && Number(maxScore) > 0) {
    const scaled = (rawNet / safeT) * Number(maxScore);
    const clamped = Math.max(Number(minScore), Math.min(Number(maxScore), scaled));
    const range = Math.max(1e-9, Number(maxScore) - Number(minScore));
    return {
      ratio: Math.max(0, Math.min(1, (clamped - Number(minScore)) / range)),
      netPoints: Number(rawNet.toFixed(2)),
      wrong,
      blanks: safeBlanks,
      penaltyApplied: true,
    };
  }

  const clampedNet = Math.max(0, rawNet);
  return {
    ratio: Math.max(0, Math.min(1, clampedNet / safeT)),
    netPoints: Number(clampedNet.toFixed(2)),
    wrong,
    blanks: safeBlanks,
    penaltyApplied: true,
  };
}

/**
 * Atualização segura de resultado de questões.
 * Nunca deixa correct > total e preserva penalidade/brancos e telemetria.
 */
export function mergeQuestionResult(row, delta, maxScore, minScore = 0) {
  const domain = safeDomain(maxScore, minScore);
  const r = row && typeof row === "object" ? row : {};

  const addedTotal = Math.max(0, Math.trunc(Number(delta?.total) || 0));
  const addedCorrect = Math.min(
    addedTotal,
    Math.max(0, Math.trunc(Number(delta?.correct) || 0))
  );
  const addedBlanks = Math.min(
    Math.max(0, addedTotal - addedCorrect),
    Math.max(0, Math.trunc(Number(delta?.blanks) || 0))
  );

  const oldTotal = Math.max(0, Math.trunc(Number(r.total) || 0));
  const oldCorrect = Math.min(oldTotal, Math.max(0, Math.trunc(Number(r.correct) || 0)));
  const oldBlanks = Math.min(
    Math.max(0, oldTotal - oldCorrect),
    Math.max(0, Math.trunc(Number(r.blanks) || 0))
  );

  const isIncremental = Boolean(delta?.isDelta ?? delta?.incremental);
  const newTotal = isIncremental
    ? oldTotal + addedTotal
    : Math.max(oldTotal, addedTotal);
  const newCorrect = isIncremental
    ? Math.min(newTotal, oldCorrect + addedCorrect)
    : Math.min(newTotal, Math.max(oldCorrect, addedCorrect));
  const newBlanks = Math.min(
    Math.max(0, newTotal - newCorrect),
    isIncremental ? oldBlanks + addedBlanks : Math.max(oldBlanks, addedBlanks)
  );

  const effPenalty = Math.max(0, Number(delta?.penaltyPerWrong ?? r.penaltyPerWrong) || 0);
  const eff = computeEffectiveScoreRatio(newCorrect, newTotal, {
    blanks: newBlanks,
    penaltyPerWrong: effPenalty,
    minScore: domain.min,
    maxScore: domain.max,
  });
  const ratio = eff.ratio;
  const points = domain.min + ratio * domain.range;

  const existingTel = Array.isArray(r.questionTelemetry) ? r.questionTelemetry : [];
  const incomingTel = Array.isArray(delta?.questionTelemetry) ? delta.questionTelemetry : [];
  let mergedTelemetry;
  if (incomingTel.length > 0) {
    const seen = new Set();
    mergedTelemetry = [...existingTel, ...incomingTel]
      .filter((item) => {
        if (!item || typeof item !== 'object') return false;
        if (!item.id) return true;
        const key = String(item.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(-60);
  }

  return {
    ...r,
    correct: newCorrect,
    total: newTotal,
    ...(newBlanks > 0 ? { blanks: eff.blanks } : {}),
    ...(eff.penaltyApplied ? { netPoints: eff.netPoints, penaltyPerWrong: effPenalty } : {}),
    scorePoints: points,
    scorePct: ratio * 100,
    score: points,
    scoreUnit: "points",
    isPercentage: false,
    ...(mergedTelemetry ? { questionTelemetry: mergedTelemetry } : {}),
    timeSpent: Number.isFinite(Number(r.timeSpent)) || Number.isFinite(Number(delta?.timeSpentSecs))
      ? Math.max(0, (Number(r.timeSpent) || 0) + Math.max(0, Number(delta?.timeSpentSecs) || 0))
      : 0
  };
}

/**
 * Deduplicação correta de simulados por:
 * id + matéria + data + score.
 */
export function deduplicateSimulados(simulados, options = {}) {
  const {
    maxScore = 100,
    minScore = 0,
    getDateKey = defaultGetDateKey
  } = options;

  const map = new Map();

  safeArray(simulados).forEach((s) => {
    const norm = normalizeScoreValue(s, maxScore, minScore);
    if (norm.invalid) return;

    const subjectKey = normalizeSubjectKey(
      s?.subject || s?.categoryId || s?.categoryName || s?.materia || "geral"
    );

    const dateKey = getDateKey(s?.date || s?.createdAt) || "sem-data";

    // BUG: correct: 0 era colapsado com correct: undefined.
    const hasTotal = Number.isFinite(Number(s?.total));
    const hasCorrect = Number.isFinite(Number(s?.correct));

    const idPart = s?.id || [
      subjectKey,
      dateKey,
      norm.points.toFixed(2)
    ].join(':');
    const key = [
      idPart,
      subjectKey,
      dateKey,
      norm.points.toFixed(2),
      hasTotal ? Number(s.total) : '',
      hasCorrect ? Number(s.correct) : '',
    ].join("|");

    if (!map.has(key)) {
      map.set(key, {
        ...s,
        total: norm.total,
        correct: norm.correct,
        scorePoints: norm.points,
        scorePct: norm.pct,
        score: norm.points,
        scoreUnit: "points",
        isPercentage: false,
        originalIsPercentage: Boolean(s?.isPercentage)
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Cria chaves data+matéria para não suprimir histórico de matérias diferentes.
 */
export function buildSimuladoDateSubjectKeys(simulados, getDateKey = defaultGetDateKey) {
  const set = new Set();

  safeArray(simulados).forEach((s) => {
    const dk = getDateKey(s?.date || s?.createdAt);
    if (!dk) return;

    const subjectKey = normalizeSubjectKey(
      s?.subject || s?.categoryId || s?.categoryName || s?.materia || "geral"
    );

    set.add(`${dk}|${subjectKey}`);
  });

  return set;
}

/**
 * Migração de concurso existente para o novo modelo seguro.
 */
export function migrateContestData(contest) {
  if (!contest || typeof contest !== "object") return contest;

  const maxScore = sanitizeMaxScore(contest.maxScore);
  const minScore = clampFinite(contest.minScore, -maxScore, maxScore, 0);

  const next = {
    ...contest,
    maxScore,
    minScore
  };

  if (next.simulados) {
    next.simulados = mapCollection(next.simulados, (row) =>
      sanitizeSimuladoRow(row, maxScore, minScore)
    );
  }

  if (next.simuladoRows) {
    next.simuladoRows = mapCollection(next.simuladoRows, (row) =>
      sanitizeSimuladoRow(row, maxScore, minScore)
    );
  }

  if (next.categories) {
    next.categories = mapCollection(next.categories, (cat) => {
      if (!cat || typeof cat !== "object") return cat;

      const catMax = sanitizeMaxScore(cat.maxScore ?? maxScore);
      const catMin = clampFinite(cat.minScore ?? minScore, -catMax, catMax, minScore);

      const nextCat = {
        ...cat,
        maxScore: catMax,
        minScore: catMin
      };

      if (nextCat.history) {
        nextCat.history = safeArray(nextCat.history).map((h) =>
          sanitizeSimuladoRow(h, catMax, catMin)
        );
      }

      if (nextCat.simuladoStats && typeof nextCat.simuladoStats === "object") {
        nextCat.simuladoStats = {
          ...nextCat.simuladoStats,
          history: safeArray(nextCat.simuladoStats.history).map((h) =>
            sanitizeSimuladoRow(h, catMax, catMin)
          )
        };
      }

      return nextCat;
    });
  }

  return next;
}
