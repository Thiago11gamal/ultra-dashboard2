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
  if (value == null) return fallback;

  try {
    const d = value instanceof Date ? value : new Date(value);
    const t = d?.getTime?.();
    return Number.isFinite(t) ? t : fallback;
  } catch {
    return fallback;
  }
}

const defaultGetDateKey = (value) => {
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
    const t = safeTime(getDate(row), NaN);
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
  const totalRaw = Number(r.total);
  const total = Number.isFinite(totalRaw) ? Math.max(0, Math.trunc(totalRaw)) : 0;

  let correct = 0;
  if (total > 0) {
    const correctRaw = Number(r.correct);
    correct = Number.isFinite(correctRaw)
      ? Math.max(0, Math.min(total, Math.trunc(correctRaw)))
      : 0;
  }

  // ── 1) total/correct ──────────────────────────────────────
  if (total > 0) {
    const ratio = correct / total;
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

  // ── 2) scorePoints explícito ──────────────────────────────
  const scorePointsRaw = r.scorePoints == null ? NaN : Number(r.scorePoints);
  if (Number.isFinite(scorePointsRaw)) {
    const points = clampFinite(scorePointsRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    return {
      points, pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "scorePoints",
    };
  }

  // ── 3) scorePct explícito ─────────────────────────────────
  const scorePctRaw = r.scorePct == null ? NaN : Number(r.scorePct);
  if (Number.isFinite(scorePctRaw)) {
    const pct = clampFinite(scorePctRaw, 0, 100, 0);
    const points = pctToPoints(pct, domain);
    return {
      points, pct,
      ratio: clampFinite(pct / 100, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "scorePct",
    };
  }

  // ── 4) campo score ────────────────────────────────────────
  const scoreRaw = r.score == null ? NaN : Number(r.score);
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
      return {
        points: safePoints,
        pct,
        ratio,
        total, correct, totalValid: false, domain,
        ambiguous: false, source: "score-explicit-pct",
      };
    }
    if (explicitPoints) {
      // ✅ FIX: Clamp direto no domínio
      const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
      const pct = pointsToPct(points, domain);
      const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
      return {
        points, pct, ratio,
        total, correct, totalValid: false, domain,
        ambiguous: false, source: "score-explicit-points",
      };
    }

    // ✅ FIX: SEM auto-detecção. Tratar como PONTOS.
    const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    const ratio = clampFinite((points - domain.min) / domain.range, 0, 1, 0);
    const ambiguous = domain.max > 100 && scoreRaw >= 0 && scoreRaw <= 100 && r.isPercentage !== false;
    
    return {
      points, pct, ratio,
      total, correct, totalValid: false, domain,
      ambiguous,
      source: ambiguous ? "score-ambiguous-as-points" : "score-auto-points",
    };
  }

  // ── 5) fallback campo value (dados legados) ───────────────
  const valueRaw = r.value == null ? NaN : Number(r.value);
  if (Number.isFinite(valueRaw)) {
    const points = clampFinite(valueRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);
    return {
      points, pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total, correct, totalValid: false, domain,
      ambiguous: false, source: "value-field",
    };
  }

  return {
    points: domain.min, pct: 0, ratio: 0,
    total, correct, totalValid: false, domain,
    ambiguous: false, source: "missing",
  };
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
      return Number(trimmed);
    }
    return Number(val);
  };

  if (typeof row === "number") {
    score = row;
  } else if (row.score != null) {
    score = parseNum(row.score);
    if (row.isPercentage && Number.isFinite(score)) {
      score = safeMin + (score / 100) * range;
    }
  } else if (row.value != null && row.value !== '') {
    score = parseNum(row.value);
    if (row.isPercentage && Number.isFinite(score)) {
      score = safeMin + (score / 100) * range;
    }
  } else if (row.correct != null && row.total != null) {
    const total = Number(row.total);
    const correct = Number(row.correct);
    // ✅ FIX: proteger contra total=0 → divisão por zero
    if (Number.isFinite(total) && total > 0 && Number.isFinite(correct)) {
      score = safeMin + (Math.max(0, Math.min(total, correct)) / total) * range;
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
 * Atualização segura de resultado de questões.
 * Nunca deixa correct > total.
 */
export function mergeQuestionResult(row, delta, maxScore, minScore = 0) {
  const domain = safeDomain(maxScore, minScore);
  const r = row && typeof row === "object" ? row : {};

  const addedTotal = Math.max(0, Math.trunc(Number(delta?.total) || 0));
  const addedCorrect = Math.min(
    addedTotal,
    Math.max(0, Math.trunc(Number(delta?.correct) || 0))
  );

  const oldTotal = Math.max(0, Math.trunc(Number(r.total) || 0));
  const oldCorrect = Math.min(oldTotal, Math.max(0, Math.trunc(Number(r.correct) || 0)));

  // ✅ BUG-12 FIX: Incremental merge to prevent runaway correct answers over multiple saves
  const newTotal = Math.max(oldTotal, addedTotal);
  const newCorrect = Math.min(newTotal, Math.max(oldCorrect, addedCorrect));

  const ratio = newTotal > 0 ? newCorrect / newTotal : 0;
  const points = domain.min + ratio * domain.range;

  return {
    ...r,
    correct: newCorrect,
    total: newTotal,
    scorePoints: points,
    scorePct: ratio * 100,
    score: points,
    scoreUnit: "points",
    isPercentage: false,
    timeSpent: Math.max(
      0,
      (Number(r.timeSpent) || 0) + Math.max(0, Number(delta?.timeSpentSecs) || 0)
    )
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

  safeArray(simulados).forEach((s, idx) => {
    const norm = normalizeScoreValue(s, maxScore, minScore);

    const subjectKey = normalizeSubjectKey(
      s?.subject || s?.categoryId || s?.categoryName || s?.materia || "geral"
    );

    const dateKey = getDateKey(s?.date || s?.createdAt) || "sem-data";

    const key = [
      s?.id || `sim-no-id-${idx}`,
      subjectKey,
      dateKey,
      norm.points.toFixed(2)
    ].join("|");

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
  const minScore = clampFinite(contest.minScore, 0, maxScore, 0);

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

  if (next.categories) {
    next.categories = mapCollection(next.categories, (cat) => {
      if (!cat || typeof cat !== "object") return cat;

      const catMax = sanitizeMaxScore(cat.maxScore ?? maxScore);
      const catMin = clampFinite(cat.minScore ?? minScore, 0, catMax, minScore);

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

      return nextCat;
    });
  }

  return next;
}

