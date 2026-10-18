import React, { useMemo, useRef, useCallback } from 'react';
import {
    Activity,
    TrendingUp,
    BarChart2,
    Trophy,
    Calendar,
    Info,
    BookOpen
} from 'lucide-react';
import {
    calculateStudyStreak,
    analyzeSubjectBalance,
    analyzeEfficiency,
    buildAchievementStats
} from '../utils/analytics';
import { getXPProgress } from '../utils/gamification';
import { formatValue } from '../utils/scoreHelper';
import { parseGoalDateUnified, parseNoonLocal } from '../utils/dateHelper';

const getEfficiencyTheme = (score) => {
    if (!Number.isFinite(score) || score === null) {
        return {
            glow: 'bg-slate-500/10',
            glowHover: 'group-hover:bg-slate-500/20',
            gradient: 'from-slate-500/[0.02]',
            iconBg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
            iconColor: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20'
        };
    }

    if (score >= 85) {
        return {
            glow: 'bg-emerald-500/10',
            glowHover: 'group-hover:bg-emerald-500/20',
            gradient: 'from-emerald-500/[0.02]',
            iconBg: 'bg-green-500/10 group-hover:bg-green-500/20',
            iconColor: 'text-green-400',
        };
    }

    if (score >= 60) {
        return {
            glow: 'bg-yellow-500/10',
            glowHover: 'group-hover:bg-yellow-500/20',
            gradient: 'from-yellow-500/[0.02]',
            iconBg: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
            iconColor: 'text-yellow-400',
        };
    }

    return {
        glow: 'bg-red-500/10',
        glowHover: 'group-hover:bg-red-500/20',
        gradient: 'from-red-500/[0.02]',
        iconBg: 'bg-red-500/10 group-hover:bg-red-500/20',
        iconColor: 'text-red-400',
    };
};

const getTodayDateKey = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const StatsCards = ({ data, onUpdateGoalDate }) => {
    const dateInputRef = useRef(null);
    const minGoalDate = getTodayDateKey();

    // FIX CORRIGIDO: data.studyLogs pode vir como OBJETO do Firebase,
    // não apenas array. calculateStudyStreak espera array.
    const normalizedStudyLogs = useMemo(() => {
        const logs = data.studyLogs;
        return Array.isArray(logs) ? logs : Object.values(logs || {});
    }, [data.studyLogs]);

    const streak = useMemo(
        () => calculateStudyStreak(normalizedStudyLogs),
        [normalizedStudyLogs]
    );

    const balance = useMemo(
        () => analyzeSubjectBalance(data.categories || []),
        [data.categories]
    );

    const efficiency = useMemo(
        () => analyzeEfficiency(data.categories || [], normalizedStudyLogs, data.user),
        [data.categories, normalizedStudyLogs, data.user]
    );

    // P04 PERF FIX: Granular dependencies instead of [data] which changes every render
    const fcStats = useMemo(
        () => {
            const safeData = {
                categories: data.categories,
                simuladoRows: data.simuladoRows,
                simulados: data.simulados,
                pomodorosCompleted: data.pomodorosCompleted,
                flashcardDecks: data.flashcardDecks,
                studySessions: data.studySessions,
                user: data.user,
                settings: data.settings,
                studyLogs: Array.isArray(data.studyLogs)
                    ? data.studyLogs
                    : Object.values(data.studyLogs || {})
            };
            return buildAchievementStats(safeData) || {};
        },
        [data.categories, data.simuladoRows, data.simulados, data.pomodorosCompleted, data.flashcardDecks, data.studyLogs, data.studySessions, data.user, data.settings]
    );

    const user = data.user || { xp: 0, level: 1 };

    const progress = useMemo(
        () => getXPProgress(Number(user.xp) || 0),
        [user.xp]
    );

    const hasEffData = useMemo(() => {
        return Boolean(efficiency && efficiency.efficiency !== 'sem_dados' && efficiency.score !== undefined);
    }, [efficiency]);

    const effTheme = useMemo(() => {
        if (!hasEffData) {
            return {
                glow: 'bg-slate-500/10',
                glowHover: 'group-hover:bg-slate-500/20',
                gradient: 'from-slate-500/[0.02]',
                iconBg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
                iconColor: 'text-slate-400',
            };
        }

        return getEfficiencyTheme(efficiency?.score ?? 0);
    }, [efficiency, hasEffData]);

    const daysRemaining = useMemo(() => {
        if (!user.goalDate) return null;
        const target = parseNoonLocal(user.goalDate);
        const today = parseNoonLocal(new Date());
        if (!target || !today) return null;
        return Math.round((target.getTime() - today.getTime()) / 86400000);
    }, [user.goalDate]);

    const dateValue = useMemo(() => {
        const d = parseGoalDateUnified(user.goalDate);
        if (!d || Number.isNaN(d.getTime())) return '';

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}`;
    }, [user.goalDate]);

    const displayDate = useMemo(() => {
        const d = parseGoalDateUnified(user.goalDate);
        if (!d || Number.isNaN(d.getTime())) return 'Definir data';

        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();

        return `${dd}/${mm}/${yyyy}`;
    }, [user.goalDate]);

    const openDatePicker = useCallback(() => {
        try {
            const el = dateInputRef.current;
            if (!el) return;

            if (typeof el.showPicker === 'function') {
                el.showPicker();
            } else {
                el.focus();
                el.click();
            }
        } catch (err) {
            // BUG-FIX: Fallback para input nativo se showPicker falhar
            console.warn('Picker nativo falhou, usando fallback:', err);
            try {
                const el = dateInputRef.current;
                if (el) {
                    el.focus();
                    // Força o clique programático como último recurso
                    const clickEvent = new MouseEvent('click', { bubbles: true });
                    el.dispatchEvent(clickEvent);
                }
            } catch (fallbackErr) {
                console.error('Fallback do picker também falhou:', fallbackErr);
            }
        }
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 auto-rows-fr gap-3 sm:gap-4 animate-fade-in-down">
            {/* ── Sequência ─────────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between group transition-all duration-500 shadow-2xl min-h-[140px]">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-orange-500/10 rounded-full blur-[40px] group-hover:bg-orange-500/20 transition-all duration-700 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div
                            className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                            tabIndex={0}
                        >
                            <div className="p-1.5 bg-orange-500/10 rounded-lg group-hover/tooltip:bg-orange-500/20 transition-colors shrink-0">
                                <Activity size={16} className="text-orange-400" />
                            </div>

                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                                Sequência
                            </span>

                            <Info size={13} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors shrink-0" />

                            <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed">
                                <strong className="text-white">Status {streak?.isActive ? 'ATIVA' : 'INATIVA'}</strong>: {streak?.isActive
                                    ? 'Você estudou hoje ou ontem, mantendo a corrente viva!'
                                    : 'Você ficou mais de 1 dia sem estudar. Comece hoje para criar uma nova corrente!'}
                            </div>
                        </div>

                        <div className="text-2xl sm:text-3xl font-black text-white my-1">
                            {streak?.current || 0}{' '}
                            <span className="text-sm sm:text-base text-slate-300 font-bold">
                                {(streak?.current || 0) === 1 ? 'dia' : 'dias'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">
                            Recorde: <strong className="text-slate-200">{streak?.longest || 0}d</strong>
                        </span>

                        {streak?.isActive ? (
                            <span className="flex items-center gap-1.5 text-orange-400 font-bold tracking-wider">
                                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                                ATIVA
                            </span>
                        ) : (
                            <span className="text-slate-500">Inativa</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Eficiência ────────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between group transition-all duration-500 shadow-2xl min-h-[168px]">
                <div className={`absolute -top-10 -left-10 w-24 h-24 ${effTheme.glow} rounded-full blur-[40px] ${effTheme.glowHover} transition-all duration-700 pointer-events-none`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${effTheme.gradient} to-transparent pointer-events-none`} />

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div
                            className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                            tabIndex={0}
                        >
                            <div className={`p-1.5 ${effTheme.iconBg} rounded-lg transition-colors shrink-0`}>
                                <TrendingUp size={16} className={effTheme.iconColor} />
                            </div>

                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                                Eficiência
                            </span>

                            <Info size={13} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors shrink-0" />

                            <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed">
                                <strong className="text-white">
                                    Status {(typeof efficiency?.efficiency === 'string'
                                        ? efficiency.efficiency.replace(/_/g, ' ')
                                        : 'Sem dados').toUpperCase()}
                                </strong>: {
                                    efficiency?.efficiency === 'excelente'
                                        ? 'Fluxo e velocidade de conclusão de tarefas ideais.'
                                        : efficiency?.efficiency === 'boa'
                                            ? 'Bom ritmo de resolução de tarefas.'
                                            : efficiency?.efficiency === 'regular'
                                                ? 'Produtividade na média. Pode melhorar o foco para concluir mais tarefas.'
                                                : efficiency?.efficiency === 'precisa_melhorar'
                                                    ? 'Baixa taxa de tarefas concluídas por tempo. Verifique distrações.'
                                                    : (efficiency?.message || 'Faça sessões com o cronômetro para medir.')
                                }
                            </div>
                        </div>

                        <div className="text-2xl sm:text-3xl font-black my-1">
                            {hasEffData ? (
                                <>
                                    <span className="text-white">{formatValue(efficiency?.score || 0)}</span>
                                    <span className="text-base sm:text-lg text-slate-300 font-bold ml-0.5">%</span>
                                </>
                            ) : (
                                <span className="text-lg sm:text-xl text-slate-500 font-bold">
                                    Sem dados
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className={`${effTheme.iconColor} font-bold capitalize truncate max-w-[100px]`}>
                            {typeof efficiency?.efficiency === 'string'
                                ? efficiency.efficiency.replace(/_/g, ' ')
                                : 'Sem dados'}
                        </span>

                        {efficiency?.metrics?.minutesPerTask > 0 ? (
                            <span className="text-slate-400 font-medium">
                                ~{efficiency.metrics.minutesPerTask} min/t
                            </span>
                        ) : (
                            <span className="text-slate-500">Ritmo regular</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Equilíbrio ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between group transition-all duration-500 shadow-2xl min-h-[168px]">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all duration-700 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div
                            className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                            tabIndex={0}
                        >
                            <div className="p-1.5 bg-blue-500/10 rounded-lg group-hover/tooltip:bg-blue-500/20 transition-colors shrink-0">
                                <BarChart2 size={16} className="text-blue-400" />
                            </div>

                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                                Equilíbrio
                            </span>

                            <Info size={13} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors shrink-0" />

                            <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed">
                                <strong className="text-white">
                                    Status {(balance?.status
                                        ? balance.status.replace(/_/g, ' ')
                                        : 'Sem Dados').toUpperCase()}
                                </strong>: {balance?.message || 'Analisa como você divide seu tempo entre as matérias.'}
                            </div>
                        </div>

                        <div className="my-1 flex items-baseline">
                            <span className={`text-xl sm:text-2xl font-black capitalize truncate ${balance?.status && balance?.status !== 'sem_dados'
                                ? 'text-white'
                                : 'text-slate-500'}`}>
                                {balance?.status ? balance.status.replace(/_/g, ' ') : 'Sem Dados'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        {balance?.distribution?.[0] ? (
                            <span className="text-slate-400 font-medium truncate max-w-[110px]" title={balance.distribution[0].subject}>
                                Top: <strong className="text-slate-200">{balance.distribution[0].subject}</strong>
                            </span>
                        ) : (
                            <span className="text-slate-500">Sem matérias</span>
                        )}

                        {balance?.metrics?.activeSubjects > 0 && (
                            <span className="text-blue-400 font-bold shrink-0">
                                {balance.metrics.activeSubjects}/{balance.metrics.totalSubjects} ativas
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Flashcards ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between group transition-all duration-500 shadow-2xl min-h-[168px]">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-500/10 rounded-full blur-[40px] group-hover:bg-amber-500/20 transition-all duration-700 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div
                            className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                            tabIndex={0}
                        >
                            <div className="p-1.5 bg-amber-500/10 rounded-lg group-hover/tooltip:bg-amber-500/20 transition-colors shrink-0">
                                <BookOpen size={16} className="text-amber-400" />
                            </div>

                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                                Flashcards
                            </span>

                            <Info size={13} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors shrink-0" />

                            <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed">
                                <strong className="text-white">Indicadores SRS</strong>: Revisões totais, taxa de retenção e cartões pendentes de hoje via repetição espaçada.
                            </div>
                        </div>

                        <div className="text-2xl sm:text-3xl font-black text-white my-1">
                            {fcStats.flashcardReviews || 0}{' '}
                            <span className="text-sm sm:text-base text-slate-300 font-bold">
                                {(fcStats.flashcardReviews || 0) === 1 ? 'rev.' : 'revs.'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">
                            Precisão:{' '}
                            <strong className={(fcStats.flashcardReviews || 0) > 0 ? "text-amber-400" : "text-slate-500"}>
                                {(fcStats.flashcardReviews || 0) > 0 ? `${formatValue(fcStats.flashcardAccuracy || 0)}%` : '-'}
                            </strong>
                        </span>

                        <span className="text-slate-400">
                            Hoje: <strong className="text-white">{fcStats.flashcardReviewsToday || 0}</strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* ── XP / Nível ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between group transition-all duration-500 shadow-2xl min-h-[168px]">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-all duration-700 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div
                            className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                            tabIndex={0}
                        >
                            <div className="p-1.5 bg-purple-500/10 rounded-lg group-hover/tooltip:bg-purple-500/20 transition-colors shrink-0">
                                <Trophy size={16} className="text-purple-400" />
                            </div>

                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                                Nível {progress.level}
                            </span>

                            <Info size={13} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors shrink-0" />

                            <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed">
                                <strong className="text-white">Nível {progress.level}</strong>: Sua experiência global. Conclua tarefas e ciclos de estudo para avançar de patente!
                            </div>
                        </div>

                        <div
                            className="text-2xl sm:text-3xl font-black text-white my-1"
                            title={`${(user.xp || 0).toLocaleString('pt-BR')} XP`}
                        >
                            {(user.xp || 0).toLocaleString('pt-BR')}{' '}
                            <span className="text-sm sm:text-base text-slate-300 font-bold">XP</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-white/5 space-y-1">
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
                                style={{
                                    width: `${Math.max(0, Math.min(100, Number(progress?.percentage) || 0))}%`
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-purple-400 font-bold">
                            <span>{formatValue(progress?.percentage || 0)}%</span>
                            <span>→ Nível {(progress?.level || 1) + 1}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Data da Prova ───────────────────────────────────────────── */}
            <div className={`relative bg-[#151720]/95 border rounded-2xl p-4 sm:p-5 transition-all duration-500 flex flex-col justify-between group shadow-2xl min-h-[168px] ${!user.goalDate
                ? 'border-slate-500/30'
                : 'border-white/10 hover:border-rose-500/30'}`}>
                <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] transition-transform duration-700 pointer-events-none ${!user.goalDate
                    ? 'bg-slate-500/10'
                    : 'bg-rose-500/10 group-hover:scale-150'}`} />

                {user.goalDate && daysRemaining !== null && daysRemaining <= 15 && daysRemaining >= 0 && (
                    <div className="absolute inset-0 bg-rose-500/[0.04] pointer-events-none rounded-2xl" />
                )}

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div
                            className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                            tabIndex={0}
                        >
                            <div className="p-1.5 bg-rose-500/10 rounded-lg group-hover/tooltip:bg-rose-500/20 transition-colors shrink-0">
                                <Calendar size={16} className="text-rose-400" />
                            </div>

                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                                Prova
                            </span>

                            <Info size={13} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors shrink-0" />

                            <div className="absolute top-full right-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed">
                                <strong className="text-white">
                                    Status {daysRemaining === null
                                        ? 'SEM DATA'
                                        : daysRemaining < 0
                                            ? 'ATRASADO'
                                            : daysRemaining === 0
                                                ? 'É HOJE'
                                                : 'NO PRAZO'}
                                </strong>: {
                                    daysRemaining === null
                                        ? 'Nenhuma data alvo definida no momento.'
                                        : daysRemaining < 0
                                            ? 'A data agendada para a prova já passou.'
                                            : daysRemaining === 0
                                                ? 'O dia do seu objetivo chegou. Boa sorte!'
                                                : `Faltam ${daysRemaining} dias de preparação para a sua prova.`
                                }
                            </div>
                        </div>

                        <div className="text-2xl sm:text-3xl font-black my-1 flex items-baseline gap-1">
                            {daysRemaining !== null ? (
                                <>
                                    <span className={daysRemaining < 0
                                        ? 'text-slate-500'
                                        : daysRemaining <= 15
                                            ? 'text-rose-400'
                                            : 'text-white'}>
                                        {Math.abs(daysRemaining)}
                                    </span>
                                    <span className="text-sm sm:text-base text-slate-300 font-bold">
                                        {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-lg sm:text-xl text-slate-500 font-bold">
                                    Sem data
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Interactive date selector unified at footer */}
                    <div
                        className="mt-auto pt-2 border-t border-white/5 relative group/date cursor-pointer"
                        onClick={openDatePicker}
                    >
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={dateValue}
                            min={minGoalDate}
                            onFocus={(e) => {
                                e.target.min = getTodayDateKey();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            onChange={(e) => {
                                const selected = e.target.value;
                                if (!selected) {
                                    onUpdateGoalDate('');
                                    return;
                                }
                                onUpdateGoalDate(selected);
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-50 pointer-events-auto [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            title="Escolher data da prova"
                            aria-label="Escolher data da prova"
                        />

                        <div className="flex items-center justify-between text-[11px] pointer-events-none">
                            <span className="flex items-center gap-1.5 text-slate-300 font-bold group-hover/date:text-rose-400 transition-colors truncate max-w-[110px]">
                                <Calendar size={13} className="text-rose-400 shrink-0" />
                                {user.goalDate ? displayDate : 'Definir data'}
                            </span>

                            <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${daysRemaining < 0
                                ? 'text-slate-500'
                                : daysRemaining <= 15 && daysRemaining !== null
                                    ? 'text-rose-400'
                                    : 'text-slate-400'}`}>
                                {daysRemaining === null ? 'Editar' : daysRemaining < 0 ? 'Atrasado' : daysRemaining === 0 ? 'Hoje' : 'Alvo'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(StatsCards);

