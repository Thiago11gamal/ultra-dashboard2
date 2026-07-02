import React, { useMemo, useState } from 'react';
import { Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2, LayoutGrid, List, Target, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { useToast } from '../hooks/useToast';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

function renderBoldText(text) {
    const safeText = String(text || '');
    const parts = safeText.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`bold-${idx}`} className="text-white font-black">{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={`bold-${idx}`}>{part}</React.Fragment>;
    });
}

function AICoachCard({ task, idx, onStartPomodoro }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const fullText = task.text || task.title || '';
    const separatorIndex = fullText.indexOf(':');
    const hasDetails = separatorIndex !== -1;

    let subjectPart = hasDetails ? fullText.slice(0, separatorIndex) : fullText;
    let actionPart = hasDetails ? fullText.slice(separatorIndex + 1).trim() : '';
    subjectPart = subjectPart.replace(/Foco em /i, '').trim();

    let topicPart = '';
    const topicMatch = actionPart.match(/^\[(.*?)\]\s*(.*)/);
    if (topicMatch) { 
        topicPart = topicMatch[1].trim(); 
        actionPart = topicMatch[2].trim(); 
    }

    const truncateGrapheme = (text, max = 50) => {
        const chars = Array.from(text || '');
        return chars.length > max ? `${chars.slice(0, max - 3).join('')}…` : text;
    };
    
    const displayAssunto = topicPart || truncateGrapheme(actionPart || 'Revisão Recomendada', 50);
    const displayMeta = topicPart ? actionPart : null;

    const CARD_COLORS = [
        { accent: 'border-l-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', glow: 'from-violet-900/20', btnHover: 'hover:bg-violet-600 hover:text-white hover:border-violet-500 hover:shadow-[0_0_20px_-3px_rgba(139,92,246,0.4)]' },
        { accent: 'border-l-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', glow: 'from-cyan-900/20', btnHover: 'hover:bg-cyan-600 hover:text-white hover:border-cyan-500 hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.4)]' },
        { accent: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', glow: 'from-emerald-900/20', btnHover: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]' },
        { accent: 'border-l-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20', glow: 'from-rose-900/20', btnHover: 'hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.4)]' },
        { accent: 'border-l-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', glow: 'from-amber-900/20', btnHover: 'hover:bg-amber-500 hover:text-amber-950 hover:border-amber-400 hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.4)]' },
    ];
    const col = CARD_COLORS[idx % CARD_COLORS.length];

    return (
        <div
            className={`group relative flex flex-col p-5 sm:p-7 rounded-3xl bg-[#0a0c14] border border-white/[0.06] border-l-4 sm:border-l-8 ${col.accent} transition-all duration-500 overflow-hidden shadow-2xl hover:border-white/10`}
        >
            {/* Efeito Glassmorphism de Brilho no Fundo (Hover) */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] via-[#0a0c14]/0 to-transparent ${col.glow}`} />
            <div className="relative z-10 grid grid-cols-[1fr_auto] items-start mb-5 gap-4">
                <div className="flex flex-col items-start gap-2 min-w-0">
                    <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${col.badge} shadow-lg backdrop-blur-md border max-w-full overflow-hidden shrink-0`}>
                        <div className={`w-2 h-2 rounded-full ${col.dot} shadow-[0_0_12px_rgba(255,255,255,0.4)] shrink-0`} />
                        <span className="leading-[1.32] truncate min-w-0 block">{displaySubject(subjectPart)}</span>
                    </div>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartPomodoro(task);
                    }}
                    className={`shrink-0 flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 w-10 h-10 sm:w-auto sm:px-4 sm:h-10 transition-all duration-300 shadow-xl group/btn hover:scale-105 active:scale-95 justify-center ${col.btnHover}`}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Iniciar</span>
                    <Play size={13} fill="currentColor" className="transition-colors" />
                </button>
            </div>
            <div className="relative z-10 flex-1 mb-5">
                <h3 className="text-[17px] sm:text-xl font-black text-white leading-[1.2] mb-1.5 tracking-tighter line-clamp-2">
                    {displayAssunto}
                </h3>
                {displayMeta && (
                    <div className="relative">
                        <p className="text-[11px] sm:text-[12px] text-slate-400/80 leading-relaxed font-medium line-clamp-2 pr-2">{displayMeta}</p>
                    </div>
                )}
            </div>

            {/* Exposição Visual dos KPIs Matemáticos */}
            {task.analysis?.monteCarlo && (
                <div className="relative z-10 grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden group/kpi hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center justify-between z-10 relative">
                            <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400/80">Probabilidade</span>
                            <span className="font-mono text-xs font-bold text-indigo-300">{Math.round(task.analysis.monteCarlo.probability)}%</span>
                        </div>
                        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                            <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(0, task.analysis.monteCarlo.probability))}%` }} />
                        </div>
                    </div>
                    <div className={`bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden group/kpi transition-colors hover:bg-white/[0.04]`}>
                        <div className="flex items-center justify-between z-10 relative">
                            <span className={`text-[9px] font-black tracking-widest uppercase ${task.analysis.monteCarlo.volatility > 8 ? 'text-amber-400/80' : 'text-slate-400'}`}>Volatilidade</span>
                            <span className={`font-mono text-xs font-bold ${task.analysis.monteCarlo.volatility > 8 ? 'text-amber-300' : 'text-slate-300'}`}>±{task.analysis.monteCarlo.volatility > 0 && task.analysis.monteCarlo.volatility < 0.5 ? '<1' : Math.round(task.analysis.monteCarlo.volatility)}</span>
                        </div>
                        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                            <div className={`h-full rounded-full transition-all duration-1000 ${task.analysis.monteCarlo.volatility > 8 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-slate-500'}`} style={{ width: `${Math.min(100, Math.max(0, (task.analysis.monteCarlo.volatility / 20) * 100))}%` }} />
                        </div>
                    </div>
                </div>
            )}
            {task.analysis && (
                <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.04]">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)} 
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all duration-300 outline-none focus:outline-none ${isExpanded ? 'bg-white/[0.04] border-white/10' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <BrainCircuit size={12} className="text-indigo-400" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Análise do Coach</span>
                        </div>
                        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isExpanded && (
                            <Motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 pb-2 space-y-3">
                                    <div className="text-[11px] sm:text-xs text-slate-300 leading-relaxed bg-[#06070a]/50 p-5 rounded-xl border border-white/[0.05] font-medium whitespace-pre-wrap shadow-inner font-mono tracking-tight">
                                        {renderBoldText(task.analysis.reason)}
                                    </div>
                                    {task.analysis.metrics && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {Object.entries(task.analysis.metrics).map(([key, value], idx) => (
                                                <div key={`metric-${key}-${idx}`} className="bg-white/[0.02] border border-white/5 px-3 py-2 rounded-xl flex flex-col gap-0.5">
                                                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black">{key}</span>
                                                    <span className="text-[10px] font-mono text-slate-300 font-bold">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {task.analysis.monteCarlo?.calibrationPenalty >= 0.005 && (
                                        <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                                            <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-[9px] text-amber-300/90 leading-relaxed uppercase tracking-widest">
                                                <span className="font-black text-amber-400 mr-2">Ajuste de Calibração:</span> 
                                                <span className="font-mono font-bold text-[10px]">-{Math.max(1, Math.round((Number.isFinite(Number(task.analysis.monteCarlo.calibrationPenalty)) ? Number(task.analysis.monteCarlo.calibrationPenalty) : 0) * 100))}%</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Motion.div>
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
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    const coachPlanner = activeContest?.coachPlanner || {};
    const coachPlan = activeContest?.coachPlan || [];
    const emptyFallbackObj = useMemo(() => ({}), []);
    const calibrationHistoryByCategory = activeContest?.calibrationHistoryByCategory || emptyFallbackObj;
    const calibrationOps = activeContest?.calibrationOps || emptyFallbackObj;
    const calibrationAuditLog = activeContest?.calibrationAuditLog || [];
    const startNeuralSession = useAppStore(state => state.startNeuralSession);
    const navigate = useNavigate();
    const showToast = useToast();
    const [now] = useState(() => Date.now());

    const handleStartNeural = (task) => {
        const allAssignedIds = new Set();
        Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
        const unallocatedTasks = coachPlan.filter(t => !allAssignedIds.has(getSafeId(t)));
        
        // BUG FIX: Se a tarefa clicada não estiver nos não-alocados (ex: foi movida), 
        // usamos a lista unallocated como base, mas buscamos o índice correto.
        let targetIndex = unallocatedTasks.findIndex(t => getSafeId(t) === getSafeId(task));
        let sessionTasks = unallocatedTasks;

        let sourceContext = 'backlog';

        if (targetIndex === -1) {
            // BUG-DESYNC FIX: Se não estiver nos não-alocados, buscar ativamente em qual dia do planner está
            const dayEntry = Object.entries(coachPlanner).find(([, tasks]) => 
                (tasks || []).some(t => getSafeId(t) === getSafeId(task))
            );
            if (dayEntry) {
                sessionTasks = dayEntry[1];
                targetIndex = sessionTasks.findIndex(t => getSafeId(t) === getSafeId(task));
                sourceContext = dayEntry[0];
            } else {
                // Fallback: se não estiver no unallocated nem em nenhum dia, usa o coachPlan inteiro
                sessionTasks = coachPlan;
                targetIndex = coachPlan.findIndex(t => getSafeId(t) === getSafeId(task));
            }
        }

        if (!Array.isArray(sessionTasks) || sessionTasks.length === 0) return;
        const safeIndex = targetIndex !== -1 ? targetIndex : 0;
        
        // FIX: Inject sourceContext just like in AICoachPlanner.jsx
        const sessionWithContext = sessionTasks.map(t => ({ ...t, sourceContext }));
        
        startNeuralSession(sessionWithContext, safeIndex);
        navigate('/pomodoro');
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_Coach.pdf', 'portrait');
        } catch (err) {
            console.error('PDF Export Error:', err);
            showToast('Erro ao exportar o plano para PDF.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const hasPlan = coachPlan && coachPlan.length > 0;
    const toFinite = (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };
    const calibrationSummary = useMemo(() => Object.entries(calibrationHistoryByCategory)
        .map(([categoryId, history]) => {
            const rows = Array.isArray(history) ? history : [];
            if (rows.length === 0) return null;
 
            const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
            const recent = rows.filter(h => toFinite(h?.timestamp) >= sevenDaysAgo);
            const base = recent.length > 0 ? recent : rows;
 
            const brierValues = base.map(h => Number(h?.avgBrier)).filter(Number.isFinite);
            const penaltyValues = base.map(h => Number(h?.calibrationPenalty)).filter(Number.isFinite);
            const avgBrier = brierValues.length > 0
                ? brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length
                : 0;
            const avgPenalty = penaltyValues.length > 0
                ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length
                : 0;
            const validCount = Math.max(brierValues.length, penaltyValues.length);
            if (validCount === 0) return null;

            const label = rows[rows.length - 1]?.categoryName || categoryId;
            return { categoryId, label, count: validCount, avgBrier, avgPenalty };
        })
        .filter(Boolean)
        .slice(0, 6), [calibrationHistoryByCategory, now]);

    return (
        <div id="ai-coach-container" className="space-y-10 pb-12 w-full mx-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div className="flex flex-col gap-6">
                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] -mr-32 -mt-32 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] -ml-32 -mb-32 pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                                <Compass size={24} className="text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Painel Coach AI</h2>
                                <p className="text-[10px] text-cyan-400/80 uppercase tracking-[0.25em] font-bold mt-1">Estratégia inteligente com MC</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                            <div className="flex items-center gap-0.5 bg-slate-950/80 border border-white/5 rounded-2xl p-0.5 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('planner')}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'planner' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    <LayoutGrid size={14} className="shrink-0" />
                                    Planner
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('cards')}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'cards' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    <Sparkles size={14} className="shrink-0" />
                                    Pendências
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/5 transition disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                    Export
                                </button>
                                <button
                                    onClick={onClearHistory}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[9px] font-black text-rose-300 uppercase tracking-widest hover:bg-rose-500/10 transition"
                                >
                                    <Trash2 size={12} />
                                    Limpar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 w-full mt-6 pt-6 border-t border-white/[0.05] flex justify-center">
                        <button
                            onClick={onGenerateGoals}
                            disabled={loading}
                            className="group relative w-full lg:w-auto px-4 sm:px-8 py-3.5 rounded-2xl font-black text-[11px] sm:text-[12px] tracking-[0.15em] uppercase transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 border border-white/20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-pulse" />
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin shrink-0 drop-shadow-md" />
                                    <span>Sincronizando...</span>
                                </>
                            ) : (
                                <>
                                    <BrainCircuit size={16} className="shrink-0 drop-shadow-md" />
                                    <span>Recalcular Estratégia</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {suggestedFocus ? (
                    <div className="w-full">
                        <AICoachWidget suggestion={suggestedFocus} onGenerateGoals={onGenerateGoals} loading={loading} />
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                        <AlertCircle size={20} className="mx-auto mb-3 text-slate-600" />
                        <p className="text-sm font-semibold text-slate-400">Nenhum foco sugerido</p>
                        <p className="text-[10px] text-slate-500 mt-1">Recalcule a estratégia após novos simulados.</p>
                    </div>
                )}
            </div>

            {calibrationSummary.length > 0 && (
                <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
                        <div>
                            <h3 className="text-xs uppercase tracking-[0.25em] font-bold text-cyan-400 mb-0.5">Monitor de Calibração</h3>
                            <p className="text-[10px] text-slate-500">
                                {calibrationSummary.length} categorias • {calibrationAuditLog.length} eventos
                            </p>
                        </div>
                    </div>
                    
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {calibrationSummary.map(row => {
                            const op = calibrationOps[row.categoryId] || {};
                            return (
                                <div key={row.categoryId} className="group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <p className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5">
                                                {displaySubject(row.label)}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${op.degraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${op.degraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                                                    {op.degraded ? 'Degradado' : 'Estável'}
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">n={row.count}</span>
                                            </div>
                                        </div>

                                        {/* Gráfico Radial Compacto */}
                                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                                            {(() => {
                                                const avgBrier = toFinite(row.avgBrier);
                                                const brierPct = Math.min(100, (avgBrier / 0.35) * 100);
                                                const radius = 14;
                                                const circ = 2 * Math.PI * radius;
                                                const offset = circ - (brierPct / 100) * circ;
                                                const colorClass = avgBrier >= 0.25 ? 'text-rose-500' : (avgBrier > 0.18 ? 'text-amber-500' : 'text-emerald-500');
                                                return (
                                                    <>
                                                        <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 36 36">
                                                            <circle cx="18" cy="18" r={radius} fill="none" className="stroke-black/40" strokeWidth="3" />
                                                            <circle 
                                                                cx="18" cy="18" r={radius} fill="none" 
                                                                className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`} 
                                                                strokeWidth="3" 
                                                                strokeDasharray={circ} 
                                                                strokeDashoffset={offset}
                                                                strokeLinecap="round" 
                                                            />
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className={`text-[10px] font-black font-mono tracking-tighter ${colorClass}`}>
                                                                {avgBrier.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    
                                    {/* Rodapé Compacto */}
                                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
                                        <div className="group/tooltip relative flex items-center gap-1 cursor-help">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">Desvio (Brier)</span>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                                <strong className="text-white font-black block mb-1">Score de Brier</strong>
                                                Mede a precisão das projeções Monte Carlo. Quanto menor o valor (verde), mais assertivo está o motor.
                                            </div>
                                        </div>
                                        
                                        {(() => {
                                            const pen = toFinite(row.avgPenalty);
                                            if (pen <= 0.001) return null;
                                            return (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                                                    <Zap size={10} className="text-amber-400" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Pena: <span className="font-mono">-{Math.round(pen * 100)}%</span></span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                {viewMode === 'cards' && (
                    <Motion.div 
                        key="cards"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="space-y-8"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                                    <Sparkles className="text-indigo-400" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Foco do Dia</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Sugestões de estudo baseadas em telemetria</p>
                                </div>
                            </div>
                        </div>

                        {hasPlan ? (
                            (() => {
                                const allAssignedIds = new Set();
                                Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
                                const cardTasks = coachPlan.filter(task => !allAssignedIds.has(getSafeId(task)));
                                
                                if (cardTasks.length === 0) {
                                    return (
                                        <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                                            <Target size={32} className="text-slate-600 mx-auto mb-4" />
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Nenhum foco pendente fora do planner</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {cardTasks.map((task, idx) => (
                                            <AICoachCard key={getSafeId(task) || `coach-card-${idx}`} task={task} idx={idx} onStartPomodoro={handleStartNeural} />
                                        ))}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                                <Target size={32} className="text-slate-600 mx-auto mb-4" />
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Nenhum foco definido para hoje</p>
                            </div>
                        )}
                    </Motion.div>
                )}

                {viewMode === 'planner' && (
                    <Motion.div 
                        key="planner"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <AICoachPlanner />
                    </Motion.div>
                )}

                {viewMode === 'list' && (
                    <Motion.div 
                        key="list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
                    >
                        {(() => {
                            const allAssignedIds = new Set();
                            Object.values(coachPlanner).forEach(dayTasks => (dayTasks || []).forEach(t => { const sid = getSafeId(t); if (sid) allAssignedIds.add(sid); }));
                            const listTasks = coachPlan.filter(task => !allAssignedIds.has(getSafeId(task)));
                            
                            if (listTasks.length === 0) {
                                return (
                                    <div className="md:col-span-2 mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
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
                    </Motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
