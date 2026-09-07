import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import {
    ChevronDown,
    ChevronUp,
    Plus,
    Trash2,
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart2,
    Play,
    Settings,
    Download,
    X,
    Sparkles,
    Rocket,
    BookOpen,
    Target,
    CheckCircle2
} from 'lucide-react';
import PromptModal from './PromptModal';
import CategoryEditor from './CategoryEditor';
import ConfirmModal from './ConfirmModal';
import { formatMinutes } from '../utils/format';
import { toArray } from '../utils/normalize';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { getContestDisplayName } from './sidebarUtils';

const priorityColors = {
    high: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        text: 'text-red-400'
    },
    medium: {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400'
    },
    low: {
        bg: 'bg-green-500/20',
        border: 'border-green-500/50',
        text: 'text-green-400'
    },
};

const getHistoryDateLabel = (h) => {
    try {
        const raw = typeof h.date === 'string'
            ? (h.date.includes('T') ? h.date : `${h.date}T12:00:00`)
            : (h.date || h.createdAt || Date.now());

        const parsed = new Date(raw);

        if (Number.isNaN(parsed.getTime())) {
            return '-';
        }

        return parsed.toLocaleDateString('pt-BR');
    } catch {
        return '-';
    }
};



import { normalize } from '../utils/normalization';
import { useToast } from '../hooks/useToast';
const PerformancePanel = ({ stats, color, maxScore = 100 }) => {
    if (!stats) return null;

    const {
        average = 0,
        lastAttempt = 0,
        trend = 'stable',
        level = '-',
        history: rawHistory = []
    } = stats;

    const safeMax = Math.max(1, Number(maxScore) || 100);
    const history = toArray(rawHistory);

    let trendIcon = (
        <div className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-500/10">
            <Minus size={12} className="text-slate-400" />
        </div>
    );

    let trendText = 'Estável';

    if (trend === 'up') {
        trendIcon = (
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                <TrendingUp size={12} className="text-emerald-400" />
            </div>
        );
        trendText = 'Subindo';
    } else if (trend === 'down') {
        trendIcon = (
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                <TrendingDown size={12} className="text-rose-400" />
            </div>
        );
        trendText = 'Caindo';
    }

    let levelColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';

    if (level === 'ALTO') levelColor = 'text-green-400 bg-green-500/10 border-green-500/20';
    if (level === 'MÉDIO') levelColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (level === 'BAIXO') levelColor = 'text-red-400 bg-red-500/10 border-red-500/20';

    const avgDisplay = safeMax === 100
        ? `${average}%`
        : `${average} / ${safeMax} pts`;
    const avgPctSub = safeMax !== 100
        ? `${Math.round((average / safeMax) * 100)}%`
        : null;

    const lastDisplay = safeMax === 100
        ? `${lastAttempt}%`
        : `${lastAttempt} / ${safeMax} pts`;
    const lastPctSub = safeMax !== 100
        ? `${Math.round((lastAttempt / safeMax) * 100)}%`
        : null;

    return (
        <div className="relative p-3 mx-3 mb-3 bg-white/[0.02] rounded-xl border border-white/5 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-2 mb-2 text-slate-300 text-xs font-bold uppercase tracking-wider leading-relaxed">
                <BarChart2 size={14} style={{ color: color || '#818cf8' }} />
                <h3>Média de acerto (Simulados)</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative z-10">
                <div className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors p-2 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-0.5 tracking-wider">
                        Média Geral
                    </span>
                    <span className="text-xl font-black" style={{ color: color || '#818cf8' }}>
                        {avgDisplay}
                    </span>
                    {avgPctSub && (
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                            {avgPctSub}
                        </span>
                    )}
                </div>

                <div className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors p-2 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-0.5 tracking-wider">
                        Última
                    </span>
                    <span className="text-lg font-mono font-bold text-slate-200">
                        {lastDisplay}
                    </span>
                    {lastPctSub && (
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                            {lastPctSub}
                        </span>
                    )}
                </div>

                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center shadow-sm transition-colors ${levelColor}`}>
                    <span className="text-[10px] uppercase font-bold mb-0.5 opacity-80 tracking-wider">
                        Nível
                    </span>
                    <span className="text-xs font-black">
                        {level}
                    </span>
                </div>

                <div className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors p-2 rounded-lg border border-white/5 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mb-0.5 tracking-wider">
                        Tendência
                    </span>

                    <div className="flex items-center gap-1 mt-0.5">
                        {trendIcon}
                        <span className="text-[10px] text-slate-300 font-bold">
                            {trendText}
                        </span>
                    </div>
                </div>
            </div>

            {history.length > 1 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1.5">
                        Evolução Recente
                    </p>

                    <div className="flex items-end h-10 gap-0.5 w-full overflow-visible">
                        {history.slice(-10).map((h, i) => {
                            const dateLabel = getHistoryDateLabel(h);
                            const hScore = Number(h.score || 0);
                            const hPct = Math.round((hScore / safeMax) * 100);
                            const barHeight = Math.min(100, Math.max(2, (hScore / safeMax) * 100));

                            const labelTooltip = safeMax === 100
                                ? `${h.score}% (${dateLabel})`
                                : `${h.score} pts (${hPct}%) (${dateLabel})`;

                            return (
                                <div
                                    key={`${h.date || h.createdAt || 'hist'}-${i}`}
                                    className="flex-1 flex flex-col items-center group/bar relative focus-visible:outline-none"
                                    tabIndex={0}
                                    title={labelTooltip}
                                >
                                    <div
                                        className="w-full bg-slate-700/50 hover:bg-white/20 transition-all rounded-t-sm"
                                        style={{
                                            height: `${barHeight}%`,
                                            backgroundColor: i === history.slice(-10).length - 1 ? (color || '#818cf8') : undefined,
                                            opacity: i === history.slice(-10).length - 1 ? 1 : 0.3
                                        }}
                                    />

                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 group-focus-within/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {labelTooltip}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const TaskItem = ({
    task,
    onToggle,
    onDelete,
    onTogglePriority,
    onTriggerPlay
}) => {
    const safePriority = String(task.priority || 'medium').toLowerCase();
    const priority = priorityColors[safePriority] || priorityColors.medium;
    const taskTitle = task.title || task.text || 'Tarefa sem nome';

    return (
        <div
            className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.07] transition-all group shadow-sm hover:shadow-md ${task.completed ? 'opacity-40' : ''}`}
        >
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id)}
                    className="flex-shrink-0 w-5 h-5 cursor-pointer accent-purple-500 hover:scale-110 transition-transform"
                    aria-label={`Concluir tarefa: ${taskTitle}`}
                />

                <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {taskTitle}
                        </p>

                        {task.status === 'studying' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse shadow-lg shadow-purple-500/20 whitespace-nowrap flex-shrink-0">
                                ⚡ Estudando
                            </span>
                        )}
                    </div>

                    {task.notes && (
                        <p className="text-[10px] sm:text-xs text-slate-500 break-words line-clamp-3 mt-0.5 leading-tight">
                            {task.notes}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 w-full sm:w-auto ml-auto pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                {task.status === 'studying' ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTriggerPlay();
                        }}
                        className="relative px-4 h-8 sm:h-9 flex items-center justify-center gap-2 rounded-full transition-all duration-500 hover:scale-[1.05] active:scale-95 group overflow-visible animate-pulse"
                        title="Retornar ao Pomodoro"
                        aria-label="Retornar ao Pomodoro"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 rounded-full blur-[4px] opacity-60 transition-all duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-500 rounded-full border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />

                        <span className="text-white font-black text-[9px] sm:text-[10px] tracking-widest uppercase drop-shadow-md relative z-10">
                            PLAY
                        </span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTriggerPlay();
                        }}
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all group/play text-purple-400 bg-purple-500/5 border border-purple-500/20 hover:text-white hover:bg-purple-500/40 hover:scale-110"
                        title="Estudar agora"
                        aria-label={`Estudar agora: ${taskTitle}`}
                    >
                        <Play size={14} className="sm:size-18 fill-purple-500/20" />
                    </button>
                )}

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePriority(task.id || task.text);
                    }}
                    className={`px-3 sm:w-20 py-1.5 rounded-lg text-[9px] sm:text-xs font-black uppercase transition-all cursor-pointer hover:scale-105 active:scale-95 select-none ${priority.bg} ${priority.text} ${priority.border} border`}
                    title="Clique para alternar o nível: Baixa → Média → Alta"
                    aria-label={`Alternar prioridade da tarefa: ${taskTitle}`}
                >
                    {safePriority === 'high'
                        ? 'Alta'
                        : safePriority === 'medium'
                            ? 'Média'
                            : 'Baixa'}
                </button>

                <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                    title="Excluir tarefa"
                    aria-label={`Excluir tarefa: ${taskTitle}`}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

const CategoryAccordion = React.memo(({
    category,
    onToggleTask,
    onTogglePriority,
    onPlayContext,
    showSimuladoStats,
    filter,
    onOpenTaskModal,
    onOpenDeleteCategoryModal,
    onOpenDeleteTaskModal
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);

    const originalTasks = useMemo(
        () => toArray(category.originalTasks ?? category.tasks),
        [category.originalTasks, category.tasks]
    );

    const visibleTasks = useMemo(
        () => toArray(category.tasks),
        [category.tasks]
    );

    const completedCount = originalTasks.filter(t => t.completed).length;

    const progress = originalTasks.length > 0
        ? Math.round((completedCount / originalTasks.length) * 100)
        : 0;

    const panelId = `category-panel-${category.id || 'unknown'}`;

    const toggleOpen = () => setIsOpen(v => !v);

    return (
        <div className="glass overflow-visible shadow-lg transition-all duration-500 hover:shadow-purple-500/5 hover:-translate-y-1 relative group border border-white/5 rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.02] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

            <div className="w-full flex flex-wrap items-center gap-2 p-3 sm:p-5 hover:bg-white/5 transition-colors">
                <button
                    type="button"
                    onClick={toggleOpen}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex items-center gap-3 sm:gap-4 flex-1 min-w-[220px] cursor-pointer text-left"
                >
                    <span className="text-xl sm:text-2xl flex-shrink-0" aria-hidden="true">
                        {category.icon || '📚'}
                    </span>

                    <div className="text-left flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3
                                className="font-bold text-sm sm:text-lg break-words line-clamp-2"
                                style={{ color: category.color }}
                            >
                                {category.name || 'Sem Nome'}
                            </h3>

                            {category.totalMinutes > 0 && (
                                <span className="text-yellow-400/80 text-[9px] sm:text-[10px] font-black whitespace-nowrap border border-yellow-400/20 px-1 sm:px-1.5 py-0.5 rounded-sm leading-normal">
                                    {formatMinutes(category.totalMinutes)}
                                </span>
                            )}
                        </div>

                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                            {completedCount} de {originalTasks.length} {originalTasks.length === 1 ? 'concluída' : 'concluídas'}
                        </p>
                    </div>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCategoryEditorOpen(true);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all transform hover:scale-110 active:scale-95 flex-shrink-0 border border-white/5"
                        title="Configurar Disciplina"
                        aria-label={`Configurar disciplina ${category.name || 'sem nome'}`}
                    >
                        <Settings size={16} strokeWidth={2.5} />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenDeleteCategoryModal(category.id, category.name);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all transform hover:scale-110 active:scale-95 flex-shrink-0 border border-red-500/20"
                        title="Excluir Disciplina Permanente"
                        aria-label={`Excluir disciplina ${category.name || 'sem nome'}`}
                    >
                        <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="hidden sm:flex items-center justify-end gap-2 sm:gap-4 flex-shrink-0">
                    <div className="w-14 sm:w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${progress}%`,
                                backgroundColor: category.color
                            }}
                        />
                    </div>

                    <span
                        className="text-xs sm:text-sm font-mono flex-shrink-0 w-8 sm:w-10 text-right inline-block"
                        style={{ color: category.color }}
                    >
                        {progress}%
                    </span>
                </div>

                <button
                    type="button"
                    onClick={toggleOpen}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                    aria-label={isOpen ? 'Recolher disciplina' : 'Expandir disciplina'}
                >
                    {isOpen
                        ? <ChevronUp size={18} />
                        : <ChevronDown size={18} />}
                </button>
            </div>

            {isOpen && (
                <div
                    id={panelId}
                    className="border-t border-white/10"
                >
                    {showSimuladoStats && (
                        <div className="pt-4">
                            <PerformancePanel
                                stats={category.simuladoStats}
                                color={category.color}
                                maxScore={category.maxScore || 100}
                            />
                        </div>
                    )}

                    {originalTasks.length === 0 ? (
                        <div className="p-4">
                            <div className="py-7 px-5 rounded-2xl bg-white/[0.015] border border-white/5 flex flex-col items-center justify-center text-center">
                                <p className="text-slate-200 font-semibold text-sm">
                                    Nenhum assunto cadastrado
                                </p>
                                <p className="text-slate-400 text-xs max-w-xs mt-1 mb-4 leading-relaxed">
                                    Cadastre os tópicos do edital desta disciplina para organizar seus estudos e acompanhar seu desempenho.
                                </p>
                                {filter !== 'completed' && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenTaskModal(category.id)}
                                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Plus size={14} className="text-purple-300" />
                                        <span>Adicionar Primeiro Assunto</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {visibleTasks.length === 0 ? (
                                <p className="text-center text-slate-500 text-sm py-4">
                                    Nenhum assunto encontrado para o filtro atual.
                                </p>
                            ) : (
                                visibleTasks.map(task => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        onToggle={(id) => onToggleTask(category.id, id)}
                                        onDelete={() => {
                                            onOpenDeleteTaskModal(category.id, task);
                                        }}
                                        onTogglePriority={(id) => onTogglePriority(category.id || category.name, id)}
                                        onTriggerPlay={() => onPlayContext(category.id, task.id)}
                                    />
                                ))
                            )}

                            {filter !== 'completed' && (
                                <button
                                    type="button"
                                    onClick={() => onOpenTaskModal(category.id)}
                                    className="w-full py-2.5 px-4 rounded-xl bg-white/[0.02] hover:bg-purple-500/[0.06] border border-white/5 hover:border-purple-500/30 text-slate-400 hover:text-purple-200 transition-all duration-200 flex items-center justify-center gap-2 group text-xs font-semibold shadow-sm mt-2"
                                >
                                    <div className="w-5 h-5 rounded-md bg-white/5 group-hover:bg-purple-500/20 border border-white/10 group-hover:border-purple-500/30 flex items-center justify-center text-slate-400 group-hover:text-purple-300 transition-all">
                                        <Plus size={13} className="group-hover:scale-110 transition-transform" />
                                    </div>
                                    <span>Adicionar Assunto</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}


            <CategoryEditor
                category={category}
                isOpen={isCategoryEditorOpen}
                onClose={() => setIsCategoryEditorOpen(false)}
            />
        </div>
    );
});

CategoryAccordion.displayName = 'CategoryAccordion';

function Checklist({
    categories = [],
    onToggleTask,
    onDeleteTask,
    onAddCategory,
    onDeleteCategory,
    onAddTask,
    onTogglePriority,
    onPlayContext,
    showSimuladoStats,
    filter,
    setFilter,
    contests,
    activeId,
    onImportCategory
}) {
    const showToast = useToast();
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importSourceContest, setImportSourceContest] = useState('');

    // ✅ LOTE-03: estado dos modais centralizados
    const [taskModalCatId, setTaskModalCatId] = useState(null);
    const [deleteCatModal, setDeleteCatModal] = useState(null); // { id, name }
    const [deleteTaskModal, setDeleteTaskModal] = useState(null); // { catId, task }

    const handleOpenTaskModal = useCallback((catId) => {
        setTaskModalCatId(catId);
    }, [setTaskModalCatId]);

    const handleOpenDeleteCategoryModal = useCallback((catId, catName) => {
        setDeleteCatModal({ id: catId, name: catName });
    }, [setDeleteCatModal]);

    const handleOpenDeleteTaskModal = useCallback((catId, task) => {
        setDeleteTaskModal({ catId, task });
    }, [setDeleteTaskModal]);

    const bottomRef = useRef(null);
    const scrollTimerRef = useRef(null);
    const importModalRef = useRef(null);

    useModalAccessibility(isImportModalOpen, () => setIsImportModalOpen(false), importModalRef);

    const handleImportWithFeedback = useCallback((sourceContestId, categoryId) => {
        const sourceContest = contests?.[sourceContestId];
        const sourceCats = sourceContest?.categories || [];
        const catToImport = (Array.isArray(sourceCats) ? sourceCats : Object.values(sourceCats))
            .find(c => c.id === categoryId);
        if (!catToImport) return;
        const activeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const alreadyExists = activeCats.some(c =>
            normalize(c.name) === normalize(catToImport.name)
        );
        if (alreadyExists) {
            showToast(`"${catToImport.name}" já existe neste concurso.`, 'warning');
            return;
        }
        onImportCategory(sourceContestId, categoryId);
        showToast(`"${catToImport.name}" importado com sucesso!`, 'success');
    }, [contests, categories, onImportCategory, showToast]);

    useEffect(() => {
        return () => {
            if (scrollTimerRef.current) {
                cancelAnimationFrame(scrollTimerRef.current);
            }
        };
    }, []);

    const scrollToBottom = useCallback(() => {
        if (scrollTimerRef.current) {
            cancelAnimationFrame(scrollTimerRef.current);
        }

        scrollTimerRef.current = requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            });
        });
    }, []);

    const safeCategories = useMemo(() => {
        return toArray(categories).map(cat => ({
            ...cat,
            tasks: toArray(cat.tasks)
        }));
    }, [categories]);

    // BUG-FIX: usar categories (prop original) em vez de safeCategories
    // safeCategories é recriado a cada render → fingerprint muda a cada render
    const categoriesFingerprint = useMemo(() => {
        return toArray(categories).map(c => {
            const tasks = toArray(c?.tasks);
            const tasksMeta = tasks.map(t =>
                `${t?.id || t?.text || ''}:${t?.completed ? 1 : 0}:${t?.priority || 'medium'}:${t?.status || ''}`
            ).join(';');
            return `${c?.id || c?.name || ''}:${c?.name || ''}:${tasks.length}:${tasksMeta}`;
        }).join('|');
    }, [categories]);

    const filteredCategories = useMemo(() => {
        return safeCategories.map(cat => ({
            ...cat,
            originalTasks: cat.tasks || [],
            tasks: (cat.tasks || []).filter(task => {
                if (filter === 'active') return !task.completed;
                if (filter === 'completed') return task.completed;
                return true;
            })
        }));
    // BUG-T08 FIX: Usar fingerprint em vez da referência instável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoriesFingerprint, filter]);

    const handleAddTask = useCallback((catId, title) => {
        if (!onAddTask) return;

        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        if (!trimmedTitle) {
            showToast('O título da tarefa não pode ser vazio.', 'error');
            return;
        }
        if (trimmedTitle.length > 200) {
            showToast('O título da tarefa é muito longo (máx. 200 caracteres).', 'error');
            return;
        }

        const category = safeCategories.find(c => c.id === catId);
        if (category) {
            const normNew = trimmedTitle.toLowerCase().replace(/\s+/g, ' ').trim();
            const alreadyExists = (category.tasks || []).some(t => {
                const existing = String(t.text || t.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
                return existing === normNew;
            });
            if (alreadyExists) {
                showToast(`O assunto "${trimmedTitle}" já existe nesta disciplina.`, 'warning');
                return;
            }
        }

        onAddTask(catId, trimmedTitle);

        if (filter === 'completed') {
            if (typeof setFilter === 'function') setFilter('all');
        }

        const isLastCategory = safeCategories.length > 0 && catId === safeCategories[safeCategories.length - 1].id;

        if (isLastCategory) {
            scrollToBottom();
        }
    }, [onAddTask, filter, setFilter, safeCategories, scrollToBottom, showToast]);

    const handlePlayContext = useCallback((categoryId, taskId) => {
        if (onPlayContext) {
            onPlayContext(categoryId, taskId);
        }
    }, [onPlayContext]);

    const sourceContest = contests?.[importSourceContest];

    const sourceCategories = useMemo(() => {
        return toArray(sourceContest?.categories);
    }, [sourceContest]);

    const taskStats = useMemo(() => {
        let total = 0;
        let completed = 0;
        safeCategories.forEach(cat => {
            const tasks = toArray(cat.tasks);
            total += tasks.length;
            completed += tasks.filter(t => t?.completed).length;
        });
        return {
            total,
            active: Math.max(0, total - completed),
            completed,
        };
    }, [safeCategories]);

    const filters = useMemo(() => [
        { id: 'all', label: 'Todas', count: taskStats.total },
        { id: 'active', label: 'Ativas', count: taskStats.active },
        { id: 'completed', label: 'Concluídas', count: taskStats.completed },
    ], [taskStats]);

    return (
        <div className="min-h-[300px] w-full">
            {safeCategories.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-500/20 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/95 backdrop-blur-xl p-8 sm:p-12 shadow-xl shadow-purple-950/30 group">
                    {/* Background glow and decorative elements */}
                    <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-purple-600/15 to-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-tr from-blue-600/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                    <div className="relative z-10 w-full mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-between gap-10 lg:gap-12">
                        
                        {/* Left Column: Text & Actions */}
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 flex-1 max-w-2xl">
                            {/* Pill badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold shadow-sm shadow-purple-500/10 backdrop-blur-md">
                                <Sparkles size={14} className="text-purple-400" />
                                <span>Primeiro Passo</span>
                            </div>

                            {/* Modern glowing icon container */}
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 via-indigo-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-950/50 backdrop-blur-md group-hover:scale-105 transition-transform duration-300 relative">
                                <div className="absolute inset-0 rounded-3xl bg-purple-500/15 blur-lg animate-pulse" />
                                <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.5)] transform -rotate-45" />
                            </div>

                            {/* Title & Description */}
                            <div className="flex flex-col items-center lg:items-start gap-3 mt-2">
                                <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                    Prepare-se para o Topo!
                                </h3>

                                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
                                    Organize sua rotina de estudos. Adicione sua primeira matéria para{' '}
                                    <span className="text-purple-400 font-bold">
                                        desbloquear o edital verticalizado
                                    </span>{' '}
                                    e acompanhar sua evolução de perto.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start w-full sm:w-auto mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCatModalOpen(true)}
                                    className="px-6 py-3.5 sm:px-8 sm:py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Plus size={20} />
                                    <span>Criar Primeira Disciplina</span>
                                </button>
                                {onAddCategory && (
                                    <button
                                        type="button"
                                        onClick={() => setIsImportModalOpen(true)}
                                        className="px-6 py-3.5 sm:px-8 sm:py-4 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                    >
                                        <Download size={20} />
                                        <span>Importar Disciplina</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Feature Highlights Grid */}
                        <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[300px]">
                            <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-purple-500/25 rounded-2xl p-4 flex items-center gap-4 text-left transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-200">Edital Vertical</div>
                                    <div className="text-xs text-slate-400 mt-0.5">Tópicos organizados passo a passo</div>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-indigo-500/25 rounded-2xl p-4 flex items-center gap-4 text-left transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                    <Target size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-200">Ciclos de Estudo</div>
                                    <div className="text-xs text-slate-400 mt-0.5">Mantenha o foco nas prioridades</div>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-emerald-500/25 rounded-2xl p-4 flex items-center gap-4 text-left transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-200">Acompanhamento</div>
                                    <div className="text-xs text-slate-400 mt-0.5">Métricas em tempo real</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header with Title and Segmented Control Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse shadow-sm shadow-purple-500/50" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-white tracking-tight">
                                        Disciplinas do Edital
                                    </h2>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                                        {safeCategories.length} {safeCategories.length === 1 ? 'disciplina' : 'disciplinas'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {taskStats.total} {taskStats.total === 1 ? 'tópico cadastrado' : 'tópicos cadastrados'} • {taskStats.completed} {taskStats.completed === 1 ? 'concluído' : 'concluídos'}
                                </p>
                            </div>
                        </div>

                        {/* Segmented Control Filter Tabs */}
                        <div className="inline-flex p-1 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md self-start sm:self-auto gap-1 shadow-inner">
                            {filters.map(f => {
                                const isActive = filter === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setFilter(f.id)}
                                        aria-pressed={isActive}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                                            isActive
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold scale-[1.02]'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                        }`}
                                    >
                                        <span>{f.label}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-white/5 text-slate-400'
                                        }`}>
                                            {f.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category List */}
                    <div className="space-y-4">
                        {filteredCategories.map(category => (
                            <CategoryAccordion
                                key={category.id}
                                category={category}
                                onToggleTask={onToggleTask}
                                onDeleteTask={onDeleteTask}
                                onAddTask={handleAddTask}
                                onTogglePriority={onTogglePriority}
                                onDeleteCategory={onDeleteCategory}
                                onPlayContext={handlePlayContext}
                                showSimuladoStats={showSimuladoStats}
                                filter={filter}
                                onOpenTaskModal={handleOpenTaskModal}
                                onOpenDeleteCategoryModal={handleOpenDeleteCategoryModal}
                                onOpenDeleteTaskModal={handleOpenDeleteTaskModal}
                            />
                        ))}
                    </div>

                    {onAddCategory && filter !== 'completed' && (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <button
                                type="button"
                                onClick={() => setIsCatModalOpen(true)}
                                className="relative overflow-hidden group p-4 rounded-2xl bg-gradient-to-br from-purple-500/[0.08] via-slate-900/60 to-purple-500/[0.02] border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/10 text-left flex items-center gap-3.5 cursor-pointer"
                            >
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md shadow-purple-950/40 group-hover:scale-110 group-hover:from-purple-500/30 group-hover:to-indigo-500/30 transition-all duration-300 flex-shrink-0">
                                    <Plus size={20} className="text-purple-300 group-hover:rotate-90 transition-transform duration-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="block font-bold text-sm sm:text-base text-slate-100 group-hover:text-white transition-colors tracking-tight">
                                        Nova Disciplina
                                    </span>
                                    <span className="block text-xs text-purple-300/60 group-hover:text-purple-200/80 transition-colors truncate">
                                        Adicionar matéria ao edital
                                    </span>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-white/[0.03] group-hover:bg-purple-500/20 border border-white/5 group-hover:border-purple-500/30 flex items-center justify-center text-slate-400 group-hover:text-purple-200 transition-all flex-shrink-0">
                                    <span className="text-xs font-black tracking-wider">&rarr;</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(true)}
                                className="relative overflow-hidden group p-4 rounded-2xl bg-gradient-to-br from-blue-500/[0.08] via-slate-900/60 to-cyan-500/[0.02] border border-blue-500/20 hover:border-blue-500/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/10 text-left flex items-center gap-3.5 cursor-pointer"
                            >
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shadow-md shadow-blue-950/40 group-hover:scale-110 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all duration-300 flex-shrink-0">
                                    <Download size={18} className="text-blue-300 group-hover:-translate-y-0.5 transition-transform duration-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="block font-bold text-sm sm:text-base text-slate-100 group-hover:text-white transition-colors tracking-tight">
                                        Importar Disciplina
                                    </span>
                                    <span className="block text-xs text-blue-300/60 group-hover:text-blue-200/80 transition-colors truncate">
                                        Copiar de outro concurso
                                    </span>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-white/[0.03] group-hover:bg-blue-500/20 border border-white/5 group-hover:border-blue-500/30 flex items-center justify-center text-slate-400 group-hover:text-blue-200 transition-all flex-shrink-0">
                                    <span className="text-xs font-black tracking-wider">&rarr;</span>
                                </div>
                            </button>
                        </div>
                    )}
                </>
            )}

            <PromptModal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                onConfirm={(name) => {
                    const trimmedName = typeof name === 'string' ? name.trim() : '';
                    if (!trimmedName) {
                        showToast('O nome da disciplina não pode ser vazio.', 'error');
                        return;
                    }
                    const normName = normalize(trimmedName);
                    if (safeCategories.some(c => normalize(c.name) === normName)) {
                        showToast(`A disciplina "${trimmedName}" já existe.`, 'warning');
                        return;
                    }
                    onAddCategory(trimmedName);
                    setIsCatModalOpen(false);
                    scrollToBottom();
                }}
                title="Nova Disciplina"
                placeholder="Ex: Direito Administrativo..."
            />

            {isImportModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => setIsImportModalOpen(false)}
                        aria-hidden="true"
                    />

                    <div
                        ref={importModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="import-modal-title"
                        tabIndex={-1}
                        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative z-10 p-6 flex flex-col max-h-[80vh] focus:outline-none"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-white">
                                <Download size={20} className="text-purple-400" />
                                <h3 className="text-lg font-bold">
                                    Importar Disciplina
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                                aria-label="Fechar modal de importação"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {!contests || Object.keys(contests).length <= 1 ? (
                            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-sm">
                                    Você precisa ter mais de um concurso (painel) criado para poder importar disciplinas.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                                <div>
                                    <label className="block text-xs text-slate-400 font-bold uppercase mb-2">
                                        Selecione o Concurso Origem
                                    </label>

                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                        value={importSourceContest}
                                        onChange={(e) => setImportSourceContest(e.target.value)}
                                    >
                                        <option value="">
                                            -- Escolha um concurso --
                                        </option>

                                        {Object.entries(contests).map(([id, contest]) => {
                                            if (id === activeId) return null;

                                            return (
                                                <option key={id} value={id}>
                                                    {getContestDisplayName(contest, 'Concurso sem nome')}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {importSourceContest && sourceCategories.length > 0 && (
                                    <div>
                                        <label className="block text-xs text-slate-400 font-bold uppercase mb-2">
                                            Disciplinas Disponíveis
                                        </label>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {sourceCategories.map(cat => {
                                                // ✅ FIX L02: Proteção contra crash se normalize falhar
                                                // ou se properties estiverem undefined.
                                                const exists = safeCategories.some(c => {
                                                    try {
                                                        const n1 = normalize(c?.name || '');
                                                        const n2 = normalize(cat?.name || '');
                                                        return n1 === n2;
                                                    } catch (e) {
                                                        console.warn('[Checklist] Erro ao normalizar nomes:', e);
                                                        return false;
                                                    }
                                                });

                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        disabled={exists}
                                                        onClick={() => {
                                                            if (handleImportWithFeedback) {
                                                                handleImportWithFeedback(importSourceContest, cat.id);
                                                                setIsImportModalOpen(false);
                                                                scrollToBottom();
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${exists
                                                            ? 'bg-slate-800/30 border-white/5 opacity-50 cursor-not-allowed'
                                                            : 'bg-slate-800/80 border-white/10 hover:border-purple-500/50 hover:bg-slate-800'
                                                            }`}
                                                    >
                                                        <span className="text-xl" aria-hidden="true">
                                                            {cat.icon || '📚'}
                                                        </span>

                                                        <div className="flex-1 min-w-0">
                                                            <div
                                                                className="text-sm font-bold text-white break-words line-clamp-2"
                                                                style={{ color: cat.color }}
                                                            >
                                                                {cat.name}
                                                            </div>

                                                            <div className="text-[10px] text-slate-400">
                                                                {exists
                                                                    ? 'Já existe'
                                                                    : `${toArray(cat.tasks).length} tarefas`}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {importSourceContest && sourceCategories.length === 0 && (
                                    <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-white/5">
                                        <p className="text-slate-500 text-xs font-bold uppercase">
                                            Nenhuma disciplina encontrada
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ✅ LOTE-03: Modais únicos centralizados */}
            <PromptModal
                isOpen={taskModalCatId !== null}
                onClose={() => setTaskModalCatId(null)}
                onConfirm={(title) => {
                    if (taskModalCatId) {
                        handleAddTask(taskModalCatId, title);
                    }
                    setTaskModalCatId(null);
                }}
                title="Novo Assunto"
                placeholder="Ex: Direitos e Garantias Fundamentais..."
            />

            <ConfirmModal
                isOpen={deleteCatModal !== null}
                onClose={() => setDeleteCatModal(null)}
                onConfirm={() => {
                    if (deleteCatModal) {
                        onDeleteCategory(deleteCatModal.id);
                    }
                    setDeleteCatModal(null);
                }}
                title="Excluir Disciplina?"
                message={`Tem certeza que deseja excluir ${deleteCatModal?.name || 'esta disciplina'} e todas as suas tarefas? Esta disciplina e suas tarefas serão movidas para a lixeira.`}
                confirmText="Excluir"
            />

            <ConfirmModal
                isOpen={deleteTaskModal !== null}
                onClose={() => setDeleteTaskModal(null)}
                onConfirm={() => {
                    if (deleteTaskModal) {
                        onDeleteTask(deleteTaskModal.catId, deleteTaskModal.task.id || deleteTaskModal.task.text);
                    }
                    setDeleteTaskModal(null);
                }}
                title="Excluir Assunto?"
                message={`Tem certeza que deseja excluir ${deleteTaskModal?.task?.title || deleteTaskModal?.task?.text || 'este assunto'}? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
            />

            <div ref={bottomRef} className="h-px w-full" />
        </div>
    );
}

export default React.memo(Checklist);

