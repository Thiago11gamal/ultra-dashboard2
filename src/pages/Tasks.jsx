import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PersonalRanking from '../components/PersonalRanking';
import VolumeRanking from '../components/VolumeRanking';
import PerformanceTable from '../components/PerformanceTable';
import SubtopicsTable from '../components/SubtopicsTable';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { RotateCcw, CheckSquare, Target, Hash, Wallet, PlusCircle, Trophy, BarChart3, ListChecks } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import { normalizePriority } from '../utils/colorHelper';
import {
  toSafeArray,
  resolveContestScoreDomain,
  computeCategoryPerformanceStats
} from '../utils/tasksStatsHelper';
import { reconcileContestCategoriesHistory, isRealSimuladoRow } from '../utils/simuladoReconciler';

const EMPTY_ARRAY = Object.freeze([]);

export default function Tasks() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activePanel, setActivePanel] = useState(() => {
    try {
      return localStorage.getItem('tasks_active_panel') || 'rankings';
    } catch {
      return 'rankings';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tasks_active_panel', activePanel);
    } catch {
      // Ignora falha em ambientes com storage restrito
    }
  }, [activePanel]);

  const resetSimuladoStats = useAppStore(state => state.resetSimuladoStats);
  const storeActions = useAppStore(useShallow(state => ({
    toggleTask: state.toggleTask,
    updateTask: state.updateTask,
    deleteTask: state.deleteTask,
    addCategory: state.addCategory,
    deleteCategory: state.deleteCategory,
    addTask: state.addTask,
    togglePriority: state.togglePriority,
    startPomodoroSession: state.startPomodoroSession,
    setDashboardFilter: state.setDashboardFilter,
    importCategory: state.importCategory,
    dashboardFilter: state.appState?.dashboardFilter || 'all',
    activeId: state.appState?.activeId || 'default',
    contests: state.appState?.contests || {}
  })));

  const { rawCategories, rawSimuladoRows, contestMaxScore, contestMinScore, contestPenalty, hasContestSimulados } = useAppStore(useShallow(state => {
    const currentActiveId = state.appState?.activeId || 'default';
    const activeContest = state.appState?.contests?.[currentActiveId];
    const rowsArr = toSafeArray(activeContest?.simuladoRows);
    const simsArr = toSafeArray(activeContest?.simulados);
    return {
      rawCategories: activeContest?.categories ?? EMPTY_ARRAY,
      rawSimuladoRows: activeContest?.simuladoRows ?? EMPTY_ARRAY,
      contestMaxScore: activeContest?.maxScore ?? activeContest?.user?.maxScore,
      contestMinScore: activeContest?.minScore ?? activeContest?.user?.minScore,
      contestPenalty: activeContest?.penaltyPerWrong ?? 0,
      hasContestSimulados:
        rowsArr.some(isRealSimuladoRow) ||
        simsArr.some(s => s && s.valid !== false && s.validated !== false && s.source !== 'manual-error-notebook')
    };
  }));

  const baseCategories = useMemo(() => {
    return toSafeArray(rawCategories).map(c => ({
      ...c,
      tasks: toSafeArray(c?.tasks)
    }));
  }, [rawCategories]);

  const { maxScore, minScore } = useMemo(() => {
    return resolveContestScoreDomain(
      { maxScore: contestMaxScore, minScore: contestMinScore },
      baseCategories
    );
  }, [contestMaxScore, contestMinScore, baseCategories]);

  const categories = useMemo(() => {
    const rowsArr = toSafeArray(rawSimuladoRows);
    if (!baseCategories.length || !rowsArr.some(isRealSimuladoRow)) {
      return baseCategories;
    }
    return reconcileContestCategoriesHistory(baseCategories, rowsArr, maxScore, minScore, {
      penaltyPerWrong: Number(contestPenalty) || 0
    });
  }, [baseCategories, rawSimuladoRows, maxScore, minScore, contestPenalty]);

  const handleStartStudyingFromTasks = useCallback((categoryId, taskId) => {
    const cat = categories.find(c => c && (c.id === categoryId || c.name === categoryId));
    const tsk = toSafeArray(cat?.tasks).find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
    if (!cat || !tsk || typeof storeActions.startPomodoroSession !== 'function') return;
    storeActions.startPomodoroSession({
      categoryId: cat.id || cat.name,
      taskId: tsk.id || taskId,
      category: cat.name,
      task: tsk.title || tsk.text || 'Estudo',
      priority: normalizePriority(tsk.priority),
      source: 'tasks'
    });
    showToast(`Iniciando estudos: ${cat.name} - ${tsk.title || tsk.text || 'Estudo'}`, 'success');
    navigate('/pomodoro');
  }, [categories, storeActions, showToast, navigate]);

  const overviewStats = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let hasHistoryEntries = false;

    categories.forEach(cat => {
      const perf = computeCategoryPerformanceStats(cat, maxScore, minScore);
      totalQuestions += perf.totalVolume;
      totalCorrect += perf.correct;
      totalWrong += perf.wrong;
      totalTasks += perf.totalTasks;
      completedTasks += perf.completedTasks;
      if (toSafeArray(cat?.simuladoStats?.history).length > 0) {
        hasHistoryEntries = true;
      }
    });

    const netBalance = totalCorrect - totalWrong;
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const syllabusPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalCategories: categories.length,
      totalQuestions,
      totalCorrect,
      totalWrong,
      netBalance,
      overallAccuracy,
      totalTasks,
      completedTasks,
      syllabusPct,
      hasPerformanceData: totalQuestions > 0 || hasHistoryEntries || hasContestSimulados
    };
  }, [categories, maxScore, minScore, hasContestSimulados]);

  const handleResetConfirm = () => {
    resetSimuladoStats();
    setShowResetConfirm(false);
    showToast('Resetado com sucesso!', 'success');
  };

  const formatCount = (val) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '0';
    return val.toLocaleString('pt-BR');
  };

  const formatBalance = (val) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '0';
    const formatted = Math.abs(val).toLocaleString('pt-BR');
    if (val > 0) return `+${formatted}`;
    if (val < 0) return `-${formatted}`;
    return '0';
  };

  const panels = [
    {
      id: 'rankings',
      label: 'Rankings & Destaques',
      icon: Trophy,
      badge: `${overviewStats.totalCategories} Matérias`
    },
    {
      id: 'performance',
      label: 'Quadro de Performance',
      icon: BarChart3,
      badge: `${overviewStats.totalTasks} Tópicos`
    },
    {
      id: 'checklist',
      label: 'Checklist do Edital',
      icon: ListChecks,
      badge: `${Math.max(0, overviewStats.totalTasks - overviewStats.completedTasks)} Pendentes`
    }
  ];

  if (categories.length === 0) {
    return (
      <PageErrorBoundary pageName="Tarefas">
        <div className="min-h-[50vh] flex items-center justify-center text-center px-4 relative">
          <div className="absolute w-72 h-72 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative max-w-md p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
              <CheckSquare size={26} />
            </div>
            <h2 className="text-white font-black uppercase tracking-wider text-sm">Sem tarefas cadastradas</h2>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Cadastre suas matérias e o edital para desbloquear rankings dinâmicos, métricas de volume e quadros analíticos detalhados.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 hover:scale-[1.02] cursor-pointer"
            >
              <PlusCircle size={15} />
              Ir para Meu Painel
            </button>
          </div>
        </div>
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary pageName="Tarefas">
      <div className="relative space-y-8 animate-fade-in pb-16">
        {/* Ambient atmospheric glows */}
        <div className="pointer-events-none absolute -top-16 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] -z-10" />
        <div className="pointer-events-none absolute top-40 -right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] -z-10" />

        {/* Top Header & Panel Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-amber-500/20 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/25 via-amber-500/15 to-orange-500/10 flex items-center justify-center border border-amber-500/30 shadow-xl shadow-amber-500/15 shrink-0">
                <CheckSquare size={24} className="text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Tarefas & Performance
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Edital Analytics
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Acompanhe rankings, volume e o quadro analítico detalhado do seu edital
              </p>
            </div>
          </div>

          {/* Panel Selector (Dois Painéis) */}
          <div className="flex items-center bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 w-fit gap-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5">
            {panels.map((panel) => {
              const Icon = panel.icon;
              const isActive = activePanel === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setActivePanel(panel.id)}
                  className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 cursor-pointer ${isActive
                          ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02] ring-1 ring-amber-300/50'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-slate-950 fill-current/20' : 'text-amber-400'} />
                  <span>{panel.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block ${isActive ? 'bg-slate-950/25 text-slate-950 font-black' : 'bg-slate-800/80 text-slate-400 border border-white/5'
                    }`}>
                    {panel.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Executive KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Progresso do Edital */}
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80 border border-white/10 hover:border-amber-500/40 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-400/70 to-amber-500/0" />
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500" />
            
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <CheckSquare size={17} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Progresso do Edital</p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 shadow-sm">
                  {overviewStats.syllabusPct}%
                </span>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {formatCount(overviewStats.completedTasks)}
                <span className="text-slate-400 text-xs font-semibold ml-1.5 tracking-normal">
                  / {formatCount(overviewStats.totalTasks)} tópicos
                </span>
              </p>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  style={{ width: `${Math.min(100, Math.max(overviewStats.syllabusPct > 0 ? 3 : 0, overviewStats.syllabusPct))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="text-amber-400/90">{overviewStats.syllabusPct}% concluído</span>
                <span>{Math.max(0, overviewStats.totalTasks - overviewStats.completedTasks)} pendentes</span>
              </div>
            </div>
          </div>

          {/* Card 2: Volume Total */}
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80 border border-white/10 hover:border-sky-500/40 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-sky-500/0 via-sky-400/70 to-sky-500/0" />
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500" />
            
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Hash size={17} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Volume Total</p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0 shadow-sm">
                  {overviewStats.totalCategories} Matérias
                </span>
              </div>
              <p
                className="text-2xl font-black text-white tabular-nums tracking-tight truncate"
                title={`${formatCount(overviewStats.totalQuestions)} questões`}
              >
                {formatCount(overviewStats.totalQuestions)}
                <span className="text-slate-400 text-xs font-semibold ml-1.5 tracking-normal">questões</span>
              </p>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full w-full opacity-80 shadow-[0_0_8px_rgba(56,189,248,0.3)]" />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-sky-400/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Questões acumuladas
                </span>
                <span>{overviewStats.totalCategories} matérias no plano</span>
              </div>
            </div>
          </div>

          {/* Card 3: Aproveitamento */}
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80 border border-white/10 hover:border-emerald-500/40 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-400/70 to-emerald-500/0" />
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />
            
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <Target size={17} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Aproveitamento</p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 shadow-sm" title={`${formatCount(overviewStats.totalCorrect)} acertos`}>
                  {formatCount(overviewStats.totalCorrect)} AC
                </span>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {overviewStats.overallAccuracy}%
                <span className="text-slate-400 text-xs font-semibold ml-1.5 tracking-normal">
                  {overviewStats.overallAccuracy >= 80 ? '• Alta precisão' : overviewStats.overallAccuracy >= 65 ? '• Regular' : overviewStats.totalQuestions > 0 ? '• Atenção' : '• Sem dados'}
                </span>
              </p>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-300 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  style={{ width: `${Math.min(100, Math.max(overviewStats.overallAccuracy > 0 ? 3 : 0, overviewStats.overallAccuracy))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="text-emerald-400/90">{formatCount(overviewStats.totalCorrect)} acertos</span>
                <span className="text-slate-400">{formatCount(overviewStats.totalWrong)} erros</span>
              </div>
            </div>
          </div>

          {/* Card 4: Saldo Global */}
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80 border border-white/10 hover:border-blue-500/40 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-0.5 flex flex-col justify-between min-h-[156px]">
            <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${
              overviewStats.netBalance > 0
                ? 'from-emerald-500/0 via-emerald-400/70 to-emerald-500/0'
                : overviewStats.netBalance < 0
                  ? 'from-rose-500/0 via-rose-400/70 to-rose-500/0'
                  : 'from-blue-500/0 via-cyan-400/70 to-blue-500/0'
            }`} />
            <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
              overviewStats.netBalance > 0
                ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
                : overviewStats.netBalance < 0
                  ? 'bg-rose-500/10 group-hover:bg-rose-500/20'
                  : 'bg-blue-500/10 group-hover:bg-blue-500/20'
            }`} />
            
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform ${
                    overviewStats.netBalance > 0
                      ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                      : overviewStats.netBalance < 0
                        ? 'bg-rose-500/15 border-rose-500/25 text-rose-400'
                        : 'bg-blue-500/15 border-blue-500/25 text-blue-400'
                  }`}>
                    <Wallet size={17} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Saldo Global</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 shadow-sm ${
                  overviewStats.netBalance > 0
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : overviewStats.netBalance < 0
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border-white/10'
                }`}>
                  {overviewStats.netBalance > 0 ? 'Saldo Positivo (+Acertos)' : overviewStats.netBalance < 0 ? 'Saldo Negativo (-Erros)' : 'Equilíbrio'}
                </span>
              </div>
              <p
                className={`text-2xl font-black tabular-nums tracking-tight truncate ${
                  overviewStats.netBalance > 0
                    ? 'text-emerald-400'
                    : overviewStats.netBalance < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                }`}
                title={formatBalance(overviewStats.netBalance)}
              >
                {formatBalance(overviewStats.netBalance)}
                <span className="text-slate-400 text-xs font-semibold ml-1.5 tracking-normal">líquido</span>
              </p>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5 flex">
                {overviewStats.totalQuestions > 0 ? (
                  <>
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.round((overviewStats.totalCorrect / overviewStats.totalQuestions) * 100)}%` }}
                      title={`Acertos: ${formatCount(overviewStats.totalCorrect)}`}
                    />
                    <div
                      className="h-full bg-rose-500/80 transition-all duration-500"
                      style={{ width: `${Math.round((overviewStats.totalWrong / overviewStats.totalQuestions) * 100)}%` }}
                      title={`Erros: ${formatCount(overviewStats.totalWrong)}`}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-slate-800/40" />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="text-emerald-400/90">+{formatCount(overviewStats.totalCorrect)} acertos</span>
                <span className="text-rose-400/90">-{formatCount(overviewStats.totalWrong)} erros</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ PAINEL 1: Rankings & Destaques ═══ */}
        {activePanel === 'rankings' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-header Painel 1 */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/10 p-5 md:p-6 shadow-xl backdrop-blur-2xl">
              <div className="pointer-events-none absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                  <Trophy size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-md shadow-sm">
                      Painel 1 · Rankings & Destaques
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse hidden sm:inline-block" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    Identifique suas matérias de maior domínio, pontos fracos e liderança em volume de questões.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <PersonalRanking categories={categories} maxScore={maxScore} minScore={minScore} />
              </div>
              <div className="lg:col-span-1 h-full">
                <VolumeRanking categories={categories} maxScore={maxScore} minScore={minScore} />
              </div>
            </div>
          </div>
        ) : activePanel === 'performance' ? (
          /* ═══ PAINEL 2: Quadro de Performance ═══ */
          <div className="space-y-8 animate-fade-in">
            {/* Sub-header Painel 2 */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/10 p-5 md:p-6 shadow-xl backdrop-blur-2xl">
              <div className="pointer-events-none absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                    <BarChart3 size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-md shadow-sm">
                        Painel 2 · Quadro de Performance
                      </span>
                      <span className="text-slate-500 text-xs hidden sm:inline-block">•</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline-block">
                        Tópicos & Assuntos
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                      Detalhamento quantitativo por disciplina e matriz exaustiva de assuntos do edital.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => overviewStats.hasPerformanceData && setShowResetConfirm(true)}
                  disabled={!overviewStats.hasPerformanceData}
                  className={`group self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 shrink-0 border ${
                    overviewStats.hasPerformanceData
                      ? 'bg-slate-800/90 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border-white/10 hover:border-rose-500/30 shadow-md hover:shadow-rose-500/10 cursor-pointer active:scale-95'
                      : 'bg-slate-900/40 text-slate-600 cursor-not-allowed border-white/5 opacity-50'
                  }`}
                  title={overviewStats.hasPerformanceData ? 'Resetar dados do quadro' : 'Sem dados de performance para resetar'}
                >
                  <RotateCcw
                    size={14}
                    className={`transition-transform duration-300 ${
                      overviewStats.hasPerformanceData
                        ? 'text-amber-400 group-hover:text-rose-400 group-hover:-rotate-90'
                        : 'text-slate-600'
                    }`}
                  />
                  <span>Resetar Quadro</span>
                </button>
              </div>
            </div>

            <div className="space-y-8">
              <PerformanceTable categories={categories} maxScore={maxScore} minScore={minScore} />
              <SubtopicsTable categories={categories} maxScore={maxScore} minScore={minScore} />
            </div>
          </div>
        ) : null}

        {activePanel === 'checklist' && (
          <div className="space-y-6 animate-fade-in">
            <Checklist
              categories={categories}
              onToggleTask={storeActions.toggleTask}
              onUpdateTask={storeActions.updateTask}
              onDeleteTask={storeActions.deleteTask}
              onAddCategory={storeActions.addCategory}
              onDeleteCategory={storeActions.deleteCategory}
              onAddTask={storeActions.addTask}
              onTogglePriority={storeActions.togglePriority}
              onPlayContext={handleStartStudyingFromTasks}
              showSimuladoStats
              filter={storeActions.dashboardFilter}
              setFilter={storeActions.setDashboardFilter}
              contests={storeActions.contests}
              activeId={storeActions.activeId}
              onImportCategory={storeActions.importCategory}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetConfirm}
        title="Resetar Performance"
        message="Tem certeza que deseja resetar os dados de estatística do quadro de performance?"
        confirmText="Resetar Dados"
        type="warning"
        icon={RotateCcw}
      />
    </PageErrorBoundary>
  );
}
