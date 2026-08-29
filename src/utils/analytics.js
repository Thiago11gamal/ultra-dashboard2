import { getXPProgress } from './gamification.js';
import { normalizeDate, getLocalMidnight, getDateKey, parseNoonLocal, getFlashcardTodayKey, getFlashcardNextDueKey } from './dateHelper.js';
import { getSafeScore, getSyntheticTotal } from './scoreHelper.js';
import { safeDate } from '../engine/math/date.js';
import { format } from 'date-fns';
import { toFinite } from '../engine/math/safe.js';
import { toArray } from './normalize.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// T-024 FIX: helper para ancorar "hoje" em America/Manaus (UTC-4).
// Se o timezone do app mudar, este offset precisa acompanhar APP_TIMEZONE.
const getManausDayRange = (dateInput) => {
    const key = getDateKey(dateInput);

    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return null;
    }

    const [year, month, day] = key.split('-').map(Number);

    // America/Manaus é UTC-4.
    // Meia-noite de Manaus = 04:00 UTC.
    const start = Date.UTC(year, month - 1, day, 4, 0, 0, 0);

    return {
        key,
        start,
        end: start + MS_PER_DAY
    };
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
  const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
  if (!logsArray || logsArray.length === 0) {
    return { current: 0, best: 0, longest: 0, isActive: false };
  }

  // ✅ Usa getDateKey (ancorado em America/Manaus) para TODAS as comparações
  const daySet = new Set(
    logsArray
      // ✅ FIX: Filtrar apenas logs com minutos > 0 para evitar streaks falsos
      .filter(log => log && log.date && getStudyMinutes(log) > 0)
      .map(log => getDateKey(log.date))
      .filter(key => key && /^\d{4}-\d{2}-\d{2}$/.test(key))
  );

  const sortedDays = Array.from(daySet).sort((a, b) =>
    parseNoonLocal(b) - parseNoonLocal(a)
  );

  // ✅ FIX: Se não há dias válidos após filter, retornar zeros
  if (sortedDays.length === 0) {
    return { current: 0, best: 0, longest: 0, isActive: false };
  }

  // ✅ todayStr também via getDateKey (Manaus)
  const todayStr = getDateKey(new Date());
  const lastDayStr = sortedDays[0];

  // Comparação via strings YYYY-MM-DD (imune a timezone)
  const t = parseNoonLocal(todayStr);
  const l = parseNoonLocal(lastDayStr);
  const diffDays = Math.round((t - l) / (1000 * 60 * 60 * 24));

  if (diffDays >= 2) {
    const longest = calculateLongest(sortedDays);
    return { current: 0, best: longest, longest, isActive: false };
  }

  let streak = 0;
  // ✅ LOTE-03 FIX (M1): cursor ancorado em America/Manaus (UTC-4) via chave de dia.
  // ANTES: parseNoonLocal criava meio-dia no fuso LOCAL do browser e getDateKey
  // reinterpretava em Manaus. Em fusos >= UTC+9 (ex.: Ásia), o meio-dia local
  // caía no dia ANTERIOR de Manaus -> daySet.has() nunca casava -> streak sempre 0.
  // Agora a iteração é feita por chave de data ancorada (Manaus não tem DST — seguro).
  let cursorKey = lastDayStr;
  const maxIterations = Math.min(sortedDays.length + 2, 3660); // 10 anos
  for (let i = 0; i < maxIterations; i++) {
    if (!cursorKey || !daySet.has(cursorKey)) break;
    streak++;
    // eslint-disable-next-line no-restricted-syntax
    const anchored = new Date(`${cursorKey}T12:00:00-04:00`);
    anchored.setDate(anchored.getDate() - 1);
    const nextKey = getDateKey(anchored);
    if (nextKey === cursorKey) break; // evita loop infinito
    cursorKey = nextKey;
  }

  const longest = calculateLongest(sortedDays);
  return { current: streak, best: longest, longest, isActive: diffDays <= 1 };
};


const calculateLongest = (uniqueDays) => {
    if (!uniqueDays || uniqueDays.length === 0) return 0;
    let longest = 1;
    let current = 1;
    // uniqueDays está ordenado DECRESCENTE — iteramos do mais recente ao mais antigo
    for (let i = 1; i < uniqueDays.length; i++) {
        const dCurrent = parseNoonLocal(uniqueDays[i]);
        const dPrev = parseNoonLocal(uniqueDays[i - 1]);
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

// T-024 FIX: fallback seguro entre minutes e duration.
// Se minutes === 0 mas duration > 0, ainda aproveitamos duration.
export const getStudyMinutes = (entry) => {
    const minutes = toFinite(entry?.minutes, 0);
    const duration = toFinite(entry?.duration, 0);

    if (Number.isFinite(minutes) && minutes > 0) return minutes;
    if (Number.isFinite(duration) && duration > 0) return duration;

    return 0;
};

/**
 * Conta pomodoros concluídos hoje a partir dos studyLogs.
 * extraCompletedCycles cobre blocos de foco da sessão ativa ainda não persistidos em log.
 */
export const countPomodorosToday = (studyLogs, pomodoroWork = 25, extraCompletedCycles = 0) => {
    const logsArray = toArray(studyLogs);
    const workDuration = Math.max(1, Number(pomodoroWork) || 25);

    // T-024 FIX: usar chave de dia consistente, com fallback por timestamp.
    const todayRange = getManausDayRange(new Date());
    const todayKey = getDateKey(new Date());

    const minutesToday = logsArray.reduce((sum, log) => {
        const d = safeDate(log?.date);
        if (!d) return sum;

        // Fonte primária: chave do dia
        if (getDateKey(d) === todayKey) {
            return sum + getStudyMinutes(log);
        }

        // Fallback defensivo: timestamp dentro do range do dia
        const t = d.getTime();
        if (todayRange && t >= todayRange.start && t < todayRange.end) {
            return sum + getStudyMinutes(log);
        }

        return sum;
    }, 0);

    const pomodorosFromLogs = Number.isFinite(minutesToday)
        ? Math.floor(minutesToday / workDuration)
        : 0;

    const safeExtra = Math.max(0, Number(extraCompletedCycles) || 0);

    return pomodorosFromLogs + safeExtra;
};

/** Total de pomodoros (vida útil) baseado em minutos reais, não contagem de sessões. */
export const countPomodorosTotal = (studyLogs, studySessions, pomodoroWork = 25) => {
    const workDuration = Math.max(1, Number(pomodoroWork) || 25);

    // T-019/T-024 FIX: normalizar entradas
    const logsArray = toArray(studyLogs);
    const sessionsArray = toArray(studySessions);

    const logsMinutes = logsArray.reduce((sum, log) => sum + getStudyMinutes(log), 0);
    const sessionsMinutes = sessionsArray.reduce((sum, s) => sum + getStudyMinutes(s), 0);
    
    const totalMinutes = Math.max(logsMinutes, sessionsMinutes);

    return Math.floor(totalMinutes / workDuration);
};

const aggregateQuestionAccuracy = (contestData) => {
    // T-011 FIX: garantir que correct nunca ultrapasse total.
    const clampCorrect = (correct, total) => {
        const t = Number(total);
        if (!Number.isFinite(t) || t <= 0) return 0;

        const c = Number(correct);
        if (!Number.isFinite(c)) return 0;

        return Math.max(0, Math.min(t, c));
    };

    const validSimulados = toArray(contestData?.simuladoRows).filter(
        r => r?.validated && Number(r?.total) > 0 && r?.correct !== undefined
    );

    let totalQuestions = 0;
    let totalCorrect = 0;

    validSimulados.forEach(r => {
        const t = Number(r.total);
        if (!Number.isFinite(t) || t <= 0) return;

        totalQuestions += t;
        totalCorrect += clampCorrect(r.correct, t);
    });

    // Only supplement from history if we have no explicit validated rows
    if (validSimulados.length === 0 || totalQuestions === 0) {
        toArray(contestData?.categories).forEach(cat => {
            const maxS = Number(cat?.maxScore) || 100;
            const syntheticTotal = getSyntheticTotal(maxS);

            const histArr = toArray(cat?.simuladoStats?.history);

            histArr.forEach(e => {
                let t = Number(e?.total) || 0;
                let c = 0;

                if (t > 0) {
                    c = e?.correct !== undefined
                        ? Number(e.correct)
                        : Math.round((getSafeScore(e, maxS) / maxS) * t);
                } else if (e?.score != null) {
                    t = syntheticTotal;
                    c = Math.round((getSafeScore(e, maxS) / maxS) * t);
                }

                if (!Number.isFinite(t) || t <= 0) return;

                c = clampCorrect(c, t);

                totalQuestions += t;
                totalCorrect += c;
            });
        });
    }

    // T-011 FIX: blindagem final contra dados corrompidos
    totalCorrect = Math.max(0, Math.min(totalQuestions, totalCorrect));

    return {
        totalQuestions,
        totalCorrect,
        accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
    };
};

/**
 * Estatísticas unificadas para conquistas e painéis de gamificação.
 * Centraliza a lógica que antes divergia entre Activity.jsx e createGamificationSlice.
 */
export const buildAchievementStats = (contestData, options = {}) => {
    if (!contestData) return null;

    const pomodoroWork = Math.max(1, Number(options.pomodoroWork ?? contestData.settings?.pomodoroWork) || 25);
    const extraCompletedCycles = Math.max(0, Number(options.extraCompletedCycles) || 0);

    // T-019 FIX: normalizar dados de forma consistente
    const studyLogs = toArray(contestData?.studyLogs);
    const studySessions = toArray(contestData?.studySessions);

    const { totalQuestions, totalCorrect, accuracy } = aggregateQuestionAccuracy(contestData);

    let studiedEarly = Boolean(contestData.user?.studiedEarly);
    let studiedLate = Boolean(contestData.user?.studiedLate);
    let studiedWeekend = Boolean(contestData.user?.studiedWeekend);
    // Garante que studiedWeekend é setado a partir dos logs
    const logsArrayForWeekend = toArray(studyLogs);
    logsArrayForWeekend.forEach(log => {
        const d = safeDate(log?.date);
        if (!d) return;
        const day = d.getDay();
        if (day === 0 || day === 6) studiedWeekend = true;
    });

    const categoriesArray = toArray(contestData?.categories);

    const hasPerfectScoreFromHistory = categoriesArray.some(cat => {
        const hist = cat.simuladoStats?.history;
        const histArr = Array.isArray(hist) ? hist : Object.values(hist || {});
        const maxS = Number(cat.maxScore) || 100;
        return histArr?.some(h => getSafeScore(h, maxS) >= maxS || (h.correct === h.total && h.total > 0));
    }) || false;

    return {
        completedTasks: categoriesArray.reduce(
            (sum, cat) => sum + ((Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})).filter(t => t.completed)?.length || 0), 0
        ) || 0,
        currentStreak: calculateStudyStreak(studyLogs).current,
        totalQuestions,
        hasPerfectScore: (totalQuestions > 0 && totalCorrect >= totalQuestions) || hasPerfectScoreFromHistory,
        accuracy,
        pomodorosCompleted: countPomodorosTotal(studyLogs, studySessions, pomodoroWork),
        pomodorosToday: countPomodorosToday(studyLogs, pomodoroWork, extraCompletedCycles),
        studiedEarly,
        studiedLate,
        studiedWeekend,
        subjectsStudied: new Set(studyLogs.filter(log => log.categoryId).map(log => log.categoryId)).size,
        // Flashcard indicators as measures
        flashcardReviews: studyLogs.filter(log => log.type === 'flashcard').length,
        flashcardAccuracy: (() => {
            const fcLogs = studyLogs.filter(log => log.type === 'flashcard' && log.correct !== undefined);
            if (fcLogs.length === 0) return 0;
            const correct = fcLogs.filter(l => l.correct).length;
            return (correct / fcLogs.length) * 100;
        })(),
        flashcardReviewsToday: (() => {
            // T-024 FIX: usar getDateKey em vez de timestamp local
            const todayKey = getDateKey(new Date());

            return studyLogs.filter(log =>
                log?.type === 'flashcard' &&
                getDateKey(log?.date) === todayKey
            ).length;
        })(),
        // Enhanced deck-based flashcard indicators (for KPIs, Coach, Retention)
        // Now uses centralized helpers (consistent date keys + mastery >=6)
        flashcardDecks: getFlashcardDeckCount(contestData.flashcardDecks),
        flashcardTotalCards: getFlashcardTotalCards(contestData.flashcardDecks),
        flashcardDueToday: getFlashcardDueTodayCount(contestData.flashcardDecks),
        flashcardMastery: getFlashcardMasteryPct(contestData.flashcardDecks)
    };
};

export const analyzeSubjectBalance = (categories) => {
    // T-019 FIX: aceitar objeto Firebase
    const safeCategories = toArray(categories);
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
        // T-019 FIX: tasks podem ser objeto
        const tasks = toArray(c?.tasks);
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
    // T-019 FIX: normalização universal
    const safeCategories = toArray(categories);
    const safeLogs = toArray(studyLogs);

    // T-024 FIX: se duration vier 0 mas minutes existir, usa minutes.
    const getMinutes = (entry) => {
        const minutes = Number(entry?.minutes);
        const duration = Number(entry?.duration);

        if (Number.isFinite(minutes) && minutes > 0) return Math.max(0, minutes);
        if (Number.isFinite(duration) && duration > 0) return Math.max(0, duration);

        return 0;
    };

    const totalMinutes = safeLogs.length > 0
        ? safeLogs.reduce((sum, l) => sum + getMinutes(l), 0)
        : safeCategories.reduce((sum, c) => sum + Math.max(0, Number(c?.totalMinutes) || 0), 0);
    // Bug fix: optional chaining on c.tasks throughout to avoid crash if tasks is undefined
    // T-019 FIX: tasks normalizadas
    const totalTasks = safeCategories.reduce((sum, c) => {
        return sum + toArray(c?.tasks).length;
    }, 0);

    const completedTasks = safeCategories.reduce((sum, c) => {
        return sum + toArray(c?.tasks).filter(t => t?.completed).length;
    }, 0);

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

    // Taxa de conclusão geral (clamp defensivo contra dados corrompidos)
    const safeCompleted = Math.min(completedTasks, totalTasks);
    const completionRate = totalTasks > 0 ? Math.min(100, Math.round((safeCompleted / totalTasks) * 100)) : 0;

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
        parseFloat((completedTasks / (totalMinutes / 60)).toFixed(2)) : 0;

    // Análise de tarefas de alta prioridade
    // T-019 FIX: tasks normalizadas
    const highPriorityTasks = safeCategories.flatMap(c =>
        toArray(c?.tasks).filter(t => t?.priority === 'high')
    );
    const highPriorityCompleted = highPriorityTasks.filter(t => t.completed).length;
    const highPriorityRate = highPriorityTasks.length > 0
        ? Math.min(100, Math.round((Math.min(highPriorityCompleted, highPriorityTasks.length) / highPriorityTasks.length) * 100))
        : 100;

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
    // T-019 FIX: normalização universal
    const categoriesArray = toArray(categories);
    const now = new Date();
    // BUG-02 FIX: Usar âncora de 12:00:00 para comparação de dias, 
    // garantindo paridade com o resto do sistema de datas (dateHelper).
    const normalizedNowDate = normalizeDate(now);

    if (!normalizedNowDate || Number.isNaN(normalizedNowDate.getTime())) {
      return { warnings: [] };
    }

    const normalizedNow = normalizedNowDate.getTime();
    const warnings = [];

    // Fix 3: Pre-index logs by taskId and categoryId to avoid O(logs) filter inside each loop
    const logsByTaskId = {};
    const logsByCategoryId = {};
    const logsArray = toArray(studyLogs);
    logsArray.forEach(log => {
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
            const matchingCat = categoriesArray.find(c => c.name === log.categoryName);
            if (matchingCat) {
                if (!logsByCategoryId[matchingCat.id]) logsByCategoryId[matchingCat.id] = [];
                logsByCategoryId[matchingCat.id].push(log);
            }
        }
    });

    // 1. Tarefas de alta prioridade sem progresso recente
    categoriesArray.forEach(cat => {
        // T-019 FIX: tasks normalizadas
        toArray(cat?.tasks).forEach(task => {
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
    categoriesArray.forEach(cat => {
        if (toArray(cat?.tasks).length > 0) {
            const categoryLogs = (logsByCategoryId[cat.id] || []).filter(Boolean);
            if (categoryLogs.length > 0) {
                const lastLog = categoryLogs.reduce((latest, log) =>
                    (normalizeDate(log.date)?.getTime() ?? 0) > (normalizeDate(latest.date)?.getTime() ?? 0) ? log : latest
                , categoryLogs[0]);
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
    if (logsArray.length > 0) {
        const last7Days = logsArray.filter(log => {
            const logDate7 = normalizeDate(log.date);
            const daysDiff = logDate7 ? (normalizedNow - logDate7.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
            return daysDiff <= 7;
        });

        // T-024 FIX: remover chaves inválidas/null do set
        const uniqueDays = new Set(
            last7Days
                .map(log => getDateKey(log.date))
                .filter(Boolean)
        ).size;

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
        score: (() => {
            const severityPenalty = warnings.reduce((acc, w) => acc + (w?.severity === 'high' ? 12 : w?.severity === 'medium' ? 8 : 6), 0);
            return Math.max(10, 100 - severityPenalty);
        })()
    };
};

export const DAILY_GOAL_MINUTES = 240; // Configurado para 4 horas padrão

/**
 * Calculates current day stats for Pomodoro and Study Progress.
 * G-01 FIX: Integrates calculateDailyPomodoroGoal for dynamic daily goals.
 * G-02 FIX: Recovers duration from startTime/endTime if duration field is 0.
 */
export const calculatePomodoroStats = (stats) => {
    const { studySessions = [], studyLogs = [], categories = [], user = {}, settings = {} } = stats || {};

    // T-019 FIX: normalização universal
    const safeStudySessions = toArray(studySessions);
    const safeStudyLogs = toArray(studyLogs);
    const safeCategories = toArray(categories);

    // Get dynamic goal
    const dynamicGoal = calculateDailyPomodoroGoal(safeCategories, user);
    const dailyGoalPomodoros = dynamicGoal.daily;
    const pomodoroDuration = settings?.pomodoroWork || 25;
    const dailyGoalMinutes = dailyGoalPomodoros * pomodoroDuration;

    // T-024 FIX: usar range ancorado em Manaus, com fallback local
    const todayRange = getManausDayRange(new Date()) || {
        start: getLocalMidnight().getTime(),
        end: getLocalMidnight().getTime() + MS_PER_DAY
    };

    const todaySessions = safeStudySessions.filter(s => {
        const start = safeDate(s?.startTime);
        if (!start) return false;

        const end = s?.endTime
            ? safeDate(s.endTime)
            : new Date(start.getTime() + (Number(s.duration) || 0) * 60000);

        return (
            Number.isFinite(end?.getTime()) &&
            end.getTime() > todayRange.start &&
            start.getTime() < todayRange.end
        );
    });

    let todayMinutes = 0;
    let fractionalPomodoros = 0;
    const todaySubjects = {};

    todaySessions.forEach(session => {
        const start = safeDate(session.startTime);
        if (!start) return;

        let sessionDuration = Number(session.duration) || 0;

        if (sessionDuration === 0 && session.startTime && session.endTime) {
            const end = safeDate(session.endTime);
            if (end) {
                sessionDuration = Math.round((end.getTime() - start.getTime()) / 60000);
            }
        }

        const end = session.endTime
            ? safeDate(session.endTime)
            : new Date(start.getTime() + sessionDuration * 60000);

        if (!Number.isFinite(end?.getTime())) return;

        const effectiveStart = Math.max(start.getTime(), todayRange.start);
        const effectiveEnd = Math.min(end.getTime(), todayRange.end);

        let minutesToCount = 0;
        if (effectiveEnd > effectiveStart) {
            minutesToCount = Math.round((effectiveEnd - effectiveStart) / 60000);
        }

        const safeSessionDuration = Math.max(0, Number(sessionDuration) || 0);
        minutesToCount = Math.min(safeSessionDuration, minutesToCount);

        todayMinutes += minutesToCount;
        fractionalPomodoros += (minutesToCount / pomodoroDuration);

        const cat = safeCategories.find(c => c?.id === session.categoryId);
        if (cat) {
            todaySubjects[cat.name] = (todaySubjects[cat.name] || 0) + minutesToCount;
        }
    });

    const streakSource = safeStudyLogs.length > 0
        ? safeStudyLogs
        : safeStudySessions.map(s => ({ date: s?.startTime || s?.date }));

    const streak = calculateStudyStreak(streakSource);

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
    // T-020 FIX: normalizar categories e tasks
    const categoriesArray = toArray(categories);

    const getTasks = (cat) => toArray(cat?.tasks);

    const pendingTasks = categoriesArray.reduce((sum, c) => {
        return sum + getTasks(c).filter(t => t && !t.completed).length;
    }, 0);

    const highPriorityPending = categoriesArray.reduce((sum, c) => {
        return sum + getTasks(c).filter(t => t && !t.completed && t.priority === 'high').length;
    }, 0);

    // Fórmula: 2 pomodoros por alta prioridade + 1 por tarefa normal
    const baseGoal = (highPriorityPending * 2) + (pendingTasks - highPriorityPending);

    // Ajuste por nível
    const lvl = user?.level || 1;
    const levelMultiplier = 1 + (lvl * 0.05); // 5% por nível
    const adjustedGoal = Math.ceil(baseGoal * levelMultiplier);

    // Limitar entre 3 e 12 pomodoros
    const dailyGoal = pendingTasks === 0
        ? 0
        : Math.max(3, Math.min(12, adjustedGoal));

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
    // T-019 FIX: normalização universal antes de todos os motores
    const studyLogs = toArray(data?.studyLogs);
    const categories = toArray(data?.categories);
    const user = data?.user || {};
    const settings = data?.settings || {};

    const streak = calculateStudyStreak(studyLogs);
    const balance = analyzeSubjectBalance(categories);
    const efficiency = analyzeEfficiency(categories, studyLogs, user);
    const procrastination = detectProcrastination(categories, studyLogs);
    const goals = calculateDailyPomodoroGoal(categories, user);

    const pomodoroWork = settings?.pomodoroWork || 25;
    const pomodorosToday = countPomodorosToday(studyLogs, pomodoroWork);

    return {
        performance: {
            xp: data?.user?.xp || 0,
            level: data?.user?.level || 1,
            xpProgress: getXPProgress(data?.user?.xp || 0),
        },
        consistency: streak,
        balance,
        efficiency,
        procrastination,
        goals: {
            ...goals,
            current: pomodorosToday,
            progress: goals.daily <= 0
                ? 100
                : Math.max(0, Math.min(100, Math.round((pomodorosToday / goals.daily) * 100)))
        },
        overallScore: Math.round(
            (efficiency.score * 0.35) +
            (procrastination.score * 0.20) +
            (Math.min(100, 40 + streak.current * 2) * 0.20) +
            ((balance.status === 'excelente' ? 100
                : balance.status === 'atencao' ? 70
                    : balance.status === 'sem_dados' ? 65
                        : 40) * 0.25)
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

/**
 * Previsão de Cartões a Vencer (Due Forecast)
 * Uses the centralized flashcard date helpers for consistent TZ handling.
 * Past/overdue cards are bucketed into "Hoje".
 */
/**
 * Reusable pure helpers for SRS flashcard metrics (used by Due Forecast,
 * VerifiedStats, Retention, Coach, buildAchievementStats, etc).
 * Standardized mastery threshold: >= 3 reviews AND interval >= 6.
 */
export function getFlashcardDueTodayCount(decks = []) {
  const todayKey = getFlashcardTodayKey();
  let due = 0;
  const decksArray = toArray(decks);
  decksArray.forEach(deck => {
    toArray(deck?.cards).forEach(card => {
      if (!card?.due || card.due <= todayKey) due++;
    });
  });
  return due;
}

export function getFlashcardMasteryPct(decks = []) {
  let total = 0, mastered = 0;
  const decksArray = toArray(decks);
  decksArray.forEach(deck => {
    toArray(deck?.cards).forEach(card => {
      total++;
      if ((card.reviews || 0) >= 3 && (card.interval || 1) >= 6) mastered++;
    });
  });
  return total > 0 ? Math.round((mastered / total) * 100) : 0;
}

export function getFlashcardImmunity(decks = []) {
  const immunityMap = {};
  let globalTotal = 0;
  let globalMastered = 0;

  const decksArray = toArray(decks);
  decksArray.forEach(deck => {
    const subject = deck?.subject ? String(deck.subject).toLowerCase().trim() : 'geral';
    
    let total = 0, mastered = 0;
    toArray(deck?.cards).forEach(card => {
      total++;
      if ((card.reviews || 0) >= 3 && (card.interval || 1) >= 21) mastered++;
    });
    
    globalTotal += total;
    globalMastered += mastered;
    
    if (total > 0) {
      if (!immunityMap[subject]) immunityMap[subject] = { total: 0, mastered: 0 };
      immunityMap[subject].total += total;
      immunityMap[subject].mastered += mastered;
    }
  });

  const finalImmunityMap = {};
  for (const [subj, data] of Object.entries(immunityMap)) {
    if (data.total >= 5) {
      const mastery = data.mastered / data.total;
      finalImmunityMap[subj] = 1.0 - (mastery * 0.20);
    } else {
      finalImmunityMap[subj] = 1.0;
    }
  }

  const globalImmunityFactor = globalTotal >= 10 
    ? 1.0 - ((globalMastered / globalTotal) * 0.20) 
    : 1.0;

  return {
    globalImmunityFactor,
    subjectImmunityMap: finalImmunityMap
  };
}

export function getFlashcardTotalCards(decks = []) {
  const decksArray = toArray(decks);
  return decksArray.reduce((sum, d) => sum + toArray(d?.cards).length, 0);
}

export function getFlashcardDeckCount(decks = []) {
  const decksArray = toArray(decks);
  return decksArray.length;
}

export function computeFlashcardDueForecast(decks = [], horizon = 14) {
    const raw = Number(horizon);
    const safeHorizon = Math.max(0, Math.floor(isNaN(raw) ? 14 : raw));
    const todayKey = getFlashcardTodayKey();
    const counts = {};

    const safeDecks = toArray(decks);

    safeDecks.forEach(deck => {
        toArray(deck?.cards).forEach(card => {
            let dueKey = card && card.due ? String(card.due) : todayKey;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dueKey)) {
                dueKey = todayKey;
            }
            if (dueKey < todayKey) {
                dueKey = todayKey;
            }
            counts[dueKey] = (counts[dueKey] || 0) + 1;
        });
    });

    const forecast = [];
    let totalDueInHorizon = 0;
    let maxDaily = 0;

    const baseDate = new Date();

    for (let i = 0; i < safeHorizon; i++) {
        const key = i === 0
            ? todayKey
            : getFlashcardNextDueKey(i);  // i days ahead, normalized

        // For label + dateLabel we still use date-fns for nice display (from "today")
        const displayDate = new Date(baseDate.getTime());
        displayDate.setDate(displayDate.getDate() + i);

        const count = counts[key] || 0;

        totalDueInHorizon += count;
        if (count > maxDaily) maxDaily = count;

        let label;
        if (i === 0) label = 'Hoje';
        else if (i === 1) label = 'Amanhã';
        else label = `+${i}d`;

        forecast.push({
            day: i,
            dateKey: key,
            label,
            dateLabel: format(displayDate, 'dd/MM'),
            count,
            isToday: i === 0,
            isTomorrow: i === 1
        });
    }

    return {
        forecast,
        totalDueInHorizon,
        maxDaily,          // 0 is valid now
        horizon: safeHorizon
    };
}

