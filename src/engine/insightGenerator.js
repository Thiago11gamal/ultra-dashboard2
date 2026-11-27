import { normalizeDate, toDateMs, getDateKey } from "../utils/dateHelper.js";
import { parseNoonLocal, addDaysNoon } from "../utils/parseNoonLocal.js";
import { normalize, isSubjectMatch } from "../utils/normalization.js";
import { getSafeScore, getSyntheticTotal, extractTopicsTotals, resolveEffectiveCorrect } from "../utils/scoreHelper.js";
import { pointsToRatio, ratioToPoints } from "../utils/scoreHelper.conversions.js";
import {
    buildSpeedAccuracyData,
    buildExamPacingData,
    buildConsistencyBoxPlotData,
    buildProjectionFanData,
    buildKalmanChartData,
    normalizeExamPacingConfig
} from "../utils/advancedChartHelpers.js";
import { computeWeeklyCategoryCorrelation } from "./diagnostics.js";
import { estimateIRTAbility } from "./adaptive/irtEngine.js";

const normalizeConfidence = (raw) => {
    if (typeof raw !== 'string') return '';
    return raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const getUtcDowFromDateKey = (dk) => {
    if (typeof dk !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dk)) return null;
    const [y, m, d] = dk.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt.getUTCDay();
};

const toHistoryArray = (history) => {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
};

const safeFinite = (value, fallback = 0) => {
    if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const isStrictNum = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

const resolveCutoffMs = (timeWindow) => {
    if (!timeWindow || timeWindow === 'all') return null;
    const days = Number.parseInt(String(timeWindow), 10);
    if (!Number.isFinite(days) || days <= 0) return null;
    const todayKey = getDateKey(new Date());
    const todayNoon = todayKey ? parseNoonLocal(todayKey) : new Date();
    const cutoffNoon = todayNoon ? addDaysNoon(todayNoon, -days) : null;
    const cutoffKey = cutoffNoon ? getDateKey(cutoffNoon) : null;
    return cutoffKey ? toDateMs(cutoffKey) : null;
};

const sortByValidDate = (history) => {
    const maxAllowedMs = Date.now() + 86400000;
    return toHistoryArray(history)
        .filter(h => {
            if (h?.valid === false || h?.validated === false) return false;
            const raw = h?.date || h?.createdAt;
            const ms = normalizeDate(raw)?.getTime();
            return raw && Number.isFinite(ms) && ms <= maxAllowedMs;
        })
        .sort((a, b) => {
            const ta = normalizeDate(a?.date || a?.createdAt)?.getTime() ?? 0;
            const tb = normalizeDate(b?.date || b?.createdAt)?.getTime() ?? 0;
            return ta - tb;
        });
};

export function generateEvolutionInsights({
    timeline,
    filteredChartData,
    focusCategory,
    activeEngine,
    categories,
    unit = '%',
    maxScore = 100,
    minScore = 0,
    showOnlyFocus,
    simuladoRows = [],
    studyLogs = [],
    mcHistoryData = [],
    targetScore = null,
    projectDays = 30,
    examDurationMinutes = null,
    examTotalQuestions = null,
    examBoard = 'PADRAO',
    penaltyPerWrong = 0,
    timeWindow = 'all',
    mcWeights = null,
    activeMcResult = null
}) {
    const defaultTitle = "Análise do Sistema";
    const hasExplicitWindowFilter = Boolean(timeWindow && timeWindow !== 'all' && Array.isArray(filteredChartData));
    const effectiveTimeline = hasExplicitWindowFilter
        ? filteredChartData
        : (Array.isArray(filteredChartData) && filteredChartData.length > 0
            ? filteredChartData
            : timeline);

    const hasAlternateNonEmptySource =
        (activeEngine === 'weekly_diff' && Array.isArray(studyLogs) && studyLogs.length > 0) ||
        (activeEngine === 'mc_density' && Array.isArray(mcHistoryData) && mcHistoryData.length > 0);

    if (hasExplicitWindowFilter && effectiveTimeline.length === 0 && !hasAlternateNonEmptySource) {
        return {
            type: 'info', icon: "📅", title: "Nenhuma atividade no período",
            text: `Sem simulados registrados nos últimos ${timeWindow} dias.`,
            details: "Amplie a janela temporal para 'Tudo' ou registre um novo simulado para atualizar o diagnóstico."
        };
    }

    if (!effectiveTimeline?.length && !hasAlternateNonEmptySource) {
        return {
            type: 'info', icon: "📊", title: defaultTitle,
            text: "Ainda não existem dados suficientes.",
            details: "Continue realizando simulados para desbloquear insights avançados."
        };
    }

    if (!focusCategory) {
        switch (activeEngine) {
            case "raw_weekly":
                return { type: 'info', icon: "📅", title: "Visão Global: Mapa de Calor", text: "Análise da sua frequência e eficiência geral.", details: "Selecione uma disciplina acima para uma análise profunda." };
            case "raw":
                return { type: 'info', icon: "📊", title: "Visão Global: Resultados Brutos", text: "Visão geral da sua volatilidade diária.", details: "Selecione uma disciplina acima para analisar a estabilidade." };
            case "bayesian":
                return { type: 'info', icon: "🧠", title: "Visão Global: Nível Bayesiano", text: "Domínio probabilístico estimado de todas as matérias.", details: "Selecione uma disciplina acima para ver o intervalo de confiança." };
            case "stats":
                return { type: 'info', icon: "📐", title: "Visão Global: Média Histórica", text: "Desempenho acumulado em todas as frentes.", details: "Selecione uma disciplina acima para ver a média específica." };
            case "compare":
                return { type: 'info', icon: "⚡", title: "Visão Global: Projeção Monte Carlo", text: "Visão probabilística global do seu futuro.", details: "Selecione uma disciplina acima para descobrir o que está segurando sua nota." };
            case "subtopics":
                return { type: 'info', icon: "🔬", title: "Visão Global: Auditoria de Assuntos", text: "Mapeamento completo de todos os seus subtópicos.", details: "Selecione uma disciplina acima para auditar pontos fracos." };
            case "mc_density":
                return { type: 'info', icon: "🚀", title: "Visão Global: Rastreador de Aprovação", text: "Acompanhamento global das suas projeções de sucesso.", details: "Selecione uma disciplina acima para ver como ela afeta a sua aprovação." };
            case "time_spent":
                return { type: 'info', icon: "⏳", title: "Visão Global: Agilidade AI", text: "Visão geral da sua velocidade de resolução.", details: "Selecione uma disciplina acima para mapear gargalos de tempo específicos." };
            case "weekly_diff":
                return { type: 'info', icon: "📆", title: "Visão Global: Acelerômetro Semanal", text: "Balanço geral de ganhos e perdas na semana.", details: "Selecione uma disciplina acima para focar no esforço semanal." };
            case "today_vs_general":
                return { type: 'info', icon: "⚖️", title: "Visão Global: Hoje vs Geral", text: "Comparativo do seu dia contra a média histórica geral.", details: "Selecione uma disciplina acima para um comparativo específico." };
            case "speed_accuracy":
                return { type: 'info', icon: "⚡", title: "Visão Global: Speed × Precisão", text: "Cruzando tempo por questão contra taxa de acerto em todas as disciplinas.", details: "Selecione uma disciplina ou ative 'Apenas Foco' para isolar os subtópicos mais lentos." };
            case "exam_pacing":
                return { type: 'info', icon: "⏱️", title: "Visão Global: Ritmo de Prova", text: "Simulação do orçamento total de tempo da prova.", details: "Configure a duração e o número de questões do seu edital para prever estouros de tempo." };
            case "consistency_boxplot":
                return { type: 'info', icon: "📦", title: "Visão Global: Box Plot de Consistência", text: "Distribuição estatística (Mín–Q1–Mediana–Q3–Máx) das suas disciplinas.", details: "Compare a largura das caixas (IQR) para achar matérias voláteis que ameaçam sua regularidade." };
            case "projection_fan":
                return { type: 'info', icon: "🎯", title: "Visão Global: Cone de Projeção", text: "Cenários probabilísticos futuros (P10 a P90) até o dia da prova.", details: "Selecione uma disciplina para projetar o cone específico dela." };
            case "kalman_latent":
                return { type: 'info', icon: "🧲", title: "Visão Global: Filtro de Kalman", text: "Separando habilidade latente real do ruído pontual de simulados.", details: "Selecione uma disciplina para visualizar sua curva filtrada." };
            case "tornado_whatif":
                return { type: 'info', icon: "🌪️", title: "Visão Global: Tornado & Risco", text: "Decomposição das causas de eliminação e impacto por disciplina.", details: "Use os sliders 'E Se?' para testar onde seu esforço gera mais pontos de aprovação." };
            case "correlation_regimes":
                return { type: 'info', icon: "🔗", title: "Visão Global: Correlação & Regimes", text: "Detectando efeito gangorra entre disciplinas e regimes de aprendizagem.", details: "Observe pares com correlação negativa forte para intercalá-los na semana." };
            case "irt_psychometric":
                return { type: 'info', icon: "🧬", title: "Visão Global: Psicometria TRI & Chute", text: "Habilidade latente θ independente da dificuldade e estratégia ótima para sua banca.", details: "Configure sua banca para descobrir o ponto de equilíbrio de chutes vs abstenção." };
            case "metacognition_fatigue":
                return { type: 'info', icon: "🧠", title: "Visão Global: Metacognição & Fadiga", text: "Confiança × acerto, causas raiz dos erros e queda de rendimento intraprova.", details: "Priorize erros marcados com 'Certeza' para transformar em Flashcards FSRS." };
            default:
                return {
                    type: 'info', icon: "📊", title: "Visão Global",
                    text: "Selecione uma disciplina acima para insights detalhados.",
                    details: "A inteligência artificial analisa cada disciplina individualmente para gerar conselhos."
                };
        }
    }

    const safeTimeline = Array.isArray(effectiveTimeline) ? effectiveTimeline : [];
    const lastPoint = safeTimeline[safeTimeline.length - 1] || {};
    const getLastValid = (key) => {
        for (let i = safeTimeline.length - 1; i >= 0; i--) {
            if (isStrictNum(safeTimeline[i]?.[key])) return Number(safeTimeline[i][key]);
        }
        return null;
    };
    const getLastValidIdx = (key) => {
        for (let i = safeTimeline.length - 1; i >= 0; i--) {
            if (isStrictNum(safeTimeline[i]?.[key])) return i;
        }
        return -1;
    };

    const todayKeyGlobal = getDateKey(new Date());
    const lastRawIdx = getLastValidIdx(`raw_${focusCategory.id}`);
    const raw = lastRawIdx >= 0 ? Number(safeTimeline[lastRawIdx][`raw_${focusCategory.id}`]) : null;
    const bayesian = getLastValid(`bay_${focusCategory.id}`);
    const globalMaxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const globalMinScore = safeFinite(minScore, 0);
    const safeMaxScore = safeFinite(focusCategory?.maxScore, globalMaxScore) > 0
        ? safeFinite(focusCategory?.maxScore, globalMaxScore)
        : globalMaxScore;
    const safeMinScore = isStrictNum(focusCategory?.minScore)
        ? Math.min(Number(focusCategory.minScore), safeMaxScore)
        : (globalMinScore < safeMaxScore ? globalMinScore : 0);
    const scale = Math.max(0.01, (safeMaxScore - safeMinScore) / 100);

    // Se "Apenas Foco" + janela temporal estiverem ativos e a matéria em foco não tiver registros reais no período
    if (
        hasExplicitWindowFilter &&
        showOnlyFocus &&
        focusCategory?.id != null &&
        ['raw', 'bayesian', 'stats', 'compare'].includes(activeEngine) &&
        lastRawIdx < 0
    ) {
        return {
            type: 'info', icon: "📅", title: "Nenhuma atividade no período",
            text: `Sem simulados registrados em ${focusCategory.name} nos últimos ${timeWindow} dias.`,
            details: "Amplie a janela temporal para 'Tudo' ou registre um novo simulado para atualizar o diagnóstico."
        };
    }

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const dayStats = {};
        const cutoffMs = resolveCutoffMs(timeWindow);
        
        const allCategories = Array.isArray(categories)
            ? categories.filter(Boolean)
            : Object.values(categories || {}).filter(Boolean);
        const safeCategories = (showOnlyFocus && focusCategory?.id != null)
            ? allCategories.filter(c => c?.id != null && String(c.id) === String(focusCategory.id))
            : allCategories;

        safeCategories.forEach(cat => {
            const history = toHistoryArray(cat.simuladoStats?.history);
            const cMax = safeFinite(cat?.maxScore, globalMaxScore) > 0 ? safeFinite(cat?.maxScore, globalMaxScore) : globalMaxScore;
            const cMin = isStrictNum(cat?.minScore)
                ? Math.min(Number(cat.minScore), cMax)
                : (globalMinScore < cMax ? globalMinScore : 0);

            const rawHistory = history
                .filter(h => {
                    if (h?.valid === false || h?.validated === false) return false;
                    const rawDate = h?.date || h?.createdAt;
                    const dk = getDateKey(rawDate);
                    if (!dk) return false;
                    if (todayKeyGlobal && dk > todayKeyGlobal) return false;
                    if (cutoffMs != null) {
                        const ms = toDateMs(dk);
                        if (Number.isFinite(ms) && ms < cutoffMs) return false;
                    }
                    return true;
                })
                .map(h => ({ ...h, __dk: getDateKey(h?.date || h?.createdAt), score: getSafeScore(h, cMax, cMin) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const dow = getUtcDowFromDateKey(h.__dk);
                if (dow === null) return;
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0, realTotal: 0 };

                const isSynthEntry = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
                let tot = isSynthEntry ? 0 : Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions);
                if ((!Number.isFinite(tot) || tot <= 0) && !isSynthEntry && h.topics != null) {
                    const tf = extractTopicsTotals(h, cMax, cMin);
                    if (tf.total > 0) {
                        dayStats[dow].correct += tf.correct;
                        dayStats[dow].total += tf.total;
                        dayStats[dow].realTotal += tf.total;
                        return;
                    }
                }
                const hasRealVol = !isSynthEntry && Number.isFinite(tot) && tot > 0;
                if (!hasRealVol) {
                    tot = getSyntheticTotal(cMax);
                }

                if (!Number.isFinite(tot) || tot <= 0) return;

                dayStats[dow].correct += (pointsToRatio(h.score, cMax, cMin) * tot);
                dayStats[dow].total += tot;
                if (hasRealVol) dayStats[dow].realTotal += tot;
            });
        });

        const dayEntries = Object.entries(dayStats)
            .filter(([, s]) => s.total >= 5)
            .map(([dow, s]) => ({ dow: Number(dow), pct: (s.correct / s.total) * 100, total: s.total, realTotal: s.realTotal }))
            .sort((a, b) => b.pct - a.pct);

        if (dayEntries.length >= 2) {
            const best = dayEntries[0];
            const worst = dayEntries[dayEntries.length - 1];
            if (Math.abs(best.pct - worst.pct) < 0.05) {
                return {
                    type: 'success', icon: "📅", title: "Constância Semanal Uniforme",
                    text: `Desempenho equilibrado em ${best.pct.toFixed(1)}% nos ${dayEntries.length} dias da semana avaliados.`,
                    details: `Sem discrepância relevante entre ${DAY_NAMES_SINGULAR[best.dow]} e ${DAY_NAMES_SINGULAR[worst.dow]}.`,
                    advice: "Mantenha a regularidade diária para consolidar o ritmo."
                };
            }
            const bestVolSuffix = best.realTotal > 0 ? `, ${best.realTotal}q` : '';
            return {
                type: 'success', icon: "📅", title: "Padrão Semanal de Rendimento",
                text: `Seu rendimento de pico costuma ser: ${DAY_NAMES_SINGULAR[best.dow]}.`,
                details: `++Melhor dia: ${DAY_NAMES_SINGULAR[best.dow]} (${best.pct.toFixed(1)}%${bestVolSuffix}).++ !!Pior: ${DAY_NAMES_SINGULAR[worst.dow]} (${worst.pct.toFixed(1)}%).!!`,
                advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho ++acima da meta++, !!vermelhas!! indicam necessidade de atenção."
        };
    }

    // Lógica de Alertas de Burnout de Alta Prioridade (restrita às abas de desempenho geral)
    const safeRaw = safeFinite(raw, NaN);
    const samePointBay = lastRawIdx >= 0 ? safeFinite(safeTimeline[lastRawIdx]?.[`bay_${focusCategory.id}`], NaN) : NaN;
    const safeBayesianAtRaw = Number.isFinite(samePointBay) ? samePointBay : safeFinite(bayesian, NaN);
    const isGeneralPerformanceTab = activeEngine === "raw" || activeEngine === "bayesian" || activeEngine === "compare";
    const lastRawDateMs = lastRawIdx >= 0 ? toDateMs(safeTimeline[lastRawIdx]?.date) : NaN;
    const cutoff14Ms = resolveCutoffMs(14);
    const isRawRecent = !Number.isFinite(lastRawDateMs) || cutoff14Ms == null || lastRawDateMs >= cutoff14Ms;

    if (isGeneralPerformanceTab && isRawRecent && Number.isFinite(safeRaw) && Number.isFinite(safeBayesianAtRaw)) {
        const cutoff7Ms = resolveCutoffMs(7);
        const history = toHistoryArray(focusCategory.simuladoStats?.history);

        const recentVolumeAlert = history
            .filter(h => {
                if (h?.valid === false || h?.validated === false) return false;
                const dk = getDateKey(h?.date || h?.createdAt);
                if (!dk || (todayKeyGlobal && dk > todayKeyGlobal)) return false;
                const d = toDateMs(dk);
                return Number.isFinite(d) && (cutoff7Ms == null || d >= cutoff7Ms);
            })
            .reduce((sum, h) => {
                if (h?.syntheticVolume || h?.isSynthetic || h?.type === 'percent-only') return sum;
                let parsedTotal = parseInt(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions, 10);
                if ((!Number.isFinite(parsedTotal) || parsedTotal <= 0) && h?.topics != null) {
                    const tf = extractTopicsTotals(h, safeMaxScore, safeMinScore);
                    if (tf.total > 0) parsedTotal = tf.total;
                }
                const safeTotal = Number.isFinite(parsedTotal) && parsedTotal > 0
                    ? parsedTotal
                    : 0;

                return sum + Math.max(0, safeFinite(safeTotal, 0));
            }, 0);

        if (recentVolumeAlert > 40 && safeRaw < safeBayesianAtRaw - 10 * scale) {
            return {
                type: 'danger',
                icon: "🚨",
                title: "!!Alerta de Burnout!!",
                text: `Volume alto (${recentVolumeAlert}q em 7 dias), com nota em !!queda!!.`,
                details: `Nota recente (${safeRaw.toFixed(1)}${unit}) está abaixo do seu nível bayesiano (${safeBayesianAtRaw.toFixed(1)}${unit}).`,
                advice: "Dê um passo atrás, reduza o volume de simulados e recupere o foco."
            };
        }

        if (safeRaw > safeBayesianAtRaw + 8 * scale) {
            return {
                type: 'success',
                icon: "💡",
                title: "++Conhecimento Consolidado++",
                text: `Desempenho recente (${safeRaw.toFixed(1)}${unit}) ++muito acima da média++.`,
                details: `Superando o nível bayesiano projetado (${safeBayesianAtRaw.toFixed(1)}${unit}).`,
                advice: "O conhecimento assentou de vez. Pronto para aumentar a dificuldade."
            };
        }
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (!Number.isFinite(safeRaw)) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const rawCutoffMs = resolveCutoffMs(timeWindow);
        const history = sortByValidDate(focusCategory.simuladoStats?.history).filter((h) => {
            const dk = getDateKey(h?.date || h?.createdAt);
            if (todayKeyGlobal && dk && dk > todayKeyGlobal) return false;
            if (rawCutoffMs == null) return true;
            const ms = dk ? toDateMs(dk) : normalizeDate(h?.date || h?.createdAt)?.getTime();
            return !Number.isFinite(ms) || ms >= rawCutoffMs;
        });
        // Agrupa registros do mesmo dia (ponderado por volume) para espelhar os pontos diários do gráfico
        const dailyBuckets = new Map();
        const catRange = Math.max(1e-9, safeMaxScore - safeMinScore);
        history.forEach((h) => {
            const dk = getDateKey(h?.date || h?.createdAt);
            const sc = getSafeScore(h, safeMaxScore, safeMinScore);
            if (!dk || !Number.isFinite(sc)) return;
            const isSynth = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
            let w = isSynth ? 0 : Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
            if (w <= 0) w = getSyntheticTotal(safeMaxScore);
            const curr = dailyBuckets.get(dk) || { scoreSum: 0, weightSum: 0 };
            curr.scoreSum += sc * w;
            curr.weightSum += w;
            dailyBuckets.set(dk, curr);
        });
        const scores = Array.from(dailyBuckets.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([, b]) => (b.weightSum > 0 ? b.scoreSum / b.weightSum : NaN))
            .filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${safeRaw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        if (recentScores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${safeRaw.toFixed(1)}${unit}.` };
        
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);
        const displaySwing = unit === '%' ? (maxSwing / catRange) * 100 : maxSwing;
        const formattedSwing = (unit !== '%' && scale < 0.5) ? displaySwing.toFixed(1) : displaySwing.toFixed(0);

        if (maxSwing > 25 * scale) return { type: 'warning', icon: "⚠️", title: "!!Alta Volatilidade Detectada!!", text: `!!Variação de ${formattedSwing}${unit}.!!`, advice: "Oscilações altas indicam !!'chute'!! ou !!gaps de base!!." };
        if (maxSwing < 8 * scale) return { type: 'success', icon: "✅", title: "++Consistência Sólida++", text: `++Variação mínima de ${formattedSwing}${unit}.++`, advice: "Pronto para subir a dificuldade." };
        
        return { type: 'info', icon: "📊", title: "Desempenho Estável", text: `Oscilação de ${formattedSwing}${unit}.` };
    }

    // Lógica do Motor Bayesiano
    if (activeEngine === "bayesian") {
        const safeBayesian = safeFinite(bayesian, NaN);
        if (!Number.isFinite(safeBayesian)) {
            return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
        }

        const ciLow = safeFinite(getLastValid(`bay_ci_low_${focusCategory.id}`) ?? lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(getLastValid(`bay_ci_high_${focusCategory.id}`) ?? lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? Math.abs(ciHigh - ciLow) : null;

        if (ciWidth != null && ciWidth < 5 * scale) return { type: 'success', icon: "🎯", title: "++Alta Precisão Bayesiana++", text: `Seu nível real é ${safeBayesian.toFixed(1)}${unit}.`, advice: "++Convergência máxima++ do algoritmo." };
        if (ciWidth != null && ciWidth > 20 * scale) return { type: 'warning', icon: "🧠", title: "!!Incerteza Elevada!!", text: `Nível estimado: ${safeBayesian.toFixed(1)}${unit}.`, advice: "Faça mais simulados para estreitar a estimativa." };
        
        return { type: 'info', icon: "🧠", title: "Estimativa Bayesiana", text: `Nível Real: ${safeBayesian.toFixed(1)}${unit}.` };
    }

    const safeCategoriesList = Array.isArray(categories)
        ? categories.filter(Boolean)
        : Object.values(categories || {}).filter(Boolean);
    const safeRowsList = Array.isArray(simuladoRows)
        ? simuladoRows.filter(Boolean)
        : Object.values(simuladoRows || {}).filter(Boolean);
    const fullTimeline = Array.isArray(timeline) && timeline.length > 0 ? timeline : safeTimeline;
    const globalEffTarget = safeFinite(
        targetScore,
        globalMinScore + (globalMaxScore - globalMinScore) * 0.8
    );
    const rawFocusCutoff = safeFinite(focusCategory?.minCutoff, NaN);
    const focusEffTarget = (Number.isFinite(rawFocusCutoff) && rawFocusCutoff > safeMinScore)
        ? Math.max(safeMinScore, Math.min(safeMaxScore, rawFocusCutoff))
        : ((safeMaxScore !== globalMaxScore || safeMinScore !== globalMinScore)
            ? ratioToPoints(pointsToRatio(globalEffTarget, globalMaxScore, globalMinScore), safeMaxScore, safeMinScore)
            : globalEffTarget);
    const activeEffTarget = showOnlyFocus ? focusEffTarget : globalEffTarget;

    // Lógica da Média Histórica (Stats)
    if (activeEngine === "stats") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        if (!Number.isFinite(statsVal)) {
            return { type: 'info', icon: "📐", title: "Média Histórica", text: "Aguardando mais dados..." };
        }
        const safeBay = safeFinite(bayesian, NaN);
        const inertiaDelta = Number.isFinite(safeBay) ? (safeBay - statsVal) : null;
        const title = showOnlyFocus ? `Média Histórica · ${focusCategory.name}` : "Média Histórica";
        if (inertiaDelta != null && inertiaDelta >= 4 * scale) {
            return {
                type: 'success',
                icon: "📐",
                title,
                text: `Média acumulada de ${statsVal.toFixed(1)}${unit}, já superada pelo nível atual (${safeBay.toFixed(1)}${unit}).`,
                details: `Diferença de ++${inertiaDelta.toFixed(1)}${unit}++ acima do seu histórico acumulado.`,
                advice: "Sua média histórica ainda carrega simulados antigos — mantenha o ritmo para puxá-la para cima."
            };
        }
        if (inertiaDelta != null && inertiaDelta <= -4 * scale) {
            return {
                type: 'warning',
                icon: "📐",
                title,
                text: `Média acumulada em ${statsVal.toFixed(1)}${unit}, mas o nível recente caiu para !!${safeBay.toFixed(1)}${unit}!!.`,
                details: "A média histórica pode mascarar queda recente por causa da inércia dos acertos antigos.",
                advice: "Revise os simulados das últimas semanas antes que a queda puxe sua média geral para baixo."
            };
        }
        return {
            type: 'info',
            icon: "📐",
            title,
            text: `Sua média histórica acumulada é ${statsVal.toFixed(1)}${unit}.`,
            advice: "Lembre-se que a média demora a refletir mudanças bruscas no seu conhecimento recente."
        };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        const bayVal = safeFinite(bayesian, NaN);
        const projVal = safeFinite(activeMcResult?.projectedMean ?? activeMcResult?.mean, NaN);
        const probVal = safeFinite(activeMcResult?.probability, NaN);
        if (Number.isFinite(projVal)) {
            const hitsTarget = projVal >= focusEffTarget;
            const probSuffix = Number.isFinite(probVal) ? ` (${probVal.toFixed(0)}% de chance de aprovação)` : '';
            return {
                type: hitsTarget ? 'success' : (Number.isFinite(probVal) && probVal >= 50 ? 'info' : 'warning'),
                icon: "⚡",
                title: hitsTarget ? "++Projeção Monte Carlo no Rumo da Meta++" : "Projeção Monte Carlo & Raio-X",
                text: `Projeção até a prova: **${projVal.toFixed(1)}${unit}**${probSuffix}.`,
                details: Number.isFinite(bayVal)
                    ? `Nível bayesiano atual em ${bayVal.toFixed(1)}${unit} vs meta de ${focusEffTarget.toFixed(1)}${unit}.`
                    : "O cone roxo projeta sua faixa provável de aprovação até a data do exame.",
                advice: hitsTarget
                    ? "Mantenha a consistência para blindar o limite inferior do cone acima da meta."
                    : "Aumente a frequência em " + focusCategory.name + " para inclinar a projeção acima da meta."
            };
        }
        const textMsg = Number.isFinite(bayVal)
            ? `Nível Bayesiano: ${bayVal.toFixed(1)}${unit} com projeção estatística ativa.`
            : "Visualizando simulações estatísticas futuras.";
        return {
            type: 'info',
            icon: "⚡",
            title: "Projeção Monte Carlo & Raio-X",
            text: textMsg,
            details: "O cone roxo projeta sua faixa provável de aprovação até a data do exame.",
            advice: "Use esta projeção para saber se sua curva está no rumo da aprovação."
        };
    }

    // Lógica Raio-X de Assuntos (Subtopics)
    if (activeEngine === "subtopics") {
        const subCutoffMs = resolveCutoffMs(timeWindow);
        const targetCats = (showOnlyFocus && focusCategory?.id != null)
            ? safeCategoriesList.filter((c) => c?.id != null && String(c.id) === String(focusCategory.id))
            : safeCategoriesList;
        const topicAccMap = new Map();
        targetCats.forEach((cat) => {
            const cMax = safeFinite(cat?.maxScore, globalMaxScore) > 0 ? safeFinite(cat?.maxScore, globalMaxScore) : globalMaxScore;
            const cMin = isStrictNum(cat?.minScore) ? Math.min(Number(cat.minScore), cMax) : (globalMinScore < cMax ? globalMinScore : 0);
            const cRange = Math.max(1e-9, cMax - cMin);
            toHistoryArray(cat.simuladoStats?.history).forEach((h) => {
                if (!h || h.valid === false || h.validated === false || h.source === 'manual-error-notebook') return;
                const dk = getDateKey(h.date || h.createdAt);
                if (todayKeyGlobal && dk && dk > todayKeyGlobal) return;
                if (subCutoffMs != null && dk) {
                    const ms = toDateMs(dk);
                    if (Number.isFinite(ms) && ms < subCutoffMs) return;
                }
                const rawTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                const validTopics = rawTopics.filter((t) => t && typeof t === 'object' && t.valid !== false && t.validated !== false);
                validTopics.forEach((t) => {
                    const name = String(t.name || t.topic || t.assunto || t.title || t.subtopic || t.topicName || '').trim();
                    if (!name || name.toLowerCase() === 'nenhum') return;
                    const isSynth = Boolean(t.syntheticVolume || t.isSynthetic || t.type === 'percent-only');
                    let tot = isSynth ? 0 : (parseInt(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 10) || 0);
                    const topicForScore = (t.score == null && t.scorePct == null && t.percentage != null)
                        ? { ...t, scorePct: t.percentage }
                        : t;
                    const sc = getSafeScore(topicForScore, cMax, cMin);
                    let corr = NaN;
                    if (tot > 0) {
                        const rawC = t.correct ?? t.acertos ?? t.correctCount;
                        const hasC = !t.isPercentage && isStrictNum(rawC);
                        if (!hasC && !Number.isFinite(sc)) return;
                        corr = resolveEffectiveCorrect(t, sc, tot, hasC, hasC ? Number(rawC) : 0, cMax, cMin);
                    } else if (Number.isFinite(sc)) {
                        tot = getSyntheticTotal(cMax);
                        corr = ((Math.max(cMin, Math.min(cMax, sc)) - cMin) / cRange) * tot;
                    } else {
                        return;
                    }
                    if (!Number.isFinite(corr) || tot <= 0) return;
                    const key = name.toLowerCase();
                    const prev = topicAccMap.get(key) || { name, correct: 0, total: 0 };
                    prev.correct += Math.max(0, Math.min(tot, corr));
                    prev.total += tot;
                    topicAccMap.set(key, prev);
                });
            });
        });
        const rankedTopics = Array.from(topicAccMap.values())
            .filter((t) => t.total > 0)
            .map((t) => ({ ...t, pct: (t.correct / t.total) * 100 }))
            .sort((a, b) => a.pct - b.pct);
        const effTargetPct = pointsToRatio(activeEffTarget, showOnlyFocus ? safeMaxScore : globalMaxScore, showOnlyFocus ? safeMinScore : globalMinScore) * 100;
        if (rankedTopics.length > 0) {
            const weakest = rankedTopics[0];
            const strongest = rankedTopics[rankedTopics.length - 1];
            const belowTargetCount = rankedTopics.filter((t) => t.pct < effTargetPct).length;
            return {
                type: belowTargetCount > 0 ? 'warning' : 'success',
                icon: "🔬",
                title: belowTargetCount > 0 ? "!!Pontos Críticos nos Assuntos!!" : "++Assuntos Acima da Meta++",
                text: belowTargetCount > 0
                    ? `Gargalo principal: !!${weakest.name} (${weakest.pct.toFixed(1)}%)!! · ${belowTargetCount}/${rankedTopics.length} abaixo da meta.`
                    : `Todos os ${rankedTopics.length} assuntos avaliados estão acima da meta (destaque: ++${strongest.name} ${strongest.pct.toFixed(1)}%++).`,
                details: rankedTopics.length > 1
                    ? `Maior força: ++${strongest.name} (${strongest.pct.toFixed(1)}%)++ · Menor taxa: !!${weakest.name} (${weakest.pct.toFixed(1)}%)!!.`
                    : `Desempenho consolidado em ${weakest.name}: ${weakest.pct.toFixed(1)}%.`,
                advice: belowTargetCount > 0
                    ? `Ataque primeiro **${weakest.name}** com baterias focadas para destravar pontos rápidos.`
                    : "Excelente equilíbrio entre subtópicos. Mantenha revisões espaçadas."
            };
        }
        return {
            type: 'info',
            icon: "🔬",
            title: "Auditoria de Assuntos",
            text: showOnlyFocus ? `Sem assuntos detalhados em ${focusCategory.name} no período.` : "Sem assuntos detalhados no período selecionado.",
            details: "Registre os subtópicos nos simulados para identificar onde há maior perda de pontos.",
            advice: "Ataque os !!blocos vermelhos!! assim que tiver registros por assunto."
        };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        const validMcPts = (Array.isArray(mcHistoryData) ? mcHistoryData : [])
            .filter((d) => d && (isStrictNum(d.projectedMean) || isStrictNum(d.mean)));
        if (validMcPts.length >= 2) {
            const firstPt = validMcPts[0];
            const lastPt = validMcPts[validMcPts.length - 1];
            const firstVal = safeFinite(firstPt.projectedMean ?? firstPt.mean, NaN);
            const lastVal = safeFinite(lastPt.projectedMean ?? lastPt.mean, NaN);
            const lastProb = safeFinite(lastPt.probability, NaN);
            const delta = (Number.isFinite(firstVal) && Number.isFinite(lastVal)) ? (lastVal - firstVal) : 0;
            const trendType = delta > 0.5 ? 'success' : (delta < -0.5 ? 'warning' : 'info');
            return {
                type: trendType,
                icon: "🚀",
                title: delta > 0.5 ? "++Trajetória de Aprovação em Alta++" : (delta < -0.5 ? "!!Queda na Projeção de Aprovação!!" : "Rastreador de Aprovação"),
                text: `Última projeção: **${lastVal.toFixed(1)}${unit}** (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${unit} em ${validMcPts.length} registros).`,
                details: Number.isFinite(lastProb)
                    ? `Chance estimada de aprovação no último registro: **${lastProb.toFixed(0)}%**.`
                    : "Mede o quanto cada simulado aproxima ou afasta você da sua nota de corte.",
                advice: delta >= 0
                    ? "Sua projeção está ++evoluindo++ — mantenha a cadência de simulados e revisões."
                    : "As projeções recentes recuaram. Revise os erros dos últimos simulados para retomar a curva."
            };
        }
        const ciLow = safeFinite(getLastValid(`bay_ci_low_${focusCategory.id}`) ?? lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(getLastValid(`bay_ci_high_${focusCategory.id}`) ?? lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? (ciHigh - ciLow) : null;
        return {
            type: 'info',
            icon: "🚀",
            title: "Rastreador de Aprovação",
            text: ciWidth != null ? `Incerteza na sua projeção: ±${(ciWidth / 2).toFixed(1)}${unit}.` : "Histórico das suas chances reais de aprovação.",
            details: "Mede o quanto cada simulado aproxima ou afasta você da sua nota de corte.",
            advice: "Registre simulados em dias diferentes para acompanhar a curva de aprovação."
        };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        const targetCats = (showOnlyFocus && focusCategory?.id != null)
            ? safeCategoriesList.filter((c) => c?.id != null && String(c.id) === String(focusCategory.id))
            : safeCategoriesList;
        const wkCutoffMs = resolveCutoffMs(timeWindow);
        const weekBuckets = new Map();
        targetCats.forEach((cat) => {
            const cMax = safeFinite(cat?.maxScore, globalMaxScore) > 0 ? safeFinite(cat?.maxScore, globalMaxScore) : globalMaxScore;
            const cMin = isStrictNum(cat?.minScore) ? Math.min(Number(cat.minScore), cMax) : (globalMinScore < cMax ? globalMinScore : 0);
            toHistoryArray(cat.simuladoStats?.history).forEach((h) => {
                if (!h || h.valid === false || h.validated === false) return;
                const dk = getDateKey(h.date || h.createdAt);
                if (!dk || (todayKeyGlobal && dk > todayKeyGlobal)) return;
                if (wkCutoffMs != null) {
                    const ms = toDateMs(dk);
                    if (Number.isFinite(ms) && ms < wkCutoffMs) return;
                }
                const sc = getSafeScore(h, cMax, cMin);
                if (!Number.isFinite(sc)) return;
                const dow = getUtcDowFromDateKey(dk);
                const dNoon = parseNoonLocal(dk);
                const mondayNoon = dNoon && dow !== null ? addDaysNoon(dNoon, dow === 0 ? -6 : 1 - dow) : null;
                const wkKey = mondayNoon ? getDateKey(mondayNoon) : null;
                if (!wkKey) return;
                const isSynth = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
                let w = isSynth ? 0 : Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                if (w <= 0) w = getSyntheticTotal(cMax);
                const prev = weekBuckets.get(wkKey) || { corr: 0, tot: 0 };
                prev.corr += pointsToRatio(sc, cMax, cMin) * w;
                prev.tot += w;
                weekBuckets.set(wkKey, prev);
            });
        });
        const sortedWeeks = Array.from(weekBuckets.entries())
            .filter(([, b]) => b.tot > 0)
            .sort((a, b) => a[0].localeCompare(b[0]));
        const dispMin = showOnlyFocus ? safeMinScore : globalMinScore;
        const dispMax = showOnlyFocus ? safeMaxScore : globalMaxScore;
        if (sortedWeeks.length >= 2) {
            const prevWk = sortedWeeks[sortedWeeks.length - 2][1];
            const lastWk = sortedWeeks[sortedWeeks.length - 1][1];
            const prevScore = ratioToPoints(prevWk.corr / prevWk.tot, dispMax, dispMin);
            const lastScore = ratioToPoints(lastWk.corr / lastWk.tot, dispMax, dispMin);
            const delta = lastScore - prevScore;
            const threshold = Math.max(0.5, (dispMax - dispMin) * 0.02);
            return {
                type: delta > threshold ? 'success' : (delta < -threshold ? 'warning' : 'info'),
                icon: "📆",
                title: delta > threshold ? "++Aceleração Semanal Positiva++" : (delta < -threshold ? "!!Queda na Última Semana!!" : "Acelerômetro Semanal Estável"),
                text: `Última semana: **${lastScore.toFixed(1)}${unit}** (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${unit} vs semana anterior).`,
                details: `Compara a variação em ${unit} entre semanas ${showOnlyFocus ? `em ${focusCategory.name}` : 'no conjunto de disciplinas'}.`,
                advice: delta < -threshold
                    ? "Monitore semanas !!negativas!! e reforce a revisão para conter a !!curva do esquecimento!!."
                    : "Boa tração semanal! Mantenha constância entre horas de estudo e simulados."
            };
        }
        return {
            type: 'info',
            icon: "📆",
            title: "Acelerômetro Semanal",
            text: showOnlyFocus ? `Tração do estudo em ${focusCategory.name}.` : "Balanço semanal de desempenho e horas de estudo.",
            details: `Compara os ganhos e perdas em ${unit} semana a semana.`,
            advice: "Registre simulados em pelo menos 2 semanas para medir aceleração (Delta)."
        };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        const tvCutoffMs = resolveCutoffMs(timeWindow);
        const targetCats = (showOnlyFocus && focusCategory?.id != null)
            ? safeCategoriesList.filter((c) => c?.id != null && String(c.id) === String(focusCategory.id))
            : safeCategoriesList;
        const dispMin = showOnlyFocus ? safeMinScore : globalMinScore;
        const dispMax = showOnlyFocus ? safeMaxScore : globalMaxScore;
        const dayMap = new Map();
        let totalC = 0;
        let totalQ = 0;
        targetCats.forEach((cat) => {
            const cMax = safeFinite(cat?.maxScore, globalMaxScore) > 0 ? safeFinite(cat?.maxScore, globalMaxScore) : globalMaxScore;
            const cMin = isStrictNum(cat?.minScore) ? Math.min(Number(cat.minScore), cMax) : (globalMinScore < cMax ? globalMinScore : 0);
            toHistoryArray(cat.simuladoStats?.history).forEach((h) => {
                if (!h || h.valid === false || h.validated === false) return;
                const dk = getDateKey(h.date || h.createdAt);
                if (!dk || (todayKeyGlobal && dk > todayKeyGlobal)) return;
                if (tvCutoffMs != null) {
                    const ms = toDateMs(dk);
                    if (Number.isFinite(ms) && ms < tvCutoffMs) return;
                }
                const sc = getSafeScore(h, cMax, cMin);
                if (!Number.isFinite(sc)) return;
                const isSynth = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
                let w = isSynth ? 0 : Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                if (w <= 0) w = getSyntheticTotal(cMax);
                const corr = pointsToRatio(sc, cMax, cMin) * w;
                totalC += corr;
                totalQ += w;
                const prev = dayMap.get(dk) || { corr: 0, tot: 0 };
                prev.corr += corr;
                prev.tot += w;
                dayMap.set(dk, prev);
            });
        });
        const sortedDays = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        if (sortedDays.length > 0 && totalQ > 0) {
            const [lastDk, lastBucket] = sortedDays[sortedDays.length - 1];
            const lastDayScore = ratioToPoints(lastBucket.corr / lastBucket.tot, dispMax, dispMin);
            const genScore = ratioToPoints(totalC / totalQ, dispMax, dispMin);
            const diff = lastDayScore - genScore;
            const margin = Math.max(0.5, (dispMax - dispMin) * 0.02);
            const dayLabel = lastDk === todayKeyGlobal ? 'Hoje' : `Último dia (${lastDk.split('-').reverse().slice(0, 2).join('/')})`;
            return {
                type: diff > margin ? 'success' : (diff < -margin ? 'warning' : 'info'),
                icon: "⚖️",
                title: "Desempenho Diário vs Geral",
                text: `${dayLabel}: **${lastDayScore.toFixed(1)}${unit}** (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${unit} vs média de ${genScore.toFixed(1)}${unit}).`,
                details: showOnlyFocus ? `Escopo: ${focusCategory.name}.` : `Comparando seu último dia ativo com a média consolidada de ${targetCats.length} disciplinas.`,
                advice: diff < -margin
                    ? "Dia abaixo da média histórica — avalie fadiga ou dificuldade dos tópicos antes de ampliar o volume."
                    : "Use o ritmo recente para calibrar o volume das próximas sessões."
            };
        }
        return {
            type: 'info',
            icon: "⚖️",
            title: "Desempenho Diário",
            text: "Sem registros no período para comparar com a média geral.",
            details: "Realize um simulado ou amplie o filtro temporal para comparar o desempenho diário.",
            advice: "Mantenha registros frequentes para acompanhar a estabilidade dia a dia."
        };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        const tsCutoffMs = resolveCutoffMs(timeWindow);
        const targetCats = (showOnlyFocus && focusCategory?.id != null)
            ? safeCategoriesList.filter((c) => c?.id != null && String(c.id) === String(focusCategory.id))
            : safeCategoriesList;
        let totalSec = 0;
        let totalTimedQ = 0;
        let slowest = null;
        targetCats.forEach((cat) => {
            let catSec = 0;
            let catQ = 0;
            const cMax = isStrictNum(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : globalMaxScore;
            toHistoryArray(cat.simuladoStats?.history).forEach((h) => {
                if (!h || h.valid === false || h.validated === false || h.source === 'manual-error-notebook' || h.materia === 'Simulado Personalizado') return;
                const dk = getDateKey(h.date || h.createdAt);
                if (todayKeyGlobal && dk && dk > todayKeyGlobal) return;
                if (tsCutoffMs != null && dk) {
                    const ms = toDateMs(dk);
                    if (Number.isFinite(ms) && ms < tsCutoffMs) return;
                }
                const rootTs = Number(h.timeSpent ?? h.durationSeconds);
                const explicitRootTq = Number(h.timedQuestoes) > 0 ? Number(h.timedQuestoes) : 0;
                const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                let topicsTs = 0;
                let topicsTq = 0;
                let allTopicsExplicit = true;
                safeTopics.forEach((t) => {
                    if (!t || typeof t !== 'object' || t.valid === false || t.validated === false) return;
                    const tTs = Number(t.timeSpent ?? t.durationSeconds);
                    const tExpTq = Number(t.timedQuestoes) > 0 ? Number(t.timedQuestoes) : 0;
                    const tTot = tExpTq > 0 ? tExpTq : (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0);
                    if (Number.isFinite(tTs) && tTs > 0 && Number.isFinite(tTot) && tTot > 0) {
                        topicsTs += tTs;
                        topicsTq += tTot;
                        if (tExpTq <= 0) allTopicsExplicit = false;
                    }
                });
                const preferRoot = explicitRootTq > 0 && Number.isFinite(rootTs) && rootTs > 0 && (!allTopicsExplicit || rootTs > topicsTs + 0.5);
                if (topicsTs > 0 && topicsTq > 0 && !preferRoot) {
                    catSec += topicsTs;
                    catQ += topicsTq;
                    return;
                }
                let tq = explicitRootTq > 0
                    ? explicitRootTq
                    : (Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                if (tq <= 0 && safeTopics.length > 0) {
                    tq = safeTopics.reduce((sum, t) => {
                        if (!t || typeof t !== 'object' || t.valid === false || t.validated === false) return sum;
                        return sum + (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0);
                    }, 0);
                }
                if (tq <= 0 && (h.score != null || h.scorePoints != null || h.scorePct != null)) {
                    tq = getSyntheticTotal(cMax);
                }
                if (Number.isFinite(rootTs) && rootTs > 0 && Number.isFinite(tq) && tq > 0) {
                    catSec += rootTs;
                    catQ += tq;
                }
            });
            if (catQ > 0) {
                totalSec += catSec;
                totalTimedQ += catQ;
                const avg = catSec / catQ;
                if (!slowest || avg > slowest.avg) slowest = { name: cat.name, avg };
            }
        });
        if (totalTimedQ <= 0) {
            return {
                type: 'info',
                icon: "⏳",
                title: "Velocidade de Resolução",
                text: "Ainda não há questões cronometradas no filtro atual.",
                details: "Faça simulados com cronômetro ativo (ou Simulado IA) para medir seu ritmo por questão.",
                advice: "Cronometrar suas sessões revela quais matérias consomem mais tempo de prova."
            };
        }
        const avgSec = Math.round(totalSec / totalTimedQ);
        const dur = safeFinite(examDurationMinutes, 0);
        const totQ = safeFinite(examTotalQuestions, 0);
        const targetSec = dur > 0 && totQ > 0 ? Math.round((dur * 60) / totQ) : null;
        if (targetSec != null) {
            const diff = avgSec - targetSec;
            return {
                type: diff <= 0 ? 'success' : (diff <= 20 ? 'warning' : 'danger'),
                icon: "⏳",
                title: diff <= 0 ? "++Ritmo Dentro do Alvo da Prova++" : "!!Ritmo Acima do Alvo da Prova!!",
                text: `Média ponderada de **${avgSec}s/q** contra o alvo do edital de **${targetSec}s/q** (${diff <= 0 ? `${Math.abs(diff)}s de folga` : `+${diff}s mais lento`}).`,
                details: slowest && targetCats.length > 1 ? `Matéria mais lenta: **${slowest.name}** (${Math.round(slowest.avg)}s/q).` : `Baseado em ${totalTimedQ} questões cronometradas.`,
                advice: diff > 0
                    ? "Treine blocos cronometrados para reduzir leitura redundante nas matérias mais lentas."
                    : "Excelente agilidade! Aproveite a folga para revisar questões marcadas com dúvida."
            };
        }
        return {
            type: 'info',
            icon: "⏳",
            title: "Velocidade de Resolução",
            text: `Ritmo médio ponderado de **${avgSec}s/questão** (${totalTimedQ} questões cronometradas).`,
            details: slowest && targetCats.length > 1 ? `Maior consumo de tempo: **${slowest.name}** (${Math.round(slowest.avg)}s/q).` : "Configure o tempo da prova em Ritmo de Prova para comparar contra o limite do edital.",
            advice: "Cuidado com matérias !!lentas!! — elas comprimem o tempo disponível nas demais disciplinas."
        };
    }

    // Lógica Speed × Precisão
    if (activeEngine === "speed_accuracy") {
        const dur = safeFinite(examDurationMinutes, 0);
        const totQ = safeFinite(examTotalQuestions, 0);
        const idealSec = dur > 0 && totQ > 0 ? Math.round((dur * 60) / totQ) : null;
        const speedData = buildSpeedAccuracyData(safeCategoriesList, safeRowsList, {
            mode: 'subject',
            showOnlyFocus,
            focusSubjectId: focusCategory.id,
            timeWindow,
            targetScore: activeEffTarget,
            minScore: showOnlyFocus ? safeMinScore : globalMinScore,
            maxScore: showOnlyFocus ? safeMaxScore : globalMaxScore,
            idealSecondsPerQuestion: idealSec,
            penaltyPerWrong
        });
        if (!speedData.points.length) {
            return {
                type: 'info', icon: "⚡", title: "Matriz Speed × Precisão",
                text: "Aguardando registros cronometrados.",
                details: "Faça simulados com cronômetro para posicionar cada matéria nos 4 quadrantes.",
                advice: "Use o Simulado IA ou informe o tempo gasto para mapear velocidade × acerto."
            };
        }
        const { fastAccurate, fastInaccurate, slowAccurate, slowInaccurate } = speedData.quadrants;
        if (slowInaccurate > 0) {
            return {
                type: 'danger', icon: "⚡", title: "!!Gargalos em Lacuna Teórica!!",
                text: `!!${slowInaccurate} ${slowInaccurate === 1 ? 'matéria' : 'matérias'}!! com tempo alto e acerto abaixo da meta.`,
                details: `Alvo de velocidade: ${speedData.benchmarkSeconds}s/q · Domínio Rápido: ++${fastAccurate}++ · Leitura Apressada: ${fastInaccurate} · Precisa Agilidade: ${slowAccurate}.`,
                advice: "Revise a teoria base nos itens em !!vermelho!! antes de tentar acelerar o relógio."
            };
        }
        if (fastInaccurate > 0) {
            return {
                type: 'warning', icon: "⚡", title: "Alerta de Leitura Apressada",
                text: `${fastInaccurate} ${fastInaccurate === 1 ? 'matéria' : 'matérias'} em ritmo rápido, mas abaixo da meta.`,
                details: `Você está abaixo de ${speedData.benchmarkSeconds}s/q, porém perdendo pontos por precipitação.`,
                advice: "Desacelere 15–20s por questão e releia os comandos ('exceto', 'incorreta') para subir a precisão."
            };
        }
        if (slowAccurate > 0 && fastAccurate === 0) {
            return {
                type: 'warning', icon: "⚡", title: "Precisão Alta, mas Ritmo Lento",
                text: `${slowAccurate} ${slowAccurate === 1 ? 'matéria' : 'matérias'} acima da meta de acerto, porém acima de ${speedData.benchmarkSeconds}s/q.`,
                details: `Referência atual: ${speedData.benchmarkSeconds}s/questão e meta de ${speedData.targetPct}%.`,
                advice: "Treine blocos cronometrados para ganhar agilidade sem abrir mão da precisão."
            };
        }
        return {
            type: 'success', icon: "⚡", title: "++Equilíbrio Speed × Precisão++",
            text: `++${fastAccurate}++ em Domínio Rápido e ${slowAccurate} precisando apenas de mais agilidade.`,
            details: `Referência atual: ${speedData.benchmarkSeconds}s/questão e meta de ${speedData.targetPct}%.`,
            advice: slowAccurate > 0 ? "Treine blocos cronometrados nas matérias azuis para ganhar ritmo sem perder acerto." : "Excelente ritmo! Mantenha a calibragem nos simulados completos."
        };
    }

    // Lógica Ritmo de Prova (Exam Pacing)
    if (activeEngine === "exam_pacing") {
        const normalizedPacingCfg = normalizeExamPacingConfig(examDurationMinutes, examTotalQuestions);
        const pacing = buildExamPacingData(safeCategoriesList, {
            examDurationMinutes: normalizedPacingCfg.examDurationMinutes,
            examTotalQuestions: normalizedPacingCfg.examTotalQuestions,
            mcWeights,
            timeWindow
        });
        if (!pacing.hasData) {
            return {
                type: 'info', icon: "⏱️", title: "Simulador de Ritmo de Prova",
                text: "Sem dados cronometrados para simular a prova completa.",
                details: "Cronometre seus simulados para estimar se o tempo total caberá no limite do edital.",
                advice: "Registre o tempo nos próximos simulados e salve a duração oficial da sua banca."
            };
        }
        const roundedDelta = Math.round(pacing.deltaMinutes);
        if (roundedDelta > 0) {
            const topBottle = pacing.subjects[0];
            return {
                type: roundedDelta > 15 ? 'danger' : 'warning',
                icon: "⏱️",
                title: roundedDelta > 15 ? "!!Risco de Estouro de Relógio!!" : "Alerta de Tempo Apertado",
                text: `Projeção de !!+${roundedDelta} min acima do limite!! (~${pacing.estimatedUnanswered} ${pacing.estimatedUnanswered === 1 ? 'questão' : 'questões'} sem tempo).`,
                details: topBottle ? `Maior gargalo: **${topBottle.name}** (${topBottle.avgSecPerQ}s/q, saldo de ${topBottle.deltaMinutes > 0 ? '+' : ''}${topBottle.deltaMinutes} min).` : `Ritmo alvo: ${pacing.idealSecPerQuestion}s/q.`,
                advice: "Treine resolução cronometrada nas disciplinas com barra vermelha acima do orçamento cinza."
            };
        }
        if (roundedDelta === 0) {
            return {
                type: 'success', icon: "⏱️", title: "++Ritmo no Limite Exato da Prova++",
                text: `Tempo projetado em **${Math.round(pacing.totalProjectedMinutes)} min** — exatamente no limite de ${pacing.examDurationMinutes} min.`,
                details: `Ritmo alvo: ${pacing.idealSecPerQuestion}s/q.`,
                advice: "Tente ganhar 10–15 min extras de margem para preenchimento do gabarito e revisão final."
            };
        }
        return {
            type: 'success', icon: "⏱️", title: "++Orçamento de Tempo Saudável++",
            text: `++Folga estimada de ${Math.abs(roundedDelta)} min++ para gabarito e revisão.`,
            details: `Tempo projetado: ${Math.round(pacing.totalProjectedMinutes)} min de ${pacing.examDurationMinutes} min (alvo ${pacing.idealSecPerQuestion}s/q).`,
            advice: "Use a folga para revisar questões marcadas como 'Dúvida' e preencher o cartão com calma."
        };
    }

    // Lógica Consistência (Box Plot)
    if (activeEngine === "consistency_boxplot") {
        const box = buildConsistencyBoxPlotData(safeCategoriesList, {
            showOnlyFocus,
            focusSubjectId: focusCategory.id,
            timeWindow,
            minScore: showOnlyFocus ? safeMinScore : globalMinScore,
            maxScore: showOnlyFocus ? safeMaxScore : globalMaxScore
        });
        const volatileRows = box.rows
            .filter((r) => r.stability === 'Volátil')
            .sort((a, b) => (b.iqr - a.iqr) || (b.std - a.std));
        if (!box.rows.length) {
            return {
                type: 'info', icon: "📦", title: "Consistência por Disciplina",
                text: "Registre simulados para mapear quartis (Q1–Mediana–Q3).",
                details: "O Box Plot revela se sua média vem de regularidade real ou de picos isolados.",
                advice: "Mantenha ao menos 3 simulados por disciplina para medir estabilidade (IQR)."
            };
        }
        if (volatileRows.length > 0) {
            return {
                type: 'warning', icon: "📦", title: "!!Disciplinas Voláteis Detectadas!!",
                text: `!!${volatileRows.length} ${volatileRows.length === 1 ? 'matéria' : 'matérias'}!! com alta dispersão (IQR elevado).`,
                details: `Mais instável: **${volatileRows[0].name}** (Mín ${volatileRows[0].min}${unit} → Máx ${volatileRows[0].max}${unit}, IQR ${volatileRows[0].iqr.toFixed(1)}).`,
                advice: "Ataque os subtópicos que causam quedas bruscas para estreitar a caixa Q1–Q3."
            };
        }
        const stableCount = box.rows.filter((r) => r.stability === 'Estável').length;
        if (stableCount === 0) {
            const fewDataOnly = box.rows.every((r) => r.stability === 'Poucos dados');
            return {
                type: 'info',
                icon: "📦",
                title: fewDataOnly ? "Amostra Inicial de Consistência" : "Regularidade Moderada",
                text: fewDataOnly
                    ? "Ainda há poucos simulados por disciplina para confirmar estabilidade estatística."
                    : `Nenhuma disciplina volátil, mas a dispersão está moderada (melhor mediana: **${box.rows[0].name}** com ${box.rows[0].median}${unit}).`,
                details: fewDataOnly
                    ? "Acumule pelo menos 3 simulados por disciplina para ativar a classificação completa de estabilidade."
                    : "Estreite ainda mais as caixas Q1–Q3 para reduzir a variância no dia da prova.",
                advice: "Mantenha revisões periódicas para consolidar a consistência."
            };
        }
        return {
            type: 'success', icon: "📦", title: "++Regularidade Estatística Sólida++",
            text: `Nenhuma disciplina classificada como volátil (${stableCount}/${box.rows.length} estáveis).`,
            details: `Melhor mediana: **${box.rows[0].name}** (${box.rows[0].median}${unit}).`,
            advice: "Caixas estreitas significam baixa chance de surpresa no dia da prova. Mantenha!"
        };
    }

    // Lógica Cone Futuro (Projection Fan)
    if (activeEngine === "projection_fan") {
        const examHorizon = Math.max(1, Math.min(365, Math.round(safeFinite(projectDays, 60))));
        const fanCategory = showOnlyFocus !== false ? (focusCategory || null) : null;
        const fanMin = fanCategory ? safeMinScore : globalMinScore;
        const fanMax = fanCategory ? safeMaxScore : globalMaxScore;
        const fanTarget = fanCategory ? focusEffTarget : globalEffTarget;
        const fan = buildProjectionFanData(fanCategory, fullTimeline, {
            minScore: fanMin,
            maxScore: fanMax,
            targetScore: fanTarget,
            timeWindow,
            horizonDays: examHorizon,
            mcHorizonDays: examHorizon,
            activeMcResult: fanCategory ? activeMcResult : null
        });
        if (!fan.summary) {
            return {
                type: 'info', icon: "🎯", title: "Cone de Projeção Futuro",
                text: fanCategory ? `Aguardando simulados em ${fanCategory.name}.` : "Aguardando simulados para projeção global.",
                details: "Cadastre registros para projetar as faixas P10, P50 e P90 até o dia da prova.",
                advice: "Quanto mais constante seu histórico, mais estreito e confiável fica o cone."
            };
        }
        const hitsTarget = fan.summary.finalP50 >= fanTarget;
        const fanDetails = fan.alreadyAtTarget
            ? `Você já está na meta (${fanTarget.toFixed(1)}${unit}) — mantenha a constância para blindar também o cenário P10.`
            : (fan.targetCrossingDate
                ? `A mediana P50 cruza a meta (${fanTarget.toFixed(1)}${unit}) em ++${fan.targetCrossingDate.split('-').reverse().join('/')}++.`
                : `No ritmo atual (${fan.summary.monthlyTrend >= 0 ? '+' : ''}${fan.summary.monthlyTrend}${unit}/mês), a mediana ainda não alcança ${fanTarget.toFixed(1)}${unit} no prazo.`);
        return {
            type: hitsTarget ? 'success' : 'warning',
            icon: "🎯",
            title: hitsTarget ? "++Projeção P50 no Rumo da Meta++" : "!!Projeção P50 Abaixo da Meta!!",
            text: `Cenário provável (P50) em ${fan.summary.horizonDays}d: **${fan.summary.finalP50.toFixed(1)}${unit}** (P10: ${fan.summary.finalP10.toFixed(1)} – P90: ${fan.summary.finalP90.toFixed(1)}).`,
            details: fanDetails,
            advice: hitsTarget
                ? "Mantenha a frequência para puxar também o cenário conservador (P10) para cima da meta."
                : "Eleve o volume de questões focadas nos subtópicos críticos para inclinar o cone para cima."
        };
    }

    // Lógica Kalman Latente
    if (activeEngine === "kalman_latent") {
        const kalmanCategory = showOnlyFocus ? focusCategory : null;
        const kalman = buildKalmanChartData(kalmanCategory, fullTimeline, {
            minScore: kalmanCategory ? safeMinScore : globalMinScore,
            maxScore: kalmanCategory ? safeMaxScore : globalMaxScore,
            timeWindow
        });
        if (!kalman.summary) {
            return {
                type: 'info', icon: "🧲", title: "Filtro de Kalman (State-Space)",
                text: kalmanCategory ? `Necessário ao menos 2 simulados em ${kalmanCategory.name}.` : "Necessário ao menos 2 simulados para ativar o Filtro de Kalman.",
                details: "O filtro separa sua habilidade real latente de choques aleatórios de simulados atípicos.",
                advice: "Registre mais simulados para acompanhar a velocidade estrutural real."
            };
        }
        const { ability, trendPerMonth, noiseReductionPct, outlierCount } = kalman.summary;
        const positive = trendPerMonth >= 0;
        return {
            type: positive ? 'success' : 'warning',
            icon: "🧲",
            title: positive ? "++Habilidade Latente em Evolução++" : "!!Tendência Latente em Queda!!",
            text: `Habilidade real estimada: **${ability.toFixed(1)}${unit}** (${positive ? '+' : ''}${trendPerMonth.toFixed(1)}${unit}/mês).`,
            details: `O filtro removeu ++${noiseReductionPct}%++ do ruído bruto e absorveu ${outlierCount} ${outlierCount === 1 ? 'choque pontual' : 'choques pontuais'}.`,
            advice: positive
                ? "Confie na curva verde mesmo quando surgir um simulado pontual fora da curva."
                : (kalmanCategory
                    ? "A queda apareceu até na curva filtrada (não é só ruído) — revise a base de " + kalmanCategory.name + "."
                    : "A queda apareceu até na curva filtrada global (não é só ruído) — revise as disciplinas em déficit.")
        };
    }

    // Lógica Tornado & Risco
    if (activeEngine === "tornado_whatif") {
        const withCutoff = safeCategoriesList.filter((c) => {
            const mc = safeFinite(c?.minCutoff, NaN);
            return Number.isFinite(mc) && mc > safeFinite(c?.minScore, globalMinScore);
        });
        return {
            type: 'info',
            icon: "🌪️",
            title: "Tornado de Sensibilidade & Risco",
            text: `Simulando alavancagem de aprovação entre ${safeCategoriesList.length} disciplinas.`,
            details: withCutoff.length > 0
                ? `${withCutoff.length} disciplinas possuem corte mínimo configurado — observe a barra vermelha de eliminação por mínimo.`
                : "Configure cortes mínimos por disciplina ou por bloco do edital para medir o risco exato de eliminação.",
            advice: "Priorize estudo na matéria no topo do diagrama de Tornado — ela move mais pontos de aprovação por hora investida."
        };
    }

    // Lógica Correlação & Regimes
    if (activeEngine === "correlation_regimes") {
        const corr = computeWeeklyCategoryCorrelation(safeCategoriesList, globalMaxScore, globalMinScore, { timeWindow });
        const crowding = corr.pairs.filter((p) => p.type === 'crowding_out');
        if (crowding.length > 0) {
            return {
                type: 'warning',
                icon: "🔗",
                title: "!!Efeito Gangorra Detectado!!",
                text: `!!${crowding[0].catA} × ${crowding[0].catB}!! oscilam em direções opostas (r = ${Number(crowding[0].r).toFixed(2)}).`,
                details: "Quando você foca demais em uma, a outra perde rendimento por falta de revisão semanal.",
                advice: "Intercale sessões curtas das duas disciplinas na mesma semana para quebrar a canibalização."
            };
        }
        return {
            type: 'info',
            icon: "🔗",
            title: "Correlação Semanal & Regimes",
            text: corr.pairs.length > 0 ? "Nenhum efeito gangorra forte detectado entre as disciplinas." : "Aguardando ≥ 3 semanas comuns entre disciplinas.",
            details: "Cruza correlação semanal (r) com o Expoente de Hurst (H) e a velocidade de ganho.",
            advice: "Busque manter suas disciplinas no quadrante verde (H > 0.58 e velocidade positiva)."
        };
    }

    // Lógica TRI & Chute
    if (activeEngine === "irt_psychometric") {
        const cutoffMs = resolveCutoffMs(timeWindow);
        const filterByWindow = (list) => {
            return list.filter((item) => {
                const dk = getDateKey(item?.date || item?.createdAt);
                if (todayKeyGlobal && dk && dk > todayKeyGlobal) return false;
                if (cutoffMs == null || !dk) return true;
                const ms = toDateMs(dk);
                return !Number.isFinite(ms) || ms >= cutoffMs;
            });
        };
        const rowMatchesFocus = (r) => {
            if (!showOnlyFocus || !focusCategory) return true;
            if (r.categoryId != null && String(r.categoryId).trim() !== '' && focusCategory.id != null) {
                return String(r.categoryId) === String(focusCategory.id);
            }
            const rSubj = r.subject || r.categoryName || r.materia || r.disciplina || '';
            const fName = focusCategory.name || '';
            return Boolean(rSubj && fName && isSubjectMatch(rSubj, fName));
        };
        const resolveCatForRow = (r) => {
            if (r.categoryId != null && String(r.categoryId).trim() !== '') {
                const byId = safeCategoriesList.find((c) => c?.id != null && String(c.id) === String(r.categoryId));
                if (byId) return byId;
            }
            const subj = r.subject || r.categoryName || r.materia || r.disciplina || '';
            if (!subj) return null;
            return safeCategoriesList.find((c) => c?.name && isSubjectMatch(subj, c.name)) || null;
        };
        const withCatScale = (entry, cat) => {
            const cMax = isStrictNum(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : globalMaxScore;
            const cMin = isStrictNum(cat?.minScore)
                ? Math.min(Number(cat.minScore), cMax)
                : (globalMinScore < cMax ? globalMinScore : 0);
            const resolvedMin = isStrictNum(entry?.minScore) ? Number(entry.minScore) : cMin;
            const resolvedMax = isStrictNum(entry?.maxScore) && Number(entry.maxScore) > resolvedMin
                ? Number(entry.maxScore)
                : (cMax > resolvedMin ? cMax : Math.max(resolvedMin + 1, globalMaxScore));
            return {
                ...entry,
                minScore: resolvedMin,
                maxScore: resolvedMax,
            };
        };

        const getRowCatKey = (r) => {
            const matched = resolveCatForRow(r);
            return matched?.id != null ? String(matched.id) : normalize(r.subject || r.categoryName || r.materia || r.disciplina || '');
        };

        const targetCats = showOnlyFocus && focusCategory ? [focusCategory] : safeCategoriesList;
        const rawFromRows = filterByWindow(
            safeRowsList.filter((r) => r && r.valid !== false && r.validated !== false && r.source !== 'manual-error-notebook' && rowMatchesFocus(r))
        ).map((r) => withCatScale(r, resolveCatForRow(r)));

        const rowCoveredCatDates = new Set();
        const rowCoveredIds = new Set();
        rawFromRows.forEach((r) => {
            const ck = getRowCatKey(r);
            const dk = getDateKey(r.date || r.createdAt);
            if (ck && dk) rowCoveredCatDates.add(`${ck}|${dk}`);
            if (r.id) rowCoveredIds.add(String(r.id));
        });

        const histDifficultyByCatDate = new Map();
        const extraHist = [];
        targetCats.forEach((c) => {
            const catKey = c?.id != null ? String(c.id) : normalize(c?.name || '');
            filterByWindow(
                toHistoryArray(c?.simuladoStats?.history).filter((h) => h && h.valid !== false && h.validated !== false)
            ).forEach((h) => {
                const dk = getDateKey(h.date || h.createdAt);
                const cdKey = catKey && dk ? `${catKey}|${dk}` : '';
                const diffVal = h.difficulty || h.dificuldade;
                if (cdKey && diffVal && !histDifficultyByCatDate.has(cdKey)) {
                    histDifficultyByCatDate.set(cdKey, diffVal);
                }
                if (h.id && rowCoveredIds.has(String(h.id))) return;
                if (cdKey && rowCoveredCatDates.has(cdKey)) return;
                extraHist.push(withCatScale(h, c));
            });
        });

        const fromRows = rawFromRows.map((r) => {
            if (r.difficulty || r.dificuldade) return r;
            const ck = getRowCatKey(r);
            const dk = getDateKey(r.date || r.createdAt);
            const inheritedDiff = ck && dk ? histDifficultyByCatDate.get(`${ck}|${dk}`) : null;
            return inheritedDiff ? { ...r, difficulty: inheritedDiff } : r;
        });

        const irtEntries = fromRows.length === 0
            ? extraHist
            : (extraHist.length === 0 ? fromRows : [...fromRows, ...extraHist]);

        const irt = estimateIRTAbility(irtEntries, { minScore: globalMinScore, maxScore: globalMaxScore });
        if (!irt.hasData) {
            return {
                type: 'info', icon: "🧬", title: "Psicometria TRI & Estratégia de Chute",
                text: "Aguardando simulados para calibrar sua habilidade θ.",
                details: "A TRI mede sua proficiência descontando se a prova foi fácil ou difícil.",
                advice: "Configure sua banca (" + examBoard + ") e marque sua confiança no Simulado IA."
            };
        }
        if (irt.pedagogicalIncoherence) {
            return {
                type: 'warning', icon: "🧬", title: "!!Incoerência TRI Detectada!!",
                text: `Habilidade estimada θ = **${irt.theta >= 0 ? '+' : ''}${irt.theta}**, mas com falhas em questões fáceis.`,
                details: irt.incoherenceMessage,
                advice: "Atenção redobrada em questões fáceis — na TRI elas pesam muito na coerência da nota."
            };
        }
        return {
            type: irt.theta >= 0.5 ? 'success' : 'info',
            icon: "🧬",
            title: "Diagnóstico Psicométrico TRI",
            text: `Habilidade latente θ = **${irt.theta >= 0 ? '+' : ''}${irt.theta}** (±${irt.thetaSe}) · Zona Proximal: ++${irt.recommendedDifficulty}++.`,
            details: penaltyPerWrong > 0
                ? `Banca ${examBoard} com penalidade −${penaltyPerWrong}: valide seu ponto de equilíbrio de chute abaixo.`
                : `Banca ${examBoard} sem penalidade por erro — concentre-se em treinar no nível ${irt.recommendedDifficulty}.`,
            advice: `Gere o próximo Simulado IA no nível **${irt.recommendedDifficulty}** para maximizar o aprendizado (~70% de acerto).`
        };
    }

    // Lógica Metacognição & Fadiga
    if (activeEngine === "metacognition_fatigue") {
        const cutoffMs = resolveCutoffMs(timeWindow);
        const tel = safeRowsList
            .filter((r) => {
                if (!r || r.valid === false || r.validated === false || r.source === 'manual-error-notebook') return false;
                const dk = getDateKey(r.date || r.createdAt);
                if (todayKeyGlobal && dk && dk > todayKeyGlobal) return false;
                if (cutoffMs != null) {
                    const ms = dk ? toDateMs(dk) : NaN;
                    if (Number.isFinite(ms) && ms < cutoffMs) return false;
                }
                if (showOnlyFocus && focusCategory) {
                    if (r.categoryId != null && String(r.categoryId).trim() !== '' && focusCategory.id != null) {
                        return String(r.categoryId) === String(focusCategory.id);
                    }
                    const rSubj = r.subject || r.categoryName || r.materia || r.disciplina || '';
                    const fName = focusCategory.name || '';
                    return Boolean(rSubj && fName && isSubjectMatch(rSubj, fName));
                }
                return true;
            })
            .flatMap((r) => (Array.isArray(r.questionTelemetry) ? r.questionTelemetry : []));
        if (!tel.length) {
            return {
                type: 'info', icon: "🧠", title: "Metacognição & Fadiga Intraprova",
                text: "Telemetria aguardando seu próximo Simulado IA.",
                details: "Marque confiança (Certeza / Dúvida / Chute) e causa dos erros para mapear ilusão de competência e queda de rendimento.",
                advice: "Use o Simulado IA — o tempo e o quartil de cada questão são capturados automaticamente."
            };
        }
        const answeredTel = tel.filter((q) => q && q.wasAnswered !== false);
        const certezaErr = answeredTel.filter((q) => normalizeConfidence(q.confidence) === 'certeza' && !(q.correct ?? q.wasCorrect)).length;
        const certezaOk = answeredTel.filter((q) => normalizeConfidence(q.confidence) === 'certeza' && Boolean(q.correct ?? q.wasCorrect)).length;
        if (certezaErr > 0) {
            return {
                type: 'warning', icon: "🧠", title: "!!Ilusão de Competência Detectada!!",
                text: `!!${certezaErr} ${certezaErr === 1 ? 'erro crítico' : 'erros críticos'}!! em questões marcadas com 'Certeza' (vs ++${certezaOk}++ acertos seguros).`,
                details: "Errar tendo certeza indica regra memorizada incorretamente ou pegadinha recorrente da banca.",
                advice: "Converta esses erros em Flashcards FSRS imediatamente — eles trazem o maior retorno de pontos."
            };
        }
        return {
            type: 'success', icon: "🧠", title: "++Boa Calibração Metacognitiva++",
            text: `++${certezaOk} acertos com certeza++ e nenhum erro crítico de ilusão de competência.`,
            details: `Analisando ${answeredTel.length} questões respondidas com telemetria para acompanhar fadiga do 1º ao 4º quarto.`,
            advice: "Continue marcando confiança nos simulados para monitorar resistência em provas longas."
        };
    }

    return { type: 'info', icon: "📊", title: "Diagnóstico Analítico", text: `Acompanhando ${focusCategory.name}.`, advice: "Combine a leitura dos gráficos com revisões direcionadas nos tópicos críticos." };
}
