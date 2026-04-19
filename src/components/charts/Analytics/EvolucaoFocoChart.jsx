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
                {/* Adicionei margin left: -15 para o eixo Y não usar espaço inútil, e right: 10 para não cortar a última data */}
                <AreaChart data={data} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                    {/* ORGANIZAÇÃO: defs sempre no topo do gráfico */}
                    <defs>
                        <linearGradient id="colorFoco" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    
                    <XAxis 
                        dataKey="data" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                        minTickGap={25} 
                    />
                    
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        domain={[0, dataMax => Math.ceil(dataMax * 1.15)]} // Margem superior levemente menor (15%)
                        axisLine={false} 
                        tickLine={false}
                        dx={-5} 
                        width={45} 
                        tickFormatter={(val) => `${val}h`} 
                    />
                    
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', fontSize: '13px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value) => [`${Number(value).toFixed(1)} horas`, 'Tempo Estudado']}
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
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
