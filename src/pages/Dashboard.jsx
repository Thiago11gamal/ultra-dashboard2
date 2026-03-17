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
    const { toggleTask, deleteTask, addCategory, deleteCategory, addTask, togglePriority } = useAppStore();
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

    const handleStartStudying = (categoryId, taskId) => {
        // Redireciona para aba Pomodoro passando os params necessários no state do Router
        navigate('/pomodoro', { state: { categoryId, taskId } });
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
