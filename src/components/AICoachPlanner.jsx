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
          style={provided.draggableProps.style}
          className="outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 rounded-lg select-none"
        >
          <div
            style={{
              transform: snapshot.isDragging ? 'scale(1.03)' : 'none',
              boxShadow: snapshot.isDragging
                ? '0 20px 40px -10px rgba(0,0,0,0.85), 0 0 25px rgba(139,92,246,0.5)'
                : undefined,
            }}
            className={`group relative mb-2.5 rounded-lg border p-3 pl-4 sm:pl-4.5 select-none cursor-grab active:cursor-grabbing transition-colors duration-150 ${
              snapshot.isDragging
                ? 'border-violet-400 bg-[#161b2c] ring-2 ring-violet-400/40 z-[9999]'
                : isBacklog
                  ? 'border-white/[0.07] bg-[#12151f] hover:border-violet-400/30 hover:bg-[#161a28]'
                  : `${dayTheme.cardBorder} ${dayTheme.cardBg} hover:border-white/20`
            }`}
          >
            <span
              className={`absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-lg bg-gradient-to-b opacity-90 ${
                isBacklog
                  ? (isPriority ? 'from-amber-400 to-amber-500' : 'from-violet-500 to-indigo-500')
                  : dayTheme.gradient
              }`}
            />

            {/* Linha Superior: Badge da Matéria + Ações */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span
                className={`inline-flex min-w-0 max-w-[72%] items-center gap-1.5 rounded px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate ${
                  isBacklog
                    ? (isPriority ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300' : 'border border-violet-500/30 bg-violet-500/10 text-violet-300')
                    : `border border-white/10 bg-black/40 ${dayTheme.text}`
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isBacklog ? (isPriority ? 'bg-amber-400' : 'bg-violet-400') : 'bg-current'}`} />
                <span className="truncate" title={displaySubject(subject, categories)}>
                  {displaySubject(subject, categories)}
                </span>
              </span>

              <div className="flex items-center gap-1 shrink-0">
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
                  <Play size={9} className="fill-current ml-0.5" />
                </button>
                <GripVertical size={13} className="shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors cursor-grab" />
              </div>
            </div>

            {/* Linha Principal: Título do Tópico + Detalhes */}
            <div className="mt-2 flex flex-col gap-0.5">
              <h4 className="text-[12px] sm:text-[13px] font-bold leading-snug text-slate-100 break-words line-clamp-2 tracking-normal">
                {topicLabel}
              </h4>
              {secondaryText && (
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-2 mt-0.5">
                  {secondaryText}
                </p>
              )}
            </div>

            {/* Tag de SRS / Prioridade quando relevante */}
            {isSrsCard && (
              <div className="mt-1.5 flex items-center gap-1">
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  SRS
                </span>
              </div>
            )}
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
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(animation);
  }, []);

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
      <div className="flex flex-col xl:flex-row gap-5 items-stretch mt-3">

        {/* ================= BACKLOG ================= */}
        <div className="w-full xl:w-72 2xl:w-80 shrink-0 flex flex-col">
          {/* FIX: SEM backdrop-blur (backdrop-filter quebra o fixed do dnd) */}
          <div className="bg-[#0d111b]/95 border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col h-full min-h-[460px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div className={`flex-1 flex flex-col transition-all duration-300 ${snapshot.isDraggingOver ? 'bg-white/5 shadow-xl scale-[1.01] rounded-lg p-1' : ''}`}>
                  <div className={`flex items-center gap-2.5 mb-4 pb-3 border-b transition-colors duration-300 ${snapshot.isDraggingOver ? 'border-violet-400/50' : 'border-white/[0.08]'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${snapshot.isDraggingOver ? 'bg-violet-500/30 border-violet-400/60 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-violet-500/15 border border-violet-500/30'}`}>
                      <BrainCircuit size={16} className={`transition-colors ${snapshot.isDraggingOver ? 'text-violet-200' : 'text-violet-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xs font-black uppercase tracking-[0.18em] transition-colors ${snapshot.isDraggingOver ? 'text-white' : 'text-slate-200'}`}>Sugestões</h3>
                      <p className={`text-[9px] font-semibold tracking-wider transition-colors ${snapshot.isDraggingOver ? 'text-violet-300' : 'text-slate-400'}`}>IA Coach</p>
                    </div>
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all duration-300 ${snapshot.isDraggingOver ? 'bg-violet-500/30 text-white border-violet-400/60' : 'bg-violet-500/15 text-violet-300 border-violet-500/30'}`}>
                      {(columns.backlog || []).length}
                    </span>
                  </div>

                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    role="list"
                    aria-label="Sugestões de tarefas não alocadas"
                    className={`flex-1 flex flex-col p-2 rounded-lg border border-dashed transition-all duration-300 overflow-y-auto max-h-[580px] custom-scrollbar ${
                      snapshot.isDraggingOver
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
              )}
            </Droppable>
          </div>
        </div>

        {/* ================= SEMANA ================= */}
        <div className="w-full flex-1 min-w-0 flex flex-col">
          {/* FIX: SEM backdrop-blur aqui também */}
          <div className="bg-[#0d111b]/95 border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col h-full relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                  <CalendarDays size={16} className="text-indigo-400" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Planejamento Semanal</h3>
                  <p className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase">Agenda do Aluno</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                {weekTotal} tarefa{weekTotal === 1 ? '' : 's'} na semana
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-3 pt-1">
              <div className="flex gap-3 min-w-[850px] sm:min-w-[1000px] xl:min-w-[1200px] 2xl:min-w-full">
                {DAYS.map((day) => {
                  const dayTasks = columns[day.id] || [];
                  return (
                    <div key={day.id} className="flex-1 min-w-[120px] sm:min-w-[140px] xl:min-w-[160px] flex flex-col">
                      <Droppable droppableId={day.id}>
                        {(provided, snapshot) => (
                          <div className={`flex-1 flex flex-col p-1.5 rounded-lg transition-all duration-300 ${snapshot.isDraggingOver ? 'bg-white/5 shadow-xl scale-[1.02]' : ''}`}>
                            <div className={`mb-3 rounded-lg border transition-all duration-300 ${
                              snapshot.isDraggingOver ? `${day.over} shadow-[0_0_15px_rgba(255,255,255,0.05)]` : `${day.headerBorder} ${day.headerBg}`
                            } p-2.5 relative overflow-hidden`}>
                              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${day.gradient} opacity-70`} />
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className={`text-sm font-black tracking-widest ${day.text} uppercase pb-[1px] transition-transform duration-300 ${snapshot.isDraggingOver ? 'scale-105 origin-left' : ''}`}>{day.label}</span>
                                  <span className="text-[10px] font-semibold text-slate-400 capitalize mt-0.5 leading-normal">{day.full}</span>
                                </div>
                                <div className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${day.text} bg-black/30 border transition-colors duration-300 ${snapshot.isDraggingOver ? day.over : day.headerBorder}`}>
                                  {dayTasks.length}
                                </div>
                              </div>
                            </div>

                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              role="list"
                              aria-label={`Tarefas de ${day.full}`}
                              className={`flex-1 p-2 rounded-lg border border-dashed transition-all duration-300 flex flex-col min-h-[220px] max-h-[580px] overflow-y-auto custom-scrollbar ${
                                snapshot.isDraggingOver
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
                                <div className={`w-full min-h-[120px] flex flex-col items-center justify-center gap-1.5 border border-dashed ${day.headerBorder} opacity-40 rounded-lg p-3 text-center my-1 bg-black/10`}>
                                  <Inbox size={16} className={day.text} />
                                  <span className={`text-[10px] font-semibold tracking-wider uppercase ${day.text} opacity-70`}>Arraste aqui</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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