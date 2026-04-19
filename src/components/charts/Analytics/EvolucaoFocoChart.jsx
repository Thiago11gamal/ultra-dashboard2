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
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
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
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                        minTickGap={20} // Evita que os textos do eixo X se sobreponham
                    />
                    
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        domain={[0, dataMax => Math.ceil(dataMax * 1.2)]} 
                        axisLine={false} 
                        tickLine={false}
                        dx={-5} // Afasta o texto levemente
                        width={40} // Define uma largura fixa para não dançar com números grandes
                        tickFormatter={(val) => `${Number(val).toFixed(0)}h`} // Garante números limpos
                    />
                    
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(value) => [`${Number(value).toFixed(1)} horas`, 'Estudo']}
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
