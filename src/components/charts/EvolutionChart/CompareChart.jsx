import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";

export function CompareChart({ 
    filteredChartData, 
    targetScore,
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const baseId = useId().replace(/:/g, '');
    const CC = React.useMemo(() => ({
        projectionPurpleGradient: `cc_projPurple-${baseId}`,
        cloudGradient: `cc_cloud-${baseId}`,
        bayBandGradient: `cc_bayBand-${baseId}`,
        greenGradient: `cc_green-${baseId}`,
        lineShadow: `cc_lineShadow-${baseId}`,
        glow: `cc_glow-${baseId}`
    }), [baseId]);

    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMinScore
        ? Number(maxScore)
        : Math.max(100, safeMinScore + 1);

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

    const solveCollisions = (points) => {
        if (!points.length) return [];
        const sorted = [...points].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
        const yPos = sorted.map(p => ({
            ...p,
            yPos: Number.isFinite(Number(p.value)) ? Number(p.value) : safeMinScore
        }));
        const DIST = 9;
        for (let i = 1; i < yPos.length; i++) {
            if (yPos[i - 1].yPos - yPos[i].yPos < DIST) {
                yPos[i].yPos = yPos[i - 1].yPos - DIST;
            }
        }
        // 🎯 SCALE BUG FIX: Impede que a legenda vaze do container
        yPos.forEach(p => {
            const span = Math.max(1, safeMaxScore - safeMinScore);
            const pad = Math.min(5, span * 0.1);
            const minBound = safeMinScore + pad;
            const maxBound = safeMaxScore - pad;
            p.yPos = minBound <= maxBound
                ? Math.max(minBound, Math.min(maxBound, p.yPos))
                : Math.max(safeMinScore, Math.min(safeMaxScore, p.yPos));
        });
        return yPos;
    };

    const todayIdx = filteredChartData.reduce((acc, curr, i) => {
        const hasObserved = curr["Nota Bruta"] != null || curr["Nível Bayesiano"] != null || curr["Média Histórica"] != null;
        return hasObserved ? i : acc;
    }, -1);
    const todayPoints = [];
    if (todayIdx >= 0) {
        const d = filteredChartData[todayIdx];
        if (d["Nível Bayesiano"] != null) todayPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null) todayPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null) todayPoints.push({ name: 'stats', value: d["Média Histórica"] });
        if (d["Futuro Provável"] != null) todayPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const todayY = solveCollisions(todayPoints);

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
        const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
        const pxPerPct = viewBox?.height != null && viewBox.height > 0 ? viewBox.height / safeMaxScore : 4.6;
        return (value - pt.yPos) * pxPerPct;
    };

    const renderLabel = (props, type, color) => {
        const { x, y, index, value, viewBox } = props;
        if (value === null || value === undefined) return null;
        
        const isMc = type === 'mc';
        const isBay = type === 'bay';
        const isRaw = type === 'raw';
        const isStats = type === 'stats';

        let isValid = false;
        if (isMc) isValid = lastValidIdx.mc === index;
        else if (isBay) isValid = lastValidIdx.bay === index;
        else if (isRaw) isValid = lastValidIdx.raw === index;
        else if (isStats) isValid = lastValidIdx.stats === index;

        if (!isValid) return null;

        const offset = getOffset(type, value, index, viewBox);
        const xOff = isMc ? 12 : 10;
        return <text x={x + xOff} y={y + 4 + offset} fill={color} fontSize={11} fontWeight="black" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{(Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2)}{unit}</text>;
    };

    let gainBase = 'dataMin';
    if (todayIdx >= 0) {
        const todayPt = filteredChartData[todayIdx];
        const baseCandidate = todayPt["Nível Bayesiano"] != null ? todayPt["Nível Bayesiano"] : todayPt["Nota Bruta"];
        if (Number.isFinite(Number(baseCandidate))) gainBase = Number(baseCandidate);
    }

    return (
        <div className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none focus:ring-0">
                <ComposedChart data={filteredChartData} margin={{ top: 20, right: 75, left: 0, bottom: 20 }} style={{ outline: 'none' }} tabIndex="-1">
                    <defs>
                        <linearGradient id={CC.projectionPurpleGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id={CC.cloudGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id={CC.bayBandGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id={CC.greenGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                        </linearGradient>
                        <filter id={CC.lineShadow} height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                            <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
                            <feMerge>
                                <feMergeNode in="offsetBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id={CC.glow} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3.5" result="glow" />
                            <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dy={12} axisLine={false} tickLine={false} minTickGap={35} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dx={-8} axisLine={false} tickLine={false} domain={[safeMinScore, safeMaxScore]} allowDataOverflow={true} tickFormatter={(v) => `${v}${unit}`} width={50} />
                    
                    <ReferenceLine y={targetScore} stroke="#10b981" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 5"
                        label={{ value: `META ${targetScore}${unit}`, fill: '#10b981', fontSize: 10, fontWeight: 'black', position: 'insideBottomLeft', dy: -6, dx: 5 }} />
                    
                    <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        content={<ChartTooltip isCompare={true} chartData={filteredChartData} unit={unit} />} />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    
                    <Area type="monotoneX" dataKey="Banda Bayesiana" stroke="none" fill={`url(#${CC.bayBandGradient})`} legendType="none" connectNulls isAnimationActive={false} />
                    <Area type="monotoneX" dataKey="Futuro Provável" name="_shadow_projection" fill={`url(#${CC.projectionPurpleGradient})`} stroke="none" legendType="none" connectNulls isAnimationActive={false} />
                    
                    <Area type="monotoneX" dataKey="Futuro Provável" name="Ganho Estimado" fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeWidth={1} strokeOpacity={0.2} legendType="none" connectNulls isAnimationActive={false} baseValue={gainBase} />
                    <Area type="monotoneX" dataKey="Cenário Range" name="Intervalo de Confiança MC" fill={`url(#${CC.cloudGradient})`} stroke="none" legendType="none" />
                    
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={4}
                        strokeLinecap="round" strokeLinejoin="round"
                        fill={`url(#${CC.greenGradient})`} dot={{ r: 4, fill: '#34d399', stroke: '#0a0f1e', strokeWidth: 2 }}
                        activeDot={false} connectNulls style={{ filter: `url(#${CC.lineShadow})` }} isAnimationActive={true}>
                        <LabelList content={(props) => renderLabel(props, 'bay', '#34d399')} />
                    </Area>
                    
                    <Line type="monotoneX" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={3}
                        strokeLinecap="round" strokeLinejoin="round"
                        dot={{ r: 3.5, fill: '#fb923c', stroke: '#0a0f1e', strokeWidth: 2 }} activeDot={false} connectNulls strokeOpacity={1} isAnimationActive={true}>
                        <LabelList content={(props) => renderLabel(props, 'raw', '#fb923c')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls strokeOpacity={0.4} isAnimationActive={true}>
                        <LabelList content={(props) => renderLabel(props, 'stats', '#818cf8')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={3}
                        strokeLinecap="round" strokeDasharray="6 4"
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            if (index !== filteredChartData.length - 1) return null;
                            return (
                                <g>
                                    <circle cx={cx} cy={cy} r={5} fill="#a78bfa" stroke="#ffffff" strokeWidth={2} style={{ filter: `url(#${CC.glow})` }}>
                                        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx={cx} cy={cy} r={8} fill="#a78bfa" opacity="0.3">
                                        <animate attributeName="r" values="7;12;7" dur="2s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                </g>
                            );
                        }}
                        connectNulls strokeOpacity={1} style={{ filter: `url(#${CC.glow})` }} isAnimationActive={false}>
                        <LabelList content={(props) => renderLabel(props, 'mc', '#a78bfa')} />
                    </Line>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
