import { normalizeDate, toDateMs } from "../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper";

export function generateEvolutionInsights({
    timeline,
    focusCategory,
    activeEngine,
    categories,
    unit = '%',
    maxScore = 100
}) {
    const defaultTitle = "Análise do Sistema";

    if (!timeline?.length) {
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
                return { type: 'info', icon: "📉", title: "Visão Global: Densidade MC", text: "Acompanhamento global das suas projeções no tempo.", details: "Selecione uma disciplina acima para ver convergência específica." };
            case "time_spent":
                return { type: 'info', icon: "⏳", title: "Visão Global: Agilidade AI", text: "Visão geral da sua velocidade de resolução.", details: "Selecione uma disciplina acima para mapear gargalos de tempo específicos." };
            case "weekly_diff":
                return { type: 'info', icon: "📆", title: "Visão Global: Acelerômetro Semanal", text: "Balanço geral de ganhos e perdas na semana.", details: "Selecione uma disciplina acima para focar no esforço semanal." };
            case "today_vs_general":
                return { type: 'info', icon: "⚖️", title: "Visão Global: Hoje vs Geral", text: "Comparativo do seu dia contra a média histórica geral.", details: "Selecione uma disciplina acima para um comparativo específico." };
            default:
                return {
                    type: 'info', icon: "📊", title: "Visão Global",
                    text: "Selecione uma disciplina acima para insights detalhados.",
                    details: "A inteligência artificial analisa cada disciplina individualmente para gerar conselhos."
                };
        }
    }

    const lastPoint = timeline[timeline.length - 1];
    const getLastValid = (key) => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            if (timeline[i][key] != null) return timeline[i][key];
        }
        return null;
    };

    const raw = getLastValid(`raw_${focusCategory.id}`);
    const bayesian = getLastValid(`bay_${focusCategory.id}`);
    const scale = maxScore / 100;

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const DAY_NAMES_PLURAL = ['domingos', 'segundas-feiras', 'terças-feiras', 'quartas-feiras', 'quintas-feiras', 'sextas-feiras', 'sábados'];
        const dayStats = {};
        const now = new Date();
        
        const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
        safeCategories.forEach(cat => {
            const historyRaw = cat.simuladoStats?.history || [];
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
            const rawHistory = history
                .filter(h => normalizeDate(h.date)?.getTime() <= now.getTime())
                .map(h => ({ ...h, score: getSafeScore(h, maxScore) }));

            rawHistory.forEach(h => {
                const d = normalizeDate(h.date);
                if (!d) return;
                const dow = d.getDay();
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };
                let tot = Number(h.total) || 0;
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(maxScore);
                }
                dayStats[dow].correct += (h.score / maxScore * tot);
                dayStats[dow].total += tot;
            });
        });

        const dayEntries = Object.entries(dayStats)
            .filter(([, s]) => s.total >= 5)
            .map(([dow, s]) => ({ dow: Number(dow), pct: (s.correct / s.total) * 100, total: s.total }))
            .sort((a, b) => b.pct - a.pct);

        if (dayEntries.length >= 2) {
            const best = dayEntries[0];
            const worst = dayEntries[dayEntries.length - 1];
            return {
                type: 'success', icon: "📅", title: "Padrão Semanal de Rendimento",
                text: `Seu rendimento de pico ocorre aos **${DAY_NAMES_PLURAL[best.dow]}**.`,
                details: `++Melhor dia: **${DAY_NAMES_SINGULAR[best.dow]}** (${best.pct.toFixed(1)}%, ${best.total}q).++ !!Pior: ${DAY_NAMES_SINGULAR[worst.dow]} (${worst.pct.toFixed(1)}%).!!`,
                advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho ++acima da meta++, !!vermelhas!! indicam necessidade de atenção."
        };
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const historyRaw = focusCategory.simuladoStats?.history || [];
        const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
        const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        
        // CORREÇÃO M4: Guarda contra array vazio (Math.max(...[]) = -Infinity → crash)
        if (recentScores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };
        
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);

        if (maxSwing > 25 * scale) return { type: 'warning', icon: "⚠️", title: "!!Alta Volatilidade Detectada!!", text: `!!Variação de ${maxSwing.toFixed(0)}${unit}.!!`, advice: "Oscilações altas indicam !!'chute'!! ou !!gaps de base!!." };
        if (maxSwing < 8 * scale) return { type: 'success', icon: "✅", title: "++Consistência Sólida++", text: `++Variação mínima de ${maxSwing.toFixed(0)}${unit}.++`, advice: "Pronto para subir a dificuldade." };
        
        return { type: 'info', icon: "📊", title: "Desempenho Estável", text: `Oscilação de ${maxSwing.toFixed(0)}${unit}.` };
    }

    // Lógica do Motor Bayesiano
    if (activeEngine === "bayesian") {
        if (bayesian == null) return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
        const ciLow = lastPoint[`bay_ci_low_${focusCategory.id}`];
        const ciHigh = lastPoint[`bay_ci_high_${focusCategory.id}`];
        const ciWidth = (ciHigh != null && ciLow != null) ? (ciHigh - ciLow) : null;

        if (ciWidth != null && ciWidth < 5 * scale) return { type: 'success', icon: "🎯", title: "++Alta Precisão Bayesiana++", text: `Seu nível real é ${bayesian.toFixed(1)}${unit}.`, advice: "++Convergência máxima++ do algoritmo." };
        if (ciWidth != null && ciWidth > 20 * scale) return { type: 'warning', icon: "🧠", title: "!!Incerteza Elevada!!", text: `Nível estimado: ${bayesian.toFixed(1)}${unit}.`, advice: "Faça mais simulados para estreitar a estimativa." };
        
        return { type: 'info', icon: "🧠", title: "Estimativa Bayesiana", text: `Nível Real: ${bayesian.toFixed(1)}${unit}.` };
    }

    // Lógica da Média Histórica (Stats)
    if (activeEngine === "stats") {
        const statsVal = getLastValid(`stats_${focusCategory.id}`);
        if (statsVal == null) return { type: 'info', icon: "📐", title: "Média Histórica", text: "Aguardando mais dados..." };
        return { type: 'info', icon: "📐", title: "Média Histórica Global", text: `Sua média histórica é ${statsVal.toFixed(1)}${unit}.`, advice: "Lembre-se que a média demora a refletir seu conhecimento recente." };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        return { type: 'info', icon: "⚡", title: "Projeção Monte Carlo", text: "Visualizando simulações estatísticas futuras.", advice: "Use esta projeção para saber se está na rota da aprovação." };
    }

    // Lógica Raio-X de Assuntos (Subtopics)
    if (activeEngine === "subtopics") {
        return { type: 'info', icon: "🔬", title: "Auditoria de Assuntos", text: "Navegando nos subtópicos da matéria.", advice: "Ataque os !!blocos vermelhos!! para subir seu percentual rapidamente." };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        return { type: 'info', icon: "📉", title: "Densidade de Convergência", text: "Histórico das suas projeções Monte Carlo.", advice: "Se a linha estiver ++subindo++, você está matematicamente mais próximo da aprovação." };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        return { type: 'info', icon: "📆", title: "Acelerômetro Semanal", text: "Tração do seu estudo na última semana.", advice: "Monitore semanas !!negativas!! para evitar a !!curva do esquecimento!!." };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        return { type: 'info', icon: "⚖️", title: "Desempenho Diário", text: "Seu foco de hoje contra sua média.", advice: "Use isso para calibrar o esforço de hoje." };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        return { type: 'info', icon: "⏳", title: "Velocidade de Resolução", text: "Mapeando gargalos de tempo.", advice: "Cuidado com matérias !!lentas!!, elas roubam preciosos minutos da prova." };
    }

    // Lógica de Alertas de Burnout e Consolidação (Fallback)
    if (raw != null && bayesian != null) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const historyRaw = focusCategory.simuladoStats?.history || [];
        const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
        const recentVolumeAlert = history
            .filter(h => {
                const d = toDateMs(h.date);
                return !Number.isNaN(d) && (nowMs - d) >= 0 && (nowMs - d) <= sevenDaysMs;
            })
            .reduce((sum, h) => sum + (parseInt(h.total, 10) || (h.score != null ? getSyntheticTotal(maxScore) : 0)), 0);

        if (recentVolumeAlert > 40 && raw < bayesian - 10 * scale) return { type: 'danger', icon: "🚨", title: "!!Alerta de Burnout!!", text: `Volume alto, nota em !!queda!!.`, advice: "Dê um passo atrás e descanse." };
        if (raw > bayesian + 8 * scale) return { type: 'success', icon: "💡", title: "++Conhecimento Consolidado++", text: `Desempenho ++muito acima da média++.`, advice: "O conhecimento assentou de vez." };
    }

    return { type: 'info', icon: "✅", title: "++Rendimento de Mestre++", text: `Operando na zona de ++máxima eficiência++.`, advice: "Mantenha o ritmo." };
}
