import React, { useMemo, useId, useCallback, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration } from '../../../utils/dateHelper';
import { formatValue, formatPercent } from '../../../utils/scoreHelper';

const SCENARIO_OPTIONS = [
    { id: 'conservative', label: 'Conserv.', fullLabel: 'Conservador' },
    { id: 'base', label: 'Base', fullLabel: 'Base' },
    { id: 'optimistic', label: 'Otim.', fullLabel: 'Otimista' },
];

export const MonteCarloEvolutionChart = ({ data = [], targetScore = 75, unit = 'pts', maxScore = 100 }) => {
    const rawId = useId();
    const gradientId = `colorMonteCarlo-${rawId.replace(/:/g, '')}`;
    const [scenario, setScenario] = useState('base');
    const scenarioLabels = Object.fromEntries(SCENARIO_OPTIONS.map(opt => [opt.id, opt.fullLabel]));

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data
            .filter(d => d?.date && Number.isFinite(d?.probability))
            .map(d => ({ ...d, parsedDate: parseISO(d.date) }))
            .filter(d => isValid(d.parsedDate))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;

                displayDate = format(d.parsedDate, 'dd/MM', { locale: ptBR });
                fullDate = format(d.parsedDate, 'dd MMM yyyy', { locale: ptBR });

                const mean = Number.isFinite(d.mean) ? d.mean : 0;
                const rawLow = Number.isFinite(d.ci95Low) ? d.ci95Low : mean;
                const rawHigh = Number.isFinite(d.ci95High) ? d.ci95High : mean;
                const boundedLow = Math.max(0, Math.min(maxScore, rawLow));
                const boundedHigh = Math.max(0, Math.min(maxScore, rawHigh));
                const low = Math.min(boundedLow, boundedHigh);
                const high = Math.max(boundedLow, boundedHigh);

                return {
                    ...d,
                    displayDate,
                    fullDate,
                    mean,
                    ciRange: [low, high]
                };
            });
    }, [data, maxScore]);

    const scenarioAdjustedData = useMemo(() => {
        const cfg = {
            conservative: { meanBias: -2.5, ciMult: 1.2 },
            base: { meanBias: 0, ciMult: 1 },
            optimistic: { meanBias: 2.5, ciMult: 0.85 },
        }[scenario] || { meanBias: 0, ciMult: 1 };

        return formattedData.map((d) => {
            const mean = Math.max(0, Math.min(maxScore, (Number(d.mean) || 0) + cfg.meanBias));
            const low = Math.max(0, Math.min(maxScore, mean - ((mean - d.ciRange[0]) * cfg.ciMult)));
            const high = Math.max(0, Math.min(maxScore, mean + ((d.ciRange[1] - mean) * cfg.ciMult)));
            const probBase = Number.isFinite(Number(d.probability)) ? Number(d.probability) : 0;
            const probAdj = Math.max(0, Math.min(100, probBase + (cfg.meanBias * 1.8)));
            return { ...d, mean, probability: probAdj, ciRange: [Math.min(low, high), Math.max(low, high)] };
        });
    }, [formattedData, scenario, maxScore]);

    const qualitySignal = useMemo(() => {
        if (!scenarioAdjustedData.length) return null;
        const latest = scenarioAdjustedData[scenarioAdjustedData.length - 1];
        const width = Math.max(0, Number(latest?.ciRange?.[1] ?? 0) - Number(latest?.ciRange?.[0] ?? 0));

        if (scenarioAdjustedData.length < 4 || width >= Math.max(12, maxScore * 0.18)) {
            return { label: 'Sinal Fraco', color: 'text-amber-300 border-amber-500/40 bg-amber-500/10' };
        }
        if (width <= Math.max(6, maxScore * 0.1) && scenarioAdjustedData.length >= 8) {
            return { label: 'Sinal Forte', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' };
        }
        return { label: 'Sinal Médio', color: 'text-sky-300 border-sky-500/40 bg-sky-500/10' };
    }, [scenarioAdjustedData, maxScore]);

    const mcAssumptions = useMemo(() => {
        if (!scenarioAdjustedData.length) return null;
        const latest = scenarioAdjustedData[scenarioAdjustedData.length - 1];
        const width = Math.max(0, Number(latest?.ciRange?.[1] ?? 0) - Number(latest?.ciRange?.[0] ?? 0));
        return {
            points: scenarioAdjustedData.length,
            ciWidth: width,
            scenario: scenarioLabels[scenario] || scenario,
        };
    }, [scenarioAdjustedData, scenario]);

    if (formattedData.length === 0) {
        return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950/40 rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-black text-slate-200 mb-2 uppercase tracking-widest text-center">Nenhum Ponto Registrado</h3>
                <p className="text-xs text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
                    A evolução do Monte Carlo é registrada gradativamente a cada vez que o motor calcula as projeções diárias. Aguarde o primeiro registro de hoje!
                </p>
                <div className="w-full max-w-md h-32 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[{ date: '1', mean: 40 }, { date: '2', mean: 60 }, { mean: 85 }]}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[0, maxScore]} />
                            <Area type="monotone" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    const renderCustomTooltip = useCallback(({ active, payload }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const fullDate = dataPoint.fullDate;
            const pointTarget = dataPoint.target ?? targetScore;
            const pointMean = dataPoint.mean ?? 0;
            const pointProb = dataPoint.probability ?? 0;
            const pointLow = dataPoint.ciRange?.[0] ?? pointMean;
            const pointHigh = dataPoint.ciRange?.[1] ?? pointMean;
            const isGood = pointMean >= pointTarget;

            return (
                <div className="bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl min-w-[200px]">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 border-b border-white/10 pb-2">{fullDate}</p>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Nota Projetada</span>
                            <span className={`text-3xl font-black leading-none ${isGood ? 'text-green-400' : 'text-blue-400'}`}>
                                {unit === 'horas' ? formatDuration(pointMean) : unit === '%' ? formatValue(pointMean) : pointMean} <span className="text-sm text-slate-500 ml-1">{unit}</span>
                            </span>
                        </div>
                        <div className="mt-2 bg-black/40 rounded border border-white/5 p-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-slate-400">Cone (95% CI):</span>
                                <span className="text-[10px] font-mono text-white">
                                    {unit === 'horas' ? `${formatDuration(pointLow)} ~ ${formatDuration(pointHigh)}` : `${formatValue(pointLow)}${unit} ~ ${formatValue(pointHigh)}${unit}`}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400">Chance de Sucesso:</span>
                                <span className={`text-[10px] font-black ${pointProb >= 70 ? 'text-green-400' : 'text-blue-400'}`}>
                                    {formatPercent(pointProb)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    }, [targetScore, unit]);

    return (
        <div className="w-full min-h-[400px] flex flex-col py-4 mt-2">
            <div className="flex items-center justify-between mb-4 px-2 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <TrendingUp size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest">Evolução da Projeção</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trajetória de Notas e Incerteza</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-lg p-1">
                    {SCENARIO_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setScenario(opt.id)}
                            className={`px-2 py-1 rounded text-[9px] font-bold ${scenario === opt.id ? 'bg-indigo-600/25 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
                        <Target size={12} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Target: <strong className="text-white">{unit === 'horas' ? formatDuration(targetScore) : unit === '%' ? formatValue(targetScore) : targetScore} {unit}</strong>
                            <small className="text-slate-500 ml-1">({scenarioLabels[scenario]})</small>
                        </span>
                    </div>
                    {qualitySignal && (
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border ${qualitySignal.color}`}>
                            {qualitySignal.label}
                        </span>
                    )}
                </div>
            </div>

            {mcAssumptions && (
                <div className="px-2 mb-2">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">
                        Hipóteses do Modelo ({mcAssumptions.scenario}): <span className="text-slate-300 font-bold">N={mcAssumptions.points}</span> · CI95 largura atual <span className="text-slate-300 font-bold">{unit === 'horas' ? formatDuration(mcAssumptions.ciWidth) : `${formatValue(mcAssumptions.ciWidth)}${unit}`}</span>
                    </p>
                </div>
            )}

            <div className="w-full relative h-[360px] flex items-center justify-center">
                {formattedData.length === 1 && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md rounded-2xl text-center p-6 border border-white/5">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                            <TrendingUp size={32} className="text-blue-500/60" />
                        </div>
                        <p className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Ponto Único Registrado</p>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                            Aguardando o próximo registro para traçar a evolução.
                            <br /><strong className="text-blue-400"> Nota Atual: {unit === 'horas' ? formatDuration(scenarioAdjustedData[0].mean) : unit === '%' ? formatValue(scenarioAdjustedData[0].mean) : scenarioAdjustedData[0].mean} {unit}</strong>
                        </p>
                    </div>
                )}

                {formattedData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={scenarioAdjustedData}
                            margin={{ top: 20, right: 10, left: -15, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                            <XAxis
                                dataKey="displayDate"
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                                minTickGap={25}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dx={-5}
                                width={45}
                                domain={[
                                    dataMin => Math.max(0, dataMin - 5),
                                    dataMax => (unit === 'horas' ? 'auto' : Math.min(maxScore || 100, dataMax + 5))
                                ]}
                                tickFormatter={(v) => unit === 'horas' ? formatDuration(v) : `${formatValue(v)}${unit}`}
                            />
                            <Tooltip
                                content={renderCustomTooltip}
                                cursor={{ stroke: '#ffffff33', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="linear"
                                dataKey="ciRange"
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                isAnimationActive={true}
                            />
                            <Area
                                type="monotone"
                                dataKey="mean"
                                stroke="#60a5fa"
                                strokeWidth={3}
                                fill="none"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa', className: "animate-pulse shadow-lg" }}
                                dot={scenarioAdjustedData.length < 15 ? { r: 4, strokeWidth: 2, fill: '#0f172a', stroke: '#60a5fa' } : false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : scenarioAdjustedData.length === 0 ? null : (
                    <div className="w-full h-full opacity-10 pointer-events-none blur-sm">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[{ mean: 0 }, { mean: scenarioAdjustedData[0].mean }, { mean: 0 }]}>
                                <Area type="monotone" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 opacity-50 px-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    A área sombreada representa o IC 95% da projeção ao longo do tempo (P2.5 ~ P97.5).
                </p>
                <span className="text-[9px] font-bold font-mono text-slate-400 bg-black px-2 py-0.5 rounded-full border border-white/5">N = {scenarioAdjustedData.length} dias</span>
            </div>
        </div>
    );
};
