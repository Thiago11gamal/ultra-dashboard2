import { useMemo } from 'react';
import { computeCategoryStats, computeBayesianLevel } from '../engine';
import { getSafeScore, getSyntheticTotal, extractTopicsTotals } from '../utils/scoreHelper';
import { toDateMs, getDateKey } from '../utils/dateHelper';

/**
 * Nível atual de cada disciplina segundo o engine ativo.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useCategoryLevels(categories, timeline, activeEngine, maxScore = 100, minScore = 0) {
  return useMemo(() => {
    if (!Array.isArray(categories)) return {};
    const map = {};
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const lastPoint = Array.isArray(timeline) && timeline.length > 0 && typeof timeline[timeline.length - 1] === 'object' ? timeline[timeline.length - 1] : null;
    categories.forEach(cat => {
      const prefix = activeEngine === 'raw' ? 'raw_' : activeEngine === 'stats' ? 'stats_' : 'bay_';
      const fromTimeline = lastPoint?.[`${prefix}${cat.id}`];
      if (fromTimeline != null && Number.isFinite(Number(fromTimeline))) {
        map[cat.id] = Number(fromTimeline);
        return;
      }

      // Busca regressiva na timeline caso o último ponto não contenha a matéria
      if (Array.isArray(timeline)) {
        for (let i = timeline.length - 1; i >= 0; i--) {
          const pt = timeline[i]?.[`${prefix}${cat.id}`];
          if (pt != null && Number.isFinite(Number(pt))) {
            map[cat.id] = Number(pt);
            return;
          }
        }
      }

      const historyRaw = cat.simuladoStats?.history;
      const history = (historyRaw ? (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw)) : [])
        .filter((h) => h && h.valid !== false);
      const weight = Number(cat.weight) > 0 ? Number(cat.weight) : 10;
      const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
      const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMin;
      const catRange = Math.max(1e-9, catMax - catMin);

      // Fallback para o histórico da disciplina caso não esteja na timeline
      if (activeEngine === 'raw' && history.length > 0) {
        let latestDayKey = null;
        let latestMs = -Infinity;
        for (let i = 0; i < history.length; i++) {
          const h = history[i];
          const rawDate = h?.date || h?.createdAt;
          const ms = toDateMs(rawDate) || 0;
            if (ms >= latestMs) {
              latestMs = ms;
              latestDayKey = getDateKey(rawDate);
            }
          }
          if (latestDayKey) {
            let dayTot = 0;
            let dayCorr = 0;
            for (let i = 0; i < history.length; i++) {
              const h = history[i];
              if (getDateKey(h?.date || h?.createdAt) !== latestDayKey) continue;
              let s = getSafeScore(h, catMax, catMin);
              let q = Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0;
              if (q <= 0 && h?.topics != null) {
                const tf = extractTopicsTotals(h, catMax, catMin);
                if (tf.total > 0) {
                  dayTot += tf.total;
                  dayCorr += tf.correct;
                  continue;
                } else if (!Number.isFinite(s) && tf.hasTopicsScore) {
                  s = tf.score;
                }
              }
              if (!Number.isFinite(s)) continue;
              if (q <= 0) q = getSyntheticTotal(catMax);
              dayTot += q;
              dayCorr += Math.max(0, Math.min(1, (s - catMin) / catRange)) * q;
            }
            if (dayTot > 0) {
              map[cat.id] = catMin + (dayCorr / dayTot) * catRange;
              return;
            }
          }
        }

        if (activeEngine !== 'raw' && activeEngine !== 'stats' && history.length > 0) {
          const bay = computeBayesianLevel(history, 1, 1, catMax, { minScore: catMin });
          if (bay?.mean != null && Number.isFinite(bay.mean)) {
            map[cat.id] = bay.mean;
            return;
          }
        }

        const stats = computeCategoryStats(history || [], weight, 60, catMax, catMin);
        map[cat.id] = (stats?.mean != null && Number.isFinite(stats.mean)) ? stats.mean : catMin;
      });
    return map;
  }, [categories, timeline, activeEngine, maxScore, minScore]);
}

