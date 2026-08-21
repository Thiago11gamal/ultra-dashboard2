import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, BrainCircuit, Calendar, GripVertical, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { isSystemAlertTask, parseCoachTask } from '../utils/coachText';

let _coachTaskFallbackCounter = 0;
const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  const stableId = task.id || getSafeId(task) || `coach-task-fb-${++_coachTaskFallbackCounter}-${Date.now().toString(36)}`;
  return {
    ...task,
    id: stableId,
  };
};

const DAYS = [
  { id: 'mon', label: 'SEG', full: 'Segunda', gradient: 'from-violet-600 to-indigo-600', bg: 'bg-violet-500/10', border: 'border-violet-500/25', text: 'text-violet-300', dot: 'bg-violet-500', over: 'bg-violet-500/15 border-violet-500/50', cardBg: 'bg-violet-500/[0.08]', cardBorder: 'border-violet-500/20', cardHover: 'hover:border-violet-500/40 hover:bg-violet-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(139,92,246,0.3)]' },
  { id: 'tue', label: 'TER', full: 'Terça', gradient: 'from-sky-500 to-cyan-500', bg: 'bg-sky-500/10', border: 'border-sky-500/25', text: 'text-sky-300', dot: 'bg-sky-500', over: 'bg-sky-500/15 border-sky-500/50', cardBg: 'bg-sky-500/[0.08]', cardBorder: 'border-sky-500/20', cardHover: 'hover:border-sky-500/40 hover:bg-sky-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(14,165,233,0.3)]' },
  { id: 'wed', label: 'QUA', full: 'Quarta', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10', border: 'border-pink-500/25', text: 'text-pink-300', dot: 'bg-pink-500', over: 'bg-pink-500/15 border-pink-500/50', cardBg: 'bg-pink-500/[0.08]', cardBorder: 'border-pink-500/20', cardHover: 'hover:border-pink-500/40 hover:bg-pink-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(236,72,153,0.3)]' },
  { id: 'thu', label: 'QUI', full: 'Quinta', gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-300', dot: 'bg-orange-500', over: 'bg-orange-500/15 border-orange-500/50', cardBg: 'bg-orange-500/[0.08]', cardBorder: 'border-orange-500/20', cardHover: 'hover:border-orange-500/40 hover:bg-orange-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)]' },
  { id: 'fri', label: 'SEX', full: 'Sexta', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-300', dot: 'bg-emerald-500', over: 'bg-emerald-500/15 border-emerald-500/50', cardBg: 'bg-emerald-500/[0.08]', cardBorder: 'border-emerald-500/20', cardHover: 'hover:border-emerald-500/40 hover:bg-emerald-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]' },
  { id: 'sat', label: 'SAB', full: 'Sábado', gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', text: 'text-cyan-300', dot: 'bg-cyan-500', over: 'bg-cyan-500/15 border-cyan-500/50', cardBg: 'bg-cyan-500/[0.08]', cardBorder: 'border-cyan-500/20', cardHover: 'hover:border-cyan-500/40 hover:bg-cyan-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)]' },
  { id: 'sun', label: 'DOM', full: 'Domingo', gradient: 'from-rose-500 to-red-500', bg: 'bg-rose-500/10', border: 'border-rose-500/25', text: 'text-rose-300', dot: 'bg-rose-500', over: 'bg-rose-500/15 border-rose-500/50', cardBg: 'bg-rose-500/[0.08]', cardBorder: 'border-rose-500/20', cardHover: 'hover:border-rose-500/40 hover:bg-rose-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)]' },
];

function TaskCard({ task, index, isBacklog, stableId, dayTheme, categories = [], onStartPomodoro }) {
  const sanitizeHtml = (str) => typeof str === 'string' ? str.replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, '').trim() : '';
  const rawText = task.text || task.title || '';
  const fullText = sanitizeHtml(rawText) || rawText;
  const parsed = parseCoachTask({ ...task, text: fullText }, categories);
  const subject = parsed.subjectRaw;
  const isSrsCard = Boolean(task?.analysis?.reason?.includes('SRS') || task?.text?.includes('SRS'));
  const isSafeCard = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaosCard = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));
  const isPriority = parsed.priority === 'high' || isSrsCard || isSafeCard || isChaosCard;
  const topicLabel = parsed.topic || fullText;
  const secondaryText = parsed.action && parsed.action !== parsed.topic ? parsed.action : '';
  const cardBg = !isBacklog && dayTheme ? dayTheme.cardBg : 'bg-slate-900/60';
  const cardBorder = !isBacklog && dayTheme ? dayTheme.cardBorder : 'border-white/[0.08]';
  const accentColor = !isBacklog && dayTheme ? dayTheme.text : 'text-violet-300';
  const accentBorder = !isBacklog && dayTheme ? dayTheme.border : 'border-violet-500/40';
  const gradientLine = !isBacklog && dayTheme ? dayTheme.gradient : 'from-violet-600 to-indigo-600';

  return (
    <Draggable draggableId={stableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2.5 outline-none select-none"
          style={provided.draggableProps.style}
        >
          <div
            className={`group relative p-2.5 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${
              snapshot.isDragging
                ? `bg-slate-800/95 backdrop-blur-xl border-2 ${accentBorder} shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5),0_0_20px_-5px_rgba(139,92,246,0.3)] scale-[1.04] rotate-1 z-[300]`
                : `${cardBg} ${cardBorder} hover:border-white/20 hover:bg-white/[0.04] shadow-sm`
            }`}
          >
            {!isBacklog && dayTheme && (
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradientLine} opacity-80 rounded-l-xl`} />
            )}
            <div className="flex flex-col gap-2 relative z-10">
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <GripVertical size={13} className="text-slate-500 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[9px] font-black uppercase tracking-widest truncate max-w-[calc(100%-8px)] ${
                      isBacklog
                        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                        : `bg-black/40 ${accentColor} border border-white/10`
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isBacklog ? (isPriority ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-violet-400') : 'bg-current'} shrink-0`} />
                    {/* PATCH: title tooltip */}
                    <span
                      className="truncate leading-normal"
                      title={displaySubject(subject, categories)}
                    >
                      {displaySubject(subject, categories)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartPomodoro?.(task, isBacklog ? 'backlog' : dayTheme?.id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  aria-label={`Iniciar estudo: ${displaySubject(subject, categories)}`}
                  title="Estudar agora no Pomodoro"
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                    !isBacklog && dayTheme
                      ? `${dayTheme.text} bg-white/5 hover:bg-white/15 hover:scale-110`
                      : 'bg-violet-500/15 text-violet-300 hover:bg-violet-500 hover:text-white hover:scale-110'
                  }`}
                >
                  <Play size={10} className="fill-current ml-0.5" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5 pl-0.5">
                <h4 className="text-[12px] font-bold leading-snug text-slate-100 group-hover:text-white break-words">
                  {topicLabel}
                </h4>
                {secondaryText && (
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                    {secondaryText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

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
      mon: cleanCol(coachPlanner.mon),
      tue: cleanCol(coachPlanner.tue),
      wed: cleanCol(coachPlanner.wed),
      thu: cleanCol(coachPlanner.thu),
      fri: cleanCol(coachPlanner.fri),
      sat: cleanCol(coachPlanner.sat),
      sun: cleanCol(coachPlanner.sun)
    };
  }, [coachPlan, coachPlanner]);

  const [columns, setColumns] = useState(() => getInitialColumns());
  const columnsRef = useRef(columns);

  // PATCH: contador em vez de boolean (sobrevive a Strict Mode)
  const skipResetCountRef = useRef(0);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    if (!isDragging) {
      if (skipResetCountRef.current > 0) {
        skipResetCountRef.current--;
        return;
      }
      setColumns(getInitialColumns());
    }
  }, [coachPlan, coachPlanner, getInitialColumns, isDragging]);

  const onDragEnd = (result) => {
    setIsDragging(false);
    // PATCH: sobrevive a 2 execuções do effect (Strict Mode)
    skipResetCountRef.current = 2;

    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    const currentCols = columnsRef.current;
    const startCol = currentCols[source.droppableId] || [];
    const finishCol = currentCols[destination.droppableId] || [];
    const startList = Array.from(startCol);
    const [removed] = startList.splice(source.index, 1);
    if (!removed) return;
    const finishList = (source.droppableId === destination.droppableId)
      ? startList
      : Array.from(finishCol);
    finishList.splice(destination.index, 0, removed);
    const newCols = {
      ...currentCols,
      [source.droppableId]: startList,
      [destination.droppableId]: finishList
    };
    setColumns(newCols);
    const systemAlerts = (coachPlan || []).filter(t => t && isSystemAlertTask(t));
    const newCoachPlan = [
      ...systemAlerts,
      ...(newCols.backlog || []),
      ...(newCols.mon || []), ...(newCols.tue || []), ...(newCols.wed || []),
      ...(newCols.thu || []), ...(newCols.fri || []), ...(newCols.sat || []),
      ...(newCols.sun || [])
    ];
    setData(prev => {
      if (!prev) return prev;
      const freshPlanner = { ...(prev.coachPlanner || {}) };
      Object.keys(freshPlanner).forEach(day => {
        freshPlanner[day] = [...(freshPlanner[day] || [])];
      });
      if (source.droppableId !== 'backlog') freshPlanner[source.droppableId] = startList;
      if (destination.droppableId !== 'backlog') freshPlanner[destination.droppableId] = finishList;
      return {
        coachPlanner: freshPlanner,
        coachPlan: newCoachPlan
      };
    });
  };

  const handleStartTask = useCallback((task, dayId) => {
    if (propOnStart) {
      propOnStart(task, dayId);
      return;
    }
    if (!task) return;
    const cols = columnsRef.current;
    const sessionTasks = dayId === 'backlog'
      ? (cols.backlog || [])
      : (cols[dayId] || []);
    const startIndex = sessionTasks.findIndex(t => {
      const idT = getSafeId(t);
      const idTask = getSafeId(task);
      if (idT && idTask) return idT === idTask;
      return t === task || (t.title && t.title === task.title);
    });
    if (startIndex === -1) {
      startNeuralSession([{ ...task, sourceContext: dayId || 'isolated' }], 0);
      navigate('/pomodoro');
      return;
    }
    const sessionWithContext = sessionTasks.map(t => ({ ...t, sourceContext: dayId }));
    startNeuralSession(sessionWithContext, startIndex);
    navigate('/pomodoro');
  }, [startNeuralSession, navigate, propOnStart]);

  if (!enabled) {
    return null;
  }

  return (
    <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
      <div className="flex flex-col xl:flex-row gap-5 items-stretch mt-3">
        <div className="w-full xl:w-72 2xl:w-80 shrink-0 flex flex-col">
          <div className="bg-slate-900/60 border border-white/[0.08] rounded-3xl p-4 sm:p-5 flex flex-col h-full min-h-[460px] relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.08]">
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <BrainCircuit size={16} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Sugestões</h3>
                <p className="text-[9px] font-semibold text-slate-400 tracking-wider">IA Coach</p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30">
                {columns.backlog.length}
              </span>
            </div>
            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 flex flex-col gap-1 p-2 rounded-2xl border border-dashed transition-colors overflow-y-auto max-h-[580px] custom-scrollbar ${
                    snapshot.isDraggingOver
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'bg-black/20 border-white/[0.08]'
                  }`}
                >
                  {(columns.backlog || []).filter(Boolean).map((task, idx) => {
                    const safeId = getSafeId(task) || `backlog-${idx}`;
                    return (
                      <TaskCard
                        key={safeId}
                        stableId={safeId}
                        task={task}
                        index={idx}
                        isBacklog
                        categories={categories}
                        onStartPomodoro={handleStartTask}
                      />
                    );
                  })}
                  {provided.placeholder}
                  {columns.backlog.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 my-auto">
                      <Sparkles size={20} className="mb-2 text-violet-400/50" />
                      <p className="text-xs font-medium text-slate-400">Tudo distribuído!</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Arraste itens de volta se quiser reorganizar.</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        <div className="w-full flex-1 min-w-0 flex flex-col">
          <div className="bg-slate-900/60 border border-white/[0.08] rounded-3xl p-4 sm:p-5 flex flex-col h-full relative backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                  <Calendar size={16} className="text-indigo-400" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Planejamento Semanal</h3>
                  <p className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase">Agenda do Aluno</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto kanban-scrollbar pb-3 pt-1">
              {/* PATCH: min-w responsivo */}
              <div className="flex gap-2.5 min-w-[900px] xl:min-w-[1100px] 2xl:min-w-full">
                {DAYS.map((day) => {
                  const dayTasks = columns[day.id] || [];
                  return (
                    /* PATCH: min-w por coluna responsivo */
                    <div key={day.id} className="flex-1 min-w-[128px] xl:min-w-[155px] flex flex-col">
                      <div className={`mb-3 rounded-2xl border ${day.border} ${day.bg} p-2.5 relative overflow-hidden`}>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className={`text-sm font-black tracking-widest ${day.text} uppercase pb-[1px]`}>
                              {day.label}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 capitalize mt-0.5 leading-normal pb-[1px]">
                              {day.full}
                            </span>
                          </div>
                          <div className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${day.text} bg-black/30 border ${day.border}`}>
                            {dayTasks.length}
                          </div>
                        </div>
                      </div>
                      <Droppable droppableId={day.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 p-2 rounded-xl border border-dashed transition-colors flex flex-col min-h-[220px] max-h-[580px] overflow-y-auto custom-scrollbar ${
                              snapshot.isDraggingOver
                                ? `${day.over} scale-[1.01]`
                                : 'bg-black/20 border-white/[0.08] hover:border-white/15'
                            }`}
                          >
                            {dayTasks.filter(Boolean).map((task, idx) => {
                              const safeId = getSafeId(task) || `${day.id}-${idx}`;
                              return (
                                <TaskCard
                                  key={safeId}
                                  stableId={safeId}
                                  task={task}
                                  index={idx}
                                  isBacklog={false}
                                  dayTheme={day}
                                  categories={categories}
                                  onStartPomodoro={handleStartTask}
                                />
                              );
                            })}
                            {provided.placeholder}
                            {dayTasks.length === 0 && !snapshot.isDraggingOver && (
                              <div className={`w-full min-h-[120px] flex items-center justify-center border border-dashed ${day.border} opacity-40 rounded-xl p-3 text-center my-1 bg-black/10 transition-colors`}>
                                <span className={`text-[10px] font-semibold tracking-wider uppercase ${day.text} opacity-70`}>Arraste aqui</span>
                              </div>
                            )}
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