import { getDateKey } from './dateHelper.js';

export function getMondayKey(rawKey = '') {
  const dateKey = getDateKey(rawKey);
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return `sem-${rawKey || 'na'}`;
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return `sem-${rawKey || 'na'}`;
  const day = dt.getUTCDay();
  const diff = dt.getUTCDate() - day + (day === 0 ? -6 : 1);
  dt.setUTCDate(diff);
  const my = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const md = String(dt.getUTCDate()).padStart(2, '0');
  return `${my}-${mm}-${md}`;
}

export function aggregateHeatmap(filtered, granularity = 'daily', _maxScore = 100) {
  if (granularity === 'daily') return filtered;
  const buckets = new Map();
  (filtered?.dates || []).forEach((d, index) => {
    const rawKey = typeof d === 'string' ? d : d?.key;
    const normKey = getDateKey(rawKey) || (rawKey ? String(rawKey) : '');
    const key = granularity === 'monthly'
      ? (normKey && /^\d{4}-\d{2}-\d{2}$/.test(normKey) ? normKey.slice(0, 7) : `mes-${rawKey || index}`)
      : getMondayKey(normKey || rawKey);
    const fallbackLabel = normKey && /^\d{4}-\d{2}-\d{2}$/.test(normKey)
      ? `${normKey.slice(8, 10)}/${normKey.slice(5, 7)}`
      : (rawKey ? String(rawKey) : '');
    const label = (typeof d === 'object' && d?.label) ? d.label : fallbackLabel;
    if (!buckets.has(key)) buckets.set(key, { key, indices: [], label });
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
      const hasSyntheticMeta = samples.some(
        c => c && typeof c === 'object' && ('realTotal' in c || 'realCorrect' in c || 'isSynthetic' in c)
      );
      const realTotal = samples.reduce((a, c) => {
        const hasReal = c && typeof c === 'object' && c.realTotal !== undefined;
        let val = hasReal ? c.realTotal : (c?.isSynthetic ? 0 : c?.total);
        if (typeof val === 'string') val = val.replace(',', '.');
        return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      const realCorrect = samples.reduce((a, c) => {
        const hasReal = c && typeof c === 'object' && c.realCorrect !== undefined;
        let val = hasReal ? c.realCorrect : (c?.isSynthetic ? 0 : c?.correct);
        if (typeof val === 'string') val = val.replace(',', '.');
        return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      const allSynthetic = samples.every(c => c?.isSynthetic === true);
      const anySynthetic = samples.some(c => c?.isSynthetic === true);
      const hasRealVolume = realTotal > 0;
      const isSynthetic = allSynthetic || (!hasRealVolume && anySynthetic && total > 0);
      const hasMixedSynthetic = hasRealVolume && anySynthetic && total > realTotal;
      // ✅ FIX: pct combina volume real + sintético (coerente com modo Diário, timeline e insightGenerator)
      const pct = total > 0
        ? Math.max(0, Math.min(100, Number.isFinite(correct / total) ? (correct / total) * 100 : 0))
        : null;
      const baseCell = {
        total,
        correct,
        pct,
      };
      if (hasSyntheticMeta) {
        const activeDays = samples.filter(c => Number(c?.total) > 0 && c?.pct !== null).length;
        return {
          ...baseCell,
          realTotal,
          realCorrect,
          isSynthetic,
          hasMixedSynthetic,
          activeDays,
        };
      }
      return baseCell;
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

  const parseSafeNonNeg = (raw) => {
    if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return 0;
    const normalized = typeof raw === 'string' ? raw.trim().replace(',', '.') : raw;
    const num = Number(normalized);
    return Number.isFinite(num) ? Math.max(0, num) : 0;
  };

  let totalAcertos = 0;
  let totalQuestoes = 0;
  safeSubtopics.forEach(topic => {
    if (!topic) return;
    const total = parseSafeNonNeg(topic.total ?? topic.questoes ?? 0);
    const rawHits = parseSafeNonNeg(topic.acertos ?? topic.hits ?? topic.correct ?? 0);
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

