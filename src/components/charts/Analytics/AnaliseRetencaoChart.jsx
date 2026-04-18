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
        <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
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
                    />
                    
                    <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false}
                        label={{ value: 'Dias sem Revisão', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    
                    <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#f87171" 
                        fontSize={10} 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false}
                        label={{ value: 'Risco de Esquecimento (%)', angle: 90, position: 'insideRight', offset: 10, fill: '#f87171', fontSize: 10, fontWeight: 'bold' }}
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
                        fill="url(#barGradient)" 
                        radius={[6, 6, 0, 0]} 
                        name="Dias sem Revisão" 
                        barSize={24}
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
                        filter="url(#glow)"
                        animationDuration={1500}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
