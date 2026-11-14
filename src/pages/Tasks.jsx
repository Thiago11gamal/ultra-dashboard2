import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PersonalRanking from '../components/PersonalRanking';
import VolumeRanking from '../components/VolumeRanking';
import PerformanceTable from '../components/PerformanceTable';
import SubtopicsTable from '../components/SubtopicsTable';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { RotateCcw, CheckSquare, Target, Hash, Wallet, PlusCircle } from 'lucide-react';
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
      <div className="space-y-10">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <PersonalRanking categories={categories} maxScore={maxScore} minScore={minScore} />
          </div>
          <div className="lg:col-span-1 h-full">
            <VolumeRanking categories={categories} maxScore={maxScore} minScore={minScore} />
          </div>
        </div>

        <div className="pb-8 border-t border-white/5 pt-10 mt-10">
          <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
            📊 Quadro de Performance
            <button
              type="button"
              onClick={() => overviewStats.hasPerformanceData && setShowResetConfirm(true)}
              disabled={!overviewStats.hasPerformanceData}
              className={`p-1.5 rounded-lg transition-colors ${overviewStats.hasPerformanceData
                ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer'
                : 'bg-slate-900/30 text-slate-600 cursor-not-allowed opacity-50'
                }`}
              title={overviewStats.hasPerformanceData ? 'Resetar dados do quadro' : 'Sem dados de performance para resetar'}
            >
              <RotateCcw size={16} />
            </button>
          </h2>

          <PerformanceTable categories={categories} maxScore={maxScore} minScore={minScore} />
          <SubtopicsTable categories={categories} maxScore={maxScore} minScore={minScore} />
        </div>
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
