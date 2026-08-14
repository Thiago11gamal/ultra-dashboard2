# Código Completo do Menu Estatística

Este documento consolida todos os arquivos-fonte que compõem o ecossistema do **Menu Estatística** (página principal, painel de estatísticas verificadas, velocímetro de Monte Carlo, previsão de flashcards, gráficos analíticos de foco, horas e retenção, hooks de cálculo e motores estatísticos).

---

## 📑 Índice de Arquivos

1. [`src/pages/Stats.jsx`](#src-pages-stats-jsx)
2. [`src/components/VerifiedStats.jsx`](#src-components-verifiedstats-jsx)
3. [`src/components/WeeklyAnalysis.jsx`](#src-components-weeklyanalysis-jsx)
4. [`src/components/MonteCarloGauge.jsx`](#src-components-montecarlogauge-jsx)
5. [`src/components/charts/MonteCarloConfig.jsx`](#src-components-charts-montecarloconfig-jsx)
6. [`src/components/DueForecast.jsx`](#src-components-dueforecast-jsx)
7. [`src/components/charts/DueForecastChart.jsx`](#src-components-charts-dueforecastchart-jsx)
8. [`src/components/charts/Analytics/EvolucaoFocoChart.jsx`](#src-components-charts-analytics-evolucaofocochart-jsx)
9. [`src/components/charts/Analytics/HorasDisciplinaChart.jsx`](#src-components-charts-analytics-horasdisciplinachart-jsx)
10. [`src/components/charts/Analytics/AnaliseRetencaoChart.jsx`](#src-components-charts-analytics-analiseretencaochart-jsx)
11. [`src/components/charts/GaussianPlot.jsx`](#src-components-charts-gaussianplot-jsx)
12. [`src/hooks/useMonteCarloStats.js`](#src-hooks-usemontecarlostats-js)
13. [`src/utils/chartDataMappers.js`](#src-utils-chartdatamappers-js)
14. [`src/utils/ProgressStateEngine.js`](#src-utils-progressstateengine-js)
15. [`src/utils/analytics.js`](#src-utils-analytics-js)
16. [`src/engine/analyticsStats.js`](#src-engine-analyticsstats-js)

---

## `src/pages/Stats.jsx`

<a id="src-pages-stats-jsx"></a>

```jsx
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { EvolucaoFocoChart } from '../components/charts/Analytics/EvolucaoFocoChart';
import { HorasDisciplinaChart } from '../components/charts/Analytics/HorasDisciplinaChart';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
const EMPTY_ARRAY = Object.freeze([]);

export default function Stats() {
    const { rawCategories, rawStudyLogs, rawFlashcards, user } = useAppStore(useShallow(state => {
        const contests = state?.appState?.contests || {};
        const activeId = state?.appState?.activeId;
        const contest = contests[activeId] || {};
        return {
            rawCategories: contest.categories,
            rawStudyLogs: contest.studyLogs,
            rawFlashcards: contest.flashcardDecks,
            user: contest.user || null
        };
    }));

    const studyLogs = useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);

    const categories = useMemo(() => {
        return Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
    }, [rawCategories]);

    const flashcardDecks = useMemo(() => {
        return Array.isArray(rawFlashcards) ? rawFlashcards : Object.values(rawFlashcards || {});
    }, [rawFlashcards]);

    const focusData = useMemo(() => mapFocusEvolutionData(studyLogs), [studyLogs]);
    const subjectData = useMemo(() => mapSubjectHoursData(studyLogs, categories), [studyLogs, categories]);

    // 🎯 FIX LÓGICO: Gráficos de analytics precisam de logs, simulados ou flashcards para serem montados
    const hasStudyLogs = studyLogs.length > 0;
    const hasSimuladoHistory = useMemo(() => {
        return Array.isArray(categories) && categories.some(category => {
            const h = category?.simuladoStats?.history;
            return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
        });
    }, [categories]);
    const hasFlashcards = useMemo(() => {
        return Array.isArray(flashcardDecks) && flashcardDecks.some(d => (d.cards || []).length > 0);
    }, [flashcardDecks]);

    const hasData = hasStudyLogs || hasSimuladoHistory || hasFlashcards;

    return (
        <PageErrorBoundary pageName="Estatísticas">
            <div className="space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                                <span className="text-2xl">📊</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Estatísticas</h1>
                        </div>
                        <p className="text-slate-400 font-medium ml-2">Sua performance quantificada.</p>
                    </div>
                </div>

                {!hasData ? (
                    <div className="flex items-center justify-center min-h-[45vh] p-4">
                        <div className="glass p-8 sm:p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl max-w-md w-full">
                            <div className="text-5xl mb-4 opacity-80">📊</div>
                            <p className="font-black uppercase tracking-wider text-sm text-slate-200 mb-2">
                                Aguardando dados
                            </p>
                            <p className="text-xs text-slate-400 mb-0 leading-relaxed">
                                Registe horas de estudo, simulados ou flashcards para gerar relatórios e análises detalhadas.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {(hasSimuladoHistory || hasFlashcards) && <VerifiedStats categories={categories} user={user} flashcardDecks={flashcardDecks} />}

                        {!hasStudyLogs ? (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/30 text-center my-6">
                                <p className="text-xs font-semibold text-slate-400">
                                    Nenhuma sessão de estudo registrada. Registre horas de estudo para visualizar a Evolução do Foco e Análise Semanal.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Evolução do Foco</h2>
                                                <p className="text-[11px] text-slate-500 uppercase">Histórico de Horas Líquidas de Estudo</p>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <EvolucaoFocoChart data={focusData} />
                                        </div>
                                    </div>

                                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Concentração por Matéria</h2>
                                                <p className="text-[11px] text-slate-500 uppercase">Ranking de disciplinas por tempo investido</p>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <HorasDisciplinaChart data={subjectData} />
                                        </div>
                                    </div>
                                </div>

                                <WeeklyAnalysis studyLogs={studyLogs} categories={categories} />
                            </>
                        )}
                    </>
                )}
            </div>
        </PageErrorBoundary>
    );
}
```

---

## `src/components/VerifiedStats.jsx`

<a id="src-components-verifiedstats-jsx"></a>

```jsx
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, ShieldCheck, HelpCircle, Activity, AlertCircle, Settings2, Plus, RotateCcw, BookOpen } from 'lucide-react';
import MonteCarloGauge from './MonteCarloGauge';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { useAppStore } from '../store/useAppStore';
import { analyzeProgressState } from '../utils/ProgressStateEngine';
import { getSafeScore } from '../utils/scoreHelper';
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

// FIX 1.4: Mapa unificado de prioridade de estados (usado para sorting E para mediana)
const STATE_PRIORITY = { regression: 0, stagnation_negative: 1, unstable: 2, stagnation_neutral: 3, progression: 4, stagnation_positive: 5, mastery: 6 };

const EMPTY_ARRAY = Object.freeze([]);

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
                    {(trend === 'up' || trend === 'down') && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
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
                    <span className="text-sm sm:text-base font-black text-slate-200">{targetScore ?? 70}</span>
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
                <div className={`p-1.5 rounded-lg border bg-opacity-20 ${getColorClasses(consistency.color).bg20} ${consistency.bgBorder}`}>
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
                    {consistency.status !== 'Dados Insuficientes' && !isNaN(parseFloat(consistency.sd)) ? `±${consistency.sd}` : '---'}
                </span>
            </div>
            <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Diagnóstico</span>
                <span className="text-xs font-bold text-slate-200 text-center leading-tight line-clamp-2 px-1">
                    {consistency.status === 'Dados Insuficientes' ? 'Pendente' :
                        (['EXCELENTE', 'EM EVOLUÇÃO', 'DOMÍNIO'].includes(consistency.status) ? 'Alta Estabilidade' :
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

const CategoryRow = React.memo(({ cat, idx, maxSdVal, maxScore = 100 }) => {
    const safeMaxSdVal = Math.max(1e-6, Number(maxSdVal) || 0);
    const sdNum = Number.isFinite(parseFloat(cat.sd)) ? parseFloat(cat.sd) : 0;
    // BUG-26 FIX: Evitar NaN/Infinity quando maxSdVal é 0
    const barWidth = maxSdVal === 0 ? 100 : Math.max(0, 100 - (sdNum / safeMaxSdVal) * 100);
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
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${Math.min(100, (sd5Val / safeMaxSdVal) * 100)}%` }} title={`SD=${sd5Val}`} />
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${Math.min(100, (sd15Val / safeMaxSdVal) * 100)}%` }} title={`SD=${sd15Val}`} />
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
                    cat.villains.slice(0, 2).map((v) => (
                        <div key={v.name} className="flex items-center justify-between gap-1 text-[12px] leading-tight min-h-[14px] w-full min-w-0 px-1">
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
        <div className="text-center text-slate-500 py-4 text-sm">É necessário realizar pelo menos 2 simulados em cada matéria para gerar o diagnóstico individual.</div>
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
                <CategoryRow key={cat.name} cat={cat} idx={idx} maxSdVal={maxSdVal} maxScore={maxScore} />
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

    const maxScore = useMemo(() => {
        const scores = safeCategories.map(c => c.maxScore).filter(s => typeof s === 'number' && s > 0);
        return scores.length > 0 ? Math.max(...scores) : 100;
    }, [safeCategories]);

    const storeFlashcardDecks = useAppStore(state => {
        const activeId = state.appState?.activeId;
        const contest = state.appState?.contests?.[activeId] || {};
        const rawDecks = contest.flashcardDecks || [];
        return Array.isArray(rawDecks) ? rawDecks : Object.values(rawDecks || {});
    });
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
    const [targetScore, setTargetScore] = React.useState(() => {
        const userTarget = parseFloat(user?.targetProbability);
        return !isNaN(userTarget) ? userTarget : 70;
    });

    // B-06 FIX: Adicionar trava de round-trip para evitar resets durante sincronização assíncrona
    const pendingLocalSave = React.useRef(false);

    // FIX: Wrapper para setTargetScore que trava a sincronização IMEDIATAMENTE ao interagir,
    // evitando que o useEffect de leitura atropele o estado local antes do debounce salvar.
    const handleSetTargetScore = React.useCallback((newScore) => {
        pendingLocalSave.current = true;
        setTargetScore(newScore);
    }, []);

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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTargetScore(parsedStore);
        }
    }, [storeTarget, targetScore]);
    const [showConfig, setShowConfig] = React.useState(false);
    const [showSubjects, setShowSubjects] = React.useState(false);

    // Performance Fix: Debounce targetScore for the heavy 'stats' calculation
    const [statsTarget, setStatsTarget] = React.useState(targetScore);
    React.useEffect(() => {
        const timer = setTimeout(() => setStatsTarget(targetScore), 300);
        return () => clearTimeout(timer);
    }, [targetScore]);

    const activeId = useAppStore(state => state.appState?.activeId);
    const weights = useAppStore(state => state.appState?.contests?.[activeId]?.mcWeights || null);
    const setWeights = useAppStore(state => state.setMonteCarloWeights);
    const equalWeightsMode = useAppStore(state => !!state.appState?.mcEqualWeights);
    const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);
    const historicalCutoffs = useAppStore(state => state.appState?.contests?.[activeId]?.historicalCutoffs) || EMPTY_ARRAY;
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
        const parsed = Number(targetScore);
        if (!Number.isFinite(parsed) || isNaN(parsed)) return;

        // Se o valor local já é igual ao da Store, não fazemos nada
        const currentStoreTarget = parseFloat(storeTarget);
        if (Number.isFinite(currentStoreTarget) && Math.abs(parsed - currentStoreTarget) <= 0.01) return;

        // Ativa a trava: "Não aceite valores da Store até que eu termine de salvar"
        pendingLocalSave.current = true;
        // Fail-safe timeout para evitar deadlock permanente se a rede falhar ou houver imprecisão
        const safetyTimer = setTimeout(() => {
            pendingLocalSave.current = false;
        }, 3000);

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
    }, [targetScore, setUserData, storeTarget]);

    const baseHistoryStats = useMemo(() => {
        let allHistory = [];
        let totalQuestionsGlobal = 0;

        safeCategories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Flatten history for global regression
                const hArray = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history);
                hArray.forEach(h => {
                    const catMaxScore = Number(cat.maxScore) || maxScore;
                    const safeScore = getSafeScore(h, catMaxScore);
                    const parsedDate = normalizeDate(h.date);
                    if (parsedDate && safeScore >= 0) {
                        // CORREÇÃO: Normaliza para a escala global universal para evitar envenenamento de escalas (Bug 1.1 Fix)
                        const normalizedToGlobalScale = (safeScore / catMaxScore) * maxScore;

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
        const dayFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
        allHistory.forEach(h => {
            const parts = dayFormatter.format(new Date(h.date)).split('/');
            const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
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
                // BUG-01 FIX: Converte a string YYYY-MM-DD de volta para ms local para o motor (calculateSlope)
                // FIX 2.3: Usar normalizeDate para evitar shift de dia por ambiguidade UTC/local
                date: normalizeDate(getDateKey(new Date(d.date)))?.getTime() ?? d.date, 
                score: d.scoreSum / d.weightSum,
                weight: d.weightSum // BUG-01 FIX: Preservamos o volume para evitar Paradoxo de Simpson em médias posteriores
            }))
            .sort((a, b) => a.date - b.date);

        return { dailyHistory, allHistory, totalQuestionsGlobal, sortedCategories: safeCategories };
    }, [safeCategories, maxScore]);

    const stats = useMemo(() => {
        const { dailyHistory, allHistory, totalQuestionsGlobal, sortedCategories } = baseHistoryStats;

        // 1. Progress State Analysis (using ProgressStateEngine)
        // Run on global daily average for consistent trend
        const globalAnalysis = analyzeProgressState(dailyHistory, {
            window_size: Math.min(5, dailyHistory.length),
            stagnation_threshold: 4, // 4% do teto
            low_level_limit: 60,      // 60% do teto
            high_level_limit: statsTarget,
            mastery_limit: statsTarget,
            maxScore: maxScore
        });

        // Map to UI-compatible format
        const hasEnoughData = dailyHistory.length >= 3;
        // D-02 FIX: Unificar unidades. PSE retorna pp/sessão. Multiplicamos por 30 (pp/30d) 
        // para alinhar com o Coach e threshold de 0.5.
        const trend30d = globalAnalysis.trend_slope * 30;
        // Threshold relativo: 0.5% do teto por 30 dias, mínimo 0.5 absoluto para maxScore=100
        const trendThreshold = Math.max(0.5, 0.005 * maxScore);
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
            let slope = calculateSlope(dailyHistory, maxScore);
            // Engine clamps properly internally, but we can do a hard limit just to be absolutely safe for dates.
            const MAX_SLOPE = 0.004 * maxScore;
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
                const weeklyBaseSpeed = slope * 7;
                const speedThreshold = 0.0001 * maxScore;

                if (weeklyBaseSpeed <= speedThreshold) {
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
                    const totalDailyW = dailyHistory.reduce((acc, h) => acc + (h.weight || 1), 0);
                    const dailyMean = totalDailyW > 0 
                        ? dailyHistory.reduce((acc, h) => acc + h.score * (h.weight || 1), 0) / totalDailyW
                        : dailyHistory.reduce((a, h) => a + h.score, 0) / (dailyHistory.length || 1);
                    
                    const dailyVar = dailyHistory.length > 1 && totalDailyW > 1
                        ? dailyHistory.reduce((acc, h) => acc + (h.weight || 1) * Math.pow(h.score - dailyMean, 2), 0) / (totalDailyW - 1)
                        : (dailyHistory.length > 1 ? dailyHistory.reduce((a, h) => a + Math.pow(h.score - dailyMean, 2), 0) / (dailyHistory.length - 1) : 0);
                    const dailySD = Math.sqrt(dailyVar);

                    quality = Math.max(0.5, 1 - (dailySD / (0.40 * maxScore)));

                    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
                    const adjustedSpeed = safe(weeklyBaseSpeed * difficultyFactor * quality);

                    // DIV-01 FIX: Prevenir divisão por zero ou velocidade negativa absurda
                    const minSpeed = 0.00001 * maxScore;
                    const weeksEstimated = adjustedSpeed > minSpeed ? (distance / adjustedSpeed) : 999;
                    const daysEstimated = weeksEstimated * 7;

                    if (daysEstimated > 365 * 2) {
                        prediction = "Longo Prazo";
                        predictionSubtext = `Continue firme. O caminho é longo.`;
                    } else {
                        const nowTime = new Date().getTime();

                        // FIX Bug 2: Margin calculated via error propagation
                        // σ_days = σ_scores / pointsPerDay
                        const pointsPerDay = adjustedSpeed / 7;
                        const minPointsPerDay = 0.00001 * maxScore;
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
                        predictionSubtext = `Previsão de alcance (${target}${maxScore === 100 ? '%' : ` de ${maxScore}`})`;  // FIX 1.5: Unidade dinâmica
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
            message: "Mínimo 2 simulados em cada matéria.",
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
            if (hArray.length >= 2) {
                // BUG FIX 98: Sort history by date to ensure chronological order for trend analysis
                const sortedHistory = [...hArray]
                    .filter(h => h.date && normalizeDate(h.date) !== null)
                    .sort((a, b) => (normalizeDate(a.date)?.getTime() ?? 0) - (normalizeDate(b.date)?.getTime() ?? 0));

                const catMaxScore = Number(cat.maxScore) || maxScore;
                const analysisHistory = sortedHistory.slice(-5).map(h => ({
                    score: (getSafeScore(h, catMaxScore) / catMaxScore) * maxScore,
                    date: normalizeDate(h.date)?.getTime() ?? Date.now()
                }));

                const analysis = analyzeProgressState(analysisHistory, {
                    window_size: Math.min(5, analysisHistory.length),
                    stagnation_threshold: 4, // 4% do teto
                    low_level_limit: 60,      // 60% do teto
                    high_level_limit: statsTarget,
                    mastery_limit: statsTarget,
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

                            // CORREÇÃO: Usar getSafeScore para tratar percentuais e absolutos corretamente
                            const safeScore = getSafeScore(t, maxScore);

                            const correct = (safeScore >= 0 && total > 0)
                                ? Math.round((Math.min(maxScore, safeScore) / maxScore) * total)
                                : Math.min(total, (Number(t.correct) || 0)); // BUG-03 FIX: Limitar acertos ao total

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
                    if (tScores.length >= 3) {
                        const tMean = tScores.reduce((a, b) => a + b, 0) / tScores.length;
                        const tVar = tScores.reduce((a, b) => a + Math.pow(b - tMean, 2), 0) / (tScores.length - 1);
                        const tSD = Math.sqrt(Math.max(0, tVar));
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
        // FIX 1.4: Usar mapa unificado STATE_PRIORITY (inclui mastery)
        categoryBreakdown.sort((a, b) => (STATE_PRIORITY[a.state] ?? 6) - (STATE_PRIORITY[b.state] ?? 6));

        // Consolidate for Global Card
        if (categoryAnalyses.length > 0) {
            const avgDelta = categoryAnalyses.reduce((a, b) => a + b.delta, 0) / categoryAnalyses.length;
            const avgSD = Math.sqrt(Math.max(0, categoryAnalyses.reduce((a, b) => a + (Number(b.variance) || 0), 0) / categoryAnalyses.length));

            // D-03 FIX: Usar MEDIANA dos estados em vez da pior matéria.
            // Antes, 1 matéria em queda deixava o card global vermelho mesmo com 4/5 indo bem.
            // FIX 1.4: Usar STATE_PRIORITY unificado (constante extraída no topo do ficheiro)
            const stateValues = categoryBreakdown.map(c => STATE_PRIORITY[c.state] ?? 3);
            stateValues.sort((a, b) => a - b);
            const medIdx = Math.floor(stateValues.length / 2);
            const medianValue = stateValues[medIdx];
            const medianState = Object.entries(STATE_PRIORITY).find(([, v]) => v === medianValue)?.[0] || 'unstable';
            const uiState = stateMap[medianState] || stateMap.insufficient_data;
            const medianCat = categoryBreakdown.find(c => c.state === medianState) ?? categoryBreakdown[0];

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeCategories, statsTarget, maxScore]);

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
                        <span className="flex-1 text-center font-semibold tracking-wide">
                        Configurar Classificações e Meta
                    </span></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <MonteCarloGauge
                        categories={safeCategories}
                        goalDate={user?.goalDate}
                        targetScore={targetScore}
                        onTargetScoreChange={handleSetTargetScore}
                        forcedMode="today"
                        forcedTitle="Status Atual"
                        maxScore={maxScore}
                        syncShowSubjects={showSubjects}
                        onSyncShowSubjects={setShowSubjects}
                    />
                    <MonteCarloGauge
                        categories={safeCategories}
                        goalDate={user?.goalDate}
                        targetScore={targetScore}
                        onTargetScoreChange={handleSetTargetScore}
                        forcedMode="future"
                        forcedTitle="Projeção Futura"
                        maxScore={maxScore}
                        syncShowSubjects={showSubjects}
                        onSyncShowSubjects={setShowSubjects}
                    />
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
                minScore={0}
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
```

---

## `src/components/WeeklyAnalysis.jsx`

<a id="src-components-weeklyanalysis-jsx"></a>

```jsx
import React, { useMemo } from 'react';
import { BookOpen, Zap, Activity } from 'lucide-react';
import { normalizeDate, formatDuration, getDateKey, formatDatePtBR, APP_TIMEZONE } from '../utils/dateHelper';

export default function WeeklyAnalysis({ studyLogs = [], categories = [] }) {

    const logsArray = useMemo(() => Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {}), [studyLogs]);
    const categoriesArray = useMemo(() => Array.isArray(categories) ? categories : Object.values(categories || {}), [categories]);

    const { groups, stats } = useMemo(() => {
        if (!logsArray || logsArray.length === 0) return { groups: [], stats: null };

        // 1. Calculate Stats
        // BUGFIX: Alguns logs antigos/sincronizados usam `duration` em vez de `minutes`.
        // Sem fallback, cards e timeline subcontabilizam tempo no menu de Estatísticas.
        const getLogMinutes = (log) => Number(log?.minutes ?? log?.duration) || 0;
        const totalMinutes = logsArray.reduce((acc, log) => acc + getLogMinutes(log), 0);
        const totalSessions = logsArray.length;

        // Find top category
        const catCounts = {};
        logsArray.forEach(log => {
            const category = categoriesArray.find(c => String(c.id) === String(log.categoryId) || (log.subject && c.name === log.subject) || (log.categoryName && c.name === log.categoryName));
            const catName = category ? category.name : (log.categoryName || log.subject || 'Outros');
            catCounts[catName] = (catCounts[catName] || 0) + getLogMinutes(log);
        });
        const topCategory = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] || '-';

        // 2. Group by Date then by Category
        // FIX: Usar normalizeDate para evitar shift de UTC midnight em datas YYYY-MM-DD
        const sortedLogs = [...logsArray].sort((a, b) => (normalizeDate(b.date)?.getTime() ?? 0) - (normalizeDate(a.date)?.getTime() ?? 0));
        const grouped = {};

        sortedLogs.forEach(log => {
            const dateObj = normalizeDate(log.date);
            
            if (!dateObj || Number.isNaN(dateObj.getTime())) return;
            const dateStr = formatDatePtBR(dateObj);

            // Determine friendly day label
            const now = new Date();
            const today = formatDatePtBR(now);
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const yesterday = formatDatePtBR(y);
            let dayLabel = dateStr;
            const rawWeekday = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, weekday: 'long' }).format(dateObj);
            const weekDayName = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1).split('-')[0];

            let isToday = false;
            let isYesterday = false;

            if (dateStr === today) {
                dayLabel = "Hoje";
                isToday = true;
            } else if (dateStr === yesterday) {
                dayLabel = "Ontem";
                isYesterday = true;
            } else {
                dayLabel = dateStr;
            }

            const uniqueDayKey = getDateKey(dateObj) || dateStr;
            const manausDayStr = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, day: 'numeric' }).format(dateObj);

            if (!grouped[uniqueDayKey]) grouped[uniqueDayKey] = {
                label: dayLabel,
                subLabel: weekDayName,
                manausDayStr,
                isToday,
                isYesterday,
                dateObj,
                categories: {}
            };

            // Category Grouping
            const category = categoriesArray.find(c => String(c.id) === String(log.categoryId) || (log.subject && c.name === log.subject) || (log.categoryName && c.name === log.categoryName));
            const categoryId = category ? category.id : (log.categoryId || log.categoryName || log.subject || 'unknown');
            const categoryName = category ? category.name : (log.categoryName || log.subject || 'Desconhecido');
            const categoryColor = category?.color || '#a855f7';

            if (!grouped[uniqueDayKey].categories[categoryId]) {
                grouped[uniqueDayKey].categories[categoryId] = {
                    id: categoryId,
                    name: categoryName,
                    color: categoryColor,
                    logs: [],
                    totalMinutes: 0
                };
            }

            let taskTitle = '-';
            if (category && log.taskId) {
                const task = category.tasks?.find(t => String(t.id) === String(log.taskId));
                // Bug fix: data model stores task.text, not task.title
                if (task) taskTitle = task.text || task.title || '-';
            }

            // Check if this task is already in the list for this day (Merge strategy)
            const targetGroup = grouped[uniqueDayKey].categories[categoryId];
            const existingLogIndex = targetGroup.logs.findIndex(l =>
                (log.taskId && String(l.taskId) === String(log.taskId)) || (!log.taskId && l.taskTitle === taskTitle)
            );

            if (existingLogIndex >= 0) {
                targetGroup.logs[existingLogIndex].minutes += getLogMinutes(log);
                const prevTime = normalizeDate(targetGroup.logs[existingLogIndex].date)?.getTime() ?? 0;
                const newTime = normalizeDate(log.date)?.getTime() ?? 0;
                if (newTime > prevTime) {
                    targetGroup.logs[existingLogIndex].date = log.date;
                }
            } else {
                targetGroup.logs.push({
                    id: log.id,
                    taskId: log.taskId,
                    taskTitle,
                    minutes: getLogMinutes(log),
                    date: log.date
                });
            }

            targetGroup.totalMinutes += getLogMinutes(log);
        });

        // Convert Objects to Arrays for rendering
        const finalGroups = Object.values(grouped).sort((a, b) => b.dateObj - a.dateObj).map((dayGroup) => {
            // Sort categories by Last Activity Time (Chronological)
            const cats = Object.values(dayGroup.categories).map(cat => ({
                ...cat,
                // Find latest log time for this category on this day
                lastLogTime: cat.logs.length > 0 ? Math.max(...cat.logs.map(l => normalizeDate(l.date)?.getTime() ?? 0)) : 0
            })).sort((a, b) => b.lastLogTime - a.lastLogTime);

            const dayTotalMinutes = cats.reduce((acc, c) => acc + c.totalMinutes, 0);
            const dayTotalSessions = cats.reduce((acc, c) => acc + c.logs.length, 0);
            return {
                ...dayGroup,
                categories: cats,
                totalMinutes: dayTotalMinutes,
                totalSessions: dayTotalSessions
            };
        });

        return { groups: finalGroups, stats: { totalMinutes, totalSessions, topCategory } };
    }, [logsArray, categoriesArray]);

    const formatTime = (minutes) => {
        return formatDuration(minutes / 60);
    };

    if (!logsArray || logsArray.length === 0) {
        return (
            <div className="glass p-12 flex flex-col items-center justify-center text-slate-500 opacity-60 min-h-[400px]">
                <BookOpen size={64} className="mb-6 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-2">Diário Vazio</h3>
                <p>Complete seu primeiro Pomodoro para iniciar os registros.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2 px-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg shadow-purple-500/20">
                    <Activity className="text-white" size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Timeline de Estudos</h2>
                    <p className="text-sm text-slate-400">Diário detalhado das suas conquistas.</p>
                </div>
            </div>

            {/* OVERVIEW STATS */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col shadow-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Tempo de Foco</span>
                        <span className="text-3xl font-black text-white leading-none">{formatTime(stats.totalMinutes)}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col shadow-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total de Sessões</span>
                        <span className="text-3xl font-black text-purple-400 leading-none">{stats.totalSessions} <span className="text-sm text-slate-500 font-bold ml-1">blocos</span></span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col shadow-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Matéria Favorita</span>
                        <span className="text-base sm:text-lg font-black text-indigo-400 break-words line-clamp-3 leading-tight mt-1" title={stats.topCategory}>{stats.topCategory}</span>
                    </div>
                </div>
            )}

            {/* Timeline Content */}
            <div className="relative pl-12 sm:pl-20 space-y-12 before:content-[''] before:absolute before:left-[14px] sm:before:left-[34px] before:top-4 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-slate-700 before:to-transparent">
                {groups.map((dayGroup, idx) => {
                    const monthName = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, month: 'long' }).format(dayGroup.dateObj);
                    const displayTitle = dayGroup.isToday ? "Hoje" : dayGroup.isYesterday ? "Ontem" : `${dayGroup.manausDayStr} de ${monthName}`;

                    return (
                    <div key={dayGroup.dateObj?.toISOString?.() ?? `day-${idx}`} className="relative z-10">
                        {/* Day Marker */}
                        <div className="absolute -left-[47px] sm:-left-[73px] top-0 flex flex-col items-center w-7 sm:w-14">
                            <div className={`w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex flex-col items-center justify-center shadow-xl border-2 sm:border-4 ${dayGroup.isToday
                                ? 'bg-purple-600 border-slate-900 text-white scale-110'
                                : 'bg-slate-800 border-slate-900 text-slate-400'
                                }`}>
                                <span className="text-[7px] sm:text-[10px] font-bold uppercase">{dayGroup.subLabel.substring(0, 3)}</span>
                                <span className={`text-[10px] sm:text-base font-black ${dayGroup.isToday ? 'text-white' : 'text-slate-200'}`}>
                                     {dayGroup.manausDayStr}
                                 </span>
                            </div>
                        </div>

                        {/* Day Content Card */}
                        <div className={`ml-2 sm:ml-8 glass rounded-2xl transition-all hover:border-white/10 ${dayGroup.isToday ? 'border-purple-500/50 shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]' : ''
                            }`}>
                            {/* Card Header */}
                            <div className={`px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${dayGroup.isToday
                                ? 'bg-gradient-to-r from-purple-900/40 to-slate-900/40'
                                : 'bg-white/5'
                                }`}>
                                <div className="flex items-center gap-3 justify-start">
                                    <h3 className={`text-lg font-bold ${dayGroup.isToday ? 'text-purple-300' : 'text-slate-300'}`}>
                                        {displayTitle}
                                    </h3>
                                    {dayGroup.isToday && (
                                        <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                            HOJE
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-start sm:justify-center">
                                    <div className="font-mono text-white text-sm sm:text-lg font-bold bg-black/30 px-4 sm:px-6 py-1 min-w-[80px] sm:min-w-[100px] text-center rounded-lg border border-white/10">
                                        {formatTime(dayGroup.totalMinutes)}
                                    </div>
                                </div>
                                <div></div>
                            </div>

                            {/* Categories List */}
                            <div className="p-2 space-y-2 bg-black/20">
                                {dayGroup.categories.map((cat) => (
                                    <div key={cat.id} className="relative group rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 transition-colors">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: cat.color }}></div>

                                        {/* Category Summary Row */}
                                        <div className="p-3 pl-5 flex items-center justify-between cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-inner bg-black/20" style={{ color: cat.color }}>
                                                    {/* We could lookup icon, but simplified for now */}
                                                    •
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                                                        {cat.name}
                                                        <span className="text-[10px] font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                            {cat.logs.length} {cat.logs.length === 1 ? 'tarefa' : 'tarefas'}
                                                        </span>
                                                    </h4>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold text-white text-sm">
                                                    {formatTime(cat.totalMinutes)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Task Details (Always Visible but subtle) */}
                                        <div className="px-5 pb-3 pt-0 space-y-1">
                                            {cat.logs.map((log, logIdx) => (
                                                <div key={`${log.taskId || 'log'}-${logIdx}`} className="flex items-center justify-between text-xs py-1.5 border-t border-white/5 text-slate-400 hover:text-slate-300 transition-colors">
                                                    <div className="flex items-center gap-2 pr-4 min-w-0">
                                                        <Zap size={10} className="text-slate-600" />
                                                        <span className="break-words line-clamp-2 text-xs sm:text-sm" title={log.taskTitle}>{log.taskTitle}</span>
                                                    </div>
                                                    <span className="font-mono whitespace-nowrap opacity-60">+{log.minutes}m</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
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

---

## `src/components/MonteCarloGauge.jsx`

<a id="src-components-montecarlogauge-jsx"></a>

```jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Gauge, TrendingUp, TrendingDown, Settings2, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { formatValue } from '../utils/scoreHelper';
import { getDateKey, formatDatePtBR, normalizeDate } from '../utils/dateHelper';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * MonteCarloGauge — Componente Principal de Projeção Estatística
 * 
 * Agora refatorado para usar o hook customizado useMonteCarloStats para 
 * desacoplar a lógica matemática da renderização de UI.
 */
export default function MonteCarloGauge({
    categories = [],
    goalDate,
    targetScore,
    onTargetScoreChange,
    forcedMode = null,
    forcedTitle = null,
    unit = '%',
    minScore = 0,
    maxScore = 100,
    syncShowSubjects,
    onSyncShowSubjects,
    simulateToday = false,
    onSimulateTodayChange,
}) {
    const [showConfig, setShowConfig] = useState(false);
    const [localShowPerSubject, setLocalShowPerSubject] = useState(false);
    const [timeIndex, setTimeIndex] = useState(-1);
    const [localTimeIndex, setLocalTimeIndex] = useState(-1);
    const isDraggingTime = useRef(false);
    const debounceTimeoutTime = useRef(null);
    // C5 FIX: Usar useRef em vez de window.mcGaugeDragTimeout para evitar race condition
    // quando o componente é montado mais de uma vez (Strict Mode, navegação).
    const dragDebounceRef = useRef(null);
    const timeSliderRef = useRef(null);

    const timelineDates = useMemo(() => {
        const dates = new Set();
        const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
        safeCategories.forEach(cat => {
            if (cat.simuladoStats?.history) {
                const safeHistory = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history);
                safeHistory.forEach(h => {
                    if (!h) return;
                    const normalized = normalizeDate(h.date);
                    const dk = normalized ? getDateKey(normalized) : null;
                    if (dk) dates.add(dk);
                });
            }
        });
        return Array.from(dates).sort((a, b) => new Date(a) - new Date(b));
    }, [categories]);

    useEffect(() => {
        if (!isDraggingTime.current) {
            setLocalTimeIndex(timeIndex);
            if (timeSliderRef.current) {
                const effectiveValue = timeIndex === -1 || timeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : timeIndex;
                if (timeSliderRef.current.value !== String(effectiveValue)) {
                    timeSliderRef.current.value = effectiveValue;
                }
            }
        }
    }, [timeIndex, timelineDates.length]);

    useEffect(() => {
        return () => {
            if (debounceTimeoutTime.current) clearTimeout(debounceTimeoutTime.current);
            if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
        };
    }, []);

    // C4 FIX: Estado-derivado-de-prop via useEffect eliminado.
    // localSimulateToday era apenas um espelho de simulateToday, causando render extra.
    // resolvedSimulateToday (linha abaixo) já resolve isso diretamente sem estado intermediário.
    const [localSimulateToday, setLocalSimulateToday] = useState(Boolean(simulateToday));

    const activeId = useAppStore(state => state.appState?.activeId);
    const weights = useAppStore(state => state.appState?.contests?.[activeId]?.mcWeights || {});
    const activeUser = useAppStore(state => state.appState?.contests?.[activeId]?.user);
    const historicalCutoffs = useAppStore(state => state.appState?.contests?.[activeId]?.historicalCutoffs) || EMPTY_ARRAY;
    const setHistoricalCutoffs = useAppStore(state => state.setHistoricalCutoffs);

    // Prioritize sync prop if provided
    const showPerSubject = syncShowSubjects !== undefined ? syncShowSubjects : localShowPerSubject;
    const setShowPerSubject = onSyncShowSubjects !== undefined ? onSyncShowSubjects : setLocalShowPerSubject;



    const clampedTimeIndex = (timeIndex < 0 || timeIndex >= timelineDates.length) ? -1 : timeIndex;
    const resolvedSimulateToday = typeof onSimulateTodayChange === 'function' ? Boolean(simulateToday) : localSimulateToday;
    const setSimulateToday = typeof onSimulateTodayChange === 'function' ? onSimulateTodayChange : setLocalSimulateToday;
    const effectiveSimulateToday = forcedMode ? (forcedMode === 'today') : resolvedSimulateToday;

    // --- HOOK DE LÓGICA ESTATÍSTICA ---
    const stats = useMonteCarloStats({
        categories,
        goalDate,
        targetScore,
        timeIndex: clampedTimeIndex,
        timelineDates,
        minScore,
        maxScore,
        forcedMode,
        effectiveSimulateToday
    });

    const {
        simulationData,
        perSubjectProbs,
        isFlashing,
        projectedMean,
        currentMean,
        sd,
        sdLeft,
        sdRight,
        ci95Low,
        ci95High,
        pAdjusted,
        equalWeightsMode,
        setEqualWeightsMode,
        setWeights
    } = stats;

    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
    const boundedScore = (v) => Math.max(minScore, Math.min(maxScore, safe(v)));
    const projectedSafe = boundedScore(projectedMean);
    const currentSafe = boundedScore(currentMean);
    const targetSafe = boundedScore(targetScore);
    const ciLowSafeRaw = boundedScore(ci95Low);
    const ciHighSafeRaw = boundedScore(ci95High);
    const ciLowSafe = Math.min(ciLowSafeRaw, ciHighSafeRaw);
    const ciHighSafe = Math.max(ciLowSafeRaw, ciHighSafeRaw);
    const pAdjustedSafe = Math.max(0, Math.min(100, safe(pAdjusted)));
    const stableUpdateWeight = useCallback((name, p) => {
        setWeights((prevWeights) => ({ ...(prevWeights || {}), [name]: p }));
    }, [setWeights]);

    const getEqualWeights = useCallback(() => {
        const newWeights = {};
        categories.filter(c => {
            const h = c.simuladoStats?.history;
            return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
        }).forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
        });
        return newWeights;
    }, [categories]);

    if (!simulationData || simulationData.status === 'waiting') {
        const hasHistory = categories.some(cat => {
            const h = cat.simuladoStats?.history;
            return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
        });
        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-slate-900 w-full min-h-[400px]">
                {hasHistory ? <MonteCarloLoading /> : <EmptyPredictionState />}
            </div>
        );
    }

    const prob = Math.min(100, Math.max(0, safe(pAdjusted)));
    const roundedProb = Math.min(100, Math.max(0, Math.round(prob * 100) / 100));
    const inverseProb = parseFloat((100 - roundedProb).toFixed(2));

    const getGradientColor = (p) => {
        if (p >= 70) return "#22c55e";
        if (p >= 40) return "#f59e0b";
        return "#ef4444";
    };

    const gradientColor = getGradientColor(prob);
    const isTimeTraveling = clampedTimeIndex >= 0 && clampedTimeIndex < timelineDates.length - 1;

    let baseMessage = "RISCO DE QUEDA";
    if (prob > 95) baseMessage = "DOMÍNIO ESTRATÉGICO";
    else if (prob > 80) baseMessage = "A PROMESSA";
    else if (prob > 60) baseMessage = "NA ZONA DE BRIGA";
    else if (prob > 40) baseMessage = "COMPETITIVO";
    else if (prob > 20) baseMessage = "IMPROVISADOR";

    const message = baseMessage + (effectiveSimulateToday ? " (HOJE)" : " (FUTURO)");
    const projectionDelta = projectedSafe - currentSafe;
    const isProjectionNearCurrent = Math.abs(projectionDelta) < 0.5;
    const projectionDeltaLabel = `${projectionDelta >= 0 ? '+' : ''}${formatValue(projectionDelta)}${unit}`;

    return (
        <div className={`glass p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] relative flex flex-col border-l-4 border-blue-500 bg-slate-900 group transition-all duration-500 shadow-2xl w-full h-full flex-1 ${isFlashing ? 'opacity-90 scale-[0.99]' : ''}`}>
            {isFlashing && (
                <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-3xl">
                    <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent absolute top-0 left-0 animate-scan-fast" />
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Gauge size={16} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] leading-none">Monte Carlo</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Simulação Probabilística</span>
                        </div>
                    </div>
                    {forcedMode && (
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${forcedMode === 'today' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                            {forcedTitle || (forcedMode === 'today' ? 'Modo: Hoje' : 'Modo: Futuro')}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!forcedMode && (
                        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 w-full sm:w-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
                                className="h-full w-full rounded-full transition-transform hover:scale-110"
                                title="Configurar Classificações"
                            >
                                <Settings2 size={16} />
                            </button>
                            <div className="w-px h-4 bg-white/10" />
                            <button
                                onClick={(e) => { e.stopPropagation(); setSimulateToday(!resolvedSimulateToday); }}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${resolvedSimulateToday ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
                            >
                                {resolvedSimulateToday ? 'Ver Projeção' : 'Ver Estatísticas'}
                                <ChevronDown size={12} className={`transition-transform duration-300 ${resolvedSimulateToday ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] mb-4 flex-1">
                <div className={`w-full h-full bg-black/40 rounded-2xl p-4 flex flex-col items-center transition-all duration-700 ${isFlashing ? 'blur-sm' : ''}`}>
                    <div className="relative mb-2 w-full max-w-[280px] h-[140px] flex justify-center">
                        <svg width="100%" height="100%" viewBox="0 -6 140 76" className="overflow-visible relative z-10">
                            <path d="M 4 65 A 66 66 0 0 1 136 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                            <path
                                d="M 4 65 A 66 66 0 0 1 136 65"
                                fill="none"
                                stroke={gradientColor}
                                strokeWidth="10"
                                strokeLinecap="round"
                                pathLength="100"
                                strokeDasharray={`${roundedProb} ${inverseProb}`}
                                style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                            />
                            <g transform={`rotate(${(prob / 100) * 180}, 70, 65)`} style={{ transition: 'transform 1.5s ease-out', opacity: isFlashing ? 0.3 : 1 }}>
                                <circle cx="4" cy="65" r="5" fill={gradientColor} />
                                <circle cx="4" cy="65" r="2.5" fill="#fff" opacity="0.9" />
                            </g>
                        </svg>
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center z-20 translate-y-2">
                            <span className="text-3xl sm:text-5xl font-black leading-none" style={{ color: getGradientColor(prob) }}>
                                <AnimatedProbability value={pAdjustedSafe} />
                            </span>
                        </div>
                    </div>
                    <span className={`mt-4 text-[11px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full bg-black/40 border border-white/10 transition-all duration-500`} style={{ color: isFlashing ? '#60a5fa' : gradientColor }}>
                        {isFlashing ? "Simulando..." : message}
                    </span>
                    
                    {/* CONFORMAL PREDICTION PANEL */}
                    <div className="mt-5 w-full flex flex-col items-center flex-1">
                        <div className="w-full sm:w-4/5 md:w-3/4 flex flex-col items-center justify-center p-3 rounded-2xl border border-white/5 bg-black/50 shadow-inner">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                                Faixa Provável (95%)
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-white">{formatValue(ciLowSafe)}</span>
                                <span className="text-slate-600 font-black">—</span>
                                <span className="text-2xl font-black text-white">{formatValue(ciHighSafe)}</span>
                            </div>
                            {stats.confidenceObj && (
                                <div className={`mt-3 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg ${stats.confidenceObj.glow}`} style={{ background: stats.confidenceObj.color }}>
                                    {stats.confidenceObj.label}
                                </div>
                            )}
                        </div>
                        
                        {/* Human Explanations */}
                        {stats.explanations && stats.explanations.length > 0 && (
                            <div className="w-full sm:w-4/5 md:w-3/4 mt-3 space-y-1.5 px-2">
                                {stats.explanations.map((msg, i) => (
                                    <div key={i} className="text-[10px] text-slate-300 font-medium leading-tight opacity-90">
                                        • {msg}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drift Alerts */}
                        {stats.driftAlerts && stats.driftAlerts.length > 0 && (
                            <div className="w-full sm:w-4/5 md:w-3/4 mt-3 space-y-2">
                                {stats.driftAlerts.map((alert, i) => (
                                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${alert.severity === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                        <span className="text-[10px] font-bold leading-tight">{alert.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="mt-5 pt-3 text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center max-w-[280px] leading-relaxed opacity-80 border-t border-white/5 shrink-0">
                            Em previsões semelhantes, 95% dos resultados reais ficaram dentro desta faixa.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                    {[
                        { label: "Sua Meta", val: `${formatValue(targetSafe)}${unit}`, color: "text-rose-500" },
                        { label: isTimeTraveling ? "Nesse Dia" : "Hoje", val: `${formatValue(currentSafe)}${unit}`, color: "text-white" },
                        { label: "Projeção", val: `${formatValue(projectedSafe)}${unit}`, color: "text-blue-400" },
                        { label: "Δ Futuro vs Hoje", val: projectionDeltaLabel, color: isProjectionNearCurrent ? "text-amber-300" : "text-cyan-300" },
                        { label: "Incerteza", val: `-${formatValue(safe(sdLeft))} / +${formatValue(safe(sdRight))}`, color: "text-amber-400", small: true },
                        { label: "IC 95%", val: `${formatValue(ciLowSafe)}–${formatValue(ciHighSafe)}${unit}`, color: "text-green-500/80", small: true }
                    ].map((m, i) => (
                    <div key={i} className="bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center min-h-[56px]">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">{m.label}</span>
                        <span className={`${m.small ? 'text-[9px] sm:text-[10px]' : 'text-xs sm:text-sm'} font-black ${m.color} w-full text-center break-words leading-tight`}>{m.val}</span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-black/40 rounded-2xl p-6 mb-4 border border-white/5 flex flex-col shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Projeção de Desempenho</span>
                    <div className="flex gap-3">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-white/40"></div>Hoje</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-500"></div>Projeção</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-red-500"></div>Meta</span>
                    </div>
                </div>
                <div className="w-full pb-16">
                    <GaussianPlot
                        mean={projectedSafe}
                        sd={safe(sd)}
                        sdLeft={safe(sdLeft)}
                        sdRight={safe(sdRight)}
                        low95={ciLowSafe}
                        high95={ciHighSafe}
                        targetScore={targetSafe}
                        currentMean={currentSafe}
                        prob={safe(prob)}
                        kdeData={simulationData?.data?.kdeData}
                        projectedMean={projectedSafe}
                        unit={unit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                </div>
            </div>

            {timelineDates.length > 1 && (
                <div className="w-full mt-16 px-3 py-4 bg-black/40 rounded-xl border border-white/5 relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Máquina do Tempo</span>
                        <span className="text-[10px] font-black text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                            {clampedTimeIndex === -1 || !timelineDates[clampedTimeIndex] ? 'Hoje' : formatDatePtBR(`${timelineDates[clampedTimeIndex]}T12:00:00`)}
                        </span>
                    </div>
                    <input
                        ref={timeSliderRef}
                        type="range"
                        min="0"
                        max={Math.max(1, timelineDates.length - 1)}
                        defaultValue={localTimeIndex === -1 || localTimeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : localTimeIndex}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            const newTimeIndex = val === timelineDates.length - 1 ? -1 : val;
                            setLocalTimeIndex(newTimeIndex);
                            
                            isDraggingTime.current = true;
                            // C5 FIX: dragDebounceRef (useRef) em vez de window.mcGaugeDragTimeout
                            if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
                            dragDebounceRef.current = setTimeout(() => { isDraggingTime.current = false; }, 500);

                            if (debounceTimeoutTime.current) clearTimeout(debounceTimeoutTime.current);
                            debounceTimeoutTime.current = setTimeout(() => {
                                if (React.startTransition) {
                                    React.startTransition(() => {
                                        setTimeIndex(newTimeIndex);
                                    });
                                } else {
                                    setTimeIndex(newTimeIndex);
                                }
                            }, 40);
                        }}
                        onPointerDown={() => {
                            isDraggingTime.current = true;
                        }}
                        onPointerUp={() => {
                            isDraggingTime.current = false;
                            if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
                        }}
                        onTouchStart={() => { isDraggingTime.current = true; }}
                        onTouchEnd={() => {
                            isDraggingTime.current = false;
                            if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
                        }}
                        className="custom-slider w-full h-1.5 rounded-full outline-none"
                        style={{
                            background: `linear-gradient(to right, #6366f1 ${((localTimeIndex === -1 || localTimeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : localTimeIndex) / Math.max(1, timelineDates.length - 1)) * 100}%, rgba(255,255,255,0.1) ${((localTimeIndex === -1 || localTimeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : localTimeIndex) / Math.max(1, timelineDates.length - 1)) * 100}%)`,
                            touchAction: 'none'
                        }}
                    />
                </div>
            )}

            <div className="w-full flex flex-col gap-2 mt-4">
                <button
                    onClick={() => setShowPerSubject(!showPerSubject)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/10 rounded-xl transition-all"
                >
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Matérias Analisadas</span>
                    <ChevronDown size={12} className={`transition-transform ${showPerSubject ? 'rotate-180' : ''}`} />
                </button>

                {showPerSubject && perSubjectProbs.length > 0 && (
                    <div className="w-full bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5">
                        {perSubjectProbs.map(s => {
                            const probColor = s.prob < 40 ? 'text-rose-400' : s.prob < 60 ? 'text-amber-400' : s.prob < 80 ? 'text-blue-400' : 'text-emerald-400';
                            return (
                                <div key={s.name} className="flex flex-col gap-1.5 py-2 border-b border-white/5 last:border-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            {s.trend === 'up' && <TrendingUp size={10} className="text-emerald-400" />}
                                            {s.trend === 'down' && <TrendingDown size={10} className="text-rose-400" />}
                                            <span className="text-[10px] text-slate-300 truncate">{s.name}</span>
                                        </div>
                                        <span className={`text-[10px] font-black ${probColor}`}>{formatValue(s.prob)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${s.prob < 40 ? 'bg-rose-400' : s.prob < 60 ? 'bg-amber-400' : s.prob < 80 ? 'bg-blue-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${Math.min(100, Math.max(0, s.prob))}%`, transition: 'width 1s ease-out' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {!forcedMode && (
                <MonteCarloConfig
                    show={showConfig}
                    onClose={setShowConfig}
                    targetScore={targetScore}
                    setTargetScore={onTargetScoreChange}
                    equalWeightsMode={equalWeightsMode}
                    setEqualWeightsMode={setEqualWeightsMode}
                    getEqualWeights={getEqualWeights}
                    weights={weights}
                    setWeights={setWeights}
                    updateWeight={stableUpdateWeight}
                    categories={categories}
                    user={activeUser}
                    minScore={minScore}
                    maxScore={maxScore}
                    historicalCutoffs={historicalCutoffs}
                    setHistoricalCutoffs={setHistoricalCutoffs}
                />
            )}
        </div>
    );
}

// ==========================================
// UX HELPERS & ATOMS
// ==========================================

function MonteCarloLoading() {
    const messages = [
        'Analisando estabilidade probabilística...',
        'Calculando intervalo conformal...',
        'Verificando confiabilidade histórica...',
        'Executando simulações Monte Carlo...'
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!document.hidden) {
                setIndex((prev) => (prev + 1) % messages.length);
            }
        }, 2400);
        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="flex flex-col items-center justify-center p-6 h-full flex-1">
            <Gauge size={48} className="text-slate-600 animate-pulse mb-6 opacity-30" />
            <div className="animate-pulse text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center max-w-[200px]">
                {messages[index]}
            </div>
        </div>
    );
}

function EmptyPredictionState() {
    return (
        <div className="rounded-3xl p-6 border border-white/5 bg-black/20 flex flex-col items-center justify-center text-center h-full flex-1 w-full my-auto">
            <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Dados insuficientes
            </h2>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Ainda não há histórico suficiente para gerar uma projeção confiável.
            </p>
            <div className="mt-4 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                Lance seu 1º simulado
            </div>
        </div>
    );
}

function AnimatedProbability({ value }) {
    const [display, setDisplay] = useState(value);
    // BUG-AUDIT-05 FIX: Ref que rastreia o valor corrente da animação para evitar stale closure.
    // Sem isso, transições rápidas (60→70 durante animação 50→60) começariam de 50, não de ~58.
    const displayRef = useRef(value);

    useEffect(() => {
        const start = displayRef.current; // Sempre pega o valor visual corrente, não o state stale
        const end = value;
        if (Math.abs(start - end) < 0.1) {
            setDisplay(end);
            displayRef.current = end;
            return;
        }

        const duration = 700;
        const startTime = performance.now();
        let frameId;

        function animate(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            // Easing function outQuint
            const easeOut = 1 - Math.pow(1 - progress, 5);
            const current = start + (end - start) * easeOut;

            displayRef.current = current;
            setDisplay(current);

            if (progress < 1) {
                frameId = requestAnimationFrame(animate);
            }
        }
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [value]);

    return <span>{display.toFixed(0)}%</span>;
}
```

---

## `src/components/charts/MonteCarloConfig.jsx`

<a id="src-components-charts-montecarloconfig-jsx"></a>

```jsx
import React, { useRef, useState, useEffect, useMemo, startTransition } from 'react';
import { Settings2, Check, Minus, Plus, Activity, Clock, Hash, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatDuration } from '../../utils/dateHelper';

const WeightRow = React.memo(({ cat, weight, manualTotal, updateWeight }) => {
    const normalizedShare = manualTotal > 0 ? Math.round((weight / manualTotal) * 100) : 0;
    return (
        <div className={`bg-slate-800/40 backdrop-blur-md p-3 rounded-2xl border border-white/[0.03] flex flex-col sm:flex-row items-center gap-4 hover:border-indigo-500/20 transition-all ${weight === 0 ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="min-w-[40px] h-10 px-2 rounded-xl flex items-center justify-center text-sm shadow-inner shrink-0 whitespace-nowrap overflow-hidden" style={{ backgroundColor: `${cat.color || '#3b82f6'}15`, border: `1px solid ${cat.color || '#3b82f6'}20` }}>{cat.icon || '📚'}</div>
                <div className="flex-1 sm:hidden">
                    <p className="text-[11px] font-black text-slate-200 uppercase tracking-tight mb-0.5 truncate">{cat.name || 'Matéria'}</p>
                    <p className="text-[9px] font-black text-slate-500">{normalizedShare}% da Classificação</p>
                </div>
            </div>
            <div className="hidden sm:block flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-200 uppercase tracking-tight mb-1.5 truncate">{cat.name || 'Matéria'}</p>
                <div className="h-1.5 bg-slate-950/50 rounded-full overflow-hidden shadow-inner border border-black/20">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${normalizedShare}%`, backgroundColor: cat.color || '#3b82f6' }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Share</p>
                    <p className="text-[9px] font-black text-slate-400">{normalizedShare}%</p>
                </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-950/40 rounded-xl p-1 border border-white/5 w-full sm:w-auto justify-between sm:justify-start">
                {[0, 1, 2, 3].map(p => (
                    <button
                        type="button"
                        key={p}
                        onClick={() => updateWeight(cat.id || cat.name, p)}
                        className={`flex-1 sm:flex-none w-10 sm:w-8 h-10 sm:h-8 rounded-lg text-[10px] font-black transition-all ${weight === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        P{p}
                    </button>
                ))}
            </div>
        </div>
    );
});

WeightRow.displayName = 'WeightRow';

export const MonteCarloConfig = ({
    show, onClose, targetScore, setTargetScore,
    equalWeightsMode, setEqualWeightsMode, getEqualWeights,
    setWeights, weights, updateWeight, categories,
    historicalCutoffs = [], setHistoricalCutoffs,
    minScore = 0, maxScore = 100
}) => {
    const savedCustomWeights = useRef(null);
    const [newCutoff, setNewCutoff] = useState('');

    // Seletores Reativos da Store
    const examDurationMinutes = useAppStore(state => state.appState?.contests?.[state.appState?.activeId]?.examDurationMinutes || 240);
    const examTotalQuestions = useAppStore(state => state.appState?.contests?.[state.appState?.activeId]?.examTotalQuestions || 100);
    const setExamConfig = useAppStore(state => state.setExamConfig);

    const examDurationLabel = useMemo(() => {
        return formatDuration(examDurationMinutes / 60);
    }, [examDurationMinutes]);

    const updateExamDurationMinutes = (delta) => {
        const newMins = Math.max(30, Math.min(720, examDurationMinutes + delta));
        if (newMins !== examDurationMinutes && setExamConfig) setExamConfig(newMins, examTotalQuestions);
    };

    const updateExamTotalQuestions = (e) => {
        const q = parseInt(e.target.value, 10);
        if (!isNaN(q) && q > 0 && setExamConfig) setExamConfig(examDurationMinutes, q);
    };

    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMinScore ? Number(maxScore) : Math.max(safeMinScore + 1, 100);
    const sliderMin = Math.max(safeMinScore, Math.round(safeMaxScore * 0.1));
    const sliderRange = Math.max(1, safeMaxScore - sliderMin);
    const clampedTarget = Math.min(safeMaxScore, Math.max(sliderMin, Number(targetScore) || sliderMin));
    
    const [localTarget, setLocalTarget] = useState(clampedTarget);
    const isDragging = useRef(false);
    const debounceTimeout = useRef(null);
    const dragTimeout = useRef(null);
    const sliderRef = useRef(null);

    // Otimização O(N) via useMemo para evitar loop no render do slider
    const manualTotal = useMemo(() => {
        if (!Array.isArray(categories)) return 0;
        return categories.reduce((acc, cat) => {
            const val = weights?.[cat.id || cat.name];
            return acc + Math.max(0, parseInt(val !== undefined ? val : 1, 10) || 0);
        }, 0);
    }, [categories, weights]);

    useEffect(() => {
        if (!isDragging.current) {
            setLocalTarget(clampedTarget);
            if (sliderRef.current && sliderRef.current.value !== String(clampedTarget)) {
                sliderRef.current.value = String(clampedTarget);
            }
        }
    }, [clampedTarget]);

    useEffect(() => {
        document.body.style.overflow = show ? 'hidden' : '';
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            if (dragTimeout.current) clearTimeout(dragTimeout.current);
            document.body.style.overflow = '';
        };
    }, [show]);

    const sliderPercent = ((localTarget - sliderMin) / sliderRange) * 100;

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value, 10);
        setLocalTarget(val);
        
        isDragging.current = true;
        if (dragTimeout.current) clearTimeout(dragTimeout.current);
        dragTimeout.current = setTimeout(() => { isDragging.current = false; }, 500);

        if (setTargetScore) {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = setTimeout(() => {
                if (startTransition) {
                    startTransition(() => {
                        setTargetScore(val);
                    });
                } else {
                    setTargetScore(val);
                }
            }, 40);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => onClose(false)} />

            <div className="relative w-full max-w-2xl h-full max-h-[90vh] bg-slate-900 border border-white/10 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 shadow-inner flex items-center justify-center">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-200 truncate">Engine configuration</h3>
                            <p className="text-[10px] text-slate-400 truncate">Monte Carlo & Classificações das Matérias</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onClose(false)}
                        className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 group/close focus:outline-none focus:ring-2 focus:ring-emerald-300/70"
                        title="Salvar e Fechar"
                    >
                        <Check size={18} className="text-white group-hover/close:scale-110 transition-transform" />
                        <span className="hidden sm:inline text-[10px] font-black text-white uppercase tracking-wider">Salvar</span>
                    </button>
                </div>

                {/* REMOVIDO DUPLO SCROLL - Mantido apenas o container de conteúdo flex-1 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                    <div className="bg-slate-950/40 backdrop-blur-xl p-6 rounded-3xl mb-8 border border-white/[0.03] shadow-2xl relative overflow-hidden group/target">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/target:opacity-20 transition-opacity">
                            <Activity size={48} className="text-blue-500" />
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Target Achievement</span>
                                <span className="text-3xl font-black text-white tracking-tighter italic">
                                    <span>{localTarget}</span>
                                    <span className="text-blue-500">%</span>
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest block">Min. Viability</span>
                                <span className="text-xs font-bold text-slate-400">Competitive Goal</span>
                            </div>
                        </div>
                        <div className="relative h-6 flex items-center mb-4">
                            <input
                                ref={sliderRef}
                                type="range"
                                min={sliderMin}
                                max={safeMaxScore}
                                step="1"
                                defaultValue={clampedTarget}
                                onChange={handleSliderChange}
                                onPointerDown={() => { isDragging.current = true; }}
                                onPointerUp={() => { isDragging.current = false; }}
                                onTouchStart={() => { isDragging.current = true; }}
                                onTouchEnd={() => { isDragging.current = false; }}
                                className="custom-slider w-full h-1.5 rounded-full outline-none"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 ${sliderPercent}%, rgba(255,255,255,0.1) ${sliderPercent}%)`,
                                    touchAction: 'none'
                                }}
                            />
                        </div>
                        <div className="relative h-6 mt-2 w-full px-1">
                            {[
                                { ratio: 0.6, label: 'Baseline', color: 'text-slate-600' },
                                { ratio: 0.75, label: 'Optimized', color: 'text-blue-500/60' },
                                { ratio: 0.9, label: 'Elite', color: 'text-slate-600' }
                            ].map(({ ratio, label, color }, i) => {
                                const val = Math.round(safeMaxScore * ratio);
                                const percent = Math.max(0, Math.min(100, ((val - sliderMin) / sliderRange) * 100));
                                return (
                                    <div key={i} className="absolute flex flex-col items-center" style={{ left: `calc(${percent}% + ${8 - percent * 0.16}px)`, transform: 'translateX(-50%)' }}>
                                        <div className="w-0.5 h-1.5 bg-slate-600/50 mb-1 rounded-full"></div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${color}`}>{label} ({val})</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-950/40 p-5 rounded-md mb-8 border border-white/[0.03] shadow-inner relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={18} className="text-purple-400" />
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Cortes Históricos</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Sorteio Inteligente no Monte Carlo</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="number"
                                placeholder="Nota de Corte (Ex: 82)"
                                value={newCutoff}
                                onChange={(e) => setNewCutoff(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = parseFloat(newCutoff);
                                        if (!isNaN(val) && val >= safeMinScore && val <= safeMaxScore) {
                                            if (typeof setHistoricalCutoffs === 'function') {
                                                setHistoricalCutoffs([...historicalCutoffs, val]);
                                            }
                                            setNewCutoff('');
                                        }
                                    }
                                }}
                                className="bg-slate-900 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white font-bold w-full outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const val = parseFloat(newCutoff);
                                    if (!isNaN(val) && val >= safeMinScore && val <= safeMaxScore) {
                                        if (typeof setHistoricalCutoffs === 'function') {
                                            setHistoricalCutoffs([...historicalCutoffs, val]);
                                        }
                                        setNewCutoff('');
                                    }
                                }}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-5 py-2.5 rounded-md shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                            >
                                Inserir
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {historicalCutoffs.map((c, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-slate-900 border border-purple-500/30 px-3 py-1.5 rounded-full group">
                                    <span className="text-xs font-black text-purple-300">{c}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (typeof setHistoricalCutoffs === 'function') {
                                                setHistoricalCutoffs(historicalCutoffs.filter((_, idx) => idx !== i));
                                            }
                                        }}
                                        className="text-slate-500 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all p-0.5"
                                        title="Remover nota de corte"
                                    >
                                        <Minus size={14} />
                                    </button>
                                </div>
                            ))}
                            {historicalCutoffs.length === 0 && (
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Nenhum corte cadastrado</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-950/40 p-5 rounded-md mb-8 border border-white/[0.03] shadow-inner relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-emerald-400" />
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Time Penalty (Agilidade)</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Penalidade por Estouro de Tempo</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tempo de Prova (Horas)</label>
                                <div className="flex items-center bg-slate-900 border border-white/10 rounded-md focus-within:border-emerald-500/50 transition-colors">
                                    <div className="pl-3 pr-2 py-2.5 text-slate-500">
                                        <Clock size={16} />
                                    </div>
                                    <div className="flex items-center justify-between w-full pr-1 py-1">
                                        <span className="bg-transparent text-white font-bold text-sm select-none">{examDurationLabel}</span>
                                        <div className="flex flex-col gap-0.5">
                                            <button type="button" onClick={() => updateExamDurationMinutes(30)} className="text-slate-500 hover:text-white hover:bg-white/10 rounded px-1 transition-colors" title="Aumentar 30min">
                                                <ChevronUp size={12} strokeWidth={4} />
                                            </button>
                                            <button type="button" onClick={() => updateExamDurationMinutes(-30)} className="text-slate-500 hover:text-white hover:bg-white/10 rounded px-1 transition-colors" title="Diminuir 30min">
                                                <ChevronDown size={12} strokeWidth={4} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total de Questões</label>
                                <div className="flex items-center bg-slate-900 border border-white/10 rounded-md focus-within:border-emerald-500/50 transition-colors">
                                    <div className="pl-3 pr-2 py-2.5 text-slate-500">
                                        <Hash size={16} />
                                    </div>
                                    <input
                                        type="number"
                                        min="10"
                                        max="500"
                                        value={examTotalQuestions}
                                        onChange={updateExamTotalQuestions}
                                        className="bg-transparent text-white font-bold text-sm w-full outline-none py-2.5 pr-3 placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-medium bg-black/20 p-3 rounded-md border border-white/[0.02]">
                        Se você inserir notas aqui, o motor Monte Carlo irá <b>sortear a nota de corte alvo</b> a cada simulação a partir de uma Distribuição Normal baseada nestes valores, ignorando o Target fixo do slider. Isso gera previsões hiper-realistas para bancas voláteis.
                    </p>

                    <div className="bg-slate-800/50 p-1 rounded-xl flex flex-col sm:flex-row my-6 border border-white/5 gap-1 sm:gap-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (!equalWeightsMode) {
                                    savedCustomWeights.current = weights;
                                    const ew = getEqualWeights();
                                    setWeights(ew);
                                }
                                setEqualWeightsMode(true);
                            }}
                            className={`flex-1 py-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-300/60 ${equalWeightsMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                            Pesos Iguais
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (equalWeightsMode && savedCustomWeights.current) {
                                    setWeights(savedCustomWeights.current);
                                }
                                setEqualWeightsMode(false);
                            }}
                            className={`flex-1 py-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-300/60 ${!equalWeightsMode ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${!equalWeightsMode ? 'bg-white' : 'bg-slate-600'}`} />
                            Manual (1, 2, 3...)
                        </button>
                    </div>

                    {/* CONTEXTO SECUNDÁRIO DE LISTAGEM DE MATÉRIAS */}
                    <div className="space-y-3">
                        {equalWeightsMode ? (
                            <div className="py-10 flex flex-col items-center justify-center text-center opacity-50">
                                <Minus size={40} className="text-slate-600 mb-2" />
                                <p className="text-sm text-slate-500 px-10">No modo automático, todas as matérias possuem o mesmo peso de relevância.</p>
                            </div>
                        ) : (
                            Array.isArray(categories) && categories.length > 0 ? (
                                categories.map(cat => (
                                    <WeightRow
                                        key={cat.id || cat.name}
                                        cat={cat}
                                        weight={weights ? (weights[cat.id || cat.name] !== undefined ? (parseInt(weights[cat.id || cat.name], 10) || 0) : 1) : 1}
                                        manualTotal={manualTotal}
                                        updateWeight={updateWeight}
                                    />
                                ))
                            ) : (
                                <div className="py-10 flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                                    <Activity size={40} className="text-slate-600 mb-2" />
                                    <p className="text-sm text-slate-500 px-10">Nenhuma matéria encontrada no concurso atual.</p>
                                    <p className="text-[10px] text-slate-600">Adicione matérias na Planilha ou menu Categorias para configurar os pesos.</p>
                                </div>
                            )
                        )}
                    </div>

                    {!equalWeightsMode && (
                        <p className="text-[10px] text-slate-400 mt-3">No modo manual, você define pesos relativos (1, 2, 3...). O sistema converte automaticamente para percentual.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
```

---

## `src/components/DueForecast.jsx`

<a id="src-components-dueforecast-jsx"></a>

```jsx
import React, { useMemo } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { computeFlashcardDueForecast } from '../utils/analytics';
import { toArray } from '../utils/normalize';
import DueForecastChart from './charts/DueForecastChart';

/**
 * Previsão de Cartões a Vencer (Due Forecast)
 * Componente reutilizável com resumo + gráfico de barras.
 */
export default function DueForecast({ decks = [], horizon = 14, compact = false }) {
    const safeHorizon = Math.max(1, Math.min(30, Number(horizon) || 14));

    const { forecast, totalDueInHorizon, maxDaily, horizon: usedHorizon, totalCards } = useMemo(() => {
        const decksArray = toArray(decks);
        const res = computeFlashcardDueForecast(decksArray, safeHorizon);
        const cardsCount = decksArray.reduce((sum, d) => sum + toArray(d?.cards).length, 0);
        return {
            ...res,
            totalCards: cardsCount
        };
    }, [decks, safeHorizon]);

    const todayCount = forecast[0]?.count || 0;
    // Safe peakDay (never crash)
    const peakDay = forecast.length > 0
        ? (forecast.find(d => d.count === maxDaily) || forecast[0])
        : { label: '-', dateLabel: '-' };

    if (!totalCards) {
        return (
            <div className="glass p-5 rounded-3xl border border-white/10 text-center text-sm text-slate-400">
                Nenhum cartão de flashcard ainda. Crie decks para ver a previsão de vencimentos.
            </div>
        );
    }

    if (compact) {
        // Compact inline version — respects the horizon prop
        const sliceLen = Math.min(7, usedHorizon);
        const nextN = forecast.slice(0, sliceLen).reduce((s, f) => s + f.count, 0);
        const label = usedHorizon <= 7 ? `Próximos ${usedHorizon} dias` : `Próximos ${sliceLen} dias`;
        return (
            <div className="flex items-center gap-3 text-sm">
                <div>
                    <span className="uppercase text-[10px] tracking-widest text-slate-500">Hoje</span>
                    <div className={`text-xl font-black tabular-nums ${todayCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {todayCount}
                    </div>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                    <span className="uppercase text-[10px] tracking-widest text-slate-500">{label}</span>
                    <div className="text-xl font-black text-amber-300 tabular-nums">{nextN}</div>
                </div>
                <div className="ml-auto text-[10px] text-right text-slate-400">
                    Pico: <span className="font-bold text-white">{maxDaily}</span> em {peakDay.label}
                </div>
            </div>
        );
    }

    return (
        <div className="glass p-6 rounded-3xl border border-amber-500/20 bg-amber-950/5">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <Calendar size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <div className="font-black text-white tracking-tight text-lg">Previsão de Cartões a Vencer</div>
                        <div className="text-[10px] uppercase tracking-[1.5px] text-amber-400/80 font-bold">Due Forecast • Próximos {usedHorizon} dias</div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-500 tracking-widest">Total a vencer</div>
                    <div className="text-3xl font-black text-amber-300 tabular-nums leading-none mt-0.5">
                        {totalDueInHorizon}
                    </div>
                    <div className="text-[10px] text-slate-400">no período</div>
                </div>
            </div>

            <DueForecastChart data={forecast} height={240} />

            {/* Summary row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] text-slate-500">Hoje (vencidos + agendados)</div>
                    <div className={`text-2xl font-black tabular-nums ${todayCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {todayCount}
                    </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] text-slate-500">Pico diário</div>
                    <div className="text-2xl font-black text-amber-400 tabular-nums">{maxDaily}</div>
                    <div className="text-[10px] text-amber-400/70">{peakDay.label} ({peakDay.dateLabel})</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] text-slate-500">Total no horizonte</div>
                    <div className="text-2xl font-black text-white tabular-nums">{totalDueInHorizon}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 flex items-center text-xs text-slate-400">
                    {totalDueInHorizon > 0 ? (
                        <>Planeje revisões diárias para evitar acúmulo. Cartões são reagendados ao revisar.</>
                    ) : (
                        <>Excelente! Nenhum vencimento programado.</>
                    )}
                    <TrendingUp size={16} className="ml-auto opacity-40" />
                </div>
            </div>

            <div className="mt-3 text-[10px] text-center text-slate-500">
                A previsão reflete o agendamento atual. Revisar um cartão o move para uma data futura.
            </div>
        </div>
    );
}
```

---

## `src/components/charts/DueForecastChart.jsx`

<a id="src-components-charts-dueforecastchart-jsx"></a>

```jsx
import React, { useId } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="glass p-3 rounded-xl border border-white/10 text-xs shadow-2xl">
                <div className="font-bold text-amber-300">{item.label} • {item.dateLabel}</div>
                <div className="text-white mt-1">
                    <span className="font-black text-lg tabular-nums">{item.count}</span> cartões a vencer
                </div>
                {item.isToday && <div className="text-[10px] text-orange-400 mt-0.5">Inclui vencidos + hoje</div>}
            </div>
        );
    }
    return null;
};

export default function DueForecastChart({ data = [], height = 260 }) {
    const instanceId = useId().replace(/:/g, "");
    const barId = `due_bar_${instanceId}`;

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[180px] border border-white/5 rounded-2xl bg-black/20 text-slate-500 text-sm" role="img" aria-label="Sem dados de previsão de cartões">
                Sem dados de previsão.
            </div>
        );
    }

    // Prepare recharts data
    const chartData = data.map((d, idx) => ({
        ...d,
        idx,
        value: d.count
    }));

    const hasAny = chartData.some(d => d.value > 0);

    return (
        <div style={{ height }} className="w-full -mx-1" role="img" aria-label="Gráfico de previsão de cartões a vencer por dia">
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                <BarChart data={chartData} margin={{ top: 12, right: 4, left: -4, bottom: 8 }} aria-hidden="true">
                    <defs>
                        <linearGradient id={barId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.65} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" vertical={false} />

                    <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b' }}
                    />

                    <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tickCount={4}
                        tick={{ fill: '#64748b' }}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />

                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={`url(#${barId})`} minPointSize={2}>
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.isToday ? '#f59e0b' : entry.isTomorrow ? '#fbbf24' : '#d97706'}
                                fillOpacity={entry.value === 0 ? 0.25 : 1}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {!hasAny && (
                <div className="text-center text-[10px] text-emerald-400 mt-1" aria-live="polite">
                    Nenhum cartão programado nos próximos dias — está tudo em dia!
                </div>
            )}
        </div>
    );
}
```

---

## `src/components/charts/Analytics/EvolucaoFocoChart.jsx`

<a id="src-components-charts-analytics-evolucaofocochart-jsx"></a>

```jsx
import React, { useId } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDuration } from '../../../utils/dateHelper';

export function EvolucaoFocoChart({ data }) {
    const instanceId = useId().replace(/:/g, "");
    const colorFocoId = `foco_grad_${instanceId}`;

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px] border border-white/5 rounded-2xl bg-black/20 mt-4 pb-2">
                <p className="text-slate-500 text-sm font-medium italic">Dados insuficientes para análise de foco.</p>
            </div>
        );
    }

    return (
        <div className="h-full min-h-[300px] w-full mt-4 pb-2">
            <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={1}>
                {/* Ajustado margin left para 10 para o eixo Y e a linha do gráfico não ficarem cortados */}
                <AreaChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                    {/* ORGANIZAÇÃO: defs sempre no topo do gráfico */}
                    <defs>
                        <linearGradient id={colorFocoId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

                    <XAxis
                        dataKey="data"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        minTickGap={25}
                    />

                    <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        domain={[0, dataMax => {
                            const safeMax = Number.isFinite(dataMax) ? dataMax : 0;
                            return Math.max(1, Math.ceil(safeMax * 1.15));
                        }]}
                        axisLine={false}
                        tickLine={false}
                        dx={-5}
                        width={45}
                        tickFormatter={(val) => formatDuration(val)}
                    />

                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', fontSize: '13px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value) => [formatDuration(value), 'Tempo Estudado']}
                    />

                    <Area connectNulls
                        type="monotoneX"
                        dataKey="horasEstudadas"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill={`url(#${colorFocoId})`}
                        name="Horas Estudadas"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
```

---

## `src/components/charts/Analytics/HorasDisciplinaChart.jsx`

<a id="src-components-charts-analytics-horasdisciplinachart-jsx"></a>

```jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatDuration } from '../../../utils/dateHelper';

const COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'];

export function HorasDisciplinaChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] border border-white/5 rounded-2xl bg-black/20">
                <p className="text-slate-500 text-sm font-medium italic">Dados insuficientes para análise por matéria.</p>
            </div>
        );
    }

    // Sort by hours descending (ensuring numerical sort)
    const sortedData = [...data].sort((a, b) => (Number(b.horas) || 0) - (Number(a.horas) || 0));

    // FIX: Altura base de 300px (para o eixo X ficar sempre no fundo alinhado ao outro gráfico), 
    // mas se tiver muitas matérias, cresce proporcionalmente para não amassar as barras.
    const minChartHeight = Math.max(300, sortedData.length * 45);

    return (
        <div className="h-full w-full mt-2 pb-2 transition-all duration-300" style={{ minHeight: `${minChartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={minChartHeight - 50} minWidth={1}>
                <BarChart
                    layout="vertical"
                    data={sortedData}
                    margin={{ top: 25, right: 15, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />

                    <XAxis
                        type="number"
                        stroke="#94a3b8"
                        fontSize={10}
                        domain={[0, dataMax => Math.max(1, Math.ceil(dataMax * 1.1))]}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => formatDuration(val)}
                    />

                    <YAxis
                        type="category"
                        dataKey="disciplina"
                        stroke="#f1f5f9"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                        tick={(props) => {
                            const { x, y, payload } = props;
                            let rawText = String(payload.value || '');
                            if (rawText.length > 13) {
                                rawText = rawText.substring(0, 13).trim() + '...';
                            }
                            return (
                                <g transform={`translate(${x},${y})`}>
                                    <text x={0} y={0} dy={3} dx={-5} textAnchor="end" fill="#e2e8f0" fontSize={9} fontWeight={600}>
                                        {rawText}
                                    </text>
                                </g>
                            );
                        }}
                    />

                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(value) => [formatDuration(value), 'Total']}
                    />

                    <Bar
                        dataKey="horas"
                        fill="#6366f1"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={24}
                        name="Horas"
                    >
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
```

---

## `src/components/charts/Analytics/AnaliseRetencaoChart.jsx`

<a id="src-components-charts-analytics-analiseretencaochart-jsx"></a>

```jsx
import React, { useId } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function AnaliseRetencaoChart({ data }) {
    const instanceId = useId().replace(/:/g, "");
    const barGradId = `ret_barGrad_${instanceId}`;
    const glowId = `ret_glow_${instanceId}`;

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] border border-white/5 rounded-2xl bg-black/20">
                <p className="text-slate-500 text-sm font-medium italic">Dados insuficientes para análise de retenção.</p>
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                {/* Margens ajustadas para dar respiro aos valores numéricos (left/right) e ao texto inclinado (bottom) */}
                <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 120 }}>
                    <defs>
                        <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                        </linearGradient>
                        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

                    <XAxis
                        dataKey="nomeTopico"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        interval={0}
                        padding={{ left: 15, right: 15 }}
                        tick={(props) => {
                            const { x, y, payload } = props;
                            const item = data[payload.index];
                            let rawText = String(payload.value ?? '');
                            if (item?.isTask) rawText = `• ${rawText}`;
                            
                            // Truncar textos muito longos (máximo 40 caracteres) para não quebrar o layout
                            if (rawText.length > 40) {
                                rawText = rawText.substring(0, 40).trim() + '...';
                            }
                            
                            const words = String(rawText).split(' ');
                            const lines = [];
                            let currentLine = '';
                            const maxCharsPerLine = 15; // Garante um bloco de texto com largura agradável
                            
                            for (const word of words) {
                                if (!currentLine) {
                                    currentLine = word;
                                } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
                                    currentLine += ' ' + word;
                                } else {
                                    lines.push(currentLine);
                                    currentLine = word;
                                }
                            }
                            if (currentLine) {
                                lines.push(currentLine);
                            }

                            const isRotated = data.length > 4;

                            return (
                                <g transform={`translate(${x},${y})`}>
                                    <text
                                        x={0}
                                        y={0}
                                        dy={16}
                                        textAnchor={isRotated ? "end" : "middle"}
                                        fill={item?.isTask ? "#94a3b8" : "#f1f5f9"}
                                        fontSize={item?.isTask ? 9 : 10}
                                        fontWeight={item?.isTask ? 400 : 700}
                                        transform={isRotated ? "rotate(-45)" : undefined}
                                    >
                                        {lines.map((line, index) => (
                                            <tspan x={0} dy={index === 0 ? 0 : 12} key={index}>
                                                {line}
                                            </tspan>
                                        ))}
                                    </text>
                                </g>
                            );
                        }}
                    />

                    {/* CORREÇÃO 2: Labels removidos para evitar poluição visual (a legenda já faz este papel) */}
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#94a3b8"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        dx={-5} // Afasta os números levemente do gráfico
                        domain={[0, dataMax => Math.max(1, dataMax)]}
                    />

                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#f87171"
                        fontSize={10}
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        dx={5} // Afasta os números levemente do gráfico
                    />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            fontSize: '11px',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ padding: '2px 0' }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        formatter={(value, name) => {
                            if (name === "Risco de Esquecimento") return [`${value}% (Risco)`, name];
                            return [value, name];
                        }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />

                    <Bar
                        yAxisId="left"
                        dataKey="diasSemRevisao"
                        fill={`url(#${barGradId})`}
                        radius={[6, 6, 0, 0]}
                        name="Dias sem Revisão"
                        // CORREÇÃO 4: maxBarSize permite que o gráfico seja responsivo em telas menores
                        maxBarSize={24}
                    />

                    {/* Bottom Layer: Glow effect */}
                    <Line connectNulls
                        yAxisId="right"
                        type="monotone"
                        dataKey="nivelCritico"
                        name="Risco_glow"
                        stroke="#ef4444"
                        strokeWidth={8}
                        strokeOpacity={0.3}
                        dot={false}
                        activeDot={false}
                        animationDuration={1500}
                        legendType="none"
                    />
                    {/* Top Layer: Main Line */}
                    <Line connectNulls
                        yAxisId="right"
                        type="monotone"
                        dataKey="nivelCritico"
                        stroke="#ef4444"
                        strokeWidth={4}
                        dot={{ r: 5, fill: '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                        name="Risco de Esquecimento"
                        animationDuration={1500}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
```

---

## `src/components/charts/GaussianPlot.jsx`

<a id="src-components-charts-gaussianplot-jsx"></a>

```jsx
import React, { useMemo, useState, useId, useRef, useEffect } from 'react';
import { asymmetricGaussian, generateGaussianPoints, normalCDF_complement } from '../../engine/math/gaussian.js';
import { formatDuration } from '../../utils/dateHelper';
import { formatValue } from '../../utils/scoreHelper';

/**
 * GaussianPlot
 * 
 * Renders a probability density function (PDF) based on Monte Carlo results.
 * Supports asymmetric distributions and Kernel Density Estimation (KDE) data.
 * Hardened with defensive boundary checks and non-zero scoring floor support.
 */
export const GaussianPlot = ({ 
    mean, 
    sd, 
    low95, 
    high95, 
    targetScore, 
    currentMean, 
    prob, 
    sdLeft: propSdLeft, 
    sdRight: propSdRight, 
    kdeData, 
    projectedMean, 
    minScore = 0, 
    maxScore = 100, 
    unit = '%' 
}) => {
    const [hover, setHover] = useState(null);
    const hoverRafRef = useRef(null);
    const pendingHoverRef = useRef(null);

    // LEAK-FIX: Cleanup de requestAnimationFrame pendente se o componente desmontar durante o hover
    useEffect(() => {
        return () => {
            if (hoverRafRef.current != null) {
                cancelAnimationFrame(hoverRafRef.current);
                hoverRafRef.current = null;
            }
            pendingHoverRef.current = null; // ✅ Limpar pending também
        };
    }, []);

    const instanceId = useId().replace(/:/g, '');
    const ID = {
        curveGrad: `gpCurveGradient_${instanceId}`,
        areaGrad: `gpAreaGradient_${instanceId}`,
        failGrad: `gpFailAreaGradient_${instanceId}`,
        glow: `gpGlow_${instanceId}`,
        chartClip: `chartClip_${instanceId}`
    };

    const successColor = '#22c55e';

    const {
        pathData, areaPathData, failAreaPathData, range, xMin, targetVal, xp,
        domainMin, domainMax, curveY
    } = useMemo(() => {
        const domainMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const rawTargetVal = targetScore ?? 70;
        const rawMean = Number.isFinite(Number(mean)) ? Number(mean) : domainMin;

        // Ajuste dinâmico do teto visual para comportar escalas ENEM ou maiores
        let rawMax = unit === '%' 
            ? Math.max(domainMin + 1, Number(maxScore) || 100) 
            : Math.max(Number(maxScore) || 100, rawTargetVal * 1.05, rawMean * 1.05);

        const domainMax = Math.max(domainMin + 1e-9, rawMax);
        const meanVal = Math.max(domainMin, Math.min(domainMax, rawMean));
        const xMin = domainMin;
        const range = domainMax - domainMin;
        const safeRange = Math.max(1e-9, range);
        
        // Clamp do Alvo contra corrupções nos bounds visuais
        const targetVal = Math.max(domainMin, Math.min(domainMax, rawTargetVal));

        const sdFloor = safeRange * 0.001;
        let vizSdLeft = Math.max(sdFloor, propSdLeft ?? sd ?? sdFloor);
        let vizSdRight = Math.max(sdFloor, propSdRight ?? sd ?? sdFloor);

        const hasValidKDE = kdeData && kdeData.length > 5;

        // Se estivermos simulando uma Gaussiana Assimétrica para bater com a probabilidade real do motor
        if (!hasValidKDE && prob != null && prob > 0 && prob < 100) {
            const targetProb = prob / 100;
            const m = meanVal;
            const t = targetVal;

            const getGeomProb = (tVal, mVal, sl, sr) => {
                const normFactor = 2 / (sl + sr);
                const pUnderflow = normFactor * sl * normalCDF_complement((mVal - domainMin) / sl);
                const pOverflow = normFactor * sr * normalCDF_complement((domainMax - mVal) / sr);
                const truncatedTotal = Math.max(0.01, 1 - pUnderflow - pOverflow);

                let pSuccess;
                if (tVal >= mVal) {
                    const pRightSuccess = normFactor * sr * normalCDF_complement((tVal - mVal) / sr);
                    pSuccess = Math.max(0, pRightSuccess - pOverflow);
                } else {
                    const pLeftFail = normFactor * sl * normalCDF_complement((mVal - tVal) / sl);
                    const totalLeftArea = normFactor * sl * 0.5;
                    const totalRightArea = normFactor * sr * 0.5;
                    pSuccess = Math.max(0, (totalLeftArea - pLeftFail) + (totalRightArea - pOverflow));
                }
                return pSuccess / truncatedTotal;
            };

            let sl = vizSdLeft, sr = vizSdRight;
            for (let i = 0; i < 12; i++) {
                const pg = getGeomProb(t, m, sl, sr);
                if (isNaN(pg) || Math.abs(targetProb - pg) <= 0.002) break;

                const r = targetProb / Math.max(0.005, pg);
                const adjustment = t < m ? (1 / r) : r;
                const damp = 0.85 * Math.pow(0.93, i);
                const appliedAdj = 1 + (adjustment - 1) * damp;

                const safeR = Math.min(1.5, Math.max(0.66, appliedAdj));
                const currentCap = targetProb > 0.95 ? 8 : 4;

                if (t < m) {
                    sl = Math.min(vizSdLeft * currentCap, Math.max(1, sl * safeR));
                } else {
                    sr = Math.min(vizSdRight * currentCap, Math.max(1, sr * safeR));
                }
            }
            vizSdLeft = sl; vizSdRight = sr;
        }

        const baseHeightFactor = 0.65;
        const xp = (v) => 2 + (((v - xMin) / safeRange) * 96);
        const yp = (yVal) => 100 - (yVal * 90);

        let path;
        let pointsForArea = [];

        if (hasValidKDE) {
            const points = [];
            // FIX: Defesa Ativa contra Boundary Leaks no KDE recebido
            const safeX = (val) => Math.max(domainMin, Math.min(domainMax, val));

            points.push(`${xp(safeX(kdeData[0].x))},100`);
            kdeData.forEach(p => {
                points.push(`${xp(safeX(p.x))},${yp(p.y * baseHeightFactor)}`);
            });
            points.push(`${xp(safeX(kdeData[kdeData.length - 1].x))},100`);
            path = `M ${points.join(' L ')}`;
            pointsForArea = points;
        } else {
            const pts = generateGaussianPoints(xMin, domainMax, 100, meanVal, vizSdLeft, vizSdRight, baseHeightFactor, xp, yp);
            path = `M ${pts.join(' L ')}`;
            pointsForArea = pts;
        }

        if (!pointsForArea || pointsForArea.length === 0) {
            return {
                pathData: '',
                areaPathData: '',
                failAreaPathData: '',
                range: safeRange,
                xMin,
                targetVal,
                xp,
                domainMin,
                domainMax,
                curveY: () => 100
            };
        }

        const getYAtX = (pts, xTarget) => {
            let lo = null, hi = null;
            for (const p of pts) {
                const [px, py] = p.split(',').map(Number);
                if (px <= xTarget) lo = { px, py };
                else if (!hi) { hi = { px, py }; break; }
            }
            if (!lo) return hi?.py ?? 100;
            if (!hi) return lo.py;
            if (hi.px === lo.px) return lo.py;
            const t = (xTarget - lo.px) / (hi.px - lo.px);
            return lo.py + t * (hi.py - lo.py);
        };

        const successStart = Math.max(xMin, targetVal);
        const yAtTargetVisual = hasValidKDE ? getYAtX(pointsForArea, xp(successStart)) : yp(asymmetricGaussian(successStart, meanVal, vizSdLeft, vizSdRight, baseHeightFactor));

        const areaPoints = [];
        const failPoints = [];

        areaPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        pointsForArea.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos > xp(successStart)) areaPoints.push(p);
        });
        if (areaPoints.length > 0) {
            const lastP = areaPoints[areaPoints.length - 1];
            areaPoints.push(`${lastP.split(',')[0]},100`);
            areaPoints.push(`${xp(successStart)},100`);
        }

        failPoints.push(`${pointsForArea[0].split(',')[0]},100`);
        pointsForArea.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos <= xp(successStart)) failPoints.push(p);
        });
        failPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        failPoints.push(`${xp(successStart)},100`);

        const areaPath = areaPoints.length > 2 ? `M ${areaPoints.join(' L ')} Z` : '';
        const failPath = failPoints.length > 2 ? `M ${failPoints.join(' L ')} Z` : '';

        const calculateCurveY = (x) => {
            const safeXVal = Math.max(domainMin, Math.min(domainMax, Number(x) || domainMin));
            if (hasValidKDE) return getYAtX(pointsForArea, xp(safeXVal));
            return yp(asymmetricGaussian(safeXVal, meanVal, vizSdLeft, vizSdRight, baseHeightFactor));
        };

        return {
            pathData: path, areaPathData: areaPath, failAreaPathData: failPath,
            range, xMin, targetVal, xp,
            domainMin, domainMax, curveY: calculateCurveY
        };
    }, [mean, sd, targetScore, prob, propSdLeft, propSdRight, kdeData, minScore, maxScore, unit]);

    const targetPos = xp(targetVal);
    const targetY = curveY(targetVal);

    const rawMeanVal = projectedMean ?? mean ?? 0;
    const safeMean = Math.max(domainMin, Math.min(domainMax, rawMeanVal));
    const meanPos = xp(safeMean);
    const meanY = curveY(safeMean);

    const boundedCurrent = currentMean != null && Number.isFinite(Number(currentMean))
        ? Math.max(domainMin, Math.min(domainMax, Number(currentMean)))
        : null;
    const currentPos = boundedCurrent != null ? xp(boundedCurrent) : 0;
    const currentY = boundedCurrent != null ? curveY(boundedCurrent) : 100;

    const safeLow95 = Number.isFinite(Number(low95)) ? Number(low95) : (mean ?? 0);
    const safeHigh95 = Number.isFinite(Number(high95)) ? Number(high95) : (mean ?? 0);
    const ciLowBound = Math.max(domainMin, Math.min(domainMax, Math.min(safeLow95, safeHigh95)));
    const ciHighBound = Math.max(domainMin, Math.min(domainMax, Math.max(safeLow95, safeHigh95)));
    const ciHighPx = xp(ciHighBound);
    const ciLowPx = xp(ciLowBound);

    const isTargetVisible = targetPos >= 2 && targetPos <= 98;
    const isMeanVisible = meanPos >= 2 && meanPos <= 98;
    const isCurrentVisible = boundedCurrent != null && currentPos >= 2 && currentPos <= 98;

    const resolvedLabels = useMemo(() => {
        const items = [];
        if (isTargetVisible) items.push({ id: 'target', x: targetPos });

        const hideMean = isCurrentVisible && isMeanVisible && Math.abs(currentPos - meanPos) < 2.5;
        if (!hideMean && isMeanVisible) items.push({ id: 'mean', x: meanPos });
        if (isCurrentVisible) items.push({ id: 'today', x: currentPos });

        const sorted = [...items].sort((a, b) => a.x - b.x);
        const THRESHOLD = 20;

        sorted.forEach((item, i) => {
            item.level = 0;
            if (i > 0) {
                const prev = sorted[i - 1];
                if (item.x - prev.x < THRESHOLD) {
                    item.level = prev.level + 1;
                }
            }
        });

        const res = { hideMean };
        sorted.forEach(item => res[item.id] = item.level);
        return res;
    }, [targetPos, meanPos, currentPos, isTargetVisible, isMeanVisible, isCurrentVisible]);

    // 🎯 FIX: Se a curva bater no teto do SVG (yPercent < 20), ele renderiza o label ABAIXO da linha 
    // em vez de forçar para cima e ser cortado pelo Box Model
    const getLabelTop = (yPercent, level) => {
        if (yPercent < 20) {
            return `calc(${yPercent}% + ${15 + level * 25}px)`;
        }
        return `calc(${yPercent}% - ${32 + level * 30}px)`;
    };

    const formatUnitValue = (val, u) => {
        if (u === 'horas') return formatDuration(val);
        if (u === '%') return `${formatValue(val)}%`;
        return `${Number.isInteger(val) ? val : Number(val).toFixed(2)}${u || ''}`;
    };

    return (
        <div className="relative w-full h-[220px] mt-28 mb-16 pb-6 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                // 🎯 FIX: Proteção contra Divisão por Zero em Arrays estáticos
                const hoverRange = Math.max(1e-6, range);
                const val = Math.max(xMin, Math.min(domainMax, xMin + ((percentage - 2) / 96) * hoverRange));
                pendingHoverRef.current = { x: xp(val), val };
                if (hoverRafRef.current != null) return;
                hoverRafRef.current = requestAnimationFrame(() => {
                    hoverRafRef.current = null;
                    setHover(pendingHoverRef.current);
                });
            }}
            onMouseLeave={() => {
                if (hoverRafRef.current != null) {
                    cancelAnimationFrame(hoverRafRef.current);
                    hoverRafRef.current = null;
                }
                pendingHoverRef.current = null;
                setHover(null);
            }}
        >
            {/* ... Gradientes laterais e SVG defs continuam iguais ... */}
            <div style={{
                position: 'absolute', width: '40px', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 10, left: 0,
                background: 'linear-gradient(to right, rgb(15, 23, 42), transparent)'
            }} />
            <div style={{
                position: 'absolute', width: '40px', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 10, right: 0,
                background: 'linear-gradient(to left, rgb(15, 23, 42), transparent)'
            }} />

            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                    <linearGradient id={ID.curveGrad} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                    <linearGradient id={ID.areaGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={successColor} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={successColor} stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id={ID.failGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.5)" />
                        <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
                    </linearGradient>
                    <filter id={ID.glow} x="-20%" y="-20%" width="140%" height="140%">
                        {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                    </filter>
                    <clipPath id={ID.chartClip}>
                        <rect x="0" y="-50" width="100" height="200" />
                    </clipPath>
                </defs>

                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" />

                {low95 != null && high95 != null && (
                    <rect x={ciLowPx} y="0" width={Math.max(0, ciHighPx - ciLowPx)} height="100" fill="rgba(59, 130, 246, 0.05)" className="transition-opacity duration-300 group-hover/chart:opacity-80" clipPath={`url(#${ID.chartClip})`} />
                )}

                <path d={failAreaPathData} fill={`url(#${ID.failGrad})`} stroke="#ef4444" strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-70 transition-all duration-1000" clipPath={`url(#${ID.chartClip})`} />
                <path d={areaPathData} fill={`url(#${ID.areaGrad})`} stroke={successColor} strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-80 transition-all duration-1000" clipPath={`url(#${ID.chartClip})`} />

                {/* Bottom Layer: Glow effect */}
                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="7" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="transition-all duration-500" clipPath={`url(#${ID.chartClip})`} />
                {/* Top Layer: Main curve */}
                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="transition-all duration-500" clipPath={`url(#${ID.chartClip})`} />

                {isTargetVisible && <line x1={targetPos} y1="100" x2={targetPos} y2={targetY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                {!resolvedLabels.hideMean && isMeanVisible && <line x1={meanPos} y1="100" x2={meanPos} y2={meanY} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                {isCurrentVisible && <line x1={currentPos} y1="100" x2={currentPos} y2={currentY} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
            </svg>

            <div className="absolute inset-0 pointer-events-none">
                {isTargetVisible && (
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all duration-500"
                        style={{ left: `${targetPos}%`, top: `${targetY}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }} />
                )}
                {!resolvedLabels.hideMean && isMeanVisible && (
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-500"
                        style={{ left: `${meanPos}%`, top: `${meanY}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }} />
                )}
                {isCurrentVisible && (
                    <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_12px_white] transition-all duration-500"
                        style={{ left: `${currentPos}%`, top: `${currentY}%`, transform: 'translate(-50%, -50%)', zIndex: 25 }} />
                )}
            </div>

            <div className="absolute inset-0 pointer-events-none">
                {!resolvedLabels.hideMean && isMeanVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${Math.max(4, Math.min(meanPos, 96))}%`, top: getLabelTop(meanY, resolvedLabels.mean || 0), transform: 'translateX(-50%)', zIndex: 30 }}>
                        <div className="flex flex-col items-center bg-blue-500/10 backdrop-blur-md px-2 py-0.5 rounded-xl border border-blue-500/30 shadow-lg">
                            <span className="text-[11px] font-black text-blue-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{formatUnitValue(projectedMean ?? mean ?? 0, unit)}</span>
                            <span className="text-[7px] font-black text-blue-300 uppercase tracking-widest opacity-80">Projeção</span>
                        </div>
                        <div className="w-px bg-blue-500/40 absolute top-full mt-0.5" style={{ height: `${8 + (resolvedLabels.mean || 0) * 30}px` }} />
                    </div>
                )}

                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${Math.max(4, Math.min(targetPos, 96))}%`, top: getLabelTop(targetY, resolvedLabels.target || 0), transform: 'translateX(-50%)', zIndex: 20 }}>
                        <div className="flex flex-col items-center bg-rose-500/10 backdrop-blur-md px-2 py-0.5 rounded-xl border border-rose-500/30 shadow-lg">
                             <span className="text-[11px] font-black text-rose-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{formatUnitValue(targetVal, unit)}</span>
                            <span className="text-[7px] font-black text-rose-300 uppercase tracking-widest opacity-80">Meta</span>
                        </div>
                        <div className="w-px bg-rose-500/40 absolute top-full mt-0.5" style={{ height: `${8 + (resolvedLabels.target || 0) * 30}px` }} />
                    </div>
                )}

                {isCurrentVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500 group-hover/chart:opacity-40"
                        style={{ left: `${Math.max(4, Math.min(currentPos, 96))}%`, top: getLabelTop(currentY, resolvedLabels.today || 0), transform: 'translateX(-50%)', zIndex: 40 }}>
                        <div className="flex flex-col items-center px-2 py-1 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-xl">
                            <span className="text-[11px] leading-none font-black text-white">{formatUnitValue(currentMean ?? 0, unit)}</span>
                            {resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje/Projeção</span>}
                            {!resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje</span>}
                        </div>
                        <div className="w-px bg-white/40 absolute top-full mt-0.5" style={{ height: `${10 + (resolvedLabels.today || 0) * 30}px` }} />
                    </div>
                )}
            </div>

            {hover && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div className="absolute h-full w-px bg-white/10" style={{ left: `${hover.x}%` }} />
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_white]" style={{ left: `${hover.x}%`, top: `${Math.max(0, curveY(hover.val))}%`, transform: 'translate(-50%, -50%)' }} />
                    
                    {/* 🎯 FIX: Topo Seguro para a Tooltip, protegendo-a de sumir no topo da tela (Math.max(30)) */}
                    <div className="absolute bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/40 text-white px-2.5 py-1.5 rounded-xl shadow-2xl flex flex-col items-center min-w-[90px]" 
                        style={{ left: `${Math.max(12, Math.min(88, hover.x))}%`, top: `${Math.max(30, curveY(hover.val) - 5)}%`, transform: 'translate(-50%, -100%)' }}>
                        
                        <span className="text-[15px] font-black tracking-tight leading-none">{formatUnitValue(hover.val, unit)}</span>
                        <div className="flex items-center gap-1 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${hover.val >= targetVal ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]' : 'bg-slate-500'}`} />
                            <span className={`text-[7.5px] font-black uppercase tracking-widest ${hover.val >= targetVal ? 'text-emerald-400' : 'text-slate-500'}`}>{hover.val >= targetVal ? 'Zona de Sucesso' : 'Abaixo da Meta'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute bottom-0 inset-x-0 h-4 pointer-events-none">
                {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
                    const tickVal = domainMin + f * (domainMax - domainMin);
                    const pct = 2 + f * 96;
                    return (
                        <span key={f} className="absolute text-[10px] font-black text-slate-400 uppercase tracking-tighter" style={{ left: `${pct}%`, transform: f === 0 ? 'translateX(0%)' : f === 1.0 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
                            {formatUnitValue(tickVal, unit)}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default GaussianPlot;
```

---

## `src/hooks/useMonteCarloStats.js`

<a id="src-hooks-usemontecarlostats-js"></a>

```javascript
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { computeNonLinearTrend } from '../engine/projection';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { normalCDF_complement } from '../engine/math/gaussian.js';
import {
  shrinkProbabilityToNeutral,
  recordPredictionEvent,
  backfillObservedFromSimulados,
  computeCalibrationSummary
} from '../utils/calibration.js';
import {
  getConfidenceTier,
  buildHumanExplanation,
  detectPerformanceDrift,
  humanizeVolatility,
  validatePrediction
} from '../utils/explanationEngine.js';
import { getFlashcardImmunity } from '../utils/analytics.js';
import {
  VOLATILITY_REGULARIZATION_FACTOR,
  INFORMATIVE_PRIOR_MAX_STRENGTH,
  MAX_CALIBRATION_PENALTY,
  CALIBRATION_LAMBDA_DAYS,
  sanitizeWeightUnit,
  regularizeVolatility,
  computeCalibrationPenalty,
  generateAnalyticsStats
} from '../engine/analyticsStats.js';

const EMPTY_ARRAY = Object.freeze([]);
const BASE_SIMULATIONS = 5000;
const LOG_DAMPING_FACTOR = 45;

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// FIX: encolhimento simétrico de probabilidade extrema em direção ao neutro
const shrinkToNeutral = (p, factor, neutral = 50) => {
  const safeP = Number.isFinite(p) ? p : neutral;
  const safeFactor = clamp(factor, 0, 1);
  return neutral + (safeP - neutral) * (1 - safeFactor);
};

export function useMonteCarloStats({
  categories,
  goalDate,
  targetScore,
  timeIndex,
  timelineDates,
  minScore,
  maxScore,
  effectiveSimulateToday,
  simuladoRows: propSimuladoRows
}) {
  const activeId = useAppStore(state => state.appState?.activeId);

  const weights = useAppStore(useShallow(state => state.appState?.contests?.[activeId]?.mcWeights || {}));
  const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);

  const mcHistory = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.monteCarloHistory;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const flashcardDecks = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.flashcardDecks;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const historicalCutoffs = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.historicalCutoffs;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const contest = useAppStore(state => state.appState?.contests?.[activeId]);

  const calibrationEvents = useAppStore(useShallow(state => {
    const evs = state.appState?.contests?.[activeId]?.calibrationEvents;
    return Array.isArray(evs) ? evs : Object.values(evs || {});
  }));

  const examDurationMinutes = useAppStore(state => state.appState?.contests?.[activeId]?.examDurationMinutes || 240);
  const defaultExamTotalQuestions = useAppStore(state => state.appState?.contests?.[activeId]?.examTotalQuestions || 100);

  const rawSimuladoRows = useMemo(() => {
    if (propSimuladoRows) return propSimuladoRows;
    return contest?.simuladoRows || [];
  }, [propSimuladoRows, contest?.simuladoRows]);

  const calibrationSummary = useMemo(() => {
    if (calibrationEvents.length < 3) return null;

    try {
      return computeCalibrationSummary(calibrationEvents, { bins: 6 });
    } catch {
      return null;
    }
  }, [calibrationEvents]);

  const modelHealth = useMemo(() => {
    if (!calibrationSummary) return 0.5;

    const brierHealth = Math.max(0, Math.min(1, 1 - (calibrationSummary.avgBrier - 0.12) / 0.2));
    const trendHealth = calibrationSummary.trend === 'improving'
      ? 0.2
      : (calibrationSummary.trend === 'degrading' ? -0.2 : 0);

    return Math.max(0.1, Math.min(1, (brierHealth + 0.5 + trendHealth) / 1.5));
  }, [calibrationSummary]);

  const modelWeight = useMemo(() => {
    if (!calibrationSummary || !calibrationSummary.avgBrier) return 0.25;

    const brier = Math.max(0.12, Math.min(0.3, calibrationSummary.avgBrier));
    return Math.max(0.1, Math.min(0.45, 0.25 + (0.18 - brier) * 2.5));
  }, [calibrationSummary]);

  const dynamicSimulations = useMemo(() => {
    let sims = BASE_SIMULATIONS;

    if (calibrationSummary && calibrationSummary.avgBrier > 0.2) {
      sims = Math.min(15000, BASE_SIMULATIONS + Math.floor((calibrationSummary.avgBrier - 0.18) * 20000));
    }

    if (modelHealth > 0.8) {
      sims = Math.max(2000, Math.floor(sims * 0.8));
    } else if (modelHealth < 0.4) {
      sims = Math.min(20000, Math.floor(sims * 1.3));
    }

    return sims;
  }, [calibrationSummary, modelHealth]);

  const dynamicSimulationsRef = useRef(dynamicSimulations);
  useEffect(() => {
    dynamicSimulationsRef.current = dynamicSimulations;
  }, [dynamicSimulations]);

  const modelWeightRef = useRef(modelWeight);
  useEffect(() => {
    modelWeightRef.current = modelWeight;
  }, [modelWeight]);

  const setWeights = useAppStore(state => state.setMonteCarloWeights);
  const recordMonteCarloSnapshot = useAppStore(state => state.recordMonteCarloSnapshot);
  const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

  const activeCategories = useMemo(() =>
    categories.filter(c => {
      const h = c.simuladoStats?.history;
      const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
      return hLen > 0;
    }),
    [categories]
  );

  const getEqualWeights = useCallback(() => {
    if (activeCategories.length === 0) return {};

    const newWeights = {};
    activeCategories.forEach(cat => {
      newWeights[cat.id || cat.name] = 1;
    });

    return newWeights;
  }, [activeCategories]);

  const effectiveWeights = useMemo(() => {
    if (equalWeightsMode) return getEqualWeights();
    if (!weights) return getEqualWeights();

    const weightsMap = {};

    activeCategories.forEach(cat => {
      const stored = weights[cat.id || cat.name];
      const w = sanitizeWeightUnit(stored);
      weightsMap[cat.id || cat.name] = (stored !== undefined && stored !== null) ? Math.max(0, w) : 1;
    });

    return weightsMap;
  }, [equalWeightsMode, weights, activeCategories, getEqualWeights]);

  const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
  const [debouncedWeights, setDebouncedWeights] = useState(() => effectiveWeights);

  const lastRecordedGlobalPredRef = useRef('');
  const lastRecordedSubjectPredsRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
    return () => clearTimeout(timer);
  }, [targetScore]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
    return () => clearTimeout(timer);
  }, [effectiveWeights]);

  const projectDays = useMemo(() => {
    if (effectiveSimulateToday) return 0;
    if (!goalDate) return 30;

    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (timeIndex >= 0 && timeIndex < timelineDates.length) {
      currentDate = new Date(timelineDates[timeIndex] + 'T12:00:00');
    }

    let goal;
    if (typeof goalDate === 'string') {
      goal = normalizeDate(goalDate);
    } else {
      goal = new Date(goalDate);
    }

    goal.setHours(0, 0, 0, 0);

    if (isNaN(goal.getTime())) return 30;

    const diffTime = goal.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const safeDays = diffDays > 0 ? diffDays : 0;

    return Math.min(3650, safeDays);
  }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

  const pureStatsData = useMemo(() => {
    return generateAnalyticsStats({
      categories,
      debouncedWeights,
      timeIndex,
      timelineDates,
      minScore,
      maxScore,
      simuladoRows: rawSimuladoRows
    });
  }, [categories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore, rawSimuladoRows]);

  const calibrationPenalty = useMemo(() => {
    let pen = computeCalibrationPenalty(
      mcHistory,
      pureStatsData?.globalHistory,
      maxScore,
      calibrationSummary
    );

    if (modelHealth < 0.6) {
      pen = Math.min(MAX_CALIBRATION_PENALTY, pen * (1 + (0.6 - modelHealth)));
    }

    return pen;
  }, [mcHistory, pureStatsData?.globalHistory, maxScore, calibrationSummary, modelHealth]);

  const statsData = useMemo(() => {
    if (!pureStatsData) return null;

    if (calibrationPenalty <= 0) {
      return { ...pureStatsData, calibrationPenalty: 0 };
    }

    const aleatoricFloor = maxScore * 0.02;

    const epistemicPooled = Math.max(0, pureStatsData.pooledSD - aleatoricFloor);
    const calibratedPooledSD = aleatoricFloor + (epistemicPooled * (1 + calibrationPenalty * 2.5));

    const epistemicDaily = Math.max(0, pureStatsData.dailySD - aleatoricFloor);
    const calibratedDailySD = aleatoricFloor + (epistemicDaily * (1 + calibrationPenalty * 2.5));

    return {
      ...pureStatsData,
      pooledSD: calibratedPooledSD,
      dailySD: calibratedDailySD,
      rawPooledSD: pureStatsData.pooledSD,
      calibrationPenalty
    };
  }, [pureStatsData, calibrationPenalty, maxScore]);

  const pureStatsHash = pureStatsData?.statsHash || 'null';

  const pureStatsDataRef = useRef(pureStatsData);
  useEffect(() => {
    pureStatsDataRef.current = pureStatsData;
  }, [pureStatsData]);

  const { runAnalysis } = useMonteCarloWorker();
  const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

  useEffect(() => {
    if (!rawSimuladoRows || rawSimuladoRows.length === 0) return;
    if (!calibrationEvents || calibrationEvents.length === 0) return;

    try {
      const backfilled = backfillObservedFromSimulados(
        calibrationEvents,
        rawSimuladoRows,
        statsData?.categoryStats || [],
        maxScore
      );

      const changed = JSON.stringify(backfilled.slice(-3)) !== JSON.stringify(calibrationEvents.slice(-3));

      if (changed) {
        const setD = useAppStore.getState().setData;
        if (setD) {
          setD(c => ({ ...c, calibrationEvents: backfilled }));
        }
      }
    } catch {
      // ignore
    }
  }, [rawSimuladoRows, maxScore, calibrationEvents, statsData?.categoryStats]);

  useEffect(() => {
    const pureStatsData = pureStatsDataRef.current;
    if (!pureStatsData) return;

    let totalPoints = 0;
    pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
    if (totalPoints < 1) return;

    let cancelled = false;

    const isFuture = projectDays > 0;
    const domain = Math.max(1e-6, maxScore - minScore);

    const { globalImmunityFactor, subjectImmunityMap } = getFlashcardImmunity(flashcardDecks);

    const applyConservativeTrendCap = (result) => {
      if (
        result &&
        result.trendType === 'log_time_available' &&
        Number.isFinite(result.projectedMean) &&
        Number.isFinite(result.currentMean) &&
        result.projectedMean > result.currentMean
      ) {
        // FIX: remove o boost otimista de +10% e aplica apenas teto conservador
        result.projectedMean = Math.min(
          result.projectedMean,
          result.currentMean + (domain * 0.15)
        );
      }

      return result;
    };

    const doAnalysis = async () => {
      try {
        let result;

        if (isFuture && pureStatsData.globalHistory?.length > 0) {
          const regularizedSD = regularizeVolatility(
            pureStatsData.dailySD,
            projectDays,
            pureStatsData.globalHistory.length,
            domain
          );

          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.volatility ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScore,
              minScore: minScore,
              immunityFactor: immunity
            };
          });

          let totalGlobalTimeSpent = 0;
          let totalGlobalTimedQuestions = 0;

          pureStatsData.categoryStats.forEach(c => {
            const histArray = (c.simuladoStats && Array.isArray(c.simuladoStats.history))
              ? c.simuladoStats.history
              : [];

            histArray.forEach(h => {
              if (h.timeSpent && h.timedQuestoes) {
                totalGlobalTimeSpent += Number(h.timeSpent);
                totalGlobalTimedQuestions += Number(h.timedQuestoes);
              }
            });
          });

          const globalAvgSeconds = totalGlobalTimedQuestions > 0
            ? (totalGlobalTimeSpent / totalGlobalTimedQuestions)
            : 0;

          const projectedTotalTimeSeconds = defaultExamTotalQuestions * globalAvgSeconds;

          result = await runAnalysis({
            values: pureStatsData.globalHistory,
            dates: pureStatsData.globalHistory.map(h => h.date),
            meta: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            projectionDays: projectDays,
            forcedVolatility: regularizedSD,
            forcedBaseline: pureStatsData.bayesianMean,
            currentMean: pureStatsData.bayesianMean,
            minScore,
            maxScore,
            subjects: subjectsOpts,
            projectedTotalTimeSeconds,
            examDurationMinutes,
            flashcardImmunity: globalImmunityFactor
          });
        } else {
          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.bayesianSd ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScore,
              minScore: minScore,
              immunityFactor: immunity
            };
          });

          const normalPayload = {
            mode: 'normal',
            mean: pureStatsData.bayesianMean,
            sd: pureStatsData.pooledSD,
            targetScore: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            currentMean: pureStatsData.bayesianMean,
            bayesianCI: pureStatsData.bayesianCI,
            minScore,
            maxScore,
            subjects: subjectsOpts,
            flashcardImmunity: globalImmunityFactor
          };

          // Compatibilidade dupla:
          // 1) tenta API por objeto
          // 2) se não retornar probabilidade válida, tenta API posicional antiga
          result = await runAnalysis(normalPayload);

          if (!result || result.probability == null) {
            // ✅ LOTE-01 FIX: fallback síncrono com a MESMA API de objeto
            result = simulateNormalDistribution({ ...normalPayload, historicalCutoffs });
          }
        }

        if (!cancelled) {
          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          setSimulationData({ status: 'ready', data: result });

          try {
            const setDataFn = useAppStore.getState().setData;

            if (setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent(null, {
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      } catch (err) {
        console.warn('[MC Worker] Simulation failed, using sync fallback:', err);

        if (!cancelled) {
          let result;

          const regularizedSD = isFuture && pureStatsData.globalHistory?.length > 0
            ? regularizeVolatility(
                pureStatsData.dailySD,
                projectDays,
                pureStatsData.globalHistory.length,
                domain
              )
            : pureStatsData.dailySD;

          if (isFuture && pureStatsData.globalHistory?.length > 0) {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.volatility ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScore,
                minScore: minScore,
                immunityFactor: immunity
              };
            });

            result = runMonteCarloAnalysis({
              values: pureStatsData.globalHistory,
              dates: pureStatsData.globalHistory.map(h => h.date),
              meta: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              projectionDays: projectDays,
              forcedVolatility: regularizedSD,
              forcedBaseline: pureStatsData.bayesianMean,
              currentMean: pureStatsData.bayesianMean,
              minScore,
              maxScore,
              subjects: subjectsOpts,
              simuladoRows: rawSimuladoRows,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor
            });
          } else {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.bayesianSd ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScore,
                minScore: minScore,
                immunityFactor: immunity
              };
            });

            result = simulateNormalDistribution({
              mean: pureStatsData.bayesianMean,
              sd: pureStatsData.pooledSD,
              targetScore: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              currentMean: pureStatsData.bayesianMean,
              bayesianCI: pureStatsData.bayesianCI,
              historicalCutoffs,
              subjects: subjectsOpts,
              minScore,
              maxScore,
              simuladoRows: rawSimuladoRows,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historyLength: pureStatsData.globalHistory?.length || 0
            });
          }

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          setSimulationData({ status: 'ready', data: result });

          try {
            const setDataFn = useAppStore.getState().setData;

            if (setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent(null, {
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      }
    };

    const timerId = setTimeout(doAnalysis, 150);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [
    pureStatsHash,
    runAnalysis,
    debouncedTarget,
    projectDays,
    minScore,
    maxScore,
    historicalCutoffs,
    rawSimuladoRows,
    statsData?.estimatedRho,
    examDurationMinutes,
    defaultExamTotalQuestions,
    flashcardDecks
  ]);

  const probabilityData = useMemo(() => {
    const rawProbability = simulationData?.data?.probability ?? 0;

    // FIX: neutral da probabilidade deve ser 50%, não a média bayesiana da nota
    let adjustedProb = shrinkProbabilityToNeutral(rawProbability, calibrationPenalty, 50, 0.5);

    let confFactor = 0;

    if (
      simulationData?.data?.ciConformalLow != null &&
      simulationData?.data?.ciConformalHigh != null
    ) {
      const confWidth = simulationData.data.ciConformalHigh - simulationData.data.ciConformalLow;

      if (confWidth > 0) {
        confFactor = Math.min(0.2, confWidth / (maxScore * 1.2)) * (1 - modelWeight);

        // FIX: shrink simétrico (tanto >50 quanto <50)
        adjustedProb = shrinkToNeutral(adjustedProb, confFactor, 50);
      }
    }

    let finalProb = adjustedProb;

    if (modelHealth > 0.7) {
      const trust = (modelHealth - 0.7) / 0.3;
      finalProb = finalProb * (1 - trust * 0.5) + (rawProbability * (1 - calibrationPenalty * 0.5)) * (trust * 0.5);
    }

    // FIX: saúde do modelo não deve mascarar risco crítico puxando tudo para 50.
    // Aplicamos apenas uma suavização leve quando a saúde está baixa.
    let healthProb = finalProb;

    if (modelHealth < 0.5) {
      const healthFactor = (0.5 - modelHealth) / 0.5;
      healthProb = shrinkToNeutral(healthProb, healthFactor * 0.15, 50);
    }

    const prob = clamp(healthProb, 0, 100);

    // FIX: expor incerteza e limites para decisão conservadora
    const uncertainty =
      ((1 - modelHealth) * 12) +
      (calibrationPenalty * 35) +
      (confFactor * 20);

    const probabilityLower = clamp(prob - uncertainty, 0, 100);
    const probabilityUpper = clamp(prob + uncertainty, 0, 100);

    const healthAdjustedProb = clamp(
      prob * modelHealth + (50 * (1 - modelHealth)),
      0,
      100
    );

    const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const pMean = clamp(rawProjectedMean, minScore, maxScore);

    const cMean = (
      pureStatsData?.bayesianMean === null ||
      pureStatsData?.bayesianMean === undefined ||
      pureStatsData?.bayesianMean === ''
    )
      ? (simulationData?.data?.currentMean ?? pMean)
      : (
          Number.isFinite(Number(pureStatsData.bayesianMean))
            ? Number(pureStatsData.bayesianMean)
            : (simulationData?.data?.currentMean ?? pMean)
        );

    return {
      probability: prob,
      probabilityLower,
      probabilityUpper,
      projectedMean: pMean,
      currentMean: cMean,
      healthAdjustedProb,
      rawProbability,
      uncertainty
    };
  }, [
    simulationData,
    pureStatsData,
    maxScore,
    minScore,
    calibrationPenalty,
    modelHealth,
    modelWeight
  ]);

  const probabilityDataResult = probabilityData;

  const probability = probabilityDataResult.probability;
  const probabilityLower = probabilityDataResult.probabilityLower;
  const probabilityUpper = probabilityDataResult.probabilityUpper;
  const projectedMean = probabilityDataResult.projectedMean;
  const currentMean = probabilityDataResult.currentMean;
  const rawProbability = probabilityDataResult.rawProbability;
  const probabilityUncertainty = probabilityDataResult.uncertainty;

  const healthAdjustedProb = probabilityDataResult.healthAdjustedProb ?? clamp(
    (probabilityDataResult.probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
    0,
    100
  );

  const effectiveSimulationData = useMemo(() => {
    if (!statsData) return { status: 'waiting', missing: 'data' };

    let totalPoints = 0;
    statsData.categoryStats.forEach(cat => {
      totalPoints += cat.n || 1;
    });

    if (totalPoints < 1) return { status: 'waiting', missing: 'count', count: totalPoints };

    const base = simulationData;

    if (base?.status === 'ready' && base.data) {
      return {
        ...base,
        data: {
          ...base.data,
          calibrationSummary,
          diagnostics: {
            ...(base.data.diagnostics || {}),
            calibrationSummary,
            modelHealth,
            modelWeight
          },
          healthAdjustedProb: base.data.healthAdjustedProb ?? healthAdjustedProb,
          probabilityLower: base.data.probabilityLower ?? probabilityLower,
          probabilityUpper: base.data.probabilityUpper ?? probabilityUpper
        }
      };
    }

    return base;
  }, [
    statsData,
    simulationData,
    calibrationSummary,
    modelHealth,
    modelWeight,
    healthAdjustedProb,
    probabilityLower,
    probabilityUpper
  ]);

  const perSubjectProbs = useMemo(() => {
    if (!statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

    return statsData.categoryStats
      .filter(cat => cat.weight > 0)
      .map(cat => {
        const catMaxScore = Number(cat.maxScore) || maxScore;
        const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;

        const currentBaseline = cat.bayesianMean ?? cat.mean;

        const trendPer30Days = cat.trendValue || cat.trend || 0;
        const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
        const dailyTrend = trendPer30Days / 30;

        let totalTrendProjection = dailyTrend * projectedDaysAmortized;

        try {
          const simHistory = cat.simuladoStats?.history || cat.history || [];

          if (Array.isArray(simHistory) && simHistory.length >= 4) {
            const nl = computeNonLinearTrend(simHistory, catMaxScore);

            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
              const nlWeight = modelWeight;
              const nlProjection = nl.slope * (projectedDaysAmortized / 30);
              totalTrendProjection = totalTrendProjection * (1 - nlWeight) + nlProjection * nlWeight;
            }
          }
        } catch {
          // ignore
        }

        // FIX: reduzir projeção quando a tendência é fraca perto da incerteza
        const trendUncertainty = Number(cat.bayesianSd ?? cat.sd ?? 0);
        const trendSignificance = Math.abs(trendPer30Days) / Math.max(1e-6, trendUncertainty);

        if (trendSignificance < 0.5) {
          totalTrendProjection *= 0.5;
        }

        // FIX: limitar projeção de tendência a ±15% do domínio da disciplina
        totalTrendProjection = clamp(
          totalTrendProjection,
          -0.15 * catMaxScore,
          0.15 * catMaxScore
        );

        const baseline = (!effectiveSimulateToday && projectDays > 0)
          ? clamp(currentBaseline + totalTrendProjection, catMinScore, catMaxScore)
          : currentBaseline;

        // ✅ LOTE-01 FIX: meta projetada no INTERVALO real, respeitando minScore
        const globalRange = Math.max(1e-9, Number(maxScore) - Number(minScore));
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);
        const targetRatio = clamp((Number(debouncedTarget) - Number(minScore)) / globalRange, 0, 1);
        const subjectTarget = clamp(catMinScore + targetRatio * catRange, catMinScore, catMaxScore);

        const result = simulateNormalDistribution({
          mean: baseline,
          sd: cat.bayesianSd ?? cat.sd,
          targetScore: subjectTarget,   // ✅ LOTE-01 FIX
          simulations: Math.min(dynamicSimulations || 2000, 3000),
          categoryName: cat.name,
          minScore: catMinScore,
          maxScore: catMaxScore,
          simuladoRows: rawSimuladoRows,
          subjects: [{ name: cat.name }],
          historyLength: cat.n || 0,
          bayesianCI: cat.bayesianCI || null
        });

        const subjDiag = {
          ...(result.diagnostics || {}),
          trendType: result.trendType || 'linear',
          calibrationSummary,
          modelHealth,
          modelWeight
        };

        let subjProb = result.probability;
        let subjConfFactor = 0;

        if (result.ciConformalLow != null && result.ciConformalHigh != null) {
          const subjConfWidth = result.ciConformalHigh - result.ciConformalLow;

          if (subjConfWidth > 0) {
            subjConfFactor = Math.min(0.15, subjConfWidth / (catMaxScore * 1.5)) * (1 - modelWeight);

            if (modelHealth < 0.6) {
              subjConfFactor = Math.min(0.25, subjConfFactor * 1.4);
            }

            // FIX: shrink simétrico também por disciplina
            subjProb = shrinkToNeutral(subjProb, subjConfFactor, 50);
          }
        }

        if (modelHealth > 0.7) {
          const trust = (modelHealth - 0.7) / 0.3;
          subjProb = subjProb * (1 - trust * 0.4) + result.probability * (trust * 0.4);
        }

        const subjUncertainty =
          ((1 - modelHealth) * 10) +
          (calibrationPenalty * 30) +
          (subjConfFactor * 18);

        return {
          name: cat.name,
          prob: clamp(subjProb, 0, 100),
          probabilityLower: clamp(subjProb - subjUncertainty, 0, 100),
          probabilityUpper: clamp(subjProb + subjUncertainty, 0, 100),
          mean: baseline,
          trend: cat.trend,
          diagnostics: subjDiag,
          ciConformalLow: result.ciConformalLow,
          ciConformalHigh: result.ciConformalHigh,
          ciLow: result.ciConformalLow ?? result.ci95Low,
          ciHigh: result.ciConformalHigh ?? result.ci95High,
          modelHealth,
          modelWeight,
          healthAdjustedProb: clamp(
            subjProb * modelHealth + (50 * (1 - modelHealth)),
            0,
            100
          )
        };
      })
      .sort((a, b) => a.prob - b.prob);
  }, [
    statsData,
    debouncedTarget,
    simulationData?.status,
    maxScore,
    effectiveSimulateToday,
    projectDays,
    minScore,
    modelHealth,
    modelWeight,
    rawSimuladoRows,
    calibrationSummary,
    dynamicSimulations,
    calibrationPenalty
  ]);

  useEffect(() => {
    if (!perSubjectProbs || perSubjectProbs.length === 0 || simulationData?.status !== 'ready') return;

    try {
      const hash = `${pureStatsHash}-${debouncedTarget}`;
      if (lastRecordedSubjectPredsRef.current === hash) return;

      lastRecordedSubjectPredsRef.current = hash;

      const setDataFn = useAppStore.getState().setData;
      if (!setDataFn) return;

      perSubjectProbs.forEach(subj => {
        if (subj.prob == null) return;

        const ev = recordPredictionEvent(null, {
          timestamp: Date.now(),
          probability: Number(subj.prob) / 100,
          targetScore: debouncedTarget,
          sims: 500,
          category: subj.name || 'subject',
          effectiveN: subj.diagnostics?.effectiveN
        });

        if (ev) {
          setDataFn(contest => {
            const evs = Array.isArray(contest.calibrationEvents)
              ? [...contest.calibrationEvents]
              : [];

            evs.push(ev);

            return {
              ...contest,
              calibrationEvents: evs.slice(-200)
            };
          });
        }
      });
    } catch {
      // ignore
    }
  }, [perSubjectProbs, debouncedTarget, simulationData?.status, pureStatsHash]);

  const derivedMetrics = useMemo(() => {
    let sd = simulationData?.data?.sd ?? 0;
    let sdLeft = simulationData?.data?.sdLeft ?? sd;
    let sdRight = simulationData?.data?.sdRight ?? sd;

    let ci95Low = simulationData?.data?.ciConformalLow ?? simulationData?.data?.ci95Low ?? 0;
    let ci95High = simulationData?.data?.ciConformalHigh ?? simulationData?.data?.ci95High ?? 0;

    if (simulationData?.data?.ciConformalLow != null) {
      ci95Low = simulationData.data.ciConformalLow;
      ci95High = simulationData.data.ciConformalHigh;
    }

    const effectiveDrift = simulationData?.data?.diagnostics?.effectiveDriftSlope ?? (simulationData?.data?.drift / 30 || 0);

    if (calibrationPenalty > 0) {
      const ciMid = (ci95Low + ci95High) / 2;
      const ciExpand = 1 + (calibrationPenalty * 2.5);

      ci95Low = Math.max(minScore, ciMid - ((ciMid - ci95Low) * ciExpand));
      ci95High = Math.min(maxScore, ciMid + ((ci95High - ciMid) * ciExpand));

      sd = sd * (1 + calibrationPenalty * 2.5);
      sdLeft = sdLeft * (1 + calibrationPenalty * 2.5);
      sdRight = sdRight * (1 + calibrationPenalty * 2.5);
    }

    const domainWidth = maxScore - minScore;
    const icWidth = ci95High - ci95Low;

    const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
    const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));

    const pAdjusted = probability;

    // FIX: piso mínimo de volatilidade para evitar probabilidade degenerada
    const safeSdForTrend = Math.max(
      Number.isFinite(sd) && sd > 0 ? sd : 1,
      maxScore * 0.02
    );

    const pTrend = normalCDF_complement((debouncedTarget - projectedMean) / safeSdForTrend) * 100;

    const nHistory = Array.isArray(statsData?.globalHistory)
      ? statsData.globalHistory.length
      : (timelineDates?.length || 0);

    const confidenceObj = getConfidenceTier({
      calibrationPenalty,
      volatility: sd,
      sampleSize: nHistory
    });

    const explanations = buildHumanExplanation({
      calibrationPenalty,
      volatility: sd,
      trend: (projectedMean - currentMean),
      confidenceTier: confidenceObj.tier,
      intervalWidth: ci95High - ci95Low
    });

    const driftAlerts = detectPerformanceDrift({
      recentMean: currentMean,
      baselineMean: (statsData?.bayesianMean || currentMean),
      recentVolatility: sdLeft
    });

    const humanVol = humanizeVolatility(sdLeft);

    try {
      validatePrediction({
        probability: pAdjusted,
        interval: { low: ci95Low, high: ci95High },
        confidenceTier: confidenceObj.tier
      });
    } catch (e) {
      console.error('Monte Carlo Validation Error:', e);
    }

    return {
      sd,
      sdLeft,
      sdRight,
      ci95Low,
      ci95High,
      saturation,
      projectionConfidence,
      pAdjusted,
      pTrend,
      probability: pAdjusted,
      probabilityLower,
      probabilityUpper,
      rawProbability,
      probabilityUncertainty,
      confidenceTier: confidenceObj.label,
      confidenceColor: confidenceObj.tier === 'HIGH'
        ? 'text-emerald-400'
        : confidenceObj.tier === 'MEDIUM'
          ? 'text-amber-400'
          : 'text-rose-400',
      confidenceObj,
      explanations,
      humanVol,
      driftAlerts,
      ciConformalLow: simulationData?.data?.ciConformalLow,
      ciConformalHigh: simulationData?.data?.ciConformalHigh,
      trendType: simulationData?.data?.trendType || 'linear',
      calibrationSummary,
      effectiveDrift,
      modelHealth,
      modelWeight
    };
  }, [
    simulationData?.data,
    maxScore,
    minScore,
    debouncedTarget,
    projectedMean,
    calibrationPenalty,
    currentMean,
    statsData,
    timelineDates,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    probabilityUncertainty,
    calibrationSummary,
    modelHealth,
    modelWeight
  ]);

  useMonteCarloHistoryRecorder({
    activeId,
    simulationData,
    timeIndex,
    timelineDates,
    effectiveSimulateToday,
    projectDays,
    goalDate,
    debouncedTarget,
    currentMean,
    projectedMean,
    pAdjusted: derivedMetrics.pAdjusted,
    ci95Low: derivedMetrics.ci95Low,
    ci95High: derivedMetrics.ci95High,
    calibrationSummary: derivedMetrics.calibrationSummary,
    trendType: derivedMetrics.trendType,
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight,
    recordMonteCarloSnapshot
  });

  const memoizedStats = useMemo(() => ({
    statsData,
    simulationData: effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb: healthAdjustedProb ?? clamp(
      (probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
      0,
      100
    ),
    ...derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    trendType: derivedMetrics.trendType || 'linear',
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight
  }), [
    statsData,
    effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb,
    derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    modelHealth
  ]);

  return useMemo(() => ({
    ...memoizedStats,
    isFlashing: false
  }), [memoizedStats]);
}

function useMonteCarloHistoryRecorder({
  activeId,
  simulationData,
  timeIndex,
  timelineDates,
  effectiveSimulateToday,
  projectDays,
  goalDate,
  debouncedTarget,
  currentMean,
  projectedMean,
  pAdjusted,
  ci95Low,
  ci95High,
  calibrationSummary,
  trendType,
  effectiveDrift,
  modelHealth,
  modelWeight,
  recordMonteCarloSnapshot
}) {
  const lastRecordTime = useRef(0);
  const lastRecordHash = useRef('');

  useEffect(() => {
    const prob = Number.isFinite(pAdjusted) ? pAdjusted : 0;
    const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

    if (
      simulationData?.status === 'ready' &&
      Number.isFinite(prob) &&
      prob >= 0 &&
      !effectiveSimulateToday &&
      !isTimeTraveling &&
      activeId
    ) {
      const doRecord = () => {
        const today = getDateKey(new Date());
        const currentProb = Number(prob.toFixed(1));

        const hash = `${activeId}-${today}-${currentProb}-${debouncedTarget.toFixed(1)}`;
        if (hash === lastRecordHash.current) return;

        const history = useAppStore.getState().appState?.contests?.[activeId]?.monteCarloHistory || [];
        const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;

        const currentTarget = Number(debouncedTarget.toFixed(1));
        const existingProb = Number((existing?.probability ?? existing?.prob ?? 0).toFixed(1));
        const existingTarget = Number((existing?.target ?? 0).toFixed(1));

        const targetChanged = !existing || Math.abs(existingTarget - currentTarget) > 0.05;

        const isCICollapsed = existing && Number.isFinite(existing.mean) && Number.isFinite(existing.ci95Low)
          ? Math.abs(existing.mean - existing.ci95Low) < 0.01
          : false;

        const needsUpdate = !existing || existing.ci95Low === undefined || (isCICollapsed && projectDays > 0);
        const probChanged = existing && Math.abs(existingProb - currentProb) > 0.3;

        if (probChanged || targetChanged || needsUpdate) {
          lastRecordTime.current = Date.now();
          lastRecordHash.current = hash;

          recordMonteCarloSnapshot(today, prob, {
            mean: Number(currentMean.toFixed(2)),
            projectedMean: Number(projectedMean.toFixed(2)),
            ci95Low: Number(ci95Low.toFixed(2)),
            ci95High: Number(ci95High.toFixed(2)),
            target: Number(debouncedTarget.toFixed(2)),
            targetDate: goalDate,
            trendType: trendType || 'linear',
            effectiveDrift: Number((effectiveDrift || 0).toFixed(4)),
            calibrationBrier: calibrationSummary ? Number(calibrationSummary.avgBrier || 0).toFixed(4) : null,
            modelHealth: Number((modelHealth || 0.5).toFixed(3)),
            modelWeight: Number((modelWeight || 0.25).toFixed(3))
          });
        }
      };

      const now = Date.now();
      const timeSinceLast = now - lastRecordTime.current;

      if (timeSinceLast < 5000) {
        const timerId = setTimeout(doRecord, 5000 - timeSinceLast);
        return () => clearTimeout(timerId);
      } else {
        doRecord();
      }
    }
  }, [
    simulationData?.status,
    effectiveSimulateToday,
    recordMonteCarloSnapshot,
    timeIndex,
    timelineDates,
    currentMean,
    projectedMean,
    debouncedTarget,
    activeId,
    ci95Low,
    ci95High,
    pAdjusted,
    goalDate,
    projectDays,
    calibrationSummary,
    effectiveDrift,
    modelHealth,
    modelWeight,
    trendType
  ]);
}
```

---

## `src/utils/chartDataMappers.js`

<a id="src-utils-chartdatamappers-js"></a>

```javascript
/**
 * Mapper functions to transform application state into chart-ready data
 */
import { normalizeDate, getDateKey } from './dateHelper.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toFiniteNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const sanitizeMinutes = (value) => Math.min(720, Math.max(0, toFiniteNumber(value, 0)));

const toSafeDate = (value) => {
    if (!value) return null;
    
    // Suporte a Firebase Timestamp
    if (typeof value === 'object' && (value.seconds != null || value._seconds != null)) {
        const secs = value.seconds != null ? value.seconds : value._seconds;
        return new Date(secs * 1000);
    }
    
    const parsed = normalizeDate(value);
    const date = parsed || new Date(value);
    return Number.isFinite(date?.getTime()) ? date : null;
};

/**
 * Maps categories and their tasks to retention analysis data
 * @param {Array} categories 
 * @returns {Array} [{ nomeTopico, diasSemRevisao, nivelCritico }]
 */
export const mapRetentionData = (categories = []) => {
    const data = [];
    const now = Date.now();
    const safeCategories = Array.isArray(categories) ? categories : [];
    
    // Process top 10 most critical categories or items
    safeCategories.forEach(cat => {
        // Add categories with study history
        if (cat.lastStudiedAt) {
            // FIX BUG N: normalizeDate evita que YYYY-MM-DD seja interpretado como UTC midnight
            const lastDate = toSafeDate(cat.lastStudiedAt);
            if (!lastDate) return;

            // CORREÇÃO: Math.max(0, ...) impede que relógios adiantados
            // gerem um tempo negativo, o que invertia a curva de decaimento Exponencial.
            const days = Math.max(0, (now - lastDate.getTime()) / MS_PER_DAY);
            if (!Number.isFinite(days)) return;

            // CÁLCULO DE MEIA-VIDA DINÂMICA (Anti-Punição de Maestria)
            // Assuntos consolidados (muitas questões ou alta precisão) esquecem mais devagar.
            const history = Array.isArray(cat.simuladoStats?.history)
              ? cat.simuladoStats.history
              : Object.values(cat.simuladoStats?.history || {});
            const totalQ = history.reduce((sum, h) => {
              const t = Number(h?.total);
              return sum + (Number.isFinite(t) && t > 0 ? t : 0);
            }, 0);
            const maxScore = Math.max(1, toFiniteNumber(cat.maxScore, 100));
            const accuracyData = cat.bayesianStats?.mean ?? cat.simuladoStats?.average;
            const accuracy = accuracyData != null ? (toFiniteNumber(accuracyData, 0) / maxScore) : 0;
            const qNorm = Math.max(0, Math.min(1, totalQ / 120));
            const accNorm = Math.max(0, Math.min(1, (accuracy - 0.5) / 0.4));
            const masterySignal = (0.6 * qNorm) + (0.4 * accNorm);
            const halfLife = 7 + (23 * masterySignal);

            const retention = Math.round(100 * Math.exp(-days / halfLife));
            
            data.push({
                nomeTopico: cat.name,
                diasSemRevisao: Math.floor(days),
                nivelCritico: 100 - retention,
                isTask: false
            });
        }
        
        // Add specific tasks if they have high impact
        if (Array.isArray(cat.tasks)) {
            cat.tasks.forEach(task => {
                if (!task || typeof task !== 'object') return;
                if (task.lastStudiedAt || task.completedAt) {
                    const lastTaskDate = toSafeDate(task.lastStudiedAt || task.completedAt);
                    if (!lastTaskDate) return;
                    const days = Math.max(0, (now - lastTaskDate.getTime()) / MS_PER_DAY);
                    if (!Number.isFinite(days)) return;
                    
                    // Tasks individuais usam half-life padrão 7 a menos que a categoria seja mestre
                    const history2 = Array.isArray(cat.simuladoStats?.history)
                      ? cat.simuladoStats.history
                      : Object.values(cat.simuladoStats?.history || {});
                    const totalQ = history2.reduce((sum, h) => {
                      const t = Number(h?.total);
                      return sum + (Number.isFinite(t) && t > 0 ? t : 0);
                    }, 0);
                    const qNorm = Math.max(0, Math.min(1, totalQ / 120));
                    const halfLife = 7 + (7 * qNorm);

                    const retention = Math.round(100 * Math.exp(-days / halfLife));
                    
                    if (days >= 1) { // Only show items that have at least 1 day without revision
                        data.push({
                            nomeTopico: task.text || task.title || 'Tarefa sem nome',
                            diasSemRevisao: Math.floor(days),
                            nivelCritico: 100 - retention,
                            isTask: true
                        });
                    }
                }
            });
        }
    });

    // Sort by critical level (descending = most critical first) and take top 8
    return data
        .sort((a, b) => b.nivelCritico - a.nivelCritico)
        .slice(0, 8);
};

/**
 * Maps study logs to daily focus evolution data
 * @param {Array} studyLogs 
 * @returns {Array} [{ data, horasEstudadas }]
 */
export const mapFocusEvolutionData = (studyLogs = []) => {
    // 🎯 STABILITY FIX: Deterministic date keys instead of toLocaleDateString.
    // toLocaleDateString depende da localidade do browser e pode falhar o matching.
    // 🎯 STABILITY FIX: Inclui o Ano na chave para evitar colisão entre anos diferentes (Bug do Fantasma do Ano Passado)
    const getFullKey = (dateObj) => {
      // ✅ Usa getDateKey (ancorado em America/Manaus) em vez de Intl genérico
      return getDateKey(dateObj);
    };

    const getDisplayKey = (dateObj) => {
        try {
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: 'America/Manaus',
                day: '2-digit', month: '2-digit'
            }).format(dateObj);
        } catch {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        }
    };

    const last14Days = [];
    // ✅ FIX: Ancorar ao meio-dia de Manaus para o dia corrente para evitar shift de 1 dia em outros fusos
    const todayMidday = normalizeDate(getDateKey(new Date())) || new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(todayMidday.getTime() - (i * MS_PER_DAY));
        last14Days.push({
            fullKey: getFullKey(d),
            data: getDisplayKey(d),
            horasEstudadas: 0
        });
    }

    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    
    logsArray.forEach(log => {
        if (!log || typeof log !== 'object') return;
        const logDate = toSafeDate(log.date);
        if (!logDate) return;
        const logFullKey = getFullKey(logDate);
        
        const dayMatch = last14Days.find(d => d.fullKey === logFullKey);
        if (dayMatch) {
            // BUGFIX: Suporte a minutes ou duration (Sincronia com motor de eficiência)
            const minutes = sanitizeMinutes(log.minutes ?? log.duration);
            dayMatch.horasEstudadas += minutes / 60;
        }
    });

    // Retorna arredondando no final para preservar precisão em somas fracionadas
    return last14Days.map(d => ({ 
        data: d.data, 
        horasEstudadas: parseFloat(d.horasEstudadas.toFixed(2)) 
    }));
};

/**
 * Maps study logs and categories to subject distribution data
 * @param {Array} studyLogs 
 * @param {Array} categories 
 * @returns {Array} [{ disciplina, horas }]
 */
export const mapSubjectHoursData = (studyLogs = [], categories = []) => {
    const hoursMap = {};
    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    const safeCategories = Array.isArray(categories) ? categories : [];
    
    logsArray.forEach(log => {
        if (!log || typeof log !== 'object') return;
        const cat = safeCategories.find(c => String(c.id) === String(log.categoryId) || (log.subject && c.name === log.subject) || (log.categoryName && c.name === log.categoryName));
        const name = cat ? cat.name : (log.categoryName || log.subject || 'Outros');
        const actualMinutes = sanitizeMinutes(log.minutes ?? log.duration);
        if (actualMinutes <= 0) return;
        hoursMap[name] = (hoursMap[name] || 0) + actualMinutes;
    });

    return Object.entries(hoursMap).map(([name, minutes]) => ({
        disciplina: name,
        horas: parseFloat((minutes / 60).toFixed(2))
    })).sort((a, b) => b.horas - a.horas);
};
```

---

## `src/utils/ProgressStateEngine.js`

<a id="src-utils-progressstateengine-js"></a>

```javascript
/**
 * ProgressStateEngine
 * 
 * Detects qualified stagnation states and differentiates from
 * evolution, regression, and instability.
 */

import { toDateMs } from './dateHelper.js';

const DEFAULT_CONFIG = {
    window_size: 10,
    stagnation_threshold: 5.0, // Alinhado com estabilidade de 5% da escala (rigoroso)
    low_level_limit: 60,
    high_level_limit: 75,
    mastery_limit: 80, // Sincronizado com targetScore padrão
    trend_tolerance: 0.5 // Alinhado com 0.5 pp/30d (unificado)
};

export function analyzeProgressState(scores, config = {}) {
    const {
        window_size,
        stagnation_threshold: raw_stagnation,
        low_level_limit,
        high_level_limit,
        mastery_limit,
        trend_tolerance: raw_trend,
        maxScore = 100
    } = { ...DEFAULT_CONFIG, ...config };

    // SCALE FIX: Escalonar thresholds pela amplitude da escala (maxScore)
    const scaleFactor = maxScore / 100;
    const windowFactor = Math.sqrt(10 / Math.max(3, window_size));
    const stagnation_threshold = raw_stagnation * scaleFactor * windowFactor;
    const trend_tolerance = raw_trend * scaleFactor * windowFactor;

    // FIX 3: Escalonar limites de nível (Mastery/Low) para suportar escalas diferentes de 100
    const scaled_low = low_level_limit * scaleFactor;
    const scaled_high = high_level_limit * scaleFactor;
    const scaled_mastery = mastery_limit * scaleFactor;

    // Safety: Window size must be at least 3 for meaningful variance and MAV calculation
    // (With only 2 points, variance = one single squared difference — not representative)
    const safeWindowSize = Math.max(3, window_size);

    // 3. Pre-condition check
    const safeScores = Array.isArray(scores) ? scores : Object.values(scores || {});
    if (!safeScores || safeScores.length < safeWindowSize) {
        return {
            state: 'insufficient_data',
            label: 'Dados Insuficientes',
            mean_score: 0,
            delta: 0,
            variance: 0,
            trend_slope: 0,
            severity: 'none'
        };
    }

    // 4. Extract window
    // CORREÇÃO: Gerar a âncora sintética ANTES de ordenar para preservar o eixo cronológico verdadeiro
    const syntheticNow = Date.now();
    const sortedScores = safeScores
      .filter(d => d != null)
      .map((d, index) => {
        let time = (d && typeof d === 'object') ? toDateMs(d.date) : NaN;
        if (!Number.isFinite(time)) time = syntheticNow - ((safeScores.length - index) * 86400000);
        return { original: d, safeTime: time };
      })
      .filter(item => Number.isFinite(item.safeTime))
      .sort((a, b) => a.safeTime - b.safeTime);

    const validSortedScores = sortedScores.filter(d => {
        const score = typeof d.original === 'object' ? d.original.score : d.original;
        return Number.isFinite(score);
    });
    
    const recentData = validSortedScores.slice(-safeWindowSize);
    const finiteRecentScores = recentData.map(d => typeof d.original === 'object' ? d.original.score : d.original);
    
    // BUG FIX: Em vez de recalcular as datas e arruinar a ordem cronológica, 
    // extraímos a safeTime validada no bloco anterior, preservando o eixo-X perfeitamente.
    const recentDates = recentData.map(d => d.safeTime);

    // 4.1 Safety Check after filtering invalid scores
    if (finiteRecentScores.length < safeWindowSize) {
        return {
            state: 'insufficient_data',
            label: 'Dados Insuficientes',
            mean_score: 0,
            delta: 0,
            variance: 0,
            trend_slope: 0,
            severity: 'none'
        };
    }

    // 5.1 Mean (Absolute Level)
    const mean = finiteRecentScores.reduce((a, b) => a + b, 0) / finiteRecentScores.length;

    // 5.2 Delta (Mean Absolute Variation)
    let variationTotal = 0;
    for (let i = 1; i < finiteRecentScores.length; i++) {
        variationTotal += Math.abs(finiteRecentScores[i] - finiteRecentScores[i - 1]);
    }
    const delta = variationTotal / (finiteRecentScores.length - 1);

    // 5.3 Variance (Consistency)
    const variance = finiteRecentScores.reduce((acc, score) =>
        acc + Math.pow(score - mean, 2), 0) / (finiteRecentScores.length - 1);

    // 5.4 Trend (Linear Regression Slope - TIME AWARE)
    // 🎯 MATH BUG FIX: Transição da Regressão Linear do índice (Cego ao tempo) 
    // para o eixo X de dias reais passados.
    const n = finiteRecentScores.length;
    const startTime = recentDates[0] || Date.now();
    // CORREÇÃO: Forçar spread artificial mínimo (micro-passos) se os testes colidirem no mesmo dia (Bug 1.1 Fix)
    const xDays = [];
    recentDates.forEach((d, i) => {
        let days = (d - startTime) / 86400000;
        if (i > 0 && days <= xDays[i - 1]) {
            days = xDays[i - 1] + 0.01; // Adiciona um micro-delta temporal (~14 minutos)
        }
        xDays.push(days);
    });
    const xMean = xDays.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (xDays[i] - xMean) * (finiteRecentScores[i] - mean);
        denominator += Math.pow(xDays[i] - xMean, 2);
    }

    // FIX: Clamp do denominador para impedir distorção por "Time Crunch" (testes em curtos intervalos)
    // Se o denominador for menor que 0.25 (1/4 de dia), assumimos um valor seguro para diluir o impacto
    const safeDenominator = denominator < 0.25 ? 0.25 : denominator;

    // slope em pontos/dia.
    const rawSlope = safeDenominator > 0 ? numerator / safeDenominator : 0; 
    
    // Normalização para 30 dias para alinhar com trend_tolerance (pp/30d)
    const normalizedSlope = rawSlope * 30;
    // 6. Stagnation Detection
    const stagnated = delta <= stagnation_threshold && Math.abs(normalizedSlope) <= trend_tolerance;

    // 7. Semantic Classification
    let state = '';
    let label = '';
    let severity = 'none';

    if (stagnated) {
        // 7.1 Qualified Stagnation or Mastery
        if (mean >= scaled_mastery) {
            state = 'mastery';
            label = 'Domínio (Consistente no Topo)';
            severity = 'none';
        } else if (mean < scaled_low) {
            state = 'stagnation_negative';
            label = 'Estagnação em nível baixo';
            severity = 'high';
        } else if (mean < scaled_high) {
            state = 'stagnation_neutral';
            label = 'Estagnação em nível médio';
            severity = 'medium';
        } else {
            state = 'stagnation_positive';
            label = 'Estagnação em nível alto';
            severity = 'low';
        }
    } else {
        // 7.2 Dynamic States (Not Stagnated) with Trend Tolerance
        // BUG-GLOBAL-06 FIX: Usar Coeficiente de Variação (CV) em vez de variância bruta.
        // Antes: variance > 25*scaleFactor² era calibrado para window_size=10 e falha com n diferentes.
        // CV > 15% é invariante ao n e à escala da prova.
        // FIX: Adicionado amortecimento Bayesiano no denominador (max(mean, 30 * scaleFactor))
        // Impede que alunos iniciantes (com média baixa) sejam falsamente diagnosticados como "Erráticos"
        // apenas por causa do ruído normal da nota (ex: oscilar 3 pontos numa média de 15 dava CV = 20%).
        const cv = mean > 1e-6 ? Math.sqrt(variance) / Math.max(mean, 30 * scaleFactor) : 0;
        const isVeryUnstable = cv > 0.15;

        // FIX 3.2 (Visual e Lógica): A instabilidade não deve proteger um aluno em queda livre.
        // Se a inclinação (slope) é fortemente negativa, é regressão, independentemente da variância.
        if (normalizedSlope < -trend_tolerance) {
            state = 'regression';
            label = isVeryUnstable ? 'Queda Acentuada (Instável)' : 'Em regressão';
            severity = 'high'; 
        } else if (normalizedSlope > trend_tolerance && !isVeryUnstable) {
            state = 'progression';
            label = 'Em evolução';
            severity = 'none';
        } else {
            state = 'unstable'; 
            label = 'Instável / Flutuação';
            severity = 'medium';
        }
    }

    // 8. Standardized Output
    return {
    // trend_slope em pp/dia (regressão linear sobre eixo-X em dias reais).
    // O motor está calibrado para este valor; compará-lo com pp/dia (calculateSlope) causaria confusão.
        state,
        label,
        mean_score: Number(mean.toFixed(2)),
        delta: Number(delta.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        trend_slope: Number(rawSlope.toFixed(4)),
        severity
    };
}

export function getUIHints(state) {
    const hints = {
        insufficient_data: { color: 'slate', icon: 'minus' },
        mastery: { color: 'violet', icon: 'award' },
        stagnation_negative: { color: 'red', icon: 'alert-triangle' },
        stagnation_neutral: { color: 'yellow', icon: 'pause-circle' },
        stagnation_positive: { color: 'green', icon: 'shield-check' },
        progression: { color: 'blue', icon: 'trending-up' },
        regression: { color: 'red', icon: 'trending-down' },
        unstable: { color: 'orange', icon: 'activity' }
    };

    return hints[state] || hints.insufficient_data;
}

export default { analyzeProgressState, getUIHints };
```

---

## `src/utils/analytics.js`

<a id="src-utils-analytics-js"></a>

```javascript
import { getXPProgress } from './gamification.js';
import { normalizeDate, getLocalMidnight, getDateKey, parseNoonLocal, getFlashcardTodayKey, getFlashcardNextDueKey } from './dateHelper.js';
import { getSafeScore, getSyntheticTotal } from './scoreHelper.js';
import { format } from 'date-fns';
import { toFinite } from '../engine/math/safe.js';
import { safeDate, getLocalMidnight as safeGetLocalMidnight, getLocalEndOfDay } from '../engine/math/date.js';
import { toArray } from './normalize.js';

/**
 * Distributes a rounding remainder across items based on their decimal parts.
 * Uses the "Largest Remainder Method" to ensure percentages sum to exactly 100%.
 */
const distributeRoundingRemainder = (items, targetSum = 100) => {
    if (!items.length) return items;

    // 1. Calculate floor percentages and track remainders
    const withRemainders = items.map(item => {
        const value = item.rawPercentage || 0;
        const floor = Math.floor(value);
        return {
            ...item,
            percentage: floor,
            remainder: value - floor
        };
    });

    const currentSum = withRemainders.reduce((sum, item) => sum + item.percentage, 0);
    let diff = targetSum - currentSum;

    if (diff > 0) {
        // 2. Sort by remainder descending and distribute the rounding remainder
        // BUGFIX M1: Loop while diff > 0 to ensure sum reaches targetSum even if diff > items.length
        withRemainders.sort((a, b) => b.remainder - a.remainder);
        let i = 0;
        while (diff > 0 && withRemainders.length > 0) {
            withRemainders[i % withRemainders.length].percentage += 1;
            diff--;
            i++;
        }
    }

    return withRemainders;
};

export const calculateStudyStreak = (studyLogs) => {
  const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
  if (!logsArray || logsArray.length === 0) {
    return { current: 0, best: 0, longest: 0, isActive: false };
  }

  // ✅ Usa getDateKey (ancorado em America/Manaus) para TODAS as comparações
  const daySet = new Set(
    logsArray
      .filter(log => log && log.date)
      .map(log => getDateKey(log.date))
      .filter(key => key && /^\d{4}-\d{2}-\d{2}$/.test(key))
  );

  const sortedDays = Array.from(daySet).sort((a, b) =>
    parseNoonLocal(b) - parseNoonLocal(a)
  );

  // ✅ FIX: Se não há dias válidos após filter, retornar zeros
  if (sortedDays.length === 0) {
    return { current: 0, best: 0, longest: 0, isActive: false };
  }

  // ✅ todayStr também via getDateKey (Manaus)
  const todayStr = getDateKey(new Date());
  const lastDayStr = sortedDays[0];

  // Comparação via strings YYYY-MM-DD (imune a timezone)
  const t = parseNoonLocal(todayStr);
  const l = parseNoonLocal(lastDayStr);
  const diffDays = Math.round((t - l) / (1000 * 60 * 60 * 24));

  if (diffDays >= 2) {
    const longest = calculateLongest(sortedDays);
    return { current: 0, best: longest, longest, isActive: false };
  }

  let streak = 0;
  let dateCursor = parseNoonLocal(lastDayStr);
  for (let i = 0; i < sortedDays.length * 2; i++) {
    const dString = getDateKey(dateCursor);
    if (daySet.has(dString)) {
      streak++;
      dateCursor.setDate(dateCursor.getDate() - 1);
    } else {
      break;
    }
  }

  const longest = calculateLongest(sortedDays);
  return { current: streak, best: longest, longest, isActive: diffDays <= 1 };
};


const calculateLongest = (uniqueDays) => {
    if (!uniqueDays || uniqueDays.length === 0) return 0;
    let longest = 1;
    let current = 1;
    // uniqueDays está ordenado DECRESCENTE — iteramos do mais recente ao mais antigo
    for (let i = 1; i < uniqueDays.length; i++) {
        const dCurrent = parseNoonLocal(uniqueDays[i]);
        const dPrev = parseNoonLocal(uniqueDays[i - 1]);
        const diff = Math.round((dPrev - dCurrent) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
            current++;
            longest = Math.max(longest, current);
        } else {
            current = 1;
        }
    }
    return longest;
};

export const getStudyMinutes = (entry) => {
    const minutes = toFinite(entry?.minutes ?? entry?.duration, 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return 0;
    return minutes;
};

/**
 * Conta pomodoros concluídos hoje a partir dos studyLogs.
 * extraCompletedCycles cobre blocos de foco da sessão ativa ainda não persistidos em log.
 */
export const countPomodorosToday = (studyLogs, pomodoroWork = 25, extraCompletedCycles = 0) => {
    const startOfToday = safeGetLocalMidnight(new Date()).getTime();
    const endOfToday = getLocalEndOfDay(new Date()).getTime();
    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    const workDuration = Math.max(1, Number(pomodoroWork) || 25);

    const minutesToday = logsArray.reduce((sum, log) => {
        const d = safeDate(log?.date);
        if (!d) return sum;
        const t = d.getTime();
        if (t < startOfToday || t > endOfToday) return sum;
        return sum + getStudyMinutes(log);
    }, 0);

    const pomodorosFromLogs = Number.isFinite(minutesToday) ? Math.floor(minutesToday / workDuration) : 0;
    const safeExtra = Math.max(0, Number(extraCompletedCycles) || 0);
    
    return pomodorosFromLogs + safeExtra;
};

/** Total de pomodoros (vida útil) baseado em minutos reais, não contagem de sessões. */
export const countPomodorosTotal = (studyLogs, studySessions, pomodoroWork = 25) => {
    const workDuration = Math.max(1, Number(pomodoroWork) || 25);
    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    const sessionsArray = Array.isArray(studySessions) ? studySessions : Object.values(studySessions || {});

    const logsMinutes = logsArray.reduce((sum, log) => sum + getStudyMinutes(log), 0);
    const sessionsMinutes = sessionsArray.reduce((sum, s) => sum + getStudyMinutes(s), 0);
    
    const totalMinutes = Math.max(logsMinutes, sessionsMinutes);

    return Math.floor(totalMinutes / workDuration);
};

const aggregateQuestionAccuracy = (contestData) => {
    const validSimulados = (contestData.simuladoRows || []).filter(
        r => r?.validated && Number(r?.total) > 0 && r?.correct !== undefined
    );

    let totalQuestions = validSimulados.reduce((acc, r) => acc + Number(r.total), 0);
    let totalCorrect = validSimulados.reduce((acc, r) => acc + Number(r.correct), 0);

    // Only supplement from history if we have no explicit validated rows (legacy or no submissions)
    // This prevents double-counting recent simulado data that exists in both rows and history.
    if (validSimulados.length === 0 || totalQuestions === 0) {
        (contestData.categories || []).forEach(cat => {
            const maxS = Number(cat.maxScore) || 100;
            const syntheticTotal = getSyntheticTotal(maxS);
            const histArr = Array.isArray(cat.simuladoStats?.history)
                ? cat.simuladoStats.history
                : Object.values(cat.simuladoStats?.history || {});

            histArr.forEach(e => {
                let t = Number(e.total) || 0;
                let c = 0;
                if (t > 0) {
                    c = e.correct !== undefined ? Number(e.correct) : Math.round((getSafeScore(e, maxS) / maxS) * t);
                } else if (e.score != null) {
                    t = syntheticTotal;
                    c = Math.round((getSafeScore(e, maxS) / maxS) * t);
                }
                totalQuestions += t;
                totalCorrect += c;
            });
        });
    }

    return {
        totalQuestions,
        totalCorrect,
        accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
    };
};

/**
 * Estatísticas unificadas para conquistas e painéis de gamificação.
 * Centraliza a lógica que antes divergia entre Activity.jsx e createGamificationSlice.
 */
export const buildAchievementStats = (contestData, options = {}) => {
    if (!contestData) return null;

    const pomodoroWork = Math.max(1, Number(options.pomodoroWork ?? contestData.settings?.pomodoroWork) || 25);
    const extraCompletedCycles = Math.max(0, Number(options.extraCompletedCycles) || 0);

    const studyLogs = Array.isArray(contestData.studyLogs)
        ? contestData.studyLogs
        : Object.values(contestData.studyLogs || {});
    const studySessions = Array.isArray(contestData.studySessions)
        ? contestData.studySessions
        : Object.values(contestData.studySessions || {});

    const { totalQuestions, totalCorrect, accuracy } = aggregateQuestionAccuracy(contestData);

    let studiedEarly = Boolean(contestData.user?.studiedEarly);
    let studiedLate = Boolean(contestData.user?.studiedLate);
    let studiedWeekend = false;

    studyLogs.forEach(log => {
        const d = safeDate(log?.date);
        if (!d) return;
        const hr = d.getHours();
        const day = d.getDay();
        if (hr >= 4 && hr < 7) studiedEarly = true;
        if (hr >= 23 || hr < 4) studiedLate = true;
        if (day === 0 || day === 6) studiedWeekend = true;
    });

    const categoriesArray = Array.isArray(contestData.categories) ? contestData.categories : Object.values(contestData.categories || {});

    const hasPerfectScoreFromHistory = categoriesArray.some(cat => {
        const hist = cat.simuladoStats?.history;
        const histArr = Array.isArray(hist) ? hist : Object.values(hist || {});
        const maxS = Number(cat.maxScore) || 100;
        return histArr?.some(h => getSafeScore(h, maxS) >= maxS || (h.correct === h.total && h.total > 0));
    }) || false;

    return {
        completedTasks: categoriesArray.reduce(
            (sum, cat) => sum + ((Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})).filter(t => t.completed)?.length || 0), 0
        ) || 0,
        currentStreak: calculateStudyStreak(studyLogs).current,
        totalQuestions,
        hasPerfectScore: (totalQuestions > 0 && totalCorrect >= totalQuestions) || hasPerfectScoreFromHistory,
        accuracy,
        pomodorosCompleted: countPomodorosTotal(studyLogs, studySessions, pomodoroWork),
        pomodorosToday: countPomodorosToday(studyLogs, pomodoroWork, extraCompletedCycles),
        studiedEarly,
        studiedLate,
        studiedWeekend,
        subjectsStudied: new Set(studyLogs.filter(log => log.categoryId).map(log => log.categoryId)).size,
        // Flashcard indicators as measures
        flashcardReviews: studyLogs.filter(log => log.type === 'flashcard').length,
        flashcardAccuracy: (() => {
            const fcLogs = studyLogs.filter(log => log.type === 'flashcard' && log.correct !== undefined);
            if (fcLogs.length === 0) return 0;
            const correct = fcLogs.filter(l => l.correct).length;
            return (correct / fcLogs.length) * 100;
        })(),
        flashcardReviewsToday: (() => {
            const startOfToday = getLocalMidnight().getTime();
            return studyLogs.filter(log => 
                log.type === 'flashcard' && 
                normalizeDate(log?.date)?.getTime() >= startOfToday
            ).length;
        })(),
        // Enhanced deck-based flashcard indicators (for KPIs, Coach, Retention)
        // Now uses centralized helpers (consistent date keys + mastery >=6)
        flashcardDecks: getFlashcardDeckCount(contestData.flashcardDecks),
        flashcardTotalCards: getFlashcardTotalCards(contestData.flashcardDecks),
        flashcardDueToday: getFlashcardDueTodayCount(contestData.flashcardDecks),
        flashcardMastery: getFlashcardMasteryPct(contestData.flashcardDecks)
    };
};

export const analyzeSubjectBalance = (categories) => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const totalMinutes = safeCategories.reduce((sum, c) => sum + Math.max(0, Number(c?.totalMinutes) || 0), 0);

    if (totalMinutes === 0) {
        return {
            status: 'sem_dados',
            message: 'Comece a estudar para ver análise',
            distribution: [],
            alerts: []
        };
    }

    // Distribution with Rounding Protection (B-05 FIX)
    let distribution = safeCategories.map(c => {
        const minutes = Math.max(0, Number(c?.totalMinutes) || 0);
        const tasks = Array.isArray(c?.tasks) ? c.tasks : [];
        const rawPercentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
        return {
            subject: c?.name || 'Sem nome',
            minutes,
            rawPercentage,
            tasks: tasks.length,
            completed: tasks.filter(t => t?.completed).length
        };
    });

    // Apply Largest Remainder Method
    distribution = distributeRoundingRemainder(distribution)
        .sort((a, b) => b.minutes - a.minutes);

    // Detectar problemas
    const maxPercentage = distribution[0]?.percentage || 0;
    let status = 'excelente';
    let message = 'Distribuição equilibrada entre matérias';
    let alerts = [];

    if (maxPercentage > 70) {
        status = 'alerta';
        message = 'Muito foco em uma matéria! Diversifique seus estudos.';
        alerts.push({
            type: 'overload',
            subject: distribution[0].subject,
            percentage: maxPercentage
        });
    } else if (maxPercentage > 50) {
        status = 'atencao';
        message = 'Considere balancear melhor o tempo entre matérias';
    }

    // Detectar matérias negligenciadas (< 5% do tempo mas tem tarefas pendentes)
    const neglected = distribution.filter(d => d.percentage < 5 && (d.tasks > d.completed));
    if (neglected.length > 0) {
        alerts.push({
            type: 'neglected',
            subjects: neglected.map(n => n.subject)
        });
    }

    return {
        status,
        message,
        distribution,
        alerts,
        metrics: {
            mostStudied: distribution[0]?.subject,
            leastStudied: distribution[distribution.length - 1]?.subject,
            totalSubjects: safeCategories.length,
            activeSubjects: distribution.filter(d => d.minutes > 0).length
        }
    };
};

export const analyzeEfficiency = (categories, studyLogs = [], user = {}) => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeLogs = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});

    const getMinutes = (entry) => {
        const duration = Number(entry?.duration);
        const minutes = Number(entry?.minutes);
        const raw = Number.isFinite(duration) ? duration : (Number.isFinite(minutes) ? minutes : 0);
        return Math.max(0, raw);
    };

    const totalMinutes = safeLogs.length > 0
        ? safeLogs.reduce((sum, l) => sum + getMinutes(l), 0)
        : safeCategories.reduce((sum, c) => sum + Math.max(0, Number(c?.totalMinutes) || 0), 0);
    // Bug fix: optional chaining on c.tasks throughout to avoid crash if tasks is undefined
    const totalTasks = safeCategories.reduce((sum, c) => sum + (Array.isArray(c?.tasks) ? c.tasks.length : 0), 0);
    const completedTasks = safeCategories.reduce((sum, c) =>
        sum + (Array.isArray(c?.tasks) ? c.tasks.filter(t => t?.completed).length : 0), 0
    );

    if (totalMinutes === 0 && completedTasks === 0) {
        return {
            status: 'sem_dados',
            efficiency: 'sem_dados',
            message: 'Complete algumas tarefas para análise',
            score: 0,
            metrics: {},
            recommendations: []
        };
    }

    if (totalMinutes > 0 && completedTasks === 0) {
        return {
            efficiency: 'precisa_melhorar',
            score: 40,
            message: 'Lembre-se de marcar as tarefas concluídas!',
            metrics: { minutesPerTask: 0, completionRate: 0, tasksPerHour: 0, highPriorityRate: 0, totalStudied: totalMinutes, totalCompleted: 0 },
            recommendations: [{ type: 'goal_setting', message: 'Lembre-se de marcar as tarefas concluídas!', priority: 'high' }]
        };
    }

    // BUGFIX M2: Close loophole where checking boxes with zero minutes gave 100% efficiency.
    if (totalMinutes === 0 && completedTasks > 0) {
        return {
            efficiency: 'precisa_melhorar',
            score: 0,
            message: 'Ligue o cronômetro para registrar a sua eficiência real.',
            metrics: { minutesPerTask: 0, completionRate: 0, tasksPerHour: 0, highPriorityRate: 0, totalStudied: 0, totalCompleted: completedTasks },
            recommendations: [{ type: 'time_tracking', message: 'Lembre-se de usar o Pomodoro para medir seu esforço.', priority: 'high' }]
        };
    }

    // Tempo médio por tarefa concluída (Métrica Bruta para Display)
    const minutesPerTask = totalMinutes / completedTasks;

    // Taxa de conclusão geral (clamp defensivo contra dados corrompidos)
    const safeCompleted = Math.min(completedTasks, totalTasks);
    const completionRate = totalTasks > 0 ? Math.min(100, Math.round((safeCompleted / totalTasks) * 100)) : 0;

    // FIX MATEMÁTICO: Novo Motor de Eficiência (Anti-Punição de Deep Work)
    // Em vez de punir o tempo absoluto, medimos a cadência de entrega (tarefas/hora).
    // Benchmark: 3 tarefas/hora é considerado 100% de eficiência de fluxo.
    // O benchmark escala levemente com o nível do usuário (mais experiência = mais foco).
    const userLevel = user?.level || 1;
    const benchmarkTarefasPorHora = 2 + (Math.min(userLevel, 20) * 0.1); // Escala de 2.1 a 4.0
    const currentTasksPerHour = (completedTasks / (totalMinutes / 60));
    
    // Score de Fluxo: Proporção em relação ao benchmark, capado em 100.
    const flowScore = Math.min(100, Math.round((currentTasksPerHour / benchmarkTarefasPorHora) * 100));

    // Score Composto: 30% Cadência (Flow) e 70% Poder de Conclusão Atual (Checklist)
    // Damos mais peso à conclusão real das tarefas do que à velocidade pura.
    const score = Math.round((flowScore * 0.3) + (completionRate * 0.7));

    let efficiency = 'excelente';
    if (score < 60) efficiency = 'precisa_melhorar';
    else if (score < 75) efficiency = 'regular';
    else if (score < 85) efficiency = 'boa';

    // Produtividade (tarefas por hora - apenas display numérico)
    const tasksPerHour = totalMinutes > 0 ?
        parseFloat((completedTasks / (totalMinutes / 60)).toFixed(2)) : 0;

    // Análise de tarefas de alta prioridade
    const highPriorityTasks = safeCategories.flatMap(c =>
        (Array.isArray(c?.tasks) ? c.tasks : []).filter(t => t?.priority === 'high')
    );
    const highPriorityCompleted = highPriorityTasks.filter(t => t.completed).length;
    const highPriorityRate = highPriorityTasks.length > 0
        ? Math.min(100, Math.round((Math.min(highPriorityCompleted, highPriorityTasks.length) / highPriorityTasks.length) * 100))
        : 100;

    return {
        efficiency,
        score,
        metrics: {
            minutesPerTask: Math.round(minutesPerTask),
            completionRate,
            tasksPerHour: parseFloat(tasksPerHour),
            highPriorityRate,
            totalStudied: totalMinutes,
            totalCompleted: completedTasks
        },
        recommendations: generateEfficiencyRecommendations({
            minutesPerTask,
            completionRate,
            highPriorityRate
        })
    };
};

const generateEfficiencyRecommendations = ({ minutesPerTask, completionRate, highPriorityRate }) => {
    const recs = [];

    if (minutesPerTask > 60) {
        recs.push({
            type: 'task_granularity',
            message: 'Tarefas muito longas: considere dividi-las em subtarefas menores',
            priority: 'high'
        });
    }

    if (completionRate < 50) {
        recs.push({
            type: 'goal_setting',
            message: 'Baixa taxa de conclusão: revise suas metas e seja mais realista',
            priority: 'high'
        });
    }

    if (highPriorityRate < 70) {
        recs.push({
            type: 'prioritization',
            message: 'Foque nas tarefas de alta prioridade primeiro',
            priority: 'medium'
        });
    }

    if (recs.length === 0) {
        recs.push({
            type: 'positive',
            message: 'Continue mantendo seu ritmo atual!',
            priority: 'low'
        });
    }

    return recs;
};

export const detectProcrastination = (categories, studyLogs) => {
    if (!Array.isArray(categories)) categories = [];
    const now = new Date();
    // BUG-02 FIX: Usar âncora de 12:00:00 para comparação de dias, 
    // garantindo paridade com o resto do sistema de datas (dateHelper).
    const normalizedNow = normalizeDate(now).getTime();
    const warnings = [];

    // Fix 3: Pre-index logs by taskId and categoryId to avoid O(logs) filter inside each loop
    const logsByTaskId = {};
    const logsByCategoryId = {};
    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    logsArray.forEach(log => {
        if (log.taskId) {
            if (!logsByTaskId[log.taskId]) logsByTaskId[log.taskId] = [];
            logsByTaskId[log.taskId].push(log);
        }
        if (log.categoryId) {
            if (!logsByCategoryId[log.categoryId]) logsByCategoryId[log.categoryId] = [];
            logsByCategoryId[log.categoryId].push(log);
        } else if (log.categoryName) {
            // 🎯 BUG 2.2 FIX: Fallback para logs sem categoryId mas com categoryName.
            // Permite que estudos "livres" sem vínculo de ID ainda protejam a categoria contra alertas de procrastinação.
            const matchingCat = categories.find(c => c.name === log.categoryName);
            if (matchingCat) {
                if (!logsByCategoryId[matchingCat.id]) logsByCategoryId[matchingCat.id] = [];
                logsByCategoryId[matchingCat.id].push(log);
            }
        }
    });

    // 1. Tarefas de alta prioridade sem progresso recente
    categories.forEach(cat => {
        cat.tasks?.forEach(task => {
            if (task.priority === 'high' && !task.completed) {
                const taskLogs = logsByTaskId[task.id] || [];
                const recentLogs = taskLogs.filter(log => {
                    const logDate = normalizeDate(log.date);
                    const daysDiff = logDate ? (normalizedNow - logDate.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
                    return daysDiff <= 3;
                });

                if (recentLogs.length === 0) {
                    // B-07 FIX: Antes de emitir alerta, verificar se há logs da CATEGORIA
                    // (sessões de estudo geral sem taskId explícito).
                    // Evita falso alerta quando o usuário estudou a matéria sem focar na tarefa.
                    const categoryLogs = logsByCategoryId[cat.id] || [];
                    const recentCategoryLogs = categoryLogs.filter(log => {
                        const catLogDate = normalizeDate(log.date);
                        const daysDiff = catLogDate ? (normalizedNow - catLogDate.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
                        return daysDiff <= 3;
                    });
                    if (recentCategoryLogs.length === 0) {
                        warnings.push({
                            type: 'stale_high_priority',
                            task: task.text || task.title || 'Tarefa sem nome',
                            category: cat.name,
                            severity: 'high'
                        });
                    }
                }
            }
        });
    });

    // 2. Categoria sem atividade há mais de 5 dias
    categories.forEach(cat => {
        if ((cat.tasks || []).length > 0) {
            const categoryLogs = (logsByCategoryId[cat.id] || []).filter(Boolean);
            if (categoryLogs.length > 0) {
                const lastLog = categoryLogs.reduce((latest, log) =>
                    (normalizeDate(log.date)?.getTime() ?? 0) > (normalizeDate(latest.date)?.getTime() ?? 0) ? log : latest
                , categoryLogs[0]);
                const lastLogDate = normalizeDate(lastLog.date);
                const daysSinceLastStudy = lastLogDate ? (normalizedNow - lastLogDate.getTime()) / (1000 * 60 * 60 * 24) : 0;

                if (daysSinceLastStudy > 5) {
                    warnings.push({
                        type: 'neglected_category',
                        category: cat.name,
                        daysSince: Math.floor(daysSinceLastStudy),
                        severity: 'medium'
                    });
                }
            }
        }
    });

    // 3. Padrão de estudo irregular (< 3 dias na última semana)
    // BUGFIX: Removemos a trava de '.length >= 7' para permitir que o Coach detecte 
    // procrastinadores severos (justamente os que têm pouquíssimos logs).
    if (logsArray.length > 0) {
        const last7Days = logsArray.filter(log => {
            const logDate7 = normalizeDate(log.date);
            const daysDiff = logDate7 ? (normalizedNow - logDate7.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
            return daysDiff <= 7;
        });

        const uniqueDays = new Set(last7Days.map(log =>
            getDateKey(log.date)
        )).size;

        if (uniqueDays < 3) {
            warnings.push({
                type: 'irregular_pattern',
                message: `Apenas ${uniqueDays} dias de estudo na última semana`,
                severity: 'medium'
            });
        }
    }

    return {
        hasProcrastination: warnings.length > 0,
        warnings,
        score: (() => {
            const severityPenalty = warnings.reduce((acc, w) => acc + (w?.severity === 'high' ? 12 : w?.severity === 'medium' ? 8 : 6), 0);
            return Math.max(10, 100 - severityPenalty);
        })()
    };
};

export const DAILY_GOAL_MINUTES = 240; // Configurado para 4 horas padrão

/**
 * Calculates current day stats for Pomodoro and Study Progress.
 * G-01 FIX: Integrates calculateDailyPomodoroGoal for dynamic daily goals.
 * G-02 FIX: Recovers duration from startTime/endTime if duration field is 0.
 */
export const calculatePomodoroStats = (stats) => {
    const { studySessions = [], studyLogs = [], categories = [], user = {}, settings = {} } = stats || {};

    // Get dynamic goal (B-11 FIX: Link dashboard UI to dynamic goal engine)
    const dynamicGoal = calculateDailyPomodoroGoal(categories, user);
    const dailyGoalPomodoros = dynamicGoal.daily;
    const pomodoroDuration = settings?.pomodoroWork || 25;
    const dailyGoalMinutes = dailyGoalPomodoros * pomodoroDuration;

    // B-02 FIX: Usar objeto Date local, não toISOString() que sempre retorna UTC.
    // 🕒 PADRONIZAÇÃO MANAUS: Garante que "hoje" começa à meia-noite exata de Manaus (UTC-4)
    const startOfDay = getLocalMidnight();

    // Fix: Filter sessions where the end time crosses into today or later
    const todaySessions = studySessions.filter(s => {
        const start = new Date(s.startTime);
        const end = s.endTime ? new Date(s.endTime) : new Date(start.getTime() + (s.duration || 0) * 60000);
        return end > startOfDay;
    });

    let todayMinutes = 0;
    let fractionalPomodoros = 0; // FIX: Contagem baseada no esforço real/proporcional
    const todaySubjects = {};

    todaySessions.forEach(session => {
        const start = new Date(session.startTime);

        // G-02 Duration Recovery Fallback
        let sessionDuration = Number(session.duration) || 0;
        if (sessionDuration === 0 && session.startTime && session.endTime) {
            const end = new Date(session.endTime);
            sessionDuration = Math.round((end.getTime() - start.getTime()) / 60000);
        }

        const end = session.endTime ? new Date(session.endTime) : new Date(start.getTime() + sessionDuration * 60000);
        // BUGFIX: Usar construtor nativo para evitar bugs de Horário de Verão (DST)
        const startOfNextDay = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate() + 1);

        // BUGFIX M1: Clamp session duration to the boundaries of "today"
        const effectiveStart = Math.max(start.getTime(), startOfDay.getTime());
        const effectiveEnd = Math.min(end.getTime(), startOfNextDay.getTime());

        let minutesToCount = 0;
        if (effectiveEnd > effectiveStart) {
            minutesToCount = Math.round((effectiveEnd - effectiveStart) / 60000);
        }

        // Safety cap: cannot exceed the session's own duration
        minutesToCount = Math.min(sessionDuration, minutesToCount);

        todayMinutes += minutesToCount;
        // FIX: Adiciona apenas a fração do pomodoro que pertence a "hoje"
        // Calcula o equivalente em blocos de pomodoro de 25 minutos
        fractionalPomodoros += (minutesToCount / pomodoroDuration);

        const cat = categories.find(c => c.id === session.categoryId);
        if (cat) {
            todaySubjects[cat.name] = (todaySubjects[cat.name] || 0) + minutesToCount;
        }
    });

    // Calcular a série de dias (streak)
    const streakSource = (Array.isArray(studyLogs) && studyLogs.length > 0)
        ? studyLogs
        : studySessions.map(s => ({ date: s.startTime || s.date }));
    const streak = calculateStudyStreak(streakSource);

    // Calcular progresso da meta (G-01: Used dynamic goal minutes)
    // BUGFIX M3: Protection against division by zero when goal is 0.
    const progressPercentage = dailyGoalMinutes > 0
        ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))
        : (todayMinutes > 0 ? 100 : 0);

    return {
        todayMinutes,
        todayPomodoros: Number(fractionalPomodoros.toFixed(2)),
        dailyGoalMinutes: dailyGoalMinutes,
        progressPercentage,
        streak: streak.current,
        totalSubjectsToday: Object.keys(todaySubjects).length,
        topSubject: Object.entries(todaySubjects).sort((a, b) => b[1] - a[1])[0] || null
    };
};

export const calculateDailyPomodoroGoal = (categories, user) => {
    const pendingTasks = categories.reduce((sum, c) =>
        sum + (c.tasks || []).filter(t => !t.completed).length, 0
    );

    const highPriorityPending = categories.reduce((sum, c) =>
        sum + (c.tasks || []).filter(t => !t.completed && t.priority === 'high').length, 0
    );

    // Fórmula: 2 pomodoros por alta prioridade + 1 por tarefa normal
    const baseGoal = (highPriorityPending * 2) + (pendingTasks - highPriorityPending);

    // Ajuste por nível (quanto maior, mais capacidade)
    // Fix: user.level might be undefined, fallback to 1
    const lvl = user?.level || 1;
    const levelMultiplier = 1 + (lvl * 0.05); // 5% por nível
    const adjustedGoal = Math.ceil(baseGoal * levelMultiplier);

    // Limitar entre 3 e 12 pomodoros (razoável)
    const dailyGoal = pendingTasks === 0 ? 0 : Math.max(3, Math.min(12, adjustedGoal));

    return {
        daily: dailyGoal,
        weekly: dailyGoal * 5,
        reasoning: {
            pendingTasks,
            highPriorityPending,
            baseGoal,
            levelBonus: Math.round((levelMultiplier - 1) * 100) + '%'
        }
    };
};

export const getCompleteReport = (data) => {
    const studyLogs = data.studyLogs || [];
    const streak = calculateStudyStreak(studyLogs);
    const balance = analyzeSubjectBalance(data.categories || []);
    const efficiency = analyzeEfficiency(data.categories || [], studyLogs, data.user);
    const procrastination = detectProcrastination(data.categories || [], studyLogs);
    const goals = calculateDailyPomodoroGoal(data.categories, data.user);
    const pomodoroWork = data.settings?.pomodoroWork || 25;
    const pomodorosToday = countPomodorosToday(studyLogs, pomodoroWork);

    return {
        performance: {
            xp: data.user?.xp || 0,
            level: data.user?.level || 1,
            xpProgress: getXPProgress(data.user?.xp || 0),
        },
        consistency: streak,
        balance,
        efficiency,
        procrastination,
        goals: {
            ...goals,
            current: pomodorosToday,
            progress: goals.daily <= 0
                ? 100
                : Math.max(0, Math.min(100, Math.round((pomodorosToday / goals.daily) * 100)))
        },
        // IMP-GLOBAL-08 FIX: Pesos diferenciados para métricas com distribuições assimétricas.
        // Antes: média simples de 4 componentes com ranges/distribuições muito diferentes.
        // Agora: 35% eficiência, 20% procrastinação, 20% streak, 25% equilíbrio.
        overallScore: Math.round(
            (efficiency.score * 0.35) +
            (procrastination.score * 0.20) +
            (Math.min(100, 40 + streak.current * 2) * 0.20) +
            ((balance.status === 'excelente' ? 100
                : balance.status === 'atencao' ? 70
                    : balance.status === 'sem_dados' ? 65
                        : 40) * 0.25)
        ),
        recommendations: [
            ...efficiency.recommendations.map(r => r.message),
            ...balance.alerts.map(a =>
                a.type === 'overload'
                    ? `Matéria sobrecarregada: ${a.subject} (${a.percentage}%)`
                    : `Matérias negligenciadas: ${a.subjects.join(', ')}`
            ),
            ...procrastination.warnings.map(w => {
                if (w.type === 'stale_high_priority') {
                    return `Tarefa prioritária sem progresso: ${w.task}`;
                }
                if (w.type === 'neglected_category') {
                    return `${w.category}: ${w.daysSince} dias sem estudo`;
                }
                return w.message;
            })
        ]
    };
};

/**
 * Previsão de Cartões a Vencer (Due Forecast)
 * Uses the centralized flashcard date helpers for consistent TZ handling.
 * Past/overdue cards are bucketed into "Hoje".
 */
/**
 * Reusable pure helpers for SRS flashcard metrics (used by Due Forecast,
 * VerifiedStats, Retention, Coach, buildAchievementStats, etc).
 * Standardized mastery threshold: >= 3 reviews AND interval >= 6.
 */
export function getFlashcardDueTodayCount(decks = []) {
  const todayKey = getFlashcardTodayKey();
  let due = 0;
  const decksArray = toArray(decks);
  decksArray.forEach(deck => {
    toArray(deck?.cards).forEach(card => {
      if (!card?.due || card.due <= todayKey) due++;
    });
  });
  return due;
}

export function getFlashcardMasteryPct(decks = []) {
  let total = 0, mastered = 0;
  const decksArray = toArray(decks);
  decksArray.forEach(deck => {
    toArray(deck?.cards).forEach(card => {
      total++;
      if ((card.reviews || 0) >= 3 && (card.interval || 1) >= 6) mastered++;
    });
  });
  return total > 0 ? Math.round((mastered / total) * 100) : 0;
}

export function getFlashcardImmunity(decks = []) {
  const immunityMap = {};
  let globalTotal = 0;
  let globalMastered = 0;

  const decksArray = toArray(decks);
  decksArray.forEach(deck => {
    const subject = deck?.subject ? String(deck.subject).toLowerCase().trim() : 'geral';
    
    let total = 0, mastered = 0;
    toArray(deck?.cards).forEach(card => {
      total++;
      if ((card.reviews || 0) >= 3 && (card.interval || 1) >= 21) mastered++;
    });
    
    globalTotal += total;
    globalMastered += mastered;
    
    if (total > 0) {
      if (!immunityMap[subject]) immunityMap[subject] = { total: 0, mastered: 0 };
      immunityMap[subject].total += total;
      immunityMap[subject].mastered += mastered;
    }
  });

  const finalImmunityMap = {};
  for (const [subj, data] of Object.entries(immunityMap)) {
    if (data.total >= 5) {
      const mastery = data.mastered / data.total;
      finalImmunityMap[subj] = 1.0 - (mastery * 0.20);
    } else {
      finalImmunityMap[subj] = 1.0;
    }
  }

  const globalImmunityFactor = globalTotal >= 10 
    ? 1.0 - ((globalMastered / globalTotal) * 0.20) 
    : 1.0;

  return {
    globalImmunityFactor,
    subjectImmunityMap: finalImmunityMap
  };
}

export function getFlashcardTotalCards(decks = []) {
  const decksArray = toArray(decks);
  return decksArray.reduce((sum, d) => sum + toArray(d?.cards).length, 0);
}

export function getFlashcardDeckCount(decks = []) {
  const decksArray = toArray(decks);
  return decksArray.length;
}

export function computeFlashcardDueForecast(decks = [], horizon = 14) {
    const raw = Number(horizon);
    const safeHorizon = Math.max(0, Math.floor(isNaN(raw) ? 14 : raw));
    const todayKey = getFlashcardTodayKey();
    const counts = {};

    const safeDecks = toArray(decks);

    safeDecks.forEach(deck => {
        toArray(deck?.cards).forEach(card => {
            let dueKey = card && card.due ? String(card.due) : todayKey;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dueKey)) {
                dueKey = todayKey;
            }
            if (dueKey < todayKey) {
                dueKey = todayKey;
            }
            counts[dueKey] = (counts[dueKey] || 0) + 1;
        });
    });

    const forecast = [];
    let totalDueInHorizon = 0;
    let maxDaily = 0;

    const baseDate = new Date();

    for (let i = 0; i < safeHorizon; i++) {
        const key = i === 0
            ? todayKey
            : getFlashcardNextDueKey(i);  // i days ahead, normalized

        // For label + dateLabel we still use date-fns for nice display (from "today")
        const displayDate = new Date(baseDate.getTime());
        displayDate.setDate(displayDate.getDate() + i);

        const count = counts[key] || 0;

        totalDueInHorizon += count;
        if (count > maxDaily) maxDaily = count;

        let label;
        if (i === 0) label = 'Hoje';
        else if (i === 1) label = 'Amanhã';
        else label = `+${i}d`;

        forecast.push({
            day: i,
            dateKey: key,
            label,
            dateLabel: format(displayDate, 'dd/MM'),
            count,
            isToday: i === 0,
            isTomorrow: i === 1
        });
    }

    return {
        forecast,
        totalDueInHorizon,
        maxDaily,          // 0 is valid now
        horizon: safeHorizon
    };
}
```

---

## `src/engine/analyticsStats.js`

<a id="src-engine-analyticsstats-js"></a>

```javascript
import {
    computeCategoryStats,
    computeBayesianLevel,
    computeWeightedVariance,
    calculateVolatility,
    getAdaptiveInterSubjectCorrelation,
    computeHierarchicalAdjustment
} from './index.js';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { getDateKey, normalizeDate } from '../utils/dateHelper.js';
import {
    getConfidenceMultiplier,
    winsorizeSeries,
    computeAdaptiveSignal
} from '../utils/adaptiveMath.js';

export const VOLATILITY_REGULARIZATION_FACTOR = 0.35;
export const INFORMATIVE_PRIOR_MAX_STRENGTH = 5.0;
export const MAX_CALIBRATION_PENALTY = 0.15;
export const CALIBRATION_LAMBDA_DAYS = 30; // Meia-vida de decaimento (30 dias)

// FIX: piso mínimo de incerteza — nunca afirmar volatilidade próxima de zero
export const VOLATILITY_FLOOR_PCT = 0.03;

// FIX: amostra efetiva mínima (soma dos pesos de decaimento) antes de
// aplicar penalidade de calibração. Evita punir o modelo com 1-2 eventos ruidosos.
export const CALIBRATION_MIN_EFFECTIVE_SAMPLES = 1.0;

const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

// FIX: parseInt truncava pesos decimais ("2.5" -> 2).
// Agora aceita decimais e arredonda de forma previsível.
export const sanitizeWeightUnit = (value) => {
    let numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        numeric = parseInt(value, 10);
    }

    if (Number.isNaN(numeric)) return 0;

    return Math.max(0, Math.min(999, Math.round(numeric)));
};

export const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

export function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const safeSD = Number.isFinite(dailySD) ? Math.max(0, dailySD) : 0;
    const safeDomain = Number.isFinite(domain) && domain > 0 ? domain : 100;

    const informativeSD = VOLATILITY_REGULARIZATION_FACTOR * safeDomain;

    // FIX: horizontes de projeção mais longos exigem mais incerteza epistêmica.
    // O prior informativo cresce suavemente com os dias projetados (fator máx. 2x).
    const horizonFactor = Math.min(2, 1 + (Math.max(0, projectionDays) / 180));

    const priorStrength = Math.max(
        1.0,
        (INFORMATIVE_PRIOR_MAX_STRENGTH - Math.log2(historyLength + 1)) * horizonFactor
    );

    const n = Math.max(1, historyLength);

    const regularizedVariance =
        (safeSD * safeSD * n + informativeSD * informativeSD * priorStrength) /
        (n + priorStrength);

    const regularizedSD = Math.sqrt(Math.max(0, regularizedVariance));

    // FIX: piso de 3% do domínio. Sem isso, histórico muito estável + N alto
    // produzia SD quase zero e probabilidades degeneradas (0% ou 100%).
    const floorSD = VOLATILITY_FLOOR_PCT * safeDomain;

    return Math.max(floorSD, regularizedSD);
}

export function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null) {
    if (!Array.isArray(mcHistory) || mcHistory.length === 0 || !Array.isArray(globalHistory) || globalHistory.length === 0) {
        return 0;
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const LAMBDA = Math.log(2) / (CALIBRATION_LAMBDA_DAYS * MS_PER_DAY);
    const now = Date.now();

    let brierWeightSum = 0;
    let brierSum = 0;
    let residualWeightSum = 0;
    let residualSum = 0;

    const todayKey = getDateKey(new Date());

    mcHistory.forEach(snapshot => {
        if (!snapshot) return;

        const snapshotKey = getDateKey(snapshot.date || snapshot.timestamp);
        if (snapshotKey === todayKey) return;

        const snapTime = normalizeDate(snapshot.date || snapshot.timestamp)?.getTime() || NaN;
        if (isNaN(snapTime)) return;

        const targetTime = snapshot.targetDate ? normalizeDate(snapshot.targetDate)?.getTime() : null;

        let actual = null;

        if (targetTime && !isNaN(targetTime)) {
            let minDiff = Infinity;

            globalHistory.forEach(h => {
                const hTime = normalizeDate(h.date)?.getTime() || NaN;

                if (hTime > snapTime) {
                    const diff = Math.abs(hTime - targetTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        actual = h;
                    }
                }
            });
        } else {
            actual = [...globalHistory].reverse().find(h => (normalizeDate(h.date)?.getTime() || NaN) > snapTime);
        }

        if (!actual) return;

        // FIX: blindagem contra resultado real inválido
        const actualScore = Number(actual.score);
        if (!Number.isFinite(actualScore)) return;

        const age = Math.max(0, now - snapTime);
        const weight = Math.exp(-LAMBDA * age);

        // FIX: calibrar contra a PREVISÃO REALMENTE FEITA (projectedMean),
        // não contra a média corrente do dia do snapshot.
        // O campo mean era "onde estou", projectedMean era "onde projetei chegar".
        const meanPrediction = Number(snapshot.projectedMean ?? snapshot.mean) || 0;

        if (meanPrediction > 0 && maxScore > 0) {
            const err = Math.abs(meanPrediction - actualScore) / maxScore;
            residualSum += err * weight;
            residualWeightSum += weight;
        }

        const p = Math.max(0, Math.min(1, (Number(snapshot.probability) || 0) / 100));
        const target = Number(snapshot.target) || 0;

        if (target > 0) {
            const observed = actualScore >= target ? 1 : 0;
            const brierScore = (p - observed) ** 2;
            brierSum += brierScore * weight;
            brierWeightSum += weight;
        }
    });

    let calibrationPenalty = 0;

    // FIX: guarda de amostra efetiva mínima.
    // Sem isso, um único evento azarado (ex.: dia de prova ruim) gerava
    // penalidade máxima e o sistema ficava "desconfiado" sem evidência estatística.
    const hasEffectiveSample =
        brierWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES ||
        residualWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES;

    if (hasEffectiveSample && (brierWeightSum > 0 || residualWeightSum > 0)) {
        const avgBrier = brierWeightSum > 0 ? brierSum / brierWeightSum : 0;
        const avgResidual = residualWeightSum > 0 ? residualSum / residualWeightSum : 0;

        const rawBrierPenalty = Math.max(0, avgBrier - 0.18);
        const combinedPenalty = (rawBrierPenalty * 0.7) + (avgResidual * 0.3);

        calibrationPenalty = Math.min(MAX_CALIBRATION_PENALTY, combinedPenalty);
    }

    if (summary && summary.avgBrier > 0) {
        const summaryPenalty = Math.max(0, (summary.avgBrier - 0.18) * 0.8);
        calibrationPenalty = Math.max(calibrationPenalty, Math.min(MAX_CALIBRATION_PENALTY * 0.9, summaryPenalty));
    }

    return calibrationPenalty;
}

export function generateAnalyticsStats({
    categories,
    debouncedWeights,
    timeIndex,
    timelineDates,
    minScore,
    maxScore,
    simuladoRows = []
}) {
    // FIX: domínios globais seguros
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
    const safeMinScore = Number.isFinite(minScore) ? Math.min(minScore, safeMaxScore) : 0;
    const globalDomain = Math.max(1e-6, safeMaxScore - safeMinScore);

    let categoryStats = [];
    let totalWeight = 0;

    // FIX: pooling bayesiano agora é feito em PROPORÇÃO padronizada (0-1),
    // não em alpha/beta absolutos misturados entre domínios diferentes.
    let weightedPropAlpha = 0;
    let weightedPropBeta = 0;

    const scoresByDate = {};
    const weightsByKey = {};
    const maxScoreByKey = {};
    const bayesianStats = [];

    const cutoffDate = (timeIndex >= 0 && timeIndex < timelineDates.length)
        ? timelineDates[timeIndex]
        : null;

    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});

    safeCategories.forEach(cat => {
        const historyRaw = cat.simuladoStats?.history || [];
        const historyArray = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});

        if (historyArray.length > 0) {
            const catMaxScore = Number(cat.maxScore) || safeMaxScore;
            const catMinScore = Number.isFinite(Number(cat.minCutoff)) ? Number(cat.minCutoff) : safeMinScore;
            const catDomain = Math.max(1e-6, catMaxScore - catMinScore);

            const history = [...historyArray]
                .filter(h => {
                    if (!cutoffDate) return true;
                    const dateString = getDateKey(getHistoryDate(h));
                    if (!dateString) return false;
                    return dateString <= cutoffDate;
                })
                .map(h => ({ h, t: normalizeDate(getHistoryDate(h))?.getTime() ?? 0 }))
                .sort((a, b) => a.t - b.t)
                .map(item => item.h);

            if (history.length === 0) return;

            const weightKey = cat.id || cat.name;
            const weight = sanitizeWeightUnit(debouncedWeights[weightKey] ?? 0);

            const baye = computeBayesianLevel(history, 1, 1, catMaxScore);
            const stats = computeCategoryStats(history, weight, 60, catMaxScore);
            const vol = calculateVolatility(history, catMaxScore);

            if (stats && weight > 0) {
                totalWeight += weight;

                // FIX: padronizar a média bayesiana da disciplina em proporção
                // do seu próprio domínio ANTES do pooling global.
                //
                // Antes: alpha/(alpha+beta) * maxScore global.
                // Problema 1: disciplinas com maxScore diferente contaminavam a média.
                // Problema 2: minScore != 0 era ignorado.
                const rawBayeMean = Number(baye.mean);
                const safeBayeMean = Number.isFinite(rawBayeMean)
                    ? rawBayeMean
                    : (catMinScore + catDomain * 0.5);

                const catProp = clamp((safeBayeMean - catMinScore) / catDomain, 0, 1);

                // Força da evidência (pseudo-contagens), limitada para nenhuma
                // disciplina dominar o pooling global sozinha.
                const strength = (Number(baye.alpha) || 0) + (Number(baye.beta) || 0);
                const CONFIDENCE_CAP = 50;
                const cappedStrength = Math.min(Math.max(strength, 1e-9), CONFIDENCE_CAP);

                weightedPropAlpha += catProp * cappedStrength * weight;
                weightedPropBeta += (1 - catProp) * cappedStrength * weight;

                weightsByKey[weightKey] = weight;
                maxScoreByKey[weightKey] = catMaxScore;

                history.forEach(h => {
                    const currentScore = getSafeScore(h, catMaxScore);

                    // RIGOR FIX: Proteção contra Corrupção de Dados e o "0s Bug".
                    // 1. Evita que um NaN vicie a média do dia e destrua o dia inteiro.
                    if (!Number.isFinite(currentScore)) return;

                    // 2. Filtramos o infame "0s bug" originário do simulado timer
                    // para não desabar artificialmente a projeção do Monte Carlo.
                    const tTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                    if (tTs !== null && tTs <= 0 && currentScore === 0) return;

                    const dk = getDateKey(getHistoryDate(h));

                    if (dk) {
                        if (!scoresByDate[dk]) scoresByDate[dk] = {};

                        const existing = scoresByDate[dk][weightKey];
                        const currentTotal = Number(h.total) || 0;
                        const currentCorrect = Number(h.correct) || 0;

                        if (existing) {
                            const newTotal = existing.total + currentTotal;
                            const newCorrect = existing.correct + currentCorrect;
                            const newScore = newTotal > 0
                                ? (newCorrect / newTotal) * catMaxScore
                                : (existing.score + currentScore) / 2;

                            scoresByDate[dk][weightKey] = { score: newScore, correct: newCorrect, total: newTotal };
                        } else {
                            scoresByDate[dk][weightKey] = { score: currentScore, correct: currentCorrect, total: currentTotal };
                        }
                    }
                });

                categoryStats.push({
                    key: weightKey,
                    name: cat.name,
                    ...stats,
                    maxScore: catMaxScore,
                    minScore: catMinScore,
                    bayesianMean: baye.mean,
                    bayesianSd: baye.sd,
                    volatility: vol,
                    weight,
                    minCutoff: Number(cat.minCutoff) || 0
                });

                bayesianStats.push({ sd: baye.sd, weight, n: history.length });
            }
        }
    });

    if (categoryStats.length === 0 || totalWeight === 0) return null;

    const sortedDates = Object.keys(scoresByDate).sort((a, b) => new Date(a) - new Date(b));
    const subjectNames = categoryStats.map(cat => cat.key || cat.name);

    const estimatedRho = getAdaptiveInterSubjectCorrelation(
        categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })),
        simuladoRows,
        subjectNames,
        undefined,
        safeMaxScore
    );

    const pooledVariance = computeWeightedVariance(
        categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })),
        totalWeight,
        estimatedRho
    );

    const pooledSD = totalWeight > 0 ? Math.sqrt(Math.max(0, pooledVariance)) : 0;

    categoryStats = computeHierarchicalAdjustment(categoryStats, pooledSD);

    // FIX: média bayesiana global em proporção, mapeada para o domínio global
    // respeitando minScore. Sem dados, assume o ponto médio (não zero).
    const propSum = weightedPropAlpha + weightedPropBeta;
    const globalProp = propSum > 0 ? (weightedPropAlpha / propSum) : 0.5;
    const bayesianMean = safeMinScore + (globalProp * globalDomain);

    const pooledBayesianVar = computeWeightedVariance(bayesianStats, totalWeight, estimatedRho);
    const pooledBayesianSD = Math.sqrt(Math.max(0, pooledBayesianVar));

    const rawGlobalHistory = sortedDates.map(date => {
        let pooledCorrect = 0;
        let pooledTotal = 0;

        Object.keys(scoresByDate[date]).forEach(name => {
            const w = weightsByKey[name];
            const catMaxScore = maxScoreByKey[name] || safeMaxScore;
            const metrics = scoresByDate[date][name];

            if (w > 0 && metrics !== undefined) {
                const total = metrics.total || getSyntheticTotal(catMaxScore);
                const correct = (metrics.correct !== undefined && metrics.total > 0)
                    ? metrics.correct
                    : (metrics.score / catMaxScore) * total;

                pooledCorrect += correct * w;
                pooledTotal += total * w;
            }
        });

        return { date, score: pooledTotal > 0 ? (pooledCorrect / pooledTotal) * safeMaxScore : -1 };
    }).filter(item => item.score >= 0 && !isNaN(item.score));

    const adaptiveSignal = computeAdaptiveSignal(rawGlobalHistory);
    const confidenceMultiplier = getConfidenceMultiplier(adaptiveSignal.effectiveN) * adaptiveSignal.ciInflation;

    const weightedLow = Math.max(safeMinScore, bayesianMean - confidenceMultiplier * pooledBayesianSD);
    const weightedHigh = Math.min(safeMaxScore, bayesianMean + confidenceMultiplier * pooledBayesianSD);

    const globalHistory = rawGlobalHistory;

    const winsorizedScores = winsorizeSeries(
        globalHistory.map(h => getSafeScore(h, safeMaxScore)),
        adaptiveSignal.adaptiveWinsor.low,
        adaptiveSignal.adaptiveWinsor.high
    );

    const robustGlobalHistory = globalHistory.map((h, idx) => ({ ...h, score: winsorizedScores[idx] }));

    const temporalVolatility = calculateVolatility(robustGlobalHistory, safeMaxScore);
    const dailySD = temporalVolatility > 0 ? temporalVolatility : pooledSD;

    const avgCV = totalWeight > 0
        ? categoryStats.reduce((acc, cat) => acc + ((cat.mean > 1 ? (cat.sd / cat.mean) * 100 : 0) * (cat.weight / totalWeight)), 0)
        : 0;

    const hLen = robustGlobalHistory.length;
    const firstScore = hLen > 0 ? (robustGlobalHistory[0].score || 0).toFixed(4) : '0';
    const lastScore = hLen > 0 ? (robustGlobalHistory[hLen - 1].score || 0).toFixed(4) : '0';
    const scoreFingerprint = `${hLen}-${firstScore}-${lastScore}`;

    const cutoffs = categoryStats.map(c => c.minCutoff || 0).join('-');

    const statsHash = `${bayesianMean.toFixed(4)}-${pooledSD.toFixed(4)}-${safeMinScore}-${safeMaxScore}-${scoreFingerprint}-cutoffs[${cutoffs}]`;

    return {
        categoryStats,
        bayesianMean,
        pooledSD,
        totalWeight,
        bayesianCI: { ciLow: weightedLow, ciHigh: weightedHigh },
        globalHistory,
        dailySD,
        estimatedRho,
        consistencyScore: Math.max(0, 100 - avgCV),
        statsHash
    };
}
```

---

