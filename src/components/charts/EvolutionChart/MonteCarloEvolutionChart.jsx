import React, { useMemo, useId, useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { Target, TrendingUp, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration, normalizeDate, getDateKey } from '../../../utils/dateHelper';
import { formatValue, formatPercent } from '../../../utils/scoreHelper';
import { applyScenarioAdjustments, classifyScenarioSignal } from '../../../utils/monteCarloScenario.js';
import { normalizeProbability } from '../../../utils/evolutionGuards';
import { BenchmarkStrip } from '../../ui/BenchmarkStrip';

const hasValidNumber = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

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

        const isGood = projMean >= pointTarget;

        return (
            <div className="bg-slate-950/90 border border-white/15 p-4 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl min-w-[220px]">
                <div className="flex items-center justify-between gap-2 mb-3 border-b border-white/10 pb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">{fullDate}</span>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">MC Proj</span>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nota projetada</span>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-black font-mono tracking-tight leading-none ${isGood ? 'text-emerald-400' : 'text-sky-400'}`}>
                                {unit === 'horas' ? formatDuration(projMean) : formatValue(projMean)}
                            </span>
                            {unit !== 'horas' && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
                        </div>
                        {isGood && (
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                <Sparkles size={11} className="animate-pulse" /> Na zona de aprovação
                            </span>
                        )}
                    </div>
                    <div className="mt-2 bg-black/40 rounded-xl border border-white/5 p-2.5 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-400">{dataPoint.date === 'Hoje' || dataPoint.date === 'HOJE' ? 'Hoje:' : 'Esperado:'}</span>
                            <span className="font-mono font-bold text-slate-200">
                                {unit === 'horas' ? formatDuration(pointMean) : `${formatValue(pointMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-indigo-400">Projeção:</span>
                            <span className="font-mono font-bold text-indigo-300">
                                {unit === 'horas' ? formatDuration(projMean) : `${formatValue(projMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-1.5">
                            <span className="font-bold text-slate-400">Cone (IC 95%):</span>
                            <span className="font-mono text-slate-300 text-[10px]">
                                {unit === 'horas' ? `${formatDuration(pointLow)} ~ ${formatDuration(pointHigh)}` : `${formatValue(pointLow)}${unit} ~ ${formatValue(pointHigh)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-400">Chance de aprovação:</span>
                            <span className={`font-mono font-black ${pointProb >= 70 ? 'text-emerald-400' : 'text-sky-400'}`}>
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
export const MonteCarloEvolutionChart = React.memo(({ 
    data = [], 
    targetScore = 75, 
    unit = 'pts', 
    minScore = 0, 
    maxScore = 100,
    loading = false
}) => {
    const rawId = useId();
    const safeId = rawId.replace(/:/g, '');
    const gradientId = `colorMonteCarlo-${safeId}`;
    const [scenario, setScenario] = useState('base');
    const scenarioLabels = useMemo(() => Object.fromEntries(SCENARIO_OPTIONS.map(opt => [opt.id, opt.fullLabel])), []);

    const safeMin = hasValidNumber(minScore) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 1;
    
    const safeTargetScore = useMemo(() => {
      const fallback = safeMin + (safeMax - safeMin) * 0.8;
      return Math.max(safeMin, Math.min(safeMax, hasValidNumber(targetScore) ? Number(targetScore) : fallback));
    }, [targetScore, safeMin, safeMax]);

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        const validSorted = data
            .filter(d => d?.date)
            .map(d => ({ ...d, parsedDate: normalizeDate(d.date) }))
            .filter(d => isValid(d.parsedDate))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

        const byDay = new Map();
        validSorted.forEach(item => {
            const dayKey = getDateKey(item.parsedDate) || String(item.parsedDate.getTime());
            byDay.set(dayKey, item);
        });

        return Array.from(byDay.values())
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;

                displayDate = format(d.parsedDate, 'dd/MM', { locale: ptBR });
                fullDate = format(d.parsedDate, 'dd MMM yyyy', { locale: ptBR });

                // Sanitização: manter intervalo de confiança dentro do domínio e com ordem válida
                const meanRaw = (d.mean === null || d.mean === undefined || d.mean === '') ? safeMin : (Number.isFinite(Number(d.mean)) ? Number(d.mean) : safeMin);
                const mean = Math.max(safeMin, Math.min(safeMax, meanRaw));
                const rawLow = (d.ci95Low === null || d.ci95Low === undefined || d.ci95Low === '') ? mean : (Number.isFinite(Number(d.ci95Low)) ? Number(d.ci95Low) : mean);
                const rawHigh = (d.ci95High === null || d.ci95High === undefined || d.ci95High === '') ? mean : (Number.isFinite(Number(d.ci95High)) ? Number(d.ci95High) : mean);
                const boundedLow = Math.max(safeMin, Math.min(safeMax, rawLow));
                const boundedHigh = Math.max(safeMin, Math.min(safeMax, rawHigh));
                const low = Math.min(boundedLow, boundedHigh);
                const high = Math.max(boundedLow, boundedHigh);

                const probability = normalizeProbability(d.probability);

                return {
                    ...d,
                    displayDate,
                    fullDate,
                    mean,
                    projectedMean: (d.projectedMean === null || d.projectedMean === undefined || d.projectedMean === '') ? mean : (Number.isFinite(Number(d.projectedMean)) ? Math.max(safeMin, Math.min(safeMax, Number(d.projectedMean))) : mean),
                    probability,
                    ciRange: [low, high]
                };
            });
    }, [data, safeMin, safeMax]);


    const scenarioAdjustedData = useMemo(
        () => applyScenarioAdjustments(formattedData, scenario, safeMax, safeMin),
        [formattedData, scenario, safeMax, safeMin]
    );

    const displayData = useMemo(() => {
        return scenarioAdjustedData;
    }, [scenarioAdjustedData]);

    const targetOffset = useMemo(() => {
        if (displayData.length > 0) {
            let minCi = Infinity;
            let maxCi = -Infinity;
            for (const item of displayData) {
                const low = Number(item?.ciRange?.[0]);
                const high = Number(item?.ciRange?.[1]);
                if (Number.isFinite(low) && low < minCi) minCi = low;
                if (Number.isFinite(high) && high > maxCi) maxCi = high;
            }
            if (Number.isFinite(minCi) && Number.isFinite(maxCi) && maxCi > minCi) {
                if (safeTargetScore >= maxCi) return 0;
                if (safeTargetScore <= minCi) return 1;
                const pct = 1 - (safeTargetScore - minCi) / (maxCi - minCi);
                return Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
            }
        }
        const range = safeMax - safeMin;
        if (range <= 0 || !Number.isFinite(range)) return 0;
        const pct = 1 - (safeTargetScore - safeMin) / range;
        return Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
    }, [displayData, safeTargetScore, safeMin, safeMax]);

    const qualitySignal = useMemo(() => classifyScenarioSignal(scenarioAdjustedData, safeMax, safeMin), [scenarioAdjustedData, safeMax, safeMin]);

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



    const mcBenchmark = useMemo(() => {
        if (!scenarioAdjustedData.length) return null;
        const latest = scenarioAdjustedData[scenarioAdjustedData.length - 1];
        const proj = Number(latest?.projectedMean ?? latest?.mean);
        if (!Number.isFinite(proj)) return null;
        const diff = proj - safeTargetScore;
        const range = Math.max(1e-9, safeMax - safeMin);
        const gapUnit = unit === '%' ? 'pp' : ` ${unit}`;
        const fmt = (v) => (unit === 'horas' ? formatDuration(v) : `${formatValue(v)}${unit === '%' ? '%' : ` ${unit}`}`);
        const prob = Number(latest?.probability);
        return {
            currentValue: fmt(proj),
            targetValue: fmt(safeTargetScore),
            gapLabel: Math.abs(diff) < 0.05
                ? 'Na meta ✓'
                : (diff > 0 ? `+${formatValue(diff)}${gapUnit} acima` : `Faltam ${formatValue(Math.abs(diff))}${gapUnit}`),
            status: diff >= -0.05 ? 'success' : diff >= -(range * 0.1) ? 'warning' : 'danger',
            progressPct: safeTargetScore > safeMin
                ? ((proj - safeMin) / Math.max(1e-9, safeTargetScore - safeMin)) * 100
                : 100,
            extra: Number.isFinite(prob) ? `Aprovação: ${prob.toFixed(0)}% (alvo ≥ 80%)` : null,
        };
    }, [scenarioAdjustedData, safeTargetScore, safeMin, safeMax, unit]);

    // M1 FIX: Callback estável para o Tooltip — arrow function inline criaria nova referência
    // a cada render, quebrando a memoização do Recharts e causando re-renders desnecessários.
    const renderTooltip = useCallback(
        (props) => <MonteCarloTooltip {...props} unit={unit} targetScore={safeTargetScore} maxScore={safeMax} minScore={safeMin} />,
        [unit, safeTargetScore, safeMax, safeMin]
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
                            { date: '1', mean: safeMin + (safeMax - safeMin) * 0.4 }, 
                            { date: '2', mean: safeMin + (safeMax - safeMin) * 0.6 }, 
                            { date: '3', mean: safeMin + (safeMax - safeMin) * 0.85 }
                        ]}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[safeMin, safeMax]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-[380px] flex flex-col pt-1">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 px-1 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center border border-sky-400/30 text-sky-300 shrink-0">
                        <TrendingUp size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-100 tracking-tight">Rastreador de Aprovação</h3>
                        {mcAssumptions && (
                            <p className="text-[11px] text-slate-400 font-medium">
                                {mcAssumptions.points} registros · IC 95% de {formatValue(mcAssumptions.ciWidth)}{unit === '%' ? ' pp' : ` ${unit}`} · Cenário {mcAssumptions.scenario}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 bg-slate-950/80 border border-white/[0.08] rounded-xl p-1 shadow-inner">
                        {SCENARIO_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setScenario(opt.id)}
                                aria-label={`Selecionar cenário ${opt.fullLabel}`}
                                aria-pressed={scenario === opt.id}
                                className={`relative px-3 py-1 text-[11px] font-bold transition-all duration-200 rounded-lg border ${
                                    scenario === opt.id
                                        ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40 shadow-sm'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-white/[0.08]">
                        <Target size={13} className="text-emerald-400" />
                        <span className="text-[11px] font-semibold text-slate-300">
                            Meta: <strong className="text-white font-mono tabular-nums">{unit === 'horas' ? formatDuration(safeTargetScore) : `${formatValue(safeTargetScore)}${unit === '%' ? '%' : ` ${unit}`}`}</strong>
                        </span>
                    </div>
                    {qualitySignal && (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border backdrop-blur-sm ${qualitySignal.color}`}>
                            {qualitySignal.label}
                        </span>
                    )}
                </div>
            </div>

            {mcBenchmark && (
                <BenchmarkStrip
                    currentLabel="Última projeção"
                    currentValue={mcBenchmark.currentValue}
                    targetLabel="Meta"
                    targetValue={mcBenchmark.targetValue}
                    gapLabel={mcBenchmark.gapLabel}
                    status={mcBenchmark.status}
                    progressPct={mcBenchmark.progressPct}
                    extra={mcBenchmark.extra}
                    compact
                    className="mb-3"
                />
            )}

            {loading && (
              <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                <div className="flex flex-col items-center gap-2.5">
                  <Loader2 size={24} className="animate-spin text-indigo-400" />
                  <span className="text-[11px] font-bold uppercase text-indigo-300 tracking-wider animate-pulse">
                    Recalculando Monte Carlo...
                  </span>
                </div>
              </div>
            )}
            <div className="w-full relative h-[360px] flex items-center justify-center">
                {displayData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={300}>
                        <AreaChart
                            data={displayData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                                    <stop offset={`${Math.round(targetOffset * 100)}%`} stopColor="#10b981" stopOpacity={0.06} />
                                    <stop offset={`${Math.round(targetOffset * 100)}%`} stopColor="#6366f1" stopOpacity={0.22} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id={`targetGlow-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.0} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.10} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            
                            {/* Glowing Target Zone */}
                            <ReferenceArea y1={safeTargetScore} y2={safeMax} fill={`url(#targetGlow-${safeId})`} />
                            <ReferenceLine 
                                y={safeTargetScore} 
                                stroke="#10b981" 
                                strokeDasharray="4 3" 
                                strokeWidth={1.5}
                                label={{ value: `Meta (${unit === 'horas' ? formatDuration(safeTargetScore) : `${formatValue(safeTargetScore)}${unit}`})`, fill: '#10b981', fontSize: 10, fontWeight: 700, position: 'insideTopLeft', dy: 4 }}
                            />
                            <XAxis
                                dataKey="displayDate"
                                tickFormatter={(val) => val}
                                stroke="#64748b"
                                fontSize={10}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                dy={8}
                                minTickGap={20}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={10}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                dx={-5}
                                width={45}
                                domain={[safeMin, safeMax]}
                                allowDataOverflow={false}
                                tickCount={6}
                                tickFormatter={(v) => unit === 'horas' ? formatDuration(v) : `${formatValue(v)}${unit}`}
                            />
                            <Tooltip
                                offset={20}
                                content={renderTooltip}
                                cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
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
                                stroke="#38bdf8"
                                strokeWidth={3}
                                fill="none"
                                activeDot={{ r: 6, strokeWidth: 2, fill: '#38bdf8', stroke: '#ffffff', className: "animate-pulse shadow-lg" }}
                                dot={scenarioAdjustedData.length < 40 ? { 
                                    r: Math.max(1.5, 3.5 - (scenarioAdjustedData.length / 14)), 
                                    strokeWidth: 1.5, 
                                    fill: '#090d16', 
                                    stroke: '#38bdf8' 
                                } : false}
                                isAnimationActive={false}
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="projectedMean"
                                stroke="#a855f7"
                                strokeWidth={2}
                                strokeDasharray="5 4"
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
                        <AreaChart data={[{ mean: safeMin }, { mean: scenarioAdjustedData[0]?.mean ?? safeMin }, { mean: safeMin }]}>
                            <YAxis hide domain={[safeMin, safeMax]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Compact inline legend + trend alert (avoids duplicating the parent "Guia da análise") */}
            <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5 px-1 text-[11px] text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded-full bg-sky-400 inline-block" />
                        <strong className="text-slate-200 font-semibold">Nível na data</strong> (esperado)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 border-t-2 border-dashed border-purple-400 inline-block" />
                        <strong className="text-slate-200 font-semibold">Projeção p/ prova</strong> (MC)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-2 rounded-sm bg-emerald-500/25 border border-emerald-400/50 inline-block" />
                        <strong className="text-slate-200 font-semibold">IC 95% & Meta</strong>
                    </span>
                </div>
                <span className="text-[11px] font-bold font-mono tabular-nums text-slate-300 bg-slate-950/65 px-2.5 py-0.5 rounded-lg border border-white/[0.08] whitespace-nowrap">
                    N = {scenarioAdjustedData.length} registros
                </span>
            </div>

            {qualitySignal && (qualitySignal.hasDowntrend || qualitySignal.color.includes('red') || qualitySignal.color.includes('rose')) && (
                <div className="bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-xl mt-3">
                    <p className="text-xs font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                        <AlertCircle size={14} /> Alerta de tendência
                    </p>
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                        Suas projeções recentes estão caindo. Isso indica que os últimos resultados reduziram a expectativa para o dia da prova. Revise seu método de estudo e foque nos tópicos com pior desempenho.
                    </p>
                </div>
            )}
        </div>
    );
});

