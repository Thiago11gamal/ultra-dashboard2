import React, { useCallback, useMemo, useId } from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatValue, getSafeScore, getSyntheticTotal, extractTopicsTotals } from '../../../utils/scoreHelper';
import { pointsToPct, pointsToRatio, ratioToPoints } from '../../../utils/scoreHelper.conversions';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { hexToRgba, normalizeHexColor } from '../../../utils/colorHelper';

const hasValidNumber = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

const normalizeStoredFallback = (rawVal, safeMin, safeMax, safeRange) => {
    const n = Number(rawVal);
    if (!Number.isFinite(n)) return null;
    const isLegacyPct = n >= 0 && n <= 100 && (n < safeMin || (safeMax > 100 && safeRange >= 200));
    return isLegacyPct ? safeMin + (n / 100) * safeRange : n;
};

const MiniSparkline = React.memo(function MiniSparkline({ points, color, targetVal, minVal, maxVal }) {
    const gradId = useId().replace(/:/g, '');
    const { path, areaPath, lastPt, targetY } = useMemo(() => {
        if (!Array.isArray(points) || points.length < 2) {
            return { path: '', areaPath: '', lastPt: null, targetY: null };
        }
        const w = 88;
        const h = 24;
        const padX = 2;
        const padY = 3;
        const validMin = Number.isFinite(minVal) ? minVal : Math.min(...points);
        const validMax = Number.isFinite(maxVal) && maxVal > validMin ? maxVal : Math.max(...points, validMin + 1);
        const localMin = Math.min(validMin, ...points);
        const localMax = Math.max(validMax, ...points);
        // Tighter visual window centered around observed data so movement is legible
        const dataMin = Math.min(...points);
        const dataMax = Math.max(...points);
        const span = Math.max((localMax - localMin) * 0.18, dataMax - dataMin, 1);
        const yMin = Math.max(localMin, dataMin - span * 0.25);
        const yMax = Math.min(localMax, dataMax + span * 0.25);
        const yRange = Math.max(1e-6, yMax - yMin);

        const coords = points.map((v, idx) => {
            const x = padX + (idx / (points.length - 1)) * (w - padX * 2);
            const norm = Math.max(0, Math.min(1, (v - yMin) / yRange));
            const y = h - padY - norm * (h - padY * 2);
            return { x, y };
        });

        const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`;
        let tY = null;
        if (Number.isFinite(targetVal) && targetVal >= yMin && targetVal <= yMax) {
            const tNorm = (targetVal - yMin) / yRange;
            tY = h - padY - tNorm * (h - padY * 2);
        }
        return { path: line, areaPath: area, lastPt: coords[coords.length - 1], targetY: tY };
    }, [points, minVal, maxVal, targetVal]);

    if (!path) return null;

    return (
        <svg width="88" height="24" viewBox="0 0 88 24" className="overflow-visible shrink-0" aria-hidden="true">
            <defs>
                <linearGradient id={`sp_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.32" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {targetY !== null && (
                <line
                    x1="2"
                    x2="86"
                    y1={targetY}
                    y2={targetY}
                    stroke="#34d399"
                    strokeOpacity="0.35"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                />
            )}
            <path d={areaPath} fill={`url(#sp_${gradId})`} />
            <path d={path} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            {lastPt && (
                <circle cx={lastPt.x} cy={lastPt.y} r="2.4" fill={color} stroke="#0f172a" strokeWidth="1" />
            )}
        </svg>
    );
});

export const DisciplinaCard = React.memo(function DisciplinaCard({
    cat,
    level,
    metrics,
    sparkline = null,
    target,
    isFocused,
    onClick,
    onSelectCategory,
    unit = '%',
    maxScore = 100,
    minScore = 0
}) {
    const globalMin = hasValidNumber(minScore) ? Number(minScore) : 0;
    const globalMax = hasValidNumber(maxScore) && Number(maxScore) > globalMin ? Number(maxScore) : Math.max(100, globalMin + 100);
    const catMax = hasValidNumber(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : globalMax;
    const catMin = hasValidNumber(cat?.minScore) ? Math.min(Number(cat.minScore), catMax) : globalMin;
    const safeMax = catMax;
    const safeMin = catMin;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const hasLevel = hasValidNumber(level);
    const val = hasLevel ? Number(level) : null;
    const globalRange = Math.max(1e-9, globalMax - globalMin);
    const effectiveTarget = hasValidNumber(cat?.minCutoff) && Number(cat.minCutoff) > safeMin
        ? Math.min(safeMax, Number(cat.minCutoff))
        : (hasValidNumber(target)
            ? (Number(target) <= safeMax && Number(target) >= safeMin && safeMax === globalMax && safeMin === globalMin
                ? Number(target)
                : safeMin + ((Number(target) - globalMin) / globalRange) * safeRange)
            : safeMin + safeRange * 0.8);
    const ok = (val ?? safeMin) >= effectiveTarget;
    const midThreshold = safeMin + (effectiveTarget - safeMin) * 0.75;
    const mid = (val ?? safeMin) >= midThreshold;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';
    const catAccent = normalizeHexColor(cat?.color, '#6366f1');

    const handleClick = useCallback(() => {
        if (typeof onSelectCategory === 'function') {
            onSelectCategory(cat?.id);
        } else if (typeof onClick === 'function') {
            onClick();
        }
    }, [onSelectCategory, onClick, cat?.id]);

    let rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    if (!hasValidNumber(rawVal)) {
        const historyRaw = cat?.simuladoStats?.history;
        const rawList = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
        const validHistory = rawList.filter(h => h && h.valid !== false && h.validated !== false);
        if (validHistory.length > 0) {
            const todayKey = getDateKey(new Date());
            const nonFutureHistory = todayKey
                ? validHistory.filter(h => {
                    const dk = getDateKey(h?.date || h?.createdAt || h?.timestamp);
                    return dk && dk <= todayKey;
                })
                : [];
            const history = nonFutureHistory.length > 0 ? nonFutureHistory : validHistory;
            let latestDayKey = null;
            let latestMs = -Infinity;
            for (let i = 0; i < history.length; i++) {
                const h = history[i];
                const rawDate = h?.date || h?.createdAt || h?.timestamp;
                const ms = toDateMs(rawDate);
                if (Number.isFinite(ms) && ms >= latestMs) {
                    latestMs = ms;
                    latestDayKey = getDateKey(rawDate);
                }
            }
            if (latestDayKey) {
                let dayTotal = 0;
                let dayCorrect = 0;
                for (let i = 0; i < history.length; i++) {
                    const h = history[i];
                    if (getDateKey(h?.date || h?.createdAt || h?.timestamp) !== latestDayKey) continue;
                    let s = getSafeScore(h, safeMax, safeMin);
                    let q = Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0;
                    if (q <= 0 && h?.topics != null) {
                        const tf = extractTopicsTotals(h, safeMax, safeMin);
                        if (tf.total > 0) {
                            q = tf.total;
                            dayTotal += q;
                            dayCorrect += tf.correct;
                            continue;
                        } else if (!Number.isFinite(s) && tf.hasTopicsScore) {
                            s = tf.score;
                        }
                    }
                    if (!Number.isFinite(s)) continue;
                    if (q <= 0) q = getSyntheticTotal(safeMax);
                    dayTotal += q;
                    dayCorrect += pointsToRatio(s, safeMax, safeMin) * q;
                }
                if (dayTotal > 0) {
                    rawVal = ratioToPoints(dayCorrect / dayTotal, safeMax, safeMin);
                }
            }
        }
    }

    let statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    if (!hasValidNumber(statsVal) && hasValidNumber(cat?.simuladoStats?.average)) {
        statsVal = normalizeStoredFallback(cat.simuladoStats.average, safeMin, safeMax, safeRange);
    }

    let bayVal = metrics ? metrics[`bay_${cat.id}`] : null;
    if (!hasValidNumber(bayVal) && hasValidNumber(cat?.bayesianStats?.mean)) {
        bayVal = normalizeStoredFallback(cat.bayesianStats.mean, safeMin, safeMax, safeRange);
    }

    const validSparkline = useMemo(() => {
        if (!Array.isArray(sparkline) || sparkline.length < 2) return null;
        const clean = sparkline.filter((v) => Number.isFinite(Number(v))).map(Number);
        return clean.length >= 2 ? clean.slice(-10) : null;
    }, [sparkline]);

    const recentDelta = useMemo(() => {
        if (!validSparkline || validSparkline.length < 2) return null;
        const first = validSparkline[0];
        const last = validSparkline[validSparkline.length - 1];
        const diff = last - first;
        return Number.isFinite(diff) ? diff : null;
    }, [validSparkline]);

    const deltaThreshold = safeRange * 0.015;

    const toBarWidth = (v) =>
        v != null && Number.isFinite(Number(v))
            ? Math.min(100, Math.max(0, pointsToPct(Number(v), safeMax, safeMin)))
            : 0;

    const targetPct = Math.min(100, Math.max(0, pointsToPct(effectiveTarget, safeMax, safeMin)));
    const mainBarWidth = toBarWidth(val ?? bayVal);

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-pressed={isFocused}
            aria-label={`Focar na disciplina ${cat.name}`}
            className={`relative text-left w-full h-full rounded-2xl border overflow-hidden transition-all duration-200 group flex flex-col justify-between px-3.5 py-3.5 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isFocused
                    ? 'z-20 border-white/25 bg-slate-900/90 -translate-y-0.5'
                    : 'border-white/[0.08] bg-slate-900/60 hover:border-white/[0.16] hover:bg-slate-800/70'
            }`}
            style={{
                backgroundColor: isFocused ? hexToRgba(cat.color, 0.14, '#6366f1') : 'rgba(15,23,42,0.65)',
                borderColor: isFocused ? hexToRgba(cat.color, 0.55, '#6366f1') : undefined,
                boxShadow: isFocused ? `0 10px 28px -12px ${hexToRgba(cat.color, 0.5, '#6366f1')}` : undefined,
            }}
        >
            {/* Top accent bar */}
            <div
                className={`absolute inset-x-0 top-0 pointer-events-none transition-all ${isFocused ? 'h-[3px] opacity-100' : 'h-[2px] opacity-35 group-hover:opacity-75'}`}
                style={{ backgroundColor: catAccent }}
            />

            {/* Header: subject name + focus pill / status dot */}
            <div className="relative z-10 flex items-start justify-between gap-2 mb-2.5 w-full min-h-[2.25rem]">
                <div className="min-w-0 flex-1">
                    <p
                        className={`text-xs font-extrabold tracking-tight line-clamp-2 leading-snug ${isFocused ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}
                        title={cat.name}
                    >
                        {cat.name}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {isFocused && (
                        <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border"
                            style={{
                                backgroundColor: hexToRgba(cat.color, 0.2, '#6366f1'),
                                borderColor: hexToRgba(cat.color, 0.5, '#6366f1'),
                                color: '#f8fafc',
                            }}
                        >
                            <Target size={10} />
                            Foco
                        </span>
                    )}
                    <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${isFocused ? 'scale-110 ring-2 ring-offset-2 ring-offset-slate-900' : 'opacity-90 group-hover:opacity-100'}`}
                        style={{ backgroundColor: statusColor, '--tw-ring-color': statusColor }}
                        title={ok ? 'Na meta' : mid ? 'Em atenção' : 'Abaixo da meta'}
                    />
                </div>
            </div>

            {/* Middle: Primary score + Mini Sparkline + progress bar */}
            <div className="relative z-10 w-full">
                <div className="flex items-end justify-between gap-2 mb-2">
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black font-mono tabular-nums tracking-tight leading-none ${isFocused ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
                                {val != null && Number.isFinite(Number(val)) ? formatValue(val) : '—'}
                            </span>
                            {val != null && Number.isFinite(Number(val)) && (
                                <span className={`text-xs font-bold ${isFocused ? 'text-white/75' : 'text-slate-400'}`}>{unit}</span>
                            )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 font-mono block mt-1">
                            Meta {formatValue(effectiveTarget)}{unit}
                        </span>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {validSparkline && (
                            <MiniSparkline
                                points={validSparkline}
                                color={statusColor}
                                targetVal={effectiveTarget}
                                minVal={safeMin}
                                maxVal={safeMax}
                            />
                        )}
                        {recentDelta !== null && (
                            <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold tabular-nums ${
                                    recentDelta > deltaThreshold
                                        ? 'text-emerald-400'
                                        : recentDelta < -deltaThreshold
                                            ? 'text-rose-400'
                                            : 'text-slate-400'
                                }`}
                                title="Variação recente do domínio na janela"
                            >
                                {recentDelta > deltaThreshold ? (
                                    <TrendingUp size={10} />
                                ) : recentDelta < -deltaThreshold ? (
                                    <TrendingDown size={10} />
                                ) : (
                                    <Minus size={10} />
                                )}
                                {recentDelta > 0 ? '+' : ''}{formatValue(recentDelta)}{unit}
                            </span>
                        )}
                    </div>
                </div>

                {/* Barra principal do domínio real com marcador da meta */}
                <div className="relative w-full h-1.5 bg-slate-950/80 rounded-full overflow-visible border border-white/[0.06]">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${mainBarWidth}%`,
                            backgroundColor: statusColor,
                            boxShadow: `0 0 8px ${statusColor}66`,
                        }}
                    />
                    <div
                        className="absolute top-[-2.5px] bottom-[-2.5px] w-[2px] bg-white/80 rounded-full pointer-events-none shadow-sm"
                        style={{ left: `${targetPct}%` }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Footer: Bruta e Histórica lado a lado */}
            <div className="relative z-10 grid grid-cols-2 gap-1.5 pt-2.5 mt-2.5 border-t border-white/[0.08]">
                <div className="rounded-lg bg-slate-950/55 border border-white/[0.05] px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bruta</span>
                    <span className="text-[11px] font-bold font-mono tabular-nums text-orange-400">
                        {rawVal != null && Number.isFinite(Number(rawVal)) ? `${formatValue(rawVal)}${unit}` : '—'}
                    </span>
                </div>
                <div className="rounded-lg bg-slate-950/55 border border-white/[0.05] px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hist.</span>
                    <span className="text-[11px] font-bold font-mono tabular-nums text-sky-400">
                        {statsVal != null && Number.isFinite(Number(statsVal)) ? `${formatValue(statsVal)}${unit}` : '—'}
                    </span>
                </div>
            </div>
        </button>
    );
});
