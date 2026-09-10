import { useMemo } from 'react';
import { computeCategoryStats } from '../engine';
import { getSafeScore } from '../utils/scoreHelper';
import { toDateMs } from '../utils/dateHelper';

/**
 * Nível atual de cada disciplina segundo o engine ativo.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useCategoryLevels(categories, timeline, activeEngine, maxScore = 100, minScore = 0) {
  return useMemo(() => {
    if (!Array.isArray(categories)) return {};
    const map = {};
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const lastPoint = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    categories.forEach(cat => {
      const prefix = activeEngine === 'raw' ? 'raw_' : activeEngine === 'stats' ? 'stats_' : 'bay_';
      const fromTimeline = lastPoint?.[`${prefix}${cat.id}`];
      if (fromTimeline != null && Number.isFinite(Number(fromTimeline))) {
        map[cat.id] = Number(fromTimeline);
        return;
      }

      // Se for o motor de nota bruta e a disciplina não teve simulado no último dia geral,
      // busca o último score bruto registrado na timeline
      if (activeEngine === 'raw' && Array.isArray(timeline)) {
        for (let i = timeline.length - 1; i >= 0; i--) {
          const pt = timeline[i]?.[`raw_${cat.id}`];
          if (pt != null && Number.isFinite(Number(pt))) {
            map[cat.id] = Number(pt);
            return;
          }
        }
      }

      const historyRaw = cat.simuladoStats?.history;
      const history = historyRaw ? (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw)) : [];
      const weight = Number(cat.weight) > 0 ? Number(cat.weight) : 10;
      const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
      const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMin;

      // Fallback para o histórico da disciplina caso não esteja na timeline
      if (activeEngine === 'raw' && history.length > 0) {
        let latestEntry = null;
        let latestMs = -Infinity;
        for (let i = 0; i < history.length; i++) {
          const h = history[i];
          const ms = toDateMs(h?.date || h?.createdAt) || 0;
          if (ms >= latestMs) {
            latestMs = ms;
            latestEntry = h;
          }
        }
        if (latestEntry) {
          const s = getSafeScore(latestEntry, catMax, catMin);
          if (Number.isFinite(s)) {
            map[cat.id] = s;
            return;
          }
        }
      }

      const stats = computeCategoryStats(history || [], weight, 60, catMax, catMin);
      map[cat.id] = (stats?.mean != null && Number.isFinite(stats.mean)) ? stats.mean : catMin;
    });
    return map;
  }, [categories, timeline, activeEngine, maxScore, minScore]);
}

