import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList, Brush
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { normalizeDate, formatDisplayDate, formatDuration } from '../../../utils/dateHelper';
import { formatValue } from '../../../utils/scoreHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke } = props;
    if (cx == null || cy == null) return null;
    return (
        <g>
            {/* 🎯 FIX: Efeito de pulso animado via SVG para o Hover */}
            <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                <animate attributeName="r" values="6;16" dur="1.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
            </circle>
            <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
        </g>
    );
};

export function CompareChart({ 
    filteredChartData, 
    targetScore,
    // ✅ BUG-7 FIX: removida prop 'categories' que não era usada (causava re-renders desnecessários)
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const baseId = useId().replace(/:/g, '');
    const containerRef = React.useRef(null);
    const [containerHeight, setContainerHeight] = React.useState(360);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const obs = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const h = entry.contentRect.height;
                if (h > 50) setContainerHeight(h);
            }
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const CC = React.useMemo(() => ({
        projectionPurpleGradient: `cc_projPurple-${baseId}`,
        cloudGradient: `cc_cloud-${baseId}`,
        bayBandGradient: `cc_bayBand-${baseId}`,
        greenGradient: `cc_green-${baseId}`,
        lineShadow: `cc_lineShadow-${baseId}`,
        glow: `cc_glow-${baseId}`
    }), [baseId]);

    const chartData = React.useMemo(() => {
        if (!filteredChartData || !Array.isArray(filteredChartData)) return [];
        return [...filteredChartData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });
    }, [filteredChartData]);

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

        // ✅ LOTE-02 FIX: os 3 passes sequenciais podiam estourar o teto logo após
        // corrigir o chão. Relaxamento iterativo com re-cheque de limites.
        for (let iter = 0; iter < 15; iter++) {
            let moved = false;
            for (let i = 1; i < yPos.length; i++) {
                if (yPos[i - 1].yPos - yPos[i].yPos < effectiveDistance) {
                    const mid = (yPos[i - 1].yPos + yPos[i].yPos) / 2;
                    yPos[i - 1].yPos = mid + effectiveDistance / 2;
                    yPos[i].yPos = mid - effectiveDistance / 2;
                    moved = true;
                }
            }
            if (yPos[0].yPos > topLimit) {
                const shift = yPos[0].yPos - topLimit;
                yPos.forEach(p => p.yPos -= shift);
                moved = true;
            }
            if (yPos[yPos.length - 1].yPos < bottomLimit) {
                const shift = bottomLimit - yPos[yPos.length - 1].yPos;
                yPos.forEach(p => p.yPos += shift);
                moved = true;
            }
            if (!moved) break;
        }

        // Clamp final estrito para garantir que nenhum label saia dos limites
        for (let i = 0; i < yPos.length; i++) {
            yPos[i].yPos = Math.max(bottomLimit, Math.min(topLimit, yPos[i].yPos));
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
        if (d["Nível Bayesiano"] != null && lastValidIdx.bay === todayIdx) todayPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null && lastValidIdx.raw === todayIdx) todayPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null && lastValidIdx.stats === todayIdx) todayPoints.push({ name: 'stats', value: d["Média Histórica"] });
        if (d["Futuro Provável"] != null && lastValidIdx.mc === todayIdx) todayPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const todayY = solveCollisions(todayPoints);

    const futureIdx = chartData.length - 1;
    const isFuturePoint = futureIdx > todayIdx;
    const lastPoints = [];
    if (isFuturePoint && futureIdx >= 0) {
        const d = chartData[futureIdx];
        if (d["Futuro Provável"] != null && lastValidIdx.mc === futureIdx) lastPoints.push({ name: 'mc', value: d["Futuro Provável"] });
        if (d["Nível Bayesiano"] != null && lastValidIdx.bay === futureIdx) lastPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null && lastValidIdx.raw === futureIdx) lastPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null && lastValidIdx.stats === futureIdx) lastPoints.push({ name: 'stats', value: d["Média Histórica"] });
    }
    const lastY = solveCollisions(lastPoints);



    const renderLabel = (props, type, color) => {
        const { x, index, value, viewBox } = props;
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

        let ptPos = value;
        const isFuture = isFuturePoint && index === futureIdx;
        const pts = isFuture ? lastY : todayY;
        if (pts && pts.length) {
            const pt = pts.find(p => p.name === type);
            if (pt && pt.yPos != null) ptPos = pt.yPos;
        }

        const xOff = isMc ? 12 : 10;
        let formatted;
        if (unit === 'horas') {
            formatted = formatDuration(Number.isFinite(Number(value)) ? Number(value) : 0);
        } else {
            const rounded = Number((Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2));
            formatted = `${rounded}${unit}`;
        }
        const boxWidth = Math.max(42, formatted.length * 7 + 14);

        const chartHeight = viewBox?.height ?? (containerHeight > 40 ? containerHeight - 40 : 360);
        const chartY = viewBox?.y ?? 20;
        const range = safeMaxScore - safeMinScore;
        const pxPerPct = chartHeight / (range || 1);
        
        // Compute Y strictly via our internal coordinate map (bypassing Recharts' `y` which bugs out on isolated dots)
        const rawY = chartY + chartHeight - (ptPos - safeMinScore) * pxPerPct - 10;
        const safeY = Math.max(2, Math.min(chartY + chartHeight - 22, rawY));
        
        // BUG-5 FIX: Clamp label X to prevent overflow past chart right edge
        const maxX = (viewBox?.width ?? 700) + (viewBox?.x ?? 0);
        const labelX = Math.min(x + xOff - 2, maxX - boxWidth - 4);
        
        return (
            <g>
                <rect x={labelX} y={safeY} width={boxWidth} height={20} rx={10}
                      fill={color} fillOpacity={0.15} stroke={color} strokeOpacity={0.4} />
                <text x={labelX + boxWidth / 2} y={safeY + 14} fill={color} fontSize={11}
                      fontWeight="black" textAnchor="middle"
                      style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
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
            gainBase = Math.max(safeMinScore, Math.min(safeMaxScore, Number(baseCandidate)));
            // BUG-3 FIX: Não exibir área verde de "ganho" se a projeção final está ABAIXO do nível atual
            const lastPt = chartData[chartData.length - 1];
            const lastProjection = lastPt?.["Futuro Provável"];
            if (Number.isFinite(Number(lastProjection)) && Number(lastProjection) < gainBase) {
                showGainArea = false;
            }
        }
    }

    const animateSeries = false;

    return (
        <div ref={containerRef} className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            <ChartFrame minHeight={360} label="Comparando evolução">
                <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0" minWidth={1}>
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
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                        <filter id={CC.glow} x="-20%" y="-20%" width="140%" height="140%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDisplayDate}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                        dy={12} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={35} 
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dx={-8} axisLine={false} tickLine={false} domain={[safeMinScore, safeMaxScore]} allowDataOverflow={false} tickFormatter={(v) => `${formatValue(v)}${unit}`} width={50} />
                    
                    <ReferenceLine y={targetScore} stroke="#10b981" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 5"
                        label={{ value: `META ${formatValue(targetScore)}${unit}`, fill: '#10b981', fontSize: 10, fontWeight: 'black', position: 'insideTopLeft', dy: -6, dx: 5 }} />
                    
                    <Tooltip 
                        offset={30}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        content={(props) => <ChartTooltip {...props} chartData={chartData} isCompare={true} unit={unit} maxScore={safeMaxScore} minScore={safeMinScore} />} />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    
                    <Area connectNulls type="monotoneX" dataKey="Banda Bayesiana" stroke="none" fill={`url(#${CC.bayBandGradient})`} legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="_shadow_projection" fill={`url(#${CC.projectionPurpleGradient})`} stroke="none" legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    {showGainArea && <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="Ganho Estimado" fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeWidth={1} strokeOpacity={0.2} legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" baseValue={gainBase} />}
                    <Area type="monotoneX" dataKey="Cenário Range" name="Intervalo de Confiança MC" fill={`url(#${CC.cloudGradient})`} stroke="none" legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    {/* Bottom Layer: Glow for Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={8} strokeOpacity={0.25} fill="none" activeDot={false} legendType="none" connectNulls isAnimationActive={false} />
                    {/* Top Layer: Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={4}
                        strokeLinecap="round" strokeLinejoin="round"
                        fill={`url(#${CC.greenGradient})`} dot={{ r: 3, fill: '#0f172a', stroke: '#34d399', strokeWidth: 1.5 }}
                        activeDot={<CustomActiveDot fill="#34d399" />} connectNulls isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
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
                        tickFormatter={formatDisplayDate}
                    />
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}
