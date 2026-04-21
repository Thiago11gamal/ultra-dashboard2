import React, { useState } from 'react';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */
import {
    BrainCircuit, Zap, Target, Sparkles,
    ChevronDown, AlertTriangle, TrendingDown,
    Clock, CheckCircle2, Database, Flame
} from 'lucide-react';

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
    if (s.includes('estável') || score > 25) return {
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
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            className="flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 transition-all cursor-default relative overflow-hidden group/chip"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-transparent opacity-0 group-hover/chip:opacity-10 transition-opacity" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 leading-none truncate group-hover/chip:text-slate-400 transition-colors">{label}</span>
            <span className="text-sm font-black text-slate-100 tracking-tight leading-none truncate">{value}</span>
        </motion.div>
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
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                    className={`h-full rounded-full bg-gradient-to-r ${cfg.bar}`}
                />
            </div>
        </div>
    );
}

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showMatrix, setShowMatrix] = useState(false);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion?.urgency?.details ?? { hasData: false };
    const urgencyScore = suggestion?.urgency?.score ?? 0;
    const statusLabel = urgency.humanReadable?.Status ?? '';
    const cfg = getUrgencyConfig(urgencyScore, statusLabel);
    const { tier, Icon: TierIcon } = cfg;

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={`relative mb-10 w-full rounded-2xl border ${cfg.border} bg-[#08090f] shadow-2xl ${cfg.glow} overflow-hidden group/widget`}
        >
            <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-70`} />
            <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl ${cfg.stripe} to-transparent pointer-events-none rounded-full blur-3xl`} />
            
            {/* Horizontal Scan Line */}
            <motion.div 
                animate={{ top: ['-10%', '110%'] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className={`absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-20 pointer-events-none z-0`} 
            />

            <div className="relative z-10 p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                        <div className="relative flex items-center">
                            <div className={`w-2 h-2 rounded-full ${cfg.pulse}`} />
                            <motion.div
                                animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2.2, repeat: Infinity }}
                                className={`absolute inset-0 rounded-full ${cfg.pulse}`}
                            />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            AI Coach <span className="text-slate-700 mx-1.5">•</span> Análise Ativa
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {urgency.crunchMultiplier > 1 && (
                            <motion.span
                                animate={{ opacity: [1, 0.55, 1] }}
                                transition={{ duration: 1.4, repeat: Infinity }}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest"
                            >
                                <AlertTriangle size={9} />
                                Reta Final ×{urgency.crunchMultiplier}
                            </motion.span>
                        )}
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${cfg.badge}`}>
                            <TierIcon size={10} />
                            {tier}
                        </span>
                    </div>
                </div>

                {!urgency.hasData ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 py-8 px-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Database size={28} className="text-slate-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white mb-1 tracking-tight">Análise Pendente</h3>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                                Complete simulados para que a IA possa traçar seu perfil de desempenho e gerar metas otimizadas.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Foco Prioritário</span>
                                    {statusLabel && (
                                        <>
                                            <span className="w-px h-3 bg-white/10" />
                                            <span className="text-[9px] font-medium text-slate-500">
                                                {statusLabel.replace(/[🔥⚡✓]/gu, '').trim()}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.1] mb-4">
                                    {suggestion.name}
                                </h2>
                                {topic && (
                                    <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-bold ${cfg.badge}`}>
                                        <Target size={13} />
                                        <span>{topic.name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <UrgencyBar score={urgencyScore} cfg={cfg} />
                                {suggestion.urgency?.recommendation && (
                                    <div className={`relative rounded-xl overflow-hidden border border-white/5`}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b ${cfg.bar}`} />
                                        <p className="px-4 py-3 text-xs text-slate-400 leading-relaxed italic">
                                            "{suggestion.urgency.recommendation}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <button
                                onClick={() => setShowMatrix(!showMatrix)}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-200 transition-colors py-1.5"
                            >
                                <BrainCircuit size={12} className={showMatrix ? cfg.accent : ''} />
                                Matriz Neural
                                <motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown size={11} />
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {showMatrix && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.22 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-3">
                                            {Object.entries(urgency.humanReadable || {}).map(([k, v], i) => (
                                                <MetricChip key={k} label={k} value={v} index={i} />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                <div className="mt-7 pt-5 border-t border-white/[0.06]">
                    <button
                        onClick={onGenerateGoals}
                        disabled={loading}
                        className={`group relative w-full py-4 rounded-xl font-black text-sm tracking-[0.1em] uppercase transition-all duration-300 overflow-hidden
                            bg-gradient-to-r ${cfg.bar} text-white shadow-lg
                            hover:opacity-90 hover:-translate-y-0.5 hover:shadow-2xl
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0
                            flex items-center justify-center gap-3`}
                    >
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                        />
                        {loading
                            ? <><Sparkles size={17} className="animate-spin" /><span>Algoritmo Processando…</span></>
                            : <><Zap size={17} className="fill-white" /><span>Recalcular Plano Inteligente</span></>
                        }
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
