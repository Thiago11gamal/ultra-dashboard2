import React, { useState } from 'react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function Dashboard() {
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
    
    const setAppState = useAppStore(state => state.setAppState);
    const setData = useAppStore(state => state.setData);
    
    const { toggleTask, deleteTask, addCategory, deleteCategory, addTask, togglePriority } = useAppStore();
    const showToast = useToast();
    const navigate = useNavigate();
    
    const setGoalDate = (d) => setData(prev => ({ ...prev, user: { ...prev.user, goalDate: d } }));

    const [filter, setFilter] = useState('all');

    const handleStartStudying = (categoryId, taskId) => {
        // Redireciona para aba Pomodoro passando os params necessários no state do Router
        navigate('/pomodoro', { state: { categoryId, taskId } });
    };

    const [rescueList, setRescueList] = useState(() => typeof window !== 'undefined' ? window.__ULTRA_RESCUE_LIST : []);

    const handleRestoreBackup = (backup) => {
        console.log("[Rescue] Forçando restauração direta:", backup);
        if (backup && backup.data) {
            try {
                // SALVAMENTO DE EMERGÊNCIA (Direto no LocalStorage)
                const dataToSave = JSON.parse(JSON.stringify(backup.data));
                localStorage.setItem('ultra-dashboard-data', JSON.stringify(dataToSave));
                localStorage.setItem('ultra-dashboard-storage', JSON.stringify({ state: { appState: dataToSave }, version: 1 }));
                
                // Aplica no store atual
                setAppState(dataToSave);
                
                showToast(`Dados de ${new Date(backup.date).toLocaleDateString('pt-BR')} restaurados! Recarregando... ⏳`, 'success');
                
                setRescueList([]);
                delete window.__ULTRA_RESCUE_LIST;
                delete window.__ULTRA_RESCUE_CANDIDATE;

                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (err) {
                console.error("[Rescue] Falha crítica:", err);
                showToast("Erro ao restaurar. Tente novamente ou veja o console.", "error");
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {rescueList && rescueList.length > 0 && (
                <div className="glass p-6 border-2 border-purple-500/50 bg-purple-900/15 shadow-2xl shadow-purple-900/20">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4 border-b border-purple-500/20 pb-4">
                            <span className="text-4xl animate-pulse">💎</span>
                            <div>
                                <h3 className="text-2xl font-black text-white italic tracking-tight">CENTRO DE RECUPERAÇÃO ULTRA</h3>
                                <p className="text-purple-300 text-sm font-medium">Encontramos backups dos dias 10, 11 e 12 de Março. Qual você deseja restaurar?</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rescueList.map((item, idx) => (
                                <div key={idx} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl hover:border-purple-500/40 transition-all group">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-purple-400 transition-colors">Backup Local</span>
                                            <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold">Confiança: {item.score}</span>
                                        </div>
                                        <div>
                                          <p className="text-lg font-mono font-bold text-white">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                                          <p className="text-xs text-slate-400">Horário: {new Date(item.date).toLocaleTimeString('pt-BR')}</p>
                                        </div>
                                        
                                        <div className="flex gap-2 py-2 border-y border-white/5 my-1">
                                            <div className="flex-1 text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Matérias</p>
                                                <p className="text-sm font-black text-purple-400">{item.categoryCount || 0}</p>
                                            </div>
                                            <div className="w-px bg-white/5" />
                                            <div className="flex-1 text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Tarefas</p>
                                                <p className="text-sm font-black text-blue-400">{item.taskCount || 0}</p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleRestoreBackup(item)}
                                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-lg active:scale-95"
                                        >
                                            RESTAURAR ESTE 🚀
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[10px] text-slate-500 italic text-center">
                            Note: Restaurar um backup substituirá seus dados atuais na tela. Certifique-se de escolher a data correta.
                        </div>
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
