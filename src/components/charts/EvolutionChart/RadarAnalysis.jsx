import React, { useId, useCallback } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from "recharts";
import { Compass, HelpCircle } from 'lucide-react';
import { formatValue } from '../../../utils/scoreHelper';
import { ChartFrame } from "../ChartFrame";

/**
 * RadarAnalysis
 *
 * A comprehensive disciplinary cross-section (Raio-X) using a Radar chart.
 * Compares current performance levels against target scores.
 */
export const RadarAnalysis = React.memo(function RadarAnalysis({
    radarData,
    maxScore = 100,
    minScore = 0,
    unit = '%',
    isFocusFiltered = false,
    timeWindow = 'all'
}) {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 1;

    const instanceId = useId().replace(/:/g, '');
    const radarGradId = `radar_grad_${instanceId}`;

    const renderAngleAxisTick = useCallback((props) => {
        const { x, y, cx, cy, payload } = props;
        const text = payload?.value || "";
        const maxLen = 28;
        const maxLineLen = 16;
        const anchor = x > cx + 10 ? 'start' : x < cx - 10 ? 'end' : 'middle';
        const dy = y > cy ? 6 : -6;

        if (text.length > 13 && text.includes(' ')) {
            const center = text.length / 2;
            const spaces = [];
            for (let i = 0; i < text.length; i++) {
                if (text[i] === ' ') spaces.push(i);
            }
            const splitIdx = spaces.reduce((closest, idx) =>
                Math.abs(idx - center) < Math.abs(closest - center) ? idx : closest
            , spaces[0]);

            const line1raw = text.substring(0, splitIdx).trim();
            const line2raw = text.substring(splitIdx).trim();
            const line1 = line1raw.length > maxLineLen ? line1raw.substring(0, maxLineLen - 1) + '…' : line1raw;
            const line2 = line2raw.length > maxLineLen ? line2raw.substring(0, maxLineLen - 1) + '…' : line2raw;
            return (
                <text x={x} y={y + dy} textAnchor={anchor} fill="#cbd5e1" fontSize={10} fontWeight={600}>
                    <title>{text}</title>
                    <tspan x={x} dy="0">{line1}</tspan>
                    <tspan x={x} dy="12">{line2}</tspan>
                </text>
            );
        }
        const truncated = text.length > maxLen ? text.substring(0, maxLen - 2) + '…' : text;
        return (
            <text x={x} y={y + dy} textAnchor={anchor} fill="#cbd5e1" fontSize={10} fontWeight={600}>
                <title>{text}</title>
                {truncated}
            </text>
        );
    }, []);

    const renderTooltipContent = useCallback(({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const nivel = Number.isFinite(Number(d.nivel)) ? Number(d.nivel) : safeMin;
            const meta = Number.isFinite(Number(d.meta)) ? Number(d.meta) : safeMin;
            const diff = nivel - meta;
            const isAbove = diff >= 0;

            return (
                <div className="bg-slate-950/95 border border-white/[0.12] p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl min-w-[195px]">
                    <p className="text-xs font-black text-white mb-2 border-b border-white/10 pb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate">{d.fullSubject || d.subject}</span>
                    </p>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center gap-3">
                            <span className="text-slate-400 font-medium">Seu Nível:</span>
                            <span className="font-mono tabular-nums font-black text-indigo-300">{formatValue(nivel)}{unit}</span>
                        </div>
                        <div className="flex justify-between items-center gap-3">
                            <span className="text-slate-400 font-medium">Meta Alvo:</span>
                            <span className="font-mono tabular-nums font-bold text-emerald-400">{formatValue(meta)}{unit}</span>
                        </div>
                        <div className="pt-1.5 border-t border-white/10 flex justify-between items-center gap-3">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                            <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
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
    }, [safeMin, unit]);

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.65)] hover:border-white/[0.14] transition-all flex flex-col justify-between h-full min-w-0">
            <div className="mb-2 sm:mb-3 relative group/tooltip">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Equilíbrio Geral</span>
                    <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/12 border border-indigo-400/25 px-2.5 py-0.5 rounded-full">
                        Multidimensional
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2 tracking-tight">
                        <Compass size={16} className="text-indigo-400 shrink-0" />
                        Raio-X das Disciplinas
                    </h4>
                    <button
                        type="button"
                        className="relative flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-help"
                        aria-label="Informação sobre o gráfico radar"
                    >
                        <HelpCircle size={14} />
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 sm:-translate-x-0 sm:left-0 w-[260px] p-3.5 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-200 z-50 pointer-events-none text-left">
                            <p className="text-xs text-slate-200 font-normal leading-relaxed normal-case tracking-normal">
                                Este gráfico avalia seu <strong className="text-indigo-400">nível de acertos</strong> em cada matéria, mostrando o equilíbrio do aprendizado. Quanto mais expandida for a teia, mais próximo da meta você está.
                            </p>
                        </div>
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {timeWindow === 'all'
                        ? 'Comparativo da proficiência real contra a meta estabelecida para a prova.'
                        : `Comparativo do acerto nos últimos ${timeWindow} dias contra a meta estabelecida para a prova.`}
                </p>
            </div>

            <div className="flex-1 min-h-[290px] sm:min-h-[330px] w-full relative flex flex-col justify-center">
                {(!Array.isArray(radarData) || radarData.length < 3) ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400/70">
                            <Compass size={22} />
                        </div>
                        <p className="text-xs font-bold text-slate-200">
                            {isFocusFiltered ? 'Modo Apenas Foco ativo' : 'Dados insuficientes para o Raio-X'}
                        </p>
                        <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">
                            {isFocusFiltered
                                ? 'Desative "Apenas Foco" na barra superior para comparar todas as disciplinas na teia multidimensional.'
                                : (timeWindow !== 'all'
                                    ? `São necessárias pelo menos 3 disciplinas com simulados nos últimos ${timeWindow} dias para compor a teia.`
                                    : 'São necessárias pelo menos 3 disciplinas com simulados registrados para compor a teia multidimensional.')}
                        </p>
                    </div>
                ) : (
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
                                <PolarAngleAxis dataKey="subject" tick={renderAngleAxisTick} />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[safeMin, safeMax]}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                    tickFormatter={(v) => v === safeMin ? '' : formatValue(v)}
                                    axisLine={false}
                                />
                                <Radar
                                    name="Meta"
                                    dataKey="meta"
                                    stroke="#10b981"
                                    strokeWidth={1.8}
                                    strokeDasharray="4 3"
                                    strokeOpacity={0.85}
                                    fill="none"
                                    dot={{ r: 2.5, fill: '#065f46', stroke: '#10b981', strokeWidth: 1.5 }}
                                />
                                <Radar
                                    name="_glow_Seu nível"
                                    dataKey="nivel"
                                    stroke="#818cf8"
                                    strokeWidth={7}
                                    strokeOpacity={0.26}
                                    fill="none"
                                    dot={false}
                                    activeDot={false}
                                    legendType="none"
                                    tooltipType="none"
                                />
                                <Radar
                                    name="Seu nível"
                                    dataKey="nivel"
                                    stroke="#818cf8"
                                    strokeWidth={2.5}
                                    fill={`url(#${radarGradId})`}
                                    dot={{ r: 3.5, fill: '#0f172a', stroke: '#818cf8', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 2.5 }}
                                />
                                <Tooltip content={renderTooltipContent} />
                                <Legend
                                    payload={[
                                        { value: 'Meta Estabelecida', type: 'line', id: 'meta', color: '#10b981' },
                                        { value: timeWindow === 'all' ? 'Domínio Real' : `Acerto (${timeWindow}d)`, type: 'line', id: 'nivel', color: '#818cf8' }
                                    ]}
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#94a3b8', fontWeight: 600 }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                )}
            </div>
        </div>
    );
});
