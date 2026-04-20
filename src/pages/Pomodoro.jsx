import React, { useState, useEffect, useMemo } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import { useAppStore } from '../store/useAppStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, ChevronRight, BrainCircuit, Zap, AlertTriangle, Flame, Sparkles, Target, Lock, Unlock, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCoachInsight, getBestTask } from '../utils/coachLogic';

// --- NOVO COMPONENTE: AI Productivity Coach ---
function AICoachPanel({ activeSubject, stats }) {
    const insight = getCoachInsight(activeSubject, stats);

    const icons = {
        'Brain': <BrainCircuit size={48} />,
        'Zap': <Zap size={48} />,
        'Alert': <AlertTriangle size={48} />
    };

    const themeStyles = {
        red: "border-red-500/40 bg-gradient-to-br from-red-500/10 to-transparent text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
        emerald: "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        indigo: "border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 to-transparent text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    }[insight.color];

    const formatText = (text) => {
        return text.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-black text-white">{part}</strong> : part
        );
    };

    return (
        <div className={`group relative rounded-[32px] border overflow-hidden p-10 transition-all duration-700 ${themeStyles} mb-8`}>
            {/* Efeito Scanline */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[200%] -translate-y-[150%] group-hover:translate-y-[50%] transition-transform duration-[2000ms] ease-in-out pointer-events-none" />

            <div className="flex items-start gap-8 relative z-10">
                <div className="mt-1 animate-pulse-slow shrink-0">{icons[insight.iconType] || <BrainCircuit size={48} />}</div>
                <div>
                    <h4 className="text-[11px] uppercase font-black tracking-[0.3em] opacity-60 mb-3 flex items-center gap-1.5">
                        <SparklesIcon size={14} /> AI Productivity Coach
                    </h4>
                    <h3 className="text-xl font-black text-white mb-3 tracking-tight">{insight.title}</h3>
                    <p className="text-base opacity-90 leading-relaxed font-medium">{formatText(insight.text)}</p>
                </div>
            </div>
        </div>
    );
}

// Focus Panel: Atualizado para incluir o AICoachPanel e manter a lista de prioridades
function FocusPanel({ categories, activeSubject, onStartTask, stats }) {
    const recommendedTask = useMemo(() => getBestTask(categories), [categories]);

    const [isPanelLocked, setIsPanelLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelLocked');
            return saved ? JSON.parse(saved) : true; // Começa travado por padrão
        } catch { return true; }
    });

    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelPosition');
            return saved ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch { return { x: 0, y: 0 }; }
    });

    const handleDragEnd = (event, info) => {
        const newPos = {
            x: uiPosition.x + info.offset.x,
            y: uiPosition.y + info.offset.y
        };
        setUiPosition(newPos);
        try {
            localStorage.setItem('focusPanelPosition', JSON.stringify(newPos));
        } catch (err) { console.debug('Storage ignored', err); }
    };

    const toggleLock = () => {
        const newState = !isPanelLocked;
        setIsPanelLocked(newState);
        localStorage.setItem('focusPanelLocked', JSON.stringify(newState));
    };

    const resetPosition = () => {
        setUiPosition({ x: 0, y: 0 });
        localStorage.removeItem('focusPanelPosition');
    };

    const highPriorityTasks = useMemo(() => {
        const tasks = [];
        const recommendedId = recommendedTask?.id;

        (categories || []).forEach(cat => {
            (cat.tasks || []).filter(t => !t.completed && t.priority === 'high' && t.id !== recommendedId).forEach(t => {
                tasks.push({ ...t, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
            });
        });
        return tasks.slice(0, 5);
    }, [categories, recommendedTask]);

    return (
        <motion.div 
            drag={!isPanelLocked}
            dragMomentum={false}
            initial={uiPosition}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, zIndex: 100 }}
            className={`hidden xl:flex flex-col w-[480px] shrink-0 relative group p-1 ${!isPanelLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* Controles de Painel (Só aparecem no hover) */}
            <div className="absolute -top-12 left-0 right-0 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                {!isPanelLocked && (
                    <button
                        onClick={resetPosition}
                        className="p-2.5 rounded-xl bg-slate-800/90 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-700 transition-all shadow-xl backdrop-blur-md flex items-center gap-2"
                        title="Resetar Posição do Painel"
                    >
                        <RotateCcw size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Resetar</span>
                    </button>
                )}
                <button
                    onClick={toggleLock}
                    className={`p-2.5 rounded-xl transition-all duration-300 shadow-xl backdrop-blur-md border ${
                        isPanelLocked 
                        ? 'bg-slate-900/40 text-slate-500 border-white/5 hover:text-slate-300' 
                        : 'bg-indigo-600 text-white border-indigo-500'
                    }`}
                    title={isPanelLocked ? "Destravar Painel para Arrastar" : "Travar Painel na Posição"}
                >
                    {isPanelLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
            </div>

            {/* Espaçador de Alinhamento Inicial */}
            <div className="h-[140px]" />

            <AICoachPanel activeSubject={activeSubject} stats={stats} />

            {/* Recommended Action (ROI) */}
            {recommendedTask && !activeSubject && (
                <div className="mb-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                        <Target size={40} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-1.5">
                        <Sparkles size={10} /> Recomendação ROI
                    </p>
                    <button
                        onClick={() => onStartTask(recommendedTask)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                        <span className="truncate max-w-[90%]">
                            Estudar {recommendedTask.text || recommendedTask.title || 'Prioridade'}
                        </span>
                        <ChevronRight size={14} className="shrink-0" />
                    </button>
                    <p className="text-[10px] text-slate-400 mt-2 italic flex justify-between">
                        <span className="truncate mr-2">Cat: "{recommendedTask.catName}"</span>
                        <span className="shrink-0 font-bold text-indigo-400">↑ Maior ROI</span>
                    </p>
                </div>
            )}

            {/* High priority tasks */}
            <div className="bg-slate-900/80 border border-white/8 rounded-2xl p-4 backdrop-blur-sm flex-1">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">🔥 Próximas Ações</p>
                    {highPriorityTasks.length > 0 && (
                        <span className="text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                            {highPriorityTasks.length}
                        </span>
                    )}
                </div>

                {highPriorityTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-black/20 rounded-xl border border-white/5">
                        <CheckCircle2 size={32} className="text-emerald-500/40 mb-2" />
                        <p className="text-xs font-bold text-slate-500">
                            {recommendedTask && !activeSubject ? 'Nenhuma OUTRA tarefa urgente!' : 'Nenhuma tarefa urgente!'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {highPriorityTasks.map(task => {
                            const isActive = activeSubject?.taskId === task.id;
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onStartTask(task)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 group text-left ${isActive
                                            ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                            : 'bg-black/20 border-white/5 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                                        style={{ backgroundColor: `${task.catColor}22`, border: `1px solid ${task.catColor}44` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] font-bold truncate ${isActive ? 'text-amber-400' : 'text-slate-200'}`}>
                                            {task.text || task.title}
                                        </p>
                                        <p className="text-[9px] text-slate-500 truncate mt-0.5">{task.catName}</p>
                                    </div>
                                    {isActive ? (
                                        <Flame size={14} className="text-amber-400 shrink-0 animate-pulse" />
                                    ) : (
                                        <ChevronRight size={12} className="text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function Pomodoro() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const { updatePomodoroSettings, handleUpdateStudyTime, toggleTask } = useAppStore();

    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();

    const activeSubject = useAppStore(state => state.appState.pomodoro.activeSubject);
    const setPomodoroActiveSubject = useAppStore(state => state.setPomodoroActiveSubject);

    // CORREÇÃO 1: Pegar os ciclos atuais da sessão do store em vez do histórico all-time
    const currentSessions = useAppStore(state => state.appState.pomodoro.sessions) || 0;

    // Preparar dados do utilizador para passar ao Coach
    const userStats = useMemo(() => {
        if (!data) return { pomodorosCompleted: currentSessions, consecutiveMinutes: 0, settings: null };

        // Cálculo Inteligente de Fadiga Diária sem Amnésia
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        let consecutiveStudyMinutes = 0;
        const recentLogs = [...(data.studyLogs || [])]
            .filter(log => new Date(log.date || 0).getTime() >= startOfToday)
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()); // newest first
            
        let lastTimeBoundary = now.getTime();
        
        for (const log of recentLogs) {
            const logEnd = new Date(log.date || 0).getTime();
            const gapInMinutes = (lastTimeBoundary - logEnd) / (1000 * 60);
            
            // Se houve um hiato de descanso de mais de 90 minutos, a estafa resetou organicamente
            if (gapInMinutes > 90) {
                break;
            }
            
            consecutiveStudyMinutes += (Number(log.minutes) || 0);
            // O início dessa sessão de log marca a próxima fronteira
            lastTimeBoundary = logEnd - ((Number(log.minutes) || 0) * 60 * 1000); 
        }

        return {
            pomodorosCompleted: currentSessions,
            consecutiveMinutes: consecutiveStudyMinutes,
            settings: data.settings,
            user: data.user // 🎯 Injetar perfil do usuário para cálculo de fadiga elástica
        };
    }, [currentSessions, data.settings, data.studyLogs, data.user]);

    useEffect(() => {
        if (!activeSubject && location.state?.categoryId && location.state?.taskId) {
            const cat = data.categories?.find(c => c.id === location.state.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === location.state.taskId);
            if (cat && tsk) {
                useAppStore.getState().startPomodoroSession({
                    categoryId: cat.id,
                    taskId: tsk.id,
                    category: cat.name,
                    task: tsk.title || tsk.text || 'Estudo',
                    priority: tsk.priority
                });
            }
        }
    }, [location.state, data.categories, activeSubject]);

    const handleExit = () => {
        if (activeSubject) {
            setData(prev => ({
                ...prev,
                categories: prev.categories.map(c => c.id === activeSubject.categoryId ? {
                    ...c,
                    tasks: c.tasks.map(t => t.id === activeSubject.taskId ? { ...t, status: undefined } : t)
                } : c)
            }));
        }
        setPomodoroActiveSubject(null);
        const returnPath = location.state?.from ? `/${location.state.from}` : '/';
        navigate(returnPath);
    };

    const handleStartTask = (task) => {
        useAppStore.getState().startPomodoroSession({
            categoryId: task.catId,
            taskId: task.id,
            category: task.catName,
            task: task.text || task.title || 'Estudo',
            priority: task.priority
        });
    };

    const handleFullCycleComplete = () => {
        if (activeSubject) {
            // CORREÇÃO 2: Removida a chamada automática para toggleTask().
            // Tarefas de concurso são contínuas e não devem ser concluídas sozinhas pelo timer.
            showToast('Ciclo de foco finalizado! Elevando produtividade.', 'info');
            setTimeout(() => { handleExit(); }, 1000);
        } else {
            handleExit();
        }
    };

    const handleSessionComplete = () => {
        setData(prev => ({
            ...prev,
            lastPomodoroDate: new Date().toISOString()
        }));
    };

    if (!data) {
        return (
            <div className="flex items-center justify-center p-12">
                <p className="text-slate-400">Carregando dados...</p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-180px)] flex items-start justify-center pt-32 pb-10 px-4">
            <div className="flex gap-2 items-start justify-center w-full max-w-[1340px]">
                {/* Timer Column — No flex-1 to keep it tight with the side panel */}
                <div className="w-full xl:w-[850px] xl:shrink-0 min-w-0">
                    <PomodoroTimer
                        settings={data.settings}
                        onUpdateSettings={updatePomodoroSettings}
                        activeSubject={activeSubject}
                        categories={data.categories || []}
                        onStartStudying={() => { }}
                        onUpdateStudyTime={handleUpdateStudyTime}
                        onExit={handleExit}
                        onSessionComplete={handleSessionComplete}
                        onFullCycleComplete={handleFullCycleComplete}
                        defaultTargetCycles={1}
                        key={activeSubject?.sessionInstanceId || 'idle'}
                    />
                </div>

                {/* Side Panel — desktop only */}
                <FocusPanel
                    categories={data.categories || []}
                    activeSubject={activeSubject}
                    onStartTask={handleStartTask}
                    stats={userStats}
                />
            </div>
        </div>
    );
}

// Utilitário de Ícone
function SparklesIcon(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
    );
}
