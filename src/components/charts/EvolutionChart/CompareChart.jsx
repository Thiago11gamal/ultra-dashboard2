import React from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";

export function CompareChart({ 
    filteredChartData, 
    targetScore 
}) {
    // BUG-C3 FIX: Pre-computar índices do último ponto válido para cada série
    // Evita 4× reduce() por chamada de renderLabel (~3200 chamadas/render)
    const lastValidIdx = React.useMemo(() => {
        const last = { bay: -1, raw: -1, stats: -1, mc: -1 };
        for (let i = filteredChartData.length - 1; i >= 0; i--) {
            const d = filteredChartData[i];
            if (last.bay < 0 && d["Nível Bayesiano"] != null) last.bay = i;
            if (last.raw < 0 && d["Nota Bruta"] != null) last.raw = i;
            if (last.stats < 0 && d["Média Histórica"] != null) last.stats = i;
            if (last.mc < 0 && d["Futuro Provável"] != null) last.mc = i;
            if (last.bay >= 0 && last.raw >= 0 && last.stats >= 0 && last.mc >= 0) break;
        }
        return last;
    }, [filteredChartData]);
    // Helper to sweep collisions
    const solveCollisions = (points) => {
        if (!points.length) return [];
        const sorted = [...points].sort((a, b) => b.value - a.value);
        const yPos = sorted.map(p => ({ ...p, yPos: Number(p.value) || 0 }));
        const DIST = 9;
        for (let i = 1; i < yPos.length; i++) {
            if (yPos[i - 1].yPos - yPos[i].yPos < DIST) {
                yPos[i].yPos = yPos[i - 1].yPos - DIST;
            }
        }
        return yPos;
    };

    // 1. Points for "Hoje"
    const todayIdx = filteredChartData.reduce((acc, curr, i) => curr["Nota Bruta"] != null ? i : acc, -1);
    const todayPoints = [];
    if (todayIdx >= 0) {
        const d = filteredChartData[todayIdx];
        if (d["Nível Bayesiano"] != null) todayPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null) todayPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null) todayPoints.push({ name: 'stats', value: d["Média Histórica"] });
        if (d["Futuro Provável"] != null) todayPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const todayY = solveCollisions(todayPoints);

    // 2. Points for "Futuro"
    const futureIdx = filteredChartData.length - 1;
    const isFuturePoint = futureIdx > todayIdx;
    const lastPoints = [];
    if (isFuturePoint && futureIdx >= 0) {
        const d = filteredChartData[futureIdx];
        if (d["Futuro Provável"] != null) lastPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const lastY = solveCollisions(lastPoints);

    const getOffset = (name, value, index, viewBox) => {
        const isFuture = isFuturePoint && index === futureIdx;
        const pts = isFuture ? lastY : todayY;
        if (!pts || !pts.length) return 0;
        const pt = pts.find(p => p.name === name);
        if (!pt) return 0;
        // BUG-C1 FIX: Guard viewBox.height > 0 (consistente com EvolutionLineChart)
        const pxPerPct = viewBox?.height != null && viewBox.height > 0 ? viewBox.height / 100 : 4.6;
        return (value - pt.yPos) * pxPerPct;
    };

    const renderLabel = (props, type, color) => {
        const { x, y, index, value, viewBox } = props;
        if (value === null || value === undefined) return null;
        
        const isMc = type === 'mc';
        const isBay = type === 'bay';
        const isRaw = type === 'raw';
        const isStats = type === 'stats';

        // BUG-C3 FIX: Usar índices pre-computados em vez de reduce() por chamada
        let isValid = false;
        if (isMc) isValid = lastValidIdx.mc === index;
        else if (isBay) isValid = lastValidIdx.bay === index;
        else if (isRaw) isValid = lastValidIdx.raw === index;
        else if (isStats) isValid = lastValidIdx.stats === index;

        if (!isValid) return null;

        const offset = getOffset(type, value, index, viewBox);
        const xOff = isMc ? 10 : 8;
        return <text x={x + xOff} y={y + 4 + offset} fill={color} fontSize={11} fontWeight="bold">{Number(value).toFixed(1)}%</text>;
    };

    // Calculate base for gain shadow
    let gainBase = 'dataMin';
    if (todayIdx >= 0) {
        const todayPt = filteredChartData[todayIdx];
        gainBase = todayPt["Nível Bayesiano"] != null ? todayPt["Nível Bayesiano"] : todayPt["Nota Bruta"];
    }

    return (
        <div className="h-[220px] sm:h-[360px] md:h-[460px] w-full outline-none focus:outline-none focus:ring-0">
            <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none focus:ring-0">
                <ComposedChart data={filteredChartData} margin={{ top: 20, right: 65, left: 0, bottom: 20 }} style={{ outline: 'none' }} tabIndex="-1">
                    <defs>
                        <linearGradient id="cc_projectionPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="cc_cloudGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="cc_bayBandGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.04} />
                        </linearGradient>
                        <linearGradient id="cc_greenGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                        </linearGradient>
                        <filter id="cc_lineShadow" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                            <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
                            <feMerge>
                                <feMergeNode in="offsetBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="cc_glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="glow" />
                            <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b' }} dy={8} axisLine={false} tickLine={false} minTickGap={35} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} dx={-4} axisLine={false} tickLine={false} domain={[0, 100]} allowDataOverflow={true} tickFormatter={(v) => `${v}%`} width={50} />
                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeOpacity={0.45}
                        label={{ value: `Meta ${targetScore}%`, fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft', dy: -4, dx: 5 }} />
                    <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1 }}
                        content={<ChartTooltip isCompare={true} chartData={filteredChartData} />} />
                    <Legend wrapperStyle={{ paddingTop: '15px', paddingBottom: '10px', fontSize: '11px' }} />
                    
                    <Area type="monotoneX" dataKey="Banda Bayesiana" stroke="none" fill="url(#cc_bayBandGradient)" legendType="none" connectNulls isAnimationActive={false} />
                    <Area type="monotoneX" dataKey="Futuro Provável" name="_shadow_projection" fill="url(#cc_projectionPurpleGradient)" stroke="none" legendType="none" connectNulls isAnimationActive={false} />
                    {/* VISUAL-FIX: Cor do Ganho mudada para ESMERALDA (#10b981) e opacidade reduzida para semântica de progresso positiva */}
                    <Area type="monotoneX" dataKey="Futuro Provável" name="_shadow_gain_base" fill="#10b981" fillOpacity={0.15} stroke="none" legendType="none" connectNulls isAnimationActive={false} baseValue={gainBase} />
                    <Area type="monotoneX" dataKey="Futuro Provável" name="_shadow_gain_edge" fill="none" stroke="#10b981" strokeWidth={1} strokeOpacity={0.3} legendType="none" connectNulls isAnimationActive={false} baseValue={gainBase} />
                    <Area type="monotoneX" dataKey="Cenário Range" fill="url(#cc_cloudGradient)" stroke="none" legendType="none" />
                    
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={3}
                        strokeLinecap="round" strokeLinejoin="round"
                        fill="url(#cc_greenGradient)" dot={{ r: 3, fill: '#34d399', stroke: '#0a0f1e', strokeWidth: 1.5 }}
                        activeDot={false} connectNulls style={{ filter: 'url(#cc_lineShadow)' }} isAnimationActive={true}>
                        <LabelList content={(props) => renderLabel(props, 'bay', '#34d399')} />
                    </Area>
                    
                    <Line type="monotoneX" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={2}
                        strokeLinecap="round" strokeLinejoin="round"
                        dot={{ r: 3 }} activeDot={false} connectNulls strokeOpacity={0.85} isAnimationActive={true}>
                        <LabelList content={(props) => renderLabel(props, 'raw', '#fb923c')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls strokeOpacity={0.6} isAnimationActive={true}>
                        <LabelList content={(props) => renderLabel(props, 'stats', '#818cf8')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={1.5}
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            if (index !== filteredChartData.length - 1) return null;
                            return (
                                <g>
                                    <circle cx={cx} cy={cy} r={4} fill="#a78bfa" stroke="#ffffff" strokeWidth={1} style={{ filter: 'url(#cc_glow)' }}>
                                        <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx={cx} cy={cy} r={7} fill="#a78bfa" opacity="0.3">
                                        <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.3;0;0.3" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                </g>
                            );
                        }}
                        connectNulls strokeOpacity={1} style={{ filter: 'url(#cc_glow)' }} isAnimationActive={false}>
                        <LabelList content={(props) => renderLabel(props, 'mc', '#a78bfa')} />
                    </Line>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
