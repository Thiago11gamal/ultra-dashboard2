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
import { parseGoalDateUnified } from '../utils/dateHelper';

const getEfficiencyTheme = (score) => {
    if (!Number.isFinite(score) || score === null) {
        return {
            glow: 'bg-slate-500/10',
            glowHover: 'group-hover:bg-slate-500/20',
            gradient: 'from-slate-500/[0.04]',
            iconBg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
            iconColor: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20'
        };
    }

    if (score >= 85) {
        return {
            glow: 'bg-emerald-500/15',
            glowHover: 'group-hover:bg-emerald-500/25',
            gradient: 'from-emerald-500/[0.06]',
            iconBg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
            iconColor: 'text-emerald-400',
        };
    }

    if (score >= 60) {
        return {
            glow: 'bg-amber-500/15',
            glowHover: 'group-hover:bg-amber-500/25',
            gradient: 'from-amber-500/[0.06]',
            iconBg: 'bg-amber-500/10 group-hover:bg-amber-500/20',
            iconColor: 'text-amber-400',
        };
    }

    return {
        glow: 'bg-rose-500/15',
        glowHover: 'group-hover:bg-rose-500/25',
        gradient: 'from-rose-500/[0.06]',
        iconBg: 'bg-rose-500/10 group-hover:bg-rose-500/20',
        iconColor: 'text-rose-400',
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

    const streak = useMemo(
        () => calculateStudyStreak(data.studyLogs || []),
        [data.studyLogs]
    );

    const balance = useMemo(
        () => analyzeSubjectBalance(data.categories || []),
        [data.categories]
    );

    const efficiency = useMemo(
        () => analyzeEfficiency(data.categories || [], data.studyLogs || []),
        [data.categories, data.studyLogs]
    );

    const fcStats = useMemo(
        () => buildAchievementStats(data) || {},
        [data]
    );

    const user = data.user || { xp: 0, level: 1 };

    const progress = useMemo(
        () => getXPProgress(user.xp),
        [user.xp]
    );

    const effTheme = useMemo(() => {
        const hasLogs = data.studyLogs && data.studyLogs.length > 0;

        if (!hasLogs) {
            return {
                glow: 'bg-slate-500/10',
                glowHover: 'group-hover:bg-slate-500/20',
                gradient: 'from-slate-500/[0.03]',
                iconBg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
                iconColor: 'text-slate-400',
            };
        }

        return getEfficiencyTheme(efficiency?.score ?? 0);
    }, [efficiency?.score, data.studyLogs]);

    const daysRemaining = useMemo(() => {
        if (!user.goalDate) return null;

        const goal = parseGoalDateUnified(user.goalDate);
        if (!goal || Number.isNaN(goal.getTime())) return null;

        const now = new Date();

        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            12,
            0,
            0,
            0
        );

        const target = new Date(
            goal.getFullYear(),
            goal.getMonth(),
            goal.getDate(),
            12,
            0,
            0,
            0
        );

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
        if (!d || Number.isNaN(d.getTime())) return 'INVÁLIDA';

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
            console.error('Picker falhou', err);
        }
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 auto-rows-auto gap-3 sm:gap-4 animate-fade-in-down">
            {/* ── Sequência ─────────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-gradient-to-b from-slate-900/90 via-[#0e1324]/90 to-slate-900/90 border border-white/10 hover:border-orange-500/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-300 shadow-xl backdrop-blur-xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-orange-500/10 rounded-full blur-[40px] group-hover:bg-orange-500/20 transition-all duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.04] to-transparent pointer-events-none rounded-2xl" />

                <div className="relative z-10 flex flex-col h-full">
                    <div
                        className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                        tabIndex={0}
                    >
                        <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl group-hover/tooltip:bg-orange-500/20 transition-colors">
                            <Activity size={17} className="text-orange-400" />
                        </div>

                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                            Sequência
                        </span>

                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-300 transition-colors" />

                        <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl leading-relaxed">
                            <strong className="text-white block mb-1">🔥 Status {streak?.isActive ? 'ATIVA' : 'INATIVA'}:</strong>
                            {streak?.isActive
                                ? 'Você estudou hoje ou ontem, mantendo a corrente diária viva!'
                                : 'Você ficou mais de 1 dia sem estudar. Registre uma sessão hoje para reativar sua corrente!'}
                        </div>
                    </div>

                    <div className="text-2xl sm:text-4xl font-black text-white mt-1 mb-2">
                        {streak?.current || 0}{' '}
                        <span className="text-lg sm:text-2xl text-slate-300 font-bold">
                            {(streak?.current || 0) === 1 ? 'dia' : 'dias'}
                        </span>
                    </div>

                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-1">
                        <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-normal">
                            Recorde histórico: <span className="font-bold text-slate-200">{streak?.longest || 0}d</span>
                        </div>

                        {streak?.isActive && (
                            <div className="flex items-center gap-1.5 text-orange-400 mt-1">
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                                <span className="text-xs font-black tracking-widest uppercase">ATIVA</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Eficiência ────────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-gradient-to-b from-slate-900/90 via-[#0e1324]/90 to-slate-900/90 border border-white/10 hover:border-emerald-500/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-300 shadow-xl backdrop-blur-xl">
                <div className={`absolute -top-10 -left-10 w-24 h-24 ${effTheme.glow} rounded-full blur-[40px] ${effTheme.glowHover} transition-all duration-500 pointer-events-none`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${effTheme.gradient} to-transparent pointer-events-none rounded-2xl`} />

                <div className="relative z-10 flex flex-col h-full">
                    <div
                        className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                        tabIndex={0}
                    >
                        <div className={`p-2 ${effTheme.iconBg} border border-white/10 rounded-xl transition-colors`}>
                            <TrendingUp size={17} className={effTheme.iconColor} />
                        </div>

                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                            Eficiência
                        </span>

                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-300 transition-colors" />

                        <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl leading-relaxed">
                            <strong className="text-white block mb-1">
                                ⚡ Ritmo {(typeof efficiency?.efficiency === 'string'
                                    ? efficiency.efficiency.replace(/_/g, ' ')
                                    : 'Sem dados').toUpperCase()}:
                            </strong>
                            {efficiency?.efficiency === 'excelente'
                                ? 'Fluxo e velocidade de conclusão de tarefas ideais.'
                                : efficiency?.efficiency === 'boa'
                                    ? 'Bom ritmo de resolução e fechamento de tópicos.'
                                    : efficiency?.efficiency === 'regular'
                                        ? 'Produtividade na média. Mantenha o foco nos blocos Pomodoro.'
                                        : efficiency?.efficiency === 'precisa_melhorar'
                                            ? 'Taxa baixa de conclusão por hora. Reduza distrações durante as sessões.'
                                            : (efficiency?.message || 'Realize sessões com o cronômetro para medir.')}
                        </div>
                    </div>

                    <div className="text-xl sm:text-2xl md:text-4xl font-black text-white mt-1 mb-2 break-words line-clamp-2 min-w-0 pb-0.5">
                        {formatValue(efficiency?.score || 0)}
                        <span className="text-lg sm:text-2xl text-slate-300 font-bold ml-1">%</span>
                    </div>

                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-1 min-w-0">
                        <div className={`text-[10px] sm:text-xs ${effTheme.iconColor} capitalize leading-normal truncate min-w-0 font-extrabold pb-0.5`}>
                            {typeof efficiency?.efficiency === 'string'
                                ? efficiency.efficiency.replace(/_/g, ' ')
                                : 'Sem dados'}
                        </div>

                        {efficiency?.metrics?.minutesPerTask > 0 && (
                            <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-normal">
                                ~{efficiency.metrics.minutesPerTask} min/tarefa
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Equilíbrio ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-gradient-to-b from-slate-900/90 via-[#0e1324]/90 to-slate-900/90 border border-white/10 hover:border-blue-500/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-300 shadow-xl backdrop-blur-xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent pointer-events-none rounded-2xl" />

                <div className="relative z-10 flex flex-col h-full">
                    <div
                        className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                        tabIndex={0}
                    >
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl group-hover/tooltip:bg-blue-500/20 transition-colors">
                            <BarChart2 size={17} className="text-blue-400" />
                        </div>

                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                            Equilíbrio
                        </span>

                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-300 transition-colors" />

                        <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl leading-relaxed">
                            <strong className="text-white block mb-1">
                                ⚖️ Distribuição do Tempo:
                            </strong>
                            {balance?.message || 'Avalia a distribuição do seu tempo entre todas as matérias do edital para evitar negligenciar disciplinas importantes.'}
                        </div>
                    </div>

                    <div className="mt-1 mb-1 min-h-[2.5rem] flex flex-col justify-center">
                        <div className={`capitalize leading-tight line-clamp-2 pb-0.5 ${balance?.status
                            ? 'text-xl sm:text-2xl font-black text-white'
                            : 'text-sm sm:text-base font-bold text-slate-500'}`}>
                            {balance?.status?.replace(/_/g, ' ') || 'Sem Dados'}
                        </div>
                    </div>

                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-1 min-w-0">
                        {balance?.distribution?.[0] && (
                            <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-normal truncate min-w-0">
                                {balance.distribution[0].subject}:{' '}
                                <span className="font-bold text-slate-200">
                                    {formatValue(balance.distribution[0].percentage || 0)}%
                                </span>
                            </div>
                        )}

                        {balance?.metrics?.activeSubjects > 0 && (
                            <div className="text-[10px] sm:text-xs text-slate-500 font-medium leading-normal">
                                {balance.metrics.activeSubjects}/{balance.metrics.totalSubjects} matérias ativas
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Flashcards ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-gradient-to-b from-slate-900/90 via-[#0e1324]/90 to-slate-900/90 border border-white/10 hover:border-amber-500/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-300 shadow-xl backdrop-blur-xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-500/10 rounded-full blur-[40px] group-hover:bg-amber-500/20 transition-all duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] to-transparent pointer-events-none rounded-2xl" />

                <div className="relative z-10 flex flex-col h-full">
                    <div
                        className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                        tabIndex={0}
                    >
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl group-hover/tooltip:bg-amber-500/20 transition-colors">
                            <BookOpen size={17} className="text-amber-400" />
                        </div>

                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                            Flashcards
                        </span>

                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-300 transition-colors" />

                        <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl leading-relaxed">
                            <strong className="text-white block mb-1">🧠 Repetição Espaçada (SRS):</strong>
                            Acompanhe suas revisões ativas, cartões pendentes hoje e nível de retenção de memória de longo prazo.
                        </div>
                    </div>

                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">
                        {fcStats.flashcardReviews || 0}{' '}
                        <span className="text-lg sm:text-xl text-slate-300 font-bold">revisões</span>
                    </div>

                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-amber-400 font-medium">
                            <span>
                                Precisão:{' '}
                                <span className="font-bold">
                                    {formatValue(fcStats.flashcardAccuracy || 0)}%
                                </span>
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-slate-400 font-medium">
                            <span>
                                Hoje: <span className="font-bold text-white">{fcStats.flashcardReviewsToday || 0}</span>
                            </span>
                            <span>
                                Pendentes: <span className="font-bold text-amber-300">{fcStats.flashcardDueToday || 0}</span>
                            </span>
                        </div>

                        {(fcStats.flashcardMastery || 0) > 0 && (
                            <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                                Domínio: {fcStats.flashcardMastery}%
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── XP / Nível ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-gradient-to-b from-slate-900/90 via-[#0e1324]/90 to-slate-900/90 border border-white/10 hover:border-purple-500/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between group transition-all duration-300 shadow-xl backdrop-blur-xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-all duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] to-transparent pointer-events-none rounded-2xl" />

                <div className="relative z-10 flex flex-col h-full">
                    <div
                        className="flex items-center gap-2 sm:gap-2.5 mb-2 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                        tabIndex={0}
                    >
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl group-hover/tooltip:bg-purple-500/20 transition-colors">
                            <Trophy size={17} className="text-purple-400" />
                        </div>

                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                            Nível {progress.level}
                        </span>

                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-300 transition-colors" />

                        <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl leading-relaxed">
                            <strong className="text-white block mb-1">🏆 Gamificação & XP:</strong>
                            Ganhe pontos de experiência completando tarefas, registrando ciclos Pomodoro e acertando simulados.
                        </div>
                    </div>

                    <div
                        className="text-xl sm:text-2xl md:text-4xl font-black text-white mt-1 mb-3 break-words line-clamp-2 min-w-0 pb-0.5"
                        title={`${(user.xp || 0).toLocaleString('pt-BR')} XP`}
                    >
                        {(user.xp || 0).toLocaleString('pt-BR')}{' '}
                        <span className="text-lg sm:text-2xl text-slate-300 font-bold">XP</span>
                    </div>

                    <div className="space-y-1 mt-auto pt-1 pb-1 pl-1">
                        <div className="h-2 bg-slate-950/80 rounded-full overflow-hidden shadow-inner border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
                                style={{
                                    width: `${Math.max(0, Math.min(100, Number(progress?.percentage) || 0))}%`
                                }}
                            />
                        </div>

                        <div className="text-[10px] sm:text-xs text-purple-400 font-bold leading-normal">
                            {formatValue(progress?.percentage || 0)}% → Nível {(progress?.level || 1) + 1}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Data da Prova ───────────────────────────────────────────── */}
            <div className={`relative bg-gradient-to-b from-slate-900/90 via-[#0e1324]/90 to-slate-900/90 border rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col items-center justify-between h-full group shadow-xl backdrop-blur-xl ${!user.goalDate
                ? 'border-slate-500/20 hover:border-slate-500/40'
                : 'border-white/10 hover:border-rose-500/30'}`}>
                <div className="absolute top-4 right-4 z-20">
                    <div className="relative group/tooltip" tabIndex={0}>
                        <Info size={14} className="text-slate-600 hover:text-slate-300 cursor-help transition-colors" />
                        <div className="absolute top-full right-0 mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl leading-relaxed">
                            <strong className="text-white block mb-1">
                                📅 Contagem Regressiva:
                            </strong>
                            {daysRemaining === null
                                ? 'Nenhuma data alvo definida no momento. Clique para definir a data da sua prova.'
                                : daysRemaining < 0
                                    ? 'A data agendada para a prova já passou.'
                                    : daysRemaining === 0
                                        ? 'O grande dia chegou! Mantenha a calma e confie no seu preparo.'
                                        : `Faltam ${daysRemaining} dias de preparação para a sua prova.`}
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] transition-transform duration-500 ${!user.goalDate
                        ? 'bg-slate-500/10'
                        : 'bg-rose-500/10 group-hover:scale-150'}`} />

                    {user.goalDate && daysRemaining !== null && daysRemaining <= 15 && daysRemaining >= 0 && (
                        <div className="absolute inset-0 bg-rose-500/[0.04]" />
                    )}
                </div>

                {/* Contador de dias */}
                <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center">
                    {daysRemaining !== null ? (
                        <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-1.5 justify-center mb-1">
                                <span className={`text-4xl sm:text-5xl font-black ${daysRemaining < 0
                                    ? 'text-slate-500'
                                    : daysRemaining <= 15
                                        ? 'text-rose-400'
                                        : 'text-white'}`}>
                                    {Math.abs(daysRemaining)}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>

                            <div className={`text-xs font-bold mt-1 text-center uppercase tracking-widest leading-relaxed ${daysRemaining < 0
                                ? 'text-slate-600'
                                : daysRemaining <= 15
                                    ? 'text-rose-400/90'
                                    : 'text-slate-400'}`}>
                                {daysRemaining < 0
                                    ? 'Atrasado'
                                    : daysRemaining === 0
                                        ? 'É hoje!'
                                        : 'Para a prova'}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <div className="text-slate-500 mb-2">
                                <Calendar size={36} strokeWidth={2} />
                            </div>
                            <div className="text-xs font-black text-slate-400 bg-slate-800/80 border border-white/5 px-3 py-1 rounded-lg text-center uppercase tracking-widest leading-tight">
                                SEM DATA
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full h-[1px] bg-white/10 z-10 my-3" />

                {/* Date picker */}
                <div
                    className="relative z-10 w-full flex flex-col items-center justify-center group/rightside cursor-pointer py-1"
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

                    <div className="flex flex-col items-center gap-1.5 mb-2 pointer-events-none">
                        <div className={`p-2 rounded-xl transition-all duration-300 ${!user.goalDate
                            ? 'bg-slate-800 shadow-lg'
                            : 'bg-rose-500/10 group-hover/rightside:bg-rose-500/20'}`}>
                            <Calendar
                                size={17}
                                className={`${!user.goalDate
                                    ? 'text-slate-400'
                                    : 'text-rose-400 group-hover/rightside:scale-110 transition-transform'}`}
                            />
                        </div>

                        <span className={`text-[11px] font-black uppercase tracking-widest text-center leading-normal transition-colors ${!user.goalDate
                            ? 'text-slate-500'
                            : 'text-slate-400 group-hover/rightside:text-slate-300'}`}>
                            Data Alvo
                        </span>
                    </div>

                    <div className="relative group/input flex justify-center w-full pointer-events-none">
                        <div className={`w-[120px] bg-slate-900/80 border rounded-xl py-1.5 text-xs font-bold transition-all group-hover/rightside:bg-slate-800 group-hover/rightside:text-white group-hover/rightside:border-white/20 text-center leading-relaxed ${!user.goalDate
                            ? 'border-slate-700 text-slate-500'
                            : 'border-white/10 text-slate-200'}`}>
                            {user.goalDate ? displayDate : 'ESCOLHER'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(StatsCards);
