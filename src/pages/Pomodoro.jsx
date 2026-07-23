import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import { getLocalMidnight, getDateKey } from '../utils/dateHelper';
import { motion as Motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useActiveContest, usePomodoroState } from '../store/useSelectors';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, ChevronRight, BrainCircuit, Zap, AlertTriangle, Flame, Sparkles, Lock, Unlock, RotateCcw, Loader2, Target, AlertCircle, TrendingUp, Clock, Calendar, BarChart3, Medal, Trophy, Moon, Sun } from 'lucide-react';
import { getCoachInsight, getBestTask } from '../utils/coachLogic';
import { countPomodorosToday } from '../utils/analytics';

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
            if (Number.isNaN(t)) return; // Prevents "Invalid time value" from d.toISOString()

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
            const current = new Date(`${dayStr}T12:00:00`).getTime();
            if (lastDate) {
                const diffDays = Math.round((current - lastDate) / 86400000);
                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
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
            
            // Aceita score numérico (0-100) ou acertos brutos
            const score = s.score || s.acertos || 0;
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
            items.push({ icon: <BarChart3 size={14} className="text-cyan-400" />, text: `Mês: Absorção sustentada de ${Math.floor(monthMins / 60)}h brutas.` });
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
            items.push({ icon: <Trophy size={14} className="text-yellow-400" />, text: `Pico cognitivo em simulados atingiu a marca de ${bestSimulado} pontos.` });
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

    // Fallback absoluto caso a função de inteligência crashe
    const insight = getCoachInsight(activeSubject, stats) || defaultInsight;

    const icons = {
        'Brain': <BrainCircuit size={24} strokeWidth={1.5} />,
        'Zap': <Zap size={24} strokeWidth={1.5} />,
        'Alert': <AlertTriangle size={24} strokeWidth={1.5} />
    };

    const colorMap = {
        red: {
            border: 'border-red-500/30',
            bg: 'bg-red-500/5',
            glow: 'shadow-red-500/10',
            text: 'text-red-400',
            accent: 'bg-red-400',
            gradient: 'from-red-500/20 via-red-500/5 to-transparent'
        },
        emerald: {
            border: 'border-emerald-500/30',
            bg: 'bg-emerald-500/5',
            glow: 'shadow-emerald-500/10',
            text: 'text-emerald-400',
            accent: 'bg-emerald-400',
            gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent'
        },
        indigo: {
            border: 'border-indigo-500/30',
            bg: 'bg-indigo-500/5',
            glow: 'shadow-indigo-500/10',
            text: 'text-indigo-400',
            accent: 'bg-indigo-400',
            gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent'
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

    // LEAK-05 FIX: Use a ref to capture uiPosition for the resize listener
    // This prevents re-adding/removing the event listener on every drag pixel.
    const uiPosRef = useRef(uiPosition);
    useEffect(() => {
        uiPosRef.current = uiPosition;
    }, [uiPosition]);

    useEffect(() => {
        const checkPos = () => {
            const currentPos = uiPosRef.current;
            if (currentPos.x !== 0 || currentPos.y !== 0) {
                // Previne que o painel saia completamente da tela
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
        const newPos = {
            x: uiPosition.x + info.offset.x,
            y: uiPosition.y + info.offset.y
        };
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

        // Se estiver em modo neural, priorizamos mostrar o resto da fila neural
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

        // Caso contrário, buscamos tarefas de alta prioridade nas categorias
        (categories || []).filter(Boolean).forEach(cat => {
            (cat.tasks || []).filter(t => t && !t.completed && t.priority === 'high' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
                tasks.push({ ...t, id: t.id || t.text, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
            });
        });

        // Fallback para prioridade média
        if (tasks.length === 0) {
            (categories || []).filter(Boolean).forEach(cat => {
                (cat.tasks || []).filter(t => t && !t.completed && t.priority === 'medium' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
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
                (cat.tasks || []).filter(t => t && !t.completed).forEach(t => {
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
        const categoryTasks = (currentCategory?.tasks || []).filter(Boolean);
        const total = categoryTasks.length;
        const completed = categoryTasks.filter(t => t.completed).length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalMinutes = currentCategory?.totalMinutes || 0;

        const remaining = Math.max(total - completed, 0);
        const gainIfComplete = total > 0 ? Number((100 / total).toFixed(1)) : 0;
        const quality = completionPct >= 80 ? 'Maestria' : completionPct >= 40 ? 'Evolução' : 'Fase Inicial';
        const hitRate = completionPct;
        const missRate = Math.max(0, 100 - completionPct);
        const highPriorityCount = categoryTasks.filter(t => t.priority === 'high' && !t.completed).length;

        const whySelected = activeSubject.priority === 'high'
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

    const cleanTaskText = (rawText, catName) => {
        if (!rawText) return { displayTopic: '', secondaryText: '' };
        const fullText = rawText.trim();
        const parts = fullText.split(':');
        let actionPart = parts.length > 1 ? parts.slice(1).join(':').trim() : fullText;
        
        actionPart = actionPart.replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '');
        
        // Strip legacy AI tags completely (e.g., [REVISÃO], [OTIMIZAÇÃO DE BASE])
        actionPart = actionPart.replace(/^\[(.*?)\]/i, '$1').trim();
        let topicPart = parts[0] || '';

        if (catName && actionPart.toLowerCase() === catName.toLowerCase()) {
            actionPart = 'Revisão Geral';
        }

        const displayTopic = actionPart || topicPart || '';
        let secondaryText = (topicPart && actionPart !== topicPart && actionPart !== 'Revisão Geral') ? topicPart : '';
        
        if (/CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(secondaryText)) {
            secondaryText = '';
        }
        
        return { displayTopic, secondaryText };
    };

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
                            Impacto na matéria ao concluir: <strong className="text-emerald-400">+{activeTaskStats.gainIfComplete}%</strong>.
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

    // 🛠️ Utilitário Radical: Extrai APENAS o identificador curto (ex: a1) como o assunto principal
    const cleanText = (text) => {
        if (!text) return '';

        const codeMatch = text.match(/\[([a-zA-Z]+[0-9]+[a-zA-Z0-9]*)\]/);
        if (codeMatch && codeMatch[1]) {
            return codeMatch[1];
        }

        const firstColon = text.indexOf(':');
        let targetText = firstColon > -1 ? text.substring(firstColon + 1) : text;
        
        // Strip legacy AI tags completely (e.g., [REVISÃO], [OTIMIZAÇÃO DE BASE], [PROTOCOLO PRIORITÁRIO])
        targetText = targetText.replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '');
        targetText = targetText.replace(/^\[(.*?)\]/i, '$1').trim();

        let subtitle = targetText.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
        if (subtitle.startsWith('-')) subtitle = subtitle.substring(1).trim();
            
        // Filter out AI generated status texts from legacy tasks
        if (/CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(subtitle)) {
            subtitle = '';
        }

        let cleaned = subtitle
            .replace(/\s{2,}/g, ' ')
            .trim();

        return cleaned || text;
    };

    return (
        <div className="w-full max-w-none lg:max-w-[min(95vw,600px)] mb-0 sm:mb-6 rounded-3xl sm:rounded-3xl border-x-0 border-y-2 sm:border-2 border-[#94785a] bg-[#b08e6b] px-4 sm:px-8 py-6 sm:py-10 shadow-2xl relative overflow-hidden group mx-auto">
            {/* Efeito de brilho sutil no topo da madeira */}
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

    // Hidratação validada (Considerando a nova referência EMPTY_OBJECT)
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
    const neuralMode = pomodoroState.neuralMode;
    const neuralQueue = pomodoroState.neuralQueue || EMPTY_ARRAY;
    const entrySourceRef = useRef(location.state?.from || 'pomodoro');
    
    const topRef = useRef(null);

    // Auto-scroll para o topo (focando o relógio) quando uma matéria for selecionada
    useEffect(() => {
        if (activeSubject && topRef.current) {
            // Em dispositivos móveis ou telas menores, rolar para o topo
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

        // Se o fluxo foi aberto a partir do dashboard (incluindo botão vermelho),
        // dashboard prevalece como origem de retorno.
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
                pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, completedCycles),
                consecutiveMinutes: 0,
                settings: null
            };
        }

        const now = new Date();
        const startOfToday = getLocalMidnight().getTime();

        let consecutiveStudyMinutes = 0;
        // Melhoria: Filtramos logs inválidos e ordenamos de forma mais segura
        const recentLogs = [...(studyLogs || [])]
            .filter(log => log && log.date && new Date(log.date).getTime() >= startOfToday)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let lastTimeBoundary = now.getTime();

        for (const log of recentLogs) {
            const logDate = new Date(log.date).getTime();
            const minutes = Number(log.minutes) || 0;
            
            // Se o log for inválido ou futuro (erro de sistema), ignoramos
            if (!logDate || minutes <= 0) continue;

            const gapInMinutes = Math.max(0, (lastTimeBoundary - logDate) / (1000 * 60));

            // Definição de Streak: pausa de no máximo 90 minutos entre sessões
            if (gapInMinutes > 90) {
                break;
            }

            consecutiveStudyMinutes += minutes;
            // O início desta sessão vira o novo limite para o próximo gap
            lastTimeBoundary = logDate - (minutes * 60 * 1000);
        }

        return {
            pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, completedCycles),
            consecutiveMinutes: consecutiveStudyMinutes,
            settings: settings,
            user: user
        };
    }, [completedCycles, contest, studyLogs, settings, user]);


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

    // TOLERÂNCIA ALONGADA para a Válvula de Escape 
    useEffect(() => {
        let timeoutId;
        if (!isHydrated) {
            timeoutId = setTimeout(() => {
                showToast('Contexto pendente. Retornando ao Dashboard...', 'warning');
                navigate('/');
            }, 6000);
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isHydrated, navigate, showToast]);

    useEffect(() => {
        return () => {
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
        };
    }, []);

    const handleExit = useCallback((options = {}) => {
        const subjectSnapshot = options._subjectSnapshot || activeSubject;
        const currentSource = options.source || resolveSessionSource(subjectSnapshot?.source);

        if (subjectSnapshot) {
            setData(prev => ({
                ...prev,
                categories: prev.categories?.map(c => c.id === subjectSnapshot.categoryId ? {
                    ...c,
                    tasks: (Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})).map(t => t.id === subjectSnapshot.taskId ? { ...t, status: undefined } : t)
                } : c)
            }));
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

        if (!wasNatural && !(neuralMode || currentSubject?.source === 'neural_core')) {
            showToast('Sessão pulada. Salvando progresso e retornando...', 'info');
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = setTimeout(() => { handleExit({ _subjectSnapshot: currentSubject }); }, 400);
            return;
        }

        if (currentSubject) {
            showToast(`Série finalizada! ${totalMinutes} minutos salvos no histórico. 🚀💎`, 'success');

            // B-08 FIX: Só auto-completa a tarefa se a conclusão foi natural (não pulada)
            const activeData = store.appState.contests[store.appState.activeId];
            
            if (wasNatural) {
                if (neuralMode || currentSubject.source === 'neural_core') {
                    store.toggleNeuralTask(currentSubject.taskId);
                    showToast(`Status: "${currentSubject.task}" concluído! ✅`, 'success');
                } else {
                    const cat = (activeData?.categories || []).find(c => c && c.id === currentSubject.categoryId);
                    const task = (cat?.tasks || []).find(t => t && (t.id || t.text) === currentSubject.taskId);

                    if (task && !task.completed) {
                        store.toggleTask(currentSubject.categoryId, currentSubject.taskId);
                        showToast(`Status: "${task.title || task.text}" concluído! ✅`, 'success');
                    }
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
                        // Fluxo neural: apenas encerra a sessão, sem redirecionar para dashboard.
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
