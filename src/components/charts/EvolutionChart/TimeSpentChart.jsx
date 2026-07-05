import React, { useId, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";
import { Clock } from 'lucide-react';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { getSyntheticTotal } from '../../../utils/scoreHelper';

function ComparisonLineShape(props) {
    const { x, y, width, height, payload, fill, radius = [0, 0, 0, 0] } = props;

    if (!payload || !Number.isFinite(width)) {
        return null;
    }

    const baseWidth = Math.max(0, width);
    const avgSeconds = Number(payload.displaySeconds) || 0;
    const hasLatest = payload.latestSeconds !== null && payload.latestSeconds !== undefined;
    const latestSeconds = hasLatest ? Number(payload.latestSeconds) : null;
    const maxSeconds = Number(payload.maxSeconds) || 0;
    const visualLatestSeconds = Number(payload.visualLatestSeconds) || 0;
    
    const pxPerSec = maxSeconds > 0 ? baseWidth / maxSeconds : 0;
    
    const avgX = x + (avgSeconds * pxPerSec);
    const latestX = hasLatest ? x + (visualLatestSeconds * pxPerSec) : null;

    const [topLeftRadius, topRightRadius] = Array.isArray(radius) ? radius : [0, 0, 0, 0];
    const rx = topRightRadius || topLeftRadius || 0;

    const lineY = y + height;
    const latestColor = hasLatest ? (latestSeconds > avgSeconds ? "#ef4444" : "#10b981") : null;

    return (
        <g>
            {/* Background Bar (Average) */}
            {avgSeconds > 0 && (
                <rect x={x} y={y} width={avgSeconds * pxPerSec} height={height} rx={rx} ry={rx} fill={fill} />
            )}
            
            {/* Trend Lines */}
            {hasLatest && latestSeconds > avgSeconds ? (
                <>
                    {avgSeconds > 0 && (
                        <line x1={x} y1={lineY} x2={avgX} y2={lineY} stroke="#fbbf24" strokeWidth={3.5} strokeLinecap="round" />
                    )}
                    <line x1={avgX} y1={lineY} x2={latestX} y2={lineY} stroke="#ef4444" strokeWidth={3.5} strokeLinecap="round" />
                </>
            ) : hasLatest ? (
                <>
                    {latestX > x && (
                        <line x1={x} y1={lineY} x2={latestX} y2={lineY} stroke="#fbbf24" strokeWidth={3.5} strokeLinecap="round" />
                    )}
                    <line x1={Math.max(x, latestX)} y1={lineY} x2={avgX} y2={lineY} stroke="#10b981" strokeWidth={3.5} strokeLinecap="round" />
                </>
            ) : null}
            
            {/* Marker Dot for Latest Score */}
            {hasLatest && (
                <circle 
                    cx={latestX} 
                    cy={lineY} 
                    r={3.5} 
                    fill={latestColor} 
                    stroke="#0f172a" 
                    strokeWidth={1.5} 
                />
            )}
        </g>
    );
}

export function TimeSpentChart({ subjectAggData, activeCategories = [], showOnlyFocus, focusCategory }) {
    const instanceId = useId().replace(/:/g, "");
    const [sortOrder, setSortOrder] = useState('slower'); // 'slower' | 'faster'

    const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];

    const chartData = safeSubjectAggData
        .filter(d => d.timedQuestoes > 0 && d.timeSpent >= 0)
        .map((d) => {
            // Média Geral
            const avgSeconds = Math.round(d.timeSpent / d.timedQuestoes);
            
            // Média Recente (Últimos 7 dias)
            let recentAvgSeconds = null;
            const cat = activeCategories.find(c => c.id === d.id);
            if (cat) {
                const nowMs = new Date().getTime();
                const todayKey = getDateKey(new Date());
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                const history = Object.values(cat.simuladoStats?.history || {});
                
                const recentStats = history.reduce((acc, h) => {
                    const hDateMs = toDateMs(h.date || h.createdAt);
                    const hKey = getDateKey(h.date || h.createdAt);
                    if (Number.isNaN(hDateMs) || (nowMs - hDateMs) > sevenDaysMs || hKey > todayKey) {
                        return acc;
                    }
                    
                    let rootTs = Number(h.timeSpent) || 0;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;
                    
                    if (Array.isArray(h.topics)) {
                        for (const t of h.topics) {
                            const tTs = Number(t.timeSpent) || 0;
                            const tTot = Number(t.total) || 0;
                            if (tTs >= 0 && tTot > 0) { // BUG FIX: Inclui tempos de 0 segundos
                                topicsTs += tTs;
                                topicsTimedQ += tTot;
                                hasTopicWithTime = true;
                            }
                        }
                    }
                    
                    if (hasTopicWithTime) {
                        return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
                    } else {
                        let tot = Number(h.total) || 0;
                        if (tot === 0 && h.score != null) tot = getSyntheticTotal(100);
                        if (tot > 0 && rootTs >= 0) {
                            return { ts: acc.ts + rootTs, tq: acc.tq + tot };
                        }
                    }
                    
                    return acc;
                }, { ts: 0, tq: 0 });

                if (recentStats.tq > 0) {
                    recentAvgSeconds = Math.round(recentStats.ts / recentStats.tq);
                }
            }

            // Define qual métrica usaremos como base (Recente tem prioridade para a barra visual)
            const displaySeconds = recentAvgSeconds !== null ? recentAvgSeconds : avgSeconds;
            const hasRecentData = recentAvgSeconds !== null;
            let latestSeconds = null;

            if (cat) {
                // BUG FIX: Garante que o histórico é ordenado cronologicamente antes de buscar o "último"
                const sortedHistory = Object.values(cat.simuladoStats?.history || {}).sort((a, b) => {
                    const da = toDateMs(a.date || a.createdAt) || 0;
                    const db = toDateMs(b.date || b.createdAt) || 0;
                    return da - db;
                });
                
                const latestEntry = sortedHistory[sortedHistory.length - 1];
                if (latestEntry) {
                    let rootTs = Number(latestEntry.timeSpent) || 0;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;

                    if (Array.isArray(latestEntry.topics)) {
                        for (const t of latestEntry.topics) {
                            const tTs = Number(t.timeSpent) || 0;
                            const tTot = Number(t.total) || 0;
                            if (tTs >= 0 && tTot > 0) { // BUG FIX: Inclui tempos de 0 segundos
                                topicsTs += tTs;
                                topicsTimedQ += tTot;
                                hasTopicWithTime = true;
                            }
                        }
                    }

                    if (hasTopicWithTime && topicsTimedQ > 0) {
                        latestSeconds = Math.round(topicsTs / topicsTimedQ);
                    } else {
                        let tot = Number(latestEntry.total) || 0;
                        if (tot === 0 && latestEntry.score != null) tot = getSyntheticTotal(100);
                        if (tot > 0 && rootTs >= 0) {
                            latestSeconds = Math.round(rootTs / tot);
                        }
                    }
                }
            }
            
            const formatTime = (s) => {
                const m = Math.floor(s / 60);
                const sec = s % 60;
                return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
            };
            
            const timeStr = formatTime(displaySeconds);
            
            let deltaStr = "";
            let deltaSeconds = 0;
            if (hasRecentData) {
                deltaSeconds = recentAvgSeconds - avgSeconds;
                if (deltaSeconds > 1) {
                    deltaStr = `🐢 +${deltaSeconds}s`;
                } else if (deltaSeconds < -1) {
                    deltaStr = `⚡ ${deltaSeconds}s`;
                } else {
                    deltaStr = `✨ Estável`;
                }
            }
            
            const qstStr = `(${d.timedQuestoes} questões)`;
            const parts = [timeStr, deltaStr, qstStr].filter(Boolean);
            
            const latestSecs = latestSeconds || 0;
            const visualLatestSeconds = displaySeconds > 0 
                ? Math.min(latestSecs, displaySeconds * 1.35)
                : Math.min(latestSecs, 180); // Capped at 3 mins if display is 0

            return { 
                ...d, 
                displaySeconds,
                avgSeconds, // Geral
                recentAvgSeconds,
                latestSeconds,
                visualLatestSeconds,
                maxSeconds: Math.max(displaySeconds, visualLatestSeconds),
                hasRecentData,
                deltaSeconds,
                avgFormatted: timeStr,
                generalFormatted: formatTime(avgSeconds),
                avgLabelWithDetails: parts.join("   |   ")
            };
        })
        .sort((a, b) => sortOrder === 'slower' ? b.displaySeconds - a.displaySeconds : a.displaySeconds - b.displaySeconds);
    
    const formatTime = (s) => {
        const safe = Number(s) || 0;
        const m = Math.floor(safe / 60);
        const sec = safe % 60;
        return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
    };

    const legendStats = chartData.reduce((acc, item) => {
        if (Number.isFinite(Number(item.displaySeconds))) {
            acc.avg += Number(item.displaySeconds);
            acc.avgCount += 1;
        }

        if (item.latestSeconds !== null && Number.isFinite(Number(item.latestSeconds))) {
            acc.latest += Number(item.latestSeconds);
            acc.latestCount += 1;

            if (Number(item.latestSeconds) > Number(item.displaySeconds)) acc.above += 1;
            if (Number(item.latestSeconds) < Number(item.displaySeconds)) acc.below += 1;
        }
        return acc;
    }, { avg: 0, latest: 0, above: 0, below: 0, avgCount: 0, latestCount: 0 });

    const legendAvgSeconds = legendStats.avgCount > 0
        ? Math.round(legendStats.avg / legendStats.avgCount) : 0;

    const legendLatestSeconds = legendStats.latestCount > 0
        ? Math.round(legendStats.latest / legendStats.latestCount) : 0;

    if (chartData.length === 0) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30 w-full mt-2">
                <span className="text-5xl">⏳</span>
                <div className="text-center">
                    <p className="text-slate-300 font-bold text-base mb-1">Coletando Dados de Agilidade AI</p>
                    <p className="text-slate-500 text-sm max-w-sm px-4">
                        O sistema começou a registrar seus tempos hoje. Faça um <span className="text-cyan-400 font-bold">novo Simulado IA</span> para que seu gráfico de agilidade apareça aqui!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group w-full min-w-0 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-5 min-w-0">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <Clock size={12} className="text-cyan-400" /> Agilidade AI
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                            Apenas Simulado IA
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider ml-1 hidden sm:inline-block">
                            Recente vs Geral
                        </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">
                        ⏳ {showOnlyFocus ? `Tempo Médio por Questão — ${focusCategory?.name}` : "Tempo Médio (Recente vs Histórico)"}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                            Média: {formatTime(legendAvgSeconds)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-0.5 w-3 rounded-full bg-amber-400" />
                            Último: {formatTime(legendLatestSeconds)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-0.5 w-3 rounded-full bg-rose-400" />
                            Acima da média: {legendStats.above}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-0.5 w-3 rounded-full bg-emerald-400" />
                            Abaixo da média: {legendStats.below}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                        onClick={() => setSortOrder('slower')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            sortOrder === 'slower'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title="Ordenar pelas matérias mais lentas"
                    >
                        🐢 Mais Lentas
                    </button>
                    <button
                        onClick={() => setSortOrder('faster')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            sortOrder === 'faster'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title="Ordenar pelas matérias mais rápidas"
                    >
                        ⚡ Mais Rápidas
                    </button>
                </div>
            </div>
 
            <div className="w-full mt-4 pb-2 transition-all duration-300" style={{ minHeight: `${Math.max(120, chartData.length * 40)}px` }}>
                <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={Math.max(120, chartData.length * 40)} minWidth={1}>
                        <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 10, right: 140, left: 0, bottom: 5 }}
                            barSize={14}
                            barGap={2}
                        >
                            <defs>
                                <linearGradient id={`gradTime_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="rgba(255,255,255,0.04)" />
                            <XAxis 
                                type="number"
                                domain={[0, dataMax => Math.max(120, Math.ceil(dataMax * 1.1))]}
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                                tickFormatter={(val) => {
                                    const m = Math.floor(val / 60);
                                    const s = val % 60;
                                    if (m === 0) return `${s}s`;
                                    return s === 0 ? `${m}m` : `${m}m ${s}s`;
                                }}
                            />
                            <YAxis 
                                type="category"
                                dataKey="fullName" 
                                axisLine={false} 
                                tickLine={false} 
                                width={160}
                                tick={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 600 }} 
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        const latestFormatted = d.latestSeconds != null ? (() => {
                                            const m = Math.floor(d.latestSeconds / 60);
                                            const s = d.latestSeconds % 60;
                                            return m === 0 ? `${s}s` : s === 0 ? `${m}m` : `${m}m ${String(s).padStart(2, '0')}s`;
                                        })() : 'N/A';
                                        
                                        return (
                                            <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                                                <p className="text-white font-black text-sm mb-3 border-b border-white/10 pb-2">{d.fullName}</p>
                                                
                                                {d.hasRecentData ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                                                <span className="text-slate-400 text-xs font-bold">Média 7 Dias:</span>
                                                            </div>
                                                            <span className="text-white font-black text-xs bg-white/5 px-2 py-0.5 rounded">{d.avgFormatted}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${d.latestSeconds > d.displaySeconds ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                                                                <span className="text-slate-200 text-xs font-bold">Último Simulado:</span>
                                                            </div>
                                                            <span className="text-white font-black text-xs bg-white/10 px-2 py-0.5 rounded border border-white/5">{latestFormatted}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-slate-600" />
                                                                <span className="text-slate-500 text-xs font-bold">Histórico Geral:</span>
                                                            </div>
                                                            <span className="text-slate-400 font-bold text-xs bg-white/5 px-2 py-0.5 rounded">{d.generalFormatted}</span>
                                                        </div>
                                                        <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Variação:</span>
                                                            <span className={`text-xs font-black px-2 py-1 rounded-lg ${d.deltaSeconds > 0 ? 'bg-rose-500/10 text-rose-400' : d.deltaSeconds < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                {d.deltaSeconds > 0 ? `Lento (+${d.deltaSeconds}s)` : d.deltaSeconds < 0 ? `Rápido (${d.deltaSeconds}s)` : 'Sem alteração'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                                                            <span className="text-slate-300 text-xs">Média Geral:</span>
                                                            <span className="text-white font-bold text-xs">{d.generalFormatted}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2.5 h-2.5 rounded-sm ${d.latestSeconds > d.displaySeconds ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                                                            <span className="text-slate-300 text-xs font-bold">Último Simulado:</span>
                                                            <span className="text-white font-bold text-xs">{latestFormatted}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-white/10 uppercase tracking-widest text-center">Volume Geral: {d.timedQuestoes} questões</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="maxSeconds" radius={[0, 6, 6, 0]} shape={(props) => <ComparisonLineShape {...props} />}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#gradTime_${instanceId})`} />
                                ))}
                                <LabelList 
                                    dataKey="avgLabelWithDetails" 
                                    position="right" 
                                    fill="#94a3b8" 
                                    fontSize={10} 
                                    fontWeight={600}
                                    offset={10}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
