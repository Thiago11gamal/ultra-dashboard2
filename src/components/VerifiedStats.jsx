import React, { useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Target,
    HelpCircle,
    Activity,
    Settings2,
    BookOpen
} from 'lucide-react';
import MonteCarloGauge from './MonteCarloGauge';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { useAppStore } from '../store/useAppStore';
// ✅ LOTE-02 FIX (A1): shallow comparison para seletores que retornam arrays novos
import { useShallow } from 'zustand/react/shallow';
import { analyzeProgressState } from '../utils/ProgressStateEngine';
import { getSafeScore, formatValue } from '../utils/scoreHelper';
import { calculateSlope } from '../engine';
import { getDateKey, normalizeDate, APP_TIMEZONE } from '../utils/dateHelper';
import { getFlashcardDueTodayCount, getFlashcardMasteryPct, getFlashcardTotalCards, getFlashcardDeckCount } from '../utils/analytics';
import DueForecast from './DueForecast';

// FIX 1.1: Mapa estático de cores para evitar que o Tailwind purge elimine classes geradas dinamicamente via .replace()
const TAILWIND_COLOR_MAP = {
    'text-green-400':  { bg20: 'bg-green-400/20',  bar: 'bg-green-400',  shadow: 'shadow-green-400/30',  bgSolid: 'bg-green-500' },
    'text-red-400':    { bg20: 'bg-red-400/20',    bar: 'bg-red-400',    shadow: 'shadow-red-400/30',    bgSolid: 'bg-red-500' },
    'text-blue-400':   { bg20: 'bg-blue-400/20',   bar: 'bg-blue-400',   shadow: 'shadow-blue-400/30',   bgSolid: 'bg-blue-500' },
    'text-violet-400': { bg20: 'bg-violet-400/20', bar: 'bg-violet-400', shadow: 'shadow-violet-400/30', bgSolid: 'bg-violet-500' },
    'text-orange-400': { bg20: 'bg-orange-400/20', bar: 'bg-orange-400', shadow: 'shadow-orange-400/30', bgSolid: 'bg-orange-500' },
    'text-slate-400':  { bg20: 'bg-slate-400/20',  bar: 'bg-slate-400',  shadow: 'shadow-slate-400/30',  bgSolid: 'bg-slate-500' },
};
const getColorClasses = (textColor) => TAILWIND_COLOR_MAP[textColor] || TAILWIND_COLOR_MAP['text-slate-400'];

// T-030 FIX: incluir insufficient_data explicitamente
const STATE_PRIORITY = {
    regression: 0,
    stagnation_negative: 1,
    unstable: 2,
    stagnation_neutral: 3,
    progression: 4,
    stagnation_positive: 5,
    mastery: 6,
    insufficient_data: 7
};

const EMPTY_ARRAY = Object.freeze([]);

const InfoTooltip = React.memo(({ text }) => (
    <div className="relative group/tooltip inline-block ml-auto z-10">
        <HelpCircle size={14} className="text-slate-600 hover:text-purple-400 transition-colors cursor-help" />
        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl text-xs text-slate-300 shadow-2xl opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none z-[9999] text-right">
            {text}
        </div>
    </div>
));

const ForecastCard = React.memo(({ prediction, status, subtext, targetScore, trend, hasEnoughData, maxScore = 100 }) => (
    <div className={`glass h-full p-5 sm:p-6 rounded-2xl sm:rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 group hover:border-white/20 transition-all shadow-2xl overflow-hidden ${status === 'excellence' || status === 'good' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.12)]' :
        status === 'warning' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.12)]' :
            'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
        }`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-3xl rounded-full pointer-events-none group-hover:from-blue-500/20 group-hover:via-purple-500/20 transition-all duration-700" />
        <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-lg ${status === 'excellence' || status === 'good' ? 'bg-purple-500/20 border-purple-500/30' : status === 'warning' ? 'bg-red-500/20 border-red-500/30' : 'bg-blue-500/20 border-blue-500/30'}`}>
                    <Target size={18} className={status === 'excellence' || status === 'good' ? "text-purple-400" : status === 'warning' ? "text-red-400" : "text-blue-400"} />
                </div>
                <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        Previsão IA
                        {(trend === 'up' || trend === 'down') && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">Motor Preditivo</span>
                </div>
            </div>
        </div>
        <div className="text-center my-3 relative z-10 pb-1">
            <h2 className={`text-lg sm:text-xl md:text-2xl font-black leading-tight tracking-tight ${status === 'excellence' || status === 'good' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-400' :
                status === 'warning' ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-400' :
                    'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-400'
                }`}>
                {prediction}
            </h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 w-full mb-3 relative z-10">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-slate-900/70 transition-colors">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Meta</span>
                <div className="flex items-baseline gap-0.5">
                    <span className="text-base sm:text-lg font-black text-white font-mono">{formatValue(targetScore ?? 70)}</span>

                    {/* T-026 FIX: unidade dinâmica */}
                    {maxScore === 100 ? (
                        <span className="text-[10px] text-slate-400 font-bold">%</span>
                    ) : (
                        <span className="text-[8px] text-slate-400 font-bold">/{maxScore}</span>
                    )}
                </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-slate-900/70 transition-colors">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Tendência</span>
                <div className="flex items-center gap-1.5">
                    {hasEnoughData ? (
                        <>
                            {trend === 'up' && <TrendingUp size={14} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />}
                            {trend === 'down' && <TrendingDown size={14} className="text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" />}
                            {trend === 'stable' && <Minus size={14} className="text-slate-400" />}
                            <span className="text-xs font-black text-white uppercase tracking-wider">
                                {trend === 'up' ? 'Alta' : trend === 'down' ? 'Baixa' : 'Estável'}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Pendente</span>
                    )}
                </div>
            </div>
        </div>
        <div className="mt-auto pt-2.5 border-t border-white/10 relative z-10">
            <p className="text-[10.5px] text-slate-400 text-center leading-relaxed font-medium">
                {subtext}
            </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50 overflow-hidden">
            <div className={`h-full w-1/3 rounded-full opacity-70 move-right-anim ${status === 'excellence' || status === 'good' ? 'bg-purple-500' : status === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`} />
        </div>
    </div>
));

const ConsistencyCard = React.memo(({ consistency }) => (
    <div className={`glass h-full p-5 sm:p-6 rounded-2xl sm:rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 group hover:border-white/20 transition-all shadow-2xl ${consistency.bgBorder}`}>
        <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl border ${getColorClasses(consistency.color).bg20} ${consistency.bgBorder} flex items-center justify-center shadow-lg`}>
                    <Activity size={18} className={consistency.color} />
                </div>
                <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider leading-none">Consistência</span>
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">Estabilidade Global</span>
                </div>
            </div>
        </div>
        <div className="text-center my-3 relative z-10">
            <h2 className={`text-lg sm:text-xl md:text-2xl font-black leading-tight tracking-tight ${consistency.color} drop-shadow-md`}>
                {consistency.status}
            </h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Desvio Padrão</span>
                <span className={`text-base sm:text-lg font-black font-mono ${consistency.status !== 'Dados Insuficientes' ? consistency.color : 'text-slate-500'}`}>
                    {consistency.status !== 'Dados Insuficientes' && !isNaN(parseFloat(consistency.sd)) ? `±${consistency.sd}` : '---'}
                </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Diagnóstico</span>
                <span className="text-xs font-black text-slate-200 text-center leading-tight line-clamp-2 px-1">
                    {consistency.status === 'Dados Insuficientes' ? 'Pendente' :
                        (['EXCELENTE', 'EM EVOLUÇÃO', 'DOMÍNIO'].includes(consistency.status) ? 'Alta Estabilidade' :
                            (['EM QUEDA', 'INSTÁVEL'].includes(consistency.status) ? 'Alta Variação' : 'Variação Média'))}
                </span>
            </div>
        </div>
        <div className="mt-auto pt-2.5 border-t border-white/10">
            <p className="text-[10.5px] text-slate-300 text-center leading-relaxed font-medium">
                {consistency.message}
            </p>
        </div>
    </div>
));

const CategoryRow = React.memo(({ cat, idx, maxSdVal, maxScore = 100 }) => {
    const safeMaxSdVal = Math.max(1e-6, Number(maxSdVal) || 0);
    const sdNum = Number.isFinite(parseFloat(cat.sd)) ? parseFloat(cat.sd) : 0;
    // BUG-26 FIX: Evitar NaN/Infinity quando maxSdVal é 0
    const barWidth = maxSdVal === 0 ? 100 : Math.min(100, Math.max(0, 100 - (sdNum / safeMaxSdVal) * 100));
    const deltaNum = Number.isFinite(parseFloat(cat.delta)) ? parseFloat(cat.delta) : 0;
    const safeColor = typeof cat.color === 'string' ? cat.color : 'text-slate-400';
    const safeBgBorder = typeof cat.bgBorder === 'string' ? cat.bgBorder : 'border-slate-500/30';
    // FIX 1.1: Usar mapa estático em vez de .replace() dinâmico (Tailwind purge-safe)
    const colorClasses = getColorClasses(safeColor);
    const sdBarColor = colorClasses.bar;
    const sdBarGlow = colorClasses.shadow;

    // Marcadores escalonados por maxScore (5% e 15% do domínio)
    const sd5Val = 0.05 * maxScore;
    const sd15Val = 0.15 * maxScore;

    return (
        <div className={`grid grid-cols-[1fr_auto_100px] md:grid-cols-12 gap-2 px-3 py-2.5 rounded-xl items-center transition-all duration-300 hover:bg-white/[0.03] ${idx % 2 === 0 ? 'bg-black/10' : ''}`}>
            <div className="col-span-1 md:col-span-3 flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${getColorClasses(safeColor).bgSolid}`} />
                <span className="text-xs sm:text-sm font-bold text-slate-200 break-words line-clamp-2">{cat.name}</span>
            </div>
            <div className="flex justify-center md:col-span-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${safeColor} ${safeBgBorder} bg-black/40`}>
                    {cat.status}
                </span>
            </div>
            <div className="flex items-center gap-2 md:col-span-4 min-w-0">
                <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                    <div className={`h-full rounded-full ${sdBarColor} shadow-md ${sdBarGlow} transition-all duration-700 ease-out`} style={{ width: `${barWidth}%`, minWidth: barWidth > 0 ? '4px' : '0' }} />
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${Math.max(0, Math.min(100, (sd5Val / safeMaxSdVal) * 100))}%` }} title={`SD=${sd5Val}`} />
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${Math.max(0, Math.min(100, (sd15Val / safeMaxSdVal) * 100))}%` }} title={`SD=${sd15Val}`} />
                </div>
                <span className={`text-xs font-mono font-black min-w-[36px] text-right ${safeColor}`}>±{Number.isFinite(sdNum) ? sdNum.toFixed(0) : '--'}</span>
            </div>
            <div className="hidden md:flex md:col-span-1 justify-center items-center">
                {deltaNum > 0 ? (
                    <span className="text-[10px] font-black text-green-400 flex items-center gap-0.5"><TrendingUp size={10} />+{Math.abs(deltaNum).toFixed(0)}</span>
                ) : deltaNum < 0 ? (
                    <span className="text-[10px] font-black text-red-400 flex items-center gap-0.5"><TrendingDown size={10} />{deltaNum.toFixed(0)}</span>
                ) : (
                    <span className="text-[10px] font-bold text-slate-600">—</span>
                )}
            </div>
            <div className="hidden md:flex md:col-span-2 flex-col justify-center gap-0.5 min-w-0 pr-3">
                {cat.villains && cat.villains.length > 0 ? (
                    cat.villains.slice(0, 2).map((v, vIdx) => (
                        <div
                            key={`${cat.id || cat.name}-${v.name}-${vIdx}`}
                            className="flex items-center justify-between gap-1 text-[12px] leading-tight min-h-[14px] w-full min-w-0 px-1"
                        >
                            <span className="text-slate-400 truncate font-semibold min-w-0" title={v.name}>{v.name}</span>
                            <span className="text-red-400 font-mono font-black shrink-0">±{v.sd.toFixed(0)}</span>
                        </div>
                    ))
                ) : (
                    <span className="text-[10px] text-slate-600 text-center">—</span>
                )}
            </div>
        </div>
    );
});

const SubjectBreakdownTable = React.memo(({ categoryBreakdown, maxScore = 100 }) => {
    if (categoryBreakdown.length === 0) return (
        <div className="text-center text-slate-500 py-4 text-sm">É necessário realizar pelo menos 3 simulados em cada matéria para gerar o diagnóstico individual.</div>
    );

    const maxSdVal = Math.max(0.25 * maxScore, ...categoryBreakdown.map(c => c.rawSd || 0));

    return (
        <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[1fr_auto_100px] md:grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-normal border-b border-white/5 mb-1 overflow-hidden">
                <div className="md:col-span-3">Matéria</div>
                <div className="text-center md:col-span-2">Status</div>
                <div className="text-center md:col-span-4" title="Estabilidade (SD inverso)">Estabilidade</div>
                <div className="hidden md:block md:col-span-1 text-center">Δ</div>
                <div className="hidden md:block md:col-span-2 text-center">Vilões</div>
            </div>
            {categoryBreakdown.map((cat, idx) => (
                <CategoryRow
                    key={cat.id || cat.name}
                    cat={cat}
                    idx={idx}
                    maxSdVal={maxSdVal}
                    maxScore={maxScore}
                />
            ))}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-[9px] font-black uppercase tracking-widest text-slate-500 pt-4 border-t border-white/5 opacity-60">
                {[
                    { color: 'bg-purple-500', label: `SD ≤ ${(0.05 * maxScore).toFixed(0)}` },
                    { color: 'bg-blue-500', label: `SD ≤ ${(0.10 * maxScore).toFixed(0)}` },
                    { color: 'bg-orange-500', label: `SD ≤ ${(0.15 * maxScore).toFixed(0)}` },
                    { color: 'bg-red-400', label: `SD ≤ ${(0.25 * maxScore).toFixed(0)}` },
                    { color: 'bg-red-600', label: `SD > ${(0.25 * maxScore).toFixed(0)}` }
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                        <span className="text-[9px] text-slate-500 font-medium">{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default function VerifiedStats({ categories = [], user, flashcardDecks: propFlashcardDecks }) {
    const safeCategories = useMemo(() => Array.isArray(categories) ? categories : Object.values(categories || {}), [categories]);

    // ✅ FIX: usar hash estável das categorias como dependência
    const categoriesHash = useMemo(() => {
      return JSON.stringify(
        safeCategories.map(c => ({ 
          id: c.id, 
          maxScore: c.maxScore, 
          minScore: c.minScore 
        }))
      );
    }, [safeCategories]);

    // ✅ LOTE-02 FIX (M5): reduce em vez de spread — evita RangeError com muitas categorias
    const maxScore = useMemo(() => {
        const scores = safeCategories.map(c => Number(c.maxScore)).filter(s => Number.isFinite(s) && s > 0);
        return scores.length > 0 ? scores.reduce((a, b) => Math.max(a, b), -Infinity) : 100;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoriesHash]);
    const minScore = useMemo(() => {
        const scores = safeCategories.map(c => Number(c.minScore)).filter(s => Number.isFinite(s));
        return scores.length > 0 ? scores.reduce((a, b) => Math.min(a, b), Infinity) : 0;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoriesHash]);

    // T-039 FIX: estabilizar a prop unit para ajudar na memoização do gauge
    const gaugeUnit = useMemo(() => {
        return maxScore === 100 ? '%' : ' pts';
    }, [maxScore]);

    // FIX LÓGICO: Clampar meta à escala [minScore, maxScore] sem loops multiplicativos
    const normalizeTargetToScale = React.useCallback((raw) => {
        const n = Number(raw);

        const fallback = maxScore === 100
            ? 70
            : Math.round(minScore + (maxScore - minScore) * 0.7);

        if (!Number.isFinite(n) || n <= 0) return fallback;

        return Math.max(minScore, Math.min(maxScore, n));
    }, [maxScore, minScore]);

    // ✅ LOTE-02 FIX (A1): sem useShallow, Object.values criava um array NOVO a cada
    // snapshot da store → o componente re-renderizava em qualquer mudança global
    // (pomodoro, sessão, flashcard...). O useShallow compara os elementos.
    // ✅ CORREÇÃO — seletor que retorna referência estável
    const activeId = useAppStore(state => state.appState?.activeId);
    const storeFlashcardDecks = useAppStore(
        React.useCallback(
            state => {
                const rawDecks = state.appState?.contests?.[activeId]?.flashcardDecks || [];
                return Array.isArray(rawDecks) ? rawDecks : Object.values(rawDecks || {});
            },
            [activeId]
        ),
        useShallow
    );
    const flashcardDecks = propFlashcardDecks || storeFlashcardDecks;

    const flashcardIndicators = useMemo(() => {
        const decks = Array.isArray(flashcardDecks) ? flashcardDecks : Object.values(flashcardDecks || {});
        const totalCards = getFlashcardTotalCards(decks);
        return {
            totalDecks: getFlashcardDeckCount(decks),
            totalCards,
            dueToday: getFlashcardDueTodayCount(decks),
            masteryPct: getFlashcardMasteryPct(decks),
            totalReviews: decks.reduce((sum, d) => {
                const cards = d?.cards ? (Array.isArray(d.cards) ? d.cards : Object.values(d.cards)) : [];
                return sum + cards.reduce((r, c) => r + (Number(c?.reviews) || 0), 0);
            }, 0)
        };
    }, [flashcardDecks]);

    // Lifted State for Target Score (Shared between Prediction Card and Monte Carlo Gauge)
    const [targetScore, setTargetScore] = React.useState(() =>
        normalizeTargetToScale(user?.targetProbability)
    );

    // B-06 FIX: Adicionar trava de round-trip para evitar resets durante sincronização assíncrona
    const pendingLocalSave = React.useRef(false);

    // FIX: Wrapper para setTargetScore que trava a sincronização IMEDIATAMENTE ao interagir,
    // evitando que o useEffect de leitura atropele o estado local antes do debounce salvar.
    const handleSetTargetScore = React.useCallback((newScore) => {
        pendingLocalSave.current = true;
        setTargetScore(normalizeTargetToScale(newScore));
    }, [normalizeTargetToScale]);

    // B-06 FIX: Sincronização Robusta com Trava de Round-trip
    const storeTarget = user?.targetProbability;
    
    React.useEffect(() => {
        if (storeTarget == null || storeTarget === '') return;
        const parsedStore = parseFloat(storeTarget);
        if (isNaN(parsedStore)) return;

        // T-026 FIX: normalizar o valor vindo da store para a escala atual
        const normalizedStore = normalizeTargetToScale(parsedStore);

        // Se estamos aguardando um salvamento local
        if (pendingLocalSave.current) {
            // SÓ abrimos o cadeado quando a Store refletir o novo valor
            if (Math.abs(normalizedStore - targetScore) < 0.01) {
                pendingLocalSave.current = false;
            }
            // Enquanto o cadeado estiver fechado, ignoramos o que vem da Store
            return;
        }

        // Se o cadeado está aberto e o valor da Store mudou (ex: vindo de outro dispositivo)
        if (Math.abs(normalizedStore - targetScore) > 0.01) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTargetScore(normalizedStore);
        }
    }, [storeTarget, targetScore, normalizeTargetToScale]);
    const [showConfig, setShowConfig] = React.useState(false);
    const [showSubjects, setShowSubjects] = React.useState(false);

    // T-039 FIX: adiar levemente a montagem do gauge futuro para reduzir o pico inicial de cálculo.
    const [mountFutureGauge, setMountFutureGauge] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setMountFutureGauge(true);
        }, 150);

        return () => clearTimeout(timer);
    }, []);

    // Performance Fix: Debounce targetScore for the heavy 'stats' calculation
    const [statsTarget, setStatsTarget] = React.useState(targetScore);
    React.useEffect(() => {
        const timer = setTimeout(() => setStatsTarget(targetScore), 300);
        return () => clearTimeout(timer);
    }, [targetScore]);


    const weights = useAppStore(state => state.appState?.contests?.[activeId]?.mcWeights || null);
    const setWeights = useAppStore(state => state.setMonteCarloWeights);
    const equalWeightsMode = useAppStore(state => state.appState?.mcEqualWeights ?? true);
    const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);
    // T-008 FIX: Normalizar para array. Se vier como objeto Firebase,
    // convertemos com Object.values para evitar crash em .map().
    const rawHistoricalCutoffs = useAppStore(
        state => state.appState?.contests?.[activeId]?.historicalCutoffs
    );
    const historicalCutoffs = useMemo(() => {
        if (Array.isArray(rawHistoricalCutoffs)) return rawHistoricalCutoffs;
        if (rawHistoricalCutoffs && typeof rawHistoricalCutoffs === 'object') {
            return Object.values(rawHistoricalCutoffs);
        }
        return EMPTY_ARRAY;
    }, [rawHistoricalCutoffs]);
    const setHistoricalCutoffs = useAppStore(state => state.setHistoricalCutoffs);

    const getEqualWeights = React.useCallback(() => {
        if (safeCategories.length === 0) return {};
        const newWeights = {};
        safeCategories.forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
        });
        return newWeights;
    }, [safeCategories]);

    const updateWeight = React.useCallback((catId, value) => {
        const numeric = parseInt(value, 10);
        const sanitize = isNaN(numeric) ? 0 : Math.max(0, Math.min(999, numeric));
        const updatedWeights = { ...(weights || {}), [catId]: sanitize };
        setWeights(updatedWeights);
    }, [weights, setWeights]);


    // Save to LocalStorage and Store whenever it changes
    const setUserData = useAppStore(state => state.setData);

    React.useEffect(() => {
        const parsed = normalizeTargetToScale(targetScore);
        if (!Number.isFinite(parsed)) return;

        // T-026 FIX: comparar valores já normalizados para a escala atual
        const parsedStore = parseFloat(storeTarget);
        const currentStoreTarget = normalizeTargetToScale(parsedStore);

        // Se o valor local já é igual ao da Store (e a store não está vazia), não fazemos nada
        if (!isNaN(parsedStore) && Number.isFinite(currentStoreTarget) && Math.abs(parsed - currentStoreTarget) <= 0.01) return;

        // Ativa a trava: "Não aceite valores da Store até que eu termine de salvar"
        pendingLocalSave.current = true;
        // ✅ LOTE-02 FIX (A5): fail-safe de 3s abria o cadeado ANTES de writes lentos
        // completarem → o useEffect de leitura sobrescrevia o input com o valor antigo
        // da store (flicker/desfaz a edição). 8s cobre debounce (800ms) + rede lenta.
        const safetyTimer = setTimeout(() => {
            pendingLocalSave.current = false;
        }, 8000);

        const timer = setTimeout(() => {
            setUserData(data => {
                if (!data?.user) return data;
                // Double check inside to prevent redundant writes
                if (Math.abs(Number(data.user.targetProbability) - parsed) <= 0.01) return data;

                return {
                    ...data,
                    user: { ...data.user, targetProbability: parsed },
                    lastUpdated: new Date().toISOString()
                };
            }, false); // don't record history for every debounced keystroke
        }, 800);

        return () => {
            clearTimeout(timer);
            clearTimeout(safetyTimer);
        };
    }, [targetScore, setUserData, storeTarget, normalizeTargetToScale]);

    const baseHistoryStats = useMemo(() => {
        let allHistory = [];
        let totalQuestionsGlobal = 0;

        safeCategories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Flatten history for global regression
                const hArray = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history);
                hArray.forEach(h => {
                    const catMaxScore = Number(cat.maxScore) || maxScore;
                    // ✅ LOTE-02 FIX (C3): minScore calculado ANTES e propagado ao getSafeScore
                    const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : 0;
                    const safeScore = getSafeScore(h, catMaxScore, catMinScore);
                    const parsedDate = normalizeDate(h.date);
                    // ✅ LOTE-02 FIX (C2): `>= 0` aceitava o NaN→0 do getSafeScore antigo
                    // e qualquer zero falso. Number.isFinite é o filtro correto.
                    if (parsedDate && Number.isFinite(safeScore)) {
                        // 0s Bug Filter: Proteção contra Corrupção de Dados
                        const tTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                        if (tTs !== null && tTs <= 0 && safeScore === 0) return;
                        // Normalização pela proporção no intervalo útil com piso
                        const catRange = Math.max(1e-9, catMaxScore - catMinScore);
                        const globalRange = Math.max(1e-9, maxScore - minScore);
                        const ratio = (safeScore - catMinScore) / catRange;
                        const normalizedToGlobalScale = minScore + ratio * globalRange;

                        allHistory.push({
                            date: parsedDate.getTime(),
                            score: normalizedToGlobalScale,
                            totalQuestions: Number(h.total) || 0
                        });
                        totalQuestionsGlobal += (Number(h.total) || 0);
                    }
                });
            }
        });

        // 0. Aggregate by Day
        const dailyMap = {};
        allHistory.forEach(h => {
            const dateStr = getDateKey(new Date(h.date));
            if (!dateStr) return;
            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = { scoreSum: 0, weightSum: 0, date: h.date };
            }
            // Weight by volume to favor "representative" days
            const weight = Math.max(1, Number(h.totalQuestions) || 1);
            dailyMap[dateStr].scoreSum += (Number(h.score) * weight);
            dailyMap[dateStr].weightSum += weight;
        });

        const dailyHistory = Object.values(dailyMap)
            .map(d => ({ 
                // FIX: A data já está em milissegundos corretos em `d.date` (foi extraída do h.date)
                // Removido o ciclo desnecessário de normalização que podia reintroduzir bugs de offset.
                date: d.date,
                score: d.weightSum > 0 ? d.scoreSum / d.weightSum : 0,
                weight: d.weightSum // BUG-01 FIX: Preservamos o volume para evitar Paradoxo de Simpson em médias posteriores
            }))
            .sort((a, b) => a.date - b.date);

        return { dailyHistory, allHistory, totalQuestionsGlobal, sortedCategories: safeCategories };
        // ✅ LOTE-02 FIX (A4): minScore faltava nas dependências — memo ficava stale
        // se o piso da escala mudasse sem alterar maxScore.
    }, [safeCategories, maxScore, minScore]);

    const stats = useMemo(() => {
        const { dailyHistory, allHistory, totalQuestionsGlobal, sortedCategories } = baseHistoryStats;
        // ✅ LOTE-02 FIX (C3): range real da escala — todas as proporções internas
        // passam a usar o intervalo útil [minScore, maxScore], não o teto absoluto.
        const globalRange = Math.max(1e-9, maxScore - minScore);
        // T-035/T-026 FIX: O ProgressStateEngine espera limites em porcentagem da escala.
        // statsTarget é absoluto (ex.: 700 numa escala 1000), então convertemos para %.
        // ✅ LOTE-02 FIX (C3): proporção sobre o RANGE, não sobre maxScore.
        const targetPct = globalRange > 0
            ? Math.max(0, Math.min(100, ((statsTarget - minScore) / globalRange) * 100))
            : 70;

        // 1. Progress State Analysis (using ProgressStateEngine)
        // Run on global daily average for consistent trend
        const globalAnalysis = analyzeProgressState(dailyHistory, {
            window_size: Math.min(5, dailyHistory.length),
            stagnation_threshold: 4,
            // T-035 FIX: evitar high < low quando a meta é baixa
            low_level_limit: Math.min(60, targetPct),
            high_level_limit: targetPct,
            mastery_limit: targetPct,
            maxScore: maxScore
        });

        // Map to UI-compatible format
        const hasEnoughData = dailyHistory.length >= 3;
        // D-02 FIX: Unificar unidades. PSE retorna pp/sessão. Multiplicamos por 30 (pp/30d) 
        // para alinhar com o Coach e threshold de 0.5.
        const trend30d = globalAnalysis.trend_slope * 30;
        // Threshold relativo: 0.5% do teto por 30 dias, mínimo 0.5 absoluto para maxScore=100
        const trendThreshold = Math.max(0.5, 0.005 * globalRange); // ✅ LOTE-02 FIX (C3)
        const trend = !hasEnoughData ? 'insufficient' :
            (trend30d > trendThreshold ? 'up' :
                trend30d < -trendThreshold ? 'down' : 'stable');
        const trendValue = trend30d;

        // 2. Linear Regression & Contextual Prediction
        let prediction = "Calibrando...";
        let predictionSubtext = "Realize mais simulados.";
        let predictionStatus = "neutral";

        // Use the debounced statsTarget for heavy calculations
        const userTarget = statsTarget;
        let calculatedTarget = userTarget;

        const distinctDays = dailyHistory.length;

        if (distinctDays >= 3) {
            // BUG-01 FIX: Rendimento Recente ponderado por volume real.
            // Elimina o Paradoxo de Simpson ao evitar a "Média das Médias" diárias.
            const recentHistory = dailyHistory.slice(-5);
            const totalWeight = recentHistory.reduce((acc, d) => acc + (d.weight || 1), 0);
            const currentAvg = totalWeight > 0 
                ? recentHistory.reduce((acc, d) => acc + (d.score * (d.weight || 1)), 0) / totalWeight
                : recentHistory.reduce((acc, d) => acc + d.score, 0) / recentHistory.length;

            // Determine Target dynamically IF user is already above their target
            if (currentAvg >= userTarget) {
                calculatedTarget = maxScore;
            }

            // Use the shared Weighted Regression engine function for total consistency with Monte Carlo Dashboard
            // ensure format is valid (dailyHistory already has { date: number(ms), score: number })
            // ✅ LOTE-02 FIX (C3): propagar minScore para o clamp interno do engine
            let slope = calculateSlope(dailyHistory, maxScore, { minScore });
            // Engine clamps properly internally, but we can do a hard limit just to be absolutely safe for dates.
            const MAX_SLOPE = 0.004 * globalRange; // ✅ LOTE-02: range, não teto
            slope = Math.max(-MAX_SLOPE, Math.min(MAX_SLOPE, slope));

            // ANTIGRAVITY PREDICTION ENGINE 🚀
            const currentScore = currentAvg;
            const target = calculatedTarget;
            const distance = target - currentScore;

            if (distance <= 0 || currentScore >= target) {
                prediction = "Meta Atingida!";
                predictionSubtext = "Rumo aos 100%!";
                predictionStatus = "excellence";
            } else {
                // ✅ FIX BUG-50: proteger contra globalRange = 0
                const safeGlobalRange = Math.max(1e-9, globalRange);
                
                const weeklyBaseSpeed = slope * 7;
                const speedThreshold = 0.0001 * safeGlobalRange;

                if (weeklyBaseSpeed <= speedThreshold) {
                    prediction = "Estagnado/Queda";
                    predictionSubtext = "Melhore sua tendência diária para gerar previsão.";
                    predictionStatus = "warning";
                } else {
                    // ✅ FIX BUG-50: difficultyFactor protegido contra globalRange = 0
                    const scorePosition = safeGlobalRange > 0 
                      ? (currentScore - minScore) / safeGlobalRange 
                      : 0.5;
                    const difficultyFactor = Math.max(0.40, 1 - 0.5 * scorePosition);

                    let quality = 0.8;
                    const totalDailyW = dailyHistory.reduce((acc, h) => acc + (h.weight || 1), 0);
                    const dailyMean = totalDailyW > 0 
                        ? dailyHistory.reduce((acc, h) => acc + h.score * (h.weight || 1), 0) / totalDailyW
                        : currentScore;
                    
                    const dailyVar = totalDailyW > 0
                        ? dailyHistory.reduce((acc, h) => {
                            const diff = h.score - dailyMean;
                            return acc + (diff * diff) * (h.weight || 1);
                        }, 0) / totalDailyW
                        : 0;
                    
                    const dailySD = Math.sqrt(Math.max(0, dailyVar));
                    quality = Math.max(0.5, 1 - (dailySD / (0.40 * safeGlobalRange)));

                    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
                    const adjustedSpeed = safe(weeklyBaseSpeed * difficultyFactor * quality);

                    // ✅ FIX BUG-41: minSpeed proporcional ao range + cap em weeksEstimated
                    const minSpeed = 0.00001 * safeGlobalRange;
                    let weeksEstimated = adjustedSpeed > minSpeed ? (distance / adjustedSpeed) : 999;
                    
                    // ✅ FIX BUG-41: cap máximo para evitar "Infinity semanas"
                    weeksEstimated = Math.min(weeksEstimated, 520); // máx 10 anos
                    
                    const daysEstimated = weeksEstimated * 7;

                    if (daysEstimated > 365 * 2) {
                        prediction = "Longo Prazo";
                        predictionSubtext = `Continue firme. O caminho é longo.`;
                    } else {
                        const nowTime = new Date().getTime();

                        // FIX Bug 2: Margin calculated via error propagation
                        const pointsPerDay = adjustedSpeed / 7;
                        const minPointsPerDay = 0.00001 * safeGlobalRange;
                        const sdDays = pointsPerDay > minPointsPerDay ? (dailySD / pointsPerDay) : 0;

                        // Limit margin to 50% of total time to avoid explosive intervals
                        const sigmaLimit = daysEstimated * 0.5;
                        const margin = Math.min(safe(sdDays), sigmaLimit);

                        const daysMin = Math.max(1, daysEstimated - margin);
                        const daysMax = daysEstimated + margin;

                        const dateMin = new Date(nowTime + (daysMin * 24 * 60 * 60 * 1000));
                        const dateMax = new Date(nowTime + (daysMax * 24 * 60 * 60 * 1000));

                        const fmt = (d) => {
                            if (isNaN(d.getTime())) return "--/--";
                            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: APP_TIMEZONE });
                        };

                        prediction = `${fmt(dateMin)} — ${fmt(dateMax)}`;
                        predictionSubtext = `Previsão de alcance (${formatValue(target)}${maxScore === 100 ? '%' : ` de ${maxScore}`})`;  // FIX 1.5: Unidade dinâmica
                        predictionStatus = "good";
                    }
                }
            }
        } else {
            predictionSubtext = `Faltam ${3 - distinctDays} dias de simulados para prever.`;
        }

        // 3. Confidence Interval (Sample Size)
        // Heuristic: < 50 questions = Low, 50-200 = Medium, > 200 = High
        // Fallback: If total questions is 0 (missing data), use N of exams.
        const nExams = allHistory.length;

        let confidenceData = {
            level: 'BAIXA',
            color: 'text-red-400',
            bgBorder: 'border-red-500',
            message: "Amostra muito pequena."
        };

        if (totalQuestionsGlobal > 200 || nExams > 20) {
            confidenceData = {
                level: 'ALTA',
                color: 'text-green-400',
                bgBorder: 'border-green-500',
                message: "Dados estatisticamente relevantes."
            };
        } else if (totalQuestionsGlobal > 50 || nExams > 5) {
            confidenceData = {
                level: 'MÉDIA',
                color: 'text-blue-400',
                bgBorder: 'border-blue-500',
                message: "Margem de erro diminuindo."
            };
        }

        // 4. Progress State Analysis per Category (using ProgressStateEngine)
        let consistency = {
            status: 'Dados Insuficientes',
            color: 'text-slate-400',
            bgBorder: 'border-slate-500',
            message: "Mínimo 3 simulados em cada matéria para diagnóstico.",
            delta: 0,
            sd: 0
        };

        const categoryBreakdown = [];
        const categoryAnalyses = [];

        // State to UI mapping (BUG-06 FIX: removidos elementos JSX desnecessários do useMemo)
        const stateMap = {
            mastery: { status: 'DOMÍNIO', color: 'text-green-400', bgBorder: 'border-green-500/30' },
            stagnation_negative: { status: 'ESTAGNADO BAIXO', color: 'text-red-400', bgBorder: 'border-red-500/30' },
            stagnation_neutral: { status: 'ESTAGNADO MÉDIO', color: 'text-blue-400', bgBorder: 'border-blue-500/30' },
            stagnation_positive: { status: 'EXCELENTE', color: 'text-violet-400', bgBorder: 'border-violet-500/30' },
            progression: { status: 'EM EVOLUÇÃO', color: 'text-blue-400', bgBorder: 'border-blue-500/30' },
            regression: { status: 'EM QUEDA', color: 'text-red-400', bgBorder: 'border-red-500/30' },
            unstable: { status: 'INSTÁVEL', color: 'text-orange-400', bgBorder: 'border-orange-500/30' },
            insufficient_data: { status: 'SEM DADOS', color: 'text-slate-400', bgBorder: 'border-slate-500/30' }
        };

        sortedCategories.forEach(cat => {
            const hArray = cat.simuladoStats?.history ? (Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history)) : [];
            if (hArray.length >= 3) {
                // BUG FIX 98: Sort history by date to ensure chronological order for trend analysis
                const sortedHistory = [...hArray]
                    .filter(h => h.date && normalizeDate(h.date) !== null)
                    .sort((a, b) => (normalizeDate(a.date)?.getTime() ?? 0) - (normalizeDate(b.date)?.getTime() ?? 0));

                const catMaxScore = Number(cat.maxScore) || maxScore;
                // ✅ LOTE-02 FIX (C3): normalização por RAZÃO no intervalo útil da matéria,
                // projetada para o intervalo global. Antes: score/catMaxScore ignorava
                // ambos os pisos (ex.: escala 200–1000, nota 600 → 60% em vez de 50%).
                const catMinScore2 = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : 0;
                const catRange2 = Math.max(1e-9, catMaxScore - catMinScore2);
                const analysisHistory = sortedHistory.slice(-5).map(h => {
                    const s = getSafeScore(h, catMaxScore, catMinScore2);
                    const ratio = Math.max(0, Math.min(1, (s - catMinScore2) / catRange2));
                    return {
                        score: minScore + ratio * globalRange,
                        date: normalizeDate(h.date)?.getTime() ?? Date.now()
                    };
                });

                const analysis = analyzeProgressState(analysisHistory, {
                    window_size: Math.min(5, analysisHistory.length),
                    stagnation_threshold: 4,
                    // T-035 FIX: evitar high < low quando a meta é baixa
                    low_level_limit: Math.min(60, targetPct),
                    high_level_limit: targetPct,
                    mastery_limit: targetPct,
                    maxScore: maxScore
                });

                categoryAnalyses.push(analysis);

                const uiState = stateMap[analysis.state] || stateMap.insufficient_data;
                const sd = Math.sqrt(analysis.variance);

                // --- TOPIC VARIATION ANALYSIS (Synchronized with recent window) ---
                const topicMap = {};
                const safeSortedHistory = Array.isArray(sortedHistory) ? sortedHistory : Object.values(sortedHistory || {});
                const recentHistoryForTopics = safeSortedHistory.slice(-10); // Analyze recent stability
                recentHistoryForTopics.forEach(h => {
                    if (h && h.topics) {
                        const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                        safeTopics.forEach(t => {
                            if (!t || !t.name) return;
                            let total = Number(t.total) || 0;
                            const isSynthetic = total === 0 && t.score != null;
                            if (isSynthetic) total = 100; // Synthetic total for percentage-only inputs

                            // ✅ LOTE-02 FIX (C3): lê o score com o piso da matéria e
                            // converte via RAZÃO do intervalo útil (não score/maxScore).
                            const safeScore = getSafeScore(t, catMaxScore, catMinScore2);
                            const topicRatio = Math.max(0, Math.min(1, (safeScore - catMinScore2) / catRange2));
                            
                            if (total > 0) {
                                // BUG FIX (Rounding Noise): Evitar requantizar quando já temos a nota calculada
                                const finalTopicRatio = (Number.isFinite(safeScore)) 
                                    ? topicRatio 
                                    : Math.max(0, Math.min(1, (Number(t.correct) || 0) / total));

                                // Escala global com piso
                                const topicScore = minScore + finalTopicRatio * globalRange;
                                if (!topicMap[t.name]) topicMap[t.name] = [];
                                topicMap[t.name].push(topicScore);
                            }
                        });
                    }
                });

                const unstableTopics = [];
                Object.entries(topicMap).forEach(([tName, tScores]) => {
                    if (tScores.length >= 3) {
                        const tMean = tScores.reduce((a, b) => a + b, 0) / tScores.length;
                        const tVar = tScores.reduce((a, b) => a + Math.pow(b - tMean, 2), 0) / (tScores.length - 1);
                        const tSD = Math.sqrt(Math.max(0, tVar));
                        if (tSD > 0.10 * globalRange) { // ✅ LOTE-02 FIX (C3)
                            unstableTopics.push({ name: tName, sd: tSD });
                        }
                    }
                });

                unstableTopics.sort((a, b) => b.sd - a.sd);
                const villains = unstableTopics.slice(0, 3);

                categoryBreakdown.push({
                    // T-031 FIX: chave estável para React
                    id: cat.id || cat.name,
                    name: cat.name,
                    status: uiState.status,
                    color: uiState.color,
                    bgBorder: uiState.bgBorder,
                    delta: analysis.delta,
                    sd: sd.toFixed(2),
                    rawSd: sd,
                    message: analysis.label,
                    state: analysis.state,
                    villains: villains
                });
            }
        });

        // Sort: Worst states first (regression > stagnation_negative > unstable > others)
        // FIX 1.4: Usar mapa unificado STATE_PRIORITY (inclui mastery)
        categoryBreakdown.sort((a, b) => (STATE_PRIORITY[a.state] ?? 6) - (STATE_PRIORITY[b.state] ?? 6));

        // T-030 FIX: Excluir estados insufficient_data da consolidação global.
        // Eles não devem contaminar média, desvio padrão nem mediana de consistência.
        const validCategoryAnalyses = categoryAnalyses.filter(a => a && a.state !== 'insufficient_data');
        const eligibleCategories = categoryBreakdown.filter(c => c.state && c.state !== 'insufficient_data');

        // Consolidate for Global Card
        if (validCategoryAnalyses.length > 0 && eligibleCategories.length > 0) {
            const avgDelta = validCategoryAnalyses.reduce((a, b) => a + b.delta, 0) / validCategoryAnalyses.length;
            const avgSD = Math.sqrt(
                Math.max(
                    0,
                    validCategoryAnalyses.reduce((a, b) => a + (Number(b.variance) || 0), 0) / validCategoryAnalyses.length
                )
            );

            // D-03 FIX: Usar MEDIANA dos estados em vez da pior matéria.
            // FIX 1.4: Usar STATE_PRIORITY unificado.
            // T-030 FIX: usar apenas categorias elegíveis.
            const stateValues = eligibleCategories.map(c => STATE_PRIORITY[c.state] ?? 6);
            stateValues.sort((a, b) => a - b);

            const medIdx = Math.floor(stateValues.length / 2);
            const medianValue = stateValues[medIdx];

            const medianState = Object.entries(STATE_PRIORITY).find(([, v]) => v === medianValue)?.[0] || 'unstable';
            const uiState = stateMap[medianState] || stateMap.insufficient_data;
            const medianCat = eligibleCategories.find(c => c.state === medianState) ?? eligibleCategories[0];

            consistency = {
                status: uiState.status,
                color: uiState.color,
                bgBorder: uiState.bgBorder,
                message: medianCat.message,
                delta: avgDelta.toFixed(2),
                sd: avgSD.toFixed(2)
            };
        }

        return { hasEnoughData, trend, trendValue, prediction, predictionStatus, predictionSubtext, confidenceData, totalQuestionsGlobal, consistency, categoryBreakdown, targetScore: statsTarget };
        // ✅ LOTE-02 FIX (A4): minScore agora é usado internamente (targetPct, normalizações)
    }, [baseHistoryStats, statsTarget, maxScore, minScore]);

    return (
        <div className="flex flex-col gap-4 animate-fade-in-down">
            {/* Top Row: AI Forecast and Consistency Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ForecastCard
                    prediction={stats.prediction}
                    status={stats.predictionStatus}
                    subtext={stats.predictionSubtext}
                    targetScore={stats.targetScore}
                    trend={stats.trend}
                    hasEnoughData={stats.hasEnoughData}
                    maxScore={maxScore}
                />
                <ConsistencyCard consistency={stats.consistency} />
            </div>

            {/* Bottom Row: Monte Carlo Side-by-Side - Enquadramento Premium */}
            <div className="glass p-5 sm:p-7 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden bg-slate-900/50 mt-2 mb-2">
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-0" />
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none -z-0" />

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/10 shrink-0">
                            <Activity size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                                    Simulação de Monte Carlo
                                </h2>
                                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    PROJEÇÃO PROBABILÍSTICA
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                                Comparativo em tempo real entre o desempenho consolidado atual e o cenário simulado na data-alvo.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowConfig(true)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/90 border border-white/10 hover:border-blue-500/40 rounded-xl text-xs font-bold text-slate-200 transition-all shadow-lg active:scale-95 group shrink-0"
                    >
                        <Settings2 size={15} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                        <span>Configurar Classificações e Meta</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch relative z-10">
                    <MonteCarloGauge
                        categories={safeCategories}
                        goalDate={user?.goalDate}
                        forcedMode="today"
                        forcedTitle="Status Atual"
                        targetScore={statsTarget}
                        onTargetScoreChange={handleSetTargetScore}
                        minScore={minScore}
                        maxScore={maxScore}
                        unit={gaugeUnit}
                        syncShowSubjects={showSubjects}
                        onSyncShowSubjects={setShowSubjects}
                    />
                    {mountFutureGauge ? (
                        <MonteCarloGauge
                            categories={safeCategories}
                            goalDate={user?.goalDate}
                            forcedMode="future"
                            forcedTitle="Projeção Futura"
                            targetScore={statsTarget}
                            onTargetScoreChange={handleSetTargetScore}
                            minScore={minScore}
                            maxScore={maxScore}
                            unit={gaugeUnit}
                            syncShowSubjects={showSubjects}
                            onSyncShowSubjects={setShowSubjects}
                        />
                    ) : (
                        <div className="glass p-5 sm:p-6 rounded-2xl border-l-4 border-indigo-500 bg-slate-900/80 w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
                                Calculando projeção futura...
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Flashcards como Medidas e Indicadores */}
            {flashcardIndicators.totalCards > 0 && (
                <div className="glass p-5 rounded-2xl border border-amber-500/20 bg-amber-950/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <BookOpen size={18} className="text-amber-400" />
                        </div>
                        <div>
                            <div className="text-sm font-black text-white tracking-tight">Flashcards — Medidas & Indicadores</div>
                            <div className="text-[10px] text-amber-400/80 uppercase tracking-widest">Repetição Espaçada (SRS) • Volume, Precisão e Due</div>
                        </div>
                        <div className="ml-auto text-right text-xs">
                            <span className="font-black text-amber-300">{flashcardIndicators.totalDecks}</span> <span className="text-slate-400">decks</span> · <span className="font-black text-white">{flashcardIndicators.totalCards}</span> <span className="text-slate-400">cartões</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3">
                            <div className="text-[10px] uppercase text-slate-500 tracking-widest">Revisões Totais</div>
                            <div className="text-2xl font-black text-amber-300 mt-1">{flashcardIndicators.totalReviews}</div>
                        </div>
                        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3">
                            <div className="text-[10px] uppercase text-slate-500 tracking-widest">Domínio (Mastery)</div>
                            <div className="text-2xl font-black text-emerald-400 mt-1">{flashcardIndicators.masteryPct}<span className="text-base align-super">%</span></div>
                        </div>
                        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3">
                            <div className="text-[10px] uppercase text-slate-500 tracking-widest">Pendentes Hoje</div>
                            <div className={`text-2xl font-black mt-1 ${flashcardIndicators.dueToday > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>{flashcardIndicators.dueToday}</div>
                            <div className="text-[10px] text-slate-500">cartões para revisar</div>
                        </div>
                        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex items-center">
                            <div>
                                <div className="text-[10px] uppercase text-slate-500 tracking-widest mb-1">Ação Recomendada</div>
                                {flashcardIndicators.dueToday > 0 ? (
                                    <div className="text-sm font-bold text-orange-300">Revisar {flashcardIndicators.dueToday} cartões hoje</div>
                                ) : (
                                    <div className="text-sm font-bold text-emerald-400">Tudo em dia — bom trabalho!</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mini Previsão de Vencimentos */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                        <DueForecast decks={flashcardDecks} horizon={7} compact />
                    </div>
                </div>
            )}

            <MonteCarloConfig
                show={showConfig}
                onClose={() => setShowConfig(false)}
                targetScore={targetScore}
                setTargetScore={handleSetTargetScore}
                equalWeightsMode={equalWeightsMode}
                setEqualWeightsMode={setEqualWeightsMode}
                getEqualWeights={getEqualWeights}
                setWeights={setWeights}
                weights={weights}
                updateWeight={updateWeight}
                categories={safeCategories}
                historicalCutoffs={historicalCutoffs}
                setHistoricalCutoffs={setHistoricalCutoffs}
                minScore={minScore}
                maxScore={maxScore}
                user={user}
            />

            {/* Subject Consistency Breakdown - Full Width */}
            <div className="glass col-span-1 lg:col-span-4 p-6 mt-2">
                <div className="flex items-center gap-2 mb-6 text-slate-400">
                    <Activity size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Detalhe da Consistência por Matéria</h3>
                    {stats.categoryBreakdown.length > 0 && (
                        <span className="ml-auto text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                            {stats.categoryBreakdown.length} matéria{stats.categoryBreakdown.length > 1 ? 's' : ''} analisada{stats.categoryBreakdown.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <SubjectBreakdownTable categoryBreakdown={stats.categoryBreakdown} maxScore={maxScore} />
            </div>
        </div>
    );
}

