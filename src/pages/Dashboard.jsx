import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import { SyllabusBurndownChart } from '../components/charts/Analytics/SyllabusBurndownChart';
import { AdaptivePulseStrip } from '../components/dashboard/AdaptivePulseStrip';
import SyllabusImporterModal from '../components/ai/SyllabusImporterModal';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useClockDate } from '../hooks/useClock';
import { toArray } from '../utils/normalize';
import { normalize } from '../utils/normalization';
import { normalizePriority } from '../utils/colorHelper';
import { clearUrgencyCache, clearTopicsCache } from '../utils/coachCaches';
import { clearMcCache } from '../utils/coachAdaptive';
import { resolveUserTargetScorePoints } from '../utils/scoreHelper';
import { getDateKey } from '../utils/dateHelper';
import { removeCategoryTombstone } from '../utils/tombstones';
import { reconcileContestCategoriesHistory, isRealSimuladoRow } from '../utils/simuladoReconciler';

export default function Dashboard() {
    // P06 PERF FIX: Group store actions with useShallow to prevent re-rendering Dashboard on every store mutation
    const {
        setData, toggleTask, updateTask, deleteTask, addCategory,
        deleteCategory, addTask, togglePriority,
        startPomodoroSession, setDashboardFilter, importCategory
    } = useAppStore(useShallow(state => ({
        setData: state.setData,
        toggleTask: state.toggleTask,
        updateTask: state.updateTask,
        deleteTask: state.deleteTask,
        addCategory: state.addCategory,
        deleteCategory: state.deleteCategory,
        addTask: state.addTask,
        togglePriority: state.togglePriority,
        startPomodoroSession: state.startPomodoroSession,
        setDashboardFilter: state.setDashboardFilter,
        importCategory: state.importCategory
    })));

    const showToast = useToast();
    const navigate = useNavigate();
    const todayDate = useClockDate();
    const dayTick = React.useMemo(() => getDateKey(todayDate), [todayDate]);

    const filter = useAppStore(state => state.appState?.dashboardFilter || 'all');
    const isHydrated = useAppStore(state => state.appState?.isHydrated);
    const activeId = useAppStore(state => state.appState?.activeId);

    const [priorityFilterState, setPriorityFilterState] = React.useState({ contestId: null, value: 'all' });
    const priorityFilter = priorityFilterState.contestId === activeId ? priorityFilterState.value : 'all';
    const setPriorityFilter = React.useCallback((nextValue) => {
        setPriorityFilterState({ contestId: activeId, value: nextValue || 'all' });
    }, [activeId]);

    const contestsRaw = useAppStore(state => state.appState?.contests);
    const contests = React.useMemo(() => contestsRaw || {}, [contestsRaw]);

    const {
        categories,
        simulados,
        simuladoRows,
        rawStudyLogs,
        user,
        pomodorosCompleted,
        flashcardDecks,
        settings,
        studySessions,
        contestMaxScore,
        contestMinScore,
        contestPenalty
    } = useAppStore(useShallow(state => {
        const currentActiveId = state.appState?.activeId;
        const contest = state.appState?.contests?.[currentActiveId] || {};
        return {
            categories: contest.categories,
            simulados: contest.simulados,
            simuladoRows: contest.simuladoRows,
            rawStudyLogs: contest.studyLogs,
            user: contest.user,
            pomodorosCompleted: contest.pomodorosCompleted,
            flashcardDecks: contest.flashcardDecks,
            settings: contest.settings,
            studySessions: contest.studySessions,
            contestMaxScore: contest.maxScore,
            contestMinScore: contest.minScore,
            contestPenalty: contest.penaltyPerWrong
        };
    }));

    const studyLogs = React.useMemo(() => {
        return toArray(rawStudyLogs);
    }, [rawStudyLogs]);

    const safeSimulados = React.useMemo(() => {
        return toArray(simulados);
    }, [simulados]);

    const safeSimuladoRows = React.useMemo(() => {
        return toArray(simuladoRows);
    }, [simuladoRows]);

    const safeCategories = React.useMemo(() => {
        const normalizedCats = toArray(categories).map(c => ({
            ...c,
            tasks: toArray(c.tasks).filter(t => t && typeof t === 'object' && (t.title || t.text || t.id))
        }));
        if (!normalizedCats.length || !safeSimuladoRows.some(isRealSimuladoRow)) {
            return normalizedCats;
        }
        return reconcileContestCategoriesHistory(
            normalizedCats,
            safeSimuladoRows,
            Number(contestMaxScore) || 100,
            Number.isFinite(Number(contestMinScore)) ? Number(contestMinScore) : 0,
            { penaltyPerWrong: Number(contestPenalty) || 0 }
        );
    }, [categories, safeSimuladoRows, contestMaxScore, contestMinScore, contestPenalty]);

    const safeFlashcardDecks = React.useMemo(() => {
        return toArray(flashcardDecks);
    }, [flashcardDecks]);

    const safeStudySessions = React.useMemo(() => {
        return toArray(studySessions);
    }, [studySessions]);

    const data = React.useMemo(() => ({
        categories: safeCategories,
        simulados: safeSimulados,
        simuladoRows: safeSimuladoRows,
        studyLogs: Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {}),
        user,
        pomodorosCompleted,
        flashcardDecks: safeFlashcardDecks,
        settings: settings || {},
        studySessions: safeStudySessions,
        maxScore: contestMaxScore,
        minScore: contestMinScore
    }), [
        safeCategories,
        safeSimulados,
        safeSimuladoRows,
        studyLogs,
        user,
        pomodorosCompleted,
        safeFlashcardDecks,
        settings,
        safeStudySessions,
        contestMaxScore,
        contestMinScore
    ]);

        const setGoalDate = React.useCallback((d) => {
            setData(contest => {
                if (!contest) return contest;

        return {
            ...contest,
            user: {
                ...(contest.user || {}),
                goalDate: d || null
            }
        };
    });
    clearUrgencyCache();
    clearTopicsCache();
    clearMcCache();
    if (d) {
        showToast('Data da prova atualizada!', 'success');
    } else {
        showToast('Data da prova removida.', 'info');
    }
}, [setData, showToast]);

const handleStartStudying = React.useCallback((categoryId, taskId, taskMeta = null) => {
    const storeState = useAppStore.getState().appState;
    const currentCategories = storeState?.contests?.[storeState?.activeId]?.categories || [];
    const safeCategoriesList = Array.isArray(currentCategories)
        ? currentCategories
        : Object.values(currentCategories || {});
    const cat = safeCategoriesList.find(c => c && (c.id === categoryId || c.name === categoryId));
    const syllabusTask = toArray(cat?.tasks).find(t => t && (
        (Boolean(taskId) && t.id === taskId) ||
        (Boolean(taskId) && t.text === taskId) ||
        (Boolean(taskId) && t.title === taskId)
    ));
    const tsk = syllabusTask || (taskMeta && typeof taskMeta === 'object' ? taskMeta : null);

    if (!cat || !tsk) return;

    const currentActiveSubject = storeState?.pomodoro?.activeSubject;
    const categoryMatchesActive = Boolean(currentActiveSubject && (
        (Boolean(cat.id) && currentActiveSubject.categoryId === cat.id) ||
        (Boolean(cat.name) && (currentActiveSubject.category === cat.name || currentActiveSubject.categoryId === cat.name))
    ));
    const taskMatchesActive = Boolean(currentActiveSubject && categoryMatchesActive && (
        (Boolean(taskMeta?.agendaEventId) && currentActiveSubject.agendaEventId === taskMeta.agendaEventId) ||
        (Boolean(tsk.id) && currentActiveSubject.taskId === tsk.id) ||
        (Boolean(taskId) && currentActiveSubject.taskId === taskId) ||
        (Boolean(currentActiveSubject.task) && (
            (Boolean(tsk.title) && currentActiveSubject.task === tsk.title) ||
            (Boolean(tsk.text) && currentActiveSubject.task === tsk.text)
        ))
    ));
    const hasRunningOrProgress = Boolean(
        storeState?.pomodoro?.isRunning ||
        (storeState?.pomodoro?.completedCycles || 0) > 0 ||
        (storeState?.pomodoro?.accumulatedMinutes || 0) > 0
    );
    const isAlreadyActive = taskMatchesActive && (tsk.status === 'studying' || Boolean(tsk.completed) || hasRunningOrProgress);
    if (isAlreadyActive) {
        navigate('/pomodoro');
        return;
    }

    // startPomodoroSession sincroniza task.status ('studying' apenas para tarefas pendentes)
    // e ativa o Pomodoro atomicamente em uma única transação/entrada de Undo.
    startPomodoroSession({
        categoryId: cat.id || cat.name,
        taskId: tsk.id || taskId,
        category: cat.name,
        task: tsk.title || tsk.text || 'Estudo',
        priority: normalizePriority(tsk.priority),
        ...(taskMeta?.agendaEventId ? { agendaEventId: taskMeta.agendaEventId } : {}),
        ...(!syllabusTask && taskMeta?.isAgendaOnlyBlock ? { isAgendaOnlyBlock: true } : {}),
        source: 'dashboard'
    });

    const taskLabel = tsk.title || tsk.text || 'Estudo';
    showToast(`Iniciando estudos: ${cat.name} - ${taskLabel}`, 'success');
    navigate('/pomodoro');
}, [startPomodoroSession, showToast, navigate]);

const [bannerDismissed, setBannerDismissed] = React.useState(() => {
    try {
        return localStorage.getItem('dismissed_feature_banner_v1') === 'true';
    } catch {
        return false;
    }
});

const handleDismissBanner = React.useCallback(() => {
    setBannerDismissed(true);
    try {
        localStorage.setItem('dismissed_feature_banner_v1', 'true');
    } catch {
        // ignore
    }
}, []);

const hasTasks = React.useMemo(() => safeCategories.some(c => (c.tasks || []).length > 0), [safeCategories]);
const [showSyllabusImporter, setShowSyllabusImporter] = React.useState(false);

const handleOpenSyllabusImporter = React.useCallback(() => setShowSyllabusImporter(true), []);
const handleCloseSyllabusImporter = React.useCallback(() => setShowSyllabusImporter(false), []);
const handleClearPriorityFilter = React.useCallback(() => {
    setPriorityFilterState({ contestId: activeId, value: 'all' });
}, [activeId]);

const pulseScoreConfig = React.useMemo(() => {
    const dashMin = Number.isFinite(Number(data.minScore ?? data.settings?.minScore))
        ? Number(data.minScore ?? data.settings?.minScore)
        : 0;
    const rawDashMax = Number(data.maxScore ?? data.settings?.maxScore);
    const dashMax = Number.isFinite(rawDashMax) && rawDashMax > dashMin ? rawDashMax : Math.max(dashMin + 1, 100);
    const dashTarget = resolveUserTargetScorePoints(data.user, dashMin, dashMax, 0.8);
    return { dashMin, dashMax, dashTarget };
}, [data.minScore, data.maxScore, data.settings?.minScore, data.settings?.maxScore, data.user]);

const handleImportSyllabusCategories = React.useCallback((newCategories = []) => {
    if (!Array.isArray(newCategories) || newCategories.length === 0) return;
    let addedCategoriesCount = 0;
    let mergedCategoriesCount = 0;
    let addedTopicsCount = 0;
    const currentActiveContestId = useAppStore.getState().appState?.activeId;

    setData((contest) => {
        if (!contest) return contest;
        const nowIso = new Date().toISOString();
        const inheritedMax = Number(contest.maxScore) > 0 ? Number(contest.maxScore) : 100;
        const inheritedMin = Number.isFinite(Number(contest.minScore)) ? Number(contest.minScore) : 0;
        const existing = Array.isArray(contest.categories)
            ? contest.categories
            : Object.values(contest.categories || {});
        const merged = [...existing];

        newCategories.forEach((incoming) => {
            if (!incoming || !incoming.name) return;
            const normIncomingName = normalize(incoming.name);
            if (!normIncomingName) return;
            removeCategoryTombstone(incoming.id, incoming.name, currentActiveContestId);

            const idx = merged.findIndex((c) => c && normalize(c.name || '') === normIncomingName);
            if (idx >= 0) {
                const targetCat = merged[idx];
                removeCategoryTombstone(targetCat.id, targetCat.name, currentActiveContestId);
                const curTasks = Array.isArray(targetCat.tasks) ? targetCat.tasks : Object.values(targetCat.tasks || {});
                const dedupTasks = [...curTasks];
                const readdedNorms = new Set();
                let addedForCat = 0;
                (incoming.tasks || []).forEach((t) => {
                    const normT = normalize(String(t?.text || t?.title || ''));
                    if (!normT) return;
                    if (!dedupTasks.some((x) => x && normalize(String(x.text || x.title || '')) === normT)) {
                        dedupTasks.push(t);
                        readdedNorms.add(normT);
                        addedForCat += 1;
                        addedTopicsCount += 1;
                    }
                });
                const nextDeletedTaskIds = Array.isArray(targetCat.deletedTaskIds) && readdedNorms.size > 0
                    ? targetCat.deletedTaskIds.filter((entry) => entry && !readdedNorms.has(normalize(String(entry.text || ''))))
                    : targetCat.deletedTaskIds;
                const weightChanged = Boolean(incoming.weight && incoming.weight !== targetCat.weight);
                const groupChanged = Boolean(incoming.examGroup && incoming.examGroup !== targetCat.examGroup);
                if (addedForCat > 0 || weightChanged || groupChanged) {
                    mergedCategoriesCount += 1;
                }
                merged[idx] = {
                    ...targetCat,
                    weight: incoming.weight || targetCat.weight,
                    ...(incoming.examGroup ? { examGroup: incoming.examGroup } : {}),
                    ...(nextDeletedTaskIds !== undefined ? { deletedTaskIds: nextDeletedTaskIds } : {}),
                    tasks: dedupTasks,
                    lastUpdated: nowIso,
                    updatedAt: nowIso,
                };
            } else {
                const incomingTasks = Array.isArray(incoming.tasks) ? incoming.tasks : [];
                addedCategoriesCount += 1;
                addedTopicsCount += incomingTasks.length;
                merged.push({
                    ...incoming,
                    maxScore: Number(incoming.maxScore) > 0 ? Number(incoming.maxScore) : inheritedMax,
                    minScore: Number.isFinite(Number(incoming.minScore)) ? Number(incoming.minScore) : inheritedMin,
                    minCutoff: incoming.minCutoff ?? null,
                    lastStudiedAt: incoming.lastStudiedAt ?? null,
                    simuladoStats: incoming.simuladoStats || { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: '-' },
                    createdAt: incoming.createdAt || nowIso,
                    lastUpdated: nowIso,
                    updatedAt: nowIso,
                });
            }
        });
        return { ...contest, categories: merged, lastUpdated: nowIso };
    });
    clearUrgencyCache();
    clearTopicsCache();
    clearMcCache();
    if (addedCategoriesCount === 0 && addedTopicsCount === 0 && mergedCategoriesCount === 0) {
        showToast('Nenhum item novo: todas as matérias e assuntos já existem no painel.', 'info');
    } else if (addedCategoriesCount > 0) {
        showToast(
            `Edital importado: ${addedCategoriesCount} ${addedCategoriesCount === 1 ? 'matéria nova' : 'matérias novas'} e ${addedTopicsCount} ${addedTopicsCount === 1 ? 'assunto' : 'assuntos'}!`,
            'success'
        );
    } else {
        showToast(
            `Edital mesclado: ${addedTopicsCount} ${addedTopicsCount === 1 ? 'novo assunto adicionado' : 'novos assuntos adicionados'} em ${mergedCategoriesCount} ${mergedCategoriesCount === 1 ? 'matéria' : 'matérias'}!`,
            'success'
        );
    }
}, [setData, showToast]);

if (!isHydrated) {
    return (
        <div className="flex items-center justify-center h-[70vh] w-full animate-fade-in">
            <div className="flex flex-col items-center gap-5 p-12">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-indigo-300 font-semibold text-sm">
                        Calibrando o motor
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        Carregando seu perfil de aprendizagem
                    </p>
                </div>
            </div>
        </div>
    );
}

return (
    <PageErrorBoundary pageName="Meu Painel">
        <div className="space-y-4 sm:space-y-5 animate-fade-in">
            {!bannerDismissed && (
                <div className="hidden lg:flex items-center justify-between text-[13px] text-teal-300/90 bg-teal-500/10 border border-teal-500/20 px-3.5 py-2 rounded-xl mb-1 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                        <span>
                            <strong className="font-semibold text-teal-200">Novo:</strong>{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/flashcards')}
                                className="font-semibold text-teal-200 hover:text-white underline underline-offset-2 decoration-teal-400/50 hover:decoration-white transition-colors cursor-pointer"
                                title="Acessar Flashcards"
                            >
                                Flashcards
                            </button>
                            {' '}e{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/agenda')}
                                className="font-semibold text-teal-200 hover:text-white underline underline-offset-2 decoration-teal-400/50 hover:decoration-white transition-colors cursor-pointer"
                                title="Acessar Agenda de Estudos"
                            >
                                Agenda de Estudos
                            </button>
                            {' '}disponíveis no menu
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/flashcards')}
                            className="text-xs text-teal-200 hover:text-white bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium flex items-center gap-1.5"
                        >
                            <span>Acessar Flashcards</span>
                            <ArrowRight size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={handleDismissBanner}
                            className="text-teal-400/60 hover:text-teal-200 p-0.5 rounded-md hover:bg-teal-500/20 transition-colors cursor-pointer"
                            title="Dispensar aviso"
                            aria-label="Dispensar aviso"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            <AdaptivePulseStrip
                categories={data.categories}
                studyLogs={data.studyLogs}
                flashcardDecks={data.flashcardDecks}
                targetScore={pulseScoreConfig.dashTarget}
                minScore={pulseScoreConfig.dashMin}
                maxScore={pulseScoreConfig.dashMax}
                onOpenSyllabusImporter={handleOpenSyllabusImporter}
                dayTick={dayTick}
            />

            <div className="tour-step-4">
                <StatsCards data={data} onUpdateGoalDate={setGoalDate} dayTick={dayTick} />
            </div>

            {hasTasks && (
                <div className="tour-step-5">
                    <NextGoalCard
                        categories={data.categories}
                        simulados={data.simulados}
                        simuladoRows={data.simuladoRows}
                        studyLogs={data.studyLogs}
                        maxScore={data.maxScore ?? data.settings?.maxScore}
                        minScore={data.minScore ?? data.settings?.minScore}
                        onStartStudying={handleStartStudying}
                        dayTick={dayTick}
                    />
                </div>
            )}

            <PriorityProgress
                categories={data.categories}
                activePriority={priorityFilter}
                onSelectPriority={setPriorityFilter}
            />

            {hasTasks && (
                <SyllabusBurndownChart categories={data.categories} user={data.user} dayTick={dayTick} />
            )}

            <div className="tour-step-6">
                <Checklist
                    categories={data.categories}
                    onToggleTask={toggleTask}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                    onAddCategory={addCategory}
                    onDeleteCategory={deleteCategory}
                    onAddTask={addTask}
                    onTogglePriority={togglePriority}
                    onPlayContext={handleStartStudying}
                    showSimuladoStats
                    filter={filter}
                    setFilter={setDashboardFilter}
                    priorityFilter={priorityFilter}
                    onClearPriorityFilter={handleClearPriorityFilter}
                    onOpenSyllabusImporter={handleOpenSyllabusImporter}
                    contests={contests}
                    activeId={activeId}
                    onImportCategory={importCategory}
                />
            </div>
            <SyllabusImporterModal
                isOpen={showSyllabusImporter}
                onClose={handleCloseSyllabusImporter}
                onImportCategories={handleImportSyllabusCategories}
            />
        </div>
    </PageErrorBoundary>
);
}

