import { getXPProgress } from './gamification.js';
import { normalizeDate } from './dateHelper.js';
// Internal helper for locale-neutral date comparison (YYYY-MM-DD in local time)
const toISODay = (date) => {
    const d = typeof date === 'string' && date.length === 10 ? new Date(`${date}T12:00:00`) : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
};



/**
 * Distributes a rounding remainder across items based on their decimal parts.
 * Uses the "Largest Remainder Method" to ensure percentages sum to exactly 100%.
 */
const distributeRoundingRemainder = (items, targetSum = 100) => {
    if (!items.length) return items;

    // 1. Calculate floor percentages and track remainders
    const withRemainders = items.map(item => {
        const value = item.rawPercentage || 0;
        const floor = Math.floor(value);
        return {
            ...item,
            percentage: floor,
            remainder: value - floor
        };
    });

    const currentSum = withRemainders.reduce((sum, item) => sum + item.percentage, 0);
    const diff = targetSum - currentSum;

    if (diff > 0) {
        // 2. Sort by remainder descending and pick the top 'diff' items to increment
        withRemainders
            .sort((a, b) => b.remainder - a.remainder)
            .slice(0, diff)
            .forEach(item => {
                item.percentage += 1;
            });
    }

    return withRemainders;
};

export const calculateStudyStreak = (studyLogs) => {
    if (!studyLogs || studyLogs.length === 0) {
        return { current: 0, best: 0, longest: 0, isActive: false };
    }

    // Agrupar por dia único usando YYYY-MM-DD local
    const daySet = new Set(
        studyLogs.map(log => toISODay(log.date)).filter(Boolean)
    );
    const uniqueDays = Array.from(daySet).sort((a, b) =>
        new Date(b) - new Date(a)
    );

    const today = toISODay(new Date());
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = toISODay(yesterdayObj);

    // 1. Determine start date (Today or Yesterday)
    let streak = 0;
    const hasToday = uniqueDays.includes(today);
    const hasYesterday = uniqueDays.includes(yesterday);

    if (!hasToday && !hasYesterday) {
        const longest = calculateLongest(uniqueDays);
        return { current: 0, best: longest, longest, isActive: false };
    }

    // Calculate current streak
    let dateCursor = new Date();
    if (!hasToday) dateCursor.setDate(dateCursor.getDate() - 1); // Start from yesterday

    // Now count backwards
    const maxDays = uniqueDays.length;
    for (let i = 0; i < maxDays; i++) { // Adaptive safety cap based on unique history length
        const dString = toISODay(dateCursor);
        if (uniqueDays.includes(dString)) {
            streak++;
            dateCursor.setDate(dateCursor.getDate() - 1);
        } else {
            break;
        }
    }

    const longest = calculateLongest(uniqueDays);
    return {
        current: streak,
        best: longest, // BUG-L6: Unified alias for store compatibility
        longest: longest,
        isActive: hasToday || hasYesterday
    };
};

const calculateLongest = (uniqueDays) => {
    if (!uniqueDays || uniqueDays.length === 0) return 0;
    let longest = 1;
    let current = 1;
    // uniqueDays está ordenado DECRESCENTE — iteramos do mais recente ao mais antigo
    for (let i = 1; i < uniqueDays.length; i++) {
        const dCurrent = new Date(`${uniqueDays[i]}T12:00:00`);
        const dPrev = new Date(`${uniqueDays[i - 1]}T12:00:00`);
        const diff = Math.round((dPrev - dCurrent) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
            current++;
            longest = Math.max(longest, current);
        } else {
            current = 1;
        }
    }
    return longest;
};

export const analyzeSubjectBalance = (categories) => {
    const totalMinutes = categories.reduce((sum, c) => sum + (c.totalMinutes || 0), 0);

    if (totalMinutes === 0) {
        return {
            status: 'sem_dados',
            message: 'Comece a estudar para ver análise',
            distribution: [],
            alerts: []
        };
    }

    // Distribution with Rounding Protection (B-05 FIX)
    let distribution = categories.map(c => {
        const rawPercentage = totalMinutes > 0 ? ((c.totalMinutes || 0) / totalMinutes) * 100 : 0;
        return {
            subject: c.name,
            minutes: c.totalMinutes || 0,
            rawPercentage,
            // Bug fix: optional chaining — categories without tasks array crash here
            tasks: (c.tasks || []).length,
            completed: (c.tasks || []).filter(t => t.completed).length
        };
    });

    // Apply Largest Remainder Method
    distribution = distributeRoundingRemainder(distribution)
        .sort((a, b) => b.minutes - a.minutes);

    // Detectar problemas
    const maxPercentage = distribution[0]?.percentage || 0;
    let status = 'excelente';
    let message = 'Distribuição equilibrada entre matérias';
    let alerts = [];

    if (maxPercentage > 70) {
        status = 'alerta';
        message = 'Muito foco em uma matéria! Diversifique seus estudos.';
        alerts.push({
            type: 'overload',
            subject: distribution[0].subject,
            percentage: maxPercentage
        });
    } else if (maxPercentage > 50) {
        status = 'atencao';
        message = 'Considere balancear melhor o tempo entre matérias';
    }

    // Detectar matérias negligenciadas (< 5% do tempo mas tem tarefas)
    const neglected = distribution.filter(d => d.percentage < 5 && d.tasks > 0);
    if (neglected.length > 0) {
        alerts.push({
            type: 'neglected',
            subjects: neglected.map(n => n.subject)
        });
    }

    return {
        status,
        message,
        distribution,
        alerts,
        metrics: {
            mostStudied: distribution[0]?.subject,
            leastStudied: distribution[distribution.length - 1]?.subject,
            totalSubjects: categories.length,
            activeSubjects: distribution.filter(d => d.minutes > 0).length
        }
    };
};

export const analyzeEfficiency = (categories, studyLogs = []) => {
    const totalMinutes = studyLogs.length > 0
        ? studyLogs.reduce((sum, l) => sum + (Number(l.minutes) || 0), 0)
        : categories.reduce((sum, c) => sum + (c.totalMinutes || 0), 0);
    // Bug fix: optional chaining on c.tasks throughout to avoid crash if tasks is undefined
    const totalTasks = categories.reduce((sum, c) => sum + (c.tasks || []).length, 0);
    const completedTasks = categories.reduce((sum, c) =>
        sum + (c.tasks || []).filter(t => t.completed).length, 0
    );

    if (totalMinutes === 0 && completedTasks === 0) {
        return {
            status: 'sem_dados',
            message: 'Complete algumas tarefas para análise',
            score: 0,
            metrics: {},
            recommendations: []
        };
    }

    if (totalMinutes > 0 && completedTasks === 0) {
        return {
            efficiency: 'precisa_melhorar',
            score: 40,
            message: 'Lembre-se de marcar as tarefas concluídas!',
            metrics: { minutesPerTask: 0, completionRate: 0, tasksPerHour: 0, highPriorityRate: 0, totalStudied: totalMinutes, totalCompleted: 0 },
            recommendations: [{ type: 'goal_setting', message: 'Lembre-se de marcar as tarefas concluídas!', priority: 'high' }]
        };
    }

    // Tempo médio por tarefa concluída
    const minutesPerTask = totalMinutes / completedTasks;

    // Classificação de eficiência
    // AUDIT-FIX: Interpolação contínua em vez de 4 buckets discretos (50/70/85/100).
    // Mapeamento: 0 min/task → 100%, 90+ min/task → 50%. Suave e intuitivo.
    // FIX LÓGICO: Substituição pela fórmula de decaimento exponencial.
    // Assim, uma tarefa de 4 horas não recebe o mesmo score punitivo que uma de 1.5 horas.
    const score = Math.max(10, Math.min(100, Math.round(100 * Math.exp(-minutesPerTask / 360))));

    let efficiency = 'excelente';
    if (score < 60) efficiency = 'precisa_melhorar';
    else if (score < 75) efficiency = 'regular';
    else if (score < 90) efficiency = 'boa';

    // Taxa de conclusão geral
    const completionRate = Math.round((completedTasks / totalTasks) * 100);

    // Produtividade (tarefas por hora)
    const tasksPerHour = totalMinutes > 0 ?
        (completedTasks / (totalMinutes / 60)).toFixed(1) : 0;

    // Análise de tarefas de alta prioridade
    const highPriorityTasks = categories.flatMap(c =>
        (c.tasks || []).filter(t => t.priority === 'high')
    );
    const highPriorityCompleted = highPriorityTasks.filter(t => t.completed).length;
    const highPriorityRate = highPriorityTasks.length > 0 ?
        Math.round((highPriorityCompleted / highPriorityTasks.length) * 100) : 100;

    return {
        efficiency,
        score,
        metrics: {
            minutesPerTask: Math.round(minutesPerTask),
            completionRate,
            tasksPerHour: parseFloat(tasksPerHour),
            highPriorityRate,
            totalStudied: totalMinutes,
            totalCompleted: completedTasks
        },
        recommendations: generateEfficiencyRecommendations({
            minutesPerTask,
            completionRate,
            highPriorityRate
        })
    };
};

const generateEfficiencyRecommendations = ({ minutesPerTask, completionRate, highPriorityRate }) => {
    const recs = [];

    if (minutesPerTask > 60) {
        recs.push({
            type: 'task_granularity',
            message: 'Tarefas muito longas: considere dividi-las em subtarefas menores',
            priority: 'high'
        });
    }

    if (completionRate < 50) {
        recs.push({
            type: 'goal_setting',
            message: 'Baixa taxa de conclusão: revise suas metas e seja mais realista',
            priority: 'high'
        });
    }

    if (highPriorityRate < 70) {
        recs.push({
            type: 'prioritization',
            message: 'Foque nas tarefas de alta prioridade primeiro',
            priority: 'medium'
        });
    }

    if (recs.length === 0) {
        recs.push({
            type: 'positive',
            message: 'Continue mantendo seu ritmo atual!',
            priority: 'low'
        });
    }

    return recs;
};

export const detectProcrastination = (categories, studyLogs) => {
    const now = new Date();
    const normalizedNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const warnings = [];

    // Fix 3: Pre-index logs by taskId and categoryId to avoid O(logs) filter inside each loop
    const logsByTaskId = {};
    const logsByCategoryId = {};
    (studyLogs || []).forEach(log => {
        if (log.taskId) {
            if (!logsByTaskId[log.taskId]) logsByTaskId[log.taskId] = [];
            logsByTaskId[log.taskId].push(log);
        }
        if (log.categoryId) {
            if (!logsByCategoryId[log.categoryId]) logsByCategoryId[log.categoryId] = [];
            logsByCategoryId[log.categoryId].push(log);
        } else if (log.categoryName) {
            // 🎯 BUG 2.2 FIX: Fallback para logs sem categoryId mas com categoryName.
            // Permite que estudos "livres" sem vínculo de ID ainda protejam a categoria contra alertas de procrastinação.
            const matchingCat = categories.find(c => c.name === log.categoryName);
            if (matchingCat) {
                if (!logsByCategoryId[matchingCat.id]) logsByCategoryId[matchingCat.id] = [];
                logsByCategoryId[matchingCat.id].push(log);
            }
        }
    });

    // 1. Tarefas de alta prioridade sem progresso recente
    categories.forEach(cat => {
        cat.tasks?.forEach(task => {
            if (task.priority === 'high' && !task.completed) {
                const taskLogs = logsByTaskId[task.id] || [];
                const recentLogs = taskLogs.filter(log => {
                    const logDate = normalizeDate(log.date);
                    const daysDiff = logDate ? (normalizedNow - logDate.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
                    return daysDiff <= 3;
                });

                if (recentLogs.length === 0) {
                    // B-07 FIX: Antes de emitir alerta, verificar se há logs da CATEGORIA
                    // (sessões de estudo geral sem taskId explícito).
                    // Evita falso alerta quando o usuário estudou a matéria sem focar na tarefa.
                    const categoryLogs = logsByCategoryId[cat.id] || [];
                    const recentCategoryLogs = categoryLogs.filter(log => {
                        const catLogDate = normalizeDate(log.date);
                        const daysDiff = catLogDate ? (normalizedNow - catLogDate.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
                        return daysDiff <= 3;
                    });
                    if (recentCategoryLogs.length === 0) {
                        warnings.push({
                            type: 'stale_high_priority',
                            task: task.text || task.title || 'Tarefa sem nome',
                            category: cat.name,
                            severity: 'high'
                        });
                    }
                }
            }
        });
    });

    // 2. Categoria sem atividade há mais de 5 dias
    categories.forEach(cat => {
        if ((cat.tasks || []).length > 0) {
            const categoryLogs = logsByCategoryId[cat.id] || [];
            if (categoryLogs.length > 0) {
                const lastLog = categoryLogs.reduce((latest, log) =>
                    (normalizeDate(log.date)?.getTime() ?? 0) > (normalizeDate(latest.date)?.getTime() ?? 0) ? log : latest
                );
                const lastLogDate = normalizeDate(lastLog.date);
                const daysSinceLastStudy = lastLogDate ? (normalizedNow - lastLogDate.getTime()) / (1000 * 60 * 60 * 24) : 0;

                if (daysSinceLastStudy > 5) {
                    warnings.push({
                        type: 'neglected_category',
                        category: cat.name,
                        daysSince: Math.floor(daysSinceLastStudy),
                        severity: 'medium'
                    });
                }
            }
        }
    });

    // 3. Padrão de estudo irregular (< 3 dias na última semana)
    if ((studyLogs || []).length >= 7) {
        const last7Days = (studyLogs || []).filter(log => {
            const logDate7 = normalizeDate(log.date);
            const daysDiff = logDate7 ? (normalizedNow - logDate7.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
            return daysDiff <= 7;
        });

        const uniqueDays = new Set(last7Days.map(log =>
            toISODay(log.date)
        )).size;

        if (uniqueDays < 3) {
            warnings.push({
                type: 'irregular_pattern',
                message: `Apenas ${uniqueDays} dias de estudo na última semana`,
                severity: 'medium'
            });
        }
    }

    return {
        hasProcrastination: warnings.length > 0,
        warnings,
        score: Math.max(0, 100 - (warnings.length * 15))
    };
};

export const DAILY_GOAL_MINUTES = 240; // Configurado para 4 horas padrão

/**
 * Calculates current day stats for Pomodoro and Study Progress.
 * G-01 FIX: Integrates calculateDailyPomodoroGoal for dynamic daily goals.
 * G-02 FIX: Recovers duration from startTime/endTime if duration field is 0.
 */
export const calculatePomodoroStats = (stats) => {
    const { studySessions = [], categories = [], user = {} } = stats || {};

    // Get dynamic goal (B-11 FIX: Link dashboard UI to dynamic goal engine)
    const dynamicGoal = calculateDailyPomodoroGoal(categories, user);
    const dailyGoalPomodoros = dynamicGoal.daily;
    const dailyGoalMinutes = dailyGoalPomodoros * 25; // Standard 25m pomodoro sessions

    const now = new Date();

    // B-02 FIX: Usar objeto Date local, não toISOString() que sempre retorna UTC.
    // Em UTC-4, toISOString() adiantaria o início do dia em 4h, incluindo sessões de ontem.
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fix: Filter sessions where the end time crosses into today or later
    const todaySessions = studySessions.filter(s => {
        const start = new Date(s.startTime);
        const end = s.endTime ? new Date(s.endTime) : new Date(start.getTime() + (s.duration || 0) * 60000);
        return end > startOfDay;
    });

    let todayMinutes = 0;
    let fractionalPomodoros = 0; // FIX: Contagem baseada no esforço real/proporcional
    const todaySubjects = {};

    todaySessions.forEach(session => {
        const start = new Date(session.startTime);
        
        // G-02 Duration Recovery Fallback
        let sessionDuration = Number(session.duration) || 0;
        if (sessionDuration === 0 && session.startTime && session.endTime) {
            const end = new Date(session.endTime);
            sessionDuration = Math.round((end.getTime() - start.getTime()) / 60000);
        }

        const end = session.endTime ? new Date(session.endTime) : new Date(start.getTime() + sessionDuration * 60000);
        
        let minutesToCount = sessionDuration;
        // Dividir a sessão proporcionalmente se atravessar a meia-noite
        if (start < startOfDay) {
            minutesToCount = Math.max(0, Math.round((end.getTime() - startOfDay.getTime()) / 60000));
            minutesToCount = Math.min(sessionDuration, minutesToCount);
        }

        todayMinutes += minutesToCount;
        // FIX: Adiciona apenas a fração do pomodoro que pertence a "hoje"
        // Calcula o equivalente em blocos de pomodoro de 25 minutos
        fractionalPomodoros += (minutesToCount / 25);

        const cat = categories.find(c => c.id === session.categoryId);
        if (cat) {
            todaySubjects[cat.name] = (todaySubjects[cat.name] || 0) + minutesToCount;
        }
    });

    // Calcular a série de dias (streak)
    const logsObj = { studyLogs: studySessions.map(s => ({ date: s.startTime })) };
    const streak = calculateStudyStreak(logsObj.studyLogs);

    // Calcular progresso da meta (G-01: Used dynamic goal minutes)
    const progressPercentage = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));

    return {
        todayMinutes,
        todayPomodoros: Number(fractionalPomodoros.toFixed(1)),
        dailyGoalMinutes: dailyGoalMinutes,
        progressPercentage,
        streak: streak.current,
        totalSubjectsToday: Object.keys(todaySubjects).length,
        topSubject: Object.entries(todaySubjects).sort((a, b) => b[1] - a[1])[0] || null
    };
};

export const calculateDailyPomodoroGoal = (categories, user) => {
    const pendingTasks = categories.reduce((sum, c) =>
        sum + (c.tasks || []).filter(t => !t.completed).length, 0
    );

    const highPriorityPending = categories.reduce((sum, c) =>
        sum + (c.tasks || []).filter(t => !t.completed && t.priority === 'high').length, 0
    );

    // Fórmula: 2 pomodoros por alta prioridade + 1 por tarefa normal
    const baseGoal = (highPriorityPending * 2) + (pendingTasks - highPriorityPending);

    // Ajuste por nível (quanto maior, mais capacidade)
    // Fix: user.level might be undefined, fallback to 1
    const lvl = user?.level || 1;
    const levelMultiplier = 1 + (lvl * 0.05); // 5% por nível
    const adjustedGoal = Math.ceil(baseGoal * levelMultiplier);

    // Limitar entre 3 e 12 pomodoros (razoável)
    const dailyGoal = pendingTasks === 0 ? 0 : Math.max(3, Math.min(12, adjustedGoal));

    return {
        daily: dailyGoal,
        weekly: dailyGoal * 5,
        reasoning: {
            pendingTasks,
            highPriorityPending,
            baseGoal,
            levelBonus: Math.round((levelMultiplier - 1) * 100) + '%'
        }
    };
};

export const getCompleteReport = (data) => {
    const streak = calculateStudyStreak(data.studyLogs || []);
    const balance = analyzeSubjectBalance(data.categories || []);
    const efficiency = analyzeEfficiency(data.categories || [], data.studyLogs || []);
    const procrastination = detectProcrastination(data.categories, data.studyLogs || []);
    const goals = calculateDailyPomodoroGoal(data.categories, data.user);

    return {
        performance: {
            xp: data.user?.xp || 0,
            level: data.user?.level || 1,
            xpProgress: getXPProgress(data.user?.xp || 0),
        },
        consistency: streak,
        balance,
        efficiency,
        procrastination,
        goals: {
            ...goals,
            current: data.pomodorosCompleted || 0,
            progress: Math.round(((data.pomodorosCompleted || 0) / goals.daily) * 100)
        },
        // BUG 3 FIX: balance.status === 'sem_dados' recebia 40 (mesmo que 'alerta'),
        // penalizando usuários novos sem histórico de estudo.
        // Agora 'sem_dados' é neutro (65) — sem dados não é sinal de problema.
        overallScore: Math.round(
            (efficiency.score +
                procrastination.score +
                (Math.min(100, 40 + streak.current * 2)) +
                (balance.status === 'excelente' ? 100
                    : balance.status === 'atencao' ? 70
                    : balance.status === 'sem_dados' ? 65
                    : 40)) / 4
        ),
        recommendations: [
            ...efficiency.recommendations.map(r => r.message),
            ...balance.alerts.map(a =>
                a.type === 'overload'
                    ? `Matéria sobrecarregada: ${a.subject} (${a.percentage}%)`
                    : `Matérias negligenciadas: ${a.subjects.join(', ')}`
            ),
            ...procrastination.warnings.map(w => {
                if (w.type === 'stale_high_priority') {
                    return `Tarefa prioritária sem progresso: ${w.task}`;
                }
                if (w.type === 'neglected_category') {
                    return `${w.category}: ${w.daysSince} dias sem estudo`;
                }
                return w.message;
            })
        ]
    };
};
