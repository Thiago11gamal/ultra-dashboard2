import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { reconcileContestCategoriesHistory } from '../utils/simuladoReconciler';
import { isSubjectMatch, normalize } from '../utils/normalization';

export default function Notes() {
    const navigate = useNavigate();
    const showToast = useToast();
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    const startPomodoroSession = useAppStore(state => state.startPomodoroSession);
    
    // FIX: Evitamos recriar o array `|| []` em cada renderização para não quebrar a memoização do useMemo
    const categoriesRaw = activeContest?.categories;
    const simuladoRowsRaw = activeContest?.simuladoRows;
    const contestMaxScore = activeContest?.maxScore ?? activeContest?.settings?.maxScore;
    const contestMinScore = activeContest?.minScore ?? activeContest?.settings?.minScore;
    const contestPenaltyPerWrong = activeContest?.penaltyPerWrong ?? activeContest?.settings?.penaltyPerWrong;

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) via shared pure reconciler.
    const enhancedCategories = useMemo(
        () => reconcileContestCategoriesHistory(
            categoriesRaw,
            simuladoRowsRaw,
            contestMaxScore,
            contestMinScore,
            { penaltyPerWrong: contestPenaltyPerWrong }
        ),
        [categoriesRaw, simuladoRowsRaw, contestMaxScore, contestMinScore, contestPenaltyPerWrong]
    );

    const maxScore = useMemo(() => {
        const parsedContestMax = Number(contestMaxScore);
        if (contestMaxScore !== null && contestMaxScore !== undefined && String(contestMaxScore).trim() !== '' && Number.isFinite(parsedContestMax) && parsedContestMax > 0) {
            return parsedContestMax;
        }
        const scores = enhancedCategories
            .map(c => Number(c?.maxScore))
            .filter(s => Number.isFinite(s) && s > 0);
        return scores.length > 0 ? Math.max(...scores) : 100;
    }, [enhancedCategories, contestMaxScore]);

    const minScore = useMemo(() => {
        const hasContestMin =
            contestMinScore !== null &&
            contestMinScore !== undefined &&
            typeof contestMinScore !== 'boolean' &&
            String(contestMinScore).trim() !== '' &&
            Number.isFinite(Number(contestMinScore));
        if (hasContestMin) return Number(contestMinScore);
        const catMins = enhancedCategories
            .map(c => c?.minScore)
            .filter(v => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v)))
            .map(Number);
        return catMins.length > 0 ? Math.min(...catMins) : 0;
    }, [enhancedCategories, contestMinScore]);

    const handleStartTopicStudy = useCallback((categoryName, topicName) => {
        const matchedCat = enhancedCategories.find(c => c && isSubjectMatch(categoryName, c.name)) || enhancedCategories[0];
        const rawTasks = matchedCat?.tasks || [];
        const tasks = (Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks || {})).filter(Boolean);
        const normTopic = normalize(topicName || '');
        const matchedTask = tasks.find(t => normalize(t.title || t.text || '') === normTopic) ||
            tasks.find(t => normalize(t.title || t.text || '').includes(normTopic));

        if (typeof startPomodoroSession === 'function') {
            startPomodoroSession({
                categoryId: matchedCat?.id || categoryName || 'geral',
                taskId: matchedTask?.id || topicName || 'estudo-pareto',
                category: matchedCat?.name || categoryName || 'Geral',
                task: matchedTask ? (matchedTask.title || matchedTask.text) : (topicName || 'Revisão Focada'),
                priority: 'high',
                source: 'notes'
            });
            showToast(`Foco iniciado: ${categoryName} — ${topicName}`, 'success');
            navigate('/pomodoro');
        }
    }, [enhancedCategories, startPomodoroSession, showToast, navigate]);

    const handleStartFocusedSimulado = useCallback((categoryName, topicName) => {
        const matchedCat = enhancedCategories.find(c => c && isSubjectMatch(categoryName, c.name));
        navigate('/simulados', {
            state: {
                focusDrill: {
                    categoryId: matchedCat?.id || null,
                    subject: matchedCat?.name || categoryName || 'Geral',
                    topic: topicName || 'Geral'
                }
            }
        });
    }, [enhancedCategories, navigate]);

    const handleCreateTopicFlashcard = useCallback((categoryName, topicName) => {
        const matchedCat = enhancedCategories.find(c => c && isSubjectMatch(categoryName, c.name));
        navigate('/flashcards', {
            state: {
                focusSubject: matchedCat?.name || categoryName || 'Geral',
                focusCategoryId: matchedCat?.id || null,
                prefillCard: {
                    deckName: `Pontos Cegos — ${matchedCat?.name || categoryName || 'Geral'}`,
                    front: `[PONTO CRÍTICO] ${topicName}: quais são as regras e exceções mais cobradas?`,
                    back: ''
                }
            }
        });
    }, [enhancedCategories, navigate]);

    return (<PageErrorBoundary pageName="Notas">
        <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance
                categories={enhancedCategories}
                maxScore={maxScore}
                minScore={minScore}
                onStartStudy={handleStartTopicStudy}
                onStartSimulado={handleStartFocusedSimulado}
                onCreateFlashcard={handleCreateTopicFlashcard}
            />
            <ParetoAnalysis
                categories={enhancedCategories}
                maxScore={maxScore}
                minScore={minScore}
                onStartStudy={handleStartTopicStudy}
                onStartSimulado={handleStartFocusedSimulado}
                onCreateFlashcard={handleCreateTopicFlashcard}
            />
        </div>
    </PageErrorBoundary>);
}

