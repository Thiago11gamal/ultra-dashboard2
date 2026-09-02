import { formatValue } from './scoreHelper';

const safeNum = (value, fallback = null) => {
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

  const variance = average(values.map((v) => (v - mean) ** 2));
  return Number.isFinite(variance) ? Math.sqrt(variance) : null;
};

export function computeEvolutionStatuses({
  timeline = [],
  categories = [],
  focusCategory = null,
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

  const last = Array.isArray(timeline) && timeline.length > 0
    ? timeline[timeline.length - 1]
    : {};

  const focusId = focusCategory?.id;

  const currentBay = focusId ? safeNum(last[`bay_${focusId}`], null) : null;
  const currentRaw = focusId ? safeNum(last[`raw_${focusId}`], null) : null;
  const currentStats = focusId ? safeNum(last[`stats_${focusId}`], null) : null;
  const current = currentBay ?? currentRaw ?? currentStats;

  const getValueSeries = (prefix) => {
    if (!focusId || !Array.isArray(timeline)) return [];

    return timeline
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
        : current >= safeTarget
          ? 'success'
          : current >= safeTarget - 8 * scale
            ? 'warning'
            : 'danger',
    icon: '📍',
    help: `Nível atual estimado na escala da prova. Meta: ${fmt(safeTarget)}.`
  });

  // Gap até a meta
  if (current != null) {
    const gap = current - safeTarget;

    statuses.push({
      id: 'gap',
      label: 'Distância da meta',
      value: `${gap >= 0 ? '+' : ''}${formatValue(gap)}${unit}`,
      tone: gap >= 0 ? 'success' : gap >= -5 * scale ? 'warning' : 'danger',
      icon: '🎯',
      help: 'Diferença entre o nível atual e a meta configurada.'
    });
  }

  // Tendência recente
  if (levelSeries.length >= 6) {
    const recent = average(levelSeries.slice(-3));
    const prev = average(levelSeries.slice(-6, -3));

    if (Number.isFinite(recent) && Number.isFinite(prev)) {
      const diff = recent - prev;

      statuses.push({
        id: 'trend',
        label: 'Tendência',
        value: `${diff >= 0 ? '+' : ''}${formatValue(diff)}${unit}`,
        tone: diff > 1 * scale ? 'progress' : diff < -1 * scale ? 'danger' : 'neutral',
        icon: diff > 1 * scale ? '📈' : diff < -1 * scale ? '📉' : '➡️',
        help: 'Comparação média dos últimos 3 registros contra os 3 anteriores.'
      });
    }
  } else if (levelSeries.length >= 2) {
    const first = levelSeries[0];
    const lastValue = levelSeries[levelSeries.length - 1];
    const diff = lastValue - first;

    statuses.push({
      id: 'trend',
      label: 'Tendência',
      value: `${diff >= 0 ? '+' : ''}${formatValue(diff)}${unit}`,
      tone: diff > 1 * scale ? 'progress' : diff < -1 * scale ? 'danger' : 'neutral',
      icon: diff > 1 * scale ? '📈' : diff < -1 * scale ? '📉' : '➡️',
      help: 'Comparação entre o primeiro e o último ponto disponível.'
    });
  }

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
  const heatmapDates = Array.isArray(heatmapData?.dates) ? heatmapData.dates : [];
  const heatmapRows = Array.isArray(heatmapData?.rows) ? heatmapData.rows : [];

  if (heatmapDates.length > 0) {
    const startIndex = Math.max(0, heatmapDates.length - 14);
    const lastDays = heatmapDates.slice(startIndex);

    const activeDays = lastDays.filter((_, idx) => {
      const realIdx = startIndex + idx;
      return heatmapRows.some((row) => Array.isArray(row?.cells) && row.cells[realIdx]);
    }).length;

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
          volatility <= 5 * scale
            ? 'success'
            : volatility <= 12 * scale
              ? 'warning'
              : 'danger',
        icon: '📊',
        help: 'Variação dos últimos resultados brutos. Quanto menor, mais estável.'
      });
    }
  }

  // Incerteza bayesiana
  if (focusId) {
    const ciLow = safeNum(last[`bay_ci_low_${focusId}`], null);
    const ciHigh = safeNum(last[`bay_ci_high_${focusId}`], null);

    if (ciLow != null && ciHigh != null) {
      const width = Math.abs(ciHigh - ciLow);

      statuses.push({
        id: 'uncertainty',
        label: 'Incerteza bayesiana',
        value: `±${formatValue(width / 2)}${unit}`,
        tone:
          width <= 8 * scale
            ? 'success'
            : width <= 20 * scale
              ? 'warning'
              : 'danger',
        icon: '🧠',
        help: 'Faixa de confiança do nível estimado. Quanto mais estreita, maior a certeza.'
      });
    }
  }

  // Matérias abaixo da meta
  if (Array.isArray(categories) && categories.length > 0) {
    const below = categories.filter((cat) => {
      const lvl = safeNum(
        last?.[`bay_${cat.id}`] ?? last?.[`raw_${cat.id}`],
        null
      );

      return lvl != null && lvl < safeTarget - 5 * scale;
    }).length;

    statuses.push({
      id: 'subjects',
      label: 'Matérias abaixo da meta',
      value: `${below}/${categories.length}`,
      tone: below === 0 ? 'success' : below <= 2 ? 'warning' : 'danger',
      icon: '📚',
      help: 'Matérias com nível atual abaixo da zona segura da meta.'
    });
  }

  // Volume recente
  const recentVolume = Array.isArray(timeline)
    ? timeline.slice(-7).reduce((sum, d) => sum + safeNum(d?.global_total, 0), 0)
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
    const trendStatus = String(last?.[`trend_status_${focusId}`] || '').toLowerCase();

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
