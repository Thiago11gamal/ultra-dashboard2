import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, TrendingUp, TrendingDown, Minus, BarChart2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars

const priorityColors = {
    high: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
    medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
    low: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
};

const PerformancePanel = ({ stats, color }) => {
    if (!stats) return null;

    const { average = 0, lastAttempt = 0, trend = 'stable', level = '-', history = [] } = stats;

    let trendIcon = <Minus size={16} className="text-slate-400" />;
    let trendText = "Estável";
    if (trend === 'up') {
        trendIcon = <TrendingUp size={16} className="text-green-400" />;
        trendText = "Subindo";
    } else if (trend === 'down') {
        trendIcon = <TrendingDown size={16} className="text-red-400" />;
        trendText = "Caindo";
    }

    let levelColor = "text-slate-400 bg-slate-500/10 border-slate-500/20";
    if (level === 'ALTO') levelColor = "text-green-400 bg-green-500/10 border-green-500/20";
    if (level === 'MÉDIO') levelColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    if (level === 'BAIXO') levelColor = "text-red-400 bg-red-500/10 border-red-500/20";

    return (
        <div className="p-4 mx-4 mb-4 bg-gradient-to-r from-slate-900 to-slate-800/50 rounded-xl border border-white/10 shadow-inner relative overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-2 mb-4 text-slate-300 text-sm font-semibold uppercase tracking-wider">
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
                    <div className="flex items-end h-16 gap-1 w-full overflow-hidden">
                        {(() => {
                            const sliced = history.slice(-10);
                            return sliced.map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center group relative">
                                    <div
                                        className="w-full bg-slate-700/50 hover:bg-white/20 transition-all rounded-t-sm"
                                        style={{
                                            height: `${h.score}%`,
                                            backgroundColor: i === sliced.length - 1 ? color : undefined,
                                            opacity: i === sliced.length - 1 ? 1 : 0.3
                                        }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {h.score}% ({new Date(h.date).toLocaleDateString()})
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
            className={`flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all group ${task.completed ? 'opacity-60' : ''}`}
        >
            {/* Checkbox */}
            <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggle(task.id)}
                className="flex-shrink-0"
            />

            {/* Task Content - Takes remaining space */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className={`font-medium truncate ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                        {task.title || task.text || "Tarefa sem nome"}
                    </p>
                    {task.status === 'studying' && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse shadow-lg shadow-purple-500/20 whitespace-nowrap flex-shrink-0">
                            ⚡ Estudando
                        </span>
                    )}
                    {task.status === 'paused' && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 whitespace-nowrap flex-shrink-0">
                            ⏸️ Pausado
                        </span>
                    )}
                </div>
                {task.notes && (
                    <p className="text-xs text-slate-500 truncate mt-1">{task.notes}</p>
                )}
            </div>

            {/* Action Buttons - Fixed width container at right */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Play Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onTriggerPlay();
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all group/play ${task.status === 'studying' ? 'text-purple-400 bg-purple-500/20 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-purple-500/20'}`}
                    title={task.status === 'studying' ? "Estudando agora..." : "Estudar agora (Pomodoro)"}
                >
                    {task.status === 'studying' ? <BarChart2 size={18} className="animate-spin" /> : <Play size={18} className="group-hover/play:scale-125 group-hover/play:animate-bounce transition-transform" />}
                </button>

                {/* Priority Badge */}
                <button
                    onClick={() => onTogglePriority(task.id)}
                    className={`w-16 py-1.5 rounded-lg text-xs font-semibold uppercase hover:opacity-80 transition-opacity text-center ${priority.bg} ${priority.text} ${priority.border} border`}
                    title="Clique para mudar a prioridade"
                >
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </button>

                {/* Delete Button */}
                <button
                    onClick={() => onDelete(task.id)}
                    className="w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                >
                    <Trash2 size={16} />
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
        <div className="glass relative group">
            {/* Header - Using div instead of button to avoid button nesting */}
            <div className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
                {/* Clickable area for accordion toggle */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                >
                    <span className="text-2xl">{category.icon || '📚'}</span>
                    <div className="text-left">
                        <div className="flex items-center">
                            <h3 className="font-bold text-lg w-80 truncate" style={{ color: category.color }}>
                                {category.name || 'Sem Nome'}
                            </h3>
                            {category.totalMinutes > 0 && (
                                <span className="text-yellow-400 text-sm font-bold whitespace-nowrap">
                                    {Math.floor(category.totalMinutes / 60)}h {category.totalMinutes % 60}min
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-400">
                            {completedCount} de {allTasks.length} concluídas
                        </p>
                    </div>
                </div>

                {/* Delete Category Button - Now properly outside the clickable area */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Tem certeza que deseja excluir a disciplina "${category.name}" e todas as suas tarefas?`)) {
                            onDeleteCategory(category.id);
                        }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 mr-4"
                    title="Excluir Disciplina"
                >
                    <Trash2 size={18} />
                </button>

                {/* Right side: Progress + Toggle */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-4 cursor-pointer"
                >
                    {filter === 'all' && (
                        <>
                            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%`, backgroundColor: category.color }}
                                />
                            </div>
                            <span className="text-sm font-mono" style={{ color: category.color }}>
                                {progress}%
                            </span>
                        </>
                    )}
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                    <div className="p-4 pt-0">
                        <button
                            onClick={() => {
                                const title = prompt('Nome do novo assunto:');
                                if (title) onAddTask(category.id, title);
                            }}
                            className="w-full py-2 rounded-xl border border-dashed border-orange-500/30 bg-orange-900/20 text-orange-300 hover:bg-orange-800/40 hover:text-orange-100 hover:border-orange-500/50 transition-all flex items-center justify-center gap-2 group"
                        >
                            <Plus size={18} className="group-hover:scale-110 transition-transform" />
                            <span>Adicionar Assunto</span>
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default function Checklist({ categories = [], onToggleTask, onDeleteTask, onAddTask, onTogglePriority, onAddCategory, onDeleteCategory, onPlayContext, filter = 'all', setFilter, showSimuladoStats = false }) {
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
        <div>
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
            {onAddCategory && (
                <div className="mt-6">
                    <button
                        onClick={() => {
                            const name = prompt('Nome da nova disciplina:');
                            if (name) onAddCategory(name);
                        }}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-yellow-200/20 bg-yellow-200/5 text-yellow-200 hover:text-yellow-100 hover:bg-yellow-200/10 hover:border-yellow-200/40 transition-all flex items-center justify-center gap-3 group"
                    >
                        <span className="p-2 rounded-lg bg-yellow-200/10 group-hover:bg-yellow-200/20 text-2xl transition-colors">📚</span>
                        <span className="font-semibold text-lg">Adicionar Disciplina</span>
                    </button>
                </div>
            )}
        </div>
    );
}
