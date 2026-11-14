import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PersonalRanking from '../components/PersonalRanking';
import VolumeRanking from '../components/VolumeRanking';
import PerformanceTable from '../components/PerformanceTable';
import SubtopicsTable from '../components/SubtopicsTable';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { RotateCcw, CheckSquare, Target, Hash, Wallet, PlusCircle, Trophy, BarChart3, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import {
  toSafeArray,
  resolveContestScoreDomain,
  computeCategoryPerformanceStats
} from '../utils/tasksStatsHelper';

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

  const { rawCategories, contestMaxScore, contestMinScore, hasContestSimulados } = useAppStore(useShallow(state => {
    const currentActiveId = state.appState?.activeId || 'default';
    const activeContest = state.appState?.contests?.[currentActiveId];
    return {
      rawCategories: activeContest?.categories || [],
      contestMaxScore: activeContest?.maxScore ?? activeContest?.user?.maxScore,
      contestMinScore: activeContest?.minScore ?? activeContest?.user?.minScore,
      hasContestSimulados:
        toSafeArray(activeContest?.simuladoRows).length > 0 ||
        toSafeArray(activeContest?.simulados).length > 0
    };
  }));

  const categories = useMemo(() => {
    return toSafeArray(rawCategories).map(c => ({
      ...c,
      tasks: toSafeArray(c?.tasks)
    }));
  }, [rawCategories]);

  const { maxScore, minScore } = useMemo(() => {
    return resolveContestScoreDomain(
      { maxScore: contestMaxScore, minScore: contestMinScore },
      categories
    );
  }, [contestMaxScore, contestMinScore, categories]);

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
        <div className="pointer-events-none absolute top-40 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] -z-10" />

        {/* Top Header & Panel Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/25 via-amber-500/15 to-orange-500/5 flex items-center justify-center border border-amber-500/30 shadow-xl shadow-amber-500/15 shrink-0">
              <CheckSquare size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Tarefas & Performance
                </h1>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hidden sm:inline-block shadow-sm">
                  Edital Analytics
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Acompanhe rankings, volume e o quadro analítico detalhado do seu edital
              </p>
            </div>
          </div>

          {/* Panel Selector (Dois Painéis) */}
          <div className="flex items-center bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 w-fit gap-1 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5">
            {panels.map((panel) => {
              const Icon = panel.icon;
              const isActive = activePanel === panel.id;
              const isRankings = panel.id === 'rankings';
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setActivePanel(panel.id)}
                  className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 cursor-pointer ${
                    isActive
                      ? isRankings
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02] ring-1 ring-amber-300/40'
                        : 'bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-500 text-slate-950 shadow-lg shadow-purple-500/25 scale-[1.02] ring-1 ring-purple-300/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-slate-950 fill-current/20' : isRankings ? 'text-amber-400' : 'text-purple-400'} />
                  <span>{panel.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block ${
                    isActive ? 'bg-black/20 text-slate-950 font-black' : 'bg-slate-800/80 text-slate-400 border border-white/5'
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
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-amber-500/30 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-400/50 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <CheckSquare size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Progresso do Edital</p>
                <p className="text-xl font-black text-white tabular-nums tracking-tight">
                  {overviewStats.completedTasks}/{overviewStats.totalTasks}{' '}
                  <span className="text-xs font-bold text-amber-400">({overviewStats.syllabusPct}%)</span>
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-950/70 rounded-full mt-3 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                style={{ width: `${Math.min(100, Math.max(0, overviewStats.syllabusPct))}%` }}
              />
            </div>
          </div>

          {/* Card 2: Volume Total */}
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-purple-500/30 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500/0 via-purple-400/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
                <Hash size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Volume Total</p>
                <p className="text-xl font-black text-white tabular-nums tracking-tight">
                  {overviewStats.totalQuestions}{' '}
                  <span className="text-xs font-bold text-purple-300/70">questões</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>{overviewStats.totalCategories} matérias no plano</span>
            </div>
          </div>

          {/* Card 3: Aproveitamento */}
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-400/50 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Target size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Aproveitamento</p>
                <p className="text-xl font-black text-white tabular-nums tracking-tight">
                  {overviewStats.overallAccuracy}%{' '}
                  <span className="text-xs font-bold text-emerald-400">{overviewStats.totalCorrect} AC</span>
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-950/70 rounded-full mt-3 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                style={{ width: `${Math.min(100, Math.max(0, overviewStats.overallAccuracy))}%` }}
              />
            </div>
          </div>

          {/* Card 4: Saldo Global */}
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-blue-500/30 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-cyan-400/50 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3.5 mb-2">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${
                overviewStats.netBalance > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : overviewStats.netBalance < 0
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                <Wallet size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Saldo Global</p>
                <p className={`text-xl font-black tabular-nums tracking-tight ${
                  overviewStats.netBalance > 0
                    ? 'text-emerald-400'
                    : overviewStats.netBalance < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                }`}>
                  {overviewStats.netBalance > 0 ? `+${overviewStats.netBalance}` : overviewStats.netBalance}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                overviewStats.netBalance > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : overviewStats.netBalance < 0
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border-white/5'
              }`}>
                {overviewStats.netBalance > 0 ? 'Saldo Positivo (+Acertos)' : overviewStats.netBalance < 0 ? 'Saldo Negativo (-Erros)' : 'Equilíbrio'}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ PAINEL 1: Rankings & Destaques ═══ */}
        {activePanel === 'rankings' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-header Painel 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900/70 to-slate-900/90 border border-amber-500/25 shadow-xl shadow-amber-500/5 backdrop-blur-2xl">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-lg shadow-amber-500/10">
                  <Trophy size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                      Painel 1 · Rankings & Destaques
                    </h3>
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse hidden sm:inline-block" />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Identifique suas matérias de maior domínio, pontos fracos e liderança em volume de questões.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel('performance')}
                className="self-start sm:self-auto text-xs font-black text-amber-300 hover:text-white flex items-center gap-2 transition-all duration-300 cursor-pointer group px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-400/50 shadow-md hover:shadow-amber-500/20 hover:scale-[1.02]"
              >
                <span>Quadro de Performance</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
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
        ) : (
          /* ═══ PAINEL 2: Quadro de Performance ═══ */
          <div className="space-y-8 animate-fade-in">
            {/* Sub-header Painel 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-slate-900/70 to-slate-900/90 border border-purple-500/25 shadow-xl shadow-purple-500/5 backdrop-blur-2xl">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0 shadow-lg shadow-purple-500/10">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      Painel 2 · Quadro de Performance & Tópicos
                    </h3>
                    <button
                      type="button"
                      onClick={() => overviewStats.hasPerformanceData && setShowResetConfirm(true)}
                      disabled={!overviewStats.hasPerformanceData}
                      className={`p-1.5 rounded-lg transition-colors ${
                        overviewStats.hasPerformanceData
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer border border-white/5'
                          : 'bg-slate-900/30 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                      title={overviewStats.hasPerformanceData ? 'Resetar dados do quadro' : 'Sem dados de performance para resetar'}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detalhamento quantitativo por disciplina e matriz exaustiva de assuntos do edital.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel('rankings')}
                className="self-start sm:self-auto text-xs font-black text-purple-300 hover:text-white flex items-center gap-2 transition-all duration-300 cursor-pointer group px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-400/50 shadow-md hover:shadow-purple-500/20 hover:scale-[1.02]"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span>Rankings & Destaques</span>
              </button>
            </div>

            <div className="space-y-8">
              <PerformanceTable categories={categories} maxScore={maxScore} minScore={minScore} />
              <SubtopicsTable categories={categories} maxScore={maxScore} minScore={minScore} />
            </div>
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
