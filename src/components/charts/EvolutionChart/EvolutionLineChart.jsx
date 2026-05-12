import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { normalizeDate } from '../../../utils/dateHelper';
import { formatValue } from '../../../utils/scoreHelper';

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
        if (!filteredChartData || !filteredChartData.length) return [];
        const pts = [];
        const lastIndex = filteredChartData.length - 1;
        
        activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
            const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
            const lastVal = filteredChartData[lastIndex]?.[dataKey];
            if (lastVal != null && Number.isFinite(Number(lastVal))) {
                pts.push({ id: cat.id, name: cat.name, value: Number(lastVal), color: cat.color });
            }
        });
        // Sort by value descending (highest values first)
        return pts.sort((a, b) => b.value - a.value);
    }, [filteredChartData, activeCategories, showOnlyFocus, focusSubjectId, engine]);

    // Adaptive label collision logic (Hardened for variable score scales)
    const yAdjustedMap = React.useMemo(() => {
        if (!finalPoints.length) return {};

        const range = maxScore - minScore;
        const yPositions = finalPoints.map(p => ({ ...p, yPos: Number(p.value) || 0 }));
        const MIN_PCT_DISTANCE = range * 0.075; // 7.5% distance threshold
        const maxAvailableSpace = range * 0.96;
        const requiredSpace = yPositions.length * MIN_PCT_DISTANCE;
        
        // Dynamic compression if too many labels for the space
        const effectiveDistance = requiredSpace > maxAvailableSpace 
            ? maxAvailableSpace / Math.max(1, yPositions.length) 
            : MIN_PCT_DISTANCE;

        // Pass 1: Push down to separate colliding labels
        for (let i = 1; i < yPositions.length; i++) {
            if (yPositions[i - 1].yPos - yPositions[i].yPos < effectiveDistance) {
                yPositions[i].yPos = yPositions[i - 1].yPos - effectiveDistance;
            }
        }

        // Pass 2: Bottom recovery (avoid falling off the bottom boundary)
        const bottomLimit = minScore + (range * 0.05);
        if (yPositions.length > 0 && yPositions[yPositions.length - 1].yPos < bottomLimit) {
            const shift = bottomLimit - yPositions[yPositions.length - 1].yPos;
            yPositions.forEach(p => p.yPos += shift);
        }

        // Pass 3: Hard safety clamp (Safety first!)
        const topLimit = maxScore - (range * 0.04);
        yPositions.forEach(p => {
            p.yPos = Math.max(bottomLimit, Math.min(topLimit, p.yPos));
        });

        const map = {};
        yPositions.forEach(p => { map[p.id] = p.yPos; });
        return map;
    }, [finalPoints, maxScore, minScore]);

    /**
     * Custom Label Renderer
     * Handles dynamic offsets to prevent label overlapping at the end of lines
     */
    const renderCustomLabel = (props, catId, catColor) => {
        const { x, y, index, value, viewBox } = props;

        if (index === filteredChartData.length - 1 && value != null) {
            let offsetPx = 0;
            const adjustedY = yAdjustedMap[catId];

            if (adjustedY !== undefined && adjustedY !== value) {
                const range = maxScore - minScore;
                const pxPerPct = (viewBox?.height > 0) ? viewBox.height / (range || 1) : 2.5;
                // In SVG Y grows down, so if adjustedY is lower than value (numerically),
                // it needs a positive offset to move DOWN.
                offsetPx = (value - adjustedY) * pxPerPct;
            }

            return (
                <g style={{ zIndex: 100 }}>
                    <text 
                        x={x + 8} 
                        y={y + 4 + offsetPx} 
                        fill={catColor} 
                        fontSize={11} 
                        fontWeight="bold" 
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
        <div className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0">
                <ComposedChart 
                    data={enhancedChartData} 
                    margin={{ top: 20, right: 85, left: 0, bottom: 20 }} 
                    style={{ outline: 'none' }} 
                    tabIndex="-1"
                >
                    <defs>
                        {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).map(cat => (
                            <React.Fragment key={`defs_${cat.id}`}>
                                {/* Unique IDs with instanceId to prevent SVG collisions */}
                                <linearGradient id={`grad_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={cat.color} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={cat.color} stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id={`bayBand_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={cat.color} stopOpacity={0.18} />
                                    <stop offset="100%" stopColor={cat.color} stopOpacity={0.04} />
                                </linearGradient>
                            </React.Fragment>
                        ))}
                        <filter id={shadowId} height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                            <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
                            <feMerge>
                                <feMergeNode in="offsetBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />

                    <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        dy={12}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={35}
                        padding={{ left: 15, right: 10 }}
                    />

                    <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        dx={-8}
                        axisLine={false}
                        tickLine={false}
                        domain={[minScore, maxScore]}
                        allowDataOverflow={true}
                        tickFormatter={(v) => `${formatValue(v)}${unit}`}
                        width={45}
                    />

                    <ReferenceLine 
                        y={targetScore} 
                        stroke="#22c55e" 
                        strokeOpacity={0.45} 
                        strokeDasharray="0"
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
                        cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '0' }}
                        content={<ChartTooltip chartData={enhancedChartData} isCompare={false} unit={unit} />} 
                    />

                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', paddingBottom: '0' }} />

                    {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                        const isFocused = focusSubjectId === cat.id;
                        const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
                        // FIX: Default to monotoneX for smoother horizontal transitions
                        const lineType = engine?.style || 'monotoneX';

                        return [
                            // Bayesian Confidence Interval Band
                            (isFocused && engine?.id === 'bayesian') ? (
                                <Area key={`bay_ci_${cat.id}`} type={lineType}
                                    dataKey={`band_${cat.id}`}
                                    name="_IC 95%" stroke="none"
                                    fill={`url(#bayBand_${cat.id}_${instanceId})`} legendType="none"
                                    connectNulls
                                    isAnimationActive={false}
                                />
                            ) : null,
                            // Background Gradient Area for Focused Line
                            isFocused ? (
                                <Area key={`area_${cat.id}`} type={lineType} dataKey={dataKey} name={`_area_${cat.id}`} stroke="none"
                                    fill={`url(#grad_${cat.id}_${instanceId})`} legendType="none" connectNulls />
                            ) : null,
                            // The Performance Evolution Line
                            <Line 
                                key={cat.id} 
                                type={lineType} 
                                dataKey={dataKey} 
                                name={cat.name}
                                stroke={cat.color} 
                                strokeWidth={isFocused ? 3.5 : 2}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={isFocused ? 1 : 0.75}
                                dot={{ r: 3, strokeWidth: 1, fill: cat.color, stroke: '#ffffff' }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                connectNulls
                                style={{ filter: isFocused ? `url(#${shadowId})` : 'none' }}
                                isAnimationActive={true}
                                animationDuration={1500}
                            >
                                <LabelList content={(props) => renderCustomLabel(props, cat.id, cat.color)} />
                            </Line>
                        ];
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
