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

    // FIX: Altura dinâmica! Mínimo de 300px, mas cresce 45px por cada matéria extra
    const dynamicHeight = Math.max(300, sortedData.length * 45);

    return (
        <div style={{ height: `${dynamicHeight}px` }} className="w-full mt-4 transition-all duration-300">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={sortedData}
                    // Margem left aumentada para acomodar nomes grandes de matérias de Direito
                    margin={{ top: 5, right: 30, left: 130, bottom: 5 }} 
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    
                    <XAxis 
                        type="number" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        domain={[0, dataMax => Math.ceil(dataMax * 1.1)]} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(val) => `${Number(val).toFixed(0)}h`}
                    />
                    
                    <YAxis 
                        type="category" 
                        dataKey="disciplina" 
                        stroke="#f1f5f9" 
                        fontSize={11} 
                        axisLine={false} 
                        tickLine={false}
                        width={120} // Largura sincronizada com a margem left para não cortar nomes
                    />
                    
                    <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }} // Melhor UX: Dá um destaque na linha onde o mouse passa
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(value) => [`${Number(value).toFixed(1)} horas`, 'Total']}
                    />
                    
                    <Bar 
                        dataKey="horas" 
                        fill="#6366f1" 
                        radius={[0, 6, 6, 0]} // Arredondamento um pouco mais elegante
                        maxBarSize={20} // Evita que matérias únicas fiquem parecendo blocos gigantes
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
