import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, BrainCircuit, Calendar, GripVertical, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

const DAYS = [
    { id: 'mon', label: 'SEG', full: 'Segunda',  gradient: 'from-violet-600 to-indigo-600',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25', text: 'text-violet-300',  dot: 'bg-violet-500',  over: 'bg-violet-500/8 border-violet-500/40'  },
    { id: 'tue', label: 'TER', full: 'Terça',    gradient: 'from-sky-500 to-cyan-500',       bg: 'bg-sky-500/10',     border: 'border-sky-500/25',    text: 'text-sky-300',    dot: 'bg-sky-500',     over: 'bg-sky-500/8 border-sky-500/40'        },
    { id: 'wed', label: 'QUA', full: 'Quarta',   gradient: 'from-pink-500 to-rose-500',      bg: 'bg-pink-500/10',    border: 'border-pink-500/25',   text: 'text-pink-300',   dot: 'bg-pink-500',    over: 'bg-pink-500/8 border-pink-500/40'      },
    { id: 'thu', label: 'QUI', full: 'Quinta',   gradient: 'from-orange-500 to-amber-500',   bg: 'bg-orange-500/10',  border: 'border-orange-500/25', text: 'text-orange-300', dot: 'bg-orange-500',  over: 'bg-orange-500/8 border-orange-500/40'  },
    { id: 'fri', label: 'SEX', full: 'Sexta',    gradient: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-500/10', border: 'border-emerald-500/25',text: 'text-emerald-300',dot: 'bg-emerald-500', over: 'bg-emerald-500/8 border-emerald-500/40'},
    { id: 'sat', label: 'SAB', full: 'Sábado',   gradient: 'from-cyan-500 to-blue-500',      bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',   text: 'text-cyan-300',   dot: 'bg-cyan-500',    over: 'bg-cyan-500/8 border-cyan-500/40'      },
    { id: 'sun', label: 'DOM', full: 'Domingo',  gradient: 'from-rose-500 to-red-500',       bg: 'bg-rose-500/10',    border: 'border-rose-500/25',   text: 'text-rose-300',   dot: 'bg-rose-500',    over: 'bg-rose-500/8 border-rose-500/40'      },
];

const TaskCard = ({ task, index, isBacklog, stableId, dayColor, onStartPomodoro }) => {
    const fullText = task.text || task.title || '';
    const parts = fullText.split(':');
    const hasDetails = parts.length > 1;

    let subject = hasDetails ? parts[0] : fullText;
    let actionPart = hasDetails ? parts.slice(1).join(':').trim() : 'Revisão Geral';
    subject = subject.replace(/Foco em /i, '').replace(/[^\w\s\u00C0-\u00FF()-]/g, '').trim();

    // Clean up redundant priority labels for cleaner UI
    const isPriority = /\[PROTOCOLO PRIORITÁRIO\]/i.test(actionPart);
    actionPart = actionPart.replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '');

    let topicPart = '';
    const topicMatch = actionPart.match(/^\[(.*?)\]\s*(.*)/);
    if (topicMatch) {
        topicPart = topicMatch[1];
        actionPart = topicMatch[2].trim();
    }

    const displayTopic = topicPart || (actionPart !== 'Revisão Geral' ? actionPart : '');
    const secondaryText = (topicPart && actionPart !== topicPart) ? actionPart : '';

    return (
        <Draggable draggableId={stableId} index={index}>
            {(provided, snapshot) => (
                <div 
                    ref={provided.innerRef} 
                    {...provided.draggableProps} 
                    {...provided.dragHandleProps} 
                    className={`group relative p-4 sm:pt-5 sm:pb-5 sm:pr-5 sm:pl-6 mb-4 rounded-xl transition-all duration-500 select-none overflow-hidden ${
                        snapshot.isDragging 
                            ? 'bg-slate-900/90 border-2 border-violet-500/50 shadow-[0_20px_50px_rgba(139,92,246,0.3)] scale-[1.05] rotate-1 z-50 backdrop-blur-xl' 
                            : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-0.5'
                    }`}
                >
                    {!isBacklog && dayColor && (
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${dayColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    )}
                    
                    {/* Glossy background detail */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/[0.03] transition-all duration-700" />

                    <div className="flex flex-col gap-5 relative z-10">
                        <div className="flex items-start justify-between gap-3">
                            <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em] ${
                                isBacklog ? 'bg-violet-500/20 text-violet-200 border-violet-500/30' : 'bg-white/10 text-slate-200 border-white/10'
                            } border backdrop-blur-md shadow-sm w-fit max-w-[90%] flex-shrink-0 group-hover:border-white/20 transition-colors`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isBacklog ? (isPriority ? 'bg-amber-400 animate-pulse' : 'bg-violet-400') : 'bg-slate-400'} shrink-0`} />
                                <span className="leading-none truncate block drop-shadow-sm">{displaySubject(subject)}</span>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStartPomodoro?.(task);
                                }}
                                className="relative w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500 hover:text-white transition-all duration-300 shrink-0 shadow-lg group/play"
                            >
                                <div className="absolute inset-0 bg-violet-500 blur-md opacity-0 group-hover/play:opacity-20 transition-opacity" />
                                <Play size={14} className="fill-current relative z-10 translate-x-0.5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h4 className="text-[12px] font-black text-white leading-snug uppercase tracking-widest group-hover:text-violet-200 transition-colors" style={{ paddingLeft: '18px' }}>
                                {displayTopic}
                            </h4>
                            {secondaryText && (
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] line-clamp-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                    {secondaryText}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const DEFAULT_PLANNER = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export default function AICoachPlanner() {
    const activeContest  = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const coachPlanner   = activeContest?.coachPlanner || DEFAULT_PLANNER;
    const coachPlan      = useMemo(() => activeContest?.coachPlan || [], [activeContest?.coachPlan]);
    const updateCoachPlanner = useAppStore(state => state.updateCoachPlanner);
    const setData        = useAppStore(state => state.setData);
    const startNeuralSession = useAppStore(state => state.startNeuralSession);
    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);

    const getInitialColumns = React.useCallback(() => {
        const allAssignedIds = new Set();
        DAYS.forEach(d => (coachPlanner[d.id] || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
        const activeBacklog = (coachPlan || []).filter(t => { if (!t) return false; const sid = getSafeId(t); return !allAssignedIds.has(sid); });
        return { backlog: activeBacklog, mon: coachPlanner.mon || [], tue: coachPlanner.tue || [], wed: coachPlanner.wed || [], thu: coachPlanner.thu || [], fri: coachPlanner.fri || [], sat: coachPlanner.sat || [], sun: coachPlanner.sun || [] };
    }, [coachPlan, coachPlanner]);

    const [columns, setColumns] = useState(() => getInitialColumns());
    const currentHash = useMemo(() => JSON.stringify({ coachPlan, coachPlanner }), [coachPlan, coachPlanner]);

    useEffect(() => {
        if (!isDragging) {
            queueMicrotask(() => setColumns(getInitialColumns()));
        }
    }, [currentHash, isDragging, getInitialColumns]);

    const onDragEnd = (result) => {
        if (!result.destination) { setIsDragging(false); return; }
        const { source, destination } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) { setIsDragging(false); return; }
        
        const startCol = columns[source.droppableId];
        const finishCol = columns[destination.droppableId];
        const startList = Array.from(startCol);
        const [removed] = startList.splice(source.index, 1);
        const finishList = (source.droppableId === destination.droppableId) ? startList : Array.from(finishCol);
        finishList.splice(destination.index, 0, removed);

        const newCols = { ...columns, [source.droppableId]: startList, [destination.droppableId]: finishList };
        setColumns(newCols);

        const updatedPlanner = { ...coachPlanner };
        if (source.droppableId !== 'backlog') updatedPlanner[source.droppableId] = startList;
        if (destination.droppableId !== 'backlog') updatedPlanner[destination.droppableId] = finishList;
        updateCoachPlanner(updatedPlanner);

        if (destination.droppableId === 'backlog') {
            const assignedIds = new Set();
            Object.entries(updatedPlanner).forEach(([key, dayTasks]) => { if (key !== 'backlog') dayTasks.forEach(t => { const sid = getSafeId(t); if (sid) assignedIds.add(sid); }); });
            const backlogIds = new Set(finishList.map(f => getSafeId(f)));
            const newCoachPlan = (coachPlan || []).filter(t => { const sid = getSafeId(t); return !assignedIds.has(sid) || backlogIds.has(sid); });
            setData(prev => ({ ...prev, coachPlan: newCoachPlan }));
        }
        setIsDragging(false);
    };

    // BUG-02 FIX: Removed duplicate branches — both paths were identical
    const handleStartTask = (task) => {
        if (!task) return;
        startNeuralSession([task], 0);
        navigate('/pomodoro');
    };

    return (
        <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
            <div className="flex flex-col xl:flex-row gap-5">
                <div className="w-full xl:w-64 shrink-0">
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col h-full min-h-[400px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/[0.08]">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/5 group-hover:scale-110 transition-transform">
                                <BrainCircuit size={16} className="text-violet-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-200">Sugestões</h3>
                                <p className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">IA Coach</p>
                            </div>
                            <span className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-black py-1 px-2.5 rounded-lg backdrop-blur-sm">
                                {columns.backlog.length}
                            </span>
                        </div>
                        <Droppable droppableId="backlog">
                            {(provided, snapshot) => (
                                <div 
                                    ref={provided.innerRef} 
                                    {...provided.droppableProps} 
                                    className={`flex-1 flex flex-col gap-3 rounded-2xl p-4 transition-all min-h-[200px] relative overflow-visible ${snapshot.isDraggingOver ? 'bg-violet-500/10' : ''}`}
                                >
                                    {snapshot.isDraggingOver && (
                                        <div 
                                            className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" 
                                        />
                                    )}
                                    <div className="relative z-10 flex flex-col gap-3">
                                        {columns.backlog.map((task, idx) => { const safeId = getSafeId(task); return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog onStartPomodoro={(t) => handleStartTask(t, 'backlog')} /> ; })}
                                    </div>
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>

                <div className="w-full flex-1 min-w-0">
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 overflow-hidden flex flex-col h-full relative">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                        <div className="flex items-center justify-between mb-6 shrink-0 px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-transform">
                                    <Calendar size={16} className="text-indigo-400 shrink-0" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-200">Planejamento Semanal</h3>
                                    <p className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">Agenda do Aluno</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto pb-4">
                            <div className="flex gap-3 min-w-[1500px] min-h-[520px]">
                                {DAYS.map((day) => (
                                    <div key={day.id} className="flex-1 flex flex-col min-w-[195px]">
                                        <div className={`mb-5 rounded-2xl border ${day.border} ${day.bg} p-4 relative overflow-visible backdrop-blur-md group/header transition-all duration-500 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.05)]`}>
                                            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${day.gradient} opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex flex-col">
                                                    <span className={`text-[13px] font-black tracking-[0.2em] ${day.text} uppercase drop-shadow-md`}>
                                                        {day.label}
                                                    </span>
                                                    <span className="text-[7px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">Semana</span>
                                                </div>
                                                <div className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${day.bg} ${day.text} border ${day.border} shadow-lg backdrop-blur-sm group-hover/header:scale-110 transition-transform`}>
                                                    {columns[day.id]?.length || 0}
                                                </div>
                                            </div>
                                        </div>
                                        <Droppable droppableId={day.id}>
                                            {(provided, snapshot) => (
                                                <div 
                                                    ref={provided.innerRef} 
                                                    {...provided.droppableProps} 
                                                    className={`flex-1 p-3 pt-4 rounded-xl border-2 border-dashed transition-all duration-300 relative overflow-visible ${snapshot.isDraggingOver ? `${day.over} border-solid shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]` : 'bg-black/20 border-white/[0.05] hover:border-white/[0.09]'}`}
                                                >
                                                    {snapshot.isDraggingOver && (
                                                        <div 
                                                            className={`absolute inset-0 bg-gradient-to-br ${day.gradient} opacity-[0.07] pointer-events-none`} 
                                                        />
                                                    )}
                                                    <div className="relative z-10 h-full">
                                                        {columns[day.id].map((task, idx) => { const safeId = getSafeId(task); return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog={false} dayColor={day.gradient} onStartPomodoro={(t) => handleStartTask(t, day.id)} />; })}
                                                        {provided.placeholder}
                                                    </div>
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DragDropContext>
    );
}
