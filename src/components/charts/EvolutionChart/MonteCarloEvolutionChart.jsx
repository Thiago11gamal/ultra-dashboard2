import React, { useMemo, useId, useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration, normalizeDate } from '../../../utils/dateHelper';
import { formatValue, formatPercent, normalizeScoreDomain } from '../../../utils/scoreHelper';
import { applyScenarioAdjustments, classifyScenarioSignal } from '../../../utils/monteCarloScenario.js';

const MonteCarloTooltip = React.memo(({ active, payload, unit, targetScore, maxScore, minScore }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        const fullDate = dataPoint.fullDate;

        // Operador de coalescência nula garante falhas seguras e respeita o piso (minScore)
        const pointTarget = Math.max(minScore, Math.min(maxScore, (dataPoint.target === null || dataPoint.target === undefined || dataPoint.target === '') ? targetScore : (Number.isFinite(Number(dataPoint.target)) ? Number(dataPoint.target) : targetScore)));
        const pointMean = Math.max(minScore, Math.min(maxScore, (dataPoint.mean === null || dataPoint.mean === undefined || dataPoint.mean === '') ? minScore : (Number.isFinite(Number(dataPoint.mean)) ? Number(dataPoint.mean) : minScore)));
        const projMean = dataPoint.projectedMean != null && Number.isFinite(Number(dataPoint.projectedMean)) ? Math.max(minScore, Math.min(maxScore, Number(dataPoint.projectedMean))) : pointMean;
        const pointProb = Math.max(0, Math.min(100, (dataPoint.probability === null || dataPoint.probability === undefined || dataPoint.probability === '') ? 0 : (Number.isFinite(Number(dataPoint.probability)) ? Number(dataPoint.probability) : 0)));
        const pointLow = dataPoint.ciRange?.[0] ?? pointMean;
        const pointHigh = dataPoint.ciRange?.[1] ?? pointMean;

        const isGood = pointMean >= pointTarget;

        return (
            <div className="bg-slate-950/80 border border-white/10 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-[210px]">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 border-b border-white/10 pb-2">{fullDate}</p>

                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        Nota projetada
                        <span className={`text-3xl font-black leading-none ${isGood ? 'text-green-400' : 'text-blue-400'}`}>
                            {unit === 'horas' ? formatDuration(pointMean) : unit === '%' ? formatValue(pointMean) : pointMean} <span className="text-sm text-slate-500 ml-1">{unit}</span>
                        </span>
                        {isGood && (
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-1 animate-pulse flex items-center gap-1">
                                🚀 Na zona de aprovação
                            </span>
                        )}
                    </div>
                    <div className="mt-2 bg-black/40 rounded-lg border border-white/5 p-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400">{dataPoint.date === 'Hoje' || dataPoint.date === 'HOJE' ? 'Hoje:' : 'Esperado:'}</span>
                            <span className="text-[10px] font-mono text-white">
                                {unit === 'horas' ? formatDuration(pointMean) : `${formatValue(pointMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-indigo-400">Projeção:</span>
                            <span className="text-[10px] font-mono text-indigo-300">
                                {unit === 'horas' ? formatDuration(projMean) : `${formatValue(projMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-1 border-t border-white/5 pt-1 mt-1">
                            Cone (IC 95%):
                            <span className="text-[10px] font-mono text-white">
                                {unit === 'horas' ? `${formatDuration(pointLow)} ~ ${formatDuration(pointHigh)}` : `${formatValue(pointLow)}${unit} ~ ${formatValue(pointHigh)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            Chance de sucesso:
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

    const { safeMin, safeMax, range: domainRange, clamp } = useMemo(() => normalizeScoreDomain(minScore, maxScore), [minScore, maxScore]);
    const safeTargetScore = clamp(targetScore);

    const targetOffset = useMemo(() => {
        const pct = 1 - (safeTargetScore - safeMin) / domainRange;
        return Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
    }, [safeTargetScore, domainRange, safeMin]);

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data
            .filter(d => d?.date)
            .map(d => ({ ...d, parsedDate: normalizeDate(d.date) }))
            .filter(d => isValid(d.parsedDate))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;

                displayDate = format(d.parsedDate, 'dd/MM', { locale: ptBR });
                fullDate = format(d.parsedDate, 'dd MMM yyyy', { locale: ptBR });

                // Sanitização: manter intervalo de confiança dentro do domínio e com ordem válida
                const meanRaw = (d.mean === null || d.mean === undefined || d.mean === '') ? minScore : (Number.isFinite(Number(d.mean)) ? Number(d.mean) : minScore);
                const mean = Math.max(minScore, Math.min(maxScore, meanRaw));
                const rawLow = (d.ci95Low === null || d.ci95Low === undefined || d.ci95Low === '') ? mean : (Number.isFinite(Number(d.ci95Low)) ? Number(d.ci95Low) : mean);
                const rawHigh = (d.ci95High === null || d.ci95High === undefined || d.ci95High === '') ? mean : (Number.isFinite(Number(d.ci95High)) ? Number(d.ci95High) : mean);
                const boundedLow = Math.max(minScore, Math.min(maxScore, rawLow));
                const boundedHigh = Math.max(minScore, Math.min(maxScore, rawHigh));
                const low = Math.min(boundedLow, boundedHigh);
                const high = Math.max(boundedLow, boundedHigh);

                let probRaw = Number(d.probability);
                let probability = 0;
                if (Number.isFinite(probRaw)) {
                    if (probRaw > 0 && probRaw <= 1) probRaw = probRaw * 100;
                    probability = Math.max(0, Math.min(100, probRaw));
                }

                return {
                    ...d,
                    displayDate,
                    fullDate,
                    mean,
                    projectedMean: (d.projectedMean === null || d.projectedMean === undefined || d.projectedMean === '') ? mean : (Number.isFinite(Number(d.projectedMean)) ? Math.max(minScore, Math.min(maxScore, Number(d.projectedMean))) : mean),
                    probability,
                    ciRange: [low, high]
                };
            });
    }, [data, minScore, maxScore]);


    const scenarioAdjustedData = useMemo(
        () => applyScenarioAdjustments(formattedData, scenario, maxScore, minScore),
        [formattedData, scenario, maxScore, minScore]
    );

    const displayData = useMemo(() => {
        return scenarioAdjustedData;
    }, [scenarioAdjustedData]);

    const qualitySignal = useMemo(() => classifyScenarioSignal(scenarioAdjustedData, maxScore, minScore), [scenarioAdjustedData, maxScore, minScore]);

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
        (props) => <MonteCarloTooltip {...props} unit={unit} targetScore={safeTargetScore} maxScore={maxScore} minScore={minScore} />,
        [unit, safeTargetScore, maxScore, minScore]
    );

    if (formattedData.length <= 1) {
        return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950/40 rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-black text-slate-200 mb-2 uppercase tracking-widest text-center">
                    Nenhum ponto registrado
                </h3>
                <p className="text-xs text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
                    {formattedData.length === 0 
                        ? 'A evolução do Monte Carlo é registrada gradualmente conforme o motor calcula as projeções diárias. Aguarde o primeiro registro de hoje.'
                        : 'É necessário ter pelo menos dois dias de projeções diferentes para traçar a linha do tempo da evolução. Continue estudando para gerar mais dados.'}
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
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[400px] flex flex-col py-4 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <TrendingUp size={16} className="text-blue-400" />
                    </div>
                    <div>
                        Rastreador de aprovação
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sua trajetória rumo à aprovação</p>
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
                            Meta: <strong className="text-white">{unit === 'horas' ? formatDuration(safeTargetScore) : unit === '%' ? formatValue(safeTargetScore) : safeTargetScore} {unit}</strong>
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
                <div className="px-2 mb-2 flex items-center gap-3">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">
                        Premissas do modelo:
                    </p>
                    <span className="text-[9px] font-bold text-slate-300">
                        {mcAssumptions.points} registros
                    </span>
                    <span className="text-[9px] font-bold text-slate-300">
                        IC: {formatValue(mcAssumptions.ciWidth)}{unit}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300">
                        Cenário: {mcAssumptions.scenario}
                    </span>
                </div>
            )}

            <div className="w-full relative h-[360px] flex items-center justify-center">
                {displayData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={300}>
                        {/* 🎯 FIX: margin right de 10 -> 30 para evitar que a última data seja mastigada pelo limite do componente */}
                        <AreaChart
                            data={displayData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.35} />
                                    <stop offset={targetOffset} stopColor="#10b981" stopOpacity={0.05} />
                                    <stop offset={targetOffset} stopColor="#60a5fa" stopOpacity={0.25} />
                                    <stop offset={1} stopColor="#60a5fa" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id={`targetGlow-${rawId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.0} />
                                    <stop offset={1} stopColor="#10b981" stopOpacity={0.12} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />
                            
                            {/* Glowing Target Zone */}
                            <ReferenceArea y1={safeTargetScore} y2={maxScore} fill={`url(#targetGlow-${rawId})`} />
                            <ReferenceLine 
                                y={safeTargetScore} 
                                stroke="#10b981" 
                                strokeDasharray="4 2" 
                                strokeWidth={1.5}
                                label={{ value: `Meta`, fill: '#10b981', fontSize: 9, position: 'insideTopLeft', dy: 2 }}
                            />
                            <XAxis
                                dataKey="displayDate"
                                tickFormatter={(val) => val}
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
                                offset={20}
                                content={renderTooltip}
                                cursor={{ stroke: '#ffffff33', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <Area connectNulls
                                type="linear" 
                                dataKey="ciRange"
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                isAnimationActive={false}
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
                                isAnimationActive={false}
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="projectedMean"
                                stroke="#818cf8"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                fill="none"
                                isAnimationActive={false}
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
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} />
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
                                <strong>Linha azul (passado):</strong> Representa a média real do seu desempenho consolidado ao longo do tempo.
                            </p>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-indigo-500/10 p-3 rounded-lg border-l-4 border-indigo-400 border-dashed border-y border-r border-indigo-500/20">
                            <p className="text-[11.5px] text-indigo-100 leading-relaxed">
                                <strong>Linha tracejada roxa (futuro):</strong> É a projeção estatística calculada pelo motor Monte Carlo, simulando cenários futuros de prova.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 bg-emerald-500/10 p-3 rounded-lg border-l-4 border-emerald-400 border-dashed border-y border-r border-emerald-500/20">
                            <p className="text-[11.5px] text-emerald-100 leading-relaxed">
                                <strong>Linha tracejada verde (objetivo):</strong> A meta que você configurou. O sombreamento ao redor mostra a incerteza da projeção.
                            </p>
                        </div>
                    </div>
                </div>
                {qualitySignal && (qualitySignal.color.includes('red') || qualitySignal.color.includes('rose')) && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-1 animate-pulse">
                        <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-2">
                            Alerta de tendência
                        </p>
                        <p className="text-[11px] text-red-200 leading-relaxed">
                            Suas projeções recentes estão caindo. Isso indica que os últimos resultados reduziram a expectativa para o dia da prova. Revise seu método de estudo e foque nos tópicos com pior desempenho.
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

