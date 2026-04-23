import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell, ReferenceLine,
    LineChart, Line, Legend
} from "recharts";
import { normalizeDate } from "../../../utils/dateHelper";
import { getSafeScore } from "../../../utils/scoreHelper";

const CustomTooltipStyle = {
    backgroundColor: '#0a0f1e',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

// 20 Distinct Colors for the lines
const MEGA_PALETTE = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#fb7185", "#34d399", "#fbbf24", "#a3e635"
];

export function SubtopicsPerformanceChart({ categories = [], focusSubjectId, showOnlyFocus, timeWindow, targetScore = 80, maxScore = 100 }) {

    const [viewMode, setViewMode] = useState('lines'); // 'bars' | 'lines'
    const accuracyUnit = '%';
    const targetScorePct = maxScore > 0 ? (targetScore / maxScore) * 100 : 0;

    // ── CALC LIMITS ──
    const limitMs = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        if (timeWindow !== "all") {
            const days = parseInt(timeWindow, 10);
            if (Number.isFinite(days) && days > 0) {
                return now.getTime() - (days * 24 * 60 * 60 * 1000);
            }
        }
        return 0;
    }, [timeWindow]);

    const relevantCategories = useMemo(() => {
        return categories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId);
    }, [categories, showOnlyFocus, focusSubjectId]);

    // ── COMPUTATION 1: AGGREGATE BARS ──
    const chartData = useMemo(() => {
        const topicMap = {};

        relevantCategories.forEach(cat => {
            const history = cat.simuladoStats?.history || [];
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                if (!limitMs) return true;
                const d = normalizeDate(h.date);
                return d && d.getTime() >= limitMs;
            });

            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];

                (h.topics || []).forEach(t => {
                    const n = String(t.name || '').trim();
                    if (!n) return;
                    const key = n.toLowerCase();

                    if (!topicMap[key]) {
                        topicMap[key] = { name: n, correct: 0, total: 0 };
                    }

                    const total = parseInt(t.total, 10) || 0;
                    if (total === 0) return;
                    const correctCount = total > 0
                        ? Math.round((getSafeScore(t, maxScore) / maxScore) * total)
                        : (Number(t.correct) || 0);

                    topicMap[key].total += total;
                    topicMap[key].correct += correctCount;
                });
            }
        });

        return Object.values(topicMap)
            .filter(d => d.total > 0)
            .map(d => {
                const acc = (d.correct / d.total) * 100;
                return {
                    name: d.name.length > 25 ? d.name.substring(0, 23) + '...' : d.name,
                    fullName: d.name,
                    correct: d.correct,
                    total: d.total,
                    accuracy: Number(acc.toFixed(1)),
                };
            })
            .sort((a, b) => a.accuracy - b.accuracy);
    }, [relevantCategories, limitMs, maxScore]);


    // ── COMPUTATION 2: TIME SERIES LINES ──
    const { timeSeriesData, uniqueTopics } = useMemo(() => {
        const dateMap = {}; // { "DD/MM": { dateLabel, originalDate, [topic_total]: x, [topic_correct]: y } }
        const topTopicSet = new Set();

        relevantCategories.forEach(cat => {
            const history = cat.simuladoStats?.history || [];
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                if (!limitMs) return true;
                const d = normalizeDate(h.date);
                return d && d.getTime() >= limitMs;
            });

            for (const h of recentHistory) {
                const d = normalizeDate(h.date);
                if (!d) continue;
                const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { dateLabel, originalDate: d.getTime() };
                }

                (h.topics || []).forEach(t => {
                    const topicName = String(t.name || '').trim();
                    if (!topicName) return;
                    topTopicSet.add(topicName);

                    const total = parseInt(t.total, 10) || 0;
                    if (total === 0) return;
                    const correct = total > 0
                        ? Math.round((getSafeScore(t, maxScore) / maxScore) * total)
                        : (Number(t.correct) || 0);

                    const totKey = `${topicName}_total`;
                    const corKey = `${topicName}_correct`;

                    if (dateMap[dateKey][totKey] === undefined) {
                        dateMap[dateKey][totKey] = 0;
                        dateMap[dateKey][corKey] = 0;
                    }
                    dateMap[dateKey][totKey] += total;
                    dateMap[dateKey][corKey] += correct;
                });
            }
        });

        let series = Object.values(dateMap).sort((a, b) => a.originalDate - b.originalDate);

        // Converter as somas diárias em % de acerto
        series.forEach(entry => {
            topTopicSet.forEach(topic => {
                const tot = entry[`${topic}_total`];
                const cor = entry[`${topic}_correct`];
                if (tot !== undefined && tot > 0) {
                    entry[topic] = Number(((cor / tot) * 100).toFixed(1));
                }
            });
        });

        // Filtrar dias com poucos dados
        series = series.filter(entry => {
            return Array.from(topTopicSet).some(topic => entry[topic] !== undefined);
        });

        return { timeSeriesData: series, uniqueTopics: Array.from(topTopicSet) };
    }, [relevantCategories, limitMs, maxScore]);


    // Removido o early return daqui para colocá-lo dentro do render principal.

    return (
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-2 sm:p-5 shadow-xl w-full min-h-[600px]">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-2 gap-3">
                <div>
                    <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-500 mb-0.5">
                        🔬 Raio-X de Tópicos {viewMode === 'lines' && <span className="text-slate-400 text-sm ml-1">(Evolução Temporal)</span>}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Percentual de precisão real de cada pilar da sua disciplina.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/50 p-1 rounded-xl shadow-inner shrink-0 w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('bars')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'bars' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                    >
                        Ranking (Barras)
                    </button>
                    <button
                        onClick={() => setViewMode('lines')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'lines' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                    >
                        Tempo (Linhas)
                    </button>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30 mt-4">
                    <span className="text-5xl opacity-40">⏳</span>
                    <div className="text-center">
                        <p className="text-slate-300 font-bold text-base mb-1">Nenhum assunto no período atual</p>
                        <p className="text-slate-500 text-sm max-w-xs block">Mude o filtro de "Período" ali em cima para <b>Tudo</b> caso seus simulados sejam mais antigos.</p>
                    </div>
                </div>
            ) : viewMode === 'bars' ? (
                // ── BARS RENDER ──
                <div className="w-full relative" style={{ height: Math.max(400, chartData.length * 50) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: -5, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />

                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                stroke="#ffffff"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                tickLine={false}
                                tickFormatter={(v) => `${v}${accuracyUnit}`}
                            />

                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#ffffff"
                                tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={110}
                            />

                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                contentStyle={CustomTooltipStyle}
                                itemStyle={{ color: '#e2e8f0' }}
                                formatter={(value, name, props) => {
                                    const entry = props.payload;
                                    return [`${value}% (${entry.correct}/${entry.total} acertos)`, 'Precisão'];
                                }}
                                labelFormatter={(label) => <span className="font-bold text-amber-400">{label}</span>}
                            />

                            <ReferenceLine x={targetScorePct} stroke="rgba(52, 211, 153, 0.4)" strokeDasharray="3 3" />

                            <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={26}>
                                {chartData.map((entry, index) => {
                                    let barColor = "#ef4444";
                                    if (entry.accuracy >= targetScore) barColor = "#10b981";
                                    else if (entry.accuracy >= 60) barColor = "#f59e0b";
                                    return <Cell key={`cell-${index}`} fill={barColor} />;
                                })}
                                <LabelList
                                    dataKey="accuracy"
                                    position="right"
                                    formatter={(val) => `${val}%`}
                                    style={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }}
                                    offset={8}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                // ── LINES RENDER ──
                <div className="w-full relative min-h-[750px]">
                    <div className="absolute top-0 right-4 text-[10px] text-indigo-400/60 font-mono">
                        {uniqueTopics.length} linhas sendo plotadas simultaneamente.
                    </div>
                    {timeSeriesData.length > 1 ? (
                        <ResponsiveContainer width="100%" height={750}>
                            <LineChart data={timeSeriesData} margin={{ top: 20, right: 30, left: -20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

                                <XAxis
                                    dataKey="dateLabel"
                                    stroke="#64748b"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    tickLine={false}
                                />

                                <YAxis
                                    stroke="#64748b"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                />

                                <Tooltip
                                    contentStyle={CustomTooltipStyle}
                                    formatter={(value, name) => [`${value}%`, name]}
                                    labelFormatter={(label) => <span className="text-amber-400 font-bold">{label}</span>}
                                />

                                <ReferenceLine y={targetScore} stroke="rgba(52, 211, 153, 0.4)" strokeDasharray="4 4" label={{ position: 'top', value: 'META', fill: '#6ee7b7', fontSize: 10 }} />

                                <Legend
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                                    iconType="circle"
                                />

                                {uniqueTopics.map((topicName, index) => {
                                    const color = MEGA_PALETTE[index % MEGA_PALETTE.length];
                                    return (
                                        <Line
                                            key={topicName}
                                            type="monotone"
                                            dataKey={topicName}
                                            name={topicName}
                                            stroke={color}
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#0f172a', strokeWidth: 2, stroke: color }}
                                            activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                                            // connectNulls evita que a linha quebre se o usuário não fez simulado desse tópico no dia específico
                                            connectNulls={true}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 italic">
                            <span className="text-3xl mb-2">📉</span>
                            <p>Dados insuficientes no período.</p>
                            <p className="text-xs">Faça simulados em dias diferentes para formar a linha do tempo.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
