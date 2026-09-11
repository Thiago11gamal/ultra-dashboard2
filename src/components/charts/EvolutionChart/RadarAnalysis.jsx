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
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 1;

    const instanceId = useId().replace(/:/g, '');
    const radarGradId = `radar_grad_${instanceId}`;

    return (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all group flex flex-col justify-between h-full min-w-0">
            <div className="mb-2 sm:mb-3 relative group/tooltip">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Equilíbrio Geral</span>
                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Visão Multidimensional
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-slate-200 flex items-center gap-1.5 tracking-tight">
                        🕸️ Raio-X das Disciplinas
                    </h4>
                    <div className="relative flex items-center justify-center w-4 h-4 rounded-full border border-slate-600 text-slate-400 text-[9px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors" tabIndex={0} role="button" aria-label="Informação sobre o gráfico radar">
                        ?
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 sm:-translate-x-0 sm:left-0 w-[260px] p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible focus-within:opacity-100 focus-within:visible transition-all duration-300 z-50 pointer-events-none group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible text-left">
                            <p className="text-[11px] text-slate-200 font-normal leading-relaxed normal-case tracking-normal">
                                Este gráfico avalia seu <strong className="text-indigo-400">nível de acertos</strong> em cada matéria, mostrando o equilíbrio do aprendizado. Quanto mais expandida for a teia, mais próximo da meta você está.
                            </p>
                        </div>
                    </div>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                    Comparativo da proficiência real contra a meta estabelecida para a prova.
                </p>
            </div>

            <div className="flex-1 min-h-[290px] sm:min-h-[340px] w-full relative">
                <ChartFrame minHeight={290} label="Calibrando radar">
                    <ResponsiveContainer width="100%" height="100%" minHeight={290} minWidth={1}>
                        <RadarChart cx="50%" cy="50%" outerRadius="66%" data={radarData} margin={{ top: 20, right: 35, bottom: 20, left: 35 }}>
                        <defs>
                            <radialGradient id={radarGradId} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45} />
                                <stop offset="80%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.08} />
                            </radialGradient>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={(props) => {
                                const { x, y, cx, cy, payload } = props;
                                const text = payload?.value || "";
                                const maxLen = 28;
                                const anchor = x > cx + 10 ? 'start' : x < cx - 10 ? 'end' : 'middle';
                                const dy = y > cy ? 6 : -6;
                                
                                if (text.length > 13) {
                                    const mid = text.lastIndexOf(' ', Math.ceil(text.length / 2));
                                    const splitIdx = mid > 2 ? mid : Math.ceil(text.length / 2);
                                    const line1 = text.substring(0, splitIdx).trim();
                                    const line2raw = text.substring(splitIdx).trim();
                                    const line2 = line2raw.length > maxLen - splitIdx ? line2raw.substring(0, maxLen - splitIdx - 1) + '..' : line2raw;
                                    return (
                                        <text x={x} y={y + dy} textAnchor={anchor} fill="#cbd5e1" fontSize={9} fontWeight={600}>
                                            <title>{text}</title>
                                            <tspan x={x} dy="0">{line1}</tspan>
                                            <tspan x={x} dy="11">{line2}</tspan>
                                        </text>
                                    );
                                }
                                const truncated = text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
                                return (
                                    <text x={x} y={y + dy} textAnchor={anchor} fill="#cbd5e1" fontSize={9} fontWeight={600}>
                                        <title>{text}</title>
                                        {truncated}
                                    </text>
                                );
                            }} 
                        />
                        
                        <PolarRadiusAxis 
                            angle={30} 
                            domain={[safeMin, safeMax]} 
                            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} 
                            tickFormatter={(v) => v === safeMin ? '' : v} 
                            axisLine={false} 
                        />

                        {/* Reference Line / Target Radar */}
                        <Radar 
                            name="Meta" 
                            dataKey="meta" 
                            stroke="#10b981" 
                            strokeWidth={1.8}
                            strokeDasharray="4 3" 
                            strokeOpacity={0.8} 
                            fill="none" 
                            dot={{ r: 2.5, fill: '#065f46', stroke: '#10b981', strokeWidth: 1.5 }} 
                        />

                        {/* Bottom Layer: Glow effect */}
                        <Radar 
                            name="_glow_Seu nível"
                            dataKey="nivel" 
                            stroke="#818cf8" 
                            strokeWidth={7} 
                            strokeOpacity={0.28}
                            fill="none" 
                            dot={false}
                            activeDot={false}
                            legendType="none"
                            tooltipType="none"
                        />
                        {/* Top Layer: Actual Performance Radar */}
                        <Radar 
                            name="Seu nível"
                            dataKey="nivel" 
                            stroke="#818cf8" 
                            strokeWidth={2.5} 
                            fill={`url(#${radarGradId})`}
                            dot={{ r: 3.5, fill: '#0f172a', stroke: '#818cf8', strokeWidth: 2 }} 
                            activeDot={{ r: 6, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 2.5 }} 
                        />

                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    const nivel = Number(d.nivel) || 0;
                                    const meta = Number(d.meta) || 0;
                                    const diff = nivel - meta;
                                    const isAbove = diff >= 0;

                                    return (
                                        <div className="bg-slate-950/95 border border-white/15 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl min-w-[190px]">
                                            <p className="text-xs font-black text-white mb-2 border-b border-white/10 pb-1.5 flex items-center justify-between gap-2">
                                                <span className="truncate">{d.fullSubject || d.subject}</span>
                                            </p>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center gap-3">
                                                    <span className="text-slate-400 font-medium text-[11px]">Seu Nível:</span>
                                                    <span className="font-mono font-black text-indigo-300">{formatValue(nivel)}{unit}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-3">
                                                    <span className="text-slate-400 font-medium text-[11px]">Meta Alvo:</span>
                                                    <span className="font-mono font-bold text-emerald-400">{formatValue(meta)}{unit}</span>
                                                </div>
                                                <div className="pt-1.5 border-t border-white/10 flex justify-between items-center gap-3">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                        isAbove 
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                    }`}>
                                                        {isAbove ? `+${formatValue(diff)}${unit} ✓` : `${formatValue(diff)}${unit}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend 
                            payload={[
                                { value: 'Meta Estabelecida', type: 'line', id: 'meta', color: '#10b981' },
                                { value: 'Domínio Real', type: 'line', id: 'nivel', color: '#818cf8' }
                            ]}
                            wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: '#94a3b8', fontWeight: 600 }} 
                        />
                    </RadarChart>
                    </ResponsiveContainer>
                </ChartFrame>
            </div>
        </div>
    );
}

