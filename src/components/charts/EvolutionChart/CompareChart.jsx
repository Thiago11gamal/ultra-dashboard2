import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList, Brush
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke } = props;
    if (!cx || !cy) return null;
    return (
        <g>
            {/* 🎯 FIX: Efeito de pulso animado via SVG para o Hover */}
            <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                <animate attributeName="r" from="6" to="16" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
        </g>
    );
};

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

    const chartData = React.useMemo(() => Array.isArray(filteredChartData) ? filteredChartData : [], [filteredChartData]);

    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMinScore
        ? Number(maxScore)
        : Math.max(100, safeMinScore + 1);

    const lastValidIdx = React.useMemo(() => {
        const last = { bay: -1, raw: -1, stats: -1, mc: -1 };
        for (let i = chartData.length - 1; i >= 0; i--) {
            const d = chartData[i];
            if (last.bay < 0 && d["Nível Bayesiano"] != null) last.bay = i;
            if (last.raw < 0 && d["Nota Bruta"] != null) last.raw = i;
            if (last.stats < 0 && d["Média Histórica"] != null) last.stats = i;
            if (last.mc < 0 && d["Futuro Provável"] != null) last.mc = i;
            if (last.bay >= 0 && last.raw >= 0 && last.stats >= 0 && last.mc >= 0) break;
        }
        return last;
    }, [chartData]);

    // 🎯 FIX: Algoritmo de Colisão Adaptativo baseado no Range Real
    const solveCollisions = (points) => {
        if (!points.length) return [];
        const sorted = [...points].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
        const yPos = sorted.map(p => ({
            ...p,
            yPos: Number.isFinite(Number(p.value)) ? Number(p.value) : safeMinScore
        }));
        
        const range = safeMaxScore - safeMinScore;
        const topLimit = safeMaxScore - (range * 0.02);
        const bottomLimit = safeMinScore + (range * 0.05);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);

        const MIN_PCT_DISTANCE = range * 0.085; // 8.5% do escopo visual
        const requiredSpace = (yPos.length - 1) * MIN_PCT_DISTANCE;

        const effectiveDistance = requiredSpace > safeSpace 
            ? safeSpace / Math.max(1, yPos.length - 1) 
            : MIN_PCT_DISTANCE;

        // Pass 1: Espaçamento de cima para baixo
        for (let i = 1; i < yPos.length; i++) {
            if (yPos[i - 1].yPos - yPos[i].yPos < effectiveDistance) {
                yPos[i].yPos = yPos[i - 1].yPos - effectiveDistance;
            }
        }

        // Pass 2: Chão - Recupera caso tenha vazado pelo fundo
        if (yPos.length > 0 && yPos[yPos.length - 1].yPos < bottomLimit) {
            const shift = bottomLimit - yPos[yPos.length - 1].yPos;
            yPos.forEach(p => p.yPos += shift);
        }

        // Pass 3: Teto - Previne estourar o gráfico pra cima e cortar label
        if (yPos.length > 0 && yPos[0].yPos > topLimit) {
            const shift = yPos[0].yPos - topLimit;
            yPos.forEach(p => p.yPos -= shift);
        }

        return yPos;
    };

    const todayIdx = chartData.reduce((acc, curr, i) => {
        const hasObserved = curr["Nota Bruta"] != null || curr["Nível Bayesiano"] != null || curr["Média Histórica"] != null;
        return hasObserved ? i : acc;
    }, -1);
    
    const todayPoints = [];
    if (todayIdx >= 0) {
        const d = chartData[todayIdx];
        if (d["Nível Bayesiano"] != null) todayPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null) todayPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null) todayPoints.push({ name: 'stats', value: d["Média Histórica"] });
        if (d["Futuro Provável"] != null) todayPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const todayY = solveCollisions(todayPoints);

    const futureIdx = chartData.length - 1;
    const isFuturePoint = futureIdx > todayIdx;
    const lastPoints = [];
    if (isFuturePoint && futureIdx >= 0) {
        const d = chartData[futureIdx];
        if (d["Futuro Provável"] != null) lastPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const lastY = solveCollisions(lastPoints);

    const getOffset = (name, value, index, viewBox) => {
        const isFuture = isFuturePoint && index === futureIdx;
        const pts = isFuture ? lastY : todayY;
        if (!pts || !pts.length) return 0;
        const pt = pts.find(p => p.name === name);
        if (!pt) return 0;
        const range = safeMaxScore - safeMinScore;
        const pxPerPct = viewBox?.height != null && viewBox.height > 0 ? viewBox.height / (range || 1) : 4.6;
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
        const formatted = (Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2) + unit;
        return (
            <g>
                <rect
                    x={x + xOff - 2}
                    y={y - 10 + offset}
                    width={42}
                    height={20}
                    rx={10}
                    fill={color}
                    fillOpacity={0.15}
                    stroke={color}
                    strokeOpacity={0.4}
                />
                <text 
                    x={x + xOff + 19} 
                    y={y + 4 + offset} 
                    fill={color} 
                    fontSize={11} 
                    fontWeight="black" 
                    textAnchor="middle"
                    style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
                >
                    {formatted}
                </text>
            </g>
        );    };

    let gainBase = 'dataMin';
    let showGainArea = true;
    if (todayIdx >= 0) {
        const todayPt = chartData[todayIdx];
        const baseCandidate = todayPt["Nível Bayesiano"] != null ? todayPt["Nível Bayesiano"] : todayPt["Nota Bruta"];
        if (Number.isFinite(Number(baseCandidate))) {
            gainBase = Number(baseCandidate);
            // BUG-3 FIX: Não exibir área verde de "ganho" se a projeção final está ABAIXO do nível atual
            const lastPt = filteredChartData[chartData.length - 1];
            const lastProjection = lastPt?.["Futuro Provável"];
            if (Number.isFinite(Number(lastProjection)) && Number(lastProjection) < gainBase) {
                showGainArea = false;
            }
        }
    }

    const animateSeries = chartData.length <= 90;

    return (
        <div className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0">
                {/* 🎯 FIX: right: 85 impede que as Labels cortem a borda direita na renderização do MC */}
                <ComposedChart data={chartData} syncId="evolutionSync" margin={{ top: 20, right: 85, left: 0, bottom: 20 }} style={{ outline: 'none' }} tabIndex="-1">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => {
                            if (!val) return '';
                            const parts = String(val).split('-');
                            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                        }}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                        dy={12} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={35} 
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dx={-8} axisLine={false} tickLine={false} domain={[safeMinScore, safeMaxScore]} allowDataOverflow={true} tickFormatter={(v) => `${v}${unit}`} width={50} />
                    
                    <ReferenceLine y={targetScore} stroke="#10b981" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 5"
                        label={{ value: `META ${targetScore}${unit}`, fill: '#10b981', fontSize: 10, fontWeight: 'black', position: 'insideBottomLeft', dy: -6, dx: 5 }} />
                    
                    <Tooltip 
                        offset={30}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        content={(props) => <ChartTooltip {...props} chartData={filteredChartData} isCompare={true} unit={unit} />} />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    
                    <Area connectNulls type="monotoneX" dataKey="Banda Bayesiana" stroke="none" fill={`url(#${CC.bayBandGradient})`} legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="_shadow_projection" fill={`url(#${CC.projectionPurpleGradient})`} stroke="none" legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    {showGainArea && <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="Ganho Estimado" fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeWidth={1} strokeOpacity={0.2} legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" baseValue={gainBase} />}
                    <Area type="monotoneX" dataKey="Cenário Range" name="Intervalo de Confiança MC" fill={`url(#${CC.cloudGradient})`} stroke="none" legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={4}
                        strokeLinecap="round" strokeLinejoin="round"
                        fill={`url(#${CC.greenGradient})`} dot={{ r: 3, fill: '#0f172a', stroke: '#34d399', strokeWidth: 1.5 }}
                        activeDot={<CustomActiveDot fill="#34d399" />} connectNulls style={{ filter: `url(#${CC.lineShadow})` }} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'bay', '#34d399')} />
                    </Area>
                    
                    <Line connectNulls type="monotoneX" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={3}
                        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" 
                        dot={{ r: 3, fill: '#0f172a', stroke: '#fb923c', strokeWidth: 1.5 }} activeDot={<CustomActiveDot fill="#fb923c" />} strokeOpacity={1} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'raw', '#fb923c')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls strokeOpacity={0.4} activeDot={<CustomActiveDot fill="#818cf8" />} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'stats', '#818cf8')} />
                    </Line>
                    
                    <Line connectNulls type="monotoneX" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={3}
                        strokeLinecap="round" strokeDasharray="6 4"
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            if (index !== chartData.length - 1) return null;
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
                        strokeOpacity={1} style={{ filter: `url(#${CC.glow})` }} isAnimationActive={false}>
                        <LabelList content={(props) => renderLabel(props, 'mc', '#a78bfa')} />
                    </Line>

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
