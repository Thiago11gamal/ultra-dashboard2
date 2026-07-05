import React, { useMemo, useId, useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration } from '../../../utils/dateHelper';
import { formatValue, formatPercent } from '../../../utils/scoreHelper';
import { applyScenarioAdjustments, classifyScenarioSignal } from '../../../utils/monteCarloScenario.js';

const MonteCarloTooltip = React.memo(({ active, payload, unit, targetScore, maxScore, minScore }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        const fullDate = dataPoint.fullDate;

        // Operador de coalescência nula garante falhas seguras e respeita o piso (minScore)
        const pointTarget = Math.max(minScore, Math.min(maxScore, Number.isFinite(Number(dataPoint.target)) ? Number(dataPoint.target) : targetScore));
        const pointMean = Math.max(minScore, Math.min(maxScore, Number.isFinite(Number(dataPoint.mean)) ? Number(dataPoint.mean) : minScore));
        const pointProb = Math.max(0, Math.min(100, Number.isFinite(Number(dataPoint.probability)) ? Number(dataPoint.probability) : 0));
        const pointLow = dataPoint.ciRange?.[0] ?? pointMean;
        const pointHigh = dataPoint.ciRange?.[1] ?? pointMean;

        const isGood = pointMean >= pointTarget;

        return (
            <div className="bg-slate-950/80 border border-white/10 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-[210px]">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 border-b border-white/10 pb-2">{fullDate}</p>

                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Nota Projetada</span>
                        <span className={`text-3xl font-black leading-none ${isGood ? 'text-green-400' : 'text-blue-400'}`}>
                            {unit === 'horas' ? formatDuration(pointMean) : unit === '%' ? formatValue(pointMean) : pointMean} <span className="text-sm text-slate-500 ml-1">{unit}</span>
                        </span>
                    </div>
                    <div className="mt-2 bg-black/40 rounded-lg border border-white/5 p-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400">Hoje:</span>
                            <span className="text-[10px] font-mono text-white">
                                {unit === 'horas' ? formatDuration(pointMean) : `${formatValue(pointMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-indigo-400">Projeção:</span>
                            <span className="text-[10px] font-mono text-indigo-300">
                                {unit === 'horas' ? formatDuration(dataPoint.projectedMean) : `${formatValue(dataPoint.projectedMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-1 border-t border-white/5 pt-1 mt-1">
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
});

const SCENARIO_OPTIONS = [
    { id: 'conservative', label: 'Conserv.', fullLabel: 'Conservador' },
    { id: 'base', label: 'Base', fullLabel: 'Base' },
    { id: 'optimistic', label: 'Otim.', fullLabel: 'Otimista' },
];

/**
 * MonteCarloEvolutionChart
 * 
 * Visualizes the trajectory of projected scores and success probabilities over time.
 * Hardened to support non-zero scoring floors (minScore) and preventing Y-axis overshoot.
 */
export const MonteCarloEvolutionChart = ({ 
    data = [], 
    targetScore = 75, 
    unit = 'pts', 
    minScore = 0, 
    maxScore = 100 
}) => {
    const rawId = useId();
    const gradientId = `colorMonteCarlo-${rawId.replace(/:/g, '')}`;
    const [scenario, setScenario] = useState('base');
    const scenarioLabels = useMemo(() => Object.fromEntries(SCENARIO_OPTIONS.map(opt => [opt.id, opt.fullLabel])), []);

    const targetOffset = useMemo(() => {
        const range = maxScore - minScore;
        if (range <= 0) return 0;
        const pct = 1 - (targetScore - minScore) / range;
        return Math.max(0, Math.min(1, pct));
    }, [targetScore, maxScore, minScore]);

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data
            .filter(d => d?.date)
            .map(d => ({ ...d, parsedDate: parseISO(d.date) }))
            .filter(d => isValid(d.parsedDate))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;

                displayDate = format(d.parsedDate, 'dd/MM', { locale: ptBR });
                fullDate = format(d.parsedDate, 'dd MMM yyyy', { locale: ptBR });

                // Sanitização: manter intervalo de confiança dentro do domínio e com ordem válida
                const meanRaw = Number.isFinite(Number(d.mean)) ? Number(d.mean) : minScore;
                const mean = Math.max(minScore, Math.min(maxScore, meanRaw));
                const rawLow = Number.isFinite(Number(d.ci95Low)) ? Number(d.ci95Low) : mean;
                const rawHigh = Number.isFinite(Number(d.ci95High)) ? Number(d.ci95High) : mean;
                const boundedLow = Math.max(minScore, Math.min(maxScore, rawLow));
                const boundedHigh = Math.max(minScore, Math.min(maxScore, rawHigh));
                const low = Math.min(boundedLow, boundedHigh);
                const high = Math.max(boundedLow, boundedHigh);

                return {
                    ...d,
                    displayDate,
                    fullDate,
                    mean,
                    projectedMean: Number.isFinite(Number(d.projectedMean)) ? Math.max(minScore, Math.min(maxScore, Number(d.projectedMean))) : mean,
                    probability: Math.max(0, Math.min(100, Number.isFinite(Number(d.probability)) ? Number(d.probability) : 0)),
                    ciRange: [low, high]
                };
            });
    }, [data, minScore, maxScore]);


    const scenarioAdjustedData = useMemo(
        () => applyScenarioAdjustments(formattedData, scenario, maxScore, minScore),
        [formattedData, scenario, maxScore, minScore]
    );
    const qualitySignal = useMemo(() => classifyScenarioSignal(scenarioAdjustedData, maxScore), [scenarioAdjustedData, maxScore]);

    const mcAssumptions = useMemo(() => {
        if (!scenarioAdjustedData.length) return null;
        const latest = scenarioAdjustedData[scenarioAdjustedData.length - 1];
        const width = Math.max(0, Number(latest?.ciRange?.[1] ?? 0) - Number(latest?.ciRange?.[0] ?? 0));
        return {
            points: scenarioAdjustedData.length,
            ciWidth: width,
            scenario: scenarioLabels[scenario] || scenario,
        };
    }, [scenarioAdjustedData, scenario, scenarioLabels]);



    // M1 FIX: Callback estável para o Tooltip — arrow function inline criaria nova referência
    // a cada render, quebrando a memoização do Recharts e causando re-renders desnecessários.
    const renderTooltip = useCallback(
        (props) => <MonteCarloTooltip {...props} unit={unit} targetScore={targetScore} maxScore={maxScore} minScore={minScore} />,
        [unit, targetScore, maxScore, minScore]
    );

    if (formattedData.length === 0) {
        return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950/40 rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-black text-slate-200 mb-2 uppercase tracking-widest text-center">Nenhum Ponto Registrado</h3>
                <p className="text-xs text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
                    A evolução do Monte Carlo é registrada gradativamente a cada vez que o motor calcula as projeções diárias. Aguarde o primeiro registro de hoje!
                </p>
                {/* 🎯 FIX: Ajustado h-32 para h-40 para que o minHeight=150 não estoure as bordas do pai */}
                <div className="w-full max-w-md h-40 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={150}>
                        <AreaChart data={[
                            { date: '1', mean: minScore + (maxScore - minScore) * 0.4 }, 
                            { date: '2', mean: minScore + (maxScore - minScore) * 0.6 }, 
                            { date: '3', mean: minScore + (maxScore - minScore) * 0.85 }
                        ]}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[minScore, maxScore]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" strokeWidth={3} isAnimationActive={true} animationDuration={1500} animationEasing="ease-in-out" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

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

                <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/50 rounded-2xl p-1 shadow-inner backdrop-blur-sm">
                    {SCENARIO_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setScenario(opt.id)}
                            aria-label={`Selecionar cenário ${opt.fullLabel}`}
                            aria-pressed={scenario === opt.id}
                            className={`relative px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-150 rounded-2xl will-change-transform ${scenario === opt.id ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:scale-[1.01]'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 border border-white/5">
                        <Target size={12} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Meta: <strong className="text-white">{unit === 'horas' ? formatDuration(targetScore) : unit === '%' ? formatValue(targetScore) : targetScore} {unit}</strong>
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
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md rounded-xl text-center p-6 border border-white/5">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                            <TrendingUp size={32} className="text-blue-500/60" />
                        </div>
                        <p className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Ponto Único Registrado</p>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                            Aguardando o próximo registro para traçar a evolução.
                            <br /><strong className="text-blue-400"> Nota Atual: {unit === 'horas' ? formatDuration(scenarioAdjustedData[0]?.mean ?? minScore) : unit === '%' ? formatValue(scenarioAdjustedData[0]?.mean ?? minScore) : scenarioAdjustedData[0]?.mean ?? minScore} {unit}</strong>
                        </p>
                    </div>
                )}

                {formattedData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={300}>
                        {/* 🎯 FIX: margin right de 10 -> 30 para evitar que a última data seja mastigada pelo limite do componente */}
                        <AreaChart
                            data={scenarioAdjustedData}
                            margin={{ top: 20, right: 30, left: -15, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.35} />
                                    <stop offset={targetOffset} stopColor="#10b981" stopOpacity={0.05} />
                                    <stop offset={targetOffset} stopColor="#60a5fa" stopOpacity={0.25} />
                                    <stop offset={1} stopColor="#60a5fa" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id={`targetGlow-${rawId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.12} />
                                    <stop offset={1} stopColor="#10b981" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />
                            
                            {/* Glowing Target Zone */}
                            <ReferenceArea y1={targetScore} y2={maxScore} fill={`url(#targetGlow-${rawId})`} />
                            <ReferenceLine 
                                y={targetScore} 
                                stroke="#10b981" 
                                strokeDasharray="4 2" 
                                strokeWidth={1.5}
                                label={{ value: `Meta`, fill: '#10b981', fontSize: 9, position: 'insideTopLeft', dy: 2 }}
                            />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => {
                                    if (!val) return '';
                                    const d = new Date(val);
                                    if (isNaN(d.getTime())) return val;
                                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                                }}
                                stroke="#475569"
                                fontSize={9}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={{ stroke: '#334155' }}
                                dy={8}
                                minTickGap={20}
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={9}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={{ stroke: '#334155' }}
                                dx={-5}
                                width={45}
                                domain={[minScore, maxScore]}
                                allowDataOverflow={false}
                                tickCount={6}
                                tickFormatter={(v) => unit === 'horas' ? formatDuration(v) : `${formatValue(v)}${unit}`}
                            />
                            <Tooltip
                                offset={200}
                                content={renderTooltip}
                                cursor={{ stroke: '#ffffff33', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <Area connectNulls
                                type="linear" 
                                dataKey="ciRange"
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                isAnimationActive={true}
                                animationDuration={1500}
                                animationEasing="ease-in-out"
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="mean"
                                stroke="#60a5fa"
                                strokeWidth={3}
                                fill="none"
                                activeDot={{ r: 5, strokeWidth: 2, fill: '#60a5fa', stroke: '#ffffff', className: "animate-pulse shadow-lg" }}
                                dot={scenarioAdjustedData.length < 40 ? { 
                                    r: Math.max(1.5, 4 - (scenarioAdjustedData.length / 12)), 
                                    strokeWidth: 1.5, 
                                    fill: '#0f172a', 
                                    stroke: '#60a5fa' 
                                } : false}
                                isAnimationActive={true}
                                animationDuration={1500}
                                animationEasing="ease-in-out"
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="projectedMean"
                                stroke="#818cf8"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                fill="none"
                                isAnimationActive={true}
                                animationDuration={1500}
                                animationEasing="ease-in-out"
                                dot={false}
                                activeDot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : scenarioAdjustedData.length === 0 ? null : (
                    <div className="w-full h-full opacity-10 pointer-events-none blur-sm">
                    <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={1}>
                        <AreaChart data={[{ mean: minScore }, { mean: scenarioAdjustedData[0]?.mean ?? minScore }, { mean: minScore }]}>
                            <YAxis hide domain={[minScore, maxScore]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" />
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-col gap-2 px-2">
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                    <p className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-2">
                        <AlertCircle size={14} /> Entenda este gráfico
                    </p>
                    <div className="flex flex-col gap-3 mt-2">
                        <div className="flex items-start gap-3 bg-blue-500/10 p-3 rounded-lg border-l-4 border-blue-400 border-y border-r border-blue-500/20">
                            <p className="text-[11.5px] text-blue-100 leading-relaxed">
                                <strong className="text-blue-400 text-xs tracking-wide uppercase">Linha Azul (O Seu Passado):</strong> Mostra a sua evolução real. Atenção: este gráfico <strong>não mostra as notas dos seus simulados</strong>. Ele mostra qual era a <strong>previsão da sua nota no dia da prova</strong> a cada dia que passou. Se a linha está subindo, você está ficando mais preparado.
                            </p>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-indigo-500/10 p-3 rounded-lg border-l-4 border-indigo-400 border-dashed border-y border-r border-indigo-500/20">
                            <p className="text-[11.5px] text-indigo-100 leading-relaxed">
                                <strong className="text-indigo-400 text-xs tracking-wide uppercase">Linha Tracejada Roxa (O Seu Futuro):</strong> É para onde você está indo. O robô pega o seu ritmo atual e desenha onde a sua nota vai parar no dia da prova se você continuar estudando desse jeito. 
                            </p>
                        </div>

                        <div className="flex items-start gap-3 bg-emerald-500/10 p-3 rounded-lg border-l-4 border-emerald-400 border-dashed border-y border-r border-emerald-500/20">
                            <p className="text-[11.5px] text-emerald-100 leading-relaxed">
                                <strong className="text-emerald-400 text-xs tracking-wide uppercase">Linha Pontilhada Verde (O Seu Objetivo):</strong> A nota que você quer tirar. O jogo é simples: faça a linha azul e a roxa ultrapassarem essa marca verde.
                            </p>
                        </div>
                    </div>
                </div>
                {qualitySignal && qualitySignal.color.includes('red') && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-1 animate-pulse">
                        <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-2">
                            <AlertCircle size={14} /> Alerta de Tendência
                        </p>
                        <p className="text-[11px] text-red-200 leading-relaxed">
                            Suas projeções recentes estão apontando para baixo. Isso indica que os seus últimos resultados puxaram a expectativa para o dia da prova para um nível crítico. Considere revisar seus métodos de estudo e focar nos tópicos com pior desempenho.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 pt-3 border-t border-white/5 opacity-50 px-2 gap-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    A área sombreada representa o IC 95% da projeção (Margem de erro e incerteza probabilística).
                </p>
                <span className="text-[9px] font-bold font-mono text-slate-400 bg-black px-2 py-0.5 rounded-md border border-white/5 whitespace-nowrap">
                    N = {scenarioAdjustedData.length} registros
                </span>
            </div>
        </div>
    );
};
