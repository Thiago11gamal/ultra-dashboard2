# Arquivos Integrais do Menu Pomodoro (Ultra-Dashboard)

Este documento contém a íntegra de todos os **10 arquivos** que compõem o sistema do **Menu Pomodoro** no projeto *Ultra-Dashboard*.

## Índice Geral

| # | Arquivo | Descrição | Linhas |
|---|---------|-----------|--------|
| 1 | [src/pages/Pomodoro.jsx](file:///d:\Downloads\ultra-patched\src\pages\Pomodoro.jsx) | Gerencia o layout principal, painel de IA (AICoachPanel), trivia de estudo (DataTriviaPanel), barra superior, painel de foco/metas e integração com o temporizador. | 1098 |
| 2 | [src/components/PomodoroTimer.jsx](file:///d:\Downloads\ultra-patched\src\components\PomodoroTimer.jsx) | Motor híbrido otimizado combinando estado React e mutação DOM direta no loop requestAnimationFrame. Controla modos (work, break, long_break), fila neural e transições. | 888 |
| 3 | [src/components/pomodoro/PomodoroClock.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroClock.jsx) | Componente visual SVG e digital do relógio, seletor de velocidade de tempo (1X, 10X, 100X) e indicadores de fase. | 87 |
| 4 | [src/components/pomodoro/PomodoroControls.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroControls.jsx) | Botões de controle de fluxo: Voltar (Reset), Play/Pause e Pular (SkipForward). | 39 |
| 5 | [src/components/pomodoro/PomodoroHeader.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroHeader.jsx) | Exibe avisos visuais de Recuperação Neural, Pausa Longa ou alerta de Protocolo Inativo. | 31 |
| 6 | [src/components/pomodoro/PomodoroProgress.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroProgress.jsx) | Indicador visual segmentado de ciclos concluídos e metas de ciclos, com botões para ajustar meta (+ / -). | 72 |
| 7 | [src/store/slices/createPomodoroSlice.js](file:///d:\Downloads\ultra-patched\src\store\slices\createPomodoroSlice.js) | Gerencia estado global atômico, transições de fase (completePomodoroPhase), retrocessos (rewindPomodoroPhase), modos neurais e fila de execução. | 341 |
| 8 | [src/hooks/usePomodoroSync.js](file:///d:\Downloads\ultra-patched\src\hooks\usePomodoroSync.js) | Implementação do protocolo de sincronização via BroadcastChannel e persistência no localStorage. | 136 |
| 9 | [src/utils/taskTitleHelper.js](file:///d:\Downloads\ultra-patched\src\utils\taskTitleHelper.js) | Sanitiza e padroniza a exibição de títulos de tarefas e categorias no menu Pomodoro e no TopBar. | 71 |
| 10 | [tests/pomodoro-menu-bugs.test.js](file:///d:\Downloads\ultra-patched\tests\pomodoro-menu-bugs.test.js) | Suíte de testes de regressão dos 9 bugs do menu Pomodoro (cálculo de ciclos, avanço neural, blindagem anti-negativos, sanitização e XP). | 199 |

---

## 1. [src/pages/Pomodoro.jsx](file:///d:\Downloads\ultra-patched\src\pages\Pomodoro.jsx)

**Descrição**: Gerencia o layout principal, painel de IA (AICoachPanel), trivia de estudo (DataTriviaPanel), barra superior, painel de foco/metas e integração com o temporizador.

```jsx
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import { getLocalMidnight, getDateKey, parseNoonLocal } from '../utils/dateHelper';
import { motion as Motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useActiveContest, usePomodoroState } from '../store/useSelectors';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, ChevronRight, BrainCircuit, Zap, AlertTriangle, Flame, Sparkles, Lock, Unlock, RotateCcw, Loader2, Target, AlertCircle, TrendingUp, Clock, Calendar, BarChart3, Medal, Trophy, Moon, Sun } from 'lucide-react';
import { getCoachInsight, getBestTask } from '../utils/coachLogic';
import { countPomodorosToday } from '../utils/analytics';
import { cleanTaskTitle, parseTaskDisplay } from '../utils/taskTitleHelper';

// Referências estáticas para evitar loops infinitos em seletores Zustand
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

function DataTriviaPanel({ studyLogs, simulados, categories }) {
    const trivia = useMemo(() => {
        const startOfToday = getLocalMidnight().getTime();
        const startOfYesterday = startOfToday - 86400000;
        const startOfWeek = startOfToday - (86400000 * 7);
        const startOfMonth = startOfToday - (86400000 * 30);

        let todayMins = 0;
        let yesterdayMins = 0;
        let weekMins = 0;
        let monthMins = 0;
        let longestSession = 0;
        let nightMins = 0;
        let dawnMins = 0;
        let eveningMins = 0;
        let weekendMins = 0;
        let totalStudyMins = 0;
        let earliestDate = null;
        const daysStudied = new Set();

        (studyLogs || []).forEach(log => {
            if (!log || !log.date) return;
            const d = new Date(log.date || log.createdAt);
            const t = d.getTime();
            if (Number.isNaN(t)) return;

            const mins = Number(log.minutes) || 0;
            totalStudyMins += mins;

            if (!earliestDate || t < earliestDate) earliestDate = t;
            if (mins > longestSession) longestSession = mins;

            const hour = d.getHours();
            if (hour >= 22 || hour < 4) nightMins += mins;
            else if (hour >= 4 && hour < 8) dawnMins += mins;
            else if (hour >= 18 && hour < 22) eveningMins += mins;

            const dayOfWeek = d.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) weekendMins += mins;

            const dateStr = getDateKey(log.date || log.createdAt) || getDateKey(d) || d.toISOString().split('T')[0];
            daysStudied.add(dateStr);

            if (t >= startOfToday) todayMins += mins;
            else if (t >= startOfYesterday && t < startOfToday) yesterdayMins += mins;

            if (t >= startOfWeek) weekMins += mins;
            if (t >= startOfMonth) monthMins += mins;
        });

        const sortedDays = Array.from(daysStudied).sort();
        let maxStreak = 0;
        let currentStreak = 0;
        let lastDate = null;

        sortedDays.forEach(dayStr => {
            const current = parseNoonLocal(dayStr).getTime();
            if (lastDate) {
                const diffDays = Math.round((current - lastDate) / 86400000);
                currentStreak = (diffDays === 1) ? currentStreak + 1 : 1;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            lastDate = current;
        });

        let bestSimulado = 0;
        let recentSimulados = 0;

        (simulados || []).forEach(s => {
            if (!s) return;
            const sTime = s.date ? new Date(s.date).getTime() : NaN;
            if (!Number.isNaN(sTime) && sTime >= startOfMonth) recentSimulados++;

            // FIX: normalizar para a escala 0-100.
            // Antes: `s.score || s.acertos` misturava percentual com acertos brutos,
            // comparando grandezas diferentes e inflando/achatando o "pico cognitivo".
            const rawScore = Number(s.score);
            const rawAcertos = Number(s.acertos);
            const rawTotal = Number(s.total);

            const score = Number.isFinite(rawScore)
                ? rawScore
                : (Number.isFinite(rawAcertos) && Number.isFinite(rawTotal) && rawTotal > 0
                    ? (rawAcertos / rawTotal) * 100
                    : 0);

            if (score > bestSimulado) bestSimulado = score;
        });

        let totalTasks = 0;
        let completedTasks = 0;
        let weekTasks = 0;
        let todayTasks = 0;
        let totalFlashcards = 0;
        let correctFlashcards = 0;
        let activeCategories = 0;
        let mostStudiedCategory = { name: '', mins: 0 };

        (categories || []).forEach(c => {
            if (!c) return;
            if (c.totalMinutes > 0) activeCategories++;
            if (c.flashcardReviews) totalFlashcards += c.flashcardReviews;
            if (c.flashcardCorrect) correctFlashcards += c.flashcardCorrect;
            if (c.totalMinutes && c.totalMinutes > mostStudiedCategory.mins) {
                mostStudiedCategory = { name: c.name, mins: c.totalMinutes };
            }
            if (!c.tasks) return;

            const safeCTasks = Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks);
            safeCTasks.forEach(t => {
                if (!t) return;
                totalTasks++;
                if (t.completed) {
                    completedTasks++;
                    if (t.completedAt) {
                        const compTime = new Date(t.completedAt).getTime();
                        if (compTime >= startOfWeek) weekTasks++;
                        if (compTime >= startOfToday) todayTasks++;
                    }
                }
            });
        });

        const items = [];

        if (todayMins > 0) {
            items.push({ icon: <Flame size={14} className="text-amber-500" />, text: `Hoje: ${Math.round(todayMins)} minutos injetados no sistema.` });
        }
        if (yesterdayMins > 0 && todayMins > yesterdayMins) {
            items.push({ icon: <TrendingUp size={14} className="text-emerald-500" />, text: `Evolução: Você superou o foco de ontem (+${Math.round(todayMins - yesterdayMins)} min).` });
        } else if (yesterdayMins > 0) {
            items.push({ icon: <Clock size={14} className="text-blue-400" />, text: `Ontem: ${Math.round(yesterdayMins)} minutos de neuro-plasticidade.` });
        }
        if (weekMins > 0) {
            items.push({ icon: <Calendar size={14} className="text-indigo-400" />, text: `Semana: ${Math.floor(weekMins / 60)}h ${Math.round(weekMins % 60)}m de imersão total.` });
        }
        if (monthMins > 0) {
            const m = Math.round(monthMins % 60);
            const mStr = m > 0 ? ` ${m}m` : '';
            items.push({ icon: <BarChart3 size={14} className="text-cyan-400" />, text: `Mês: Absorção sustentada de ${Math.floor(monthMins / 60)}h${mStr} brutas.` });
        }
        if (recentSimulados > 0) {
            items.push({ icon: <Target size={14} className="text-rose-400" />, text: `${recentSimulados} simulados enfrentados nos últimos 30 dias.` });
        }
        if (weekTasks > 0) {
            items.push({ icon: <CheckCircle2 size={14} className="text-emerald-400" />, text: `${weekTasks} missões liquidadas nesta semana.` });
        }
        if (completedTasks > 0) {
            const pct = Math.round((completedTasks / Math.max(1, totalTasks)) * 100);
            items.push({ icon: <Trophy size={14} className="text-yellow-500" />, text: `Eficácia: ${pct}% de conclusão global atingida.` });
        }
        if (maxStreak >= 3) {
            items.push({ icon: <Flame size={14} className="text-orange-500" />, text: `Consistência de Aço: Maior ofensiva contínua já feita é de ${maxStreak} dias.` });
        }
        if (bestSimulado > 0) {
            items.push({ icon: <Trophy size={14} className="text-yellow-400" />, text: `Pico cognitivo em simulados atingiu a marca de ${Math.round(bestSimulado)} pontos.` });
        }
        if (longestSession >= 45) {
            items.push({ icon: <BrainCircuit size={14} className="text-violet-400" />, text: `Resistência Neural: Sua maior sessão focada contínua durou ${Math.floor(longestSession / 60)}h ${Math.round(longestSession % 60)}m.` });
        }
        if (totalFlashcards > 0) {
            const fPct = Math.round((correctFlashcards / totalFlashcards) * 100);
            items.push({ icon: <Zap size={14} className="text-amber-400" />, text: `${totalFlashcards} Flashcards memorizados com ${fPct}% de precisão global.` });
        }
        if (mostStudiedCategory.mins >= 60) {
            items.push({ icon: <Target size={14} className="text-cyan-500" />, text: `Hiper-foco: ${Math.floor(mostStudiedCategory.mins / 60)}h ${Math.round(mostStudiedCategory.mins % 60)}m dedicadas apenas à disciplina "${mostStudiedCategory.name}".` });
        }
        if (nightMins > dawnMins * 1.5 && nightMins > 60) {
            items.push({ icon: <Moon size={14} className="text-indigo-300" />, text: `Coruja Ativa: Você já absorveu ${Math.round(nightMins / 60)}h brutas na madrugada.` });
        } else if (dawnMins > nightMins * 1.5 && dawnMins > 60) {
            items.push({ icon: <Sun size={14} className="text-amber-500" />, text: `Madrugador: O despertar matinal já produziu ${Math.round(dawnMins / 60)}h de fluxo cerebral intenso.` });
        }
        if (weekendMins >= 120) {
            items.push({ icon: <Zap size={14} className="text-pink-500" />, text: `Inabalável: ${Math.round(weekendMins / 60)}h de treino ignorando os finais de semana.` });
        }
        if (activeCategories >= 3) {
            items.push({ icon: <BrainCircuit size={14} className="text-emerald-300" />, text: `Mente Plural: Você já expandiu conexões em ${activeCategories} áreas do conhecimento.` });
        }
        if (todayTasks >= 3) {
            items.push({ icon: <Target size={14} className="text-green-400" />, text: `Ritmo Acelerado: ${todayTasks} missões neutralizadas só hoje.` });
        }
        if (daysStudied.size >= 5 && totalStudyMins > 0) {
            const avg = Math.round(totalStudyMins / daysStudied.size);
            items.push({ icon: <BarChart3 size={14} className="text-teal-400" />, text: `Pace de Leão: Seu rendimento médio diário é de ${avg} minutos.` });
        }
        if (earliestDate) {
            const diffTime = Math.abs(new Date().getTime() - earliestDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 30) {
                items.push({ icon: <Medal size={14} className="text-purple-400" />, text: `Veterano: O mapeamento neural desta conta foi iniciado há ${diffDays} dias.` });
            }
        }
        if (eveningMins > 180) {
            items.push({ icon: <Flame size={14} className="text-orange-400" />, text: `Turno Estendido: ${Math.round(eveningMins / 60)}h focadas no período noturno (18h-22h).` });
        }
        if (totalStudyMins >= 600) {
            items.push({ icon: <Trophy size={14} className="text-yellow-300" />, text: `Master: Você acumula um tempo de voo absurdo de ${Math.round(totalStudyMins / 60)} horas totais.` });
        }

        // FIX: Eliminado Math.random() para garantir pureza de re-renderização e hidratação determinística
        return items.slice(0, 6);
    }, [studyLogs, simulados, categories]);

    if (!trivia || trivia.length === 0) return null;

    return (
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden group/trivia">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover/trivia:opacity-100 transition-opacity" />
            <div className="flex justify-between items-center mb-3 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <Medal size={12} />
                    Conquistas e Telemetria
                </p>
                <span className="text-[9px] font-black text-indigo-500/60 uppercase">Data Hub</span>
            </div>
            <div className="flex flex-col gap-2 relative z-10 w-full">
                {trivia.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-slate-300 bg-white/[0.02] border border-white/[0.05] px-3 py-2.5 rounded-xl w-full">
                        <div className="shrink-0">{item.icon}</div>
                        <span className="leading-snug font-medium flex-1 min-w-0 break-words">{item.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// CORREÇÃO CRÍTICA: Proteção contra undefined no Painel IA
function AICoachPanel({ activeSubject, stats }) {
    const defaultInsight = {
        title: 'Sistema Ativo',
        text: 'Pronto para iniciar os seus ciclos de foco.',
        color: 'indigo',
        iconType: 'Brain'
    };

    const insight = getCoachInsight(activeSubject, stats) || defaultInsight;

    const icons = {
        'Brain': <BrainCircuit size={24} strokeWidth={1.5} />,
        'Zap': <Zap size={24} strokeWidth={1.5} />,
        'Alert': <AlertTriangle size={24} strokeWidth={1.5} />
    };

    const colorMap = {
        red: {
            border: 'border-red-500/30', bg: 'bg-red-500/5', glow: 'shadow-red-500/10',
            text: 'text-red-400', accent: 'bg-red-400', gradient: 'from-red-500/20 via-red-500/5 to-transparent'
        },
        emerald: {
            border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', glow: 'shadow-emerald-500/10',
            text: 'text-emerald-400', accent: 'bg-emerald-400', gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent'
        },
        indigo: {
            border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', glow: 'shadow-indigo-500/10',
            text: 'text-indigo-400', accent: 'bg-indigo-400', gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent'
        }
    };

    const theme = colorMap[insight?.color] || colorMap.indigo;

    const formatText = (text) => {
        if (!text) return '';
        return text.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className={`font-black text-white ${theme.text} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>{part}</strong> : part
        );
    };

    return (
        <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative rounded-xl border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-xl p-4 mb-3 overflow-hidden group shadow-2xl`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40 pointer-events-none`} />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <Motion.div
                animate={{ top: ['-100%', '200%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className={`absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-20 pointer-events-none z-20`}
            />
            <div className="flex items-center gap-8 relative z-10">
                <div className="relative shrink-0">
                    <Motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className={`absolute inset-0 rounded-full blur-2xl ${theme.accent}`}
                    />
                    <div className={`relative w-10 h-10 rounded-xl border ${theme.border} bg-black/40 flex items-center justify-center ${theme.text} shadow-inner`}>
                        {icons[insight?.iconType] || <BrainCircuit size={24} />}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 shrink-0">
                            <Sparkles size={10} className={`${theme.text} shrink-0`} />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Neural Core Active</span>
                        </div>
                        <div className={`h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent`} />
                    </div>
                    <h3 className="text-lg font-black text-white mb-0.5 tracking-tight flex items-center gap-2">
                        <span className="truncate">{insight?.title || 'Analisando'}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse shrink-0`} />
                    </h3>
                    <div className="text-xs text-slate-300 leading-relaxed font-medium">
                        {formatText(insight?.text)}
                    </div>
                </div>
            </div>
        </Motion.div>
    );
}

// Focus Panel
function FocusPanel({ categories, activeSubject, onStartTask, stats, neuralMode, neuralQueue, studyLogs, simulados }) {
    const recommendedTask = useMemo(() => {
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        if (!safeCats || safeCats.length === 0) return null;
        return getBestTask(safeCats);
    }, [categories]);

    const [isPanelLocked, setIsPanelLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelLocked');
            return saved !== null && saved !== 'undefined' ? JSON.parse(saved) : true;
        } catch { return true; }
    });

    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelPosition');
            return saved !== null && saved !== 'undefined' ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch { return { x: 0, y: 0 }; }
    });

    const uiPosRef = useRef(uiPosition);
    useEffect(() => { uiPosRef.current = uiPosition; }, [uiPosition]);

    useEffect(() => {
        const checkPos = () => {
            const currentPos = uiPosRef.current;
            if (currentPos.x !== 0 || currentPos.y !== 0) {
                const limitX = window.innerWidth - 100;
                const limitY = window.innerHeight - 100;
                if (Math.abs(currentPos.x) > limitX || Math.abs(currentPos.y) > limitY) {
                    setUiPosition({ x: 0, y: 0 });
                    localStorage.removeItem('focusPanelPosition');
                }
            }
        };
        window.addEventListener('resize', checkPos);
        return () => window.removeEventListener('resize', checkPos);
    }, []);

    const handleDragEnd = (_, info) => {
        const newPos = { x: uiPosition.x + info.offset.x, y: uiPosition.y + info.offset.y };
        setUiPosition(newPos);
        try {
            localStorage.setItem('focusPanelPosition', JSON.stringify(newPos));
        } catch (err) {
            console.warn("[FocusPanel] Failed to save position:", err);
        }
    };

    const toggleLock = () => {
        const newState = !isPanelLocked;
        setIsPanelLocked(newState);
        localStorage.setItem('focusPanelLocked', JSON.stringify(newState));
    };

    const resetPosition = () => {
        setUiPosition({ x: 0, y: 0 });
        localStorage.removeItem('focusPanelPosition');
    };

    const highPriorityTasks = useMemo(() => {
        const tasks = [];
        const recommendedId = (!activeSubject && recommendedTask) ? (recommendedTask.id || recommendedTask.text) : null;
        const currentTaskId = activeSubject?.taskId;

        if (neuralMode && neuralQueue && neuralQueue.length > 0) {
            const safeQueue = Array.isArray(neuralQueue) ? neuralQueue : Object.values(neuralQueue || {});
            const normalizedQueue = safeQueue.filter(Boolean);
            const currentIndex = normalizedQueue.findIndex(t => (t.id || t.text) === currentTaskId);
            const pendingQueue = currentIndex >= 0 ? normalizedQueue.slice(currentIndex) : normalizedQueue;
            return pendingQueue.map(t => ({
                ...t,
                id: t.id || t.text,
                catName: t.catName || t.category || 'Neural',
                catColor: t.catColor || '#6366f1',
                catIcon: t.catIcon || '⚡'
            }));
        }

        (categories || []).filter(Boolean).forEach(cat => {
            const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            safeTasks.filter(t => t && !t.completed && t.priority === 'high' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
                tasks.push({ ...t, id: t.id || t.text, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
            });
        });

        if (tasks.length === 0) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => t && !t.completed && t.priority === 'medium' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
                    tasks.push({ ...t, id: t.id || t.text, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                });
            });
        }

        return tasks;
    }, [categories, recommendedTask, activeSubject, neuralMode, neuralQueue]);

    const pendingCount = highPriorityTasks.filter(t => (t.id || t.text) !== activeSubject?.taskId).length;

    const visibleTasks = useMemo(() => {
        const base = [...highPriorityTasks];
        const seen = new Set(base.map(t => t?.id || t?.text).filter(Boolean));
        if (base.length < 6) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => t && !t.completed).forEach(t => {
                    const normalizedId = t.id || t.text;
                    if (!normalizedId || seen.has(normalizedId) || base.length >= 6 || normalizedId === activeSubject?.taskId) return;
                    base.push({ ...t, id: normalizedId, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                    seen.add(normalizedId);
                });
            });
        }
        return base.slice(0, 6);
    }, [highPriorityTasks, categories, activeSubject]);

    const activeTaskStats = useMemo(() => {
        if (!activeSubject) return null;
        const currentCategory = (categories || []).find(c => c?.id === activeSubject.categoryId);
        const rawTasks = currentCategory?.tasks || [];
        const safeCategoryTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
        const categoryTasks = safeCategoryTasks.filter(Boolean);

        const total = categoryTasks.length;
        const completed = categoryTasks.filter(t => t.completed).length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalMinutes = currentCategory?.totalMinutes || 0;
        const remaining = Math.max(total - completed, 0);
        const currentTask = categoryTasks.find(t => (t.id || t.text) === activeSubject.taskId);
        const isCurrentCompleted = currentTask?.completed || false;
        const gainIfComplete = (total > 0 && !isCurrentCompleted) ? Number((100 / total).toFixed(1)) : 0;
        const quality = completionPct >= 80 ? 'Maestria' : completionPct >= 40 ? 'Evolução' : 'Fase Inicial';
        const hitRate = completionPct;
        const missRate = Math.max(0, 100 - completionPct);
        const highPriorityCount = categoryTasks.filter(t => t.priority === 'high' && !t.completed).length;

        const whySelected = isCurrentCompleted
            ? 'necessidade de retenção de memória (Revisão Espaçada)'
            : activeSubject.priority === 'high'
                ? 'ser um alvo crítico de alto impacto'
                : 'apresentar alta sinergia com o seu ritmo atual';

        const improveText = remaining > 0
            ? `Domine mais ${Math.min(remaining, 3)} assunto(s) para expandir seu domínio na matéria.`
            : 'Domínio quase absoluto da matéria. Excelente oportunidade para transição ou revisão profunda.';

        const statusVariants = [];
        if (completionPct < 40) {
            statusVariants.push(`Fase de ignição: Cada assunto concluído gera um impacto de +${gainIfComplete}% na base da matéria.`);
            if (highPriorityCount > 0) statusVariants.push(`Estratégia Alpha: Focar nos ${highPriorityCount} assuntos críticos desta matéria trará o maior ROI de esforço.`);
        } else if (completionPct < 80) {
            statusVariants.push(`Ponto de inflexão: Você já dominou ${hitRate}% da matéria. Acelere para cruzar a barreira da excelência.`);
            statusVariants.push(`Análise em tempo real: Restam ${remaining} assuntos nesta matéria. Mantenha o fluxo para aniquilar a lacuna de ${missRate}%.`);
        } else {
            statusVariants.push(`Alta performance: Com ${hitRate}% de domínio da matéria, você está na fase de refinamento e maestria.`);
            statusVariants.push(`Retenção máxima: Seu nível atual nesta matéria reduz drasticamente a curva de esquecimento.`);
        }
        if (highPriorityCount > 0 && statusVariants.length < 3) {
            statusVariants.push(`Radar tático: Detectamos ${highPriorityCount} assunto(s) de prioridade máxima ainda em aberto nesta matéria.`);
        }
        statusVariants.push(`Mapeamento: Seu fluxo nesta matéria já converteu ${hitRate}% de ruído em conhecimento estruturado.`);

        const variantSeed = String(activeSubject.taskId || activeSubject.task || '').length + completed + total;
        const statusLine = statusVariants[variantSeed % statusVariants.length];

        return {
            total, completed, completionPct, gainIfComplete, quality, whySelected, improveText, hitRate, missRate, statusLine,
            categoryName: currentCategory?.name || 'Desconhecida',
            totalMinutes,
            topic: activeSubject.task
        };
    }, [activeSubject, categories]);

    const cleanTaskText = (rawText, catName) => parseTaskDisplay(rawText, catName);

    return (
        <Motion.div
            drag={!isPanelLocked}
            dragMomentum={false}
            dragElastic={0.1}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, zIndex: 100 }}
            className={`flex flex-col w-full 2xl:w-[520px] shrink-0 relative group p-2 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-md shadow-xl ${!isPanelLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <div className="absolute -top-14 left-0 right-0 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-1 group-hover:-translate-y-0">
                {!isPanelLocked && (
                    <button
                        type="button"
                        onClick={resetPosition}
                        className="px-3 py-1.5 rounded-xl bg-slate-900/70 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                    >
                        <RotateCcw size={12} />
                        <span>Reset</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={toggleLock}
                    className={`p-2 rounded-xl transition-all border flex items-center justify-center ${isPanelLocked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                >
                    {isPanelLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
            </div>

            <AICoachPanel activeSubject={activeSubject} stats={stats} />
            <DataTriviaPanel studyLogs={studyLogs} simulados={simulados} categories={categories} />

            {activeTaskStats && (
                <div className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 relative overflow-hidden group/stats">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover/stats:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2 truncate pr-2">
                            <Target size={12} className="shrink-0" />
                            <span className="truncate">Matéria: {activeTaskStats.categoryName}</span>
                        </p>
                        <span className="text-[10px] font-black text-cyan-500/50 bg-cyan-500/10 px-2 py-0.5 rounded-md shrink-0">
                            {activeTaskStats.completionPct}% Completo
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-cyan-950 rounded-full mb-3 overflow-hidden">
                        <div
                            className="h-full bg-cyan-400 rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${activeTaskStats.completionPct}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed relative z-10">
                        <span className="block mb-1">
                            <strong className="text-cyan-300">Assunto atual:</strong> {cleanTaskText(activeTaskStats.topic, activeTaskStats.categoryName).displayTopic}
                        </span>
                        <span>
                            O <strong>assunto</strong> foi escolhido por {activeTaskStats.whySelected}. Progresso da <strong>matéria</strong>: <strong>{activeTaskStats.completionPct}%</strong> ({activeTaskStats.completed}/{activeTaskStats.total}).
                            {activeTaskStats.gainIfComplete > 0 ? (
                                <> Impacto na matéria ao concluir: <strong className="text-emerald-400">+{activeTaskStats.gainIfComplete}%</strong>.</>
                            ) : (
                                <> Sessão de revisão focada: <strong className="text-emerald-400">Manutenção de retenção</strong>.</>
                            )}
                        </span>
                    </p>
                    <div className="mt-3 relative z-10">
                        <p className="text-xs text-slate-400">
                            Nível da matéria: <strong className="text-white capitalize">{activeTaskStats.quality}</strong>. {activeTaskStats.improveText}
                        </p>
                        <p className="text-xs text-cyan-300/80 mt-1">{activeTaskStats.statusLine}</p>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="flex items-center gap-1.5 text-xs" title="Domínio da matéria"><CheckCircle2 size={12} className="text-emerald-500"/> <strong className="text-slate-200">{activeTaskStats.hitRate}%</strong> Domínio</span>
                            <span className="flex items-center gap-1.5 text-xs" title="Lacuna na matéria"><AlertCircle size={12} className="text-amber-500"/> <strong className="text-slate-200">{activeTaskStats.missRate}%</strong> Lacuna</span>
                            {activeTaskStats.totalMinutes > 0 && (
                                <span className="flex items-center gap-1.5 text-xs" title="Tempo dedicado à matéria"><Clock size={12} className="text-cyan-500"/> <strong className="text-slate-200">{Math.round(activeTaskStats.totalMinutes)}m</strong> na Matéria</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {recommendedTask && !activeSubject && (
                <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-slate-900/80 to-slate-900 border border-indigo-500/30 shadow-[0_20px_50px_rgba(79,70,229,0.15)] relative group/card"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover/card:scale-110 transition-transform">
                        <Zap size={48} className="text-indigo-400" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="inline-block px-3 py-1 rounded-lg bg-indigo-500/90 text-white text-[9px] font-bold uppercase tracking-widest">
                            ⚡ Recomendado pela IA
                        </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2 leading-tight">
                        {(() => {
                            const recInfo = cleanTaskText(recommendedTask.text || recommendedTask.title, recommendedTask.catName || recommendedTask.category);
                            return recInfo.displayTopic;
                        })()}
                    </h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                        Baseado na sua última performance, esta meta oferece a melhor janela de retenção agora.
                    </p>
                    <button
                        onClick={() => onStartTask(recommendedTask, null, 'neural_core')}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-[0.985]"
                    >
                        INICIAR AGORA
                        <ChevronRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-white/5 border border-white/10">
                                {recommendedTask.catIcon || '📚'}
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px]">{recommendedTask.catName || recommendedTask.category || 'Categoria Oculta'}</span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400/70 tracking-widest uppercase">Eficácia Máxima</span>
                    </div>
                </Motion.div>
            )}

            <div className="bg-[#08090f]/80 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-md flex-1 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Próximas Ações</p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-md">
                            {pendingCount} pendentes
                        </span>
                    )}
                </div>
                {visibleTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-white/[0.015] rounded-2xl border border-white/5">
                        <CheckCircle2 size={28} className="text-emerald-500/40 mb-3" />
                        <p className="text-xs font-bold text-slate-400 tracking-tight">Nenhuma ação pendente</p>
                        <p className="text-[9px] text-slate-600 mt-1">Todas as missões neurais completas ou em foco.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-3 custom-scrollbar">
                        {visibleTasks.filter(Boolean).map((task, idx) => {
                            const taskId = task.id || task.text || `fallback-task-${idx}`;
                            const categoryName = task.catName || task.category || 'Sem Categoria';
                            const isActive = activeSubject?.taskId === taskId;
                            const { displayTopic, secondaryText } = cleanTaskText(task.text || task.title, categoryName);
                            return (
                                <Motion.button
                                    key={`task-${taskId}-${idx}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => onStartTask(task, null, 'neural_core')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 group text-left relative overflow-hidden ${isActive
                                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-transparent group-hover:bg-white/10'}`} />
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: `${task.catColor || '#ffffff'}15`, border: `1px solid ${task.catColor || '#ffffff'}30` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <p className={`text-xs font-semibold truncate tracking-tight ${isActive ? 'text-amber-400' : 'text-slate-200'}`}>
                                            {displayTopic}
                                        </p>
                                        {secondaryText && (
                                            <p className="text-[9px] text-slate-400/80 truncate mt-0.5 font-medium">{secondaryText}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest opacity-70">{categoryName}</p>
                                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-amber-400' : 'text-cyan-400/70'}`}>• {isActive ? 'Em foco agora' : `Ação #${idx + 1}`}</p>
                                        </div>
                                    </div>
                                    {isActive ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            <Flame size={14} className="text-amber-400" />
                                            <span className="text-[7px] font-bold text-amber-500">ATIVO</span>
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                            <ChevronRight size={12} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    )}
                                </Motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </Motion.div>
    );
}

function PomodoroTopBar({ activeSubject, neuralMode, isLayoutLocked, onToggleLock }) {
    const cleanText = (text) => cleanTaskTitle(text, activeSubject?.category);

    return (
        <div className="w-full max-w-none lg:max-w-[min(95vw,600px)] mb-0 sm:mb-6 rounded-3xl sm:rounded-3xl border-x-0 border-y-2 sm:border-2 border-[#94785a] bg-[#b08e6b] px-4 sm:px-8 py-6 sm:py-10 shadow-2xl relative overflow-hidden group mx-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6 min-w-0 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-[#2d1a12]/10 border border-[#2d1a12]/20 flex items-center justify-center shrink-0 shadow-inner">
                        <div className="text-2xl font-black text-[#2d1a12]/80">{activeSubject ? 'F' : '⚡'}</div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#2d1a12]/60 truncate">{activeSubject?.category || 'SISTEMA'}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-700/60 animate-pulse shrink-0" />
                        </div>
                        <h1 className="text-sm sm:text-lg font-black text-[#2d1a12] tracking-tight leading-snug break-words line-clamp-3">
                            {activeSubject ? cleanText(activeSubject.task) : 'Aguardando protocolo...'}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-[#2d1a12]/30 bg-[#2d1a12]/5 text-[#2d1a12]">
                            {neuralMode ? 'NEURAL' : 'MANUAL'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleLock}
                        className={`p-3 rounded-xl border transition-all ${isLayoutLocked ? 'bg-white/5 border-[#2d1a12]/20 text-[#2d1a12]/50 hover:text-[#2d1a12]' : 'bg-[#2d1a12]/10 border-[#2d1a12]/40 text-[#2d1a12] '}`}
                    >
                        {isLayoutLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Pomodoro() {
    const activeId = useAppStore(state => state.appState?.activeId);
    const contest = useActiveContest() || EMPTY_OBJECT;
    const rawCategories = contest.categories || EMPTY_ARRAY;
    const categories = React.useMemo(() => (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })), [rawCategories]);
    const settings = contest.settings || EMPTY_OBJECT;
    const rawStudyLogs = contest.studyLogs || EMPTY_ARRAY;
    const studyLogs = React.useMemo(() => Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {}), [rawStudyLogs]);
    const rawSimulados = contest.simulados || EMPTY_ARRAY;
    const simulados = React.useMemo(() => Array.isArray(rawSimulados) ? rawSimulados : Object.values(rawSimulados || {}), [rawSimulados]);
    const user = contest.user || null;

    const isHydrated = !!activeId && contest !== EMPTY_OBJECT;

    const setData = useAppStore(state => state.setData);
    const handleUpdateStudyTime = useAppStore(state => state.handleUpdateStudyTime);
    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();
    const completionTimeoutRef = React.useRef(null);
    const pomodoroState = usePomodoroState();
    const activeSubject = pomodoroState.activeSubject;
    const setPomodoroActiveSubject = useAppStore(state => state.setPomodoroActiveSubject);
    const completedCycles = pomodoroState.completedCycles ?? 0;
    const accumulatedMinutes = pomodoroState.accumulatedMinutes ?? 0;
    const unloggedCycles = accumulatedMinutes > 0 ? completedCycles : 0;
    const neuralMode = pomodoroState.neuralMode;
    const neuralQueue = pomodoroState.neuralQueue || EMPTY_ARRAY;
    const entrySourceRef = useRef(location.state?.from || 'pomodoro');
    const topRef = useRef(null);

    useEffect(() => {
        if (activeSubject && topRef.current) {
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeSubject, activeSubject?.sessionInstanceId]);

    const resolveReturnPath = (source, forceDashboard = false) => {
        if (forceDashboard) return '/';
        const normalized = String(source || '').replace(/^\/+/, '');
        if (!normalized || normalized === 'pomodoro' || normalized === 'neural_core' || normalized === 'side_panel') {
            return '/pomodoro';
        }
if (normalized === 'dashboard' || normalized === 'dashboard_selector') {
            return '/';
        }
        return `/${normalized}`;
    };

    const resolveSessionSource = (subjectSource) => {
        const entry = String(entrySourceRef.current || '').replace(/^\/+/, '');
        const subject = String(subjectSource || '').replace(/^\/+/, '');
        if (entry === 'dashboard') return 'dashboard';
        return subject || entry || 'pomodoro';
    };

    const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroLayoutLocked');
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.error('Failed to parse pomodoroLayoutLocked:', error);
            return true;
        }
    });

    const toggleLayoutLock = () => {
        const newState = !isLayoutLocked;
        setIsLayoutLocked(newState);
        localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
    };

    const userStats = useMemo(() => {
        if (!contest || contest === EMPTY_OBJECT) {
            return {
                pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, unloggedCycles),
                consecutiveMinutes: 0,
                settings: null
            };
        }

        const now = new Date();
        const startOfToday = getLocalMidnight().getTime();
        let consecutiveStudyMinutes = 0;

        const recentLogs = [...(studyLogs || [])]
            .filter(log => log && log.date && new Date(log.date).getTime() >= startOfToday)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let lastTimeBoundary = now.getTime();

        for (const log of recentLogs) {
            const logDate = new Date(log.date).getTime();
            const minutes = Number(log.minutes) || 0;
            if (!logDate || minutes <= 0) continue;

            // FIX: respeitar endDate quando disponível para um cálculo mais preciso
            // do intervalo entre sessões (log.date pode ser o início ou o fim do registro).
            const boundary = log.endDate ? new Date(log.endDate).getTime() : logDate;

            const gapInMinutes = Math.max(0, (lastTimeBoundary - boundary) / (1000 * 60));
            if (gapInMinutes > 90) {
                break;
            }

            consecutiveStudyMinutes += minutes;
            const sessionStartTime = log.endDate ? logDate : (logDate - (minutes * 60 * 1000));
            lastTimeBoundary = sessionStartTime;
        }

        return {
            pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, unloggedCycles),
            consecutiveMinutes: consecutiveStudyMinutes,
            settings: settings,
            user: user
        };
    }, [unloggedCycles, contest, studyLogs, settings, user]);

    useEffect(() => {
        if (!activeSubject && location.state?.categoryId && location.state?.taskId) {
            const cat = (categories || []).find(c => c && c.id === location.state.categoryId);
            const tsk = (cat?.tasks || []).find(t => t && t.id === location.state.taskId);
            if (cat && tsk) {
                useAppStore.getState().startPomodoroSession({
                    categoryId: cat.id,
                    taskId: tsk.id,
                    category: cat.name,
                    task: tsk.title || tsk.text || 'Estudo',
                    priority: tsk.priority,
                    source: location.state?.from || 'dashboard'
                });
            }
        }
    }, [location.state, categories, activeSubject]);

    useEffect(() => {
        let timeoutId;
        if (!isHydrated) {
            timeoutId = setTimeout(() => {
                showToast('Contexto pendente. Retornando ao Dashboard...', 'warning');
                navigate('/');
            }, 6000);
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [isHydrated, navigate, showToast]);

    useEffect(() => {
        return () => { if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current); };
    }, []);

    const handleExit = useCallback((options = {}) => {
        const subjectSnapshot = options._subjectSnapshot || activeSubject;
        const currentSource = options.source || resolveSessionSource(subjectSnapshot?.source);

        if (subjectSnapshot) {
            // FIX: blindagem contra categories em formato de objeto (evita crash
            // se o estado vier como {} em vez de []).
            setData(prev => {
                const rawCats = prev.categories;
                const catsArray = Array.isArray(rawCats) ? rawCats : Object.values(rawCats || {});
                return {
                    ...prev,
                    categories: catsArray.map(c => c.id === subjectSnapshot.categoryId ? {
                        ...c,
                        tasks: (Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})).map(t => t.id === subjectSnapshot.taskId ? { ...t, status: undefined } : t)
                    } : c)
                };
            });
        }

        setPomodoroActiveSubject(null);
        const returnPath = resolveReturnPath(currentSource, Boolean(options.forceDashboard));
        navigate(returnPath, { replace: Boolean(options.forceDashboard) });
    }, [activeSubject, setData, setPomodoroActiveSubject, navigate]);

    const handleStartTask = (task, forcedSessionId = null, source = 'pomodoro') => {
        const sessionId = forcedSessionId || Date.now().toString();
        const pomodoroState = useAppStore.getState().appState?.pomodoro || {};
        const effectiveSource = (pomodoroState.neuralMode && source !== 'dashboard') ? 'neural_core' : source;
        const taskId = task?.id || task?.text;
        if (!taskId) return;

        if (effectiveSource === 'neural_core' && !pomodoroState.neuralMode) {
            const highPriority = [];
            categories.forEach(cat => {
                (cat.tasks || []).filter(t => !t.completed && t.priority === 'high').forEach(t => {
                    highPriority.push({ ...t, id: t.id || t.text, categoryId: cat.id, catName: cat.name });
                });
            });
            const queue = [...highPriority];
            let startIndex = queue.findIndex(t => (t.id || t.text) === taskId);
            if (startIndex === -1) {
                queue.unshift({ ...task, id: taskId, categoryId: task.catId || task.categoryId, catName: task.catName || task.category });
                startIndex = 0;
            }
            useAppStore.getState().startNeuralSession(queue, startIndex);
        } else {
            useAppStore.getState().setPomodoroActiveSubject({
                categoryId: task.catId || task.categoryId,
                taskId,
                category: task.catName || task.category,
                task: task.text || task.title || 'Estudo',
                priority: task.priority,
                source: effectiveSource,
                sessionInstanceId: sessionId
            });
        }
    };

    const handleFullCycleComplete = (totalMinutes = 0, wasNatural = true) => {
        const currentSubject = activeSubject || useAppStore.getState().appState?.pomodoro?.activeSubject;
        const { neuralMode } = useAppStore.getState().appState?.pomodoro || {};
        const store = useAppStore.getState();

        // FIX: Sessão PULADA (não natural) nunca deve:
        //  - exibir "Série finalizada!"
        //  - auto-concluir a tarefa
        //  - avançar a fila neural (sequenciar a próxima meta sem concluir a atual)
        // Ela apenas salva o progresso e encerra o foco atual.
        if (!wasNatural) {
            showToast(`Sessão encerrada manualmente. ${totalMinutes} minutos salvos no histórico.`, 'info');
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = setTimeout(() => {
                useAppStore.getState().setPomodoroActiveSubject(null);
            }, 400);
            return;
        }

        if (currentSubject) {
            showToast(`Série finalizada! ${totalMinutes} minutos salvos no histórico. 🚀💎`, 'success');

            const activeData = store.appState.contests[store.appState.activeId];

            if (neuralMode || currentSubject.source === 'neural_core') {
                store.toggleNeuralTask(currentSubject.taskId);
                showToast(`Status: "${currentSubject.task}" concluído! ✅`, 'success');
            } else {
                const cat = (activeData?.categories || []).find(c => c && c.id === currentSubject.categoryId);
                const catTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
                const task = catTasks.find(t => t && (t.id || t.text) === currentSubject.taskId);
                if (task && !task.completed) {
                    store.toggleTask(currentSubject.categoryId, currentSubject.taskId);
                    showToast(`Status: "${task.title || task.text}" concluído! ✅`, 'success');
                }
            }

            if (neuralMode || currentSubject.source === 'neural_core') {
                const hasNext = store.advanceNeuralQueue();
                if (hasNext) {
                    showToast(`Sequenciando próxima meta do painel... ⚡`, 'info');
                    return;
                } else {
                    showToast('Todas as ações concluídas! Progresso salvo. 🏆', 'success');
                    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
                    completionTimeoutRef.current = setTimeout(() => {
                        useAppStore.getState().setPomodoroActiveSubject(null);
                    }, 1000);
                    return;
                }
            }

            const sourceAfterFinish = resolveSessionSource(currentSubject?.source);
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = setTimeout(() => {
                const returnPath = resolveReturnPath(sourceAfterFinish, false);
                if (returnPath === '/pomodoro') {
                    showToast('Sessão finalizada! Selecione sua próxima meta.', 'info');
                    setPomodoroActiveSubject(null);
                    return;
                }
                showToast('Sessão finalizada! Retornando ao menu de origem...', 'info');
                handleExit({ source: sourceAfterFinish, _subjectSnapshot: currentSubject });
            }, 1000);
            return;
        } else {
            handleExit();
        }
    };

    const handleSessionComplete = () => {
        setData(prev => ({
            ...prev,
            lastPomodoroDate: new Date().toISOString()
        }));
    };

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center p-12 min-h-screen bg-[#0a0f1e]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Sistema Neural...</p>
                    <p className="text-slate-600 font-medium text-[9px] text-center mt-2 max-w-[250px]">
                        Autenticando parâmetros de foco.<br />Se não escolheu uma tarefa, voltaremos ao Dashboard em breve.
                    </p>
                </div>
            </div>
        );
    }

    return (<PageErrorBoundary pageName="Pomodoro">
        <div ref={topRef} className="min-h-[calc(100vh-88px)] flex items-start justify-center pt-12 sm:pt-6 lg:pt-8 pb-8 px-3 sm:px-3">
            <div className="flex flex-col 2xl:flex-row gap-0 sm:gap-6 2xl:gap-10 items-start justify-center w-full max-w-[1280px] 2xl:max-w-[1440px] mx-auto px-0 sm:px-4">
                <div className="flex-1 flex flex-col items-center min-w-0 w-full">
                    <PomodoroTopBar
                        activeSubject={activeSubject}
                        neuralMode={neuralMode}
                        isLayoutLocked={isLayoutLocked}
                        onToggleLock={toggleLayoutLock}
                    />
                    <PomodoroTimer
                        settings={settings}
                        activeSubject={activeSubject}
                        categories={categories || []}
                        onUpdateStudyTime={handleUpdateStudyTime}
                        onExit={handleExit}
                        onSessionComplete={handleSessionComplete}
                        onFullCycleComplete={handleFullCycleComplete}
                        isLayoutLocked={isLayoutLocked}
                        onToggleLock={toggleLayoutLock}
                        defaultTargetCycles={1}
                        key={activeSubject?.sessionInstanceId || 'idle'}
                    />
                </div>
                <FocusPanel
                    categories={categories || []}
                    activeSubject={activeSubject}
                    onStartTask={handleStartTask}
                    stats={userStats}
                    neuralMode={neuralMode}
                    neuralQueue={neuralQueue}
                    studyLogs={studyLogs}
                    simulados={simulados}
                />
            </div>
        </div>
    </PageErrorBoundary>);
}
```

---

## 2. [src/components/PomodoroTimer.jsx](file:///d:\Downloads\ultra-patched\src\components\PomodoroTimer.jsx)

**Descrição**: Motor híbrido otimizado combinando estado React e mutação DOM direta no loop requestAnimationFrame. Controla modos (work, break, long_break), fila neural e transições.

```jsx
/**
 * ============================================================================
 * 🛡️ ULTRA-DASHBOARD: CORE POMODORO ENGINE - DO NOT MODIFY 🛡️
 * ============================================================================
 * @ai-warning 
 * THIS FILE CONTAINS A HIGHLY OPTIMIZED, HYBRID STATE MACHINE. 
 * IT MIXES REACT STATE WITH DIRECT DOM MANIPULATION (via Refs) FOR MAXIMUM 
 * PERFORMANCE IN THE requestAnimationFrame LOOP.
 * 
 * CRITICAL RULES FOR FUTURE MODIFICATIONS:
 * 1. NEVER remove or alter `stateRefs.current`. It is required to prevent stale 
 *    closures during rapid UI interactions (Skip/Reset).
 * 2. NEVER change the direct DOM mutations (el.style.width / el.style.height) 
 *    in the animation loop or the `reset` function. React virtual DOM is 
 *    intentionally bypassed for performance.
 * 3. The `reset` function forces a complete DOM sweep (width=0%/100%) to 
 *    prevent the React Virtual DOM from desyncing with the real DOM.
 * ============================================================================
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, Lock, Unlock, AlertCircle, Zap, SkipForward, VolumeX, Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion as Motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { usePomodoroSync } from '../hooks/usePomodoroSync';
import { PomodoroProgress } from './pomodoro/PomodoroProgress';
import { PomodoroControls } from './pomodoro/PomodoroControls';
import { PomodoroHeader } from './pomodoro/PomodoroHeader';
import { PomodoroClock } from './pomodoro/PomodoroClock';
import ConfirmModal from './ConfirmModal';

// 🛠️ [UTIL] Utilitários fora do componente para evitar recriação e melhorar performance
// 🛡️ [FIX-TABID] window.name é "" por padrão em todas as abas, fazendo com que
// "tabId === window.name" bloqueie TODAS as mensagens recebidas de outras abas.
// Usamos um ID único por sessão de módulo para distinguir abas corretamente.
const STABLE_TAB_ID = `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const CIRCUMFERENCE = 2 * Math.PI * 110;

// 🛡️ [SHIELD-01] PomodoroErrorBoundary: Impede que erros internos derrubem o Dashboard
class PomodoroErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error, errorInfo) {
        console.error("Critical Pomodoro Failure:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full p-8 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="text-red-500" size={48} />
                    <h2 className="text-xl font-black text-red-500 uppercase tracking-widest">Protocolo de Emergência Ativado</h2>
                    <p className="text-sm text-red-200/60 max-w-md">O motor do cronómetro encontrou uma instabilidade crítica. Os seus dados foram preservados.</p>
                    <button
                        onClick={() => {
                            localStorage.removeItem('pomodoroState');
                            window.location.reload();
                        }}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg transition-all uppercase text-xs tracking-widest"
                    >
                        Reiniciar Motor Neural
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// M5/M6 FIX: Função pura extraída para nível de módulo — evita recriação a cada render
// e remove o risco de closure obsoleta na dep de useMemo.
function toPositiveMinutes(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(240, Math.max(1, Math.round(n)));
}

function PomodoroTimer({ settings = {}, activeSubject, onFullCycleComplete, onUpdateStudyTime, onExit, isLayoutLocked, onSessionComplete }) {
 
    const safeSettings = useMemo(() => Object.freeze({
        ...settings,
        pomodoroWork: toPositiveMinutes(settings?.pomodoroWork, 25),
        pomodoroBreak: toPositiveMinutes(settings?.pomodoroBreak, 5),
        pomodoroLongBreak: toPositiveMinutes(settings?.pomodoroLongBreak, 15),
        soundEnabled: settings?.soundEnabled ?? true
    }), [settings]);

    const [savedState] = useState(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroState'));
            if (saved &&
                activeSubject?.taskId &&
                saved.activeTaskId === activeSubject.taskId) {
                return saved;
            }
        } catch (error) {
            console.error('Failed to parse pomodoroState:', error);
        }
        return null;
    });

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) return savedState[key];
        return defaultValue;
    };

    // Estados Globais (Zustand)
    const mode = useAppStore(state => state.appState?.pomodoro?.mode || 'work');
    const sessions = useAppStore(state => state.appState?.pomodoro?.sessions || 1);
    const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
    const targetCycles = useAppStore(state => state.appState?.pomodoro?.targetCycles || 1);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);
    const completedCycles = useAppStore(state => state.appState?.pomodoro?.completedCycles || 0);
    const accumulatedMinutes = useAppStore(state => state.appState?.pomodoro?.accumulatedMinutes || 0);
    const completePomodoroPhase = useAppStore(state => state.completePomodoroPhase);
    const rewindPomodoroPhase = useAppStore(state => state.rewindPomodoroPhase);

    // Estados Locais
    const initialTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (mode === 'long_break' ? (safeSettings.pomodoroLongBreak || 15) * 60 : (safeSettings.pomodoroBreak || 5) * 60);
    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = getSavedState('timeLeft', initialTime);
        const t = Number(saved);
        return Number.isFinite(t) && t > 0 ? t : (Number.isFinite(initialTime) ? initialTime : 25 * 60);
    });
    const [isRunning, setIsRunning] = useState(() => getSavedState('isRunning', false));
    const [speed, setSpeed] = useState(() => getSavedState('speed', 1));
    const [isMuted, setIsMuted] = useState(() => {
        try {
            return localStorage.getItem('pomodoro_muted') === 'true';
        } catch { return false; }
    });
    const isMutedRef = useRef(isMuted); // NOVA REF

    const toggleMute = () => {
        setIsMuted(prev => {
            const newVal = !prev;
            isMutedRef.current = newVal; // Atualiza a Ref síncronamente
            try { 
                localStorage.setItem('pomodoro_muted', String(newVal)); 
                syncChannel?.postMessage({ type: 'TOGGLE_MUTE', isMuted: newVal, tabId: STABLE_TAB_ID });
            } catch (error) {
                console.error('Failed to set pomodoro_muted:', error);
            }
            return newVal;
        });
    };

    // Referência antiga de onIsRunningChange removida para evitar overhead desnecessário

    // Refs de Controle e Performance
    const stateRefs = useRef({
        mode,
        timeLeft,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes
    });
    const timeRef = useRef(timeLeft); // ✅ Só atualizado no RAF loop

    // 🛡️ [SHIELD-REF] Sincronização Imediata: Atualizamos as refs via Effect
    // Isso garante que skips/pauses disparados por eventos (que ocorrem após o render) usem valores 100% atuais.
    useEffect(() => {
        stateRefs.current = {
            ...stateRefs.current,
            mode, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes
        };
        // CORREÇÃO: Removido o bloco "if (!isRunning) { stateRefs.current.timeLeft = timeLeft; }".
        // A Ref (stateRefs) é a fonte de verdade absoluta e de alta precisão. O React State (timeLeft)
        // é visual e desfasado, JAMAIS deve sobrescrever a Ref sob o risco de Time Leaks.
    }, [mode, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes]);


    const [syncChannel] = useState(() => typeof window !== 'undefined' ? new BroadcastChannel('pomodoro_sync') : null);
    // BUG-6 FIX: Cleanup do BroadcastChannel no criador (ownership correto)
    useEffect(() => {
        return () => {
            try { syncChannel?.close(); } catch { /* já fechado */ }
        };
    }, [syncChannel]);
    const speedRef = useRef(1);
    useEffect(() => {
        speedRef.current = speed;
        // Broadcast speed change to other tabs
        try {
            syncChannel?.postMessage({
                type: 'SPEED_CHANGE',
                speed,
                tabId: STABLE_TAB_ID
            });
        } catch (error) {
            console.error('Failed to post SPEED_CHANGE message:', error);
        }
    }, [speed, syncChannel]);


    const transitionTimeoutRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    // BUG-10 FIX: Ref para evitar closure stale no guard do transitionSession
    const isTransitioningRef = useRef(false);
    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const alarmAudioRef = useRef(null);
    const workFillsRef = useRef([]);
    const breakBallsRef = useRef([]);

    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
            setIsTransitioning(false);
            isTransitioningRef.current = false;
        };
    }, []);
    const showToast = useToast();

    // 🟢 CÓDIGO NOVO 1: Controlo de Montagem para evitar Race Conditions
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // 🛡️ [FIX-MEMORYLEAK] Trunca explicitamente os arrays de referências para evitar acúmulo de nós mortos
    useEffect(() => {
        if (workFillsRef.current) {
            workFillsRef.current = workFillsRef.current.slice(0, targetCycles || 1);
        }
        if (breakBallsRef.current) {
            breakBallsRef.current = breakBallsRef.current.slice(0, (targetCycles || 1) - 1);
        }
    }, [targetCycles]);

    // 🛡️ [FIX-STALE-SUBJECT] Ref para evitar closure stale do activeSubject no handler do BroadcastChannel
    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => { activeSubjectRef.current = activeSubject; }, [activeSubject]);

    // 🛡️ [SHIELD-02] Prop Safety Wrappers
    const safeOnUpdateStudyTime = useCallback((...args) => {
        if (typeof onUpdateStudyTime === 'function' && isMountedRef.current) {
            try { onUpdateStudyTime(...args); } catch (e) { console.error('[Shield] Callback Error (onUpdateStudyTime):', e); }
        }
    }, [onUpdateStudyTime]);

    const safeOnFullCycleComplete = useCallback((...args) => {
        if (typeof onFullCycleComplete === 'function' && isMountedRef.current) {
            try { onFullCycleComplete(...args); } catch (e) { console.error('[Shield] Callback Error (onFullCycleComplete):', e); }
        }
    }, [onFullCycleComplete]);

    const safeOnExit = useCallback((...args) => {
        if (typeof onExit === 'function' && isMountedRef.current) {
            try { onExit(...args); } catch (e) { console.error('[Shield] Callback Error (onExit):', e); }
        }
    }, [onExit]);

    // 🛡️ [SHIELD-07] Prevenção de Fuga de Tempo (Time Leak) ao trocar de Tarefa
    const prevTaskStateRef = useRef({ subject: activeSubject, accum: 0, time: initialTime, mode: mode });

    useEffect(() => {
        const prev = prevTaskStateRef.current;
        // Se a tarefa mudou, injetamos imediatamente os minutos pendentes da tarefa antiga
        if (prev.subject && activeSubject?.taskId !== prev.subject.taskId) {
            let lostMinutes = prev.accum;
            if (prev.mode === 'work') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                // CORREÇÃO: Prevenir a aniquilação do histórico do utilizador com NaN Posioning
                const safePrevTime = Number.isFinite(Number(prev.time)) ? Number(prev.time) : totalWorkSeconds;
                lostMinutes += Number((Math.max(0, totalWorkSeconds - safePrevTime) / 60).toFixed(2));
            }
            if (lostMinutes > 0 && !Number.isNaN(lostMinutes)) {
                safeOnUpdateStudyTime(prev.subject.categoryId, lostMinutes, prev.subject.taskId);
                if (typeof onSessionComplete === 'function') onSessionComplete();
            }
        }
        // 🛡️ [FIX-SHIELD-07] Usa stateRefs.current.timeLeft (sempre atual no RAF loop)
        // em vez de timeLeft (React state), que pode ficar centenas de segundos atrasado
        // enquanto o timer está rodando, causando cálculo errado de minutos perdidos.
        prevTaskStateRef.current = { subject: activeSubject, accum: accumulatedMinutes, time: stateRefs.current.timeLeft, mode };
    }, [activeSubject, accumulatedMinutes, mode, safeSettings.pomodoroWork, safeOnUpdateStudyTime, onSessionComplete]);

    // 🛡️ [SHIELD-04] Sincronização de Estado Local com o Store
    // Garante que o cronómetro reseta quando mudamos de tarefa ou modo via Sidebar/Store
    useEffect(() => {
        if (!isTransitioning) {
            const newTotalTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (mode === 'long_break' ? (safeSettings.pomodoroLongBreak || 15) * 60 : (safeSettings.pomodoroBreak || 5) * 60);

            // Só resetamos se não estiver a correr ou se a tarefa mudou completamente
            const taskChanged = activeSubject?.taskId !== stateRefs.current.lastTaskId;
                if (taskChanged && stateRefs.current.lastTaskId !== undefined) {
                    if (stateRefs.current.isRunning) {
                        setIsRunning(false);
                        stateRefs.current.isRunning = false;
                    }
                    useAppStore.setState(state => {
                        if (state.appState?.pomodoro) {
                            state.appState.pomodoro.accumulatedMinutes = 0;
                            state.appState.pomodoro.completedCycles = 0;
                        }
                        return state;
                    });
                }

                // 🛡️ [FIX-SET-STATE] Direct state update inside effect is safe; removed setTimeout to prevent
                // orphaned state updates if the component unmounts before the 0ms timer fires.
                setTimeLeft(newTotalTime);
                stateRefs.current.timeLeft = newTotalTime;
                stateRefs.current.lastTaskId = activeSubject?.taskId;

                if (clockRef.current) {
                    const mins = Math.floor(newTotalTime / 60);
                    const secs = newTotalTime % 60;
                    clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }
                if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);
            }
        }
    }, [activeSubject?.taskId, mode, safeSettings, isTransitioning]);



    // 🛡️ [SHIELD-SYNC-DOM] Sincronização Forçada do DOM (B-14 FIX)
    // Garante que as barras tenham o tamanho correto ao carregar ou trocar de fase, 
    // mesmo que o cronómetro esteja parado (loop RAF inativo).
    React.useLayoutEffect(() => {
        if (!isMountedRef.current) return;

        // O LayoutEffect repara a IU para o momento zero de uma nova fase.
        // O requestAnimationFrame (no outro hook) lidará com as interpolações da barra de 100% a 0%.
        const currentMode = mode;
        const currentSessions = sessions;

        // Sincroniza as barras de trabalho (bottom)
        workFillsRef.current.forEach((el, i) => {
            if (!el) return;
            if (i < currentSessions - 1 || (i === currentSessions - 1 && currentMode !== 'work')) {
                el.style.width = '100%';
            } else if (i === currentSessions - 1 && currentMode === 'work') {
                el.style.width = '0%';
            } else {
                el.style.width = '0%';
            }
        });

        // Sincroniza as bolas de pausa (bottom)
        breakBallsRef.current.forEach((el, i) => {
            if (!el) return;
            if (i < currentSessions - 1) {
                el.style.height = '100%';
            } else if (i === currentSessions - 1 && (currentMode === 'break' || currentMode === 'long_break')) {
                el.style.height = '0%';
            } else {
                el.style.height = '0%';
            }
        });

        // 🛡️ [FIX-CIRCLE-SYNC] Sincroniza também a barra circular do relógio
        if (svgCircleRef.current) {
            svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);
        }
    }, [mode, sessions, targetCycles, safeSettings.pomodoroWork, safeSettings.pomodoroBreak, safeSettings.pomodoroLongBreak]);




    // Sincronização Multi-Aba Robusta (Protocolo V2) delegada para o Hook Customizado
    usePomodoroSync({
        syncChannel,
        STABLE_TAB_ID,
        setIsRunning,
        stateRefs,
        setTimeLeft,
        showToast,
        setSpeed,
        speedRef,
        activeSubjectRef,
        clockRef,
        setIsMuted,
        isMutedRef
    });

    // Fallback de segurança: O storage event é opcional quando o BroadcastChannel está ativo, 
    // mas pode ser útil se o utilizador abrir o dashboard num navegador muito antigo.
    // No entanto, para evitar duplicação de eventos, mantemos apenas o canal principal.

    // B-05 FIX: Cleanup do áudio para evitar memory leak
    useEffect(() => {
        try { alarmAudioRef.current = new Audio('/sounds/alarm.wav'); } catch (error) {
            console.error('Failed to load alarm audio:', error);
        }
        return () => {
            if (alarmAudioRef.current) {
                try {
                    alarmAudioRef.current.pause();
                    alarmAudioRef.current.src = '';
                } catch (error) {
                    console.error('Failed to cleanup alarm audio:', error);
                }
                alarmAudioRef.current = null;
            }
        };
    }, []);

    const savePomodoroState = useCallback((overrides = {}) => {
        if (!activeSubject?.taskId) return;
        try {
            const current = stateRefs.current;
            const stateToSave = {
                activeTaskId: activeSubject.taskId,
                mode: current.mode,
                timeLeft: current.timeLeft,
                isRunning: current.isRunning,
                sessions: current.sessions,
                // B-03 FIX: Salvar targetCycles para não resetar no reload
                targetCycles: current.targetCycles,
                completedCycles: current.completedCycles,
                accumulatedMinutes: current.accumulatedMinutes,
                speed: speedRef.current,
                savedAt: Date.now(),
                ...overrides
            };
            localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Failed to save pomodoroState:', error);
        }
    }, [activeSubject]);

    useEffect(() => {
        return () => {
            if (stateRefs.current.isRunning) {
                savePomodoroState({ isRunning: false });
            }
        };
    }, [savePomodoroState]);

    const transitionSession = useCallback((completedMode, source = 'natural') => {
        // BUG-10 FIX: Usar ref para guard — imune a closure stale
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;
        setIsTransitioning(true);

        setIsRunning(false);
        stateRefs.current.isRunning = false;

        const isManual = source !== 'natural';

        // Em transitionSession, mude de `!isMuted` para `!isMutedRef.current`
        if (source === 'natural' && safeSettings.soundEnabled && !isMutedRef.current) {
            try { 
                const playPromise = alarmAudioRef.current?.play();
                if (playPromise !== undefined) {
                    playPromise.catch((error) => {
                        console.warn('[Audio] O navegador bloqueou o alarme (Autoplay Policy):', error);
                    });
                }
            } catch (error) {
                console.error('Critical failure playing alarm:', error);
            }
        }

        const currentSessions = stateRefs.current.sessions;
        const currentTarget = stateRefs.current.targetCycles;
        // 🛡️ [FIX-SKIP-TIME] Separamos "última sessão de trabalho" de "conclusão natural":
        // o tempo deve ser salvo em ambos os casos (natural + skip), mas a callback de ciclo
        // completo (que auto-completa tarefa e avança queue neural) só dispara no natural.
        const isLastWorkSession = currentSessions >= currentTarget && stateRefs.current.mode === 'work';
        const isEndingCycle = isLastWorkSession && (source === 'natural' || source === 'skip');

        let sessionMinutes = 0;
        if (completedMode === 'work') {
            if (!isManual) {
                sessionMinutes = Number((safeSettings.pomodoroWork || 25).toFixed(2));
            } else if (source === 'skip') {
                // Regra UX: ao pular o último bloco de foco, conta o ciclo completo para avançar a fila.
                if (isLastWorkSession) {
                    sessionMinutes = Number((safeSettings.pomodoroWork || 25).toFixed(2));
                } else {
                    const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                    sessionMinutes = Number((Math.max(0, totalWorkSeconds - stateRefs.current.timeLeft) / 60).toFixed(2));
                }
            }
        }

        const targetSubject = activeSubjectRef.current;

        transitionTimeoutRef.current = setTimeout(() => {
            // 🟢 CÓDIGO NOVO 3: Proteção contra desmontagem súbita (Race Condition Fix)
            if (!isMountedRef.current || !clockRef.current) {
                setIsTransitioning(false);
                transitionTimeoutRef.current = null;
                return; // Aborta a atualização visual se o componente já não existe
            }

            // ✅ FIX BUG-07: Passamos os minutos trabalhados e recebemos os totais reais
            const savedMinutes = completePomodoroPhase(isManual, sessionMinutes);

            if (isLastWorkSession && targetSubject && completedMode === 'work') {
                safeOnUpdateStudyTime(targetSubject.categoryId, savedMinutes, targetSubject.taskId);
            }

            if (typeof onSessionComplete === 'function') onSessionComplete();

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : (newState.mode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);

            setTimeLeft(resetTime);
            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;

            if (clockRef.current) {
                const mins = Math.floor(resetTime / 60);
                const secs = resetTime % 60;
                clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: resetTime, mode: newState.mode });

            try {
                syncChannel?.postMessage({ type: isManual ? 'PHASE_SKIP' : 'PHASE_COMPLETE', toMode: newState.mode, tabId: STABLE_TAB_ID });
            } catch (error) {
                console.error('Failed to post PHASE message:', error);
            }

            setIsTransitioning(false);
            isTransitioningRef.current = false;

            if (isEndingCycle) {
                // B-08 FIX: Passar flag de conclusão natural
                // ✅ FIX BUG-07: Usar savedMinutes capturado de forma síncrona
                safeOnFullCycleComplete(savedMinutes || 0, source === 'natural');
            }
        }, 50);
    }, [safeSettings, completePomodoroPhase, savePomodoroState, safeOnUpdateStudyTime, safeOnFullCycleComplete, onSessionComplete, syncChannel]);

    // Motor de Animação Blindado e Otimizado (Resiliente a Abas em Segundo Plano)
    // O loop só roda quando isRunning é true, poupando CPU/GPU significativamente.
    // Usa âncora absoluta e alterna para setTimeout quando a aba está oculta para evitar congelamento.
    useEffect(() => {
        if (!isRunning) return;

        let rafId;
        let timeoutId;
        const startTime = performance.now();
        const startLeft = stateRefs.current.timeLeft;

        const tick = () => {
            const now = performance.now();
            // Cálculo de tempo decorrido com base na âncora absoluta, imune a congelamentos de rAF
            const elapsedSeconds = ((now - startTime) / 1000) * (speedRef.current || 1);
            const oldTime = stateRefs.current.timeLeft;
            const newTime = Math.max(0, startLeft - elapsedSeconds);
            stateRefs.current.timeLeft = newTime;
            timeRef.current = newTime; // ✅ ref dedicada

            const currentTotalTime = stateRefs.current.mode === 'work'
                ? (safeSettings.pomodoroWork || 25) * 60
                : stateRefs.current.mode === 'long_break'
                    ? (safeSettings.pomodoroLongBreak || 15) * 60
                    : (safeSettings.pomodoroBreak || 5) * 60;

            const fraction = newTime / (currentTotalTime || 1);
            const displaySecond = Math.ceil(newTime);
 
            // 🛡️ [SHIELD-DESYNC-FIX] Sincroniza o estado do React apenas na mudança de segundo inteiro
            if (Math.floor(oldTime) !== Math.floor(newTime)) {
                setTimeLeft(newTime); 
            }

            if (clockRef.current) {
                const mins = Math.floor(displaySecond / 60);
                const secs = displaySecond % 60;
                const timeString = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
                if (clockRef.current.textContent !== timeString) {
                    clockRef.current.textContent = timeString;
                }
            }

            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;

            const s = stateRefs.current.sessions;
            if (stateRefs.current.mode === 'work') {
                const workEl = workFillsRef.current[s - 1];
                if (workEl) workEl.style.width = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;
            } else {
                const breakEl = breakBallsRef.current[s - 1];
                if (breakEl) breakEl.style.height = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;
            }

            if (newTime <= 0) {
                transitionSession(stateRefs.current.mode, 'natural');
            } else {
                if (document.hidden) {
                    // Quando a aba está oculta, agenda via setTimeout para evitar suspensão
                    timeoutId = setTimeout(tick, 1000 / (speedRef.current || 1));
                } else {
                    rafId = requestAnimationFrame(tick);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
                timeoutId = setTimeout(tick, 1000 / (speedRef.current || 1));
            } else {
                if (timeoutId) clearTimeout(timeoutId);
                rafId = requestAnimationFrame(tick);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Inicia a execução do loop
        if (document.hidden) {
            timeoutId = setTimeout(tick, 1000 / (speedRef.current || 1));
        } else {
            rafId = requestAnimationFrame(tick);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (rafId) cancelAnimationFrame(rafId);
            if (timeoutId) clearTimeout(timeoutId);
        };
    // BUG-7 FIX CORRECTION: 'speed' MUST be in the dependencies.
    // If the speed changes, we must reset the time anchor (startTime),
    // otherwise the total elapsed time will be multiplied by the new speed, causing huge time jumps.
    }, [isRunning, safeSettings, transitionSession, speed]);

    const reset = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch (error) {
            console.error('Failed to reset alarm audio:', error);
        } }

        const currentMode = stateRefs.current.mode;
        const currentSessions = stateRefs.current.sessions;
        const currentTimeLeft = stateRefs.current.timeLeft;
        const currentTotalTime = currentMode === 'work' ? safeSettings.pomodoroWork * 60 : (currentMode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);

        // SE O TEMPO JÁ ESTIVER CHEIO: Volta de fase
        if (currentTimeLeft >= currentTotalTime - 0.5) {
            showToast('Voltando fase...', 'info');

            // Retrocesso no estado global
            rewindPomodoroPhase();

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : (newState.mode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);

            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;
            stateRefs.current.isRunning = false;

            setIsRunning(false);
            setTimeLeft(resetTime);

            // Limpeza visual de todas as fases futuras para garantir sincronia
            workFillsRef.current.forEach((el, i) => {
                if (el) el.style.width = (i < newState.sessions - 1 || (i === newState.sessions - 1 && (newState.mode === 'break' || newState.mode === 'long_break'))) ? '100%' : '0%';
            });
            breakBallsRef.current.forEach((el, i) => {
                if (el) el.style.height = (i < newState.sessions - 1) ? '100%' : '0%';
            });

            if (clockRef.current) clockRef.current.textContent = formatTime(resetTime);
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: resetTime, mode: newState.mode });
            try { syncChannel?.postMessage({ type: 'PHASE_REWIND', toMode: newState.mode, tabId: STABLE_TAB_ID }); } catch (error) {
                console.error('Failed to post PHASE_REWIND message:', error);
            }

        } else {
            // SE O TEMPO ESTAVA CORRENDO: Apenas reinicia o tempo da sessão atual!
            showToast('Cronômetro reiniciado', 'info');

            // Limpeza visual imediata apenas da fase atual
            if (currentMode === 'work') {
                if (workFillsRef.current[currentSessions - 1]) workFillsRef.current[currentSessions - 1].style.width = '0%';
            } else {
                if (breakBallsRef.current[currentSessions - 1]) breakBallsRef.current[currentSessions - 1].style.height = '0%';
            }

            stateRefs.current.timeLeft = currentTotalTime;
            stateRefs.current.isRunning = false;

            setIsRunning(false);
            setTimeLeft(currentTotalTime);

            if (clockRef.current) clockRef.current.textContent = formatTime(currentTotalTime);
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: currentTotalTime });
            try { syncChannel?.postMessage({ type: 'TIMER_RESET', tabId: STABLE_TAB_ID }); } catch (error) {
                console.error('Failed to post TIMER_RESET message:', error);
            }
        }
    };

    const skip = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch (error) {
            console.error('Failed to reset alarm audio on skip:', error);
        } }

        // B-10 FIX: Usar refs para evitar estado "stale" do React durante skip
        const s = stateRefs.current.sessions;
        const currentMode = stateRefs.current.mode;

        if (currentMode === 'work') {
            if (workFillsRef.current[s - 1]) workFillsRef.current[s - 1].style.width = '100%';
        } else {
            const breakEl = breakBallsRef.current[s - 1];
            if (breakEl) breakEl.style.height = '100%';
        }

        transitionSession(currentMode, 'skip');
    };

    const togglePlay = useCallback(() => {
        if (!activeSubject) return;

        if (alarmAudioRef.current && alarmAudioRef.current.paused && alarmAudioRef.current.currentTime === 0) {
            alarmAudioRef.current.volume = 0;
            alarmAudioRef.current.play().then(() => {
                alarmAudioRef.current?.pause();
                if (alarmAudioRef.current) {
                    alarmAudioRef.current.currentTime = 0;
                    alarmAudioRef.current.volume = 1;
                }
            }).catch(err => console.debug('Audio play skipped:', err));
        }

        const next = !isRunning;
        stateRefs.current.isRunning = next;
        setIsRunning(next);

        if (!next) {
            setTimeLeft(stateRefs.current.timeLeft);
        }

        try {
            syncChannel?.postMessage({
                type: next ? 'START_SESSION' : 'PAUSE_SESSION',
                timeLeft: stateRefs.current.timeLeft,
                tabId: STABLE_TAB_ID
            });
        } catch (error) {
            console.error('Failed to post session status message:', error);
        }
    }, [activeSubject, isRunning, syncChannel]);

    const handleManualExit = () => {
        // BUG FIX: Salvar tempo pendente da tarefa atual antes de abortar
        if (stateRefs.current.mode === 'work' && activeSubject) {
            let lostMinutes = stateRefs.current.accumulatedMinutes || 0;
            const totalWorkSeconds = safeSettings.pomodoroWork * 60;
            const safePrevTime = Number.isFinite(Number(stateRefs.current.timeLeft)) ? Number(stateRefs.current.timeLeft) : totalWorkSeconds;
            lostMinutes += Number((Math.max(0, totalWorkSeconds - safePrevTime) / 60).toFixed(2));
            
            if (lostMinutes > 0 && !Number.isNaN(lostMinutes)) {
                safeOnUpdateStudyTime(activeSubject.categoryId, lostMinutes, activeSubject.taskId);
                if (typeof onSessionComplete === 'function') onSessionComplete();
            }
        }
        
        // Botão vermelho (estado inativo): apenas voltar ao Dashboard, sem processamento extra.
        safeOnExit({ forceDashboard: true, source: 'dashboard' });
    };

    const totalTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : (mode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);
    const isProtocolInactive = !activeSubject;

    return (
        <div className="w-full relative min-h-[80vh] flex flex-col items-center">
            <div
                className={`w-full max-w-none lg:max-w-[min(95vw,600px)] space-y-12 relative flex flex-col items-center mx-auto ${!isLayoutLocked ? 'z-[90]' : 'z-50'}`}
            >
                <div className="relative flex items-center justify-center py-2 w-full px-4">
                    <PomodoroHeader 
                        mode={mode} 
                        activeSubject={activeSubject} 
                        onManualExit={handleManualExit} 
                    />
                </div>

                <div className="w-full flex justify-end px-4 -mb-8 relative z-50">
                     <button 
                        onClick={toggleMute}
                        className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl backdrop-blur-md group"
                        title={isMuted ? "Ativar Áudio" : "Mudar para Silencioso"}
                    >
                        {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-emerald-400" />}
                    </button>
                </div>

                <div
                    style={{ backgroundImage: 'url(/wood-texture.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)' }}
                    className="w-full border-y-[6px] border-x-0 sm:border-[6px] border-[#3f2e26] pt-32 pb-16 px-4 sm:px-10 rounded-3xl sm:rounded-3xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a] shadow-2xl z-10"
                >
                    <PomodoroClock 
                        speed={speed}
                        setSpeed={setSpeed}
                        isProtocolInactive={isProtocolInactive}
                        mode={mode}
                        isRunning={isRunning}
                        timeLeft={timeLeft}
                        safeSettings={safeSettings}
                        svgCircleRef={svgCircleRef}
                        clockRef={clockRef}
                    />

                    <PomodoroControls
                        isProtocolInactive={isProtocolInactive}
                        isRunning={isRunning}
                        onReset={reset}
                        onTogglePlay={togglePlay}
                        onSkip={skip}
                    />

                    {/* Botão de Abandono Crítico */}
                    {!isProtocolInactive && (
                        <div className="w-full max-w-xs mt-8 pt-4 border-t border-white/5">
                            <button
                                onClick={() => setShowAbandonConfirm(true)}
                                className="w-full flex items-center justify-center gap-3 p-3 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 rounded-2xl transition-all text-xs font-bold text-red-400 group"
                            >
                                <RotateCcw size={14} className="text-red-500 group-hover:rotate-[-90deg] transition-transform" />
                                ABORTAR SESSÃO
                            </button>
                        </div>
                    )}
                </div>

                <PomodoroProgress 
                    targetCycles={targetCycles}
                    completedCycles={completedCycles}
                    sessions={sessions}
                    setTargetCycles={setTargetCycles}
                    syncChannel={syncChannel}
                    STABLE_TAB_ID={STABLE_TAB_ID}
                    activeSubject={activeSubject}
                    workFillsRef={workFillsRef}
                    breakBallsRef={breakBallsRef}
                    mode={mode}
                    timeLeft={timeLeft}
                    totalTime={totalTime}
                />
            </div>

            <ConfirmModal
                isOpen={showAbandonConfirm}
                onClose={() => setShowAbandonConfirm(false)}
                onConfirm={handleManualExit}
                title="Abortar Sessão"
                message="Deseja realmente abandonar a sessão? O progresso não salvo desta sessão será perdido."
                confirmText="Abortar Sessão"
                type="danger"
            />
        </div>
    );
}

// 🛡️ [SHIELD-06] Final Blindagem Auditada
export default function ProtectedPomodoro(props) {
    return (
        <PomodoroErrorBoundary>
            <PomodoroTimer {...props} />
        </PomodoroErrorBoundary>
    );
}
```

---

## 3. [src/components/pomodoro/PomodoroClock.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroClock.jsx)

**Descrição**: Componente visual SVG e digital do relógio, seletor de velocidade de tempo (1X, 10X, 100X) e indicadores de fase.

```jsx
import React from 'react';

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export function PomodoroClock({
    speed,
    setSpeed,
    isProtocolInactive,
    mode,
    isRunning,
    timeLeft,
    safeSettings,
    svgCircleRef,
    clockRef
}) {
    return (
        <>
            <div className="absolute top-4 right-6 z-[60]">
                <div className="flex bg-[#1a1411] p-1 rounded-2xl border border-[#3f2e26]/80 shadow-inner backdrop-blur-md">
                    {[1, 10, 100].map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            disabled={isProtocolInactive}
                            className={`px-3 h-8 rounded-xl text-[11px] font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed ${speed === s ? 'bg-[#b08e6b] text-[#2d1a12] shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                        >
                            {s}X
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4 mb-10 z-30 opacity-60">
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white">FOCO</span>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white">PAUSA</span>
            </div>

            {/* BUG-11 FIX: Adicionado viewBox para escalar corretamente em mobile */}
            <div className="relative mt-12 mb-8 rounded-full">
                <svg viewBox="0 0 256 256" className="w-[min(74vw,16rem)] h-[min(74vw,16rem)] sm:w-64 sm:h-64 transform -rotate-90 relative z-10">
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round" />
                    <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={mode === 'work' ? '#3b82f6' : (mode === 'long_break' ? '#a855f7' : '#22c55e')} />
                            <stop offset="100%" stopColor={mode === 'work' ? '#2563eb' : (mode === 'long_break' ? '#9333ea' : '#10b981')} />
                        </linearGradient>
                    </defs>
                    {/* BUG-1 FIX: Fórmula corrigida — offset = CIRCUMFERENCE * fracção restante.
                       Quando timeLeft === totalTime, offset = CIRCUMFERENCE (anel vazio = nada avançado).
                       Quando timeLeft === 0, offset = 0 (anel cheio = tudo completado). */}
                    <circle
                        ref={svgCircleRef}
                        cx="128" cy="128" r="110" fill="none"
                        stroke="url(#timerGradient)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 110}
                        style={{
                            strokeDashoffset: (() => {
                                const totalTime = mode === 'work'
                                    ? Math.max(1, (safeSettings.pomodoroWork || 25) * 60)
                                    : mode === 'long_break'
                                        ? Math.max(1, (safeSettings.pomodoroLongBreak || 15) * 60)
                                        : Math.max(1, (safeSettings.pomodoroBreak || 5) * 60);
                                const fraction = Math.max(0, Math.min(1, timeLeft / totalTime));
                                return (2 * Math.PI * 110) * fraction;
                            })()
                        }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span ref={clockRef} className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white drop-shadow-2xl leading-none tabular-nums">{formatTime(timeLeft)}</span>
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] sm:tracking-[0.4em] text-white mt-2 text-center px-2">
                        {isRunning ? (mode === 'work' ? 'PROTOCOL Foco' : (mode === 'long_break' ? 'Pausa Longa' : 'Recuperação')) : 'SESSÃO PAUSADA'}
                    </span>
                </div>
            </div>
        </>
    );
}
```

---

## 4. [src/components/pomodoro/PomodoroControls.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroControls.jsx)

**Descrição**: Botões de controle de fluxo: Voltar (Reset), Play/Pause e Pular (SkipForward).

```jsx
import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export function PomodoroControls({
    isProtocolInactive,
    isRunning,
    onReset,
    onTogglePlay,
    onSkip
}) {
    return (
        <div className="flex flex-wrap sm:grid sm:grid-cols-3 items-center justify-center gap-4 z-10 mt-10 w-full max-w-2xl px-6">
            <div className="flex flex-col items-center gap-3">
                <button onClick={onReset} disabled={isProtocolInactive} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                    <RotateCcw size={24} />
                </button>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">VOLTAR</span>
            </div>

            <div className="flex flex-col items-center justify-center">
                <button
                    onClick={onTogglePlay}
                    disabled={isProtocolInactive}
                    className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center border-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isRunning ? 'bg-stone-100 text-black border-white' : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.3)]'}`}
                >
                    {isRunning ? <Pause size={48} className="sm:w-16 sm:h-16" /> : <Play size={48} className="sm:w-16 sm:h-16 ml-2" />}
                </button>
            </div>

            <div className="flex flex-col items-center gap-3">
                <button onClick={onSkip} disabled={isProtocolInactive} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                    <SkipForward size={24} />
                </button>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">PULAR</span>
            </div>
        </div>
    );
}
```

---

## 5. [src/components/pomodoro/PomodoroHeader.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroHeader.jsx)

**Descrição**: Exibe avisos visuais de Recuperação Neural, Pausa Longa ou alerta de Protocolo Inativo.

```jsx
import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Zap, AlertCircle } from 'lucide-react';

export function PomodoroHeader({ mode, activeSubject, onManualExit }) {
    return (
        <div className="flex-1 flex justify-center bg-transparent">
            {mode === 'break' || mode === 'long_break' ? (
                <Motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative flex items-center justify-center gap-4 w-full rounded-2xl py-5 border ${mode === 'long_break' ? 'bg-violet-900/30 border-violet-500/40' : 'bg-emerald-900/30 border-emerald-500/40'}`}
                >
                    <Zap size={20} className={`${mode === 'long_break' ? 'text-violet-400' : 'text-emerald-400'}`} />
                    <span className={`text-lg font-black ${mode === 'long_break' ? 'text-violet-400' : 'text-emerald-400'} tracking-widest uppercase`}>
                        {mode === 'long_break' ? 'Pausa Longa' : 'Recuperação Neural'}
                    </span>
                </Motion.div>
            ) : !activeSubject ? (
                <div onClick={onManualExit} className="w-full bg-red-950/20 border border-dashed border-red-500/30 rounded-2xl py-4 flex items-center justify-center gap-4 cursor-pointer hover:bg-red-900/40 transition-all">
                    <AlertCircle size={20} className="text-red-500" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-red-500/70 uppercase tracking-widest">Protocolo Inativo</span>
                        <span className="text-xs font-bold text-red-500">Selecione uma missão neural</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
```

---

## 6. [src/components/pomodoro/PomodoroProgress.jsx](file:///d:\Downloads\ultra-patched\src\components\pomodoro\PomodoroProgress.jsx)

**Descrição**: Indicador visual segmentado de ciclos concluídos e metas de ciclos, com botões para ajustar meta (+ / -).

```jsx
import React from 'react';

export function PomodoroProgress({
    targetCycles,
    completedCycles,
    sessions,
    setTargetCycles,
    syncChannel,
    STABLE_TAB_ID,
    activeSubject,
    workFillsRef,
    breakBallsRef,
    mode,
    timeLeft,
    totalTime
}) {
    return (
        <div className="w-full px-10 py-8 rounded-3xl bg-[#b08e6b] border-2 border-[#94785a] shadow-xl">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-bold text-[#2d1a12]/70 uppercase tracking-[0.2em]">Progresso dos Ciclos</h3>
                    <div className="flex items-center gap-2 text-[#2d1a12]">
                        <button onClick={() => {
                            const newTarget = Math.max(completedCycles < 1 ? 1 : completedCycles, targetCycles - 1);
                            setTargetCycles(newTarget);
                            try { syncChannel?.postMessage({ type: 'TARGET_CYCLES_CHANGE', targetCycles: newTarget, tabId: STABLE_TAB_ID }); } catch { /* ignore */ }
                        }} disabled={!activeSubject || targetCycles <= 1} className="w-5 h-5 rounded bg-[#2d1a12]/10 text-xs font-bold hover:bg-[#2d1a12]/20 disabled:opacity-40">-</button>
                        <div className="flex items-baseline gap-0.5 text-sm font-black tabular-nums">
                            <span>{completedCycles}</span>
                            <span className="text-[#2d1a12]/50">/ {targetCycles}</span>
                        </div>
                        <button onClick={() => {
                            const newTarget = Math.min(20, targetCycles + 1);
                            setTargetCycles(newTarget);
                            try { syncChannel?.postMessage({ type: 'TARGET_CYCLES_CHANGE', targetCycles: newTarget, tabId: STABLE_TAB_ID }); } catch { /* ignore */ }
                        }} disabled={!activeSubject || targetCycles >= 20} className="w-5 h-5 rounded bg-[#2d1a12]/10 text-xs font-bold hover:bg-[#2d1a12]/20 disabled:opacity-40">+</button>
                    </div>
                </div>

                <div className="flex items-center gap-2 h-5">
                    {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                        <React.Fragment key={i}>
                            <div className="flex-1 h-1.5 bg-[#2d1a12]/20 rounded-full overflow-hidden">
                                <div
                                    ref={el => workFillsRef.current[i] = el}
                                    className="h-full bg-[#3b82f6] transition-all"
                                    style={{
                                        width: (i < sessions - 1 || (i === sessions - 1 && (mode === 'break' || mode === 'long_break'))) ? '100%' :
                                            (i === sessions - 1 && mode === 'work') ? `${Math.max(0, (1 - Math.max(0, timeLeft) / (totalTime || 1)) * 100)}%` : '0%'
                                    }}
                                />
                            </div>
                            {i < (targetCycles || 1) - 1 && (
                                <div className="relative w-4 h-4 rounded-full bg-[#2d1a12]/20 border border-[#2d1a12]/40 overflow-hidden shrink-0">
                                    <div
                                        ref={el => breakBallsRef.current[i] = el}
                                        className="absolute bottom-0 w-full bg-emerald-400 transition-all"
                                        style={{
                                            height: (i < sessions - 1) ? '100%' :
                                                (sessions === i + 1 && (mode === 'break' || mode === 'long_break')) ? `${Math.max(0, (1 - Math.max(0, timeLeft) / (totalTime || 1)) * 100)}%` : '0%'
                                        }}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

---

## 7. [src/store/slices/createPomodoroSlice.js](file:///d:\Downloads\ultra-patched\src\store\slices\createPomodoroSlice.js)

**Descrição**: Gerencia estado global atômico, transições de fase (completePomodoroPhase), retrocessos (rewindPomodoroPhase), modos neurais e fila de execução.

```javascript
import { cleanTaskTitle } from '../../utils/taskTitleHelper.js';

// BUG-9 FIX: Função reutilizável para extrair categoria do texto da tarefa
const extractCategoryFromTask = (task) => {
    if (task.catName) return task.catName;
    if (task.category) return task.category;
    const t = task.text || task.title || '';
    const idx = t.indexOf(':');
    if (idx > -1) {
        const cat = t.substring(0, idx).trim();
        return cat || 'Geral';
    }
    return 'Geral';
};

// FIX: Usar sanitizador unificado cleanTaskTitle
const formatTaskName = (task) => {
    const rawName = task.text || task.title || '';
    const cat = extractCategoryFromTask(task);
    return cleanTaskTitle(rawName, cat);
};

export const createPomodoroSlice = (set, get) => ({
    setPomodoroActiveSubject: (subject) => {
        set((state) => {
            if (!subject) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
                state.appState.pomodoro.activeSubject = null;
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                return;
            }

            const current = state.appState.pomodoro.activeSubject;
            const isNewSession = !current || !subject.sessionInstanceId || (current.sessionInstanceId !== subject.sessionInstanceId);
            
            if (isNewSession) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
            }

            // B-07 FIX: Limpar modo neural se a nova tarefa for manual
            if (subject.source !== 'neural_core') {
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];
            }

            state.appState.pomodoro.activeSubject = subject;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    startPomodoroSession: (subject) => {
        get().setPomodoroActiveSubject({
            ...subject,
            sessionInstanceId: Date.now().toString()
        });
    },

    setPomodoroSessions: (count) => set((state) => {
        state.appState.pomodoro.sessions = count;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroTargetCycles: (target) => set((state) => {
        const normalizedTarget = Math.max(1, Number(target) || 1);
        const p = state.appState.pomodoro;

        p.targetCycles = normalizedTarget;
        p.completedCycles = Math.min(normalizedTarget, Math.max(0, p.completedCycles || 0));
        if (p.mode === 'work' && p.completedCycles >= normalizedTarget) {
            p.completedCycles = Math.max(0, normalizedTarget - 1);
        }
        p.sessions = Math.min(normalizedTarget, Math.max(1, p.sessions || 1));

        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroCompletedCycles: (completed) => set((state) => {
        const p = state.appState.pomodoro;
        const targetCycles = Math.max(1, Number(p.targetCycles) || 1);
        let newCompleted = Math.min(targetCycles, Math.max(0, Number(completed) || 0));
        if (p.mode === 'work' && newCompleted >= targetCycles) {
            newCompleted = Math.max(0, targetCycles - 1);
        }
        p.completedCycles = newCompleted;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroMode: (mode) => set((state) => {
        state.appState.pomodoro.mode = mode;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    updatePomodoroSettings: (settings) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        
        // BUG 4 FIX: Comparação profunda via JSON para evitar loops infinitos em objetos complexos
        const isIdentical = JSON.stringify(activeData.settings || {}) === JSON.stringify({ ...(activeData.settings || {}), ...settings });
        if (isIdentical) return;

        activeData.settings = { ...(activeData.settings || {}), ...settings };
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setPomodoroAccumulatedMinutes: (minutes) => set((state) => {
        state.appState.pomodoro.accumulatedMinutes = minutes;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    // TRANSIÇÃO ATÓMICA - Muda fase, acumula minutos, e avança ciclos numa única operação
    completePomodoroPhase: (isManual = false, manualMinutes = 0) => {
        let savedMinutes = 0; // ✅ FIX BUG-07: variável para extrair minutos

        set((state) => {
            const p = state.appState.pomodoro;
            if (!p) return; // Shield: prevent crash if pomodoro state is missing

            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || { pomodoroWork: 25, pomodoroBreak: 5 };
            
            // Garantia de tipos e valores padrão
            const workDuration = settings.pomodoroWork || 25;
            const targetCycles = p.targetCycles || 1;

            if (p.mode === 'work') {
                if (!isManual) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + workDuration;
                } else if (manualMinutes > 0) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + manualMinutes;
                }
                
                savedMinutes = p.accumulatedMinutes; // ✅ FIX BUG-07: Captura para retorno

                // Cada bloco de foco concluído conta 1 ciclo.
                const currentCycles = Math.min(targetCycles, (p.completedCycles || 0) + 1);
                p.completedCycles = currentCycles;

                // Regra UX: se o plano tem apenas 1 ciclo, encerramos imediatamente.
                // BUG-2 FIX: Não zeramos accumulatedMinutes aqui — o caller (transitionSession)
                // precisa ler o valor antes do reset. O reset acontece no fluxo natural
                // (setPomodoroActiveSubject(null) ou advanceNeuralQueue).
                if (targetCycles === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                    // BUG FIX: Evitar leak de accumulatedMinutes e completedCycles se o 
                    // utilizador repetir o pomodoro de 1 ciclo sem mudar de tarefa.
                    p.completedCycles = 0;
                    // accumulatedMinutes NÃO é zerado aqui — o caller lê antes
                } else {
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = (currentCycles % longBreakAfter === 0);
                    p.mode = isLongBreak ? 'long_break' : 'break';
                    
                    // BUG FIX: Se completou todos os ciclos, o tempo já foi salvo pelo timer.
                    // Zeramos para evitar duplicação em caso de retrocesso (rewind).
                    if (currentCycles >= targetCycles) {
                        p.accumulatedMinutes = 0;
                    }
                }
            } else {
                // Fim da Pausa -> Próxima Sessão de Trabalho
                // BUG FIX: Se a pausa era de uma transição de fila neural (completedCycles zerado),
                // a próxima sessão de trabalho DEVE ser a sessão 1 (e não a 2).
                if (p.sessions >= targetCycles || p.completedCycles === 0) {
                    p.sessions = 1;
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                } else {
                    p.sessions = Math.max(1, (p.sessions || 1) + 1);
                }
                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
        
        return savedMinutes; // ✅ FIX BUG-07: Retornar para salvar ANTES do reset de sessão
    },

    // RETROCESSO ATÓMICO - Volta para a fase anterior com limites de segurança
    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState.pomodoro;
            if (!p) return;
            
            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || {};

            const workDuration = settings.pomodoroWork || 25;

            if (p.mode === 'break' || p.mode === 'long_break') {
                // Se está em pausa, volta para o trabalho da mesma sessão
                p.mode = 'work';
                // BUG FIX: Subtrair o ciclo que foi indevidamente contabilizado como finalizado
                p.completedCycles = Math.max(0, (p.completedCycles || 0) - 1);
                p.accumulatedMinutes = Math.max(0, (p.accumulatedMinutes || 0) - workDuration);
            } else if (p.sessions > 1) {
                // BUG-5 FIX: Usar completedCycles (ciclos realmente finalizados) para
                // determinar se a pausa anterior era longa, não sessions pós-decremento.
                const longBreakAfter = settings.longBreakAfter || 4;
                const previousCycleIndex = p.completedCycles; // ciclos terminados antes deste work
                p.sessions = Math.max(1, p.sessions - 1);
                p.mode = (previousCycleIndex > 0 && previousCycleIndex % longBreakAfter === 0)
                    ? 'long_break' : 'break';
            } else if (p.completedCycles > 0) {
                // Volta para a pausa do ciclo anterior, ou ao inicio se for 1 ciclo.
                p.completedCycles = Math.max(0, p.completedCycles - 1);
                p.accumulatedMinutes = Math.max(0, (p.accumulatedMinutes || 0) - workDuration);
                
                if ((p.targetCycles || 1) === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                } else {
                    p.sessions = p.targetCycles || 1;
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = ((p.completedCycles + 1) % longBreakAfter === 0);
                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                // APENAS reseta o modo para work se já estiver na sessao 1
                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    // SINCRONIZAÇÃO GLOBAL - Atualiza múltiplos campos vindos de outra aba
    syncPomodoroState: (payload) => {
        set((state) => {
            const p = state.appState.pomodoro;
            if (!p) return;

            if (payload.mode !== undefined) p.mode = payload.mode;
            if (payload.sessions !== undefined) p.sessions = Math.max(1, Number(payload.sessions) || 1);
            if (payload.targetCycles !== undefined) p.targetCycles = Math.max(1, Number(payload.targetCycles) || 1);
            if (payload.completedCycles !== undefined) {
                p.completedCycles = Math.min(p.targetCycles || 1, Math.max(0, Number(payload.completedCycles) || 0));
                if (p.mode === 'work' && p.completedCycles >= (p.targetCycles || 1)) {
                    p.completedCycles = Math.max(0, (p.targetCycles || 1) - 1);
                }
            }
            if (payload.accumulatedMinutes !== undefined) {
                p.accumulatedMinutes = Math.max(0, Number(payload.accumulatedMinutes) || 0);
            }
            if (payload.neuralMode !== undefined) p.neuralMode = payload.neuralMode;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    // --- NEURAL CORE SEQUENCING ---
    startNeuralSession: (tasks, startIndex = 0) => {
        if (!tasks || tasks.length === 0) return;
        
        const task = tasks[startIndex];
        const subject = {
            taskId: task.id || task.text,
            task: formatTaskName(task),
            category: extractCategoryFromTask(task),
            categoryId: task.categoryId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = subject;
            state.appState.pomodoro.neuralQueue = tasks;
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.targetCycles = 1;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.pomodoro.accumulatedMinutes = 0;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    advanceNeuralQueue: () => {
        const { neuralQueue, activeSubject } = get().appState.pomodoro;
        if (!neuralQueue || neuralQueue.length === 0) return false;

        if (!activeSubject) return false; // Guard: evita desativar modo neural se a tarefa estiver em "limbo"
        const currentIndex = neuralQueue.findIndex(t => (t.id || t.text) === activeSubject?.taskId);
        if (currentIndex === -1 || currentIndex >= neuralQueue.length - 1) {
            // Fim da fila
            set((state) => {
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];
            });
            return false;
        }

        const nextTask = neuralQueue[currentIndex + 1];
        const nextSubject = {
            taskId: nextTask.id || nextTask.text,
            task: formatTaskName(nextTask),
            category: extractCategoryFromTask(nextTask),
            categoryId: nextTask.categoryId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = nextSubject;
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.targetCycles = 1;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            // B-02 FIX: Zerar minutos acumulados para não inflar a próxima tarefa
            state.appState.pomodoro.accumulatedMinutes = 0;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });

        return true;
    }
});
```

---

## 8. [src/hooks/usePomodoroSync.js](file:///d:\Downloads\ultra-patched\src\hooks\usePomodoroSync.js)

**Descrição**: Implementação do protocolo de sincronização via BroadcastChannel e persistência no localStorage.

```javascript
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export function usePomodoroSync({
    syncChannel,
    STABLE_TAB_ID,
    setIsRunning,
    stateRefs,
    setTimeLeft,
    showToast,
    setSpeed,
    speedRef,
    activeSubjectRef,
    clockRef,
    setIsMuted,
    isMutedRef
}) {
    const syncPomodoroState = useAppStore(state => state.syncPomodoroState);

    // BUG-6 FIX: Removido syncChannel.close() daqui. A responsabilidade de fechar
    // o canal pertence a quem o criou (PomodoroTimer), evitando double-close
    // em cenários de remontagem.

    useEffect(() => {
        if (!syncChannel) return;

        const handleMessage = (event) => {
            const { type, tabId, timeLeft: incomingTime, speed: incomingSpeed, targetCycles: incomingTarget } = event.data || {};

            // Ignorar mensagens da própria aba
            if (tabId === STABLE_TAB_ID) return;

            switch (type) {
                case 'START_SESSION':
                    setIsRunning(true);
                    stateRefs.current.isRunning = true;
                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        // A ref é a fonte de verdade para o RAF loop
                        stateRefs.current.timeLeft = incomingTime;
                        // O React state é apenas para renderização visual
                        setTimeLeft(incomingTime);
                    }
                    showToast('Protocolo ativo em outra aba 🖥️', 'info');
                    break;

                case 'PAUSE_SESSION':
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;
                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        setTimeLeft(incomingTime);
                        stateRefs.current.timeLeft = incomingTime;
                    }
                    break;

                case 'SPEED_CHANGE':
                    if ([1, 10, 100].includes(Number(incomingSpeed))) {
                        setSpeed(Number(incomingSpeed));
                        speedRef.current = Number(incomingSpeed);
                    }
                    break;

                case 'TARGET_CYCLES_CHANGE':
                    if (Number.isFinite(incomingTarget)) {
                        // Pega o estado real atômico no momento em que recebe a msg
                        const currentCompleted = useAppStore.getState().appState?.pomodoro?.completedCycles || 0;
                        syncPomodoroState({ targetCycles: Math.max(Math.max(1, currentCompleted), Math.round(incomingTarget)) });
                    }
                    break;

                case 'TIMER_RESET':
                case 'PHASE_SKIP':
                case 'PHASE_COMPLETE':
                case 'PHASE_REWIND':
                    // Reset/Troca de fase forçada por outra aba
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    // Sincronização Atómica: Carregamos o estado mais recente do Store/LocalStorage
                    // O Store já deve ter sido atualizado pela outra aba (se estiver no mesmo domínio/storage)
                    // mas forçamos a atualização local para garantir consistência visual.
                    try {
                        const saved = JSON.parse(localStorage.getItem('pomodoroState')) || {};
                        const targetMode = event.data.toMode !== undefined ? event.data.toMode : saved.mode;
                        const targetTime = event.data.timeLeft !== undefined ? event.data.timeLeft : saved.timeLeft;
                        
                        if (targetMode !== undefined || (saved && saved.activeTaskId === activeSubjectRef.current?.taskId)) {
                            // Atualizamos o Store local com os dados vindos da outra aba
                            syncPomodoroState({
                                mode: targetMode,
                                sessions: event.data.sessions !== undefined ? event.data.sessions : saved.sessions,
                                completedCycles: event.data.completedCycles !== undefined ? event.data.completedCycles : saved.completedCycles,
                                accumulatedMinutes: event.data.accumulatedMinutes !== undefined ? event.data.accumulatedMinutes : saved.accumulatedMinutes,
                                targetCycles: event.data.targetCycles !== undefined ? event.data.targetCycles : saved.targetCycles
                            });

                            // Atualizamos as Refs e o Estado Local do Timer
                            if (Number.isFinite(targetTime) && targetTime >= 0) {
                                setTimeLeft(targetTime);
                                stateRefs.current.timeLeft = targetTime;
                            }
                            if (targetMode !== undefined) {
                                stateRefs.current.mode = targetMode;
                            }

                            // Feedback visual instantâneo no relógio
                            if (clockRef.current && Number.isFinite(targetTime)) {
                                clockRef.current.textContent = formatTime(targetTime);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to sync state from localStorage:', error);
                    }
                    break;

                case 'TOGGLE_MUTE':
                    setIsMuted(event.data.isMuted);
                    isMutedRef.current = event.data.isMuted;
                    break;
            }
        };

        syncChannel.addEventListener('message', handleMessage);

        return () => {
            syncChannel.removeEventListener('message', handleMessage);
        };
    }, [syncChannel, showToast, syncPomodoroState, STABLE_TAB_ID, setIsRunning, stateRefs, setTimeLeft, setSpeed, speedRef, activeSubjectRef, clockRef, setIsMuted, isMutedRef]);
}
```

---

## 9. [src/utils/taskTitleHelper.js](file:///d:\Downloads\ultra-patched\src\utils\taskTitleHelper.js)

**Descrição**: Sanitiza e padroniza a exibição de títulos de tarefas e categorias no menu Pomodoro e no TopBar.

```javascript
/**
 * ============================================================================
 * UNIFIED TASK TITLE HELPER
 * ============================================================================
 * Sanitizes and formats task titles across the Pomodoro menu, AI Coach,
 * and TopBar to guarantee consistent display and matching.
 */

export function cleanTaskTitle(rawText, categoryName = '') {
    if (!rawText) return '';
    let text = String(rawText).trim();

    // Remove system tags
    text = text
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/gi, '')
        .replace(/\[ALERTA MESTRE\]\s*/gi, '')
        .replace(/^\[(.*?)\]\s*/gi, '$1 ')
        .trim();

    const sepIdx = text.indexOf(':');
    if (sepIdx !== -1) {
        let action = text.slice(sepIdx + 1).trim();
        if (categoryName && action.toLowerCase() === String(categoryName).trim().toLowerCase()) {
            return 'Revisão Geral';
        }
        if (action) {
            if (/CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(action)) {
                return text.slice(0, sepIdx).trim() || 'Revisão Geral';
            }
            return action;
        }
    }

    if (categoryName && text.toLowerCase() === String(categoryName).trim().toLowerCase()) {
        return 'Revisão Geral';
    }

    return text;
}

export function parseTaskDisplay(rawText, categoryName = '') {
    if (!rawText) return { displayTopic: '', secondaryText: '' };
    const fullText = String(rawText).trim();
    const parts = fullText.split(':');
    let actionPart = parts.length > 1 ? parts.slice(1).join(':').trim() : fullText;

    actionPart = actionPart
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
        .replace(/\[ALERTA MESTRE\]\s*/i, '')
        .replace(/^\[(.*?)\]/i, '$1')
        .trim();

    let topicPart = (parts[0] || '')
        .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
        .replace(/\[ALERTA MESTRE\]\s*/i, '')
        .replace(/^\[(.*?)\]/i, '$1')
        .trim();
    if (categoryName && actionPart.toLowerCase() === String(categoryName).trim().toLowerCase()) {
        actionPart = 'Revisão Geral';
    }

    const displayTopic = actionPart || topicPart || '';
    let secondaryText = (topicPart && actionPart !== topicPart && actionPart !== 'Revisão Geral') ? topicPart : '';

    if (/CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(secondaryText)) {
        secondaryText = '';
    }

    return { displayTopic, secondaryText };
}
```

---

## 10. [tests/pomodoro-menu-bugs.test.js](file:///d:\Downloads\ultra-patched\tests\pomodoro-menu-bugs.test.js)

**Descrição**: Suíte de testes de regressão dos 9 bugs do menu Pomodoro (cálculo de ciclos, avanço neural, blindagem anti-negativos, sanitização e XP).

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore.js';
import { countPomodorosToday } from '../src/utils/analytics.js';
import { cleanTaskTitle, parseTaskDisplay } from '../src/utils/taskTitleHelper.js';

describe('Pomodoro Menu - Comprehensive 9 Bugs Regression Suite', () => {
    beforeEach(() => {
        useAppStore.setState({
            appState: {
                activeId: 'default',
                contests: {
                    default: {
                        id: 'default',
                        name: 'Test Contest',
                        categories: [
                            {
                                id: 'cat-1',
                                name: 'Matemática',
                                tasks: [
                                    { id: 't1', text: 'Equações', completed: false, priority: 'high' },
                                    { text: 'Sem ID Task', completed: false, priority: 'medium' }
                                ]
                            }
                        ],
                        coachPlan: [],
                        coachPlanner: {},
                        studyLogs: [],
                        studySessions: []
                    }
                },
                pomodoro: {
                    activeSubject: null,
                    sessions: 1,
                    targetCycles: 1,
                    completedCycles: 0,
                    accumulatedMinutes: 0,
                    mode: 'break',
                    neuralQueue: [],
                    neuralMode: false
                }
            }
        });
    });

    it('Bug 1 & 7: countPomodorosToday uses extraCompletedCycles only when accumulatedMinutes > 0', () => {
        const todayStr = new Date().toISOString();
        const studyLogs = [
            { date: todayStr, minutes: 25 },
            { date: todayStr, minutes: 25 }
        ];

        // Se accumulatedMinutes = 0, unloggedCycles deve ser 0 e contar apenas os logs = 2
        const countWhenZeroAccum = countPomodorosToday(studyLogs, 25, 0);
        expect(countWhenZeroAccum).toBe(2);

        // Se accumulatedMinutes > 0, soma unloggedCycles (por ex 1 ciclo) = 3
        const countWhenPendingAccum = countPomodorosToday(studyLogs, 25, 1);
        expect(countWhenPendingAccum).toBe(3);
    });

    it('Bug 2 & 8: startNeuralSession and advanceNeuralQueue set targetCycles to 1 and reset accumulatedMinutes', () => {
        const store = useAppStore.getState();
        store.startNeuralSession([
            { id: 't1', text: 'Task 1', categoryId: 'cat-1' },
            { id: 't2', text: 'Task 2', categoryId: 'cat-1' }
        ], 0);

        let pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.targetCycles).toBe(1);
        expect(pomodoroState.neuralMode).toBe(true);

        // Simulate cycle ending in break mode with accumulated minutes
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'break';
            state.appState.pomodoro.completedCycles = 1;
            state.appState.pomodoro.accumulatedMinutes = 25;
            return state;
        });

        const advanced = store.advanceNeuralQueue();
        expect(advanced).toBe(true);
        pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.mode).toBe('work');
        expect(pomodoroState.targetCycles).toBe(1);
        expect(pomodoroState.completedCycles).toBe(0);
        expect(pomodoroState.accumulatedMinutes).toBe(0);
        expect(pomodoroState.activeSubject.taskId).toBe('t2');
    });

    it('Bug 3: setPomodoroTargetCycles clamps completedCycles when mode is "work"', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.completedCycles = 4;
            return state;
        });

        store.setPomodoroTargetCycles(3);
        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.targetCycles).toBe(3);
        expect(pomodoroState.completedCycles).toBe(2); // max is targetCycles - 1 in work mode
    });

    it('Bug 4: setPomodoroActiveSubject(null) clears neuralMode and neuralQueue', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.neuralQueue = [{ id: 't1', text: 'Task 1' }];
            return state;
        });

        store.setPomodoroActiveSubject(null);
        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.activeSubject).toBeNull();
        expect(pomodoroState.neuralMode).toBe(false);
        expect(pomodoroState.neuralQueue).toEqual([]);
    });

    it('Bug 5: rewindPomodoroPhase never allows negative accumulatedMinutes', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'break';
            state.appState.pomodoro.completedCycles = 1;
            state.appState.pomodoro.accumulatedMinutes = 10; // less than 25
            return state;
        });

        store.rewindPomodoroPhase();
        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.mode).toBe('work');
        expect(pomodoroState.completedCycles).toBe(0);
        expect(pomodoroState.accumulatedMinutes).toBe(0); // Protected against negative
    });

    it('Bug 6: cleanTaskTitle and parseTaskDisplay strip brackets and simplify same category name', () => {
        const cleaned = cleanTaskTitle('[PROTOCOLO PRIORITÁRIO] Matemática: Matemática', 'Matemática');
        expect(cleaned).toBe('Revisão Geral');

        const parsed = parseTaskDisplay('[ALERTA MESTRE] Física: Leitura de Leis', 'Física');
        expect(parsed.displayTopic).toBe('Leitura de Leis');
        expect(parsed.secondaryText).toBe('Física');
    });

    it('Bug 7 (Store): setPomodoroActiveSubject with manual task clears neuralMode', () => {
        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.neuralQueue = [{ id: 't1', text: 'Task 1' }];
            return state;
        });

        store.setPomodoroActiveSubject({
            taskId: 'manual-1',
            task: 'Manual Task',
            source: 'manual'
        });

        const pomodoroState = useAppStore.getState().appState.pomodoro;
        expect(pomodoroState.activeSubject.taskId).toBe('manual-1');
        expect(pomodoroState.neuralMode).toBe(false);
        expect(pomodoroState.neuralQueue).toEqual([]);
    });

    it('Bug 8 & 9: toggleNeuralTask searches categories and awards XP properly', () => {
        const store = useAppStore.getState();
        let awarded = 0;
        store.awardExperience = (xp) => { awarded += xp; };

        store.toggleNeuralTask('t1');

        const activeData = useAppStore.getState().appState.contests.default;
        const task = activeData.categories[0].tasks[0];
        expect(task.completed).toBe(true);
        expect(awarded).toBeGreaterThan(0);
    });

    it('Extra Edge Cases: cleanTaskTitle global tags, setPomodoroCompletedCycles clamp, and syncPomodoroState validation', () => {
        const cleaned = cleanTaskTitle('[PROTOCOLO PRIORITÁRIO] [ALERTA MESTRE] Matemática: Equações');
        expect(cleaned).toBe('Equações');

        const store = useAppStore.getState();
        useAppStore.setState(state => {
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.targetCycles = 3;
            state.appState.pomodoro.completedCycles = 0;
            return state;
        });

        store.setPomodoroCompletedCycles(10);
        let p = useAppStore.getState().appState.pomodoro;
        expect(p.completedCycles).toBe(2); // clamped to max(0, targetCycles - 1) in work mode

        store.syncPomodoroState({ completedCycles: 5, accumulatedMinutes: -20 });
        p = useAppStore.getState().appState.pomodoro;
        expect(p.completedCycles).toBe(2);
        expect(p.accumulatedMinutes).toBe(0);
    });
});
```

