import React, { useId, useState } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList, Brush
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { normalizeDate } from '../../../utils/dateHelper';
import { formatValue } from '../../../utils/scoreHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke, onClick, isDimmed } = props;
    if (cx == null || cy == null) return null;
    return (
        <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', pointerEvents: 'all' }}>
            {!isDimmed && (
                <>
                    <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                        <animate attributeName="r" from="6" to="16" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
                </>
            )}
            {/* Invisible larger target for easy clicking when dimmed */}
            {isDimmed && <circle cx={cx} cy={cy} r={15} fill="transparent" stroke="transparent" />}
        </g>
    );
};

/**
 * EvolutionLineChart
 * 
 * A premium analytical chart showing performance evolution with Bayesian confidence bands,
 * focus highlighting, and adaptive label anti-collision.
 */
export function EvolutionLineChart({
    filteredChartData,
    activeCategories,
    engine,
    targetScore,
    focusSubjectId,
    showOnlyFocus,
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const instanceId = useId().replace(/:/g, "");
    const shadowId = `el_lineShadow_${instanceId}`;

    const [highlightedDataKey, setHighlightedDataKey] = useState(null);

    const handleLegendClick = (e) => {
        const key = e?.dataKey || e?.payload?.dataKey || (e?.payload && e.payload.id);
        if (key) {
            setHighlightedDataKey(prev => prev === key ? null : key);
        }
    };



    // Refined chart data with defensive sorting and date normalization
    const enhancedChartData = React.useMemo(() => {
        if (!filteredChartData || !filteredChartData.length) return [];
        
        // BUG-Z1 FIX: Defensive sort to prevent zig-zag lines if data is unordered
        const sortedData = [...filteredChartData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });

        return sortedData.map(d => {
            const copy = { ...d };
            activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
                const low = d[`bay_ci_low_${cat.id}`];
                const high = d[`bay_ci_high_${cat.id}`];
                if (low != null && high != null) {
                    copy[`band_${cat.id}`] = [low, high];
                }
            });
            // Fallback defensivo para o eixo X (BUG-T1 Fix)
            copy.displayDate = copy.displayDate || copy.date;
            return copy;
        });
    }, [filteredChartData, activeCategories, showOnlyFocus, focusSubjectId]);

    // Gather final points for label positioning
    const finalPoints = React.useMemo(() => {
        if (!enhancedChartData.length) return [];
        const pts = [];
        const lastIndex = enhancedChartData.length - 1;
        
        activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
            const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
            const lastVal = enhancedChartData[lastIndex]?.[dataKey];
            if (lastVal != null && Number.isFinite(Number(lastVal))) {
                pts.push({ id: cat.id, name: cat.name, value: Number(lastVal), color: cat.color });
            }
        });
        // Sort by value descending (highest values first)
        return pts.sort((a, b) => b.value - a.value);
    }, [enhancedChartData, activeCategories, showOnlyFocus, focusSubjectId, engine]);

    // Adaptive label collision logic (Hardened for variable score scales)
    const yAdjustedMap = React.useMemo(() => {
        if (!finalPoints.length) return {};

        const range = maxScore - minScore;
        const labels = finalPoints.map(p => ({ ...p, yPos: Number(p.value) || 0 }));
        
        const topLimit = maxScore - (range * 0.02);
        const bottomLimit = minScore + (range * 0.05);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);
        
        const MIN_PCT_DISTANCE = range * 0.075; // 7.5% distance threshold
        const requiredSpace = (labels.length - 1) * MIN_PCT_DISTANCE;
        
        // Dynamic compression if too many labels for the space
        const effectiveDistance = requiredSpace > safeSpace 
            ? safeSpace / Math.max(1, labels.length - 1) 
            : MIN_PCT_DISTANCE;

        // Iterative relaxation algorithm to spread out colliding labels
        const ITERATIONS = 15;
        for (let iter = 0; iter < ITERATIONS; iter++) {
            let overlapFound = false;
            for (let i = 0; i < labels.length - 1; i++) {
                const l1 = labels[i];
                const l2 = labels[i + 1];
                const diff = l1.yPos - l2.yPos; // Expect l1 > l2 since they are sorted descending
                
                if (diff < effectiveDistance) {
                    overlapFound = true;
                    const adjustment = (effectiveDistance - diff) / 2;
                    l1.yPos += adjustment;
                    l2.yPos -= adjustment;
                }
            }
            
            // Apply boundary constraints gently (shift all to maintain separation)
            if (labels.length > 0 && labels[0].yPos > topLimit) {
                const diff = labels[0].yPos - topLimit;
                labels.forEach(l => l.yPos -= diff);
            }
            
            if (labels.length > 0 && labels[labels.length - 1].yPos < bottomLimit) {
                const diff = bottomLimit - labels[labels.length - 1].yPos;
                labels.forEach(l => l.yPos += diff);
            }
            
            if (!overlapFound) break;
        }

        // Force strict limits one last time for safety
        for (let i = 0; i < labels.length; i++) {
            if (labels[i].yPos > topLimit) labels[i].yPos = topLimit;
            if (labels[i].yPos < bottomLimit) labels[i].yPos = bottomLimit;
        }

        const map = {};
        labels.forEach(p => { map[p.id] = p.yPos; });
        return map;
    }, [finalPoints, maxScore, minScore]);

    const renderCustomLabel = (props, catId, displayColor, isFocused, hasFocus) => {
        const { x, y, index, value, viewBox } = props;

        if (hasFocus && !isFocused) return null;

        if (index === filteredChartData.length - 1 && value != null) {
            let offsetPx = 0;
            const adjustedY = yAdjustedMap[catId];

            if (adjustedY !== undefined && adjustedY !== value) {
                const range = maxScore - minScore;
                const pxPerPct = (viewBox?.height > 0) ? viewBox.height / (range || 1) : 2.5;
                offsetPx = (value - adjustedY) * pxPerPct;
            }

            return (
                <g style={{ zIndex: 100, transition: 'all 0.3s ease' }}>
                    <rect
                        x={x + 8}
                        y={y - 11 + offsetPx}
                        width={46}
                        height={22}
                        rx={6}
                        fill="#020617"
                        fillOpacity={0.7}
                        stroke={displayColor}
                        strokeOpacity={0.9}
                        strokeWidth={1.5}
                    />
                    <text 
                        x={x + 31} 
                        y={y + 4 + offsetPx} 
                        fill="#ffffff" 
                        fontSize={11} 
                        fontWeight="black" 
                        textAnchor="middle"
                        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
                    >
                        {formatValue(value)}{unit}
                    </text>
                </g>
            );
        }
        return null;
    };

    return (
        <div className="relative h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            {highlightedDataKey && (
                <button 
                    type="button" 
                    onClick={() => setHighlightedDataKey(null)}
                    className="absolute top-0 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-300 text-[10px] font-bold rounded-lg shadow-lg transition-all"
                >
                    <span>👁️</span> Mostrar Todos
                </button>
            )}
            <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0" minWidth={1}>
                <ComposedChart 
                    data={enhancedChartData} 
                    syncId="evolutionSync"
                    margin={{ top: 20, right: 110, left: 0, bottom: 20 }} 
                    style={{ outline: 'none', cursor: highlightedDataKey ? 'pointer' : 'default' }} 
                    tabIndex="-1"
                    onClick={() => {
                        if (highlightedDataKey) setHighlightedDataKey(null);
                    }}
                >
                    <defs>
                        {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).map((cat) => {
                            const displayColor = cat.color || '#3b82f6';
                            return (
                            <React.Fragment key={`defs_${cat.id}`}>
                                <linearGradient id={`grad_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={displayColor} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={displayColor} stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id={`bayBand_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={displayColor} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={displayColor} stopOpacity={0.02} />
                                </linearGradient>
                            </React.Fragment>
                            );
                        })}
                        <filter id={shadowId} height="200%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />

                    <XAxis
                        dataKey="date"
                        tickFormatter={(val) => {
                            if (!val) return '';
                            const parts = String(val).split('-');
                            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                        }}
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                        dy={10}
                        axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                        tickLine={false}
                        minTickGap={30}
                        padding={{ left: 10, right: 5 }}
                    />

                    <YAxis
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                        dx={-4}
                        axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                        tickLine={false}
                        domain={[minScore, maxScore]}
                        allowDataOverflow={false}
                        tickFormatter={(v) => `${formatValue(v)}${unit}`}
                        width={40}
                    />

                    <ReferenceLine 
                        y={targetScore} 
                        stroke="#10b981" 
                        strokeOpacity={0.6} 
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        label={{ 
                            value: `Meta ${targetScore}${unit}`, 
                            fill: '#22c55e', 
                            fontSize: 10, 
                            position: 'insideBottomLeft', 
                            dy: -4, 
                            dx: 5 
                        }} 
                    />

                    <Tooltip 
                        offset={150}
                        cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 2' }}
                        content={(props) => <ChartTooltip {...props} chartData={enhancedChartData} isCompare={false} unit={unit} />} 
                    />

                    <Legend 
                        verticalAlign="top" 
                        height={28}
                        iconSize={6}
                        onClick={handleLegendClick}
                        wrapperStyle={{ fontSize: '9px', color: '#64748b', fontWeight: 600, paddingBottom: '6px', cursor: 'pointer' }} 
                    />

                    {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                        const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
                        const lineType = engine?.style || 'linear';

                        const isLegendHighlighted = highlightedDataKey === dataKey;
                        const isAnyHighlighted = !!highlightedDataKey;

                        const isFocused = showOnlyFocus ? (focusSubjectId === cat.id) : isLegendHighlighted;
                        const hasFocus = showOnlyFocus ? !!focusSubjectId : isAnyHighlighted;
                        
                        let displayColor = cat.color || '#3b82f6';
                        if (isLegendHighlighted) {
                            displayColor = '#fbbf24'; // Vivid amber/gold highlight
                        }

                        const lineOpacity = hasFocus ? (isFocused ? 1 : 0.4) : 0.8;
                        const lineWidth = hasFocus ? (isFocused ? 3.5 : 1.5) : 2;

                        return [
                            // Bayesian Confidence Interval Band
                            (isFocused && engine?.id === 'bayesian') ? (
                                <Area connectNulls key={`bay_ci_${cat.id}`} type={lineType}
                                    dataKey={`band_${cat.id}`}
                                    name="_IC 95%" stroke="none"
                                    fill={`url(#bayBand_${cat.id}_${instanceId})`} legendType="none"
                                    isAnimationActive={false}
                                />
                            ) : null,
                            // Background Gradient Area for Focused Line
                            isFocused ? (
                                <Area connectNulls key={`area_${cat.id}`} type={lineType} dataKey={dataKey} name={`_area_${cat.id}`} stroke="none"
                                    fill={`url(#grad_${cat.id}_${instanceId})`} legendType="none" />
                            ) : null,
                            // Bottom layer: Glow effect (thicker, transparent line)
                            <Line connectNulls 
                                key={`glow_${cat.id}`} 
                                type={lineType} 
                                dataKey={dataKey} 
                                name={`_glow_${cat.name}`}
                                stroke={displayColor} 
                                strokeWidth={lineWidth + 4}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={(isFocused || !hasFocus) ? lineOpacity * 0.3 : 0}
                                dot={false}
                                activeDot={false}
                                legendType="none"
                                isAnimationActive={false}
                            />,
                            // Top layer: The Performance Evolution Line
                            <Line connectNulls 
                                key={cat.id} 
                                type={lineType} 
                                dataKey={dataKey} 
                                name={cat.name}
                                stroke={displayColor} 
                                strokeWidth={lineWidth}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={lineOpacity}
                                dot={{ r: 3, strokeWidth: 1.5, stroke: displayColor, fill: '#0f172a', strokeOpacity: lineOpacity, fillOpacity: lineOpacity }}
                                activeDot={<CustomActiveDot fill={displayColor} stroke="#ffffff" isDimmed={hasFocus && !isFocused} onClick={(e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    setHighlightedDataKey(dataKey);
                                }} />}
                                style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                                isAnimationActive={false}
                                onClick={(props, e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    if (props && props.nativeEvent && props.nativeEvent.stopPropagation) props.nativeEvent.stopPropagation();
                                    setHighlightedDataKey(dataKey);
                                }}
                            >
                                <LabelList content={(props) => renderCustomLabel(props, cat.id, displayColor, isFocused, hasFocus)} />
                            </Line>
                        ];
                    })}

                    <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#64748b" 
                        fill="rgba(15, 23, 42, 0.4)" 
                        tickFormatter={(val) => val ? val.split('-').slice(1).reverse().join('/') : ''}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
