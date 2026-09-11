import { normalizeDate } from './dateHelper.js';

export function getMondayKey(rawKey = '') {
  const dt = normalizeDate(rawKey) || new Date(0);
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
      // ✅ FIX: Normalizar strings de dados legados com vírgulas
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
      // ✅ FIX: pct é SEMPRE percentual [0,100], invariante à escala
      const pct = total > 0 ? Math.max(0, Math.min(100, (correct / total) * 100)) : null;
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
  if (!subtopics) return 0;
  let safeSubtopics = [];
  if (Array.isArray(subtopics)) {
    safeSubtopics = subtopics;
  } else if (typeof subtopics === 'object' && subtopics.history && Array.isArray(subtopics.history)) {
    safeSubtopics = subtopics.history;
  } else if (typeof subtopics === 'object') {
    safeSubtopics = Object.values(subtopics);
  }
  if (safeSubtopics.length === 0) return 0;

  let totalAcertos = 0;
  let totalQuestoes = 0;
  safeSubtopics.forEach(topic => {
    if (!topic) return;
    const total = Math.max(0, Number(topic.total ?? topic.questoes ?? 0));
    const rawHits = Math.max(0, Number(topic.acertos ?? topic.hits ?? topic.correct ?? 0));
    const hits = Math.min(total, rawHits);
    if (Number.isFinite(hits) && Number.isFinite(total)) {
      totalAcertos += hits;
      totalQuestoes += total;
    }
  });
  if (totalQuestoes === 0) return 0;
  const K = 5;
  const prior = 0.5;
  return ((totalAcertos + K * prior) / (totalQuestoes + K)) * 100;
};

