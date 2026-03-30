import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function AnaliseRetencaoChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] border border-white/5 rounded-2xl bg-black/20">
                <p className="text-slate-500 text-sm font-medium italic">Dados insuficientes para análise de retenção.</p>
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="nomeTopico" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                    />
                    
                    {/* EIXO PRINCIPAL (Esquerda) - Para as Barras de Dias */}
                    <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false}
                        label={{ value: 'Dias sem Revisão', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    
                    {/* EIXO SECUNDÁRIO (Direita) - Para a Linha de Nível Crítico */}
                    <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#f87171" 
                        fontSize={10} 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false}
                        label={{ value: 'Nível Crítico (%)', angle: 90, position: 'insideRight', offset: 10, fill: '#f87171', fontSize: 10, fontWeight: 'bold' }}
                    />

                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ padding: '2px 0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />

                    <Bar 
                        yAxisId="left" 
                        dataKey="diasSemRevisao" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]} 
                        name="Dias sem Revisão" 
                        barSize={30}
                    />
                    
                    <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="nivelCritico" 
                        stroke="#ef4444" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#ef4444' }} 
                        name="Nível Crítico" 
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
