import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight } from 'lucide-react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { normalizeProbability } from '../utils/evolutionGuards';

const EMPTY_ARRAY = Object.freeze([]);
const hasValidNumber = (v) =>
  v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));
const hasScoreField = (obj) =>
  hasValidNumber(obj?.score) ||
  hasValidNumber(obj?.scorePoints) ||
  hasValidNumber(obj?.scorePct) ||
  hasValidNumber(obj?.netPoints) ||
  hasValidNumber(obj?.value);

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
      if (!entry || entry.valid === false || entry.validated === false) return false;
      const hasHeaderData = Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions) > 0 || hasScoreField(entry);
      if (hasHeaderData) return true;
      const topics = Array.isArray(entry.topics) ? entry.topics : Object.values(entry.topics || {});
      return topics.some(t => t && (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) > 0 || hasScoreField(t)));
    });
  })) || (Array.isArray(safeSimuladoRows) && safeSimuladoRows.some(row => {
    if (!row || row.valid === false || row.validated === false || row.source === 'manual-error-notebook') return false;
    if (Number(row.total ?? row.questoes ?? row.totalQuestoes ?? row.questions) > 0 || hasScoreField(row)) return true;
    const topics = Array.isArray(row.topics) ? row.topics : Object.values(row.topics || {});
    return topics.some(t => t && (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) > 0 || hasScoreField(t)));
  }));

  // ✅ FIX: Converter targetProbability (percentual) para pontos na escala da prova
  const targetScorePoints = React.useMemo(() => {
    const safeMin = safeMinScore;
    const safeMax = safeMaxScore;
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
    
    // 1) Se existir targetScore explícito, ele é a meta em pontos
    if (hasValidNumber(user?.targetScore)) {
      let ts = Number(user.targetScore);
      // Compatibilidade legada: converte para pontos apenas quando o valor está estritamente abaixo
      // do piso da escala (ex: default 75 no ENEM com piso 200) ou explicitamente marcado como %.
      // Não converter valores já dentro de [safeMin, safeMax] em escalas como Cebraspe (-120..120) ou 0..200.
      const isPercentileRange = ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0;
      const isBelowMin = ts < safeMin;
      const isExplicitPct = user?.targetScoreIsPercentage === true || user?.targetScoreUnit === '%';
      if (isPercentileRange && (isBelowMin || isExplicitPct)) {
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
            <div className="relative p-8 sm:p-12 text-center rounded-2xl border border-white/[0.08] bg-slate-900/75 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] max-w-lg w-full group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-indigo-500/5 to-cyan-500/5 opacity-70" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 mb-5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-indigo-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <TrendingUp size={30} />
                </div>
                <h3 className="text-lg font-black tracking-tight text-white mb-2">
                  Desbloqueie sua Evolução
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                  Cadastre simulados nas disciplinas para visualizar sua evolução, tendências de desempenho e as previsões estatísticas do motor Monte Carlo.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/simulados')}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-900/30 active:scale-95"
                >
                  <span>Cadastrar primeiro simulado</span>
                  <ArrowRight size={14} />
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

