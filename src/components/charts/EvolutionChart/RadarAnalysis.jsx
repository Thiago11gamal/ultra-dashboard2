import React, { useId } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from "recharts";
// 🎯 FIX: Importação adicionada
import { formatValue } from '../../../utils/scoreHelper';
import { ChartFrame } from "../ChartFrame";

/**
 * RadarAnalysis
 * 
 * A comprehensive disciplinary cross-section (Raio-X) using a Radar chart.
 * Compares current performance levels against target scores.
 */
export function RadarAnalysis({ radarData, maxScore = 100, minScore = 0, unit = '%' }) {
    const rawId = useId();
    const glowId = `ra_glow-${rawId.replace(/:/g, '')}`;

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 1;

    return (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all group flex flex-col justify-between h-full min-w-0">
            <div className="mb-2 sm:mb-4 relative group/tooltip">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Equilíbrio Geral</p>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Visão Multidimensional
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">🕸️ Raio-X das Disciplinas</h3>
                    <div className="relative flex items-center justify-center w-4 h-4 rounded-full border border-slate-600 text-slate-400 text-[9px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors" tabIndex={0} role="button" aria-label="Informação sobre o gráfico radar">
                        ?
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 sm:-translate-x-0 sm:left-0 w-[260px] p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible focus-within:opacity-100 focus-within:visible transition-all duration-300 z-50 pointer-events-none group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible text-left">
                            <p className="text-[11px] text-slate-200 font-normal leading-relaxed normal-case tracking-normal">
                                Este gráfico (Radar) avalia o seu <strong className="text-indigo-400">nível de acertos</strong> em cada matéria, revelando o seu equilíbrio. Quanto mais o desenho se expandir e formar um círculo perfeito, mais forte e constante está o seu conhecimento global.
                            </p>
                        </div>
                    </div>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                    Comparativo da proficiência real contra a meta estabelecida.
                </p>
            </div>

            <div className="flex-1 min-h-[260px] sm:min-h-[300px] w-full relative">
                <ChartFrame minHeight={260} label="Calibrando radar">
                    <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={1}>
                        <RadarChart cx="50%" cy="50%" outerRadius="50%" data={radarData} margin={{ top: 20, right: 35, bottom: 20, left: 35 }}>
                        <defs>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                            </filter>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={(props) => {
                                const { x, y, cx, cy, payload } = props;
                                const text = payload?.value || "";
                                const maxLen = 12;
                                const truncated = text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
                                return (
                                    <text x={x} y={y + (y > cy ? 5 : -5)} textAnchor={x > cx + 10 ? 'start' : x < cx - 10 ? 'end' : 'middle'} fill="#cbd5e1" fontSize={9} fontWeight={500}>
                                        <title>{text}</title>
                                        {truncated}
                                    </text>
                                );
                            }} 
                        />
                        
                        {/* FIX: Ocultar o tick do "0" central para manter o gráfico limpo */}
                        <PolarRadiusAxis 
                            angle={30} 
                            domain={[safeMin, safeMax]} 
                            tick={{ fill: '#475569', fontSize: 9 }} 
                            tickFormatter={(v) => v === safeMin ? '' : v} 
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

                        {/* Bottom Layer: Glow effect */}
                        <Radar 
                            name="_glow_Seu Nível" 
                            dataKey="nivel" 
                            stroke="#6366f1" 
                            strokeWidth={6} 
                            strokeOpacity={0.3}
                            fill="none" 
                            dot={false}
                            activeDot={false}
                            legendType="none"
                            tooltipType="none"
                        />
                        {/* Top Layer: Actual Performance Radar */}
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

                        {/* 🎯 FIX: Adição do formatValue e name dinâmico no formatter do Tooltip */}
                        <Tooltip 
                            formatter={(v, name) => [`${formatValue(v)}${unit}`, name?.replace('_glow', '') || 'Nível']} 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} 
                        />
                        <Legend 
                            payload={[
                                { value: 'Meta', type: 'line', id: 'meta', color: '#22c55e' },
                                { value: 'Seu Nível', type: 'line', id: 'nivel', color: '#6366f1' }
                            ]}
                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: '#64748b' }} 
                        />
                    </RadarChart>
                    </ResponsiveContainer>
                </ChartFrame>
            </div>
        </div>
    );
}

