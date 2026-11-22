import React, { useId, useMemo, useState } from 'react';
import { formatValue } from '../../../utils/scoreHelper';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList
} from "recharts";
import { BarChart3, AlignLeft, Info } from 'lucide-react';
import { ChartFrame } from "../ChartFrame";
import { BenchmarkStrip } from "../../ui/BenchmarkStrip";

export const PerformanceBarChart = React.memo(function PerformanceBarChart({
    subjectAggData,
    showOnlyFocus = false,
    focusCategory = null,
    targetScore = null,
    unit: _unit = '%',
    maxScore = 100,
    minScore = 0
}) {
    const instanceId = useId().replace(/:/g, "");
    const gradQuestoesId = `pb_gradQuestoes_${instanceId}`;
    const gradAcertosId = `pb_gradAcertos_${instanceId}`;

    const sanitizeCount = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 1e9) return 0;
        return Math.round(n);
    };

    const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];
    const filteredAggData = showOnlyFocus && focusCategory?.id
        ? safeSubjectAggData.filter(d => d.id === focusCategory.id)
        : safeSubjectAggData;

    const chartData = useMemo(() => {
        return filteredAggData.map((d) => {
            const hasReal = d.realQuestoes !== undefined && d.realQuestoes !== null;
            const questoes = sanitizeCount(hasReal ? d.realQuestoes : d.questoes);
            const acertosBrutos = sanitizeCount(hasReal ? d.realAcertos : d.acertos);
            const acertos = Math.min(questoes, acertosBrutos);
            const erros = Math.max(0, questoes - acertos);
            return { ...d, fullName: d.fullName || d.name || d.id, questoes, acertos, erros, errosRaw: erros };
        }).filter((d) => d.questoes > 0);
    }, [filteredAggData]);

    const [orientationOverride, setOrientationOverride] = useState(null);
    const orientation = orientationOverride || (chartData.length > 3 ? 'horizontal' : 'vertical');

    const targetPct = useMemo(() => {
        const sMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const sMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > sMin ? Number(maxScore) : sMin + 100;
        const tNum = (targetScore !== null && targetScore !== undefined && targetScore !== '' && Number.isFinite(Number(targetScore)))
            ? Number(targetScore)
            : sMin + (sMax - sMin) * 0.8;
        return Math.max(0, Math.min(100, ((tNum - sMin) / Math.max(1e-9, sMax - sMin)) * 100));
    }, [targetScore, minScore, maxScore]);

    const totals = useMemo(() => {
        const totalQ = chartData.reduce((acc, curr) => acc + curr.questoes, 0);
        const totalA = chartData.reduce((acc, curr) => acc + curr.acertos, 0);
        const accRate = totalQ > 0 ? (totalA / totalQ) * 100 : 0;
        const onTarget = chartData.filter((d) => d.questoes > 0 && ((d.acertos / d.questoes) * 100) >= targetPct).length;
        return { totalQ, totalA, accRate, onTarget };
    }, [chartData, targetPct]);

    const renderTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const rendPctRaw = d.questoes > 0 ? ((d.acertos / d.questoes) * 100) : 0;
            const rendPct = formatValue(rendPctRaw);
            const pctAcertos = d.questoes > 0 ? (d.acertos / d.questoes) * 100 : 0;
            const diffTarget = rendPctRaw - targetPct;
            const warnFloor = Math.max(35, targetPct - 15);

            return (
                <div className="bg-slate-950/95 backdrop-blur-xl border border-white/[0.12] p-3.5 rounded-2xl shadow-2xl min-w-[215px] max-w-[90vw]">
                    <p className="font-black text-white mb-2.5 border-b border-white/10 pb-1.5 text-xs truncate">{d.fullName || d.name}</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-slate-400">
                                <span className="w-2 h-2 rounded-sm bg-slate-500 inline-block" />
                                Total de questões
                            </span>
                            <span className="font-mono tabular-nums font-black text-slate-200">{d.questoes}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-slate-400">
                                <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />
                                Acertos
                            </span>
                            <span className="font-mono tabular-nums font-black text-emerald-400">{d.acertos}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-slate-400">
                                <span className="w-2 h-2 rounded-sm bg-rose-400 inline-block" />
                                Erros
                            </span>
                            <span className="font-mono tabular-nums font-black text-rose-400">{d.errosRaw}</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-800 my-1">
                            <div className="h-full bg-emerald-500" style={{ width: `${pctAcertos}%` }} />
                            <div className="h-full bg-rose-500" style={{ width: `${100 - pctAcertos}%` }} />
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-white/10 gap-2">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Aproveitamento</span>
                            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md tabular-nums ${
                                rendPctRaw >= targetPct ? 'bg-emerald-500/15 text-emerald-300' :
                                rendPctRaw >= warnFloor ? 'bg-amber-500/15 text-amber-300' :
                                'bg-rose-500/15 text-rose-300'
                            }`}>{rendPct}%</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-mono tabular-nums">
                            <span className="text-slate-400 font-sans">vs Meta ({formatValue(targetPct)}%):</span>
                            <span className={`font-bold ${diffTarget >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {diffTarget >= 0 ? `+${formatValue(diffTarget)}pp ✓` : `${formatValue(diffTarget)}pp`}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const horizontalHeight = Math.max(290, Math.min(440, chartData.length * 42 + 36));

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.65)] hover:border-white/[0.14] transition-all w-full min-w-0 flex flex-col justify-between h-full">
            <div className="mb-3.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Volume vs Precisão</span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-slate-950/75 border border-white/[0.08] px-2.5 py-1 rounded-xl">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                <span className="text-[11px] font-bold text-slate-300">Acertos</span>
                            </div>
                            <span className="text-slate-700">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                                <span className="text-[11px] font-bold text-slate-300">Erros</span>
                            </div>
                        </div>
                        {chartData.length > 1 && (
                            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-950/80 border border-white/[0.08]">
                                <button
                                    type="button"
                                    onClick={() => setOrientationOverride('horizontal')}
                                    aria-pressed={orientation === 'horizontal'}
                                    title="Barras horizontais"
                                    className={`p-1.5 rounded-lg transition-colors ${orientation === 'horizontal' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <AlignLeft size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrientationOverride('vertical')}
                                    aria-pressed={orientation === 'vertical'}
                                    title="Barras verticais"
                                    className={`p-1.5 rounded-lg transition-colors ${orientation === 'vertical' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <BarChart3 size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-slate-100 tracking-tight truncate">
                            Questões Resolvidas vs Acertos
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Volume absoluto de questões resolvidas e proporção de acertos.
                        </p>
                    </div>
                    {totals.totalQ > 0 && (
                        <div className="flex items-center gap-2 shrink-0 bg-indigo-500/12 border border-indigo-400/25 px-3 py-1 rounded-xl">
                            <span className="text-[11px] font-semibold text-slate-300">Precisão:</span>
                            <span className="text-xs font-black text-indigo-200 font-mono tabular-nums">{formatValue(totals.accRate)}%</span>
                        </div>
                    )}
                </div>

                {totals.totalQ > 0 && (() => {
                    const diff = totals.accRate - targetPct;
                    return (
                        <BenchmarkStrip
                            currentLabel="Precisão real"
                            currentValue={`${formatValue(totals.accRate)}%`}
                            targetLabel="Meta"
                            targetValue={`${formatValue(targetPct)}%`}
                            gapLabel={diff >= 0 ? `+${formatValue(diff)}pp acima` : `Faltam ${formatValue(Math.abs(diff))}pp`}
                            status={diff >= 0 ? 'success' : diff >= -10 ? 'warning' : 'danger'}
                            progressPct={targetPct > 0 ? (totals.accRate / targetPct) * 100 : 100}
                            extra={chartData.length > 1 ? `${totals.onTarget}/${chartData.length} na meta` : null}
                            compact
                            className="mt-2.5"
                        />
                    );
                })()}
            </div>

            <div className="w-full flex-1 flex flex-col justify-center">
                {chartData.length > 0 ? (
                    orientation === 'horizontal' ? (
                        <div className="w-full overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: 420 }}>
                            <ChartFrame minHeight={horizontalHeight} label="Distribuindo desempenho">
                                <ResponsiveContainer width="100%" height={horizontalHeight} minHeight={260} minWidth={1}>
                                    <BarChart
                                        data={chartData}
                                        layout="vertical"
                                        margin={{ top: 6, right: 44, left: 4, bottom: 6 }}
                                        barSize={18}
                                    >
                                        <defs>
                                            <linearGradient id={gradQuestoesId} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.92} />
                                                <stop offset="100%" stopColor="#be123c" stopOpacity={0.82} />
                                            </linearGradient>
                                            <linearGradient id={gradAcertosId} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#059669" stopOpacity={0.92} />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.98} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis
                                            type="number"
                                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                            allowDecimals={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="fullName"
                                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                            tickLine={false}
                                            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                                            tickFormatter={(val) => String(val || '').length > 20 ? `${String(val).slice(0, 18)}…` : String(val || '')}
                                            width={126}
                                        />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }} content={renderTooltip} />
                                        <Bar dataKey="acertos" stackId="a" name="Acertos" fill={`url(#${gradAcertosId})`} radius={[4, 0, 0, 4]} isAnimationActive={false}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`acertos-h-${index}`} radius={entry.erros === 0 ? [4, 6, 6, 4] : [4, 0, 0, 4]} />
                                            ))}
                                        </Bar>
                                        <Bar dataKey="erros" stackId="a" name="Erros" fill={`url(#${gradQuestoesId})`} radius={[0, 6, 6, 0]} isAnimationActive={false}>
                                            <LabelList
                                                dataKey="questoes"
                                                content={(props) => {
                                                    const { x, y, width, height, value } = props;
                                                    if (!value || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
                                                    const safeW = Number.isFinite(Number(width)) ? Math.max(0, Number(width)) : 0;
                                                    const safeH = Number.isFinite(Number(height)) ? Number(height) : 18;
                                                    return (
                                                        <text
                                                            x={Number(x) + safeW + 8}
                                                            y={Number(y) + safeH / 2 + 4}
                                                            fill="#e2e8f0"
                                                            fontSize={11}
                                                            fontWeight={700}
                                                        >
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
                        <div className="h-[310px] sm:h-[340px] w-full overflow-x-auto custom-scrollbar pb-1">
                            <div className="min-w-[420px] lg:min-w-full h-full">
                                <ChartFrame minHeight={300} label="Distribuindo desempenho">
                                    <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                                        <BarChart
                                            data={chartData}
                                            margin={{ top: 20, right: 16, left: 4, bottom: 44 }}
                                            barCategoryGap="28%"
                                            maxBarSize={48}
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
                                                dataKey="fullName"
                                                axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                                tickLine={false}
                                                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                                                tickFormatter={(val) => String(val || '').length > 18 ? `${String(val).substring(0, 16)}…` : String(val || '')}
                                                dy={8}
                                            />
                                            <YAxis
                                                axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                                width={40}
                                                allowDecimals={false}
                                            />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }} content={renderTooltip} />
                                            <Bar dataKey="acertos" stackId="a" name="Acertos" fill={`url(#${gradAcertosId})`} radius={[0, 0, 4, 4]} isAnimationActive={false}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`acertos-cell-${index}`} radius={entry.erros === 0 ? [6, 6, 4, 4] : [0, 0, 4, 4]} />
                                                ))}
                                            </Bar>
                                            <Bar dataKey="erros" stackId="a" name="Erros" fill={`url(#${gradQuestoesId})`} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                                                <LabelList
                                                    dataKey="questoes"
                                                    content={(props) => {
                                                        const { x, width, value } = props;
                                                        if (width < 15 || !value) return null;
                                                        const labelY = Math.max(12, (props.y ?? 18) - 6);
                                                        return (
                                                            <text x={x + width / 2} y={labelY} fill="#e2e8f0" fontSize={11} fontWeight="bold" textAnchor="middle">
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
                        </div>
                    )
                ) : (
                    <div className="min-h-[260px] flex flex-col items-center justify-center text-slate-400 text-sm text-center px-4 gap-2">
                        <BarChart3 size={28} className="text-slate-600" />
                        <span>Nenhum dado de estudo encontrado.</span>
                    </div>
                )}
            </div>

            <div className="mt-3 px-3 py-2 bg-slate-950/45 rounded-xl border border-white/[0.06] flex items-center justify-center gap-2 text-center">
                <Info size={13} className="text-slate-400 shrink-0" />
                <p className="text-[11px] text-slate-400">
                    O tamanho total representa o volume: <span className="text-emerald-400 font-bold">verde</span> indica acertos e <span className="text-rose-400 font-bold">vermelho</span> indica erros.
                </p>
            </div>
        </div>
    );
});
