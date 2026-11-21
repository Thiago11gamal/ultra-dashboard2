import { formatValue } from './scoreHelper';

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export function computeTrendStatus(
  levelSeries,
  { formatValue: fmtVal = formatValue, unit = '%', scale = 1, scopeLabel = 'Disciplina em foco' } = {}
) {
  const safeScale = Number.isFinite(Number(scale)) && Number(scale) > 0 ? Number(scale) : 1;
  const threshold = 1 * safeScale;
  const thrText = `${fmtVal(threshold)}${unit}`;
  const base = {
    id: 'trend',
    label: 'Tendência',
    scope: 'focus',
    scopeLabel,
    scaleGuide: `Azul: subiu > +${thrText} · Cinza: entre −${thrText} e +${thrText} (estável) · Vermelho: caiu > −${thrText}.`
  };

  if (!Array.isArray(levelSeries) || levelSeries.length < 2) {
    // FIX-TREND-02: antes o card sumia do grid com <2 pontos (parecia bug).
    return {
      ...base,
      value: '—',
      tone: 'neutral',
      icon: '➡️',
      statusText: 'Aguardando dados',
      howToRead: 'Mede se seu desempenho recente está subindo ou caindo. Precisa de pelo menos 2 simulados registrados.',
      actionHint: 'Cadastre mais 1 simulado nesta disciplina para liberar o cálculo de tendência.',
      help: 'Cadastre ao menos 2 registros para calcular a tendência.'
    };
  }

  const enough = levelSeries.length >= 6;
  const diff = enough
    ? average(levelSeries.slice(-3)) - average(levelSeries.slice(-6, -3))
    : levelSeries[levelSeries.length - 1] - levelSeries[0];

  if (!Number.isFinite(diff)) {
    return {
      ...base,
      value: '—',
      tone: 'neutral',
      icon: '➡️',
      statusText: 'Dados insuficientes',
      howToRead: 'Não foi possível comparar os registros recentes.',
      actionHint: 'Verifique se os simulados possuem notas válidas.',
      help: 'Dados insuficientes.'
    };
  }

  const up = diff > threshold;
  const down = diff < -threshold;
  const howToRead = enough
    ? 'Compara a média dos seus 3 últimos registros contra os 3 anteriores. Valores positivos (+) indicam ganho recente; negativos (−) indicam queda.'
    : 'Compara seu último registro contra o primeiro (com 6+ registros passa a comparar os últimos 3 vs 3 anteriores).';
  const actionHint = up
    ? 'Evolução recente positiva — mantenha a cadência e aumente gradualmente o nível das questões.'
    : down
      ? 'Queda recente detectada — revise os erros dos últimos simulados antes de avançar para temas novos.'
      : 'Desempenho lateralizado — mude o formato de revisão ou ataque subtópicos específicos para destravar o platô.';

  return {
    ...base,
    value: `${diff >= 0 ? '+' : ''}${fmtVal(diff)}${unit}`,
    tone: up ? 'progress' : down ? 'danger' : 'neutral',
    icon: up ? '📈' : down ? '📉' : '➡️',
    statusText: up ? 'Em alta' : down ? 'Em queda' : 'Estável',
    howToRead,
    actionHint,
    help: enough
      ? 'Comparação média dos últimos 3 registros contra os 3 anteriores.'
      : 'Poucos registros: comparando o primeiro com o último.',
  };
}
