import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    Search,
    Flame,
    Layers,
    CheckCircle,
    ListFilter
} from 'lucide-react';
import PromptModal from './PromptModal';
import CategoryEditor from './CategoryEditor';
import { formatMinutes } from '../utils/format';
import { toArray } from '../utils/normalize';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

const priorityColors = {
    high: {
        bg: 'bg-rose-500/15',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        hover: 'hover:bg-rose-500/25'
    },
    medium: {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        hover: 'hover:bg-amber-500/25'
    },
    low: {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        hover: 'hover:bg-emerald-500/25'
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

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Excluir'
}) => {
    const modalRef = useRef(null);
    useModalAccessibility(isOpen, onClose, modalRef);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="bg-slate-900 border border-red-500/40 rounded-3xl w-full max-w-sm shadow-2xl relative z-10 p-6 sm:p-7 flex flex-col items-center text-center backdrop-blur-2xl"
            >
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4 text-red-400 shadow-lg shadow-red-500/10">
                    <Trash2 size={30} />
                </div>

                <h3 className="text-xl font-black text-white mb-2 tracking-tight">
                    {title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 border border-white/10 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-600/30"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const PerformancePanel = ({ stats, color }) => {
    if (!stats) return null;

    const {
        average = 0,
        lastAttempt = 0,
        trend = 'stable',
        level = '-',
        history: rawHistory = []
    } = stats;

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

    if (level === 'ALTO') levelColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (level === 'MÉDIO') levelColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (level === 'BAIXO') levelColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

    return (
        <div className="relative p-4 sm:p-5 mx-4 sm:mx-5 mb-4 bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-slate-950/80 rounded-2xl border border-white/10 shadow-inner group">
            <div className="relative z-10 flex items-center gap-2 mb-3 text-slate-300 text-xs font-black uppercase tracking-widest leading-relaxed">
                <BarChart2 size={16} style={{ color }} />
                <span>Média de Acerto em Simulados</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">
                        Média Geral
                    </span>
                    <span className="text-2xl font-black" style={{ color }}>
                        {average}%
                    </span>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">
                        Última
                    </span>
                    <span className="text-xl font-black text-slate-200">
                        {lastAttempt}%
                    </span>
                </div>

                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${levelColor}`}>
                    <span className="text-[10px] uppercase font-black tracking-wider mb-1 opacity-80">
                        Nível
                    </span>
                    <span className="text-sm font-black">
                        {level}
                    </span>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">
                        Tendência
                    </span>

                    <div className="flex items-center gap-1.5 mt-0.5">
                        {trendIcon}
                        <span className="text-xs font-bold text-slate-300">
                            {trendText}
                        </span>
                    </div>
                </div>
            </div>

            {history.length > 1 && (
                <div className="mt-4 pt-3 border-t border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-2">
                        Histórico Recente
                    </p>

                    <div className="flex items-end h-14 gap-1.5 w-full overflow-visible">
                        {history.slice(-10).map((h, i) => {
                            const dateLabel = getHistoryDateLabel(h);

                            return (
                                <div
                                    key={`${h.date || h.createdAt || 'hist'}-${i}`}
                                    className="flex-1 flex flex-col items-center group/bar relative focus-visible:outline-none"
                                    tabIndex={0}
                                    title={`${h.score}% (${dateLabel})`}
                                >
                                    <div
                                        className="w-full bg-slate-700/40 hover:bg-white/30 transition-all rounded-t-md"
                                        style={{
                                            height: `${Math.min(100, Math.max(4, h.score || 0))}%`,
                                            backgroundColor: i === history.slice(-10).length - 1 ? color : undefined,
                                            opacity: i === history.slice(-10).length - 1 ? 1 : 0.4
                                        }}
                                    />

                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover/bar:opacity-100 group-focus-within/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                        {h.score}% ({dateLabel})
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
            className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-purple-500/30 hover:bg-slate-800/60 transition-all duration-200 group shadow-sm hover:shadow-lg ${task.completed ? 'opacity-40 hover:opacity-75' : ''}`}
        >
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                <button
                    type="button"
                    onClick={() => onToggle(task.id)}
                    aria-label={`Concluir tarefa: ${taskTitle}`}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all duration-200 ${task.completed
                        ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                        : 'border-white/20 hover:border-purple-400 bg-black/40'}`}
                >
                    {task.completed && <CheckCircle size={14} className="stroke-[3]" />}
                </button>

                <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold tracking-tight ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {taskTitle}
                        </p>

                        {task.status === 'studying' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse shadow-lg shadow-purple-500/30 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                                ⚡ Estudando Agora
                            </span>
                        )}
                    </div>

                    {task.notes && (
                        <p className="text-[11px] text-slate-400 break-words line-clamp-2 mt-0.5 leading-snug">
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
                        className="relative px-4 h-8 sm:h-9 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse"
                        title="Retornar ao Pomodoro"
                        aria-label="Retornar ao Pomodoro"
                    >
                        <Play size={12} className="fill-white" />
                        <span>EM CURSO</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTriggerPlay();
                        }}
                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all duration-200 text-purple-400 bg-purple-500/10 border border-purple-500/25 hover:text-white hover:bg-purple-600 hover:border-purple-500 hover:scale-105 shadow-sm"
                        title="Iniciar Pomodoro deste assunto"
                        aria-label={`Iniciar Pomodoro: ${taskTitle}`}
                    >
                        <Play size={14} className="fill-current ml-0.5" />
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onTogglePriority(task.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 ${priority.bg} ${priority.text} ${priority.border} ${priority.hover} border`}
                    aria-label={`Alternar prioridade da tarefa: ${taskTitle}`}
                    title="Clique para alternar prioridade"
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
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                    title="Excluir assunto"
                    aria-label={`Excluir assunto: ${taskTitle}`}
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
    onDeleteTask,
    onAddTask,
    onTogglePriority,
    onDeleteCategory,
    onPlayContext,
    showSimuladoStats,
    filter,
    forceOpen
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isConfirmDeleteTaskOpen, setIsConfirmDeleteTaskOpen] = useState(false);
    const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    useEffect(() => {
        if (typeof forceOpen === 'boolean') {
            setIsOpen(forceOpen);
        }
    }, [forceOpen]);

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
        <div className="bg-gradient-to-b from-slate-900/95 via-[#0e1324]/95 to-slate-900/95 border border-white/10 hover:border-white/20 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 group">
            <div className="w-full flex flex-wrap items-center gap-3 p-4 sm:p-5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                <button
                    type="button"
                    onClick={toggleOpen}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-[200px] cursor-pointer text-left focus:outline-none"
                >
                    <span className="text-2xl sm:text-3xl flex-shrink-0 drop-shadow-md" aria-hidden="true">
                        {category.icon || '📚'}
                    </span>

                    <div className="text-left flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h3
                                className="font-black text-base sm:text-lg tracking-tight break-words line-clamp-2"
                                style={{ color: category.color || '#a855f7' }}
                            >
                                {category.name || 'Sem Nome'}
                            </h3>

                            {category.totalMinutes > 0 && (
                                <span className="text-amber-400 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full leading-normal">
                                    ⏱️ {formatMinutes(category.totalMinutes)}
                                </span>
                            )}
                        </div>

                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {completedCount} de {originalTasks.length} concluídos ({progress}%)
                        </p>
                    </div>
                </button>

                {/* Actions & Mini Progress Bar */}
                <div className="flex items-center gap-2.5 ml-auto">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCategoryEditorOpen(true);
                        }}
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all duration-200 transform hover:scale-105 active:scale-95 flex-shrink-0"
                        title="Configurar disciplina"
                        aria-label={`Configurar disciplina ${category.name || 'sem nome'}`}
                    >
                        <Settings size={15} />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsConfirmDeleteOpen(true);
                        }}
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 transition-all duration-200 transform hover:scale-105 active:scale-95 flex-shrink-0"
                        title="Excluir disciplina permanente"
                        aria-label={`Excluir disciplina ${category.name || 'sem nome'}`}
                    >
                        <Trash2 size={15} />
                    </button>

                    <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-white/10">
                        <div className="w-20 sm:w-28 h-2.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 p-[1px]">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${progress}%`,
                                    backgroundColor: category.color || '#a855f7'
                                }}
                            />
                        </div>

                        <span
                            className="text-xs font-black font-mono w-10 text-right"
                            style={{ color: category.color || '#a855f7' }}
                        >
                            {progress}%
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={toggleOpen}
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0 ml-1"
                        aria-label={isOpen ? 'Recolher disciplina' : 'Expandir disciplina'}
                    >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div
                    id={panelId}
                    className="border-t border-white/5 bg-slate-950/40"
                >
                    {showSimuladoStats && (
                        <div className="pt-4">
                            <PerformancePanel
                                stats={category.simuladoStats}
                                color={category.color}
                            />
                        </div>
                    )}

                    <div className="p-4 sm:p-5 space-y-2.5">
                        {originalTasks.length === 0 ? (
                            <div className="text-center py-6 px-4 bg-slate-900/30 rounded-2xl border border-dashed border-white/10">
                                <p className="text-slate-400 text-xs font-medium">
                                    Nenhum assunto cadastrado nesta disciplina.
                                </p>
                            </div>
                        ) : visibleTasks.length === 0 ? (
                            <div className="text-center py-6 px-4 bg-slate-900/30 rounded-2xl border border-dashed border-white/10">
                                <p className="text-slate-400 text-xs font-medium">
                                    Nenhum assunto correspondente aos filtros de busca.
                                </p>
                            </div>
                        ) : (
                            visibleTasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onToggle={(id) => onToggleTask(category.id, id)}
                                    onDelete={() => {
                                        setTaskToDelete(task);
                                        setIsConfirmDeleteTaskOpen(true);
                                    }}
                                    onTogglePriority={(id) => onTogglePriority(category.id, id)}
                                    onTriggerPlay={() => onPlayContext(category.id, task.id)}
                                />
                            ))
                        )}
                    </div>

                    {filter !== 'completed' && (
                        <div className="p-4 sm:p-5 pt-0">
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(true)}
                                className="w-full py-3 rounded-2xl border border-dashed border-purple-500/30 bg-purple-500/5 text-purple-300 hover:bg-purple-500/15 hover:text-purple-100 hover:border-purple-500/60 transition-all duration-200 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider group"
                            >
                                <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                <span>Adicionar Novo Assunto</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <PromptModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onConfirm={(title) => {
                    onAddTask(category.id, title);
                    setIsTaskModalOpen(false);
                }}
                title="Novo Assunto"
                placeholder="Ex: Teoria Geral dos Contratos, Art. 5º CF..."
            />

            <ConfirmModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={() => onDeleteCategory(category.id)}
                title="Excluir Disciplina?"
                message={`Tem certeza que deseja excluir ${category.name || 'esta disciplina'} e todas as suas tarefas? Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir"
            />

            <ConfirmModal
                isOpen={isConfirmDeleteTaskOpen}
                onClose={() => setIsConfirmDeleteTaskOpen(false)}
                onConfirm={() => {
                    if (taskToDelete) {
                        onDeleteTask(category.id, taskToDelete.id);
                    }
                }}
                title="Excluir Assunto?"
                message={`Tem certeza que deseja excluir ${taskToDelete?.title || taskToDelete?.text || 'este assunto'}?`}
                confirmLabel="Excluir"
            />

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
    filter = 'all',
    setFilter,
    contests,
    activeId,
    onImportCategory
}) {
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importSourceContest, setImportSourceContest] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [allExpanded, setAllExpanded] = useState(null); // null, true, false

    const bottomRef = useRef(null);
    const scrollTimerRef = useRef(null);
    const importModalRef = useRef(null);

    useModalAccessibility(isImportModalOpen, () => setIsImportModalOpen(false), importModalRef);

    useEffect(() => {
        return () => {
            if (scrollTimerRef.current) {
                clearTimeout(scrollTimerRef.current);
            }
        };
    }, []);

    const scrollToBottom = useCallback(() => {
        if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
        }

        scrollTimerRef.current = setTimeout(() => {
            bottomRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            });
        }, 100);
    }, []);

    const safeCategories = useMemo(() => {
        return toArray(categories).map(cat => ({
            ...cat,
            tasks: toArray(cat.tasks)
        }));
    }, [categories]);

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredCategories = useMemo(() => {
        return safeCategories
            .map(cat => {
                const originalTasks = cat.tasks || [];
                const catNameMatches = normalizedSearch ? (cat.name || '').toLowerCase().includes(normalizedSearch) : true;

                const tasks = originalTasks.filter(task => {
                    // Search filtering
                    if (normalizedSearch && !catNameMatches) {
                        const titleMatch = (task.title || task.text || '').toLowerCase().includes(normalizedSearch);
                        const notesMatch = (task.notes || '').toLowerCase().includes(normalizedSearch);
                        if (!titleMatch && !notesMatch) return false;
                    }

                    // Status / Priority filtering
                    if (filter === 'active') return !task.completed;
                    if (filter === 'completed') return task.completed;
                    if (filter === 'high_priority') return String(task.priority || '').toLowerCase() === 'high' && !task.completed;

                    return true;
                });

                return {
                    ...cat,
                    originalTasks,
                    tasks
                };
            })
            .filter(cat => {
                // If searching, only keep categories that have matching tasks OR category name matched
                if (normalizedSearch) {
                    const catNameMatches = (cat.name || '').toLowerCase().includes(normalizedSearch);
                    return catNameMatches || cat.tasks.length > 0;
                }
                return true;
            });
    }, [safeCategories, filter, normalizedSearch]);

    const totalVisibleTasks = useMemo(() => {
        return filteredCategories.reduce((acc, cat) => acc + cat.tasks.length, 0);
    }, [filteredCategories]);

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
        { id: 'all', label: 'Todas as Matérias' },
        { id: 'active', label: 'Pendentes' },
        { id: 'high_priority', label: '🔥 Alta Prioridade' },
        { id: 'completed', label: 'Concluídas' },
    ];

    const toggleExpandAll = () => {
        setAllExpanded(prev => !prev);
    };

    return (
        <div className="min-h-[300px] w-full space-y-5">
            {safeCategories.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 sm:p-16 mb-6 border-2 border-dashed border-purple-500/20 rounded-3xl bg-gradient-to-b from-purple-500/5 via-slate-900/40 to-transparent backdrop-blur-xl text-center relative group">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 rounded-3xl flex items-center justify-center mb-5 mx-auto shadow-2xl">
                        <span className="text-4xl animate-bounce" aria-hidden="true">
                            🚀
                        </span>
                    </div>

                    <h3 className="text-white font-black text-2xl mb-2 tracking-tight">
                        Organize seu Edital & Plano de Estudos
                    </h3>

                    <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                        Adicione sua primeira disciplina para desbloquear todo o poder do motor estatístico e do Coach IA.
                    </p>

                    <button
                        type="button"
                        onClick={() => setIsCatModalOpen(true)}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-600/30 hover:scale-105 transition-all"
                    >
                        + Criar Primeira Disciplina
                    </button>
                </div>
            )}

            {/* ── Barra Superior de Controle & Busca ───────────────────────── */}
            {safeCategories.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar disciplina, assunto ou anotação..."
                                className="w-full bg-slate-950/80 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                                    title="Limpar busca"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Batch Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={toggleExpandAll}
                                className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-2"
                                title="Expandir ou recolher todas as disciplinas"
                            >
                                <Layers size={15} className="text-purple-400" />
                                <span>{allExpanded ? 'Recolher Tudo' : 'Expandir Tudo'}</span>
                            </button>

                            {onAddCategory && (
                                <button
                                    type="button"
                                    onClick={() => setIsCatModalOpen(true)}
                                    className="px-4 py-3 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={15} />
                                    <span className="hidden sm:inline">Nova Disciplina</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Pills & Stats Count */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5">
                        <div className="flex flex-wrap gap-2">
                            {filters.map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFilter(f.id)}
                                    aria-pressed={filter === f.id}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-200 border ${filter === f.id
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/50 shadow-lg shadow-purple-600/25 scale-[1.02]'
                                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-white/20'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="text-[11px] font-bold text-slate-400">
                            Exibindo <span className="text-white font-black">{filteredCategories.length}</span> disciplinas (<span className="text-purple-400 font-black">{totalVisibleTasks}</span> tópicos)
                        </div>
                    </div>
                </div>
            )}

            {/* ── Lista de Acordeões das Disciplinas ───────────────────────── */}
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
                        forceOpen={allExpanded}
                    />
                ))}
            </div>

            {/* ── Ações Inferiores (Importar / Criar) ───────────────────────── */}
            {onAddCategory && filter !== 'completed' && safeCategories.length > 0 && (
                <div className="pt-2 flex flex-col sm:flex-row gap-4">
                    <button
                        type="button"
                        onClick={() => setIsCatModalOpen(true)}
                        className="flex-1 py-4 rounded-2xl border border-dashed border-purple-500/30 bg-purple-500/5 text-purple-300 hover:text-white hover:bg-purple-500/15 hover:border-purple-500/50 transition-all flex items-center justify-center gap-3 font-bold text-sm"
                    >
                        <span className="p-1.5 rounded-xl bg-purple-500/15 text-lg" aria-hidden="true">
                            📚
                        </span>
                        <span>Adicionar Nova Disciplina</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 py-4 rounded-2xl border border-dashed border-blue-500/30 bg-blue-500/5 text-blue-300 hover:text-white hover:bg-blue-500/15 hover:border-blue-500/50 transition-all flex items-center justify-center gap-3 font-bold text-sm"
                    >
                        <Download size={18} className="text-blue-400" />
                        <span>Importar de Outro Concurso</span>
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
                placeholder="Ex: Direito Constitucional, Raciocínio Lógico..."
            />

            {/* ── Modal de Importação ──────────────────────────────────────── */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => setIsImportModalOpen(false)}
                        aria-hidden="true"
                    />

                    <div
                        ref={importModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="import-modal-title"
                        tabIndex={-1}
                        className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl relative z-10 p-6 sm:p-7 flex flex-col max-h-[80vh] focus:outline-none backdrop-blur-2xl"
                    >
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5 text-white">
                                <Download size={22} className="text-purple-400" />
                                <h3 id="import-modal-title" className="text-lg font-black tracking-tight">
                                    Importar Disciplina
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                aria-label="Fechar modal de importação"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {!contests || Object.keys(contests).length <= 1 ? (
                            <div className="text-center p-8 bg-slate-950/50 rounded-2xl border border-white/5">
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Você precisa ter mais de um concurso cadastrado para clonar disciplinas entre eles.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1">
                                <div>
                                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                                        Selecione o Concurso de Origem
                                    </label>

                                    <select
                                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-purple-500 transition-colors"
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
                                                    {contest.contestName || contest.user?.name || 'Concurso sem Nome'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {importSourceContest && sourceCategories.length > 0 && (
                                    <div>
                                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                                            Disciplinas Disponíveis
                                        </label>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {sourceCategories.map(cat => {
                                                const exists = safeCategories.some(c => {
                                                    return (c.name || '').toLowerCase() === (cat.name || '').toLowerCase();
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
                                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${exists
                                                            ? 'bg-slate-950/40 border-white/5 opacity-50 cursor-not-allowed'
                                                            : 'bg-slate-950/80 border-white/10 hover:border-purple-500/60 hover:bg-slate-800'
                                                            }`}
                                                    >
                                                        <span className="text-2xl flex-shrink-0" aria-hidden="true">
                                                            {cat.icon || '📚'}
                                                        </span>

                                                        <div className="flex-1 min-w-0">
                                                            <div
                                                                className="text-sm font-bold text-white break-words line-clamp-1"
                                                                style={{ color: cat.color }}
                                                            >
                                                                {cat.name}
                                                            </div>

                                                            <div className="text-[10px] text-slate-400 font-medium">
                                                                {exists
                                                                    ? 'Já cadastrada'
                                                                    : `${toArray(cat.tasks).length} tópicos`}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div ref={bottomRef} className="h-px w-full" />
        </div>
    );
}

export default React.memo(Checklist);
