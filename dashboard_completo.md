# Arquivos do Painel (Dashboard)

## src/pages/Dashboard.jsx

```jsx
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function Dashboard() {
    const setData = useAppStore(state => state.setData);
    const toggleTask = useAppStore(state => state.toggleTask);
    const deleteTask = useAppStore(state => state.deleteTask);
    const addCategory = useAppStore(state => state.addCategory);
    const deleteCategory = useAppStore(state => state.deleteCategory);
    const addTask = useAppStore(state => state.addTask);
    const togglePriority = useAppStore(state => state.togglePriority);
    const startPomodoroSession = useAppStore(state => state.startPomodoroSession);
    const setDashboardFilter = useAppStore(state => state.setDashboardFilter);
    const showToast = useToast();
    const navigate = useNavigate();

    const filter = useAppStore(state => state.appState.dashboardFilter || 'all');
    const isHydrated = useAppStore(state => state.appState.isHydrated);
    const activeId = useAppStore(state => state.appState.activeId);
    const contests = useAppStore(state => state.appState.contests || {});
    const importCategory = useAppStore(state => state.importCategory);
    
    // Otimização: Agrupar as extrações de estado para reduzir re-renders desnecessários usando useShallow
    const { categories, simulados, simuladoRows, rawStudyLogs, user, pomodorosCompleted } = useAppStore(useShallow(state => {
        const contest = state.appState.contests?.[activeId] || {};
        return {
            categories: contest.categories,
            simulados: contest.simulados,
            simuladoRows: contest.simuladoRows,
            rawStudyLogs: contest.studyLogs,
            user: contest.user,
            pomodorosCompleted: contest.pomodorosCompleted
        };
    }));

    const studyLogs = React.useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);

    const safeCategories = React.useMemo(() => {
        const cats = Array.isArray(categories) ? categories : Object.values(categories || {});
        return cats.map(c => ({ ...c, tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {}) }));
    }, [categories]);

    const safeSimulados = React.useMemo(() => {
        return Array.isArray(simulados) ? simulados : Object.values(simulados || {});
    }, [simulados]);

    const safeSimuladoRows = React.useMemo(() => {
        return Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {});
    }, [simuladoRows]);

    const data = React.useMemo(() => ({
        categories: safeCategories, simulados: safeSimulados, simuladoRows: safeSimuladoRows, studyLogs, user, pomodorosCompleted
    }), [safeCategories, safeSimulados, safeSimuladoRows, studyLogs, user, pomodorosCompleted]);

    const setGoalDate = React.useCallback((d) => setData(contest => {
        if (!contest) return contest;
        return {
            ...contest,
            user: {
                ...(contest.user || {}),
                goalDate: d || null
            }
        };
    }), [setData]);

    const handleStartStudying = React.useCallback((categoryId, taskId) => {
        const cat = data.categories?.find(c => c.id === categoryId);
        const tsk = cat?.tasks?.find(t => t.id === taskId);

        if (cat && tsk) {
            startPomodoroSession({
                categoryId: cat.id,
                taskId: tsk.id,
                category: cat.name,
                task: tsk.title || tsk.text || 'Estudo',
                priority: tsk.priority,
                source: 'dashboard'
            });

            setData(activeContest => {
                if (!activeContest || !activeContest.categories) return activeContest;
                return {
                    ...activeContest,
                    categories: activeContest.categories.map(c => {
                        return {
                            ...c,
                            tasks: (c.tasks || []).map(t => {
                                if (c.id === cat.id && t.id === tsk.id) {
                                    return { ...t, status: 'studying' };
                                }
                                if (t.status === 'studying') {
                                    return { ...t, status: undefined };
                                }
                                return t;
                            })
                        };
                    })
                };
            });
            const taskLabel = tsk.title || tsk.text || 'Estudo';
            showToast(`Iniciando estudos: ${cat.name} - ${taskLabel}`, 'success');
            navigate('/pomodoro');
        }
    }, [data.categories, startPomodoroSession, setData, showToast, navigate]);

    // ✅ DEPOIS (Barreira de Hidratação Atómica - Relaxada para permitir categorias vazias)
    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center h-[70vh] w-full animate-fade-in">
                <div className="flex flex-col items-center gap-5 p-12">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">A Calibrar Motor</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">A carregar perfil de aprendizagem</p>
                    </div>
                </div>
            </div>
        );
    }

    return (<PageErrorBoundary pageName="Dashboard">
        <div className="space-y-6 animate-fade-in">
            {/* Visual hint for new tools */}
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-teal-400/70 font-bold uppercase tracking-widest mb-1 px-1">
                <span className="inline-block w-2 h-px bg-teal-400/50"></span> NOVO: Flashcards e Agenda de Estudos disponíveis no menu
            </div>
            <div className="tour-step-4">
                <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            </div>

            <div className="tour-step-5">
                <NextGoalCard
                    categories={data.categories}
                    simulados={data.simulados || []}
                    studyLogs={data.studyLogs || []}
                    onStartStudying={handleStartStudying}
                />
            </div>

            <PriorityProgress categories={data.categories} />

            <div className="mt-4 tour-step-6">
                {/* showSimuladoStats is intentionally omitted — stats panel shown only on Tasks page */}
                <Checklist
                    categories={data.categories}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    onAddCategory={addCategory}
                    onDeleteCategory={deleteCategory}
                    onAddTask={addTask}
                    onTogglePriority={togglePriority}
                    onPlayContext={handleStartStudying}
                    filter={filter}
                    setFilter={setDashboardFilter}
                    contests={contests}
                    activeId={activeId}
                    onImportCategory={importCategory}
                />
            </div>
        </div>
    </PageErrorBoundary>);
}

```

## src/components/StatsCards.jsx

```jsx
import React, { useMemo, useRef } from 'react';
import { Activity, TrendingUp, BarChart2, Trophy, Calendar, AlertCircle, Info, BookOpen } from 'lucide-react';
import { calculateStudyStreak, analyzeSubjectBalance, analyzeEfficiency, buildAchievementStats } from '../utils/analytics';
import { getXPProgress } from '../utils/gamification';
import { formatValue } from '../utils/scoreHelper';
import { parseGoalDateUnified } from '../utils/dateHelper';

const getEfficiencyTheme = (score) => {
    // CORREÇÃO: Evitar que NaN (originado por divisão por 0 em diários vazios)
    // dispare o tema "Vermelho Crítico" de alerta caindo no "return default".
    if (!Number.isFinite(score) || score === null) {
        return { 
            glow: 'bg-slate-500/10', 
            glowHover: 'group-hover:bg-slate-500/20',
            gradient: 'from-slate-500/[0.02]',
            iconBg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
            iconColor: 'text-slate-400',
            bg: 'bg-slate-500/10', 
            border: 'border-slate-500/20' 
        }; // Tema Neutro (Cinza)
    }
    if (score >= 85) return {
        glow: 'bg-emerald-500/10',
        glowHover: 'group-hover:bg-emerald-500/20',
        gradient: 'from-emerald-500/[0.02]',
        iconBg: 'bg-green-500/10 group-hover:bg-green-500/20',
        iconColor: 'text-green-400',
    };
    if (score >= 60) return {
        glow: 'bg-yellow-500/10',
        glowHover: 'group-hover:bg-yellow-500/20',
        gradient: 'from-yellow-500/[0.02]',
        iconBg: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
        iconColor: 'text-yellow-400',
    };
    return {
        glow: 'bg-red-500/10',
        glowHover: 'group-hover:bg-red-500/20',
        gradient: 'from-red-500/[0.02]',
        iconBg: 'bg-red-500/10 group-hover:bg-red-500/20',
        iconColor: 'text-red-400',
    };
};

const getTodayDateKey = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const StatsCards = ({ data, onUpdateGoalDate }) => {
    const dateInputRef = useRef(null);
    const minGoalDate = getTodayDateKey();

    const streak = useMemo(() => calculateStudyStreak(data.studyLogs || []), [data.studyLogs]);
    const balance = useMemo(() => analyzeSubjectBalance(data.categories || []), [data.categories]);
    const efficiency = useMemo(() => analyzeEfficiency(data.categories || [], data.studyLogs || []), [data.categories, data.studyLogs]);
    const fcStats = useMemo(() => buildAchievementStats(data) || {}, [data]);

    const user = data.user || { xp: 0, level: 1 };
    const progress = useMemo(() => getXPProgress(user.xp), [user.xp]);

    const effTheme = useMemo(() => {
        const hasLogs = data.studyLogs && data.studyLogs.length > 0;
        if (!hasLogs) return {
            glow: 'bg-slate-500/10', glowHover: 'group-hover:bg-slate-500/20',
            gradient: 'from-slate-500/[0.02]', iconBg: 'bg-slate-500/10 group-hover:bg-slate-500/20',
            iconColor: 'text-slate-400',
        };
        return getEfficiencyTheme(efficiency?.score ?? 0);
    }, [efficiency?.score, data.studyLogs]);

    const daysRemaining = useMemo(() => {
        if (!user.goalDate) return null;

        const now = new Date();
        const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        localToday.setHours(12, 0, 0, 0);

        const goal = parseGoalDateUnified(user.goalDate);
        if (!goal) return null;

        const diffTime = goal.getTime() - localToday.getTime();
        // ✅ FIX: Math.ceil para não mostrar "0 dias" quando ainda há tempo
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }, [user.goalDate]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 auto-rows-auto gap-3 sm:gap-4 animate-fade-in-down">
            {/* ── Sequência ─────────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-6 sm:p-6 flex flex-col justify-between group transition-all duration-500 shadow-2xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-orange-500/10 rounded-full blur-[40px] group-hover:bg-orange-500/20 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 relative group/tooltip cursor-help">
                        <div className="p-2 bg-orange-500/10 rounded-lg group-hover/tooltip:bg-orange-500/20 transition-colors">
                            <Activity size={18} className="text-orange-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">Sequência</span>
                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors" />
                        
                        <div className="absolute top-full left-4 mt-2 w-60 max-w-[85vw] p-2.5 bg-yellow-400 text-[10px] sm:text-xs text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500">
                            <strong>Status {streak?.isActive ? 'ATIVA' : 'INATIVA'}</strong>: {streak?.isActive ? 'Você estudou hoje ou ontem, mantendo a corrente viva!' : 'Você ficou mais de 1 dia sem estudar. Comece hoje para criar uma nova corrente!'}
                        </div>
                    </div>
                    <div className="text-2xl sm:text-4xl font-black text-white mt-1 mb-2">
                        {streak?.current || 0} <span className="text-lg sm:text-2xl text-slate-300 font-bold">{(streak?.current || 0) === 1 ? 'dia' : 'dias'}</span>
                    </div>
                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-2">
                        <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-normal">
                            Recorde: {streak?.longest || 0}d
                        </div>
                        {streak?.isActive && (
                            <div className="flex items-center gap-2 text-orange-400 mt-1">
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                                <span className="text-xs sm:text-sm font-bold tracking-widest">ATIVA</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Eficiência ────────────────────────────────────────────────── */}
            <div className={`relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-6 sm:p-6 flex flex-col justify-between group transition-all duration-500 shadow-2xl`}>
                <div className={`absolute -top-10 -left-10 w-24 h-24 ${effTheme.glow} rounded-full blur-[40px] ${effTheme.glowHover} transition-all duration-700`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${effTheme.gradient} to-transparent pointer-events-none`} />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 relative group/tooltip cursor-help">
                        <div className={`p-2 ${effTheme.iconBg} rounded-lg transition-colors`}>
                            <TrendingUp size={18} className={effTheme.iconColor} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">Eficiência</span>
                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors" />
                        
                        <div className="absolute top-full left-0 mt-2 w-60 max-w-[85vw] p-2.5 bg-yellow-400 text-[10px] sm:text-xs text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500">
                            <strong>Status {(typeof efficiency?.efficiency === 'string' ? efficiency.efficiency.replace(/_/g, ' ') : 'Sem dados').toUpperCase()}</strong>: {
                                efficiency?.efficiency === 'excelente' ? 'Fluxo e velocidade de conclusão de tarefas ideais.' :
                                efficiency?.efficiency === 'boa' ? 'Bom ritmo de resolução de tarefas.' :
                                efficiency?.efficiency === 'regular' ? 'Produtividade na média. Pode melhorar o foco para concluir mais tarefas.' :
                                efficiency?.efficiency === 'precisa_melhorar' ? 'Baixa taxa de tarefas concluídas por tempo. Verifique distrações.' :
                                (efficiency?.message || 'Faça sessões com o cronômetro para medir.')
                            }
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-4xl font-black text-white mt-1 mb-2 break-words line-clamp-2 min-w-0 pb-0.5">
                        {formatValue(efficiency?.score || 0)}<span className="text-lg sm:text-2xl text-slate-300 font-bold ml-1">%</span>
                    </div>
                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-2 min-w-0">
                        <div className={`text-[10px] sm:text-xs ${effTheme.iconColor} capitalize leading-normal truncate min-w-0 font-extrabold pb-0.5`}>
                            {typeof efficiency?.efficiency === 'string' ? efficiency.efficiency.replace(/_/g, ' ') : 'Sem dados'}
                        </div>
                        {efficiency?.metrics?.minutesPerTask > 0 && (
                            <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-normal">
                                ~{efficiency.metrics.minutesPerTask} min/tarefa
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Equilíbrio ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-6 sm:p-6 flex flex-col justify-between group transition-all duration-500 shadow-2xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 relative group/tooltip cursor-help">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover/tooltip:bg-blue-500/20 transition-colors">
                            <BarChart2 size={18} className="text-blue-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">Equilíbrio</span>
                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors" />
                        
                        <div className="absolute top-full left-0 mt-2 w-60 max-w-[85vw] p-2.5 bg-yellow-400 text-[10px] sm:text-xs text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500">
                            <strong>Status {(balance?.status ? balance.status.replace(/_/g, ' ') : 'Sem Dados').toUpperCase()}</strong>: {balance?.message || 'Analisa como você divide seu tempo entre as matérias.'}
                        </div>
                    </div>
                    {/* [CORREÇÃO VISUAL-BUG-4] Separar Flex de Line-Clamp */}
                    <div className="mt-1 mb-1 min-h-[2.5rem] flex flex-col justify-center">
                        <div className={`capitalize leading-tight line-clamp-2 pb-0.5 ${balance?.status ? 'text-xl sm:text-2xl font-black text-white' : 'text-sm sm:text-base font-bold text-slate-500'}`}>
                            {balance?.status?.replace(/_/g, ' ') || 'Sem Dados'}
                        </div>
                    </div>
                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-2 min-w-0">
                        {balance?.distribution?.[0] && (
                            <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-normal truncate min-w-0">
                                {balance.distribution[0].subject}: <span className="font-bold text-slate-300">{formatValue(balance.distribution[0].percentage || 0)}%</span>
                            </div>
                        )}
                        {balance?.metrics?.activeSubjects > 0 && (
                            <div className="text-[10px] sm:text-xs text-slate-500 font-medium leading-normal">
                                {balance.metrics.activeSubjects}/{balance.metrics.totalSubjects} matérias ativas
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Flashcards (Medidas & Indicadores SRS) ─────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-6 sm:p-6 flex flex-col justify-between group transition-all duration-500 shadow-2xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-500/10 rounded-full blur-[40px] group-hover:bg-amber-500/20 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 relative group/tooltip cursor-help">
                        <div className="p-2 bg-amber-500/10 rounded-lg group-hover/tooltip:bg-amber-500/20 transition-colors">
                            <BookOpen size={18} className="text-amber-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">Flashcards</span>
                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors" />
                        
                        <div className="absolute top-full left-0 mt-2 w-60 max-w-[85vw] p-2.5 bg-yellow-400 text-[10px] sm:text-xs text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500">
                            <strong>Indicadores SRS</strong>: Revisões totais, precisão e cartões pendentes hoje via repetição espaçada.
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">
                        {fcStats.flashcardReviews || 0} <span className="text-lg sm:text-xl text-slate-300 font-bold">revisões</span>
                    </div>
                    <div className="mt-auto pt-1 pb-1 flex flex-col gap-1 pl-2 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-amber-400 font-medium">
                            <span>Precisão: <span className="font-bold">{formatValue(fcStats.flashcardAccuracy || 0)}%</span></span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-slate-400 font-medium">
                            <span>Hoje: <span className="font-bold text-white">{fcStats.flashcardReviewsToday || 0}</span></span>
                            <span>Pendentes: <span className="font-bold text-amber-300">{fcStats.flashcardDueToday || 0}</span></span>
                        </div>
                        {(fcStats.flashcardMastery || 0) > 0 && (
                            <div className="text-[10px] sm:text-xs text-slate-500 font-medium">Domínio: {fcStats.flashcardMastery}%</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── XP / Nível ─────────────────────────────────────────────── */}
            <div className="relative glass-hover bg-[#151720]/95 border border-white/10 rounded-2xl p-6 sm:p-6 flex flex-col justify-between group transition-all duration-500 shadow-2xl">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 relative group/tooltip cursor-help">
                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover/tooltip:bg-purple-500/20 transition-colors">
                            <Trophy size={18} className="text-purple-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">
                            Nível {progress.level}
                        </span>
                        <Info size={14} className="ml-auto text-slate-600 group-hover/tooltip:text-slate-400 transition-colors" />
                        
                        <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-60 max-w-[85vw] p-2.5 bg-yellow-400 text-[10px] sm:text-xs text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500">
                            <strong>Status NÍVEL {progress.level}</strong>: Representa sua experiência geral. Complete tarefas e ciclos de estudo para evoluir de nível!
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-4xl font-black text-white mt-1 mb-3 break-words line-clamp-2 min-w-0 pb-0.5" title={`${(user.xp || 0).toLocaleString('pt-BR')} XP`}>
                        {(user.xp || 0).toLocaleString('pt-BR')} <span className="text-lg sm:text-2xl text-slate-300 font-bold">XP</span>
                    </div>
                    <div className="space-y-1 mt-auto pt-1 pb-1 pl-2">
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
                                style={{ width: `${Math.max(0, Math.min(100, Number(progress?.percentage) || 0))}%` }}
                            />
                        </div>
                        <div className="text-[10px] sm:text-xs text-purple-400 font-bold leading-normal">
                            {formatValue(progress?.percentage || 0)}% → Nível {(progress?.level || 1) + 1}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Data da Prova ───────────────────────────────────────────── */}
            <div className={`sm:col-span-2 md:col-span-2 xl:col-span-1 relative bg-[#151720]/95 border rounded-2xl p-6 sm:p-6 transition-all duration-700 flex flex-col sm:flex-row items-center justify-between h-full group shadow-2xl ${!user.goalDate
                ? 'border-slate-500/30'
                : 'border-white/10 hover:border-rose-500/30'
                }`}>
                
                <div className="absolute top-4 right-4 z-20">
                    <div className="relative group/tooltip">
                        <Info size={14} className="text-slate-600 hover:text-slate-400 cursor-help transition-colors" />
                        <div className="absolute top-full right-0 mt-2 w-60 max-w-[85vw] p-2.5 bg-yellow-400 text-[10px] sm:text-xs text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500">
                            <strong>Status {daysRemaining === null ? 'SEM DATA' : daysRemaining < 0 ? 'ATRASADO' : daysRemaining === 0 ? 'É HOJE' : 'NO PRAZO'}</strong>: {
                                daysRemaining === null ? 'Nenhuma data alvo definida no momento.' :
                                daysRemaining < 0 ? 'A data agendada para a prova já passou.' :
                                daysRemaining === 0 ? 'O dia do seu objetivo chegou. Boa sorte!' :
                                `Faltam ${daysRemaining} dias de preparação para a sua prova.`
                            }
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] transition-transform duration-700 ${!user.goalDate ? 'bg-slate-500/10' : 'bg-red-500/10 group-hover:scale-150'}`} />
                    {user.goalDate && daysRemaining !== null && daysRemaining <= 15 && daysRemaining >= 0 && (
                        <div className="absolute inset-0 bg-red-500/[0.04]" />
                    )}
                </div>

                {/* Left: contador de dias */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full sm:w-1/2">
                    {daysRemaining !== null ? (
                        <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-1.5 justify-center mb-1">
                                <span className={`text-4xl sm:text-5xl font-black ${daysRemaining < 0 ? 'text-slate-500' : daysRemaining <= 15 ? 'text-red-400' : 'text-white'}`}>
                                    {Math.abs(daysRemaining)}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>
                            <div className={`text-xs font-bold mt-1 text-center uppercase tracking-widest leading-relaxed ${daysRemaining < 0 ? 'text-slate-600' : daysRemaining <= 15 ? 'text-red-500/80' : 'text-slate-400'}`}>
                                {daysRemaining < 0
                                    ? 'Atrasado'
                                    : daysRemaining === 0
                                        ? 'É hoje!'
                                        : 'Para a prova'}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <div className="text-slate-500 mb-2">
                                <Calendar size={36} strokeWidth={2} />
                            </div>
                            <div className="text-xs font-black text-slate-400 bg-slate-800 px-3 py-1 rounded-sm text-center uppercase tracking-widest leading-tight">
                                SEM DATA
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full h-[1px] sm:w-[1px] sm:h-16 bg-white/10 z-10 my-3 sm:mx-3" />

                {/* Right: date picker (Re-implementado para Robustez) */}
                <div
                    className="relative z-10 flex-1 flex flex-col items-center justify-center w-full sm:w-1/2 group/rightside cursor-pointer py-2"
                    onClick={(e) => {
                        // [CORREÇÃO VISUAL-BUG-6] Prevenir double-trigger que trava o calendário em mobile
                        if (e.target === dateInputRef.current) {
                            e.stopPropagation();
                            return;
                        }

                        try {
                            if (dateInputRef.current) {
                                if (typeof dateInputRef.current.showPicker === 'function') {
                                    dateInputRef.current.showPicker();
                                } else {
                                    dateInputRef.current.focus();
                                    dateInputRef.current.click();
                                }
                            }
                        } catch (err) {
                            console.error("Picker falhou", err);
                        }
                    }}
                >
                    <input
                        ref={dateInputRef}
                        type="date"
                        onFocus={(e) => { e.target.min = getTodayDateKey(); }}
                        value={(() => {
                            const d = parseGoalDateUnified(user.goalDate);
                            return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
                        })()}
                        min={minGoalDate}
                        onChange={(e) => {
                            const selected = e.target.value;
                            if (!selected) return onUpdateGoalDate('');
                            // CORREÇÃO: Respeito imutável ao que foi clicado. 
                            // O atributo 'min' cuida da validação visual.
                            onUpdateGoalDate(selected);
                        }}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-50 pointer-events-auto [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        title="Escolher data da prova"
                    />

                    <div className="flex flex-col items-center gap-2 mb-3 pointer-events-none">
                        <div className={`p-2 rounded-xl transition-all duration-300 ${!user.goalDate ? 'bg-slate-800 shadow-lg' : 'bg-red-500/10 group-hover/rightside:bg-red-500/20'}`}>
                            <Calendar size={18} className={`${!user.goalDate ? 'text-slate-400' : 'text-red-400 group-hover/rightside:scale-110 transition-transform'}`} />
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest text-center leading-normal transition-colors ${!user.goalDate ? 'text-slate-500' : 'text-slate-500 group-hover/rightside:text-slate-400'}`}>Data final</span>
                    </div>

                    <div className="relative group/input flex justify-center w-full pointer-events-none">
                        <div className={`w-[120px] bg-slate-900/50 border rounded-lg py-1.5 text-sm font-bold transition-all group-hover/rightside:bg-slate-800 group-hover/rightside:text-white group-hover/rightside:border-white/20 text-center leading-relaxed ${!user.goalDate ? 'border-slate-700 text-slate-500' : 'border-white/10 text-slate-200'}`}>
                            {user.goalDate ? (() => {
                                const d = parseGoalDateUnified(user.goalDate);
                                return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : 'INVÁLIDA';
                            })() : 'ESCOLHER'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(StatsCards);

```

## src/components/NextGoalCard.jsx

```jsx
import React, { useMemo } from 'react';
import { Target, Play, Clock, Info } from 'lucide-react';
import { getSuggestedFocus } from '../utils/coachLogic';

function NextGoalCard({ categories = [], simulados = [], studyLogs = [], onStartStudying }) {
    // Get the most urgent category using AI Coach logic
    const suggestion = useMemo(() => {
        const suggestedCategory = getSuggestedFocus(categories, simulados, studyLogs);

        if (!suggestedCategory) return null;

        // Find the first uncompleted task with highest priority
        const tasks = suggestedCategory.tasks || [];

        // Priority order: high > medium > low
        const priorityOrder = { high: 0, medium: 1, low: 2 };

        const sortedTasks = tasks
            .filter(t => !t.completed)
            .sort((a, b) => {
                const pA = (a.priority || 'medium').toLowerCase();
                const pB = (b.priority || 'medium').toLowerCase();
                // Bug fix: priorityOrder['high'] === 0, so `|| 1` was coercing it to 1 (same as medium).
                // Use `?? 1` (nullish coalescing) so only null/undefined get the fallback, not 0.
                return (priorityOrder[pA] ?? 1) - (priorityOrder[pB] ?? 1);
            });

        const nextTask = sortedTasks[0];

        if (!nextTask) return null;

        // Compute task display info
        const fullText = nextTask.title || nextTask.text || "Estudo";
        const parts = fullText.split(':');
        const hasDetails = parts.length > 1;
        let actionPart = hasDetails ? parts.slice(1).join(':').trim() : fullText;

        // Strip legacy AI tags completely (e.g., [REVISÃO], [OTIMIZAÇÃO DE BASE])
        actionPart = actionPart.replace(/^\[(.*?)\]\s*/i, '').trim();

        return {
            category: suggestedCategory,
            task: nextTask,
            urgency: suggestedCategory.urgency,
            display: {
                assunto: actionPart.length > 40 ? actionPart.substring(0, 37) + '...' : actionPart,
                meta: hasDetails ? parts[0] : "Revisão e exercícios"
            }
        };
    }, [categories, simulados, studyLogs]);

    if (!suggestion) {
        return (
            <div className="rounded-xl p-4 border border-green-500/20 bg-gradient-to-r from-green-900/10 to-emerald-900/10 backdrop-blur-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center animate-pulse">
                    <Target size={24} className="text-green-400 animate-bounce" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-green-400">Tudo em dia! 🎉</h3>
                    <p className="text-xs text-slate-400">Nenhuma tarefa urgente.</p>
                </div>
            </div>
        );
    }

    const { category, task, urgency, display } = suggestion;

    // Determine urgency styling
    let urgencyStyle = {
        gradient: 'from-blue-500/10 to-transparent',
        border: 'border-blue-500/20 hover:border-blue-500/40',
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        buttonGradient: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]',
        iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        textHighlight: 'text-blue-400'
    };

    // Use normalizedScore (0-100) for thresholds
    const urgencyScore = urgency?.normalizedScore ?? urgency?.score ?? 0;

    if (urgencyScore > 70) {
        urgencyStyle = {
            gradient: 'from-red-500/10 to-transparent',
            border: 'border-red-500/20 hover:border-red-500/40',
            badge: 'bg-red-500/10 text-red-500 border-red-500/20',
            buttonGradient: 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500',
            glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]',
            iconBg: 'bg-red-500/10 border-red-500/20 text-red-500',
            textHighlight: 'text-red-500'
        };
    } else if (urgencyScore > 50) {
        urgencyStyle = {
            gradient: 'from-amber-500/10 to-transparent',
            border: 'border-amber-500/20 hover:border-amber-500/40',
            badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            buttonGradient: 'from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400',
            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]',
            iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
            textHighlight: 'text-amber-500'
        };
    }

    // Check if we have sufficient data
    const hasSimuladoData = urgency?.details?.hasData;

    // Block removed: The 'Aguardando Dados' message used to hide actionable tasks for new users.
    // We now proceed to render the task suggestion regardless of simulado data.

    return (
        <div className={`relative rounded-2xl border ${urgencyStyle.border} bg-[#2d1e12]/80 backdrop-blur-3xl transition-all duration-700 group overflow-visible shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]`}>
            {/* Background Layers */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-br ${urgencyStyle.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-700`} />
                <div className={`absolute -top-24 -right-24 w-64 h-64 bg-white/5 blur-[100px] rounded-full group-hover:bg-white/10 transition-all duration-1000`} />
                <div className="absolute inset-0 opacity-[0.03]">
                    <div className="w-full h-[2px] bg-white animate-scan-fast" />
                </div>
            </div>

            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
                {/* Left: Category Icon */}
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 border ${urgencyStyle.iconBg}`}>
                    {category.icon || '📚'}
                </div>

                {/* Center: Task Info */}
                <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center">
                            PRÓXIMA MISSÃO
                            <div className="relative group/tooltip cursor-help ml-2 inline-flex">
                                <Info size={12} className="text-slate-500 hover:text-slate-400 transition-colors" />
                                <div className="absolute top-full left-0 mt-2 w-56 p-2 bg-yellow-400 text-[10px] text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500 font-normal tracking-normal normal-case">
                                    <strong>Por que isso?</strong> O Coach analisou sua frequência, prioridades e tempo sem ver as matérias para sugerir a tarefa de maior impacto.
                                </div>
                            </div>
                        </span>

                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-md border tracking-widest leading-none ${urgencyStyle.badge}`}>
                            {hasSimuladoData
                                ? (urgencyScore > 70 ? '🔥 Urgente' : urgencyScore > 50 ? '⚡ Média' : '📋 Normal')
                                : '🌱 Inicial'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 mb-2 min-w-0">
                        <h3 className="text-lg md:text-xl font-black text-white break-words line-clamp-2 min-w-0 block drop-shadow-sm pb-0.5" title={category.name}>
                            {category.name}
                        </h3>
                        {display.assunto && (
                            <div className="flex items-center gap-2 min-w-0">
                                <Target size={14} className={urgencyStyle.textHighlight} shrink-0 />
                                <h4 className="text-xs sm:text-sm font-bold text-slate-300 break-words line-clamp-2 min-w-0 block pb-0.5" title={display.assunto}>
                                    {display.assunto}
                                </h4>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-slate-400 font-medium">
                                <Clock size={12} className={urgencyStyle.textHighlight} />
                                Tempo sem ver: <span className="text-white font-bold">
                                    {hasSimuladoData && (urgency?.details?.daysSinceLastStudy ?? 0) > 0
                                        ? `${urgency.details.daysSinceLastStudy}d`
                                        : hasSimuladoData ? '0d' : 'Nunca'}
                                </span>
                            </span>
                        </div>
                        {urgency?.recommendation && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <span className="text-lg leading-none">💡</span>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    <span className="text-white font-bold">Motivo da escolha: </span> 
                                    {urgency.recommendation}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Action Button */}
                <div className="w-full md:w-auto flex-shrink-0">
                    <button
                        onClick={() => onStartStudying && onStartStudying(category.id, task.id)}
                        className={`relative w-full px-8 py-4 rounded-xl bg-gradient-to-r ${urgencyStyle.buttonGradient} ${urgencyStyle.glow} text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 group/btn overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        <Play size={18} className="fill-white relative z-10" />
                        <span className="relative z-10">INICIAR SESSÃO</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(NextGoalCard);

```

## src/components/PriorityProgress.jsx

```jsx
import React, { useMemo } from 'react';
import { Info } from 'lucide-react';const priorityColors = {
    high: { label: 'Alta', bar: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    medium: { label: 'Média', bar: 'bg-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    low: { label: 'Baixa', bar: 'bg-green-500', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
};

export default function PriorityProgress({ categories = [] }) {
    const stats = useMemo(() => {
        const counts = {
            high: { total: 0, completed: 0 },
            medium: { total: 0, completed: 0 },
            low: { total: 0, completed: 0 }
        };

        categories.forEach(cat => {
            (cat.tasks || []).forEach(task => {
                const p = (task.priority || 'medium').toLowerCase();
                if (counts[p]) {
                    counts[p].total++;
                    if (task.completed) counts[p].completed++;
                }
            });
        });

        return counts;
    }, [categories]);

    const priorities = ['high', 'medium', 'low'];

    // Se não tiver nenhuma tarefa em todo o app, podemos não mostrar ou mostrar zerado
    const totalTasksGlobally = priorities.reduce((acc, p) => acc + stats[p].total, 0);
    const totalCompletedGlobally = priorities.reduce((acc, p) => acc + stats[p].completed, 0);
    if (totalTasksGlobally === 0) return null;

    const globalPct = totalTasksGlobally > 0 ? Math.round((totalCompletedGlobally / totalTasksGlobally) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* Barra de Progresso Global Maior */}
            <div className="p-6 sm:p-7 rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-xl transition-all duration-500 group shadow-lg relative overflow-visible mx-1">
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] opacity-30 transition-all duration-700 group-hover:bg-purple-400/30" />
                </div>

                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-4 px-1">
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 leading-none flex items-center mb-1">
                                Progresso Global
                                <div className="relative group/tooltip cursor-help ml-2 inline-flex">
                                    <Info size={12} className="text-purple-400/50 hover:text-purple-400 transition-colors" />
                                    <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-yellow-400 text-[10px] text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500 font-normal tracking-normal normal-case">
                                        <strong>Progresso Global:</strong> Representa o percentual total de tarefas concluídas em relação a todas as tarefas cadastradas, independente da prioridade.
                                    </div>
                                </div>
                            </span>
                            <h3 className="text-xl font-bold text-white leading-tight">Conclusão de Assuntos</h3>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{globalPct}%</span>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold sm:mt-1">
                                {totalCompletedGlobally} de {totalTasksGlobally} concluídos
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-5 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner p-[2px]">
                        {globalPct > 0 ? (
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(168,85,247,0.5)] relative overflow-hidden"
                                style={{ width: `${globalPct}%` }}
                            >
                                {/* Animação de brilho interno */}
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            </div>
                        ) : (
                            <div className="h-full w-2 rounded-full bg-white/10" />
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {priorities.map(p => {
                    const { total, completed } = stats[p];
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const conf = priorityColors[p];

                    return (
                        <div key={p} className={`p-6 rounded-2xl border transition-all duration-500 group shadow-lg relative ${conf.border} ${conf.bg} backdrop-blur-xl hover:bg-white/[0.07] hover:shadow-2xl hover:-translate-y-1`}>
                            {/* Mesh Accent - Clipped separately to avoid cutting text */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-all duration-700 group-hover:opacity-40 ${p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            </div>

                            <div className="relative z-10 flex flex-col gap-5">
                                <div className="flex justify-between items-center px-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${conf.text} leading-none pt-1 flex items-center`}>
                                        Prioridade {conf.label}
                                        <div className="relative group/tooltip cursor-help ml-1 inline-flex">
                                            <Info size={12} className={`${conf.text} opacity-50 hover:opacity-100 transition-opacity`} />
                                            <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-yellow-400 text-[10px] text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500 font-normal tracking-normal normal-case">
                                                <strong>{conf.label}:</strong> {
                                                    p === 'high' ? 'Tarefas mais urgentes e importantes.' :
                                                    p === 'medium' ? 'Tarefas de importância moderada.' :
                                                    'Tarefas de menor impacto ou flexíveis.'
                                                }
                                            </div>
                                        </div>
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors tracking-wide">
                                        {completed}/{total}
                                    </span>
                                </div>

                                <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner relative mt-1">
                                    {pct > 0 ? (
                                        <div
                                            className={`h-full rounded-full ${conf.bar} transition-all duration-1000 ease-out`}
                                            style={{
                                                width: `${pct}%`,
                                                boxShadow: p === 'high' ? '0 0 15px rgba(239, 68, 68, 0.4)' :
                                                    p === 'medium' ? '0 0 15px rgba(234, 179, 8, 0.4)' :
                                                        '0 0 15px rgba(34, 197, 94, 0.4)'
                                            }}
                                        />
                                    ) : (
                                        /* Visual feedback when 0%: show a subtle dot at the start */
                                        <div className="absolute left-0 top-0 h-full w-1 rounded-full bg-white/10" />
                                    )}
                                </div>

                                <div className="flex justify-end pr-1 mt-1">
                                    <span className={`text-xs font-black ${conf.text} drop-shadow-md leading-none pt-1`}>
                                        {pct}% completado
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


```

## src/components/Checklist.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Plus, Trash2, TrendingUp, TrendingDown, Minus, BarChart2, Play, Settings, Download, X } from 'lucide-react';
import PromptModal from './PromptModal';
import CategoryEditor from './CategoryEditor';
import { formatDuration } from '../utils/dateHelper';

const priorityColors = {
    high: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
    medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
    low: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
};

const PerformancePanel = ({ stats, color }) => {
    if (!stats) return null;

    const { average = 0, lastAttempt = 0, trend = 'stable', level = '-', history: rawHistory = [] } = stats;
    const history = Array.isArray(rawHistory) ? rawHistory : Object.values(rawHistory || {});

    let trendIcon = <div className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-500/10"><Minus size={14} className="text-slate-400" /></div>;
    let trendText = "Estável";
    if (trend === 'up') {
        trendIcon = <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]"><TrendingUp size={14} className="text-emerald-400" /></div>;
        trendText = "Subindo";
    } else if (trend === 'down') {
        trendIcon = <div className="w-5 h-5 flex items-center justify-center rounded-full bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]"><TrendingDown size={14} className="text-rose-400" /></div>;
        trendText = "Caindo";
    }

    let levelColor = "text-slate-400 bg-slate-500/10 border-slate-500/20";
    if (level === 'ALTO') levelColor = "text-green-400 bg-green-500/10 border-green-500/20";
    if (level === 'MÉDIO') levelColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    if (level === 'BAIXO') levelColor = "text-red-400 bg-red-500/10 border-red-500/20";

    return (
        <div className="relative p-4 mx-4 mb-4 bg-gradient-to-r from-slate-900 to-slate-800/50 rounded-xl border border-white/10 shadow-inner group">
            {/* Header */}
            <div className="relative z-10 flex items-center gap-2 mb-4 text-slate-300 text-sm font-semibold uppercase tracking-wider leading-relaxed py-1">
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
                    <div className="flex items-end h-16 gap-1 w-full overflow-visible">
                        {(() => {
                            const sliced = history.slice(-10);
                            return sliced.map((h, i) => (
                                <div key={h.date || `hist-${i}`} className="flex-1 flex flex-col items-center group relative">
                                    <div
                                        className="w-full bg-slate-700/50 hover:bg-white/20 transition-all rounded-t-sm"
                                        style={{
                                            height: `${Math.min(100, Math.max(2, h.score || 0))}%`,
                                            backgroundColor: i === sliced.length - 1 ? color : undefined,
                                            opacity: i === sliced.length - 1 ? 1 : 0.3
                                        }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {h.score}% ({new Date(typeof h.date === 'string' ? (h.date.includes('T') ? h.date : h.date + 'T12:00:00') : (h.date || h.createdAt || Date.now())).toLocaleDateString('pt-BR')})
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
        <div
            className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.07] transition-all group shadow-sm hover:shadow-md ${task.completed ? 'opacity-40' : ''}`}
        >
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id)}
                    className="flex-shrink-0 w-5 h-5 cursor-pointer accent-purple-500 hover:scale-110 transition-transform"
                />

                {/* Task Content */}
                <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {task.title || task.text || "Tarefa sem nome"}
                        </p>
                        {task.status === 'studying' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse shadow-lg shadow-purple-500/20 whitespace-nowrap flex-shrink-0">
                                ⚡ Estudando
                            </span>
                        )}
                    </div>
                    {task.notes && (
                        <p className="text-[10px] sm:text-xs text-slate-500 break-words line-clamp-3 mt-0.5 leading-tight">{task.notes}</p>
                    )}
                </div>
            </div>

            {/* Action Buttons - Aligned to the Right/Bottom */}
            <div className="flex items-center justify-end gap-2 w-full sm:w-auto ml-auto pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                {/* Play / Retornar Button */}
                {task.status === 'studying' ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTriggerPlay();
                        }}
                        className="relative px-4 h-8 sm:h-9 flex items-center justify-center gap-2 rounded-full transition-all duration-500 hover:scale-[1.05] active:scale-95 group overflow-visible animate-pulse"
                        title="Retornar ao Pomodoro"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 rounded-full blur-[4px] opacity-60 transition-all duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-500 rounded-full border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                        <span className="text-white font-black text-[9px] sm:text-[10px] tracking-widest uppercase drop-shadow-md relative z-10">
                            PLAY
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTriggerPlay();
                        }}
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all group/play text-purple-400 bg-purple-500/5 border border-purple-500/20 hover:text-white hover:bg-purple-500/40 hover:scale-110"
                        title="Estudar agora"
                    >
                        <Play size={14} className="sm:size-18 fill-purple-500/20" />
                    </button>
                )}

                {/* Priority Badge */}
                <button
                    onClick={() => onTogglePriority(task.id)}
                    className={`px-3 sm:w-20 py-1.5 rounded-lg text-[9px] sm:text-xs font-black uppercase transition-all ${priority.bg} ${priority.text} ${priority.border} border`}
                >
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </button>

                {/* Delete Button */}
                <button
                    onClick={() => onDelete(task.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

const CategoryAccordion = React.memo(({ category, onToggleTask, onDeleteTask, onAddTask, onTogglePriority, onDeleteCategory, onPlayContext, showSimuladoStats, filter }) => {

    const [isOpen, setIsOpen] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isConfirmDeleteTaskOpen, setIsConfirmDeleteTaskOpen] = useState(false);
    const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const rawAllTasks = category.originalTasks || category.tasks || []; // Use original/all tasks for progress bar
    const allTasks = Array.isArray(rawAllTasks) ? rawAllTasks : Object.values(rawAllTasks || {});

    const completedCount = allTasks.filter(t => t.completed).length;
    const progress = allTasks.length > 0
        ? Math.round((completedCount / allTasks.length) * 100)
        : 0;

    return (
        <div className="glass overflow-visible shadow-lg transition-all duration-500 hover:shadow-purple-500/5 hover:-translate-y-1 relative group border border-white/5 rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.02] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            {/* Header */}
            <div className="w-full flex items-center gap-2 p-3 sm:p-5 hover:bg-white/5 transition-colors">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 sm:gap-4 flex-1 cursor-pointer min-w-0"
                >
                    <span className="text-xl sm:text-2xl flex-shrink-0">{category.icon || '📚'}</span>
                    <div className="text-left flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm sm:text-lg break-words line-clamp-2" style={{ color: category.color }}>
                                {category.name || 'Sem Nome'}
                            </h3>
                            {category.totalMinutes > 0 && (
                                <span className="text-yellow-400/80 text-[9px] sm:text-[10px] font-black whitespace-nowrap border border-yellow-400/20 px-1 sm:px-1.5 py-0.5 rounded-sm leading-normal">
                                    {formatDuration(category.totalMinutes / 60)}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                            {completedCount} de {allTasks.length} concluídas
                        </p>
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsCategoryEditorOpen(true);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white shadow-[0_0_15px_rgba(0,0,0,0.4)] transition-all transform hover:scale-110 active:scale-95 flex-shrink-0 ml-auto"
                    title="Configurar Disciplina"
                >
                    <Settings size={16} strokeWidth={2.5} />
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsConfirmDeleteOpen(true);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all transform hover:scale-110 active:scale-95 flex-shrink-0 ml-2"
                    title="Excluir Disciplina Permanente"
                >
                    <Trash2 size={16} strokeWidth={3} />
                </button>

                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-end gap-2 sm:gap-4 cursor-pointer flex-shrink-0"
                >
                    <>
                        <div className="w-14 sm:w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress}%`, backgroundColor: category.color }}
                            />
                        </div>
                        <span className="text-xs sm:text-sm font-mono flex-shrink-0 w-8 sm:w-10 text-right inline-block" style={{ color: category.color }}>
                            {progress}%
                        </span>
                    </>
                    {isOpen ? <ChevronUp size={18} className="ml-2" /> : <ChevronDown size={18} className="ml-2" />}
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
                        {/* FIX: Lógica aprimorada para evitar falsa mensagem de vazio */}
                        {(category.originalTasks || []).length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-2">Nenhum assunto cadastrado nesta disciplina.</p>
                        ) : (category.tasks || []).length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-2">Nenhum assunto encontrado para o filtro atual.</p>
                        ) : (
                            category.tasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onToggle={(id) => onToggleTask(category.id, id)}
                                    onDelete={() => {
                                        setTaskToDelete(task);
                                        setIsConfirmDeleteTaskOpen(true);
                                    }}
                                    onTogglePriority={(id) => onTogglePriority(category.id, id)}
                                    onTriggerPlay={() => onPlayContext(category.id, task.id)}
                                    categoryColor={category.color}
                                />
                            ))
                        )}
                    </div>
                    {/* Add Task Button */}
                    {filter !== 'completed' && (
                        <div className="p-4 pt-0">
                            <button
                                onClick={() => setIsTaskModalOpen(true)}
                                className="w-full py-2 rounded-xl border border-dashed border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-800/40 hover:text-purple-100 hover:border-purple-500/50 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                <span>Adicionar Assunto</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
            <PromptModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                // FIX: Fecha o modal logo após disparar a ação
                onConfirm={(title) => {
                    onAddTask(category.id, title);
                    setIsTaskModalOpen(false);
                }}
                title="Novo Assunto"
                placeholder="Nome do novo assunto..."
            />
            {isConfirmDeleteOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsConfirmDeleteOpen(false)} />
                    <div className="bg-slate-900 border border-red-500/50 rounded-2xl w-full max-w-sm shadow-2xl relative z-10 p-6 flex flex-col items-center text-center">
                        <Trash2 size={48} className="text-red-500 mb-4 p-2 bg-red-500/10 rounded-full" />
                        <h3 className="text-xl font-bold text-white mb-2">Excluir Disciplina?</h3>
                        <p className="text-sm text-slate-400 mb-6">Tem certeza que deseja excluir <strong>{category.name}</strong> e todas as suas tarefas? Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsConfirmDeleteOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={() => { setIsConfirmDeleteOpen(false); onDeleteCategory(category.id); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Excluir</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {isConfirmDeleteTaskOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsConfirmDeleteTaskOpen(false)} />
                    <div className="bg-slate-900 border border-red-500/50 rounded-2xl w-full max-w-sm shadow-2xl relative z-10 p-6 flex flex-col items-center text-center">
                        <Trash2 size={48} className="text-red-500 mb-4 p-2 bg-red-500/10 rounded-full" />
                        <h3 className="text-xl font-bold text-white mb-2">Excluir Assunto?</h3>
                        <p className="text-sm text-slate-400 mb-6">Tem certeza que deseja excluir <strong>{taskToDelete?.title || taskToDelete?.text}</strong>? Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsConfirmDeleteTaskOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={() => { 
                                setIsConfirmDeleteTaskOpen(false); 
                                if (taskToDelete) onDeleteTask(category.id, taskToDelete.id); 
                            }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Excluir</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            <CategoryEditor 
                category={category} 
                isOpen={isCategoryEditorOpen} 
                onClose={() => setIsCategoryEditorOpen(false)} 
            />
        </div >
    );
});

function Checklist({ 
    categories = [], 
    onToggleTask, 
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
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importSourceContest, setImportSourceContest] = useState('');
    const bottomRef = React.useRef(null);
    const scrollTimerRef = React.useRef(null);

    useEffect(() => {
        return () => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, []);

    const scrollToBottom = () => {
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    };

    if (typeof onPlayContext !== 'function') {
        console.error('Checklist: onPlayContext prop is MISSING or not a function');
    }
    const filters = [
        { id: 'all', label: 'Todas' },
        { id: 'active', label: 'Ativas' },
        { id: 'completed', label: 'Concluídas' },
    ];

    // Filter tasks within categories, memoized to prevent render-blocking on typing
    const filteredCategories = React.useMemo(() => {
        return categories.map(cat => ({
            ...cat,
            originalTasks: cat.tasks || [], // Keep reference to all tasks
            tasks: (cat.tasks || []).filter(task => {
                if (filter === 'active') return !task.completed;
                if (filter === 'completed') return task.completed;
                return true;
            })
        })).filter(() => true); // Always show categories, even if empty
    }, [categories, filter]);

    return (
        <div className="min-h-[300px] w-full">
            {/* Empty State for New Users */}
            {categories.length === 0 && (
                <div className="flex flex-col items-center justify-center p-16 mb-6 border-2 border-dashed border-white/10 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="relative z-10 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 mx-auto border border-white/10 shadow-2xl relative">
                            <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl animate-pulse" />
                            <span className="text-5xl animate-bounce">🚀</span>
                        </div>
                        <h3 className="text-white font-black text-2xl mb-2 tracking-tight">Prepare-se para o Topo!</h3>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                            Organize sua rotina. Adicione sua primeira disciplina para <span className="text-purple-400 font-bold">desbloquear o dashboard</span>.
                        </p>
                    </div>
                </div>
            )}
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {filters.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-2 rounded-2xl text-sm font-bold tracking-wider uppercase transition-all duration-150 border ${filter === f.id
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white border-white/20 shadow-sm scale-[1.02]'
                            : 'bg-slate-900/70 border-white/10 text-slate-400 hover:bg-slate-800/90 hover:text-slate-200 hover:border-white/20'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Precision Aligned Header Row */}
            <div className="hidden sm:flex items-center justify-between px-5 py-3 mb-1 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 opacity-70 leading-normal">
                <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 flex-shrink-0"></div>
                    <div className="w-64 md:w-80 lg:w-96 flex-shrink-0 mr-4">Disciplina</div>
                </div>
                <div className="w-12"></div>
                <div className="w-32 md:w-40 flex-shrink-0 text-right pr-9">Progresso</div>
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
                                if (filter === 'completed') {
                                    setFilter('all');
                                }
                                // Scroll only if it's the last category
                                const isLastCategory = categories.length > 0 && catId === categories[categories.length - 1].id;
                                if (isLastCategory) {
                                    scrollToBottom();
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

            {/* Add Category / Import Button Row */}
            {onAddCategory && filter !== 'completed' && (
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => setIsCatModalOpen(true)}
                        className="flex-1 py-4 rounded-xl border-2 border-dashed border-purple-500/20 bg-purple-500/5 text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all flex items-center justify-center gap-3 group"
                    >
                        <span className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 text-2xl transition-colors">📚</span>
                        <span className="font-semibold text-lg">Nova Disciplina</span>
                    </button>

                </div>
            )}

            <PromptModal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                // FIX: Fecha o modal logo após disparar a ação
                onConfirm={(name) => {
                    onAddCategory(name);
                    setIsCatModalOpen(false);
                    scrollToBottom();
                }}
                title="Nova Disciplina"
                placeholder="Nome da nova disciplina..."
            />

            {/* Modal de Importação (Transferência) */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative z-10 p-6 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-white">
                                <Download size={20} className="text-purple-400" />
                                <h3 className="text-lg font-bold">Importar Disciplina</h3>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {!contests || Object.keys(contests).length <= 1 ? (
                            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-white/5">
                                <p className="text-slate-400 text-sm">Você precisa ter mais de um concurso (painel) criado para poder importar disciplinas.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                                <div>
                                    <label className="block text-xs text-slate-400 font-bold uppercase mb-2">Selecione o Concurso Origem</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                        value={importSourceContest}
                                        onChange={(e) => setImportSourceContest(e.target.value)}
                                    >
                                        <option value="">-- Escolha um concurso --</option>
                                        {Object.entries(contests).map(([id, contest]) => {
                                            if (id === activeId) return null;
                                            return (
                                                <option key={id} value={id}>
                                                    {contest.contestName || contest.user?.name || 'Sem Nome'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {importSourceContest && contests[importSourceContest]?.categories?.length > 0 && (
                                    <div>
                                        <label className="block text-xs text-slate-400 font-bold uppercase mb-2">Disciplinas Disponíveis</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {contests[importSourceContest].categories.map(cat => {
                                                const exists = categories.some(c => (c.name || '').toLowerCase() === (cat.name || '').toLowerCase());
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        disabled={exists}
                                                        onClick={() => {
                                                            if (onImportCategory) {
                                                                onImportCategory(importSourceContest, cat.id);
                                                                setIsImportModalOpen(false);
                                                                scrollToBottom();
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                                            exists 
                                                                ? 'bg-slate-800/30 border-white/5 opacity-50 cursor-not-allowed' 
                                                                : 'bg-slate-800/80 border-white/10 hover:border-purple-500/50 hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <span className="text-xl">{cat.icon || '📚'}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-white break-words line-clamp-2" style={{ color: cat.color }}>{cat.name}</div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {exists ? 'Já existe' : `${cat.tasks?.length || 0} tarefas`}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {importSourceContest && (!contests[importSourceContest]?.categories || contests[importSourceContest].categories.length === 0) && (
                                    <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-white/5">
                                        <p className="text-slate-500 text-xs font-bold uppercase">Nenhuma disciplina encontrada</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div ref={bottomRef} className="h-px w-full" />
        </div>
    );
}

export default React.memo(Checklist);

```

## src/components/PromptModal.jsx

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Sparkles, X, Layout } from 'lucide-react';

export default function PromptModal({ isOpen, onClose, onConfirm, title, placeholder, initialValue = "" }) {
    const [inputValue, setInputValue] = useState(initialValue);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    const inputRef = useRef(null);

    // React recommended way to derive state from props without causing cascading effect renders
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setInputValue(initialValue);
        }
    }

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onConfirm(inputValue.trim());
            onClose();
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop with extreme blur */}
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[12px]"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <Motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col"
                    >
                        {/* Interactive Background Glows */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all z-20 group"
                        >
                            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        <div className="p-8 sm:p-10 relative z-10">
                            {/* Header Section */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    {title.toLowerCase().includes('disciplina') ? (
                                        <Layout size={24} className="text-white" />
                                    ) : (
                                        <Sparkles size={24} className="text-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{title}</h2>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest opacity-60">Personalização</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                                            Identificação
                                        </label>
                                        <span className="text-[10px] font-mono text-purple-400/60">{inputValue.length}/200</span>
                                    </div>
                                    
                                    <div className="relative group">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value.slice(0, 200))}
                                            placeholder={placeholder}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-lg"
                                            autoComplete="off"
                                        />
                                        {/* Animated underline focus effect */}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-purple-500 to-blue-500 group-focus-within:w-1/2 transition-all duration-500" />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!inputValue.trim()}
                                        className="flex-[2] px-6 py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
                                    >
                                        <span>CONFIRMAR</span>
                                        <Sparkles size={16} className="group-hover/btn:rotate-12 transition-transform" />
                                    </button>
                                </div>
                            </form>
                        </div>
                        
                        {/* Bottom Decoration */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500 opacity-50" />
                    </Motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}

```

## src/components/CategoryEditor.jsx

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

export default function CategoryEditor({ category, isOpen, onClose }) {
    const modalRef = useRef(null);
    useModalAccessibility(isOpen, onClose, modalRef);
    const updateCategoryFields = useAppStore(state => state.updateCategoryFields);
    
    // We'll manage local state for the inputs
    const [minCutoff, setMinCutoff] = useState(category?.minCutoff || 0);
    const [maxScore, setMaxScore] = useState(category?.maxScore || 100);
    const [name, setName] = useState(category?.name || '');
    const [color, setColor] = useState(category?.color || '#3b82f6');

    useEffect(() => {
        if (isOpen && category) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMinCutoff(category.minCutoff || 0);
            setMaxScore(category.maxScore || 100);
            setName(category.name || '');
            setColor(category.color || '#3b82f6');
        }
    }, [isOpen, category]);

    const handleSave = () => {
        if (updateCategoryFields) {
            const parsedMax = Math.max(1, parseInt(maxScore, 10) || 100);
            const parsedMin = Math.max(0, parseInt(minCutoff, 10) || 0);
            
            updateCategoryFields(category.id, {
                name,
                color,
                minCutoff: Math.min(parsedMin, parsedMax),
                maxScore: parsedMax
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div 
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl relative z-10 p-6 flex flex-col"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-white">
                        <Settings size={20} />
                        <h3 className="text-lg font-bold">Editar Disciplina</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Nome</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold uppercase mb-1" title="Pontuação Máxima">Máxima (Pts)</label>
                            <input 
                                type="number" 
                                min="0" 
                                value={maxScore} 
                                onChange={e => setMaxScore(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold uppercase mb-1" title="Mínimo exigido pelo edital nesta matéria">Nota Mínima</label>
                            <input 
                                type="number" 
                                min="0" 
                                max={maxScore}
                                value={minCutoff} 
                                onChange={e => setMinCutoff(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Cor</label>
                        <input 
                            type="color" 
                            value={color} 
                            onChange={e => setColor(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg h-10 px-1 py-1 cursor-pointer focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20">Salvar</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

```

