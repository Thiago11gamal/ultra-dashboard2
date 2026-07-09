import React, { useState, useMemo } from 'react';

import { Clock } from 'lucide-react';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { getSyntheticTotal } from '../../../utils/scoreHelper';

const formatTime = (s) => {
    if (s == null || !Number.isFinite(Number(s))) return 'N/A';
    const safe = Math.max(0, Number(s));
    const m = Math.floor(safe / 60);
    const sec = Math.round(safe % 60);
    return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
};

function HalfMoonGauge({ data }) {
    const width = 200;
    const height = 110;
    const cx = width / 2;
    const cy = height;
    const r = 80;
    const strokeWidth = 14;

    const localMax = Math.max(30, data.displaySeconds || 0, data.visualLatestSeconds || data.latestSeconds || 0, data.visualAbsoluteSeconds || data.absoluteLatestSeconds || 0);
    const gaugeMax = localMax * 1.2;

    const getCoordinatesForValue = (val) => {
        const safeVal = Math.max(0, Math.min(val, gaugeMax));
        const angle = Math.PI - (safeVal / gaugeMax) * Math.PI;
        return {
            x: cx + r * Math.cos(angle),
            y: cy - r * Math.sin(angle)
        };
    };

    const makeArc = (startVal, endVal) => {
        const start = getCoordinatesForValue(startVal);
        const end = getCoordinatesForValue(endVal);
        return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
    };

    const displayColor = "#0ea5e9";
    const hasLatest = data.latestSeconds != null;
    const hasAbsolute = data.absoluteLatestSeconds != null;
    const margin = Math.max(1, Math.round((data.displaySeconds || 0) * 0.05));
    
    let latestColor = null;
    if (hasLatest) {
        if (data.latestSeconds === 0) latestColor = "#94a3b8";
        else if (data.latestSeconds > data.displaySeconds + margin) latestColor = "#ef4444";
        else if (data.latestSeconds < data.displaySeconds - margin) latestColor = "#10b981";
        else latestColor = "#eab308";
    }

    let absoluteColor = null;
    if (hasAbsolute) {
        if (data.absoluteLatestSeconds === 0) absoluteColor = "#94a3b8";
        else if (data.absoluteLatestSeconds > data.displaySeconds + margin) absoluteColor = "#ef4444";
        else if (data.absoluteLatestSeconds < data.displaySeconds - margin) absoluteColor = "#10b981";
        else absoluteColor = "#eab308";
    }

    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center h-full shadow-lg hover:border-slate-700 transition-all group relative">
            {hasAbsolute && data.absoluteTotalTime != null && (
                <div 
                    className={`absolute top-2 right-2 text-[10px] text-white font-bold px-1.5 py-0.5 rounded border bg-slate-950/50 ${
                        absoluteColor === '#ef4444' ? 'border-rose-500/40' : 
                        (absoluteColor === '#10b981' ? 'border-emerald-500/40' : 
                        (absoluteColor === '#eab308' ? 'border-yellow-500/40' : 
                        'border-slate-600'))
                    }`}
                    title="Tempo Absoluto do Último Simulado"
                >
                    {formatTime(data.absoluteTotalTime)}
                </div>
            )}
            <h4 className="text-slate-200 font-bold text-sm text-center mb-4 truncate w-full px-6" title={data.fullName}>{data.fullName}</h4>
            
            <div className="relative w-[200px] h-[110px]">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                    {/* Track Background */}
                    <path d={makeArc(0, gaugeMax)} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round" />
                    
                    {/* Track 7-Day Average (Translucent) */}
                    {data.displaySeconds > 0 && (
                        <path d={makeArc(0, data.displaySeconds)} fill="none" stroke={displayColor} strokeOpacity={0.25} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Track Latest Average (Solid) */}
                    {hasLatest && data.latestSeconds > 0 && (
                        <path d={makeArc(0, data.visualLatestSeconds || data.latestSeconds)} fill="none" stroke={latestColor} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Absolute Marker (Pin) */}
                    {hasAbsolute && (
                        <g>
                            {(() => {
                                const pos = getCoordinatesForValue(data.visualAbsoluteSeconds || data.absoluteLatestSeconds);
                                return (
                                    <>
                                        <circle cx={pos.x} cy={pos.y} r={6} fill="#ffffff" stroke={absoluteColor} strokeWidth={2.5} className="shadow-lg drop-shadow-md" />
                                    </>
                                );
                            })()}
                        </g>
                    )}
                </svg>

                {/* Inner Text */}
                <div className="absolute bottom-0 left-0 w-full text-center flex flex-col items-center justify-end pb-1">
                    <span className="text-2xl font-black text-white">{formatTime(hasLatest ? data.latestSeconds : data.displaySeconds)}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        Média: {formatTime(data.displaySeconds)}
                    </span>
                </div>
            </div>

            <div className="w-full mt-auto pt-3 border-t border-slate-800/50 flex flex-col gap-1.5">
                {hasAbsolute && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500" title="Sua média de tempo por questão apenas na última sessão">Última Média</span>
                        <span className={`font-bold ${absoluteColor === '#ef4444' ? 'text-rose-500' : (absoluteColor === '#10b981' ? 'text-emerald-500' : (absoluteColor === '#eab308' ? 'text-yellow-500' : 'text-slate-400'))}`}>{formatTime(data.absoluteLatestSeconds)}</span>
                    </div>
                )}
                {hasLatest && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Média Dia</span>
                        <span className={`font-bold ${latestColor === '#ef4444' ? 'text-rose-400' : (latestColor === '#10b981' ? 'text-emerald-400' : (latestColor === '#eab308' ? 'text-yellow-400' : 'text-slate-400'))}`}>{formatTime(data.latestSeconds)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Média 7 Dias</span>
                    <span className="text-cyan-400 font-bold">{formatTime(data.displaySeconds)}</span>
                </div>
            </div>
        </div>
    );
}

export function TimeSpentChart({ subjectAggData, activeCategories = [], showOnlyFocus, focusCategory, maxScore = 100 }) {
    const [sortOrder, setSortOrder] = useState('slower'); // 'slower' | 'faster'

    const chartData = useMemo(() => {
        const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];
        return safeSubjectAggData
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

                    let rootTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;

                    if (Array.isArray(h.topics)) {
                        for (const t of h.topics) {
                            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                            const tTot = Number(t.total) || 0;
                            if (tTs !== null && tTs > 0 && tTot > 0) { // BUG FIX: Ignora tempos exatos de 0s (origem de banco de dados antigo corrompido)
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
                        if (tot === 0 && h.score != null) tot = getSyntheticTotal(maxScore);
                        if (tot > 0 && rootTs !== null && rootTs > 0) {
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
            let absoluteLatestSeconds = null;
            let absoluteTotalTime = null;

            if (cat) {
                // BUG FIX: Garante que o histórico é ordenado cronologicamente antes de buscar o "último"
                const sortedHistory = Object.values(cat.simuladoStats?.history || {}).sort((a, b) => {
                    const da = toDateMs(a.date || a.createdAt) || 0;
                    const db = toDateMs(b.date || b.createdAt) || 0;
                    return da - db;
                });

                const latestEntry = sortedHistory[sortedHistory.length - 1];
                if (latestEntry) {
                    let rootTs = typeof latestEntry.timeSpent === 'number' ? latestEntry.timeSpent : null;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;

                    if (Array.isArray(latestEntry.topics)) {
                        for (const t of latestEntry.topics) {
                            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                            const tTot = Number(t.total) || 0;
                            if (tTs !== null && tTs > 0 && tTot > 0) { // BUG FIX: Ignora tempos exatos de 0s (origem de banco de dados antigo corrompido)
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
                        if (tot === 0 && latestEntry.score != null) tot = getSyntheticTotal(maxScore);
                        if (tot > 0 && rootTs !== null && rootTs > 0) {
                            latestSeconds = Math.round(rootTs / tot);
                        }
                    }

                    if (latestEntry.lastSessionTimeSpent != null && latestEntry.lastSessionTotal > 0) {
                        absoluteLatestSeconds = Math.round(latestEntry.lastSessionTimeSpent / latestEntry.lastSessionTotal);
                        absoluteTotalTime = latestEntry.lastSessionTimeSpent;
                    }
                }
            }

            const timeStr = formatTime(displaySeconds);

            let deltaStr = "";
            let deltaSeconds = 0;
            if (hasRecentData) {
                deltaSeconds = recentAvgSeconds - avgSeconds;
                const margin = Math.max(1, Math.round(avgSeconds * 0.05));
                if (deltaSeconds > margin) {
                    deltaStr = `🐢 +${deltaSeconds}s`;
                } else if (deltaSeconds < -margin) {
                    deltaStr = `⚡ ${deltaSeconds}s`;
                } else {
                    deltaStr = `✨ Estável`;
                }
            }

            const qstStr = `(${d.timedQuestoes} questões)`;
            const latestStr = latestSeconds !== null ? `Média Dia: ${formatTime(latestSeconds)}` : "";
            const parts = [latestStr, deltaStr, qstStr].filter(Boolean);

            const latestSecs = latestSeconds || 0;
            const visualLatestSeconds = displaySeconds > 0
                ? Math.min(latestSecs, Math.max(displaySeconds * 2.5, 120))
                : Math.min(latestSecs, 180); // Capped at 3 mins if display is 0

            const absoluteSecs = absoluteLatestSeconds || 0;
            const visualAbsoluteSeconds = displaySeconds > 0
                ? Math.min(absoluteSecs, Math.max(displaySeconds * 2.5, 120))
                : Math.min(absoluteSecs, 180);

            return {
                ...d,
                displaySeconds,
                avgSeconds, // Geral
                recentAvgSeconds,
                latestSeconds,
                absoluteLatestSeconds,
                absoluteTotalTime,
                visualLatestSeconds,
                visualAbsoluteSeconds,
                maxSeconds: Math.max(displaySeconds, visualLatestSeconds, visualAbsoluteSeconds),
                hasRecentData,
                deltaSeconds,
                avgFormatted: timeStr,
                generalFormatted: formatTime(avgSeconds),
                avgLabelWithDetails: parts.join("   |   ")
            };
        })
        .sort((a, b) => sortOrder === 'slower' ? b.displaySeconds - a.displaySeconds : a.displaySeconds - b.displaySeconds);
    }, [subjectAggData, activeCategories, sortOrder, maxScore]);

    const legendStats = useMemo(() => {
        return chartData.reduce((acc, item) => {
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
    }, [chartData]);

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
                        ⏳ {showOnlyFocus ? `Tempo Médio por Questão — ${focusCategory?.name}` : "Tempo Médio por Questão (Recente vs Histórico)"}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <span className="inline-flex items-center gap-1.5" title="Sua média de tempo nos últimos 7 dias">
                            <span className="h-2.5 w-3 rounded-[2px] bg-[#0ea5e9]/30" />
                            Média 7 Dias
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Sua média de tempo no último dia estudado">
                            <span className="h-0.5 w-3 rounded-[2px] bg-[#10b981]" />
                            Média do Dia
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Marcador da sua média exata por questão no último simulado (sessão)">
                            <span className="h-2 w-2 rounded-full bg-white ring-1 ring-slate-400" />
                            Última Média
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Cor vermelha significa que você foi mais lento além da margem">
                            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                            Lento (Piorou)
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Cor amarela significa tempo mantido">
                            <span className="h-2 w-2 rounded-full bg-[#eab308]" />
                            Estável (Manteve)
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Cor verde significa que você foi mais rápido além da margem">
                            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                            Rápido (Melhorou)
                        </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-wrap items-center gap-3 sm:gap-5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <span className="inline-flex items-center gap-1.5" title="Média geral de tempo considerando todos os assuntos">
                            MÉDIA GERAL: <span className="font-bold text-slate-300">{formatTime(legendAvgSeconds)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Média geral de tempo no último dia de cada assunto">
                            ÚLTIMO GERAL: <span className="font-bold text-slate-300">{formatTime(legendLatestSeconds)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Quantos assuntos você piorou no último dia">
                            ACIMA DA MÉDIA: <span className="font-bold text-rose-400">{legendStats.above}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Quantos assuntos você melhorou no último dia">
                            ABAIXO DA MÉDIA: <span className="font-bold text-emerald-400">{legendStats.below}</span>
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                        onClick={() => setSortOrder('slower')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${sortOrder === 'slower'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        title="Ordenar pelas matérias mais lentas"
                    >
                        🐢 Mais Lentas
                    </button>
                    <button
                        onClick={() => setSortOrder('faster')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${sortOrder === 'faster'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        title="Ordenar pelas matérias mais rápidas"
                    >
                        ⚡ Mais Rápidas
                    </button>
                </div>
            </div>

            <div className="w-full mt-6 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {chartData.map((data, index) => (
                        <HalfMoonGauge key={`gauge-${data.id}-${index}`} data={data} />
                    ))}
                </div>
            </div>
        </div>
    );
}
