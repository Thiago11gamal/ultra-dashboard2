import React, { useId } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from "recharts";
// 🎯 FIX: Importação adicionada
import { formatValue } from '../../../utils/scoreHelper';

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

/**
 * RadarAnalysis
 * 
 * A comprehensive disciplinary cross-section (Raio-X) using a Radar chart.
 * Compares current performance levels against target scores.
 */
export function RadarAnalysis({ radarData, maxScore = 100, unit = '%' }) {
    const rawId = useId();
    const glowId = `ra_glow-${rawId.replace(/:/g, '')}`;

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-lg hover:border-slate-700 transition-all group flex flex-col h-full">
            <div className="mb-2 sm:mb-4">
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Equilíbrio Geral</p>
                <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">🕸️ Raio-X das Disciplinas</h3>
            </div>

            <div className="flex-1 min-h-[260px] sm:min-h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                    <RadarChart cx="50%" cy="50%" outerRadius="55%" data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <defs>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="glow" />
                                <feMerge>
                                    <feMergeNode in="glow" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 500 }} />
                        
                        {/* FIX: Ocultar o tick do "0" central para manter o gráfico limpo */}
                        <PolarRadiusAxis 
                            angle={30} 
                            domain={[0, maxScore]} 
                            tick={{ fill: '#475569', fontSize: 9 }} 
                            tickFormatter={(v) => v === 0 ? '' : v} 
                            axisLine={false} 
                        />

                        {/* Reference Line / Target Radar */}
                        <Radar 
                            name="Meta" 
                            dataKey="meta" 
                            stroke="#22c55e" 
                            strokeDasharray="3 3" 
                            strokeOpacity={0.6} 
                            fill="none" 
                            dot={{ r: 2, fill: '#166534', stroke: '#22c55e', strokeWidth: 1 }} 
                        />

                        {/* Actual Performance Radar */}
                        <Radar 
                            name="Seu Nível" 
                            dataKey="nivel" 
                            stroke="#6366f1" 
                            strokeWidth={2.5} 
                            fill="#6366f1" 
                            fillOpacity={0.22} 
                            dot={{ r: 2.5, fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2 }} 
                            activeDot={{ r: 4, fill: '#fff' }} 
                        />

                        {/* 🎯 FIX: Adição do formatValue no formatter do Tooltip */}
                        <Tooltip 
                            formatter={(v) => [`${formatValue(v)}${unit}`, 'Nível']} 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: '#64748b' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
