import os
import re

with open('src/pages/Pomodoro.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir DataTriviaPanel
data_trivia_new = '''// =====================================================
// LOTE 2 APLICADO — Telemetria em Grid (100% PT-BR)
// =====================================================
function DataTriviaPanel({ studyLogs, simulados, categories }) {
    const stats = useMemo(() => {
        const startOfToday = getLocalMidnight().getTime();
        const startOfWeek = startOfToday - (86400000 * 7);
        const startOfMonth = startOfToday - (86400000 * 30);

        let weekMins = 0;
        let monthMins = 0;
        let recentSimulados = 0;
        let totalTasks = 0;
        let completedTasks = 0;
        let weekTasks = 0;
        const daysStudied = new Set();

        (studyLogs || []).forEach(log => {
            if (!log || !log.date) return;
            const t = new Date(log.date).getTime();
            if (Number.isNaN(t)) return;
            const mins = Number(log.minutes) || 0;
            if (t >= startOfWeek) weekMins += mins;
            if (t >= startOfMonth) monthMins += mins;
            daysStudied.add(getDateKey(log.date) || new Date(t).toISOString().split('T')[0]);
        });

        (simulados || []).forEach(s => {
            if (!s) return;
            const sTime = s.date ? new Date(s.date).getTime() : NaN;
            if (!Number.isNaN(sTime) && sTime >= startOfMonth) recentSimulados++;
        });

        (categories || []).forEach(c => {
            if (!c || !c.tasks) return;
            const safeTasks = Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks);
            safeTasks.forEach(t => {
                if (!t) return;
                totalTasks++;
                if (t.completed) {
                    completedTasks++;
                    if (t.completedAt && new Date(t.completedAt).getTime() >= startOfWeek) weekTasks++;
                }
            });
        });

        const sortedDays = Array.from(daysStudied).sort();
        let maxStreak = 0;
        let currentStreak = 0;
        let lastDate = null;
        sortedDays.forEach(dayStr => {
            const current = parseNoonLocal(dayStr).getTime();
            currentStreak = lastDate && Math.round((current - lastDate) / 86400000) === 1 ? currentStreak + 1 : 1;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            lastDate = current;
        });

        return {
            weekMins,
            monthMins,
            recentSimulados,
            weekTasks,
            maxStreak,
            efficacy: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            hasData: weekMins > 0 || monthMins > 0 || recentSimulados > 0 || totalTasks > 0
        };
    }, [studyLogs, simulados, categories]);

    const fmt = (mins) => {
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    if (!stats || !stats.hasData) return null;

    const tiles = [
        { icon: <Calendar size={16} className="text-indigo-400" />, label: 'Semana', value: fmt(stats.weekMins), show: stats.weekMins > 0 },
        { icon: <BarChart3 size={16} className="text-cyan-400" />, label: 'Mês', value: fmt(stats.monthMins), show: stats.monthMins > 0 },
        { icon: <Target size={16} className="text-rose-400" />, label: 'Simulados (30 dias)', value: String(stats.recentSimulados), show: stats.recentSimulados > 0 },
        { icon: <Trophy size={16} className="text-yellow-500" />, label: 'Eficácia', value: `${stats.efficacy}%`, show: stats.efficacy > 0 },
        { icon: <Flame size={16} className="text-orange-500" />, label: 'Sequência Máxima', value: `${stats.maxStreak} dias`, show: stats.maxStreak >= 2 },
        { icon: <CheckCircle2 size={16} className="text-emerald-400" />, label: 'Missões na Semana', value: String(stats.weekTasks), show: stats.weekTasks > 0 }
    ].filter(t => t.show).slice(0, 6);

    if (tiles.length === 0) return null;

    return (
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden">
            <div className="flex justify-between items-center mb-3 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <Medal size={12} />
                    Conquistas e Telemetria
                </p>
                <span className="text-[9px] font-black text-indigo-500/60 uppercase">Central de Dados</span>
            </div>
            <div className="grid grid-cols-2 gap-2 relative z-10">
                {tiles.map((tile, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 rounded-xl">
                        <div className="shrink-0">{tile.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold truncate">{tile.label}</p>
                            <p className="text-sm font-black text-cyan-300 truncate">{tile.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
'''

# Substituir AICoachPanel
ai_coach_new = '''// =====================================================
// LOTE 3 APLICADO — Selo "Núcleo Neural Ativo" (PT-BR)
// =====================================================
function AICoachPanel({ activeSubject, stats }) {
    const defaultInsight = {
        title: 'Pronto para Foco',
        text: 'Sua mente está pronta. Selecione um objetivo tático abaixo para iniciar.',
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
            border: 'border-indigo-500/20', bg: 'bg-slate-800/40', glow: 'shadow-indigo-500/5',
            text: 'text-indigo-300', accent: 'bg-indigo-400', gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent'
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
            className={`relative rounded-xl border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-md p-4 mb-3 overflow-hidden group shadow-lg`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40 pointer-events-none`} />
            <Motion.div
                animate={{ left: ['-100%', '200%'] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className={`absolute top-0 bottom-0 w-[50px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50 pointer-events-none z-20 skew-x-[-20deg]`}
            />
            <div className="flex items-center gap-6 relative z-10">
                <div className="relative shrink-0">
                    <Motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className={`absolute inset-0 rounded-full blur-xl ${theme.accent}`}
                    />
                    <div className={`relative w-10 h-10 rounded-xl border ${theme.border} bg-slate-900/60 flex items-center justify-center ${theme.text} shadow-inner`}>
                        {icons[insight?.iconType] || <BrainCircuit size={24} />}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
                            <Sparkles size={10} className={`${theme.text} shrink-0`} />
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">Mentor Ativo</span>
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-white mb-0.5 tracking-tight flex items-center gap-2">
                        <span className="truncate">{insight?.title || 'Pronto para Foco'}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse shrink-0`} />
                    </h3>
                    <div className="text-xs text-slate-300/90 leading-relaxed font-medium">
                        {formatText(insight?.text)}
                    </div>
                </div>
            </div>
        </Motion.div>
    );
}
'''

# Substituir FocusPanel
focus_panel_new = '''// =====================================================
// LOTE 4 APLICADO — Cartão recomendado e ações (PT-BR)
// =====================================================
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
            console.warn("[FocusPanel] Falha ao salvar posição:", err);
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

    // Esconde IDs técnicos (ex.: E3FR4G356H56) e garante rótulo em português
    const safeCatName = (name) => {
        const n = String(name || '').trim();
        if (!n) return 'Categoria';
        if (/^[A-Za-z0-9_-]{8,}$/.test(n)) return 'Categoria';
        return n;
    };

    return (
        <Motion.div
            drag={!isPanelLocked}
            dragMomentum={false}
            dragElastic={0.1}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, zIndex: 100 }}
            className={`flex flex-col w-full 2xl:w-[520px] shrink-0 relative group p-2 bg-[#08090f]/70 border border-white/5 rounded-3xl backdrop-blur-xl shadow-2xl ${!isPanelLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <div className="absolute -top-14 left-0 right-0 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-1 group-hover:-translate-y-0">
                {!isPanelLocked && (
                    <button
                        type="button"
                        onClick={resetPosition}
                        className="px-3 py-1.5 rounded-xl bg-slate-900/70 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                    >
                        <RotateCcw size={12} />
                        <span>Restaurar</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={toggleLock}
                    className={`p-2 rounded-xl transition-all border flex items-center justify-center ${isPanelLocked
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
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
                            <strong className="text-cyan-300">Assunto atual:</strong> {cleanTaskText(activeTaskStats.topic, activeTaskStats.categoryName).displayTopic || 'Missão em Aberto'}
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
                            <span className="flex items-center gap-1.5 text-xs" title="Domínio da matéria"><CheckCircle2 size={12} className="text-emerald-500" /> <strong className="text-slate-200">{activeTaskStats.hitRate}%</strong> Domínio</span>
                            <span className="flex items-center gap-1.5 text-xs" title="Lacuna na matéria"><AlertCircle size={12} className="text-amber-500" /> <strong className="text-slate-200">{activeTaskStats.missRate}%</strong> Lacuna</span>
                            {activeTaskStats.totalMinutes > 0 && (
                                <span className="flex items-center gap-1.5 text-xs" title="Tempo dedicado à matéria"><Clock size={12} className="text-cyan-500" /> <strong className="text-slate-200">{Math.round(activeTaskStats.totalMinutes)}m</strong> na Matéria</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {recommendedTask && !activeSubject && (
                <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-6 rounded-2xl bg-[#11131f] border border-indigo-500/20 shadow-lg relative group/card overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover/card:scale-110 group-hover/card:opacity-20 transition-all">
                        <Zap size={64} className="text-indigo-400" />
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                        <span className="inline-block px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold uppercase tracking-widest">
                            ⚡ Recomendado pela IA
                        </span>
                        {recommendedTask.priority === 'high' && (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-widest shrink-0">
                                Prioridade Alta
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-tight relative z-10">
                        {(() => {
                            const recInfo = cleanTaskText(recommendedTask.text || recommendedTask.title, recommendedTask.catName || recommendedTask.category);
                            return recInfo.displayTopic || 'Missão de Alto Impacto';
                        })()}
                    </h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed relative z-10">
                        Baseado na sua última performance, esta meta oferece a melhor janela de retenção agora.
                    </p>
                    <button
                        onClick={() => onStartTask(recommendedTask, null, 'neural_core')}
                        className="w-full relative overflow-hidden py-3 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] active:scale-[0.985] group/btn z-10"
                    >
                        <span className="absolute inset-0 w-full h-full -ml-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite] skew-x-[-20deg]" />
                        INICIAR AGORA
                        <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-white/5 border border-white/10 shrink-0 text-slate-400">
                                {recommendedTask.catIcon || '📚'}
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px]">
                                {safeCatName(recommendedTask.catName || recommendedTask.category)}
                            </span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400/50 tracking-widest uppercase shrink-0">Eficácia Máxima</span>
                    </div>
                </Motion.div>
            )}

            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 backdrop-blur-md flex-1 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-500/50" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Próximas Ações</p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5 px-2.5 py-0.5 rounded-md">
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
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                        {visibleTasks.filter(Boolean).map((task, idx) => {
                            const taskId = task.id || task.text || `fallback-task-${idx}`;
                            const categoryName = safeCatName(task.catName || task.category);
                            const isActive = activeSubject?.taskId === taskId;
                            const { displayTopic, secondaryText } = cleanTaskText(task.text || task.title, categoryName);
                            return (
                                <Motion.button
                                    key={`task-${taskId}-${idx}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => onStartTask(task, null, 'neural_core')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group text-left relative overflow-hidden ${isActive
                                        ? 'bg-amber-500/5 border-amber-500/20 shadow-sm'
                                        : 'bg-white/[0.015] border-transparent hover:bg-white/[0.03] hover:border-white/5'
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-transparent group-hover:bg-indigo-500/30'}`} />
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: `${task.catColor || '#ffffff'}15`, border: `1px solid ${task.catColor || '#ffffff'}30` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <p className={`text-xs font-semibold truncate tracking-tight ${isActive ? 'text-amber-400' : 'text-slate-300 group-hover:text-white transition-colors'}`}>
                                            {displayTopic || 'Missão em Aberto'}
                                        </p>
                                        {secondaryText && (
                                            <p className="text-[9px] text-slate-500 truncate mt-0.5 font-medium">{secondaryText}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[8px] text-slate-500/80 font-medium uppercase tracking-widest">{categoryName}</p>
                                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-amber-500/80' : 'text-slate-600'}`}>• {isActive ? 'Em foco agora' : `Ação #${idx + 1}`}</p>
                                        </div>
                                    </div>
                                    {isActive ? (
                                        <div className="flex flex-col items-center gap-0.5 opacity-80">
                                            <Flame size={14} className="text-amber-500" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                                            <ChevronRight size={12} className="text-slate-400" />
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
'''

# Use regex to find and replace the functions in the file
content = re.sub(r'function DataTriviaPanel\(\{ studyLogs, simulados, categories \}\) \{[\s\S]*?(?=// CORREÇÃO CRÍTICA|function AICoachPanel)', data_trivia_new + '\n\n', content)
content = re.sub(r'(// CORREÇÃO CRÍTICA.*?)?function AICoachPanel\(\{ activeSubject, stats \}\) \{[\s\S]*?(?=// Focus Panel|function FocusPanel)', ai_coach_new + '\n\n', content)
content = re.sub(r'(// Focus Panel.*?)?function FocusPanel\(\{ categories, activeSubject, onStartTask, stats, neuralMode, neuralQueue, studyLogs, simulados \}\) \{[\s\S]*?(?=function PomodoroTopBar)', focus_panel_new + '\n\n', content)

with open('src/pages/Pomodoro.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
