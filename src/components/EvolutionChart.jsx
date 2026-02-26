import React, { useState, useMemo } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { monteCarloSimulation } from "../engine";
import { useChartData } from "../hooks/useChartData";
import { ChartTooltip } from "./charts/ChartTooltip";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";

// ── CONFIGURAÇÕES DA INTERFACE ─────────────────────────
const ENGINES = [
    {
        id: "raw", label: "📊 Realidade Bruta", color: "#fb923c", prefix: "raw_", style: "linear",
        explain: { titulo: "A sua montanha-russa de resultados", simples: "Sem filtros. Apenas a porcentagem exata de acertos. Excelente para detectar anomalias.", dica: "Picos isolados não definem sua aprovação. O importante é a tendência geral." },
    },
    {
        id: "raw_weekly", label: "📅 Realidade Semanal", color: "#f472b6", prefix: null, style: "linear",
        explain: { titulo: "Sua evolução semana a semana", simples: "Agrupa todos os simulados por semana. Cada barra mostra a sua taxa de acerto bruta naquela semana.", dica: "Ideal para ver se você está melhorando ao longo das semanas, sem ruído diário." },
    },
    {
        id: "bayesian", label: "🧠 Nível Bayesiano", color: "#34d399", prefix: "bay_", style: "monotone",
        explain: { titulo: "A sua sabedoria consolidada", simples: "O algoritmo não se deixa enganar por dias ruins ou sorte. Ele calcula seu nível real.", dica: "Use esta visão para decidir se já pode avançar de matéria." },
    },
    {
        id: "stats", label: "📐 Média Histórica", color: "#818cf8", prefix: "stats_", style: "basis",
        explain: { titulo: "O peso do seu histórico", simples: "A média de todas as questões já feitas. Serve como uma âncora.", dica: "A média histórica demora a refletir melhorias recentes. Foque no nível Bayesiano." },
    },
    {
        id: "compare", label: "⚡ Raio-X Diagnóstico", color: "#a78bfa", prefix: null, style: "monotone",
        explain: { titulo: "Passado, Presente e Futuro", simples: "A visão mais avançada. Sobrepõe o que fez, seu nível real e projeta o futuro com Monte Carlo.", dica: "Use o seletor 'Focar em' para mergulhar nos detalhes da matéria." },
    },
];


export default function EvolutionChart({ categories = [], targetScore = 80 }) {
    const [activeEngine, setActiveEngine] = useState("bayesian");
    const { activeCategories, timeline, heatmapData, globalMetrics } = useChartData(categories, targetScore);
    const [focusSubjectId, setFocusSubjectId] = useState(activeCategories[0]?.id);

    const focusCategory = useMemo(() => {
        const found = activeCategories.find(c => c.id === focusSubjectId);
        return found || activeCategories[0] || null;
    }, [activeCategories, focusSubjectId]);

    const mcProjection = useMemo(() => {
        if (!focusCategory?.simuladoStats?.history) return null;
        const hist = [...focusCategory.simuladoStats.history].sort((a, b) => new Date(a.date) - new Date(b.date));
        if (hist.length < 5) return null;

        const globalHistory = hist.map(h => ({
            date: new Date(h.date).toISOString().split('T')[0],
            score: (h.correct / h.total) * 100,
            weight: 100
        }));

        const result = monteCarloSimulation(globalHistory, targetScore, 7, 500);
        if (!result) return null;

        const lastDate = new Date(hist[hist.length - 1].date);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 7);

        return {
            date: nextDate.toISOString().split("T")[0],
            mc_p50: parseFloat(result.mean),
            mc_band: [parseFloat(result.ci95Low), parseFloat(result.ci95High)]
        };
    }, [focusCategory, targetScore]);

    const compareData = useMemo(() => {
        if (!focusCategory) return timeline;

        const pts = timeline.map((d) => ({
            ...d,
            "Nota Bruta": d[`raw_${focusCategory.name}`],
            "Nível Bayesiano": d[`bay_${focusCategory.name}`],
            "Média Histórica": d[`stats_${focusCategory.name}`],
        }));

        if (mcProjection) {
            const [, month, day] = mcProjection.date.split("-");
            pts.push({
                date: mcProjection.date,
                displayDate: `${day}/${month} (Futuro)`,
                "Futuro Provável": mcProjection.mc_p50,
                "Cenário Ruim": mcProjection.mc_band[0],
                "Cenário Ótimo": mcProjection.mc_band[1],
            });
        }
        return pts;
    }, [timeline, focusCategory, mcProjection]);

    const chartData = activeEngine === "compare" ? compareData : timeline;

    const radarData = useMemo(() => {
        if (!timeline || timeline.length === 0) return [];
        const lastPoint = timeline[timeline.length - 1];
        return activeCategories.map(cat => ({
            subject: cat.name.split(' ')[0],
            nivel: Math.round(lastPoint[`bay_${cat.name}`] || 0),
            meta: targetScore,
        }));
    }, [timeline, activeCategories, targetScore]);

    const volumeData = useMemo(() => {
        if (!focusCategory) return [];
        return timeline.map(d => ({
            date: d.displayDate,
            volume: d[`raw_total_${focusCategory.name}`] || 0,
            rendimento: Math.round(d[`raw_${focusCategory.name}`] || 0)
        }));
    }, [timeline, focusCategory]);

    const subtopicsData = useMemo(() => {
        if (!focusCategory) return [];
        const topicMap = {};
        (focusCategory.simuladoStats?.history || []).forEach(h => {
            (h.topics || []).forEach(t => {
                if (!topicMap[t.name]) topicMap[t.name] = { correct: 0, total: 0 };
                topicMap[t.name].correct += parseInt(t.correct, 10) || 0;
                topicMap[t.name].total += parseInt(t.total, 10) || 0;
            });
        });

        return Object.entries(topicMap).map(([name, data]) => ({
            name: name,
            value: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
        })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [focusCategory]);

    const pointLeakageData = useMemo(() => {
        if (!focusCategory) return [];
        const topicMap = {};
        let totalErrors = 0;

        // Determinar o início e o fim da semana atual (Segunda a Domingo)
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para segunda-feira ser o dia 1
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Filtrar o histórico para trazer apenas os treinos da semana atual
        const thisWeekHistory = (focusCategory.simuladoStats?.history || []).filter(h => {
            const date = new Date(h.date);
            return date >= startOfWeek && date <= endOfWeek;
        });

        thisWeekHistory.forEach(h => {
            (h.topics || []).forEach(t => {
                if (!topicMap[t.name]) topicMap[t.name] = { errors: 0 };
                const correct = parseInt(t.correct, 10) || 0;
                const total = parseInt(t.total, 10) || 0;
                const errors = Math.max(0, total - correct);

                topicMap[t.name].errors += errors;
                totalErrors += errors;
            });
        });

        if (totalErrors === 0) return [];

        const sorted = Object.entries(topicMap)
            .map(([name, data]) => ({ name, value: data.errors }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        const top = sorted.slice(0, 4);
        const others = sorted.slice(4).reduce((sum, item) => sum + item.value, 0);
        if (others > 0) {
            top.push({ name: "Outros Tópicos", value: others });
        }

        const colors = ["#ef4444", "#fb923c", "#facc15", "#a78bfa", "#94a3b8"];
        return top.map((item, index) => ({
            ...item,
            color: colors[index % colors.length],
            percentage: Math.round((item.value / totalErrors) * 100)
        }));
    }, [focusCategory]);

    const getInsightText = () => {
        if (activeEngine !== "compare") return "Selecione a aba 'Raio-X Diagnóstico' para que eu possa avaliar detalhadamente a sua evolução nesta matéria.";
        if (!timeline.length || !focusCategory) return "Ainda não existem dados suficientes.";

        const lastPoint = timeline[timeline.length - 1];
        const raw = lastPoint[`raw_${focusCategory.name}`];
        const bayesian = lastPoint[`bay_${focusCategory.name}`];
        const recentVolume = lastPoint[`raw_total_${focusCategory.name}`];

        if (raw == null || bayesian == null) return "Ainda não existem dados suficientes para esta matéria.";

        if (recentVolume > 40 && raw < bayesian - 10) {
            return `⚠️ Alerta de Burnout: Estudante, você fez ${recentVolume} questões esta semana, mas a sua nota (${raw.toFixed(1)}%) despencou. O cansaço é real. Recomendo fortemente uma pausa!`;
        }
        if (raw > bayesian + 8) {
            return `💡 Espetacular! Sua última nota (${raw.toFixed(1)}%) estourou a previsão (${bayesian.toFixed(1)}%). O conhecimento assentou de vez. Pode seguir avançando firme.`;
        } else if (raw < bayesian - 8) {
            return `⚠️ Mantenha a calma. A nota da semana foi ${raw.toFixed(1)}%, mas a estatística me garante que o seu nível real é ${bayesian.toFixed(1)}%. Foi apenas um desvio atípico.`;
        } else {
            return `✅ Estabilidade de Mestre! O seu nível medido (${raw.toFixed(1)}%) crava com o seu domínio real (${bayesian.toFixed(1)}%). É esse o ritmo de aprovação.`;
        }
    };

    const engine = ENGINES.find((e) => e.id === activeEngine);

    if (activeCategories.length === 0) {
        return (
            <div className="glass p-8 text-center rounded-3xl animate-fade-in-down border-l-4 border-slate-700">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Gráficos de Evolução</h2>
                <p className="text-slate-400">Realize simulados para desbloquear a sua Máquina do Tempo Estatística.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 1. MÉTRICAS GLOBAIS */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 transition-all hover:bg-indigo-950/30 hover:border-indigo-500/40">
                <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">📈 Esforço Acumulado (Total Histórico)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col">
                        <span className="text-4xl font-black text-slate-100">{globalMetrics.totalQuestions.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 mt-1">Questões Resolvidas</span>
                    </div>
                    <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                        <span className="text-4xl font-black text-green-400">{globalMetrics.totalCorrect.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 mt-1">Acertos Conquistados</span>
                    </div>
                    <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                        <span className="text-4xl font-black text-indigo-300">{globalMetrics.globalAccuracy.toFixed(1)}%</span>
                        <span className="text-xs text-slate-500 mt-1">Precisão Global (Média Bruta)</span>
                    </div>
                </div>
            </div>

            {/* 2. NÍVEL ATUAL POR DISCIPLINA */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {activeCategories.map(cat => {
                    const currentLevel = timeline.length > 0 ? timeline[timeline.length - 1][`bay_${cat.name}`] : 0;
                    return (
                        <div key={cat.id} className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-lg">{cat.icon}</span>
                                <div className={`w-2 h-2 rounded-full ${currentLevel >= targetScore ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : currentLevel >= 55 ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
                            </div>
                            <h3 className="text-slate-400 text-[10px] uppercase tracking-wider font-bold truncate" title={cat.name}>{cat.name}</h3>
                            <p className="text-xl font-bold text-slate-100">{currentLevel ? currentLevel.toFixed(1) : 0}%</p>
                        </div>
                    );
                })}
            </div>

            {/* 3. LENTE DO GRÁFICO (Controlos) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg">
                <div className="flex flex-wrap gap-2 md:gap-4 mb-4">
                    {ENGINES.map((eng) => (
                        <button key={eng.id} onClick={() => setActiveEngine(eng.id)} className={`px-4 py-3 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 flex-1 min-w-[140px] ${activeEngine === eng.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'} border`}>{eng.label}</button>
                    ))}
                </div>
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500" style={{ backgroundColor: engine.color }} />
                    <h3 className="text-sm font-bold mb-1 flex items-center gap-2 transition-colors duration-500" style={{ color: engine.color }}>{engine.explain.titulo}</h3>
                    <p className="text-slate-300 text-sm mb-3">{engine.explain.simples}</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg">
                <div className="mb-5">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-3"><span className="text-indigo-400">1.</span> Linha do Tempo (Desempenho Geral)</h2>
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800 w-full overflow-x-auto custom-scrollbar">
                        <span className="text-[10px] text-slate-400 uppercase font-bold pl-1 mr-1 whitespace-nowrap">Focar em:</span>
                        {activeCategories.map((cat) => (
                            <button key={cat.id} onClick={() => setFocusSubjectId(cat.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${focusSubjectId === cat.id ? 'shadow-sm transform scale-105' : 'border-transparent text-slate-500 hover:text-slate-300 opacity-60 hover:opacity-100'}`} style={{ backgroundColor: focusSubjectId === cat.id ? `${cat.color}15` : 'transparent', borderColor: focusSubjectId === cat.id ? `${cat.color}50` : 'transparent', color: focusSubjectId === cat.id ? cat.color : undefined }}>{cat.name}</button>
                        ))}
                    </div>
                </div>

                {activeEngine === "raw_weekly" ? (
                    <EvolutionHeatmap heatmapData={heatmapData} targetScore={targetScore} />
                ) : (
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {activeEngine !== "compare" ? (
                                <LineChart data={chartData} margin={{ top: 20, right: 10, left: -25, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#475569" tick={{ fontSize: 10 }} dy={10} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} dx={-5} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: `Meta (${targetScore}%)`, fill: "#22c55e", fontSize: 10, position: "insideBottomLeft" }} />
                                    <Tooltip content={<ChartTooltip chartData={chartData} isCompare={false} />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    {activeCategories.map((cat) => {
                                        const isFocused = focusSubjectId === cat.id;
                                        return (
                                            <Line key={cat.id} type={engine.style} dataKey={engine.prefix ? `${engine.prefix}${cat.name}` : `raw_${cat.name}`} name={cat.name} stroke={cat.color} strokeWidth={isFocused ? 3.5 : 2} strokeOpacity={isFocused ? 1 : 0.75} dot={{ r: isFocused ? 5 : 4, fill: cat.color, stroke: "#0f172a", strokeWidth: 1.5 }} activeDot={{ r: isFocused ? 8 : 7, strokeWidth: 2, stroke: "#0f172a" }} connectNulls />
                                        );
                                    })}
                                </LineChart>
                            ) : (
                                <ComposedChart data={compareData} margin={{ top: 20, right: 10, left: -25, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#475569" tick={{ fontSize: 10 }} dy={10} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} dx={-5} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: `Meta (${targetScore}%)`, fill: "#22c55e", fontSize: 10, position: "insideBottomLeft" }} />
                                    <Tooltip content={<ChartTooltip chartData={chartData} isCompare={true} />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="Cenário Ótimo" fill="#818cf815" stroke="none" />
                                    <Area type="monotone" dataKey="Cenário Ruim" fill="#0f172a" stroke="none" />
                                    <Line type="monotone" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={1.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                                    <Line type="monotone" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                                    <Line type="monotone" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={3.5} dot={{ r: 2 }} connectNulls />
                                    <Line type="monotone" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 5, fill: "#a78bfa", stroke: "#0f172a", strokeWidth: 2 }} connectNulls />
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* 5. AVALIAÇÃO DO BOT */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🤖</div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-indigo-300">A Minha Leitura dos Dados</h2>
                <p className="text-slate-300 leading-relaxed text-sm md:text-base relative z-10">{getInsightText()}</p>
            </div>

            {/* 6. GALERIA DE GRÁFICOS AVANÇADOS REUNIDOS! */}
            <div className="mt-16 pt-8 border-t border-slate-800/80">
                <h2 className="text-2xl font-extrabold text-slate-100 mb-2 flex items-center gap-3"><span className="text-indigo-400">🔍</span> Galeria de Análises Detalhadas</h2>
                <p className="text-sm text-slate-400 mb-6">Todos os modelos estatísticos ativos. Os gráficos com o ícone 🎯 respondem à disciplina focada: <strong style={{ color: focusCategory?.color }}>{focusCategory?.name}</strong>.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-slate-700 transition-colors">
                        <h3 className="text-base font-bold text-slate-200 mb-1">🕸️ Raio-X do Equilíbrio Geral</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Meta Desejada" dataKey="meta" stroke="#22c55e" strokeDasharray="3 3" fill="none" />
                                    <Radar name="O Teu Nível" dataKey="nivel" stroke="#818cf8" strokeWidth={2} fill="#818cf8" fillOpacity={0.3} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-slate-700 transition-colors">
                        <h3 className="text-base font-bold text-slate-200 mb-1">📊 Volume vs Rendimento 🎯</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={volumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis yAxisId="left" stroke="#475569" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={false} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: 10 }} />
                                    <Bar yAxisId="right" name="Qtd. Questões" dataKey="volume" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={14} />
                                    <Line yAxisId="left" name="% Acertos" type="monotone" dataKey="rendimento" stroke={focusCategory?.color} strokeWidth={3} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col items-center hover:border-slate-700 transition-colors">
                        <div className="w-full"><h3 className="text-base font-bold text-slate-200 mb-1" title="Quantidade absoluta de erros por assunto nesta semana">🍩 Vazamento de Pontos (Nesta Semana) 🎯</h3></div>
                        <div className="h-[220px] w-full mt-2">
                            {pointLeakageData && pointLeakageData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pointLeakageData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {pointLeakageData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(value, name, props) => [`${value} erros (${props.payload.percentage}%)`, name]} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (<div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">Nenhum erro registrado ou nenhum simulado feito <span className="text-indigo-400 font-bold mt-1">nesta semana</span>! 🎉</div>)}
                        </div>
                        {pointLeakageData && pointLeakageData.length > 0 && (
                            <div className="w-full grid grid-cols-2 gap-3 mt-4">
                                {pointLeakageData.map(err => (
                                    <div key={err.name} className="flex flex-col text-[10px]">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: err.color }}></div>
                                            <span className="text-slate-300 font-bold truncate" title={err.name}>{err.name}</span>
                                        </div>
                                        <span className="text-slate-500 font-mono pl-4">{err.value} erros ({err.percentage}%)</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-slate-700 transition-colors">
                        <h3 className="text-base font-bold text-slate-200 mb-1">📏 Subtópicos 🎯</h3>
                        <div className="h-[250px]">
                            {subtopicsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 20, left: 35, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#cbd5e1" tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} width={110} />
                                        <Tooltip formatter={(value) => [`${value}%`, 'Acerto']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                        <ReferenceLine x={targetScore} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                                            {subtopicsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.value < 50 ? '#ef4444' : entry.value < targetScore ? '#fbbf24' : '#22c55e'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (<div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum subtópico detalhado ainda.</div>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
