import React, { useState } from 'react';
import { Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2, LayoutGrid, List, Target, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';
import { normalize } from '../utils/normalization';

const displaySubject = (name) => {
    if (!name) return '';
    const map = {
        'matematica': 'Matemática',
        'portugues': 'Português',
        'lingua portuguesa': 'Português',
        'ingles': 'Inglês',
        'ciencias': 'Ciências',
        'historia': 'História',
        'geografia': 'Geografia',
        'biologia': 'Biologia',
        'fisica': 'Física',
        'quimica': 'Química',
        'filosofia': 'Filosofia',
        'sociologia': 'Sociologia',
        'literatura': 'Literatura',
        'redacao': 'Redação',
        'informatica': 'Informática',
        'raciocinio logico': 'Raciocínio Lógico',
        'direito constitucional': 'Dir. Constitucional',
        'direito administrativo': 'Dir. Administrativo'
    };
    const norm = normalize(name);
    return map[norm] || (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
};

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
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex flex-col p-12 rounded-[2.5rem] bg-[#0a0c14] border border-white/[0.06] border-l-8 ${col.accent} hover:bg-white/[0.03] transition-all duration-300 overflow-visible shadow-2xl`}
        >
            <div className="relative z-10 flex justify-between items-start mb-8 px-8 pt-7">
                <div className={`inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] ${col.badge} shadow-xl border border-white/10`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${col.dot} shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
                    {displaySubject(subjectPart)}
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
                <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.06]">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors py-1">
                        <BrainCircuit size={13} className="text-violet-500" /> Detalhes do Coach
                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={13} /></div>
                    </button>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
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
                                                <span className="font-black text-amber-400 uppercase tracking-tighter">Ajuste de Calibração:</span> Probabilidade ajustada em <span className="font-black">-{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%</span> devido à instabilidade nos simulados.
                                            </p>
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
            const avgBrier = rows.reduce((acc, h) => acc + (Number(h.avgBrier) || 0), 0) / rows.length;
            const avgPenalty = rows.reduce((acc, h) => acc + (Number(h.calibrationPenalty) || 0), 0) / rows.length;
            const label = rows[rows.length - 1]?.categoryName || categoryId;
            return { categoryId, label, count: rows.length, avgBrier, avgPenalty };
        })
        .filter(Boolean)
        .sort((a, b) => b.avgPenalty - a.avgPenalty)
        .slice(0, 6);

    return (
        <div id="ai-coach-container" className="space-y-10 pb-12 w-full mx-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {calibrationSummary.length > 0 && (
                <div className="rounded-3xl border border-white/5 bg-[#0a0c14] p-8 shadow-2xl relative overflow-visible group">
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
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
                                    
                                    <div className="grid grid-cols-2 gap-8 mb-4 px-8">
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest pl-5">Brier Score</p>
                                            <p className={`text-sm font-mono font-bold ${op.degraded ? 'text-rose-400' : 'text-slate-200'} pl-10`}>{row.avgBrier.toFixed(3)}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest pl-5">Ajuste Médio</p>
                                            <p className="text-sm font-mono font-bold text-amber-400 pl-10">-{Math.round(row.avgPenalty * 100)}%</p>
                                        </div>
                                    </div>

                                    {op.degraded && (
                                        <div className="pt-3 border-t border-rose-500/10 mt-1">
                                            <div className="flex items-center gap-2 text-rose-400">
                                                <AlertCircle size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Estabilidade Baixa</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="relative pt-6 pb-10">
                <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-[#0d0e1a] border border-violet-500/30 flex items-center justify-center shadow-2xl relative overflow-hidden">
                            <Sparkles size={28} className="text-violet-300" />
                        </div>

                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white leading-none">
                                    Painel de Execução
                                </h1>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Monitoramento Ativo de Performance</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 ml-auto xl:ml-0 bg-white/[0.02] p-4 rounded-3xl border border-white/[0.05]">
                        <div className="flex flex-col items-end px-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white leading-none tracking-tighter">{coachPlan.length}</span>
                                <span className="text-violet-400 font-black text-xs opacity-60">/ 12</span>
                            </div>
                            <span className="text-[8px] text-slate-600 uppercase tracking-widest font-black mt-1">Metas</span>
                        </div>

                        <div className="w-px h-10 bg-white/5" />

                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="group relative flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{isExporting ? 'Processando...' : 'Exportar Plano'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="py-6">
                {suggestedFocus ? (
                    <AICoachWidget suggestion={suggestedFocus} onGenerateGoals={onGenerateGoals} loading={loading} />
                ) : (
                    <div className="mb-12 p-16 rounded-[3rem] border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                        <Target size={32} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Nenhum foco definido para hoje</p>
                    </div>
                )}
            </div>

            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#0a0c14] border border-white/[0.05] p-4 rounded-3xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="flex items-center gap-4 pl-3">
                            <div className="w-1.5 h-8 rounded-full bg-indigo-500" />
                            <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest">Monitor de Metas</h2>
                        </div>

                        {hasPlan && (
                            <div className="flex items-center p-1.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                                {[{ id: 'planner', label: 'Planejador', Icon: LayoutGrid }, { id: 'list', label: 'Lista de Metas', Icon: List }].map(({ id, label, Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setViewMode(id)}
                                        className={`relative flex items-center justify-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === id ? 'text-white' : 'text-slate-500 hover:text-slate-400'}`}
                                    >
                                        {viewMode === id && (
                                            <motion.div
                                                layoutId="view-tab"
                                                className="absolute inset-0 rounded-xl bg-indigo-600 border border-indigo-400/30"
                                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-2.5">
                                            <Icon size={14} className={viewMode === id ? 'text-white' : 'text-slate-500'} />
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
                            className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[10px] font-black text-slate-600 hover:text-rose-400 uppercase tracking-widest transition-all duration-300 mr-2"
                        >
                            <Trash2 size={15} />
                            <span>Limpar Tudo</span>
                        </button>
                    )}
                </div>

                <div className="transition-all duration-300">
                    {!hasPlan ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 rounded-[3rem] border border-white/[0.04] bg-white/[0.01]">
                            <Compass size={28} className="text-slate-600" />
                            <p className="text-xs text-slate-600 mt-2 max-w-[300px] mx-auto leading-relaxed font-medium">Nenhum plano ativo no momento.</p>
                        </div>
                    ) : viewMode === 'planner' ? (
                        <div key="planner"><AICoachPlanner /></div>
                    ) : (
                        <div key="list" className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
