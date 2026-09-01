/**
 * ============================================================================
 * FOCUS PANEL - Painel de Foco Ativo ao Lado do Relógio
 * ============================================================================
 * Exibe informações detalhadas sobre a tarefa em foco:
 * - Status e progresso da sessão
 * - Estatísticas da matéria
 * - Streak e consistência
 * - Métricas de produtividade
 * - Próxima tarefa
 * ============================================================================
 */
import React, { useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    Target, Clock, Calendar, Trophy, TrendingUp, TrendingDown,
    Minus, Zap, Brain, BookOpen, CheckCircle2, AlertTriangle,
    Flame, Award, ChevronDown, ChevronUp, Activity, Coffee
} from 'lucide-react';

// ============================================================================
// SUBCOMPONENTE: Status da Sessão Atual
// ============================================================================
function SessionStatus({ activeSubject, isRunning, timeLeft, totalTime, mode }) {
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    
    const statusConfig = {
        work: { color: 'emerald', label: 'Em Foco', icon: Brain },
        break: { color: 'amber', label: 'Pausa Curta', icon: Coffee },
        long_break: { color: 'violet', label: 'Pausa Longa', icon: Coffee }
    };

    const config = statusConfig[mode] || statusConfig.work;

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isRunning ? `bg-${config.color}-400 animate-pulse` : 'bg-slate-500'}`} />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <config.icon size={12} />
                        {config.label}
                    </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                    {Math.round(progress)}%
                </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <Motion.div
                    className={`h-full rounded-full bg-${config.color}-500`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                <span>Início</span>
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
        
        const history = Array.isArray(category.simuladoStats.history) 
            ? category.simuladoStats.history 
            : Object.values(category.simuladoStats.history || {});
        
        if (!history.length) return null;

        const scores = history
            .map(h => h.score)
            .filter(s => Number.isFinite(s));

        if (!scores.length) return null;

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const last = scores[scores.length - 1];
        const trend = scores.length >= 2 ? last - scores[scores.length - 2] : 0;
        const accuracy = (avg / maxScore) * 100;

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
                    <div className="text-[9px] text-slate-500 uppercase">Média</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-black text-white">{stats.count}</div>
                    <div className="text-[9px] text-slate-500 uppercase">Simulados</div>
                </div>
                <div className="text-center flex flex-col items-center">
                    <div className="flex items-center gap-1">
                        {trendIcon}
                        <span className="text-lg font-black text-white">
                            {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}
                        </span>
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Tendência</div>
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
        studyLogs.forEach(log => {
            if (log.date) {
                const logDate = new Date(log.date);
                logDate.setHours(0, 0, 0, 0);
                studyDays.add(logDate.getTime());
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
                    <span className="text-[10px] text-slate-500">dias</span>
                </div>
            </div>
            {streak.isActive && streak.current >= 3 && (
                <div className="mt-2 text-[10px] text-orange-300/80 flex items-center gap-1">
                    <Flame size={10} />
                    {streak.current} dias consecutivos! Recorde: {streak.best}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Progresso do Ciclo Pomodoro
// ============================================================================
function PomodoroCycleProgress({ targetCycles, completedCycles, mode }) {
    const progress = targetCycles > 0 ? (completedCycles / targetCycles) * 100 : 0;

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Ciclo Pomodoro
                    </span>
                </div>
                <span className="text-xs font-mono text-purple-300">
                    {completedCycles}/{targetCycles}
                </span>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: targetCycles }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                            i < completedCycles
                                ? 'bg-purple-500'
                                : i === completedCycles && mode === 'work'
                                    ? 'bg-purple-500/30 animate-pulse'
                                    : 'bg-slate-700/50'
                        }`}
                    />
                ))}
            </div>
            {mode === 'break' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <Coffee size={10} />
                    Pausa ativa — descanse!
                </div>
            )}
            {mode === 'long_break' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-violet-400">
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
        const todayKey = today.toISOString().split('T')[0];

        const todayLogs = studyLogs.filter(log => {
            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        });

        const totalMinutes = todayLogs.reduce((acc, log) => acc + (log.minutes || 0), 0);
        const categoryMinutes = todayLogs
            .filter(log => log.categoryId === categoryId)
            .reduce((acc, log) => acc + (log.minutes || 0), 0);
        const sessionCount = todayLogs.length;

        return { totalMinutes, categoryMinutes, sessionCount };
    }, [studyLogs, categoryId]);

    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}min`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h${mins}m`;
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
                    <div className="text-[9px] text-slate-500 uppercase">Nesta matéria</div>
                </div>
                <div>
                    <div className="text-lg font-black text-white">
                        {formatTime(todayData.totalMinutes)}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Total geral</div>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
                {todayData.sessionCount} sessões hoje
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
        const xp = user.xp || 0;
        const level = Math.floor(Math.sqrt(xp / 100)) + 1;
        const currentLevelXP = Math.pow(level - 1, 2) * 100;
        const nextLevelXP = Math.pow(level, 2) * 100;
        const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
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
                <span className="text-xs font-mono text-amber-300">{xpProgress.xp} XP</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <Motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                    animate={{ width: `${xpProgress.progress}%` }}
                />
            </div>
            <div className="mt-1 text-right text-[9px] text-slate-500">
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
        if (!categories || !Array.isArray(categories)) return null;
        
        for (const cat of categories) {
            const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            for (const task of tasks) {
                if (task && !task.completed && task.id !== currentTaskId && task.priority === 'high') {
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
                    Próxima Tarefa
                </span>
            </div>
            <div className="text-xs text-slate-300 truncate">
                {nextTask.title || nextTask.text || 'Próxima atividade'}
            </div>
            {nextTask.catName && (
                <div className="text-[10px] text-slate-500 mt-0.5">{nextTask.catName}</div>
            )}
        </div>
    );
}

// ============================================================================
// FOCUS PANEL PRINCIPAL
// ============================================================================
export function FocusPanel({
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

    if (!activeSubject) {
        return (
            <div className="w-full 2xl:w-[380px] shrink-0 flex flex-col items-center justify-center p-8 text-center">
                <Target size={48} className="text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-300 mb-2">Nenhuma tarefa ativa</h3>
                <p className="text-sm text-slate-500">
                    Selecione uma tarefa no painel ao lado ou use o Coach IA para começar.
                </p>
            </div>
        );
    }

    const currentCategory = categories?.find(c => c.id === activeSubject.categoryId);

    return (
        <Motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full 2xl:w-[380px] shrink-0 flex flex-col gap-3 p-2 bg-slate-900/60 rounded-3xl border border-white/5 backdrop-blur-xl"
            role="complementary"
            aria-label="Painel de foco ativo"
        >
            {/* Header do Painel */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Zap size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white truncate max-w-[200px]">
                            {activeSubject.task || 'Sessão de Estudo'}
                        </h3>
                        <p className="text-[10px] text-slate-500">{activeSubject.category}</p>
                    </div>
                </div>
                {activeSubject.priority && (
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                        activeSubject.priority === 'high'
                            ? 'bg-rose-500/20 text-rose-300'
                            : activeSubject.priority === 'medium'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                        {activeSubject.priority === 'high' ? 'Alta' : activeSubject.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                )}
            </div>

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
                categoryId={activeSubject.categoryId}
            />

            {/* Streak */}
            <StreakDisplay studyLogs={studyLogs || []} />

            {/* XP */}
            <SessionXP user={user} />

            {/* Próxima Tarefa */}
            <NextTaskPreview
                categories={categories}
                currentTaskId={activeSubject.taskId}
            />

            {/* Botão para mais stats */}
            <button
                onClick={() => setShowMoreStats(!showMoreStats)}
                className="flex items-center justify-center gap-2 p-2 text-[10px] text-slate-400 hover:text-white transition-colors"
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
                            {/* Métricas adicionais podem ser adicionadas aqui */}
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
                                        <div className="text-[9px] text-slate-500 uppercase">Foco total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-black text-white">
                                            {Math.round((completedCycles / Math.max(1, targetCycles)) * 100)}%
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase">Meta</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </Motion.div>
    );
}

export default FocusPanel;
