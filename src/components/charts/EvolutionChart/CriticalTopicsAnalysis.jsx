import React, { useState, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell, ReferenceLine
} from "recharts";
import { getDateKey } from "../../../utils/dateHelper";
import { parseNoonLocal, addDaysNoon } from "../../../utils/parseNoonLocal";
import { getSafeScore, getSyntheticTotal, extractTopicsTotals, resolveEffectiveCorrect } from "../../../utils/scoreHelper";
import { toArray, getHistoryDate } from "../../../utils/evolutionGuards";
import { filterHistoryByTimeWindow } from "../../../hooks/useSubjectAggData";
import { ShieldAlert, Flame, Crosshair, CheckCircle2, Clock, FileText, ArrowRight } from "lucide-react";
import { BenchmarkStrip } from "../../ui/BenchmarkStrip";

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

const WEEKS = [
    { label: "Semana 4", offset: 4 },
    { label: "Semana 3", offset: 3 },
    { label: "Semana 2", offset: 2 },
    { label: "Semana 1", offset: 1 },
    { label: "Semana atual", offset: 0 },
];

const hasValidNumber = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

const SAFE_CRIT_THRESHOLD = 1.5;

export const CriticalTopicsAnalysis = React.memo(({
    categories = [],
    maxScore = 100,
    minScore = 0,
    targetScore = null,
    showOnlyFocus = false,
    focusSubjectId = null,
    timeWindow = 'all',
    onGoToSimulados = null
}) => {
    const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

    const targetPct = useMemo(() => {
        const gMin = hasValidNumber(minScore) ? Number(minScore) : 0;
        const gMax = hasValidNumber(maxScore) && Number(maxScore) > gMin ? Number(maxScore) : Math.max(100, gMin + 100);
        const effTarget = hasValidNumber(targetScore) ? Number(targetScore) : gMin + (gMax - gMin) * 0.8;
        return Math.round(Math.max(0, Math.min(100, ((effTarget - gMin) / Math.max(1e-9, gMax - gMin)) * 100)));
    }, [targetScore, minScore, maxScore]);

    const isSameId = useCallback(
        (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b),
        []
    );
    const hasFocusId = focusSubjectId !== null && focusSubjectId !== undefined && String(focusSubjectId).trim() !== '';

    const effectiveCategories = useMemo(() => {
        const list = (Array.isArray(categories) ? categories : Object.values(categories || {})).filter(Boolean);
        if (showOnlyFocus && hasFocusId) {
            return list.filter(c => c && isSameId(c.id, focusSubjectId));
        }
        return list;
    }, [categories, showOnlyFocus, hasFocusId, focusSubjectId, isSameId]);

    // Calc time window anchored in APP_TIMEZONE (avoids local TZ off-by-one boundary shifts)
    const { startDateKey, endDateKey, dateLabel } = useMemo(() => {
        const todayKey = getDateKey(new Date());
        const todayNoon = (todayKey ? parseNoonLocal(todayKey) : null) || new Date();
        const endNoon = addDaysNoon(todayNoon, -(selectedWeekOffset * 7)) || todayNoon;
        const startNoon = addDaysNoon(endNoon, -6) || endNoon;
        const startKey = getDateKey(startNoon) || todayKey || '';
        const endKey = getDateKey(endNoon) || todayKey || '';
        const fmtKey = (k) => {
            const p = String(k).split('-');
            return p.length === 3 ? `${p[2]}/${p[1]}` : k;
        };
        return {
            startDate: startNoon,
            endDate: endNoon,
            startDateKey: startKey,
            endDateKey: endKey,
            dateLabel: `${fmtKey(startKey)} — ${fmtKey(endKey)}`
        };
    }, [selectedWeekOffset]);

    const subtopicsData = useMemo(() => {
        if (!effectiveCategories || !effectiveCategories.length) return [];
        const topicMap = {};
        const multiCat = effectiveCategories.length > 1;

        effectiveCategories.forEach(cat => {
            if (!cat) return;
            const windowHistory = filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow);
            if (!windowHistory.length) return;
            const tasksList = toArray(cat.tasks);

            const recentHistory = windowHistory.filter(h => {
                if (!h || h.valid === false || h.validated === false || h.source === 'manual-error-notebook') return false;
                const k = getDateKey(getHistoryDate(h));
                return k && k >= startDateKey && k <= endDateKey;
            });

            const globalMin = hasValidNumber(minScore) ? Number(minScore) : 0;
            const globalMax = hasValidNumber(maxScore) && Number(maxScore) > globalMin ? Number(maxScore) : Math.max(100, globalMin + 100);
            const catMax = hasValidNumber(cat.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : globalMax;
            const catMin = hasValidNumber(cat.minScore) ? Math.min(Number(cat.minScore), catMax) : globalMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            if (!Number.isFinite(catRange) || catRange <= 0) return;
            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];
                let topicList = toArray(h.topics).filter(t => t && typeof t === 'object' && t.valid !== false && t.validated !== false);
                const parentPenalty = Number(h.penaltyPerWrong) || 0;
                if (topicList.length === 0) {
                    const matchedTask = h.taskId != null && String(h.taskId) !== '' ? tasksList.find(tk => tk && isSameId(tk.id, h.taskId)) : null;
                    const fallbackTopicName = matchedTask?.title || matchedTask?.text || matchedTask?.name || h.topic || h.assunto || h.subtopic || h.topicName;
                    if (fallbackTopicName) {
                        topicList = [{
                            name: fallbackTopicName,
                            total: h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions,
                            correct: h.correct ?? h.acertos ?? h.correctCount,
                            score: h.score,
                            scorePoints: h.scorePoints,
                            scorePct: h.scorePct ?? h.percentage,
                            penaltyPerWrong: h.penaltyPerWrong,
                            blanks: h.blanks,
                            netPoints: h.netPoints,
                            isPercentage: h.isPercentage,
                            syntheticVolume: h.syntheticVolume,
                            isSynthetic: h.isSynthetic,
                            type: h.type
                        }];
                    }
                } else {
                    const shouldCopyBlanks = topicList.length === 1 && h.blanks != null;
                    if (parentPenalty > 0 || shouldCopyBlanks) {
                        topicList = topicList.map(t => ({
                            ...t,
                            ...(parentPenalty > 0 && t.penaltyPerWrong == null ? { penaltyPerWrong: parentPenalty } : {}),
                            ...(shouldCopyBlanks && t.blanks == null ? { blanks: h.blanks } : {}),
                        }));
                    }
                }

                topicList.forEach(t => {
                    const rawTopicTitle = t.name || t.topic || t.assunto || t.title || t.subtopic || t.topicName || '';
                    const n = String(rawTopicTitle).replace(/^\[(.*?)\]\s*/i, '').replace(/<[^>]*>?/gm, '').trim();
                    if (!n || n.toLowerCase() === 'nenhum') return;
                    const key = `${cat.id ?? cat.name ?? ''}::${n.toLowerCase()}`;
                    if (!topicMap[key]) {
                        topicMap[key] = {
                            name: n,
                            catName: cat.name || '',
                            rawKey: n.toLowerCase(),
                            total: 0,
                            correct: 0,
                            criticidade: 0
                        };
                    }

                    const isSynthFlag = Boolean(t.syntheticVolume || t.isSynthetic || t.type === 'percent-only');
                    let total = isSynthFlag ? 0 : (parseInt(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 10) || 0);
                    const hasTopicScore = hasValidNumber(t.score) || hasValidNumber(t.scorePoints) || hasValidNumber(t.scorePct) || hasValidNumber(t.percentage);
                    const isSynthTopic = total === 0 && (hasTopicScore || isSynthFlag);
                    if (isSynthTopic) {
                        total = getSyntheticTotal(catMax);
                    } else if (total === 0) {
                        return;
                    }

                    if (total <= 0) return;
                    const hasExplicitCorrect = !t.isPercentage && (
                        (t.correct !== null && t.correct !== undefined && String(t.correct).trim() !== '') ||
                        (t.acertos !== null && t.acertos !== undefined && String(t.acertos).trim() !== '') ||
                        (t.correctCount !== null && t.correctCount !== undefined && String(t.correctCount).trim() !== '')
                    );
                    const parsedCorrect = Number(t.correct ?? t.acertos ?? t.correctCount);
                    const topicForScore = (t.score == null && t.scorePct == null && t.percentage != null)
                        ? { ...t, scorePct: t.percentage }
                        : t;
                    const score = getSafeScore(topicForScore, catMax, catMin);
                    let correctCount;
                    if (isSynthTopic) {
                        if (!Number.isFinite(score)) return;
                        correctCount = ((Math.max(catMin, Math.min(catMax, score)) - catMin) / catRange) * total;
                    } else {
                        if (!hasExplicitCorrect && !Number.isFinite(score)) return;
                        correctCount = resolveEffectiveCorrect(t, score, total, hasExplicitCorrect && Number.isFinite(parsedCorrect), parsedCorrect, catMax, catMin);
                    }

                    if (!Number.isFinite(correctCount)) return;
                    const safeCorrect = Math.max(0, Math.min(total, correctCount));

                    topicMap[key].total += total;
                    topicMap[key].correct += safeCorrect;
                });
            }
        });

        // Check if generic topic names collide across different categories so we disambiguate them
        const nameFrequency = {};
        Object.values(topicMap).forEach(item => {
            nameFrequency[item.rawKey] = (nameFrequency[item.rawKey] || 0) + 1;
        });

        // Calcular criticidade final consolidada por tópico (escopado por matéria)
        Object.keys(topicMap).forEach(key => {
            const item = topicMap[key];
            if (multiCat && nameFrequency[item.rawKey] > 1 && item.catName) {
                item.name = `${item.name} (${item.catName})`;
            }
            const accuracy = item.total > 0 ? item.correct / item.total : 0;
            const erroAbsoluto = item.total - item.correct;
            // Índice de criticidade
            item.criticidade = erroAbsoluto * (1 - accuracy);
            item.accuracyPct = Math.round(accuracy * 100);
        });

        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        const result = Object.values(topicMap)
            .filter(d => Math.round(d.criticidade * 10) > 0)
            .sort((a, b) => b.criticidade - a.criticidade);

        return result.slice(0, 15).map((item, i, arr) => {
            const isLong = item.name.length > 34;
            return {
                ...item,
                name: isLong ? item.name.substring(0, 32) + '...' : item.name,
                fullName: item.name,
                value: Math.round(item.criticidade * 10) / 10,
                fill: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))]
            };
        });
    }, [effectiveCategories, startDateKey, endDateKey, timeWindow, maxScore, minScore, isSameId]);

    const pointLeakageData = useMemo(() => {
        if (!effectiveCategories || !effectiveCategories.length) return [];
        let totalCriticidade = 0;
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];

        const rawData = effectiveCategories.map(cat => {
            let total = 0;
            let correct = 0;
            const windowHistory = filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow);

            const recentHistory = windowHistory.filter(h => {
                if (!h || h.valid === false || h.validated === false || h.source === 'manual-error-notebook') return false;
                const k = getDateKey(getHistoryDate(h));
                return k && k >= startDateKey && k <= endDateKey;
            });
            const globalMin = hasValidNumber(minScore) ? Number(minScore) : 0;
            const globalMax = hasValidNumber(maxScore) && Number(maxScore) > globalMin ? Number(maxScore) : Math.max(100, globalMin + 100);
            const catMax = hasValidNumber(cat.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : globalMax;
            const catMin = hasValidNumber(cat.minScore) ? Math.min(Number(cat.minScore), catMax) : globalMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            for (const h of recentHistory) {
                const isSynthEntry = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
                let t = isSynthEntry ? 0 : (parseInt(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 10) || 0);
                // Prioriza questões reais de h.topics ANTES do fallback sintético de h.score
                if (t === 0 && !isSynthEntry && h.topics != null) {
                    const tf = extractTopicsTotals(h, catMax, catMin);
                    if (tf.total > 0) {
                        total += tf.total;
                        correct += Math.max(0, Math.min(tf.total, tf.correct));
                        continue;
                    }
                    if (tf.hasTopicsScore && Number.isFinite(tf.score)) {
                        const syn = getSyntheticTotal(catMax);
                        const synCorrect = ((Math.max(catMin, Math.min(catMax, tf.score)) - catMin) / catRange) * syn;
                        total += syn;
                        correct += Math.max(0, Math.min(syn, synCorrect));
                        continue;
                    }
                }
                const hasHeaderScore = hasValidNumber(h.score) || hasValidNumber(h.scorePoints) || hasValidNumber(h.scorePct);
                const isSynthHeader = t === 0 && (hasHeaderScore || isSynthEntry);
                if (isSynthHeader) {
                    t = getSyntheticTotal(catMax);
                } else if (t === 0) {
                    continue;
                }

                const hasExplicitCorrect = !h.isPercentage && (
                    (h.correct !== null && h.correct !== undefined && String(h.correct).trim() !== '') ||
                    (h.acertos !== null && h.acertos !== undefined && String(h.acertos).trim() !== '') ||
                    (h.correctCount !== null && h.correctCount !== undefined && String(h.correctCount).trim() !== '')
                );
                const parsedHCorrect = Number(h.correct ?? h.acertos ?? h.correctCount);
                const score = getSafeScore(h, catMax, catMin);
                let correctCount;
                if (isSynthHeader) {
                    if (!Number.isFinite(score)) continue;
                    correctCount = ((Math.max(catMin, Math.min(catMax, score)) - catMin) / catRange) * t;
                } else {
                    if (!hasExplicitCorrect && !Number.isFinite(score)) continue;
                    correctCount = resolveEffectiveCorrect(h, score, t, hasExplicitCorrect && Number.isFinite(parsedHCorrect), parsedHCorrect, catMax, catMin);
                }

                if (!Number.isFinite(correctCount)) continue;
                const safeCorrect = Math.max(0, Math.min(t, correctCount));
                total += t;
                correct += safeCorrect;
            }

            const accuracy = total > 0 ? correct / total : 0;
            const erroAbsoluto = total - correct;
            const criticidade = erroAbsoluto * (1 - accuracy);

            return {
                name: cat.name,
                value: criticidade,
                errors: Math.round(erroAbsoluto * 10) / 10,
                accuracyPct: total > 0 ? Math.round(accuracy * 100) : 0,
            };
        });

        const data = rawData.filter(d => Math.round(d.value * 10) > 0).sort((a, b) => b.value - a.value);
        data.forEach(d => { totalCriticidade += d.value; });

        return data.slice(0, 10).map((item, i, arr) => {
            const isLong = item.name.length > 24;
            return {
                ...item,
                fullName: item.name,
                name: isLong ? item.name.substring(0, 22) + '...' : item.name,
                color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))],
                percentage: totalCriticidade > 0 ? Math.round((item.value / totalCriticidade) * 100) : 0,
                displayValue: Math.round(item.value * 10) / 10
            };
        });
    }, [effectiveCategories, startDateKey, endDateKey, timeWindow, maxScore, minScore]);

    const hasData = useMemo(() => {
        if (!effectiveCategories) return false;

        return effectiveCategories.some(cat => {
            const windowHistory = filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow);

            return windowHistory.some(h => {
                if (!h || h.valid === false || h.validated === false || h.source === 'manual-error-notebook') return false;
                const k = getDateKey(getHistoryDate(h));
                const topics = toArray(h.topics).filter(t => t && typeof t === 'object' && t.valid !== false && t.validated !== false);

                const hasTopicData = topics.some(
                    t => Number(t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions) > 0 || hasValidNumber(t?.score) || hasValidNumber(t?.scorePoints) || hasValidNumber(t?.scorePct) || hasValidNumber(t?.percentage)
                );

                return (
                    k &&
                    k >= startDateKey &&
                    k <= endDateKey &&
                    (
                        parseInt(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions, 10) > 0 ||
                        hasValidNumber(h?.score) ||
                        hasValidNumber(h?.scorePoints) ||
                        hasValidNumber(h?.scorePct) ||
                        hasTopicData
                    )
                );
            });
        });
    }, [effectiveCategories, startDateKey, endDateKey, timeWindow]);

    const renderLeakageLabel = useCallback((props) => {
        const { x, y, width, value, index } = props;
        const entry = pointLeakageData[index];
        if (!entry || value === null || value === undefined) return null;
        return (
            <text x={x + width + 8} y={y + 11} fill="#ffffff" fontSize={10.5} fontWeight="bold">
                {value}{entry.percentage > 0 ? ` (${entry.percentage}%)` : ''}
            </text>
        );
    }, [pointLeakageData]);

    const weekTitle = WEEKS.find(w => w.offset === selectedWeekOffset)?.label || "SEMANA";
    const worstCrit = Math.max(
        Number(pointLeakageData[0]?.displayValue) || 0,
        Number(subtopicsData[0]?.value) || 0
    );
    const aboveSafeSubjects = pointLeakageData.filter((d) => d.displayValue > SAFE_CRIT_THRESHOLD).length;
    const aboveSafeTopics = subtopicsData.filter((d) => d.value > SAFE_CRIT_THRESHOLD).length;

    return (
        <div className="w-full space-y-4 pt-1">
            {/* Header com Navegação Temporal Unificada */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-slate-900/65 border border-white/[0.08] backdrop-blur-xl shadow-[0_12px_36px_-18px_rgba(0,0,0,0.65)]">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/12 text-rose-400 border border-rose-500/25 shrink-0">
                        <ShieldAlert size={19} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-white tracking-tight">Matriz de criticidade e pontos de fuga</h3>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/12 text-[11px] font-bold text-rose-300 border border-rose-500/25">
                                Índice de Criticidade
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Identifique matérias e assuntos específicos que mais geram perdas de pontos
                        </p>
                    </div>
                </div>

                {/* Unified Week Selector + Date Range Badge */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    <div className="inline-flex items-center gap-1 overflow-x-auto no-scrollbar p-1 bg-slate-950/80 rounded-xl border border-white/[0.08] shadow-inner">
                        {WEEKS.map((w) => {
                            const isActive = selectedWeekOffset === w.offset;
                            return (
                                <button
                                    key={w.label}
                                    type="button"
                                    onClick={() => setSelectedWeekOffset(w.offset)}
                                    aria-pressed={isActive}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all whitespace-nowrap ${isActive
                                        ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40 shadow-sm'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                        }`}
                                >
                                    {w.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums font-bold text-indigo-200 bg-indigo-500/12 border border-indigo-400/30 px-3 py-1.5 rounded-xl">
                        {dateLabel}
                    </div>
                </div>
            </div>

            {hasData && (
                <BenchmarkStrip
                    currentLabel="Maior índice de criticidade"
                    currentValue={pointLeakageData.length > 0 || subtopicsData.length > 0 ? `${worstCrit} pts` : '0 pts'}
                    targetLabel="Zona segura"
                    targetValue={`≤ ${SAFE_CRIT_THRESHOLD} pts`}
                    gapLabel={worstCrit <= SAFE_CRIT_THRESHOLD
                        ? 'Sob controle ✓'
                        : `${aboveSafeSubjects} ${aboveSafeSubjects === 1 ? 'matéria' : 'matérias'} · ${aboveSafeTopics} ${aboveSafeTopics === 1 ? 'assunto' : 'assuntos'} acima`}
                    status={worstCrit <= SAFE_CRIT_THRESHOLD ? 'success' : worstCrit <= 4 ? 'warning' : 'danger'}
                    extra={`Meta de acerto: ${targetPct}%`}
                    action={typeof onGoToSimulados === 'function' && worstCrit > SAFE_CRIT_THRESHOLD ? (
                        <button
                            type="button"
                            onClick={onGoToSimulados}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-200 text-[11px] font-bold transition-colors"
                        >
                            <span>Treinar pontos fracos</span>
                            <ArrowRight size={11} />
                        </button>
                    ) : null}
                    compact
                />
            )}

            {/* Painéis Lado a Lado perfeitamente enquadrados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* Matérias críticas */}
                <div className="rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.65)] hover:border-white/[0.14] transition-all flex flex-col justify-between h-full min-w-0">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{weekTitle}</p>
                            <span className="text-[11px] font-bold text-rose-300 bg-rose-500/12 border border-rose-500/25 px-2.5 py-0.5 rounded-full tabular-nums">
                                {pointLeakageData.length} {pointLeakageData.length === 1 ? 'matéria' : 'matérias'}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-slate-100 mb-1 flex items-center gap-2 tracking-tight">
                            <Flame size={16} className="text-rose-400 shrink-0" />
                            Matérias Críticas
                        </h4>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                            Disciplinas com maior Índice de Criticidade (Erros acumulados × taxa de erro).
                        </p>
                    </div>

                    <div className="min-h-[220px] sm:min-h-[260px] w-full flex-1 flex flex-col justify-center">
                        {pointLeakageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, pointLeakageData.length * 38)} minWidth={1}>
                                <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 5, right: 85, left: 0, bottom: 5 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, (dataMax) => Math.max(2, Math.ceil(Math.max(Number(dataMax) || 0, SAFE_CRIT_THRESHOLD) * 1.15))]}
                                        stroke="#94a3b8"
                                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <YAxis type="category" dataKey="fullName" tickFormatter={(v) => String(v || '').length > 22 ? `${String(v).slice(0, 20)}…` : v} stroke="#cbd5e1" tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} width={135} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }} formatter={(v, n, props) => [`${v} pts (alvo ≤ ${SAFE_CRIT_THRESHOLD}) · Acerto ${props?.payload?.accuracyPct ?? 0}% vs Meta ${targetPct}%`, `${props?.payload?.fullName || 'Matéria'} (${props?.payload?.errors || 0} erros)`]} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <ReferenceLine x={SAFE_CRIT_THRESHOLD} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Alvo ≤ ${SAFE_CRIT_THRESHOLD}`, position: 'insideTopRight', fill: '#34d399', fontSize: 10, fontWeight: 700 }} />
                                    <Bar dataKey="displayValue" radius={[0, 8, 8, 0]} barSize={18} minPointSize={4}>
                                        {pointLeakageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        <LabelList dataKey="displayValue" position="right" offset={8} content={renderLeakageLabel} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-slate-950/45 rounded-xl border border-white/[0.06] p-6 text-slate-400 text-sm text-center gap-2">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${hasData ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-400' : 'bg-slate-800/60 border-white/10 text-slate-400'}`}>
                                    {hasData ? <CheckCircle2 size={22} /> : <Clock size={22} />}
                                </div>
                                <p className="font-bold text-slate-200">{hasData ? 'Sem erros críticos!' : 'Nenhum dado registrado'}</p>
                                <p className="text-xs text-slate-400 max-w-xs">{hasData ? 'Nenhum erro crítico registrado nesta semana.' : 'Sem simulados registrados neste período. Selecione outra semana acima.'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assuntos críticos */}
                <div className="rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.65)] hover:border-white/[0.14] transition-all flex flex-col justify-between h-full min-w-0">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                {weekTitle} · {showOnlyFocus && effectiveCategories.length === 1 ? effectiveCategories[0].name : 'TODOS OS ASSUNTOS'}
                            </p>
                            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/12 border border-amber-500/25 px-2.5 py-0.5 rounded-full tabular-nums">
                                {subtopicsData.length} {subtopicsData.length === 1 ? 'tópico' : 'tópicos'}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-slate-100 mb-1 flex items-center gap-2 tracking-tight">
                            <Crosshair size={16} className="text-amber-400 shrink-0" />
                            Assuntos Críticos
                        </h4>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                            Tópicos com maior urgência de revisão e reforço teórico.
                        </p>
                    </div>

                    <div className="min-h-[220px] sm:min-h-[260px] w-full flex-1 flex flex-col justify-center">
                        {subtopicsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, subtopicsData.length * 38)} minWidth={1}>
                                <BarChart data={subtopicsData} layout="vertical" margin={{ top: 5, right: 65, left: 0, bottom: 5 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, (dataMax) => Math.max(2, Math.ceil(Math.max(Number(dataMax) || 0, SAFE_CRIT_THRESHOLD) * 1.15))]}
                                        stroke="#94a3b8"
                                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <YAxis type="category" dataKey="fullName" tickFormatter={(v) => String(v || '').length > 28 ? `${String(v).slice(0, 26)}…` : v} stroke="#cbd5e1" tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} width={135} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }} formatter={(v, n, props) => {
                                        const total = Number(props?.payload?.total) || 0;
                                        const correct = Number(props?.payload?.correct) || 0;
                                        const errors = Math.round(Math.max(0, total - correct) * 10) / 10;
                                        const acc = props?.payload?.accuracyPct ?? 0;
                                        return [`${v} (alvo ≤ ${SAFE_CRIT_THRESHOLD}) · Acerto ${acc}% vs Meta ${targetPct}%`, `${props?.payload?.fullName || 'Assunto'} (${errors} erros)`];
                                    }} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <ReferenceLine x={SAFE_CRIT_THRESHOLD} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Alvo ≤ ${SAFE_CRIT_THRESHOLD}`, position: 'insideTopRight', fill: '#34d399', fontSize: 10, fontWeight: 700 }} />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18} minPointSize={4}>
                                        {subtopicsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#ffffff', fontSize: 11, fontWeight: 'bold' }} offset={8} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-slate-950/45 rounded-xl border border-white/[0.06] p-6 text-slate-400 text-sm text-center gap-2">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${hasData && pointLeakageData.length === 0 ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-400' : 'bg-slate-800/60 border-white/10 text-slate-400'}`}>
                                    {hasData ? (pointLeakageData.length > 0 ? <FileText size={22} /> : <CheckCircle2 size={22} />) : <Clock size={22} />}
                                </div>
                                <p className="font-bold text-slate-200">
                                    {hasData
                                        ? (pointLeakageData.length > 0 ? 'Sem detalhamento por assunto' : 'Sem assuntos críticos!')
                                        : 'Nenhum dado registrado'}
                                </p>
                                <p className="text-xs text-slate-400 max-w-xs">
                                    {hasData
                                        ? (pointLeakageData.length > 0
                                            ? 'Os simulados desta semana foram registrados apenas por matéria, sem divisão em tópicos.'
                                            : 'Nenhum erro registrado neste período.')
                                        : 'Sem simulados registrados neste período. Selecione outra semana acima.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
