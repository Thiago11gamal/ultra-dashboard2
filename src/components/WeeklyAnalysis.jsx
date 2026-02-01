import React, { useMemo } from 'react';
import { Calendar, Clock, BookOpen, Trophy, Zap, ChevronRight, Activity } from 'lucide-react';

export default function WeeklyAnalysis({ studyLogs = [], categories = [] }) {

    const { groups } = useMemo(() => {
        if (!studyLogs || studyLogs.length === 0) return { groups: [], stats: null };

        // 1. Calculate Stats
        const totalMinutes = studyLogs.reduce((acc, log) => acc + log.minutes, 0);
        const totalSessions = studyLogs.length;

        // Find top category
        const catCounts = {};
        studyLogs.forEach(log => {
            const catId = log.categoryId;
            catCounts[catId] = (catCounts[catId] || 0) + log.minutes;
        });
        const topCatId = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];
        const topCategory = categories.find(c => c.id === topCatId)?.name || '-';

        // 2. Group by Date then by Category
        const sortedLogs = [...studyLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
        const grouped = {};

        sortedLogs.forEach(log => {
            const dateObj = new Date(log.date);
            const dateStr = dateObj.toLocaleDateString('pt-BR');

            // Determine friendly day label
            const now = new Date();
            const today = now.toLocaleDateString('pt-BR');
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const yesterday = y.toLocaleDateString('pt-BR');
            let dayLabel = dateStr;
            const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const weekDayName = weekDays[dateObj.getDay()];

            let isToday = false;
            let isYesterday = false;

            if (dateStr === today) {
                dayLabel = "Hoje";
                isToday = true;
            } else if (dateStr === yesterday) {
                dayLabel = "Ontem";
                isYesterday = true;
            } else {
                dayLabel = dateStr;
            }

            const uniqueDayKey = dateStr; // Use full date as key for sorting correctness

            if (!grouped[uniqueDayKey]) grouped[uniqueDayKey] = {
                label: dayLabel,
                subLabel: weekDayName,
                isToday,
                isYesterday,
                dateObj,
                categories: {}
            };

            // Category Grouping
            const category = categories.find(c => c.id === log.categoryId);
            const categoryId = log.categoryId;
            const categoryName = category ? category.name : 'Desconhecido';
            const categoryColor = category?.color || '#a855f7';

            if (!grouped[uniqueDayKey].categories[categoryId]) {
                grouped[uniqueDayKey].categories[categoryId] = {
                    id: categoryId,
                    name: categoryName,
                    color: categoryColor,
                    logs: [],
                    totalMinutes: 0
                };
            }

            let taskTitle = '-';
            if (category && log.taskId) {
                const task = category.tasks.find(t => t.id === log.taskId);
                if (task) taskTitle = task.title;
            }

            // Check if this task is already in the list for this day (Merge strategy)
            const targetGroup = grouped[uniqueDayKey].categories[categoryId];
            const existingLogIndex = targetGroup.logs.findIndex(l =>
                (log.taskId && l.taskId === log.taskId) || (!log.taskId && l.taskTitle === taskTitle)
            );

            if (existingLogIndex >= 0) {
                targetGroup.logs[existingLogIndex].minutes += log.minutes;
            } else {
                targetGroup.logs.push({
                    ...log,
                    timeStr: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    categoryName,
                    taskTitle,
                    categoryColor
                });
            }

            targetGroup.totalMinutes += log.minutes;
        });

        // Convert Objects to Arrays for rendering
        const finalGroups = Object.values(grouped).sort((a, b) => b.dateObj - a.dateObj).map((dayGroup) => {
            // Sort categories by Last Activity Time (Chronological)
            const cats = Object.values(dayGroup.categories).map(cat => ({
                ...cat,
                // Find latest log time for this category on this day
                lastLogTime: Math.max(...cat.logs.map(l => new Date(l.date).getTime()))
            })).sort((a, b) => b.lastLogTime - a.lastLogTime);

            const dayTotalMinutes = cats.reduce((acc, c) => acc + c.totalMinutes, 0);
            const dayTotalSessions = cats.reduce((acc, c) => acc + c.logs.length, 0);
            return {
                ...dayGroup,
                categories: cats,
                totalMinutes: dayTotalMinutes,
                totalSessions: dayTotalSessions
            };
        });

        return { groups: finalGroups, stats: { totalMinutes, totalSessions, topCategory } };
    }, [studyLogs, categories]);

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    if (!studyLogs || studyLogs.length === 0) {
        return (
            <div className="glass p-12 flex flex-col items-center justify-center text-slate-500 opacity-60 min-h-[400px]">
                <BookOpen size={64} className="mb-6 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-2">Diário Vazio</h3>
                <p>Complete seu primeiro Pomodoro para iniciar os registros.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2 px-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg shadow-purple-500/20">
                    <Activity className="text-white" size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Timeline de Estudos</h2>
                    <p className="text-sm text-slate-400">Diário detalhado das suas conquistas.</p>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="relative pl-12 space-y-12 before:content-[''] before:absolute before:left-8 before:top-4 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-slate-700 before:to-transparent">
                {groups.map((dayGroup, index) => (
                    <div key={dayGroup.label + index} className="relative z-10">
                        {/* Day Marker */}
                        <div className="absolute -left-[54px] top-0 flex flex-col items-center w-14">
                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-xl border-4 ${dayGroup.isToday
                                ? 'bg-purple-600 border-slate-900 text-white scale-110'
                                : 'bg-slate-800 border-slate-900 text-slate-400'
                                }`}>
                                <span className="text-[10px] font-bold uppercase">{dayGroup.subLabel.substring(0, 3)}</span>
                                <span className={`text-base font-black ${dayGroup.isToday ? 'text-white' : 'text-slate-200'}`}>
                                    {dayGroup.dateObj.getDate()}
                                </span>
                            </div>
                        </div>

                        {/* Day Content Card */}
                        <div className={`ml-8 glass rounded-2xl overflow-hidden transition-all hover:border-white/10 ${dayGroup.isToday ? 'border-purple-500/50 shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]' : ''
                            }`}>
                            {/* Card Header */}
                            <div className={`px-6 py-4 flex items-center justify-between ${dayGroup.isToday
                                ? 'bg-gradient-to-r from-purple-900/40 to-slate-900/40'
                                : 'bg-white/5'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <h3 className={`text-lg font-bold ${dayGroup.isToday ? 'text-purple-300' : 'text-slate-300'}`}>
                                        {dayGroup.label} {dayGroup.isToday ? '' : `de ${dayGroup.dateObj.toLocaleString('pt-BR', { month: 'long' })}`}
                                    </h3>
                                    {dayGroup.isToday && (
                                        <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                            HOJE
                                        </span>
                                    )}
                                </div>
                                <div className="font-mono text-white text-lg font-bold bg-black/30 px-3 py-1 rounded-lg border border-white/10">
                                    {formatTime(dayGroup.totalMinutes)}
                                </div>
                            </div>

                            {/* Categories List */}
                            <div className="p-2 space-y-2 bg-black/20">
                                {dayGroup.categories.map((cat, idx) => (
                                    <div key={idx} className="relative group overflow-hidden rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 transition-colors">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: cat.color }}></div>

                                        {/* Category Summary Row */}
                                        <div className="p-3 pl-5 flex items-center justify-between cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-inner bg-black/20" style={{ color: cat.color }}>
                                                    {/* We could lookup icon, but simplified for now */}
                                                    •
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                                                        {cat.name}
                                                        <span className="text-[10px] font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                            {cat.logs.length} {cat.logs.length === 1 ? 'tarefa' : 'tarefas'}
                                                        </span>
                                                    </h4>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold text-white text-sm">
                                                    {formatTime(cat.totalMinutes)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Task Details (Always Visible but subtle) */}
                                        <div className="px-5 pb-3 pt-0 space-y-1">
                                            {cat.logs.map((log, logIdx) => (
                                                <div key={logIdx} className="flex items-center justify-between text-xs py-1.5 border-t border-white/5 text-slate-400 hover:text-slate-300 transition-colors">
                                                    <div className="flex items-center gap-2 truncate pr-4">
                                                        <Zap size={10} className="text-slate-600" />
                                                        <span className="truncate" title={log.taskTitle}>{log.taskTitle}</span>
                                                    </div>
                                                    <span className="font-mono whitespace-nowrap opacity-60">+{log.minutes}m</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
