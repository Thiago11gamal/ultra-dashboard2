import React, { useState } from 'react';
import { CalendarDays, RotateCcw, X, Trophy, Target } from 'lucide-react';
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
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Modal de Reset Premium */}
            {showResetModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowResetModal(false)}
                    />
                    <div className="relative bg-slate-900 border border-red-500/20 rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-red-900/20 animate-fade-in">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-t-3xl" />
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <RotateCcw size={20} className="text-red-400" />
                                Resetar Dados Gamificados
                            </h3>
                            <button 
                                onClick={() => setShowResetModal(false)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400 hover:text-white" />
                            </button>
                        </div>
                        <p className="text-slate-300 mb-8 leading-relaxed">
                            Atenção: Isto vai apagar todo o seu <strong className="text-amber-400">XP e Nível atual</strong>. 
                            Suas tarefas e histórico de estudos continuarão intactos.
                        </p>
                        <div className="flex gap-4">
                            <button
                                className="flex-1 py-3 bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors rounded-xl font-semibold"
                                onClick={() => setShowResetModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="flex-1 py-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all rounded-xl font-bold shadow-lg shadow-red-500/10"
                                onClick={handleResetXP}
                            >
                                Confirmar Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cabeçalho Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-slate-900/30 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 shadow-inner">
                            <Trophy size={28} className="text-indigo-400" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                            Central de Atividade
                        </h1>
                    </div>
                    <p className="text-slate-400 ml-16 text-sm font-medium">Sua jornada de evolução, consistência e conquistas.</p>
                </div>
                
                <button
                    onClick={() => setShowResetModal(true)}
                    className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800/40 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl transition-all duration-300 text-sm font-semibold shadow-sm"
                >
                    <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" /> 
                    Resetar Progresso
                </button>
            </div>

            {/* Grid Principal: Layout inteligente e distribuído */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Coluna da Esquerda: Streak e XP (Ocupa 4/12 colunas) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-2 shadow-xl hover:border-white/10 transition-all">
                        <StreakDisplay studyLogs={data.studyLogs} />
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-2 shadow-xl hover:border-white/10 transition-all flex-1">
                        <XPHistory user={data.user} />
                    </div>
                </div>

                {/* Coluna da Direita: Mapa de Calor (Calendário) (Ocupa 8/12 colunas) */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex-1 flex flex-col relative transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                        {/* Brilho decorativo isolado para não dar clip (overflow-hidden) nos Tooltips das laterais */}
                        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                            <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transition-all duration-700 hover:bg-indigo-500/20" />
                        </div>
                        
                        <div className="p-6 relative z-10 flex flex-col flex-1">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
                                    <CalendarDays size={22} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">Mapa de Frequência</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Seu histórico de dedicação ao longo do tempo</p>
                                </div>
                            </div>
                            
                            {/* Ajuste importante: overflow visível para tooltips mas mantendo o inner shadow */}
                            <div className="flex-1 w-full bg-slate-950/40 rounded-2xl p-6 border border-white/5 shadow-inner">
                                <ActivityHeatmap studyLogs={data.studyLogs} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção Inferior: Galeria de Troféus */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative transition-all hover:border-white/20">
                {/* Isolando o overflow-hidden apenas para o brilho decorativo para não cortar os Tooltips */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                </div>
                
                <div className="p-8 relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/20">
                            <Target size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-100">Galeria de Troféus</h2>
                            <p className="text-sm text-slate-400 mt-1">Insígnias de desafios completados e marcos alcançados</p>
                        </div>
                    </div>
                    
                    <div>
                    <AchievementsGrid
                        unlockedIds={data.user?.achievements || []}
                        stats={(() => {
                            const studyLogs = data.studyLogs || [];
                            const validSimulados = (data.simuladoRows || []).filter(r => r.validated && r.total > 0 && r.correct !== undefined);
                            const totalQuestions = validSimulados.reduce((acc, r) => acc + Number(r.total), 0);
                            const totalCorrect = validSimulados.reduce((acc, r) => acc + Number(r.correct), 0);
                            
                            let studiedEarly = false;
                            let studiedLate = false;
                            let studiedWeekend = false;
                            let pomodorosToday = 0;
                            
                            const now = new Date();
                            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                            
                            studyLogs.forEach(log => {
                                const d = new Date(log.date);
                                const hr = d.getHours();
                                const day = d.getDay();
                                if (hr < 7) studiedEarly = true;
                                if (hr >= 23 || hr < 4) studiedLate = true;
                                if (day === 0 || day === 6) studiedWeekend = true;
                                
                                if (d.getTime() >= startOfToday) {
                                    pomodorosToday += (Number(log.minutes) || 0) / 25;
                                }
                            });
                    
                            return {
                                completedTasks: data.categories?.reduce((sum, c) => sum + (c.tasks?.filter(t => t.completed)?.length || 0), 0) || 0,
                                currentStreak: data.user?.streak || 0,
                                totalQuestions,
                                hasPerfectScore: validSimulados.some(r => Number(r.total) > 0 && Number(r.total) === Number(r.correct)),
                                accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
                                pomodorosCompleted: data.pomodorosCompleted || 0,
                                pomodorosToday: Math.floor(pomodorosToday),
                                studiedEarly,
                                studiedLate,
                                studiedWeekend,
                                subjectsStudied: new Set(studyLogs.filter(log => log.categoryId).map(log => log.categoryId)).size
                            };
                        })()}
                    />
                </div>
                </div>
            </div>
        </div>
    );
}
