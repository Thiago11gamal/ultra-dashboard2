// Configurável: pesos e limites usados pelo motor (pode ser extraído para arquivo separado)
const DEFAULT_CONFIG = {
    SCORE_MAX: 50,
    RECENCY_MAX: 30,
    INSTABILITY_MAX: 20,
    PRIORITY_BOOST: 10,
    EFFICIENCY_MAX: 15,
    // Usado para normalização final (soma dos máximos acima)
    RAW_MAX: 50 + 30 + 20 + 10 + 15
};

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const logger = options.logger;

    try {
        // 1. Calculate Average Score for this category
        const relevantSimulados = simulados.filter(s => s.subject === category.name);

        let averageScore = 0;
        if (relevantSimulados.length > 0) {
            const totalScore = relevantSimulados.reduce((acc, curr) => acc + (curr.correct / curr.total) * 100, 0);
            averageScore = totalScore / relevantSimulados.length;
        } else {
            averageScore = 50;
        }

        // 2. Calculate Days Since Last Study (Based on actual simulado data)
        let daysSinceLastStudy = 7; // Default: 7 days if no data

        if (relevantSimulados.length > 0) {
            const mostRecentDate = relevantSimulados.reduce((latest, s) => {
                const sDate = new Date(s.date);
                return sDate > latest ? sDate : latest;
            }, new Date(0));

            const today = new Date();
            daysSinceLastStudy = Math.floor((today - mostRecentDate) / (1000 * 60 * 60 * 24));
        }

        // 3. Calculate Standard Deviation (Consistency/Instability)
        let standardDeviation = 0;

        if (relevantSimulados.length >= 2) {
            const scores = relevantSimulados.map(s => (s.correct / s.total) * 100);
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1);
            standardDeviation = Math.sqrt(variance);
        }

        // Component contributions (scaled according to config)
        const scoreComponent = Math.min(cfg.SCORE_MAX, (100 - averageScore) * (cfg.SCORE_MAX / 100));
        const recencyComponent = cfg.RECENCY_MAX * (1 - Math.exp(-daysSinceLastStudy / 5));
        const instabilityComponent = Math.min(cfg.INSTABILITY_MAX, standardDeviation * (cfg.INSTABILITY_MAX / 15));

        const hasHighPriorityTasks = category.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        let efficiencyPenalty = 0;
        if (studyLogs && studyLogs.length > 0 && relevantSimulados.length > 0) {
            const categoryStudyLogs = studyLogs.filter(log => log.categoryId === category.id);
            const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + (log.minutes || 0), 0);
            const totalHours = totalMinutes / 60;

            if (totalHours > 5 && averageScore < 70) {
                efficiencyPenalty = Math.min(cfg.EFFICIENCY_MAX, (totalHours / 10) * (70 - averageScore) / 10 * cfg.EFFICIENCY_MAX);
            }
        }

        const rawScore = scoreComponent + recencyComponent + instabilityComponent + priorityBoost + efficiencyPenalty;

        const weight = category.weight !== undefined ? category.weight : 100;
        const weightedRaw = rawScore * (weight / 100);

        // Normalize to 0-100 based on configured RAW_MAX
        const normalized = Math.max(0, Math.min(100, Math.round((weightedRaw / (cfg.RAW_MAX * (weight / 100))) * 100)));

        const result = {
            score: weightedRaw,
            normalizedScore: normalized,
            details: {
                averageScore: Number(averageScore.toFixed(1)),
                daysSinceLastStudy,
                standardDeviation: Number(standardDeviation.toFixed(1)),
                hasData: relevantSimulados.length > 0,
                hasHighPriorityTasks,
                efficiencyPenalty: Number(efficiencyPenalty.toFixed(1)),
                weight,
                components: {
                    scoreComponent: Number(scoreComponent.toFixed(2)),
                    recencyComponent: Number(recencyComponent.toFixed(2)),
                    instabilityComponent: Number(instabilityComponent.toFixed(2)),
                    priorityBoost: Number(priorityBoost.toFixed(2))
                }
            }
        };

        if (typeof logger === 'function') {
            try { logger({ categoryId: category.id, name: category.name, urgency: result }); } catch (e) { }
        }

        return result;
    } catch (err) {
        return {
            score: 0,
            normalizedScore: 0,
            details: { hasData: false, error: err.message }
        };
    }
};

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || categories.length === 0) return null;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    return ranked[0]; // Return the most urgent category
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    // Get top 3 urgent categories
    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    const top3 = ranked.slice(0, 3);

    // Convert to task objects
    // If category has high-priority tasks, suggest them specifically
    return top3.map(cat => {
        const highPriorityTask = cat.tasks?.find(t => !t.completed && t.priority === 'high');

        if (highPriorityTask) {
            return {
                id: Date.now() + Math.random(),
                text: `Foco em ${cat.name}: ${highPriorityTask.title || highPriorityTask.text}`,
                completed: false,
                categoryId: cat.id
            };
        } else {
            return {
                id: Date.now() + Math.random(),
                text: `Foco em ${cat.name}: Revisar erros e fazer 10 questões`,
                completed: false,
                categoryId: cat.id
            };
        }
    });
};
