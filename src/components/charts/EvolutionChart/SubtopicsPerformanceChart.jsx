import React, { useMemo, useState, useId, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell, ReferenceLine,
    LineChart, Line, Legend
} from "recharts";
import { normalizeDate, getDateKey, formatDisplayDate } from "../../../utils/dateHelper";
import { getSafeScore, formatValue } from "../../../utils/scoreHelper";

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

const MEGA_PALETTE = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#fb7185", "#34d399", "#fbbf24", "#a3e635"
];

const CustomLineTooltip = React.memo(({ active, payload, label, targetScorePct }) => {
    if (active && payload && payload.length) {
        const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

        return (
            <div className="bg-slate-950/95 border border-white/10 p-4 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl min-w-[320px] z-50">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2 flex justify-between items-center">
                    <span>📅 {label}</span>
                    <span className="text-slate-500 font-bold bg-slate-900/50 px-2 py-0.5 rounded">META: {targetScorePct?.toFixed(0)}%</span>
                </p>
                <div className="space-y-4">
                    {sortedPayload.map((entry, index) => {
                        const pct = Math.max(0, Math.min(100, entry.value));
                        const topicKey = entry.dataKey;
                        const total = entry.payload[`${topicKey}_total`];
                        const correct = entry.payload[`${topicKey}_correct`];
                        const delta = entry.payload[`${topicKey}_delta`];
                        
                        const isTargetMet = pct >= targetScorePct;
                        const gap = isTargetMet ? 0 : Number((targetScorePct - pct).toFixed(1));
                        
                        return (
                            <div key={`item-${index}`} className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col gap-0.5">
                                        <span style={{ color: entry.color }} className="font-bold flex items-center gap-2 truncate max-w-[200px]" title={entry.name}>
                                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}88` }}></span>
                                            <span className="truncate">{entry.name}</span>
                                            {isTargetMet && <span title="Meta atingida" className="text-[10px] shrink-0 drop-shadow-md">🔥</span>}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono ml-4 flex items-center gap-1.5">
                                            <span className="bg-slate-900 px-1 rounded border border-white/5">Vol: {correct}/{total}</span>
                                            {gap > 0 && <span className="text-rose-400/70">Falta {gap}%</span>}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                        <span className="font-mono font-black text-white text-[13px] drop-shadow-md leading-none">
                                            {formatValue(entry.value)}%
                                        </span>
                                        {delta !== undefined && delta !== null && (
                                            <span className={`text-[9px] font-black font-mono leading-none ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '■ '}{formatValue(delta)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-white/5 shadow-inner mt-0.5">
                                    <div 
                                        className="h-full rounded-full transition-all duration-500 ease-out relative" 
                                        style={{ width: `${pct}%`, backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}88` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/30 to-transparent"></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
});

export const SubtopicsPerformanceChart = React.memo(({ 
    categories = [], 
    focusSubjectId, 
    showOnlyFocus, 
    timeWindow, 
    targetScore = 80, 
    minScore = 0,
    maxScore = 100 
}) => {
    const instanceId = useId().replace(/:/g, "");
    const [viewMode, setViewMode] = useState('bars');
    const accuracyUnit = '%';
    
    const range = maxScore - minScore;
    const targetScorePct = range > 0 ? ((targetScore - minScore) / range) * 100 : 0;

    // M1 FIX: Stable callback for Tooltip — inline arrow function would break Recharts memoization.
    const renderLineTooltip = useCallback(
        (props) => <CustomLineTooltip {...props} targetScorePct={targetScorePct} />,
        [targetScorePct]
    );

    const limitMs = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        if (timeWindow !== "all") {
            const days = parseInt(timeWindow, 10);
            if (Number.isFinite(days) && days > 0) {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - days);
                pastDate.setHours(0, 0, 0, 0);
                return pastDate.getTime();
            }
        }
        return 0;
    }, [timeWindow]);

    const relevantCategories = useMemo(() => {
        return categories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId);
    }, [categories, showOnlyFocus, focusSubjectId]);

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
                    if (!n || n.toLowerCase() === 'nenhum') return;
                    const key = n.toLowerCase();

                    if (!topicMap[key]) {
                        topicMap[key] = { name: n, correct: 0, total: 0 };
                    }

                    const total = parseInt(t.total, 10) || 0;
                    if (total === 0) return;
                    
                    const score = getSafeScore(t, maxScore);
                    const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                    const range = Math.max(1e-9, maxScore - minScore);
                    const correctCount = total > 0
                        ? ((normalizedScore - minScore) / range) * total
                        : (Number(t.correct) || 0);

                    topicMap[key].total += total;
                    topicMap[key].correct += correctCount;
                });
            }
        });

        return Object.values(topicMap)
            .filter(d => d.total > 0)
            .map(d => {
                const acc = Math.max(0, Math.min(100, (d.correct / d.total) * 100));
                return {
                    name: d.name.length > 25 ? d.name.substring(0, 23) + '...' : d.name,
                    fullName: d.name,
                    correct: d.correct,
                    total: d.total,
                    accuracy: Number(acc.toFixed(2)),
                };
            })
            .sort((a, b) => a.accuracy - b.accuracy);
    }, [relevantCategories, limitMs, maxScore, minScore]);


    const { timeSeriesData, uniqueTopics } = useMemo(() => {
        const dateMap = {}; 
        const topicVolumeMap = {}; 

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
                const dateKey = getDateKey(d);
                if (!dateKey) continue;
                const dateLabel = formatDisplayDate(dateKey);

                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { dateLabel, originalDate: d.getTime() };
                }

                (h.topics || []).forEach(t => {
                    const topicName = String(t.name || '').trim();
                    if (!topicName || topicName.toLowerCase() === 'nenhum') return;
                    
                    const total = parseInt(t.total, 10) || 0;
                    if (total === 0) return;

                    topicVolumeMap[topicName] = (topicVolumeMap[topicName] || 0) + total;

                    const score = getSafeScore(t, maxScore);
                    const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                    const range = Math.max(1e-9, maxScore - minScore);
                    const correct = total > 0
                        ? ((normalizedScore - minScore) / range) * total
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

        const topTopics = Object.entries(topicVolumeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(entry => entry[0]);

        let series = Object.values(dateMap).sort((a, b) => a.originalDate - b.originalDate);

        let prevAccMap = {};
        series.forEach(entry => {
            topTopics.forEach(topic => {
                const tot = entry[`${topic}_total`];
                const cor = entry[`${topic}_correct`];
                if (tot !== undefined && tot > 0) {
                    const accRaw = (cor / tot) * 100;
                    const acc = Number(Math.max(0, Math.min(100, accRaw)).toFixed(2));
                    entry[topic] = acc;
                    
                    if (prevAccMap[topic] !== undefined) {
                        entry[`${topic}_delta`] = Number((acc - prevAccMap[topic]).toFixed(2));
                    } else {
                        entry[`${topic}_delta`] = null;
                    }
                    prevAccMap[topic] = acc;
                }
            });
        });

        series = series.filter(entry => {
            return topTopics.some(topic => entry[topic] !== undefined);
        });

        return { timeSeriesData: series, uniqueTopics: topTopics };
    }, [relevantCategories, limitMs, maxScore, minScore]);


    return (
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-2 sm:p-5 shadow-xl w-full min-h-[600px]" id={`subtopics_container_${instanceId}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-2 gap-3">
                <div>
                    <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-500 mb-0.5">
                        🔬 Raio-X de Tópicos {viewMode === 'lines' ? <span className="text-slate-400 text-sm ml-1">(Evolução Temporal)</span> : <span className="text-amber-400/60 text-sm ml-1">(Ranking de Desempenho)</span>}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Percentual de precisão real de cada pilar da sua disciplina.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/50 p-1 rounded-2xl shadow-inner shrink-0 w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('bars')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-bold rounded-2xl transition-all will-change-transform ${viewMode === 'bars' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/40'}`}
                    >
                        Ranking (Barras)
                    </button>
                    <button
                        onClick={() => setViewMode('lines')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-bold rounded-2xl transition-all will-change-transform ${viewMode === 'lines' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/40'}`}
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
                <div className="w-full relative" style={{ height: Math.max(450, chartData.length * 60) }}>
                    <ResponsiveContainer width="100%" height="100%" minHeight={450} minWidth={1}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 110, left: -5, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`gradGood_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6}/>
                                    <stop offset="100%" stopColor="#34d399" stopOpacity={1}/>
                                </linearGradient>
                                <linearGradient id={`gradWarn_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6}/>
                                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={1}/>
                                </linearGradient>
                                <linearGradient id={`gradBad_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6}/>
                                    <stop offset="100%" stopColor="#f87171" stopOpacity={1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" horizontal={false} />

                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                stroke="#ffffff"
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                tickLine={false}
                                tickFormatter={(v) => `${v}${accuracyUnit}`}
                                allowDataOverflow={true}
                            />

                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#ffffff"
                                tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                width={150}
                            />

                            <Tooltip
                                offset={30}
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                contentStyle={CustomTooltipStyle}
                                itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                formatter={(value, name, props) => {
                                    const entry = props.payload;
                                    return [`${formatValue(value)}% (${entry.correct}/${entry.total} acertos)`, 'Precisão'];
                                }}
                                labelFormatter={(label) => <span className="font-black text-amber-400 tracking-wider uppercase text-[10px]">{label}</span>}
                            />

                            <ReferenceLine x={targetScorePct} stroke="rgba(52, 211, 153, 0.6)" strokeDasharray="4 4" strokeWidth={2} />

                            <Bar dataKey="accuracy" radius={[0, 8, 8, 0]} barSize={28} fill="#6366f1" background={{ fill: 'rgba(255,255,255,0.04)', radius: [0, 8, 8, 0] }} isAnimationActive={true} animationDuration={800}>
                                {chartData.map((entry, index) => {
                                    let barColor = `url(#gradBad_${instanceId})`;
                                    if (entry.accuracy >= targetScorePct) barColor = `url(#gradGood_${instanceId})`;
                                    else if (entry.accuracy >= 60) barColor = `url(#gradWarn_${instanceId})`;
                                    return <Cell key={`cell-${index}`} fill={barColor} />;
                                })}
                                <LabelList
                                    dataKey="accuracy"
                                    position="right"
                                    content={(props) => {
                                        const { x, y, width, height, value, index } = props;
                                        const entry = chartData[index];
                                        return (
                                            <g>
                                                <text x={x + width + 8} y={y + height / 2 + 4} fill="#ffffff" fontSize={12} fontWeight="black">
                                                    {formatValue(value)}%
                                                </text>
                                                <text
                                                    x={x + width + 8 + (String(formatValue(value)).length * 7) + 16}
                                                    y={y + height / 2 + 3}
                                                    fill="#64748b"
                                                    fontSize={10}
                                                    fontWeight="bold"
                                                >
                                                    ({entry.correct}/{entry.total})
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                // 🎯 FIX: Altura reduzida de 750px para 500px para caber melhor na tela
                <div className="w-full relative min-h-[500px]">
                    <div className="absolute top-0 right-4 text-[10px] text-indigo-400/60 font-mono z-10">
                        {uniqueTopics.length} tópicos plotados simultaneamente.
                    </div>
                    {timeSeriesData.length > 0 ? (
                        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                            <div className="min-w-[700px] lg:min-w-full">
                                <ResponsiveContainer width="100%" height={500} minWidth={1}>
                                    {/* 🎯 FIX: left de -20 para 0 para evitar corte do eixo Y */}
                                    <LineChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                                        <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />

                                        <XAxis
                                            dataKey="originalDate"
                                            stroke="#64748b"
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                            tickLine={false}
                                            tickFormatter={(val) => {
                                                const d = new Date(val);
                                                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                                            }}
                                        />

                                        <YAxis
                                            stroke="#64748b"
                                            domain={[0, 100]}
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${v}%`}
                                            allowDataOverflow={true}
                                        />

                                        <Tooltip
                                            offset={40}
                                            content={renderLineTooltip}
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />

                                        <ReferenceLine y={targetScorePct} stroke="rgba(52, 211, 153, 0.4)" strokeDasharray="4 4" label={{ position: 'top', value: 'META', fill: '#6ee7b7', fontSize: 10 }} />

                                        <Legend
                                            wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                                            iconType="circle"
                                        />

                                        {uniqueTopics.map((topicName, index) => {
                                            const color = MEGA_PALETTE[index % MEGA_PALETTE.length];
                                            return (
                                                <Line connectNulls
                                                    key={topicName}
                                                    type="monotoneX"
                                                    dataKey={topicName}
                                                    name={topicName}
                                                    stroke={color}
                                                    strokeWidth={3}
                                                    dot={{ r: 3, fill: '#0f172a', strokeWidth: 1.5, stroke: color }}
                                                    activeDot={{ r: 5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
                                                    animationDuration={1500}
                                                    animationEasing="ease-in-out"
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
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
});
