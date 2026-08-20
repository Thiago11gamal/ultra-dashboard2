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
    X
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
        <div className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-500/10">
            <Minus size={14} className="text-slate-400" />
        </div>
    );

    let trendText = 'Estável';

    if (trend === 'up') {
        trendIcon = (
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                <TrendingUp size={14} className="text-emerald-400" />
            </div>
        );
        trendText = 'Subindo';
    } else if (trend === 'down') {
        trendIcon = (
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                <TrendingDown size={14} className="text-rose-400" />
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
        <div className="relative p-4 mx-4 mb-4 bg-gradient-to-r from-slate-900 to-slate-800/50 rounded-xl border border-white/10 shadow-inner group">
            <div className="relative z-10 flex items-center gap-2 mb-4 text-slate-300 text-sm font-semibold uppercase tracking-wider leading-relaxed py-1">
                <BarChart2 size={16} style={{ color: color || '#818cf8' }} />
                <h3>Média de acerto (Simulados)</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-500 uppercase font-bold mb-1">
                        Média Geral
                    </span>
                    <span className="text-2xl font-bold" style={{ color: color || '#818cf8' }}>
                        {avgDisplay}
                    </span>
                    {avgPctSub && (
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {avgPctSub}
                        </span>
                    )}
                </div>

                <div className="bg-black/20 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-500 uppercase font-bold mb-1">
                        Última
                    </span>
                    <span className="text-xl font-mono text-slate-200">
                        {lastDisplay}
                    </span>
                    {lastPctSub && (
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {lastPctSub}
                        </span>
                    )}
                </div>

                <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${levelColor}`}>
                    <span className="text-xs uppercase font-bold mb-1 opacity-80">
                        Nível
                    </span>
                    <span className="text-sm font-bold">
                        {level}
                    </span>
                </div>

                <div className="bg-black/20 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 uppercase font-bold mb-1">
                        Tendência
                    </span>

                    <div className="flex items-center gap-1">
                        {trendIcon}
                        <span className="text-xs text-slate-300">
                            {trendText}
                        </span>
                    </div>
                </div>
            </div>

            {history.length > 1 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">
                        Evolução Recente
                    </p>

                    <div className="flex items-end h-16 gap-1 w-full overflow-visible">
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
                    onClick={() => onTogglePriority(task.id)}
                    className={`px-3 sm:w-20 py-1.5 rounded-lg text-[9px] sm:text-xs font-black uppercase transition-all ${priority.bg} ${priority.text} ${priority.border} border`}
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
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white shadow-[0_0_15px_rgba(0,0,0,0.4)] transition-all transform hover:scale-110 active:scale-95 flex-shrink-0"
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
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all transform hover:scale-110 active:scale-95 flex-shrink-0"
                        title="Excluir Disciplina Permanente"
                        aria-label={`Excluir disciplina ${category.name || 'sem nome'}`}
                    >
                        <Trash2 size={16} strokeWidth={3} />
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

                    <div className="p-4 space-y-3 pb-8">
                        {originalTasks.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-2">
                                Nenhum assunto cadastrado nesta disciplina.
                            </p>
                        ) : visibleTasks.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-2">
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
                                    onTogglePriority={(id) => onTogglePriority(category.id, id)}
                                    onTriggerPlay={() => onPlayContext(category.id, task.id)}
                                />
                            ))
                        )}
                    </div>

                    {filter !== 'completed' && (
                        <div className="p-4 pt-0">
                            <button
                                type="button"
                                onClick={() => onOpenTaskModal(category.id)}
                                className="w-full py-2 rounded-xl border border-dashed border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-800/40 hover:text-purple-100 hover:border-purple-500/50 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                <span>Adicionar Assunto</span>
                            </button>
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
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importSourceContest, setImportSourceContest] = useState('');

    // ✅ LOTE-03: estado dos modais centralizados
    const [taskModalCatId, setTaskModalCatId] = useState(null);
    const [deleteCatModal, setDeleteCatModal] = useState(null); // { id, name }
    const [deleteTaskModal, setDeleteTaskModal] = useState(null); // { catId, task }

    const handleOpenTaskModal = useCallback((catId) => {
        setTaskModalCatId(catId);
    }, []);

    const handleOpenDeleteCategoryModal = useCallback((catId, catName) => {
        setDeleteCatModal({ id: catId, name: catName });
    }, []);

    const handleOpenDeleteTaskModal = useCallback((catId, task) => {
        setDeleteTaskModal({ catId, task });
    }, []);

    const bottomRef = useRef(null);
    const scrollTimerRef = useRef(null);
    const importModalRef = useRef(null);

    useModalAccessibility(isImportModalOpen, () => setIsImportModalOpen(false), importModalRef);

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
    }, [safeCategories, filter]);

    const handleAddTask = useCallback((catId, title) => {
        if (!onAddTask) return;

        onAddTask(catId, title);

        if (filter === 'completed') {
            setFilter?.('all');
        }

        const isLastCategory = safeCategories.length > 0 && catId === safeCategories[safeCategories.length - 1].id;

        if (isLastCategory) {
            scrollToBottom();
        }
    }, [onAddTask, filter, setFilter, safeCategories, scrollToBottom]);

    const handlePlayContext = useCallback((categoryId, taskId) => {
        if (onPlayContext) {
            onPlayContext(categoryId, taskId);
        }
    }, [onPlayContext]);

    const sourceContest = contests?.[importSourceContest];

    const sourceCategories = useMemo(() => {
        return toArray(sourceContest?.categories);
    }, [sourceContest]);

    const filters = [
        { id: 'all', label: 'Todas' },
        { id: 'active', label: 'Ativas' },
        { id: 'completed', label: 'Concluídas' },
    ];

    return (
        <div className="min-h-[300px] w-full">
            {safeCategories.length === 0 && (
                <div className="flex flex-col items-center justify-center p-16 mb-6 border-2 border-dashed border-white/10 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    <div className="relative z-10 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 mx-auto border border-white/10 shadow-2xl relative">
                            <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl animate-pulse" />
                            <span className="text-5xl animate-bounce" aria-hidden="true">
                                🚀
                            </span>
                        </div>

                        <h3 className="text-white font-black text-2xl mb-2 tracking-tight">
                            Prepare-se para o Topo!
                        </h3>

                        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                            Organize sua rotina. Adicione sua primeira disciplina para{' '}
                            <span className="text-purple-400 font-bold">
                                desbloquear o dashboard
                            </span>.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mb-6">
                {filters.map(f => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        aria-pressed={filter === f.id}
                        className={`px-4 py-2 rounded-2xl text-sm font-bold tracking-wider uppercase transition-all duration-150 border ${filter === f.id
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white border-white/20 shadow-sm scale-[1.02]'
                            : 'bg-slate-900/70 border-white/10 text-slate-400 hover:bg-slate-800/90 hover:text-slate-200 hover:border-white/20'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

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
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button
                        type="button"
                        onClick={() => setIsCatModalOpen(true)}
                        className="flex-1 py-4 rounded-xl border-2 border-dashed border-purple-500/20 bg-purple-500/5 text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all flex items-center justify-center gap-3 group"
                    >
                        <span className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 text-2xl transition-colors" aria-hidden="true">
                            📚
                        </span>

                        <span className="font-semibold text-lg">
                            Nova Disciplina
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 py-4 rounded-xl border-2 border-dashed border-blue-500/20 bg-blue-500/5 text-blue-300 hover:text-blue-100 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all flex items-center justify-center gap-3 group"
                    >
                        <Download size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />

                        <span className="font-semibold text-lg">
                            Importar Disciplina
                        </span>
                    </button>
                </div>
            )}

            <PromptModal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                onConfirm={(name) => {
                    onAddCategory(name);
                    setIsCatModalOpen(false);
                    scrollToBottom();
                }}
                title="Nova Disciplina"
                placeholder="Nome da nova disciplina..."
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
                                                const exists = safeCategories.some(c => {
                                                    return normalize(c.name || '') === normalize(cat.name || '');
                                                });

                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        disabled={exists}
                                                        onClick={() => {
                                                            if (onImportCategory) {
                                                                onImportCategory(importSourceContest, cat.id);
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
                        onAddTask(taskModalCatId, title);
                    }
                    setTaskModalCatId(null);
                }}
                title="Novo Assunto"
                placeholder="Nome do novo assunto..."
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
