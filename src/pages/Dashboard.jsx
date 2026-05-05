import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
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
    const activeId = useAppStore(state => state.appState.activeId);
    
    // Otimização: Agrupar as extrações de estado para reduzir re-renders desnecessários
    const { categories, simuladoRows, studyLogs, user, pomodorosCompleted } = useAppStore(state => state.appState.contests?.[activeId] || {});

    // Filtro centralizado aplicado a todos os componentes relevantes
    const filteredCategories = React.useMemo(() => {
        if (filter === 'all') return categories || [];
        return (categories || []).map(cat => ({
            ...cat,
            tasks: (cat.tasks || []).filter(task => {
                if (filter === 'active') return !task.completed;
                if (filter === 'completed') return task.completed;
                return true;
            })
        }));
    }, [categories, filter]);

    const data = React.useMemo(() => ({
        categories, simuladoRows, studyLogs, user, pomodorosCompleted
    }), [categories, simuladoRows, studyLogs, user, pomodorosCompleted]);

    const setGoalDate = React.useCallback((d) => setData(draft => {
        if (!draft.user) draft.user = {};
        draft.user.goalDate = d || null;
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

            // Set studying status garantindo que opera apenas no concurso ativo
            setData(draft => {
                if (draft.categories) {
                    draft.categories.forEach(c => {
                        (c.tasks || []).forEach(t => {
                            if (t.id === tsk.id && c.id === cat.id) {
                                t.status = 'studying';
                            } else if (t.status === 'studying') {
                                t.status = undefined;
                            }
                        });
                    });
                }
            });
            const taskLabel = tsk.title || tsk.text || 'Estudo';
            showToast(`Iniciando estudos: ${cat.name} - ${taskLabel}`, 'success');
            navigate('/pomodoro');
        }
    }, [data.categories, startPomodoroSession, setData, showToast, navigate]);

    if (!data || !data.categories) {
        return (
            <div className="flex items-center justify-center p-12">
                <p className="text-slate-400">Carregando dados...</p>
            </div>
        );
    }

    return (<PageErrorBoundary pageName="Dashboard">
        <div className="space-y-6 animate-fade-in">
            <div className="tour-step-4">
                <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            </div>

            <div className="tour-step-5">
                <NextGoalCard
                    categories={filteredCategories}
                    simulados={data.simuladoRows || []}
                    studyLogs={data.studyLogs || []}
                    onStartStudying={handleStartStudying}
                />
            </div>

            <PriorityProgress categories={filteredCategories} />

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
                />
            </div>
        </div>
    </PageErrorBoundary>);
}