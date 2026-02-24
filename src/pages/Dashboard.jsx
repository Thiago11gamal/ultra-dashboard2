import React, { useState } from 'react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const setGoalDate = (d) => setData(prev => ({ ...prev, user: { ...prev.user, goalDate: d } }));

    // Actions
    const { toggleTask, deleteTask, addCategory, deleteCategory, addTask, togglePriority } = useAppStore();
    const navigate = useNavigate();

    const [filter, setFilter] = useState('all');

    const handleStartStudying = (categoryId, taskId) => {
        // Redireciona para aba Pomodoro passando os params necessários no state do Router
        navigate('/pomodoro', { state: { categoryId, taskId } });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            <NextGoalCard categories={data.categories} simulados={data.simulados} onStartStudying={handleStartStudying} />
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
