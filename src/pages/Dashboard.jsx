import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function Dashboard() {
    const setData = useAppStore(state => state.setData);
    const toggleTask = useAppStore(state => state.toggleTask);
    const deleteTask = useAppStore(state => state.deleteTask);
    const addCategory = useAppStore(state => state.addCategory);
    const deleteCategory = useAppStore(state => state.deleteCategory);
    const addTask = useAppStore(state => state.addTask);
    const togglePriority = useAppStore(state => state.togglePriority);
    const startPomodoroSession = useAppStore(state => state.startPomodoroSession);
    const setDashboardFilter = useAppStore(state => state.setDashboardFilter);
    const showToast = useToast();
    const navigate = useNavigate();

    const filter = useAppStore(state => state.appState.dashboardFilter || 'all');
    const isHydrated = useAppStore(state => state.appState.isHydrated);
    const activeId = useAppStore(state => state.appState.activeId);
    const contests = useAppStore(state => state.appState.contests || {});
    const importCategory = useAppStore(state => state.importCategory);
    
    // Otimização: Agrupar as extrações de estado para reduzir re-renders desnecessários usando useShallow
    const { categories, simulados, simuladoRows, rawStudyLogs, user, pomodorosCompleted } = useAppStore(useShallow(state => {
        const contest = state.appState.contests?.[activeId] || {};
        return {
            categories: contest.categories,
            simulados: contest.simulados,
            simuladoRows: contest.simuladoRows,
            rawStudyLogs: contest.studyLogs,
            user: contest.user,
            pomodorosCompleted: contest.pomodorosCompleted
        };
    }));

    const studyLogs = React.useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);


    const data = React.useMemo(() => ({
        categories, simulados, simuladoRows, studyLogs, user, pomodorosCompleted
    }), [categories, simulados, simuladoRows, studyLogs, user, pomodorosCompleted]);

    const setGoalDate = React.useCallback((d) => setData(contest => {
        if (!contest) return contest;
        return {
            ...contest,
            user: {
                ...(contest.user || {}),
                goalDate: d || null
            }
        };
    }), [setData]);

    const handleStartStudying = React.useCallback((categoryId, taskId) => {
        const cat = data.categories?.find(c => c.id === categoryId);
        const tsk = cat?.tasks?.find(t => t.id === taskId);

        if (cat && tsk) {
            startPomodoroSession({
                categoryId: cat.id,
                taskId: tsk.id,
                category: cat.name,
                task: tsk.title || tsk.text || 'Estudo',
                priority: tsk.priority,
                source: 'dashboard'
            });

            setData(activeContest => {
                if (!activeContest || !activeContest.categories) return activeContest;
                return {
                    ...activeContest,
                    categories: activeContest.categories.map(c => {
                        return {
                            ...c,
                            tasks: (c.tasks || []).map(t => {
                                if (c.id === cat.id && t.id === tsk.id) {
                                    return { ...t, status: 'studying' };
                                }
                                if (t.status === 'studying') {
                                    return { ...t, status: undefined };
                                }
                                return t;
                            })
                        };
                    })
                };
            });
            const taskLabel = tsk.title || tsk.text || 'Estudo';
            showToast(`Iniciando estudos: ${cat.name} - ${taskLabel}`, 'success');
            navigate('/pomodoro');
        }
    }, [data.categories, startPomodoroSession, setData, showToast, navigate]);

    // ✅ DEPOIS (Barreira de Hidratação Atómica - Relaxada para permitir categorias vazias)
    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center h-[70vh] w-full animate-fade-in">
                <div className="flex flex-col items-center gap-5 p-12">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">A Calibrar Motor</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">A carregar perfil de aprendizagem</p>
                    </div>
                </div>
            </div>
        );
    }

    return (<PageErrorBoundary pageName="Dashboard">
        <div className="space-y-6 animate-fade-in">
            {/* Visual hint for new tools */}
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-teal-400/70 font-bold uppercase tracking-widest mb-1 px-1">
                <span className="inline-block w-2 h-px bg-teal-400/50"></span> NOVO: Flashcards e Agenda de Estudos disponíveis no menu
            </div>
            <div className="tour-step-4">
                <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            </div>

            <div className="tour-step-5">
                <NextGoalCard
                    categories={data.categories}
                    simulados={data.simulados || []}
                    studyLogs={data.studyLogs || []}
                    onStartStudying={handleStartStudying}
                />
            </div>

            <PriorityProgress categories={data.categories} />

            <div className="mt-4 tour-step-6">
                <Checklist
                    categories={data.categories}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    onAddCategory={addCategory}
                    onDeleteCategory={deleteCategory}
                    onAddTask={addTask}
                    onTogglePriority={togglePriority}
                    onPlayContext={handleStartStudying}
                    filter={filter}
                    setFilter={setDashboardFilter}
                    contests={contests}
                    activeId={activeId}
                    onImportCategory={importCategory}
                />
            </div>
        </div>
    </PageErrorBoundary>);
}