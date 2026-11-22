import { normalizeDate, toDateMs, getDateKey } from "../utils/dateHelper.js";
import { parseNoonLocal, addDaysNoon } from "../utils/parseNoonLocal.js";
import { normalize, isSubjectMatch } from "../utils/normalization.js";
import { getSafeScore, getSyntheticTotal, extractTopicsTotals } from "../utils/scoreHelper.js";
import { pointsToRatio, ratioToPoints } from "../utils/scoreHelper.conversions.js";
import {
    buildSpeedAccuracyData,
    buildExamPacingData,
    buildConsistencyBoxPlotData,
    buildProjectionFanData,
    buildKalmanChartData
} from "../utils/advancedChartHelpers.js";
import { computeWeeklyCategoryCorrelation } from "./diagnostics.js";
import { estimateIRTAbility } from "./adaptive/irtEngine.js";

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
    showOnlyFocus = false,
    simuladoRows = [],
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

    if (hasExplicitWindowFilter && effectiveTimeline.length === 0) {
        return {
            type: 'info', icon: "📅", title: "Nenhuma atividade no período",
            text: `Sem simulados registrados nos últimos ${timeWindow} dias.`,
            details: "Amplie a janela temporal para 'Tudo' ou registre um novo simulado para atualizar o diagnóstico."
        };
    }

    if (!effectiveTimeline?.length) {
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

    const lastPoint = effectiveTimeline[effectiveTimeline.length - 1];
    const getLastValid = (key) => {
        for (let i = effectiveTimeline.length - 1; i >= 0; i--) {
            if (effectiveTimeline[i][key] != null) return effectiveTimeline[i][key];
        }
        return null;
    };

    const raw = getLastValid(`raw_${focusCategory.id}`);
    const bayesian = getLastValid(`bay_${focusCategory.id}`);
    const globalMaxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const globalMinScore = safeFinite(minScore, 0);
    const safeMaxScore = safeFinite(focusCategory?.maxScore, globalMaxScore) > 0
        ? safeFinite(focusCategory?.maxScore, globalMaxScore)
        : globalMaxScore;
    const safeMinScore = safeFinite(focusCategory?.minScore, globalMinScore);
    const scale = Math.max(0.01, (safeMaxScore - safeMinScore) / 100);

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const dayStats = {};
        const now = new Date();
        const cutoffMs = resolveCutoffMs(timeWindow);
        
        const allCategories = Array.isArray(categories)
            ? categories.filter(Boolean)
            : Object.values(categories || {}).filter(Boolean);
        const safeCategories = (showOnlyFocus && focusCategory?.id)
            ? allCategories.filter(c => c.id === focusCategory.id)
            : allCategories;

        safeCategories.forEach(cat => {
            const history = toHistoryArray(cat.simuladoStats?.history);
            const cMax = safeFinite(cat?.maxScore, globalMaxScore) > 0 ? safeFinite(cat?.maxScore, globalMaxScore) : globalMaxScore;
            const cMin = safeFinite(cat?.minScore, globalMinScore);

            const rawHistory = history
                .filter(h => {
                    if (h?.valid === false || h?.validated === false) return false;
                    const rawDate = h?.date || h?.createdAt;
                    const d = normalizeDate(rawDate);
                    if (!d || !Number.isFinite(d.getTime()) || d.getTime() > now.getTime()) return false;
                    if (cutoffMs != null) {
                        const dk = getDateKey(rawDate);
                        const ms = dk ? toDateMs(dk) : d.getTime();
                        if (Number.isFinite(ms) && ms < cutoffMs) return false;
                    }
                    return true;
                })
                .map(h => ({ ...h, score: getSafeScore(h, cMax, cMin) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const d = normalizeDate(h?.date || h?.createdAt);
                if (!d || !Number.isFinite(d.getTime())) return;

                const dow = d.getDay();
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
    const safeBayesianFallback = safeFinite(bayesian, NaN);
    const isGeneralPerformanceTab = activeEngine === "raw" || activeEngine === "bayesian" || activeEngine === "compare";

    if (isGeneralPerformanceTab && Number.isFinite(safeRaw) && Number.isFinite(safeBayesianFallback)) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const history = toHistoryArray(focusCategory.simuladoStats?.history);

        const recentVolumeAlert = history
            .filter(h => {
                if (h?.valid === false || h?.validated === false) return false;
                const d = toDateMs(h?.date || h?.createdAt);
                return Number.isFinite(d) && (nowMs - d) >= -86400000 && (nowMs - d) <= sevenDaysMs;
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

        if (recentVolumeAlert > 40 && safeRaw < safeBayesianFallback - 10 * scale) {
            return {
                type: 'danger',
                icon: "🚨",
                title: "!!Alerta de Burnout!!",
                text: `Volume alto (${recentVolumeAlert}q em 7 dias), com nota em !!queda!!.`,
                details: `Nota recente (${safeRaw.toFixed(1)}${unit}) está abaixo do seu nível bayesiano (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "Dê um passo atrás, reduza o volume de simulados e recupere o foco."
            };
        }

        if (safeRaw > safeBayesianFallback + 8 * scale) {
            return {
                type: 'success',
                icon: "💡",
                title: "++Conhecimento Consolidado++",
                text: `Desempenho recente (${safeRaw.toFixed(1)}${unit}) ++muito acima da média++.`,
                details: `Superando o nível bayesiano projetado (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "O conhecimento assentou de vez. Pronto para aumentar a dificuldade."
            };
        }
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const rawCutoffMs = resolveCutoffMs(timeWindow);
        const history = sortByValidDate(focusCategory.simuladoStats?.history).filter((h) => {
            if (rawCutoffMs == null) return true;
            const dk = getDateKey(h?.date || h?.createdAt);
            const ms = dk ? toDateMs(dk) : normalizeDate(h?.date || h?.createdAt)?.getTime();
            return !Number.isFinite(ms) || ms >= rawCutoffMs;
        });
        const scores = history.map(h => getSafeScore(h, safeMaxScore, safeMinScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        
        if (recentScores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };
        
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);
        const displaySwing = unit === '%' ? maxSwing / scale : maxSwing;
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

    // Lógica da Média Histórica (Stats)
    if (activeEngine === "stats") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        if (!Number.isFinite(statsVal)) {
            return { type: 'info', icon: "📐", title: "Média Histórica", text: "Aguardando mais dados..." };
        }

        return {
            type: 'info',
            icon: "📐",
            title: "Média Histórica Global",
            text: `Sua média histórica acumulada é ${statsVal.toFixed(1)}${unit}.`,
            advice: "Lembre-se que a média demora a refletir seu conhecimento recente."
        };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        const bayVal = safeFinite(bayesian, null);
        const textMsg = bayVal != null 
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
        return { 
            type: 'info', 
            icon: "🔬", 
            title: "Auditoria de Assuntos", 
            text: `Navegando nos subtópicos de ${focusCategory.name}.`, 
            details: "Identifique exatamente quais tópicos concentram a maior perda de pontos.",
            advice: "Ataque os !!blocos vermelhos!! para subir seu percentual rapidamente." 
        };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        const ciLow = safeFinite(getLastValid(`bay_ci_low_${focusCategory.id}`) ?? lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(getLastValid(`bay_ci_high_${focusCategory.id}`) ?? lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? (ciHigh - ciLow) : null;
        return { 
            type: 'info', 
            icon: "🚀", 
            title: "Rastreador de Aprovação", 
            text: ciWidth != null ? `Incerteza na sua aprovação: ±${(ciWidth / 2).toFixed(1)}${unit}.` : "Histórico das suas chances reais de aprovação.", 
            details: "Mede o quanto cada simulado aproxima ou afasta você da sua nota de corte.",
            advice: "Se a linha estiver ++subindo++, sua rotina de estudos está funcionando. Mantenha!" 
        };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        return { 
            type: 'info', 
            icon: "📆", 
            title: "Acelerômetro Semanal", 
            text: `Tração do estudo em ${focusCategory.name}.`, 
            details: "Compara os ganhos e perdas percentuais semana a semana.",
            advice: "Monitore semanas !!negativas!! para evitar a !!curva do esquecimento!!." 
        };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        const diff = (Number.isFinite(safeRaw) && Number.isFinite(statsVal)) ? (safeRaw - statsVal) : null;
        const diffText = diff != null 
            ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${unit} vs média histórica.` 
            : "Seu foco de hoje contra sua média.";
        return { 
            type: diff != null && diff >= 0 ? 'success' : 'info', 
            icon: "⚖️", 
            title: "Desempenho Diário", 
            text: diffText, 
            details: `Último simulado: ${Number.isFinite(safeRaw) ? safeRaw.toFixed(1) + unit : '—'}.`,
            advice: "Use o ritmo de hoje para calibrar o volume das próximas sessões." 
        };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        return { 
            type: 'info', 
            icon: "⏳", 
            title: "Velocidade de Resolução", 
            text: `Mapeando velocidade média em ${focusCategory.name}.`, 
            details: "Compara o tempo gasto por questão contra seu histórico geral.",
            advice: "Cuidado com matérias !!lentas!!, elas roubam preciosos minutos da prova." 
        };
    }

    const safeCategoriesList = Array.isArray(categories)
        ? categories.filter(Boolean)
        : Object.values(categories || {}).filter(Boolean);
    const safeRowsList = Array.isArray(simuladoRows)
        ? simuladoRows.filter(Boolean)
        : Object.values(simuladoRows || {}).filter(Boolean);
    const fullTimeline = Array.isArray(timeline) && timeline.length > 0 ? timeline : effectiveTimeline;
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
            idealSecondsPerQuestion: idealSec
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
        return {
            type: 'success', icon: "⚡", title: "++Equilíbrio Speed × Precisão++",
            text: `++${fastAccurate}++ em Domínio Rápido e ${slowAccurate} precisando apenas de mais agilidade.`,
            details: `Referência atual: ${speedData.benchmarkSeconds}s/questão e meta de ${speedData.targetPct}%.`,
            advice: slowAccurate > 0 ? "Treine blocos cronometrados nas matérias azuis para ganhar ritmo sem perder acerto." : "Excelente ritmo! Mantenha a calibragem nos simulados completos."
        };
    }

    // Lógica Ritmo de Prova (Exam Pacing)
    if (activeEngine === "exam_pacing") {
        const pacing = buildExamPacingData(safeCategoriesList, {
            examDurationMinutes: safeFinite(examDurationMinutes, 240),
            examTotalQuestions: safeFinite(examTotalQuestions, 100),
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
        if (pacing.deltaMinutes > 0) {
            const topBottle = pacing.subjects[0];
            return {
                type: 'danger', icon: "⏱️", title: "!!Risco de Estouro de Relógio!!",
                text: `Projeção de !!+${Math.round(pacing.deltaMinutes)} min acima do limite!! (~${pacing.estimatedUnanswered} questões sem tempo).`,
                details: topBottle ? `Maior gargalo: **${topBottle.name}** (${topBottle.avgSecPerQ}s/q, saldo de +${topBottle.deltaMinutes} min).` : `Ritmo alvo: ${pacing.idealSecPerQuestion}s/q.`,
                advice: "Treine resolução cronometrada nas disciplinas com barra ciano maior que o orçamento cinza."
            };
        }
        return {
            type: 'success', icon: "⏱️", title: "++Orçamento de Tempo Saudável++",
            text: `++Folga estimada de ${Math.round(Math.abs(pacing.deltaMinutes))} min++ para gabarito e revisão.`,
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
        const volatileRows = box.rows.filter((r) => r.stability === 'Volátil');
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
        return {
            type: 'success', icon: "📦", title: "++Regularidade Estatística Sólida++",
            text: `Nenhuma disciplina classificada como volátil no período.`,
            details: `Melhor mediana: **${box.rows[0].name}** (${box.rows[0].median}${unit}).`,
            advice: "Caixas estreitas significam baixa chance de surpresa no dia da prova. Mantenha!"
        };
    }

    // Lógica Cone Futuro (Projection Fan)
    if (activeEngine === "projection_fan") {
        const examHorizon = Math.max(1, Math.min(365, Math.round(safeFinite(projectDays, 60))));
        const fanCategory = showOnlyFocus ? focusCategory : null;
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
            if (cutoffMs == null) return list;
            return list.filter((item) => {
                const dk = getDateKey(item?.date || item?.createdAt);
                if (!dk) return true;
                const ms = toDateMs(dk);
                return !Number.isFinite(ms) || ms >= cutoffMs;
            });
        };
        const rowMatchesFocus = (r) => {
            if (!showOnlyFocus || !focusCategory) return true;
            if (r.categoryId != null && focusCategory.id != null) {
                return String(r.categoryId) === String(focusCategory.id);
            }
            const rSubj = r.subject || r.categoryName || r.materia || '';
            const fName = focusCategory.name || '';
            return Boolean(rSubj && fName && isSubjectMatch(rSubj, fName));
        };
        const resolveCatForRow = (r) => {
            if (r.categoryId != null) {
                const byId = safeCategoriesList.find((c) => c?.id != null && String(c.id) === String(r.categoryId));
                if (byId) return byId;
            }
            const subj = r.subject || r.categoryName || r.materia || '';
            if (!subj) return null;
            return safeCategoriesList.find((c) => c?.name && isSubjectMatch(subj, c.name)) || null;
        };
        const withCatScale = (entry, cat) => {
            const cMin = isStrictNum(cat?.minScore) ? Number(cat.minScore) : globalMinScore;
            const cMax = isStrictNum(cat?.maxScore) && Number(cat.maxScore) > cMin ? Number(cat.maxScore) : globalMaxScore;
            return {
                ...entry,
                minScore: isStrictNum(entry?.minScore) ? Number(entry.minScore) : cMin,
                maxScore: isStrictNum(entry?.maxScore) && Number(entry.maxScore) > cMin ? Number(entry.maxScore) : cMax,
            };
        };

        const getRowCatKey = (r) => {
            const matched = resolveCatForRow(r);
            return matched?.id != null ? String(matched.id) : normalize(r.subject || r.categoryName || r.materia || '');
        };

        const targetCats = showOnlyFocus && focusCategory ? [focusCategory] : safeCategoriesList;
        const rawFromRows = filterByWindow(
            safeRowsList.filter((r) => r && r.valid !== false && r.validated !== false && rowMatchesFocus(r))
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
                if (!r || r.valid === false || r.validated === false) return false;
                if (cutoffMs != null) {
                    const dk = getDateKey(r.date || r.createdAt);
                    const ms = dk ? toDateMs(dk) : NaN;
                    if (Number.isFinite(ms) && ms < cutoffMs) return false;
                }
                if (showOnlyFocus && focusCategory) {
                    if (r.categoryId != null && focusCategory.id != null) {
                        return String(r.categoryId) === String(focusCategory.id);
                    }
                    const rSubj = r.subject || r.categoryName || r.materia || '';
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
        const certezaErr = answeredTel.filter((q) => q.confidence === 'certeza' && !(q.correct ?? q.wasCorrect)).length;
        const certezaOk = answeredTel.filter((q) => q.confidence === 'certeza' && Boolean(q.correct ?? q.wasCorrect)).length;
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
