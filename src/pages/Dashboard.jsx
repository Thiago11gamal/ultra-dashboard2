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
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xl" />
                <div className="relative z-10 space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500/10" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-purple-400 animate-spin" />
                        <div className="absolute inset-4 rounded-full border-2 border-blue-500/10" />
                        <div className="absolute inset-4 rounded-full border-b-2 border-blue-400 animate-spin-slow" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-white tracking-widest uppercase">Sincronizando</h3>
                        <p className="text-purple-300/60 font-mono text-xs animate-pulse">Estabelecendo conexão segura com a nuvem...</p>
                    </div>
                    <div className="flex gap-1.5 justify-center">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-purple-500/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                </div>
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
            <div className="tour-step-4">
                <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            </div>
            <div className="tour-step-5">
                <NextGoalCard categories={data.categories} simulados={data.simuladoRows || []} studyLogs={data.studyLogs || []} onStartStudying={handleStartStudying} />
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
                    setFilter={setFilter}
                />
            </div>
        </div>
    );
}
