# src\components\WeeklyAnalysis.jsx

```jsx
import React, { useMemo } from 'react';
import { BookOpen, Zap, Calendar, Clock, CheckCircle2 } from 'lucide-react'; // ✅ LOTE-04: Activity removido (não usado)
import { normalizeDate, formatDuration, getDateKey, formatDatePtBR, APP_TIMEZONE } from '../utils/dateHelper';

// ✅ LOTE-04 FIX: movido para o escopo do módulo — antes era recriado a cada render
// T-021 FIX: tasks podem ser arrays ou objetos no Firebase.
const getTasksArray = (category) => {
    if (!category?.tasks) return [];
    return Array.isArray(category.tasks)
        ? category.tasks
        : Object.values(category.tasks || {});
};

export default function WeeklyAnalysis({ studyLogs = [], categories = [] }) {
    const logsArray = useMemo(() => Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {}), [studyLogs]);
    const categoriesArray = useMemo(() => Array.isArray(categories) ? categories : Object.values(categories || {}), [categories]);

    const { groups, stats } = useMemo(() => {
        if (!logsArray || logsArray.length === 0) return { groups: [], stats: null };

        // Criar formatadores UMA vez, fora do loop
        const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: APP_TIMEZONE,
            weekday: 'long'
        });
        const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: APP_TIMEZONE,
            day: 'numeric'
        });
        const now = new Date();
        const todayKey = getDateKey(now);
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yesterdayKey = getDateKey(y);

        // T-029 FIX: Se minutes vier 0, mas duration existir, usa duration.
        const getLogMinutes = (log) => {
            const minutes = Number(log?.minutes);
            const duration = Number(log?.duration);

            if (Number.isFinite(minutes) && minutes > 0) return minutes;
            if (Number.isFinite(duration) && duration > 0) return duration;

            return 0;
        };

        // T-037 FIX: Indexar categorias por ID para lookup O(1).
        // Antes, cada log fazia .find() em categoriesArray, gerando O(logs * categories).
        const categoriesById = new Map();

        categoriesArray.forEach(c => {
            if (c?.id != null) {
                categoriesById.set(String(c.id), c);
            }
        });

        const findCategoryForLog = (log) => {
            if (!log) return undefined;

            if (log.categoryId != null) {
                const byId = categoriesById.get(String(log.categoryId));
                if (byId) return byId;
            }

            return categoriesArray.find(c =>
                (log.subject && c.name === log.subject) ||
                (log.categoryName && c.name === log.categoryName)
            );
        };

        const totalMinutes = logsArray.reduce((acc, log) => acc + getLogMinutes(log), 0);
        const totalSessions = logsArray.length;

        // Find top category
        const catCounts = {};
        logsArray.forEach(log => {
            // T-037 FIX: lookup indexado
            const category = findCategoryForLog(log);
            const catName = category ? category.name : (log.categoryName || log.subject || 'Outros');
            catCounts[catName] = (catCounts[catName] || 0) + getLogMinutes(log);
        });
        const topCategory = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] || '-';

        // 2. Group by Date then by Category
        // FIX: Usar normalizeDate para evitar shift de UTC midnight em datas YYYY-MM-DD
        const sortedLogs = [...logsArray].sort((a, b) => (normalizeDate(b.date)?.getTime() ?? 0) - (normalizeDate(a.date)?.getTime() ?? 0));
        const grouped = {};

        sortedLogs.forEach(log => {
            const dateObj = normalizeDate(log.date);
            
            if (!dateObj || Number.isNaN(dateObj.getTime())) return;
            const dateStr = formatDatePtBR(dateObj);

            // T-024 FIX: usar chave de dia (getDateKey) em vez de comparar strings formatadas.
            // Isso reduz divergência de timezone perto da meia-noite.
            const uniqueDayKey = getDateKey(dateObj) || dateStr;

            let dayLabel = dateStr;
            const rawWeekday = weekdayFormatter.format(dateObj);
            const weekDayName = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1).split('-')[0];

            let isToday = false;
            let isYesterday = false;

            if (uniqueDayKey === todayKey) {
                dayLabel = "Hoje";
                isToday = true;
            } else if (uniqueDayKey === yesterdayKey) {
                dayLabel = "Ontem";
                isYesterday = true;
            } else {
                dayLabel = dateStr;
            }
            const manausDayStr = dayFormatter.format(dateObj);

            if (!grouped[uniqueDayKey]) grouped[uniqueDayKey] = {
                uniqueDayKey,
                label: dayLabel,
                subLabel: weekDayName,
                manausDayStr,
                isToday,
                isYesterday,
                dateObj,
                categories: {}
            };

            // Category Grouping
            // T-037 FIX: lookup indexado
            const category = findCategoryForLog(log);
            const categoryId = category ? category.id : (log.categoryId || log.categoryName || log.subject || 'unknown');
            const categoryName = category ? category.name : (log.categoryName || log.subject || 'Desconhecido');
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
                // T-021 FIX: normalizar tasks antes do find
                const tasksArray = getTasksArray(category);
                const task = tasksArray.find(t => String(t?.id) === String(log.taskId));

                // Bug fix: data model stores task.text, not task.title
                if (task) taskTitle = task.text || task.title || '-';
            }

            // Check if this task is already in the list for this day (Merge strategy)
            const targetGroup = grouped[uniqueDayKey].categories[categoryId];
            const existingLogIndex = targetGroup.logs.findIndex(l =>
                (log.taskId && String(l.taskId) === String(log.taskId)) || (!log.taskId && l.taskTitle === taskTitle)
            );

            if (existingLogIndex >= 0) {
                targetGroup.logs[existingLogIndex].minutes += getLogMinutes(log);
                const prevTime = normalizeDate(targetGroup.logs[existingLogIndex].date)?.getTime() ?? 0;
                const newTime = normalizeDate(log.date)?.getTime() ?? 0;
                if (newTime > prevTime) {
                    targetGroup.logs[existingLogIndex].date = log.date;
                }
            } else {
                targetGroup.logs.push({
                    id: log.id,
                    taskId: log.taskId,
                    taskTitle,
                    minutes: getLogMinutes(log),
                    date: log.date
                });
            }

            targetGroup.totalMinutes += getLogMinutes(log);
        });

        // Convert Objects to Arrays for rendering
        const finalGroups = Object.values(grouped).sort((a, b) => (b.dateObj?.getTime?.() ?? 0) - (a.dateObj?.getTime?.() ?? 0)).map((dayGroup) => {
            // Sort categories by Last Activity Time (Chronological)
            const cats = Object.values(dayGroup.categories).map(cat => ({
                ...cat,
                // T-038 FIX: reduce evita estourar stack com arrays grandes
                lastLogTime: cat.logs.reduce((max, l) => {
                    const t = normalizeDate(l.date)?.getTime() ?? 0;
                    return Math.max(max, t);
                }, 0)
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

        return {
            groups: finalGroups,
            stats: {
                totalDays: finalGroups.length,
                totalMinutes,
                totalSessions,
                topCategory
            }
        };
    }, [logsArray, categoriesArray]);

    const formatTime = (minutes) => {
        return formatDuration(minutes / 60);
    };

    if (!logsArray || logsArray.length === 0) {
        return (
            <div className="glass p-12 flex flex-col items-center justify-center text-slate-500 opacity-60 min-h-[400px]">
                <BookOpen size={64} className="mb-6 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-2">Diário Vazio</h3>
                <p>Complete seu primeiro Pomodoro para iniciar os registros.</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-black/80 border border-white/5 shadow-2xl animate-fade-in-up">
            {/* Header with Stats Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Calendar size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            Linha do Tempo de Estudos
                        </h3>
                        <p className="text-xs text-slate-400">Histórico dia a dia de sessões e tarefas concluídas</p>
                    </div>
                </div>

                {/* Micro KPIs */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-200">{formatTime(stats.totalMinutes)}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-200">{stats.totalSessions} blocos</span>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="relative pl-12 sm:pl-20 space-y-12 before:content-[''] before:absolute before:left-[14px] sm:before:left-[34px] before:top-4 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-slate-700 before:to-transparent">
                {groups.map((dayGroup, idx) => {
                    const monthName = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, month: 'long' }).format(dayGroup.dateObj);
                    const displayTitle = dayGroup.isToday ? "Hoje" : dayGroup.isYesterday ? "Ontem" : `${dayGroup.manausDayStr} de ${monthName}`;

                    return (
                    <div key={dayGroup.uniqueDayKey || dayGroup.dateObj?.toISOString?.() || `day-${idx}`} className="relative z-10">
                        {/* Day Marker */}
                        <div className="absolute -left-[47px] sm:-left-[73px] top-0 flex flex-col items-center w-7 sm:w-14">
                            <div className={`w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex flex-col items-center justify-center shadow-xl border-2 sm:border-4 ${dayGroup.isToday
                                ? 'bg-purple-600 border-slate-900 text-white scale-110'
                                : 'bg-slate-800 border-slate-900 text-slate-400'
                                }`}>
                                <span className="text-[7px] sm:text-[10px] font-bold uppercase">{dayGroup.subLabel.substring(0, 3)}</span>
                                <span className={`text-[10px] sm:text-base font-black ${dayGroup.isToday ? 'text-white' : 'text-slate-200'}`}>
                                     {dayGroup.manausDayStr}
                                 </span>
                            </div>
                        </div>

                        {/* Day Content Card */}
                        <div className={`ml-2 sm:ml-8 glass rounded-2xl transition-all hover:border-white/10 ${dayGroup.isToday ? 'border-purple-500/50 shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]' : ''
                            }`}>
                            {/* Card Header */}
                            <div className={`px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${dayGroup.isToday
                                ? 'bg-gradient-to-r from-purple-900/40 to-slate-900/40'
                                : 'bg-white/5'
                                }`}>
                                <div className="flex items-center gap-3 justify-start">
                                    <h3 className={`text-lg font-bold ${dayGroup.isToday ? 'text-purple-300' : 'text-slate-300'}`}>
                                        {displayTitle}
                                    </h3>
                                    {dayGroup.isToday && (
                                        <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                            HOJE
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-start sm:justify-center">
                                    <div className="font-mono text-white text-sm sm:text-lg font-bold bg-black/30 px-4 sm:px-6 py-1 min-w-[80px] sm:min-w-[100px] text-center rounded-lg border border-white/10">
                                        {formatTime(dayGroup.totalMinutes)}
                                    </div>
                                </div>
                                <div></div>
                            </div>

                            {/* Categories List */}
                            <div className="p-2 space-y-2 bg-black/20">
                                {dayGroup.categories.map((cat) => (
                                    <div key={cat.id} className="relative group rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 transition-colors">
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
                                                <div key={`${log.taskId || 'log'}-${logIdx}`} className="flex items-center justify-between text-xs py-1.5 border-t border-white/5 text-slate-400 hover:text-slate-300 transition-colors">
                                                    <div className="flex items-center gap-2 pr-4 min-w-0">
                                                        <Zap size={10} className="text-slate-600" />
                                                        <span className="break-words line-clamp-2 text-xs sm:text-sm" title={log.taskTitle}>{log.taskTitle}</span>
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
                );
            })}
            </div>
        </div>
    );
}


```
