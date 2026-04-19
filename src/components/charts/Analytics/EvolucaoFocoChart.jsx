import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { normalizeDate } from '../../../utils/dateHelper';

export function EvolucaoFocoChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] border border-white/5 rounded-2xl bg-black/20">
                <p className="text-slate-500 text-sm font-medium italic">Dados insuficientes para análise de foco.</p>
            </div>
        );
    }

    // A ordenação manual de D/M gerava NaN e destruía a ordem cronológica que o mapper já trazia corretamente
    const sortedData = data;

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sortedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="data" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={8}
                    />
                    
                    {/* Eixo Y com folga dinâmica de 20% (multiplicador 1.2) */}
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        domain={[0, dataMax => Math.ceil(dataMax * 1.2)]} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(val) => `${val}h`}
                    />
                    
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(value) => [`${value} horas`, 'Estudo']}
                    />
                    
                    <Area 
                        type="monotoneX" 
                        dataKey="horasEstudadas" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorFoco)" 
                        name="Horas Estudadas"
                    />

                    <defs>
                        <linearGradient id="colorFoco" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
