import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, BrainCircuit, Calendar, GripVertical, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { normalize } from '../utils/normalization';

const displaySubject = (name) => {
    if (!name) return '';
    const map = {
        'matematica': 'Matemática',
        'portugues': 'Português',
        'lingua portuguesa': 'Português',
        'ingles': 'Inglês',
        'ciencias': 'Ciências',
        'historia': 'História',
        'geografia': 'Geografia',
        'biologia': 'Biologia',
        'fisica': 'Física',
        'quimica': 'Química',
        'filosofia': 'Filosofia',
        'sociologia': 'Sociologia',
        'literatura': 'Literatura',
        'redacao': 'Redação',
        'informatica': 'Informática',
        'raciocinio logico': 'Raciocínio Lógico',
        'direito constitucional': 'Dir. Constitucional',
        'direito administrativo': 'Dir. Administrativo'
    };
    const norm = normalize(name);
    return map[norm] || (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
};

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
    let subject = parts.length > 1 ? parts[0] : fullText;
    let desc    = parts.length > 1 ? parts.slice(1).join(':').trim() : (isBacklog ? 'Revisão Geral' : '');
    subject = subject.replace(/Foco em /i, '').replace(/[^\w\s\u00C0-\u00FF()-]/g, '').trim();

    return (
        <Draggable draggableId={stableId} index={index}>
            {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`group relative p-8 mb-5 rounded-[2.5rem] transition-all select-none overflow-hidden ${snapshot.isDragging ? 'bg-[#1a1c2e] border-2 border-violet-500/70 shadow-2xl shadow-violet-900/40 scale-[1.03] rotate-1 z-50' : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/15 shadow-lg'}`}>
                    {!isBacklog && dayColor && <div className={`absolute left-0 top-6 bottom-6 w-[6px] rounded-full bg-gradient-to-b ${dayColor}`} />}
                    
                    <div className="flex flex-col gap-6 relative z-10">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                            <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] ${isBacklog ? 'bg-violet-500/30 text-violet-100 border-violet-500/40' : 'bg-white/15 text-slate-100 border-white/20'} border backdrop-blur-md ml-4 overflow-hidden shadow-lg`}>
                                <div className={`w-2 h-2 rounded-full ${isBacklog ? 'bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]' : 'bg-slate-300'} shrink-0`} />
                                <span className="leading-tight whitespace-normal break-words">{displaySubject(subject)}</span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStartPomodoro?.(task);
                                }}
                                className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 hover:bg-violet-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shrink-0 shadow-lg"
                            >
                                <Play size={14} className="fill-current" />
                            </button>
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

    const handleStartTask = (task, fromId) => {
        if (!task) return;
        if (fromId !== 'backlog') {
            startNeuralSession([task], 0);
            navigate('/pomodoro');
        } else {
            startNeuralSession([task], 0);
            navigate('/pomodoro');
        }
    };

    return (
        <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
            <div className="flex flex-col xl:flex-row gap-5">
                <div className="w-full xl:w-64 shrink-0">
                    <div className="bg-[#09090f] border border-white/[0.07] rounded-2xl p-4 flex flex-col h-full min-h-[400px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center"><BrainCircuit size={13} className="text-violet-400" /></div>
                            <div className="flex-1"><h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-300">Sugestões</h3></div>
                            <span className="bg-violet-500/15 text-violet-300 border border-violet-500/20 text-[10px] font-black py-0.5 px-2 rounded-md">{columns.backlog.length}</span>
                        </div>
                        <Droppable droppableId="backlog">
                            {(provided, snapshot) => (
                                <div 
                                    ref={provided.innerRef} 
                                    {...provided.droppableProps} 
                                    className={`flex-1 flex flex-col gap-3 rounded-xl p-4 transition-all min-h-[200px] relative overflow-visible ${snapshot.isDraggingOver ? 'bg-violet-500/10' : ''}`}
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
                    <div className="bg-[#09090f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden flex flex-col h-full relative">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                        <div className="flex items-center justify-between mb-5 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center"><Calendar size={13} className="text-indigo-400" /></div>
                                <div><h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-300">Planeamento Semanal</h3></div>
                            </div>
                        </div>
                        <div className="overflow-x-auto pb-4">
                            <div className="flex gap-3 min-w-[1500px] min-h-[520px]">
                                {DAYS.map((day) => (
                                    <div key={day.id} className="flex-1 flex flex-col min-w-[195px]">
                                        <div className={`mb-3 rounded-xl border ${day.border} ${day.bg} p-2.5 relative overflow-hidden`}>
                                            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${day.gradient} opacity-60`} />
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[11px] font-black tracking-[0.12em] ${day.text}`}>{day.label}</span>
                                                <div className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${day.bg} ${day.text} border ${day.border}`}>{columns[day.id]?.length || 0}</div>
                                            </div>
                                        </div>
                                        <Droppable droppableId={day.id}>
                                            {(provided, snapshot) => (
                                                <div 
                                                    ref={provided.innerRef} 
                                                    {...provided.droppableProps} 
                                                    className={`flex-1 p-2 rounded-xl border-2 border-dashed transition-all duration-300 relative overflow-hidden ${snapshot.isDraggingOver ? `${day.over} border-solid shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]` : 'bg-black/20 border-white/[0.05] hover:border-white/[0.09]'}`}
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
