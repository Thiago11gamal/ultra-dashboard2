import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { normalizeDate } from '../utils/dateHelper';

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
            // PERFORMANCE-02: Use centralized normalizeDate to avoid timezone drift
            const rawDate = normalizeDate(log.date);
            if (!rawDate) return;
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

        const h = Math.floor(totalMinutes / 60);
        const m = Math.round(totalMinutes % 60);
        const totalTimeStr = `${h}h${m > 0 ? ` ${m}m` : ''}`;

        return { weeks, totalDays, studiedDays, totalMinutes, totalTimeStr };
    }, [currentMonth, studyLogs]);

    const levelColors = [
        'bg-slate-800/40 border-white/5', // 0 - No study
        'bg-emerald-900/40 border-emerald-800/50', // 1 - < 30 min
        'bg-emerald-600/50 border-emerald-500/50', // 2 - 30-60 min
        'bg-emerald-500/80 border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]', // 3 - 60-120 min
        'bg-emerald-400 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)] font-bold text-emerald-900', // 4 - > 120 min
    ];

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Visão Mensal
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMonthOffset(m => m - 1)}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-base font-black text-white min-w-[120px] text-center capitalize tracking-tight">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button
                        onClick={() => setMonthOffset(m => Math.min(0, m + 1))}
                        disabled={monthOffset >= 0}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Week Day Labels */}
            <div className="grid grid-cols-7 gap-2 mb-3">
                {weekDays.map(day => (
                    <div key={day} className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
                {calendarData.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-2">
                        {week.map((day, dayIndex) => (
                            <div
                                key={dayIndex}
                                className={`
                                    w-full aspect-square rounded-xl md:rounded-2xl border transition-all duration-300 cursor-default group relative
                                    ${day ? levelColors[day.level] : 'bg-transparent border-transparent'}
                                    ${day?.isToday ? 'ring-2 ring-emerald-500 z-10' : ''}
                                    ${day ? 'hover:scale-110 hover:z-20 hover:border-white/50' : ''}
                                `}
                            >
                                {/* Tooltip Premium com Enquadramento Dinâmico */}
                                {day && (
                                    <div className={`absolute bottom-full mb-3 px-4 py-3 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl text-center whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 transform translate-y-2 group-hover:translate-y-0 ${dayIndex === 0 ? 'left-[-10px]' : dayIndex === 6 ? 'right-[-10px]' : 'left-1/2 -translate-x-1/2'
                                        }`}>
                                        <div className={`absolute -bottom-2 w-4 h-4 bg-slate-900 border-b border-r border-white/10 rotate-45 ${dayIndex === 0 ? 'left-6' : dayIndex === 6 ? 'right-6' : 'left-1/2 -translate-x-1/2'
                                            }`}></div>
                                        <p className="relative z-10 text-[10px] text-slate-400 font-bold capitalize mb-1 tracking-widest">{format(day.date, "dd 'de' MMMM (EEEE)", { locale: ptBR })}</p>
                                        <p className="relative z-10 text-sm font-black text-white">
                                            {day.minutes > 0
                                                ? (day.minutes >= 60 ? <span className="text-emerald-400">{Math.floor(day.minutes / 60)}h {day.minutes % 60 > 0 ? `${Math.round(day.minutes % 60)}m` : ''}</span> : <span className="text-emerald-400">{Math.round(day.minutes)} min</span>)
                                                : 'Descanso'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Legend & Stats */}
            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Legend */}
                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Menos</span>
                    <div className="flex gap-1.5 mx-2">
                        {levelColors.map((color, i) => (
                            <div key={i} className={`w-4 h-4 rounded-md border ${color.split(' ')[0]} ${color.split(' ')[1]}`} />
                        ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mais</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 bg-slate-900/50 px-5 py-2.5 rounded-2xl border border-white/5">
                    <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Dias Ativos</div>
                        <div className="text-sm text-slate-300"><span className="text-emerald-400 font-black">{calendarData.studiedDays}</span> / {calendarData.totalDays}</div>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Tempo Total</div>
                        <div className="text-sm text-white font-black">{calendarData.totalTimeStr}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
