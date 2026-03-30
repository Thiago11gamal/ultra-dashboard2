// ==================== CONSTANTES ====================
import { calculateTrend, standardDeviation as calculateStandardDeviation } from '../engine/stats';
import { calculateVolatility, monteCarloSimulation } from '../engine/projection';
import { normalize } from './normalization';

const DEFAULT_CONFIG = {
    SCORE_MAX: 50,
    RECENCY_MAX: 30,
    INSTABILITY_MAX: 30,
    PRIORITY_BOOST: 30,
    EFFICIENCY_MAX: 15,
    SRS_BOOST: 20,
    BASE_HOURS_THRESHOLD: 5,
    // Monte Carlo Coach config
    MC_SIMULATIONS: 800,
    MC_MIN_DATA_POINTS: 5,
    // BUG-19 FIX: monteCarloSimulation retorna probabilidade na escala 0-100,
    // não 0-1. Limiares corrigidos para escala percentual.
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    // Instability calibration (MSSD tem escala menor que stdDev — divisor recalibrado)
    INSTABILITY_MSSD_DIVISOR: 5,
};

// ==================== FUNÇÕES AUXILIARES ====================

const normalizeDate = (dateInput) => {
    if (!dateInput) return new Date(0);
    try {
        const d = typeof dateInput === 'string' && dateInput.length === 10
            ? new Date(`${dateInput}T12:00:00`)
            : new Date(dateInput);
        if (isNaN(d.getTime())) return new Date(0);
        d.setHours(0, 0, 0, 0);
        return d;
    } catch {
        return new Date(0);
    }
};

function getSRSBoost(daysSince, cfg) {
    if (daysSince >= 30) return { boost: cfg.SRS_BOOST * 2.0, label: "Revisão Crítica (30+ dias)" };
    if (daysSince >= 7)  return { boost: cfg.SRS_BOOST * 1.4, label: "Revisão de 7 dias" };
    if (daysSince >= 3)  return { boost: cfg.SRS_BOOST * 1.0, label: "Revisão de 3 dias" };
    if (daysSince >= 1)  return { boost: cfg.SRS_BOOST * 0.7, label: "Revisão de 24h" };
    return { boost: 0, label: null };
}

function getCrunchMultiplier(daysToExam) {
    if (daysToExam === undefined || daysToExam === null || daysToExam > 60) return 1.0;
    if (daysToExam < 0) return 1.0;
    if (daysToExam <= 3) return 2.5;
    if (daysToExam <= 7) return 2.0;
    if (daysToExam <= 14) return 1.5;
    if (daysToExam <= 30) return 1.2;
    return 1.0;
}

/**
 * MC-01: Mapper simulados → history para monteCarloSimulation
 */
function simuladosToHistory(simulados) {
    return simulados
        .filter(s => s.total > 0)
        .map(s => ({
            score: (s.correct / s.total) * 100,
            date: s.date
        }));
}

const mcCache = new Map();
const MC_CACHE_MAX = 50; // BUG-21 FIX: Limitar cache para evitar memory leak

/**
 * MC-02: Monte Carlo leve (800 sims) para uso no Coach.
 * Retorna null se dados insuficientes para evitar falsos positivos.
 */
function runCoachMonteCarlo(relevantSimulados, targetScore, cfg) {
    const history = simuladosToHistory(relevantSimulados);
    if (history.length < cfg.MC_MIN_DATA_POINTS) return null;

    const sumCorrect = relevantSimulados.reduce((a, s) => a + (Number(s.correct) || 0), 0);
    const hash = `${history.length}-${sumCorrect}-${targetScore}-${relevantSimulados[0]?.date || ''}`;
    if (mcCache.has(hash)) return mcCache.get(hash);

    try {
        const result = monteCarloSimulation(
            history,
            targetScore,
            90,
            cfg.MC_SIMULATIONS,
            {}
        );
        const finalResult = {
            probability: result.probability,
            volatility: result.volatility,
            mean: result.mean,
            ci95Low: result.ci95Low,
            ci95High: result.ci95High,
        };
        // BUG-21 FIX: Evict oldest entries when cache exceeds limit
        if (mcCache.size >= MC_CACHE_MAX) {
            const firstKey = mcCache.keys().next().value;
            mcCache.delete(firstKey);
        }
        mcCache.set(hash, finalResult);
        return finalResult;
    } catch (e) {
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
            console.warn('[CoachMC] Simulação falhou:', e.message, { n: history.length });
        }
        return null;
    }
}

// ==================== FUNÇÃO PRINCIPAL ====================

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const logger = options.logger;

    const targetScore = options.targetScore ?? 80;
    const rawWeight = (category.weight !== undefined && category.weight > 0) ? category.weight : 5;
    const weight = rawWeight * 10;
    const weightLabel = rawWeight <= 3 ? '1 — Baixa' : rawWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        const examDate = new Date(options.user.goalDate);
        const today = new Date();
        daysToExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    }

    try {
        // 1. Weighted Average Score
        const catNormalized = normalize(category.name);
        const relevantSimulados = simulados.filter(s => normalize(s.subject) === catNormalized);
        relevantSimulados.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        let averageScore = 0;
        if (relevantSimulados.length > 0) {
            const today = normalizeDate(new Date());
            const K = 0.07;
            const PESO_MIN = 0.03;
            const DELTA = 30.0; // Loosened clamp to allow bigger score recoveries

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
            const pastSimulados = relevantSimulados.filter(s => normalizeDate(s.date) < currentBound);
            const notaBruta = calculateExponentialScore(relevantSimulados);

            if (pastSimulados.length > 0) {
                const notaAnterior = calculateExponentialScore(pastSimulados);
                const diff = notaBruta - notaAnterior;
                let clampedDiff = diff;
                if (diff > DELTA) clampedDiff = DELTA;
                else if (diff < -DELTA) clampedDiff = -DELTA;
                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            averageScore = 50;
        }

        // 2. Days Since Last Study
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
            daysSinceLastStudy = Math.max(0, Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)));
        }

        // 3. Trend
        const validForDev = relevantSimulados.filter(s => s.total > 0);
        const trendHistory = validForDev.slice(0, 10).map(s => ({
            score: (s.correct / s.total) * 100,
            date: s.date
        })).reverse();
        const lastNScores = trendHistory.map(t => t.score);
        const trend = calculateTrend(trendHistory);

        // ─────────────────────────────────────────────────────────
        // MC-03: MSSD Volatility — substitui standardDeviation cega
        // Não castiga crescimento legítimo (50→60→70).
        // ─────────────────────────────────────────────────────────
        const mcHistory = simuladosToHistory(relevantSimulados.slice(0, 10));
        const mssdVolatility = mcHistory.length >= 3
            ? calculateVolatility(mcHistory)
            : (lastNScores.length >= 2 ? calculateStandardDeviation(lastNScores) : 0);

        // ─────────────────────────────────────────────────────────
        // MC-04: Monte Carlo leve — probabilidade real de bater a meta
        // ─────────────────────────────────────────────────────────
        const mcResult = runCoachMonteCarlo(relevantSimulados, targetScore, cfg);
        const mcProbability = mcResult ? mcResult.probability : null;
        const mcHasData = mcResult !== null;

        // --- COMPONENTS ---

        // A. Performance Score
        const scoreComponent = Math.min(cfg.SCORE_MAX, (100 - averageScore) * (cfg.SCORE_MAX / 100));

        // B. Recency
        const weightDeviation = (weight / 100) - 1;
        const dampenedWeightMultiplier = 1 + (weightDeviation * 0.5);
        const effectiveRiskDays = daysSinceLastStudy * dampenedWeightMultiplier;
        const crunchMultiplier = getCrunchMultiplier(daysToExam);
        const recencyComponent = cfg.RECENCY_MAX * (1 - Math.exp(-effectiveRiskDays / 7)) * crunchMultiplier;

        // ─────────────────────────────────────────────────────────
        // C. Instability via MSSD (divisor recalibrado: 5 vs. 15 antes)
        // MSSD típica: 2–8 → output 12–48 antes do cap.
        // stdDev típica era: 8–15 → output 16–30. Escala equivalente.
        // ─────────────────────────────────────────────────────────
        let instabilityComponent = mssdVolatility * (cfg.INSTABILITY_MAX / cfg.INSTABILITY_MSSD_DIVISOR);
        if (trend > 0) {
            instabilityComponent *= 0.5;
        } else if (trend < -5) {
            instabilityComponent *= 1.3;
        }
        instabilityComponent = Math.min(cfg.INSTABILITY_MAX, instabilityComponent);

        // ─────────────────────────────────────────────────────────
        // MC-05: Probability Urgency Boost
        // ─────────────────────────────────────────────────────────
        let mcUrgencyBoost = 0;
        let mcRiskLabel = null;

        if (mcHasData && mcProbability !== null) {
            if (mcProbability < cfg.MC_PROB_DANGER) {
                // < 30%: perigo — boost máximo de 25pts
                mcUrgencyBoost = 25 * (1 - mcProbability / cfg.MC_PROB_DANGER);
                mcRiskLabel = 'critical';
            } else if (mcProbability < 55) {
                // 30–55%: risco moderado — boost até 12pts
                // BUG-19 FIX: Corrigido de 0.55 para 55 (escala 0-100)
                const t = (mcProbability - cfg.MC_PROB_DANGER) / (55 - cfg.MC_PROB_DANGER);
                mcUrgencyBoost = 12 * (1 - t);
                mcRiskLabel = 'moderate';
            } else if (mcProbability >= cfg.MC_PROB_SAFE) {
                // > 90%: seguro — penalidade leve de 8pts
                mcUrgencyBoost = -8;
                mcRiskLabel = 'safe';
            }
        }

        // D. Priority Boost
        const hasHighPriorityTasks = category.tasks?.some(t => !t.completed && t.priority === 'high') || false;
        const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

        // E. Burnout detection
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
        const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;
        let srsBoost = 0;
        let srsLabel = null;

        if (hasData && (daysToExam === null || daysToExam >= 0)) {
            const srsResult = getSRSBoost(daysSinceLastStudy, cfg);
            srsBoost = srsResult.boost;
            srsLabel = srsResult.label;
        }

        // G. Rotation Penalty
        let rotationPenalty = 0;
        if (daysSinceLastStudy < 1) {
            rotationPenalty = averageScore < 60 ? 0 : 15;
        } else if (daysSinceLastStudy === 1 && !srsLabel) {
            rotationPenalty = 5;
        }
        if (srsBoost > 0) rotationPenalty *= 0.1;

        // --- RAW MAX ---
        const effectiveRecencyMax = cfg.RECENCY_MAX * crunchMultiplier;
        const RAW_MAX_BASE = cfg.SCORE_MAX + effectiveRecencyMax + cfg.INSTABILITY_MAX;
        const RAW_MAX_ACTUAL = RAW_MAX_BASE +
            (hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0) +
            (srsBoost > 0 ? srsBoost : 0) + // RIGOR-06 FIX: Usar boost real em vez de headroom fixo no denominador
            25; // headroom para mcUrgencyBoost

        const rawScore = (scoreComponent + recencyComponent + instabilityComponent + priorityBoost + srsBoost + mcUrgencyBoost) - rotationPenalty;

        const weightBoostFactor = 1 + ((weight / 100) - 1) * 0.4; // Apenas numerador: Boost adicional nos componentes
        const weightedRaw = rawScore * weightBoostFactor;
        const normalized = Math.max(0, Math.min(100, Math.round((weightedRaw / RAW_MAX_ACTUAL) * 100)));

        // --- RECOMMENDATION ---
        let recommendation = "";
        let isBurnoutRisk = false;

        if (recentStudyDays >= 5 && trend <= 0) {
            isBurnoutRisk = true;
        }

        if (mcHasData && mcRiskLabel === 'critical') {
            const burnoutNote = isBurnoutRisk ? ' (⚠️ Sinais de estafa — mude o método, não descanse.)' : '';
            // BUG-19 FIX: mcProbability já está em escala 0-100, não multiplicar por 100
            recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${burnoutNote}`;
        } else if (isBurnoutRisk) {
            recommendation = `🛑 Risco de Estafa: Você estudou pesadamente nos últimos dias mas a nota não reagiu. Descanse.`;
        } else if (mcHasData && mcRiskLabel === 'safe') {
            // BUG-19 FIX: mcProbability já está em escala 0-100
            recommendation = `🏆 Cruzeiro Seguro (${Math.round(mcProbability)}% nas projeções). Modo de manutenção ativado.`;
        } else if (srsBoost > 0) {
            recommendation = `${srsLabel} - Não pule essa revisão!`;
        } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH && trend > 0) {
            recommendation = `Evolução Frágil (Volatilidade MSSD: ±${mssdVolatility.toFixed(1)}). Consolide a base.`;
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
                standardDeviation: Number(mssdVolatility.toFixed(1)), // Legado: mantido para compatibilidade
                mssdVolatility: Number(mssdVolatility.toFixed(1)),
                trend: Number(trend.toFixed(1)),
                totalHours: Number(totalHours.toFixed(1)),
                hasData: relevantSimulados.length > 0 || categoryStudyLogs.length > 0,
                hasSimulados: relevantSimulados.length > 0,
                hasHighPriorityTasks,
                weight,
                srsLabel,
                isBurnoutRisk,
                crunchMultiplier: Number(crunchMultiplier.toFixed(1)),
                monteCarlo: mcHasData ? {
                    // BUG-19 FIX: mcProbability já está em 0-100, não multiplicar
                    probability: Number(mcProbability.toFixed(1)),
                    probabilityRaw: mcProbability,
                    riskLabel: mcRiskLabel,
                    volatility: Number(mcResult.volatility.toFixed(2)),
                    meanProjected: Number(mcResult.mean.toFixed(1)),
                    ci95Low: Number(mcResult.ci95Low.toFixed(1)),
                    ci95High: Number(mcResult.ci95High.toFixed(1)),
                    urgencyBoost: Number(mcUrgencyBoost.toFixed(2)),
                } : null,
                humanReadable: {
                    "Média": `${Math.round(averageScore)}%`,
                    "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                    "Tendência": trend > 0.5 ? `↑ +${trend.toFixed(1)}` : trend < -0.5 ? `↓ ${trend.toFixed(1)}` : "→ Estável",
                    "Instabilidade": `±${mssdVolatility.toFixed(1)} pts`,
                    // BUG-19 FIX: mcProbability já está em 0-100
                    "Probabilidade (MC)": mcHasData ? `${Math.round(mcProbability)}%` : "Dados insuf.",
                    "Peso da Matéria": weightLabel,
                    "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
                },
                components: {
                    scoreComponent: Number(scoreComponent.toFixed(2)),
                    recencyComponent: Number(recencyComponent.toFixed(2)),
                    instabilityComponent: Number(instabilityComponent.toFixed(2)),
                    priorityBoost: Number(priorityBoost.toFixed(2)),
                    srsBoost: Number(srsBoost.toFixed(2)),
                    rotationPenalty: Number(rotationPenalty.toFixed(2)),
                    mcUrgencyBoost: Number(mcUrgencyBoost.toFixed(2)),
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

const getWeakestTopic = (category, simulados = []) => {
    const tasks = category.tasks || [];
    const topicMap = {};

    const catNorm = normalize(category.name);
    const relevantSimulados = simulados.filter(s => normalize(s.subject) === catNorm);
    const categorySimuladoCount = relevantSimulados.length;

    const history = (category.simuladoStats && category.simuladoStats.history) ? category.simuladoStats.history : [];

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
                topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: false, scores: [] };
            }
            topicMap[name].total += (parseInt(t.total, 10) || 0);
            topicMap[name].correct += (parseInt(t.correct, 10) || 0);
            const topicTotal = parseInt(t.total, 10) || 0;
            const topicCorrect = parseInt(t.correct, 10) || 0;
            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
                    date: entryDate.toISOString()
                });
            }
            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });

    tasks.forEach(task => {
        const name = String(task.text || task.title || "").trim();
        if (!name) return;
        if (!topicMap[name]) {
            topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: !!task.completed, scores: [] };
        } else {
            topicMap[name].completed = !!task.completed;
        }
        if (task.priority === 'high') topicMap[name].manualPriority = 40;
        else if (task.priority === 'medium') topicMap[name].manualPriority = 20;
    });

    const today = new Date();
    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateTrend(topicHistory) : 0;
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 60;
        } else {
            daysSince = Math.max(0, Math.floor((today - data.lastSeen) / (1000 * 60 * 60 * 24)));
        }
        const priorityBoost = data.manualPriority || 0;
        let urgencyScore = ((100 - percentage) * 2) + daysSince + priorityBoost;
        if (percentage === 0 && data.scores.length === 0 && categorySimuladoCount > 3) {
            urgencyScore *= 0.7;
        }
        if (trend < -10) urgencyScore *= 1.2;
        return {
            name, total: data.total, percentage, daysSince,
            trend: Number(trend.toFixed(1)), priorityBoost, urgencyScore,
            isUntested: data.total === 0,
            manualPriority: data.manualPriority || 0,
            completed: data.completed
        };
    });

    topics.sort((a, b) => {
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
        return b.urgencyScore - a.urgencyScore;
    });

    return topics.length > 0 ? topics[0] : null;
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore ?? 80;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, options)
    })).sort((a, b) => b.urgency.normalizedScore - a.urgency.normalizedScore);

    // Expandido para preencher o calendário: tentamos pegar as 10 categorias mais urgentes
    // Se o usuário tiver poucas categorias (ex: 3), vamos extrair múltiplos tópicos por categoria
    const topCategories = ranked.slice(0, 10);

    const performDeepCheck = (category) => {
        // ... (existing logic)
        const categoryLogs = studyLogs.filter(l => l.categoryId === category.id);
        const catNormalized = normalize(category.name);
        const categorySims = simulados.filter(s => normalize(s.subject) === catNormalized);
        const totalHours = categoryLogs.reduce((acc, l) => acc + (l.minutes || 0), 0) / 60;
        const totalQuestions = categorySims.reduce((acc, s) => acc + (s.total || 0), 0);
        const totalCorrect = categorySims.reduce((acc, s) => acc + (s.correct || 0), 0);
        const avgScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
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

    // Helper customizado para pegar os N tópicos mais fracos em vez de apenas 1
    const getWeakestTopicsList = (category, simulados = [], limit = 3) => {
        const tasks = category.tasks || [];
        const topicMap = {};

        const catNorm = normalize(category.name);
        const relevantSimulados = simulados.filter(s => normalize(s.subject) === catNorm);
        const categorySimuladoCount = relevantSimulados.length;

        const history = (category.simuladoStats && category.simuladoStats.history) ? category.simuladoStats.history : [];

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
                    topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: false, scores: [] };
                }
                topicMap[name].total += (parseInt(t.total, 10) || 0);
                topicMap[name].correct += (parseInt(t.correct, 10) || 0);
                const topicTotal = parseInt(t.total, 10) || 0;
                const topicCorrect = parseInt(t.correct, 10) || 0;
                if (topicTotal > 0) {
                    topicMap[name].scores.push({
                        score: (topicCorrect / topicTotal) * 100,
                        date: entryDate.toISOString()
                    });
                }
                if (entryDate > topicMap[name].lastSeen) {
                    topicMap[name].lastSeen = entryDate;
                }
            });
        });

        tasks.forEach(task => {
            const name = String(task.text || task.title || "").trim();
            if (!name) return;
            if (!topicMap[name]) {
                topicMap[name] = { total: 0, correct: 0, lastSeen: new Date(0), completed: !!task.completed, scores: [] };
            } else {
                topicMap[name].completed = !!task.completed;
            }
            if (task.priority === 'high') topicMap[name].manualPriority = 40;
            else if (task.priority === 'medium') topicMap[name].manualPriority = 20;
        });

        const today = new Date();
        const topics = Object.entries(topicMap).map(([name, data]) => {
            const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
            const topicHistory = data.scores.slice(-3);
            const trend = topicHistory.length >= 2 ? calculateTrend(topicHistory) : 0;
            let daysSince = 0;
            if (data.lastSeen.getTime() === 0) {
                daysSince = 60;
            } else {
                daysSince = Math.max(0, Math.floor((today - data.lastSeen) / (1000 * 60 * 60 * 24)));
            }
            const priorityBoost = data.manualPriority || 0;
            let urgencyScore = ((100 - percentage) * 2) + daysSince + priorityBoost;
            if (percentage === 0 && data.scores.length === 0 && categorySimuladoCount > 3) {
                urgencyScore *= 0.7;
            }
            if (trend < -10) urgencyScore *= 1.2;
            return {
                name, total: data.total, percentage, daysSince,
                trend: Number(trend.toFixed(1)), priorityBoost, urgencyScore,
                isUntested: data.total === 0,
                manualPriority: data.manualPriority || 0,
                completed: data.completed
            };
        });

        topics.sort((a, b) => {
            if (!a.completed && b.completed) return -1;
            if (a.completed && !b.completed) return 1;
            return b.urgencyScore - a.urgencyScore;
        });

        return topics.slice(0, limit);
    };

    let allGeneratedTasks = [];
    
    // Se o usuário tiver poucas matérias (< 5), geramos múltiplas tarefas por matéria
    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);

    topCategories.forEach((cat, globalIndex) => {
        const weakTopics = getWeakestTopicsList(cat, simulados, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;
        
        // Limita iterações ao número real de tópicos disponíveis (mínimo 1) para evitar spamar "Revisão Geral" duplicada
        const maxIterations = Math.max(1, Math.min(tasksPerCategory, weakTopics.length || 1));
        const iterations = maxIterations;

        for (let i = 0; i < iterations; i++) {
            const weakTopic = weakTopics[i] || null;
            const priorityLabel = allGeneratedTasks.length < 3 ? '[AÇÃO CRÍTICA] ' : '';
            const topicLabel = weakTopic ? `${priorityLabel}[${weakTopic.name}] ` : `${priorityLabel}[Revisão Geral] `;
            
            // Unique ID per topic string to avoid react-beautiful-dnd collisions
            const uniqueIdSuffix = weakTopic ? (weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '') + weakTopic.total) : `geral-${i}`;

            // ─────────────────────────────────────────────────────────
            // MC-07: ALERTAS DE MONTE CARLO (checados primeiro)
            // ─────────────────────────────────────────────────────────

            // 🚨 Zona de Perigo: Prob < 30%
            if (mc && mc.probabilityRaw < DEFAULT_CONFIG.MC_PROB_DANGER && i === 0) {
                // BUG-19 FIX: probabilityRaw já está em 0-100
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-danger-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🚨 Alerta Vermelho! Projeção Matemática indica ampla reprovação. Medidas drásticas agora!`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Zona de Perigo",
                        details: `Apenas ${probPct}% de chance de bater a meta de ${targetScore}% em 90 dias. Projeção: ${mc.meanProjected}% (IC95: ${mc.ci95Low}–${mc.ci95High}%).`,
                        metrics: cat.urgency.details.humanReadable,
                        verdict: `Probabilidade crítica detectada (${DEFAULT_CONFIG.MC_SIMULATIONS} simulações). Abandone estudos passivos e mude de método imediatamente.`
                    }
                });
                continue;
            }

            // 🌪️ Caos Estatístico: Volatilidade MSSD Alta + prob não crítica
            if (mc && mc.volatility > DEFAULT_CONFIG.MC_VOLATILITY_HIGH && mc.probabilityRaw >= DEFAULT_CONFIG.MC_PROB_DANGER && mc.probabilityRaw < DEFAULT_CONFIG.MC_PROB_SAFE && i === 0) {
                // BUG-19 FIX: probabilityRaw já está em 0-100
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-chaos-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🌪️ Você é estatisticamente imprevisível. Consolide antes de avançar!`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Caos Estatístico",
                        details: `Volatilidade MSSD: ${mc.volatility.toFixed(1)} (limiar: ${DEFAULT_CONFIG.MC_VOLATILITY_HIGH}). Probabilidade atual: ${probPct}%.`,
                        metrics: cat.urgency.details.humanReadable,
                        verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível. Reduza as oscilações."
                    }
                });
                continue;
            }

            // 🏆 Cruzeiro Seguro: Prob > 90%
            if (mc && mc.probabilityRaw >= DEFAULT_CONFIG.MC_PROB_SAFE && i === 0) {
                // BUG-19 FIX: probabilityRaw já está em 0-100
                const probPct = Math.round(mc.probabilityRaw);
                allGeneratedTasks.push({
                    id: `${cat.id}-mc-safe-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🏆 Sucesso quase certo (${probPct}%). Modo manutenção ativado.`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Monte Carlo — Cruzeiro Seguro",
                        details: `${probPct}% de probabilidade de atingir ${targetScore}% em 90 dias. Projeção: ${mc.meanProjected}% (IC95: ${mc.ci95Low}–${mc.ci95High}%).`,
                        metrics: cat.urgency.details.humanReadable,
                        verdict: "Mantenha o ritmo atual. Manutenção leve é suficiente para proteger essa posição."
                    }
                });
                continue;
            }

            if (cat.urgency?.details?.srsLabel && i === 0) {
                allGeneratedTasks.push({
                    id: `${cat.id}-srs-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}🧠 ${cat.urgency.details.srsLabel}. Revise para não esquecer!`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Revisão Espaçada (SRS) Ativada",
                        label: cat.urgency.details.srsLabel,
                        metrics: cat.urgency.details.humanReadable,
                        verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                    }
                });
                continue;
            }

            const trapCheck = performDeepCheck(cat);
            if (trapCheck.isTrap && i === 0) {
                allGeneratedTasks.push({
                    id: `${cat.id}-trap-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}⚠️ Alerta de Método. Foco TOTAL em exercícios hoje!`,
                    completed: false,
                    categoryId: cat.id,
                    analysis: {
                        reason: "Detector de Pseudo-Estudo",
                        details: "Alta carga horária com baixíssimo volume de exercícios.",
                        metrics: cat.urgency.details.humanReadable,
                        verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                    }
                });
                continue;
            }

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
                allGeneratedTasks.push({
                    id: `${cat.id}-weaktopic-${uniqueIdSuffix}`,
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
                });
                continue;
            }

            // Fallback General Task
            allGeneratedTasks.push({
                id: `${cat.id}-general-review-${uniqueIdSuffix}-${dateStr}`,
                text: `${cat.name}: ${topicLabel}Revisar erros e fazer 10 questões`,
                completed: false,
                categoryId: cat.id,
                analysis: {
                    reason: "Revisão Geral Complementar",
                    metrics: cat.urgency.details.humanReadable,
                    categoryDetails: {
                        "Total Urgency": Math.round(cat.urgency.score),
                        ...cat.urgency.details.components
                    }
                }
            });
        }
    });

    // Limita estritamente a 12 tarefas para não engolir a tela inteira do Backlog
    return allGeneratedTasks.slice(0, 12);
};
