import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, ShieldCheck, HelpCircle, Activity, AlertCircle, Settings2, Plus, RotateCcw } from 'lucide-react';
import MonteCarloGauge from './MonteCarloGauge';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { useAppStore } from '../store/useAppStore';
import { analyzeProgressState } from '../utils/ProgressStateEngine';
import { getSafeScore } from '../utils/scoreHelper';
import { calculateSlope } from '../engine';
import { getDateKey, normalizeDate } from '../utils/dateHelper';

const InfoTooltip = React.memo(({ text }) => (
    <div className="relative group/tooltip inline-block ml-auto z-10">
        <HelpCircle size={14} className="text-slate-600 hover:text-purple-400 transition-colors cursor-help" />
        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl text-xs text-slate-300 shadow-2xl opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none z-[9999] text-right">
            {text}
        </div>
    </div>
));

const ForecastCard = React.memo(({ prediction, status, subtext, targetScore, trend, hasEnoughData }) => (
    <div className={`glass h-full p-4 rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group hover:bg-black/40 transition-colors shadow-2xl overflow-hidden ${status === 'excellence' || status === 'good' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]' :
        status === 'warning' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]' :
            'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]'
        }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-3xl rounded-full pointer-events-none group-hover:from-blue-500/20 group-hover:via-purple-500/20 transition-all duration-700" />
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border bg-opacity-20 flex items-center justify-center ${status === 'excellence' || status === 'good' ? 'bg-purple-500/20 border-purple-500/30' : status === 'warning' ? 'bg-red-500/20 border-red-500/30' : 'bg-blue-500/20 border-blue-500/30'}`}>
                    <Target size={18} className={status === 'excellence' || status === 'good' ? "text-purple-400" : status === 'warning' ? "text-red-400" : "text-blue-400"} />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    Previsão IA
                    {trend !== 'stable' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                </span>
            </div>
        </div>
        <div className="text-center my-4 relative z-10 pb-1">
            <h2 className={`text-base sm:text-lg md:text-[22px] font-black leading-tight whitespace-nowrap ${status === 'excellence' || status === 'good' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-500' :
                status === 'warning' ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500' :
                    'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500'
                }`}>
                {prediction}
            </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full mb-3 relative z-10">
            <div className="bg-black/50 p-2 sm:p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-black/70 transition-colors">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Meta</span>
                <div className="flex items-baseline gap-0.5">
                    <span className="text-sm sm:text-base font-black text-slate-200">{targetScore ?? 90}</span>
                    <span className="text-[10px] text-slate-500 font-bold">%</span>
                </div>
            </div>
            <div className="bg-black/50 p-2 sm:p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-black/70 transition-colors">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter md:tracking-wider mb-1">Tendência</span>
                <div className="flex items-center gap-1.5">
                    {hasEnoughData ? (
                        <>
                            {trend === 'up' && <TrendingUp size={14} className="text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />}
                            {trend === 'down' && <TrendingDown size={14} className="text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />}
                            {trend === 'stable' && <Minus size={14} className="text-slate-500" />}
                            <span className="text-[11px] sm:text-xs font-black text-slate-200 uppercase">
                                {trend === 'up' ? 'Alta' : trend === 'down' ? 'Baixa' : 'Estável'}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">Pendente</span>
                    )}
                </div>
            </div>
        </div>
        <div className="mt-auto pt-3 border-t border-white/10 relative z-10">
            <p className="text-[10px] text-slate-400 text-center leading-relaxed font-semibold">
                {subtext}
            </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50 overflow-hidden">
            <div className={`h-full w-1/3 rounded-full opacity-70 move-right-anim ${status === 'excellence' || status === 'good' ? 'bg-purple-500' : status === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`} />
        </div>
    </div>
));

const ConsistencyCard = React.memo(({ consistency }) => (
    <div className={`glass h-full p-4 rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group hover:bg-black/40 transition-colors shadow-2xl ${consistency.bgBorder}`}>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border bg-opacity-20 ${consistency.color.replace('text-', 'bg-')}/20 ${consistency.bgBorder}`}>
                    <Activity size={18} className={consistency.color} />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Consistência</span>
            </div>
        </div>
        <div className="text-center my-4 relative z-10">
            <h2 className={`text-lg md:text-xl font-black leading-tight ${consistency.color} drop-shadow-md`}>
                {consistency.status}
            </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full mb-3">
            <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Desvio Padrão</span>
                <span className={`text-sm font-black ${consistency.status !== 'Dados Insuficientes' ? consistency.color : 'text-slate-500'}`}>
                    {consistency.status !== 'Dados Insuficientes' && !isNaN(parseFloat(consistency.sd)) ? `±${consistency.sd}%` : '---'}
                </span>
            </div>
            <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Diagnóstico</span>
                <span className="text-xs font-bold text-slate-200 text-center leading-tight line-clamp-2 px-1">
                    {consistency.status === 'Dados Insuficientes' ? 'Pendente' :
                        (['EXCELENTE', 'EM EVOLUÇÃO'].includes(consistency.status) ? 'Alta Estabilidade' :
                            (['EM QUEDA', 'INSTÁVEL'].includes(consistency.status) ? 'Alta Variação' : 'Variação Média'))}
                </span>
            </div>
        </div>
        <div className="mt-auto pt-2 border-t border-white/10">
            <p className="text-[10px] text-slate-300 text-center leading-relaxed font-medium">
                {consistency.message}
            </p>
        </div>
    </div>
));

const CategoryRow = React.memo(({ cat, idx, maxSdVal }) => {
    const safeMaxSdVal = Math.max(1e-6, Number(maxSdVal) || 0);
    const sdNum = Number.isFinite(parseFloat(cat.sd)) ? parseFloat(cat.sd) : 0;
    // BUG-26 FIX: Evitar NaN/Infinity quando maxSdVal é 0
    const barWidth = maxSdVal === 0 ? 100 : Math.max(0, 100 - (sdNum / safeMaxSdVal) * 100);
    const deltaNum = Number.isFinite(parseFloat(cat.delta)) ? parseFloat(cat.delta) : 0;
    const safeColor = typeof cat.color === 'string' ? cat.color : 'text-slate-400';
    const safeBgBorder = typeof cat.bgBorder === 'string' ? cat.bgBorder : 'border-slate-500/30';
    const sdBarColor = safeColor.replace('text-', 'bg-');
    const sdBarGlow = safeColor.replace('text-', 'shadow-') + '/30';

    return (
        <div className={`grid grid-cols-[1fr_auto_80px] md:grid-cols-12 gap-2 px-3 py-2.5 rounded-xl items-center transition-all duration-300 hover:bg-white/[0.03] overflow-hidden ${idx % 2 === 0 ? 'bg-black/10' : ''}`}>
            <div className="col-span-1 md:col-span-3 flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${safeBgBorder.replace('border-', 'bg-').replace('/30', '')}`} />
                <span className="text-sm font-bold text-slate-200 truncate">{cat.name}</span>
            </div>
            <div className="flex justify-center md:col-span-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${safeColor} ${safeBgBorder} bg-black/40`}>
                    {cat.status}
                </span>
            </div>
            <div className="flex items-center gap-2 md:col-span-4 min-w-0">
                <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                    <div className={`h-full rounded-full ${sdBarColor} shadow-md ${sdBarGlow} transition-all duration-700 ease-out`} style={{ width: `${barWidth}%`, minWidth: barWidth > 0 ? '4px' : '0' }} />
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${Math.min(100, (5 / safeMaxSdVal) * 100)}%` }} title="SD=5" />
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${Math.min(100, (15 / safeMaxSdVal) * 100)}%` }} title="SD=15" />
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
            <div className="hidden md:flex md:col-span-2 flex-col justify-center gap-0.5 min-w-0 pr-1">
                {cat.villains && cat.villains.length > 0 ? (
                    cat.villains.slice(0, 2).map((v) => (
                        <div key={v.name} className="relative flex items-center justify-center text-[12px] leading-tight min-h-[14px]">
                            <span className="text-slate-400 truncate max-w-[70px] font-semibold text-center" title={v.name}>{v.name.length > 15 ? v.name.substring(0, 14) + '…' : v.name}</span>
                            <span className="absolute right-0 text-red-400 font-mono font-black text-[12px]">±{v.sd.toFixed(0)}</span>
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
        <div className="text-center text-slate-500 py-4 text-sm">É necessário realizar pelo menos 2 simulados em cada matéria para gerar o diagnóstico individual.</div>
    );

    const maxSdVal = Math.max(0.25 * maxScore, ...categoryBreakdown.map(c => c.rawSd || 0));

    return (
        <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[1fr_auto_80px] md:grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-normal border-b border-white/5 mb-1 overflow-hidden">
                <div className="md:col-span-3">Matéria</div>
                <div className="text-center md:col-span-2">Status</div>
                <div className="text-center md:col-span-4">Desvio Padrão (SD)</div>
                <div className="hidden md:block md:col-span-1 text-center">Δ</div>
                <div className="hidden md:block md:col-span-2 text-center">Vilões</div>
            </div>
            {categoryBreakdown.map((cat, idx) => (
                <CategoryRow key={cat.name} cat={cat} idx={idx} maxSdVal={maxSdVal} />
            ))}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-[9px] font-black uppercase tracking-widest text-slate-500 pt-4 border-t border-white/5 opacity-60">
                {[
                    { color: 'bg-purple-500', label: 'SD ≤ 5' },
                    { color: 'bg-blue-500', label: 'SD ≤ 10' },
                    { color: 'bg-orange-500', label: 'SD ≤ 15' },
                    { color: 'bg-red-400', label: 'SD ≤ 25' },
                    { color: 'bg-red-600', label: 'SD > 25' }
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

export default function VerifiedStats({ categories = [], user }) {
    const maxScore = useMemo(() => {
        const scores = categories.map(c => c.maxScore).filter(s => typeof s === 'number' && s > 0);
        return scores.length > 0 ? Math.max(...scores) : 100;
    }, [categories]);

    // Lifted State for Target Score (Shared between Prediction Card and Monte Carlo Gauge)
    const [targetScore, setTargetScore] = React.useState(() => {
        const userTarget = parseFloat(user?.targetProbability);
        return !isNaN(userTarget) ? userTarget : 70;
    });

    // B-06 FIX: Adicionar trava de round-trip para evitar resets durante sincronização assíncrona
    const pendingLocalSave = React.useRef(false);

    // B-06 FIX: Sincronização Robusta com Trava de Round-trip
    const storeTarget = user?.targetProbability;
    React.useEffect(() => {
        const parsedStore = parseFloat(storeTarget);
        if (isNaN(parsedStore)) return;

        // Se estamos aguardando um salvamento local
        if (pendingLocalSave.current) {
            // SÓ abrimos o cadeado quando a Store refletir o novo valor
            if (Math.abs(parsedStore - targetScore) < 0.01) {
                pendingLocalSave.current = false;
            }
            // Enquanto o cadeado estiver fechado, ignoramos o que vem da Store
            return;
        }

        // Se o cadeado está aberto e o valor da Store mudou (ex: vindo de outro dispositivo)
        if (Math.abs(parsedStore - targetScore) > 0.01) {
            setTargetScore(parsedStore);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeTarget]); // O segredo é monitorar a Store, mas respeitar a trava
    const [showConfig, setShowConfig] = React.useState(false);
    const [showSubjects, setShowSubjects] = React.useState(false);

    // Performance Fix: Debounce targetScore for the heavy 'stats' calculation
    const [statsTarget, setStatsTarget] = React.useState(targetScore);
    React.useEffect(() => {
        const timer = setTimeout(() => setStatsTarget(targetScore), 300);
        return () => clearTimeout(timer);
    }, [targetScore]);

    const activeId = useAppStore(state => state.appState.activeId);
    const weights = useAppStore(state => state.appState.contests[activeId]?.mcWeights || null);
    const setWeights = useAppStore(state => state.setMonteCarloWeights);
    const equalWeightsMode = useAppStore(state => !!state.appState.mcEqualWeights);
    const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

    const getEqualWeights = React.useCallback(() => {
        if (categories.length === 0) return {};
        const newWeights = {};
        categories.forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
        });
        return newWeights;
    }, [categories]);

    const updateWeight = React.useCallback((catId, value) => {
        const numeric = parseInt(value, 10);
        const sanitize = isNaN(numeric) ? 0 : Math.max(0, Math.min(999, numeric));
        const updatedWeights = { ...(weights || {}), [catId]: sanitize };
        setWeights(updatedWeights);
    }, [weights, setWeights]);


    // Save to LocalStorage and Store whenever it changes
    const setUserData = useAppStore(state => state.setData);

    React.useEffect(() => {
        const parsed = Number(targetScore);
        if (!Number.isFinite(parsed) || isNaN(parsed)) return;

        // Se o valor local já é igual ao da Store, não fazemos nada
        const currentStoreTarget = parseFloat(storeTarget);
        if (Number.isFinite(currentStoreTarget) && Math.abs(parsed - currentStoreTarget) <= 0.01) return;

        // Ativa a trava: "Não aceite valores da Store até que eu termine de salvar"
        pendingLocalSave.current = true;

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
            
            // REMOVEMOS o 'pendingLocalSave.current = false' daqui!
            // A trava agora só abre no useEffect lá de cima, quando o dado voltar.
        }, 800);

        return () => clearTimeout(timer);
    }, [targetScore, setUserData, storeTarget]);

    const stats = useMemo(() => {
        let allHistory = [];
        let totalQuestionsGlobal = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Flatten history for global regression
                cat.simuladoStats.history.forEach(h => {
                    const safeScore = getSafeScore(h, maxScore);
                    const parsedDate = normalizeDate(h.date);
                    if (parsedDate && safeScore >= 0) {
                        allHistory.push({
                            date: parsedDate.getTime(),
                            score: safeScore,
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
            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = { scoreSum: 0, weightSum: 0, date: h.date };
            }
            // Weight by volume to favor "representative" days
            const weight = Math.max(1, Number(h.totalQuestions) || 1);
            dailyMap[dateStr].scoreSum += (Number(h.score) * weight);
            dailyMap[dateStr].weightSum += weight;
        });

        const dailyHistory = Object.values(dailyMap)
            .map(d => ({ date: getDateKey(new Date(d.date)), score: d.scoreSum / d.weightSum }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 1. Progress State Analysis (using ProgressStateEngine)
        // Run on global daily average for consistent trend
        const globalAnalysis = analyzeProgressState(dailyHistory, {
            window_size: Math.min(5, dailyHistory.length),
            stagnation_threshold: 4.0,
            low_level_limit: 60,
            high_level_limit: statsTarget,
            mastery_limit: statsTarget,
            maxScore
        });

        // Map to UI-compatible format
        const hasEnoughData = dailyHistory.length >= 3;
        // D-02 FIX: Unificar unidades. PSE retorna pp/sessão. Multiplicamos por 30 (pp/30d) 
        // para alinhar com o Coach e threshold de 0.5.
        const trend30d = globalAnalysis.trend_slope * 30;
        const trend = !hasEnoughData ? 'insufficient' :
            (trend30d > 0.5 ? 'up' :
                trend30d < -0.5 ? 'down' : 'stable');
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
            // Get recent average (last 5 for better stability)
            const recentHistory = dailyHistory.slice(-5);
            const currentAvg = recentHistory.reduce((a, b) => a + b.score, 0) / recentHistory.length;

            // Determine Target dynamically IF user is already above their target
            if (currentAvg >= userTarget) {
                calculatedTarget = maxScore;
            }

            // Use the shared Weighted Regression engine function for total consistency with Monte Carlo Dashboard
            // ensure format is valid (dailyHistory already has { date: number(ms), score: number })
            let slope = calculateSlope(dailyHistory, maxScore);
            // Engine clamps properly internally, but we can do a hard limit just to be absolutely safe for dates.
            slope = Math.max(-2.0, Math.min(2.0, slope));

            // ANTIGRAVITY PREDICTION ENGINE 🚀
            const currentScore = currentAvg;
            const target = calculatedTarget;
            const distance = target - currentScore;

            if (distance <= 0 || currentScore >= target) {
                prediction = "Meta Atingida!";
                predictionSubtext = "Rumo aos 100%!";
                predictionStatus = "excellence";
            } else {
                const weeklyBaseSpeed = slope * 7;

                if (weeklyBaseSpeed <= 0.01) {
                    prediction = "Estagnado/Queda";
                    predictionSubtext = "Melhore sua tendência diária para gerar previsão.";
                    predictionStatus = "warning";
                } else {
                    // D-04 FIX: Curva contínua de dificuldade em vez de steps arbitrários.
                    // f(50%)=0.90, f(70%)=0.80, f(80%)=0.74, f(95%)=0.64
                    // Mais justa: não corta 40% da velocidade abruptamente em 80%.
                    // B-07 FIX: Fator linear: penalidade proporcional desde o início
                    // f(0)=1.0, f(50)=0.75, f(80)=0.60, f(100)=0.50
                    const difficultyFactor = Math.max(0.40, 1 - 0.5 * (currentScore / maxScore));

                    let quality = 0.8;
                    const dailyScoresList = dailyHistory.map(h => h.score);
                    const dailyMean = dailyScoresList.reduce((a, b) => a + b, 0) / dailyScoresList.length;
                    const dailyVar = dailyScoresList.reduce((a, b) => a + Math.pow(b - dailyMean, 2), 0) / (dailyScoresList.length - 1 || 1);
                    const dailySD = Math.sqrt(dailyVar);

                    quality = Math.max(0.5, 1 - (dailySD / (0.40 * maxScore)));

                    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
                    const adjustedSpeed = safe(weeklyBaseSpeed * difficultyFactor * quality);

                    // DIV-01 FIX: Prevenir divisão por zero ou velocidade negativa absurda
                    const weeksEstimated = adjustedSpeed > 0.001 ? (distance / adjustedSpeed) : 999;
                    const daysEstimated = weeksEstimated * 7;

                    if (daysEstimated > 365 * 2) {
                        prediction = "Longo Prazo";
                        predictionSubtext = `Continue firme. O caminho é longo.`;
                    } else {
                        const nowTime = new Date().getTime();

                        // FIX Bug 2: Margin calculated via error propagation
                        // σ_days = σ_scores / pointsPerDay
                        const pointsPerDay = adjustedSpeed / 7;
                        const sdDays = pointsPerDay > 0.001 ? (dailySD / pointsPerDay) : 0;

                        // Limit margin to 50% of total time to avoid explosive intervals
                        const sigmaLimit = daysEstimated * 0.5;
                        const margin = Math.min(safe(sdDays), sigmaLimit);

                        const daysMin = Math.max(1, daysEstimated - margin);
                        const daysMax = daysEstimated + margin;

                        const dateMin = new Date(nowTime + (daysMin * 24 * 60 * 60 * 1000));
                        const dateMax = new Date(nowTime + (daysMax * 24 * 60 * 60 * 1000));

                        const fmt = (d) => isNaN(d.getTime()) ? "--/--" : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

                        prediction = `${fmt(dateMin)} - ${fmt(dateMax)}`;
                        predictionSubtext = `Previsão de alcance (${target}%)`;
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
            icon: <AlertTriangle size={20} />,
            message: "Amostra muito pequena."
        };

        if (totalQuestionsGlobal > 200 || nExams > 20) {
            confidenceData = {
                level: 'ALTA',
                color: 'text-green-400',
                bgBorder: 'border-green-500',
                icon: <ShieldCheck size={20} />,
                message: "Dados estatisticamente relevantes."
            };
        } else if (totalQuestionsGlobal > 50 || nExams > 5) {
            confidenceData = {
                level: 'MÉDIA',
                color: 'text-blue-400',
                bgBorder: 'border-blue-500',
                icon: <HelpCircle size={20} />,
                message: "Margem de erro diminuindo."
            };
        }

        // 4. Progress State Analysis per Category (using ProgressStateEngine)
        let consistency = {
            status: 'Dados Insuficientes',
            color: 'text-slate-400',
            bgBorder: 'border-slate-500',
            icon: <Minus size={20} />,
            message: "Mínimo 2 simulados em cada matéria.",
            delta: 0,
            sd: 0
        };

        const categoryBreakdown = [];
        const categoryAnalyses = [];

        // State to UI mapping
        const stateMap = {
            mastery: { status: 'DOMÍNIO', color: 'text-green-400', bgBorder: 'border-green-500/30', icon: <ShieldCheck size={20} /> },
            stagnation_negative: { status: 'ESTAGNADO BAIXO', color: 'text-red-400', bgBorder: 'border-red-500/30', icon: <AlertTriangle size={20} /> },
            stagnation_neutral: { status: 'ESTAGNADO MÉDIO', color: 'text-blue-400', bgBorder: 'border-blue-500/30', icon: <AlertCircle size={20} /> },
            stagnation_positive: { status: 'EXCELENTE', color: 'text-violet-400', bgBorder: 'border-violet-500/30', icon: <ShieldCheck size={20} /> },
            progression: { status: 'EM EVOLUÇÃO', color: 'text-blue-400', bgBorder: 'border-blue-500/30', icon: <TrendingUp size={20} /> },
            regression: { status: 'EM QUEDA', color: 'text-red-400', bgBorder: 'border-red-500/30', icon: <TrendingDown size={20} /> },
            unstable: { status: 'INSTÁVEL', color: 'text-orange-400', bgBorder: 'border-orange-500/30', icon: <Activity size={20} /> },
            insufficient_data: { status: 'SEM DADOS', color: 'text-slate-400', bgBorder: 'border-slate-500/30', icon: <Minus size={20} /> }
        };

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length >= 2) {
                // BUG FIX 98: Sort history by date to ensure chronological order for trend analysis
                const sortedHistory = [...cat.simuladoStats.history]
                    .filter(h => h.date && normalizeDate(h.date) !== null)
                    .sort((a, b) => (normalizeDate(a.date)?.getTime() ?? 0) - (normalizeDate(b.date)?.getTime() ?? 0));

                const analysisHistory = sortedHistory.slice(-5).map(h => ({
                    score: getSafeScore(h, maxScore),
                    date: h.date
                }));

                const analysis = analyzeProgressState(analysisHistory, {
                    window_size: Math.min(5, analysisHistory.length),
                    stagnation_threshold: 4.0,
                    low_level_limit: 60,
                    high_level_limit: statsTarget,
                    mastery_limit: statsTarget,
                    maxScore
                });

                categoryAnalyses.push(analysis);

                const uiState = stateMap[analysis.state] || stateMap.insufficient_data;
                const sd = Math.sqrt(analysis.variance);

                // --- TOPIC VARIATION ANALYSIS (Synchronized with recent window) ---
                const topicMap = {};
                const recentHistoryForTopics = sortedHistory.slice(-10); // Analyze recent stability
                recentHistoryForTopics.forEach(h => {
                    if (h.topics) {
                        h.topics.forEach(t => {
                            let total = Number(t.total) || 0;
                            const isSynthetic = total === 0 && t.score != null;
                            if (isSynthetic) total = 100; // Synthetic total for percentage-only inputs

                            const correct = (t.isPercentage && t.score != null && total > 0)
                                ? Math.round((Math.min(maxScore, Math.max(0, Number(t.score))) / maxScore) * total)
                                : (Number(t.correct) || 0);

                            if (total > 0) {
                                const topicScore = (correct / total) * maxScore;
                                if (!topicMap[t.name]) topicMap[t.name] = [];
                                topicMap[t.name].push(topicScore);
                            }
                        });
                    }
                });

                const unstableTopics = [];
                Object.entries(topicMap).forEach(([tName, tScores]) => {
                    if (tScores.length >= 2) {
                        const tMean = tScores.reduce((a, b) => a + b, 0) / tScores.length;
                        const tVar = tScores.reduce((a, b) => a + Math.pow(b - tMean, 2), 0) / (tScores.length - 1);
                        const tSD = Math.sqrt(tVar);
                        if (tSD > 0.10 * maxScore) {
                            unstableTopics.push({ name: tName, sd: tSD });
                        }
                    }
                });

                unstableTopics.sort((a, b) => b.sd - a.sd);
                const villains = unstableTopics.slice(0, 3);

                categoryBreakdown.push({
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
        const statePriority = { regression: 0, stagnation_negative: 1, unstable: 2, stagnation_neutral: 3, progression: 4, stagnation_positive: 5 };
        categoryBreakdown.sort((a, b) => (statePriority[a.state] || 6) - (statePriority[b.state] || 6));

        // Consolidate for Global Card
        if (categoryAnalyses.length > 0) {
            const avgDelta = categoryAnalyses.reduce((a, b) => a + b.delta, 0) / categoryAnalyses.length;
            const avgSD = Math.sqrt(categoryAnalyses.reduce((a, b) => a + (Number(b.variance) || 0), 0) / categoryAnalyses.length);

            // D-03 FIX: Usar MEDIANA dos estados em vez da pior matéria.
            // Antes, 1 matéria em queda deixava o card global vermelho mesmo com 4/5 indo bem.
            const stateScores = {
                regression: 0, stagnation_negative: 1, unstable: 2,
                stagnation_neutral: 3, progression: 4, stagnation_positive: 5, mastery: 6
            };
            const stateValues = categoryBreakdown.map(c => stateScores[c.state] ?? 3);
            stateValues.sort((a, b) => a - b);
            const medianValue = stateValues[Math.floor(stateValues.length / 2)];
            const medianState = Object.entries(stateScores).find(([, v]) => v === medianValue)?.[0] || 'unstable';
            const uiState = stateMap[medianState] || stateMap.insufficient_data;

            consistency = {
                status: uiState.status,
                color: uiState.color,
                bgBorder: uiState.bgBorder,
                icon: uiState.icon,
                message: categoryBreakdown[0].message,
                delta: avgDelta.toFixed(2),
                sd: avgSD.toFixed(2)
            };
        }

        return { hasEnoughData, trend, trendValue, prediction, predictionStatus, predictionSubtext, confidenceData, totalQuestionsGlobal, consistency, categoryBreakdown, targetScore: statsTarget };
    }, [categories, statsTarget, maxScore]);

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
                />
                <ConsistencyCard consistency={stats.consistency} />
            </div>

            {/* Bottom Row: Monte Carlo Side-by-Side */}
            <div className="mt-4 mb-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-6 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5">
                            <Activity size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight leading-none mb-1.5">Simulação de Monte Carlo</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Análise de Probabilidade de Aprovação</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowConfig(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-slate-800/50 hover:bg-slate-700/80 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all shadow-lg active:scale-95"
                    >
                        <Settings2 size={14} />
                        Configurar Pesos e Meta
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <MonteCarloGauge
                        categories={categories}
                        goalDate={user?.goalDate}
                        targetScore={targetScore}
                        onTargetScoreChange={setTargetScore}
                        forcedMode="today"
                        forcedTitle="Status Atual"
                        maxScore={maxScore}
                        syncShowSubjects={showSubjects}
                        onSyncShowSubjects={setShowSubjects}
                    />
                    <MonteCarloGauge
                        categories={categories}
                        goalDate={user?.goalDate}
                        targetScore={targetScore}
                        onTargetScoreChange={setTargetScore}
                        forcedMode="future"
                        forcedTitle="Projeção Futura"
                        maxScore={maxScore}
                        syncShowSubjects={showSubjects}
                        onSyncShowSubjects={setShowSubjects}
                    />
                </div>
            </div>

            <MonteCarloConfig
                show={showConfig}
                onClose={() => setShowConfig(false)}
                targetScore={targetScore}
                setTargetScore={setTargetScore}
                equalWeightsMode={equalWeightsMode}
                setEqualWeightsMode={setEqualWeightsMode}
                getEqualWeights={getEqualWeights}
                setWeights={setWeights}
                weights={weights}
                updateWeight={updateWeight}
                categories={categories}
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
