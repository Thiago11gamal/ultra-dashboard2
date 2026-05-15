export const SCENARIO_CONFIG = {
  // BUG-5 FIX: meanBiasFactor é percentual da escala (0.025 = 2.5% do maxScore)
  // Antes era absoluto (±2.5 pts), distorcendo provas fora da escala 0-100.
  conservative: { meanBiasFactor: -0.015, ciMult: 1.5, probMultFactor: 0.045 },
  base: { meanBiasFactor: 0, ciMult: 1, probMultFactor: 0 },
  optimistic: { meanBiasFactor: 0.025, ciMult: 0.85, probMultFactor: 0.045 },
};

export function applyScenarioAdjustments(data = [], scenario = 'base', maxScore = 100, minScore = 0) {
  const cfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const lowerBound = Math.min(safeMinScore, safeMaxScore);
  const upperBound = Math.max(safeMinScore, safeMaxScore);
  // BUG-5 FIX: Bias proporcional à escala da prova
  const meanBias = (cfg.meanBiasFactor || 0) * safeMaxScore;
  // BUG-GLOBAL-09 FIX: Ajuste de probabilidade deve ser baseado em 100 (%), não no maxScore.
  // Antes: 0.045 * 200 = 9pp (errado). Agora: 0.045 * 100 = 4.5pp (correto).
  const probMult = (cfg.probMultFactor || 0) * 100;
  return (data || []).map((d) => {
    const mean = Math.max(lowerBound, Math.min(upperBound, (Number(d.mean) || 0) + meanBias));
    const low = Math.max(lowerBound, Math.min(upperBound, mean - ((mean - (d?.ciRange?.[0] ?? mean)) * cfg.ciMult)));
    const high = Math.max(lowerBound, Math.min(upperBound, mean + (((d?.ciRange?.[1] ?? mean) - mean) * cfg.ciMult)));
    const probBase = Number.isFinite(Number(d?.probability)) ? Number(d.probability) : 0;
    const probAdj = Math.max(0, Math.min(100, probBase + (meanBias > 0 ? probMult : meanBias < 0 ? -probMult : 0)));
    return { ...d, mean, probability: probAdj, ciRange: [Math.min(low, high), Math.max(low, high)] };
  });
}

export function classifyScenarioSignal(data = [], maxScore = 100) {
  if (!data.length) return null;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const latest = data[data.length - 1];
  const high = Number(latest?.ciRange?.[1]);
  const low = Number(latest?.ciRange?.[0]);
  const width = Number.isFinite(high) && Number.isFinite(low) ? Math.max(0, high - low) : Number.POSITIVE_INFINITY;

  if (data.length < 4 || width >= Math.max(12, safeMaxScore * 0.18)) {
    return { label: 'Sinal Fraco', color: 'text-amber-300 border-amber-500/40 bg-amber-500/10' };
  }
  if (width <= Math.max(6, safeMaxScore * 0.1) && data.length >= 8) {
    return { label: 'Sinal Forte', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' };
  }
  return { label: 'Sinal Médio', color: 'text-sky-300 border-sky-500/40 bg-sky-500/10' };
}
