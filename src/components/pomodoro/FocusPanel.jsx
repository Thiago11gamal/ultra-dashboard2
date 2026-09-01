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

// ============================================================================
// SUBCOMPONENTE: Status da Sessão Atual
// ============================================================================
function SessionStatus({ activeSubject, isRunning, timeLeft, totalTime, mode }) {
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
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 border border-white/5 shadow-md">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isRunning ? `${config.dotClass} animate-pulse` : 'bg-slate-500'}`} />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <IconComponent size={13} className="text-slate-400" />
                        {config.label}
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
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
        const accuracy = Math.min(100, Math.max(0, (avg / maxScore) * 100));

        return { avg, last, trend, accuracy, count: scores.length };
    }, [category, maxScore]);

    if (!stats) return null;

    const trendIcon = stats.trend > 0.5
        ? <TrendingUp size={14} className="text-emerald-400" />
        : stats.trend < -0.5
            ? <TrendingDown size={14} className="text-rose-400" />
            : <Minus size={14} className="text-slate-400" />;

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <BookOpen size={14} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Stats da Matéria
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                    <div className="text-lg font-black text-white">{Math.round(stats.accuracy)}%</div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Média</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-black text-white">{stats.count}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Simulados</div>
                </div>
                <div className="text-center flex flex-col items-center">
                    <div className="flex items-center gap-1">
                        {trendIcon}
                        <span className="text-lg font-black text-white">
                            {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}
                        </span>
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Tendência</div>
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
        if (!studyLogs || !Array.isArray(studyLogs)) return { current: 0, best: 0, isActive: false };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const studyDays = new Set();
        (studyLogs || []).forEach(log => {
            if (log && log.date) {
                const logDate = new Date(log.date);
                if (!Number.isNaN(logDate.getTime())) {
                    logDate.setHours(0, 0, 0, 0);
                    studyDays.add(logDate.getTime());
                }
            }
        });

        const sortedDays = Array.from(studyDays).sort((a, b) => b - a);

        let current = 0;
        let checkDate = new Date(today);

        while (studyDays.has(checkDate.getTime())) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        let best = 0;
        let tempStreak = 1;

        for (let i = 1; i < sortedDays.length; i++) {
            const diff = (sortedDays[i - 1] - sortedDays[i]) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                tempStreak++;
            } else {
                best = Math.max(best, tempStreak);
                tempStreak = 1;
            }
        }
        best = Math.max(best, tempStreak, current);

        return { current, best, isActive: current > 0 };
    }, [studyLogs]);

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Flame size={16} className={streak.isActive ? 'text-orange-400' : 'text-slate-500'} />
                    <span className="text-xs font-bold text-slate-300">Sequência</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-2xl font-black ${streak.isActive ? 'text-orange-400' : 'text-slate-400'}`}>
                        {streak.current}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">dias</span>
                </div>
            </div>
            {streak.isActive && streak.current >= 2 && (
                <div className="mt-2 text-[10px] text-orange-300/80 flex items-center gap-1 font-medium">
                    <Flame size={10} />
                    {streak.current} dias consecutivos de foco! Recorde: {streak.best}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Progresso do Ciclo Pomodoro
// ============================================================================
function PomodoroCycleProgress({ targetCycles, completedCycles, mode }) {
    const safeTarget = Math.max(1, Number(targetCycles) || 1);
    const safeCompleted = Math.max(0, Math.min(safeTarget, Number(completedCycles) || 0));

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Ciclo Pomodoro
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-300">
                    {safeCompleted}/{safeTarget}
                </span>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: safeTarget }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
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
                    <Coffee size={10} />
                    Pausa ativa — respire e descanse!
                </div>
            )}
            {mode === 'long_break' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-violet-400 font-medium">
                    <Coffee size={10} />
                    Pausa longa — recuperação profunda
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Tempo de Estudo Hoje
// ============================================================================
function TodayStudyTime({ studyLogs, categoryId }) {
    const todayData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const safeLogs = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
        const todayLogs = safeLogs.filter(log => {
            if (!log || !log.date) return false;
            const logDate = new Date(log.date);
            if (Number.isNaN(logDate.getTime())) return false;
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        });

        const totalMinutes = todayLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const categoryMinutes = categoryId
            ? todayLogs
                .filter(log => log.categoryId === categoryId)
                .reduce((acc, log) => acc + (Number(log.minutes) || 0), 0)
            : 0;
        const sessionCount = todayLogs.length;

        return { totalMinutes, categoryMinutes, sessionCount };
    }, [studyLogs, categoryId]);

    const formatTime = (minutes) => {
        const total = Math.max(0, Math.round(Number(minutes) || 0));
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        if (hours === 0) return `${mins}min`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Hoje
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <div className="text-lg font-black text-white">
                        {formatTime(todayData.categoryMinutes)}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Nesta matéria</div>
                </div>
                <div>
                    <div className="text-lg font-black text-white">
                        {formatTime(todayData.totalMinutes)}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Total geral</div>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-medium">
                {todayData.sessionCount} {todayData.sessionCount === 1 ? 'sessão registrada hoje' : 'sessões registradas hoje'}
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
        const xp = Number(user.xp) || 0;
        const level = Math.floor(Math.sqrt(xp / 100)) + 1;
        const currentLevelXP = Math.pow(level - 1, 2) * 100;
        const nextLevelXP = Math.pow(level, 2) * 100;
        const progress = nextLevelXP > currentLevelXP
            ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
            : 0;
        return { level, progress: Math.min(100, Math.max(0, progress)), xp };
    }, [user]);

    if (!xpProgress) return null;

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Award size={14} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Nível {xpProgress.level}
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">{xpProgress.xp} XP</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <Motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                    animate={{ width: `${xpProgress.progress}%` }}
                />
            </div>
            <div className="mt-1 text-right text-[9px] text-slate-500 font-medium">
                {Math.round(xpProgress.progress)}% para o próximo nível
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Próxima Tarefa
// ============================================================================
function NextTaskPreview({ categories, currentTaskId }) {
    const nextTask = useMemo(() => {
        if (!categories) return null;
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});

        for (const cat of safeCats) {
            if (!cat) continue;
            const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            for (const task of tasks) {
                if (task && !task.completed && (task.id || task.text) !== currentTaskId && task.priority === 'high') {
                    return { ...task, catName: cat.name };
                }
            }
        }
        return null;
    }, [categories, currentTaskId]);

    if (!nextTask) return null;

    return (
        <div className="bg-slate-800/30 rounded-xl p-3 border border-dashed border-white/10">
            <div className="flex items-center gap-2 mb-1">
                <Target size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Próxima Tarefa Crítica
                </span>
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">
                {nextTask.title || nextTask.text || 'Próxima atividade'}
            </div>
            {nextTask.catName && (
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{nextTask.catName}</div>
            )}
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
    completedCycles
}) {
    const [showMoreStats, setShowMoreStats] = useState(false);

    const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
    const currentCategory = activeSubject ? safeCats.find(c => c && c.id === activeSubject.categoryId) : null;

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
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
                    <p className="text-xs font-bold text-indigo-300">Telemetria em Espera</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Selecione uma matéria ou tarefa para iniciar o rastreamento em tempo real.</p>
                </div>
            )}

            {/* Status da Sessão */}
            <SessionStatus
                activeSubject={activeSubject}
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
                <SubjectStats category={currentCategory} />
            )}

            {/* Tempo de Estudo Hoje */}
            <TodayStudyTime
                studyLogs={studyLogs || []}
                categoryId={activeSubject?.categoryId}
            />

            {/* Streak */}
            <StreakDisplay studyLogs={studyLogs || []} />

            {/* XP */}
            <SessionXP user={user} />

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
                                            {completedCycles * 25}min
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
