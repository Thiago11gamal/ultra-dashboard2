import { useMemo } from 'react';
import { computeCategoryStats } from '../engine';

/**
 * Nível atual de cada disciplina segundo o engine ativo.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useCategoryLevels(categories, timeline, activeEngine, maxScore = 100, minScore = 0) {
  return useMemo(() => {
    const map = {};
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const lastPoint = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    categories.forEach(cat => {
      const prefix = activeEngine === 'raw' ? 'raw_' : activeEngine === 'stats' ? 'stats_' : 'bay_';
      const fromTimeline = lastPoint?.[`${prefix}${cat.id}`];
      if (fromTimeline != null) {
        map[cat.id] = fromTimeline;
        return;
      }
      const historyRaw = cat.simuladoStats?.history;
      const history = historyRaw ? (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw)) : [];
      if (!history.length) { map[cat.id] = safeMin; return; }
      const stats = computeCategoryStats(history, 100, 60, maxScore);
      map[cat.id] = stats?.mean ?? safeMin;
    });
    return map;
  }, [categories, timeline, activeEngine, maxScore, minScore]);
}
