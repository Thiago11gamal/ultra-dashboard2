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

    // FIX: Usar o filtro do store em vez do useState local
    const filter = useAppStore(state => state.appState.dashboardFilter || 'all');

    const activeId = useAppStore(state => state.appState.activeId);
    const categories = useAppStore(state => state.appState.contests?.[activeId]?.categories);
    const simuladoRows = useAppStore(state => state.appState.contests?.[activeId]?.simuladoRows);
    const studyLogs = useAppStore(state => state.appState.contests?.[activeId]?.studyLogs);
    const user = useAppStore(state => state.appState.contests?.[activeId]?.user);
    const pomodorosCompleted = useAppStore(state => state.appState.contests?.[activeId]?.pomodorosCompleted);

    const data = React.useMemo(() => ({
        categories, simuladoRows, studyLogs, user, pomodorosCompleted
    }), [categories, simuladoRows, studyLogs, user, pomodorosCompleted]);

    if (!data || !data.categories) {
        return (
            <div className="flex items-center justify-center p-12">
                <p className="text-slate-400">Carregando dados...</p>
            </div>
        );
    }

    const setGoalDate = (d) => setData(draft => {
        draft.user.goalDate = d;
    });

    const handleStartStudying = (categoryId, taskId) => {
        const cat = data.categories?.find(c => c.id === categoryId);
        const tsk = cat?.tasks?.find(t => t.id === taskId);

        if (cat && tsk) {
            startPomodoroSession({
                categoryId: cat.id,
                taskId: tsk.id,
                category: cat.name,
                task: tsk.title || tsk.text || 'Estudo',
                priority: tsk.priority
            });

            // Set studying status
            setData(draft => {
                (draft.categories || []).forEach(c => {
                    (c.tasks || []).forEach(t => {
                        if (t.id === tsk.id && c.id === cat.id) {
                            t.status = 'studying';
                        } else if (t.status === 'studying') {
                            t.status = undefined;
                        }
                    });
                });
            });
            showToast(`Iniciando estudos: ${cat.name} - ${tsk.title}`, 'success');
            navigate('/pomodoro');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="tour-step-4">
                <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            </div>

            <div className="tour-step-5">
                <NextGoalCard
                    categories={data.categories}
                    simulados={data.simuladoRows || []}
                    studyLogs={data.studyLogs || []}
                    onStartStudying={handleStartStudying}
                />
            </div>

            <PriorityProgress categories={(() => {
                if (filter === 'all') return data.categories;
                return (data.categories || []).map(cat => ({
                    ...cat,
                    tasks: (cat.tasks || []).filter(task => {
                        if (filter === 'active') return !task.completed;
                        if (filter === 'completed') return task.completed;
                        return true;
                    })
                }));
            })()} />

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
    );
}