import React, { useState, useMemo } from 'react';

import { Clock } from 'lucide-react';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { getSyntheticTotal } from '../../../utils/scoreHelper';

const formatTime = (s) => {
    if (s == null || !Number.isFinite(Number(s))) return 'N/A';
    // ✅ LOTE-02 FIX: arredondar ANTES de separar minutos/segundos
    const total = Math.round(Math.max(0, Number(s)));
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
};

const HalfMoonGauge = React.memo(function HalfMoonGauge({ data }) {
    const width = 200;
    const height = 110;
    const cx = width / 2;
    const cy = height;
    const r = 80;
    const strokeWidth = 14;

    const localMax = Math.max(30, data.displaySeconds || 0, data.visualLatestSeconds ?? data.latestSeconds ?? 0, data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds ?? 0);
    const gaugeMax = localMax * 1.2;

    const getCoordinatesForValue = (val) => {
        const safeVal = Math.max(0, Math.min(Number.isFinite(val) ? val : 0, gaugeMax));
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
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 flex flex-col items-center justify-between h-full shadow-lg hover:border-cyan-500/30 transition-all group relative overflow-hidden">
            {hasAbsolute && data.absoluteTotalTime != null && (
                <div 
                    className={`absolute top-3 right-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-slate-950/70 shadow-sm ${
                        absoluteColor === '#ef4444' ? 'border-rose-500/40 text-rose-300' : 
                        (absoluteColor === '#10b981' ? 'border-emerald-500/40 text-emerald-300' : 
                        (absoluteColor === '#eab308' ? 'border-yellow-500/40 text-yellow-300' : 
                        'border-slate-700 text-slate-300'))
                    }`}
                    title="Tempo Absoluto da Última Sessão"
                >
                    {formatTime(data.absoluteTotalTime)}
                </div>
            )}
            <h4 className={`text-slate-200 font-bold text-sm text-center mb-3 truncate w-full ${hasAbsolute && data.absoluteTotalTime != null ? 'pr-16 pl-2' : 'px-2'}`} title={data.fullName}>
                {data.fullName}
            </h4>
            
            <div className="relative w-full max-w-[200px] h-[110px] mx-auto my-1">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" role="img" aria-label={`Gauge mostrando tempo médio de ${formatTime(data.displaySeconds)}`}>
                    {/* Track Background */}
                    <path d={makeArc(0, gaugeMax)} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round" />
                    
                    {/* Track 7-Day Average (Translucent) */}
                    {data.displaySeconds > 0 && (
                        <path d={makeArc(0, data.displaySeconds)} fill="none" stroke={displayColor} strokeOpacity={0.25} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Track Latest Average (Solid) */}
                    {hasLatest && data.latestSeconds > 0 && (
                        <path d={makeArc(0, (data.visualLatestSeconds ?? data.latestSeconds))} fill="none" stroke={latestColor} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Absolute Marker (Pin) */}
                    {hasAbsolute && (
                        <g>
                            {(() => {
                                const pos = getCoordinatesForValue(data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds);
                                return (
                                    <circle cx={pos.x} cy={pos.y} r={6} fill="#ffffff" stroke={absoluteColor} strokeWidth={2.5} className="shadow-lg drop-shadow-md" />
                                );
                            })()}
                        </g>
                    )}
                </svg>

                {/* Inner Text */}
                <div className="absolute bottom-0 left-0 w-full text-center flex flex-col items-center justify-end pb-1">
                    <span className="text-2xl font-black text-white tracking-tight">{formatTime((hasLatest && data.latestSeconds > 0) ? data.latestSeconds : data.displaySeconds)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        Média: {formatTime(data.displaySeconds)}
                    </span>
                </div>
            </div>

            <div className="w-full mt-3 pt-2.5 border-t border-slate-800/60 bg-slate-950/40 p-2.5 rounded-xl border flex flex-col gap-1.5">
                {hasAbsolute && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium" title="Sua média de tempo por questão apenas na última sessão">Última Média</span>
                        <span className={`font-bold ${absoluteColor === '#ef4444' ? 'text-rose-400' : (absoluteColor === '#10b981' ? 'text-emerald-400' : (absoluteColor === '#eab308' ? 'text-yellow-400' : 'text-slate-300'))}`}>{formatTime(data.absoluteLatestSeconds)}</span>
                    </div>
                )}
                {hasLatest && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Média Dia</span>
                        <span className={`font-bold ${latestColor === '#ef4444' ? 'text-rose-400' : (latestColor === '#10b981' ? 'text-emerald-400' : (latestColor === '#eab308' ? 'text-yellow-400' : 'text-slate-300'))}`}>{formatTime(data.latestSeconds)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Média 7 Dias</span>
                    <span className="text-cyan-400 font-bold">{formatTime(data.displaySeconds)}</span>
                </div>
            </div>
        </div>
    );
});

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

                    const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                    if (safeTopics.length > 0) {
                        for (const t of safeTopics) {
                            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total) || 0);
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
                const sortedHistory = Object.values(cat.simuladoStats?.history || {})
                    .filter(h => h && toDateMs(h.date || h.createdAt) != null)
                    .sort((a, b) => {
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

                    const safeLatestTopics = Array.isArray(latestEntry.topics) ? latestEntry.topics : Object.values(latestEntry.topics || {});
                    if (safeLatestTopics.length > 0) {
                        for (const t of safeLatestTopics) {
                            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total) || 0);
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

            const qstStr = `(${d.timedQuestoes} ${d.timedQuestoes === 1 ? 'questão' : 'questões'})`;
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
        ? Math.round(legendStats.avg / legendStats.avgCount) : null;

    const legendLatestSeconds = legendStats.latestCount > 0
        ? Math.round(legendStats.latest / legendStats.latestCount) : null;


    if (chartData.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-700/50 bg-slate-950/40 shadow-inner w-full mt-2">
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
        <div className="w-full min-w-0 space-y-6 pt-2">
            {/* Header com Informações e Controles de Ordenação */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-xl">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                            <Clock size={16} />
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                            {showOnlyFocus ? `Tempo Médio por Questão — ${focusCategory?.name}` : "Tempo Médio por Questão (Recente vs Histórico)"}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                            Agilidade AI
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest hidden sm:inline-block">
                            Recente vs Geral
                        </span>
                    </div>

                    <p className="text-xs text-slate-400 font-medium">
                        Monitore a sua velocidade de resolução por matéria e identifique gargalos de tempo antes da prova.
                    </p>

                    {/* Legenda dos Indicadores */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800" title="Média dos últimos 7 dias">
                            <span className="h-2 w-2 rounded-sm bg-cyan-400/50" />
                            Média 7 Dias
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800" title="Média no último dia estudado">
                            <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                            Média do Dia
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800" title="Média exata da última sessão">
                            <span className="h-2 w-2 rounded-full bg-white ring-1 ring-slate-400" />
                            Última Média
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            🐢 Lento
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ✨ Estável
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ⚡ Rápido
                        </span>
                    </div>
                </div>

                {/* Controles de Ordenação */}
                <div className="flex items-center gap-1.5 self-start lg:self-center p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-inner shrink-0">
                    <button
                        type="button"
                        onClick={() => setSortOrder('slower')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                            sortOrder === 'slower'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                        title="Ordenar pelas matérias com maior tempo médio"
                        aria-pressed={sortOrder === 'slower'}
                    >
                        🐢 Mais Lentas
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortOrder('faster')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                            sortOrder === 'faster'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                        title="Ordenar pelas matérias com menor tempo médio"
                        aria-pressed={sortOrder === 'faster'}
                    >
                        ⚡ Mais Rápidas
                    </button>
                </div>
            </div>

            {/* Painéis de KPI Agregados de Agilidade */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Média Geral</span>
                    <span className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
                        {legendAvgSeconds == null ? 'N/A' : formatTime(legendAvgSeconds)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">Todos os assuntos</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Último Geral</span>
                    <span className="text-lg sm:text-2xl font-black text-cyan-400 tracking-tight mt-1">
                        {legendLatestSeconds == null ? 'N/A' : formatTime(legendLatestSeconds)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">Última sessão de cada</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold text-rose-400/80 uppercase tracking-wider">Acima da Média</span>
                    <span className="text-lg sm:text-2xl font-black text-rose-400 tracking-tight mt-1">
                        {legendStats.above} {legendStats.above === 1 ? 'matéria' : 'matérias'}
                    </span>
                    <span className="text-[9px] text-rose-400/60 mt-1">Ritmo mais lento</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Abaixo da Média</span>
                    <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight mt-1">
                        {legendStats.below} {legendStats.below === 1 ? 'matéria' : 'matérias'}
                    </span>
                    <span className="text-[9px] text-emerald-400/60 mt-1">Ritmo acelerado</span>
                </div>
            </div>

            {/* Grid dos Medidores (Gauges) por Disciplina */}
            <div className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                    {chartData.map((data, index) => (
                        <HalfMoonGauge key={`gauge-${data.id}-${index}`} data={data} />
                    ))}
                </div>
            </div>
        </div>
    );
}

