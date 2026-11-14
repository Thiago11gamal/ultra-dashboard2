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
    Sparkles,
    Rocket,
    BookOpen,
    Target,
    CheckCircle2,
    Check,
    Pencil,
    StickyNote,
    Search,
    ChevronsUpDown
} from 'lucide-react';
import PromptModal from './PromptModal';
import CategoryEditor from './CategoryEditor';
import ConfirmModal from './ConfirmModal';
import { formatMinutes } from '../utils/format';
import { toArray } from '../utils/normalize';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { getContestDisplayName } from './sidebarUtils';
import { normalize } from '../utils/normalization';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import {
    hexToRgba,
    normalizeHexColor,
    getCategoryColorStyles,
    normalizePriority,
    getPriorityConfig,
    normalizeSimuladoLevel,
    PRIORITY_CONFIG
} from '../utils/colorHelper';
import { pointsToPct, getSafeScore } from '../utils/scoreHelper';
import { normalizeDate } from '../utils/dateHelper';

const priorityColors = PRIORITY_CONFIG;

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

    const PerformancePanel = ({ stats = {}, color, maxScore = 100, minScore = 0 }) => {
        const navigate = useNavigate();
        const safeStats = stats && typeof stats === 'object' ? stats : {};

        const {
            average = null,
            lastAttempt = null,
            trend = 'stable',
            level = '-',
            history: rawHistory = []
    } = safeStats;

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);
    const unsortedHistory = toArray(rawHistory).filter(Boolean);
    const history = unsortedHistory.slice().sort((a, b) => {
        const dA = normalizeDate(a?.date || a?.createdAt);
        const dB = normalizeDate(b?.date || b?.createdAt);
        const tA = dA && !Number.isNaN(dA.getTime()) ? dA.getTime() : 0;
        const tB = dB && !Number.isNaN(dB.getTime()) ? dB.getTime() : 0;
        if (tA === 0 && tB === 0) return 0;
        return tA - tB;
    });
    const hasHistory = history.length > 0;
    const safeColor = normalizeHexColor(color, '#818cf8');
    const colorStyles = getCategoryColorStyles(safeColor, '#818cf8');

    if (!hasHistory) {
        return (
            <div className="relative p-3.5 mx-4 mb-3 bg-white/[0.02] rounded-xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group">
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border shadow-inner"
                        style={{
                            backgroundColor: colorStyles.bg15,
                            borderColor: colorStyles.border30,
                            color: colorStyles.text
                        }}
                    >
                        <BarChart2 size={16} />
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                            Desempenho em simulados
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Nenhum simulado ou bateria de questões registrado para esta matéria ainda.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/simulados')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95 border flex-shrink-0"
                    style={{
                        backgroundColor: colorStyles.bg15,
                        borderColor: colorStyles.border30,
                        color: colorStyles.text
                    }}
                >
                    <Plus size={13} className="stroke-[2.5]" />
                    <span>Registrar simulado</span>
                </button>
            </div>
        );
    }

    const extractEntryScore = (h) => {
        const parsed = getSafeScore(h, safeMax, safeMin);
        return Number.isFinite(parsed) ? parsed : safeMin;
    };

    const computedAvg = hasHistory
        ? history.reduce((sum, h) => sum + extractEntryScore(h), 0) / history.length
        : safeMin;
    const hasExplicitAvg = average !== null && average !== undefined && Number.isFinite(Number(average)) && (Number(average) !== 0 || computedAvg === 0);
    const effectiveAvg = hasExplicitAvg ? Number(average) : computedAvg;

    const computedLast = hasHistory
        ? extractEntryScore(history[history.length - 1])
        : safeMin;
    const hasExplicitLast = lastAttempt !== null && lastAttempt !== undefined && Number.isFinite(Number(lastAttempt)) && (Number(lastAttempt) !== 0 || computedLast === 0);
    const effectiveLast = hasExplicitLast ? Number(lastAttempt) : computedLast;

    let normTrend = String(trend || '').toLowerCase().trim();
    if ((!normTrend || normTrend === 'stable' || normTrend === 'estável' || normTrend === 'estavel') && history.length >= 2) {
        const prevScore = extractEntryScore(history[history.length - 2]);
        const delta = computedLast - prevScore;
        const threshold = (safeMax - safeMin) * 0.01;
        if (delta > threshold) normTrend = 'up';
        else if (delta < -threshold) normTrend = 'down';
    }

    let trendIcon = (
        <div className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-500/10">
            <Minus size={12} className="text-slate-400" />
        </div>
    );
    let trendText = 'Estável';

    if (normTrend === 'up' || normTrend === 'alta' || normTrend === 'subindo') {
        trendIcon = (
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                <TrendingUp size={12} className="text-emerald-400" />
            </div>
        );
        trendText = 'Subindo';
    } else if (normTrend === 'down' || normTrend === 'queda' || normTrend === 'caindo' || normTrend === 'baixo') {
        trendIcon = (
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                <TrendingDown size={12} className="text-rose-400" />
            </div>
        );
        trendText = 'Caindo';
    }

    // Quando há histórico, prioriza o cálculo pela nota real (evitando 'BAIXO' default residual da criação da categoria)
    const effectiveLevelSeed = hasHistory
        ? (effectiveAvg <= safeMin ? 'BAIXO' : '-')
        : level;
    const levelInfo = normalizeSimuladoLevel(effectiveLevelSeed, effectiveAvg, safeMax, safeMin);

    const avgNum = Number(effectiveAvg);
    const formattedAvg = Number.isFinite(avgNum)
        ? (Number.isInteger(avgNum) ? avgNum : avgNum.toFixed(1))
        : effectiveAvg;

    const avgDisplay = (safeMax === 100 && safeMin === 0)
        ? `${formattedAvg}%`
        : `${formattedAvg} / ${safeMax} pts`;
    const avgPctSub = (safeMax !== 100 || safeMin !== 0) && Number.isFinite(avgNum)
        ? `${Math.round(pointsToPct(avgNum, safeMax, safeMin))}%`
        : null;

    const lastNum = Number(effectiveLast);
    const formattedLast = Number.isFinite(lastNum)
        ? (Number.isInteger(lastNum) ? lastNum : lastNum.toFixed(1))
        : effectiveLast;

    const lastDisplay = (safeMax === 100 && safeMin === 0)
        ? `${formattedLast}%`
        : `${formattedLast} / ${safeMax} pts`;
    const lastPctSub = (safeMax !== 100 || safeMin !== 0) && Number.isFinite(lastNum)
        ? `${Math.round(pointsToPct(lastNum, safeMax, safeMin))}%`
        : null;

    return (
        <div className="relative p-4 mx-4 mb-3 bg-white/[0.02] rounded-xl border border-white/5 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                    <BarChart2 size={16} style={{ color: colorStyles.text }} />
                    <h3>Desempenho em simulados</h3>
                    <span className="text-[11px] font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 tabular-nums">
                        {history.length} {history.length === 1 ? 'registro' : 'registros'}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/simulados')}
                    className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                    <Plus size={12} />
                    <span>Novo simulado</span>
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 relative z-10">
                <div className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors px-3 py-2.5 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-xs text-slate-400 font-medium mb-1">
                        Média geral
                    </span>
                    <span className="text-xl font-bold leading-tight tabular-nums" style={{ color: colorStyles.text }}>
                        {avgDisplay}
                    </span>
                    {avgPctSub && (
                        <span className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                            {avgPctSub}
                        </span>
                    )}
                </div>

                <div className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors px-3 py-2.5 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-xs text-slate-400 font-medium mb-1">
                        Último simulado
                    </span>
                    <span className="text-xl font-bold leading-tight tabular-nums text-slate-100">
                        {lastDisplay}
                    </span>
                    {lastPctSub ? (
                        <span className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                            {lastPctSub}
                        </span>
                    ) : history.length > 1 && Number.isFinite(lastNum) && Number.isFinite(avgNum) ? (
                            lastNum - avgNum >= 0.05 ? 'text-emerald-400' : avgNum - lastNum >= 0.05 ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                    {lastNum - avgNum >= 0.05 ? `+${(lastNum - avgNum).toFixed(1)} vs média` : avgNum - lastNum >= 0.05 ? `${(lastNum - avgNum).toFixed(1)} vs média` : '= à média'}
                </span>
                ) : (
                <span className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    recente
                </span>
                    )}
            </div>

            <div className={`px-3 py-2.5 rounded-lg border flex flex-col items-center justify-center text-center shadow-sm transition-colors ${levelInfo.badgeClasses}`}>
                <span className="text-xs font-medium mb-1 opacity-80">
                    Nível
                </span>
                <span className="text-base font-semibold leading-tight">
                    {levelInfo.label}
                </span>
            </div>

            <div className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors px-3 py-2.5 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs text-slate-400 font-medium mb-1">
                    Tendência
                </span>

                <div className="flex items-center gap-1.5">
                    {trendIcon}
                    <span className="text-sm text-slate-200 font-semibold">
                        {trendText}
                    </span>
                </div>
            </div>
        </div>

            {
        history.length > 1 && (
            <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-slate-500 font-medium mb-2">
                    Evolução recente
                </p>

                <div className="flex items-end h-10 gap-0.5 w-full overflow-visible">
                    {history.slice(-10).map((h, i, arr) => {
                        const dateLabel = getHistoryDateLabel(h);
                        const hScore = extractEntryScore(h);
                        const formattedHScore = Number.isInteger(hScore) ? hScore : hScore.toFixed(1);
                        const hPct = Math.round(pointsToPct(hScore, safeMax, safeMin));
                        const barHeight = Math.min(100, Math.max(4, hPct));

                        const labelTooltip = (safeMax === 100 && safeMin === 0)
                            ? `${formattedHScore}% (${dateLabel})`
                            : `${formattedHScore} pts (${hPct}%) (${dateLabel})`;

                        const isLast = i === arr.length - 1;
                        const barOpacity = isLast ? 1 : Math.max(0.35, 0.35 + (i / arr.length) * 0.45);

                        return (
                            <div
                                key={`${h?.id || h?.date || 'hist'}-${i}`}
                                className="flex-1 flex flex-col items-center group/bar relative focus-visible:outline-none h-full justify-end"
                                tabIndex={0}
                                title={labelTooltip}
                            >
                                <div
                                    className="w-full transition-all rounded-t-sm group-hover/bar:brightness-125"
                                    style={{
                                        height: `${barHeight}%`,
                                        backgroundColor: colorStyles.hex,
                                        opacity: barOpacity
                                    }}
                                />

                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-white/10 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 group-focus-within/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 tabular-nums shadow-lg">
                                    {labelTooltip}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    }
        </div >
    );
};

const TaskItem = ({
    task,
    onToggle,
    onUpdate,
    onDelete,
    onTogglePriority,
    onTriggerPlay
}) => {
    const [isEditing, setIsEditing] = useState(false);
    if (!task) return null;
    const taskTitle = task?.title || task?.text || 'Tarefa sem nome';
    const [editTitle, setEditTitle] = useState(taskTitle);
    const [editNotes, setEditNotes] = useState(task.notes || '');
    const [showNotesField, setShowNotesField] = useState(Boolean(task.notes));

    const safePriority = normalizePriority(task.priority);
    const priority = getPriorityConfig(task.priority);

    const handleStartEditing = (e) => {
        if (e) e.stopPropagation();
        setEditTitle(taskTitle);
        setEditNotes(task.notes || '');
        setShowNotesField(Boolean(task.notes));
        setIsEditing(true);
    };

    const handleSave = (e) => {
        if (e) e.preventDefault();
        const trimmed = editTitle.trim();
        if (!trimmed) return;
        if (typeof onUpdate === 'function') {
                const didUpdate = onUpdate(task.id || task.text || task.title, {
                    title: trimmed,
                    notes: showNotesField ? editNotes.trim() : ''
                });
                if(didUpdate === false) return;
        }
        setIsEditing(false);
    };

    const handleCancel = (e) => {
        if (e) e.stopPropagation();
        setEditTitle(taskTitle);
        setEditNotes(task.notes || '');
        setShowNotesField(Boolean(task.notes));
        setIsEditing(false);
    };

    return (
        <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:py-3 sm:px-4 rounded-xl bg-white/[0.03] border ${isEditing
                    ? 'border-purple-500/50 bg-white/[0.07] ring-1 ring-purple-500/30'
                    : 'border-white/5 hover:border-purple-500/30 hover:bg-white/[0.06]'
                } transition-all group shadow-sm hover:shadow-md ${task.completed && !isEditing ? 'opacity-40 hover:opacity-75' : ''}`}
        >
            <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                <button
                    type="button"
                    role="checkbox"
                    disabled={isEditing}
                    aria-checked={Boolean(task.completed)}
                    onClick={() => onToggle(task.id || task.text || task.title)}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 mt-1 sm:mt-0 ${isEditing ? 'opacity-40 cursor-not-allowed border-slate-700' : 'cursor-pointer'
                        } ${task.completed
                            ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 border-purple-400 text-white shadow-sm shadow-purple-500/40'
                            : 'bg-white/[0.04] border-slate-600 hover:border-purple-400 hover:bg-purple-500/10'
                        }`}
                    title={task.completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
                    aria-label={`Concluir tarefa: ${taskTitle}`}
                >
                    {task.completed && (
                        <Check size={13} strokeWidth={3} className="text-white" />
                    )}
                </button>

                {isEditing ? (
                    <form
                        onSubmit={handleSave}
                        className="flex-1 flex flex-col gap-2 min-w-0 py-0.5"
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancel(e);
                                    }
                                }}
                                className="flex-1 bg-slate-950/90 border border-purple-500/60 rounded-lg px-2.5 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-inner"
                                placeholder="Nome do assunto..."
                            />
                            <button
                                type="submit"
                                className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                title="Salvar alterações (Enter)"
                            >
                                <Check size={12} strokeWidth={2.5} />
                                <span>Salvar</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition-all cursor-pointer"
                                title="Cancelar edição (Esc)"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {showNotesField ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleCancel(e);
                                        }
                                    }}
                                    className="flex-1 bg-slate-950/70 border border-white/10 focus:border-purple-500/50 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                                    placeholder="Anotações / resumo rápido do assunto..."
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditNotes('');
                                        setShowNotesField(false);
                                    }}
                                    className="text-[11px] text-slate-500 hover:text-rose-400 px-1 py-0.5 rounded cursor-pointer"
                                    title="Remover anotação"
                                >
                                    Remover
                                </button>
                            </div>
                        ) : (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowNotesField(true)}
                                    className="text-[11px] text-purple-400/80 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={11} />
                                    <span>Adicionar anotação rápida</span>
                                </button>
                            </div>
                        )}
                    </form>
                ) : (
                    <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => onToggle(task.id || task.text || task.title)}
                                onDoubleClick={handleStartEditing}
                                className="text-left group/title focus:outline-none cursor-pointer"
                                title="Clique para alternar ou duplo clique para editar"
                            >
                                <p className={`text-sm sm:text-[15px] font-medium leading-snug transition-colors ${task.completed
                                        ? 'line-through text-slate-500'
                                        : 'text-slate-100 group-hover/title:text-purple-300'
                                    }`}>
                                    {taskTitle}
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={handleStartEditing}
                                className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-500 hover:text-purple-300 transition-all rounded hover:bg-purple-500/10 cursor-pointer"
                                title="Editar assunto e anotações (duplo clique)"
                                aria-label={`Editar ${taskTitle}`}
                            >
                                <Pencil size={12} />
                            </button>

                            {task.status === 'studying' && !task.completed && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap flex-shrink-0 shadow-sm">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500" />
                                    </span>
                                    <span>Estudando</span>
                                </span>
                            )}
                        </div>

                        {task.notes && (
                            <div
                                onClick={handleStartEditing}
                                className="group/notes flex items-start gap-1.5 mt-1 cursor-pointer"
                                title="Clique para editar a anotação"
                            >
                                <StickyNote size={11} className="text-purple-400/80 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-400 group-hover/notes:text-slate-200 transition-colors break-words line-clamp-3 leading-snug">
                                    {task.notes}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!isEditing && (
                <div className="flex items-center justify-end gap-2 w-full sm:w-auto ml-auto pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0 flex-shrink-0">
                    {task.status === 'studying' && !task.completed ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTriggerPlay();
                            }}
                            className="h-8 px-3.5 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-purple-400/40"
                            title="Retornar à sessão ativa no Pomodoro"
                            aria-label={`Retornar à sessão de ${taskTitle}`}
                        >
                            <Play size={12} className="fill-white" />
                            <span>Continuar</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTriggerPlay();
                            }}
                            className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-600 hover:text-white border border-purple-500/20 hover:border-purple-500/50 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                            title="Iniciar sessão de estudo para este assunto no Pomodoro"
                            aria-label={`Estudar agora: ${taskTitle}`}
                        >
                            <Play size={12} className="fill-current" />
                            <span className="hidden sm:inline">Estudar</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePriority(task.id || task.text || task.title);
                        }}
                        className={`h-8 px-2.5 sm:px-3 sm:min-w-[84px] rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 select-none flex items-center justify-center gap-1.5 border whitespace-nowrap shrink-0 ${priority.bg} ${priority.text} ${priority.border}`}
                        title={`Prioridade: ${priority.label} (clique para alternar para ${priority.next})`}
                        aria-label={`Alternar prioridade da tarefa: ${taskTitle}. Atual: ${priority.label}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${priority.dot} flex-shrink-0`} />
                        <span>{priority.label}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onDelete(task.id || task.text || task.title)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.02] hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                        title="Excluir tarefa"
                        aria-label={`Excluir tarefa: ${taskTitle}`}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

const CategoryAccordion = React.memo(({
    category,
    onToggleTask,
    onUpdateTask,
    onTogglePriority,
    onPlayContext,
    showSimuladoStats,
    filter,
    forceExpandState,
    onOpenTaskModal,
    onOpenDeleteCategoryModal,
    onOpenDeleteTaskModal
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);

    useEffect(() => {
        if (forceExpandState && typeof forceExpandState.expanded === 'boolean') {
            setIsOpen(forceExpandState.expanded);
        }
    }, [forceExpandState]);

    const originalTasks = useMemo(
        () => toArray(category.originalTasks ?? category.tasks),
        [category.originalTasks, category.tasks]
    );

    const visibleTasks = useMemo(
        () => toArray(category.tasks),
        [category.tasks]
    );

    const completedCount = originalTasks.filter(t => t && t.completed).length;

    const progress = originalTasks.length > 0
        ? Math.round((completedCount / originalTasks.length) * 100)
        : 0;

    const panelId = `category-panel-${category.id || 'unknown'}`;
    const catStyles = getCategoryColorStyles(category.color, '#a855f7');

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
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 border transition-transform duration-300 group-hover:scale-105 shadow-sm"
                        style={{
                            backgroundColor: catStyles.bg15,
                            borderColor: catStyles.border30
                        }}
                        aria-hidden="true"
                    >
                        {category.icon || '📚'}
                    </div>

                    <div className="text-left flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3
                                className="font-semibold text-base sm:text-lg leading-snug tracking-tight break-words line-clamp-2"
                                style={{ color: catStyles.hex }}
                            >
                                {category.name || 'Sem Nome'}
                            </h3>

                            {category.totalMinutes > 0 && (
                                <span className="text-yellow-400/90 text-[11px] font-semibold tabular-nums whitespace-nowrap border border-yellow-400/20 px-1.5 py-0.5 rounded-md leading-normal">
                                    {formatMinutes(category.totalMinutes)}
                                </span>
                            )}

                            <span
                                className="sm:hidden text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md border"
                                style={{
                                    color: catStyles.hex,
                                    backgroundColor: catStyles.bg10,
                                    borderColor: catStyles.border30
                                }}
                            >
                                {progress}%
                            </span>
                        </div>

                        <p className="text-xs sm:text-[13px] text-slate-400 mt-0.5 tabular-nums">
                            {completedCount} de {originalTasks.length} {completedCount === 1 ? 'concluída' : 'concluídas'}
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
                            onOpenDeleteCategoryModal(category.id || category.name, category.name);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all transform hover:scale-110 active:scale-95 flex-shrink-0 border border-red-500/20"
                        title="Excluir Disciplina (Mover para Lixeira)"
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
                                backgroundColor: catStyles.hex
                            }}
                        />
                    </div>

                    <span
                        className="text-sm font-semibold tabular-nums flex-shrink-0 w-10 sm:w-11 text-right inline-block"
                        style={{ color: catStyles.hex }}
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
                                stats={category.simuladoStats || { history: [] }}
                                color={catStyles.hex}
                                maxScore={category.maxScore ?? 100}
                                minScore={category.minScore ?? 0}
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
                                <button
                                    type="button"
                                    onClick={() => onOpenTaskModal(category.id || category.name)}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} className="text-purple-300" />
                                    <span>Adicionar Primeiro Assunto</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {visibleTasks.length === 0 ? (
                                <p className="text-center text-slate-500 text-sm py-4">
                                    Nenhum assunto encontrado para o filtro atual.
                                </p>
                            ) : (
                                visibleTasks.map((task, index) => (
                                    <TaskItem
                                        key={task.id || task.text || task.title || `task-${index}`}
                                        task={task}
                                        onToggle={(id) => onToggleTask(category.id || category.name, id)}
                                        onUpdate={(id, updates) => onUpdateTask && onUpdateTask(category.id || category.name, id, updates)}
                                        onDelete={() => {
                                            onOpenDeleteTaskModal(category.id || category.name, task);
                                        }}
                                        onTogglePriority={(id) => onTogglePriority(category.id || category.name, id)}
                                        onTriggerPlay={() => onPlayContext(category.id || category.name, task.id || task.text || task.title)}
                                    />
                                ))
                            )}

                            <button
                                type="button"
                                onClick={() => onOpenTaskModal(category.id || category.name)}
                                className="w-full py-2.5 px-4 rounded-xl bg-purple-500/[0.03] hover:bg-purple-500/[0.08] border border-dashed border-purple-500/25 hover:border-purple-500/45 text-slate-400 hover:text-purple-200 transition-all duration-200 flex items-center justify-center gap-2 group text-xs sm:text-sm font-medium shadow-sm mt-3 cursor-pointer"
                            >
                                <div className="w-5 h-5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 group-hover:border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:text-purple-200 transition-all group-hover:scale-110">
                                    <Plus size={13} className="stroke-[2.5]" />
                                </div>
                                <span>Adicionar assunto</span>
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
    onUpdateTask,
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
    const [searchQuery, setSearchQuery] = useState('');
    const [forceExpandState, setForceExpandState] = useState({ expanded: true, version: 0 });

    // ✅ LOTE-03: estado dos modais centralizados
    const [taskModalCatId, setTaskModalCatId] = useState(null);
    const [deleteCatModal, setDeleteCatModal] = useState(null); // { id, name }
    const [deleteTaskModal, setDeleteTaskModal] = useState(null); // { catId, task }

    useEffect(() => {
        if (isImportModalOpen && !importSourceContest && contests) {
            const otherIds = Object.keys(contests).filter(id => id !== activeId);
            if (otherIds.length === 1) {
                setImportSourceContest(otherIds[0]);
            }
        }
    }, [isImportModalOpen, importSourceContest, contests, activeId]);

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
            .find(c => c && (c.id === categoryId || c.name === categoryId));
        if (!catToImport) return;
        const activeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const alreadyExists = activeCats.some(c =>
            normalize(c?.name || '') === normalize(catToImport?.name || '')
        );
        if (alreadyExists) {
            showToast(`A disciplina "${catToImport.name}" já existe neste concurso.`, 'warning');
            return;
        }
        if (typeof onImportCategory === 'function') {
            onImportCategory(sourceContestId, categoryId);
        }
        showToast(`Disciplina "${catToImport.name}" importada com sucesso! ✨`, 'success');
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
            tasks: toArray(cat.tasks).filter(t => t && typeof t === 'object' && (t.title || t.text || t.id))
        }));
    }, [categories]);

    const filteredCategories = useMemo(() => {
                const normQuery = normalize(searchQuery.trim());
                return safeCategories
                    .map(cat => {
                        const catMatches = normQuery ? normalize(cat?.name || '').includes(normQuery) : true;
                        const filteredTasks = (cat.tasks || []).filter(task => {
                            if (!task) return false;
                            if (filter === 'active' && task.completed) return false;
                            if (filter === 'completed' && !task.completed) return false;
                            if (normQuery && !catMatches) {
                                const tText = normalize(String(task.title || task.text || ''));
                                const tNotes = normalize(String(task.notes || ''));
                                return tText.includes(normQuery) || tNotes.includes(normQuery);
                            }
                            return true;
                        });
                        return {
                            ...cat,
                            originalTasks: cat.tasks || [],
                            tasks: filteredTasks,
                            _matchesSearch: !normQuery || catMatches || filteredTasks.length > 0
                        };
                    })
            .filter(cat => cat._matchesSearch);
}, [safeCategories, filter, searchQuery]);

const handleUpdateTask = useCallback((catId, taskId, updates) => {
    if (!onUpdateTask || !updates) return false;
    const trimmedTitle = typeof updates.title === 'string' ? updates.title.trim() : '';
    if (!trimmedTitle) {
        showToast('O título do assunto não pode ser vazio.', 'error');
        return false;
    }
    if (trimmedTitle.length > 200) {
        showToast('O título do assunto é muito longo (máx. 200 caracteres).', 'error');
        return false;
    }

    const category = safeCategories.find(c => c && (c.id === catId || c.name === catId));
    if (category) {
        const taskIndex = (category.tasks || []).findIndex(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
        const normNew = normalize(trimmedTitle);
        const isDuplicate = (category.tasks || []).some((t, idx) => {
            if (idx === taskIndex) return false;
            return normalize(String(t?.text || t?.title || '')) === normNew;
        });
        if (isDuplicate) {
            showToast(`O assunto "${trimmedTitle}" já existe nesta disciplina.`, 'warning');
            return false;
        }
    }

    onUpdateTask(catId, taskId, updates);
    return true;
}, [onUpdateTask, safeCategories, showToast]);

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

    const category = safeCategories.find(c => c && (c.id === catId || c.name === catId));
    if (category) {
        const normNew = normalize(trimmedTitle);
        const alreadyExists = (category.tasks || []).some(t => {
            const existing = normalize(String(t.text || t.title || ''));
            return existing === normNew;
        });
        if (alreadyExists) {
            showToast(`O assunto "${trimmedTitle}" já existe nesta disciplina.`, 'warning');
            return;
        }
    }

    onAddTask(catId, trimmedTitle);
    showToast(`Assunto "${trimmedTitle}" adicionado com sucesso! ✨`, 'success');

    if (filter === 'completed') {
        if (typeof setFilter === 'function') setFilter('all');
    }

    const isLastCategory = safeCategories.length > 0 && (
        catId === safeCategories[safeCategories.length - 1].id ||
        catId === safeCategories[safeCategories.length - 1].name
    );

    if (isLastCategory) {
        scrollToBottom();
    }
}, [onAddTask, filter, setFilter, safeCategories, scrollToBottom, showToast]);

const handlePlayContext = useCallback((categoryId, taskId) => {
    if (onPlayContext) {
        onPlayContext(categoryId, taskId);
    }
}, [onPlayContext]);

const sourceContest = importSourceContest ? contests?.[importSourceContest] : null;

const sourceCategories = useMemo(() => {
    if (!sourceContest) return [];
    return toArray(sourceContest.categories);
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
                            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
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
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-center lg:justify-start w-full sm:w-auto mt-4">
                            <button
                                type="button"
                                onClick={() => setIsCatModalOpen(true)}
                                className="px-7 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm sm:text-base transition-all duration-200 shadow-xl shadow-purple-900/50 hover:shadow-purple-700/60 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer border border-purple-400/30"
                            >
                                <Plus size={20} className="stroke-[2.5]" />
                                <span>Criar primeira disciplina</span>
                            </button>
                            {onAddCategory && (
                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                >
                                    <Download size={14} className="text-slate-400" />
                                    <span>Importar disciplina</span>
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
                    {/* Header with Title, Search, Expand/Collapse and Segmented Control Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-3 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse shadow-sm shadow-purple-500/50" />
                            <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-lg font-bold text-white tracking-tight">
                                            Disciplinas do edital
                                        </h2>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 tabular-nums">
                                            {safeCategories.length} {safeCategories.length === 1 ? 'disciplina' : 'disciplinas'}
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-slate-400 mt-0.5 tabular-nums">
                                        {taskStats.total} {taskStats.total === 1 ? 'tópico cadastrado' : 'tópicos cadastrados'} • {taskStats.completed} {taskStats.completed === 1 ? 'concluído' : 'concluídos'}
                                    </p>
                                </div>
                            </div>

                                        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto w-full lg:w-auto justify-between lg:justify-end">
                                            {/* Search Input */}
                                            <div className="relative flex-1 sm:flex-initial sm:w-56 min-w-[180px]">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                                <input
                                                    type="search"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Buscar disciplina ou assunto..."
                                                    aria-label="Buscar disciplina ou assunto"
                                                    className="w-full bg-slate-900/80 border border-white/10 focus:border-purple-500/50 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                                                />
                                                {searchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchQuery('')}
                                                        aria-label="Limpar busca"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                )}
                                            </div>

                                            {/* Expand / Collapse All Toggle */}
                                            {safeCategories.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setForceExpandState(prev => ({ expanded: !prev.expanded, version: prev.version + 1 }))}
                                                    className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-white/20 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                                                    title={forceExpandState.expanded ? 'Recolher todas as disciplinas' : 'Expandir todas as disciplinas'}
                                                    aria-label={forceExpandState.expanded ? 'Recolher todas as disciplinas' : 'Expandir todas as disciplinas'}
                                                >
                                                    <ChevronsUpDown size={14} />
                                                    <span className="hidden sm:inline">
                                                        {forceExpandState.expanded ? 'Recolher' : 'Expandir'}
                                                    </span>
                                                </button>
                                            )}

                                            {/* Segmented Control Filter Tabs */}
                                            <div className="inline-flex p-1 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md gap-1 shadow-inner">
                                                {filters.map(f => {
                                                    const isActive = filter === f.id;
                                                    return (
                                                        <button
                                                            key={f.id}
                                                            type="button"
                                                            onClick={() => setFilter(f.id)}
                                                            aria-pressed={isActive}
                                                            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${isActive
                                                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold scale-[1.02]'
                                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <span>{f.label}</span>
                                                            <span className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full leading-none ${isActive
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
                    </div>

                            {/* Category List */}
                            <div className="space-y-4">
                                {filteredCategories.length === 0 ? (
                                    <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-2">
                                        <p className="text-slate-300 font-semibold text-sm">
                                            Nenhuma disciplina ou assunto encontrado para &ldquo;{searchQuery}&rdquo;
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="text-xs font-semibold text-purple-400 hover:text-purple-300 underline cursor-pointer"
                                        >
                                            Limpar busca
                                        </button>
                                    </div>
                                ) : (
                                    filteredCategories.map((category, catIdx) => (
                                        <CategoryAccordion
                                            key={category.id || category.name || `category-${catIdx}`}
                                            category={category}
                                            onToggleTask={onToggleTask}
                                            onUpdateTask={handleUpdateTask}
                                            onDeleteTask={onDeleteTask}
                                            onAddTask={handleAddTask}
                                            onTogglePriority={onTogglePriority}
                                            onDeleteCategory={onDeleteCategory}
                                            onPlayContext={handlePlayContext}
                                            showSimuladoStats={showSimuladoStats}
                                            filter={filter}
                                            forceExpandState={forceExpandState}
                                            onOpenTaskModal={handleOpenTaskModal}
                                            onOpenDeleteCategoryModal={handleOpenDeleteCategoryModal}
                                            onOpenDeleteTaskModal={handleOpenDeleteTaskModal}
                                        />
                                    ))
                                )}
                            </div>

                            {onAddCategory && (
                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    {/* Botão em Evidência: Nova Disciplina */}
                                    <button
                                        type="button"
                                        onClick={() => setIsCatModalOpen(true)}
                                        className="relative group/btn overflow-hidden px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-purple-900/40 hover:shadow-purple-600/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer border border-purple-400/30"
                                    >
                                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                                        <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-white transition-transform duration-300 group-hover/btn:rotate-90">
                                            <Plus size={15} className="stroke-[2.5]" />
                                        </div>
                                        <span>Nova disciplina</span>
                                    </button>

                                    {/* Botão Reduzido: Importar Disciplina */}
                                    <button
                                        type="button"
                                        onClick={() => setIsImportModalOpen(true)}
                                        className="px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm group/import"
                                        title="Copiar disciplinas de outro concurso cadastrado"
                                    >
                                        <Download size={14} className="text-slate-400 group-hover/import:text-cyan-400 transition-colors" />
                                        <span>Importar disciplina</span>
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
                                showToast(`Disciplina "${trimmedName}" adicionada com sucesso! ✨`, 'success');
                                setIsCatModalOpen(false);
                                scrollToBottom();
                            }}
                            title="Nova Disciplina"
                            placeholder="Ex: Direito Administrativo..."
                        />

                        {isImportModalOpen && typeof document !== 'undefined' && createPortal(
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
                                                <h3 id="import-modal-title" className="text-lg font-bold">
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
                                                <label className="block text-[13px] text-slate-400 font-medium mb-2">
                                                    Selecione o concurso de origem
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
                                                        const rawDisplay = getContestDisplayName(contest);
                                                        const optionLabel = (rawDisplay && rawDisplay !== 'Sem nome')
                                                            ? rawDisplay
                                                            : (contest?.user?.name?.trim() || 'Concurso sem nome');

                                                        return (
                                                            <option key={id} value={id}>
                                                                {optionLabel}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>

                                            {importSourceContest && sourceCategories.length > 0 && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-[13px] text-slate-400 font-medium">
                                                            Disciplinas disponíveis
                                                        </label>

                                                        {sourceCategories.some(cat => !safeCategories.some(c => normalize(c?.name || '') === normalize(cat?.name || ''))) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const toImport = sourceCategories.filter(cat =>
                                                                        !safeCategories.some(c => normalize(c?.name || '') === normalize(cat?.name || ''))
                                                                    );
                                                                    toImport.forEach(cat => {
                                                                        if (typeof onImportCategory === 'function') {
                                                                            onImportCategory(importSourceContest, cat.id || cat.name);
                                                                        }
                                                                    });
                                                                    if (toImport.length > 0) {
                                                                        showToast(`${toImport.length} ${toImport.length === 1 ? 'disciplina importada' : 'disciplinas importadas'} com sucesso! ✨`, 'success');
                                                                        setIsImportModalOpen(false);
                                                                        scrollToBottom();
                                                                    }
                                                                }}
                                                                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                                                            >
                                                                Importar todas
                                                            </button>
                                                        )}
                                                    </div>

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
                                                                    key={cat.id || cat.name}
                                                                    type="button"
                                                                    disabled={exists}
                                                                    onClick={() => {
                                                                        if (handleImportWithFeedback) {
                                                                            handleImportWithFeedback(importSourceContest, cat.id || cat.name);
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
                                                                            style={{ color: normalizeHexColor(cat.color, '#a855f7') }}
                                                                        >
                                                                            {cat.name}
                                                                        </div>

                                                                        <div className="text-xs text-slate-400 tabular-nums">
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
                                                    <p className="text-slate-500 text-sm font-medium">
                                                        Nenhuma disciplina encontrada
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>,
                            document.body
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
                                    if (typeof onDeleteCategory === 'function') {
                                        onDeleteCategory(deleteCatModal.id);
                                    }
                                    showToast(`Disciplina "${deleteCatModal.name || ''}" movida para a lixeira.`, 'info');
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
                                    const tId = deleteTaskModal.task?.id || deleteTaskModal.task?.text || deleteTaskModal.task?.title;
                                    const tName = deleteTaskModal.task?.title || deleteTaskModal.task?.text || 'Assunto';
                                    if (typeof onDeleteTask === 'function') {
                                        onDeleteTask(deleteTaskModal.catId, tId);
                                    }
                                    showToast(`Assunto "${tName}" excluído.`, 'info');
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

