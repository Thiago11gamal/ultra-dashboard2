import React, { useState } from 'react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function Dashboard() {
    const setAppState = useAppStore(state => state.setAppState);
    const setData = useAppStore(state => state.setData);
    const { toggleTask, deleteTask, addCategory, deleteCategory, addTask, togglePriority, startPomodoroSession } = useAppStore();
    const showToast = useToast();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');

    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    
    // GUARDA DE SEGURANÇA: Previne crash se o estado mudar rapidamente durante a restauração
    if (!data || !data.categories) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-purple-300 font-mono animate-pulse">Sincronizando dados...</p>
            </div>
        );
    }
    
    const setGoalDate = (d) => setData(prev => ({ ...prev, user: { ...prev.user, goalDate: d } }));

    const handleStartStudying = (categoryId, taskId) => {
        const cat = data.categories?.find(c => c.id === categoryId);
        const tsk = cat?.tasks?.find(t => t.id === taskId);

        if (cat && tsk) {
            startPomodoroSession({
                categoryId: cat.id,
                taskId: tsk.id,
                category: cat.name,
                task: tsk.title,
                priority: tsk.priority
            });

            // Set studying status
            setData(prev => ({
                ...prev,
                categories: prev.categories.map(c => ({
                    ...c,
                    tasks: c.tasks.map(t => {
                        if (t.id === tsk.id && c.id === cat.id) return { ...t, status: 'studying' };
                        if (t.status === 'studying') return { ...t, status: undefined };
                        return t;
                    })
                }))
            }));
            showToast(`Iniciando estudos: ${cat.name} - ${tsk.title}`, 'success');
        }

        navigate('/pomodoro');
    };



    return (
        <div className="space-y-6 animate-fade-in">
            <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            <NextGoalCard categories={data.categories} simulados={data.simuladoRows || []} studyLogs={data.studyLogs || []} onStartStudying={handleStartStudying} />
            <PriorityProgress categories={data.categories} />
            <div className="mt-4">
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
                    setFilter={setFilter}
                />
            </div>
        </div>
    );
}
