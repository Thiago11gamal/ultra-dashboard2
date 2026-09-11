import React, { useId, useMemo } from 'react';
import { formatValue } from '../../../utils/scoreHelper';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList
} from "recharts";
import { ChartFrame } from "../ChartFrame";

export const PerformanceBarChart = React.memo(function PerformanceBarChart({ subjectAggData, unit: _unit = '%', minScore: _minScore = 0 }) {
    const instanceId = useId().replace(/:/g, "");
    const gradQuestoesId = `pb_gradQuestoes_${instanceId}`;
    const gradAcertosId = `pb_gradAcertos_${instanceId}`;

    const sanitizeCount = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.round(n);
    };

    const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];

    const chartData = safeSubjectAggData.map((d) => {
        const questoes = sanitizeCount(d.questoes);
        const acertosBrutos = sanitizeCount(d.acertos);
        const acertos = Math.min(questoes, acertosBrutos);
        const erros = Math.max(0, questoes - acertos);
        return { ...d, questoes, acertos, erros, errosRaw: erros };
    });
    
    const totals = useMemo(() => {
        const totalQ = chartData.reduce((acc, curr) => acc + curr.questoes, 0);
        const totalA = chartData.reduce((acc, curr) => acc + curr.acertos, 0);
        const accRate = totalQ > 0 ? (totalA / totalQ) * 100 : 0;
        return { totalQ, totalA, accRate };
    }, [chartData]);

    return (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all group w-full min-w-0 flex flex-col justify-between h-full">
            <div className="mb-3 sm:mb-4 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Volume vs Precisão</span>
                    <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1 rounded-full shadow-inner">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Acertos</span>
                        </div>
                        <span className="text-slate-600 text-xs">|</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Erros</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-100 tracking-tight truncate">
                            Questões Resolvidas vs Acertos
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Volume absoluto de questões resolvidas e proporção de acertos.
                        </p>
                    </div>
                    {totals.totalQ > 0 && (
                        <div className="flex items-center gap-2 shrink-0 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400">Precisão Total:</span>
                            <span className="text-xs font-black text-indigo-300 font-mono">{formatValue(totals.accRate)}%</span>
                        </div>
                    )}
                </div>
            </div>
 
            <div className="h-[320px] sm:h-[380px] w-full overflow-x-auto custom-scrollbar pb-2">
                {chartData.length > 0 ? (
                    <div className="min-w-[600px] lg:min-w-full h-full">
                        <ChartFrame minHeight={320} label="Distribuindo desempenho">
                            <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={1}>
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 20, left: 5, bottom: 100 }}
                                barCategoryGap="28%"
                            >
                                <defs>
                                    <linearGradient id={gradQuestoesId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="#be123c" stopOpacity={0.8} />
                                    </linearGradient>
                                    <linearGradient id={gradAcertosId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.98} />
                                        <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                
                                <XAxis
                                    dataKey="name"
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    tickLine={false}
                                    tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 500, width: 85 }}
                                    tickFormatter={(val) => val.length > 24 ? val.substring(0, 22) + '..' : val}
                                    dy={8}
                                    angle={-32}
                                    textAnchor="end"
                                />
                                
                                <YAxis
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    width={40}
                                    allowDecimals={false}
                                />
                                
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            const rendPctRaw = d.questoes > 0 ? ((d.acertos / d.questoes) * 100) : 0;
                                            const rendPct = formatValue(rendPctRaw);
                                            const pctAcertos = d.questoes > 0 ? (d.acertos / d.questoes) * 100 : 0;

                                            return (
                                                <div className="bg-slate-950/95 backdrop-blur-xl border border-white/15 p-3.5 rounded-2xl shadow-2xl min-w-[210px] max-w-[90vw]">
                                                    <p className="font-black text-white mb-2.5 border-b border-white/10 pb-1.5 text-xs truncate">{d.fullName || d.name}</p>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="flex items-center gap-1.5 text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-slate-500 inline-block"></span>
                                                                Total de questões
                                                            </span>
                                                            <span className="font-mono font-black text-slate-200">{d.questoes}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="flex items-center gap-1.5 text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
                                                                Acertos
                                                            </span>
                                                            <span className="font-mono font-black text-emerald-400">{d.acertos}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="flex items-center gap-1.5 text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-rose-400 inline-block shadow-[0_0_6px_rgba(251,113,133,0.6)]"></span>
                                                                Erros
                                                            </span>
                                                            <span className="font-mono font-black text-rose-400">{d.errosRaw}</span>
                                                        </div>

                                                        {/* Visual proportion bar */}
                                                        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-800 my-1">
                                                            <div className="h-full bg-emerald-500" style={{ width: `${pctAcertos}%` }} />
                                                            <div className="h-full bg-rose-500" style={{ width: `${100 - pctAcertos}%` }} />
                                                        </div>

                                                        <div className="flex justify-between items-center pt-1 border-t border-white/10">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aproveitamento</span>
                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                                                                rendPctRaw >= 70 ? 'bg-emerald-500/15 text-emerald-300' :
                                                                rendPctRaw >= 50 ? 'bg-amber-500/15 text-amber-300' :
                                                                'bg-rose-500/15 text-rose-300'
                                                            }`}>{rendPct}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                
                                <Bar dataKey="acertos" stackId="a" name="Acertos" fill={`url(#${gradAcertosId})`} radius={[0, 0, 4, 4]} isAnimationActive={true} />
                                
                                <Bar dataKey="erros" stackId="a" name="Erros" fill={`url(#${gradQuestoesId})`} radius={[6, 6, 0, 0]} isAnimationActive={true}>
                                    <LabelList 
                                        dataKey="questoes" 
                                        content={(props) => {
                                            const { x, width, value } = props;
                                            if (width < 15 || !value) return null;
                                            const labelY = props.y - 6;
                                            return (
                                                <text x={x + width / 2} y={labelY} fill="#e2e8f0" fontSize={10} fontWeight="bold" textAnchor="middle">
                                                    {value}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </ChartFrame>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                        <span className="text-4xl mb-3">📊</span>
                        Nenhum dado de estudo encontrado.
                    </div>
                )}
            </div>

            <div className="mt-3 px-3.5 py-2 bg-white/[0.02] rounded-2xl border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400">
                    💡 O tamanho total da barra representa o volume de questões. A seção <span className="text-emerald-400 font-bold">verde</span> indica acertos e a seção <span className="text-rose-400 font-bold">vermelha</span> indica erros.
                </p>
            </div>
        </div>
    );
});

