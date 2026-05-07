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

  const weeklyAverages = chartData.map((week) => {
    const values = visibleKeys.map((key) => week?.[key]).filter((v) => Number.isFinite(Number(v))).map(Number);
    if (!values.length) return null;
    return values.reduce((acc, v) => acc + v, 0) / values.length;
  }).filter((v) => Number.isFinite(Number(v)));

  if (weeklyAverages.length < 2) return null;
  const recentWindow = weeklyAverages.slice(-4);
  const previousWindow = weeklyAverages.slice(-8, -4);
  if (!previousWindow.length) return null;

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const recentAvg = avg(recentWindow);
  const previousAvg = avg(previousWindow);
  return {
    recentAvg,
    previousAvg,
    delta: recentAvg - previousAvg,
    recentN: recentWindow.length,
    previousN: previousWindow.length,
  };
}
