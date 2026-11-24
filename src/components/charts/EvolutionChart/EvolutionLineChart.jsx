import React, { useId, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Area, ComposedChart,
    LabelList, Brush, ReferenceArea
} from "recharts";
import { Eye, Search } from 'lucide-react';
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { BenchmarkStrip } from "../../ui/BenchmarkStrip";
import { normalizeDate, formatDisplayDate } from '../../../utils/dateHelper';
import { formatValue, normalizeScoreDomain } from '../../../utils/scoreHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke, onClick, isDimmed } = props;
    if (cx == null || cy == null) return null;
    return (
        <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', pointerEvents: 'all' }}>
            {!isDimmed && (
                <>
                    <circle cx={cx} cy={cy} r={11} fill={fill} opacity={0.22} />
                    <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
                </>
            )}
            {isDimmed && (
                <>
                    <circle cx={cx} cy={cy} r={4} fill={fill} opacity={0.5} stroke={stroke || "#ffffff"} strokeWidth={1} strokeOpacity={0.5} />
                    <circle cx={cx} cy={cy} r={15} fill="rgba(255,255,255,0.01)" stroke="transparent" />
                </>
            )}
        </g>
    );
};

/**
 * EvolutionLineChart
 *
 * A premium analytical chart showing performance evolution with Bayesian confidence bands,
 * interactive pill legend, focus highlighting, and adaptive label anti-collision.
 */
export const EvolutionLineChart = React.memo(function EvolutionLineChart({
    filteredChartData = [],
    activeCategories = [],
    engine,
    targetScore,
    focusSubjectId,
    showOnlyFocus,
    minScore = 0,
    maxScore = 100,
    unit = '%',
    syncId,
    expanded = false
}) {
    const instanceId = useId().replace(/:/g, "");
    const effectiveSyncId = syncId !== undefined ? syncId : (engine?.id ? `evolutionSync_${engine.id}` : `evolutionSync_${instanceId}`);

    const [highlightedDataKey, setHighlightedDataKey] = useState(null);
    const chartWrapRef = useRef(null);
    const [chartDims, setChartDims] = useState({ width: 720, height: 360 });
    const isLineClicked = useRef(false);
    const clickTimerRef = useRef(null);

    useEffect(() => {
        const el = chartWrapRef.current;
        if (!el) return undefined;
        let obs = null;
        try {
            if (typeof ResizeObserver !== 'undefined') {
                obs = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        const w = Math.round(entry.contentRect.width);
                        const h = Math.round(entry.contentRect.height);
                        if (w > 50 && h > 50) {
                            setChartDims((prev) => (Math.abs(prev.width - w) > 2 || Math.abs(prev.height - h) > 2 ? { width: w, height: h } : prev));
                        }
                    }
                });
                obs.observe(el);
            }
        } catch { /* ignore */ }
        return () => {
            if (obs) obs.disconnect();
        };
    }, []);

    useEffect(() => {
        return () => {
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        };
    }, []);

    const hasValidNum = (v) => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));
    const isSameId = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
    const hasFocusId = focusSubjectId !== null && focusSubjectId !== undefined && String(focusSubjectId).trim() !== '';
    const safeMinScore = hasValidNum(minScore) ? Number(minScore) : 0;
    const safeMaxScore = Number(maxScore) > safeMinScore ? Number(maxScore) : safeMinScore + 1;
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);

    const safeTargetScore = Math.max(
        safeMinScore,
        Math.min(
            safeMaxScore,
            hasValidNum(targetScore) ? Number(targetScore) : safeMinScore
        )
    );

    const dangerLimit = Math.max(safeMinScore, safeTargetScore - (safeRange * 0.08));

    const safeActiveCategories = useMemo(() => Array.isArray(activeCategories) ? activeCategories : [], [activeCategories]);
    const safeChartData = useMemo(() => Array.isArray(filteredChartData) ? filteredChartData : [], [filteredChartData]);

    const enhancedChartData = useMemo(() => {
        if (!safeChartData || !safeChartData.length) return [];

        const sortedData = [...safeChartData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });

        return sortedData.map(d => {
            const copy = { ...d };
            safeActiveCategories.filter(cat => !showOnlyFocus || !hasFocusId || isSameId(cat.id, focusSubjectId)).forEach(cat => {
                const cMin = hasValidNum(cat?.minScore) ? Number(cat.minScore) : safeMinScore;
                const cMax = hasValidNum(cat?.maxScore) && Number(cat.maxScore) > cMin ? Number(cat.maxScore) : safeMaxScore;
                const cRange = Math.max(1e-9, cMax - cMin);
                const needsScale = (cMax !== safeMaxScore || cMin !== safeMinScore);
                const normVal = (v) => {
                    if (!hasValidNum(v)) return v;
                    const n = Number(v);
                    return needsScale ? safeMinScore + ((n - cMin) / cRange) * safeRange : n;
                };

                ['raw_', 'bay_', 'stats_', 'bay_ci_low_', 'bay_ci_high_'].forEach(prefix => {
                    const k = `${prefix}${cat.id}`;
                    if (hasValidNum(copy[k])) {
                        copy[k] = Number(normVal(copy[k]).toFixed(2));
                    }
                });

                const trendKey = `trend_${cat.id}`;
                if (needsScale && hasValidNum(copy[trendKey])) {
                    copy[trendKey] = Number(((Number(copy[trendKey]) / cRange) * safeRange).toFixed(2));
                }

                const low = copy[`bay_ci_low_${cat.id}`];
                const high = copy[`bay_ci_high_${cat.id}`];
                if (hasValidNum(low) && hasValidNum(high)) {
                    const l = Number(low);
                    const h = Number(high);
                    copy[`band_${cat.id}`] = [Math.min(l, h), Math.max(l, h)];
                }
            });
            copy.displayDate = copy.displayDate || copy.date;
            return copy;
        });
    }, [safeChartData, safeActiveCategories, showOnlyFocus, focusSubjectId, safeMinScore, safeMaxScore, safeRange]);

    const { finalPoints, lastValidIndexByCat } = useMemo(() => {
        if (!enhancedChartData.length) return { finalPoints: [], lastValidIndexByCat: {} };
        const pts = [];
        const idxMap = {};

        safeActiveCategories.filter(cat => !showOnlyFocus || !hasFocusId || isSameId(cat.id, focusSubjectId)).forEach(cat => {
            const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
            let lastVal = null;
            let lastIdx = -1;
            for (let i = enhancedChartData.length - 1; i >= 0; i--) {
                const v = enhancedChartData[i]?.[dataKey];
                if (v != null && Number.isFinite(Number(v))) {
                    lastVal = Number(v);
                    lastIdx = i;
                    break;
                }
            }
            if (lastVal != null) {
                pts.push({ id: cat.id, name: cat.name, value: lastVal, color: cat.color, lastIdx });
                idxMap[cat.id] = lastIdx;
            }
        });
        return { finalPoints: pts.sort((a, b) => b.value - a.value), lastValidIndexByCat: idxMap };
    }, [enhancedChartData, safeActiveCategories, showOnlyFocus, focusSubjectId, engine]);

    const yAdjustedMap = useMemo(() => {
        if (!finalPoints.length) return {};

        const localMin = safeMinScore;
        const localMax = safeMaxScore;
        const range = safeRange;
        const topLimit = localMax - (range * 0.01);
        const bottomLimit = localMin + (range * 0.03);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);
        const MIN_PCT_DISTANCE = range * 0.10;

        const totalDates = enhancedChartData.length;
        const xProximityThreshold = totalDates > 12 ? Math.max(1, Math.floor(totalDates * 0.08)) : 0;
        const sortedByIdx = [...finalPoints].sort((a, b) => a.lastIdx - b.lastIdx);
        const clusters = [];
        for (const pt of sortedByIdx) {
            const lastCluster = clusters[clusters.length - 1];
            if (!lastCluster || (pt.lastIdx - lastCluster[lastCluster.length - 1].lastIdx) > xProximityThreshold) {
                clusters.push([pt]);
            } else {
                lastCluster.push(pt);
            }
        }

        const map = {};
        for (const cluster of clusters) {
            if (cluster.length === 1) {
                map[cluster[0].id] = Math.max(bottomLimit, Math.min(topLimit, Number(cluster[0].value) || 0));
                continue;
            }
            const labels = cluster
                .map(p => ({ ...p, yPos: Number(p.value) || 0 }))
                .sort((a, b) => b.yPos - a.yPos);

            const requiredSpace = (labels.length - 1) * MIN_PCT_DISTANCE;
            const effectiveDistance = Math.max(
                0.25,
                requiredSpace > safeSpace
                    ? safeSpace / Math.max(1, labels.length - 1)
                    : MIN_PCT_DISTANCE
            );

            const ITERATIONS = 50;
            for (let iter = 0; iter < ITERATIONS; iter++) {
                let overlapFound = false;
                for (let i = 0; i < labels.length - 1; i++) {
                    const l1 = labels[i];
                    const l2 = labels[i + 1];
                    const diff = l1.yPos - l2.yPos;
                    if (diff < effectiveDistance) {
                        overlapFound = true;
                        const adjustment = (effectiveDistance - diff) / 2;
                        l1.yPos += adjustment;
                        l2.yPos -= adjustment;
                    }
                }
                if (labels.length > 0 && labels[0].yPos > topLimit) {
                    const diff = labels[0].yPos - topLimit;
                    labels.forEach(l => { l.yPos -= diff; });
                }
                if (labels.length > 0 && labels[labels.length - 1].yPos < bottomLimit) {
                    const diff = bottomLimit - labels[labels.length - 1].yPos;
                    labels.forEach(l => { l.yPos += diff; });
                }
                if (!overlapFound) break;
            }

            for (let i = 0; i < labels.length; i++) {
                if (labels[i].yPos > topLimit) labels[i].yPos = topLimit;
                if (labels[i].yPos < bottomLimit) labels[i].yPos = bottomLimit;
            }
            for (let i = 1; i < labels.length; i++) {
                const minAllowed = labels[i - 1].yPos - effectiveDistance;
                if (labels[i].yPos > minAllowed) {
                    labels[i].yPos = Math.max(bottomLimit, minAllowed);
                }
            }
            labels.forEach(p => { map[p.id] = p.yPos; });
        }

        return map;
    }, [finalPoints, enhancedChartData.length, safeMaxScore, safeMinScore, safeRange]);

    const visibleCategories = useMemo(
        () => safeActiveCategories.filter(cat => !showOnlyFocus || !hasFocusId || isSameId(cat.id, focusSubjectId)),
        [safeActiveCategories, showOnlyFocus, hasFocusId, focusSubjectId]
    );

    const plottedCategories = useMemo(
        () => visibleCategories.filter(cat => lastValidIndexByCat[cat.id] !== undefined),
        [visibleCategories, lastValidIndexByCat]
    );

    const rightMargin = showOnlyFocus || visibleCategories.length <= 1 ? 80 : 88;
    const hasBrush = enhancedChartData.length > 1;

    const renderCustomLabel = useCallback((props, catId, displayColor, isFocused, hasFocus) => {
        const { x, y, index, value, viewBox } = props;

        if (hasFocus && !isFocused) return null;

        if (index === lastValidIndexByCat[catId] && hasValidNum(value) && Number.isFinite(Number(x)) && Number.isFinite(Number(y))) {
            let offsetPx = 0;
            const adjustedY = yAdjustedMap[catId];
            // Recharts 3.5.1 passes point viewBox { x, y, width: 0, height: 0 } to Line LabelList,
            // so use measured container dimensions instead of viewBox.width/height when <= 0.
            const plotTop = 16;
            const plotBottomInset = 16 + 32 + (hasBrush ? 28 : 0);
            const plotHeight = viewBox?.height > 20 ? viewBox.height : Math.max(140, chartDims.height - plotTop - plotBottomInset);

            if (adjustedY !== undefined && adjustedY !== value) {
                const pxPerUnit = plotHeight / Math.max(1e-9, safeRange);
                offsetPx = (Number(value) - adjustedY) * pxPerUnit;
            }

            const formatted = `${formatValue(value)}${unit}`;
            const boxWidth = Math.max(52, formatted.length * 7 + 20);
            const maxX = viewBox?.width > 20
                ? (viewBox.x ?? 0) + viewBox.width + (rightMargin - 4)
                : Math.max(Number(x) + rightMargin - 4, chartDims.width - 4);
            const labelX = Math.max(0, Math.min(Number(x) + 8, maxX - boxWidth));
            const minY = plotTop + 12;
            const maxY = plotTop + plotHeight - 12;
            const safeCenterY = Math.max(minY, Math.min(maxY, Number(y) + offsetPx));

            return (
                <g style={{ zIndex: 100, transition: 'all 0.3s ease' }}>
                    <rect
                        x={labelX}
                        y={safeCenterY - 11}
                        width={boxWidth}
                        height={22}
                        rx={8}
                        fill="#0b0f19"
                        fillOpacity={0.94}
                        stroke={displayColor}
                        strokeOpacity={0.9}
                        strokeWidth={1.6}
                    />
                    <circle cx={labelX + 8} cy={safeCenterY} r={3} fill={displayColor} />
                    <text
                        x={labelX + 8 + (boxWidth - 8) / 2}
                        y={safeCenterY + 4}
                        fill="#ffffff"
                        fontSize={10.5}
                        fontWeight="900"
                        textAnchor="middle"
                        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.9)' }}
                    >
                        {formatted}
                    </text>
                </g>
            );
        }
        return null;
    }, [lastValidIndexByCat, yAdjustedMap, safeRange, unit, rightMargin, chartDims, hasBrush]);

    const effectiveHighlightedKey = useMemo(() => {
        if (highlightedDataKey === null || highlightedDataKey === undefined || highlightedDataKey === '') return null;
        const matched = visibleCategories.find(
            c => isSameId(c.id, highlightedDataKey) && lastValidIndexByCat[c.id] !== undefined
        );
        return matched ? matched.id : null;
    }, [highlightedDataKey, visibleCategories, lastValidIndexByCat]);

    const renderTooltipContent = useCallback(
        (props) => <ChartTooltip {...props} chartData={enhancedChartData} isCompare={false} unit={unit} maxScore={maxScore} minScore={minScore} targetScore={safeTargetScore} />,
        [enhancedChartData, unit, maxScore, minScore, safeTargetScore]
    );

    const toggleHighlightByCatId = useCallback((catId, e, props) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (props?.nativeEvent && typeof props.nativeEvent.stopPropagation === 'function') props.nativeEvent.stopPropagation();
        isLineClicked.current = true;
        setHighlightedDataKey(prev => prev === catId ? null : catId);
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => { isLineClicked.current = false; }, 50);
    }, []);

    const lineConfigByCat = useMemo(() => {
        const map = {};
        const isAnyHighlighted = effectiveHighlightedKey !== null && effectiveHighlightedKey !== undefined;
        const hasFocus = showOnlyFocus ? hasFocusId : isAnyHighlighted;
        visibleCategories.forEach((cat) => {
            const isLegendHighlighted = isSameId(effectiveHighlightedKey, cat.id);
            const isFocused = showOnlyFocus ? isSameId(focusSubjectId, cat.id) : isLegendHighlighted;
            const displayColor = isLegendHighlighted ? '#fbbf24' : (cat.color || '#3b82f6');
            const lineOpacity = hasFocus ? (isFocused ? 1 : 0.28) : 0.85;
            const lineWidth = hasFocus ? (isFocused ? 3.5 : 1.4) : 2.1;
            const onDotClick = (e) => toggleHighlightByCatId(cat.id, e);
            const onLineClick = (props, e) => toggleHighlightByCatId(cat.id, e, props);
            const labelRenderer = (props) => renderCustomLabel(props, cat.id, displayColor, isFocused, hasFocus);
            map[cat.id] = {
                isFocused,
                hasFocus,
                displayColor,
                lineOpacity,
                lineWidth,
                onDotClick,
                onLineClick,
                labelRenderer,
                dotProps: { r: 2.8, strokeWidth: 1.5, stroke: displayColor, fill: '#0f172a', strokeOpacity: lineOpacity, fillOpacity: lineOpacity },
                activeDotEl: <CustomActiveDot fill={displayColor} stroke="#ffffff" isDimmed={hasFocus && !isFocused} onClick={onDotClick} />
            };
        });
        return map;
    }, [visibleCategories, effectiveHighlightedKey, showOnlyFocus, hasFocusId, focusSubjectId, toggleHighlightByCatId, renderCustomLabel]);

    const benchmark = useMemo(() => {
        if (!finalPoints.length) return null;
        const focusedPt = effectiveHighlightedKey != null
            ? finalPoints.find((p) => isSameId(p.id, effectiveHighlightedKey))
            : (showOnlyFocus && hasFocusId ? finalPoints.find((p) => isSameId(p.id, focusSubjectId)) : null);
        const currentVal = focusedPt
            ? focusedPt.value
            : finalPoints.reduce((acc, p) => acc + p.value, 0) / finalPoints.length;
        const diff = currentVal - safeTargetScore;
        const targetTol = Math.min(0.05, safeRange * 0.0005);
        const gapUnit = unit === '%' ? 'pp' : ` ${unit}`;
        const aboveCount = finalPoints.filter((p) => p.value >= safeTargetScore - targetTol).length;
        const progress = safeTargetScore > safeMinScore
            ? ((currentVal - safeMinScore) / Math.max(1e-9, safeTargetScore - safeMinScore)) * 100
            : 100;
        return {
            currentLabel: focusedPt ? focusedPt.name : (finalPoints.length === 1 ? finalPoints[0].name : 'Média atual'),
            currentValue: `${formatValue(currentVal)}${unit}`,
            targetValue: `${formatValue(safeTargetScore)}${unit}`,
            gapLabel: Math.abs(diff) <= targetTol
                ? 'Na meta ✓'
                : (diff > 0 ? `+${formatValue(diff)}${gapUnit} acima` : `Faltam ${formatValue(Math.abs(diff))}${gapUnit}`),
            status: diff >= -targetTol ? 'success' : diff >= -(safeRange * 0.1) ? 'warning' : 'danger',
            progressPct: progress,
            extra: !focusedPt && finalPoints.length > 1 ? `${aboveCount}/${finalPoints.length} na meta` : null,
        };
    }, [finalPoints, effectiveHighlightedKey, showOnlyFocus, hasFocusId, focusSubjectId, safeTargetScore, safeMinScore, safeRange, unit]);

    if (!enhancedChartData.length || visibleCategories.length === 0 || finalPoints.length === 0) {
        return (
            <div className="h-[340px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-800/60 border border-white/[0.06] flex items-center justify-center text-slate-400">
                    <Search size={20} />
                </div>
                <span>Nenhuma disciplina visível com o filtro atual.</span>
            </div>
        );
    }

    const chartHeightClass = expanded
        ? 'h-[480px] sm:h-[560px] md:h-[640px]'
        : 'h-[320px] sm:h-[380px] lg:h-[430px]';

    const showBandsForAll = visibleCategories.length <= 3;

    return (
        <div className="w-full space-y-3 outline-none focus:outline-none">
            {benchmark && (
                <BenchmarkStrip
                    currentLabel={benchmark.currentLabel}
                    currentValue={benchmark.currentValue}
                    targetLabel="Meta"
                    targetValue={benchmark.targetValue}
                    gapLabel={benchmark.gapLabel}
                    status={benchmark.status}
                    progressPct={benchmark.progressPct}
                    extra={benchmark.extra}
                    compact
                />
            )}
            {/* Interactive Pill Legend (only categories with plotted data in the active window) */}
            {plottedCategories.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {plottedCategories.map((cat) => {
                            const isActive = effectiveHighlightedKey === cat.id;
                            const isDimmed = Boolean(effectiveHighlightedKey && !isActive);
                            const catColor = isActive ? '#fbbf24' : (cat.color || '#3b82f6');
                            const latestPt = finalPoints.find((p) => p.id === cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setHighlightedDataKey((prev) => (prev === cat.id ? null : cat.id))}
                                    aria-pressed={isActive}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                                        isActive
                                            ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 shadow-sm'
                                            : isDimmed
                                                ? 'bg-slate-950/40 border-white/[0.04] text-slate-500 hover:text-slate-300'
                                                : 'bg-slate-950/55 border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20'
                                    }`}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: catColor }}
                                    />
                                    <span className="truncate max-w-[140px]">{cat.name}</span>
                                    {latestPt && (
                                        <span className="font-mono text-[10px] opacity-75 tabular-nums">
                                            {formatValue(latestPt.value)}{unit}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {effectiveHighlightedKey && (
                        <button
                            type="button"
                            onClick={() => setHighlightedDataKey(null)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/15 border border-indigo-400/35 hover:bg-indigo-500/25 text-indigo-200 text-[11px] font-bold rounded-lg transition-all"
                        >
                            <Eye size={12} />
                            <span>Mostrar Todos</span>
                        </button>
                    )}
                </div>
            )}

            <div ref={chartWrapRef} className={`relative ${chartHeightClass} w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300`}>
                <ChartFrame minHeight={320} label="Traçando evolução">
                    <ResponsiveContainer width="100%" height="100%" minHeight={320} className="outline-none focus:outline-none focus:ring-0" minWidth={1}>
                        <ComposedChart
                            data={enhancedChartData}
                            syncId={effectiveSyncId}
                            margin={{ top: 16, right: rightMargin, left: 4, bottom: 16 }}
                            style={{ outline: 'none', cursor: effectiveHighlightedKey ? 'pointer' : 'default' }}
                            tabIndex="-1"
                            onClick={() => {
                                if (effectiveHighlightedKey && !isLineClicked.current) {
                                    setHighlightedDataKey(null);
                                }
                            }}
                        >
                            <defs>
                                {visibleCategories.map((cat) => {
                                    const displayColor = cat.color || '#3b82f6';
                                    return (
                                        <React.Fragment key={`defs_${cat.id}`}>
                                            <linearGradient id={`grad_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={displayColor} stopOpacity={0.28} />
                                                <stop offset="100%" stopColor={displayColor} stopOpacity={0.01} />
                                            </linearGradient>
                                            <linearGradient id={`bayBand_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={displayColor} stopOpacity={0.18} />
                                                <stop offset="100%" stopColor={displayColor} stopOpacity={0.03} />
                                            </linearGradient>
                                        </React.Fragment>
                                    );
                                })}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />

                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDisplayDate}
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                dy={10}
                                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                                tickLine={false}
                                minTickGap={25}
                                padding={{ left: 10, right: 10 }}
                            />

                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                dx={-2}
                                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                                tickLine={false}
                                domain={[safeMinScore, safeMaxScore]}
                                allowDataOverflow={false}
                                tickFormatter={(v) => `${formatValue(v)}${unit}`}
                                width={56}
                            />

                            <ReferenceArea
                                y1={safeTargetScore}
                                y2={safeMaxScore}
                                fill="#10b981"
                                fillOpacity={0.05}
                            />

                            <ReferenceArea
                                y1={safeMinScore}
                                y2={dangerLimit}
                                fill="#ef4444"
                                fillOpacity={0.035}
                            />

                            <ReferenceLine
                                y={safeTargetScore}
                                stroke="#10b981"
                                strokeOpacity={0.8}
                                strokeWidth={1.8}
                                strokeDasharray="5 3"
                                label={{
                                    value: `Meta: ${formatValue(safeTargetScore)}${unit}`,
                                    fill: '#34d399',
                                    fontSize: 11,
                                    fontWeight: 'bold',
                                    position: 'insideTopLeft',
                                    dy: -12,
                                    dx: 12
                                }}
                            />

                            <Tooltip
                                offset={20}
                                cursor={{ stroke: 'rgba(255, 255, 255, 0.18)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                content={renderTooltipContent}
                            />

                            {visibleCategories.flatMap((cat) => {
                                const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
                                const lineType = engine?.style || 'linear';
                                const cfg = lineConfigByCat[cat.id];
                                if (!cfg) return [];
                                const { isFocused, hasFocus, displayColor, lineOpacity, lineWidth, onLineClick, labelRenderer, dotProps, activeDotEl } = cfg;
                                const showGlow = isFocused || (!hasFocus && visibleCategories.length <= 4);
                                const showBand = engine?.id === 'bayesian' && (isFocused || (!hasFocus && (showBandsForAll || isSameId(cat.id, focusSubjectId))));

                                return [
                                    showBand ? (
                                        <Area
                                            connectNulls
                                            key={`bay_ci_${cat.id}`}
                                            type={lineType}
                                            dataKey={`band_${cat.id}`}
                                            name="_IC 95%"
                                            stroke="none"
                                            fill={`url(#bayBand_${cat.id}_${instanceId})`}
                                            legendType="none"
                                            isAnimationActive={false}
                                        />
                                    ) : null,
                                    isFocused ? (
                                        <Area
                                            connectNulls
                                            key={`area_${cat.id}`}
                                            type={lineType}
                                            dataKey={dataKey}
                                            name={`_area_${cat.id}`}
                                            stroke="none"
                                            fill={`url(#grad_${cat.id}_${instanceId})`}
                                            legendType="none"
                                            isAnimationActive={false}
                                        />
                                    ) : null,
                                    showGlow ? (
                                        <Line
                                            connectNulls
                                            key={`glow_${cat.id}`}
                                            type={lineType}
                                            dataKey={dataKey}
                                            name={`_glow_${cat.name}`}
                                            stroke={displayColor}
                                            strokeWidth={lineWidth + 4}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeOpacity={lineOpacity * 0.28}
                                            dot={false}
                                            activeDot={false}
                                            legendType="none"
                                            isAnimationActive={false}
                                        />
                                    ) : null,
                                    <Line
                                        connectNulls
                                        key={cat.id}
                                        id={`${engine?.id || 'line'}_${cat.id}_${instanceId}`}
                                        type={lineType}
                                        dataKey={dataKey}
                                        name={cat.name}
                                        stroke={displayColor}
                                        strokeWidth={lineWidth}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeOpacity={lineOpacity}
                                        dot={dotProps}
                                        activeDot={activeDotEl}
                                        style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                                        isAnimationActive={false}
                                        onClick={onLineClick}
                                    >
                                        <LabelList content={labelRenderer} />
                                    </Line>
                                ];
                            })}

                            {enhancedChartData.length > 1 && (
                                <Brush
                                    dataKey="date"
                                    height={22}
                                    stroke="#6366f1"
                                    fill="rgba(15, 23, 42, 0.85)"
                                    tickFormatter={formatDisplayDate}
                                    travellerWidth={8}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartFrame>
            </div>
        </div>
    );
});
