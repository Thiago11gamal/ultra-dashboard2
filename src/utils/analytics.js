import { getXPProgress } from './gamification.js';
import { normalizeDate, getLocalMidnight, getDateKey } from './dateHelper.js';

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
    let diff = targetSum - currentSum;

    if (diff > 0) {
        // 2. Sort by remainder descending and distribute the rounding remainder
        // BUGFIX M1: Loop while diff > 0 to ensure sum reaches targetSum even if diff > items.length
        withRemainders.sort((a, b) => b.remainder - a.remainder);
        let i = 0;
        while (diff > 0 && withRemainders.length > 0) {
            withRemainders[i % withRemainders.length].percentage += 1;
            diff--;
            i++;
        }
    }

    return withRemainders;
};

export const calculateStudyStreak = (studyLogs) => {
    if (!studyLogs || studyLogs.length === 0) {
        return { current: 0, best: 0, longest: 0, isActive: false };
    }

    // 1. Agrupar por dia único (YYYY-MM-DD local) para ignorar horas/minutos
    const daySet = new Set(
        studyLogs.map(log => getDateKey(log.date)).filter(Boolean)
    );
    const sortedDays = Array.from(daySet).sort((a, b) =>
        new Date(b) - new Date(a)
    );

    const todayStr = getDateKey(new Date());
    const lastDayStr = sortedDays[0];

    // 2. Cálculo do Gap (Perdão do Dia Atual)
    // BUGFIX: Não usamos diferença em ms do Date.now().
    // Comparamos a diferença entre as strings de data normalizadas para 12:00:00
    // para evitar problemas de fuso horário e horário de verão.
    const t = new Date(todayStr + 'T12:00:00');
    const l = new Date((lastDayStr || todayStr) + 'T12:00:00');
    const diffDays = Math.round((t - l) / (1000 * 60 * 60 * 24));

    // Se o gap for >= 2, ele pulou o dia de ontem INTEIRO. Streak quebrado.
    if (diffDays >= 2) {
        const longest = calculateLongest(sortedDays);
        return { current: 0, best: longest, longest, isActive: false };
    }

    // 3. Contagem regressiva da Ofensiva
    let streak = 0;
    // O cursor começa no último dia de estudo real
    let dateCursor = new Date(lastDayStr + 'T12:00:00');

    for (let i = 0; i < sortedDays.length * 2; i++) {
        const dString = getDateKey(dateCursor);
        if (daySet.has(dString)) {
            streak++;
            dateCursor.setDate(dateCursor.getDate() - 1);
        } else {
            break; // Fim da sequência
        }
    }

    const longest = calculateLongest(sortedDays);
    return {
        current: streak,
        best: longest,
        longest: longest,
        isActive: diffDays <= 1 // Ativo se estudou hoje ou ontem
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
    const safeCategories = Array.isArray(categories) ? categories : [];
    const totalMinutes = safeCategories.reduce((sum, c) => sum + Math.max(0, Number(c?.totalMinutes) || 0), 0);

    if (totalMinutes === 0) {
        return {
            status: 'sem_dados',
            message: 'Comece a estudar para ver análise',
            distribution: [],
            alerts: []
        };
    }

    // Distribution with Rounding Protection (B-05 FIX)
    let distribution = safeCategories.map(c => {
        const minutes = Math.max(0, Number(c?.totalMinutes) || 0);
        const tasks = Array.isArray(c?.tasks) ? c.tasks : [];
        const rawPercentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
        return {
            subject: c?.name || 'Sem nome',
            minutes,
            rawPercentage,
            tasks: tasks.length,
            completed: tasks.filter(t => t?.completed).length
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

    // Detectar matérias negligenciadas (< 5% do tempo mas tem tarefas pendentes)
    const neglected = distribution.filter(d => d.percentage < 5 && (d.tasks > d.completed));
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
            totalSubjects: safeCategories.length,
            activeSubjects: distribution.filter(d => d.minutes > 0).length
        }
    };
};

export const analyzeEfficiency = (categories, studyLogs = [], user = {}) => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeLogs = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});

    const getMinutes = (entry) => {
        const duration = Number(entry?.duration);
        const minutes = Number(entry?.minutes);
        const raw = Number.isFinite(duration) ? duration : (Number.isFinite(minutes) ? minutes : 0);
        return Math.max(0, raw);
    };

    const totalMinutes = safeLogs.length > 0
        ? safeLogs.reduce((sum, l) => sum + getMinutes(l), 0)
        : safeCategories.reduce((sum, c) => sum + Math.max(0, Number(c?.totalMinutes) || 0), 0);
    // Bug fix: optional chaining on c.tasks throughout to avoid crash if tasks is undefined
    const totalTasks = safeCategories.reduce((sum, c) => sum + (Array.isArray(c?.tasks) ? c.tasks.length : 0), 0);
    const completedTasks = safeCategories.reduce((sum, c) =>
        sum + (Array.isArray(c?.tasks) ? c.tasks.filter(t => t?.completed).length : 0), 0
    );

    if (totalMinutes === 0 && completedTasks === 0) {
        return {
            status: 'sem_dados',
            efficiency: 'sem_dados',
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

    // BUGFIX M2: Close loophole where checking boxes with zero minutes gave 100% efficiency.
    if (totalMinutes === 0 && completedTasks > 0) {
        return {
            efficiency: 'precisa_melhorar',
            score: 0,
            message: 'Ligue o cronômetro para registrar a sua eficiência real.',
            metrics: { minutesPerTask: 0, completionRate: 0, tasksPerHour: 0, highPriorityRate: 0, totalStudied: 0, totalCompleted: completedTasks },
            recommendations: [{ type: 'time_tracking', message: 'Lembre-se de usar o Pomodoro para medir seu esforço.', priority: 'high' }]
        };
    }

    // Tempo médio por tarefa concluída (Métrica Bruta para Display)
    const minutesPerTask = totalMinutes / completedTasks;

    // Taxa de conclusão geral
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // FIX MATEMÁTICO: Novo Motor de Eficiência (Anti-Punição de Deep Work)
    // Em vez de punir o tempo absoluto, medimos a cadência de entrega (tarefas/hora).
    // Benchmark: 3 tarefas/hora é considerado 100% de eficiência de fluxo.
    // O benchmark escala levemente com o nível do usuário (mais experiência = mais foco).
    const userLevel = user?.level || 1;
    const benchmarkTarefasPorHora = 2 + (Math.min(userLevel, 20) * 0.1); // Escala de 2.1 a 4.0
    const currentTasksPerHour = (completedTasks / (totalMinutes / 60));
    
    // Score de Fluxo: Proporção em relação ao benchmark, capado em 100.
    const flowScore = Math.min(100, Math.round((currentTasksPerHour / benchmarkTarefasPorHora) * 100));

    // Score Composto: 30% Cadência (Flow) e 70% Poder de Conclusão Atual (Checklist)
    // Damos mais peso à conclusão real das tarefas do que à velocidade pura.
    const score = Math.round((flowScore * 0.3) + (completionRate * 0.7));

    let efficiency = 'excelente';
    if (score < 60) efficiency = 'precisa_melhorar';
    else if (score < 75) efficiency = 'regular';
    else if (score < 85) efficiency = 'boa';

    // Produtividade (tarefas por hora - apenas display numérico)
    const tasksPerHour = totalMinutes > 0 ?
        (completedTasks / (totalMinutes / 60)).toFixed(2) : 0;

    // Análise de tarefas de alta prioridade
    const highPriorityTasks = safeCategories.flatMap(c =>
        (Array.isArray(c?.tasks) ? c.tasks : []).filter(t => t?.priority === 'high')
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
    // BUG-02 FIX: Usar âncora de 12:00:00 para comparação de dias, 
    // garantindo paridade com o resto do sistema de datas (dateHelper).
    const normalizedNow = normalizeDate(now).getTime();
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
            const categoryLogs = (logsByCategoryId[cat.id] || []).filter(Boolean);
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
    // BUGFIX: Removemos a trava de '.length >= 7' para permitir que o Coach detecte 
    // procrastinadores severos (justamente os que têm pouquíssimos logs).
    if (studyLogs) {
        const last7Days = (studyLogs || []).filter(log => {
            const logDate7 = normalizeDate(log.date);
            const daysDiff = logDate7 ? (normalizedNow - logDate7.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
            return daysDiff <= 7;
        });

        const uniqueDays = new Set(last7Days.map(log =>
            getDateKey(log.date)
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
    const { studySessions = [], categories = [], user = {}, settings = {} } = stats || {};

    // Get dynamic goal (B-11 FIX: Link dashboard UI to dynamic goal engine)
    const dynamicGoal = calculateDailyPomodoroGoal(categories, user);
    const dailyGoalPomodoros = dynamicGoal.daily;
    const pomodoroDuration = settings?.pomodoroWork || 25;
    const dailyGoalMinutes = dailyGoalPomodoros * pomodoroDuration;

    // B-02 FIX: Usar objeto Date local, não toISOString() que sempre retorna UTC.
    // 🕒 PADRONIZAÇÃO MANAUS: Garante que "hoje" começa à meia-noite exata de Manaus (UTC-4)
    const startOfDay = getLocalMidnight();

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
        // BUGFIX: Usar construtor nativo para evitar bugs de Horário de Verão (DST)
        const startOfNextDay = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate() + 1);

        // BUGFIX M1: Clamp session duration to the boundaries of "today"
        const effectiveStart = Math.max(start.getTime(), startOfDay.getTime());
        const effectiveEnd = Math.min(end.getTime(), startOfNextDay.getTime());

        let minutesToCount = 0;
        if (effectiveEnd > effectiveStart) {
            minutesToCount = Math.round((effectiveEnd - effectiveStart) / 60000);
        }

        // Safety cap: cannot exceed the session's own duration
        minutesToCount = Math.min(sessionDuration, minutesToCount);

        todayMinutes += minutesToCount;
        // FIX: Adiciona apenas a fração do pomodoro que pertence a "hoje"
        // Calcula o equivalente em blocos de pomodoro de 25 minutos
        fractionalPomodoros += (minutesToCount / pomodoroDuration);

        const cat = categories.find(c => c.id === session.categoryId);
        if (cat) {
            todaySubjects[cat.name] = (todaySubjects[cat.name] || 0) + minutesToCount;
        }
    });

    // Calcular a série de dias (streak)
    const streak = calculateStudyStreak(studySessions.map(s => ({ date: s.startTime })));

    // Calcular progresso da meta (G-01: Used dynamic goal minutes)
    // BUGFIX M3: Protection against division by zero when goal is 0.
    const progressPercentage = dailyGoalMinutes > 0
        ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))
        : (todayMinutes > 0 ? 100 : 0);

    return {
        todayMinutes,
        todayPomodoros: Number(fractionalPomodoros.toFixed(2)),
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
    const efficiency = analyzeEfficiency(data.categories || [], data.studyLogs || [], data.user);
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
            // BUGFIX: quando a meta diária é 0 (ex.: sem tarefas pendentes), evitar divisão por zero.
            // Mantemos o progresso em 100 se não há exigência no dia, caso contrário clamp [0,100].
            progress: goals.daily <= 0
                ? 100
                : Math.max(0, Math.min(100, Math.round(((data.pomodorosCompleted || 0) / goals.daily) * 100)))
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
