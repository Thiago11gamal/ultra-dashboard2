import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { evaluateContestMaturity } from "../engine/adaptive/adaptiveMaturityEngine";
import { useChartData } from "../hooks/useChartData";
import { useEvolutionMC } from "../hooks/useEvolutionMC";
import { useCategoryLevels } from "../hooks/useCategoryLevels";
import { useSubjectAggData } from "../hooks/useSubjectAggData";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";
import { getDateKey, toDateMs, normalizeDate } from "../utils/dateHelper";
import { parseNoonLocal, addDaysNoon } from "../utils/parseNoonLocal";
import { normalize, isSubjectMatch } from "../utils/normalization";
import { getSafeScore, extractTopicsTotals, getSyntheticTotal, computeEffectiveScoreRatio, resolveEffectiveCorrect, formatValue } from "../utils/scoreHelper";
import { normalizeProbability } from "../utils/evolutionGuards";
import { exportComponentAsPDF } from "../utils/pdfExport";
import { pointsToRatio, ratioToPoints } from "../utils/scoreHelper.conversions";
import {
    Download, Loader2, Zap, Target, BarChart3, TrendingUp, ChevronLeft, ChevronRight, ArrowRight,
    BookOpen, LayoutGrid, List, Layers, ChevronDown, ChevronUp, CheckCircle2, Crosshair,
    Maximize2, Minimize2, Compass, BarChart2, Grid3X3, Brain, Activity, Sparkles,
    Microscope, Rocket, CalendarRange, Scale, Timer, Gauge, Clock, BoxSelect,
    LineChart, Waves, SlidersHorizontal, Network, Sigma, Flame, Calendar
} from "lucide-react";
import { GaussianPlot } from "./charts/GaussianPlot";
import { useAppStore } from "../store/useAppStore";
import { downsampleLTTB } from "../utils/downsample";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useShallow } from 'zustand/react/shallow';

// Sub-components
import { KpiCard } from "./charts/EvolutionChart/KpiCard";
import { DisciplinaCard } from "./charts/EvolutionChart/DisciplinaCard";
import { EvolutionLineChart } from "./charts/EvolutionChart/EvolutionLineChart";
import { CompareChart } from "./charts/EvolutionChart/CompareChart";
import { RadarAnalysis } from "./charts/EvolutionChart/RadarAnalysis";
import { PerformanceBarChart } from "./charts/EvolutionChart/PerformanceBarChart";
import { CriticalTopicsAnalysis } from "./charts/EvolutionChart/CriticalTopicsAnalysis";
import { SubtopicsPerformanceChart } from "./charts/EvolutionChart/SubtopicsPerformanceChart";
import { MonteCarloEvolutionChart } from "./charts/EvolutionChart/MonteCarloEvolutionChart";
import { WeeklyEvolutionView } from "./charts/EvolutionChart/WeeklyEvolutionView";
import { TimeSpentChart } from "./charts/EvolutionChart/TimeSpentChart";
import { TodayVsGeneralChart } from "./charts/EvolutionChart/TodayVsGeneralChart";
import { AdaptiveMaturityBadge } from "./ui/AdaptiveMaturityBadge";

// Code-splitting: abas analíticas secundárias carregam sob demanda (reduz bundle inicial de Evolution)
const SpeedAccuracyChart = React.lazy(() => import("./charts/EvolutionChart/SpeedAccuracyChart").then((m) => ({ default: m.SpeedAccuracyChart })));
const ConsistencyBoxPlotChart = React.lazy(() => import("./charts/EvolutionChart/ConsistencyBoxPlotChart").then((m) => ({ default: m.ConsistencyBoxPlotChart })));
const ExamPacingChart = React.lazy(() => import("./charts/EvolutionChart/ExamPacingChart").then((m) => ({ default: m.ExamPacingChart })));
const ProjectionFanChart = React.lazy(() => import("./charts/EvolutionChart/ProjectionFanChart").then((m) => ({ default: m.ProjectionFanChart })));
const KalmanLatentChart = React.lazy(() => import("./charts/EvolutionChart/KalmanLatentChart").then((m) => ({ default: m.KalmanLatentChart })));
const TornadoWhatIfChart = React.lazy(() => import("./charts/EvolutionChart/TornadoWhatIfChart").then((m) => ({ default: m.TornadoWhatIfChart })));
const CorrelationRegimeChart = React.lazy(() => import("./charts/EvolutionChart/CorrelationRegimeChart").then((m) => ({ default: m.CorrelationRegimeChart })));
const IRTPsychometricChart = React.lazy(() => import("./charts/EvolutionChart/IRTPsychometricChart").then((m) => ({ default: m.IRTPsychometricChart })));
const MetacognitionFatigueChart = React.lazy(() => import("./charts/EvolutionChart/MetacognitionFatigueChart").then((m) => ({ default: m.MetacognitionFatigueChart })));

const LazyTabFallback = (
    <div className="min-h-[260px] flex items-center justify-center gap-2.5 text-xs font-bold text-slate-400">
        <Loader2 size={16} className="animate-spin text-indigo-400" />
        <span>Carregando módulo analítico...</span>
    </div>
);

import { generateEvolutionInsights } from '../engine/insightGenerator';
import { StatusPill } from './ui/StatusPill';
import { ChartGuide } from './ui/ChartGuide';
import { computeEvolutionStatuses } from '../utils/evolutionStatus';
import {
    DEFAULT_EVOLUTION_UI_PREFS,
    readEvolutionUiPrefs,
    writeEvolutionUiPrefs,
} from '../utils/evolutionUiPrefs';

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});
const DEFAULT_CATEGORY_PALETTE = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f43f5e", "#84cc16", "#a855f7",
    "#06b6d4", "#eab308", "#6366f1", "#d946ef", "#22c55e"
];

function hydrateCategoriesWithSimuladoRows(baseCategories, simuladoRows, globalMin = 0, globalMax = 100, defaultPenaltyPerWrong = 0) {
    const safeBase = Array.isArray(baseCategories) ? baseCategories : [];
    const validRows = (Array.isArray(simuladoRows) ? simuladoRows : []).filter(
        r => r && r.valid !== false && r.validated !== false && r.source !== 'manual-error-notebook'
    );
    if (!validRows.length) return safeBase;
    const safeDefaultPenalty = Math.max(0, Number(defaultPenaltyPerWrong) || 0);

    const rowMatchesCategory = (row, cat) => {
        const hasRowCatId = row.categoryId !== null && row.categoryId !== undefined && String(row.categoryId).trim() !== '';
        if (hasRowCatId) {
            return cat.id !== null && cat.id !== undefined && String(row.categoryId) === String(cat.id);
        }
        const rawSub = row.subject || row.categoryName || row.materia || row.disciplina || '';
        return Boolean(rawSub && cat.name && isSubjectMatch(rawSub, cat.name));
    };

    let workingCategories = safeBase;
    if (workingCategories.length === 0) {
        const seen = new Map();
        validRows.forEach((row, idx) => {
            const label = String(row.subject || row.categoryName || row.materia || row.disciplina || '').trim();
            const hasRowCatId = row.categoryId !== null && row.categoryId !== undefined && String(row.categoryId).trim() !== '';
            const key = normalize(label) || (hasRowCatId ? String(row.categoryId) : '');
            if (!key || seen.has(key)) return;
            seen.set(key, {
                id: hasRowCatId ? row.categoryId : `synth_cat_${seen.size + 1}`,
                name: label || 'Disciplina',
                color: DEFAULT_CATEGORY_PALETTE[idx % DEFAULT_CATEGORY_PALETTE.length],
                tasks: [],
                simuladoStats: { history: [] }
            });
        });
        workingCategories = Array.from(seen.values());
    }

    return workingCategories.map((cat) => {
        const myRows = validRows.filter(r => rowMatchesCategory(r, cat));
        if (!myRows.length) return cat;

        const existingHistoryRaw = cat.simuladoStats?.history;
        const existingHistory = (Array.isArray(existingHistoryRaw)
            ? existingHistoryRaw
            : Object.values(existingHistoryRaw || {})).filter(Boolean);

        const existingIds = new Set(existingHistory.map(h => h.id || h.simuladoRowId).filter(Boolean));
        const existingByDateKey = new Map();
        existingHistory.forEach((h) => {
            const dk = getDateKey(h.date || h.createdAt);
            if (!dk) return;
            if (!existingByDateKey.has(dk)) existingByDateKey.set(dk, []);
            existingByDateKey.get(dk).push(h);
        });

        const myRowsByDate = new Map();
        myRows.forEach((r) => {
            const dk = getDateKey(r.date || r.createdAt);
            if (!dk) return;
            if (!myRowsByDate.has(dk)) myRowsByDate.set(dk, []);
            myRowsByDate.get(dk).push(r);
        });

        const datesToRehydrate = new Set();
        myRowsByDate.forEach((dayRows, dk) => {
            const existingEntries = existingByDateKey.get(dk) || [];
            if (existingEntries.length === 0) {
                if (dayRows.some(r => !r.id || !existingIds.has(r.id))) {
                    datesToRehydrate.add(dk);
                }
                return;
            }
            // Soma o volume de TODAS as entradas existentes naquele dia (evita reidratação falsa em dias com múltiplos simulados)
            const existingTotal = existingEntries.reduce(
                (sum, entry) => sum + Math.max(0, Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions) || 0),
                0
            );
            const rowsTotal = dayRows.reduce(
                (sum, r) => sum + Math.max(0, Number(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions) || 0),
                0
            );
            if (rowsTotal > existingTotal && dayRows.some(r => !r.id || !existingIds.has(r.id))) {
                datesToRehydrate.add(dk);
            }
        });

        if (!datesToRehydrate.size) return cat;
        const missingRows = [];
        datesToRehydrate.forEach((dk) => {
            (myRowsByDate.get(dk) || []).forEach((r) => missingRows.push(r));
        });

        const catMax = hasValidNumber(cat.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : (Number(globalMax) || 100);
        const catMin = hasValidNumber(cat.minScore) ? Math.min(Number(cat.minScore), catMax) : (Number.isFinite(Number(globalMin)) ? Number(globalMin) : 0);
        const catRange = Math.max(1e-9, catMax - catMin);

        const byDay = new Map();
        missingRows.forEach((r) => {
            const dk = getDateKey(r.date || r.createdAt);
            if (!dk) return;
            if (!byDay.has(dk)) {
                byDay.set(dk, {
                    date: dk,
                    createdAt: r.createdAt || r.date,
                    correct: 0,
                    effCorrect: 0,
                    total: 0,
                    synthTotal: 0,
                    synthEffCorrect: 0,
                    blanks: 0,
                    penaltyPerWrong: 0,
                    penaltyValues: new Set(),
                    scoreSum: 0,
                    scoreCount: 0,
                    timeSpent: 0,
                    timedQuestoes: 0,
                    hasExplicitTotal: false,
                    rowIds: [],
                    topics: [],
                    difficulty: r.difficulty || null,
                    questionTelemetry: [],
                });
            }
            const bucket = byDay.get(dk);
            if (r.id) bucket.rowIds.push(String(r.id));
            let rowTot = Math.max(0, Number(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions) || 0);
            const rawCorr = r.correct ?? r.acertos ?? r.correctCount;
            const hasExplicitCorr = !r.isPercentage && rawCorr !== undefined && rawCorr !== null && String(rawCorr).trim() !== '' && Number.isFinite(Number(rawCorr));
            let rowCorr = hasExplicitCorr ? Math.max(0, Number(rawCorr)) : NaN;
            const rowPenalty = r.penaltyPerWrong !== null && r.penaltyPerWrong !== undefined && String(r.penaltyPerWrong).trim() !== ''
                ? Math.max(0, Number(r.penaltyPerWrong) || 0)
                : safeDefaultPenalty;
            const rEff = (r.penaltyPerWrong == null && rowPenalty > 0) ? { ...r, penaltyPerWrong: rowPenalty } : r;
            let rowScore = getSafeScore(rEff, catMax, catMin);
            const rowBlanks = Math.max(0, Number(r.blanks) || 0);

            if (rowTot <= 0 && r.topics != null) {
                const tf = extractTopicsTotals(rEff, catMax, catMin);
                if (tf.total > 0) {
                    rowTot = tf.total;
                    rowCorr = tf.correct;
                    if (!Number.isFinite(rowScore) || rowScore === catMin) rowScore = tf.score;
                } else if (!Number.isFinite(rowScore) && tf.hasTopicsScore) {
                    rowScore = tf.score;
                }
            }

            if (rowTot > 0) {
                bucket.hasExplicitTotal = true;
                const physicalCorr = Number.isFinite(rowCorr)
                    ? Math.max(0, Math.min(rowTot, rowCorr))
                    : (Number.isFinite(rowScore)
                        ? Math.round(Math.max(0, Math.min(1, (rowScore - catMin) / catRange)) * rowTot)
                        : 0);
                const effCorr = resolveEffectiveCorrect(rEff, rowScore, rowTot, hasExplicitCorr, physicalCorr, catMax, catMin);
                bucket.total += rowTot;
                bucket.correct += physicalCorr;
                bucket.effCorrect += effCorr;
                bucket.blanks += Math.min(Math.max(0, rowTot - physicalCorr), rowBlanks);
                bucket.penaltyPerWrong = Math.max(bucket.penaltyPerWrong, rowPenalty);
                bucket.penaltyValues.add(rowPenalty);
            } else if (Number.isFinite(rowScore)) {
                const synTot = getSyntheticTotal(catMax);
                const ratio = Math.max(0, Math.min(1, (rowScore - catMin) / catRange));
                bucket.synthTotal += synTot;
                bucket.synthEffCorrect += ratio * synTot;
                bucket.scoreSum += rowScore;
                bucket.scoreCount += 1;
            }

            const ts = Number(r.timeSpent ?? r.durationSeconds ?? 0);
            if (Number.isFinite(ts) && ts > 0) {
                const tq = Number(r.timedQuestoes) > 0 ? Number(r.timedQuestoes) : (rowTot > 0 ? rowTot : getSyntheticTotal(catMax));
                bucket.timeSpent += ts;
                bucket.timedQuestoes += tq;
            }

            if (r.difficulty && !bucket.difficulty) bucket.difficulty = r.difficulty;
            if (Array.isArray(r.questionTelemetry) && r.questionTelemetry.length > 0) {
                bucket.questionTelemetry.push(...r.questionTelemetry);
            }
            const rowTopics = Array.isArray(r.topics) ? r.topics : (r.topics && typeof r.topics === 'object' ? Object.values(r.topics) : []);
            if (rowTopics.length > 0) {
                bucket.topics.push(...rowTopics.filter(Boolean));
            } else if (r.topic || r.assunto) {
                bucket.topics.push({
                    name: r.topic || r.assunto,
                    total: rowTot,
                    correct: Number.isFinite(rowCorr) ? Math.max(0, Math.min(rowTot, rowCorr)) : undefined,
                    ...(rowBlanks > 0 ? { blanks: rowBlanks } : {}),
                    ...(rowPenalty > 0 ? { penaltyPerWrong: rowPenalty } : {}),
                    ...(Number.isFinite(rowScore) ? { score: rowScore } : {}),
                    ...(Number.isFinite(ts) && ts > 0 ? { timeSpent: ts, timedQuestoes: Number(r.timedQuestoes) > 0 ? Number(r.timedQuestoes) : rowTot } : {}),
                });
            }
        });

        const reconstructed = Array.from(byDay.values()).map((b) => {
            // Preserve metadata from existing entries on the same day if rows lacked topics/telemetry/difficulty
            const prevDayEntries = existingByDateKey.get(b.date) || [];
            const preservedTopics = b.topics.length > 0
                ? b.topics
                : prevDayEntries.flatMap((e) => Array.isArray(e.topics) ? e.topics : Object.values(e.topics || {})).filter(Boolean);
            const preservedTelemetry = b.questionTelemetry.length > 0
                ? b.questionTelemetry
                : prevDayEntries.flatMap((e) => Array.isArray(e.questionTelemetry) ? e.questionTelemetry : []).filter(Boolean);
            const preservedDifficulty = b.difficulty || prevDayEntries.find((e) => e.difficulty)?.difficulty || null;

            const isPureSynthetic = !b.hasExplicitTotal && b.scoreCount > 0;
            const hasUniformPenalty = b.hasExplicitTotal && b.scoreCount === 0 && b.penaltyValues.size === 1 && b.penaltyPerWrong > 0;
            const hasMixedPenaltyOrSynth = b.hasExplicitTotal && (b.penaltyValues.size > 1 || b.scoreCount > 0);
            const combinedWeight = b.total + b.synthTotal;

            let score;
            let netPoints;
            if (isPureSynthetic) {
                score = b.scoreSum / b.scoreCount;
            } else if (combinedWeight > 0) {
                if (hasUniformPenalty) {
                    const eff = computeEffectiveScoreRatio(b.correct, b.total, {
                        blanks: b.blanks,
                        penaltyPerWrong: b.penaltyPerWrong,
                        minScore: catMin,
                        maxScore: catMax,
                    });
                    score = catMin + eff.ratio * catRange;
                    netPoints = eff.netPoints;
                } else {
                    score = catMin + ((b.effCorrect + b.synthEffCorrect) / combinedWeight) * catRange;
                }
            } else {
                score = catMin;
            }

            const clampedScore = Number(Math.max(catMin, Math.min(catMax, score)).toFixed(2));
            return {
                ...(b.rowIds.length === 1 ? { id: b.rowIds[0] } : {}),
                date: b.date,
                ...(b.createdAt ? { createdAt: b.createdAt } : {}),
                total: isPureSynthetic ? b.synthTotal : b.total,
                correct: isPureSynthetic ? Math.round(b.synthEffCorrect) : b.correct,
                ...(b.blanks > 0 ? { blanks: b.blanks } : {}),
                ...(hasUniformPenalty ? { penaltyPerWrong: b.penaltyPerWrong, ...(netPoints !== undefined ? { netPoints } : {}) } : {}),
                score: clampedScore,
                ...(hasMixedPenaltyOrSynth ? { scorePoints: clampedScore } : {}),
                syntheticVolume: isPureSynthetic,
                ...(b.timeSpent > 0 ? { timeSpent: b.timeSpent, timedQuestoes: b.timedQuestoes } : {}),
                ...(preservedTopics.length > 0 ? { topics: preservedTopics } : {}),
                ...(preservedDifficulty ? { difficulty: preservedDifficulty } : {}),
                ...(preservedTelemetry.length > 0 ? { questionTelemetry: preservedTelemetry } : {}),
            };
        });

        const rehydratedRowInfoByDate = new Map();
        datesToRehydrate.forEach((dk) => {
            const dayRows = myRowsByDate.get(dk) || [];
            const ids = new Set(dayRows.map((r) => (r.id ? String(r.id) : null)).filter(Boolean));
            const sigs = new Set(dayRows.map((r) => {
                const t = Math.max(0, Number(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions) || 0);
                const c = Number(r.correct ?? r.acertos ?? r.correctCount);
                const s = Number(r.score ?? r.scorePoints ?? r.scorePct);
                return `${t}|${Number.isFinite(c) ? c : ''}|${Number.isFinite(s) ? Number(s.toFixed(1)) : ''}`;
            }));
            rehydratedRowInfoByDate.set(dk, { ids, sigs });
        });

        const remainingExisting = existingHistory.filter((h) => {
            const dk = getDateKey(h.date || h.createdAt);
            if (!dk || !datesToRehydrate.has(dk)) return true;
            // Preserve explicit-id history entries that are distinct from the simuladoRows being rehydrated
            const hId = h.id || h.simuladoRowId;
            if (hId) {
                const dayInfo = rehydratedRowInfoByDate.get(dk);
                if (dayInfo && dayInfo.ids.size > 0 && !dayInfo.ids.has(String(hId))) {
                    const ht = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                    const hc = Number(h.correct ?? h.acertos ?? h.correctCount);
                    const hs = Number(h.score ?? h.scorePoints ?? h.scorePct);
                    const hSig = `${ht}|${Number.isFinite(hc) ? hc : ''}|${Number.isFinite(hs) ? Number(hs.toFixed(1)) : ''}`;
                    if (!dayInfo.sigs.has(hSig)) {
                        return true;
                    }
                }
            }
            return false;
        });
        const mergedHistory = [...remainingExisting, ...reconstructed].sort((a, b) => {
            const da = toDateMs(a.date || a.createdAt);
            const db = toDateMs(b.date || b.createdAt);
            return (Number.isFinite(da) ? da : 0) - (Number.isFinite(db) ? db : 0);
        });

        return {
            ...cat,
            simuladoStats: {
                ...(cat.simuladoStats || {}),
                history: mergedHistory
            }
        };
    });
}

function hasValidNumber(value) {
    return value !== null && value !== undefined && typeof value !== 'boolean' && String(value).trim() !== '' && Number.isFinite(Number(value));
}

function safeFiniteNumber(value, fallback = 0) {
    return hasValidNumber(value) ? Number(value) : fallback;
}

function renderInsightText(text, textColorClass) {
    if (typeof text !== 'string') return text;

    const parts = text.split(/(\*\*[\s\S]*?\*\*|!![\s\S]*?!!|\+\+[\s\S]*?\+\+)/g).filter(Boolean);

    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={idx} className={`${textColorClass} font-extrabold px-1 py-0.5 rounded-md bg-white/[0.06]`}>
                    {part.slice(2, -2)}
                </strong>
            );
        }

        if (part.startsWith('!!') && part.endsWith('!!')) {
            return (
                <span key={idx} className="text-rose-300 font-bold px-1 py-0.5 rounded-md bg-rose-500/15">
                    {part.slice(2, -2)}
                </span>
            );
        }

        if (part.startsWith('++') && part.endsWith('++')) {
            return (
                <span key={idx} className="text-emerald-300 font-bold px-1 py-0.5 rounded-md bg-emerald-500/15">
                    {part.slice(2, -2)}
                </span>
            );
        }

        return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
}

// Função pura fora do componente
function buildPredictiveCompareData(
    timeline,
    focusCategory,
    categoryLevels,
    activeMcProjectionSeries,
    projectDays,
    minScore = 0,
    maxScore = 100
) {
    if (!focusCategory) return timeline;

    const safeMin = hasValidNumber(minScore) ? Number(minScore) : 0;
    const safeMax = hasValidNumber(maxScore) && Number(maxScore) > safeMin ? Number(maxScore) : Math.max(100, safeMin + 100);

    // 1. Prepara os dados históricos mapeando as chaves para leitura no gráfico
    let pts = timeline.map((d) => {
        const lowVal = d[`bay_ci_low_${focusCategory.id}`];
        const highVal = d[`bay_ci_high_${focusCategory.id}`];
        const hasValidBand = hasValidNumber(lowVal) && hasValidNumber(highVal);
        const bandLow = hasValidBand ? Math.max(safeMin, Math.min(safeMax, Math.min(Number(lowVal), Number(highVal)))) : null;
        const bandHigh = hasValidBand ? Math.max(safeMin, Math.min(safeMax, Math.max(Number(lowVal), Number(highVal)))) : null;

        return {
            ...d,
            "Nota Bruta": d[`raw_${focusCategory.id}`],
            "Nível Bayesiano": d[`bay_${focusCategory.id}`],
            "Banda Bayesiana": hasValidBand ? [bandLow, bandHigh] : null,
            "Média Histórica": d[`stats_${focusCategory.id}`]
        };
    });

    // 2. Acopla os pontos futuros do Monte Carlo com validação robusta
    if (activeMcProjectionSeries && pts.length > 0) {
        const lastIdx = pts.length - 1;
        const pickFinite = (...vals) => {
            for (const v of vals) {
                if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) return Number(v);
            }
            return safeMin;
        };

        const rawLevel = pickFinite(
            pts[lastIdx]["Nível Bayesiano"],
            categoryLevels?.[focusCategory?.id],
            activeMcProjectionSeries?.mc_p50,
            safeMin
        );

        const currentLevel = Math.max(safeMin, Math.min(safeMax, safeFiniteNumber(rawLevel, safeMin)));
        const p50 = Math.max(safeMin, Math.min(safeMax, safeFiniteNumber(activeMcProjectionSeries.mc_p50, currentLevel)));

        const band =
            Array.isArray(activeMcProjectionSeries.mc_band) && activeMcProjectionSeries.mc_band.length >= 2
                ? activeMcProjectionSeries.mc_band
                : [currentLevel, currentLevel];

        const band0 = safeFiniteNumber(band[0], currentLevel);
        const band1 = safeFiniteNumber(band[1], currentLevel);
        const bandMin = Math.max(safeMin, Math.min(band0, band1));
        const bandMax = Math.min(safeMax, Math.max(band0, band1));

        const bounded = (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return currentLevel;
            return Math.max(safeMin, Math.min(safeMax, n));
        };

        // Parse a data base UMA VEZ antes do loop em APP_TIMEZONE
        const todayKey = getDateKey(new Date());
        const lastKey = getDateKey(pts[lastIdx]?.date);
        const baseKey = (lastKey && todayKey && todayKey > lastKey) ? todayKey : (lastKey || todayKey);
        const baseNoon = (baseKey ? parseNoonLocal(baseKey) : null) || normalizeDate(pts[lastIdx]?.date) || new Date();

        const downSpread = Math.max(0, p50 - bandMin);
        const upSpread = Math.max(0, bandMax - p50);

        const futurePoints = [];
        const totalDays = Math.max(1, projectDays || 30);
        const steps = Math.min(6, Math.max(1, totalDays));
        const seenDates = new Set([pts[lastIdx].date]);

        for (let i = 1; i <= steps; i++) {
            const forwardDays = Math.max(1, Math.round((i / steps) * totalDays));
            const t = Math.min(1, forwardDays / totalDays);
            const weight = Math.sqrt(t);

            const val = bounded(currentLevel + (p50 - currentLevel) * t);
            const bandLow = bounded(val - downSpread * weight);
            const bandHigh = bounded(val + upSpread * weight);

            const dt = addDaysNoon(baseNoon, forwardDays);
            const iso = dt ? getDateKey(dt) : null;

            if (iso && !seenDates.has(iso)) {
                seenDates.add(iso);
                const parts = iso.split('-');
                futurePoints.push({
                    date: iso,
                    displayDate: parts.length === 3
                        ? (i === steps ? `${parts[2]}/${parts[1]} ✦` : `${parts[2]}/${parts[1]}`)
                        : iso,
                    "Futuro Provável": val,
                    "Cenário Range": [bandLow, bandHigh],
                    __future: true
                });
            }
        }

        pts[lastIdx] = {
            ...pts[lastIdx],
            "Futuro Provável": currentLevel,
            "Cenário Range": [currentLevel, currentLevel]
        };

        pts = [...pts, ...futurePoints];
    }

    return pts;
}

// M3 FIX: Função pura extraída para fora do componente — evita recriação a cada render (ancorada em APP_TIMEZONE).
function parseGoalDateLocal(input) {
    if (!input) return null;
    try {
        const key = getDateKey(input);
        if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
            const parsed = parseNoonLocal(key);
            if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
        }
        const fallback = parseNoonLocal(input);
        return (fallback && !Number.isNaN(fallback.getTime())) ? fallback : null;
    } catch {
        return null;
    }
}

const ENGINES = [
    {
        id: "raw", label: "Realidade Bruta", emoji: "📊", color: "#fb923c", prefix: "raw_", style: "linear",
        explain: { titulo: "Sua Montanha-Russa de Resultados Brutos", simples: "Métricas sem filtros ou suavizações estatísticas. Exibe a porcentagem exata e crua de acertos a cada simulado registrado, revelando a volatilidade real do seu desempenho.", dica: "Picos isolados (sejam altos ou baixos) não definem sua aprovação. Use esta visão apenas para detectar anomalias diárias e foque na tendência geral a longo prazo." },
    },
    {
        id: "raw_weekly", label: "Mapa de Calor", emoji: "📅", color: "#f472b6", prefix: null, style: "linear",
        explain: { titulo: "Frequência e Eficiência Semanal", simples: "Um mapa visual de constância. Cada simulado é uma célula colorida que mapeia seu progresso temporal. Células verdes indicam desempenho consolidado acima da meta; vermelhas indicam risco.", dica: "Excelente para identificar blocos de consistência. Veja se você está mantendo um ritmo de estudos saudável e com qualidade ao longo das semanas, isolando o ruído diário." },
    },
    {
        id: "bayesian", label: "Nível Bayesiano", emoji: "🧠", color: "#34d399", prefix: "bay_", style: "monotoneX",
        explain: { titulo: "Domínio Real Estimado (Modelo Beta-Binomial)", simples: "O motor de inteligência artificial calcula seu domínio probabilístico atual. A banda verde representa o Intervalo de Confiança (95%): quanto mais fina a faixa, mais o algoritmo tem certeza do seu nível de domínio.", dica: "No início, a faixa é larga devido à alta incerteza. Realize mais simulados para 'ensinar' o algoritmo e afinar a linha. Baseie suas decisões de avanço de matéria nesta métrica, e não na média crua." },
    },
    {
        id: "stats", label: "Média Histórica", emoji: "📐", color: "#818cf8", prefix: "stats_", style: "monotoneX",
        explain: { titulo: "Desempenho Acumulado Global", simples: "O reflexo clássico e absoluto de toda a sua jornada. Calcula a média simples de todas as questões resolvidas desde o início do seu uso.", dica: "Atenção: A média histórica sofre da inércia do passado e demora muito a refletir suas evoluções e vitórias recentes. É uma boa âncora de segurança, mas não a métrica primária de avanço." },
    },
    {
        id: "compare", label: "Raio-X + Monte Carlo", emoji: "⚡", color: "#a78bfa", prefix: null, style: "monotoneX",
        explain: { titulo: "Trindade Estatística: Passado, Presente e Futuro", simples: "A visão mais completa do ecossistema. Sobrepõe seus resultados brutos, extrai a curva Bayesiana de domínio real e usa o motor Monte Carlo para prever cenários probabilísticos até a data da sua prova.", dica: "Não analise no escuro. Utilize o seletor 'Foco' para isolar a disciplina que está puxando o seu Monte Carlo para baixo e crie um plano de ação imediato." },
    },
    {
        id: "subtopics", label: "Raio-X de Assuntos", emoji: "🔬", color: "#facc15", prefix: null, style: "linear",
        explain: { titulo: "Auditoria Cirúrgica de Subtópicos", simples: "Desça ao nível molecular do seu aprendizado. Quebra o desempenho disciplinar e expõe a taxa real de acertos e o volume de questões feitas por cada assunto específico.", dica: "O Segredo da Eficiência: Pare de revisar a matéria inteira. Identifique os blocos vermelhos (subtópicos fracos) e direcione todo o seu esforço cirurgicamente para eles." },
    },
    {
        id: "mc_density", label: "Rastreador MC", emoji: "🚀", color: "#60a5fa", prefix: null, style: "monotoneX",
        explain: { titulo: "O Seu Rastreador de Aprovação", simples: "Esta linha mostra se o seu ritmo de estudos está te aproximando ou te afastando da aprovação. Ela calcula qual era a sua projeção de nota (Monte Carlo) no final de cada simulado que você já fez.", dica: "A métrica definitiva de convergência. Se a linha está subindo, continue o que está fazendo! Se ela estagnou ou caiu, é hora de mudar a estratégia na aba Foco." },
    },
    {
        id: "weekly_diff", label: "Semanal", emoji: "📆", color: "#10b981", prefix: null, style: "linear",
        explain: { titulo: "Acelerômetro Semanal de Desempenho", simples: "Calcula a tração do seu estudo comparando diretamente os ganhos ou perdas (delta) da semana atual em relação à semana imediatamente anterior.", dica: "Aviso Antecipado: Semanas com deltas negativos acentuados alertam para esquecimento (curva do esquecimento). Revise a teoria destas disciplinas antes que a perda se torne definitiva." },
    },
    {
        id: "today_vs_general", label: "Hoje vs Geral", emoji: "⚖️", color: "#a855f7", prefix: null, style: "linear",
        explain: { titulo: "Comparativo Diário vs. Histórico Geral", simples: "Analise seu desempenho de hoje em relação à sua média geral de estudos.", dica: "Use esta visão para calibrar seu foco diário." },
    },
    {
        id: "time_spent", label: "Agilidade AI", emoji: "⏳", color: "#06b6d4", prefix: null, style: "linear",
        explain: { titulo: "Rastreador de Agilidade AI", simples: "Analisa o tempo médio gasto por questão em cada matéria nos Simulados IA, ajudando você a encontrar gargalos que roubam minutos preciosos no dia da prova.", dica: "Matérias muito lentas podem te reprovar mesmo se você souber o conteúdo. Foque nelas para ganhar resistência." },
    },
    {
        id: "speed_accuracy", label: "Speed × Precisão", emoji: "⚡", color: "#22d3ee", prefix: null, style: "linear",
        explain: { titulo: "Matriz Velocidade × Precisão (4 Quadrantes)", simples: "Cruza segundos gastos por questão contra sua taxa de acerto por disciplina ou subtópico, separando domínio rápido, leitura apressada, necessidade de agilidade e lacunas teóricas.", dica: "Itens no quadrante 'Leitura Apressada' sobem rápido só reduzindo o ritmo; itens em 'Lacuna Teórica' pedem revisão da base." },
    },
    {
        id: "exam_pacing", label: "Ritmo de Prova", emoji: "⏱️", color: "#38bdf8", prefix: null, style: "linear",
        explain: { titulo: "Simulador de Orçamento de Tempo de Prova", simples: "Projeta quanto tempo você levaria para concluir a prova inteira no seu ritmo atual por disciplina e compara com a duração oficial da banca.", dica: "Ajuste a duração e o número de questões do seu concurso para ver exatamente qual disciplina está estourando o relógio." },
    },
    {
        id: "consistency_boxplot", label: "Consistência", emoji: "📦", color: "#818cf8", prefix: null, style: "linear",
        explain: { titulo: "Box Plot de Consistência por Disciplina", simples: "Exibe mínimo, 1º quartil, mediana, 3º quartil e máximo das suas notas. Revela se uma média boa vem de estabilidade real ou de oscilação perigosa.", dica: "Disciplinas com caixa larga (IQR alto) têm maior risco de queda no dia da prova — revise os tópicos instáveis." },
    },
    {
        id: "projection_fan", label: "Cone Futuro", emoji: "🎯", color: "#34d399", prefix: null, style: "monotoneX",
        explain: { titulo: "Fan Chart — Cone de Projeção até a Prova", simples: "Projeta cenários probabilísticos futuros (P10 conservador, P25–P75 central, P50 mediano e P90 otimista) a partir de hoje até a data da prova, sobrepostos aos cortes históricos.", dica: "Observe quando a mediana P50 cruza a meta e se até a faixa conservadora P10 se aproxima dos cortes anteriores." },
    },
    {
        id: "kalman_latent", label: "Kalman Latente", emoji: "🧲", color: "#10b981", prefix: null, style: "monotoneX",
        explain: { titulo: "Habilidade Latente (Filtro de Kalman) vs. Notas Brutas", simples: "Executa o filtro State-Space passo a passo para separar sua habilidade real latente do ruído estatístico de simulados atípicos.", dica: "Pontos destacados em rosa são choques pontuais de ruído absorvidos pelo filtro — não desanime por uma prova fora da curva se a linha verde segue firme." },
    },
    {
        id: "tornado_whatif", label: "Tornado & Risco", emoji: "🌪️", color: "#f59e0b", prefix: null, style: "linear",
        explain: { titulo: "Decomposição de Eliminação, Tornado & Simulador 'E Se?'", simples: "Mostra exatamente se sua reprovação simulada vem da nota global ou de um corte mínimo (minCutoff/bloco), ordena as matérias por impacto real e oferece sliders interativos.", dica: "Ataque primeiro a disciplina no topo do Tornado ou a que apresenta maior % de eliminação por corte mínimo." },
    },
    {
        id: "correlation_regimes", label: "Correlação & Regimes", emoji: "🔗", color: "#a855f7", prefix: null, style: "linear",
        explain: { titulo: "Matriz de Correlação Semanal & Mapa de Regimes (Hurst × Velocidade)", simples: "Cruza semanas comuns entre disciplinas para detectar efeito gangorra (crowding-out) e classifica cada matéria por persistência (Hurst H) e velocidade de ganho.", dica: "Pares em vermelho (r < -0.45) pedem intercalação semanal; matérias com H < 0.42 exigem consolidação da base." },
    },
    {
        id: "irt_psychometric", label: "TRI & Chute", emoji: "🧬", color: "#c084fc", prefix: null, style: "monotoneX",
        explain: { titulo: "Psicometria TRI/IRT (θ) & Simulador de Chute da Banca", simples: "Estima sua habilidade latente θ independente da dificuldade da prova, indica sua Zona Proximal (~70%) e calcula a estratégia ótima de chute/abstenção para bancas com penalidade (ex.: Cebraspe).", dica: "Configure sua banca e use o nível recomendado pela Zona Proximal no próximo Simulado IA." },
    },
    {
        id: "metacognition_fatigue", label: "Metacognição & Fadiga", emoji: "🧠", color: "#ec4899", prefix: null, style: "linear",
        explain: { titulo: "Metacognição, Anatomia dos Erros & Fadiga Intraprova", simples: "Cruza sua confiança declarada contra o acerto real, classifica a causa raiz dos erros e mede se sua precisão/velocidade degrada do 1º ao 4º quarto do simulado.", dica: "Converta erros de 'Certeza + Erro' em Flashcards FSRS — eles têm o maior retorno imediato." },
    },
];


const ENGINE_GUIDE = {
    raw: {
        como: 'Mostra a nota bruta real de cada simulado, sem suavização. Cada ponto é um dia registrado.',
        positivo: 'Sequência de pontos acima da meta e tendência de alta.',
        alerta: 'Quedas bruscas, pontos isolados muito baixos ou oscilação excessiva.',
        acao: 'Avalie a tendência dos últimos 7 a 14 dias, não um ponto isolado.'
    },
    raw_weekly: {
        como: 'O mapa de calor mostra os dias com atividade. A cor indica o desempenho em relação à meta e a intensidade mostra volume.',
        positivo: 'Muitas células verdes, sequência de dias ativos e desempenho consistente.',
        alerta: 'Células vermelhas repetidas, muitos dias vazios ou queda de frequência.',
        acao: 'Identifique os dias da semana com rendimento menor e reforce revisões nesses períodos.'
    },
    bayesian: {
        como: 'O nível bayesiano estima seu domínio real, não apenas a nota de um simulado. A faixa mostra o intervalo de confiança de 95%.',
        positivo: 'Linha subindo, faixa estreita e nível acima da meta.',
        alerta: 'Faixa muito larga, linha caindo ou nível abaixo da meta.',
        acao: 'Faça mais simulados para reduzir a incerteza e baseie decisões no nível bayesiano.'
    },
    stats: {
        como: 'Mostra a média histórica acumulada de toda a sua jornada de estudo.',
        positivo: 'Média alta e estável, servindo como base de segurança.',
        alerta: 'A média histórica demora para refletir melhorias recentes.',
        acao: 'Use como referência de longo prazo, mas avalie progresso recente pelo nível bayesiano.'
    },
    compare: {
        como: 'Combina passado, presente e futuro: nota bruta, nível bayesiano atual e projeção Monte Carlo até a prova.',
        positivo: 'Projeção futura acima da meta e intervalo de confiança estreito.',
        alerta: 'Projeção abaixo da meta, intervalo muito largo ou alguma disciplina puxando a previsão para baixo.',
        acao: 'Use o seletor de foco para identificar qual matéria está segurando sua projeção.'
    },
    subtopics: {
        como: 'Mostra o desempenho por assunto. Cada barra representa a taxa de acerto e o volume de questões daquele tópico.',
        positivo: 'Maioria dos tópicos acima da meta, especialmente os com maior volume.',
        alerta: 'Tópicos vermelhos com muitas questões, pois representam perda real de pontos.',
        acao: 'Priorize revisão cirúrgica nos tópicos abaixo da meta com maior volume de questões.'
    },
    mc_density: {
        como: 'Mostra a evolução da projeção Monte Carlo após cada simulado. Não é a nota do simulado, mas sim a previsão futura.',
        positivo: 'Linha subindo e probabilidade de aprovação acima de 70%.',
        alerta: 'Linha estagnada, caindo ou intervalo de confiança muito largo.',
        acao: 'Se a projeção caiu, revise os tópicos críticos e reduza a dispersão de estudo.'
    },
    weekly_diff: {
        como: 'Compara o desempenho desta semana com o da semana anterior. Deltas positivos indicam ganho, negativos indicam perda.',
        positivo: 'Deltas positivos consecutivos e recuperação após semanas fracas.',
        alerta: 'Várias semanas negativas seguidas, especialmente em matérias importantes.',
        acao: 'Use quedas semanais como aviso precoce de esquecimento e faça revisão espaçada.'
    },
    today_vs_general: {
        como: 'Compara o desempenho de hoje ou da última sessão contra a média geral e contra períodos anteriores.',
        positivo: 'Sessão atual acima da média geral e última barra com variação positiva.',
        alerta: 'Hoje muito abaixo da média geral ou última sessão com queda acentuada.',
        acao: 'Se o dia atual estiver fraco, avalie volume, cansaço ou dificuldade dos temas escolhidos.'
    },
    time_spent: {
        como: 'Mostra o tempo médio gasto por questão em cada disciplina nos simulados IA. Ajuda a encontrar gargalos de velocidade.',
        positivo: 'Tempo estável ou diminuindo sem queda de precisão.',
        alerta: 'Matérias muito lentas podem comprometer o tempo total da prova.',
        acao: 'Treine simulados cronometrados nas disciplinas mais lentas.'
    },
    speed_accuracy: {
        como: 'Posiciona cada disciplina (ou assunto) pelo tempo médio por questão (eixo X) e taxa de acerto (eixo Y). O tamanho da bolha indica o volume de questões.',
        positivo: 'Concentração no quadrante superior esquerdo (Domínio Rápido).',
        alerta: 'Bolhas grandes em Leitura Apressada (rápido e errando) ou Lacuna Teórica (lento e errando).',
        acao: 'Desacelere nos temas apressados e faça revisão direcionada nas lacunas lentas.'
    },
    exam_pacing: {
        como: 'Simula o tempo total necessário para resolver toda a prova no seu ritmo atual por matéria, comparado à duração oficial do concurso.',
        positivo: 'Tempo projetado abaixo da duração da prova com folga para gabarito.',
        alerta: 'Estouro de tempo projetado indicando questões deixadas em branco.',
        acao: 'Ataque primeiro as matérias com maior saldo positivo de estouro de minutos.'
    },
    consistency_boxplot: {
        como: 'Cada linha resume toda a distribuição das notas da disciplina: mínimo, Q1, mediana, Q3, máximo e média (losango).',
        positivo: 'Caixa estreita (baixo IQR) posicionada à direita da meta.',
        alerta: 'Caixas muito largas ou cauda esquerda abaixo do corte mínimo (minCutoff).',
        acao: 'Estabilize matérias voláteis atacando subtópicos específicos com maior erro.'
    },
    projection_fan: {
        como: 'Projeta a evolução futura de hoje até a data da prova em faixas de probabilidade (P10–P90 e P25–P75) sobrepostas aos cortes históricos.',
        positivo: 'Mediana P50 cruzando a meta antes da prova com cone se estreitando.',
        alerta: 'Até o cenário P75 abaixo da meta ou cone excessivamente aberto.',
        acao: 'Aumente a constância de simulados para reduzir incerteza e elevar a inclinação.'
    },
    kalman_latent: {
        como: 'Separa a habilidade real estimada (linha verde suave + IC 95%) das oscilações brutas de cada simulado (pontos laranja/rosa).',
        positivo: 'Habilidade latente em alta sustentada mesmo com ruído pontual.',
        alerta: 'Tendência estrutural negativa por várias semanas consecutivas.',
        acao: 'Use a curva latente para avaliar evolução real sem reagir por impulso a um simulado isolado.'
    },
    tornado_whatif: {
        como: 'Mostra o motivo das reprovações simuladas no Monte Carlo (corte global vs. minCutoff) e mede o impacto em pp de variar cada matéria em ±10%.',
        positivo: 'Risco de eliminação por corte mínimo próximo de zero e margem confortável acima do corte global.',
        alerta: 'Uma única disciplina respondendo por >15% das eliminações no Monte Carlo.',
        acao: 'Use os sliders "E Se?" para descobrir qual combinação de metas coloca sua aprovação acima de 80%.'
    },
    correlation_regimes: {
        como: 'A matriz mostra se duas matérias sobem juntas (verde) ou sofrem efeito gangorra (vermelho). O scatter cruza Hurst H contra velocidade semanal.',
        positivo: 'Disciplinas no quadrante de Tendência Consolidada (H > 0.58 e velocidade positiva).',
        alerta: 'Correlação negativa forte (r < -0.45) ou matérias presas em platô/reversão.',
        acao: 'Intercale matérias em efeito gangorra na semana e troque a abordagem em disciplinas em platô.'
    },
    irt_psychometric: {
        como: 'Estima sua habilidade θ na escala TRI [-3, +3] a partir da dificuldade das questões e calcula o valor esperado de chutar na sua banca.',
        positivo: 'Curva real acompanhando a curva TRI prevista e θ em crescimento.',
        alerta: 'Incoerência TRI (errando mais fáceis do que médias/difíceis) ou chutes dando saldo líquido negativo.',
        acao: 'Treine na dificuldade da Zona Proximal (~70%) e siga a regra ótima de abstenção da sua banca.'
    },
    metacognition_fatigue: {
        como: 'Analisa confiança × acerto, causas raiz dos erros e degradação de precisão/velocidade do início ao fim dos simulados IA.',
        positivo: 'Alto Domínio Real e curva de precisão estável até o 4º quarto do simulado.',
        alerta: 'Muitos erros com "Certeza" ou queda acentuada de acerto no final do simulado.',
        acao: 'Envie erros críticos para Flashcards FSRS e treine blocos mais longos para ganhar resistência.'
    }
};

const ENGINES_WITH_GUIDE = ENGINES.map((engine) => ({
    ...engine,
    guide: ENGINE_GUIDE[engine.id]
}));

const BAYESIAN_ENGINE = ENGINES_WITH_GUIDE.find((e) => e.id === 'bayesian');
const SECONDARY_ENGINES = ENGINES_WITH_GUIDE.filter((e) => e.id !== 'bayesian');

const ENGINE_ICONS = {
    raw: BarChart2,
    raw_weekly: Grid3X3,
    bayesian: Brain,
    stats: Activity,
    compare: Sparkles,
    subtopics: Microscope,
    mc_density: Rocket,
    weekly_diff: CalendarRange,
    today_vs_general: Scale,
    time_spent: Timer,
    speed_accuracy: Gauge,
    exam_pacing: Clock,
    consistency_boxplot: BoxSelect,
    projection_fan: LineChart,
    kalman_latent: Waves,
    tornado_whatif: SlidersHorizontal,
    correlation_regimes: Network,
    irt_psychometric: Sigma,
    metacognition_fatigue: Flame,
};

const BASE_ENGINE_GROUPS = [
    { id: 'all', label: 'Todos', ids: null },
    { id: 'recommended', label: '★ Recomendados', ids: ['raw_weekly', 'subtopics', 'compare', 'tornado_whatif'] },
    { id: 'performance', label: 'Desempenho', ids: ['raw_weekly', 'raw', 'stats', 'subtopics', 'weekly_diff', 'today_vs_general', 'consistency_boxplot'] },
    { id: 'speed', label: 'Tempo & Ritmo', ids: ['time_spent', 'speed_accuracy', 'exam_pacing'] },
    { id: 'projection', label: 'Projeção & Risco', ids: ['compare', 'mc_density', 'projection_fan', 'kalman_latent', 'tornado_whatif'] },
    { id: 'psychometrics', label: 'Psicometria & Erros', ids: ['correlation_regimes', 'irt_psychometric', 'metacognition_fatigue'] },
];

function getRecommendedEngineIdsForStage(stage = 0) {
    if (stage <= 0) return ['raw_weekly', 'raw', 'subtopics', 'today_vs_general'];
    if (stage === 1) return ['raw_weekly', 'subtopics', 'kalman_latent', 'weekly_diff', 'consistency_boxplot'];
    if (stage === 2) return ['compare', 'tornado_whatif', 'subtopics', 'kalman_latent', 'projection_fan', 'speed_accuracy'];
    return ['compare', 'tornado_whatif', 'projection_fan', 'correlation_regimes', 'irt_psychometric', 'metacognition_fatigue', 'exam_pacing'];
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.045 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } }
};

export default React.memo(function EvolutionChart({
    categories: propCategories = null,
    targetScore = 80,
    goalDate,
    monteCarloHistory = [],
    studyLogs = [],
    simuladoRows = [],
    unit = '%',
    minScore = 0,
    maxScore = 100,
    persistUiPrefs = !(typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'),
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const rawCategories = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId];
        return contest?.categories ?? EMPTY_ARRAY;
    }));

    const simuladoRowsArray = useMemo(
        () => (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})),
        [simuladoRows]
    );

    // RIGOR-09 FIX: Recuperar os pesos e penalidade do store antes da hidratação de linhas órfãs
    const { activeContestId, mcWeights, historicalCutoffs, examDurationMinutes, examTotalQuestions, examBoard, penaltyPerWrong, examGroupCutoffs } = useAppStore(
        useShallow((state) => {
            const currentId = state.appState?.activeId || 'default';
            const contest = state.appState?.contests?.[currentId];
            return {
                activeContestId: currentId,
                mcWeights: contest?.mcWeights || EMPTY_OBJECT,
                historicalCutoffs: contest?.historicalCutoffs || EMPTY_ARRAY,
                examDurationMinutes: contest?.examDurationMinutes ?? null,
                examTotalQuestions: contest?.examTotalQuestions ?? null,
                examBoard: contest?.examBoard || 'PADRAO',
                penaltyPerWrong: contest?.penaltyPerWrong ?? 0,
                examGroupCutoffs: contest?.examGroupCutoffs || null,
            };
        })
    );

    const categories = useMemo(() => {
        const sourceList = (Array.isArray(propCategories) && propCategories.length > 0) ? propCategories : rawCategories;
        const safeCategories = (
            Array.isArray(sourceList)
                ? sourceList
                : Object.values(sourceList || {})
        ).filter(Boolean).map((cat, idx) => {
            // FIX 1A-1: cor por índice (puro, sem mutação de variável externa)
            const color = cat.color || DEFAULT_CATEGORY_PALETTE[idx % DEFAULT_CATEGORY_PALETTE.length];
            // FIX 1A-2: normalizar tasks para array
            const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
            return { ...cat, color, tasks };
        });
        return hydrateCategoriesWithSimuladoRows(safeCategories, simuladoRowsArray, minScore, maxScore, penaltyPerWrong);
    }, [propCategories, rawCategories, simuladoRowsArray, minScore, maxScore, penaltyPerWrong]);

    const initialUiPrefs = useMemo(
        () => (persistUiPrefs ? readEvolutionUiPrefs(activeContestId) : DEFAULT_EVOLUTION_UI_PREFS),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const [activeEngine, setActiveEngine] = useState(initialUiPrefs.activeEngine);
    const [selectedSubjectId, setFocusSubjectId] = useState(null);
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories, mcWeights, maxScore, minScore);

    const isSameId = useCallback(
        (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b),
        []
    );

    // Prioriza activeCategories no default, mas respeita seleção explícita de qualquer categoria
    const focusSubjectId = useMemo(() => {
        const hasSelected = selectedSubjectId !== null && selectedSubjectId !== undefined && String(selectedSubjectId).trim() !== '';
        if (hasSelected && categories) {
            const matched = categories.find(c => isSameId(c?.id, selectedSubjectId));
            if (matched) return matched.id;
        }
        const pool = (Array.isArray(activeCategories) && activeCategories.length > 0) ? activeCategories : categories;
        return pool?.[0]?.id ?? categories?.[0]?.id;
    }, [activeCategories, categories, selectedSubjectId, isSameId]);

    const handleSelectFocusValue = useCallback((rawVal) => {
        if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') return;
        const matched = categories.find(c => isSameId(c?.id, rawVal));
        setFocusSubjectId(matched ? matched.id : rawVal);
    }, [categories, isSameId]);

    const monteCarloHistoryArray = useMemo(
        () => (Array.isArray(monteCarloHistory) ? monteCarloHistory : Object.values(monteCarloHistory || {})),
        [monteCarloHistory]
    );

    const studyLogsArray = useMemo(
        () => (Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {})),
        [studyLogs]
    );

    const { projectDays, hasValidGoalDate, rawDaysToExam } = useMemo(() => {
        if (!goalDate) return { projectDays: 30, hasValidGoalDate: false, rawDaysToExam: null };
        const todayKey = getDateKey(new Date());
        const now = (todayKey ? parseNoonLocal(todayKey) : null) || new Date();
        const goal = parseGoalDateLocal(goalDate);
        if (!goal || Number.isNaN(goal.getTime())) {
            return { projectDays: 30, hasValidGoalDate: false, rawDaysToExam: null };
        }
        const diffDays = Math.ceil((goal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (!Number.isFinite(diffDays)) {
            return { projectDays: 30, hasValidGoalDate: false, rawDaysToExam: null };
        }
        const clampedCalendarDays = Math.max(0, Math.min(3650, diffDays));
        const safeDays = diffDays > 0 ? Math.min(3650, diffDays) : 1;
        return { projectDays: safeDays, hasValidGoalDate: true, rawDaysToExam: clampedCalendarDays };
    }, [goalDate]);

    const resolveUnitForScale = (rawUnit, scaleMin, scaleMax) => {
        const trimmed = typeof rawUnit === 'string' ? rawUnit.trim() : '';
        if (trimmed !== '' && trimmed !== '%') return trimmed;
        return (Number(scaleMax) === 100 && Number(scaleMin) === 0) ? '%' : 'pts';
    };

    const resolvedGlobalUnit = resolveUnitForScale(unit, minScore, maxScore);

    const [showOnlyFocus, setShowOnlyFocus] = useState(false);
    const [timeWindow, setTimeWindow] = useState(initialUiPrefs.timeWindow);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(false);
    const [statusViewMode, setStatusViewMode] = useState(initialUiPrefs.statusViewMode);
    const [selectedStatusId, setSelectedStatusId] = useState(null);
    const [showHeroGuide, setShowHeroGuide] = useState(false);
    const [showSecondaryGuide, setShowSecondaryGuide] = useState(false);
    const [showDetailedGallery, setShowDetailedGallery] = useState(initialUiPrefs.showDetailedGallery);
    const [heroExpanded, setHeroExpanded] = useState(false);
    const [engineGroup, setEngineGroup] = useState(initialUiPrefs.engineGroup);
    const [prevContestIdForPrefs, setPrevContestIdForPrefs] = useState(activeContestId);
    const exportErrorTimerRef = useRef(null);
    const isMountedRef = useRef(true);
    const tabsScrollRef = useRef(null);

    if (activeContestId !== prevContestIdForPrefs) {
        setPrevContestIdForPrefs(activeContestId);
        setFocusSubjectId(null);
        setShowOnlyFocus(false);
        setSelectedStatusId(null);
        if (persistUiPrefs) {
            const restored = readEvolutionUiPrefs(activeContestId);
            setActiveEngine(restored.activeEngine);
            setTimeWindow(restored.timeWindow);
            setEngineGroup(restored.engineGroup);
            setStatusViewMode(restored.statusViewMode);
            setShowDetailedGallery(restored.showDetailedGallery);
        }
    }

    useEffect(() => {
        if (!persistUiPrefs) return;
        writeEvolutionUiPrefs(activeContestId, {
            activeEngine,
            timeWindow,
            engineGroup,
            statusViewMode,
            showDetailedGallery,
        });
    }, [persistUiPrefs, activeContestId, activeEngine, timeWindow, engineGroup, statusViewMode, showDetailedGallery]);

    const scrollEngineTabs = useCallback((direction) => {
        const el = tabsScrollRef.current;
        if (!el) return;
        el.scrollBy({
            left: direction === 'left' ? -240 : 240,
            behavior: 'smooth'
        });
    }, []);

    const maturityStage = useMemo(() => {
        try {
            return evaluateContestMaturity({
                categories,
                studyLogs: studyLogsArray,
                simuladoRows: simuladoRowsArray,
            })?.stage ?? 0;
        } catch {
            return 0;
        }
    }, [categories, studyLogsArray, simuladoRowsArray]);

    const ENGINE_GROUPS = useMemo(() => {
        const recIds = getRecommendedEngineIdsForStage(maturityStage);
        return BASE_ENGINE_GROUPS.map((g) =>
            g.id === 'recommended' ? { ...g, label: `★ Recomendados (N${maturityStage})`, ids: recIds } : g
        );
    }, [maturityStage]);

    useEffect(() => {
        if (!location?.search) return;
        const params = new URLSearchParams(location.search);
        const requestedEngine = params.get('engine');
        if (requestedEngine && SECONDARY_ENGINES.some((e) => e.id === requestedEngine)) {
            setEngineGroup('all');
            setActiveEngine(requestedEngine);
        }
    }, [location?.search]);

    const visibleSecondaryEngines = useMemo(() => {
        const group = ENGINE_GROUPS.find((g) => g.id === engineGroup);
        if (!group || !group.ids) return SECONDARY_ENGINES;
        return SECONDARY_ENGINES.filter((eng) => group.ids.includes(eng.id));
    }, [engineGroup, ENGINE_GROUPS]);

    useEffect(() => {
        if (visibleSecondaryEngines.length > 0 && !visibleSecondaryEngines.some((eng) => eng.id === activeEngine)) {
            setActiveEngine(visibleSecondaryEngines[0].id);
        }
    }, [visibleSecondaryEngines, activeEngine]);

    const engineTabRefs = useRef(new Map());

    const carouselRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);
    const hasDraggedRef = useRef(false);
    const dragResetTimerRef = useRef(null);
    const focusTabRafRef = useRef(null);

    const updateCarouselScrollState = useCallback(() => {
        const el = carouselRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const nextLeft = scrollLeft > 6;
        const nextRight = scrollLeft < scrollWidth - clientWidth - 6;
        setCanScrollLeft(prev => (prev === nextLeft ? prev : nextLeft));
        setCanScrollRight(prev => (prev === nextRight ? prev : nextRight));
    }, []);

    const handleSelectCategory = useCallback((catId) => {
        if (!hasDraggedRef.current && catId !== null && catId !== undefined && String(catId).trim() !== '') {
            setFocusSubjectId(catId);
        }
    }, []);

    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return;
        updateCarouselScrollState();
        el.addEventListener('scroll', updateCarouselScrollState, { passive: true });
        window.addEventListener('resize', updateCarouselScrollState);
        return () => {
            el.removeEventListener('scroll', updateCarouselScrollState);
            window.removeEventListener('resize', updateCarouselScrollState);
        };
    }, [updateCarouselScrollState, categories]);

    const scrollCarousel = useCallback((direction) => {
        const el = carouselRef.current;
        if (!el) return;
        const scrollAmount = 252 * 2;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    }, []);

    const handleCarouselWheel = useCallback((e) => {
        const el = carouselRef.current;
        if (!el) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
            if ((e.deltaY > 0 && el.scrollLeft < el.scrollWidth - el.clientWidth - 2) || (e.deltaY < 0 && el.scrollLeft > 2)) {
                el.scrollLeft += e.deltaY;
            }
        }
    }, []);

    const handleCarouselMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        const el = carouselRef.current;
        if (!el) return;
        isDraggingRef.current = true;
        startXRef.current = e.pageX - el.offsetLeft;
        scrollLeftRef.current = el.scrollLeft;
        hasDraggedRef.current = false;
        el.style.scrollBehavior = 'auto';
        el.style.scrollSnapType = 'none';
    }, []);

    const handleCarouselMouseMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        const el = carouselRef.current;
        if (!el) return;
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startXRef.current) * 1.2;
        if (Math.abs(walk) > 5) {
            hasDraggedRef.current = true;
        }
        el.scrollLeft = scrollLeftRef.current - walk;
    }, []);

    const handleCarouselMouseUpOrLeave = useCallback(() => {
        if (isDraggingRef.current) {
            const el = carouselRef.current;
            if (el) {
                el.style.scrollBehavior = '';
                el.style.scrollSnapType = '';
            }
        }
        isDraggingRef.current = false;
        if (hasDraggedRef.current) {
            if (dragResetTimerRef.current) {
                clearTimeout(dragResetTimerRef.current);
            }
            dragResetTimerRef.current = setTimeout(() => {
                hasDraggedRef.current = false;
                dragResetTimerRef.current = null;
            }, 0);
        }
    }, []);

    // FIX-CLEANUP-01: limpar timer de erro, timer de drag, rAF e refs de tab ao desmontar.
    useEffect(() => {
        isMountedRef.current = true;
        const tabRefs = engineTabRefs.current;
        return () => {
            isMountedRef.current = false;
            if (exportErrorTimerRef.current) {
                clearTimeout(exportErrorTimerRef.current);
                exportErrorTimerRef.current = null;
            }
            if (dragResetTimerRef.current) {
                clearTimeout(dragResetTimerRef.current);
                dragResetTimerRef.current = null;
            }
            if (focusTabRafRef.current) {
                cancelAnimationFrame(focusTabRafRef.current);
                focusTabRafRef.current = null;
            }
            tabRefs.clear();
        };
    }, []);

    const focusEngineTab = (id) => {
        if (focusTabRafRef.current) {
            cancelAnimationFrame(focusTabRafRef.current);
        }
        focusTabRafRef.current = requestAnimationFrame(() => {
            focusTabRafRef.current = null;
            engineTabRefs.current.get(id)?.focus();
        });
    };

    const focusCategory = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        const pool = (Array.isArray(activeCategories) && activeCategories.length > 0) ? activeCategories : categories;
        const found = pool.find(c => isSameId(c?.id, focusSubjectId)) || categories.find(c => isSameId(c?.id, focusSubjectId));
        return found || pool[0] || categories[0];
    }, [activeCategories, categories, focusSubjectId, isSameId]);

    const focusMax = useMemo(() => {
        return hasValidNumber(focusCategory?.maxScore) && Number(focusCategory.maxScore) > 0
            ? Number(focusCategory.maxScore)
            : maxScore;
    }, [focusCategory?.maxScore, maxScore]);

    const focusMin = useMemo(() => {
        if (hasValidNumber(focusCategory?.minScore)) {
            return Math.min(Number(focusCategory.minScore), focusMax);
        }
        const gMin = hasValidNumber(minScore) ? Number(minScore) : 0;
        return gMin < focusMax ? gMin : 0;
    }, [focusCategory?.minScore, focusMax, minScore]);

    const resolvedFocusUnit = resolveUnitForScale(unit, focusMin, focusMax);
    const resolvedActiveUnit = showOnlyFocus ? resolvedFocusUnit : resolvedGlobalUnit;

    const focusTarget = useMemo(() => {
        if (hasValidNumber(focusCategory?.minCutoff) && Number(focusCategory.minCutoff) > focusMin) {
            return Math.max(focusMin, Math.min(focusMax, Number(focusCategory.minCutoff)));
        }
        if (focusMax !== maxScore || focusMin !== minScore) {
            return ratioToPoints(pointsToRatio(targetScore, maxScore, minScore), focusMax, focusMin);
        }
        return targetScore;
    }, [focusCategory?.minCutoff, focusMin, focusMax, targetScore, maxScore, minScore]);

    const categoryLevels = useCategoryLevels(categories, timeline, 'bayesian', maxScore, minScore);

    const subjectAggData = useSubjectAggData({
        categories, showOnlyFocus, focusCategory, timeWindow, maxScore, minScore
    });

    const safeGlobalMetrics = useMemo(() => {
        if (timeWindow === 'all' && !showOnlyFocus) {
            return {
                totalQuestions: Number(globalMetrics?.totalQuestions) || 0,
                totalCorrect: Number(globalMetrics?.totalCorrect) || 0,
                globalAccuracy: (globalMetrics?.globalAccuracy === null || globalMetrics?.globalAccuracy === undefined || globalMetrics?.globalAccuracy === '')
                    ? 0
                    : (Number.isFinite(Number(globalMetrics?.globalAccuracy)) ? Number(globalMetrics?.globalAccuracy) : 0),
            };
        }
        let realQ = 0;
        let realC = 0;
        let synthQ = 0;
        let synthC = 0;
        for (const item of (subjectAggData || [])) {
            realQ += Number(item?.realQuestoes ?? item?.questoes) || 0;
            realC += Number(item?.realAcertosExact ?? item?.realAcertos ?? item?.acertos) || 0;
            synthQ += Number(item?.syntheticQuestoes) || 0;
            synthC += Number(item?.syntheticAcertosExact ?? item?.syntheticAcertos) || 0;
        }
        const combinedQ = realQ + synthQ;
        const acc = combinedQ > 0 ? ((realC + synthC) / combinedQ) * 100 : 0;
        return {
            totalQuestions: realQ,
            totalCorrect: realC,
            globalAccuracy: Number.isFinite(acc) ? acc : 0,
        };
    }, [globalMetrics, subjectAggData, timeWindow, showOnlyFocus]);

    // Comparativo automático com a janela imediatamente anterior (30d/60d/90d)
    const previousPeriodMetrics = useMemo(() => {
        if (timeWindow === 'all') return null;
        const days = Number.parseInt(String(timeWindow), 10);
        if (!Number.isFinite(days) || days <= 0) return null;
        const todayKey = getDateKey(new Date());
        const todayNoon = todayKey ? parseNoonLocal(todayKey) : new Date();
        const currStartNoon = todayNoon ? addDaysNoon(todayNoon, -days) : null;
        const prevStartNoon = todayNoon ? addDaysNoon(todayNoon, -(days * 2)) : null;
        const currStartMs = currStartNoon ? toDateMs(getDateKey(currStartNoon)) : NaN;
        const prevStartMs = prevStartNoon ? toDateMs(getDateKey(prevStartNoon)) : NaN;
        if (!Number.isFinite(currStartMs) || !Number.isFinite(prevStartMs)) return null;

        const targetCats = (showOnlyFocus && focusCategory?.id != null)
            ? categories.filter((c) => c && isSameId(c.id, focusCategory.id))
            : categories;

        let realQ = 0;
        let realC = 0;
        let synthQ = 0;
        let synthC = 0;

        targetCats.forEach((cat) => {
            if (!cat) return;
            const cMax = hasValidNumber(cat.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
            const cMin = hasValidNumber(cat.minScore) ? Math.min(Number(cat.minScore), cMax) : minScore;
            const cRange = Math.max(1e-9, cMax - cMin);
            const rawHist = cat.simuladoStats?.history;
            const list = (Array.isArray(rawHist) ? rawHist : Object.values(rawHist || {})).filter(Boolean);
            list.forEach((h) => {
                if (!h || h.valid === false || h.validated === false) return;
                const dk = getDateKey(h.date || h.createdAt);
                const ms = dk ? toDateMs(dk) : NaN;
                if (!Number.isFinite(ms) || ms < prevStartMs || ms >= currStartMs) return;

                const isSynthEntry = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
                let tot = isSynthEntry ? 0 : Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                if (tot <= 0 && !isSynthEntry && h.topics != null) {
                    const tf = extractTopicsTotals(h, cMax, cMin);
                    if (tf.total > 0) {
                        realQ += tf.total;
                        realC += Math.max(0, Math.min(tf.total, tf.correct));
                        return;
                    }
                    if (tf.hasTopicsScore && Number.isFinite(tf.score)) {
                        const syn = getSyntheticTotal(cMax);
                        synthQ += syn;
                        synthC += Math.max(0, Math.min(1, (tf.score - cMin) / cRange)) * syn;
                        return;
                    }
                }
                const rawCorr = h.correct ?? h.acertos ?? h.correctCount;
                const hasExplicitC = !isSynthEntry && !h.isPercentage && hasValidNumber(rawCorr);
                const sc = getSafeScore(h, cMax, cMin);
                if (tot > 0) {
                    if (!hasExplicitC && !Number.isFinite(sc)) return;
                    const effC = resolveEffectiveCorrect(h, sc, tot, hasExplicitC, hasExplicitC ? Number(rawCorr) : 0, cMax, cMin);
                    realQ += tot;
                    realC += Math.max(0, Math.min(tot, effC));
                } else if (Number.isFinite(sc)) {
                    const syn = getSyntheticTotal(cMax);
                    synthQ += syn;
                    synthC += pointsToRatio(sc, cMax, cMin) * syn;
                }
            });
        });

        const combinedQ = realQ + synthQ;
        if (combinedQ <= 0) return null;
        return {
            questions: realQ,
            correct: realC,
            accuracy: ((realC + synthC) / combinedQ) * 100,
            days,
        };
    }, [timeWindow, categories, showOnlyFocus, focusCategory, maxScore, minScore, isSameId]);

    const { mcLoading, activeMcResult, activeMcProjectionSeries } = useEvolutionMC({
        focusCategory, categoryLevels, projectDays, targetScore, minScore, maxScore, activeEngine
    });

    const compareData = useMemo(() => {
        return buildPredictiveCompareData(
            timeline,
            focusCategory,
            categoryLevels,
            activeMcProjectionSeries,
            projectDays,
            focusMin,
            focusMax
        );
    }, [timeline, focusCategory, activeMcProjectionSeries, categoryLevels, projectDays, focusMin, focusMax]);

    const chartData = activeEngine === "compare" ? compareData : timeline;

    // 1. Calcular o resultado histórico sem downsampling
    const historicalData = useMemo(() => {
        const historical = Array.isArray(chartData) ? chartData.filter((d) => !d?.__future) : [];
        const future = Array.isArray(chartData) ? chartData.filter((d) => d?.__future) : [];
        let result = historical;
        if (timeWindow !== "all") {
            const days = Number.parseInt(timeWindow, 10);
            if (Number.isFinite(days) && days > 0 && historical.length > 0) {
                const getDateMs = (item) => {
                    if (!item?.date) return Number.NaN;
                    const ms = toDateMs(item.date);
                    return Number.isNaN(ms) ? Number.NaN : ms;
                };
                const todayKey = getDateKey(new Date());
                const todayNoon = todayKey ? parseNoonLocal(todayKey) : new Date();
                const cutoffDate = todayNoon ? addDaysNoon(todayNoon, -days) : null;
                const limit = cutoffDate ? toDateMs(getDateKey(cutoffDate)) : NaN;
                result = historical.filter((d) => {
                    const ms = getDateMs(d);
                    return Number.isFinite(ms) && ms >= limit;
                });
            }
        }
        return { result, future };
    }, [chartData, timeWindow]);

    // 2. Determinar a chave de downsampling (memoizada separadamente)
    const primaryKey = useMemo(() => {
        const candidates = [];

        if (activeEngine === "compare") {
            candidates.push("Nível Bayesiano");
        }

        if (focusCategory?.id != null) {
            if (activeEngine === "raw") {
                candidates.push(`raw_${focusCategory.id}`, `bay_${focusCategory.id}`, `stats_${focusCategory.id}`);
            } else if (activeEngine === "stats") {
                candidates.push(`stats_${focusCategory.id}`, `bay_${focusCategory.id}`, `raw_${focusCategory.id}`);
            } else {
                candidates.push(`bay_${focusCategory.id}`, `raw_${focusCategory.id}`, `stats_${focusCategory.id}`);
            }
        }

        const points = Array.isArray(historicalData.result) ? historicalData.result : [];
        const validKey = candidates.find(
            key => points.some(p => p && p[key] != null && Number.isFinite(Number(p[key])))
        );

        return validKey || "date";
    }, [activeEngine, focusCategory?.id, historicalData.result]);

    // 3. Downsampling memoizado separadamente
    const sampledHistorical = useMemo(() => {
        return downsampleLTTB(historicalData.result, 150, "date", primaryKey || "date");
    }, [historicalData.result, primaryKey]);

    // 4. Dados exclusivos do histórico (para Hero Chart, Status e Insights) vs Dados com Projeção (para CompareChart)
    const filteredHistoricalData = sampledHistorical;
    const filteredChartData = useMemo(() => {
        return (activeEngine === "compare" && sampledHistorical.length > 0 && historicalData.future.length > 0)
            ? [...sampledHistorical, ...historicalData.future]
            : sampledHistorical;
    }, [activeEngine, sampledHistorical, historicalData.future]);

    const effectiveMcHistoryData = useMemo(() => {
        const rawList = (Array.isArray(monteCarloHistoryArray) ? monteCarloHistoryArray : [])
            .filter((item) => item && (hasValidNumber(item.mean) || hasValidNumber(item.projectedMean)));
        const fId = focusCategory?.id;
        const hasFocusId = fId !== null && fId !== undefined && String(fId).trim() !== '';

        const applyWindow = (list) => {
            if (timeWindow === "all" || !list.length) return list;
            const days = Number.parseInt(timeWindow, 10);
            if (!Number.isFinite(days) || days <= 0) return list;
            const todayKey = getDateKey(new Date());
            const todayNoon = todayKey ? parseNoonLocal(todayKey) : new Date();
            const cutoffNoon = todayNoon ? addDaysNoon(todayNoon, -days) : null;
            const limit = cutoffNoon ? toDateMs(getDateKey(cutoffNoon)) : NaN;
            if (!Number.isFinite(limit)) return list;
            return list.filter((item) => {
                const ms = toDateMs(item?.date);
                return Number.isFinite(ms) && ms >= limit;
            });
        };

        const countUniqueDays = (list) => new Set(list.map((item) => getDateKey(item?.date)).filter(Boolean)).size;

        const focusList = hasFocusId
            ? applyWindow(
                rawList
                    .filter((item) => item?.categoryId != null && String(item.categoryId) === String(fId))
                    .map((item) => ({ ...item, __fromFocus: true }))
            )
            : [];
        const globalList = applyWindow(rawList.filter((item) => item?.categoryId == null || String(item.categoryId).trim() === ''));

        const focusDays = countUniqueDays(focusList);
        const globalDays = countUniqueDays(globalList);

        if (showOnlyFocus) {
            if (focusDays >= 2) return focusList;
        } else {
            if (globalDays >= 2) return globalList;
            if (focusDays >= 2) return focusList;
        }

        const fallbackList = showOnlyFocus
            ? focusList
            : (globalList.length > 0 ? globalList : focusList);

        // Synthesize trajectory from Bayesian timeline when monteCarloHistory has <= 1 distinct day
        const pts = Array.isArray(filteredHistoricalData) ? filteredHistoricalData : [];
        if (pts.length === 0) {
            return (!showOnlyFocus && globalDays >= 2) ? globalList : fallbackList;
        }
        const useFocusDomain = Boolean(showOnlyFocus && hasFocusId);
        const effMin = useFocusDomain ? focusMin : minScore;
        const effMax = useFocusDomain ? focusMax : maxScore;
        const effTarget = useFocusDomain ? focusTarget : targetScore;
        const safeMin = hasValidNumber(effMin) ? Number(effMin) : 0;
        const safeMax = hasValidNumber(effMax) && Number(effMax) > safeMin ? Number(effMax) : safeMin + 100;
        const safeRange = Math.max(1, safeMax - safeMin);
        const safeTarget = hasValidNumber(effTarget) ? Number(effTarget) : safeMin + safeRange * 0.8;

        const readMean = (pt) => (useFocusDomain
            ? (pt[`bay_${fId}`] ?? pt[`stats_${fId}`] ?? pt[`raw_${fId}`])
            : (pt.global_bayesian ?? pt.global_ema ?? pt.global_raw ?? (hasFocusId ? (pt[`bay_${fId}`] ?? pt[`stats_${fId}`] ?? pt[`raw_${fId}`]) : null)));

        const hasFocusActivity = (pt) => hasValidNumber(pt[`raw_${fId}`]);
        const activeFocusPts = useFocusDomain ? pts.filter((pt) => hasFocusActivity(pt) && hasValidNumber(readMean(pt))) : [];
        const validPts = useFocusDomain
            ? (activeFocusPts.length > 0 ? activeFocusPts : pts.filter((pt) => hasValidNumber(readMean(pt))))
            : pts.filter((pt) => hasValidNumber(readMean(pt)));

        const synth = validPts
            .map((pt, idx) => {
                const meanVal = readMean(pt);
                const m = Number(meanVal);
                const isLast = idx === validPts.length - 1;
                const mcLow = useFocusDomain && isLast && hasValidNumber(activeMcResult?.ci95Low) ? Number(activeMcResult.ci95Low) : null;
                const mcHigh = useFocusDomain && isLast && hasValidNumber(activeMcResult?.ci95High) ? Number(activeMcResult.ci95High) : null;
                const low = mcLow != null
                    ? mcLow
                    : (useFocusDomain && hasValidNumber(pt[`bay_ci_low_${fId}`]) ? Number(pt[`bay_ci_low_${fId}`]) : Math.max(safeMin, m - safeRange * 0.06));
                const high = mcHigh != null
                    ? mcHigh
                    : (useFocusDomain && hasValidNumber(pt[`bay_ci_high_${fId}`]) ? Number(pt[`bay_ci_high_${fId}`]) : Math.min(safeMax, m + safeRange * 0.06));
                const proj = useFocusDomain && isLast && hasValidNumber(activeMcResult?.projectedMean)
                    ? Number(activeMcResult.projectedMean)
                    : m;
                const sigma = Math.max(safeRange * 0.02, (high - low) / 3.92);
                const z = (proj - safeTarget) / sigma;
                const approxProb = 100 / (1 + Math.exp(-1.702 * z));
                const prob = useFocusDomain && isLast && hasValidNumber(activeMcResult?.probability)
                    ? Number(activeMcResult.probability)
                    : approxProb;
                return {
                    date: pt.date,
                    mean: m,
                    projectedMean: proj,
                    ci95Low: low,
                    ci95High: high,
                    probability: prob,
                    target: safeTarget,
                    __fromFocus: useFocusDomain
                };
            })
            .filter(Boolean);

        if (synth.length >= 2) return synth;
        if (!showOnlyFocus && globalDays >= 2) return globalList;
        if (fallbackList.length > 0) return fallbackList;
        return synth;
    }, [monteCarloHistoryArray, timeWindow, filteredHistoricalData, focusCategory?.id, showOnlyFocus, minScore, maxScore, targetScore, focusMin, focusMax, focusTarget, activeMcResult]);

    const latestMetricsByCat = useMemo(() => {
        const map = {};
        if (!Array.isArray(timeline) || timeline.length === 0) return map;
        activeCategories.forEach(cat => {
            const id = cat.id;
            let raw = null, stats = null, bay = null;
            for (let i = timeline.length - 1; i >= 0; i--) {
                const pt = timeline[i];
                if (raw == null && pt[`raw_${id}`] != null) raw = pt[`raw_${id}`];
                if (stats == null && pt[`stats_${id}`] != null) stats = pt[`stats_${id}`];
                if (bay == null && pt[`bay_${id}`] != null) bay = pt[`bay_${id}`];
                if (raw != null && stats != null && bay != null) break;
            }
            map[id] = { [`raw_${id}`]: raw, [`stats_${id}`]: stats, [`bay_${id}`]: bay };
        });
        return map;
    }, [timeline, activeCategories]);

    const sparklineByCat = useMemo(() => {
        const map = {};
        const source = Array.isArray(historicalData.result) ? historicalData.result : [];
        if (source.length < 2) return map;
        activeCategories.forEach((cat) => {
            const id = cat.id;
            const activeBay = [];
            const activeRaw = [];
            let lastActiveIdx = -1;
            for (let i = 0; i < source.length; i++) {
                const pt = source[i];
                if (hasValidNumber(pt?.[`raw_${id}`])) {
                    lastActiveIdx = i;
                    activeRaw.push(Number(pt[`raw_${id}`]));
                    if (hasValidNumber(pt?.[`bay_${id}`])) {
                        activeBay.push(Number(pt[`bay_${id}`]));
                    }
                }
            }
            const lastPt = source[source.length - 1];
            if (activeBay.length >= 2) {
                if (lastActiveIdx >= 0 && lastActiveIdx < source.length - 1 && hasValidNumber(lastPt?.[`bay_${id}`])) {
                    activeBay.push(Number(lastPt[`bay_${id}`]));
                }
                map[id] = activeBay.slice(-10);
            } else if (activeRaw.length >= 2) {
                map[id] = activeRaw.slice(-10);
            }
        });
        return map;
    }, [historicalData.result, activeCategories]);

    const radarData = useMemo(() => {
        const baseCats = Array.isArray(activeCategories) ? activeCategories : [];
        const sourceCats = (showOnlyFocus && focusCategory?.id != null)
            ? baseCats.filter(c => isSameId(c?.id, focusCategory.id))
            : baseCats;
        if (!sourceCats || !sourceCats.length) return [];
        const globalMin = hasValidNumber(minScore) ? Number(minScore) : 0;
        const globalMax = hasValidNumber(maxScore) && Number(maxScore) > globalMin ? Number(maxScore) : Math.max(100, globalMin + 100);
        const aggById = new Map((subjectAggData || []).map(item => [item.id, item]));
        if (timeWindow !== 'all' && aggById.size === 0) return [];

        const eligibleCats = timeWindow !== 'all'
            ? sourceCats.filter(cat => aggById.has(cat.id))
            : sourceCats;

        return eligibleCats.map(cat => {
            const catMax = hasValidNumber(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : globalMax;
            const catMin = hasValidNumber(cat?.minScore) ? Math.min(Number(cat.minScore), catMax) : globalMin;
            let val;
            if (timeWindow !== 'all') {
                const aggItem = aggById.get(cat.id);
                const realQ = Number(aggItem?.realQuestoes) || 0;
                const realC = Number(aggItem?.realAcertosExact ?? aggItem?.realAcertos) || 0;
                const synthQ = Number(aggItem?.syntheticQuestoes) || 0;
                const synthC = Number(aggItem?.syntheticAcertosExact ?? aggItem?.syntheticAcertos) || 0;
                const totQ = realQ + synthQ;
                const ratio = totQ > 0 ? Math.max(0, Math.min(1, (realC + synthC) / totQ)) : 0;
                val = Number(Math.max(globalMin, Math.min(globalMax, ratioToPoints(ratio, globalMax, globalMin))).toFixed(2));
            } else {
                const lvl = categoryLevels?.[cat.id];
                const hasLvl = hasValidNumber(lvl);
                // Normaliza da escala da categoria para a escala global do eixo do Radar
                const rawVal = hasLvl ? Math.max(catMin, Math.min(catMax, Number(lvl))) : catMin;
                const normalizedVal = (catMax !== globalMax || catMin !== globalMin)
                    ? ratioToPoints(pointsToRatio(rawVal, catMax, catMin), globalMax, globalMin)
                    : rawVal;
                val = Number(Math.max(globalMin, Math.min(globalMax, normalizedVal)).toFixed(2));
            }
            const fullName = String(cat.name || 'Sem nome');
            const rawMeta = hasValidNumber(cat?.minCutoff) && Number(cat.minCutoff) > catMin
                ? ratioToPoints(pointsToRatio(Number(cat.minCutoff), catMax, catMin), globalMax, globalMin)
                : (hasValidNumber(targetScore) ? Number(targetScore) : globalMin + (globalMax - globalMin) * 0.8);
            const meta = Number(Math.max(globalMin, Math.min(globalMax, rawMeta)).toFixed(2));
            return {
                subject: fullName.replace(/Direito /gi, 'D. '),
                fullSubject: fullName,
                nivel: val,
                meta
            };
        });
    }, [activeCategories, showOnlyFocus, focusCategory?.id, timeWindow, subjectAggData, targetScore, categoryLevels, minScore, maxScore, isSameId]);

const focusHistoricalCutoffs = useMemo(() => {
    if (!Array.isArray(historicalCutoffs) || historicalCutoffs.length === 0) return EMPTY_ARRAY;
    if (!focusCategory || (focusMax === maxScore && focusMin === minScore)) return historicalCutoffs;
    return historicalCutoffs
        .map((v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return null;
            return Number(ratioToPoints(pointsToRatio(n, maxScore, minScore), focusMax, focusMin).toFixed(2));
        })
        .filter((v) => v !== null);
}, [historicalCutoffs, focusCategory, focusMax, focusMin, maxScore, minScore]);

const insightUnit = useMemo(() => {
    if (activeEngine === 'mc_density') {
        return effectiveMcHistoryData?.[0]?.__fromFocus ? resolvedFocusUnit : resolvedGlobalUnit;
    }
    if (['raw', 'bayesian', 'stats', 'compare'].includes(activeEngine)) {
        return focusCategory ? resolvedFocusUnit : resolvedGlobalUnit;
    }
    if (['tornado_whatif', 'correlation_regimes'].includes(activeEngine)) {
        return resolvedGlobalUnit;
    }
    return resolvedActiveUnit;
}, [activeEngine, effectiveMcHistoryData, focusCategory, resolvedFocusUnit, resolvedGlobalUnit, resolvedActiveUnit]);

const insight = useMemo(() => {
    return generateEvolutionInsights({
        timeline,
        filteredChartData: filteredHistoricalData,
        focusCategory,
        activeEngine,
        categories,
        simuladoRows: simuladoRowsArray,
        studyLogs: studyLogsArray,
        mcHistoryData: effectiveMcHistoryData,
        unit: insightUnit,
        maxScore,
        minScore,
        targetScore,
        projectDays,
        examDurationMinutes,
        examTotalQuestions,
        examBoard,
        penaltyPerWrong,
        timeWindow,
        showOnlyFocus,
        mcWeights,
        activeMcResult
    });
}, [
    timeline,
    filteredHistoricalData,
    focusCategory,
    activeEngine,
    categories,
    simuladoRowsArray,
    studyLogsArray,
    effectiveMcHistoryData,
    insightUnit,
    maxScore,
    minScore,
    targetScore,
    projectDays,
    examDurationMinutes,
    examTotalQuestions,
    examBoard,
    penaltyPerWrong,
    timeWindow,
    showOnlyFocus,
    mcWeights,
    activeMcResult
]);

const statusList = useMemo(() => {
    return computeEvolutionStatuses({
        timeline,
        filteredChartData: filteredHistoricalData,
        categories,
        focusCategory,
        targetScore,
        unit: resolvedActiveUnit,
        focusUnit: resolvedFocusUnit,
        minScore,
        maxScore,
        activeMcResult,
        subjectAggData,
        heatmapData,
        projectDays,
        hasGoalDate: hasValidGoalDate,
        daysToExam: rawDaysToExam,
        examDurationMinutes,
        examTotalQuestions,
        timeWindow,
        showOnlyFocus
    });
}, [
    timeline,
    filteredHistoricalData,
    categories,
    focusCategory,
    targetScore,
    resolvedActiveUnit,
    resolvedFocusUnit,
    minScore,
    maxScore,
    activeMcResult,
    subjectAggData,
    heatmapData,
    projectDays,
    hasValidGoalDate,
    rawDaysToExam,
    examDurationMinutes,
    examTotalQuestions,
    timeWindow,
    showOnlyFocus
]);

const selectedStatus = useMemo(() => {
    if (!selectedStatusId || !Array.isArray(statusList) || statusList.length === 0) return null;
    return statusList.find((s) => s.id === selectedStatusId) || null;
}, [statusList, selectedStatusId]);

const engine = ENGINES_WITH_GUIDE.find((e) => e.id === activeEngine) || ENGINES_WITH_GUIDE[0];
const ActiveEngineIcon = ENGINE_ICONS[engine.id] || BarChart3;

const activeTargetDisplay = showOnlyFocus ? focusTarget : targetScore;
const activeScaleMin = showOnlyFocus ? focusMin : minScore;
const activeScaleMax = showOnlyFocus ? focusMax : maxScore;
const targetPctOfScale = useMemo(() => {
    const range = Math.max(1e-9, activeScaleMax - activeScaleMin);
    return Math.max(0, Math.min(100, ((activeTargetDisplay - activeScaleMin) / range) * 100));
}, [activeTargetDisplay, activeScaleMin, activeScaleMax]);

const accountHasData = timeline.length >= 1;
const filterHasData = useMemo(() => {
    if (filteredHistoricalData.length < 1) return false;
    if (!showOnlyFocus || focusCategory?.id == null) return true;
    const fId = focusCategory.id;
    if (timeWindow !== 'all') {
        const hasRawInWindow = filteredHistoricalData.some((pt) => hasValidNumber(pt?.[`raw_${fId}`]));
        if (hasRawInWindow) return true;
        return (subjectAggData || []).some(
            (item) => isSameId(item?.id, fId) && ((Number(item.realQuestoes) || 0) + (Number(item.syntheticQuestoes) || 0)) > 0
        );
    }
    return filteredHistoricalData.some(
        (pt) => hasValidNumber(pt?.[`raw_${fId}`]) || hasValidNumber(pt?.[`bay_${fId}`]) || hasValidNumber(pt?.[`stats_${fId}`])
    );
}, [filteredHistoricalData, showOnlyFocus, focusCategory?.id, timeWindow, subjectAggData, isSameId]);

const accuracyDeltaVsTarget = useMemo(() => {
    if (!Number.isFinite(safeGlobalMetrics.globalAccuracy)) return null;
    if (!filterHasData && safeGlobalMetrics.totalQuestions === 0 && safeGlobalMetrics.globalAccuracy === 0) {
        return null;
    }
    return Number((safeGlobalMetrics.globalAccuracy - targetPctOfScale).toFixed(1));
}, [safeGlobalMetrics.globalAccuracy, safeGlobalMetrics.totalQuestions, targetPctOfScale, filterHasData]);

const formatCleanCount = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return '0';
    const rounded1 = Number(n.toFixed(1));
    return Number.isInteger(rounded1) ? Math.round(rounded1).toLocaleString() : rounded1.toLocaleString();
};

const hasCustomFocusCutoff = Boolean(
    showOnlyFocus &&
    focusCategory &&
    hasValidNumber(focusCategory?.minCutoff) &&
    Number(focusCategory.minCutoff) > focusMin
);

const carouselMaskStyle = useMemo(() => {
    if (isExporting) return undefined;
    if (canScrollLeft && canScrollRight) {
        return {
            maskImage: 'linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)',
        };
    }
    if (canScrollLeft) {
        return {
            maskImage: 'linear-gradient(to right, transparent, black 28px, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 28px, black 100%)',
        };
    }
    if (canScrollRight) {
        return {
            maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent)',
        };
    }
    return undefined;
}, [canScrollLeft, canScrollRight, isExporting]);

const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(false);

    try {
        const ok = await exportComponentAsPDF('evolution-chart-container', 'RaioX_Evolucao_Dashboard.pdf', 'landscape');
        if (!ok) {
            throw new Error('Falha ao exportar PDF');
        }
    } catch (err) {
        console.error('[EvolutionChart] Falha ao exportar PDF:', err);
        if (!isMountedRef.current) return;
        setExportError(true);
        if (exportErrorTimerRef.current) clearTimeout(exportErrorTimerRef.current);
        exportErrorTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setExportError(false);
        }, 4000);
    } finally {
        if (isMountedRef.current) setIsExporting(false);
    }
};

const isMcEngine = activeEngine === "compare" || activeEngine === "mc_density";

if (categories.length === 0) {
    return (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/70 backdrop-blur-xl p-10 sm:p-12 text-center animate-fade-in-down shadow-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-indigo-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300">
                <BarChart3 size={26} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mb-2">Gráficos de Evolução</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">Cadastre simulados para desbloquear sua máquina do tempo estatística.</p>
            <button
                type="button"
                onClick={() => {
                    navigate('/simulados');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                Ir para simulados
            </button>
        </div>
    );
}



return (
    <motion.div id="evolution-chart-container" className="space-y-5 relative min-w-0" variants={containerVariants} initial="hidden" animate="visible">
        {/* Barra superior fixa no topo da página (não acompanha o scroll) */}
        <div className="relative z-20 flex flex-col xl:flex-row xl:items-center justify-between gap-3 rounded-2xl border border-white/[0.09] bg-slate-900/80 backdrop-blur-2xl px-4 py-3 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.75)] no-print">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-indigo-500/20 border border-pink-400/35 text-pink-300 shrink-0 shadow-inner">
                    <TrendingUp size={18} />
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                            Evolução
                        </h1>
                        <div className="hidden sm:block">
                            <AdaptiveMaturityBadge compact />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {showOnlyFocus && focusCategory ? `Foco: ${focusCategory.name}` : `${activeCategories.length} disciplinas ativas`}
                        {' · '}
                        {timeWindow === 'all' ? 'Histórico completo' : `Últimos ${timeWindow} dias`}
                    </p>
                </div>
            </div>

            {/* Controles globais uniformes + seletor rápido de foco */}
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                {(activeCategories.length > 0 || categories.length > 0) && (
                    <div className="relative inline-flex items-center h-[36px] rounded-xl bg-slate-950/75 border border-white/[0.09] hover:border-white/20 transition-colors max-w-[210px] shrink-0">
                        <Target size={13} className="text-pink-400 absolute left-2.5 pointer-events-none" />
                        <select
                            aria-label="Selecionar disciplina em foco"
                            value={focusCategory?.id != null ? String(focusCategory.id) : ''}
                            onChange={(e) => handleSelectFocusValue(e.target.value)}
                            className="appearance-none bg-transparent border-0 text-xs font-bold text-slate-200 pl-7 pr-7 h-full w-full truncate cursor-pointer focus:outline-none focus:ring-0"
                            style={{ backgroundColor: 'transparent', border: 'none' }}
                        >
                            {(activeCategories.length > 0 ? activeCategories : categories).map((c) => (
                                <option key={c.id} value={String(c.id)} className="bg-slate-900 text-slate-200">
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>
                )}

                <div className="inline-flex items-center gap-1 bg-slate-950/80 border border-white/[0.08] rounded-xl p-1 shrink-0 overflow-x-auto shadow-inner">
                    {[{ label: '30d', value: '30' }, { label: '60d', value: '60' }, { label: '90d', value: '90' }, { label: 'Tudo', value: 'all' }].map(w => (
                        <button
                            type="button"
                            key={w.value}
                            onClick={() => setTimeWindow(w.value)}
                            aria-pressed={timeWindow === w.value}
                            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold border transition-all duration-200 ${timeWindow === w.value
                                    ? 'bg-indigo-500/25 text-indigo-100 border-indigo-400/45 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
                                }`}
                        >
                            {w.label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setShowOnlyFocus(!showOnlyFocus)}
                    aria-pressed={showOnlyFocus}
                    aria-label={showOnlyFocus ? 'Alternar para ver todas as matérias' : 'Alternar para ver apenas matéria em foco'}
                    className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 h-[36px] rounded-xl text-xs font-bold border transition-all active:scale-[0.985] ${showOnlyFocus
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-sm'
                            : 'bg-slate-950/75 border-white/[0.09] text-slate-300 hover:text-white hover:border-white/20'
                        }`}
                >
                    {showOnlyFocus ? <Target size={14} /> : <Layers size={14} />}
                    <span>{showOnlyFocus ? 'Apenas Foco' : 'Ver todas'}</span>
                </button>

                <div className="flex flex-col items-end">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex items-center justify-center gap-1.5 px-3 h-[36px] rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 text-indigo-200 text-xs font-bold transition-all border border-indigo-400/35 disabled:opacity-50 active:scale-[0.985]"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        <span>{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
                    </button>
                    {exportError && (
                        <span className="text-[11px] text-rose-400 font-bold mt-1">
                            Falha ao gerar PDF. Tente novamente.
                        </span>
                    )}
                </div>
            </div>
        </div>

        <style>{`
        /* FIX: Preserva o focus-visible para feedback de acessibilidade por teclado */
        .recharts-wrapper:focus-visible, .recharts-surface:focus-visible { outline: 2px solid #818cf8 !important; outline-offset: 2px; border-radius: 8px; }
        .recharts-wrapper:focus:not(:focus-visible), .recharts-surface:focus:not(:focus-visible) { outline: none !important; border: none !important; box-shadow: none !important; }
        .recharts-cartesian-axis-tick-value { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; }
        .recharts-legend-item-text { font-size: 11px !important; font-weight: 600; }
            `}</style>

        {/* Grid limpo de 4 KPIs globais (com comparativo automático vs período anterior quando janela temporal está ativa) */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
            {(() => {
                const hasPrevQ = Boolean(previousPeriodMetrics && previousPeriodMetrics.questions > 0);
                const qDiff = hasPrevQ ? safeGlobalMetrics.totalQuestions - previousPeriodMetrics.questions : null;
                const cDiff = hasPrevQ ? Math.round((safeGlobalMetrics.totalCorrect - previousPeriodMetrics.correct) * 10) / 10 : null;
                const hasPrevAcc = Boolean(
                    previousPeriodMetrics &&
                    Number.isFinite(previousPeriodMetrics.accuracy) &&
                    (filterHasData || safeGlobalMetrics.totalQuestions > 0 || safeGlobalMetrics.globalAccuracy > 0)
                );
                const accDiffPrev = hasPrevAcc ? Number((safeGlobalMetrics.globalAccuracy - previousPeriodMetrics.accuracy).toFixed(1)) : null;

                return (
                    <>
                        <KpiCard
                            value={safeGlobalMetrics.totalQuestions.toLocaleString()}
                            label="Questões"
                            color="#818cf8"
                            icon={<BookOpen size={15} />}
                            hint={qDiff != null
                                ? `${qDiff >= 0 ? '+' : ''}${qDiff.toLocaleString()} vs ${previousPeriodMetrics.days}d ant.`
                                : (timeWindow === 'all' ? 'Histórico completo' : `Últimos ${timeWindow} dias`)}
                            title="Total de questões reais resolvidas no filtro ativo."
                        />
                        <KpiCard
                            value={formatCleanCount(safeGlobalMetrics.totalCorrect)}
                            label="Acertos"
                            color="#34d399"
                            icon={<CheckCircle2 size={15} />}
                            hint={cDiff != null
                                ? `${formatCleanCount(Math.max(0, safeGlobalMetrics.totalQuestions - safeGlobalMetrics.totalCorrect))} erros · ${cDiff >= 0 ? '+' : '−'}${formatCleanCount(Math.abs(cDiff))} vs ant.`
                                : (safeGlobalMetrics.totalQuestions > 0
                                    ? `${formatCleanCount(Math.max(0, safeGlobalMetrics.totalQuestions - safeGlobalMetrics.totalCorrect))} erros no período`
                                    : (safeGlobalMetrics.globalAccuracy > 0 ? 'Simulados em % (sem volume)' : 'Respostas corretas'))}
                            title="Quantidade de questões acertadas dentro do período e filtro ativos."
                        />
                        <KpiCard
                            value={`${safeGlobalMetrics.globalAccuracy.toFixed(1)}%`}
                            label="Precisão Global"
                            color="#fb923c"
                            icon={<Crosshair size={15} />}
                            hint={accDiffPrev != null
                                ? `${accDiffPrev >= 0 ? '+' : ''}${accDiffPrev}pp vs ${previousPeriodMetrics.days}d ant.`
                                : (showOnlyFocus && focusCategory
                                    ? `Foco: ${focusCategory.name}`
                                    : (safeGlobalMetrics.totalQuestions === 0 && safeGlobalMetrics.globalAccuracy > 0 ? 'Baseada em notas em %' : 'Taxa consolidada'))}
                            progress={safeGlobalMetrics.globalAccuracy}
                            statusText={accuracyDeltaVsTarget != null ? (accuracyDeltaVsTarget >= 0 ? `+${accuracyDeltaVsTarget}pp meta` : `${accuracyDeltaVsTarget}pp meta`) : undefined}
                            title="Percentual consolidado de acertos (acertos / questões) no filtro ativo."
                        />
                        <KpiCard
                            value={`${formatValue(activeTargetDisplay)}${resolvedActiveUnit}`}
                            label="Meta da Prova"
                            color="#f472b6"
                            icon={<Target size={15} />}
                            hint={goalDate ? `${projectDays} ${projectDays === 1 ? 'dia restante' : 'dias restantes'}` : `${activeCategories.length} ${activeCategories.length === 1 ? 'disciplina ativa' : 'disciplinas ativas'}`}
                            statusText={showOnlyFocus && focusCategory ? (hasCustomFocusCutoff ? 'Corte foco' : 'Meta foco') : 'Objetivo global'}
                            title="Meta de pontuação configurada para o concurso ou disciplina em foco."
                        />
                    </>
                );
            })()}
        </motion.div>

        {/* Status inteligente — painel enxuto sem redundância com os KPIs */}
        <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-xl px-4 py-3.5 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.65)] space-y-3"
        >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                        Status inteligente do desempenho
                    </h2>
                    <span className="hidden sm:inline text-xs text-slate-400">
                        · Clique em qualquer indicador para abrir o diagnóstico
                    </span>
                </div>

                <div className="inline-flex items-center gap-1 bg-slate-950/80 border border-white/[0.08] rounded-xl p-1 shrink-0 shadow-inner" role="group" aria-label="Modo de exibição dos status">
                    <button
                        type="button"
                        onClick={() => setStatusViewMode('compact')}
                        aria-pressed={statusViewMode === 'compact'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${statusViewMode === 'compact'
                                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40 shadow-sm'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                            }`}
                    >
                        <List size={12} />
                        <span>Compacto</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusViewMode('guide')}
                        aria-pressed={statusViewMode === 'guide'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${statusViewMode === 'guide'
                                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40 shadow-sm'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                            }`}
                    >
                        <LayoutGrid size={12} />
                        <span>Guia de leitura</span>
                    </button>
                </div>
            </div>

            {statusViewMode === 'guide' ? (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 rounded-xl bg-slate-950/50 border border-white/[0.06] text-[11px] text-slate-400">
                        <span className="font-bold uppercase tracking-wider text-slate-300">Cores:</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /><strong className="text-emerald-300">Verde</strong> = Ideal / na meta</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /><strong className="text-amber-300">Amarelo</strong> = Atenção / ajuste</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /><strong className="text-rose-300">Vermelho</strong> = Risco / prioridade</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" /><strong className="text-sky-300">Azul/Roxo</strong> = Tendência / referência</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="status" aria-live="polite">
                        {statusList.map((status) => (
                            <StatusPill
                                key={status.id}
                                variant="card"
                                label={status.label}
                                value={status.value}
                                tone={status.tone}
                                icon={status.icon}
                                help={status.help}
                                statusText={status.statusText}
                                scopeLabel={status.scopeLabel}
                                howToRead={status.howToRead}
                                scaleGuide={status.scaleGuide}
                                actionHint={status.actionHint}
                                isSelected={selectedStatusId === status.id}
                                onClick={() => setSelectedStatusId((prev) => (prev === status.id ? null : status.id))}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-2.5" role="status" aria-live="polite">
                    <div className="flex flex-wrap gap-2">
                        {statusList.map((status) => (
                            <StatusPill
                                key={status.id}
                                variant="pill"
                                label={status.label}
                                value={status.value}
                                tone={status.tone}
                                icon={status.icon}
                                help={status.help}
                                statusText={status.statusText}
                                howToRead={status.howToRead}
                                scaleGuide={status.scaleGuide}
                                isSelected={selectedStatus?.id === status.id}
                                onClick={() => setSelectedStatusId((prev) => (prev === status.id ? null : status.id))}
                            />
                        ))}
                    </div>

                    {selectedStatus && (
                        <div className="rounded-xl border border-indigo-400/25 bg-slate-950/65 p-3.5 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                                        Como ler: {selectedStatus.label}
                                    </span>
                                    {selectedStatus.scopeLabel && (
                                        <span className="text-[11px] font-semibold text-slate-300 bg-white/[0.06] px-2 py-0.5 rounded-full">
                                            {selectedStatus.scopeLabel}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedStatus.statusText && (
                                        <span className="text-[11px] font-bold text-indigo-200 bg-indigo-500/15 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
                                            {selectedStatus.statusText}
                                        </span>
                                    )}
                                    <span className="text-sm font-black font-mono tabular-nums text-white">
                                        {selectedStatus.value}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">
                                {selectedStatus.howToRead || selectedStatus.help}
                            </p>
                            {selectedStatus.scaleGuide && (
                                <p className="text-[11px] text-slate-400 bg-slate-900/70 border border-white/[0.06] rounded-lg px-3 py-1.5">
                                    {selectedStatus.scaleGuide}
                                </p>
                            )}
                            {selectedStatus.actionHint && (
                                <p className="text-xs text-indigo-200 bg-indigo-500/10 border border-indigo-400/25 rounded-lg px-3 py-2 flex items-start gap-2">
                                    <Compass size={14} className="text-indigo-300 shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>
                                        <strong className="text-indigo-300">O que fazer: </strong>
                                        {selectedStatus.actionHint}
                                    </span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </motion.div>

        {/* Carrossel de Disciplinas — mask-image real (sem faixas escuras artificiais) + sparkline */}
        <motion.div variants={itemVariants} className="relative z-0">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-200 uppercase font-black tracking-wider">
                        Nível por disciplina
                    </p>
                    <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                        · {activeCategories.length} {activeCategories.length === 1 ? 'matéria' : 'matérias'} · clique para focar
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => scrollCarousel('left')}
                        disabled={!canScrollLeft}
                        aria-label="Rolar disciplinas para a esquerda"
                        className="w-7 h-7 rounded-xl border border-white/[0.09] bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-25 disabled:pointer-events-none"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollCarousel('right')}
                        disabled={!canScrollRight}
                        aria-label="Rolar disciplinas para a direita"
                        className="w-7 h-7 rounded-xl border border-white/[0.09] bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-25 disabled:pointer-events-none"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            </div>

            <div
                ref={carouselRef}
                onWheel={handleCarouselWheel}
                onMouseDown={handleCarouselMouseDown}
                onMouseMove={handleCarouselMouseMove}
                onMouseUp={handleCarouselMouseUpOrLeave}
                onMouseLeave={handleCarouselMouseUpOrLeave}
                style={carouselMaskStyle}
                className="pdf-no-mask flex overflow-x-auto snap-x gap-3 px-0.5 py-2 no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing select-none"
            >
                {activeCategories.map(cat => {
                    const cardCatMax = hasValidNumber(cat?.maxScore) && Number(cat.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
                    const cardCatMin = hasValidNumber(cat?.minScore) ? Math.min(Number(cat.minScore), cardCatMax) : minScore;
                    const cardUnit = resolveUnitForScale(unit, cardCatMin, cardCatMax);
                    return (
                        <div key={cat.id} className={`snap-start shrink-0 w-[224px] sm:w-[244px] flex flex-col transition-all duration-200 ${showOnlyFocus && focusCategory?.id !== cat.id ? 'opacity-65 hover:opacity-100 scale-[0.985]' : 'opacity-100 scale-100'}`}>
                            <DisciplinaCard
                                cat={cat}
                                level={categoryLevels[cat.id]}
                                metrics={latestMetricsByCat[cat.id] || null}
                                sparkline={sparklineByCat[cat.id] || null}
                                target={targetScore}
                                isFocused={focusCategory?.id === cat.id}
                                onSelectCategory={handleSelectCategory}
                                unit={cardUnit}
                                maxScore={maxScore}
                                minScore={minScore}
                            />
                        </div>
                    );
                })}
            </div>
        </motion.div>

        {/* HERO CHART: Nível Bayesiano (Fixo) */}
        <motion.div variants={itemVariants} className="relative z-20 rounded-2xl border border-emerald-500/20 bg-slate-900/70 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_12px_36px_-18px_rgba(52,211,153,0.22)] w-full overflow-visible">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-white/[0.07]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shrink-0">
                        <Brain size={18} />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">Evolução do domínio real</h3>
                        <p className="text-[11px] text-emerald-400/85 font-semibold tracking-wide mt-0.5">
                            Histórico bayesiano e intervalo de confiança (95%)
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-400 mr-1">
                        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-emerald-400 inline-block" />Domínio real</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-emerald-400/25 border border-emerald-400/40 inline-block" />IC 95%</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />Meta</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setHeroExpanded((prev) => !prev)}
                        aria-pressed={heroExpanded}
                        title={heroExpanded ? 'Altura padrão do gráfico' : 'Expandir altura do gráfico'}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/[0.09] bg-slate-950/60 hover:bg-slate-800/80 text-slate-300 hover:text-white text-[11px] font-bold transition-all"
                    >
                        {heroExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        <span className="hidden sm:inline">{heroExpanded ? 'Compactar' : 'Expandir'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowHeroGuide((prev) => !prev)}
                        aria-expanded={showHeroGuide}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${showHeroGuide
                                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                                : 'bg-slate-950/60 border-white/[0.09] text-slate-300 hover:border-emerald-400/35 hover:text-emerald-200'
                            }`}
                    >
                        <BookOpen size={13} />
                        <span>{showHeroGuide ? 'Ocultar guia' : 'Como ler este gráfico'}</span>
                    </button>
                </div>
            </div>

            {showHeroGuide && BAYESIAN_ENGINE?.guide && (
                <div className="mb-4">
                    <ChartGuide guide={BAYESIAN_ENGINE.guide} />
                </div>
            )}

            <div className="w-full no-scrollbar pb-1" style={{ overflowX: 'auto', overflowY: 'visible' }}>
                <div className="min-w-[540px] lg:min-w-full relative">
                    {!accountHasData ? (
                        <div className="min-h-[320px] flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-center text-slate-400">
                                <TrendingUp size={22} />
                            </div>
                            <p className="text-slate-300 text-sm font-medium">Cadastre simulados para ver sua curva de domínio</p>
                        </div>
                    ) : !filterHasData ? (
                        <div className="min-h-[320px] flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-center text-slate-400">
                                <Calendar size={22} />
                            </div>
                            <p className="text-slate-300 text-sm font-medium">Nenhuma atividade no período selecionado</p>
                        </div>
                    ) : (
                        <EvolutionLineChart
                            filteredChartData={filteredHistoricalData}
                            activeCategories={activeCategories}
                            engine={BAYESIAN_ENGINE}
                            targetScore={showOnlyFocus ? focusTarget : targetScore}
                            focusSubjectId={focusSubjectId}
                            showOnlyFocus={showOnlyFocus}
                            minScore={showOnlyFocus ? focusMin : minScore}
                            maxScore={showOnlyFocus ? focusMax : maxScore}
                            unit={resolvedActiveUnit}
                            expanded={heroExpanded}
                        />
                    )}
                </div>
            </div>
        </motion.div>

        {/* TABS E GRÁFICOS SECUNDÁRIOS — navegação lateral no desktop (xl:) + scroll com setas no mobile */}
        <motion.div variants={itemVariants} className="relative z-10">
            <div
                className="relative z-10 rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-2xl p-4 sm:p-5 w-full min-w-0 transition-all duration-300 overflow-visible"
                style={{ boxShadow: `0 12px 40px -20px ${engine.color}38, inset 0 1px 0 0 rgba(255,255,255,0.04)` }}
            >
                {/* Topo: título + filtros de categoria unificados */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-white/[0.07]">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 shrink-0">
                            <Microscope size={16} />
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">Análises Secundárias</h3>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 border border-white/[0.06] px-2 py-0.5 rounded-lg tabular-nums">
                            {visibleSecondaryEngines.length} módulos
                        </span>
                    </div>

                    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] shadow-inner" role="group" aria-label="Filtrar análises por categoria">
                        {ENGINE_GROUPS.map((group) => {
                            const isActiveGroup = engineGroup === group.id;
                            const count = group.ids ? group.ids.length : SECONDARY_ENGINES.length;
                            return (
                                <button
                                    key={group.id}
                                    type="button"
                                    aria-pressed={isActiveGroup}
                                    onClick={() => {
                                        setEngineGroup(group.id);
                                        if (group.ids && !group.ids.includes(activeEngine)) {
                                            setActiveEngine(group.ids[0]);
                                        }
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${isActiveGroup
                                            ? 'bg-indigo-500/20 border-indigo-400/45 text-indigo-200 shadow-sm'
                                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <span>{group.label}</span>
                                    <span className="font-mono text-[10px] opacity-75 tabular-nums">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Layout responsivo: rail vertical à esquerda no desktop (xl:) + faixa horizontal com setas no mobile/tablet */}
                <div className="flex flex-col xl:flex-row gap-5 min-w-0">
                    {/* Single responsive tablist (no duplicated DOM tabs) */}
                    <div className="xl:w-[228px] xl:shrink-0 relative">
                        <div className="flex items-center gap-1.5 xl:block p-1.5 rounded-xl bg-slate-950/65 border border-white/[0.07] shadow-inner">
                            <button
                                type="button"
                                onClick={() => scrollEngineTabs('left')}
                                aria-label="Rolar abas de análise para a esquerda"
                                className="xl:hidden shrink-0 w-7 h-7 rounded-lg bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            <div
                                ref={tabsScrollRef}
                                role="tablist"
                                aria-label="Modos de análise do gráfico de evolução"
                                className="flex flex-row xl:flex-col items-center xl:items-stretch overflow-x-auto xl:overflow-x-visible xl:overflow-y-auto xl:max-h-[640px] gap-1 w-full no-scrollbar xl:custom-scrollbar scroll-smooth"
                            >
                                {(() => {
                                    const hasActiveTabInList = visibleSecondaryEngines.some((e) => e.id === activeEngine);
                                    return visibleSecondaryEngines.map((eng, idx, arr) => {
                                        const active = activeEngine === eng.id;
                                        const isKeyboardStop = active || (!hasActiveTabInList && idx === 0);
                                        const TabIcon = ENGINE_ICONS[eng.id] || BarChart3;
                                        return (
                                            <button
                                                type="button"
                                                role="tab"
                                                id={`engine-tab-${eng.id}`}
                                                aria-selected={active}
                                                aria-controls={`engine-panel-${eng.id}`}
                                                key={eng.id}
                                                ref={(el) => {
                                                    if (el) engineTabRefs.current.set(eng.id, el);
                                                    else engineTabRefs.current.delete(eng.id);
                                                }}
                                                onClick={() => setActiveEngine(eng.id)}
                                                onKeyDown={(e) => {
                                                    const activate = (id) => {
                                                        setActiveEngine(id);
                                                        focusEngineTab(id);
                                                    };

                                                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        activate(arr[(idx + 1) % arr.length].id);
                                                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        activate(arr[(idx - 1 + arr.length) % arr.length].id);
                                                    } else if (e.key === 'Home') {
                                                        e.preventDefault();
                                                        activate(arr[0].id);
                                                    } else if (e.key === 'End') {
                                                        e.preventDefault();
                                                        activate(arr[arr.length - 1].id);
                                                    }
                                                }}
                                                tabIndex={isKeyboardStop ? 0 : -1}
                                            className={`shrink-0 relative group inline-flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 border text-xs font-bold whitespace-nowrap xl:w-full xl:justify-start ${active
                                                    ? 'shadow-sm'
                                                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                                                }`}
                                            style={active ? { backgroundColor: `${eng.color}1a`, borderColor: `${eng.color}4d`, color: eng.color } : {}}
                                        >
                                            {active && (
                                                <span
                                                    className="hidden xl:block absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                                                    style={{ backgroundColor: eng.color }}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <TabIcon size={14} className="shrink-0 opacity-90" aria-hidden="true" />
                                            <span className="text-xs font-bold tracking-tight truncate">{eng.label}</span>
                                        </button>
                                    );
                                });
                                })()}
                            </div>

                            <button
                                type="button"
                                onClick={() => scrollEngineTabs('right')}
                                aria-label="Rolar abas de análise para a direita"
                                className="xl:hidden shrink-0 w-7 h-7 rounded-lg bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Coluna principal da análise ativa */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        {/* Cabeçalho da análise ativa + botão de guia recolhível */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-white/[0.07]">
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                <div
                                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                                    style={{ backgroundColor: `${engine.color}18`, border: `1px solid ${engine.color}38`, color: engine.color }}
                                >
                                    <ActiveEngineIcon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-sm sm:text-base tracking-tight leading-snug" style={{ color: engine.color }}>
                                        {engine.explain.titulo}
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                        {engine.explain.simples}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSecondaryGuide((prev) => !prev)}
                                aria-expanded={showSecondaryGuide}
                                className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${showSecondaryGuide
                                        ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200'
                                        : 'bg-slate-950/60 border-white/[0.09] text-slate-300 hover:border-indigo-400/35 hover:text-indigo-200'
                                    }`}
                            >
                                <BookOpen size={13} />
                                <span>{showSecondaryGuide ? 'Ocultar guia' : 'Guia da análise'}</span>
                            </button>
                        </div>

                        {showSecondaryGuide && engine?.guide && (
                            <div className="mb-4">
                                <ChartGuide guide={engine.guide} />
                            </div>
                        )}

                        <div
                            id={`engine-panel-${activeEngine}`}
                            role="tabpanel"
                            aria-labelledby={`engine-tab-${activeEngine}`}
                            tabIndex={0}
                            className="w-full flex-1 flex flex-col outline-none focus:outline-none"
                        >
                            {activeEngine === "raw_weekly" ? (
                                <EvolutionHeatmap
                                    heatmapData={heatmapData}
                                    targetScore={showOnlyFocus ? focusTarget : targetScore}
                                    unit={resolvedActiveUnit}
                                    showOnlyFocus={showOnlyFocus}
                                    focusSubjectId={focusSubjectId}
                                    timeWindow={timeWindow}
                                    maxScore={showOnlyFocus ? focusMax : maxScore}
                                    minScore={showOnlyFocus ? focusMin : minScore}
                                />
                            ) : activeEngine === "subtopics" ? (
                                <SubtopicsPerformanceChart
                                    categories={categories}
                                    focusSubjectId={focusSubjectId}
                                    showOnlyFocus={showOnlyFocus}
                                    timeWindow={timeWindow}
                                    targetScore={showOnlyFocus ? focusTarget : targetScore}
                                    minScore={showOnlyFocus ? focusMin : minScore}
                                    maxScore={showOnlyFocus ? focusMax : maxScore}
                                />
                            ) : activeEngine === "time_spent" ? (
                                <TimeSpentChart
                                    subjectAggData={subjectAggData}
                                    activeCategories={activeCategories}
                                    categories={categories}
                                    showOnlyFocus={showOnlyFocus}
                                    focusCategory={focusCategory}
                                    timeWindow={timeWindow}
                                    maxScore={maxScore}
                                    minScore={minScore}
                                    examDurationMinutes={examDurationMinutes}
                                    examTotalQuestions={examTotalQuestions}
                                    onConfigurePace={() => {
                                        setEngineGroup('all');
                                        setActiveEngine('exam_pacing');
                                    }}
                                />
                            ) : activeEngine === "speed_accuracy" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <SpeedAccuracyChart
                                        categories={categories}
                                        simuladoRows={simuladoRowsArray}
                                        showOnlyFocus={showOnlyFocus}
                                        focusSubjectId={focusSubjectId}
                                        timeWindow={timeWindow}
                                        targetScore={showOnlyFocus ? focusTarget : targetScore}
                                        minScore={showOnlyFocus ? focusMin : minScore}
                                        maxScore={showOnlyFocus ? focusMax : maxScore}
                                        examDurationMinutes={examDurationMinutes}
                                        examTotalQuestions={examTotalQuestions}
                                        penaltyPerWrong={penaltyPerWrong}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "exam_pacing" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <ExamPacingChart
                                        categories={categories}
                                        mcWeights={mcWeights}
                                        timeWindow={timeWindow}
                                        examDurationMinutes={examDurationMinutes}
                                        examTotalQuestions={examTotalQuestions}
                                        showOnlyFocus={showOnlyFocus}
                                        focusCategory={focusCategory}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "consistency_boxplot" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <ConsistencyBoxPlotChart
                                        categories={categories}
                                        showOnlyFocus={showOnlyFocus}
                                        focusSubjectId={focusSubjectId}
                                        timeWindow={timeWindow}
                                        targetScore={showOnlyFocus ? focusTarget : targetScore}
                                        minScore={showOnlyFocus ? focusMin : minScore}
                                        maxScore={showOnlyFocus ? focusMax : maxScore}
                                        unit={resolvedActiveUnit}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "projection_fan" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <ProjectionFanChart
                                        focusCategory={showOnlyFocus ? (focusCategory || null) : null}
                                        timeline={timeline}
                                        timeWindow={timeWindow}
                                        projectDays={projectDays}
                                        historicalCutoffs={showOnlyFocus ? focusHistoricalCutoffs : historicalCutoffs}
                                        targetScore={showOnlyFocus ? focusTarget : targetScore}
                                        minScore={showOnlyFocus ? focusMin : minScore}
                                        maxScore={showOnlyFocus ? focusMax : maxScore}
                                        unit={resolvedActiveUnit}
                                        activeMcResult={showOnlyFocus ? activeMcResult : null}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "kalman_latent" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <KalmanLatentChart
                                        focusCategory={showOnlyFocus ? (focusCategory || null) : null}
                                        timeline={timeline}
                                        timeWindow={timeWindow}
                                        targetScore={showOnlyFocus ? focusTarget : targetScore}
                                        minScore={showOnlyFocus ? focusMin : minScore}
                                        maxScore={showOnlyFocus ? focusMax : maxScore}
                                        unit={resolvedActiveUnit}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "tornado_whatif" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <TornadoWhatIfChart
                                        categories={categories}
                                        mcWeights={mcWeights}
                                        simuladoRows={simuladoRowsArray}
                                        targetScore={targetScore}
                                        minScore={minScore}
                                        maxScore={maxScore}
                                        unit={resolvedGlobalUnit}
                                        historicalCutoffs={historicalCutoffs}
                                        examGroupCutoffs={examGroupCutoffs}
                                        showOnlyFocus={showOnlyFocus}
                                        focusCategory={focusCategory}
                                        timeWindow={timeWindow}
                                        onSaveGroupCutoffs={(nextCutoffs) => {
                                            const patchData = useAppStore.getState?.()?.patchData;
                                            if (typeof patchData === 'function') {
                                                patchData(() => ({ examGroupCutoffs: nextCutoffs || {} }));
                                            }
                                        }}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "correlation_regimes" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <CorrelationRegimeChart
                                        categories={categories}
                                        studyLogs={studyLogsArray}
                                        simuladoRows={simuladoRowsArray}
                                        targetScore={targetScore}
                                        minScore={minScore}
                                        maxScore={maxScore}
                                        unit={resolvedGlobalUnit}
                                        focusSubjectId={focusSubjectId}
                                        timeWindow={timeWindow}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "irt_psychometric" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <IRTPsychometricChart
                                        categories={categories}
                                        simuladoRows={simuladoRowsArray}
                                        focusCategory={focusCategory}
                                        showOnlyFocus={showOnlyFocus}
                                        timeWindow={timeWindow}
                                        targetScore={showOnlyFocus ? focusTarget : targetScore}
                                        minScore={showOnlyFocus ? focusMin : minScore}
                                        maxScore={showOnlyFocus ? focusMax : maxScore}
                                        examBoard={examBoard}
                                        penaltyPerWrong={penaltyPerWrong}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "metacognition_fatigue" ? (
                                <React.Suspense fallback={LazyTabFallback}>
                                    <MetacognitionFatigueChart
                                        simuladoRows={simuladoRowsArray}
                                        focusCategory={focusCategory}
                                        showOnlyFocus={showOnlyFocus}
                                        timeWindow={timeWindow}
                                        targetScore={showOnlyFocus ? focusTarget : targetScore}
                                        minScore={showOnlyFocus ? focusMin : minScore}
                                        maxScore={showOnlyFocus ? focusMax : maxScore}
                                    />
                                </React.Suspense>
                            ) : activeEngine === "mc_density" ? (
                                <MonteCarloEvolutionChart
                                    data={effectiveMcHistoryData}
                                    targetScore={effectiveMcHistoryData?.[0]?.__fromFocus ? focusTarget : targetScore}
                                    unit={effectiveMcHistoryData?.[0]?.__fromFocus ? resolvedFocusUnit : resolvedGlobalUnit}
                                    minScore={effectiveMcHistoryData?.[0]?.__fromFocus ? focusMin : minScore}
                                    maxScore={effectiveMcHistoryData?.[0]?.__fromFocus ? focusMax : maxScore}
                                    loading={Boolean((showOnlyFocus || effectiveMcHistoryData?.[0]?.__fromFocus) && mcLoading)}
                                />
                            ) : activeEngine === "weekly_diff" ? (
                                <WeeklyEvolutionView
                                    categories={categories}
                                    studyLogs={studyLogsArray}
                                    showOnlyFocus={showOnlyFocus}
                                    focusSubjectId={focusSubjectId}
                                    timeWindow={timeWindow}
                                    targetScore={showOnlyFocus ? focusTarget : targetScore}
                                    maxScore={showOnlyFocus ? focusMax : maxScore}
                                    minScore={showOnlyFocus ? focusMin : minScore}
                                    unit={resolvedActiveUnit}
                                />
                            ) : activeEngine === "today_vs_general" ? (
                                <TodayVsGeneralChart
                                    activeCategories={activeCategories}
                                    focusCategory={showOnlyFocus ? focusCategory : null}
                                    globalMetrics={safeGlobalMetrics}
                                    targetScore={showOnlyFocus ? focusTarget : targetScore}
                                    timeWindow={timeWindow}
                                    maxScore={showOnlyFocus ? focusMax : maxScore}
                                    minScore={showOnlyFocus ? focusMin : minScore}
                                    unit={resolvedActiveUnit}
                                    simuladoRows={simuladoRowsArray}
                                />
                            ) : !accountHasData ? (
                                <div className="min-h-[340px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-slate-950/50 p-8">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/12 border border-indigo-400/25 flex items-center justify-center text-indigo-300">
                                        <Flame size={26} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-200 font-bold text-base mb-1">Dados insuficientes para exibir o gráfico</p>
                                        <p className="text-slate-400 text-xs mt-1">Cadastre pelo menos <span className="text-indigo-300 font-bold">1 simulado</span> na sua conta para desbloquear os gráficos.</p>
                                    </div>
                                </div>
                            ) : !filterHasData ? (
                                <div className="min-h-[340px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-slate-950/50 p-8">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                                        <Calendar size={26} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-200 font-bold text-base mb-1">Nenhuma atividade recente</p>
                                        <p className="text-slate-400 text-xs mt-1">Você não cadastrou simulados nos últimos <span className="text-amber-400 font-bold">{timeWindow} dias</span>.</p>
                                        <button
                                            type="button"
                                            onClick={() => setTimeWindow("all")}
                                            className="mt-5 px-5 py-2 bg-indigo-500/15 text-indigo-200 border border-indigo-400/35 rounded-xl font-bold text-xs hover:bg-indigo-500/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 active:scale-95"
                                        >
                                            Ver todo o histórico
                                        </button>
                                    </div>
                                </div>
                            ) : activeEngine === "compare" ? (
                                <div className="w-full overflow-x-auto no-scrollbar pb-1">
                                    <div className="min-w-[540px] lg:min-w-full relative">
                                        {mcLoading && (
                                            <div className="absolute inset-0 z-20 bg-slate-950/45 backdrop-blur-[1px] flex items-center justify-center rounded-2xl transition-all duration-300">
                                                <div className="flex flex-col items-center gap-2.5">
                                                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                                                    <span className="text-[11px] font-bold uppercase text-indigo-300 tracking-wider animate-pulse">Sincronizando Monte Carlo...</span>
                                                </div>
                                            </div>
                                        )}
                                        <CompareChart
                                            filteredChartData={filteredChartData}
                                            targetScore={focusTarget}
                                            minScore={focusMin}
                                            maxScore={focusMax}
                                            unit={resolvedFocusUnit}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full overflow-x-auto no-scrollbar pb-1">
                                    <div className="min-w-[540px] lg:min-w-full relative">
                                        <EvolutionLineChart
                                            filteredChartData={filteredChartData}
                                            activeCategories={activeCategories}
                                            engine={engine}
                                            targetScore={showOnlyFocus ? focusTarget : targetScore}
                                            focusSubjectId={focusSubjectId}
                                            showOnlyFocus={showOnlyFocus}
                                            minScore={showOnlyFocus ? focusMin : minScore}
                                            maxScore={showOnlyFocus ? focusMax : maxScore}
                                            unit={resolvedActiveUnit}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isMcEngine && focusCategory && (activeEngine !== "compare" || (accountHasData && filterHasData)) && (
                <div className="mt-5 animate-fade-in-up">
                    <div className="rounded-2xl border border-white/[0.08] bg-slate-900/65 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.65)] relative group">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:scale-105 transition-transform duration-700">
                                <TrendingUp size={120} />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-5 items-start relative">
                            <div className="w-full md:w-1/2 flex flex-col">
                                {/* VIS-FIX: z-20 mantém o seletor de foco clicável acima do overlay "sem dados" */}
                                <div className="relative z-20 inline-flex items-center mb-3.5 max-w-full self-start rounded-xl bg-slate-950/75 border border-indigo-400/30 hover:border-indigo-400/50 transition-colors">
                                    <Zap size={13} className="text-indigo-400 absolute left-2.5 pointer-events-none" />
                                    <select
                                        value={focusCategory?.id != null ? String(focusCategory.id) : ''}
                                        onChange={(e) => handleSelectFocusValue(e.target.value)}
                                        className="appearance-none bg-transparent border-0 text-xs font-bold text-indigo-200 pl-7 pr-7 py-1.5 cursor-pointer hover:text-white transition-colors truncate max-w-[260px] focus:outline-none focus:ring-0"
                                        style={{ backgroundColor: 'transparent', border: 'none' }}
                                    >
                                        {(activeCategories.length > 0 ? activeCategories : categories).map(c => (
                                            <option key={c.id} value={String(c.id)} className="bg-slate-900 text-slate-200">
                                                Foco: {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={13} className="text-indigo-300 absolute right-2.5 pointer-events-none" />
                                </div>
                                <div className="min-h-[280px] w-full mb-1">
                                    <GaussianPlot
                                        mean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? focusMin}
                                        projectedMean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? focusMin}
                                        currentMean={categoryLevels[focusCategory?.id]}
                                        sd={activeMcResult?.sd ?? 0}
                                        sdLeft={activeMcResult?.sdLeft ?? activeMcResult?.sd ?? 0}
                                        sdRight={activeMcResult?.sdRight ?? activeMcResult?.sd ?? 0}
                                        low95={activeMcResult?.ci95Low ?? focusMin}
                                        high95={activeMcResult?.ci95High ?? focusMax}
                                        targetScore={focusTarget}
                                        prob={activeMcResult?.probability ?? 0}
                                        kdeData={activeMcResult?.kdeData}
                                        minScore={focusMin}
                                        maxScore={focusMax}
                                        unit={resolvedFocusUnit}
                                    />
                                </div>
                            </div>

                            {activeMcResult ? (
                                <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 self-center">
                                    {(() => {
                                        const toFinite = (v, fallback = 0) =>
                                            v === null || v === undefined || v === ''
                                                ? fallback
                                                : Number.isFinite(Number(v))
                                                    ? Number(v)
                                                    : fallback;

                                        const bounded = (v) => Math.max(focusMin, Math.min(focusMax, toFinite(v, focusMin)));

                                        const projectedLevel = bounded(
                                            toFinite(activeMcResult?.projectedMean, toFinite(activeMcResult?.mean, focusMin))
                                        );

                                        const ciLow = bounded(toFinite(activeMcResult?.ci95Low, projectedLevel));
                                        const ciHigh = bounded(toFinite(activeMcResult?.ci95High, projectedLevel));

                                        const ciMin = Math.min(ciLow, ciHigh);
                                        const ciMax = Math.max(ciLow, ciHigh);
                                        const marginOfError = Math.max(0, (ciMax - ciMin) / 2);

                                        const focusUnit = resolvedFocusUnit;
                                        const focusUnitSuffix = focusUnit === '%' ? '%' : ` ${focusUnit}`;

                                        return [
                                            {
                                                label: 'Caminho Sucesso',
                                                val: `${normalizeProbability(activeMcResult?.probability).toFixed(2)}%`,
                                                desc: 'Chance estimada de atingir a meta',
                                                icon: <Target size={14} />,
                                                color: 'text-emerald-400'
                                            },
                                            {
                                                label: 'Nível Projetado',
                                                val: focusUnit === '%'
                                                    ? `${projectedLevel.toFixed(2)}%`
                                                    : `${formatValue(projectedLevel)}${focusUnitSuffix}`,
                                                desc: 'Nota média esperada na prova',
                                                icon: <TrendingUp size={14} />,
                                                color: 'text-sky-400'
                                            },
                                            {
                                                label: 'Margem de Erro',
                                                val: focusUnit === '%'
                                                    ? `±${marginOfError.toFixed(2)}%`
                                                    : `±${formatValue(marginOfError)}${focusUnitSuffix}`,
                                                desc: 'Oscilação provável para cima/baixo',
                                                icon: <BarChart3 size={14} />,
                                                color: 'text-amber-400'
                                            },
                                            {
                                                label: 'Confiança 95%',
                                                val: focusUnit === '%'
                                                    ? `${ciMin.toFixed(1)} a ${ciMax.toFixed(1)}%`
                                                    : `${formatValue(ciMin)} a ${formatValue(ciMax)}${focusUnitSuffix}`,
                                                desc: 'Faixa de 95% das simulações',
                                                icon: <Zap size={14} />,
                                                color: 'text-indigo-400'
                                            }
                                        ].map((stat, i) => (
                                            <div
                                                key={i}
                                                className="flex flex-col p-3.5 rounded-xl bg-slate-950/55 border border-white/[0.06] hover:border-white/[0.14] transition-colors min-w-0"
                                            >
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <span className={stat.color}>{stat.icon}</span>
                                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider truncate">
                                                        {stat.label}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-base sm:text-lg font-black ${stat.color} tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full block leading-tight font-mono tabular-nums`}
                                                    title={stat.val}
                                                >
                                                    {stat.val}
                                                </span>
                                                <span className="text-[11px] text-slate-400 mt-1 leading-snug">
                                                    {stat.desc}
                                                </span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            ) : mcLoading ? (
                                <div className="w-full md:w-1/2 grid place-items-center self-center px-6">
                                    <span className="text-xs font-bold text-slate-400 text-center">
                                        Calculando projeção Monte Carlo...
                                    </span>
                                </div>
                            ) : null}
                        </div>

                        {mcLoading && (
                            <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-slate-950/45 backdrop-blur-sm pointer-events-none">
                                <Loader2 size={24} className="animate-spin text-indigo-400" />
                            </div>
                        )}

                        {!activeMcResult && !mcLoading && (
                            <div className="absolute inset-0 z-10 rounded-2xl flex flex-col items-center justify-center gap-2.5 px-6 text-center bg-slate-950/55 backdrop-blur-sm pointer-events-none">
                                <TrendingUp size={24} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-300 max-w-md">
                                    Cadastre pelo menos 1 simulado na matéria em foco para ver a densidade
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </motion.div> {/* Fim do bloco Análises Secundárias */}

        <div className="relative z-0">
            {(() => {
                const typeColors = {
                    success: {
                        border: 'border-emerald-500/30',
                        bg: 'from-emerald-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-emerald-500/10',
                        text: 'text-emerald-300',
                        icon: 'text-emerald-400',
                        pingBg: 'bg-emerald-400'
                    },
                    warning: {
                        border: 'border-amber-500/30',
                        bg: 'from-amber-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-amber-500/10',
                        text: 'text-amber-300',
                        icon: 'text-amber-400',
                        pingBg: 'bg-amber-400'
                    },
                    danger: {
                        border: 'border-rose-500/30',
                        bg: 'from-rose-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-rose-500/10',
                        text: 'text-rose-300',
                        icon: 'text-rose-400',
                        pingBg: 'bg-rose-400'
                    },
                    info: {
                        border: 'border-indigo-500/30',
                        bg: 'from-indigo-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-indigo-500/10',
                        text: 'text-indigo-300',
                        icon: 'text-indigo-400',
                        pingBg: 'bg-indigo-400'
                    },
                    neutral: {
                        border: 'border-slate-500/30',
                        bg: 'from-slate-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-slate-500/10',
                        text: 'text-slate-300',
                        icon: 'text-slate-300',
                        pingBg: 'bg-slate-400'
                    },
                    critical: {
                        border: 'border-rose-500/45',
                        bg: 'from-rose-500/10 via-slate-900/40 to-transparent',
                        glow: 'shadow-rose-500/15',
                        text: 'text-rose-300',
                        icon: 'text-rose-300',
                        pingBg: 'bg-rose-500'
                    },
                    progress: {
                        border: 'border-sky-500/30',
                        bg: 'from-sky-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-sky-500/10',
                        text: 'text-sky-300',
                        icon: 'text-sky-300',
                        pingBg: 'bg-sky-400'
                    },
                    time: {
                        border: 'border-cyan-500/30',
                        bg: 'from-cyan-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-cyan-500/10',
                        text: 'text-cyan-300',
                        icon: 'text-cyan-300',
                        pingBg: 'bg-cyan-400'
                    },
                    focus: {
                        border: 'border-purple-500/30',
                        bg: 'from-purple-500/8 via-slate-900/40 to-transparent',
                        glow: 'shadow-purple-500/10',
                        text: 'text-purple-300',
                        icon: 'text-purple-300',
                        pingBg: 'bg-purple-400'
                    }
                };
                const colors = typeColors[insight.type] || typeColors.info;

                return (
                    <div className={`relative overflow-hidden rounded-2xl border ${colors.border} bg-slate-900/70 backdrop-blur-xl shadow-xl ${colors.glow}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} pointer-events-none`} />

                        <div className="flex flex-col lg:flex-row gap-5 lg:items-center p-5 relative z-10">
                            <div className="flex-1 space-y-2.5 min-w-0">
                                <div className="flex items-start sm:items-center gap-3">
                                    <div className={`shrink-0 w-10 h-10 rounded-xl bg-slate-950/70 border border-white/[0.08] flex items-center justify-center text-lg ${colors.icon}`}>
                                        {insight.icon}
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${colors.text} leading-snug break-words block`}>
                                            {renderInsightText(insight.title, colors.text)}
                                        </span>
                                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug break-words">
                                            {renderInsightText(insight.text, colors.text)}
                                        </h3>
                                    </div>
                                </div>

                                {insight.details && (
                                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
                                        {renderInsightText(insight.details, colors.text)}
                                    </p>
                                )}
                            </div>

                            {insight.advice && (
                                <div className="w-full lg:w-[340px] shrink-0">
                                    <div className={`rounded-xl bg-slate-950/65 border ${colors.border} p-4 relative`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className={`p-1 rounded-lg bg-white/[0.06] border border-white/[0.08] ${colors.text}`}>
                                                <Zap size={13} fill="currentColor" />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                                Orientação Estratégica
                                            </span>
                                        </div>
                                        <p className={`text-xs sm:text-sm font-semibold leading-relaxed ${colors.text} break-words`}>
                                            {renderInsightText(insight.advice, colors.text)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-2.5 bg-slate-950/45 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-slate-400 relative z-10">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="inline-flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${colors.pingBg}`} />
                                    Diagnóstico sincronizado
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    Confiança do modelo:
                                    <strong className="text-slate-200 font-mono tabular-nums bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06]">
                                        {timeline.length >= 2 ? `${Math.min(99.9, 85 + Math.min(14.9, timeline.length * 0.8)).toFixed(1)}%` : '—'}
                                    </strong>
                                </span>
                                {mcLoading && (
                                    <span className="inline-flex items-center gap-1.5 text-indigo-300 font-medium">
                                        <Loader2 size={12} className="animate-spin" />
                                        Atualizando projeções...
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/simulados')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 text-[11px] font-bold transition-colors no-print"
                            >
                                <span>Registrar simulado</span>
                                <ArrowRight size={11} />
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>

        <div className="pt-6 border-t border-white/[0.07] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
                        <BarChart3 size={18} />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Galeria de Análises Detalhadas</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Raio-X por matéria, balanço de volume vs. precisão e matriz de criticidade
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowDetailedGallery((prev) => !prev)}
                    aria-expanded={showDetailedGallery}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.09] bg-slate-900/75 hover:bg-slate-800/85 text-xs font-bold text-slate-200 transition-colors shrink-0"
                >
                    {showDetailedGallery ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showDetailedGallery ? 'Recolher' : 'Expandir'}</span>
                </button>
            </div>

            {showDetailedGallery && (
                <div className="space-y-5">
                    {/* Grid 1: Radar (Equilíbrio) + PerformanceBar (Volume vs Acertos) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                        <RadarAnalysis
                            radarData={radarData}
                            maxScore={maxScore}
                            minScore={minScore}
                            unit={resolvedGlobalUnit}
                            isFocusFiltered={Boolean(showOnlyFocus && activeCategories.length >= 3)}
                            timeWindow={timeWindow}
                        />
                        <PerformanceBarChart
                            subjectAggData={subjectAggData}
                            showOnlyFocus={showOnlyFocus}
                            focusCategory={focusCategory}
                            targetScore={showOnlyFocus ? focusTarget : targetScore}
                            unit={resolvedActiveUnit}
                            maxScore={showOnlyFocus ? focusMax : maxScore}
                            minScore={showOnlyFocus ? focusMin : minScore}
                        />
                    </div>

                    {/* Grid 2: Matérias e Assuntos Críticos */}
                    <CriticalTopicsAnalysis
                        categories={categories}
                        maxScore={showOnlyFocus ? focusMax : maxScore}
                        minScore={showOnlyFocus ? focusMin : minScore}
                        targetScore={showOnlyFocus ? focusTarget : targetScore}
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusCategory?.id || focusSubjectId}
                        timeWindow={timeWindow}
                        onGoToSimulados={() => navigate('/simulados')}
                    />
                </div>
            )}
        </div>
    </motion.div>
);
});

