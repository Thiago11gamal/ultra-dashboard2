import React, { useMemo } from 'react';
import { Clock, Calendar, TrendingUp, BarChart3, Zap, BrainCircuit, AlertCircle, Trophy, Siren, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { normalizeDate } from '../utils/dateHelper'; // IMPORTAÇÃO NECESSÁRIA

// Format minutes to hours:minutes
// E-01 FIX: Math.round() evita minutos fracionários (ex: 25.5 → "26min")
// CORREÇÃO 4: Formatação de horas exatas
const formatDuration = (minutes) => {
    const total = Math.round(minutes || 0);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`; // Evita exibir "1h 0min"
    return `${hours}h ${mins}min`;
};

// Get day name in Portuguese - Full names to avoid browser translation bugs (Sex -> Gender)
const getDayName = (date) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[date.getDay()];
};

const StudyHistory = React.memo(function StudyHistory({
    studySessions = [],
    categories = [],
    simuladoRows = [],
    onDeleteSession,
    onDeleteSimulado,
    mode = 'full' // 'full', 'sessions', 'performance'
}) {
    const showToast = useToast();
    const [selectedWeekOffset, setSelectedWeekOffset] = React.useState(0);
    const [currentTime] = React.useState(() => Date.now()); // Fix B-13 Purity

    // Calculate total weeks available (Sunday to Sunday boundaries)
    const availableWeeks = useMemo(() => {
        if (studySessions.length === 0) return 0;

        // Find the earliest session
        const earliestTimeArr = studySessions.map(s => {
            const t = new Date(s.startTime).getTime();
            return isNaN(t) ? currentTime : t;
        });

        // FIX: Removido useMemo aninhado que causava erro #300. 
        // Hooks devem ser chamados apenas no nível superior.
        const earliestTime = Math.min(...earliestTimeArr, currentTime);

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
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

        return Math.max(diffWeeks, 1);
    }, [studySessions, currentTime]); // BUG-23 FIX: currentTime adicionado
    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date();
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

        // Today's sessions (always actual today)
        const todaySessions = studySessions.filter(s =>
            new Date(s.startTime).toDateString() === today
        );
        const todayMinutes = todaySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);

        // Selected week's data (group by day)
        const weekData = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toDateString();

            const daySessions = studySessions.filter(s =>
                new Date(s.startTime).toDateString() === dateStr
            );
            const dayMinutes = daySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);

            weekData.push({
                day: getDayName(date),
                date: date.getDate(),
                minutes: dayMinutes,
                isToday: dateStr === today
            });
        }

        // Total all time
        const totalMinutes = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
        const totalSessions = studySessions.length;

        // Max for chart scaling
        const maxDayMinutes = Math.max(...weekData.map(d => d.minutes), 30);

        return { todaySessions, todayMinutes, weekData, totalMinutes, totalSessions, maxDayMinutes, weekStart: startOfWeek, weekEnd: refWeekEnd };
    }, [studySessions, selectedWeekOffset]);

    // Get category name by ID
    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.name || 'Estudo Geral';
    };

    const getCategoryIcon = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.icon || '📚';
    };

    // Helper to get color for performance subjects
    const getSubjectColor = (name) => {
        const safeName = String(name || '').toLowerCase();
        const cat = categories.find(c => String(c?.name || '').toLowerCase() === safeName);
        if (cat?.color) return cat.color;
 
        // Palette fallback for consistent coloring of unknown subjects
        const palette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
        let hash = 0;
        const nameToHash = safeName || 'default';
        for (let i = 0; i < nameToHash.length; i++) {
            hash = nameToHash.charCodeAt(i) + ((hash << 5) - hash);
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
                <div className="flex flex-col gap-4 items-stretch">
                    {/* Weekly Chart - Enhanced */}
                    <div className="w-full glass p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <BarChart3 size={12} className="text-blue-400" />
                                </div>
                                Gráfico Semanal
                            </h3>

                            {/* Week Selector - Wrapped for Mobile */}
                            <div className="w-full sm:w-auto overflow-hidden">
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar scroll-smooth">
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

                    {/* Today's Sessions - Enhanced */}
                    <div className="w-full glass p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <Zap size={14} />
                            Sessões de Hoje ({stats.todaySessions.length})
                        </h3>

                        {stats.todaySessions.length > 0 ? (
                            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                {[...stats.todaySessions].reverse().map((session, idx) => (
                                    <div key={session.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">{getCategoryIcon(session.categoryId)}</span>
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {getCategoryName(session.categoryId)}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    {new Date(session.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm font-bold text-emerald-400">
                                                {formatDuration(session.duration)}
                                            </div>
                                            {onDeleteSession && (
                                                <button
                                                    onClick={() => {
                                                        if (!session.id) {
                                                            showToast('Erro: ID da sessão não encontrado.', 'error');
                                                            return;
                                                        }
                                                        if (window.confirm('Excluir esta sessão de estudo? O tempo será subtraído da categoria.')) {
                                                            try {
                                                                onDeleteSession(session.id);
                                                                showToast('Sessão excluída.', 'info');
                                                            } catch {
                                                                showToast('Erro ao excluir sessão.', 'error');
                                                            }
                                                        }
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
                                <p className="text-sm">Nenhuma sessão hoje ainda</p>
                                <p className="text-xs mt-1 text-slate-600">Use o Pomodoro para começar!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CORREÇÃO 7: minHeight menor para não criar espaço vazio gigante */}
            {(mode === 'full' || mode === 'performance') && (
                <div className="relative rounded-2xl overflow-hidden -mt-6" style={{ minHeight: '400px' }}>
                    {/* Premium Glass Background with animated gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/60 to-slate-900"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/15 via-transparent to-indigo-500/10"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-purple-500/15 blur-3xl rounded-full"></div>
                    <div className="absolute inset-[1px] rounded-2xl border border-indigo-500/20"></div>

                    {/* Content */}
                    <div className="relative p-6 flex flex-col h-full" style={{ minHeight: '280px' }}>
                        {/* Quick Legend - Now at top right */}
                        <div className="flex justify-end mb-4">
                            <div className="flex items-center gap-3 text-[10px]">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-emerald-400">≥70%</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span className="text-amber-400">50-69%</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    <span className="text-rose-400">&lt;50%</span>
                                </div>
                            </div>
                        </div>

                        {(() => {
                            const now = new Date();
                            const todayStr = now.toDateString();

                            // CORREÇÃO 5: Cálculo seguro do dia anterior (sem - 24*60*60*1000)
                            const yesterday = new Date(now);
                            yesterday.setDate(now.getDate() - 1);
                            const yesterdayStr = yesterday.toDateString();

                            // CORREÇÃO 6: Normalização de UTC para fuso local nas linhas
                            const todayRows = simuladoRows.filter(r => {
                                if (!r.createdAt || !r.validated) return false;
                                const rDate = normalizeDate(r.date || r.createdAt);
                                return rDate && rDate.toDateString() === todayStr;
                            });

                            const yesterdayRows = simuladoRows.filter(r => {
                                if (!r.createdAt || !r.validated) return false;
                                const rDate = normalizeDate(r.date || r.createdAt);
                                return rDate && rDate.toDateString() === yesterdayStr;
                            });

                            const renderSection = (rows, title, icon, isToday, side = 'left') => {
                                const validRows = rows.filter(r => r.subject && r.topic);
                                if (validRows.length === 0) return null;

                                const totalQuestions = validRows.reduce((acc, r) => acc + (parseInt(r.total, 10) || 0), 0);

                                // Visualize empty state if no questions answered yet (e.g. auto-cloned rows)
                                if (totalQuestions === 0) return null;
                                const totalCorrect = validRows.reduce((acc, r) => acc + (parseInt(r.correct, 10) || 0), 0);
                                const globalPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

                                const subjectMap = {};
                                validRows.forEach(row => {
                                    const subj = row.subject.trim();
                                    if (!subjectMap[subj]) {
                                        subjectMap[subj] = { name: subj, correct: 0, total: 0, topics: [] };
                                    }
                                    const correct = parseInt(row.correct, 10) || 0;
                                    const total = parseInt(row.total, 10) || 0;
                                    subjectMap[subj].correct += correct;
                                    subjectMap[subj].total += total;
                                    subjectMap[subj].topics.push({
                                        name: row.topic,
                                        correct,
                                        total,
                                        pct: total > 0 ? Math.round((correct / total) * 100) : 0
                                    });
                                });

                                const subjects = Object.values(subjectMap).sort((a, b) => {
                                    const pctA = a.total > 0 ? (a.correct / a.total) * 100 : 0;
                                    const pctB = b.total > 0 ? (b.correct / b.total) * 100 : 0;
                                    return pctA - pctB;
                                });

                                // Helpers for status and actions
                                const getStatus = (pct) => {
                                    if (pct >= 70) return { label: 'DOMINADO', color: 'emerald', icon: Trophy, wrapper: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
                                    if (pct >= 50) return { label: 'ATENÇÃO', color: 'amber', icon: AlertCircle, wrapper: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
                                    return { label: 'CRÍTICO', color: 'rose', icon: Siren, wrapper: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
                                };

                                const getAction = (pct) => {
                                    if (pct >= 70) return 'Manter Revisão Periódica';
                                    if (pct >= 50) return 'Treino Prático Intensivo';
                                    return 'Revisão Teórica + Questões';
                                };

                                const getInsight = (pct) => {
                                    if (pct >= 70) return `Excelente desempenho (${pct}%). Continue assim!`;
                                    if (pct >= 50) return `Desempenho mediano (${pct}%). Pode evoluir mais.`;
                                    return `Crítico (${pct}%). Atenção urgente necessária.`;
                                };

                                const globalInsight = globalPct >= 70
                                    ? "Excelente! Você está dominando o conteúdo. Mantenha o ritmo!"
                                    : globalPct >= 50
                                        ? `Bom trabalho! Média global de ${globalPct}%. Ajuste os pontos fracos para subir de nível.`
                                        : "Atenção! Sua média global indica que é preciso reforçar a base teórica.";

                                return (
                                    <div className={`flex-1 flex h-full min-h-0 ${isToday ? '' : 'opacity-90'} ${side === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Vertical Icon Column - Mirrored Logic */}
                                        <div className={`flex flex-col items-center justify-center px-3 py-8 ${side === 'left' ? 'mr-4 rounded-l-xl border-r' : 'ml-4 rounded-r-xl border-l'} bg-slate-800/40 border-indigo-500/20 shadow-xl self-stretch relative group`}>
                                            <div className="flex-1 flex flex-col items-center justify-between gap-8 h-full">
                                                <span className="text-3xl filter grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{icon}</span>
                                                <h3 className={`text-[11px] font-black tracking-[0.3em] uppercase ${isToday ? 'text-emerald-400' : 'text-indigo-400'} whitespace-nowrap`} style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: side === 'left' ? 'rotate(180deg)' : 'none' }}>
                                                    {title}
                                                </h3>
                                                <div className="w-px h-12 bg-gradient-to-b from-indigo-500/30 to-transparent"></div>
                                            </div>

                                            {/* DELETE BUTTON - ABSOLUTE BOTTOM */}
                                            {onDeleteSimulado && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Pass the date of one of the rows. 
                                                        // Fallback seguro usando date ou createdAt para evitar exclusão de imports.
                                                        const dateToDelete = rows[0]?.date || rows[0]?.createdAt || new Date().toISOString();
                                                        onDeleteSimulado(dateToDelete);
                                                    }}
                                                    className="absolute bottom-2 left-1/2 -translate-x-1/2 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                                                    title={`Excluir histórico de ${title}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Content Column */}
                                        <div className="flex-1 min-w-0 pr-2">
                                            {/* Global Insight Banner - More Spacing */}
                                            <div className="mb-6 bg-slate-800/80 rounded-xl border border-indigo-500/30 p-5 shadow-lg shadow-indigo-500/5 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50"></div>
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>
                                                <div className="relative flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                                        <BrainCircuit size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-0.5">Média Geral</h4>
                                                        <p className="text-sm text-white font-medium">{globalInsight}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subjects List */}
                                            <div className="space-y-6">
                                                {subjects.map((subj) => {
                                                    const subjPct = subj.total > 0 ? Math.round((subj.correct / subj.total) * 100) : 0;
                                                    const insight = getInsight(subjPct);
                                                    const subjColor = getSubjectColor(subj.name);

                                                    return (
                                                        <div key={subj.name} className="rounded-xl overflow-hidden border border-indigo-500/30 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/60 mr-2">
                                                            {/* Subject Header - Clean Spacing */}
                                                            <div className="relative py-4 pr-10 flex items-center justify-between border-b border-indigo-500/20"
                                                                style={{ borderLeft: `4px solid ${subjColor}`, paddingLeft: '28px' }}>
                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="text-lg font-bold tracking-tight relative z-10" style={{ color: subjColor }}>{subj.name}</h3>
                                                                </div>
                                                                <span className="text-[10px] text-slate-300 italic" style={{ paddingRight: '24px' }}>
                                                                    {insight}
                                                                </span>
                                                            </div>

                                                            {/* Topics Table */}
                                                            <div className="p-4">
                                                                {/* Table Header */}
                                                                <div className="hidden sm:grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 py-3 border-b border-indigo-500/20 mb-2">
                                                                    <div className="col-span-4">Assunto</div>
                                                                    <div className="col-span-3 text-center">Status</div>
                                                                    <div className="col-span-2 text-center">Desempenho</div>
                                                                    <div className="col-span-3 text-right" style={{ paddingRight: '24px' }}>Ação Recomendada</div>
                                                                </div>

                                                                {/* Topics Rows */}
                                                                <div className="space-y-2">
                                                                    {subj.topics.map((topic) => {
                                                                        const topicStatus = getStatus(topic.pct);
                                                                        const action = getAction(topic.pct);
                                                                        const TopicIcon = topicStatus.icon;

                                                                        return (
                                                                            <div key={topic.name} className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center px-4 sm:px-6 py-4 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 transition-colors border border-transparent hover:border-indigo-500/20">

                                                                                <div className="w-full sm:col-span-4 text-sm font-semibold text-white sm:pr-2 whitespace-normal break-words leading-tight text-center sm:text-left">
                                                                                    {topic.name}
                                                                                </div>

                                                                                <div className="col-span-3 flex justify-center">
                                                                                    <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md border ${topicStatus.wrapper}`}>
                                                                                        <TopicIcon size={12} />
                                                                                        <span className="text-[10px] font-bold tracking-wide">{topicStatus.label}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="w-full sm:col-span-2 flex flex-col items-center justify-center">
                                                                                    <div className="relative w-10 h-10">
                                                                                        {/* CORREÇÃO 9: viewBox obrigatório para manter a geometria SVG */}
                                                                                        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                                                                                            <circle cx="20" cy="20" r="16" strokeWidth="3" fill="transparent" className="stroke-slate-700/50" />
                                                                                            <circle cx="20" cy="20" r="16" strokeWidth="3" fill="transparent"
                                                                                                stroke={topic.pct >= 70 ? '#10b981' : topic.pct >= 50 ? '#f59e0b' : '#f43f5e'}
                                                                                                strokeLinecap="round"
                                                                                                strokeDasharray={2 * Math.PI * 16}
                                                                                                strokeDashoffset={2 * Math.PI * 16 * (1 - topic.pct / 100)}
                                                                                            />
                                                                                        </svg>
                                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                                            <span className="text-[10px] font-bold text-white">{topic.pct}%</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className="text-[9px] text-slate-400 mt-1 font-mono">{topic.correct}/{topic.total}</span>
                                                                                </div>

                                                                                {/* CORREÇÃO 10: Sem padding Right hardcoded, usa margem fluida */}
                                                                                <div className="w-full sm:col-span-3 text-center sm:text-right">
                                                                                    <span className="text-[10px] sm:text-xs text-slate-200 font-medium break-words">{action}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            };

                            const todaySection = renderSection(todayRows, 'Hoje', '⚡', true, 'right');
                            const yesterdaySection = renderSection(yesterdayRows, 'Ontem', '🕰️', false, 'left');

                            if (!todaySection && !yesterdaySection) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl"></div>
                                            <div className="relative p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                                <BrainCircuit size={40} className="text-slate-500" />
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400 font-medium">Nenhum dado de simulado</p>
                                        <p className="text-xs text-slate-600 mt-1">Use o menu Simulado para adicionar questões</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-y-visible" style={{ minHeight: '400px' }}>
                                    {yesterdaySection || (
                                        <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-800/30 rounded-xl border-2 border-slate-700/40">
                                            <span className="text-xs text-slate-500 font-medium">Sem dados ontem</span>
                                        </div>
                                    )}

                                    {todaySection || (
                                        <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-800/30 rounded-xl border-2 border-slate-700/40">
                                            <span className="text-xs text-slate-500 font-medium">Sem dados hoje</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
});

export default StudyHistory;
