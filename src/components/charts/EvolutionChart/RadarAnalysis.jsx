import React, { useId } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from "recharts";

const CustomTooltipStyle = {
    backgroundColor: '#0a0f1e',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

export function RadarAnalysis({ radarData }) {
    const rawId = useId();
    const glowId = `ra_glow-${rawId.replace(/:/g, '')}`;

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group">
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Equilíbrio Geral</p>
            <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-2 sm:mb-4 truncate">🕸️ Raio-X das Disciplinas</h3>
            <div className="h-[240px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                        <defs>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="2.5" result="glow" />
                                <feMerge>
                                    <feMergeNode in="glow" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} />
                        <Radar name="Meta" dataKey="meta" stroke="#22c55e" strokeOpacity={0.5} fill="none" dot={{ r: 2, fill: '#ffffff', stroke: '#22c55e', strokeWidth: 1 }} />
                        <Radar name="Seu Nível" dataKey="nivel" stroke="#818cf8" strokeWidth={2} fill="#818cf8" fillOpacity={0.2} dot={{ r: 3, fill: '#ffffff', stroke: '#818cf8', strokeWidth: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} style={{ filter: `url(#${glowId})` }} />
                        <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
