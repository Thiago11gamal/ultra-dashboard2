import React, { useId } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";
import { Clock } from 'lucide-react';

export function TimeSpentChart({ subjectAggData, showOnlyFocus, focusCategory }) {
    const instanceId = useId().replace(/:/g, "");

    const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];

    const chartData = safeSubjectAggData
        .filter(d => d.questoes > 0 && d.timeSpent > 0)
        .map((d) => {
            const avgSeconds = Math.round(d.timeSpent / d.questoes);
            return { 
                ...d, 
                avgSeconds,
                avgFormatted: `${Math.floor(avgSeconds / 60)}m ${String(avgSeconds % 60).padStart(2, '0')}s`
            };
        })
        .sort((a, b) => b.avgSeconds - a.avgSeconds); // Slower subjects first
    
    if (chartData.length === 0) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30 w-full mt-2">
                <span className="text-5xl">⏳</span>
                <div className="text-center">
                    <p className="text-slate-300 font-bold text-base mb-1">Coletando Dados de Agilidade</p>
                    <p className="text-slate-500 text-sm max-w-sm px-4">
                        O sistema começou a registrar seus tempos hoje. Faça um <span className="text-cyan-400 font-bold">novo Simulado IA</span> para que seu gráfico de agilidade apareça aqui!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group w-full min-w-0 mt-6">
            <div className="flex items-center justify-between mb-3 sm:mb-5 min-w-0">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                        <Clock size={12} className="text-cyan-400" /> Agilidade
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">
                        ⏳ {showOnlyFocus ? `Tempo Médio por Questão — ${focusCategory?.name}` : "Tempo Médio por Matéria (Mais Lentas)"}
                    </h3>
                </div>
            </div>
 
            <div className="h-[300px] w-full overflow-x-auto custom-scrollbar pb-2">
                <div className="min-w-[500px] h-full" style={{ width: chartData.length > 5 ? `${chartData.length * 80}px` : '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 25, right: 10, left: -25, bottom: 25 }}
                            barSize={32}
                            barGap={2}
                        >
                            <defs>
                                <linearGradient id={`gradTime_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                dy={10}
                                angle={-25}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                                tickFormatter={(val) => `${Math.floor(val / 60)}m`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md">
                                                <p className="text-white font-bold text-sm mb-2">{d.fullName}</p>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                                                    <span className="text-slate-300 text-xs">Média:</span>
                                                    <span className="text-white font-bold text-xs">{d.avgFormatted}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-2">Baseado em {d.questoes} questões</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="avgSeconds" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#gradTime_${instanceId})`} />
                                ))}
                                <LabelList 
                                    dataKey="avgFormatted" 
                                    position="top" 
                                    fill="#94a3b8" 
                                    fontSize={10} 
                                    fontWeight={600}
                                    offset={8}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
