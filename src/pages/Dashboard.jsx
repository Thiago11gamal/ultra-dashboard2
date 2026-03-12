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

    const [rescueCandidate, setRescueCandidate] = useState(() => typeof window !== 'undefined' ? window.__ULTRA_RESCUE_CANDIDATE : null);

    const handleForceRescue = () => {
        if (rescueCandidate) {
            setData(() => rescueCandidate.data);
            showToast('Dados restaurados com sucesso! 🎉', 'success');
            setRescueCandidate(null);
            delete window.__ULTRA_RESCUE_CANDIDATE;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {rescueCandidate && (
                <div className="glass p-6 border-2 border-purple-500/50 bg-purple-900/10 animate-bounce-subtle">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💎</span>
                            <div>
                                <h3 className="text-xl font-bold text-purple-200">Encontramos seus dados de "Direito"!</h3>
                                <p className="text-slate-400 text-sm">Detectamos um backup antigo no seu navegador que parece conter seus estudos.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleForceRescue}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:scale-105 transition-all"
                        >
                            Restaurar Agora 🚀
                        </button>
                    </div>
                </div>
            )}
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
