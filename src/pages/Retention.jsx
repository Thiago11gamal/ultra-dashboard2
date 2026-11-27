import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useState, useRef, useCallback } from 'react';
import RetentionPanel from '../components/RetentionPanel';
import { AnaliseRetencaoChart } from '../components/charts/Analytics/AnaliseRetencaoChart';
import { mapRetentionData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { BookOpen, Play } from 'lucide-react';
import DueForecast from '../components/DueForecast';
import ConfirmModal from '../components/ConfirmModal';
import { getFlashcardDueTodayCount, getFlashcardMasteryPct, getFlashcardTotalCards, getFlashcardDeckCount } from '../utils/analytics';
import { normalizeArray, toFiniteNumber } from '../utils/retentionCore';
import { estimateEmpiricalHalfLife } from '../engine/adaptive/empiricalRetention';
import { reconcileContestCategoriesHistory, isRealSimuladoRow } from '../utils/simuladoReconciler';

export default function Retention() {
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: ''
    });

    // useRef para evitar stale closure no callback do modal
    const pendingCategoryRef = useRef(null);

    const rawCategories = useAppStore(useShallow(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        const list = activeContest?.categories || [];
        return normalizeArray(list).filter(cat => cat && (cat.id || cat.name));
    }));

    const simuladoRows = useAppStore(useShallow(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        return normalizeArray(activeContest?.simuladoRows).filter(Boolean);
    }));

    const contestPenalty = useAppStore(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        return activeContest?.penaltyPerWrong ?? 0;
    });

    const flashcardDecks = useAppStore(useShallow(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        const rawDecks = activeContest?.flashcardDecks || [];
        return normalizeArray(rawDecks).filter(Boolean);
    }));

    const studyLogs = useAppStore(useShallow(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        return normalizeArray(activeContest?.studyLogs).filter(Boolean);
    }));

    const contestMinScore = useAppStore(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        return activeContest?.minScore ?? activeContest?.settings?.minScore ?? 0;
    });

    const contestMaxScore = useAppStore(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        return activeContest?.maxScore ?? activeContest?.settings?.maxScore ?? 100;
    });

    const categories = useMemo(() => {
        if (!rawCategories.length || !simuladoRows.some(isRealSimuladoRow)) {
            return rawCategories;
        }
        return reconcileContestCategoriesHistory(rawCategories, simuladoRows, contestMaxScore, contestMinScore, {
            penaltyPerWrong: Number(contestPenalty) || 0
        });
    }, [rawCategories, simuladoRows, contestMaxScore, contestMinScore, contestPenalty]);

    const safeDecks = useMemo(() => normalizeArray(flashcardDecks).map(deck => ({
        ...deck,
        cards: normalizeArray(deck?.cards)
    })), [flashcardDecks]);

    const navigate = useNavigate();
    const showToast = useToast();
    const startPomodoroSession = useAppStore(state => state.startPomodoroSession);

    const chartData = useMemo(
        () => mapRetentionData(categories, { studyLogs, minScore: contestMinScore, maxScore: contestMaxScore }),
        [categories, studyLogs, contestMinScore, contestMaxScore]
    );
    const empiricalProfiles = useMemo(
        () => categories
            .filter((cat) => {
                const hasHistory = normalizeArray(cat?.simuladoStats?.history).some(
                    (h) => h && h.valid !== false && h.validated !== false
                );
                return hasHistory;
            })
            .map((cat) => ({
                id: cat.id || cat.name,
                name: cat.name,
                color: cat.color || '#6366f1',
                ...estimateEmpiricalHalfLife(cat, { studyLogs, minScore: contestMinScore, maxScore: contestMaxScore }),
            })),
        [categories, studyLogs, contestMinScore, contestMaxScore]
    );

    const srsIndicators = useMemo(() => {
        const totalCards = getFlashcardTotalCards(safeDecks);
        const due = getFlashcardDueTodayCount(safeDecks);
        const mastery = getFlashcardMasteryPct(safeDecks);

        const reviews = safeDecks.reduce((sum, deck) => {
            return sum + normalizeArray(deck?.cards).reduce((acc, card) => {
                return acc + Math.max(0, toFiniteNumber(card?.reviews, 0));
            }, 0);
        }, 0);

        return {
            decks: getFlashcardDeckCount(safeDecks),
            cards: totalCards,
            dueToday: due,
            mastery,
            totalReviews: reviews
        };
    }, [safeDecks]);

    const closeConfirmModal = useCallback(() => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        pendingCategoryRef.current = null;
    }, []);

    const handleConfirmSession = useCallback(() => {
        const cat = pendingCategoryRef.current;

        closeConfirmModal();

        if (!cat?.id) {
            showToast('Categoria inválida para retenção.', 'warning');
            return;
        }

        const taskName = cat.selectedTask
            ? (cat.selectedTask.title || cat.selectedTask.text || 'Estudo')
            : cat.name;

        try {
            if (typeof startPomodoroSession !== 'function') {
                showToast('Sessão de estudo indisponível no momento.', 'error');
                return;
            }
            if (cat.selectedTask) {
                startPomodoroSession({
                    categoryId: cat.id,
                    taskId: cat.selectedTask.id || cat.selectedTask.text || `task-${cat.id}`,
                    category: cat.name,
                    task: taskName,
                    priority: cat.selectedTask.priority || 'normal',
                    source: 'retention'
                });
            } else {
                startPomodoroSession({
                    categoryId: cat.id,
                    taskId: cat.id || `cat-${cat.name}`,
                    category: cat.name,
                    task: `${cat.name}: Revisão Geral`,
                    priority: 'normal',
                    source: 'retention'
                });
            }

            navigate('/pomodoro');
        } catch (err) {
            console.error('Erro ao iniciar sessão de estudo:', err);
            showToast('Não foi possível iniciar a sessão de estudo.', 'error');
        }
    }, [closeConfirmModal, startPomodoroSession, navigate, showToast]);

    const handleSelectCategory = (cat) => {
        if (!cat?.id) {
            showToast('Categoria inválida para retenção.', 'warning');
            return;
        }

        const taskName = cat.selectedTask
            ? (cat.selectedTask.title || cat.selectedTask.text || 'Estudo')
            : cat.name;

        pendingCategoryRef.current = cat;
        setConfirmModal({
            isOpen: true,
            title: 'Iniciar Sessão de Estudo',
            message: `Iniciar sessão de estudo para "${taskName}"?`
        });
    };

    return (<PageErrorBoundary pageName="Retenção">
        <div className="space-y-6">
            <div className="tour-step-10">
                <RetentionPanel
                    categories={categories}
                    studyLogs={studyLogs}
                    minScore={contestMinScore}
                    maxScore={contestMaxScore}
                    onSelectCategory={handleSelectCategory}
                />
            </div>
            
            <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-100/5 dark:bg-slate-900/40 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/5">
                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-white uppercase tracking-widest">Análise de Decaimento Cronológico</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold">Relatório Comparativo: Tempo vs Retenção de Memória</p>
                    </div>
                </div>
                <AnaliseRetencaoChart data={chartData} />
            </div>

            {/* Flashcards SRS como Indicador de Retenção */}
            {srsIndicators.cards > 0 && (
                <div className="glass p-5 rounded-3xl border border-amber-500/20 bg-amber-950/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <BookOpen size={18} className="text-amber-400" />
                        </div>
                        <div className="font-black text-white">SRS Flashcards — Indicador de Retenção Ativa</div>
                        <div className="ml-auto text-xs text-amber-400">{srsIndicators.decks} decks · {srsIndicators.cards} cartões</div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <div className="uppercase text-[10px] text-slate-500">Revisões Acumuladas</div>
                            <div className="text-2xl font-black text-amber-300">{srsIndicators.totalReviews}</div>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <div className="uppercase text-[10px] text-slate-500">Domínio (Mastery)</div>
                            <div className="text-2xl font-black text-emerald-400">{srsIndicators.mastery}%</div>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <div className="uppercase text-[10px] text-slate-500">A Revisar Hoje</div>
                            <div className={`text-2xl font-black ${srsIndicators.dueToday ? 'text-orange-400' : 'text-emerald-400'}`}>{srsIndicators.dueToday}</div>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10 text-xs flex flex-col justify-between gap-2">
                            <span>
                                {srsIndicators.dueToday > 0
                                    ? 'Use a Repetição Espaçada para combater o esquecimento ativo.'
                                    : 'Parabéns — sua curva de retenção SRS está saudável.'}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    const firstDeckWithDue = safeDecks.find(d => Array.isArray(d.cards) && d.cards.length > 0);
                                    navigate('/flashcards', firstDeckWithDue ? {
                                        state: {
                                            focusSubject: firstDeckWithDue.subject || firstDeckWithDue.name,
                                            focusCategoryId: firstDeckWithDue.categoryId || null,
                                            autoStartReview: srsIndicators.dueToday > 0
                                        }
                                    } : undefined);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/35 text-amber-200 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                                <Play size={12} className="fill-current" />
                                {srsIndicators.dueToday > 0 ? `Revisar ${srsIndicators.dueToday} Agora` : 'Abrir Decks FSRS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Meia-Vida Empírica Calibrada por Disciplina (Bayesian Shrinkage) */}
            {empiricalProfiles.length > 0 && (
                <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">
                                Meia-Vida Empírica Calibrada (Auto-Ajuste por Matéria)
                            </h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Combina a meia-vida teórica (prior) com a queda real observada nos seus simulados via shrinkage bayesiano
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {empiricalProfiles.map((prof) => (
                            <div key={prof.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: prof.color }} />
                                        <span className="text-xs font-bold text-white truncate">{prof.name}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-indigo-300 shrink-0">
                                        {prof.effectiveHalfLife}d
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                    <span>Prior {prof.priorHalfLife}d {prof.empiricalHalfLife ? `→ Emp. ${prof.empiricalHalfLife}d` : ''}</span>
                                    <span className={prof.profile === 'fast_decay' ? 'text-rose-400 font-bold' : prof.profile === 'high_retention' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                        {prof.profileLabel}
                                    </span>
                                </div>
                                <div className="pt-1.5 flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectCategory({ id: prof.id, name: prof.name })}
                                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold transition-colors cursor-pointer"
                                    >
                                        <Play size={10} className="fill-current" /> Pomodoro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/flashcards', {
                                            state: {
                                                focusSubject: prof.name,
                                                focusCategoryId: prof.id,
                                                autoStartReview: true
                                            }
                                        })}
                                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-[10px] font-bold transition-colors cursor-pointer"
                                    >
                                        <BookOpen size={10} /> Flashcards
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* NOVA FEATURE: Previsão de Cartões a Vencer (Due Forecast) */}
            <DueForecast decks={safeDecks} horizon={14} />
        </div>

        {/* Custom Confirmation Modal */}
        <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={closeConfirmModal}
            onConfirm={handleConfirmSession}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText="Iniciar Sessão"
            cancelText="Cancelar"
            type="primary"
            icon={Play}
        />
    </PageErrorBoundary>);
}


