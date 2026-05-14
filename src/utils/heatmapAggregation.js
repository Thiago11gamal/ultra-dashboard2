export function getMondayKey(rawKey = '') {
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(rawKey) ? new Date(`${rawKey}T12:00:00`) : new Date(rawKey);
  if (Number.isNaN(dt.getTime())) return `sem-${rawKey || 'na'}`;
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function aggregateHeatmap(filtered, granularity = 'daily', _maxScore = 100) {
  if (granularity === 'daily') return filtered;
  const buckets = new Map();
  (filtered?.dates || []).forEach((d, index) => {
    const key = granularity === 'monthly' ? String(d.key || '').slice(0, 7) : getMondayKey(d.key);
    if (!buckets.has(key)) buckets.set(key, { key, indices: [], label: d.label });
    buckets.get(key).indices.push(index);
  });

  const dates = [...buckets.values()].map((b, i) => ({
    key: b.key,
    label: granularity === 'monthly' ? b.key : b.label,
    dayName: granularity === 'monthly' ? 'MÊS' : `Sem ${i + 1}`,
    count: b.indices.length,
    isWeekend: false,
  }));

  const rows = (filtered?.rows || []).map((row) => ({
    ...row,
    cells: [...buckets.values()].map(({ indices }) => {
      const samples = indices.map(i => row.cells?.[i]).filter(Boolean);
      if (!samples.length) return null;
      // CORREÇÃO: Normalizar strings de dados legados com vírgulas ANTES de tentar somar
      const total = samples.reduce((a, c) => {
          let val = c.total;
          if (typeof val === 'string') val = val.replace(',', '.');
          return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      
      const correct = samples.reduce((a, c) => {
          let val = c.correct;
          if (typeof val === 'string') val = val.replace(',', '.');
          return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      // BUG-GLOBAL-02 FIX: pct deve ser percentual [0,100], não score em [0, maxScore].
      // Antes: (correct/total) * maxScore → para maxScore=120, 8/10 → 96 (errado).
      // Agora: (correct/total) * 100 → 8/10 → 80% (correto, invariante à escala).
      const pct = total > 0 ? (correct / total) * 100 : null;
      return { total, correct, pct };
    })
  }));

  return { dates, rows };
}

/**
 * Agrega a proficiência de uma matéria pai a partir de seus subtópicos.
 * Resolve o Paradoxo de Simpson agregando numeradores e denominadores 
 * antes da divisão final, e aplica Shrinkage Bayesiano (K=5).
 */
export const calculateSubjectMastery = (subtopics) => {
    if (!subtopics || subtopics.length === 0) return 0;

    let totalAcertosPonderados = 0;
    let totalQuestoesPonderadas = 0;
    let baseIgnorancia = 0; // Para Tópicos não estudados

    subtopics.forEach(topic => {
        // Usa o K Bayesiano para não deixar tópicos com 1 questão dominarem
        const K = 5; 
        const pesoRelevancia = topic.pesoEdital || 1;

        // Se nunca estudou, injetamos um peso negativo invisível
        if (topic.total === 0) {
            baseIgnorancia += (K * pesoRelevancia * 0.25); // Chute
            totalQuestoesPonderadas += (K * pesoRelevancia);
        } else {
            totalAcertosPonderados += (topic.acertos + K * 0.5) * pesoRelevancia;
            totalQuestoesPonderadas += (topic.total + K) * pesoRelevancia;
        }
    });

    return (totalAcertosPonderados + baseIgnorancia) / Math.max(1, totalQuestoesPonderadas);
};
