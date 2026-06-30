import React, { useId } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="glass p-3 rounded-xl border border-white/10 text-xs shadow-2xl">
                <div className="font-bold text-amber-300">{item.label} • {item.dateLabel}</div>
                <div className="text-white mt-1">
                    <span className="font-black text-lg tabular-nums">{item.count}</span> cartões a vencer
                </div>
                {item.isToday && <div className="text-[10px] text-orange-400 mt-0.5">Inclui vencidos + hoje</div>}
            </div>
        );
    }
    return null;
};

export default function DueForecastChart({ data = [], height = 260 }) {
    const instanceId = useId().replace(/:/g, "");
    const barId = `due_bar_${instanceId}`;

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[180px] border border-white/5 rounded-2xl bg-black/20 text-slate-500 text-sm" role="img" aria-label="Sem dados de previsão de cartões">
                Sem dados de previsão.
            </div>
        );
    }

    // Prepare recharts data
    const chartData = data.map((d, idx) => ({
        ...d,
        idx,
        value: d.count
    }));

    const hasAny = chartData.some(d => d.value > 0);

    return (
        <div style={{ height }} className="w-full -mx-1" role="img" aria-label="Gráfico de previsão de cartões a vencer por dia">
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                <BarChart data={chartData} margin={{ top: 12, right: 4, left: -4, bottom: 8 }} aria-hidden="true">
                    <defs>
                        <linearGradient id={barId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.65} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" vertical={false} />

                    <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b' }}
                    />

                    <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tickCount={4}
                        tick={{ fill: '#64748b' }}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />

                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={`url(#${barId})`} minPointSize={2}>
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.isToday ? '#f59e0b' : entry.isTomorrow ? '#fbbf24' : '#d97706'}
                                fillOpacity={entry.value === 0 ? 0.25 : 1}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {!hasAny && (
                <div className="text-center text-[10px] text-emerald-400 mt-1" aria-live="polite">
                    Nenhum cartão programado nos próximos dias — está tudo em dia!
                </div>
            )}
        </div>
    );
}
