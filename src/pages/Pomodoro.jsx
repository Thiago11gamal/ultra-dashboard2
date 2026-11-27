import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import SessionFocusPanel from '../components/pomodoro/FocusPanel';
import { getLocalMidnight, normalizeDate } from '../utils/dateHelper';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useActiveContest, usePomodoroState } from '../store/useSelectors';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import {
    CheckCircle2, ChevronRight, Zap,
    Flame, Lock, Unlock, RotateCcw, Loader2, Target,
    AlertCircle, Clock, Activity, Search, X
} from 'lucide-react';
import { getBestTask } from '../utils/coachLogic';
import { resolveCanonicalNextMission } from '../utils/canonicalNextMission';
import { DataTriviaPanel, AICoachPanel } from '../components/pomodoro/PomodoroMetaPanels';
import { countPomodorosToday } from '../utils/analytics';
import { parseTaskDisplay, cleanTaskTitle } from '../utils/taskTitleHelper';
import { calculateETA, findSubjectTaskInContest, clearStudyingStatusInContest, isActiveSubjectInCategory, matchesSubjectTask } from '../utils/pomodoroHelpers';
import { useLivePomodoroTimeLeft } from '../utils/pomodoroLiveStore';
import { hexToRgba, normalizePriority } from '../utils/colorHelper';
import { computeACWR } from '../engine/adaptive/workloadACWR';

const STUDY_MODE_OPTIONS = [
    { id: 'teoria', label: 'Teoria' },
    { id: 'questoes', label: 'Questões' },
    { id: 'revisao', label: 'Revisão' },
    { id: 'lei_seca', label: 'Lei Seca' },
    { id: 'discursiva', label: 'Discursiva' },
];

// Referências estáticas para evitar loops infinitos em seletores Zustand
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

const ALLOWED_RETURN_PATHS = [
    '/', '/dashboard', '/pomodoro', '/tasks', '/simulados', '/stats', '/evolution',
    '/coach', '/history', '/sessions', '/heatmap', '/retention', '/notes',
    '/flashcards', '/agenda'
];

const resolveReturnPath = (source, forceDashboard = false) => {
    if (forceDashboard) return '/';
    const normalized = String(source || '').replace(/^\/+/, '');
    if (!normalized || normalized === 'pomodoro' || normalized === 'neural_core' || normalized === 'side_panel') {
        return '/pomodoro';
    }
    if (normalized === 'dashboard' || normalized === 'dashboard_selector') {
        return '/';
    }
    if (normalized === 'activity') {
        return '/heatmap';
    }
    const candidate = `/${normalized}`;
    return ALLOWED_RETURN_PATHS.includes(candidate) ? candidate : '/pomodoro';
};

// DataTriviaPanel e AICoachPanel extraídos para src/components/pomodoro/PomodoroMetaPanels.jsx

// =====================================================
// OPÇÃO 1: CENTRAL DE MISSÕES, MENTOR E PRÓXIMAS AÇÕES
// =====================================================
const ActionsAndMentorView = React.memo(function ActionsAndMentorView({
    categories,
    activeSubject,
    onStartTask,
    stats,
    neuralMode,
    neuralQueue,
    studyLogs,
    simulados,
    contestId = null,
    settings = EMPTY_OBJECT,
    isRunning = false,
    mode = 'work',
    timeLeft = 0,
    _targetCycles = 1,
    _completedCycles = 0,
    speed = 1,
    recommendedTask: propRecommendedTask = undefined
}) {
    const liveTimeLeft = useLivePomodoroTimeLeft(timeLeft, isRunning);
    const [taskSearch, setTaskSearch] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');

    const recommendedTask = useMemo(() => {
        if (propRecommendedTask !== undefined) return propRecommendedTask;
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        if (!safeCats || safeCats.length === 0) return null;
        return getBestTask(safeCats, null, { contestId, studyLogs });
    }, [propRecommendedTask, categories, contestId, studyLogs]);

    const activeTaskIdStr = activeSubject?.taskId ? String(activeSubject.taskId) : null;

    const allPendingTasks = useMemo(() => {
        const tasks = [];
        const priorityRank = { high: 0, medium: 1, low: 2 };
        (categories || []).filter(Boolean).forEach(cat => {
            const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            safeTasks.filter(t => t && !t.completed).forEach(t => {
                const tid = String(t.id || t.text || t.title || '');
                if (!tid || tid === activeTaskIdStr) return;
                tasks.push({
                    ...t,
                    id: t.id || t.text || t.title,
                    catName: cat.name,
                    catColor: cat.color,
                    catId: cat.id,
                    catIcon: cat.icon,
                    _prioRank: priorityRank[normalizePriority(t.priority)] ?? 2
                });
            });
        });
        return tasks.sort((a, b) => a._prioRank - b._prioRank);
    }, [categories, activeTaskIdStr]);

    const highPriorityTasks = useMemo(() => {
        const tasks = [];
        const recommendedId = (!activeSubject && recommendedTask) ? String(recommendedTask.id || recommendedTask.text || recommendedTask.title || '') : null;
        const currentTaskId = activeSubject?.taskId ? String(activeSubject.taskId) : null;
        if (neuralMode && neuralQueue && neuralQueue.length > 0) {
            const safeQueue = Array.isArray(neuralQueue) ? neuralQueue : Object.values(neuralQueue || {});
            const normalizedQueue = safeQueue.filter(Boolean);
            const currentIndex = normalizedQueue.findIndex(t => String(t.id || t.text || t.title) === currentTaskId);
            const pendingQueue = currentIndex >= 0 ? normalizedQueue.slice(currentIndex) : normalizedQueue;
            return pendingQueue.map(t => ({
                ...t,
                id: t.id || t.text || t.title,
                catName: t.catName || t.category || 'Neural',
                catColor: t.catColor || '#6366f1',
                catIcon: t.catIcon || '⚡'
            }));
        }
        (categories || []).filter(Boolean).forEach(cat => {
            const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            safeTasks.filter(t => {
                if (!t || t.completed || normalizePriority(t.priority) !== 'high') return false;
                const tid = String(t.id || t.text || t.title);
                return tid !== recommendedId && tid !== currentTaskId;
            }).forEach(t => {
                tasks.push({ ...t, id: t.id || t.text || t.title, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
            });
        });
        if (tasks.length === 0) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => {
                    if (!t || t.completed || normalizePriority(t.priority) !== 'medium') return false;
                    const tid = String(t.id || t.text || t.title);
                    return tid !== recommendedId && tid !== currentTaskId;
                }).forEach(t => {
                    tasks.push({ ...t, id: t.id || t.text || t.title, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                });
            });
        }
        return tasks;
    }, [categories, recommendedTask, activeSubject, neuralMode, neuralQueue]);

    const isFilteringTasks = Boolean(taskSearch.trim()) || selectedCategoryId !== 'all';

    const pendingCount = useMemo(() => {
        if (neuralMode && neuralQueue && neuralQueue.length > 0) {
            return highPriorityTasks.filter(t => String(t.id || t.text || t.title) !== String(activeSubject?.taskId)).length;
        }
        const highOrMedCount = highPriorityTasks.filter(t => String(t.id || t.text || t.title) !== String(activeSubject?.taskId)).length;
        if (highOrMedCount > 0) return highOrMedCount;
        const recommendedId = (!activeSubject && recommendedTask) ? String(recommendedTask.id || recommendedTask.text || recommendedTask.title || '') : null;
        return allPendingTasks.filter(t => String(t.id || t.text || t.title) !== recommendedId).length;
    }, [neuralMode, neuralQueue, highPriorityTasks, activeSubject, recommendedTask, allPendingTasks]);

    const visibleTasks = useMemo(() => {
        if (isFilteringTasks) {
            const q = taskSearch.trim().toLowerCase();
            return allPendingTasks.filter(t => {
                if (selectedCategoryId !== 'all' && String(t.catId) !== String(selectedCategoryId)) return false;
                if (!q) return true;
                const haystack = `${t.text || ''} ${t.title || ''} ${t.catName || ''}`.toLowerCase();
                return haystack.includes(q);
            }).slice(0, 12);
        }
        const base = [...highPriorityTasks];
        const seen = new Set(base.map(t => String(t?.id || t?.text || t?.title || '')).filter(Boolean));
        const currentActiveTaskId = activeSubject?.taskId ? String(activeSubject.taskId) : null;
        if (base.length < 6) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => t && !t.completed).forEach(t => {
                    const normalizedId = String(t.id || t.text || t.title || '');
                    if (!normalizedId || seen.has(normalizedId) || base.length >= 6 || normalizedId === currentActiveTaskId) return;
                    base.push({ ...t, id: normalizedId, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                    seen.add(normalizedId);
                });
            });
        }
        return base.slice(0, 6);
    }, [isFilteringTasks, taskSearch, selectedCategoryId, allPendingTasks, highPriorityTasks, categories, activeSubject]);

    const activeTaskStats = useMemo(() => {
        if (!activeSubject) return null;
        const currentCategory = (categories || []).find(c => c && (String(c.id) === String(activeSubject.categoryId) || (activeSubject.category && c.name === activeSubject.category)));
        const rawTasks = currentCategory?.tasks || [];
        const safeCategoryTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
        const categoryTasks = safeCategoryTasks.filter(Boolean);
        const total = categoryTasks.length;
        const completed = categoryTasks.filter(t => t.completed).length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalMinutes = currentCategory?.totalMinutes || 0;
        const remaining = Math.max(total - completed, 0);
        const currentTask = categoryTasks.find(t => matchesSubjectTask(t, activeSubject));
        const isCurrentCompleted = currentTask?.completed || false;
        const gainIfComplete = (total > 0 && !isCurrentCompleted) ? Number((100 / total).toFixed(1)) : 0;
        const quality = completionPct >= 80 ? 'Maestria' : completionPct >= 40 ? 'Evolução' : 'Fase Inicial';
        const hitRate = completionPct;
        const missRate = total > 0 ? Math.max(0, 100 - completionPct) : 0;
        const highPriorityCount = categoryTasks.filter(t => normalizePriority(t.priority) === 'high' && !t.completed).length;
        const whySelected = isCurrentCompleted
            ? 'necessidade de retenção de memória (Revisão Espaçada)'
            : normalizePriority(activeSubject.priority) === 'high'
                ? 'ser um alvo crítico de alto impacto'
                : 'apresentar alta sinergia com o seu ritmo atual';
        const improveText = remaining > 0
            ? `Domine mais ${Math.min(remaining, 3)} assunto(s) para expandir seu domínio na matéria.`
            : 'Domínio quase absoluto da matéria. Excelente oportunidade para transição ou revisão profunda.';
        const statusVariants = [];
        if (completionPct < 40) {
            statusVariants.push(`Fase de ignição: Cada assunto concluído gera um impacto de +${gainIfComplete}% na base da matéria.`);
            if (highPriorityCount > 0) statusVariants.push(`Estratégia Alpha: Focar nos ${highPriorityCount} assuntos críticos desta matéria trará o maior ROI de esforço.`);
        } else if (completionPct < 80) {
            statusVariants.push(`Ponto de inflexão: Você já dominou ${hitRate}% da matéria. Acelere para cruzar a barreira da excelência.`);
            statusVariants.push(`Análise em tempo real: Restam ${remaining} assuntos nesta matéria. Mantenha o fluxo para aniquilar a lacuna de ${missRate}%.`);
        } else {
            statusVariants.push(`Alta performance: Com ${hitRate}% de domínio da matéria, você está na fase de refinamento e maestria.`);
            statusVariants.push(`Retenção máxima: Seu nível atual nesta matéria reduz drasticamente a curva de esquecimento.`);
        }
        if (highPriorityCount > 0 && statusVariants.length < 3) {
            statusVariants.push(`Radar tático: Detectamos ${highPriorityCount} assunto(s) de prioridade máxima ainda em aberto nesta matéria.`);
        }
        statusVariants.push(`Mapeamento: Seu fluxo nesta matéria já converteu ${hitRate}% de ruído em conhecimento estruturado.`);
        const variantSeed = String(activeSubject.taskId || activeSubject.task || '').length + completed + total;
        const statusLine = statusVariants[variantSeed % statusVariants.length];
        return {
            total, completed, completionPct, gainIfComplete, quality, whySelected, improveText, hitRate, missRate, statusLine,
            categoryName: currentCategory?.name || 'Desconhecida',
            totalMinutes,
            topic: activeSubject.task
        };
    }, [activeSubject, categories]);

    const cleanTaskText = (rawText, catName) => {
        const result = parseTaskDisplay(rawText, catName, categories);
        return {
            displayTopic: result.displayTopic || 'Teoria Geral e Fundamentos',
            secondaryText: result.secondaryText || '',
            alertBadge: result.alertBadge,
            isPriority: result.isPriority
        };
    };

    const safeCatName = (name) => {
        const n = String(name || '').trim();
        if (!n) return 'Categoria';
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n)) {
            return 'Categoria';
        }
        return n;
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <AICoachPanel
                activeSubject={activeSubject}
                stats={stats}
                categories={categories}
                studyLogs={studyLogs}
                simulados={simulados}
                settings={settings}
            />
            <DataTriviaPanel studyLogs={studyLogs} simulados={simulados} categories={categories} />

            {activeTaskStats && (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 relative overflow-hidden group/stats shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover/stats:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2 truncate pr-2">
                            <Target size={12} className="shrink-0" />
                            <span className="truncate">Matéria: {activeTaskStats.categoryName}</span>
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${isRunning
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}>
                                {isRunning ? (mode === 'work' ? 'Sessão Ativa' : 'Em Intervalo') : 'Pausado'}
                            </span>
                            <span className="text-[10px] font-black text-cyan-500/50 bg-cyan-500/10 px-2 py-0.5 rounded-md shrink-0">
                                {activeTaskStats.completionPct}% Completo
                            </span>
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-cyan-950 rounded-full mb-3 overflow-hidden">
                        <div
                            className="h-full bg-cyan-400 rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${activeTaskStats.completionPct}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    {isRunning && Number.isFinite(liveTimeLeft) && liveTimeLeft > 0 && (
                        <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Término previsto do bloco:</span>
                            </span>
                            <span className="font-mono font-black text-emerald-300">
                                {calculateETA(liveTimeLeft, speed) || '--:--'}
                            </span>
                        </div>
                    )}
                    <p className="text-xs text-slate-200 leading-relaxed relative z-10">
                        <span className="block mb-1">
                            <strong className="text-cyan-300">Assunto atual:</strong> {cleanTaskText(activeTaskStats.topic, activeTaskStats.categoryName).displayTopic || 'Missão em Aberto'}
                        </span>
                        <span>
                            O <strong>assunto</strong> foi escolhido por {activeTaskStats.whySelected}. Progresso da <strong>matéria</strong>: <strong>{activeTaskStats.completionPct}%</strong> ({activeTaskStats.completed}/{activeTaskStats.total}).
                            {activeTaskStats.gainIfComplete > 0 ? (
                                <> Impacto na matéria ao concluir: <strong className="text-emerald-400">+{activeTaskStats.gainIfComplete}%</strong>.</>
                            ) : (
                                <> Sessão de revisão focada: <strong className="text-emerald-400">Manutenção de retenção</strong>.</>
                            )}
                        </span>
                    </p>
                    <div className="mt-3 relative z-10">
                        <p className="text-xs text-slate-400">
                            Nível da matéria: <strong className="text-white capitalize">{activeTaskStats.quality}</strong>. {activeTaskStats.improveText}
                        </p>
                        <p className="text-xs text-cyan-300/80 mt-1">{activeTaskStats.statusLine}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" title="Domínio da matéria">
                                <CheckCircle2 size={13} className="text-emerald-400" />
                                <span><strong className="text-white font-bold">{activeTaskStats.hitRate}%</strong> Domínio</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300" title="Lacuna na matéria">
                                <AlertCircle size={13} className="text-amber-400" />
                                <span><strong className="text-white font-bold">{activeTaskStats.missRate}%</strong> Lacuna</span>
                            </span>
                            {activeTaskStats.totalMinutes > 0 && (
                                <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300" title="Tempo dedicado à matéria">
                                    <Clock size={13} className="text-cyan-400" />
                                    <span><strong className="text-white font-bold">{Math.round(activeTaskStats.totalMinutes)}m</strong> na Matéria</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {recommendedTask && !activeSubject && (
                <Motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-6 rounded-2xl bg-[#11131f] border border-indigo-500/20 shadow-lg relative group/card overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover/card:scale-110 group-hover/card:opacity-20 transition-all">
                        <Zap size={64} className="text-indigo-400" />
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                        <span className="inline-block px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold uppercase tracking-widest">
                            ⚡ Recomendado pela IA
                        </span>
                        {normalizePriority(recommendedTask?.priority) === 'high' && (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-widest shrink-0">
                                Prioridade Alta
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-tight relative z-10">
                        {(() => {
                            const recInfo = cleanTaskText(recommendedTask.text || recommendedTask.title, recommendedTask.catName || recommendedTask.category);
                            return recInfo.displayTopic || 'Missão de Alto Impacto';
                        })()}
                    </h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed relative z-10">
                        Baseado na sua performance e histórico, esta meta oferece a melhor janela de retenção agora.
                    </p>
                    <button
                        type="button"
                        onClick={() => onStartTask(recommendedTask, null, 'neural_core', true)}
                        className="w-full relative overflow-hidden py-3 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] active:scale-[0.985] group/btn z-10"
                    >
                        <span className="absolute inset-0 w-full h-full -ml-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite] skew-x-[-20deg]" />
                        INICIAR AGORA
                        <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-white/5 border border-white/10 shrink-0 text-slate-400">
                                {recommendedTask.catIcon || '📚'}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">
                                {safeCatName(recommendedTask.catName || recommendedTask.category)}
                            </span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400/60 tracking-widest uppercase shrink-0">Eficácia Máxima</span>
                    </div>
                </Motion.div>
            )}

            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 backdrop-blur-md relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                            <Target size={13} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Próximas Ações</p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/5 px-2.5 py-0.5 rounded-md">
                            {pendingCount} pendentes
                        </span>
                    )}
                </div>
                {allPendingTasks.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 mb-3">
                        <div className="relative flex-1 min-w-0">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                value={taskSearch}
                                onChange={(e) => setTaskSearch(e.target.value)}
                                placeholder="Buscar assunto ou matéria para estudar..."
                                aria-label="Buscar assunto para iniciar no cronômetro"
                                className="w-full pl-7 pr-7 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/50 transition-colors"
                            />
                            {taskSearch && (
                                <button
                                    type="button"
                                    onClick={() => setTaskSearch('')}
                                    aria-label="Limpar busca de assuntos"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        {(categories || []).length > 1 && (
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                                aria-label="Filtrar ações por disciplina"
                                className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-[11px] font-semibold text-slate-300 focus:outline-none focus:border-indigo-400/50 max-w-full sm:max-w-[160px] truncate"
                            >
                                <option value="all">Todas as matérias</option>
                                {(categories || []).filter(Boolean).map(cat => (
                                    <option key={cat.id} value={String(cat.id)}>
                                        {safeCatName(cat.name)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}
                {visibleTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-white/[0.015] rounded-2xl border border-white/5">
                        <CheckCircle2 size={28} className="text-emerald-500/40 mb-3" />
                        <p className="text-xs font-bold text-slate-300 tracking-tight">
                            {isFilteringTasks ? 'Nenhum assunto encontrado' : 'Nenhuma ação pendente'}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1">
                            {isFilteringTasks
                                ? 'Tente outro termo ou limpe os filtros.'
                                : 'Todas as missões neurais completas ou em foco.'}
                        </p>
                        {isFilteringTasks && (
                            <button
                                type="button"
                                onClick={() => { setTaskSearch(''); setSelectedCategoryId('all'); }}
                                className="mt-3 px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-[10px] font-bold text-indigo-300 transition-colors"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {visibleTasks.filter(Boolean).map((task, idx) => {
                            const taskId = task.id || task.text || task.title || `fallback-task-${idx}`;
                            const categoryName = safeCatName(task.catName || task.category);
                            const currentActiveId = activeSubject?.taskId || activeSubject?.id;
                            const isActive = String(currentActiveId) === String(taskId) || (task.id && String(currentActiveId) === String(task.id));
                            const { displayTopic, secondaryText, alertBadge } = cleanTaskText(task.text || task.title, categoryName);
                            return (
                                <Motion.button
                                    key={`task-${taskId}-${idx}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => onStartTask(task, null, task.source || 'pomodoro')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group text-left relative overflow-hidden ${isActive
                                        ? 'bg-amber-500/5 border-amber-500/20 shadow-sm'
                                        : 'bg-white/[0.015] border-transparent hover:bg-white/[0.03] hover:border-white/5'
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-transparent group-hover:bg-indigo-500/30'}`} />
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: hexToRgba(task.catColor, 0.15, '#6366f1'), border: `1px solid ${hexToRgba(task.catColor, 0.30, '#6366f1')}` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <p className={`text-xs font-semibold truncate tracking-tight ${isActive ? 'text-amber-400' : 'text-slate-300 group-hover:text-white transition-colors'}`}>
                                            {displayTopic || 'Missão em Aberto'}
                                        </p>
                                        {secondaryText && secondaryText.trim().toLowerCase() !== categoryName.trim().toLowerCase() && (
                                            <p className="text-[9px] text-slate-500 truncate mt-0.5 font-medium">{secondaryText}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">{categoryName}</p>
                                            {alertBadge && (
                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 flex items-center gap-0.5">
                                                    <span>{alertBadge.icon}</span>
                                                    <span>{alertBadge.label}</span>
                                                </span>
                                            )}
                                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-amber-500/80' : 'text-slate-600'}`}>• {isActive ? 'Em foco agora' : `Ação #${idx + 1}`}</p>
                                        </div>
                                    </div>
                                    {isActive ? (
                                        <div className="flex flex-col items-center gap-0.5 opacity-80">
                                            <Flame size={14} className="text-amber-500" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                                            <ChevronRight size={12} className="text-slate-400" />
                                        </div>
                                    )}
                                </Motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

// =====================================================
// PAINEL LATERAL UNIFICADO COM AS DUAS OPÇÕES DE VISUALIZAÇÃO
// =====================================================
const PomodoroSidePanel = React.memo(function PomodoroSidePanel({
    clockHeight,
    activeTab,
    setActiveTab,
    categories,
    activeSubject,
    onStartTask,
    stats,
    neuralMode,
    neuralQueue,
    studyLogs,
    simulados,
    contestId = null,
    user,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    targetCycles,
    completedCycles,
    accumulatedMinutes = null,
    isLayoutLocked,
    onToggleLock,
    settings,
    speed = 1,
    recommendedTask: propRecommendedTask = undefined
}) {
    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelPosition');
            if (saved !== null && saved !== 'undefined') {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    if (typeof window !== 'undefined') {
                        const limitX = Math.max(100, window.innerWidth - 100);
                        const limitY = Math.max(100, window.innerHeight - 100);
                        if (Math.abs(parsed.x) > limitX || Math.abs(parsed.y) > limitY) {
                            return { x: 0, y: 0 };
                        }
                    }
                    return parsed;
                }
            }
            return { x: 0, y: 0 };
        } catch { return { x: 0, y: 0 }; }
    });
    const uiPosRef = useRef(uiPosition);
    useEffect(() => { uiPosRef.current = uiPosition; }, [uiPosition]);
    useEffect(() => {
        return () => {
            // Cleanup: garantir que o ref não aponta para um valor stale
            uiPosRef.current = { x: 0, y: 0 };
        };
    }, []);

    useEffect(() => {
        const checkPos = () => {
            const currentPos = uiPosRef.current;
            if (currentPos.x !== 0 || currentPos.y !== 0) {
                const limitX = window.innerWidth - 100;
                const limitY = window.innerHeight - 100;
                if (Math.abs(currentPos.x) > limitX || Math.abs(currentPos.y) > limitY) {
                    setUiPosition({ x: 0, y: 0 });
                    localStorage.removeItem('focusPanelPosition');
                }
            }
        };

        const handleStorage = (e) => {
            if (e.key === 'focusPanelPosition') {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                        setUiPosition(parsed);
                    } else {
                        setUiPosition({ x: 0, y: 0 });
                    }
                } catch { setUiPosition({ x: 0, y: 0 }); }
            }
        };

        window.addEventListener('resize', checkPos);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('resize', checkPos);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const handleDragEnd = (_, info) => {
        const rawX = uiPosition.x + info.offset.x;
        const rawY = uiPosition.y + info.offset.y;
        const limitX = typeof window !== 'undefined' ? Math.max(80, window.innerWidth - 220) : 800;
        const limitY = typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 200) : 600;
        const newPos = {
            x: Math.max(-limitX, Math.min(limitX, Math.round(rawX))),
            y: Math.max(-limitY, Math.min(limitY, Math.round(rawY)))
        };
        setUiPosition(newPos);
        try {
            localStorage.setItem('focusPanelPosition', JSON.stringify(newPos));
        } catch (err) {
            console.warn("[PomodoroSidePanel] Falha ao salvar posição:", err);
        }
    };

    const resetPosition = () => {
        setUiPosition({ x: 0, y: 0 });
        localStorage.removeItem('focusPanelPosition');
    };

    // Contagem de pendências para o badge do tab de ações (sincronizada com ActionsAndMentorView)
    const pendingCount = useMemo(() => {
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const recTask = (!activeSubject && safeCats.length > 0)
            ? (propRecommendedTask !== undefined ? propRecommendedTask : getBestTask(safeCats, null, { contestId, studyLogs }))
            : null;
        const recommendedId = recTask ? String(recTask.id || recTask.text || recTask.title || '') : null;
        const currentTaskId = activeSubject?.taskId ? String(activeSubject.taskId) : null;

        if (neuralMode && neuralQueue && neuralQueue.length > 0) {
            const safeQueue = Array.isArray(neuralQueue) ? neuralQueue : Object.values(neuralQueue || {});
            const normalizedQueue = safeQueue.filter(Boolean);
            const currentIndex = normalizedQueue.findIndex(t => String(t.id || t.text || t.title) === currentTaskId);
            const pendingQueue = currentIndex >= 0 ? normalizedQueue.slice(currentIndex) : normalizedQueue;
            return pendingQueue.filter(t => String(t.id || t.text || t.title) !== currentTaskId).length;
        }

        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;
        safeCats.filter(Boolean).forEach(cat => {
            const safeTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
            safeTasks.forEach(t => {
                if (!t || t.completed) return;
                const tid = String(t.id || t.text || t.title);
                if (tid === recommendedId || tid === currentTaskId) return;
                const prio = normalizePriority(t.priority);
                if (prio === 'high') highCount++;
                else if (prio === 'medium') mediumCount++;
                else lowCount++;
            });
        });
        if (highCount > 0) return highCount;
        if (mediumCount > 0) return mediumCount;
        return lowCount;
    }, [categories, activeSubject, neuralMode, neuralQueue, contestId, studyLogs, propRecommendedTask]);

    const safePanelHeight = clockHeight ? Math.max(540, clockHeight) : null;

    return (
        <Motion.div
            drag={!isLayoutLocked}
            dragMomentum={false}
            dragElastic={0.1}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.01, zIndex: 100 }}
            style={safePanelHeight ? { height: `${safePanelHeight}px`, maxHeight: `${safePanelHeight}px` } : undefined}
            className={`flex flex-col w-full relative group p-3.5 sm:p-4 bg-[#08090f]/75 border border-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden ${!isLayoutLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* CABEÇALHO DO PAINEL LATERAL (INTEGRADO, FLUIDO E SEMPRE ACESSÍVEL) */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                        <Target size={13} />
                    </div>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-slate-200">
                        Painel Tático
                    </span>
                    {!isLayoutLocked ? (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                            Móvel
                        </span>
                    ) : (
                        <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                            Fixo
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {!isLayoutLocked && (uiPosition.x !== 0 || uiPosition.y !== 0) && (
                        <button
                            type="button"
                            onClick={resetPosition}
                            className="px-2 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-white/10 hover:text-white hover:bg-slate-800 transition-all text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow"
                            title="Restaurar posição original"
                        >
                            <RotateCcw size={10} />
                            <span>Resetar</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggleLock}
                        className={`p-1.5 rounded-xl transition-all border flex items-center justify-center shadow backdrop-blur-md ${isLayoutLocked
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        title={isLayoutLocked ? "Desbloquear arrasto do painel" : "Bloquear painel na posição"}
                        aria-label={isLayoutLocked ? "Desbloquear arrasto do painel" : "Bloquear painel na posição"}
                    >
                        {isLayoutLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </div>
            </div>

            {/* TAB SELECTOR: DUAS OPÇÕES DE VISUALIZAÇÃO */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-white/10 rounded-2xl mb-3.5 shadow-inner shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'actions'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${activeTab === 'actions' ? 'bg-white/20 text-amber-300' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        <Zap size={12} />
                    </span>
                    <span>Missões & Mentor</span>
                    {pendingCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${activeTab === 'actions'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 border border-white/5'
                            }`}>
                            {pendingCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('telemetry')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'telemetry'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${activeTab === 'telemetry' ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-cyan-400'}`}>
                        <Activity size={12} />
                    </span>
                    <span>Telemetria da Sessão</span>
                    {isRunning && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                </button>
            </div>

            {/* CONTEÚDO DA VISUALIZAÇÃO SELECIONADA */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                <AnimatePresence mode="wait">
                    {activeTab === 'actions' ? (
                        <Motion.div
                            key="view-actions"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="w-full"
                        >
                            <ActionsAndMentorView
                                categories={categories}
                                activeSubject={activeSubject}
                                onStartTask={onStartTask}
                                stats={stats}
                                neuralMode={neuralMode}
                                neuralQueue={neuralQueue}
                                studyLogs={studyLogs}
                                simulados={simulados}
                                contestId={contestId}
                                settings={settings}
                                isRunning={isRunning}
                                mode={mode}
                                timeLeft={timeLeft}
                                targetCycles={targetCycles}
                                completedCycles={completedCycles}
                                speed={speed}
                                recommendedTask={propRecommendedTask}
                            />
                        </Motion.div>
                    ) : (
                        <Motion.div
                            key="view-telemetry"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="w-full"
                        >
                            <SessionFocusPanel
                                activeSubject={activeSubject}
                                categories={categories}
                                studyLogs={studyLogs}
                                user={user}
                                mode={mode}
                                isRunning={isRunning}
                                timeLeft={timeLeft}
                                totalTime={totalTime}
                                targetCycles={targetCycles}
                                completedCycles={completedCycles}
                                accumulatedMinutes={accumulatedMinutes}
                                settings={settings}
                                simulados={simulados}
                                speed={speed}
                                onStartTask={onStartTask}
                            />
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Motion.div>
    );
});

// =====================================================
// =====================================================
// BARRA SUPERIOR DO CRONÔMETRO (COMPACTA, ELEGANTE E PERFEITAMENTE ENQUADRADA)
// =====================================================
const PomodoroTopBar = React.memo(function PomodoroTopBar({
    activeSubject,
    categories = [],
    isRunning,
    mode = 'work',
    timeLeft = 0,
    targetCycles = 1,
    completedCycles = 0,
    speed = 1,
    settings = EMPTY_OBJECT
}) {
    const currentCategory = useMemo(() => {
        if (!activeSubject) return null;
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const catId = activeSubject.categoryId || activeSubject.catId;
        return safeCats.find(c => c && (
            (catId && c.id === catId) ||
            (activeSubject.category && c.name && c.name.toLowerCase() === String(activeSubject.category).toLowerCase())
        )) || null;
    }, [categories, activeSubject]);

    const { displayTopic, alertBadge, isPriority } = useMemo(() => {
        return parseTaskDisplay(activeSubject?.task, activeSubject?.category, currentCategory || categories);
    }, [activeSubject?.task, activeSubject?.category, currentCategory, categories]);

    const disciplineName = activeSubject?.category || currentCategory?.name || 'SISTEMA';
    const concreteTopic = activeSubject ? (displayTopic || 'Teoria Geral e Fundamentos') : 'Aguardando início...';

    const liveTimeLeft = useLivePomodoroTimeLeft(timeLeft, isRunning);

    const etaString = useMemo(() => {
        if (!isRunning || !Number.isFinite(liveTimeLeft) || liveTimeLeft <= 0) return null;
        return calculateETA(liveTimeLeft, speed);
    }, [isRunning, liveTimeLeft, speed]);

    const currentCycleDisplay = Math.max(1, Math.min(targetCycles, completedCycles + (mode === 'work' ? 1 : 0)));

    return (
        <div className="w-full rounded-2xl border-2 border-[#94785a] bg-[#b08e6b] px-4 sm:px-5 py-2.5 sm:py-3 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />
            <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#2d1a12]/10 border border-[#2d1a12]/20 flex items-center justify-center shrink-0 shadow-inner">
                        {activeSubject ? <Target size={20} className="text-[#2d1a12]" /> : <Zap size={20} className="text-[#2d1a12]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        {/* Linha Superior: Disciplina + Alertas / Modalidades ao lado */}
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#2d1a12]/70">
                                    Disciplina:
                                </span>
                                <span className="text-[10.5px] sm:text-xs font-black uppercase tracking-[0.15em] text-[#2d1a12] max-w-[180px] sm:max-w-xs truncate" title={disciplineName}>
                                    {disciplineName}
                                </span>
                                <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${activeSubject && isRunning
                                    ? 'bg-emerald-700 animate-pulse'
                                    : activeSubject
                                        ? 'bg-amber-700/80'
                                        : 'bg-[#2d1a12]/30'
                                    }`} title={activeSubject && isRunning ? 'Em execução' : activeSubject ? 'Pausado' : 'Aguardando início'} />
                            </div>

                            {/* Alertas posicionados ao lado da disciplina */}
                            {alertBadge && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-[#2d1a12]/15 text-[#2d1a12] border border-[#2d1a12]/25 shadow-xs">
                                    <span>{alertBadge.icon}</span>
                                    <span>{alertBadge.text || alertBadge.label}</span>
                                </span>
                            )}
                            {(isPriority || normalizePriority(activeSubject?.priority) === 'high') && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-rose-950/20 text-rose-950 border border-rose-900/30 shadow-xs">
                                    <span>🔥</span>
                                    <span>Prioritário</span>
                                </span>
                            )}
                        </div>

                        {/* Linha Principal: Assunto Concreto */}
                        <h1 className="text-sm sm:text-base lg:text-lg font-black text-[#2d1a12] tracking-tight leading-tight truncate flex items-baseline gap-1.5" title={concreteTopic}>
                            <span className="text-xs sm:text-sm font-bold text-[#2d1a12]/70 shrink-0">
                                Assunto:
                            </span>
                            <span className="truncate">
                                {concreteTopic}
                            </span>
                        </h1>
                    </div>
                </div>

                {/* Previsão & Status Operacional do Pomodoro */}
                <div className="flex flex-col items-end shrink-0 text-right">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#2d1a12]/15 border border-[#2d1a12]/25 shadow-inner">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isRunning
                            ? 'bg-emerald-800 animate-pulse'
                            : (activeSubject ? 'bg-amber-700' : 'bg-[#2d1a12]/40')
                            }`} />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#2d1a12]">
                            {isRunning
                                ? (mode === 'work' ? (etaString ? `FOCO • ATÉ ${etaString}` : 'EM FOCO') : (etaString ? `PAUSA • ATÉ ${etaString}` : 'PAUSA ATIVA'))
                                : (activeSubject ? 'PAUSADO' : 'AGUARDANDO')}
                        </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#2d1a12]/80 mt-0.5 tracking-tight">
                        {activeSubject
                            ? `Ciclo ${currentCycleDisplay} de ${targetCycles}`
                            : `Cadência ${Number(settings?.pomodoroWork) || 25}/${Number(settings?.pomodoroBreak) || 5} min`}
                    </span>
                </div>
            </div>
        </div>
    );
});

// =====================================================
// COMPONENTE PRINCIPAL POMODORO
// =====================================================
export default function Pomodoro() {
    const activeId = useAppStore(state => state.appState?.activeId);
    const contest = useActiveContest() || EMPTY_OBJECT;
    const rawCategories = contest.categories || EMPTY_ARRAY;
    const categories = React.useMemo(() => {
        const list = Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
        return list.filter(Boolean).map(c => ({
            ...c,
            tasks: Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {})
        }));
    }, [rawCategories]);
    const settings = contest.settings || EMPTY_OBJECT;
    const rawStudyLogs = contest.studyLogs || EMPTY_ARRAY;
    const studyLogs = React.useMemo(() => Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {}), [rawStudyLogs]);
    const rawSimulados = contest.simulados || EMPTY_ARRAY;
    const simulados = React.useMemo(() => Array.isArray(rawSimulados) ? rawSimulados : Object.values(rawSimulados || {}), [rawSimulados]);
    const user = contest.user || null;

    const isHydrated = !!activeId && contest !== EMPTY_OBJECT;

    const setData = useAppStore(state => state.setData);
    const updatePomodoroSettings = useAppStore(state => state.updatePomodoroSettings);
    const handleUpdateStudyTime = useAppStore(state => state.handleUpdateStudyTime);
    const [studyMode, setStudyMode] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoro_study_mode_v1');
            return STUDY_MODE_OPTIONS.some(o => o.id === saved) ? saved : 'teoria';
        } catch {
            return 'teoria';
        }
    });
    const [energyLevel, setEnergyLevel] = useState(() => {
        try {
            const raw = sessionStorage.getItem('pomodoro_energy_level_v1');
            const num = Number(raw);
            return Number.isInteger(num) && num >= 1 && num <= 5 ? num : null;
        } catch {
            return null;
        }
    });

    const handleChangeEnergyLevel = useCallback((lvl) => {
        setEnergyLevel(prev => {
            const next = prev === lvl ? null : lvl;
            try {
                if (next === null) sessionStorage.removeItem('pomodoro_energy_level_v1');
                else sessionStorage.setItem('pomodoro_energy_level_v1', String(next));
            } catch {
                // ignore
            }
            return next;
        });
    }, []);

    const handleChangeStudyMode = useCallback((modeId) => {
        setStudyMode(modeId);
        try {
            localStorage.setItem('pomodoro_study_mode_v1', modeId);
        } catch {
            // ignore
        }
    }, []);

    const acwrSummary = useMemo(() => computeACWR(studyLogs), [studyLogs]);

    const handleUpdateStudyTimeWithMeta = useCallback((categoryId, minutes, taskId, taskTitleOverride = '', extraMeta = null) => {
        const currentAgendaEventId =
            extraMeta?.agendaEventId ??
            useAppStore.getState().appState?.pomodoro?.activeSubject?.agendaEventId ??
            null;
        const mergedMeta = {
            ...(studyMode ? { studyMode } : {}),
            ...(energyLevel != null ? { energyLevel } : {}),
            ...(currentAgendaEventId ? { agendaEventId: currentAgendaEventId } : {}),
            ...(extraMeta && typeof extraMeta === 'object' ? extraMeta : {}),
        };
        return handleUpdateStudyTime(categoryId, minutes, taskId, taskTitleOverride, mergedMeta);
    }, [handleUpdateStudyTime, studyMode, energyLevel]);
    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();
    const completionTimeoutRef = React.useRef(null);
    const pomodoroState = usePomodoroState();
    const activeSubject = pomodoroState.activeSubject;
    const setPomodoroActiveSubject = useAppStore(state => state.setPomodoroActiveSubject);
    const neuralMode = pomodoroState.neuralMode;
    const neuralQueue = pomodoroState.neuralQueue || EMPTY_ARRAY;
    const entrySourceRef = useRef(location.state?.from || 'pomodoro');
    const topRef = useRef(null);
    const clockColRef = useRef(null);
    const [clockHeight, setClockHeight] = useState(null);
    const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true));
    const [liveTimerState, setLiveTimerState] = useState(null);

    const recommendedTask = React.useMemo(() => {
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        if (!safeCats || safeCats.length === 0) return null;
        const canonical = resolveCanonicalNextMission({
            categories: safeCats,
            simulados,
            simuladoRows: contest.simuladoRows,
            studyLogs,
            coachPlan: contest.coachPlan,
            coachPlanner: contest.coachPlanner,
            agenda: contest.agenda,
            flashcardDecks: contest.flashcardDecks,
            user,
            minScore: contest.minScore ?? settings?.minScore ?? 0,
            maxScore: contest.maxScore ?? settings?.maxScore ?? 100,
            calibrationHistoryByCategory: contest.calibrationHistoryByCategory,
            contestId: activeId,
            adaptiveCalibrationEnabled: settings?.adaptiveCalibrationEnabled !== false
        });
        return canonical?.task || getBestTask(safeCats, null, { contestId: activeId, studyLogs });
    }, [
        categories,
        activeId,
        studyLogs,
        simulados,
        contest.simuladoRows,
        contest.coachPlan,
        contest.coachPlanner,
        contest.agenda,
        contest.flashcardDecks,
        contest.minScore,
        contest.maxScore,
        contest.calibrationHistoryByCategory,
        settings?.minScore,
        settings?.maxScore,
        settings?.adaptiveCalibrationEnabled,
        user
    ]);

    const scheduleAutoStart = useCallback(() => {
        const store = useAppStore.getState();
        const p = store.appState?.pomodoro;
        const subject = p?.activeSubject;
        if (!subject?.taskId) return;

        const workDurationSeconds = Math.max(1, (Number(settings?.pomodoroWork) || 25) * 60);
        const currentSpeed = Math.max(1, Number(p?.speed) || 1);
        const endsAt = Date.now() + Math.round((workDurationSeconds * 1000) / currentSpeed);

        store.setPomodoroRunning(true);
        try {
            localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                endsAt,
                taskId: subject.taskId,
                sessionInstanceId: subject.sessionInstanceId || null
            }));
            localStorage.setItem('pomodoroState', JSON.stringify({
                activeTaskId: subject.taskId,
                sessionInstanceId: subject.sessionInstanceId || null,
                mode: 'work',
                timeLeft: workDurationSeconds,
                isRunning: true,
                sessions: p?.sessions || 1,
                targetCycles: Math.max(1, Number(p?.targetCycles) || 1),
                completedCycles: p?.completedCycles || 0,
                accumulatedMinutes: p?.accumulatedMinutes || 0,
                speed: currentSpeed,
                savedAt: Date.now()
            }));
        } catch {
            // ignore storage errors
        }
    }, [settings?.pomodoroWork]);

    const handleStartFreeFocus = useCallback((autoStart = false) => {
        const shouldAutoStart = autoStart === true;
        const prevSubject = useAppStore.getState().appState?.pomodoro?.activeSubject;
        if (prevSubject) {
            setData(prev => clearStudyingStatusInContest(prev, prevSubject));
        }
        useAppStore.getState().setPomodoroActiveSubject({
            categoryId: 'geral',
            taskId: `estudo_livre_${Date.now()}`,
            category: 'Geral',
            task: 'Estudo Livre / Foco Aberto',
            priority: 'medium',
            source: 'pomodoro',
            sessionInstanceId: Date.now().toString()
        });
        if (shouldAutoStart) {
            scheduleAutoStart();
        }
        showToast('Sessão de Foco Livre iniciada! ⏱️', 'info');
    }, [showToast, setData, scheduleAutoStart]);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1280);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!clockColRef.current) return;
        const measure = () => {
            if (clockColRef.current) {
                const h = clockColRef.current.offsetHeight;
                if (h > 0) {
                    setClockHeight(prev => (prev === h ? prev : h));
                }
            }
        };

        measure();

        let ro = null;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => {
                measure();
            });
            ro.observe(clockColRef.current);
        }

        return () => {
            if (ro) ro.disconnect();
        };
    }, [isHydrated]);

    // Estado do Tab do Painel Lateral (Missões & Mentor vs Telemetria)
    const [activeSideTab, setActiveSideTab] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroSideTab');
            return saved === 'telemetry' ? 'telemetry' : 'actions';
        } catch {
            return 'actions';
        }
    });

    const handleTabChange = useCallback((newTab) => {
        setActiveSideTab(newTab);
        try {
            localStorage.setItem('pomodoroSideTab', newTab);
        } catch (e) {
            console.warn('[Pomodoro] Falha ao persistir tab lateral:', e);
        }
    }, []);

    useEffect(() => {
        if (location.state?.from) {
            entrySourceRef.current = location.state.from;
        }
    }, [location.state?.from]);

    useEffect(() => {
        // Garantir que a tela do cronômetro seja perfeitamente enquadrada a partir do topo
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (topRef.current) {
            const mainContainer = topRef.current.closest('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [activeSubject?.taskId, activeSubject?.sessionInstanceId]);

    const resolveSessionSource = (subjectSource) => {
        const entry = String(entrySourceRef.current || '').replace(/^\/+/, '');
        const subject = String(subjectSource || '').replace(/^\/+/, '');
        if (entry === 'dashboard') return 'dashboard';
        return subject || entry || 'pomodoro';
    };

    const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroLayoutLocked');
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.error('Failed to parse pomodoroLayoutLocked:', error);
            return true;
        }
    });

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'pomodoroLayoutLocked') {
                try {
                    setIsLayoutLocked(JSON.parse(e.newValue) ?? true);
                } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const toggleLayoutLock = useCallback(() => {
        setIsLayoutLocked(prev => {
            const newState = !prev;
            try {
                localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
                localStorage.setItem('focusPanelLocked', JSON.stringify(newState));
            } catch (err) {
                console.warn('[Pomodoro] Falha ao salvar pomodoroLayoutLocked:', err);
                try {
                    sessionStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
                } catch { /* ignore */ }
            }
            return newState;
        });
    }, []);

    const userStats = useMemo(() => {
        if (!contest || contest === EMPTY_OBJECT) {
            return {
                pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, 0),
                consecutiveMinutes: 0,
                settings: null
            };
        }

        const now = new Date();
        const startOfToday = getLocalMidnight().getTime();
        let consecutiveStudyMinutes = 0;

        const recentLogs = [...(studyLogs || [])]
            .map(log => {
                if (!log || log.type === 'flashcard') return null;
                const rawDate = log.date || log.createdAt || log.timestamp;
                if (!rawDate) return null;
                const isDateOnly = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim());
                const normDate = normalizeDate(rawDate);
                const parsedDate = isDateOnly ? normDate : new Date(rawDate);
                const t = (parsedDate && Number.isFinite(parsedDate.getTime()))
                    ? parsedDate.getTime()
                    : (normDate?.getTime() ?? NaN);
                return Number.isFinite(t) ? { ...log, _parsedTime: t } : null;
            })
            .filter(log => log && log._parsedTime >= startOfToday)
            .sort((a, b) => b._parsedTime - a._parsedTime);

        let lastTimeBoundary = now.getTime();

        for (const log of recentLogs) {
            const logDate = log._parsedTime;
            const minutes = Number(log.minutes ?? log.minutos) || Number(log.duration) || 0;
            if (!logDate || Number.isNaN(logDate) || minutes <= 0) continue;

            const sessionEndTime = log.endDate ? new Date(log.endDate).getTime() : logDate;
            const sessionStartTime = log.endDate ? logDate : (logDate - (minutes * 60 * 1000));
            const boundary = Number.isFinite(sessionEndTime) ? sessionEndTime : logDate;
            const gapInMinutes = Math.max(0, (lastTimeBoundary - boundary) / (1000 * 60));
            if (gapInMinutes > 90) {
                break;
            }

            consecutiveStudyMinutes += minutes;
            lastTimeBoundary = Number.isFinite(sessionStartTime) ? sessionStartTime : (boundary - (minutes * 60 * 1000));
        }

        return {
            pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, 0),
            consecutiveMinutes: consecutiveStudyMinutes,
            settings: settings,
            user: user
        };
    }, [contest, studyLogs, settings, user]);

    useEffect(() => {
        if (location.state?.categoryId && location.state?.taskId) {
            if (!isHydrated) return;
            const incomingState = location.state;

            const isDifferentSubject = !activeSubject ||
                String(activeSubject.taskId) !== String(incomingState.taskId) ||
                String(activeSubject.categoryId) !== String(incomingState.categoryId);

            if (isDifferentSubject) {
                const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
                const cat = safeCats.find(c => c && (String(c.id) === String(incomingState.categoryId) || c.name === incomingState.categoryId));
                if (!cat) return;
                const rawTasks = cat.tasks || [];
                const safeTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
                const tsk = safeTasks.find(t => t && (String(t.id) === String(incomingState.taskId) || t.text === incomingState.taskId || t.title === incomingState.taskId));
                if (cat && tsk) {
                    useAppStore.getState().startPomodoroSession({
                        categoryId: cat.id,
                        taskId: tsk.id || tsk.text || tsk.title,
                        category: cat.name,
                        task: tsk.title || tsk.text || 'Estudo',
                        priority: tsk.priority,
                        source: incomingState?.from || 'dashboard'
                    });
                    navigate(location.pathname, { replace: true, state: null });
                } else {
                    navigate(location.pathname, { replace: true, state: null });
                }
            } else {
                navigate(location.pathname, { replace: true, state: null });
            }
        }
    }, [isHydrated, location.state, location.pathname, categories, activeSubject, navigate]);

    useEffect(() => {
        let timeoutId;
        if (!isHydrated) {
            timeoutId = setTimeout(() => {
                showToast('Contexto pendente. Retornando ao Dashboard...', 'warning');
                navigate('/');
            }, 6000);
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [isHydrated, navigate, showToast]);

    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => { activeSubjectRef.current = activeSubject; }, [activeSubject]);

    useEffect(() => {
        return () => {
            if (completionTimeoutRef.current) {
                const pendingMeta = completionTimeoutRef.current;
                clearTimeout(pendingMeta.timerId || pendingMeta);
                completionTimeoutRef.current = null;
                const p = useAppStore.getState().appState?.pomodoro;
                const samePendingSession = !pendingMeta.sessionInstanceId ||
                    p?.activeSubject?.sessionInstanceId === pendingMeta.sessionInstanceId;
                if (p?.activeSubject && !p?.isRunning && samePendingSession) {
                    const snapshot = p.activeSubject;
                    useAppStore.getState().setData?.(prev => clearStudyingStatusInContest(prev, snapshot));
                    useAppStore.getState().setPomodoroActiveSubject(null);
                }
            }
        };
    }, []);

    const handleExit = useCallback((options = {}) => {
        const subjectSnapshot = options._subjectSnapshot || activeSubjectRef.current;
        const currentSource = options.source || resolveSessionSource(subjectSnapshot?.source);

        if (subjectSnapshot) {
            setData(prev => clearStudyingStatusInContest(prev, subjectSnapshot));
        }

        setPomodoroActiveSubject(null);
        try {
            localStorage.removeItem('pomodoroState');
            localStorage.removeItem('pomodoro-endsAt');
        } catch {
            // ignore
        }
        const returnPath = resolveReturnPath(currentSource, Boolean(options.forceDashboard));
        navigate(returnPath, { replace: Boolean(options.forceDashboard) });
    }, [setData, setPomodoroActiveSubject, navigate]);

    const handleStartTask = useCallback((task, forcedSessionId = null, source = 'pomodoro', autoStart = false) => {
        const sessionId = forcedSessionId || Date.now().toString();
        const pomodoroState = useAppStore.getState().appState?.pomodoro || {};
        const effectiveSource = (pomodoroState.neuralMode && source !== 'dashboard') ? 'neural_core' : source;
        const taskId = task?.id || task?.text || task?.title;
        if (!taskId) return;

        let catId = task.catId || task.categoryId;
        let catName = task.catName || task.category;
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        if (!catId || !catName) {
            const foundCat = safeCats.find(c => {
                if (!c) return false;
                if (catId && String(c.id) === String(catId)) return true;
                if (catName && c.name === catName) return true;
                const tasks = Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {});
                return tasks.some(t => t && (String(t?.id) === String(taskId) || String(t?.text) === String(taskId) || String(t?.title) === String(taskId)));
            });
            if (foundCat) {
                if (!catId) catId = foundCat.id;
                if (!catName) catName = foundCat.name;
            }
        }

        catId = catId || 'geral';
        catName = catName || 'Geral';

        const currentActiveSub = activeSubjectRef.current;
        if (
            currentActiveSub &&
            String(currentActiveSub.taskId) === String(taskId) &&
            isActiveSubjectInCategory({ id: catId, name: catName }, currentActiveSub)
        ) {
            showToast('Esta meta já está em foco! 🎯', 'info');
            return;
        }

        const prevSubject = currentActiveSub || pomodoroState.activeSubject;
        if (prevSubject) {
            setData(prev => clearStudyingStatusInContest(prev, prevSubject));
        }

        if (effectiveSource === 'neural_core') {
            const highPriority = [];
            safeCats.forEach(cat => {
                const catTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
                catTasks.filter(t => t && !t.completed && normalizePriority(t.priority) === 'high').forEach(t => {
                    highPriority.push({ ...t, id: t.id || t.text || t.title, categoryId: cat.id, catName: cat.name });
                });
            });
            const baseQueue = Array.isArray(pomodoroState.neuralQueue) && pomodoroState.neuralQueue.length > 0 && pomodoroState.neuralMode
                ? [...pomodoroState.neuralQueue]
                : [...highPriority];
            let startIndex = baseQueue.findIndex(t => t && String(t.id || t.text || t.title) === String(taskId));
            if (startIndex === -1) {
                baseQueue.unshift({ ...task, id: taskId, categoryId: catId, catName: catName });
                startIndex = 0;
            }
            useAppStore.getState().startNeuralSession(baseQueue, startIndex);
        } else {
            useAppStore.getState().setPomodoroActiveSubject({
                categoryId: catId,
                taskId,
                category: catName,
                task: task.text || task.title || 'Estudo',
                priority: task.priority,
                source: effectiveSource,
                sessionInstanceId: sessionId
            });
        }

        if (autoStart) {
            scheduleAutoStart();
        }
    }, [categories, showToast, setData, scheduleAutoStart]);

    const handleStartRecommended = useCallback((task, autoStart = false) => {
        handleStartTask(task, null, 'neural_core', autoStart);
    }, [handleStartTask]);

    const handleTimerStateChange = useCallback((newState) => {
        setLiveTimerState(prev => {
            if (!prev) return newState;
            if (!newState) return null;
            if (
                prev.isRunning === newState.isRunning &&
                prev.timeLeft === newState.timeLeft &&
                prev.totalTime === newState.totalTime &&
                prev.mode === newState.mode &&
                prev.sessions === newState.sessions &&
                prev.targetCycles === newState.targetCycles &&
                prev.completedCycles === newState.completedCycles &&
                prev.accumulatedMinutes === newState.accumulatedMinutes &&
                prev.speed === newState.speed
            ) {
                return prev;
            }
            return newState;
        });
    }, []);

    const handleFullCycleComplete = useCallback((totalMinutes = 0, wasNatural = true) => {
        const currentSubject = activeSubject || useAppStore.getState().appState?.pomodoro?.activeSubject;
        const { neuralMode } = useAppStore.getState().appState?.pomodoro || {};
        const store = useAppStore.getState();

        if (currentSubject) {
            const safeTotalMins = Number.isFinite(Number(totalMinutes)) ? Math.max(0, Number(totalMinutes)) : 0;
            if (safeTotalMins > 0) {
                if (wasNatural) {
                    showToast(`Série finalizada! ${safeTotalMins} minutos salvos no histórico. 🚀💎`, 'success');
                } else {
                    showToast(`Série concluída! ${safeTotalMins} minutos salvos no histórico. ⚡`, 'info');
                }
            } else {
                showToast('Série encerrada sem minutos registrados.', 'info');
            }
            store.setPomodoroAccumulatedMinutes(0);

            const activeData = store.appState.contests[store.appState.activeId];
            const isSyntheticFreeFocus =
                /^(?:estudo_livre_|agenda_block_)/i.test(String(currentSubject.taskId || '')) ||
                Boolean(currentSubject.isAgendaOnlyBlock);
            const canAutoCompleteTask = !isSyntheticFreeFocus && (wasNatural || safeTotalMins > 0);

            if (canAutoCompleteTask && (neuralMode || currentSubject.source === 'neural_core')) {
                const contestSnapshot = activeData || (store.appState?.coachPlan ? { coachPlan: store.appState.coachPlan } : null);
                const { targetTask } = findSubjectTaskInContest(contestSnapshot, currentSubject);
                const humanSubjectTitle = cleanTaskTitle(targetTask?.title || targetTask?.text || currentSubject.task, currentSubject.category) || 'Meta';

                if (targetTask && !targetTask.completed) {
                    if (typeof store.toggleNeuralTask === 'function') {
                        store.toggleNeuralTask(currentSubject.taskId);
                    }
                    showToast(`Status: "${humanSubjectTitle}" concluído! ✅`, 'success');
                } else if (targetTask?.completed) {
                    showToast(`Sessão finalizada: "${humanSubjectTitle}"! ✅`, 'info');
                }
            } else if (canAutoCompleteTask) {
                const contestSnapshot = activeData || (store.appState?.coachPlan ? { coachPlan: store.appState.coachPlan } : null);
                const { catTask, targetTask } = findSubjectTaskInContest(contestSnapshot, currentSubject);
                const humanSubjectTitle = cleanTaskTitle(targetTask?.title || targetTask?.text || currentSubject.task, currentSubject.category) || 'Meta';

                if (targetTask?.completed) {
                    showToast(`Sessão finalizada: "${humanSubjectTitle}"! ✅`, 'info');
                } else if (catTask && !catTask.completed) {
                    if (typeof store.toggleTask === 'function') {
                        store.toggleTask(currentSubject.categoryId, currentSubject.taskId);
                    }
                    showToast(`Status: "${humanSubjectTitle}" concluído! ✅`, 'success');
                } else if (targetTask && !targetTask.completed && typeof store.toggleNeuralTask === 'function') {
                    store.toggleNeuralTask(currentSubject.taskId);
                    showToast(`Status: "${humanSubjectTitle}" concluído! ✅`, 'success');
                }
            }

            if (neuralMode || currentSubject.source === 'neural_core') {
                const hasNext = store.advanceNeuralQueue();
                if (hasNext) {
                    showToast(`Sequenciando próxima meta do painel... ⚡`, 'info');
                    return;
                } else {
                    showToast('Todas as ações concluídas! Progresso salvo. 🏆', 'success');
                    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current.timerId || completionTimeoutRef.current);
                    const completedSessionId = currentSubject?.sessionInstanceId || null;
                    const timerId = setTimeout(() => {
                        completionTimeoutRef.current = null;
                        if (currentSubject) {
                            setData(prev => clearStudyingStatusInContest(prev, currentSubject));
                        }
                        const p = useAppStore.getState().appState?.pomodoro;
                        if (!completedSessionId || p?.activeSubject?.sessionInstanceId === completedSessionId) {
                            useAppStore.getState().setPomodoroActiveSubject(null);
                        }
                    }, 1000);
                    completionTimeoutRef.current = { timerId, sessionInstanceId: completedSessionId };
                    return;
                }
            }

            const sourceAfterFinish = resolveSessionSource(currentSubject?.source);
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current.timerId || completionTimeoutRef.current);
            const completedSessionId = currentSubject?.sessionInstanceId || null;
            const timerId = setTimeout(() => {
                completionTimeoutRef.current = null;
                const returnPath = resolveReturnPath(sourceAfterFinish, false);
                if (returnPath === '/pomodoro') {
                    showToast('Sessão finalizada! Selecione sua próxima meta.', 'info');
                    try {
                        localStorage.removeItem('pomodoroState');
                        localStorage.removeItem('pomodoro-endsAt');
                    } catch {
                        // ignore storage errors
                    }
                    if (currentSubject) {
                        setData(prev => clearStudyingStatusInContest(prev, currentSubject));
                    }
                    const p = useAppStore.getState().appState?.pomodoro;
                    if (!completedSessionId || p?.activeSubject?.sessionInstanceId === completedSessionId) {
                        setPomodoroActiveSubject(null);
                    }
                    return;
                }
                const p = useAppStore.getState().appState?.pomodoro;
                if (completedSessionId && p?.activeSubject?.sessionInstanceId && p.activeSubject.sessionInstanceId !== completedSessionId) {
                    return;
                }
                showToast('Sessão finalizada! Retornando ao menu de origem...', 'info');
                handleExit({ source: sourceAfterFinish, _subjectSnapshot: currentSubject });
            }, 1000);
            completionTimeoutRef.current = { timerId, sessionInstanceId: completedSessionId };
            return;
        } else {
            store.setPomodoroAccumulatedMinutes(0);
            handleExit();
        }
    }, [activeSubject, handleExit, showToast, setPomodoroActiveSubject, setData]);

    const handleSessionComplete = useCallback(() => {
        setData(prev => ({
            ...prev,
            lastPomodoroDate: new Date().toISOString()
        }));
    }, [setData]);

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center p-12 min-h-screen bg-[#0a0f1e]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Sistema Neural...</p>
                    <p className="text-slate-600 font-medium text-[9px] text-center mt-2 max-w-[250px]">
                        Autenticando parâmetros de foco.<br />Se não escolheu uma tarefa, voltaremos ao Dashboard em breve.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PageErrorBoundary pageName="Pomodoro">
            <div ref={topRef} className="min-h-0 flex items-start justify-center pt-0.5 sm:pt-1 pb-2 sm:pb-3 px-1 sm:px-2 w-full">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 sm:gap-4 lg:gap-5 items-start w-full max-w-full xl:max-w-[1850px] mx-auto">
                    {/* COLUNA 1: CONSOLE DO CRONÔMETRO POMODORO (MEIO A MEIO) */}
                    <div
                        ref={clockColRef}
                        className="w-full flex flex-col items-center gap-1 min-w-0"
                    >
                        <PomodoroTopBar
                            activeSubject={activeSubject}
                            categories={categories || []}
                            isRunning={liveTimerState !== null ? liveTimerState.isRunning : (pomodoroState.isRunning || false)}
                            mode={liveTimerState?.mode || pomodoroState.mode || 'work'}
                            timeLeft={liveTimerState !== null ? liveTimerState.timeLeft : (pomodoroState.timeLeft || (settings?.pomodoroWork || 25) * 60)}
                            targetCycles={liveTimerState?.targetCycles || pomodoroState.targetCycles || 1}
                            completedCycles={liveTimerState?.completedCycles ?? pomodoroState.completedCycles ?? 0}
                            speed={liveTimerState?.speed || pomodoroState.speed || 1}
                            settings={settings}
                        />
                        {/* Telemetria leve da sessão: Modo de Estudo + Energia (1-5) + Bloco ACWR */}
                        <div className="w-full px-3 py-2 rounded-2xl bg-slate-900/75 border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Modo de estudo">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Modo:</span>
                                {STUDY_MODE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => handleChangeStudyMode(opt.id)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border ${studyMode === opt.id
                                            ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200'
                                            : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1" role="group" aria-label="Nível de energia">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Energia:</span>
                                    {[1, 2, 3, 4, 5].map((lvl) => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => handleChangeEnergyLevel(lvl)}
                                            title={`Energia ${lvl}/5`}
                                            aria-pressed={energyLevel === lvl}
                                            className={`w-5 h-5 rounded-md text-[10px] font-mono font-bold transition-all border ${energyLevel === lvl
                                                ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                                                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>

                                {acwrSummary?.hasChronicle && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const timerRunning = liveTimerState !== null ? Boolean(liveTimerState.isRunning) : Boolean(pomodoroState?.isRunning);
                                            if (timerRunning) {
                                                showToast('Pause o cronômetro antes de aplicar o bloco ACWR.', 'warning');
                                                return;
                                            }
                                            const mins = acwrSummary.recommendedBlockMinutes;
                                            if (Number(settings?.pomodoroWork) === mins) {
                                                showToast(`Bloco já está calibrado em ${mins} min (ACWR ${acwrSummary.acwr?.toFixed(2)}×).`, 'info');
                                                return;
                                            }
                                            if (typeof updatePomodoroSettings === 'function') {
                                                updatePomodoroSettings({ pomodoroWork: mins });
                                            } else {
                                                setData((prev) => ({
                                                    ...prev,
                                                    settings: {
                                                        ...(prev?.settings || {}),
                                                        pomodoroWork: mins,
                                                    },
                                                }));
                                            }
                                            showToast(`Bloco Pomodoro adaptado para ${mins} min (ACWR ${acwrSummary.acwr?.toFixed(2)}×)! ⚡`, 'success');
                                        }}
                                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition-all hover:brightness-125 active:scale-95 cursor-pointer ${acwrSummary.zone === 'burnout_risk'
                                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                            : acwrSummary.zone === 'elevated'
                                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                            }`}
                                        title={`Clique para aplicar ${acwrSummary.recommendedBlockMinutes}m ao timer · ACWR ${acwrSummary.acwr?.toFixed(2)}× (7d ${acwrSummary.acuteHours}h vs 28d ${acwrSummary.chronicHours}h)`}
                                    >
                                        ⚡ Aplicar {acwrSummary.recommendedBlockMinutes}m (ACWR)
                                    </button>
                                )}
                            </div>
                        </div>
                        <PomodoroTimer
                            settings={settings}
                            activeSubject={activeSubject}
                            categories={categories || []}
                            onUpdateStudyTime={handleUpdateStudyTimeWithMeta}
                            onExit={handleExit}
                            onSessionComplete={handleSessionComplete}
                            onFullCycleComplete={handleFullCycleComplete}
                            onTimerStateChange={handleTimerStateChange}
                            isLayoutLocked={isLayoutLocked}
                            onToggleLock={toggleLayoutLock}
                            defaultTargetCycles={1}
                            recommendedTask={recommendedTask}
                            onStartRecommended={handleStartRecommended}
                            onStartFreeFocus={handleStartFreeFocus}
                            key={activeSubject?.sessionInstanceId || 'idle'}
                        />
                    </div>

                    {/* COLUNA 2: PAINEL LATERAL (MEIO A MEIO) */}
                    <div
                        className="w-full min-w-0 flex flex-col"
                        style={isDesktop && clockHeight ? { height: `${Math.max(540, clockHeight)}px`, maxHeight: `${Math.max(540, clockHeight)}px` } : undefined}
                    >
                        <PomodoroSidePanel
                            clockHeight={isDesktop ? clockHeight : undefined}
                            activeTab={activeSideTab}
                            setActiveTab={handleTabChange}
                            categories={categories || []}
                            activeSubject={activeSubject}
                            onStartTask={handleStartTask}
                            stats={userStats}
                            neuralMode={neuralMode}
                            neuralQueue={neuralQueue}
                            studyLogs={studyLogs}
                            simulados={simulados}
                            contestId={activeId}
                            user={user}
                            mode={liveTimerState?.mode || pomodoroState.mode || 'work'}
                            isRunning={liveTimerState !== null ? liveTimerState.isRunning : (pomodoroState.isRunning || false)}
                            timeLeft={liveTimerState !== null ? liveTimerState.timeLeft : (pomodoroState.timeLeft || (settings?.pomodoroWork || 25) * 60)}
                            totalTime={liveTimerState?.totalTime || (
                                (liveTimerState?.mode || pomodoroState.mode) === 'break'
                                    ? (settings?.pomodoroBreak || 5) * 60
                                    : (liveTimerState?.mode || pomodoroState.mode) === 'long_break'
                                        ? (settings?.pomodoroLongBreak || 15) * 60
                                        : (settings?.pomodoroWork || 25) * 60
                            )}
                            targetCycles={liveTimerState?.targetCycles || pomodoroState.targetCycles || 1}
                            completedCycles={liveTimerState?.completedCycles ?? pomodoroState.completedCycles ?? 0}
                            accumulatedMinutes={liveTimerState?.accumulatedMinutes ?? pomodoroState.accumulatedMinutes ?? 0}
                            isLayoutLocked={isLayoutLocked}
                            onToggleLock={toggleLayoutLock}
                            settings={settings}
                            speed={liveTimerState?.speed || pomodoroState.speed || 1}
                            recommendedTask={recommendedTask}
                        />
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
    );
}
