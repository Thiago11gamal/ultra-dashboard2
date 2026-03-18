import React from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";

export function EvolutionLineChart({ 
    filteredChartData, 
    activeCategories, 
    engine, 
    targetScore, 
    focusSubjectId,
    showOnlyFocus,
    categories 
}) {
    // Gather all final points to calculate offsets for labels
    const finalPoints = [];
    activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
        const dataKey = engine?.prefix ? `${engine.prefix}${cat.name}` : `raw_${cat.name}`;
        const lastVal = filteredChartData[filteredChartData.length - 1]?.[dataKey];
        if (lastVal != null && Number.isFinite(Number(lastVal))) {
            finalPoints.push({ id: cat.id, name: cat.name, value: Number(lastVal), color: cat.color });
        }
    });

    // Sort by value descending
    finalPoints.sort((a, b) => b.value - a.value);

    const renderCustomLabel = (props, catId, catColor) => {
        const { x, y, index, value, viewBox } = props;
        // Only render at the very last point of the line
        if (index === filteredChartData.length - 1 && value != null) {
            let offsetPx = 0;
            const pt = finalPoints.find(p => p.id === catId);
            if (pt) {
                const yPositions = [...finalPoints].map(p => ({ ...p, yPos: Number(p.value) || 0 }));
                const MIN_PCT_DISTANCE = 4.5;

                for (let i = 1; i < yPositions.length; i++) {
                    if (yPositions[i - 1].yPos - yPositions[i].yPos < MIN_PCT_DISTANCE) {
                        yPositions[i].yPos = yPositions[i - 1].yPos - MIN_PCT_DISTANCE;
                    }
                }

                const myAdjPt = yPositions.find(p => p.id === catId);
                if (myAdjPt && myAdjPt.yPos !== myAdjPt.value) {
                    const pctShift = value - myAdjPt.yPos;
                    const pxPerPct = viewBox?.height != null ? viewBox.height / 100 : 4.6;
                    offsetPx = pctShift * pxPerPct;
                }
            }

            return (
                <g>
                    <text x={x + 8} y={y + 4 + offsetPx} fill={catColor} fontSize={11} fontWeight="bold">
                        {Number(value).toFixed(1)}%
                    </text>
                </g>
            );
        }
        return null;
    };

    return (
        <div className="h-[220px] sm:h-[360px] md:h-[460px] w-full outline-none focus:outline-none focus:ring-0">
            <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none focus:ring-0">
                <ComposedChart data={filteredChartData} margin={{ top: 20, right: 65, left: 0, bottom: 12 }} style={{ outline: 'none' }} tabIndex="-1">
                    <defs>
                        {categories.map(cat => (
                            <linearGradient key={cat.id} id={`grad_${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={cat.color} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={cat.color} stopOpacity={0.01} />
                            </linearGradient>
                        ))}
                        <filter id="lineShadow" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                            <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
                            <feMerge>
                                <feMergeNode in="offsetBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <linearGradient id="bayBandGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.04} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b' }} dy={8} axisLine={false} tickLine={false} minTickGap={35} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} dx={-4} axisLine={false} tickLine={false} domain={[0, 100]} allowDataOverflow={true} tickFormatter={(v) => `${v}%`} width={50} />
                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeOpacity={0.45} strokeDasharray="0"
                        label={{ value: `Meta ${targetScore}%`, fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft', dy: -4, dx: 5 }} />
                    <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '0' }}
                        content={<ChartTooltip chartData={filteredChartData} isCompare={false} />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', paddingBottom: '5px' }} />
                    
                    {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                        const isFocused = focusSubjectId === cat.id;
                        const dataKey = engine?.prefix ? `${engine.prefix}${cat.name}` : `raw_${cat.name}`;

                        return [
                            (isFocused && engine.id === 'bayesian') ? (
                                <Area key={`bay_ci_${cat.id}`} type={engine.style}
                                    dataKey={`bay_ci_high_${cat.name}`}
                                    name="IC 95% (sup)" stroke="none"
                                    fill="url(#bayBandGradient)" legendType="none"
                                    baseValue="dataMin" connectNulls
                                    isAnimationActive={false}
                                />
                            ) : null,
                            (isFocused && engine.id === 'bayesian') ? (
                                <Area key={`bay_ci_low_${cat.id}`} type={engine.style}
                                    dataKey={`bay_ci_low_${cat.name}`}
                                    name="IC 95% (inf)" stroke="none"
                                    fill="#0a0f1e" legendType="none"
                                    connectNulls isAnimationActive={false}
                                />
                            ) : null,
                            isFocused ? (
                                <Area key={`area_${cat.id}`} type={engine.style} dataKey={dataKey} name={cat.name} stroke="none"
                                    fill={`url(#grad_${cat.id})`} legendType="none" connectNulls />
                            ) : null,
                            <Line key={cat.id} type={engine.style} dataKey={dataKey} name={cat.name}
                                stroke={cat.color} strokeWidth={isFocused ? 3.5 : 2}
                                strokeLinecap="round" strokeLinejoin="round"
                                strokeOpacity={isFocused ? 1 : 0.4}
                                dot={isFocused ? { r: 4, fill: cat.color, stroke: '#0a0f1e', strokeWidth: 2 } : false}
                                activeDot={false}
                                connectNulls
                                style={{ filter: isFocused ? 'url(#lineShadow)' : 'none' }}
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
