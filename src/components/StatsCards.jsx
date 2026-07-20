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
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
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
