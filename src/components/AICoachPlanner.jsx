import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, BrainCircuit, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

const DAYS = [
    { id: 'mon', label: 'SEG', full: 'Segunda',  gradient: 'from-violet-600 to-indigo-600',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25', text: 'text-violet-300',  dot: 'bg-violet-500',  over: 'bg-violet-500/10 border-violet-500/40', cardBg: 'bg-violet-500/[0.08]', cardBorder: 'border-violet-500/20', cardHover: 'hover:border-violet-500/40 hover:bg-violet-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(139,92,246,0.3)]' },
    { id: 'tue', label: 'TER', full: 'Terça',    gradient: 'from-sky-500 to-cyan-500',       bg: 'bg-sky-500/10',     border: 'border-sky-500/25',    text: 'text-sky-300',    dot: 'bg-sky-500',     over: 'bg-sky-500/10 border-sky-500/40',       cardBg: 'bg-sky-500/[0.08]',     cardBorder: 'border-sky-500/20',    cardHover: 'hover:border-sky-500/40 hover:bg-sky-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(14,165,233,0.3)]' },
    { id: 'wed', label: 'QUA', full: 'Quarta',   gradient: 'from-pink-500 to-rose-500',      bg: 'bg-pink-500/10',    border: 'border-pink-500/25',   text: 'text-pink-300',   dot: 'bg-pink-500',    over: 'bg-pink-500/10 border-pink-500/40',      cardBg: 'bg-pink-500/[0.08]',    cardBorder: 'border-pink-500/20',   cardHover: 'hover:border-pink-500/40 hover:bg-pink-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(236,72,153,0.3)]' },
    { id: 'thu', label: 'QUI', full: 'Quinta',   gradient: 'from-orange-500 to-amber-500',   bg: 'bg-orange-500/10',  border: 'border-orange-500/25', text: 'text-orange-300', dot: 'bg-orange-500',  over: 'bg-orange-500/10 border-orange-500/40',  cardBg: 'bg-orange-500/[0.08]',  cardBorder: 'border-orange-500/20', cardHover: 'hover:border-orange-500/40 hover:bg-orange-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)]' },
    { id: 'fri', label: 'SEX', full: 'Sexta',    gradient: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-500/10', border: 'border-emerald-500/25',text: 'text-emerald-300',dot: 'bg-emerald-500', over: 'bg-emerald-500/10 border-emerald-500/40',cardBg: 'bg-emerald-500/[0.08]', cardBorder: 'border-emerald-500/20',cardHover: 'hover:border-emerald-500/40 hover:bg-emerald-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]' },
    { id: 'sat', label: 'SAB', full: 'Sábado',   gradient: 'from-cyan-500 to-blue-500',      bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',   text: 'text-cyan-300',   dot: 'bg-cyan-500',    over: 'bg-cyan-500/10 border-cyan-500/40',      cardBg: 'bg-cyan-500/[0.08]',    cardBorder: 'border-cyan-500/20',   cardHover: 'hover:border-cyan-500/40 hover:bg-cyan-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)]' },
    { id: 'sun', label: 'DOM', full: 'Domingo',  gradient: 'from-rose-500 to-red-500',       bg: 'bg-rose-500/10',    border: 'border-rose-500/25',   text: 'text-rose-300',   dot: 'bg-rose-500',    over: 'bg-rose-500/10 border-rose-500/40',      cardBg: 'bg-rose-500/[0.08]',    cardBorder: 'border-rose-500/20',   cardHover: 'hover:border-rose-500/40 hover:bg-rose-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)]' },
];

import ReactDOM from 'react-dom';

const getPortalRoot = () => {
    let el = document.getElementById('dnd-portal');
    if (!el) {
        el = document.createElement('div');
        el.id = 'dnd-portal';
        // Make sure the portal sits on top of everything
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100%';
        el.style.zIndex = '999999';
        document.body.appendChild(el);
    }
    return el;
};

const TaskCard = React.memo(({ task, index, isBacklog, stableId, dayTheme, onStartPomodoro }) => {
    const sanitizeHtml = (str) => {
        if (typeof str !== 'string') return '';
        // Remove completely any HTML tags and their attributes to prevent literal XSS payloads from polluting the UI
        return str.replace(/<[^>]*>?/gm, '').trim();
    };

    const rawText = task.text || task.title || '';
    const fullText = sanitizeHtml(rawText) || rawText.replace(/</g, '').replace(/>/g, ''); // fallback se ficar vazio e não for html puro
    
    const parts = fullText.split(':');
    const hasDetails = parts.length > 1;

    let subject = hasDetails ? parts[0] : fullText;
    let actionPart = hasDetails ? parts.slice(1).join(':').trim() : 'Revisão Geral';
    subject = subject.replace(/Foco em /i, '').trim();

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

    const cardBg = !isBacklog && dayTheme ? dayTheme.cardBg : 'bg-white/[0.02]';
    const cardBorder = !isBacklog && dayTheme ? dayTheme.cardBorder : 'border-white/[0.05]';
    const accentColor = !isBacklog && dayTheme ? dayTheme.text : 'text-violet-300';
    const accentBorder = !isBacklog && dayTheme ? dayTheme.border : 'border-violet-500/30';
    const gradientLine = !isBacklog && dayTheme ? dayTheme.gradient : 'from-violet-600 to-indigo-600';

    return (
        <Draggable draggableId={stableId} index={index}>
            {(provided, snapshot) => {
                const child = (
                    <div 
                        ref={provided.innerRef} 
                        {...provided.draggableProps} 
                        {...provided.dragHandleProps} 
                        className={`pb-3 ${snapshot.isDragging ? 'z-[99999]' : ''}`}
                        style={provided.draggableProps.style}
                    >
                        <div className={`group relative p-3 sm:p-3.5 rounded-xl select-none overflow-hidden h-full border ${
                            snapshot.isDragging 
                                ? `bg-slate-900 border-2 ${accentBorder} shadow-lg scale-[1.02]` 
                                : `${cardBg} ${cardBorder} hover:border-white/10 transition-all duration-200`
                        }`}>
                            {!isBacklog && dayTheme && (
                                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradientLine} opacity-60`} />
                            )}

                            <div className="flex flex-col h-full relative z-10">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                                        isBacklog ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20' : `bg-black/30 ${accentColor} border-white/10`
                                    }`}>
                                        <div className={`w-1 h-1 rounded-full ${isBacklog ? (isPriority ? 'bg-amber-400' : 'bg-violet-400') : 'bg-current'} shrink-0`} />
                                        <span className="leading-[1.32] truncate">{displaySubject(subject)}</span>
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStartPomodoro?.(task);
                                        }}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${!isBacklog && dayTheme ? `${dayTheme.text} hover:bg-white/10` : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500 hover:text-white'}`}
                                    >
                                        <Play size={11} className="fill-current" />
                                    </button>
                                </div>

                                <div className="flex flex-col flex-1 justify-center gap-0.5">
                                    <h4 className="text-[12px] sm:text-[13px] font-semibold leading-[1.35] tracking-tight text-slate-100 group-hover:text-white">
                                        {displayTopic}
                                    </h4>
                                    {secondaryText && (
                                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                                            {secondaryText}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );

                if (snapshot.isDragging) {
                    return ReactDOM.createPortal(child, getPortalRoot());
                }

                return child;
            }}
        </Draggable>
    );
});

const DEFAULT_PLANNER = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export default function AICoachPlanner() {
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    const coachPlanner   = activeContest?.coachPlanner || DEFAULT_PLANNER;
    const coachPlan      = useMemo(() => activeContest?.coachPlan || [], [activeContest?.coachPlan]);

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
            const timer = setTimeout(() => {
                setColumns(getInitialColumns());
            }, 0);
            return () => clearTimeout(timer);
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
        
        if (destination.droppableId === 'backlog') {
            const assignedIds = new Set();
            Object.entries(updatedPlanner).forEach(([key, dayTasks]) => { 
                if (key !== 'backlog') {
                    dayTasks.forEach(t => { 
                        const sid = getSafeId(t); 
                        if (sid) assignedIds.add(sid); 
                    }); 
                }
            });
            
            const newCoachPlan = [
                ...finishList,
                ...(coachPlan || []).filter(t => assignedIds.has(getSafeId(t))) 
            ];
            
            setData(prev => {
                if (prev) {
                    prev.coachPlanner = updatedPlanner;
                    prev.coachPlan = newCoachPlan;
                }
            });
        } else {
            setData(prev => {
                if (prev) {
                    prev.coachPlanner = updatedPlanner;
                }
            });
        }
        setIsDragging(false);
    };

    const handleStartTask = (task, dayId) => {
        if (!task) return;
        
        let sessionTasks = [];
        if (dayId === 'backlog') {
            sessionTasks = columns.backlog || [];
        } else {
            sessionTasks = columns[dayId] || [];
        }

        let startIndex = sessionTasks.findIndex(t => getSafeId(t) === getSafeId(task));
        if (startIndex === -1) return;

        // FIX: Injetar o contexto do dia para a Store conseguir ler, mantendo toda a fila
        const sessionWithContext = sessionTasks.map(t => ({ ...t, sourceContext: dayId }));
        
        startNeuralSession(sessionWithContext, startIndex); 
        navigate('/pomodoro');
    };

    return (
        <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
            <div className="flex flex-col xl:flex-row gap-5">
                <div className="w-full xl:w-64 shrink-0">
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col h-full min-h-[400px] xl:min-h-[610px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.08]">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                <BrainCircuit size={15} className="text-violet-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-200">Sugestões</h3>
                                <p className="text-[8px] font-medium text-slate-500 tracking-widest">IA Coach</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                {columns.backlog.length}
                            </span>
                        </div>
                        <Droppable droppableId="backlog">
                            {(provided, snapshot) => (
                                <div className={`flex-1 flex flex-col gap-2 p-2 min-h-[200px] overflow-y-auto no-scrollbar border border-dashed border-white/10 rounded-xl bg-black/10 ${snapshot.isDraggingOver ? 'border-violet-500/50 bg-violet-500/5' : ''}`}>
                                    <div 
                                        ref={provided.innerRef} 
                                        {...provided.droppableProps} 
                                        className="flex flex-col h-full"
                                    >
                                        {columns.backlog.map((task, idx) => { const safeId = getSafeId(task); return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog onStartPomodoro={(t) => handleStartTask(t, 'backlog')} /> ; })}
                                        {provided.placeholder}
                                    </div>
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
                        <div className="pb-4 overflow-x-auto overflow-y-hidden no-scrollbar [touch-action:pan-x]">
                            <div className="flex gap-3 min-w-[1500px] min-h-[520px] pr-2">
                                {DAYS.map((day) => (
                                    <div key={day.id} className="flex-1 flex flex-col min-w-[195px]">
                                        <div className={`mb-4 rounded-2xl border ${day.border} ${day.bg} p-3.5 relative overflow-hidden`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-black tracking-[0.15em] ${day.text} uppercase`}>
                                                        {day.label}
                                                    </span>
                                                    <span className="text-[8px] font-medium text-slate-500 tracking-widest uppercase">Semana</span>
                                                </div>
                                                <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${day.text} bg-black/20 border ${day.border}`}>
                                                    {columns[day.id]?.length || 0}
                                                </div>
                                            </div>
                                        </div>
                                        <Droppable droppableId={day.id}>
                                            {(provided, snapshot) => (
                                                <div className={`flex-1 p-2 pt-3 rounded-lg border border-dashed transition-colors ${snapshot.isDraggingOver ? 'border-violet-500/60 bg-violet-500/5' : 'bg-black/10 border-white/[0.06] hover:border-white/10'}`}>
                                                    <div 
                                                        ref={provided.innerRef} 
                                                        {...provided.droppableProps} 
                                                        className="h-full flex flex-col min-h-[80px] gap-1"
                                                    >
                                                        {columns[day.id].map((task, idx) => { const safeId = getSafeId(task); return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog={false} dayTheme={day} onStartPomodoro={(t) => handleStartTask(t, day.id)} />; })}
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
