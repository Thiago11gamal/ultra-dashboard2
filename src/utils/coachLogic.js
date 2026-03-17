// ==================== CONSTANTES ====================
import { calculateTrend, standardDeviation as calculateStandardDeviation } from '../engine/stats';
import { normalize } from './normalization';

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

// Calcula desvio padrão — unificado com Bayesian Shrinkage via stats.js
// (função local removida; agora usa import de calculateStandardDeviation acima)

// Helper: Normalize to Midnight Local to avoid Timezone/Time-of-Day artifacts
const normalizeDate = (dateInput) => {
    if (!dateInput) return new Date(0);
    try {
        const d = typeof dateInput === 'string' && dateInput.length === 10
            ? new Date(`${dateInput}T12:00:00`)
            : new Date(dateInput);
        if (isNaN(d.getTime())) return new Date(0);
        d.setHours(0, 0, 0, 0);
        return d;
    } catch (e) {
        return new Date(0);
    }
};

// Boost SRS baseado em dias
function getSRSBoost(daysSince, cfg) {
    if (daysSince === 1) return { boost: cfg.SRS_BOOST, label: "Revisão de 24h" };
    if (daysSince >= 3 && daysSince <= 5) return { boost: cfg.SRS_BOOST, label: "Revisão de 3 dias" };
    if (daysSince >= 7 && daysSince <= 10) return { boost: cfg.SRS_BOOST, label: "Revisão de 7 dias" };
    if (daysSince >= 30) return { boost: cfg.SRS_BOOST, label: "Revisão Crítica (30+ dias)" };
    return { boost: 0, label: null };
}

// Crunch Multiplier ESCALONADO (Reta Final)
function getCrunchMultiplier(daysToExam) {
    if (daysToExam === undefined || daysToExam === null || daysToExam > 60) return 1.0;
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
    // Bug fix: use ?? not || so that targetScore=0 is preserved (edge case but valid)
    const targetScore = options.targetScore ?? 70;
    // weight is stored on 0-10 scale (Monte Carlo). Default 5 (medium) if undefined/0.
    const rawWeight = (category.weight !== undefined && category.weight > 0) ? category.weight : 5;
    // Normalize to 0-100 scale for internal formulas (same as before)
    const weight = rawWeight * 10;
    // Human-readable label for display (1=Baixa, 2=Média, 3=Alta)
    const weightLabel = rawWeight <= 3 ? '1 — Baixa' : rawWeight <= 7 ? '2 — Média' : '3 — Alta';

    // Calculate days to exam
    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        const examDate = new Date(options.user.goalDate);
        const today = new Date();
        daysToExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    }

    try {
        // 1. Calculate Weighted Average Score (Prioritize Recent Performance)
        // BUG 6 FIX: use normalize() for case-insensitive matching to avoid missing simulados
        // when category name has different casing (e.g. "Direito" vs "direito")
        const catNormalized = normalize(category.name);
        const relevantSimulados = simulados.filter(s => normalize(s.subject) === catNormalized);
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
                    const total = s.total || 0;
                    const correct = s.correct || 0;
                    const sScore = total > 0 ? (correct / total) * 100 : 0;

                    const simDate = normalizeDate(s.date);
                    const days = Math.max(0, Math.floor((today - simDate) / (1000 * 60 * 60 * 24)));

                    let peso = Math.exp(-K * days);
                    if (peso < PESO_MIN) peso = PESO_MIN;

                    weightedSum += sScore * peso;
                    totalWeight += peso;
                });

                return totalWeight > 0 ? weightedSum / totalWeight : 50;
            };

            const currentBound = normalizeDate(new Date());
            // BUG-01 FIX: pastSimulados should EXCLUDE today's simulados to have a real comparison baseline.
            // Using <= included today, making notaBruta and notaAnterior identical (delta=0).
            const pastSimulados = relevantSimulados.filter(s => normalizeDate(s.date) < currentBound);
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
        
        // BUG-C2 FIX: calculateTrend espera array de objetos {score, date}
        const trendHistory = lastNScores.map((val, idx) => ({
            score: val,
            date: new Date(Date.now() - (lastNScores.length - 1 - idx) * 86400000).toISOString()
        }));
        const trend = calculateTrend(trendHistory);

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
        // M-06 FIX: Aplicar cap DEPOIS do multiplicador de tendência.
        // Antes, o ×1.3 podia elevar até 39, excedendo INSTABILITY_MAX=30.
        let instabilityComponent = standardDeviation * (cfg.INSTABILITY_MAX / 15);

        if (trend > 0) {
            instabilityComponent *= 0.5; // Improving = less urgent
        } else if (trend < -5) {
            instabilityComponent *= 1.3; // Getting worse = more urgent
        }

        instabilityComponent = Math.min(cfg.INSTABILITY_MAX, instabilityComponent);

        // D. Priority Boost
        const hasHighPriorityTasks = category.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        // E. Calculate recent study days for Burnout Detection
        const totalMinutes = categoryStudyLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const totalHours = totalMinutes / 60;

        const todayForBurnout = normalizeDate(new Date());
        const oneWeekAgo = todayForBurnout.getTime() - (7 * 24 * 60 * 60 * 1000);
        const recentStudyDays = new Set(
            categoryStudyLogs
                .filter(log => normalizeDate(log.date).getTime() >= oneWeekAgo)
                .map(log => normalizeDate(log.date).getTime())
        ).size;

        // F. SRS Boost
        // BUG FIX: Only trigger Spaced Repetition (SRS) if the subject has actually been studied at least once.
        const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;
        let srsBoost = 0;
        let srsLabel = null;

        if (hasData) {
            const srsResult = getSRSBoost(daysSinceLastStudy, cfg);
            srsBoost = srsResult.boost;
            srsLabel = srsResult.label;
        }

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
        // Math fix: recencyComponent ceiling = RECENCY_MAX × crunchMultiplier (not fixed at RECENCY_MAX).
        // Without this, categories during reta final all clip at 100 and are indistinguishable.
        const effectiveRecencyMax = cfg.RECENCY_MAX * crunchMultiplier;
        const RAW_MAX_BASE = cfg.SCORE_MAX + effectiveRecencyMax + cfg.INSTABILITY_MAX;
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
        let isBurnoutRisk = false;

        // Burnout threshold: High recent effort (>=5 days in last week) + declining/stagnant trend
        // Restored BUG-05 feature: recentStudyDays is now tracked efficiently.
        if (recentStudyDays >= 5 && trend <= 0) {
            recommendation = `🛑 Risco de Estafa: Você estudou pesadamente nos últimos dias mas a nota não reagiu. Descanse.`;
            isBurnoutRisk = true;
        } else if (srsBoost > 0) {
            recommendation = `${srsLabel} - Não pule essa revisão!`;
        } else if (standardDeviation > 10 && trend > 0) {
            recommendation = `Evolução Frágil (Volatilidade Alta: ±${standardDeviation.toFixed(1)}). Consolide a base.`;
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
                weight,
                srsLabel,
                isBurnoutRisk, // Passed for goal generation logic
                crunchMultiplier: Number(crunchMultiplier.toFixed(1)),
                humanReadable: {
                    "Média": `${Math.round(averageScore)}%`,
                    "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                    "Tendência": trend > 0.5 ? `↑ +${trend.toFixed(1)}` : trend < -0.5 ? `↓ ${trend.toFixed(1)}` : "→ Estável",
                    "Instabilidade": `±${standardDeviation.toFixed(1)} pts`,
                    "Peso da Matéria": weightLabel,
                    "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
                },
                components: {
                    scoreComponent: Number(scoreComponent.toFixed(2)),
                    recencyComponent: Number(recencyComponent.toFixed(2)),
                    instabilityComponent: Number(instabilityComponent.toFixed(2)),
                    priorityBoost: Number(priorityBoost.toFixed(2)),
                    srsBoost: Number(srsBoost.toFixed(2)),
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
    // Bug fix: use normalize() for case-insensitive match — same as calculateUrgency
    const catNorm = normalize(category.name);
    const categorySimuladoCount = simulados.filter(s => normalize(s.subject) === catNorm).length;

    // 1. Populate from History
    history.forEach(entry => {
        if (!entry) return;
        const entryDate = new Date(entry.date || 0);
        const topics = entry.topics || [];
        topics.forEach(t => {
            if (!t) return;
            let rawName = t.name;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";
            const name = rawName.trim();
            if (!topicMap[name]) {
                topicMap[name] = {
                    total: 0,
                    correct: 0,
                    lastSeen: new Date(0),
                    completed: false, // BUG 4 FIX: default to false to avoid undefined in sort
                    scores: []
                };
            }
            topicMap[name].total += (parseInt(t.total, 10) || 0);
            topicMap[name].correct += (parseInt(t.correct, 10) || 0);

            const topicTotal = parseInt(t.total, 10) || 0;
            const topicCorrect = parseInt(t.correct, 10) || 0;
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
        const name = String(task.text || task.title || "").trim();
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
        
        // BUG-C2 FIX: Mapper para objetos antes do trend
        const topicScores = data.scores.slice(-3);
        const topicHistory = topicScores.map((val, idx) => ({
            score: val,
            date: new Date(Date.now() - (topicScores.length - 1 - idx) * 86400000).toISOString()
        }));
        const trend = calculateTrend(topicHistory);

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
    const targetScore = options.targetScore ?? 70;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    const top3 = ranked.slice(0, 3);

    const performDeepCheck = (category) => {
        const categoryLogs = studyLogs.filter(l => l.categoryId === category.id);
        // BUG 6 FIX: use normalize() for subject filtering in deep check
        const catNormalized = normalize(category.name);
        const categorySims = simulados.filter(s => normalize(s.subject) === catNormalized);

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
        const categorySims = simulados.filter(s => normalize(s.subject) === normalize(cat.name));

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

        // 0.75 Burnout Detector Overrides Routine
        if (cat.urgency?.details?.isBurnoutRisk) {
            return {
                id: `${cat.id}-burnout-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}🛑 ESTAFA MENTAL DETECTADA. Faça uma pausa e limite-se a leituras leves!`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Alerta de Estafa (Burnout)",
                    details: "Densidade de logs de estudo excessivamente alta sem conversão em acertos.",
                    metrics: cat.urgency.details.humanReadable,
                    verdict: "O cérebro consolidará melhor as informações com uma pausa do que forçando mais retenção. Descanse."
                }
            };
        }

        // PLATEAU DETECTOR (with trend)
        if (cat.urgency?.details?.hasData &&
            categorySims.length >= 3 &&
            cat.urgency.details.averageScore < targetScore &&
            cat.urgency.details.standardDeviation < 10 &&
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
        // If standard deviation is extremely high, AI overrides standard 'decline' focus.
        if (cat.urgency?.details?.standardDeviation > 10 && cat.urgency?.details?.trend > 0) {
            return {
                id: `${cat.id}-fragile-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}⚠️ Evolução instável de nota! Consolide seu domínio antes de avançar.`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Evolução Frágil Pós-Trend",
                    details: `Seu desvio padrão de segurança está em ${cat.urgency.details.standardDeviation} pontos. Crescimento inconsistente.`,
                    metrics: cat.urgency.details.humanReadable,
                    verdict: "Sua média subiu, mas a precisão base está altamente volátil. Reveja os erros recentes urgentes."
                }
            };
        }

        if (cat.urgency?.details?.trend < -5) {
            return {
                id: `${cat.id}-declining-${new Date().toDateString()}`,
                text: `${cat.name}: ${topicLabel}📉 Nota em queda profunda! Atenção urgente necessária.`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Desempenho em Queda (Trend)",
                    metrics: cat.urgency.details.humanReadable,
                    verdict: cat.urgency.recommendation
                }
            };
        }

        // Weak Topic
        const highPriorityTask = cat.tasks?.find(t => !t.completed && t.priority === 'high');

        if (weakTopic && (weakTopic.percentage < 70 || weakTopic.isUntested || weakTopic.priorityBoost > 0)) {
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
                id: `${cat.id}-weaktopic-${weakTopic.name}-${new Date().toDateString()}`,
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
