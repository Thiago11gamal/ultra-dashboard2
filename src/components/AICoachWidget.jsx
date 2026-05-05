import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

import {
    BrainCircuit, Zap, Target, Sparkles,
    ChevronDown, AlertTriangle, TrendingDown,
    Clock, CheckCircle2, Database, Flame, Loader2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { displaySubject } from '../utils/displaySubject';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)


function renderRecommendation(text) {
    const safeText = String(text || '');
    const parts = safeText.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`rec-${idx}`} className="text-white not-italic">{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={`rec-${idx}`}>{part}</React.Fragment>;
    });
}

function getUrgencyConfig(score, status = '') {
    const s = status.toLowerCase();
    if (s.includes('urgente') || score > 70) return {
        tier: 'CRÍTICO', Icon: Flame,
        border: 'border-red-500/45', glow: 'shadow-red-900/40',
        badge: 'bg-red-500/15 text-red-300 border-red-500/30',
        bar: 'from-red-600 to-rose-500', accent: 'text-red-400',
        stripe: 'from-red-600/15', pulse: 'bg-red-500', line: 'via-red-500'
    };
    if (s.includes('médio') || score > 50) return {
        tier: 'ALTO', Icon: TrendingDown,
        border: 'border-orange-500/45', glow: 'shadow-orange-900/30',
        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        bar: 'from-orange-600 to-amber-500', accent: 'text-orange-400',
        stripe: 'from-orange-600/12', pulse: 'bg-orange-500', line: 'via-orange-500'
    };
    if (score > 25) return {
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
            transition={{ delay: index * 0.05, duration: 0.4 }}
            whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            className="flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 transition-all cursor-default relative overflow-hidden group/chip"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-transparent opacity-0 group-hover/chip:opacity-10 transition-opacity" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 leading-none truncate group-hover/chip:text-slate-400 transition-colors pl-1">{label}</span>
            <span className="text-sm font-black text-slate-100 tracking-tight leading-none truncate pl-1">{value}</span>
        </Motion.div>
    );
}

function UrgencyBar({ score, cfg }) {
    const pct = Math.min(100, Math.max(0, score || 0));
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Urgência</span>
                <span className={`text-[11px] font-black ${cfg.accent}`}>{Math.round(pct)}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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

export default function AICoachWidget({ suggestion }) {
    const [showMatrix, setShowMatrix] = useState(false);
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion?.urgency?.details ?? { hasData: false };
    // VIS-06 FIX: urgency.score é o valor RAW (pode ser 0–200+), não 0–100.
    // getUrgencyConfig e UrgencyBar esperam escala 0–100.
    // Usar normalizedScore que já está normalizado pela função calculateUrgency.
    const urgencyScore = suggestion?.urgency?.normalizedScore ?? suggestion?.urgency?.score ?? 0;
    const cfg = getUrgencyConfig(urgencyScore, statusLabel);
    const { tier, Icon: TierIcon } = cfg;
    const sortedHumanReadable = Object.entries(urgency.humanReadable || {}).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative mb-8 w-full rounded-3xl border ${cfg.border} bg-[#08090f]/80 backdrop-blur-2xl shadow-2xl ${cfg.glow} overflow-visible group/widget`}
        >
            {/* Background Atmosphere */}
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl ${cfg.stripe} to-transparent pointer-events-none rounded-full blur-[120px] opacity-50`} />

            {/* Top Energy Line */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-80`} />

            {/* Neural Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

            {/* Scanning Laser */}
            <Motion.div
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className={`absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-30 pointer-events-none z-10`}
            />

            <div className="relative z-10 p-5 sm:p-8">
                {/* Header Section */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="relative flex items-center justify-center w-12 h-12 shrink-0 rounded-2xl bg-black/40 border border-white/10">
                            <div className={`w-2.5 h-2.5 rounded-full ${cfg.pulse} shadow-[0_0_12px_rgba(255,255,255,0.5)]`} />
                            <Motion.div
                                animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`absolute inset-0 rounded-2xl ${cfg.pulse}`}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 truncate">Motor de Produtividade</span>
                                <span className="w-1 h-1 rounded-full bg-white/20 shrink-0 hidden sm:block" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.accent} shrink-0`}>V4.2 Online</span>
                            </div>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest truncate">Análise de Redes Neurais em Tempo Real</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {urgency.crunchMultiplier > 1 && (
                            <Motion.div
                                animate={{ opacity: [1, 0.6, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest shrink-0"
                            >
                                <AlertTriangle size={12} className="shrink-0" />
                                <span className="whitespace-nowrap">CRÍTICO ×{urgency.crunchMultiplier}</span>
                            </Motion.div>
                        )}
                        {isDegraded && (
                             <Motion.div
                                animate={{ opacity: [1, 0.7, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="flex items-center gap-2 px-4 sm:px-6 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.2)] shrink-0"
                             >
                                <Database size={12} className="text-rose-400 shrink-0" />
                                <span className="whitespace-nowrap">CALIBRAÇÃO DEGRADADA</span>
                             </Motion.div>
                        )}
                        <div className={`flex items-center gap-2 px-4 sm:px-6 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-[0.15em] ${cfg.badge} shadow-lg shadow-black/20 shrink-0`}>
                            <TierIcon size={12} className="shrink-0" />
                            <span className="whitespace-nowrap">{tier === 'Standard' ? 'Padrão' : tier}</span>
                        </div>
                    </div>
                </div>

                {!urgency.hasData ? (
                    <div className="flex flex-col md:flex-row items-center gap-8 py-12 px-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
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
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${cfg.bar}`} />
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Alvo Prioritário</span>
                                    {statusLabel && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                            {statusLabel.replace(/[🔥⚡✓]/gu, '').trim()}
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tighter leading-tight sm:leading-none mb-6 group-hover/widget:translate-x-1 transition-transform duration-500">
                                    {displaySubject(suggestion.name)}
                                </h2>

                                {topic && (
                                    <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border text-base font-black tracking-tight ${cfg.badge} hover:scale-105 transition-transform cursor-default`}>
                                        <Target size={18} />
                                        <span>{topic.name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <UrgencyBar score={urgencyScore} cfg={cfg} />
                                {suggestion.urgency?.recommendation && (
                                    <Motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 group/quote"
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${cfg.bar} shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                                        <div className="p-5">
                                            {/* VIS-10 FIX: substituir **texto** por <strong> antes de renderizar.
                                                Antes, os asteriscos duplos apareciam literais no texto. */}
                                            <p className="text-xs text-slate-400 leading-relaxed font-medium italic group-hover/quote:text-slate-200 transition-colors">
                                                "{renderRecommendation(suggestion.urgency.recommendation)}"
                                            </p>
                                        </div>
                                    </Motion.div>
                                )}
                            </div>
                        </div>

                        {/* Neural Matrix Toggle */}
                        <div className="pt-4">
                            <button
                                onClick={() => setShowMatrix(!showMatrix)}
                                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-white transition-all py-3 px-6 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/20"
                            >
                                <BrainCircuit size={14} className={`${showMatrix ? cfg.accent : 'text-slate-600'} transition-colors`} />
                                Matriz de Telemetria
                                <Motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.3 }}>
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
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 pt-6">
                                            {sortedHumanReadable.map(([k, v], i) => (
                                                <MetricChip key={`metric-${k}-${i}`} label={k} value={v} index={i} />
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
                                                        ? ` • ajuste ${urgency.monteCarlo.explainability.confidenceAdjustmentPct}%`
                                                        : ''}
                                                </p>
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {urgency.monteCarlo.explainability.note}
                                                </p>
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
