import React, { useState, useEffect, useMemo } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, ChevronRight, BrainCircuit, Zap, AlertTriangle, Flame, Sparkles, Lock, Unlock, RotateCcw, Loader2 } from 'lucide-react';
import { getCoachInsight, getBestTask } from '../utils/coachLogic';

// CORREÇÃO CRÍTICA: Proteção contra undefined no Painel IA
function AICoachPanel({ activeSubject, stats }) {
    const defaultInsight = {
        title: 'Sistema Ativo',
        text: 'Pronto para iniciar os seus ciclos de foco.',
        color: 'indigo',
        iconType: 'Brain'
    };
    
    // Fallback absoluto caso a função de inteligência crashe
    const insight = getCoachInsight(activeSubject, stats) || defaultInsight;

    const icons = {
        'Brain': <BrainCircuit size={42} strokeWidth={1.5} />,
        'Zap': <Zap size={42} strokeWidth={1.5} />,
        'Alert': <AlertTriangle size={42} strokeWidth={1.5} />
    };

    const colorMap = {
        red: {
            border: 'border-red-500/30',
            bg: 'bg-red-500/5',
            glow: 'shadow-red-500/10',
            text: 'text-red-400',
            accent: 'bg-red-400',
            gradient: 'from-red-500/20 via-red-500/5 to-transparent'
        },
        emerald: {
            border: 'border-emerald-500/30',
            bg: 'bg-emerald-500/5',
            glow: 'shadow-emerald-500/10',
            text: 'text-emerald-400',
            accent: 'bg-emerald-400',
            gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent'
        },
        indigo: {
            border: 'border-indigo-500/30',
            bg: 'bg-indigo-500/5',
            glow: 'shadow-indigo-500/10',
            text: 'text-indigo-400',
            accent: 'bg-indigo-400',
            gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent'
        }
    };

    const theme = colorMap[insight?.color] || colorMap.indigo;

    const formatText = (text) => {
        if (!text) return '';
        return text.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className={`font-black text-white ${theme.text} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>{part}</strong> : part
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative rounded-xl border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-xl p-8 mb-8 overflow-hidden group shadow-2xl`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40 pointer-events-none`} />

            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            <motion.div
                animate={{ top: ['-100%', '200%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className={`absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-20 pointer-events-none z-20`}
            />

            <div className="flex items-center gap-8 relative z-10">
                <div className="relative shrink-0">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className={`absolute inset-0 rounded-full blur-2xl ${theme.accent}`}
                    />
                    <div className={`relative w-20 h-20 rounded-3xl border ${theme.border} bg-black/40 flex items-center justify-center ${theme.text} shadow-inner`}>
                        {icons[insight?.iconType] || <BrainCircuit size={42} />}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            <Sparkles size={10} className={theme.text} />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Neural Core Active</span>
                        </div>
                        <div className={`h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent`} />
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight flex items-baseline gap-2">
                        {insight?.title || 'Analisando'}
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse`} />
                    </h3>

                    <p className="text-base text-slate-300 leading-relaxed font-medium">
                        {formatText(insight?.text)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// Focus Panel
function FocusPanel({ categories, activeSubject, onStartTask, stats }) {
    const recommendedTask = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        return getBestTask(categories);
    }, [categories]);

    const [isPanelLocked, setIsPanelLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelLocked');
            return saved !== null && saved !== 'undefined' ? JSON.parse(saved) : true;
        } catch { return true; }
    });

    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelPosition');
            return saved !== null && saved !== 'undefined' ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch { return { x: 0, y: 0 }; }
    });

    useEffect(() => {
        const checkPos = () => {
            if (uiPosition.x !== 0 || uiPosition.y !== 0) {
                const threshold = 100;
                if (Math.abs(uiPosition.x) > window.innerWidth / 2 + threshold ||
                    Math.abs(uiPosition.y) > window.innerHeight / 2 + threshold) {
                    setUiPosition({ x: 0, y: 0 });
                    localStorage.removeItem('focusPanelPosition');
                }
            }
        };
        window.addEventListener('resize', checkPos);
        return () => window.removeEventListener('resize', checkPos);
    }, [uiPosition]);

    const handleDragEnd = (event, info) => {
        const newPos = {
            x: uiPosition.x + info.offset.x,
            y: uiPosition.y + info.offset.y
        };
        setUiPosition(newPos);
        try {
            localStorage.setItem('focusPanelPosition', JSON.stringify(newPos));
        } catch (err) {}
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
            dragMomentum={true}
            dragElastic={0.1}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, zIndex: 100 }}
            className={`hidden xl:flex flex-col w-[520px] shrink-0 relative group p-2 ${!isPanelLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <div className="absolute -top-14 left-0 right-0 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-1">
                {!isPanelLocked && (
                    <button
                        onClick={resetPosition}
                        className="px-4 py-2 rounded-2xl bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800 transition-all shadow-2xl backdrop-blur-xl flex items-center gap-2"
                    >
                        <RotateCcw size={14} className="animate-spin-slow" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Resetar</span>
                    </button>
                )}
                <button
                    onClick={toggleLock}
                    className={`p-3 rounded-2xl transition-all duration-300 shadow-2xl backdrop-blur-xl border ${isPanelLocked
                        ? 'bg-slate-900/60 text-slate-500 border-white/5 hover:border-white/20 hover:text-slate-300'
                        : 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/40'
                        }`}
                >
                    {isPanelLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
            </div>

            <div className="h-[120px]" />

            <AICoachPanel activeSubject={activeSubject} stats={stats} />

            {recommendedTask && !activeSubject && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6 group/rec relative bg-[#0d0e1a] border border-indigo-500/20 rounded-xl p-7 backdrop-blur-2xl overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

                    <div className="flex items-center justify-between mb-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 flex items-center gap-2">
                            <Zap size={12} className="fill-indigo-400" /> Prioridade de ROI
                        </p>
                        <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-300 uppercase tracking-widest">
                            Ideal para Fluxo
                        </div>
                    </div>

                    <button
                        onClick={() => onStartTask(recommendedTask)}
                        className="w-full relative group/btn bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        <span className="truncate relative z-10">
                            INICIAR: {recommendedTask.text || recommendedTask.title || 'Mestra'}
                        </span>
                        <ChevronRight size={18} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                    </button>

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-white/5 border border-white/10">
                                {recommendedTask.catIcon || '📚'}
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px]">{recommendedTask.catName}</span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400/70 tracking-widest uppercase">Eficácia Máxima</span>
                    </div>
                </motion.div>
            )}

            <div className="bg-[#08090f]/80 border border-white/[0.06] rounded-xl p-8 backdrop-blur-md flex-1 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Próximas Ações</p>
                    </div>
                    {highPriorityTasks.length > 0 && (
                        <span className="text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-lg">
                            {highPriorityTasks.length} Pendentes
                        </span>
                    )}
                </div>

                {highPriorityTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mb-4">
                            <CheckCircle2 size={32} className="text-emerald-500/40" />
                        </div>
                        <p className="text-sm font-black text-slate-400 tracking-tight">Perímetro Limpo</p>
                        <p className="text-[10px] text-slate-600 uppercase font-bold mt-1">Nenhum risco de atraso detectado</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {highPriorityTasks.map((task, idx) => {
                            const isActive = activeSubject?.taskId === task.id;
                            return (
                                <motion.button
                                    key={task.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => onStartTask(task)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 group text-left relative overflow-hidden ${isActive
                                        ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-transparent group-hover:bg-white/10'}`} />

                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: `${task.catColor}15`, border: `1px solid ${task.catColor}30` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-black truncate tracking-tight ${isActive ? 'text-amber-400' : 'text-slate-200'}`}>
                                            {task.text || task.title}
                                        </p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">{task.catName}</p>
                                    </div>
                                    {isActive ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <Flame size={16} className="text-amber-400 animate-bounce" />
                                            <span className="text-[7px] font-black text-amber-500 uppercase">Ativo</span>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                            <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function Pomodoro() {
    const activeId = useAppStore(state => state.appState?.activeId);
    const contest = useAppStore(state => state.appState?.contests?.[activeId]);
    const categories = useAppStore(state => state.appState?.contests?.[activeId]?.categories || []);
    const settings = useAppStore(state => state.appState?.contests?.[activeId]?.settings || {});
    const studyLogs = useAppStore(state => state.appState?.contests?.[activeId]?.studyLogs || []);
    const user = useAppStore(state => state.appState?.contests?.[activeId]?.user || null);
    
    // Hidratação validada
    const isHydrated = !!activeId && !!contest;

    const setData = useAppStore(state => state.setData);
    const { handleUpdateStudyTime } = useAppStore();

    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();
    const completionTimeoutRef = React.useRef(null);

    const activeSubject = useAppStore(state => state.appState?.pomodoro?.activeSubject);
    const setPomodoroActiveSubject = useAppStore(state => state.setPomodoroActiveSubject);

    const currentSessions = useAppStore(state => state.appState?.pomodoro?.sessions) || 1;

    const userStats = useMemo(() => {
        if (!contest) return { pomodorosCompleted: currentSessions, consecutiveMinutes: 0, settings: null };

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        let consecutiveStudyMinutes = 0;
        const recentLogs = [...(studyLogs || [])]
            .filter(log => new Date(log.date || 0).getTime() >= startOfToday)
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        let lastTimeBoundary = now.getTime();

        for (const log of recentLogs) {
            const logEnd = new Date(log.date || 0).getTime();
            const gapInMinutes = Math.max(0, (lastTimeBoundary - logEnd) / (1000 * 60));

            if (gapInMinutes > 90) {
                break;
            }

            consecutiveStudyMinutes += (Number(log.minutes) || 0);
            lastTimeBoundary = logEnd - ((Number(log.minutes) || 0) * 60 * 1000);
        }

        return {
            pomodorosCompleted: currentSessions,
            consecutiveMinutes: consecutiveStudyMinutes,
            settings: settings,
            user: user
        };
    }, [currentSessions, contest, studyLogs, settings, user]);

    useEffect(() => {
        if (!activeSubject && location.state?.categoryId && location.state?.taskId) {
            const cat = categories?.find(c => c.id === location.state.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === location.state.taskId);
            if (cat && tsk) {
                useAppStore.getState().startPomodoroSession({
                    categoryId: cat.id,
                    taskId: tsk.id,
                    category: cat.name,
                    task: tsk.title || tsk.text || 'Estudo',
                    priority: tsk.priority,
                    source: location.state?.from || 'dashboard'
                });
            }
        }
    }, [location.state, categories, activeSubject]);

    // TOLERÂNCIA ALONGADA para a Válvula de Escape 
    useEffect(() => {
        let timeoutId;
        if (!isHydrated) {
            timeoutId = setTimeout(() => {
                showToast('Contexto pendente. Retornando ao Dashboard...', 'warning');
                navigate('/');
            }, 6000); 
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isHydrated, navigate, showToast]);

    useEffect(() => {
        return () => {
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
        };
    }, []);

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

    const handleStartTask = (task, forcedSessionId = null, source = 'neural_core') => {
        const sessionId = forcedSessionId || Date.now().toString();
        
        if (source === 'neural_core' && !useAppStore.getState().appState?.pomodoro?.neuralMode) {
            const highPriority = [];
            categories.forEach(cat => {
                (cat.tasks || []).filter(t => !t.completed && t.priority === 'high').forEach(t => {
                    highPriority.push({ ...t, categoryId: cat.id, catName: cat.name });
                });
            });
            
            const startIndex = highPriority.findIndex(t => t.id === task.id);
            useAppStore.getState().startNeuralSession(highPriority, startIndex !== -1 ? startIndex : 0);
        } else {
            useAppStore.getState().setPomodoroActiveSubject({
                categoryId: task.catId || task.categoryId,
                taskId: task.id,
                category: task.catName || task.category,
                task: task.text || task.title || 'Estudo',
                priority: task.priority,
                source: source,
                sessionInstanceId: sessionId
            });
        }
    };

    const handleFullCycleComplete = (totalMinutes = 0) => {
        const currentSubject = activeSubject || useAppStore.getState().appState?.pomodoro?.activeSubject;
        const { neuralMode } = useAppStore.getState().appState?.pomodoro || {};
        const advanceNeuralQueue = useAppStore.getState().advanceNeuralQueue;

        if (currentSubject) {
            showToast(`Série finalizada! ${totalMinutes} minutos salvos no histórico. 🚀💎`, 'success');

            if (neuralMode || currentSubject.source === 'neural_core') {
                const hasNext = advanceNeuralQueue();
                if (hasNext) {
                    showToast(`Sequenciando próxima meta do painel... ⚡`, 'info');
                    return; 
                } else {
                    showToast('Todas as ações concluídas! 🏆', 'success');
                    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
                    completionTimeoutRef.current = setTimeout(() => { 
                        useAppStore.getState().setPomodoroActiveSubject(null); 
                    }, 3000);
                    return;
                }
            }

            const isFromDashboard = currentSubject.source === 'dashboard';
            if (isFromDashboard) {
                if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
                completionTimeoutRef.current = setTimeout(() => { 
                    showToast('Missão Cumprida! Retornando ao centro de comando...', 'info');
                    handleExit(); 
                }, 3000);
                return;
            }

            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = setTimeout(() => { handleExit(); }, 3000);
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

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center p-12 min-h-screen bg-[#0a0f1e]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Sistema Neural...</p>
                    <p className="text-slate-600 font-medium text-[9px] text-center mt-2 max-w-[250px]">
                        Autenticando parâmetros de foco.<br/>Se não escolheu uma tarefa, voltaremos ao Dashboard em breve.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-0 flex items-start justify-center pt-2 pb-6 px-0">
            <div className="flex flex-col xl:flex-row gap-5 items-start justify-center w-full">
                <div className="w-full xl:max-w-[750px] min-w-0">
                    <PomodoroTimer
                        settings={settings}
                        activeSubject={activeSubject}
                        categories={categories || []}
                        onUpdateStudyTime={handleUpdateStudyTime}
                        onExit={handleExit}
                        onSessionComplete={handleSessionComplete}
                        onFullCycleComplete={handleFullCycleComplete}
                        defaultTargetCycles={1}
                        key={activeSubject?.sessionInstanceId || 'idle'}
                    />
                </div>

                <FocusPanel
                    categories={categories || []}
                    activeSubject={activeSubject}
                    onStartTask={handleStartTask}
                    stats={userStats}
                />
            </div>
        </div>
    );
}
