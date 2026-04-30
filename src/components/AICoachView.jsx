import React, { useState } from 'react';
import { Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2, LayoutGrid, List, Target } from 'lucide-react';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';

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
            className={`group relative flex flex-col p-5 rounded-2xl bg-[#0a0c14] border border-white/[0.06] border-l-2 ${col.accent} hover:bg-white/[0.03] transition-all duration-300 overflow-hidden`}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.015] blur-2xl rounded-full pointer-events-none" />
            <div className="relative z-10 flex justify-between items-start mb-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${col.badge}`}>
                    {subjectPart}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${col.dot} opacity-60 group-hover:opacity-100 transition-opacity mt-1`} />
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartPomodoro?.(task);
                    }}
                    className="ml-2 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-violet-500 hover:text-white hover:border-violet-400 transition-all shadow-lg"
                >
                    <Play size={12} fill="currentColor" />
                </button>
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
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={11} /></div>
                    </button>
                    {isExpanded && (
                        <div className="overflow-hidden transition-all duration-200">
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
                                {task.analysis.monteCarlo?.calibrationPenalty > 0 && (
                                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                        <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-amber-300/90 leading-relaxed">
                                            <span className="font-black text-amber-400 uppercase tracking-tighter">Ajuste de Calibração:</span> Probabilidade reduzida em <span className="font-bold">-{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%</span> por instabilidade recente no histórico.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
    const startNeuralSession = useAppStore(state => state.startNeuralSession);
    const navigate = useNavigate();

    const handleStartNeural = (task) => {
        // No Meta Stream, a "fila" é a lista completa de tarefas não alocadas
        const allAssignedIds = new Set();
        Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
        const unallocatedTasks = coachPlan.filter(t => !allAssignedIds.has(getSafeId(t)));
        
        const taskIndex = unallocatedTasks.findIndex(t => getSafeId(t) === getSafeId(task));
        startNeuralSession(unallocatedTasks, taskIndex !== -1 ? taskIndex : 0);
        navigate('/pomodoro');
    };

    const handleExport = async () => {
        setIsExporting(true);
        await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_AICoach.pdf', 'portrait');
        setIsExporting(false);
    };

    const hasPlan = coachPlan && coachPlan.length > 0;
    const calibrationSummary = Object.entries(calibrationHistoryByCategory)
        .map(([categoryId, history]) => {
            const rows = Array.isArray(history) ? history : [];
            if (rows.length === 0) return null;
            const avgBrier = rows.reduce((acc, h) => acc + (Number(h.avgBrier) || 0), 0) / rows.length;
            const avgPenalty = rows.reduce((acc, h) => acc + (Number(h.calibrationPenalty) || 0), 0) / rows.length;
            const label = rows[rows.length - 1]?.categoryName || categoryId;
            return { categoryId, label, count: rows.length, avgBrier, avgPenalty };
        })
        .filter(Boolean)
        .sort((a, b) => b.avgPenalty - a.avgPenalty)
        .slice(0, 6);

    return (
        <div id="ai-coach-container" className="space-y-0 pb-12 max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {calibrationSummary.length > 0 && (
                <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-black text-cyan-300 mb-3">Saúde da Calibração (último histórico)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {calibrationSummary.map(row => (
                            <div key={row.categoryId} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                <p className="text-xs text-white font-bold">{row.label}</p>
                                <p className="text-[11px] text-slate-300">Brier médio: {row.avgBrier.toFixed(3)}</p>
                                <p className="text-[11px] text-slate-300">Penalidade média: {(row.avgPenalty * 100).toFixed(2)}%</p>
                                <p className="text-[10px] text-slate-500">{row.count} eventos</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="relative pt-8 pb-10 mb-4">
                {/* Background Neural Atmosphere */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            {/* Neural Core Icon Container */}
                            <div className="w-16 h-16 rounded-2xl bg-[#0d0e1a] border border-violet-500/30 flex items-center justify-center shadow-2xl shadow-violet-900/30 relative overflow-hidden">
                                <div
                                    className="absolute inset-0 border-[1.5px] border-dashed border-violet-500/20 rounded-2xl scale-75 animate-[spin_8s_linear_infinite]"
                                />
                                <div
                                    className="absolute inset-0 border border-indigo-500/10 rounded-full scale-110 animate-[spin_12s_linear_infinite_reverse]"
                                />
                                <Sparkles size={28} className="text-violet-300 relative z-10 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" />

                                {/* Scanning Ray */}
                                <div
                                    className="absolute left-0 right-0 h-1/2 bg-gradient-to-b from-transparent via-violet-500/10 to-transparent pointer-events-none animate-[scan_3s_linear_infinite]"
                                />
                            </div>

                            {/* Sync Status Badge */}
                            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-[#07080f] border border-violet-500/40 shadow-lg">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">Core Active</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
                                    Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400">Coach</span>
                                </h1>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                                    <div className="w-1 h-1 rounded-full bg-violet-400 animate-ping" />
                                    <span className="text-[8px] sm:text-[9px] text-violet-300 uppercase tracking-[0.2em] font-black">Neural-V4</span>
                                </div>
                            </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                            <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-[0.25em]">Advanced Strategy Hub</p>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-800" />
                            <p className="text-[9px] sm:text-[10px] text-indigo-400/70 font-black uppercase tracking-[0.1em]">Synapse Response: 12ms</p>
                        </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6 w-full lg:w-auto">
                        <div className="flex flex-col items-end">
                            <div className="flex items-baseline gap-2">
                                <span
                                    className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tighter"
                                >
                                    {coachPlan.length}
                                </span>
                                <span className="text-violet-400 font-black text-xs">/ 12</span>
                            </div>
                            <span className="text-[8px] sm:text-[9px] text-slate-600 uppercase tracking-[0.2em] font-black mt-1">Carga Operacional</span>
                        </div>

                        <div className="hidden sm:block w-px h-10 bg-white/[0.08]" />

                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="group relative flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300 disabled:opacity-50 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="group-hover:-translate-y-0.5 transition-transform duration-300" />}
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] relative z-10">{isExporting ? 'Processando…' : 'Exportar Plano'}</span>
                        </button>
                    </div>
                </div>
                <div className="mt-8 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>

            <div className="py-4">
                {suggestedFocus ? (
                    <AICoachWidget suggestion={suggestedFocus} onGenerateGoals={onGenerateGoals} loading={loading} />
                ) : (
                    <div className="mb-10 p-10 rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                        <Target size={28} className="text-slate-600 mx-auto mb-3" />
                        <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Clique em "Recalcular" para gerar uma análise</p>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/[0.015] border border-white/[0.05] p-3 rounded-2xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-3 pl-2">
                            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
                            <h2 className="text-[10px] sm:text-[11px] font-black text-slate-300 uppercase tracking-[0.25em]">Engine Monitor</h2>
                        </div>

                        {hasPlan && (
                            <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] shadow-inner w-full sm:w-auto">
                                {[{ id: 'planner', label: 'Neural Planner', Icon: LayoutGrid }, { id: 'list', label: 'Meta Stream', Icon: List }].map(({ id, label, Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setViewMode(id)}
                                        className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${viewMode === id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {viewMode === id && (
                                            <div
                                                className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 border border-violet-400/30 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-2">
                                            <Icon size={12} className={viewMode === id ? 'text-white' : 'text-slate-500'} />
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {hasPlan && (
                        <button
                            onClick={onClearHistory}
                            className="group flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 hover:text-rose-400 uppercase tracking-widest transition-all duration-300 hover:bg-rose-500/5 hover:border-rose-500/20 border border-transparent"
                        >
                            <Trash2 size={13} className="group-hover:rotate-12 transition-transform" />
                            <span>Purge Database</span>
                        </button>
                    )}
                </div>

                <div className="transition-all duration-300">
                    {!hasPlan ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-white/[0.05] bg-white/[0.01]">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center"><Compass size={22} className="text-slate-500" /></div>
                            <div><p className="text-sm font-black text-slate-400 tracking-tight">Nenhum plano ativo</p><p className="text-xs text-slate-600 mt-1 max-w-[260px] mx-auto leading-relaxed">Solicite uma análise para gerar metas personalizadas de estudo.</p></div>
                        </div>
                    ) : viewMode === 'planner' ? (
                        <div key="planner"><AICoachPlanner /></div>
                    ) : (
                        <div key="list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                                const allAssignedIds = new Set();
                                Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
                                return coachPlan.filter(task => !allAssignedIds.has(getSafeId(task))).map((task, idx) => (
                                    <AICoachCard 
                                        key={getSafeId(task) || idx} 
                                        task={task} 
                                        idx={idx} 
                                        onStartPomodoro={handleStartNeural}
                                    />
                                ));
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
