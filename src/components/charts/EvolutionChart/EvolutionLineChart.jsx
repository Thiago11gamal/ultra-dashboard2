import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { normalizeDate } from '../../../utils/dateHelper';

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

    // Generate native tuple bands for Recharts Area
    const enhancedChartData = React.useMemo(() => {
        if (!filteredChartData || !filteredChartData.length) return [];
        // BUG-Z1 FIX: Defensive sort to prevent zig-zag lines if data is unordered
        // FIX: Usar normalizeDate para evitar que YYYY-MM-DD seja interpretado como UTC midnight
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
            return copy;
        });
    }, [filteredChartData, activeCategories, showOnlyFocus, focusSubjectId]);

    // Gather all final points to calculate offsets for labels
    const finalPoints = React.useMemo(() => {
        const pts = [];
        activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
            const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
            const lastVal = filteredChartData[filteredChartData.length - 1]?.[dataKey];
            if (lastVal != null && Number.isFinite(Number(lastVal))) {
                pts.push({ id: cat.id, name: cat.name, value: Number(lastVal), color: cat.color });
            }
        });
        // Sort by value descending
        return pts.sort((a, b) => b.value - a.value);
    }, [filteredChartData, activeCategories, showOnlyFocus, focusSubjectId, engine]);

    // Compute adjusted Y positions for labels once per render to avoid O(N*M) in renderCustomLabel
    const yAdjustedMap = React.useMemo(() => {
        if (!finalPoints.length) return {};
        
        const yPositions = finalPoints.map(p => ({ ...p, yPos: Number(p.value) || 0 }));
        const MIN_PCT_DISTANCE = 4.5;

        for (let i = 1; i < yPositions.length; i++) {
            if (yPositions[i - 1].yPos - yPositions[i].yPos < MIN_PCT_DISTANCE) {
                yPositions[i].yPos = yPositions[i - 1].yPos - MIN_PCT_DISTANCE;
            }
        }

        if (yPositions.length > 0 && yPositions[yPositions.length - 1].yPos < 0) {
            const shift = -yPositions[yPositions.length - 1].yPos;
            yPositions.forEach(p => p.yPos += shift);
        }

        // 🎯 SCALE BUG FIX: O limite de respiro superior deve ser proporcional à pontuação máxima.
        const topLimit = maxScore * 0.96; 
        if (yPositions.length > 0 && yPositions[0].yPos > topLimit) {
            const topShift = yPositions[0].yPos - topLimit;
            yPositions.forEach(p => p.yPos -= topShift);
        }

        const map = {};
        yPositions.forEach(p => {
            map[p.id] = p.yPos;
        });
        return map;
    }, [finalPoints]);

    const renderCustomLabel = (props, catId, catColor) => {
        const { x, y, index, value, viewBox } = props;
        
        if (index === filteredChartData.length - 1 && value != null) {
            let offsetPx = 0;
            const adjustedY = yAdjustedMap[catId];
            
            if (adjustedY !== undefined && adjustedY !== value) {
                // BUG 4b FIX: Use maxScore instead of hardcoded 100
                const pxPerPct = (viewBox?.height > 0) ? viewBox.height / maxScore : 2.5;
                offsetPx = (value - adjustedY) * pxPerPct;
            }

            return (
                <g style={{ zIndex: 100 }}>
                    <text x={x + 8} y={y + 4 + offsetPx} fill={catColor} fontSize={11} fontWeight="bold" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}>
                        {Number(value).toFixed(1)}{unit}
                    </text>
                </g>
            );
        }
        return null;
    };

    return (
        <div className="h-[250px] sm:h-[450px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0">
            <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none focus:ring-0">
                {/* CORREÇÃO AQUI: Aumentamos margin bottom para 20 e adicionamos padding interno no Eixo X */}
                <ComposedChart data={enhancedChartData} margin={{ top: 20, right: 65, left: 0, bottom: 20 }} style={{ outline: 'none' }} tabIndex="-1">
                    <defs>
                        {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).map(cat => (
                            <React.Fragment key={`defs_${cat.id}`}>
                                <linearGradient id={`grad_${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={cat.color} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={cat.color} stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id={`bayBand_${cat.id}`} x1="0" y1="0" x2="0" y2="1">
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
                    
                    {/* CORREÇÃO AQUI: padding evita linhas sendo cortadas no limite esquerdo do gráfico */}
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
                        tickFormatter={(v) => `${v}${unit}`} 
                        width={45} 
                    />
                    
                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeOpacity={0.45} strokeDasharray="0"
                        label={{ value: `Meta ${targetScore}${unit}`, fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft', dy: -4, dx: 5 }} />
                    
                    <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '0' }}
                        content={<ChartTooltip chartData={enhancedChartData} isCompare={false} />} />
                    
                    {/* Legenda empurrada sutilmente para baixo */}
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', paddingBottom: '0' }} />
                    
                    {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                        const isFocused = focusSubjectId === cat.id;
                        const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;

                        return [
                            (isFocused && engine?.id === 'bayesian') ? (
                                <Area key={`bay_ci_${cat.id}`} type={engine?.style || 'monotone'}
                                    dataKey={`band_${cat.id}`}
                                    name="_IC 95%" stroke="none"
                                    fill={`url(#bayBand_${cat.id})`} legendType="none"
                                    connectNulls
                                    isAnimationActive={false}
                                />
                            ) : null,
                            isFocused ? (
                                <Area key={`area_${cat.id}`} type={engine?.style || 'monotone'} dataKey={dataKey} name={`_area_${cat.id}`} stroke="none"
                                    fill={`url(#grad_${cat.id})`} legendType="none" connectNulls />
                            ) : null,
                            <Line key={cat.id} type={engine?.style || 'monotone'} dataKey={dataKey} name={cat.name}
                                stroke={cat.color} strokeWidth={isFocused ? 3.5 : 2}
                                strokeLinecap="round" strokeLinejoin="round"
                                strokeOpacity={isFocused ? 1 : 0.4}
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
