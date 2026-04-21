import React, { useState } from 'react';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */
import { Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2, LayoutGrid, List, Target } from 'lucide-react';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';

function AICoachCard({ task, idx }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const fullText = task.text || task.title || '';
    const parts = fullText.split(':');
    const hasDetails = parts.length > 1;

    let subjectPart = hasDetails ? parts[0] : fullText;
    let actionPart  = hasDetails ? parts.slice(1).join(':').trim() : 'Revisão Geral';
    subjectPart = subjectPart.replace(/Foco em /i, '').replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();

    let topicPart = '';
    const topicMatch = actionPart.match(/^\[(.*?)\]\s*(.*)/);
    if (topicMatch) { topicPart = topicMatch[1]; actionPart = topicMatch[2].trim(); }

    const displayAssunto = topicPart || (actionPart.length > 50 ? actionPart.substring(0, 47) + '…' : actionPart);
    const displayMeta    = topicPart ? actionPart : (actionPart !== 'Revisão Geral' ? actionPart : 'Foco em exercícios e revisão');

    const CARD_COLORS = [
        { accent: 'border-l-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-300' },
        { accent: 'border-l-cyan-500',   dot: 'bg-cyan-500',   badge: 'bg-cyan-500/10 text-cyan-300' },
        { accent: 'border-l-emerald-500',dot: 'bg-emerald-500',badge: 'bg-emerald-500/10 text-emerald-300' },
        { accent: 'border-l-rose-500',   dot: 'bg-rose-500',   badge: 'bg-rose-500/10 text-rose-300' },
        { accent: 'border-l-amber-500',  dot: 'bg-amber-500',  badge: 'bg-amber-500/10 text-amber-300' },
    ];
    const col = CARD_COLORS[idx % CARD_COLORS.length];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, ease: 'easeOut' }}
            className={`group relative flex flex-col p-5 rounded-2xl bg-[#0a0c14] border border-white/[0.06] border-l-2 ${col.accent} hover:bg-white/[0.03] transition-all duration-300 overflow-hidden`}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.015] blur-2xl rounded-full pointer-events-none" />
            <div className="relative z-10 flex justify-between items-start mb-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${col.badge}`}>
                    {subjectPart}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${col.dot} opacity-60 group-hover:opacity-100 transition-opacity mt-1`} />
            </div>
            <div className="relative z-10 flex-1 mb-4">
                <h3 className="text-base font-black text-white leading-snug mb-1.5 group-hover:text-slate-100 transition-colors tracking-tight">
                    {displayAssunto}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{displayMeta}</p>
            </div>
            {task.analysis && (
                <div className="relative z-10 mt-auto pt-3 border-t border-white/[0.06]">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-300 transition-colors py-1">
                        <BrainCircuit size={11} /> Insight do Coach
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={11} /></motion.div>
                    </button>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="pt-3 space-y-2">
                                    <p className="text-xs text-slate-400 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">{task.analysis.reason}</p>
                                    {task.analysis.metrics && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {Object.entries(task.analysis.metrics).map(([key, value]) => (
                                                <div key={key} className="bg-white/[0.04] border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                                    <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{key}</span>
                                                    <span className="text-[10px] font-mono text-slate-300 font-bold">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}

export default function AICoachView({ suggestedFocus, onGenerateGoals, loading, onClearHistory }) {
    const [isExporting, setIsExporting] = useState(false);
    const [viewMode, setViewMode] = useState('planner');
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const coachPlanner  = activeContest?.coachPlanner || {};
    const coachPlan     = activeContest?.coachPlan || [];

    const handleExport = async () => {
        setIsExporting(true);
        await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_AICoach.pdf', 'portrait');
        setIsExporting(false);
    };

    const hasPlan = coachPlan && coachPlan.length > 0;

    return (
        <div id="ai-coach-container" className="space-y-0 pb-20 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div className="relative pt-8 pb-8 mb-2">
                <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/25 flex items-center justify-center shadow-xl shadow-violet-900/20">
                                <Sparkles size={24} className="text-violet-300" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-500 border-2 border-[#07080f]">
                                <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full bg-violet-500" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)' }}>Executive Coach</h1>
                                <span className="text-[9px] text-violet-400 uppercase tracking-widest font-black bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">Beta</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Inteligência Estratégica de Estudos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <motion.span key={coachPlan.length} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="block text-3xl font-black text-white leading-none">{coachPlan.length}</motion.span>
                            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Metas Ativas</span>
                        </div>
                        <div className="w-px h-10 bg-white/[0.07]" />
                        <button onClick={handleExport} disabled={isExporting} className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:bg-white/[0.1] hover:border-white/15 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="group-hover:-translate-y-0.5 transition-transform" />}
                            <span>{isExporting ? 'Exportando…' : 'Salvar Plano'}</span>
                        </button>
                    </div>
                </div>
                <div className="mt-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>

            <div className="py-4">
                {suggestedFocus ? (
                    <AICoachWidget suggestion={suggestedFocus} onGenerateGoals={onGenerateGoals} loading={loading} />
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 p-10 rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                        <Target size={28} className="text-slate-600 mx-auto mb-3" />
                        <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Clique em "Recalcular" para gerar uma análise</p>
                    </motion.div>
                )}
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-indigo-600" />
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Execução Semanal</h2>
                        </div>
                        {hasPlan && (
                            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] p-1 rounded-xl">
                                {[{ id: 'planner', label: 'Planner', Icon: LayoutGrid }, { id: 'list', label: 'Lista', Icon: List }].map(({ id, label, Icon }) => (
                                    <button key={id} onClick={() => setViewMode(id)} className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${viewMode === id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                        {viewMode === id && <motion.div layoutId="viewTab" className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600/80 to-indigo-600/80 border border-violet-500/30" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                                        <span className="relative z-10 flex items-center gap-1.5"><Icon size={11} />{label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {hasPlan && (
                        <button onClick={onClearHistory} className="group flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-red-400 uppercase tracking-widest transition-all duration-200 py-1.5 px-3 rounded-lg border border-transparent hover:border-red-500/15 hover:bg-red-500/5">
                            <Trash2 size={12} className="group-hover:rotate-12 transition-transform" /> Limpar Plano
                        </button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {!hasPlan ? (
                        <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-white/[0.05] bg-white/[0.01]">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center"><Compass size={22} className="text-slate-500" /></div>
                            <div><p className="text-sm font-black text-slate-400 tracking-tight">Nenhum plano ativo</p><p className="text-xs text-slate-600 mt-1 max-w-[260px] mx-auto leading-relaxed">Solicite uma análise para gerar metas personalizadas de estudo.</p></div>
                        </motion.div>
                    ) : viewMode === 'planner' ? (
                        <motion.div key="planner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AICoachPlanner /></motion.div>
                    ) : (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                                const allAssignedIds = new Set();
                                Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
                                return coachPlan.filter(task => !allAssignedIds.has(getSafeId(task))).map((task, idx) => <AICoachCard key={getSafeId(task) || idx} task={task} idx={idx} />);
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
