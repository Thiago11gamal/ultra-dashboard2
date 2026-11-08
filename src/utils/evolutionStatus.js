import { formatValue } from './scoreHelper';
import { getDateKey } from './dateHelper';
import { computeTrendStatus } from './trendStatus';

export { computeTrendStatus };

const safeNum = (value, fallback = null) => {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') {
    return fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

const stdDev = (values) => {
  if (!Array.isArray(values) || values.length < 2) return null;

  const mean = average(values);
  if (!Number.isFinite(mean)) return null;

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Number.isFinite(variance) ? Math.sqrt(variance) : null;
};

export function computeEvolutionStatuses({
  timeline = [],
  filteredChartData = null,
  categories = [],
  focusCategory = null,
  showOnlyFocus = false,
  targetScore = 0,
  unit = '%',
  minScore = 0,
  maxScore = 100,
  activeMcResult = null,
  subjectAggData = [],
  heatmapData = {},
  projectDays = 30
}) {
  const statuses = [];

  const safeMin = safeNum(minScore, 0);
  const safeMax = Math.max(safeMin + 1, safeNum(maxScore, 100));
  const range = safeMax - safeMin;
  const scale = range / 100;
  const safeTarget = Math.max(safeMin, Math.min(safeMax, safeNum(targetScore, safeMin)));

  const fmt = (v) => `${formatValue(v)}${unit}`;

  const effectiveTimeline =
    Array.isArray(filteredChartData) && filteredChartData.length > 0
      ? filteredChartData
      : (Array.isArray(timeline) ? timeline : []);

  const last = effectiveTimeline.length > 0
    ? effectiveTimeline[effectiveTimeline.length - 1]
    : {};

  const focusId = focusCategory?.id;
  const focusMin = focusId ? safeNum(focusCategory?.minScore, safeMin) : safeMin;
  const focusMax = focusId ? Math.max(focusMin + 1, safeNum(focusCategory?.maxScore, safeMax)) : safeMax;
  const focusRange = focusMax - focusMin;
  const focusScale = focusRange / 100;
  const globalTargetRatio = range > 0 ? (safeTarget - safeMin) / range : 0.8;
  const focusTarget = focusId
    ? (safeNum(focusCategory?.minCutoff, null) ??
       (focusMax === safeMax && focusMin === safeMin ? safeTarget : focusMin + globalTargetRatio * focusRange))
    : safeTarget;

  const getLastValidFrom = (series, key) => {
    if (!Array.isArray(series) || series.length === 0) return null;
    for (let i = series.length - 1; i >= 0; i--) {
      const val = safeNum(series[i]?.[key], null);
      if (val != null) return val;
    }
    return null;
  };

  const currentBay = focusId ? getLastValidFrom(effectiveTimeline, `bay_${focusId}`) : null;
  const currentRaw = focusId ? getLastValidFrom(effectiveTimeline, `raw_${focusId}`) : null;
  const currentStats = focusId ? getLastValidFrom(effectiveTimeline, `stats_${focusId}`) : null;
  const current = currentBay ?? currentRaw ?? currentStats;

  const getValueSeries = (prefix) => {
    if (!focusId || !Array.isArray(effectiveTimeline)) return [];

    return effectiveTimeline
      .map((d) => safeNum(d?.[`${prefix}${focusId}`], NaN))
      .filter((v) => Number.isFinite(v));
  };

  const baySeries = getValueSeries('bay_');
  const rawSeries = getValueSeries('raw_');
  const levelSeries = baySeries.length >= rawSeries.length ? baySeries : rawSeries;

  // Nível atual
  statuses.push({
    id: 'current',
    label: 'Nível atual',
    value: current == null ? '—' : fmt(current),
    tone:
      current == null
        ? 'neutral'
        : current >= focusTarget
          ? 'success'
          : current >= focusTarget - 8 * focusScale
            ? 'warning'
            : 'danger',
    icon: '📍',
    help: `Nível atual estimado na escala da prova. Meta: ${fmt(focusTarget)}.`
  });

  // Gap até a meta
  if (current != null) {
    const gap = current - focusTarget;

    statuses.push({
      id: 'gap',
      label: 'Distância da meta',
      value: `${gap >= 0 ? '+' : ''}${formatValue(gap)}${unit}`,
      tone: gap >= 0 ? 'success' : gap >= -5 * focusScale ? 'warning' : 'danger',
      icon: '🎯',
      help: 'Diferença entre o nível atual e a meta configurada.'
    });
  }

  // REFACTOR-TREND-01: usar computeTrendStatus centralizado
  statuses.push(computeTrendStatus(levelSeries, { formatValue, unit, scale: focusScale }));

  // Probabilidade Monte Carlo
  const probability = safeNum(activeMcResult?.probability, null);

  if (probability != null) {
    const p = Math.max(0, Math.min(100, probability));

    statuses.push({
      id: 'probability',
      label: 'Chance de aprovação',
      value: `${p.toFixed(0)}%`,
      tone: p >= 70 ? 'success' : p >= 45 ? 'warning' : 'danger',
      icon: '🚀',
      help: 'Probabilidade projetada pelo Monte Carlo de atingir a meta.'
    });
  }

  // Constância nos últimos 14 dias
  const rawHeatmapDates = Array.isArray(heatmapData?.dates) ? heatmapData.dates : [];
  const heatmapRows = Array.isArray(heatmapData?.rows) ? heatmapData.rows : [];
  const focusRow = (showOnlyFocus && focusId)
    ? heatmapRows.find((r) => r?.cat?.id === focusId)
    : null;
  const heatmapDates = rawHeatmapDates
    .map((d, idx) => {
      if (focusRow && !focusRow.cells?.[idx]) return null;
      return typeof d === 'string' ? d : d?.key || getDateKey(d);
    })
    .filter(Boolean);
  const timelineDatesForConst = Array.isArray(timeline)
    ? timeline
        .filter((d) => {
          if (!d?.date) return false;
          if (showOnlyFocus && focusId) {
            return d[`raw_${focusId}`] != null || safeNum(d[`raw_total_${focusId}`], 0) > 0;
          }
          return true;
        })
        .map((d) => d.date)
    : [];
  const allActiveDates = new Set([
    ...heatmapDates,
    ...timelineDatesForConst
  ]);

  if (allActiveDates.size > 0 || (showOnlyFocus && focusId && (rawHeatmapDates.length > 0 || timeline.length > 0))) {
    const todayForConst = new Date();
    todayForConst.setHours(12, 0, 0, 0);
    let activeDays = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(todayForConst);
      d.setDate(d.getDate() - i);
      const k = getDateKey(d);
      if (allActiveDates.has(k)) {
        activeDays++;
      }
    }

    statuses.push({
      id: 'consistency',
      label: 'Constância (14 dias)',
      value: `${activeDays}/14`,
      tone: activeDays >= 8 ? 'success' : activeDays >= 4 ? 'warning' : 'danger',
      icon: '📅',
      help: 'Dias com simulado cadastrado nos últimos 14 dias.'
    });
  }

  // Volatilidade dos resultados brutos
  const recentRaw = rawSeries.slice(-5);

  if (recentRaw.length >= 3) {
    const volatility = stdDev(recentRaw);

    if (Number.isFinite(volatility)) {
      statuses.push({
        id: 'volatility',
        label: 'Volatilidade',
        value: `σ ${formatValue(volatility)}`,
        tone:
          volatility <= 5 * focusScale
            ? 'success'
            : volatility <= 12 * focusScale
              ? 'warning'
              : 'danger',
        icon: '📊',
        help: 'Variação dos últimos resultados brutos. Quanto menor, mais estável.'
      });
    }
  }

  // Incerteza bayesiana
  if (focusId) {
    const ciLow = getLastValidFrom(effectiveTimeline, `bay_ci_low_${focusId}`);
    const ciHigh = getLastValidFrom(effectiveTimeline, `bay_ci_high_${focusId}`);

    if (ciLow != null && ciHigh != null) {
      const width = Math.abs(ciHigh - ciLow);

      statuses.push({
        id: 'uncertainty',
        label: 'Incerteza bayesiana',
        value: `±${formatValue(width / 2)}${unit}`,
        tone:
          width <= 8 * focusScale
            ? 'success'
            : width <= 20 * focusScale
              ? 'warning'
              : 'danger',
        icon: '🧠',
        help: 'Faixa de confiança do nível estimado. Quanto mais estreita, maior a certeza.'
      });
    }
  }

  // Matérias abaixo da meta
  if (Array.isArray(categories) && categories.length > 0) {
    let evaluatedCount = 0;
    const below = categories.filter((cat) => {
      const catMin = safeNum(cat?.minScore, safeMin);
      const catMax = Math.max(catMin + 1, safeNum(cat?.maxScore, safeMax));
      const catRange = catMax - catMin;
      const catScale = catRange / 100;

      const fromTimeline =
        getLastValidFrom(effectiveTimeline, `bay_${cat.id}`) ??
        getLastValidFrom(effectiveTimeline, `raw_${cat.id}`) ??
        getLastValidFrom(effectiveTimeline, `stats_${cat.id}`) ??
        getLastValidFrom(timeline, `bay_${cat.id}`) ??
        getLastValidFrom(timeline, `raw_${cat.id}`) ??
        getLastValidFrom(timeline, `stats_${cat.id}`);
      let lvl = fromTimeline;
      if (lvl == null) {
        const hist = Array.isArray(cat?.simuladoStats?.history)
          ? cat.simuladoStats.history
          : Object.values(cat?.simuladoStats?.history || {});
        const hasHistory = hist.some((h) => h && h.valid !== false);
        const hasBayes = safeNum(cat?.bayesianStats?.mean, null) != null;
        const avgVal = safeNum(cat?.simuladoStats?.average, null);
        const stored = hasBayes
          ? safeNum(cat.bayesianStats.mean, null)
          : (hasHistory || (avgVal != null && avgVal > 0) ? avgVal : null);
        if (stored != null && (hasHistory || hasBayes || (avgVal != null && avgVal > 0))) {
          const isLegacyPct = stored >= 0 && stored <= 100 && (stored < catMin || (catMax > 100 && catRange >= 200));
          lvl = isLegacyPct ? catMin + (stored / 100) * catRange : stored;
        }
      }

      if (lvl != null) evaluatedCount++;

      const customMinCutoff = safeNum(cat?.minCutoff, null);
      const catTarget = customMinCutoff != null
        ? customMinCutoff
        : (catMax === safeMax && catMin === safeMin
            ? safeTarget
            : catMin + globalTargetRatio * catRange);

      return lvl != null && lvl < catTarget - 5 * catScale;
    }).length;

    const totalSubjectsDenom = evaluatedCount > 0 ? evaluatedCount : categories.length;

    statuses.push({
      id: 'subjects',
      label: 'Matérias abaixo da meta',
      value: `${below}/${totalSubjectsDenom}`,
      tone: below === 0 ? 'success' : below <= 2 ? 'warning' : 'danger',
      icon: '📚',
      help: 'Matérias com nível atual abaixo da zona segura da meta.'
    });
  }

  // Volume recente (últimos 7 dias corridos)
  const todayForVol = new Date();
  todayForVol.setHours(12, 0, 0, 0);
  const sevenDayKeys = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayForVol);
    d.setDate(d.getDate() - i);
    sevenDayKeys.add(getDateKey(d));
  }

  const recentVolume = Array.isArray(timeline)
    ? timeline
        .filter((d) => d?.date && sevenDayKeys.has(d.date))
        .reduce((sum, d) => {
          const q = (showOnlyFocus && focusId && d?.[`raw_total_${focusId}`] !== undefined)
            ? safeNum(d?.[`raw_total_${focusId}`], 0)
            : safeNum(d?.global_total, 0);
          return sum + q;
        }, 0)
    : 0;

  statuses.push({
    id: 'volume',
    label: 'Volume (7 dias)',
    value: `${Math.round(recentVolume)} q`,
    tone: recentVolume > 0 ? 'success' : 'warning',
    icon: '📝',
    help: 'Questões cadastradas nos últimos 7 dias.'
  });

  // Movimento/tendência interna
  if (focusId) {
    let trendStatus = '';
    for (let i = effectiveTimeline.length - 1; i >= 0; i--) {
      const ts = String(effectiveTimeline[i]?.[`trend_status_${focusId}`] || '').toLowerCase();
      if (ts) {
        trendStatus = ts;
        break;
      }
    }

    if (trendStatus) {
      statuses.push({
        id: 'trend-status',
        label: 'Movimento',
        value:
          trendStatus === 'up'
            ? 'Subindo'
            : trendStatus === 'down'
              ? 'Caindo'
              : 'Estável',
        tone:
          trendStatus === 'up'
            ? 'success'
            : trendStatus === 'down'
              ? 'danger'
              : 'neutral',
        icon: trendStatus === 'up' ? '📈' : trendStatus === 'down' ? '📉' : '➡️',
        help: 'Tendência calculada pelo motor estatístico para a disciplina focada.'
      });
    }
  }

  // Tempo médio por questão
  const timedSubjects = Array.isArray(subjectAggData)
    ? subjectAggData.filter(
        (d) => safeNum(d?.timedQuestoes, 0) > 0 && safeNum(d?.timeSpent, 0) >= 0
      )
    : [];

  if (timedSubjects.length > 0) {
    const totalTime = timedSubjects.reduce((sum, d) => sum + safeNum(d?.timeSpent, 0), 0);
    const totalTimed = timedSubjects.reduce((sum, d) => sum + safeNum(d?.timedQuestoes, 0), 0);
    const avgSeconds = totalTimed > 0 ? totalTime / totalTimed : null;

    if (avgSeconds != null) {
      statuses.push({
        id: 'time',
        label: 'Tempo por questão',
        value: `${Math.round(avgSeconds)}s`,
        tone: avgSeconds <= 90 ? 'success' : avgSeconds <= 180 ? 'warning' : 'time',
        icon: '⏱️',
        help: 'Média de tempo gasto por questão nas disciplinas com tempo registrado.'
      });
    }
  }

  // Tempo até a prova
  const days = Math.max(0, Math.round(safeNum(projectDays, 30)));

  statuses.push({
    id: 'exam',
    label: 'Tempo até a prova',
    value: `${days} dias`,
    tone: days <= 7 ? 'critical' : days <= 30 ? 'warning' : 'info',
    icon: '⏳',
    help: 'Dias restantes até a data objetivo.'
  });

  return statuses;
}
