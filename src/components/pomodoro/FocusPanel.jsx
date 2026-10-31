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
    Flame, Award, ChevronDown, ChevronUp, Activity, Coffee,
    Plus, Trash2
} from 'lucide-react';
import { calculateStudyStreak } from '../../utils/analytics';
import { getDateKey } from '../../utils/dateHelper';
import { parseTaskDisplay } from '../../utils/taskTitleHelper';
import { getXPProgress } from '../../utils/gamification';

// ============================================================================
// SUBCOMPONENTE: Status da Sessão Atual & Previsões em Tempo Real
// ============================================================================
function SessionStatus({
    isRunning,
    timeLeft,
    totalTime,
    mode,
    targetCycles = 1,
    completedCycles = 0,
    settings = {},
    activeSubject = null
}) {
    const safeTotal = Number.isFinite(totalTime) && totalTime > 0 ? totalTime : 25 * 60;
    const safeLeft = Number.isFinite(timeLeft) && timeLeft >= 0 ? timeLeft : safeTotal;
    const progress = Math.max(0, Math.min(100, ((safeTotal - safeLeft) / safeTotal) * 100));

    const statusConfig = {
        work: {
            dotClass: 'bg-emerald-400',
            barClass: 'bg-emerald-500',
            label: 'Em Foco',
            activeState: 'Sessão Ativa (Cronômetro Rodando)',
            pausedState: 'Foco Pausado',
            icon: Brain
        },
        break: {
            dotClass: 'bg-amber-400',
            barClass: 'bg-amber-500',
            label: 'Pausa Curta',
            activeState: 'Intervalo em Andamento',
            pausedState: 'Pausa Interrompida',
            icon: Coffee
        },
        long_break: {
            dotClass: 'bg-violet-400',
            barClass: 'bg-violet-500',
            label: 'Pausa Longa',
            activeState: 'Recuperação Profunda Ativa',
            pausedState: 'Pausa Interrompida',
            icon: Coffee
        }
    };

    const config = statusConfig[mode] || statusConfig.work;
    const IconComponent = config.icon;

    // Previsão de término do bloco atual (hora de relógio)
    const blockEndTime = useMemo(() => {
        if (!isRunning || !Number.isFinite(safeLeft) || safeLeft <= 0) return null;
        const d = new Date(Date.now() + safeLeft * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, [isRunning, safeLeft]);

    // Previsão da série completa e contagem de ciclos
    const seriesForecast = useMemo(() => {
        const safeTarget = Math.min(20, Math.max(1, Number(targetCycles) || 1));
        const safeCompleted = Math.max(0, Math.min(safeTarget, Number(completedCycles) || 0));

        const workSec = (Number(settings?.pomodoroWork) || 25) * 60;
        const breakSec = (Number(settings?.pomodoroBreak) || 5) * 60;

        let totalSec = safeLeft;
        if (mode === 'work') {
            const currentWillHaveBreak = safeCompleted + 1 < safeTarget;
            if (currentWillHaveBreak) totalSec += breakSec;
            const subsequentCycles = Math.max(0, safeTarget - (safeCompleted + 1));
            totalSec += subsequentCycles * (workSec + breakSec);
        } else {
            const futureWorkCycles = Math.max(0, safeTarget - safeCompleted);
            totalSec += futureWorkCycles * workSec;
            const futureBreakCycles = Math.max(0, futureWorkCycles - 1);
            totalSec += futureBreakCycles * breakSec;
        }

        const seriesEndDate = new Date(Date.now() + totalSec * 1000);
        const seriesEndStr = seriesEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const totalRemainingMinutes = Math.max(1, Math.round(totalSec / 60));
        const isFinalCycle = safeCompleted + 1 >= safeTarget;
        const remainingWorkBlocks = Math.max(0, safeTarget - safeCompleted - (mode === 'work' ? 1 : 0));

        return {
            safeTarget,
            safeCompleted,
            totalRemainingMinutes,
            seriesEndStr,
            isFinalCycle,
            remainingWorkBlocks
        };
    }, [targetCycles, completedCycles, safeLeft, mode, settings]);

    // Previsão do que acontece na próxima etapa (transição imediata)
    const nextPhase = useMemo(() => {
        const safeWorkMin = Number(settings?.pomodoroWork) || 25;
        const safeBreakMin = Number(settings?.pomodoroBreak) || 5;
        const safeLongBreakMin = Number(settings?.pomodoroLongBreak) || 15;
        const longBreakInterval = Number(settings?.longBreakAfter) || 4;

        if (mode === 'work') {
            if (seriesForecast.isFinalCycle) {
                return {
                    title: 'Conclusão da Série e Registro de XP',
                    desc: 'Ao soar o gongo, o ciclo será registrado, o XP creditado e a missão finalizada.',
                    badge: 'Fim da Meta 🎉'
                };
            }
            const isLongBreakNext = (seriesForecast.safeCompleted + 1) % longBreakInterval === 0;
            return {
                title: isLongBreakNext ? `Pausa Longa (${safeLongBreakMin} min)` : `Pausa Curta (${safeBreakMin} min)`,
                desc: isLongBreakNext ? 'Recuperação cognitiva profunda antes do próximo ciclo.' : 'Momento para hidratação, postura e descanso dos olhos.',
                badge: 'Intervalo ☕'
            };
        } else {
            return {
                title: `Bloco de Foco #${seriesForecast.safeCompleted + 1} (${safeWorkMin} min)`,
                desc: activeSubject?.task ? `Retorno imediato ao tópico: ${activeSubject.task}` : 'Concentração total no próximo bloco da série.',
                badge: 'Retorno ao Foco 🎯'
            };
        }
    }, [mode, seriesForecast, settings, activeSubject]);

    const formatSecs = (seconds) => {
        const s = Math.max(0, Math.round(seconds));
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    };

    return (
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-850 to-slate-900/90 rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-lg flex flex-col gap-3">
            {/* Cabeçalho de Status Operacional */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${
                        mode === 'work'
                            ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                            : mode === 'long_break'
                                ? 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                                : 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                    }`}>
                        <IconComponent size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase tracking-wider">
                                {config.label}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${
                                isRunning
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                                {isRunning ? 'Ao Vivo' : 'Pausado'}
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {isRunning ? config.activeState : config.pausedState}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg shadow-inner">
                        {Math.round(progress)}%
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">do bloco atual</span>
                </div>
            </div>

            {/* Barra de Progresso com Glow */}
            <div className="w-full flex flex-col gap-1.5">
                <div className="h-2.5 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                    <Motion.div
                        className={`h-full rounded-full ${config.barClass} shadow-[0_0_12px_rgba(16,185,129,0.5)]`}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                </div>
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 px-0.5">
                    <span>Decorrido: <strong className="text-slate-200">{formatSecs(safeTotal - safeLeft)}</strong></span>
                    <span>Restante: <strong className="text-cyan-300">{formatSecs(safeLeft)}</strong></span>
                </div>
            </div>

            {/* Painel Duplo de Previsões em Tempo Real */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                {/* Previsão 1: Fim do Bloco Atual */}
                <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Clock size={11} className="text-emerald-400 shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wider truncate">
                            Fim deste bloco
                        </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-white tracking-tight">
                        {isRunning ? (blockEndTime || '--:--') : 'Em Pausa'}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 truncate">
                        {isRunning
                            ? (mode === 'work' ? `${Math.ceil(safeLeft / 60)} min para pausa` : `${Math.ceil(safeLeft / 60)} min para foco`)
                            : 'Cronômetro parado'}
                    </span>
                </div>

                {/* Previsão 2: Fim da Série Completa */}
                <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Target size={11} className="text-cyan-400 shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wider truncate">
                            Fim da Série ({seriesForecast.safeCompleted}/{seriesForecast.safeTarget})
                        </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-cyan-300 tracking-tight">
                        {isRunning ? `~${seriesForecast.seriesEndStr}` : `~${seriesForecast.totalRemainingMinutes} min`}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 truncate">
                        {seriesForecast.isFinalCycle
                            ? 'Ciclo final em andamento'
                            : `Restam ${seriesForecast.remainingWorkBlocks} bloco(s) de foco`}
                    </span>
                </div>
            </div>

            {/* Banner da Próxima Etapa (Forecast de Transição) */}
            <div className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors rounded-xl p-2.5 border border-white/5 flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Próxima Etapa
                        </span>
                        <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.2 rounded">
                            {nextPhase.badge}
                        </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 truncate">
                        {nextPhase.title}
                    </p>
                    <p className="text-[9.5px] text-slate-400 truncate mt-0.5">
                        {nextPhase.desc}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Estatísticas da Matéria
// ============================================================================
function SubjectStats({ category, maxScore = 100, simulados = [] }) {
    const stats = useMemo(() => {
        let scores = [];
        if (category?.simuladoStats?.history) {
            const rawHistory = category.simuladoStats.history;
            const history = Array.isArray(rawHistory)
                ? rawHistory
                : Object.values(rawHistory || {});
            scores = history
                .map(h => Number(h?.score ?? h?.accuracy))
                .filter(s => Number.isFinite(s));
        }

        if (!scores.length && Array.isArray(simulados) && simulados.length > 0 && category) {
            simulados.forEach(sim => {
                const sub = sim?.subjects?.find(s => s && (s.id === category.id || s.name === category.name || s.categoryId === category.id));
                if (sub && Number.isFinite(Number(sub.score ?? sub.accuracy))) {
                    scores.push(Number(sub.score ?? sub.accuracy));
                } else if (sim?.categoryScores?.[category.id] !== undefined) {
                    const sc = Number(sim.categoryScores[category.id]);
                    if (Number.isFinite(sc)) scores.push(sc);
                }
            });
        }

        if (!scores.length) return null;

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const last = scores[scores.length - 1];
        const trend = scores.length >= 2 ? last - scores[scores.length - 2] : 0;
        const minScore = Number(category?.minScore) || 0;
        const effectiveMax = Number(category?.maxScore || maxScore) || 100;
        const scoreRange = Math.max(1e-9, effectiveMax - minScore);
        const accuracy = Math.min(100, Math.max(0, ((avg - minScore) / scoreRange) * 100));

        return { avg, last, trend, accuracy, count: scores.length };
    }, [category, maxScore, simulados]);

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
    const currentCycleNumber = Math.min(safeTarget, safeCompleted + (mode === 'work' ? 1 : 0));
    const remainingCycles = Math.max(0, safeTarget - currentCycleNumber);

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
                        <span className="text-[9px] text-slate-400 font-medium">
                            {mode === 'work'
                                ? `Executando Ciclo ${currentCycleNumber} de ${safeTarget}`
                                : `Intervalo do Ciclo ${safeCompleted} de ${safeTarget}`}
                        </span>
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
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-medium">
                {mode === 'break' && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <Coffee size={11} />
                        Pausa ativa — respire e descanse!
                    </span>
                )}
                {mode === 'long_break' && (
                    <span className="flex items-center gap-1.5 text-violet-400">
                        <Coffee size={11} />
                        Pausa longa — recuperação profunda
                    </span>
                )}
                {mode === 'work' && (
                    <span className="flex items-center gap-1.5 text-blue-300">
                        <Zap size={11} />
                        Foco ativo — elimine distrações
                    </span>
                )}
                <span className="text-slate-500 text-[9px]">
                    {remainingCycles === 0 ? 'Ciclo final da série' : `${remainingCycles} ciclo(s) restante(s)`}
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Tempo de Estudo Hoje & Previsão de Impacto
// ============================================================================
function TodayStudyTime({ studyLogs, categoryId, taskId, isRunning, mode, nominalWorkMinutes = 25 }) {
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
            <div className="mt-2 text-[10px] text-slate-500 font-medium flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-cyan-500/70" />
                    <span>{todayData.sessionCount} {todayData.sessionCount === 1 ? 'sessão registrada hoje' : 'sessões registradas hoje'}</span>
                </div>
                {isRunning && mode === 'work' && (
                    <span className="text-emerald-400 font-bold text-[9.5px]">
                        +{nominalWorkMinutes}m ao concluir
                    </span>
                )}
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
        const rawProgress = getXPProgress(user.xp);
        return {
            level: rawProgress.level,
            progress: rawProgress.percentage,
            xp: rawProgress.xp
        };
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
    const nextTask = useMemo(() => {
        if (!categories) return null;
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories);
        // Prioridade 1: Tarefas de alta prioridade não concluídas
        for (const cat of safeCats) {
            if (!cat) continue;
            const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            for (const task of tasks) {
                if (task && !task.completed && (task.id || task.text) !== currentTaskId && task.priority === 'high') {
                    return { ...task, catName: cat.name };
                }
            }
        }

        // Prioridade 2: Tarefas de média prioridade não concluídas caso não haja alta
        for (const cat of safeCats) {
            if (!cat) continue;
            const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            for (const task of tasks) {
                if (task && !task.completed && (task.id || task.text) !== currentTaskId && task.priority === 'medium') {
                    return { ...task, catName: cat.name };
                }
            }
        }
        return null;
    }, [categories, currentTaskId]);

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
// SUBCOMPONENTE: Painel Anti-Distração (Brain Dump)
// ============================================================================
export const BrainDumpNotes = React.memo(function BrainDumpNotes() {
    const [notes, setNotes] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoro_brain_dump');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [inputValue, setInputValue] = useState('');

    const saveNotes = (updated) => {
        setNotes(updated);
        try {
            localStorage.setItem('pomodoro_brain_dump', JSON.stringify(updated));
        } catch {
            /* ignore */
        }
    };

    const handleAdd = (e) => {
        if (e) e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        const newNotes = [{ id: Date.now(), text: trimmed, completed: false }, ...notes];
        saveNotes(newNotes);
        setInputValue('');
    };

    const toggleNote = (id) => {
        const newNotes = notes.map(n => n.id === id ? { ...n, completed: !n.completed } : n);
        saveNotes(newNotes);
    };

    const deleteNote = (id) => {
        const newNotes = notes.filter(n => n.id !== id);
        saveNotes(newNotes);
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                        <Brain size={13} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            Anti-Distração (Brain Dump)
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">Capture pensamentos sem parar o foco</span>
                    </div>
                </div>
                {notes.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                        {notes.filter(n => !n.completed).length} pendentes
                    </span>
                )}
            </div>
            <form onSubmit={handleAdd} className="flex items-center gap-1.5 mb-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Pensamento ou pendência? Anote e aperte Enter..."
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-900/60 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/30 text-cyan-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Adicionar anotação"
                >
                    <Plus size={13} />
                </button>
            </form>
            {notes.length > 0 && (
                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                    {notes.slice(0, 8).map((note) => (
                        <div
                            key={note.id}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs group"
                        >
                            <button
                                type="button"
                                onClick={() => toggleNote(note.id)}
                                className={`text-left flex-1 min-w-0 truncate text-[11px] ${note.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}
                            >
                                {note.text}
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteNote(note.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition-opacity"
                                title="Remover"
                            >
                                <Trash2 size={11} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// ============================================================================
// FOCUS PANEL PRINCIPAL (Visualização de Telemetria e Foco da Sessão)
// ============================================================================
export function SessionFocusPanel({
    activeSubject,
    categories,
    studyLogs,
    simulados = [],
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

    const parsedTask = useMemo(() => {
        return parseTaskDisplay(activeSubject?.task, activeSubject?.category, currentCategory || safeCats);
    }, [activeSubject?.task, activeSubject?.category, currentCategory, safeCats]);

    const activeModeBadge = useMemo(() => {
        if (parsedTask.alertBadge) return parsedTask.alertBadge;
        const text = String(activeSubject?.task || '');
        if (/Revisão por Recência/i.test(text)) {
            return { label: 'Recência', icon: '🧊', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
        }
        if (/Avanço de Edital/i.test(text)) {
            return { label: 'Edital', icon: '📖', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' };
        }
        if (/SRS Blitz/i.test(text)) {
            return { label: 'Flashcards', icon: '⚡', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
        }
        if (/Consolidação/i.test(text) || /Síntese/i.test(text) || /Bateria Ativa/i.test(text)) {
            return { label: 'Síntese', icon: '🧠', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
        }
        if (/Revisão Expressa/i.test(text) || /Treino Rápido/i.test(text) || /Treino de Agilidade/i.test(text)) {
            return { label: 'Rápida', icon: '⚡', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
        }
        if (/Manutenção/i.test(text)) {
            return { label: 'Manutenção', icon: '🛡️', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        }
        return null;
    }, [activeSubject?.task, parsedTask.alertBadge]);

    return (
        <div className="w-full flex flex-col gap-3.5" role="complementary" aria-label="Painel de telemetria da sessão">
            {/* Header do Foco Ativo */}
            {activeSubject ? (
                <div className="flex flex-col gap-2 pb-2.5 border-b border-white/5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                <Zap size={16} className="text-indigo-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Disciplina:</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 truncate" title={activeSubject.category || currentCategory?.name || 'Geral'}>
                                        {activeSubject.category || currentCategory?.name || 'Geral'}
                                    </span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-black text-white truncate flex items-baseline gap-1" title={parsedTask.displayTopic || 'Teoria Geral e Fundamentos'}>
                                    <span className="text-[11px] font-bold text-slate-400 shrink-0">Assunto:</span>
                                    <span className="truncate">{parsedTask.displayTopic || 'Teoria Geral e Fundamentos'}</span>
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {activeModeBadge && (
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 ${activeModeBadge.color}`}>
                                    <span>{activeModeBadge.icon}</span>
                                    <span>{activeModeBadge.label}</span>
                                </span>
                            )}
                            {activeSubject.priority && (
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
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
                    </div>

                    {/* Dica de Ação Estratégica da Sessão (100% Exclusiva para Estudo) */}
                    {activeModeBadge && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-2 text-[10.5px] text-slate-300">
                            <span className="shrink-0">{activeModeBadge.icon}</span>
                            <span className="truncate">
                                {activeModeBadge.label === 'Recência' && 'Reative a memória de longo prazo revisando grifos, notas e resumos estruturados.'}
                                {activeModeBadge.label === 'Edital' && 'Construa a base teórica inicial deste novo tópico e anote os pontos-chave no material.'}
                                {activeModeBadge.label === 'Flashcards' && 'Zere os cartões de repetição espaçada para fixar conceitos e fórmulas essenciais.'}
                                {activeModeBadge.label === 'Síntese' && 'Estudo profundo: elabore mapas conceituais, fichamento ou faça auto-explicação dos tópicos densos.'}
                                {activeModeBadge.label === 'Livre' && 'Sessão livre de estudo: mantenha foco contínuo e anote os tópicos abordados ao concluir.'}
                                {activeModeBadge.label === 'Rápida' && 'Revisão expressa: passe os olhos em mnemônicos, fórmulas e conceitos-chave com velocidade.'}
                                {activeModeBadge.label === 'Manutenção' && 'Manutenção de retenção: consolide os pontos críticos para evitar a curva do esquecimento.'}
                            </span>
                        </div>
                    )}

                    {/* Linha de Status Operacional e Previsão de Impacto */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                        <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            <span>{isRunning ? 'Sessão Ativa: Tempo contabilizado para o tópico' : 'Sessão em Espera: Inicie o relógio para progredir'}</span>
                        </span>
                        {isRunning && mode === 'work' && (
                            <span className="font-semibold text-emerald-400">
                                +{(Number(settings?.pomodoroWork) || 25)} min de retenção
                            </span>
                        )}
                    </div>
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

            {/* Status da Sessão & Previsões em Tempo Real */}
            <SessionStatus
                isRunning={isRunning}
                timeLeft={timeLeft}
                totalTime={totalTime}
                mode={mode}
                targetCycles={targetCycles}
                completedCycles={completedCycles}
                settings={settings}
                activeSubject={activeSubject}
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
                    simulados={simulados}
                    maxScore={Number(currentCategory?.maxScore || settings?.maxScore) || 100}
                />
            )}

            {/* Tempo de Estudo Hoje */}
            <TodayStudyTime
                studyLogs={studyLogs || []}
                categoryId={activeSubject?.categoryId || currentCategory?.id}
                taskId={activeSubject?.taskId}
                isRunning={isRunning}
                mode={mode}
                nominalWorkMinutes={Number(settings?.pomodoroWork) || 25}
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

            {/* Painel Anti-Distração (Brain Dump) */}
            <BrainDumpNotes />

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
