import React, { useState, useEffect, useMemo } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, ChevronRight, BrainCircuit, Zap, AlertTriangle, Flame, Sparkles, Target, Lock, Unlock, RotateCcw } from 'lucide-react';
import { getCoachInsight, getBestTask } from '../utils/coachLogic';

// --- NOVO COMPONENTE: AI Productivity Coach ---
function AICoachPanel({ activeSubject, stats }) {
    const insight = getCoachInsight(activeSubject, stats);

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

    const theme = colorMap[insight.color] || colorMap.indigo;

    const formatText = (text) => {
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
            {/* Background Animated Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40 pointer-events-none`} />

            {/* Cyber Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            {/* Scanline Effect */}
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
                        {icons[insight.iconType] || <BrainCircuit size={42} />}
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
                        {insight.title}
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse`} />
                    </h3>

                    <p className="text-base text-slate-300 leading-relaxed font-medium">
                        {formatText(insight.text)}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// Focus Panel: Atualizado para incluir o AICoachPanel e manter a lista de prioridades
function FocusPanel({ categories, activeSubject, onStartTask, stats }) {
    const recommendedTask = useMemo(() => getBestTask(categories), [categories]);

    const [isPanelLocked, setIsPanelLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelLocked');
            return saved ? JSON.parse(saved) : true;
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
            dragMomentum={true}
            dragElastic={0.1}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, zIndex: 100 }}
            className={`hidden xl:flex flex-col w-[520px] shrink-0 relative group p-2 ${!isPanelLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* Controles de Painel */}
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

            {/* Recommended Action Card */}
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

            {/* Next Actions List */}
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
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const { updatePomodoroSettings, handleUpdateStudyTime } = useAppStore();

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
    }, [currentSessions, data]);

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
        <div className="min-h-0 flex items-start justify-center pt-2 pb-6 px-0">
            <div className="flex flex-col xl:flex-row gap-5 items-start justify-center w-full">
                {/* Timer Column */}
                <div className="w-full xl:max-w-[750px] min-w-0">
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
