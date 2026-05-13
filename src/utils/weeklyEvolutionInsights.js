export function computeTopRegressions({ viewMode, chartData = [], keys = [], activeKeys = {}, hiddenKeys = {} }) {
  if (viewMode !== 'variation' || !Array.isArray(chartData) || chartData.length === 0) return [];
  const latestWeekWithDelta = [...chartData].reverse().find(point =>
    keys.some(key => Number.isFinite(Number(point?.[`delta_${key}`])))
  );
  if (!latestWeekWithDelta) return [];

  return keys
    .map((key) => {
      const delta = latestWeekWithDelta[`delta_${key}`];
      if (!Number.isFinite(Number(delta)) || Number(delta) >= 0 || hiddenKeys[key]) return null;
      return {
        key,
        name: activeKeys[key]?.name || key,
        fullName: activeKeys[key]?.fullName || activeKeys[key]?.name || key,
        delta: Number(delta),
        color: activeKeys[key]?.color || '#ef4444',
        week: latestWeekWithDelta.displayDate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);
}

export function computeTrendKpi({ chartData = [], keys = [], hiddenKeys = {} }) {
  if (!Array.isArray(chartData) || chartData.length < 2) return null;
  const visibleKeys = keys.filter((key) => !hiddenKeys[key]);
  if (visibleKeys.length === 0) return null;

  const recentWindow = chartData.slice(-4);
  const previousWindow = chartData.slice(-8, -4);
  if (!previousWindow.length) return null;

  // 🎯 FIX: Cálculo de média ponderada pelo volume real de questões da semana
  const calculateWeightedAvg = (windowData) => {
    let totalWeightedScore = 0;
    let totalVolume = 0;

    windowData.forEach(week => {
      visibleKeys.forEach(key => {
        const meta = week[`meta_${key}`];
        // Verifica se há volume e se o valor é válido numéricamente
        if (meta && meta.currTot > 0 && Number.isFinite(Number(week[key]))) {
          totalWeightedScore += (Number(week[key]) * meta.currTot);
          totalVolume += meta.currTot;
        }
      });
    });

    return totalVolume > 0 ? (totalWeightedScore / totalVolume) : null;
  };

  const recentAvg = calculateWeightedAvg(recentWindow);
  const previousAvg = calculateWeightedAvg(previousWindow);

  if (recentAvg === null || previousAvg === null) return null;

  return {
    recentAvg,
    previousAvg,
    delta: recentAvg - previousAvg,
    recentN: recentWindow.length,
    previousN: previousWindow.length,
  };
}
