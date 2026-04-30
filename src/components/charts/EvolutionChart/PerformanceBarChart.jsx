import React, { useId } from 'react';
import { formatValue, formatPercent } from '../../../utils/scoreHelper';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList
} from "recharts";

export function PerformanceBarChart({ subjectAggData, showOnlyFocus, focusCategory, unit = '%', maxScore = 100 }) {
    const instanceId = useId().replace(/:/g, "");
    const gradQuestoesId = `pb_gradQuestoes_${instanceId}`;
    const gradAcertosId = `pb_gradAcertos_${instanceId}`;
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group w-full min-w-0">
            <div className="flex items-center justify-between mb-3 sm:mb-5 min-w-0">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Questões Resolvidas vs Acertos</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">
                        📊 {showOnlyFocus ? `Desempenho — ${focusCategory?.name}` : "Desempenho por Matéria — Histórico Completo"}
                    </h3>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Acertos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Erros</span>
                    </div>
                </div>
            </div>

            <div className="h-[320px] sm:h-[380px] w-full">
                {subjectAggData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={subjectAggData.map(d => ({ ...d, erros: Math.max(0, d.questoes - d.acertos) }))}
                            margin={{ top: 20, right: 20, left: 10, bottom: showOnlyFocus ? 20 : 60 }}
                            barCategoryGap="25%"
                        >
                            <defs>
                                <linearGradient id={gradQuestoesId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id={gradAcertosId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                dy={8}
                                angle={showOnlyFocus ? 0 : -35}
                                textAnchor={showOnlyFocus ? 'middle' : 'end'}
                                interval={0}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                width={38}
                                allowDecimals={false}
                                label={{ value: 'Questões', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, dx: -2 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 4 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        const rendPctRaw = d.questoes > 0 ? ((d.acertos / d.questoes) * 100) : 0;
                                        const rendPct = formatValue(rendPctRaw);
                                        return (
                                            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl min-w-[180px]">
                                                <p className="font-black text-slate-200 mb-2 border-b border-white/5 pb-1.5 text-xs">{d.fullName}</p>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center gap-4">
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                            <span className="w-2 h-2 rounded-sm bg-slate-500 inline-block"></span>
                                                            Total de Questões
                                                        </span>
                                                        <span className="text-[11px] font-black text-slate-300">{d.questoes}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                            <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block"></span>
                                                            Acertos
                                                        </span>
                                                        <span className="text-[11px] font-black text-emerald-300">{d.acertos}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                            <span className="w-2 h-2 rounded-sm bg-red-400 inline-block"></span>
                                                            Erros
                                                        </span>
                                                        <span className="text-[11px] font-black text-red-300">{d.erros}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-4 pt-1 border-t border-white/5">
                                                        <span className="text-[9px] text-slate-500 uppercase font-bold">Aproveitamento</span>
                                                        <span className="text-[11px] font-black text-white">{rendPct}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            {/* Barra de Acertos (Base) */}
                            <Bar dataKey="acertos" stackId="a" name="Acertos" fill={`url(#${gradAcertosId})`} isAnimationActive={true} />
                            
                            {/* Barra de Erros (Topo) */}
                            <Bar dataKey="erros" stackId="a" name="Erros" fill={`url(#${gradQuestoesId})`} radius={[5, 5, 0, 0]} isAnimationActive={true}>
                                <LabelList 
                                    dataKey="questoes" 
                                    position="top" 
                                    style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                        <span className="text-4xl mb-3">📊</span>
                        Nenhum dado de estudo encontrado.
                    </div>
                )}
            </div>

            <div className="mt-3 px-3 py-2 bg-white/3 rounded-xl border border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 italic">
                    📌 O tamanho total da barra representa o volume de questões. A parte <span className="text-emerald-500 font-bold">verde</span> indica seus acertos e a parte <span className="text-red-500 font-bold">vermelha</span> os erros.
                </p>
            </div>
        </div>
    );
}
