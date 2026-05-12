import React, { useId } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
        <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                {/* Margens ajustadas para dar respiro aos valores numéricos (left/right) e ao texto inclinado (bottom) */}
                <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                    <defs>
                        <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                        </linearGradient>
                        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

                    <XAxis
                        dataKey="nomeTopico"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        angle={-45}
                        textAnchor="end"
                        padding={{ left: 15, right: 15 }}
                        tick={(props) => {
                            const { x, y, payload } = props;
                            const item = data[payload.index];
                            return (
                                <g transform={`translate(${x},${y})`}>
                                    <text
                                        x={0}
                                        y={0}
                                        dy={16}
                                        textAnchor="end"
                                        fill={item?.isTask ? "#94a3b8" : "#f1f5f9"}
                                        fontSize={item?.isTask ? 9 : 10}
                                        fontWeight={item?.isTask ? 400 : 700}
                                        transform="rotate(-45)"
                                    >
                                        {item?.isTask ? `• ${payload.value}` : payload.value}
                                    </text>
                                </g>
                            );
                        }}
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
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            fontSize: '11px',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ padding: '2px 0' }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        formatter={(value, name) => {
                            if (name === "Risco de Esquecimento") return [`${value}% (Risco)`, name];
                            return [value, name];
                        }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />

                    <Bar
                        yAxisId="left"
                        dataKey="diasSemRevisao"
                        fill={`url(#${barGradId})`}
                        radius={[6, 6, 0, 0]}
                        name="Dias sem Revisão"
                        // CORREÇÃO 4: maxBarSize permite que o gráfico seja responsivo em telas menores
                        maxBarSize={24}
                    />

                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="nivelCritico"
                        stroke="#ef4444"
                        strokeWidth={4}
                        dot={{ r: 5, fill: '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                        name="Risco de Esquecimento"
                        filter={`url(#${glowId})`}
                        animationDuration={1500}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
