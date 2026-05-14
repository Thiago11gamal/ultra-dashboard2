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

  // BUG-02 FIX: Substituímos o cálculo de Médias Simples por T-EMA (Time-Weighted Moving Average).
  // Resolve a distorção temporal onde semanas antigas pesavam igual às recentes.
  // Fórmula: α = 1 - (1 - α_base)^Δt
  const calculateEMA = (windowData, alphaBase = 0.3) => {
    if (!windowData.length) return null;
    
    let ema = null;
    let lastTime = null;

    windowData.forEach((week) => {
      const currentTime = new Date(week.week + 'T12:00:00').getTime();
      const deltaT = lastTime ? Math.max(1, (currentTime - lastTime) / 86400000) : 1;
      
      const alpha = 1 - Math.pow(1 - alphaBase, deltaT);
      const safeAlpha = Math.min(0.9, alpha);

      let weekSum = 0;
      let weekVol = 0;

      visibleKeys.forEach(key => {
        const meta = week[`meta_${key}`];
        if (meta && meta.currTot > 0 && Number.isFinite(Number(week[key]))) {
          weekSum += (Number(week[key]) * meta.currTot);
          weekVol += meta.currTot;
        }
      });

      if (weekVol > 0) {
        const weekAvg = weekSum / weekVol;
        if (ema === null) {
          ema = weekAvg;
        } else {
          ema = (weekAvg * safeAlpha) + (ema * (1 - safeAlpha));
        }
      }
      lastTime = currentTime;
    });

    return ema;
  };

  const recentAvg = calculateEMA(recentWindow);
  const previousAvg = calculateEMA(previousWindow);

  if (recentAvg === null || previousAvg === null) return null;

  return {
    recentAvg,
    previousAvg,
    delta: recentAvg - previousAvg,
    recentN: recentWindow.length,
    previousN: previousWindow.length,
  };
}
