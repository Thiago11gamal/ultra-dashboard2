import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Plus, Trash2, TrendingUp, TrendingDown, Minus, BarChart2, Play } from 'lucide-react';
import PromptModal from './PromptModal';

const priorityColors = {
    high: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
    medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
    low: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
};

const PerformancePanel = ({ stats, color }) => {
    if (!stats) return null;

    const { average = 0, lastAttempt = 0, trend = 'stable', level = '-', history = [] } = stats;

    let trendIcon = <div className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-500/10"><Minus size={14} className="text-slate-400" /></div>;
    let trendText = "Estável";
    if (trend === 'up') {
        trendIcon = <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]"><TrendingUp size={14} className="text-emerald-400" /></div>;
        trendText = "Subindo";
    } else if (trend === 'down') {
        trendIcon = <div className="w-5 h-5 flex items-center justify-center rounded-full bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]"><TrendingDown size={14} className="text-rose-400" /></div>;
        trendText = "Caindo";
    }

    let levelColor = "text-slate-400 bg-slate-500/10 border-slate-500/20";
    if (level === 'ALTO') levelColor = "text-green-400 bg-green-500/10 border-green-500/20";
    if (level === 'MÉDIO') levelColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    if (level === 'BAIXO') levelColor = "text-red-400 bg-red-500/10 border-red-500/20";

    return (
        <div className="relative p-4 mx-4 mb-4 bg-gradient-to-r from-slate-900 to-slate-800/50 rounded-xl border border-white/10 shadow-inner group">
            {/* Background Layer for Overflow Safety */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                {/* No specific background artifacts yet */}
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center gap-2 mb-4 text-slate-300 text-sm font-semibold uppercase tracking-wider leading-relaxed py-1">
                <BarChart2 size={16} style={{ color }} />
                <h3>Média de acerto (Simulados)</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* General Average */}
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 uppercase font-bold mb-1">Média Geral</span>
                    <span className="text-2xl font-bold" style={{ color }}>{average}%</span>
                </div>

                {/* Last Attempt */}
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 uppercase font-bold mb-1">Última</span>
                    <span className="text-xl font-mono text-slate-200">{lastAttempt}%</span>
                </div>

                {/* Level */}
                <div className={`p-3 rounded-lg border flex flex-col items-center justify-center ${levelColor}`}>
                    <span className="text-xs uppercase font-bold mb-1 opacity-80">Nível</span>
                    <span className="text-sm font-bold">{level}</span>
                </div>

                {/* Trend */}
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 uppercase font-bold mb-1">Tendência</span>
                    <div className="flex items-center gap-1">
                        {trendIcon}
                        <span className="text-xs text-slate-300">{trendText}</span>
                    </div>
                </div>
            </div>

            {/* Simple History Chart Bar */}
            {history.length > 1 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Evolução Recente</p>
                    <div className="flex items-end h-16 gap-1 w-full overflow-visible">
                        {(() => {
                            const sliced = history.slice(-10);
                            return sliced.map((h, i) => (
                                <div key={h.date || `hist-${i}`} className="flex-1 flex flex-col items-center group relative">
                                    <div
                                        className="w-full bg-slate-700/50 hover:bg-white/20 transition-all rounded-t-sm"
                                        style={{
                                            height: `${Math.min(100, Math.max(2, h.score || 0))}%`,
                                            backgroundColor: i === sliced.length - 1 ? color : undefined,
                                            opacity: i === sliced.length - 1 ? 1 : 0.3
                                        }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {h.score}% ({new Date(h.date).toLocaleDateString('pt-BR')})
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

const TaskItem = ({ task, onToggle, onDelete, onTogglePriority, onTriggerPlay }) => {
    const safePriority = (task.priority || 'medium').toLowerCase();
    const priority = priorityColors[safePriority] || priorityColors.medium;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.07] transition-all group shadow-sm hover:shadow-md ${task.completed ? 'opacity-40' : ''}`}
        >
            {/* Checkbox */}
            <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggle(task.id)}
                className="flex-shrink-0 w-5 h-5 cursor-pointer accent-purple-500 hover:scale-110 transition-transform"
            />

            {/* Task Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                        {task.title || task.text || "Tarefa sem nome"}
                    </p>
                    {task.status === 'studying' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-xs font-bold uppercase bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse shadow-lg shadow-purple-500/20 whitespace-nowrap flex-shrink-0">
                            ⚡ Estudando
                        </span>
                    )}
                    {task.status === 'paused' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-xs font-bold uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 whitespace-nowrap flex-shrink-0">
                            ⏸️ Pausado
                        </span>
                    )}
                </div>
                {task.notes && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{task.notes}</p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {/* Play / Retornar Button (ULTRA PREMIUM) */}
                {task.status === 'studying' ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTriggerPlay();
                        }}
                        className="relative px-4 sm:px-5 h-7 sm:h-9 flex items-center justify-center gap-1.5 sm:gap-2 rounded-full transition-all duration-500 hover:scale-[1.05] active:scale-95 group overflow-visible animate-pulse"
                        title="Retornar ao Pomodoro"
                    >
                        {/* Glow Background / Halo Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 rounded-full blur-[6px] opacity-60 group-hover:opacity-100 group-hover:blur-md transition-all duration-500" />

                        {/* Main Glowing Body with Top Inner Reflection */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-500 rounded-full border border-white/20 group-hover:border-white/50 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />

                        {/* Pulsing Recording Status Bubble */}
                        <div className="relative flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                            {/* Outer glowing pulse */}
                            <div className="absolute w-3 h-3 bg-red-500/50 rounded-full animate-ping blur-[1px]" />
                            {/* Inner 3D jewel dot */}
                            <div className="w-2 h-2 bg-gradient-to-br from-rose-300 via-red-500 to-red-700 rounded-full shadow-[0_0_8px_rgba(239,68,68,1),inset_0_1px_1px_rgba(255,255,255,0.8)] relative z-10 border border-red-800/20" />
                        </div>

                        {/* Text and Micro-animated Icon */}
                        <span className="text-white font-black text-[9px] sm:text-[10px] tracking-[0.15em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] whitespace-nowrap relative z-10 flex items-center justify-center">
                            RETORNAR
                            {/* Slide-in Play icon on hover */}
                            <Play size={9} className="fill-white opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-1 group-hover:translate-x-1.5 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)" />
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTriggerPlay();
                        }}
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all group/play text-purple-400 bg-purple-500/10 border border-purple-500/30 hover:text-white hover:bg-purple-500/40 hover:ring-2 hover:ring-purple-400/50 hover:scale-110 shadow-lg shadow-purple-500/10"
                        title="Estudar agora (Pomodoro)"
                    >
                        <Play size={18} className="translate-x-[1px] group-hover/play:scale-110 transition-transform fill-purple-500/20 group-hover/play:fill-purple-500/40 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]" />
                    </button>
                )}

                {/* Priority Badge */}
                <button
                    onClick={() => onTogglePriority(task.id)}
                    className={`w-14 sm:w-20 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-xs font-semibold uppercase hover:opacity-80 transition-opacity text-center ${priority.bg} ${priority.text} ${priority.border} border`}
                    title="Clique para mudar a prioridade"
                >
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </button>

                {/* Delete Button - always visible on mobile */}
                <button
                    onClick={() => onDelete(task.id)}
                    className="w-8 h-8 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
};

const CategoryAccordion = ({ category, onToggleTask, onDeleteTask, onAddTask, onTogglePriority, onDeleteCategory, onPlayContext, showSimuladoStats, filter }) => {
    const playHandler = (catId, taskId) => {
        if (typeof onPlayContext === 'function') {
            onPlayContext(catId, taskId);
        } else {
            console.error("Checklist: onPlayContext missing");
        }
    };
    const [isOpen, setIsOpen] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    const tasks = category.tasks || [];
    const allTasks = category.originalTasks || tasks; // Use original/all tasks for progress bar

    const completedCount = allTasks.filter(t => t.completed).length;
    const progress = allTasks.length > 0
        ? Math.round((completedCount / allTasks.length) * 100)
        : 0;

    // For display "X de Y concluídas", we probably still want to show the TOTAL progress, not the filtered count.
    // "completedCount" here is global completed count.
    // "tasks.length" in render is filtered count. Let's adjust the text below too?
    // Actually, "X de Y" usually implies Total. Let's use Global stats for the header info.

    return (
        <div className="glass overflow-hidden shadow-lg transition-all duration-500 hover:shadow-purple-500/5 hover:-translate-y-1 relative group border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.02] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Header */}
            <div className="w-full flex items-center gap-2 p-3 sm:p-5 hover:bg-white/5 transition-colors">
                {/* Clickable area for accordion toggle */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 sm:gap-4 flex-1 cursor-pointer min-w-0"
                >
                    <span className="text-xl sm:text-2xl flex-shrink-0">{category.icon || '📚'}</span>
                    <div className="text-left flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm sm:text-lg truncate" style={{ color: category.color }}>
                                {category.name || 'Sem Nome'}
                            </h3>
                            {category.totalMinutes > 0 && (
                                <span className="text-yellow-400/80 text-[9px] sm:text-[10px] font-black whitespace-nowrap border border-yellow-400/20 px-1 sm:px-1.5 py-0.5 rounded-sm leading-normal">
                                    {Math.floor(category.totalMinutes / 60)}h{category.totalMinutes % 60}m
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                            {completedCount} de {allTasks.length} concluídas
                        </p>
                    </div>
                </div>

                {/* Delete Category Button - ULTRA VISIBLE */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsConfirmDeleteOpen(true);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all transform hover:scale-110 active:scale-95 flex-shrink-0"
                    title="Excluir Disciplina Permanente"
                >
                    <Trash2 size={16} strokeWidth={3} />
                </button>

                {/* Right side: Progress + Toggle */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-end gap-2 sm:gap-4 cursor-pointer flex-shrink-0"
                >
                    <>
                        <div className="w-14 sm:w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress}%`, backgroundColor: category.color }}
                            />
                        </div>
                        <span className="text-xs sm:text-sm font-mono flex-shrink-0" style={{ color: category.color }}>
                            {progress}%
                        </span>
                    </>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* Tasks */}
            {isOpen && (
                <div className="border-t border-white/10">
                    {/* PERFORMANCE PANEL (Simulados) - Only show if enabled */}
                    {showSimuladoStats && (
                        <div className="pt-4">
                            <PerformancePanel stats={category.simuladoStats} color={category.color} />
                        </div>
                    )}

                    <div className="p-4 space-y-3 pb-8">
                        {(category.tasks || []).length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-2">Nenhum assunto cadastrado.</p>
                        ) : (
                            category.tasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onToggle={(id) => onToggleTask(category.id, id)}
                                    onDelete={(id) => onDeleteTask(category.id, id)}
                                    onTogglePriority={(id) => onTogglePriority(category.id, id)}
                                    onTriggerPlay={() => playHandler(category.id, task.id)}
                                    categoryColor={category.color}
                                />
                            ))
                        )}
                    </div>
                    {/* Add Task Button */}
                    {filter !== 'completed' && (
                        <div className="p-4 pt-0">
                            <button
                                onClick={() => setIsTaskModalOpen(true)}
                                className="w-full py-2 rounded-xl border border-dashed border-orange-500/30 bg-orange-900/20 text-orange-300 hover:bg-orange-800/40 hover:text-orange-100 hover:border-orange-500/50 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                <span>Adicionar Assunto</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
            <PromptModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onConfirm={(title) => onAddTask(category.id, title)}
                title="Novo Assunto"
                placeholder="Nome do novo assunto..."
            />
            {isConfirmDeleteOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsConfirmDeleteOpen(false)} />
                    <div className="bg-slate-900 border border-red-500/50 rounded-2xl w-full max-w-sm shadow-2xl relative z-10 p-6 flex flex-col items-center text-center">
                        <Trash2 size={48} className="text-red-500 mb-4 p-2 bg-red-500/10 rounded-full" />
                        <h3 className="text-xl font-bold text-white mb-2">Excluir Disciplina?</h3>
                        <p className="text-sm text-slate-400 mb-6">Tem certeza que deseja excluir <strong>{category.name}</strong> e todas as suas tarefas? Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsConfirmDeleteOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={() => { setIsConfirmDeleteOpen(false); onDeleteCategory(category.id); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default function Checklist({ categories = [], onToggleTask, onDeleteTask, onAddTask, onTogglePriority, onAddCategory, onDeleteCategory, onPlayContext, filter = 'all', setFilter, showSimuladoStats = false }) {
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);

    if (typeof onPlayContext !== 'function') {
        console.error('Checklist: onPlayContext prop is MISSING or not a function');
    }
    const filters = [
        { id: 'all', label: 'Todas' },
        { id: 'active', label: 'Ativas' },
        { id: 'completed', label: 'Concluídas' },
    ];

    // Filter tasks within categories
    const filteredCategories = categories.map(cat => ({
        ...cat,
        originalTasks: cat.tasks || [], // Keep reference to all tasks
        tasks: (cat.tasks || []).filter(task => {
            if (filter === 'active') return !task.completed;
            if (filter === 'completed') return task.completed;
            return true;
        })
    })).filter(() => true); // Always show categories, even if empty

    return (
        <div className="min-h-[300px] w-full">
            {/* Empty State for New Users */}
            {categories.length === 0 && (
                <div className="flex flex-col items-center justify-center p-16 mb-6 border-2 border-dashed border-white/10 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="relative z-10 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 mx-auto border border-white/10 shadow-2xl relative">
                            <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl animate-pulse" />
                            <span className="text-5xl animate-bounce">🚀</span>
                        </div>
                        <h3 className="text-white font-black text-2xl mb-2 tracking-tight">Prepare-se para o Topo!</h3>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                            Organize sua rotina. Adicione sua primeira disciplina para <span className="text-purple-400 font-bold">desbloquear o dashboard</span>.
                        </p>
                    </div>
                </div>
            )}
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {filters.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.id
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : 'glass text-slate-400 hover:text-white'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Precision Aligned Header Row */}
            <div className="hidden sm:flex items-center justify-between px-5 py-3 mb-1 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 opacity-70 leading-normal">
                <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 flex-shrink-0"></div> {/* Match Icon (24px) + Gap (16px) */}
                    <div className="w-64 md:w-80 lg:w-96 flex-shrink-0 mr-4">Disciplina</div>
                </div>
                <div className="w-12"></div> {/* Trash Placeholder */}
                <div className="w-32 md:w-40 flex-shrink-0 text-right pr-9">Progresso</div>
            </div>

            {/* Categories */}
            <div className="space-y-4">
                {filteredCategories.map(category => (
                    <CategoryAccordion
                        key={category.id}
                        category={category}
                        onToggleTask={onToggleTask}
                        onDeleteTask={onDeleteTask}
                        onAddTask={(catId, title) => {
                            if (onAddTask) {
                                onAddTask(catId, title);
                                // UX Improvement: If filter is hiding new tasks (e.g. 'completed'), switch to 'all'
                                if (filter === 'completed') {
                                    setFilter('all');
                                }
                            }
                        }}
                        onTogglePriority={onTogglePriority}
                        onDeleteCategory={onDeleteCategory}
                        onPlayContext={(c, t) => {
                            if (onPlayContext) onPlayContext(c, t);
                        }}
                        showSimuladoStats={showSimuladoStats}
                        filter={filter}
                    />
                ))}
            </div>

            {/* Add Category Button */}
            {onAddCategory && filter !== 'completed' && (
                <div className="mt-6">
                    <button
                        onClick={() => setIsCatModalOpen(true)}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-yellow-200/20 bg-yellow-200/5 text-yellow-200 hover:text-yellow-100 hover:bg-yellow-200/10 hover:border-yellow-200/40 transition-all flex items-center justify-center gap-3 group"
                    >
                        <span className="p-2 rounded-lg bg-yellow-200/10 group-hover:bg-yellow-200/20 text-2xl transition-colors">📚</span>
                        <span className="font-semibold text-lg">Adicionar Disciplina</span>
                    </button>
                </div>
            )}

            <PromptModal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                onConfirm={(name) => onAddCategory(name)}
                title="Nova Disciplina"
                placeholder="Nome da nova disciplina..."
            />
        </div>
    );
}
