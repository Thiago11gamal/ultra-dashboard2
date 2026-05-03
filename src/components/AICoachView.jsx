import React, { useState } from 'react';
import { Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2, LayoutGrid, List, Target, AlertCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

function AICoachCard({ task, idx, onStartPomodoro }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const fullText = task.text || task.title || '';
    const parts = fullText.split(':');
    const hasDetails = parts.length > 1;

    let subjectPart = hasDetails ? parts[0] : fullText;
    let actionPart = hasDetails ? parts.slice(1).join(':').trim() : 'Revisão Geral';
    subjectPart = subjectPart.replace(/Foco em /i, '').replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();

    let topicPart = '';
    const topicMatch = actionPart.match(/^\[(.*?)\]\s*(.*)/);
    if (topicMatch) { topicPart = topicMatch[1]; actionPart = topicMatch[2].trim(); }

    const displayAssunto = topicPart && topicPart.length > 3 ? topicPart : (actionPart.length > 50 ? actionPart.substring(0, 47) + '…' : actionPart);
    const displayMeta = topicPart ? actionPart : (actionPart !== 'Revisão Geral' ? actionPart : 'Foco em exercícios e revisão');

    const CARD_COLORS = [
        { accent: 'border-l-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-300' },
        { accent: 'border-l-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-300' },
        { accent: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300' },
        { accent: 'border-l-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-300' },
        { accent: 'border-l-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-300' },
    ];
    const col = CARD_COLORS[idx % CARD_COLORS.length];

    return (
        <div
            className={`group relative flex flex-col p-12 rounded-[2.5rem] bg-[#0a0c14] border border-white/[0.06] border-l-8 ${col.accent} hover:bg-white/[0.03] transition-all duration-300 overflow-visible shadow-2xl`}
        >
            <div className="relative z-10 grid grid-cols-[1fr_auto] items-start mb-8 px-10 pt-10">
                <div className="flex flex-col items-start gap-2 min-w-0">
                    <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] ${col.badge} shadow-2xl backdrop-blur-md border border-white/20 ml-2 max-w-full overflow-hidden`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-[0_0_12px_rgba(255,255,255,0.4)] shrink-0`} />
                        <span className="leading-tight whitespace-normal break-words">{displaySubject(subjectPart)}</span>
                    </div>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartPomodoro?.(task);
                    }}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-violet-600 hover:text-white transition-all shadow-xl"
                >
                    <Play size={14} fill="currentColor" />
                </button>
            </div>
            <div className="relative z-10 flex-1 mb-8 px-6">
                <h3 className="text-xl font-black text-white leading-tight mb-3 tracking-tighter">
                    {displayAssunto}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{displayMeta}</p>
            </div>
            {task.analysis && (
                <div className="relative z-10 mt-auto pt-4 px-6 border-t border-white/[0.06]">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors py-1 leading-none">
                        <span className="inline-flex h-4 w-4 items-center justify-center shrink-0"><span className="h-2.5 w-2.5 rounded-full bg-violet-500/80" /></span>
                        <span>Detalhes do Coach</span>
                        <span className={`inline-flex h-4 w-4 items-center justify-center shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={13} /></span>
                    </button>
                    <AnimatePresence>
                        {isExpanded && (
                            <div className="overflow-hidden">
                                <div className="pt-4 space-y-3">
                                    <p className="text-[11px] text-slate-400 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5 font-medium">{task.analysis.reason}</p>
                                    {task.analysis.metrics && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {Object.entries(task.analysis.metrics).map(([key, value]) => (
                                                <div key={key} className="bg-white/[0.03] border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2">
                                                    <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black">{key}</span>
                                                    <span className="text-[11px] font-mono text-slate-300 font-bold">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {task.analysis.monteCarlo?.calibrationPenalty > 0 && (
                                        <div className="mt-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                            <Zap size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-amber-300/90 leading-relaxed">
                                                <span className="font-black text-amber-400 uppercase tracking-tighter mr-2">Ajuste de Calibração:</span> 
                                                -{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export default function AICoachView({ suggestedFocus, onGenerateGoals, loading, onClearHistory }) {
    const [isExporting, setIsExporting] = useState(false);
    const [viewMode, setViewMode] = useState('planner');
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const coachPlanner = activeContest?.coachPlanner || {};
    const coachPlan = activeContest?.coachPlan || [];
    const calibrationHistoryByCategory = activeContest?.calibrationHistoryByCategory || {};
    const calibrationOps = activeContest?.calibrationOps || {};
    const calibrationAuditLog = activeContest?.calibrationAuditLog || [];
    const startNeuralSession = useAppStore(state => state.startNeuralSession);
    const navigate = useNavigate();

    const handleStartNeural = (task) => {
        const allAssignedIds = new Set();
        Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
        const unallocatedTasks = coachPlan.filter(t => !allAssignedIds.has(getSafeId(t)));
        
        const taskIndex = unallocatedTasks.findIndex(t => getSafeId(t) === getSafeId(task));
        startNeuralSession(unallocatedTasks, taskIndex !== -1 ? taskIndex : 0);
        navigate('/pomodoro');
    };

    const handleExport = async () => {
        setIsExporting(true);
        await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_Coach.pdf', 'portrait');
        setIsExporting(false);
    };

    const hasPlan = coachPlan && coachPlan.length > 0;
    const calibrationSummary = Object.entries(calibrationHistoryByCategory)
        .map(([categoryId, history]) => {
            const rows = Array.isArray(history) ? history : [];
            if (rows.length === 0) return null;

            const latestTimestamp = Number(rows[rows.length - 1]?.timestamp || 0);
            const sevenDaysAgo = latestTimestamp - 7 * 24 * 60 * 60 * 1000;
            const recent = rows.filter(h => (h.timestamp || 0) >= sevenDaysAgo);
            const base = recent.length > 0 ? recent : rows;

            const avgBrier = base.reduce((acc, h) => acc + (Number(h.avgBrier) || 0), 0) / base.length;
            const avgPenalty = base.reduce((acc, h) => acc + (Number(h.calibrationPenalty) || 0), 0) / base.length;
            const label = rows[rows.length - 1]?.categoryName || categoryId;
            return { categoryId, label, count: base.length, avgBrier, avgPenalty };
        })
        .filter(Boolean)
        .sort((a, b) => b.avgPenalty - a.avgPenalty)
        .slice(0, 6);

    return (
        <div id="ai-coach-container" className="space-y-10 pb-12 w-full mx-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Compass size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black tracking-tight text-white">Painel Coach AI</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Navegação tática</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center p-1 rounded-xl bg-white/[0.02] border border-white/5">
                            <button
                                type="button"
                                onClick={() => setViewMode('planner')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center ${viewMode === 'planner' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <LayoutGrid size={12} className="mr-1.5 shrink-0" />
                                Planner
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center ${viewMode === 'cards' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <Sparkles size={12} className="mr-1.5 shrink-0" />
                                Cards
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <List size={12} className="mr-1.5 shrink-0" />
                                Lista
                            </button>
                        </div>
                        
                        <div className="w-px h-6 bg-white/10 hidden sm:block mx-1" />

                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/[0.08] transition-all disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Download size={13} className="shrink-0" />}
                            Exportar
                        </button>
                        <button
                            onClick={onClearHistory}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-300 uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                        >
                            <Trash2 size={13} className="shrink-0" />
                            Limpar
                        </button>
                        <button
                            onClick={onGenerateGoals}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-black text-white uppercase tracking-widest hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={13} className="animate-spin shrink-0" /> : <BrainCircuit size={13} className="shrink-0" />}
                            Recalcular
                        </button>
                    </div>
                </div>

                {suggestedFocus ? (
                    <div className="w-full">
                        <AICoachWidget suggestion={suggestedFocus} onGenerateGoals={onGenerateGoals} loading={loading} />
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-[11px] font-medium text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                        <AlertCircle size={14} className="text-slate-500" />
                        Nenhum foco sugerido no momento.
                    </div>
                )}
            </div>

            {calibrationSummary.length > 0 && (
                <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 relative overflow-visible group">
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
                        <div>
                            <h3 className="text-[11px] uppercase tracking-[0.25em] font-black text-cyan-400 mb-2">Monitor de Calibração</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Telemetria ativa em {calibrationSummary.length} categorias • {calibrationAuditLog.length} eventos registrados
                            </p>
                        </div>
                    </div>
                    
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {calibrationSummary.map(row => {
                            const op = calibrationOps[row.categoryId] || {};
                            return (
                                <div key={row.categoryId} className="group/card relative rounded-[2rem] border border-white/[0.04] bg-white/[0.01] p-10 hover:bg-white/[0.03] transition-all duration-300 overflow-visible">
                                    <div className="flex justify-between items-start mb-8 px-8 pt-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${op.degraded ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'}`} />
                                            <p className="text-[14px] text-white font-black tracking-tight truncate pr-4">{displaySubject(row.label)}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${op.degraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                            {op.degraded ? 'Degradado' : 'Estável'}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between text-[10px] mb-2 px-1">
                                                <span className="text-slate-500 font-bold uppercase tracking-[0.1em]">Erro (Brier)</span>
                                                <span className={`font-mono font-bold ${row.avgBrier > 0.25 ? 'text-rose-400' : 'text-emerald-400'}`}>{row.avgBrier.toFixed(3)}</span>
                                            </div>
                                            <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${row.avgBrier > 0.25 ? 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                                                    style={{ width: `${Math.min(100, (row.avgBrier / 0.5) * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/[0.03]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-none bg-white/[0.03] flex items-center justify-center">
                                                    <Zap size={14} className={row.avgPenalty > 0.1 ? 'text-amber-400' : 'text-slate-500'} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Penalidade</span>
                                            </div>
                                            <span className={`text-[13px] font-black ${row.avgPenalty > 0.1 ? 'text-amber-400' : 'text-slate-400'}`}>
                                                -{Math.round(row.avgPenalty * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {viewMode === 'cards' ? (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-none bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                                <Sparkles className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Foco do Dia</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Sugestões de estudo baseadas em telemetria</p>
                            </div>
                        </div>
                    </div>

                    {hasPlan ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {coachPlan.map((task, idx) => (
                                <AICoachCard key={getSafeId(task) || `coach-card-${idx}`} task={task} idx={idx} onStartPomodoro={handleStartNeural} />
                            ))}
                        </div>
                    ) : (
                        <div className="mb-12 p-16 rounded-[3rem] border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                            <Target size={32} className="text-slate-600 mx-auto mb-4" />
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Nenhum foco definido para hoje</p>
                        </div>
                    )}
                </div>
            ) : viewMode === 'planner' ? (
                <div key="planner"><AICoachPlanner /></div>
            ) : (
                <div key="list" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {(() => {
                        const allAssignedIds = new Set();
                        Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
                        const listTasks = coachPlan.filter(task => !allAssignedIds.has(getSafeId(task)));
                        
                        if (listTasks.length === 0) {
                            return (
                                <div className="md:col-span-2 mb-12 p-16 rounded-[3rem] border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                                    <Target size={32} className="text-slate-600 mx-auto mb-4" />
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Nenhum foco pendente fora do planner</p>
                                </div>
                            );
                        }

                        const leftColumn = listTasks.filter((_, idx) => idx % 2 === 0);
                        const rightColumn = listTasks.filter((_, idx) => idx % 2 !== 0);

                        return [leftColumn, rightColumn].map((columnTasks, columnIdx) => (
                            <div key={`column-${columnIdx}`} className="flex flex-col gap-6">
                                {columnTasks.map((task, idx) => {
                                    const visualIdx = (idx * 2) + columnIdx;
                                    return (
                                        <AICoachCard
                                            key={getSafeId(task) || `${columnIdx}-${idx}`}
                                            task={task}
                                            idx={visualIdx}
                                            onStartPomodoro={handleStartNeural}
                                        />
                                    );
                                })}
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
}
