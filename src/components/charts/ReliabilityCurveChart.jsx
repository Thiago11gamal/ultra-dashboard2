import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target } from 'lucide-react';

export default function ReliabilityCurveChart({ buckets }) {
    const data = useMemo(() => {
        if (!Array.isArray(buckets) || buckets.length === 0) return [];
        
        // Mapeia os buckets do motor de calibração para renderização
        return buckets
            .filter(b => b.count > 0)
            .map(b => ({
                pred: Math.round((Number(b.meanPred) || 0) * 100),
                obs: Math.round((Number(b.observedRate) || 0) * 100),
                gap: Math.round((Number(b.gap) || 0) * 100),
                count: Number(b.count) || 0,
                binStart: Math.round((Number(b.bin) - 0.1) * 100),
                binEnd: Math.round(Number(b.bin) * 100)
            }))
            .sort((a, b) => a.pred - b.pred);
    }, [buckets]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 rounded-none border border-white/5 bg-black/20 text-center px-4">
                <Target size={20} className="text-slate-600 mb-2" />
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">Sem Curva de Confiabilidade</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1 max-w-[200px]">
                    Dados insuficientes para traçar a confiabilidade.
                </p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const isOverconfident = dataPoint.pred > dataPoint.obs;
            
            return (
                <div className="bg-slate-900 border border-white/10 p-3 rounded-none shadow-xl shadow-black/50 backdrop-blur-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">
                        Intervalo: {dataPoint.binStart}% - {dataPoint.binEnd}%
                    </p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Previsão (Motor)</span>
                            <span className="text-[11px] font-black text-indigo-400">{dataPoint.pred}%</span>
                        </div>
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Acerto (Real)</span>
                            <span className="text-[11px] font-black text-cyan-400">{dataPoint.obs}%</span>
                        </div>
                        <div className="pt-1 mt-1 border-t border-white/5 flex justify-between items-center gap-6">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Gap / Viés</span>
                            <span className={`text-[11px] font-black ${isOverconfident ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isOverconfident ? 'Overconfident' : 'Underconfident'} ({Math.abs(dataPoint.gap)}%)
                            </span>
                        </div>
                        <div className="flex justify-between items-center gap-6 pt-1">
                            <span className="text-[9px] font-bold text-slate-600 uppercase">Amostras (n)</span>
                            <span className="text-[9px] font-black text-slate-400">{dataPoint.count}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-56 rounded-none border border-white/5 bg-black/20 p-4 relative">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="pred" 
                        type="number" 
                        domain={[0, 100]} 
                        ticks={[0, 20, 40, 60, 80, 100]}
                        stroke="rgba(255,255,255,0.1)" 
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis 
                        type="number" 
                        domain={[0, 100]} 
                        ticks={[0, 20, 40, 60, 80, 100]}
                        stroke="rgba(255,255,255,0.1)" 
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    
                    {/* Linha de Honestidade Perfeita (Perfect Calibration) */}
                    <ReferenceLine segment={[{x: 0, y: 0}, {x: 100, y: 100}]} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    
                    {/* Linha Empírica do Modelo */}
                    <Line 
                        type="monotone" 
                        dataKey="obs" 
                        stroke="#06b6d4" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#818cf8', stroke: '#0f172a', strokeWidth: 2 }}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
            
            <div className="absolute top-4 left-16 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-0.5 bg-cyan-500 rounded-full" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motor</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-0.5 bg-white/20 rounded-full border-t border-dashed border-white/40" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Realidade</span>
                </div>
            </div>
        </div>
    );
}
