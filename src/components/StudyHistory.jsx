import React, { useMemo, useState } from 'react';
import {
    Clock, Calendar, TrendingUp, TrendingDown, BarChart3, Zap, BrainCircuit,
    AlertCircle, Trophy, Siren, Trash2, Search, Filter, ChevronDown, ChevronUp,
    ArrowUpDown, CheckCircle2, Columns, LayoutList, CalendarDays, BookOpen, Layers,
    Eye, Sparkles, X
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { normalizeDate, getDateKey, formatDuration as globalFormatDuration } from '../utils/dateHelper';
import ConfirmModal from './ConfirmModal';

const formatDuration = (minutes) => {
    return globalFormatDuration((minutes || 0) / 60);
};

// Get day name in Portuguese - Full names to avoid browser translation bugs (Sex -> Gender)
const getDayName = (date) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[date.getDay()];
};

const StudyHistory = React.memo(function StudyHistory({
    studySessions: rawStudySessions = [],
    categories: rawCategories = [],
    simuladoRows: rawSimuladoRows = [],
    onDeleteSession,
    onDeleteSimulado,
    mode = 'full' // 'full', 'sessions', 'performance'
}) {
    const studySessions = Array.isArray(rawStudySessions) ? rawStudySessions : Object.values(rawStudySessions || {});
    const categories = (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    }));
    const simuladoRows = Array.isArray(rawSimuladoRows) ? rawSimuladoRows : Object.values(rawSimuladoRows || {});
    const showToast = useToast();
    const [selectedWeekOffset, setSelectedWeekOffset] = React.useState(0);
    const [currentTime] = React.useState(() => Date.now()); // Fix B-13 Purity
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [simuladoToDelete, setSimuladoToDelete] = useState(null);
    const [selectedSimuladoKey, setSelectedSimuladoKey] = useState(null);
    const [compareKeys, setCompareKeys] = useState({ keyA: null, keyB: null });
    const [viewMode, setViewMode] = useState('focus'); // 'focus' | 'compare' | 'timeline'
    const [topicSearch, setTopicSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'dominated' | 'attention' | 'critical'
    const [sortOrder, setSortOrder] = useState('critical-first'); // 'critical-first' | 'best-first' | 'name-asc'
    const [collapsedSubjects, setCollapsedSubjects] = useState({});

    // Calculate total weeks available (Sunday to Sunday boundaries)
    const availableWeeks = useMemo(() => {
        if (studySessions.length === 0) return 0;

        // Find the earliest session
        const earliestTimeArr = studySessions.map(s => {
            const d = normalizeDate(s.startTime);
            const t = d ? d.getTime() : currentTime;
            return isNaN(t) ? currentTime : t;
        });

        // FIX: Removido useMemo aninhado que causava erro #300. 
        // Hooks devem ser chamados apenas no nível superior.
        const earliestTime = earliestTimeArr.reduce((min, cur) => Math.min(min, cur), currentTime);

        const firstSession = new Date(earliestTime);

        // Get start of week (Sunday) for both earliest session and now
        const firstSunday = new Date(firstSession);
        firstSunday.setDate(firstSession.getDate() - firstSession.getDay());
        firstSunday.setHours(0, 0, 0, 0);

        const todaySunday = new Date();
        todaySunday.setDate(todaySunday.getDate() - todaySunday.getDay());
        todaySunday.setHours(0, 0, 0, 0);

        // Count weeks between Sundays
        const diffTime = Math.abs(todaySunday - firstSunday);
        const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

        return Math.max(diffWeeks, 1);
    }, [studySessions, currentTime]); // BUG-23 FIX: currentTime adicionado

    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date(currentTime);
        // Adjust now based on selected week offset (selectedWeekOffset is 0 for current week, -1 for last week, etc.)
        const referenceDate = new Date(now);
        referenceDate.setDate(now.getDate() + (selectedWeekOffset * 7));

        const today = now.toDateString();
        const startOfWeek = new Date(referenceDate);
        startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        // Reference week sessions
        const refWeekEnd = new Date(startOfWeek);
        refWeekEnd.setDate(startOfWeek.getDate() + 7);

        const sessionsByDateStr = {};
        studySessions.forEach(s => {
            const d = normalizeDate(s.startTime);
            if (!d) return;
            const dStr = d.toDateString();
            if (!sessionsByDateStr[dStr]) {
                sessionsByDateStr[dStr] = { minutes: 0, sessions: [] };
            }
            sessionsByDateStr[dStr].minutes += (Number(s.duration) || 0);
            sessionsByDateStr[dStr].sessions.push(s);
        });

        // Today's sessions (always actual today)
        const todaySessions = sessionsByDateStr[today]?.sessions || [];
        const todayMinutes = sessionsByDateStr[today]?.minutes || 0;

        // Selected week's data (group by day)
        const weekData = [];
        const weekSessions = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toDateString();

            const daySessions = sessionsByDateStr[dateStr]?.sessions || [];
            weekSessions.push(...daySessions);

            weekData.push({
                day: getDayName(date),
                date: date.getDate(),
                minutes: sessionsByDateStr[dateStr]?.minutes || 0,
                isToday: dateStr === today
            });
        }

        // Total all time
        const totalMinutes = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
        const totalSessions = studySessions.length;

        // Max for chart scaling
        // BUG-110: Garantir que minutes seja numérico antes de Math.max
        const maxDayMinutes = Math.max(...weekData.map(d => Number(d.minutes) || 0), 30);

        return { todaySessions, weekSessions, todayMinutes, weekData, totalMinutes, totalSessions, maxDayMinutes, weekStart: startOfWeek, weekEnd: refWeekEnd };
    }, [studySessions, selectedWeekOffset, currentTime]);

    // Get category name by ID
    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.name || 'Estudo Geral';
    };

    // Get subject name by ID or fallback
    const getSubjectName = (categoryId, taskId, taskTitle = '') => {
        const isInternalId = (str) => {
            if (!str) return false;
            const s = String(str);
            return s.startsWith('task') || s.startsWith('cat-') || s.includes('-weaktopic-');
        };

        if (taskTitle && !isInternalId(taskTitle)) return taskTitle;
        if (!taskId) return '';
        
        const cat = categories.find(c => c.id === categoryId);
        if (!cat || !cat.tasks) return isInternalId(taskId) ? '' : taskId;
        
        const task = cat.tasks.find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
        return task?.text || task?.title || (isInternalId(taskId) ? '' : taskId);
    };

    const getCategoryIcon = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.icon || '📚';
    };

    // Helper to get color for performance subjects
    const _getSubjectColor = (name) => {
        const safeName = String(name || '').toLowerCase();
        const cat = categories.find(c => String(c?.name || '').toLowerCase() === safeName);
        if (cat?.color) return cat.color;

        // Palette fallback for consistent coloring of unknown subjects
        const palette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
        let hash = 0;
        const source = safeName || 'desconhecido';
        for (let i = 0; i < source.length; i++) {
            hash = source.charCodeAt(i) + ((hash << 5) - hash);
        }
        return palette[Math.abs(hash) % palette.length];
    };

    return (
        <div className="w-full space-y-5 animate-fade-in-down">
            {/* Top Section - Stats */}
            {(mode === 'full' || mode === 'sessions') && (
                <div className="flex flex-col gap-6 text-slate-100">
                    {/* Stats Cards - Enhanced */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex-1 glass p-4 border-l-4 border-emerald-500">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <Clock size={14} />
                                Hoje
                            </div>
                            <div className="text-2xl font-black text-white">{formatDuration(stats.todayMinutes)}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stats.todaySessions.length} sessões realizadas
                            </div>
                        </div>

                        <div className="flex-1 glass p-4 border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <Calendar size={14} />
                                Esta Semana
                            </div>
                            <div className="text-2xl font-black text-white">{formatDuration(stats.weekData.reduce((acc, d) => acc + d.minutes, 0))}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stats.weekData.filter(d => d.minutes > 0).length} dias ativos
                            </div>
                        </div>

                        <div className="flex-1 glass p-4 border-l-4 border-purple-500">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <TrendingUp size={14} />
                                Total Geral
                            </div>
                            <div className="text-2xl font-black text-white">{formatDuration(stats.totalMinutes)}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stats.totalSessions} sessões totais
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Middle Section - Chart and Sessions */}
            {(mode === 'full' || mode === 'sessions') && (
                <div className="flex flex-col gap-4 items-stretch min-w-0 w-full">
                    {/* Weekly Chart - Enhanced */}
                    <div className="w-full glass p-4 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 min-w-0">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3 shrink-0">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <BarChart3 size={12} className="text-blue-400" />
                                </div>
                                Gráfico Semanal
                            </h3>

                            {/* Week Selector - Wrapped for Mobile */}
                            <div className="w-full sm:w-auto min-w-0">
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar scroll-smooth w-full">
                                    {Array.from({ length: Math.min(availableWeeks, 8) }).map((_, i) => {
                                        const offset = -i;
                                        const isSelected = selectedWeekOffset === offset;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedWeekOffset(offset)}
                                                className={`
                                                    relative px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                                                    transition-all duration-300 ease-out flex items-center gap-2 shrink-0
                                                    ${isSelected
                                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-105 border border-white/20'
                                                        : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 border border-transparent active:scale-95'
                                                    }
                                                    backdrop-blur-md
                                                `}
                                            >
                                                <div className={`w-1 h-1 rounded-full transition-all ${isSelected ? 'bg-white animate-pulse' : 'bg-slate-700'}`} />
                                                {offset === 0 ? 'Semana Atual' : `Semana ${availableWeeks - i}`}
                                            </button>
                                        );
                                    }).reverse()}
                                </div>
                            </div>
                        </div>
                        {/* Week date range — centered above bars */}
                        {stats.weekStart && (
                            <div className="text-center mb-3">
                                <span className="text-[11px] font-semibold text-slate-400 tracking-wide tabular-nums">
                                    {stats.weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    <span className="mx-1.5 text-slate-600">—</span>
                                    {new Date(stats.weekEnd.getTime() - 1).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                            </div>
                        )}
                        <div className="flex items-end justify-between gap-2 h-64">
                            {stats.weekData.map((day, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                    {/* Bar */}
                                    <div className="w-full flex flex-col items-center justify-end h-40">
                                        <div
                                            className={`w-full max-w-8 rounded-t-lg transition-all duration-500 ${day.isToday
                                                ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                                : day.minutes > 0
                                                    ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                                                    : 'bg-slate-700/50'
                                                }`}
                                            style={{
                                                height: `${Math.max((day.minutes / stats.maxDayMinutes) * 100, 5)}%`,
                                                minHeight: '6px'
                                            }}
                                        />
                                    </div>
                                    {/* Time label */}
                                    <div className={`text-[9px] font-mono ${day.minutes > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {day.minutes > 0 ? formatDuration(day.minutes) : '-'}
                                    </div>
                                    {/* Day label - Force Portuguese and prevent browser auto-translation */}
                                    <div
                                        translate="no"
                                        className={`text-[10px] font-bold ${day.isToday ? 'text-emerald-400' : 'text-slate-500'}`}
                                        title={day.day}
                                    >
                                        {day.day === 'Domingo' ? 'Dom' :
                                            day.day === 'Segunda' ? 'Seg' :
                                                day.day === 'Terça' ? 'Ter' :
                                                    day.day === 'Quarta' ? 'Qua' :
                                                        day.day === 'Quinta' ? 'Qui' :
                                                            day.day === 'Sexta' ? 'Sex' : 'Sáb'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Week Sessions - Enhanced */}
                    <div className="w-full glass p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <Zap size={14} />
                            Sessões da Semana ({stats.weekSessions.length})
                        </h3>

                        {stats.weekSessions.length > 0 ? (
                            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                {[...stats.weekSessions].sort((a, b) => new Date(normalizeDate(b.startTime) || 0).getTime() - new Date(normalizeDate(a.startTime) || 0).getTime()).map((session, idx) => (
                                    <div key={session.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">{getCategoryIcon(session.categoryId)}</span>
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {getCategoryName(session.categoryId)}
                                                </div>
                                                {getSubjectName(session.categoryId, session.taskId, session.taskTitle) && (
                                                    <div className="text-xs text-slate-400 mt-0.5 font-medium">
                                                        {getSubjectName(session.categoryId, session.taskId, session.taskTitle)}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {(normalizeDate(session.startTime) || new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm font-bold text-emerald-400">
                                                {formatDuration(session.duration)}
                                            </div>
                                            {typeof onDeleteSession === 'function' && (
                                                <button
                                                    onClick={() => {
                                                        if (!session.id) {
                                                            showToast('Erro: ID da sessão não encontrado.', 'error');
                                                            return;
                                                        }
                                                        setSessionToDelete(session);
                                                    }}
                                                    className="p-1.5 rounded-md bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                                                    title="Excluir Sessão"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500">
                                <Clock size={28} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nenhuma sessão nesta semana ainda</p>
                                <p className="text-xs mt-1 text-slate-600">Use o Pomodoro para começar!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SESSÃO DE HISTÓRICO DE DESEMPENHO EM SIMULADOS */}
            {(mode === 'full' || mode === 'performance') && (
                <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
                    {/* Background com gradiente sutil e moderno */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/40"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
                    <div className="absolute inset-[1px] rounded-2xl border border-white/10"></div>

                    <div className="relative p-5 sm:p-7 flex flex-col h-full space-y-6">
                        {(() => {
                            // Agrupar simulados do histórico por batchId ou data
                            const groupedSimulados = Object.values(simuladoRows.reduce((acc, r) => {
                                if (!r.date && !r.createdAt) return acc;
                                const hasData = parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0;
                                if (!r.validated && !hasData) return acc;
                                const rDate = normalizeDate(r.date || r.createdAt);
                                if (!rDate) return acc;
                                const isAi = r.source === 'ai-generated' || (r.batchId && r.source !== 'manual');
                                const key = (isAi && r.batchId) ? String(r.batchId) : getDateKey(rDate);
                                if (!acc[key]) {
                                    acc[key] = { key, date: rDate, rows: [], isAi };
                                }
                                acc[key].rows.push(r);
                                return acc;
                            }, {})).sort((a, b) => b.date.getTime() - a.date.getTime());

                            if (groupedSimulados.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl"></div>
                                            <div className="relative p-5 bg-slate-800/80 rounded-2xl border border-indigo-500/30">
                                                <BrainCircuit size={44} className="text-indigo-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-base font-bold text-white">Nenhum dado de simulado encontrado</h3>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                            Adicione resultados de simulados manuais ou gere simulados IA para acompanhar seu histórico de desempenho aqui.
                                        </p>
                                    </div>
                                );
                            }

                            // Estatísticas Globais Acumuladas
                            let totalGlobalQuestions = 0;
                            let totalGlobalCorrect = 0;
                            const uniqueTopicStats = new Map();

                            groupedSimulados.forEach(group => {
                                const valid = group.rows.filter(r => r.subject && r.topic);
                                valid.forEach(r => {
                                    const tot = parseInt(r.total, 10) || 0;
                                    const cor = parseInt(r.correct, 10) || 0;
                                    const safeC = Math.min(cor, tot);
                                    totalGlobalQuestions += tot;
                                    totalGlobalCorrect += safeC;

                                    const tKey = `${r.subject}__${r.topic}`;
                                    if (!uniqueTopicStats.has(tKey)) {
                                        uniqueTopicStats.set(tKey, { correct: 0, total: 0 });
                                    }
                                    const current = uniqueTopicStats.get(tKey);
                                    current.correct += safeC;
                                    current.total += tot;
                                });
                            });

                            const globalAllTimePct = totalGlobalQuestions > 0
                                ? Math.max(0, Math.min(100, Math.round((totalGlobalCorrect / totalGlobalQuestions) * 100)))
                                : 0;

                            let dominatedCount = 0;
                            let attentionCount = 0;
                            let criticalCount = 0;

                            uniqueTopicStats.forEach(({ correct, total }) => {
                                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                                if (pct >= 70) dominatedCount++;
                                else if (pct >= 50) attentionCount++;
                                else criticalCount++;
                            });

                            // Helpers de status
                            const getStatus = (pct) => {
                                const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
                                if (safePct >= 70) {
                                    return {
                                        id: 'dominated',
                                        label: 'DOMINADO',
                                        color: 'emerald',
                                        dotBg: 'bg-emerald-500',
                                        icon: Trophy,
                                        wrapper: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    };
                                }
                                if (safePct >= 50) {
                                    return {
                                        id: 'attention',
                                        label: 'ATENÇÃO',
                                        color: 'amber',
                                        dotBg: 'bg-amber-500',
                                        icon: AlertCircle,
                                        wrapper: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    };
                                }
                                return {
                                    id: 'critical',
                                    label: 'CRÍTICO',
                                    color: 'rose',
                                    dotBg: 'bg-rose-500',
                                    icon: Siren,
                                    wrapper: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                };
                            };

                            const getAction = (pct) => {
                                const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
                                if (safePct >= 70) return 'Manter Revisão Periódica';
                                if (safePct >= 50) return 'Treino Prático Intensivo';
                                return 'Revisão Teórica + Questões';
                            };

                            const getGlobalBannerStyle = (pct) => {
                                const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
                                if (safePct >= 70) {
                                    return {
                                        border: 'border-emerald-500/30 shadow-emerald-500/5',
                                        gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
                                        bar: 'bg-emerald-500',
                                        iconBg: 'bg-emerald-500/20 text-emerald-400',
                                        titleColor: 'text-emerald-300',
                                        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                                        statusLabel: 'Desempenho Excelente',
                                        message: 'Excelente! Você está dominando o conteúdo com consistência. Mantenha as revisões periódicas!'
                                    };
                                }
                                if (safePct >= 50) {
                                    return {
                                        border: 'border-amber-500/30 shadow-amber-500/5',
                                        gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
                                        bar: 'bg-amber-500',
                                        iconBg: 'bg-amber-500/20 text-amber-400',
                                        titleColor: 'text-amber-300',
                                        badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                                        statusLabel: 'Atenção Necessária',
                                        message: `Bom ritmo! Sua média é de ${safePct}%. Foco nos tópicos em atenção para consolidar a zona de aprovação.`
                                    };
                                }
                                return {
                                    border: 'border-rose-500/30 shadow-rose-500/5',
                                    gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
                                    bar: 'bg-rose-500',
                                    iconBg: 'bg-rose-500/20 text-rose-400',
                                    titleColor: 'text-rose-300',
                                    badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                                    statusLabel: 'Reforço Urgente',
                                    message: 'Atenção! Sua média global indica necessidade de reforçar a base teórica e praticar questões básicas dos tópicos críticos.'
                                };
                            };

                            // Função de processamento de simulado
                            const processSimulado = (rows) => {
                                const validRows = rows.filter(r => r.subject && r.topic);
                                const totalQuestions = validRows.reduce((acc, r) => acc + (parseInt(r.total, 10) || 0), 0);
                                const totalCorrect = validRows.reduce((acc, r) => acc + Math.min(parseInt(r.correct, 10) || 0, parseInt(r.total, 10) || 0), 0);
                                const globalPct = totalQuestions > 0 ? Math.max(0, Math.min(100, Math.round((totalCorrect / totalQuestions) * 100))) : 0;

                                const subjectMap = {};
                                validRows.forEach(row => {
                                    const subj = String(row.subject || '').trim();
                                    const top = String(row.topic || '').trim();
                                    if (!subjectMap[subj]) {
                                        subjectMap[subj] = { name: subj, correct: 0, total: 0, topicMap: {} };
                                    }
                                    const cor = Math.min(parseInt(row.correct, 10) || 0, parseInt(row.total, 10) || 0);
                                    const tot = parseInt(row.total, 10) || 0;
                                    subjectMap[subj].correct += cor;
                                    subjectMap[subj].total += tot;

                                    if (!subjectMap[subj].topicMap[top]) {
                                        subjectMap[subj].topicMap[top] = { name: top, correct: 0, total: 0 };
                                    }
                                    subjectMap[subj].topicMap[top].correct += cor;
                                    subjectMap[subj].topicMap[top].total += tot;
                                });

                                let subjects = Object.values(subjectMap).map(subj => {
                                    let topics = Object.values(subj.topicMap).map(t => {
                                        const safeC = Math.min(t.correct, t.total);
                                        const pct = t.total > 0 ? Math.round((safeC / t.total) * 100) : 0;
                                        return {
                                            ...t,
                                            correct: safeC,
                                            pct: Math.max(0, Math.min(100, pct))
                                        };
                                    });

                                    // Filtro de busca
                                    if (topicSearch.trim()) {
                                        const q = topicSearch.trim().toLowerCase();
                                        topics = topics.filter(t => t.name.toLowerCase().includes(q) || subj.name.toLowerCase().includes(q));
                                    }

                                    // Filtro de status
                                    if (statusFilter !== 'all') {
                                        topics = topics.filter(t => getStatus(t.pct).id === statusFilter);
                                    }

                                    // Ordenação de tópicos
                                    topics.sort((a, b) => {
                                        if (sortOrder === 'critical-first') return a.pct - b.pct;
                                        if (sortOrder === 'best-first') return b.pct - a.pct;
                                        return a.name.localeCompare(b.name, 'pt-BR');
                                    });

                                    const safeSubjC = Math.min(subj.correct, subj.total);
                                    const subjPct = subj.total > 0 ? Math.round((safeSubjC / subj.total) * 100) : 0;

                                    return {
                                        ...subj,
                                        correct: safeSubjC,
                                        pct: Math.max(0, Math.min(100, subjPct)),
                                        topics
                                    };
                                }).filter(s => s.topics.length > 0);

                                subjects.sort((a, b) => {
                                    if (sortOrder === 'critical-first') return a.pct - b.pct;
                                    if (sortOrder === 'best-first') return b.pct - a.pct;
                                    return a.name.localeCompare(b.name, 'pt-BR');
                                });

                                return { validRows, totalQuestions, totalCorrect, globalPct, subjects };
                            };

                            // Configuração de datas ativas para os modos
                            const activeFocusKey = selectedSimuladoKey || groupedSimulados[0]?.key;
                            const activeSimulado = groupedSimulados.find(g => g.key === activeFocusKey) || groupedSimulados[0];

                            const activeCompAKey = compareKeys.keyA || groupedSimulados[0]?.key;
                            const activeCompBKey = compareKeys.keyB || (groupedSimulados[1] ? groupedSimulados[1]?.key : groupedSimulados[0]?.key);
                            const simuladoA = groupedSimulados.find(g => g.key === activeCompAKey) || groupedSimulados[0];
                            const simuladoB = groupedSimulados.find(g => g.key === activeCompBKey) || groupedSimulados[1] || groupedSimulados[0];

                            // Renderizador de um card de simulado
                            const renderSimuladoCard = (group, isComparison = false, deltaInfo = null) => {
                                const { totalQuestions, totalCorrect, globalPct, subjects } = processSimulado(group.rows);
                                const isToday = group.date.toDateString() === new Date().toDateString();
                                const title = isToday ? 'Hoje' : group.date.toLocaleDateString('pt-BR');
                                const bannerStyle = getGlobalBannerStyle(globalPct);

                                return (
                                    <div key={group.key} className="flex-1 flex flex-col min-w-0 bg-slate-900/40 rounded-2xl border border-white/10 p-4 sm:p-6 shadow-xl backdrop-blur-sm">
                                        {/* Cabeçalho do Card */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                                                    group.isAi 
                                                        ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' 
                                                        : isToday 
                                                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                                                            : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                                                }`}>
                                                    {group.isAi ? '🤖' : (isToday ? '⚡' : '🕰️')}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className={`text-base font-black tracking-tight truncate ${isToday ? 'text-emerald-400' : 'text-white'}`}>
                                                            {title}
                                                        </h3>
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                                            group.isAi
                                                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                                                : 'bg-slate-800 border-slate-700 text-slate-300'
                                                        }`}>
                                                            {group.isAi ? 'Simulado IA' : 'Simulado'}
                                                        </span>
                                                        {deltaInfo !== null && (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                                                deltaInfo > 0
                                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                                    : deltaInfo < 0
                                                                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                                            }`}>
                                                                {deltaInfo > 0 ? <TrendingUp size={11} /> : deltaInfo < 0 ? <TrendingDown size={11} /> : null}
                                                                {deltaInfo > 0 ? `+${deltaInfo}%` : `${deltaInfo}%`} vs anterior
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize truncate">
                                                        {group.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Contadores e Ação de Exclusão */}
                                            <div className="flex items-center gap-3">
                                                <div className="text-right hidden sm:block">
                                                    <span className="text-xs font-bold text-slate-200 block">
                                                        {totalCorrect.toLocaleString('pt-BR')} / {totalQuestions.toLocaleString('pt-BR')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">acertos</span>
                                                </div>

                                                {typeof onDeleteSimulado === 'function' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSimuladoToDelete({
                                                                key: group.key,
                                                                title,
                                                                date: group.date,
                                                                totalQuestions
                                                            });
                                                        }}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95 shrink-0"
                                                        title={`Excluir histórico de ${title}`}
                                                        aria-label={`Excluir simulado de ${title}`}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Global Insight Banner Dinâmico */}
                                        <div className={`mb-6 rounded-xl border p-5 relative overflow-hidden bg-slate-800/80 ${bannerStyle.border}`}>
                                            <div className={`absolute inset-0 bg-gradient-to-r ${bannerStyle.gradient}`}></div>
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${bannerStyle.bar} rounded-l-xl`}></div>
                                            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${bannerStyle.iconBg}`}>
                                                        <BrainCircuit size={22} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className={`text-xs font-bold uppercase tracking-widest ${bannerStyle.titleColor}`}>
                                                                Média Geral
                                                            </h4>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bannerStyle.badgeBg}`}>
                                                                {bannerStyle.statusLabel}
                                                            </span>
                                                        </div>
                                                        <p className="text-2xl font-black text-white mt-0.5">{globalPct}%</p>
                                                    </div>
                                                </div>

                                                <div className="text-right hidden sm:block">
                                                    <span className="text-xs text-slate-400 font-medium">Taxa de Acerto</span>
                                                    <p className="text-sm font-bold text-white font-mono">
                                                        {totalCorrect.toLocaleString('pt-BR')} de {totalQuestions.toLocaleString('pt-BR')} questões
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="relative mt-3 text-xs text-slate-300 leading-relaxed font-medium">
                                                {bannerStyle.message}
                                            </p>
                                        </div>

                                        {/* Lista de Matérias */}
                                        <div className="space-y-4 flex-1">
                                            {subjects.length === 0 ? (
                                                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-white/5">
                                                    <Search size={24} className="mx-auto text-slate-600 mb-2" />
                                                    <p className="text-xs text-slate-400 font-medium">Nenhum assunto corresponde aos filtros aplicados.</p>
                                                </div>
                                            ) : (
                                                subjects.map((subj) => {
                                                    const subjStatus = getStatus(subj.pct);
                                                    const isCollapsed = Boolean(collapsedSubjects[`${group.key}__${subj.name}`]);
                                                    const toggleCollapse = () => {
                                                        setCollapsedSubjects(prev => ({
                                                            ...prev,
                                                            [`${group.key}__${subj.name}`]: !isCollapsed
                                                        }));
                                                    };

                                                    return (
                                                        <div key={subj.name} className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden transition-all hover:border-white/20">
                                                            {/* Subject Header */}
                                                            <div
                                                                onClick={toggleCollapse}
                                                                className="px-5 py-3.5 bg-slate-800/70 border-b border-white/5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/90 transition-colors select-none"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <button
                                                                        type="button"
                                                                        className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
                                                                        aria-label={isCollapsed ? "Expandir matéria" : "Recolher matéria"}
                                                                    >
                                                                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                                                    </button>
                                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${subjStatus.dotBg} shadow-[0_0_8px_currentColor]`}></div>
                                                                    <h4 className="text-sm font-bold text-white truncate">{subj.name}</h4>
                                                                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
                                                                        ({subj.topics.length} {subj.topics.length === 1 ? 'tópico' : 'tópicos'})
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-4 shrink-0">
                                                                    <div className="w-20 hidden md:block">
                                                                        <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                                    subj.pct >= 70 ? 'bg-emerald-500' : subj.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                                                }`}
                                                                                style={{ width: `${subj.pct}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-base font-black text-white">{subj.pct}%</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono block">
                                                                            {subj.correct.toLocaleString('pt-BR')}/{subj.total.toLocaleString('pt-BR')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Topics Table */}
                                                            {!isCollapsed && (
                                                                <div className="p-2 sm:p-3 space-y-2">
                                                                    {/* Column Headers Rigorosamente Alinhados */}
                                                                    <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 sm:px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/70 rounded-lg border border-white/5">
                                                                        <div className="col-span-4 text-left">Assunto / Tópico</div>
                                                                        <div className="col-span-3 text-center">Status</div>
                                                                        <div className="col-span-2 text-center">Desempenho</div>
                                                                        <div className="col-span-3 text-right">Ação Recomendada</div>
                                                                    </div>

                                                                    {/* Rows */}
                                                                    <div className="space-y-1.5">
                                                                        {subj.topics.map((topic) => {
                                                                            const topicStatus = getStatus(topic.pct);
                                                                            const action = getAction(topic.pct);
                                                                            const TopicIcon = topicStatus.icon;

                                                                            return (
                                                                                <div
                                                                                    key={topic.name}
                                                                                    className="flex flex-col sm:grid sm:grid-cols-12 gap-3 items-center px-4 sm:px-6 py-3 rounded-lg bg-slate-900/50 hover:bg-slate-800/60 transition-colors border border-transparent hover:border-indigo-500/20"
                                                                                >
                                                                                    {/* Assunto */}
                                                                                    <div className="w-full sm:col-span-4 text-sm font-semibold text-white sm:pr-2 whitespace-normal break-words leading-tight text-center sm:text-left flex items-center gap-2 justify-center sm:justify-start">
                                                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${topicStatus.dotBg}`}></span>
                                                                                        <span className="truncate" title={topic.name}>{topic.name}</span>
                                                                                    </div>

                                                                                    {/* Status Badge */}
                                                                                    <div className="w-full sm:col-span-3 flex justify-center">
                                                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wide ${topicStatus.wrapper}`}>
                                                                                            <TopicIcon size={12} className="shrink-0" />
                                                                                            <span>{topicStatus.label}</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Desempenho Gauge */}
                                                                                    <div className="w-full sm:col-span-2 flex flex-col items-center justify-center">
                                                                                        <div className="relative w-9 h-9">
                                                                                            <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                                                                                                <circle cx="20" cy="20" r="16" strokeWidth="3" fill="transparent" className="stroke-slate-700/50" />
                                                                                                {topic.pct > 0 && (
                                                                                                    <circle
                                                                                                        cx="20"
                                                                                                        cy="20"
                                                                                                        r="16"
                                                                                                        strokeWidth="3"
                                                                                                        fill="transparent"
                                                                                                        stroke={topic.pct >= 70 ? '#10b981' : topic.pct >= 50 ? '#f59e0b' : '#f43f5e'}
                                                                                                        strokeLinecap="round"
                                                                                                        strokeDasharray={2 * Math.PI * 16}
                                                                                                        strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(100, topic.pct) / 100)}
                                                                                                    />
                                                                                                )}
                                                                                            </svg>
                                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                                <span className="text-[10px] font-bold text-white">{topic.pct}%</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <span className="text-[9px] text-slate-400 mt-0.5 font-mono tracking-tight">
                                                                                            {topic.correct.toLocaleString('pt-BR')}/{topic.total.toLocaleString('pt-BR')}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Ação Recomendada */}
                                                                                    <div className="w-full sm:col-span-3 text-center sm:text-right">
                                                                                        <span className="text-[11px] text-slate-200 font-medium break-words leading-tight inline-block px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                                                                                            {action}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            };

                            // Delta para o modo comparativo
                            const { globalPct: pctA } = processSimulado(simuladoA.rows);
                            const { globalPct: pctB } = processSimulado(simuladoB.rows);
                            const compareDelta = pctA - pctB;

                            return (
                                <div className="space-y-6">
                                    {/* 1. PAINEL DE KPIS GLOBAIS */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400">
                                                <CalendarDays size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Simulados</span>
                                                <span className="text-xl font-black text-white">{groupedSimulados.length}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
                                                <BrainCircuit size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Média Acumulada</span>
                                                <span className={`text-xl font-black ${
                                                    globalAllTimePct >= 70 ? 'text-emerald-400' : globalAllTimePct >= 50 ? 'text-amber-400' : 'text-rose-400'
                                                }`}>
                                                    {globalAllTimePct}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400">
                                                <Layers size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Questões Feitas</span>
                                                <span className="text-xl font-black text-white font-mono">
                                                    {totalGlobalQuestions.toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                                                <Trophy size={20} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tópicos Dominados</span>
                                                <div className="flex items-center gap-1.5 text-sm font-black text-white">
                                                    <span className="text-emerald-400">{dominatedCount}</span>
                                                    <span className="text-slate-500">/</span>
                                                    <span className="text-amber-400">{attentionCount}</span>
                                                    <span className="text-slate-500">/</span>
                                                    <span className="text-rose-400">{criticalCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. BARRA DE CONTROLES E SELEÇÃO DE MODO */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/10">
                                        {/* Modos de visualização */}
                                        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5 self-start md:self-auto">
                                            <button
                                                onClick={() => setViewMode('focus')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    viewMode === 'focus'
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <LayoutList size={14} />
                                                <span>Foco por Data</span>
                                            </button>

                                            {groupedSimulados.length > 1 && (
                                                <button
                                                    onClick={() => setViewMode('compare')}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                        viewMode === 'compare'
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                                >
                                                    <Columns size={14} />
                                                    <span>Comparativo</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setViewMode('timeline')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    viewMode === 'timeline'
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <Layers size={14} />
                                                <span>Linha do Tempo</span>
                                            </button>
                                        </div>

                                        {/* Legenda Dinâmica e Rápida */}
                                        <div className="flex items-center gap-2 text-[10px] flex-wrap">
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                                                <Trophy size={11} />
                                                <span>≥70% Dominado</span>
                                            </div>
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                                                <AlertCircle size={11} />
                                                <span>50-69% Atenção</span>
                                            </div>
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
                                                <Siren size={11} />
                                                <span>&lt;50% Crítico</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. FILTROS E BUSCA */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        {/* Campo de Busca */}
                                        <div className="relative flex-1 max-w-md">
                                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type="text"
                                                value={topicSearch}
                                                onChange={(e) => setTopicSearch(e.target.value)}
                                                placeholder="Buscar por matéria ou tópico..."
                                                className="w-full pl-9 pr-8 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                            />
                                            {topicSearch && (
                                                <button
                                                    onClick={() => setTopicSearch('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Filtro de Status + Ordenação */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
                                            >
                                                <option value="all">Todos os Status</option>
                                                <option value="critical">🚨 Apenas Críticos (&lt;50%)</option>
                                                <option value="attention">⚠️ Apenas Atenção (50-69%)</option>
                                                <option value="dominated">🏆 Apenas Dominados (≥70%)</option>
                                            </select>

                                            <select
                                                value={sortOrder}
                                                onChange={(e) => setSortOrder(e.target.value)}
                                                className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
                                            >
                                                <option value="critical-first">⚡ Pior Desempenho Primeiro</option>
                                                <option value="best-first">🏆 Melhor Desempenho Primeiro</option>
                                                <option value="name-asc">🔤 Ordem Alfabética (A-Z)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 4. CONTEÚDO PRINCIPAL BASEADO NO MODO */}
                                    {viewMode === 'focus' && (
                                        <div className="space-y-4">
                                            {/* Seletor de Datas em Pills */}
                                            {groupedSimulados.length > 1 && (
                                                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                    {groupedSimulados.map((g, idx) => {
                                                        const isSelected = g.key === activeFocusKey;
                                                        const isToday = g.date.toDateString() === new Date().toDateString();
                                                        const label = isToday ? 'Hoje' : g.date.toLocaleDateString('pt-BR');
                                                        return (
                                                            <button
                                                                key={g.key}
                                                                onClick={() => setSelectedSimuladoKey(g.key)}
                                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                                                                    isSelected
                                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-white/20 shadow-lg shadow-indigo-600/30 scale-105'
                                                                        : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white'
                                                                }`}
                                                            >
                                                                <span>{g.isAi ? '🤖' : (isToday ? '⚡' : '📅')}</span>
                                                                <span>{label}</span>
                                                                {idx === 0 && (
                                                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white">
                                                                        Recente
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Renderização do Simulado Selecionado em Largura Total */}
                                            {renderSimuladoCard(activeSimulado)}
                                        </div>
                                    )}

                                    {viewMode === 'compare' && (
                                        <div className="space-y-4">
                                            {/* Barra de Seleção dos Dois Simulados */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-white/10">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                                        Simulado A (Base Recente)
                                                    </label>
                                                    <select
                                                        value={activeCompAKey}
                                                        onChange={(e) => setCompareKeys(prev => ({ ...prev, keyA: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    >
                                                        {groupedSimulados.map(g => (
                                                            <option key={g.key} value={g.key}>
                                                                {g.date.toLocaleDateString('pt-BR')} ({g.isAi ? 'IA' : 'Manual'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                                        Simulado B (Para Comparação)
                                                    </label>
                                                    <select
                                                        value={activeCompBKey}
                                                        onChange={(e) => setCompareKeys(prev => ({ ...prev, keyB: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    >
                                                        {groupedSimulados.map(g => (
                                                            <option key={g.key} value={g.key}>
                                                                {g.date.toLocaleDateString('pt-BR')} ({g.isAi ? 'IA' : 'Manual'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Cards Lado a Lado */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {renderSimuladoCard(simuladoA, true, compareDelta)}
                                                {renderSimuladoCard(simuladoB, true, null)}
                                            </div>
                                        </div>
                                    )}

                                    {viewMode === 'timeline' && (
                                        <div className="space-y-6">
                                            {groupedSimulados.map((g, idx) => {
                                                const prevSimulado = groupedSimulados[idx + 1];
                                                let delta = null;
                                                if (prevSimulado) {
                                                    const cur = processSimulado(g.rows).globalPct;
                                                    const prev = processSimulado(prevSimulado.rows).globalPct;
                                                    delta = cur - prev;
                                                }
                                                return renderSimuladoCard(g, false, delta);
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Modal de confirmação para exclusão de sessão Pomodoro */}
            <ConfirmModal
                isOpen={!!sessionToDelete}
                onClose={() => setSessionToDelete(null)}
                onConfirm={() => {
                    if (sessionToDelete?.id) {
                        try {
                            if (typeof onDeleteSession === 'function') {
                                onDeleteSession(sessionToDelete.id);
                                showToast('Sessão excluída.', 'info');
                            }
                        } catch {
                            showToast('Erro ao excluir sessão.', 'error');
                        }
                    }
                }}
                title="Excluir Sessão de Estudo"
                message="Excluir esta sessão de estudo? O tempo será subtraído da categoria."
                confirmText="Excluir Sessão"
                type="danger"
                icon={Trash2}
            />

            {/* Modal de confirmação seguro para exclusão de simulado */}
            <ConfirmModal
                isOpen={!!simuladoToDelete}
                onClose={() => setSimuladoToDelete(null)}
                onConfirm={() => {
                    if (simuladoToDelete?.key && typeof onDeleteSimulado === 'function') {
                        try {
                            onDeleteSimulado(simuladoToDelete.key);
                            showToast(`Simulado de ${simuladoToDelete.title} excluído.`, 'info');
                        } catch {
                            showToast('Erro ao excluir simulado.', 'error');
                        }
                        setSimuladoToDelete(null);
                    }
                }}
                title={`Excluir Simulado (${simuladoToDelete?.title || ''})`}
                message="Deseja realmente excluir este simulado do histórico? Todas as respostas e dados de desempenho desta avaliação serão removidos."
                confirmText="Excluir Simulado"
                type="danger"
                icon={Trash2}
            />
        </div>
    );
});

export default StudyHistory;

