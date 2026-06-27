import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import RetentionPanel from '../components/RetentionPanel';
import { AnaliseRetencaoChart } from '../components/charts/Analytics/AnaliseRetencaoChart';
import { mapRetentionData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { BookOpen } from 'lucide-react';
import DueForecast from '../components/DueForecast';
import { getFlashcardDueTodayCount, getFlashcardMasteryPct, getFlashcardTotalCards, getFlashcardDeckCount } from '../utils/analytics';

export default function Retention() {
    const categories = useAppStore(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        return activeContest?.categories || [];
    });
    const flashcardDecks = useAppStore(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        return activeContest?.flashcardDecks || [];
    });
    const navigate = useNavigate();
    const showToast = useToast();

    const chartData = useMemo(() => mapRetentionData(categories), [categories]);

    const srsIndicators = useMemo(() => {
        const decks = flashcardDecks || [];
        const totalCards = getFlashcardTotalCards(decks);
        const due = getFlashcardDueTodayCount(decks);
        const mastery = getFlashcardMasteryPct(decks);   // standardized >=6
        const reviews = decks.reduce((sum, d) => sum + (d.cards || []).reduce((r, c) => r + (c.reviews || 0), 0), 0);
        return {
            decks: getFlashcardDeckCount(decks),
            cards: totalCards,
            dueToday: due,
            mastery,
            totalReviews: reviews
        };
    }, [flashcardDecks]);

    const handleSelectCategory = (cat) => {
        if (!cat?.id) {
            showToast('Categoria inválida para retenção.', 'warning');
            return;
        }
        const targetTaskId = cat.selectedTask ? cat.selectedTask.id : cat.tasks?.[0]?.id;
        
        // FIX: Tratamento correto caso não haja tasks
        if (targetTaskId) {
            navigate('/pomodoro', { state: { categoryId: cat.id, taskId: targetTaskId, from: 'retention' } });
        } else {
            showToast(`Crie pelo menos uma tarefa em "${cat?.name || 'Sem nome'}" para iniciar os estudos.`, 'warning');
        }
    };

    return (<PageErrorBoundary pageName="Retenção">
        <div className="space-y-6">
            <div className="tour-step-10">
                <RetentionPanel
                    categories={categories}
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
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10 text-xs flex items-center">
                            {srsIndicators.dueToday > 0 ? 'Use a Repetição Espaçada para combater o esquecimento ativo.' : 'Parabéns — sua curva de retenção SRS está saudável.'}
                        </div>
                    </div>
                </div>
            )}

            {/* NOVA FEATURE: Previsão de Cartões a Vencer (Due Forecast) */}
            <DueForecast decks={flashcardDecks} horizon={14} />
        </div>
    </PageErrorBoundary>);
}

