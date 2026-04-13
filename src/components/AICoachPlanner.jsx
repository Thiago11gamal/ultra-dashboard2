import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAppStore } from '../store/useAppStore';
import { BrainCircuit, Calendar, GripVertical, Info } from 'lucide-react';
import { getSafeId } from '../utils/idGenerator';

const DAYS = [
    { id: 'mon', label: 'Segunda', color: 'blue' },
    { id: 'tue', label: 'Terça', color: 'purple' },
    { id: 'wed', label: 'Quarta', color: 'pink' },
    { id: 'thu', label: 'Quinta', color: 'orange' },
    { id: 'fri', label: 'Sexta', color: 'emerald' },
    { id: 'sat', label: 'Sábado', color: 'cyan' },
    { id: 'sun', label: 'Domingo', color: 'rose' }
];

// Usando getSafeId importado de utils/idGenerator

// PASSO 2: TaskCard atualizado para receber stableId
const TaskCard = ({ task, index, isBacklog, stableId }) => {
    const fullText = task.text || task.title || "";
    const parts = fullText.split(':');
    let subject = parts.length > 1 ? parts[0] : fullText;
    let desc = parts.length > 1 ? parts.slice(1).join(':').trim() : (isBacklog ? "Revisão Geral" : "");

    subject = subject.replace(/Foco em /i, '').replace(/[^\w\s\u00C0-\u00FF()-]/g, '').trim();

    return (
        <Draggable draggableId={stableId} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`relative p-2.5 mb-2.5 rounded-xl transition-all shadow-sm group/task flex items-start gap-1.5 ${
                        snapshot.isDragging 
                            ? 'bg-slate-800 border-2 border-purple-500 shadow-xl shadow-purple-500/20 z-50 scale-105 rotate-1' 
                            : 'bg-slate-900/60 border border-white/5 hover:bg-slate-800 hover:border-white/10 hover:shadow-lg'
                    }`}
                >
                    <GripVertical size={13} className="text-slate-700 mt-1 shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] sm:text-[11px] font-black tracking-tight text-slate-200 uppercase leading-tight mb-0.5 truncate">{subject}</h4>
                        {desc && <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight truncate">{desc}</p>}
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const DEFAULT_PLANNER = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export default function AICoachPlanner() {
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const coachPlanner = activeContest?.coachPlanner || DEFAULT_PLANNER;
    const coachPlan = activeContest?.coachPlan || [];
    
    const updateCoachPlanner = useAppStore(state => state.updateCoachPlanner);
    const setData = useAppStore(state => state.setData);

    // FIX: Bloquear atualização externa durante o arrasto para evitar saltos na UI
    const [isDragging, setIsDragging] = useState(false);

    const getInitialColumns = React.useCallback(() => {
        const allAssignedIds = new Set();
        DAYS.forEach(d => {
            (coachPlanner[d.id] || []).forEach(t => {
                const sid = getSafeId(t);
                if (sid) allAssignedIds.add(sid);
            });
        });
        const activeBacklog = (coachPlan || []).filter(t => {
            if (!t) return false;
            const sid = getSafeId(t);
            return !allAssignedIds.has(sid);
        });

        return {
            backlog: activeBacklog,
            mon: coachPlanner.mon || [],
            tue: coachPlanner.tue || [],
            wed: coachPlanner.wed || [],
            thu: coachPlanner.thu || [],
            fri: coachPlanner.fri || [],
            sat: coachPlanner.sat || [],
            sun: coachPlanner.sun || []
        };
    }, [coachPlan, coachPlanner]);

    // Local state for the drag-and-drop to be extremely responsive
    const [columns, setColumns] = useState(() => getInitialColumns());

    // Effect for external sync only: triggered when prop or store changes.
    // BUG-SYNC: Only update if not mid-drag to prevent items from vanishing
    useEffect(() => {
        if (!isDragging) {
            setColumns(getInitialColumns());
        }
    }, [getInitialColumns, isDragging]);

    const onDragStart = () => setIsDragging(true);

    const onDragEnd = (result) => {
        // SE NÃO HOUVE DESTINO, CANCELA AQUI
        if (!result.destination) {
            setIsDragging(false);
            return;
        }

        const { source, destination } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            setIsDragging(false);
            return;
        }

        const startCol = columns[source.droppableId];
        const finishCol = columns[destination.droppableId];

        // Se movendo na mesma coluna
        if (startCol === finishCol) {
            const newColList = Array.from(startCol);
            const [removed] = newColList.splice(source.index, 1);
            newColList.splice(destination.index, 0, removed);

            const newCols = { ...columns, [source.droppableId]: newColList };
            setColumns(newCols);

            // Save to store
            if (source.droppableId !== 'backlog') {
                const updatedPlanner = { ...coachPlanner, [source.droppableId]: newColList };
                updateCoachPlanner(updatedPlanner);
            } else {
                // BUG-4 FIX: Persistir ordem do backlog no store global
                // Reconstruímos o coachPlan mantendo a nova ordem do backlog
                const assignedIds = new Set();
                Object.values(coachPlanner).forEach(day => day.forEach(t => {
                    const sid = getSafeId(t);
                    if (sid) assignedIds.add(sid);
                }));
                const assignedTasks = (coachPlan || []).filter(t => assignedIds.has(getSafeId(t)));
                setData(prev => ({ ...prev, coachPlan: [...newColList, ...assignedTasks] }));
            }
            
            // PASSO 4: Timeout mágico para evitar race condition
            setTimeout(() => {
                setIsDragging(false);
            }, 50);
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

        // Update Store
        const updatedPlanner = { ...coachPlanner };
        if (source.droppableId !== 'backlog') updatedPlanner[source.droppableId] = startList;
        if (destination.droppableId !== 'backlog') updatedPlanner[destination.droppableId] = finishList;
        
        updateCoachPlanner(updatedPlanner);

        // BUG-2 FIX: Sincronizar ordem global se a tarefa voltar para o Backlog
        if (destination.droppableId === 'backlog') {
            const assignedIds = new Set();
            Object.entries(updatedPlanner).forEach(([key, dayTasks]) => {
                if(key !== 'backlog') dayTasks.forEach(t => {
                    const sid = getSafeId(t);
                    if (sid) assignedIds.add(sid);
                });
            });
            const finishListIds = new Set(finishList.map(f => getSafeId(f)));
            const otherTasks = (coachPlan || []).filter(t => {
                const sid = getSafeId(t);
                return !assignedIds.has(sid) && !finishListIds.has(sid);
            });
            setData(prev => ({ ...prev, coachPlan: [...finishList, ...otherTasks] }));
        }

        // PASSO 4: Timeout mágico para evitar race condition
        setTimeout(() => {
            setIsDragging(false);
        }, 50);
    };

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                                    {columns.backlog.map((task, idx) => {
                                        const safeId = getSafeId(task);
                                        return (
                                            <TaskCard 
                                                key={safeId} 
                                                stableId={safeId} 
                                                task={task} 
                                                index={idx} 
                                                isBacklog={true} 
                                            />
                                        );
                                    })}
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
                <div className="w-full flex-1 min-w-0">
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 overflow-hidden flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-6 text-slate-400 shrink-0">
                            <div className="p-1.5 rounded-lg bg-slate-800 border border-white/5">
                                <Calendar size={14} className="text-purple-400" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Planeamento Semanal</h3>
                            <div className="ml-auto text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block italic">Arraste para organizar</div>
                        </div>

                        <div className="overflow-x-auto pb-4 custom-planner-scroll">
                            <div className="flex gap-4 min-w-[1300px] lg:min-w-[1400px] h-full min-h-[500px] lg:min-h-[600px]">
                                <style>{`
                                    .custom-planner-scroll::-webkit-scrollbar { height: 6px; }
                                    .custom-planner-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
                                    .custom-planner-scroll::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.2); border-radius: 10px; }
                                    .custom-planner-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.4); }
                                `}</style>
                                {DAYS.map(day => (
                                    <div key={day.id} className="flex-1 flex flex-col min-w-[180px] lg:min-w-[190px]">
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
                                                {columns[day.id].map((task, idx) => {
                                                    const safeId = getSafeId(task);
                                                    return (
                                                        <TaskCard 
                                                            key={safeId} 
                                                            stableId={safeId} 
                                                            task={task} 
                                                            index={idx} 
                                                            isBacklog={false} 
                                                        />
                                                    );
                                                })}
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
            </div>
        </DragDropContext>
    );
}
