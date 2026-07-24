import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

import {
    BrainCircuit, Zap, Target, Sparkles,
    ChevronDown, AlertTriangle, TrendingDown,
    Clock, CheckCircle2, Database, Flame, Loader2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { displaySubject } from '../utils/displaySubject';
import { getSafeId } from '../utils/idGenerator';

// FIX-BUG-02: Regex com escape correto para **, !!, ++
function renderRecommendation(text, depth = 0) {
  if (depth > 6) return String(text || '');
  const safeText = String(text || '');
  const parts = safeText.split(/(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g).filter(Boolean);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`rec-${idx}`} className="text-white not-italic drop-shadow-[0_0_8px_currentColor]">
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </strong>
      );
    }
    if (part.startsWith('!!') && part.endsWith('!!')) {
      return (
        <span key={`rec-${idx}`} className="text-rose-500 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </span>
      );
    }
    if (part.startsWith('++') && part.endsWith('++')) {
      return (
        <span key={`rec-${idx}`} className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </span>
      );
    }

    let cleanPart = part;
    if (!part.startsWith('**') && !part.startsWith('!!') && !part.startsWith('++')) {
      cleanPart = part.replace(/\*\*|!!|\+\+/g, '');
    }
    return <React.Fragment key={`rec-${idx}`}>{cleanPart}</React.Fragment>;
  });
}

function getUrgencyConfig(score, status = '') {
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const s = status.toLowerCase();
    if (s.includes('urgente') || numericScore > 70) return {
        tier: 'CRÍTICO', Icon: Flame,
        border: 'border-red-500/45', glow: 'shadow-red-900/40',
        badge: 'bg-red-500/15 text-red-300 border-red-500/30',
        bar: 'from-red-600 to-rose-500', accent: 'text-red-400',
        stripe: 'from-red-600/15', pulse: 'bg-red-500', line: 'via-red-500'
    };
    if (s.includes('médio') || numericScore > 50) return {
        tier: 'ALTO', Icon: TrendingDown,
        border: 'border-orange-500/45', glow: 'shadow-orange-900/30',
        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        bar: 'from-orange-600 to-amber-500', accent: 'text-orange-400',
        stripe: 'from-orange-600/12', pulse: 'bg-orange-500', line: 'via-orange-500'
    };
    if (numericScore > 25) return {
        tier: 'MÉDIO', Icon: Clock,
        border: 'border-amber-500/40', glow: 'shadow-amber-900/20',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        bar: 'from-amber-500 to-yellow-400', accent: 'text-amber-400',
        stripe: 'from-amber-500/10', pulse: 'bg-amber-400', line: 'via-amber-400'
    };
    return {
        tier: 'ESTÁVEL', Icon: CheckCircle2,
        border: 'border-emerald-500/40', glow: 'shadow-emerald-900/20',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        bar: 'from-emerald-500 to-teal-400', accent: 'text-emerald-400',
        stripe: 'from-emerald-500/10', pulse: 'bg-emerald-400', line: 'via-emerald-400'
    };
}

function MetricChip({ label, value, index }) {
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      className="group/chip relative flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-md p-3 sm:p-4 transition-all cursor-default overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-transparent opacity-0 group-hover/chip:opacity-10 transition-opacity" />
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 leading-[1.35] truncate min-w-0 block group-hover/chip:text-slate-400 transition-colors pb-px">
        {label}
      </span>
      <span className="text-sm font-black text-slate-100 tracking-tight leading-[1.25] truncate min-w-0 block pb-px">
        {value === null || value === undefined
          ? '—'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)}
      </span>
    </Motion.div>
  );
}

function UrgencyBar({ score, cfg }) {
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const pct = Math.min(100, Math.max(0, numericScore));
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 leading-[1.35]">Urgência</span>
                <span className={`text-[11px] font-black ${cfg.accent}`}>{Math.round(pct)}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.06]">
                <Motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                    className={`h-full rounded-full bg-gradient-to-r ${cfg.bar}`}
                />
            </div>
        </div>
    );
}

function MonteCarloGauge({ mc }) {
  if (!mc || mc.probability == null) return null;

  const rawProb = Number.isFinite(Number(mc.probability)) ? Number(mc.probability) : 0;
  const prob = Math.min(100, Math.max(0, rawProb));

  const rawLow = Number.isFinite(Number(mc.ci95Low)) ? Number(mc.ci95Low) : prob - 5;
  const low = Math.min(100, Math.max(0, rawLow));

  const rawHigh = Number.isFinite(Number(mc.ci95High)) ? Number(mc.ci95High) : prob + 5;
  const high = Math.min(100, Math.max(0, rawHigh));

  const volatility = Number.isFinite(Number(mc.volatility)) ? Number(mc.volatility) : 0;

  const isCritical = prob < (mc.thresholds?.danger ?? 30);
  const color = isCritical
    ? 'bg-red-400'
    : prob >= (mc.thresholds?.safe ?? 90)
      ? 'bg-emerald-400'
      : 'bg-indigo-400';

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 bg-black/40 border border-white/10 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 text-white/5">
        <BrainCircuit size={48} />
      </div>

      <div className="relative z-10 flex justify-between items-end mb-2">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">
            Projeção MC (Matéria)
          </span>
          <span className="text-2xl font-black text-white tracking-tighter">{Math.round(prob)}%</span>
        </div>

        <div className="text-right">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">
            Volatilidade
          </span>
          <span className="text-xs font-mono font-bold text-amber-400">±{Math.round(volatility)} pts</span>
        </div>
      </div>

      <div className="relative h-2.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05] my-3">
        <Motion.div
          initial={{ width: 0 }}
          animate={{ left: `${low}%`, width: `${Math.max(0, high - low)}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 bottom-0 bg-white/10 rounded-full"
        />
        <Motion.div
          initial={{ left: 0 }}
          animate={{ left: `${prob}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`absolute top-0 bottom-0 w-1.5 rounded-full ${color} shadow-[0_0_12px_rgba(0,0,0,0.8)]`}
        />
      </div>

      <div className="flex justify-between mt-3 px-0.5">
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
            Pior Cenário
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round(low)}%</span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
            Teto Probabilístico
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round(high)}%</span>
        </div>
      </div>
    </Motion.div>
  );
}

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showMatrix, setShowMatrix] = useState(false);
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion?.urgency?.details ?? { hasData: false };
    const urgencyScoreRaw = suggestion?.urgency?.normalizedScore ?? suggestion?.urgency?.score ?? 0;
    const urgencyScore = Number.isFinite(Number(urgencyScoreRaw)) ? Number(urgencyScoreRaw) : 0;
    const statusLabel = String(urgency?.humanReadable?.Status || '');

    const calibrationOps = activeContest?.calibrationOps || {};

    let suggestionKey = '';
    try {
      suggestionKey = getSafeId(suggestion);
    } catch {
      suggestionKey = String(suggestion?.id || suggestion?.name || '');
    }

    const isDegraded = Boolean(
      calibrationOps[suggestionKey]?.degraded ||
      (suggestion?.id && calibrationOps[suggestion.id]?.degraded)
    );

    const cfg = getUrgencyConfig(urgencyScore, statusLabel);
    const { tier, Icon: TierIcon } = cfg;
    const sortedHumanReadable = Object.entries(urgency.humanReadable || {}).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative mb-8 w-full border ${cfg.border} bg-[#08090f]/80 backdrop-blur-2xl shadow-2xl ${cfg.glow} overflow-hidden group/widget`}
        >
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl ${cfg.stripe} to-transparent pointer-events-none rounded-full blur-[120px] opacity-50`} />

            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-80`} />

            <div className="relative z-10 p-5 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full ${cfg.pulse} animate-pulse shrink-0 shadow-[0_0_8px_currentColor]`} />
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-bold text-slate-200 truncate">Motor de Produtividade</span>
                            {suggestion.globalProjectedMean != null && Number.isFinite(Number(suggestion.globalProjectedMean)) && (
                                <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md tracking-wider">
                                  GLOBAL {Number(suggestion.globalProjectedMean)}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {Number.isFinite(Number(urgency?.crunchMultiplier)) && Number(urgency.crunchMultiplier) > 1 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span className="whitespace-nowrap">CRÍTICO ×{Number(urgency.crunchMultiplier).toFixed(1).replace(/\.0$/, '')}</span>
                            </div>
                        )}
                        {isDegraded && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <Database size={12} className="shrink-0" />
                                <span className="whitespace-nowrap">CALIBRAÇÃO DEGRADADA</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${cfg.badge} shrink-0`}>
                            <TierIcon size={12} className="shrink-0" />
                            <span className="whitespace-nowrap">{tier === 'Standard' ? 'Padrão' : tier}</span>
                        </div>
                        {onGenerateGoals && (
                            <button
                                onClick={onGenerateGoals}
                                disabled={loading}
                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                                {loading ? 'Calculando...' : 'Recalcular'}
                            </button>
                        )}
                    </div>
                </div>

                {!urgency.hasData ? (
                    <div className="flex flex-col md:flex-row items-center gap-8 py-12 px-8 bg-white/[0.02] border border-white/5 shadow-inner">
                        <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-2xl">
                            <Database size={32} className="text-slate-600" />
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Sincronização Necessária</h3>
                            <p className="text-slate-500 leading-relaxed max-w-md font-medium">
                                Realize novos simulados para alimentar o algoritmo de recomendação e desbloquear as metas de alta performance.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_320px] gap-8 xl:gap-12 items-center">
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${cfg.bar}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alvo Prioritário</span>
                                    {statusLabel && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                            {statusLabel.replace(/[🔥⚡✓]/gu, '').trim()}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                                        {displaySubject(suggestion.name)}
                                    </h2>
                                    {topic && (
                                        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-bold tracking-tight ${cfg.badge} hover:bg-white/[0.05] transition-colors cursor-default`}>
                                            <Target size={16} />
                                            <span className="truncate max-w-[200px] sm:max-w-[300px]" title={typeof topic === 'string' ? topic : topic?.name}>
                                                {typeof topic === 'string' ? topic : (topic?.name || 'Tópico Geral')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col justify-center h-full">
                                {suggestion.urgency?.recommendation && (
                                    <Motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative p-5 sm:p-6 bg-black/40 backdrop-blur-xl border border-white/[0.05] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] group/status hover:border-white/10 transition-all duration-500 overflow-hidden"
                                    >
                                        <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${cfg.stripe} to-transparent opacity-20 blur-2xl pointer-events-none rounded-full`} />

                                        <div className="flex items-start gap-4 relative z-10">
                                            <div className={`p-3 rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent border ${cfg.border} shadow-inner shrink-0 group-hover/status:scale-110 transition-transform duration-500`}>
                                                <Sparkles size={20} className={`${cfg.accent} drop-shadow-[0_0_8px_currentColor]`} />
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-1 pt-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.pulse} animate-pulse`} />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Motivo da Recomendação</span>
                                                </div>
                                                <p className="text-sm sm:text-[15px] text-slate-100 leading-relaxed font-medium mt-1">
                                                    {renderRecommendation(suggestion.urgency.recommendation)}
                                                </p>
                                            </div>
                                        </div>
                                    </Motion.div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <UrgencyBar score={urgencyScore} cfg={cfg} />
                                {suggestion.urgency?.details?.monteCarlo && (
                                    <MonteCarloGauge mc={suggestion.urgency.details.monteCarlo} />
                                )}

                                {suggestion.urgency?.details?.monteCarlo?.diagnostics && (
                                    <div className="text-[8px] bg-slate-900/50 border border-white/5 p-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-400 font-mono">
                                        <div className="flex justify-between col-span-2">
                                            <span>MC</span>
                                            <span className="text-emerald-300">{suggestion.urgency.details.monteCarlo.diagnostics.simulationCount} sims</span>
                                        </div>
                                        {suggestion.urgency.details.monteCarlo.diagnostics?.modelHealth != null && (
                                            <div>Health: {Number(suggestion.urgency.details.monteCarlo.diagnostics.modelHealth).toFixed(1)}</div>
                                        )}
                                        {suggestion.urgency.details.monteCarlo?.healthAdjustedProb != null && (
                                            <div>Adj: {Number(suggestion.urgency.details.monteCarlo.healthAdjustedProb).toFixed(0)}%</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={() => setShowMatrix(!showMatrix)}
                                className="flex items-center justify-between w-full sm:w-auto gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all py-3 px-4 sm:px-6 rounded-md bg-white/[0.03] border border-white/[0.05] hover:border-white/20"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <BrainCircuit size={14} className={`shrink-0 ${showMatrix ? cfg.accent : 'text-slate-600'} transition-colors`} />
                                    <span className="truncate">Matriz de Telemetria</span>
                                </div>
                                <Motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0">
                                    <ChevronDown size={14} />
                                </Motion.div>
                            </button>

                            <AnimatePresence>
                                {showMatrix && (
                                    <Motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex flex-wrap gap-2 sm:gap-3 pt-6">
                                            {sortedHumanReadable.map(([k, v], i) => (
                                                <div key={`metric-${k}-${i}`} className="flex-1 min-w-[130px] sm:min-w-[150px] max-w-full">
                                                    <MetricChip label={k} value={v} index={i} />
                                                </div>
                                            ))}
                                        </div>
                                        {urgency?.monteCarlo?.explainability?.note && (
                                            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                                                <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 font-black mb-1">
                                                    Explicabilidade Monte Carlo
                                                </p>
                                                <p className="text-[10px] text-cyan-100/70 mb-2">
                                                    Qualidade da calibração: <span className="font-black uppercase">{urgency.monteCarlo.explainability.calibrationQuality || 'n/a'}</span>
                                                    {urgency.monteCarlo.explainability.confidenceAdjusted
                                                        ? ` • ajuste ${Number.isFinite(Number(urgency.monteCarlo.explainability.confidenceAdjustmentPct)) ? Number(urgency.monteCarlo.explainability.confidenceAdjustmentPct) : 0}%`
                                                        : ''}
                                                </p>
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {urgency.monteCarlo.explainability.note}
                                                </p>
                                            </div>
                                        )}

                                        {urgency?.monteCarlo?.diagnostics && (
                                            <div className="mt-3 text-[9px] text-slate-400 bg-white/[0.015] rounded p-2 border border-white/5">
                                                <div>Simulações: <span className="font-mono text-slate-200">{urgency.monteCarlo.diagnostics.simulationCount}</span></div>
                                                {urgency.monteCarlo.diagnostics.convergence && <div>Convergência: {urgency.monteCarlo.diagnostics.convergence.sufficient ? '✓ Boa' : '⚠ Parcial'} (SE {Number(urgency.monteCarlo.diagnostics.convergence.achievedSE).toFixed(4)})</div>}
                                                {urgency.monteCarlo.diagnostics.effectiveN && <div>Effective N: <span className="font-mono">{Number(urgency.monteCarlo.diagnostics.effectiveN).toFixed(1)}</span></div>}
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