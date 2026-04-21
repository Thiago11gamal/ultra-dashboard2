import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion';
/* eslint-enable no-unused-vars */
import { useAppStore } from '../store/useAppStore';
import { BrainCircuit, Calendar, GripVertical, Layers } from 'lucide-react';
import { getSafeId } from '../utils/idGenerator';

const DAYS = [
    { id: 'mon', label: 'SEG', full: 'Segunda',  gradient: 'from-violet-600 to-indigo-600',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25', text: 'text-violet-300',  dot: 'bg-violet-500',  over: 'bg-violet-500/8 border-violet-500/40'  },
    { id: 'tue', label: 'TER', full: 'Terça',    gradient: 'from-sky-500 to-cyan-500',       bg: 'bg-sky-500/10',     border: 'border-sky-500/25',    text: 'text-sky-300',    dot: 'bg-sky-500',     over: 'bg-sky-500/8 border-sky-500/40'        },
    { id: 'wed', label: 'QUA', full: 'Quarta',   gradient: 'from-pink-500 to-rose-500',      bg: 'bg-pink-500/10',    border: 'border-pink-500/25',   text: 'text-pink-300',   dot: 'bg-pink-500',    over: 'bg-pink-500/8 border-pink-500/40'      },
    { id: 'thu', label: 'QUI', full: 'Quinta',   gradient: 'from-orange-500 to-amber-500',   bg: 'bg-orange-500/10',  border: 'border-orange-500/25', text: 'text-orange-300', dot: 'bg-orange-500',  over: 'bg-orange-500/8 border-orange-500/40'  },
    { id: 'fri', label: 'SEX', full: 'Sexta',    gradient: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-500/10', border: 'border-emerald-500/25',text: 'text-emerald-300',dot: 'bg-emerald-500', over: 'bg-emerald-500/8 border-emerald-500/40'},
    { id: 'sat', label: 'SAB', full: 'Sábado',   gradient: 'from-cyan-500 to-blue-500',      bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',   text: 'text-cyan-300',   dot: 'bg-cyan-500',    over: 'bg-cyan-500/8 border-cyan-500/40'      },
    { id: 'sun', label: 'DOM', full: 'Domingo',  gradient: 'from-rose-500 to-red-500',       bg: 'bg-rose-500/10',    border: 'border-rose-500/25',   text: 'text-rose-300',   dot: 'bg-rose-500',    over: 'bg-rose-500/8 border-rose-500/40'      },
];

const TaskCard = ({ task, index, isBacklog, stableId, dayColor }) => {
    const fullText = task.text || task.title || '';
    const parts = fullText.split(':');
    let subject = parts.length > 1 ? parts[0] : fullText;
    let desc    = parts.length > 1 ? parts.slice(1).join(':').trim() : (isBacklog ? 'Revisão Geral' : '');
    subject = subject.replace(/Foco em /i, '').replace(/[^\w\s\u00C0-\u00FF()-]/g, '').trim();

    return (
        <Draggable draggableId={stableId} index={index}>
            {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`group relative p-2.5 mb-2 rounded-xl transition-all select-none ${snapshot.isDragging ? 'bg-[#1a1c2e] border-2 border-violet-500/70 shadow-2xl shadow-violet-900/40 scale-[1.03] rotate-1 z-50' : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'}`}>
                    {!isBacklog && dayColor && <div className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b ${dayColor}`} />}
                    <div className="flex items-start gap-1.5 pl-1">
                        <GripVertical size={12} className="text-slate-700 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[10px] font-black tracking-tight text-slate-200 uppercase leading-tight mb-0.5 truncate">{subject}</h4>
                            {desc && <p className="text-[9px] text-slate-500 font-medium leading-tight truncate">{desc}</p>}
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
    const [isDragging, setIsDragging] = useState(false);

    const getInitialColumns = React.useCallback(() => {
        const allAssignedIds = new Set();
        DAYS.forEach(d => (coachPlanner[d.id] || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
        const activeBacklog = (coachPlan || []).filter(t => { if (!t) return false; const sid = getSafeId(t); return !allAssignedIds.has(sid); });
        return { backlog: activeBacklog, mon: coachPlanner.mon || [], tue: coachPlanner.tue || [], wed: coachPlanner.wed || [], thu: coachPlanner.thu || [], fri: coachPlanner.fri || [], sat: coachPlanner.sat || [], sun: coachPlanner.sun || [] };
    }, [coachPlan, coachPlanner]);

    const [columns, setColumns] = useState(() => getInitialColumns());
    useEffect(() => { 
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!isDragging) setColumns(getInitialColumns()); 
    }, [getInitialColumns, isDragging]);

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
            const otherTasks = (coachPlan || []).filter(t => { const sid = getSafeId(t); return !assignedIds.has(sid) && !backlogIds.has(sid); });
            setData(prev => ({ ...prev, coachPlan: [...finishList, ...otherTasks] }));
        }
        setTimeout(() => setIsDragging(false), 50);
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
                                    className={`flex-1 rounded-xl p-1.5 transition-all min-h-[200px] relative overflow-hidden ${snapshot.isDraggingOver ? 'bg-violet-500/10' : ''}`}
                                >
                                    {snapshot.isDraggingOver && (
                                        <motion.div 
                                            initial={{ opacity: 0 }} 
                                            animate={{ opacity: 1 }} 
                                            className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" 
                                        />
                                    )}
                                    <div className="relative z-10">
                                        {columns.backlog.map((task, idx) => { const safeId = getSafeId(task); return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog /> ; })}
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
                                                        <motion.div 
                                                            initial={{ opacity: 0, scale: 0.95 }} 
                                                            animate={{ opacity: 1, scale: 1 }} 
                                                            className={`absolute inset-0 bg-gradient-to-br ${day.gradient} opacity-[0.07] pointer-events-none`} 
                                                        />
                                                    )}
                                                    <div className="relative z-10 h-full">
                                                        {columns[day.id].map((task, idx) => { const safeId = getSafeId(task); return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog={false} dayColor={day.gradient} />; })}
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
