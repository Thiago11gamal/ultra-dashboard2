import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAppStore } from '../store/useAppStore';
import { BrainCircuit, Calendar, GripVertical, Info } from 'lucide-react';

const DAYS = [
    { id: 'mon', label: 'Segunda', color: 'blue' },
    { id: 'tue', label: 'Terça', color: 'purple' },
    { id: 'wed', label: 'Quarta', color: 'pink' },
    { id: 'thu', label: 'Quinta', color: 'orange' },
    { id: 'fri', label: 'Sexta', color: 'emerald' },
    { id: 'sat', label: 'Sábado', color: 'cyan' },
    { id: 'sun', label: 'Domingo', color: 'rose' }
];

const TaskCard = ({ task, index, isBacklog }) => {
    // Basic text parsing
    const fullText = task.text || task.title || "";
    const parts = fullText.split(':');
    let subject = parts.length > 1 ? parts[0] : fullText;
    let desc = parts.length > 1 ? parts.slice(1).join(':').trim() : (isBacklog ? "Revisão Geral" : "");

    subject = subject.replace(/Foco em /i, '').replace(/[^\w\s\u00C0-\u00FF\-\(\)]/g, '').trim();

    // BUG FIX: react-beautiful-dnd breaks instantly if draggableId changes (e.g. relying on `index` across columns).
    // If task.id is absent, we generate a stable hash from its content to prevent it from vanishing on drop.
    const stableId = task.id || `fb-${subject.replace(/\s/g, '').substring(0, 10)}-${fullText.length}`;

    return (
        <Draggable draggableId={stableId} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`relative p-3 mb-3 rounded-xl transition-all shadow-sm group/task flex items-start gap-2 ${
                        snapshot.isDragging 
                            ? 'bg-slate-800 border-2 border-purple-500 shadow-xl shadow-purple-500/20 z-50 scale-105 rotate-1' 
                            : 'bg-slate-900/80 border border-white/5 hover:bg-slate-800 hover:border-white/20 hover:shadow-lg'
                    }`}
                >
                    <GripVertical size={14} className="text-slate-600 mt-0.5 shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-black tracking-wide text-slate-200 uppercase leading-snug mb-1">{subject}</h4>
                        {desc && <p className="text-[10px] text-slate-400 leading-relaxed truncate">{desc}</p>}
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const DEFAULT_PLANNER = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export default function AICoachPlanner({ coachPlan = [] }) {
    const coachPlanner = useAppStore(state => state.appState.coachPlanner) || DEFAULT_PLANNER;
    const updateCoachPlanner = useAppStore(state => state.updateCoachPlanner);


    // Local state for the drag-and-drop to be extremely responsive
    const [columns, setColumns] = useState({
        backlog: [],
        ...coachPlanner
    });

    useEffect(() => {
        // Compute backlog: original coachPlan minus items already in week days
        const allAssignedIds = new Set();
        DAYS.forEach(d => {
            (coachPlanner[d.id] || []).forEach(t => allAssignedIds.add(t.id));
        });

        const activeBacklog = coachPlan.filter(t => !allAssignedIds.has(t.id));

        setColumns({
            backlog: activeBacklog,
            mon: coachPlanner.mon || [],
            tue: coachPlanner.tue || [],
            wed: coachPlanner.wed || [],
            thu: coachPlanner.thu || [],
            fri: coachPlanner.fri || [],
            sat: coachPlanner.sat || [],
            sun: coachPlanner.sun || []
        });
    }, [coachPlan, coachPlanner]);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const startCol = columns[source.droppableId];
        const finishCol = columns[destination.droppableId];

        // Se movendo na mesma coluna
        if (startCol === finishCol) {
            const newColList = Array.from(startCol);
            const [removed] = newColList.splice(source.index, 1);
            newColList.splice(destination.index, 0, removed);

            const newCols = { ...columns, [source.droppableId]: newColList };
            setColumns(newCols);

            // Save to store only if it's a week day
            if (source.droppableId !== 'backlog') {
                const updatedPlanner = { ...coachPlanner, [source.droppableId]: newColList };
                updateCoachPlanner(updatedPlanner);
            }
            return;
        }

        // Movendo entre colunas
        const startList = Array.from(startCol);
        const [removed] = startList.splice(source.index, 1);
        const finishList = Array.from(finishCol);
        finishList.splice(destination.index, 0, removed);

        const newCols = {
            ...columns,
            [source.droppableId]: startList,
            [destination.droppableId]: finishList
        };
        setColumns(newCols);

        // Update Store (ignoring backlog changes as they're derived)
        const updatedPlanner = { ...coachPlanner };
        if (source.droppableId !== 'backlog') updatedPlanner[source.droppableId] = startList;
        if (destination.droppableId !== 'backlog') updatedPlanner[destination.droppableId] = finishList;
        
        updateCoachPlanner(updatedPlanner);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-col xl:flex-row gap-6">
                
                {/* BACKLOG COLUMN */}
                <div className="w-full xl:w-72 shrink-0">
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex flex-col h-full min-h-[400px]">
                        <div className="flex items-center gap-2 mb-4">
                            <BrainCircuit size={16} className="text-purple-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Sugestões (Foco)</h3>
                            <span className="ml-auto bg-slate-800 text-slate-400 text-[10px] py-0.5 px-2 rounded-full font-bold">
                                {columns.backlog.length}
                            </span>
                        </div>
                        
                        <Droppable droppableId="backlog">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 transition-colors rounded-xl p-1 -m-1 ${snapshot.isDraggingOver ? 'bg-slate-800/50' : ''}`}
                                >
                                    {columns.backlog.map((task, idx) => (
                                        <TaskCard key={task.id || `backlog-${idx}`} task={task} index={idx} isBacklog={true} />
                                    ))}
                                    {provided.placeholder}
                                    
                                    {columns.backlog.length === 0 && (
                                        <div className="text-center p-4 border border-dashed border-white/10 rounded-xl mt-2">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Todas as metas alocadas</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>

                {/* WEEK PLANNER */}
                <div className="w-full flex-1">
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 overflow-x-auto">
                        <div className="flex items-center gap-2 mb-6 text-slate-400">
                            <Calendar size={16} />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Calendário Semanal</h3>
                            <div className="ml-auto text-xs text-slate-500 italic hidden sm:block">Arraste as metas para planejar seu estudo</div>
                        </div>

                        <div className="flex gap-4 min-w-[1000px] h-full min-h-[500px] lg:min-h-[600px]">
                            {DAYS.map(day => (
                                <div key={day.id} className="flex-1 flex flex-col min-w-[140px]">
                                    {/* Column Header Design */}
                                    <div className="text-center py-2 px-1 mb-3 rounded-lg border border-white/5 bg-slate-950/50 shadow-inner">
                                        <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                            {day.label}
                                        </h4>
                                    </div>
                                    
                                    <Droppable droppableId={day.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex-1 min-h-[400px] lg:min-h-[500px] p-2 rounded-2xl border-2 border-dashed transition-all ${
                                                    snapshot.isDraggingOver ? 'bg-purple-500/5 border-purple-500/40' : 'bg-black/20 border-white/5 hover:border-white/10'
                                                }`}
                                            >
                                                {columns[day.id].map((task, idx) => (
                                                    <TaskCard key={task.id || `plan-${day.id}-${idx}`} task={task} index={idx} isBacklog={false} />
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </DragDropContext>
    );
}
