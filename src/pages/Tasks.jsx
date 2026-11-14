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
        <div className="min-h-[50vh] flex items-center justify-center text-center px-4">
          <div className="max-w-md p-8 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={24} />
            </div>
            <p className="text-slate-200 font-bold uppercase tracking-wider text-xs">Sem tarefas cadastradas</p>
            <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
              Crie matérias e tarefas para liberar rankings e quadros de performance.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              <PlusCircle size={14} />
              Ir para Meu Painel
            </button>
          </div>
        </div>
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary pageName="Tarefas">
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Top Header & Panel Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10 shrink-0">
              <CheckSquare size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Tarefas & Performance
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhe rankings, volume e o quadro analítico detalhado do seu edital
              </p>
            </div>
          </div>

          {/* Panel Selector (Dois Painéis) */}
          <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-2xl p-1.5 w-fit gap-1 shadow-inner backdrop-blur-xl">
            {panels.map((panel) => {
              const Icon = panel.icon;
              const isActive = activePanel === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setActivePanel(panel.id)}
                  className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-slate-950 fill-current/20' : 'text-amber-400'} />
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <CheckSquare size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Progresso do Edital</p>
              <p className="text-lg font-black text-white tabular-nums">
                {overviewStats.completedTasks}/{overviewStats.totalTasks}{' '}
                <span className="text-xs font-bold text-amber-400">({overviewStats.syllabusPct}%)</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
              <Hash size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Volume Total</p>
              <p className="text-lg font-black text-white tabular-nums">
                {overviewStats.totalQuestions}{' '}
                <span className="text-xs font-bold text-slate-500">questões</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Target size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aproveitamento</p>
              <p className="text-lg font-black text-white tabular-nums">
                {overviewStats.overallAccuracy}%{' '}
                <span className="text-xs font-bold text-emerald-400">{overviewStats.totalCorrect} AC</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Wallet size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saldo Global</p>
              <p className={`text-lg font-black tabular-nums ${overviewStats.netBalance > 0
                ? 'text-emerald-400'
                : overviewStats.netBalance < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
                }`}>
                {overviewStats.netBalance > 0 ? `+${overviewStats.netBalance}` : overviewStats.netBalance}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ PAINEL 1: Rankings & Destaques ═══ */}
        {activePanel === 'rankings' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-header Painel 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/40 to-slate-900/60 border border-amber-500/20 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Painel 1 · Rankings & Destaques</h3>
                  <p className="text-[11px] text-slate-400">Identifique suas matérias de maior domínio, pontos fracos e liderança em volume de questões.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel('performance')}
                className="self-start sm:self-auto text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer group px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20"
              >
                <span>Quadro de Performance</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-slate-900/40 to-slate-900/60 border border-purple-500/20 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    Painel 2 · Quadro de Performance & Tópicos
                    <button
                      type="button"
                      onClick={() => overviewStats.hasPerformanceData && setShowResetConfirm(true)}
                      disabled={!overviewStats.hasPerformanceData}
                      className={`p-1.5 rounded-lg transition-colors ${overviewStats.hasPerformanceData
                        ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer border border-white/5'
                        : 'bg-slate-900/30 text-slate-600 cursor-not-allowed opacity-50'
                        }`}
                      title={overviewStats.hasPerformanceData ? 'Resetar dados do quadro' : 'Sem dados de performance para resetar'}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </h3>
                  <p className="text-[11px] text-slate-400">Detalhamento quantitativo por disciplina e matriz exaustiva de assuntos do edital.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel('rankings')}
                className="self-start sm:self-auto text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer group px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span>Rankings & Destaques</span>
              </button>
            </div>

            <div className="space-y-10">
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
