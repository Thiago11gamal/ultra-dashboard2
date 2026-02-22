import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ActivityHeatmap({ studyLogs = [] }) {
    const [monthOffset, setMonthOffset] = React.useState(0);

    const currentMonth = useMemo(() => {
        const base = new Date();
        return monthOffset < 0 ? subMonths(base, Math.abs(monthOffset)) :
            monthOffset > 0 ? addMonths(base, monthOffset) : base;
    }, [monthOffset]);

    // Generate calendar data
    const calendarData = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });

        // Create a map of date -> minutes studied
        const studyMap = {};
        studyLogs.forEach(log => {
            // BUG FIX: ISO date strings without time (e.g. "2024-01-15") are parsed as UTC midnight,
            // which shifts the day by -N hours in negative UTC timezones (e.g. Brazil -3 → shows prev day).
            // Appending T12:00:00 forces local noon parsing, preventing off-by-one-day errors.
            const rawDate = typeof log.date === 'string' && log.date.length === 10
                ? new Date(`${log.date}T12:00:00`)
                : new Date(log.date);
            const dateKey = format(rawDate, 'yyyy-MM-dd');
            studyMap[dateKey] = (studyMap[dateKey] || 0) + (log.minutes || 0);
        });

        // Build week rows
        const weeks = [];
        let currentWeek = [];

        // Add empty cells for days before month starts
        const startDay = getDay(start); // 0 = Sunday
        for (let i = 0; i < startDay; i++) {
            currentWeek.push(null);
        }

        const today = format(new Date(), 'yyyy-MM-dd');

        days.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const minutes = studyMap[dateKey] || 0;

            currentWeek.push({
                date: day,
                dateKey,
                minutes,
                isToday: dateKey === today,
                level: minutes === 0 ? 0 :
                    minutes < 30 ? 1 :
                        minutes < 60 ? 2 :
                            minutes < 120 ? 3 : 4
            });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        // Add remaining days
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        // Stats — filter to current month only
        const totalDays = days.length;
        const monthKeys = new Set(days.map(day => format(day, 'yyyy-MM-dd')));
        const studiedDays = days.filter(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            return studyMap[dateKey] > 0;
        }).length;
        const totalMinutes = Object.entries(studyMap)
            .filter(([key]) => monthKeys.has(key))
            .reduce((acc, [, mins]) => acc + mins, 0);

        return { weeks, totalDays, studiedDays, totalMinutes };
    }, [currentMonth, studyLogs]);

    const levelColors = [
        'bg-slate-800 border-slate-700', // 0 - No study
        'bg-green-900/50 border-green-800', // 1 - < 30 min
        'bg-green-700/60 border-green-600', // 2 - 30-60 min
        'bg-green-500/70 border-green-400', // 3 - 60-120 min
        'bg-green-400 border-green-300 shadow-[0_0_8px_rgba(74,222,128,0.5)]', // 4 - > 120 min
    ];

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="max-w-sm">
            {/* Month Navigation */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <button
                    onClick={() => setMonthOffset(m => m - 1)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-white min-w-[100px] text-center capitalize">
                    {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
                </span>
                <button
                    onClick={() => setMonthOffset(m => m + 1)}
                    disabled={monthOffset >= 0}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Week Day Labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
                {calendarData.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                        {week.map((day, dayIndex) => (
                            <div
                                key={dayIndex}
                                className={`
                                    aspect-square rounded-sm border transition-all cursor-default group relative
                                    ${day ? levelColors[day.level] : 'bg-transparent border-transparent'}
                                    ${day?.isToday ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-900' : ''}
                                `}
                                title={day ? `${format(day.date, 'dd/MM')}: ${day.minutes} min` : ''}
                            >
                                {/* Tooltip */}
                                {day && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                                        {format(day.date, 'dd/MM')} • {day.minutes > 0 ? `${day.minutes} min` : 'Não estudou'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Legend & Stats */}
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                {/* Legend */}
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>Menos</span>
                    {levelColors.map((color, i) => (
                        <div key={i} className={`w-3 h-3 rounded-sm border ${color}`} />
                    ))}
                    <span>Mais</span>
                </div>

                {/* Stats */}
                <div className="text-xs text-slate-400">
                    <span className="text-green-400 font-bold">{calendarData.studiedDays}</span>/{calendarData.totalDays} dias
                    <span className="mx-2">•</span>
                    <span className="text-white font-bold">{Math.round(calendarData.totalMinutes / 60)}h</span> total
                </div>
            </div>
        </div>
    );
}
