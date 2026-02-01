import React, { useMemo } from 'react';
import { Clock, Calendar, TrendingUp, BarChart3, Zap } from 'lucide-react';

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

export default function StudyHistory({ studySessions = [], categories = [] }) {
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
        <div className="w-full space-y-6 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                    <BarChart3 size={32} className="text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold neon-text">Histórico de Estudos</h2>
                    <p className="text-slate-400 text-sm">Acompanhe seu progresso semanal</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today */}
                <div className="glass p-5 border-l-4 border-emerald-500">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Clock size={14} />
                        Hoje
                    </div>
                    <div className="text-3xl font-black text-white">
                        {formatDuration(stats.todayMinutes)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {stats.todaySessions.length} sessões
                    </div>
                </div>

                {/* This Week */}
                <div className="glass p-5 border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Calendar size={14} />
                        Esta Semana
                    </div>
                    <div className="text-3xl font-black text-white">
                        {formatDuration(stats.weekData.reduce((acc, d) => acc + d.minutes, 0))}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {stats.weekData.filter(d => d.minutes > 0).length} dias ativos
                    </div>
                </div>

                {/* Total */}
                <div className="glass p-5 border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <TrendingUp size={14} />
                        Total Geral
                    </div>
                    <div className="text-3xl font-black text-white">
                        {formatDuration(stats.totalMinutes)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {stats.totalSessions} sessões totais
                    </div>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="glass p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                    <BarChart3 size={16} />
                    Gráfico Semanal
                </h3>
                <div className="flex items-end justify-between gap-2 h-40">
                    {stats.weekData.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                            {/* Bar */}
                            <div className="w-full flex flex-col items-center justify-end h-28">
                                <div
                                    className={`w-full max-w-10 rounded-t-lg transition-all duration-500 ${day.isToday
                                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                        : day.minutes > 0
                                            ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                                            : 'bg-slate-700/50'
                                        }`}
                                    style={{
                                        height: `${Math.max((day.minutes / stats.maxDayMinutes) * 100, 5)}%`,
                                        minHeight: '8px'
                                    }}
                                />
                            </div>
                            {/* Time label */}
                            <div className={`text-[10px] font-mono ${day.minutes > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                {day.minutes > 0 ? formatDuration(day.minutes) : '-'}
                            </div>
                            {/* Day label */}
                            <div className={`text-xs font-bold ${day.isToday ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {day.day}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Today's Sessions */}
            <div className="glass p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Zap size={16} />
                    Sessões de Hoje ({stats.todaySessions.length})
                </h3>

                {stats.todaySessions.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {[...stats.todaySessions].reverse().map((session, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{getCategoryIcon(session.categoryId)}</span>
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {getCategoryName(session.categoryId)}
                                        </div>
                                        <div className="text-xs text-slate-500">
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
                    <div className="text-center py-8 text-slate-500">
                        <Clock size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma sessão hoje ainda</p>
                        <p className="text-xs mt-1">Use o Pomodoro para começar!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
