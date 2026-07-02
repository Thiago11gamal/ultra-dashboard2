import React, { useMemo } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, LabelList
} from 'recharts';
import { getDateKey } from '../../../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../../../utils/scoreHelper';
import { Zap, Target, TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = {
    gaugeBg: '#1e293b',    // slate-800
    gaugeFillValid: '#a855f7', // purple-500
    gaugeFillDanger: '#ef4444',// red-500
    gaugeFillSuccess: '#22c55e',// green-500
    reference: '#94a3b8',  // slate-400
    neonLine: '#c084fc',   // purple-400
};

const CustomTooltipTimeline = ({ active, payload, unit }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
                <p className="text-slate-300 text-xs font-bold mb-1">{data.displayDate}</p>
                <p className="text-white text-sm font-black flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.neonLine }}></span>
                    Média: {data.accuracy.toFixed(1)}{unit}
                </p>
                <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-wider">{data.total} questões</p>
            </div>
        );
    }
    return null;
};

export function TodayVsGeneralChart({ 
    activeCategories = [], 
    globalMetrics = {}, 
    targetScore = 80,
    maxScore = 100, 
    unit = '%' 
}) {
    // 1. Média Geral (Absoluta)
    const generalAccuracy = globalMetrics?.globalAccuracy || 0;
    const scale = maxScore / 100;

    // 2. Extrair dados diários agregados (Últimos 14 dias)
    const { dailyData, lastActiveEntry, isToday } = useMemo(() => {
        const dayMap = {};
        const now = new Date();
        const todayKey = getDateKey(now);
        
        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const dKey = getDateKey(h.date || h.createdAt);
                if (!dKey) return;
                
                if (!dayMap[dKey]) dayMap[dKey] = { correct: 0, total: 0 };
                
                let tot = Number(h.total) || 0;
                let corr = Number(h.correct) || 0;
                const score = getSafeScore(h, maxScore);
                
                // Fallback para inserção de percentual direto (sem quantidade)
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(maxScore);
                    corr = Math.round((score / maxScore) * tot);
                } else if (tot > 0) {
                    corr = Math.round((score / maxScore) * tot);
                }
                
                dayMap[dKey].correct += corr;
                dayMap[dKey].total += tot;
            });
        });
        
        const sortedDates = Object.keys(dayMap).sort();
        const result = sortedDates.slice(-14).map(date => {
            const [, m, d] = date.split('-');
            const entry = dayMap[date];
            const acc = entry.total > 0 ? (entry.correct / entry.total) * maxScore : 0;
            return {
                date,
                displayDate: `${d}/${m}`,
                accuracy: acc,
                total: entry.total,
            };
        });

        const lastEntry = result.length > 0 ? result[result.length - 1] : null;
        const _isToday = lastEntry ? lastEntry.date === todayKey : false;

        return { dailyData: result, lastActiveEntry: lastEntry, isToday: _isToday };
    }, [activeCategories, maxScore]);

    if (!dailyData || dailyData.length === 0) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30">
                <span className="text-4xl opacity-50">⚖️</span>
                <p className="text-slate-400 font-bold text-sm">Dados insuficientes para comparação diária.</p>
            </div>
        );
    }

    const focusAccuracy = lastActiveEntry ? lastActiveEntry.accuracy : 0;
    const delta = focusAccuracy - generalAccuracy;
    const deltaAbs = Math.abs(delta);
    const isPositive = delta >= 0;

    // Configuração do Gauge
    const gaugeValue = Math.max(0, Math.min(focusAccuracy, maxScore)); // clamp
    const gaugeData = [
        { name: 'Desempenho', value: gaugeValue },
        { name: 'Faltante', value: maxScore - gaugeValue }
    ];

    // Cor dinâmica do Gauge baseada na relação com a Média Geral e Meta
    let gaugeColor = COLORS.gaugeFillValid; // Roxo padrão
    if (focusAccuracy >= targetScore) gaugeColor = COLORS.gaugeFillSuccess; // Verde se bateu a meta absoluta
    else if (focusAccuracy < generalAccuracy - (5 * scale)) gaugeColor = COLORS.gaugeFillDanger; // Vermelho se muito abaixo do normal



    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch relative min-h-[350px]">
            {/* Painel Esquerdo: O Velocímetro / Dashboard de Hoje */}
            <div className="w-full lg:w-1/3 min-w-[280px] bg-black/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden group">
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Target size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {isToday ? "Sessão de Hoje" : "Última Sessão"}
                    </span>
                </div>

                <div className="relative w-[220px] h-[120px] mt-8 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={gaugeData}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                <Cell key="cell-0" fill={gaugeColor} style={{ filter: `drop-shadow(0 0 12px ${gaugeColor}80)` }} />
                                <Cell key="cell-1" fill={COLORS.gaugeBg} />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Texto Central do Gauge */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                        <span className="text-4xl font-black text-white tracking-tighter" style={{ textShadow: `0 0 20px ${gaugeColor}50` }}>
                            {focusAccuracy.toFixed(1)}<span className="text-xl text-slate-400 ml-1">{unit}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Acertos(%) hoje</span>
                    </div>
                </div>

                {/* Badge de Comparação (Delta) */}
                <div className={`mt-6 px-4 py-2 rounded-2xl flex items-center gap-2 border shadow-lg ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <div className="flex flex-col">
                        <span className="text-xs font-black">
                            {isPositive ? '+' : '-'}{deltaAbs.toFixed(1)}{unit}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider opacity-70">vs Média Geral</span>
                    </div>
                </div>
                
                {/* Info adicional da Meta */}
                <div className="w-full flex justify-between items-center mt-6 pt-4 border-t border-white/5 px-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Média Geral</span>
                        <span className="text-sm font-bold text-slate-300">{generalAccuracy.toFixed(1)}{unit}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Meta</span>
                        <span className="text-sm font-bold text-slate-300">{targetScore}{unit}</span>
                    </div>
                </div>
            </div>

            {/* Painel Direito: Linha do Tempo Analítica */}
            <div className="w-full lg:w-2/3 flex-1 bg-black/20 border border-slate-700/30 rounded-3xl p-4 sm:p-6 flex flex-col relative">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                        <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Zap size={14} className="text-purple-400" /> Histórico Recente (14 dias)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Compare suas variações diárias com a linha base
                        </p>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyData} margin={{ top: 20, right: 20, left: -20, bottom: 10 }}>
                            <defs>
                                <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={COLORS.neonLine} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={COLORS.neonLine} stopOpacity={1} />
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
                                fontWeight={600}
                            />
                            <YAxis 
                                domain={[0, maxScore]} 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(v) => `${v}${unit === '%' ? '' : unit}`} 
                            />
                            <Tooltip content={<CustomTooltipTimeline unit={unit} />} cursor={{ stroke: '#ffffff1a', strokeWidth: 2 }} />
                            
                            {/* Linha de Referência da Média Geral */}
                            <ReferenceLine 
                                y={generalAccuracy} 
                                stroke={COLORS.reference} 
                                strokeDasharray="5 5" 
                                strokeWidth={2} 
                                opacity={0.6}
                                label={{ position: 'top', value: 'MÉDIA GERAL', fill: COLORS.reference, fontSize: 9, fontWeight: 800, textAnchor: 'end', dx: -10 }}
                            />
                            
                            {/* Linha da Evolução Diária */}
                            <Line 
                                type="monotoneX" 
                                dataKey="accuracy" 
                                stroke="url(#neonGradient)" 
                                strokeWidth={3} 
                                dot={{ fill: '#1e293b', stroke: COLORS.neonLine, strokeWidth: 2, r: 4 }}
                                activeDot={{ fill: COLORS.neonLine, stroke: '#fff', strokeWidth: 2, r: 6 }}
                                isAnimationActive={true}
                                animationDuration={1200}
                            >
                                <LabelList 
                                    dataKey="accuracy" 
                                    position="top" 
                                    offset={10} 
                                    formatter={(v) => Math.round(v)} 
                                    fill="#94a3b8" 
                                    fontSize={10}
                                    fontWeight={700}
                                />
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
