import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { EvolucaoFocoChart } from '../components/charts/Analytics/EvolucaoFocoChart';
import { HorasDisciplinaChart } from '../components/charts/Analytics/HorasDisciplinaChart';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function Stats() {
    const { rawCategories, rawStudyLogs, rawFlashcards, rawSimuladoRows, user } = useAppStore(useShallow(state => {
        const contests = state?.appState?.contests || {};
        const activeId = state?.appState?.activeId;
        const contest = contests[activeId] || {};
        return {
            rawCategories: contest.categories,
            rawStudyLogs: contest.studyLogs,
            rawFlashcards: contest.flashcardDecks,
            rawSimuladoRows: contest.simuladoRows,
            user: contest.user || null
        };
    }));

    const studyLogs = useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);

    const categories = useMemo(() => {
        return Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
    }, [rawCategories]);

    const flashcardDecks = useMemo(() => {
        return Array.isArray(rawFlashcards) ? rawFlashcards : Object.values(rawFlashcards || {});
    }, [rawFlashcards]);

    const focusData = useMemo(() => mapFocusEvolutionData(studyLogs), [studyLogs]);
    const subjectData = useMemo(() => mapSubjectHoursData(studyLogs, categories), [studyLogs, categories]);

    // 🎯 FIX LÓGICO: Gráficos de analytics precisam de logs, simulados ou flashcards para serem montados
    const hasStudyLogs = studyLogs.length > 0;
    // ✅ PATCH-10: Validar que existem rows com dados reais
    const hasSimuladoHistory = useMemo(() => {
        const rowsArray = Array.isArray(rawSimuladoRows)
            ? rawSimuladoRows
            : Object.values(rawSimuladoRows || {});
        // Só conta rows com total > 0 ou score definido
        const hasValidRows = rowsArray.some(r =>
            r && (Number(r.total) > 0 || Number(r.correct) > 0 || r.score != null)
        );
        if (hasValidRows) return true;
        const catsArray = Array.isArray(categories) ? categories : Object.values(categories || {});
        return catsArray.some(category => {
            const h = category?.simuladoStats?.history;
            const hArray = Array.isArray(h) ? h : Object.values(h || {});
            return hArray.some(entry =>
                entry && (Number(entry.total) > 0 || entry.score != null)
            );
        });
    }, [rawSimuladoRows, categories]);
    // T-022 FIX: cards podem vir como objeto no Firebase.
    // ✅ PATCH-11: Validar cards com conteúdo real
    const hasFlashcards = useMemo(() => {
        const decksArray = Array.isArray(flashcardDecks)
            ? flashcardDecks
            : Object.values(flashcardDecks || {});
        return decksArray.some(d => {
            const cards = Array.isArray(d?.cards)
                ? d.cards
                : Object.values(d?.cards || {});
            return cards.some(c => c && (c.front || c.back));
        });
    }, [flashcardDecks]);

    const hasData = hasStudyLogs || hasSimuladoHistory || hasFlashcards;

    return (
        <PageErrorBoundary pageName="Estatísticas">
            <div className="space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                                <span className="text-2xl">📊</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Estatísticas</h1>
                        </div>
                        <p className="text-slate-400 font-medium ml-2">Sua performance quantificada.</p>
                    </div>
                </div>

                {!hasData ? (
                    <div className="flex items-center justify-center min-h-[45vh] p-4">
                        <div className="glass p-8 sm:p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl max-w-md w-full">
                            <div className="text-5xl mb-4 opacity-80">📊</div>
                            <p className="font-black uppercase tracking-wider text-sm text-slate-200 mb-2">
                                Aguardando dados
                            </p>
                            <p className="text-xs text-slate-400 mb-0 leading-relaxed">
                                Registe horas de estudo, simulados ou flashcards para gerar relatórios e análises detalhadas.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {(hasSimuladoHistory || hasFlashcards) && <VerifiedStats categories={categories} user={user} flashcardDecks={flashcardDecks} />}

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
                                        <div className="flex-1">
                                            <EvolucaoFocoChart data={focusData} />
                                        </div>
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
                                        <div className="flex-1">
                                            <HorasDisciplinaChart data={subjectData} />
                                        </div>
                                    </div>
                                </div>

                                <WeeklyAnalysis studyLogs={studyLogs} categories={categories} />
                            </>
                        )}
                    </>
                )}
            </div>
        </PageErrorBoundary>
    );
}
