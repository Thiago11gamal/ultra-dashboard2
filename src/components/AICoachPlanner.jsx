import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Play, BrainCircuit, CalendarDays, GripVertical, Sparkles, Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { isSystemAlertTask, parseCoachTask } from '../utils/coachText';
import { hashString } from '../utils/coachSafe';

// FIX (BUG-07): ID determinístico via hash de conteúdo — sem contador mutável no render.
const _taskIdWeakMap = new WeakMap();
const ensureCoachTaskId = (task) => {
  if (!task || typeof task !== 'object') return task;
  if (task.id) return task; // FIX: não clona quem já tem id (estabilidade referencial)
  const cached = _taskIdWeakMap.get(task);
  if (cached) return { ...task, id: cached };
  const stableId =
    getSafeId(task) ||
    `coach-task-${hashString(`${task.title || ''}|${task.text || ''}|${task.categoryId || ''}`)}`;
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
          role="listitem"
          style={
            snapshot.isDragging
              ? {
                ...provided.draggableProps.style,
                ...(snapshot.draggingOver && snapshot.draggingOver !== 'backlog'
                  ? { width: '180px' }
                  : {})
              }
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
            className={`group relative mb-2 rounded-lg border py-2.5 pr-2.5 select-none cursor-grab active:cursor-grabbing transition-colors duration-75 ${snapshot.isDragging
                ? 'border-violet-400 bg-[#161b2c] ring-2 ring-violet-400/40 z-[9999]'
                : isBacklog
                  ? 'border-white/[0.07] bg-[#12151f] hover:border-violet-400/30 hover:bg-[#161a28]'
                  : `${dayTheme.cardBorder} ${dayTheme.cardBg} hover:border-white/20`
              }`}
          >
            <span
              className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-gradient-to-b opacity-90 z-0 ${isBacklog
                  ? (isPriority ? 'from-amber-400 to-amber-500' : 'from-violet-500 to-indigo-500')
                  : dayTheme.gradient
                }`}
            />
            <div className="relative z-10 w-full flex flex-col h-full pl-0.5">
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
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all ${!isBacklog && dayTheme
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
}, (prev, next) => (
  prev.stableId === next.stableId &&
  prev.index === next.index &&
  prev.isBacklog === next.isBacklog &&
  prev.dayTheme?.id === next.dayTheme?.id &&
  prev.task?.id === next.task?.id &&
  prev.task?.text === next.task?.text &&
  prev.task?.title === next.task?.title &&
  prev.onStartPomodoro === next.onStartPomodoro
));

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

  // ==========================================================
  // FIX (BUG-02/03/04): FONTE ÚNICA DE VERDADE.
  // `storeColumns` é derivado do store; `dragColumns` é um override
  // congelado SOMENTE durante o drag. Não há mais useEffect de reset
  // nem skipResetCountRef — nada para dessincronizar.
  // ==========================================================
  const deriveColumns = useCallback((plan, planner) => {
    const assigned = new Set();
    DAYS.forEach(d => (planner?.[d.id] || []).forEach(t => {
      const sid = getSafeId(ensureCoachTaskId(t));
      if (sid) assigned.add(sid);
    }));
    const seen = new Set(); // FIX (BUG-08): dedupe de draggableId entre colunas
    const take = (t) => {
      if (!t) return null;
      const withId = ensureCoachTaskId(t);
      const sid = getSafeId(withId);
      if (!sid || seen.has(sid)) return null;
      seen.add(sid);
      return withId;
    };
    const backlog = [];
    for (const t of (Array.isArray(plan) ? plan : [])) {
      if (!t || isSystemAlertTask(t)) continue;
      const sid = getSafeId(t);
      if (sid && assigned.has(sid)) continue;
      const item = take(t);
      if (item) backlog.push(item);
    }
    const cleanCol = (arr) => {
      const out = [];
      for (const t of (Array.isArray(arr) ? arr : [])) {
        const item = take(t);
        if (item) out.push(item);
      }
      return out;
    };
    return {
      backlog,
      mon: cleanCol(planner?.mon), tue: cleanCol(planner?.tue),
      wed: cleanCol(planner?.wed), thu: cleanCol(planner?.thu),
      fri: cleanCol(planner?.fri), sat: cleanCol(planner?.sat),
      sun: cleanCol(planner?.sun)
    };
  }, []);

  const storeColumns = useMemo(
    () => deriveColumns(coachPlan, coachPlanner),
    [coachPlan, coachPlanner, deriveColumns]
  );

  const [dragColumns, setDragColumns] = useState(null);
  const columns = dragColumns || storeColumns;

  // FIX (BUG-01): contadores AO VIVO durante o drag
  const [dragInfo, setDragInfo] = useState(null); // { source, destination }
  const [hoveredCol, setHoveredCol] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tracking global do ponteiro (acende colunas imediatamente, inclusive no header)
  useEffect(() => {
    if (!isDragging) {
      return;
    }
    let animationFrameId;
    const updateHover = (clientX, clientY) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        // FIX (BUG-05): rects recalculados por frame (8 colunas é barato) —
        // não congela no início do drag, sobrevive a scroll.
        const cols = document.querySelectorAll('[data-col-id]');
        let found = null;
        for (const col of cols) {
          const rect = col.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom) {
            found = col.getAttribute('data-col-id');
            break;
          }
        }
        setHoveredCol(prev => (prev === found ? prev : found));
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

  const onDragStart = useCallback((start) => {
    setIsDragging(true);
    setDragColumns(storeColumns); // congela snapshot local só durante o drag
    setDragInfo({ source: start?.source?.droppableId ?? null, destination: null });
  }, [storeColumns]);

  const onDragUpdate = useCallback((update) => {
    setDragInfo(prev => {
      const source = update?.source?.droppableId ?? null;
      const destination = update?.destination?.droppableId ?? null;
      if (prev && prev.source === source && prev.destination === destination) return prev;
      return { source, destination };
    });
  }, []);

  // ==========================================================
  // FIX (BUG-03): o drop aplica a OPERAÇÃO de mover sobre o snapshot
  // ATUAL do store (dentro do setData), nunca um snapshot local stale.
  // Atualizações externas ocorridas durante o drag são preservadas.
  // ==========================================================
  const onDragEnd = useCallback((result) => {
    setIsDragging(false);
    setHoveredCol(null); // Fix cascading render transferido do useEffect
    setDragColumns(null);
    setDragInfo(null);

    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setData(prev => {
      if (!prev) return prev;
      const cur = deriveColumns(
        Array.isArray(prev.coachPlan) ? prev.coachPlan : Object.values(prev.coachPlan || {}),
        prev.coachPlanner || {}
      );
      const startList = [...(cur[source.droppableId] || [])];
      
      // FIX: Guard contra bounds errados e busca pelo draggableId real
      const realSourceIndex = startList.findIndex(t => getSafeId(t) === result.draggableId || t.id === result.draggableId);
      if (realSourceIndex === -1) return prev;

      const [moved] = startList.splice(realSourceIndex, 1);
      if (!moved) return prev;
      
      const finishList = (source.droppableId === destination.droppableId)
        ? startList
        : [...(cur[destination.droppableId] || [])];
        
      const safeDestIndex = Math.max(0, Math.min(destination.index, finishList.length));
      finishList.splice(safeDestIndex, 0, moved);

      const nextCols = {
        ...cur,
        [source.droppableId]: startList,
        [destination.droppableId]: finishList
      };

      const existingPlan = Array.isArray(prev.coachPlan) ? prev.coachPlan : Object.values(prev.coachPlan || {});
      const systemAlerts = existingPlan.filter(t => t && isSystemAlertTask(t));
      const nextPlan = [
        ...systemAlerts,
        ...(nextCols.backlog || []),
        ...DAYS.flatMap(d => nextCols[d.id] || [])
      ];
      const freshPlanner = {};
      DAYS.forEach(d => { freshPlanner[d.id] = nextCols[d.id] || []; });

      return { coachPlanner: freshPlanner, coachPlan: nextPlan };
    });
  }, [setData, deriveColumns]);

  const handleStartTask = useCallback((task, dayId) => {
    if (propOnStart) { propOnStart(task, dayId); return; }
    if (!task) return;
    // FIX: lê `columns` derivado (nunca ref stale)
    const sessionTasks = columns[dayId || 'backlog'] || [];
    const taskToFind = getSafeId(task);
    const startIndex = sessionTasks.findIndex(t => {
      const idT = getSafeId(t);
      return (taskToFind && idT === taskToFind) || t === task || (t?.title && t.title === task?.title);
    });
    if (startIndex === -1) {
      startNeuralSession([{ ...task, sourceContext: dayId || 'isolated' }], 0);
      navigate('/pomodoro');
      return;
    }
    startNeuralSession(sessionTasks.map(t => ({ ...t, sourceContext: dayId })), startIndex);
    navigate('/pomodoro');
  }, [columns, startNeuralSession, navigate, propOnStart]);

  // FIX (BUG-01): contador ao vivo (−1 na origem, +1 no destino durante o drag)
  const liveCount = useCallback((colId, base) => {
    if (!dragInfo) return base;
    let n = base;
    if (dragInfo.source === colId) n -= 1;
    if (dragInfo.destination === colId) n += 1;
    return Math.max(0, n);
  }, [dragInfo]);

  const liveWeekTotal = useMemo(
    () => DAYS.reduce((acc, d) => acc + liveCount(d.id, (columns[d.id] || []).length), 0),
    [columns, liveCount]
  );

  // FIX (BUG-09): removido o gate `enabled` (flash de primeiro frame).

  return (
    <DragDropContext onDragStart={onDragStart} onDragUpdate={onDragUpdate} onDragEnd={onDragEnd}>
      <div className="flex flex-col xl:flex-row gap-4 items-stretch mt-6 w-full">
        {/* ================= BACKLOG ================= */}
        <div className="w-full xl:w-72 2xl:w-80 shrink-0 flex flex-col" data-col-id="backlog">
          <div className="bg-[#0d111b]/95 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col flex-1 min-h-[380px] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <Droppable droppableId="backlog">
              {(provided, snapshot) => {
                const isHighlight = hoveredCol ? (hoveredCol === 'backlog') : snapshot.isDraggingOver;
                const backlogCount = liveCount('backlog', (columns.backlog || []).length);
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
                        {backlogCount}
                      </span>
                    </div>
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      role="list"
                      aria-label="Sugestões de tarefas não alocadas"
                      className={`flex-1 flex flex-col p-2 rounded-lg border border-dashed transition-all duration-75 overflow-y-auto max-h-[580px] custom-scrollbar ${isHighlight
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
                )
              }}
            </Droppable>
          </div>
        </div>

        {/* ================= SEMANA ================= */}
        <div className="w-full flex-1 min-w-0 flex flex-col">
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
                {liveWeekTotal} tarefa{liveWeekTotal === 1 ? '' : 's'} na semana
              </span>
            </div>
            <div className="w-full overflow-x-auto kanban-scrollbar pb-2 pt-1 flex-1 flex flex-col">
              <div className="flex gap-3 min-w-[900px] xl:min-w-0 w-full flex-1">
                {DAYS.map((day) => {
                  const dayTasks = columns[day.id] || [];
                  const dayCount = liveCount(day.id, dayTasks.length);
                  return (
                    <div key={day.id} className="flex-1 min-w-[130px] xl:min-w-0 flex flex-col" data-col-id={day.id}>
                      <Droppable droppableId={day.id}>
                        {(provided, snapshot) => {
                          const isHighlight = hoveredCol ? (hoveredCol === day.id) : snapshot.isDraggingOver;
                          return (
                            <div className={`flex-1 flex flex-col p-1 rounded-lg transition-colors duration-75 ${isHighlight ? 'bg-white/5 shadow-xl' : ''}`}>
                              <div className={`mb-2 rounded-lg border transition-all duration-75 ${isHighlight ? `${day.over} shadow-[0_0_15px_rgba(255,255,255,0.05)]` : `${day.headerBorder} ${day.headerBg}`
                                } p-2 relative overflow-hidden`}>
                                <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${day.gradient} opacity-70`} />
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-xs sm:text-[13px] font-black tracking-wider ${day.text} uppercase pb-[1px] transition-transform duration-75 truncate ${isHighlight ? 'scale-105 origin-left' : ''}`}>{day.label}</span>
                                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 capitalize mt-0.5 leading-none truncate">{day.full}</span>
                                  </div>
                                  <div className={`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${day.text} bg-black/30 border shrink-0 transition-colors duration-75 ${isHighlight ? day.over : day.headerBorder}`}>
                                    {dayCount}
                                  </div>
                                </div>
                              </div>
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                role="list"
                                aria-label={`Tarefas de ${day.full}`}
                                className={`flex-1 p-1.5 rounded-lg border border-dashed transition-all duration-75 flex flex-col min-h-[160px] max-h-[580px] overflow-y-auto kanban-scrollbar ${isHighlight
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
                          )
                        }}
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