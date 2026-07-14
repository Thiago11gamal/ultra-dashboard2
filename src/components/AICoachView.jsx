import React, { useMemo, useState } from 'react';
import { Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2, LayoutGrid, List, Target, AlertCircle, Trophy, Activity } from 'lucide-react';
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
    // BUG-04 FIX: Robustness against markdown nesting/formatting
    // Usando `.*?` em vez de `[^*]+` garante que **texto com caracteres especiais** 
    // ou pontuações seja capturado de forma non-greedy sem quebrar o split.
    const parts = safeText.split(/(\*\*.*?\*\*)/g).filter(Boolean);
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

    // Remove tags do sistema e marca como crítico
    const isSystemAlert = /\[ALERTA MESTRE\]/i.test(actionPart);
    const isPriority = /\[PROTOCOLO PRIORITÁRIO\]/i.test(actionPart) || isSystemAlert;
    actionPart = actionPart.replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '').replace(/\[ALERTA MESTRE\]\s*/i, '');

    let topicPart = '';
    const topicMatch = actionPart.match(/^\[(.*?)\]\s*(.*)/);
    if (topicMatch) { 
        topicPart = topicMatch[1].trim(); 
        actionPart = topicMatch[2].trim();
    }

    // Se for um Alerta Mestre, extraímos a mensagem para uma caixa separada e forçamos o Assunto como título principal
    let systemAlertMessage = null;
    if (isSystemAlert) {
        systemAlertMessage = actionPart; // Salva o alerta
        actionPart = ""; // Limpa para não repetir no subtítulo
        if (!topicPart) {
            topicPart = subjectPart; // O título do card vira o nome da matéria (Ex: "Biologia")
        }
    }

    const displayAssunto = topicPart || actionPart || 'Revisão Recomendada';
    const displayMeta = actionPart ? actionPart : null;

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
            className={`group relative flex flex-col p-5 sm:p-7 rounded-3xl bg-[#0a0c14] border transition-all duration-500 overflow-hidden shadow-2xl hover:border-white/10 ${
                isPriority 
                    ? 'border-rose-500/30 border-l-4 sm:border-l-8 border-l-rose-500 shadow-[0_0_40px_-10px_rgba(225,29,72,0.15)]' 
                    : `border-white/[0.06] border-l-4 sm:border-l-8 ${col.accent}`
            }`}
        >
            {/* Efeitos Visuais de Fundo (Glassmorphism & Cinematic Glow) */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] via-[#0a0c14]/0 to-transparent ${isPriority ? 'from-rose-900/30' : col.glow}`} />
            
            {/* Efeito de Sirene/Alerta Cinematico para Cards Críticos */}
            {isPriority && (
                <>
                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-rose-600/20 blur-[80px] rounded-full pointer-events-none animate-pulse" />
                </>
            )}

            <div className="relative z-10 grid grid-cols-[1fr_auto] items-start mb-5 gap-4">
                <div className="flex flex-col items-start gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {isPriority && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500/10 text-rose-300 shadow-[0_0_20px_-2px_rgba(225,29,72,0.5)] border border-rose-500/40 shrink-0 relative overflow-hidden group/badge">
                                <div className="absolute inset-0 bg-rose-400/20 blur-md animate-pulse" />
                                <Target size={12} className="shrink-0 relative z-10 text-rose-400" />
                                <span className="relative z-10 text-rose-200">Alvo Prioritário</span>
                            </div>
                        )}
                        <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${col.badge} shadow-lg backdrop-blur-md border max-w-full overflow-hidden shrink-0`}>
                            <div className={`w-2 h-2 rounded-full ${col.dot} shadow-[0_0_12px_rgba(255,255,255,0.4)] shrink-0`} />
                            <span className="leading-[1.32] truncate min-w-0 block">{displaySubject(subjectPart)}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartPomodoro(task);
                    }}
                    className={`shrink-0 flex items-center gap-2 rounded-xl border w-10 h-10 sm:w-auto sm:px-4 sm:h-10 transition-all duration-300 shadow-xl group/btn hover:scale-105 active:scale-95 justify-center ${
                        isPriority 
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_25px_-5px_rgba(225,29,72,0.6)] animate-[pulse_3s_ease-in-out_infinite]'
                            : `bg-white/[0.03] border-white/[0.08] text-slate-300 ${col.btnHover}`
                    }`}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Iniciar</span>
                    <Play size={13} fill="currentColor" className="transition-colors" />
                </button>
            </div>
            <div className="relative z-10 flex-1 mb-5">
                <h3 className="text-[17px] sm:text-xl font-black text-white leading-[1.2] mb-1.5 tracking-tighter line-clamp-4">
                    {displayAssunto}
                </h3>
                {systemAlertMessage && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 shadow-[inset_0_0_15px_rgba(225,29,72,0.05)]">
                        <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] sm:text-[12px] text-rose-300/90 leading-relaxed font-medium">
                            {systemAlertMessage}
                        </span>
                    </div>
                )}
                {displayMeta && (
                    <div className="relative mt-2">
                        <p className="text-[11px] sm:text-[12px] text-slate-400/80 leading-relaxed font-medium line-clamp-3 pr-2">{displayMeta}</p>
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
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all duration-300 outline-none focus:outline-none ${isExpanded ? 'bg-indigo-500/[0.04] border-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <BrainCircuit size={12} className="text-indigo-400" />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isExpanded ? 'text-indigo-300' : 'text-slate-400'}`}>Análise do Coach</span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`} />
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
                                    <div className="text-[11px] sm:text-xs text-indigo-200/80 leading-relaxed bg-indigo-500/[0.04] p-5 rounded-xl border border-indigo-500/10 font-medium whitespace-pre-wrap shadow-[inset_0_0_20px_rgba(99,102,241,0.03)] font-mono tracking-tight">
                                        {renderBoldText(task.analysis.reason)}
                                    </div>
                                    {task.analysis.metrics && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {Object.entries(task.analysis.metrics).map(([key, value], idx) => (
                                                <div key={`metric-${key}-${idx}`} className="bg-indigo-500/[0.03] border border-indigo-500/10 px-3 py-2 rounded-xl flex flex-col gap-0.5">
                                                    <span className="text-[8px] text-indigo-400/60 uppercase tracking-widest font-black">{key}</span>
                                                    <span className="text-[10px] font-mono text-indigo-200 font-bold">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {task.analysis.monteCarlo?.calibrationPenalty >= 0.005 && (
                                        <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                                            <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Ajuste de Calibração: -{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%</span>
                                                <span className="text-[10px] text-amber-500/70 font-medium leading-relaxed">Você está errando sistematicamente a dificuldade nesta matéria. Reduzimos a projeção temporariamente até a sua precisão estabilizar.</span>
                                            </div>
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
    const coachPlanner = useMemo(() => activeContest?.coachPlanner || {}, [activeContest?.coachPlanner]);
    const coachPlanRaw = useMemo(() => activeContest?.coachPlan || [], [activeContest?.coachPlan]);
    const systemAlerts = useMemo(() => coachPlanRaw.filter(task => /\[ALERTA MESTRE\]|\[STATUS\]/i.test(task.text)), [coachPlanRaw]);
    const actionableTasks = useMemo(() => coachPlanRaw.filter(task => !/\[ALERTA MESTRE\]|\[STATUS\]/i.test(task.text)), [coachPlanRaw]);
    const coachPlan = actionableTasks;
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
        if (value === null || value === undefined || value === '') return fallback;
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

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


            </div>





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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
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
                        <div className="space-y-6 mb-8">
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

                        {systemAlerts.length > 0 && (
                            <div className="mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {systemAlerts.map(alertTask => {
                                    const cleanText = alertTask.text.replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '').replace(/\[ALERTA MESTRE\]\s*/i, '').replace(/\[STATUS\]\s*/i, '');
                                    const separatorIndex = cleanText.indexOf(':');
                                    const subjectName = separatorIndex !== -1 ? cleanText.slice(0, separatorIndex).trim() : 'Sistema';
                                    const message = separatorIndex !== -1 ? cleanText.slice(separatorIndex + 1).trim() : cleanText;
                                    
                                    let type = 'info';
                                    let titlePart = message;
                                    let descPart = '';
                                    let actionDesc = '';
                                    
                                    if (/VETOR CRÍTICO/i.test(message)) {
                                        type = 'danger';
                                        titlePart = "Vetor Crítico";
                                        descPart = message.replace(/🚨 VETOR CRÍTICO!?\s*/i, '');
                                        actionDesc = "Conclua os focos pendentes desta matéria hoje para frear a queda imediata de rendimento.";
                                    } else if (/OSCILAÇÃO/i.test(message)) {
                                        type = 'warning';
                                        titlePart = "Oscilação Estatística";
                                        descPart = message.replace(/🌪️ OSCILAÇÃO ESTATÍSTICA:?\s*/i, '');
                                        actionDesc = "Revisite os tópicos sugeridos abaixo para estabilizar sua taxa de acertos e reduzir a imprevisibilidade.";
                                    } else if (/CRUZEIRO SEGURO/i.test(message)) {
                                        type = 'success';
                                        titlePart = "Cruzeiro Seguro";
                                        descPart = message.replace(/🏆 CRUZEIRO SEGURO:?\s*/i, '');
                                        actionDesc = "Mantenha a constância atual. Resolva apenas as manutenções leves sugeridas para não perder o ritmo.";
                                    }

                                    const t = {
                                        danger: { bg: 'bg-[#1a0b12]', border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', titleColor: 'text-rose-100', descColor: 'text-rose-200/70', badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300', verdictBg: 'bg-rose-500/5 text-rose-400', glowColor: 'bg-rose-600', Icon: AlertCircle, isCritical: true },
                                        warning: { bg: 'bg-[#171109]', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', titleColor: 'text-amber-100', descColor: 'text-amber-200/70', badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', verdictBg: 'bg-amber-500/5 text-amber-400', glowColor: 'bg-amber-600', Icon: Activity, isCritical: false },
                                        success: { bg: 'bg-[#06140e]', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', titleColor: 'text-emerald-100', descColor: 'text-emerald-200/70', badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', verdictBg: 'bg-emerald-500/5 text-emerald-400', glowColor: 'bg-emerald-600', Icon: Trophy, isCritical: false },
                                        info: { bg: 'bg-slate-900/50', border: 'border-slate-500/20', iconBg: 'bg-slate-500/10', iconColor: 'text-slate-400', titleColor: 'text-slate-100', descColor: 'text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-300', verdictBg: 'bg-slate-500/5 text-slate-400', glowColor: 'bg-slate-600', Icon: AlertCircle, isCritical: false }
                                    }[type];

                                    return (
                                        <div key={alertTask.id} className={`relative overflow-hidden p-5 rounded-3xl border flex flex-col gap-4 shadow-xl ${t.bg} ${t.border}`}>
                                            <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none opacity-[0.15] ${t.glowColor}`} />
                                            
                                            <div className="flex items-start gap-4">
                                                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${t.iconBg} ${t.border} ${t.iconColor}`}>
                                                    <t.Icon size={24} className={t.isCritical ? "animate-pulse" : ""} />
                                                </div>
                                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${t.badgeBg}`}>
                                                            {subjectName}
                                                        </span>
                                                        {t.isCritical && (
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                                                                Intervenção Exigida
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-sm sm:text-base font-black tracking-tight leading-snug uppercase ${t.titleColor}`}>
                                                        {titlePart}
                                                    </span>
                                                    <span className={`text-xs font-medium leading-relaxed ${t.descColor}`}>
                                                        {descPart}
                                                    </span>
                                                </div>
                                            </div>

                                            {alertTask.analysis?.monteCarlo && (
                                                <div className="flex flex-wrap items-center gap-2 mt-1 mb-1">
                                                    <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                                        <Target size={12} className={t.iconColor} />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Projeção Base: <span className="text-white ml-1">{Math.round(Number.isFinite(Number(alertTask.analysis.monteCarlo.probabilityRaw)) ? Number(alertTask.analysis.monteCarlo.probabilityRaw) : (alertTask.analysis.monteCarlo.probability || 0))}%</span></span>
                                                    </div>
                                                    <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                                        <Activity size={12} className={t.iconColor} />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Volatilidade: <span className="text-white ml-1">{(Number.isFinite(Number(alertTask.analysis.monteCarlo.volatility)) ? Number(alertTask.analysis.monteCarlo.volatility) : 0).toFixed(2)}</span></span>
                                                    </div>
                                                    {alertTask.analysis.monteCarlo.calibrationPenalty > 0.01 && (
                                                        <div className={`px-2 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5`}>
                                                            <Zap size={12} className="text-amber-400" />
                                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Penalidade: <span className="text-amber-400 ml-1">-{Math.round(alertTask.analysis.monteCarlo.calibrationPenalty * 100)}%</span></span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {alertTask.analysis?.verdict && (
                                                <div className="flex flex-col gap-2 mt-1">
                                                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] font-bold ${t.verdictBg} ${t.border}`}>
                                                        <BrainCircuit size={14} className="shrink-0 mt-0.5" />
                                                        <span className="leading-relaxed">{alertTask.analysis.verdict}</span>
                                                    </div>
                                                    <div className="pt-3 border-t border-white/5 mt-1">
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 block mb-1">Ação Sugerida</span>
                                                        <p className={`text-xs font-bold ${t.titleColor} opacity-90`}>{actionDesc}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
