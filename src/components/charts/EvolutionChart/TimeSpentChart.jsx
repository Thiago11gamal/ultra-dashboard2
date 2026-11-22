import React, { useState, useMemo, useId } from 'react';
import { Clock, Zap, Timer, TrendingDown, TrendingUp, Minus, ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { getSyntheticTotal } from '../../../utils/scoreHelper';
import { filterHistoryByTimeWindow } from '../../../hooks/useSubjectAggData';

const formatTime = (s) => {
    if (s == null || !Number.isFinite(Number(s)) || Number(s) < 0) return 'N/A';
    // ✅ LOTE-02 FIX: arredondar ANTES de separar minutos/segundos
    const total = Math.round(Math.max(0, Number(s)));
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
};

const HalfMoonGauge = React.memo(function HalfMoonGauge({ data, referenceMaxSeconds, globalAvgSeconds }) {
    const uid = useId().replace(/:/g, '');
    const width = 204;
    const height = 112;
    const cx = width / 2;
    const cy = height - 4;
    const r = 80;
    const strokeWidth = 13;

    const localMax = Math.max(
        30,
        data.displaySeconds || 0,
        data.visualLatestSeconds ?? data.latestSeconds ?? 0,
        data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds ?? 0
    );
    // Blend local and global reference so subjects are visually comparable without crushing fast ones
    const sharedCap = Number.isFinite(Number(referenceMaxSeconds)) && Number(referenceMaxSeconds) > 0
        ? Math.min(localMax * 2.2, Math.max(localMax, Number(referenceMaxSeconds)))
        : localMax;
    const gaugeMax = Math.max(30, sharedCap) * 1.15;

    const getCoordinatesForValue = (val) => {
        const safeVal = Math.max(0, Math.min(Number.isFinite(val) ? val : 0, gaugeMax));
        const angle = Math.PI - (safeVal / gaugeMax) * Math.PI;
        return {
            x: cx + r * Math.cos(angle),
            y: cy - r * Math.sin(angle),
            angle
        };
    };

    const makeArc = (startVal, endVal) => {
        const start = getCoordinatesForValue(startVal);
        const end = getCoordinatesForValue(endVal);
        return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    };

    const displayColor = '#0ea5e9';
    const hasLatest = data.latestSeconds != null;
    const hasAbsolute = data.absoluteLatestSeconds != null;
    const margin = Math.max(1, Math.round((data.displaySeconds || 0) * 0.05));

    let latestColor = null;
    if (hasLatest) {
        if (data.latestSeconds === 0) latestColor = '#94a3b8';
        else if (data.latestSeconds > data.displaySeconds + margin) latestColor = '#f43f5e';
        else if (data.latestSeconds < data.displaySeconds - margin) latestColor = '#10b981';
        else latestColor = '#f59e0b';
    }

    let absoluteColor = null;
    if (hasAbsolute) {
        if (data.absoluteLatestSeconds === 0) absoluteColor = '#94a3b8';
        else if (data.absoluteLatestSeconds > data.displaySeconds + margin) absoluteColor = '#f43f5e';
        else if (data.absoluteLatestSeconds < data.displaySeconds - margin) absoluteColor = '#10b981';
        else absoluteColor = '#f59e0b';
    }

    const activeAccent = latestColor || displayColor;
    const activeGradId = `ts_arc_${uid}`;
    const hasGlobalTick = Number.isFinite(Number(globalAvgSeconds)) && Number(globalAvgSeconds) > 0 && Number(globalAvgSeconds) < gaugeMax * 0.98;
    const globalTickCoords = hasGlobalTick ? (() => {
        const p = getCoordinatesForValue(Number(globalAvgSeconds));
        const innerR = r - strokeWidth * 0.72;
        const outerR = r + strokeWidth * 0.72;
        return {
            x1: cx + innerR * Math.cos(p.angle),
            y1: cy - innerR * Math.sin(p.angle),
            x2: cx + outerR * Math.cos(p.angle),
            y2: cy - outerR * Math.sin(p.angle),
        };
    })() : null;

    const deltaState = data.hasRecentData
        ? (data.deltaSeconds > Math.max(1, Math.round((data.avgSeconds || 0) * 0.05))
            ? 'slower'
            : data.deltaSeconds < -Math.max(1, Math.round((data.avgSeconds || 0) * 0.05))
                ? 'faster'
                : 'stable')
        : null;

    return (
        <div
            className="rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-md p-4 flex flex-col justify-between h-full shadow-[0_8px_28px_-18px_rgba(0,0,0,0.7)] hover:border-cyan-400/35 hover:bg-slate-900/85 hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden"
        >
            {/* Subtle top hairline */}
            <div
                className="absolute inset-x-0 top-0 h-[2px] opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${activeAccent}, transparent)` }}
            />

            {/* Header: aligned left title + right total session pill */}
            <div className="flex items-start justify-between gap-2 mb-2 min-h-[2.25rem]">
                <div className="min-w-0 flex-1">
                    <h4
                        className="text-slate-100 font-bold text-sm leading-snug line-clamp-2 group-hover:text-white transition-colors"
                        title={data.fullName}
                    >
                        {data.fullName}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {data.timedQuestoes > 0 && (
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                                {data.timedQuestoes} {data.timedQuestoes === 1 ? 'questão' : 'questões'}
                            </span>
                        )}
                        {deltaState && (
                            <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border tabular-nums ${
                                    deltaState === 'slower'
                                        ? 'bg-rose-500/12 text-rose-300 border-rose-500/25'
                                        : deltaState === 'faster'
                                            ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25'
                                            : 'bg-amber-500/12 text-amber-300 border-amber-500/25'
                                }`}
                                title="Tendência dos últimos 7 dias vs média geral"
                            >
                                {deltaState === 'slower' ? (
                                    <><TrendingUp size={10} /> +{data.deltaSeconds}s</>
                                ) : deltaState === 'faster' ? (
                                    <><TrendingDown size={10} /> {data.deltaSeconds}s</>
                                ) : (
                                    <><Minus size={10} /> Estável</>
                                )}
                            </span>
                        )}
                    </div>
                </div>

                {hasAbsolute && data.absoluteTotalTime != null && (
                    <div
                        className={`shrink-0 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border bg-slate-950/75 tabular-nums ${
                            absoluteColor === '#f43f5e'
                                ? 'border-rose-500/35 text-rose-300'
                                : absoluteColor === '#10b981'
                                    ? 'border-emerald-500/35 text-emerald-300'
                                    : absoluteColor === '#f59e0b'
                                        ? 'border-amber-500/35 text-amber-300'
                                        : 'border-white/10 text-slate-300'
                        }`}
                        title="Tempo total da última sessão"
                    >
                        {formatTime(data.absoluteTotalTime)}
                    </div>
                )}
            </div>

            {/* Half-Moon Gauge SVG */}
            <div className="relative w-full max-w-[204px] h-[112px] mx-auto my-1.5">
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    className="overflow-visible w-full h-full"
                    role="img"
                    aria-label={`Gauge mostrando tempo médio de ${formatTime(data.displaySeconds)}`}
                >
                    <defs>
                        <linearGradient id={activeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={activeAccent} stopOpacity="0.65" />
                            <stop offset="100%" stopColor={activeAccent} stopOpacity="1" />
                        </linearGradient>
                    </defs>

                    {/* Track Background */}
                    <path
                        d={makeArc(0, gaugeMax)}
                        fill="none"
                        stroke="rgba(30, 41, 59, 0.85)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Track 7-Day Average (Translucent Cyan) */}
                    {data.displaySeconds > 0 && (
                        <path
                            d={makeArc(0, data.displaySeconds)}
                            fill="none"
                            stroke={displayColor}
                            strokeOpacity={0.28}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                    )}

                    {/* Track Latest Day Average (Gradient + subtle glow) */}
                    {hasLatest && data.latestSeconds > 0 && (
                        <path
                            d={makeArc(0, (data.visualLatestSeconds ?? data.latestSeconds))}
                            fill="none"
                            stroke={`url(#${activeGradId})`}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 6px ${activeAccent}55)` }}
                        />
                    )}

                    {/* Global Average Reference Tick */}
                    {globalTickCoords && (
                        <line
                            x1={globalTickCoords.x1}
                            y1={globalTickCoords.y1}
                            x2={globalTickCoords.x2}
                            y2={globalTickCoords.y2}
                            stroke="#e2e8f0"
                            strokeOpacity="0.55"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            <title>{`Média geral: ${formatTime(globalAvgSeconds)}`}</title>
                        </line>
                    )}

                    {/* Absolute Last Session Marker (Pin) */}
                    {hasAbsolute && (() => {
                        const pos = getCoordinatesForValue(data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds);
                        return (
                            <g>
                                <circle cx={pos.x} cy={pos.y} r={8.5} fill="#020617" fillOpacity={0.7} />
                                <circle cx={pos.x} cy={pos.y} r={5.5} fill="#ffffff" stroke={absoluteColor} strokeWidth={2.5} />
                            </g>
                        );
                    })()}
                </svg>

                {/* Inner Readout */}
                <div className="absolute bottom-0 left-0 w-full text-center flex flex-col items-center justify-end pb-1 pointer-events-none">
                    <span className="text-2xl font-black font-mono tabular-nums text-white tracking-tight leading-none">
                        {formatTime((hasLatest && data.latestSeconds > 0) ? data.latestSeconds : data.displaySeconds)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold tracking-wide mt-1 tabular-nums">
                        Média: {formatTime(data.displaySeconds)}
                    </span>
                </div>
            </div>

            {/* Detail Rows */}
            <div className="w-full mt-2.5 border border-white/[0.06] bg-slate-950/50 p-2.5 rounded-xl flex flex-col gap-1.5">
                {hasAbsolute && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Última média</span>
                        <span
                            className={`font-mono font-bold tabular-nums ${
                                absoluteColor === '#f43f5e'
                                    ? 'text-rose-400'
                                    : absoluteColor === '#10b981'
                                        ? 'text-emerald-400'
                                        : absoluteColor === '#f59e0b'
                                            ? 'text-amber-300'
                                            : 'text-slate-300'
                            }`}
                        >
                            {formatTime(data.absoluteLatestSeconds)}
                        </span>
                    </div>
                )}
                {hasLatest && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Média Dia</span>
                        <span
                            className={`font-mono font-bold tabular-nums ${
                                latestColor === '#f43f5e'
                                    ? 'text-rose-400'
                                    : latestColor === '#10b981'
                                        ? 'text-emerald-400'
                                        : latestColor === '#f59e0b'
                                            ? 'text-amber-300'
                                            : 'text-slate-300'
                            }`}
                        >
                            {formatTime(data.latestSeconds)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">
                        {data.hasRecentData === false ? 'Média (Geral)' : 'Média (7 dias)'}
                    </span>
                    <span className="text-cyan-400 font-mono font-bold tabular-nums">
                        {formatTime(data.displaySeconds)}
                    </span>
                </div>
            </div>
        </div>
    );
});

export const TimeSpentChart = React.memo(function TimeSpentChart({
    subjectAggData,
    activeCategories = [],
    categories = [],
    showOnlyFocus,
    focusCategory,
    timeWindow = 'all',
    maxScore = 100,
    minScore: _minScore = 0
}) {
    const [sortOrder, setSortOrder] = useState('slower'); // 'slower' | 'faster'

    const extractEntryTiming = (entry, catMax) => {
        const rootTs = typeof entry?.timeSpent === 'number' ? entry.timeSpent : null;
        let topicsTs = 0;
        let topicsTimedQ = 0;
        let hasTopicWithTime = false;
        const safeTopics = Array.isArray(entry?.topics) ? entry.topics : Object.values(entry?.topics || {});
        for (const t of safeTopics) {
            if (!t || typeof t !== 'object') continue;
            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
                ? t.timedQuestoes
                : (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0);
            if (tTs !== null && tTs > 0 && tTot > 0) {
                topicsTs += tTs;
                topicsTimedQ += tTot;
                hasTopicWithTime = true;
            }
        }
        if (hasTopicWithTime && topicsTimedQ > 0) return { ts: topicsTs, tq: topicsTimedQ };
        const explicitRootTimedQ = typeof entry?.timedQuestoes === 'number' && entry.timedQuestoes > 0
            ? entry.timedQuestoes
            : (Number.isFinite(Number(entry?.timedQuestoes)) && Number(entry?.timedQuestoes) > 0 ? Number(entry?.timedQuestoes) : 0);
        let tot = explicitRootTimedQ > 0
            ? explicitRootTimedQ
            : (Number(entry?.total ?? entry?.questoes ?? entry?.totalQuestoes ?? entry?.questions) || 0);
        if (tot === 0 && safeTopics.length > 0) {
            tot = safeTopics.reduce((s, t) => s + (Number(t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions) || 0), 0);
        }
        if (tot === 0 && (entry?.score != null || entry?.scorePoints != null || entry?.scorePct != null)) {
            tot = getSyntheticTotal(catMax);
        }
        if (tot > 0 && rootTs !== null && rootTs > 0) return { ts: rootTs, tq: tot };
        return null;
    };

    const chartData = useMemo(() => {
        const relevantSubjectAggData = (() => {
            const safe = Array.isArray(subjectAggData) ? subjectAggData : [];
            if (!showOnlyFocus || !focusCategory?.id) return safe;
            return safe.filter((d) => d.id === focusCategory.id);
        })();

        return relevantSubjectAggData
            .filter((d) => d.timedQuestoes > 0 && d.timeSpent > 0)
            .map((d) => {
                // Média geral
                const avgSeconds = Math.round(d.timeSpent / d.timedQuestoes);

                // Média Recente (Últimos 7 dias)
                let recentAvgSeconds = null;
                const cat = activeCategories.find((c) => c.id === d.id)
                    || (Array.isArray(categories) ? categories.find((c) => c.id === d.id) : null)
                    || (focusCategory?.id === d.id ? focusCategory : null);
                const catMax = Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
                if (cat) {
                    const nowMs = new Date().getTime();
                    const todayKey = getDateKey(new Date());
                    const todayNoonMs = toDateMs(todayKey) || nowMs;
                    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                    const history = (timeWindow !== 'all'
                        ? filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow)
                        : Object.values(cat.simuladoStats?.history || {}).filter((h) => h && h.valid !== false && h.validated !== false)
                    ).filter((h) => h && h.materia !== 'Simulado Personalizado');

                    const recentStats = history.reduce((acc, h) => {
                        const hKey = getDateKey(h.date || h.createdAt);
                        const hDateMs = toDateMs(hKey) || toDateMs(h.date || h.createdAt);
                        if (!hDateMs || !Number.isFinite(hDateMs) || (todayNoonMs - hDateMs) > sevenDaysMs || !hKey || hKey > todayKey) {
                            return acc;
                        }
                        const timing = extractEntryTiming(h, catMax);
                        return timing ? { ts: acc.ts + timing.ts, tq: acc.tq + timing.tq } : acc;
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
                    const todayKey = getDateKey(new Date());
                    const baseHistory = (timeWindow !== 'all'
                        ? filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow)
                        : Object.values(cat.simuladoStats?.history || {}).filter((h) => h && h.valid !== false && h.validated !== false)
                    ).filter((h) => h && h.materia !== 'Simulado Personalizado');

                    const allValidTimed = baseHistory
                        .filter((h) => toDateMs(h.date || h.createdAt) != null && extractEntryTiming(h, catMax) !== null);
                    const nonFutureTimed = todayKey
                        ? allValidTimed.filter((h) => {
                            const hk = getDateKey(h.date || h.createdAt);
                            return hk && hk <= todayKey;
                        })
                        : [];

                    const sortedHistory = (nonFutureTimed.length > 0 ? nonFutureTimed : allValidTimed)
                        .map((h, idx) => ({ h, idx }))
                        .sort((a, b) => {
                            const ka = getDateKey(a.h.date || a.h.createdAt) || '';
                            const kb = getDateKey(b.h.date || b.h.createdAt) || '';
                            if (ka !== kb) return ka.localeCompare(kb);
                            const da = toDateMs(a.h.lastUpdated || a.h.createdAt || a.h.date) || 0;
                            const db = toDateMs(b.h.lastUpdated || b.h.createdAt || b.h.date) || 0;
                            if (da !== db) return da - db;
                            return a.idx - b.idx;
                        })
                        .map((x) => x.h);

                    const latestEntry = sortedHistory[sortedHistory.length - 1];
                    if (latestEntry) {
                        const latestDayKey = getDateKey(latestEntry.date || latestEntry.createdAt);
                        const sameDayEntries = sortedHistory.filter((h) => getDateKey(h.date || h.createdAt) === latestDayKey);
                        const dayTotals = sameDayEntries.reduce((acc, h) => {
                            const timing = extractEntryTiming(h, catMax);
                            return timing ? { ts: acc.ts + timing.ts, tq: acc.tq + timing.tq } : acc;
                        }, { ts: 0, tq: 0 });

                        if (dayTotals.tq > 0) {
                            latestSeconds = Math.round(dayTotals.ts / dayTotals.tq);
                        }

                        if (latestEntry.lastSessionTimeSpent != null && latestEntry.lastSessionTotal > 0) {
                            absoluteLatestSeconds = Math.round(latestEntry.lastSessionTimeSpent / latestEntry.lastSessionTotal);
                            absoluteTotalTime = latestEntry.lastSessionTimeSpent;
                        } else {
                            const lastTiming = extractEntryTiming(latestEntry, catMax);
                            if (lastTiming && lastTiming.tq > 0) {
                                absoluteLatestSeconds = Math.round(lastTiming.ts / lastTiming.tq);
                                absoluteTotalTime = lastTiming.ts;
                            }
                        }
                    }
                }

                const timeStr = formatTime(displaySeconds);

                let deltaStr = '';
                let deltaSeconds = 0;
                if (hasRecentData) {
                    deltaSeconds = recentAvgSeconds - avgSeconds;
                    const margin = Math.max(1, Math.round(avgSeconds * 0.05));
                    if (deltaSeconds > margin) {
                        deltaStr = `+${deltaSeconds}s`;
                    } else if (deltaSeconds < -margin) {
                        deltaStr = `${deltaSeconds}s`;
                    } else {
                        deltaStr = 'Estável';
                    }
                }

                const qstStr = `(${d.timedQuestoes} ${d.timedQuestoes === 1 ? 'questão' : 'questões'})`;
                const latestStr = latestSeconds !== null ? `Média Dia: ${formatTime(latestSeconds)}` : '';
                const parts = [latestStr, deltaStr, qstStr].filter(Boolean);

                const latestSecs = latestSeconds || 0;
                const visualLatestSeconds = displaySeconds > 0
                    ? Math.min(latestSecs, Math.max(displaySeconds * 2.5, 120))
                    : Math.min(latestSecs, 180);

                const absoluteSecs = absoluteLatestSeconds || 0;
                const visualAbsoluteSeconds = displaySeconds > 0
                    ? Math.min(absoluteSecs, Math.max(displaySeconds * 2.5, 120))
                    : Math.min(absoluteSecs, 180);

                return {
                    ...d,
                    displaySeconds,
                    avgSeconds,
                    recentAvgSeconds,
                    latestSeconds,
                    absoluteLatestSeconds,
                    absoluteTotalTime,
                    visualLatestSeconds,
                    visualAbsoluteSeconds,
                    hasRecentData,
                    deltaSeconds,
                    avgFormatted: timeStr,
                    generalFormatted: formatTime(avgSeconds),
                    avgLabelWithDetails: parts.join('   |   ')
                };
            })
            .sort((a, b) => sortOrder === 'slower' ? b.displaySeconds - a.displaySeconds : a.displaySeconds - b.displaySeconds);
    }, [subjectAggData, activeCategories, categories, sortOrder, maxScore, showOnlyFocus, focusCategory, timeWindow]);

    const legendStats = useMemo(() => {
        return chartData.reduce((acc, item) => {
            if (item.avgSeconds != null && Number.isFinite(Number(item.avgSeconds))) {
                const w = Number(item.timedQuestoes) > 0 ? Number(item.timedQuestoes) : 1;
                acc.avgWeighted += Number(item.avgSeconds) * w;
                acc.avgWeight += w;
            }

            const lastSessionSec = (item.absoluteLatestSeconds != null && Number.isFinite(Number(item.absoluteLatestSeconds)) && Number(item.absoluteLatestSeconds) > 0)
                ? Number(item.absoluteLatestSeconds)
                : ((item.latestSeconds != null && Number.isFinite(Number(item.latestSeconds)) && Number(item.latestSeconds) > 0) ? Number(item.latestSeconds) : null);

            if (lastSessionSec !== null) {
                acc.latest += lastSessionSec;
                acc.latestCount += 1;

                const refBaseline = Number(item.displaySeconds ?? item.avgSeconds) || 0;
                const margin = Math.max(1, Math.round(refBaseline * 0.05));
                if (lastSessionSec > refBaseline + margin) acc.above += 1;
                if (lastSessionSec < refBaseline - margin) acc.below += 1;
            }
            return acc;
        }, { avgWeighted: 0, avgWeight: 0, latest: 0, above: 0, below: 0, latestCount: 0 });
    }, [chartData]);

    const legendAvgSeconds = legendStats.avgWeight > 0
        ? Math.round(legendStats.avgWeighted / legendStats.avgWeight)
        : null;

    const legendLatestSeconds = legendStats.latestCount > 0
        ? Math.round(legendStats.latest / legendStats.latestCount)
        : null;

    const referenceMaxSeconds = useMemo(() => {
        if (!chartData.length) return 60;
        return Math.max(30, ...chartData.map((d) => Math.max(d.displaySeconds || 0, d.visualLatestSeconds || 0)));
    }, [chartData]);

    const totalPaceMeasured = legendStats.above + legendStats.below;
    const fastSharePct = totalPaceMeasured > 0 ? Math.round((legendStats.below / totalPaceMeasured) * 100) : 0;
    const slowSharePct = totalPaceMeasured > 0 ? 100 - fastSharePct : 0;

    if (chartData.length === 0) {
        return (
            <div className="min-h-[360px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-slate-950/45 w-full mt-2 p-8">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                    <Clock size={26} />
                </div>
                <div className="text-center">
                    <h3 className="text-base font-bold text-slate-200">Coletando dados de agilidade IA</h3>
                    <p className="text-slate-400 text-xs sm:text-sm max-w-sm px-4 mt-1 leading-relaxed">
                        O sistema começou a registrar seus tempos hoje. Faça um <span className="text-cyan-400 font-bold">novo simulado IA</span> para ver seu gráfico de agilidade aqui.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 space-y-5 pt-1">
            {/* Compact Toolbar: legend + unified sort control (no duplicate hero card) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-slate-950/55 border border-white/[0.07]">
                <div className="min-w-0 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-100">
                            <Clock size={14} className="text-cyan-400" />
                            Tempo Médio por Questão
                        </span>
                        <span className="text-slate-600 hidden sm:inline">·</span>
                        <span className="text-[11px] font-semibold text-slate-400">
                            {chartData.length} {chartData.length === 1 ? 'disciplina cronometrada' : 'disciplinas cronometradas'}
                        </span>
                    </div>

                    {/* Visual Legend */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] font-semibold text-slate-300">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-white/[0.06]" title="Média dos últimos 7 dias">
                            <span className="h-2 w-2 rounded-sm bg-cyan-400/50" />
                            Média 7d
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-white/[0.06]" title="Média no último dia estudado">
                            <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                            Média do dia
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-white/[0.06]" title="Média exata da última sessão">
                            <span className="h-2 w-2 rounded-full bg-white ring-1 ring-slate-400" />
                            Última Média
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-white/[0.06]" title="Traço branco no arco indica a Média Geral">
                            <span className="h-2.5 w-0.5 rounded-full bg-slate-200/80" />
                            Ref. Geral
                        </span>
                    </div>
                </div>

                {/* Unified Segmented Sort Control */}
                <div className="inline-flex items-center gap-1 self-start lg:self-center p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] shadow-inner shrink-0">
                    <button
                        type="button"
                        onClick={() => setSortOrder('slower')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                            sortOrder === 'slower'
                                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
                        }`}
                        title="Ordenar pelas matérias com maior tempo médio"
                        aria-pressed={sortOrder === 'slower'}
                    >
                        <ArrowDownWideNarrow size={13} />
                        Mais lentas
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortOrder('faster')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                            sortOrder === 'faster'
                                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
                        }`}
                        title="Ordenar pelas matérias com menor tempo médio"
                        aria-pressed={sortOrder === 'faster'}
                    >
                        <ArrowUpNarrowWide size={13} />
                        Mais rápidas
                    </button>
                </div>
            </div>

            {/* 4 Aggregated KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/[0.07] flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Média Geral</span>
                        <Clock size={14} className="text-slate-400" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-slate-100 tracking-tight">
                        {legendAvgSeconds == null ? 'N/A' : formatTime(legendAvgSeconds)}
                    </span>
                    <span className="text-[11px] text-slate-400">Ponderado por volume</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/[0.07] flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Último Geral</span>
                        <Timer size={14} className="text-cyan-400" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-cyan-400 tracking-tight">
                        {legendLatestSeconds == null ? 'N/A' : formatTime(legendLatestSeconds)}
                    </span>
                    <span className="text-[11px] text-slate-400">Última sessão de cada</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">ACIMA DA MÉDIA</span>
                        <TrendingUp size={14} className="text-rose-400" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-rose-400 tracking-tight">
                        {legendStats.above} {legendStats.above === 1 ? 'matéria' : 'matérias'}
                    </span>
                    <span className="text-[11px] text-rose-300/75">Ritmo mais lento</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">ABAIXO DA MÉDIA</span>
                        <Zap size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400 tracking-tight">
                        {legendStats.below} {legendStats.below === 1 ? 'matéria' : 'matérias'}
                    </span>
                    <span className="text-[11px] text-emerald-300/75">Ritmo acelerado</span>
                </div>
            </div>

            {/* Balance Split Bar (when there are subjects deviating from average) */}
            {totalPaceMeasured > 0 && (
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/45 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        Balanço de ritmo
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden flex">
                        {fastSharePct > 0 && (
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                style={{ width: `${fastSharePct}%` }}
                            />
                        )}
                        {slowSharePct > 0 && (
                            <div
                                className="h-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-500"
                                style={{ width: `${slowSharePct}%` }}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums shrink-0">
                        <span className="text-emerald-400 font-bold">{fastSharePct}% rápidas</span>
                        <span className="text-rose-400 font-bold">{slowSharePct}% lentas</span>
                    </div>
                </div>
            )}

            {/* Grid of Subject Half-Moon Gauges */}
            <div className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                    {chartData.map((data, index) => (
                        <HalfMoonGauge
                            key={`gauge-${data.id}-${index}`}
                            data={data}
                            referenceMaxSeconds={referenceMaxSeconds}
                            globalAvgSeconds={legendAvgSeconds}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});
