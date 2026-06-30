import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatDuration } from '../../../utils/dateHelper';

const COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'];

export function HorasDisciplinaChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] border border-white/5 rounded-2xl bg-black/20">
                <p className="text-slate-500 text-sm font-medium italic">Dados insuficientes para análise por matéria.</p>
            </div>
        );
    }

    // Sort by hours descending
    const sortedData = [...data].sort((a, b) => b.horas - a.horas);

    // FIX: Altura base de 300px (para o eixo X ficar sempre no fundo alinhado ao outro gráfico), 
    // mas se tiver muitas matérias, cresce proporcionalmente para não amassar as barras.
    const minChartHeight = Math.max(300, sortedData.length * 45);

    return (
        <div className="h-full w-full mt-2 pb-2 transition-all duration-300" style={{ minHeight: `${minChartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={minChartHeight - 50} minWidth={1}>
                <BarChart
                    layout="vertical"
                    data={sortedData}
                    margin={{ top: 25, right: 15, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />

                    <XAxis
                        type="number"
                        stroke="#94a3b8"
                        fontSize={10}
                        domain={[0, dataMax => Math.max(1, Math.ceil(dataMax * 1.1))]}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => formatDuration(val)}
                    />

                    <YAxis
                        type="category"
                        dataKey="disciplina"
                        stroke="#f1f5f9"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                        tick={{ fill: '#e2e8f0', fontSize: 9, fontWeight: 600 }}
                    />

                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(value) => [formatDuration(value), 'Total']}
                    />

                    <Bar
                        dataKey="horas"
                        fill="#6366f1"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={24}
                        name="Horas"
                    >
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
