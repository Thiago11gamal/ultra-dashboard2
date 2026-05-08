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
      const total = samples.reduce((a, c) => a + (Number(c.total) || 0), 0);
      const correct = samples.reduce((a, c) => a + (Number(c.correct) || 0), 0);
      // BUG-GLOBAL-02 FIX: pct deve ser percentual [0,100], não score em [0, maxScore].
      // Antes: (correct/total) * maxScore → para maxScore=120, 8/10 → 96 (errado).
      // Agora: (correct/total) * 100 → 8/10 → 80% (correto, invariante à escala).
      const pct = total > 0 ? (correct / total) * 100 : null;
      return { total, correct, pct };
    })
  }));

  return { dates, rows };
}
