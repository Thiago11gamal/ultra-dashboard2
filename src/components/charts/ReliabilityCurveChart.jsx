import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target } from 'lucide-react';
import { ChartFrame } from './ChartFrame';

// FIX: conversão segura para percentual inteiro (nunca NaN)
const toPercentInt = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const result = Math.round(n * 100);
    return Number.isFinite(result) ? Math.max(0, Math.min(100, result)) : fallback;
};

/**
 * CustomTooltip for ReliabilityCurveChart
 */
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0]?.payload;
        if (!dataPoint) return null;
        // FIX: gap inválido não vira "NaN%" no tooltip
        const safeGap = Number.isFinite(dataPoint.gap) ? Math.abs(dataPoint.gap) : 0;
        const isNeutralGap = safeGap < 1e-4;
        const isOverconfident = !isNeutralGap && dataPoint.pred > dataPoint.obs;
        return (
            <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl min-w-[160px]">
                <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                    <Target size={14} className="text-cyan-400" />
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Confiança {toPercentInt(dataPoint.pred)}%
                    </span>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-4 text-[11px]">
                        <span className="text-slate-500 font-bold">Previsão:</span>
                        <span className="font-mono text-cyan-400 font-bold">{toPercentInt(dataPoint.pred)}%</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-[11px]">
                        <span className="text-slate-500 font-bold">Observado:</span>
                        <span className="font-mono text-emerald-400 font-bold">{toPercentInt(dataPoint.obs)}%</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-[11px] pt-1 mt-1 border-t border-white/5">
                        <span className="text-slate-500 font-bold">Gap/Viés:</span>
                        <span className={`font-mono font-black ${isNeutralGap ? 'text-slate-400' : isOverconfident ? 'text-amber-400' : 'text-indigo-400'}`}>
                            {isNeutralGap ? '' : isOverconfident ? '-' : '+'}{(safeGap * 100).toFixed(1)}%
                        </span>
                    </div>
                    {/* FIX: n nulo/vazio protegido */}
                    <div className="text-[9px] text-slate-600 font-mono mt-2 text-right">
                        n={Number.isFinite(Number(dataPoint.count)) ? dataPoint.count : 0}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

/**
 * Gráfico de Confiabilidade (Reliability Diagram)
 * Eixo X: Probabilidade Prevista
 * Eixo Y: Taxa de Acerto Observada
 */
const ReliabilityCurveChart = ({ buckets }) => {
    const chartData = useMemo(() => {
        if (!buckets || !Array.isArray(buckets) || buckets.length === 0) return [];
        return buckets
            .filter(b => {
                const count = b?.count != null && b?.count !== '' ? Number(b.count) : 0;
                const hasPred = b?.meanPred !== null && b?.meanPred !== undefined && b?.meanPred !== '' && Number.isFinite(Number(b.meanPred));
                const hasObs = b?.observedRate !== null && b?.observedRate !== undefined && b?.observedRate !== '' && Number.isFinite(Number(b.observedRate));
                return count > 0 && hasPred && hasObs;
            })
            .map(b => ({
                pred: Number(b.meanPred),
                obs: Number(b.observedRate),
                gap: b?.gap !== null && b?.gap !== undefined && b?.gap !== '' && Number.isFinite(Number(b.gap))
                    ? Number(b.gap)
                    : Math.abs(Number(b.meanPred) - Number(b.observedRate)),
                count: Math.max(0, Math.round(Number(b.count)))
            }))
            .sort((a, b) => a.pred - b.pred);
    }, [buckets]);

    if (chartData.length === 0) {
        return (
            <div className="w-full h-48 sm:h-56 flex items-center justify-center bg-slate-900/20 border border-white/5 rounded-2xl">
                <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
                    Sem dados de calibração suficientes
                </p>
            </div>
        );
    }

    return (
        <div
            role="img"
            aria-label="Curva de confiabilidade comparando previsão do motor com taxa real de acerto"
            className="w-full h-48 sm:h-56"
        >
            <ChartFrame minHeight={192} label="Curva de Confiabilidade">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="pred"
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(val) => `${Math.round(val * 100)}%`}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        minTickGap={20}
                    />
                    <YAxis
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(val) => `${Math.round(val * 100)}%`}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    {/* Linha de Calibração Perfeita (y = x) */}
                    <ReferenceLine
                        segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                        stroke="rgba(255,255,255,0.15)"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                    />
                    {/* Curva de Calibração Real */}
                    <Line
                        type="monotone"
                        dataKey="obs"
                        stroke="#2dd4bf" /* cyan-400 */
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0a0c14', stroke: '#2dd4bf', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#2dd4bf', stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={1000}
                    />
                </LineChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
};

export default React.memo(ReliabilityCurveChart);

