import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY = [];

export default function Evolution() {
  const { categories, rawStudyLogs, monteCarloHistory, user, unit, minScore, maxScore, simuladoRows } = useAppStore(
    useShallow(state => {
      const contests = state?.appState?.contests || {};
      const activeId = state?.appState?.activeId;
      const contest = contests[activeId] || {};
      return {
        categories: contest.categories ?? EMPTY_ARRAY,
        rawStudyLogs: contest.studyLogs,
        monteCarloHistory: contest.monteCarloHistory ?? EMPTY_ARRAY,
        user: contest.user,
        unit: contest.unit || '%',
        minScore: contest.minScore ?? 0,
        maxScore: contest.maxScore ?? 100,
        simuladoRows: contest.simuladoRows ?? EMPTY_ARRAY
      };
    })
  );

  const studyLogs = React.useMemo(() => {
    return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
  }, [rawStudyLogs]);

  const safeCategories = React.useMemo(() => {
    return Array.isArray(categories) ? categories : Object.values(categories || {});
  }, [categories]);

  const safeSimuladoRows = React.useMemo(() => {
    return Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {});
  }, [simuladoRows]);

  const safeMonteCarloHistory = React.useMemo(() => {
    return Array.isArray(monteCarloHistory) ? monteCarloHistory : Object.values(monteCarloHistory || {});
  }, [monteCarloHistory]);

  const hasEvolutionData = Array.isArray(safeCategories) && safeCategories.some(category => {
    const h = category?.simuladoStats?.history;
    return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
  });

  // ✅ FIX: Converter targetProbability (percentual) para pontos na escala da prova
  const targetScorePoints = React.useMemo(() => {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Math.min(Number(minScore) || 0, safeMax);
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));
    
    // 1) Se existir targetScore explícito, ele é a meta em pontos
    if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
      let ts = Number(user.targetScore);
      // Compatibilidade: se o valor parecer percentual (ex: 70) e estiver acima do maxScore
      if (ts > safeMax && ts <= 100) {
        ts = (ts / 100) * safeMax;
      }
      return clamp(ts);
    }
    
    // 2) Fallback: targetProbability é percentual (0-100) e deve virar pontos
    if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
      return clamp((Number(user.targetProbability) / 100) * safeMax);
    }
    
    // 3) Default seguro: 80% da escala
    return clamp(safeMax * 0.8);
  }, [user, minScore, maxScore]);

  return (
    <ErrorBoundary>
      <div className="animate-fade-in">
        {!hasEvolutionData ? (
          <div className="flex items-center justify-center min-h-[45vh] p-4">
            <div className="glass p-8 sm:p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl max-w-md w-full">
              <div className="text-5xl mb-4 opacity-80">📊</div>
              <p className="font-black uppercase tracking-wider text-sm text-slate-200 mb-2">
                Sem histórico de simulados
              </p>
              <p className="text-xs text-slate-400 mb-0 leading-relaxed">
                Registe simulados nas disciplinas para visualizar a sua evolução e previsões do motor Monte Carlo.
              </p>
            </div>
          </div>
        ) : (
          <EvolutionChart
            categories={safeCategories}
            studyLogs={studyLogs}
            targetScore={targetScorePoints}
            goalDate={user?.goalDate}
            monteCarloHistory={safeMonteCarloHistory}
            simuladoRows={safeSimuladoRows}
            unit={unit}
            minScore={minScore}
            maxScore={maxScore}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
