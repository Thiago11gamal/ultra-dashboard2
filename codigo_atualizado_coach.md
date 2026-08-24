# Código Atualizado e Dependências - Coach AI

Este arquivo contém o código fonte completo dos arquivos principais e de todas as dependências adicionais (risco embutido) apontadas.

## src/components/AICoachPlanner.jsx

`jsx
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
      const sid = getSafeId(t);
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
      setHoveredCol(null);
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
      
      // FIX: Guard contra bounds errados
      if (source.index < 0 || source.index >= startList.length) return prev;

      const [moved] = startList.splice(source.index, 1);
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

  const weekTotal = useMemo(
    () => DAYS.reduce((acc, d) => acc + (columns[d.id] || []).length, 0),
    [columns]
  );
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
`

## src/components/AICoachView.jsx

`jsx
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
  const isSrsTask = Boolean(task?.analysis?.reason?.includes('SRS') || fullText.includes('SRS'));
  const isSafeTask = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção') || fullText.includes('Cruzeiro') || fullText.includes('Manutenção'));
  const isChaosTask = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos') || fullText.includes('Oscilação') || fullText.includes('Caos'));
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
`

## src/components/AICoachWidget.jsx

`jsx
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

function renderRecommendation(text, depth = 0) {
  if (depth > 6) return String(text || '');
  const safeText = String(text || '');
  
  const parts = safeText.split(RX_REC_MARKUP).filter(Boolean);
  return parts.map((part, idx) => {
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
  const domainSpread = domain.max - domain.min;
  const volPct = Number.isFinite(volatility) && volatility > 0 && domainSpread > 0
    ? Math.min(15, Math.max(3, volatility * 1.96 / (domainSpread / 100)))
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
`

## src/components/coach/CoachControlCenter.jsx

`jsx
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

      {dashboard?.focus && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🎯">Foco Principal</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-lg font-bold text-white">{dashboard.focus?.name || '—'}</p>
              <p className="text-sm text-slate-400 mt-1">
                Urgência: <span className="text-indigo-300 font-semibold">{dashboard.focus?.normalizedScore ?? '—'}</span>
              </p>
              {dashboard.focus?.probability != null && Number.isFinite(Number(dashboard.focus.probability)) && (
                <p className="text-sm text-slate-400">
                  Probabilidade MC: <span className="text-cyan-300 font-semibold">{Number(dashboard.focus.probability)}%</span>
                </p>
              )}
            </div>
            {dashboard.focus?.recommendation && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase mb-1">Recomendação</p>
                <p className="text-sm text-slate-300">{dashboard.focus.recommendation}</p>
              </div>
            )}
          </div>
          {dashboard.focus?.llmExplanation && (
            <div className="mt-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-400 uppercase mb-1 flex items-center gap-1">🤖 Explicação IA</p>
              <p className="text-sm text-indigo-200">{dashboard.focus.llmExplanation.headline}</p>
              {dashboard.focus.llmExplanation?.recommendation && (
                <p className="text-xs text-indigo-300/70 mt-2">{dashboard.focus.llmExplanation.recommendation}</p>
              )}
            </div>
          )}
        </div>
      )}

      {dashboard?.tasks && dashboard.tasks.length > 0 && (
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

      {dashboard?.health && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🏥">Saúde do Modelo</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-white">{dashboard.health?.healthScore ?? '—'}</div>
            <div>
              <StatusBadge status={dashboard.health?.status} />
              {dashboard.health?.alertsCount > 0 && (
                <p className="text-xs text-slate-400 mt-1">{dashboard.health.alertsCount} alerta(s) ativo(s)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {dashboard?.causal && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle icon="🔬">Modelo Causal</SectionTitle>
          {dashboard.causal?.available ? (
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

`

## src/components/coach/CoachMenuNav.jsx

`jsx
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

`

## src/engine/evaluation/coachEvaluator.js

`javascript
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

  const rawPredicted = (Array.isArray(predictedTopics) ? predictedTopics : [])
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
    });

  // FIX: deduplicar para evitar collision hits inflando o Recall
  const predictedMap = new Map();
  for (const p of rawPredicted) {
    if (!predictedMap.has(p.id) || p.score > predictedMap.get(p.id).score) {
      predictedMap.set(p.id, p);
    }
  }
  const safePredicted = Array.from(predictedMap.values()).sort((a, b) => b.score - a.score);

  const rawActual = (Array.isArray(actualTopics) ? actualTopics : [])
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

  const actualMap = new Map();
  for (const a of rawActual) {
    if (!actualMap.has(a.id) || a.relevance > actualMap.get(a.id).relevance) {
      actualMap.set(a.id, a);
    }
  }
  const safeActual = Array.from(actualMap.values());

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

`

## src/engine/orchestrator/coachOrchestrator.js

`javascript
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
import { writeFlags, readFlags } from '../../utils/coachFeatureStore.js';

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
    const storeFlags = readFlags();
    if (typeof storeFlags[key] === 'boolean') {
      return storeFlags[key];
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
  let timeoutId;
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
    if (!path || !ALLOWED_PATHS.has(path)) {
      meta.modules[name] = false;
      return null;
    }
    const importPromise = import(/* @vite-ignore */ path);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Import timeout: ${name}`)), 3000);
    });
    const module = await Promise.race([importPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    meta.modules[name] = true;
    return module;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
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

  const checkAbort = (stepName) => {
    if (controller.signal.aborted) {
      meta.errors.push({ step: stepName, message: 'Timeout exceeded' });
      throw new Error(`Orchestrator aborted at step: ${stepName}`);
    }
    return false;
  };

  try {
    // Flags iniciais.
    let features = {};
    const baseFeatures = readFlags();
    const optionFeatures = options.features || {};
    for (const [k, v] of Object.entries({ ...baseFeatures, ...optionFeatures })) {
      if (typeof k === 'string' && typeof v === 'boolean') features[k] = v;
    }
    writeFlags(features);

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
        const updatedBase = readFlags();
        features = {};
        for (const [k, v] of Object.entries({ ...updatedBase, ...optionFeatures })) {
          if (typeof k === 'string' && typeof v === 'boolean') features[k] = v;
        }
        writeFlags(features);
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

    if (shouldRunHealth && !checkAbort('observability')) {
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

    if (shouldLoadCausal && !checkAbort('causal')) {
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
      !checkAbort('causalTaskRerank')
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

    if (shouldRunLLM && focus?.urgency && !checkAbort('llmExplanation')) {
      const explanationModule = await loadOptionalModule(
        'explanationAgent',
        meta
      );
      if (explanationModule?.enhanceCoachResultWithLLM) {
        try {
          const llmTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LLM timeout')), 5000)
          );
          const enhanced = await Promise.race([
            explanationModule.enhanceCoachResultWithLLM(
              focus.urgency,
              {
                features,
                context: {
                  categoryName: focus.name || focus.categoryName || null,
                  maxScore,
                  targetScore,
                },
              }
            ),
            llmTimeout
          ]);
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

    if (shouldRunTuner && !checkAbort('autoTuner')) {
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
      aborted: controller.signal.aborted,
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
  } catch (err) {
    return {
      ok: false,
      generatedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      version: ORCHESTRATOR_VERSION,
      aborted: controller.signal.aborted,
      error: err?.message || String(err),
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
      ? safeResult.tasks.filter(Boolean).slice(0, 12).map((task) => ({
          id: task?.id || null,
          text: task?.text || null,
          priority: ['high', 'medium', 'low'].includes(task?.priority) ? task.priority : 'medium',
          categoryId: task?.categoryId || null,
          categoryName: task?.catName || task?.category || null,
          topicName: task?.topicName || null,
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

`

## src/hooks/useCoachControlCenter.js

`javascript
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
import { replaceFlags, writeFlags } from '../utils/coachFeatureStore.js';

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
      const next = { ...baseline };
      replaceFlags(next);
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
    const next = writeFlags({ [flagKey]: value });
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

`

## src/llm/coachLLMIntegration.js

`javascript
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

`

## src/pages/Coach.jsx

`jsx
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

const EMPTY_ARRAY = Object.freeze([]);

function normalizeToArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return EMPTY_ARRAY;
}
function sanitizeMaxScore(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 100;
}
// ✅ FIX: elimina "-0.0" (zero negativo do toFixed) em displays de tendência/volatilidade
function formatSigned(value, digits = 1) {
  const n = Number(value) || 0;
  const fixed = n.toFixed(digits);
  return fixed === `-${(0).toFixed(digits)}` ? (0).toFixed(digits) : fixed;
}
function resolveTargetScorePoints({ user, minScore = 0, maxScore = 100 }) {
  const safeMax = sanitizeMaxScore(maxScore);
  const safeMin = Math.max(0, Math.min(Number(minScore) || 0, safeMax));
  const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));
  if (user?.targetScore != null && user.targetScore !== '' && Number.isFinite(Number(user.targetScore))) {
    let ts = Number(user.targetScore);
    const isPercent = user.targetScoreType === 'percent' || (!user.targetScoreType && ts <= 100 && safeMax !== 100);
    if (isPercent) {
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
    // FIX: array estável congelado
    timelineDates: EMPTY_ARRAY,
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
    const timers = { analysis: null, metrics: null };
    timers.analysis = setTimeout(() => {
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
          timers.metrics = setTimeout(() => {
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
      clearTimeout(timers.analysis);
      clearTimeout(timers.metrics);
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
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-900/50 border border-white/10 p-2 sm:p-3 rounded-3xl backdrop-blur-xl shadow-inner overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-3 sm:gap-5 md:gap-6 sm:px-4 px-2 min-w-max flex-shrink-0">
                <QuickStat
                  label="Volatilidade"
                  value={`${formatSigned(normalizedVolatility)}pp`}
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
                  value={`${formatSigned((drift * 30) / Math.max(1, Number(currentMaxScore) || 1) * 100)}pp`}
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
`

## src/utils/calibration.js

`javascript
import { kahanSum } from '../engine/math/kahan.js';
import { getDateKey, normalizeDate } from './dateHelper.js';
import { getSafeScore } from './scoreHelper.js';
import { isSubjectMatch } from './normalization.js';

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

// [LOTE 5] PAV extraído para reuso com restrição de bloco mínimo
function pavBlocks(blocks) {
  let i = 0;
  let iterations = 0;
  const maxIterations = Math.max(100, blocks.length * 10); // ✅ FIX #3: Guard contra loop infinito
  
  while (i < blocks.length - 1 && iterations < maxIterations) {
    iterations++;
    if (blocks[i].mean <= blocks[i + 1].mean) { i++; continue; }
    const a = blocks[i], b = blocks[i + 1];
    // ✅ FIX #3: Check sumW > 0 para evitar divisão por zero
    const sumW = a.sumW + b.sumW;
    if (sumW <= 0) { i++; continue; }
    const merged = { minX: a.minX, maxX: b.maxX, sumWY: a.sumWY + b.sumWY, sumW: sumW, mean: 0 };
    merged.mean = merged.sumWY / sumW;
    blocks.splice(i, 2, merged);
    if (i > 0) i--;
  }
  
  if (iterations >= maxIterations) {
    console.warn('[calibration] pavBlocks atingiu limite de iterações, possível convergência lenta');
  }
  return blocks;
}

export function computeBrierScore(probability01, observedBinary) {
  const rawP = Number(probability01);
  if (!Number.isFinite(rawP)) return null;
  const p = Math.max(0, Math.min(1, rawP));
  const y = observedBinary ? 1 : 0;
  return (p - y) ** 2;
}

export function computeLogLoss(probability01, observedBinary) {
  const epsilon = 1e-15;
  const rawP = Number(probability01);
  const safeP = Number.isFinite(rawP) ? rawP : 0.5;
  const p = Math.max(epsilon, Math.min(1 - epsilon, safeP));
  const y = observedBinary ? 1 : 0;
  return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
}

export function summarizeCalibration(scores = [], options = {}) {
  const maxPenalty = Math.max(0, Math.min(1, Number(options.maxPenalty) || 0.25));
  const baseline = Number.isFinite(options.baseline) ? options.baseline : 0.18;
  // FIX M5: entrada vazia NÃO retorna mais "Brier 0 = perfeito"
  if (!Array.isArray(scores) || scores.length === 0) {
    return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  }
  const finiteScores = scores.map(v => Number(v)).filter(Number.isFinite);
  if (finiteScores.length === 0) return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  const sorted = [...finiteScores].sort((a, b) => a - b);
  const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
  const core = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
  const avgBrier = kahanSum(core) / core.length;
  const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
  return { avgBrier, calibrationPenalty, sampleSize: finiteScores.length };
}

export function computeCalibrationDiagnostics(pairs = [], options = {}) {
  const bins = Math.max(2, Number(options.bins) || 5);
  if (!Array.isArray(pairs) || pairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };
  const cleanPairs = pairs
    .map((p) => ({
      probability: Math.max(0, Math.min(1, Number(p?.probability))),
      observed: Math.max(0, Math.min(1, Number(p?.observed)))
    }))
    .filter((p) => Number.isFinite(p.probability) && Number.isFinite(p.observed));
  if (cleanPairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };
  const sorted = [...cleanPairs].sort((a, b) => a.probability - b.probability);
  let ece = 0;
  let mce = 0;
  const reliability = [];
  const overallObserved = kahanSum(cleanPairs.map(p => p.observed)) / cleanPairs.length;
  let relTerm = 0;
  let resTerm = 0;
  // [LOTE 5] ECE equal-frequency quando n < 20 (menos variância); equal-width p/ n grande
  const strategy = options.binStrategy || 'auto';
  const useQuantile = strategy === 'quantile' || (strategy === 'auto' && cleanPairs.length < 20);
  const edges = [];
  for (let i = 0; i <= bins; i++) {
    if (i === 0) edges.push(-0.01);
    else if (i === bins) edges.push(1.01);
    else if (!useQuantile) edges.push(i / bins);
    else edges.push(sorted[Math.floor((i / bins) * sorted.length)].probability);
  }
  for (let i = 1; i < edges.length - 1; i++) edges[i] = Math.max(edges[i], edges[i - 1] + 1e-6);
  for (let i = 0; i < bins; i++) {
    const binMin = edges[i];
    const binMax = edges[i + 1];
    const slice = sorted.filter(p => p.probability >= binMin && p.probability < binMax);
    if (slice.length === 0) continue;
    const meanPred = kahanSum(slice.map(p => p.probability)) / slice.length;
    const observedRate = kahanSum(slice.map(p => p.observed)) / slice.length;
    const gap = Math.abs(meanPred - observedRate);
    const weight = slice.length / cleanPairs.length;
    ece += weight * gap;
    mce = Math.max(mce, gap);
    relTerm += weight * ((meanPred - observedRate) ** 2);
    resTerm += weight * ((observedRate - overallObserved) ** 2);
    reliability.push({ bin: i + 1, binMin, binMax, count: slice.length, meanPred, observedRate, gap });
  }
  const uncertainty = overallObserved * (1 - overallObserved);
  return { ece, mce, reliability, brierDecomposition: { reliability: relTerm, resolution: resTerm, uncertainty } };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
  const p = Math.max(0, Math.min(100, probabilityPct ?? 0));
  const limit = Math.max(0, Math.min(1, maxAppliedPenalty ?? 0.5));
  const k = Math.max(0, Math.min(limit, penalty ?? 0));
  const neutral = Math.max(0, Math.min(100, neutralPct ?? 50));
  return p * (1 - k) + neutral * k;
}

// FIX: sem storeUpdateFn — retorna evento validado (loop de aprendizagem)
export function recordPredictionEvent(prediction = {}) {
  const prob = clamp01(prediction.probability);
  return {
    timestamp: Number.isFinite(Number(prediction.timestamp)) ? Number(prediction.timestamp) : Date.now(),
    probability: prob,
    probabilityRaw: Number.isFinite(Number(prediction.probabilityRaw)) ? clamp01(prediction.probabilityRaw) : prob,
    observed: prediction.observed != null ? (prediction.observed ? 1 : 0) : null,
    targetScore: Number.isFinite(Number(prediction.targetScore)) ? Number(prediction.targetScore) : null,
    sims: Number(prediction.sims) || 5000,
    category: prediction.category || 'global',
    effectiveN: Number.isFinite(Number(prediction.effectiveN)) ? Number(prediction.effectiveN) : null
  };
}

export function computeCalibrationSummary(events = [], options = {}) {
  const clean = (events || []).filter(e =>
    Number.isFinite(e?.probability) && (e?.observed === 0 || e?.observed === 1)
  );
  if (clean.length < 3) {
    return { n: clean.length, ece: 0, avgBrier: 0, reliability: [], trend: 'insufficient_data' };
  }
  const diag = computeCalibrationDiagnostics(clean.map(e => ({ probability: e.probability, observed: e.observed })), { bins: options.bins || 6 });
  const briers = clean.map(e => computeBrierScore(e.probability, e.observed));
  const avgBrier = kahanSum(briers) / briers.length;
  const mid = Math.floor(clean.length / 2);
  const firstHalf = briers.slice(0, mid);
  const secondHalf = briers.slice(mid);
  const firstAvg = firstHalf.length ? kahanSum(firstHalf) / firstHalf.length : avgBrier;
  const secondAvg = secondHalf.length ? kahanSum(secondHalf) / secondHalf.length : avgBrier;
  const trend = secondAvg < firstAvg * 0.92 ? 'improving' : (secondAvg > firstAvg * 1.08 ? 'degrading' : 'stable');
  return {
    n: clean.length, ece: diag.ece, mce: diag.mce,
    avgBrier: Number(avgBrier.toFixed(4)),
    reliability: diag.reliability, trend, brierDecomposition: diag.brierDecomposition
  };
}

// FIX M4: imutável, causal (ts >= evento) e targetScore null-safe
export function backfillObservedFromSimulados(calibrationEvents = [], simuladoRows = [], _categories = [], maxScore = 100) {
  if (!Array.isArray(calibrationEvents)) return [];
  if (!Array.isArray(simuladoRows) || simuladoRows.length === 0) return calibrationEvents;
  const timed = simuladoRows
    .map(row => {
      const parsed = normalizeDate(row?.date || row?.createdAt);
      return { row, ts: parsed ? parsed.getTime() : NaN };
    })
    .filter(x => Number.isFinite(x.ts))
    .sort((a, b) => a.ts - b.ts);
  if (timed.length === 0) return calibrationEvents;
  return calibrationEvents.map(ev => {
    if (!ev || ev.observed != null || !ev.category) return ev;
    if (ev.targetScore == null || !Number.isFinite(Number(ev.timestamp))) return ev;
    // ✅ LOTE-03 FIX (C6): eventos com category 'global' NUNCA casavam porque
    // simuladoRows são registros POR MATÉRIA — o loop de aprendizagem global
    // estava morto (observed ficava null para sempre).
    let score = null;
    let observedAt = null;
    if (String(ev.category).toLowerCase() === 'global') {
      // Agrega as rows do PRIMEIRO dia de simulado após o evento
      // (média ponderada por total de questões quando disponível).
      const candidates = timed.filter(x => x.ts >= Number(ev.timestamp));
      if (candidates.length > 0) {
        const firstDayKey = getDateKey(candidates[0].row.date || candidates[0].row.createdAt);
        if (!firstDayKey) return ev; // ✅ FIX: data inválida → pular evento
        const sameDay = candidates.filter(x => {
          const key = getDateKey(x.row.date || x.row.createdAt);
          return key !== null && key === firstDayKey; // ✅ FIX: excluir nulls
        });
        let sumScore = 0;
        let sumWeight = 0;
        sameDay.forEach(x => {
          const s = getSafeScore(x.row, maxScore);
          if (!Number.isFinite(s)) return;
          const w = Math.max(1, Number(x.row.total) || 1);
          sumScore += s * w;
          sumWeight += w;
        });
        if (sumWeight > 0) {
          score = sumScore / sumWeight;
          observedAt = candidates[0].ts;
        }
      }
    } else {
      const hit = timed.find(x =>
        x.ts >= Number(ev.timestamp) &&
        isSubjectMatch(ev.category, x.row.subject || x.row.categoryName)
      );
      if (hit) {
        score = getSafeScore(hit.row, maxScore);
        observedAt = hit.ts;
      }
    }
    if (score === null || !Number.isFinite(score)) return ev;
    return { ...ev, observed: score >= Number(ev.targetScore) ? 1 : 0, backfilled: true, observedAt };
  });
}

// FIX F1: baseline posterior que aprende (fallback avgBrier + pesos corretos)
export function computeRollingCalibrationParams(history = [], cfg = {}) {
  const safeHistory = Array.isArray(history) ? history : [];
  const windowDays = Number(cfg.windowDays) || 60;
  const cutoff = Date.now() - windowDays * 86400000;
  const maxSamples = Number(cfg.maxSamples) || 20;

  const isSignalEvent = (h) => {
    if (!h || !Number.isFinite(Number(h?.timestamp))) return false;
    const hasObserved = Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1);
    const hasBrier = Number.isFinite(Number(h.avgBrier));
    return hasObserved || hasBrier;
  };

  const recent = safeHistory
    .filter(h => isSignalEvent(h) && Number(h.timestamp) >= cutoff)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .slice(-maxSamples);

  const minSamples = Number(cfg.minSamples) || 4;
  if (recent.length < minSamples) {
    return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  }
  const now = Date.now();
  const LAMBDA = Math.log(2) / (14 * 86400000);
  let sw = 0, swb = 0;
  for (const h of recent) {
    let b = null;
    if (Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1)) {
      const rawP = Number(h.probability);
      const isPercentScale = cfg.scale === 'pct' || (cfg.scale !== 'ratio' && rawP > 1 && rawP <= 100);
      // ✅ FIX: detecção de escala suportada por flag explícita cfg.scale
      const p = Math.max(0, Math.min(1, isPercentScale ? rawP / 100 : rawP));
      b = (p - h.observed) ** 2;
    } else if (Number.isFinite(Number(h.avgBrier))) {
      b = Number(h.avgBrier);
    }
    if (b === null) continue;
    const w = Math.exp(-LAMBDA * Math.max(0, now - Number(h.timestamp)));
    swb += b * w; sw += w;
  }
  if (sw <= 1e-9) return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  const kappa = Number(cfg.priorStrength) || 6;
  const mu0 = Number(cfg.baseline) || 0.2;
  const baseline = (swb + kappa * mu0) / (sw + kappa);
  const avgBrier = swb / sw;
  const confidenceFactor = Math.min(1, recent.length / (Number(cfg.targetSamples) || 12));
  const maxPenalty = (avgBrier > 0.25 ? 0.35 : 0.25) * confidenceFactor
                   + (cfg.maxPenalty ?? 0.3) * (1 - confidenceFactor);
  return { baseline, maxPenalty, confidenceFactor, avgBrier };
}

export const CRITICAL_BRIER_THRESHOLD = 0.28;
export const HIGH_PENALTY_THRESHOLD = 0.20;
export const ALERT_COOLDOWN_MS = 1000 * 60 * 60 * 12;

// [LOTE 5] PAV com bloco mínimo anti-escada
export function fitIsotonicCalibration(pairs = [], options = {}) {
  const clean = (pairs || [])
    .map(p => ({ x: Number(p?.probability), y: Number(p?.observed) }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x);
  if (clean.length === 0) return [];
  let blocks = pavBlocks(clean.map(p => ({ minX: p.x, maxX: p.x, sumWY: p.y, sumW: 1, mean: p.y })));
  const minBlock = Math.max(2, Math.floor(clean.length / (Number(options.maxBlocks) || 6)));
  let guard = 0;
  // ✅ FIX #6: Guard++ ANTES da condição para evitar iterações extras
  while (++guard <= 24 && blocks.length > 1 && blocks.some(b => b.sumW < minBlock)) {
    const idx = blocks.findIndex(b => b.sumW < minBlock);
    const left = blocks[idx - 1];
    const right = blocks[idx + 1];
    const useLeft = left && (!right || Math.abs(left.mean - blocks[idx].mean) <= Math.abs(right.mean - blocks[idx].mean));
    const j = useLeft ? idx - 1 : idx + 1;
    const a = blocks[Math.min(idx, j)];
    const b = blocks[Math.max(idx, j)];
    blocks.splice(Math.min(idx, j), 2, {
      minX: a.minX, maxX: b.maxX,
      sumWY: a.sumWY + b.sumWY, sumW: a.sumW + b.sumW,
      mean: (a.sumWY + b.sumWY) / (a.sumW + b.sumW)
    });
    blocks = pavBlocks(blocks);
  }
  return blocks.map(b => ({ minX: b.minX, maxX: b.maxX, value: b.mean }));
}

// Interpolação linear entre blocos (monotônica)
export function predictIsotonicProbability(probability01, model = []) {
  const p = clamp01(probability01);
  if (!Array.isArray(model) || model.length === 0) return p;
  if (p <= model[0].minX) return clamp01(model[0].value);
  const last = model[model.length - 1];
  if (p >= last.maxX) return clamp01(last.value);
  for (let i = 0; i < model.length; i++) {
    const b = model[i];
    if (p >= b.minX && p <= b.maxX) return clamp01(b.value);
    if (p > b.maxX && i + 1 < model.length && p < model[i + 1].minX) {
      const t = (p - b.maxX) / Math.max(1e-9, model[i + 1].minX - b.maxX);
      return clamp01(b.value * (1 - t) + model[i + 1].value * t);
    }
  }
  return clamp01(last.value);
}

export function calibrateWithBBQ(probability01, pairs = [], options = {}) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: Number(x?.probability), observed: Number(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed))
    .map(x => ({ probability: clamp01(x.probability), observed: clamp01(x.observed) }));
  if (clean.length < 4) return p;
  const sorted = [...clean].sort((a, b) => a.probability - b.probability);
  const bins = Math.max(2, Math.min(10, Number(options.bins) || Math.round(Math.sqrt(sorted.length))));
  const alpha0 = Math.max(0.1, Number(options.alpha0) || 0.5);
  const beta0 = Math.max(0.1, Number(options.beta0) || 0.5);
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * sorted.length / bins);
    const end = Math.floor((i + 1) * sorted.length / bins);
    const slice = sorted.slice(start, end);
    if (slice.length === 0) continue;
    const isFirstBin = (i === 0);
    const isLastBin = (i === bins - 1);
    const lo = isFirstBin ? -0.01 : sorted[start].probability;
    const hi = isLastBin ? 1.01 : sorted[end].probability;
    if (!(p >= lo && (p < hi || isLastBin))) continue;
    const succ = kahanSum(slice.map(x => x.observed));
    const n = slice.length;
    return (succ + alpha0) / (n + alpha0 + beta0);
  }
  return p;
}

// FIX F4: conformal real (resíduos) + teto 0.35 + piso = ruído amostral
export function conformalizedCalibrationInterval(probability01, pairs = [], alpha = 0.1) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: clamp01(x?.probability), observed: clamp01(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed));
  if (clean.length < 8) {
    let low = p - 0.15;
    let high = p + 0.15;
    if (high > 1) { low -= (high - 1); high = 1; }
    if (low < 0) { high += (0 - low); low = 0; }
    return { low: Math.max(0, low), high: Math.min(1, high), qHat: 0.15 };
  }
  const n = clean.length;
  const residuals = clean.map(x => Math.abs(x.probability - x.observed)).sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(n - 1, Math.ceil((1 - alpha) * n) - 1));
  const qConformal = residuals[idx] * ((n + 1) / n);
  const smoothedP = (p * n + 0.5) / (n + 1);
  const standardError = Math.sqrt((smoothedP * (1 - smoothedP)) / n);
  const zScore = alpha <= 0.05 ? 1.96 : (alpha <= 0.1 ? 1.645 : 1.28);
  const qHat = Math.min(0.35, Math.max(qConformal, standardError * zScore));
  let low = p - qHat;
  let high = p + qHat;
  if (high > 1) { low -= (high - 1); high = 1; }
  if (low < 0) { high += (0 - low); low = 0; }
  return { low: Math.max(0, low), high: Math.min(1, high), qHat };
}

// FIX F3: Akaike weights + complexidade + shrink p/ uniforme
export function computeStackingWeights(candidateProbs = [], observed = [], complexityParams = [0, 4, 6]) {
  const k = Array.isArray(candidateProbs) ? candidateProbs.length : 0;
  if (k === 0) return [];
  const n = Array.isArray(observed) ? observed.length : 0;
  if (n === 0) return new Array(k).fill(1 / k);
  const logLoss = candidateProbs.map(series => {
    if (!Array.isArray(series) || series.length !== n) return 1e6;
    let acc = 0;
    for (let i = 0; i < n; i++) acc += computeLogLoss(series[i], observed[i]);
    return acc / n;
  });
  const aic = logLoss.map((l, m) => 2 * l * n + 2 * (Number(complexityParams[m]) || 0));
  const minAic = Math.min(...aic);
  const raw = aic.map(a => Math.exp(-0.5 * (a - minAic)));
  const z = kahanSum(raw) || 1;
  const maxLoss = Math.max(...logLoss);
  const isSeverePenalty = maxLoss > 2.0;
  // ✅ FIX: regularização mais forte para amostras mínimas (antes lambda=0.5 em n=4)
  const regularization = n < 8 ? 8 : (isSeverePenalty ? 0.2 : 4);
  const lambda = Math.min(1, Math.max(0, n / (n + regularization)));
  return raw.map(w => lambda * (w / z) + (1 - lambda) / k);
}

export function buildCalibrationDashboardSeries(events = []) {
  const clean = (events || [])
    .map(e => ({
      timestamp: Number(e?.timestamp),
      avgBrier: Number(e?.avgBrier),
      ece: Number(e?.ece),
      calibrationPenalty: Number(e?.calibrationPenalty),
      probability: Number(e?.probability)
    }))
    .filter(e => Number.isFinite(e.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (clean.length === 0) {
    return { trend: [], rolling7: [], controlLimits: { brierMean: null, brierUpper95: null, brierLower95: null }, driftSignals: [] };
  }
  const briers = clean.map(e => Number.isFinite(e.avgBrier) ? e.avgBrier : null).filter(v => v !== null);
  const mean = briers.length > 0 ? kahanSum(briers) / briers.length : null;
  const sd = briers.length > 1
    ? Math.sqrt(kahanSum(briers.map(v => (v - mean) ** 2)) / (briers.length - 1))
    : 0;
  const trend = clean.map(e => ({
    timestamp: e.timestamp,
    date: getDateKey(new Date(e.timestamp)),
    avgBrier: Number.isFinite(e.avgBrier) ? e.avgBrier : null,
    ece: Number.isFinite(e.ece) ? e.ece : null,
    penalty: Number.isFinite(e.calibrationPenalty) ? e.calibrationPenalty : null,
    probability: Number.isFinite(e.probability) ? e.probability : null
  }));
  const rolling7 = trend.map((row, idx) => {
    const startTs = row.timestamp - (7 * 24 * 60 * 60 * 1000);
    const win = trend.slice(0, idx + 1).filter(r => r.timestamp >= startTs && Number.isFinite(r.avgBrier));
    const winMean = win.length > 0 ? (win.reduce((a, b) => a + b.avgBrier, 0) / win.length) : null;
    return { timestamp: row.timestamp, date: row.date, avgBrier7d: winMean };
  });
  const controlLimits = mean === null
    ? { brierMean: null, brierUpper95: null, brierLower95: null }
    : { brierMean: mean, brierUpper95: mean + 2 * sd, brierLower95: Math.max(0, mean - 2 * sd) };
  const driftSignals = trend.map((row) => ({
    timestamp: row.timestamp,
    date: row.date,
    outOfControl: mean !== null && Number.isFinite(row.avgBrier)
      ? row.avgBrier > (controlLimits.brierUpper95 ?? Infinity)
      : false
  }));
  return { trend, rolling7, controlLimits, driftSignals };
}

`

## src/utils/calibrationTelemetry.js

`javascript
const TELEMETRY_KEY = 'coach_calibration_events_v1';
const TELEMETRY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;

async function sendToFirebaseAnalytics(metric) {
    try {
        const { analytics, isLocalMode } = await import('../services/firebase.js');
        if (isLocalMode || !analytics) return;
        const { logEvent } = await import('firebase/analytics');
        logEvent(analytics, 'coach_calibration_event', {
            event_type: String(metric.eventType || 'calibration'),
            category_id: String(metric.categoryId || 'unknown'),
            avg_brier: Number(metric.avgBrier || 0),
            calibration_penalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
        });
    } catch {
        // analytics unavailable in this runtime
    }
}

export function logCalibrationTelemetryEvent(metric) {
    if (!metric || !metric.categoryId) return;
    try {
        const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
        const current = Array.isArray(currentRaw) ? currentRaw : [];
        const normalizedMetric = {
            eventType: metric.eventType || 'calibration',
            categoryId: String(metric.categoryId || 'unknown'),
            avgBrier: Number(metric.avgBrier || 0),
            calibrationPenalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
            ece: Number(metric.ece || 0),
            timestamp: Number(metric.timestamp || Date.now())
        };
        const cutoff = Date.now() - TELEMETRY_RETENTION_MS;
        const next = [...current, normalizedMetric]
            .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= cutoff)
            .slice(-1000);
        localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
        void sendToFirebaseAnalytics(normalizedMetric);
    } catch {
        // best effort telemetry
    }
}

export function getCalibrationTelemetrySummary(categoryId = null) {
  try {
    const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
    const current = Array.isArray(currentRaw) ? currentRaw : [];
    const filtered = categoryId
      ? current.filter(item => String(item.categoryId) === String(categoryId))
      : current;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgBrier: null,
        avgPenalty: null,
        lastTimestamp: null
      };
    }

    const totalBrier = filtered.reduce((sum, item) => sum + Number(item.avgBrier || 0), 0);
    const totalPenalty = filtered.reduce((sum, item) => sum + Number(item.calibrationPenalty || 0), 0);

    return {
      count: filtered.length,
      avgBrier: Number((totalBrier / filtered.length).toFixed(4)),
      avgPenalty: Number((totalPenalty / filtered.length).toFixed(4)),
      lastTimestamp: filtered[filtered.length - 1]?.timestamp || null
    };
  } catch {
    return {
      count: 0,
      avgBrier: null,
      avgPenalty: null,
      lastTimestamp: null
    };
  }
}

export function clearCalibrationTelemetry() {
  try {
    localStorage.removeItem(TELEMETRY_KEY);
  } catch {
    // ignore
  }
}

`

## src/utils/coachAdaptive.js

`javascript
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

    for (let cutoffInt = 10; cutoffInt <= 90; cutoffInt += 5) {
      const cutoff = cutoffInt / 100;
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
   // ✅ FIX: a âncora do shrinkage é o prior NEUTRO (50), não o baseline global.
   // (coachLogic sobrescreve MC_CALIBRATION_NEUTRAL_PCT com globalBaselinePct,
   // o que enviesava categorias fortes para baixo ao encolher em direção à média.)
   const shrinkAnchorPct = 50;
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
        const observed = Number(observedRecord.score) >= safeTargetScore ? 1 : 0;

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
      ? shrinkProbabilityToNeutral(stackedProb01 * 100, totalShrink, shrinkAnchorPct, maxAppliedPenalty)
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

`

## src/utils/coachBacktest.js

`javascript
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

  // FIX: sort com tie-breaker para estabilizar IDCG em caso de empates de relevância
  const ideal = [...safeActual].sort((a, b) => {
    const diff = (Number(b?.relevance) || 0) - (Number(a?.relevance) || 0);
    if (diff !== 0) return diff;
    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return idA.localeCompare(idB);
  });

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

`

## src/utils/coachCausal.js

`javascript
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

`

## src/utils/coachEvaluation.js

`javascript
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

`

## src/utils/coachFeatures.js

`javascript
/**
 * coachFeatures.js
 *
 * Feature flags para evolução por lotes do motor Coach.
 */
import { getFlag } from './coachFeatureStore.js';

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
 * 2. Store centralizado
 * 3. DEFAULT_COACH_FEATURES
 * 4. fallback
 */
export function getCoachFeature(options, key, fallback = false) {
  // FIX: guarda contra key inválida antes de qualquer acesso
  if (typeof key !== 'string' || key === '') return fallback;
  try {
    // 1. options.features (prioridade máxima)
    if (options?.features && typeof options.features[key] === 'boolean') {
      return options.features[key];
    }
    // 2. Store centralizado (substitui globalThis.__COACH_FEATURES__)
    const storeValue = getFlag(key, undefined);
    if (typeof storeValue === 'boolean') return storeValue;
    // 3. Defaults
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

`

## src/utils/coachFeatureStore.js

`javascript
/**
 * coachFeatureStore.js
 * Store singleton para feature flags com API atômica.
 * Substitui mutação direta de globalThis.__COACH_FEATURES__.
 */

const FLAG_REGISTRY_KEY = '__COACH_FEATURE_REGISTRY__';

function getRegistry() {
  if (typeof globalThis === 'undefined') return {};
  if (!globalThis[FLAG_REGISTRY_KEY]) {
    globalThis[FLAG_REGISTRY_KEY] = Object.create(null);
  }
  return globalThis[FLAG_REGISTRY_KEY];
}

/** Lê flags de forma atômica (snapshot imutável). */
export function readFlags() {
  return { ...getRegistry() };
}

/** Atualiza flags atomicamente. Retorna o novo snapshot. */
export function writeFlags(patch) {
  if (!patch || typeof patch !== 'object') return readFlags();
  const registry = getRegistry();
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof k === 'string' && typeof v === 'boolean') {
      clean[k] = v;
    }
  }
  Object.assign(registry, clean);
  return readFlags();
}

/** Remove uma flag. */
export function removeFlag(key) {
  const registry = getRegistry();
  delete registry[key];
  return readFlags();
}

/** Substitui todas as flags (para rollback). */
export function replaceFlags(flags) {
  const registry = getRegistry();
  for (const key of Object.keys(registry)) delete registry[key];
  if (flags && typeof flags === 'object') {
    for (const [k, v] of Object.entries(flags)) {
      if (typeof k === 'string' && typeof v === 'boolean') registry[k] = v;
    }
  }
  return readFlags();
}

/** Lê uma flag com fallback. */
export function getFlag(key, fallback = false) {
  if (typeof key !== 'string') return fallback;
  const registry = getRegistry();
  return typeof registry[key] === 'boolean' ? registry[key] : fallback;
}

`

## src/utils/coachLogic.js

`javascript
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
        const mcProbKey = mc ? Math.round(mc.probabilityRaw) : '0';
        const mcVolKey = mc ? Math.round(mc.volatility * 100) : '0';
        // ✅ FIX: sufixo determinístico — sem Date.now() (IDs estáveis p/ Planner/dedupe)
        const mcIdSuffix = hashString(`${cat.id}|${mcProbKey}|${mcVolKey}|${cat.urgency?.normalizedScore ?? 0}`);
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
                    id: `${cat.id}-geral-${i}-${hashString(`${cat.id}|geral|${i}`)}`,
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

`

## src/utils/coachObservability.js

`javascript
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

`

## src/utils/coachOptimizer.js

`javascript
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

import { writeFlags } from './coachFeatureStore.js';

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
    writeFlags({ ...baseline });
    return { ...baseline };
  }

  const merged = { ...baseline };
  for (const [key, value] of Object.entries(persisted)) {
    if (typeof value === 'boolean') {
      merged[key] = value;
    }
  }

  writeFlags(merged);
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

`

## src/utils/coachPipeline.js

`javascript
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

`

## src/utils/coachSafe.js

`javascript
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
`

## src/utils/coachStorage.js

`javascript
/**
 * coachStorage.js
 * Wrapper seguro para localStorage com tratamento de quota.
 */
const QUOTA_WARNING_THRESHOLD = 0.9; // 90%

function getStorage() {
  try { return globalThis?.localStorage || null; }
  catch { return null; }
}

function estimateUsage(storage) {
  try {
    let total = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      total += (key.length + (storage.getItem(key)?.length || 0)) * 2;
    }
    return total;
  } catch { return 0; }
}

export function safeSetItem(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      console.warn(`[CoachStorage] Quota excedida ao salvar "${key}". Tentando limpeza.`);
      try {
        // Tenta limpar chaves antigas do Coach
        const coachKeys = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith('coach_')) coachKeys.push(k);
        }
        // Remove a mais antiga
        if (coachKeys.length > 1) {
          storage.removeItem(coachKeys[0]);
          storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          return true;
        }
      } catch { /* fallback failed */ }
    }
    console.error(`[CoachStorage] Falha ao salvar "${key}":`, err?.message);
    return false;
  }
}

export function safeGetItem(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(key) ?? fallback;
  } catch { return fallback; }
}

export function safeGetJSON(key, fallback = null) {
  const raw = safeGetItem(key, null);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); }
  catch { return fallback; }
}

export function safeRemoveItem(key) {
  const storage = getStorage();
  if (!storage) return;
  try { storage.removeItem(key); } catch { /* ignore */ }
}

`

## src/utils/coachText.js

`javascript
/**
 * coachText.js
 *
 * Utilitários de parsing e normalização de texto para tarefas do Coach.
 */
import { displaySubject, displayTopic } from './displaySubject';

export const RX_SYSTEM_ALERT_TEST = /\[(ALERTA MESTRE|STATUS)\]/i;
export const RX_SYSTEM_ALERT_GLOBAL = /\[(ALERTA MESTRE|STATUS)\]/gi;
export const RX_PROTOCOLO_GLOBAL = /\[PROTOCOLO PRIORITÁRIO\]\s*/gi;
export const RX_BRACKET_TOPIC = /^\[(.+?)\]\s*([\s\S]*)$/i;
export const RX_REC_MARKUP = /(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g;
export const RX_BOLD = /(\*\*.*?\*\*)/g;

// FIX: Restauradas as âncoras ^...$ ou limites de palavra para evitar substituição destrutiva de substrings
export const RX_NOISE_ACTION =
  /^(Revisão Geral Complementar|Revisão Complementar|CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)|\(Prioridade\)|% de acerto)$/gi;

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

`

## src/utils/measurement.js

`javascript
const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const mapCollection = (collection, mapper) => {
  if (Array.isArray(collection)) {
    return collection.map(mapper);
  }

  if (collection && typeof collection === "object") {
    return Object.fromEntries(
      Object.entries(collection).map(([key, value]) => [key, mapper(value, key)])
    );
  }

  return collection;
};

/**
 * Clamp seguro que NÃO propaga NaN.
 */
export function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;

  const lo = Number(min);
  const hi = Number(max);

  if (!Number.isFinite(lo) && !Number.isFinite(hi)) return n;
  if (!Number.isFinite(lo)) return Math.min(n, hi);
  if (!Number.isFinite(hi)) return Math.max(n, lo);

  return Math.min(hi, Math.max(lo, n));
}

/**
 * Domínio seguro da prova/matéria.
 */
export function safeDomain(maxScore, minScore = 0) {
  const max = clampFinite(maxScore, 1, 1_000_000, 100);
  const min = clampFinite(minScore, 0, max, 0);
  const range = Math.max(1e-9, max - min);

  return { min, max, range };
}

export function sanitizeMaxScore(value) {
  return clampFinite(value, 1, 1_000_000, 100);
}

const asDomain = (domainOrMax, minScore = 0) => {
  if (
    domainOrMax &&
    typeof domainOrMax === "object" &&
    "min" in domainOrMax &&
    "max" in domainOrMax &&
    "range" in domainOrMax
  ) {
    return domainOrMax;
  }

  return safeDomain(domainOrMax, minScore);
};

/**
 * Converte pontos para porcentagem dentro do intervalo útil [min, max].
 */
export function pointsToPct(points, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const pct = ((Number(points) - domain.min) / domain.range) * 100;
  return clampFinite(pct, 0, 100, 0);
}

/**
 * Converte porcentagem para pontos dentro do intervalo útil [min, max].
 */
export function pctToPoints(pct, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const safePct = clampFinite(pct, 0, 100, 0);
  return domain.min + (safePct / 100) * domain.range;
}

export function ratioToPoints(ratio, domainOrMax, minScore = 0) {
  const domain = asDomain(domainOrMax, minScore);
  const safeRatio = clampFinite(ratio, 0, 1, 0);
  return domain.min + safeRatio * domain.range;
}

/**
 * Probabilidade interna deve ser sempre 0-1.
 */
export function toProb01(value, unit = "auto") {
  if (value == null) return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  if (unit === "prob") return clampFinite(n, 0, 1, 0);
  if (unit === "pct") return clampFinite(n, 0, 100, 0) / 100;

  // auto
  if (n >= 0 && n <= 1) return n;
  if (n > 1 && n <= 100) return n / 100;

  return clampFinite(n, 0, 1, n < 0 ? 0 : 1);
}

export function toProbPct(value, unit = "auto") {
  const p = toProb01(value, unit);
  return p == null ? null : p * 100;
}

export function safeDivide(num, den, fallback = 0) {
  const n = Number(num);
  const d = Number(den);

  if (!Number.isFinite(n) || !Number.isFinite(d) || Math.abs(d) < 1e-12) {
    return fallback;
  }

  return n / d;
}

export function safeTime(value, fallback = NaN) {
  if (value == null) return fallback;

  try {
    const d = value instanceof Date ? value : new Date(value);
    const t = d?.getTime?.();
    return Number.isFinite(t) ? t : fallback;
  } catch {
    return fallback;
  }
}

const defaultGetDateKey = (value) => {
  const t = safeTime(value, NaN);
  if (!Number.isFinite(t)) return null;

  const d = new Date(t);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export function normalizeSubjectKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function sortChronologically(rows, getDate = (row) => row?.date || row?.createdAt) {
  return [...safeArray(rows)].sort((a, b) => {
    const ta = safeTime(getDate(a), 0);
    const tb = safeTime(getDate(b), 0);
    return ta - tb;
  });
}

export function latestByDate(rows, getDate = (row) => row?.date || row?.createdAt) {
  let best = null;

  for (const row of safeArray(rows)) {
    const t = safeTime(getDate(row), NaN);
    if (!Number.isFinite(t)) continue;

    if (!best || t > best.t) {
      best = { t, row };
    }
  }

  return best?.row || null;
}

export function resolveTargetPoints(value, domainOrMax, minScore = 0, unit = "auto") {
  const actualUnit = typeof minScore === "string" && unit === "auto" ? minScore : unit;
  const safeMinScore = typeof minScore === "number" ? minScore : 0;
  const domain = asDomain(domainOrMax, safeMinScore);

  if (value && typeof value === "object") {
    if (Number.isFinite(value.points)) {
      return clampFinite(value.points, domain.min, domain.max, domain.min);
    }

    if (Number.isFinite(value.pct)) {
      return pctToPoints(value.pct, domain);
    }
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return domain.min;

  if (actualUnit === "points") {
    return clampFinite(n, domain.min, domain.max, domain.min);
  }

  if (actualUnit === "pct") {
    return pctToPoints(n, domain);
  }

  // FIX: Removida auto-detecção também daqui para manter coerência com normalizeScoreValue.
  // Valores ambíguos são tratados como pontos por segurança.
  return clampFinite(n, domain.min, domain.max, domain.min);
}

/**
 * Normaliza qualquer registro de score para o motor interno.
 * Retorna sempre:
 * - points: pontos no domínio [min, max]
 * - pct: porcentagem no intervalo útil
 * - ratio: 0-1
 */
export function normalizeScoreValue(row, maxScore, minScore = 0) {
  const r = row && typeof row === "object" ? row : {};
  const domain = safeDomain(maxScore, minScore);

  const totalRaw = Number(r.total);
  const total = Number.isFinite(totalRaw) ? Math.max(0, Math.trunc(totalRaw)) : 0;

  let correct = 0;

  if (total > 0) {
    const correctRaw = Number(r.correct);
    correct = Number.isFinite(correctRaw)
      ? Math.max(0, Math.min(total, Math.trunc(correctRaw)))
      : 0;
  }

  if (total > 0) {
    const ratio = correct / total;

    return {
      points: domain.min + ratio * domain.range,
      pct: ratio * 100,
      ratio,
      total,
      correct,
      totalValid: true,
      domain,
      ambiguous: false,
      source: "total-correct"
    };
  }

  const scorePointsRaw = r.scorePoints == null ? NaN : Number(r.scorePoints);

  if (Number.isFinite(scorePointsRaw)) {
    const points = clampFinite(scorePointsRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);

    return {
      points,
      pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total,
      correct,
      totalValid: false,
      domain,
      ambiguous: false,
      source: "scorePoints"
    };
  }

  const scorePctRaw = r.scorePct == null ? NaN : Number(r.scorePct);

  if (Number.isFinite(scorePctRaw)) {
    const pct = clampFinite(scorePctRaw, 0, 100, 0);
    const points = pctToPoints(pct, domain);

    return {
      points,
      pct,
      ratio: clampFinite(pct / 100, 0, 1, 0),
      total,
      correct,
      totalValid: false,
      domain,
      ambiguous: false,
      source: "scorePct"
    };
  }

  const scoreRaw = r.score == null ? NaN : Number(r.score);

  if (Number.isFinite(scoreRaw)) {
    const unit = r.unit || r.scoreUnit;
    const explicitPct = unit === "pct" || r.isPercentage === true;
    const explicitPoints = unit === "points" || r.isPercentage === false;

    if (explicitPct) {
      const pct = clampFinite(scoreRaw, 0, 100, 0);
      const points = pctToPoints(pct, domain);

      return {
        points,
        pct,
        ratio: clampFinite(pct / 100, 0, 1, 0),
        total,
        correct,
        totalValid: false,
        domain,
        ambiguous: false,
        source: "score-explicit-pct"
      };
    }

    if (explicitPoints) {
      const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
      const pct = pointsToPct(points, domain);

      return {
        points,
        pct,
        ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
        total,
        correct,
        totalValid: false,
        domain,
        ambiguous: false,
        source: "score-explicit-points"
      };
    }

    // ✅ FIX: Auto-detecção removida. Tratar sempre como pontos quando não
    // há indicação explícita de unidade. A auto-detecção causava conversão
    // incorreta de notas brutas (ex: 85/1000 virava 85% = 850 pts).
    const looksPercentAmbiguous =
      domain.max > 100 &&
      scoreRaw >= 0 &&
      scoreRaw <= 100 &&
      r.isPercentage !== false;

    if (looksPercentAmbiguous) {
      // Marcar como ambíguo mas tratar como PONTOS (mais seguro)
      const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
      const pct = pointsToPct(points, domain);
      return {
        points,
        pct,
        ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
        total,
        correct,
        totalValid: false,
        domain,
        ambiguous: true,
        source: "score-ambiguous-treated-as-points"
      };
    }

    const points = clampFinite(scoreRaw, domain.min, domain.max, domain.min);
    const pct = pointsToPct(points, domain);

    return {
      points,
      pct,
      ratio: clampFinite((points - domain.min) / domain.range, 0, 1, 0),
      total,
      correct,
      totalValid: false,
      domain,
      ambiguous: false,
      source: "score-auto-points"
    };
  }

  return {
    points: domain.min,
    pct: 0,
    ratio: 0,
    total,
    correct,
    totalValid: false,
    domain,
    ambiguous: false,
    source: "missing"
  };
}

/**
 * Para motores matemáticos, retorne SEMPRE pontos.
 */
export function getSafeScore(row, maxScore, minScore = 0) {
    if (!row) return minScore;
    
    // FIX: Tratar todos os formatos possíveis
    let score;
    if (typeof row === 'number') {
        score = row;
    } else if (row.score != null) {
        score = Number(row.score);
    } else if (row.value != null) {
        score = Number(row.value);
    } else if (row.correct != null && row.total != null) {
        const total = Number(row.total);
        const correct = Number(row.correct);
        if (Number.isFinite(total) && total > 0 && Number.isFinite(correct)) {
            score = (correct / total) * maxScore;
        }
    }
    
    // FIX: Garantir que score nunca é NaN
    if (!Number.isFinite(score)) return minScore;
    
    return Math.max(minScore, Math.min(maxScore, score));
}

export function clampCorrectToTotal(correct, total) {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return 0;

  const c = Number(correct);
  if (!Number.isFinite(c)) return 0;

  const safeTotal = Math.max(0, Math.trunc(t));
  const safeCorrect = Math.max(0, Math.trunc(c));

  return Math.min(safeTotal, safeCorrect);
}

/**
 * Sanitiza linha de simulado garantindo invariantes:
 * - total >= 0
 * - correct >= 0
 * - correct <= total
 * - score interno em pontos
 * - scorePct para UI
 */
export function sanitizeSimuladoRow(row, maxScore = 100, minScore = 0) {
  const r = row && typeof row === "object" ? row : {};
  const warnings = [];
  const domain = safeDomain(maxScore, minScore);

  const rawTotal = Number(r.total);
  const rawCorrect = Number(r.correct);

  const norm = normalizeScoreValue(r, domain.max, domain.min);

  if (Number.isFinite(rawCorrect) && rawCorrect > 0 && norm.total === 0) {
    warnings.push("correct > 0 com total = 0 → correct zerado");
  }

  if (
    Number.isFinite(rawCorrect) &&
    Number.isFinite(rawTotal) &&
    rawTotal > 0 &&
    rawCorrect > rawTotal
  ) {
    warnings.push(`correct(${rawCorrect}) > total(${rawTotal}) → clamp aplicado`);
  }

  const rawDate = r.date || r.createdAt || null;
  const t = safeTime(rawDate, NaN);

  if (!Number.isFinite(t)) {
    warnings.push("data inválida");
  }

  return {
    ...r,
    date: Number.isFinite(t) && t > 0 ? rawDate : null,
    total: norm.total,
    correct: norm.correct,
    scorePoints: norm.points,
    scorePct: norm.pct,

    // Interno: motores devem usar scorePoints.
    score: norm.points,

    // Depois da normalização, o campo score deixa de ser percentual.
    isPercentage: false,
    originalIsPercentage: Boolean(r.isPercentage),
    scoreUnit: "points",

    ambiguousScore: norm.ambiguous,
    warnings
  };
}

/**
 * Atualização segura de resultado de questões.
 * Nunca deixa correct > total.
 */
export function mergeQuestionResult(row, delta, maxScore, minScore = 0) {
  const domain = safeDomain(maxScore, minScore);
  const r = row && typeof row === "object" ? row : {};

  const addedTotal = Math.max(0, Math.trunc(Number(delta?.total) || 0));
  const addedCorrect = Math.min(
    addedTotal,
    Math.max(0, Math.trunc(Number(delta?.correct) || 0))
  );

  const oldTotal = Math.max(0, Math.trunc(Number(r.total) || 0));
  const oldCorrect = Math.min(oldTotal, Math.max(0, Math.trunc(Number(r.correct) || 0)));

  const newTotal = oldTotal + addedTotal;
  const newCorrect = Math.min(newTotal, oldCorrect + addedCorrect);

  const ratio = newTotal > 0 ? newCorrect / newTotal : 0;
  const points = domain.min + ratio * domain.range;

  return {
    ...r,
    correct: newCorrect,
    total: newTotal,
    scorePoints: points,
    scorePct: ratio * 100,
    score: points,
    scoreUnit: "points",
    isPercentage: false,
    timeSpent: Math.max(
      0,
      (Number(r.timeSpent) || 0) + Math.max(0, Number(delta?.timeSpentSecs) || 0)
    )
  };
}

/**
 * Deduplicação correta de simulados por:
 * id + matéria + data + score.
 */
export function deduplicateSimulados(simulados, options = {}) {
  const {
    maxScore = 100,
    minScore = 0,
    getDateKey = defaultGetDateKey
  } = options;

  const map = new Map();

  safeArray(simulados).forEach((s, idx) => {
    const norm = normalizeScoreValue(s, maxScore, minScore);

    const subjectKey = normalizeSubjectKey(
      s?.subject || s?.categoryId || s?.categoryName || s?.materia || "geral"
    );

    const dateKey = getDateKey(s?.date || s?.createdAt) || "sem-data";

    const key = [
      s?.id || `sim-no-id-${idx}`,
      subjectKey,
      dateKey,
      norm.points.toFixed(2)
    ].join("|");

    map.set(key, {
      ...s,
      total: norm.total,
      correct: norm.correct,
      scorePoints: norm.points,
      scorePct: norm.pct,
      score: norm.points,
      scoreUnit: "points",
      isPercentage: false,
      originalIsPercentage: Boolean(s?.isPercentage)
    });
  });

  return Array.from(map.values());
}

/**
 * Cria chaves data+matéria para não suprimir histórico de matérias diferentes.
 */
export function buildSimuladoDateSubjectKeys(simulados, getDateKey = defaultGetDateKey) {
  const set = new Set();

  safeArray(simulados).forEach((s) => {
    const dk = getDateKey(s?.date || s?.createdAt);
    if (!dk) return;

    const subjectKey = normalizeSubjectKey(
      s?.subject || s?.categoryId || s?.categoryName || s?.materia || "geral"
    );

    set.add(`${dk}|${subjectKey}`);
  });

  return set;
}

/**
 * Migração de concurso existente para o novo modelo seguro.
 */
export function migrateContestData(contest) {
  if (!contest || typeof contest !== "object") return contest;

  const maxScore = sanitizeMaxScore(contest.maxScore);
  const minScore = clampFinite(contest.minScore, 0, maxScore, 0);

  const next = {
    ...contest,
    maxScore,
    minScore
  };

  if (next.simulados) {
    next.simulados = mapCollection(next.simulados, (row) =>
      sanitizeSimuladoRow(row, maxScore, minScore)
    );
  }

  if (next.categories) {
    next.categories = mapCollection(next.categories, (cat) => {
      if (!cat || typeof cat !== "object") return cat;

      const catMax = sanitizeMaxScore(cat.maxScore ?? maxScore);
      const catMin = clampFinite(cat.minScore ?? minScore, 0, catMax, minScore);

      const nextCat = {
        ...cat,
        maxScore: catMax,
        minScore: catMin
      };

      if (nextCat.history) {
        nextCat.history = safeArray(nextCat.history).map((h) =>
          sanitizeSimuladoRow(h, catMax, catMin)
        );
      }

      return nextCat;
    });
  }

  return next;
}

`

## src/utils/idGenerator.js

`javascript
/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // Fallback para contextos HTTP não-secure com alta entropia
  const rand = () => Math.random().toString(36).substring(2, 15);
  const perf = typeof performance !== 'undefined' ? performance.now().toString(36).replace('.', '') : '';
  return `${prefix}-${Date.now().toString(36)}-${perf}-${rand()}${rand()}`;
};

const stableIdMap = new WeakMap();

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return Math.abs(hash).toString(36);
}

export function makeTaskId(catId, text) {
  const norm = (text || '').trim().toLowerCase();
  return `tsk_${catId}_${hashString(norm)}`;
}

/**
 * Returns a stable ID for a task, using its ID if present, 
 * or a stable content-based hash if not.
 */
export const getSafeId = (task) => {
    if (!task) return 'task-null';
    if (typeof task === 'string') return task;
    if (task.id) return String(task.id);
    
    if (stableIdMap.has(task)) {
        return stableIdMap.get(task);
    }
    
    const text = (task.text || task.title || task.topic || 'task').trim();
    const cat = task.subject || task.category || task.subjectId || '';
    const hash = hashString(`${cat}_${text}`);
    const cleanPrefix = text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12).toLowerCase() || 'tsk';
    const newId = `task-${cleanPrefix}-${hash}`;
    stableIdMap.set(task, newId);
    return newId;
};

`

## src/engine/monteCarlo.js

`javascript
import { mulberry32 } from './random.js';
import {
    normalCDF_complement,
    generateKDE,
    sampleTruncatedNormal,
    truncatedNormalMean,
    ensurePositiveSemiDefinite,
    choleskyDecomposition,
    applyCovariance,
    inverseNormalCDF,
    truncatedNormalFromUniform
} from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };

import { getPercentile } from './math/percentile.js';
import { kahanSum } from './math/kahan.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getDateKey } from '../utils/dateHelper.js';
import { getCachedSimulation, setCachedSimulation, clearSimulationCache } from './simulationCache.js';

export { getPercentile };

const DEFAULT_SIMULATIONS = 5000;
const MAX_SIMULATIONS = 50000;
const TARGET_PROB_SE = 0.008;
const DEFAULT_DOMAIN_MIN = 0;
const DEFAULT_DOMAIN_MAX = 100;

function toFiniteNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function sanitizeDomain(minScore, maxScore) {
    const rawMin = toFiniteNumber(minScore, DEFAULT_DOMAIN_MIN);
    const rawMax = toFiniteNumber(maxScore, DEFAULT_DOMAIN_MAX);

    if (rawMin <= rawMax) {
        return { minScore: rawMin, maxScore: rawMax };
    }

    return { minScore: rawMax, maxScore: rawMin };
}

function sanitizeSimulations(simulations) {
    const normalized = Math.floor(toFiniteNumber(simulations, DEFAULT_SIMULATIONS));
    return clamp(normalized, 1, MAX_SIMULATIONS);
}

function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => {
        const safeMean = toFiniteNumber(s?.mean, 0);
        const safeSd = Math.max(1e-6, toFiniteNumber(s?.sd, 1));
        const safeMinCutoff = toFiniteNumber(s?.minCutoff, 0);
        const safeMinScore = toFiniteNumber(s?.minScore, DEFAULT_DOMAIN_MIN);
        const safeMaxScore = toFiniteNumber(s?.maxScore, DEFAULT_DOMAIN_MAX);
        const safeImmunity = toFiniteNumber(s?.immunityFactor, 1.0);
        const safeWeight = Math.max(1e-6, toFiniteNumber(s?.weight, 1));   // ✅ LOTE-01

        return {
            ...s,
            mean: safeMean,
            sd: safeSd,
            minCutoff: safeMinCutoff,
            minScore: safeMinScore,
            maxScore: safeMaxScore,
            immunityFactor: safeImmunity,
            weight: safeWeight                                              // ✅ LOTE-01
        };
    });
}

export function recommendSimulationCount(targetProb = 0.7, targetSE = TARGET_PROB_SE, minSims = 2000, maxSims = MAX_SIMULATIONS) {
    const p = Math.max(0.05, Math.min(0.95, targetProb));
    const varBernoulli = p * (1 - p);
    const needed = Math.ceil(varBernoulli / (targetSE * targetSE));
    return clamp(needed, minSims, maxSims);
}

function generateStableSeed(historyCount, categoryName, _targetScore, _currentMean) {
    let h = 2166136261;

    const safeCatId = typeof categoryName === 'object' && categoryName !== null
        ? String(categoryName.id || categoryName.name || 'global')
        : String(categoryName || 'global');

    const safeHistoryCount = toFiniteNumber(historyCount, 0);
    const safeTarget = toFiniteNumber(_targetScore, 0);
    const safeMeanInt = Number.isFinite(Number(_currentMean)) ? Math.floor(Number(_currentMean) * 10) : 0;

    const seedStr = `${safeHistoryCount}-${safeCatId}-${safeTarget}-${safeMeanInt}`;

    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    return h >>> 0;
}

export function simulateNormalDistribution(
    meanOrObj,
    sd,
    targetScore,
    simulations,
    seed,
    currentMean,
    categoryName,
    bayesianCI,
    historyLength = 0
) {
    let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
    let minScore = DEFAULT_DOMAIN_MIN;
    let maxScore = DEFAULT_DOMAIN_MAX;

    let subjects = [];
    let historicalCutoffs = [];
    let flashcardImmunity = 1.0;

    if (typeof meanOrObj === 'object' && meanOrObj !== null) {
        mean = meanOrObj.mean ?? mean;
        sd = meanOrObj.sd ?? sd;
        targetScore = meanOrObj.targetScore ?? targetScore;
        simulations = meanOrObj.simulations ?? simulations;
        seed = meanOrObj.seed ?? seed;
        currentMean = meanOrObj.currentMean ?? currentMean;
        categoryName = meanOrObj.categoryName ?? categoryName;
        bayesianCI = meanOrObj.bayesianCI ?? bayesianCI;
        minScore = meanOrObj.minScore ?? minScore;
        maxScore = meanOrObj.maxScore ?? maxScore;
        historyLength = meanOrObj.historyLength ?? 0;
        subjects = meanOrObj.subjects ?? [];
        historicalCutoffs = meanOrObj.historicalCutoffs ?? [];
        flashcardImmunity = meanOrObj.flashcardImmunity ?? 1.0;
    }

    subjects = sanitizeSubjects(subjects);

    historicalCutoffs = Array.isArray(historicalCutoffs)
        ? historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
        : [];

    flashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);
    historyLength = Math.max(0, Math.floor(toFiniteNumber(historyLength, 0)));

    if (!meanOrObj?.simulations && !simulations) {
        const refMean = Number.isFinite(currentMean) ? currentMean
                      : Number.isFinite(mean) ? mean
                      : (minScore + maxScore) / 2;
        const domain = Math.max(1, maxScore - minScore);
        const roughProb = Math.max(0.1, Math.min(0.9, (refMean - minScore) / domain));
        simulations = recommendSimulationCount(roughProb);
    }

    const safeDomain = sanitizeDomain(minScore, maxScore);
    minScore = safeDomain.minScore;
    maxScore = safeDomain.maxScore;

    const safeMean = clamp(toFiniteNumber(mean, (minScore + maxScore) / 2), minScore, maxScore);
    const safeCurrentMean = toFiniteNumber(currentMean, safeMean);

    const sdNum = toFiniteNumber(sd, NaN);
    const hasExplicitDeterministicSD = Number.isFinite(sdNum) && sdNum <= 0;
    const isExplicitCoachSD = Number.isFinite(sdNum) && sdNum > 0;

    let safeSD = Number.isFinite(sdNum) && sdNum > 0 ? sdNum : 0;

    if (bayesianCI) {
        let high = bayesianCI.unclampedHigh !== undefined ? bayesianCI.unclampedHigh : bayesianCI.ciHigh;
        let low = bayesianCI.unclampedLow !== undefined ? bayesianCI.unclampedLow : bayesianCI.ciLow;

        high = toFiniteNumber(high, NaN);
        low = toFiniteNumber(low, NaN);

        if (Number.isFinite(high) && Number.isFinite(low) && high < low) {
            const tmp = high;
            high = low;
            low = tmp;
        }

        if (Number.isFinite(high) && Number.isFinite(low)) {
            const effectiveN = Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1));
            const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });

            let inferredSD = (high - low) / (tMultiplier * 2);
            const distToBoundary = Math.min(safeMean - minScore, maxScore - safeMean);

            if (Number.isFinite(inferredSD) && inferredSD >= 1e-10) {
                if (distToBoundary < inferredSD * 1.5) {
                    const correctionFactor = 1 + (1 - distToBoundary / (inferredSD * 1.5));
                    inferredSD *= Math.min(1.5, correctionFactor);
                }
            }

            if (Number.isFinite(inferredSD) && inferredSD > 0) {
                safeSD = inferredSD;
            }
        }
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    if (!hasExplicitDeterministicSD && historyLength < 15 && !bayesianCI && !isExplicitCoachSD) {
        const rangeMassa = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
        const floorVolatility = rangeMassa * 0.04;
        const confidence = Math.min(1, historyLength / 8);
        safeSD = (safeSD * confidence) + (floorVolatility * (1 - confidence));
    }

    const safeFlashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);

    if (safeFlashcardImmunity < 1.0 && safeSD > 0) {
        safeSD = safeSD * Math.max(0.80, safeFlashcardImmunity);
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    const effectiveTarget = clamp(toFiniteNumber(targetScore, minScore), minScore, maxScore);
    const safeSimulations = sanitizeSimulations(simulations);

    if (safeSD < 1e-5) {
        // ✅ FIX: Com sd ≈ 0, a distribuição é degenerada.
        // Usar comparação com tolerância relativa ao domínio.
        const domainWidth = Math.max(1e-9, maxScore - minScore);
        const EPS = domainWidth * 1e-6;
        let prob;
        if (safeMean > effectiveTarget + EPS) {
            prob = 100;
        } else if (safeMean < effectiveTarget - EPS) {
            prob = 0;
        } else {
            prob = 50; // Fronteira exata
        }

        return {
            simulationCount: safeSimulations,
            probability: prob,
            analyticalProbability: prob,
            recommendedProbability: prob,
            probabilityPolicy: 'deterministic',
            mean: safeMean,
            sd: 0,
            sdVisual: 0,
            sdLeft: 0,
            sdRight: 0,
            ci95StatLow: safeMean,
            ci95StatHigh: safeMean,
            ci95Low: safeMean,
            ci95High: safeMean,
            ci95VisualLow: safeMean,
            ci95VisualHigh: safeMean,
            ci95VisualClamped: false,
            currentMean: safeCurrentMean,
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                safeMean > minScore ? { x: safeMean - 0.1, y: 0, density: 0 } : null,
                { x: safeMean, y: 1, density: 1 },
                safeMean < maxScore ? { x: safeMean + 0.1, y: 0, density: 0 } : null
            ].filter(Boolean),
            drift: 0,
            volatility: 0,
            minScore,
            maxScore,
            method: bayesianCI ? 'bayesian_static_hybrid' : 'deterministic'
        };
    }

    const numericSeed = toFiniteNumber(seed, NaN);
    const stableSeed = Number.isFinite(numericSeed)
        ? (numericSeed >>> 0)
        : generateStableSeed(historyLength, categoryName, targetScore, safeCurrentMean);

    const rng = mulberry32(stableSeed);

    let success = 0;
    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    const allScores = new Float64Array(safeSimulations);

    let muParam = safeMean;

    if (safeSD > 0) {
        const distMin = safeMean - minScore;
        const distMax = maxScore - safeMean;

        if (distMin < safeSD * 1.5 || distMax < safeSD * 1.5) {
            const spread = Math.max(safeSD * 30, (maxScore - minScore) * 3);
            let muLow = minScore - spread;
            let muHigh = maxScore + spread;

            for (let iter = 0; iter < 20; iter++) {
                const currentTruncMean = truncatedNormalMean(muParam, safeSD, minScore, maxScore);
                if (!Number.isFinite(currentTruncMean)) break;

                const error = currentTruncMean - safeMean;
                if (Math.abs(error) < 0.25) break;

                if (error > 0) muHigh = muParam;
                else muLow = muParam;

                muParam = (muLow + muHigh) / 2;
            }
        }
    }

    if (!Number.isFinite(muParam)) muParam = safeMean;

    let cutoffsMean = 0;
    let cutoffsSD = 0;

    const numericCutoffs = historicalCutoffs;
    const hasCutoffs = numericCutoffs.length > 0;

    if (hasCutoffs) {
        cutoffsMean = kahanSum(numericCutoffs) / numericCutoffs.length;

        if (numericCutoffs.length > 1) {
            const devs = numericCutoffs.map(v => Math.pow(v - cutoffsMean, 2));
            cutoffsSD = Math.sqrt(Math.max(0, kahanSum(devs) / (numericCutoffs.length - 1)));
        } else {
            cutoffsSD = cutoffsMean * 0.05;
        }

        if (!Number.isFinite(cutoffsSD) || cutoffsSD <= 0) {
            cutoffsSD = Math.max(1e-6, cutoffsMean * 0.05);
        }
    }

    // ✅ LOTE-01 FIX (C1): o score composto deve amostrar TODAS as matérias.
    // Antes, apenas matérias com minCutoff > 0 entravam aqui, e o score global
    // era sobrescrito pela média SÓ delas — as demais eram descartadas da
    // probabilidade silenciosamente. minCutoff agora só afeta a restrição de
    // aprovação (passedMins), nunca a composição do score.
    const allSubjects = sanitizeSubjects(subjects);
    const subjectStats = allSubjects.map(s => {
        const safeSd = Math.max(1e-6, toFiniteNumber(s.sd, 1));
        const safeImmunity = toFiniteNumber(s.immunityFactor, 1.0);
        return {
            ...s,
            sd: safeSd * Math.max(0.80, safeImmunity)
        };
    });

    let subjectCholesky = null;

    if (subjectStats.length > 1) {
        const adaptiveRhoContext = meanOrObj?.simuladoRows
            ? {
                simuladoRows: meanOrObj.simuladoRows,
                categoryNames: subjectStats.map(s => String(s?.name ?? s?.id ?? 'subject'))
            }
            : null;

        const cov = buildCovarianceMatrix(subjectStats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
        const psdCov = ensurePositiveSemiDefinite(cov);
        subjectCholesky = choleskyDecomposition(psdCov);

        // ✅ FIX BUG-06: Validar e substituir elementos quase-zero na diagonal da Cholesky
        // Previne singularidades na multiplicação downstream que arruínam as simulações
        if (subjectCholesky) {
            for (let i = 0; i < subjectCholesky.length; i++) {
                if (!Number.isFinite(subjectCholesky[i][i]) || subjectCholesky[i][i] < 1e-8) {
                    subjectCholesky[i][i] = 1e-8;
                }
            }
        }
    }

    const choleskySize = subjectStats.length;

    // Buffers pré-alocados (reutilizados em todas as 5000 simulações)
    const independentBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const latentBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const sampledSubjectsBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    // Pré-computar parâmetros das marginais (não mudam entre simulações)
    const subjectParams = subjectStats.map(s => ({
        mean: toFiniteNumber(s.mean, 0),
        sd: Math.max(1e-6, toFiniteNumber(s.sd, 1)),
        minScore: clamp(toFiniteNumber(s.minScore, minScore), minScore, maxScore),
        maxScore: clamp(toFiniteNumber(s.maxScore, maxScore), minScore, maxScore),
        minCutoff: toFiniteNumber(s.minCutoff, 0),
        weight: Math.max(1e-6, toFiniteNumber(s.weight, 1)),
        immunityFactor: toFiniteNumber(s.immunityFactor, 1.0)
    }));

    for (let i = 0; i < safeSimulations; i++) {
        let currentTarget = effectiveTarget;

        if (hasCutoffs) {
            currentTarget = sampleTruncatedNormal(cutoffsMean, cutoffsSD, minScore, maxScore, rng);
            if (!Number.isFinite(currentTarget)) currentTarget = effectiveTarget;
        }

        let score = sampleTruncatedNormal(muParam, safeSD, minScore, maxScore, rng);
        if (!Number.isFinite(score)) score = clamp(safeMean, minScore, maxScore);

        let passedMins = true;

        if (subjectParams.length > 0) {
            let subjectSum = 0;
            let weightSum = 0;

            if (subjectCholesky && choleskySize > 1) {
                // Preencher buffer de normais independentes
                for (let k = 0; k < choleskySize; k++) {
                    const rawU = rng();
                    const u = Number.isFinite(rawU) ? Math.max(1e-12, Math.min(1 - 1e-12, rawU)) : 0.5;
                    independentBuffer[k] = inverseNormalCDF(u);
                }

                // Aplicar correlação via Cholesky (reutilizando buffers)
                applyCovariance(subjectCholesky, independentBuffer, latentBuffer);

                // Transformar cada marginal para normal truncada (reutilizando buffer)
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const u = 1 - normalCDF_complement(latentBuffer[j]);
                    sampledSubjectsBuffer[j] = truncatedNormalFromUniform(
                        sp.mean, sp.sd, sp.minScore, sp.maxScore, u
                    );
                }

                // Calcular média ponderada e verificar mínimos
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const subjScore = clamp(sampledSubjectsBuffer[j], sp.minScore, sp.maxScore);
                    subjectSum += subjScore * sp.weight;
                    weightSum += sp.weight;
                    // ✅ LOTE-01: corte só reprova quando existe (minCutoff > 0)
                    if (!Number.isFinite(subjScore) || (sp.minCutoff > 0 && subjScore < sp.minCutoff)) {
                        passedMins = false;
                    }
                }
            } else {
                // Caminho independente (sem correlação)
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const effSd = Math.max(1e-6, sp.sd * Math.max(0.80, sp.immunityFactor));
                    const sScore = sampleTruncatedNormal(sp.mean, effSd, sp.minScore, sp.maxScore, rng);
                    subjectSum += sScore * sp.weight;
                    weightSum += sp.weight;
                    // ✅ LOTE-01: corte só reprova quando existe (minCutoff > 0)
                    if (!Number.isFinite(sScore) || (sp.minCutoff > 0 && sScore < sp.minCutoff)) {
                        passedMins = false;
                    }
                }
            }

            score = weightSum > 0 ? subjectSum / weightSum : score;
        }

        if (score >= currentTarget && passedMins) success++;

        allScores[i] = score;

        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (score - welfordMean);
    }

    const projectedMeanRaw = welfordMean;
    const projectedMean = Number.isFinite(projectedMeanRaw) ? projectedMeanRaw : safeMean;

    const rawProjectedVar = welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0;
    const projectedSD = Math.sqrt(Math.max(0, Number.isFinite(rawProjectedVar) ? rawProjectedVar : 0));

    allScores.sort();

    const nScores = allScores.length;

    const at = (p) => allScores[Math.max(0, Math.min(nScores - 1, Math.floor(nScores * p)))];

    const statisticalCi95Low = at(0.025);
    const statisticalCi95High = at(0.975);
    const empMedian = at(0.5);
    const rawLeft = at(0.16);
    const rawRight = at(0.84);

    let rawLow = statisticalCi95Low;
    let rawHigh = statisticalCi95High;

    const empiricalProbability = (success / safeSimulations) * 100;

    const posteriorAlpha = success + 0.5;
    const posteriorBeta = (safeSimulations - success) + 0.5;
    const bayesEmpiricalProbability = (posteriorAlpha / (posteriorAlpha + posteriorBeta)) * 100;

    const displayMeanRaw = bayesianCI ? safeMean : projectedMean;
    const safeDisplayMean = clamp(toFiniteNumber(displayMeanRaw, safeMean), minScore, maxScore);

    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const MIN_SPREAD = Math.max(0.5, range * 0.005);

    const clampedDisplayMean = safeDisplayMean;
    const wasVisualCIClamped = (rawHigh - rawLow < MIN_SPREAD);

    if (wasVisualCIClamped) {
        const availableSpan = maxScore - minScore;

        if (availableSpan < MIN_SPREAD) {
            rawLow = minScore;
            rawHigh = maxScore;
        } else {
            rawLow = Math.max(minScore, clampedDisplayMean - MIN_SPREAD / 2);
            rawHigh = Math.min(maxScore, clampedDisplayMean + MIN_SPREAD / 2);

            if (rawHigh === maxScore && rawLow < maxScore - MIN_SPREAD) {
                rawLow = maxScore - MIN_SPREAD;
            } else if (rawLow === minScore && rawHigh > minScore + MIN_SPREAD) {
                rawHigh = minScore + MIN_SPREAD;
            }
        }
    }

    if (!Number.isFinite(rawLow)) rawLow = minScore;
    if (!Number.isFinite(rawHigh)) rawHigh = maxScore;

    const displayLow = rawLow;
    const displayHigh = rawHigh;

    const effectiveNForSD = bayesianCI
        ? Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1))
        : Math.max(1, historyLength || 1);

    const tMultiplierForSDRaw = getConfidenceMultiplier(effectiveNForSD, { allowFractional: true });
    const tMultiplierForSD = Number.isFinite(tMultiplierForSDRaw) && tMultiplierForSDRaw > 0
        ? tMultiplierForSDRaw
        : 3.92;

    const rawVisualSD = wasVisualCIClamped
        ? (rawHigh - rawLow) / (tMultiplierForSD * 2)
        : projectedSD;

    const visualSD = Number.isFinite(rawVisualSD) ? Math.max(0, rawVisualSD) : projectedSD;

    const safePhi = (v) => Number.isFinite(v) ? v : 0;

    const phiMin = safePhi(normalCDF_complement((minScore - muParam) / safeSD));
    const phiMax = safePhi(normalCDF_complement((maxScore - muParam) / safeSD));
    const phiTarget = safePhi(normalCDF_complement((effectiveTarget - muParam) / safeSD));

    let rawTruncNormFactor = phiMin - phiMax;
    if (!Number.isFinite(rawTruncNormFactor)) rawTruncNormFactor = 0;

    const isUnderflowStress = rawTruncNormFactor < 1e-15;

    const clampedPhiTarget = Number.isFinite(phiTarget)
        ? Math.max(phiMax, Math.min(phiMin, phiTarget))
        : phiMax;

    let truncNormFactor = isUnderflowStress ? 1e-6 : rawTruncNormFactor;
    if (!Number.isFinite(truncNormFactor) || truncNormFactor <= 0) truncNormFactor = 1e-6;

    let analyticalProbability;

    if (effectiveTarget >= maxScore && !hasCutoffs) {
        analyticalProbability = 0;
    } else if (effectiveTarget <= minScore && !hasCutoffs) {
        analyticalProbability = 100;
    } else {
        analyticalProbability = (isUnderflowStress || hasCutoffs)
            ? empiricalProbability
            : ((clampedPhiTarget - phiMax) / truncNormFactor) * 100;
    }

    if (!Number.isFinite(analyticalProbability)) analyticalProbability = empiricalProbability;

    const finalAnalyticalProbability = analyticalProbability;

    const finiteEmpiricalProbability = Number.isFinite(bayesEmpiricalProbability) ? bayesEmpiricalProbability : 0;
    const finiteAnalyticalProbability = Number.isFinite(finalAnalyticalProbability) ? finalAnalyticalProbability : 0;

    const empiricalVsAnalyticalGap = Math.abs(finiteEmpiricalProbability - finiteAnalyticalProbability);

    const lowSimulation = safeSimulations < 1200;
    const highTruncationStress = isUnderflowStress || truncNormFactor < 1e-6;

    const pHat = finiteEmpiricalProbability / 100;
    const empiricalStdErrRaw = Math.sqrt(Math.max(1e-12, (pHat * (1 - pHat)) / Math.max(1, safeSimulations))) * 100;
    const empiricalStdErr = Number.isFinite(empiricalStdErrRaw) ? empiricalStdErrRaw : 0;

    const GOLD_STANDARD_SIMS = 15000;
    const empiricalConfidence = Math.min(1, Math.max(0, safeSimulations / GOLD_STANDARD_SIMS));
    const truncationPenalty = highTruncationStress ? 0.55 : 1;
    const uncertaintyScaledGap = empiricalVsAnalyticalGap / Math.max(1, empiricalStdErr * 2.2);
    const disagreementPenalty = Math.max(0.35, 1 - (uncertaintyScaledGap / 6));

    const analyticalWeight = Math.min(0.9, Math.max(0, (1 - empiricalConfidence) * truncationPenalty * disagreementPenalty));

    const blendedProbability = (finiteAnalyticalProbability * analyticalWeight)
        + (finiteEmpiricalProbability * (1 - analyticalWeight));

    const recommendedProbability = Number.isFinite(blendedProbability) ? blendedProbability : finiteEmpiricalProbability;

    const safeEmpMedian = toFiniteNumber(empMedian, safeMean);
    const safeRawLeft = toFiniteNumber(rawLeft, safeMean);
    const safeRawRight = toFiniteNumber(rawRight, safeMean);

    const diagnostics = {
        simulationCount: safeSimulations,
        empiricalStdErr: Number(empiricalStdErr.toFixed(3)),
        analyticalWeight: Number(analyticalWeight.toFixed(3)),
        rhoUsed: null,
        effectiveN: Math.max(1, toFiniteNumber(historyLength, safeSimulations / 10)),
        shrinkageApplied: null,
        volatilitySources: {
            withinSubject: Number(safeSD.toFixed(2)),
            betweenSubjectContribution: 0
        },
        convergence: {
            targetSE: TARGET_PROB_SE,
            achievedSE: Number(empiricalStdErr.toFixed(4)),
            sufficient: empiricalStdErr < TARGET_PROB_SE * 1.5
        },
        policy: lowSimulation ? 'low_sample' : (highTruncationStress ? 'truncated' : 'standard'),
        flashcardImmunityApplied: safeFlashcardImmunity < 1.0 ? Number(safeFlashcardImmunity.toFixed(3)) : null
    };

    return {
        simulationCount: safeSimulations,
        probability: finiteEmpiricalProbability,
        analyticalProbability: finiteAnalyticalProbability,
        recommendedProbability,
        probabilityPolicy: lowSimulation
            ? 'blended_low_sample_policy'
            : (highTruncationStress ? 'blended_truncated_policy' : 'blended_adaptive_policy'),
        analyticalWeight,
        empiricalStdErr,
        empiricalProbabilityRaw: empiricalProbability,
        empiricalProbabilityBayes: finiteEmpiricalProbability,
        mean: safeDisplayMean,
        sd: projectedSD,
        sdVisual: visualSD,
        sdLeft: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeEmpMedian - safeRawLeft)
        ),
        sdRight: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeRawRight - safeEmpMedian)
        ),
        ci95StatLow: statisticalCi95Low,
        ci95StatHigh: statisticalCi95High,
        ci95Low: displayLow,
        ci95High: displayHigh,
        ci95VisualLow: displayLow,
        ci95VisualHigh: displayHigh,
        ci95VisualClamped: wasVisualCIClamped,
        ciConformalLow: statisticalCi95Low,
        ciConformalHigh: statisticalCi95High,
        currentMean: safeCurrentMean,
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allScores, safeDisplayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal',
        diagnostics
    };
}


function hashObject(obj) {
    try {
        return JSON.stringify(obj);
    } catch {
        return null;
    }
}

export function runMonteCarloAnalysis(params = {}) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        console.warn("[MC Engine] Fallback acionado. 'runMonteCarloAnalysis' requer objeto. Ignorando chamada bruta.");
        return monteCarloSimulation([], 85, 90, 5000, {});
    }

    // ✅ LOTE-04 FIX (A4): aceitar chave pré-computada (ex.: pureStatsHash do hook)
    // para evitar JSON.stringify de payloads enormes a cada chamada.
    const cacheKey = (typeof params.cacheKey === 'string' && params.cacheKey.length > 0)
        ? params.cacheKey
        : hashObject(params);
    const cached = getCachedSimulation(cacheKey);
    if (cached) return cached;

    const {
        values = [],
        dates = [],
        meta = 0,
        targetScore: objTargetScore,
        simulations = 5000,
        projectionDays = 90,
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: objMinScore,
        maxScore: objMaxScore,
        subjects: objSubjects,
        historicalCutoffs: objHistoricalCutoffs,
        cacheKey: _providedCacheKey, // ✅ LOTE-04: não vazar para mergedOptions
        ...options
    } = params;

    const safeDomain = sanitizeDomain(objMinScore, objMaxScore);
    const domainMin = safeDomain.minScore;
    const domainMax = safeDomain.maxScore;

    const rawResolvedTarget = objTargetScore ?? Number(meta || 0);
    const resolvedTarget = clamp(toFiniteNumber(rawResolvedTarget, domainMin), domainMin, domainMax);

    const safeSimulations = sanitizeSimulations(simulations);
    // ✅ LOTE-03 FIX: "simular hoje" é um caso de uso válido (effectiveSimulateToday)
    const safeProjectionDays = Math.max(0, Math.floor(toFiniteNumber(projectionDays, 90)));

    const safeSubjects = objSubjects === undefined ? undefined : sanitizeSubjects(objSubjects);

    const safeHistoricalCutoffs = objHistoricalCutoffs === undefined
        ? undefined
        : (Array.isArray(objHistoricalCutoffs)
            ? objHistoricalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
            : []);

    const mergedOptions = {
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: domainMin,
        maxScore: domainMax,
        subjects: safeSubjects,
        historicalCutoffs: safeHistoricalCutoffs,
        ...options,
    };

    const extractScore = (value) => {
        if (value && typeof value === 'object') {
            return value.score ?? value.value;
        }
        return value;
    };

    const safeDates = dates || [];
    const safeValues = values || [];

    const history = safeValues
        .map((score, index) => {
            const rawScore = extractScore(score);
            const isNuloOuVazio = rawScore === null || rawScore === undefined || String(rawScore).trim() === '';
            
            const baseObj = (typeof score === 'object' && score !== null) ? score : {};

            return {
                ...baseObj,
                score: isNuloOuVazio ? NaN : Number(rawScore),
                date: safeDates[index] || baseObj.date || getDateKey(new Date())
            };
        })
        .filter(row => Number.isFinite(row.score));

    const result = monteCarloSimulation(history, resolvedTarget, safeProjectionDays, safeSimulations, mergedOptions);
    
    if (cacheKey) {
        setCachedSimulation(cacheKey, result);
    }
    
    return result;
}

export function clearEngineMcCache() {
    clearSimulationCache();
}

export default {
    runMonteCarloAnalysis,
    clearEngineMcCache
};

`

## src/engine/projection.js

`javascript
// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32 } from './random.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { conformalPredictionInterval } from './math/bootstrap.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

import { sampleTruncatedNormal, ensurePositiveSemiDefinite, choleskyDecomposition, applyCovariance, generateGaussian } from './math/gaussian.js';
// ✅ LOTE-04 FIX: Z_95 e MIN_SD_FLOOR removidos — não eram usados aqui
// (Z_95 vive em stats.js; MIN_SD_FLOOR vive em gaussian.js)
import { kahanSum, kahanMean } from './math/kahan.js';
import { weightedRegression, getSortedHistory, calculateSlopePerDay } from './stats.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
// ✅ LOTE-04 FIX: re-export removido. Estes símbolos já são exportados por
// stats.js; o engine/index.js faz `export *` dos dois, e a duplicidade criava
// ambiguidade de star-export. O import interno acima continua intacto.

// 1. Blindagem de Datas: Adicione este helper no topo do arquivo (após os imports)
const getSafeTime = (dateInput) => {
    const parsed = safeDateParse(dateInput);
    return (parsed && !Number.isNaN(parsed.getTime())) ? parsed.getTime() : Date.now();
};

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------

/**
 * NEW: Simple non-linear detrending helper (log-time improvement curve).
 * Many students improve fast then plateau.
 */
export function computeNonLinearTrend(history, maxScore = 100, lambda = 0.08) {
  const sorted = getSortedHistory(history);
  if (sorted.length < 4) return { slope: 0, intercept: 50, type: 'linear' };

  const now = Date.now();
  const t0 = getSafeTime(sorted[0].date || sorted[0].createdAt);

  // Fit simple model: y ~ a + b * log(1 + days)
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

  sorted.forEach(h => {
    const y = getSafeScore(h, maxScore);
    const t = Math.max(0, (getSafeTime(h.date || h.createdAt) - t0) / 86400000);
    const x = Math.log(1 + t + 1); // log time
    const w = Math.exp(-lambda * Math.max(0, (now - getSafeTime(h.date || h.createdAt)) / 86400000));

    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXX += w * x * x;
    sumWXY += w * x * y;
  });

  const denom = (sumWXX * sumW - sumWX * sumWX);
  if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sumWY / sumW, type: 'log' };

  const b = (sumWXY * sumW - sumWX * sumWY) / denom;
  const a = (sumWY - b * sumWX) / sumW;

  return { slope: b, intercept: a, type: 'log_time', logTimeFit: true };
}

export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const validSorted = sorted.filter(h => Number.isFinite(getSafeScore(h, maxScore)));
    if (validSorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate || Date.now();
    const _scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(validSorted, lambda, maxScore, options);
    // CORREÇÃO: Defesa estrita contra null/undefined que disparam TypeError no getTime()
    const d0 = safeDateParse(validSorted[0].date || validSorted[0].createdAt);
    const t0_vol = (d0 && !Number.isNaN(d0.getTime())) ? d0.getTime() : Date.now();
    
    // OTIMIZAÇÃO DE PERFORMANCE: Fusão de loops O(5N) para O(N)
    let sumWeights = 0, sumResidualsWeighted = 0, sumSw = 0, sumSw2 = 0;

    const residualSamples = validSorted.map(h => {
        const hDate = h.date || h.createdAt;
        const parsed = safeDateParse(hDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        const x = (parsed.getTime() - t0_vol) / 86400000;
        const t = Math.max(0, (now - parsed.getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore);
        const val = y - (intercept + slope * x); // Resíduo (detrended)
        
        // Acumulação numa única passagem
        sumWeights += w;
        sumResidualsWeighted += val * w;
        sumSw += val * val * w;
        sumSw2 += w * w;

        return { value: val, weight: w }; 
    }).filter(Boolean);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-15 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-15 ? (sumResidualsWeighted / safeWeights) : 0;
    
    // CORREÇÃO: Calcular o Tamanho Efetivo de Amostra (Kish) dos pesos exponenciais
    const effectiveN = sumSw2 > 1e-15 ? (sumWeights * sumWeights) / sumSw2 : 1;
    
    // O bessel deve responder ao Effective N, não à contagem bruta temporal (n_res)
    const bessel = effectiveN > 1.5 ? effectiveN / (effectiveN - 1) : 1;
    const mssdVariance = sumWeights > 1e-15 ? Math.max(0, ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel) : 0;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = kahanSum(sortedArr.map(it => it.weight));
        if (totalW < 1e-15) return sortedArr[Math.floor(sortedArr.length / 2)].value;
        let accW = 0;
        for (const it of sortedArr) {
            accW += it.weight;
            if (accW >= totalW * 0.5) return it.value;
        }
        return sortedArr[sortedArr.length - 1].value;
    };

    const medianResidual = weightedMedian(residualSamples);
    const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
    const mad = weightedMedian(absDev);
    const robustSigma = 1.4826 * mad;
    const robustVariance = robustSigma * robustSigma;
    const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

    // O PULO DO GATO: Shrinkage Bayesiano para Volatilidade (Bug 1 Fix)
    // Assumimos que o piso natural de flutuação de qualquer aluno é de ~4% do Range
    const rangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const floorVolatility = rangeOU * 0.04; 
    const floorVariance = Math.pow(floorVolatility, 2);
    
    // Quanto menor a amostra, mais puxamos para o piso natural.
    const confidence = Math.min(1, validSorted.length / 15);
    const trueVariance = (blendedVariance * confidence) + (floorVariance * (1 - confidence));

    return Math.sqrt(Math.max(1e-6, trueVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    const n = scores.length;
    if (n < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const meanVal = kahanMean(scores);
    const variance = kahanSum(scores.map(b => Math.pow(b - meanVal, 2))) / (n - 1);
    return Math.sqrt(variance);
}

// -----------------------------
// MSSD — Mean Successive Squared Differences (BUG-MATH-01)
// Mede instabilidade SEM penalizar crescimento monotônico.
// -----------------------------
export function calculateMSSD(history, maxScore = 100, minScore = 0) {
  const safeHistory = getSortedHistory(history);
  if (!Array.isArray(safeHistory) || safeHistory.length < 2) {
    const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    return 0.05 * range;
  }
  
  const firstDateObj = safeDateParse(safeHistory[0].date || safeHistory[0].createdAt);
  const t0 = firstDateObj ? firstDateObj.getTime() : Date.now();
  
  // ✅ FIX: Create aligned pairs to prevent index misalignment
  const validPairs = [];
  for (let i = 0; i < safeHistory.length; i++) {
    const h = safeHistory[i];
    const score = getSafeScore(h, maxScore);
    const dateObj = safeDateParse(h.date || h.createdAt);
    const t = dateObj ? dateObj.getTime() : NaN;
    
    if (Number.isFinite(score) && Number.isFinite(t)) {
      validPairs.push({
        score: score,
        timeX: (t - t0) / 86400000,
        fatigueFlag: h.fatigueFlag
      });
    }
  }
  
  const fn = validPairs.length;
  if (fn < 2) {
    const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    return 0.05 * range;
  }
  
  const scores = validPairs.map(p => p.score);
  const timeX = validPairs.map(p => p.timeX);
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for(let i = 0; i < fn; i++) {
    const tx = timeX[i];
    sumX += tx;
    sumY += scores[i];
    sumXY += tx * scores[i];
    sumXX += tx * tx;
  }
  
  const det = fn * sumXX - sumX * sumX;
  const slope = det === 0 ? 0 : (fn * sumXY - sumX * sumY) / det;
  
  const detrendedScores = scores.slice(0, fn).map((y, i) => y - (slope * timeX[i])).filter(Number.isFinite);
  const dn = detrendedScores.length;
  
  let sumSqDiff = 0;
  let validTransitions = 0;
  
  for (let i = 1; i < dn; i++) {
    const diff = detrendedScores[i] - detrendedScores[i - 1];
    if (Number.isFinite(diff)) {
      const isFatigueDrop = diff < 0 && validPairs[i]?.fatigueFlag;
      const effectiveDiff = isFatigueDrop ? diff * 0.5 : diff;
      sumSqDiff += Math.pow(effectiveDiff, 2);
      validTransitions++;
    }
  }
  
  const rmssd = (sumSqDiff) / (2 * Math.max(1, validTransitions));
  return Math.sqrt(Math.max(1e-6, rmssd));
}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    // BUG-02 FIX: Implementação de EMA Dinâmica com Decaimento Temporal Contínuo.
    // Resolve a distorção onde longos períodos de inatividade eram ignorados (amnésia temporal).
    // Fórmula: α_real = 1 - (1 - α_base)^Δt
    const alphaBase = 2 / (n + 1);
    const deltaT = Math.max(1, daysSinceLast);
    
    // O decaimento exponencial contínuo garante que o peso da nova nota cresça proporcionalmente
    // ao tempo decorrido desde o último registro, compensando o "esquecimento".
    const alphaDinamico = 1 - Math.pow(1 - alphaBase, deltaT);
    
    // CORREÇÃO: O teto cognitivo desce de 0.95 para 0.40.
    // Garante que, independentemente do gap temporal, um teste único nunca
    // substitui mais de 40% da inércia da memória de longo prazo consolidada.
    const safeAlpha = Math.min(0.40, alphaDinamico);
    
    return (currentScore * safeAlpha) + (previousEMA * (1 - safeAlpha));
}

// -----------------------------
// Drift Clampeado
// -----------------------------
// ✅ FIX: calculateSlope com clamp proporcional à escala
export function calculateSlope(trendOrHistory, maxScoreOrOptions = 100, options = {}) {
  if (Array.isArray(trendOrHistory)) {
    const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
    const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
    
    const normalizedHistory = trendOrHistory
      .filter(item => item != null)
      .map(item => {
      if (typeof item === 'number') {
        return { score: item, date: null };
      }
      if (item && typeof item === 'object') {
        const score = Number(item.score ?? item.value);
        return {
          score: Number.isFinite(score) ? score : NaN,
          date: item.date || item.createdAt || null
        };
      }
      return { score: NaN, date: null };
    }).filter(item => Number.isFinite(item.score));
    
    if (normalizedHistory.length < 2) return 0;
    const result = calculateAdaptiveSlope(normalizedHistory, maxScore, opts);
    return Number.isFinite(result) ? result : 0;
  }
  
  // ✅ FIX: Clamp proporcional à amplitude real (maxScore - minScore) da prova
  const safeMax = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : 100;
  const safeMin = Number.isFinite(options?.minScore) ? options.minScore : 0;
  const range = Math.max(1e-9, safeMax - safeMin);
  // 0.4% do range por dia como limite máximo
  const absoluteMax = 0.004 * range;
  let slope = Number(trendOrHistory) || 0;
  if (!Number.isFinite(slope)) return 0;
  if (slope > absoluteMax) slope = absoluteMax;
  if (slope < -absoluteMax) slope = -absoluteMax;
  return slope;
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    const trend = calculateSlopePerDay(history, maxScore);
    return calculateSlope(trend, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate || Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    if (historicalScores.length < 4) return { isLogistic: false };
    
    const meanVal = kahanSum(historicalScores) / Math.max(1, historicalScores.length);
    const devs = historicalScores.map(b => Math.pow(b - meanVal, 2));
    const currentVariance = Math.sqrt(kahanSum(devs) / Math.max(1, historicalScores.length - 1));

    let L = maxScore;
    if (historicalScores.length >= 4) {
        const validScores = historicalScores;
        if (validScores.length >= 4) {
            const sortedScores = [...validScores].sort((a, b) => a - b);
            const peak1 = sortedScores[sortedScores.length - 1];
            const peak2 = sortedScores[sortedScores.length - 2];
            const robustPeak = (peak1 * 0.6) + (peak2 * 0.4);
            const dynamicHeadroom = Math.min(maxScore * 0.15, Math.max(currentVariance * 1.5, maxScore * 0.05));
            // BUG-AUDIT-07 FIX: calculateSlope espera objetos {date, score}, não números puros.
            // Gerar objetos sintéticos com datas espaçadas de 7 dias para manter o contrato.
            const recentRaw = validScores.slice(-4);
            const recentAsObjects = recentRaw.map((s, idx) => ({
                score: s,
                date: getDateKey(new Date(Date.now() - (recentRaw.length - 1 - idx) * 7 * 86400000))
            }));
            const recentTrend = calculateSlopePerDay(recentAsObjects, maxScore);
            const recentSlope = calculateSlope(recentTrend, maxScore, options);
            const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (maxScore * 0.01)) : 0;
            
            L = robustPeak + (dynamicHeadroom * slopeMultiplier);
            L = Math.max(validScores[validScores.length - 1] + 1, Math.min(maxScore + 0.1, L));
        } else {
            const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
            const peakScore = getPercentile(sortedForPercentile, 0.90);
            L = Math.min(maxScore + 0.1, peakScore + (maxScore * 0.10));
        }
    } else {
        const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
        const peakScore = getPercentile(sortedForPercentile, 0.90);
        const spaceToMax = maxScore - peakScore;
        const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
        L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
    }

    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = Math.max(0, (now - getSafeTime(hDate)) / 86400000);
        const w = Math.exp(-0.08 * t);
        const x = (getSafeTime(hDate) - getSafeTime(sorted[0].date || sorted[0].createdAt)) / 86400000;
        
        let y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) return;
        
        y = Math.max(maxScore * 0.01, Math.min(maxScore, y));

        const safeMin = options.minScore || 0;
        const safeL = Math.max(L, y + 0.5); 
        // Offset proporcional à escala (0.1% do range) para evitar logit ±∞
        const logitOffset = Math.max(0.01, (safeL - safeMin) * 0.001);
        const boundedY = Math.max(safeMin + logitOffset, Math.min(safeL - logitOffset, y)); 
        const logitY = Math.log((boundedY - safeMin) / (safeL - boundedY));

        sumW += w;
        sumWX += w * x;
        sumWY += w * logitY;
        sumWXX += w * x * x;
        sumWXY += w * x * logitY;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { isLogistic: false };

    const k = (sumW * sumWXY - sumWX * sumWY) / det;
    const logitIntercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    return { 
        k, 
        intercept: logitIntercept, 
        isLogistic: true, 
        L, 
        t0: getSafeTime(sorted[0].date || sorted[0].createdAt) 
    };
}

export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: 0, marginOfError: 0 };

    const logisticFit = logisticRegression(sortedHistory, maxScore, options);
    let projectedScore;
    const now = options.referenceDate || Date.now();
    
    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, options) : { slopeStdError: 0 };
    let eventVolatility = calculateMSSD(sortedHistory, maxScore, minScore);

    // Bug 2.3 Fix: Divergência Asintótica no Amortecimento
    let linearSlope = 0;
    if (!(logisticFit.isLogistic && logisticFit.k > 0)) {
        let trend = calculateSlopePerDay(sortedHistory, maxScore);
        linearSlope = calculateSlope(trend, maxScore, options);
    }

    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift: linearSlope,
        driftUncertainty: slopeStdError,
        scaleFactor: maxScore / 100,
        normalizedVol: (eventVolatility / (maxScore - minScore > 0 ? maxScore - minScore : maxScore)) * 100
    });

    const maxEffectiveDays = dampingBase * Math.log(1 + projectDays / dampingBase);
    const effectiveDaysForDrift = Math.min(projectDays, maxEffectiveDays);

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = options.minScore || 0;
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        // Removemos a mistura corrompida. O EMA continuará a usar o `linearSlope`
        // para projetar o futuro no Random Walk.

        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);
            
            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    // Se o aluno tira 80 e a média global é 50, a nota "efetiva" puxa o EMA para cima
                    // Limitado a um bônus/punição máximo de 5% para não distorcer a realidade
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }

        
        // CORREÇÃO: Driftar a EMA da data do último teste até o dia de HOJE, 
        // para alinhar a origem do vetor temporal com a realidade atual.
        const lastHistoryDate = getSafeTime(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const daysToToday = Math.max(0, (now - lastHistoryDate) / 86400000);

        if (options.currentMean !== undefined) {
            const daysToNow = Math.max(1, daysToToday);
            ema = calculateDynamicEMA(options.currentMean, ema, sortedHistory.length + 1, daysToNow);
        }

        const driftToToday = linearSlope * (dampingBase * Math.log(1 + daysToToday / dampingBase));
        const currentScoreEstimate = ema + driftToToday;

        // Projeção final 100% matéticamente consistente
        projectedScore = currentScoreEstimate + linearSlope * effectiveDaysForDrift;
    }

    const avgGapDays = sortedHistory.length > 1 
        ? ((safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt) - safeDateParse(sortedHistory[0].date || sortedHistory[0].createdAt)) / 86400000) / (sortedHistory.length - 1)
        : 7; // fallback para 7 se só houver 1 teste
        
    // AGILIDADE AI: Punição de Volatilidade baseada no tempo de resposta lento
    if (options.agilityPenalty) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        eventVolatility = eventVolatility * (1 + safePenalty * 1.5);
    }
    
    // A incerteza do Random Walk espalha-se com a raiz do número de EVENTOS ESPERADOS, não dos dias.
    const expectedFutureEvents = Math.max(1, projectDays / Math.max(0.5, avgGapDays));
    const randomWalkUncertainty = eventVolatility * Math.sqrt(expectedFutureEvents);
    
    // Aplica o amortecimento do drift à incerteza angular (evita explosão da incerteza a longo prazo)
    const angularUncertainty = slopeStdError * effectiveDaysForDrift;
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    // Usar T-Student adaptativo para amostras pequenas em vez de Z=1.96 fixo
    const tMult = getConfidenceMultiplier(sortedHistory.length);
    const marginOfError = tMult * predictionSD; 

    return {
        // FIX #2: Precisão completa
        projected: Number.isNaN(projectedScore) ? minScore : Math.max(minScore, Math.min(maxScore, projectedScore)),
        marginOfError
    };
}

/**
 * Calcula o Damping Base adaptativo baseado no histórico.
 * @returns {number} Valor entre 30 e 60.
 */
export function computeAdaptiveDampingBase({ sampleSize, drift, driftUncertainty, scaleFactor, normalizedVol }) {
    const n = Math.max(1, Number(sampleSize) || 1);
    const safeDrift = Number.isFinite(drift) ? drift : 0;
    const safeUncertainty = Math.max(1e-6, Number(driftUncertainty) || 0);
    const safeScale = Math.max(1e-6, Number(scaleFactor) || 1);
    const safeNormVol = Math.max(0, Number(normalizedVol) || 0);

    const nConfidence = 1 - Math.exp(-n / 12);
    const trendSNR = Math.abs(safeDrift) / Math.max(0.05 * safeScale, safeUncertainty);
    const trendConfidence = Math.tanh(trendSNR / 2);
    const volPenalty = Math.min(1, safeNormVol / 18);
    const confidenceScore = Math.max(0, Math.min(1, (0.5 * nConfidence) + (0.35 * trendConfidence) + (0.15 * (1 - volPenalty))));
    return 30 + (30 * confidenceScore);
}

export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 5000,
    options = {}
) {
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base', flashcardImmunity = 1.0 } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
    const sortedHistory = getSortedHistory(history);
    const safeSimulations = Math.max(1, simulations);
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    // Defaults for new diagnostics
    let trendType = 'linear';

    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Find the last valid score in the sorted history
    let validCurrentScore = NaN;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const s = getSafeScore(sortedHistory[i], maxScore);
        if (Number.isFinite(s)) {
            validCurrentScore = s;
            break;
        }
    }
    const currentScore = Number.isFinite(validCurrentScore) ? validCurrentScore : 0;
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;
    if (sortedHistory.length > 0) {
        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);

            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }
        if (forcedBaseline === undefined) {
            baselineScore = optionsCurrentMean !== undefined ? optionsCurrentMean : ema;
        }
    }

    if (optionsCurrentMean !== undefined) {
        const lastDate = safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const referenceNow = options.referenceDate || Date.now();
        const lastTs = lastDate && !Number.isNaN(lastDate.getTime()) ? lastDate.getTime() : Date.now();
        const daysToNow = Math.max(1, (referenceNow - lastTs) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }
    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;   // ✅ LOTE-03
    // ✅ LOTE-06 FIX (SCENARIO-1): meanBiasFactor é percentual do maxScore, não do range.
    // Com minScore > 0, usar range distorcia o bias (ex: 2.5% de 800 em vez de 2.5% de 1000).
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * maxScore)));

    // FEAT: Time Penalty (Simulação de Prova Real)
    let timePenaltyApplied = false;
    let timePenaltyScoreDrop = 0;
    let projectedTotalTimeSeconds = options.projectedTotalTimeSeconds || 0;
    let examDurationMinutes = options.examDurationMinutes || 0;
    let overflowRatio = 0;

    if (examDurationMinutes > 0 && projectedTotalTimeSeconds > 0) {
        const examLimitSeconds = examDurationMinutes * 60;
        if (projectedTotalTimeSeconds > examLimitSeconds) {
            overflowRatio = (projectedTotalTimeSeconds - examLimitSeconds) / projectedTotalTimeSeconds;
            
            // O aluno só consegue resolver com qualidade (1 - overflowRatio) da prova.
            // O restante (overflowRatio) será chutado, com probabilidade de acerto de 20% (1/5).
            const guessScore = 0.2 * (maxScore - minScore) + minScore; // 20% na escala correta
            const newBaseline = (baselineScore * (1 - overflowRatio)) + (guessScore * overflowRatio);
            
            timePenaltyScoreDrop = baselineScore - newBaseline;
            baselineScore = newBaseline;
            timePenaltyApplied = true;
        }
    }

    // IMPROVED mean reversion (from Coach+MC analysis): give stronger weight to historical mean when performance is declining.
    // This prevents the projection from collapsing too aggressively on negative drift.
    const histScores = sortedHistory.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    let historicalMean = histScores.length > 0 ? kahanMean(histScores) : baselineScore;

    // Aplica o esmagamento da métrica no equilíbrio de longo prazo também
    if (timePenaltyApplied && overflowRatio > 0) {
        const guessScore = 0.2 * (maxScore - minScore) + minScore;
        historicalMean = (historicalMean * (1 - overflowRatio)) + (guessScore * overflowRatio);
    }

    const belowHistorical = baselineScore < historicalMean;
    const histWeight = belowHistorical ? 0.95 : 0.80;
    const stableMeanTarget = Math.max(minScore, Math.min(maxScore, (historicalMean * histWeight + baselineScore * (1 - histWeight))));

    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, options)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    let effectiveDriftSlope = regressionResult.slope;

    trendType = 'linear';
    if (sortedHistory.length >= 4) {
        try {
            const nl = computeNonLinearTrend(sortedHistory, maxScore, 0.08);
            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
                trendType = 'log_time_available';
                // NOTE: Do not blend nl.slope directly (different units).
                // Drift uses pure linear slope for correctness.
            }
        } catch { /* ignore */ }
    }

    const slopeStdError = regressionResult.slopeStdError;
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * range;   // antes: * maxScore
    const drift = Math.max(-driftLimit, Math.min(driftLimit, effectiveDriftSlope));
    const simulationDays = days;
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    const driftUncertaintyCap = options.driftUncertaintyCap !== undefined ? options.driftUncertaintyCap : 0.4;
    let driftUncertainty = Math.min(rawDriftUncertainty, driftUncertaintyCap * scaleFactor) * (scenarioCfg.ciMult || 1);

    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5;
        driftUncertainty *= (1 + 0.4 * nFactor);
    }

    let volatility = forcedVolatility !== undefined 
        ? Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore), forcedVolatility)
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);
    
    // Bug 2.2 Fix: Double Jeopardy (Evita dupla penalização se o overflowRatio já trucidou a média)
    // Se o timePenaltyApplied estiver ativo, já absorvemos o abalo do tempo, inflar a variância
    // agora atiraria o cone do Monte Carlo para um cenário irrealista de descalabro.
    if (options.agilityPenalty && !timePenaltyApplied) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        volatility = volatility * (1 + safePenalty * 1.5);
    }

    // NEW: Flashcard Immunity Shield — reduz volatilidade global no caminho de projeção
    if (flashcardImmunity < 1.0) {
        volatility = volatility * Math.max(0.80, flashcardImmunity);
    }

    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    
    // ✅ FIX: thetaOU agora escala com a confiança da amostra.
    // Poucos dados → reversão mais forte (conservador).
    // Muitos dados → reversão mais fraca (confia na tendência).
    const sampleConfidence = Math.min(1, sortedHistory.length / 15);
    const thetaOU = Math.min(
      0.15,
      (0.02 + 0.06 * (1 - sampleConfidence)) + 0.002 * Math.min(40, normalizedVolOU)
    );

    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;
        const d1 = safeDateParse(h.date || h.createdAt);
        const d0 = safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt);
        const t1 = d1 && !Number.isNaN(d1.getTime()) ? d1.getTime() : Date.now();
        const t0 = d0 && !Number.isNaN(d0.getTime()) ? d0.getTime() : t1;
        const deltaT = (t1 - t0) / (1000 * 60 * 60 * 24);
        const safeDeltaT = Number.isFinite(deltaT) ? deltaT : 0.1;
        const rawDays = Math.max(0.1, safeDeltaT);
        const detrendedChange = actualChange - (drift * rawDays);
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    const validResiduals = (residuals.length > 1 ? residuals.slice(1) : residuals).filter(Number.isFinite);
    let centeredResiduals;
    if (validResiduals.length > 1) {
        const residualMean = kahanSum(validResiduals) / Math.max(1, validResiduals.length);
        centeredResiduals = validResiduals.map(r => r - residualMean);
    } else {
        centeredResiduals = validResiduals;
    }
    
    const sortedResiduals = [...centeredResiduals].sort((a, b) => a - b);
    const resMedian = getPercentile(sortedResiduals, 0.5);
    const absDevs = centeredResiduals.map(r => Math.abs(r - resMedian)).sort((a, b) => a - b);
    const resMad = getPercentile(absDevs, 0.5) || (1.0 * scaleFactor);
    const safeResiduals = centeredResiduals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    const empMean = kahanSum(safeResiduals) / Math.max(1, safeResiduals.length);
    const empDevs = safeResiduals.map(r => Math.pow(r - empMean, 2));
    const empResidualSD = Math.sqrt(kahanSum(empDevs) / Math.max(1, safeResiduals.length));
    const standardizer = empResidualSD > 0 ? empResidualSD : 1;

    const results = [];
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore)}-${sortedHistory.length}`;
    let seedValue = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        seedValue ^= seedStr.charCodeAt(i);
        seedValue = Math.imul(seedValue, 16777619);
    }
    const rng = mulberry32(Math.abs(seedValue >>> 0));

    let medianGap = 7;
    if (sortedHistory.length >= 2) {
        const gaps = [];
        for (let j = 1; j < sortedHistory.length; j++) {
            const d1 = safeDateParse(sortedHistory[j].date || sortedHistory[j].createdAt);
            const d0 = safeDateParse(sortedHistory[j - 1].date || sortedHistory[j - 1].createdAt);
            // CORREÇÃO: Impedir que a subtração de Invalid Dates injete NaN na distribuição GARCH
            const g = (d1 && d0 && !Number.isNaN(d1.getTime()) && !Number.isNaN(d0.getTime())) 
                ? (d1.getTime() - d0.getTime()) / 86400000 
                : 7; // Fallback seguro
            gaps.push(Math.max(0.5, g));
        }
        gaps.sort((a, b) => a - b);
        medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
    }
    // A volatilidade estocástica diária deve ser escalada pelo gap médio entre provas
    // para que a variância cresça corretamente como um Random Walk/OU process.
    const dailyVolatility = Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore),
      volatility / Math.sqrt(Math.max(1, medianGap)));

    // [BUG-1 FIX] Usar o damping adaptativo em vez do hardcode de 45.
    // Com poucos dados/alta vol, dampingBase ≈ 30 (amortece rápido).
    // Com muitos dados/tendência clara, dampingBase ≈ 60 (preserva mais).
    // Movido para fora do loop: inputs invariantes por simulação.
    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift,
        driftUncertainty,
        scaleFactor,
        normalizedVol: normalizedVolOU
    });

    // Constantes GARCH(1,1) invariantes por simulação
    const alphaG = 0.05;
    const betaG = 0.75;
    // BUG-AUDIT-02 FIX: omega calculado com a variância incondicional de equilíbrio (σ²_∞),
    // σ²_∞ = ω / (1 - α - β), logo ω = (1 - α - β) × σ²_∞
    // CORREÇÃO: Prevenir o GARCH Zero-Variance Trap
    const unconditionalVar = Math.max(1e-6, Math.pow(dailyVolatility, 2));
    const omega = (1 - alphaG - betaG) * unconditionalVar;
    // ✅ LOTE-01 FIX (A7): clamp de sanidade do GARCH proporcional ao RANGE real,
    // não ao teto absoluto (consistente com as correções LOTE-03 do arquivo).
    const rangeVolClamp = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const maxVolSqClamp = Math.pow(rangeVolClamp * 0.2, 2);

    // FIX #3: Prepare Cholesky for correlated subject minCutoffs (disciplines with minCutoff)
    const cutoffSubjects = (options.subjects || []).filter(s => s && Number(s.minCutoff) > 0);
    let subjectCholesky = null;
    if (cutoffSubjects.length > 1) {
      const stats = cutoffSubjects.map(s => ({
          ...s, // Bug 4.2 Fix: Preserve properties to allow empirical Pearson correlation later
          sd: (Number(s.sd) || 1) * Math.max(0.80, s.immunityFactor || 1.0)
      }));
      
      // FIX APLICADO: Utilizando cutoffSubjects para resgatar os nomes corretamente
      const adaptiveRhoContext = options?.simuladoRows ? { 
          simuladoRows: options.simuladoRows, 
          categoryNames: cutoffSubjects.map(s => s.name) 
      } : null;
      
      const cov = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
      const psdCov = ensurePositiveSemiDefinite(cov);
      subjectCholesky = choleskyDecomposition(psdCov);
    }

    function calculateSkewness(residuals, mean) {
        if (!residuals || residuals.length < 3) return 0;
        const n = residuals.length;
        let sumSquared = 0;
        for (let i = 0; i < n; i++) sumSquared += Math.pow(residuals[i] - mean, 2);
        const variance = sumSquared / n;
        const standardizer = Math.sqrt(variance);
        
        if (standardizer === 0) return 0;

        let m3 = 0;
        for (let i = 0; i < n; i++) m3 += Math.pow(residuals[i] - mean, 3);
        m3 /= n;

        return m3 / Math.pow(standardizer, 3);
    }
    
    // PATCH 1: Recalcular a média real do subconjunto filtrado
    const subsetMean = safeResiduals.length > 0 
        ? safeResiduals.reduce((acc, val) => acc + val, 0) / safeResiduals.length 
        : 0;

    const residualsSkew = calculateSkewness(safeResiduals, subsetMean);

    const minCutoffFailures = [];

    // CORREÇÃO GC THRASHING: Alocação estática fora do loop de Monte Carlo
    const choleskySize = cutoffSubjects.length;
    const zVecStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const zCorrStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    for (let i = 0; i < safeSimulations; i++) {
        // CORREÇÃO: O truncamento normal tem de respeitar o driftLimit dinâmico e não hardcodes de 1%.
        const sampledDrift = sampleTruncatedNormal(
            drift, 
            driftUncertainty, 
            -driftLimit, 
            driftLimit, 
            rng
        );
        let currentSimScore = baselineScore;
        let currentVolSq = unconditionalVar;

        for (let d = 1; d <= simulationDays; d++) {
            // [RIGOR-FIX] Drift Damping Adaptativo: O impacto da tendência diminui com o tempo (Log-decay)
            // dampingBase varia de 30 (conservador) a 60 (confiante) conforme qualidade do sinal.
            const driftDamping = 1 / (1 + d / dampingBase); 
            const driftEffect = sampledDrift * driftDamping;

            // IMPROVED: Stronger reversion to historical mean, especially on negative drift.
            // The O-U reversion target should be stable to prevent double counting drift.
            let meanReversionTarget = stableMeanTarget;
            meanReversionTarget = Math.min(maxScore, Math.max(minScore, meanReversionTarget));
            let meanReversion = Math.max(0.005, thetaOU) * (meanReversionTarget - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            // Prevent extreme reversion pulls that cause artificial boundary piling in long simulations
            const maxReversionPull = adaptiveVol * 3;
            meanReversion = Math.max(-maxReversionPull, Math.min(maxReversionPull, meanReversion));
            
            // CORREÇÃO: Padrão Ouro de Filtered Historical Simulation (FHS)
            // O choque empírico tem de ser escalado para a volatilidade GARCH atual
            let shock = 0;
            if (safeResiduals.length >= 15) {
                // 90% Bootstrap (Histórico Empírico) / 10% Gaussiano Assimétrico (Black Swan)
                if (rng() > 0.10) {
                    const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                    shock = (rawEmpirical / standardizer) * adaptiveVol; 
                } else {
                    // PATCH: Gaussian Skew Adjustment (Cornish-Fisher expansion to maintain zero mean)
                    const z = generateGaussian(rng);
                    const zCF = z + (residualsSkew * (z * z - 1)) / 6.0; 
                    shock = zCF * adaptiveVol;
                }
            } else if (safeResiduals.length > 5 && rng() > 0.3) {
                const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                shock = (rawEmpirical / standardizer) * adaptiveVol; 
            } else {
                shock = generateGaussian(rng) * adaptiveVol;
            }
            
            // ✅ LOTE-03 FIX: o clamp por dailyVolatility sufocava choques quando o GARCH
            // já tinha elevado adaptiveVol — a trajetória não podia realizar a própria variância
            const shockLimit = Math.max(dailyVolatility, adaptiveVol) * 3;
            const clampedShock = Math.max(-shockLimit, Math.min(shockLimit, shock));
            
            // Evolução da Volatilidade GARCH(1,1): Var(t+1) = w + a*e^2 + b*Var(t)
            currentVolSq = omega + alphaG * Math.pow(clampedShock, 2) + betaG * currentVolSq;
            
            // Clamp de sanidade para evitar divergência explosiva em projeções longas
            currentVolSq = Math.min(currentVolSq, maxVolSqClamp); // ✅ LOTE-01 FIX (A7)
            
            currentSimScore += driftEffect + meanReversion + clampedShock; // consistente com GARCH
            
            // Simple clamp to bounds (mean reversion + historical target should keep trajectories reasonable).
            // Removed complex RBM reflection which was causing boundary piling bias in declining series (scores clustering at minScore, skewing means low).
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Number.isNaN(currentSimScore) ? minScore : Math.max(minScore, Math.min(maxScore, currentSimScore));
        }

        // Aplica os limites físicos da prova APENAS no resultado assintótico final
        // Preservação de sinal estrito: O backend mantém o valor bruto. 
        // O clamping ocorre apenas na camada de UI (MonteCarloGauge.jsx).
        results.push(currentSimScore);
        
        let passedMins = true;
        if (choleskySize > 0) {
            if (subjectCholesky) {
                // Reutilização extrema de memória: mutar o array em vez de re-alocar
                for(let k = 0; k < choleskySize; k++) {
                    zVecStatic[k] = generateGaussian(rng);
                }
                applyCovariance(subjectCholesky, zVecStatic, zCorrStatic);
                for (let j = 0; j < choleskySize; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    // PATCH 2: Cholesky L matrix already contains standard deviations on its diagonal
                    const raw = Number(s.mean) + zCorrStatic[j];
                    const subjScore = Math.max(sMin, Math.min(sMax, raw));
                    if (subjScore < Number(s.minCutoff)) {
                        passedMins = false;
                        break;
                    }
                }
            } else {
                // fallback independent
                for (let j = 0; j < cutoffSubjects.length; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const effSd = s.sd * Math.max(0.80, s.immunityFactor || 1.0);
                    const subjScore = sampleTruncatedNormal(s.mean, effSd, sMin, sMax, rng);
                    if (subjScore < s.minCutoff) {
                        passedMins = false;
                        break;
                    }
                }
            }
        }
        minCutoffFailures.push(!passedMins);
    }

    // 4. Agregação Estatística
    // Note: We need to count successes before sorting results!
    let successes = 0;
    for (let i = 0; i < safeSimulations; i++) {
        if (results[i] >= targetScore && !minCutoffFailures[i]) {
            successes++;
        }
    }

    results.sort((a, b) => a - b);
    const meanResult = kahanMean(results);

    // BUG-3 FIX: Calcular a probabilidade analítica real usando a Normal Truncada
    // em vez de copiar a empírica como fallback.
    const finalSD = calculateVolatility(results.map(r => ({ score: r })), maxScore, minScore);
    const empiricalProb = (successes / safeSimulations) * 100;

    // FIX BUG 4: Simulações O-U com choques difusos e Clamping diário não formam 
    // uma Distribuição Normal Truncada perfeita no limite estacionário.
    // Usar a CDF analítica aqui causa divergência drástica e invalida as previsões.
    // Para modelos difusos complexos, a probabilidade empírica convergida é a única fonte da verdade.
    let analyticalProb = empiricalProb;

    // NEW: Conformal intervals for more robust, distribution-free CIs
    const mcResiduals = results.map(r => r - meanResult);
    const conformal = conformalPredictionInterval(mcResiduals, 0.05, meanResult); // 95% coverage
    const rawCiLow = conformal.lower ?? getPercentile(results, 0.025, true);
    const rawCiHigh = conformal.upper ?? getPercentile(results, 0.975, true);
    const safeCiLow = Math.max(minScore, Math.min(maxScore, rawCiLow));
    const safeCiHigh = Math.max(minScore, Math.min(maxScore, rawCiHigh));

    return {
        // FIX #2: Valores brutos com precisão completa. toFixed removido do motor.
        // UI e componentes de display devem formatar quando necessário.
        probability: empiricalProb,
        analyticalProbability: analyticalProb,
        timePenaltyApplied,
        timePenaltyScoreDrop,
        projectedTotalTimeSeconds: options.projectedTotalTimeSeconds || 0,
        examDurationMinutes: options.examDurationMinutes || 0,
        mean: meanResult,
        projectedMean: meanResult, // Standardized for EvolutionChart
        sd: finalSD,
        ci95Low: safeCiLow,
        ci95High: safeCiHigh,
        ciConformalLow: safeCiLow,
        ciConformalHigh: safeCiHigh,
        currentMean: baselineScore,
        drift: (drift * 30),
        volatility,
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high',
        // NEW: non-linear trend availability
        trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
        diagnostics: {
            trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
            effectiveDriftSlope: typeof effectiveDriftSlope !== 'undefined' ? effectiveDriftSlope : 0,
            conformalCoverage: 0.95,
            simulationCount: safeSimulations,
            historicalMean: historicalMean || null,
            effectiveN: Math.max(1, sortedHistory.length)
        }
    };
}

`

## src/engine/stats.js

`javascript
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { normalizeDate, safeDateParse } from '../utils/dateHelper.js';
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { computeAdaptiveLambda } from './diagnostics.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';

export const BAYESIAN_DECAY_FACTOR = 0.985;
export const RETENTION_DECAY_SHORT = 0.94;
export const RETENTION_DECAY_LONG = 0.992;

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

function safeFinite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function safeMaxScoreValue(maxScore, fallback = 100) {
    const n = Number(maxScore);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function computeImprovedRetentionProbability(historyLength, lastGapDays = 7, maxAlpha = 0.9) {
    const shortDecay = Math.pow(RETENTION_DECAY_SHORT, Math.max(0, lastGapDays));
    const longDecay = Math.pow(RETENTION_DECAY_LONG, Math.max(0, lastGapDays * 0.6));
    const blended = 0.6 * shortDecay + 0.4 * longDecay;
    return Math.max(0.15, Math.min(maxAlpha, blended * maxAlpha));
}

export function getSortedHistory(history) {
    const histArray = toHistoryArray(history);
    if (!histArray.length) return [];

    return histArray
        .map((h, index) => {
            if (typeof h === 'number') {
                return { original: h, time: index };
            }

            const dateValue = h?.date ?? h?.createdAt;
            const parsed = safeDateParse(dateValue);
            const t = parsed ? parsed.getTime() : 0;

            return { original: h, time: t };
        })
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return String(a.original?.id || '').localeCompare(String(b.original?.id || ''));
        })
        .map(item => item.original);
}

export function pruneHistoryForMemory(history = [], maxPoints = 1500, maxAgeDays = 365 * 5) {
    const sorted = getSortedHistory(history);
    if (!sorted.length) return sorted;

    const now = Date.now();
    const cutoff = now - maxAgeDays * 86400000;

    let filtered = sorted.filter(h => {
        const t = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        return Number.isFinite(t) && t >= cutoff;
    });

    if (filtered.length <= maxPoints) return filtered;

    const recentCount = Math.max(10, Math.floor(maxPoints * 0.2));
    const older = filtered.slice(0, -recentCount);
    const recent = filtered.slice(-recentCount);

    if (older.length <= maxPoints - recentCount) return filtered;

    const targetCount = maxPoints - recentCount;
    const factor = older.length / targetCount;
    const sampledOlder = [];

    for (let i = 0; i < targetCount; i++) {
        sampledOlder.push(older[Math.floor(i * factor)]);
    }

    return [...sampledOlder, ...recent].slice(0, maxPoints);
}

export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    lambda = Math.max(0, Math.min(1, lambda ?? 0.08));
    maxScore = safeMaxScoreValue(maxScore, 100);

    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);
        const x = (timeMs - t0) / 86400000;

        const yW = w - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWY = w * y;
        const yWY = valWY - cWY; const tWY = sumWY + yWY; cWY = (tWY - sumWY) - yWY; sumWY = tWY;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valWXY = w * x * y;
        const yWXY = valWXY - cWXY; const tWXY = sumWXY + yWXY; cWXY = (tWXY - sumWXY) - yWXY; sumWXY = tWXY;
    }

    const RIDGE_PENALTY = Math.max(1e-8, (sumWXX > 0 ? sumWXX / Math.max(1, sumW) : 1) * 1e-4);
    const safeSumW = Math.max(1e-15, sumW);
    const varianceX = Math.max(0, sumWXX - (sumWX * sumWX) / safeSumW);
    const covXY = sumWXY - (sumWX * sumWY) / safeSumW;
    const regularizedDenominator = varianceX + RIDGE_PENALTY;

    if (safeSumW < 1e-15 || regularizedDenominator < 1e-15) {
        const fallbackScore = getSafeScore(sorted[sorted.length - 1], maxScore);
        return { slope: 0, intercept: Number.isFinite(fallbackScore) ? fallbackScore : 0, slopeStdError: 1.5 };
    }

    let slope = covXY / regularizedDenominator;
    const maxSlopeLimit = maxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

export function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    maxScore = safeMaxScoreValue(maxScore, 100);

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumW2 = 0, cW2 = 0;
    let sumWX = 0, cWX = 0;
    let sumWXX = 0, cWXX = 0;
    let rss = 0, cRSS = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const x = (timeMs - t0) / 86400000;
        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const w = Math.max(EPSILON_WEIGHT, Math.exp(-lambda * t));
        const pred = intercept + slope * x;
        const residualSq = Math.pow(y - pred, 2);

        const valW = w;
        const yW = valW - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valW2 = w * w;
        const yW2 = valW2 - cW2; const tW2 = sumW2 + yW2; cW2 = (tW2 - sumW2) - yW2; sumW2 = tW2;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valRSS = w * residualSq;
        const yRSS = valRSS - cRSS; const tRSS = rss + yRSS; cRSS = (tRSS - rss) - yRSS; rss = tRSS;
    }

    if (sumW2 <= 1e-15) return 1.5 * (maxScore / 100);

    const effectiveN = (sumW * sumW) / sumW2;
    const scaleFactorFallback = maxScore / 100;

    if (effectiveN <= 2.1) return 1.5 * scaleFactorFallback;

    const variance = (rss / sumW) * (effectiveN / (effectiveN - 2));
    const varX = (sumWXX - (sumWX * sumWX) / sumW) / sumW;

    if (varX <= 1e-8) {
        return Math.sqrt(Math.max(0, rss / sumW)) / Math.sqrt(effectiveN);
    }

    const det = sumW * sumWXX - sumWX * sumWX;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

function getHistoryDateValue(entry) {
    return entry?.date ?? entry?.createdAt ?? null;
}

function getHistoryTime(entry) {
    const parsed = normalizeDate(getHistoryDateValue(entry));
    return parsed ? parsed.getTime() : NaN;
}

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeCurrent = safeFinite(currentScore, 0);
    const currentPct = safeCurrent / safeMaxScore;

    if (!Number.isFinite(currentPct)) return 0.002 * safeMaxScore;

    const damping = Math.max(0, 1 - currentPct);
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;

    return dynamicPct * safeMaxScore;
}

// ✅ FIX: getDynamicPriorSD trata array de números nus
function getDynamicPriorSD(history, maxScore) {
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  const safeHistory = toHistoryArray(history);
  
  if (safeHistory.length < 5) return safeMaxScore * 0.15;
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const scores = safeHistory.map(h => {
    if (typeof h === 'number') return h;
    return getSafeScore(h, safeMaxScore);
  }).filter(Number.isFinite);
  
  if (scores.length < 5) return safeMaxScore * 0.15;
  
  const globalMean = mean(scores);
  const globalVar = scores.length > 1
    ? kahanSum(scores.map(s => Math.pow(s - globalMean, 2))) / (scores.length - 1)
    : 0;
  
  const empiricalSD = Math.sqrt(Math.max(0, globalVar));
  return Math.max(safeMaxScore * 0.05, Math.min(safeMaxScore * 0.20, empiricalSD));
}

export function mean(arr) {
    return kahanMean(arr);
}

export const calcularMedia = mean;

// ✅ FIX: standardDeviation aceita array de números nus
export function standardDeviation(arr, maxScore = 100, customMean = null) {
  if (!arr || arr.length < 1) return 0;
  
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const clean = arr
    .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMaxScore))
    .filter(Number.isFinite);
  
  if (clean.length < 1) return 0;
  
  const n = clean.length;
  const m = customMean !== null && Number.isFinite(Number(customMean)) ? Number(customMean) : mean(clean);
  
  const sampleVar = n > 1
    ? kahanSum(clean.map(val => Math.pow(val - m, 2))) / (n - 1)
    : 0;
  
  const sorted = [...clean].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = absDev.length % 2 === 0
    ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
    : absDev[Math.floor(absDev.length / 2)];
  
  const robustSigma = 1.4826 * mad;
  const robustVar = robustSigma * robustSigma;
  
  const blendedSampleVar = (0.8 * sampleVar) + (0.2 * robustVar);
  
  const POPULATION_SD = getDynamicPriorSD(arr, safeMaxScore);
  const KAPPA = 1;
  
  const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);
  
  const finalSdFloor = MIN_SD_FLOOR * safeMaxScore;
  return Math.max(finalSdFloor, Math.sqrt(Math.max(0, adjustedVar)));
}

export const calcularDesvioPadrao = (arr) => {
    if (!arr || arr.length <= 1) return 0;

    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length <= 1) return 0;

    const m = kahanMean(clean);
    const sumSq = clean.map(x => Math.pow(x - m, 2));
    const v = clean.length > 0 ? kahanSum(sumSq) / clean.length : 0;

    return Math.sqrt(Math.max(0, v));
};

export function calcularAssimetria(arr) {
    if (!arr || arr.length < 3) return 0;

    const clean = toHistoryArray(arr)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    const n = clean.length;
    if (n < 3) return 0;

    const m = mean(clean);
    const sumSq = kahanSum(clean.map(val => Math.pow(val - m, 2)));
    const sampleVar = sumSq / (n - 1);
    const s = Math.sqrt(Math.max(0, sampleVar));

    if (s < 1e-5) return 0;

    const cubeDiffs = clean.map(val => Math.pow(val - m, 3));
    const sumCube = kahanSum(cubeDiffs);
    const safeS = Math.max(1e-5, s);
    const skewness = (n * sumCube) / ((n - 1) * (n - 2) * Math.pow(safeS, 3));

    if (!Number.isFinite(skewness)) return 0;

    return Math.max(-5, Math.min(5, skewness));
}

export function computeBayesianLevel(
    historyOrScore,
    arg1 = 1,
    arg2 = 1,
    arg3 = 100,
    arg4 = {}
) {
    let history, alpha, beta, safeMaxScore, options;
    let singleScore = null;
    let singleNEff = 1;
    if (Array.isArray(historyOrScore)) {
        history = toHistoryArray(historyOrScore);
        const safeAlphaArg = Number(arg1);
        const safeBetaArg = Number(arg2);
        alpha = Number.isFinite(safeAlphaArg) && safeAlphaArg >= 0 ? safeAlphaArg : 1;
        beta = Number.isFinite(safeBetaArg) && safeBetaArg >= 0 ? safeBetaArg : 1;
        safeMaxScore = safeMaxScoreValue(arg3, 100);
        options = arg4 || {};
    } else {
        history = [];
        singleScore = Math.max(0, Number(historyOrScore) || 0);
        const nEffArg = Number(arg1);
        singleNEff = Number.isFinite(nEffArg) && nEffArg >= 0 ? nEffArg : 1;
        safeMaxScore = safeMaxScoreValue(arg2, 100);
        options = arg3 || {};
    }
    // ✅ LOTE-01 FIX (C3): normalização no INTERVALO ÚTIL [minScore, maxScore].
    // Antes a proporção era score/maxScore — errado em escalas com piso != 0
    // (ex.: 200–1000: nota 600 virava 60% quando deveria ser 50%).
    const safeMinScore = Math.min(
        Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 0,
        safeMaxScore
    );
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    if (singleScore !== null) {
        const pct = Math.max(0, Math.min(1, (singleScore - safeMinScore) / safeRange));
        alpha = pct * singleNEff;
        beta = (1 - pct) * singleNEff;
    }

    const alpha0 = alpha;
    const beta0 = beta;

    let maxNEver = alpha + beta;

    const syntheticTotalValue = getSyntheticTotal(safeMaxScore);
    const safeSyntheticTotal = Number.isFinite(syntheticTotalValue) ? syntheticTotalValue : 20;

    const safeTotalEntry = (h) => {
        const n = Number(h?.total);
        return Number.isFinite(n) && n > 0 ? n : safeSyntheticTotal;
    };

    const gaps = [];

    const historySortedForGaps = history
        .map(h => ({ original: h, time: getHistoryTime(h) }))
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => a.time - b.time)
        .map(item => item.original);

    if (historySortedForGaps.length > 1) {
        for (let i = 1; i < historySortedForGaps.length; i++) {
            const time1 = getHistoryTime(historySortedForGaps[i]);
            const time0 = getHistoryTime(historySortedForGaps[i - 1]);
            const gap = (time1 - time0) / 86400000;
            if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
        }
    }

    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? kahanSum(gaps) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;
    const totalQuestionsHist = history.length ? kahanSum(history.map(safeTotalEntry)) : 0;

    const historyDays = historySortedForGaps.length > 1
        ? Math.max(1, (getHistoryTime(historySortedForGaps[historySortedForGaps.length - 1]) - getHistoryTime(historySortedForGaps[0])) / 86400000)
        : 1;

    const questionsPerDay = totalQuestionsHist / historyDays;
    const volumeCapacity = questionsPerDay * 30;
    const rawCap = Math.min(baseCapacity, volumeCapacity);
    const dynamicAlphaCap = Math.max(250, Math.floor(Number.isFinite(rawCap) ? rawCap : 250));
    const dynamicEffectiveN = dynamicAlphaCap;

    const refDateObj = options.referenceDate ? normalizeDate(options.referenceDate) : null;
    const now = refDateObj && Number.isFinite(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();

    // ✅ LOTE-01 FIX: priors calculados SOBRE O MESMO ARRAY iterado abaixo.
    // Antes o slice(-2000) acontecia depois, desalinhando runningPriors[i].
    const MAX_ITERATIONS = 2000;
    const historyToProcess = historySortedForGaps.length > MAX_ITERATIONS
        ? historySortedForGaps.slice(-MAX_ITERATIONS)
        : historySortedForGaps;

    const runningPriors = new Float64Array(historyToProcess.length);
    if (historyToProcess.length > 0) {
        let priorSum = 0, priorC = 0, priorCount = 0;
        for (let j = 0; j < historyToProcess.length; j++) {
            const sScore = getSafeScore(historyToProcess[j], safeMaxScore, safeMinScore);
            if (Number.isFinite(sScore)) {
                let rawPct = (sScore - safeMinScore) / safeRange;
                rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
                const validPct = Math.min(1, rawPct);
                const y = validPct - priorC;
                const t = priorSum + y;
                priorC = (t - priorSum) - y;
                priorSum = t;
                priorCount++;
            }
            runningPriors[j] = priorCount > 0 ? priorSum / priorCount : 0.5;
        }
    }

    const avgTotalRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : safeSyntheticTotal;

    const avgTotal = Number.isFinite(avgTotalRaw) && avgTotalRaw > 0 ? avgTotalRaw : safeSyntheticTotal;

    const rawBaseLambda = history.length > 0 ? computeAdaptiveLambda(historySortedForGaps) : 0.08;
    const baseAdaptiveLambda = Number.isFinite(rawBaseLambda)
        ? Math.max(0.005, Math.min(1, rawBaseLambda))
        : 0.08;

    if (history.length > 0) {

        for (let i = 0; i < historyToProcess.length; i++) {
            const h = historyToProcess[i];

            const totalRaw = Number(h?.total);
            const hasTotal = Number.isFinite(totalRaw) && totalRaw > 0;
            const total = hasTotal ? totalRaw : 0;

            const normalizedScore = getSafeScore(h, safeMaxScore, safeMinScore);
            if (!Number.isFinite(normalizedScore)) continue;

            const isPurePercentage = !hasTotal;

            let rawPct = (normalizedScore - safeMinScore) / safeRange;
            rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
            const pct = Math.min(1, rawPct);

            const entryDate = normalizeDate(getHistoryDateValue(h));
            const prevDate = i > 0 ? normalizeDate(getHistoryDateValue(historyToProcess[i - 1])) : entryDate;

            const timeEntry = entryDate?.getTime();
            const timePrev = prevDate?.getTime();

            const gapDays = Number.isFinite(timeEntry) && Number.isFinite(timePrev)
                ? Math.max(0, Math.floor((timeEntry - timePrev) / 86400000))
                : 0;

            const rawLambda = baseAdaptiveLambda * Math.exp(-0.15 * i);
            const lambda = Math.max(0.005, Number.isFinite(rawLambda) ? rawLambda : baseAdaptiveLambda);

            const entryDecayRaw = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;
            const entryDecay = Number.isFinite(entryDecayRaw) ? Math.max(0, Math.min(1, entryDecayRaw)) : 1.0;

            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapDays || 0)));

            // ✅ FIX: Piso de retenção proporcional ao decaimento, NÃO ao histórico máximo.
            // Usa um piso fixo pequeno (3-10) que decai com o tempo, permitindo
            // que o aluno realmente "esqueça" após longos períodos sem estudo.
            const retentionFloor = Math.max(3.0, Math.min(10.0, cappedMaxN * 0.05)) * macroDecay;

            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;

                if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                    const currentP = alpha / nBeforeDecay;
                    const minN = retentionFloor;
                    const HARD_FLOOR = 3.0;
                    const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);

                    const nAfterDecayRaw = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * entryDecay)));
                    const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : safeFloor;

                    const priorP = i > 0 ? runningPriors[i - 1] : runningPriors[0] || 0.5;
                    const safePriorP = Number.isFinite(priorP) ? priorP : 0.5;

                    const regressedPRaw = (currentP * entryDecay) + (safePriorP * (1 - entryDecay));
                    const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                    alpha = nAfterDecay * regressedP;
                    beta = nAfterDecay * (1 - regressedP);
                }
            }

            const rawItemWeight = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const itemWeight = Math.max(0.001, Number.isFinite(rawItemWeight) ? rawItemWeight : 1.0);

            const stepCap = dynamicAlphaCap;

            if (isPurePercentage) {
                const syntheticNRaw = avgTotal * itemWeight;
                const syntheticN = Number.isFinite(syntheticNRaw) && syntheticNRaw > 0 ? syntheticNRaw : 0;

                let alphaHoje = pct * syntheticN;
                let betaHoje = (1 - pct) * syntheticN;

                const sumHoje = alphaHoje + betaHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    alphaHoje *= clampDiario;
                    betaHoje *= clampDiario;
                }

                alpha += Number.isFinite(alphaHoje) ? alphaHoje : 0;
                beta += Number.isFinite(betaHoje) ? betaHoje : 0;
            } else if (total >= 1) {
                let correct = Math.max(0, Math.round(pct * total));
                const safeCorrect = Math.max(0, Math.min(total, correct));

                let acertosHoje = Math.max(0, safeCorrect * itemWeight);
                let errosHoje = Math.max(0, (total - safeCorrect) * itemWeight);

                const sumHoje = acertosHoje + errosHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    acertosHoje *= clampDiario;
                    errosHoje *= clampDiario;
                }

                alpha += Number.isFinite(acertosHoje) ? acertosHoje : 0;
                beta += Number.isFinite(errosHoje) ? errosHoje : 0;
            }

            // ✅ Renormalização incremental a cada 50 iterações
            if (i % 50 === 0 && (alpha + beta) > dynamicAlphaCap * 2) {
              const factor = dynamicAlphaCap / (alpha + beta);
              alpha *= factor;
              beta *= factor;
            }

            // ✅ Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar
            if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
              alpha = alpha0;
              beta = beta0;
            }

            const currentN = alpha + beta;
            if (!Number.isFinite(currentN)) {
                alpha = alpha0;
                beta = beta0;
                break;
            }

            if (currentN > maxNEver) {
                maxNEver = Math.min(currentN, dynamicAlphaCap);
            }
        }
    }

    const nAfterLoop = alpha + beta;
    if (Number.isFinite(nAfterLoop) && nAfterLoop > dynamicAlphaCap && nAfterLoop > 0) {
        const globalClamp = dynamicAlphaCap / nAfterLoop;
        alpha *= globalClamp;
        beta *= globalClamp;
    }

    const lastEntry = historySortedForGaps.length > 0 ? historySortedForGaps[historySortedForGaps.length - 1] : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastDate = normalizeDate(lastDateStr);
        const gapToToday = Math.max(0, Math.floor((now - (lastDate ? lastDate.getTime() : now)) / 86400000));

        if (gapToToday > 0) {
            const rawFinalLambda = baseAdaptiveLambda * Math.exp(-0.15 * (historySortedForGaps.length || 1));
            const finalLambda = Math.max(0.005, Number.isFinite(rawFinalLambda) ? rawFinalLambda : baseAdaptiveLambda);

            const finalDecayRaw = Math.exp(-finalLambda * gapToToday);
            const finalDecay = Number.isFinite(finalDecayRaw) ? Math.max(0, Math.min(1, finalDecayRaw)) : 1;

            const nBeforeDecay = alpha + beta;

            if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                const currentP = alpha / nBeforeDecay;

                const epistemicDecayRaw = Math.pow(finalDecay, 0.35);
                const epistemicDecay = Number.isFinite(epistemicDecayRaw) ? Math.max(0, Math.min(1, epistemicDecayRaw)) : 1;

                const safeMaxNEver = Number.isFinite(maxNEver) ? maxNEver : 0;
                const epistemicFloor = Math.max(3.0, Math.min(10.0, safeMaxNEver * 0.05));

                const nAfterDecayRaw = Math.max(epistemicFloor, Math.min(nBeforeDecay, nBeforeDecay * epistemicDecay));
                const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : Math.max(epistemicFloor, Math.min(nBeforeDecay, epistemicFloor));

                const empiricalPriorFinal = runningPriors.length > 0 ? runningPriors[runningPriors.length - 1] : 0.5;
                const safeEmpiricalPriorFinal = Number.isFinite(empiricalPriorFinal) ? empiricalPriorFinal : 0.5;

                const regressedPRaw = (currentP * finalDecay) + (safeEmpiricalPriorFinal * (1 - finalDecay));
                const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                alpha = nAfterDecay * regressedP;
                beta = nAfterDecay * (1 - regressedP);
            }
        }
    }

    // FIX: Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar para prior
    if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
      alpha = alpha0;
      beta = beta0;
    }

    const n = alpha + beta;

    if (!Number.isFinite(n) || n <= 0) {
        return { mean: 0, sd: 0, ciLow: 0, ciHigh: 0, alpha: alpha0, beta: beta0, n: 0 };
    }

    const effectiveN = Math.min(n, dynamicEffectiveN);
    const p = alpha / n;
    const effectiveAlpha = p * effectiveN;

    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    const mediaDeQuestoesDoAlunoRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : 100;

    const mediaDeQuestoesDoAluno = Number.isFinite(mediaDeQuestoesDoAlunoRaw) && mediaDeQuestoesDoAlunoRaw > 0
        ? mediaDeQuestoesDoAlunoRaw
        : 100;

    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(mediaDeQuestoesDoAluno));

    const rawEpistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const epistemicVar = Number.isFinite(rawEpistemicVar) ? Math.max(1e-6, rawEpistemicVar) : 1e-6;

    const rawAleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;
    const aleatoricVar = Number.isFinite(rawAleatoricVar) ? Math.max(1e-6, rawAleatoricVar) : 1e-6;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });
    // ✅ LOTE-01 FIX (C3): margem/centro escalam pelo RANGE, não pelo teto
    const marginOfError = tMultiplier * effectiveSd * safeRange;
    const adjustedMarginOfError = Number.isFinite(marginOfError) ? marginOfError : 0;

    const centerForCI = safeMinScore + p_tilde * safeRange;
    const trueMean = safeMinScore + p * safeRange;

    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

    if (!Number.isFinite(ciLow)) ciLow = Math.max(safeMinScore, trueMean);
    if (!Number.isFinite(ciHigh)) ciHigh = Math.min(safeMaxScore, trueMean);

    if (trueMean < ciLow) ciLow = trueMean;
    if (trueMean > ciHigh) ciHigh = trueMean;

    const strictLow = Number.isFinite(ciLow) ? Math.max(safeMinScore, ciLow) : safeMinScore;
    const strictHigh = Number.isFinite(ciHigh) ? Math.min(safeMaxScore, ciHigh) : safeMaxScore;

    let alphaOut = alpha;
    let betaOut = beta;

    if (n > dynamicEffectiveN && n > 0) {
        const factor = dynamicEffectiveN / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean: trueMean,
        sd: effectiveSd * safeRange, // ✅ LOTE-01 FIX (C3)
        ciLow: strictLow,
        ciHigh: strictHigh,
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > dynamicEffectiveN ? dynamicEffectiveN : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return null;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    const rawSynthetic = getSyntheticTotal(safeMaxScore);
    const syntheticTotal = Number.isFinite(rawSynthetic) ? rawSynthetic : 20;

    const historyWithSynthetics = safeHistory
        .map(h => {
            const score = getSafeScore(h, safeMaxScore);
            const total = Number(h?.total);

            if ((!Number.isFinite(total) || total <= 0) && Number.isFinite(score)) {
                if (typeof h === 'number') {
                    return { score: h, total: syntheticTotal };
                }

                return {
                    ...(h && typeof h === 'object' ? h : { original: h }),
                    total: syntheticTotal
                };
            }

            return h;
        })
        .filter(Boolean);

    const validHistory = historyWithSynthetics.filter(h => {
        const total = Number(h?.total);
        return Number.isFinite(total) && total > 0;
    });

    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    const scores = historyToUse
        .map(h => getSafeScore(h, safeMaxScore))
        .filter(Number.isFinite);

    const validHistoryForMean = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    let sumWeightMean = 0;
    let sumScoreMean = 0;

    validHistoryForMean.forEach(h => {
        const totalWeight = Number(h?.total);
        if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

        const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
        const diffWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
        const effW = totalWeight * diffWeight;

        sumWeightMean += effW;
        sumScoreMean += getSafeScore(h, safeMaxScore) * effW;
    });

    const mRaw = sumWeightMean > 0 ? sumScoreMean / sumWeightMean : mean(scores);
    const m = Number.isFinite(mRaw) ? mRaw : 0;

    let variance = 0;

    if (historyToUse.length > 1) {
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0;

        const sortedScores = [...scores].sort((a, b) => a - b);

        const median = sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)];

        const absoluteDeviations = scores
            .map(s => Math.abs(s - median))
            .sort((a, b) => a - b);

        const rawMad = absoluteDeviations.length % 2 === 0
            ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
            : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];

        const mad = Number.isFinite(rawMad) && rawMad > 0 ? rawMad * 1.4826 : 0.001 * safeMaxScore;
        const clampLimit = 3.5 * mad;

        validHistoryForMean.forEach(h => {
            const totalWeight = Number(h?.total);
            if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

            const safeScore = getSafeScore(h, safeMaxScore);
            if (!Number.isFinite(safeScore)) return;

            const robustScore = Number.isFinite(median) && Number.isFinite(clampLimit)
                ? Math.max(median - clampLimit, Math.min(median + clampLimit, safeScore))
                : safeScore;

            const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const difficultyWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
            const effectiveWeight = totalWeight * difficultyWeight;

            wVarSum += effectiveWeight * Math.pow(robustScore - m, 2);
            sumW += effectiveWeight;
            sumW2 += Math.pow(effectiveWeight, 2);
        });

        const kishDifference = sumW - (sumW > 0 ? (sumW2 / sumW) : 0);
        const kishDenom = kishDifference > 1e-4 ? kishDifference : Math.max(1e-4, sumW);

        const rawSampleVar = sumW > 0 ? wVarSum / kishDenom : 0;
        const sampleVar = Number.isFinite(rawSampleVar) ? Math.max(0, rawSampleVar) : 0;

        const POPULATION_SD = getDynamicPriorSD(historyToUse, safeMaxScore);
        const safePopulationSD = Number.isFinite(POPULATION_SD) ? POPULATION_SD : 0;
        const popVar = Math.pow(safePopulationSD, 2);

        const safeStudentVar = Math.max(popVar * 0.05, sampleVar);
        const ratio = safeStudentVar > 0 ? popVar / safeStudentVar : 3.0;

        let KAPPA = Math.max(0.1, Math.min(3.0, Number.isFinite(ratio) ? ratio : 3.0));

        const sortedForDates = getSortedHistory(historyToUse);
        const firstDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[0]));
        const lastDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[sortedForDates.length - 1]));

        const firstDateMs = firstDateParsed && Number.isFinite(firstDateParsed.getTime())
            ? firstDateParsed.getTime()
            : Date.now();

        const lastDateMs = lastDateParsed && Number.isFinite(lastDateParsed.getTime())
            ? lastDateParsed.getTime()
            : Date.now();

        const timeSpreadDays = Math.max(0, (lastDateMs - firstDateMs) / 86400000);

        if (
            historyToUse.length >= 2 &&
            sampleVar < (0.0004 * safeMaxScore * safeMaxScore) &&
            timeSpreadDays > 7
        ) {
            KAPPA = KAPPA * Math.exp(-timeSpreadDays / 14);
        }

        const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : historyToUse.length;
        const n_eff = Number.isFinite(effectiveN) ? Math.max(1, effectiveN) : 1;
        const kishDenomTerm = n_eff > 1.5 ? (n_eff - 1) : 1;

        const rawVariance = (kishDenomTerm * sampleVar + KAPPA * popVar) / (kishDenomTerm + KAPPA);
        variance = Number.isFinite(rawVariance) ? Math.max(0, rawVariance) : popVar;
    } else {
        const priorSD = getDynamicPriorSD(historyToUse, safeMaxScore);
        variance = Math.pow(Number.isFinite(priorSD) ? priorSD : 0, 2);
    }

    const sd = Math.max(Math.sqrt(Math.max(0, variance)), 0.001 * safeMaxScore);
    const safeSD = Number.isFinite(sd) ? sd : 0.001 * safeMaxScore;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore);
    const safeSlope = Number.isFinite(slopePerDay) ? slopePerDay : 0;

    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore);

    const validHistoryForTrend = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    const sortedForTrendCap = getSortedHistory(validHistoryForTrend);

    const lastScoreRaw = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore)
        : m;

    const safeLastScore = Number.isFinite(lastScoreRaw) ? lastScoreRaw : m;

    const limiteSuperior = safeMaxScore - safeLastScore;
    const limiteInferior = -safeLastScore;

    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, safeSlope * 30));
    const safeRawTrend = Number.isFinite(rawTrend) ? rawTrend : 0;

    let trendLabel = 'stable';
    if (safeRawTrend > trendThreshold) trendLabel = 'up';
    else if (safeRawTrend < -trendThreshold) trendLabel = 'down';

    const level = m > 0.7 * safeMaxScore ? 'ALTO' : m > 0.4 * safeMaxScore ? 'MÉDIO' : 'BAIXO';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight,
        history: safeHistory,
        trend: trendLabel,
        trendValue: safeRawTrend,
        level
    };
}

export const calculateEMA = (scores, alpha = 0.25) => {
    const clean = toHistoryArray(scores)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    if (!clean.length) return 0;

    let ema = clean[0];
    const maxObserved = clean.reduce((a, b) => Math.max(a, b), 1);

    for (let i = 1; i < clean.length; i++) {
        const delta = clean[i] - ema;
        const range = maxObserved;
        const absDelta = Math.abs(delta);

        const upBonus = Math.min(0.10, 0.05 * (absDelta / range));
        const downBonus = Math.min(0.03, 0.015 * (absDelta / range));
        const trendBonus = delta >= 0 ? upBonus : downBonus;
        const currentAlpha = Math.min(1, alpha + trendBonus);

        ema = (clean[i] * currentAlpha) + (ema * (1 - currentAlpha));
    }

    return Number.isFinite(ema) ? ema : 0;
};

export const calculateTimeWeightedEMA = (historicData, lambda = 0.05) => {
    const safeHistory = toHistoryArray(historicData);
    if (!safeHistory.length) return null;

    const validData = safeHistory.filter(d =>
        Number.isFinite(d?.score) && (d?.timestamp != null || d?.date != null)
    );

    if (!validData.length) return null;

    const getTime = (d) => {
        if (d?.timestamp != null && Number.isFinite(d.timestamp)) return d.timestamp;

        if (d?.date != null) {
            const ms = new Date(d.date).getTime();
            return Number.isFinite(ms) ? ms : NaN;
        }

        return NaN;
    };

    validData.sort((a, b) => getTime(a) - getTime(b));

    let ema = validData[0].score;
    let lastTime = getTime(validData[0]);

    for (let i = 1; i < validData.length; i++) {
        const currentItem = validData[i];
        const currentTime = getTime(currentItem);

        if (!Number.isFinite(currentTime) || !Number.isFinite(lastTime)) continue;

        const deltaDays = Math.max(0, (currentTime - lastTime) / 86400000);
        const dynamicAlpha = 1 - Math.exp(-lambda * deltaDays);
        const safeAlpha = Math.max(0.1, Math.min(1.0, dynamicAlpha));

        ema = safeAlpha * currentItem.score + (1 - safeAlpha) * ema;
        lastTime = currentTime;
    }

    return Number.isFinite(ema) ? ema : null;
};

export {
    computeBrierScore,
    computeLogLoss,
    summarizeCalibration,
    computeCalibrationDiagnostics,
    shrinkProbabilityToNeutral
} from '../utils/calibration.js';

export function computeHierarchicalAdjustment(categories, pooledSD) {
    const safeCategories = toHistoryArray(categories);
    if (!safeCategories.length) return safeCategories;

    const validCategories = safeCategories.filter(c =>
        Number.isFinite(c.mean) && Number.isFinite(c.n) && c.n > 0
    );

    if (!validCategories.length) return safeCategories;

    const globalMean = kahanSum(validCategories.map(c => c.mean || 0)) / Math.max(1, validCategories.length);

    const tau2 = kahanSum(validCategories.map(c => Math.pow((c.mean || 0) - globalMean, 2))) /
        Math.max(1, validCategories.length - 1);

    return safeCategories.map(cat => {
        if (!Number.isFinite(cat.mean) || !cat.n) {
            return { ...cat, bayesianMean: cat.mean, bayesianSd: cat.sd };
        }

        const localSD = Number.isFinite(cat.sd) ? cat.sd : (pooledSD || 15);
        const localVar = Math.pow(localSD, 2) / Math.max(1, cat.n);
        const denom = localVar + tau2;
        const B = denom > 1e-15 ? localVar / denom : 0;

        const bayesianMean = B * globalMean + (1 - B) * cat.mean;
        const popVar = Math.pow(pooledSD || 15, 2);
        const bayesianSd = Math.sqrt(Math.max(0, B * popVar + (1 - B) * Math.pow(localSD, 2)));

        return {
            ...cat,
            bayesianMean,
            bayesianSd,
            shrinkage: B
        };
    });
}

export function computeAgilityMetrics(history, targetSeconds = 120) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return { avgSeconds: 0, agilityPenalty: 0 };

    let totalTimeSpent = 0;
    let totalTimedQuestions = 0;

    for (const h of safeHistory) {
        if (h.timeSpent != null && h.timedQuestoes != null) {
            const ts = Number(h.timeSpent);
            const tq = Number(h.timedQuestoes);

            if (Number.isFinite(ts) && Number.isFinite(tq) && ts > 0 && tq > 0) {
                totalTimeSpent += ts;
                totalTimedQuestions += tq;
            }
        }
    }

    const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;
    const safeTarget = Math.max(30, Number(targetSeconds) || 120);

    const agilityPenalty = avgSeconds > safeTarget
        ? Math.min(0.4, (avgSeconds - safeTarget) / (safeTarget * 1.25))
        : 0;

    return {
        avgSeconds: Math.round(avgSeconds),
        agilityPenalty: Number(agilityPenalty.toFixed(4))
    };
}

export function calculateSlopePerDay(history, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return 0;

    const sorted = getSortedHistory(safeHistory);
    if (sorted.length < 2) return 0;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    // ✅ FIX: Filtrar entradas com datas válidas ANTES de calcular.
    // Isso garante que firstDate sempre seja um timestamp válido.
    const validEntries = [];
    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const dateParsed = safeDateParse(h?.date ?? h?.createdAt);
        const time = dateParsed?.getTime();
        const y = getSafeScore(h, safeMaxScore);
        if (Number.isFinite(time) && Number.isFinite(y)) {
            validEntries.push({ time, y });
        }
    }

    if (validEntries.length < 2) return 0;

    // ✅ FIX: firstDate agora é garantidamente válido
    const firstDate = validEntries[0].time;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const validN = validEntries.length;

    for (let i = 0; i < validN; i++) {
        const x = (validEntries[i].time - firstDate) / 86400000;
        const y = validEntries[i].y;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    const denominator = (validN * sumX2) - (sumX * sumX);
    if (Math.abs(denominator) < 1e-12) return 0;

    const slopePerDay = ((validN * sumXY) - (sumX * sumY)) / denominator;
    // ✅ LOTE-01 FIX: slope POR DIA. O "* 10" anterior inflava trendValue em 10×
    // e fazia o clamp do calculateSlope saturar uma ordem de grandeza antes.
    return Number.isFinite(slopePerDay) ? slopePerDay : 0;
}

/**
 * @deprecated Use calculateSlopePerDay instead. Renomeado no Lote 05 para indicar a unidade explícita [pts/dia].
 */
export const calculateTrend = calculateSlopePerDay;



`

## src/engine/diagnostics.js

`javascript
/**
 * DIAGNOSTICS ENGINE v1.0 — Motor de Diagnóstico Avançado
 * Análises estatísticas avançadas para diagnóstico de performance.
 */

import { getSafeScore } from '../utils/scoreHelper.js';
import { kahanMean, kahanSum } from './math/kahan.js';
import { pruneHistoryForMemory, getSortedHistory } from './stats.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
// ✅ LOTE-03: importar do módulo probabilístico unificado
import { fsrsRetrievability } from './probabilistic/fsrs.js';
// ✅ LOTE-01 FIX (C5): MSSD real para o risco de esquecimento
import { calculateMSSD } from './projection.js';

function _getEntryDate(entry) {
  const raw = entry?.date || entry?.createdAt;
  if (!raw) return null;
  const parsed = safeDateParse(raw);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function _normalizeDiagnosticHistory(historyRaw, maxScore = 100) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const parsedDate = _getEntryDate(entry);
      if (!parsedDate) return null;
      const score = getSafeScore(entry, maxScore);
      if (!Number.isFinite(score)) return null;
      return { ...entry, date: parsedDate.toISOString(), score };
    })
    .filter(Boolean);
}

function _median(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function _mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return kahanMean(arr);
}

function _variance(arr, mu = null) {
  const clean = Array.isArray(arr)
    ? arr.filter(v => Number.isFinite(v))
    : [];

  if (clean.length < 2) return 0;

  const m = Number.isFinite(mu) ? mu : _mean(clean);
  if (!Number.isFinite(m)) return 0;

  const devs = clean.map(v => (v - m) ** 2);
  const sum = kahanSum(devs);
  const variance = sum / (clean.length - 1);

  return Number.isFinite(variance) ? variance : 0;
}

function _std(arr, mu = null) {
  const variance = _variance(arr, mu);
  if (!Number.isFinite(variance)) return 0;
  return Math.sqrt(Math.max(0, variance));
}

export function detectDataAnomalies(historyRaw = [], maxScore = 100) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  const issues = [];
  if (!Array.isArray(history) || history.length === 0) {
    issues.push({ type: 'data', severity: 'info', msg: 'Sem histórico para análise.' });
    return issues;
  }

  const parsed = history.map((h, idx) => {
    const score = getSafeScore(h, maxScore);
    const dateRaw = h?.date || h?.createdAt;
    const d = dateRaw ? new Date(dateRaw) : null;
    const t = d && !isNaN(d.getTime()) ? d.getTime() : null;
    return { ...h, idx, score, date: dateRaw, t, finite: Number.isFinite(score) };
  });

  const finites = parsed.filter(p => p.finite);
  const nFinite = finites.length;

  const invalidRate = history.length > 0 ? (history.length - nFinite) / history.length : 0;
  if (invalidRate > 0.2) {
    issues.push({ type: 'data', severity: 'warning', msg: `${Math.round(invalidRate * 100)}% dos registros têm score inválido/NaN.`, count: history.length - nFinite });
  }

  const uniqueScores = new Set(finites.map(p => p.score));
  if (nFinite >= 3 && uniqueScores.size === 1) {
    issues.push({ type: 'data', severity: 'warning', msg: 'Todos os scores são idênticos — variância zero. Adicione variedade ou verifique input.', count: nFinite });
  }

  const dateMap = new Map();
  finites.forEach(p => {
    const rawDate = p.date || p.createdAt;
    if (!rawDate) return;
    
    // Simplification for groupKey to avoid importing getDateKey if missing
    const dayKey = typeof rawDate === 'string' ? rawDate.split('T')[0] : String(rawDate);
    if (!dayKey) return;
  
    const groupKey = [
      dayKey,
      p.categoryId || p.subject || 'geral',
      p.id || p.simuladoId || 'sem-id',
    ].join('|');
  
    if (!dateMap.has(groupKey)) dateMap.set(groupKey, []);
    dateMap.get(groupKey).push(p.score);
  });
  
  for (const [key, scores] of dateMap) {
    const uniq = new Set(scores);
  
    if (uniq.size > 1) {
      issues.push({
        type: 'data',
        severity: 'warning',
        msg: `Registro duplicado/conflitante detectado (${key}): ${[...uniq].join(', ')}.`,
      });
    }
  }

  const times = finites.map(p => p.t).filter(t => t != null);
  if (times.length >= 2) {
    let unsortedGaps = 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] < times[i - 1]) unsortedGaps++;
    }
    if (unsortedGaps > 0) {
      issues.push({ type: 'data', severity: 'info', msg: `${unsortedGaps} registros fora de ordem cronológica.`, count: unsortedGaps });
    }
  }

  const future = finites.filter(p => p.t && p.t > Date.now() + 86400000 * 2).length;
  if (future > 0) issues.push({ type: 'data', severity: 'warning', msg: `${future} registros com data futura.`, count: future });

  if (nFinite >= 6) {
    const vals = finites.map(p => p.score);
    const med = _median(vals);
    const devs = vals.map(v => Math.abs(v - med));
    const mad = _median(devs) || 1e-9;
    const threshold = 3.5;
    let outliers = 0;
    for (const v of vals) {
      const mz = 0.6745 * Math.abs(v - med) / mad;
      if (mz > threshold) outliers++;
    }
    if (outliers >= 2) {
      issues.push({ type: 'data', severity: 'info', msg: `${outliers} possíveis outliers detectados.`, count: outliers });
    }
  }

  if (issues.length === 0) issues.push({ type: 'data', severity: 'ok', msg: 'Dados parecem limpos.' });

  return issues;
}

function _interSessionGaps(historyRaw) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  if (!Array.isArray(history) || history.length < 2) return [];
  const times = history
    .map((h) => { const d = _getEntryDate(h); return d ? d.getTime() : null; })
    .filter((t) => t !== null && Number.isFinite(t))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < times.length; i++) {
    const diffDays = (times[i] - times[i - 1]) / 86400000;
    if (diffDays > 0) gaps.push(diffDays);
  }
  return gaps;
}

export function computeHurstExponent(scores) {
  const fallback = { H: 0.5, confidence: 'low', interpretation: 'Dados insuficientes', rSquared: 0 };
  if (!Array.isArray(scores)) return fallback;

  const clean = scores.map(Number).filter(Number.isFinite);
  if (clean.length < 10) return fallback;

  const minLag = 2;
  const maxLag = Math.floor(clean.length / 2);
  if (maxLag < minLag) return fallback;

  const logRS = [];
  const logN = [];

  for (let tau = minLag; tau <= maxLag; tau = Math.ceil(tau * 1.4)) {
    const nBlocks = Math.floor(clean.length / tau);
    if (nBlocks < 2) break;

    let rsSum = 0;
    let validBlocks = 0;

    for (let b = 0; b < nBlocks; b++) {
      const block = clean.slice(b * tau, (b + 1) * tau);
      if (block.length < 2) continue;

      const mu = _mean(block);
      let accum = 0;
      let maxAccum = -Infinity;
      let minAccum = Infinity;
      for (const v of block) {
        accum += v - mu;
        if (accum > maxAccum) maxAccum = accum;
        if (accum < minAccum) minAccum = accum;
      }

      const range = maxAccum - minAccum;
      const sigma = _std(block, mu);

      if (sigma > 1e-9) {
        rsSum += range / sigma;
        validBlocks++;
      }
    }

    if (validBlocks > 0) {
      logRS.push(Math.log(rsSum / validBlocks));
      logN.push(Math.log(tau));
    }
  }

  if (logRS.length < 3) return fallback;

  const cleanPairs = logN.map((x, i) => ({ x, y: logRS[i] }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (cleanPairs.length < 3) return fallback;

  const muX = _mean(cleanPairs.map(p => p.x));
  const muY = _mean(cleanPairs.map(p => p.y));

  const Sxy = kahanSum(cleanPairs.map(p => (p.x - muX) * (p.y - muY)));
  const Sxx = kahanSum(cleanPairs.map(p => (p.x - muX) ** 2));

  const H = Sxx > 1e-10 ? Sxy / Sxx : 0.5;
  const clampedH = Math.max(0.1, Math.min(0.9, H));

  let interpretation = 'Passeio Aleatório (Random Walk)';
  if (clampedH > 0.65) interpretation = 'Série Persistente (Tendência Robusta)';
  else if (clampedH < 0.4) interpretation = 'Reversão à Média (Alta Instabilidade / Efeito Ioiô)';

  const SSR = kahanSum(cleanPairs.map((p) => (p.y - (muY + H * (p.x - muX))) ** 2));
  const SST = kahanSum(cleanPairs.map((p) => (p.y - muY) ** 2));
  const rSquared = SST > 0 ? 1 - (SSR / SST) : 0;

  return {
    H: Number(clampedH.toFixed(3)),
    rSquared: Number(rSquared.toFixed(3)),
    confidence: rSquared > 0.7 && logRS.length >= 5 ? 'high' : rSquared > 0.4 ? 'medium' : 'low',
    interpretation
  };
}

export function generateMathDiagnostic(history, maxScore = 100) {
  const scores = history.map(h => getSafeScore(h, maxScore));
  const hurst = computeHurstExponent(scores);

  const optimalLambda = hurst.H < 0.45 ? 0.12 : hurst.H > 0.65 ? 0.04 : 0.08;

  return {
    profile: hurst.interpretation,
    momentumHurst: hurst.H,
    recommendedLambda: optimalLambda,
    isDataNoisy: hurst.H < 0.5 && hurst.confidence !== 'low',
    hurstData: hurst
  };
}

export function computeKLDivergenceNormal(mu1, sd1, mu2, sd2) {
  const s1 = Math.max(1e-15, Number(sd1) || 1e-15);
  const s2 = Math.max(1e-15, Number(sd2) || 1e-15);
  const m1 = Number(mu1) || 0;
  const m2 = Number(mu2) || 0;

  const kl = Math.log(s2 / s1) + (s1 * s1 + (m1 - m2) ** 2) / (2 * s2 * s2) - 0.5;
  const safekl = Math.max(0, kl);

  let interpretation;
  if (safekl < 0.1) interpretation = 'Performance muito próxima do alvo.';
  else if (safekl < 0.5) interpretation = 'Distância moderada da distribuição alvo.';
  else if (safekl < 2.0) interpretation = 'Lacuna significativa em relação ao alvo.';
  else interpretation = 'Distribuição muito afastada do alvo — foco intenso necessário.';

  return { kl: Number(safekl.toFixed(4)), interpretation };
}

// ✅ LOTE-03: wrapper para compatibilidade com código existente.
// Delega para fsrsRetrievability, que é a mesma fórmula (1+t/9S)^-1,
// mas sem o clamp inferior de 0.1 que a versão antiga aplicava.
export function computeEbbinghausRetention(daysSince, stabilityDays) {
    return fsrsRetrievability(daysSince, stabilityDays);
}

export function estimateMemoryStability(history, maxScore = 100, baselineScore = null) {
  const normalized = _normalizeDiagnosticHistory(history, maxScore);
  if (normalized.length === 0) return 3;

  const sorted = getSortedHistory(normalized);
  let stability = 3.0;

  const safeBaseline = baselineScore !== null ? baselineScore : _mean(sorted.map(h => getSafeScore(h, maxScore)));
  const dynamicSuccessThreshold = Math.min(0.7, Math.max(0.5, safeBaseline / maxScore));

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    const pct = Math.min(1, Math.max(0, getSafeScore(h, maxScore) / maxScore));

    let currentRetention = 1.0;
    if (i > 0) {
      const gap = (_getEntryDate(h).getTime() - _getEntryDate(sorted[i - 1]).getTime()) / 86400000;
      // ✅ LOTE-03: usar fsrsRetrievability em vez de computeEbbinghausRetention
      currentRetention = fsrsRetrievability(gap, stability);

      if (gap > 0.1) {
        if (pct >= dynamicSuccessThreshold) {
          const elasticGrowth = 1 + 2 * Math.pow(1 - currentRetention, 2);
          stability *= elasticGrowth;
        } else {
          const dynamicDecay = Math.max(0.3, 1.0 - (0.6 * currentRetention));
          stability *= dynamicDecay;
          stability = Math.max(1, stability);
        }
      }
    }
    stability = Math.min(180, Math.max(1, stability));
  }
  return Number(stability.toFixed(1));
}

export function computeOptimalReviewInterval(stability, targetRetention = 0.7, mssdVolatility = null, effectiveN = null, maxScore = 100, currentMean = null, agilityPenalty = 0) {
  const S = Math.max(0.5, Number(stability) || 7);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  let baseInterval = Math.max(1, 9 * S * ((1 / R) - 1));

  if (mssdVolatility != null && effectiveN != null && !Number.isNaN(Number(mssdVolatility))) {
    const rmssd = Math.sqrt(Number(mssdVolatility));
    const normalizedMssd = rmssd / maxScore;

    const fragilityPenalty = Math.max(0.4, 1 - (normalizedMssd * 3));

    let crystallizationBonus = 1.0;
    if (effectiveN >= 3 && normalizedMssd < 0.08) {
      const confidence = Math.min(1, effectiveN / 15);
      const stabilityBonus = Math.max(0, 0.08 - normalizedMssd) * 12;
      const performanceFactor = currentMean !== null ? Math.max(0, (currentMean / maxScore) - 0.5) * 2.5 : 1;
      crystallizationBonus = 1 + (confidence * stabilityBonus * performanceFactor);
    }
    baseInterval = baseInterval * fragilityPenalty * crystallizationBonus;
  }

  const safeAgilityPenalty = Math.max(0, Math.min(0.4, Number(agilityPenalty) || 0));
  baseInterval = baseInterval * (1 - safeAgilityPenalty);

  return Math.max(1, Math.round(baseInterval));
}

export function computeForgettingRisk(history, maxScore = 100, baselineScore = null, mssdVolatility = null, effectiveN = null, daysSinceOverride = null, agilityPenalty = 0) {
  const noData = { risk: 'low', retentionPct: 100, stabilityDays: 3, optimalIntervalDays: 3, daysSinceLast: 0 };
  const normalized = _normalizeDiagnosticHistory(history, maxScore);
  if (normalized.length === 0) return noData;

  const sorted = [...getSortedHistory(normalized)].filter(h => h != null && typeof h === 'object').reverse();

  const daysSinceLast = daysSinceOverride !== null ? daysSinceOverride : Math.max(0, (Date.now() - _getEntryDate(sorted[0]).getTime()) / 86400000);
  const stability = estimateMemoryStability([...sorted].reverse(), maxScore, baselineScore);
  // ✅ LOTE-03: usar fsrsRetrievability em vez de computeEbbinghausRetention
  const retention = fsrsRetrievability(daysSinceLast, stability);
  const retentionPct = Number((retention * 100).toFixed(1));

  const currentMean = _mean(sorted.map(h => getSafeScore(h, maxScore)));
  // ✅ LOTE-01 FIX (C5): computeOptimalReviewInterval usa a MESMA base FSRS
  // (9 * S * (1/R - 1)) mas consome mssdVolatility/effectiveN/agilityPenalty,
  // que antes eram recebidos e ignorados silenciosamente.
  const optimalIntervalDays = computeOptimalReviewInterval(
    stability,
    0.7,
    mssdVolatility,
    effectiveN,
    maxScore,
    currentMean,
    agilityPenalty
  );

  let risk;
  if (retentionPct < 30) risk = 'critical';
  else if (retentionPct < 55) risk = 'high';
  else if (retentionPct < 75 && daysSinceLast >= optimalIntervalDays * 0.8) risk = 'medium';
  else risk = 'low';

  return { risk, retentionPct, stabilityDays: stability, optimalIntervalDays, daysSinceLast: Number(daysSinceLast.toFixed(1)) };
}

export function computeLearningVelocity(history, maxScore = 100) {
  const fallback = { velocity: 0, velocityLabel: 'Dados insuficientes', plateau: maxScore * 0.7, timeToPlateauDays: null };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const validHistory = history.filter(h => _getEntryDate(h) !== null);
  const sorted = getSortedHistory(validHistory);
  if (sorted.length < 4) return fallback;

  const t0 = _getEntryDate(sorted[0]).getTime();
  const data = sorted.map((h, idx) => ({
    t: Math.max(0.001 * idx, (_getEntryDate(h).getTime() - t0) / 86400000),
    y: Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore))),
  })).filter(d => Number.isFinite(d.y));

  const lastThree = data.slice(-3).map((d) => d.y);
  const plateauEst = Math.min(maxScore, Math.max(maxScore * 0.5, Math.max(...lastThree) * 1.1));

  const linearPts = data.filter((d) => d.y < plateauEst * 0.98 && d.y > 0);
  if (linearPts.length < 3) return { ...fallback, plateau: plateauEst };

  const ys = linearPts.map((d) => Math.log(Math.max(1e-6, 1 - d.y / plateauEst)));
  const ts = linearPts.map((d) => d.t);

  const Sty = kahanSum(ts.map((t, i) => t * ys[i]));
  const Stt = kahanSum(ts.map((t) => t * t));
  const k = Stt > 1e-15 ? Math.max(1e-4, -Sty / Stt) : 1e-3;

  const tNow = data[data.length - 1].t;
  const velocity = plateauEst * k * Math.exp(-k * tNow);

  const timeToPlateauDays = tNow < 1 ? null : Math.max(0, Math.round(Math.log(0.1) / -k) - tNow);

  let velocityLabel;
  const vPerMonth = velocity * 30;

  const currentScore = data[data.length - 1].y;
  const roomToGrow = Math.max(1, plateauEst - currentScore);
  const relativeVelocity = vPerMonth / roomToGrow;

  if (relativeVelocity > 0.15) velocityLabel = `Acelerado (Alta Tração Logística)`;
  else if (relativeVelocity > 0.05) velocityLabel = `Constante (Fechando lacunas ativamente)`;
  else if (relativeVelocity > 0.01) velocityLabel = `Lento (Requer revisão de método)`;
  else velocityLabel = 'Platô atingido / Estagnado';

  return {
    velocity: Number(velocity.toFixed(4)),
    velocityLabel,
    plateau: Number(plateauEst.toFixed(1)),
    timeToPlateauDays: timeToPlateauDays !== null ? Math.min(999, timeToPlateauDays) : null,
  };
}

export function computeConsistencyIndex(history, maxScore = 100) {
  const fallback = { index: 0.5, label: 'Dados insuficientes' };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const sorted = getSortedHistory(history);

  if (sorted.length < 4) return fallback;

  const scores = sorted.map((h) => Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore)))).filter(Number.isFinite);
  if (scores.length < 4) return fallback;
  const mu = _mean(scores);

  const med = _median(scores);
  const mad = _median(scores.map((s) => Math.abs(s - med)));
  const robustSD = 1.4826 * mad;

  const referenceScale = Math.max(1, mu);
  const cv = robustSD / referenceScale;

  const index = Math.max(0, 1 - Math.tanh(cv * 1.5));

  let label;
  if (index >= 0.8) label = 'Muito consistente';
  else if (index >= 0.6) label = 'Consistente';
  else if (index >= 0.4) label = 'Moderadamente instável';
  else if (index >= 0.2) label = 'Instável';
  else label = 'Muito errático';

  return { index: Number(index.toFixed(3)), label };
}

export function computeStudyEfficiency(studySessions, simulados, maxScore = 100, categoryId = null, normalizeSubject = null) {
  const _noData = { efficiency: 0, questionsPerHour: 0, accuracyRate: 0, totalMinutes: 0, totalQuestions: 0, label: 'Sem dados' };

  const sessions = (studySessions || []).filter((s) => !categoryId || s?.categoryId === categoryId);
  const totalMinutes = sessions.reduce((acc, s) => acc + (Number(s?.duration) || 0), 0);

  const _normalize = typeof normalizeSubject === 'function'
    ? normalizeSubject
    : (value) => String(value || '').toLowerCase().trim();

  const relevantSims = categoryId
    ? (simulados || []).filter((s) => s?.categoryId === categoryId)
    : (simulados || []);

  const totalQuestions = relevantSims.reduce((acc, s) => acc + (Number(s?.total) || 0), 0);
  const totalCorrect = relevantSims.reduce((acc, s) => {
    const total = Number(s?.total) || 0;
    if (total === 0) return acc;
    if (s?.correct != null) {
      const correctNum = Number(s.correct);
      if (Number.isFinite(correctNum)) return acc + correctNum;
    }
    const score = Math.min(1, Math.max(0, (Number(s?.score) || 0) / maxScore));
    return acc + score * total;
  }, 0);

  const totalHours = totalMinutes / 60;
  const questionsPerHour = totalHours > 0 ? totalQuestions / totalHours : 0;
  const accuracyRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  const efficiency = questionsPerHour * accuracyRate;

  const historicalPace = 15;
  const efficiencyRatio = questionsPerHour / Math.max(1, historicalPace);

  let label;
  if (questionsPerHour === 0) label = 'Sem questões registradas';
  else if (efficiencyRatio >= 1.3 && accuracyRate >= 0.7) label = 'Alta Performance (Acima do seu normal)';
  else if (efficiencyRatio >= 0.8 && accuracyRate >= 0.6) label = 'Ritmo Sólido';
  else if (questionsPerHour < (historicalPace * 0.5)) label = 'Fricção Detectada (Muito tempo, pouco processamento)';
  else label = 'Acurácia precisa melhorar';

  return {
    efficiency: Number(efficiency.toFixed(2)),
    questionsPerHour: Number(questionsPerHour.toFixed(1)),
    accuracyRate: Number(accuracyRate.toFixed(3)),
    totalMinutes: Number(totalMinutes.toFixed(0)),
    totalQuestions,
    label,
  };
}

export function computeAdaptiveLambda(history) {
  const DEFAULT_LAMBDA = 0.08;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_LAMBDA;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_LAMBDA;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(0.5, Math.min(90, medianGap));
  const lambda = 0.03 + 0.08 * Math.exp(-safeMedian / 10);

  return Number(Math.max(0.03, Math.min(0.12, lambda)).toFixed(4));
}

export function computeAdaptiveDecayFactor(history) {
  const DEFAULT_DECAY = 0.985;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_DECAY;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_DECAY;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(1, Math.min(90, medianGap));

  const halfLife = Math.max(7, safeMedian * 2);
  const decayFactor = Math.pow(0.5, 1 / halfLife);

  return Number(Math.max(0.906, Math.min(0.995, decayFactor)).toFixed(5));
}

export function computeAR1Coefficient(residuals) {
  if (!Array.isArray(residuals) || residuals.length < 5) return { rho: 0, significant: false };

  const clean = residuals.map(Number).filter(Number.isFinite);
  if (clean.length < 5) return { rho: 0, significant: false };

  const mu = _mean(clean);
  const centered = clean.map((r) => r - mu);

  const n = centered.length;
  const lag1 = centered.slice(1);
  const lag0 = centered.slice(0, n - 1);

  const numerator = lag0.reduce((s, v, i) => s + v * lag1[i], 0);
  const denom0 = lag0.reduce((s, v) => s + v * v, 0);
  const rho = denom0 > 1e-10 ? numerator / denom0 : 0;
  const clampedRho = Math.max(-1, Math.min(1, rho));

  const bartlettThreshold = 1.96 / Math.sqrt(Math.max(1, n));

  return {
    rho: Number(clampedRho.toFixed(3)),
    significant: Math.abs(clampedRho) > bartlettThreshold
  };
}

export function computeCategoryCorrelation(categoryHistories, maxScore = 100) {
  if (!categoryHistories || typeof categoryHistories !== 'object') return [];

  const ids = Object.keys(categoryHistories);
  if (ids.length < 2) return [];

  const monthly = {};
  for (const id of ids) {
    const hist = categoryHistories[id] || [];
    const byMonth = {};
    for (const h of hist) {
      const rawDate = h?.date || h?.createdAt;
      if (!rawDate) continue;
      const fullKey = getDateKey(rawDate);
      if (!fullKey) continue;
      const key = fullKey.slice(0, 7);

      const s = getSafeScore(h, maxScore) / maxScore;

      if (Number.isFinite(s)) {
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(s);
      }
    }
    monthly[id] = Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, _mean(v)]));
  }

  const result = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = monthly[ids[i]];
      const b = monthly[ids[j]];

      const keys = Object.keys(a).filter((k) => k in b);
      if (keys.length < 4) continue;

      const xs = keys.map((k) => a[k]);
      const ys = keys.map((k) => b[k]);

      const muX = _mean(xs);
      const muY = _mean(ys);
      const Sxy = kahanSum(xs.map((x, k) => (x - muX) * (ys[k] - muY)));
      const Sxx = kahanSum(xs.map((x) => (x - muX) ** 2));
      const Syy = kahanSum(ys.map((y) => (y - muY) ** 2));
      const epsilon = 1e-15;
      const denom = Math.sqrt((Math.max(0, Sxx) + epsilon) * (Math.max(0, Syy) + epsilon));
      const r = Sxy / denom;
      const clampedR = Math.max(-1, Math.min(1, r));

      let strength;
      const absR = Math.abs(clampedR);
      if (absR >= 0.7) strength = 'forte';
      else if (absR >= 0.4) strength = 'moderada';
      else if (absR >= 0.2) strength = 'fraca';
      else strength = 'negligível';

      result.push({ catA: ids[i], catB: ids[j], correlation: Number(clampedR.toFixed(3)), strength, commonMonths: keys.length });
    }
  }

  return result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

export function computeCategoryDiagnostics({
  history = [],
  studySessions = [],
  simulados = [],
  maxScore = 100,
  categoryId = null,
  targetScore = null,
  bayesianStats = null,
  normalizeSubject = null,
} = {}) {

  const histArray = Array.isArray(history) ? history : Object.values(history || {});
  const safeHistory = histArray.length > 2500 ? pruneHistoryForMemory(histArray, 1500) : histArray;

  const _scores = safeHistory
    .map((h) => getSafeScore(h, maxScore))
    .filter(Number.isFinite);

  const diagnostic = generateMathDiagnostic(safeHistory, maxScore);
  const hurst = diagnostic.hurstData;
  // ✅ LOTE-01 FIX (C5): diagnostic.mssd não existia (generateMathDiagnostic
  // não retorna esse campo) → mssdVolatility era sempre undefined.
  // Calculamos o MSSD real; computeOptimalReviewInterval espera a VARIÂNCIA (sd²).
  const mssdSD = calculateMSSD(safeHistory, maxScore);
  const mssdVariance = Number.isFinite(mssdSD) ? mssdSD * mssdSD : null;
  const forgetting = computeForgettingRisk(safeHistory, maxScore, null, mssdVariance, safeHistory.length);
  const consistency = computeConsistencyIndex(safeHistory, maxScore);
  const velocity = computeLearningVelocity(safeHistory, maxScore);

  let klToTarget = null;
  if (bayesianStats && targetScore !== null) {
    const targetMu = Number(targetScore);
    const targetSd = maxScore * 0.05;
    klToTarget = computeKLDivergenceNormal(
      bayesianStats.mean ?? 0,
      bayesianStats.sd ?? maxScore * 0.1,
      targetMu,
      targetSd,
    );
  }

  const efficiency = computeStudyEfficiency(
    studySessions.filter((s) => !categoryId || s?.categoryId === categoryId),
    simulados,
    maxScore,
    categoryId,
    normalizeSubject,
  );

  const dataAnomalies = detectDataAnomalies(safeHistory, maxScore);
  const dataErrorCount = dataAnomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;

  const flags = [];
  if (forgetting.risk === 'critical') flags.push({ type: 'danger', msg: `Retenção crítica: ~${forgetting.retentionPct}% — revise imediatamente (${forgetting.daysSinceLast.toFixed(0)} dias sem estudar).` });
  if (forgetting.risk === 'high') flags.push({ type: 'warning', msg: `Risco de esquecimento alto: retenção ~${forgetting.retentionPct}%. Revisão urgente.` });
  if (consistency.index < 0.35) flags.push({ type: 'warning', msg: `Performance muito errática (índice ${consistency.index.toFixed(2)}). Consolide a base antes de avançar.` });
  if (hurst.H > 0.65 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Tendência persistente detectada (H=${hurst.H}). Mantenha o momentum atual.` });
  if (hurst.H < 0.35 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Reversão à média detectada (H=${hurst.H}). Após uma boa nota, prepare-se para oscilação.` });
  if (velocity.velocityLabel?.includes('Estagnado')) flags.push({ type: 'warning', msg: 'Platô de aprendizagem detectado. Mude a estratégia de estudo.' });
  if (efficiency.questionsPerHour < 5 && efficiency.totalMinutes > 60) flags.push({ type: 'warning', msg: `Volume baixo de questões (${efficiency.questionsPerHour.toFixed(1)}/h). Priorize exercícios práticos.` });

  dataAnomalies.forEach(a => {
    if (a.severity === 'error') flags.push({ type: 'danger', msg: a.msg });
    else if (a.severity === 'warning') flags.push({ type: 'warning', msg: a.msg });
    else if (a.severity === 'info' && dataErrorCount > 0) flags.push({ type: 'info', msg: a.msg });
  });

  return {
    hurst,
    diagnostic,
    forgetting,
    consistency,
    velocity,
    klToTarget,
    efficiency,
    flags,
    dataAnomalies,
    dataQualityScore: Math.max(0, 1 - Math.min(1, dataErrorCount / 4)),
    adaptiveLambda: diagnostic.recommendedLambda,
    adaptiveDecayFactor: computeAdaptiveDecayFactor(safeHistory),
  };
}
`

## src/engine/math/kahan.js

`javascript
/**
 * Helper: verifica se o valor é um array-like iterável com .length
 * Suporta Array, Float64Array, Float32Array, Int32Array, etc.
 */
function isArrayLike(arr) {
    return arr != null && typeof arr.length === 'number' && arr.length >= 0;
}

/**
 * Algoritmo de Soma de Kahan (Kahan Summation Algorithm)
 * Minimiza o erro de ponto flutuante (IEEE 754) em somatórios de grandes séries.
 * 
 * @param {number[]|Float64Array|Float32Array} arr - Array de números para somar.
 * @returns {number} Soma matematicamente precisa.
 */
export function kahanSum(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    let sum = 0.0;
    let c = 0.0; // Um compensador para os bits de baixa ordem perdidos
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;
        
        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        
        let y = val - c;     // c é zero na primeira iteração, depois carrega o erro anterior
        let t = sum + y;     // Adiciona o valor compensado à soma total
        c = (t - sum) - y;   // Calcula o erro de arredondamento desta iteração
        sum = t;             // Atualiza a soma principal
    }
    
    return sum;
}

/**
 * Calcula a média utilizando a Soma de Kahan para máxima precisão.
 * Suporta Array, Float64Array, Float32Array, etc.
 */
export function kahanMean(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    // Para TypedArrays, filtrar NaN/Infinity in-line sem .filter()
    let count = 0;
    let sum = 0.0;
    let c = 0.0;
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;

        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        const y = val - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;
        count++;
    }
    
    return count === 0 ? 0 : sum / count;
}

`

## src/engine/probabilistic/stateSpace.js

`javascript
/**
 * stateSpace.js
 *
 * Lote 1 — State-Space / Kalman Filter para habilidade e tendência.
 *
 * Modelo:
 *
 * ability_t = ability_{t-1} + trend_{t-1} * dt + eta_t
 * trend_t   = trend_{t-1} + zeta_t
 * score_t   = ability_t + epsilon_t
 *
 * Onde:
 * - ability = nível real latente do aluno;
 * - trend = tendência em pontos por dia;
 * - dt = dias decorridos entre observações;
 * - eta/zeta = ruído de processo;
 * - epsilon = ruído de medição.
 *
 * Este módulo não substitui o motor atual por padrão.
 * Ele só será usado se as feature flags estiverem ativas.
 */

/**
 * State Space Model para estimativa de habilidade latente.
 * Usa filtro de Kalman simplificado com média de Kahan corrigida.
 */

/**
 * ✅ CORRIGE BUG-003: Média de Kahan agora divide pelo contador de valores válidos,
 * não pelo length original do array.
 *
 * Antes: sum / values.length (errado com NaN)
 * Depois: sum / count (correto)
 */
function kahanMean(values) {
  if (!Array.isArray(values) || values.length === 0) return null; // ✅ FIX #5: null ao invés de 0

  let sum = 0;
  let c = 0;
  let count = 0; // ✅ contador de valores válidos

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  // ✅ FIX #5: Se nenhum valor válido, retorna null (sem dados), não 0 (média zero)
  // Permite consumidor diferenciar "sem dados" de "média é zero"
  return count === 0 ? null : sum / count;
}

/**
 * Variância com soma de Kahan.
 */
function kahanVariance(values, mean = null) {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const validValues = values.map(Number).filter(Number.isFinite);
  if (validValues.length === 0) return 0;

  const avg = mean ?? kahanMean(validValues);

  let sum = 0;
  let c = 0;
  let count = 0;

  for (const value of validValues) {
    const diff = (value - avg) ** 2;
    const y = diff - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  return count === 0 ? 0 : sum / count;
}

/**
 * Desvio padrão com soma de Kahan.
 */
function kahanStd(values, mean = null) {
  const variance = kahanVariance(values, mean);
  if (!Number.isFinite(variance)) return 0;
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Helpers para o modelo State-Space/Kalman usado pelo coach.
 */
function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function parseObservationTime(entry) {
  if (!entry || typeof entry !== 'object') return NaN;

  const rawDate = entry.date ?? entry.createdAt ?? entry.timestamp ?? entry.time;
  if (!rawDate) return NaN;

  const parsed = Date.parse(rawDate);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Estima habilidade e tendência usando filtro de Kalman simplificado.
 * Compatível com o código do coach que espera campos como abilitySd/trendPerDay.
 */
export function kalmanAbilityTrend(observations = [], options = {}) {
  const maxScore = clampNumber(options.maxScore ?? 100, 1, 100000);
  const minScore = clampNumber(options.minScore ?? 0, 0, maxScore);
  const domain = Math.max(1e-6, maxScore - minScore);

  const obs = (Array.isArray(observations) ? observations : [])
    .map((entry, index) => {
      const score = Number(entry?.score);
      const time = parseObservationTime(entry);

      return {
        index,
        score: Number.isFinite(score) ? clampNumber(score, minScore, maxScore) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);

  if (obs.length < 2) {
    return null;
  }

  const scores = obs.map((entry) => entry.score);

  const initialAbility = clampNumber(
    kahanMean(scores.slice(0, Math.min(3, scores.length))) ?? scores[0],
    minScore,
    maxScore
  );

  let observationVariance = Math.pow(domain * 0.08, 2);

  if (scores.length >= 3) {
    const mean = kahanMean(scores);
    const variance =
      scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
      Math.max(1, scores.length - 1);

    observationVariance = Math.max(
      Math.pow(domain * 0.04, 2),
      Math.min(Math.pow(domain * 0.25, 2), (variance * 0.75) + Math.pow(domain * 0.03, 2))
    );
  }

  let ability = initialAbility;
  let trend = 0;

  let P00 = Math.max(observationVariance, Math.pow(domain * 0.12, 2));
  let P01 = 0;
  let P11 = Math.pow(domain * 0.01, 2);

  const qAbility = Math.pow(domain * 0.005, 2);
  const qTrend = Math.pow(domain * 0.001, 2);
  const maxTrendPerDay = Math.max(0.05, domain * 0.015);

  let previousTime = obs[0].time;
  let logLikelihood = 0;

  for (let i = 0; i < obs.length; i++) {
    const current = obs[i];
    const y = clampNumber(current.score, minScore, maxScore);

    if (i > 0) {
      const dtDays = clampNumber((current.time - previousTime) / 86400000, 0.25, 60);

      ability = clampNumber(ability + trend * dtDays, minScore, maxScore);

      const nextP00 =
        P00 + 2 * dtDays * P01 + dtDays * dtDays * P11 + qAbility * dtDays;
      const nextP01 = P01 + dtDays * P11;
      const nextP11 = P11 + qTrend * dtDays;

      P00 = Math.max(1e-12, nextP00);
      P01 = nextP01;
      P11 = Math.max(1e-12, nextP11);

      previousTime = current.time;
    }

    const innovation = y - ability;
    const S = P00 + observationVariance;

    if (!Number.isFinite(S) || S <= 1e-12) {
      continue;
    }

    const K0 = P00 / S;
    const K1 = P01 / S;

    ability = clampNumber(ability + K0 * innovation, minScore, maxScore);
    trend = clampNumber(trend + K1 * innovation, -maxTrendPerDay, maxTrendPerDay);

    const A00 = 1 - K0;
    const A01 = 0;
    const A10 = -K1;
    const A11 = 1;

    const AP00 = A00 * P00 + A01 * P01;
    const AP01 = A00 * P01 + A01 * P11;
    const AP10 = A10 * P00 + A11 * P01;
    const AP11 = A10 * P01 + A11 * P11;

    const newP00 =
      AP00 * A00 +
      AP01 * A01 +
      K0 * observationVariance * K0;

    const newP01 =
      AP00 * A01 +
      AP01 * A11 +
      K0 * observationVariance * K1;

    const newP11 =
      AP10 * A01 +
      AP11 * A11 +
      K1 * observationVariance * K1;

    P00 = Math.max(1e-12, newP00);
    P01 = newP01;
    P11 = Math.max(1e-12, newP11);

    logLikelihood +=
      -0.5 * Math.log(2 * Math.PI * S) -
      0.5 * ((innovation * innovation) / S);
  }

  const trendPerMonth = clampNumber(trend * 30, -domain, domain);

  return {
    model: 'local_level_trend_kalman',
    ability: clampNumber(ability, minScore, maxScore),
    trendPerDay: clampNumber(trend, -maxTrendPerDay, maxTrendPerDay),
    trendPerMonth,
    abilitySd: Math.sqrt(Math.max(0, P00)),
    trendSd: Math.sqrt(Math.max(0, P11)),
    observationVariance,
    processNoise: {
      ability: qAbility,
      trend: qTrend,
    },
    logLikelihood,
    sampleSize: obs.length,
    maxScore,
    minScore,
  };
}

/**
 * Filtro de Kalman simplificado para estimativa de habilidade.
 */
export function runStateSpaceModel(scores, options = {}) {
  const {
    processNoise = 0.1,
    observationNoise = 1.0,
    initialVariance = 100,
  } = options;

  const validScores = Array.isArray(scores)
    ? scores.map(Number).filter(Number.isFinite)
    : [];

  if (validScores.length === 0) {
    return {
      ability: 0,
      variance: initialVariance,
      trend: 0,
      insufficientData: true,
    };
  }

  // ✅ CORRIGE BUG-003: usa kahanMean corrigido
  const initialAbility = kahanMean(validScores) ?? 50; // ✅ FIX #5: fallback para 50 se null
  const initialStd = kahanStd(validScores, initialAbility);

  let ability = initialAbility;
  let variance = Math.max(initialVariance, initialStd ** 2);

  let trendSum = 0;
  let trendCount = 0;
  let prevAbility = ability;

  for (const score of validScores) {
    // Predição
    const predictedVariance = variance + processNoise;

    // Atualização (gain)
    const gain = predictedVariance / (predictedVariance + observationNoise);

    // Inovação
    const innovation = score - ability;

    // Atualização de estado
    ability = ability + gain * innovation;
    variance = (1 - gain) * predictedVariance;

    // Trend
    if (trendCount > 0) {
      trendSum += ability - prevAbility;
      trendCount++;
    } else {
      trendCount = 1;
    }

    prevAbility = ability;
  }

  const trend = trendCount > 1 ? trendSum / (trendCount - 1) : 0;

  return {
    ability,
    variance,
    std: Math.sqrt(variance),
    trend,
    n: validScores.length,
    insufficientData: validScores.length < 3,
  };
}

/**
 * Wrapper para compatibilidade com código existente.
 */
export function estimateAbility(scores, options = {}) {
  return runStateSpaceModel(scores, options);
}

export default {
  runStateSpaceModel,
  estimateAbility,
  kalmanAbilityTrend,
  kahanMean,
  kahanVariance,
  kahanStd,
};

`

## src/engine/probabilistic/volatility.js

`javascript
/**
 * volatility.js
 *
 * Lote 2 — Volatilidade dinâmica EWMA/GARCH para o Coach.
 *
 * Objetivo:
 * - estimar volatilidade condicional futura;
 * - reduzir reação excessiva a ruído antigo;
 * - aumentar reação a instabilidade recente;
 * - fornecer base para Monte Carlo posterior preditivo no Lote 3.
 *
 * Modelos:
 * - EWMA:
 *   sigma2_t = lambda * sigma2_{t-1} + (1 - lambda) * r_t^2
 *
 * - GARCH(1,1) simplificado:
 *   sigma2_t = omega + alpha * r_t^2 + beta * sigma2_{t-1}
 *
 * Importante:
 * Este módulo não substitui o motor atual por padrão.
 * Ele só afeta o sistema se as feature flags estiverem ativas.
 */

import { kahanSum } from '../math/kahan.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseTime(value) {
  if (value === null || value === undefined) return NaN;

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return NaN;
  const sorted = [...values]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return NaN;

  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Estima volatilidade dinâmica a partir do histórico de simulados.
 *
 * @param {Array<{score:number,date?:string,createdAt?:string}|number>} history
 * @param {Object} options
 * @param {number} [options.maxScore=100]
 * @param {number} [options.minScore=0]
 * @param {boolean} [options.useGarch=false]
 * @param {boolean} [options.override=false]
 * @param {number} [options.horizonDays]
 * @returns {Object|null}
 */
export function estimateDynamicVolatility(history = [], options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(options.minScore, 0, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const useGarch = options.useGarch === true;
  const override = options.override === true;

  const rawHistory = Array.isArray(history)
    ? history
    : Object.values(history || {});

  const observations = rawHistory
    .map((entry, index) => {
      const score = Number(entry?.score ?? entry);
      const time = parseTime(entry?.date ?? entry?.createdAt ?? entry?.timestamp);

      return {
        index,
        score: Number.isFinite(score) ? clampFinite(score, minScore, maxScore, score) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      const hasTimeA = Number.isFinite(a.time);
      const hasTimeB = Number.isFinite(b.time);

      if (hasTimeA && hasTimeB && a.time !== b.time) {
        return a.time - b.time;
      }

      return a.index - b.index;
    });

  if (observations.length < 3) {
    return null;
  }

  const scores = observations.map((entry) => entry.score);
  const n = scores.length;

  // Volatilidade fallback: desvio padrão amostral com shrinkage.
  const mean = kahanSum(scores) / n;
  const sampleVariance =
    n > 1
      ? kahanSum(scores.map((score) => Math.pow(score - mean, 2))) / (n - 1)
      : 0;

  const fallbackVolatility =
    Math.sqrt(Math.max(0, sampleVariance)) * (n / (n + 4)) +
    domain * 0.08 * (4 / (n + 4));

  // Retornos diários aproximados.
  const returns = [];
  const dts = [];

  for (let i = 1; i < observations.length; i++) {
    const prev = observations[i - 1];
    const curr = observations[i];

    let dtDays = 1;

    if (
      Number.isFinite(prev.time) &&
      Number.isFinite(curr.time) &&
      curr.time > prev.time
    ) {
      dtDays = clampFinite((curr.time - prev.time) / 86400000, 0.25, 60, 1);
    }

    const diff = curr.score - prev.score;
    const dailyReturn = diff / dtDays;

    if (Number.isFinite(dailyReturn)) {
      returns.push(dailyReturn);
      dts.push(dtDays);
    }
  }

  if (returns.length < 2) {
    return null;
  }

  const medianGapDays = clampFinite(median(dts), 0.5, 60, 7);
  const horizonDays = clampFinite(options.horizonDays, 1, 90, medianGapDays);

  // Winsorização leve dos retornos para reduzir outliers.
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const lower = quantileSorted(sortedReturns, 0.05);
  const upper = quantileSorted(sortedReturns, 0.95);

  const winsorizedReturns = returns.map((r) =>
    clampFinite(r, lower, upper, r)
  );

  const returnMean = kahanSum(winsorizedReturns) / winsorizedReturns.length;

  const returnVariance =
    winsorizedReturns.length > 1
      ? kahanSum(
          winsorizedReturns.map((r) => Math.pow(r - returnMean, 2))
        ) / (winsorizedReturns.length - 1)
      : 0;

  const unconditionalDailyVariance = Math.max(
    Math.pow(domain * 0.0015, 2),
    returnVariance
  );

  let sigma2Daily = unconditionalDailyVariance;
  let model = 'ewma';
  let omega = null;
  let alpha = null;
  let beta = null;
  let persistence = 0.94;

  const maxSigma2 = Math.pow(domain * 0.25, 2);

  if (useGarch && returns.length >= 5) {
    model = 'garch11';

    alpha = returns.length >= 12 ? 0.10 : 0.14;
    beta = returns.length >= 12 ? 0.82 : 0.72;

    // Estacionaridade: alpha + beta < 1.
    if (alpha + beta > 0.95) {
      beta = 0.95 - alpha;
    }

    omega = Math.max(
      1e-12,
      unconditionalDailyVariance * Math.max(0.03, 1 - alpha - beta)
    );

    persistence = alpha + beta;

    for (let i = 0; i < returns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const shock = returns[i] * returns[i];
      const betaEffective = Math.pow(beta, dt);

      const omegaAdjusted = omega * (1 - betaEffective) / (1 - beta);
      sigma2Daily =
        omegaAdjusted +
        alpha * shock +
        betaEffective * sigma2Daily;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  } else {
    model = 'ewma';

    const lambda = 0.94;
    persistence = lambda;

    for (let i = 0; i < returns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const lambdaEffective = Math.pow(lambda, dt);
      const shock = returns[i] * returns[i];

      sigma2Daily =
        lambdaEffective * sigma2Daily +
        (1 - lambdaEffective) * shock;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  }

  const dailyVolatility = Math.sqrt(Math.max(0, sigma2Daily));

  // Converte volatilidade diária em volatilidade esperada para o intervalo típico.
  const modelVolatility =
    dailyVolatility * Math.sqrt(Math.max(1, horizonDays));

  // Shrinkage bayesiano simples por tamanho amostral.
  const sampleTrust = Math.min(1, returns.length / (returns.length + 8));

  const blendedVolatility =
    sampleTrust * modelVolatility +
    (1 - sampleTrust) * fallbackVolatility;

  const rawVolatility = override ? modelVolatility : blendedVolatility;

  const volatility = clampFinite(
    rawVolatility,
    0,
    domain * 0.65,
    fallbackVolatility
  );

  return {
    model,
    volatility,
    modelVolatility: clampFinite(modelVolatility, 0, domain * 0.65, modelVolatility),
    fallbackVolatility: clampFinite(fallbackVolatility, 0, domain * 0.65, fallbackVolatility),
    dailyVolatility: clampFinite(dailyVolatility, 0, domain * 0.20, dailyVolatility),
    horizonDays,
    medianGapDays,
    sampleSize: returns.length,
    parameters: {
      omega,
      alpha,
      beta,
      persistence,
    },
    diagnostics: {
      returnMean,
      returnVariance,
      unconditionalDailyVariance,
      maxSigma2,
    },
  };
}

const isDev =
  typeof process !== 'undefined' &&
  process.env &&
  process.env.NODE_ENV !== 'production';

if (isDev) {
  // Teste: a variância de longo prazo deve convergir para ω/(1-α-β)
  // independentemente do valor de dt
  const alphaG = 0.05, betaG = 0.75;
  const unconditionalVarG = 25; // σ²_∞ desejado
  const omegaG = (1 - alphaG - betaG) * unconditionalVarG; // = 5

  let testSigma2 = unconditionalVarG;
  for (let i = 0; i < 500; i++) {
    const dt = 1 + Math.random() * 5; // dt variável entre 1 e 6 dias
    const betaEff = Math.pow(betaG, dt);
    const omegaAdj = omegaG * (1 - betaEff) / (1 - betaG);
    const shock = (Math.random() - 0.5) * 10;
    testSigma2 = omegaAdj + alphaG * shock * shock + betaEff * testSigma2;
  }
  console.assert(Math.abs(testSigma2 - unconditionalVarG) < unconditionalVarG * 0.3,
    `Variância deveria convergir para ~${unconditionalVarG}, obteve ${testSigma2}`);
}

export default {
  estimateDynamicVolatility,
};

`

## src/engine/probabilistic/posteriorPredictive.js

`javascript
/**
 * posteriorPredictive.js
 *
 * Lote 3 — Posterior Predictive Monte Carlo para o Coach.
 *
 * Objetivo:
 * - estimar P(score futuro >= meta) usando distribuição posterior aproximada;
 * - incorporar incerteza de habilidade, tendência e volatilidade;
 * - reduzir overconfidence em cenários com poucos dados;
 * - permitir blend conservador com o Monte Carlo legado.
 *
 * Modelo simplificado:
 *
 * ability_i ~ Normal(ability, abilitySd)
 * trendShift_i ~ Normal(trendMean, trendSd)
 * noise_i ~ Normal(0, sigma * sqrt(horizon))
 * score_future_i = ability_i + trendShift_i + noise_i
 *
 * Onde:
 * - ability = nível atual estimado;
 * - abilitySd = incerteza do nível atual;
 * - trendMean = tendência futura amortecida;
 * - sigma = volatilidade diária estimada;
 * - horizon = dias até o horizonte efetivo.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function kahanSumLocal(values) {
  let sum = 0;
  let c = 0;

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }

  return sum;
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGaussianSampler(rng) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = rng();
    let v = rng();

    while (u === 0) u = rng();
    while (v === 0) v = rng();

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * v);
    const z1 = magnitude * Math.sin(2.0 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Estima a probabilidade posterior preditiva de atingir a meta.
 *
 * @param {Object} input
 * @param {number} [input.ability]
 * @param {number} [input.abilitySd]
 * @param {number} [input.trendPerDay]
 * @param {number} [input.trendSd]
 * @param {number} [input.dailyVolatility]
 * @param {number} [input.horizonDays]
 * @param {number} [input.targetScore]
 * @param {number} [input.minScore]
 * @param {number} [input.maxScore]
 * @param {number} [input.sampleSize]
 * @param {number} [input.baseProbability]
 * @param {Object} options
 * @param {number} [options.simulations]
 * @param {string} [options.seed]
 * @param {boolean} [options.blendWithBase]
 * @param {number} [options.trendHalfLifeDays]
 * @returns {Object|null}
 */
export function estimatePosteriorPredictive(input = {}, options = {}) {
  const maxScore = clampFinite(input.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(input.minScore, 0, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const ability = clampFinite(
    input.ability,
    minScore,
    maxScore,
    minScore + domain * 0.5
  );

  const targetScore = clampFinite(
    input.targetScore,
    minScore,
    maxScore,
    minScore + domain * 0.8
  );

  const horizonDays = clampFinite(input.horizonDays, 0, 180, 30);

  const simulations = Math.round(
    clampFinite(options.simulations ?? input.simulations, 200, 3000, 800)
  );

  const seed =
    options.seed ??
    `ppm_${ability.toFixed(2)}_${targetScore.toFixed(2)}_${horizonDays}_${simulations}`;

  const rng = mulberry32(hashSeed(seed));
  const gaussian = createGaussianSampler(rng);

  const abilitySd = clampFinite(
    input.abilitySd,
    0,
    domain * 0.25,
    domain * 0.05
  );

  const trendPerDay = clampFinite(
    input.trendPerDay,
    -domain * 0.02,
    domain * 0.02,
    0
  );

  const trendSd = clampFinite(
    input.trendSd,
    0,
    domain * 0.01,
    domain * 0.002
  );

  const dailyVolatility = clampFinite(
    input.dailyVolatility,
    0,
    domain * 0.25,
    domain * 0.03
  );

  const sampleSize = Math.max(
    0,
    Math.round(clampFinite(input.sampleSize, 0, 10000, 0))
  );

  // A tendência não deve ser projetada linearmente para sempre.
  // Usamos um amortecimento estilo meia-vida.
  const trendHalfLifeDays = clampFinite(
    options.trendHalfLifeDays,
    7,
    120,
    45
  );

  const effectiveTrendDays =
    trendHalfLifeDays * (1 - Math.exp(-horizonDays / trendHalfLifeDays));

  const meanTrendShift = trendPerDay * effectiveTrendDays;

  const trendShiftSd = Math.max(
    1e-9,
    trendSd * effectiveTrendDays * 0.6
  );

  const baseNoiseSd =
    dailyVolatility * Math.sqrt(Math.max(0, horizonDays));

  // Casos extremos.
  if (targetScore <= minScore) {
    return {
      model: 'posterior_predictive_normal_trend_damped',
      probability: 100,
      probabilityRaw: 100,
      mean: ability,
      ciLow: minScore,
      ciHigh: maxScore,
      horizonDays,
      simulations,
      sampleSize,
      sampleTrust: 1,
      inputs: {
        ability,
        abilitySd,
        trendPerDay,
        trendSd,
        dailyVolatility,
        targetScore,
        minScore,
        maxScore,
      },
      diagnostics: {
        effectiveTrendDays,
        meanTrendShift,
        trendShiftSd,
        baseNoiseSd,
        successCount: simulations,
      },
    };
  }

  const samples = new Array(simulations);
  let successCount = 0;

  for (let i = 0; i < simulations; i++) {
    const sampledAbility = ability + gaussian() * abilitySd;

    const sampledTrendShift =
      meanTrendShift + gaussian() * trendShiftSd;

    // Volatilidade heteroscedástica leve + cauda pesada ocasional.
    let volatilityMultiplier = 0.8 + 0.4 * rng();

    if (rng() < 0.07) {
      volatilityMultiplier *= 1.65;
    }

    const noise = gaussian() * baseNoiseSd * volatilityMultiplier;

    let futureScore = sampledAbility + sampledTrendShift + noise;

    if (futureScore < minScore) futureScore = minScore;
    if (futureScore > maxScore) futureScore = maxScore;

    samples[i] = futureScore;

    if (futureScore >= targetScore) {
      successCount++;
    }
  }

  const sortedSamples = samples.slice().sort((a, b) => a - b);

  const mean = kahanSumLocal(samples) / simulations;
  const ciLow = quantileSorted(sortedSamples, 0.025);
  const ciHigh = quantileSorted(sortedSamples, 0.975);

  const rawProbability = (successCount / simulations) * 100;

  // Confiança baseada no tamanho amostral.
  const sampleTrust =
    sampleSize > 0
      ? Math.min(1, sampleSize / (sampleSize + 8))
      : 0.35;

  const baseProbability = clampFinite(input.baseProbability, 0, 100, NaN);

  let probability = rawProbability;

  if (options.blendWithBase !== false && Number.isFinite(baseProbability)) {
    probability =
      sampleTrust * rawProbability +
      (1 - sampleTrust) * baseProbability;
  }

  probability = clampFinite(probability, 0, 100, rawProbability);

  return {
    model: 'posterior_predictive_normal_trend_damped',
    probability,
    probabilityRaw: rawProbability,
    mean,
    ciLow,
    ciHigh,
    horizonDays,
    simulations,
    sampleSize,
    sampleTrust,
    inputs: {
      ability,
      abilitySd,
      trendPerDay,
      trendSd,
      dailyVolatility,
      targetScore,
      minScore,
      maxScore,
    },
    diagnostics: {
      effectiveTrendDays,
      meanTrendShift,
      trendShiftSd,
      baseNoiseSd,
      successCount,
    },
  };
}

export default {
  estimatePosteriorPredictive,
};

`

## src/engine/probabilistic/bayesianTopics.js

`javascript
/**
 * bayesianTopics.js
 *
 * Lote 4 — Bayesian Topic Proficiency
 *
 * Modelo:
 * - Beta-Binomial com prior empírico por disciplina/global.
 * - Cada tópico recebe uma distribuição posterior Beta(alpha, beta).
 * - Tópicos com poucas questões ficam com maior incerteza.
 * - Tópicos não testados não herdam automaticamente a média global.
 *
 * Saída por tópico:
 * - proficiencyMean: média posterior;
 * - proficiencySd: desvio posterior;
 * - ciLow / ciHigh: intervalo credível por quantis reais da Beta;
 * - evidence: confiança baseada no volume amostral;
 * - uncertainty: incerteza normalizada;
 * - isUntested: se o tópico não possui evidência.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  let str = String(value).trim();
  str = str.replace(/[%\s]/g, '');
  if (!str) return fallback;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}

function sumValues(values) {
  let sum = 0;
  let c = 0;
  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }
  return sum;
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return sumValues(finite) / finite.length;
}

function varianceValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length < 2) return 0;
  const mean = meanValues(finite);
  const devs = finite.map((v) => Math.pow(v - mean, 2));
  return sumValues(devs) / (finite.length - 1);
}

// ============================================================
// NOVO: logGamma (Lanczos approximation)
// Necessário para a função beta regularizada incompleta.
// ============================================================
function logGamma(z) {
  /* eslint-disable no-loss-of-precision */
  const cof = [
    57.15623566586292, -59.59796035547549, 14.136097974741747,
    -0.4919138160976202, 0.3399464998481189e-4, 0.4652362892704858e-4,
    -0.9837447530487956e-4, 0.1580887032249125e-3,
    -0.2102644417241049e-3, 0.2174396181152126e-3,
    -0.1643181065367639e-3, 0.8441822398385274e-4,
    -0.2619083840158141e-4, 0.3689918265953162e-5,
  ];
  /* eslint-enable no-loss-of-precision */
  if (z <= 0) return NaN;
  let x = z;
  let y = x;
  let tmp = x + 5.2421875;
  tmp = (x + 0.5) * Math.log(tmp) - tmp;
  let ser = 0.9999999999999971;
  for (let j = 0; j < cof.length; j++) ser += cof[j] / ++y;
  return tmp + Math.log(2.5066282746310007 * ser / x);
}

// ============================================================
// NOVO: Fração continuada da função beta incompleta (Lentz)
// ============================================================
function betaContinuedFraction(a, b, x) {
  const MAX_ITER = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// ============================================================
// NOVO: Função beta regularizada incompleta I_x(a, b)
// ============================================================
function regularizedIncompleteBeta(x, a, b) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(x)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log1p(-x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction(a, b, x) / a;
  }
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}

// ============================================================
// NOVO: Quantil da distribuição Beta por busca binária
// Substitui a aproximação simétrica mean ± 1.96*sd.
// ============================================================
function betaQuantile(p, a, b) {
  const safeP = Math.max(1e-8, Math.min(1 - 1e-8, Number(p) || 0.5));
  if (!(a > 0) || !(b > 0)) return 0.5;

  let lo = 0;
  let hi = 1;
  // 80 iterações de busca binária → precisão ~1e-24
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const cdf = regularizedIncompleteBeta(mid, a, b);
    if (!Number.isFinite(cdf) || cdf >= safeP) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// ============================================================
// FUNÇÃO PRINCIPAL (alteração: IC por quantis Beta)
// ============================================================
export function estimateTopicProficiencies(topics = [], options = {}) {
  const untestedPriorMean = clampFinite(options.untestedPriorMean, 0, 1, 0.25);
  const untestedPriorWeight = clampFinite(options.untestedPriorWeight, 0, 1, 0.45);
  const minPriorStrength = clampFinite(options.minPriorStrength, 1, 50, 3);
  const maxPriorStrength = clampFinite(options.maxPriorStrength, 1, 200, 22);

  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  const parsedTopics = safeTopics.map((topic, index) => {
    const name = String(topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`);
    const total = Math.max(0, toFiniteNumber(topic?.total, 0));
    let correct = toFiniteNumber(topic?.correct ?? topic?.acertos, NaN);
    if (!Number.isFinite(correct) && Number.isFinite(topic?.percentage) && total > 0) {
      correct = (Number(topic.percentage) / 100) * total;
    }
    correct = Number.isFinite(correct) ? correct : 0;
    correct = Math.max(0, Math.min(total, correct));
    return { name, total, correct, isUntested: total <= 0 };
  });

  const topicsWithData = parsedTopics.filter((t) => t.total > 0);
  const globalTotal = sumValues(topicsWithData.map((t) => t.total));
  const globalCorrect = sumValues(topicsWithData.map((t) => t.correct));
  const globalMean =
    globalTotal > 0
      ? clampFinite(globalCorrect / globalTotal, 0, 1, untestedPriorMean)
      : untestedPriorMean;

  let priorStrength =
    minPriorStrength +
    Math.sqrt(Math.max(0, globalTotal)) * 0.12 +
    topicsWithData.length * 0.25;

  // Empirical Bayes: prior mais fraco quando tópicos variam muito
  if (topicsWithData.length >= 3) {
    const topicRates = topicsWithData.map((t) => t.correct / t.total);
    const rateMean = meanValues(topicRates);
    const rateVariance = varianceValues(topicRates);
    const averageBinomialNoise = meanValues(
      topicsWithData.map((t) => {
        const n = Math.max(1, t.total);
        return (rateMean * (1 - rateMean)) / n;
      })
    );
    const tau2 = Math.max(0, rateVariance - averageBinomialNoise);
    if (tau2 > 1e-6) {
      const momentK = (rateMean * (1 - rateMean)) / tau2 - 1;
      priorStrength = Math.min(
        priorStrength,
        clampFinite(momentK, minPriorStrength, maxPriorStrength, priorStrength)
      );
    }
  }

  priorStrength = clampFinite(
    priorStrength, minPriorStrength, maxPriorStrength, minPriorStrength
  );

  const globalAlpha0 = Math.max(1e-6, globalMean * priorStrength);
  const globalBeta0 = Math.max(1e-6, (1 - globalMean) * priorStrength);

  const enrichedTopics = parsedTopics.map((topic) => {
    let alpha;
    let beta;
    let priorMean = globalMean;

    if (topic.isUntested) {
      priorMean = untestedPriorMean;
      const localK = Math.max(0.5, priorStrength * untestedPriorWeight);
      alpha = Math.max(1e-6, priorMean * localK);
      beta = Math.max(1e-6, (1 - priorMean) * localK);
    } else {
      alpha = globalAlpha0 + topic.correct;
      beta = globalBeta0 + Math.max(0, topic.total - topic.correct);
    }

    const posteriorStrength = alpha + beta;
    const proficiencyMean =
      posteriorStrength > 0
        ? clampFinite(alpha / posteriorStrength, 0, 1, priorMean)
        : priorMean;
    const proficiencyVariance =
      posteriorStrength > 0
        ? (alpha * beta) /
          (posteriorStrength * posteriorStrength * (posteriorStrength + 1))
        : 0;
    const proficiencySd = Math.sqrt(Math.max(0, proficiencyVariance));

    // ✅ CORREÇÃO PRINCIPAL: IC por quantis reais da posterior Beta.
    // Antes: mean ± 1.96 * sd (aproximação simétrica, inválida aqui).
    // Agora: quantis 2.5% e 97.5% da Beta(alpha, beta).
    const ciLow = betaQuantile(0.025, alpha, beta);
    const ciHigh = betaQuantile(0.975, alpha, beta);

    const evidence = topic.isUntested
      ? 0
      : clampFinite(topic.total / (topic.total + priorStrength), 0, 1, 0);
    const uncertainty = clampFinite(proficiencySd / 0.25, 0, 1, 0);

    return {
      name: topic.name,
      total: topic.total,
      correct: topic.correct,
      isUntested: topic.isUntested,
      priorMean,
      priorStrength: topic.isUntested
        ? priorStrength * untestedPriorWeight
        : priorStrength,
      posteriorAlpha: alpha,
      posteriorBeta: beta,
      posteriorStrength,
      proficiencyMean,
      proficiencySd,
      proficiencyPct: proficiencyMean * 100,
      ciLow,
      ciHigh,
      evidence,
      uncertainty,
    };
  });

  return {
    model: 'beta_binomial_empirical_bayes',
    global: {
      globalTotal,
      globalCorrect,
      globalMean,
      priorStrength,
      alpha0: globalAlpha0,
      beta0: globalBeta0,
      topicsWithData: topicsWithData.length,
      untestedPriorMean,
      untestedPriorWeight,
    },
    topics: enrichedTopics,
  };
}

export function computeBayesianTopicUtility(topic = {}, options = {}) {
  const proficiencyMean = clampFinite(topic.proficiencyMean, 0, 1, 0.5);
  const uncertainty = clampFinite(topic.uncertainty, 0, 1, 0.5);
  const evidence = clampFinite(topic.evidence, 0, 1, 0);
  const weakness = clampFinite(1 - proficiencyMean, 0, 1, 0.5);
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 1, 0.65);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 1, 0.35);
  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight;
  const utility = baseUtility * (0.65 + 0.35 * evidence);
  return clampFinite(utility, 0, 1, 0);
}

export default {
  estimateTopicProficiencies,
  computeBayesianTopicUtility,
};

`

## src/engine/probabilistic/decisionEngine.js

`javascript
/**
 * decisionEngine.js
 *
 * Lote 5 — Decision Utility + Contextual Bandit leve
 *
 * Objetivo:
 * - rankear tópicos/tarefas por utilidade esperada;
 * - combinar fraqueza, incerteza, evidência, recência, prioridade e custo;
 * - permitir exploração opcional via Thompson Sampling aproximado;
 * - criar base para aprendizado futuro com recompensas.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGaussianSampler(rng) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = rng();
    let v = rng();

    while (u === 0) u = rng();
    while (v === 0) v = rng();

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * v);
    const z1 = magnitude * Math.sin(2.0 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

/**
 * Amostra aproximada de uma distribuição Beta.
 * Usa aproximação normal, suficiente para exploração leve.
 */
function sampleBeta(alpha, beta, rng, gaussianSampler) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));

  const gaussian = typeof gaussianSampler === 'function'
    ? gaussianSampler
    : createGaussianSampler(rng);

  const sampled = mean + gaussian() * sd;
  return clampFinite(sampled, 0, 1, mean);
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

const BANDIT_STORAGE_KEY = 'coach_decision_bandit_v1';

function loadBanditState() {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(BANDIT_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBanditState(state) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(BANDIT_STORAGE_KEY, JSON.stringify(state || {}));
  } catch {
    // ignore storage errors
  }
}

/**
 * Calcula utilidade de decisão para um candidato.
 *
 * Candidato pode ser tópico ou tarefa.
 */
export function computeDecisionUtility(candidate = {}, options = {}) {
  const weakness = clampFinite(candidate.weakness, 0, 1, 0.5);
  const uncertainty = clampFinite(candidate.uncertainty, 0, 1, 0.35);
  const evidence = clampFinite(candidate.evidence, 0, 1, 0);
  const recencyDays = clampFinite(candidate.recencyDays, 0, 180, 21);
  const errorRate = clampFinite(candidate.errorRate, 0, 1, 0);
  const weight = clampFinite(candidate.weight, 1, 10, 5);
  const costMinutes = clampFinite(candidate.costMinutes, 0, 480, 30);
  const fatigue = clampFinite(candidate.fatigue, 0, 100, 100);

  let priorityScore = clampFinite(candidate.priorityValue, 0, 1, NaN);

  if (!Number.isFinite(priorityScore)) {
    const priority = String(candidate.priority || '').toLowerCase();

    if (priority === 'high') priorityScore = 1;
    else if (priority === 'medium') priorityScore = 0.55;
    else if (priority === 'low') priorityScore = 0.2;
    else priorityScore = 0.45;
  }

  let mcRiskScore = 0.35;

  const mcRisk = String(candidate.mcRisk || '').toLowerCase();
  if (mcRisk === 'critical') mcRiskScore = 1;
  else if (mcRisk === 'elevated_global_risk') mcRiskScore = 0.7;
  else if (mcRisk === 'moderate') mcRiskScore = 0.4;
  else if (mcRisk === 'safe') mcRiskScore = 0.08;

  const weightFactor = (weight - 1) / 9;
  const recencyRisk = 1 - Math.exp(-recencyDays / 15);

  const evidenceQuality =
    evidence * 0.7 +
    (1 - uncertainty) * 0.3;

  // Pesques padrão.
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 100, 36);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 100, 10);
  const evidenceWeight = clampFinite(options.evidenceWeight, 0, 100, 10);
  const priorityWeight = clampFinite(options.priorityWeight, 0, 100, 18);
  const recencyWeight = clampFinite(options.recencyWeight, 0, 100, 10);
  const errorWeight = clampFinite(options.errorWeight, 0, 100, 8);
  const riskWeight = clampFinite(options.riskWeight, 0, 100, 8);
  const weightWeight = clampFinite(options.weightWeight, 0, 100, 6);

  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight +
    evidenceQuality * evidenceWeight +
    priorityScore * priorityWeight +
    recencyRisk * recencyWeight +
    errorRate * errorWeight +
    mcRiskScore * riskWeight +
    weightFactor * weightWeight;

  const costPenalty = (costMinutes / 240) * 8;
  const fatiguePenalty = (1 - fatigue / 100) * 12;

  const utility = clampFinite(
    baseUtility - costPenalty - fatiguePenalty,
    0,
    100,
    0
  );

  return {
    utility: Number(utility.toFixed(2)),
    components: {
      weakness: Number(weakness.toFixed(4)),
      uncertainty: Number(uncertainty.toFixed(4)),
      evidence: Number(evidence.toFixed(4)),
      evidenceQuality: Number(evidenceQuality.toFixed(4)),
      priorityScore: Number(priorityScore.toFixed(4)),
      recencyRisk: Number(recencyRisk.toFixed(4)),
      errorRate: Number(errorRate.toFixed(4)),
      mcRiskScore: Number(mcRiskScore.toFixed(4)),
      weightFactor: Number(weightFactor.toFixed(4)),
      costPenalty: Number(costPenalty.toFixed(4)),
      fatiguePenalty: Number(fatiguePenalty.toFixed(4)),
    },
  };
}

/**
 * Retorna posterior Beta para um candidato.
 * Usa histórico salvo + prior baseado na utilidade atual.
 */
export function getBanditPosterior(actionId, utility = 50) {
  const state = loadBanditState();
  const entry = state?.[String(actionId)] || {};

  const safeUtility = clampFinite(utility, 0, 100, 50);

  const priorAlpha = 1 + safeUtility / 25;
  const priorBeta = 1 + (100 - safeUtility) / 25;

  const successes = clampFinite(entry.alpha, 0, 10000, 0);
  const failures = clampFinite(entry.beta, 0, 10000, 0);

  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
    successes,
    failures,
    trials: successes + failures,
  };
}

/**
 * Registra recompensa de uma ação.
 *
 * reward:
 * - true / 1 = ação útil;
 * - false / 0 = ação não útil;
 * - 0..1 = recompensa parcial.
 */
export function recordDecisionOutcome(actionId, reward, options = {}) {
  if (!actionId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadBanditState();
  const key = String(actionId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  entry.alpha = Math.min(maxCount, (entry.alpha || 0) + normalizedReward);
  entry.beta = Math.min(maxCount, (entry.beta || 0) + (1 - normalizedReward));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveBanditState(state);

  return entry;
}

/**
 * Limpa memória do bandit.
 */
export function clearDecisionBandit() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(BANDIT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Rankeia candidatos usando utilidade + exploração opcional.
 */
export function rankDecisionCandidates(candidates = [], options = {}) {
  const safeCandidates = Array.isArray(candidates)
    ? candidates.filter(Boolean)
    : Object.values(candidates || {}).filter(Boolean);

  if (safeCandidates.length === 0) return [];

  const seed = options.seed ?? `decision-${safeCandidates.length}`;
  const rng = mulberry32(hashSeed(seed));
  const gaussianSampler = createGaussianSampler(rng);

  const useBandit = options.useBandit === true;
  const explorationScale = clampFinite(options.explorationScale, 0, 100, 18);

  const enriched = safeCandidates.map((candidate, index) => {
    const decision = computeDecisionUtility(candidate, options);

    let explorationBonus = 0;
    let posterior = null;

    if (useBandit) {
      const actionId = String(
        candidate.id ?? candidate.name ?? `candidate-${index}`
      );

      posterior = getBanditPosterior(actionId, decision.utility);

      const sampledRewardProbability = sampleBeta(
        posterior.alpha,
        posterior.beta,
        rng,
        gaussianSampler
      );

      explorationBonus = sampledRewardProbability * explorationScale;
    }

    const decisionScore = decision.utility + explorationBonus;

    return {
      ...candidate,
      decision,
      posterior,
      explorationBonus: Number(explorationBonus.toFixed(2)),
      decisionScore: Number(decisionScore.toFixed(2)),
    };
  });

  return enriched.sort((a, b) => b.decisionScore - a.decisionScore);
}

export default {
  computeDecisionUtility,
  rankDecisionCandidates,
  getBanditPosterior,
  recordDecisionOutcome,
  clearDecisionBandit,
};

`

## src/engine/probabilistic/knowledgeGraph.js

`javascript
/**
 * knowledgeGraph.js
 *
 * Lote 7 — Knowledge Graph + PageRank para priorização estrutural de tópicos.
 *
 * Conceitos:
 * - edges: pré-requisito -> tópico dependente
 * - PageRank: mede importância estrutural do tópico
 * - prereqReadiness: quão pronto está o pré-requisito
 * - blockedBy: pré-requisitos fracos que bloqueiam o tópico
 *
 * Configuração global opcional:
 *
 * globalThis.__COACH_KNOWLEDGE_GRAPH__ = {
 *   "Matemática": {
 *     prerequisites: {
 *       "Derivadas": ["Funções", "Limites"],
 *       "Integração": ["Derivadas"]
 *     }
 *   }
 * };
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeGraphName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna o grafo configurado para uma categoria.
 */
export function getKnowledgeGraphForCategory(categoryName) {
  try {
    const root = globalThis.__COACH_KNOWLEDGE_GRAPH__;
    if (!root || typeof root !== 'object') return null;

    const target = normalizeGraphName(categoryName);

    const key = Object.keys(root).find(
      (k) => normalizeGraphName(k) === target
    );

    if (key) return root[key];

    return root.default || null;
  } catch {
    return null;
  }
}

/**
 * Calcula métricas de grafo para tópicos.
 *
 * @param {Array<Object>} topics
 * Exemplo:
 * [
 *   { name: 'Funções', proficiency: 0.75, evidence: 0.8 },
 *   { name: 'Derivadas', proficiency: 0.35, evidence: 0.6 }
 * ]
 *
 * @param {Object} graphConfig
 * Exemplo:
 * {
 *   prerequisites: {
 *     "Derivadas": ["Funções", "Limites"]
 *   }
 * }
 *
 * @param {Object} options
 */
export function computeTopicGraphMetrics(topics = [], graphConfig = {}, options = {}) {
  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  if (safeTopics.length === 0) {
    return {
      global: {
        nodeCount: 0,
        edgeCount: 0,
      },
      topics: [],
    };
  }

  const displayName = new Map();
  const proficiency = new Map();
  const evidence = new Map();

  safeTopics.forEach((topic, index) => {
    const norm = normalizeGraphName(topic?.name ?? `topic-${index}`);

    displayName.set(norm, String(topic?.name ?? norm));

    const rawProficiency = Number(topic?.proficiency);
    const rawPercentage = Number(topic?.percentage);

    let safeProficiency = 0.25;

    if (Number.isFinite(rawProficiency)) {
      safeProficiency = clampFinite(rawProficiency, 0, 1, 0.25);
    } else if (Number.isFinite(rawPercentage)) {
      safeProficiency = clampFinite(rawPercentage / 100, 0, 1, 0.25);
    }

    proficiency.set(norm, safeProficiency);

    const rawEvidence = Number(topic?.evidence);
    evidence.set(norm, Number.isFinite(rawEvidence) ? clampFinite(rawEvidence, 0, 1, 0) : 0);
  });

  const nodes = [...displayName.keys()];
  const nodeSet = new Set(nodes);

  const rawEdges = [];
  const prereqMap = new Map();

  nodes.forEach((node) => {
    prereqMap.set(node, []);
  });

  function addEdge(from, to, weight = 1) {
    const fromNorm = normalizeGraphName(from);
    const toNorm = normalizeGraphName(to);

    if (!fromNorm || !toNorm || fromNorm === toNorm) return;

    const safeWeight = Math.max(0.1, Number(weight) || 1);

    rawEdges.push({
      from: fromNorm,
      to: toNorm,
      weight: safeWeight,
    });

    if (nodeSet.has(toNorm)) {
      const current = prereqMap.get(toNorm) || [];
      if (!current.includes(fromNorm)) {
        current.push(fromNorm);
        prereqMap.set(toNorm, current);
      }
    }
  }

  // Formato 1: edges
  if (Array.isArray(graphConfig?.edges)) {
    graphConfig.edges.forEach((edge) => {
      addEdge(
        edge?.from ?? edge?.prerequisite,
        edge?.to ?? edge?.topic,
        edge?.weight
      );
    });
  }

  // Formato 2: prerequisites
  if (graphConfig?.prerequisites && typeof graphConfig.prerequisites === 'object') {
    Object.entries(graphConfig.prerequisites).forEach(([topic, prerequisites]) => {
      const list = Array.isArray(prerequisites)
        ? prerequisites
        : [prerequisites];

      list.forEach((prerequisite) => {
        addEdge(prerequisite, topic, 1);
      });
    });
  }

  const outgoing = new Map(nodes.map((node) => [node, []]));
  const incoming = new Map(nodes.map((node) => [node, []]));
  const outWeight = new Map(nodes.map((node) => [node, 0]));

  rawEdges.forEach((edge) => {
    if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) return;

    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);

    outWeight.set(
      edge.from,
      (outWeight.get(edge.from) || 0) + edge.weight
    );
  });

  const damping = clampFinite(options.damping, 0, 1, 0.85);
  const iterations = Math.round(clampFinite(options.iterations, 5, 100, 35));

  let pageRank = new Map(nodes.map((node) => [node, 1 / nodes.length]));

  for (let i = 0; i < iterations; i++) {
    const next = new Map(
      nodes.map((node) => [node, (1 - damping) / nodes.length])
    );

    nodes.forEach((node) => {
      const inbound = incoming.get(node) || [];

      inbound.forEach((edge) => {
        const weightFrom = outWeight.get(edge.from) || 0;
        if (weightFrom <= 0) return;

        const contribution =
          (pageRank.get(edge.from) || 0) * (edge.weight / weightFrom);

        next.set(node, (next.get(node) || 0) + damping * contribution);
      });
    });

    const sum = [...next.values()].reduce((acc, val) => acc + val, 0) || 1;

    nodes.forEach((node) => {
      next.set(node, (next.get(node) || 0) / sum);
    });

    pageRank = next;
  }

  let maxPageRank = 1e-9;
  for (const pr of pageRank.values()) {
    if (pr > maxPageRank) maxPageRank = pr;
  }
  const readinessThreshold = clampFinite(options.readinessThreshold, 0, 1, 0.6);

  const topicMetrics = nodes.map((node) => {
    const prerequisites = prereqMap.get(node) || [];

    let prereqReadiness = 1;
    let prereqGap = 0;
    const blockedBy = [];

    if (prerequisites.length > 0) {
      const values = prerequisites.map((prereq) => {
        return proficiency.get(prereq) ?? 0.35;
      });

      const sum = values.reduce((acc, val) => acc + val, 0);
      prereqReadiness = sum / values.length;

      prereqGap = Math.max(0, readinessThreshold - prereqReadiness);

      prerequisites.forEach((prereq, idx) => {
        const prereqProficiency = values[idx] ?? 0.35;
        if (prereqProficiency < readinessThreshold) {
          blockedBy.push(displayName.get(prereq) || prereq);
        }
      });
    }

    const rawPageRank = pageRank.get(node) || 0;
    const normalizedPageRank = rawPageRank / maxPageRank;

    return {
      name: displayName.get(node) || node,
      normalizedKey: node,
      pageRank: Number(rawPageRank.toFixed(6)),
      normalizedPageRank: Number(normalizedPageRank.toFixed(6)),
      graphImportance: Number(normalizedPageRank.toFixed(6)),
      indegree: (incoming.get(node) || []).length,
      outdegree: (outgoing.get(node) || []).length,
      prerequisiteCount: prerequisites.length,
      prereqReadiness: Number(prereqReadiness.toFixed(4)),
      prereqGap: Number(prereqGap.toFixed(4)),
      blockedBy,
    };
  });

  return {
    global: {
      nodeCount: nodes.length,
      edgeCount: rawEdges.filter(
        (edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to)
      ).length,
      damping,
      iterations,
    },
    topics: topicMetrics,
  };
}

export default {
  normalizeGraphName,
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
};

`

## src/engine/probabilistic/fsrs.js

`javascript
// src/engine/probabilistic/fsrs.js
// ============================================================================
// FSRS — Free Spaced Repetition Scheduler (núcleo probabilístico)
// Fonte única das fórmulas de retenção e intervalo usadas por diagnostics.js
// e coachLogic.js.
// Fórmula base: R(t, S) = (1 + t / (9 * S))^-1
// ============================================================================

/**
 * Retrievability FSRS: probabilidade de lembrança após `daysSince` dias.
 * R(t, S) = (1 + t / (9 * S))^-1
 * @param {number} daysSince - dias desde a última revisão/estudo
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @returns {number} retenção em [0, 1]
 */
export function fsrsRetrievability(daysSince, stabilityDays) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const t = Math.max(0, Number(daysSince) || 0);
  const r = Math.pow(1 + t / (9 * S), -1);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}

/**
 * Intervalo que produz a retenção-alvo R.
 * Derivado de R = (1 + t/(9S))^-1  =>  t = 9 * S * (1/R - 1)
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @param {number} targetRetention - retenção desejada (padrão 0.7)
 * @returns {number} intervalo em dias (inteiro, mínimo 1)
 */
export function fsrsIntervalForRetention(stabilityDays, targetRetention = 0.7) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  const interval = 9 * S * ((1 / R) - 1);
  return Number.isFinite(interval) ? Math.max(1, Math.round(interval)) : 1;
}

/**
 * Estimativa FSRS por tópico individual.
 * Usa histórico de scores + dias desde a última revisão para calcular
 * estabilidade, retenção atual e próximo intervalo de revisão.
 *
 * Consumidor: coachLogic.js → topic.fsrs = estimateTopicFsrs(...)
 *   usa topic.fsrs.retentionPct e topic.fsrs.due
 *
 * @param {Object} topic - { name, scores, lastSeen, daysSince, total, percentage }
 * @param {Object} options - { maxScore, desiredRetention }
 * @returns {Object|null}
 */
export function estimateTopicFsrs(topic, options = {}) {
  if (!topic) return null;

  const desiredRetention = Math.max(0.5, Math.min(0.95, Number(options.desiredRetention) || 0.85));

  const scores = (topic.scores || [])
    .map(s => Number(s.score))
    .filter(Number.isFinite);
  if (scores.length === 0) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;
  const sd = Math.sqrt(Math.max(0, variance));

  // ✅ LOTE-06 FIX (FSRS-1): scores são PERCENTUAIS [0-100], não pontos absolutos.
  // Dividir por maxScore (que pode ser 1000 no ENEM) distorcia a estabilidade
  // em 10x: consistencyFactor ia para ~1.0 e o Coach parava de gerar revisões.
  const SCORE_SCALE = 100;
  const consistencyFactor = Math.max(0.1, 1 - (sd / SCORE_SCALE));
  const performanceFactor = Math.max(0.1, mean / SCORE_SCALE);
  const baseStability = 3 + (14 * consistencyFactor * performanceFactor * Math.min(1, scores.length / 5));

  const stability = Math.max(1, Math.min(180, baseStability));
  const daysSince = Math.max(0, Number(topic.daysSince) || 0);
  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;
  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);
  const due = daysSince >= optimalIntervalDays * 0.8;

  return {
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    due,
    daysSince: Number(daysSince.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

/**
 * Boost FSRS por categoria (agregado de todo o histórico).
 * Usado pelo Coach para calcular o SRS boost de urgência.
 *
 * Consumidor: coachLogic.js → estimateCategoryFsrsBoost(history, {daysSince, maxScore, cfg, desiredRetention})
 *   usa o retorno como { boost, label }
 *
 * @param {Array} history - histórico de simulados da categoria
 * @param {Object} options - { daysSince, maxScore, cfg, desiredRetention }
 * @returns {Object|null} { boost, label, retentionPct, stabilityDays, ... }
 */
export function estimateCategoryFsrsBoost(history, options = {}) {
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  if (safeHistory.length === 0) return null;

  const cfg = options.cfg || {};
  const maxScore = Math.max(1, Number(options.maxScore) || 100);
  const desiredRetention = Math.max(0.5, Math.min(0.95, Number(options.desiredRetention) || 0.85));
  const daysSince = Math.max(0, Number(options.daysSince) || 0);

  const scores = safeHistory
    .map(h => Number(h?.score ?? h?.value))
    .filter(Number.isFinite);
  if (scores.length === 0) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;
  const sd = Math.sqrt(Math.max(0, variance));

  const consistencyFactor = Math.max(0.1, 1 - (sd / maxScore));
  const performanceFactor = Math.max(0.1, mean / maxScore);
  const baseStability = 3 + (14 * consistencyFactor * performanceFactor * Math.min(1, scores.length / 5));

  const stability = Math.max(1, Math.min(180, baseStability));
  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;
  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);

  if (retentionPct < 75) {
    const intensity = Math.pow((75 - retentionPct) / 75, 1.2);
    const boost = (Number(cfg.SRS_BOOST) || 16) * 2.0 * intensity;
    let label;
    if (retentionPct < 30) {
      label = '⚠️ Memória Crítica (FSRS)';
    } else if (retentionPct < 55) {
      label = '🧠 Revisão Necessária (FSRS)';
    } else {
      label = '🔄 Revisão de Reforço (FSRS)';
    }
    return {
      boost: Number(boost.toFixed(4)),
      label,
      retentionPct: Number(retentionPct.toFixed(2)),
      stabilityDays: Number(stability.toFixed(2)),
      optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
      nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
      model: 'fsrs_power_law',
    };
  }

  return {
    boost: 0,
    label: null,
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

export default {
  fsrsRetrievability,
  fsrsIntervalForRetention,
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
};

`

## src/engine/causal/upliftModel.js

`javascript
/**
 * upliftModel.js
 *
 * Lote 11 — Causal Uplift Engine
 *
 * Estima o efeito causal de ações de estudo usando dados observacionais.
 *
 * Métodos:
 * - naive uplift;
 * - regression adjustment;
 * - IPTW (Inverse Probability of Treatment Weighting);
 * - Doubly Robust estimation;
 * - bootstrap opcional para intervalo de confiança.
 */

const CAUSAL_MODEL_KEY = 'coach_causal_model_v1';

export const DEFAULT_CAUSAL_COVARIATES = [
  'baselineScore',
  'volatility',
  'daysSince',
  'weight',
  'uncertainty',
];

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function meanValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return 0;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function sdValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length < 2) return 0;

  const mean = meanValues(finite);

  const variance =
    finite.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    (finite.length - 1);

  return Math.sqrt(Math.max(0, variance));
}

function sigmoid(z) {
  const safeZ = clampFinite(z, -35, 35, 0);

  if (safeZ > 30) return 1;
  if (safeZ < -30) return 0;

  return 1 / (1 + Math.exp(-safeZ));
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);

  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Resolve sistema linear Ax = b usando eliminação gaussiana com pivoteamento.
 */
function solveLinearSystem(A, b) {
  const n = A.length;

  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotValue = Math.abs(M[col][col]);

    for (let row = col + 1; row < n; row++) {
      const currentValue = Math.abs(M[row][col]);

      if (currentValue > pivotValue) {
        pivotValue = currentValue;
        pivotRow = row;
      }
    }

    if (pivotValue < 1e-12) {
      continue;
    }

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];

    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;

      const factor = M[row][col];

      if (Math.abs(factor) < 1e-15) continue;

      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row, i) => {
    const diag = row[i];
    return Math.abs(diag) < 1e-12 ? 0 : row[n];
  });
}

/**
 * Regressão linear com ridge.
 *
 * X deve conter intercepto na primeira coluna.
 */
function fitLinearRegression(X, y, ridge = 1e-3) {
  const n = X.length;

  if (n === 0) return [];

  const p = X[0].length;

  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    const row = X[i];

    for (let j = 0; j < p; j++) {
      Xty[j] += row[j] * y[i];

      for (let k = 0; k < p; k++) {
        XtX[j][k] += row[j] * row[k];
      }
    }
  }

  for (let j = 0; j < p; j++) {
    // Não regularizar o intercepto.
    if (j > 0) {
      XtX[j][j] += ridge;
    }
  }

  return solveLinearSystem(XtX, Xty);
}

function predictLinear(coefficients, row) {
  if (!Array.isArray(coefficients) || !Array.isArray(row)) return 0;

  let sum = 0;

  for (let i = 0; i < Math.min(coefficients.length, row.length); i++) {
    sum += coefficients[i] * row[i];
  }

  return sum;
}

/**
 * Prepara eventos causais.
 *
 * Evento esperado:
 * {
 *   treated: boolean | 0 | 1,
 *   outcomeDelta: number,
 *   baselineScore: number,
 *   volatility: number,
 *   daysSince: number,
 *   weight: number,
 *   uncertainty: number,
 *   actionType: string
 * }
 */
export function prepareCausalEvents(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const rawEvents = safeArray(events)
    .map((event, index) => {
      const treatedRaw =
        event?.treated ??
        event?.completed ??
        event?.treatment ??
        event?.isTreated ??
        0;

      const treated =
        treatedRaw === true ||
        treatedRaw === 1 ||
        treatedRaw === '1' ||
        treatedRaw === 'true'
          ? 1
          : 0;

      const outcomeDelta = toFinite(event?.outcomeDelta, NaN);

      if (!Number.isFinite(outcomeDelta)) return null;

      const normalized = {
        id: event?.id || `causal-event-${index}`,
        timestamp: toFinite(event?.timestamp, Date.now()),
        treated,
        outcomeDelta: clampFinite(outcomeDelta, -maxScore, maxScore, 0),
        actionType: String(event?.actionType || event?.type || 'global'),
      };

      covariates.forEach((key) => {
        normalized[key] = toFinite(event?.[key], NaN);
      });

      return normalized;
    })
    .filter(Boolean);

  if (rawEvents.length === 0) return [];

  // Preenche covariáveis ausentes com média observada.
  covariates.forEach((key) => {
    const observed = rawEvents
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const fillValue = observed.length > 0 ? meanValues(observed) : 0;

    rawEvents.forEach((event) => {
      if (!Number.isFinite(event[key])) {
        event[key] = fillValue;
      }
    });
  });

  return rawEvents;
}

/**
 * Uplift naive: média dos tratados - média dos controles.
 */
export function estimateNaiveUplift(events = []) {
  const safeEvents = safeArray(events).filter(
    (event) => Number.isFinite(event?.outcomeDelta)
  );

  if (safeEvents.length === 0) {
    return {
      method: 'naive',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treated = safeEvents.filter((event) => event.treated === 1);
  const control = safeEvents.filter((event) => event.treated === 0);

  const treatedMean = meanValues(treated.map((event) => event.outcomeDelta));
  const controlMean = meanValues(control.map((event) => event.outcomeDelta));

  return {
    method: 'naive',
    uplift: Number((treatedMean - controlMean).toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount: treated.length,
    controlCount: control.length,
    diagnostics: {
      treatedMean: Number(treatedMean.toFixed(6)),
      controlMean: Number(controlMean.toFixed(6)),
    },
  };
}

function computeStandardizers(events, covariates) {
  return covariates.map((key) => {
    const values = events
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const mean = values.length > 0 ? meanValues(values) : 0;
    const sd = values.length > 1 ? sdValues(values) : 1;

    return {
      key,
      mean,
      sd: Math.max(1e-6, sd),
    };
  });
}

function covariateVector(event, standardizers) {
  return standardizers.map((standardizer) => {
    const raw = toFinite(event?.[standardizer.key], standardizer.mean);
    return (raw - standardizer.mean) / standardizer.sd;
  });
}

/**
 * Uplift ajustado por regressão linear.
 */
export function estimateRegressionAdjustedUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 8 || treatedCount < 2 || controlCount < 2) {
    return {
      ...naive,
      method: 'naive_fallback_regression',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const X = safeEvents.map((event) => {
    return [
      1,
      event.treated,
      ...covariateVector(event, standardizers),
    ];
  });

  const y = safeEvents.map((event) => event.outcomeDelta);

  const coefficients = fitLinearRegression(X, y, options.ridge ?? 1e-3);

  const uplift = coefficients[1] || 0;

  return {
    method: 'regression_adjusted',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      coefficients: coefficients.map((c) => Number(c.toFixed(6))),
      covariates: ['intercept', 'treatment', ...covariates],
    },
  };
}

/**
 * Propensity score via regressão logística simples com gradiente descendente.
 */
function fitPropensityScores(events, standardizers, options = {}) {
  const treatedCount = events.filter((e) => e.treated === 1).length;
  const controlCount = events.length - treatedCount;

  const pTreat =
    events.length > 0
      ? clampFinite(treatedCount / events.length, 0.01, 0.99, 0.5)
      : 0.5;

  if (treatedCount === 0 || controlCount === 0) {
    return {
      probabilities: events.map(() => pTreat),
      pTreat,
    };
  }

  const p = standardizers.length;
  const weights = new Array(p + 1).fill(0);

  const iterations = Math.round(clampFinite(options.iterations, 20, 1000, 220));
  const learningRate = clampFinite(options.learningRate, 1e-4, 1, 0.05);
  const l2 = clampFinite(options.l2, 0, 1, 1e-3);

  const X = events.map((event) => [1, ...covariateVector(event, standardizers)]);
  const y = events.map((event) => event.treated);

  for (let iter = 0; iter < iterations; iter++) {
    const gradient = new Array(p + 1).fill(0);

    for (let i = 0; i < X.length; i++) {
      const row = X[i];

      let z = 0;
      for (let j = 0; j < row.length; j++) {
        z += weights[j] * row[j];
      }

      const pred = sigmoid(z);
      const error = pred - y[i];

      for (let j = 0; j < row.length; j++) {
        gradient[j] += error * row[j];
      }
    }

    for (let j = 0; j < weights.length; j++) {
      const regularization = j === 0 ? 0 : l2 * weights[j];
      weights[j] -= learningRate * (gradient[j] / X.length + regularization);
    }
  }

  const probabilities = X.map((row) => {
    let z = 0;

    for (let j = 0; j < row.length; j++) {
      z += weights[j] * row[j];
    }

    return clampFinite(sigmoid(z), 0.02, 0.98, pTreat);
  });

  return {
    probabilities,
    pTreat,
    weights,
  };
}

/**
 * IPTW uplift.
 */
export function estimateIPTWUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 10 || treatedCount < 3 || controlCount < 3) {
    return {
      ...naive,
      method: 'naive_fallback_iptw',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const pTreat = propensity.pTreat;

  let weightedTreatedSum = 0;
  let weightedTreatedWeight = 0;

  let weightedControlSum = 0;
  let weightedControlWeight = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    if (event.treated === 1) {
      const weight = clampFinite(pTreat / e, 0.05, 20, 1);
      weightedTreatedSum += event.outcomeDelta * weight;
      weightedTreatedWeight += weight;
    } else {
      const weight = clampFinite((1 - pTreat) / (1 - e), 0.05, 20, 1);
      weightedControlSum += event.outcomeDelta * weight;
      weightedControlWeight += weight;
    }
  });

  const weightedTreatedMean =
    weightedTreatedWeight > 0
      ? weightedTreatedSum / weightedTreatedWeight
      : 0;

  const weightedControlMean =
    weightedControlWeight > 0
      ? weightedControlSum / weightedControlWeight
      : 0;

  const uplift = weightedTreatedMean - weightedControlMean;

  return {
    method: 'iptw',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      weightedTreatedMean: Number(weightedTreatedMean.toFixed(6)),
      weightedControlMean: Number(weightedControlMean.toFixed(6)),
      pTreat: Number(pTreat.toFixed(6)),
    },
  };
}

/**
 * Doubly Robust uplift.
 */
export function estimateDoublyRobustUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxOutcome = clampFinite(
    options.maxOutcome ?? options.maxScore,
    1,
    1_000_000,
    100
  );

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 12 || treatedCount < 4 || controlCount < 4) {
    return estimateRegressionAdjustedUplift(safeEvents, options);
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const X = safeEvents.map((event) => [
    1,
    event.treated,
    ...covariateVector(event, standardizers),
  ]);

  const y = safeEvents.map((event) => event.outcomeDelta);

  const outcomeCoefficients = fitLinearRegression(
    X,
    y,
    options.ridge ?? 1e-3
  );

  let sumDR = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    const covariatesRow = covariateVector(event, standardizers);

    const mu1 = predictLinear(outcomeCoefficients, [1, 1, ...covariatesRow]);
    const mu0 = predictLinear(outcomeCoefficients, [1, 0, ...covariatesRow]);

    const observed = event.outcomeDelta;

    let drScore = mu1 - mu0;

    if (event.treated === 1) {
      drScore += (observed - mu1) / e;
    } else {
      drScore -= (observed - mu0) / (1 - e);
    }

    drScore = clampFinite(drScore, -maxOutcome, maxOutcome, 0);

    sumDR += drScore;
  });

  const uplift = safeEvents.length > 0 ? sumDR / safeEvents.length : 0;

  return {
    method: 'doubly_robust',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      pTreat: Number(propensity.pTreat.toFixed(6)),
      meanDRScore: Number(uplift.toFixed(6)),
    },
  };
}

/**
 * Estimador principal.
 */
export function estimateCausalUplift(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const safeEvents = prepareCausalEvents(events, {
    ...options,
    covariates,
  });

  if (safeEvents.length === 0) {
    return {
      method: 'none',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  let method = options.method || 'auto';

  if (method === 'auto') {
    if (
      safeEvents.length >= 30 &&
      treatedCount >= 10 &&
      controlCount >= 10
    ) {
      method = 'doubly_robust';
    } else if (
      safeEvents.length >= 12 &&
      treatedCount >= 3 &&
      controlCount >= 3
    ) {
      method = 'regression_adjusted';
    } else {
      method = 'naive';
    }
  }

  let estimate = null;

  if (method === 'doubly_robust') {
    estimate = estimateDoublyRobustUplift(safeEvents, options);
  } else if (method === 'iptw') {
    estimate = estimateIPTWUplift(safeEvents, options);
  } else if (method === 'regression_adjusted') {
    estimate = estimateRegressionAdjustedUplift(safeEvents, options);
  } else {
    estimate = estimateNaiveUplift(safeEvents);
  }

  if (!estimate || !Number.isFinite(estimate.uplift)) {
    estimate = estimateNaiveUplift(safeEvents);
  }

  let ci = null;

  const bootstrapIterations = Math.round(
    clampFinite(options.bootstrapIterations, 0, 1000, 0)
  );

  if (bootstrapIterations > 0 && safeEvents.length >= 8) {
    const seed = options.seed ?? `causal-bootstrap-${safeEvents.length}`;
    const rng = mulberry32(hashSeed(seed));

    const bootstrapEstimates = [];

    for (let i = 0; i < bootstrapIterations; i++) {
      const sample = [];

      for (let j = 0; j < safeEvents.length; j++) {
        const idx = Math.floor(rng() * safeEvents.length);
        sample.push(safeEvents[idx]);
      }

      try {
        let sampleEstimate = null;

        if (method === 'doubly_robust') {
          sampleEstimate = estimateDoublyRobustUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'iptw') {
          sampleEstimate = estimateIPTWUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'regression_adjusted') {
          sampleEstimate = estimateRegressionAdjustedUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else {
          sampleEstimate = estimateNaiveUplift(sample);
        }

        if (Number.isFinite(sampleEstimate?.uplift)) {
          bootstrapEstimates.push(sampleEstimate.uplift);
        }
      } catch {
        // ignore bootstrap sample failures
      }
    }

    if (bootstrapEstimates.length >= 10) {
      const sorted = [...bootstrapEstimates].sort((a, b) => a - b);

      ci = {
        low: Number(quantileSorted(sorted, 0.025).toFixed(6)),
        high: Number(quantileSorted(sorted, 0.975).toFixed(6)),
        iterations: bootstrapEstimates.length,
      };
    }
  }

  return {
    ...estimate,
    ci,
    covariates,
  };
}

/**
 * Estima uplift por tipo de ação.
 */
export function estimateUpliftByAction(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);

  const minSamplesPerAction = Math.round(
    clampFinite(options.minSamplesPerAction, 3, 200, 8)
  );

  const groups = {};

  safeEvents.forEach((event) => {
    const actionType = event.actionType || 'global';

    if (!groups[actionType]) {
      groups[actionType] = [];
    }

    groups[actionType].push(event);
  });

  const actions = {};

  Object.entries(groups).forEach(([actionType, groupEvents]) => {
    if (groupEvents.length < minSamplesPerAction) return;

    actions[actionType] = estimateCausalUplift(groupEvents, {
      ...options,
      bootstrapIterations:
        options.bootstrapActions === true
          ? options.bootstrapIterations ?? 80
          : 0,
    });
  });

  const global =
    safeEvents.length >= minSamplesPerAction
      ? estimateCausalUplift(safeEvents, options)
      : estimateNaiveUplift(safeEvents);

  return {
    global,
    actions,
    sampleSize: safeEvents.length,
    actionCounts: Object.fromEntries(
      Object.entries(groups).map(([actionType, groupEvents]) => [
        actionType,
        groupEvents.length,
      ])
    ),
  };
}

/**
 * Normaliza uplift para escala de decisão.
 */
export function normalizeCausalUplift(uplift, maxScore = 100) {
  const safeMaxScore = clampFinite(maxScore, 1, 1_000_000, 100);
  const safeUplift = toFinite(uplift, 0);

  const scale = safeMaxScore * 0.15;

  return clampFinite(0.5 + safeUplift / scale, 0, 1, 0.5);
}

/**
 * Salva modelo causal.
 */
export function saveCausalModel(model) {
  try {
    localStorage.setItem(CAUSAL_MODEL_KEY, JSON.stringify(model || {}));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega modelo causal.
 */
export function loadCausalModel() {
  try {
    const raw = localStorage.getItem(CAUSAL_MODEL_KEY);
    const parsed = JSON.parse(raw || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Limpa modelo causal.
 */
export function clearCausalModel() {
  try {
    localStorage.removeItem(CAUSAL_MODEL_KEY);
  } catch {
    // ignore
  }
}

export default {
  DEFAULT_CAUSAL_COVARIATES,
  prepareCausalEvents,
  estimateNaiveUplift,
  estimateRegressionAdjustedUplift,
  estimateIPTWUplift,
  estimateDoublyRobustUplift,
  estimateCausalUplift,
  estimateUpliftByAction,
  normalizeCausalUplift,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
};

`

## src/engine/causal/policyEngine.js

`javascript
/**
 * policyEngine.js
 *
 * Lote 11 — Personalized Policy Engine
 *
 * Usa uplift causal para personalizar recomendações.
 */

import { normalizeCausalUplift } from './upliftModel.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Infere tipo de ação a partir do texto.
 */
export function inferActionType(text = '') {
  const s = String(text || '').toLowerCase();

  if (/agilidade|cronômetro|cronometro|tempo|velocidade/.test(s)) {
    return 'agility_training';
  }

  if (/revisão espaçada|revisao espacada|srs|flashcard|memória|memoria|retenção|retencao/.test(s)) {
    return 'srs_review';
  }

  if (/simulado|prova|mock|exame/.test(s)) {
    return 'mock_exam';
  }

  if (/revisão geral|revisao geral|geral|manutenção|manutencao/.test(s)) {
    return 'general_review';
  }

  if (/questões|questoes|exercícios|exercicios|prática|pratica|bateria/.test(s)) {
    return 'weak_topic_practice';
  }

  return 'weak_topic_practice';
}

/**
 * Converte tópicos fracos em candidatos de ação.
 */
export function candidatesFromWeakTopics(topics = [], category = {}, options = {}) {
  const safeTopics = Array.isArray(topics) ? topics : Object.values(topics || {});
  const maxTopics = Math.round(clampFinite(options.maxTopics, 1, 30, 8));

  return safeTopics
    .filter(Boolean)
    .slice(0, maxTopics)
    .map((topic, index) => {
      const rawProficiency = Number.isFinite(topic.bayesianProficiency)
        ? topic.bayesianProficiency
        : Number.isFinite(topic.percentage)
          ? topic.percentage
          : 50;

      const weakness = clampFinite(1 - rawProficiency / 100, 0, 1, 0.5);

      const uncertainty = Number.isFinite(topic.bayesianUncertainty)
        ? topic.bayesianUncertainty
        : topic.isUntested
          ? 0.8
          : 0.35;

      const evidence = Number.isFinite(topic.bayesianEvidence)
        ? topic.bayesianEvidence
        : clampFinite((topic.total || 0) / ((topic.total || 0) + 10), 0, 1, 0);

      return {
        id: `topic:${category?.id || 'category'}:${topic.name || index}`,
        type: 'weak_topic_practice',
        name: topic.name || `Tópico ${index + 1}`,
        categoryId: category?.id || null,
        categoryName: category?.name || null,
        decisionUtility: Number.isFinite(topic.decisionUtility)
          ? topic.decisionUtility
          : clampFinite((topic.urgencyScore || 0) / 2, 0, 100, 40),
        features: {
          weakness,
          uncertainty,
          evidence,
          recencyDays: Number.isFinite(topic.daysSince) ? topic.daysSince : 21,
          costMinutes: Number.isFinite(topic.costMinutes) ? topic.costMinutes : 35,
          priority: topic.manualPriority >= 40 ? 'high' : 'medium',
          fsrsDue: Boolean(topic.srsDue),
        },
      };
    });
}

/**
 * Adiciona ações sistêmicas: SRS, agilidade, revisão geral, simulado crítico.
 */
export function addSystemActionCandidates(candidates = [], metrics = {}, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? [...candidates] : [];

  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;

  const hasType = (type) =>
    safeCandidates.some((candidate) => candidate?.type === type);

  if (metrics?.srsLabel && !hasType('srs_review')) {
    safeCandidates.push({
      id: `system:srs:${categoryId || 'global'}`,
      type: 'srs_review',
      name: 'Revisão Espaçada (SRS)',
      categoryId,
      categoryName,
      decisionUtility: 78,
      features: {
        weakness: 0.35,
        uncertainty: 0.25,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 25,
        priority: 'high',
        fsrsDue: true,
      },
    });
  }

  const avgSeconds = Number(metrics?.avgSeconds);

  if (Number.isFinite(avgSeconds) && avgSeconds > 150 && !hasType('agility_training')) {
    safeCandidates.push({
      id: `system:agility:${categoryId || 'global'}`,
      type: 'agility_training',
      name: 'Treino de Agilidade',
      categoryId,
      categoryName,
      decisionUtility: 65,
      features: {
        weakness: 0.30,
        uncertainty: 0.30,
        evidence: 0.65,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 30,
        priority: 'medium',
      },
    });
  }

  const probability = Number(metrics?.mcProbability);

  if (
    Number.isFinite(probability) &&
    probability < 35 &&
    !hasType('mock_exam')
  ) {
    safeCandidates.push({
      id: `system:critical-mock:${categoryId || 'global'}`,
      type: 'mock_exam',
      name: 'Simulado de Intervenção',
      categoryId,
      categoryName,
      decisionUtility: 82,
      features: {
        weakness: 0.55,
        uncertainty: 0.45,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 5,
        costMinutes: 90,
        priority: 'high',
      },
    });
  }

  if (!hasType('general_review')) {
    safeCandidates.push({
      id: `system:general-review:${categoryId || 'global'}`,
      type: 'general_review',
      name: 'Revisão Geral',
      categoryId,
      categoryName,
      decisionUtility: 48,
      features: {
        weakness: 0.30,
        uncertainty: 0.40,
        evidence: 0.5,
        recencyDays: metrics.daysSinceLastStudy ?? 10,
        costMinutes: 45,
        priority: 'medium',
      },
    });
  }

  return safeCandidates;
}

function getCausalEstimateForCandidate(candidate, causalModel) {
  if (!causalModel || typeof causalModel !== 'object') {
    return null;
  }

  const actions = causalModel.actions || {};

  return (
    actions[candidate?.type] ||
    actions.global ||
    causalModel.global ||
    null
  );
}

/**
 * Pontua candidatos combinando utilidade e uplift causal.
 */
export function scoreCandidatesWithCausal(candidates = [], causalModel = null, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const baseCausalWeight = clampFinite(options.causalWeight, 0, 0.85, 0.35);

  return safeCandidates
    .filter(Boolean)
    .map((candidate) => {
      const causalEstimate = getCausalEstimateForCandidate(candidate, causalModel);

      const uplift = Number.isFinite(causalEstimate?.uplift)
        ? causalEstimate.uplift
        : 0;

      const sampleSize = Number.isFinite(causalEstimate?.sampleSize)
        ? causalEstimate.sampleSize
        : Number.isFinite(causalEstimate?.diagnostics?.n)
          ? causalEstimate.diagnostics.n
          : 0;

      const evidenceFactor = sampleSize / (sampleSize + 20);

      const effectiveCausalWeight =
        baseCausalWeight * (0.25 + 0.75 * evidenceFactor);

      const causalScore = normalizeCausalUplift(uplift, maxScore) * 100;

      const baseUtility = clampFinite(candidate.decisionUtility, 0, 100, 40);

      const finalPolicyScore =
        baseUtility * (1 - effectiveCausalWeight) +
        causalScore * effectiveCausalWeight;

      return {
        ...candidate,
        causalUplift: Number(uplift.toFixed(4)),
        causalSampleSize: sampleSize,
        causalMethod: causalEstimate?.method || null,
        causalScore: Number(causalScore.toFixed(2)),
        effectiveCausalWeight: Number(effectiveCausalWeight.toFixed(4)),
        finalPolicyScore: Number(finalPolicyScore.toFixed(2)),
      };
    })
    .sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
}

/**
 * Seleciona ações personalizadas.
 */
export function selectPersonalizedActions(candidates = [], causalModel = null, options = {}) {
  let scored = scoreCandidatesWithCausal(candidates, causalModel, options);

  const healthStatus = String(options.healthStatus || '').toLowerCase();

  if (healthStatus === 'critical') {
    scored = scored.map((candidate) => {
      let adjustedScore = candidate.finalPolicyScore;

      if (candidate.type === 'mock_exam') {
        adjustedScore *= 0.75;
      }

      if (
        candidate.type === 'srs_review' ||
        candidate.type === 'general_review'
      ) {
        adjustedScore *= 1.08;
      }

      const costMinutes = Number(candidate?.features?.costMinutes) || 0;

      if (costMinutes > 75) {
        adjustedScore *= 0.85;
      }

      return {
        ...candidate,
        finalPolicyScore: Number(adjustedScore.toFixed(2)),
      };
    });

    scored.sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
  }

  const topK = Math.round(clampFinite(options.topK, 1, 30, 5));

  const selected = scored.slice(0, topK);

  return selected.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    rationale: `${candidate.type} | utilidade ${candidate.decisionUtility ?? 0} | uplift ${candidate.causalUplift} | evidência ${candidate.causalSampleSize}`,
    policy: {
      personalized: true,
      causalModelAvailable: Boolean(causalModel),
      healthStatus: healthStatus || 'unknown',
    },
  }));
}

/**
 * Gera relatório de política personalizada.
 */
export function buildPolicyReport(selectedActions = [], causalModel = null, options = {}) {
  const safeSelected = Array.isArray(selectedActions) ? selectedActions : [];

  return {
    generatedAt: Date.now(),
    maxScore: options.maxScore ?? 100,
    healthStatus: options.healthStatus || null,
    selectedActions,
    globalUplift: causalModel?.global?.uplift ?? null,
    actionUplifts: causalModel?.actions || {},
    sampleSize: causalModel?.sampleSize ?? null,
    recommendations: safeSelected.map((action) => ({
      rank: action.rank,
      id: action.id,
      name: action.name,
      type: action.type,
      score: action.finalPolicyScore,
      uplift: action.causalUplift,
      evidence: action.causalSampleSize,
      rationale: action.rationale,
    })),
  };
}

export default {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  scoreCandidatesWithCausal,
  selectPersonalizedActions,
  buildPolicyReport,
};

`

## src/engine/optimization/flagOptimizer.js

`javascript
/**
 * flagOptimizer.js
 *
 * Lote 10 — Meta Optimization & Auto Flags
 *
 * Responsável por:
 * - definir estratégias de flags;
 * - pontuar estratégias com base em avaliação e saúde;
 * - recomendar promoção/manutenção/rollback;
 * - aplicar flags com segurança;
 * - persistir configuração ativa.
 */

const OPTIMIZER_STATE_KEY = 'coach_flag_optimizer_state_v1';
const ACTIVE_FLAGS_KEY = 'coach_active_flags_v1';

export const EXPERIMENTAL_MATH_FLAGS = [
  'useStateSpace',
  'useStateSpaceAverage',
  'useStateSpaceTrend',

  'useDynamicVolatility',
  'useGarchVolatility',
  'useDynamicVolatilityOverride',

  'usePosteriorMonteCarlo',
  'usePosteriorMonteCarloOverride',

  'useBayesianTopics',
  'useBayesianTopicsForUrgency',

  'useDecisionUtility',
  'useDecisionUtilityForTopics',
  'useDecisionUtilityForBestTask',
  'useBanditPlanner',

  'useKnowledgeGraph',
  'useKnowledgeGraphForTopics',
  'useAdvancedFsrs',
  'useFsrsForSrsBoost',
  'useFsrsTopicScheduling',

  'useCausalUplift',
  'usePersonalizedPolicy',
  'useCausalTaskSelection',
  'useCausalBootstrap',
];

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function loadJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleBeta(alpha, beta, rng) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));

  const gaussian = () => {
    let u = rng();
    let v = rng();

    while (u === 0) u = rng();
    while (v === 0) v = rng();

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  return clampFinite(mean + gaussian() * sd, 0, 1, mean);
}

/**
 * Retorna a configuração segura de baseline.
 */
export function getSafeBaselineFeatures() {
  const safe = {};

  EXPERIMENTAL_MATH_FLAGS.forEach((flag) => {
    safe[flag] = false;
  });

  return safe;
}

/**
 * Carrega flags persistidas e aplica no globalThis.__COACH_FEATURES__.
 */
export function loadPersistedCoachFlags() {
  const persisted = loadJson(ACTIVE_FLAGS_KEY, null);

  if (persisted && typeof persisted === 'object') {
    globalThis.__COACH_FEATURES__ = {
      ...(globalThis.__COACH_FEATURES__ || {}),
      ...persisted,
    };
  }

  return globalThis.__COACH_FEATURES__ || {};
}

/**
 * Persiste flags ativas.
 */
export function persistCoachFlags(flags) {
  return saveJson(ACTIVE_FLAGS_KEY, flags || {});
}

/**
 * Espaço de estratégias.
 */
export function getStrategySpace() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior Monte Carlo',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'lot11-causal-policy',
      label: 'Lote 11 — Causal Uplift & Policy',
      features: {
        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
    {
      id: 'conservative',
      label: 'Conservador — Lotes 1 + 2',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'balanced',
      label: 'Equilibrado — Lotes 1 + 2 + 3 + 4',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
        usePosteriorMonteCarlo: true,
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'all-math-lots',
      label: 'Completo — Todos os lotes matemáticos',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,

        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
  ];
}

/**
 * Pontua uma estratégia com base em avaliação e saúde.
 */
export function scoreStrategyEvaluation(summary = {}, latestHealth = null, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const count = Math.max(0, Math.round(Number(summary?.count) || 0));

  const brier = clampFinite(summary?.probability?.avgBrier, 0, 1, NaN);

  const calibrationError = Number.isFinite(summary?.probability?.ece)
    ? summary.probability.ece
    : Number.isFinite(summary?.probability?.avgAbsoluteError)
      ? summary.probability.avgAbsoluteError
      : NaN;

  const mae = clampFinite(summary?.score?.mae, 0, maxScore, NaN);
  const ndcg = clampFinite(summary?.topics?.avgNdcg, 0, 1, NaN);
  const uplift = clampFinite(summary?.tasks?.avgUplift, -maxScore, maxScore, NaN);

  // Scores normalizados.
  const brierScore = Number.isFinite(brier)
    ? 1 - clampFinite(brier / 0.30, 0, 1, 1)
    : 0.35;

  const calibrationScore = Number.isFinite(calibrationError)
    ? 1 - clampFinite(calibrationError / 0.20, 0, 1, 1)
    : 0.35;

  const maeScore = Number.isFinite(mae)
    ? 1 - clampFinite(mae / (maxScore * 0.10), 0, 1, 1)
    : 0.35;

  const ndcgScore = Number.isFinite(ndcg)
    ? clampFinite(ndcg, 0, 1, 0.35)
    : 0.35;

  const upliftScore = Number.isFinite(uplift)
    ? 0.5 + clampFinite(uplift / (maxScore * 0.10), -0.5, 0.5, 0)
    : 0.5;

  const quality =
    brierScore * 0.35 +
    calibrationScore * 0.15 +
    maeScore * 0.20 +
    ndcgScore * 0.20 +
    upliftScore * 0.10;

  const healthScore = latestHealth?.healthScore != null
    ? clampFinite(latestHealth.healthScore, 0, 100, 80) / 100
    : 0.8;

  const sampleConfidence = count / (count + 10);

  const finalScore =
    (quality * 0.70 + healthScore * 0.30) *
    (0.45 + 0.55 * sampleConfidence);

  return {
    strategyId: summary?.strategyId ?? null,
    final: Number(finalScore.toFixed(6)),
    quality: Number(quality.toFixed(6)),
    healthScore: Number(healthScore.toFixed(4)),
    sampleConfidence: Number(sampleConfidence.toFixed(4)),
    components: {
      brierScore: Number(brierScore.toFixed(4)),
      calibrationScore: Number(calibrationScore.toFixed(4)),
      maeScore: Number(maeScore.toFixed(4)),
      ndcgScore: Number(ndcgScore.toFixed(4)),
      upliftScore: Number(upliftScore.toFixed(4)),
    },
  };
}

/**
 * Ranqueia estratégias.
 */
export function rankStrategies(summaries = {}, latestHealth = null, options = {}) {
  const strategySpace = Array.isArray(options.strategySpace)
    ? options.strategySpace
    : getStrategySpace();

  const ranked = strategySpace.map((strategy) => {
    const summary = summaries?.[strategy.id] || null;

    const evaluation = scoreStrategyEvaluation(
      summary
        ? {
            ...summary,
            strategyId: strategy.id,
          }
        : {
            count: 0,
            strategyId: strategy.id,
          },
      latestHealth,
      options
    );

    return {
      ...strategy,
      hasEvidence: Boolean(summary && Number(summary.count) > 0),
      score: summary ? evaluation.final : 0,
      evaluation,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Estado do otimizador para Thompson Sampling.
 */
export function loadOptimizerState() {
  const state = loadJson(OPTIMIZER_STATE_KEY, {});
  return state && typeof state === 'object' ? state : {};
}

export function saveOptimizerState(state) {
  return saveJson(OPTIMIZER_STATE_KEY, state || {});
}

export function clearOptimizerState() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(OPTIMIZER_STATE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Registra recompensa de uma estratégia.
 */
export function recordStrategyOutcome(strategyId, reward, options = {}) {
  if (!strategyId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadOptimizerState();
  const key = String(strategyId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  entry.alpha = Math.min(maxCount, (entry.alpha || 0) + normalizedReward);
  entry.beta = Math.min(maxCount, (entry.beta || 0) + (1 - normalizedReward));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveOptimizerState(state);

  return entry;
}

/**
 * Seleciona estratégia por Thompson Sampling.
 */
export function selectStrategyThompson(rankedStrategies = [], options = {}) {
  const safeRanked = Array.isArray(rankedStrategies)
    ? rankedStrategies.filter(Boolean)
    : [];

  if (safeRanked.length === 0) return 'baseline';

  const state = loadOptimizerState();

  const seed = options.seed ?? `optimizer-${Date.now()}`;
  const rng = mulberry32(hashSeed(seed));

  const sampled = safeRanked.map((strategy) => {
    const entry = state?.[strategy.id] || {};

    const baseScore = clampFinite(strategy.score, 0, 1, 0);

    const alpha =
      1 +
      (entry.alpha || 0) +
      baseScore * 5;

    const beta =
      1 +
      (entry.beta || 0) +
      (1 - baseScore) * 5;

    const sampledScore = sampleBeta(alpha, beta, rng);

    return {
      ...strategy,
      sampledScore,
    };
  });

  sampled.sort((a, b) => b.sampledScore - a.sampledScore);

  return sampled[0]?.id || 'baseline';
}

/**
 * Recomenda uma ação: keep, promote, rollback ou explore.
 */
export function recommendFlagConfig(input = {}) {
  const ranked = Array.isArray(input.ranked) ? input.ranked : [];

  const latestHealth = input.latestHealth || null;

  const currentFeatures =
    input.currentFeatures && typeof input.currentFeatures === 'object'
      ? input.currentFeatures
      : globalThis.__COACH_FEATURES__ || {};

  const minImprovement = clampFinite(input.minImprovement, 0, 1, 0.02);

  const baseline = ranked.find((strategy) => strategy.id === 'baseline') || null;
  const best = ranked[0] || null;

  // Rollback por saúde crítica.
  if (latestHealth?.status === 'critical' && input.allowRollback !== false) {
    return {
      action: 'rollback',
      strategyId: 'baseline',
      features: {},
      reason:
        'Health score crítico detectado. Recomendação automática: retornar ao baseline.',
      latestHealthScore: latestHealth?.healthScore ?? null,
      ranked: ranked.slice(0, 5),
    };
  }

  // Exploração opcional.
  if (input.exploration === true && ranked.length > 1) {
    const selectedId = selectStrategyThompson(ranked, input);

    if (selectedId && selectedId !== 'baseline') {
      const selectedStrategy = ranked.find((s) => s.id === selectedId);

      if (selectedStrategy) {
        return {
          action: 'explore',
          strategyId: selectedStrategy.id,
          features: selectedStrategy.features,
          reason:
            'Modo de exploração ativo. Estratégia selecionada por Thompson Sampling.',
          ranked: ranked.slice(0, 5),
        };
      }
    }
  }

  if (!best || !best.hasEvidence) {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: currentFeatures,
      reason: 'Sem evidência suficiente para promover mudança.',
      ranked: ranked.slice(0, 5),
    };
  }

  const baselineScore = baseline?.score ?? 0;

  if (best.id === 'baseline') {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: {},
      reason: 'O baseline é a melhor estratégia comprovada.',
      score: best.score,
      baselineScore,
      ranked: ranked.slice(0, 5),
    };
  }

  if (best.score < baselineScore + minImprovement) {
    return {
      action: 'keep',
      strategyId: best.id,
      features: currentFeatures,
      reason:
        'A estratégia candidata supera o baseline, mas a margem é insuficiente para justificar mudança.',
      score: best.score,
      baselineScore,
      minImprovement,
      ranked: ranked.slice(0, 5),
    };
  }

  return {
    action: 'promote',
    strategyId: best.id,
    features: best.features,
    reason: 'Estratégia candidata supera o baseline com margem mínima.',
    score: best.score,
    baselineScore,
    ranked: ranked.slice(0, 5),
  };
}

/**
 * Aplica recomendação de flags.
 *
 * Só aplica se:
 * - options.force === true; ou
 * - globalThis.__COACH_FEATURES__.useAutoFlagApplication === true.
 */
export function applyRecommendedFlags(recommendation, options = {}) {
  if (!recommendation || typeof recommendation !== 'object') return false;

  const allowAuto =
    options.force === true ||
    globalThis.__COACH_FEATURES__?.useAutoFlagApplication === true;

  if (!allowAuto) return false;

  if (recommendation.action === 'keep') return false;

  const current = globalThis.__COACH_FEATURES__ || {};
  const safeBaseline = getSafeBaselineFeatures();

  let next = { ...current };

  if (recommendation.action === 'rollback') {
    next = {
      ...next,
      ...safeBaseline,
    };
  } else if (recommendation.action === 'promote') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else if (recommendation.action === 'explore') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else {
    return false;
  }

  globalThis.__COACH_FEATURES__ = next;
  persistCoachFlags(next);

  return true;
}

export default {
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
};

`

## src/engine/optimization/autoTuner.js

`javascript
/**
 * autoTuner.js
 *
 * Lote 10 — Auto Tuner do Coach.
 *
 * Combina:
 * - avaliações do Lote 8;
 * - health snapshots do Lote 9;
 * - backtests salvos;
 * - flagOptimizer.
 */

import {
  rankStrategies,
  recommendFlagConfig,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
} from './flagOptimizer.js';

const TUNER_HISTORY_KEY = 'coach_auto_tuner_history_v1';
const BACKTEST_REPORT_KEY = 'coach_strategy_backtest_v1';
const EVALUATION_RESULTS_KEY = 'coach_evaluation_results_v1';
const MODEL_HEALTH_KEY = 'coach_model_health_v1';

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function loadJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return null;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

/**
 * Salva relatório de backtest para uso pelo AutoTuner.
 */
export function saveBacktestReport(report) {
  return saveJson(BACKTEST_REPORT_KEY, report || null);
}

/**
 * Carrega último relatório de backtest salvo.
 */
export function loadLastBacktestReport() {
  return loadJson(BACKTEST_REPORT_KEY, null);
}

/**
 * Carrega avaliações salvas pelo Lote 8.
 */
export function loadEvaluationResultsLocal() {
  const parsed = loadJson(EVALUATION_RESULTS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Carrega health snapshots salvos pelo Lote 9.
 */
export function loadHealthSnapshotsLocal() {
  const parsed = loadJson(MODEL_HEALTH_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Resume avaliações por estratégia quando não há backtest salvo.
 */
export function summarizeEvaluationsByStrategy(evaluations = []) {
  const safeEvaluations = Array.isArray(evaluations)
    ? evaluations.filter(Boolean)
    : [];

  const groups = {};

  safeEvaluations.forEach((evaluation) => {
    const strategyId = evaluation?.strategyId || 'unknown';

    if (!groups[strategyId]) {
      groups[strategyId] = {
        brier: [],
        logLoss: [],
        probabilityAbsoluteError: [],
        mae: [],
        ndcg: [],
        uplift: [],
      };
    }

    const group = groups[strategyId];

    const probability = evaluation?.probabilityEvaluation;

    if (probability) {
      if (Number.isFinite(probability.brier)) {
        group.brier.push(probability.brier);
      }

      if (Number.isFinite(probability.logLoss)) {
        group.logLoss.push(probability.logLoss);
      }

      if (Number.isFinite(probability.absoluteError)) {
        group.probabilityAbsoluteError.push(probability.absoluteError);
      }
    }

    const score = evaluation?.scoreEvaluation;

    if (score && Number.isFinite(score.absoluteError)) {
      group.mae.push(score.absoluteError);
    }

    const topics = evaluation?.topicEvaluation;

    if (topics && Number.isFinite(topics.ndcg)) {
      group.ndcg.push(topics.ndcg);
    }

    const uplift = evaluation?.taskUpliftEvaluation?.uplift;

    if (Number.isFinite(uplift)) {
      group.uplift.push(uplift);
    }
  });

  const summaries = {};

  Object.entries(groups).forEach(([strategyId, group]) => {
    const count = Math.max(
      group.brier.length,
      group.mae.length,
      group.ndcg.length,
      group.uplift.length,
      1
    );

    summaries[strategyId] = {
      count,
      probability: {
        avgBrier: meanValues(group.brier),
        avgLogLoss: meanValues(group.logLoss),
        avgAbsoluteError: meanValues(group.probabilityAbsoluteError),
      },
      score: {
        mae: meanValues(group.mae),
      },
      topics: {
        avgNdcg: meanValues(group.ndcg),
      },
      tasks: {
        avgUplift: meanValues(group.uplift),
      },
    };
  });

  return summaries;
}

/**
 * Salva histórico do AutoTuner.
 */
export function saveTunerHistory(report) {
  const current = loadJson(TUNER_HISTORY_KEY, []);
  const safeCurrent = Array.isArray(current) ? current : [];

  const next = [...safeCurrent, report].filter(Boolean).slice(-50);

  return saveJson(TUNER_HISTORY_KEY, next);
}

/**
 * Carrega histórico do AutoTuner.
 */
export function loadTunerHistory() {
  const parsed = loadJson(TUNER_HISTORY_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Executa um ciclo completo de auto-tuning.
 */
export function runAutoTunerCycle(options = {}) {
  loadPersistedCoachFlags();

  const evaluations = Array.isArray(options.evaluations)
    ? options.evaluations
    : loadEvaluationResultsLocal();

  const healthSnapshots = Array.isArray(options.healthSnapshots)
    ? options.healthSnapshots
    : loadHealthSnapshotsLocal();

  const latestHealth =
    healthSnapshots.length > 0
      ? healthSnapshots[healthSnapshots.length - 1]
      : null;

  const backtestReport =
    options.backtestReport !== undefined
      ? options.backtestReport
      : loadLastBacktestReport();

  let summaries = {};

  if (
    backtestReport &&
    backtestReport.summaries &&
    typeof backtestReport.summaries === 'object' &&
    Object.keys(backtestReport.summaries).length > 0
  ) {
    summaries = backtestReport.summaries;
  } else {
    summaries = summarizeEvaluationsByStrategy(evaluations);
  }

  const ranked = rankStrategies(summaries, latestHealth, {
    maxScore: options.maxScore ?? 100,
    strategySpace: options.strategySpace,
  });

  const recommendation = recommendFlagConfig({
    ranked,
    latestHealth,
    currentFeatures: globalThis.__COACH_FEATURES__ || {},
    minImprovement: options.minImprovement ?? 0.02,
    allowRollback: options.allowRollback !== false,
    exploration: options.exploration === true,
    seed: options.seed,
  });

  let applied = false;

  if (options.autoApply === true) {
    applied = applyRecommendedFlags(recommendation, {
      force: options.forceApply === true,
    });
  }

  const report = {
    generatedAt: Date.now(),
    mode: {
      autoApply: options.autoApply === true,
      forceApply: options.forceApply === true,
      exploration: options.exploration === true,
      allowRollback: options.allowRollback !== false,
    },
    inputs: {
      evaluationsCount: evaluations.length,
      healthSnapshotsCount: healthSnapshots.length,
      summariesCount: Object.keys(summaries).length,
      hasBacktestReport: Boolean(backtestReport),
    },
    latestHealth: latestHealth
      ? {
          healthScore: latestHealth.healthScore ?? null,
          status: latestHealth.status ?? null,
          alertsCount: Array.isArray(latestHealth.alerts)
            ? latestHealth.alerts.length
            : 0,
        }
      : null,
    ranked: ranked.map((strategy) => ({
      id: strategy.id,
      label: strategy.label,
      score: Number(strategy.score.toFixed(6)),
      hasEvidence: strategy.hasEvidence,
      evaluation: strategy.evaluation,
    })),
    recommendation: {
      action: recommendation.action,
      strategyId: recommendation.strategyId,
      reason: recommendation.reason,
      features: recommendation.features,
      score: recommendation.score ?? null,
      baselineScore: recommendation.baselineScore ?? null,
    },
    applied,
  };

  if (options.saveHistory !== false) {
    saveTunerHistory(report);
  }

  return report;
}

/**
 * Constrói dashboard simples do AutoTuner.
 */
export function buildAutoTunerDashboard(report = {}) {
  if (!report || typeof report !== 'object') return null;

  return {
    generatedAt: report.generatedAt || Date.now(),
    cards: [
      {
        id: 'recommended_action',
        label: 'Ação recomendada',
        value: report.recommendation?.action || 'unknown',
      },
      {
        id: 'recommended_strategy',
        label: 'Estratégia recomendada',
        value: report.recommendation?.strategyId || 'baseline',
      },
      {
        id: 'health_score',
        label: 'Health Score',
        value: report.latestHealth?.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'evaluations',
        label: 'Avaliações',
        value: report.inputs?.evaluationsCount ?? 0,
      },
      {
        id: 'summaries',
        label: 'Estratégias avaliadas',
        value: report.inputs?.summariesCount ?? 0,
      },
      {
        id: 'applied',
        label: 'Aplicado automaticamente',
        value: report.applied ? 'Sim' : 'Não',
      },
    ],
    recommendation: report.recommendation || null,
    ranked: report.ranked || [],
    latestHealth: report.latestHealth || null,
  };
}

export default {
  saveBacktestReport,
  loadLastBacktestReport,
  loadEvaluationResultsLocal,
  loadHealthSnapshotsLocal,
  summarizeEvaluationsByStrategy,
  saveTunerHistory,
  loadTunerHistory,
  runAutoTunerCycle,
  buildAutoTunerDashboard,
};

`

## src/engine/observability/modelHealth.js

`javascript
/**
 * modelHealth.js
 *
 * Lote 9 — Model health scoring para o Coach.
 *
 * Combina:
 * - drift de calibração;
 * - drift de probabilidade;
 * - drift de nota;
 * - drift de volatilidade;
 * - qualidade de calibração atual;
 * - volume amostral;
 * - governança de flags experimentais.
 */

import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from './driftMonitor.js';

import {
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const HEALTH_STORAGE_KEY = 'coach_model_health_v1';
const HEALTH_STORAGE_MAX = 100;

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function createAlert({
  id,
  type,
  severity,
  message,
  metric = null,
}) {
  return {
    id,
    type,
    severity,
    message,
    metric,
    createdAt: Date.now(),
  };
}

/**
 * Avalia a saúde matemática do modelo.
 */
export function evaluateModelHealth(input = {}, options = {}) {
  const alerts = [];
  const metrics = {};

  let healthScore = 100;

  const calibrationEvents = Array.isArray(input.calibrationEvents)
    ? input.calibrationEvents
    : [];

  const probabilityPairs = Array.isArray(input.probabilityPairs)
    ? input.probabilityPairs
    : [];

  const scores = Array.isArray(input.scores) ? input.scores : [];
  const volatilities = Array.isArray(input.volatilities)
    ? input.volatilities
    : [];

  const features = input.features && typeof input.features === 'object'
    ? input.features
    : {};

  // ==================== CALIBRATION DRIFT ====================
  const calibrationDrift = detectCalibrationDrift(
    calibrationEvents,
    options.calibration || {}
  );

  metrics.calibrationDrift = calibrationDrift;

  if (calibrationDrift?.hasDrift) {
    const severity = calibrationDrift.worstSeverity;

    if (severity === 'high') {
      healthScore -= 25;

      alerts.push(
        createAlert({
          id: 'calibration_drift_high',
          type: 'calibration_drift',
          severity: 'high',
          message:
            'A calibração do modelo degradou significativamente nas amostras recentes.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'medium') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'calibration_drift_medium',
          type: 'calibration_drift',
          severity: 'medium',
          message:
            'A calibração do modelo apresentou degradação moderada recentemente.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'low') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'calibration_drift_low',
          type: 'calibration_drift',
          severity: 'low',
          message: 'Leve degradação de calibração detectada.',
          metric: calibrationDrift.worstMetric,
        })
      );
    }
  }

  // ==================== PROBABILITY CALIBRATION DRIFT ====================
  const probabilityCalibrationDrift = detectProbabilityCalibrationDrift(
    probabilityPairs,
    options.probabilityPairs || {}
  );

  metrics.probabilityCalibrationDrift = probabilityCalibrationDrift;

  if (probabilityCalibrationDrift?.isBadDrift) {
    if (probabilityCalibrationDrift.severity === 'high') {
      healthScore -= 20;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_high',
          type: 'probability_calibration_drift',
          severity: 'high',
          message:
            'As probabilidades previstas estão perdendo confiabilidade recentemente.',
          metric: 'probability_pairs',
        })
      );
    } else if (probabilityCalibrationDrift.severity === 'medium') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_medium',
          type: 'probability_calibration_drift',
          severity: 'medium',
          message:
            'Há sinais de degradação na confiabilidade das probabilidades previstas.',
          metric: 'probability_pairs',
        })
      );
    } else {
      healthScore -= 4;
    }
  }

  // ==================== CURRENT CALIBRATION QUALITY ====================
  if (probabilityPairs.length >= 5) {
    const diagnostics = computeCalibrationDiagnostics(probabilityPairs, {
      bins: options.bins ?? 6,
    });

    metrics.currentCalibration = {
      count: probabilityPairs.length,
      ece: Number(diagnostics.ece.toFixed(6)),
      mce: Number(diagnostics.mce.toFixed(6)),
      reliability: diagnostics.reliability || [],
      brierDecomposition: diagnostics.brierDecomposition || null,
    };

    if (diagnostics.ece > 0.15) {
      healthScore -= 15;

      alerts.push(
        createAlert({
          id: 'current_calibration Poor',
          type: 'current_calibration',
          severity: 'high',
          message: 'O erro de calibração atual está alto.',
          metric: 'ece',
        })
      );
    } else if (diagnostics.ece > 0.10) {
      healthScore -= 8;

      alerts.push(
        createAlert({
          id: 'current_calibration_moderate',
          type: 'current_calibration',
          severity: 'medium',
          message: 'O erro de calibração atual está moderado.',
          metric: 'ece',
        })
      );
    }
  } else {
    metrics.currentCalibration = {
      count: probabilityPairs.length,
      status: 'insufficient_data',
    };
  }

  // ==================== SCORE DRIFT ====================
  const scoreDrift = detectScoreDrift(scores, options.score || {});
  metrics.scoreDrift = scoreDrift;

  if (scoreDrift?.isBadDrift) {
    if (scoreDrift.severity === 'high') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'score_drift_high',
          type: 'performance_drift',
          severity: 'high',
          message: 'Queda relevante de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    } else if (scoreDrift.severity === 'medium') {
      healthScore -= 6;

      alerts.push(
        createAlert({
          id: 'score_drift_medium',
          type: 'performance_drift',
          severity: 'medium',
          message: 'Queda moderada de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    }
  }

  // ==================== VOLATILITY DRIFT ====================
  const volatilityDrift = detectVolatilityDrift(
    volatilities,
    options.volatility || {}
  );

  metrics.volatilityDrift = volatilityDrift;

  if (volatilityDrift?.isBadDrift) {
    if (volatilityDrift.severity === 'high') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'volatility_drift_high',
          type: 'volatility_drift',
          severity: 'high',
          message: 'A volatilidade do desempenho aumentou significativamente.',
          metric: 'volatility',
        })
      );
    } else if (volatilityDrift.severity === 'medium') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'volatility_drift_medium',
          type: 'volatility_drift',
          severity: 'medium',
          message: 'A volatilidade do desempenho aumentou moderadamente.',
          metric: 'volatility',
        })
      );
    }
  }

  // ==================== SAMPLE ADEQUACY ====================
  const sampleSize = Number.isFinite(Number(input.sampleSize))
    ? Number(input.sampleSize)
    : scores.length;

  metrics.sampleSize = sampleSize;

  if (sampleSize < 5) {
    healthScore -= 15;

    alerts.push(
      createAlert({
        id: 'low_sample_size',
        type: 'data_adequacy',
        severity: 'high',
        message:
          'Há poucos dados para confiar nas projeções atuais. O sistema deve operar com mais conservadorismo.',
        metric: 'sample_size',
      })
    );
  } else if (sampleSize < 10) {
    healthScore -= 7;

    alerts.push(
      createAlert({
        id: 'moderate_sample_size',
        type: 'data_adequacy',
        severity: 'medium',
        message:
          'A quantidade de dados ainda é moderada. Projeções devem ser interpretadas com cautela.',
        metric: 'sample_size',
      })
    );
  }

  // ==================== FLAG GOVERNANCE ====================
  const experimentalFlags = [
    'useStateSpace',
    'useDynamicVolatility',
    'usePosteriorMonteCarlo',
    'useBayesianTopics',
    'useDecisionUtility',
    'useBanditPlanner',
    'useKnowledgeGraph',
    'useAdvancedFsrs',
  ];

  const activeExperimentalFlags = experimentalFlags.filter(
    (flag) => features[flag] === true
  );

  metrics.activeExperimentalFlags = activeExperimentalFlags;

  if (activeExperimentalFlags.length > 4) {
    healthScore -= 6;

    alerts.push(
      createAlert({
        id: 'too_many_experimental_flags',
        type: 'flag_governance',
        severity: 'medium',
        message:
          'Muitas flags experimentais estão ativas simultaneamente. Isso dificulta atribuir causa a mudanças de desempenho.',
        metric: 'experimental_flags',
      })
    );
  }

  // ==================== TELEMETRY STALENESS ====================
  const lastTelemetryTimestamp = Number(input.lastTelemetryTimestamp) || 0;

  if (lastTelemetryTimestamp > 0) {
    const daysSinceTelemetry =
      (Date.now() - lastTelemetryTimestamp) / 86400000;

    metrics.daysSinceLastTelemetry = Number(daysSinceTelemetry.toFixed(2));

    if (daysSinceTelemetry > 14) {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'stale_telemetry',
          type: 'telemetry',
          severity: 'low',
          message:
            'A telemetria de calibração está antiga. A avaliação de saúde pode estar defasada.',
          metric: 'telemetry_age',
        })
      );
    }
  } else {
    metrics.daysSinceLastTelemetry = null;
  }

  healthScore = clampFinite(healthScore, 0, 100, 100);

  let status = 'healthy';

  if (healthScore < 60) {
    status = 'critical';
  } else if (healthScore < 80) {
    status = 'degraded';
  }

  const recommendations = [];

  if (status === 'critical') {
    recommendations.push(
      'Reduza flags experimentais e volte para uma configuração mais conservadora.'
    );
  }

  if (alerts.some((alert) => alert.type === 'calibration_drift')) {
    recommendations.push(
      'Revise os thresholds de calibração e aumente o shrinkage de probabilidade.'
    );
  }

  if (alerts.some((alert) => alert.type === 'volatility_drift')) {
    recommendations.push(
      'Aumente a suavização de volatilidade e reduza a confiança em tendências recentes.'
    );
  }

  if (alerts.some((alert) => alert.type === 'performance_drift')) {
    recommendations.push(
      'Verifique se houve mudança real de nível do aluno ou apenas ruído amostral.'
    );
  }

  if (alerts.some((alert) => alert.type === 'data_adequacy')) {
    recommendations.push(
      'Evite decisões agressivas enquanto houver poucos dados.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'O sistema está estável. Mantenha monitoramento contínuo.'
    );
  }

  return {
    healthScore: Number(healthScore.toFixed(2)),
    status,
    generatedAt: Date.now(),
    alerts,
    metrics,
    recommendations,
  };
}

/**
 * Gera dados prontos para dashboard.
 */
export function generateHealthDashboard(health = {}) {
  if (!health || typeof health !== 'object') return null;

  const metrics = health.metrics || {};
  const alerts = health.alerts || [];

  return {
    generatedAt: health.generatedAt || Date.now(),
    healthScore: health.healthScore ?? null,
    status: health.status ?? 'unknown',
    cards: [
      {
        id: 'health_score',
        label: 'Health Score',
        value: health.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'sample_size',
        label: 'Amostras',
        value: metrics.sampleSize ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'calibration_drift',
        label: 'Drift de Calibração',
        value: metrics.calibrationDrift?.worstSeverity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'score_drift',
        label: 'Drift de Nota',
        value: metrics.scoreDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'volatility_drift',
        label: 'Drift de Volatilidade',
        value: metrics.volatilityDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'experimental_flags',
        label: 'Flags Experimentais',
        value: Array.isArray(metrics.activeExperimentalFlags)
          ? metrics.activeExperimentalFlags.length
          : 0,
        goodDirection: 'lower',
      },
    ],
    alerts,
    recommendations: health.recommendations || [],
    metrics,
  };
}

/**
 * Salva snapshot de saúde.
 */
export function saveModelHealthSnapshot(snapshot) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];

    const next = [...current, snapshot]
      .filter(Boolean)
      .slice(-HEALTH_STORAGE_MAX);

    storage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega snapshots de saúde.
 */
export function loadModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa snapshots de saúde.
 */
export function clearModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(HEALTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
};

`

## src/engine/observability/driftMonitor.js

`javascript
/**
 * driftMonitor.js
 *
 * Lote 9 — Drift Guard para o Coach.
 *
 * Detecta:
 * - drift de nota;
 * - drift de volatilidade;
 * - drift de calibração;
 * - drift de probabilidade/calibração preditiva;
 *
 * Técnicas:
 * - EWMA control chart;
 * - CUSUM simples;
 * - comparação baseline vs janela recente;
 * - effect size + z-score aproximado.
 */

import {
  computeCalibrationDiagnostics,
  computeBrierScore,
} from '../../utils/calibration.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function finiteSeries(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function meanValues(values) {
  const safe = finiteSeries(values);
  if (safe.length === 0) return 0;
  return safe.reduce((acc, val) => acc + val, 0) / safe.length;
}

function varianceValues(values) {
  const safe = finiteSeries(values);
  if (safe.length < 2) return 0;

  const mean = meanValues(safe);
  const devs = safe.map((value) => Math.pow(value - mean, 2));

  return devs.reduce((acc, val) => acc + val, 0) / (safe.length - 1);
}

function sdValues(values) {
  return Math.sqrt(Math.max(0, varianceValues(values)));
}

/**
 * EWMA control chart.
 */
export function computeEwmaControlChart(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 3) {
    return null;
  }

  const lambda = clampFinite(options.lambda, 0.05, 0.95, 0.2);
  const L = clampFinite(options.L, 1, 5, 2.7);

  const center = meanValues(safe);
  const sigma = sdValues(safe);

  const sigmaEwma = sigma * Math.sqrt(lambda / (2 - lambda));

  let ewma = center;
  const chart = [];
  let violationCount = 0;

  for (let i = 0; i < safe.length; i++) {
    ewma = lambda * safe[i] + (1 - lambda) * ewma;

    const upper = center + L * sigmaEwma;
    const lower = center - L * sigmaEwma;

    const outOfControl = ewma > upper || ewma < lower;

    if (outOfControl) {
      violationCount++;
    }

    chart.push({
      index: i,
      value: safe[i],
      ewma: Number(ewma.toFixed(6)),
      upper: Number(upper.toFixed(6)),
      lower: Number(lower.toFixed(6)),
      outOfControl,
    });
  }

  const last = chart[chart.length - 1];

  return {
    model: 'ewma_control_chart',
    center: Number(center.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    sigmaEwma: Number(sigmaEwma.toFixed(6)),
    lambda,
    L,
    ewma: last.ewma,
    upper: last.upper,
    lower: last.lower,
    outOfControl: last.outOfControl,
    violationCount,
    chart: chart.slice(-30),
  };
}

/**
 * CUSUM simples para detectar mudança de média.
 */
export function cusumDrift(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 5) {
    return null;
  }

  const baselineSize = Math.max(3, Math.floor(safe.length * 0.6));
  const baseline = safe.slice(0, baselineSize);

  const target = meanValues(baseline);
  const sigma = sdValues(baseline) || 1e-6;

  const k = clampFinite(options.k, 0, 5, 0.5) * sigma;
  const h = clampFinite(options.h, 1, 20, 4) * sigma;

  let sPos = 0;
  let sNeg = 0;
  let alarm = null;

  const series = [];

  for (const value of safe) {
    const deviation = value - target;

    sPos = Math.max(0, sPos + deviation - k);
    sNeg = Math.max(0, sNeg - deviation - k);

    if (!alarm && (sPos > h || sNeg > h)) {
      alarm = sPos > h ? 'up' : 'down';
    }

    series.push({
      value,
      sPos: Number(sPos.toFixed(6)),
      sNeg: Number(sNeg.toFixed(6)),
    });
  }

  return {
    model: 'cusum',
    target: Number(target.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    k: Number(k.toFixed(6)),
    h: Number(h.toFixed(6)),
    alarm,
    sPos: Number(sPos.toFixed(6)),
    sNeg: Number(sNeg.toFixed(6)),
    series: series.slice(-30),
  };
}

/**
 * Detecta drift genérico em uma série numérica.
 */
export function detectDriftInSeries(values, options = {}) {
  const safe = finiteSeries(values);

  const recentWindow = Math.round(clampFinite(options.recentWindow, 2, 30, 5));
  const minSamples = Math.round(clampFinite(options.minSamples, 4, 200, 8));

  if (safe.length < minSamples) {
    return null;
  }

  const recent = safe.slice(-recentWindow);

  const baseline = safe.slice(
    0,
    Math.max(3, safe.length - recent.length)
  );

  if (baseline.length < 3 || recent.length < 2) {
    return null;
  }

  const baselineMean = meanValues(baseline);
  const recentMean = meanValues(recent);

  const baselineSd = sdValues(baseline);
  const recentSd = sdValues(recent);

  const delta = recentMean - baselineMean;

  const epsilon = Math.max(
    1e-6,
    Number(options.epsilon) || Math.abs(baselineMean) * 0.02 || 1
  );

  const effectSize = delta / Math.max(epsilon, baselineSd);

  const se = Math.sqrt(
    (baselineSd * baselineSd) / baseline.length +
    (recentSd * recentSd) / recent.length
  );

  const zScore = se > 1e-9 ? delta / se : 0;

  const effectThresholdLow = clampFinite(options.effectThresholdLow, 0, 5, 0.5);
  const effectThresholdMedium = clampFinite(options.effectThresholdMedium, 0, 6, 1.0);
  const effectThresholdHigh = clampFinite(options.effectThresholdHigh, 0, 8, 1.8);

  let severity = 'none';

  const absEffect = Math.abs(effectSize);
  const absZ = Math.abs(zScore);

  if (absEffect >= effectThresholdHigh || absZ >= 3) {
    severity = 'high';
  } else if (absEffect >= effectThresholdMedium || absZ >= 2) {
    severity = 'medium';
  } else if (absEffect >= effectThresholdLow) {
    severity = 'low';
  }

  let direction = 'none';

  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';

  const ewma = computeEwmaControlChart(safe, options);
  const cusum = cusumDrift(safe, options);

  const outOfControl =
    Boolean(ewma?.outOfControl) ||
    Boolean(cusum?.alarm && cusum.alarm === direction);

  return {
    model: 'baseline_recent_drift',
    direction,
    severity,
    baselineMean: Number(baselineMean.toFixed(6)),
    recentMean: Number(recentMean.toFixed(6)),
    delta: Number(delta.toFixed(6)),
    effectSize: Number(effectSize.toFixed(6)),
    zScore: Number(zScore.toFixed(6)),
    baselineSize: baseline.length,
    recentSize: recent.length,
    sampleSize: safe.length,
    outOfControl,
    ewma,
    cusum,
  };
}

/**
 * Detecta drift de notas.
 */
export function detectScoreDrift(scores = [], options = {}) {
  const result = detectDriftInSeries(scores, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'score',
    badDirection: 'down',
    isBadDrift: result.direction === 'down' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de volatilidade.
 */
export function detectVolatilityDrift(volatilities = [], options = {}) {
  const result = detectDriftInSeries(volatilities, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'volatility',
    badDirection: 'up',
    isBadDrift: result.direction === 'up' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de calibração usando eventos de telemetria.
 *
 * Eventos esperados:
 * { timestamp, avgBrier, ece, calibrationPenalty }
 */
export function detectCalibrationDrift(events = [], options = {}) {
  const safeEvents = (Array.isArray(events) ? events : [])
    .filter(Boolean)
    .filter(
      (event) =>
        Number.isFinite(Number(event?.avgBrier)) ||
        Number.isFinite(Number(event?.ece)) ||
        Number.isFinite(Number(event?.calibrationPenalty))
    )
    .sort((a, b) => {
      const timeA = Number(a?.timestamp) || 0;
      const timeB = Number(b?.timestamp) || 0;
      return timeA - timeB;
    });

  if (safeEvents.length < 6) {
    return null;
  }

  const extract = (key) =>
    safeEvents
      .map((event) => Number(event?.[key]))
      .filter((value) => Number.isFinite(value));

  const brierSeries = extract('avgBrier');
  const eceSeries = extract('ece');
  const penaltySeries = extract('calibrationPenalty');

  const brierDrift = detectDriftInSeries(brierSeries, options);
  const eceDrift = detectDriftInSeries(eceSeries, options);
  const penaltyDrift = detectDriftInSeries(penaltySeries, options);

  const enrichBadDirection = (drift) => {
    if (!drift) return null;

    return {
      ...drift,
      badDirection: 'up',
      isBadDrift: drift.direction === 'up' && drift.severity !== 'none',
    };
  };

  const enrichedBrier = enrichBadDirection(brierDrift);
  const enrichedEce = enrichBadDirection(eceDrift);
  const enrichedPenalty = enrichBadDirection(penaltyDrift);

  const candidates = [enrichedBrier, enrichedEce, enrichedPenalty].filter(
    Boolean
  );

  const hasDrift = candidates.some(
    (candidate) => candidate.isBadDrift
  );

  const severityRank = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  const worst = candidates.reduce(
    (acc, candidate) => {
      if (!candidate?.isBadDrift) return acc;

      const candidateRank = severityRank[candidate.severity] || 0;
      const accRank = severityRank[acc?.severity] || 0;

      return candidateRank > accRank ? candidate : acc;
    },
    null
  );

  return {
    metric: 'calibration',
    brier: enrichedBrier,
    ece: enrichedEce,
    penalty: enrichedPenalty,
    hasDrift,
    worstSeverity: worst?.severity || 'none',
    worstMetric: worst?.metric || null,
    sampleSize: safeEvents.length,
  };
}

/**
 * Detecta drift de calibração em pares probabilidade vs resultado.
 *
 * pairs:
 * [{ probability: 0.62, observed: 1 }]
 */
export function detectProbabilityCalibrationDrift(pairs = [], options = {}) {
  const safePairs = (Array.isArray(pairs) ? pairs : [])
    .map((pair) => ({
      probability: clampFinite(pair?.probability, 0, 1, NaN),
      observed: clampFinite(pair?.observed, 0, 1, NaN),
      timestamp: Number(pair?.timestamp) || 0,
    }))
    .filter(
      (pair) =>
        Number.isFinite(pair.probability) &&
        Number.isFinite(pair.observed)
    )
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp && a.timestamp > 0 && b.timestamp > 0) {
        return a.timestamp - b.timestamp;
      }
      return 0;
    });

  if (safePairs.length < 8) {
    return null;
  }

  const recentFraction = clampFinite(options.recentFraction, 0.2, 0.6, 0.4);
  const splitIndex = Math.floor(safePairs.length * (1 - recentFraction));

  const baselinePairs = safePairs.slice(0, splitIndex);
  const recentPairs = safePairs.slice(splitIndex);

  if (baselinePairs.length < 4 || recentPairs.length < 4) {
    return null;
  }

  const baselineDiagnostics = computeCalibrationDiagnostics(baselinePairs, {
    bins: options.bins ?? 5,
  });

  const recentDiagnostics = computeCalibrationDiagnostics(recentPairs, {
    bins: options.bins ?? 5,
  });

  const baselineBrier = meanValues(
    baselinePairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const recentBrier = meanValues(
    recentPairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const deltaBrier = recentBrier - baselineBrier;
  const deltaEce = recentDiagnostics.ece - baselineDiagnostics.ece;

  let severity = 'none';

  if (
    deltaBrier > 0.05 ||
    deltaEce > 0.08
  ) {
    severity = 'high';
  } else if (
    deltaBrier > 0.02 ||
    deltaEce > 0.04
  ) {
    severity = 'medium';
  } else if (deltaBrier > 0.01 || deltaEce > 0.02) {
    severity = 'low';
  }

  return {
    metric: 'probability_calibration',
    severity,
    direction: severity === 'none' ? 'none' : 'degraded',
    baseline: {
      count: baselinePairs.length,
      brier: Number(baselineBrier.toFixed(6)),
      ece: Number(baselineDiagnostics.ece.toFixed(6)),
      mce: Number(baselineDiagnostics.mce.toFixed(6)),
    },
    recent: {
      count: recentPairs.length,
      brier: Number(recentBrier.toFixed(6)),
      ece: Number(recentDiagnostics.ece.toFixed(6)),
      mce: Number(recentDiagnostics.mce.toFixed(6)),
    },
    delta: {
      brier: Number(deltaBrier.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
    },
    isBadDrift: severity !== 'none',
  };
}

export default {
  computeEwmaControlChart,
  cusumDrift,
  detectDriftInSeries,
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
};

`

## src/engine/evaluation/strategyBacktester.js

`javascript
/**
 * strategyBacktester.js
 *
 * Lote 8 — Backtest offline de estratégias do Coach.
 *
 * Este módulo compara diferentes configurações de flags usando dados históricos.
 * Ele não altera o Coach em produção.
 */

import {
  calculateUrgency,
  getSuggestedFocus,
  clearUrgencyCache,
  clearMcCache,
} from '../../utils/coachLogic.js';

import { getSafeScore } from '../../utils/scoreHelper.js';
import { normalizeDate } from '../../utils/dateHelper.js';
import { isSubjectMatch } from '../../utils/normalization.js';

import {
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
} from './coachEvaluator.js';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

function filterLogsBefore(studyLogs = [], cutoff = null) {
  const cutoffTime = toTime(cutoff);

  if (!Number.isFinite(cutoffTime)) {
    return safeArray(studyLogs);
  }

  return safeArray(studyLogs).filter((log) => {
    const logTime = toTime(log?.date ?? log?.createdAt);

    if (!Number.isFinite(logTime)) return false;

    return logTime <= cutoffTime;
  });
}

/**
 * Estratégias padrão: baseline vs todos os lotes ativos.
 */
export function getDefaultCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
  ];
}

/**
 * Estratégias granulares para comparar lote por lote.
 */
export function getGranularCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior MC',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
  ];
}

/**
 * Constrói splits temporais para uma categoria.
 */
export function buildCategorySplits(category, simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const targetScore = Number.isFinite(Number(options.targetScore))
    ? Number(options.targetScore)
    : maxScore * 0.8;

  const minTrain = Math.max(3, Math.round(Number(options.minTrain) || 5));
  const horizon = Math.max(1, Math.round(Number(options.horizon) || 1));
  const maxSplits = Math.max(1, Math.round(Number(options.maxSplits) || 8));

  const categoryName = category?.name || '';
  const categoryId = category?.id || categoryName || 'unknown';

  const categorySimulados = safeArray(simulados)
    .filter((simulado) => {
      if (!simulado) return false;
      return isSubjectMatch(simulado.subject || '', categoryName);
    })
    .sort((a, b) => {
      const timeA = toTime(a?.date ?? a?.createdAt);
      const timeB = toTime(b?.date ?? b?.createdAt);

      if (Number.isFinite(timeA) && Number.isFinite(timeB)) {
        return timeA - timeB;
      }

      return 0;
    });

  const splits = [];

  for (let i = minTrain - 1; i < categorySimulados.length - 1; i++) {
    const train = categorySimulados.slice(0, i + 1);
    const future = categorySimulados.slice(i + 1, i + 1 + horizon);

    if (future.length === 0) break;

    const observedScores = future
      .map((simulado) => getSafeScore(simulado, maxScore))
      .filter((score) => Number.isFinite(score));

    if (observedScores.length === 0) continue;

    const observedScore =
      observedScores.reduce((acc, score) => acc + score, 0) /
      observedScores.length;

    const lastTrain = train[train.length - 1];
    const trainLastDate = lastTrain?.date ?? lastTrain?.createdAt ?? null;

    splits.push({
      categoryId,
      categoryName,
      train,
      future,
      trainLastDate,
      observedScore,
      observedSuccess: observedScore >= targetScore,
    });

    if (splits.length >= maxSplits) break;
  }

  return splits;
}

/**
 * Executa backtest de estratégias do Coach.
 */
export function runCoachStrategyBacktest(config = {}) {
  const categories = safeArray(config.categories);
  const simulados = safeArray(config.simulados);
  const studyLogs = safeArray(config.studyLogs);

  const maxScore = Number(config.maxScore) > 0 ? Number(config.maxScore) : 100;

  const targetScore = Number.isFinite(Number(config.targetScore))
    ? Number(config.targetScore)
    : maxScore * 0.8;

  const strategies =
    Array.isArray(config.strategies) && config.strategies.length > 0
      ? config.strategies
      : getDefaultCoachStrategies();

  const minTrain = Math.max(3, Math.round(Number(config.minTrain) || 5));
  const horizon = Math.max(1, Math.round(Number(config.horizon) || 1));
  const maxSplits = Math.max(1, Math.round(Number(config.maxSplits) || 6));

  const includeTopics = config.includeTopics === true;
  const clearCaches = config.clearCaches !== false;

  const rawByStrategy = {};

  strategies.forEach((strategy) => {
    rawByStrategy[strategy.id] = [];
  });

  categories.forEach((category) => {
    const splits = buildCategorySplits(category, simulados, {
      maxScore,
      targetScore,
      minTrain,
      horizon,
      maxSplits,
    });

    splits.forEach((split) => {
      const logsBefore = filterLogsBefore(studyLogs, split.trainLastDate);

      strategies.forEach((strategy) => {
        if (clearCaches) {
          try {
            clearUrgencyCache();
            clearMcCache();
          } catch {
            // ignore
          }
        }

        try {
          const runOptions = {
            ...(config.options || {}),
            maxScore,
            targetScore,
            now: split.trainLastDate,
            features: {
              ...(config.baseFeatures || {}),
              ...(strategy.features || {}),
            },
            allCategories: categories,
          };

          let urgency = null;
          let weakTopics = [];

          if (includeTopics) {
            const focus = getSuggestedFocus(
              [category],
              split.train,
              logsBefore,
              runOptions
            );

            urgency = focus?.urgency || null;
            weakTopics = focus?.weakestTopic ? [focus.weakestTopic] : [];
          } else {
            urgency = calculateUrgency(
              category,
              split.train,
              logsBefore,
              runOptions
            );
          }

          const snapshot = {
            strategyId: strategy.id,
            categoryId: split.categoryId,
            categoryName: split.categoryName,
            timestamp: toTime(split.trainLastDate) || Date.now(),
            normalizedScore: urgency?.normalizedScore ?? null,
            probability:
              urgency?.details?.monteCarlo?.probability ??
              null,
            predictedMean:
              urgency?.details?.monteCarlo?.meanProjected ??
              urgency?.details?.averageScore ??
              null,
            weakTopics,
          };

          const outcomeTopics =
            typeof config.getOutcomeTopics === 'function'
              ? config.getOutcomeTopics(split, category, strategy)
              : [];

          const outcome = {
            score: split.observedScore,
            success: split.observedSuccess,
            relevantTopics: Array.isArray(outcomeTopics) ? outcomeTopics : [],
          };

          const evaluation = evaluateCoachSnapshot(snapshot, outcome, {
            maxScore,
            targetScore,
            k: config.topicK ?? 5,
            evaluateTopics: includeTopics,
          });

          rawByStrategy[strategy.id].push(evaluation);
        } catch (err) {
          console.warn(
            `[StrategyBacktester] Failed strategy ${strategy.id}:`,
            err
          );
        }
      });
    });
  });

  const summaries = {};

  Object.entries(rawByStrategy).forEach(([strategyId, evaluations]) => {
    summaries[strategyId] = summarizeCoachEvaluations(evaluations, {
      bins: config.calibrationBins ?? 6,
    });
  });

  const comparisons = {};

  if (summaries.baseline) {
    Object.keys(summaries).forEach((strategyId) => {
      if (strategyId === 'baseline') return;

      comparisons[`${strategyId}_vs_baseline`] = compareEvaluationSummaries(
        summaries.baseline,
        summaries[strategyId]
      );
    });
  }

  return {
    generatedAt: Date.now(),
    config: {
      maxScore,
      targetScore,
      minTrain,
      horizon,
      maxSplits,
      includeTopics,
      clearCaches,
      strategyIds: strategies.map((strategy) => strategy.id),
    },
    summaries,
    comparisons,
    raw: rawByStrategy,
  };
}

export default {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  buildCategorySplits,
  runCoachStrategyBacktest,
};

`

## src/utils/scoreHelper.js

`javascript
/**
 * Utilitários de sanitização de scores e linhas de simulado.
 * Centraliza invariantes matemáticos para evitar dados impossíveis.
 */

export const SYNTHETIC_PERCENT_ONLY_TRIALS = 5;

export function getSyntheticTotal(_maxScore = 100, options = {}) {
  const trials = options?.syntheticTrials ?? SYNTHETIC_PERCENT_ONLY_TRIALS;
  return Number.isFinite(Number(trials)) && Number(trials) > 0 ? Number(trials) : SYNTHETIC_PERCENT_ONLY_TRIALS;
}

export function isPercentOnlyRecord(row) {
  return (
    row &&
    Number.isFinite(Number(row.score)) &&
    (!Number.isFinite(Number(row.total)) || Number(row.total) <= 0)
  );
}

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toPoints(score, maxScore = 100, minScore = 0, mode = 'raw') {
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore)) && Number(minScore) >= 0 ? Number(minScore) : 0;
  const finalMin = Math.min(safeMin, safeMax);
  const finalMax = Math.max(safeMin, safeMax);
  const rawScore = Number(score);
  if (!Number.isFinite(rawScore)) return finalMin;

  if (mode === 'pct') {
    return clamp((rawScore / 100) * (finalMax - finalMin) + finalMin, finalMin, finalMax);
  }

  return clamp(rawScore, finalMin, finalMax);
}



export function formatValue(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';

  const safeDigits = Number.isFinite(Number(digits)) ? Math.max(0, Number(digits)) : 1;

  if (Math.abs(n) >= 1000) {
    return n.toLocaleString('pt-BR', { maximumFractionDigits: safeDigits, minimumFractionDigits: 0 });
  }

  if (Math.abs(n) >= 10) {
    return n.toFixed(Math.min(safeDigits, 1)).replace(/\.0$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  if (Math.abs(n) >= 1) {
    return n.toFixed(Math.max(1, safeDigits)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  if (Math.abs(n) > 0) {
    return n.toFixed(Math.max(2, safeDigits + 1)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  return '0';
}

export function formatPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${formatValue(n, digits)}%`;
}

export {
  clampFinite,
  safeDomain,
  sanitizeMaxScore,
  pointsToPct,
  pctToPoints,
  ratioToPoints,
  toProb01,
  toProbPct,
  safeDivide,
  safeTime,
  normalizeSubjectKey,
  sortChronologically,
  latestByDate,
  resolveTargetPoints,
  normalizeScoreValue,
  getSafeScore,
  clampCorrectToTotal,
  sanitizeSimuladoRow,
  mergeQuestionResult,
  deduplicateSimulados,
  buildSimuladoDateSubjectKeys,
  migrateContestData
} from "./measurement.js";


`

## src/utils/dateHelper.js

`javascript
import { addDays } from 'date-fns';

export const APP_TIMEZONE = 'America/Manaus';

export const safeDateParse = (dateInput, fallback = null) => {
  if (!dateInput) return fallback;
  const normalizedString = typeof dateInput === 'string'
    ? dateInput.replace(' ', 'T')
    : dateInput;
  const d = new Date(normalizedString);
  return isNaN(d.getTime()) ? fallback : d;
};

export function parseGoalDateUnified(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string') {
        // Formato yyyy-mm-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);

            const date = new Date(year, month - 1, day, 12, 0, 0, 0);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        // Se for datetime sem T, tenta normalizar
        const normalized = value.includes('T')
            ? value
            : `${value}T12:00:00`;

        const date = new Date(normalized);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const fallback = new Date(value);

    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export const getDateKey = (rawDate) => {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  try {
    const d = normalizeDate(rawDate) || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export const getLocalMidnight = (date = new Date()) => {
  try {
    const dateKey = getDateKey(date);
    if (!dateKey) {
      // Fallback: extrair componentes UTC e ancorar em Manaus (UTC-4)
      const utc = new Date(date);
      return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) + 4 * 3600000);
    }
    // ✅ FIX: Offset fixo de Manaus (-04:00) em vez de timezone local
    // eslint-disable-next-line no-restricted-syntax
    return new Date(`${dateKey}T00:00:00-04:00`);
  } catch {
    const utc = new Date(date);
    return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) + 4 * 3600000);
  }
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'number' || (typeof dateStr === 'string' && /^\d{10,13}$/.test(dateStr.trim()))) {
    const d = new Date(Number(dateStr));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    }
  }
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length < 3) return cleanStr;
  return `${parts[2]}/${parts[1]}`;
};

export const normalizeDate = (raw) => {
  if (!raw) return null;
  let d;
  const isDateOnly = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw);
  
  if (typeof raw === 'object' && (raw.seconds != null || raw._seconds != null)) {
    const secs = raw.seconds != null ? raw.seconds : raw._seconds;
    d = new Date(secs * 1000);
  } else if (typeof raw === 'string' && raw.includes('/')) {
    const parts = raw.split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      // ✅ FIX: Ancora ao meio-dia de Manaus
      // eslint-disable-next-line no-restricted-syntax
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`);
    } else {
      d = new Date(raw);
    }
  } else if (typeof raw === 'string') {
    // ✅ FIX: Strings YYYY-MM-DD ancoradas ao meio-dia de Manaus
    // eslint-disable-next-line no-restricted-syntax
    d = isDateOnly ? new Date(`${raw}T12:00:00-04:00`) : new Date(raw);
  } else {
    d = new Date(raw);
  }
  
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d;
};

export const toDateMs = (value) => {
  if (!value) return Number.NaN;
  if (typeof value === 'object' && (value.seconds != null || value._seconds != null)) {
    const secs = value.seconds != null ? value.seconds : value._seconds;
    return Number(secs) * 1000;
  }
  const parsed = normalizeDate(value);
  return parsed ? parsed.getTime() : new Date(value).getTime();
};

export const formatTimeAgo = (date) => {
  if (!date) return 'Nunca';
  const timeMs = toDateMs(date);
  if (Number.isNaN(timeMs)) return 'Data inválida';
  
  const rawDiff = Date.now() - timeMs;
  if (rawDiff < 0) {
    if (Math.abs(rawDiff) <= 60_000) return 'Agora há pouco';
    return 'No futuro';
  }
  
  const diff = rawDiff;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (hours < 1) return 'Agora há pouco';
  if (hours < 24) return `${hours}h atrás`;
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
};

export const formatDuration = (decimalHours) => {
  const safe = Number.isFinite(Number(decimalHours)) ? Number(decimalHours) : 0;
  const normalized = Math.max(0, safe);
  let hours = Math.floor(normalized);
  let minutes = Math.round((normalized - hours) * 60);
  
  if (minutes >= 60) {
    hours += 1;
    minutes = 0;
  }
  
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '0h00';
  return `${hours}h${String(Math.max(0, minutes)).padStart(2, '0')}`;
};

export const formatDatePtBR = (date) => {
  try {
    if (!date) return '--/--/----';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/----';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(parsed);
  } catch {
    return '--/--/----';
  }
};

export const formatDateTimePtBR = (date) => {
  try {
    if (!date) return '--/--/---- --:--:--';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/---- --:--:--';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(parsed);
  } catch {
    return '--/--/---- --:--:--';
  }
};

export const formatWeekdayShortPtBR = (date) => {
  try {
    if (!date) return '';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, weekday: 'short'
    }).format(parsed).replace('.', '').toUpperCase();
  } catch {
    return '';
  }
};

export const getFlashcardTodayKey = () => getDateKey(new Date());

export const getFlashcardNextDueKey = (intervalDays = 1) => {
   const raw = Number(intervalDays);
   const safeDays = Number.isFinite(raw) ? Math.max(1, Math.min(3650, Math.floor(raw))) : 1;
   const future = addDays(new Date(), safeDays);
   const key = getDateKey(future);
   return key || getFlashcardTodayKey();
};

export const isFlashcardDue = (cardDue, referenceKey = null) => {
  if (!cardDue) return true;
  const todayKey = referenceKey || getFlashcardTodayKey();
  return cardDue <= todayKey;
};

export const parseNoonLocal = (input) => {
  if (!input) return null;
  try {
    const key = getDateKey(input);
    if (!key) {
      const fallback = normalizeDate(input);
      if (!fallback || Number.isNaN(fallback.getTime())) return null;
      fallback.setHours(12, 0, 0, 0);
      return fallback;
    }
    const [y, m, d] = key.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const fullYear = y >= 0 && y < 100 ? y + 2000 : y;
    const date = new Date(0);
    date.setFullYear(fullYear, m - 1, d);
    date.setHours(12, 0, 0, 0);
    return date;
  } catch {
    return null;
  }
};



`

## src/utils/normalization.js

`javascript
/**
 * Normalizes a string for consistent matching across the application.
 * Removes accents, converts to lowercase, trims whitespace, and removes common prefixes.
 * 
 * @param {string} str - The string to normalize
 * @returns {string} - The normalized string
 */
export const normalize = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .normalize('NFKC')              // Use NFKC for better compatibility matching
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "") // eslint-disable-line no-control-regex
        .replace(/nocoes de\s+/g, "")    // Remove common prefix
        .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep all letters (unicode) and numbers
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .trim();
};

/**
 * Map of aliases for common subjects.
 * Keys should be the normalized version of the canonical subject name (as if it was in Dashboard).
 * Values are arrays of alternative names (also normalized potentially, but usually raw variations).
 */
export const aliases = {
    'informatica': ['noções de informática', 'info', 'computação', 'ti', 'tecnologia da informação', 'informática'],
    'raciocinio logico': ['rlm', 'raciocínio lógico matemático', 'raciocinio logico quantitativo', 'rl', 'lógica', 'raciocínio'],
    'etica no servico publico': ['etica', 'ética no serviço público', 'ética', 'ética e cidadania'],
    'direito constitucional': ['const', 'constitucional', 'dir. const', 'd. const', 'constituição', 'dir const'],
    'direito administrativo': ['adm', 'administrativo', 'dir. adm', 'd. adm', 'adm pública', 'dir adm'],
    'lingua portuguesa': ['portugues', 'português', 'pt', 'gramática', 'interpretação de textos', 'port.'],
    'atualidades': ['conhecimentos gerais', 'mundo atual', 'geopolítica'],
    'direito penal': ['penal', 'dir. penal', 'd. penal', 'dp', 'dir penal'],
    'direito processual penal': ['processo penal', 'dpp', 'dir. proc. penal', 'dir proc penal'],
    'direitos humanos': ['dh', 'humanos', 'd. humanos'],
    'direito civil': ['civil', 'dir. civil', 'd. civil', 'dc', 'dir civil'],
    'direito processual civil': ['processo civil', 'dpc', 'dir. proc. civil', 'dir proc civil']
};

/**
 * Verifica se duas matérias correspondem, considerando o nome normalizado e os aliases.
 */
export const isSubjectMatch = (name1, name2) => {
    if (!name1 || !name2) return false;
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    if (n1 === n2) return true;
    
    // Check if n2 is an alias of n1 (where n1 is a canonical key)
    if (aliases[n1] && aliases[n1].some(a => normalize(a) === n2)) return true;
    // Check if n1 is an alias of n2 (where n2 is a canonical key)
    if (aliases[n2] && aliases[n2].some(a => normalize(a) === n1)) return true;
    
    // Check if both are aliases of the same canonical key
    for (const [canonical, aliasList] of Object.entries(aliases)) {
        const hasN1 = n1 === canonical || aliasList.some(a => normalize(a) === n1);
        const hasN2 = n2 === canonical || aliasList.some(a => normalize(a) === n2);
        if (hasN1 && hasN2) return true;
    }
    
    return false;
};
/**
 * Normaliza um valor evitando divisão por zero e garantindo limites entre 0 e 1.
 * Se o máximo e o mínimo forem iguais (ex: primeira semana do aluno), 
 * assume-se o percentil 50% (0.5) para evitar distorções no gráfico.
 */
export const safeNormalize = (val, max, min) => {
    // Tratamento de edge case crítico
    if (typeof val !== 'number' || isNaN(val)) return 0;
    if (!Number.isFinite(max) || !Number.isFinite(min)) return 0;
    if (max === min) return 0.5; 
    
    const normalized = (val - min) / (max - min);
    
    // Clamping para evitar explodir a escala (valores > 1 ou < 0)
    return Math.max(0, Math.min(1, normalized));
};

/**
 * Divisão segura global para evitar Infinity ou NaN.
 */
export const safeDivide = (numerator, denominator, fallback = 0) => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : fallback;
};

`

## src/utils/displaySubject.js

`javascript
import { normalize } from './normalization';

const SUBJECT_MAP = {
  'matematica': 'Matemática',
  'matematica financeira': 'Matemática Financeira',
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
  'nocoes de informatica': 'Informática',
  'raciocinio logico': 'Raciocínio Lógico',
  'rlm': 'Raciocínio Lógico',
  'estatistica': 'Estatística',
  'direito constitucional': 'Dir. Constitucional',
  'dir constitucional': 'Dir. Constitucional',
  'direito administrativo': 'Dir. Administrativo',
  'dir administrativo': 'Dir. Administrativo',
  'direito penal': 'Dir. Penal',
  'direito processual penal': 'Dir. Processual Penal',
  'direito civil': 'Dir. Civil',
  'direito processual civil': 'Dir. Processual Civil',
  'direito do trabalho': 'Dir. do Trabalho',
  'direito tributario': 'Dir. Tributário'
};

const TOPIC_MAP = {
  'rlm': 'Raciocínio Lógico',
  'ti': 'Tecnologia da Informação',
  'tic': 'TIC',
  'sus': 'SUS',
  'clt': 'CLT'
};

const PREPOSITIONS = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'com', 'em', 'no', 'na', 'por', 'para']);

export const formatTitleCase = (str) => {
    if (!str || typeof str !== 'string') return '';
    return String(str)
        .split(' ')
        .filter(Boolean)
        .map((word, index) => {
            const lower = word.toLowerCase();
            if (index > 0 && PREPOSITIONS.has(lower)) {
                return lower;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
};

/**
 * Canonical display name resolver for subjects.
 * Single source of truth — respects 'Meu Painel' categories if provided.
 */
export const displaySubject = (name, categories = []) => {
    if (!name) return '';
    const nameStr = typeof name === 'object' && name.name ? String(name.name) : String(name);
    if (!nameStr.trim()) return '';

    if (Array.isArray(categories) && categories.length > 0) {
        const normName = normalize(nameStr);

        const byId = categories.find(c => c && String(c.id) === nameStr);
        if (byId?.name) return byId.name;

        const byNormName = categories.find(c => c && normalize(c.name || '') === normName);
        if (byNormName?.name) return byNormName.name;

        const byNormId = categories.find(c => c && normalize(String(c.id || '')) === normName);
        if (byNormId?.name) return byNormId.name;
    }
    const norm = normalize(nameStr);
    return SUBJECT_MAP[norm] || formatTitleCase(nameStr);
};

export const displayTopic = (name) => {
  const str = String(name || '').trim();
  if (!str) return '';

  const norm = normalize(str);

  if (TOPIC_MAP[norm]) return TOPIC_MAP[norm];

  if (/^[A-Z0-9]{2,6}$/i.test(str) && str === str.toUpperCase()) {
    return str;
  }

  return formatTitleCase(str);
};


`

## src/hooks/useMonteCarloStats.js

`javascript
// ✅ LOTE-04 FIX: default import React removido (não há JSX neste hook)
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { computeNonLinearTrend } from '../engine/projection';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { normalCDF_complement } from '../engine/math/gaussian.js';
import {
  shrinkProbabilityToNeutral,
  recordPredictionEvent,
  backfillObservedFromSimulados,
  computeCalibrationSummary
} from '../utils/calibration.js';
import {
  getConfidenceTier,
  buildHumanExplanation,
  detectPerformanceDrift,
  humanizeVolatility,
  validatePrediction
} from '../utils/explanationEngine.js';
import { getFlashcardImmunity } from '../utils/analytics.js';
import {
  MAX_CALIBRATION_PENALTY,
  sanitizeWeightUnit,
  regularizeVolatility,
  computeCalibrationPenalty,
  generateAnalyticsStats
} from '../engine/analyticsStats.js';

const EMPTY_ARRAY = Object.freeze([]);
const BASE_SIMULATIONS = 5000;
const LOG_DAMPING_FACTOR = 45;

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// T-005 FIX: clamp defensivo que NÃO empurra NaN para o mínimo.
// Em projeções estatísticas, NaN deve cair para um valor neutro/seguro,
// não para o pior caso silenciosamente.
const safeClamp = (value, min, max, fallback = null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback !== null && fallback !== undefined
      ? fallback
      : (min + max) / 2;
  }
  return Math.min(max, Math.max(min, n));
};

// FIX: encolhimento simétrico de probabilidade extrema em direção ao neutro
const shrinkToNeutral = (p, factor, neutral = 50) => {
  const safeP = Number.isFinite(p) ? p : neutral;
  const safeFactor = clamp(factor, 0, 1);
  return neutral + (safeP - neutral) * (1 - safeFactor);
};

export function useMonteCarloStats({
  categories,
  goalDate,
  targetScore,
  timeIndex,
  timelineDates,
  minScore,
  maxScore,
  effectiveSimulateToday,
  simuladoRows: propSimuladoRows,
  // T-040 FIX: permite adiar o cálculo pesado de probabilidades por matéria
  enablePerSubject = false
}) {
  const activeId = useAppStore(state => state.appState?.activeId);

  const weights = useAppStore(useShallow(state => state.appState?.contests?.[activeId]?.mcWeights || {}));
  const equalWeightsMode = useAppStore(state => state.appState?.mcEqualWeights ?? true);

  const mcHistory = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.monteCarloHistory;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const flashcardDecks = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.flashcardDecks;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const historicalCutoffs = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.historicalCutoffs;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

    // ✅ LOTE-03 FIX (A2): assinar APENAS simuladoRows em vez do concurso inteiro.
    // Antes, qualquer campo do concurso (studyLogs, flashcards, tasks, sessões...)
    // trocava a referência de `contest` e re-renderizava os DOIS gauges.
    const contestSimuladoRows = useAppStore(state => state.appState?.contests?.[activeId]?.simuladoRows);

  const calibrationEvents = useAppStore(useShallow(state => {
    const evs = state.appState?.contests?.[activeId]?.calibrationEvents;
    return Array.isArray(evs) ? evs : Object.values(evs || {});
  }));

  const examDurationMinutes = useAppStore(state => state.appState?.contests?.[activeId]?.examDurationMinutes || 240);
  const defaultExamTotalQuestions = useAppStore(state => state.appState?.contests?.[activeId]?.examTotalQuestions || 100);

    const rawSimuladoRows = useMemo(() => {
        const source = propSimuladoRows ?? contestSimuladoRows ?? [];
        // ✅ LOTE-03 FIX (M8): simuladoRows podem vir como OBJETO no Firebase.
        // O guard `rawSimuladoRows.length === 0` do efeito de backfill falhava
        // silenciosamente com objetos (undefined !== 0) e .map() quebraria.
        return Array.isArray(source) ? source : Object.values(source);
    }, [propSimuladoRows, contestSimuladoRows]);

  const calibrationSummary = useMemo(() => {
    if (calibrationEvents.length < 3) return null;

    try {
      return computeCalibrationSummary(calibrationEvents, { bins: 6 });
    } catch {
      return null;
    }
  }, [calibrationEvents]);

  const modelHealth = useMemo(() => {
    if (!calibrationSummary) return 0.5;

    const brierHealth = Math.max(0, Math.min(1, 1 - (calibrationSummary.avgBrier - 0.12) / 0.2));
    const trendHealth = calibrationSummary.trend === 'improving'
      ? 0.2
      : (calibrationSummary.trend === 'degrading' ? -0.2 : 0);

    return Math.max(0.1, Math.min(1, (brierHealth + 0.5 + trendHealth) / 1.5));
  }, [calibrationSummary]);

  const modelWeight = useMemo(() => {
    if (!calibrationSummary || !calibrationSummary.avgBrier) return 0.25;

    const brier = Math.max(0.12, Math.min(0.3, calibrationSummary.avgBrier));
    return Math.max(0.1, Math.min(0.45, 0.25 + (0.18 - brier) * 2.5));
  }, [calibrationSummary]);

  const dynamicSimulations = useMemo(() => {
    let sims = BASE_SIMULATIONS;

    if (calibrationSummary && calibrationSummary.avgBrier > 0.2) {
      sims = Math.min(15000, BASE_SIMULATIONS + Math.floor((calibrationSummary.avgBrier - 0.18) * 20000));
    }

    if (modelHealth > 0.8) {
      sims = Math.max(2000, Math.floor(sims * 0.8));
    } else if (modelHealth < 0.4) {
      sims = Math.min(20000, Math.floor(sims * 1.3));
    }

    return sims;
  }, [calibrationSummary, modelHealth]);

  const dynamicSimulationsRef = useRef(dynamicSimulations);
  useEffect(() => {
    dynamicSimulationsRef.current = dynamicSimulations;
  }, [dynamicSimulations]);

  const modelWeightRef = useRef(modelWeight);
  useEffect(() => {
    modelWeightRef.current = modelWeight;
  }, [modelWeight]);

  const setWeights = useAppStore(state => state.setMonteCarloWeights);
  const recordMonteCarloSnapshot = useAppStore(state => state.recordMonteCarloSnapshot);
  const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

  // T-018/T-024 FIX: normalizar categories antes de filter
  const safeCategories = useMemo(() => {
    return Array.isArray(categories)
      ? categories
      : Object.values(categories || {});
  }, [categories]);

  const activeCategories = useMemo(() =>
    safeCategories.filter(c => {
      const h = c.simuladoStats?.history;
      const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
      return hLen > 0;
    }),
    [safeCategories]
  );

  const getEqualWeights = useCallback(() => {
    if (activeCategories.length === 0) return {};

    const newWeights = {};
    activeCategories.forEach(cat => {
      newWeights[cat.id || cat.name] = 1;
    });

    return newWeights;
  }, [activeCategories]);

  const weightsKey = useMemo(() => {
    if (equalWeightsMode) return JSON.stringify(getEqualWeights());
    return JSON.stringify(weights || {});
  }, [equalWeightsMode, weights, getEqualWeights]);

  const effectiveWeights = useMemo(() => {
    if (equalWeightsMode) return getEqualWeights();
    if (!weights) return getEqualWeights();

    const weightsMap = {};

    activeCategories.forEach(cat => {
      const stored = weights[cat.id || cat.name];
      const w = sanitizeWeightUnit(stored);
      weightsMap[cat.id || cat.name] = (stored !== undefined && stored !== null) ? Math.max(0, w) : 1;
    });

    return weightsMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightsKey, activeCategories.length]);

  const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
  const [debouncedWeights, setDebouncedWeights] = useState(() => effectiveWeights);

  const lastRecordedGlobalPredRef = useRef('');
  const lastRecordedSubjectPredsRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
    return () => clearTimeout(timer);
  }, [targetScore]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
    return () => clearTimeout(timer);
  }, [effectiveWeights]);

  const projectDays = useMemo(() => {
    if (effectiveSimulateToday) return 0;
    if (!goalDate) return 30;

    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (timeIndex >= 0 && timeIndex < timelineDates.length) {
      // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
      // normalizeDate costuma ancorar melhor a data no helper do projeto.
      const parsedTimelineDate = normalizeDate(timelineDates[timeIndex]) ||
        new Date(timelineDates[timeIndex] + 'T12:00:00');

      if (Number.isFinite(parsedTimelineDate?.getTime())) {
        currentDate = parsedTimelineDate;
        currentDate.setHours(0, 0, 0, 0);
      }
    }

    let goal;
    if (typeof goalDate === 'string') {
      goal = normalizeDate(goalDate);
    } else {
      goal = new Date(goalDate);
    }

    goal.setHours(0, 0, 0, 0);

    if (!Number.isFinite(goal.getTime())) return 30;

    // T-024/T-025 FIX: fallback para data corrente inválida
    if (!Number.isFinite(currentDate.getTime())) {
      currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
    }

    const diffTime = goal.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const safeDays = diffDays > 0 ? diffDays : 0;

    return Math.min(3650, safeDays);
  }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

  const pureStatsData = useMemo(() => {
    return generateAnalyticsStats({
      // T-018 FIX: usar categorias já normalizadas
      categories: safeCategories,
      debouncedWeights,
      timeIndex,
      timelineDates,
      minScore,
      maxScore,
      simuladoRows: rawSimuladoRows
    });
  }, [safeCategories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore, rawSimuladoRows]);

    const calibrationPenalty = useMemo(() => {
        let pen = computeCalibrationPenalty(
            mcHistory,
            pureStatsData?.globalHistory,
            maxScore,
            calibrationSummary,
            minScore // ✅ LOTE-03 FIX (M9): resíduo normalizado pelo domínio real [min, max]
        );

    if (modelHealth < 0.6) {
      pen = Math.min(MAX_CALIBRATION_PENALTY, pen * (1 + (0.6 - modelHealth)));
    }

    return pen;
    }, [mcHistory, pureStatsData?.globalHistory, maxScore, minScore, calibrationSummary, modelHealth]);

  const statsData = useMemo(() => {
    if (!pureStatsData) return null;

    if (calibrationPenalty <= 0) {
      return { ...pureStatsData, calibrationPenalty: 0 };
    }

    const aleatoricFloor = maxScore * 0.02;

    const epistemicPooled = Math.max(0, pureStatsData.pooledSD - aleatoricFloor);
    const calibratedPooledSD = aleatoricFloor + (epistemicPooled * (1 + calibrationPenalty * 2.5));

    const epistemicDaily = Math.max(0, pureStatsData.dailySD - aleatoricFloor);
    const calibratedDailySD = aleatoricFloor + (epistemicDaily * (1 + calibrationPenalty * 2.5));

    return {
      ...pureStatsData,
      pooledSD: calibratedPooledSD,
      dailySD: calibratedDailySD,
      rawPooledSD: pureStatsData.pooledSD,
      calibrationPenalty
    };
  }, [pureStatsData, calibrationPenalty, maxScore]);

  // ✅ PATCH-04: Hash deve incluir o timeIndex para forçar re-cálculo quando muda o range de datas
  const pureStatsHash = `${pureStatsData?.statsHash || 'null'}-ti${timeIndex}`;

  const pureStatsDataRef = useRef(pureStatsData);
  useEffect(() => {
    pureStatsDataRef.current = pureStatsData;
  }, [pureStatsData]);

  // T-012 FIX: Ref para usar statsData já calibrado dentro do efeito principal.
  // Sem isso, o motor calculava pooledSD/dailySD calibrados mas continuava
  // usando pureStatsData na simulação.
  const statsDataRef = useRef(statsData);
  useEffect(() => {
    statsDataRef.current = statsData;
  }, [statsData]);

  const { runAnalysis } = useMonteCarloWorker();
  const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

  useEffect(() => {
    if (!rawSimuladoRows || rawSimuladoRows.length === 0) return;
    if (!calibrationEvents || calibrationEvents.length === 0) return;

    try {
      const backfilled = backfillObservedFromSimulados(
        calibrationEvents,
        rawSimuladoRows,
        statsData?.categoryStats || [],
        maxScore
      );

      if (!Array.isArray(backfilled)) return;

      const changed = JSON.stringify(backfilled.slice(-3)) !== JSON.stringify(calibrationEvents.slice(-3));

      if (changed) {
        const setD = useAppStore.getState().setData;
        if (setD) {
          setD(c => ({ ...c, calibrationEvents: backfilled }));
        }
      }
    } catch {
      // ignore
    }
  }, [rawSimuladoRows, maxScore, calibrationEvents, statsData?.categoryStats]);

    const projectDaysRef = useRef(projectDays);
  useEffect(() => { projectDaysRef.current = projectDays; }, [projectDays]);

  const minScoreRef = useRef(minScore);
  useEffect(() => { minScoreRef.current = minScore; }, [minScore]);

  const maxScoreRef = useRef(maxScore);
  useEffect(() => { maxScoreRef.current = maxScore; }, [maxScore]);

  const examDurationRef = useRef(examDurationMinutes);
  useEffect(() => { examDurationRef.current = examDurationMinutes; }, [examDurationMinutes]);

  const examQuestionsRef = useRef(defaultExamTotalQuestions);
  useEffect(() => { examQuestionsRef.current = defaultExamTotalQuestions; }, [defaultExamTotalQuestions]);

  const flashcardDecksRef = useRef(flashcardDecks);
  useEffect(() => { flashcardDecksRef.current = flashcardDecks; }, [flashcardDecks]);

  const historicalCutoffsRef = useRef(historicalCutoffs);
  useEffect(() => { historicalCutoffsRef.current = historicalCutoffs; }, [historicalCutoffs]);

  const rawSimuladoRowsRef = useRef(rawSimuladoRows);
  useEffect(() => { rawSimuladoRowsRef.current = rawSimuladoRows; }, [rawSimuladoRows]);

useEffect(() => {
    const rawPureStatsData = pureStatsDataRef.current;

    // T-012 FIX: usa statsData calibrado quando disponível.
    // Mantemos o nome `pureStatsData` para não precisar reescrever o efeito inteiro.
    const pureStatsData = statsDataRef.current || rawPureStatsData;

    if (!pureStatsData) {
      setSimulationData({ status: 'waiting', missing: 'data' });
      return;
    }

    let totalPoints = 0;
    pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
    if (totalPoints < 1) return;

    let cancelled = false;

    const isFuture = projectDaysRef.current > 0;
    const domain = Math.max(1e-6, maxScoreRef.current - minScoreRef.current);

    const { globalImmunityFactor, subjectImmunityMap } = getFlashcardImmunity(flashcardDecksRef.current);

    const applyConservativeTrendCap = (result) => {
      if (
        result &&
        result.trendType === 'log_time_available' &&
        Number.isFinite(result.projectedMean) &&
        Number.isFinite(result.currentMean) &&
        result.projectedMean > result.currentMean
      ) {
        // FIX: remove o boost otimista de +10% e aplica apenas teto conservador
        result.projectedMean = Math.min(
          result.projectedMean,
          result.currentMean + (domain * 0.15)
        );
      }

      return result;
    };

    const doAnalysis = async () => {
      try {
        let result;

        if (isFuture && pureStatsData.globalHistory?.length > 0) {
          const regularizedSD = regularizeVolatility(
            pureStatsData.dailySD,
            projectDaysRef.current,
            pureStatsData.globalHistory.length,
            domain
          );

          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.volatility ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity
            };
          });

          let totalGlobalTimeSpent = 0;
          let totalGlobalTimedQuestions = 0;

          // T-018/T-024 FIX: usar categorias já normalizadas no hook
          const safeTimeCategories = safeCategories;

          safeTimeCategories.forEach(cat => {
            const rawHistory = cat?.simuladoStats?.history;

            const histArray = Array.isArray(rawHistory)
              ? rawHistory
              : Object.values(rawHistory || {});

            histArray.forEach(h => {
              const timeSpent = Number(h?.timeSpent);
              const timedQuestoes = Number(h?.timedQuestoes);

              if (
                Number.isFinite(timeSpent) &&
                Number.isFinite(timedQuestoes) &&
                timeSpent > 0 &&
                timedQuestoes > 0
              ) {
                totalGlobalTimeSpent += timeSpent;
                totalGlobalTimedQuestions += timedQuestoes;
              }
            });
          });

          const globalAvgSeconds = totalGlobalTimedQuestions > 0
            ? (totalGlobalTimeSpent / totalGlobalTimedQuestions)
            : 0;

          const projectedTotalTimeSeconds = examQuestionsRef.current * globalAvgSeconds;

          result = await runAnalysis({
            values: pureStatsData.globalHistory,
            dates: pureStatsData.globalHistory.map(h => h.date),
            meta: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            projectionDays: projectDaysRef.current,
            forcedVolatility: regularizedSD,
            forcedBaseline: pureStatsData.bayesianMean,
            currentMean: pureStatsData.bayesianMean,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            projectedTotalTimeSeconds,
            examDurationMinutes: examDurationRef.current,
            flashcardImmunity: globalImmunityFactor,
            // T-014 FIX: cortes históricos também no caminho principal
            historicalCutoffs: historicalCutoffsRef.current,
            // ✅ LOTE-04 FIX (A4): chave estável evita re-serialização do payload
            // ✅ LOTE-06 FIX (BUG-C05): cacheKey deve incluir debouncedTarget
            cacheKey: `${pureStatsHash}-t${projectDaysRef.current}-s${dynamicSimulationsRef.current}-tgt${debouncedTarget}`
          });
        } else {
          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.bayesianSd ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity
            };
          });

          const normalSD = regularizeVolatility(
            pureStatsData.pooledSD,
            0, // horizonte "hoje"
            pureStatsData.globalHistory?.length || 1,
            domain
          );

          const normalPayload = {
            mode: 'normal',
            mean: pureStatsData.bayesianMean,
            sd: normalSD,
            targetScore: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            currentMean: pureStatsData.bayesianMean,
            bayesianCI: pureStatsData.bayesianCI,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            flashcardImmunity: globalImmunityFactor,
            // T-014 FIX: cortes históricos também no modo normal
            historicalCutoffs: historicalCutoffsRef.current
          };

          // Compatibilidade dupla:
          // 1) tenta API por objeto
          // 2) se não retornar probabilidade válida, tenta API posicional antiga
          result = await runAnalysis(normalPayload);

          if (!result || result.probability == null) {
            // ✅ LOTE-01 FIX: fallback síncrono com a MESMA API de objeto
            result = simulateNormalDistribution({ ...normalPayload, historicalCutoffs: historicalCutoffsRef.current });
          }
        }

        if (!cancelled) {
          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          setSimulationData({ status: 'ready', data: result });

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: só gravar eventos de calibração para previsões futuras.
            // Eventos do modo "hoje" não devem alimentar calibração.
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      } catch (err) {
        console.warn('[MC Worker] Simulation failed, using sync fallback:', err);

        if (!cancelled) {
          let result;

          const regularizedSD = isFuture && pureStatsData.globalHistory?.length > 0
            ? regularizeVolatility(
                pureStatsData.dailySD,
                projectDaysRef.current,
                pureStatsData.globalHistory.length,
                domain
              )
            : pureStatsData.dailySD;

          if (isFuture && pureStatsData.globalHistory?.length > 0) {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.volatility ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity
              };
            });

            result = runMonteCarloAnalysis({
              values: pureStatsData.globalHistory,
              dates: pureStatsData.globalHistory.map(h => h.date),
              meta: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              projectionDays: projectDaysRef.current,
              forcedVolatility: regularizedSD,
              forcedBaseline: pureStatsData.bayesianMean,
              currentMean: pureStatsData.bayesianMean,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              subjects: subjectsOpts,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              // T-014 FIX: cortes históricos também no fallback futuro
              historicalCutoffs: historicalCutoffsRef.current
            });
          } else {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.bayesianSd ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity
              };
            });

            result = simulateNormalDistribution({
              mean: pureStatsData.bayesianMean,
              sd: regularizeVolatility(pureStatsData.pooledSD, 0, pureStatsData.globalHistory?.length || 1, domain),
              targetScore: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              currentMean: pureStatsData.bayesianMean,
              bayesianCI: pureStatsData.bayesianCI,
              historicalCutoffs: historicalCutoffsRef.current,
              subjects: subjectsOpts,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historyLength: pureStatsData.globalHistory?.length || 0
            });
          }

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          setSimulationData({ status: 'ready', data: result });

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: também proteger o fallback síncrono
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      }
    };

    const timerId = setTimeout(doAnalysis, 150);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
        // ✅ LOTE-03 FIX (A7): o efeito captura safeCategories no closure para o
        // cálculo de agilidade (timeSpent/timedQuestoes). Antes, entrava apenas
        // indiretamente via pureStatsHash — mudanças estruturais nas categorias
        // que não alterassem o hash usavam dados stale.
    }, [
        pureStatsHash,
        runAnalysis,
        debouncedTarget,
        calibrationPenalty,
        projectDays,
        effectiveSimulateToday,
        safeCategories,
        statsData?.estimatedRho
    ]);

  const probabilityData = useMemo(() => {
    const rawProbability = simulationData?.data?.probability ?? 0;

    // FIX: neutral da probabilidade deve ser 50%, não a média bayesiana da nota
    let adjustedProb = shrinkProbabilityToNeutral(rawProbability, calibrationPenalty, 50, 0.5);

    let confFactor = 0;

    if (
      simulationData?.data?.ciConformalLow != null &&
      simulationData?.data?.ciConformalHigh != null
    ) {
      const confWidth = simulationData.data.ciConformalHigh - simulationData.data.ciConformalLow;

      if (confWidth > 0) {
        // T-017 FIX: proteger domínio inválido/zero antes de dividir
        const confDomain = Math.max(1e-9, Number(maxScore) - Number(minScore));

        confFactor = Math.min(0.2, confWidth / (confDomain * 1.2)) * (1 - modelWeight);

        // FIX: shrink simétrico (tanto >50 quanto <50)
        adjustedProb = shrinkToNeutral(adjustedProb, confFactor, 50);
      }
    }

    let finalProb = adjustedProb;

    if (modelHealth > 0.7) {
      const trust = (modelHealth - 0.7) / 0.3;
      finalProb = finalProb * (1 - trust * 0.5) + (rawProbability * (1 - calibrationPenalty * 0.5)) * (trust * 0.5);
    }

    // FIX: saúde do modelo não deve mascarar risco crítico puxando tudo para 50.
    // Aplicamos apenas uma suavização leve quando a saúde está baixa.
    let healthProb = finalProb;

    if (modelHealth < 0.5) {
      const healthFactor = (0.5 - modelHealth) / 0.5;
      healthProb = shrinkToNeutral(healthProb, healthFactor * 0.15, 50);
    }

    const prob = clamp(healthProb, 0, 100);

    // FIX: expor incerteza e limites para decisão conservadora
    const uncertainty =
      ((1 - modelHealth) * 12) +
      (calibrationPenalty * 35) +
      (confFactor * 20);

    const probabilityLower = clamp(prob - uncertainty, 0, 100);
    const probabilityUpper = clamp(prob + uncertainty, 0, 100);

    const healthAdjustedProb = clamp(
      prob * modelHealth + (50 * (1 - modelHealth)),
      0,
      100
    );

    const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const pMean = clamp(rawProjectedMean, minScore, maxScore);

    const cMean = (
      pureStatsData?.bayesianMean === null ||
      pureStatsData?.bayesianMean === undefined ||
      pureStatsData?.bayesianMean === ''
    )
      ? (simulationData?.data?.currentMean ?? pMean)
      : (
          Number.isFinite(Number(pureStatsData.bayesianMean))
            ? Number(pureStatsData.bayesianMean)
            : (simulationData?.data?.currentMean ?? pMean)
        );

    return {
      probability: prob,
      probabilityLower,
      probabilityUpper,
      projectedMean: pMean,
      currentMean: cMean,
      healthAdjustedProb,
      rawProbability,
      uncertainty
    };
  }, [
    simulationData,
    pureStatsData,
    maxScore,
    minScore,
    calibrationPenalty,
    modelHealth,
    modelWeight
  ]);

  const probabilityDataResult = probabilityData;

  const probability = probabilityDataResult.probability;
  const probabilityLower = probabilityDataResult.probabilityLower;
  const probabilityUpper = probabilityDataResult.probabilityUpper;
  const projectedMean = probabilityDataResult.projectedMean;
  const currentMean = probabilityDataResult.currentMean;
  const rawProbability = probabilityDataResult.rawProbability;
  const probabilityUncertainty = probabilityDataResult.uncertainty;

  const healthAdjustedProb = probabilityDataResult.healthAdjustedProb ?? clamp(
    (probabilityDataResult.probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
    0,
    100
  );

  const effectiveSimulationData = useMemo(() => {
    if (!statsData) return { status: 'waiting', missing: 'data' };

    let totalPoints = 0;
    statsData.categoryStats.forEach(cat => {
      totalPoints += cat.n || 1;
    });

    if (totalPoints < 1) return { status: 'waiting', missing: 'count', count: totalPoints };

    const base = simulationData;

    if (base?.status === 'ready' && base.data) {
      return {
        ...base,
        data: {
          ...base.data,
          calibrationSummary,
          diagnostics: {
            ...(base.data.diagnostics || {}),
            calibrationSummary,
            modelHealth,
            modelWeight
          },
          healthAdjustedProb: base.data.healthAdjustedProb ?? healthAdjustedProb,
          probabilityLower: base.data.probabilityLower ?? probabilityLower,
          probabilityUpper: base.data.probabilityUpper ?? probabilityUpper
        }
      };
    }

    return base;
  }, [
    statsData,
    simulationData,
    calibrationSummary,
    modelHealth,
    modelWeight,
    healthAdjustedProb,
    probabilityLower,
    probabilityUpper
  ]);

  const perSubjectProbs = useMemo(() => {
    // T-040 FIX: só calcular probabilidades por matéria quando o painel estiver aberto.
    // Isso evita simulações pesadas desnecessárias no primeiro render.
    if (!enablePerSubject || !statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

    return statsData.categoryStats
      .filter(cat => cat.weight > 0)
      .map(cat => {
        const catMaxScore = Number(cat.maxScore) || maxScore;
        const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;

        const currentBaseline = cat.bayesianMean ?? cat.mean;

        // T-004 FIX: trend pode vir como string ('up'/'down'/'stable').
        // Converter com segurança para número antes de qualquer aritmética.
        const rawTrend = cat.trendValue ?? cat.trend ?? 0;
        const trendPer30Days = Number.isFinite(Number(rawTrend)) ? Number(rawTrend) : 0;

        const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
        const dailyTrend = trendPer30Days / 30;

        let totalTrendProjection = dailyTrend * projectedDaysAmortized;

        try {
          const simHistory = cat.simuladoStats?.history || cat.history || [];

          if (Array.isArray(simHistory) && simHistory.length >= 4) {
            const nl = computeNonLinearTrend(simHistory, catMaxScore);

            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
              const nlWeight = modelWeight;
              const nlProjection = nl.slope * (projectedDaysAmortized / 30);
              totalTrendProjection = totalTrendProjection * (1 - nlWeight) + nlProjection * nlWeight;
            }
          }
        } catch {
          // ignore
        }

        // FIX: reduzir projeção quando a tendência é fraca perto da incerteza
        const trendUncertainty = Number(cat.bayesianSd ?? cat.sd ?? 0);
        const trendSignificance = Math.abs(trendPer30Days) / Math.max(1e-6, trendUncertainty);

        if (trendSignificance < 0.5) {
          totalTrendProjection *= 0.5;
        }

        // T-005 FIX: limitar projeção de tendência a ±15% do domínio da disciplina.
        // Se o cálculo produzir NaN, cai para 0 (sem projeção) em vez de -15%.
        totalTrendProjection = safeClamp(
          totalTrendProjection,
          -0.15 * catMaxScore,
          0.15 * catMaxScore,
          0 // fallback neutro: nenhuma projeção de tendência
        );

        // T-005 FIX: se a soma baseline + tendência produzir NaN,
        // mantém o baseline atual em vez de despencar para catMinScore.
        const baseline = (!effectiveSimulateToday && projectDays > 0)
          ? safeClamp(
              currentBaseline + totalTrendProjection,
              catMinScore,
              catMaxScore,
              currentBaseline // fallback: permanece onde está
            )
          : currentBaseline;

        // ✅ LOTE-01 FIX: meta projetada no INTERVALO real, respeitando minScore
        const globalRange = Math.max(1e-9, Number(maxScore) - Number(minScore));
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);
        const targetRatio = clamp((Number(debouncedTarget) - Number(minScore)) / globalRange, 0, 1);
        const subjectTarget = clamp(catMinScore + targetRatio * catRange, catMinScore, catMaxScore);

        const result = simulateNormalDistribution({
          mean: baseline,
          sd: cat.bayesianSd ?? cat.sd,
          targetScore: subjectTarget,   // ✅ LOTE-01 FIX
          simulations: Math.min(dynamicSimulations || 2000, 3000),
          categoryName: cat.name,
          minScore: catMinScore,
          maxScore: catMaxScore,
          simuladoRows: rawSimuladoRows,
          subjects: [{ name: cat.name }],
          historyLength: cat.n || 0,
          bayesianCI: cat.bayesianCI || null
        });

        const subjDiag = {
          ...(result.diagnostics || {}),
          trendType: result.trendType || 'linear',
          calibrationSummary,
          modelHealth,
          modelWeight
        };

        let subjProb = result.probability;
        let subjConfFactor = 0;

        if (result.ciConformalLow != null && result.ciConformalHigh != null) {
          const subjConfWidth = result.ciConformalHigh - result.ciConformalLow;

          if (subjConfWidth > 0) {
            subjConfFactor = Math.min(0.15, subjConfWidth / (catMaxScore * 1.5)) * (1 - modelWeight);

            if (modelHealth < 0.6) {
              subjConfFactor = Math.min(0.25, subjConfFactor * 1.4);
            }

            // FIX: shrink simétrico também por disciplina
            subjProb = shrinkToNeutral(subjProb, subjConfFactor, 50);
          }
        }

        if (modelHealth > 0.7) {
          const trust = (modelHealth - 0.7) / 0.3;
          subjProb = subjProb * (1 - trust * 0.4) + result.probability * (trust * 0.4);
        }

        const subjUncertainty =
          ((1 - modelHealth) * 10) +
          (calibrationPenalty * 30) +
          (subjConfFactor * 18);

        return {
          name: cat.name,
          prob: clamp(subjProb, 0, 100),
          probabilityLower: clamp(subjProb - subjUncertainty, 0, 100),
          probabilityUpper: clamp(subjProb + subjUncertainty, 0, 100),
          mean: baseline,
          trend: cat.trend,
          diagnostics: subjDiag,
          ciConformalLow: result.ciConformalLow,
          ciConformalHigh: result.ciConformalHigh,
          ciLow: result.ciConformalLow ?? result.ci95Low,
          ciHigh: result.ciConformalHigh ?? result.ci95High,
          modelHealth,
          modelWeight,
          healthAdjustedProb: clamp(
            subjProb * modelHealth + (50 * (1 - modelHealth)),
            0,
            100
          )
        };
      }); // ordem estável = ordem das categorias (idêntica nos dois gauges)
  }, [
    statsData,
    debouncedTarget,
    simulationData?.status,
    maxScore,
    effectiveSimulateToday,
    projectDays,
    minScore,
    modelHealth,
    modelWeight,
    rawSimuladoRows,
    calibrationSummary,
    dynamicSimulations,
    calibrationPenalty,
    // T-040 FIX: reagir à abertura/fechamento do painel de matérias
    enablePerSubject
  ]);

  useEffect(() => {
    // T-015 FIX: não gravar calibração de subjects em modo "hoje"
    if (projectDays <= 0) return;

    if (!perSubjectProbs || perSubjectProbs.length === 0 || simulationData?.status !== 'ready') return;

    try {
      const hash = `${pureStatsHash}-${debouncedTarget}`;
      if (lastRecordedSubjectPredsRef.current === hash) return;

      lastRecordedSubjectPredsRef.current = hash;

      const setDataFn = useAppStore.getState().setData;
      if (!setDataFn) return;

      perSubjectProbs.forEach(subj => {
        if (subj.prob == null) return;

        const ev = recordPredictionEvent({
          timestamp: Date.now(),
          probability: Number(subj.prob) / 100,
          targetScore: debouncedTarget,
          sims: 500,
          category: subj.name || 'subject',
          effectiveN: subj.diagnostics?.effectiveN
        });

        if (ev) {
          setDataFn(contest => {
            const evs = Array.isArray(contest.calibrationEvents)
              ? [...contest.calibrationEvents]
              : [];

            evs.push(ev);

            return {
              ...contest,
              calibrationEvents: evs.slice(-200)
            };
          });
        }
      });
    } catch {
      // ignore
    }
  }, [
    perSubjectProbs,
    debouncedTarget,
    simulationData?.status,
    pureStatsHash,
    // T-015 FIX: dependência explícita do modo futuro/hoje
    projectDays
  ]);

  const derivedMetrics = useMemo(() => {
    let sd = simulationData?.data?.sd ?? 0;
    let sdLeft = simulationData?.data?.sdLeft ?? sd;
    let sdRight = simulationData?.data?.sdRight ?? sd;

    let ci95Low = simulationData?.data?.ciConformalLow ?? simulationData?.data?.ci95Low ?? 0;
    let ci95High = simulationData?.data?.ciConformalHigh ?? simulationData?.data?.ci95High ?? 0;

    if (simulationData?.data?.ciConformalLow != null) {
      ci95Low = simulationData.data.ciConformalLow;
      ci95High = simulationData.data.ciConformalHigh;
    }

    const effectiveDrift = simulationData?.data?.diagnostics?.effectiveDriftSlope ?? (simulationData?.data?.drift / 30 || 0);

    if (calibrationPenalty > 0) {
      const ciMid = (ci95Low + ci95High) / 2;
      const ciExpand = 1 + (calibrationPenalty * 2.5);

      ci95Low = Math.max(minScore, ciMid - ((ciMid - ci95Low) * ciExpand));
      ci95High = Math.min(maxScore, ciMid + ((ci95High - ciMid) * ciExpand));

      sd = sd * (1 + calibrationPenalty * 2.5);
      sdLeft = sdLeft * (1 + calibrationPenalty * 2.5);
      sdRight = sdRight * (1 + calibrationPenalty * 2.5);
    }

    // T-017 FIX: domínio seguro para evitar divisão por zero ou negativa
    const domainWidth = Math.max(1e-9, Number(maxScore) - Number(minScore));
    const icWidth = ci95High - ci95Low;

    const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
    const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));

    const pAdjusted = probability;

    // FIX: piso mínimo de volatilidade para evitar probabilidade degenerada
    // T-017 FIX: usar domínio seguro em vez de maxScore bruto
    const safeSdForTrend = Math.max(
      Number.isFinite(sd) && sd > 0 ? sd : 1,
      domainWidth * 0.02
    );

    const pTrend = normalCDF_complement((debouncedTarget - projectedMean) / safeSdForTrend) * 100;

    const nHistory = Array.isArray(statsData?.globalHistory)
      ? statsData.globalHistory.length
      : (timelineDates?.length || 0);

    const confidenceObj = getConfidenceTier({
      calibrationPenalty,
      volatility: sd,
      sampleSize: nHistory
    });

    const explanations = buildHumanExplanation({
      calibrationPenalty,
      volatility: sd,
          trend: (projectedMean - currentMean),
      confidenceTier: confidenceObj.tier,
      intervalWidth: ci95High - ci95Low
    });

    const driftAlerts = detectPerformanceDrift({
      recentMean: currentMean,
      baselineMean: (statsData?.bayesianMean || currentMean),
      recentVolatility: sdLeft,
      maxScore: Number(maxScore) || 100
    });

    const humanVol = humanizeVolatility(sdLeft);

    try {
      validatePrediction({
        probability: pAdjusted,
        interval: { low: ci95Low, high: ci95High },
        confidenceTier: confidenceObj.tier
      });
    } catch (e) {
      console.error('Monte Carlo Validation Error:', e);
    }

    return {
      sd,
      sdLeft,
      sdRight,
      ci95Low,
      ci95High,
      saturation,
      projectionConfidence,
      pAdjusted,
      pTrend,
      probability: pAdjusted,
      probabilityLower,
      probabilityUpper,
      rawProbability,
      probabilityUncertainty,
      confidenceTier: confidenceObj.label,
      confidenceColor: confidenceObj.tier === 'HIGH'
        ? 'text-emerald-400'
        : confidenceObj.tier === 'MEDIUM'
          ? 'text-amber-400'
          : 'text-rose-400',
      confidenceObj,
      explanations,
      humanVol,
      driftAlerts,
      ciConformalLow: simulationData?.data?.ciConformalLow,
      ciConformalHigh: simulationData?.data?.ciConformalHigh,
      trendType: simulationData?.data?.trendType || 'linear',
      calibrationSummary,
      effectiveDrift,
      modelHealth,
      modelWeight
    };
  }, [
    simulationData?.data,
    maxScore,
    minScore,
    debouncedTarget,
    projectedMean,
    calibrationPenalty,
    currentMean,
    statsData,
    timelineDates,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    probabilityUncertainty,
    calibrationSummary,
    modelHealth,
    modelWeight
  ]);

  useMonteCarloHistoryRecorder({
    activeId,
    simulationData,
    timeIndex,
    timelineDates,
    effectiveSimulateToday,
    projectDays,
    goalDate,
    debouncedTarget,
    currentMean,
    projectedMean,
    pAdjusted: derivedMetrics.pAdjusted,
    ci95Low: derivedMetrics.ci95Low,
    ci95High: derivedMetrics.ci95High,
    calibrationSummary: derivedMetrics.calibrationSummary,
    trendType: derivedMetrics.trendType,
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight,
    recordMonteCarloSnapshot
  });

  const memoizedStats = useMemo(() => ({
    statsData,
    simulationData: effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb: healthAdjustedProb ?? clamp(
      (probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
      0,
      100
    ),
    ...derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    trendType: derivedMetrics.trendType || 'linear',
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight
  }), [
    statsData,
    effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb,
    derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    modelHealth
  ]);

  return useMemo(() => ({
    ...memoizedStats,
    isFlashing: false
  }), [memoizedStats]);
}

function useMonteCarloHistoryRecorder({
  activeId,
  simulationData,
  timeIndex,
  timelineDates,
  effectiveSimulateToday,
  projectDays,
  goalDate,
  debouncedTarget,
  currentMean,
  projectedMean,
  pAdjusted,
  ci95Low,
  ci95High,
  calibrationSummary,
  trendType,
  effectiveDrift,
  modelHealth,
  modelWeight,
  recordMonteCarloSnapshot
}) {
  const lastRecordTime = useRef(0);
  const lastRecordHash = useRef('');

  useEffect(() => {
    const prob = Number.isFinite(pAdjusted) ? pAdjusted : 0;
    const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

    if (
      simulationData?.status === 'ready' &&
      Number.isFinite(prob) &&
      prob >= 0 &&
      !effectiveSimulateToday &&
      !isTimeTraveling &&
      activeId
    ) {
      const doRecord = () => {
        const today = getDateKey(new Date());
        const currentProb = Number(prob.toFixed(1));

        const hash = `${activeId}-${today}-${currentProb}-${debouncedTarget.toFixed(1)}`;
        if (hash === lastRecordHash.current) return;

        const history = useAppStore.getState().appState?.contests?.[activeId]?.monteCarloHistory || [];
        const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;

        const currentTarget = Number(debouncedTarget.toFixed(1));
        const existingProb = Number((existing?.probability ?? existing?.prob ?? 0).toFixed(1));
        const existingTarget = Number((existing?.target ?? 0).toFixed(1));

        const targetChanged = !existing || Math.abs(existingTarget - currentTarget) > 0.05;

        const isCICollapsed = existing && Number.isFinite(existing.mean) && Number.isFinite(existing.ci95Low)
          ? Math.abs(existing.mean - existing.ci95Low) < 0.01
          : false;

        const needsUpdate = !existing || existing.ci95Low === undefined || (isCICollapsed && projectDays > 0);
        const probChanged = existing && Math.abs(existingProb - currentProb) > 0.3;

        if (probChanged || targetChanged || needsUpdate) {
          lastRecordTime.current = Date.now();
          lastRecordHash.current = hash;

          recordMonteCarloSnapshot(today, prob, {
            mean: Number(currentMean.toFixed(2)),
            projectedMean: Number(projectedMean.toFixed(2)),
            ci95Low: Number(ci95Low.toFixed(2)),
            ci95High: Number(ci95High.toFixed(2)),
            target: Number(debouncedTarget.toFixed(2)),
            targetDate: goalDate,
            trendType: trendType || 'linear',
            effectiveDrift: Number((effectiveDrift || 0).toFixed(4)),
            calibrationBrier: calibrationSummary ? Number(calibrationSummary.avgBrier || 0).toFixed(4) : null,
            modelHealth: Number((modelHealth || 0.5).toFixed(3)),
            modelWeight: Number((modelWeight || 0.25).toFixed(3))
          });
        }
      };

      const now = Date.now();
      const timeSinceLast = now - lastRecordTime.current;

      if (timeSinceLast < 5000) {
        const timerId = setTimeout(doRecord, 5000 - timeSinceLast);
        return () => clearTimeout(timerId);
      } else {
        doRecord();
      }
    }
  }, [
    simulationData?.status,
    effectiveSimulateToday,
    recordMonteCarloSnapshot,
    timeIndex,
    timelineDates,
    currentMean,
    projectedMean,
    debouncedTarget,
    activeId,
    ci95Low,
    ci95High,
    pAdjusted,
    goalDate,
    projectDays,
    calibrationSummary,
    effectiveDrift,
    modelHealth,
    modelWeight,
    trendType
  ]);
}

`

## src/store/useAppStore.js

`javascript
import { safeClone } from './safeClone.js';
import { create, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { INITIAL_DATA } from '../data/initialData.js';
import { validateAppState } from './schemas.js';
import { createPomodoroSlice } from './slices/createPomodoroSlice.js';
import { createTaskSlice } from './slices/createTaskSlice.js';
import { createCategorySlice } from './slices/createCategorySlice.js';
import { createStudySlice } from './slices/createStudySlice.js';
import { createContestSlice } from './slices/createContestSlice.js';
import { createGamificationSlice } from './slices/createGamificationSlice.js';
import { createSimuladoSlice } from './slices/createSimuladoSlice.js';
import { createTrashSlice } from './slices/createTrashSlice.js';
import { createSettingsSlice } from './slices/createSettingsSlice.js';
import { createMonteCarloSlice } from './slices/createMonteCarloSlice.js';
import { clearCoachCaches } from '../utils/coachPipeline.js';

// --- IndexedDB Adapter (Clean & Async) ---
const saveTimeouts = {};
const savePromises = {}; // Novo rastreador de promises
let isStorageLocked = false;

const idbStorage = {
    getItem: async (name) => {
        try {
            const val = await idbGet(name);
            return val || null;
        } catch (e) {
            console.error('[Storage] Falha CRÍTICA ao ler IDB. Ativando LOCK de emergência:', e);
            isStorageLocked = true;
            return null;
        }
    },
    setItem: (name, value) => {
        return new Promise((resolve) => {
            if (isStorageLocked) {
                console.warn('[Storage] Operação ignorada. Lock de emergência ativo.');
                return resolve();
            }
            
            // Rejeita a promise pendente anterior para evitar dangling promises (Memory Leak)
            if (saveTimeouts[name]) {
                clearTimeout(saveTimeouts[name]);
                // Resolve a promise anterior em vez de rejeitar
                if (savePromises[name]) {
                    savePromises[name].resolve();
                }
            }
            
            savePromises[name] = { resolve };
            
            saveTimeouts[name] = setTimeout(async () => {
                try {
                    await idbSet(name, value);
                    savePromises[name]?.resolve();
                } catch (e) {
                    console.error('[Storage] Falha crítica ao escrever no IDB:', e);
                    try {
                        // Fallback emergencial para evitar perda total
                        localStorage.setItem(name, value);
                        console.warn('[Storage] Fallback localStorage usado para:', name);
                        savePromises[name]?.resolve();
                    } catch (fallbackErr) {
                        console.error('[Storage] Fallback localStorage também falhou:', fallbackErr);
                        savePromises[name]?.reject?.(fallbackErr);
                    }
                } finally {
                    delete savePromises[name];
                    delete saveTimeouts[name];
                }
            }, 250);
        });
    },
    removeItem: async (name) => {
        if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
        if (savePromises[name]) savePromises[name].reject(new Error('Removed'));
        try {
            await idbDel(name);
        } catch (e) {
            console.warn('[Storage] Falha ao remover do IDB:', e);
        }
    },
};

export const useAppStore = create(
    persist(
        temporal(
            immer((set, get) => ({
                appState: {
                    contests: { 'default': safeClone(INITIAL_DATA) },
                    activeId: 'default',
                    trash: [],
                    version: 0,
                    dashboardFilter: 'all',
                    hasSeenTour: false,
                    isHydrated: false, // Flag reativa de hidratação
                    pomodoro: { 
                        activeSubject: null, 
                        sessions: 1, 
                        targetCycles: 1, 
                        completedCycles: 0, 
                        accumulatedMinutes: 0,
                        mode: 'work',
                        neuralQueue: [],
                        neuralMode: false
                    },
                    lastUpdated: "1970-01-01T00:00:00.000Z"
                },
 
                // BUG-01 FIX: setDashboardFilter is defined exclusively in createSettingsSlice.js
                // (spread below). Removed duplicate inline definition that lacked version/sync tracking.
 
                // 🎯 DATA LEAK PROTECTION: Limpeza absoluta da RAM no Logout.
                resetStore: () => {
                    localStorage.removeItem('pomodoroState');
                    // MATH-03 / LEAK-01 FIX: Clear module-level MC cache on logout
                    clearCoachCaches();

                    // ✅ FIX: Limpar sessionStorage também
                    try {
                        sessionStorage.removeItem('hasSeenWelcomeScreen');
                        sessionStorage.removeItem('ultra-sync-dirty');
                        sessionStorage.removeItem('page-has-been-force-refreshed');
                    } catch { /* ignore */ }

                    // ✅ FIX: Notificar outras abas para encerrar Pomodoro
                    try {
                        const channel = new BroadcastChannel('pomodoro_sync');
                        channel.postMessage({ type: 'TIMER_RESET', tabId: 'reset-all' });
                        channel.close();
                    } catch { /* BroadcastChannel indisponível */ }

                    // ✅ Limpar temporal PRIMEIRO para evitar subscribers lendo estado inconsistente
                    if (useAppStore.temporal) {
                        useAppStore.temporal.getState().clear();
                    }

                    set((state) => {
                        // Preservamos configurações de UI (tema, etc) mas limpamos dados sensíveis
                        const settings = state.appState.settings;
                        state.appState = {
                            contests: { 'default': safeClone(INITIAL_DATA) },
                            activeId: 'default',
                            trash: [],
                            version: 0,
                            dashboardFilter: 'all',
                            hasSeenTour: false,
                            // ✅ FIX: Restaurar campos de data isolation global
                            lastReviewSummary: null,
                            lastReviewTime: null,
                            activeWorkspace: 'default', // Para isolamento futuro
                            pomodoro: { 
                                activeSubject: null, 
                                sessions: 1, 
                                targetCycles: 1, 
                                completedCycles: 0, 
                                accumulatedMinutes: 0,
                                mode: 'work',
                                neuralQueue: [],
                                neuralMode: false
                            },
                            lastUpdated: "1970-01-01T00:00:00.000Z",
                            isHydrated: true,
                            settings: settings // Preserva o tema escolhido
                        };
                    });
                },

                // Injetar os Slices
                ...createPomodoroSlice(set, get),
                ...createTaskSlice(set, get),
                ...createCategorySlice(set, get),
                ...createStudySlice(set, get),
                ...createContestSlice(set, get),
                ...createGamificationSlice(set, get),
                ...createSimuladoSlice(set, get),
                ...createTrashSlice(set, get),
                ...createSettingsSlice(set, get),
                ...createMonteCarloSlice(set, get),
            })),
            {
                // Zundo Options: Limit history to 20 states
                limit: 20,
                // PERFORMANCE FIX: Ignora atualizações do Pomodoro e da UI. O histórico só é salvo se a base de dados (contests) mudar! O(1)
                equality: (past, current) => past.appState?.contests === current.appState?.contests,
                // BUG 1 FIX: Restringe o histórico do Zundo omitindo arrays massivos
                // CORREÇÃO: Limpar também a Lixeira (trash) e o Histórico de Monte Carlo para evitar Memory Leak nas 20 instâncias de Undo
                partialize: (state) => ({
                    appState: {
                        ...state.appState,
                        trash: (state.appState.trash || []).slice(-10),
                        contests: Object.keys(state.appState.contests || {}).reduce((acc, id) => {
                            const c = state.appState.contests[id];
                            acc[id] = {
                                ...c,
                                // Preserva últimos 50 registros para undo/redo funcional
                                simulados: (c.simulados || []).slice(-50),
                                studyLogs: (c.studyLogs || []).slice(-50),
                                monteCarloHistory: (c.monteCarloHistory || []).slice(-30),
                                simuladoRows: (c.simuladoRows || []).slice(-50),
                            };
                            return acc;
                        }, {})
                    }
                }),
            }
        ),
        {
            name: 'ultra-dashboard-storage',
            version: 5, // Forçar bump de versão
            storage: createJSONStorage(() => idbStorage),
            // Don't persist the history/temporal state itself, just the app state
            partialize: (state) => ({ appState: state.appState }),

            onRehydrateStorage: () => {
                return (state, error) => {
                    // Em caso de erro, libera a UI para mostrar estado vazio/erro em vez de travar
                    if (error || !state) {
                        useAppStore.setState((prev) => ({
                            appState: { ...prev.appState, isHydrated: true }
                        }));
                        return;
                    }
 
                    // Resolução Síncrona do ActiveId para evitar Flash of Empty State (FOES)
                    const appState = state.appState || {};
                    const contestsList = Object.keys(appState.contests || {});
                    let targetId = appState.activeId;
                    let targetContests = appState.contests;
                    
                    try {
                        if ((!targetId || !targetContests?.[targetId]) && contestsList.length > 0) {
                            targetId = contestsList[0];
                        } else if (contestsList.length === 0) {
                            targetId = 'default';
                            targetContests = { 'default': safeClone(INITIAL_DATA) };
                        }
                    } catch (e) {
                        console.error("[Zustand] Falha estrutural CRÍTICA na reconstrução do estado base.", e);
                        // Solução absoluta: Purgar armazenamento corrompido para que a app respire no próximo reload
                        localStorage.removeItem('ultra-dashboard-storage');
                        idbDel('ultra-dashboard-storage').catch(() => {});
                        targetId = 'default';
                        targetContests = { 'default': { simulados: [], tasks: [] } };
                    }

                    // Atualização Atômica: ID e Hidratação juntos, sem mutação direta do estado persistido
                    useAppStore.setState((prev) => {
                        const currentAppState = prev.appState || {};
                        const validatedState = validateAppState({
                            ...currentAppState,
                            contests: targetContests || currentAppState.contests || { 'default': { simulados: [], tasks: [] } },
                            activeId: targetId
                        });
                        
                        return {
                            appState: {
                                ...validatedState,
                                isHydrated: true
                            }
                        };
                    });
                };
            }
        }
    )
);

// Helper to access temporal store easily
export const useTemporalStore = (selector) => {
    return useStore(useAppStore.temporal, selector);
};

// MATH-03 / LEAK-01 FIX: Invalidate cache when activeId changes
let previousActiveId = useAppStore.getState().appState.activeId;
useAppStore.subscribe((state) => {
    const currentActiveId = state.appState.activeId;
    if (currentActiveId !== previousActiveId) {
        previousActiveId = currentActiveId;
        clearCoachCaches();
    }
});

`

