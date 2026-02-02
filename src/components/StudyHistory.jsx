import React, { useMemo } from 'react';
import { Clock, Calendar, TrendingUp, BarChart3, Zap, BrainCircuit, Target, CheckCircle2, AlertCircle, Trophy, Siren } from 'lucide-react';

// Format minutes to hours:minutes
const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    return `${hours}h ${mins}min`;
};

// Get day name in Portuguese
const getDayName = (date) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
};

export default function StudyHistory({ studySessions = [], categories = [], simuladoRows = [] }) {
    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date();
        const today = now.toDateString();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        // Today's sessions
        const todaySessions = studySessions.filter(s =>
            new Date(s.startTime).toDateString() === today
        );
        const todayMinutes = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0);

        // This week's data (group by day)
        const weekData = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toDateString();

            const daySessions = studySessions.filter(s =>
                new Date(s.startTime).toDateString() === dateStr
            );
            const dayMinutes = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);

            weekData.push({
                day: getDayName(date),
                date: date.getDate(),
                minutes: dayMinutes,
                isToday: dateStr === today
            });
        }

        // Total all time
        const totalMinutes = studySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
        const totalSessions = studySessions.length;

        // Max for chart scaling
        const maxDayMinutes = Math.max(...weekData.map(d => d.minutes), 30);

        return { todaySessions, todayMinutes, weekData, totalMinutes, totalSessions, maxDayMinutes };
    }, [studySessions]);

    // Get category name by ID
    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.name || 'Estudo Geral';
    };

    const getCategoryIcon = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.icon || '📚';
    };

    return (
        <div className="w-full space-y-5 animate-fade-in-down">
            {/* Top Section - Header & Stats */}
            <div className="flex items-center gap-6">
                {/* Header */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-lg"></div>
                        <div className="relative p-3 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl border border-emerald-500/30">
                            <BarChart3 size={28} className="text-emerald-400" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Histórico de Estudos</h2>
                        <p className="text-slate-500 text-xs">Acompanhe seu progresso</p>
                    </div>
                </div>

                {/* Stats Cards - Enhanced */}
                <div className="flex-1 flex gap-3">
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

            {/* Middle Section - Chart and Sessions */}
            <div className="flex gap-4">
                {/* Weekly Chart - Enhanced */}
                <div className="w-1/3 glass p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <BarChart3 size={14} />
                        Gráfico Semanal
                    </h3>
                    <div className="flex items-end justify-between gap-2 h-32">
                        {stats.weekData.map((day, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                {/* Bar */}
                                <div className="w-full flex flex-col items-center justify-end h-20">
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
                                {/* Day label */}
                                <div className={`text-[10px] font-bold ${day.isToday ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {day.day}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Today's Sessions - Enhanced */}
                <div className="flex-1 glass p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                        <Zap size={14} />
                        Sessões de Hoje ({stats.todaySessions.length})
                    </h3>

                    {stats.todaySessions.length > 0 ? (
                        <div className="space-y-2 max-h-28 overflow-y-auto custom-scrollbar">
                            {[...stats.todaySessions].reverse().map((session, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
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
                                    <div className="text-sm font-bold text-emerald-400">
                                        {formatDuration(session.duration)}
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

            {/* Performance Panel */}
            <div className="relative rounded-2xl overflow-hidden">
                {/* Premium Glass Background with animated gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800/95 to-slate-900"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-purple-500/10"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-cyan-500/10 blur-3xl rounded-full"></div>
                <div className="absolute inset-[1px] rounded-2xl border border-white/10"></div>

                {/* Content */}
                <div className="relative p-5">
                    {/* Premium Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 to-blue-500/40 rounded-xl blur-xl group-hover:blur-2xl transition-all"></div>
                                <div className="relative p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl border border-cyan-500/30 shadow-xl shadow-cyan-500/10">
                                    <BrainCircuit size={24} className="text-cyan-400" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
                                    Performance
                                </h3>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <Target size={10} className="text-cyan-500/60" />
                                    Análise de Simulados
                                </p>
                            </div>
                        </div>

                        {/* Quick Legend */}
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
                        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        const yesterdayStr = yesterday.toDateString();

                        const todayRows = simuladoRows.filter(r => {
                            if (!r.createdAt) return false;
                            return new Date(r.createdAt).toDateString() === todayStr;
                        });

                        const yesterdayRows = simuladoRows.filter(r => {
                            if (!r.createdAt) return false;
                            return new Date(r.createdAt).toDateString() === yesterdayStr;
                        });

                        const renderSection = (rows, title, icon, isToday) => {
                            const validRows = rows.filter(r => r.subject && r.topic);
                            if (validRows.length === 0) return null;

                            const totalQuestions = validRows.reduce((acc, r) => acc + (parseInt(r.total) || 0), 0);
                            const totalCorrect = validRows.reduce((acc, r) => acc + (parseInt(r.correct) || 0), 0);
                            const globalPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

                            const subjectMap = {};
                            validRows.forEach(row => {
                                const subj = row.subject.trim();
                                if (!subjectMap[subj]) {
                                    subjectMap[subj] = { name: subj, correct: 0, total: 0, topics: [] };
                                }
                                const correct = parseInt(row.correct) || 0;
                                const total = parseInt(row.total) || 0;
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
                                <div className={`flex-1 ${isToday ? '' : 'opacity-80'}`}>
                                    {/* Global Insight Banner */}
                                    <div className="mb-6 bg-slate-800/80 rounded-xl border border-indigo-500/30 p-4 shadow-lg shadow-indigo-500/5 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50"></div>
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>
                                        <div className="relative flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                                <BrainCircuit size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-0.5">Insight Geral</h4>
                                                <p className="text-sm text-white font-medium">"{globalInsight}"</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subjects List */}
                                    <div className="space-y-6">
                                        {subjects.map((subj, idx) => {
                                            const subjPct = subj.total > 0 ? Math.round((subj.correct / subj.total) * 100) : 0;
                                            const status = getStatus(subjPct);
                                            const insight = getInsight(subjPct);

                                            return (
                                                <div key={idx} className="bg-slate-900/40 rounded-xl overflow-hidden border border-slate-700/50">
                                                    {/* Subject Header */}
                                                    <div className="relative bg-slate-800 p-3 flex items-center justify-between border-b border-slate-700/50">
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-${status.color}-500`}></div>
                                                        <h3 className="ml-6 text-lg font-bold text-white tracking-tight relative z-10">{subj.name}</h3>
                                                        <span className="text-[10px] text-slate-400 italic bg-black/20 px-2 py-1 rounded-md border border-white/5">
                                                            {insight}
                                                        </span>
                                                    </div>

                                                    {/* Topics Table */}
                                                    <div className="p-2">
                                                        {/* Table Header */}
                                                        <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2 border-b border-slate-800 mb-1">
                                                            <div className="col-span-4">Assunto</div>
                                                            <div className="col-span-3 text-center">Status</div>
                                                            <div className="col-span-2 text-center">Desempenho</div>
                                                            <div className="col-span-3 text-right">Ação Recomendada</div>
                                                        </div>

                                                        {/* Topics Rows */}
                                                        <div className="space-y-1">
                                                            {subj.topics.map((topic, tIdx) => {
                                                                const topicStatus = getStatus(topic.pct);
                                                                const action = getAction(topic.pct);
                                                                const TopicIcon = topicStatus.icon;

                                                                return (
                                                                    <div key={tIdx} className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                                                                        {/* Topic Name */}
                                                                        <div className="col-span-4 text-xs font-semibold text-slate-200 pr-2 whitespace-normal break-words leading-tight">
                                                                            {topic.name}
                                                                        </div>

                                                                        {/* Status Badge */}
                                                                        <div className="col-span-3 flex justify-center">
                                                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${topicStatus.wrapper}`}>
                                                                                <TopicIcon size={10} />
                                                                                <span className="text-[9px] font-black tracking-wide">{topicStatus.label}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Performance Ring */}
                                                                        <div className="col-span-2 flex flex-col items-center justify-center">
                                                                            <div className="relative w-9 h-9">
                                                                                <svg className="w-full h-full -rotate-90">
                                                                                    <circle cx="18" cy="18" r="15" strokeWidth="3" fill="transparent" className="stroke-slate-700/50" />
                                                                                    <circle cx="18" cy="18" r="15" strokeWidth="3" fill="transparent"
                                                                                        stroke={topic.pct >= 70 ? '#10b981' : topic.pct >= 50 ? '#f59e0b' : '#f43f5e'}
                                                                                        strokeLinecap="round"
                                                                                        strokeDasharray={94}
                                                                                        strokeDashoffset={94 - (94 * topic.pct / 100)}
                                                                                    />
                                                                                </svg>
                                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                                    <span className="text-[9px] font-bold text-white">{topic.pct}%</span>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-[8px] text-slate-500 mt-0.5 font-mono">{topic.correct}/{topic.total}</span>
                                                                        </div>

                                                                        {/* Action */}
                                                                        <div className="col-span-3 text-right">
                                                                            <span className="text-[10px] text-slate-300 font-medium">{action}</span>
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
                            );
                        };

                        const todaySection = renderSection(todayRows, 'Hoje', '📅', true);
                        const yesterdaySection = renderSection(yesterdayRows, 'Ontem', '📆', false);

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
                            <div className="flex gap-8">
                                {todaySection || (
                                    <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700/40">
                                        <span className="text-3xl mb-2">📅</span>
                                        <span className="text-xs text-slate-500 font-medium">Sem dados hoje</span>
                                    </div>
                                )}

                                {/* Premium Divider */}
                                <div className="flex flex-col items-center gap-3 py-4 px-2">
                                    <div className="w-0.5 flex-1 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent rounded-full"></div>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-cyan-500/40 blur-lg rounded-full scale-150"></div>
                                        <div className="relative w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-cyan-300/50 shadow-lg shadow-cyan-500/30"></div>
                                    </div>
                                    <div className="w-0.5 flex-1 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent rounded-full"></div>
                                </div>

                                {yesterdaySection || (
                                    <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700/40">
                                        <span className="text-3xl mb-2">📆</span>
                                        <span className="text-xs text-slate-500 font-medium">Sem dados ontem</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
