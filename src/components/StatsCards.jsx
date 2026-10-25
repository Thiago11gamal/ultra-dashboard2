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
import { parseGoalDateUnified, parseNoonLocal, getDateKey } from '../utils/dateHelper';

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

const getTodayDateKey = () => getDateKey(new Date());

const capitalize = (text) => {
    if (typeof text !== 'string' || !text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
};

// ── Escala tipográfica única para todos os cards ────────────────────────────
// Rótulo (14px) → Valor principal (28px) → Unidade (14px) → Rodapé (12px)
const VALUE_CLS = 'text-[1.75rem] font-bold leading-none tabular-nums tracking-tight';
const UNIT_CLS = 'text-sm font-medium text-slate-400 ml-1.5';
const EMPTY_VALUE_CLS = 'text-lg font-semibold text-slate-500 leading-none';

const TOOLTIP_BASE = 'absolute top-full mt-2 w-64 max-w-[85vw] p-3 bg-slate-900/95 backdrop-blur-md text-xs font-normal text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed';

const TOOLTIP_ALIGN = {
    left: 'left-0',
    right: 'right-0',
    auto: 'right-0 sm:right-auto sm:left-0'
};

/**
 * Casca padrão dos cards de métricas do painel.
 * Mantém cabeçalho, valor e rodapé com a mesma hierarquia visual em todos os cards.
 */
const StatCard = ({
    icon: Icon,
    iconColor,
    iconBg,
    glow,
    gradient,
    label,
    tooltip,
    tooltipAlign = 'left',
    footer,
    footerProps = {},
    footerLayout = 'flex items-center justify-between gap-2',
    className = '',
    children
}) => (
    <div className={`relative glass-hover bg-[#151720]/95 border rounded-2xl p-4 sm:p-5 flex flex-col group transition-all duration-500 shadow-2xl min-h-[156px] ${className || 'border-white/10'}`}>
        <div className={`absolute -top-10 -left-10 w-24 h-24 rounded-full blur-[40px] transition-all duration-700 pointer-events-none ${glow}`} />
        {gradient && (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} to-transparent pointer-events-none rounded-2xl`} />
        )}

        <div className="relative z-10 flex flex-col h-full">
            {/* Cabeçalho */}
            <div
                className="flex items-center gap-2.5 relative group/tooltip cursor-help focus-visible:outline-none rounded-lg"
                tabIndex={0}
            >
                <div className={`p-1.5 rounded-lg transition-colors shrink-0 ${iconBg}`}>
                    <Icon size={16} className={iconColor} />
                </div>

                <span className="text-sm font-semibold text-slate-300 leading-tight truncate">
                    {label}
                </span>

                <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors shrink-0" />

                <div className={`${TOOLTIP_BASE} ${TOOLTIP_ALIGN[tooltipAlign] || TOOLTIP_ALIGN.left}`}>
                    {tooltip}
                </div>
            </div>

            {/* Valor principal */}
            <div className="mt-4 mb-4 flex items-baseline min-w-0">
                {children}
            </div>

            {/* Rodapé */}
            <div
                {...footerProps}
                className={`mt-auto pt-3 border-t border-white/5 text-xs text-slate-400 ${footerLayout} ${footerProps.className || ''}`}
            >
                {footer}
            </div>
        </div>
    </div>
);

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
        return Boolean(
            efficiency && efficiency.efficiency !== 'sem_dados' && efficiency.score !== null && Number.isFinite(Number(efficiency.score))
        );
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

    const efficiencyLabel = typeof efficiency?.efficiency === 'string'
        ? capitalize(efficiency.efficiency.replace(/_/g, ' '))
        : 'Sem dados';

    const balanceLabel = balance?.status
        ? capitalize(balance.status.replace(/_/g, ' '))
        : 'Sem dados';

    const hasBalanceData = Boolean(balance?.status && balance.status !== 'sem_dados');

    const examStatusLabel = daysRemaining === null
        ? 'Sem data'
        : daysRemaining < 0
            ? 'Atrasado'
            : daysRemaining === 0
                ? 'É hoje'
                : 'No prazo';

    const isExamClose = daysRemaining !== null && daysRemaining <= 15 && daysRemaining >= 0;

    return (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4 animate-fade-in-down">
            {/* ── Sequência ─────────────────────────────────────────────────── */}
            <StatCard
                icon={Activity}
                iconColor="text-orange-400"
                iconBg="bg-orange-500/10 group-hover/tooltip:bg-orange-500/20"
                glow="bg-orange-500/10 group-hover:bg-orange-500/20"
                gradient="from-orange-500/[0.02]"
                label="Sequência"
                tooltip={(
                    <>
                        <strong className="text-white">Sequência {streak?.isActive ? 'ativa' : 'inativa'}:</strong>{' '}
                        {streak?.isActive
                            ? 'Você estudou hoje ou ontem, mantendo a corrente viva!'
                            : 'Você ficou mais de 1 dia sem estudar. Comece hoje para criar uma nova corrente!'}
                    </>
                )}
                footer={(
                    <>
                        <span>
                            Recorde: <strong className="font-semibold text-slate-200 tabular-nums">{streak?.longest || 0} {(streak?.longest || 0) === 1 ? 'dia' : 'dias'}</strong>
                        </span>

                        {streak?.isActive ? (
                            <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
                                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                                Ativa
                            </span>
                        ) : (
                            <span className="text-slate-500">Inativa</span>
                        )}
                    </>
                )}
            >
                <span className={`${VALUE_CLS} text-white`}>{streak?.current || 0}</span>
                <span className={UNIT_CLS}>{(streak?.current || 0) === 1 ? 'dia' : 'dias'}</span>
            </StatCard>

            {/* ── Eficiência ────────────────────────────────────────────────── */}
            <StatCard
                icon={TrendingUp}
                iconColor={effTheme.iconColor}
                iconBg={effTheme.iconBg}
                glow={`${effTheme.glow} ${effTheme.glowHover}`}
                gradient={effTheme.gradient}
                label="Eficiência"
                tooltip={(
                    <>
                        <strong className="text-white">{efficiencyLabel}:</strong>{' '}
                        {efficiency?.efficiency === 'excelente'
                            ? 'Fluxo e velocidade de conclusão de tarefas ideais.'
                            : efficiency?.efficiency === 'boa'
                                ? 'Bom ritmo de resolução de tarefas.'
                                : efficiency?.efficiency === 'regular'
                                    ? 'Produtividade na média. Pode melhorar o foco para concluir mais tarefas.'
                                    : efficiency?.efficiency === 'precisa_melhorar'
                                        ? 'Baixa taxa de tarefas concluídas por tempo. Verifique distrações.'
                                        : (efficiency?.message || 'Faça sessões com o cronômetro para medir.')}
                    </>
                )}
                footer={(
                    <>
                        <span className={`${hasEffData ? effTheme.iconColor : 'text-slate-500'} font-semibold truncate`}>
                            {efficiencyLabel}
                        </span>

                        {efficiency?.metrics?.minutesPerTask > 0 ? (
                            <span className="shrink-0 tabular-nums">
                                ~{efficiency.metrics.minutesPerTask} min/tarefa
                            </span>
                        ) : (
                            <span className="text-slate-500 shrink-0">{hasEffData ? 'Ritmo regular' : 'Aguardando estudos'}</span>
                        )}
                    </>
                )}
            >
                {hasEffData ? (
                    <>
                        <span className={`${VALUE_CLS} text-white`}>{formatValue(efficiency?.score || 0)}</span>
                        <span className={UNIT_CLS}>%</span>
                    </>
                ) : (
                    <span className={EMPTY_VALUE_CLS}>Sem dados</span>
                )}
            </StatCard>

            {/* ── Equilíbrio ─────────────────────────────────────────────── */}
            <StatCard
                icon={BarChart2}
                iconColor="text-blue-400"
                iconBg="bg-blue-500/10 group-hover/tooltip:bg-blue-500/20"
                glow="bg-blue-500/10 group-hover:bg-blue-500/20"
                gradient="from-blue-500/[0.02]"
                label="Equilíbrio"
                tooltip={(
                    <>
                        <strong className="text-white">{balanceLabel}:</strong>{' '}
                        {balance?.message || 'Analisa como você divide seu tempo entre as matérias.'}
                    </>
                )}
                footer={(
                    <>
                        {balance?.distribution?.[0] ? (
                            <span className="truncate min-w-0" title={balance.distribution[0].subject}>
                                Top: <strong className="font-semibold text-slate-200">{balance.distribution[0].subject}</strong>
                            </span>
                        ) : (
                            <span className="text-slate-500">Sem matérias</span>
                        )}

                        {balance?.metrics?.activeSubjects > 0 && (
                            <span className="text-blue-400 font-semibold shrink-0 tabular-nums">
                                {balance.metrics.activeSubjects}/{balance.metrics.totalSubjects} {balance.metrics.activeSubjects === 1 ? 'ativa' : 'ativas'}
                            </span>
                        )}
                    </>
                )}
            >
                {hasBalanceData ? (
                    <span className="text-xl font-bold text-white leading-tight truncate" title={balanceLabel}>
                        {balanceLabel}
                    </span>
                ) : (
                    <span className={EMPTY_VALUE_CLS}>Sem dados</span>
                )}
            </StatCard>

            {/* ── Flashcards ─────────────────────────────────────────────── */}
            <StatCard
                icon={BookOpen}
                iconColor="text-amber-400"
                iconBg="bg-amber-500/10 group-hover/tooltip:bg-amber-500/20"
                glow="bg-amber-500/10 group-hover:bg-amber-500/20"
                gradient="from-amber-500/[0.02]"
                label="Flashcards"
                tooltip={(
                    <>
                        <strong className="text-white">Indicadores SRS:</strong> Revisões totais, taxa de retenção e cartões pendentes de hoje via repetição espaçada.
                    </>
                )}
                footer={(
                    <>
                        <span>
                            Precisão:{' '}
                            <strong className={`font-semibold tabular-nums ${(fcStats.flashcardReviews || 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                {(fcStats.flashcardReviews || 0) > 0 ? `${formatValue(fcStats.flashcardAccuracy || 0)}%` : '-'}
                            </strong>
                        </span>

                        <span className="shrink-0">
                            Hoje: <strong className="font-semibold text-slate-200 tabular-nums">{fcStats.flashcardReviewsToday || 0}</strong>
                        </span>
                    </>
                )}
            >
                <span className={`${VALUE_CLS} text-white`}>{(fcStats.flashcardReviews || 0).toLocaleString('pt-BR')}</span>
                <span className={UNIT_CLS}>{(fcStats.flashcardReviews || 0) === 1 ? 'revisão' : 'revisões'}</span>
            </StatCard>

            {/* ── XP / Nível ─────────────────────────────────────────────── */}
            <StatCard
                icon={Trophy}
                iconColor="text-purple-400"
                iconBg="bg-purple-500/10 group-hover/tooltip:bg-purple-500/20"
                glow="bg-purple-500/10 group-hover:bg-purple-500/20"
                gradient="from-purple-500/[0.02]"
                label={`Nível ${progress.level}`}
                tooltipAlign="auto"
                tooltip={(
                    <>
                        <strong className="text-white">Nível {progress.level}:</strong> Sua experiência global. Conclua tarefas e ciclos de estudo para avançar de patente!
                    </>
                )}
                footerLayout="flex flex-col gap-1.5"
                footer={(
                    <>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
                                style={{
                                    width: `${Math.max(0, Math.min(100, Number(progress?.percentage) || 0))}%`
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-purple-300 font-medium tabular-nums">
                            <span>{formatValue(progress?.percentage || 0)}%</span>
                            <span>Próximo: nível {(progress?.level || 1) + 1}</span>
                        </div>
                    </>
                )}
            >
                <span
                    className={`${VALUE_CLS} text-white truncate`}
                    title={`${(user.xp || 0).toLocaleString('pt-BR')} XP`}
                >
                    {(user.xp || 0).toLocaleString('pt-BR')}
                </span>
                <span className={UNIT_CLS}>XP</span>
            </StatCard>

            {/* ── Data da Prova ───────────────────────────────────────────── */}
            <StatCard
                icon={Calendar}
                iconColor="text-rose-400"
                iconBg="bg-rose-500/10 group-hover/tooltip:bg-rose-500/20"
                glow={!user.goalDate ? 'bg-slate-500/10' : 'bg-rose-500/10 group-hover:bg-rose-500/20'}
                gradient={isExamClose ? 'from-rose-500/[0.06]' : null}
                className={!user.goalDate ? 'border-slate-500/30' : 'border-white/10 hover:border-rose-500/30'}
                label="Prova"
                tooltipAlign="right"
                tooltip={(
                    <>
                        <strong className="text-white">{examStatusLabel}:</strong>{' '}
                        {daysRemaining === null
                            ? 'Nenhuma data alvo definida no momento.'
                            : daysRemaining < 0
                                ? 'A data agendada para a prova já passou.'
                                : daysRemaining === 0
                                    ? 'O dia do seu objetivo chegou. Boa sorte!'
                                    : `Faltam ${daysRemaining} dias de preparação para a sua prova.`}
                    </>
                )}
                footerProps={{
                    className: 'relative group/date cursor-pointer',
                    onClick: openDatePicker
                }}
                footer={(
                    <>
                        {/* Interactive date selector unified at footer */}
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

                        <span className="flex items-center gap-1.5 text-slate-200 font-medium group-hover/date:text-rose-400 transition-colors truncate pointer-events-none tabular-nums">
                            <Calendar size={13} className="text-rose-400 shrink-0" />
                            {user.goalDate ? displayDate : 'Definir data'}
                        </span>

                        <span className={`font-semibold shrink-0 pointer-events-none ${daysRemaining !== null && daysRemaining < 0
                            ? 'text-slate-500'
                            : isExamClose
                                ? 'text-rose-400'
                                : 'text-slate-400'}`}>
                            {daysRemaining === null ? 'Editar' : daysRemaining < 0 ? 'Atrasado' : daysRemaining === 0 ? 'Hoje' : 'Alvo'}
                        </span>
                    </>
                )}
            >
                {daysRemaining !== null ? (
                    <>
                        <span className={`${VALUE_CLS} ${daysRemaining < 0
                            ? 'text-slate-500'
                            : daysRemaining <= 15
                                ? 'text-rose-400'
                                : 'text-white'}`}>
                            {Math.abs(daysRemaining)}
                        </span>
                        <span className={UNIT_CLS}>
                            {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                        </span>
                    </>
                ) : (
                    <span className={EMPTY_VALUE_CLS}>Sem data</span>
                )}
            </StatCard>
        </div>
    );
};

export default React.memo(StatsCards);
