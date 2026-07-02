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

    if (!timeline?.length || !focusCategory) {
        return {
            type: 'info', icon: "📊", title: defaultTitle,
            text: "Ainda não existem dados suficientes.",
            details: "Continue realizando simulados para desbloquear insights avançados."
        };
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
        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const dayStats = {};
        const now = new Date();
        
        categories.forEach(cat => {
            const history = cat.simuladoStats?.history || [];
            const rawHistory = history
                .filter(h => normalizeDate(h.date)?.getTime() <= now.getTime())
                .map(h => ({ ...h, score: getSafeScore(h, maxScore) }));

            rawHistory.forEach(h => {
                const d = normalizeDate(h.date);
                if (!d) return;
                const dow = d.getDay();
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };
                dayStats[dow].correct += (h.score / maxScore * (Number(h.total) || 0));
                dayStats[dow].total += (Number(h.total) || 0);
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
                text: `Seu rendimento de pico ocorre aos ${DAY_NAMES[best.dow]}s.`,
                details: `Melhor dia: ${DAY_NAMES[best.dow]} (${best.pct.toFixed(1)}%, ${best.total}q). Pior: ${DAY_NAMES[worst.dow]} (${worst.pct.toFixed(1)}%).`,
                advice: "Alinhe seus simulados mais densos ao dia de melhor rendimento."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho acima da meta, vermelhas indicam necessidade de atenção."
        };
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const history = focusCategory.simuladoStats?.history || [];
        const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);

        if (maxSwing > 25 * scale) return { type: 'warning', icon: "⚠️", title: "Alta Volatilidade Detectada", text: `Variação de ${maxSwing.toFixed(0)}${unit}.`, advice: "Oscilações altas indicam 'chute' ou gaps de base." };
        if (maxSwing < 8 * scale) return { type: 'success', icon: "✅", title: "Consistência Sólida", text: `Variação mínima de ${maxSwing.toFixed(0)}${unit}.`, advice: "Pronto para subir a dificuldade." };
        
        return { type: 'info', icon: "📊", title: "Desempenho Estável", text: `Oscilação de ${maxSwing.toFixed(0)}${unit}.` };
    }

    // Lógica do Motor Bayesiano
    if (activeEngine === "bayesian") {
        if (bayesian == null) return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
        const ciLow = lastPoint[`bay_ci_low_${focusCategory.id}`];
        const ciHigh = lastPoint[`bay_ci_high_${focusCategory.id}`];
        const ciWidth = (ciHigh != null && ciLow != null) ? (ciHigh - ciLow) : null;

        if (ciWidth != null && ciWidth < 5 * scale) return { type: 'success', icon: "🎯", title: "Alta Precisão Bayesiana", text: `Seu nível real é ${bayesian.toFixed(1)}${unit}.`, advice: "Convergência máxima do algoritmo." };
        if (ciWidth != null && ciWidth > 20 * scale) return { type: 'warning', icon: "🧠", title: "Incerteza Elevada", text: `Nível estimado: ${bayesian.toFixed(1)}${unit}.`, advice: "Faça mais simulados para estreitar a estimativa." };
        
        return { type: 'info', icon: "🧠", title: "Estimativa Bayesiana", text: `Nível Real: ${bayesian.toFixed(1)}${unit}.` };
    }

    // Lógica de Alertas de Burnout e Consolidação (Fallback)
    if (raw != null && bayesian != null) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const recentVolumeAlert = (focusCategory.simuladoStats?.history || [])
            .filter(h => {
                const d = toDateMs(h.date);
                return !Number.isNaN(d) && (nowMs - d) >= 0 && (nowMs - d) <= sevenDaysMs;
            })
            .reduce((sum, h) => sum + (parseInt(h.total, 10) || (h.score != null ? getSyntheticTotal(maxScore) : 0)), 0);

        if (recentVolumeAlert > 40 && raw < bayesian - 10 * scale) return { type: 'danger', icon: "🚨", title: "Alerta de Burnout", text: `Volume alto, nota em queda.`, advice: "Dê um passo atrás e descanse." };
        if (raw > bayesian + 8 * scale) return { type: 'success', icon: "💡", title: "Conhecimento Consolidado", text: `Desempenho muito acima da média.`, advice: "O conhecimento assentou de vez." };
    }

    return { type: 'info', icon: "✅", title: "Rendimento de Mestre", text: `Operando na zona de máxima eficiência.`, advice: "Mantenha o ritmo." };
}
