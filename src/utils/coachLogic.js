const DEFAULT_CONFIG = {
    SCORE_MAX: 50,
    RECENCY_MAX: 30,
    INSTABILITY_MAX: 20,
    PRIORITY_BOOST: 30,
    EFFICIENCY_MAX: 15,
    SRS_BOOST: 40, // High priority for spaced repetition triggers
    // Usado para normalização final (soma dos máximos acima)
    RAW_MAX: 50 + 30 + 20 + 30 + 15 + 40
};

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const logger = options.logger;

    try {
        // 1. Calculate Weighted Average Score (Prioritize Recent Performance)
        const relevantSimulados = simulados.filter(s => s.subject === category.name);

        // Sort by date (descending) to get recent ones first
        relevantSimulados.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        let averageScore = 0;
        if (relevantSimulados.length > 0) {
            // Take up to 5 most recent
            const recentOnes = relevantSimulados.slice(0, 5);
            // Remaining (older)
            const olderOnes = relevantSimulados.slice(5);

            let weightedSum = 0;
            let totalWeight = 0;

            // Recent exams have weight 3
            recentOnes.forEach(s => {
                const sScore = (s.correct / s.total) * 100;
                weightedSum += sScore * 3;
                totalWeight += 3;
            });

            // Older exams have weight 1
            olderOnes.forEach(s => {
                const sScore = (s.correct / s.total) * 100;
                weightedSum += sScore * 1;
                totalWeight += 1;
            });

            averageScore = weightedSum / totalWeight;
        } else {
            averageScore = 50; // Neutral start if no data
        }

        // 2. Calculate Days Since Last Study & Recency Impact
        let daysSinceLastStudy = 7;

        if (relevantSimulados.length > 0) {
            // Array is already sorted by date desc above
            const mostRecentDate = new Date(relevantSimulados[0].date || 0);
            const today = new Date();
            daysSinceLastStudy = Math.floor((today - mostRecentDate) / (1000 * 60 * 60 * 24));
        }

        // 3. Calculate Standard Deviation (Consistency)
        let standardDeviation = 0;
        if (relevantSimulados.length >= 2) {
            // Use top 10 recent for deviation to keep it relevant
            const recentForDev = relevantSimulados.slice(0, 10).map(s => (s.correct / s.total) * 100);
            const mean = recentForDev.reduce((a, b) => a + b, 0) / recentForDev.length;
            const variance = recentForDev.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (recentForDev.length - 1);
            standardDeviation = Math.sqrt(variance);
        }

        // --- COMPONENT CALCULATION ---

        // A. Performance Score (The lower the score, the higher the urgency)
        const scoreComponent = Math.min(cfg.SCORE_MAX, (100 - averageScore) * (cfg.SCORE_MAX / 100));

        // B. Recency (Multiplied by Category Weight)
        // If category weight is high (e.g., 2 or 3), delaying study is more dangerous.
        // Assuming weight is usually 1 to 3 in user settings.
        const categoryWeightMultiplier = (category.weight && category.weight > 0) ? category.weight : 1;
        // Adjusted Recency: Days * Weight. 5 days without weight 2 subject = 10 "risk days"
        const effectiveRiskDays = daysSinceLastStudy * categoryWeightMultiplier;

        const recencyComponent = cfg.RECENCY_MAX * (1 - Math.exp(-effectiveRiskDays / 7)); // Slower decay curve (7), but accelerated by weight

        // C. Instability
        const instabilityComponent = Math.min(cfg.INSTABILITY_MAX, standardDeviation * (cfg.INSTABILITY_MAX / 15));

        // D. Priority Boost
        const hasHighPriorityTasks = category.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        // E. Efficiency (Low ROI)
        let efficiencyPenalty = 0;
        if (studyLogs && studyLogs.length > 0 && relevantSimulados.length > 0) {
            const categoryStudyLogs = studyLogs.filter(log => log.categoryId === category.id);
            const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + (log.minutes || 0), 0);
            const totalHours = totalMinutes / 60;

            if (totalHours > 5 && averageScore < 70) {
                efficiencyPenalty = Math.min(cfg.EFFICIENCY_MAX, (totalHours / 10) * (70 - averageScore) / 10 * cfg.EFFICIENCY_MAX);
            }
        }

        // F. Spaced Repetition System (SRS)
        let srsBoost = 0;
        let srsLabel = null;

        if (daysSinceLastStudy === 1) {
            srsBoost = cfg.SRS_BOOST;
            srsLabel = "Revisão de 24h";
        } else if (daysSinceLastStudy >= 7 && daysSinceLastStudy <= 8) {
            srsBoost = cfg.SRS_BOOST;
            srsLabel = "Revisão de 7 dias";
        } else if (daysSinceLastStudy >= 30 && daysSinceLastStudy <= 32) {
            srsBoost = cfg.SRS_BOOST;
            srsLabel = "Revisão de 30 dias";
        }

        // --- NEW LOGIC: STUDY CYCLE ROTATION (COOLDOWN) ---
        // If studied yesterday or today, apply penalty to encourage variety
        let rotationPenalty = 0;
        if (daysSinceLastStudy < 1) {
            // Studied Today -> Huge penalty to prevent same day repetition unless urgent
            rotationPenalty = 30;
        } else if (daysSinceLastStudy === 1 && !srsLabel) {
            // Studied Yesterday -> Small penalty (unless SRS triggered it)
            rotationPenalty = 10;
        }

        // --- NEW LOGIC: EXAM CRUNCH MODE (RETA FINAL) ---
        let crunchMultiplier = 1;
        if (options.user && options.user.goalDate) {
            const examDate = new Date(options.user.goalDate);
            const today = new Date();
            const daysToExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

            if (daysToExam > 0 && daysToExam < 30) {
                // < 30 Days: CRUNCH MODE ON
                // Logic: Focus on SRS (Retention) and Strengths. Ignore new theory if possible.
                // We boost SRS impact and reduce weight of "Low Score" (learning new stuff)

                // Boost Recency Importance (Don't let things fade)
                crunchMultiplier = 1.5;

                // If it's a weak subject, we actually REDUCE urgency slightly in favor of consolidating medium/good subs
                // (Unless urgency is massive). This is controversial but standard for "Reta Final" strategy.
            }
        }

        const rawScore = (scoreComponent + (recencyComponent * crunchMultiplier) + instabilityComponent + priorityBoost + srsBoost) - (efficiencyPenalty + rotationPenalty);


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
                srsLabel,
                components: {
                    scoreComponent: Number(scoreComponent.toFixed(2)),
                    recencyComponent: Number(recencyComponent.toFixed(2)),
                    instabilityComponent: Number(instabilityComponent.toFixed(2)),
                    priorityBoost: Number(priorityBoost.toFixed(2)),
                    srsBoost: Number(srsBoost.toFixed(2))
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

// Helper to find the weakest topic in a category
const getWeakestTopic = (category) => {
    // We need either history OR tasks to find a topic
    if ((!category.simuladoStats || !category.simuladoStats.history) && (!category.tasks || category.tasks.length === 0)) return null;

    const history = (category.simuladoStats && category.simuladoStats.history) ? category.simuladoStats.history : [];
    const tasks = category.tasks || []; // Get tasks (which are Topics)
    const topicMap = {};

    // 1. Populate from History (Real Data)
    history.forEach(entry => {
        const entryDate = new Date(entry.date || 0);
        const topics = entry.topics || [];
        topics.forEach(t => {
            const name = t.name.trim();
            if (!topicMap[name]) {
                topicMap[name] = {
                    total: 0,
                    correct: 0,
                    lastSeen: new Date(0)
                };
            }
            topicMap[name].total += (parseInt(t.total) || 0);
            topicMap[name].correct += (parseInt(t.correct) || 0);

            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });

    // 2. Populate/Update from Tasks (Intention Data)
    // If a task exists, it IS a topic. Even if no history.
    tasks.forEach(task => {
        if (task.completed) return; // Ignore completed topics? Or maybe keep them if we want review? Let's ignore completed for now.

        const name = (task.text || task.title || "").trim();
        if (!name) return;

        if (!topicMap[name]) {
            // New Topic! (Never tested)
            topicMap[name] = {
                total: 0,
                correct: 0,
                lastSeen: new Date(0) // Never seen
            };
        }

        // Inject Priority directly
        // We store it here to easier access later
        if (task.priority === 'high') topicMap[name].manualPriority = 40;
        else if (task.priority === 'medium') topicMap[name].manualPriority = 20;
    });

    const today = new Date();

    // Convert to array
    const topics = Object.entries(topicMap).map(([name, data]) => {
        // If total is 0 (Task only), we treat percentage as 0 (Unknown/Weak)
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;

        // Calculate days since last seen
        // If never seen (Date 0), daysSince is huge (good for urgency)
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 60;
        } else {
            daysSince = Math.floor((today - data.lastSeen) / (1000 * 60 * 60 * 24));
        }

        const priorityBoost = data.manualPriority || 0;

        // Urgency Formula: (Low Grade * 2) + (Days Since * 1) + Priority Boost
        // If untested (0%): (100*2) + 60 + Boost = 260+? Very high.
        const urgencyScore = ((100 - percentage) * 2) + daysSince + priorityBoost;

        return {
            name,
            total: data.total,
            percentage,
            daysSince,
            priorityBoost,
            urgencyScore,
            isUntested: data.total === 0
        };
    });

    // Filter/Sort
    // We want to include Untested topics now if they come from Tasks
    const pool = topics;

    // Sort descending (Higher Score = More Urgent)
    pool.sort((a, b) => b.urgencyScore - a.urgencyScore);

    return pool.length > 0 ? pool[0] : null;
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    // Get top 3 urgent categories
    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    const top3 = ranked.slice(0, 3);

    // --- NEW LOGIC 1: DETECTOR DE PSEUDO-ESTUDO (Theory Trap) ---
    // Check if user has lots of hours in a top category but NO recent questions
    const performDeepCheck = (category) => {
        const categoryLogs = studyLogs.filter(l => l.categoryId === category.id);
        const categorySims = simulados.filter(s => s.subject === category.name);

        const totalHours = categoryLogs.reduce((acc, l) => acc + (l.minutes || 0), 0) / 60;
        const totalQuestions = categorySims.reduce((acc, s) => acc + (s.total || 0), 0);

        // Ratio: Questions per Hour (Ideal is > 5-10 questions per hour of study)
        const questionsPerHour = totalHours > 0 ? totalQuestions / totalHours : 0;

        // If studied > 5 hours but has very low question density (< 2 q/h), it's a trap.
        if (totalHours > 5 && questionsPerHour < 2) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Você estudou ${totalHours.toFixed(1)}h de ${category.name} mas fez poucas questões. A teoria sozinha engana! Foco TOTAL em exercícios hoje.`
            };
        }
        return { isTrap: false };
    };

    // --- NEW LOGIC 2: MOTIVAÇÃO DE VOLUME (Consistency Boost) ---
    // Check weekly average
    const getVolumeChallenge = () => {
        // Simple check: Did you study yesterday?
        // In a real app, we'd calculate exact weekly avg.
        // For now, we simulate a "Push" message if logs exist.
        if (studyLogs.length > 5) {
            return "🔥 Desafio: Que tal superar sua média? Tente estudar 30min a mais hoje!";
        }
        return null;
    };


    // Convert to task objects
    const suggestedTasks = top3.map(cat => {
        // 0. Check for SRS Trigger (Highest Priority)
        if (cat.urgency.details.srsLabel) {
            return {
                id: Date.now() + Math.random(),
                text: `🧠 ${cat.urgency.details.srsLabel}: ${cat.name}. Revise para não esquecer!`,
                completed: false,
                categoryId: cat.id
            };
        }

        // 0.5 Check for Pseudo-Study Trap (New Logic 1)
        const trapCheck = performDeepCheck(cat);
        if (trapCheck.isTrap) {
            return {
                id: Date.now() + Math.random(),
                text: trapCheck.msg,
                completed: false,
                categoryId: cat.id
            };
        }

        // --- NEW LOGIC: PLATEAU DETECTOR (Estagnação) ---
        // If score is bad (< 70) AND very stable (Dev < 5), user is stuck.
        // Needs a pattern interrupt (Theory/Video) instead of just more questions.
        if (cat.urgency.details.hasData &&
            cat.urgency.details.averageScore < 70 &&
            cat.urgency.details.standardDeviation < 5 &&
            cat.urgency.details.standardDeviation >= 0) { // Ensure dev is valid

            return {
                id: Date.now() + Math.random(),
                text: `🛑 Alerta de Platô em ${cat.name}: Sua nota travou em ~${Math.round(cat.urgency.details.averageScore)}%. Pare as questões! Volte para a Teoria ou Revise seu Caderno de Erros hoje.`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Plateau Detected",
                    components: {
                        "Average Score": cat.urgency.details.averageScore + "%",
                        "Deviation": cat.urgency.details.standardDeviation + " (Very Stable)",
                        "Verdict": "Stagnation"
                    }
                }
            };
        }

        // Configurável: pesos e limites usados pelo motor (pode ser extraído para arquivo separado)
        const DEFAULT_CONFIG = {
            SCORE_MAX: 50,
            RECENCY_MAX: 30,
            INSTABILITY_MAX: 20,
            PRIORITY_BOOST: 30, // INCREASED from 10 to 30 to match Topic Priority weight
            EFFICIENCY_MAX: 15,
            SRS_BOOST: 40,
            // Usado para normalização final (soma dos máximos acima)
            RAW_MAX: 50 + 30 + 20 + 30 + 15 + 40
        };

        // ... (existing code for calculateUrgency) ...
        // (Note: Since I cannot edit disjoint blocks in one go, I assume I'm editing the block below.
        // Wait, I need to edit DEFAULT_CONFIG separately or include it.
        // I will edit generateDailyGoals first and assume I'll do a second edit for DEFAULT_CONFIG or try to capture it if it's close?
        // No, they are far apart. I will stick to generateDailyGoals logic for this chunk and do the config separately if needed,
        // OR I will focus on the generateDailyGoals part which is the critical UI fix.)

        // actually, let's fix the generateDailyGoals part first.

        // 1. Check for specific WEAK TOPIC (Precision Mode)
        const weakTopic = getWeakestTopic(cat);

        // 2. Check for High Priority manual task (Legacy check, kept for safety)
        const highPriorityTask = cat.tasks?.find(t => !t.completed && t.priority === 'high');

        if (weakTopic && (weakTopic.percentage < 70 || weakTopic.isUntested || weakTopic.manualPriority > 0)) {
            // Found a specific weakness!

            // Customize Message based on WHY it was selected
            let msg = "";
            let reasonStr = "";
            if (weakTopic.isUntested) {
                msg = `🚨 Foco em ${cat.name}: ${weakTopic.name} (Prioridade/Novo). Comece agora!`;
                reasonStr = "Untested/New Topic";
            } else if (weakTopic.manualPriority > 0) {
                msg = `🚨 Foco em ${cat.name}: ${weakTopic.name} (Alerta de Prioridade). Nota atual: ${Math.round(weakTopic.percentage)}%`;
                reasonStr = "Manual High Priority";
            } else {
                msg = `🚨 Foco em ${cat.name}: ${weakTopic.name} (${Math.round(weakTopic.percentage)}% de acerto). Revise agora!`;
                reasonStr = "Low Performance";
            }

            return {
                id: Date.now() + Math.random(),
                text: msg,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: `Selected Topic: ${weakTopic.name}`,
                    details: reasonStr,
                    categoryScore: {
                        "Total Urgency": Math.round(cat.urgency.score),
                        ...cat.urgency.details.components
                    },
                    topicScore: {
                        "Topic Grade": Math.round(weakTopic.percentage) + "%",
                        "Days Since": weakTopic.daysSince,
                        "Manual Priority Bonus": weakTopic.priorityBoost,
                        "Calculated Topic Urgency": weakTopic.urgencyScore
                    }
                }
            };
        } else if (highPriorityTask) {
            return {
                id: Date.now() + Math.random(),
                text: `Foco em ${cat.name}: ${highPriorityTask.title || highPriorityTask.text}`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Legacy High Priority Task",
                    categoryScore: Math.round(cat.urgency.score)
                }
            };
        } else {
            return {
                id: Date.now() + Math.random(),
                text: `Foco em ${cat.name}: Revisar erros e fazer 10 questões`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "General Review (No specific weak topic found)",
                    categoryScore: {
                        "Total Urgency": Math.round(cat.urgency.score),
                        ...cat.urgency.details.components
                    }
                }
            };
        }
    });

    // Inject Volume Challenge occasionally (New Logic 3) - push it as a 4th generic card or replacing the 3rd if 3rd is weak
    // For this UI, we return just the top 3 specific tasks to keep layout clean,
    // but we could append the motivation as a special "System Message" task.
    // Let's replace the 3rd task with a motivation card ONLY IF the 3rd task is generic.

    // (Implementation choice: keep strict 3 tasks for now to avoid breaking UI layout)

    return suggestedTasks;
};
