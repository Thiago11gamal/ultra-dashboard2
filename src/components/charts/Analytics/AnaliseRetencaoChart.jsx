import React, { useId } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function RetentionXTick({ x, y, payload }) {
    const label = String(payload?.value ?? '');
    const short = label.length > 20 ? `${label.slice(0, 19)}…` : label;

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                dy={14}
                textAnchor="end"
                fill="#94a3b8"
                fontSize={10}
                transform="rotate(-35)"
            >
                {short}
            </text>
        </g>
    );
}

export function AnaliseRetencaoChart({ data }) {
    const instanceId = useId().replace(/:/g, "");
    const barGradId = `ret_barGrad_${instanceId}`;
    const glowId = `ret_glow_${instanceId}`;

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] border border-white/5 rounded-2xl bg-black/20">
                <p className="text-slate-500 text-sm font-medium italic">Dados insuficientes para análise de retenção.</p>
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                {/* Margens ajustadas para dar respiro aos valores numéricos (left/right) e ao texto inclinado (bottom) */}
                <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 120 }}>
                    <defs>
                        <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                        </linearGradient>
                        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

                    <XAxis
                        dataKey="nomeTopico"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        padding={{ left: 15, right: 15 }}
                        height={90}
                        tick={<RetentionXTick />}
                    />

                    {/* CORREÇÃO 2: Labels removidos para evitar poluição visual (a legenda já faz este papel) */}
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#94a3b8"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        dx={-5} // Afasta os números levemente do gráfico
                        domain={[0, dataMax => Math.max(1, dataMax)]}
                    />

                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#f87171"
                        fontSize={10}
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        dx={5} // Afasta os números levemente do gráfico
                    />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            color: '#e2e8f0'
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value, name) => {
                            if (name === 'Dias sem Revisão') {
                                return [`${value} dia(s)`, name];
                            }

                            return [`${value}%`, name];
                        }}
                    />

                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />

                    <Bar
                        yAxisId="left"
                        dataKey="diasSemRevisao"
                        fill={`url(#${barGradId})`}
                        radius={[6, 6, 0, 0]}
                        name="Dias sem Revisão"
                        maxBarSize={24}
                    />

                    {/* Bottom Layer: Glow effect */}
                    <Line connectNulls
                        yAxisId="right"
                        type="monotone"
                        dataKey="nivelCritico"
                        name="Risco_glow"
                        stroke="#ef4444"
                        strokeWidth={8}
                        strokeOpacity={0.3}
                        dot={false}
                        activeDot={false}
                        animationDuration={1500}
                        legendType="none"
                        tooltipType="none"
                    />
                    {/* Top Layer: Main Line */}
                    <Line connectNulls
                        yAxisId="right"
                        type="monotone"
                        dataKey="nivelCritico"
                        stroke="#ef4444"
                        strokeWidth={4}
                        dot={{ r: 5, fill: '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                        name="Risco de Esquecimento"
                        animationDuration={1500}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

