# Código Completo do Coach AI

Este arquivo consolida todos os códigos (Componentes, Engine, Hooks, Utilities e Integrações LLM) relacionados ao ecossistema Coach AI.

## `src/components/AICoachPlanner.jsx`

```javascript
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Play, BrainCircuit, CalendarDays, GripVertical, Sparkles, Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { isSystemAlertTask, parseCoachTask } from '../utils/coachText';

// FIX (BUG-01): ID estável via WeakMap (Strict Mode safe)
const _taskIdWeakMap = new WeakMap();
let _coachTaskFallbackCounter = 0;
const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  if (task.id) return { ...task, id: task.id };
  const cached = _taskIdWeakMap.get(task);
  if (cached) return { ...task, id: cached };
  const stableId =
    getSafeId(task) ||
    `coach-task-fb-${++_coachTaskFallbackCounter}-${Date.now().toString(36)}`;
  _taskIdWeakMap.set(task, stableId);
  return { ...task, id: stableId };
};

// ⚠️ SEM "scale/rotate" no over e SEM backdrop-blur em nenhum painel:
// transform/backdrop-filter em ANCESTRAL quebra o position:fixed do dnd.
const DAYS = [
  { id: 'mon', label: 'SEG', full: 'Segunda', gradient: 'from-violet-600 to-indigo-600', text: 'text-violet-300', dot: 'bg-violet-500', headerBg: 'bg-violet-500/10', headerBorder: 'border-violet-500/25', over: 'border-violet-400/80 bg-violet-500/20 shadow-[inset_0_0_30px_rgba(139,92,246,0.15)]', cardBg: 'bg-violet-500/[0.07]', cardBorder: 'border-violet-500/20' },
  { id: 'tue', label: 'TER', full: 'Terça', gradient: 'from-sky-500 to-cyan-500', text: 'text-sky-300', dot: 'bg-sky-500', headerBg: 'bg-sky-500/10', headerBorder: 'border-sky-500/25', over: 'border-sky-400/80 bg-sky-500/20 shadow-[inset_0_0_30px_rgba(14,165,233,0.15)]', cardBg: 'bg-sky-500/[0.07]', cardBorder: 'border-sky-500/20' },
  { id: 'wed', label: 'QUA', full: 'Quarta', gradient: 'from-pink-500 to-rose-500', text: 'text-pink-300', dot: 'bg-pink-500', headerBg: 'bg-pink-500/10', headerBorder: 'border-pink-500/25', over: 'border-pink-400/80 bg-pink-500/20 shadow-[inset_0_0_30px_rgba(236,72,153,0.15)]', cardBg: 'bg-pink-500/[0.07]', cardBorder: 'border-pink-500/20' },
  { id: 'thu', label: 'QUI', full: 'Quinta', gradient: 'from-orange-500 to-amber-500', text: 'text-orange-300', dot: 'bg-orange-500', headerBg: 'bg-orange-500/10', headerBorder: 'border-orange-500/25', over: 'border-orange-400/80 bg-orange-500/20 shadow-[inset_0_0_30px_rgba(249,115,22,0.15)]', cardBg: 'bg-orange-500/[0.07]', cardBorder: 'border-orange-500/20' },
  { id: 'fri', label: 'SEX', full: 'Sexta', gradient: 'from-emerald-500 to-teal-500', text: 'text-emerald-300', dot: 'bg-emerald-500', headerBg: 'bg-emerald-500/10', headerBorder: 'border-emerald-500/25', over: 'border-emerald-400/80 bg-emerald-500/20 shadow-[inset_0_0_30px_rgba(16,185,129,0.15)]', cardBg: 'bg-emerald-500/[0.07]', cardBorder: 'border-emerald-500/20' },
  { id: 'sat', label: 'SAB', full: 'Sábado', gradient: 'from-cyan-500 to-blue-500', text: 'text-cyan-300', dot: 'bg-cyan-500', headerBg: 'bg-cyan-500/10', headerBorder: 'border-cyan-500/25', over: 'border-cyan-400/80 bg-cyan-500/20 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]', cardBg: 'bg-cyan-500/[0.07]', cardBorder: 'border-cyan-500/20' },
  { id: 'sun', label: 'DOM', full: 'Domingo', gradient: 'from-rose-500 to-red-500', text: 'text-rose-300', dot: 'bg-rose-500', headerBg: 'bg-rose-500/10', headerBorder: 'border-rose-500/25', over: 'border-rose-400/80 bg-rose-500/20 shadow-[inset_0_0_30px_rgba(244,63,94,0.15)]', cardBg: 'bg-rose-500/[0.07]', cardBorder: 'border-rose-500/20' },
];

const TaskCard = React.memo(({ task, index, isBacklog, stableId, dayTheme, categories = [], onStartPomodoro }) => {
  const rawText = typeof task?.text === 'string' ? task.text : (task?.title || '');
  const parsed = parseCoachTask({ ...task, text: rawText }, categories);
  const subject = parsed.subjectRaw;
  const isSrsCard = Boolean(task?.analysis?.reason?.includes('SRS') || rawText.includes('SRS'));
  const isSafeCard = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaosCard = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));
  const isPriority = parsed.priority === 'high' || isSrsCard || isSafeCard || isChaosCard;
  const topicLabel = parsed.topic || rawText;
  const secondaryText = parsed.action && parsed.action !== parsed.topic ? parsed.action : '';

  return (
    <Draggable draggableId={stableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={
            snapshot.isDragging 
              ? { ...provided.draggableProps.style, transition: 'none' } 
              : provided.draggableProps.style
          }
          className="outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 rounded-lg select-none"
        >
          <div
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
              paddingLeft: '1.25rem',
              boxShadow: snapshot.isDragging
                ? '0 20px 40px -10px rgba(0,0,0,0.85), 0 0 25px rgba(139,92,246,0.5)'
                : undefined,
            }}
            className={`group relative mb-2 rounded-lg border py-2.5 pr-2.5 select-none cursor-grab active:cursor-grabbing transition-colors duration-75 ${
              snapshot.isDragging
                ? 'border-violet-400 bg-[#161b2c] ring-2 ring-violet-400/40 z-[9999]'
                : isBacklog
                  ? 'border-white/[0.07] bg-[#12151f] hover:border-violet-400/30 hover:bg-[#161a28]'
                  : `${dayTheme.cardBorder} ${dayTheme.cardBg} hover:border-white/20`
            }`}
          >
            <span
              className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-gradient-to-b opacity-90 z-0 ${
                isBacklog
                  ? (isPriority ? 'from-amber-400 to-amber-500' : 'from-violet-500 to-indigo-500')
                  : dayTheme.gradient
              }`}
            />

            <div className="relative z-10 w-full flex flex-col h-full pl-0.5">
              {/* Cabeçalho: Matéria + Ações */}
              <div className="flex items-start justify-between gap-3 min-w-0 mt-1">
                <div className="flex items-start gap-1.5 flex-1 min-w-0 mt-0.5">
                  <div className={`w-1.5 h-1.5 shrink-0 rounded-full mt-[5px] ${isBacklog ? (isPriority ? 'bg-amber-400' : 'bg-violet-400') : 'bg-current'}`} />
                  <span className={`text-[9.5px] font-black uppercase tracking-[0.1em] leading-snug break-words ${isBacklog ? (isPriority ? 'text-amber-300' : 'text-violet-300') : dayTheme.text}`} title={displaySubject(subject, categories)}>
                    {displaySubject(subject, categories)}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-black/20 rounded-md border border-white/5 p-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onStartPomodoro?.(task, isBacklog ? 'backlog' : dayTheme?.id); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label={`Iniciar estudo: ${displaySubject(subject, categories)}`}
                    title="Estudar agora no Pomodoro"
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                      !isBacklog && dayTheme
                        ? `${dayTheme.text} bg-white/5 hover:bg-white/15 hover:scale-110`
                        : 'bg-violet-500/15 text-violet-300 hover:bg-violet-500 hover:text-white hover:scale-110'
                    }`}
                  >
                    <Play size={8} className="fill-current ml-0.5" />
                  </button>
                  <div className="w-4 h-5 flex items-center justify-center cursor-grab text-slate-500 hover:text-slate-300 transition-colors pointer-events-none">
                    <GripVertical size={11} className="pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Tópico Principal e Secundário (Alinhados com o texto da matéria) */}
              <div className="mt-4 flex flex-col gap-1 pl-3">
                <h4 className="text-[11px] sm:text-[12px] font-bold leading-normal text-slate-100 break-words tracking-normal">
                  {topicLabel}
                </h4>
                {secondaryText && (
                  <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium leading-relaxed break-words">
                    {secondaryText}
                  </p>
                )}
              </div>

              {/* Rodapé (Tags Especiais) */}
              {isSrsCard && (
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center pl-3">
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    SRS
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}, (prev, next) => {
  return prev.stableId === next.stableId &&
         prev.index === next.index &&
         prev.isBacklog === next.isBacklog &&
         prev.dayTheme?.id === next.dayTheme?.id;
});

export default function AICoachPlanner({ plannerData: propPlannerData, categories: propCategories, onStartPomodoro: propOnStart }) {
  const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
  const categories = propCategories || activeContest?.categories || [];
  const defaultCoachPlan = useMemo(() => [], []);
  const defaultCoachPlanner = useMemo(() => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }), []);
  const rawCoachPlanner = propPlannerData || activeContest?.coachPlanner || defaultCoachPlanner;
  const rawCoachPlan = activeContest?.coachPlan || defaultCoachPlan;

  const coachPlanner = useMemo(() => {
    const normalized = {};
    for (const [key, val] of Object.entries(rawCoachPlanner)) {
      normalized[key] = Array.isArray(val) ? val.map(ensureCoachTaskId) : Object.values(val || {}).map(ensureCoachTaskId);
    }
    return normalized;
  }, [rawCoachPlanner]);

  const coachPlan = useMemo(
    () => (Array.isArray(rawCoachPlan) ? rawCoachPlan : Object.values(rawCoachPlan || {})).map(ensureCoachTaskId),
    [rawCoachPlan]
  );

  const setData = useAppStore(state => state.setData);
  const startNeuralSession = useAppStore(state => state.startNeuralSession);
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(animation);
  }, []);

  // Tracking global do ponteiro durante o drag para acender colunas imediatamente
  useEffect(() => {
    if (!isDragging) {
      setHoveredCol(null);
      return;
    }
    
    // Cache the bounding boxes once at the start of the drag to prevent extreme layout thrashing (lag)
    const cols = Array.from(document.querySelectorAll('[data-col-id]'));
    const cachedRects = cols.map(col => ({
      id: col.getAttribute('data-col-id'),
      rect: col.getBoundingClientRect()
    }));

    let animationFrameId;
    const updateHover = (clientX, clientY) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        let found = null;
        for (const { id, rect } of cachedRects) {
          if (clientX >= rect.left && clientX <= rect.right &&
              clientY >= rect.top && clientY <= rect.bottom) {
            found = id;
            break;
          }
        }
        setHoveredCol(prev => prev !== found ? found : prev);
      });
    };

    const handleMouseMove = (e) => updateHover(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      if (touch) updateHover(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]);

  const getInitialColumns = useCallback(() => {
    const allAssignedIds = new Set();
    DAYS.forEach(d => (coachPlanner[d.id] || []).forEach(t => {
      const sid = getSafeId(t);
      if (sid) allAssignedIds.add(sid);
    }));
    const activeBacklog = (coachPlan || [])
      .map(ensureCoachTaskId)
      .filter(t => {
        if (!t) return false;
        if (isSystemAlertTask(t)) return false;
        const sid = getSafeId(t);
        return !allAssignedIds.has(sid);
      });
    const cleanCol = (arr) => (Array.isArray(arr) ? arr.filter(Boolean).map(ensureCoachTaskId) : []);
    return {
      backlog: cleanCol(activeBacklog),
      mon: cleanCol(coachPlanner.mon), tue: cleanCol(coachPlanner.tue),
      wed: cleanCol(coachPlanner.wed), thu: cleanCol(coachPlanner.thu),
      fri: cleanCol(coachPlanner.fri), sat: cleanCol(coachPlanner.sat),
      sun: cleanCol(coachPlanner.sun)
    };
  }, [coachPlan, coachPlanner]);

  const [columns, setColumns] = useState(() => getInitialColumns());
  const columnsRef = useRef(columns);
  const skipResetCountRef = useRef(0);

  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => {
    if (!isDragging) {
      if (skipResetCountRef.current > 0) { skipResetCountRef.current--; return; }
      setColumns(getInitialColumns());
    }
  }, [coachPlan, coachPlanner, getInitialColumns, isDragging]);

  const onDragEnd = (result) => {
    setIsDragging(false);
    skipResetCountRef.current = 2;
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const currentCols = columnsRef.current;
    const startCol = currentCols[source.droppableId] || [];
    const finishCol = currentCols[destination.droppableId] || [];
    const startList = Array.from(startCol);
    const [removed] = startList.splice(source.index, 1);
    if (!removed) return;
    const finishList = (source.droppableId === destination.droppableId) ? startList : Array.from(finishCol);
    finishList.splice(destination.index, 0, removed);

    const newCols = { ...currentCols, [source.droppableId]: startList, [destination.droppableId]: finishList };
    setColumns(newCols);

    const systemAlerts = (coachPlan || []).filter(t => t && isSystemAlertTask(t));
    const newCoachPlan = [
      ...systemAlerts,
      ...(newCols.backlog || []),
      ...(newCols.mon || []), ...(newCols.tue || []), ...(newCols.wed || []),
      ...(newCols.thu || []), ...(newCols.fri || []), ...(newCols.sat || []), ...(newCols.sun || [])
    ];

    setData(prev => {
      if (!prev) return prev;
      const freshPlanner = { ...(prev.coachPlanner || {}) };
      Object.keys(freshPlanner).forEach(day => { freshPlanner[day] = [...(freshPlanner[day] || [])]; });
      if (source.droppableId !== 'backlog') freshPlanner[source.droppableId] = startList;
      if (destination.droppableId !== 'backlog') freshPlanner[destination.droppableId] = finishList;
      return { coachPlanner: freshPlanner, coachPlan: newCoachPlan };
    });
  };

  const handleStartTask = useCallback((task, dayId) => {
    if (propOnStart) { propOnStart(task, dayId); return; }
    if (!task) return;
    const cols = columnsRef.current;
    const sessionTasks = dayId === 'backlog' ? (cols.backlog || []) : (cols[dayId] || []);
    const startIndex = sessionTasks.findIndex(t => {
      const idT = getSafeId(t); const idTask = getSafeId(task);
      if (idT && idTask) return idT === idTask;
      return t === task || (t.title && t.title === task.title);
    });
    if (startIndex === -1) {
      startNeuralSession([{ ...task, sourceContext: dayId || 'isolated' }], 0);
      navigate('/pomodoro');
      return;
    }
    startNeuralSession(sessionTasks.map(t => ({ ...t, sourceContext: dayId })), startIndex);
    navigate('/pomodoro');
  }, [startNeuralSession, navigate, propOnStart]);

  const weekTotal = DAYS.reduce((acc, d) => acc + (columns[d.id] || []).length, 0);

  if (!enabled) return null;

  return (
    <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
      <div className="flex flex-col xl:flex-row gap-4 items-stretch mt-6 w-full">

        {/* ================= BACKLOG ================= */}
        <div 
          className="w-full xl:w-72 2xl:w-80 shrink-0 flex flex-col"
          data-col-id="backlog"
        >
          {/* FIX: SEM backdrop-blur (backdrop-filter quebra o fixed do dnd) */}
          <div className="bg-[#0d111b]/95 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col flex-1 min-h-[380px] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <Droppable droppableId="backlog">
              {(provided, snapshot) => {
                const isHighlight = hoveredCol ? (hoveredCol === 'backlog') : snapshot.isDraggingOver;
                return (
                <div className={`flex-1 flex flex-col transition-colors duration-75 ${isHighlight ? 'bg-white/5 shadow-xl rounded-lg p-1' : ''}`}>
                  <div className={`flex items-center gap-2 mb-3 pb-2.5 border-b transition-colors duration-75 ${isHighlight ? 'border-violet-400/50' : 'border-white/[0.08]'}`}>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-75 shrink-0 ${isHighlight ? 'bg-violet-500/30 border-violet-400/60 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-violet-500/15 border border-violet-500/30'}`}>
                      <BrainCircuit size={15} className={`transition-colors ${isHighlight ? 'text-violet-200' : 'text-violet-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xs font-black uppercase tracking-[0.16em] transition-colors ${isHighlight ? 'text-white' : 'text-slate-200'}`}>Sugestões</h3>
                      <p className={`text-[9px] font-semibold tracking-wider transition-colors ${isHighlight ? 'text-violet-300' : 'text-slate-400'}`}>IA Coach</p>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all duration-75 shrink-0 ${isHighlight ? 'bg-violet-500/30 text-white border-violet-400/60' : 'bg-violet-500/15 text-violet-300 border-violet-500/30'}`}>
                      {(columns.backlog || []).length}
                    </span>
                  </div>

                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    role="list"
                    aria-label="Sugestões de tarefas não alocadas"
                    className={`flex-1 flex flex-col p-2 rounded-lg border border-dashed transition-all duration-75 overflow-y-auto max-h-[580px] custom-scrollbar ${
                      isHighlight
                        ? 'border-violet-400/80 bg-violet-500/20 shadow-[inset_0_0_30px_rgba(139,92,246,0.15)] ring-1 ring-violet-400/30'
                        : 'bg-black/20 border-white/[0.08]'
                    }`}
                  >
                    {(columns.backlog || []).filter(Boolean).map((task, idx) => {
                      const safeId = getSafeId(task) || `backlog-${idx}`;
                      return (
                        <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog categories={categories} onStartPomodoro={handleStartTask} />
                      );
                    })}
                    {provided.placeholder}
                    {(columns.backlog || []).length === 0 && (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto">
                        <Sparkles size={20} className="mb-2 text-violet-400/50" />
                        <p className="text-xs font-medium text-slate-400">Tudo distribuído!</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Arraste itens de volta se quiser reorganizar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}}
            </Droppable>
          </div>
        </div>

        {/* ================= SEMANA ================= */}
        <div className="w-full flex-1 min-w-0 flex flex-col">
          {/* FIX: SEM backdrop-blur aqui também */}
          <div className="bg-[#0d111b]/95 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col flex-1 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <CalendarDays size={15} className="text-indigo-400" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-200">Planejamento Semanal</h3>
                  <p className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase">Agenda do Aluno</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shrink-0">
                {weekTotal} tarefa{weekTotal === 1 ? '' : 's'} na semana
              </span>
            </div>

            <div className="w-full overflow-x-auto kanban-scrollbar pb-2 pt-1 flex-1 flex flex-col">
              <div className="flex gap-3 min-w-[900px] xl:min-w-0 w-full flex-1">
                {DAYS.map((day) => {
                  const dayTasks = columns[day.id] || [];
                  return (
                    <div 
                      key={day.id} 
                      className="flex-1 min-w-[130px] xl:min-w-0 flex flex-col"
                      data-col-id={day.id}
                    >
                      <Droppable droppableId={day.id}>
                        {(provided, snapshot) => {
                          const isHighlight = hoveredCol ? (hoveredCol === day.id) : snapshot.isDraggingOver;
                          return (
                          <div className={`flex-1 flex flex-col p-1 rounded-lg transition-colors duration-75 ${isHighlight ? 'bg-white/5 shadow-xl' : ''}`}>
                            <div className={`mb-2 rounded-lg border transition-all duration-75 ${
                              isHighlight ? `${day.over} shadow-[0_0_15px_rgba(255,255,255,0.05)]` : `${day.headerBorder} ${day.headerBg}`
                            } p-2 relative overflow-hidden`}>
                              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${day.gradient} opacity-70`} />
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-xs sm:text-[13px] font-black tracking-wider ${day.text} uppercase pb-[1px] transition-transform duration-75 truncate ${isHighlight ? 'scale-105 origin-left' : ''}`}>{day.label}</span>
                                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 capitalize mt-0.5 leading-none truncate">{day.full}</span>
                                </div>
                                <div className={`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${day.text} bg-black/30 border shrink-0 transition-colors duration-75 ${isHighlight ? day.over : day.headerBorder}`}>
                                  {dayTasks.length}
                                </div>
                              </div>
                            </div>

                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              role="list"
                              aria-label={`Tarefas de ${day.full}`}
                              className={`flex-1 p-1.5 rounded-lg border border-dashed transition-all duration-75 flex flex-col min-h-[160px] max-h-[580px] overflow-y-auto kanban-scrollbar ${
                                isHighlight
                                  ? `${day.over} ring-1 ring-white/20`
                                  : 'bg-black/20 border-white/[0.08] hover:border-white/15'
                              }`}
                            >
                              {dayTasks.filter(Boolean).map((task, idx) => {
                                const safeId = getSafeId(task) || `${day.id}-${idx}`;
                                return (
                                  <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog={false} dayTheme={day} categories={categories} onStartPomodoro={handleStartTask} />
                                );
                              })}
                              {provided.placeholder}
                              {dayTasks.length === 0 && !snapshot.isDraggingOver && (
                                <div className={`w-full flex-1 min-h-[100px] flex flex-col items-center justify-center gap-1 border border-dashed ${day.headerBorder} opacity-40 rounded-lg p-2 text-center my-auto bg-black/10`}>
                                  <Inbox size={14} className={day.text} />
                                  <span className={`text-[9px] font-semibold tracking-wider uppercase ${day.text} opacity-70`}>Arraste aqui</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
```

## `src/components/AICoachView.jsx`

```javascript
import React, { useMemo, useState, useCallback } from 'react';
import {
  Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download,
  Loader2, Compass, Trash2, LayoutGrid, List, Target,
  AlertCircle, Trophy, Activity
} from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { useToast } from '../hooks/useToast';
import { isSystemAlertTask, parseCoachTask, RX_BOLD } from '../utils/coachText';
import { toFiniteNumber } from '../utils/coachSafe';
import { toProbPct, clampFinite } from '../utils/measurement';

const getMcProbPct = (task) => {
  return clampFinite(
    toProbPct(
      task?.analysis?.monteCarlo?.probabilityPct ??
      task?.analysis?.monteCarlo?.probabilityRaw ??
      task?.analysis?.monteCarlo?.probability
    ),
    0,
    100,
    0
  );
};

// FIX (BUG-04): protege edge cases — '**' isolado, inner vazio, fragmentos vazios
function renderBoldText(text) {
  const safeText = String(text || '');
  if (!safeText.trim()) return null;
  const parts = safeText.split(RX_BOLD).filter(Boolean);
  return parts
    .map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const inner = part.slice(2, -2).trim();
        if (!inner) return null;
        return (
          <strong key={`bold-${idx}`} className="text-white font-black">
            {inner}
          </strong>
        );
      }
      const cleaned = part.replace(/\*\*/g, '');
      return cleaned ? (
        <React.Fragment key={`bold-${idx}`}>{cleaned}</React.Fragment>
      ) : null;
    })
    .filter(Boolean);
}

// FIX (BUG-16): helper de match em escopo de módulo (evita recriação por render)
const matchesTask = (t, task) => {
  const idT = getSafeId(t);
  const idTask = getSafeId(task);
  if (idT && idTask) return idT === idTask;
  return t === task || (t.title && t.title === task.title);
};

const CARD_COLORS = [
  { accent: 'border-l-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', glow: 'from-violet-900/20', btnHover: 'hover:bg-violet-600 hover:text-white hover:border-violet-500 hover:shadow-[0_0_20px_-3px_rgba(139,92,246,0.4)]' },
  { accent: 'border-l-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', glow: 'from-cyan-900/20', btnHover: 'hover:bg-cyan-600 hover:text-white hover:border-cyan-500 hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.4)]' },
  { accent: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', glow: 'from-emerald-900/20', btnHover: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]' },
  { accent: 'border-l-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20', glow: 'from-rose-900/20', btnHover: 'hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.4)]' },
  { accent: 'border-l-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', glow: 'from-amber-900/20', btnHover: 'hover:bg-amber-500 hover:text-amber-950 hover:border-amber-400 hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.4)]' },
];

function AICoachCard({ task, idx, categories, onStartPomodoro, maxScore = 100 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullText = task?.text || task?.title || '';
  const parsed = parseCoachTask({ ...task, text: fullText }, categories);
  const subjectPart = parsed.subject;
  const isSystemAlert = parsed.isSystemAlert;
  const isSrsTask = Boolean(task?.analysis?.reason?.includes('SRS') || task?.text?.includes('SRS'));
  const isSafeTask = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaosTask = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));
  const isPriority = parsed.priority === 'high' || isSrsTask || isSafeTask || isChaosTask;
  const systemAlertMessage = isSystemAlert ? (parsed.action || parsed.topic) : null;
  const displayAssunto = parsed.topic;
  const displayMeta = parsed.action && parsed.action !== parsed.topic ? parsed.action : null;
  const col = CARD_COLORS[idx % CARD_COLORS.length];
  const mcProbPct = getMcProbPct(task);
  const hasProb = mcProbPct > 0 || task.analysis?.monteCarlo?.probability != null;
  const safeProb = hasProb ? mcProbPct : null;
  const safeVol = toFiniteNumber(task.analysis?.monteCarlo?.volatility, 0);
  const safeMax = Number(maxScore) > 0 ? Number(maxScore) : 100;
  const highVolThreshold = 8 * (safeMax / 100);
  const isHighVol = safeVol > highVolThreshold;
  const isCompleted = parsed.isCompleted;
  const isStudying = parsed.isStudying;
  const isSrs = isSrsTask;
  const isSafe = isSafeTask;
  const isChaos = isChaosTask;
  return (
    // FIX (BUG-12): h-full para cards de altura uniforme no grid items-stretch
    <div
      className={`group relative flex flex-col h-full p-5 sm:p-7 rounded-3xl bg-[#0a0c14] border transition-all duration-100 overflow-hidden shadow-2xl hover:border-white/10 ${
        isCompleted
          ? 'opacity-75 border-emerald-500/20 border-l-4 sm:border-l-8 border-l-emerald-500'
          : isPriority
          ? 'border-rose-500/30 border-l-4 sm:border-l-8 border-l-rose-500 shadow-[0_0_40px_-10px_rgba(225,29,72,0.15)]'
          : `border-white/[0.06] border-l-4 sm:border-l-8 ${col.accent}`
      }`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] via-[#0a0c14]/0 to-transparent ${isPriority ? 'from-rose-900/30' : col.glow}`} />
      {isPriority && !isCompleted && (
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-rose-600/20 blur-[80px] rounded-full pointer-events-none animate-pulse" />
      )}
      <div className="relative z-10 grid grid-cols-[1fr_auto] items-start mb-5 gap-4">
        <div className="flex flex-col items-start gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${col.badge} shadow-lg backdrop-blur-md border max-w-full shrink-0`}>
              <div className={`w-2 h-2 rounded-full ${col.dot} shadow-[0_0_12px_rgba(255,255,255,0.4)] shrink-0`} />
              {/* PATCH: title tooltip */}
              <span
                className="leading-[1.32] truncate min-w-0 block"
                title={displaySubject(subjectPart, categories)}
              >
                {displaySubject(subjectPart, categories)}
              </span>
            </div>
            {isCompleted ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                <span>✓ Concluído</span>
              </div>
            ) : isStudying ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse shrink-0">
                <span>⚡ Em Estudo</span>
              </div>
            ) : isPriority ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500/10 text-rose-300 border border-rose-500/30 shrink-0">
                <span>⚡ Alta Prioridade</span>
              </div>
            ) : null}
            {isSrs && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-sky-500/10 text-sky-300 border border-sky-500/30 shrink-0">
                <span>🧠 Flashcard SRS</span>
              </div>
            )}
            {isSafe && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                <span>🛡️ Manutenção</span>
              </div>
            )}
            {isChaos && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                <span>⚡ Oscilação</span>
              </div>
            )}
          </div>
        </div>
        {/* PATCH: min-w-[40px] em vez de w-10 h-10 sm:w-auto */}
        <button
          onClick={(e) => { e.stopPropagation(); onStartPomodoro(task); }}
          aria-label={`Iniciar sessão de estudo: ${displaySubject(subjectPart, categories)}`}
          className={`shrink-0 flex items-center gap-2 rounded-xl border min-w-[40px] h-10 px-3 sm:px-4 transition-all duration-150 shadow-xl group/btn hover:scale-105 active:scale-95 justify-center ${
            isPriority
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_25px_-5px_rgba(225,29,72,0.6)] animate-[pulse_3s_ease-in-out_infinite]'
              : `bg-white/[0.03] border-white/[0.08] text-slate-300 ${col.btnHover}`
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Iniciar</span>
          <Play size={13} fill="currentColor" className="transition-colors" />
        </button>
      </div>
      <div className="relative z-10 flex-1 mb-5">
        {systemAlertMessage ? (
          <h4 className="text-sm sm:text-base font-extrabold text-amber-300 tracking-tight leading-snug">
            ⚠️ {renderBoldText(systemAlertMessage)}
          </h4>
        ) : (
          <>
            {displayAssunto && (
              <h4 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                {renderBoldText(displayAssunto)}
              </h4>
            )}
            {displayMeta && (
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl font-medium">
                {renderBoldText(displayMeta)}
              </p>
            )}
          </>
        )}
      </div>
      {(safeProb !== null || safeVol > 0) && (
        <div className={`relative z-10 grid ${safeProb !== null && safeVol > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-5`}>
          {safeProb !== null && (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center justify-between z-10 relative">
                <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400/80">Probabilidade</span>
                <span className="font-mono text-xs font-bold text-indigo-300">{Math.round(safeProb)}%</span>
              </div>
              <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] rounded-full transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, safeProb))}%` }} />
              </div>
            </div>
          )}
          {safeVol > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center justify-between z-10 relative">
                <span className={`text-[9px] font-black tracking-widest uppercase ${isHighVol ? 'text-amber-400/80' : 'text-slate-400'}`}>Volatilidade</span>
                <span className={`font-mono text-xs font-bold ${isHighVol ? 'text-amber-300' : 'text-slate-300'}`}>
                  {safeVol > 0 && safeVol < 0.5 ? '<1' : `±${Math.round(safeVol)}`}
                </span>
              </div>
              <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                <div className={`h-full rounded-full transition-all duration-200 ${isHighVol ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-slate-500'}`} style={{ width: `${Math.min(100, Math.max(0, (safeVol / (0.2 * safeMax)) * 100))}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
      {task.analysis && (
        <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.04]">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all duration-150 outline-none focus:outline-none ${isExpanded ? 'bg-indigo-500/[0.04] border-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <BrainCircuit size={12} className="text-indigo-400" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isExpanded ? 'text-indigo-300' : 'text-slate-400'}`}>
                Análise do Coach
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-150 ${isExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`} />
          </button>
          <AnimatePresence>
            {isExpanded && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 pb-2 space-y-3 w-full">
                  <div className="w-full text-[11px] sm:text-xs text-indigo-200/80 leading-relaxed bg-indigo-500/[0.04] p-3 sm:p-4 rounded-xl border border-indigo-500/10 font-medium whitespace-pre-wrap break-words shadow-[inset_0_0_20px_rgba(99,102,241,0.03)] font-mono tracking-tight overflow-hidden">
                    {renderBoldText(task.analysis.reason)}
                  </div>
                  {task.analysis.metrics && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(task.analysis.metrics).map(([key, value], idx) => (
                        <div key={`metric-${key}-${idx}`} className="bg-indigo-500/[0.03] border border-indigo-500/10 px-3 py-2 rounded-xl flex flex-col gap-0.5">
                          <span className="text-[8px] text-indigo-400/60 uppercase tracking-widest font-black">{key}</span>
                          <span className="text-[10px] font-mono text-indigo-200">
                            {(value === null || value === undefined) ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.analysis.monteCarlo?.calibrationPenalty >= 0.005 && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                      <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                          Ajuste de Calibração: -{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%
                        </span>
                        <span className="text-[10px] text-amber-500/70 font-medium leading-relaxed">
                          Você está errando sistematicamente a dificuldade nesta matéria. Reduzimos a projeção temporariamente.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function AICoachView({ suggestedFocus, onGenerateGoals, loading, onClearHistory }) {
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('planner');
  const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
  const categories = useMemo(() => {
    const rawCategories = activeContest?.categories;
    return Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
  }, [activeContest?.categories]);
  const safeMaxScore = Number(activeContest?.maxScore) > 0 ? Number(activeContest.maxScore) : 100;
  const coachPlanner = useMemo(() => {
    const raw = activeContest?.coachPlanner || {};
    const normalized = {};
    for (const [key, val] of Object.entries(raw)) {
      normalized[key] = Array.isArray(val) ? val : Object.values(val || {});
    }
    return normalized;
  }, [activeContest?.coachPlanner]);
  const coachPlanRaw = useMemo(() => {
    const raw = activeContest?.coachPlan || [];
    return Array.isArray(raw) ? raw : Object.values(raw || {});
  }, [activeContest?.coachPlan]);
  const systemAlerts = useMemo(() => {
    const alerts = coachPlanRaw.filter(task => isSystemAlertTask(task?.text || task?.title || ''));
    const uniqueAlertsMap = new Map();
    alerts.forEach(alert => {
      const key = alert.categoryId || alert.subjectName || alert.id;
      if (!uniqueAlertsMap.has(key)) {
        uniqueAlertsMap.set(key, alert);
      }
    });
    return Array.from(uniqueAlertsMap.values());
  }, [coachPlanRaw]);
  const actionableTasks = useMemo(
    () => coachPlanRaw.filter(task => !isSystemAlertTask(task?.text || task?.title || '')),
    [coachPlanRaw]
  );
  const coachPlan = actionableTasks;
  const unallocatedCards = useMemo(() => {
    if (!coachPlan || coachPlan.length === 0) return [];
    const allAssignedIds = new Set();
    Object.values(coachPlanner).forEach(dayTasks => {
      (dayTasks || []).forEach(t => {
        const sid = getSafeId(t);
        if (sid) allAssignedIds.add(sid);
      });
    });
    return coachPlan.filter(task => !allAssignedIds.has(getSafeId(task)));
  }, [coachPlan, coachPlanner]);

  // FIX (BUG-16): mapa de localização O(1) para handleStartNeural
  const taskLocationMap = useMemo(() => {
    const map = new Map();
    const register = (tasks, source) => {
      (tasks || []).forEach((t, index) => {
        const id = getSafeId(t);
        if (id && !map.has(id)) map.set(id, { tasks, index, source });
      });
    };
    register(unallocatedCards, 'backlog');
    Object.entries(coachPlanner).forEach(([day, tasks]) => register(tasks, day));
    register(coachPlan, 'plan');
    return map;
  }, [unallocatedCards, coachPlanner, coachPlan]);

  const startNeuralSession = useAppStore(state => state.startNeuralSession);
  const navigate = useNavigate();
  const showToast = useToast();

  // FIX (BUG-08/16): lookup O(1) via taskLocationMap, com fallback por título e isolado
  const handleStartNeural = useCallback((task, sourceContextHint) => {
    const startWith = (tasks, index, source) => {
      const session = (tasks || []).map(t => ({ ...t, sourceContext: source }));
      startNeuralSession(session, index);
      navigate('/pomodoro');
    };

    if (sourceContextHint) {
      const hintTasks = sourceContextHint === 'backlog'
        ? unallocatedCards
        : (coachPlanner[sourceContextHint] || []);
      const hintIndex = hintTasks.findIndex(t => matchesTask(t, task));
      if (hintIndex !== -1) {
        startWith(hintTasks, hintIndex, sourceContextHint);
        return;
      }
    }

    const id = getSafeId(task);
    const found = id ? taskLocationMap.get(id) : null;
    if (found) {
      startWith(found.tasks, found.index, found.source);
      return;
    }

    // fallback por título (quando ids estão ausentes)
    for (const [day, tasks] of Object.entries(coachPlanner)) {
      const idx = (tasks || []).findIndex(t => matchesTask(t, task));
      if (idx !== -1) {
        startWith(tasks, idx, day);
        return;
      }
    }
    const planIdx = coachPlan.findIndex(t => matchesTask(t, task));
    if (planIdx !== -1) {
      startWith(coachPlan, planIdx, 'plan');
      return;
    }

    startNeuralSession([{ ...task, sourceContext: sourceContextHint || 'isolated' }], 0);
    navigate('/pomodoro');
  }, [unallocatedCards, coachPlanner, coachPlan, taskLocationMap, startNeuralSession, navigate]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_Coach.pdf', 'portrait');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showToast('Erro ao exportar o plano para PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const hasPlan = coachPlan && coachPlan.length > 0;

  return (
    /* PATCH: space-y-6 sm:space-y-10 */
    <div id="ai-coach-container" className="space-y-6 sm:space-y-10 pb-8 sm:pb-12 w-full mx-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="flex flex-col gap-6">
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-inner relative">
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] -ml-32 -mb-32" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                <Compass size={24} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Painel Coach AI</h2>
                <p className="text-[10px] text-cyan-400/80 uppercase tracking-[0.25em] font-bold mt-1">
                  Estratégia inteligente com MC
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-0.5 bg-slate-950/80 border border-white/5 rounded-2xl p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('planner')}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'planner' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <LayoutGrid size={14} className="shrink-0" />
                  Planner
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'cards' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Sparkles size={14} className="shrink-0" />
                  Pendências
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/5 transition disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Export
                </button>
                <button
                  onClick={onClearHistory}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[9px] font-black text-rose-300 uppercase tracking-widest hover:bg-rose-500/10 transition"
                >
                  <Trash2 size={12} />
                  Limpar
                </button>
              </div>
            </div>
          </div>
          <div className="relative z-10 w-full mt-6 pt-6 border-t border-white/[0.05] flex justify-center">
            <button
              onClick={onGenerateGoals}
              disabled={loading}
              className="group relative w-full lg:w-auto px-4 sm:px-8 py-3.5 rounded-2xl font-black text-[11px] sm:text-[12px] tracking-[0.15em] uppercase transition-all duration-75 flex items-center justify-center gap-2 sm:gap-3 border border-white/20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none animate-shimmer" />
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin shrink-0 drop-shadow-md" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <BrainCircuit size={16} className="shrink-0 drop-shadow-md" />
                  <span>Recalcular Estratégia</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {viewMode === 'cards' && (
          <Motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.05, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Foco do Dia</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Sugestões de estudo baseadas em telemetria
                  </p>
                </div>
              </div>
            </div>
            {hasPlan ? (
              unallocatedCards.length === 0 ? (
                <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                  <Target size={32} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                    Nenhum foco pendente fora do planner
                  </p>
                </div>
              ) : (
                // FIX (BUG-12): items-stretch para alturas uniformes
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                  {unallocatedCards.map((task, idx) => (
                    <AICoachCard
                      key={getSafeId(task) || `coach-card-${idx}`}
                      task={task}
                      idx={idx}
                      categories={categories}
                      maxScore={safeMaxScore}
                      onStartPomodoro={handleStartNeural}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                <Target size={32} className="text-slate-600 mx-auto mb-4" />
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                  Nenhum foco definido para hoje
                </p>
              </div>
            )}
          </Motion.div>
        )}
        {viewMode === 'planner' && (
          <Motion.div
            key="planner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05, ease: "easeOut" }}
            style={{ transform: "none", filter: "none", willChange: "auto" }}
          >
            <div className="space-y-6 mb-8">
              {suggestedFocus ? (
                <div className="w-full">
                  <AICoachWidget
                    key={suggestedFocus?.id || 'coach-widget'}
                    suggestion={suggestedFocus}
                    onGenerateGoals={onGenerateGoals}
                    loading={loading}
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                  <AlertCircle size={20} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">Nenhum foco sugerido</p>
                  <p className="text-[10px] text-slate-500 mt-1">Recalcule a estratégia após novos simulados.</p>
                </div>
              )}
            </div>
            {systemAlerts.length > 0 && (
              <div className="mb-12 sm:mb-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                {systemAlerts.map((alertTask, idx) => {
                  const parsedAlert = parseCoachTask(alertTask, categories);
                  const cleanText = alertTask.text || alertTask.title || '';
                  const subjectName = parsedAlert.subject;
                  const message = parsedAlert.action || cleanText;
                  let type = 'info';
                  let titlePart = message;
                  let descPart = '';
                  let actionDesc = '';
                  if (/VETOR CRÍTICO/i.test(cleanText)) {
                    type = 'danger';
                    titlePart = "Vetor Crítico";
                    descPart = message.replace(/🚨 VETOR CRÍTICO!?\s*/i, '');
                    actionDesc = "Conclua os focos pendentes desta matéria hoje para frear a queda imediata de rendimento.";
                  } else if (/OSCILAÇÃO/i.test(cleanText)) {
                    type = 'warning';
                    titlePart = "Oscilação Estatística";
                    descPart = message.replace(/🌪️ OSCILAÇÃO ESTATÍSTICA:?\s*/i, '');
                    actionDesc = "Revisite os tópicos sugeridos abaixo para estabilizar sua taxa de acertos.";
                  } else if (/CRUZEIRO SEGURO/i.test(cleanText)) {
                    type = 'success';
                    titlePart = "Cruzeiro Seguro";
                    descPart = message.replace(/🏆 CRUZEIRO SEGURO:?\s*/i, '');
                    actionDesc = "Mantenha a constância atual. Resolva apenas as manutenções leves sugeridas.";
                  }
                  const t = {
                    danger: { bg: 'bg-[#1a0b12]', border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', titleColor: 'text-rose-100', descColor: 'text-rose-200/70', badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300', verdictBg: 'bg-rose-500/5 text-rose-400', glowColor: 'bg-rose-600', Icon: AlertCircle, isCritical: true },
                    warning: { bg: 'bg-[#171109]', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', titleColor: 'text-amber-100', descColor: 'text-amber-200/70', badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', verdictBg: 'bg-amber-500/5 text-amber-400', glowColor: 'bg-amber-600', Icon: Activity, isCritical: false },
                    success: { bg: 'bg-[#06140e]', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', titleColor: 'text-emerald-100', descColor: 'text-emerald-200/70', badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', verdictBg: 'bg-emerald-500/5 text-emerald-400', glowColor: 'bg-emerald-600', Icon: Trophy, isCritical: false },
                    info: { bg: 'bg-slate-900/50', border: 'border-slate-500/20', iconBg: 'bg-slate-500/10', iconColor: 'text-slate-400', titleColor: 'text-slate-100', descColor: 'text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-300', verdictBg: 'bg-slate-500/5 text-slate-400', glowColor: 'bg-slate-600', Icon: AlertCircle, isCritical: false }
                  }[type];
                  // FIX (BUG-05): parse seguro de volatilidade (regex podia gerar NaN)
                  const safeVolatilityDisplay = (() => {
                    const raw = alertTask.analysis?.monteCarlo?.volatility;
                    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0).replace(/[^\d.-]/g, ''));
                    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
                  })();
                  return (
                    /* PATCH: key estável */
                    <div key={alertTask?.id || `sys-alert-${alertTask?.categoryId || 'cat'}-${idx}`} className={`relative overflow-hidden p-5 rounded-3xl border flex flex-col gap-4 shadow-xl ${t.bg} ${t.border}`}>
                      <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none opacity-[0.15] ${t.glowColor}`} />
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${t.iconBg} ${t.border} ${t.iconColor}`}>
                          <t.Icon size={24} className={t.isCritical ? "animate-pulse" : ""} />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${t.badgeBg}`}>
                              {subjectName}
                            </span>
                            {t.isCritical && (
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                                Intervenção Exigida
                              </span>
                            )}
                          </div>
                          <span className={`text-sm sm:text-base font-black tracking-tight leading-snug uppercase ${t.titleColor}`}>
                            {titlePart}
                          </span>
                          <span className={`text-xs font-medium leading-relaxed ${t.descColor}`}>
                            {descPart}
                          </span>
                          {alertTask.analysis?.monteCarlo && (
                            <div className="flex flex-wrap items-center gap-2 mt-2 mb-1">
                              <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                <Target size={12} className={t.iconColor} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  Projeção Base:{' '}
                                  <span className="text-white ml-1">
                                    {Math.round(getMcProbPct(alertTask))}%
                                  </span>
                                </span>
                              </div>
                              <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                <Activity size={12} className={t.iconColor} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  Volatilidade:{' '}
                                  <span className="text-white ml-1">
                                    {safeVolatilityDisplay}
                                  </span>
                                </span>
                              </div>
                              {alertTask.analysis.monteCarlo.calibrationPenalty > 0.01 && (
                                <div className="px-2 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5">
                                  <Zap size={12} className="text-amber-400" />
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                                    Penalidade: <span className="text-amber-400 ml-1">-{Math.round(alertTask.analysis.monteCarlo.calibrationPenalty * 100)}%</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {alertTask.analysis?.verdict && (
                            <div className="flex flex-col gap-2 mt-2">
                              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] font-bold ${t.verdictBg} ${t.border}`}>
                                <BrainCircuit size={14} className="shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{alertTask.analysis.verdict}</span>
                              </div>
                              <div className="pt-3 pb-1.5 border-t border-white/10 mt-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 block mb-1">
                                  Ação Sugerida
                                </span>
                                <p className={`text-xs font-bold leading-relaxed ${t.titleColor} opacity-95 pl-0.5`}>{actionDesc}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <AICoachPlanner plannerData={coachPlanner} categories={categories} onStartPomodoro={handleStartNeural} />
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## `src/components/AICoachWidget.jsx`

```javascript
import React, { useState, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, Zap, Target, Sparkles,
  ChevronDown, AlertTriangle, TrendingDown,
  Clock, CheckCircle2, Database, Flame, Loader2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { displaySubject, displayTopic } from '../utils/displaySubject';
import { getCalibrationKey } from '../utils/coachSafe.js';
import { RX_REC_MARKUP } from '../utils/coachText';
import { safeDomain, clampFinite, toProbPct, pointsToPct } from '../utils/measurement';

// FIX (BUG-06): cache limitado p/ evitar re-parse recursivo a cada render
const REC_CACHE_MAX = 200;
const recCache = new Map();

function renderRecommendation(text, depth = 0) {
  if (depth > 6) return String(text || '');
  const safeText = String(text || '');
  const key = `${depth}::${safeText}`;
  if (recCache.has(key)) return recCache.get(key);

  const parts = safeText.split(RX_REC_MARKUP).filter(Boolean);
  const result = parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong
          key={`rec-${idx}`}
          className="text-white not-italic drop-shadow-[0_0_8px_currentColor]"
        >
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </strong>
      );
    }
    if (part.startsWith('!!') && part.endsWith('!!') && part.length >= 4) {
      return (
        <span
          key={`rec-${idx}`}
          className="text-rose-500 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
        >
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </span>
      );
    }
    if (part.startsWith('++') && part.endsWith('++') && part.length >= 4) {
      return (
        <span
          key={`rec-${idx}`}
          className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
        >
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </span>
      );
    }
    const cleanPart = part.replace(/\*\*|!!|\+\+/g, '');
    return <React.Fragment key={`rec-${idx}`}>{cleanPart}</React.Fragment>;
  });

  if (recCache.size >= REC_CACHE_MAX) {
    const first = recCache.keys().next().value;
    recCache.delete(first);
  }
  recCache.set(key, result);
  return result;
}

// FIX (BUG-07): status normalizado (lowercase + strip de acentos) p/ matching robusto
function getUrgencyConfig(score, status = '') {
  const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
  const s = String(status || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (s.includes('urgente') || s.includes('critico') || numericScore > 70) return {
    tier: 'CRÍTICO', Icon: Flame,
    border: 'border-red-500/45', glow: 'shadow-red-900/40',
    badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    bar: 'from-red-600 to-rose-500', accent: 'text-red-400',
    stripe: 'from-red-600/15', pulse: 'bg-red-500', line: 'via-red-500'
  };
  if (s.includes('medio') || s.includes('alto') || numericScore > 50) return {
    tier: 'ALTO', Icon: TrendingDown,
    border: 'border-orange-500/45', glow: 'shadow-orange-900/30',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    bar: 'from-orange-600 to-amber-500', accent: 'text-orange-400',
    stripe: 'from-orange-600/12', pulse: 'bg-orange-500', line: 'via-orange-500'
  };
  if (numericScore > 25) return {
    tier: 'MÉDIO', Icon: Clock,
    border: 'border-amber-500/40', glow: 'shadow-amber-900/20',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    bar: 'from-amber-500 to-yellow-400', accent: 'text-amber-400',
    stripe: 'from-amber-500/10', pulse: 'bg-amber-400', line: 'via-amber-400'
  };
  return {
    tier: 'ESTÁVEL', Icon: CheckCircle2,
    border: 'border-emerald-500/40', glow: 'shadow-emerald-900/20',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    bar: 'from-emerald-500 to-teal-400', accent: 'text-emerald-400',
    stripe: 'from-emerald-500/10', pulse: 'bg-emerald-400', line: 'via-emerald-400'
  };
}

function MetricChip({ label, value, index }) {
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      className="group/chip relative flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-md p-3 sm:p-4 transition-all cursor-default overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-transparent opacity-0 group-hover/chip:opacity-10 transition-opacity" />
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 leading-[1.35] truncate min-w-0 block group-hover/chip:text-slate-400 transition-colors pb-px">
        {label}
      </span>
      <span className="text-sm font-black text-slate-100 tracking-tight leading-[1.25] truncate min-w-0 block pb-px">
        {value === null || value === undefined
          ? '—'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)}
      </span>
    </Motion.div>
  );
}

function UrgencyBar({ score, cfg }) {
  const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
  const pct = Math.min(100, Math.max(0, numericScore));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 leading-[1.35]">Urgência</span>
        <span className={`text-[11px] font-black ${cfg.accent}`}>{Math.round(pct)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.06]">
        <Motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
          className={`h-full rounded-full bg-gradient-to-r ${cfg.bar}`}
        />
      </div>
    </div>
  );
}

function MonteCarloGauge({ mc, maxScore = 100, minScore = 0 }) {
  if (!mc || mc.probability == null) return null;
  const domain = safeDomain(maxScore, minScore);
  const clampPct = (value) => clampFinite(value, 0, 100, 0);
  const prob = clampPct(toProbPct(mc.probabilityPct ?? mc.probabilityRaw ?? mc.probability));
  const toScorePct = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return pointsToPct(n, domain);
  };
  let low = Number.isFinite(Number(mc.ci95LowPct))
    ? clampPct(mc.ci95LowPct)
    : toScorePct(mc.ci95Low ?? mc.conformalLow);
  let high = Number.isFinite(Number(mc.ci95HighPct))
    ? clampPct(mc.ci95HighPct)
    : toScorePct(mc.ci95High ?? mc.conformalHigh);
  const volatility = Number.isFinite(Number(mc.volatility)) ? Number(mc.volatility) : 0;
  // PATCH: fallback baseado em volatilidade real
  const volPct = Number.isFinite(volatility) && volatility > 0
    ? Math.min(15, Math.max(3, volatility * 1.96 / ((domain.max - domain.min) / 100)))
    : 5;
  if (low == null) low = Math.max(0, prob - volPct);
  if (high == null) high = Math.min(100, prob + volPct);
  if (low > high) {
    [low, high] = [high, low];
  }
  const highVolThreshold = 8 * ((domain.max - domain.min) / 100);
  const isHighVol = volatility > highVolThreshold;
  const danger = Number.isFinite(mc?.thresholds?.danger)
    ? clampFinite(mc.thresholds.danger, 0, 100, 30)
    : 30;
  const safe = Number.isFinite(mc?.thresholds?.safe)
    ? clampFinite(mc.thresholds.safe, 0, 100, 90)
    : 90;
  const isCritical = prob < danger;
  const isSafe = prob >= safe;
  const color = isCritical
    ? 'bg-red-400'
    : isSafe
      ? 'bg-emerald-400'
      : 'bg-indigo-400';
  const hasConformal =
    Number.isFinite(Number(mc.conformalLow)) &&
    Number.isFinite(Number(mc.conformalHigh));
  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 bg-black/40 border border-white/10 rounded-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 text-white/5">
        <BrainCircuit size={48} />
      </div>
      <div className="relative z-10 flex justify-between items-end mb-2">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">
            Projeção MC
          </span>
          <span className="text-2xl font-black text-white tracking-tighter">
            {Math.round(prob)}%
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">
            Volatilidade
          </span>
          <span
            className={`text-xs font-mono font-bold ${
              isHighVol ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            ±{Math.round(volatility)} pts
          </span>
        </div>
      </div>
      <div className="relative h-2.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05] my-3">
        <div
          className="absolute top-0 bottom-0 w-px bg-rose-400/70 z-10"
          style={{ left: `${clampPct(danger)}%` }}
          title={`Zona de risco abaixo de ${Math.round(danger)}%`}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-emerald-400/70 z-10"
          style={{ left: `${clampPct(safe)}%` }}
          title={`Zona segura a partir de ${Math.round(safe)}%`}
        />
        <Motion.div
          initial={{ width: 0 }}
          animate={{ left: `${low}%`, width: `${Math.max(0, high - low)}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute top-0 bottom-0 bg-white/10 rounded-full"
        />
        <Motion.div
          initial={{ left: 0 }}
          animate={{ left: `${Math.min(97, Math.max(1, prob))}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className={`absolute top-0 bottom-0 w-1.5 rounded-full ${color} shadow-[0_0_12px_rgba(0,0,0,0.8)]`}
        />
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[8px] font-black uppercase tracking-widest text-rose-400/60">
          risco &lt; {Math.round(danger)}%
        </span>
        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">
          seguro ≥ {Math.round(safe)}%
        </span>
      </div>
      <div className="flex justify-between mt-3 px-0.5">
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
            Pior Cenário
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">
            {Math.round(low)}%
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
            Teto Probabilístico
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">
            {Math.round(high)}%
          </span>
        </div>
      </div>
      {hasConformal && (
        <div className="mt-3 text-[10px] text-cyan-200/80 border border-cyan-400/15 bg-cyan-500/5 rounded-lg px-3 py-2">
          Intervalo conformal 90% (resíduos):{' '}
          <span className="font-mono font-bold">
            {Number(mc.conformalLow).toFixed(0)}%–{Number(mc.conformalHigh).toFixed(0)}%
          </span>
        </div>
      )}
      {Number.isFinite(Number(mc.effectiveMCTarget)) && (
        <div className="mt-2 text-[10px] text-slate-400">
          Meta operacional:{' '}
          <span className="font-bold text-slate-200">
            {Math.round((Number(mc.effectiveMCTarget) / domain.max) * 100)}%
          </span>
        </div>
      )}
    </Motion.div>
  );
}

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
  const [showMatrix, setShowMatrix] = useState(false);
  const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
  const sortedHumanReadable = useMemo(() => {
    const urgencyHumanReadable = suggestion?.urgency?.details?.humanReadable || suggestion?.urgency?.humanReadable || {};
    return Object.entries(urgencyHumanReadable).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [suggestion?.urgency?.details?.humanReadable, suggestion?.urgency?.humanReadable]);

  if (!suggestion) return null;
  const topic = suggestion.weakestTopic;
  const urgency = suggestion?.urgency?.details ?? { hasData: false };
  const monteCarloData = suggestion?.urgency?.monteCarlo || suggestion?.urgency?.details?.monteCarlo || urgency?.monteCarlo;
  const safeMaxScore = Number(activeContest?.maxScore) > 0 ? Number(activeContest.maxScore) : 100;
  const urgencyScoreRaw = suggestion?.urgency?.normalizedScore ?? suggestion?.urgency?.score ?? 0;
  const urgencyScore = Number.isFinite(Number(urgencyScoreRaw)) ? Number(urgencyScoreRaw) : 0;
  const statusLabel = String(urgency?.humanReadable?.Status || '');
  const calibrationOps = activeContest?.calibrationOps || {};
  const categoryKey = getCalibrationKey(
    suggestion?.categoryId || suggestion?.id || suggestion?.name
  );
  const isDegraded = Boolean(calibrationOps[categoryKey]?.degraded);
  const cfg = getUrgencyConfig(urgencyScore, statusLabel);
  const { tier, Icon: TierIcon } = cfg;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative mb-8 w-full border rounded-2xl ${cfg.border} bg-[#08090f]/80 backdrop-blur-2xl shadow-2xl ${cfg.glow} overflow-hidden group/widget`}
    >
      <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl ${cfg.stripe} to-transparent pointer-events-none rounded-full blur-[120px] opacity-50`} />
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-80`} />
      <div className="relative z-10 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-2 h-2 rounded-full ${cfg.pulse} animate-pulse shrink-0 shadow-[0_0_8px_currentColor]`} />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-sm font-bold text-slate-200 truncate">Motor de Produtividade</span>
              {/* PATCH: GLOBAL normalizado por maxScore */}
              {(() => {
                const gpm = suggestion.globalProjectedMean ?? suggestion.globalMcContext?.projectedMean;
                const safeMax = Number(activeContest?.maxScore) > 0 ? Number(activeContest.maxScore) : 100;
                const gpmPct = gpm != null && Number.isFinite(Number(gpm))
                  ? Math.round((Number(gpm) / safeMax) * 100)
                  : null;
                return gpmPct != null ? (
                  <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md tracking-wider">
                    GLOBAL {gpmPct}%
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {Number.isFinite(Number(urgency?.crunchMultiplier)) && Number(urgency.crunchMultiplier) > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                <AlertTriangle size={12} className="shrink-0" />
                <span className="whitespace-nowrap">CRÍTICO ×{Number(urgency.crunchMultiplier).toFixed(1).replace(/\.0$/, '')}</span>
              </div>
            )}
            {isDegraded && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                <Database size={12} className="shrink-0" />
                <span className="whitespace-nowrap">CALIBRAÇÃO DEGRADADA</span>
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${cfg.badge} shrink-0`}>
              <TierIcon size={12} className="shrink-0" />
              <span className="whitespace-nowrap">{tier === 'Standard' ? 'Padrão' : tier}</span>
            </div>
            {onGenerateGoals && (
              <button
                onClick={onGenerateGoals}
                disabled={loading}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                {loading ? 'Calculando...' : 'Recalcular'}
              </button>
            )}
          </div>
        </div>
        {!urgency.hasData ? (
          <div className="flex flex-col md:flex-row items-center gap-8 py-12 px-8 bg-white/[0.02] border border-white/5 shadow-inner">
            <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-2xl">
              <Database size={32} className="text-slate-600" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Sincronização Necessária</h3>
              <p className="text-slate-500 leading-relaxed max-w-md font-medium">
                Realize novos simulados para alimentar o algoritmo de recomendação e desbloquear as metas de alta performance.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* FIX (BUG-23): removido md:grid-cols-2 que quebrava o layout em telas médias */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_minmax(240px,320px)] gap-6 xl:gap-10 items-start">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${cfg.bar}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alvo Prioritário</span>
                  {statusLabel && (
                    <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                      {statusLabel.replace(/[🔥⚡✓]/gu, '').trim()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                    {displaySubject(suggestion.name, activeContest?.categories || [])}
                  </h2>
                  {topic && (
                    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-bold tracking-tight ${cfg.badge} hover:bg-white/[0.05] transition-colors cursor-default`}>
                      <Target size={16} />
                      <span className="truncate max-w-[200px] sm:max-w-[300px]" title={typeof topic === 'string' ? topic : topic?.name}>
                        {displayTopic(typeof topic === 'string' ? topic : (topic?.name || 'Tópico Geral'))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-center h-full">
                {suggestion.urgency?.recommendation && (
                  <Motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative p-5 sm:p-6 bg-black/40 backdrop-blur-xl border border-white/[0.05] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] group/status hover:border-white/10 transition-all duration-500 overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${cfg.stripe} to-transparent opacity-20 blur-2xl pointer-events-none rounded-full`} />
                    <div className="flex items-start gap-4 relative z-10">
                      <div className={`p-3 rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent border ${cfg.border} shadow-inner shrink-0 group-hover/status:scale-110 transition-transform duration-500`}>
                        <Sparkles size={20} className={`${cfg.accent} drop-shadow-[0_0_8px_currentColor]`} />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.pulse} animate-pulse`} />
                          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Motivo da Recomendação</span>
                        </div>
                        <p className="text-sm sm:text-[15px] text-slate-100 leading-relaxed font-medium mt-1">
                          {renderRecommendation(suggestion.urgency.recommendation)}
                        </p>
                      </div>
                    </div>
                  </Motion.div>
                )}
              </div>
              <div className="space-y-6">
                <UrgencyBar score={urgencyScore} cfg={cfg} />
                {monteCarloData && (
                  <MonteCarloGauge
                    mc={monteCarloData}
                    maxScore={safeMaxScore}
                    minScore={Number(activeContest?.minScore) || 0}
                  />
                )}
              </div>
            </div>
            <div className="pt-4">
              {/* FIX (BUG-38): ARIA completo no toggle da matriz */}
              <button
                onClick={() => setShowMatrix(!showMatrix)}
                aria-expanded={showMatrix}
                aria-controls="coach-telemetry-matrix"
                className="flex items-center justify-between w-full sm:w-auto gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all py-3 px-4 sm:px-6 rounded-md bg-white/[0.03] border border-white/[0.05] hover:border-white/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BrainCircuit size={14} className={`shrink-0 ${showMatrix ? cfg.accent : 'text-slate-600'} transition-colors`} />
                  <span className="truncate">Matriz de Telemetria</span>
                </div>
                <Motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0">
                  <ChevronDown size={14} />
                </Motion.div>
              </button>
              <AnimatePresence>
                {showMatrix && (
                  <Motion.div
                    id="coach-telemetry-matrix"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 sm:gap-3 pt-6">
                      {sortedHumanReadable.map(([k, v], i) => (
                        <div key={`metric-${k}-${i}`} className="flex-1 min-w-[130px] sm:min-w-[150px] max-w-full">
                          <MetricChip label={k} value={v} index={i} />
                        </div>
                      ))}
                    </div>
                    {monteCarloData?.explainability?.note && (
                      <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 font-black mb-1">
                          Explicabilidade Monte Carlo
                        </p>
                        <p className="text-[10px] text-cyan-100/70 mb-2">
                          Qualidade da calibração: <span className="font-black uppercase">{monteCarloData.explainability.calibrationQuality || 'n/a'}</span>
                          {monteCarloData.explainability.confidenceAdjusted
                            ? ` • ajuste ${Number.isFinite(Number(monteCarloData.explainability.confidenceAdjustmentPct)) ? Number(monteCarloData.explainability.confidenceAdjustmentPct) : 0}%`
                            : ''}
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {monteCarloData.explainability.note}
                        </p>
                      </div>
                    )}
                    {monteCarloData?.diagnostics && (
                      <div className="mt-3 text-[9px] text-slate-400 bg-white/[0.015] rounded p-2 border border-white/5">
                        <div>Simulações: <span className="font-mono text-slate-200">{monteCarloData.diagnostics.simulationCount}</span></div>
                        {monteCarloData.diagnostics.convergence && <div>Convergência: {monteCarloData.diagnostics.convergence.sufficient ? '✓ Boa' : '⚠ Parcial'} (SE {Number(monteCarloData.diagnostics.convergence?.achievedSE ?? 0).toFixed(4)})</div>}
                        {monteCarloData.diagnostics.effectiveN && <div>Effective N: <span className="font-mono">{Number(monteCarloData.diagnostics.effectiveN).toFixed(1)}</span></div>}
                        {Number.isFinite(Number(monteCarloData.adaptiveBaseline)) && (
                          <div>Baseline adaptativa: <span className="font-mono text-cyan-300">{Number(monteCarloData.adaptiveBaseline).toFixed(3)}</span></div>
                        )}
                      </div>
                    )}
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </Motion.div>
  );
}
```

## `src/components/coach/CoachControlCenter.jsx`

```javascript
import React, { useMemo, useState } from 'react';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';

// FIX (BUG-08): checa null/undefined/'' ANTES de Number() — antes fmt(null) => "0.0000"
const fmt = (v, d = 4) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(d) : '—';
};

// FIX (BUG-09): semântica clara (lowerIsBetter) em vez de goodWhenNegative
const deltaColor = (v, lowerIsBetter = true) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'text-slate-500';
  const isGood = lowerIsBetter ? n < 0 : n > 0;
  return isGood ? 'text-emerald-400' : 'text-red-400';
};

// ==========================================================
// Sub-componentes de painel
// ==========================================================
function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-150 whitespace-nowrap outline-none
        focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        ${active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white'
        }
      `}
    >
      {icon && <span className="text-base">{icon}</span>}
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const config = {
    healthy: { label: '✓ Saudável', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    degraded: { label: '⚠️ Degradado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    critical: { label: '✖ Crítico', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    unknown: { label: '? Desconhecido', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  };
  const c = config[status] || config.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.label}
    </span>
  );
}

function MetricCard({ label, value, sub }) {
  const formatted = value === null || value === undefined ? '—' : value;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{formatted}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {children}
    </h3>
  );
}

function EmptyState({ message }) {
  return (
    <div className="text-center py-12 text-slate-500">
      <p className="text-4xl mb-3">📊</p>
      <p>{message}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );
}

function ErrorAlert({ message }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-400 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-red-300 text-sm font-medium">Erro no Control Center</p>
        <p className="text-red-400/70 text-xs mt-1">{message}</p>
      </div>
      <button onClick={() => setDismissed(true)} aria-label="Dispensar erro" className="text-red-400 hover:text-red-300">✕</button>
    </div>
  );
}

// ==========================================================
// Painel: Visão Geral
// ==========================================================
function OverviewPanel({ dashboard }) {
  if (!dashboard) {
    return <EmptyState message="Execute o orquestrador para ver a visão geral." />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(dashboard.cards || []).map((card) => (
          <MetricCard key={card.id} label={card.label} value={card.value} />
        ))}
      </div>

      {dashboard.focus && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🎯">Foco Principal</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-lg font-bold text-white">{dashboard.focus.name || '—'}</p>
              <p className="text-sm text-slate-400 mt-1">
                Urgência: <span className="text-indigo-300 font-semibold">{dashboard.focus.normalizedScore ?? '—'}</span>
              </p>
              {dashboard.focus.probability != null && Number.isFinite(Number(dashboard.focus.probability)) && (
                <p className="text-sm text-slate-400">
                  Probabilidade MC: <span className="text-cyan-300 font-semibold">{Number(dashboard.focus.probability)}%</span>
                </p>
              )}
            </div>
            {dashboard.focus.recommendation && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase mb-1">Recomendação</p>
                <p className="text-sm text-slate-300">{dashboard.focus.recommendation}</p>
              </div>
            )}
          </div>
          {dashboard.focus.llmExplanation && (
            <div className="mt-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-400 uppercase mb-1 flex items-center gap-1">🤖 Explicação IA</p>
              <p className="text-sm text-indigo-200">{dashboard.focus.llmExplanation.headline}</p>
              {dashboard.focus.llmExplanation.recommendation && (
                <p className="text-xs text-indigo-300/70 mt-2">{dashboard.focus.llmExplanation.recommendation}</p>
              )}
            </div>
          )}
        </div>
      )}

      {dashboard.tasks && dashboard.tasks.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📋">Tarefas Geradas ({dashboard.tasks.length})</SectionTitle>
          <div className="space-y-2">
            {dashboard.tasks.map((task, idx) => (
              <div key={task.id || idx} className="flex items-center gap-3 bg-slate-900/40 rounded-lg p-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{task.text}</p>
                  <p className="text-xs text-slate-500">{task.categoryName || '—'} • {task.topicName || '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-500/15 text-red-300'
                    : task.priority === 'medium' ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-300'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dashboard.health && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🏥">Saúde do Modelo</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-white">{dashboard.health.healthScore ?? '—'}</div>
            <div>
              <StatusBadge status={dashboard.health.status} />
              {dashboard.health.alertsCount > 0 && (
                <p className="text-xs text-slate-400 mt-1">{dashboard.health.alertsCount} alerta(s) ativo(s)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {dashboard.causal && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔬">Modelo Causal</SectionTitle>
          {dashboard.causal.available ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Uplift Global" value={fmt(dashboard.causal.model?.globalUplift, 2)} />
              <MetricCard label="Amostras" value={dashboard.causal.model?.sampleSize} />
              <MetricCard label="Ações" value={dashboard.causal.model?.actionCount} />
              <MetricCard label="Método" value={dashboard.causal.model?.method} />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              Modelo causal indisponível. Ative as flags de causalidade e execute o orquestrador com treino.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Flags
// ==========================================================
function FlagsPanel({ currentFlags, flagOverrides, toggleFlag, resetOverrides, strategySpace }) {
  const groupedFlags = useMemo(() => {
    const groups = {
      'Lote 1 — State-Space': ['useStateSpace', 'useStateSpaceAverage', 'useStateSpaceTrend'],
      'Lote 2 — Volatilidade': ['useDynamicVolatility', 'useGarchVolatility', 'useDynamicVolatilityOverride'],
      'Lote 3 — Posterior MC': ['usePosteriorMonteCarlo', 'usePosteriorMonteCarloOverride'],
      'Lote 4 — Bayesian Topics': ['useBayesianTopics', 'useBayesianTopicsForUrgency'],
      'Lote 5 — Decision Utility': ['useDecisionUtility', 'useDecisionUtilityForTopics', 'useDecisionUtilityForBestTask', 'useBanditPlanner'],
      'Lote 6 — LLM': ['useLLMExplanations', 'useLLMInsights', 'useLLMTaskClassifier', 'useLLMStrictValidation'],
      'Lote 7 — Graph + FSRS': ['useKnowledgeGraph', 'useKnowledgeGraphForTopics', 'useAdvancedFsrs', 'useFsrsForSrsBoost', 'useFsrsTopicScheduling'],
      'Lote 8 — Evaluation': ['useEvaluationTelemetry', 'useStrategyBacktester', 'useTopicRankEvaluation'],
      'Lote 9 — Observability': ['useObservability', 'useDriftGuard', 'useModelHealthTelemetry', 'useDriftAlerts'],
      'Lote 10 — AutoTuner': ['useMetaOptimizer', 'useAutoTuner', 'useAutoFlagApplication', 'useAutoRollback'],
      'Lote 11 — Causal': ['useCausalUplift', 'usePersonalizedPolicy', 'useCausalTaskSelection', 'useCausalBootstrap'],
      'Lote 12 — Orchestrator': ['useCoachOrchestrator', 'useOrchestratorHealth', 'useOrchestratorLLM', 'useOrchestratorAutoTuner'],
      'Lote 13 — Control Center': ['useCoachControlCenter', 'useControlCenterFlagsPanel', 'useControlCenterHealthPanel', 'useControlCenterBacktestPanel', 'useControlCenterAutoTunerPanel', 'useControlCenterCausalPanel', 'useControlCenterLLMPanel'],
    };
    const grouped = new Set(Object.values(groups).flat());
    const extras = Object.keys(currentFlags || {}).filter((k) => !grouped.has(k));
    if (extras.length > 0) groups['Lote 14 — Não catalogadas'] = extras;
    return groups;
  }, [currentFlags]);

  const activeCount = Object.entries(currentFlags).filter(([, v]) => v === true).length;
  const overrideCount = Object.keys(flagOverrides).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MetricCard label="Flags Ativas" value={activeCount} />
          <MetricCard label="Overrides Locais" value={overrideCount} />
        </div>
        {overrideCount > 0 && (
          <button onClick={resetOverrides} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
            Reset Overrides
          </button>
        )}
      </div>

      {strategySpace && strategySpace.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🧩">Estratégias de Flags</SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {strategySpace.map((strategy) => (
              <div key={strategy.id} className="bg-slate-900/40 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-200">{strategy.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{strategy.id}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {Object.entries(strategy.features || {}).filter(([, v]) => v).length} flags
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.entries(groupedFlags).map(([groupName, flags]) => (
        <div key={groupName} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle>{groupName}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {flags.map((flagKey) => {
              const isActive = currentFlags[flagKey] === true;
              const isOverridden = flagKey in flagOverrides;
              // FIX (BUG-17): toggle switch acessível (role="switch") no lugar de checkbox nativo
              return (
                <div
                  key={flagKey}
                  role="switch"
                  aria-checked={isActive}
                  tabIndex={0}
                  onClick={() => toggleFlag(flagKey, !isActive)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleFlag(flagKey, !isActive);
                    }
                  }}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors outline-none
                    focus-visible:ring-2 focus-visible:ring-indigo-500
                    ${isOverridden
                      ? 'bg-indigo-500/10 border border-indigo-500/30'
                      : isActive
                        ? 'bg-emerald-500/5 border border-emerald-500/20'
                        : 'bg-slate-900/40 border border-slate-700/30 hover:border-slate-600/50'
                    }
                  `}
                >
                  <span className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate font-mono">{flagKey}</p>
                    {isOverridden && <p className="text-xs text-indigo-400">override local</p>}
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================================
// Painel: Saúde do Modelo
// ==========================================================
function HealthPanel({ latestHealth, healthSnapshots }) {
  if (!latestHealth) {
    return <EmptyState message="Nenhum snapshot de saúde encontrado. Execute o orquestrador com observabilidade ativa." />;
  }
  const alerts = latestHealth.alerts || [];
  const metrics = latestHealth.metrics || {};
  const recommendations = latestHealth.recommendations || [];
  // FIX: proteger healthScore contra NaN
  const safeScore = Number.isFinite(Number(latestHealth.healthScore)) ? Number(latestHealth.healthScore) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Health Score</p>
            <p className="text-5xl font-bold text-white mt-1">{Number.isFinite(Number(latestHealth.healthScore)) ? latestHealth.healthScore : '—'}</p>
          </div>
          <StatusBadge status={latestHealth.status} />
        </div>
        <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              safeScore >= 80 ? 'bg-emerald-500' : safeScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, safeScore))}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">Gerado em {new Date(latestHealth.generatedAt).toLocaleString('pt-BR')}</p>
      </div>

      {alerts.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔔">Alertas ({alerts.length})</SectionTitle>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div key={alert.id || idx} className={`flex items-start gap-3 rounded-lg p-3 ${
                alert.severity === 'high' ? 'bg-red-500/10 border border-red-500/20'
                  : alert.severity === 'medium' ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-slate-900/40 border border-slate-700/30'
              }`}>
                <span className={`text-lg ${
                  alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tipo: {alert.type} • Severidade: {alert.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="💡">Recomendações</SectionTitle>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-indigo-400 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {metrics.scoreDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="📉">Drift de Nota</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">Severidade</p><p className="text-white font-medium">{metrics.scoreDrift.severity || '—'}</p></div>
              <div><p className="text-slate-500">Direção</p><p className="text-white font-medium">{metrics.scoreDrift.direction || '—'}</p></div>
              <div><p className="text-slate-500">Baseline</p><p className="text-white font-medium">{fmt(metrics.scoreDrift.baselineMean, 1)}</p></div>
              <div><p className="text-slate-500">Recente</p><p className="text-white font-medium">{fmt(metrics.scoreDrift.recentMean, 1)}</p></div>
            </div>
          </div>
        )}
        {metrics.volatilityDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="🌊">Drift de Volatilidade</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">Severidade</p><p className="text-white font-medium">{metrics.volatilityDrift.severity || '—'}</p></div>
              <div><p className="text-slate-500">Direção</p><p className="text-white font-medium">{metrics.volatilityDrift.direction || '—'}</p></div>
            </div>
          </div>
        )}
        {metrics.calibrationDrift && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="🎯">Drift de Calibração</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">Tem Drift</p><p className="text-white font-medium">{metrics.calibrationDrift.hasDrift ? 'Sim' : 'Não'}</p></div>
              <div><p className="text-slate-500">Severidade</p><p className="text-white font-medium">{metrics.calibrationDrift.worstSeverity || '—'}</p></div>
            </div>
          </div>
        )}
        {metrics.currentCalibration && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SectionTitle icon="📐">Calibração Atual</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-slate-500">ECE</p><p className="text-white font-medium">{fmt(metrics.currentCalibration.ece, 4)}</p></div>
              <div><p className="text-slate-500">MCE</p><p className="text-white font-medium">{fmt(metrics.currentCalibration.mce, 4)}</p></div>
            </div>
          </div>
        )}
      </div>

      {healthSnapshots.length > 1 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📜">Histórico de Health ({healthSnapshots.length})</SectionTitle>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {[...healthSnapshots].reverse().map((snapshot, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-500 text-xs w-32 flex-shrink-0">{new Date(snapshot.generatedAt).toLocaleDateString('pt-BR')}</span>
                <span className="font-mono text-white">{snapshot.healthScore}</span>
                <StatusBadge status={snapshot.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: AutoTuner
// ==========================================================
function AutoTunerPanel({ tunerResult, tunerHistory, runAutoTuner, applyRecommendation, rollbackToBaseline, loading }) {
  const recommendation = tunerResult?.recommendation;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runAutoTuner({ autoApply: false })}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔍 Analisar Estratégias
        </button>
        <button
          onClick={() => runAutoTuner({ autoApply: true, forceApply: true })}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⚡ Analisar e Aplicar
        </button>
        <button
          onClick={rollbackToBaseline}
          disabled={loading}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⏪ Rollback para Baseline
        </button>
      </div>

      {recommendation && (
        <div className={`border rounded-xl p-5 ${
          recommendation.action === 'promote' ? 'bg-emerald-500/5 border-emerald-500/30'
            : recommendation.action === 'rollback' ? 'bg-red-500/5 border-red-500/30'
            : recommendation.action === 'explore' ? 'bg-cyan-500/5 border-cyan-500/30'
            : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <SectionTitle icon="🤖">Recomendação do AutoTuner</SectionTitle>
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              recommendation.action === 'promote' ? 'bg-emerald-500/20 text-emerald-300'
                : recommendation.action === 'rollback' ? 'bg-red-500/20 text-red-300'
                : recommendation.action === 'explore' ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-slate-500/20 text-slate-300'
            }`}>
              {recommendation.action.toUpperCase()}
            </span>
            <span className="text-slate-300 font-mono text-sm">{recommendation.strategyId}</span>
          </div>
          <p className="text-sm text-slate-300 mb-3">{recommendation.reason}</p>
          {recommendation.score != null && (
            <div className="flex gap-4 text-sm text-slate-400 mb-4">
              <span>Score: <span className="text-white font-mono">{fmt(recommendation.score, 4)}</span></span>
              {recommendation.baselineScore != null && (
                <span>Baseline: <span className="text-white font-mono">{fmt(recommendation.baselineScore, 4)}</span></span>
              )}
            </div>
          )}
          {recommendation.action !== 'keep' && (
            <button
              onClick={() => applyRecommendation(recommendation, { force: true })}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Aplicar Recomendação
            </button>
          )}
        </div>
      )}

      {tunerResult?.ranked && tunerResult.ranked.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🏆">Ranking de Estratégias</SectionTitle>
          {/* FIX: overflow + min-w para mobile */}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Estratégia</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">Evidência</th>
                  <th className="pb-2">Qualidade</th>
                </tr>
              </thead>
              <tbody>
                {tunerResult.ranked.map((strategy, idx) => (
                  <tr key={strategy.id} className="border-b border-slate-700/30 last:border-0">
                    <td className="py-2 pr-4 text-slate-500">{idx + 1}</td>
                    <td className="py-2 pr-4">
                      <p className="text-slate-200">{strategy.label}</p>
                      <p className="text-xs text-slate-500 font-mono">{strategy.id}</p>
                    </td>
                    <td className="py-2 pr-4 font-mono text-white">{fmt(strategy.score, 4)}</td>
                    <td className="py-2 pr-4">{strategy.hasEvidence ? <span className="text-emerald-400 text-xs">✓</span> : <span className="text-slate-600 text-xs">—</span>}</td>
                    <td className="py-2">{fmt(strategy.evaluation?.quality, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tunerHistory.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="📜">Histórico do AutoTuner ({tunerHistory.length})</SectionTitle>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {[...tunerHistory].reverse().map((entry, idx) => (
              <div key={idx} className="bg-slate-900/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">{new Date(entry.generatedAt).toLocaleString('pt-BR')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    entry.recommendation?.action === 'promote' ? 'bg-emerald-500/15 text-emerald-300'
                      : entry.recommendation?.action === 'rollback' ? 'bg-red-500/15 text-red-300'
                      : 'bg-slate-500/15 text-slate-300'
                  }`}>
                    {entry.recommendation?.action || '—'}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{entry.recommendation?.strategyId || '—'}</p>
                {entry.applied && <p className="text-xs text-emerald-400 mt-1">✓ Aplicado automaticamente</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Backtest
// ==========================================================
function BacktestPanel({ backtestReport }) {
  if (!backtestReport) {
    return <EmptyState message="Nenhum relatório de backtest encontrado. Execute um backtest granular primeiro." />;
  }
  const summaries = backtestReport.summaries || {};
  const comparisons = backtestReport.comparisons || {};
  const strategyIds = Object.keys(summaries);
  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500">Gerado em {new Date(backtestReport.generatedAt).toLocaleString('pt-BR')}</div>

      {strategyIds.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 overflow-hidden">
          <SectionTitle icon="📊">Métricas por Estratégia</SectionTitle>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">Estratégia</th>
                  <th className="pb-2 pr-4">Amostras</th>
                  <th className="pb-2 pr-4">Brier</th>
                  <th className="pb-2 pr-4">ECE</th>
                  <th className="pb-2 pr-4">MAE</th>
                  <th className="pb-2 pr-4">NDCG</th>
                  <th className="pb-2">Uplift</th>
                </tr>
              </thead>
              <tbody>
                {strategyIds.map((id) => {
                  const s = summaries[id];
                  return (
                    <tr key={id} className="border-b border-slate-700/30 last:border-0">
                      <td className="py-2 pr-4 font-mono text-slate-200">{id}</td>
                      <td className="py-2 pr-4 text-white">{s.count}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.probability?.avgBrier, 4)}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.probability?.ece, 4)}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.score?.mae, 2)}</td>
                      <td className="py-2 pr-4 font-mono text-white">{fmt(s.topics?.avgNdcg, 3)}</td>
                      <td className="py-2 font-mono text-white">{fmt(s.tasks?.avgUplift, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(comparisons).length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="⚖️">Comparações</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(comparisons).map(([key, comp]) => (
              <div key={key} className="bg-slate-900/40 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-200 font-mono mb-2">{key}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Δ Brier</p>
                    <p className={`font-mono ${deltaColor(comp.delta?.brier, true)}`}>{fmt(comp.delta?.brier, 4)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Δ NDCG</p>
                    <p className={`font-mono ${deltaColor(comp.delta?.ndcg, false)}`}>{fmt(comp.delta?.ndcg, 4)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Heurística</p>
                    <p className="font-mono text-white">{fmt(comp.heuristicScore, 4)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Vencedor</p>
                    <p className={`font-medium ${comp.winner === 'candidate' ? 'text-emerald-400' : comp.winner === 'baseline' ? 'text-amber-400' : 'text-slate-400'}`}>
                      {comp.winner}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Painel: Causal
// ==========================================================
function CausalPanel({ causalModel }) {
  if (!causalModel) {
    return <EmptyState message="Nenhum modelo causal carregado. Ative as flags de causalidade e treine o modelo." />;
  }
  const actions = causalModel.actions || {};
  const actionEntries = Object.entries(actions);
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <SectionTitle icon="🌐">Uplift Global</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Uplift" value={fmt(causalModel.global?.uplift, 3)} />
          <MetricCard label="Método" value={causalModel.global?.method} />
          <MetricCard label="Amostras" value={causalModel.global?.sampleSize} />
          <MetricCard label="Tratados" value={causalModel.global?.treatedCount} />
        </div>
        {causalModel.global?.ci && (
          <p className="text-xs text-slate-500 mt-3">
            IC 95%: [{fmt(causalModel.global.ci.low, 3)}, {fmt(causalModel.global.ci.high, 3)}]
          </p>
        )}
      </div>

      {actionEntries.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🎬">Uplift por Tipo de Ação ({actionEntries.length})</SectionTitle>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-2 pr-4">Ação</th>
                  <th className="pb-2 pr-4">Uplift</th>
                  <th className="pb-2 pr-4">Método</th>
                  <th className="pb-2 pr-4">Amostras</th>
                  <th className="pb-2">IC 95%</th>
                </tr>
              </thead>
              <tbody>
                {actionEntries.map(([actionType, estimate]) => (
                  <tr key={actionType} className="border-b border-slate-700/30 last:border-0">
                    <td className="py-2 pr-4 font-mono text-slate-200">{actionType}</td>
                    <td className={`py-2 pr-4 font-mono ${Number(estimate.uplift) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(estimate.uplift, 3)}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{estimate.method}</td>
                    <td className="py-2 pr-4 text-white">{estimate.sampleSize}</td>
                    <td className="py-2 text-xs text-slate-400">
                      {estimate.ci ? `[${fmt(estimate.ci.low, 2)}, ${fmt(estimate.ci.high, 2)}]` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {causalModel.actionCounts && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔢">Contagem de Eventos por Ação</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(causalModel.actionCounts).map(([action, count]) => (
              <span key={action} className="px-3 py-1.5 bg-slate-900/40 rounded-lg text-sm">
                <span className="text-slate-300 font-mono">{action}</span>
                <span className="text-slate-500 ml-2">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// Componente principal
// ==========================================================
export default function CoachControlCenter({
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  targetScore = 80,
}) {
  const {
    activeTab, setActiveTab, loading, error, hasError, lastRunTimestamp,
    dashboard, orchestratorResult, backtestReport, tunerHistory, tunerResult,
    causalModel, healthSnapshots, latestHealth, currentFlags, flagOverrides,
    strategySpace, runOrchestrator, runAutoTuner, applyRecommendation,
    rollbackToBaseline, toggleFlag, resetOverrides,
  } = useCoachControlCenter({ categories, simulados, studyLogs, maxScore, targetScore });

  return (
    <div className="bg-slate-900 min-h-screen text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Coach Control Center</h1>
            <p className="text-sm text-slate-400 mt-1">Centro de comando do ecossistema de predição e IA</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRunTimestamp && (
              <span className="text-xs text-slate-500">Última execução: {new Date(lastRunTimestamp).toLocaleTimeString('pt-BR')}</span>
            )}
            <button
              onClick={() => runOrchestrator({ runHealth: true, runLLM: false, runAutoTuner: false, trainCausalModel: false })}
              disabled={loading}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Executando...' : '▶ Executar Orquestrador'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-slate-800/40 rounded-xl overflow-x-auto hide-scrollbar">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="📊">Visão Geral</TabButton>
          <TabButton active={activeTab === 'flags'} onClick={() => setActiveTab('flags')} icon="🎛️">Feature Flags</TabButton>
          <TabButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon="🏥">Saúde & Drift</TabButton>
          <TabButton active={activeTab === 'causal'} onClick={() => setActiveTab('causal')} icon="🔬">Causalidade</TabButton>
          <TabButton active={activeTab === 'autotuner'} onClick={() => setActiveTab('autotuner')} icon="🤖">AutoTuner</TabButton>
          <TabButton active={activeTab === 'backtest'} onClick={() => setActiveTab('backtest')} icon="📈">Backtests</TabButton>
        </div>

        {hasError && <ErrorAlert key={error} message={error} />}
        {loading && !dashboard && <LoadingSpinner />}

        <div className="min-h-[400px]">
          {activeTab === 'overview' && <OverviewPanel dashboard={dashboard} orchestratorResult={orchestratorResult} />}
          {activeTab === 'flags' && (
            <FlagsPanel currentFlags={currentFlags} flagOverrides={flagOverrides} strategySpace={strategySpace} toggleFlag={toggleFlag} resetOverrides={resetOverrides} />
          )}
          {activeTab === 'health' && <HealthPanel latestHealth={latestHealth} healthSnapshots={healthSnapshots} />}
          {activeTab === 'causal' && <CausalPanel causalModel={causalModel} />}
          {activeTab === 'autotuner' && (
            <AutoTunerPanel tunerResult={tunerResult} tunerHistory={tunerHistory} runAutoTuner={runAutoTuner} applyRecommendation={applyRecommendation} rollbackToBaseline={rollbackToBaseline} loading={loading} />
          )}
          {activeTab === 'backtest' && <BacktestPanel backtestReport={backtestReport} />}
        </div>
      </div>
    </div>
  );
}

```

## `src/components/coach/CoachMenuNav.jsx`

```javascript
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

const TAB_IDS = {
    insights: 'coach-tab-insights',
    analytics: 'coach-tab-analytics'
};

const MenuTab = React.memo(function MenuTab({ active, onClick, onKeyDown, icon: Icon, label, subtitle, tabId, panelId, disabled = false, tabRef, tabKey }) {
    const handleClick = useCallback(() => {
        onClick(tabKey);
    }, [onClick, tabKey]);

    return (
        <button
            ref={tabRef}
            type="button"
            onClick={handleClick}
            onKeyDown={onKeyDown}
            disabled={disabled}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            aria-disabled={disabled}
            id={tabId}
            // FIX: expressão redundante simplificada (roving tabindex correto)
            tabIndex={active ? 0 : -1}
            className={`group relative min-w-0 rounded-2xl p-4 transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c14] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${active
                ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30'
                : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/60 hover:border-white/10'
                } border`}
        >
            {active && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 blur-md -z-10" />
            )}
            <div className="flex items-center gap-4">
                <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-300 ${active
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-500 group-hover:text-slate-400'
                    }`}>
                    <Icon size={20} className={active ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''} />
                </div>
                <div className="flex flex-col items-start min-w-0 text-left min-h-[36px] justify-center">
                    <span className={`text-sm font-black tracking-tight truncate w-full transition-colors duration-300 ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        }`}>
                        {label}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest truncate w-full transition-colors duration-300 ${active ? 'text-indigo-400/80' : 'text-slate-500'
                        }`}>
                        {subtitle}
                    </span>
                </div>
            </div>
            {/* FIX (BUG-18): bottom-0 em vez de -bottom-[1px] para não ser cortado por overflow do pai */}
            {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-indigo-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.5)]" />
            )}
        </button>
    );
});

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    const isPremiumBool = Boolean(isPremium);
    const insightsRef = useRef(null);
    const analyticsRef = useRef(null);

    const tabs = useMemo(() => [
        {
            key: 'insights',
            label: 'Plano de Estudo',
            subtitle: 'Sugestões & Metas',
            icon: Sparkles,
            tabRef: insightsRef
        },
        {
            key: 'analytics',
            label: 'Raio-X Técnico',
            subtitle: 'Calibração & Desvios',
            icon: BarChart3,
            tabRef: analyticsRef
        }
    ], []);

    const handleKeyDown = useCallback((e) => {
        // FIX: helper genérico de tab desabilitada
        const isDisabled = (tab) => tab.key === 'analytics' && !isPremiumBool;

        // FIX (BUG-23): suporte a Home/End (navegação ARIA completa de tablist)
        if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            const enabled = tabs.filter((t) => !isDisabled(t));
            if (enabled.length === 0) return;
            const target = e.key === 'Home' ? enabled[0] : enabled[enabled.length - 1];
            if (target && target.key !== activeTab) {
                onChangeTab(target.key);
            }
            return;
        }

        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const currentIndex = tabs.findIndex(t => t.key === activeTab);
            let nextIndex = currentIndex;
            // BUG-06 FIX: safety counter previne loop infinito se todas tabs estiverem desabilitadas
            let attempts = 0;
            do {
                nextIndex = e.key === 'ArrowRight' ? nextIndex + 1 : nextIndex - 1;
                if (nextIndex >= tabs.length) nextIndex = 0;
                if (nextIndex < 0) nextIndex = tabs.length - 1;
                attempts++;
            } while (nextIndex !== currentIndex && isDisabled(tabs[nextIndex]) && attempts < tabs.length);

            const nextTab = tabs[nextIndex];
            if (nextTab && nextTab.key !== activeTab) {
                onChangeTab(nextTab.key);
            }
            // FIX: acesso a ref no render não ocorre, o foco acontece de forma assíncrona/após montagem
        }
    }, [activeTab, onChangeTab, tabs, isPremiumBool]);

    // FIX: Restaura foco apenas quando usuário interage via teclado (evita roubar foco on mount)
    useEffect(() => {
        const activeItem = tabs.find(t => t.key === activeTab);
        if (activeItem?.tabRef?.current && document.activeElement?.getAttribute?.('role') === 'tab') {
            activeItem.tabRef.current.focus();
        }
    }, [activeTab, tabs]);

    return (
        <div
            role="tablist"
            aria-label="Navegação do Coach"
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8"
        >
            {tabs.map((tab) => (
                <div key={tab.key} className="flex-1">
                    <MenuTab
                        active={activeTab === tab.key}
                        onClick={onChangeTab}
                        onKeyDown={handleKeyDown}
                        icon={tab.icon}
                        label={tab.label}
                        subtitle={tab.subtitle}
                        tabId={TAB_IDS[tab.key]}
                        panelId={`coach-panel-${tab.key}`}
                        disabled={tab.key === 'analytics' && !isPremiumBool}
                        tabRef={tab.tabRef}
                        tabKey={tab.key}
                    />
                </div>
            ))}
        </div>
    );
}

```

## `src/engine/evaluation/coachEvaluator.js`

```javascript
/**
 * coachEvaluator.js
 *
 * Lote 8 — Evaluation engine para o Coach.
 *
 * Mede:
 * - calibração de probabilidade;
 * - erro de previsão de nota;
 * - qualidade de ranking de tópicos;
 * - uplift de tarefas;
 * - comparação entre estratégias.
 */
import {
  computeNDCGAtK,
  computeUplift,
} from '../../utils/coachBacktest.js';
import {
  computeBrierScore,
  computeLogLoss,
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const EVAL_STORAGE_KEY = 'coach_evaluation_results_v1';
const EVAL_STORAGE_MAX = 500;

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// FIX: remove acentos (NFD) para casar "Funções" ≙ "funcoes"
function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Avalia uma probabilidade prevista contra um resultado binário.
 */
export function evaluateProbabilityPrediction(
  predictedProbabilityPct,
  observedSuccess,
  _options = {}
) {
  const predictedPct = clampFinite(Number(predictedProbabilityPct), 0, 100, 50);
  const predictedProbability01 = predictedPct / 100;
  const observed = observedSuccess ? 1 : 0;
  const brier = computeBrierScore(predictedProbability01, observed);
  const logLoss = computeLogLoss(predictedProbability01, observed);

  return {
    predictedProbabilityPct: Number(predictedPct.toFixed(2)),
    predictedProbability01: Number(predictedProbability01.toFixed(6)),
    observed,
    observedSuccess: observed === 1,
    brier: Number.isFinite(brier) ? Number(brier.toFixed(6)) : null,
    logLoss: Number.isFinite(logLoss) ? Number(logLoss.toFixed(6)) : null,
    absoluteError: Number(Math.abs(predictedProbability01 - observed).toFixed(6)),
    hit:
      predictedProbability01 >= 0.5
        ? observed === 1
        : observed === 0,
  };
}

/**
 * Avalia previsão de nota contínua.
 */
export function evaluateScorePrediction(
  predictedScore,
  observedScore,
  options = {}
) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const predicted = clampFinite(Number(predictedScore), 0, maxScore, null);
  const observed = clampFinite(Number(observedScore), 0, maxScore, null);

  if (predicted === null || observed === null) {
    return null;
  }

  const error = observed - predicted;
  const absoluteError = Math.abs(error);
  const normalizedError = absoluteError / maxScore;

  return {
    predicted: Number(predicted.toFixed(2)),
    observed: Number(observed.toFixed(2)),
    error: Number(error.toFixed(2)),
    absoluteError: Number(absoluteError.toFixed(2)),
    normalizedError: Number(normalizedError.toFixed(6)),
    maxScore,
  };
}

/**
 * Avalia ranking de tópicos usando NDCG, Precision@K e Recall@K.
 *
 * predictedTopics:
 * [{ name: 'Probabilidade', urgencyScore: 80 }]
 *
 * actualTopics:
 * [{ name: 'Probabilidade', relevance: 2 }]
 *
 * ou apenas:
 * ['Probabilidade', 'Funções']
 */
export function evaluateTopicRanking(
  predictedTopics = [],
  actualTopics = [],
  options = {}
) {
  const k = Math.max(1, Math.round(clampFinite(options.k, 1, 20, 5)));

  const safePredicted = (Array.isArray(predictedTopics) ? predictedTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        score: toFinite(
          topic?.urgencyScore ?? topic?.score ?? topic?.decisionScore,
          predictedTopics.length - index
        ),
      };
    })
    .sort((a, b) => b.score - a.score);

  const safeActual = (Array.isArray(actualTopics) ? actualTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      if (typeof topic === 'string') {
        return {
          id: normalizeName(topic),
          originalName: topic,
          relevance: 1,
        };
      }
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `actual-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        relevance: toFinite(topic?.relevance ?? topic?.weight ?? topic?.score, 1),
      };
    });

  if (safePredicted.length === 0 || safeActual.length === 0) {
    return {
      k,
      ndcg: 0,
      precisionAtK: 0,
      recallAtK: 0,
      hits: 0,
      predictedCount: safePredicted.length,
      actualCount: safeActual.length,
    };
  }

  const ndcgPredicted = safePredicted.map((topic) => ({ id: topic.id }));
  const ndcgActual = safeActual.map((topic) => ({
    id: topic.id,
    relevance: topic.relevance,
  }));
  const ndcg = computeNDCGAtK(ndcgPredicted, ndcgActual, k);

  const actualMap = new Map(
    safeActual.map((topic) => [topic.id, topic.relevance])
  );
  const topK = safePredicted.slice(0, k);
  const hits = topK.filter((topic) => actualMap.has(topic.id)).length;
  const precisionAtK = topK.length > 0 ? hits / topK.length : 0;
  const recallAtK = actualMap.size > 0 ? hits / actualMap.size : 0;

  return {
    k,
    ndcg: Number(ndcg.toFixed(6)),
    precisionAtK: Number(precisionAtK.toFixed(6)),
    recallAtK: Number(recallAtK.toFixed(6)),
    hits,
    predictedCount: safePredicted.length,
    actualCount: safeActual.length,
  };
}

/**
 * Avalia uplift de tarefas concluídas vs não concluídas.
 *
 * events:
 * [
 *   { taskId, completed, preScore, postScore }
 * ]
 */
export function evaluateTaskUplift(events = [], _options = {}) {
  const safeEvents = (Array.isArray(events) ? events : []).filter(Boolean);
  const completedDeltas = [];
  const controlDeltas = [];

  safeEvents.forEach((event) => {
    const pre = toFinite(event?.preScore, NaN);
    const post = toFinite(event?.postScore, NaN);
    if (!Number.isFinite(pre) || !Number.isFinite(post)) return;
    const delta = post - pre;
    if (event?.completed === true) {
      completedDeltas.push(delta);
    } else {
      controlDeltas.push(delta);
    }
  });

  const avgCompletedDelta = meanValues(completedDeltas);
  const avgControlDelta = meanValues(controlDeltas);
  const uplift = computeUplift(controlDeltas, completedDeltas);

  return {
    completedCount: completedDeltas.length,
    controlCount: controlDeltas.length,
    avgCompletedDelta:
      avgCompletedDelta === null ? null : Number(avgCompletedDelta.toFixed(4)),
    avgControlDelta:
      avgControlDelta === null ? null : Number(avgControlDelta.toFixed(4)),
    uplift: Number.isFinite(uplift) ? Number(uplift.toFixed(4)) : null,
  };
}

/**
 * Avalia um snapshot do Coach contra um resultado futuro.
 */
export function evaluateCoachSnapshot(snapshot = {}, outcome = {}, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const targetScore = clampFinite(options.targetScore, 0, maxScore, maxScore * 0.8);
  const predictedProbability = toFinite(snapshot?.probability, null);

  let observedSuccess = outcome?.success;
  if (observedSuccess === undefined || observedSuccess === null) {
    const observedScore = toFinite(outcome?.score, null);
    if (observedScore !== null) {
      observedSuccess = observedScore >= targetScore;
    }
  }

  const probabilityEvaluation =
    predictedProbability !== null && observedSuccess !== null
      ? evaluateProbabilityPrediction(predictedProbability, observedSuccess)
      : null;

  const scoreEvaluation = evaluateScorePrediction(
    snapshot?.predictedMean,
    outcome?.score,
    { maxScore }
  );

  let topicEvaluation = null;
  if (
    options.evaluateTopics !== false &&
    Array.isArray(snapshot?.weakTopics) &&
    snapshot.weakTopics.length > 0 &&
    Array.isArray(outcome?.relevantTopics) &&
    outcome.relevantTopics.length > 0
  ) {
    topicEvaluation = evaluateTopicRanking(
      snapshot.weakTopics,
      outcome.relevantTopics,
      {
        k: options.k ?? 5,
      }
    );
  }

  return {
    id:
      snapshot?.id ||
      `eval_${snapshot?.strategyId || 'strategy'}_${snapshot?.categoryId || 'category'}_${Date.now()}`,
    timestamp: toFinite(snapshot?.timestamp, Date.now()),
    strategyId: snapshot?.strategyId ?? null,
    categoryId: snapshot?.categoryId ?? null,
    categoryName: snapshot?.categoryName ?? null,
    normalizedScore: toFinite(snapshot?.normalizedScore, null),
    targetScore,
    maxScore,
    probabilityEvaluation,
    scoreEvaluation,
    topicEvaluation,
    taskUpliftEvaluation: null,
    meta: {
      snapshotKeys: Object.keys(snapshot || {}),
      outcomeKeys: Object.keys(outcome || {}),
    },
  };
}

/**
 * Resume várias avaliações.
 *
 * FIX: um único loop (reduce) em vez de 10 arrays + forEach separados —
 * mesma saída, menos alocação e menos passadas.
 */
export function summarizeCoachEvaluations(evaluations = [], options = {}) {
  const safeEvaluations = (Array.isArray(evaluations) ? evaluations : []).filter(
    Boolean
  );

  const acc = safeEvaluations.reduce(
    (result, evaluation) => {
      const probability = evaluation?.probabilityEvaluation;
      if (probability) {
        result.probabilityPairs.push({
          probability: probability.predictedProbability01,
          observed: probability.observed,
        });
        if (Number.isFinite(probability.brier)) result.briers.push(probability.brier);
        if (Number.isFinite(probability.logLoss)) result.logLosses.push(probability.logLoss);
        if (Number.isFinite(probability.absoluteError)) {
          result.probabilityAbsoluteErrors.push(probability.absoluteError);
        }
      }

      const score = evaluation?.scoreEvaluation;
      if (score) {
        if (Number.isFinite(score.absoluteError)) {
          result.scoreAbsoluteErrors.push(score.absoluteError);
        }
        if (Number.isFinite(score.normalizedError)) {
          result.scoreNormalizedErrors.push(score.normalizedError);
        }
      }

      const topics = evaluation?.topicEvaluation;
      if (topics) {
        if (Number.isFinite(topics.ndcg)) result.ndcgs.push(topics.ndcg);
        if (Number.isFinite(topics.precisionAtK)) result.precisions.push(topics.precisionAtK);
        if (Number.isFinite(topics.recallAtK)) result.recalls.push(topics.recallAtK);
      }

      const uplift = evaluation?.taskUpliftEvaluation?.uplift;
      if (Number.isFinite(uplift)) result.uplifts.push(uplift);

      return result;
    },
    {
      probabilityPairs: [],
      briers: [],
      logLosses: [],
      probabilityAbsoluteErrors: [],
      scoreAbsoluteErrors: [],
      scoreNormalizedErrors: [],
      ndcgs: [],
      precisions: [],
      recalls: [],
      uplifts: [],
    }
  );

  const diagnostics =
    acc.probabilityPairs.length >= 3
      ? computeCalibrationDiagnostics(acc.probabilityPairs, {
          bins: options.bins ?? 6,
        })
      : {
          ece: 0,
          mce: 0,
          reliability: [],
        };

  const avgBrier = meanValues(acc.briers);
  const avgLogLoss = meanValues(acc.logLosses);
  const avgProbabilityAbsoluteError = meanValues(acc.probabilityAbsoluteErrors);
  const mae = meanValues(acc.scoreAbsoluteErrors);
  const meanNormalizedError = meanValues(acc.scoreNormalizedErrors);
  const avgNdcg = meanValues(acc.ndcgs);
  const avgPrecisionAtK = meanValues(acc.precisions);
  const avgRecallAtK = meanValues(acc.recalls);
  const avgUplift = meanValues(acc.uplifts);

  return {
    count: safeEvaluations.length,
    generatedAt: Date.now(),
    probability: {
      count: acc.probabilityPairs.length,
      avgBrier: avgBrier === null ? null : Number(avgBrier.toFixed(6)),
      avgLogLoss: avgLogLoss === null ? null : Number(avgLogLoss.toFixed(6)),
      avgAbsoluteError:
        avgProbabilityAbsoluteError === null
          ? null
          : Number(avgProbabilityAbsoluteError.toFixed(6)),
      ece: Number(diagnostics.ece.toFixed(6)),
      mce: Number(diagnostics.mce.toFixed(6)),
      reliability: diagnostics.reliability || [],
    },
    score: {
      count: acc.scoreAbsoluteErrors.length,
      mae: mae === null ? null : Number(mae.toFixed(4)),
      meanNormalizedError:
        meanNormalizedError === null
          ? null
          : Number(meanNormalizedError.toFixed(6)),
    },
    topics: {
      count: acc.ndcgs.length,
      avgNdcg: avgNdcg === null ? null : Number(avgNdcg.toFixed(6)),
      avgPrecisionAtK:
        avgPrecisionAtK === null ? null : Number(avgPrecisionAtK.toFixed(6)),
      avgRecallAtK:
        avgRecallAtK === null ? null : Number(avgRecallAtK.toFixed(6)),
    },
    tasks: {
      count: acc.uplifts.length,
      avgUplift: avgUplift === null ? null : Number(avgUplift.toFixed(4)),
    },
    strategyIds: [
      ...new Set(
        safeEvaluations
          .map((evaluation) => evaluation?.strategyId)
          .filter(Boolean)
      ),
    ],
  };
}

/**
 * Compara dois summaries.
 *
 * FIX: heurística clampada em [-1, 1] (pesos fracionários 0.40/0.25/0.35)
 * para não produzir scores fora da faixa quando os deltas normalizados
 * excedem [-1, 1].
 */
export function compareEvaluationSummaries(baseline = {}, candidate = {}) {
  const baseProbability = baseline?.probability || {};
  const candProbability = candidate?.probability || {};
  const baseScore = baseline?.score || {};
  const candScore = candidate?.score || {};
  const baseTopics = baseline?.topics || {};
  const candTopics = candidate?.topics || {};

  const deltaBrier =
    toFinite(candProbability.avgBrier, 0) - toFinite(baseProbability.avgBrier, 0);
  const deltaLogLoss =
    toFinite(candProbability.avgLogLoss, 0) -
    toFinite(baseProbability.avgLogLoss, 0);
  const deltaEce =
    toFinite(candProbability.ece, 0) - toFinite(baseProbability.ece, 0);
  const deltaMae =
    toFinite(candScore.mae, 0) - toFinite(baseScore.mae, 0);
  const deltaNdcg =
    toFinite(candTopics.avgNdcg, 0) - toFinite(baseTopics.avgNdcg, 0);
  const deltaPrecision =
    toFinite(candTopics.avgPrecisionAtK, 0) -
    toFinite(baseTopics.avgPrecisionAtK, 0);

  const normBrier = deltaBrier / Math.max(0.001, Math.abs(toFinite(baseProbability.avgBrier, 0.2)));
  const normNdcg = deltaNdcg / Math.max(0.001, Math.abs(toFinite(baseTopics.avgNdcg, 0.5)));
  const normEce = deltaEce / Math.max(0.001, Math.abs(toFinite(baseProbability.ece, 0.15)));

  // FIX: clamp [-1, 1]
  const heuristicScore = Math.max(-1, Math.min(1,
    -normBrier * 0.40 +
    -normEce * 0.25 +
    normNdcg * 0.35
  ));

  let winner = 'tie';
  if (heuristicScore > 0.001) {
    winner = 'candidate';
  } else if (heuristicScore < -0.001) {
    winner = 'baseline';
  }

  return {
    baselineCount: baseline?.count ?? 0,
    candidateCount: candidate?.count ?? 0,
    delta: {
      brier: Number(deltaBrier.toFixed(6)),
      logLoss: Number(deltaLogLoss.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
      mae: Number(deltaMae.toFixed(4)),
      ndcg: Number(deltaNdcg.toFixed(6)),
      precisionAtK: Number(deltaPrecision.toFixed(6)),
    },
    heuristicScore: Number(heuristicScore.toFixed(6)),
    winner,
  };
}

/**
 * Constrói dados prontos para dashboard.
 */
export function buildEvaluationDashboardData(summary = {}) {
  if (!summary || typeof summary !== 'object') return null;

  const probability = summary.probability || {};
  const score = summary.score || {};
  const topics = summary.topics || {};
  const tasks = summary.tasks || {};

  return {
    generatedAt: summary.generatedAt || Date.now(),
    count: summary.count || 0,
    cards: [
      {
        id: 'samples',
        label: 'Avaliações',
        value: summary.count || 0,
      },
      {
        id: 'brier',
        label: 'Brier médio',
        value: probability.avgBrier ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ece',
        label: 'ECE',
        value: probability.ece ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'mae',
        label: 'MAE de nota',
        value: score.mae ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ndcg',
        label: 'NDCG de tópicos',
        value: topics.avgNdcg ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'uplift',
        label: 'Uplift de tarefas',
        value: tasks.avgUplift ?? null,
        goodDirection: 'higher',
      },
    ],
    probability: {
      count: probability.count || 0,
      avgBrier: probability.avgBrier ?? null,
      avgLogLoss: probability.avgLogLoss ?? null,
      avgAbsoluteError: probability.avgAbsoluteError ?? null,
      ece: probability.ece ?? null,
      mce: probability.mce ?? null,
      reliability: probability.reliability || [],
    },
    score: {
      count: score.count || 0,
      mae: score.mae ?? null,
      meanNormalizedError: score.meanNormalizedError ?? null,
    },
    topics: {
      count: topics.count || 0,
      avgNdcg: topics.avgNdcg ?? null,
      avgPrecisionAtK: topics.avgPrecisionAtK ?? null,
      avgRecallAtK: topics.avgRecallAtK ?? null,
    },
    tasks: {
      count: tasks.count || 0,
      avgUplift: tasks.avgUplift ?? null,
    },
    strategyIds: summary.strategyIds || [],
  };
}

/**
 * Salva avaliações no localStorage.
 */
export function saveEvaluationResult(result) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];
    const toAdd = Array.isArray(result) ? result : [result];
    const next = [...current, ...toAdd]
      .filter(Boolean)
      .slice(-EVAL_STORAGE_MAX);
    storage.setItem(EVAL_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega avaliações salvas.
 */
export function loadEvaluationResults() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa avaliações salvas.
 */
export function clearEvaluationResults() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(EVAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateProbabilityPrediction,
  evaluateScorePrediction,
  evaluateTopicRanking,
  evaluateTaskUplift,
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
  buildEvaluationDashboardData,
  saveEvaluationResult,
  loadEvaluationResults,
  clearEvaluationResults,
};

```

## `src/engine/orchestrator/coachOrchestrator.js`

```javascript
/**
 * coachOrchestrator.js
 *
 * Lote 12 — Unified Coach Orchestrator
 *
 * Orquestra o ecossistema completo do Coach:
 * - motor principal;
 * - flags matemáticas;
 * - observabilidade;
 * - causal uplift;
 * - LLM explicativo;
 * - auto-tuner.
 *
 * Importante:
 * Este módulo não substitui o motor principal.
 * Ele coordena os módulos existentes e retorna um objeto unificado.
 */
import {
  getSuggestedFocus,
  generateDailyGoals,
  getBestTask,
  clearUrgencyCache,
  clearTopicsCache,
  clearMcCache,
} from '../../utils/coachLogic.js';

const ORCHESTRATOR_VERSION = '12.0.0';
// FIX (BUG-34): timeout padrão para não pendurar a UI em operações longas
const DEFAULT_TIMEOUT_MS = 30000;

const OPTIONAL_MODULE_PATHS = {
  coachOptimizer: '../../utils/coachOptimizer.js',
  coachObservability: '../../utils/coachObservability.js',
  coachCausal: '../../utils/coachCausal.js',
  explanationAgent: '../../llm/explanationAgent.js',
};

// FIX (BUG-11): whitelist explícita de paths permitidos no import dinâmico
const ALLOWED_PATHS = new Set(Object.values(OPTIONAL_MODULE_PATHS));

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getFeature(features, key, fallback = false) {
  try {
    if (features && typeof features[key] === 'boolean') {
      return features[key];
    }
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__COACH_FEATURES__ &&
      typeof globalThis.__COACH_FEATURES__[key] === 'boolean'
    ) {
      return globalThis.__COACH_FEATURES__[key];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Carrega módulos opcionais com fallback seguro.
 *
 * FIX (BUG-11): valida o path contra ALLOWED_PATHS antes do import.
 */
async function loadOptionalModule(name, meta) {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__COACH_MODULES__ &&
      globalThis.__COACH_MODULES__[name]
    ) {
      meta.modules[name] = 'registry';
      return globalThis.__COACH_MODULES__[name];
    }
    const path = OPTIONAL_MODULE_PATHS[name];
    // FIX: só carrega paths conhecidos
    if (!path || !ALLOWED_PATHS.has(path)) {
      meta.modules[name] = false;
      return null;
    }
    const module = await import(/* @vite-ignore */ path);
    meta.modules[name] = true;
    return module;
  } catch (err) {
    meta.modules[name] = false;
    meta.errors.push({
      module: name,
      message: err?.message || String(err),
    });
    return null;
  }
}

/**
 * Limpa caches principais do Coach.
 */
export function clearCoachCaches() {
  try {
    clearUrgencyCache();
  } catch {
    // ignore
  }
  try {
    clearTopicsCache();
  } catch {
    // ignore
  }
  try {
    clearMcCache();
  } catch {
    // ignore
  }
}

/**
 * Orquestrador principal.
 *
 * FIX (BUG-34): timeout configurável via options.timeoutMs (default 30s).
 * Passos verificam controller.signal.aborted e pulam adiante se estourar.
 */
export async function runCoachOrchestrator(input = {}, options = {}) {
  const startedAt = Date.now();
  const meta = {
    version: ORCHESTRATOR_VERSION,
    modules: {},
    errors: [],
    flags: {},
  };

  // FIX: validar input antes de processar
  const safeInput = input && typeof input === 'object' ? input : {};
  const categories = safeArray(safeInput.categories);
  const simulados = safeArray(safeInput.simulados);
  const studyLogs = safeArray(safeInput.studyLogs);
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const targetScore = clampFinite(
    options.targetScore,
    0,
    maxScore,
    maxScore * 0.8
  );

  // FIX (BUG-34): timeout + AbortController
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Flags iniciais.
    let features = {
      ...(globalThis.__COACH_FEATURES__ || {}),
      ...(options.features || {}),
    };
    globalThis.__COACH_FEATURES__ = features;

    const orchestratorEnabled =
      options.force === true ||
      getFeature(features, 'useCoachOrchestrator', false);

    if (!orchestratorEnabled) {
      return {
        ok: false,
        skipped: true,
        reason: 'useCoachOrchestrator disabled',
        generatedAt: Date.now(),
        meta,
      };
    }

    // ==========================================================
    // 1. Bootstrap de flags persistidas
    // ==========================================================
    const optimizerModule = await loadOptionalModule('coachOptimizer', meta);
    if (
      optimizerModule?.bootstrapCoachFlags &&
      options.loadPersistedFlags !== false
    ) {
      try {
        optimizerModule.bootstrapCoachFlags();
        features = {
          ...(globalThis.__COACH_FEATURES__ || {}),
          ...(options.features || {}),
        };
        globalThis.__COACH_FEATURES__ = features;
      } catch (err) {
        meta.errors.push({
          step: 'bootstrapCoachFlags',
          message: err?.message || String(err),
        });
      }
    }
    meta.flags = features;

    // ==========================================================
    // 2. Observabilidade / Health Guard
    // ==========================================================
    let health = null;
    const shouldRunHealth =
      options.runHealth !== false &&
      (
        getFeature(features, 'useObservability', false) ||
        getFeature(features, 'useDriftGuard', false) ||
        getFeature(features, 'useOrchestratorHealth', false)
      );

    if (shouldRunHealth && !controller.signal.aborted) {
      const observabilityModule = await loadOptionalModule(
        'coachObservability',
        meta
      );
      if (observabilityModule?.runCoachDriftGuard) {
        try {
          let series = {
            scores: [],
            volatilities: [],
            sampleSize: 0,
          };
          if (observabilityModule.extractObservabilitySeries) {
            series = observabilityModule.extractObservabilitySeries(simulados, {
              maxScore,
            });
          }
          health = observabilityModule.runCoachDriftGuard({
            scores: series.scores || [],
            volatilities: series.volatilities || [],
            sampleSize: series.sampleSize ?? 0,
            features,
            saveSnapshot: options.saveHealthSnapshots === true,
          });
        } catch (err) {
          meta.errors.push({
            step: 'observability',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 3. Causal Uplift / Policy Engine
    // ==========================================================
    let causalModule = null;
    let causalModel = null;
    const shouldLoadCausal =
      getFeature(features, 'useCausalUplift', false) ||
      getFeature(features, 'usePersonalizedPolicy', false) ||
      getFeature(features, 'useCausalTaskSelection', false);

    if (shouldLoadCausal && !controller.signal.aborted) {
      causalModule = await loadOptionalModule('coachCausal', meta);
      if (causalModule) {
        try {
          if (typeof causalModule.loadCausalModel === 'function') {
            causalModel = causalModule.loadCausalModel();
          }
          if (!causalModel && options.trainCausalModel === true) {
            const events = causalModule.buildCausalEventsFromHistory?.(
              categories,
              simulados,
              studyLogs,
              {
                maxScore,
                minTreatmentMinutes: options.minTreatmentMinutes ?? 60,
                maxHorizonDays: options.maxHorizonDays ?? 45,
              }
            );
            if (Array.isArray(events) && events.length > 0) {
              causalModel = causalModule.trainCausalModel?.(events, {
                maxScore,
                method: options.causalMethod || 'auto',
                useBootstrap: getFeature(features, 'useCausalBootstrap', false),
                bootstrapIterations: options.causalBootstrapIterations ?? 100,
                save: true,
              });
            }
          }
        } catch (err) {
          meta.errors.push({
            step: 'causal',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 4. Motor principal do Coach
    // ==========================================================
    const coachOptions = {
      ...options,
      maxScore,
      targetScore,
      features,
      allCategories: categories,
    };

    let focus = null;
    let tasks = [];
    let bestTask = null;

    try {
      focus = getSuggestedFocus(categories, simulados, studyLogs, coachOptions);
    } catch (err) {
      meta.errors.push({
        step: 'getSuggestedFocus',
        message: err?.message || String(err),
      });
    }

    try {
      tasks = generateDailyGoals(categories, simulados, studyLogs, coachOptions);
    } catch (err) {
      meta.errors.push({
        step: 'generateDailyGoals',
        message: err?.message || String(err),
      });
    }

    try {
      bestTask = getBestTask(categories, options.excludeTaskId ?? null);
    } catch (err) {
      meta.errors.push({
        step: 'getBestTask',
        message: err?.message || String(err),
      });
    }

    // ==========================================================
    // 5. Reordenação causal de tarefas
    // ==========================================================
    if (
      getFeature(features, 'useCausalTaskSelection', false) &&
      causalModule?.rerankCoachTasksWithCausalPolicy &&
      causalModel &&
      Array.isArray(tasks) &&
      tasks.length > 0 &&
      !controller.signal.aborted
    ) {
      try {
        tasks = causalModule.rerankCoachTasksWithCausalPolicy(
          tasks,
          causalModel,
          {
            maxScore,
            healthStatus: health?.status || null,
            causalWeight: options.causalWeight ?? 0.35,
          }
        );
      } catch (err) {
        meta.errors.push({
          step: 'causalTaskRerank',
          message: err?.message || String(err),
        });
      }
    }

    // ==========================================================
    // 6. Explicação LLM opcional
    // ==========================================================
    let llmExplanation = null;
    const shouldRunLLM =
      options.runLLM !== false &&
      (
        getFeature(features, 'useLLMExplanations', false) ||
        getFeature(features, 'useOrchestratorLLM', false)
      );

    if (shouldRunLLM && focus?.urgency && !controller.signal.aborted) {
      const explanationModule = await loadOptionalModule(
        'explanationAgent',
        meta
      );
      if (explanationModule?.enhanceCoachResultWithLLM) {
        try {
          const enhanced = await explanationModule.enhanceCoachResultWithLLM(
            focus.urgency,
            {
              features,
              context: {
                categoryName: focus.name || focus.categoryName || null,
                maxScore,
                targetScore,
              },
            }
          );
          llmExplanation = enhanced?.llmExplanation || null;
          if (llmExplanation && focus.urgency) {
            focus.urgency.llmExplanation = llmExplanation;
          }
        } catch (err) {
          meta.errors.push({
            step: 'llmExplanation',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 7. AutoTuner opcional
    // ==========================================================
    let tuner = null;
    const shouldRunTuner =
      options.runAutoTuner === true &&
      (
        getFeature(features, 'useAutoTuner', false) ||
        getFeature(features, 'useOrchestratorAutoTuner', false)
      );

    if (shouldRunTuner && !controller.signal.aborted) {
      const tunerModule =
        optimizerModule || (await loadOptionalModule('coachOptimizer', meta));
      if (tunerModule?.runCoachAutoTuner) {
        try {
          tuner = tunerModule.runCoachAutoTuner({
            maxScore,
            force: true,
            autoApply: options.autoApplyTuner === true,
            forceApply: options.forceApplyTuner === true,
            minImprovement: options.minImprovement ?? 0.02,
            exploration: options.exploration === true,
          });
          if (tuner?.applied) {
            clearCoachCaches();
          }
        } catch (err) {
          meta.errors.push({
            step: 'autoTuner',
            message: err?.message || String(err),
          });
        }
      }
    }

    // ==========================================================
    // 8. Resultado unificado
    // ==========================================================
    return {
      ok: true,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      version: ORCHESTRATOR_VERSION,
      focus,
      tasks: Array.isArray(tasks) ? tasks : [],
      bestTask,
      health: health || null,
      causal: {
        available: Boolean(causalModel),
        model: causalModel
          ? {
              generatedAt: causalModel.generatedAt ?? null,
              sampleSize: causalModel.sampleSize ?? null,
              method: causalModel.method ?? null,
              globalUplift: causalModel.global?.uplift ?? null,
              actionCount: causalModel.actions
                ? Object.keys(causalModel.actions).length
                : 0,
            }
          : null,
      },
      llmExplanation,
      tuner: tuner || null,
      meta,
    };
  } finally {
    // FIX (BUG-34): sempre limpar o timer de timeout
    clearTimeout(timeoutId);
  }
}

/**
 * Constrói um dashboard simples a partir do resultado do orquestrador.
 */
export function buildCoachOrchestratorDashboard(result = {}) {
  // FIX: validar result antes de processar
  if (!result || typeof result !== 'object') return null;

  const safeResult = result;
  const focus = safeResult.focus || null;
  const health = safeResult.health || null;
  const causal = safeResult.causal || null;
  const llm = safeResult.llmExplanation || null;
  const tuner = safeResult.tuner || null;
  const meta = safeResult.meta || {};

  return {
    generatedAt: safeResult.generatedAt || Date.now(),
    durationMs: safeResult.durationMs ?? null,
    version: safeResult.version || ORCHESTRATOR_VERSION,
    cards: [
      {
        id: 'focus_category',
        label: 'Foco principal',
        value: focus?.name || focus?.categoryName || null,
      },
      {
        id: 'focus_urgency',
        label: 'Urgência',
        value: focus?.urgency?.normalizedScore ?? null,
        goodDirection: 'contextual',
      },
      {
        id: 'tasks_count',
        label: 'Tarefas geradas',
        value: Array.isArray(safeResult.tasks) ? safeResult.tasks.length : 0,
      },
      {
        id: 'health_score',
        label: 'Health Score',
        value: health?.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'causal_model',
        label: 'Modelo causal',
        value: causal?.available ? 'Ativo' : 'Indisponível',
      },
      {
        id: 'llm_explanation',
        label: 'Explicação LLM',
        value: llm?.headline || null,
      },
      {
        id: 'tuner_action',
        label: 'Ação do AutoTuner',
        value: tuner?.recommendation?.action || null,
      },
    ],
    focus: focus
      ? {
          id: focus.id || null,
          name: focus.name || focus.categoryName || null,
          normalizedScore: focus.urgency?.normalizedScore ?? null,
          recommendation: focus.urgency?.recommendation ?? null,
          probability:
            focus.urgency?.details?.monteCarlo?.probability ?? null,
          llmExplanation: focus.urgency?.llmExplanation || null,
        }
      : null,
    tasks: Array.isArray(safeResult.tasks)
      ? safeResult.tasks.slice(0, 12).map((task) => ({
          id: task.id || null,
          text: task.text || null,
          priority: task.priority || null,
          categoryId: task.categoryId || null,
          categoryName: task.catName || task.category || null,
          topicName: task.topicName || null,
        }))
      : [],
    bestTask: safeResult.bestTask
      ? {
          id: safeResult.bestTask.id || null,
          text: safeResult.bestTask.text || null,
          priority: safeResult.bestTask.priority || null,
          catName: safeResult.bestTask.catName || null,
        }
      : null,
    health: health
      ? {
          healthScore: health.healthScore ?? null,
          status: health.status ?? null,
          alertsCount: Array.isArray(health.alerts)
            ? health.alerts.length
            : 0,
        }
      : null,
    causal,
    llm: llm
      ? {
          headline: llm.headline || null,
          severity: llm.severity || null,
          recommendation: llm.recommendation || null,
          confidence: llm.confidence ?? null,
          source: llm.source || null,
        }
      : null,
    tuner: tuner
      ? {
          action: tuner.recommendation?.action || null,
          strategyId: tuner.recommendation?.strategyId || null,
          reason: tuner.recommendation?.reason || null,
          applied: tuner.applied === true,
        }
      : null,
    errors: Array.isArray(meta.errors) ? meta.errors : [],
    modules: meta.modules || {},
    flags: meta.flags || {},
  };
}

export default {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};

```

## `src/hooks/useCoachControlCenter.js`

```javascript
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../utils/coachPipeline.js';
import {
  loadLastBacktestReport,
  loadTunerHistory,
  runCoachAutoTuner,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getSafeBaselineFeatures,
  getStrategySpace,
} from '../utils/coachOptimizer.js';
import {
  loadCausalModel,
} from '../utils/coachCausal.js';
import {
  loadModelHealthSnapshots,
} from '../utils/coachObservability.js';

const CONTROL_CENTER_STORAGE_KEY = 'coach_control_center_state_v1';

// FIX: conjunto de abas válidas para validar estado persistido
const VALID_TABS = new Set(['overview', 'flags', 'health', 'causal', 'autotuner', 'backtest']);

// FIX: valida shape do estado persistido (evita corromper a UI com dado inválido)
function loadControlCenterState() {
  try {
    const raw = localStorage.getItem(CONTROL_CENTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const state = {};
    if (typeof parsed.activeTab === 'string' && VALID_TABS.has(parsed.activeTab)) {
      state.activeTab = parsed.activeTab;
    }
    if (parsed.flagOverrides && typeof parsed.flagOverrides === 'object' && !Array.isArray(parsed.flagOverrides)) {
      const clean = {};
      for (const [k, v] of Object.entries(parsed.flagOverrides)) {
        if (typeof v === 'boolean') clean[k] = v;
      }
      state.flagOverrides = clean;
    }
    return state;
  } catch {
    return null;
  }
}

function saveControlCenterState(state) {
  try {
    localStorage.setItem(CONTROL_CENTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useCoachControlCenter({
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  targetScore = 80,
} = {}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [backtestReport, setBacktestReport] = useState(null);
  const [tunerHistory, setTunerHistory] = useState([]);
  const [tunerResult, setTunerResult] = useState(null);
  const [causalModel, setCausalModel] = useState(null);
  const [healthSnapshots, setHealthSnapshots] = useState([]);
  const [currentFlags, setCurrentFlags] = useState({});
  const [flagOverrides, setFlagOverrides] = useState({});
  const [lastRunTimestamp, setLastRunTimestamp] = useState(null);

  const isMounted = useRef(true);
  // FIX: contador de execução para descartar resultados obsoletos
  const orchestratorRunIdRef = useRef(0);
  const tunerRunIdRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ==========================================================
  // Carregar estado persistido
  // ==========================================================
  useEffect(() => {
    const persisted = loadControlCenterState();
    if (persisted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (persisted.activeTab) setActiveTab(persisted.activeTab);
      if (persisted.flagOverrides) setFlagOverrides(persisted.flagOverrides);
    }
    const flags = loadPersistedCoachFlags();
    setCurrentFlags(flags || {});
  }, []);

  // ==========================================================
  // Salvar estado quando mudar
  // ==========================================================
  useEffect(() => {
    saveControlCenterState({ activeTab, flagOverrides });
  }, [activeTab, flagOverrides]);

  // ==========================================================
  // Executar orquestrador completo
  // ==========================================================
  const runOrchestrator = useCallback(async (options = {}) => {
    // FIX: registra esta execução; resultados de execuções anteriores são descartados
    const runId = ++orchestratorRunIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const mergedFeatures = {
        ...currentFlags,
        ...flagOverrides,
        ...(options.features || {}),
        // PATCH: orquestrador configurável
        useCoachOrchestrator: (options.features?.useCoachOrchestrator ?? flagOverrides.useCoachOrchestrator ?? true),
      };
      const result = await runCoachOrchestrator(
        { categories, simulados, studyLogs },
        {
          maxScore,
          targetScore,
          features: mergedFeatures,
          runHealth: options.runHealth !== false,
          runLLM: options.runLLM === true,
          runAutoTuner: options.runAutoTuner === true,
          trainCausalModel: options.trainCausalModel === true,
          saveHealthSnapshots: options.saveHealthSnapshots === true,
          force: true,
        }
      );
      // FIX: valida mount E que esta ainda é a execução mais recente
      if (isMounted.current && runId === orchestratorRunIdRef.current && result) {
        setOrchestratorResult(result);
        const dash = buildCoachOrchestratorDashboard(result);
        if (dash) setDashboard(dash);
      }
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLastRunTimestamp(Date.now());
      return result;
    } catch (err) {
      if (isMounted.current && runId === orchestratorRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLoading(false);
    }
  }, [categories, simulados, studyLogs, maxScore, targetScore, currentFlags, flagOverrides]);

  // ==========================================================
  // Carregar dados auxiliares
  // ==========================================================
  const loadAuxiliaryData = useCallback(() => {
    try {
      const bt = loadLastBacktestReport();
      setBacktestReport(bt);
      const history = loadTunerHistory();
      setTunerHistory(Array.isArray(history) ? history : []);
      const causal = loadCausalModel();
      setCausalModel(causal);
      const health = loadModelHealthSnapshots();
      setHealthSnapshots(Array.isArray(health) ? health : []);
      const flags = loadPersistedCoachFlags();
      setCurrentFlags(flags || {});
    } catch (err) {
      console.warn('[ControlCenter] Failed to load auxiliary data:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAuxiliaryData();
  }, [loadAuxiliaryData]);

  // ==========================================================
  // Executar AutoTuner
  // ==========================================================
  const runAutoTuner = useCallback(async (options = {}) => {
    const runId = ++tunerRunIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await runCoachAutoTuner({
        maxScore,
        force: true,
        autoApply: options.autoApply === true,
        forceApply: options.forceApply === true,
        exploration: options.exploration === true,
        minImprovement: options.minImprovement ?? 0.02,
      });
      // FIX: valida mount + execução atual
      if (!isMounted.current || runId !== tunerRunIdRef.current) return null;
      setTunerResult(result);
      loadAuxiliaryData();
      if (result?.applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return result;
    } catch (err) {
      if (isMounted.current && runId === tunerRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === tunerRunIdRef.current) setLoading(false);
    }
  }, [maxScore, loadAuxiliaryData]);

  // ==========================================================
  // Aplicar recomendação de flags
  // ==========================================================
  const applyRecommendation = useCallback((recommendation, options = {}) => {
    try {
      const applied = applyRecommendedFlags(recommendation, {
        force: options.force === true,
      });
      if (applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return applied;
    } catch (err) {
      console.warn('[ControlCenter] Failed to apply recommendation:', err);
      return false;
    }
  }, []);

  // ==========================================================
  // Rollback para baseline
  // ==========================================================
  const rollbackToBaseline = useCallback(() => {
    try {
      const baseline = getSafeBaselineFeatures();
      const next = {
        ...(globalThis.__COACH_FEATURES__ || {}),
        ...baseline,
      };
      globalThis.__COACH_FEATURES__ = next;
      persistCoachFlags(next);
      clearCoachCaches();
      setCurrentFlags(next);
      setFlagOverrides({});
      return true;
    } catch {
      return false;
    }
  }, []);

  // ==========================================================
  // Toggle de flag individual
  // ==========================================================
  const toggleFlag = useCallback((flagKey, value) => {
    // FIX: só aceita chave string + valor boolean
    if (typeof flagKey !== 'string' || typeof value !== 'boolean') return;

    setFlagOverrides((prev) => ({
      ...prev,
      [flagKey]: value,
    }));
    const next = {
      ...(globalThis.__COACH_FEATURES__ || {}),
      [flagKey]: value,
    };
    globalThis.__COACH_FEATURES__ = next;
    persistCoachFlags(next);
    setCurrentFlags(next);
  }, []);

  // ==========================================================
  // Reset overrides
  // ==========================================================
  const resetOverrides = useCallback(() => {
    setFlagOverrides({});
    const flags = loadPersistedCoachFlags();
    setCurrentFlags(flags || {});
  }, []);

  // ==========================================================
  // Limpar caches
  // ==========================================================
  const handleClearCaches = useCallback(() => {
    clearCoachCaches();
  }, []);

  // ==========================================================
  // Dados derivados
  // ==========================================================
  const strategySpace = useMemo(() => getStrategySpace(), []);

  const latestHealth = useMemo(() => {
    if (healthSnapshots.length === 0) return null;
    return healthSnapshots[healthSnapshots.length - 1];
  }, [healthSnapshots]);

  const hasError = error !== null;
  const isReady = !loading && orchestratorResult !== null;

  return {
    // Estado
    activeTab,
    setActiveTab,
    loading,
    error,
    hasError,
    isReady,
    lastRunTimestamp,
    // Dados principais
    orchestratorResult,
    dashboard,
    backtestReport,
    tunerHistory,
    tunerResult,
    causalModel,
    healthSnapshots,
    latestHealth,
    currentFlags,
    flagOverrides,
    strategySpace,
    // Ações
    runOrchestrator,
    loadAuxiliaryData,
    runAutoTuner,
    applyRecommendation,
    rollbackToBaseline,
    toggleFlag,
    resetOverrides,
    handleClearCaches,
  };
}

export default useCoachControlCenter;

```

## `src/llm/coachLLMIntegration.js`

```javascript
/**
 * coachLLMIntegration.js
 *
 * Lote 6 — Integração opcional do mini-LLM com funções síncronas do Coach.
 *
 * Como o Coach principal é síncrono, esta camada cria wrappers assíncronos.
 */
import { getSuggestedFocus } from '../utils/coachLogic.js';
import { enhanceCoachResultWithLLM } from './explanationAgent.js';

/**
 * Wrapper assíncrono de getSuggestedFocus com explicação LLM.
 *
 * FIX: try/catch no motor síncrono (evita unhandled rejection) e
 * degradação graciosa se o LLM falhar (retorna focus sem enhancement).
 */
export async function getSuggestedFocusWithLLM(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  // FIX: getSuggestedFocus é síncrono e pode lançar — proteger
  let focus = null;
  try {
    focus = getSuggestedFocus(categories, simulados, studyLogs, options);
  } catch (err) {
    console.warn('[CoachLLM] getSuggestedFocus failed:', err);
    return null;
  }

  if (!focus) return null;

  // FIX: só enhance se urgency for um objeto válido
  if (!focus.urgency || typeof focus.urgency !== 'object') return focus;

  try {
    const enhancedUrgency = await enhanceCoachResultWithLLM(focus.urgency, {
      ...options,
      context: {
        categoryName: focus.name || focus.categoryName || null,
        maxScore: options.maxScore,
        targetScore: options.targetScore,
        ...(options.context || {}),
      },
    });

    // FIX: se o enhancement retornar algo inválido, mantém o original
    if (!enhancedUrgency || typeof enhancedUrgency !== 'object') {
      return focus;
    }

    return {
      ...focus,
      urgency: enhancedUrgency,
    };
  } catch (err) {
    // FIX: LLM é opcional — nunca quebrar o Coach por causa dele
    console.warn('[CoachLLM] enhanceCoachResultWithLLM failed:', err);
    return focus;
  }
}

/**
 * Wrapper simples para explicar qualquer resultado do calculateUrgency.
 *
 * FIX: valida input e degrada graciosamente (retorna o input se falhar).
 */
export async function explainUrgencyResult(urgencyResult, options = {}) {
  if (!urgencyResult || typeof urgencyResult !== 'object') {
    return urgencyResult ?? null;
  }
  try {
    const enhanced = await enhanceCoachResultWithLLM(urgencyResult, options);
    return enhanced && typeof enhanced === 'object' ? enhanced : urgencyResult;
  } catch (err) {
    console.warn('[CoachLLM] explainUrgencyResult failed:', err);
    return urgencyResult;
  }
}

export default {
  getSuggestedFocusWithLLM,
  explainUrgencyResult,
};

```

## `src/pages/Coach.jsx`

```javascript
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Brain, Zap, AlertCircle, ArrowUpRight, ShieldCheck, Dna, List, BookOpen, Database
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';
import { calculateAdaptiveSlope } from '../engine/projection.js';
import PageHeader from '../components/header/PageHeader';
import AICoachView from '../components/AICoachView';
import CoachMenuNav from '../components/coach/CoachMenuNav';
import MonteCarloDebugger from '../components/MonteCarloDebugger';
import ReliabilityCurveChart from '../components/charts/ReliabilityCurveChart';
import { getFlashcardDueTodayCount } from '../utils/analytics';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../context/useAuth';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import {
  getSuggestedFocus, generateDailyGoals, clearMcCache,
  clearUrgencyCache, clearTopicsCache, getCombinedHistory
} from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import {
  logCalibrationTelemetryEvent,
  getCalibrationTelemetrySummary,
  clearCalibrationTelemetry
} from '../utils/calibrationTelemetry';
import {
  CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS,
  backfillObservedFromSimulados, computeRollingCalibrationParams,
  recordPredictionEvent, buildCalibrationDashboardSeries
} from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDatePtBR, formatDateTimePtBR } from '../utils/dateHelper';
import { getCalibrationKey } from '../utils/coachSafe.js';

const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;
const CALIBRATION_ALERT_CACHE_MAX = 200;
const BRIER_VISUAL_MAX = 0.35;
const BRIER_VISUAL_CRIT = 0.25;
const BRIER_VISUAL_WARN = 0.18;
const CALIBRATION_EVENTS_MAX = 300;
const LEARNING_EVENT_STALE_MS = 6 * 3600000;

// FIX: congelado só p/ retornos defensivos; STABLE_EMPTY p/ hooks que podem iterar/mutar
const EMPTY_ARRAY = Object.freeze([]);
const STABLE_EMPTY = [];

function normalizeToArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return EMPTY_ARRAY;
}
function sanitizeMaxScore(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 100;
}
function resolveTargetScorePoints({ user, minScore = 0, maxScore = 100 }) {
  const safeMax = sanitizeMaxScore(maxScore);
  const safeMin = Math.max(0, Math.min(Number(minScore) || 0, safeMax));
  const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));
  if (user?.targetScore != null && user.targetScore !== '' && Number.isFinite(Number(user.targetScore))) {
    let ts = Number(user.targetScore);
    if (ts <= 100 && safeMax !== 100) {
      ts = (ts / 100) * safeMax;
    }
    return clamp(ts);
  }
  if (user?.targetProbability != null && user.targetProbability !== '' && Number.isFinite(Number(user.targetProbability))) {
    return clamp((Number(user.targetProbability) / 100) * safeMax);
  }
  return clamp(safeMax * 0.8);
}

export default function Coach() {
  const calibrationAlertCacheRef = useRef(new Map());
  const activeId = useAppStore(state => state.appState.activeId);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const data = useAppStore(useShallow(state => {
    const contest = state.appState?.contests?.[state.appState?.activeId] || {};
    return {
      simuladoRows: contest.simuladoRows,
      simulados: contest.simulados,
      categories: contest.categories,
      flashcardDecks: contest.flashcardDecks,
      user: contest.user,
      calibrationHistoryByCategory: contest.calibrationHistoryByCategory,
      calibrationOps: contest.calibrationOps,
      calibrationAuditLog: contest.calibrationAuditLog,
      calibrationEvents: contest.calibrationEvents,
      maxScore: contest.maxScore,
      minScore: contest.minScore,
      studyLogs: contest.studyLogs,
      settings: contest.settings,
      coachPlan: contest.coachPlan,
      coachPlanner: contest.coachPlanner
    };
  }));
  const isHydrated = useAppStore(state => state.appState.isHydrated);
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);
  const rawHistory = data?.simuladoRows || EMPTY_ARRAY;
  const history = useMemo(() => normalizeToArray(rawHistory), [rawHistory]);
  const rawSimulados = data?.simulados || EMPTY_ARRAY;
  const simulados = useMemo(() => normalizeToArray(rawSimulados), [rawSimulados]);
  const rawCategories = data?.categories || EMPTY_ARRAY;
  const categories = useMemo(() =>
    normalizeToArray(rawCategories).map(c => ({
      ...c,
      tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })),
    [rawCategories]
  );
  const rawFlashcardDecks = data?.flashcardDecks || EMPTY_ARRAY;
  const flashcardDecks = useMemo(() => normalizeToArray(rawFlashcardDecks), [rawFlashcardDecks]);
  const rawStudyLogs = data?.studyLogs || EMPTY_ARRAY;
  const studyLogs = useMemo(() => normalizeToArray(rawStudyLogs), [rawStudyLogs]);
  const flashcardDue = useMemo(() => getFlashcardDueTodayCount(flashcardDecks), [flashcardDecks]);
  const { currentUser } = useAuth();
  const userProfile = data?.user;
  const updateCoachScore = useAppStore(state => state.updateCoachScore);
  const { isPremium } = useSubscription(currentUser || userProfile);
  const navigate = useNavigate();
  const isPremiumBool = Boolean(isPremium);
  const [activeTab, setActiveTab] = useState('insights');
  const safeActiveTab = (activeTab === 'analytics' && isPremiumBool) ? 'analytics' : 'insights';
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [coachLoading, setCoachLoading] = useState(false);
  const [suggestedFocus, setSuggestedFocus] = useState(null);
  const timeoutRef = useRef(null);
  const lastPushedScoreRef = useRef(null);
  const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});
  const isMountedRef = useRef(true);
  const idleCallbackIdsRef = useRef([]);
  const rafIdsRef = useRef([]);
  const lastPersistByCategoryRef = useRef(new Map());
  const calibrationEventsRef = useRef(data?.calibrationEvents || []);
  useEffect(() => { calibrationEventsRef.current = data?.calibrationEvents || []; }, [data?.calibrationEvents]);

  const cancelPendingCalibrationWork = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    idleCallbackIdsRef.current.forEach(id => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id);
    });
    idleCallbackIdsRef.current = [];
    rafIdsRef.current = [];
    setTimeout(() => {
      if (isMountedRef.current) setCoachLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    clearMcCache();
    clearUrgencyCache();
    clearTopicsCache();
    calibrationAlertCacheRef.current.clear();
    lastPersistByCategoryRef.current.clear();
    cancelPendingCalibrationWork();
  }, [activeId, cancelPendingCalibrationWork]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelPendingCalibrationWork();
    };
  }, [cancelPendingCalibrationWork]);

  useEffect(() => {
    calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
  }, [data?.calibrationHistoryByCategory]);

  const persistCalibrationMetric = useCallback((metric) => {
    if (!isMountedRef.current || !metric) return;
    if (metric.contestId != null && metric.contestId !== activeIdRef.current) return;
    const now = Date.now();
    const rawCategoryId = metric?.categoryId || metric?.categoryName;
    if (!rawCategoryId) return;
    const normalizedCategoryId = getCalibrationKey(rawCategoryId);
    const toFinite = (value, fallback = null) => {
      if (value === null || value === undefined || value === '') return fallback;
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };
    const metricTimestamp = metric?.timestamp && Number.isFinite(Number(metric.timestamp)) && Number(metric.timestamp) > 100000000000
      ? Number(metric.timestamp)
      : now;
    const avgBrier = toFinite(metric?.avgBrier, null);
    const ece = toFinite(metric?.ece, null);
    const probability = toFinite(metric?.probability, null);
    const calibrationPenalty = toFinite(metric?.calibrationPenalty, 0);
    const reliability = Array.isArray(metric?.reliability) ? metric.reliability : [];
    const isDegraded = metric?.degraded === true || calibrationPenalty >= HIGH_PENALTY_THRESHOLD;
    const hasUsefulSignal =
      avgBrier !== null || ece !== null || probability !== null ||
      calibrationPenalty > 0 || reliability.length > 0;
    if (!hasUsefulSignal) return;
    const lastAt = Number(lastPersistByCategoryRef.current.get(normalizedCategoryId) || 0);
    if (now - lastAt < 500) return;
    lastPersistByCategoryRef.current.set(normalizedCategoryId, now);
    if (lastPersistByCategoryRef.current.size > 200) {
      const oldestKey = lastPersistByCategoryRef.current.keys().next().value;
      lastPersistByCategoryRef.current.delete(oldestKey);
    }
    const normalizedMetric = {
      ...metric,
      categoryId: normalizedCategoryId,
      categoryName: metric?.categoryName || normalizedCategoryId,
      timestamp: metricTimestamp,
      avgBrier, ece, probability, calibrationPenalty, reliability
    };
    let wasPersisted = false;
    setData(prev => {
      if (!prev) return prev;
      const current = prev.calibrationHistoryByCategory || {};
      const categoryHistory = current[normalizedCategoryId] || [];
      const lastEntry = categoryHistory[categoryHistory.length - 1];
      const hasComparableLast = lastEntry && Number.isFinite(Number(lastEntry?.timestamp));
      if (hasComparableLast) {
        const metricDelta = (currentValue, previousValue) => {
          const currentFinite = currentValue !== null && currentValue !== undefined && currentValue !== '' && Number.isFinite(Number(currentValue));
          const previousFinite = previousValue !== null && previousValue !== undefined && previousValue !== '' && Number.isFinite(Number(previousValue));
          if (currentFinite && previousFinite) return Math.abs(Number(previousValue) - Number(currentValue));
          if (!currentFinite && !previousFinite) return 0;
          return Infinity;
        };
        const toReliabilitySignature = (bucketList = []) =>
          (Array.isArray(bucketList) ? bucketList : [])
            .map((bucket) => {
              const meanPred = Number(bucket?.meanPred);
              const observedRate = Number(bucket?.observedRate);
              const gap = Number(bucket?.gap);
              const count = Number(bucket?.count) || 0;
              return `${count}|${Number.isFinite(meanPred) ? meanPred.toFixed(3) : 'na'}|${Number.isFinite(observedRate) ? observedRate.toFixed(3) : 'na'}|${Number.isFinite(gap) ? gap.toFixed(3) : 'na'}`;
            })
            .join('::');
        const brierDelta = metricDelta(avgBrier, lastEntry.avgBrier);
        const eceDelta = metricDelta(ece, lastEntry.ece);
        const penaltyDelta = Math.abs(Number(lastEntry.calibrationPenalty || 0) - calibrationPenalty);
        const probabilityDelta = metricDelta(probability, lastEntry.probability);
        const reliabilitySignatureChanged =
          toReliabilitySignature(lastEntry?.reliability) !== toReliabilitySignature(reliability);
        const shouldSkipPersist =
          (brierDelta < 0.001 && (brierDelta / Math.max(0.001, lastEntry.avgBrier)) < 0.05) &&
          (eceDelta < 0.001 && (eceDelta / Math.max(0.001, lastEntry.ece)) < 0.05) &&
          penaltyDelta < 0.001 &&
          probabilityDelta < 0.01 &&
          !reliabilitySignatureChanged;
        if (shouldSkipPersist) return prev;
      }
      const cutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
      const cleaned = categoryHistory.filter(
        item => Number.isFinite(Number(item?.timestamp)) && Number(item.timestamp) >= cutoff
      );
      const nextHistory = [...cleaned, normalizedMetric].slice(-60);
      const recent7 = nextHistory.filter(
        item => Number(item?.timestamp || 0) >= (metricTimestamp - 1000 * 60 * 60 * 24 * 7)
      );
      const recent7Brier = recent7
        .map(item => toFinite(item?.avgBrier, null))
        .filter(val => val !== null);
      const avgBrier7d = recent7Brier.length > 0
        ? recent7Brier.reduce((acc, val) => acc + val, 0) / recent7Brier.length
        : null;
      const calibrationOps = {
        ...(prev.calibrationOps || {}),
        [normalizedCategoryId]: {
          categoryName: normalizedMetric.categoryName,
          avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
          sample7d: recent7.length,
          degraded: isDegraded,
          updatedAt: now
        }
      };
      const { reliability: _reliability, ...auditMetric } = normalizedMetric;
      const auditCutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
      const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
        ...auditMetric,
        avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
        degraded: isDegraded,
        source: 'coach'
      }]
        .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= auditCutoff)
        .slice(-500);
      wasPersisted = true;
      return {
        calibrationHistoryByCategory: {
          ...(prev.calibrationHistoryByCategory || {}),
          [normalizedCategoryId]: nextHistory
        },
        calibrationOps,
        calibrationAuditLog
      };
    });
    if (!wasPersisted) return;
    try {
      if (normalizedMetric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
        logCalibrationTelemetryEvent({ ...normalizedMetric, eventType: 'high_penalty_alert' });
      } else {
        logCalibrationTelemetryEvent(normalizedMetric);
      }
    } catch (error) {
      console.warn('[Coach.jsx] Falha ao registrar telemetria de calibração:', error);
    }
    if (isDegraded) {
      const currentTime = Date.now();
      for (const [key, ts] of calibrationAlertCacheRef.current.entries()) {
        if (currentTime - ts > ALERT_COOLDOWN_MS) calibrationAlertCacheRef.current.delete(key);
      }
      const lastAlertAt = Number(calibrationAlertCacheRef.current.get(normalizedCategoryId) || 0);
      if (currentTime - lastAlertAt > ALERT_COOLDOWN_MS) {
        const brierLabel = avgBrier !== null ? Number(avgBrier).toFixed(2) : '—';
        const severityLabel = (avgBrier !== null && avgBrier >= CRITICAL_BRIER_THRESHOLD)
          ? 'CRÍTICA'
          : 'degradada';
        showToastRef.current(
          `⚠️ Calibração ${severityLabel} em ${displaySubject(normalizedMetric.categoryName || 'categoria')} (Brier ${brierLabel}).`,
          'warning'
        );
        calibrationAlertCacheRef.current.set(normalizedCategoryId, currentTime);
        if (calibrationAlertCacheRef.current.size > CALIBRATION_ALERT_CACHE_MAX) {
          const oldestKey = calibrationAlertCacheRef.current.keys().next().value;
          calibrationAlertCacheRef.current.delete(oldestKey);
        }
      }
    }
  }, [setData]);

  const scheduleCalibrationPersist = useCallback((metrics) => {
    metrics.forEach((metric) => {
      if ('requestIdleCallback' in window) {
        let id;
        id = window.requestIdleCallback(() => {
          idleCallbackIdsRef.current = idleCallbackIdsRef.current.filter(cbId => cbId !== id);
          persistCalibrationMetric(metric);
        }, { timeout: 2000 });
        idleCallbackIdsRef.current.push(id);
      } else {
        let rafId;
        rafId = requestAnimationFrame(() => {
          rafIdsRef.current = rafIdsRef.current.filter(cbId => cbId !== rafId);
          persistCalibrationMetric(metric);
        });
        rafIdsRef.current.push(rafId);
      }
    });
  }, [persistCalibrationMetric]);

  const runLearningCycle = useCallback((rawEvents, simuladosArr, maxScore) => {
    const backfilled = backfillObservedFromSimulados(rawEvents, simuladosArr, [], maxScore);
    const rolling = computeRollingCalibrationParams(backfilled, {});
    return { backfilled, rolling };
  }, []);

  const commitLearningCycle = useCallback((rawEvents, backfilled, newEvents = []) => {
    const pool = [...backfilled];
    const fresh = [];
    (newEvents || []).forEach(ev => {
      if (!ev || !Number.isFinite(Number(ev.probability)) || !ev.category) return;
      const catKey = getCalibrationKey(ev.category);
      const lastEv = [...pool, ...fresh].reverse().find(e => getCalibrationKey(e?.category) === catKey);
      const isStale = Boolean(lastEv) &&
        Math.abs(Number(lastEv.probability ?? -1) - Number(ev.probability)) <= 0.005 &&
        (Date.now() - Number(lastEv?.timestamp || 0)) <= LEARNING_EVENT_STALE_MS;
      if (!isStale) fresh.push(ev);
    });
    const backfillChanged =
      backfilled.length !== rawEvents.length ||
      backfilled.some((e, i) => e !== rawEvents[i]);
    if (fresh.length === 0 && !backfillChanged) return;
    setData(() => ({
      calibrationEvents: [...backfilled, ...fresh].slice(-CALIBRATION_EVENTS_MAX)
    }));
  }, [setData]);

  const currentMaxScore = sanitizeMaxScore(data?.maxScore);
  const combinedHistory = useMemo(
    () => getCombinedHistory(history, simulados, currentMaxScore),
    [history, simulados, currentMaxScore]
  );
  const targetScorePoints = useMemo(() => resolveTargetScorePoints({
    user: userProfile,
    minScore: data?.minScore,
    maxScore: currentMaxScore
  }), [userProfile, data?.minScore, currentMaxScore]);
  const targetScoreLabel = useMemo(() => {
    const safeMax = sanitizeMaxScore(currentMaxScore);
    return Math.round((targetScorePoints / safeMax) * 100);
  }, [targetScorePoints, currentMaxScore]);

  const mcStats = useMonteCarloStats({
    categories,
    goalDate: userProfile?.goalDate,
    targetScore: targetScorePoints,
    timeIndex: -1,
    // FIX: array estável não congelado (evita throw se o hook mutar)
    timelineDates: STABLE_EMPTY,
    minScore: data?.minScore ?? 0,
    maxScore: currentMaxScore,
    simuladoRows: history
  });
  const projectedScore = mcStats?.projectedMean;
  const volatility = mcStats?.statsData?.pooledSD ?? mcStats?.sd ?? 0;
  const safeVolatility = Number.isFinite(volatility) ? volatility : 0;
  const normalizedVolatility = useMemo(() => {
    const denom = Math.max(1, Number(currentMaxScore) || 1);
    return (safeVolatility / denom) * 100;
  }, [safeVolatility, currentMaxScore]);
  const drift = useMemo(() => {
    const slope = calculateAdaptiveSlope(combinedHistory, currentMaxScore);
    return Number.isFinite(slope) ? slope : 0;
  }, [combinedHistory, currentMaxScore]);
  const totalSimulados = useMemo(() => combinedHistory.length, [combinedHistory]);
  const mcStatsContext = useMemo(() => ({
    projectedMean: mcStats?.projectedMean,
    probability: mcStats?.probability,
    statsData: mcStats?.statsData,
    sd: mcStats?.sd
  }), [mcStats?.projectedMean, mcStats?.probability, mcStats?.statsData, mcStats?.sd]);
  const mcStatsContextRef = useRef(mcStatsContext);
  useEffect(() => { mcStatsContextRef.current = mcStatsContext; }, [mcStatsContext]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!Array.isArray(categories) || categories.length === 0) {
      setTimeout(() => {
        if (isMountedRef.current) setIsAnalyzing(false);
      }, 0);
      return;
    }
    let metricsTimer = null;
    const analysisTimer = setTimeout(() => {
      try {
        const targetScore = targetScorePoints;
        const collectedMetrics = [];
        const contestId = activeIdRef.current;
        const rawEvents = calibrationEventsRef.current || [];
        const { backfilled: backfilledEvents, rolling } = runLearningCycle(rawEvents, history, currentMaxScore);
        const result = getSuggestedFocus(
          categories, history, studyLogs,
          {
            user: data.user,
            targetScore,
            targetScoreLabel,
            maxScore: currentMaxScore,
            calibrationHistoryByCategory: calibrationHistoryRef.current,
            flashcardDecks,
            flashcardDue,
            onCalibrationMetric: (metric) => collectedMetrics.push({ ...metric, contestId }),
            globalMcStats: mcStatsContextRef.current,
            config: {
              MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false,
              userId: activeIdRef.current,
              ...(Number.isFinite(rolling?.baseline) && (rolling.confidenceFactor || 0) > 0 ? {
                MC_CALIBRATION_BRIER_BASELINE: rolling.baseline,
                MC_CALIBRATION_MAX_PENALTY: rolling.maxPenalty
              } : {})
            }
          }
        );
        const _mcCtx = mcStatsContextRef.current;
        if (result && _mcCtx && Number.isFinite(Number(_mcCtx.projectedMean))) {
          result.globalMcContext = {
            projectedMean: Number(Number(_mcCtx.projectedMean).toFixed(1)),
            probability: Number.isFinite(Number(_mcCtx.probability))
              ? Number(Number(_mcCtx.probability).toFixed(1))
              : null,
            source: 'useMonteCarloStats'
          };
        }
        setSuggestedFocus(result);
        const mcFocus = result?.urgency?.monteCarlo || result?.urgency?.details?.monteCarlo;
        const focusCat = result?.categoryId || result?.id || result?.name;
        const newEvents = [];
        if (mcFocus && Number.isFinite(Number(mcFocus.probability)) && focusCat) {
          newEvents.push(recordPredictionEvent({
            probability: Number(mcFocus.probability) / 100,
            probabilityRaw: Number(mcFocus.probabilityRaw ?? mcFocus.probability) / 100,
            targetScore,
            category: focusCat,
            sims: mcFocus?.diagnostics?.simulationCount
          }));
        }
        commitLearningCycle(rawEvents, backfilledEvents, newEvents);
        if (collectedMetrics.length > 0) {
          metricsTimer = setTimeout(() => {
            scheduleCalibrationPersist(collectedMetrics);
          }, 1000);
        }
      } catch (error) {
        console.error('[Coach.jsx] Falha ao calcular suggestedFocus:', error);
        setSuggestedFocus(null);
        showToastRef.current('Falha ao processar a análise do Coach.', 'error');
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
    return () => {
      clearTimeout(analysisTimer);
      if (metricsTimer) clearTimeout(metricsTimer);
    };
  }, [
    isHydrated, data?.user, data?.settings?.adaptiveCalibrationEnabled,
    userProfile?.targetProbability, flashcardDue, flashcardDecks,
    scheduleCalibrationPersist, targetScorePoints,
    currentMaxScore, targetScoreLabel, categories, history, studyLogs,
    runLearningCycle, commitLearningCycle
  ]);

  useEffect(() => {
    if (!Number.isFinite(projectedScore)) return;
    if (
      lastPushedScoreRef.current === null ||
      Math.abs(projectedScore - lastPushedScoreRef.current) > 0.01
    ) {
      lastPushedScoreRef.current = projectedScore;
      const timer = setTimeout(() => {
        if (updateCoachScore) updateCoachScore(projectedScore);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [projectedScore, updateCoachScore]);

  const handleChangeTab = useCallback((tab) => {
    const nextTab = (tab === 'analytics' && isPremiumBool) ? 'analytics' : 'insights';
    setActiveTab(nextTab);
  }, [isPremiumBool]);

  const userData = data?.user;
  const settingsData = data?.settings;

  const handleGenerateGoals = useCallback(() => {
    if (categories.length === 0 || coachLoading) return;
    setCoachLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!isMountedRef.current) return;
      try {
        const targetScore = targetScorePoints;
        const collectedMetrics = [];
        const contestId = activeIdRef.current;
        const newTasks = generateDailyGoals(
          categories, history, studyLogs,
          {
            user: userData,
            targetScore,
            targetScoreLabel,
            maxScore: currentMaxScore,
            calibrationHistoryByCategory: calibrationHistoryRef.current,
            onCalibrationMetric: (metric) => collectedMetrics.push({ ...metric, contestId }),
            config: {
              MC_ENABLE_ADAPTIVE_CALIBRATION: settingsData?.adaptiveCalibrationEnabled !== false,
              userId: activeIdRef.current
            }
          }
        );
        if (Array.isArray(newTasks) && newTasks.length) {
          setData(() => ({
            coachPlan: newTasks,
            coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
          }));
          showToastRef.current('Sugestões geradas!', 'success');
        } else {
          showToastRef.current('Nenhuma sugestão necessária.', 'info');
        }
        const rawEvents = calibrationEventsRef.current || [];
        const { backfilled } = runLearningCycle(rawEvents, history, currentMaxScore);
        const taskEvents = (Array.isArray(newTasks) ? newTasks : [])
          .filter(t => Number.isFinite(Number(t?.analysis?.monteCarlo?.probability)))
          .map(t => recordPredictionEvent({
            probability: Number(t.analysis.monteCarlo.probability) / 100,
            probabilityRaw: Number(t.analysis.monteCarlo.probabilityRaw ?? t.analysis.monteCarlo.probability) / 100,
            targetScore,
            category: t?.categoryId || t?.subject || t?.categoryName,
            sims: t?.analysis?.monteCarlo?.diagnostics?.simulationCount
          }))
          .filter(e => e.category);
        commitLearningCycle(rawEvents, backfilled, taskEvents);
        if (collectedMetrics.length > 0) {
          scheduleCalibrationPersist(collectedMetrics);
        }
      } catch (error) {
        console.error('[Coach.jsx] Falha ao gerar metas diárias:', error);
        showToastRef.current('Erro ao gerar as sugestões do Coach.', 'error');
      } finally {
        setCoachLoading(false);
      }
    }, 1500);
  }, [
    categories, coachLoading, setData, scheduleCalibrationPersist,
    history, studyLogs, targetScorePoints, targetScoreLabel,
    currentMaxScore, userData, settingsData,
    runLearningCycle, commitLearningCycle
  ]);

  const handleClearHistory = useCallback(() => {
    setData(() => ({
      coachPlan: [],
      coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
    }));
  }, [setData]);

  if (!isHydrated || isAnalyzing || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white font-black uppercase tracking-widest text-xs">
            Sincronizando Redes Neurais
          </span>
          <span className="text-slate-500 text-[10px] mt-1 uppercase font-bold animate-pulse">
            Processando Probabilidades...
          </span>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <PageErrorBoundary pageName="Coach">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-3xl border border-white/10 bg-slate-900/60 flex items-center justify-center">
            <Brain className="text-slate-600" size={26} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-white font-black uppercase tracking-widest text-xs">
              Sem categorias cadastradas
            </span>
            <span className="text-slate-500 text-[10px] uppercase font-bold max-w-[300px] leading-relaxed">
              Cadastre as matérias do concurso para ativar o motor estatístico do Coach.
            </span>
          </div>
        </div>
      </PageErrorBoundary>
    );
  }

  const degradedCount = Object.values(data?.calibrationOps || {})
    .filter(Boolean)
    .filter(op => op && op.degraded === true).length;
  const globalProjectedMean =
    suggestedFocus?.globalProjectedMean ?? suggestedFocus?.globalMcContext?.projectedMean ?? null;
  const showGlobalMc = Number.isFinite(Number(globalProjectedMean));

  return (
    <PageErrorBoundary pageName="Coach">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-20 sm:pb-32">
        <div className="relative z-40 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <PageHeader
            title="Análise do Coach"
            description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
          />
          {/* FIX (BUG-14): wrapper relativo + fade nas bordas p/ indicar scroll */}
          <div className="relative z-50 w-full md:w-auto">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/80 to-transparent z-10 rounded-r-3xl" />
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900/80 to-transparent z-10 rounded-l-3xl" />
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-900/50 border border-white/10 p-2 sm:p-3 rounded-3xl backdrop-blur-xl shadow-inner overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-3 sm:gap-5 md:gap-6 sm:px-4 px-2 min-w-max flex-shrink-0">
                <QuickStat
                  label="Volatilidade"
                  value={`${normalizedVolatility.toFixed(1)}pp`}
                  color="text-rose-400"
                  icon={<Zap size={14} />}
                />
                <div className="hidden sm:block w-px h-6 bg-white/10" />
                <MonteCarloDebugger stats={mcStats} />
                <div className="w-px h-6 bg-white/10" />
                <CalibrationAuditPopover />
                <div className="w-px h-6 bg-white/10" />
                <QuickStat
                  label="Tendência"
                  value={`${((drift * 30) / Math.max(1, Number(currentMaxScore) || 1) * 100).toFixed(1)}pp`}
                  color="text-emerald-400"
                  icon={<ArrowUpRight size={14} />}
                />
                <div className="w-px h-6 bg-white/10" />
                <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={14} />} />
                <div className="w-px h-6 bg-white/10" />
                <QuickStat
                  label="Loop MC"
                  value={`${(data?.calibrationEvents || []).length} ev`}
                  color="text-cyan-400"
                  icon={<Database size={14} />}
                />
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {degradedCount > 0 && (
            <GovernanceBanner key="governance-banner" degradedCount={degradedCount} />
          )}
        </AnimatePresence>
        <div className="space-y-10">
          <div className="w-full">
            <CoachMenuNav activeTab={safeActiveTab} onChangeTab={handleChangeTab} isPremium={isPremium} />
            <Motion.div
              key={safeActiveTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-[200px]"
              style={{ transform: "none", filter: "none", willChange: "auto" }}
            >
              <div
                role="tabpanel"
                id="coach-panel-insights"
                aria-labelledby="coach-tab-insights"
                tabIndex={safeActiveTab === 'insights' ? 0 : -1}
                hidden={safeActiveTab !== 'insights'}
              >
                {safeActiveTab === 'insights' && (
                  <>
                    {flashcardDue > 0 && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
                        <BookOpen className="text-amber-400" size={18} />
                        <div className="flex-1 text-amber-200">
                          <span className="font-semibold">{flashcardDue} flashcards</span> pendentes para hoje.
                          SRS melhora retenção e o modelo.
                        </div>
                        <button
                          onClick={() => navigate('/flashcards')}
                          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition"
                        >
                          FLASHCARDS
                        </button>
                      </div>
                    )}
                    {showGlobalMc && (
                      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs">
                        <span className="font-semibold text-emerald-300">Global MC:</span>
                        <span className="font-mono text-base font-bold text-emerald-200">
                          {Number(globalProjectedMean).toFixed(1)}{currentMaxScore === 100 ? '%' : ` de ${currentMaxScore}`}
                        </span>
                        <span className="text-emerald-400/60">projeção Monte Carlo global</span>
                      </div>
                    )}
                    <AICoachView
                      suggestedFocus={suggestedFocus}
                      onGenerateGoals={handleGenerateGoals}
                      loading={coachLoading}
                      onClearHistory={handleClearHistory}
                    />
                  </>
                )}
              </div>
              <div
                role="tabpanel"
                id="coach-panel-analytics"
                aria-labelledby="coach-tab-analytics"
                tabIndex={safeActiveTab === 'analytics' ? 0 : -1}
                hidden={safeActiveTab !== 'analytics'}
              >
                {safeActiveTab === 'analytics' && isPremiumBool && <RaioXDashboard data={data} />}
              </div>
            </Motion.div>
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  );
}

function CalibrationAuditPopover({ categoryId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const summary = useMemo(() => getCalibrationTelemetrySummary(categoryId), [categoryId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // FIX (BUG-24): focus trap no dialog
  useEffect(() => {
    if (!isOpen || !popoverRef.current) return;
    const node = popoverRef.current;
    const getFocusables = () =>
      Array.from(node.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'));
    const first = getFocusables()[0];
    if (first) first.focus();
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const list = getFocusables();
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    node.addEventListener('keydown', handleTab);
    return () => node.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!import.meta.env.DEV && summary.count === 0) return null;
  return (
    <div ref={popoverRef} className="relative font-mono text-[11px] select-none shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex flex-col min-w-[70px] sm:min-w-[75px] text-left hover:opacity-85 transition-all active:scale-95 group focus:outline-none"
        title="Auditoria de Calibração Monte Carlo"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sky-400 opacity-80 group-hover:animate-pulse">
            <ShieldCheck size={14} />
          </span>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">TELEMETRIA</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-black text-sky-400 tracking-tighter">
            {summary.count}x
          </span>
        </div>
      </button>
      {isOpen && (
        <div
          role="dialog"
          aria-label="Telemetria Monte Carlo"
          className="absolute top-full right-0 mt-4 bg-slate-950/95 backdrop-blur-md text-slate-300 p-4 rounded-2xl border border-white/10 shadow-2xl w-[calc(100vw-2rem)] max-w-64 sm:w-64 space-y-2 z-[100] animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-white">Telemetria MC</span>
            <button
              onClick={(e) => { e.stopPropagation(); clearCalibrationTelemetry(); setIsOpen(false); }}
              className="text-[9px] text-rose-400 hover:underline"
            >
              Limpar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-center text-[10px]">
            <span className="text-slate-500">Amostras</span>
            <span className="text-right font-medium text-sky-400">{summary.count}</span>
            <span className="text-slate-500">Brier Médio</span>
            <span className="text-right font-medium text-emerald-400">
              {summary.avgBrier !== null ? summary.avgBrier.toFixed(4) : 'N/A'}
            </span>
            <span className="text-slate-500">Penalidade Média</span>
            <span className="text-right font-medium text-amber-400">
              {summary.avgPenalty !== null ? `${(summary.avgPenalty * 100).toFixed(1)}%` : '0.0%'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value, color, icon }) {
  return (
    <div className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1">
      <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
        <span className={color}>{icon}</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em]">{label}</span>
      </div>
      <span className={`text-base font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
    </div>
  );
}

function LoopStat({ label, value, tone = 'text-white' }) {
  return (
    <div className="flex flex-col gap-1 bg-black/20 border border-white/5 rounded-xl p-3">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
      <span className={`text-sm font-black font-mono tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

const GovernanceBanner = React.memo(React.forwardRef(function GovernanceBanner({ degradedCount }, ref) {
  return (
    <Motion.div
      ref={ref}
      role="status"
      aria-live="polite"
      layout
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mb-6 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/30 flex items-center justify-between gap-4 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400 border border-rose-500/20">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-rose-200 uppercase tracking-tight">Alerta de Governança</h4>
          <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
            Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> categorias com calibração degradada.
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
          O Coach está aplicando<br className="hidden sm:block" />ajustes conservadores.
        </p>
      </div>
    </Motion.div>
  );
}));

function RaioXDashboard({ data }) {
  const ops = data?.calibrationOps || {};
  const rawCategories = data?.categories || [];
  const categories = Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
  const [filter, setFilter] = useState('all');
  const toFiniteNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const [mountTime] = useState(() => Date.now());

  const calibrationSummary = useMemo(() => {
    const historyByCategory = data?.calibrationHistoryByCategory || {};
    let latestTs = 0;
    for (const entries of Object.values(historyByCategory)) {
      if (Array.isArray(entries)) {
        for (const e of entries) {
          const ts = toFiniteNumber(e?.timestamp);
          if (ts > latestTs) latestTs = ts;
        }
      }
    }
    const now = latestTs > 0 ? latestTs : mountTime;
    return Object.entries(historyByCategory)
      .map(([categoryId, history]) => {
        const rows = Array.isArray(history) ? history : [];
        if (rows.length === 0) return null;
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const recent = rows.filter(h => toFiniteNumber(h?.timestamp) >= sevenDaysAgo);
        const base = recent.length > 0 ? recent : rows;
        const brierValues = base
          .filter(h => h?.avgBrier !== null && h?.avgBrier !== undefined && h?.avgBrier !== '')
          .map(h => Number(h.avgBrier))
          .filter(Number.isFinite);
        const penaltyValues = base
          .filter(h => h?.calibrationPenalty !== null && h?.calibrationPenalty !== undefined && h?.calibrationPenalty !== '')
          .map(h => Number(h.calibrationPenalty))
          .filter(Number.isFinite);
        if (brierValues.length === 0) return null;
        const avgBrier = brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length;
        const avgPenalty = penaltyValues.length > 0
          ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length
          : 0;
        const label = rows[rows.length - 1]?.categoryName || categoryId;
        return { categoryId, label, count: brierValues.length, avgBrier, avgPenalty };
      })
      .filter(Boolean);
  }, [data?.calibrationHistoryByCategory, mountTime]);

  const toPercentLabel = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${Math.max(0, Math.min(100, Math.round(n * 100)))}%`;
  };

  const sortedLogs = useMemo(() => {
    const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
    return [...source].filter(Boolean).sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
  }, [data?.calibrationAuditLog]);

  const filteredLogs = useMemo(
    () => sortedLogs
      .filter(log => filter === 'all' || (filter === 'degraded' && log?.degraded === true))
      .slice(0, 50),
    [sortedLogs, filter]
  );

  const latestWithReliability = useMemo(() => {
    // Primeiro tenta no audit log, caso você decida manter reliability lá no futuro.
    const fromAudit = sortedLogs.find(
      log => Array.isArray(log?.reliability) && log.reliability.length > 0
    );
    if (fromAudit) return fromAudit;

    // Fallback correto: procurar no histórico por categoria,
    // onde a métrica completa realmente é persistida.
    const histories = Object.values(data?.calibrationHistoryByCategory || {});
    let latest = null;
    let latestTs = -1;

    histories.forEach((history) => {
      if (!Array.isArray(history)) return;

      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        if (Array.isArray(entry?.reliability) && entry.reliability.length > 0) {
          const ts = Number(entry?.timestamp) || 0;
          if (ts > latestTs) {
            latestTs = ts;
            latest = entry;
          }
          break;
        }
      }
    });

    return latest;
  }, [sortedLogs, data?.calibrationHistoryByCategory]);
  const eceValues = sortedLogs.map(log => toFiniteNumber(log?.ece, null)).filter(val => val !== null);
  const avgEce = eceValues.length
    ? eceValues.reduce((a, b) => a + b, 0) / eceValues.length : null;

  const categorySeriesMap = useMemo(() => {
    return sortedLogs.reduce((acc, log) => {
      const cat = log?.categoryName || 'Categoria';
      const brier = toFiniteNumber(log?.avgBrier, null);
      const ece = toFiniteNumber(log?.ece, null);
      if (brier === null && ece === null) return acc;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ ts: toFiniteNumber(log?.timestamp), brier, ece });
      return acc;
    }, {});
  }, [sortedLogs]);
  const categoryNames = Object.keys(categorySeriesMap);
  const [seriesCategory, setSeriesCategory] = useState(() => categoryNames[0] || '');
  const effectiveCategory = categoryNames.includes(seriesCategory)
    ? seriesCategory : (categoryNames[0] || '');
  const temporalSeries = useMemo(() => {
    if (!effectiveCategory) return [];
    return [...(categorySeriesMap[effectiveCategory] || [])]
      .sort((a, b) => a.ts - b.ts)
      .slice(-12);
  }, [categorySeriesMap, effectiveCategory]);

  const calibrationEvents = data?.calibrationEvents;
  const learningStats = useMemo(() => {
    const events = Array.isArray(calibrationEvents) ? calibrationEvents : [];
    const observed = events.filter(e => e.observed === 0 || e.observed === 1).length;
    const rolling = computeRollingCalibrationParams(events, {});
    const series = buildCalibrationDashboardSeries(sortedLogs);
    const outOfControl = series.driftSignals.filter(d => d.outOfControl).length;
    return {
      total: events.length,
      observed,
      pending: Math.max(0, events.length - observed),
      baseline: (rolling.confidenceFactor || 0) > 0 && Number.isFinite(rolling.baseline) ? rolling.baseline : null,
      confidence: Number.isFinite(rolling.confidenceFactor) ? rolling.confidenceFactor : 0,
      outOfControl
    };
  }, [calibrationEvents, sortedLogs]);

  // FIX: retorna 0% para valores <= 0 (antes o mínimo de 2% mostrava barra p/ zero)
  const toBarWidth = (value, max = BRIER_VISUAL_MAX) => {
    const safeVal = Number(value) || 0;
    if (safeVal <= 0) return '0%';
    const pct = (safeVal / max) * 100;
    return `${Math.max(2, Math.min(100, pct))}%`;
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {calibrationSummary.length > 0 ? (
        <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
            <div>
              <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <ShieldCheck size={14} />
                Monitor de Calibração
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Acompanhamento de Brier Score (Erro de Projeção) e Degradação
              </p>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {calibrationSummary.map(row => {
              const op = ops[row.categoryId] || {};
              const isDegraded = op?.degraded === true;
              const avgBrier = toFiniteNumber(row.avgBrier);
              const brierPct = Math.max(0, Math.min(100, (avgBrier / BRIER_VISUAL_MAX) * 100));
              const radius = 14;
              const circ = 2 * Math.PI * radius;
              const offset = circ - (brierPct / 100) * circ;
              const colorClass = !Number.isFinite(avgBrier)
                ? 'text-slate-500'
                : avgBrier >= BRIER_VISUAL_CRIT
                  ? 'text-rose-500'
                  : (avgBrier >= BRIER_VISUAL_WARN ? 'text-amber-500' : 'text-emerald-500');
              return (
                <div
                  key={row.categoryId}
                  className={`group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between ${isDegraded ? 'shadow-[0_0_20px_-5px_rgba(244,63,94,0.15)] hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.25)]' : ''}`}
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex flex-col min-w-0 flex-1">
                      <p
                        className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5"
                        title={displaySubject(row.label, categories)}
                      >
                        {displaySubject(row.label, categories)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${isDegraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isDegraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                          {isDegraded ? 'Degradado' : 'Estável'}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">
                          n={row.count}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                      {/* FIX (BUG-15): strokeWidth 2.5 */}
                      <svg
                        className="w-full h-full -rotate-90 transform drop-shadow-md"
                        viewBox="0 0 36 36"
                        role="img"
                        aria-label={`Brier Score: ${avgBrier.toFixed(2)} de ${BRIER_VISUAL_MAX} máximo`}
                      >
                        <circle cx="18" cy="18" r={radius} fill="none" className="stroke-black/40" strokeWidth="2.5" />
                        <circle
                          cx="18" cy="18" r={radius} fill="none"
                          className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`}
                          strokeWidth="2.5"
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-[10px] font-black font-mono tracking-tighter ${colorClass}`}>
                          {avgBrier.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
                    <div className="group/tooltip relative flex items-center gap-1 cursor-help" tabIndex={0} role="button" aria-label="Informação sobre Score de Brier">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 group-focus-within/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">
                        Desvio (Brier)
                      </span>
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                        <strong className="text-white font-black block mb-1">Score de Brier</strong>
                        Mede a precisão das projeções Monte Carlo. Quanto menor (verde), mais assertivo o motor.
                      </div>
                    </div>
                    {(() => {
                      const pen = toFiniteNumber(row.avgPenalty);
                      if (pen < 0.005) return null;
                      return (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                            Pena: <span className="font-mono">-{Math.round(pen * 100)}%</span>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center py-12 text-center space-y-2 bg-slate-900/20 border border-white/5 rounded-3xl">
          <ShieldCheck size={32} className="text-slate-700/50 mb-3" />
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
            Amostra técnica insuficiente
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight max-w-[250px] mx-auto leading-tight">
            Requer <span className="text-indigo-400">3 simulados por matéria</span> para calibrar a inteligência do motor.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Database size={14} className="text-cyan-400" />
          <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em]">Ciclo de Aprendizagem</h3>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest ml-auto">
            previsão → observação → adaptação
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <LoopStat label="Eventos MC" value={learningStats.total} tone="text-cyan-300" />
          <LoopStat label="Observados" value={learningStats.observed} tone="text-emerald-400" />
          <LoopStat label="Aguardando" value={learningStats.pending} tone="text-amber-400" />
          <LoopStat
            label="Baseline adapt."
            value={learningStats.baseline !== null ? learningStats.baseline.toFixed(3) : '—'}
            tone="text-cyan-300"
          />
          <LoopStat label="Confiança" value={`${Math.round((learningStats.confidence || 0) * 100)}%`} />
          <LoopStat
            label="Drift (ooc)"
            value={learningStats.outOfControl}
            tone={learningStats.outOfControl > 0 ? 'text-rose-400' : 'text-slate-300'}
          />
        </div>
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
            <List size={14} className="text-indigo-400/80" />
            Log de Auditoria
          </h3>
          <div className="flex gap-2 bg-slate-900/50 border border-white/5 rounded-xl p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tudo
            </button>
            <button
              onClick={() => setFilter('degraded')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'degraded' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Degradados
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[120px]">Data</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[140px]">Categoria</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">
                  <span title="Mede o erro da previsão. Quanto mais perto de zero, mais precisa foi a projeção do sistema em relação à sua nota real." className="cursor-help border-b border-dashed border-slate-600">Brier (erro)</span>
                </th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">
                  <span title="Mede se há otimismo/pessimismo (gap/viés). Mostra o descolamento entre a nota que o sistema achou que você tiraria e a nota real." className="cursor-help border-b border-dashed border-slate-600">ECE (calib.)</span>
                </th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[110px]">
                  <span title="Uma 'Pena' automática (redução na nota projetada) se o sistema detectar que estava sendo muito otimista, mantendo as estatísticas pé no chão." className="cursor-help border-b border-dashed border-slate-600">Ajuste</span>
                </th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">Prob Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => {
                  const brierVal = toFiniteNumber(log?.avgBrier, null);
                  const brierColor = brierVal === null
                    ? 'text-slate-500'
                    : brierVal >= BRIER_VISUAL_CRIT
                      ? 'text-rose-400'
                      : brierVal >= BRIER_VISUAL_WARN
                        ? 'text-amber-400'
                        : 'text-emerald-400';
                  const eceVal = toFiniteNumber(log?.ece, null);
                  const eceColor = eceVal === null
                    ? 'text-slate-500'
                    : eceVal > 0.12 ? 'text-amber-400' : 'text-cyan-300';
                  return (
                    <tr
                      key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-white font-bold whitespace-nowrap">
                        {displaySubject(log.categoryName, categories)}
                      </td>
                      <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${brierColor}`}>
                        {brierVal !== null ? brierVal.toFixed(3) : '-'}
                      </td>
                      <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${eceColor}`}>
                        {eceVal !== null ? eceVal.toFixed(3) : '-'}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-amber-400 font-bold whitespace-nowrap">
                        {toFiniteNumber(log?.calibrationPenalty) > 0.001
                          ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (shrink)` : '-'}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-white font-black whitespace-nowrap">
                        {toPercentLabel(log?.probability)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 px-4">
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
                        Nenhum evento registrado
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight max-w-[340px] mx-auto leading-tight">
                        Os diagnósticos surgirão automaticamente após atingir a maturidade de dados (n=3).
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">
            Confiabilidade (ECE)
          </h3>
          <span className="text-[10px] font-black text-cyan-300 shrink-0">
            {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
          </span>
        </div>
        {latestWithReliability ? (
          <ReliabilityCurveChart buckets={latestWithReliability.reliability} />
        ) : (
          <div className="w-full flex items-center justify-center py-12 bg-slate-900/20 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
              Sem buckets de confiabilidade ainda
            </p>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">
            Drift Temporal (Brier/ECE)
          </h3>
          {categoryNames.length > 1 ? (
            <select
              value={effectiveCategory}
              onChange={(e) => setSeriesCategory(e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2 outline-none cursor-pointer hover:bg-slate-800 transition-all backdrop-blur-md"
            >
              {categoryNames.map(cat => (
                <option key={cat} value={cat}>{displaySubject(cat, categories)}</option>
              ))}
            </select>
          ) : (
            <span className="text-[10px] text-slate-400 font-bold">
              {effectiveCategory ? displaySubject(effectiveCategory, categories) : 'Sem categoria'}
            </span>
          )}
        </div>
        {temporalSeries.length > 1 ? (
          <div className="space-y-2">
            {temporalSeries.map((point, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>{point.ts > 0 ? formatDatePtBR(point.ts) : '-'}</span>
                  <span>
                    Brier {Number.isFinite(point?.brier) ? point.brier.toFixed(3) : '-'} · ECE {Number.isFinite(point?.ece) ? point.ece.toFixed(3) : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    {Number.isFinite(point.brier) ? (
                      <div className="h-full bg-rose-400/80" style={{ width: toBarWidth(point.brier) }} />
                    ) : null}
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    {Number.isFinite(point.ece) ? (
                      <div className="h-full bg-cyan-400/80" style={{ width: toBarWidth(point.ece) }} />
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center py-12 bg-slate-900/20 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
              Dados temporais insuficientes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## `src/utils/coachAdaptive.js`

```javascript
/**
 * coachAdaptive.js
 *
 * Motor adaptativo Monte Carlo do Coach.
 */
import { monteCarloSimulation, clearEngineMcCache } from '../engine/monteCarlo.js';
import { getSafeScore } from './scoreHelper.js';
import {
  computeBrierScore, computeLogLoss, summarizeCalibration, shrinkProbabilityToNeutral,
  computeCalibrationDiagnostics, fitIsotonicCalibration, predictIsotonicProbability,
  calibrateWithBBQ, conformalizedCalibrationInterval, computeStackingWeights
} from './calibration.js';
import { getDateKey, safeDateParse } from './dateHelper.js';
import { kahanSum } from '../engine/math/kahan.js';
import { detectDataAnomalies } from '../engine/diagnostics.js';
import { pruneHistoryForMemory } from '../engine/stats.js';
import { safeArray, toFiniteNumber, hashString } from './coachSafe.js';

const clampProbForLoss = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1 - 1e-6, Math.max(1e-6, n));
};
export function deriveAdaptiveRiskThresholds(scores = [], volatility = null, cfg = {}, maxScore = 100, backtestPairs = []) {
  const fallbackDanger = Number(cfg.MC_PROB_DANGER) || 30;
  const fallbackSafe = Number(cfg.MC_PROB_SAFE) || 90;
  // FIX: safeArray protege contra não-arrays (objetos do store)
  const rawScores = safeArray(scores).map(Number).filter(Number.isFinite);
  const cleanPairs = safeArray(backtestPairs).filter(p =>
    Number.isFinite(Number(p?.probability)) && Number.isFinite(Number(p?.observed))
  );

  if (cleanPairs.length >= 6) {
    const sorted = [...cleanPairs].sort((a, b) => Number(a.probability) - Number(b.probability));
    const globalSuccessRate = cleanPairs.filter(p => Number(p.observed) >= 0.5).length / cleanPairs.length;
    const K = 1.0;
    const alphaPrior = Math.max(0.2, Math.min(0.8, globalSuccessRate)) * K;
    let dangerCandidates = [];
    let safeCandidates = [];

    for (let cutoff = 0.10; cutoff <= 0.901; cutoff += 0.05) {
      const below = sorted.filter(p => Number(p.probability) <= cutoff);
      const above = sorted.filter(p => Number(p.probability) > cutoff);

      if (below.length >= 2) {
        const successBelow = below.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanBelow = (successBelow + alphaPrior) / (below.length + K);
        if (posteriorMeanBelow < 0.35) dangerCandidates.push(cutoff * 100);
      }
      if (above.length >= 2) {
        const successAbove = above.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanAbove = (successAbove + alphaPrior) / (above.length + K);
        if (posteriorMeanAbove > 0.85) safeCandidates.push(cutoff * 100);
      }
    }

    let danger = dangerCandidates.length > 0
      ? Math.max(15, Math.min(50, dangerCandidates[dangerCandidates.length - 1]))
      : fallbackDanger;
    let safe = safeCandidates.length > 0
      ? Math.max(65, Math.min(97, safeCandidates[0]))
      : fallbackSafe;

    if (safe - danger < 25) safe = Math.min(97, danger + 25);
    const shrinkFactor = Math.min(1, cleanPairs.length / 20);
    danger = danger * shrinkFactor + fallbackDanger * (1 - shrinkFactor);
    safe = safe * shrinkFactor + fallbackSafe * (1 - shrinkFactor);

    return { danger: Math.round(danger * 10) / 10, safe: Math.round(safe * 10) / 10 };
  }

  if (rawScores.length < 4) return { danger: fallbackDanger, safe: fallbackSafe };

  const safeMax = maxScore > 0 ? maxScore : 100;
  const cleanScores = rawScores.map(s => (s / safeMax) * 100);
  const sorted = [...cleanScores].sort((a, b) => a - b);

  const q = (p) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, (sorted.length - 1) * p));
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const t = idx - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  };

  const median = q(0.5);
  const isZeroVariance = cleanScores.every(s => Math.abs(s - median) < 1e-6);

  if (isZeroVariance) {
    const danger = Math.max(15, Math.min(70, median - 12.5));
    const safe = Math.min(95, Math.max(danger + 25, median + 12.5));
    return { danger, safe };
  }

  const aboveMedianRate = cleanScores.filter(s => s > median).length / cleanScores.length;
  let danger = Math.max(15, Math.min(45, q(0.25) * (0.4 + aboveMedianRate * 0.3)));
  let safe = Math.max(75, Math.min(95, q(0.75) * 1.08));

  if (Number.isFinite(volatility)) {
    const highVol = Number(cfg.MC_VOLATILITY_HIGH) || 8;
    if (volatility > highVol * 0.9) { danger = Math.min(50, danger + 4); safe = Math.min(97, safe + 2); }
    else if (volatility < highVol * 0.45) { danger = Math.max(12, danger - 3); safe = Math.max(72, safe - 2); }
  }

  if (safe - danger < 25) safe = Math.min(97, danger + 25);
  return { danger, safe };
}

// FIX M3: suavização C¹ também na dimensão de volatilidade
export function computeContinuousMcBoost(probability, dangerThreshold, safeThreshold, volatility, maxScore, cfg = {}) {
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const p = Math.max(0, Math.min(100, Number(probability) || 0));
  const d = Math.max(1, Math.min(99, Number(dangerThreshold) || cfg.MC_PROB_DANGER || 30));
  const s = Math.max(d + 1, Math.min(99, Number(safeThreshold) || cfg.MC_PROB_SAFE || 90));
  const maxDangerBoost = (Number(cfg.MC_BOOST_DANGER_BASE) || 12) + (Number(cfg.MC_BOOST_DANGER_RANGE) || 13);
  const baseDangerBoost = Number(cfg.MC_BOOST_DANGER_BASE) || 12;
  const minBoost = toFiniteNumber(cfg.MC_BOOST_SAFE_PENALTY, -8);
  const smoothstep = (x) => x * x * (3 - 2 * x);

  let boost = 0;

  if (p <= d) {
    const ratio = d > 0 ? Math.max(0, Math.min(1, p / d)) : 0;
    boost = maxDangerBoost - (smoothstep(ratio) * (maxDangerBoost - baseDangerBoost));
  } else if (p < s) {
    const ratio = Math.max(0, Math.min(1, (p - d) / (s - d)));
    boost = baseDangerBoost - (smoothstep(ratio) * (baseDangerBoost - minBoost));
  } else {
    boost = minBoost;
  }

  const lowVolLimit = (Number(cfg.MC_VOLATILITY_HIGH || 8) * 0.7) * (safeMaxScore / 100);

  if (Number.isFinite(volatility)) {
    const a = lowVolLimit * 0.8;
    const b = lowVolLimit * 1.2;
    const tVol = smoothstep(Math.max(0, Math.min(1, (volatility - a) / Math.max(1e-9, b - a))));

    if (boost < 0) {
      boost *= 1 - 0.75 * tVol;
    } else if (boost > 0 && tVol > 0.5) {
      // Alta volatilidade também reduz boost positivo (simetria)
      boost *= 1 - 0.35 * (tVol - 0.5) * 2;
    }
  }

  let riskLabel = 'ok';
  if (p <= d) riskLabel = 'critical';
  else if (p < s) riskLabel = 'moderate';
  else riskLabel = 'safe';

  return { boost: Number(boost.toFixed(4)), riskLabel };
}

export function deriveBacktestWeights(rawScores = [], maxScore = 100) {
  const scores = safeArray(rawScores).map(Number).filter(Number.isFinite);
  const n = scores.length;
  if (n < 2) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 1, uplift: 0, effectiveN: n };

  const last = scores[n - 1];
  const prev = scores[n - 2];
  const uplift = last - prev;

  const scoreWeight = Math.max(0.85, Math.min(1.2, 1 + (uplift / (maxScore || 100)) * 0.4));
  const recencyWeight = Math.max(0.9, Math.min(1.15, 1 + (n / 50) * 0.15));
  const rankQuality = scores.filter(s => s >= (maxScore * 0.7)).length / n;
  const instabilityWeight = Math.max(0.8, Math.min(1.25, 1 - rankQuality * 0.15 + (uplift < 0 ? 0.15 : -0.05)));

  const weighted = scores.map((_, i) => Math.exp(-0.015 * (n - i)));
  const sumW = kahanSum(weighted);
  const sumW2 = kahanSum(weighted.map(w => w * w));
  const effectiveN = sumW2 > 1e-9 ? (sumW * sumW) / sumW2 : scores.length;

  return { scoreWeight, recencyWeight, instabilityWeight, rankQuality, uplift, effectiveN: Number(effectiveN.toFixed(2)) };
}

export function simuladosToHistory(simulados, maxScore = 100) {
  if (!simulados || !Array.isArray(simulados)) return [];

  const sorted = simulados
    .map((s, idx) => {
      const parsed = Date.parse(s.date || s.createdAt);
      return {
        ...s,
        score: getSafeScore(s, maxScore),
        rawTimestamp: Number.isFinite(parsed) ? parsed : 0,
        date: Number.isFinite(parsed) ? getDateKey(new Date(parsed)) : null,
        _idx: idx
      };
    })
    .sort((a, b) => {
      if (a.rawTimestamp !== b.rawTimestamp) return a.rawTimestamp - b.rawTimestamp;
      return a._idx - b._idx;
    });

  let burstCount = 1;
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = sorted[i - 1];
    if (current.rawTimestamp - prev.rawTimestamp < 7200000 && current.rawTimestamp > 0) burstCount++;
    else burstCount = 1;
    current.fatigueFlag = burstCount >= 3 && current.score < prev.score;
  }

  return sorted.filter(item => typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date.trim()));
}

const mcCache = new Map();
const MC_CACHE_MAX = 50;

export function clearMcCache() {
  mcCache.clear();
  clearEngineMcCache();
}

export function deriveCoachAdaptiveParams(history = [], maxScore = 100, cfg = {}) {
  const n = history.length;
  if (n === 0) {
    return { decayK: 0.07, minWeight: 0.03, scoreClampDelta: maxScore * 0.3, mcSimulations: cfg.MC_SIMULATIONS || 800 };
  }

  const scores = history.map(h => Number(h.score) || 0);
  const mean = kahanSum(scores) / n;
  const devs = scores.map(s => (s - mean) ** 2);
  const variance = n > 1 ? kahanSum(devs) / (n - 1) : 0;
  const sd = Math.sqrt(Math.max(0, variance));
  const cv = mean > 0 ? Math.min(2, sd / mean) : 1;

  let medianGapDays = 7;
  if (n >= 2) {
    const sortedDates = history
      .map(h => h.date ? (safeDateParse(h.date)?.getTime() || 0) : 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    if (sortedDates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push(Math.max(0.5, (sortedDates[i] - sortedDates[i - 1]) / 86400000));
      }
      gaps.sort((a, b) => a - b);
      medianGapDays = gaps.length % 2 === 0
        ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
        : gaps[Math.floor(gaps.length / 2)];
    }
  }

  const coverageFactor = Math.max(0.8, Math.min(1.3, Math.sqrt(10 / Math.max(2, n))));
  const gapFactor = Math.max(0.7, Math.min(1.4, 0.8 + 0.6 * (1 - Math.exp(-medianGapDays / 14))));
  const decayK = Math.max(0.03, Math.min(0.12, 0.07 * coverageFactor * gapFactor));
  const minWeight = Math.max(0.01, Math.min(0.08, 0.015 + (cv * 0.02)));
  const scoreClampDelta = Math.max(maxScore * 0.12, Math.min(maxScore * 0.45, (0.2 + cv * 0.15) * maxScore));
  const mcSimulations = Math.round(Math.max(400, Math.min(2500, (cfg.MC_SIMULATIONS || 800) * (0.8 + cv * 0.7) * coverageFactor)));

  return { decayK, minWeight, scoreClampDelta, mcSimulations, medianGapDays };
}

function getCpuAwareSimulationCap(defaultCap = 2500, cfg = {}) {
  try {
    const manualCap = Number(cfg?.MC_SIMULATION_CAP);
    if (Number.isFinite(manualCap) && manualCap >= 300) return Math.min(defaultCap, Math.round(manualCap));
    if (cfg?.MC_FORCE_MAX_SIMULATIONS === true) return defaultCap;

    const threads = Number(globalThis?.navigator?.hardwareConcurrency);
    if (!Number.isFinite(threads) || threads <= 0) return defaultCap;
    if (threads <= 2) return Math.min(defaultCap, 900);
    if (threads <= 4) return Math.min(defaultCap, 1400);
    if (threads <= 6) return Math.min(defaultCap, 1900);
    return defaultCap;
  } catch {
    return defaultCap;
  }
}

function buildCoachExplainability(r) {
  const quality = r.avgBrier == null ? 'sem dados'
    : r.avgBrier < 0.18 ? 'boa' : r.avgBrier < 0.25 ? 'moderada' : 'degradada';

  return {
    calibrationQuality: quality,
    confidenceAdjusted: r.shrinkTotal > 0.01,
    confidenceAdjustmentPct: Number((r.shrinkTotal * 100).toFixed(1)),
    note: `Projeção bruta ${Number(r.probabilityRaw).toFixed(0)}% → final ${Number(r.probability).toFixed(0)}% ` +
      `(shrink ${(Number(r.shrinkTotal) * 100).toFixed(0)}%; Brier ${r.avgBrier != null ? Number(r.avgBrier).toFixed(3) : 'n/d'}; ECE ${Number(r.ece || 0).toFixed(3)}).`
  };
}

export function runCoachMonteCarlo(relevantSimulados, targetScore, cfg, categoryId, maxScore = 100, adaptive = null, days = 90, agilityPenalty = 0) {
  const safeCfg = cfg || {};
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = 0;
  const range = Math.max(1e-9, safeMaxScore - safeMinScore);
  const minTarget = safeMinScore + 0.01 * range;
  const defaultTarget = safeMinScore + 0.8 * range;
  const safeTargetScore = Number.isFinite(Number(targetScore))
    ? Math.max(minTarget, Math.min(safeMaxScore, Number(targetScore)))
    : defaultTarget;

  if (!Array.isArray(relevantSimulados)) return null;

  let history = simuladosToHistory(relevantSimulados, safeMaxScore).filter(h => Number.isFinite(h.score));
  if (history.length < (safeCfg.MC_MIN_DATA_POINTS || 5)) return null;
  if (history.length > 2000) history = pruneHistoryForMemory(history, 1200, 365 * 4);

  // FIX: usar safeMaxScore (validado) em vez de maxScore bruto
  const anomalies = detectDataAnomalies(history, safeMaxScore);
  const dataIssues = anomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;
  const dataQuality = Math.max(0.3, 1 - (dataIssues * 0.15));
  const lowSampleThreshold = Math.max(Number(safeCfg.MC_LOW_SAMPLE_THRESHOLD) || 10, (safeCfg.MC_MIN_DATA_POINTS || 5) + 2);
  const neutralPct = toFiniteNumber(safeCfg.MC_CALIBRATION_NEUTRAL_PCT, 50);
  const maxAppliedPenalty = toFiniteNumber(safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY, 0.5);

  const btWeights = deriveBacktestWeights(history.map(h => h.score), safeMaxScore);
  const nEff = Math.max(1, Number(btWeights.effectiveN) || history.length);
  const sumCorrect = history.reduce((acc, h) => acc + Number(h.score || 0), 0);

  const sequenceChecksum = history.reduce((acc, h, idx) => {
    const score = Number(h.score || 0);
    const token = `${String(h?.date || '')}|${String(h?.subject || '')}`;
    let charSum = 0;
    for (let i = 0; i < token.length; i++) charSum += token.charCodeAt(i);
    return acc + ((idx + 1) * Math.round(score * 100)) + charSum;
  }, 0);

  const firstDate = history[0]?.date || '';
  const lastDate = history[history.length - 1]?.date || '';

  const calibHash = `${safeCfg.MC_CALIBRATION_BRIER_BASELINE ?? ''}-${safeCfg.MC_CALIBRATION_MAX_PENALTY ?? ''}-${safeCfg.MC_CALIBRATION_NEUTRAL_PCT ?? ''}-${safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY ?? ''}-${safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false}`;
  const adaptiveHash = adaptive
    ? [adaptive.mcSimulations || 0, adaptive.decayK || 0,
       Number(adaptive.calibrationBaseline || 0).toFixed(4),
       Number(adaptive.calibrationMaxPenalty || 0).toFixed(4)].join('-')
    : 'no-adapt';

  const cfgHash = hashString(JSON.stringify({
    cap: safeCfg.MC_SIMULATION_CAP, force: safeCfg.MC_FORCE_MAX_SIMULATIONS,
    min: safeCfg.MC_MIN_DATA_POINTS, low: safeCfg.MC_LOW_SAMPLE_THRESHOLD,
    horizon: safeCfg.MC_BACKTEST_HORIZON, horizonMax: safeCfg.MC_BACKTEST_HORIZON_MAX,
    bins: [safeCfg.MC_ECE_BINS_MIN, safeCfg.MC_ECE_BINS_MID, safeCfg.MC_ECE_BINS_MAX],
    calib: [safeCfg.MC_CALIBRATION_BRIER_BASELINE, safeCfg.MC_CALIBRATION_MAX_PENALTY,
      safeCfg.MC_CALIBRATION_NEUTRAL_PCT, safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY,
      safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false]
  }));

  const contestId = safeCfg?.contestId || safeCfg?.userId || 'default';

  // PATCH-17: Usar hashString para evitar ambiguidade com separadores
  const hash = hashString(
    `${contestId}|${categoryId}|${safeMaxScore}|${safeMinScore}|${history.length}|${Number(sumCorrect).toFixed(2)}` +
    `|${safeTargetScore}|${sequenceChecksum}|${firstDate}|${lastDate}|${days}|${calibHash}|${adaptiveHash}` +
    `|${cfgHash}|ag${agilityPenalty}|tgt${Number(safeTargetScore).toFixed(1)}`
  );

  // LRU: mover para o fim (mais recente)
  if (mcCache.has(hash)) {
    const val = mcCache.get(hash);
    mcCache.delete(hash);
    mcCache.set(hash, val);
    return val;
  }

  try {
    const requestedSims = adaptive?.mcSimulations || safeCfg.MC_SIMULATIONS || 800;
    const simulationCap = getCpuAwareSimulationCap(2500, safeCfg);
    const qualityBoost = dataQuality < 0.7 ? 1.3 : 1.0;

    // FIX: Validar requestedSims antes de calcular safeSimulations
    const safeRequestedSims = Number.isFinite(requestedSims) ? requestedSims : 800;
    const safeSimulations = Math.max(300, Math.min(simulationCap, Math.round(safeRequestedSims * qualityBoost)));

    const result = monteCarloSimulation(history, safeTargetScore, days, safeSimulations,
      { maxScore: safeMaxScore, agilityPenalty, globalBaselinePct: neutralPct });

    if (!result || !Number.isFinite(result.probability)) return null;

    const enableAdaptiveCalibration = safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false;
    let calibrationPenalty = 0;
    let avgBrier = 0;
    let ece = 0;
    let reliability = [];
    let predObsPairs = [];
    let rawPreds = [];
    let observedSeq = [];

    if (enableAdaptiveCalibration && history.length >= 8) {
      const dynamicHorizon = Math.max(
        safeCfg.MC_BACKTEST_HORIZON || 3,
        Math.min(Number(safeCfg.MC_BACKTEST_HORIZON_MAX) || 12, Math.floor(history.length / 3))
      );
      const isLowPerformance = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent));
      const defaultHorizon = Math.min(dynamicHorizon, history.length - (safeCfg.MC_MIN_DATA_POINTS || 5));
      const horizon = isLowPerformance ? Math.min(3, defaultHorizon) : defaultHorizon;
      const brierScores = [];
      const lookAhead = Math.max(1, Math.min(3, horizon));

      for (let i = 1; i <= horizon; i += 1) {
        const train = history.slice(0, history.length - i);
        const observedRecord = history[history.length - i];
        const windowLen = Math.min(lookAhead, horizon - i + 1);
        const futureWindow = history.slice(history.length - i, history.length - i + windowLen);
        const avgFutureScore = futureWindow.reduce((acc, r) => acc + r.score, 0) / Math.max(1, futureWindow.length);
        const observed = avgFutureScore >= safeTargetScore ? 1 : 0;

        try {
          let gapDays = 7;
          if (train.length > 0 && observedRecord.date) {
            const trainDateMs = safeDateParse(train[train.length - 1].date)?.getTime() || NaN;
            const obsDateMs = safeDateParse(observedRecord.date)?.getTime() || NaN;
            if (!Number.isNaN(trainDateMs) && !Number.isNaN(obsDateMs) && obsDateMs > trainDateMs) {
              gapDays = Math.max(1, (obsDateMs - trainDateMs) / 86400000);
            }
          }

          const bt = monteCarloSimulation(train, safeTargetScore, gapDays,
            Math.min(500, Math.max(200, Math.floor(safeSimulations * 0.35))),
            { maxScore: safeMaxScore, agilityPenalty, globalBaselinePct: neutralPct });

          if (!bt || !Number.isFinite(bt.probability)) continue;

          const p = Math.max(0, Math.min(1, bt.probability / 100));
          brierScores.push(computeBrierScore(p, observed));
          predObsPairs.push({ probability: p, observed });
          rawPreds.push(p);
          observedSeq.push(observed);
        } catch { /* ignore */ }
      }

      if (brierScores.length > 0) {
        const summary = summarizeCalibration(brierScores, {
          baseline: adaptive?.calibrationBaseline ?? safeCfg.MC_CALIBRATION_BRIER_BASELINE ?? 0.18,
          maxPenalty: adaptive?.calibrationMaxPenalty ?? safeCfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25
        });

        // PATCH-16: Validar imediatamente após receber do summarizeCalibration
        calibrationPenalty = Number.isFinite(summary.calibrationPenalty) ? summary.calibrationPenalty : 0;
        avgBrier = Number.isFinite(summary.avgBrier) ? summary.avgBrier : 0;

        const adaptiveBins = predObsPairs.length >= 10
          ? (Number(safeCfg.MC_ECE_BINS_MAX) || 6)
          : predObsPairs.length >= 6 ? (Number(safeCfg.MC_ECE_BINS_MID) || 4) : (Number(safeCfg.MC_ECE_BINS_MIN) || 3);

        const diagnostics = computeCalibrationDiagnostics(predObsPairs, { bins: adaptiveBins });
        ece = diagnostics.ece;
        reliability = diagnostics.reliability;

        const eceScaled = Math.max(0, Math.min(1, ece / 0.25));
        const mceScaled = Math.max(0, Math.min(1, Number(diagnostics.mce || 0) / 0.4));
        const penaltyCap = adaptive?.calibrationMaxPenalty ?? safeCfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25;
        const meanLL = rawPreds.length > 0
          ? rawPreds.reduce((acc, p, idx) => acc + computeLogLoss(clampProbForLoss(p), observedSeq[idx]), 0) / rawPreds.length
          : 0;
        const llScaled = Math.max(0, Math.min(1, meanLL / 0.693));

        // FIX: validação de calibrationPenalty antes do blend
        const rawCalibrationPenalty = Number.isFinite(calibrationPenalty) ? calibrationPenalty : 0;
        calibrationPenalty = Math.min(penaltyCap,
          (rawCalibrationPenalty * 0.65) +
          (eceScaled * 0.20 * penaltyCap) +
          (mceScaled * 0.10 * penaltyCap) +
          (llScaled * 0.05 * penaltyCap));
      }
    }

    let isotonicModel = [];
    let stackingWeights = [0.34, 0.33, 0.33];

    if (predObsPairs.length >= 4) {
      isotonicModel = fitIsotonicCalibration(predObsPairs);
      const isotonicSeries = rawPreds.map(p => predictIsotonicProbability(p, isotonicModel));
      const bbqSeries = rawPreds.map(p => calibrateWithBBQ(p, predObsPairs));
      stackingWeights = computeStackingWeights([rawPreds, isotonicSeries, bbqSeries], observedSeq,
        [0, Math.max(1, isotonicModel.length), 6]);
    }

    const rawProb = Math.max(0, Math.min(100, Number(result.probability) || 0));
    const rawProb01 = rawProb / 100;
    const isoProb01 = predObsPairs.length >= 4 ? predictIsotonicProbability(rawProb01, isotonicModel) : rawProb01;
    const bbqProb01 = predObsPairs.length >= 4 ? calibrateWithBBQ(rawProb01, predObsPairs) : rawProb01;
    const stackedProb01 = Math.max(0, Math.min(1,
      (stackingWeights[0] || 0) * rawProb01 +
      (stackingWeights[1] || 0) * isoProb01 +
      (stackingWeights[2] || 0) * bbqProb01));

    const lowSampleShrink = nEff < lowSampleThreshold
      ? Math.min(0.35, (lowSampleThreshold - nEff) / lowSampleThreshold)
      : 0;
    const anomalyShrink = Math.min(0.2, dataIssues * 0.05);
    const totalShrink = Math.min(0.65, calibrationPenalty + lowSampleShrink + anomalyShrink);

    const probability = enableAdaptiveCalibration
      ? shrinkProbabilityToNeutral(stackedProb01 * 100, totalShrink, neutralPct, maxAppliedPenalty)
      : (stackedProb01 * 100);

    let ciLow = Number(result.ci95Low) || 0;
    let ciHigh = Number(result.ci95High) || 0;
    if (ciLow > ciHigh) [ciLow, ciHigh] = [ciHigh, ciLow];

    const ciMid = (ciLow + ciHigh) / 2;
    const appliedShrinkK = Math.min(maxAppliedPenalty, totalShrink);
    const ciExpand = 1 + Math.max(0, appliedShrinkK * 1.2);
    const widenedCiLow = Math.max(0, ciMid - ((ciMid - ciLow) * ciExpand));
    // FIX: usar safeMaxScore (validado) em vez de maxScore bruto
    const widenedCiHigh = Math.min(safeMaxScore, ciMid + ((ciHigh - ciMid) * ciExpand));

    const conformal = conformalizedCalibrationInterval(stackedProb01, predObsPairs, 0.1);
    const rawVolatility = Number(result.volatility) || 0;

    const finalResult = {
      diagnostics: result?.diagnostics || null,
      probability,
      probabilityRaw: stackedProb01 * 100,
      shrinkTotal: Number(totalShrink.toFixed(4)),
      lowSampleShrink: Number(lowSampleShrink.toFixed(4)),
      anomalyShrink: Number(anomalyShrink.toFixed(4)),
      targetScore: safeTargetScore,
      volatility: rawVolatility,
      volatilityAdjusted: rawVolatility * (1 + (enableAdaptiveCalibration ? calibrationPenalty * 0.8 : 0)),
      mean: result.mean,
      ci95Low: widenedCiLow,
      ci95High: widenedCiHigh,
      calibrationPenalty,
      avgBrier,
      ece,
      reliability,
      sampleSize: history.length,
      lowSampleAdjustment: Number(totalShrink.toFixed(4)),
      conformalLow: Number((conformal.low * 100).toFixed(2)),
      conformalHigh: Number((conformal.high * 100).toFixed(2)),
      conformalQ: Number(conformal.qHat.toFixed(4)),
      stackingWeights,
      predObsPairs,
      dataQuality: {
        historySize: history.length,
        predObsPairs: predObsPairs.length,
        calibrationEnabled: enableAdaptiveCalibration,
        anomalyCount: dataIssues,
        qualityScore: Number(dataQuality.toFixed(3)),
        anomalies: anomalies.filter(a => a.severity !== 'ok').slice(0, 3)
      }
    };

    finalResult.thresholds = deriveAdaptiveRiskThresholds(
      history.map(h => h.score), rawVolatility, safeCfg, safeMaxScore, predObsPairs);
    finalResult.effectiveMCTarget = safeTargetScore;
    finalResult.adaptiveBaseline = Number.isFinite(Number(adaptive?.calibrationBaseline))
      ? Number(adaptive.calibrationBaseline) : null;
    finalResult.explainability = buildCoachExplainability(finalResult);

    // Eviction LRU
    if (mcCache.size >= MC_CACHE_MAX) {
      const firstKey = mcCache.keys().next().value;
      if (firstKey !== undefined) mcCache.delete(firstKey);
    }
    if (mcCache.has(hash)) mcCache.delete(hash);
    mcCache.set(hash, finalResult);

    return finalResult;
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[CoachMC] Simulação falhou:', e.message, { n: history.length });
    }
    return null;
  }
}

```

## `src/utils/coachBacktest.js`

```javascript
/**
 * coachBacktest.js
 *
 * Métricas de backtest: NDCG, Uplift, Erro Calibrado.
 */
import { safeArray } from './coachSafe.js';

/**
 * Calcula NDCG@K.
 * FIX (BUG-40): proteção explícita contra divisão por zero (idcg <= 0)
 * e validação de tipo via safeArray (aceita objeto-arrays do store).
 */
export function computeNDCGAtK(predicted = [], actual = [], k = 5) {
  const safePredicted = safeArray(predicted);
  const safeActual = safeArray(actual);

  // PATCH-26: Early return para arrays vazios
  if (safePredicted.length === 0 || safeActual.length === 0) return 0;

  const topK = Math.max(1, Math.min(k, safePredicted.length));

  const actualMap = new Map(
    safeActual.map((x) => [x?.id, Number(x?.relevance) || 0])
  );

  const dcg = safePredicted.slice(0, topK).reduce((acc, item, idx) => {
    const rel = actualMap.get(item?.id) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  const ideal = [...safeActual].sort(
    (a, b) => (Number(b?.relevance) || 0) - (Number(a?.relevance) || 0)
  );

  const idcg = ideal.slice(0, topK).reduce((acc, item, idx) => {
    const rel = Number(item?.relevance) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  // FIX: se todos os relevance são 0, idcg = 0 → retornar 0 em vez de NaN
  if (idcg <= 0) return 0;
  return dcg / idcg;
}

/**
 * Calcula uplift: média(treatment) − média(control).
 * FIX: sem dados → retorna null (não 0), para não mascarar ausência de
 * evidência como "efeito zero". O coachEvaluator já trata null
 * (Number.isFinite → exibe '—' no painel).
 * FIX: filtra entradas não-numéricas para evitar NaN.
 */
export function computeUplift(control = [], treatment = []) {
  const safeControl = safeArray(control).map(Number).filter(Number.isFinite);
  const safeTreatment = safeArray(treatment).map(Number).filter(Number.isFinite);

  if (safeControl.length === 0 || safeTreatment.length === 0) return null;

  const meanControl = safeControl.reduce((a, b) => a + b, 0) / safeControl.length;
  const meanTreatment = safeTreatment.reduce((a, b) => a + b, 0) / safeTreatment.length;
  return meanTreatment - meanControl;
}

/**
 * Calcula erro calibrado entre probabilidade prevista e resultado binário.
 */
export function computeCalibratedError(probability, actual) {
  const p = Math.max(0, Math.min(1, Number(probability) || 0));
  const yRaw = Number(actual);
  const y = Number.isFinite(yRaw) ? (yRaw >= 0.5 ? 1 : 0) : (actual === true ? 1 : 0);
  return Math.abs(p - y);
}

/**
 * Compara duas execuções de estratégia.
 * FIX: validação de tipo via safeArray nas entradas.
 */
export function compareStrategyRuns(runA = {}, runB = {}, metrics = ['ndcg']) {
  const results = { delta: {}, winner: null };

  if (metrics.includes('ndcg')) {
    const predictedA = safeArray(runA?.predicted);
    const actualA = safeArray(runA?.actual);
    const predictedB = safeArray(runB?.predicted);
    const actualB = safeArray(runB?.actual);

    const ndcgA = computeNDCGAtK(predictedA, actualA, 5);
    const ndcgB = computeNDCGAtK(predictedB, actualB, 5);

    results.delta.ndcg = ndcgB - ndcgA;
    results.winner = ndcgB > ndcgA ? 'B' : (ndcgA > ndcgB ? 'A' : 'tie');
  }

  return results;
}

```

## `src/utils/coachCausal.js`

```javascript
/**
 * coachCausal.js
 *
 * Lote 11 — Facade de Causal Uplift & Policy Engine.
 */
import { getSafeScore } from './scoreHelper.js';
import { normalizeDate } from './dateHelper.js';
import { isSubjectMatch } from './normalization.js';
import {
  prepareCausalEvents,
  estimateUpliftByAction,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
} from '../engine/causal/upliftModel.js';
import {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  selectPersonalizedActions,
  buildPolicyReport,
} from '../engine/causal/policyEngine.js';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

// FIX: tolerância de 1 dia para datas "no futuro" (fuso horário / relógio errado).
// Qualquer timestamp além disso é tratado como dado corrompido e descartado.
const MAX_FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;
function isReasonableTime(t) {
  return Number.isFinite(t) && t <= Date.now() + MAX_FUTURE_TOLERANCE_MS;
}

function rollingSd(values, windowSize = 5) {
  const safeValues = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (safeValues.length < 2) return 0;
  const window = safeValues.slice(-windowSize);
  const mean = window.reduce((acc, val) => acc + val, 0) / window.length;
  const variance =
    window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    Math.max(1, window.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Constrói eventos causais baseados em volume de estudo entre simulados.
 */
export function buildStudyVolumeCausalEvents(simulados = [], studyLogs = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const minTreatmentMinutes = Number(options.minTreatmentMinutes) || 60;
  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;

  const safeSimulados = safeArray(simulados)
    .filter((simulado) => {
      if (!categoryName) return true;
      return isSubjectMatch(simulado?.subject || '', categoryName);
    })
    .map((simulado, index) => {
      const time = toTime(simulado?.date ?? simulado?.createdAt);
      const score = getSafeScore(simulado, maxScore);
      return {
        index,
        time,
        score,
        simulado,
      };
    })
    // FIX: descarta timestamps inválidos OU no futuro além da tolerância
    .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.score) && isReasonableTime(entry.time))
    .sort((a, b) => a.time - b.time);

  const safeLogs = safeArray(studyLogs)
    .filter((log) => {
      if (!categoryId) return true;
      return log?.categoryId === categoryId;
    })
    .map((log) => ({
      time: toTime(log?.date ?? log?.createdAt),
      minutes: Math.min(720, Math.max(0, Number(log?.minutes) || 0)),
    }))
    // FIX: descarta logs com timestamp inválido/futuro
    .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time));

  const events = [];
  const scores = safeSimulados.map((entry) => entry.score);

  for (let i = 1; i < safeSimulados.length; i++) {
    const prev = safeSimulados[i - 1];
    const curr = safeSimulados[i];
    if (curr.time <= prev.time) continue;

    const outcomeDelta = curr.score - prev.score;
    const baselineScore = prev.score;
    const daysSince = (curr.time - prev.time) / 86400000;

    const intervalLogs = safeLogs.filter(
      (log) => log.time > prev.time && log.time <= curr.time
    );
    const totalMinutes = intervalLogs.reduce(
      (acc, log) => acc + log.minutes,
      0
    );
    const treated = totalMinutes >= minTreatmentMinutes ? 1 : 0;
    const volatility = rollingSd(scores.slice(0, i), 5);

    events.push({
      id: `study-volume-${prev.index}-${curr.index}`,
      timestamp: curr.time,
      treated,
      outcomeDelta,
      baselineScore,
      volatility,
      daysSince,
      weight: Number(options.weight) || 5,
      uncertainty: 0.4,
      actionType: treated ? 'study_volume' : 'no_study_volume',
    });
  }

  return events;
}

/**
 * Constrói eventos causais baseados em tarefas concluídas.
 */
export function buildTaskCausalEvents(categories = [], simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const maxHorizonDays = Number(options.maxHorizonDays) || 45;
  const safeCategories = safeArray(categories);
  const events = [];

  safeCategories.forEach((category) => {
    const categoryName = category?.name || '';
    const categoryId = category?.id || categoryName || 'unknown';

    const categorySimulados = safeArray(simulados)
      .filter((simulado) => isSubjectMatch(simulado?.subject || '', categoryName))
      .map((simulado, index) => {
        const time = toTime(simulado?.date ?? simulado?.createdAt);
        const score = getSafeScore(simulado, maxScore);
        return {
          index,
          time,
          score,
          simulado,
        };
      })
      // FIX: descarta timestamps inválidos/futuros
      .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.score) && isReasonableTime(entry.time))
      .sort((a, b) => a.time - b.time);

    if (categorySimulados.length < 2) return;

    const tasks = safeArray(category?.tasks).filter((task) => {
      return Boolean(task?.completed);
    });

    const taskTimes = tasks
      .map((task) => {
        const time = toTime(task?.lastStudiedAt ?? task?.completedAt);
        return {
          task,
          time,
        };
      })
      // FIX: descarta timestamps inválidos/futuros
      .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time))
      .sort((a, b) => a.time - b.time);

    const scores = categorySimulados.map((entry) => entry.score);

    // Eventos tratados: tarefa concluída entre dois simulados.
    taskTimes.forEach(({ task, time }, taskIndex) => {
      let prevSim = null;
      let nextSim = null;

      for (const sim of categorySimulados) {
        if (sim.time <= time) {
          prevSim = sim;
        }
      }
      for (const sim of categorySimulados) {
        if (sim.time > time) {
          nextSim = sim;
          break;
        }
      }

      if (!prevSim || !nextSim) return;

      const horizonDays = (nextSim.time - prevSim.time) / 86400000;
      if (horizonDays > maxHorizonDays) return;

      const outcomeDelta = nextSim.score - prevSim.score;
      const baselineScore = prevSim.score;
      const daysSince = (time - prevSim.time) / 86400000;
      const volatility = rollingSd(scores.slice(0, prevSim.index + 1), 5);

      events.push({
        id: `task-${categoryId}-${task?.id || taskIndex}`,
        timestamp: nextSim.time,
        treated: 1,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: 0.45,
        actionType: inferActionType(task?.text || task?.topicName || ''),
      });
    });

    // ✅ PATCH-23: Limitar eventos controle para evitar desbalanceamento
    const MAX_CONTROL_EVENTS_PER_CATEGORY = 5;
    let controlCount = 0;

    for (let i = 1; i < categorySimulados.length && controlCount < MAX_CONTROL_EVENTS_PER_CATEGORY; i++) {
      const prev = categorySimulados[i - 1];
      const curr = categorySimulados[i];

      const hasTaskInInterval = taskTimes.some(
        ({ time }) => time > prev.time && time <= curr.time
      );
      if (hasTaskInInterval) continue;

      controlCount++;

      const outcomeDelta = curr.score - prev.score;
      const baselineScore = prev.score;
      const daysSince = (curr.time - prev.time) / 86400000;
      const volatility = rollingSd(scores.slice(0, i), 5);

      events.push({
        id: `no-task-${categoryId}-${prev.index}-${curr.index}`,
        timestamp: curr.time,
        treated: 0,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: 0.5,
        actionType: 'no_task',
      });
    }
  });

  return events;
}

/**
 * Combina eventos de tarefas e volume de estudo.
 */
export function buildCausalEventsFromHistory(
  categories = [],
  simulados = [],
  studyLogs = [],
  options = {}
) {
  const taskEvents = buildTaskCausalEvents(categories, simulados, options);
  const volumeEvents = buildStudyVolumeCausalEvents(simulados, studyLogs, {
    ...options,
    categoryName: options.categoryName || null,
    categoryId: options.categoryId || null,
  });

  // ✅ FIX: Validar eventos antes de combinar
  const safeTaskEvents = Array.isArray(taskEvents) ? taskEvents : [];
  const safeVolumeEvents = Array.isArray(volumeEvents) ? volumeEvents : [];
  const combined = [...safeTaskEvents, ...safeVolumeEvents];

  return prepareCausalEvents(combined, options);
}

/**
 * Treina modelo causal e salva localmente.
 */
export function trainCausalModel(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);

  const estimates = estimateUpliftByAction(safeEvents, {
    method: options.method || 'auto',
    maxScore: options.maxScore ?? 100,
    bootstrapIterations:
      options.useBootstrap === true
        ? options.bootstrapIterations ?? 100
        : 0,
    covariates: options.covariates,
    minSamplesPerAction: options.minSamplesPerAction,
  });

  const model = {
    generatedAt: Date.now(),
    maxScore: options.maxScore ?? 100,
    method: options.method || 'auto',
    sampleSize: safeEvents.length,
    global: estimates.global,
    actions: estimates.actions,
    actionCounts: estimates.actionCounts,
  };

  if (options.save !== false) {
    saveCausalModel(model);
  }

  return model;
}

/**
 * Executa um ciclo completo: eventos → modelo → política.
 */
export function runCausalPolicyCycle(input = {}) {
  const categories = safeArray(input.categories);
  const simulados = safeArray(input.simulados);
  const studyLogs = safeArray(input.studyLogs);

  const events = Array.isArray(input.events)
    ? prepareCausalEvents(input.events, input.options || {})
    : buildCausalEventsFromHistory(categories, simulados, studyLogs, input.options || {});

  const model =
    input.model && typeof input.model === 'object'
      ? input.model
      : trainCausalModel(events, input.options || {});

  const category = input.category || categories[0] || null;
  const topics = input.topics || [];

  let candidates = candidatesFromWeakTopics(topics, category || {}, input.options || {});
  candidates = addSystemActionCandidates(candidates, input.metrics || {}, {
    categoryId: category?.id || null,
    categoryName: category?.name || null,
  });

  const selectedActions = selectPersonalizedActions(candidates, model, {
    maxScore: input.options?.maxScore ?? 100,
    topK: input.options?.topK ?? 5,
    healthStatus: input.health?.status || null,
    causalWeight: input.options?.causalWeight ?? 0.35,
  });

  const report = buildPolicyReport(selectedActions, model, {
    maxScore: input.options?.maxScore ?? 100,
    healthStatus: input.health?.status || null,
  });

  return {
    eventsCount: events.length,
    model,
    candidates,
    selectedActions,
    report,
  };
}

/**
 * Reordena tarefas do Coach usando política causal.
 */
export function rerankCoachTasksWithCausalPolicy(tasks = [], causalModel = null, options = {}) {
  const safeTasks = safeArray(tasks);
  if (safeTasks.length === 0) return [];

  const priorityToUtility = (priority) => {
    if (priority === 'high') return 85;
    if (priority === 'medium') return 55;
    return 25;
  };

  const candidates = safeTasks.map((task, index) => {
    const actionType = inferActionType(task?.text || task?.topicName || '');
    return {
      id: task?.id || task?.text || `task-${index}`,
      type: actionType,
      name: task?.text || task?.topicName || `Tarefa ${index + 1}`,
      categoryId: task?.categoryId || null,
      categoryName: task?.catName || task?.category || null,
      decisionUtility: priorityToUtility(task?.priority),
      features: {
        priority: task?.priority || 'medium',
        costMinutes: Number(task?.estimatedMinutes || task?.minutes || 30),
      },
      originalTask: task,
    };
  });

  const ranked = selectPersonalizedActions(candidates, causalModel, {
    maxScore: options.maxScore ?? 100,
    topK: safeTasks.length,
    healthStatus: options.healthStatus || null,
    causalWeight: options.causalWeight ?? 0.35,
  });

  // ✅ FIX: Validar ranked antes de criar orderMap
  const safeRanked = Array.isArray(ranked) ? ranked : [];
  const orderMap = new Map();
  safeRanked.forEach((candidate, index) => {
    if (candidate && candidate.id) {
      orderMap.set(candidate.id, index);
    }
  });

  // FIX (BUG-41): tarefas NÃO mapeadas pelo modelo causal mantêm sua ordem
  // original relativa (posicionadas após as ranqueadas), em vez do fallback
  // arbitrário 9999 — que era instável e quebrava com muitas tarefas.
  return [...safeTasks]
    .map((task, originalIndex) => ({
      task,
      sortKey:
        orderMap.get(task?.id || task?.text || '') ??
        (safeRanked.length + originalIndex),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((item) => item.task);
}

export {
  prepareCausalEvents,
  estimateUpliftByAction,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  selectPersonalizedActions,
  buildPolicyReport,
};

export default {
  buildStudyVolumeCausalEvents,
  buildTaskCausalEvents,
  buildCausalEventsFromHistory,
  trainCausalModel,
  runCausalPolicyCycle,
  rerankCoachTasksWithCausalPolicy,
};

```

## `src/utils/coachEvaluation.js`

```javascript
/**
 * coachEvaluation.js
 *
 * Lote 8 — Facade para avaliação e backtest do Coach.
 */
export {
  evaluateProbabilityPrediction,
  evaluateScorePrediction,
  evaluateTopicRanking,
  evaluateTaskUplift,
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
  buildEvaluationDashboardData,
  saveEvaluationResult,
  loadEvaluationResults,
  clearEvaluationResults,
} from '../engine/evaluation/coachEvaluator.js';

export {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  buildCategorySplits,
  runCoachStrategyBacktest,
} from '../engine/evaluation/strategyBacktester.js';

import {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  runCoachStrategyBacktest,
} from '../engine/evaluation/strategyBacktester.js';
import {
  summarizeCoachEvaluations,
  buildEvaluationDashboardData,
} from '../engine/evaluation/coachEvaluator.js';

/**
 * Executa backtest padrão: baseline vs todos os lotes.
 */
export function runDefaultCoachBacktest(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  return runCoachStrategyBacktest({
    categories,
    simulados,
    studyLogs,
    strategies: getDefaultCoachStrategies(),
    ...options,
  });
}

/**
 * Executa backtest granular: lote por lote.
 */
export function runGranularCoachBacktest(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  return runCoachStrategyBacktest({
    categories,
    simulados,
    studyLogs,
    strategies: getGranularCoachStrategies(),
    ...options,
  });
}

/**
 * Constrói dashboard a partir de avaliações salvas ou de um backtest.
 *
 * FIX: valida input e retorna null se o summary for inválido,
 * evitando exceção em chamadas com dado corrompido.
 */
export function buildCoachEvaluationDashboard(evaluations = []) {
  const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];
  const summary = summarizeCoachEvaluations(safeEvaluations);
  if (!summary || typeof summary !== 'object') return null;
  return buildEvaluationDashboardData(summary);
}

export default {
  runDefaultCoachBacktest,
  runGranularCoachBacktest,
  buildCoachEvaluationDashboard,
};

```

## `src/utils/coachFeatures.js`

```javascript
/**
 * coachFeatures.js
 *
 * Feature flags para evolução por lotes do motor Coach.
 */

const DEFAULT_COACH_FEATURES = Object.freeze({
  // Lote 1 — State-Space
  useStateSpace: false,
  useStateSpaceAverage: false,
  useStateSpaceTrend: false,
  // Lote 2 — Volatilidade
  useDynamicVolatility: false,
  useGarchVolatility: false,
  useDynamicVolatilityOverride: false,
  // Lote 3 — Posterior MC
  usePosteriorMonteCarlo: false,
  usePosteriorMonteCarloOverride: false,
  // Lote 4 — Bayesian Topics
  useBayesianTopics: false,
  useBayesianTopicsForUrgency: false,
  // Lote 5 — Decision Utility
  useDecisionUtility: false,
  useDecisionUtilityForTopics: false,
  useDecisionUtilityForBestTask: false,
  useBanditPlanner: false,
  // Lote 6 — LLM
  useLLMExplanations: false,
  useLLMInsights: false,
  useLLMTaskClassifier: false,
  useLLMStrictValidation: false,
  // Lote 7 — Graph + FSRS
  useKnowledgeGraph: false,
  useKnowledgeGraphForTopics: false,
  useAdvancedFsrs: false,
  useFsrsForSrsBoost: false,
  useFsrsTopicScheduling: false,
  // Lote 8 — Evaluation
  useEvaluationTelemetry: false,
  useStrategyBacktester: false,
  useTopicRankEvaluation: false,
  // Lote 9 — Observability
  useObservability: false,
  useDriftGuard: false,
  useModelHealthTelemetry: false,
  useDriftAlerts: false,
  // Lote 10 — AutoTuner
  useMetaOptimizer: false,
  useAutoTuner: false,
  useAutoFlagApplication: false,
  useAutoRollback: false,
  // Lote 11 — Causal
  useCausalUplift: false,
  usePersonalizedPolicy: false,
  useCausalTaskSelection: false,
  useCausalBootstrap: false,
  // Lote 12 — Orchestrator
  useCoachOrchestrator: false,
  useOrchestratorHealth: false,
  useOrchestratorLLM: false,
  useOrchestratorAutoTuner: false,
  // Lote 13 — Control Center
  useCoachControlCenter: false,
  useControlCenterFlagsPanel: false,
  useControlCenterHealthPanel: false,
  useControlCenterBacktestPanel: false,
  useControlCenterAutoTunerPanel: false,
  useControlCenterCausalPanel: false,
  useControlCenterLLMPanel: false,
});

/**
 * Retorna o valor de uma feature flag.
 *
 * Prioridade:
 * 1. options.features
 * 2. globalThis.__COACH_FEATURES__
 * 3. DEFAULT_COACH_FEATURES
 * 4. fallback
 */
export function getCoachFeature(options, key, fallback = false) {
  // FIX: guarda contra key inválida antes de qualquer acesso
  if (typeof key !== 'string' || key === '') return fallback;
  try {
    if (options?.features && typeof options.features[key] === 'boolean') {
      return options.features[key];
    }
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__COACH_FEATURES__ &&
      typeof globalThis.__COACH_FEATURES__[key] === 'boolean'
    ) {
      return globalThis.__COACH_FEATURES__[key];
    }
    if (typeof DEFAULT_COACH_FEATURES[key] === 'boolean') {
      return DEFAULT_COACH_FEATURES[key];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// PATCH-NOVO: validação de chave para toggleFlag / painéis de flags
export function isValidFeatureKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(DEFAULT_COACH_FEATURES, key);
}

export default {
  getCoachFeature,
  isValidFeatureKey,
  DEFAULT_COACH_FEATURES,
};

```

## `src/utils/coachLogic.js`

```javascript
// ==================== CONSTANTES ====================
import { calculateMSSD, calculateSlope } from '../engine/projection.js';
import { getSortedHistory } from '../engine/stats.js';
import { useAppStore } from '../store/useAppStore.js';
import { computeForgettingRisk } from '../engine/diagnostics.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
import { safeDateParse as _safeDateParse, normalizeDate, getDateKey } from './dateHelper.js';
import { normalize, isSubjectMatch } from './normalization.js';
import { computeRollingCalibrationParams } from './calibration.js';
import {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    deriveCoachAdaptiveParams,
    runCoachMonteCarlo,
    clearMcCache,
    simuladosToHistory
} from './coachAdaptive.js';
import { computeAdaptiveCoachWeight } from './adaptiveMath.js';
import { getCoachFeature } from './coachFeatures.js';
import { kalmanAbilityTrend } from '../engine/probabilistic/stateSpace.js';
import { estimateDynamicVolatility } from '../engine/probabilistic/volatility.js';
import { estimatePosteriorPredictive } from '../engine/probabilistic/posteriorPredictive.js';
import { estimateTopicProficiencies } from '../engine/probabilistic/bayesianTopics.js';
import {
  rankDecisionCandidates,
} from '../engine/probabilistic/decisionEngine.js';
import {
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
} from '../engine/probabilistic/knowledgeGraph.js';
import {
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
} from '../engine/probabilistic/fsrs.js';
import { kahanSum } from '../engine/math/kahan.js';
import { computeAgilityMetrics } from '../engine/stats.js';
// import { cleanCoachTags } from './coachText.js';
// FIX (BUG-13): hashString64 disponível para cache keys compactas
import { safeArray, getCalibrationKey, hashString, hashString64 } from './coachSafe.js';

export {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    clearMcCache,
    runCoachMonteCarlo
};

const URGENCY_CACHE_MAX = 80;
const TOPICS_CACHE_MAX = 50;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// LRU Cache for urgency calculations
export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();
export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();

// ✅ FIX: Helper para inserção com limite e TTL
function cacheSet(cache, maxSize, key, value) {
  if (cache.size >= maxSize) {
    // Limpar expirados primeiro
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS) cache.delete(k);
    }
    // Se ainda cheio, remover LRU
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  }
  cache.set(key, { value, timestamp: Date.now() });
}

function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // LRU: mover para o fim
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

// FIX (BUG-14): deep clone robusto — preserva Date, Map, Set, undefined
// (JSON.parse(JSON.stringify()) perde esses tipos no fallback)
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch { /* fallback abaixo */ }
  if (Array.isArray(value)) return value.map(deepClone);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [deepClone(k), deepClone(v)]));
  if (value instanceof Set) return new Set([...value].map(deepClone));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepClone(v);
  return out;
}

const sanitizeMinutes = (mins) => Math.min(720, Math.max(0, Number(mins) || 0));
const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

const safeFixedNumber = (value, digits = 2, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : fallback;
};

// simpleHash moved to coachSafe.js as hashString (canonical)
const simpleHash = hashString;

export const DEFAULT_CONFIG = {
    MC_HISTORY_WINDOW: 10,
    SCORE_MAX: 45,
    RECENCY_MAX: 28,
    INSTABILITY_MAX: 22,
    PRIORITY_BOOST: 18,
    EFFICIENCY_MAX: 10,
    SRS_BOOST: 16,
    BASE_HOURS_THRESHOLD: 5,
    // Normalização
    NORMALIZATION_CEILING: 170,
    CRITICAL_THRESHOLD: 122,
    // Monte Carlo
    MC_SIMULATIONS: 800,
    MC_MIN_DATA_POINTS: 3,
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    INSTABILITY_MSSD_DIVISOR: 12,
    MC_BACKTEST_HORIZON: 3,
    MC_BACKTEST_HORIZON_MAX: 6,
    MC_CALIBRATION_BRIER_BASELINE: 0.18,
    MC_CALIBRATION_MAX_PENALTY: 0.25,
    MC_CALIBRATION_NEUTRAL_PCT: 50,
    MC_CALIBRATION_MAX_APPLIED_PENALTY: 0.35,
    MC_ENABLE_ADAPTIVE_CALIBRATION: true,
    MC_CALIB_WINDOW_DAYS: 60,
    MC_CALIB_MIN_SAMPLES: 4,
    MC_CALIB_MAX_SAMPLES: 20,
    MC_ECE_BINS_MIN: 4,
    MC_ECE_BINS_MID: 6,
    MC_ECE_BINS_MAX: 8,
    MC_LOW_SAMPLE_THRESHOLD: 10,
    MC_BOOST_DANGER_BASE: 10,
    MC_BOOST_DANGER_RANGE: 12,
    MC_BOOST_MODERATE_BASE: 10,
    MC_BOOST_SAFE_PENALTY: -10,
    MC_MODERATE_MIDPOINT: 55,
};

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMax = maxScore > 0 ? maxScore : 100;
    const currentPct = currentScore / safeMax;
    const damping = Math.max(0, 1 - currentPct);
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;
    return dynamicPct * maxScore;
}

// ==================== FUNÇÕES AUXILIARES ====================
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const getDaysDiff = (newer, older) => {
    const d1 = normalizeDate(newer) || new Date(0);
    const d2 = normalizeDate(older) || new Date(0);
    return Math.max(0, Math.round((d1.getTime() - d2.getTime()) / MS_PER_DAY));
};

/**
 * Crunch multiplier corrigido:
 * - monotônico com os dias restantes
 * - menos distorção para veteranos
 * - curva logística mais justa e explicável
 *
 * PATCH: daysToExam === 0 → curva logística converge para ~2.0 (máxima urgência no dia da prova)
 * daysToExam < 0 → retorna 1.0 (prova já passou)
 */
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;
    if (daysToExam === 0) return 2.0;
    // A curva logística já converge para ~2.0 naturalmente
    let criticalHorizon = 21;
    let timeDivisor = 7;
    const safeFirstActivity = normalizeDate(firstActivityDate);
    if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
        const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
        const refTime = referenceDate.getTime();
        const firstTime = safeFirstActivity.getTime();
        if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;
        const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
        // ✅ FIX: Validar journeyDays antes de calcular totalJourneyDays
        if (!Number.isFinite(journeyDays) || journeyDays <= 0) return 1.0;
        const safeDays = Number.isFinite(daysToExam) ? Math.max(0, daysToExam) : 0;
        const totalJourneyDays = Math.max(1, journeyDays) + safeDays;
        criticalHorizon = Math.max(14, Math.min(35, totalJourneyDays * 0.08));
        timeDivisor = Math.max(7, Math.min(60, totalJourneyDays * 0.15));
    }
    const timeDist = Number.isFinite(daysToExam) ? Number(daysToExam) : criticalHorizon;
    const urgency = 1.0 + (1.0 / (1.0 + Math.exp((timeDist - criticalHorizon) / timeDivisor)));
    return Number(Math.min(2.0, urgency).toFixed(4));
}

function _getSRSBoost(history, daysSince, maxScore, cfg, mssdVolatility = null, effectiveN = null) {
  // Lote 7: FSRS avançado opcional
  if (
    getCoachFeature(null, 'useAdvancedFsrs', false) &&
    getCoachFeature(null, 'useFsrsForSrsBoost', false)
  ) {
    try {
      const fsrsData = estimateCategoryFsrsBoost(history, {
        daysSince,
        maxScore,
        cfg,
        desiredRetention: 0.85,
      });
      if (fsrsData) {
        return fsrsData;
      }
    } catch (err) {
      console.warn('[CoachLogic] Advanced FSRS category boost failed:', err);
    }
  }

  // Fallback legado
  const forgettingData = computeForgettingRisk(
    history,
    maxScore,
    null,
    mssdVolatility,
    effectiveN,
    daysSince
  );

  // ✅ FIX: Validar retention antes de calcular boost
  const retention = Number.isFinite(forgettingData.retentionPct)
    ? forgettingData.retentionPct
    : 100;

  if (retention < 75) {
    const intensity = Math.pow((75 - retention) / 75, 1.2);
    const boost = cfg.SRS_BOOST * 2.0 * intensity;
    let label;
    if (retention < 30) label = "⚠️ Memória Crítica (Risco de Branco)";
    else if (retention < 55) label = "🧠 Revisão Necessária (Curva de Esquecimento)";
    else label = "🔄 Revisão de Reforço";
    return { boost, label };
  }
  return { boost: 0, label: null };
}

/**
 * Proficiência bayesiana corrigida:
 * - tópico nunca testado não herda automaticamente a média global
 * - reduz o Efeito Halo
 */
export const computeBayesianProficiency = (acertos, total, mediaGlobal = 0.5, globalTotal = 0) => {
    const rawAcertos = Number(acertos) || 0;
    const rawTotal = Number(total) || 0;
    const safeMedia = Number.isFinite(mediaGlobal) ? Math.max(0, Math.min(1, mediaGlobal)) : 0.5;
    const safeGlobalTotal = Number.isFinite(globalTotal) ? Math.max(0, globalTotal) : 0;
    const K = Math.max(3, Math.min(15, Math.log10(safeGlobalTotal + 1) * 3));
    const untestedPrior = 0.25;
    // ✅ FIX: Tópico não testado usa prior conservador, não herda média global
    const dataTrust = Math.min(1, rawTotal / K);
    const prior = rawTotal === 0
        ? untestedPrior // ← Não herda safeMedia
        : (untestedPrior * (1 - dataTrust)) + (safeMedia * dataTrust);
    const smoothedAcertos = rawAcertos + (prior * K);
    const smoothedTotal = rawTotal + K;
    const proficiency = smoothedTotal > 0 ? smoothedAcertos / smoothedTotal : untestedPrior;
    return clamp(proficiency, 0, 1);
};

export function computeRobustVolatilityForCoach(history = [], maxScore = 100) {
    const fallbackVol = 0.08 * maxScore;
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const n = safeHistory.length;
    if (n < 2) return fallbackVol;
    const validScores = safeHistory
        .map(h => getSafeScore(h, maxScore))
        .filter(s => Number.isFinite(s));
    const validN = validScores.length;
    if (validN < 2) return fallbackVol;
    const mean = kahanSum(validScores) / validN;
    const devs = validScores.map(val => Math.pow(val - mean, 2));
    const variance = kahanSum(devs) / (validN - 1);
    const empiricalVol = Math.sqrt(Math.max(0, variance));
    const shrinkFactor = validN / (validN + 4);
    return empiricalVol * shrinkFactor + fallbackVol * (1 - shrinkFactor);
}

export const sanitizeNum = (val) => {
    if (val === null || val === undefined || val === '') return NaN;
    let str = String(val).trim();
    str = str.replace(/[%\s]/g, '');
    if (!str) return NaN;
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
        const lastComma = str.lastIndexOf(',');
        const lastDot = str.lastIndexOf('.');
        if (lastComma > lastDot) {
            // BR: 1.234,56
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // US: 1,234.56
            str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
        str = str.replace(/\./g, '');
    }
    const n = Number(str);
    return Number.isFinite(n) ? n : NaN;
};

export const getCoachPriorities = (topicsData) => {
  if (!Array.isArray(topicsData)) return [];

  const useBayesian = getCoachFeature(null, 'useBayesianTopics', false);
  if (useBayesian) {
    try {
      const bayesianInput = topicsData.map(topic => {
        const parsedAcertos = sanitizeNum(topic.acertos);
        const parsedCorrect = sanitizeNum(topic.correct);
        const parsedTotal = sanitizeNum(topic.total);
        const correct = Number.isFinite(parsedAcertos)
          ? parsedAcertos
          : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        const total = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        return {
          name: topic.name || topic.topic || topic.id || 'Tópico',
          total,
          correct,
          original: topic
        };
      });

      const bayesianResult = estimateTopicProficiencies(bayesianInput, {
        untestedPriorMean: 0.25,
        untestedPriorWeight: 0.45
      });

      return bayesianResult.topics
        .map(topic => ({
          ...(topic.original || {}),
          name: topic.name,
          realProficiency: clamp(topic.proficiencyMean, 0, 1),
          bayesian: topic
        }))
        .sort((a, b) => {
          const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
          const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
          return valA - valB;
        });
    } catch (err) {
      console.warn('[CoachLogic] Bayesian getCoachPriorities failed:', err);
    }
  }

  // fallback legado
  const globalCorrect = topicsData.reduce((acc, t) => {
    const parsedAcertos = sanitizeNum(t.acertos);
    const parsedCorrect = sanitizeNum(t.correct);
    const c = Number.isFinite(parsedAcertos)
      ? parsedAcertos
      : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
    return acc + c;
  }, 0);

  const globalTotal = topicsData.reduce((acc, t) => {
    const parsedTotal = sanitizeNum(t.total);
    const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
    return acc + tot;
  }, 0);

  const mediaGlobal = (globalTotal > 0 && Number.isFinite(globalCorrect / globalTotal))
    ? globalCorrect / globalTotal
    : 0.5;

  return topicsData.map(topic => {
    const parsedAcertos = sanitizeNum(topic.acertos);
    const parsedCorrect = sanitizeNum(topic.correct);
    const parsedTotal = sanitizeNum(topic.total);
    const c = Number.isFinite(parsedAcertos)
      ? parsedAcertos
      : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
    const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;

    let realProficiency = computeBayesianProficiency(c, tot, mediaGlobal, globalTotal);
    realProficiency = Number.isFinite(realProficiency) ? clamp(realProficiency, 0, 1) : 0;

    return {
      ...topic,
      realProficiency
    };
  })
  .sort((a, b) => {
    const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
    const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
    return valA - valB;
  });
};

// ==================== FUNÇÃO PRINCIPAL ====================
export const extractMetrics = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const safeCategory = category || {};
    const categoryId = safeCategory.id;
    const calibrationHistory = options.calibrationHistoryByCategory?.[getCalibrationKey(categoryId)] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY,
        windowDays: cfg.MC_CALIB_WINDOW_DAYS,
        minSamples: cfg.MC_CALIB_MIN_SAMPLES,
        maxSamples: cfg.MC_CALIB_MAX_SAMPLES
    });

    const referenceDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
    const referenceNow = referenceDate.getTime();

    const rawMaxScore = Number(options.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;

    const rawMinScore = Number(options.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;

    const rawTargetScore = Number(options.targetScore ?? (maxScore * 0.8));
    const fallbackTarget = maxScore * 0.8;
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));
    const targetScoreLabel = options.targetScoreLabel ?? Math.round((targetScore / maxScore) * 100);

    let rawWeightVal = safeCategory.weight;
    if (typeof rawWeightVal === 'string') {
        rawWeightVal = rawWeightVal.replace(/\./g, '').replace(',', '.');
    }
    const parsedWeight = Number(rawWeightVal);
    const rawWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 5;
    const boundedWeight = Math.min(10, Math.max(1, rawWeight));
    const weight = boundedWeight * 20;
    const weightLabel = boundedWeight <= 3 ? '1 — Baixa' : boundedWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        try {
            const examDate = normalizeDate(options.user.goalDate);
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(referenceDate) || referenceDate;
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", options.user.goalDate);
        }
    }

    const safeSimulados = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
    const safeStudyLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});

    const relevantAll = safeSimulados
        .filter(s => s && isSubjectMatch(s.subject || "", safeCategory?.name || ""))
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
            return timeB - timeA;
        });

    const rootActivityDate = (relevantAll.length > 0
        ? normalizeDate(relevantAll[relevantAll.length - 1].date || relevantAll[relevantAll.length - 1].createdAt)
        : null) || normalizeDate(referenceDate) || referenceDate;

    const relevantSimulados = relevantAll.length > 50 ? relevantAll.slice(0, 50) : relevantAll;
    const simuladosWithMaxScore = relevantSimulados;

    // Global baseline antes da média inicial, para âncora mais justa em categorias sem dados
    let globalBaselinePct = 50;
    const validCatNorms = new Set((options.allCategories || []).map(c => normalize(c?.name || "")));
    const allSimsForBaseline = validCatNorms.size > 0
        ? safeSimulados.filter(s => s && validCatNorms.has(normalize(s.subject || "")))
        : safeSimulados;

    const validGlobalSims = allSimsForBaseline
        .map(s => getSafeScore(s, maxScore))
        .filter(s => Number.isFinite(s));

    if (validGlobalSims.length > 0 && maxScore > 0) {
        const totalPoints = kahanSum(validGlobalSims);
        // ✅ PATCH-34: Proteção explícita contra divisão por zero
        const denominator = validGlobalSims.length * maxScore;
        globalBaselinePct = denominator > 0 ? (totalPoints / denominator) * 100 : 50;
    }

    let averageScore = 0;

    if (relevantSimulados.length > 0) {
        const coachAdaptive = deriveCoachAdaptiveParams(simuladosToHistory(relevantSimulados, maxScore), maxScore, cfg);
        const today = normalizeDate(referenceDate) || referenceDate;
        const K = coachAdaptive.decayK;
        const PESO_MIN = coachAdaptive.minWeight;
        const DELTA = coachAdaptive.scoreClampDelta;

        const calculateExponentialScore = (dataset) => {
            let weightedSum = 0;
            let totalWeight = 0;
            dataset.forEach(s => {
                const sScore = getSafeScore(s, maxScore);
                if (!Number.isFinite(sScore)) return;
                const simDate = normalizeDate(s.date || s.createdAt) || new Date(0);
                const days = getDaysDiff(today, simDate);
                let timeWeight = Math.exp(-K * days);
                if (timeWeight < PESO_MIN) timeWeight = PESO_MIN;
                const rawTotal = Math.max(1, Number(s.total) || getSyntheticTotal(maxScore));
                const volumeWeight = Math.sqrt(Math.min(rawTotal, maxScore * 2));
                const peso = timeWeight * volumeWeight;
                weightedSum += sScore * peso;
                totalWeight += peso;
            });
            return totalWeight > 0 ? weightedSum / totalWeight : (maxScore / 2);
        };

        const mostRecentSimDate = relevantSimulados.length > 0
            ? (normalizeDate(relevantSimulados[0].date || relevantSimulados[0].createdAt) || new Date(0)).getTime()
            : referenceNow;

        const SESSION_GAP_MS = 60 * 60 * 1000;
        let pastSimulados = relevantSimulados.filter(s => {
            const sTime = (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime();
            return sTime < (mostRecentSimDate - SESSION_GAP_MS);
        });

        if (pastSimulados.length === 0 && relevantSimulados.length > 1) {
            pastSimulados = relevantSimulados.slice(1);
        }

        const notaBruta = calculateExponentialScore(relevantSimulados);

        if (pastSimulados.length > 0) {
            const notaAnterior = calculateExponentialScore(pastSimulados);
            const diff = notaBruta - notaAnterior;
            let clampedDiff = diff;
            if (diff > DELTA) clampedDiff = DELTA;
            else if (diff < -DELTA) clampedDiff = -DELTA;

            // ✅ PATCH-09: Validar hoursSinceLastSim explicitamente
            const rawHoursSinceLastSim = (referenceNow - mostRecentSimDate) / (1000 * 60 * 60);
            const hoursSinceLastSim = Number.isFinite(rawHoursSinceLastSim) && rawHoursSinceLastSim >= 0
                ? rawHoursSinceLastSim
                : Infinity; // ← força o caminho "notaBruta"

            if (hoursSinceLastSim < 24) {
                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            averageScore = notaBruta;
        }
    } else {
        const domain = Math.max(1e-6, maxScore - minScore);
        const globalAnchor = Number.isFinite(options.globalMcStats?.currentMean)
            ? options.globalMcStats.currentMean
            : (globalBaselinePct !== 50
                ? (globalBaselinePct / 100) * maxScore
                : minScore + 0.5 * domain);
        averageScore = clamp(globalAnchor, minScore, maxScore);
    }

    let daysSinceLastStudy = 0;
    let recencyUnknown = true;
    let lastDate = normalizeDate(new Date(0)) || new Date(0);

    if (simuladosWithMaxScore.length > 0) {
        const simDate = normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0);
        if (simDate > lastDate) lastDate = simDate;
    }

    const categoryStudyLogs = safeStudyLogs.filter(log =>
        categoryId && log?.categoryId === categoryId &&
        (normalizeDate(log.date) || new Date(0)).getTime() > 0
    );

    const MIN_MINUTES_VALID_STUDY = 15;
    const validStudyLogs = categoryStudyLogs.filter(log => sanitizeMinutes(log.minutes) >= MIN_MINUTES_VALID_STUDY);

    if (validStudyLogs.length > 0) {
        const sortedLogs = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );
        const logDate = normalizeDate(sortedLogs[0].date) || new Date(0);
        if (logDate > lastDate) lastDate = logDate;
    }

    if (lastDate.getTime() > 0) {
        const today = normalizeDate(referenceDate) || referenceDate;
        daysSinceLastStudy = getDaysDiff(today, lastDate);
        recencyUnknown = false;
    }

    const trendHistory = [...simuladosWithMaxScore]
        .map(s => ({
            score: getSafeScore(s, maxScore),
            date: s.date || s.createdAt
        }))
        .filter(t => Number.isFinite(t.score))
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date) || new Date(0)).getTime();
            return timeB - timeA;
        })
        .slice(0, 10)
        .reverse();

    const lastNScores = trendHistory.map(t => t.score);
    const backtestWeights = deriveBacktestWeights(lastNScores, maxScore);

    // ==================== LOTE 1: STATE-SPACE / KALMAN ====================
    let stateSpace = null;
    const useStateSpace = getCoachFeature(options, 'useStateSpace', false);
    if (useStateSpace && trendHistory.length >= 3) {
      try {
        stateSpace = kalmanAbilityTrend(trendHistory, {
          maxScore,
          minScore,
        });
      } catch (err) {
        console.warn('[CoachLogic] State-space/Kalman failed:', err);
        stateSpace = null;
      }
    }

    // Se autorizado, substitui a média exponencial pela habilidade latente do Kalman.
    if (
      stateSpace &&
      getCoachFeature(options, 'useStateSpaceAverage', false)
    ) {
      averageScore = clamp(stateSpace.ability, minScore, maxScore);
    }

    // Se autorizado, substitui a tendência simples pela tendência do Kalman.
    const rawTrend = stateSpace && getCoachFeature(options, 'useStateSpaceTrend', false)
      ? stateSpace.trendPerMonth
      : calculateSlope(trendHistory, maxScore) * 30;

    const limiteSuperior = maxScore - averageScore;
    const limiteInferior = -averageScore;
    const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

    // ✅ PATCH-27: Janela do MC configurável (padrão 10 para volatilidade de curto prazo)
    const MC_WINDOW = Number(cfg.MC_HISTORY_WINDOW) || 10;
    const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, MC_WINDOW), maxScore);

    const baseMssdVolatility = mcHistory.length >= 3
        ? calculateMSSD(mcHistory, maxScore)
        : computeRobustVolatilityForCoach(mcHistory, maxScore);

    // ==================== LOTE 2: VOLATILIDADE DINÂMICA ====================
    let dynamicVolatility = null;
    let mssdVolatility = baseMssdVolatility;

    if (
      getCoachFeature(options, 'useDynamicVolatility', false) &&
      mcHistory.length >= 3
    ) {
      try {
        dynamicVolatility = estimateDynamicVolatility(mcHistory, {
          maxScore,
          minScore,
          useGarch: getCoachFeature(options, 'useGarchVolatility', false),
          override: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
        });

        if (dynamicVolatility && Number.isFinite(dynamicVolatility.volatility)) {
          const dynamicVol = clamp(dynamicVolatility.volatility, 0, maxScore);
          if (getCoachFeature(options, 'useDynamicVolatilityOverride', false)) {
            mssdVolatility = dynamicVol;
          } else {
            // Blend conservador: mantém parte do comportamento antigo.
            mssdVolatility = clamp(
              (dynamicVol * 0.65) + (baseMssdVolatility * 0.35),
              0,
              maxScore
            );
          }
        }
      } catch (err) {
        console.warn('[CoachLogic] Dynamic volatility failed:', err);
        dynamicVolatility = null;
        mssdVolatility = baseMssdVolatility;
      }
    }

    const mcAdaptive = {
        ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
        calibrationBaseline: rollingCalibration.baseline,
        calibrationMaxPenalty: rollingCalibration.maxPenalty
    };

    const adaptiveSimCount = lastNScores.length <= 5
        ? Math.max(cfg.MC_SIMULATIONS, 1200)
        : cfg.MC_SIMULATIONS;

    const DISTANCE_THRESHOLD = 0.15 * maxScore;
    let effectiveMCTarget = targetScore;
    let effectiveMCDays = Number.isFinite(daysToExam)
        ? Math.max(0, Math.min(daysToExam, 90))
        : 90;

    if (targetScore - averageScore > DISTANCE_THRESHOLD) {
        effectiveMCTarget = averageScore + Math.max(mssdVolatility, maxScore * 0.05) + (maxScore * 0.02);
        effectiveMCTarget = Math.min(effectiveMCTarget, targetScore);
        if (Number.isFinite(daysToExam)) {
            const totalGap = Math.max(1, targetScore - averageScore);
            const proximalGap = effectiveMCTarget - averageScore;
            const gapRatio = clamp(proximalGap / totalGap, 0, 1);
            effectiveMCDays = daysToExam > 0
                ? Math.max(1, Math.min(daysToExam, Math.max(7, Math.floor(gapRatio * daysToExam))))
                : 0;
        } else {
            effectiveMCDays = 21;
        }
    }

    const globalProjectedMean = options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)
        ? options.globalMcStats.projectedMean
        : null;

    if (globalProjectedMean != null && globalProjectedMean < effectiveMCTarget && globalProjectedMean > averageScore) {
        const blend = 0.25;
        effectiveMCTarget = effectiveMCTarget * (1 - blend) + globalProjectedMean * blend;
    }

    const effectiveCfg = {
        ...cfg,
        MC_SIMULATIONS: adaptiveSimCount,
        MC_CALIBRATION_NEUTRAL_PCT: globalBaselinePct
    };

    const agilityData = computeAgilityMetrics(safeCategory.simuladoStats?.history || []) || {};
    const agilityPenalty = Number.isFinite(agilityData.agilityPenalty)
      ? agilityData.agilityPenalty
      : 0;
    const avgSeconds = Number.isFinite(agilityData?.avgSeconds)
        ? agilityData.avgSeconds
        : 0;

    const mcResult = runCoachMonteCarlo(
        simuladosWithMaxScore,
        effectiveMCTarget,
        effectiveCfg,
        categoryId,
        maxScore,
        mcAdaptive,
        effectiveMCDays,
        agilityPenalty
    );

    const baseMcProbability = mcResult?.probability ?? null;
    const mcHasData = mcResult != null;

    // ==================== LOTE 3: POSTERIOR PREDICTIVE MONTE CARLO ====================
    let posteriorMc = null;
    let finalMcResult = mcResult;
    let finalMcProbability = baseMcProbability;

    if (
      getCoachFeature(options, 'usePosteriorMonteCarlo', false) &&
      mcResult
    ) {
      try {
        const safeStateSpace = stateSpace ?? null;
        const safeDynamicVolatility = dynamicVolatility ?? null;
        const domain = Math.max(1e-6, maxScore - minScore);
        const fallbackAbilitySd = Math.max(
          domain * 0.02,
          (Number.isFinite(mssdVolatility) ? mssdVolatility : domain * 0.05) /
            Math.sqrt(Math.max(2, (lastNScores || []).length))
        );
        const fallbackTrendPerDay = Number.isFinite(trend)
          ? trend / 30
          : 0;
        const fallbackTrendSd = Math.max(
          domain * 0.0015,
          Math.abs(fallbackTrendPerDay) * 0.35
        );
        const medianGapDays = safeDynamicVolatility?.medianGapDays ?? 7;
        const fallbackDailyVolatility = Number.isFinite(mssdVolatility)
          ? mssdVolatility / Math.sqrt(Math.max(1, medianGapDays))
          : domain * 0.02;

        const posteriorInput = {
          ability: safeStateSpace?.ability ?? averageScore,
          abilitySd: safeStateSpace?.abilitySd ?? fallbackAbilitySd,
          trendPerDay: safeStateSpace?.trendPerDay ?? fallbackTrendPerDay,
          trendSd: safeStateSpace?.trendSd ?? fallbackTrendSd,
          dailyVolatility: safeDynamicVolatility?.dailyVolatility ?? fallbackDailyVolatility,
          horizonDays: effectiveMCDays,
          targetScore: effectiveMCTarget,
          minScore,
          maxScore,
          sampleSize: (lastNScores || []).length,
          baseProbability: baseMcProbability,
        };

        const posteriorSimulations = Math.max(
          300,
          Math.min(
            1500,
            Math.round((adaptiveSimCount || cfg.MC_SIMULATIONS || 800) * 0.75)
          )
        );

        const posteriorSeed = simpleHash(
          [
            categoryId || 'cat',
            (lastNScores || []).length,
            Math.round((Number.isFinite(averageScore) ? averageScore : 0) * 100),
            Math.round((Number.isFinite(effectiveMCTarget) ? effectiveMCTarget : 0) * 100),
            Math.round(Number.isFinite(effectiveMCDays) ? effectiveMCDays : 0),
            Math.round((Number.isFinite(mssdVolatility) ? mssdVolatility : 0) * 100),
            safeStateSpace ? 'ss1' : 'ss0',
            safeDynamicVolatility ? 'dv1' : 'dv0',
          ].join('|')
        );

        posteriorMc = estimatePosteriorPredictive(posteriorInput, {
          simulations: posteriorSimulations,
          seed: posteriorSeed,
          blendWithBase: !getCoachFeature(
            options,
            'usePosteriorMonteCarloOverride',
            false
          ),
        });

        if (posteriorMc && Number.isFinite(posteriorMc.probability)) {
          finalMcProbability = clamp(posteriorMc.probability, 0, 100);
          finalMcResult = {
            ...mcResult,
            probability: finalMcProbability,
            probabilityRaw: Number(
              (posteriorMc.probabilityRaw ?? finalMcProbability).toFixed(4)
            ),
            mean: Number.isFinite(posteriorMc.mean)
              ? posteriorMc.mean
              : mcResult.mean,
            ci95Low: Number.isFinite(posteriorMc.ciLow)
              ? posteriorMc.ciLow
              : mcResult.ci95Low,
            ci95High: Number.isFinite(posteriorMc.ciHigh)
              ? posteriorMc.ciHigh
              : mcResult.ci95High,
            volatility: Number.isFinite(safeDynamicVolatility?.volatility)
              ? clamp(safeDynamicVolatility.volatility, 0, maxScore)
              : mcResult.volatility,
            posteriorPredictive: posteriorMc,
            baseProbability: baseMcProbability,
          };
        }
      } catch (err) {
        console.warn('[CoachLogic] Posterior predictive Monte Carlo failed:', err);
        posteriorMc = null;
        finalMcResult = mcResult;
        finalMcProbability = baseMcProbability;
      }
    }

    return {
        cfg,
        safeCategory,
        categoryId,
        rollingCalibration,
        referenceDate,
        referenceNow,
        maxScore,
        minScore,
        targetScore,
        targetScoreLabel,
        rawWeight,
        boundedWeight,
        weight,
        weightLabel,
        daysToExam,
        relevantSimulados,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        stateSpace,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs: safeStudyLogs,
        categoryStudyLogs,
        validStudyLogs,
        trendHistory,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        baseMssdVolatility,
        dynamicVolatility,
        mcAdaptive,
        effectiveMCTarget,
        effectiveMCDays,
        globalBaselinePct,
        effectiveCfg,
        mcResult: finalMcResult,
        mcProbability: finalMcProbability,
        baseMcResult: mcResult,
        baseMcProbability: baseMcProbability,
        posteriorMc,
        mcHasData,
        globalProjectedMean,
        agilityPenalty,
        avgSeconds
    };
};

export const calculateUrgencyScore = (metrics, options = {}) => {
    const {
        cfg,
        safeCategory,
        boundedWeight,
        daysToExam,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs,
        categoryStudyLogs,
        validStudyLogs,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        mcProbability,
        mcHasData,
        mcResult,
        maxScore,
        globalProjectedMean
    } = metrics;
    const minScore = metrics.minScore ?? 0;
    const targetScore = metrics.targetScore ?? (maxScore * 0.8);
    const domain = Math.max(1e-6, maxScore - minScore);
    const hasData = (simuladosWithMaxScore?.length || 0) > 0 || (categoryStudyLogs?.length || 0) > 0;
    // FIX: agilidade não entra mais no forgetting risk
    const forgetting = computeForgettingRisk(
        simuladosWithMaxScore,
        maxScore,
        averageScore,
        mssdVolatility,
        backtestWeights?.effectiveN || simuladosWithMaxScore.length,
        recencyUnknown ? null : daysSinceLastStudy
    );
    const performanceDeficit = Math.max(0, targetScore - averageScore);
    const gapRange = Math.max(1e-6, targetScore - minScore);
    const gapRatio = clamp(performanceDeficit / gapRange, 0, 1);
    // ✅ FIX: Adicionar validação de retention
    const safeRetention = Number.isFinite(forgetting.retentionPct)
        ? forgetting.retentionPct
        : 100;
    const memoryRisk = !hasData
        ? 8
        : clamp(35 * Math.pow(1 - safeRetention / 100, 1.5), 2, 35);
    const safeMssdVolatility = Number.isFinite(mssdVolatility)
        ? mssdVolatility
        : 0;
    const volatilityRiskPct = clamp((safeMssdVolatility / domain) * 100, 0, 35);
    const weightMultiplier = 1 + ((boundedWeight - 5) / 5) * 0.40;
    const crunchMultiplier = getCrunchMultiplier(
        daysToExam,
        rootActivityDate,
        metrics.referenceDate
    );
    const safeTasksArray = Array.isArray(safeCategory?.tasks)
        ? safeCategory.tasks
        : Object.values(safeCategory?.tasks || {});
    const hasHighPriorityTasks = safeTasksArray.some(t => t && !t.completed && t.priority === 'high');
    const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;
    const totalTasks = safeTasksArray.length;
    const completedTasks = safeTasksArray.filter(t => t?.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1.0;
    const inefficiency = Math.max(0, 1 - completionRate);
    let empiricalTrust = 1.0;
    if (!hasData) {
        const globalSignal = computeAdaptiveCoachWeight(metrics.trendHistory || []);
        empiricalTrust = Math.max(0.2, globalSignal?.confidenceWeight ?? 0.2);
    }
    const inefficiencyPenaltyMultiplier = totalTasks >= 5
        ? 1 + (inefficiency * 0.15 * empiricalTrust)
        : 1.0;
    // SCORE: agora mede distância até a meta, não até 100%
    const scoreComponent = clamp(gapRatio * cfg.SCORE_MAX, 0, cfg.SCORE_MAX);
    // RECENCY: recência desconhecida não é mais máxima
    const effectiveRiskDays = recencyUnknown ? 5 : Math.min(daysSinceLastStudy, 45);
    const recencyFactor = 1 - Math.exp(-effectiveRiskDays / 8);
    const recencyRaw =
        cfg.RECENCY_MAX *
        (memoryRisk / 35) *
        recencyFactor *
        crunchMultiplier *
        (backtestWeights?.recencyWeight ?? 1) *
        inefficiencyPenaltyMultiplier;
    const recencyComponent = clamp(recencyRaw, 0, cfg.RECENCY_MAX * 1.2);
    // INSTABILITY: mais justa, baseada em % do domínio e com filtro de ruído
    const lastNCount = Math.max(2, (lastNScores || []).length || 2);
    const trendNoise = 0.75 * (mssdVolatility / Math.sqrt(lastNCount));
    const trendThreshold = Math.max(getDynamicTrendThreshold(averageScore, maxScore), trendNoise);
    let trendModifier = 1;
    if (trend > trendThreshold) {
        trendModifier = 0.55;
    } else if (trend < -trendThreshold) {
        trendModifier = 1.25;
    }
    const instabilityRaw =
        cfg.INSTABILITY_MAX *
        Math.min(1, volatilityRiskPct / 12) *
        trendModifier *
        (backtestWeights?.instabilityWeight ?? 1);
    const instabilityComponent = clamp(instabilityRaw, 0, cfg.INSTABILITY_MAX);
    // MC BOOST
    let mcUrgencyBoost = 0;
    let mcRiskLabel = null;
    const adaptiveRisk = deriveAdaptiveRiskThresholds(
        lastNScores,
        mssdVolatility,
        cfg,
        maxScore,
        mcResult?.predObsPairs || []
    );
    if (globalProjectedMean != null && globalProjectedMean > (averageScore + maxScore * 0.1)) {
        const haloBoost = Math.min(6, (globalProjectedMean - averageScore) * 0.2);
        adaptiveRisk.danger = Math.min(99, adaptiveRisk.danger + haloBoost);
        adaptiveRisk.safe = Math.min(99, adaptiveRisk.safe + haloBoost);
    }
    if (mcHasData && mcProbability !== null) {
        const continuous = computeContinuousMcBoost(
            mcProbability,
            adaptiveRisk.danger,
            adaptiveRisk.safe,
            mssdVolatility,
            maxScore,
            cfg
        );
        mcUrgencyBoost = continuous.boost;
        mcRiskLabel = continuous.riskLabel;
        const globalProbability = options.globalMcStats && Number.isFinite(options.globalMcStats.probability)
            ? options.globalMcStats.probability
            : null;
        if (globalProbability != null && globalProbability < (mcProbability * 0.8)) {
            mcUrgencyBoost += 4;
            mcRiskLabel = mcRiskLabel || 'elevated_global_risk';
        }
    }
    const mcUrgencyBoostClamped = clamp(
        mcUrgencyBoost,
        cfg.MC_BOOST_SAFE_PENALTY ?? -6,
        25
    );
    // Burnout / hours
    const totalMinutes = (categoryStudyLogs || []).reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalHours = totalMinutes / 60;
    const sortedLogsForBurnout = [...(categoryStudyLogs || [])].sort((a, b) =>
        (normalizeDate(a.date) || new Date(0)).getTime() - (normalizeDate(b.date) || new Date(0)).getTime()
    );
    const rollingWindowMs = 28 * MS_PER_DAY;
    const nowMs = metrics.referenceNow;
    const recentBaselineLogs = sortedLogsForBurnout.filter(log =>
        (nowMs - (normalizeDate(log.date) || new Date(0)).getTime()) <= rollingWindowMs
    );
    const recentBaselineHours = recentBaselineLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    const firstLogTime = sortedLogsForBurnout.length > 0
        ? (normalizeDate(sortedLogsForBurnout[0].date) || new Date(nowMs)).getTime()
        : nowMs;
    const recentSpanDays = recentBaselineLogs.length > 0
        ? Math.max(1, (nowMs - (normalizeDate(recentBaselineLogs[0].date) || new Date(nowMs)).getTime()) / MS_PER_DAY)
        : Math.max(1, (nowMs - firstLogTime) / MS_PER_DAY);
    const activeWeeks = Math.max(1, Math.min(4, recentSpanDays / 7));
    const baselineHoursPerWeek = recentBaselineLogs.length > 0 ? (recentBaselineHours / activeWeeks) : 5.0;
    const dynamicBurnoutThreshold = Math.max(15.0, baselineHoursPerWeek * 1.8);
    // Balance bridge boost
    const allCategoriesSafe = options.allCategories || [];
    const activeCount = allCategoriesSafe.length > 0 ? allCategoriesSafe.length : 1;
    // ✅ PATCH-11 & 29: Validação explícita de decayK
    const rawLambda = metrics.mcAdaptive?.decayK;
    const currentLambda = (Number.isFinite(rawLambda) && rawLambda > 1e-6) ? rawLambda : 0.03;
    const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));
    const windowStart = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (dynamicWindowDays * MS_PER_DAY);
    const safeGlobalLogsInput = options.studyLogs || studyLogs || [];
    const safeGlobalLogs = Array.isArray(safeGlobalLogsInput)
        ? safeGlobalLogsInput
        : Object.values(safeGlobalLogsInput || {});
    const recentAllLogs = safeGlobalLogs.filter(log =>
        (normalizeDate(log?.date) || new Date(0)).getTime() >= windowStart
    );
    const totalRecentMinutesAll = recentAllLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalRecentMinutesCat = recentAllLogs
        .filter(log => log?.categoryId === metrics.categoryId)
        .reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const observedShare = totalRecentMinutesAll > 0
        ? totalRecentMinutesCat / totalRecentMinutesAll
        : (1 / activeCount);
    const totalSyllabusWeight = allCategoriesSafe.reduce((acc, c) => {
        if (!c) return acc;
        let rawW = c.weight;
        if (typeof rawW === 'string') rawW = rawW.replace(/\./g, '').replace(',', '.');
        const parsedW = Number(rawW);
        const w = (c.weight !== undefined && Number.isFinite(parsedW) && parsedW > 0) ? parsedW : 5;
        return acc + w;
    }, 0);
    const idealShare = totalSyllabusWeight > 0
        ? metrics.rawWeight / totalSyllabusWeight
        : (1 / activeCount);
    const tolerance = 0.05;
    const underAllocation = Math.max(0, idealShare - observedShare - tolerance);
    const balanceBridgeBoost = clamp(
        Math.min(cfg.EFFICIENCY_MAX, Math.pow(underAllocation * 10, 1.5)),
        0,
        cfg.EFFICIENCY_MAX
    );
    // SRS
    let srsBoost = 0;
    let srsLabel = null;
    if (hasData && !recencyUnknown) {
        const srsData = _getSRSBoost(
            simuladosWithMaxScore,
            daysSinceLastStudy,
            maxScore,
            cfg,
            mssdVolatility,
            backtestWeights?.effectiveN || simuladosWithMaxScore.length
        );
        srsBoost = srsData.boost;
        srsLabel = srsData.label;
    }
    const maxSrsBoost = cfg.SRS_BOOST * 2;
    const currentSrsBoost = clamp(
        srsBoost * (crunchMultiplier > 1 ? 1.10 : 1),
        0,
        maxSrsBoost
    );
    const currentPriorityBoost = clamp(
        priorityBoost * (crunchMultiplier > 1 ? 1.15 : 1),
        0,
        cfg.PRIORITY_BOOST
    );
    // Rotation penalty corrigida: menos dependente da nota e mais dependente de recência/volatilidade
    let exactLastTime = 0;
    if (simuladosWithMaxScore.length > 0) {
        exactLastTime = (normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0)).getTime();
    }
    if (validStudyLogs.length > 0) {
        const logsOrdenados = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );
        const logTime = (normalizeDate(logsOrdenados[0].date) || new Date(0)).getTime();
        if (logTime > exactLastTime) exactLastTime = logTime;
    }
    const exactHoursSinceLast = exactLastTime > 0
        ? (nowMs - exactLastTime) / (1000 * 60 * 60)
        : 48;
    let rotationPenalty = 0;
    // FIX: Removido fatigueRatio baseado em performance.
    // Notas altas já recebem urgência menor via SCORE_MAX (gap da meta).
    // Penalizar novamente aqui causava dupla penalização.
    if (exactHoursSinceLast < 24) {
        const recentFatigue = Math.max(0.2, Math.exp(-exactHoursSinceLast / 12));
        rotationPenalty = Math.min(30, 15 * recentFatigue * (1 + (mssdVolatility / maxScore)));
        const baseAt24 = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
        rotationPenalty = Math.max(rotationPenalty, baseAt24 + 1);
    } else if (exactHoursSinceLast >= 24 && exactHoursSinceLast < 48 && !srsLabel) {
        rotationPenalty = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
    }
    if (srsBoost > 0) rotationPenalty *= 0.1;
    const rawScore = Math.max(
        0,
        scoreComponent +
        recencyComponent +
        instabilityComponent +
        currentPriorityBoost +
        currentSrsBoost +
        mcUrgencyBoostClamped +
        balanceBridgeBoost -
        rotationPenalty
    );
    const weightedRaw = rawScore * weightMultiplier;
    const NORMALIZATION_CEILING = cfg.NORMALIZATION_CEILING || 170;
    const CRITICAL_THRESHOLD = cfg.CRITICAL_THRESHOLD || Math.round(NORMALIZATION_CEILING * 0.72);
    let normalized;
    if (weightedRaw <= 0) {
        normalized = 0;
    } else if (weightedRaw <= CRITICAL_THRESHOLD) {
        normalized = (weightedRaw / CRITICAL_THRESHOLD) * 80;
    } else {
        const excess = weightedRaw - CRITICAL_THRESHOLD;
        const excessNormalized = 20 * (1 - Math.exp(-excess / (NORMALIZATION_CEILING * 0.4)));
        normalized = 80 + excessNormalized;
    }
    normalized = Number.isFinite(normalized) ? clamp(Math.round(normalized), 0, 100) : 0;
    return {
        weightedRaw,
        normalized,
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost: currentPriorityBoost,
        srsBoost: currentSrsBoost,
        mcUrgencyBoost: mcUrgencyBoostClamped,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        forgetting,
        performanceDeficit,
        memoryRisk,
        volatilityRisk: volatilityRiskPct,
        totalPain: performanceDeficit + memoryRisk + volatilityRiskPct,
        dynamicScoreMax: cfg.SCORE_MAX,
        dynamicRecencyMax: cfg.RECENCY_MAX,
        dynamicInstabilityMax: cfg.INSTABILITY_MAX,
        completionRate,
        inefficiencyPenaltyMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        observedShare,
        idealShare,
        srsLabel,
        exactHoursSinceLast,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        trendThreshold
    };
};

export const generateCoachStrings = (weightedRaw, normalized, metrics, scoreInfo, options = {}) => {
    const {
        cfg,
        maxScore,
        targetScore,
        weight,
        weightLabel,
        relevantSimulados,
        averageScore,
        daysSinceLastStudy,
        categoryStudyLogs,
        trend,
        mssdVolatility,
        effectiveMCTarget,
        effectiveMCDays,
        mcResult,
        mcProbability,
        mcHasData,
        globalProjectedMean,
        agilityPenalty
    } = metrics;
    const {
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost,
        srsBoost,
        mcUrgencyBoost,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        srsLabel,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        completionRate,
        trendThreshold: scoreInfoTrendThreshold
    } = scoreInfo;
    let recommendation = "";
    const oneWeekAgo = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (7 * 24 * 60 * 60 * 1000);
    const recentLogs = categoryStudyLogs.filter(log => {
        const d = normalizeDate(log.date) || new Date(0);
        return d && d.getTime() >= oneWeekAgo;
    });
    const recentHours = recentLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    // FIX: contar dias reais, não timestamps únicos
    const recentStudyDays = new Set(
        recentLogs.map(log => getDateKey(log.date)).filter(Boolean)
    ).size;
    const isHighVolume = recentHours > dynamicBurnoutThreshold;
    const isHighFrequency = recentStudyDays >= 5;
    const isEliteMaintenance = averageScore >= (maxScore * 0.95);
    const trendThreshold = Number.isFinite(scoreInfoTrendThreshold)
        ? scoreInfoTrendThreshold
        : getDynamicTrendThreshold(averageScore, maxScore);
    const lastNScores = metrics.lastNScores;
    const isStagnant = !isEliteMaintenance && trend <= trendThreshold && lastNScores.length >= 2;
    const burnoutMsg = isHighVolume && isStagnant
        ? `Você estudou ${recentHours.toFixed(1)}h esta semana (seu normal é ~${baselineHoursPerWeek.toFixed(1)}h), mas a nota estagnou.`
        : '';
    const isBurnoutRisk = (isHighVolume || (isHighFrequency && recentHours > 5.0)) && isStagnant && recentStudyDays >= 3;
    // Ordem corrigida: crítico > burnout > SRS > cruzeiro seguro
    if (mcHasData && mcRiskLabel === 'critical') {
        const burnoutNote = isBurnoutRisk ? ` (⚠️ ${burnoutMsg || 'Sinais de estafa — mude o método.'})` : '';
        const targetInfo = effectiveMCTarget < targetScore ? ` (Meta ZDP: ${formatValue(effectiveMCTarget)})` : '';
        const globalNote = globalProjectedMean != null ? ` [Global: ${formatPercent(globalProjectedMean)}]` : '';
        recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${targetInfo}${globalNote}${burnoutNote}`;
    } else if (isBurnoutRisk) {
        recommendation = `🛑 Risco de Estafa: ${burnoutMsg || 'Você estudou muito mas a nota não reagiu.'} Considere descansar.`;
    } else if (srsBoost > 0) {
        recommendation = `${srsLabel} - Não pule essa revisão!`;
    } else if (mcHasData && mcRiskLabel === 'safe') {
        recommendation = `🏆 Cruzeiro Seguro (${formatPercent(mcProbability)} nas projeções). Modo de manutenção ativado.`;
    } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && trend > 0) {
        recommendation = "Desempenho Oscilante: Foque em preencher lacunas de base";
    } else if (trend < -trendThreshold) {
        recommendation = `Nota caindo (${formatValue(trend)} pts) - Atenção urgente`;
    } else if (averageScore < targetScore - (0.2 * maxScore)) {
        recommendation = `Nota Crítica: ${formatPercent((averageScore / maxScore) * 100)} (Meta ${formatPercent((targetScore / maxScore) * 100)})`;
    } else if (averageScore >= targetScore) {
        recommendation = "No caminho certo! Continue consolidando";
    } else {
        recommendation = "Pratique com regularidade";
    }
    const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;
    const result = {
        score: weightedRaw,
        normalizedScore: normalized,
        recommendation,
        details: {
            averageScore: safeFixedNumber(averageScore),
            globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
            daysSinceLastStudy,
            standardDeviation: safeFixedNumber(mssdVolatility),
            mssdVolatility: safeFixedNumber(mssdVolatility),
            posteriorMonteCarlo: metrics.posteriorMc
              ? {
                  model: metrics.posteriorMc.model || null,
                  probability: safeFixedNumber(metrics.posteriorMc.probability),
                  probabilityRaw: safeFixedNumber(metrics.posteriorMc.probabilityRaw),
                  mean: safeFixedNumber(metrics.posteriorMc.mean),
                  ciLow: safeFixedNumber(metrics.posteriorMc.ciLow),
                  ciHigh: safeFixedNumber(metrics.posteriorMc.ciHigh),
                  horizonDays: safeFixedNumber(metrics.posteriorMc.horizonDays),
                  simulations: metrics.posteriorMc.simulations ?? null,
                  sampleTrust: safeFixedNumber(metrics.posteriorMc.sampleTrust, 4),
                  diagnostics: metrics.posteriorMc.diagnostics || null,
                  inputs: metrics.posteriorMc.inputs || null,
                }
              : null,
            dynamicVolatility: metrics.dynamicVolatility && Number.isFinite(metrics.dynamicVolatility.volatility)
              ? {
                  model: metrics.dynamicVolatility.model || null,
                  volatility: safeFixedNumber(metrics.dynamicVolatility.volatility),
                  modelVolatility: safeFixedNumber(metrics.dynamicVolatility.modelVolatility),
                  fallbackVolatility: safeFixedNumber(metrics.dynamicVolatility.fallbackVolatility),
                  dailyVolatility: safeFixedNumber(metrics.dynamicVolatility.dailyVolatility),
                  horizonDays: safeFixedNumber(metrics.dynamicVolatility.horizonDays),
                  medianGapDays: safeFixedNumber(metrics.dynamicVolatility.medianGapDays),
                  sampleSize: metrics.dynamicVolatility.sampleSize ?? null,
                  parameters: metrics.dynamicVolatility.parameters || null
                }
              : null,
            trend: safeFixedNumber(trend),
            totalHours: safeFixedNumber(totalHours),
            hasData,
            hasSimulados: relevantSimulados.length > 0,
            hasHighPriorityTasks,
            completionRate: safeFixedNumber(completionRate * 100, 1),
            balanceBridgeBoost: safeFixedNumber(balanceBridgeBoost),
            weight,
            srsLabel,
            isBurnoutRisk,
            crunchMultiplier: safeFixedNumber(crunchMultiplier),
            agilityPenalty: safeFixedNumber(agilityPenalty, 4),
            avgSeconds: metrics.avgSeconds || 0,
            monteCarlo: mcHasData ? {
                probability: safeFixedNumber(mcProbability),
                probabilityRaw: mcProbability,
                thresholds: {
                    danger: safeFixedNumber(adaptiveRisk?.danger),
                    safe: safeFixedNumber(adaptiveRisk?.safe)
                },
                riskLabel: mcRiskLabel,
                volatility: safeFixedNumber(mcResult?.volatility),
                meanProjected: safeFixedNumber(mcResult?.mean),
                effectiveMCTarget: safeFixedNumber(effectiveMCTarget),
                effectiveMCDays: Number.isFinite(Number(effectiveMCDays)) ? Number(effectiveMCDays) : 0,
                globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
                diagnostics: mcResult?.diagnostics || null,
                ci95Low: safeFixedNumber(mcResult?.ci95Low),
                ci95High: safeFixedNumber(mcResult?.ci95High),
                urgencyBoost: safeFixedNumber(mcUrgencyBoost),
                calibrationPenalty: safeFixedNumber(mcResult?.calibrationPenalty, 4),
                avgBrier: safeFixedNumber(mcResult?.avgBrier, 4),
                ece: safeFixedNumber(mcResult?.ece, 4),
                reliability: Array.isArray(mcResult?.reliability) ? mcResult.reliability : [],
                explainability: {
                    confidenceAdjusted: (mcResult?.calibrationPenalty || 0) > 0,
                    confidenceAdjustmentPct: safeFixedNumber((mcResult?.calibrationPenalty || 0) * 100),
                    calibrationQuality: (mcResult?.avgBrier || 0) <= cfg.MC_CALIBRATION_BRIER_BASELINE
                        ? 'good'
                        : (mcResult?.avgBrier || 0) <= (cfg.MC_CALIBRATION_BRIER_BASELINE + 0.07) ? 'moderate' : 'low',
                    note: (mcResult?.calibrationPenalty || 0) > 0
                        ? 'Probabilidade ajustada para reduzir overconfidence após backtest interno.'
                        : 'Sem ajuste de calibração significativo.'
                }
            } : null,
            backtest: {
                rankQuality: safeFixedNumber(metrics.backtestWeights?.rankQuality, 4),
                uplift: safeFixedNumber(metrics.backtestWeights?.uplift, 4),
                scoreWeight: safeFixedNumber(metrics.backtestWeights?.scoreWeight, 3),
                recencyWeight: safeFixedNumber(metrics.backtestWeights?.recencyWeight, 3),
                instabilityWeight: safeFixedNumber(metrics.backtestWeights?.instabilityWeight, 3)
            },
            humanReadable: {
                "Média": formatPercent((averageScore / maxScore) * 100),
                "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                "Probabilidade (MC)": mcHasData ? formatPercent(mcProbability) : "Dados insuf.",
                "Contexto Global MC": globalProjectedMean != null ? formatPercent(globalProjectedMean) : null,
                "Peso da Matéria": weightLabel,
                "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
            },
            components: {
                scoreComponent: Number((scoreComponent * weightMultiplier).toFixed(2)),
                recencyComponent: Number((recencyComponent * weightMultiplier).toFixed(2)),
                instabilityComponent: Number((instabilityComponent * weightMultiplier).toFixed(2)),
                priorityBoost: Number((priorityBoost * weightMultiplier).toFixed(2)),
                srsBoost: Number((srsBoost * weightMultiplier).toFixed(2)),
                rotationPenalty: Number((rotationPenalty * weightMultiplier).toFixed(2)),
                mcUrgencyBoost: Number((mcUrgencyBoost * weightMultiplier).toFixed(2)),
                balanceBridgeBoost: Number((balanceBridgeBoost * weightMultiplier).toFixed(2)),
            }
        }
    };
    // FIX: try/catch para o callback de calibração nunca quebrar o fluxo
    if (result.details?.monteCarlo && typeof options.onCalibrationMetric === 'function') {
        try {
            options.onCalibrationMetric({
                categoryId: metrics.categoryId || null,
                categoryName: metrics.safeCategory?.name || metrics.categoryName || 'Disciplina',
                timestamp: Date.now(),
                avgBrier: result.details.monteCarlo.avgBrier,
                ece: result.details.monteCarlo.ece,
                calibrationPenalty: result.details.monteCarlo.calibrationPenalty,
                reliability: result.details.monteCarlo.reliability || [],
                calibrationQuality: result.details.monteCarlo.explainability?.calibrationQuality || 'low'
            });
        } catch { /* não quebrar o fluxo principal */ }
    }
    return result;
};

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    try {
        const safeCat = category || {};
        const catId = safeCat.id || safeCat.name || 'unknown';
        const safeSims = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
        const safeLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});
        const safeTasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});
        const simCount = safeSims.length;
        const logCount = safeLogs.length;
        const todayStr = getDateKey(new Date());
        const simsForChecksum = [...safeSims].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });
        const scoreChecksum = simsForChecksum.reduce((acc, s, index) => {
            if (!s) return acc;
            const parsed = getSafeScore(s, options.maxScore || 100);
            const validVal = Number.isNaN(parsed) ? 0 : parsed;
            return acc + (validVal * (index + 1) * 1.17);
        }, 0).toFixed(2);
        const optKey = (options && options.daysToExam !== undefined) ? `_dte${options.daysToExam}` : '';
        const targetKey = `_ts${options?.targetScore ?? 'def'}_ms${options?.maxScore ?? 100}`;
        const logsForChecksum = [...safeLogs].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });
        const lastSim = simsForChecksum.length > 0
            ? (simsForChecksum[simsForChecksum.length - 1]?.date || simsForChecksum[simsForChecksum.length - 1]?.createdAt || '')
            : '';
        const lastLog = logsForChecksum.length > 0
            ? (logsForChecksum[logsForChecksum.length - 1]?.date || logsForChecksum[logsForChecksum.length - 1]?.createdAt || '')
            : '';
        const tasksHash = safeTasks.reduce((acc, t) => acc + (t?.completed ? 0 : 1) + (t?.priority === 'high' ? 5 : 0), 0);
        const activeId = useAppStore.getState()?.appState?.activeId || 'default';
        const weightsHash = simpleHash(
            (options.allCategories || [])
                .map(c => `${c?.id || c?.name || '?'}:${c?.weight ?? ''}`)
                .join('|')
        );
        const globalHash = options.globalMcStats
            ? simpleHash(
                `${Number(options.globalMcStats.projectedMean || 0).toFixed(1)}:${Number(options.globalMcStats.probability || 0).toFixed(1)}:${Number(options.globalMcStats.currentMean || 0).toFixed(1)}`
            )
            : 'noglobal';
        const calibrationHash = (options.calibrationHistoryByCategory?.[getCalibrationKey(catId)] || []).length;
        const goalKey = options?.user?.goalDate
            ? `_gd${getDateKey(options.user.goalDate) || String(options.user.goalDate)}`
            : '';
        const featuresHash = simpleHash(JSON.stringify({
            uss: getCoachFeature(options, 'useStateSpace', false),
            ussa: getCoachFeature(options, 'useStateSpaceAverage', false),
            usst: getCoachFeature(options, 'useStateSpaceTrend', false),
            udv: getCoachFeature(options, 'useDynamicVolatility', false),
            ugv: getCoachFeature(options, 'useGarchVolatility', false),
            udvo: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
            ppm: getCoachFeature(options, 'usePosteriorMonteCarlo', false),
            ppmo: getCoachFeature(options, 'usePosteriorMonteCarloOverride', false),
            bt: getCoachFeature(options, 'useBayesianTopics', false),
            btu: getCoachFeature(options, 'useBayesianTopicsForUrgency', false),
            du: getCoachFeature(options, 'useDecisionUtility', false),
            dut: getCoachFeature(options, 'useDecisionUtilityForTopics', false),
            dubt: getCoachFeature(options, 'useDecisionUtilityForBestTask', false),
            bp: getCoachFeature(options, 'useBanditPlanner', false),
            llm: getCoachFeature(options, 'useLLMExplanations', false),
            kg: getCoachFeature(options, 'useKnowledgeGraph', false),
            kgt: getCoachFeature(options, 'useKnowledgeGraphForTopics', false),
            afsrs: getCoachFeature(options, 'useAdvancedFsrs', false),
            fsrsb: getCoachFeature(options, 'useFsrsForSrsBoost', false),
            fsrst: getCoachFeature(options, 'useFsrsTopicScheduling', false),
            eval: getCoachFeature(options, 'useEvaluationTelemetry', false),
            obs: getCoachFeature(options, 'useObservability', false),
            drift: getCoachFeature(options, 'useDriftGuard', false),
            health: getCoachFeature(options, 'useModelHealthTelemetry', false),
            driftAlerts: getCoachFeature(options, 'useDriftAlerts', false),
        }));
        // ✅ PATCH-13: Incluir hash da config customizada no cache key
        const configHash = options.config
            ? simpleHash(JSON.stringify(options.config))
            : 'defcfg';
        // FIX (BUG-13): cache key compacta via hashString64 (evita chave de 400+ chars e colisões)
        const cacheKeyRaw = [
            activeId, catId, simCount, logCount, scoreChecksum,
            todayStr, optKey, targetKey, lastSim, lastLog,
            tasksHash, weightsHash, globalHash, calibrationHash,
            goalKey, featuresHash, configHash,
            options.maxScore ?? 100, options.targetScore ?? 0
        ].join('|');
        const cacheKey = `urg_${hashString64(cacheKeyRaw)}`;
        const cachedUrgency = cacheGet(_urgencyCache, cacheKey);
        if (cachedUrgency) {
            // FIX (BUG-14): deepClone robusto (preserva Date/Map/Set/undefined)
            return deepClone(cachedUrgency);
        }
        const metrics = extractMetrics(safeCat, safeSims, safeLogs, options);
        const scoreInfo = calculateUrgencyScore(metrics, options);
        const result = generateCoachStrings(scoreInfo.weightedRaw, scoreInfo.normalized, metrics, scoreInfo, options);
        // ==================== LOTE 8: EVALUATION SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useEvaluationTelemetry', false) &&
          typeof options.onCoachEvaluationSnapshot === 'function'
        ) {
          try {
            options.onCoachEvaluationSnapshot({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: result.details?.monteCarlo?.probability ?? null,
              predictedMean:
                result.details?.monteCarlo?.meanProjected ??
                result.details?.averageScore ??
                null,
              targetScore: metrics.targetScore,
              maxScore: metrics.maxScore,
              strategyId: options.strategyId || null,
            });
          } catch {
            // ignore evaluation errors
          }
        }
        // ==================== LOTE 9: OBSERVABILITY SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useObservability', false) &&
          typeof options.onCoachObservability === 'function'
        ) {
          try {
            const mcDetails = result.details?.monteCarlo || null;
            options.onCoachObservability({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: mcDetails?.probability ?? null,
              probabilityRaw: mcDetails?.probabilityRaw ?? null,
              avgBrier: mcDetails?.avgBrier ?? null,
              ece: mcDetails?.ece ?? null,
              calibrationPenalty: mcDetails?.calibrationPenalty ?? null,
              volatility: mcDetails?.volatility ?? result.details?.mssdVolatility ?? null,
              sampleSize: mcDetails?.sampleSize ?? null,
              reliability: Array.isArray(mcDetails?.reliability)
                ? mcDetails.reliability
                : [],
            });
          } catch {
            // observability must never break the Coach
          }
        }
        if (typeof options.logger === 'function') {
            try {
                options.logger({ categoryId: metrics.categoryId, name: metrics.safeCategory?.name, urgency: result });
            } catch {
                // ignore
            }
        }
        cacheSet(_urgencyCache, URGENCY_CACHE_MAX, cacheKey, result);
        return result;
    } catch (err) {
        console.error("[CoachLogic] Critical error in calculateUrgency:", err);
        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo: " + err.message,
            details: {
                hasData: false,
                daysSinceLastStudy: 0,
                error: err.message,
                humanReadable: { "Status": "Erro" }
            }
        };
    }
};

export function analisarDesempenhoHistorico(historico) {
    if (!historico || historico.length === 0) {
        return {
            tendencia: 'neutra',
            confiabilidadeDosDados: 'insuficiente',
            projecaoRetencao: 0
        };
    }
    const formattedHistory = historico.map((h, i) => {
        if (!h) return { score: 0, total: 100, date: new Date().toISOString() };
        let rawDias = h.diasRevisao;
        if (typeof rawDias === 'string') rawDias = rawDias.replace(',', '.');
        const diasValidos = (rawDias === null || rawDias === undefined || rawDias === '')
            ? i
            : (Number.isFinite(Number(rawDias)) ? Number(rawDias) : i);
        const timestamp = Date.now() - (diasValidos * 86400000);
        const safeDate = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
        const total = Math.max(1, Number(h.total) || 100);
        const acertos = Math.max(0, Number(h.acertos) || 0);
        return {
            score: (acertos / total) * 100,
            total: total,
            date: safeDate.toISOString()
        };
    });
    const risk = computeForgettingRisk(formattedHistory);
    // ✅ PATCH-33: Validar retentionPct contra NaN
    const safeRetention = Number.isFinite(risk.retentionPct) ? risk.retentionPct : 0;
    return {
        tendencia: safeRetention > 80 ? 'alta' : (safeRetention > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: safeRetention
    };
}

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || categories.length === 0) return null;
    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });
    const top = ranked[0];
    if (!top) return null;
    const maxScore = options.maxScore ?? 100;
    // FIX (BUG-14): deepClone robusto do urgency para evitar mutação do cache
    const clonedUrgency = top.urgency ? deepClone(top.urgency) : null;
    const result = {
        ...top,
        urgency: clonedUrgency,
        weakestTopic: getWeakestTopic(top, simulados, maxScore)
    };
    if (options.flashcardDue > 0) {
        result.flashcardDue = options.flashcardDue;
        result.srsRecommendation = `Revisar ${options.flashcardDue} flashcards hoje para reforçar retenção e consistência.`;
        if (result.urgency) {
            result.urgency.srsDue = options.flashcardDue;
        }
    }
    if (options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)) {
        const globalMean = Number(options.globalMcStats.projectedMean);
        if (result.urgency && result.urgency.details) {
            result.urgency.details.globalMcContext = {
                projectedMean: Number(globalMean.toFixed(1)),
                volatility: options.globalMcStats.sd ? Number(options.globalMcStats.sd.toFixed(2)) : null,
                source: 'global from useMonteCarloStats (Coach integration)'
            };
        }
        result.globalProjectedMean = Number(globalMean.toFixed(1));
        result.mcIntegrationSource = 'globalMcStats';
    }
    return result;
};

function _buildSortedTopics(category, simulados = [], maxScore = 100) {
    const safeCat = category || {};
    const catId = safeCat.id || safeCat.name || 'unknown';
    const safeTasks = Array.isArray(safeCat.tasks)
        ? safeCat.tasks
        : Object.values(safeCat.tasks || {});
    const openTasks = safeTasks.filter(t => t && !t.completed).length;
    const safeSims = Array.isArray(simulados)
        ? simulados
        : Object.values(simulados || {});
    let lastSimTimestamp = 0;
    let historyVolume = 0;
    if (safeSims.length > 0) {
        const lastSim = safeSims.reduce((latest, current) => {
            if (!latest) return current;
            if (!current) return latest;
            const latestTime = (normalizeDate(latest.date || latest.createdAt) || new Date(0)).getTime();
            const currTime = (normalizeDate(current.date || current.createdAt) || new Date(0)).getTime();
            return currTime > latestTime ? current : latest;
        }, safeSims[0]);
        if (lastSim) {
            lastSimTimestamp = (normalizeDate(lastSim.date || lastSim.createdAt) || new Date(0)).getTime();
        }
        historyVolume = safeSims.length;
    }
    const scoreChecksum = safeSims.reduce((acc, s, index) => {
        if (!s) return acc;
        const parsed = getSafeScore(s, maxScore);
        const validVal = Number.isNaN(parsed) ? 0 : parsed;
        return acc + (validVal * (index + 1) * 1.17);
    }, 0);
    const tasksHash = safeTasks.reduce((acc, t) => acc + ((t?.id || t?.text || '').length), 0);
    const historyLen = (safeCat.simuladoStats && safeCat.simuladoStats.history)
        ? (Array.isArray(safeCat.simuladoStats.history) ? safeCat.simuladoStats.history.length : Object.keys(safeCat.simuladoStats.history).length)
        : 0;
    const todayStr = getDateKey(new Date());
    const userId = safeCat?.userId || safeSims[0]?.userId || 'default';
    const coachFeatureHash = simpleHash(JSON.stringify({
        bt: getCoachFeature(null, 'useBayesianTopics', false),
        btu: getCoachFeature(null, 'useBayesianTopicsForUrgency', false),
        du: getCoachFeature(null, 'useDecisionUtility', false),
        dut: getCoachFeature(null, 'useDecisionUtilityForTopics', false),
        dubt: getCoachFeature(null, 'useDecisionUtilityForBestTask', false),
        bp: getCoachFeature(null, 'useBanditPlanner', false),
        kg: getCoachFeature(null, 'useKnowledgeGraph', false),
        kgt: getCoachFeature(null, 'useKnowledgeGraphForTopics', false),
        afsrs: getCoachFeature(null, 'useAdvancedFsrs', false),
        fsrsb: getCoachFeature(null, 'useFsrsForSrsBoost', false),
        fsrst: getCoachFeature(null, 'useFsrsTopicScheduling', false),
    }));
    const hash = `${userId}-${lastSimTimestamp}-${openTasks}-${tasksHash}-${historyLen}-${maxScore}-${historyVolume}-${scoreChecksum.toFixed(1)}-${todayStr}-${coachFeatureHash}`;
    const cacheKey = `isolate_${catId}_${hash}`;
    const cachedTopics = cacheGet(_topicsCache, cacheKey);
    if (cachedTopics) return deepClone(cachedTopics);
    const result = _buildSortedTopicsImpl(safeCat, safeSims, maxScore);
    cacheSet(_topicsCache, TOPICS_CACHE_MAX, cacheKey, result);
    return deepClone(result);
}

const _buildSortedTopicsImpl = (category, _simulados = [], maxScore = 100) => {
    const safeCat = category || {};
    const tasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});
    const topicMap = {};
    const history = safeArray(safeCat.simuladoStats?.history);
    const todayForTopics = new Date();
    const sortedTopicsHistory = [...history].sort((a, b) => {
        const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
        const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
        return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
    });
    sortedTopicsHistory.forEach(entry => {
        if (!entry) return;
        let entryTime = todayForTopics.getTime();
        if (entry.date || entry.createdAt) {
            entryTime = (normalizeDate(entry.date || entry.createdAt) || new Date(0)).getTime();
        }
        const safeEntryTime = Number.isFinite(entryTime) && entryTime > 0 ? entryTime : todayForTopics.getTime();
        const entryDate = normalizeDate(safeEntryTime) || new Date(safeEntryTime);
        const daysOld = Math.max(0, (todayForTopics.getTime() - safeEntryTime) / (1000 * 60 * 60 * 24));
        const timeWeight = Math.max(0.01, Math.exp(-0.015 * daysOld));
        const topics = entry.topics || [];
        topics.forEach(t => {
            if (!t) return;
            let rawName = t.name;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";
            const name = rawName.trim();
            if (!topicMap[name]) {
                topicMap[name] = {
                    total: 0,
                    correct: 0,
                    lastSeen: new Date(0),
                    completed: true,
                    hasTasks: false,
                    scores: []
                };
                topicMap[name].hasUnfinishedTask = false;
            }
            let rawTotal = Number(t.total);
            let topicTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;
            let topicCorrect = 0;
            const isTotalMissing = t.total === undefined || t.total === null || String(t.total).trim() === "" || Number(t.total) === 0;
            if (t.score != null && isTotalMissing) {
                topicTotal = getSyntheticTotal(maxScore);
                topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
            } else if (topicTotal > 0) {
                if (t.correct !== undefined && t.correct !== null && !t.isPercentage) {
                    const rawC = sanitizeNum(t.correct);
                    topicCorrect = Math.min(topicTotal, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
                }
            } else {
                return;
            }
            if (Number.isNaN(topicCorrect)) return;
            topicCorrect = Math.max(0, topicCorrect);
            topicMap[name].total += (topicTotal * timeWeight);
            topicMap[name].correct += (topicCorrect * timeWeight);
            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
                    total: topicTotal,
                    date: entryDate.toISOString(),
                    // ✅ FIX (BUG-H05): Preservar maxScore no payload para FSRS
                    maxScore: maxScore
                });
                // ✅ PATCH-28: Limitar crescimento do array interno
                if (topicMap[name].scores.length > 20) {
                    topicMap[name].scores = topicMap[name].scores.slice(-10);
                }
            }
            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });
    tasks.forEach(task => {
        const name = String(task.text || task.title || "").trim();
        if (!name) return;
        if (!topicMap[name]) {
            topicMap[name] = {
                total: 0,
                correct: 0,
                lastSeen: new Date(0),
                completed: !!task.completed,
                hasTasks: true,
                scores: []
            };
            topicMap[name].hasUnfinishedTask = !task.completed;
        } else {
            topicMap[name].hasTasks = true;
            if (topicMap[name].hasUnfinishedTask === undefined) {
                topicMap[name].hasUnfinishedTask = !task.completed;
            } else if (!task.completed) {
                topicMap[name].hasUnfinishedTask = true;
            }
            topicMap[name].completed = !topicMap[name].hasUnfinishedTask;
        }
        let newTaskPriority = 0;
        if (task.priority === 'high') newTaskPriority = 40;
        else if (task.priority === 'medium') newTaskPriority = 20;
        if (!task.completed) {
            topicMap[name].manualPriority = Math.max(topicMap[name].manualPriority || 0, newTaskPriority);
        }
    });
    const today = new Date();
    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateSlope(topicHistory, 100) * 30 : 0;
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 30;
        } else {
            daysSince = getDaysDiff(today, data.lastSeen);
        }
        const priorityBoost = data.manualPriority || 0;
        const perfComponent = Math.max(0, Math.min(1, (100 - percentage) / 100));
        const recencyComponent_topic = Math.max(0, Math.min(1, daysSince / 60));
        const priorityComponent = Math.max(0, Math.min(1, priorityBoost / 40));
        const perfRatio = percentage / 100;
        const TOPIC_W_PERF = 0.70 - (0.40 * perfRatio);
        const TOPIC_W_RECENCY = 0.10 + (0.40 * perfRatio);
        const TOPIC_W_PRIORITY = 0.20;
        let urgencyScore = (
            perfComponent * TOPIC_W_PERF +
            recencyComponent_topic * TOPIC_W_RECENCY +
            priorityComponent * TOPIC_W_PRIORITY
        ) * 200;
        // FIX: tópicos não testados pesam menos do que tópicos já aferidos
        if (data.total === 0) {
            urgencyScore *= 0.45;
        }
        const topicDropThreshold = -2.0;
        if (trend < topicDropThreshold) {
            const dropSeverity = Math.min(2.0, 1 + Math.abs(trend / topicDropThreshold) * 0.1);
            urgencyScore *= dropSeverity;
        }
        return {
            name,
            total: data.total,
            percentage,
            daysSince,
            trend: Number(trend.toFixed(2)),
            priorityBoost,
            urgencyScore,
            isUntested: data.total === 0,
            manualPriority: data.manualPriority || 0,
            completed: data.completed,
            hasTasks: !!data.hasTasks,
            scores: data.scores.slice(-8),
            lastSeen: data.lastSeen
        };
    });
    // ==================== LOTE 4: BAYESIAN TOPICS ====================
    let bayesianTopicMap = null;
    if (getCoachFeature(null, 'useBayesianTopics', false)) {
      try {
        const bayesianInput = topics.map(topic => ({
          name: topic.name,
          total: topic.total,
          percentage: topic.percentage,
          correct: topic.total > 0 ? (topic.percentage / 100) * topic.total : 0,
          trend: topic.trend,
          isUntested: topic.isUntested
        }));
        const bayesianResult = estimateTopicProficiencies(bayesianInput, {
          untestedPriorMean: 0.25,
          untestedPriorWeight: 0.45
        });
        bayesianTopicMap = new Map(
          bayesianResult.topics.map(t => [t.name, t])
        );
        topics.forEach(topic => {
          const bayes = bayesianTopicMap.get(topic.name);
          if (!bayes) return;
          topic.bayesian = bayes;
          topic.bayesianProficiency = bayes.proficiencyMean * 100;
          topic.bayesianEvidence = bayes.evidence;
          topic.bayesianUncertainty = bayes.uncertainty;
          if (getCoachFeature(null, 'useBayesianTopicsForUrgency', false)) {
            const weakness = clamp(1 - bayes.proficiencyMean, 0, 1);
            const uncertainty = clamp(bayes.uncertainty, 0, 1);
            const evidence = clamp(bayes.evidence, 0, 1);
            const bayesianBoost = (weakness * 0.65 + uncertainty * 0.35) * 70;
            topic.urgencyScore =
              topic.urgencyScore * (0.75 + 0.25 * evidence) +
              bayesianBoost;
            if (topic.isUntested) {
              const explorationFactor = 0.40 + 0.35 * uncertainty;
              topic.urgencyScore *= explorationFactor;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Bayesian topics failed:', err);
        bayesianTopicMap = null;
      }
    }
    // ==================== LOTE 5: DECISION UTILITY ====================
    let decisionTopicMap = null;
    if (getCoachFeature(null, 'useDecisionUtility', false)) {
      try {
        const decisionCandidates = topics.map(topic => {
          const bayesianProficiency = Number.isFinite(topic.bayesianProficiency)
            ? topic.bayesianProficiency
            : topic.percentage;
          const weakness = clamp(1 - (bayesianProficiency / 100), 0, 1);
          const uncertainty = Number.isFinite(topic.bayesianUncertainty)
            ? topic.bayesianUncertainty
            : (topic.total > 0
                ? clamp(10 / (topic.total + 10), 0, 1)
                : 0.85);
          const evidence = Number.isFinite(topic.bayesianEvidence)
            ? topic.bayesianEvidence
            : clamp(topic.total / (topic.total + 10), 0, 1);
          return {
            id: `topic:${topic.name}`,
            name: topic.name,
            type: 'topic',
            weakness,
            uncertainty,
            evidence,
            recencyDays: topic.daysSince,
            priority: topic.manualPriority >= 40
              ? 'high'
              : topic.manualPriority >= 20
                ? 'medium'
                : 'low',
            priorityValue: clamp((topic.manualPriority || 0) / 40, 0, 1),
            hasTasks: topic.hasTasks,
            completed: topic.completed,
            costMinutes: 35,
            fatigue: 100,
            weight: null
          };
        });
        const rankedDecisionTopics = rankDecisionCandidates(decisionCandidates, {
          useBandit: getCoachFeature(null, 'useBanditPlanner', false),
          seed: `topics-${topics.length}-${getDateKey(new Date())}`,
          explorationScale: 16
        });
        decisionTopicMap = new Map(
          rankedDecisionTopics.map(item => [item.name, item])
        );
        topics.forEach(topic => {
          const decisionItem = decisionTopicMap.get(topic.name);
          if (!decisionItem) return;
          topic.decisionUtility = decisionItem.decision?.utility ?? 0;
          topic.decisionScore = decisionItem.decisionScore ?? 0;
          topic.decisionExploration = decisionItem.explorationBonus ?? 0;
          topic.decisionComponents = decisionItem.decision?.components ?? null;
          if (getCoachFeature(null, 'useDecisionUtilityForTopics', false)) {
            topic.urgencyScore =
              topic.urgencyScore * 0.75 +
              topic.decisionUtility * 0.45;
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Decision utility topics failed:', err);
        decisionTopicMap = null;
      }
    }
    const useBayesianSort = getCoachFeature(null, 'useBayesianTopicsForUrgency', false);
    const useDecisionSort = getCoachFeature(null, 'useDecisionUtilityForTopics', false);
    // ==================== LOTE 7: FSRS + KNOWLEDGE GRAPH ====================
    if (getCoachFeature(null, 'useAdvancedFsrs', false)) {
      try {
        topics.forEach(topic => {
          topic.fsrs = estimateTopicFsrs(
            {
              name: topic.name,
              scores: topic.scores || [],
              lastSeen: topic.lastSeen,
              daysSince: topic.daysSince,
              total: topic.total,
              percentage: topic.percentage,
            },
            {
              maxScore,
              desiredRetention: 0.85,
            }
          );
          if (
            getCoachFeature(null, 'useFsrsTopicScheduling', false) &&
            topic.fsrs
          ) {
            const retentionRisk = clamp(
              1 - (topic.fsrs.retentionPct / 100),
              0,
              1
            );
            const dueBoost = topic.fsrs.due ? 10 : 0;
            topic.urgencyScore += retentionRisk * 18 + dueBoost;
            if (topic.fsrs.due) {
              topic.srsDue = true;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Advanced FSRS topics failed:', err);
      }
    }
    if (getCoachFeature(null, 'useKnowledgeGraph', false)) {
      try {
        const graphConfig = getKnowledgeGraphForCategory(
          category?.name || category?.id
        );
        if (graphConfig) {
          const graphInput = topics.map(topic => ({
            name: topic.name,
            proficiency: Number.isFinite(topic.bayesianProficiency)
              ? topic.bayesianProficiency / 100
              : topic.percentage / 100,
            evidence: Number.isFinite(topic.bayesianEvidence)
              ? topic.bayesianEvidence
              : clamp(topic.total / (topic.total + 10), 0, 1),
            total: topic.total,
          }));
          const graphMetrics = computeTopicGraphMetrics(graphInput, graphConfig);
          const graphMap = new Map(
            graphMetrics.topics.map(metric => [metric.name, metric])
          );
          topics.forEach(topic => {
            const metric = graphMap.get(topic.name);
            if (!metric) return;
            topic.graph = metric;
            if (getCoachFeature(null, 'useKnowledgeGraphForTopics', false)) {
              const importanceBoost = metric.graphImportance * 22;
              const prereqPenalty = (1 - metric.prereqReadiness) * 16;
              topic.urgencyScore =
                topic.urgencyScore + importanceBoost - prereqPenalty;
              if ((metric.blockedBy || []).length > 0) {
                topic.urgencyScore *= 0.92;
                topic.recommendedPrerequisites = metric.blockedBy;
              }
            }
          });
        }
      } catch (err) {
        console.warn('[CoachLogic] Knowledge graph topics failed:', err);
      }
    }
    topics.sort((a, b) => {
      const aNeedsAction = !a.completed && a.hasTasks;
      const bNeedsAction = !b.completed && b.hasTasks;
      const aProf = useBayesianSort && Number.isFinite(a.bayesianProficiency)
        ? a.bayesianProficiency
        : a.percentage;
      const bProf = useBayesianSort && Number.isFinite(b.bayesianProficiency)
        ? b.bayesianProficiency
        : b.percentage;
      let aBase = a.urgencyScore;
      let bBase = b.urgencyScore;
      if (
        useDecisionSort &&
        Number.isFinite(a.decisionScore) &&
        Number.isFinite(b.decisionScore)
      ) {
        aBase = (a.urgencyScore * 0.55) + (a.decisionScore * 0.45);
        bBase = (b.urgencyScore * 0.55) + (b.decisionScore * 0.45);
      }
      let aScore = aBase + (aNeedsAction ? 50 : 0);
      let bScore = bBase + (bNeedsAction ? 50 : 0);
      if (a.total > 0 && aProf < 40) aScore += 80;
      else if (a.total > 0 && aProf < 60) aScore += 40;
      if (b.total > 0 && bProf < 40) bScore += 80;
      else if (b.total > 0 && bProf < 60) bScore += 40;
      if (useBayesianSort) {
        const aEvidence = Number.isFinite(a.bayesianEvidence) ? a.bayesianEvidence : 0;
        const bEvidence = Number.isFinite(b.bayesianEvidence) ? b.bayesianEvidence : 0;
        if (a.total > 0) aScore += aEvidence * 15;
        if (b.total > 0) bScore += bEvidence * 15;
        if (a.total === 0) aScore -= 12;
        if (b.total === 0) bScore -= 12;
      } else {
        if (a.total === 0) aScore -= 25;
        if (b.total === 0) bScore -= 25;
      }
      if (useDecisionSort) {
        const aDecision = Number.isFinite(a.decisionUtility) ? a.decisionUtility : 0;
        const bDecision = Number.isFinite(b.decisionUtility) ? b.decisionUtility : 0;
        aScore += aDecision * 0.20;
        bScore += bDecision * 0.20;
      }
      return bScore - aScore;
    });
    return topics;
};

const getWeakestTopic = (category, simulados = [], maxScore = 100) => {
    return _buildSortedTopics(category, simulados, maxScore)[0] || null;
};

const getWeakestTopicsList = (category, simulados = [], maxScore = 100, limit = 3) => {
    return _buildSortedTopics(category, simulados, maxScore).slice(0, limit);
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore ?? 80;
    const maxScore = options.maxScore ?? 100;
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const safeSimulados = safeArray(simulados);
    const safeStudyLogs = safeArray(studyLogs);
    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, safeSimulados, safeStudyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });
    const topCategories = ranked.slice(0, 10);
    const performDeepCheck = (category, averageScore) => {
        const baseDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
        const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const cutoffTime = thirtyDaysAgo.getTime();
        const recentLogs = safeStudyLogs.filter(l =>
            l.categoryId === category.id &&
            (normalizeDate(l.date) || new Date(0)).getTime() >= cutoffTime
        );
        const catNormalized = normalize(category.name);
        const recentSims = safeSimulados.filter(s =>
            normalize(s.subject) === catNormalized &&
            (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime() >= cutoffTime
        );
        const totalHours = recentLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => acc + (Number(s.total) || getSyntheticTotal(maxScore)), 0);
        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;
        // ✅ FIX: Validar averageScore antes de calcular normalizedScore
        const safeAverageScore = Number.isFinite(averageScore) ? averageScore : 0;
        const normalizedScore = (safeAverageScore / maxScore) * 100;
        const isFormingBase = normalizedScore < 45;
        if (totalHours > 5 && questionsPerHour < dynamicThreshold && !isFormingBase) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Estudou ${totalHours.toFixed(1)}h de ${category.name} mas resolveu poucas questões (${questionsPerHour.toFixed(1)}/h). O seu nível atual exige prática >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };
    let allGeneratedTasks = [];
    // ✅ PATCH-10: Contador explícito e global para o label prioritário
    let globalPriorityCounter = 0;
    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);
    topCategories.forEach((cat) => {
        const weakTopics = getWeakestTopicsList(cat, safeSimulados, maxScore, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;
        const iterations = tasksPerCategory;
        const getPriorityLabel = () => {
            if (globalPriorityCounter < 3) {
                globalPriorityCounter++;
                return '[PROTOCOLO PRIORITÁRIO] ';
            }
            return '';
        };
        const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
        const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;
        const mcIdSuffix = Date.now().toString(36);
        const mcProbKey = mc ? Math.round(mc.probabilityRaw) : '0';
        const mcVolKey = mc ? Math.round(mc.volatility * 100) : '0';
        // Ordem corrigida: crítico > caos > SRS > cruzeiro > trap
        if (mc && mc.probabilityRaw < adaptiveDanger) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-danger-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${getPriorityLabel()}[ALERTA MESTRE] 🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Vetor Crítico — Intervenção Exigida',
                analysis: {
                    reason: "Monte Carlo — Zona de Perigo",
                    details: `Apenas ${probPct}% de chance de bater a meta de ${options.targetScoreLabel ?? targetScore}% em 90 dias.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Probabilidade crítica detectada. Mude de método imediatamente."
                }
            });
        } else if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && mc.probabilityRaw < cfg.MC_PROB_SAFE) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-chaos-${mcVolKey}-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${getPriorityLabel()}[ALERTA MESTRE] 🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Oscilação Estatística — Caos Detectado',
                analysis: {
                    reason: "Monte Carlo — Caos Estatístico",
                    details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)}. Probabilidade: ${probPct}%.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível."
                }
            });
        } else if (cat.urgency?.details?.srsLabel) {
            const srsKey = cat.urgency?.details?.srsLabel.replace(/\s/g, '').substring(0, 15);
            const srsTopic = weakTopics[0]?.name || 'Revisão Espaçada (SRS)';
            allGeneratedTasks.push({
                id: `${cat.id}-srs-${srsKey}`,
                text: `${cat.name}: ${getPriorityLabel()}[${srsTopic}]`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: srsTopic,
                analysis: {
                    reason: "Revisão Espaçada (SRS) Ativada",
                    label: cat.urgency?.details?.srsLabel,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                }
            });
        } else if (mc && mc.probabilityRaw >= adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-safe-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${getPriorityLabel()}[Manutenção - ${cat.name}]`,
                completed: false,
                status: 'pending',
                priority: 'low',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: `Manutenção — ${cat.name}`,
                analysis: {
                    reason: "Monte Carlo — Cruzeiro Seguro",
                    details: `${probPct}% de probabilidade de atingir a meta.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Mantenha o ritmo atual para proteger sua posição."
                }
            });
        } else if (performDeepCheck(cat, cat.urgency?.details?.averageScore).isTrap) {
            allGeneratedTasks.push({
                id: `${cat.id}-trap-trap`,
                text: `${cat.name}: ${getPriorityLabel()}[Prática Intensiva de Questões]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Prática Intensiva de Questões',
                analysis: {
                    reason: "Detector de Pseudo-Estudo",
                    details: "Alta carga horária com baixíssimo volume de exercícios.",
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                }
            });
        }
        const agilityData = cat.urgency?.details?.agilityPenalty !== undefined
            ? {
                avgSeconds: cat.urgency?.details?.avgSeconds || 0,
                agilityPenalty: cat.urgency?.details?.agilityPenalty || 0
            }
            : computeAgilityMetrics((cat.simuladoStats && Array.isArray(cat.simuladoStats.history)) ? cat.simuladoStats.history : []);
        // ✅ PATCH-12: Validar avgSeconds explicitamente
        const avgSeconds = Number.isFinite(agilityData?.avgSeconds) ? agilityData.avgSeconds : 0;
        const targetSeconds = 120;
        const isAgilityProblem = (avgSeconds > targetSeconds + 30) && (cat.urgency?.normalizedScore >= 75);
        if (isAgilityProblem) {
            allGeneratedTasks.push({
                id: `${cat.id}-agility-${avgSeconds}`,
                text: `${cat.name}: ${getPriorityLabel()}[Treino de Agilidade - Cronômetro]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Treino de Agilidade — Cronômetro',
                analysis: {
                    reason: "Motor de Agilidade AI",
                    details: `Seu tempo médio (${avgSeconds}s/questão) está alto, embora sua taxa de acertos seja excelente.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: `Faça baterias curtas com cronômetro para reduzir o seu tempo de ${avgSeconds}s para a meta de ${targetSeconds}s por questão.`
                }
            });
        }
        let topicCursor = 0;
        for (let i = 0; i < iterations; i++) {
            const weakTopic = (topicCursor < weakTopics.length) ? weakTopics[topicCursor++] : null;
            const topicLabel = weakTopic
                ? `${getPriorityLabel()}[${weakTopic.name}]`
                : `${getPriorityLabel()}[Revisão Geral Complementar]`;
            const uniqueIdSuffix = weakTopic
                ? (`${weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}-${weakTopic.total || 0}-${i}`)
                : `geral-${i}`;
            if (weakTopic) {
                let reasonStr = "";
                let topicPriority = 'medium';
                if (weakTopic.isUntested) {
                    reasonStr = "Tópico Novo / Não Testado";
                    topicPriority = 'medium';
                } else if (weakTopic.percentage < 40) {
                    reasonStr = "Vetor Crítico de Erros";
                    topicPriority = 'high';
                } else if (weakTopic.percentage < 60) {
                    reasonStr = "Lacuna de Conhecimento";
                    topicPriority = 'medium';
                } else if (weakTopic.trend < -2) {
                    reasonStr = "Degradação Recente";
                    topicPriority = 'medium';
                } else {
                    reasonStr = "Consolidação Estratégica";
                    topicPriority = 'low';
                }

                allGeneratedTasks.push({
                    id: `${cat.id}-topic-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}`,
                    completed: false,
                    status: 'pending',
                    priority: topicPriority,
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: weakTopic.name,
                    analysis: {
                        reason: reasonStr,
                        details: `Aproveitamento: ${Number(weakTopic.percentage || 0).toFixed(0)}% | Última visita: ${weakTopic.daysSince ?? 0} dias | Tendência: ${Number(weakTopic.trend || 0) > 0 ? '+' : ''}${Number(weakTopic.trend || 0).toFixed(1)}`,
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: `Priorize ${weakTopic.name} — ${reasonStr}.`
                    }
                });

            } else {
                allGeneratedTasks.push({
                    id: `${cat.id}-geral-${i}-${Date.now().toString(36)}`,
                    text: `${cat.name}: ${getPriorityLabel()}[Revisão Geral Complementar]`,
                    completed: false,
                    status: 'pending',
                    priority: 'low',
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: 'Revisão Geral Complementar',
                    analysis: {
                        reason: "Cobertura Geral",
                        details: "Sem tópico fraco específico — mantenha a revisão geral em dia.",
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: "Revisão geral leve para manutenção."
                    }
                });

            }
        }
    });

    // FIX: dedupe estável por id (evita tarefas duplicadas no planner)
    const seenIds = new Set();
    const dedupedTasks = allGeneratedTasks.filter(t => {
        if (!t || seenIds.has(t.id)) return false;
        seenIds.add(t.id);
        return true;
    });

    return dedupedTasks;
};

export const getCognitiveState = (studyLogs = [], options = {}) => {
    const safeLogs = safeArray(studyLogs);
    const referenceDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
    const nowMs = referenceDate.getTime();
    const todayKey = getDateKey(referenceDate);

    const minutesToday = safeLogs
        .filter(l => getDateKey(l?.date) === todayKey)
        .reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0);

    const last7DaysLogs = safeLogs.filter(l => {
        const t = (normalizeDate(l?.date) || new Date(0)).getTime();
        return t > 0 && (nowMs - t) <= 7 * MS_PER_DAY;
    });
    const hours7d = last7DaysLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0) / 60;

    const dailyLoad = Math.min(1, (minutesToday / 60) / 6);
    const weeklyLoad = Math.min(1, hours7d / 40);
    const fatigue = clamp(Math.round((dailyLoad * 0.6 + weeklyLoad * 0.4) * 100), 0, 100);

    const streakDays = new Set(last7DaysLogs.map(l => getDateKey(l?.date)).filter(Boolean)).size;
    const focus = clamp(Math.round((streakDays / 7) * 100), 0, 100);

    let recommendation = 'Ritmo saudável — mantenha o plano.';
    if (fatigue > 75) recommendation = 'Carga cognitiva alta — prefira revisões leves hoje.';
    else if (fatigue > 50) recommendation = 'Carga moderada — alterne blocos curtos com pausas.';
    else if (focus < 30) recommendation = 'Consistência baixa — comece com um bloco curto para retomar o ritmo.';

    return {
        fatigue,
        focus,
        streakDays,
        minutesToday: Math.round(minutesToday),
        hours7d: Number(hours7d.toFixed(2)),
        recommendation
    };
};

export const getBestTask = (categories = [], excludeTaskId = null) => {
    const safeCategories = safeArray(categories);
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    const candidates = [];
    safeCategories.forEach(cat => {
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
        tasks.forEach(task => {
            if (!task || task.completed === true) return;
            if (String(task.status || '').toLowerCase() === 'completed') return;
            const id = task.id || task.text || '';
            if (excludeTaskId && id === excludeTaskId) return;
            candidates.push({ ...task, id, catName: cat?.name || task.catName || '' });
        });
    });

    if (candidates.length === 0) return null;

    // FIX: sort estável e seguro (peso de prioridade → tem analysis → ordem original)
    candidates.sort((a, b) => {
        const pa = priorityWeight[a.priority] ?? 2;
        const pb = priorityWeight[b.priority] ?? 2;
        if (pb !== pa) return pb - pa;
        const aa = a.analysis ? 1 : 0;
        const ab = b.analysis ? 1 : 0;
        if (ab !== aa) return ab - aa;
        return 0;
    });

    return candidates[0];
};

export const getCoachInsight = (category, simulados = [], studyLogs = [], options = {}) => {
    try {
        const urgency = calculateUrgency(category, simulados, studyLogs, options);
        const details = urgency?.details || {};
        const mc = details.monteCarlo;
        const trend = Number(details.trend) || 0;
        const vol = Number(details.mssdVolatility) || 0;

        const parts = [];
        if (mc && Number.isFinite(mc.probability)) {
            parts.push(`chance de meta em ${Math.round(mc.probability)}%`);
        }
        parts.push(trend > 0.5 ? 'tendência de alta' : trend < -0.5 ? 'tendência de queda' : 'tendência estável');
        parts.push(`volatilidade ±${vol.toFixed(1)} pts`);

        return `${details.humanReadable?.['Média'] ?? '—'} de média | ${parts.join(' | ')}. ${urgency?.recommendation ?? ''}`.trim();
    } catch (err) {
        console.warn('[CoachLogic] getCoachInsight failed:', err);
        return null;
    }
};

export function getCombinedHistory(history, simulados, maxScore = 100) {
    const deduplicatedMap = new Map();
    const allSimulados = safeArray(simulados);

    allSimulados.forEach((s, idx) => {
        const safeScore = getSafeScore(s, maxScore);
        const safeScoreStr = Number.isFinite(safeScore) ? safeScore.toFixed(2) : '0.00';
        const key = `${s.id || `sim-no-id-${idx}`}|${s.date || s.createdAt}|${safeScoreStr}`;
        deduplicatedMap.set(key, { ...s, type: 'simulado' });
    });

    const hasSimuladoForDate = new Set(
        allSimulados
            .map(s => getDateKey(s.date || s.createdAt))
            .filter(Boolean)
    );

    const rowsByDate = {};
    safeArray(history).forEach(r => {
        const dKey = getDateKey(r.date || r.createdAt);
        if (dKey && !hasSimuladoForDate.has(dKey)) {
            if (!rowsByDate[dKey]) rowsByDate[dKey] = { correct: 0, total: 0 };
            rowsByDate[dKey].correct += (Number(r.correct) || 0);
            rowsByDate[dKey].total += (Number(r.total) || 0);
        }
    });

    Object.entries(rowsByDate).forEach(([dKey, stats]) => {
        if (stats.total > 0) {
            const score = (stats.correct / stats.total) * maxScore;
            const safeScoreStr = Number.isFinite(score) ? score.toFixed(2) : '0.00';
            const key = `legacy-${dKey}|${dKey}|${safeScoreStr}`;
            if (!deduplicatedMap.has(key)) {
                deduplicatedMap.set(key, {
                    id: `legacy-${dKey}`,
                    date: dKey,
                    score: Number.isFinite(score) ? score : 0,
                    type: 'simulado'
                });
            }
        }
    });

    return getSortedHistory(Array.from(deduplicatedMap.values()));
}

export { getWeakestTopic, getWeakestTopicsList };

```

## `src/utils/coachObservability.js`

```javascript
/**
 * coachObservability.js
 *
 * Lote 9 — Facade de observabilidade do Coach.
 */
import {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
} from '../engine/observability/modelHealth.js';
import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from '../engine/observability/driftMonitor.js';
import { getSafeScore } from './scoreHelper.js';
import { normalizeDate } from './dateHelper.js';

const CALIBRATION_TELEMETRY_KEY = 'coach_calibration_events_v1';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

/**
 * Carrega eventos de telemetria de calibração salvos pelo calibrationTelemetry.js.
 */
export function loadCalibrationTelemetryEvents() {
  try {
    const raw = localStorage.getItem(CALIBRATION_TELEMETRY_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Extrai séries de score e volatilidade a partir de simulados.
 *
 * FIX (BUG-44): janela de volatilidade configurável via options.volatilityWindow
 * (default 5, mínimo 3). Early return quando os dados são insuficientes para a
 * janela escolhida — antes o loop era hardcoded em janela 5 e o early return em < 5.
 */
export function extractObservabilitySeries(simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const windowSize = Math.max(3, Number(options.volatilityWindow) || 5);

  const sorted = safeArray(simulados)
    .map((simulado) => ({
      simulado,
      time: toTime(simulado?.date ?? simulado?.createdAt),
      score: getSafeScore(simulado, maxScore),
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      if (Number.isFinite(a.time) && Number.isFinite(b.time)) {
        return a.time - b.time;
      }
      return 0;
    });

  const scores = sorted.map((entry) => entry.score);
  const volatilities = [];

  // FIX: early return genérico para a janela configurada
  if (scores.length < windowSize) {
    return { scores, volatilities, sampleSize: scores.length };
  }

  for (let i = windowSize - 1; i < scores.length; i++) {
    const window = scores.slice(i - windowSize + 1, i + 1);
    const mean = window.reduce((acc, val) => acc + val, 0) / window.length;
    const variance =
      window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      (window.length - 1);
    volatilities.push(Math.sqrt(Math.max(0, variance)));
  }

  return {
    scores,
    volatilities,
    sampleSize: scores.length,
  };
}

/**
 * Observa um resultado do calculateUrgency e extrai métricas de saúde.
 */
export function observeCoachUrgencyResult(result = {}, options = {}) {
  const mc = result?.details?.monteCarlo || null;
  return {
    timestamp: Date.now(),
    categoryId: options.categoryId ?? null,
    categoryName: options.categoryName ?? null,
    normalizedScore: Number.isFinite(result?.normalizedScore)
      ? result.normalizedScore
      : null,
    probability: Number.isFinite(mc?.probability) ? mc.probability : null,
    probabilityRaw: Number.isFinite(mc?.probabilityRaw)
      ? mc.probabilityRaw
      : null,
    avgBrier: Number.isFinite(mc?.avgBrier) ? mc.avgBrier : null,
    ece: Number.isFinite(mc?.ece) ? mc.ece : null,
    calibrationPenalty: Number.isFinite(mc?.calibrationPenalty)
      ? mc.calibrationPenalty
      : null,
    volatility: Number.isFinite(mc?.volatility)
      ? mc.volatility
      : Number.isFinite(result?.details?.mssdVolatility)
        ? result.details.mssdVolatility
        : null,
    sampleSize: Number.isFinite(mc?.sampleSize) ? mc.sampleSize : null,
    reliability: Array.isArray(mc?.reliability) ? mc.reliability : [],
  };
}

/**
 * Executa o Drift Guard completo.
 */
export function runCoachDriftGuard(options = {}) {
  const calibrationEvents = Array.isArray(options.calibrationEvents)
    ? options.calibrationEvents
    : loadCalibrationTelemetryEvents();
  const scores = Array.isArray(options.scores) ? options.scores : [];
  const volatilities = Array.isArray(options.volatilities)
    ? options.volatilities
    : [];
  const probabilityPairs = Array.isArray(options.probabilityPairs)
    ? options.probabilityPairs
    : [];

  const lastTelemetryTimestamp =
    Number(options.lastTelemetryTimestamp) ||
    (calibrationEvents.length > 0
      ? Number(calibrationEvents[calibrationEvents.length - 1]?.timestamp) || 0
      : 0);

  const health = evaluateModelHealth(
    {
      calibrationEvents,
      scores,
      volatilities,
      probabilityPairs,
      sampleSize: options.sampleSize ?? scores.length,
      features: options.features || {},
      lastTelemetryTimestamp,
    },
    options
  );

  if (options.saveSnapshot !== false) {
    saveModelHealthSnapshot(health);
  }

  return health;
}

/**
 * Constrói dashboard de observabilidade.
 */
export function buildCoachObservabilityDashboard(options = {}) {
  const health = runCoachDriftGuard(options);
  return generateHealthDashboard(health);
}

export {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
};

export default {
  loadCalibrationTelemetryEvents,
  extractObservabilitySeries,
  observeCoachUrgencyResult,
  runCoachDriftGuard,
  buildCoachObservabilityDashboard,
};

```

## `src/utils/coachOptimizer.js`

```javascript
/**
 * coachOptimizer.js
 *
 * Lote 10 — Facade de otimização automática do Coach.
 */
export {
  EXPERIMENTAL_MATH_FLAGS,
  getSafeBaselineFeatures,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getStrategySpace,
  scoreStrategyEvaluation,
  rankStrategies,
  loadOptimizerState,
  saveOptimizerState,
  clearOptimizerState,
  recordStrategyOutcome,
  selectStrategyThompson,
  recommendFlagConfig,
  applyRecommendedFlags,
} from '../engine/optimization/flagOptimizer.js';

export {
  saveBacktestReport,
  loadLastBacktestReport,
  loadEvaluationResultsLocal,
  loadHealthSnapshotsLocal,
  summarizeEvaluationsByStrategy,
  saveTunerHistory,
  loadTunerHistory,
  runAutoTunerCycle,
  buildAutoTunerDashboard,
} from '../engine/optimization/autoTuner.js';

import {
  loadPersistedCoachFlags,
  getSafeBaselineFeatures,
} from '../engine/optimization/flagOptimizer.js';
import {
  runAutoTunerCycle,
  buildAutoTunerDashboard,
} from '../engine/optimization/autoTuner.js';

/**
 * Inicializa flags persistidas.
 * Deve ser chamado no bootstrap da aplicação.
 *
 * FIX: merge correto baseline + persistido (apenas booleans válidos)
 * e propagação para globalThis.__COACH_FEATURES__ — antes o orquestrador
 * relia o global e nunca enxergava as flags persistidas.
 */
export function bootstrapCoachFlags() {
  const baseline = getSafeBaselineFeatures();
  const persisted = loadPersistedCoachFlags();

  if (!persisted || typeof persisted !== 'object') {
    globalThis.__COACH_FEATURES__ = { ...baseline };
    return { ...baseline };
  }

  const merged = { ...baseline };
  for (const [key, value] of Object.entries(persisted)) {
    if (typeof value === 'boolean') {
      merged[key] = value;
    }
  }

  globalThis.__COACH_FEATURES__ = merged;
  return merged;
}

/**
 * Rode o AutoTuner.
 */
export function runCoachAutoTuner(options = {}) {
  return runAutoTunerCycle(options);
}

/**
 * Gera dashboard do AutoTuner.
 */
export function buildCoachAutoTunerDashboard(report = {}) {
  return buildAutoTunerDashboard(report);
}

export default {
  bootstrapCoachFlags,
  runCoachAutoTuner,
  buildCoachAutoTunerDashboard,
};

```

## `src/utils/coachPipeline.js`

```javascript
/**
 * coachPipeline.js
 *
 * Lote 12 — Facade do Unified Coach Orchestrator.
 */
export {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../engine/orchestrator/coachOrchestrator.js';

import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../engine/orchestrator/coachOrchestrator.js';

/**
 * API simples para executar o Coach completo.
 *
 * FIX: garante que input é objeto antes de repassar
 * (o orquestrador também valida, mas evita exceção em chamadas inválidas).
 */
export async function coach(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeOptions = options && typeof options === 'object' ? options : {};
  return runCoachOrchestrator(safeInput, safeOptions);
}

/**
 * API simples para gerar dashboard do Coach completo.
 *
 * FIX: valida input e retorna null se o resultado for inválido.
 */
export async function coachDashboard(input = {}, options = {}) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const safeOptions = options && typeof options === 'object' ? options : {};
  const result = await runCoachOrchestrator(safeInput, safeOptions);
  if (!result || typeof result !== 'object') return null;
  return buildCoachOrchestratorDashboard(result);
}

export default {
  coach,
  coachDashboard,
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
};

```

## `src/utils/coachSafe.js`

```javascript
/**
 * coachSafe.js
 *
 * Utilitários de segurança e normalização numérica.
 * Base para todos os módulos do Coach.
 */

export function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  // Number.isFinite já rejeita NaN e Infinity
  return Number.isFinite(n) ? n : fallback;
}

// FIX (BUG-31): valida min/max (troca se invertidos) e trata Infinity no value/fallback
export function clampFinite(value, min, max, fallback = min) {
  let safeMin = Number(min);
  let safeMax = Number(max);

  if (!Number.isFinite(safeMin)) safeMin = 0;
  if (!Number.isFinite(safeMax)) safeMax = safeMin;

  if (safeMin > safeMax) {
    const tmp = safeMin;
    safeMin = safeMax;
    safeMax = tmp;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    const fb = Number(fallback);
    return Number.isFinite(fb)
      ? Math.min(safeMax, Math.max(safeMin, fb))
      : safeMin;
  }

  return Math.min(safeMax, Math.max(safeMin, n));
}

export function getCalibrationKey(id) {
  return String(id ?? '').trim().toLowerCase();
}

// PATCH: normalização NFC para caracteres acentuados
export function hashString(str) {
  let h = 0x811c9dc5;
  const s = str === null || str === undefined
    ? ''
    : typeof str === 'object'
      ? JSON.stringify(str)
      : String(str);
  const normalized = s.normalize('NFC');
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// PATCH-NOVO (BUG-32): hash de 64 bits (dois FNV combinados) para cache keys críticas,
// reduzindo colisões em relação ao hash de 32 bits.
export function hashString64(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = str === null || str === undefined
    ? ''
    : typeof str === 'object'
      ? JSON.stringify(str)
      : String(str);
  const normalized = s.normalize('NFC');
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}
```

## `src/utils/coachText.js`

```javascript
/**
 * coachText.js
 *
 * Utilitários de parsing e normalização de texto para tarefas do Coach.
 */
import { displaySubject, displayTopic } from './displaySubject';

export const RX_SYSTEM_ALERT_TEST = /\[(ALERTA MESTRE|STATUS)\]/i;
export const RX_SYSTEM_ALERT_GLOBAL = /\[(ALERTA MESTRE|STATUS)\]/gi;
export const RX_PROTOCOLO_GLOBAL = /\[PROTOCOLO PRIORITÁRIO\]\s*/gi;
export const RX_BRACKET_TOPIC = /^\[(.*?)\]\s*([\s\S]*)$/i;
export const RX_REC_MARKUP = /(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g;
export const RX_BOLD = /(\*\*.*?\*\*)/g;

// FIX (BUG-06/33): removidas as âncoras ^...$ — com âncora + flag g, o .replace()
// só substituía se a string INTEIRA fosse um match. Agora remove o ruído em qualquer
// posição, mantendo a lista de marcadores de ruído.
export const RX_NOISE_ACTION =
  /(Revisão Geral Complementar|Revisão Complementar|CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)|\(Prioridade\)|% de acerto)/gi;

export function isSystemAlertTask(value) {
  const text =
    typeof value === 'string'
      ? value
      : value?.text || value?.title || '';
  return RX_SYSTEM_ALERT_TEST.test(String(text || ''));
}

export function cleanCoachTags(text) {
  return String(text || '')
    .replace(RX_PROTOCOLO_GLOBAL, '')
    .replace(RX_SYSTEM_ALERT_GLOBAL, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeTaskStatus(task) {
  if (!task) return 'pending';
  if (task.completed === true) return 'completed';
  const status = String(task.status || '').toLowerCase();
  if (['completed', 'done', 'concluido', 'concluído'].includes(status)) {
    return 'completed';
  }
  if (['studying', 'active', 'in_progress', 'doing', 'em_estudo'].includes(status)) {
    return 'studying';
  }
  return 'pending';
}

export function normalizeTaskPriority(task, action = '', isSystemAlert = false) {
  const raw = String(task?.text || task?.title || '');
  if (/\[PROTOCOLO PRIORITÁRIO\]/i.test(raw) || isSystemAlert) return 'high';
  if (task?.priority === 'high') return 'high';
  if (task?.priority === 'low') return 'low';
  if (task?.priority === 'medium') return 'medium';
  if (/ALERTA|CRÍTICO|VETOR CRÍTICO/i.test(action)) return 'high';
  return 'medium';
}

export function parseCoachTask(task, categories = []) {
  const raw = String(task?.text || task?.title || '');
  const isSystemAlert = isSystemAlertTask(raw);
  const clean = cleanCoachTags(raw);
  const separatorIndex = clean.indexOf(':');
  const hasSeparator = separatorIndex !== -1;

  let subjectRaw = String(
    task?.subjectName ||
    task?.subject?.name ||
    task?.subject?.subjectName ||
    task?.category ||
    task?.catName ||
    (hasSeparator ? clean.slice(0, separatorIndex) : clean) ||
    "Matéria Indefinida"
  )
    .replace(/^Foco em\s*/i, '')
    .trim();

  let action = hasSeparator ? clean.slice(separatorIndex + 1).trim() : clean;

  const bracketMatch = action.match(RX_BRACKET_TOPIC);
  let topicRaw = String(task?.topicName || '').trim();

  if (bracketMatch) {
    if (!topicRaw) topicRaw = bracketMatch[1].trim();
    action = bracketMatch[2].trim();
  }

  // FIX: usa a regex sem âncora para limpar ruído corretamente
  action = action.replace(RX_NOISE_ACTION, '').trim();

  if (!topicRaw) {
    topicRaw = action || subjectRaw || 'Revisão Geral';
  }

  // PATCH-20: Não sobrescrever se analysis.reason confirma o tópico
  if (
    topicRaw.toLowerCase() === subjectRaw.toLowerCase() &&
    !task?.topicName &&
    !task?.analysis?.label &&
    !(task?.analysis?.reason && topicRaw && task.analysis.reason.includes(topicRaw))
  ) {
    topicRaw = 'Revisão Geral';
  }

  const status = normalizeTaskStatus(task);
  const priority = normalizeTaskPriority(task, action, isSystemAlert);

  return {
    raw,
    isSystemAlert,
    subjectRaw,
    subject: displaySubject(subjectRaw, categories),
    topicRaw,
    topic: displayTopic(topicRaw),
    action,
    status,
    priority,
    isCompleted: status === 'completed',
    isStudying: status === 'studying'
  };
}

```

