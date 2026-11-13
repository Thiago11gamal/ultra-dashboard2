import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

import {
    BrainCircuit, Zap, Target, Sparkles,
    ChevronDown, AlertTriangle, TrendingDown,
    Clock, CheckCircle2, Database, Flame,
    Activity, Gauge
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { displaySubject } from '../utils/displaySubject';
import { getSafeId } from '../utils/idGenerator';

function renderRecommendation(text) {
    const safeText = String(text || '');
    // BUG-04 FIX: Unified with AICoachView — non-greedy .*? handles special chars inside bold
    const parts = safeText.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`rec-${idx}`} className="text-white not-italic font-bold">{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={`rec-${idx}`}>{part}</React.Fragment>;
    });
}

function getUrgencyConfig(score, status = '') {
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const s = status.toLowerCase();
    if (s.includes('urgente') || numericScore > 70) return {
        tier: 'CRÍTICO', Icon: Flame,
        border: 'border-rose-500/35', glow: 'shadow-[0_0_50px_-15px_rgba(244,63,94,0.3)]',
        badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        bar: 'from-rose-600 via-rose-500 to-amber-500', accent: 'text-rose-400',
        stripe: 'from-rose-600/15', pulse: 'bg-rose-500', line: 'via-rose-500/70',
        lightBg: 'bg-rose-500/[0.03]'
    };
    if (s.includes('médio') || numericScore > 50) return {
        tier: 'ALTO', Icon: TrendingDown,
        border: 'border-orange-500/35', glow: 'shadow-[0_0_50px_-15px_rgba(249,115,22,0.25)]',
        badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
        bar: 'from-orange-600 via-amber-500 to-amber-400', accent: 'text-orange-400',
        stripe: 'from-orange-600/12', pulse: 'bg-orange-500', line: 'via-orange-500/70',
        lightBg: 'bg-orange-500/[0.03]'
    };
    if (numericScore > 25) return {
        tier: 'MÉDIO', Icon: Clock,
        border: 'border-amber-500/35', glow: 'shadow-[0_0_50px_-15px_rgba(245,158,11,0.2)]',
        badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        bar: 'from-amber-500 via-yellow-400 to-emerald-400', accent: 'text-amber-400',
        stripe: 'from-amber-500/10', pulse: 'bg-amber-400', line: 'via-amber-400/70',
        lightBg: 'bg-amber-500/[0.03]'
    };
    return {
        tier: 'ESTÁVEL', Icon: CheckCircle2,
        border: 'border-emerald-500/35', glow: 'shadow-[0_0_50px_-15px_rgba(16,185,129,0.2)]',
        badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        bar: 'from-emerald-500 via-teal-400 to-cyan-400', accent: 'text-emerald-400',
        stripe: 'from-emerald-500/10', pulse: 'bg-emerald-400', line: 'via-emerald-400/70',
        lightBg: 'bg-emerald-500/[0.03]'
    };
}

function MetricChip({ label, value, index }) {
    return (
        <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.25 }}
            whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
            className="group/chip relative flex flex-col justify-between gap-1.5 bg-black/40 border border-white/[0.06] hover:border-white/15 rounded-xl p-3 transition-all cursor-default overflow-hidden shadow-sm"
        >
            <span
                className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate block group-hover/chip:text-slate-300 transition-colors"
                title={label}
            >
                {label}
            </span>
            <span
                className="text-xs sm:text-sm font-black font-mono text-slate-100 tracking-tight truncate block"
                title={String(value)}
            >
                {value}
            </span>
        </Motion.div>
    );
}

function MonteCarloGauge({ mc, scaleMax = 100, scaleMin = 0 }) {
    const rawProbValue = mc?.probability ?? mc?.probabilityRaw;
    if (!mc || rawProbValue == null || !Number.isFinite(Number(rawProbValue))) return null;

    const rawProb = Number(rawProbValue);
    const prob = Math.min(100, Math.max(0, rawProb));
    const toPct = (value) => {
        const range = Math.max(1e-9, scaleMax - scaleMin);
        return Math.min(100, Math.max(0, ((value - scaleMin) / range) * 100));
    };
    const rawVolatility = Number.isFinite(Number(mc.volatility)) ? Math.max(0, Number(mc.volatility)) : 0;
    const volatilityLabel = rawVolatility > 0 && rawVolatility < 0.5 ? '<1' : String(Math.round(rawVolatility));
    const volHalfBand = Math.max(5, Math.min(22, (rawVolatility / Math.max(1, scaleMax - scaleMin)) * 100 * 1.5));

    // FIX: Usar intervalo conformal de probabilidade (conformalLow / conformalHigh) ou banda probabilística ao redor de `prob`
    // em vez de ci95Low/ci95High (que estão na escala de nota projetada e ficavam deslocados do marcador de probabilidade).
    const hasConformalLow = mc.conformalLow !== null && mc.conformalLow !== undefined && mc.conformalLow !== '' && Number.isFinite(Number(mc.conformalLow));
    const hasConformalHigh = mc.conformalHigh !== null && mc.conformalHigh !== undefined && mc.conformalHigh !== '' && Number.isFinite(Number(mc.conformalHigh));
    const rawProbLow = hasConformalLow ? Math.min(prob, Number(mc.conformalLow)) : (prob - volHalfBand);
    const rawProbHigh = hasConformalHigh ? Math.max(prob, Number(mc.conformalHigh)) : (prob + volHalfBand);
    const low = Math.min(prob, Math.max(0, rawProbLow));
    const high = Math.min(100, Math.max(prob, low, rawProbHigh));

    const hasScoreLow = mc.ci95Low !== null && mc.ci95Low !== undefined && mc.ci95Low !== '' && Number.isFinite(Number(mc.ci95Low));
    const hasScoreHigh = mc.ci95High !== null && mc.ci95High !== undefined && mc.ci95High !== '' && Number.isFinite(Number(mc.ci95High));
    const scoreLowPct = hasScoreLow ? Math.round(toPct(Number(mc.ci95Low))) : null;
    const scoreHighPct = hasScoreHigh ? Math.round(toPct(Number(mc.ci95High))) : null;

    const dangerThreshold = mc.thresholds?.danger != null && Number.isFinite(Number(mc.thresholds.danger))
        ? Number(mc.thresholds.danger)
        : 30;
    const safeThreshold = mc.thresholds?.safe != null && Number.isFinite(Number(mc.thresholds.safe))
        ? Number(mc.thresholds.safe)
        : 90;
    const isCritical = prob < dangerThreshold;
    const color = isCritical ? 'bg-red-400' : (prob >= safeThreshold ? 'bg-emerald-400' : 'bg-indigo-400');
    const dotGlow = isCritical ? 'shadow-[0_0_12px_rgba(239,68,68,0.8)]' : (prob >= safeThreshold ? 'shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'shadow-[0_0_12px_rgba(99,102,241,0.8)]');

    const safeBarWidth = Math.max(0, Math.min(100 - low, high - low));
    const safeProbPos = Math.max(2, Math.min(98, prob));

    return (
        <div className="flex flex-col gap-3">
            {/* Top row: Projection & Volatility */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <span className="text-[9.5px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-0.5">
                        Projeção MC (Matéria)
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                            {Math.round(prob)}%
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Volatilidade
                    </span>
                    <span className="inline-block text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        ±{volatilityLabel} pts
                    </span>
                </div>
            </div>

            {/* Confidence Interval Visualizer */}
            <div className="space-y-1.5 pt-0.5">
                <div className="relative h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.08]">
                    {/* 95% Confidence Band */}
                    <Motion.div
                        initial={{ width: 0 }}
                        animate={{ left: `${low}%`, width: `${safeBarWidth}%` }}
                        transition={{ duration: 1.4, ease: "easeOut" }}
                        className="absolute top-0 bottom-0 bg-white/15 rounded-full"
                    />

                    {/* Exact Probability Marker */}
                    <Motion.div
                        initial={{ left: '0%' }}
                        animate={{ left: `calc(${safeProbPos}% - 4px)` }}
                        transition={{ duration: 1.4, ease: "easeOut" }}
                        className={`absolute top-0 bottom-0 w-2 rounded-full ${color} ${dotGlow}`}
                    />
                </div>

                {/* Min / Max Labels */}
                <div className="flex justify-between items-center text-[9px] font-mono px-0.5">
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest font-sans font-bold">Pior Cenário:</span>
                        <span className="font-bold text-slate-300">{Math.round(low)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest font-sans font-bold">Teto Probabilístico:</span>
                        <span className="font-bold text-slate-300">{Math.round(high)}%</span>
                    </div>
                </div>
                {scoreLowPct !== null && scoreHighPct !== null && (
                    <div className="flex justify-between items-center text-[8.5px] font-mono px-0.5 pt-0.5 text-slate-400/80">
                        <span className="uppercase tracking-wider font-sans font-bold text-[8px]">IC 95% Nota Projetada:</span>
                        <span className="font-bold text-slate-300">
                            {scoreLowPct}% – {scoreHighPct}%
                            {scoreLowPct === 0 && scoreHighPct === 100 && (
                                <span className="text-[7.5px] text-slate-500 font-sans ml-1 font-normal">(amostra em formação)</span>
                            )}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AICoachWidget({ suggestion }) {
    const [showMatrix, setShowMatrix] = useState(false);
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion?.urgency?.details ?? { hasData: false };
    const urgencyScoreRaw = suggestion?.urgency?.normalizedScore ?? suggestion?.urgency?.score ?? 0;
    const urgencyScore = Number.isFinite(Number(urgencyScoreRaw)) ? Number(urgencyScoreRaw) : 0;
    const statusLabel = String(urgency.humanReadable?.Status ?? '');

    // Check if category is degraded from calibrationOps
    const calibrationOps = activeContest?.calibrationOps || {};
    const safeCatId = suggestion.id || suggestion.categoryId || suggestion.name || suggestion.subject;
    const canonicalSafeId = getSafeId(safeCatId);
    const isDegraded = Boolean(
        (suggestion.id && (calibrationOps[suggestion.id]?.degraded || calibrationOps[getSafeId(suggestion.id)]?.degraded)) ||
        (suggestion.categoryId && (calibrationOps[suggestion.categoryId]?.degraded || calibrationOps[getSafeId(suggestion.categoryId)]?.degraded)) ||
        (suggestion.name && (calibrationOps[suggestion.name]?.degraded || calibrationOps[getSafeId(suggestion.name)]?.degraded)) ||
        (suggestion.category && (calibrationOps[suggestion.category]?.degraded || calibrationOps[getSafeId(suggestion.category)]?.degraded)) ||
        (suggestion.subject && (calibrationOps[suggestion.subject]?.degraded || calibrationOps[getSafeId(suggestion.subject)]?.degraded)) ||
        (canonicalSafeId && calibrationOps[canonicalSafeId]?.degraded) ||
        (safeCatId && Object.entries(calibrationOps).some(([k, v]) => v?.degraded && (k === safeCatId || k.toLowerCase() === String(safeCatId).toLowerCase() || k === canonicalSafeId)))
    );

    const cfg = getUrgencyConfig(urgencyScore, statusLabel);
    const { tier, Icon: TierIcon } = cfg;
    const sortedHumanReadable = Object.entries(urgency.humanReadable || {}).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
    const rawGlobalMeanCandidate = suggestion.globalProjectedMean ?? suggestion.urgency?.details?.globalMcContext?.projectedMean;
    const globalMeanRaw = rawGlobalMeanCandidate !== null && rawGlobalMeanCandidate !== undefined && rawGlobalMeanCandidate !== '' ? Number(rawGlobalMeanCandidate) : NaN;
    const scaleMax = Math.max(1, Number(activeContest?.maxScore ?? activeContest?.settings?.maxScore ?? suggestion?.maxScore) || 100);
    const rawGlobalMin = activeContest?.minScore ?? activeContest?.settings?.minScore ?? suggestion?.minScore;
    const scaleMin = Number.isFinite(Number(rawGlobalMin)) ? Math.min(Number(rawGlobalMin), scaleMax - 1) : 0;
    const matchedCategory = Array.isArray(activeContest?.categories)
        ? activeContest.categories.find(c => c && (
            (suggestion.id && c.id === suggestion.id) ||
            (suggestion.categoryId && c.id === suggestion.categoryId) ||
            (suggestion.name && c.name === suggestion.name) ||
            (suggestion.subject && c.name === suggestion.subject)
        ))
        : null;
    const categoryScaleMax = Math.max(1, Number(matchedCategory?.maxScore ?? suggestion?.maxScore ?? scaleMax) || 100);
    const rawCatMin = matchedCategory?.minScore ?? suggestion?.minScore ?? scaleMin;
    const categoryScaleMin = Number.isFinite(Number(rawCatMin)) ? Math.min(Number(rawCatMin), categoryScaleMax - 1) : 0;
    const globalPct = Number.isFinite(globalMeanRaw)
        ? Math.max(0, Math.min(100, ((globalMeanRaw - scaleMin) / (scaleMax - scaleMin)) * 100))
        : null;

    return (
        <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative w-full rounded-2xl border ${cfg.border} bg-[#080911]/90 backdrop-blur-2xl shadow-2xl ${cfg.glow} overflow-hidden group/widget transition-colors duration-500`}
        >
            {/* Background Atmosphere */}
            <div className={`absolute top-0 right-0 w-[500px] max-w-full h-[500px] bg-gradient-to-bl ${cfg.stripe} to-transparent pointer-events-none rounded-full blur-[130px] opacity-40`} />

            {/* Top Energy Line */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-90`} />

            <div className="relative z-10 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.pulse} animate-pulse shrink-0 shadow-[0_0_10px_currentColor]`} />
                        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                            <span className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                                Motor de Produtividade
                            </span>
                            {globalPct !== null && (
                                <div
                                    className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-md tracking-wider shadow-sm"
                                    title={`Projeção global: ${globalMeanRaw.toFixed(1)} / ${scaleMax} pts`}
                                >
                                    <Gauge size={11} className="text-emerald-400 shrink-0" />
                                    <span>GLOBAL {Math.round(globalPct)}%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {Number.isFinite(Number(urgency?.crunchMultiplier)) && Number(urgency.crunchMultiplier) > 1 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                <Zap size={12} className="text-amber-400 shrink-0" />
                                <span className="whitespace-nowrap">CRUNCH ×{Number(urgency.crunchMultiplier).toFixed(1).replace(/\.0$/, '')}</span>
                            </div>
                        )}
                        {isDegraded && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                <Database size={12} className="text-rose-400 shrink-0" />
                                <span className="whitespace-nowrap">CALIBRAÇÃO DEGRADADA</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${cfg.badge} shadow-sm`}>
                            <TierIcon size={12} className="shrink-0" />
                            <span className="whitespace-nowrap">{tier}</span>
                        </div>
                    </div>
                </div>

                {!urgency.hasData ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 py-10 px-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                        <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-2xl">
                            <Database size={28} className="text-slate-500" />
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Sincronização Necessária</h3>
                            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md font-medium">
                                Realize novos simulados para alimentar o algoritmo de recomendação e desbloquear as metas de alta performance.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* 2-Panel Architectural Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                            {/* Left Panel: Strategic Target & Recommendation */}
                            <div className="lg:col-span-7 flex flex-col gap-4 justify-between">
                                {/* Alvo Prioritário */}
                                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/[0.07] backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                                    <div className="flex items-center justify-between gap-3 mb-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1 h-3.5 rounded-full bg-gradient-to-b ${cfg.bar}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Alvo Prioritário
                                            </span>
                                        </div>
                                        {statusLabel && (
                                            <span className="text-[9.5px] font-bold text-slate-300 bg-white/[0.05] border border-white/[0.08] px-2.5 py-0.5 rounded-md">
                                                {statusLabel.replace(/[🔥⚡✓]/gu, '').trim()}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                                            {displaySubject(suggestion.name || suggestion.subject || suggestion.category || 'Disciplina', activeContest?.categories)}
                                        </h2>

                                        {topic && (
                                            <div className="flex items-center gap-2">
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-bold text-slate-200">
                                                    <Target size={13} className="text-cyan-400 shrink-0" />
                                                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Tópico:</span>
                                                    <span className="text-white">{topic.name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Motivo da Recomendação */}
                                {suggestion.urgency?.recommendation && (
                                    <div className="flex-1 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.035] via-black/30 to-black/50 border border-white/[0.07] relative overflow-hidden flex flex-col justify-center shadow-lg">
                                        {/* Ambient accent aura */}
                                        <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl ${cfg.stripe} to-transparent opacity-20 blur-2xl pointer-events-none rounded-full`} />

                                        <div className="relative z-10 flex items-start gap-3.5">
                                            <div className={`p-2.5 rounded-xl bg-black/40 border ${cfg.border} shadow-md shrink-0 mt-0.5`}>
                                                <Sparkles size={16} className={`${cfg.accent} drop-shadow-[0_0_8px_currentColor]`} />
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.pulse} animate-pulse`} />
                                                    <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                        Motivo da Recomendação
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                                                    {renderRecommendation(suggestion.urgency.recommendation)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Panel: Telemetry & Simulation Console */}
                            <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden shadow-2xl">
                                {/* Urgency Progress */}
                                <div className="mb-4 pb-3.5 border-b border-white/[0.06]">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Activity size={13} className={cfg.accent} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Nível de Urgência
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-sm font-black font-mono ${cfg.accent}`}>
                                                {Math.round(urgencyScore)}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold">/100</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                                        <Motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, Math.max(0, urgencyScore))}%` }}
                                            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                                            className={`h-full rounded-full bg-gradient-to-r ${cfg.bar}`}
                                        />
                                    </div>
                                </div>

                                {/* Monte Carlo Gauge */}
                                {suggestion.urgency?.details?.monteCarlo && (
                                    <MonteCarloGauge
                                        mc={suggestion.urgency.details.monteCarlo}
                                        scaleMax={categoryScaleMax}
                                        scaleMin={categoryScaleMin}
                                    />
                                )}

                                {/* Simulation Diagnostics Footnote */}
                                {suggestion.urgency?.details?.monteCarlo?.diagnostics && (
                                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Simulações:</span>
                                            <span className="text-slate-200 font-bold">
                                                {suggestion.urgency.details.monteCarlo.diagnostics.simulationCount?.toLocaleString('pt-BR') || suggestion.urgency.details.monteCarlo.diagnostics.simulationCount} sims
                                            </span>
                                        </div>
                                        {suggestion.urgency.details.monteCarlo.diagnostics?.modelHealth != null && Number.isFinite(Number(suggestion.urgency.details.monteCarlo.diagnostics.modelHealth)) && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Saúde:</span>
                                                <span className="text-emerald-400 font-bold">
                                                    {Number(suggestion.urgency.details.monteCarlo.diagnostics.modelHealth).toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                        {suggestion.urgency.details.monteCarlo?.healthAdjustedProb != null && Number.isFinite(Number(suggestion.urgency.details.monteCarlo.healthAdjustedProb)) && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Ajuste:</span>
                                                <span className="text-indigo-300 font-bold">
                                                    {Number(suggestion.urgency.details.monteCarlo.healthAdjustedProb).toFixed(0)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Full-Width Telemetry Matrix Toggle & Drawer */}
                        <div className="mt-5 pt-4 border-t border-white/[0.06]">
                            <button
                                type="button"
                                aria-expanded={showMatrix}
                                onClick={() => setShowMatrix(!showMatrix)}
                                className="w-full flex items-center justify-between p-3 sm:px-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/15 transition-all text-slate-300 group/btn"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`p-1.5 rounded-lg bg-black/40 border border-white/5 ${showMatrix ? cfg.accent : 'text-slate-400'} group-hover/btn:text-white transition-colors`}>
                                        <BrainCircuit size={14} className="shrink-0" />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-200 group-hover/btn:text-white transition-colors">
                                            Matriz de Telemetria
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {sortedHumanReadable.length} parâmetros
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 group-hover/btn:text-slate-200">
                                    <span className="hidden sm:inline tracking-wider uppercase text-[9px]">
                                        {showMatrix ? 'Recolher' : 'Expandir'}
                                    </span>
                                    <Motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                                        <ChevronDown size={14} />
                                    </Motion.div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {showMatrix && (
                                    <Motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                                        className="overflow-hidden"
                                    >
                                        {/* Metric Chips Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-4">
                                            {sortedHumanReadable.map(([k, v], i) => (
                                                <MetricChip key={`metric-${k}-${i}`} label={k} value={v} index={i} />
                                            ))}
                                        </div>

                                        {/* Monte Carlo Explainability */}
                                        {urgency?.monteCarlo?.explainability?.note && (
                                            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-black/40 p-3.5 backdrop-blur-sm">
                                                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                                    <span className="text-[9.5px] uppercase tracking-[0.18em] text-cyan-300 font-black">
                                                        Explicabilidade Monte Carlo
                                                    </span>
                                                    <span className="text-[9.5px] text-cyan-200/80 font-mono">
                                                        Calibração: <strong className="text-white uppercase">{urgency.monteCarlo.explainability.calibrationQuality || 'n/a'}</strong>
                                                        {urgency.monteCarlo.explainability.confidenceAdjusted && (
                                                            <> • ajuste {Number.isFinite(Number(urgency.monteCarlo.explainability.confidenceAdjustmentPct)) ? Number(urgency.monteCarlo.explainability.confidenceAdjustmentPct) : 0}%</>
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {urgency.monteCarlo.explainability.note}
                                                </p>
                                            </div>
                                        )}

                                        {/* Technical Diagnostics */}
                                        {urgency?.monteCarlo?.diagnostics && (
                                            <div className="mt-2.5 text-[9.5px] text-slate-400 bg-white/[0.015] rounded-xl p-3 border border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-mono">
                                                <div>Simulações: <span className="text-slate-200 font-bold">{urgency.monteCarlo.diagnostics.simulationCount}</span></div>
                                                {urgency.monteCarlo.diagnostics.convergence && (
                                                    <div>Convergência: <span className="text-emerald-400">{urgency.monteCarlo.diagnostics.convergence.sufficient ? '✓ Boa' : '⚠ Parcial'}</span> (SE {urgency.monteCarlo.diagnostics.convergence.achievedSE})</div>
                                                )}
                                                {urgency.monteCarlo.diagnostics.effectiveN != null && Number.isFinite(Number(urgency.monteCarlo.diagnostics.effectiveN)) && (
                                                    <div>Effective N: <span className="text-slate-200 font-bold">{Number(urgency.monteCarlo.diagnostics.effectiveN).toFixed(1)}</span></div>
                                                )}
                                            </div>
                                        )}
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </Motion.div>
    );
}