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

// Formatação estática de mês para evitar recriação no loop de dias
const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    month: 'long'
});

// ✅ FIX: movido para escopo do módulo — era recriado a cada render
const formatTime = (minutes) => {
    return formatDuration(minutes / 60);
};

export default function WeeklyAnalysis({ studyLogs = [], categories = [], dayTick }) {
    const logsArray = useMemo(() => Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {}), [studyLogs]);
    const categoriesArray = useMemo(() => {
        const list = Array.isArray(categories) ? categories : Object.values(categories || {});
        return list.filter(Boolean).map(c => {
            const tasks = Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {});
            return {
                ...c,
                tasks: tasks.filter(Boolean)
            };
        });
    }, [categories]);

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
        // FIX Bug 5: Revisões de flashcard não contam como horas de estudo (alinhado com analytics.js e chartDataMappers.js)
        // Sanitização contra timer runaway: teto de 720 min (12h) por sessão, alinhado com chartDataMappers.js
        const getLogMinutes = (log) => {
            if (!log || log.type === 'flashcard') return 0;
            const minutes = Number(log?.minutes);
            const duration = Number(log?.duration);

            if (Number.isFinite(minutes) && minutes > 0) return Math.min(720, minutes);
            if (Number.isFinite(duration) && duration > 0) return Math.min(720, duration);

            return 0;
        };

        // T-037 FIX: Indexar categorias por ID e por Nome (com normalização de casing/espaços) para lookup O(1).
        const categoriesById = new Map();
        const categoriesByName = new Map();

        categoriesArray.forEach(c => {
            if (c?.id != null) {
                categoriesById.set(String(c.id), c);
            }
            if (c?.name != null) {
                categoriesByName.set(c.name, c);
                categoriesByName.set(String(c.name).trim().toLowerCase(), c);
            }
        });

        // Pre-indexar tarefas de cada categoria para evitar getTasksArray e .find repetidos em cada log
        const tasksByCatAndId = new Map();
        categoriesArray.forEach(c => {
            if (c) {
                const tasksArray = getTasksArray(c);
                const taskMap = new Map();
                tasksArray.forEach(t => {
                    if (t?.id != null) {
                        taskMap.set(String(t.id), t);
                    }
                });
                tasksByCatAndId.set(c, taskMap);
            }
        });

        const findCategoryForLog = (log) => {
            if (!log) return undefined;

            if (log.categoryId != null) {
                const byId = categoriesById.get(String(log.categoryId));
                if (byId) return byId;
            }

            if (log.subject) {
                const bySubject = categoriesByName.get(log.subject) || categoriesByName.get(String(log.subject).trim().toLowerCase());
                if (bySubject) return bySubject;
            }

            if (log.categoryName) {
                const byCatName = categoriesByName.get(log.categoryName) || categoriesByName.get(String(log.categoryName).trim().toLowerCase());
                if (byCatName) return byCatName;
            }

            return undefined;
        };

        // Mapeador canônico para disciplinas sem cadastro (evita duplicar cards por diferenças de maiúsculas/espaços)
        const canonicalCategoryNames = new Map();
        const resolveCategoryInfo = (log) => {
            const category = findCategoryForLog(log);
            if (category) {
                return {
                    category,
                    id: category.id,
                    name: category.name,
                    color: category.color || '#a855f7'
                };
            }
            const rawName = String(log?.categoryName || log?.subject || 'Outros').trim();
            const lower = rawName.toLowerCase();
            let name;
            if (canonicalCategoryNames.has(lower)) {
                name = canonicalCategoryNames.get(lower);
            } else {
                canonicalCategoryNames.set(lower, rawName);
                name = rawName;
            }
            const id = log?.categoryId != null ? String(log.categoryId) : `raw:${lower}`;
            return {
                category: undefined,
                id,
                name,
                color: '#a855f7'
            };
        };

        // Filtrar apenas logs com tempo positivo e data válida para alinhar KPIs do cabeçalho com a timeline
        const validStudyLogs = logsArray.filter(log => {
            if (getLogMinutes(log) <= 0) return false;
            const d = normalizeDate(log?.date);
            return d !== null && !Number.isNaN(d.getTime());
        });
        const totalMinutes = validStudyLogs.reduce((acc, log) => acc + getLogMinutes(log), 0);
        const totalSessions = validStudyLogs.length;

        // Find top category
        const catCounts = {};
        validStudyLogs.forEach(log => {
            const catInfo = resolveCategoryInfo(log);
            catCounts[catInfo.name] = (catCounts[catInfo.name] || 0) + getLogMinutes(log);
        });
        const sortedCats = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
        const topCategory = totalMinutes > 0 ? (sortedCats[0] || '-') : '-';

        // 2. Group by Date then by Category
        // FIX: Precomputar dateObj e time para evitar normalizeDate redundante dentro do sort e loop
        const logsWithTime = [];
        for (let i = 0; i < validStudyLogs.length; i++) {
            const log = validStudyLogs[i];
            const dateObj = normalizeDate(log?.date);
            const time = (dateObj && !Number.isNaN(dateObj.getTime())) ? dateObj.getTime() : 0;
            logsWithTime.push({ log, dateObj, time });
        }
        logsWithTime.sort((a, b) => b.time - a.time);

        const grouped = {};

        logsWithTime.forEach(({ log, dateObj, time: logTime }) => {
            if (!dateObj || !Number.isFinite(logTime)) return;
            const logMinutes = getLogMinutes(log);
            if (logMinutes <= 0) return;

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
            const catInfo = resolveCategoryInfo(log);
            const category = catInfo.category;
            const categoryId = catInfo.id;
            const categoryName = catInfo.name;
            const categoryColor = catInfo.color;

            if (!grouped[uniqueDayKey].categories[categoryId]) {
                grouped[uniqueDayKey].categories[categoryId] = {
                    id: categoryId,
                    name: categoryName,
                    color: categoryColor,
                    logs: [],
                    logMap: new Map(),
                    totalMinutes: 0
                };
            }

            const getCleanTitle = (val) => (val && typeof val === 'string' && val.trim() !== '-' && val.trim() !== '' ? val.trim() : null);
            let rawTitle = null;
            if (category && log.taskId) {
                const taskMap = tasksByCatAndId.get(category);
                const task = taskMap?.get(String(log.taskId));
                if (task) {
                    rawTitle = getCleanTitle(task.text) || getCleanTitle(task.title);
                }
            }
            const taskTitle = rawTitle || getCleanTitle(log.taskTitle) || getCleanTitle(log.task) || getCleanTitle(log.title) || getCleanTitle(log.taskName) || 'Sessão de Estudo';

            // Check if this task is already in the list for this day (Merge strategy com Map O(1))
            const targetGroup = grouped[uniqueDayKey].categories[categoryId];
            const mergeKey = log.taskId ? `id:${String(log.taskId)}` : `title:${taskTitle}`;
            const existingLog = targetGroup.logMap.get(mergeKey);

            if (existingLog) {
                existingLog.minutes += logMinutes;
                const prevTime = existingLog.time ?? 0;
                const newTime = logTime;
                if (newTime > prevTime) {
                    existingLog.date = log.date;
                    existingLog.time = newTime;
                }
            } else {
                const newEntry = {
                    id: log.id,
                    taskId: log.taskId,
                    taskTitle,
                    minutes: logMinutes,
                    date: log.date,
                    time: logTime
                };
                targetGroup.logMap.set(mergeKey, newEntry);
                targetGroup.logs.push(newEntry);
            }

            targetGroup.totalMinutes += logMinutes;
        });

        // Convert Objects to Arrays for rendering
        const finalGroups = Object.values(grouped).sort((a, b) => (b.dateObj?.getTime?.() ?? 0) - (a.dateObj?.getTime?.() ?? 0)).map((dayGroup) => {
            // Sort categories by Last Activity Time (Chronological)
            const cats = Object.values(dayGroup.categories).map(cat => ({
                ...cat,
                // T-038 FIX: reduce evita estourar stack com arrays grandes
                lastLogTime: cat.logs.reduce((max, l) => {
                    const t = l.time ?? (normalizeDate(l.date)?.getTime() ?? 0);
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
    }, [logsArray, categoriesArray, dayTick]);

    // formatTime movido para escopo do módulo (performance)

    if (!logsArray || logsArray.length === 0 || groups.length === 0) {
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
                {(() => { const currentYear = new Date().getFullYear(); return groups.map((dayGroup, idx) => {
                    const monthName = monthFormatter.format(dayGroup.dateObj);
                    const logYear = dayGroup.dateObj?.getFullYear?.();
                    const yearSuffix = (logYear && logYear !== currentYear) ? ` de ${logYear}` : '';
                    const displayTitle = dayGroup.isToday
                        ? `Hoje, ${dayGroup.manausDayStr} de ${monthName}`
                        : dayGroup.isYesterday
                            ? `Ontem, ${dayGroup.manausDayStr} de ${monthName}`
                            : `${dayGroup.manausDayStr} de ${monthName}${yearSuffix}`;

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
                                                    <span className="font-mono whitespace-nowrap opacity-60">
                                                        +{Math.round(log.minutes) >= 60 ? formatTime(log.minutes) : `${Math.round(log.minutes)}m`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }); })()}
            </div>
        </div>
    );
}

