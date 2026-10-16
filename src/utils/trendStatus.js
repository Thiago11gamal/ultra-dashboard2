import { formatValue } from './scoreHelper';

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export function computeTrendStatus(levelSeries, { formatValue: fmtVal = formatValue, unit = '%', scale = 1 } = {}) {
  const base = { id: 'trend', label: 'Tendência' };
  if (!Array.isArray(levelSeries) || levelSeries.length < 2) {
    // FIX-TREND-02: antes o card sumia do grid com <2 pontos (parecia bug).
    return {
      ...base,
      value: '—',
      tone: 'neutral',
      icon: '➡️',
      help: 'Cadastre ao menos 2 registros para calcular a tendência.'
    };
  }
  const enough = levelSeries.length >= 6;
  const diff = enough
    ? average(levelSeries.slice(-3)) - average(levelSeries.slice(-6, -3))
    : levelSeries[levelSeries.length - 1] - levelSeries[0];
  if (!Number.isFinite(diff)) {
    return { ...base, value: '—', tone: 'neutral', icon: '➡️', help: 'Dados insuficientes.' };
  }
  const up = diff > 1 * scale;
  const down = diff < -1 * scale;
  return {
    ...base,
    value: `${diff >= 0 ? '+' : ''}${fmtVal(diff)}${unit}`,
    tone: up ? 'progress' : down ? 'danger' : 'neutral',
    icon: up ? '📈' : down ? '📉' : '➡️',
    help: enough
      ? 'Comparação média dos últimos 3 registros contra os 3 anteriores.'
      : 'Poucos registros: comparando o primeiro com o último.',
  };
}
