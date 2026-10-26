/**
 * ============================================================================
 * FOCUS PANEL - Painel de Foco e Telemetria da Sessão
 * ============================================================================
 * Exibe informações detalhadas sobre a sessão ativa e telemetria:
 * - Status e progresso da sessão em tempo real
 * - Progresso dos ciclos Pomodoro
 * - Estatísticas da matéria em simulados (média, tendência)
 * - Tempo de estudo hoje (nesta matéria e total)
 * - Sequência (streak) e consistência diária
 * - Gamificação: Nível e XP
 * - Próxima tarefa prioritária
 * - Métricas expandidas de foco e meta
 * ============================================================================
 */
import React, { useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    Target, Clock, Trophy, TrendingUp, TrendingDown,
    Minus, Zap, Brain, BookOpen, CheckCircle2,
    Flame, Award, ChevronDown, ChevronUp, Activity, Coffee
} from 'lucide-react';
import { calculateStudyStreak } from '../../utils/analytics';
import { getDateKey } from '../../utils/dateHelper';

// ============================================================================
// SUBCOMPONENTE: Status da Sessão Atual
// ============================================================================
function SessionStatus({ isRunning, timeLeft, totalTime, mode }) {
    const safeTotal = Number.isFinite(totalTime) && totalTime > 0 ? totalTime : 25 * 60;
    const safeLeft = Number.isFinite(timeLeft) && timeLeft >= 0 ? timeLeft : safeTotal;
    const progress = Math.max(0, Math.min(100, ((safeTotal - safeLeft) / safeTotal) * 100));

    const statusConfig = {
        work: {
            dotClass: 'bg-emerald-400',
            barClass: 'bg-emerald-500',
            label: 'Em Foco',
            icon: Brain
        },
        break: {
            dotClass: 'bg-amber-400',
            barClass: 'bg-amber-500',
            label: 'Pausa Curta',
            icon: Coffee
        },
        long_break: {
            dotClass: 'bg-violet-400',
            barClass: 'bg-violet-500',
            label: 'Pausa Longa',
            icon: Coffee
        }
    };

    const config = statusConfig[mode] || statusConfig.work;
    const IconComponent = config.icon;

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-3.5 sm:p-4 border border-white/5 shadow-md">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm ${
                        mode === 'work'
                            ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                            : mode === 'long_break'
                                ? 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                                : 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                    }`}>
                        <IconComponent size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                                {config.label}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? `${config.dotClass} animate-pulse` : 'bg-slate-500'}`} />
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium">Estado da sessão</span>
                    </div>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-md shadow-sm">
                    {Math.round(progress)}%
                </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <Motion.div
                    className={`h-full rounded-full ${config.barClass}`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-400">
                <span>Início da etapa</span>
                <span>{Math.round(100 - progress)}% restante</span>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Estatísticas da Matéria
// ============================================================================
function SubjectStats({ category, maxScore = 100 }) {
    const stats = useMemo(() => {
        if (!category?.simuladoStats?.history) return null;

        const rawHistory = category.simuladoStats.history;
        const history = Array.isArray(rawHistory)
            ? rawHistory
            : Object.values(rawHistory || {});

        if (!history.length) return null;

        const scores = history
            .map(h => Number(h?.score ?? h?.accuracy))
            .filter(s => Number.isFinite(s));

        if (!scores.length) return null;

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const last = scores[scores.length - 1];
        const trend = scores.length >= 2 ? last - scores[scores.length - 2] : 0;
        const minScore = Number(category?.minScore) || 0;
        const effectiveMax = Number(category?.maxScore || maxScore) || 100;
        const scoreRange = Math.max(1e-9, effectiveMax - minScore);
        const accuracy = Math.min(100, Math.max(0, ((avg - minScore) / scoreRange) * 100));

        return { avg, last, trend, accuracy, count: scores.length };
    }, [category, maxScore]);

    if (!stats) return null;

    const trendIcon = stats.trend > 0.5
        ? <TrendingUp size={13} className="text-emerald-400" />
        : stats.trend < -0.5
            ? <TrendingDown size={13} className="text-rose-400" />
            : <Minus size={13} className="text-slate-400" />;

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                    <BookOpen size={14} />
                </div>
                <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                        Stats da Matéria
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">Histórico de simulados</span>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-slate-900/40 p-2 rounded-lg border border-white/[0.04]">
                <div className="text-center">
                    <div className="text-base font-black text-white">{Math.round(stats.accuracy)}%</div>
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">Média</div>
                </div>
                <div className="text-center">
                    <div className="text-base font-black text-white">{stats.count}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">Simulados</div>
                </div>
                <div className="text-center flex flex-col items-center">
                    <div className="flex items-center gap-1">
                        {trendIcon}
                        <span className="text-base font-black text-white">
                            {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}
                        </span>
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">Tendência</div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Streak e Consistência
// ============================================================================
function StreakDisplay({ studyLogs }) {
    const streak = useMemo(() => {
        try {
            const res = calculateStudyStreak(studyLogs || []);
            return {
                current: res?.current || 0,
                best: res?.best || res?.longest || 0,
                isActive: Boolean(res?.isActive)
            };
        } catch (e) {
            console.warn('[FocusPanel] Falha ao calcular streak:', e);
            return { current: 0, best: 0, isActive: false };
        }
    }, [studyLogs]);

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
                        <Flame size={14} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Sequência
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Consistência</span>
                    </div>
                </div>
                <div className="flex items-baseline gap-1 bg-orange-950/40 border border-orange-500/20 px-2 py-0.5 rounded-md shadow-sm">
                    <span className={`text-base font-black ${streak.isActive ? 'text-orange-400' : 'text-slate-400'}`}>
                        {streak.current}
                    </span>
                    <span className="text-[9px] text-orange-300/80 font-bold uppercase">dias</span>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-orange-300/80 flex items-center gap-1.5 font-medium">
                <Flame size={11} className="shrink-0 text-orange-400" />
                <span className="truncate">
                    {streak.current >= 2
                        ? `${streak.current} dias seguidos! Recorde: ${streak.best}`
                        : `Estude hoje para manter o ritmo!`}
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Progresso do Ciclo Pomodoro
// ============================================================================
function PomodoroCycleProgress({ targetCycles, completedCycles, mode }) {
    const safeTarget = Math.min(20, Math.max(1, Number(targetCycles) || 1));
    const safeCompleted = Math.max(0, Math.min(safeTarget, Number(completedCycles) || 0));

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                        <Activity size={14} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Ciclo Pomodoro
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Progresso de blocos</span>
                    </div>
                </div>
                <span className="text-xs font-mono font-bold text-blue-300 bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-md shadow-sm">
                    {safeCompleted}/{safeTarget}
                </span>
            </div>
            <div className="flex gap-1.5 w-full overflow-hidden">
                {Array.from({ length: safeTarget }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 min-w-0 ${
                            i < safeCompleted
                                ? 'bg-blue-500 shadow-sm'
                                : i === safeCompleted && mode === 'work'
                                    ? 'bg-blue-500/40 animate-pulse'
                                    : 'bg-slate-700/50'
                        }`}
                    />
                ))}
            </div>
            {mode === 'break' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <Coffee size={11} />
                    Pausa ativa — respire e descanse!
                </div>
            )}
            {mode === 'long_break' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-violet-400 font-medium">
                    <Coffee size={11} />
                    Pausa longa — recuperação profunda
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Tempo de Estudo Hoje
// ============================================================================
function TodayStudyTime({ studyLogs, categoryId, taskId }) {
    const todayData = useMemo(() => {
        const todayKey = getDateKey(new Date());

        const safeLogs = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
        const todayLogs = safeLogs.filter(log => {
            if (!log) return false;
            const rawDate = log.date || log.createdAt || log.timestamp;
            if (!rawDate) return false;
            return getDateKey(rawDate) === todayKey;
        });

        const totalMinutes = todayLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const categoryMinutes = (categoryId || taskId)
            ? todayLogs
                .filter(log => (categoryId && log.categoryId === categoryId) || (taskId && log.taskId === taskId))
                .reduce((acc, log) => acc + (Number(log.minutes) || 0), 0)
            : 0;
        const sessionCount = todayLogs.length;

        return { totalMinutes, categoryMinutes, sessionCount };
    }, [studyLogs, categoryId, taskId]);

    const formatTime = (minutes) => {
        const total = Math.max(0, Math.round(Number(minutes) || 0));
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                    <Clock size={14} />
                </div>
                <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                        Tempo de Estudo
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">Registrado hoje</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-2 rounded-lg border border-white/[0.04]">
                <div>
                    <div className="text-base font-black text-white">
                        {formatTime(todayData.categoryMinutes)}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">Nesta matéria</div>
                </div>
                <div>
                    <div className="text-base font-black text-white">
                        {formatTime(todayData.totalMinutes)}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">Total geral</div>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-cyan-500/70" />
                <span>{todayData.sessionCount} {todayData.sessionCount === 1 ? 'sessão registrada hoje' : 'sessões registradas hoje'}</span>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: XP e Nível
// ============================================================================
function SessionXP({ user }) {
    const xpProgress = useMemo(() => {
        if (!user) return null;
        const xp = Math.max(0, Number(user.xp) || 0);
        const level = Math.floor(Math.sqrt(xp / 100)) + 1;
        const currentLevelXP = Math.pow(level - 1, 2) * 100;
        const nextLevelXP = Math.pow(level, 2) * 100;
        const diff = nextLevelXP - currentLevelXP;
        const progress = diff > 0
            ? ((xp - currentLevelXP) / diff) * 100
            : 0;
        return { level, progress: Math.min(100, Math.max(0, progress)), xp };
    }, [user]);

    if (!xpProgress) return null;

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                        <Award size={14} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Nível {xpProgress.level}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Gamificação</span>
                    </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-md shadow-sm">
                    {xpProgress.xp} XP
                </span>
            </div>
            <div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <Motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        animate={{ width: `${xpProgress.progress}%` }}
                    />
                </div>
                <div className="mt-1 text-right text-[9px] text-slate-400 font-medium">
                    {Math.round(xpProgress.progress)}% para o próximo nível
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Próxima Tarefa
// ============================================================================
function NextTaskPreview({ categories, currentTaskId }) {
    let nextTask = null;
    if (categories) {
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories);
        // Prioridade 1: Tarefas de alta prioridade não concluídas
        for (const cat of safeCats) {
            if (!cat) continue;
            const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            for (const task of tasks) {
                if (task && !task.completed && (task.id || task.text) !== currentTaskId && task.priority === 'high') {
                    nextTask = { ...task, catName: cat.name };
                    break;
                }
            }
            if (nextTask) break;
        }

        // Prioridade 2: Tarefas de média prioridade não concluídas caso não haja alta
        if (!nextTask) {
            for (const cat of safeCats) {
                if (!cat) continue;
                const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                for (const task of tasks) {
                    if (task && !task.completed && (task.id || task.text) !== currentTaskId && task.priority === 'medium') {
                        nextTask = { ...task, catName: cat.name };
                        break;
                    }
                }
                if (nextTask) break;
            }
        }
    }

    if (!nextTask) return null;

    const isHighPriority = nextTask.priority === 'high';

    return (
        <div className="bg-slate-800/30 rounded-xl p-3 border border-dashed border-white/10 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${
                isHighPriority
                    ? 'bg-rose-500/15 border-rose-500/25 text-rose-400'
                    : 'bg-purple-500/15 border-purple-500/25 text-purple-400'
            }`}>
                <Target size={15} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {isHighPriority ? 'Próxima Tarefa Crítica' : 'Próxima Tarefa'}
                    </span>
                    {isHighPriority && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
                </div>
                <div className="text-xs text-slate-200 font-semibold truncate">
                    {nextTask.title || nextTask.text || 'Próxima atividade'}
                </div>
                {nextTask.catName && (
                    <div className="text-[10px] text-slate-500 font-medium truncate">{nextTask.catName}</div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// FOCUS PANEL PRINCIPAL (Visualização de Telemetria e Foco da Sessão)
// ============================================================================
export function SessionFocusPanel({
    activeSubject,
    categories,
    studyLogs,
    user,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    targetCycles,
    completedCycles,
    settings
}) {
    const [showMoreStats, setShowMoreStats] = useState(false);

    const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
    const currentCategory = activeSubject ? safeCats.find(c => c && (c.id === activeSubject.categoryId || (activeSubject.category && c.name === activeSubject.category))) : null;

    return (
        <div className="w-full flex flex-col gap-3.5" role="complementary" aria-label="Painel de telemetria da sessão">
            {/* Header do Foco Ativo */}
            {activeSubject ? (
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <Zap size={16} className="text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm font-black text-white truncate" title={activeSubject.task || 'Sessão de Estudo'}>
                                {activeSubject.task || 'Sessão de Estudo'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{activeSubject.category || 'Geral'}</p>
                        </div>
                    </div>
                    {activeSubject.priority && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            activeSubject.priority === 'high'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : activeSubject.priority === 'medium'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                            {activeSubject.priority === 'high' ? 'Alta' : activeSubject.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                    )}
                </div>
            ) : (
                <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                        <Activity size={18} className="animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                            <span>Telemetria em Espera</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-ping" />
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Selecione uma matéria ou tarefa no painel ou inicie o relógio para rastrear em tempo real.</p>
                    </div>
                </div>
            )}

            {/* Status da Sessão */}
            <SessionStatus
                isRunning={isRunning}
                timeLeft={timeLeft}
                totalTime={totalTime}
                mode={mode}
            />

            {/* Progresso do Ciclo */}
            <PomodoroCycleProgress
                targetCycles={targetCycles}
                completedCycles={completedCycles}
                mode={mode}
            />

            {/* Stats da Matéria */}
            {currentCategory && (
                <SubjectStats
                    category={currentCategory}
                    maxScore={Number(currentCategory?.maxScore || settings?.maxScore) || 100}
                />
            )}

            {/* Tempo de Estudo Hoje */}
            <TodayStudyTime
                studyLogs={studyLogs || []}
                categoryId={activeSubject?.categoryId || currentCategory?.id}
                taskId={activeSubject?.taskId}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Streak */}
                <StreakDisplay studyLogs={studyLogs || []} />

                {/* XP */}
                <SessionXP user={user} />
            </div>

            {/* Próxima Tarefa */}
            <NextTaskPreview
                categories={categories}
                currentTaskId={activeSubject?.taskId}
            />

            {/* Botão para mais stats */}
            <button
                type="button"
                onClick={() => setShowMoreStats(!showMoreStats)}
                className="flex items-center justify-center gap-2 p-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
            >
                {showMoreStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showMoreStats ? 'Menos detalhes' : 'Mais detalhes'}
            </button>

            {/* Stats Expandidas */}
            <AnimatePresence>
                {showMoreStats && (
                    <Motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 space-y-2">
                            <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Progresso Geral
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="text-center">
                                        <div className="text-lg font-black text-white">
                                            {completedCycles * (Math.max(1, Number(settings?.pomodoroWork) || 25))}min
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase font-medium">Foco total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-black text-white">
                                            {Math.round((completedCycles / Math.max(1, targetCycles || 1)) * 100)}%
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase font-medium">Meta</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SessionFocusPanel;
