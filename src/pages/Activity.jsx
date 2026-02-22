import React, { useState } from 'react';
import { CalendarDays, RotateCcw, X } from 'lucide-react';
import { StreakDisplay, XPHistory, AchievementsGrid } from '../components/GamificationComponents';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';

export default function Activity() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const [showResetModal, setShowResetModal] = useState(false);

    const handleResetXP = () => {
        setData(prev => ({ ...prev, user: { ...prev.user, xp: 0, level: 1 } }));
        setShowResetModal(false);
        showToast('Nível e XP Resetados!', 'success');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {showResetModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowResetModal(false)}
                    />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">Resetar Dados Gamificados</h3>
                            <button onClick={() => setShowResetModal(false)}>
                                <X size={18} className="text-slate-400 hover:text-white transition-colors" />
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">Isto vai apagar todo o seu XP e Nível atual. Suas tarefas e histórico de estudos continuarão intactos.</p>
                        <button
                            className="w-full py-3 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded font-bold"
                            onClick={handleResetXP}
                        >
                            Confirmar Reset de Nível/XP
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 mb-2">
                <CalendarDays size={22} className="text-green-400" />
                <h1 className="text-2xl font-bold text-white">Atividade Pessoal</h1>
                <button
                    onClick={() => setShowResetModal(true)}
                    className="ml-auto flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-slate-400 rounded-lg hover:text-red-400 transition-colors text-sm"
                >
                    <RotateCcw size={16} /> Resetar XP
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <StreakDisplay studyLogs={data.studyLogs} />
                <XPHistory user={data.user} />
            </div>

            <div className="rounded-2xl p-6 border border-white/10 bg-slate-900/60 backdrop-blur-sm">
                <ActivityHeatmap studyLogs={data.studyLogs} />
            </div>

            <AchievementsGrid
                unlockedIds={data.user?.achievements || []}
                stats={{}}
            />
        </div>
    );
}
