import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useEffect, useState } from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { EvolucaoFocoChart } from '../components/charts/Analytics/EvolucaoFocoChart';
import { HorasDisciplinaChart } from '../components/charts/Analytics/HorasDisciplinaChart';
import { CircadianHeatmapChart } from '../components/charts/Analytics/CircadianHeatmapChart';
import { SyllabusBurndownChart } from '../components/charts/Analytics/SyllabusBurndownChart';
import { WorkloadACWRChart } from '../components/charts/Analytics/WorkloadACWRChart';
import { EfficientAllocationChart } from '../components/charts/Analytics/EfficientAllocationChart';
import { AdaptiveMaturityBadge } from '../components/ui/AdaptiveMaturityBadge';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../utils/chartDataMappers';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { getSafeScore, isPhantomZeroTimeAttempt, resolveUserTargetScorePoints } from '../utils/scoreHelper';
import { reconcileContestCategoriesHistory, isRealSimuladoRow } from '../utils/simuladoReconciler';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// FIX E-04: tick de 60s para reagir à virada de dia (meia-noite) sem recarregar.
// Bug #1 FIX: Força re-render apenas na virada do dia, e não a cada minuto, com suporte a visibilitychange.
const useDayTick = () => {
    const [today, setToday] = useState(() => getDateKey(new Date()));
    useEffect(() => {
        const check = () => {
            const current = getDateKey(new Date());
            setToday(prev => prev !== current ? current : prev);
        };
        const id = setInterval(() => {
            if (!document.hidden) check();
        }, 60 * 1000);
        document.addEventListener('visibilitychange', check);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', check);
        };
    }, []);
    return today;
};

export default function Stats() {
    const dayTick = useDayTick();

    const { rawCategories, rawStudyLogs, rawStudySessions, rawFlashcards, rawSimuladoRows, user, rawContestMinScore, rawContestMaxScore, contestPenalty } = useAppStore(useShallow(state => {
        const contests = state?.appState?.contests || {};
        const activeId = state?.appState?.activeId;
        const contest = contests[activeId] || {};
        return {
            rawCategories: contest.categories,
            rawStudyLogs: contest.studyLogs,
            rawStudySessions: contest.studySessions,
            rawFlashcards: contest.flashcardDecks,
            rawSimuladoRows: contest.simuladoRows,
            user: contest.user || null,
            rawContestMinScore: contest.minScore ?? contest.settings?.minScore,
            rawContestMaxScore: contest.maxScore ?? contest.settings?.maxScore,
            contestPenalty: contest.penaltyPerWrong ?? 0
        };
    }));

    const studyLogs = useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);

    const studySessions = useMemo(() => {
        return Array.isArray(rawStudySessions) ? rawStudySessions : Object.values(rawStudySessions || {});
    }, [rawStudySessions]);

    const simuladoRows = useMemo(() => {
        return Array.isArray(rawSimuladoRows) ? rawSimuladoRows : Object.values(rawSimuladoRows || {});
    }, [rawSimuladoRows]);

    // FIX E-01: normalização profunda — garante `tasks` como array em todas as categorias.
    const baseCategories = useMemo(() => {
        const list = Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
        return list.filter(Boolean).map(c => {
            const rawTasks = Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {});
            return {
                ...c,
                tasks: rawTasks.filter(Boolean)
            };
        });
    }, [rawCategories]);

    // D1 + D2 FIX: resolver minScore/maxScore com paridade exata a VerifiedStats e garantir maxScore > minScore
    const { minScore, maxScore } = useMemo(() => {
        const toOptNum = (v) => (
            v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v))
        ) ? Number(v) : NaN;

        let resolvedMax = toOptNum(rawContestMaxScore);
        if (!Number.isFinite(resolvedMax) || resolvedMax <= 0) {
            const catMaxes = baseCategories.map(c => toOptNum(c?.maxScore)).filter(s => Number.isFinite(s) && s > 0);
            resolvedMax = (catMaxes.length > 0 && catMaxes.length === baseCategories.length && new Set(catMaxes).size === 1)
                ? catMaxes[0]
                : 100;
        }

        let resolvedMin = toOptNum(rawContestMinScore);
        if (!Number.isFinite(resolvedMin)) {
            const catMins = baseCategories.map(c => toOptNum(c?.minScore)).filter(Number.isFinite);
            resolvedMin = (catMins.length > 0 && catMins.length === baseCategories.length && new Set(catMins).size === 1)
                ? catMins[0]
                : 0;
        }

        if (resolvedMax <= resolvedMin) {
            resolvedMax = resolvedMin + 100;
        }

        return { minScore: resolvedMin, maxScore: resolvedMax };
    }, [rawContestMinScore, rawContestMaxScore, baseCategories]);

    const categories = useMemo(() => {
        if (!baseCategories.length || !simuladoRows.some(isRealSimuladoRow)) {
            return baseCategories;
        }
        return reconcileContestCategoriesHistory(baseCategories, simuladoRows, maxScore, minScore, {
            penaltyPerWrong: Number(contestPenalty) || 0
        });
    }, [baseCategories, simuladoRows, maxScore, minScore, contestPenalty]);

    const allocationTargetScore = useMemo(
        () => resolveUserTargetScorePoints(user, minScore, maxScore, 0.8),
        [user, minScore, maxScore]
    );

    const flashcardDecks = useMemo(() => {
        return Array.isArray(rawFlashcards) ? rawFlashcards : Object.values(rawFlashcards || {});
    }, [rawFlashcards]);

    // FIX E-03, D1 & D7: considera apenas linhas validadas, não-futuras e reais (sem 0s phantom bug)
    const hasSimuladoHistory = useMemo(() => {
        const todayKey = dayTick || getDateKey(new Date());
        const isOptNum = (v) => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v));

        const rowsArray = Array.isArray(rawSimuladoRows)
            ? rawSimuladoRows
            : Object.values(rawSimuladoRows || {});
        const hasValidRows = rowsArray.some(r => {
            if (!isRealSimuladoRow(r)) return false;
            const dk = getDateKey(r.date || r.createdAt);
            if (dk && todayKey && dk > todayKey) return false;
            const rMax = isOptNum(r.maxScore) && Number(r.maxScore) > 0 ? Number(r.maxScore) : maxScore;
            const rMin = isOptNum(r.minScore) ? Number(r.minScore) : minScore;
            const safeScore = getSafeScore(r, rMax, rMin);
            if (Number.isFinite(safeScore) && isPhantomZeroTimeAttempt(r, safeScore)) return false;
            const rawTotal = r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions;
            const rawCorrect = r.correct ?? r.acertos ?? r.correctCount;
            const hasTotal = isOptNum(rawTotal);
            return (
                (Number(rawTotal) > 0 && isOptNum(rawCorrect) && Number(rawCorrect) >= 0) ||
                (Number.isFinite(safeScore) && (!hasTotal || Number(rawTotal) >= 0))
            );
        });
        if (hasValidRows) return true;
        return categories.some(category => {
            const h = category?.simuladoStats?.history;
            const hArray = Array.isArray(h) ? h : Object.values(h || {});
            const catMax = isOptNum(category?.maxScore) && Number(category.maxScore) > 0 ? Number(category.maxScore) : maxScore;
            const catMin = isOptNum(category?.minScore) ? Number(category.minScore) : minScore;
            return hArray.some(entry => {
                if (!entry || entry.valid === false || entry.validated === false) return false;
                const dk = getDateKey(entry.date || entry.createdAt);
                if (dk && todayKey && dk > todayKey) return false;
                const safeScore = getSafeScore(entry, catMax, catMin);
                if (Number.isFinite(safeScore) && isPhantomZeroTimeAttempt(entry, safeScore)) return false;
                const rawTotal = entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions;
                return Number(rawTotal) > 0 || Number.isFinite(safeScore);
            });
        });
    }, [rawSimuladoRows, categories, minScore, maxScore, dayTick]);

    const hasFlashcards = useMemo(() => {
        return flashcardDecks.some(d => {
            const cards = Array.isArray(d?.cards)
                ? d.cards
                : Object.values(d?.cards || {});
            return cards.some(c => c && typeof c === 'object');
        });
    }, [flashcardDecks]);

    // FIX Bug 6 & D7: considera apenas logs de estudo reais (não flashcards) com tempo positivo e data válida não-futura
    const hasStudyLogs = useMemo(() => {
        const todayKey = dayTick || getDateKey(new Date());
        return studyLogs.some(log => {
            if (!log || log.type === 'flashcard') return false;
            const d = normalizeDate(log.date || log.createdAt);
            if (!d || Number.isNaN(d.getTime())) return false;
            const dk = getDateKey(d);
            if (dk && todayKey && dk > todayKey) return false;
            const mins = Number(log.minutes ?? log.minutos);
            const dur = Number(log.duration);
            return (Number.isFinite(mins) && mins > 0) || (Number.isFinite(dur) && dur > 0);
        });
    }, [studyLogs, dayTick]);
    const hasTimedStudySessions = useMemo(() => {
        return studySessions.some(s => s && (Number(s.duration) > 0 || Number(s.minutes) > 0));
    }, [studySessions]);
    const hasData = hasStudyLogs || hasSimuladoHistory || hasFlashcards || hasTimedStudySessions;

    // dayTick força re-cálculo ao atravessar meia-noite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const focusData = useMemo(() => mapFocusEvolutionData(studyLogs), [studyLogs, dayTick]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const subjectData = useMemo(() => mapSubjectHoursData(studyLogs, categories), [studyLogs, categories, dayTick]);

    return (
        <PageErrorBoundary pageName="Estatísticas">
            <div className="space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl">📊</div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Estatísticas</h1>
                        </div>
                        <p className="text-slate-400 mt-1.5 text-sm">Sua performance quantificada.</p>
                    </div>
                    <AdaptiveMaturityBadge compact />
                </div>

                {!hasData ? (
                    <div className="flex items-center justify-center min-h-[45vh] p-4">
                        <div className="glass p-8 sm:p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl max-w-md w-full">
                            <div className="text-5xl mb-4 opacity-80">📊</div>
                            <p className="font-black uppercase tracking-wider text-sm text-slate-200 mb-2">Aguardando dados</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Registre horas de estudo, simulados ou flashcards para gerar relatórios e análises detalhadas.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {!(hasSimuladoHistory || hasFlashcards) ? (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/30 text-center mb-6">
                                <p className="text-xs font-semibold text-slate-400">
                                    Nenhum simulado ou flashcard registrado. Registre simulados ou revise flashcards para desbloquear a Previsão IA, Análise de Consistência e Simulação de Monte Carlo.
                                </p>
                            </div>
                        ) : (
                            <VerifiedStats categories={categories} user={user} flashcardDecks={flashcardDecks} dayTick={dayTick} />
                        )}

                        {!hasStudyLogs ? (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/30 text-center my-6">
                                <p className="text-xs font-semibold text-slate-400">
                                    Nenhuma sessão de estudo registrada. Registre horas de estudo para visualizar a Evolução do Foco e Análise Semanal.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Evolução do Foco</h2>
                                                <p className="text-[11px] text-slate-500 uppercase">Histórico de Horas Líquidas de Estudo</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full"><EvolucaoFocoChart data={focusData} /></div>
                                    </div>
                                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Concentração por Matéria</h2>
                                                <p className="text-[11px] text-slate-500 uppercase">Ranking de disciplinas por tempo investido</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full"><HorasDisciplinaChart data={subjectData} /></div>
                                    </div>
                                </div>
                                <WeeklyAnalysis studyLogs={studyLogs} categories={categories} dayTick={dayTick} />
                                <WorkloadACWRChart studyLogs={studyLogs} dayTick={dayTick} />
                            </>
                        )}
                        {(hasStudyLogs || hasSimuladoHistory || hasTimedStudySessions) && (
                            <CircadianHeatmapChart
                                studyLogs={studyLogs}
                                studySessions={studySessions}
                                simuladoRows={simuladoRows}
                                categories={categories}
                                minScore={minScore}
                                maxScore={maxScore}
                                dayTick={dayTick}
                            />
                        )}
                        {(hasStudyLogs || hasSimuladoHistory) && (
                            <EfficientAllocationChart
                                categories={categories}
                                studyLogs={studyLogs}
                                targetScore={allocationTargetScore}
                                minScore={minScore}
                                maxScore={maxScore}
                                dayTick={dayTick}
                            />
                        )}
                        <SyllabusBurndownChart categories={categories} user={user || {}} dayTick={dayTick} />
                    </>
                )}
            </div>
        </PageErrorBoundary>
    );
}
