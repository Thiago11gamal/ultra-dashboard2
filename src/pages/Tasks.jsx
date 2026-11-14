import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PersonalRanking from '../components/PersonalRanking';
import VolumeRanking from '../components/VolumeRanking';
import PerformanceTable from '../components/PerformanceTable';
import SubtopicsTable from '../components/SubtopicsTable';
import Checklist from '../components/Checklist';
import PriorityProgress from '../components/PriorityProgress';
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
import PromptModal from '../components/PromptModal';
import { toArray } from '../utils/normalize';
import { normalize } from '../utils/normalization';

export default function Tasks() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'performance' | 'rankings'
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const navigate = useNavigate();

    const { rawCategories, contestMaxScore, contestMinScore } = useAppStore(useShallow(state => {
      const activeId = state.appState?.activeId || 'default';
      const activeContest = state.appState?.contests?.[activeId];
      return {
      rawCategories: activeContest?.categories || [],
        contestMaxScore: activeContest?.maxScore ?? activeContest?.user?.maxScore,
        contestMinScore: activeContest?.minScore ?? activeContest?.user?.minScore
      };
    }));

    const categories = useMemo(() => {
        return toSafeArray(rawCategories).map(c => ({
          ...c,
      tasks: toSafeArray(c?.tasks)
        }));
      }, [rawCategories]);

        const resetSimuladoStats = useAppStore(state => state.resetSimuladoStats);
        const showToast = useToast();

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
            hasPerformanceData: totalQuestions > 0 || hasHistoryEntries
          };
      }, [categories, maxScore, minScore]);

      const handleResetConfirm = () => {
        resetSimuladoStats();
        setShowResetConfirm(false);
        showToast('Quadro de performance resetado com sucesso!', 'success');
      };

      const handleStartStudying = useCallback((categoryId, taskId) => {
        const currentCategories = useAppStore.getState().appState?.contests?.[
          useAppStore.getState().appState?.activeId
        ]?.categories || [];
        const safeCategoriesList = Array.isArray(currentCategories)
          ? currentCategories
          : Object.values(currentCategories || {});
        const cat = safeCategoriesList.find(c => c && (c.id === categoryId || c.name === categoryId));
        const tsk = toArray(cat?.tasks).find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));

        if (!cat || !tsk) return;

        const currentActiveSubject = useAppStore.getState().appState?.pomodoro?.activeSubject;
        const taskMatchesActive = Boolean(currentActiveSubject && (
          (tsk.id && currentActiveSubject.taskId === tsk.id) ||
          (taskId && currentActiveSubject.taskId === taskId) ||
          (currentActiveSubject.task && (currentActiveSubject.task === tsk.title || currentActiveSubject.task === tsk.text))
        ));
        const isAlreadyActive = taskMatchesActive && tsk.status === 'studying';
        if (isAlreadyActive) {
          navigate('/pomodoro');
          return;
        }

        if (setData) {
          setData(activeContest => {
            if (!activeContest || activeContest.categories == null) return activeContest;
            return {
              ...activeContest,
              categories: toArray(activeContest.categories).map(c => ({
                ...c,
                tasks: toArray(c.tasks).map(t => {
                  const isMatch = (c.id && cat.id) ? c.id === cat.id : c.name === cat.name;
                  if (isMatch && (t.id === tsk.id || t.id === taskId || (tsk.text && t.text === tsk.text) || (tsk.title && t.title === tsk.title))) {
                    return { ...t, status: 'studying' };
                  }
                  return t;
                })
              }))
            };
          });
        }

        if (startPomodoroSession) {
          startPomodoroSession({
            categoryId: cat.id || cat.name,
            taskId: tsk.id || taskId,
            category: cat.name,
            task: tsk.title || tsk.text || 'Estudo',
            priority: tsk.priority
          });
        }

        const taskLabel = tsk.title || tsk.text || 'Estudo';
        showToast(`Iniciando estudos: ${cat.name} - ${taskLabel}`, 'success');
        navigate('/pomodoro');
      }, [setData, startPomodoroSession, navigate, showToast]);

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

                  <PromptModal
                    isOpen={isCatModalOpen}
                    onClose={() => setIsCatModalOpen(false)}
                    onConfirm={(name) => {
                      const trimmed = typeof name === 'string' ? name.trim() : '';
                      if (!trimmed) {
                        showToast('O nome da disciplina não pode ser vazio.', 'error');
                        return;
                      }
                      if (addCategory) {
                        addCategory(trimmed);
                        showToast(`Disciplina "${trimmed}" criada com sucesso!`, 'success');
                      }
                      setIsCatModalOpen(false);
                    }}
                    title="Nova Disciplina"
                    placeholder="Ex: Direito Constitucional..."
                  />
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

                                        {/* Barra de Abas de Navegação */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                                          <div className="inline-flex p-1.5 bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl gap-1.5 shadow-lg">
                                            <button
                                              type="button"
                                              onClick={() => setActiveTab('tasks')}
                                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'tasks'
                                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                              <ListTodo size={16} />
                                              <span>Minhas Tarefas & Edital</span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'tasks' ? 'bg-black/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                                                }`}>
                                                {taskStats.pendingTasks}
                                              </span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => setActiveTab('performance')}
                                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'performance'
                                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                              <BarChart3 size={16} />
                                              <span>Quadro de Performance</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => setActiveTab('rankings')}
                                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'rankings'
                                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                              <Trophy size={16} />
                                              <span>Rankings & Volume</span>
                                            </button>
                                          </div>

                                          {activeTab === 'performance' && (
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
                                              <RotateCcw size={14} />
                                              <span>Resetar Performance</span>
                                            </button>
                                          )}
                                        </div>

                                        {/* Conteúdo da Aba 1: Minhas Tarefas (Edital Verticalizado) */}
                                        {activeTab === 'tasks' && (
                                          <div className="space-y-8 animate-fade-in">
                                            {/* Barra de Progresso por Prioridade */}
                                            <PriorityProgress categories={categories} />

                                            {/* Checklist Completo e Interativo */}
                                            <Checklist
                                              categories={categories}
                                              onToggleTask={toggleTask}
                                              onUpdateTask={updateTask}
                                              onDeleteTask={deleteTask}
                                              onAddCategory={addCategory}
                                              onDeleteCategory={deleteCategory}
                                              onAddTask={addTask}
                                              onTogglePriority={togglePriority}
                                              onPlayContext={handleStartStudying}
                                              showSimuladoStats
                                              filter={taskFilter}
                                              setFilter={setTaskFilter}
                                              contests={contests}
                                              activeId={activeId}
                                              onImportCategory={importCategory}
                                            />
                                          </div>
                                        )}

                                        {/* Conteúdo da Aba 2: Quadro de Performance & Subtópicos */}
                                        {activeTab === 'performance' && (
                                          <div className="space-y-10 animate-fade-in">
                                            <div>
                                              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                                <span>📊 Desempenho Global por Disciplina</span>
                                              </h2>
                                              <p className="text-slate-400 text-xs">Visão geral de volume, assertividade líquida e tendências por matéria</p>
                                              <PerformanceTable categories={categories} maxScore={maxScore} minScore={minScore} />
                                            </div>

                                            <div className="pt-6 border-t border-white/5">
                                              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                                <span>🎯 Assuntos Específicos do Edital</span>
                                              </h2>
                                              <p className="text-slate-400 text-xs">Desempenho detalhado de cada subtópico registrado em exercícios e simulados</p>
                                              <SubtopicsTable categories={categories} maxScore={maxScore} minScore={minScore} />
                                            </div>
                                          </div>
                                        )}

                                        {/* Conteúdo da Aba 3: Rankings & Volume */}
                                        {activeTab === 'rankings' && (
                                          <div className="animate-fade-in">
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                              <div className="lg:col-span-2">
                                                <PersonalRanking categories={categories} />
                                              </div>
                                              <div className="lg:col-span-1 h-full">
                                                <VolumeRanking categories={categories} />
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <ConfirmModal
                                        isOpen={showResetConfirm}
                                        onClose={() => setShowResetConfirm(false)}
                                        onConfirm={handleResetConfirm}
                                        title="Resetar Performance"
                                        message="Tem certeza que deseja resetar os dados de estatística do quadro de performance? Esta ação apagará o histórico consolidado de acertos e erros dos simulados."
                                        confirmText="Resetar Dados"
                                        type="warning"
                                        icon={RotateCcw}
                                      />
                                    </PageErrorBoundary>
                                    );
}
