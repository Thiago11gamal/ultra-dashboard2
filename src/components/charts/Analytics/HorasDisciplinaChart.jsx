import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

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

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={sortedData}
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    
                    {/* Eixo X com folga dinâmica de 10% (multiplicador 1.1) */}
                    <XAxis 
                        type="number" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        domain={[0, dataMax => Math.ceil(dataMax * 1.1)]} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(val) => `${val}h`}
                    />
                    
                    <YAxis 
                        type="category" 
                        dataKey="disciplina" 
                        stroke="#f1f5f9" 
                        fontSize={11} 
                        axisLine={false} 
                        tickLine={false}
                        width={90}
                    />
                    
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(value) => [`${value} horas`, 'Total']}
                    />
                    
                    <Bar 
                        dataKey="horas" 
                        fill="#6366f1" 
                        radius={[0, 4, 4, 0]} 
                        barSize={18}
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
