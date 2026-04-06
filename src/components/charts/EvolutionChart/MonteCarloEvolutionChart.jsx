import React, { useMemo, useId } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// FIX: Adicionada a propriedade 'unit' para flexibilizar a exibição da meta (ex: pts, %, acertos)
export const MonteCarloEvolutionChart = ({ data = [], targetScore = 75, unit = 'pts' }) => {
    const rawId = useId();
    const gradientId = `colorMonteCarlo-${rawId.replace(/:/g, '')}`;

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data
            .filter(d => d.date && Number.isFinite(d.probability))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;
                try {
                    const parsed = parseISO(d.date);
                    displayDate = format(parsed, 'dd/MM', { locale: ptBR });
                    fullDate = format(parsed, 'dd MMM yyyy', { locale: ptBR });
                } catch (e) {
                    console.error('[MonteCarloEvolutionChart] Invalid date:', d.date);
                }
                return {
                    ...d,
                    displayDate,
                    fullDate
                };
            });
    }, [data]);

    if(formattedData.length === 0) {
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
                        <AreaChart data={[{ date: '1', probability: 40 }, { date: '2', probability: 60 }, { date: '3', probability: 85 }]}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[0, 100]} />
                            <Area type="monotone" dataKey="probability" stroke="#60a5fa" fill="#60a5fa" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            const fullDate = payload[0].payload.fullDate;
            
            // Limiar justo de segurança estatística
            const SAFE_PROBABILITY_THRESHOLD = 75.0; 
            const isGood = val >= SAFE_PROBABILITY_THRESHOLD;
            
            return (
                <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">{fullDate}</p>
                    <div className="flex items-end gap-2">
                        <span className={`text-4xl font-black ${isGood ? 'text-green-400' : 'text-blue-400'}`}>
                            {val.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">
                            Probabilidade
                        </span>
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
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Probabilidade Histórica de Aprovação</p>
                    </div>
                </div>
                {/* FIX: Alterado de % fixo para aceitar a unidade dinâmica e evitar conflito com a probabilidade */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
                    <Target size={12} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Target: <strong className="text-white">{targetScore} {unit}</strong></span>
                </div>
            </div>

            <div className="w-full relative h-[360px] flex items-center justify-center">
                {formattedData.length === 1 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-[1px] rounded-xl text-center p-4">
                        <TrendingUp size={24} className="text-blue-500/40 mb-2" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Ponto Único Registrado</p>
                        <p className="text-[9px] text-slate-600 mt-1">Aguardando mais um dia de simulação para traçar a linha de evolução.</p>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={formattedData}
                        margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.5}/>
                                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                        <XAxis 
                            dataKey="displayDate" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff22', strokeWidth: 2, strokeDasharray: '4 4' }} />
                        
                        <Area 
                            type="monotone" 
                            dataKey="probability" 
                            stroke="#60a5fa" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill={`url(#${gradientId})`}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa', className: "animate-pulse shadow-lg" }}
                            dot={formattedData.length < 15 ? { r: 5, strokeWidth: 3, fill: '#60a5fa', stroke: '#0f172a' } : false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 opacity-50 px-2">
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                     A projeção diária representa o cenário estatístico (Monte Carlo P50) calculado no fim do dia.
                 </p>
                 <span className="text-[9px] font-bold font-mono text-slate-400 bg-black px-2 py-0.5 rounded-full border border-white/5">N = {formattedData.length} dias</span>
            </div>
        </div>
    );
};
