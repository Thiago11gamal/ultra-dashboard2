import React from 'react';
import { useNavigate } from 'react-router-dom';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { normalizeProbability } from '../utils/evolutionGuards';

const EMPTY_ARRAY = Object.freeze([]);
const hasValidNumber = (v) =>
  v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

export default function Evolution() {
  const navigate = useNavigate();
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

  const safeMinScore = hasValidNumber(minScore) ? Number(minScore) : 0;
  const safeMaxScore = hasValidNumber(maxScore) && Number(maxScore) > safeMinScore
    ? Number(maxScore)
    : Math.max(100, safeMinScore + 100);

  const hasEvolutionData = (Array.isArray(safeCategories) && safeCategories.some(category => {
    const h = category?.simuladoStats?.history;
    const list = Array.isArray(h) ? h : Object.values(h || {});
    return list.some(entry => {
      if (!entry) return false;
      const hasHeaderData = Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions) > 0 || hasValidNumber(entry.score);
      if (hasHeaderData) return true;
      const topics = Array.isArray(entry.topics) ? entry.topics : Object.values(entry.topics || {});
      return topics.some(t => t && (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) > 0 || hasValidNumber(t.score)));
    });
  })) || (Array.isArray(safeSimuladoRows) && safeSimuladoRows.length > 0);

  // ✅ FIX: Converter targetProbability (percentual) para pontos na escala da prova
  const targetScorePoints = React.useMemo(() => {
    const safeMin = safeMinScore;
    const safeMax = safeMaxScore;
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
    
    // 1) Se existir targetScore explícito, ele é a meta em pontos
    if (hasValidNumber(user?.targetScore)) {
      let ts = Number(user.targetScore);
      // Compatibilidade legada: se o valor está estritamente abaixo do piso da escala (ex: default 75 no ENEM com piso 200)
      // ou se a escala total é ampliada (safeMax > 100 e amplitude >= 200) e o valor está no intervalo percentual [0, 100],
      // converte percentual para a escala em pontos.
      const isPercentileRange = ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0;
      const isBelowMin = ts < safeMin;
      const isLegacyPercentageOnLargeScale = safeMax > 100 && (safeMax - safeMin) >= 200 && ts <= 100;
      if (isPercentileRange && (isBelowMin || isLegacyPercentageOnLargeScale)) {
        ts = safeMin + (ts / 100) * (safeMax - safeMin);
      }
      return clamp(ts);
    }
    
    // 2) Fallback: targetProbability é percentual (0-100) e deve virar pontos
    if (hasValidNumber(user?.targetProbability)) {
      const pct = normalizeProbability(user.targetProbability);
      return clamp(safeMin + (pct / 100) * (safeMax - safeMin));
    }
    
    // 3) Default seguro: 80% da escala
    return clamp(safeMin + (safeMax - safeMin) * 0.8);
  }, [user, safeMinScore, safeMaxScore]);

  return (
    <ErrorBoundary>
      <div className="animate-fade-in">
        {!hasEvolutionData ? (
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <div className="relative p-8 sm:p-12 text-center rounded-3xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-lg w-full group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 opacity-50"></div>
              <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 mb-6 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                    <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">📈</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 mb-3">
                    Desbloqueie sua Evolução
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                    Cadastre simulados nas disciplinas para visualizar sua evolução, tendências de desempenho e as previsões estatísticas do motor Monte Carlo.
                  </p>
                  <button
                    onClick={() => navigate('/simulados')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-lg shadow-indigo-900/30 active:scale-95"
                  >
                    Cadastrar primeiro simulado
                  </button>
              </div>
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
            minScore={safeMinScore}
            maxScore={safeMaxScore}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

