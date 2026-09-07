import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
   LabelList, Brush, ReferenceArea
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
        let debounceTimer = null;
        const obs = new ResizeObserver((entries) => {
            // FIX 4B: debounce de 100ms para evitar re-renders excessivos
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                for (const entry of entries) {
                    const h = entry.contentRect.height;
                    if (h > 50) setContainerHeight(h);
                }
            }, 100);
        });
        obs.observe(el);
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            obs.disconnect();
        };
    }, []);

    const CC = React.useMemo(() => ({
        projectionPurpleGradient: `cc_projPurple-${baseId}`,
        cloudGradient: `cc_cloud-${baseId}`,
        bayBandGradient: `cc_bayBand-${baseId}`,
        greenGradient: `cc_green-${baseId}`
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
    const safeMaxScore = Number(maxScore) > safeMinScore ? Number(maxScore) : safeMinScore + 1;
    
    const safeTargetScore = Math.max(
      safeMinScore,
      Math.min(
        safeMaxScore,
        Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMinScore
      )
    );
    
    const dangerLimit = Math.max(
      safeMinScore,
      safeTargetScore - ((safeMaxScore - safeMinScore) * 0.08)
    );

    const isValidValue = (value) => value != null && Number.isFinite(Number(value));

    const lastValidIdx = React.useMemo(() => {
      const last = { bay: -1, raw: -1, stats: -1, mc: -1 };
    
      for (let i = chartData.length - 1; i >= 0; i--) {
        const d = chartData[i];
    
        if (last.bay < 0 && isValidValue(d["Nível Bayesiano"])) last.bay = i;
        if (last.raw < 0 && isValidValue(d["Nota Bruta"])) last.raw = i;
        if (last.stats < 0 && isValidValue(d["Média Histórica"])) last.stats = i;
        if (last.mc < 0 && isValidValue(d["Futuro Provável"])) last.mc = i;
    
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
        // FIX 4A: garantir range mínimo de 1 para evitar divisão por zero
        const range = Math.max(1e-6, safeMaxScore - safeMinScore);
        const topLimit = safeMaxScore - (range * 0.02);
        const bottomLimit = safeMinScore + (range * 0.05);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);
        const MIN_PCT_DISTANCE = Math.max(0.001, range * 0.085);
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
      const hasObserved =
        isValidValue(curr["Nota Bruta"]) ||
        isValidValue(curr["Nível Bayesiano"]) ||
        isValidValue(curr["Média Histórica"]);
    
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
        if (value === null || value === undefined || !Number.isFinite(Number(value))) {
          return null;
        }
        
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

        let ptPos = Number.isFinite(Number(value)) ? Number(value) : safeMinScore;
        const isFuture = isFuturePoint && index === futureIdx;
        const pts = isFuture ? lastY : todayY;
        if (pts && pts.length) {
            const pt = pts.find(p => p.name === type);
            if (pt && pt.yPos != null && Number.isFinite(Number(pt.yPos))) ptPos = Number(pt.yPos);
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

        // Bug 7 FIX: Prefere viewBox.height (sempre preciso) ao invés de containerHeight que pode não estar medido no primeiro render
        const chartHeight = viewBox?.height ?? (containerHeight > 40 ? containerHeight - 40 : 320);
        const chartY = viewBox?.y ?? 20;
        const range = safeMaxScore - safeMinScore;
        const pxPerPct = chartHeight / (range || 1);
        
        // Compute Y strictly via our internal coordinate map (bypassing Recharts' `y` which bugs out on isolated dots)
        let rawY = chartY + chartHeight - (ptPos - safeMinScore) * pxPerPct - 10;
        if (!Number.isFinite(rawY)) rawY = chartY + chartHeight / 2;
        const safeY = Math.max(2, Math.min(chartY + chartHeight - 22, rawY));
        
        // BUG-5 FIX: Clamp label X to prevent overflow past chart right edge
        const maxX = (viewBox?.width ?? 700) + (viewBox?.x ?? 0);
        const labelX = Math.max(0, Math.min(x + xOff - 2, maxX - boxWidth - 4));
        
        return (
            <g>
                <rect x={labelX} y={safeY - 1} width={boxWidth} height={22} rx={8}
                      fill="#0b0f19" fillOpacity={0.92} stroke={color} strokeOpacity={0.9} strokeWidth={1.6} />
                <text x={labelX + boxWidth / 2} y={safeY + 14} fill="#ffffff" fontSize={10.5}
                      fontWeight="900" textAnchor="middle"
                      style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    {formatted}
                </text>
            </g>
        );    };



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
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDisplayDate}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                        dy={12} 
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                        tickLine={false} 
                        minTickGap={30} 
                    />
                    <YAxis 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                        dx={-8} 
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                        tickLine={false} 
                        domain={[safeMinScore, safeMaxScore]} 
                        allowDataOverflow={false} 
                        tickFormatter={(v) => `${formatValue(v)}${unit}`} 
                        width={50} 
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
                        fillOpacity={0.04}
                    />
                    
                    <ReferenceLine
                        y={safeTargetScore}
                        stroke="#10b981"
                        strokeOpacity={0.8}
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        label={{
                          value: `Meta: ${formatValue(safeTargetScore)}${unit}`,
                          fill: '#34d399',
                          fontSize: 10,
                          fontWeight: 'bold',
                          position: 'insideTopLeft',
                          dy: -8,
                          dx: 8
                        }}
                    />

                    {todayIdx >= 0 && isFuturePoint && chartData[todayIdx]?.date && (
                        <ReferenceLine
                            x={chartData[todayIdx].date}
                            stroke="#a78bfa"
                            strokeOpacity={0.65}
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                                value: '✦ Início Projeção MC',
                                fill: '#c4b5fd',
                                fontSize: 9,
                                fontWeight: 'bold',
                                position: 'insideTopRight',
                                dy: -8
                            }}
                        />
                    )}
                    
                    <Tooltip 
                        offset={30}
                        cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        content={(props) => <ChartTooltip {...props} chartData={chartData} isCompare={true} unit={unit} maxScore={safeMaxScore} minScore={safeMinScore} />} />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }} />
                    
                    <Area connectNulls type="monotoneX" dataKey="Banda Bayesiana" stroke="none" fill={`url(#${CC.bayBandGradient})`} legendType="none" tooltipType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="_shadow_projection" fill={`url(#${CC.projectionPurpleGradient})`} stroke="none" legendType="none" tooltipType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    <Area connectNulls type="monotoneX" dataKey="Cenário Range" stroke="none" fill={`url(#${CC.cloudGradient})`} legendType="none" tooltipType="none" isAnimationActive={false} />
                    
                    {/* Bottom Layer: Glow for Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={8} strokeOpacity={0.25} fill="none" activeDot={false} legendType="none" connectNulls isAnimationActive={false} />
                    {/* Top Layer: Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={3.5}
                        strokeLinecap="round" strokeLinejoin="round"
                        fill={`url(#${CC.greenGradient})`} dot={{ r: 3.5, fill: '#0f172a', stroke: '#34d399', strokeWidth: 2 }}
                        activeDot={<CustomActiveDot fill="#34d399" />} connectNulls isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'bay', '#34d399')} />
                    </Area>
                    
                    <Line connectNulls type="monotoneX" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={2.5}
                        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" 
                        dot={{ r: 3, fill: '#0f172a', stroke: '#fb923c', strokeWidth: 1.8 }} activeDot={<CustomActiveDot fill="#fb923c" />} strokeOpacity={1} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'raw', '#fb923c')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls strokeOpacity={0.5} activeDot={<CustomActiveDot fill="#818cf8" />} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'stats', '#818cf8')} />
                    </Line>
                    
                    <Line connectNulls type="monotoneX" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={3}
                        strokeLinecap="round" strokeDasharray="6 4"
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            if (index !== chartData.length - 1) return null;
                            return (
                                <g>
                                    <circle cx={cx} cy={cy} r={5} fill="#a78bfa" stroke="#ffffff" strokeWidth={2}>
                                        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx={cx} cy={cy} r={9} fill="#a78bfa" opacity="0.3">
                                        <animate attributeName="r" values="7;13;7" dur="2s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                </g>
                            );
                        }}
                        strokeOpacity={1} isAnimationActive={false}>
                        <LabelList content={(props) => renderLabel(props, 'mc', '#a78bfa')} />
                    </Line>

                    <Brush 
                        dataKey="date" 
                        height={26} 
                        stroke="#6366f1" 
                        fill="rgba(15, 23, 42, 0.85)" 
                        tickFormatter={formatDisplayDate}
                        travellerWidth={10}
                    />
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}

