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
        const yPositions = finalPoints.map(p => ({ ...p, yPos: Number(p.value) || 0 }));
        
        const topLimit = maxScore - (range * 0.02);
        const bottomLimit = minScore + (range * 0.05);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);
        
        const MIN_PCT_DISTANCE = range * 0.075; // 7.5% distance threshold
        const requiredSpace = (yPositions.length - 1) * MIN_PCT_DISTANCE;
        
        // Dynamic compression if too many labels for the space
        const effectiveDistance = requiredSpace > safeSpace 
            ? safeSpace / Math.max(1, yPositions.length - 1) 
            : MIN_PCT_DISTANCE;

        // Pass 1: Push down to separate colliding labels
        for (let i = 1; i < yPositions.length; i++) {
            if (yPositions[i - 1].yPos - yPositions[i].yPos < effectiveDistance) {
                yPositions[i].yPos = yPositions[i - 1].yPos - effectiveDistance;
            }
        }

        // Pass 2: Bottom recovery (avoid falling off the bottom boundary)
        if (yPositions.length > 0 && yPositions[yPositions.length - 1].yPos < bottomLimit) {
            const shift = bottomLimit - yPositions[yPositions.length - 1].yPos;
            yPositions.forEach(p => p.yPos += shift);
        }

        // Pass 3: Top recovery (avoid cutting the top of the chart)
        if (yPositions.length > 0 && yPositions[0].yPos > topLimit) {
            const shift = yPositions[0].yPos - topLimit;
            yPositions.forEach(p => p.yPos -= shift);
        }

        const map = {};
        yPositions.forEach(p => { map[p.id] = p.yPos; });
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
        <div className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0">
                <ComposedChart 
                    data={enhancedChartData} 
                    // 🎯 FIX: Aumento da margem direita (right: 110) para acomodar a Label formatada
                    margin={{ top: 20, right: 110, left: 0, bottom: 20 }} 
                    style={{ outline: 'none' }} 
                    tabIndex="-1"
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
                            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                            <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
                            <feMerge>
                                <feMergeNode in="offsetBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />

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
                        offset={200}
                        cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '0' }}
                        content={(props) => <ChartTooltip {...props} chartData={enhancedChartData} isCompare={false} unit={unit} />} 
                    />

                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', paddingBottom: '0' }} />

                    {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                        const isFocused = showOnlyFocus ? (focusSubjectId === cat.id) : false;
                        const hasFocus = showOnlyFocus ? !!focusSubjectId : false;
                        const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
                        const lineType = engine?.style || 'linear'; // FIX: Mudado de monotoneX para linear como padrão para evitar o bug do Recharts (spaghetti/zig-zag effect) com connectNulls
                        const displayColor = cat.color || '#3b82f6';

                        const lineOpacity = hasFocus ? (isFocused ? 1 : 0.4) : 0.8;
                        const lineWidth = hasFocus ? (isFocused ? 3.5 : 1.5) : 2;

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
                                stroke={displayColor} 
                                strokeWidth={lineWidth}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={lineOpacity}
                                dot={{ r: 3, strokeWidth: 1.5, stroke: displayColor, fill: '#0f172a', strokeOpacity: lineOpacity, fillOpacity: lineOpacity }}
                                activeDot={{ r: 5, fill: displayColor, stroke: '#ffffff', strokeWidth: 2, strokeOpacity: lineOpacity, fillOpacity: lineOpacity }}
                                connectNulls
                                style={{ filter: (isFocused || !hasFocus) ? `url(#${shadowId})` : 'none', transition: 'all 0.5s ease' }}
                                isAnimationActive={true}
                                animationDuration={800}
                                animationEasing="ease-out"
                                animationBegin={0}
                            >
                                <LabelList content={(props) => renderCustomLabel(props, cat.id, displayColor, isFocused, hasFocus)} />
                            </Line>
                        ];
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
