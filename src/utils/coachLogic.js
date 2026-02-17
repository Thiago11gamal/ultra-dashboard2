// ==================== CONSTANTES ====================
const DEFAULT_CONFIG = {
    SCORE_MAX: 50,
    RECENCY_MAX: 30,
    INSTABILITY_MAX: 30,
    PRIORITY_BOOST: 30,
    EFFICIENCY_MAX: 15,
    SRS_BOOST: 20, // ALTERADO: Reduzido de 40 para 20 para não ofuscar matérias atrasadas
    BASE_HOURS_THRESHOLD: 5
};

// ==================== FUNÇÕES AUXILIARES ====================

// Calcula tendência via regressão linear simples
function calculateTrend(scores) {
    if (!scores || scores.length < 3) return 0;

    // MELHORIA: Usa apenas os últimos 10 simulados para a tendência ser mais atual
    const recentScores = scores.slice(-10);
    const n = recentScores.length;

    const x = recentScores.map((_, i) => i);
    const y = recentScores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return 0;

    const slope = (n * sumXY - sumX * sumY) / denom;
    return slope * 10; // Escalar para facilitar interpretação
}

// Calcula desvio padrão
function calculateStandardDeviation(scores) {
    if (!scores || scores.length < 2) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / (scores.length - 1);
    return Math.sqrt(variance);
}

// Helper: Normalize to Midnight Local to avoid Timezone/Time-of-Day artifacts
const normalizeDate = (dateInput) => {
    if (!dateInput) return new Date(0);
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return new Date(0);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Calcula dias desde uma data
// eslint-disable-next-line no-unused-vars
function getDaysSince(date) {
    if (!date) return 999;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = now - new Date(date);
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Boost SRS baseado em dias
function getSRSBoost(daysSince, cfg) {
    if (daysSince === 1) return { boost: cfg.SRS_BOOST, label: "Revisão de 24h" };
    if (daysSince >= 7 && daysSince <= 8) return { boost: cfg.SRS_BOOST, label: "Revisão de 7 dias" };
    if (daysSince >= 30 && daysSince <= 32) return { boost: cfg.SRS_BOOST, label: "Revisão de 30 dias" };
    return { boost: 0, label: null };
}

// Crunch Multiplier ESCALONADO (Reta Final)
function getCrunchMultiplier(daysToExam) {
    if (!daysToExam || daysToExam > 60) return 1.0;
    if (daysToExam < 0) return 1.0; // Exam passed, no crunch
    if (daysToExam <= 3) return 2.5;
    if (daysToExam <= 7) return 2.0;
    if (daysToExam <= 14) return 1.5;
    if (daysToExam <= 30) return 1.2;
    return 1.0;
}

// ==================== FUNÇÃO PRINCIPAL ====================

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const logger = options.logger;

    // Use User Target Score (default 70 if missing)
    const targetScore = options.targetScore || 70;
    const weight = category.weight !== undefined ? category.weight : 100;

    // Calculate days to exam
    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        const examDate = new Date(options.user.goalDate);
        const today = new Date();
        daysToExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    }

    try {
        // 1. Calculate Weighted Average Score (Prioritize Recent Performance)
        const relevantSimulados = simulados.filter(s => s.subject === category.name);
        relevantSimulados.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        let averageScore = 0;
        if (relevantSimulados.length > 0) {
            const today = normalizeDate(new Date());
            const K = 0.07;
            const PESO_MIN = 0.03;

            // ALTERADO: Aumentado de 5.0 para 15.0 para destravar evolução rápida
            const DELTA = 15.0;

            const calculateExponentialScore = (dataset) => {
                let weightedSum = 0;
                let totalWeight = 0;

                dataset.forEach(s => {
                    const sScore = (s.correct / s.total) * 100;
                    const simDate = normalizeDate(s.date);
                    const days = Math.max(0, Math.floor((today - simDate) / (1000 * 60 * 60 * 24)));

                    let peso = Math.exp(-K * days);
                    if (peso < PESO_MIN) peso = PESO_MIN;

                    weightedSum += sScore * peso;
                    totalWeight += peso;
                });

                return totalWeight > 0 ? weightedSum / totalWeight : 50;
            };

            const todayBound = normalizeDate(new Date());
            const pastSimulados = relevantSimulados.filter(s => normalizeDate(s.date) < todayBound);
            const notaBruta = calculateExponentialScore(relevantSimulados);

            if (pastSimulados.length > 0) {
                const notaAnterior = calculateExponentialScore(pastSimulados);
                const diff = notaBruta - notaAnterior;
                let clampedDiff = diff;

                // Clamping agora permite saltos maiores (até 15 pontos)
                if (diff > DELTA) clampedDiff = DELTA;
                else if (diff < -DELTA) clampedDiff = -DELTA;

                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            averageScore = 50;
        }

        // 2. Calculate Days Since Last Study
        let daysSinceLastStudy = 30;
        let lastDate = normalizeDate(new Date(0));

        if (relevantSimulados.length > 0) {
            const simDate = normalizeDate(relevantSimulados[0].date);
            if (simDate > lastDate) lastDate = simDate;
        }

        const categoryStudyLogs = studyLogs.filter(log => log.categoryId === category.id);
        if (categoryStudyLogs.length > 0) {
            const sortedLogs = [...categoryStudyLogs].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            const logDate = normalizeDate(sortedLogs[0].date);
            if (logDate > lastDate) lastDate = logDate;
        }

        if (lastDate.getTime() > 0) {
            const today = normalizeDate(new Date());
            daysSinceLastStudy = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        }

        // 3. Calculate Standard Deviation and Trend
        const validForDev = relevantSimulados.filter(s => s.total > 0);
        const lastNScores = validForDev.slice(0, 10).map(s => (s.correct / s.total) * 100).reverse();
        const standardDeviation = calculateStandardDeviation(lastNScores);
        const trend = calculateTrend(lastNScores);

        // --- COMPONENT CALCULATION ---

        // A. Performance Score
        const scoreComponent = Math.min(cfg.SCORE_MAX, (100 - averageScore) * (cfg.SCORE_MAX / 100));

        // B. Recency (DAMPENED weight to avoid explosion)
        const weightDeviation = (weight / 100) - 1;
        const dampenedWeightMultiplier = 1 + (weightDeviation * 0.5); // 50% Dampening

        const effectiveRiskDays = daysSinceLastStudy * dampenedWeightMultiplier;
        const crunchMultiplier = getCrunchMultiplier(daysToExam);
        const recencyComponent = cfg.RECENCY_MAX * (1 - Math.exp(-effectiveRiskDays / 7)) * crunchMultiplier;

        // C. Instability (ADJUSTED BY TREND)
        let instabilityComponent = Math.min(cfg.INSTABILITY_MAX, standardDeviation * (cfg.INSTABILITY_MAX / 15));
        if (trend > 0) {
            instabilityComponent *= 0.5; // Improving = less urgent
        } else if (trend < -5) {
            instabilityComponent *= 1.3; // Getting worse = more urgent
        }

        // D. Priority Boost
        const hasHighPriorityTasks = category.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        // E. Efficiency Penalty
        let efficiencyPenalty = 0;
        const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + (log.minutes || 0), 0);
        const totalHours = totalMinutes / 60;

        if (totalHours > cfg.BASE_HOURS_THRESHOLD && averageScore < targetScore) {
            const gap = targetScore - averageScore;
            efficiencyPenalty = Math.min(cfg.EFFICIENCY_MAX, (totalHours / cfg.BASE_HOURS_THRESHOLD - 1) * gap * 0.5);
        }

        // F. SRS Boost
        const { boost: srsBoost, label: srsLabel } = getSRSBoost(daysSinceLastStudy, cfg);

        // G. Rotation Penalty (ALTERADO: Lógica mais inteligente)
        let rotationPenalty = 0;
        if (daysSinceLastStudy < 1) {
            // Se a nota for ruim (< 60), PERMITIR o grind (sem penalidade). 
            // Se for boa, penalizar levemente (15) para forçar rotação.
            if (averageScore < 60) {
                rotationPenalty = 0;
            } else {
                rotationPenalty = 15; // Reduzido de 30 para 15
            }
        } else if (daysSinceLastStudy === 1 && !srsLabel) {
            rotationPenalty = 5; // Reduzido de 10 para 5
        }

        // Reduce penalty if SRS is active
        if (srsBoost > 0) rotationPenalty *= 0.1;

        // --- DYNAMIC RAW_MAX ---
        const RAW_MAX_BASE = cfg.SCORE_MAX + cfg.RECENCY_MAX + cfg.INSTABILITY_MAX;
        const RAW_MAX_ACTUAL = RAW_MAX_BASE +
            (hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0) +
            (srsBoost > 0 ? cfg.SRS_BOOST : 0);

        // ALTERADO: Removido 'efficiencyPenalty' do cálculo para não esconder a matéria
        const rawScore = (scoreComponent + recencyComponent + instabilityComponent + priorityBoost + srsBoost) -
            (rotationPenalty);

        // Final Weight application (DAMPENED for middle ground)
        const finalWeightImpact = 1 + ((weight / 100) - 1) * 0.6; // 60% weight impact on total
        const weightedRaw = rawScore * finalWeightImpact;

        const MAX_POSSIBLE = RAW_MAX_ACTUAL * finalWeightImpact;
        const normalized = Math.max(0, Math.min(100, Math.round((weightedRaw / MAX_POSSIBLE) * 100)));

        // --- DYNAMIC RECOMMENDATION ---
        let recommendation = "";
        if (srsBoost > 0) {
            recommendation = `${srsLabel} - Não pule essa revisão!`;
        } else if (efficiencyPenalty > 5) {
            // O aviso continua aqui, mas a nota não caiu!
            recommendation = `⚠️ Alerta: ${totalHours.toFixed(1)}h sem melhora. Troque o método!`;
        } else if (daysSinceLastStudy > 14) {
            recommendation = `${daysSinceLastStudy} dias sem estudo - Risco de esquecer!`;
        } else if (trend < -5) {
            recommendation = `Nota caindo (${trend.toFixed(1)} pts) - Atenção urgente`;
        } else if (averageScore < targetScore - 20) {
            recommendation = `Nota Crítica: ${Math.round(averageScore)}% (Meta ${targetScore}%)`;
        } else if (averageScore >= targetScore) {
            recommendation = "No caminho certo! Continue consolidando";
        } else {
            recommendation = "Pratique com regularidade";
        }

        const result = {
            score: weightedRaw,
            normalizedScore: normalized,
            recommendation,
            details: {
                averageScore: Number(averageScore.toFixed(1)),
                daysSinceLastStudy,
                standardDeviation: Number(standardDeviation.toFixed(1)),
                trend: Number(trend.toFixed(1)),
                totalHours: Number(totalHours.toFixed(1)),
                hasData: relevantSimulados.length > 0 || categoryStudyLogs.length > 0,
                hasSimulados: relevantSimulados.length > 0,
                hasHighPriorityTasks,
                efficiencyPenalty: Number(efficiencyPenalty.toFixed(1)),
                weight,
                srsLabel,
                crunchMultiplier: Number(crunchMultiplier.toFixed(1)),
                humanReadable: {
                    "Média": `${Math.round(averageScore)}%`,
                    "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                    "Tendência": trend > 0.5 ? `↑ +${trend.toFixed(1)}` : trend < -0.5 ? `↓ ${trend.toFixed(1)}` : "→ Estável",
                    "Instabilidade": `±${standardDeviation.toFixed(1)} pts`,
                    "Peso da Matéria": `x${(weight / 100).toFixed(1)}`,
                    "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
                },
                components: {
                    scoreComponent: Number(scoreComponent.toFixed(2)),
                    recencyComponent: Number(recencyComponent.toFixed(2)),
                    instabilityComponent: Number(instabilityComponent.toFixed(2)),
                    priorityBoost: Number(priorityBoost.toFixed(2)),
                    srsBoost: Number(srsBoost.toFixed(2)),
                    efficiencyPenalty: Number(efficiencyPenalty.toFixed(2)),
                    rotationPenalty: Number(rotationPenalty.toFixed(2))
                }
            }
        };

        if (typeof logger === 'function') {
            try { logger({ categoryId: category.id, name: category.name, urgency: result }); } catch { /* ignore */ }
        }

        return result;
    } catch (err) {
        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo",
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

    const top = ranked[0];
    if (!top) return null;

    return {
        ...top,
        weakestTopic: getWeakestTopic(top, simulados)
    };
};

// Helper to find the weakest topic in a category (IMPROVED)
const getWeakestTopic = (category, simulados = []) => {
    const history = (category.simuladoStats && category.simuladoStats.history) ? category.simuladoStats.history : [];
    const tasks = category.tasks || [];
    const topicMap = {};

    // Get count of category simulados for context
    const categorySimuladoCount = simulados.filter(s => s.subject === category.name).length;

    // 1. Populate from History
    history.forEach(entry => {
        const entryDate = new Date(entry.date || 0);
        const topics = entry.topics || [];
        topics.forEach(t => {
            const name = (typeof t.name === 'string' ? t.name : "Tópico Desconhecido").trim();
            if (!topicMap[name]) {
                topicMap[name] = {
                    total: 0,
                    correct: 0,
                    lastSeen: new Date(0),
                    scores: []
                };
            }
            topicMap[name].total += (parseInt(t.total) || 0);
            topicMap[name].correct += (parseInt(t.correct) || 0);

            const topicTotal = parseInt(t.total) || 0;
            const topicCorrect = parseInt(t.correct) || 0;
            if (topicTotal > 0) {
                topicMap[name].scores.push((topicCorrect / topicTotal) * 100);
            }

            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });

    // 2. Populate from Tasks
    tasks.forEach(task => {
        const name = (task.text || task.title || "").trim();
        if (!name) return;

        if (!topicMap[name]) {
            topicMap[name] = {
                total: 0,
                correct: 0,
                lastSeen: new Date(0),
                completed: !!task.completed,
                scores: []
            };
        } else {
            topicMap[name].completed = !!task.completed;
        }

        if (task.priority === 'high') topicMap[name].manualPriority = 40;
        else if (task.priority === 'medium') topicMap[name].manualPriority = 20;
    });

    const today = new Date();

    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const trend = calculateTrend(data.scores.slice(-3));

        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 60;
        } else {
            daysSince = Math.floor((today - data.lastSeen) / (1000 * 60 * 60 * 24));
        }

        const priorityBoost = data.manualPriority || 0;

        // Base urgency formula
        let urgencyScore = ((100 - percentage) * 2) + daysSince + priorityBoost;

        // Reduce urgency of untested topics if category has data
        if (percentage === 0 && data.scores.length === 0 && categorySimuladoCount > 3) {
            urgencyScore *= 0.7;
        }

        // Boost for declining topics
        if (trend < -10) urgencyScore *= 1.2;

        return {
            name,
            total: data.total,
            percentage,
            daysSince,
            trend: Number(trend.toFixed(1)),
            priorityBoost,
            urgencyScore,
            isUntested: data.total === 0
        };
    });

    // Sort
    topics.sort((a, b) => {
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
        return b.urgencyScore - a.urgencyScore;
    });

    return topics.length > 0 ? topics[0] : null;
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore || 70;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    const top3 = ranked.slice(0, 3);

    const performDeepCheck = (category) => {
        const categoryLogs = studyLogs.filter(l => l.categoryId === category.id);
        const categorySims = simulados.filter(s => s.subject === category.name);

        const totalHours = categoryLogs.reduce((acc, l) => acc + (l.minutes || 0), 0) / 60;
        const totalQuestions = categorySims.reduce((acc, s) => acc + (s.total || 0), 0);

        const avgScore = categorySims.length > 0
            ? categorySims.reduce((acc, s) => acc + ((s.total || 0) > 0 ? (s.correct / s.total * 100) : 0), 0) / categorySims.length
            : 0;

        const dynamicThreshold = avgScore > (targetScore + 10) ? 0.5 : (avgScore > (targetScore - 10) ? 1.0 : 2.0);
        const questionsPerHour = totalHours > 0 ? totalQuestions / totalHours : 0;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Você estudou ${totalHours.toFixed(1)}h de ${category.name} mas fez poucas questões (${questionsPerHour.toFixed(1)}/h). Meta para seu nível: >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };

    const suggestedTasks = top3.map(cat => {
        const weakTopic = getWeakestTopic(cat, simulados);
        const topicLabel = weakTopic ? `[${weakTopic.name}] ` : `[Revisão Geral] `;
        const categorySims = simulados.filter(s => s.subject === cat.name);

        // 0. SRS Trigger
        if (cat.urgency?.details?.srsLabel) {
            return {
                id: `${cat.id}-srs-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}🧠 ${cat.urgency.details.srsLabel}. Revise para não esquecer!`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Revisão Espaçada (SRS) Ativada",
                    label: cat.urgency.details.srsLabel,
                    metrics: cat.urgency.details.humanReadable,
                    verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                }
            };
        }

        // 0.5 Pseudo-Study Trap
        const trapCheck = performDeepCheck(cat);
        if (trapCheck.isTrap) {
            return {
                id: `${cat.id}-trap-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}⚠️ Alerta de Método. Foco TOTAL em exercícios hoje!`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Detector de Pseudo-Estudo",
                    details: "Alta carga horária com baixíssimo volume de exercícios.",
                    metrics: cat.urgency.details.humanReadable,
                    verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                }
            };
        }

        // PLATEAU DETECTOR (with trend)
        if (cat.urgency?.details?.hasData &&
            categorySims.length >= 3 &&
            cat.urgency.details.averageScore < targetScore &&
            cat.urgency.details.standardDeviation < 5 &&
            cat.urgency.details.trend >= -1 && cat.urgency.details.trend <= 1) {

            return {
                id: `${cat.id}-plateau-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}🛑 Alerta de Estagnação. Sua nota travou. Revise a teoria!`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Estagnação Detectada",
                    metrics: cat.urgency.details.humanReadable,
                    verdict: "Nota estagnada com baixa oscilação. Requer revisão teórica profunda ou novo método."
                }
            };
        }

        // DECLINING PERFORMANCE WARNING
        if (cat.urgency?.details?.trend < -5) {
            return {
                id: `${cat.id}-declining-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}📉 Nota em queda! Atenção urgente necessária.`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Desempenho em Queda",
                    metrics: cat.urgency.details.humanReadable,
                    verdict: cat.urgency.recommendation
                }
            };
        }

        // Weak Topic
        const highPriorityTask = cat.tasks?.find(t => !t.completed && t.priority === 'high');

        if (weakTopic && (weakTopic.percentage < 70 || weakTopic.isUntested || weakTopic.manualPriority > 0)) {
            let taskTitle = "";
            let reasonStr = "";
            if (weakTopic.isUntested) {
                taskTitle = `🚨 (Novo). Comece agora!`;
                reasonStr = "Tópico Novo / Não Testado";
            } else if (weakTopic.manualPriority > 0) {
                taskTitle = `🚨 (Prioridade). Nota: ${Math.round(weakTopic.percentage)}%`;
                reasonStr = "Alta Prioridade Manual";
            } else {
                taskTitle = `🚨 (${Math.round(weakTopic.percentage)}% de acerto). Revise agora!`;
                reasonStr = "Baixa Performance";
            }

            return {
                id: `${cat.id}-weektopic-${weakTopic.name}-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}${taskTitle}`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: `Tópico Selecionado: ${weakTopic.name}`,
                    details: reasonStr,
                    metrics: cat.urgency.details.humanReadable,
                    categoryDetails: {
                        "Urgência Total": Math.round(cat.urgency.score),
                        ...cat.urgency.details.components
                    },
                    topicDetails: {
                        "Nota do Tópico": Math.round(weakTopic.percentage) + "%",
                        "Dias sem Ver": weakTopic.daysSince,
                        "Tendência": weakTopic.trend > 0 ? `↑ ${weakTopic.trend}` : `↓ ${weakTopic.trend}`,
                        "Bônus de Prioridade": weakTopic.priorityBoost,
                        "Urgência Calculada": Math.round(weakTopic.urgencyScore)
                    }
                }
            };
        } else if (highPriorityTask) {
            return {
                id: `${cat.id}-priority-${highPriorityTask.id}`,
                text: `Foco em ${cat.name}: ${topicLabel}${highPriorityTask.title || highPriorityTask.text}`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Tarefa Prioritária (Manual)",
                    categoryScore: Math.round(cat.urgency.score)
                }
            };
        } else {
            return {
                id: `${cat.id}-general-review-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}Revisar erros e fazer 10 questões`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Revisão Geral (Sem ponto fraco específico)",
                    metrics: cat.urgency.details.humanReadable,
                    categoryDetails: {
                        "Total Urgency": Math.round(cat.urgency.score),
                        ...cat.urgency.details.components
                    }
                }
            };
        }
    });

    return suggestedTasks;
};
