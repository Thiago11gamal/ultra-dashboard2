
export const calculateStudyStreak = (studyLogs) => {
    if (!studyLogs || studyLogs.length === 0) {
        return { current: 0, longest: 0, isActive: false };
    }

    // Agrupar por dia único
    const daySet = new Set(
        studyLogs.map(log => new Date(log.date).toDateString())
    );
    const uniqueDays = Array.from(daySet).sort((a, b) =>
        new Date(b) - new Date(a)
    );

    const today = new Date().toDateString();
    // LET'S USE A ROBUST LOGIC instead of copying potential bug.
    // 1. Determine start date (Today or Yesterday)
    let streak = 0;
    const hasToday = uniqueDays.includes(today);
    const hasYesterday = uniqueDays.includes(yesterday);

    if (!hasToday && !hasYesterday) return { current: 0, longest: calculateLongest(uniqueDays), isActive: false };

    // Calculate current streak
    // We need to find consecutive days going back from Today (or Yesterday if Today missing)
    let dateCursor = new Date();
    if (!hasToday) dateCursor.setDate(dateCursor.getDate() - 1); // Start from yesterday

    // Now count backwards
    for (let i = 0; i < uniqueDays.length; i++) {
        const dString = dateCursor.toDateString();
        if (uniqueDays.includes(dString)) {
            streak++;
            dateCursor.setDate(dateCursor.getDate() - 1);
        } else {
            break;
        }
    }

    return {
        current: streak,
        longest: calculateLongest(uniqueDays),
        isActive: hasToday || hasYesterday
    };
};

const calculateLongest = (uniqueDays) => {
    let longest = 0;
    let current = 0;
    for (let i = 0; i < uniqueDays.length; i++) {
        const dCurrent = new Date(uniqueDays[i]);
        const dPrev = i > 0 ? new Date(uniqueDays[i - 1]) : null;

        if (dPrev) {
            const diff = (dPrev - dCurrent) / (1000 * 60 * 60 * 24);
            if (Math.round(diff) === 1) {
                current++;
            } else {
                longest = Math.max(longest, current);
                current = 1;
            }
        } else {
            current = 1;
        }
    }
    return Math.max(longest, current);
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

    const distribution = categories.map(c => ({
        subject: c.name,
        minutes: c.totalMinutes || 0,
        percentage: Math.round(((c.totalMinutes || 0) / totalMinutes) * 100),
        tasks: c.tasks.length,
        completed: c.tasks.filter(t => t.completed).length
    })).sort((a, b) => b.minutes - a.minutes);

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

export const analyzeEfficiency = (categories, studyLogs) => {
    const totalMinutes = categories.reduce((sum, c) => sum + (c.totalMinutes || 0), 0);
    const totalTasks = categories.reduce((sum, c) => sum + c.tasks.length, 0);
    const completedTasks = categories.reduce((sum, c) =>
        sum + c.tasks.filter(t => t.completed).length, 0
    );

    if (totalMinutes === 0 || completedTasks === 0) {
        return {
            status: 'sem_dados',
            message: 'Complete algumas tarefas para análise',
            score: 0,
            metrics: {},
            recommendations: []
        };
    }

    // Tempo médio por tarefa concluída
    const minutesPerTask = totalMinutes / completedTasks;

    // Classificação de eficiência
    let efficiency = 'excelente';
    let score = 100;

    if (minutesPerTask > 90) {
        efficiency = 'precisa_melhorar';
        score = 50;
    } else if (minutesPerTask > 60) {
        efficiency = 'regular';
        score = 70;
    } else if (minutesPerTask > 30) {
        efficiency = 'boa';
        score = 85;
    }

    // Taxa de conclusão geral
    const completionRate = Math.round((completedTasks / totalTasks) * 100);

    // Produtividade (tarefas por hora)
    const tasksPerHour = totalMinutes > 0 ?
        (completedTasks / (totalMinutes / 60)).toFixed(1) : 0;

    // Análise de tarefas de alta prioridade
    const highPriorityTasks = categories.flatMap(c =>
        c.tasks.filter(t => t.priority === 'high')
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
    const warnings = [];

    // 1. Tarefas de alta prioridade sem progresso recente
    categories.forEach(cat => {
        cat.tasks.forEach(task => {
            if (task.priority === 'high' && !task.completed) {
                const recentLogs = studyLogs.filter(log => {
                    const logDate = new Date(log.date);
                    const daysDiff = (now - logDate) / (1000 * 60 * 60 * 24);
                    return log.taskId === task.id && daysDiff <= 3;
                });

                if (recentLogs.length === 0) {
                    warnings.push({
                        type: 'stale_high_priority',
                        task: task.title,
                        category: cat.name,
                        severity: 'high'
                    });
                }
            }
        });
    });

    // 2. Categoria sem atividade há mais de 5 dias
    categories.forEach(cat => {
        if (cat.tasks.length > 0) {
            const categoryLogs = studyLogs.filter(log => log.categoryId === cat.id);
            if (categoryLogs.length > 0) {
                const lastLog = categoryLogs.sort((a, b) =>
                    new Date(b.date) - new Date(a.date)
                )[0];
                const daysSinceLastStudy = (now - new Date(lastLog.date)) / (1000 * 60 * 60 * 24);

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
    if (studyLogs.length >= 7) {
        const last7Days = studyLogs.filter(log => {
            const daysDiff = (now - new Date(log.date)) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        });

        const uniqueDays = new Set(last7Days.map(log =>
            new Date(log.date).toDateString()
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

export const calculateDailyPomodoroGoal = (categories, user) => {
    const pendingTasks = categories.reduce((sum, c) =>
        sum + c.tasks.filter(t => !t.completed).length, 0
    );

    const highPriorityPending = categories.reduce((sum, c) =>
        sum + c.tasks.filter(t => !t.completed && t.priority === 'high').length, 0
    );

    // Fórmula: 2 pomodoros por alta prioridade + 1 por tarefa normal
    const baseGoal = (highPriorityPending * 2) + (pendingTasks - highPriorityPending);

    // Ajuste por nível (quanto maior, mais capacidade)
    // Fix: user.level might be undefined, fallback to 1
    const lvl = user.level || 1;
    const levelMultiplier = 1 + (lvl * 0.05); // 5% por nível
    const adjustedGoal = Math.ceil(baseGoal * levelMultiplier);

    // Limitar entre 3 e 12 pomodoros (razoável)
    const dailyGoal = Math.max(3, Math.min(12, adjustedGoal));

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
    const balance = analyzeSubjectBalance(data.categories);
    const efficiency = analyzeEfficiency(data.categories, data.studyLogs || []);
    const procrastination = detectProcrastination(data.categories, data.studyLogs || []);
    const goals = calculateDailyPomodoroGoal(data.categories, data.user);

    return {
        performance: {
            xp: data.user.xp,
            level: data.user.level,
            // Need to import getXPProgress or pass it logic. 
            // User snippet calls getXPProgress(data.user.xp, data.user.level) assumes it's available or imported.
            // We will leave this helper here assuming it's for external use or needs to fetch that util.
            // Since getXPProgress is in gamification.js, we shouldn't circular depend if possible.
            // Or we can just duplicate logic or import it.
            // Ideally analytics shouldn't depend on gamification. 
            // Let's comment this out or just return basic info for now to avoid circular dependency hell.
            // xpProgress: ... 
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
        overallScore: Math.round(
            (efficiency.score +
                procrastination.score +
                (streak.current > 0 ? 80 : 40) +
                (balance.status === 'excelente' ? 100 : balance.status === 'atencao' ? 70 : 40)) / 4
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
