import React, { useMemo, useId } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MonteCarloEvolutionChart = ({ data = [], targetScore = 75, unit = 'pts' }) => {
    const rawId = useId();
    const gradientId = `colorMonteCarlo-${rawId.replace(/:/g, '')}`;

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data
            .filter(d => d.date && Number.isFinite(d.probability))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;

                const parsed = parseISO(d.date);
                if (isValid(parsed)) {
                    displayDate = format(parsed, 'dd/MM', { locale: ptBR });
                    fullDate = format(parsed, 'dd MMM yyyy', { locale: ptBR });
                } else {
                    console.warn('[MonteCarloEvolutionChart] Ignorando data malformada:', d.date);
                }

                // Cria o array com o limite inferior e superior para o cone de incerteza (Intervalo de Confiança)
                const mean = d.mean || 0;
                const low = d.ci95Low !== undefined ? d.ci95Low : mean;
                const high = d.ci95High !== undefined ? d.ci95High : mean;

                return {
                    ...d,
                    displayDate,
                    fullDate,
                    ciRange: [low, high]
                };
            });
    }, [data]);

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
                        <AreaChart data={[{ date: '1', mean: 40 }, { date: '2', mean: 60 }, { date: '3', mean: 85 }]}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[0, 100]} />
                            <Area type="monotone" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const fullDate = dataPoint.fullDate;

            // Operador de coalescência nula garante falhas seguras
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
                                {pointMean.toFixed(1)} <span className="text-sm text-slate-500 ml-1">{unit}</span>
                            </span>
                        </div>

                        <div className="mt-2 bg-black/40 rounded border border-white/5 p-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-slate-400">Cone (95% CI):</span>
                                <span className="text-[10px] font-mono text-white">{pointLow.toFixed(1)} ~ {pointHigh.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400">Chance de Sucesso:</span>
                                <span className={`text-[10px] font-black ${pointProb >= 70 ? 'text-green-400' : 'text-blue-400'}`}>
                                    {pointProb.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

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
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
                    <Target size={12} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Target: <strong className="text-white">{targetScore} {unit}</strong></span>
                </div>
            </div>

            <div className="w-full relative h-[360px] flex items-center justify-center">
                {formattedData.length === 1 && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md rounded-2xl text-center p-6 border border-white/5">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                            <TrendingUp size={32} className="text-blue-500/60" />
                        </div>
                        <p className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Ponto Único Registrado</p>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                            Aguardando o próximo registro para traçar a evolução.
                            <br /><strong className="text-blue-400"> Nota Atual: {formattedData[0].mean.toFixed(1)} {unit}</strong>
                        </p>
                    </div>
                )}

                {formattedData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={formattedData}
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
                                // AJUSTE DINÂMICO: Domínio baseado no range do CI para não cortar o cone
                                domain={['dataMin - 5', 'dataMax + 5']}
                                tickFormatter={(v) => `${v}${unit === '%' ? '%' : ''}`}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#ffffff33', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            {/* Área do Cone de Incerteza (Intervalo de Confiança) */}
                            <Area
                                type="linear" // MUDANÇA: 'linear' para evitar distorção de Bezier no array ciRange
                                dataKey="ciRange"
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                isAnimationActive={true}
                            />

                            {/* Linha Principal da Média Projetada */}
                            <Area
                                type="monotone"
                                dataKey="mean"
                                stroke="#60a5fa"
                                strokeWidth={3}
                                fill="none"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa', className: "animate-pulse shadow-lg" }}
                                dot={formattedData.length < 15 ? { r: 4, strokeWidth: 2, fill: '#0f172a', stroke: '#60a5fa' } : false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : formattedData.length === 0 ? null : (
                    <div className="w-full h-full opacity-10 pointer-events-none blur-sm">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[{ mean: 0 }, { mean: formattedData[0].mean }, { mean: 0 }]}>
                                <Area type="monotone" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 opacity-50 px-2">
                <span className="text-[9px] font-bold font-mono text-slate-400 bg-black px-2 py-0.5 rounded-full border border-white/5">N = {formattedData.length} dias</span>
            </div>
        </div>
    );
};
