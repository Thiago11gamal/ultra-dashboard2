import React, { useState, useEffect, useMemo } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import { useAppStore } from '../store/useAppStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, Circle, Flame, Clock, Target, ChevronRight } from 'lucide-react';

// Focus Panel: shows pending high-priority tasks and session context
function FocusPanel({ categories, activeSubject, onStartTask }) {
    const highPriorityTasks = useMemo(() => {
        const tasks = [];
        (categories || []).forEach(cat => {
            (cat.tasks || []).filter(t => !t.completed && t.priority === 'high').forEach(t => {
                tasks.push({ ...t, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
            });
        });
        return tasks.slice(0, 6);
    }, [categories]);

    const allPending = useMemo(() => {
        let count = 0;
        (categories || []).forEach(cat => {
            count += (cat.tasks || []).filter(t => !t.completed).length;
        });
        return count;
    }, [categories]);

    const allCompleted = useMemo(() => {
        let count = 0;
        (categories || []).forEach(cat => {
            count += (cat.tasks || []).filter(t => t.completed).length;
        });
        return count;
    }, [categories]);

    const completionRate = allCompleted + allPending > 0
        ? Math.round((allCompleted / (allCompleted + allPending)) * 100)
        : 0;

    return (
        <div className="hidden xl:flex flex-col gap-4 w-72 shrink-0">
            {/* Daily Stats */}
            <div className="bg-slate-900/80 border border-white/8 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">📊 Hoje</p>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-amber-400">{allPending}</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Pendentes</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-emerald-400">{completionRate}%</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Completado</div>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
            </div>

            {/* High priority tasks */}
            <div className="bg-slate-900/80 border border-white/8 rounded-2xl p-4 backdrop-blur-sm flex-1">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">🔥 Alta Prioridade</p>
                    {highPriorityTasks.length > 0 && (
                        <span className="text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                            {highPriorityTasks.length}
                        </span>
                    )}
                </div>

                {highPriorityTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckCircle2 size={32} className="text-emerald-500/40 mb-2" />
                        <p className="text-xs font-bold text-slate-500">Nenhuma tarefa urgente!</p>
                        <p className="text-[10px] text-slate-600 mt-1">Ótimo ritmo 🎉</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {highPriorityTasks.map(task => {
                            const isActive = activeSubject?.taskId === task.id;
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onStartTask(task)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 group text-left ${
                                        isActive
                                            ? 'bg-amber-500/10 border-amber-500/40'
                                            : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15'
                                    }`}
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                                        style={{ backgroundColor: `${task.catColor}22`, border: `1px solid ${task.catColor}44` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-slate-200 truncate">{task.text || task.title}</p>
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

            {/* Tips */}
            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">💡 Dica de Foco</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    Escolha <strong className="text-slate-300">1 tarefa de alta prioridade</strong> e dedique todo o ciclo a ela. Foco profundo supera multitarefa.
                </p>
            </div>
        </div>
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
            const cat = data.categories?.find(c => c.id === activeSubject.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === activeSubject.taskId);
            if (tsk && !tsk.completed) {
                toggleTask(activeSubject.categoryId, activeSubject.taskId);
            }
            showToast('Ciclo de foco finalizado! Elevando produtividade.', 'info');
            setTimeout(() => { handleExit(); }, 1000);
        } else {
            handleExit();
        }
    };

    const handleSessionComplete = () => {
        setData(prev => ({
            ...prev,
            pomodorosCompleted: (prev.pomodorosCompleted || 0) + 1,
            lastPomodoroDate: new Date().toISOString()
        }));
    };

    return (
        <div className="min-h-[calc(100vh-180px)] flex items-start xl:items-center justify-center py-4">
            <div className="w-full max-w-6xl flex gap-8 items-start xl:items-center">
                {/* Timer — centered column */}
                <div className="flex-1 flex flex-col items-center justify-center">
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
                />
            </div>
        </div>
    );
}

