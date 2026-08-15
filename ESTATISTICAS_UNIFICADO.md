# CÓDIGO UNIFICADO — MÓDULO DE ESTATÍSTICAS & SIMULAÇÃO DE MONTE CARLO

> **Data de Geração:** 2026-08-15T19:43:04.177Z
> **Total de Arquivos:** 40
> **Total de Linhas de Código:** 14.926
> **Tamanho Total:** 640.33 KB

Este documento consolida integralmente todos os arquivos de código-fonte que compõem o **Menu Estatísticas** da aplicação, incluindo páginas, componentes visuais, gráficos interativos, hooks reativos, motores matemáticos/estatísticos, inferência de calibração, algoritmos Monte Carlo e gerenciamento de estado Zustand.

---

## 📑 ÍNDICE GERAL DE ARQUIVOS

### 1. Páginas e Visão Principal (Pages)

| Arquivo | Linhas | Tamanho | Âncora |
| :--- | :---: | :---: | :--- |
| `src/pages/Stats.jsx` | 143 | 8.3 KB | [Acessar Código](#src-pages-stats-jsx) |

### 2. Componentes de UI (Components)

| Arquivo | Linhas | Tamanho | Âncora |
| :--- | :---: | :---: | :--- |
| `src/components/VerifiedStats.jsx` | 1.027 | 57.6 KB | [Acessar Código](#src-components-verifiedstats-jsx) |
| `src/components/MonteCarloGauge.jsx` | 799 | 41.8 KB | [Acessar Código](#src-components-montecarlogauge-jsx) |
| `src/components/WeeklyAnalysis.jsx` | 349 | 18.5 KB | [Acessar Código](#src-components-weeklyanalysis-jsx) |
| `src/components/DueForecast.jsx` | 136 | 6.7 KB | [Acessar Código](#src-components-dueforecast-jsx) |

### 3. Gráficos e Visualizações (Charts)

| Arquivo | Linhas | Tamanho | Âncora |
| :--- | :---: | :---: | :--- |
| `src/components/charts/GaussianPlot.jsx` | 478 | 24.9 KB | [Acessar Código](#src-components-charts-gaussianplot-jsx) |
| `src/components/charts/MonteCarloConfig.jsx` | 487 | 28.2 KB | [Acessar Código](#src-components-charts-montecarloconfig-jsx) |
| `src/components/charts/Analytics/EvolucaoFocoChart.jsx` | 76 | 3.4 KB | [Acessar Código](#src-components-charts-analytics-evolucaofocochart-jsx) |
| `src/components/charts/Analytics/HorasDisciplinaChart.jsx` | 90 | 4.1 KB | [Acessar Código](#src-components-charts-analytics-horasdisciplinachart-jsx) |
| `src/components/charts/DueForecastChart.jsx` | 97 | 4.1 KB | [Acessar Código](#src-components-charts-dueforecastchart-jsx) |
| `src/components/charts/ChartFrame.jsx` | 106 | 3.6 KB | [Acessar Código](#src-components-charts-chartframe-jsx) |
| `src/components/charts/ChartTooltip.jsx` | 147 | 11.6 KB | [Acessar Código](#src-components-charts-charttooltip-jsx) |

### 4. Hooks Reativos do React (Hooks)

| Arquivo | Linhas | Tamanho | Âncora |
| :--- | :---: | :---: | :--- |
| `src/hooks/useMonteCarloStats.js` | 1.434 | 48.7 KB | [Acessar Código](#src-hooks-usemontecarlostats-js) |
| `src/hooks/useMonteCarloWorker.js` | 179 | 7.2 KB | [Acessar Código](#src-hooks-usemontecarloworker-js) |

### 5. Motores Estatísticos e Probabilísticos (Engine)

| Arquivo | Linhas | Tamanho | Âncora |
| :--- | :---: | :---: | :--- |
| `src/engine/monteCarlo.js` | 776 | 29.3 KB | [Acessar Código](#src-engine-montecarlo-js) |
| `src/engine/projection.js` | 1.021 | 49.3 KB | [Acessar Código](#src-engine-projection-js) |
| `src/engine/analyticsStats.js` | 493 | 19.7 KB | [Acessar Código](#src-engine-analyticsstats-js) |
| `src/engine/stats.js` | 1.138 | 43.6 KB | [Acessar Código](#src-engine-stats-js) |
| `src/engine/variance.js` | 477 | 19.3 KB | [Acessar Código](#src-engine-variance-js) |
| `src/engine/diagnostics.js` | 722 | 27.7 KB | [Acessar Código](#src-engine-diagnostics-js) |
| `src/engine/insightGenerator.js` | 343 | 17.7 KB | [Acessar Código](#src-engine-insightgenerator-js) |
| `src/engine/mc.worker.js` | 273 | 13.2 KB | [Acessar Código](#src-engine-mc-worker-js) |
| `src/engine/math/gaussian.js` | 482 | 16.6 KB | [Acessar Código](#src-engine-math-gaussian-js) |
| `src/engine/math/bootstrap.js` | 116 | 3.4 KB | [Acessar Código](#src-engine-math-bootstrap-js) |
| `src/engine/math/percentile.js` | 174 | 6.1 KB | [Acessar Código](#src-engine-math-percentile-js) |
| `src/engine/math/kahan.js` | 65 | 2.2 KB | [Acessar Código](#src-engine-math-kahan-js) |
| `src/engine/math/safe.js` | 138 | 3.2 KB | [Acessar Código](#src-engine-math-safe-js) |

### 6. Utilitários, Calibração e Mapeadores (Utils)

| Arquivo | Linhas | Tamanho | Âncora |
| :--- | :---: | :---: | :--- |
| `src/utils/chartDataMappers.js` | 237 | 10.0 KB | [Acessar Código](#src-utils-chartdatamappers-js) |
| `src/utils/explanationEngine.js` | 171 | 4.5 KB | [Acessar Código](#src-utils-explanationengine-js) |
| `src/utils/calibration.js` | 396 | 18.9 KB | [Acessar Código](#src-utils-calibration-js) |
| `src/utils/calibrationTelemetry.js` | 89 | 3.2 KB | [Acessar Código](#src-utils-calibrationtelemetry-js) |
| `src/utils/ProgressStateEngine.js` | 243 | 9.8 KB | [Acessar Código](#src-utils-progressstateengine-js) |
| `src/utils/analytics.js` | 1.076 | 39.6 KB | [Acessar Código](#src-utils-analytics-js) |
| `src/utils/scoreHelper.js` | 255 | 9.0 KB | [Acessar Código](#src-utils-scorehelper-js) |
| `src/utils/scoreHelper.conversions.js` | 58 | 2.4 KB | [Acessar Código](#src-utils-scorehelper-conversions-js) |
| `src/utils/scoreDomain.js` | 89 | 2.7 KB | [Acessar Código](#src-utils-scoredomain-js) |
| `src/utils/monteCarloScenario.js` | 52 | 3.3 KB | [Acessar Código](#src-utils-montecarloscenario-js) |
| `src/utils/weeklyEvolutionInsights.js` | 99 | 2.8 KB | [Acessar Código](#src-utils-weeklyevolutioninsights-js) |
| `src/utils/dateHelper.js` | 283 | 9.6 KB | [Acessar Código](#src-utils-datehelper-js) |

### 7. Gerenciamento de Estado (Zustand Store)

| Arquivo | Linhas | Tamanho | Âncora |
| :--- | :---: | :---: | :--- |
| `src/store/slices/createMonteCarloSlice.js` | 112 | 4.6 KB | [Acessar Código](#src-store-slices-createmontecarloslice-js) |

---

## 💻 CÓDIGO-FONTE INTEGRAL

# 1. PÁGINAS E VISÃO PRINCIPAL (PAGES)

## `src/pages/Stats.jsx` <a id="src-pages-stats-jsx"></a>

- **Localização:** `src/pages/Stats.jsx`
- **Linhas:** 143
- **Tamanho:** 8.34 KB

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { EvolucaoFocoChart } from '../components/charts/Analytics/EvolucaoFocoChart';
import { HorasDisciplinaChart } from '../components/charts/Analytics/HorasDisciplinaChart';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function Stats() {
    const { rawCategories, rawStudyLogs, rawFlashcards, rawSimuladoRows, user } = useAppStore(useShallow(state => {
        const contests = state?.appState?.contests || {};
        const activeId = state?.appState?.activeId;
        const contest = contests[activeId] || {};
        return {
            rawCategories: contest.categories,
            rawStudyLogs: contest.studyLogs,
            rawFlashcards: contest.flashcardDecks,
            rawSimuladoRows: contest.simuladoRows,
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
        const hasRows = Array.isArray(rawSimuladoRows) ? rawSimuladoRows.length > 0 : Object.keys(rawSimuladoRows || {}).length > 0;
        if (hasRows) return true;
        return Array.isArray(categories) && categories.some(category => {
            const h = category?.simuladoStats?.history;
            return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
        });
    }, [rawSimuladoRows, categories]);
    // T-022 FIX: cards podem vir como objeto no Firebase.
    const hasFlashcards = useMemo(() => {
        return Array.isArray(flashcardDecks) && flashcardDecks.some(d => {
            const cards = Array.isArray(d?.cards)
                ? d.cards
                : Object.values(d?.cards || {});

            return cards.length > 0;
        });
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

# 2. COMPONENTES DE UI (COMPONENTS)

## `src/components/VerifiedStats.jsx` <a id="src-components-verifiedstats-jsx"></a>

- **Localização:** `src/components/VerifiedStats.jsx`
- **Linhas:** 1027
- **Tamanho:** 57.60 KB

```javascript
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

    const maxScore = useMemo(() => {
        const scores = safeCategories.map(c => Number(c.maxScore)).filter(s => Number.isFinite(s) && s > 0);
        return scores.length > 0 ? Math.max(...scores) : 100;
    }, [safeCategories]);

    // T-039 FIX: estabilizar a prop unit para ajudar na memoização do gauge
    const gaugeUnit = useMemo(() => {
        return maxScore === 100 ? '%' : ' pts';
    }, [maxScore]);

    // FIX LÓGICO: Clampar meta à escala [0, maxScore] sem loops multiplicativos
    const normalizeTargetToScale = React.useCallback((raw) => {
        const n = Number(raw);

        const fallback = maxScore === 100
            ? 70
            : Math.round(maxScore * 0.7);

        if (!Number.isFinite(n) || n <= 0) return fallback;

        return Math.max(0, Math.min(maxScore, n));
    }, [maxScore]);

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

    const activeId = useAppStore(state => state.appState?.activeId);
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
        const currentStoreTarget = normalizeTargetToScale(parseFloat(storeTarget));

        // Se o valor local já é igual ao da Store, não fazemos nada
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
                    const safeScore = getSafeScore(h, catMaxScore);
                    const parsedDate = normalizeDate(h.date);
                    if (parsedDate && safeScore >= 0) {
                        // 0s Bug Filter: Proteção contra Corrupção de Dados
                        const tTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                        if (tTs !== null && tTs <= 0 && safeScore === 0) return;

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
                // BUG-01 FIX: Converte a string YYYY-MM-DD de volta para ms local para o motor (calculateSlope)
                // FIX 2.3: Usar normalizeDate para evitar shift de dia por ambiguidade UTC/local
                date: normalizeDate(getDateKey(new Date(d.date)))?.getTime() ?? d.date, 
                score: d.weightSum > 0 ? d.scoreSum / d.weightSum : 0,
                weight: d.weightSum // BUG-01 FIX: Preservamos o volume para evitar Paradoxo de Simpson em médias posteriores
            }))
            .sort((a, b) => a.date - b.date);

        return { dailyHistory, allHistory, totalQuestionsGlobal, sortedCategories: safeCategories };
    }, [safeCategories, maxScore]);

    const stats = useMemo(() => {
        const { dailyHistory, allHistory, totalQuestionsGlobal, sortedCategories } = baseHistoryStats;

        // T-035/T-026 FIX: O ProgressStateEngine espera limites em porcentagem da escala.
        // statsTarget é absoluto (ex.: 700 numa escala 1000), então convertemos para %.
        const targetPct = maxScore > 0
            ? Math.max(0, Math.min(100, (statsTarget / maxScore) * 100))
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
                    const dailySD = Math.sqrt(Math.max(0, dailyVar));

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
                const analysisHistory = sortedHistory.slice(-5).map(h => ({
                    score: (getSafeScore(h, catMaxScore) / catMaxScore) * maxScore,
                    date: normalizeDate(h.date)?.getTime() ?? Date.now()
                }));

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

                            // CORREÇÃO: Usar catMaxScore da matéria específica para ler o score antes da normalização
                            const safeScore = getSafeScore(t, catMaxScore);

                            const correct = (safeScore >= 0 && total > 0)
                                ? Math.round((Math.min(catMaxScore, safeScore) / catMaxScore) * total)
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
    }, [baseHistoryStats, statsTarget, maxScore]);

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

## `src/components/MonteCarloGauge.jsx` <a id="src-components-montecarlogauge-jsx"></a>

- **Localização:** `src/components/MonteCarloGauge.jsx`
- **Linhas:** 799
- **Tamanho:** 41.84 KB

```javascript
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Gauge, TrendingUp, TrendingDown, Settings2, ChevronDown, AlertTriangle, Activity } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { formatValue } from '../utils/scoreHelper';
import { getDateKey, formatDatePtBR, normalizeDate, parseNoonLocal } from '../utils/dateHelper';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * MonteCarloGauge — Componente Principal de Projeção Estatística
 * 
 * Agora refatorado para usar o hook customizado useMonteCarloStats para 
 * desacoplar a lógica matemática da renderização de UI.
 */
// T-039 FIX: memoizar o gauge para reduzir re-renderizações desnecessárias.
const MonteCarloGaugeBase = ({
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
    precomputedStats = null, // ✅ NOVO
}) => {
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
        // T-025 FIX: evitar new Date('YYYY-MM-DD') por causa de parsing UTC ambíguo.
        return Array.from(dates).sort((a, b) => {
            const da = parseNoonLocal?.(a)?.getTime() ?? normalizeDate(a)?.getTime() ?? 0;
            const db = parseNoonLocal?.(b)?.getTime() ?? normalizeDate(b)?.getTime() ?? 0;
            return da - db;
        });
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
    // T-008 FIX: Normalizar para array antes de passar ao MonteCarloConfig.
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

    // Prioritize sync prop if provided
    const showPerSubject = syncShowSubjects !== undefined ? syncShowSubjects : localShowPerSubject;
    const setShowPerSubject = onSyncShowSubjects !== undefined ? onSyncShowSubjects : setLocalShowPerSubject;



    const clampedTimeIndex = (timeIndex < 0 || timeIndex >= timelineDates.length) ? -1 : timeIndex;
    const resolvedSimulateToday = typeof onSimulateTodayChange === 'function' ? Boolean(simulateToday) : localSimulateToday;
    const setSimulateToday = typeof onSimulateTodayChange === 'function' ? onSimulateTodayChange : setLocalSimulateToday;
    const effectiveSimulateToday = forcedMode ? (forcedMode === 'today') : resolvedSimulateToday;

    // --- HOOK DE LÓGICA ESTATÍSTICA ---
    const stats = precomputedStats ?? useMonteCarloStats({
        categories,
        goalDate,
        targetScore,
        timeIndex: clampedTimeIndex,
        timelineDates,
        minScore,
        maxScore,
        forcedMode,
        effectiveSimulateToday,
        // T-040 FIX: só calcular subjects quando o painel estiver visível
        enablePerSubject: showPerSubject
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
    // T-009 FIX: setWeights da store pode não aceitar função updater.
    // Usamos o valor atual de `weights` diretamente para evitar corrupção de estado.
    const stableUpdateWeight = useCallback((name, p) => {
        setWeights({ ...(weights || {}), [name]: p });
    }, [setWeights, weights]);

    const getEqualWeights = useCallback(() => {
        const newWeights = {};

        // T-018 FIX: normalizar categories
        const safeCategories = Array.isArray(categories)
            ? categories
            : Object.values(categories || {});

        safeCategories.filter(c => {
            const h = c.simuladoStats?.history;
            return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
        }).forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
        });
        return newWeights;
    }, [categories]);

    // T-032 FIX: diagnóstico mais preciso do estado de espera.
    const safeCategories = Array.isArray(categories)
        ? categories
        : Object.values(categories || {});

    const hasHistory = safeCategories.some(cat => {
        const h = cat.simuladoStats?.history;
        return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
    });

    const totalActiveWeight = (() => {
        // No modo pesos iguais sempre existe peso ativo.
        if (equalWeightsMode) return 1;

        return safeCategories.reduce((sum, cat) => {
            const h = cat.simuladoStats?.history;
            const hLen = h
                ? (Array.isArray(h) ? h.length : Object.keys(h).length)
                : 0;

            if (hLen === 0) return sum;

            const rawW = weights?.[cat.id || cat.name];

            // Se o peso não foi definido, o motor assume 1.
            const w = (rawW === undefined || rawW === null)
                ? 1
                : Number(rawW);

            return sum + Math.max(0, Number.isFinite(w) ? w : 0);
        }, 0);
    })();

    // T-026 FIX: unidade dinâmica.
    // Se o componente vier com unidade padrão '%' mas a escala não for 100,
    // assumimos pontos absolutos.
    const resolvedUnit = useMemo(() => {
        if (typeof unit === 'string' && unit.trim() !== '' && unit !== '%') {
            return unit;
        }

        return Number(maxScore) === 100 ? '%' : ' pts';
    }, [unit, maxScore]);

    if (!simulationData || simulationData.status === 'waiting') {
        let waitingKind = 'loading';

        if (!hasHistory) {
            waitingKind = 'empty';
        } else if (totalActiveWeight === 0) {
            waitingKind = 'zeroWeights';
        } else if (simulationData?.missing === 'count') {
            waitingKind = 'insufficient';
        }

        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-slate-900 w-full min-h-[400px]">
                {waitingKind === 'empty' && <EmptyPredictionState />}
                {waitingKind === 'zeroWeights' && <AllWeightsZeroState />}
                {waitingKind === 'insufficient' && <InsufficientHistoryState />}
                {waitingKind === 'loading' && <MonteCarloLoading />}
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
    const projectionDeltaLabel = `${projectionDelta >= 0 ? '+' : ''}${formatValue(projectionDelta)}${resolvedUnit}`;

    const isTodayMode = forcedMode === 'today';
    const isFutureMode = forcedMode === 'future';

    const cardTheme = isTodayMode
        ? {
            border: 'border-l-4 border-emerald-500',
            glow: 'hover:shadow-emerald-500/10',
            iconBg: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 shadow-emerald-500/10',
            iconColor: 'text-emerald-400',
            title: forcedTitle || 'Status Atual',
            subtitle: 'Dados Consolidados',
            badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
            badgeLabel: 'Empírico'
        }
        : isFutureMode
        ? {
            border: 'border-l-4 border-indigo-500',
            glow: 'hover:shadow-indigo-500/10',
            iconBg: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 shadow-indigo-500/10',
            iconColor: 'text-indigo-400',
            title: forcedTitle || 'Projeção Futura',
            subtitle: 'Estimativa na Data-Alvo',
            badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
            badgeLabel: 'Simulação'
        }
        : {
            border: 'border-l-4 border-blue-500',
            glow: 'hover:shadow-blue-500/10',
            iconBg: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 shadow-blue-500/10',
            iconColor: 'text-blue-400',
            title: 'Monte Carlo',
            subtitle: 'Simulação Probabilística',
            badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
            badgeLabel: resolvedSimulateToday ? 'Hoje' : 'Futuro'
        };

    return (
        <div className={`glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl relative flex flex-col ${cardTheme.border} bg-slate-900/90 group transition-all duration-500 shadow-2xl ${cardTheme.glow} w-full h-full flex-1 ${isFlashing ? 'opacity-90 scale-[0.99]' : ''}`}>
            {isFlashing && (
                <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-3xl">
                    <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent absolute top-0 left-0 animate-scan-fast" />
                </div>
            )}

            <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cardTheme.iconBg} border flex items-center justify-center shadow-lg shrink-0`}>
                        <Gauge size={18} className={cardTheme.iconColor} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase tracking-wider leading-none">{cardTheme.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${cardTheme.badgeBg}`}>
                                {cardTheme.badgeLabel}
                            </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 mt-1">{cardTheme.subtitle}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!forcedMode && (
                        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                title="Configurar Classificações"
                            >
                                <Settings2 size={16} />
                            </button>
                            <div className="w-px h-4 bg-white/10" />
                            <button
                                onClick={(e) => { e.stopPropagation(); setSimulateToday(!resolvedSimulateToday); }}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${resolvedSimulateToday ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
                            >
                                <span>{resolvedSimulateToday ? 'Hoje' : 'Futuro'}</span>
                                <ChevronDown size={12} className={`transition-transform duration-300 ${resolvedSimulateToday ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center mb-4">
                <div className={`w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3.5 transition-all duration-700 shadow-xl relative overflow-hidden ${isFlashing ? 'blur-sm' : ''}`}>
                    {/* Gauge Arc Graphic */}
                    <div className="relative w-full max-w-[260px] h-[130px] flex justify-center mt-1">
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
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center z-20 translate-y-1">
                            <span className="text-3xl sm:text-4xl font-black leading-none tracking-tight" style={{ color: getGradientColor(prob) }}>
                                <AnimatedProbability value={pAdjustedSafe} />
                            </span>
                        </div>
                    </div>

                    {/* Classification Status Pill */}
                    <span 
                        className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-slate-900/90 border shadow-sm transition-all duration-500" 
                        style={{ color: isFlashing ? '#60a5fa' : gradientColor, borderColor: `${gradientColor}40` }}
                    >
                        {isFlashing ? "Simulando..." : message}
                    </span>
                    
                    {/* CONFORMAL PREDICTION HUD (Faixa Provável 95%) */}
                    <div className="w-full bg-slate-900/80 rounded-xl p-3 border border-white/10 shadow-inner flex flex-col items-center justify-center">
                        <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Faixa Provável (95%)
                            </span>
                            {stats.confidenceObj && (
                                <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border shadow-sm ${
                                    stats.confidenceObj.tier === 'HIGH'
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10'
                                        : stats.confidenceObj.tier === 'MEDIUM'
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/10'
                                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-500/10'
                                }`}>
                                    <span className={`w-1 h-1 rounded-full ${
                                        stats.confidenceObj.tier === 'HIGH' ? 'bg-emerald-400 animate-pulse' :
                                        stats.confidenceObj.tier === 'MEDIUM' ? 'bg-amber-400' : 'bg-rose-400'
                                    }`} />
                                    <span>{stats.confidenceObj.label}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-baseline justify-center gap-2 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{formatValue(ciLowSafe)}</span>
                            <span className="text-slate-500 font-bold text-sm">—</span>
                            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{formatValue(ciHighSafe)}</span>
                            <span className="text-xs font-bold text-slate-400">{resolvedUnit}</span>
                        </div>
                    </div>
                    
                    {/* Insights & Drift Alerts Container - Balanced Height */}
                    <div className="w-full bg-slate-900/50 rounded-xl p-3 border border-white/5 flex flex-col gap-1.5 min-h-[76px] justify-center">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            <Activity size={11} className="text-blue-400" />
                            <span>Diagnóstico & Sinais</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {stats.explanations && stats.explanations.map((msg, i) => (
                                <div key={i} className="text-[10.5px] text-slate-300 font-medium leading-snug flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 mt-1.5 shrink-0" />
                                    <span>{msg}</span>
                                </div>
                            ))}
                            {(!stats.explanations || stats.explanations.length === 0) && (
                                <div className="text-[10.5px] text-slate-400 italic">
                                    Desempenho estável conforme o modelo estatístico.
                                </div>
                            )}
                            {stats.driftAlerts && stats.driftAlerts.map((alert, i) => (
                                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${
                                    alert.severity === 'high' 
                                        ? 'bg-rose-500/10 border-rose-500/25 text-rose-300' 
                                        : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                } mt-0.5`}>
                                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
                                    <span className="text-[10.5px] font-bold leading-tight">{alert.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Guarantee Subtext */}
                    <p className="pt-2 text-[9px] text-slate-500 font-medium uppercase tracking-wider text-center w-full leading-relaxed opacity-80 border-t border-white/5">
                        Em previsões semelhantes, 95% dos resultados reais ficaram dentro desta faixa.
                    </p>
                </div>
            </div>

            {/* Telemetry Metrics 6-Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-4 w-full">
                {[
                    { 
                        label: "Sua Meta", 
                        badgeClass: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
                        val: `${formatValue(targetSafe)}${resolvedUnit}`, 
                        color: "text-rose-400" 
                    },
                    { 
                        label: isTimeTraveling ? "Nesse Dia" : "Hoje", 
                        badgeClass: "bg-slate-700/40 text-slate-200 border border-white/10",
                        val: `${formatValue(currentSafe)}${resolvedUnit}`, 
                        color: "text-white" 
                    },
                    { 
                        label: "Projeção", 
                        badgeClass: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
                        val: `${formatValue(projectedSafe)}${resolvedUnit}`, 
                        color: "text-blue-400" 
                    },
                    {
                        label: effectiveSimulateToday ? "Δ vs Hoje" : "Δ Futuro vs Hoje",
                        badgeClass: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
                        val: projectionDeltaLabel,
                        color: isProjectionNearCurrent ? "text-amber-300" : "text-cyan-300"
                    },
                    {
                        label: "Incerteza",
                        badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
                        val: safe(sdLeft) === 0 && safe(sdRight) === 0 
                            ? `±0${resolvedUnit}` 
                            : `-${formatValue(safe(sdLeft))} / +${formatValue(safe(sdRight))}${resolvedUnit}`,
                        color: "text-amber-400"
                    },
                    {
                        label: "IC 95%",
                        badgeClass: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
                        val: `${formatValue(ciLowSafe)}–${formatValue(ciHighSafe)}${resolvedUnit}`,
                        color: "text-emerald-400"
                    }
                ].map((m, i) => (
                    <div key={i} className="bg-slate-950/50 p-2 sm:p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center min-h-[58px] transition-all hover:border-white/15 hover:bg-slate-900/60 shadow-sm">
                        <span className={`text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1 text-center w-auto max-w-full truncate ${m.badgeClass}`}>
                            {m.label}
                        </span>
                        <span className={`text-xs sm:text-sm font-black ${m.color} w-full text-center break-words leading-tight tracking-tight mt-0.5 font-mono`}>
                            {m.val}
                        </span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-slate-950/50 rounded-2xl p-4 sm:p-5 mb-4 border border-white/5 flex flex-col shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Curva de Densidade Probabilística</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1.5"><div className="w-2 h-0.5 bg-white rounded-full"></div>Hoje</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1.5"><div className="w-2 h-0.5 bg-blue-500 rounded-full"></div>Projeção</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1.5"><div className="w-2 h-0.5 bg-rose-500 rounded-full"></div>Meta</span>
                    </div>
                </div>
                <div className="w-full">
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
                        unit={resolvedUnit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                </div>
            </div>

            {timelineDates.length > 1 && (
                <div className="w-full mt-2 mb-4 px-4 py-3.5 bg-black/40 rounded-xl border border-white/5 relative z-10 min-h-[72px]">
                    <div className="flex justify-between items-center mb-3">
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
                        aria-label="Máquina do tempo"
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
                        {perSubjectProbs.map((s, idx) => {
                            const probColor = s.prob < 40 ? 'text-rose-400' : s.prob < 60 ? 'text-amber-400' : s.prob < 80 ? 'text-blue-400' : 'text-emerald-400';
                            return (
                                <div key={`${s.name}-${idx}`} className="flex flex-col gap-1.5 py-2 border-b border-white/5 last:border-0">
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
};

// T-039 FIX: exportar versão memoizada
export default React.memo(MonteCarloGaugeBase);

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

// T-032 FIX: Estado específico para pesos zerados.
function AllWeightsZeroState() {
    return (
        <div className="rounded-3xl p-6 border border-amber-500/20 bg-amber-950/10 flex flex-col items-center justify-center text-center h-full flex-1 w-full my-auto">
            <div className="text-3xl mb-3">⚖️</div>

            <h2 className="text-[12px] font-black text-amber-300 uppercase tracking-widest mb-3">
                Todos os pesos estão zerados
            </h2>

            <p className="text-[10px] text-slate-400 leading-relaxed font-medium max-w-[260px]">
                Há histórico de simulados, mas todas as matérias estão com peso zero.
                Ajuste os pesos em Configuração para calcular a simulação Monte Carlo.
            </p>

            <div className="mt-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                Abra Configurar Classificações e Meta
            </div>
        </div>
    );
}

// T-032 FIX: Estado específico para histórico insuficiente.
function InsufficientHistoryState() {
    return (
        <div className="rounded-3xl p-6 border border-blue-500/20 bg-blue-950/10 flex flex-col items-center justify-center text-center h-full flex-1 w-full my-auto">
            <div className="text-3xl mb-3">📉</div>

            <h2 className="text-[12px] font-black text-blue-300 uppercase tracking-widest mb-3">
                Histórico insuficiente
            </h2>

            <p className="text-[10px] text-slate-400 leading-relaxed font-medium max-w-[260px]">
                Há alguns dados, mas ainda não há pontos válidos suficientes para gerar uma projeção confiável.
                Lance mais simulados ou revise os filtros de data/pesos.
            </p>

            <div className="mt-4 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                Mínimo recomendado: 3 simulados
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

## `src/components/WeeklyAnalysis.jsx` <a id="src-components-weeklyanalysis-jsx"></a>

- **Localização:** `src/components/WeeklyAnalysis.jsx`
- **Linhas:** 349
- **Tamanho:** 18.46 KB

```javascript
import React, { useMemo } from 'react';
import { BookOpen, Zap, Activity, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { normalizeDate, formatDuration, getDateKey, formatDatePtBR, APP_TIMEZONE } from '../utils/dateHelper';

export default function WeeklyAnalysis({ studyLogs = [], categories = [] }) {

    const logsArray = useMemo(() => Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {}), [studyLogs]);
    const categoriesArray = useMemo(() => Array.isArray(categories) ? categories : Object.values(categories || {}), [categories]);

    // T-021 FIX: tasks podem ser arrays ou objetos no Firebase.
    const getTasksArray = (category) => {
        if (!category?.tasks) return [];
        return Array.isArray(category.tasks)
            ? category.tasks
            : Object.values(category.tasks || {});
    };

    const { groups, stats } = useMemo(() => {
        if (!logsArray || logsArray.length === 0) return { groups: [], stats: null };

        // T-029 FIX: Se minutes vier 0, mas duration existir, usa duration.
        const getLogMinutes = (log) => {
            const minutes = Number(log?.minutes);
            const duration = Number(log?.duration);

            if (Number.isFinite(minutes) && minutes > 0) return minutes;
            if (Number.isFinite(duration) && duration > 0) return duration;

            return 0;
        };

        // T-037 FIX: Indexar categorias por ID para lookup O(1).
        // Antes, cada log fazia .find() em categoriesArray, gerando O(logs * categories).
        const categoriesById = new Map();

        categoriesArray.forEach(c => {
            if (c?.id != null) {
                categoriesById.set(String(c.id), c);
            }
        });

        const findCategoryForLog = (log) => {
            if (!log) return undefined;

            if (log.categoryId != null) {
                const byId = categoriesById.get(String(log.categoryId));
                if (byId) return byId;
            }

            return categoriesArray.find(c =>
                (log.subject && c.name === log.subject) ||
                (log.categoryName && c.name === log.categoryName)
            );
        };

        const totalMinutes = logsArray.reduce((acc, log) => acc + getLogMinutes(log), 0);
        const totalSessions = logsArray.length;

        // Find top category
        const catCounts = {};
        logsArray.forEach(log => {
            // T-037 FIX: lookup indexado
            const category = findCategoryForLog(log);
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

            // T-024 FIX: usar chave de dia (getDateKey) em vez de comparar strings formatadas.
            // Isso reduz divergência de timezone perto da meia-noite.
            const uniqueDayKey = getDateKey(dateObj) || dateStr;

            const now = new Date();
            const todayKey = getDateKey(now);

            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const yesterdayKey = getDateKey(y);

            let dayLabel = dateStr;
            const rawWeekday = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, weekday: 'long' }).format(dateObj);
            const weekDayName = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1).split('-')[0];

            let isToday = false;
            let isYesterday = false;

            if (uniqueDayKey === todayKey) {
                dayLabel = "Hoje";
                isToday = true;
            } else if (uniqueDayKey === yesterdayKey) {
                dayLabel = "Ontem";
                isYesterday = true;
            } else {
                dayLabel = dateStr;
            }
            const manausDayStr = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, day: 'numeric' }).format(dateObj);

            if (!grouped[uniqueDayKey]) grouped[uniqueDayKey] = {
                uniqueDayKey,
                label: dayLabel,
                subLabel: weekDayName,
                manausDayStr,
                isToday,
                isYesterday,
                dateObj,
                categories: {}
            };

            // Category Grouping
            // T-037 FIX: lookup indexado
            const category = findCategoryForLog(log);
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
                // T-021 FIX: normalizar tasks antes do find
                const tasksArray = getTasksArray(category);
                const task = tasksArray.find(t => String(t?.id) === String(log.taskId));

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
        const finalGroups = Object.values(grouped).sort((a, b) => (b.dateObj?.getTime?.() ?? 0) - (a.dateObj?.getTime?.() ?? 0)).map((dayGroup) => {
            // Sort categories by Last Activity Time (Chronological)
            const cats = Object.values(dayGroup.categories).map(cat => ({
                ...cat,
                // T-038 FIX: reduce evita estourar stack com arrays grandes
                lastLogTime: cat.logs.reduce((max, l) => {
                    const t = normalizeDate(l.date)?.getTime() ?? 0;
                    return Math.max(max, t);
                }, 0)
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

        return {
            groups: finalGroups,
            stats: {
                totalDays: finalGroups.length,
                totalMinutes,
                totalSessions,
                topCategory
            }
        };
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
        <div className="glass rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-black/80 border border-white/5 shadow-2xl animate-fade-in-up">
            {/* Header with Stats Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Calendar size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            Linha do Tempo de Estudos
                        </h3>
                        <p className="text-xs text-slate-400">Histórico dia a dia de sessões e tarefas concluídas</p>
                    </div>
                </div>

                {/* Micro KPIs */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-200">{formatTime(stats.totalMinutes)}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-200">{stats.totalSessions} blocos</span>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="relative pl-12 sm:pl-20 space-y-12 before:content-[''] before:absolute before:left-[14px] sm:before:left-[34px] before:top-4 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-slate-700 before:to-transparent">
                {groups.map((dayGroup, idx) => {
                    const monthName = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, month: 'long' }).format(dayGroup.dateObj);
                    const displayTitle = dayGroup.isToday ? "Hoje" : dayGroup.isYesterday ? "Ontem" : `${dayGroup.manausDayStr} de ${monthName}`;

                    return (
                    <div key={dayGroup.uniqueDayKey || dayGroup.dateObj?.toISOString?.() || `day-${idx}`} className="relative z-10">
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

## `src/components/DueForecast.jsx` <a id="src-components-dueforecast-jsx"></a>

- **Localização:** `src/components/DueForecast.jsx`
- **Linhas:** 136
- **Tamanho:** 6.73 KB

```javascript
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
                    {/* T-034 FIX: não mostrar pico falso quando tudo está zerado */}
                    {maxDaily > 0 ? (
                        <>
                            Pico: <span className="font-bold text-white">{maxDaily}</span> em {peakDay.label}
                        </>
                    ) : (
                        <span className="text-emerald-400">Sem vencimentos no período</span>
                    )}
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

                    {/* T-034 FIX: estado elegante quando não há vencimentos */}
                    <div className={`text-2xl font-black tabular-nums ${maxDaily > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {maxDaily > 0 ? maxDaily : '—'}
                    </div>

                    <div className="text-[10px] text-amber-400/70">
                        {maxDaily > 0
                            ? `${peakDay.label} (${peakDay.dateLabel})`
                            : 'Nenhum vencimento programado'}
                    </div>
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

# 3. GRÁFICOS E VISUALIZAÇÕES (CHARTS)

## `src/components/charts/GaussianPlot.jsx` <a id="src-components-charts-gaussianplot-jsx"></a>

- **Localização:** `src/components/charts/GaussianPlot.jsx`
- **Linhas:** 478
- **Tamanho:** 24.93 KB

```javascript
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

        const hideMean = isCurrentVisible && isMeanVisible && Math.abs(currentPos - meanPos) < 2.0;
        if (!hideMean && isMeanVisible) items.push({ id: 'mean', x: meanPos });
        if (isCurrentVisible) items.push({ id: 'today', x: currentPos });

        const sorted = [...items].sort((a, b) => a.x - b.x);
        const THRESHOLD = 14;

        sorted.forEach((item, i) => {
            item.level = 0;
            if (i > 0) {
                const prev = sorted[i - 1];
                if (Math.abs(item.x - prev.x) < THRESHOLD) {
                    item.level = prev.level + 1;
                }
            }
        });

        const res = { hideMean };
        sorted.forEach(item => res[item.id] = item.level);
        return res;
    }, [targetPos, meanPos, currentPos, isTargetVisible, isMeanVisible, isCurrentVisible]);

    const getLabelTop = (yPercent, level) => {
        return `calc(${Math.max(12, yPercent)}% - ${34 + level * 28}px)`;
    };

    const getLabelLeft = (pos, id) => {
        if (isTargetVisible && isMeanVisible && !resolvedLabels.hideMean && Math.abs(targetPos - meanPos) < 6) {
            if (id === 'target') return Math.max(4, Math.min(96, targetPos <= meanPos ? pos - 2.5 : pos + 2.5));
            if (id === 'mean') return Math.max(4, Math.min(96, meanPos >= targetPos ? pos + 2.5 : pos - 2.5));
        }
        return Math.max(4, Math.min(pos, 96));
    };

    const formatUnitValue = (val, u) => {
        if (u === 'horas') return formatDuration(val);
        if (u === '%') return `${formatValue(val)}%`;
        return `${Number.isInteger(val) ? val : Number(val).toFixed(2)}${u || ''}`;
    };

    // T-041 FIX: suporte a touch para tooltip em mobile.
    const updateHoverFromClientX = (clientX, el) => {
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));

        const hoverRange = Math.max(1e-6, range);
        const val = Math.max(xMin, Math.min(domainMax, xMin + ((percentage - 2) / 96) * hoverRange));

        pendingHoverRef.current = { x: xp(val), val };

        if (hoverRafRef.current != null) return;

        hoverRafRef.current = requestAnimationFrame(() => {
            hoverRafRef.current = null;
            setHover(pendingHoverRef.current);
        });
    };

    const clearHover = () => {
        if (hoverRafRef.current != null) {
            cancelAnimationFrame(hoverRafRef.current);
            hoverRafRef.current = null;
        }

        pendingHoverRef.current = null;
        setHover(null);
    };

    return (
        <div
            className="relative w-full h-[200px] mt-10 sm:mt-12 mb-2 pb-6 cursor-crosshair group/chart"
            onMouseMove={(e) => updateHoverFromClientX(e.clientX, e.currentTarget)}
            onMouseLeave={clearHover}
            onTouchStart={(e) => {
                if (e.touches && e.touches[0]) {
                    updateHoverFromClientX(e.touches[0].clientX, e.currentTarget);
                }
            }}
            onTouchMove={(e) => {
                if (e.touches && e.touches[0]) {
                    updateHoverFromClientX(e.touches[0].clientX, e.currentTarget);
                }
            }}
            onTouchEnd={clearHover}
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
                        style={{ left: `${meanPos}%`, top: `${meanY}%`, transform: 'translate(-50%, -50%)', zIndex: 16 }} />
                )}
                {isCurrentVisible && (
                    <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_12px_white] transition-all duration-500"
                        style={{ left: `${currentPos}%`, top: `${currentY}%`, transform: 'translate(-50%, -50%)', zIndex: 25 }} />
                )}
            </div>

            <div className="absolute inset-0 pointer-events-none">
                {!resolvedLabels.hideMean && isMeanVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${getLabelLeft(meanPos, 'mean')}%`, top: getLabelTop(meanY, resolvedLabels.mean || 0), transform: 'translateX(-50%)', zIndex: 30 }}>
                        <div className="flex flex-col items-center bg-blue-500/10 backdrop-blur-md px-2 py-0.5 rounded-xl border border-blue-500/30 shadow-lg">
                            <span className="text-[11px] font-black text-blue-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{formatUnitValue(projectedMean ?? mean ?? 0, unit)}</span>
                            <span className="text-[7px] font-black text-blue-300 uppercase tracking-widest opacity-80">Projeção</span>
                        </div>
                        <div className="w-px bg-blue-500/40 absolute top-full mt-0.5" style={{ height: `${8 + (resolvedLabels.mean || 0) * 28}px` }} />
                    </div>
                )}

                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${getLabelLeft(targetPos, 'target')}%`, top: getLabelTop(targetY, resolvedLabels.target || 0), transform: 'translateX(-50%)', zIndex: 20 }}>
                        <div className="flex flex-col items-center bg-rose-500/10 backdrop-blur-md px-2 py-0.5 rounded-xl border border-rose-500/30 shadow-lg">
                             <span className="text-[11px] font-black text-rose-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{formatUnitValue(targetVal, unit)}</span>
                            <span className="text-[7px] font-black text-rose-300 uppercase tracking-widest opacity-80">Meta</span>
                        </div>
                        <div className="w-px bg-rose-500/40 absolute top-full mt-0.5" style={{ height: `${8 + (resolvedLabels.target || 0) * 28}px` }} />
                    </div>
                )}

                {isCurrentVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500 group-hover/chart:opacity-40"
                        style={{ left: `${getLabelLeft(currentPos, 'today')}%`, top: getLabelTop(currentY, resolvedLabels.today || 0), transform: 'translateX(-50%)', zIndex: 40 }}>
                        <div className="flex flex-col items-center px-2 py-1 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-xl">
                            <span className="text-[11px] leading-none font-black text-white">{formatUnitValue(currentMean ?? 0, unit)}</span>
                            {resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje/Projeção</span>}
                            {!resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje</span>}
                        </div>
                        <div className="w-px bg-white/40 absolute top-full mt-0.5" style={{ height: `${10 + (resolvedLabels.today || 0) * 28}px` }} />
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

## `src/components/charts/MonteCarloConfig.jsx` <a id="src-components-charts-montecarloconfig-jsx"></a>

- **Localização:** `src/components/charts/MonteCarloConfig.jsx`
- **Linhas:** 487
- **Tamanho:** 28.23 KB

```javascript
import React, { useRef, useState, useEffect, useMemo, startTransition } from 'react';
import {
    Check,
    Minus,
    Activity,
    Clock,
    Hash,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
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

        if (!isNaN(q) && setExamConfig) {
            // T-027 FIX: clamp defensivo, independente do input HTML
            const safeQ = Math.max(10, Math.min(500, q));
            setExamConfig(examDurationMinutes, safeQ);
        }
    };

    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMinScore ? Number(maxScore) : Math.max(safeMinScore + 1, 100);

    // T-026 FIX: unidade dinâmica para escalas diferentes de 100
    const unitLabel = safeMaxScore === 100 ? '%' : ' pts';

    const sliderMin = Math.max(safeMinScore, Math.round(safeMaxScore * 0.1));
    const sliderRange = Math.max(1, safeMaxScore - sliderMin);
    const clampedTarget = Math.min(safeMaxScore, Math.max(sliderMin, Number(targetScore) || sliderMin));
    
    const [localTarget, setLocalTarget] = useState(clampedTarget);
    const isDragging = useRef(false);
    const debounceTimeout = useRef(null);
    const dragTimeout = useRef(null);
    const sliderRef = useRef(null);

    // T-042/T-043 FIX: refs para acessibilidade e focus trap
    const modalRef = useRef(null);
    const closeButtonRef = useRef(null);

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

    // T-043 FIX: foco inicial no modal ao abrir
    useEffect(() => {
        if (!show) return;

        if (closeButtonRef.current) {
            closeButtonRef.current.focus();
        }
    }, [show]);

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

    // T-028 FIX: helper para adicionar cortes sem duplicatas e com normalização defensiva
    const safeCutoffs = Array.isArray(historicalCutoffs)
        ? historicalCutoffs
        : Object.values(historicalCutoffs || {});

    const addHistoricalCutoff = () => {
        const val = parseFloat(newCutoff);

        if (!isNaN(val) && val >= safeMinScore && val <= safeMaxScore) {
            if (typeof setHistoricalCutoffs === 'function') {
                const next = Array.from(new Set([...safeCutoffs, val]));
                setHistoricalCutoffs(next);
            }

            setNewCutoff('');
        }
    };

    // T-043 FIX: Escape fecha e Tab mantém foco dentro do modal
    const handleModalKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose(false);
            return;
        }

        if (e.key === 'Tab' && modalRef.current) {
            const focusables = Array.from(
                modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
            ).filter(el => !el.disabled && el.getClientRects().length > 0);

            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => onClose(false)} />

            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label="Configuração do Monte Carlo"
                onKeyDown={handleModalKeyDown}
                className="relative w-full max-w-2xl h-full max-h-[90vh] bg-slate-900 border border-white/10 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            >
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
                        ref={closeButtonRef}
                        type="button"
                        onClick={() => onClose(false)}
                        className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 group/close focus:outline-none focus:ring-2 focus:ring-emerald-300/70"
                        title="Salvar e Fechar"
                        aria-label="Salvar e fechar configuração"
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
                                    <span className="text-blue-500">{unitLabel}</span>
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
                                aria-label="Meta de classificação"
                                onPointerDown={() => { isDragging.current = true; }}
                                onPointerUp={() => { isDragging.current = false; }}
                                touchAction="none"
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
                                aria-label="Nova nota de corte histórica"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addHistoricalCutoff();
                                    }
                                }}
                                className="bg-slate-900 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white font-bold w-full outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    addHistoricalCutoff();
                                }}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-5 py-2.5 rounded-md shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                            >
                                Inserir
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {safeCutoffs.map((c, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-slate-900 border border-purple-500/30 px-3 py-1.5 rounded-full group">
                                    <span className="text-xs font-black text-purple-300">{c}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (typeof setHistoricalCutoffs === 'function') {
                                                setHistoricalCutoffs(safeCutoffs.filter((_, idx) => idx !== i));
                                            }
                                        }}
                                        className="text-slate-500 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all p-0.5"
                                        title="Remover nota de corte"
                                    >
                                        <Minus size={14} />
                                    </button>
                                </div>
                            ))}
                            {safeCutoffs.length === 0 && (
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
                                        aria-label="Total de questões da prova"
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

## `src/components/charts/Analytics/EvolucaoFocoChart.jsx` <a id="src-components-charts-analytics-evolucaofocochart-jsx"></a>

- **Localização:** `src/components/charts/Analytics/EvolucaoFocoChart.jsx`
- **Linhas:** 76
- **Tamanho:** 3.39 KB

```javascript
import React, { useId } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

## `src/components/charts/Analytics/HorasDisciplinaChart.jsx` <a id="src-components-charts-analytics-horasdisciplinachart-jsx"></a>

- **Localização:** `src/components/charts/Analytics/HorasDisciplinaChart.jsx`
- **Linhas:** 90
- **Tamanho:** 4.09 KB

```javascript
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

## `src/components/charts/DueForecastChart.jsx` <a id="src-components-charts-dueforecastchart-jsx"></a>

- **Localização:** `src/components/charts/DueForecastChart.jsx`
- **Linhas:** 97
- **Tamanho:** 4.14 KB

```javascript
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
                                // T-044 FIX: usar o gradiente nas barras comuns.
                                // Antes, o Cell sobrescrevia o fill do Bar e o gradiente nunca aparecia.
                                fill={entry.isToday ? '#f59e0b' : entry.isTomorrow ? '#fbbf24' : `url(#${barId})`}
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

## `src/components/charts/ChartFrame.jsx` <a id="src-components-charts-chartframe-jsx"></a>

- **Localização:** `src/components/charts/ChartFrame.jsx`
- **Linhas:** 106
- **Tamanho:** 3.58 KB

```javascript
import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * ChartFrame
 * Mede o próprio container e só monta o gráfico quando há área real (> 0).
 * Enquanto mede, exibe um placeholder ambient com shimmer — nunca um chart cego.
 * Reage a resize / aba que vira visível via ResizeObserver.
 */
const isTestEnv =
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') ||
  (typeof window !== 'undefined' && window.navigator && /jsdom/i.test(window.navigator.userAgent || ''));

export default function ChartFrame({
  children,
  minHeight = 320,
  label = 'Calibrando visualização',
  className = '',
}) {
  const boxRef = useRef(null);
  const [ready, setReady] = useState(() => Boolean(isTestEnv));
  const [size, setSize] = useState(() => (isTestEnv ? { w: 800, h: Number(minHeight) || 320 } : { w: 0, h: 0 }));

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || isTestEnv) return;

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const r = entry.contentRect || el.getBoundingClientRect();
          const w = Math.floor(r.width);
          const h = Math.floor(r.height);
          setSize({ w, h });
          setReady(w > 0 && h > 0);
        }
      });
      ro.observe(el);
    } else {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width) || 800;
      const h = Math.floor(r.height) || Number(minHeight) || 320;
      setSize({ w, h });
      setReady(true);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [minHeight]);

  return (
    <div
      ref={boxRef}
      style={{ minHeight }}
      className={`relative w-full h-full overflow-hidden rounded-2xl ${className}`}
    >
      {/* Placeholder vivo — só some quando o chart tem onde nascer */}
      <div
        aria-hidden={ready}
        className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${ready ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
      >
        {/* camada ambient: varredura sutil, sem gradiente de "AI hero" */}
        <div className="absolute inset-0 bg-[#0b0e18]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'linear-gradient(110deg, transparent 30%, rgba(148,163,184,0.06) 50%, transparent 70%)',
            backgroundSize: '220% 100%',
            animation: 'chartframe-sweep 1.6s ease-in-out infinite',
          }}
        />
        <div className="relative flex flex-col items-center gap-2 px-6 text-center">
          <span className="h-2 w-2 rounded-full bg-teal-300/80 shadow-[0_0_10px_rgba(94,234,212,0.7)] animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
            {label}
          </span>
          {size.w > 0 && size.h > 0 && (
            <span className="text-[10px] font-medium tracking-wide text-slate-600 tabular-nums">
              {size.w}×{size.h}
            </span>
          )}
        </div>
      </div>

      {/* O gráfico só monta com área válida — adeus, width(-1) */}
      <div
        className={`relative h-full w-full transition-all duration-500 ${ready ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
      >
        {ready ? children : null}
      </div>

      <style>{`
        @keyframes chartframe-sweep {
          0%   { background-position: 140% 0; }
          100% { background-position: -40% 0; }
        }
      `}</style>
    </div>
  );
}

export { ChartFrame };
```

---

## `src/components/charts/ChartTooltip.jsx` <a id="src-components-charts-charttooltip-jsx"></a>

- **Localização:** `src/components/charts/ChartTooltip.jsx`
- **Linhas:** 147
- **Tamanho:** 11.58 KB

```javascript
import React from 'react';
import { CHART_COLORS } from '../../utils/chartConfig';
import { formatValue } from '../../utils/scoreHelper';

export const ChartTooltip = ({ active, payload, label, isCompare = false, chartData = [], unit = '%', maxScore = 100, minScore = 0 }) => {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const scaleRange = Math.max(1, safeMax - safeMin);
    if (!active || !payload?.length) return null;

    const currentData = payload?.[0]?.payload || (Array.isArray(chartData) ? chartData.find(d => d.displayDate === label || d.date === label) : null);

    return (
        <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl text-sm w-[90vw] sm:w-[380px] max-w-[calc(100vw-2rem)] sm:max-w-sm z-50 backdrop-blur-xl pointer-events-none transition-transform duration-200 overflow-hidden">
            <p className="text-slate-300 mb-3 font-bold border-b border-white/10 pb-2 flex items-center justify-between">
                <span>📅 {label}</span>
            </p>
            <div className="space-y-3">
                {payload
                    .filter(p => !p.name?.startsWith('_') && !['Bay CI High', 'Bay CI Low', 'Cenário Range', 'Banda Bayesiana', 'Ganho Estimado'].includes(p.name))
                    .filter((p, index, self) => self.findIndex(t => t.name === p.name) === index)
                    .sort((a, b) => {
                        const valA = Array.isArray(a?.value) ? a.value[0] : a?.value;
                        const valB = Array.isArray(b?.value) ? b.value[0] : b?.value;
                        return (Number(valB) || -Infinity) - (Number(valA) || -Infinity);
                    })
                    .map((p, i) => {
                    if (isCompare) {
                        const val = Number(p.value);
                        return (
                            <div key={i} className="flex justify-between items-center gap-4">
                                <span style={{ color: p.color }} className="font-medium text-xs">
                                    {p.name}
                                </span>
                                <span style={{ color: p.color }} className="font-bold">
                                    {Number.isFinite(val) ? `${formatValue(val)}${unit}` : '—'}
                                </span>
                            </div>
                        );
                    }

                    const dataKey = p.dataKey;
                    if (typeof dataKey !== 'string') return null;

                    const catId = dataKey.replace(/^(bay_ci_low|bay_ci_high|trend_status|raw|bay|stats|trend)_/, '');
                    const subjName = p.name;

                    const rawCorrect = currentData ? currentData[`raw_correct_${catId}`] : null;
                    const rawTotal = currentData ? currentData[`raw_total_${catId}`] : null;
                    const rawVal = currentData ? currentData[`raw_${catId}`] : null;
                    const bayVal = currentData ? currentData[`bay_${catId}`] : null;
                    const statsVal = currentData ? currentData[`stats_${catId}`] : null;
                    const trendVal = currentData ? currentData[`trend_${catId}`] : null;
                    const trendStatus = currentData ? currentData[`trend_status_${catId}`] : 'stable';

                    return (
                        <div key={i} className="flex flex-col bg-slate-800/30 p-3 rounded-lg border border-white/5 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <span style={{ color: p.color }} className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}80` }} />
                                    {subjName}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Bruta</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className="text-[11px] sm:text-xs font-mono text-orange-400 font-bold leading-none">
                                            {rawVal != null && Number.isFinite(Number(rawVal)) ? formatValue(rawVal) : '—'}{unit}
                                        </span>
                                        {rawCorrect != null && rawTotal > 0 && (
                                            <span className="text-[8px] text-slate-500 font-bold font-mono tracking-tighter mt-1 leading-none">
                                                {rawCorrect}/{rawTotal}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, ((rawVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Histórica</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className="text-[11px] sm:text-xs font-mono text-blue-400 font-bold leading-none">
                                            {statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, ((statsVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Nível Real</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className="text-[11px] sm:text-xs font-mono text-emerald-400 font-bold leading-none">
                                            {bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, ((bayVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Tendência</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className={`text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-0.5 leading-none ${trendStatus === 'up' ? 'text-emerald-400' : trendStatus === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
                                            {trendVal != null && Number.isFinite(Number(trendVal)) ? (
                                                <>
                                                    {trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : ''}
                                                    <span>{trendVal > 0 ? `+${formatValue(trendVal)}` : formatValue(trendVal)}</span>
                                                </>
                                            ) : '—'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className={`h-full ${trendStatus === 'up' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] w-full' : trendStatus === 'down' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] w-full' : 'bg-slate-500 w-full'}`} style={{ opacity: trendVal != null && Number.isFinite(Number(trendVal)) ? 1 : 0 }} />
                                    </div>
                                </div>
                            </div>
                            {rawTotal > 0 && (() => {
                                const safeCorr = Math.max(0, Math.min(rawTotal, Number(rawCorrect) || 0));
                                const errs = Math.max(0, rawTotal - safeCorr);
                                const errPct = Math.round((errs / rawTotal) * 100);
                                const correctPct = 100 - errPct;
                                return (
                                    <div className="mt-3 flex flex-col gap-1.5 px-1">
                                        <div className="text-[10px] text-slate-400 flex justify-between items-center">
                                            <span>Último Simulado:</span>
                                            <span>
                                                <strong className="text-rose-400">{errs} erros</strong> ({errPct}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
                                            <div className="h-full bg-emerald-500/80 transition-all duration-500" style={{ width: `${correctPct}%` }}></div>
                                            <div className="h-full bg-rose-500/80 transition-all duration-500" style={{ width: `${errPct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
```

---

# 4. HOOKS REATIVOS DO REACT (HOOKS)

## `src/hooks/useMonteCarloStats.js` <a id="src-hooks-usemontecarlostats-js"></a>

- **Localização:** `src/hooks/useMonteCarloStats.js`
- **Linhas:** 1434
- **Tamanho:** 48.71 KB

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
  MAX_CALIBRATION_PENALTY,
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

// T-005 FIX: clamp defensivo que NÃO empurra NaN para o mínimo.
// Em projeções estatísticas, NaN deve cair para um valor neutro/seguro,
// não para o pior caso silenciosamente.
const safeClamp = (value, min, max, fallback = null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback !== null && fallback !== undefined
      ? fallback
      : (min + max) / 2;
  }
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
  simuladoRows: propSimuladoRows,
  // T-040 FIX: permite adiar o cálculo pesado de probabilidades por matéria
  enablePerSubject = false
}) {
  const activeId = useAppStore(state => state.appState?.activeId);

  const weights = useAppStore(useShallow(state => state.appState?.contests?.[activeId]?.mcWeights || {}));
  const equalWeightsMode = useAppStore(state => state.appState?.mcEqualWeights ?? true);

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

  // T-018/T-024 FIX: normalizar categories antes de filter
  const safeCategories = useMemo(() => {
    return Array.isArray(categories)
      ? categories
      : Object.values(categories || {});
  }, [categories]);

  const activeCategories = useMemo(() =>
    safeCategories.filter(c => {
      const h = c.simuladoStats?.history;
      const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
      return hLen > 0;
    }),
    [safeCategories]
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
      // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
      // normalizeDate costuma ancorar melhor a data no helper do projeto.
      const parsedTimelineDate = normalizeDate(timelineDates[timeIndex]) ||
        new Date(timelineDates[timeIndex] + 'T12:00:00');

      if (Number.isFinite(parsedTimelineDate?.getTime())) {
        currentDate = parsedTimelineDate;
        currentDate.setHours(0, 0, 0, 0);
      }
    }

    let goal;
    if (typeof goalDate === 'string') {
      goal = normalizeDate(goalDate);
    } else {
      goal = new Date(goalDate);
    }

    goal.setHours(0, 0, 0, 0);

    if (!Number.isFinite(goal.getTime())) return 30;

    // T-024/T-025 FIX: fallback para data corrente inválida
    if (!Number.isFinite(currentDate.getTime())) {
      currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
    }

    const diffTime = goal.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const safeDays = diffDays > 0 ? diffDays : 0;

    return Math.min(3650, safeDays);
  }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

  const pureStatsData = useMemo(() => {
    return generateAnalyticsStats({
      // T-018 FIX: usar categorias já normalizadas
      categories: safeCategories,
      debouncedWeights,
      timeIndex,
      timelineDates,
      minScore,
      maxScore,
      simuladoRows: rawSimuladoRows
    });
  }, [safeCategories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore, rawSimuladoRows]);

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

  // T-012 FIX: Ref para usar statsData já calibrado dentro do efeito principal.
  // Sem isso, o motor calculava pooledSD/dailySD calibrados mas continuava
  // usando pureStatsData na simulação.
  const statsDataRef = useRef(statsData);
  useEffect(() => {
    statsDataRef.current = statsData;
  }, [statsData]);

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

    const projectDaysRef = useRef(projectDays);
  useEffect(() => { projectDaysRef.current = projectDays; }, [projectDays]);

  const minScoreRef = useRef(minScore);
  useEffect(() => { minScoreRef.current = minScore; }, [minScore]);

  const maxScoreRef = useRef(maxScore);
  useEffect(() => { maxScoreRef.current = maxScore; }, [maxScore]);

  const examDurationRef = useRef(examDurationMinutes);
  useEffect(() => { examDurationRef.current = examDurationMinutes; }, [examDurationMinutes]);

  const examQuestionsRef = useRef(defaultExamTotalQuestions);
  useEffect(() => { examQuestionsRef.current = defaultExamTotalQuestions; }, [defaultExamTotalQuestions]);

  const flashcardDecksRef = useRef(flashcardDecks);
  useEffect(() => { flashcardDecksRef.current = flashcardDecks; }, [flashcardDecks]);

  const historicalCutoffsRef = useRef(historicalCutoffs);
  useEffect(() => { historicalCutoffsRef.current = historicalCutoffs; }, [historicalCutoffs]);

  const rawSimuladoRowsRef = useRef(rawSimuladoRows);
  useEffect(() => { rawSimuladoRowsRef.current = rawSimuladoRows; }, [rawSimuladoRows]);

useEffect(() => {
    const rawPureStatsData = pureStatsDataRef.current;

    // T-012 FIX: usa statsData calibrado quando disponível.
    // Mantemos o nome `pureStatsData` para não precisar reescrever o efeito inteiro.
    const pureStatsData = statsDataRef.current || rawPureStatsData;

    if (!pureStatsData) {
      setSimulationData({ status: 'waiting', missing: 'data' });
      return;
    }

    let totalPoints = 0;
    pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
    if (totalPoints < 1) return;

    let cancelled = false;

    const isFuture = projectDaysRef.current > 0;
    const domain = Math.max(1e-6, maxScoreRef.current - minScoreRef.current);

    const { globalImmunityFactor, subjectImmunityMap } = getFlashcardImmunity(flashcardDecksRef.current);

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
            projectDaysRef.current,
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
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity
            };
          });

          let totalGlobalTimeSpent = 0;
          let totalGlobalTimedQuestions = 0;

          // T-018/T-024 FIX: usar categorias já normalizadas no hook
          const safeTimeCategories = safeCategories;

          safeTimeCategories.forEach(cat => {
            const rawHistory = cat?.simuladoStats?.history;

            const histArray = Array.isArray(rawHistory)
              ? rawHistory
              : Object.values(rawHistory || {});

            histArray.forEach(h => {
              const timeSpent = Number(h?.timeSpent);
              const timedQuestoes = Number(h?.timedQuestoes);

              if (
                Number.isFinite(timeSpent) &&
                Number.isFinite(timedQuestoes) &&
                timeSpent > 0 &&
                timedQuestoes > 0
              ) {
                totalGlobalTimeSpent += timeSpent;
                totalGlobalTimedQuestions += timedQuestoes;
              }
            });
          });

          const globalAvgSeconds = totalGlobalTimedQuestions > 0
            ? (totalGlobalTimeSpent / totalGlobalTimedQuestions)
            : 0;

          const projectedTotalTimeSeconds = examQuestionsRef.current * globalAvgSeconds;

          result = await runAnalysis({
            values: pureStatsData.globalHistory,
            dates: pureStatsData.globalHistory.map(h => h.date),
            meta: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            projectionDays: projectDaysRef.current,
            forcedVolatility: regularizedSD,
            forcedBaseline: pureStatsData.bayesianMean,
            currentMean: pureStatsData.bayesianMean,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            projectedTotalTimeSeconds,
            examDurationMinutes: examDurationRef.current,
            flashcardImmunity: globalImmunityFactor,
            // T-014 FIX: cortes históricos também no caminho principal
            historicalCutoffs: historicalCutoffsRef.current
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
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
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
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            flashcardImmunity: globalImmunityFactor,
            // T-014 FIX: cortes históricos também no modo normal
            historicalCutoffs: historicalCutoffsRef.current
          };

          // Compatibilidade dupla:
          // 1) tenta API por objeto
          // 2) se não retornar probabilidade válida, tenta API posicional antiga
          result = await runAnalysis(normalPayload);

          if (!result || result.probability == null) {
            // ✅ LOTE-01 FIX: fallback síncrono com a MESMA API de objeto
            result = simulateNormalDistribution({ ...normalPayload, historicalCutoffs: historicalCutoffsRef.current });
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

            // T-015 FIX: só gravar eventos de calibração para previsões futuras.
            // Eventos do modo "hoje" não devem alimentar calibração.
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
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
                projectDaysRef.current,
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
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity
              };
            });

            result = runMonteCarloAnalysis({
              values: pureStatsData.globalHistory,
              dates: pureStatsData.globalHistory.map(h => h.date),
              meta: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              projectionDays: projectDaysRef.current,
              forcedVolatility: regularizedSD,
              forcedBaseline: pureStatsData.bayesianMean,
              currentMean: pureStatsData.bayesianMean,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              subjects: subjectsOpts,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              // T-014 FIX: cortes históricos também no fallback futuro
              historicalCutoffs: historicalCutoffsRef.current
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
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
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
              historicalCutoffs: historicalCutoffsRef.current,
              subjects: subjectsOpts,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              simuladoRows: rawSimuladoRowsRef.current,
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

            // T-015 FIX: também proteger o fallback síncrono
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
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
    calibrationPenalty
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
        // T-017 FIX: proteger domínio inválido/zero antes de dividir
        const confDomain = Math.max(1e-9, Number(maxScore) - Number(minScore));

        confFactor = Math.min(0.2, confWidth / (confDomain * 1.2)) * (1 - modelWeight);

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
    // T-040 FIX: só calcular probabilidades por matéria quando o painel estiver aberto.
    // Isso evita simulações pesadas desnecessárias no primeiro render.
    if (!enablePerSubject || !statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

    return statsData.categoryStats
      .filter(cat => cat.weight > 0)
      .map(cat => {
        const catMaxScore = Number(cat.maxScore) || maxScore;
        const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;

        const currentBaseline = cat.bayesianMean ?? cat.mean;

        // T-004 FIX: trend pode vir como string ('up'/'down'/'stable').
        // Converter com segurança para número antes de qualquer aritmética.
        const rawTrend = cat.trendValue ?? cat.trend ?? 0;
        const trendPer30Days = Number.isFinite(Number(rawTrend)) ? Number(rawTrend) : 0;

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

        // T-005 FIX: limitar projeção de tendência a ±15% do domínio da disciplina.
        // Se o cálculo produzir NaN, cai para 0 (sem projeção) em vez de -15%.
        totalTrendProjection = safeClamp(
          totalTrendProjection,
          -0.15 * catMaxScore,
          0.15 * catMaxScore,
          0 // fallback neutro: nenhuma projeção de tendência
        );

        // T-005 FIX: se a soma baseline + tendência produzir NaN,
        // mantém o baseline atual em vez de despencar para catMinScore.
        const baseline = (!effectiveSimulateToday && projectDays > 0)
          ? safeClamp(
              currentBaseline + totalTrendProjection,
              catMinScore,
              catMaxScore,
              currentBaseline // fallback: permanece onde está
            )
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
    calibrationPenalty,
    // T-040 FIX: reagir à abertura/fechamento do painel de matérias
    enablePerSubject
  ]);

  useEffect(() => {
    // T-015 FIX: não gravar calibração de subjects em modo "hoje"
    if (projectDays <= 0) return;

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
  }, [
    perSubjectProbs,
    debouncedTarget,
    simulationData?.status,
    pureStatsHash,
    // T-015 FIX: dependência explícita do modo futuro/hoje
    projectDays
  ]);

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

    // T-017 FIX: domínio seguro para evitar divisão por zero ou negativa
    const domainWidth = Math.max(1e-9, Number(maxScore) - Number(minScore));
    const icWidth = ci95High - ci95Low;

    const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
    const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));

    const pAdjusted = probability;

    // FIX: piso mínimo de volatilidade para evitar probabilidade degenerada
    // T-017 FIX: usar domínio seguro em vez de maxScore bruto
    const safeSdForTrend = Math.max(
      Number.isFinite(sd) && sd > 0 ? sd : 1,
      domainWidth * 0.02
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
      recentVolatility: sdLeft,
      maxScore: Number(maxScore) || 100
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

## `src/hooks/useMonteCarloWorker.js` <a id="src-hooks-usemontecarloworker-js"></a>

- **Localização:** `src/hooks/useMonteCarloWorker.js`
- **Linhas:** 179
- **Tamanho:** 7.16 KB

```javascript
/**
 * useMonteCarloWorker — Hook para offload Monte Carlo para Web Worker
 * 
 * Mantém o fallback síncrono se Web Workers não estiverem disponíveis.
 * Usa Vite's `?worker` import com module worker support.
 * Modificado para usar um Singleton Worker, evitando memory leaks ao renderizar
 * múltiplos gráficos/componentes que usam este hook.
 */
import { useCallback, useEffect } from 'react';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo.js';

// --- SHARED WORKER SINGLETON ---
let sharedWorker = null;
let sharedRequestId = 0;
const sharedPendingRequests = new Map();

function initSharedWorker() {
    if (sharedWorker) return;
    try {
        sharedWorker = new Worker(
            new URL('../engine/mc.worker.js', import.meta.url),
            { type: 'module' }
        );

        sharedWorker.onmessage = (e) => {
            const { id, type, result, error } = e.data;
            const pending = sharedPendingRequests.get(id);
            if (!pending) return;
            sharedPendingRequests.delete(id);
            if (type === 'error') {
                pending.reject(new Error(error));
            } else {
                pending.resolve(result);
            }
        };

        sharedWorker.onerror = (err) => {
            console.warn('[MC Worker Singleton] Error, falling back to main thread:', err.message);
            for (const [id, pending] of sharedPendingRequests) {
                if (pending.worker === sharedWorker) {
                    pending.reject(new Error('Worker error'));
                    sharedPendingRequests.delete(id);
                }
            }
            if (sharedWorker) {
                sharedWorker.terminate();
                sharedWorker = null;
            }
        };
    } catch (e) {
        console.warn('[MC Worker Singleton] Not available, using main thread:', e.message);
    }
}

// Cleanup pending requests periodically if needed (optional)
// But timeouts inside the Promise will handle stale requests.

export function useMonteCarloWorker() {
    // Initialize the singleton worker on first use
    useEffect(() => {
        initSharedWorker();
        // We do NOT terminate the worker on unmount because it is shared.
        // The worker lives for the lifetime of the application.
    }, []);

    const runAnalysis = useCallback(async (...args) => {
        if (!sharedWorker) {
            initSharedWorker();
        }

        // Fallback or initialization issue
        if (!sharedWorker) {
            // FIX APLICADO: Garantindo que o motor síncrono receba um objeto único
            if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
                if (args[0].mode === 'normal' || (args[0].mean !== undefined && !Array.isArray(args[0].values))) {
                    return simulateNormalDistribution(args[0]);
                }
                return runMonteCarloAnalysis(args[0]);
            } else {
                const options = args[3] || {};
                return simulateNormalDistribution({
                    mean: args[0] || 0,
                    sd: args[1] || 0,
                    targetScore: args[2] || 0,
                    simulations: options.simulations || 5000,
                    seed: options.seed,
                    currentMean: options.currentMean,
                    minScore: options.minScore,
                    maxScore: options.maxScore,
                    bayesianCI: options.bayesianCI,
                    historyLength: options.historyLength,
                    subjects: options.subjects,
                    historicalCutoffs: options.historicalCutoffs,
                    flashcardImmunity: options.flashcardImmunity,
                });
            }
        }

        const id = ++sharedRequestId;
        
        let payload;
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
            payload = { isObjectCall: true, input: args[0] };
        } else {
            payload = {
                isObjectCall: false,
                inputOrMean: args[0],
                pooledSD: args[1],
                targetScore: args[2],
                options: args[3] || {}
            };
        }

        return new Promise((resolve, reject) => {
            // Timeout adaptativo baseado no número de simulações
            const simCount = payload?.input?.simulations ?? payload?.options?.simulations ?? 5000;
            const timeoutMs = Math.min(30000, Math.max(10000, simCount * 3)); // 3ms/sim, cap 30s

            // Capture current worker to prevent race conditions during recycling
            const currentWorker = sharedWorker;

            const timeoutId = setTimeout(() => {
                if (sharedPendingRequests.has(id)) {
                    sharedPendingRequests.delete(id);
                    console.warn(`[MC Worker Singleton] Request ${id} timed out. Recycling worker thread.`);
                    
                    // Kill the zombie worker AND clean up ALL its pending requests.
                    const dyingWorker = currentWorker;
                    
                    // Clean ALL pending requests from the dying worker
                    for (const [pendingId, pending] of sharedPendingRequests) {
                        if (pending.worker === dyingWorker) {
                            clearTimeout(pending.timeoutId);
                            pending.reject(new Error('Worker recycled due to timeout'));
                            sharedPendingRequests.delete(pendingId);
                        }
                    }
                    
                    if (dyingWorker) {
                         dyingWorker.terminate();
                    }
                    
                    if (sharedWorker === dyingWorker) {
                        sharedWorker = null;
                        
                        // Instantiate a fresh worker for subsequent requests.
                        initSharedWorker();
                    }
                    
                    reject(new Error("A análise demorou muito tempo e foi interrompida para proteger a performance do sistema."));
                }
            }, timeoutMs);

            sharedPendingRequests.set(id, { 
                worker: currentWorker, // Track request owner worker instance
                timeoutId, // Guardar referência para limpeza
                resolve: (data) => {
                    clearTimeout(timeoutId);
                    resolve(data);
                }, 
                reject: (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });
            
            try {
                currentWorker.postMessage({ type: 'runMonteCarloAnalysis', payload, id });
            } catch {
                clearTimeout(timeoutId);
                sharedPendingRequests.delete(id);
                reject(new Error(`Falha ao enviar dados para o Worker (DataCloneError). Estrutura inválida.`));
            }
        });
    }, []);

    return { runAnalysis };
}
```

---

# 5. MOTORES ESTATÍSTICOS E PROBABILÍSTICOS (ENGINE)

## `src/engine/monteCarlo.js` <a id="src-engine-montecarlo-js"></a>

- **Localização:** `src/engine/monteCarlo.js`
- **Linhas:** 776
- **Tamanho:** 29.35 KB

```javascript
import { mulberry32 } from './random.js';
import {
    normalCDF_complement,
    generateKDE,
    sampleTruncatedNormal,
    truncatedNormalMean,
    ensurePositiveSemiDefinite,
    choleskyDecomposition,
    applyCovariance,
    inverseNormalCDF,
    truncatedNormalFromUniform
} from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };

import { getPercentile } from './math/percentile.js';
import { kahanSum } from './math/kahan.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getDateKey } from '../utils/dateHelper.js';

export { getPercentile };

const DEFAULT_SIMULATIONS = 5000;
const MAX_SIMULATIONS = 50000;
const TARGET_PROB_SE = 0.008;
const DEFAULT_DOMAIN_MIN = 0;
const DEFAULT_DOMAIN_MAX = 100;

function toFiniteNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function sanitizeDomain(minScore, maxScore) {
    const rawMin = toFiniteNumber(minScore, DEFAULT_DOMAIN_MIN);
    const rawMax = toFiniteNumber(maxScore, DEFAULT_DOMAIN_MAX);

    if (rawMin <= rawMax) {
        return { minScore: rawMin, maxScore: rawMax };
    }

    return { minScore: rawMax, maxScore: rawMin };
}

function sanitizeSimulations(simulations) {
    const normalized = Math.floor(toFiniteNumber(simulations, DEFAULT_SIMULATIONS));
    return clamp(normalized, 1, MAX_SIMULATIONS);
}

function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => {
        const safeMean = toFiniteNumber(s?.mean, 0);
        const safeSd = Math.max(1e-6, toFiniteNumber(s?.sd, 1));
        const safeMinCutoff = toFiniteNumber(s?.minCutoff, 0);
        const safeMinScore = toFiniteNumber(s?.minScore, DEFAULT_DOMAIN_MIN);
        const safeMaxScore = toFiniteNumber(s?.maxScore, DEFAULT_DOMAIN_MAX);
        const safeImmunity = toFiniteNumber(s?.immunityFactor, 1.0);
        const safeWeight = Math.max(1e-6, toFiniteNumber(s?.weight, 1));   // ✅ LOTE-01

        return {
            ...s,
            mean: safeMean,
            sd: safeSd,
            minCutoff: safeMinCutoff,
            minScore: safeMinScore,
            maxScore: safeMaxScore,
            immunityFactor: safeImmunity,
            weight: safeWeight                                              // ✅ LOTE-01
        };
    });
}

export function recommendSimulationCount(targetProb = 0.7, targetSE = TARGET_PROB_SE, minSims = 2000, maxSims = MAX_SIMULATIONS) {
    const p = Math.max(0.05, Math.min(0.95, targetProb));
    const varBernoulli = p * (1 - p);
    const needed = Math.ceil(varBernoulli / (targetSE * targetSE));
    return clamp(needed, minSims, maxSims);
}

function generateStableSeed(historyCount, categoryName, _targetScore, _currentMean) {
    let h = 2166136261;

    const safeCatId = typeof categoryName === 'object' && categoryName !== null
        ? String(categoryName.id || categoryName.name || 'global')
        : String(categoryName || 'global');

    const safeHistoryCount = toFiniteNumber(historyCount, 0);
    const safeTarget = toFiniteNumber(_targetScore, 0);
    const safeMeanInt = Number.isFinite(Number(_currentMean)) ? Math.floor(Number(_currentMean) * 10) : 0;

    const seedStr = `${safeHistoryCount}-${safeCatId}-${safeTarget}-${safeMeanInt}`;

    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    return h >>> 0;
}

export function simulateNormalDistribution(
    meanOrObj,
    sd,
    targetScore,
    simulations,
    seed,
    currentMean,
    categoryName,
    bayesianCI,
    historyLength = 0
) {
    let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
    let minScore = DEFAULT_DOMAIN_MIN;
    let maxScore = DEFAULT_DOMAIN_MAX;

    let subjects = [];
    let historicalCutoffs = [];
    let flashcardImmunity = 1.0;

    if (typeof meanOrObj === 'object' && meanOrObj !== null) {
        mean = meanOrObj.mean ?? mean;
        sd = meanOrObj.sd ?? sd;
        targetScore = meanOrObj.targetScore ?? targetScore;
        simulations = meanOrObj.simulations ?? simulations;
        seed = meanOrObj.seed ?? seed;
        currentMean = meanOrObj.currentMean ?? currentMean;
        categoryName = meanOrObj.categoryName ?? categoryName;
        bayesianCI = meanOrObj.bayesianCI ?? bayesianCI;
        minScore = meanOrObj.minScore ?? minScore;
        maxScore = meanOrObj.maxScore ?? maxScore;
        historyLength = meanOrObj.historyLength ?? 0;
        subjects = meanOrObj.subjects ?? [];
        historicalCutoffs = meanOrObj.historicalCutoffs ?? [];
        flashcardImmunity = meanOrObj.flashcardImmunity ?? 1.0;
    }

    subjects = sanitizeSubjects(subjects);

    historicalCutoffs = Array.isArray(historicalCutoffs)
        ? historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
        : [];

    flashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);
    historyLength = Math.max(0, Math.floor(toFiniteNumber(historyLength, 0)));

    if (!meanOrObj?.simulations && !simulations) {
        const roughProb = Math.max(0.1, Math.min(0.9, (currentMean || mean || 70) / 100));
        simulations = recommendSimulationCount(roughProb);
    }

    const safeDomain = sanitizeDomain(minScore, maxScore);
    minScore = safeDomain.minScore;
    maxScore = safeDomain.maxScore;

    const safeMean = clamp(toFiniteNumber(mean, (minScore + maxScore) / 2), minScore, maxScore);
    const safeCurrentMean = toFiniteNumber(currentMean, safeMean);

    const sdNum = toFiniteNumber(sd, NaN);
    const hasExplicitDeterministicSD = Number.isFinite(sdNum) && sdNum <= 0;
    const isExplicitCoachSD = Number.isFinite(sdNum) && sdNum > 0;

    let safeSD = Number.isFinite(sdNum) && sdNum > 0 ? sdNum : 0;

    if (bayesianCI) {
        let high = bayesianCI.unclampedHigh !== undefined ? bayesianCI.unclampedHigh : bayesianCI.ciHigh;
        let low = bayesianCI.unclampedLow !== undefined ? bayesianCI.unclampedLow : bayesianCI.ciLow;

        high = toFiniteNumber(high, NaN);
        low = toFiniteNumber(low, NaN);

        if (Number.isFinite(high) && Number.isFinite(low) && high < low) {
            const tmp = high;
            high = low;
            low = tmp;
        }

        if (Number.isFinite(high) && Number.isFinite(low)) {
            const effectiveN = Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1));
            const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });

            let inferredSD = (high - low) / (tMultiplier * 2);
            const distToBoundary = Math.min(safeMean - minScore, maxScore - safeMean);

            if (Number.isFinite(inferredSD) && inferredSD >= 1e-10) {
                if (distToBoundary < inferredSD * 1.5) {
                    const correctionFactor = 1 + (1 - distToBoundary / (inferredSD * 1.5));
                    inferredSD *= Math.min(1.5, correctionFactor);
                }
            }

            if (Number.isFinite(inferredSD) && inferredSD > 0) {
                safeSD = inferredSD;
            }
        }
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    if (!hasExplicitDeterministicSD && historyLength < 15 && !bayesianCI && !isExplicitCoachSD) {
        const rangeMassa = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
        const floorVolatility = rangeMassa * 0.04;
        const confidence = Math.min(1, historyLength / 8);
        safeSD = (safeSD * confidence) + (floorVolatility * (1 - confidence));
    }

    const safeFlashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);

    if (safeFlashcardImmunity < 1.0 && safeSD > 0) {
        safeSD = safeSD * Math.max(0.80, safeFlashcardImmunity);
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    const effectiveTarget = clamp(toFiniteNumber(targetScore, minScore), minScore, maxScore);
    const safeSimulations = sanitizeSimulations(simulations);

    if (safeSD < 1e-5) {
        const prob = safeMean >= effectiveTarget ? 100 : 0;

        return {
            simulationCount: safeSimulations,
            probability: prob,
            analyticalProbability: prob,
            recommendedProbability: prob,
            probabilityPolicy: 'deterministic',
            mean: safeMean,
            sd: 0,
            sdVisual: 0,
            sdLeft: 0,
            sdRight: 0,
            ci95StatLow: safeMean,
            ci95StatHigh: safeMean,
            ci95Low: safeMean,
            ci95High: safeMean,
            ci95VisualLow: safeMean,
            ci95VisualHigh: safeMean,
            ci95VisualClamped: false,
            currentMean: safeCurrentMean,
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                safeMean > minScore ? { x: safeMean - 0.1, y: 0, density: 0 } : null,
                { x: safeMean, y: 1, density: 1 },
                safeMean < maxScore ? { x: safeMean + 0.1, y: 0, density: 0 } : null
            ].filter(Boolean),
            drift: 0,
            volatility: 0,
            minScore,
            maxScore,
            method: bayesianCI ? 'bayesian_static_hybrid' : 'deterministic'
        };
    }

    const numericSeed = toFiniteNumber(seed, NaN);
    const stableSeed = Number.isFinite(numericSeed)
        ? (numericSeed >>> 0)
        : generateStableSeed(historyLength, categoryName, targetScore, safeCurrentMean);

    const rng = mulberry32(stableSeed);

    let success = 0;
    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    const allScores = new Float64Array(safeSimulations);

    let muParam = safeMean;

    if (safeSD > 0) {
        const distMin = safeMean - minScore;
        const distMax = maxScore - safeMean;

        if (distMin < safeSD * 1.5 || distMax < safeSD * 1.5) {
            const spread = Math.max(safeSD * 30, (maxScore - minScore) * 3);
            let muLow = minScore - spread;
            let muHigh = maxScore + spread;

            for (let iter = 0; iter < 20; iter++) {
                const currentTruncMean = truncatedNormalMean(muParam, safeSD, minScore, maxScore);
                if (!Number.isFinite(currentTruncMean)) break;

                const error = currentTruncMean - safeMean;
                if (Math.abs(error) < 0.25) break;

                if (error > 0) muHigh = muParam;
                else muLow = muParam;

                muParam = (muLow + muHigh) / 2;
            }
        }
    }

    if (!Number.isFinite(muParam)) muParam = safeMean;

    let cutoffsMean = 0;
    let cutoffsSD = 0;

    const numericCutoffs = historicalCutoffs;
    const hasCutoffs = numericCutoffs.length > 0;

    if (hasCutoffs) {
        cutoffsMean = kahanSum(numericCutoffs) / numericCutoffs.length;

        if (numericCutoffs.length > 1) {
            const devs = numericCutoffs.map(v => Math.pow(v - cutoffsMean, 2));
            cutoffsSD = Math.sqrt(Math.max(0, kahanSum(devs) / (numericCutoffs.length - 1)));
        } else {
            cutoffsSD = cutoffsMean * 0.05;
        }

        if (!Number.isFinite(cutoffsSD) || cutoffsSD <= 0) {
            cutoffsSD = Math.max(1e-6, cutoffsMean * 0.05);
        }
    }

    const cutoffSubjects = sanitizeSubjects(subjects).filter(s => s.minCutoff > 0);

    const subjectStats = cutoffSubjects.map(s => {
        const safeSd = Math.max(1e-6, toFiniteNumber(s.sd, 1));
        const safeImmunity = toFiniteNumber(s.immunityFactor, 1.0);

        return {
            ...s,
            sd: safeSd * Math.max(0.80, safeImmunity)
        };
    });

    let subjectCholesky = null;

    if (subjectStats.length > 1) {
        const adaptiveRhoContext = meanOrObj?.simuladoRows
            ? {
                simuladoRows: meanOrObj.simuladoRows,
                categoryNames: subjectStats.map(s => String(s?.name ?? s?.id ?? 'subject'))
            }
            : null;

        const cov = buildCovarianceMatrix(subjectStats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
        const psdCov = ensurePositiveSemiDefinite(cov);
        subjectCholesky = choleskyDecomposition(psdCov);

        // ✅ FIX BUG-06: Validar e substituir elementos quase-zero na diagonal da Cholesky
        // Previne singularidades na multiplicação downstream que arruínam as simulações
        if (subjectCholesky) {
            for (let i = 0; i < subjectCholesky.length; i++) {
                if (!Number.isFinite(subjectCholesky[i][i]) || subjectCholesky[i][i] < 1e-8) {
                    subjectCholesky[i][i] = 1e-8;
                }
            }
        }
    }

    const choleskySize = subjectStats.length;

    // Buffers pré-alocados (reutilizados em todas as 5000 simulações)
    const independentBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const latentBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const sampledSubjectsBuffer = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    // Pré-computar parâmetros das marginais (não mudam entre simulações)
    const subjectParams = subjectStats.map(s => ({
        mean: toFiniteNumber(s.mean, 0),
        sd: Math.max(1e-6, toFiniteNumber(s.sd, 1)),
        minScore: clamp(toFiniteNumber(s.minScore, minScore), minScore, maxScore),
        maxScore: clamp(toFiniteNumber(s.maxScore, maxScore), minScore, maxScore),
        minCutoff: toFiniteNumber(s.minCutoff, 0),
        weight: Math.max(1e-6, toFiniteNumber(s.weight, 1)),
        immunityFactor: toFiniteNumber(s.immunityFactor, 1.0)
    }));

    for (let i = 0; i < safeSimulations; i++) {
        let currentTarget = effectiveTarget;

        if (hasCutoffs) {
            currentTarget = sampleTruncatedNormal(cutoffsMean, cutoffsSD, minScore, maxScore, rng);
            if (!Number.isFinite(currentTarget)) currentTarget = effectiveTarget;
        }

        let score = sampleTruncatedNormal(muParam, safeSD, minScore, maxScore, rng);
        if (!Number.isFinite(score)) score = clamp(safeMean, minScore, maxScore);

        let passedMins = true;

        if (subjectParams.length > 0) {
            let subjectSum = 0;
            let weightSum = 0;

            if (subjectCholesky && choleskySize > 1) {
                // Preencher buffer de normais independentes
                for (let k = 0; k < choleskySize; k++) {
                    const rawU = rng();
                    const u = Number.isFinite(rawU) ? Math.max(1e-12, Math.min(1 - 1e-12, rawU)) : 0.5;
                    independentBuffer[k] = inverseNormalCDF(u);
                }

                // Aplicar correlação via Cholesky (reutilizando buffers)
                applyCovariance(subjectCholesky, independentBuffer, latentBuffer);

                // Transformar cada marginal para normal truncada (reutilizando buffer)
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const u = 1 - normalCDF_complement(latentBuffer[j]);
                    sampledSubjectsBuffer[j] = truncatedNormalFromUniform(
                        sp.mean, sp.sd, sp.minScore, sp.maxScore, u
                    );
                }

                // Calcular média ponderada e verificar mínimos
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const subjScore = clamp(sampledSubjectsBuffer[j], sp.minScore, sp.maxScore);
                    subjectSum += subjScore * sp.weight;
                    weightSum += sp.weight;
                    if (!Number.isFinite(subjScore) || subjScore < sp.minCutoff) {
                        passedMins = false;
                    }
                }
            } else {
                // Caminho independente (sem correlação)
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const effSd = Math.max(1e-6, sp.sd * Math.max(0.80, sp.immunityFactor));
                    const sScore = sampleTruncatedNormal(sp.mean, effSd, sp.minScore, sp.maxScore, rng);
                    subjectSum += sScore * sp.weight;
                    weightSum += sp.weight;
                    if (!Number.isFinite(sScore) || sScore < sp.minCutoff) {
                        passedMins = false;
                    }
                }
            }

            score = weightSum > 0 ? subjectSum / weightSum : score;
        }

        if (score >= currentTarget && passedMins) success++;

        allScores[i] = score;

        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (score - welfordMean);
    }

    const projectedMeanRaw = welfordMean;
    const projectedMean = Number.isFinite(projectedMeanRaw) ? projectedMeanRaw : safeMean;

    const rawProjectedVar = welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0;
    const projectedSD = Math.sqrt(Math.max(0, Number.isFinite(rawProjectedVar) ? rawProjectedVar : 0));

    allScores.sort();

    const nScores = allScores.length;

    const at = (p) => allScores[Math.max(0, Math.min(nScores - 1, Math.floor(nScores * p)))];

    const statisticalCi95Low = at(0.025);
    const statisticalCi95High = at(0.975);
    const empMedian = at(0.5);
    const rawLeft = at(0.16);
    const rawRight = at(0.84);

    let rawLow = statisticalCi95Low;
    let rawHigh = statisticalCi95High;

    const empiricalProbability = (success / safeSimulations) * 100;

    const posteriorAlpha = success + 0.5;
    const posteriorBeta = (safeSimulations - success) + 0.5;
    const bayesEmpiricalProbability = (posteriorAlpha / (posteriorAlpha + posteriorBeta)) * 100;

    const displayMeanRaw = bayesianCI ? safeMean : projectedMean;
    const safeDisplayMean = clamp(toFiniteNumber(displayMeanRaw, safeMean), minScore, maxScore);

    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const MIN_SPREAD = Math.max(0.5, range * 0.005);

    const clampedDisplayMean = safeDisplayMean;
    const wasVisualCIClamped = (rawHigh - rawLow < MIN_SPREAD);

    if (wasVisualCIClamped) {
        const availableSpan = maxScore - minScore;

        if (availableSpan < MIN_SPREAD) {
            rawLow = minScore;
            rawHigh = maxScore;
        } else {
            rawLow = Math.max(minScore, clampedDisplayMean - MIN_SPREAD / 2);
            rawHigh = Math.min(maxScore, clampedDisplayMean + MIN_SPREAD / 2);

            if (rawHigh === maxScore && rawLow < maxScore - MIN_SPREAD) {
                rawLow = maxScore - MIN_SPREAD;
            } else if (rawLow === minScore && rawHigh > minScore + MIN_SPREAD) {
                rawHigh = minScore + MIN_SPREAD;
            }
        }
    }

    if (!Number.isFinite(rawLow)) rawLow = minScore;
    if (!Number.isFinite(rawHigh)) rawHigh = maxScore;

    const displayLow = rawLow;
    const displayHigh = rawHigh;

    const effectiveNForSD = bayesianCI
        ? Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1))
        : Math.max(1, historyLength || 1);

    const tMultiplierForSDRaw = getConfidenceMultiplier(effectiveNForSD, { allowFractional: true });
    const tMultiplierForSD = Number.isFinite(tMultiplierForSDRaw) && tMultiplierForSDRaw > 0
        ? tMultiplierForSDRaw
        : 3.92;

    const rawVisualSD = wasVisualCIClamped
        ? (rawHigh - rawLow) / (tMultiplierForSD * 2)
        : projectedSD;

    const visualSD = Number.isFinite(rawVisualSD) ? Math.max(0, rawVisualSD) : projectedSD;

    const safePhi = (v) => Number.isFinite(v) ? v : 0;

    const phiMin = safePhi(normalCDF_complement((minScore - muParam) / safeSD));
    const phiMax = safePhi(normalCDF_complement((maxScore - muParam) / safeSD));
    const phiTarget = safePhi(normalCDF_complement((effectiveTarget - muParam) / safeSD));

    let rawTruncNormFactor = phiMin - phiMax;
    if (!Number.isFinite(rawTruncNormFactor)) rawTruncNormFactor = 0;

    const isUnderflowStress = rawTruncNormFactor < 1e-15;

    const clampedPhiTarget = Number.isFinite(phiTarget)
        ? Math.max(phiMax, Math.min(phiMin, phiTarget))
        : phiMax;

    let truncNormFactor = isUnderflowStress ? 1e-6 : rawTruncNormFactor;
    if (!Number.isFinite(truncNormFactor) || truncNormFactor <= 0) truncNormFactor = 1e-6;

    let analyticalProbability;

    if (effectiveTarget >= maxScore && !hasCutoffs) {
        analyticalProbability = 0;
    } else if (effectiveTarget <= minScore && !hasCutoffs) {
        analyticalProbability = 100;
    } else {
        analyticalProbability = (isUnderflowStress || hasCutoffs)
            ? empiricalProbability
            : ((clampedPhiTarget - phiMax) / truncNormFactor) * 100;
    }

    if (!Number.isFinite(analyticalProbability)) analyticalProbability = empiricalProbability;

    const finalAnalyticalProbability = analyticalProbability;

    const finiteEmpiricalProbability = Number.isFinite(bayesEmpiricalProbability) ? bayesEmpiricalProbability : 0;
    const finiteAnalyticalProbability = Number.isFinite(finalAnalyticalProbability) ? finalAnalyticalProbability : 0;

    const empiricalVsAnalyticalGap = Math.abs(finiteEmpiricalProbability - finiteAnalyticalProbability);

    const lowSimulation = safeSimulations < 1200;
    const highTruncationStress = isUnderflowStress || truncNormFactor < 1e-6;

    const pHat = finiteEmpiricalProbability / 100;
    const empiricalStdErrRaw = Math.sqrt(Math.max(1e-12, (pHat * (1 - pHat)) / Math.max(1, safeSimulations))) * 100;
    const empiricalStdErr = Number.isFinite(empiricalStdErrRaw) ? empiricalStdErrRaw : 0;

    const GOLD_STANDARD_SIMS = 15000;
    const empiricalConfidence = Math.min(1, Math.max(0, safeSimulations / GOLD_STANDARD_SIMS));
    const truncationPenalty = highTruncationStress ? 0.55 : 1;
    const uncertaintyScaledGap = empiricalVsAnalyticalGap / Math.max(1, empiricalStdErr * 2.2);
    const disagreementPenalty = Math.max(0.35, 1 - (uncertaintyScaledGap / 6));

    const analyticalWeight = Math.min(0.9, Math.max(0, (1 - empiricalConfidence) * truncationPenalty * disagreementPenalty));

    const blendedProbability = (finiteAnalyticalProbability * analyticalWeight)
        + (finiteEmpiricalProbability * (1 - analyticalWeight));

    const recommendedProbability = Number.isFinite(blendedProbability) ? blendedProbability : finiteEmpiricalProbability;

    const safeEmpMedian = toFiniteNumber(empMedian, safeMean);
    const safeRawLeft = toFiniteNumber(rawLeft, safeMean);
    const safeRawRight = toFiniteNumber(rawRight, safeMean);

    const diagnostics = {
        simulationCount: safeSimulations,
        empiricalStdErr: Number(empiricalStdErr.toFixed(3)),
        analyticalWeight: Number(analyticalWeight.toFixed(3)),
        rhoUsed: null,
        effectiveN: Math.max(1, toFiniteNumber(historyLength, safeSimulations / 10)),
        shrinkageApplied: null,
        volatilitySources: {
            withinSubject: Number(safeSD.toFixed(2)),
            betweenSubjectContribution: 0
        },
        convergence: {
            targetSE: TARGET_PROB_SE,
            achievedSE: Number(empiricalStdErr.toFixed(4)),
            sufficient: empiricalStdErr < TARGET_PROB_SE * 1.5
        },
        policy: lowSimulation ? 'low_sample' : (highTruncationStress ? 'truncated' : 'standard'),
        flashcardImmunityApplied: safeFlashcardImmunity < 1.0 ? Number(safeFlashcardImmunity.toFixed(3)) : null
    };

    return {
        simulationCount: safeSimulations,
        probability: finiteEmpiricalProbability,
        analyticalProbability: finiteAnalyticalProbability,
        recommendedProbability,
        probabilityPolicy: lowSimulation
            ? 'blended_low_sample_policy'
            : (highTruncationStress ? 'blended_truncated_policy' : 'blended_adaptive_policy'),
        analyticalWeight,
        empiricalStdErr,
        empiricalProbabilityRaw: empiricalProbability,
        empiricalProbabilityBayes: finiteEmpiricalProbability,
        mean: safeDisplayMean,
        sd: projectedSD,
        sdVisual: visualSD,
        sdLeft: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeEmpMedian - safeRawLeft)
        ),
        sdRight: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeRawRight - safeEmpMedian)
        ),
        ci95StatLow: statisticalCi95Low,
        ci95StatHigh: statisticalCi95High,
        ci95Low: displayLow,
        ci95High: displayHigh,
        ci95VisualLow: displayLow,
        ci95VisualHigh: displayHigh,
        ci95VisualClamped: wasVisualCIClamped,
        ciConformalLow: statisticalCi95Low,
        ciConformalHigh: statisticalCi95High,
        currentMean: safeCurrentMean,
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allScores, safeDisplayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal',
        diagnostics
    };
}

const mcCache = new Map();
const MAX_CACHE_SIZE = 50;

function hashObject(obj) {
    try {
        return JSON.stringify(obj);
    } catch {
        return null;
    }
}

export function runMonteCarloAnalysis(params = {}) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        console.warn("[MC Engine] Fallback acionado. 'runMonteCarloAnalysis' requer objeto. Ignorando chamada bruta.");
        return monteCarloSimulation([], 85, 90, 5000, {});
    }

    const cacheKey = hashObject(params);
    if (cacheKey && mcCache.has(cacheKey)) {
        // Move to top (LRU)
        const cached = mcCache.get(cacheKey);
        mcCache.delete(cacheKey);
        mcCache.set(cacheKey, cached);
        return cached;
    }

    const {
        values = [],
        dates = [],
        meta = 0,
        targetScore: objTargetScore,
        simulations = 5000,
        projectionDays = 90,
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: objMinScore,
        maxScore: objMaxScore,
        subjects: objSubjects,
        historicalCutoffs: objHistoricalCutoffs,
        ...options
    } = params;

    const safeDomain = sanitizeDomain(objMinScore, objMaxScore);
    const domainMin = safeDomain.minScore;
    const domainMax = safeDomain.maxScore;

    const rawResolvedTarget = objTargetScore ?? Number(meta || 0);
    const resolvedTarget = clamp(toFiniteNumber(rawResolvedTarget, domainMin), domainMin, domainMax);

    const safeSimulations = sanitizeSimulations(simulations);
    // ✅ LOTE-03 FIX: "simular hoje" é um caso de uso válido (effectiveSimulateToday)
    const safeProjectionDays = Math.max(0, Math.floor(toFiniteNumber(projectionDays, 90)));

    const safeSubjects = objSubjects === undefined ? undefined : sanitizeSubjects(objSubjects);

    const safeHistoricalCutoffs = objHistoricalCutoffs === undefined
        ? undefined
        : (Array.isArray(objHistoricalCutoffs)
            ? objHistoricalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
            : []);

    const mergedOptions = {
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: domainMin,
        maxScore: domainMax,
        subjects: safeSubjects,
        historicalCutoffs: safeHistoricalCutoffs,
        ...options,
    };

    const extractScore = (value) => {
        if (value && typeof value === 'object') {
            return value.score ?? value.value;
        }
        return value;
    };

    const safeDates = dates || [];
    const safeValues = values || [];

    const history = safeValues
        .map((score, index) => {
            const rawScore = extractScore(score);
            const isNuloOuVazio = rawScore === null || rawScore === undefined || String(rawScore).trim() === '';
            
            const baseObj = (typeof score === 'object' && score !== null) ? score : {};

            return {
                ...baseObj,
                score: isNuloOuVazio ? NaN : Number(rawScore),
                date: safeDates[index] || baseObj.date || getDateKey(new Date())
            };
        })
        .filter(row => Number.isFinite(row.score));

    const result = monteCarloSimulation(history, resolvedTarget, safeProjectionDays, safeSimulations, mergedOptions);
    
    if (cacheKey) {
        if (mcCache.size >= MAX_CACHE_SIZE) {
            const firstKey = mcCache.keys().next().value;
            mcCache.delete(firstKey);
        }
        mcCache.set(cacheKey, result);
    }
    
    return result;
}

export function clearEngineMcCache() {
    mcCache.clear();
}

export default {
    runMonteCarloAnalysis,
    clearEngineMcCache
};
```

---

## `src/engine/projection.js` <a id="src-engine-projection-js"></a>

- **Localização:** `src/engine/projection.js`
- **Linhas:** 1021
- **Tamanho:** 49.29 KB

```javascript
// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32 } from './random.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { conformalPredictionInterval } from './math/bootstrap.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

import { sampleTruncatedNormal, ensurePositiveSemiDefinite, choleskyDecomposition, applyCovariance, generateGaussian } from './math/gaussian.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { weightedRegression, calculateSlopeStdError, getSortedHistory, calculateSlopePerDay } from './stats.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
export { weightedRegression, calculateSlopeStdError, getSortedHistory };

// 1. Blindagem de Datas: Adicione este helper no topo do arquivo (após os imports)
const getSafeTime = (dateInput) => {
    const parsed = safeDateParse(dateInput);
    return (parsed && !Number.isNaN(parsed.getTime())) ? parsed.getTime() : Date.now();
};

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------

/**
 * NEW: Simple non-linear detrending helper (log-time improvement curve).
 * Many students improve fast then plateau.
 */
export function computeNonLinearTrend(history, maxScore = 100, lambda = 0.08) {
  const sorted = getSortedHistory(history);
  if (sorted.length < 4) return { slope: 0, intercept: 50, type: 'linear' };

  const now = Date.now();
  const t0 = getSafeTime(sorted[0].date || sorted[0].createdAt);

  // Fit simple model: y ~ a + b * log(1 + days)
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

  sorted.forEach(h => {
    const y = getSafeScore(h, maxScore);
    const t = Math.max(0, (getSafeTime(h.date || h.createdAt) - t0) / 86400000);
    const x = Math.log(1 + t + 1); // log time
    const w = Math.exp(-lambda * Math.max(0, (now - getSafeTime(h.date || h.createdAt)) / 86400000));

    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXX += w * x * x;
    sumWXY += w * x * y;
  });

  const denom = (sumWXX * sumW - sumWX * sumWX);
  if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sumWY / sumW, type: 'log' };

  const b = (sumWXY * sumW - sumWX * sumWY) / denom;
  const a = (sumWY - b * sumWX) / sumW;

  return { slope: b, intercept: a, type: 'log_time', logTimeFit: true };
}

export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const validSorted = sorted.filter(h => Number.isFinite(getSafeScore(h, maxScore)));
    if (validSorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate || Date.now();
    const _scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(validSorted, lambda, maxScore, options);
    // CORREÇÃO: Defesa estrita contra null/undefined que disparam TypeError no getTime()
    const d0 = safeDateParse(validSorted[0].date || validSorted[0].createdAt);
    const t0_vol = (d0 && !Number.isNaN(d0.getTime())) ? d0.getTime() : Date.now();
    
    // OTIMIZAÇÃO DE PERFORMANCE: Fusão de loops O(5N) para O(N)
    let sumWeights = 0, sumResidualsWeighted = 0, sumSw = 0, sumSw2 = 0;

    const residualSamples = validSorted.map(h => {
        const hDate = h.date || h.createdAt;
        const parsed = safeDateParse(hDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        const x = (parsed.getTime() - t0_vol) / 86400000;
        const t = Math.max(0, (now - parsed.getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore);
        const val = y - (intercept + slope * x); // Resíduo (detrended)
        
        // Acumulação numa única passagem
        sumWeights += w;
        sumResidualsWeighted += val * w;
        sumSw += val * val * w;
        sumSw2 += w * w;

        return { value: val, weight: w }; 
    }).filter(Boolean);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-15 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-15 ? (sumResidualsWeighted / safeWeights) : 0;
    
    // CORREÇÃO: Calcular o Tamanho Efetivo de Amostra (Kish) dos pesos exponenciais
    const effectiveN = sumSw2 > 1e-15 ? (sumWeights * sumWeights) / sumSw2 : 1;
    
    // O bessel deve responder ao Effective N, não à contagem bruta temporal (n_res)
    const bessel = effectiveN > 1.5 ? effectiveN / (effectiveN - 1) : 1;
    const mssdVariance = sumWeights > 1e-15 ? Math.max(0, ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel) : 0;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = kahanSum(sortedArr.map(it => it.weight));
        if (totalW < 1e-15) return sortedArr[Math.floor(sortedArr.length / 2)].value;
        let accW = 0;
        for (const it of sortedArr) {
            accW += it.weight;
            if (accW >= totalW * 0.5) return it.value;
        }
        return sortedArr[sortedArr.length - 1].value;
    };

    const medianResidual = weightedMedian(residualSamples);
    const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
    const mad = weightedMedian(absDev);
    const robustSigma = 1.4826 * mad;
    const robustVariance = robustSigma * robustSigma;
    const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

    // O PULO DO GATO: Shrinkage Bayesiano para Volatilidade (Bug 1 Fix)
    // Assumimos que o piso natural de flutuação de qualquer aluno é de ~4% do Range
    const rangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const floorVolatility = rangeOU * 0.04; 
    const floorVariance = Math.pow(floorVolatility, 2);
    
    // Quanto menor a amostra, mais puxamos para o piso natural.
    const confidence = Math.min(1, validSorted.length / 15);
    const trueVariance = (blendedVariance * confidence) + (floorVariance * (1 - confidence));

    return Math.sqrt(Math.max(1e-6, trueVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    const n = scores.length;
    if (n < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const meanVal = kahanMean(scores);
    const variance = kahanSum(scores.map(b => Math.pow(b - meanVal, 2))) / (n - 1);
    return Math.sqrt(variance);
}

// -----------------------------
// MSSD — Mean Successive Squared Differences (BUG-MATH-01)
// Mede instabilidade SEM penalizar crescimento monotônico.
// -----------------------------
export function calculateMSSD(history, maxScore = 100, minScore = 0) {
  const safeHistory = getSortedHistory(history);
  if (!Array.isArray(safeHistory) || safeHistory.length < 2) {
    const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    return 0.05 * range;
  }
  
  const firstDateObj = safeDateParse(safeHistory[0].date || safeHistory[0].createdAt);
  const t0 = firstDateObj ? firstDateObj.getTime() : Date.now();
  
  // ✅ FIX: Create aligned pairs to prevent index misalignment
  const validPairs = [];
  for (let i = 0; i < safeHistory.length; i++) {
    const h = safeHistory[i];
    const score = getSafeScore(h, maxScore);
    const dateObj = safeDateParse(h.date || h.createdAt);
    const t = dateObj ? dateObj.getTime() : NaN;
    
    if (Number.isFinite(score) && Number.isFinite(t)) {
      validPairs.push({
        score: score,
        timeX: (t - t0) / 86400000,
        fatigueFlag: h.fatigueFlag
      });
    }
  }
  
  const fn = validPairs.length;
  if (fn < 2) {
    const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    return 0.05 * range;
  }
  
  const scores = validPairs.map(p => p.score);
  const timeX = validPairs.map(p => p.timeX);
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for(let i = 0; i < fn; i++) {
    const tx = timeX[i];
    sumX += tx;
    sumY += scores[i];
    sumXY += tx * scores[i];
    sumXX += tx * tx;
  }
  
  const det = fn * sumXX - sumX * sumX;
  const slope = det === 0 ? 0 : (fn * sumXY - sumX * sumY) / det;
  
  const detrendedScores = scores.slice(0, fn).map((y, i) => y - (slope * timeX[i])).filter(Number.isFinite);
  const dn = detrendedScores.length;
  
  let sumSqDiff = 0;
  let validTransitions = 0;
  
  for (let i = 1; i < dn; i++) {
    const diff = detrendedScores[i] - detrendedScores[i - 1];
    if (Number.isFinite(diff)) {
      const isFatigueDrop = diff < 0 && validPairs[i]?.fatigueFlag;
      const effectiveDiff = isFatigueDrop ? diff * 0.5 : diff;
      sumSqDiff += Math.pow(effectiveDiff, 2);
      validTransitions++;
    }
  }
  
  const rmssd = (sumSqDiff) / (2 * Math.max(1, validTransitions));
  return Math.sqrt(Math.max(1e-6, rmssd));
}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    // BUG-02 FIX: Implementação de EMA Dinâmica com Decaimento Temporal Contínuo.
    // Resolve a distorção onde longos períodos de inatividade eram ignorados (amnésia temporal).
    // Fórmula: α_real = 1 - (1 - α_base)^Δt
    const alphaBase = 2 / (n + 1);
    const deltaT = Math.max(1, daysSinceLast);
    
    // O decaimento exponencial contínuo garante que o peso da nova nota cresça proporcionalmente
    // ao tempo decorrido desde o último registro, compensando o "esquecimento".
    const alphaDinamico = 1 - Math.pow(1 - alphaBase, deltaT);
    
    // CORREÇÃO: O teto cognitivo desce de 0.95 para 0.40.
    // Garante que, independentemente do gap temporal, um teste único nunca
    // substitui mais de 40% da inércia da memória de longo prazo consolidada.
    const safeAlpha = Math.min(0.40, alphaDinamico);
    
    return (currentScore * safeAlpha) + (previousEMA * (1 - safeAlpha));
}

// -----------------------------
// Drift Clampeado
// -----------------------------
// ✅ FIX: calculateSlope com clamp proporcional à escala
export function calculateSlope(trendOrHistory, maxScoreOrOptions = 100, options = {}) {
  if (Array.isArray(trendOrHistory)) {
    const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
    const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
    
    const normalizedHistory = trendOrHistory.map(item => {
      if (typeof item === 'number') {
        return { score: item, date: null };
      }
      if (item && typeof item === 'object') {
        return {
          score: Number.isFinite(item.score) ? item.score : NaN,
          date: item.date || item.createdAt || null
        };
      }
      return { score: NaN, date: null };
    }).filter(item => Number.isFinite(item.score));
    
    if (normalizedHistory.length < 2) return 0;
    return calculateAdaptiveSlope(normalizedHistory, maxScore, opts);
  }
  
  // ✅ FIX: Clamp proporcional à amplitude real (maxScore - minScore) da prova
  const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
  const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
  const minScore = Number.isFinite(opts?.minScore) ? Number(opts.minScore) : 0;
  const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
  const absoluteMax = 0.004 * range; // 0.4% da amplitude real por dia
  
  let slope = Number(trendOrHistory) || 0;
  if (!Number.isFinite(slope)) return 0;
  
  if (slope > absoluteMax) slope = absoluteMax;
  if (slope < -absoluteMax) slope = -absoluteMax;
  
  return slope;
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    const trend = calculateSlopePerDay(history, maxScore);
    return calculateSlope(trend, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate || Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    if (historicalScores.length < 4) return { isLogistic: false };
    
    const meanVal = kahanSum(historicalScores) / Math.max(1, historicalScores.length);
    const devs = historicalScores.map(b => Math.pow(b - meanVal, 2));
    const currentVariance = Math.sqrt(kahanSum(devs) / Math.max(1, historicalScores.length - 1));

    let L = maxScore;
    if (historicalScores.length >= 4) {
        const validScores = historicalScores;
        if (validScores.length >= 4) {
            const sortedScores = [...validScores].sort((a, b) => a - b);
            const peak1 = sortedScores[sortedScores.length - 1];
            const peak2 = sortedScores[sortedScores.length - 2];
            const robustPeak = (peak1 * 0.6) + (peak2 * 0.4);
            const dynamicHeadroom = Math.min(maxScore * 0.15, Math.max(currentVariance * 1.5, maxScore * 0.05));
            // BUG-AUDIT-07 FIX: calculateSlope espera objetos {date, score}, não números puros.
            // Gerar objetos sintéticos com datas espaçadas de 7 dias para manter o contrato.
            const recentRaw = validScores.slice(-4);
            const recentAsObjects = recentRaw.map((s, idx) => ({
                score: s,
                date: getDateKey(new Date(Date.now() - (recentRaw.length - 1 - idx) * 7 * 86400000))
            }));
            const recentTrend = calculateSlopePerDay(recentAsObjects, maxScore);
            const recentSlope = calculateSlope(recentTrend, maxScore, options);
            const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (maxScore * 0.01)) : 0;
            
            L = robustPeak + (dynamicHeadroom * slopeMultiplier);
            L = Math.max(validScores[validScores.length - 1] + 1, Math.min(maxScore + 0.1, L));
        } else {
            const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
            const peakScore = getPercentile(sortedForPercentile, 0.90);
            L = Math.min(maxScore + 0.1, peakScore + (maxScore * 0.10));
        }
    } else {
        const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
        const peakScore = getPercentile(sortedForPercentile, 0.90);
        const spaceToMax = maxScore - peakScore;
        const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
        L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
    }

    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = Math.max(0, (now - getSafeTime(hDate)) / 86400000);
        const w = Math.exp(-0.08 * t);
        const x = (getSafeTime(hDate) - getSafeTime(sorted[0].date || sorted[0].createdAt)) / 86400000;
        
        let y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) return;
        
        y = Math.max(maxScore * 0.01, Math.min(maxScore, y));

        const safeMin = options.minScore || 0;
        const safeL = Math.max(L, y + 0.5); 
        // Offset proporcional à escala (0.1% do range) para evitar logit ±∞
        const logitOffset = Math.max(0.01, (safeL - safeMin) * 0.001);
        const boundedY = Math.max(safeMin + logitOffset, Math.min(safeL - logitOffset, y)); 
        const logitY = Math.log((boundedY - safeMin) / (safeL - boundedY));

        sumW += w;
        sumWX += w * x;
        sumWY += w * logitY;
        sumWXX += w * x * x;
        sumWXY += w * x * logitY;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { isLogistic: false };

    const k = (sumW * sumWXY - sumWX * sumWY) / det;
    const logitIntercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    return { 
        k, 
        intercept: logitIntercept, 
        isLogistic: true, 
        L, 
        t0: getSafeTime(sorted[0].date || sorted[0].createdAt) 
    };
}

export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: 0, marginOfError: 0 };

    const logisticFit = logisticRegression(sortedHistory, maxScore, options);
    let projectedScore;
    const now = options.referenceDate || Date.now();
    
    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, options) : { slopeStdError: 0 };
    let eventVolatility = calculateMSSD(sortedHistory, maxScore, minScore);

    // Bug 2.3 Fix: Divergência Asintótica no Amortecimento
    let linearSlope = 0;
    if (!(logisticFit.isLogistic && logisticFit.k > 0)) {
        let trend = calculateSlopePerDay(sortedHistory, maxScore);
        linearSlope = calculateSlope(trend, maxScore, options);
    }

    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift: linearSlope,
        driftUncertainty: slopeStdError,
        scaleFactor: maxScore / 100,
        normalizedVol: (eventVolatility / (maxScore - minScore > 0 ? maxScore - minScore : maxScore)) * 100
    });

    const maxEffectiveDays = dampingBase * Math.log(1 + projectDays / dampingBase);
    const effectiveDaysForDrift = Math.min(projectDays, maxEffectiveDays);

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = options.minScore || 0;
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        // Removemos a mistura corrompida. O EMA continuará a usar o `linearSlope`
        // para projetar o futuro no Random Walk.

        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);
            
            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    // Se o aluno tira 80 e a média global é 50, a nota "efetiva" puxa o EMA para cima
                    // Limitado a um bônus/punição máximo de 5% para não distorcer a realidade
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }

        
        // CORREÇÃO: Driftar a EMA da data do último teste até o dia de HOJE, 
        // para alinhar a origem do vetor temporal com a realidade atual.
        const lastHistoryDate = getSafeTime(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const daysToToday = Math.max(0, (now - lastHistoryDate) / 86400000);

        if (options.currentMean !== undefined) {
            const daysToNow = Math.max(1, daysToToday);
            ema = calculateDynamicEMA(options.currentMean, ema, sortedHistory.length + 1, daysToNow);
        }

        const driftToToday = linearSlope * (dampingBase * Math.log(1 + daysToToday / dampingBase));
        const currentScoreEstimate = ema + driftToToday;

        // Projeção final 100% matéticamente consistente
        projectedScore = currentScoreEstimate + linearSlope * effectiveDaysForDrift;
    }

    const avgGapDays = sortedHistory.length > 1 
        ? ((safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt) - safeDateParse(sortedHistory[0].date || sortedHistory[0].createdAt)) / 86400000) / (sortedHistory.length - 1)
        : 7; // fallback para 7 se só houver 1 teste
        
    // AGILIDADE AI: Punição de Volatilidade baseada no tempo de resposta lento
    if (options.agilityPenalty) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        eventVolatility = eventVolatility * (1 + safePenalty * 1.5);
    }
    
    // A incerteza do Random Walk espalha-se com a raiz do número de EVENTOS ESPERADOS, não dos dias.
    const expectedFutureEvents = Math.max(1, projectDays / Math.max(0.5, avgGapDays));
    const randomWalkUncertainty = eventVolatility * Math.sqrt(expectedFutureEvents);
    
    // Aplica o amortecimento do drift à incerteza angular (evita explosão da incerteza a longo prazo)
    const angularUncertainty = slopeStdError * effectiveDaysForDrift;
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    // Usar T-Student adaptativo para amostras pequenas em vez de Z=1.96 fixo
    const tMult = getConfidenceMultiplier(sortedHistory.length);
    const marginOfError = tMult * predictionSD; 

    return {
        // FIX #2: Precisão completa
        projected: Number.isNaN(projectedScore) ? minScore : Math.max(minScore, Math.min(maxScore, projectedScore)),
        marginOfError
    };
}

/**
 * Calcula o Damping Base adaptativo baseado no histórico.
 * @returns {number} Valor entre 30 e 60.
 */
export function computeAdaptiveDampingBase({ sampleSize, drift, driftUncertainty, scaleFactor, normalizedVol }) {
    const n = Math.max(1, Number(sampleSize) || 1);
    const safeDrift = Number.isFinite(drift) ? drift : 0;
    const safeUncertainty = Math.max(1e-6, Number(driftUncertainty) || 0);
    const safeScale = Math.max(1e-6, Number(scaleFactor) || 1);
    const safeNormVol = Math.max(0, Number(normalizedVol) || 0);

    const nConfidence = 1 - Math.exp(-n / 12);
    const trendSNR = Math.abs(safeDrift) / Math.max(0.05 * safeScale, safeUncertainty);
    const trendConfidence = Math.tanh(trendSNR / 2);
    const volPenalty = Math.min(1, safeNormVol / 18);
    const confidenceScore = Math.max(0, Math.min(1, (0.5 * nConfidence) + (0.35 * trendConfidence) + (0.15 * (1 - volPenalty))));
    return 30 + (30 * confidenceScore);
}

export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 5000,
    options = {}
) {
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base', flashcardImmunity = 1.0 } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
    const sortedHistory = getSortedHistory(history);
    const safeSimulations = Math.max(1, simulations);
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    // Defaults for new diagnostics
    let trendType = 'linear';

    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Find the last valid score in the sorted history
    let validCurrentScore = NaN;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const s = getSafeScore(sortedHistory[i], maxScore);
        if (Number.isFinite(s)) {
            validCurrentScore = s;
            break;
        }
    }
    const currentScore = Number.isFinite(validCurrentScore) ? validCurrentScore : 0;
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;
    if (sortedHistory.length > 0) {
        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);

            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }
        if (forcedBaseline === undefined) {
            baselineScore = optionsCurrentMean !== undefined ? optionsCurrentMean : ema;
        }
    }

    if (optionsCurrentMean !== undefined) {
        const lastDate = safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const referenceNow = options.referenceDate || Date.now();
        const lastTs = lastDate && !Number.isNaN(lastDate.getTime()) ? lastDate.getTime() : Date.now();
        const daysToNow = Math.max(1, (referenceNow - lastTs) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }
    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;   // ✅ LOTE-03
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * range)));

    // FEAT: Time Penalty (Simulação de Prova Real)
    let timePenaltyApplied = false;
    let timePenaltyScoreDrop = 0;
    let projectedTotalTimeSeconds = options.projectedTotalTimeSeconds || 0;
    let examDurationMinutes = options.examDurationMinutes || 0;
    let overflowRatio = 0;

    if (examDurationMinutes > 0 && projectedTotalTimeSeconds > 0) {
        const examLimitSeconds = examDurationMinutes * 60;
        if (projectedTotalTimeSeconds > examLimitSeconds) {
            overflowRatio = (projectedTotalTimeSeconds - examLimitSeconds) / projectedTotalTimeSeconds;
            
            // O aluno só consegue resolver com qualidade (1 - overflowRatio) da prova.
            // O restante (overflowRatio) será chutado, com probabilidade de acerto de 20% (1/5).
            const guessScore = 0.2 * (maxScore - minScore) + minScore; // 20% na escala correta
            const newBaseline = (baselineScore * (1 - overflowRatio)) + (guessScore * overflowRatio);
            
            timePenaltyScoreDrop = baselineScore - newBaseline;
            baselineScore = newBaseline;
            timePenaltyApplied = true;
        }
    }

    // IMPROVED mean reversion (from Coach+MC analysis): give stronger weight to historical mean when performance is declining.
    // This prevents the projection from collapsing too aggressively on negative drift.
    const histScores = sortedHistory.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    let historicalMean = histScores.length > 0 ? kahanMean(histScores) : baselineScore;

    // Aplica o esmagamento da métrica no equilíbrio de longo prazo também
    if (timePenaltyApplied && overflowRatio > 0) {
        const guessScore = 0.2 * (maxScore - minScore) + minScore;
        historicalMean = (historicalMean * (1 - overflowRatio)) + (guessScore * overflowRatio);
    }

    const belowHistorical = baselineScore < historicalMean;
    const histWeight = belowHistorical ? 0.95 : 0.80;
    const stableMeanTarget = Math.max(minScore, Math.min(maxScore, (historicalMean * histWeight + baselineScore * (1 - histWeight))));

    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, options)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    let effectiveDriftSlope = regressionResult.slope;

    trendType = 'linear';
    if (sortedHistory.length >= 4) {
        try {
            const nl = computeNonLinearTrend(sortedHistory, maxScore, 0.08);
            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
                trendType = 'log_time_available';
                // NOTE: Do not blend nl.slope directly (different units).
                // Drift uses pure linear slope for correctness.
            }
        } catch { /* ignore */ }
    }

    const slopeStdError = regressionResult.slopeStdError;
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * range;   // antes: * maxScore
    const drift = Math.max(-driftLimit, Math.min(driftLimit, effectiveDriftSlope));
    const simulationDays = days;
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    const driftUncertaintyCap = options.driftUncertaintyCap !== undefined ? options.driftUncertaintyCap : 0.4;
    let driftUncertainty = Math.min(rawDriftUncertainty, driftUncertaintyCap * scaleFactor) * (scenarioCfg.ciMult || 1);

    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5;
        driftUncertainty *= (1 + 0.4 * nFactor);
    }

    let volatility = forcedVolatility !== undefined 
        ? Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore), forcedVolatility)
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);
    
    // Bug 2.2 Fix: Double Jeopardy (Evita dupla penalização se o overflowRatio já trucidou a média)
    // Se o timePenaltyApplied estiver ativo, já absorvemos o abalo do tempo, inflar a variância
    // agora atiraria o cone do Monte Carlo para um cenário irrealista de descalabro.
    if (options.agilityPenalty && !timePenaltyApplied) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        volatility = volatility * (1 + safePenalty * 1.5);
    }

    // NEW: Flashcard Immunity Shield — reduz volatilidade global no caminho de projeção
    if (flashcardImmunity < 1.0) {
        volatility = volatility * Math.max(0.80, flashcardImmunity);
    }

    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    
    // ✅ FIX: thetaOU agora escala com a confiança da amostra.
    // Poucos dados → reversão mais forte (conservador).
    // Muitos dados → reversão mais fraca (confia na tendência).
    const sampleConfidence = Math.min(1, sortedHistory.length / 15);
    const thetaOU = Math.min(
      0.15,
      (0.02 + 0.06 * (1 - sampleConfidence)) + 0.002 * Math.min(40, normalizedVolOU)
    );

    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;
        const d1 = safeDateParse(h.date || h.createdAt);
        const d0 = safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt);
        const t1 = d1 && !Number.isNaN(d1.getTime()) ? d1.getTime() : Date.now();
        const t0 = d0 && !Number.isNaN(d0.getTime()) ? d0.getTime() : t1;
        const deltaT = (t1 - t0) / (1000 * 60 * 60 * 24);
        const safeDeltaT = Number.isFinite(deltaT) ? deltaT : 0.1;
        const rawDays = Math.max(0.1, safeDeltaT);
        const detrendedChange = actualChange - (drift * rawDays);
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    const validResiduals = (residuals.length > 1 ? residuals.slice(1) : residuals).filter(Number.isFinite);
    let centeredResiduals;
    if (validResiduals.length > 1) {
        const residualMean = kahanSum(validResiduals) / Math.max(1, validResiduals.length);
        centeredResiduals = validResiduals.map(r => r - residualMean);
    } else {
        centeredResiduals = validResiduals;
    }
    
    const sortedResiduals = [...centeredResiduals].sort((a, b) => a - b);
    const resMedian = getPercentile(sortedResiduals, 0.5);
    const absDevs = centeredResiduals.map(r => Math.abs(r - resMedian)).sort((a, b) => a - b);
    const resMad = getPercentile(absDevs, 0.5) || (1.0 * scaleFactor);
    const safeResiduals = centeredResiduals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    const empMean = kahanSum(safeResiduals) / Math.max(1, safeResiduals.length);
    const empDevs = safeResiduals.map(r => Math.pow(r - empMean, 2));
    const empResidualSD = Math.sqrt(kahanSum(empDevs) / Math.max(1, safeResiduals.length));
    const standardizer = empResidualSD > 0 ? empResidualSD : 1;

    const results = [];
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore)}-${sortedHistory.length}`;
    let seedValue = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        seedValue ^= seedStr.charCodeAt(i);
        seedValue = Math.imul(seedValue, 16777619);
    }
    const rng = mulberry32(Math.abs(seedValue >>> 0));

    let medianGap = 7;
    if (sortedHistory.length >= 2) {
        const gaps = [];
        for (let j = 1; j < sortedHistory.length; j++) {
            const d1 = safeDateParse(sortedHistory[j].date || sortedHistory[j].createdAt);
            const d0 = safeDateParse(sortedHistory[j - 1].date || sortedHistory[j - 1].createdAt);
            // CORREÇÃO: Impedir que a subtração de Invalid Dates injete NaN na distribuição GARCH
            const g = (d1 && d0 && !Number.isNaN(d1.getTime()) && !Number.isNaN(d0.getTime())) 
                ? (d1.getTime() - d0.getTime()) / 86400000 
                : 7; // Fallback seguro
            gaps.push(Math.max(0.5, g));
        }
        gaps.sort((a, b) => a - b);
        medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
    }
    // A volatilidade estocástica diária deve ser escalada pelo gap médio entre provas
    // para que a variância cresça corretamente como um Random Walk/OU process.
    const dailyVolatility = Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore),
      volatility / Math.sqrt(Math.max(1, medianGap)));

    // [BUG-1 FIX] Usar o damping adaptativo em vez do hardcode de 45.
    // Com poucos dados/alta vol, dampingBase ≈ 30 (amortece rápido).
    // Com muitos dados/tendência clara, dampingBase ≈ 60 (preserva mais).
    // Movido para fora do loop: inputs invariantes por simulação.
    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift,
        driftUncertainty,
        scaleFactor,
        normalizedVol: normalizedVolOU
    });

    // Constantes GARCH(1,1) invariantes por simulação
    const alphaG = 0.05;
    const betaG = 0.75;
    // BUG-AUDIT-02 FIX: omega calculado com a variância incondicional de equilíbrio (σ²_∞),
    // σ²_∞ = ω / (1 - α - β), logo ω = (1 - α - β) × σ²_∞
    // CORREÇÃO: Prevenir o GARCH Zero-Variance Trap
    const unconditionalVar = Math.max(1e-6, Math.pow(dailyVolatility, 2));
    const omega = (1 - alphaG - betaG) * unconditionalVar;

    // FIX #3: Prepare Cholesky for correlated subject minCutoffs (disciplines with minCutoff)
    const cutoffSubjects = (options.subjects || []).filter(s => s && Number(s.minCutoff) > 0);
    let subjectCholesky = null;
    if (cutoffSubjects.length > 1) {
      const stats = cutoffSubjects.map(s => ({
          ...s, // Bug 4.2 Fix: Preserve properties to allow empirical Pearson correlation later
          sd: (Number(s.sd) || 1) * Math.max(0.80, s.immunityFactor || 1.0)
      }));
      
      // FIX APLICADO: Utilizando cutoffSubjects para resgatar os nomes corretamente
      const adaptiveRhoContext = options?.simuladoRows ? { 
          simuladoRows: options.simuladoRows, 
          categoryNames: cutoffSubjects.map(s => s.name) 
      } : null;
      
      const cov = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
      const psdCov = ensurePositiveSemiDefinite(cov);
      subjectCholesky = choleskyDecomposition(psdCov);
    }

    function calculateSkewness(residuals, mean) {
        if (!residuals || residuals.length < 3) return 0;
        const n = residuals.length;
        let sumSquared = 0;
        for (let i = 0; i < n; i++) sumSquared += Math.pow(residuals[i] - mean, 2);
        const variance = sumSquared / n;
        const standardizer = Math.sqrt(variance);
        
        if (standardizer === 0) return 0;

        let m3 = 0;
        for (let i = 0; i < n; i++) m3 += Math.pow(residuals[i] - mean, 3);
        m3 /= n;

        return m3 / Math.pow(standardizer, 3);
    }
    
    // PATCH 1: Recalcular a média real do subconjunto filtrado
    const subsetMean = safeResiduals.length > 0 
        ? safeResiduals.reduce((acc, val) => acc + val, 0) / safeResiduals.length 
        : 0;

    const residualsSkew = calculateSkewness(safeResiduals, subsetMean);

    const minCutoffFailures = [];

    // CORREÇÃO GC THRASHING: Alocação estática fora do loop de Monte Carlo
    const choleskySize = cutoffSubjects.length;
    const zVecStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const zCorrStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    for (let i = 0; i < safeSimulations; i++) {
        // CORREÇÃO: O truncamento normal tem de respeitar o driftLimit dinâmico e não hardcodes de 1%.
        const sampledDrift = sampleTruncatedNormal(
            drift, 
            driftUncertainty, 
            -driftLimit, 
            driftLimit, 
            rng
        );
        let currentSimScore = baselineScore;
        let currentVolSq = unconditionalVar;

        for (let d = 1; d <= simulationDays; d++) {
            // [RIGOR-FIX] Drift Damping Adaptativo: O impacto da tendência diminui com o tempo (Log-decay)
            // dampingBase varia de 30 (conservador) a 60 (confiante) conforme qualidade do sinal.
            const driftDamping = 1 / (1 + d / dampingBase); 
            const driftEffect = sampledDrift * driftDamping;

            // IMPROVED: Stronger reversion to historical mean, especially on negative drift.
            // The O-U reversion target should be stable to prevent double counting drift.
            let meanReversionTarget = stableMeanTarget;
            meanReversionTarget = Math.min(maxScore, Math.max(minScore, meanReversionTarget));
            let meanReversion = Math.max(0.005, thetaOU) * (meanReversionTarget - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            // Prevent extreme reversion pulls that cause artificial boundary piling in long simulations
            const maxReversionPull = adaptiveVol * 3;
            meanReversion = Math.max(-maxReversionPull, Math.min(maxReversionPull, meanReversion));
            
            // CORREÇÃO: Padrão Ouro de Filtered Historical Simulation (FHS)
            // O choque empírico tem de ser escalado para a volatilidade GARCH atual
            let shock = 0;
            if (safeResiduals.length >= 15) {
                // 90% Bootstrap (Histórico Empírico) / 10% Gaussiano Assimétrico (Black Swan)
                if (rng() > 0.10) {
                    const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                    shock = (rawEmpirical / standardizer) * adaptiveVol; 
                } else {
                    // PATCH: Gaussian Skew Adjustment (Cornish-Fisher expansion to maintain zero mean)
                    const z = generateGaussian(rng);
                    const zCF = z + (residualsSkew * (z * z - 1)) / 6.0; 
                    shock = zCF * adaptiveVol;
                }
            } else if (safeResiduals.length > 5 && rng() > 0.3) {
                const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                shock = (rawEmpirical / standardizer) * adaptiveVol; 
            } else {
                shock = generateGaussian(rng) * adaptiveVol;
            }
            
            // ✅ LOTE-03 FIX: o clamp por dailyVolatility sufocava choques quando o GARCH
            // já tinha elevado adaptiveVol — a trajetória não podia realizar a própria variância
            const shockLimit = Math.max(dailyVolatility, adaptiveVol) * 3;
            const clampedShock = Math.max(-shockLimit, Math.min(shockLimit, shock));
            
            // Evolução da Volatilidade GARCH(1,1): Var(t+1) = w + a*e^2 + b*Var(t)
            currentVolSq = omega + alphaG * Math.pow(clampedShock, 2) + betaG * currentVolSq;
            
            // Clamp de sanidade para evitar divergência explosiva em projeções longas
            currentVolSq = Math.min(currentVolSq, Math.pow(maxScore * 0.2, 2));
            
            currentSimScore += driftEffect + meanReversion + clampedShock; // consistente com GARCH
            
            // Simple clamp to bounds (mean reversion + historical target should keep trajectories reasonable).
            // Removed complex RBM reflection which was causing boundary piling bias in declining series (scores clustering at minScore, skewing means low).
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Number.isNaN(currentSimScore) ? minScore : Math.max(minScore, Math.min(maxScore, currentSimScore));
        }

        // Aplica os limites físicos da prova APENAS no resultado assintótico final
        // Preservação de sinal estrito: O backend mantém o valor bruto. 
        // O clamping ocorre apenas na camada de UI (MonteCarloGauge.jsx).
        results.push(currentSimScore);
        
        let passedMins = true;
        if (choleskySize > 0) {
            if (subjectCholesky) {
                // Reutilização extrema de memória: mutar o array em vez de re-alocar
                for(let k = 0; k < choleskySize; k++) {
                    zVecStatic[k] = generateGaussian(rng);
                }
                applyCovariance(subjectCholesky, zVecStatic, zCorrStatic);
                for (let j = 0; j < choleskySize; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    // PATCH 2: Cholesky L matrix already contains standard deviations on its diagonal
                    const raw = Number(s.mean) + zCorrStatic[j];
                    const subjScore = Math.max(sMin, Math.min(sMax, raw));
                    if (subjScore < Number(s.minCutoff)) {
                        passedMins = false;
                        break;
                    }
                }
            } else {
                // fallback independent
                for (let j = 0; j < cutoffSubjects.length; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const effSd = s.sd * Math.max(0.80, s.immunityFactor || 1.0);
                    const subjScore = sampleTruncatedNormal(s.mean, effSd, sMin, sMax, rng);
                    if (subjScore < s.minCutoff) {
                        passedMins = false;
                        break;
                    }
                }
            }
        }
        minCutoffFailures.push(!passedMins);
    }

    // 4. Agregação Estatística
    // Note: We need to count successes before sorting results!
    let successes = 0;
    for (let i = 0; i < safeSimulations; i++) {
        if (results[i] >= targetScore && !minCutoffFailures[i]) {
            successes++;
        }
    }

    results.sort((a, b) => a - b);
    const meanResult = kahanMean(results);

    // BUG-3 FIX: Calcular a probabilidade analítica real usando a Normal Truncada
    // em vez de copiar a empírica como fallback.
    const finalSD = calculateVolatility(results.map(r => ({ score: r })), maxScore, minScore);
    const empiricalProb = (successes / safeSimulations) * 100;

    // FIX BUG 4: Simulações O-U com choques difusos e Clamping diário não formam 
    // uma Distribuição Normal Truncada perfeita no limite estacionário.
    // Usar a CDF analítica aqui causa divergência drástica e invalida as previsões.
    // Para modelos difusos complexos, a probabilidade empírica convergida é a única fonte da verdade.
    let analyticalProb = empiricalProb;

    // NEW: Conformal intervals for more robust, distribution-free CIs
    const mcResiduals = results.map(r => r - meanResult);
    const conformal = conformalPredictionInterval(mcResiduals, 0.05, meanResult); // 95% coverage
    const rawCiLow = conformal.lower ?? getPercentile(results, 0.025, true);
    const rawCiHigh = conformal.upper ?? getPercentile(results, 0.975, true);
    const safeCiLow = Math.max(minScore, Math.min(maxScore, rawCiLow));
    const safeCiHigh = Math.max(minScore, Math.min(maxScore, rawCiHigh));

    return {
        // FIX #2: Valores brutos com precisão completa. toFixed removido do motor.
        // UI e componentes de display devem formatar quando necessário.
        probability: empiricalProb,
        analyticalProbability: analyticalProb,
        timePenaltyApplied,
        timePenaltyScoreDrop,
        projectedTotalTimeSeconds: options.projectedTotalTimeSeconds || 0,
        examDurationMinutes: options.examDurationMinutes || 0,
        mean: meanResult,
        projectedMean: meanResult, // Standardized for EvolutionChart
        sd: finalSD,
        ci95Low: safeCiLow,
        ci95High: safeCiHigh,
        ciConformalLow: safeCiLow,
        ciConformalHigh: safeCiHigh,
        currentMean: baselineScore,
        drift: (drift * 30),
        volatility,
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high',
        // NEW: non-linear trend availability
        trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
        diagnostics: {
            trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
            effectiveDriftSlope: typeof effectiveDriftSlope !== 'undefined' ? effectiveDriftSlope : 0,
            conformalCoverage: 0.95,
            simulationCount: safeSimulations,
            historicalMean: historicalMean || null,
            effectiveN: Math.max(1, sortedHistory.length)
        }
    };
}
```

---

## `src/engine/analyticsStats.js` <a id="src-engine-analyticsstats-js"></a>

- **Localização:** `src/engine/analyticsStats.js`
- **Linhas:** 493
- **Tamanho:** 19.69 KB

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
export const CALIBRATION_MIN_EFFECTIVE_SAMPLES = 5.0;

const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

// T-011 FIX: clamp defensivo de acertos.
// Impede que correct > total gere accuracy/projeção acima de 100%.
const clampCorrectToTotal = (correct, total) => {
    const t = Number(total);
    if (!Number.isFinite(t) || t <= 0) return 0;

    const c = Number(correct);
    if (!Number.isFinite(c)) return 0;

    return Math.max(0, Math.min(t, c));
};

// FIX: parseInt truncava pesos decimais ("2.5" -> 2).
// Agora aceita decimais e arredonda de forma previsível.
export const sanitizeWeightUnit = (value) => {
    let numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        numeric = parseInt(value, 10);
    }

    if (Number.isNaN(numeric)) return 0;

    return Math.max(0, Math.min(999, numeric));
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

    // T-017 FIX: maxScore seguro para evitar divisão por zero
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0
        ? maxScore
        : 100;

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

        if (meanPrediction > 0 && safeMaxScore > 0) {
            const err = Math.abs(meanPrediction - actualScore) / safeMaxScore;
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
            const weight = sanitizeWeightUnit(debouncedWeights[weightKey] ?? 1);

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

                        // T-011 FIX: clamp de correct por total antes de agregar
                        const currentCorrect = currentTotal > 0
                            ? clampCorrectToTotal(h.correct, currentTotal)
                            : 0;

                        if (existing) {
                            const newTotal = existing.total + currentTotal;
                            const newCorrect = existing.correct + currentCorrect;

                            // T-011 FIX: clamp também após soma agregada
                            const safeNewCorrect = newTotal > 0
                                ? Math.max(0, Math.min(newTotal, newCorrect))
                                : newCorrect;

                            const newScore = newTotal > 0
                                ? (safeNewCorrect / newTotal) * catMaxScore
                                : (existing.score + currentScore) / 2;

                            scoresByDate[dk][weightKey] = {
                                score: newScore,
                                correct: safeNewCorrect,
                                total: newTotal
                            };
                        } else {
                            scoresByDate[dk][weightKey] = {
                                score: currentScore,
                                correct: currentCorrect,
                                total: currentTotal
                            };
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

    // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
    // normalizeDate já é usado no projeto para ancorar datas com mais segurança.
    const sortedDates = Object.keys(scoresByDate).sort((a, b) => {
        const da = normalizeDate(a)?.getTime() ?? 0;
        const db = normalizeDate(b)?.getTime() ?? 0;
        return da - db;
    });
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
                const rawTotal = Number(metrics.total) || getSyntheticTotal(catMaxScore);

                const total = Number.isFinite(rawTotal) && rawTotal > 0
                    ? rawTotal
                    : getSyntheticTotal(catMaxScore);

                const rawCorrect = (metrics.correct !== undefined && metrics.total > 0)
                    ? Number(metrics.correct)
                    : (Number(metrics.score) / catMaxScore) * total;

                // T-011 FIX: clamp final antes de ponderar no histórico global
                const correct = Math.max(
                    0,
                    Math.min(total, Number.isFinite(rawCorrect) ? rawCorrect : 0)
                );

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

    // T-016 FIX: incluir pesos no hash.
    // Sem isso, mudar pesos podia não disparar nova simulação se a média global
    // e o fingerprint permanecessem parecidos.
    const weightFingerprint = categoryStats
      .map(c => `${c.key}:${Number(c.weight || 0).toFixed(2)}`)
      .join('|');

    const safeTotalWeight = Number.isFinite(totalWeight)
      ? Number(totalWeight.toFixed(2))
      : 0;

    const statsHash = `${bayesianMean.toFixed(4)}-${pooledSD.toFixed(4)}-${safeMinScore}-${safeMaxScore}-${scoreFingerprint}-tw[${safeTotalWeight}]-w[${weightFingerprint}]-cutoffs[${cutoffs}]`;

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

## `src/engine/stats.js` <a id="src-engine-stats-js"></a>

- **Localização:** `src/engine/stats.js`
- **Linhas:** 1138
- **Tamanho:** 43.64 KB

```javascript
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { normalizeDate, safeDateParse } from '../utils/dateHelper.js';
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { computeAdaptiveLambda } from './diagnostics.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';

export const BAYESIAN_DECAY_FACTOR = 0.985;
export const RETENTION_DECAY_SHORT = 0.94;
export const RETENTION_DECAY_LONG = 0.992;

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

function safeFinite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function safeMaxScoreValue(maxScore, fallback = 100) {
    const n = Number(maxScore);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function computeImprovedRetentionProbability(historyLength, lastGapDays = 7, maxAlpha = 0.9) {
    const shortDecay = Math.pow(RETENTION_DECAY_SHORT, Math.max(0, lastGapDays));
    const longDecay = Math.pow(RETENTION_DECAY_LONG, Math.max(0, lastGapDays * 0.6));
    const blended = 0.6 * shortDecay + 0.4 * longDecay;
    return Math.max(0.15, Math.min(maxAlpha, blended * maxAlpha));
}

export function getSortedHistory(history) {
    const histArray = toHistoryArray(history);
    if (!histArray.length) return [];

    return histArray
        .map((h, index) => {
            if (typeof h === 'number') {
                return { original: h, time: index };
            }

            const dateValue = h?.date ?? h?.createdAt;
            const t = dateValue != null ? safeDateParse(dateValue)?.getTime() ?? NaN : NaN;

            return { original: h, time: t };
        })
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return String(a.original?.id || '').localeCompare(String(b.original?.id || ''));
        })
        .map(item => item.original);
}

export function pruneHistoryForMemory(history = [], maxPoints = 1500, maxAgeDays = 365 * 5) {
    const sorted = getSortedHistory(history);
    if (!sorted.length) return sorted;

    const now = Date.now();
    const cutoff = now - maxAgeDays * 86400000;

    let filtered = sorted.filter(h => {
        const t = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        return Number.isFinite(t) && t >= cutoff;
    });

    if (filtered.length <= maxPoints) return filtered;

    const recentCount = Math.max(10, Math.floor(maxPoints * 0.2));
    const older = filtered.slice(0, -recentCount);
    const recent = filtered.slice(-recentCount);

    if (older.length <= maxPoints - recentCount) return filtered;

    const targetCount = maxPoints - recentCount;
    const factor = older.length / targetCount;
    const sampledOlder = [];

    for (let i = 0; i < targetCount; i++) {
        sampledOlder.push(older[Math.floor(i * factor)]);
    }

    return [...sampledOlder, ...recent].slice(0, maxPoints);
}

export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    lambda = Math.max(0, Math.min(1, lambda ?? 0.08));
    maxScore = safeMaxScoreValue(maxScore, 100);

    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);
        const x = (timeMs - t0) / 86400000;

        const yW = w - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWY = w * y;
        const yWY = valWY - cWY; const tWY = sumWY + yWY; cWY = (tWY - sumWY) - yWY; sumWY = tWY;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valWXY = w * x * y;
        const yWXY = valWXY - cWXY; const tWXY = sumWXY + yWXY; cWXY = (tWXY - sumWXY) - yWXY; sumWXY = tWXY;
    }

    const RIDGE_PENALTY = Math.max(1e-8, (sumWXX > 0 ? sumWXX / Math.max(1, sumW) : 1) * 1e-4);
    const safeSumW = Math.max(1e-15, sumW);
    const varianceX = Math.max(0, sumWXX - (sumWX * sumWX) / safeSumW);
    const covXY = sumWXY - (sumWX * sumWY) / safeSumW;
    const regularizedDenominator = varianceX + RIDGE_PENALTY;

    if (safeSumW < 1e-15 || regularizedDenominator < 1e-15) {
        const fallbackScore = getSafeScore(sorted[sorted.length - 1], maxScore);
        return { slope: 0, intercept: Number.isFinite(fallbackScore) ? fallbackScore : 0, slopeStdError: 1.5 };
    }

    let slope = covXY / regularizedDenominator;
    const maxSlopeLimit = maxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

export function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    maxScore = safeMaxScoreValue(maxScore, 100);

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumW2 = 0, cW2 = 0;
    let sumWX = 0, cWX = 0;
    let sumWXX = 0, cWXX = 0;
    let rss = 0, cRSS = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const x = (timeMs - t0) / 86400000;
        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const w = Math.max(EPSILON_WEIGHT, Math.exp(-lambda * t));
        const pred = intercept + slope * x;
        const residualSq = Math.pow(y - pred, 2);

        const valW = w;
        const yW = valW - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valW2 = w * w;
        const yW2 = valW2 - cW2; const tW2 = sumW2 + yW2; cW2 = (tW2 - sumW2) - yW2; sumW2 = tW2;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valRSS = w * residualSq;
        const yRSS = valRSS - cRSS; const tRSS = rss + yRSS; cRSS = (tRSS - rss) - yRSS; rss = tRSS;
    }

    if (sumW2 <= 1e-15) return 1.5 * (maxScore / 100);

    const effectiveN = (sumW * sumW) / sumW2;
    const scaleFactorFallback = maxScore / 100;

    if (effectiveN <= 2.1) return 1.5 * scaleFactorFallback;

    const variance = (rss / sumW) * (effectiveN / (effectiveN - 2));
    const varX = (sumWXX - (sumWX * sumWX) / sumW) / sumW;

    if (varX <= 1e-8) {
        return Math.sqrt(Math.max(0, rss / sumW)) / Math.sqrt(effectiveN);
    }

    const det = sumW * sumWXX - sumWX * sumWX;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

function getHistoryDateValue(entry) {
    return entry?.date ?? entry?.createdAt ?? null;
}

function getHistoryTime(entry) {
    const parsed = normalizeDate(getHistoryDateValue(entry));
    return parsed ? parsed.getTime() : NaN;
}

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeCurrent = safeFinite(currentScore, 0);
    const currentPct = safeCurrent / safeMaxScore;

    if (!Number.isFinite(currentPct)) return 0.002 * safeMaxScore;

    const damping = Math.max(0, 1 - currentPct);
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;

    return dynamicPct * safeMaxScore;
}

// ✅ FIX: getDynamicPriorSD trata array de números nus
function getDynamicPriorSD(history, maxScore) {
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  const safeHistory = toHistoryArray(history);
  
  if (safeHistory.length < 5) return safeMaxScore * 0.15;
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const scores = safeHistory.map(h => {
    if (typeof h === 'number') return h;
    return getSafeScore(h, safeMaxScore);
  }).filter(Number.isFinite);
  
  if (scores.length < 5) return safeMaxScore * 0.15;
  
  const globalMean = mean(scores);
  const globalVar = scores.length > 1
    ? kahanSum(scores.map(s => Math.pow(s - globalMean, 2))) / (scores.length - 1)
    : 0;
  
  const empiricalSD = Math.sqrt(Math.max(0, globalVar));
  return Math.max(safeMaxScore * 0.05, Math.min(safeMaxScore * 0.20, empiricalSD));
}

export function mean(arr) {
    return kahanMean(arr);
}

export const calcularMedia = mean;

// ✅ FIX: standardDeviation aceita array de números nus
export function standardDeviation(arr, maxScore = 100, customMean = null) {
  if (!arr || arr.length < 1) return 0;
  
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const clean = arr
    .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMaxScore))
    .filter(Number.isFinite);
  
  if (clean.length < 1) return 0;
  
  const n = clean.length;
  const m = customMean !== null && Number.isFinite(Number(customMean)) ? Number(customMean) : mean(clean);
  
  const sampleVar = n > 1
    ? kahanSum(clean.map(val => Math.pow(val - m, 2))) / (n - 1)
    : 0;
  
  const sorted = [...clean].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = absDev.length % 2 === 0
    ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
    : absDev[Math.floor(absDev.length / 2)];
  
  const robustSigma = 1.4826 * mad;
  const robustVar = robustSigma * robustSigma;
  
  const blendedSampleVar = (0.8 * sampleVar) + (0.2 * robustVar);
  
  const POPULATION_SD = getDynamicPriorSD(arr, safeMaxScore);
  const KAPPA = 1;
  
  const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);
  
  const finalSdFloor = MIN_SD_FLOOR * safeMaxScore;
  return Math.max(finalSdFloor, Math.sqrt(Math.max(0, adjustedVar)));
}

export const calcularDesvioPadrao = (arr) => {
    if (!arr || arr.length <= 1) return 0;

    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length <= 1) return 0;

    const m = kahanMean(clean);
    const sumSq = clean.map(x => Math.pow(x - m, 2));
    const v = clean.length > 0 ? kahanSum(sumSq) / clean.length : 0;

    return Math.sqrt(Math.max(0, v));
};

export function calcularAssimetria(arr) {
    if (!arr || arr.length < 3) return 0;

    const clean = toHistoryArray(arr)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    const n = clean.length;
    if (n < 3) return 0;

    const m = mean(clean);
    const sumSq = kahanSum(clean.map(val => Math.pow(val - m, 2)));
    const sampleVar = sumSq / (n - 1);
    const s = Math.sqrt(Math.max(0, sampleVar));

    if (s < 1e-5) return 0;

    const cubeDiffs = clean.map(val => Math.pow(val - m, 3));
    const sumCube = kahanSum(cubeDiffs);
    const safeS = Math.max(1e-5, s);
    const skewness = (n * sumCube) / ((n - 1) * (n - 2) * Math.pow(safeS, 3));

    if (!Number.isFinite(skewness)) return 0;

    return Math.max(-5, Math.min(5, skewness));
}

export function computeBayesianLevel(
    historyOrScore,
    arg1 = 1,
    arg2 = 1,
    arg3 = 100,
    arg4 = {}
) {
    let history, alpha, beta, safeMaxScore, options;

    if (Array.isArray(historyOrScore)) {
        history = toHistoryArray(historyOrScore);

        const safeAlphaArg = Number(arg1);
        const safeBetaArg = Number(arg2);

        alpha = Number.isFinite(safeAlphaArg) && safeAlphaArg >= 0 ? safeAlphaArg : 1;
        beta = Number.isFinite(safeBetaArg) && safeBetaArg >= 0 ? safeBetaArg : 1;

        safeMaxScore = safeMaxScoreValue(arg3, 100);
        options = arg4 || {};
    } else {
        history = [];

        const score = Math.max(0, Number(historyOrScore) || 0);

        const nEffArg = Number(arg1);
        const n_eff = Number.isFinite(nEffArg) && nEffArg >= 0 ? nEffArg : 1;

        safeMaxScore = safeMaxScoreValue(arg2, 100);
        options = arg3 || {};

        const pct = Math.max(0, Math.min(1, score / safeMaxScore));
        alpha = pct * n_eff;
        beta = (1 - pct) * n_eff;
    }

    const alpha0 = alpha;
    const beta0 = beta;

    let maxNEver = alpha + beta;

    const syntheticTotalValue = getSyntheticTotal(safeMaxScore);
    const safeSyntheticTotal = Number.isFinite(syntheticTotalValue) ? syntheticTotalValue : 20;

    const safeTotalEntry = (h) => {
        const n = Number(h?.total);
        return Number.isFinite(n) && n > 0 ? n : safeSyntheticTotal;
    };

    const gaps = [];

    const historySortedForGaps = history
        .map(h => ({ original: h, time: getHistoryTime(h) }))
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => a.time - b.time)
        .map(item => item.original);

    if (historySortedForGaps.length > 1) {
        for (let i = 1; i < historySortedForGaps.length; i++) {
            const time1 = getHistoryTime(historySortedForGaps[i]);
            const time0 = getHistoryTime(historySortedForGaps[i - 1]);
            const gap = (time1 - time0) / 86400000;
            if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
        }
    }

    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? kahanSum(gaps) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;
    const totalQuestionsHist = history.length ? kahanSum(history.map(safeTotalEntry)) : 0;

    const historyDays = historySortedForGaps.length > 1
        ? Math.max(1, (getHistoryTime(historySortedForGaps[historySortedForGaps.length - 1]) - getHistoryTime(historySortedForGaps[0])) / 86400000)
        : 1;

    const questionsPerDay = totalQuestionsHist / historyDays;
    const volumeCapacity = questionsPerDay * 30;
    const rawCap = Math.min(baseCapacity, volumeCapacity);
    const dynamicAlphaCap = Math.max(250, Math.floor(Number.isFinite(rawCap) ? rawCap : 250));
    const dynamicEffectiveN = dynamicAlphaCap;

    const refDateObj = options.referenceDate ? normalizeDate(options.referenceDate) : null;
    const now = refDateObj && Number.isFinite(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();

    // ✅ LOTE-01 FIX: priors calculados SOBRE O MESMO ARRAY iterado abaixo.
    // Antes o slice(-2000) acontecia depois, desalinhando runningPriors[i].
    const MAX_ITERATIONS = 2000;
    const historyToProcess = historySortedForGaps.length > MAX_ITERATIONS
        ? historySortedForGaps.slice(-MAX_ITERATIONS)
        : historySortedForGaps;

    const runningPriors = new Float64Array(historyToProcess.length);
    if (historyToProcess.length > 0) {
        let priorSum = 0, priorC = 0, priorCount = 0;
        for (let j = 0; j < historyToProcess.length; j++) {
            const sScore = getSafeScore(historyToProcess[j], safeMaxScore);
            if (Number.isFinite(sScore)) {
                let rawPct = sScore / safeMaxScore;
                rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
                const validPct = Math.min(1, rawPct);
                const y = validPct - priorC;
                const t = priorSum + y;
                priorC = (t - priorSum) - y;
                priorSum = t;
                priorCount++;
            }
            runningPriors[j] = priorCount > 0 ? priorSum / priorCount : 0.5;
        }
    }

    const avgTotalRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : safeSyntheticTotal;

    const avgTotal = Number.isFinite(avgTotalRaw) && avgTotalRaw > 0 ? avgTotalRaw : safeSyntheticTotal;

    const rawBaseLambda = history.length > 0 ? computeAdaptiveLambda(historySortedForGaps) : 0.08;
    const baseAdaptiveLambda = Number.isFinite(rawBaseLambda)
        ? Math.max(0.005, Math.min(1, rawBaseLambda))
        : 0.08;

    if (history.length > 0) {

        for (let i = 0; i < historyToProcess.length; i++) {
            const h = historyToProcess[i];

            const totalRaw = Number(h?.total);
            const hasTotal = Number.isFinite(totalRaw) && totalRaw > 0;
            const total = hasTotal ? totalRaw : 0;

            const normalizedScore = getSafeScore(h, safeMaxScore);
            if (!Number.isFinite(normalizedScore)) continue;

            const isPurePercentage = !hasTotal;

            let rawPct = normalizedScore / safeMaxScore;
            rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
            const pct = Math.min(1, rawPct);

            const entryDate = normalizeDate(getHistoryDateValue(h));
            const prevDate = i > 0 ? normalizeDate(getHistoryDateValue(historyToProcess[i - 1])) : entryDate;

            const timeEntry = entryDate?.getTime();
            const timePrev = prevDate?.getTime();

            const gapDays = Number.isFinite(timeEntry) && Number.isFinite(timePrev)
                ? Math.max(0, Math.floor((timeEntry - timePrev) / 86400000))
                : 0;

            const rawLambda = baseAdaptiveLambda * Math.exp(-0.15 * i);
            const lambda = Math.max(0.005, Number.isFinite(rawLambda) ? rawLambda : baseAdaptiveLambda);

            const entryDecayRaw = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;
            const entryDecay = Number.isFinite(entryDecayRaw) ? Math.max(0, Math.min(1, entryDecayRaw)) : 1.0;

            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapDays || 0)));

            // ✅ FIX: Piso de retenção proporcional ao decaimento, NÃO ao histórico máximo.
            // Usa um piso fixo pequeno (3-10) que decai com o tempo, permitindo
            // que o aluno realmente "esqueça" após longos períodos sem estudo.
            const retentionFloor = Math.max(3.0, Math.min(10.0, cappedMaxN * 0.05)) * macroDecay;

            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;

                if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                    const currentP = alpha / nBeforeDecay;
                    const minN = retentionFloor;
                    const HARD_FLOOR = 3.0;
                    const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);

                    const nAfterDecayRaw = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * entryDecay)));
                    const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : safeFloor;

                    const priorP = i > 0 ? runningPriors[i - 1] : runningPriors[0] || 0.5;
                    const safePriorP = Number.isFinite(priorP) ? priorP : 0.5;

                    const regressedPRaw = (currentP * entryDecay) + (safePriorP * (1 - entryDecay));
                    const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                    alpha = nAfterDecay * regressedP;
                    beta = nAfterDecay * (1 - regressedP);
                }
            }

            const rawItemWeight = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const itemWeight = Math.max(0.001, Number.isFinite(rawItemWeight) ? rawItemWeight : 1.0);

            const stepCap = dynamicAlphaCap;

            if (isPurePercentage) {
                const syntheticNRaw = avgTotal * itemWeight;
                const syntheticN = Number.isFinite(syntheticNRaw) && syntheticNRaw > 0 ? syntheticNRaw : 0;

                let alphaHoje = pct * syntheticN;
                let betaHoje = (1 - pct) * syntheticN;

                const sumHoje = alphaHoje + betaHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    alphaHoje *= clampDiario;
                    betaHoje *= clampDiario;
                }

                alpha += Number.isFinite(alphaHoje) ? alphaHoje : 0;
                beta += Number.isFinite(betaHoje) ? betaHoje : 0;
            } else if (total >= 1) {
                let correct = Math.max(0, Math.round(pct * total));
                const safeCorrect = Math.max(0, Math.min(total, correct));

                let acertosHoje = Math.max(0, safeCorrect * itemWeight);
                let errosHoje = Math.max(0, (total - safeCorrect) * itemWeight);

                const sumHoje = acertosHoje + errosHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    acertosHoje *= clampDiario;
                    errosHoje *= clampDiario;
                }

                alpha += Number.isFinite(acertosHoje) ? acertosHoje : 0;
                beta += Number.isFinite(errosHoje) ? errosHoje : 0;
            }

            // ✅ Renormalização incremental a cada 50 iterações
            if (i % 50 === 0 && (alpha + beta) > dynamicAlphaCap * 2) {
              const factor = dynamicAlphaCap / (alpha + beta);
              alpha *= factor;
              beta *= factor;
            }

            // ✅ Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar
            if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
              alpha = alpha0;
              beta = beta0;
            }

            const currentN = alpha + beta;
            if (!Number.isFinite(currentN)) {
                alpha = alpha0;
                beta = beta0;
                break;
            }

            if (currentN > maxNEver) {
                maxNEver = Math.min(currentN, dynamicAlphaCap);
            }
        }
    }

    const nAfterLoop = alpha + beta;
    if (Number.isFinite(nAfterLoop) && nAfterLoop > dynamicAlphaCap && nAfterLoop > 0) {
        const globalClamp = dynamicAlphaCap / nAfterLoop;
        alpha *= globalClamp;
        beta *= globalClamp;
    }

    const lastEntry = historySortedForGaps.length > 0 ? historySortedForGaps[historySortedForGaps.length - 1] : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastDate = normalizeDate(lastDateStr);
        const gapToToday = Math.max(0, Math.floor((now - (lastDate ? lastDate.getTime() : now)) / 86400000));

        if (gapToToday > 0) {
            const rawFinalLambda = baseAdaptiveLambda * Math.exp(-0.15 * (historySortedForGaps.length || 1));
            const finalLambda = Math.max(0.005, Number.isFinite(rawFinalLambda) ? rawFinalLambda : baseAdaptiveLambda);

            const finalDecayRaw = Math.exp(-finalLambda * gapToToday);
            const finalDecay = Number.isFinite(finalDecayRaw) ? Math.max(0, Math.min(1, finalDecayRaw)) : 1;

            const nBeforeDecay = alpha + beta;

            if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                const currentP = alpha / nBeforeDecay;

                const epistemicDecayRaw = Math.pow(finalDecay, 0.35);
                const epistemicDecay = Number.isFinite(epistemicDecayRaw) ? Math.max(0, Math.min(1, epistemicDecayRaw)) : 1;

                const safeMaxNEver = Number.isFinite(maxNEver) ? maxNEver : 0;
                const epistemicFloor = Math.max(3.0, Math.min(10.0, safeMaxNEver * 0.05));

                const nAfterDecayRaw = Math.max(epistemicFloor, Math.min(nBeforeDecay, nBeforeDecay * epistemicDecay));
                const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : Math.max(epistemicFloor, Math.min(nBeforeDecay, epistemicFloor));

                const empiricalPriorFinal = runningPriors.length > 0 ? runningPriors[runningPriors.length - 1] : 0.5;
                const safeEmpiricalPriorFinal = Number.isFinite(empiricalPriorFinal) ? empiricalPriorFinal : 0.5;

                const regressedPRaw = (currentP * finalDecay) + (safeEmpiricalPriorFinal * (1 - finalDecay));
                const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                alpha = nAfterDecay * regressedP;
                beta = nAfterDecay * (1 - regressedP);
            }
        }
    }

    // FIX: Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar para prior
    if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
      alpha = alpha0;
      beta = beta0;
    }

    const n = alpha + beta;

    if (!Number.isFinite(n) || n <= 0) {
        return { mean: 0, sd: 0, ciLow: 0, ciHigh: 0, alpha: alpha0, beta: beta0, n: 0 };
    }

    const effectiveN = Math.min(n, dynamicEffectiveN);
    const p = alpha / n;
    const effectiveAlpha = p * effectiveN;

    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    const mediaDeQuestoesDoAlunoRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : 100;

    const mediaDeQuestoesDoAluno = Number.isFinite(mediaDeQuestoesDoAlunoRaw) && mediaDeQuestoesDoAlunoRaw > 0
        ? mediaDeQuestoesDoAlunoRaw
        : 100;

    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(mediaDeQuestoesDoAluno));

    const rawEpistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const epistemicVar = Number.isFinite(rawEpistemicVar) ? Math.max(1e-6, rawEpistemicVar) : 1e-6;

    const rawAleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;
    const aleatoricVar = Number.isFinite(rawAleatoricVar) ? Math.max(1e-6, rawAleatoricVar) : 1e-6;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });
    const marginOfError = tMultiplier * effectiveSd * safeMaxScore;
    const adjustedMarginOfError = Number.isFinite(marginOfError) ? marginOfError : 0;

    const centerForCI = p_tilde * safeMaxScore;
    const trueMean = p * safeMaxScore;

    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

    if (!Number.isFinite(ciLow)) ciLow = Math.max(0, trueMean);
    if (!Number.isFinite(ciHigh)) ciHigh = Math.min(safeMaxScore, trueMean);

    if (trueMean < ciLow) ciLow = trueMean;
    if (trueMean > ciHigh) ciHigh = trueMean;

    const strictLow = Number.isFinite(ciLow) ? Math.max(0, ciLow) : 0;
    const strictHigh = Number.isFinite(ciHigh) ? Math.min(safeMaxScore, ciHigh) : safeMaxScore;

    let alphaOut = alpha;
    let betaOut = beta;

    if (n > dynamicEffectiveN && n > 0) {
        const factor = dynamicEffectiveN / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean: trueMean,
        sd: effectiveSd * safeMaxScore,
        ciLow: strictLow,
        ciHigh: strictHigh,
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > dynamicEffectiveN ? dynamicEffectiveN : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return null;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    const rawSynthetic = getSyntheticTotal(safeMaxScore);
    const syntheticTotal = Number.isFinite(rawSynthetic) ? rawSynthetic : 20;

    const historyWithSynthetics = safeHistory
        .map(h => {
            const score = getSafeScore(h, safeMaxScore);
            const total = Number(h?.total);

            if ((!Number.isFinite(total) || total <= 0) && Number.isFinite(score)) {
                if (typeof h === 'number') {
                    return { score: h, total: syntheticTotal };
                }

                return {
                    ...(h && typeof h === 'object' ? h : { original: h }),
                    total: syntheticTotal
                };
            }

            return h;
        })
        .filter(Boolean);

    const validHistory = historyWithSynthetics.filter(h => {
        const total = Number(h?.total);
        return Number.isFinite(total) && total > 0;
    });

    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    const scores = historyToUse
        .map(h => getSafeScore(h, safeMaxScore))
        .filter(Number.isFinite);

    const validHistoryForMean = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    let sumWeightMean = 0;
    let sumScoreMean = 0;

    validHistoryForMean.forEach(h => {
        const totalWeight = Number(h?.total);
        if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

        const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
        const diffWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
        const effW = totalWeight * diffWeight;

        sumWeightMean += effW;
        sumScoreMean += getSafeScore(h, safeMaxScore) * effW;
    });

    const mRaw = sumWeightMean > 0 ? sumScoreMean / sumWeightMean : mean(scores);
    const m = Number.isFinite(mRaw) ? mRaw : 0;

    let variance = 0;

    if (historyToUse.length > 1) {
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0;

        const sortedScores = [...scores].sort((a, b) => a - b);

        const median = sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)];

        const absoluteDeviations = scores
            .map(s => Math.abs(s - median))
            .sort((a, b) => a - b);

        const rawMad = absoluteDeviations.length % 2 === 0
            ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
            : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];

        const mad = Number.isFinite(rawMad) && rawMad > 0 ? rawMad * 1.4826 : 0.001 * safeMaxScore;
        const clampLimit = 3.5 * mad;

        validHistoryForMean.forEach(h => {
            const totalWeight = Number(h?.total);
            if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

            const safeScore = getSafeScore(h, safeMaxScore);
            if (!Number.isFinite(safeScore)) return;

            const robustScore = Number.isFinite(median) && Number.isFinite(clampLimit)
                ? Math.max(median - clampLimit, Math.min(median + clampLimit, safeScore))
                : safeScore;

            const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const difficultyWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
            const effectiveWeight = totalWeight * difficultyWeight;

            wVarSum += effectiveWeight * Math.pow(robustScore - m, 2);
            sumW += effectiveWeight;
            sumW2 += Math.pow(effectiveWeight, 2);
        });

        const kishDifference = sumW - (sumW > 0 ? (sumW2 / sumW) : 0);
        const kishDenom = kishDifference > 1e-4 ? kishDifference : Math.max(1e-4, sumW);

        const rawSampleVar = sumW > 0 ? wVarSum / kishDenom : 0;
        const sampleVar = Number.isFinite(rawSampleVar) ? Math.max(0, rawSampleVar) : 0;

        const POPULATION_SD = getDynamicPriorSD(historyToUse, safeMaxScore);
        const safePopulationSD = Number.isFinite(POPULATION_SD) ? POPULATION_SD : 0;
        const popVar = Math.pow(safePopulationSD, 2);

        const safeStudentVar = Math.max(popVar * 0.05, sampleVar);
        const ratio = safeStudentVar > 0 ? popVar / safeStudentVar : 3.0;

        let KAPPA = Math.max(0.1, Math.min(3.0, Number.isFinite(ratio) ? ratio : 3.0));

        const sortedForDates = getSortedHistory(historyToUse);
        const firstDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[0]));
        const lastDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[sortedForDates.length - 1]));

        const firstDateMs = firstDateParsed && Number.isFinite(firstDateParsed.getTime())
            ? firstDateParsed.getTime()
            : Date.now();

        const lastDateMs = lastDateParsed && Number.isFinite(lastDateParsed.getTime())
            ? lastDateParsed.getTime()
            : Date.now();

        const timeSpreadDays = Math.max(0, (lastDateMs - firstDateMs) / 86400000);

        if (
            historyToUse.length >= 2 &&
            sampleVar < (0.0004 * safeMaxScore * safeMaxScore) &&
            timeSpreadDays > 7
        ) {
            KAPPA = KAPPA * Math.exp(-timeSpreadDays / 14);
        }

        const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : historyToUse.length;
        const n_eff = Number.isFinite(effectiveN) ? Math.max(1, effectiveN) : 1;
        const kishDenomTerm = n_eff > 1.5 ? (n_eff - 1) : 1;

        const rawVariance = (kishDenomTerm * sampleVar + KAPPA * popVar) / (kishDenomTerm + KAPPA);
        variance = Number.isFinite(rawVariance) ? Math.max(0, rawVariance) : popVar;
    } else {
        const priorSD = getDynamicPriorSD(historyToUse, safeMaxScore);
        variance = Math.pow(Number.isFinite(priorSD) ? priorSD : 0, 2);
    }

    const sd = Math.max(Math.sqrt(Math.max(0, variance)), 0.001 * safeMaxScore);
    const safeSD = Number.isFinite(sd) ? sd : 0.001 * safeMaxScore;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore);
    const safeSlope = Number.isFinite(slopePerDay) ? slopePerDay : 0;

    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore);

    const validHistoryForTrend = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    const sortedForTrendCap = getSortedHistory(validHistoryForTrend);

    const lastScoreRaw = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore)
        : m;

    const safeLastScore = Number.isFinite(lastScoreRaw) ? lastScoreRaw : m;

    const limiteSuperior = safeMaxScore - safeLastScore;
    const limiteInferior = -safeLastScore;

    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, safeSlope * 30));
    const safeRawTrend = Number.isFinite(rawTrend) ? rawTrend : 0;

    let trendLabel = 'stable';
    if (safeRawTrend > trendThreshold) trendLabel = 'up';
    else if (safeRawTrend < -trendThreshold) trendLabel = 'down';

    const level = m > 0.7 * safeMaxScore ? 'ALTO' : m > 0.4 * safeMaxScore ? 'MÉDIO' : 'BAIXO';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight,
        history: safeHistory,
        trend: trendLabel,
        trendValue: safeRawTrend,
        level
    };
}

export const calculateEMA = (scores, alpha = 0.25) => {
    const clean = toHistoryArray(scores)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    if (!clean.length) return 0;

    let ema = clean[0];
    const maxObserved = clean.reduce((a, b) => Math.max(a, b), 1);

    for (let i = 1; i < clean.length; i++) {
        const delta = clean[i] - ema;
        const range = maxObserved;
        const absDelta = Math.abs(delta);

        const upBonus = Math.min(0.10, 0.05 * (absDelta / range));
        const downBonus = Math.min(0.03, 0.015 * (absDelta / range));
        const trendBonus = delta >= 0 ? upBonus : downBonus;
        const currentAlpha = Math.min(1, alpha + trendBonus);

        ema = (clean[i] * currentAlpha) + (ema * (1 - currentAlpha));
    }

    return Number.isFinite(ema) ? ema : 0;
};

export const calculateTimeWeightedEMA = (historicData, lambda = 0.05) => {
    const safeHistory = toHistoryArray(historicData);
    if (!safeHistory.length) return null;

    const validData = safeHistory.filter(d =>
        Number.isFinite(d?.score) && (d?.timestamp != null || d?.date != null)
    );

    if (!validData.length) return null;

    const getTime = (d) => {
        if (d?.timestamp != null && Number.isFinite(d.timestamp)) return d.timestamp;

        if (d?.date != null) {
            const ms = new Date(d.date).getTime();
            return Number.isFinite(ms) ? ms : NaN;
        }

        return NaN;
    };

    validData.sort((a, b) => getTime(a) - getTime(b));

    let ema = validData[0].score;
    let lastTime = getTime(validData[0]);

    for (let i = 1; i < validData.length; i++) {
        const currentItem = validData[i];
        const currentTime = getTime(currentItem);

        if (!Number.isFinite(currentTime) || !Number.isFinite(lastTime)) continue;

        const deltaDays = Math.max(0, (currentTime - lastTime) / 86400000);
        const dynamicAlpha = 1 - Math.exp(-lambda * deltaDays);
        const safeAlpha = Math.max(0.1, Math.min(1.0, dynamicAlpha));

        ema = safeAlpha * currentItem.score + (1 - safeAlpha) * ema;
        lastTime = currentTime;
    }

    return Number.isFinite(ema) ? ema : null;
};

export {
    computeBrierScore,
    computeLogLoss,
    summarizeCalibration,
    computeCalibrationDiagnostics,
    shrinkProbabilityToNeutral
} from '../utils/calibration.js';

export function computeHierarchicalAdjustment(categories, pooledSD) {
    const safeCategories = toHistoryArray(categories);
    if (!safeCategories.length) return safeCategories;

    const validCategories = safeCategories.filter(c =>
        Number.isFinite(c.mean) && Number.isFinite(c.n) && c.n > 0
    );

    if (!validCategories.length) return safeCategories;

    const globalMean = kahanSum(validCategories.map(c => c.mean || 0)) / Math.max(1, validCategories.length);

    const tau2 = kahanSum(validCategories.map(c => Math.pow((c.mean || 0) - globalMean, 2))) /
        Math.max(1, validCategories.length - 1);

    return safeCategories.map(cat => {
        if (!Number.isFinite(cat.mean) || !cat.n) {
            return { ...cat, bayesianMean: cat.mean, bayesianSd: cat.sd };
        }

        const localSD = Number.isFinite(cat.sd) ? cat.sd : (pooledSD || 15);
        const localVar = Math.pow(localSD, 2) / Math.max(1, cat.n);
        const denom = localVar + tau2;
        const B = denom > 1e-15 ? localVar / denom : 0;

        const bayesianMean = B * globalMean + (1 - B) * cat.mean;
        const popVar = Math.pow(pooledSD || 15, 2);
        const bayesianSd = Math.sqrt(Math.max(0, B * popVar + (1 - B) * Math.pow(localSD, 2)));

        return {
            ...cat,
            bayesianMean,
            bayesianSd,
            shrinkage: B
        };
    });
}

export function computeAgilityMetrics(history, targetSeconds = 120) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return { avgSeconds: 0, agilityPenalty: 0 };

    let totalTimeSpent = 0;
    let totalTimedQuestions = 0;

    for (const h of safeHistory) {
        if (h.timeSpent != null && h.timedQuestoes != null) {
            const ts = Number(h.timeSpent);
            const tq = Number(h.timedQuestoes);

            if (Number.isFinite(ts) && Number.isFinite(tq) && ts > 0 && tq > 0) {
                totalTimeSpent += ts;
                totalTimedQuestions += tq;
            }
        }
    }

    const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;
    const safeTarget = Math.max(30, Number(targetSeconds) || 120);

    const agilityPenalty = avgSeconds > safeTarget
        ? Math.min(0.4, (avgSeconds - safeTarget) / (safeTarget * 1.25))
        : 0;

    return {
        avgSeconds: Math.round(avgSeconds),
        agilityPenalty: Number(agilityPenalty.toFixed(4))
    };
}

export function calculateSlopePerDay(history, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return 0;

    const sorted = getSortedHistory(safeHistory);
    if (sorted.length < 2) return 0;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    // ✅ FIX: Filtrar entradas com datas válidas ANTES de calcular.
    // Isso garante que firstDate sempre seja um timestamp válido.
    const validEntries = [];
    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const dateParsed = safeDateParse(h?.date ?? h?.createdAt);
        const time = dateParsed?.getTime();
        const y = getSafeScore(h, safeMaxScore);
        if (Number.isFinite(time) && Number.isFinite(y)) {
            validEntries.push({ time, y });
        }
    }

    if (validEntries.length < 2) return 0;

    // ✅ FIX: firstDate agora é garantidamente válido
    const firstDate = validEntries[0].time;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const validN = validEntries.length;

    for (let i = 0; i < validN; i++) {
        const x = (validEntries[i].time - firstDate) / 86400000;
        const y = validEntries[i].y;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    const denominator = (validN * sumX2) - (sumX * sumX);
    if (Math.abs(denominator) < 1e-12) return 0;

    const slopePerDay = ((validN * sumXY) - (sumX * sumY)) / denominator;
    // ✅ LOTE-01 FIX: slope POR DIA. O "* 10" anterior inflava trendValue em 10×
    // e fazia o clamp do calculateSlope saturar uma ordem de grandeza antes.
    return Number.isFinite(slopePerDay) ? slopePerDay : 0;
}

/**
 * @deprecated Use calculateSlopePerDay instead. Renomeado no Lote 05 para indicar a unidade explícita [pts/dia].
 */
export const calculateTrend = calculateSlopePerDay;


```

---

## `src/engine/variance.js` <a id="src-engine-variance-js"></a>

- **Localização:** `src/engine/variance.js`
- **Linhas:** 477
- **Tamanho:** 19.30 KB

```javascript
/**
 * Monte Carlo Engine - Variance Module
 * 
 * Implements weighted variance calculation and time uncertainty
 * All formulas are statistically correct and auditable
 */
import { kahanSum } from './math/kahan.js';
import { getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { normalize } from '../utils/normalization.js';

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

/**
 * Compute weighted variance from category statistics
 * Formula: Var = (1 - ρ) × [Σ wi² × σi²] + ρ × [Σ (wi × σi)]²
 * Calcula a variância ponderada interpolando entre a hipótese de independência 
 * das disciplinas (ρ = 0) e a hipótese de correlação perfeita (ρ = 1).
 * 
 * BUG-M3: This formula is statistically correct under the assumption of
 * independence between subjects. If subjects are strongly correlated
 * (shared test-day effects), the true variance lies between this value
 * and the correlated formula (Σ w_i*σ_i)².
 * 
 * CONTRACT: totalWeight must be the sum of all raw weights. If stats weights are 
 * already normalized (0-1), totalWeight MUST be passed as 1 for correct computations.
 * 
 * @param {Object[]} stats - Array of { sd, weight } objects
 * @param {number} totalWeight - Sum of all weights (use 1 if stats weights are normalized)
 * @returns {number} Weighted variance
 */
// CORREÇÃO: Alinhamento com Modelos TRI (Teoria de Resposta ao Item).
// 0.25 capta melhor a covariância psicológica (stress do dia) 
// sem esmagar o Desvio Padrão Agregado (Pooled SD) do candidato.
export const INTER_SUBJECT_CORRELATION = 0.25; // Prior / fallback correlation between subjects (stress day effect)

/**
 * Adaptive version of INTER_SUBJECT_CORRELATION.
 * Tries to estimate from real user performance history (simulado rows) when sufficient data exists.
 * Falls back gracefully to the conservative prior.
 */
export function getAdaptiveInterSubjectCorrelation(_stats = [], simuladoRows = [], categoryNames = [], fallback = INTER_SUBJECT_CORRELATION, maxScore = 100) {
  try {
    const safeSimuladoRows = (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})).filter(Boolean);
    if (!Array.isArray(safeSimuladoRows) || safeSimuladoRows.length < 5 || !Array.isArray(categoryNames) || categoryNames.length < 2) {
      return fallback;
    }

    // Build aligned score rows: one object per "simulado day" { "Matematica": 82, "Direito": 71, ... }
    const byDate = {};
    safeSimuladoRows.forEach(row => {
      const dateKey = getDateKey(row.date || row.createdAt);
      if (!dateKey) return;
      const subj = normalize(row.subject || row.categoryName || row.name);
      if (!subj) return;
      const score = getSafeScore(row, maxScore);
      if (!Number.isFinite(score)) return;

      if (!byDate[dateKey]) byDate[dateKey] = {};
      byDate[dateKey][subj] = score;
    });

    const alignedRows = Object.values(byDate);
    if (alignedRows.length < 4) return fallback;

    const estimated = estimateInterSubjectCorrelation(alignedRows, categoryNames, fallback);
    // Blend a little toward prior for stability (never go full data-driven with limited history)
    const blend = Math.min(1, alignedRows.length / 12);
    return estimated * blend + fallback * (1 - blend);
  } catch {
    /* ignore */
    return fallback;
  }
}

export function computeEffectiveSampleSizeFromWeights(weights = []) {
    const clean = Array.isArray(weights) ? weights.map(w => Number(w)).filter(w => Number.isFinite(w) && w > 0) : [];
    if (clean.length === 0) return 0;
    const sumW = kahanSum(clean);
    const sumW2 = kahanSum(clean.map(w => w * w));
    return sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
}

// MELHORIA: Permite a injeção de parâmetros dinâmicos ou cálculo on-the-fly do rho
export function computeWeightedVariance(statsRaw, totalWeight, optionsOrRho = INTER_SUBJECT_CORRELATION) {
    const stats = Array.isArray(statsRaw) ? statsRaw : Object.values(statsRaw || {});
    if (stats.length === 0) return 0;

    let rho = INTER_SUBJECT_CORRELATION;
    let preserveScale = false;

    // Extrai rho dinâmico se um objeto de opções for passado
    if (typeof optionsOrRho === 'object' && optionsOrRho !== null) {
        preserveScale = optionsOrRho.preserveScale || false;
        if (typeof optionsOrRho.rho === 'number') {
            rho = optionsOrRho.rho;
        } else if (optionsOrRho.scoreRows && optionsOrRho.subjectNames) {
            rho = estimateInterSubjectCorrelation(optionsOrRho.scoreRows, optionsOrRho.subjectNames, INTER_SUBJECT_CORRELATION);
        } else if (optionsOrRho.simuladoRows && optionsOrRho.categoryNames) {
            // NEW: Use the full adaptive estimator with blending
            rho = getAdaptiveInterSubjectCorrelation(stats, optionsOrRho.simuladoRows, optionsOrRho.categoryNames, INTER_SUBJECT_CORRELATION);
        }
    } else {
        // Fallback de compatibilidade
        rho = Number.isFinite(optionsOrRho) ? optionsOrRho : INTER_SUBJECT_CORRELATION;
    }

    const toFiniteNonNegative = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : 0;
    };

    const toFiniteSd = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    const calculatedTotalWeight = kahanSum(stats.map(cat => toFiniteNonNegative(cat?.weight)));
    const effectiveTotalWeight = (Number.isFinite(totalWeight) && totalWeight > 0) ? totalWeight : calculatedTotalWeight;

    if (effectiveTotalWeight === 0) return 0;

    // FIX 2: Sincronização do piso com o estimateInterSubjectCorrelation.
    // Permite que o motor explore a variância de disciplinas com correlação inversa.
    // BUG 3.1 FIX: Floor ajustado de -0.15 para 0.0 para garantir Positive Semi-Definiteness (PSD)
    const validRho = Math.max(-0.85, Math.min(0.85, rho));
    const rawWeights = stats.map(cat => toFiniteNonNegative(cat?.weight));
    const adjustedSDs = stats.map(cat => toFiniteSd(cat?.sd));

    const sumRawWeights = kahanSum(rawWeights);
    if (!Number.isFinite(sumRawWeights) || sumRawWeights <= 0) return 0;
    
    // Bug 3.2 Fix: Explosão Dimensional na Variância Ponderada
    // Se preserveScale estivesse ativo, os pesos em bruto (e.g. 100) seriam elevados ao quadrado,
    // explodindo a variância (10,000 * SD^2). Normalizamos sempre internamente para manter 
    // estabilidade nas combinações de SDs independentes e coerentes.
    const normalizedWeights = rawWeights.map(w => w / sumRawWeights);

    const independentVar = kahanSum(normalizedWeights.map((w, i) => Math.pow(w, 2) * Math.pow(adjustedSDs[i], 2)));
    const weightedSumSD = kahanSum(normalizedWeights.map((w, i) => w * adjustedSDs[i]));
    const coherentVar = Math.pow(weightedSumSD, 2);

    let finalVar = (1 - validRho) * independentVar + (validRho * coherentVar);

    // Se preserveScale for pedido, escalonamos a variância final linearmente pelo 
    // peso efetivo, prevenindo o colapso quadrático anterior que quebrava o motor.
    if (preserveScale) {
        finalVar *= effectiveTotalWeight;
    }

    return finalVar;
}

/**
 * Computes the pooled standard deviation across subjects.
 * 
 * NOTA CONCEITUAL: Cuidado com a mistura de unidades aqui!
 * Este Pooled SD reflete a variabilidade estática "entre provas" (disciplinas).
 * Ele NÃO representa a incerteza dinâmica da trajetória temporal (Random Walk/Drift).
 * Usar isto isoladamente para calcular o Margin of Error da Projeção subestima
 * drasticamente o cone de incerteza no longo prazo.
 */
export function computePooledSD(stats, totalWeight, rho = INTER_SUBJECT_CORRELATION) {
    // CORREÇÃO B2: Alinhado o clamp com computeWeightedVariance [0.0, 0.85]
    // O piso 0.0 previne matrizes de covariância não-PSD e falhas de Cholesky
    const validRho = Number.isFinite(rho) ? Math.max(-0.85, Math.min(0.85, rho)) : INTER_SUBJECT_CORRELATION;
    const weightedVariance = computeWeightedVariance(stats, totalWeight, validRho);
    return Math.sqrt(weightedVariance);
}

/**
 * Estimate inter-subject correlation from historical aligned score rows.
 * Uses pairwise Pearson correlations with overlap checks and shrinkage toward fallback.
 *
 * @param {Object[]} scoreRows - Array of date-aligned rows: { [subjectName]: score }
 * @param {string[]} subjectNames - Subject names to include
 * @param {number} fallback - Fallback correlation when data is insufficient
 * @returns {number} Estimated rho in [0,1]
 */
export function estimateInterSubjectCorrelation(
    scoreRows = [],
    subjectNames = [],
    fallback = INTER_SUBJECT_CORRELATION
) {
    const safeScoreRows = Array.isArray(scoreRows) ? scoreRows : Object.values(scoreRows || {});
    if (safeScoreRows.length < 4 || !Array.isArray(subjectNames) || subjectNames.length < 2) {
        return fallback;
    }

    const pairwise = [];
    for (let i = 0; i < subjectNames.length; i++) {
        for (let j = i + 1; j < subjectNames.length; j++) {
            const aName = normalize(subjectNames[i]);
            const bName = normalize(subjectNames[j]);

            const xs = [];
            const ys = [];
            safeScoreRows.forEach(row => {
                const rawX = row?.[aName];
                const x = typeof rawX === 'object' && rawX !== null ? Number(rawX?.score) : Number(rawX);
                const rawY = row?.[bName];
                const y = typeof rawY === 'object' && rawY !== null ? Number(rawY?.score) : Number(rawY);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    xs.push(x);
                    ys.push(y);
                }
            });

            const n = xs.length;
            if (n < 4) continue;

            const meanX = kahanSum(xs) / n;
            const meanY = kahanSum(ys) / n;

            let cov = 0.0, c_cov = 0.0;
            let varX = 0.0, c_x = 0.0;
            let varY = 0.0, c_y = 0.0;

            for (let k = 0; k < n; k++) {
                const dx = xs[k] - meanX;
                const dy = ys[k] - meanY;
                
                const y_cov = (dx * dy) - c_cov;
                const t_cov = cov + y_cov;
                c_cov = (t_cov - cov) - y_cov;
                cov = t_cov;

                const y_x = (dx * dx) - c_x;
                const t_x = varX + y_x;
                c_x = (t_x - varX) - y_x;
                varX = t_x;

                const y_y = (dy * dy) - c_y;
                const t_y = varY + y_y;
                c_y = (t_y - varY) - y_y;
                varY = t_y;
            }

            const epsilon = 1e-15;
            const safeVarX = Math.max(0, varX);
            const safeVarY = Math.max(0, varY);
            const denom = Math.sqrt((safeVarX + epsilon) * (safeVarY + epsilon));
            const corr = cov / denom;

            // Mecanismo de Controlo de Effective Sample Size (ESS) para regular o encolhimento de pares com sobreposição fraca (n < 8)
            const essFloor = 8;
            const pairShrink = n / (n + essFloor);
            const robustCorr = (corr * pairShrink) + (fallback * (1 - pairShrink));

            pairwise.push({ corr: robustCorr, n });
        }
    }

    if (pairwise.length === 0) return fallback;

    // Weight by information size (overlap) and use Fisher Z transformation for averaging
    // Pearson correlations (r) are not additive; averaging them directly biases toward zero.
    let sumZ = 0;
    let sumW = 0;
    pairwise.forEach(p => {
        // Peso informacional assintoticamente ótimo para Fisher Z ~ N(0, 1/(n-3))
        const w = Math.max(1, p.n - 3);
        // Fisher Z transform: Z = 0.5 * ln((1+r)/(1-r))
        // BUGFIX GEMINI: Permitir correlações negativas no cálculo para não inflar a média
        const r = Math.max(-0.999, Math.min(0.999, p.corr));
        const z = 0.5 * Math.log((1 + r) / (1 - r));
        sumZ += z * w;
        sumW += w;
    });

    const avgZ = sumW > 0 ? sumZ / sumW : 0;
    // Inverse Fisher Z: r = (exp(2z) - 1) / (exp(2z) + 1)
    const empirical = (Math.exp(2 * avgZ) - 1) / (Math.exp(2 * avgZ) + 1);

    const overlaps = pairwise.map(p => p.n);
    const avgOverlap = kahanSum(overlaps) / overlaps.length;
    const essPairs = computeEffectiveSampleSizeFromWeights(pairwise.map(p => Math.max(1, p.n - 3)));
    
    // Shrinkage empírico-bayesiano
    const shrink = Math.max(0, Math.min(1, (avgOverlap / (avgOverlap + 10)) * (essPairs / (essPairs + 6))));
    const blended = (shrink * empirical) + ((1 - shrink) * fallback);

    // PATCH (Bug 3.1): Limite inferior blindado (0.0) para garantir estabilidade da Matriz PSD.
    // Impede falhas matemáticas no motor de Monte Carlo por autocorrelação não-definitiva
    // quando o sistema tentar realizar a decomposição de Cholesky N > 7.
    return Math.max(-0.85, Math.min(0.85, blended));
}

/**
 * Get variance breakdown for debugging/auditing
 * 
 * @param {Object[]} stats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @returns {Object} Detailed variance breakdown
 */
export function getVarianceBreakdown(stats, totalWeight) {
    const weightedVariance = computeWeightedVariance(stats, totalWeight);
    const pooledVariance = weightedVariance;
    // SAFETY: computeWeightedVariance may return negative due to floating-point rounding
    // in the cross-term subtraction. Clamp to 0 before sqrt to prevent NaN propagation.
    const pooledSD = Math.sqrt(Math.max(0, pooledVariance));

    return {
        weightedVariance: Number(Number.isFinite(weightedVariance) ? weightedVariance.toFixed(4) : 0),
        timeUncertainty: 0,
        timeVariance: 0,
        pooledVariance: Number(Number.isFinite(pooledVariance) ? pooledVariance.toFixed(4) : 0),
        pooledSD: Number(Number.isFinite(pooledSD) ? pooledSD.toFixed(4) : 0)
    };
}

/**
 * PATCH: Calcula a correlação de Pearson empírica entre duas séries de notas.
 * Emparelha os dados apenas onde o usuário estudou ambas as matérias num intervalo <= 24h.
 */
function calculateDynamicCorrelation(historyA, historyB, fallback = 0.15) {
    const safeHistoryA = toHistoryArray(historyA);
    const safeHistoryB = toHistoryArray(historyB);

    if (!safeHistoryA.length || !safeHistoryB.length) return fallback;

    let pairedCount = 0;

    const getScore = (h) => {
        const s = getSafeScore(h);
        return Number.isFinite(s) ? s : 0;
    };

    const getDateStr = (h) => {
        return getDateKey(h?.date || h?.createdAt);
    };

    const mapA = new Map();

    safeHistoryA.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d) mapA.set(d, getScore(h));
    });

    const xs = [];
    const ys = [];

    safeHistoryB.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d && mapA.has(d)) {
            xs.push(mapA.get(d));
            ys.push(getScore(h));
            pairedCount++;
        }
    });

    if (pairedCount < 5) return fallback;

    const n = pairedCount;
    let meanX = 0;
    let meanY = 0;

    for (let i = 0; i < n; i++) {
        meanX += xs[i];
        meanY += ys[i];
    }

    meanX /= n;
    meanY /= n;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        cov += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
    }

    const safeVarX = Math.max(0, varX);
    const safeVarY = Math.max(0, varY);
    const denominator = Math.sqrt(safeVarX * safeVarY);

    if (!Number.isFinite(denominator) || denominator === 0) return fallback;

    const pearsonR = cov / denominator;

    if (!Number.isFinite(pearsonR)) return fallback;

    return Math.max(-0.3, Math.min(0.8, pearsonR));
}

/**
 * Constrói a Matriz de Covariância completa NxN a partir dos desvios padrão
 * individuais e do fator de correlação (Rho). Necessária para alimentar
 * o Cholesky Decomposition para Monte Carlo multidimensional.
 */
export function buildCovarianceMatrix(stats, rhoMatrix = null, defaultRho = INTER_SUBJECT_CORRELATION, adaptiveContext = null) {
    const n = stats.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    // NEW: Support full adaptive rho from context
    let effectiveDefaultRho = Number.isFinite(defaultRho) ? defaultRho : INTER_SUBJECT_CORRELATION;
    if (adaptiveContext && adaptiveContext.simuladoRows && adaptiveContext.categoryNames) {
      effectiveDefaultRho = getAdaptiveInterSubjectCorrelation(
        stats,
        adaptiveContext.simuladoRows,
        adaptiveContext.categoryNames,
        defaultRho
      );
    }
    
    // FIX 5: Estrutura O(N^2) reduzida via simetria de matriz
    for (let i = 0; i < n; i++) {
        const sdI = Math.max(0, Number.isFinite(stats[i]?.sd) ? Number(stats[i].sd) : 0);
        matrix[i][i] = sdI * sdI; // A variância pura ocupa apenas a diagonal principal

        for (let j = i + 1; j < n; j++) {
            const sdJ = Math.max(0, Number.isFinite(stats[j]?.sd) ? Number(stats[j].sd) : 0);
            
            const rawRhoIJ = (rhoMatrix && rhoMatrix[i] && rhoMatrix[i][j] != null) ? rhoMatrix[i][j] : effectiveDefaultRho;
            const rhoIJ = Math.max(-0.999, Math.min(0.999, Number.isFinite(Number(rawRhoIJ)) ? Number(rawRhoIJ) : effectiveDefaultRho));
            const rhoJI = (rhoMatrix && rhoMatrix[j] && rhoMatrix[j][i] != null) ? rhoMatrix[j][i] : effectiveDefaultRho;
            
            let currentRho = (Number(rhoIJ) + Number(rhoJI)) / 2;
            if (!Number.isFinite(currentRho)) currentRho = effectiveDefaultRho;
            currentRho = Math.max(-0.999, Math.min(0.999, currentRho));

            if (stats[i]?.simuladoStats?.history && stats[j]?.simuladoStats?.history) {
                currentRho = calculateDynamicCorrelation(stats[i].simuladoStats.history, stats[j].simuladoStats.history, currentRho);
            }

            const covariance = currentRho * sdI * sdJ;
            matrix[i][j] = covariance; 
            matrix[j][i] = covariance; // Espelho simétrico, poupa dupla iteração.
        }
    }
    return matrix;
}

export function calcularVariancia(arr) {
    if (!Array.isArray(arr) || arr.length <= 1) return 0;

    // Welford online: estável para magnitudes extremas (evita overflow em v²)
    let count = 0;
    let mean = 0;
    let m2 = 0;
    
    for (let i = 0; i < arr.length; i++) {
        const raw = Number(arr[i]);
        if (!Number.isFinite(raw)) continue;
        
        count += 1;
        const delta = raw - mean;
        mean += delta / count;
        const delta2 = raw - mean;
        m2 += delta * delta2;
    }
    
    const variance = count > 1 ? m2 / (count - 1) : 0;
    return Number.isFinite(variance) ? Math.max(0, variance) : 0;
}

export default {
    computeWeightedVariance,
    computePooledSD,
    getVarianceBreakdown,
    estimateInterSubjectCorrelation,
    computeEffectiveSampleSizeFromWeights,
    calcularVariancia,
    buildCovarianceMatrix
};
```

---

## `src/engine/diagnostics.js` <a id="src-engine-diagnostics-js"></a>

- **Localização:** `src/engine/diagnostics.js`
- **Linhas:** 722
- **Tamanho:** 27.70 KB

```javascript
/**
 * DIAGNOSTICS ENGINE v1.0 — Motor de Diagnóstico Avançado
 * Análises estatísticas avançadas para diagnóstico de performance.
 */

import { getSafeScore } from '../utils/scoreHelper.js';
import { kahanMean, kahanSum } from './math/kahan.js';
import { pruneHistoryForMemory, getSortedHistory } from './stats.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
// ✅ LOTE-03: importar do módulo probabilístico unificado
import { fsrsRetrievability, fsrsIntervalForRetention } from './probabilistic/fsrs.js';

function _getEntryDate(entry) {
  const raw = entry?.date || entry?.createdAt;
  if (!raw) return null;
  const parsed = safeDateParse(raw);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function _normalizeDiagnosticHistory(historyRaw, maxScore = 100) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      const parsedDate = _getEntryDate(entry);
      if (!parsedDate) return null;
      const score = getSafeScore(entry, maxScore);
      if (!Number.isFinite(score)) return null;
      return { ...entry, date: parsedDate.toISOString(), score };
    })
    .filter(Boolean);
}

function _median(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function _mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return kahanMean(arr);
}

function _variance(arr, mu = null) {
  const clean = Array.isArray(arr)
    ? arr.filter(v => Number.isFinite(v))
    : [];

  if (clean.length < 2) return 0;

  const m = Number.isFinite(mu) ? mu : _mean(clean);
  if (!Number.isFinite(m)) return 0;

  const devs = clean.map(v => (v - m) ** 2);
  const sum = kahanSum(devs);
  const variance = sum / (clean.length - 1);

  return Number.isFinite(variance) ? variance : 0;
}

function _std(arr, mu = null) {
  const variance = _variance(arr, mu);
  if (!Number.isFinite(variance)) return 0;
  return Math.sqrt(Math.max(0, variance));
}

export function detectDataAnomalies(historyRaw = [], maxScore = 100) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  const issues = [];
  if (!Array.isArray(history) || history.length === 0) {
    issues.push({ type: 'data', severity: 'info', msg: 'Sem histórico para análise.' });
    return issues;
  }

  const parsed = history.map((h, idx) => {
    const score = getSafeScore(h, maxScore);
    const dateRaw = h?.date || h?.createdAt;
    const d = dateRaw ? new Date(dateRaw) : null;
    const t = d && !isNaN(d.getTime()) ? d.getTime() : null;
    return { ...h, idx, score, date: dateRaw, t, finite: Number.isFinite(score) };
  });

  const finites = parsed.filter(p => p.finite);
  const nFinite = finites.length;

  const invalidRate = history.length > 0 ? (history.length - nFinite) / history.length : 0;
  if (invalidRate > 0.2) {
    issues.push({ type: 'data', severity: 'warning', msg: `${Math.round(invalidRate * 100)}% dos registros têm score inválido/NaN.`, count: history.length - nFinite });
  }

  const uniqueScores = new Set(finites.map(p => p.score));
  if (nFinite >= 3 && uniqueScores.size === 1) {
    issues.push({ type: 'data', severity: 'warning', msg: 'Todos os scores são idênticos — variância zero. Adicione variedade ou verifique input.', count: nFinite });
  }

  const dateMap = new Map();
  finites.forEach(p => {
    const rawDate = p.date || p.createdAt;
    if (!rawDate) return;
    
    // Simplification for groupKey to avoid importing getDateKey if missing
    const dayKey = typeof rawDate === 'string' ? rawDate.split('T')[0] : String(rawDate);
    if (!dayKey) return;
  
    const groupKey = [
      dayKey,
      p.categoryId || p.subject || 'geral',
      p.id || p.simuladoId || 'sem-id',
    ].join('|');
  
    if (!dateMap.has(groupKey)) dateMap.set(groupKey, []);
    dateMap.get(groupKey).push(p.score);
  });
  
  for (const [key, scores] of dateMap) {
    const uniq = new Set(scores);
  
    if (uniq.size > 1) {
      issues.push({
        type: 'data',
        severity: 'warning',
        msg: `Registro duplicado/conflitante detectado (${key}): ${[...uniq].join(', ')}.`,
      });
    }
  }

  const times = finites.map(p => p.t).filter(t => t != null);
  if (times.length >= 2) {
    let unsortedGaps = 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] < times[i - 1]) unsortedGaps++;
    }
    if (unsortedGaps > 0) {
      issues.push({ type: 'data', severity: 'info', msg: `${unsortedGaps} registros fora de ordem cronológica.`, count: unsortedGaps });
    }
  }

  const future = finites.filter(p => p.t && p.t > Date.now() + 86400000 * 2).length;
  if (future > 0) issues.push({ type: 'data', severity: 'warning', msg: `${future} registros com data futura.`, count: future });

  if (nFinite >= 6) {
    const vals = finites.map(p => p.score);
    const med = _median(vals);
    const devs = vals.map(v => Math.abs(v - med));
    const mad = _median(devs) || 1e-9;
    const threshold = 3.5;
    let outliers = 0;
    for (const v of vals) {
      const mz = 0.6745 * Math.abs(v - med) / mad;
      if (mz > threshold) outliers++;
    }
    if (outliers >= 2) {
      issues.push({ type: 'data', severity: 'info', msg: `${outliers} possíveis outliers detectados.`, count: outliers });
    }
  }

  if (issues.length === 0) issues.push({ type: 'data', severity: 'ok', msg: 'Dados parecem limpos.' });

  return issues;
}

function _interSessionGaps(historyRaw) {
  const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
  if (!Array.isArray(history) || history.length < 2) return [];
  const times = history
    .map((h) => { const d = _getEntryDate(h); return d ? d.getTime() : null; })
    .filter((t) => t !== null && Number.isFinite(t))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < times.length; i++) {
    const diffDays = (times[i] - times[i - 1]) / 86400000;
    if (diffDays > 0) gaps.push(diffDays);
  }
  return gaps;
}

export function computeHurstExponent(scores) {
  const fallback = { H: 0.5, confidence: 'low', interpretation: 'Dados insuficientes', rSquared: 0 };
  if (!Array.isArray(scores)) return fallback;

  const clean = scores.map(Number).filter(Number.isFinite);
  if (clean.length < 10) return fallback;

  const minLag = 2;
  const maxLag = Math.floor(clean.length / 2);
  if (maxLag < minLag) return fallback;

  const logRS = [];
  const logN = [];

  for (let tau = minLag; tau <= maxLag; tau = Math.ceil(tau * 1.4)) {
    const nBlocks = Math.floor(clean.length / tau);
    if (nBlocks < 2) break;

    let rsSum = 0;
    let validBlocks = 0;

    for (let b = 0; b < nBlocks; b++) {
      const block = clean.slice(b * tau, (b + 1) * tau);
      if (block.length < 2) continue;

      const mu = _mean(block);
      let accum = 0;
      let maxAccum = -Infinity;
      let minAccum = Infinity;
      for (const v of block) {
        accum += v - mu;
        if (accum > maxAccum) maxAccum = accum;
        if (accum < minAccum) minAccum = accum;
      }

      const range = maxAccum - minAccum;
      const sigma = _std(block, mu);

      if (sigma > 1e-9) {
        rsSum += range / sigma;
        validBlocks++;
      }
    }

    if (validBlocks > 0) {
      logRS.push(Math.log(rsSum / validBlocks));
      logN.push(Math.log(tau));
    }
  }

  if (logRS.length < 3) return fallback;

  const cleanPairs = logN.map((x, i) => ({ x, y: logRS[i] }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (cleanPairs.length < 3) return fallback;

  const muX = _mean(cleanPairs.map(p => p.x));
  const muY = _mean(cleanPairs.map(p => p.y));

  const Sxy = kahanSum(cleanPairs.map(p => (p.x - muX) * (p.y - muY)));
  const Sxx = kahanSum(cleanPairs.map(p => (p.x - muX) ** 2));

  const H = Sxx > 1e-10 ? Sxy / Sxx : 0.5;
  const clampedH = Math.max(0.1, Math.min(0.9, H));

  let interpretation = 'Passeio Aleatório (Random Walk)';
  if (clampedH > 0.65) interpretation = 'Série Persistente (Tendência Robusta)';
  else if (clampedH < 0.4) interpretation = 'Reversão à Média (Alta Instabilidade / Efeito Ioiô)';

  const SSR = kahanSum(cleanPairs.map((p) => (p.y - (muY + H * (p.x - muX))) ** 2));
  const SST = kahanSum(cleanPairs.map((p) => (p.y - muY) ** 2));
  const rSquared = SST > 0 ? 1 - (SSR / SST) : 0;

  return {
    H: Number(clampedH.toFixed(3)),
    rSquared: Number(rSquared.toFixed(3)),
    confidence: rSquared > 0.7 && logRS.length >= 5 ? 'high' : rSquared > 0.4 ? 'medium' : 'low',
    interpretation
  };
}

export function generateMathDiagnostic(history, maxScore = 100) {
  const scores = history.map(h => getSafeScore(h, maxScore));
  const hurst = computeHurstExponent(scores);

  const optimalLambda = hurst.H < 0.45 ? 0.12 : hurst.H > 0.65 ? 0.04 : 0.08;

  return {
    profile: hurst.interpretation,
    momentumHurst: hurst.H,
    recommendedLambda: optimalLambda,
    isDataNoisy: hurst.H < 0.5 && hurst.confidence !== 'low',
    hurstData: hurst
  };
}

export function computeKLDivergenceNormal(mu1, sd1, mu2, sd2) {
  const s1 = Math.max(1e-15, Number(sd1) || 1e-15);
  const s2 = Math.max(1e-15, Number(sd2) || 1e-15);
  const m1 = Number(mu1) || 0;
  const m2 = Number(mu2) || 0;

  const kl = Math.log(s2 / s1) + (s1 * s1 + (m1 - m2) ** 2) / (2 * s2 * s2) - 0.5;
  const safekl = Math.max(0, kl);

  let interpretation;
  if (safekl < 0.1) interpretation = 'Performance muito próxima do alvo.';
  else if (safekl < 0.5) interpretation = 'Distância moderada da distribuição alvo.';
  else if (safekl < 2.0) interpretation = 'Lacuna significativa em relação ao alvo.';
  else interpretation = 'Distribuição muito afastada do alvo — foco intenso necessário.';

  return { kl: Number(safekl.toFixed(4)), interpretation };
}

// ✅ LOTE-03: wrapper para compatibilidade com código existente.
// Delega para fsrsRetrievability, que é a mesma fórmula (1+t/9S)^-1,
// mas sem o clamp inferior de 0.1 que a versão antiga aplicava.
export function computeEbbinghausRetention(daysSince, stabilityDays) {
    return fsrsRetrievability(daysSince, stabilityDays);
}

export function estimateMemoryStability(history, maxScore = 100, baselineScore = null) {
  const normalized = _normalizeDiagnosticHistory(history, maxScore);
  if (normalized.length === 0) return 3;

  const sorted = getSortedHistory(normalized);
  let stability = 3.0;

  const safeBaseline = baselineScore !== null ? baselineScore : _mean(sorted.map(h => getSafeScore(h, maxScore)));
  const dynamicSuccessThreshold = Math.min(0.7, Math.max(0.5, safeBaseline / maxScore));

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    const pct = Math.min(1, Math.max(0, getSafeScore(h, maxScore) / maxScore));

    let currentRetention = 1.0;
    if (i > 0) {
      const gap = (_getEntryDate(h).getTime() - _getEntryDate(sorted[i - 1]).getTime()) / 86400000;
      // ✅ LOTE-03: usar fsrsRetrievability em vez de computeEbbinghausRetention
      currentRetention = fsrsRetrievability(gap, stability);

      if (gap > 0.1) {
        if (pct >= dynamicSuccessThreshold) {
          const elasticGrowth = 1 + 2 * Math.pow(1 - currentRetention, 2);
          stability *= elasticGrowth;
        } else {
          const dynamicDecay = Math.max(0.3, 1.0 - (0.6 * currentRetention));
          stability *= dynamicDecay;
          stability = Math.max(1, stability);
        }
      }
    }
    stability = Math.min(180, Math.max(1, stability));
  }
  return Number(stability.toFixed(1));
}

export function computeOptimalReviewInterval(stability, targetRetention = 0.7, mssdVolatility = null, effectiveN = null, maxScore = 100, currentMean = null, agilityPenalty = 0) {
  const S = Math.max(0.5, Number(stability) || 7);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  let baseInterval = Math.max(1, 9 * S * ((1 / R) - 1));

  if (mssdVolatility != null && effectiveN != null && !Number.isNaN(Number(mssdVolatility))) {
    const rmssd = Math.sqrt(Number(mssdVolatility));
    const normalizedMssd = rmssd / maxScore;

    const fragilityPenalty = Math.max(0.4, 1 - (normalizedMssd * 3));

    let crystallizationBonus = 1.0;
    if (effectiveN >= 3 && normalizedMssd < 0.08) {
      const confidence = Math.min(1, effectiveN / 15);
      const stabilityBonus = Math.max(0, 0.08 - normalizedMssd) * 12;
      const performanceFactor = currentMean !== null ? Math.max(0, (currentMean / maxScore) - 0.5) * 2.5 : 1;
      crystallizationBonus = 1 + (confidence * stabilityBonus * performanceFactor);
    }
    baseInterval = baseInterval * fragilityPenalty * crystallizationBonus;
  }

  const safeAgilityPenalty = Math.max(0, Math.min(0.4, Number(agilityPenalty) || 0));
  baseInterval = baseInterval * (1 - safeAgilityPenalty);

  return Math.max(1, Math.round(baseInterval));
}

export function computeForgettingRisk(history, maxScore = 100, baselineScore = null, mssdVolatility = null, effectiveN = null, daysSinceOverride = null, agilityPenalty = 0) {
  const noData = { risk: 'low', retentionPct: 100, stabilityDays: 3, optimalIntervalDays: 3, daysSinceLast: 0 };
  const normalized = _normalizeDiagnosticHistory(history, maxScore);
  if (normalized.length === 0) return noData;

  const sorted = [...getSortedHistory(normalized)].filter(h => h != null && typeof h === 'object').reverse();

  const daysSinceLast = daysSinceOverride !== null ? daysSinceOverride : Math.max(0, (Date.now() - _getEntryDate(sorted[0]).getTime()) / 86400000);
  const stability = estimateMemoryStability([...sorted].reverse(), maxScore, baselineScore);
  // ✅ LOTE-03: usar fsrsRetrievability em vez de computeEbbinghausRetention
  const retention = fsrsRetrievability(daysSinceLast, stability);
  const retentionPct = Number((retention * 100).toFixed(1));

  const currentMean = _mean(sorted.map(h => getSafeScore(h, maxScore)));

  // ✅ LOTE-03: usar fsrsIntervalForRetention em vez de computeOptimalReviewInterval
  const optimalIntervalDays = fsrsIntervalForRetention(stability, 0.7);

  let risk;
  if (retentionPct < 30) risk = 'critical';
  else if (retentionPct < 55) risk = 'high';
  else if (retentionPct < 75 && daysSinceLast >= optimalIntervalDays * 0.8) risk = 'medium';
  else risk = 'low';

  return { risk, retentionPct, stabilityDays: stability, optimalIntervalDays, daysSinceLast: Number(daysSinceLast.toFixed(1)) };
}

export function computeLearningVelocity(history, maxScore = 100) {
  const fallback = { velocity: 0, velocityLabel: 'Dados insuficientes', plateau: maxScore * 0.7, timeToPlateauDays: null };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const validHistory = history.filter(h => _getEntryDate(h) !== null);
  const sorted = getSortedHistory(validHistory);
  if (sorted.length < 4) return fallback;

  const t0 = _getEntryDate(sorted[0]).getTime();
  const data = sorted.map((h, idx) => ({
    t: Math.max(0.001 * idx, (_getEntryDate(h).getTime() - t0) / 86400000),
    y: Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore))),
  })).filter(d => Number.isFinite(d.y));

  const lastThree = data.slice(-3).map((d) => d.y);
  const plateauEst = Math.min(maxScore, Math.max(maxScore * 0.5, Math.max(...lastThree) * 1.1));

  const linearPts = data.filter((d) => d.y < plateauEst * 0.98 && d.y > 0);
  if (linearPts.length < 3) return { ...fallback, plateau: plateauEst };

  const ys = linearPts.map((d) => Math.log(Math.max(1e-6, 1 - d.y / plateauEst)));
  const ts = linearPts.map((d) => d.t);

  const Sty = kahanSum(ts.map((t, i) => t * ys[i]));
  const Stt = kahanSum(ts.map((t) => t * t));
  const k = Stt > 1e-15 ? Math.max(1e-4, -Sty / Stt) : 1e-3;

  const tNow = data[data.length - 1].t;
  const velocity = plateauEst * k * Math.exp(-k * tNow);

  const timeToPlateauDays = tNow < 1 ? null : Math.max(0, Math.round(Math.log(0.1) / -k) - tNow);

  let velocityLabel;
  const vPerMonth = velocity * 30;

  const currentScore = data[data.length - 1].y;
  const roomToGrow = Math.max(1, plateauEst - currentScore);
  const relativeVelocity = vPerMonth / roomToGrow;

  if (relativeVelocity > 0.15) velocityLabel = `Acelerado (Alta Tração Logística)`;
  else if (relativeVelocity > 0.05) velocityLabel = `Constante (Fechando lacunas ativamente)`;
  else if (relativeVelocity > 0.01) velocityLabel = `Lento (Requer revisão de método)`;
  else velocityLabel = 'Platô atingido / Estagnado';

  return {
    velocity: Number(velocity.toFixed(4)),
    velocityLabel,
    plateau: Number(plateauEst.toFixed(1)),
    timeToPlateauDays: timeToPlateauDays !== null ? Math.min(999, timeToPlateauDays) : null,
  };
}

export function computeConsistencyIndex(history, maxScore = 100) {
  const fallback = { index: 0.5, label: 'Dados insuficientes' };
  if (!Array.isArray(history) || history.length < 4) return fallback;

  const sorted = getSortedHistory(history);

  if (sorted.length < 4) return fallback;

  const scores = sorted.map((h) => Math.max(0, Math.min(maxScore, getSafeScore(h, maxScore)))).filter(Number.isFinite);
  if (scores.length < 4) return fallback;
  const mu = _mean(scores);

  const med = _median(scores);
  const mad = _median(scores.map((s) => Math.abs(s - med)));
  const robustSD = 1.4826 * mad;

  const referenceScale = Math.max(1, mu);
  const cv = robustSD / referenceScale;

  const index = Math.max(0, 1 - Math.tanh(cv * 1.5));

  let label;
  if (index >= 0.8) label = 'Muito consistente';
  else if (index >= 0.6) label = 'Consistente';
  else if (index >= 0.4) label = 'Moderadamente instável';
  else if (index >= 0.2) label = 'Instável';
  else label = 'Muito errático';

  return { index: Number(index.toFixed(3)), label };
}

export function computeStudyEfficiency(studySessions, simulados, maxScore = 100, categoryId = null, normalizeSubject = null) {
  const _noData = { efficiency: 0, questionsPerHour: 0, accuracyRate: 0, totalMinutes: 0, totalQuestions: 0, label: 'Sem dados' };

  const sessions = (studySessions || []).filter((s) => !categoryId || s?.categoryId === categoryId);
  const totalMinutes = sessions.reduce((acc, s) => acc + (Number(s?.duration) || 0), 0);

  const _normalize = typeof normalizeSubject === 'function'
    ? normalizeSubject
    : (value) => String(value || '').toLowerCase().trim();

  const relevantSims = categoryId
    ? (simulados || []).filter((s) => s?.categoryId === categoryId)
    : (simulados || []);

  const totalQuestions = relevantSims.reduce((acc, s) => acc + (Number(s?.total) || 0), 0);
  const totalCorrect = relevantSims.reduce((acc, s) => {
    const total = Number(s?.total) || 0;
    if (total === 0) return acc;
    if (s?.correct != null) {
      const correctNum = Number(s.correct);
      if (Number.isFinite(correctNum)) return acc + correctNum;
    }
    const score = Math.min(1, Math.max(0, (Number(s?.score) || 0) / maxScore));
    return acc + score * total;
  }, 0);

  const totalHours = totalMinutes / 60;
  const questionsPerHour = totalHours > 0 ? totalQuestions / totalHours : 0;
  const accuracyRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  const efficiency = questionsPerHour * accuracyRate;

  const historicalPace = 15;
  const efficiencyRatio = questionsPerHour / Math.max(1, historicalPace);

  let label;
  if (questionsPerHour === 0) label = 'Sem questões registradas';
  else if (efficiencyRatio >= 1.3 && accuracyRate >= 0.7) label = 'Alta Performance (Acima do seu normal)';
  else if (efficiencyRatio >= 0.8 && accuracyRate >= 0.6) label = 'Ritmo Sólido';
  else if (questionsPerHour < (historicalPace * 0.5)) label = 'Fricção Detectada (Muito tempo, pouco processamento)';
  else label = 'Acurácia precisa melhorar';

  return {
    efficiency: Number(efficiency.toFixed(2)),
    questionsPerHour: Number(questionsPerHour.toFixed(1)),
    accuracyRate: Number(accuracyRate.toFixed(3)),
    totalMinutes: Number(totalMinutes.toFixed(0)),
    totalQuestions,
    label,
  };
}

export function computeAdaptiveLambda(history) {
  const DEFAULT_LAMBDA = 0.08;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_LAMBDA;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_LAMBDA;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(0.5, Math.min(90, medianGap));
  const lambda = 0.03 + 0.08 * Math.exp(-safeMedian / 10);

  return Number(Math.max(0.03, Math.min(0.12, lambda)).toFixed(4));
}

export function computeAdaptiveDecayFactor(history) {
  const DEFAULT_DECAY = 0.985;
  if (!Array.isArray(history) || history.length < 3) return DEFAULT_DECAY;

  const gaps = _interSessionGaps(history);
  if (gaps.length === 0) return DEFAULT_DECAY;

  const medianGap = _median(gaps);
  const safeMedian = Math.max(1, Math.min(90, medianGap));

  const halfLife = Math.max(7, safeMedian * 2);
  const decayFactor = Math.pow(0.5, 1 / halfLife);

  return Number(Math.max(0.906, Math.min(0.995, decayFactor)).toFixed(5));
}

export function computeAR1Coefficient(residuals) {
  if (!Array.isArray(residuals) || residuals.length < 5) return { rho: 0, significant: false };

  const clean = residuals.map(Number).filter(Number.isFinite);
  if (clean.length < 5) return { rho: 0, significant: false };

  const mu = _mean(clean);
  const centered = clean.map((r) => r - mu);

  const n = centered.length;
  const lag1 = centered.slice(1);
  const lag0 = centered.slice(0, n - 1);

  const numerator = lag0.reduce((s, v, i) => s + v * lag1[i], 0);
  const denom0 = lag0.reduce((s, v) => s + v * v, 0);
  const rho = denom0 > 1e-10 ? numerator / denom0 : 0;
  const clampedRho = Math.max(-1, Math.min(1, rho));

  const bartlettThreshold = 1.96 / Math.sqrt(Math.max(1, n));

  return {
    rho: Number(clampedRho.toFixed(3)),
    significant: Math.abs(clampedRho) > bartlettThreshold
  };
}

export function computeCategoryCorrelation(categoryHistories, maxScore = 100) {
  if (!categoryHistories || typeof categoryHistories !== 'object') return [];

  const ids = Object.keys(categoryHistories);
  if (ids.length < 2) return [];

  const monthly = {};
  for (const id of ids) {
    const hist = categoryHistories[id] || [];
    const byMonth = {};
    for (const h of hist) {
      const rawDate = h?.date || h?.createdAt;
      if (!rawDate) continue;
      const fullKey = getDateKey(rawDate);
      if (!fullKey) continue;
      const key = fullKey.slice(0, 7);

      const s = getSafeScore(h, maxScore) / maxScore;

      if (Number.isFinite(s)) {
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(s);
      }
    }
    monthly[id] = Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, _mean(v)]));
  }

  const result = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = monthly[ids[i]];
      const b = monthly[ids[j]];

      const keys = Object.keys(a).filter((k) => k in b);
      if (keys.length < 4) continue;

      const xs = keys.map((k) => a[k]);
      const ys = keys.map((k) => b[k]);

      const muX = _mean(xs);
      const muY = _mean(ys);
      const Sxy = kahanSum(xs.map((x, k) => (x - muX) * (ys[k] - muY)));
      const Sxx = kahanSum(xs.map((x) => (x - muX) ** 2));
      const Syy = kahanSum(ys.map((y) => (y - muY) ** 2));
      const epsilon = 1e-15;
      const denom = Math.sqrt((Math.max(0, Sxx) + epsilon) * (Math.max(0, Syy) + epsilon));
      const r = Sxy / denom;
      const clampedR = Math.max(-1, Math.min(1, r));

      let strength;
      const absR = Math.abs(clampedR);
      if (absR >= 0.7) strength = 'forte';
      else if (absR >= 0.4) strength = 'moderada';
      else if (absR >= 0.2) strength = 'fraca';
      else strength = 'negligível';

      result.push({ catA: ids[i], catB: ids[j], correlation: Number(clampedR.toFixed(3)), strength, commonMonths: keys.length });
    }
  }

  return result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

export function computeCategoryDiagnostics({
  history = [],
  studySessions = [],
  simulados = [],
  maxScore = 100,
  categoryId = null,
  targetScore = null,
  bayesianStats = null,
  normalizeSubject = null,
} = {}) {

  const histArray = Array.isArray(history) ? history : Object.values(history || {});
  const safeHistory = histArray.length > 2500 ? pruneHistoryForMemory(histArray, 1500) : histArray;

  const _scores = safeHistory
    .map((h) => getSafeScore(h, maxScore))
    .filter(Number.isFinite);

  const diagnostic = generateMathDiagnostic(safeHistory, maxScore);
  const hurst = diagnostic.hurstData;
  const forgetting = computeForgettingRisk(safeHistory, maxScore, null, diagnostic?.mssd, safeHistory.length);
  const consistency = computeConsistencyIndex(safeHistory, maxScore);
  const velocity = computeLearningVelocity(safeHistory, maxScore);

  let klToTarget = null;
  if (bayesianStats && targetScore !== null) {
    const targetMu = Number(targetScore);
    const targetSd = maxScore * 0.05;
    klToTarget = computeKLDivergenceNormal(
      bayesianStats.mean ?? 0,
      bayesianStats.sd ?? maxScore * 0.1,
      targetMu,
      targetSd,
    );
  }

  const efficiency = computeStudyEfficiency(
    studySessions.filter((s) => !categoryId || s?.categoryId === categoryId),
    simulados,
    maxScore,
    categoryId,
    normalizeSubject,
  );

  const dataAnomalies = detectDataAnomalies(safeHistory, maxScore);
  const dataErrorCount = dataAnomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;

  const flags = [];
  if (forgetting.risk === 'critical') flags.push({ type: 'danger', msg: `Retenção crítica: ~${forgetting.retentionPct}% — revise imediatamente (${forgetting.daysSinceLast.toFixed(0)} dias sem estudar).` });
  if (forgetting.risk === 'high') flags.push({ type: 'warning', msg: `Risco de esquecimento alto: retenção ~${forgetting.retentionPct}%. Revisão urgente.` });
  if (consistency.index < 0.35) flags.push({ type: 'warning', msg: `Performance muito errática (índice ${consistency.index.toFixed(2)}). Consolide a base antes de avançar.` });
  if (hurst.H > 0.65 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Tendência persistente detectada (H=${hurst.H}). Mantenha o momentum atual.` });
  if (hurst.H < 0.35 && hurst.confidence !== 'low') flags.push({ type: 'info', msg: `Reversão à média detectada (H=${hurst.H}). Após uma boa nota, prepare-se para oscilação.` });
  if (velocity.velocityLabel?.includes('Estagnado')) flags.push({ type: 'warning', msg: 'Platô de aprendizagem detectado. Mude a estratégia de estudo.' });
  if (efficiency.questionsPerHour < 5 && efficiency.totalMinutes > 60) flags.push({ type: 'warning', msg: `Volume baixo de questões (${efficiency.questionsPerHour.toFixed(1)}/h). Priorize exercícios práticos.` });

  dataAnomalies.forEach(a => {
    if (a.severity === 'error') flags.push({ type: 'danger', msg: a.msg });
    else if (a.severity === 'warning') flags.push({ type: 'warning', msg: a.msg });
    else if (a.severity === 'info' && dataErrorCount > 0) flags.push({ type: 'info', msg: a.msg });
  });

  return {
    hurst,
    diagnostic,
    forgetting,
    consistency,
    velocity,
    klToTarget,
    efficiency,
    flags,
    dataAnomalies,
    dataQualityScore: Math.max(0, 1 - Math.min(1, dataErrorCount / 4)),
    adaptiveLambda: diagnostic.recommendedLambda,
    adaptiveDecayFactor: computeAdaptiveDecayFactor(safeHistory),
  };
}
```

---

## `src/engine/insightGenerator.js` <a id="src-engine-insightgenerator-js"></a>

- **Localização:** `src/engine/insightGenerator.js`
- **Linhas:** 343
- **Tamanho:** 17.68 KB

```javascript
import { normalizeDate, toDateMs } from "../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper";
import { pointsToRatio } from "../utils/scoreHelper.conversions";

const toHistoryArray = (history) => {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
};

const safeFinite = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const sortByValidDate = (history) => {
    return toHistoryArray(history)
        .filter(h => Number.isFinite(normalizeDate(h?.date)?.getTime()))
        .sort((a, b) => {
            const ta = normalizeDate(a?.date)?.getTime() ?? 0;
            const tb = normalizeDate(b?.date)?.getTime() ?? 0;
            return ta - tb;
        });
};

export function generateEvolutionInsights({
    timeline,
    focusCategory,
    activeEngine,
    categories,
    unit = '%',
    maxScore = 100,
    minScore = 0
}) {
    const defaultTitle = "Análise do Sistema";

    if (!timeline?.length) {
        return {
            type: 'info', icon: "📊", title: defaultTitle,
            text: "Ainda não existem dados suficientes.",
            details: "Continue realizando simulados para desbloquear insights avançados."
        };
    }

    if (!focusCategory) {
        switch (activeEngine) {
            case "raw_weekly":
                return { type: 'info', icon: "📅", title: "Visão Global: Mapa de Calor", text: "Análise da sua frequência e eficiência geral.", details: "Selecione uma disciplina acima para uma análise profunda." };
            case "raw":
                return { type: 'info', icon: "📊", title: "Visão Global: Resultados Brutos", text: "Visão geral da sua volatilidade diária.", details: "Selecione uma disciplina acima para analisar a estabilidade." };
            case "bayesian":
                return { type: 'info', icon: "🧠", title: "Visão Global: Nível Bayesiano", text: "Domínio probabilístico estimado de todas as matérias.", details: "Selecione uma disciplina acima para ver o intervalo de confiança." };
            case "stats":
                return { type: 'info', icon: "📐", title: "Visão Global: Média Histórica", text: "Desempenho acumulado em todas as frentes.", details: "Selecione uma disciplina acima para ver a média específica." };
            case "compare":
                return { type: 'info', icon: "⚡", title: "Visão Global: Projeção Monte Carlo", text: "Visão probabilística global do seu futuro.", details: "Selecione uma disciplina acima para descobrir o que está segurando sua nota." };
            case "subtopics":
                return { type: 'info', icon: "🔬", title: "Visão Global: Auditoria de Assuntos", text: "Mapeamento completo de todos os seus subtópicos.", details: "Selecione uma disciplina acima para auditar pontos fracos." };
            case "mc_density":
                return { type: 'info', icon: "📉", title: "Visão Global: Densidade MC", text: "Acompanhamento global das suas projeções no tempo.", details: "Selecione uma disciplina acima para ver convergência específica." };
            case "time_spent":
                return { type: 'info', icon: "⏳", title: "Visão Global: Agilidade AI", text: "Visão geral da sua velocidade de resolução.", details: "Selecione uma disciplina acima para mapear gargalos de tempo específicos." };
            case "weekly_diff":
                return { type: 'info', icon: "📆", title: "Visão Global: Acelerômetro Semanal", text: "Balanço geral de ganhos e perdas na semana.", details: "Selecione uma disciplina acima para focar no esforço semanal." };
            case "today_vs_general":
                return { type: 'info', icon: "⚖️", title: "Visão Global: Hoje vs Geral", text: "Comparativo do seu dia contra a média histórica geral.", details: "Selecione uma disciplina acima para um comparativo específico." };
            default:
                return {
                    type: 'info', icon: "📊", title: "Visão Global",
                    text: "Selecione uma disciplina acima para insights detalhados.",
                    details: "A inteligência artificial analisa cada disciplina individualmente para gerar conselhos."
                };
        }
    }

    const lastPoint = timeline[timeline.length - 1];
    const getLastValid = (key) => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            if (timeline[i][key] != null) return timeline[i][key];
        }
        return null;
    };

    const raw = getLastValid(`raw_${focusCategory.id}`);
    const bayesian = getLastValid(`bay_${focusCategory.id}`);
    // ✅ BUG-4 FIX: Não reatribuir o parâmetro; criar variável local sanitizada
    const safeMaxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const safeMinScore = safeFinite(minScore, 0);
    // ✅ BUG-4 FIX: scale usa a amplitude real (maxScore - minScore) em vez de maxScore sozinho
    const scale = Math.max(0.01, (safeMaxScore - safeMinScore) / 100);

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const DAY_NAMES_PLURAL = ['domingos', 'segundas-feiras', 'terças-feiras', 'quartas-feiras', 'quintas-feiras', 'sextas-feiras', 'sábados'];
        const dayStats = {};
        const now = new Date();
        
        const safeCategories = Array.isArray(categories)
            ? categories.filter(Boolean)
            : Object.values(categories || {}).filter(Boolean);

        safeCategories.forEach(cat => {
            const history = toHistoryArray(cat.simuladoStats?.history);

            const rawHistory = history
                .filter(h => {
                    const d = normalizeDate(h?.date);
                    return d && Number.isFinite(d.getTime()) && d.getTime() <= now.getTime();
                })
                .map(h => ({ ...h, score: getSafeScore(h, safeMaxScore) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const d = normalizeDate(h.date);
                if (!d || !Number.isFinite(d.getTime())) return;

                const dow = d.getDay();
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };

                let tot = Number(h.total);
                if (!Number.isFinite(tot) || tot <= 0) {
                    tot = getSyntheticTotal(safeMaxScore);
                }

                if (!Number.isFinite(tot) || tot <= 0) return;

                dayStats[dow].correct += (pointsToRatio(h.score, safeMaxScore, safeMinScore) * tot);
                dayStats[dow].total += tot;
            });
        });

        const dayEntries = Object.entries(dayStats)
            .filter(([, s]) => s.total >= 5)
            .map(([dow, s]) => ({ dow: Number(dow), pct: (s.correct / s.total) * 100, total: s.total }))
            .sort((a, b) => b.pct - a.pct);

        if (dayEntries.length >= 2) {
            const best = dayEntries[0];
            const worst = dayEntries[dayEntries.length - 1];
            return {
                type: 'success', icon: "📅", title: "Padrão Semanal de Rendimento",
                text: `Seu rendimento de pico ocorre aos **${DAY_NAMES_PLURAL[best.dow]}**.`,
                details: `++Melhor dia: **${DAY_NAMES_SINGULAR[best.dow]}** (${best.pct.toFixed(1)}%, ${best.total}q).++ !!Pior: ${DAY_NAMES_SINGULAR[worst.dow]} (${worst.pct.toFixed(1)}%).!!`,
                advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho ++acima da meta++, !!vermelhas!! indicam necessidade de atenção."
        };
    }

    // Lógica de Alertas de Burnout de Alta Prioridade
    const safeRaw = safeFinite(raw, NaN);
    const safeBayesianFallback = safeFinite(bayesian, NaN);

    if (Number.isFinite(safeRaw) && Number.isFinite(safeBayesianFallback)) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const history = toHistoryArray(focusCategory.simuladoStats?.history);

        const recentVolumeAlert = history
            .filter(h => {
                const d = toDateMs(h?.date);
                return Number.isFinite(d) && (nowMs - d) >= -86400000 && (nowMs - d) <= sevenDaysMs;
            })
            .reduce((sum, h) => {
                const parsedTotal = parseInt(h?.total, 10);
                const fallbackTotal = h?.score != null ? getSyntheticTotal(maxScore) : 0;
                const safeTotal = Number.isFinite(parsedTotal) && parsedTotal > 0
                    ? parsedTotal
                    : fallbackTotal;

                return sum + Math.max(0, safeFinite(safeTotal, 0));
            }, 0);

        if (recentVolumeAlert > 40 && safeRaw < safeBayesianFallback - 10 * scale) {
            return {
                type: 'danger',
                icon: "🚨",
                title: "!!Alerta de Burnout!!",
                text: `Volume alto (${recentVolumeAlert}q em 7 dias), com nota em !!queda!!.`,
                details: `Nota recente (${safeRaw.toFixed(1)}${unit}) está abaixo do seu nível bayesiano (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "Dê um passo atrás, reduza o volume de simulados e recupere o foco."
            };
        }

        if (safeRaw > safeBayesianFallback + 8 * scale) {
            return {
                type: 'success',
                icon: "💡",
                title: "++Conhecimento Consolidado++",
                text: `Desempenho recente (${safeRaw.toFixed(1)}${unit}) ++muito acima da média++.`,
                details: `Superando o nível bayesiano projetado (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "O conhecimento assentou de vez. Pronto para aumentar a dificuldade."
            };
        }
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const history = sortByValidDate(focusCategory.simuladoStats?.history);
        const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        
        // CORREÇÃO M4: Guarda contra array vazio (Math.max(...[]) = -Infinity → crash)
        if (recentScores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };
        
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);

        if (maxSwing > 25 * scale) return { type: 'warning', icon: "⚠️", title: "!!Alta Volatilidade Detectada!!", text: `!!Variação de ${maxSwing.toFixed(0)}${unit}.!!`, advice: "Oscilações altas indicam !!'chute'!! ou !!gaps de base!!." };
        if (maxSwing < 8 * scale) return { type: 'success', icon: "✅", title: "++Consistência Sólida++", text: `++Variação mínima de ${maxSwing.toFixed(0)}${unit}.++`, advice: "Pronto para subir a dificuldade." };
        
        return { type: 'info', icon: "📊", title: "Desempenho Estável", text: `Oscilação de ${maxSwing.toFixed(0)}${unit}.` };
    }

    // Lógica do Motor Bayesiano
    if (activeEngine === "bayesian") {
        const safeBayesian = safeFinite(bayesian, NaN);
        if (!Number.isFinite(safeBayesian)) {
            return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
        }

        const ciLow = safeFinite(lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? Math.abs(ciHigh - ciLow) : null;

        if (ciWidth != null && ciWidth < 5 * scale) return { type: 'success', icon: "🎯", title: "++Alta Precisão Bayesiana++", text: `Seu nível real é ${safeBayesian.toFixed(1)}${unit}.`, advice: "++Convergência máxima++ do algoritmo." };
        if (ciWidth != null && ciWidth > 20 * scale) return { type: 'warning', icon: "🧠", title: "!!Incerteza Elevada!!", text: `Nível estimado: ${safeBayesian.toFixed(1)}${unit}.`, advice: "Faça mais simulados para estreitar a estimativa." };
        
        return { type: 'info', icon: "🧠", title: "Estimativa Bayesiana", text: `Nível Real: ${safeBayesian.toFixed(1)}${unit}.` };
    }

    // Lógica da Média Histórica (Stats)
    if (activeEngine === "stats") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        if (!Number.isFinite(statsVal)) {
            return { type: 'info', icon: "📐", title: "Média Histórica", text: "Aguardando mais dados..." };
        }

        return {
            type: 'info',
            icon: "📐",
            title: "Média Histórica Global",
            text: `Sua média histórica acumulada é ${statsVal.toFixed(1)}${unit}.`,
            advice: "Lembre-se que a média demora a refletir seu conhecimento recente."
        };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        const bayVal = safeFinite(bayesian, null);
        const textMsg = bayVal != null 
            ? `Nível Bayesiano: ${bayVal.toFixed(1)}${unit} com projeção estatística ativa.` 
            : "Visualizando simulações estatísticas futuras.";
        return { 
            type: 'info', 
            icon: "⚡", 
            title: "Projeção Monte Carlo & Raio-X", 
            text: textMsg, 
            details: "O cone roxo projeta sua faixa provável de aprovação até a data do exame.",
            advice: "Use esta projeção para saber se sua curva está no rumo da aprovação." 
        };
    }

    // Lógica Raio-X de Assuntos (Subtopics)
    if (activeEngine === "subtopics") {
        return { 
            type: 'info', 
            icon: "🔬", 
            title: "Auditoria de Assuntos", 
            text: `Navegando nos subtópicos de ${focusCategory.name}.`, 
            details: "Identifique exatamente quais tópicos concentram a maior perda de pontos.",
            advice: "Ataque os !!blocos vermelhos!! para subir seu percentual rapidamente." 
        };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        const ciLow = safeFinite(lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? (ciHigh - ciLow) : null;
        return { 
            type: 'info', 
            icon: "📉", 
            title: "Densidade de Convergência", 
            text: ciWidth != null ? `Faixa de incerteza atual: ±${(ciWidth / 2).toFixed(1)}${unit}.` : "Histórico das suas projeções Monte Carlo.", 
            details: "Mostra como a margem de erro e a precisão do algoritmo evoluíram com seus simulados.",
            advice: "Se a linha estiver ++subindo++, você está matematicamente mais próximo da aprovação." 
        };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        return { 
            type: 'info', 
            icon: "📆", 
            title: "Acelerômetro Semanal", 
            text: `Tração do estudo em ${focusCategory.name}.`, 
            details: "Compara os ganhos e perdas percentuais semana a semana.",
            advice: "Monitore semanas !!negativas!! para evitar a !!curva do esquecimento!!." 
        };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        const diff = (Number.isFinite(safeRaw) && Number.isFinite(statsVal)) ? (safeRaw - statsVal) : null;
        const diffText = diff != null 
            ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${unit} vs média histórica.` 
            : "Seu foco de hoje contra sua média.";
        return { 
            type: diff != null && diff >= 0 ? 'success' : 'info', 
            icon: "⚖️", 
            title: "Desempenho Diário", 
            text: diffText, 
            details: `Último simulado: ${Number.isFinite(safeRaw) ? safeRaw.toFixed(1) + unit : '—'}.`,
            advice: "Use o ritmo de hoje para calibrar o volume das próximas sessões." 
        };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        return { 
            type: 'info', 
            icon: "⏳", 
            title: "Velocidade de Resolução", 
            text: `Mapeando velocidade média em ${focusCategory.name}.`, 
            details: "Compara o tempo gasto por questão contra seu histórico geral.",
            advice: "Cuidado com matérias !!lentas!!, elas roubam preciosos minutos da prova." 
        };
    }

    return { type: 'info', icon: "✅", title: "++Rendimento de Mestre++", text: `Operando na zona de ++máxima eficiência++.`, advice: "Mantenha o ritmo." };
}
```

---

## `src/engine/mc.worker.js` <a id="src-engine-mc-worker-js"></a>

- **Localização:** `src/engine/mc.worker.js`
- **Linhas:** 273
- **Tamanho:** 13.19 KB

```javascript
import { monteCarloSimulation } from './projection.js';
import { runMonteCarloAnalysis, simulateNormalDistribution } from './monteCarlo.js';
import { resetGaussianCache } from './math/gaussian.js';

function safeNum(val, fallback) {
    const hasFallback = arguments.length > 1;
    const cleanFallback = hasFallback ? fallback : 0;

    if (val === undefined || val === null || val === '') return cleanFallback;

    const num = Number(val);
    return Number.isFinite(num) ? num : cleanFallback;
}

function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => ({
        ...s,
        name: s?.name ? String(s.name) : undefined,
        mean: safeNum(s?.mean, 0),
        sd: Math.max(0.01, safeNum(s?.sd, 1)),
        minCutoff: safeNum(s?.minCutoff, 0),
        maxScore: safeNum(s?.maxScore, 100),
        minScore: safeNum(s?.minScore, 0),
        immunityFactor: safeNum(s?.immunityFactor, 1.0)
    }));
}

function sanitizeBayesianCI(ci) {
    if (!ci || typeof ci !== 'object') return undefined;

    const out = {};

    if (ci.ciLow !== undefined) out.ciLow = safeNum(ci.ciLow, 0);
    if (ci.ciHigh !== undefined) out.ciHigh = safeNum(ci.ciHigh, 100);
    if (ci.unclampedLow !== undefined) out.unclampedLow = safeNum(ci.unclampedLow, 0);
    if (ci.unclampedHigh !== undefined) out.unclampedHigh = safeNum(ci.unclampedHigh, 100);
    if (ci.n !== undefined) out.n = safeNum(ci.n, 1);

    return Object.keys(out).length ? out : undefined;
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history.map(h => {
        if (h === null || h === undefined) return null;

        if (typeof h === 'number') {
            return Number.isFinite(h) ? h : null;
        }

        if (typeof h === 'object') {
            const newH = { ...h };

            if (h.score !== undefined) newH.score = safeNum(h.score, NaN);
            if (h.value !== undefined) newH.value = safeNum(h.value, NaN);
            if (h.total !== undefined) newH.total = safeNum(h.total, 20);
            if (h.weight !== undefined) newH.weight = safeNum(h.weight, 1.0);
            if (h.difficulty !== undefined) newH.difficulty = safeNum(h.difficulty, 1.0);

            const hasFiniteScore = Number.isFinite(newH.score) || Number.isFinite(newH.value);
            return hasFiniteScore ? newH : null;
        }

        const parsed = Number(h);
        return Number.isFinite(parsed) ? parsed : null;
    }).filter(v => v !== null && v !== undefined && !Number.isNaN(v));
}

function sanitizeOptions(options) {
    if (!options || typeof options !== 'object') return {};

    const newOpts = { ...options };

    if (options.forcedVolatility !== undefined) newOpts.forcedVolatility = safeNum(options.forcedVolatility, undefined);
    if (options.forcedBaseline !== undefined) newOpts.forcedBaseline = safeNum(options.forcedBaseline, undefined);
    if (options.currentMean !== undefined) newOpts.currentMean = safeNum(options.currentMean, undefined);
    if (options.minScore !== undefined) newOpts.minScore = safeNum(options.minScore, 0);
    if (options.maxScore !== undefined) newOpts.maxScore = safeNum(options.maxScore, 100);

    if (options.seed !== undefined) newOpts.seed = safeNum(options.seed, undefined);
    if (options.subjects !== undefined) newOpts.subjects = sanitizeSubjects(options.subjects);
    if (options.history !== undefined) newOpts.history = sanitizeHistory(options.history);
    if (options.flashcardImmunity !== undefined) newOpts.flashcardImmunity = safeNum(options.flashcardImmunity, 1.0);
    if (options.bayesianCI !== undefined) newOpts.bayesianCI = sanitizeBayesianCI(options.bayesianCI);
    if (options.simulations !== undefined) newOpts.simulations = safeNum(options.simulations, 5000);

    if (options.historicalCutoffs !== undefined) {
        newOpts.historicalCutoffs = Array.isArray(options.historicalCutoffs)
            ? options.historicalCutoffs.map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0)
            : [];
    }

    return newOpts;
}

self.onmessage = function(e) {
    const { type, payload, id } = e.data;

    if (typeof resetGaussianCache === 'function') {
        resetGaussianCache();
    }

    try {
        let result;

        if (type === 'runMonteCarloAnalysis') {
            if (payload.isObjectCall) {
                const input = payload.input || {};

                if (input.mode === 'normal' || (input.mean !== undefined && !Array.isArray(input.values))) {
                    result = simulateNormalDistribution({
                        mean: safeNum(input.mean, 0),
                        sd: safeNum(input.sd, 0),
                        targetScore: safeNum(input.targetScore, 0),
                        simulations: safeNum(input.simulations, 5000),
                        seed: input.seed,
                        currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, 0) : undefined,
                        categoryName: input.categoryName,
                        bayesianCI: sanitizeBayesianCI(input.bayesianCI),
                        minScore: safeNum(input.minScore, 0),
                        maxScore: safeNum(input.maxScore, 100),
                        historyLength: safeNum(input.historyLength, 0),
                        subjects: input.subjects !== undefined ? sanitizeSubjects(input.subjects) : undefined,
                        historicalCutoffs: input.historicalCutoffs !== undefined
                            ? (Array.isArray(input.historicalCutoffs)
                                ? input.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                                : [])
                            : undefined,
                        flashcardImmunity: input.flashcardImmunity !== undefined ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                    });
                } else {
                    const sanitizedInput = {
                        ...input,
                        // FIX: Mantém o objeto inteiro para não perder metadata (fatigueFlag, weight, difficulty)
                        values: Array.isArray(input.values) ? input.values.map(v => {
                            if (typeof v === 'object' && v !== null) {
                                return { ...v, score: safeNum(v.score ?? v.value, NaN) };
                            }
                            return safeNum(v, NaN);
                        }) : [],
                        dates: Array.isArray(input.dates) ? input.dates.map(d => d == null ? '' : String(d)) : [],
                        meta: safeNum(input.meta, 0),
                        targetScore: input.targetScore !== undefined ? safeNum(input.targetScore, 0) : undefined,
                        simulations: safeNum(input.simulations, 5000),
                        projectionDays: safeNum(input.projectionDays, 90),
                        forcedVolatility: input.forcedVolatility !== undefined ? safeNum(input.forcedVolatility, 0) : undefined,
                        forcedBaseline: input.forcedBaseline !== undefined ? safeNum(input.forcedBaseline, 0) : undefined,
                        currentMean: input.currentMean !== undefined ? safeNum(input.currentMean, 0) : undefined,
                        minScore: input.minScore !== undefined ? safeNum(input.minScore, 0) : undefined,
                        maxScore: input.maxScore !== undefined ? safeNum(input.maxScore, 100) : undefined,
                        historicalCutoffs: input.historicalCutoffs !== undefined
                            ? (Array.isArray(input.historicalCutoffs)
                                ? input.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                                : [])
                            : undefined,
                        flashcardImmunity: input.flashcardImmunity !== undefined ? safeNum(input.flashcardImmunity, 1.0) : undefined,
                        subjects: input.subjects !== undefined ? sanitizeSubjects(input.subjects) : undefined
                    };

                    result = runMonteCarloAnalysis(sanitizedInput);
                }
            } else if (Array.isArray(payload.inputOrMean)) {
                const hist = sanitizeHistory(payload.inputOrMean);
                const options = sanitizeOptions(payload.options);

                const sanitizedInput = {
                    // FIX: Mantém o objeto inteiro
                    values: hist.map(h => typeof h === 'object' && h !== null ? { ...h, score: (h.score ?? h.value ?? NaN) } : h),
                    dates: hist.map(h => typeof h === 'object' && h !== null ? (h.date ?? '') : ''),
                    targetScore: safeNum(payload.targetScore, 0),
                    projectionDays: safeNum(payload.projectionDays, 90),
                    ...options
                };

                result = runMonteCarloAnalysis(sanitizedInput);
            } else {
                const options = sanitizeOptions(payload.options);

                result = simulateNormalDistribution({
                    mean: safeNum(payload.inputOrMean, 0),
                    sd: safeNum(payload.pooledSD, 0),
                    targetScore: safeNum(payload.targetScore, 0),
                    simulations: safeNum(options.simulations, 5000),
                    seed: options.seed,
                    currentMean: options.currentMean,
                    categoryName: options.categoryName,
                    bayesianCI: options.bayesianCI,
                    minScore: safeNum(options.minScore, 0),
                    maxScore: safeNum(options.maxScore, 100),
                    historyLength: (options.history || []).length,
                    subjects: options.subjects,
                    historicalCutoffs: options.historicalCutoffs,
                    flashcardImmunity: options.flashcardImmunity
                });
            }
        } else if (type === 'monteCarloSimulation') {
            const history = sanitizeHistory(payload.history);
            const targetScore = safeNum(payload.targetScore, 0);
            const projectionDays = safeNum(payload.projectionDays, 30);
            const simulations = safeNum(payload.simulations, 5000);
            const options = sanitizeOptions(payload.options);

            result = monteCarloSimulation(history, targetScore, projectionDays, simulations, options);
        } else if (type === 'simulateNormalDistribution') {
            const mean = safeNum(payload.mean, 0);
            const sd = safeNum(payload.sd, 0);
            const targetScore = safeNum(payload.targetScore, 0);
            const simulations = safeNum(payload.simulations, 5000);
            const seed = payload.seed !== undefined ? safeNum(payload.seed, undefined) : undefined;
            const currentMean = payload.currentMean !== undefined ? safeNum(payload.currentMean, undefined) : undefined;
            const categoryName = payload.categoryName ? String(payload.categoryName) : undefined;
            const minScore = safeNum(payload.minScore, 0);
            const maxScore = safeNum(payload.maxScore, 100);
            const bayesianCI = sanitizeBayesianCI(payload.bayesianCI);

            const sanitizedSubjects = Array.isArray(payload.subjects)
                ? sanitizeSubjects(payload.subjects)
                : undefined;

            result = simulateNormalDistribution({
                mean,
                sd,
                targetScore,
                simulations,
                seed,
                currentMean,
                categoryName,
                bayesianCI,
                minScore,
                maxScore,
                historyLength: safeNum(payload.historyLength, 0),
                subjects: sanitizedSubjects,
                historicalCutoffs: payload.historicalCutoffs !== undefined
                    ? (Array.isArray(payload.historicalCutoffs)
                        ? payload.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
                        : [])
                    : undefined,
                flashcardImmunity: payload.flashcardImmunity !== undefined ? safeNum(payload.flashcardImmunity, 1.0) : undefined,
            });
        } else {
            self.postMessage({ id, type: 'error', error: `Tipo de mensagem desconhecido: ${type}` });
            return;
        }

        self.postMessage({ id, type: 'result', result: sanitizePayloadForWorker(result) });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({ id, type: 'error', error: errorMessage });
    }
};

function sanitizePayloadForWorker(obj) {
    try {
        return JSON.parse(JSON.stringify(obj, (key, value) => {
            if (Number.isNaN(value)) return null;
            if (value === Number.POSITIVE_INFINITY) return Number.MAX_VALUE;
            if (value === Number.NEGATIVE_INFINITY) return -Number.MAX_VALUE;
            return value;
        }));
    } catch {
        return null;
    }
}

export const __workerTesting = {
  safeNum,
  sanitizeHistory,
  sanitizeOptions,
};
```

---

## `src/engine/math/gaussian.js` <a id="src-engine-math-gaussian-js"></a>

- **Localização:** `src/engine/math/gaussian.js`
- **Linhas:** 482
- **Tamanho:** 16.58 KB

```javascript
// src/engine/math/gaussian.js
import { getPercentile } from './percentile.js';
import { MIN_SD_FLOOR } from './constants.js';
import { kahanSum } from './kahan.js';

/**
 * Abramowitz & Stegun approximation (formula 7.1.26) for Normal(0,1) CDF
 * Returns 1 - P(X <= z)
 */
export function normalCDF_complement(z) {
    if (z === Number.POSITIVE_INFINITY) return 0;
    if (z === Number.NEGATIVE_INFINITY) return 1;
    if (Number.isNaN(z)) return 0.5;
    if (z > 8) return 0;
    if (z < -8) return 1;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? p : 1 - p;
}

/**
 * Standard Normal PDF: φ(z) = (1/√(2π)) · exp(-z²/2)
 */
export function normalPDF(z) {
    if (!Number.isFinite(z)) return 0;
    return 0.3989422804014327 * Math.exp(-0.5 * z * z);
}

/**
 * Média Exata da Normal Truncada em [a, b] com parâmetros (μ, σ).
 */
export function truncatedNormalMean(mean, sd, a, b) {
    if (!Number.isFinite(sd) || sd <= 0) return Math.max(a, Math.min(b, mean));
    
    const alpha = (a - mean) / sd;
    const beta = (b - mean) / sd;
    
    let denominator;
    let phiAlpha;

    if (alpha > 0 && beta > 0) {
        // Evita cancelamento catastrófico na cauda direita usando a Função de Sobrevivência (S)
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        denominator = sAlpha - sBeta;
        phiAlpha = 1 - sAlpha;
    } else {
        phiAlpha = 1 - normalCDF_complement(alpha);
        const phiBeta = 1 - normalCDF_complement(beta);
        denominator = phiBeta - phiAlpha;
    }
    
    if (denominator < 1e-15) return Math.max(a, Math.min(b, mean));
    
    const pdfAlpha = normalPDF(alpha);
    const pdfBeta = normalPDF(beta);
    
    const truncMean = mean + sd * (pdfAlpha - pdfBeta) / denominator;
    return Math.max(a, Math.min(b, truncMean));
}
const rngCache = new WeakMap();

export const generateGaussian = (rng = Math.random) => {
    if (rngCache.has(rng)) {
        const result = rngCache.get(rng);
        rngCache.delete(rng);
        return result;
    }

    let u1 = 0, u2 = 0;
    let attempts = 0;
    
    while (u1 === 0 && attempts < 100) {
        u1 = rng(); 
        attempts++;
    }
    if (u1 === 0) u1 = 1e-15;
    
    let attemptsU2 = 0;
    while (u2 === 0 && attemptsU2 < 100) {
        u2 = rng();
        attemptsU2++;
    }
    if (u2 === 0) u2 = 1e-15;
    
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);
    
    rngCache.set(rng, z1);
    return z0;
};

export function resetGaussianCache() {}

export function asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor = 1) {
    const rawSd = x < mean ? sdLeft : sdRight;
    const currentSd = Math.max(1e-6, rawSd);
    // Removemos o normFactor do cálculo final para normalizar o pico visual (Peak = heightFactor),
    // de forma idêntica à normalização (invMaxY) feita pelo gerador KDE, evitando achatamento total.
    return heightFactor * Math.exp(-0.5 * Math.pow((x - mean) / currentSd, 2));
}

export function generateGaussianPoints(xMin, xMax, steps, mean, sdLeft, sdRight, heightFactor, xp, yp) {
    const points = [];
    const safeXp = typeof xp === 'function' ? xp : (v) => v;
    const safeYp = typeof yp === 'function' ? yp : (v) => v;
    const safeSteps = Number.isFinite(steps) ? Math.max(1, Math.floor(steps)) : 1;
    const stepSize = (xMax - xMin) / safeSteps;

    for (let i = 0; i <= safeSteps; i++) {
        const x = xMin + stepSize * i;
        const y = asymmetricGaussian(x, mean, sdLeft, sdRight, heightFactor);
        points.push({ x, y });
    }

    if (mean >= xMin && mean <= xMax) {
        points.push({ x: mean, y: asymmetricGaussian(mean, mean, sdLeft, sdRight, heightFactor) });
    }

    return points
        .sort((a, b) => a.x - b.x)
        .map(p => `${safeXp(p.x)},${safeYp(p.y)}`);
}

export function generateKDE(allScores, projectedMean, projectedSD, safeSimulations, minScore = 0, maxScore = 100) {
    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || minScore >= maxScore) {
        return [];
    }
    if (!allScores || allScores.length === 0) return [];

    const safeMean = Number.isFinite(projectedMean) ? projectedMean : (maxScore / 2);
    const safeSD = (Number.isFinite(projectedSD) && projectedSD > 0) ? projectedSD : (maxScore * 0.1);

    const slack = Math.max(maxScore * 0.05, safeSD * 0.5, 1.0);
    let plotMin = Math.max(minScore - slack, safeMean - 3.5 * safeSD);
    let plotMax = Math.min(maxScore + slack, safeMean + 3.5 * safeSD);

    const vMin = minScore - slack;
    const vMax = maxScore + slack;

    if (plotMax - plotMin < 1) {
        plotMin = Math.max(vMin, safeMean - 0.5);
        plotMax = Math.min(vMax, safeMean + 0.5);

        if (plotMax >= maxScore && maxScore - minScore >= 1) plotMin = Math.max(vMin, plotMax - 1);
        if (plotMin <= minScore && maxScore - minScore >= 1) plotMax = Math.min(vMax, plotMin + 1);
    }

    const plotSteps = 200; 
    const stepSize = (plotMax - plotMin) / plotSteps;

    const safeSimCount = Number.isFinite(safeSimulations) && safeSimulations > 0
        ? safeSimulations
        : Math.max(1, allScores.length);
    const iqr = getPercentile(allScores, 0.75, true) - getPercentile(allScores, 0.25, true);
    const scottFactor = iqr > 0 ? Math.min(safeSD, iqr / 1.34) : safeSD;
    const h = 0.9 * scottFactor * Math.pow(safeSimCount, -0.2);

    const BIN_COUNT = 300;
    const binWidth = (plotMax - plotMin) / BIN_COUNT;

    const finiteH = Number.isFinite(h) && h > 0 ? h : 0;
    
    const minPhysicalBandwidth = Math.max(1e-9, (plotMax - plotMin) * 0.015); 
    
    const bandwidth = Math.max(minPhysicalBandwidth, finiteH, binWidth * 2, safeSD * 0.15);
    const bins = new Float32Array(BIN_COUNT);

    for (let i = 0; i < allScores.length; i++) {
        let s = Math.max(minScore, Math.min(maxScore, allScores[i]));
        if (s > plotMax || s < plotMin) continue;
        const idx = Math.min(BIN_COUNT - 1, Math.floor((s - plotMin) / binWidth));
        bins[idx]++;
    }

    const invBandwidth = 1 / bandwidth;

    const normFactor = 1 / (Math.max(1, safeSimCount) * Math.max(1e-10, bandwidth) * 2.506628274631);

    const xOut = new Float64Array(plotSteps + 1);
    const densityOut = new Float64Array(plotSteps + 1);
    let maxY = 0;

    for (let i = 0; i <= plotSteps; i++) {
        const x = plotMin + i * stepSize;
        let density = 0;
        if (x < minScore || x > maxScore) {
            density = 0;
        } else {
            for (let j = 0; j < BIN_COUNT; j++) {
                if (bins[j] === 0) continue;
                const binX = plotMin + (j + 0.5) * binWidth;

                const dist = (x - binX) * invBandwidth;
                const distReflMin = (x - (2 * minScore - binX)) * invBandwidth;
                const distReflMax = (x - (2 * maxScore - binX)) * invBandwidth;

                if (Math.abs(dist) < 4.0 || Math.abs(distReflMin) < 4.0 || Math.abs(distReflMax) < 4.0) {
                    let localDensity = Math.exp(-0.5 * dist * dist);
                    localDensity += Math.exp(-0.5 * distReflMin * distReflMin);
                    localDensity += Math.exp(-0.5 * distReflMax * distReflMax);
                    density += bins[j] * localDensity;
                }
            }
            density *= normFactor;
        }

        if (density > maxY) maxY = density;
        xOut[i] = x;
        densityOut[i] = density;
    }

    let totalArea = 0;
    let kahanC = 0;
    for (let i = 1; i <= plotSteps; i++) {
        const area = (densityOut[i] + densityOut[i-1]) * stepSize * 0.5;
        const y = area - kahanC;
        const t = totalArea + y;
        kahanC = (t - totalArea) - y;
        totalArea = t;
    }
        
    const normFactor2 = totalArea > 1e-15 ? 1 / totalArea : 1;
    const invMaxY = maxY > 1e-15 ? 1 / maxY : 0;

    const finalPlot = new Array(plotSteps + 1);
    for (let i = 0; i <= plotSteps; i++) {
        const den = Math.max(0, densityOut[i]);
        finalPlot[i] = {
            x: Number(xOut[i].toFixed(2)),
            y: Number((den * invMaxY).toFixed(4)), 
            density: den * normFactor2
        };
    }
    
    return finalPlot;
}

export function inverseNormalCDF(p) {
    if (p <= 0) return -8; 
    if (p >= 1) return 8;  

    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
        0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
        0.0000321767881768, 0.0000002888167364, 3.960315187e-7]; // Wichura coefficient fix

    let x = p - 0.5;
    if (Math.abs(x) < 0.42) {
        let r = x * x;
        return x * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) /
            ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1.0);
    } else {
        let r = p;
        if (x > 0) r = 1.0 - p;
        r = Math.log(-Math.log(r));
        let z = c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * (c[5] + r * (c[6] + r * (c[7] + r * c[8])))))));
        return x < 0 ? -z : z;
    }
}

export function sampleTruncatedNormal(mean, sd, min, max, rng, options) {
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || !Number.isFinite(min) || !Number.isFinite(max)) {
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : lo;
        return Math.max(lo, Math.min(hi, (lo + hi) / 2));
    }

    if (min > max) {
        const temp = min;
        min = max;
        max = temp;
    }

    if (sd <= MIN_SD_FLOOR) return Math.max(min, Math.min(max, mean));

    const alpha = (min - mean) / sd;
    const beta = (max - mean) / sd;
    let diff;
    let cdfMin;

    if (alpha > 0 && beta > 0) {
        // Evita cancelamento catastrófico na cauda direita usando a Função de Sobrevivência (S)
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        diff = sAlpha - sBeta;
        cdfMin = 1 - sAlpha;
    } else {
        cdfMin = 1 - normalCDF_complement(alpha);
        const cdfMax = 1 - normalCDF_complement(beta);
        diff = cdfMax - cdfMin;
    }
    if (diff < 1e-16) {
        return Math.max(min, Math.min(max, mean));
    }

    const strictDeterminism = options && options.strict === true;
    if (typeof rng !== 'function') {
        if (strictDeterminism) {
            throw new Error('STRICT_DETERMINISM: sampleTruncatedNormal requires a deterministic RNG function');
        }
        if (!globalThis.__MC_WARNED_FALLBACK_RNG__) {
            console.warn('sampleTruncatedNormal: no RNG provided, falling back to Math.random() (non-deterministic)');
            globalThis.__MC_WARNED_FALLBACK_RNG__ = true;
        }
        rng = Math.random;
    }
    const sampledU = rng();
    const u = Number.isFinite(sampledU)
        ? Math.max(0, Math.min(1, sampledU))
        : 0.5;
    const p = cdfMin + u * diff;

    const zScore = inverseNormalCDF(p);
    const rawScore = mean + (zScore * sd);

    return Math.max(min, Math.min(max, rawScore));
}

export function truncatedNormalFromUniform(mean, sd, min, max, u) {
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || !Number.isFinite(min) || !Number.isFinite(max)) {
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : lo;
        return Math.max(lo, Math.min(hi, (lo + hi) / 2));
    }

    if (min > max) {
        const temp = min;
        min = max;
        max = temp;
    }

    if (sd <= MIN_SD_FLOOR) return Math.max(min, Math.min(max, mean));

    const alpha = (min - mean) / sd;
    const beta = (max - mean) / sd;
    let diff;
    let cdfMin;

    if (alpha > 0 && beta > 0) {
        const sAlpha = normalCDF_complement(alpha);
        const sBeta = normalCDF_complement(beta);
        diff = sAlpha - sBeta;
        cdfMin = 1 - sAlpha;
    } else {
        cdfMin = 1 - normalCDF_complement(alpha);
        const cdfMax = 1 - normalCDF_complement(beta);
        diff = cdfMax - cdfMin;
    }
    if (diff < 1e-16) {
        return Math.max(min, Math.min(max, mean));
    }

    const safeU = Number.isFinite(u) ? Math.max(0, Math.min(1, u)) : 0.5;
    const p = cdfMin + safeU * diff;
    const zScore = inverseNormalCDF(p);
    const rawScore = mean + (zScore * sd);

    return Math.max(min, Math.min(max, rawScore));
}

export function ensurePositiveSemiDefinite(matrix, baseJitter = 1e-9) {
    const n = matrix.length;
    const cloneBase = matrix.map(row => [...row]);

    let diagMax = 0;
    for (let i = 0; i < n; i++) {
        diagMax = Math.max(diagMax, Math.abs(cloneBase[i][i] || 0));
    }

    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const factor = attempt === 0 ? 0 : attempt * 10;
        const jitter = Math.max(baseJitter, (diagMax * 1e-8)) + (baseJitter * factor);
        const psdMatrix = cloneBase.map((row, i) => row.map((v, j) => (i === j ? (v + jitter) : v)));

        try {
            const L = choleskyDecomposition(psdMatrix);
            let ok = true;
            for (let k = 0; k < L.length; k++) {
                if (!Number.isFinite(L[k][k]) || L[k][k] <= 0) { ok = false; break; }
            }
            if (ok) return psdMatrix;
        } catch {
            // continue
        }
    }

    const fallbackJitter = Math.max(baseJitter, diagMax * 1e-6);
    return cloneBase.map((row, i) => row.map((v, j) => (i === j ? (v + fallbackJitter) : v)));
}

export function choleskyDecomposition(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) return [];
    const n = matrix.length;
    if (matrix.some(row => !Array.isArray(row) || row.length !== n)) {
        throw new Error('CHOLESKY_INVALID_MATRIX: matriz deve ser quadrada');
    }

    const lower = Array.from({ length: n }, () => Array(n).fill(0));
    const EPS = 1e-12;

    // ✅ PERF FIX: buffer pré-alocado para soma de Kahan
    // Evita alocação de new Array(j) a cada iteração
    const sumBuffer = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            let c = 0; // compensador Kahan

            if (j > 0) {
                // Preencher buffer e somar com Kahan inline
                for (let k = 0; k < j; k++) {
                    sumBuffer[k] = lower[i][k] * lower[j][k];
                }
                for (let k = 0; k < j; k++) {
                    const y = sumBuffer[k] - c;
                    const t = sum + y;
                    c = (t - sum) - y;
                    sum = t;
                }
            }

            if (j === i) {
                const diag = Number(matrix[i][i]) - sum;
                if (!Number.isFinite(diag) || diag <= EPS) {
                    throw new Error(`CHOLESKY_NOT_POSITIVE_DEFINITE: pivot ${i} = ${diag}`);
                }
                lower[i][j] = Math.sqrt(diag);
            } else {
                const denom = lower[j][j];
                if (!(denom > EPS)) {
                    throw new Error(`CHOLESKY_ZERO_PIVOT: pivot ${j}`);
                }
                const value = (Number(matrix[i][j]) - sum) / denom;
                if (!Number.isFinite(value)) {
                    throw new Error(`CHOLESKY_NONFINITE: elemento ${i},${j}`);
                }
                lower[i][j] = value;
            }
        }
    }

    return lower;
}

export function applyCovariance(choleskyLower, zVector, targetVector) {
    if (!choleskyLower || !zVector || choleskyLower.length !== zVector.length) {
        if (targetVector && zVector && targetVector !== zVector) {
            for(let i=0; i<zVector.length; i++) targetVector[i] = zVector[i];
            return targetVector;
        }
        return zVector ? (targetVector === zVector ? targetVector : [...zVector]) : [];
    }
    const n = zVector.length;
    const isInPlace = (targetVector === zVector);
    const result = targetVector || Array(n).fill(0);
    
    if (isInPlace) {
        // Iteração reversa garante estabilidade na mutação do próprio buffer em modo in-place
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = 0; j <= i; j++) {
                sum += choleskyLower[i][j] * zVector[j];
            }
            result[i] = sum;
        }
    } else {
        for (let i = 0; i < n; i++) result[i] = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                result[i] += choleskyLower[i][j] * zVector[j];
            }
        }
    }
    return result;
}
```

---

## `src/engine/math/bootstrap.js` <a id="src-engine-math-bootstrap-js"></a>

- **Localização:** `src/engine/math/bootstrap.js`
- **Linhas:** 116
- **Tamanho:** 3.37 KB

```javascript
import { makeNormalRng } from '../random.js';
import { kahanSum } from './kahan.js';

/**
 * Percentile bootstrap CI for robust uncertainty estimation.
 * Útil quando suposições de normalidade são fracas.
 *
 * CORREÇÃO: bootstrap não-paramétrico puro.
 * O smoothed bootstrap (ruído gaussiano para N < 5) foi removido
 * porque inflava artificialmente o intervalo de confiança.
 */
export function bootstrapCI(samples, statFn, {
  iterations = 1000,
  alpha = 0.05,
  seed = 42,
} = {}) {
  const clean = (samples || []).map(Number).filter(Number.isFinite);
  if (clean.length === 0) return { estimate: 0, low: 0, high: 0, n: 0 };

  const fn = typeof statFn === 'function'
    ? statFn
    : (values) => kahanSum(values) / values.length;

  const estimateRaw = Number(fn(clean));
  const estimate = estimateRaw;
  const n = clean.length;
  const iters = Math.max(500, Math.floor(Number(iterations) || 1000));
  const safeAlpha = Math.max(0.001, Math.min(0.5, Number(alpha) || 0.05));
  const qLow = safeAlpha / 2;
  const qHigh = 1 - qLow;

  // Caso degenerado: 1 observação → IC colapsa no ponto
  if (n === 1) {
    return { estimate, low: estimate, high: estimate, n, iterations: 0, method: 'degenerate' };
  }

  // PRNG determinístico (LCG)
  let state = (Number(seed) >>> 0) || 42;
  const rand = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };

  // ✅ Bootstrap percentílico puro — sem ruído artificial
  const dist = new Array(iters);
  for (let i = 0; i < iters; i++) {
    const bag = new Array(n);
    for (let j = 0; j < n; j++) {
      bag[j] = clean[Math.min(n - 1, Math.floor(rand() * n))];
    }
    const value = Number(fn(bag));
    dist[i] = Number.isFinite(value) ? value : estimate;
  }

  dist.sort((a, b) => a - b);

  const quantile = (p) => {
    const idx = (dist.length - 1) * Math.max(0, Math.min(1, p));
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return dist[lo];
    const w = idx - lo;
    return dist[lo] * (1 - w) + dist[hi] * w;
  };

  return {
    estimate,
    low: quantile(qLow),
    high: quantile(qHigh),
    n,
    iterations: iters,
    alpha: safeAlpha,
    method: 'percentile_bootstrap',
  };
}

/**
 * Split-conformal prediction interval.
 *
 * CORREÇÃO: usa resíduos ABSOLUTOS |y - ŷ|, não resíduos com sinal.
 * O quantil conformal é o ceil((n+1)(1-α))-ésimo menor resíduo absoluto.
 */
export function conformalPredictionInterval(residuals = [], alpha = 0.05, pointEstimate = 0) {
  const clean = residuals.map(Number).filter(Number.isFinite);
  const p = Number.isFinite(Number(pointEstimate)) ? Number(pointEstimate) : 0;
  const a = Math.max(0.001, Math.min(0.5, Number(alpha) || 0.05));

  if (clean.length < 3) {
    return {
      lower: p - 8,
      upper: p + 8,
      coverage: 1 - a,
      n: clean.length,
      method: 'fallback_insufficient_data',
    };
  }

  // ✅ Resíduos absolutos ordenados
  const absResiduals = clean.map(Math.abs).sort((x, y) => x - y);
  const n = absResiduals.length;

  // Rank conformal: ceil((n+1)(1-α)) - 1, limitado a [0, n-1]
  const rank = Math.min(n - 1, Math.max(0, Math.ceil((n + 1) * (1 - a)) - 1));
  const q = absResiduals[rank];

  return {
    lower: p - q,
    upper: p + q,
    conformalQuantile: Number(q.toFixed(6)),
    n,
    alpha: a,
    coverage: 1 - a,
    method: 'split_conformal_absolute_residual',
  };
}
```

---

## `src/engine/math/percentile.js` <a id="src-engine-math-percentile-js"></a>

- **Localização:** `src/engine/math/percentile.js`
- **Linhas:** 174
- **Tamanho:** 6.05 KB

```javascript
// ==========================================
// SHARED STATISTICAL UTILITIES
// ==========================================

/**
 * Linear interpolation percentile calculator.
 * B1 FIX: Shared between simulateNormalDistribution (monteCarlo.js) and
 * monteCarloSimulation (projection.js) for consistent CI percentile calculation.
 * 
 * @param {Float64Array|Float32Array|number[]} arr - Sorted array of values
 * @param {number} p - Percentile (0 to 1, e.g. 0.025 for 2.5th percentile)
 * @returns {number} Interpolated percentile value
 */
export const getPercentile = (arr, p, isAlreadySorted = false) => {
    if (!arr || arr.length === 0) return 0;

    let sorted;
    if (isAlreadySorted) {
        if (arr instanceof Float64Array || arr instanceof Float32Array) {
            let hasNaN = false;
            for (let i = 0; i < arr.length; i++) {
                if (!Number.isFinite(arr[i])) {
                    hasNaN = true;
                    break;
                }
            }
            if (!hasNaN) {
                sorted = arr;
            } else {
                const finiteData = [];
                for (let i = 0; i < arr.length; i++) {
                    if (Number.isFinite(arr[i])) finiteData.push(arr[i]);
                }
                if (finiteData.length === 0) return 0;
                // Ordenar explicitamente — a ordem original NÃO é confiável com NaNs
                finiteData.sort((a, b) => a - b);
                sorted = new arr.constructor(finiteData);
            }
        } else {
            const hasNaN = arr.some(v => !Number.isFinite(Number(v)));
            if (!hasNaN) {
                sorted = arr;
            } else {
                const finite = Array.from(arr).filter(v => Number.isFinite(Number(v)));
                if (finite.length === 0) return 0;
                sorted = finite; // Keep relative order
            }
        }
    } else if (arr instanceof Float64Array || arr instanceof Float32Array) {
        const finiteData = [];
        for (let i = 0; i < arr.length; i++) {
            if (Number.isFinite(arr[i])) finiteData.push(arr[i]);
        }
        if (finiteData.length === 0) return 0;
        sorted = new arr.constructor(finiteData).sort();
    } else {
        const finite = Array.from(arr).filter(v => Number.isFinite(Number(v)));
        if (finite.length === 0) return 0;
        sorted = [...finite].sort((a, b) => a - b);
    }

    // NOVAS PROTEÇÕES
    if (!Number.isFinite(p)) return 0;
    if (p <= 0) return sorted[0]; // Retorna primeiro elemento se percentil <= 0
    if (p >= 1) return sorted[sorted.length - 1]; // Retorna último elemento se percentil >= 1
    
    const idx = (sorted.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

/**
 * Algoritmo Quickselect In-place (Média O(N), Memória O(1))
 * Encontra o k-ésimo menor elemento sem ordenar o array inteiro.
 */
// BUG-AUDIT-09 FIX: Cria cópia defensiva para não corromper o array original.
// O particionamento in-place reordenava o Float64Array do chamador, fazendo
// chamadas subsequentes (ex: iLow, iMedian, iHigh) retornarem valores incorretos.
export const quickSelect = (arr, k) => {
    if (!arr || arr.length === 0) return 0;

    let copy;
    if (arr instanceof Float64Array || arr instanceof Float32Array) {
        let allFinite = true;
        const finite = [];
        for (let i = 0; i < arr.length; i++) {
            if (Number.isFinite(arr[i])) {
                finite.push(arr[i]);
            } else {
                allFinite = false;
            }
        }
        if (finite.length === 0) return 0;
        copy = allFinite ? new arr.constructor(arr) : new arr.constructor(finite);
    } else {
        copy = [];
        for (const value of arr) {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) copy.push(numeric);
        }
        if (copy.length === 0) return 0;
    }

    const rawK = Math.floor(Number(k));
    const safeK = Number.isFinite(rawK)
        ? Math.max(0, Math.min(copy.length - 1, rawK))
        : 0;
    return _quickSelectInPlace(copy, safeK, 0, copy.length - 1);
};

const _quickSelectInPlace = (arr, k, left = 0, right = arr.length - 1) => {
    while (left < right) {
        let pivotIndex = partition(arr, left, right);
        if (pivotIndex === k) return arr[k];
        if (k < pivotIndex) right = pivotIndex - 1;
        else left = pivotIndex + 1;
    }
    return arr[k];
};

function partition(arr, left, right) {
    const pivotIndex = Math.floor((left + right) / 2);
    const pivot = arr[pivotIndex];
    let temp = arr[pivotIndex];
    arr[pivotIndex] = arr[right];
    arr[right] = temp;

    let storeIndex = left;
    for (let i = left; i < right; i++) {
        if (arr[i] < pivot) {
            temp = arr[storeIndex];
            arr[storeIndex] = arr[i];
            arr[i] = temp;
            storeIndex++;
        }
    }

    temp = arr[storeIndex];
    arr[storeIndex] = arr[right];
    arr[right] = temp;
    return storeIndex;
}

export function findScoreForPercentile(targetPercentile, minScore, maxScore, cdfFunction, tolerance = 0.0001) {
  let low = minScore;
  let high = maxScore;
  let maxIter = 100; // Bailout / Trava de segurança
  
  // Tratamento de ponta (Edge case high performers)
  if (targetPercentile >= 0.9999) return maxScore;
  if (targetPercentile <= 0.0001) return minScore;

  for (let i = 0; i < maxIter; i++) {
    const mid = low + (high - low) / 2;
    const currentPercentile = cdfFunction(mid);
    
    if (Math.abs(currentPercentile - targetPercentile) <= tolerance) {
      return mid;
    }
    
    if (currentPercentile < targetPercentile) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return low + (high - low) / 2; // Retorna a melhor aproximação ao atingir maxIter
}

```

---

## `src/engine/math/kahan.js` <a id="src-engine-math-kahan-js"></a>

- **Localização:** `src/engine/math/kahan.js`
- **Linhas:** 65
- **Tamanho:** 2.22 KB

```javascript
/**
 * Helper: verifica se o valor é um array-like iterável com .length
 * Suporta Array, Float64Array, Float32Array, Int32Array, etc.
 */
function isArrayLike(arr) {
    return arr != null && typeof arr.length === 'number' && arr.length >= 0;
}

/**
 * Algoritmo de Soma de Kahan (Kahan Summation Algorithm)
 * Minimiza o erro de ponto flutuante (IEEE 754) em somatórios de grandes séries.
 * 
 * @param {number[]|Float64Array|Float32Array} arr - Array de números para somar.
 * @returns {number} Soma matematicamente precisa.
 */
export function kahanSum(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    let sum = 0.0;
    let c = 0.0; // Um compensador para os bits de baixa ordem perdidos
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;
        
        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        
        let y = val - c;     // c é zero na primeira iteração, depois carrega o erro anterior
        let t = sum + y;     // Adiciona o valor compensado à soma total
        c = (t - sum) - y;   // Calcula o erro de arredondamento desta iteração
        sum = t;             // Atualiza a soma principal
    }
    
    return sum;
}

/**
 * Calcula a média utilizando a Soma de Kahan para máxima precisão.
 * Suporta Array, Float64Array, Float32Array, etc.
 */
export function kahanMean(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    // Para TypedArrays, filtrar NaN/Infinity in-line sem .filter()
    let count = 0;
    let sum = 0.0;
    let c = 0.0;
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;

        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        const y = val - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;
        count++;
    }
    
    return count === 0 ? 0 : sum / count;
}
```

---

## `src/engine/math/safe.js` <a id="src-engine-math-safe-js"></a>

- **Localização:** `src/engine/math/safe.js`
- **Linhas:** 138
- **Tamanho:** 3.16 KB

```javascript
export const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

export const parseNumericString = (value) => {
  if (typeof value === 'number') return value;

  if (typeof value !== 'string') return NaN;

  const trimmed = value.trim();

  if (!trimmed) return NaN;

  // Formato pt-BR: 1.234,56
  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    return Number(normalized);
  }

  // Se tem múltiplos pontos: 1.234.567 -> 1234567
  const parts = trimmed.split('.');

  if (parts.length > 2) {
    return Number(parts.join(''));
  }

  // Se tem um ponto e exatamente 3 casas decimais, tratar como milhar:
  // 1.234 -> 1234
  if (parts.length === 2) {
    const integerPart = parts[0];
    const decimalPart = parts[1];

    if (integerPart.length > 0 && decimalPart.length === 3) {
      return Number(integerPart + decimalPart);
    }
  }

  return Number(trimmed);
};

export const toFinite = (value, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = parseNumericString(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
};

export const clamp = (value, min, max) => {
  const v = toFinite(value, NaN);
  const lo = toFinite(min, -Infinity);
  const hi = toFinite(max, Infinity);

  if (!Number.isFinite(v)) return lo;
  if (v < lo) return lo;
  if (v > hi) return hi;

  return v;
};

export const safeDivide = (numerator, denominator, fallback = 0) => {
  const a = toFinite(numerator, NaN);
  const b = toFinite(denominator, NaN);

  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return fallback;
  }

  const result = a / b;

  return Number.isFinite(result) ? result : fallback;
};

export const positiveNumberOrDefault = (value, fallback = 0) => {
  const n = toFinite(value, NaN);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return n;
};

export const positiveIntegerOrDefault = (value, fallback = 0) => {
  const n = toFinite(value, NaN);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.floor(n);
};

export const toArray = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value);
  }

  return [];
};

export const ensureArray = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value);
  }

  return [];
};

export const normalizeProbability = (value) => {
  const p = toFinite(value, NaN);

  if (!Number.isFinite(p)) return NaN;

  if (p >= 0 && p <= 1) return p;

  if (p > 1 && p <= 100) return p / 100;

  return clamp(p, 0, 1);
};

export const normalizePercent = (value, fallback = 0) => {
  const p = normalizeProbability(value);

  if (!Number.isFinite(p)) return fallback;

  return clamp(p * 100, 0, 100);
};
```

---

# 6. UTILITÁRIOS, CALIBRAÇÃO E MAPEADORES (UTILS)

## `src/utils/chartDataMappers.js` <a id="src-utils-chartdatamappers-js"></a>

- **Localização:** `src/utils/chartDataMappers.js`
- **Linhas:** 237
- **Tamanho:** 10.00 KB

```javascript
/**
 * Mapper functions to transform application state into chart-ready data
 */
import { normalizeDate, getDateKey } from './dateHelper.js';
import { toArray } from './normalize.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toFiniteNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const sanitizeMinutes = (value) => Math.min(720, Math.max(0, toFiniteNumber(value, 0)));

// T-010 FIX: Fórmula correta de meia-vida.
// Antes: Math.exp(-days / halfLife)
// Isso fazia a retenção cair para ~36.8% quando days === halfLife.
// O correto para meia-vida é usar ln(2).
const retentionFromHalfLife = (days, halfLife) => {
    const safeDays = Math.max(0, Number(days) || 0);
    const safeHalfLife = Math.max(1e-6, Number(halfLife) || 1);

    return Math.round(100 * Math.exp(-Math.LN2 * safeDays / safeHalfLife));
};

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
    // T-023 FIX: aceitar categories como array ou objeto Firebase
    const safeCategories = toArray(categories);
    
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
            const retention = retentionFromHalfLife(days, halfLife);
            
            data.push({
                nomeTopico: cat.name,
                diasSemRevisao: Math.floor(days),
                nivelCritico: 100 - retention,
                isTask: false
            });
        }
        
        // Add specific tasks if they have high impact
        // T-023 FIX: normalizar tasks como array, mesmo quando armazenadas como objeto.
        const taskArray = toArray(cat?.tasks);

        if (taskArray.length > 0) {
            taskArray.forEach(task => {
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
                    const retention = retentionFromHalfLife(days, halfLife);
                    
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

const getStudyLogMinutes = (log) => {
    if (!log || typeof log !== 'object') return 0;
    const minutes = Number(log.minutes);
    const duration = Number(log.duration);
    if (Number.isFinite(minutes) && minutes > 0) return sanitizeMinutes(minutes);
    if (Number.isFinite(duration) && duration > 0) return sanitizeMinutes(duration);
    return 0;
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
        // T-024 FIX: usar setDate em vez de subtrair ms,
        // reduzindo problemas de DST/edge cases.
        const d = new Date(todayMidday);
        d.setDate(d.getDate() - i);

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
            // BUGFIX: Suporte a minutes ou duration com fallback robusto quando minutes === 0
            const minutes = getStudyLogMinutes(log);
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
        const actualMinutes = getStudyLogMinutes(log);
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

## `src/utils/explanationEngine.js` <a id="src-utils-explanationengine-js"></a>

- **Localização:** `src/utils/explanationEngine.js`
- **Linhas:** 171
- **Tamanho:** 4.50 KB

```javascript
// ==========================================
// HUMAN EXPLANATION ENGINE
// Traduz telemetria matemática em linguagem natural
// ==========================================

export function buildHumanExplanation({
    calibrationPenalty,
    volatility,
    trend,
    confidenceTier,
    intervalWidth,
}) {
    const messages = [];

    if (confidenceTier === 'HIGH') {
        messages.push('Seu desempenho recente está consistente.');
    }

    if (volatility > 15) {
        messages.push('Suas notas recentes oscilaram bastante.');
    }

    if (trend > 5) {
        messages.push('Seu desempenho mostrou melhora recente.');
    }

    if (trend < -5) {
        messages.push('Seu desempenho recente apresentou queda.');
    }

    if (calibrationPenalty > 0.08) {
        messages.push('O sistema ampliou a margem de incerteza para evitar excesso de confiança.');
    }

    if (intervalWidth > 40) {
        messages.push('A faixa provável ficou mais ampla devido à alta variabilidade recente.');
    }

    return messages;
}

export function getConfidenceTier({
    calibrationPenalty,
    volatility,
    sampleSize,
}) {
    // Tolerância adaptativa: volatility is absolute standard deviation, max 100
    // calibrationPenalty is between 0 and 1. 0.1 means 10% penalty.
    const instability = (calibrationPenalty * 100) + (volatility * 0.2);

    if (sampleSize < 3) {
        return {
            tier: 'LOW',
            label: 'Baixa confiabilidade (Poucos dados)',
            color: '#ef4444',
            glow: 'shadow-red-500/30',
        };
    }

    if (instability < 18) {
        return {
            tier: 'HIGH',
            label: 'Alta confiabilidade',
            color: '#22c55e',
            glow: 'shadow-green-500/30',
        };
    }

    if (instability < 35) {
        return {
            tier: 'MEDIUM',
            label: 'Confiabilidade moderada',
            color: '#f59e0b',
            glow: 'shadow-yellow-500/30',
        };
    }

    return {
        tier: 'LOW',
        label: 'Baixa confiabilidade',
        color: '#ef4444',
        glow: 'shadow-red-500/30',
    };
}

export function detectPerformanceDrift({
    recentMean,
    baselineMean,
    recentVolatility,
    maxScore = 100,
}) {
    const alerts = [];
    const scale = maxScore / 100;

    if (recentMean < baselineMean - (12 * scale)) {
        alerts.push({
            type: 'performance_drop',
            severity: 'high',
            message: 'Seu desempenho recente caiu significativamente.',
        });
    }

    if (recentVolatility > (20 * scale)) {
        alerts.push({
            type: 'high_volatility',
            severity: 'medium',
            message: 'Suas notas recentes estão muito instáveis.',
        });
    }

    return alerts;
}

export function buildPredictionMood({
    probability,
    confidenceTier,
}) {
    if (probability >= 80 && confidenceTier === 'HIGH') {
        return 'stable';
    }
    if (probability >= 50 && probability < 80) {
        return 'moderate';
    }
    if (probability < 50 && probability > 0) {
        return 'risk';
    }
    return 'unknown';
}

export function normalizeAlertSeverity(severity, confidenceTier) {
    if (severity === 'high' && confidenceTier === 'LOW') {
        return {
            color: '#f59e0b',
            label: 'Atenção moderada',
            glow: 'shadow-orange-500/20'
        };
    }
    return {
        color: '#ef4444',
        label: 'Alerta importante',
        glow: 'shadow-red-500/20'
    };
}

export function smoothConfidenceTier({ previousTier, currentTier, stabilityCounter = 0 }) {
    if (previousTier && previousTier !== currentTier && stabilityCounter < 3) {
        return { tier: previousTier, stabilityCounter: stabilityCounter + 1 };
    }
    return { tier: currentTier, stabilityCounter: 0 };
}

export function humanizeVolatility(sd) {
    if (sd < 8) return 'Muito estável';
    if (sd < 18) return 'Relativamente estável';
    if (sd < 30) return 'Oscilação moderada';
    return 'Alta instabilidade';
}

export function validatePrediction({ probability, interval, confidenceTier }) {
    if (Number.isNaN(probability)) {
        throw new Error('Invalid probability');
    }
    if (interval.low > interval.high) {
        throw new Error('Invalid conformal interval');
    }
    if (!confidenceTier) {
        throw new Error('Missing confidence tier');
    }
    return true;
}
```

---

## `src/utils/calibration.js` <a id="src-utils-calibration-js"></a>

- **Localização:** `src/utils/calibration.js`
- **Linhas:** 396
- **Tamanho:** 18.90 KB

```javascript
import { kahanSum } from '../engine/math/kahan.js';
import { getDateKey } from './dateHelper.js';
import { getSafeScore } from './scoreHelper.js';
import { isSubjectMatch } from './normalization.js';

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

// [LOTE 5] PAV extraído para reuso com restrição de bloco mínimo
function pavBlocks(blocks) {
  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].mean <= blocks[i + 1].mean) { i++; continue; }
    const a = blocks[i], b = blocks[i + 1];
    const merged = { minX: a.minX, maxX: b.maxX, sumWY: a.sumWY + b.sumWY, sumW: a.sumW + b.sumW, mean: 0 };
    merged.mean = merged.sumWY / merged.sumW;
    blocks.splice(i, 2, merged);
    if (i > 0) i--;
  }
  return blocks;
}

export function computeBrierScore(probability01, observedBinary) {
  const rawP = Number(probability01);
  if (!Number.isFinite(rawP)) return null;
  const p = Math.max(0, Math.min(1, rawP));
  const y = observedBinary ? 1 : 0;
  return (p - y) ** 2;
}

export function computeLogLoss(probability01, observedBinary) {
  const epsilon = 1e-15;
  const rawP = Number(probability01);
  const safeP = Number.isFinite(rawP) ? rawP : 0.5;
  const p = Math.max(epsilon, Math.min(1 - epsilon, safeP));
  const y = observedBinary ? 1 : 0;
  return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
}

export function summarizeCalibration(scores = [], options = {}) {
  const maxPenalty = Math.max(0, Math.min(1, Number(options.maxPenalty) || 0.25));
  const baseline = Number.isFinite(options.baseline) ? options.baseline : 0.18;
  // FIX M5: entrada vazia NÃO retorna mais "Brier 0 = perfeito"
  if (!Array.isArray(scores) || scores.length === 0) {
    return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  }
  const finiteScores = scores.map(v => Number(v)).filter(Number.isFinite);
  if (finiteScores.length === 0) return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  const sorted = [...finiteScores].sort((a, b) => a - b);
  const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
  const core = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
  const avgBrier = kahanSum(core) / core.length;
  const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
  return { avgBrier, calibrationPenalty, sampleSize: finiteScores.length };
}

export function computeCalibrationDiagnostics(pairs = [], options = {}) {
  const bins = Math.max(2, Number(options.bins) || 5);
  if (!Array.isArray(pairs) || pairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };
  const cleanPairs = pairs
    .map((p) => ({
      probability: Math.max(0, Math.min(1, Number(p?.probability))),
      observed: Math.max(0, Math.min(1, Number(p?.observed)))
    }))
    .filter((p) => Number.isFinite(p.probability) && Number.isFinite(p.observed));
  if (cleanPairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };
  const sorted = [...cleanPairs].sort((a, b) => a.probability - b.probability);
  let ece = 0;
  let mce = 0;
  const reliability = [];
  const overallObserved = kahanSum(cleanPairs.map(p => p.observed)) / cleanPairs.length;
  let relTerm = 0;
  let resTerm = 0;
  // [LOTE 5] ECE equal-frequency quando n < 20 (menos variância); equal-width p/ n grande
  const strategy = options.binStrategy || 'auto';
  const useQuantile = strategy === 'quantile' || (strategy === 'auto' && cleanPairs.length < 20);
  const edges = [];
  for (let i = 0; i <= bins; i++) {
    if (i === 0) edges.push(-0.01);
    else if (i === bins) edges.push(1.01);
    else if (!useQuantile) edges.push(i / bins);
    else edges.push(sorted[Math.floor((i / bins) * (sorted.length - 1))].probability);
  }
  for (let i = 1; i < edges.length - 1; i++) edges[i] = Math.max(edges[i], edges[i - 1] + 1e-6);
  for (let i = 0; i < bins; i++) {
    const binMin = edges[i];
    const binMax = edges[i + 1];
    const slice = sorted.filter(p => p.probability >= binMin && p.probability < binMax);
    if (slice.length === 0) continue;
    const meanPred = kahanSum(slice.map(p => p.probability)) / slice.length;
    const observedRate = kahanSum(slice.map(p => p.observed)) / slice.length;
    const gap = Math.abs(meanPred - observedRate);
    const weight = slice.length / cleanPairs.length;
    ece += weight * gap;
    mce = Math.max(mce, gap);
    relTerm += weight * ((meanPred - observedRate) ** 2);
    resTerm += weight * ((observedRate - overallObserved) ** 2);
    reliability.push({ bin: i + 1, binMin, binMax, count: slice.length, meanPred, observedRate, gap });
  }
  const uncertainty = overallObserved * (1 - overallObserved);
  return { ece, mce, reliability, brierDecomposition: { reliability: relTerm, resolution: resTerm, uncertainty } };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
  const p = Math.max(0, Math.min(100, probabilityPct ?? 0));
  const limit = Math.max(0, Math.min(1, maxAppliedPenalty ?? 0.5));
  const k = Math.max(0, Math.min(limit, penalty ?? 0));
  const neutral = Math.max(0, Math.min(100, neutralPct ?? 50));
  return p * (1 - k) + neutral * k;
}

// FIX: sem storeUpdateFn — retorna evento validado (loop de aprendizagem)
export function recordPredictionEvent(prediction = {}) {
  const prob = clamp01(prediction.probability);
  return {
    timestamp: Number.isFinite(Number(prediction.timestamp)) ? Number(prediction.timestamp) : Date.now(),
    probability: prob,
    probabilityRaw: Number.isFinite(Number(prediction.probabilityRaw)) ? clamp01(prediction.probabilityRaw) : prob,
    observed: prediction.observed != null ? (prediction.observed ? 1 : 0) : null,
    targetScore: Number.isFinite(Number(prediction.targetScore)) ? Number(prediction.targetScore) : null,
    sims: Number(prediction.sims) || 5000,
    category: prediction.category || 'global',
    effectiveN: Number.isFinite(Number(prediction.effectiveN)) ? Number(prediction.effectiveN) : null
  };
}

export function computeCalibrationSummary(events = [], options = {}) {
  const clean = (events || []).filter(e =>
    Number.isFinite(e?.probability) && (e?.observed === 0 || e?.observed === 1)
  );
  if (clean.length < 3) {
    return { n: clean.length, ece: 0, avgBrier: 0, reliability: [], trend: 'insufficient_data' };
  }
  const diag = computeCalibrationDiagnostics(clean.map(e => ({ probability: e.probability, observed: e.observed })), { bins: options.bins || 6 });
  const briers = clean.map(e => computeBrierScore(e.probability, e.observed));
  const avgBrier = kahanSum(briers) / briers.length;
  const mid = Math.floor(clean.length / 2);
  const firstHalf = briers.slice(0, mid);
  const secondHalf = briers.slice(mid);
  const firstAvg = firstHalf.length ? kahanSum(firstHalf) / firstHalf.length : avgBrier;
  const secondAvg = secondHalf.length ? kahanSum(secondHalf) / secondHalf.length : avgBrier;
  const trend = secondAvg < firstAvg * 0.92 ? 'improving' : (secondAvg > firstAvg * 1.08 ? 'degrading' : 'stable');
  return {
    n: clean.length, ece: diag.ece, mce: diag.mce,
    avgBrier: Number(avgBrier.toFixed(4)),
    reliability: diag.reliability, trend, brierDecomposition: diag.brierDecomposition
  };
}

// FIX M4: imutável, causal (ts >= evento) e targetScore null-safe
export function backfillObservedFromSimulados(calibrationEvents = [], simuladoRows = [], _categories = [], maxScore = 100) {
  if (!Array.isArray(calibrationEvents)) return [];
  if (!Array.isArray(simuladoRows) || simuladoRows.length === 0) return calibrationEvents;
  const timed = simuladoRows
    .map(row => ({ row, ts: Date.parse(row?.date || row?.createdAt) }))
    .filter(x => Number.isFinite(x.ts))
    .sort((a, b) => a.ts - b.ts);
  if (timed.length === 0) return calibrationEvents;
  return calibrationEvents.map(ev => {
    if (!ev || ev.observed != null || !ev.category) return ev;
    if (ev.targetScore == null || !Number.isFinite(Number(ev.timestamp))) return ev;
    const hit = timed.find(x =>
      x.ts >= Number(ev.timestamp) &&
      isSubjectMatch(ev.category, x.row.subject || x.row.categoryName)
    );
    if (!hit) return ev;
    const score = getSafeScore(hit.row, maxScore);
    if (!Number.isFinite(score)) return ev;
    return { ...ev, observed: score >= Number(ev.targetScore) ? 1 : 0, backfilled: true, observedAt: hit.ts };
  });
}

// FIX F1: baseline posterior que aprende (fallback avgBrier + pesos corretos)
export function computeRollingCalibrationParams(history = [], cfg = {}) {
  const safeHistory = Array.isArray(history) ? history : [];
  const windowDays = Number(cfg.windowDays) || 60;
  const cutoff = Date.now() - windowDays * 86400000;
  const maxSamples = Number(cfg.maxSamples) || 20;

  const isSignalEvent = (h) => {
    if (!h || !Number.isFinite(Number(h?.timestamp))) return false;
    const hasObserved = Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1);
    const hasBrier = Number.isFinite(Number(h.avgBrier));
    return hasObserved || hasBrier;
  };

  const recent = safeHistory
    .filter(h => isSignalEvent(h) && Number(h.timestamp) >= cutoff)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .slice(-maxSamples);

  const minSamples = Number(cfg.minSamples) || 4;
  if (recent.length < minSamples) {
    return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  }
  const isPct = recent.some(r => Number(r.probability) > 1);
  const now = Date.now();
  const LAMBDA = Math.log(2) / (14 * 86400000);
  let sw = 0, swb = 0;
  for (const h of recent) {
    let b = null;
    if (Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1)) {
      const p = (isPct || Number(h.probability) > 1) ? Number(h.probability) / 100 : Number(h.probability);
      b = (p - h.observed) ** 2;
    } else if (Number.isFinite(Number(h.avgBrier))) {
      b = Number(h.avgBrier);
    }
    if (b === null) continue;
    const w = Math.exp(-LAMBDA * Math.max(0, now - Number(h.timestamp)));
    swb += b * w; sw += w;
  }
  if (sw <= 1e-9) return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  const kappa = Number(cfg.priorStrength) || 6;
  const mu0 = Number(cfg.baseline) || 0.2;
  const baseline = (swb + kappa * mu0) / (sw + kappa);
  const avgBrier = swb / sw;
  const confidenceFactor = Math.min(1, recent.length / (Number(cfg.targetSamples) || 12));
  const maxPenalty = (avgBrier > 0.25 ? 0.35 : 0.25) * confidenceFactor
                   + (cfg.maxPenalty ?? 0.3) * (1 - confidenceFactor);
  return { baseline, maxPenalty, confidenceFactor, avgBrier };
}

export const CRITICAL_BRIER_THRESHOLD = 0.28;
export const HIGH_PENALTY_THRESHOLD = 0.20;
export const ALERT_COOLDOWN_MS = 1000 * 60 * 60 * 12;

// [LOTE 5] PAV com bloco mínimo anti-escada
export function fitIsotonicCalibration(pairs = [], options = {}) {
  const clean = (pairs || [])
    .map(p => ({ x: Number(p?.probability), y: Number(p?.observed) }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x);
  if (clean.length === 0) return [];
  let blocks = pavBlocks(clean.map(p => ({ minX: p.x, maxX: p.x, sumWY: p.y, sumW: 1, mean: p.y })));
  const minBlock = Math.max(2, Math.floor(clean.length / (Number(options.maxBlocks) || 6)));
  let guard = 0;
  while (blocks.length > 1 && blocks.some(b => b.sumW < minBlock) && guard++ < 24) {
    const idx = blocks.findIndex(b => b.sumW < minBlock);
    const left = blocks[idx - 1];
    const right = blocks[idx + 1];
    const useLeft = left && (!right || Math.abs(left.mean - blocks[idx].mean) <= Math.abs(right.mean - blocks[idx].mean));
    const j = useLeft ? idx - 1 : idx + 1;
    const a = blocks[Math.min(idx, j)];
    const b = blocks[Math.max(idx, j)];
    blocks.splice(Math.min(idx, j), 2, {
      minX: a.minX, maxX: b.maxX,
      sumWY: a.sumWY + b.sumWY, sumW: a.sumW + b.sumW,
      mean: (a.sumWY + b.sumWY) / (a.sumW + b.sumW)
    });
    blocks = pavBlocks(blocks);
  }
  return blocks.map(b => ({ minX: b.minX, maxX: b.maxX, value: b.mean }));
}

// Interpolação linear entre blocos (monotônica)
export function predictIsotonicProbability(probability01, model = []) {
  const p = clamp01(probability01);
  if (!Array.isArray(model) || model.length === 0) return p;
  if (p <= model[0].minX) return clamp01(model[0].value);
  const last = model[model.length - 1];
  if (p >= last.maxX) return clamp01(last.value);
  for (let i = 0; i < model.length; i++) {
    const b = model[i];
    if (p >= b.minX && p <= b.maxX) return clamp01(b.value);
    if (p > b.maxX && i + 1 < model.length && p < model[i + 1].minX) {
      const t = (p - b.maxX) / Math.max(1e-9, model[i + 1].minX - b.maxX);
      return clamp01(b.value * (1 - t) + model[i + 1].value * t);
    }
  }
  return clamp01(last.value);
}

export function calibrateWithBBQ(probability01, pairs = [], options = {}) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: Number(x?.probability), observed: Number(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed))
    .map(x => ({ probability: clamp01(x.probability), observed: clamp01(x.observed) }));
  if (clean.length < 4) return p;
  const sorted = [...clean].sort((a, b) => a.probability - b.probability);
  const bins = Math.max(2, Math.min(10, Number(options.bins) || Math.round(Math.sqrt(sorted.length))));
  const alpha0 = Math.max(0.1, Number(options.alpha0) || 0.5);
  const beta0 = Math.max(0.1, Number(options.beta0) || 0.5);
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * sorted.length / bins);
    const end = Math.floor((i + 1) * sorted.length / bins);
    const slice = sorted.slice(start, end);
    if (slice.length === 0) continue;
    const isFirstBin = (i === 0);
    const isLastBin = (i === bins - 1);
    const lo = isFirstBin ? -0.01 : sorted[start].probability;
    const hi = isLastBin ? 1.01 : sorted[end].probability;
    if (!(p >= lo && (p < hi || isLastBin))) continue;
    const succ = kahanSum(slice.map(x => x.observed));
    const n = slice.length;
    return (succ + alpha0) / (n + alpha0 + beta0);
  }
  return p;
}

// FIX F4: conformal real (resíduos) + teto 0.35 + piso = ruído amostral
export function conformalizedCalibrationInterval(probability01, pairs = [], alpha = 0.1) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: clamp01(x?.probability), observed: clamp01(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed));
  if (clean.length < 8) {
    let low = p - 0.15;
    let high = p + 0.15;
    if (high > 1) { low -= (high - 1); high = 1; }
    if (low < 0) { high += (0 - low); low = 0; }
    return { low: Math.max(0, low), high: Math.min(1, high), qHat: 0.15 };
  }
  const n = clean.length;
  const residuals = clean.map(x => Math.abs(x.probability - x.observed)).sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(n - 1, Math.ceil((1 - alpha) * n) - 1));
  const qConformal = residuals[idx] * ((n + 1) / n);
  const smoothedP = (p * n + 0.5) / (n + 1);
  const standardError = Math.sqrt((smoothedP * (1 - smoothedP)) / n);
  const zScore = alpha <= 0.05 ? 1.96 : (alpha <= 0.1 ? 1.645 : 1.28);
  const qHat = Math.min(0.35, Math.max(qConformal, standardError * zScore));
  let low = p - qHat;
  let high = p + qHat;
  if (high > 1) { low -= (high - 1); high = 1; }
  if (low < 0) { high += (0 - low); low = 0; }
  return { low: Math.max(0, low), high: Math.min(1, high), qHat };
}

// FIX F3: Akaike weights + complexidade + shrink p/ uniforme
export function computeStackingWeights(candidateProbs = [], observed = [], complexityParams = [0, 4, 6]) {
  const k = Array.isArray(candidateProbs) ? candidateProbs.length : 0;
  if (k === 0) return [];
  const n = Array.isArray(observed) ? observed.length : 0;
  if (n === 0) return new Array(k).fill(1 / k);
  const logLoss = candidateProbs.map(series => {
    if (!Array.isArray(series) || series.length !== n) return 1e6;
    let acc = 0;
    for (let i = 0; i < n; i++) acc += computeLogLoss(series[i], observed[i]);
    return acc / n;
  });
  const aic = logLoss.map((l, m) => 2 * l * n + 2 * (Number(complexityParams[m]) || 0));
  const minAic = Math.min(...aic);
  const raw = aic.map(a => Math.exp(-0.5 * (a - minAic)));
  const z = kahanSum(raw) || 1;
  const maxLoss = Math.max(...logLoss);
  const isSeverePenalty = maxLoss > 2.0;
  const lambda = Math.min(1, Math.max(0, n / (n + (isSeverePenalty ? 0.2 : 4))));
  return raw.map(w => lambda * (w / z) + (1 - lambda) / k);
}

export function buildCalibrationDashboardSeries(events = []) {
  const clean = (events || [])
    .map(e => ({
      timestamp: Number(e?.timestamp),
      avgBrier: Number(e?.avgBrier),
      ece: Number(e?.ece),
      calibrationPenalty: Number(e?.calibrationPenalty),
      probability: Number(e?.probability)
    }))
    .filter(e => Number.isFinite(e.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (clean.length === 0) {
    return { trend: [], rolling7: [], controlLimits: { brierMean: null, brierUpper95: null, brierLower95: null }, driftSignals: [] };
  }
  const briers = clean.map(e => Number.isFinite(e.avgBrier) ? e.avgBrier : null).filter(v => v !== null);
  const mean = briers.length > 0 ? kahanSum(briers) / briers.length : null;
  const sd = briers.length > 1
    ? Math.sqrt(kahanSum(briers.map(v => (v - mean) ** 2)) / (briers.length - 1))
    : 0;
  const trend = clean.map(e => ({
    timestamp: e.timestamp,
    date: getDateKey(new Date(e.timestamp)),
    avgBrier: Number.isFinite(e.avgBrier) ? e.avgBrier : null,
    ece: Number.isFinite(e.ece) ? e.ece : null,
    penalty: Number.isFinite(e.calibrationPenalty) ? e.calibrationPenalty : null,
    probability: Number.isFinite(e.probability) ? e.probability : null
  }));
  const rolling7 = trend.map((row, idx) => {
    const startTs = row.timestamp - (7 * 24 * 60 * 60 * 1000);
    const win = trend.slice(0, idx + 1).filter(r => r.timestamp >= startTs && Number.isFinite(r.avgBrier));
    const winMean = win.length > 0 ? (win.reduce((a, b) => a + b.avgBrier, 0) / win.length) : null;
    return { timestamp: row.timestamp, date: row.date, avgBrier7d: winMean };
  });
  const controlLimits = mean === null
    ? { brierMean: null, brierUpper95: null, brierLower95: null }
    : { brierMean: mean, brierUpper95: mean + 2 * sd, brierLower95: Math.max(0, mean - 2 * sd) };
  const driftSignals = trend.map((row) => ({
    timestamp: row.timestamp,
    date: row.date,
    outOfControl: mean !== null && Number.isFinite(row.avgBrier)
      ? row.avgBrier > (controlLimits.brierUpper95 ?? Infinity)
      : false
  }));
  return { trend, rolling7, controlLimits, driftSignals };
}
```

---

## `src/utils/calibrationTelemetry.js` <a id="src-utils-calibrationtelemetry-js"></a>

- **Localização:** `src/utils/calibrationTelemetry.js`
- **Linhas:** 89
- **Tamanho:** 3.19 KB

```javascript
const TELEMETRY_KEY = 'coach_calibration_events_v1';
const TELEMETRY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;

async function sendToFirebaseAnalytics(metric) {
    try {
        const { analytics, isLocalMode } = await import('../services/firebase.js');
        if (isLocalMode || !analytics) return;
        const { logEvent } = await import('firebase/analytics');
        logEvent(analytics, 'coach_calibration_event', {
            event_type: String(metric.eventType || 'calibration'),
            category_id: String(metric.categoryId || 'unknown'),
            avg_brier: Number(metric.avgBrier || 0),
            calibration_penalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
        });
    } catch {
        // analytics unavailable in this runtime
    }
}

export function logCalibrationTelemetryEvent(metric) {
    if (!metric || !metric.categoryId) return;
    try {
        const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
        const current = Array.isArray(currentRaw) ? currentRaw : [];
        const normalizedMetric = {
            eventType: metric.eventType || 'calibration',
            categoryId: String(metric.categoryId || 'unknown'),
            avgBrier: Number(metric.avgBrier || 0),
            calibrationPenalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
            ece: Number(metric.ece || 0),
            timestamp: Number(metric.timestamp || Date.now())
        };
        const cutoff = Date.now() - TELEMETRY_RETENTION_MS;
        const next = [...current, normalizedMetric]
            .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= cutoff)
            .slice(-1000);
        localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
        void sendToFirebaseAnalytics(normalizedMetric);
    } catch {
        // best effort telemetry
    }
}

export function getCalibrationTelemetrySummary(categoryId = null) {
  try {
    const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
    const current = Array.isArray(currentRaw) ? currentRaw : [];
    const filtered = categoryId
      ? current.filter(item => String(item.categoryId) === String(categoryId))
      : current;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgBrier: null,
        avgPenalty: null,
        lastTimestamp: null
      };
    }

    const totalBrier = filtered.reduce((sum, item) => sum + Number(item.avgBrier || 0), 0);
    const totalPenalty = filtered.reduce((sum, item) => sum + Number(item.calibrationPenalty || 0), 0);

    return {
      count: filtered.length,
      avgBrier: Number((totalBrier / filtered.length).toFixed(4)),
      avgPenalty: Number((totalPenalty / filtered.length).toFixed(4)),
      lastTimestamp: filtered[filtered.length - 1]?.timestamp || null
    };
  } catch {
    return {
      count: 0,
      avgBrier: null,
      avgPenalty: null,
      lastTimestamp: null
    };
  }
}

export function clearCalibrationTelemetry() {
  try {
    localStorage.removeItem(TELEMETRY_KEY);
  } catch {
    // ignore
  }
}
```

---

## `src/utils/ProgressStateEngine.js` <a id="src-utils-progressstateengine-js"></a>

- **Localização:** `src/utils/ProgressStateEngine.js`
- **Linhas:** 243
- **Tamanho:** 9.84 KB

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
    let scaled_low = low_level_limit * scaleFactor;
    let scaled_high = high_level_limit * scaleFactor;
    let scaled_mastery = mastery_limit * scaleFactor;

    // T-035 FIX: Blindagem contra configs inválidas ou meta menor que o limite baixo.
    if (!Number.isFinite(scaled_low)) scaled_low = 60 * scaleFactor;
    if (!Number.isFinite(scaled_high)) scaled_high = 75 * scaleFactor;
    if (!Number.isFinite(scaled_mastery)) scaled_mastery = 80 * scaleFactor;

    // Garantir ordem lógica: low <= high <= mastery
    if (scaled_high < scaled_low) {
        scaled_high = scaled_low;
    }

    if (scaled_mastery < scaled_high) {
        scaled_mastery = scaled_high;
    }

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

## `src/utils/analytics.js` <a id="src-utils-analytics-js"></a>

- **Localização:** `src/utils/analytics.js`
- **Linhas:** 1076
- **Tamanho:** 39.62 KB

```javascript
import { getXPProgress } from './gamification.js';
import { normalizeDate, getLocalMidnight, getDateKey, parseNoonLocal, getFlashcardTodayKey, getFlashcardNextDueKey } from './dateHelper.js';
import { getSafeScore, getSyntheticTotal } from './scoreHelper.js';
import { safeDate } from '../engine/math/date.js';
import { format } from 'date-fns';
import { toFinite } from '../engine/math/safe.js';
import { toArray } from './normalize.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// T-024 FIX: helper para ancorar "hoje" em America/Manaus (UTC-4).
// Se o timezone do app mudar, este offset precisa acompanhar APP_TIMEZONE.
const getManausDayRange = (dateInput) => {
    const key = getDateKey(dateInput);

    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return null;
    }

    const [year, month, day] = key.split('-').map(Number);

    // America/Manaus é UTC-4.
    // Meia-noite de Manaus = 04:00 UTC.
    const start = Date.UTC(year, month - 1, day, 4, 0, 0, 0);

    return {
        key,
        start,
        end: start + MS_PER_DAY
    };
};

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

// T-024 FIX: fallback seguro entre minutes e duration.
// Se minutes === 0 mas duration > 0, ainda aproveitamos duration.
export const getStudyMinutes = (entry) => {
    const minutes = toFinite(entry?.minutes, 0);
    const duration = toFinite(entry?.duration, 0);

    if (Number.isFinite(minutes) && minutes > 0) return minutes;
    if (Number.isFinite(duration) && duration > 0) return duration;

    return 0;
};

/**
 * Conta pomodoros concluídos hoje a partir dos studyLogs.
 * extraCompletedCycles cobre blocos de foco da sessão ativa ainda não persistidos em log.
 */
export const countPomodorosToday = (studyLogs, pomodoroWork = 25, extraCompletedCycles = 0) => {
    const logsArray = toArray(studyLogs);
    const workDuration = Math.max(1, Number(pomodoroWork) || 25);

    // T-024 FIX: usar chave de dia consistente, com fallback por timestamp.
    const todayRange = getManausDayRange(new Date());
    const todayKey = getDateKey(new Date());

    const minutesToday = logsArray.reduce((sum, log) => {
        const d = safeDate(log?.date);
        if (!d) return sum;

        // Fonte primária: chave do dia
        if (getDateKey(d) === todayKey) {
            return sum + getStudyMinutes(log);
        }

        // Fallback defensivo: timestamp dentro do range do dia
        const t = d.getTime();
        if (todayRange && t >= todayRange.start && t < todayRange.end) {
            return sum + getStudyMinutes(log);
        }

        return sum;
    }, 0);

    const pomodorosFromLogs = Number.isFinite(minutesToday)
        ? Math.floor(minutesToday / workDuration)
        : 0;

    const safeExtra = Math.max(0, Number(extraCompletedCycles) || 0);

    return pomodorosFromLogs + safeExtra;
};

/** Total de pomodoros (vida útil) baseado em minutos reais, não contagem de sessões. */
export const countPomodorosTotal = (studyLogs, studySessions, pomodoroWork = 25) => {
    const workDuration = Math.max(1, Number(pomodoroWork) || 25);

    // T-019/T-024 FIX: normalizar entradas
    const logsArray = toArray(studyLogs);
    const sessionsArray = toArray(studySessions);

    const logsMinutes = logsArray.reduce((sum, log) => sum + getStudyMinutes(log), 0);
    const sessionsMinutes = sessionsArray.reduce((sum, s) => sum + getStudyMinutes(s), 0);
    
    const totalMinutes = Math.max(logsMinutes, sessionsMinutes);

    return Math.floor(totalMinutes / workDuration);
};

const aggregateQuestionAccuracy = (contestData) => {
    // T-011 FIX: garantir que correct nunca ultrapasse total.
    const clampCorrect = (correct, total) => {
        const t = Number(total);
        if (!Number.isFinite(t) || t <= 0) return 0;

        const c = Number(correct);
        if (!Number.isFinite(c)) return 0;

        return Math.max(0, Math.min(t, c));
    };

    const validSimulados = toArray(contestData?.simuladoRows).filter(
        r => r?.validated && Number(r?.total) > 0 && r?.correct !== undefined
    );

    let totalQuestions = 0;
    let totalCorrect = 0;

    validSimulados.forEach(r => {
        const t = Number(r.total);
        if (!Number.isFinite(t) || t <= 0) return;

        totalQuestions += t;
        totalCorrect += clampCorrect(r.correct, t);
    });

    // Only supplement from history if we have no explicit validated rows
    if (validSimulados.length === 0 || totalQuestions === 0) {
        toArray(contestData?.categories).forEach(cat => {
            const maxS = Number(cat?.maxScore) || 100;
            const syntheticTotal = getSyntheticTotal(maxS);

            const histArr = toArray(cat?.simuladoStats?.history);

            histArr.forEach(e => {
                let t = Number(e?.total) || 0;
                let c = 0;

                if (t > 0) {
                    c = e?.correct !== undefined
                        ? Number(e.correct)
                        : Math.round((getSafeScore(e, maxS) / maxS) * t);
                } else if (e?.score != null) {
                    t = syntheticTotal;
                    c = Math.round((getSafeScore(e, maxS) / maxS) * t);
                }

                if (!Number.isFinite(t) || t <= 0) return;

                c = clampCorrect(c, t);

                totalQuestions += t;
                totalCorrect += c;
            });
        });
    }

    // T-011 FIX: blindagem final contra dados corrompidos
    totalCorrect = Math.max(0, Math.min(totalQuestions, totalCorrect));

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

    // T-019 FIX: normalizar dados de forma consistente
    const studyLogs = toArray(contestData?.studyLogs);
    const studySessions = toArray(contestData?.studySessions);

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

    const categoriesArray = toArray(contestData?.categories);

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
            // T-024 FIX: usar getDateKey em vez de timestamp local
            const todayKey = getDateKey(new Date());

            return studyLogs.filter(log =>
                log?.type === 'flashcard' &&
                getDateKey(log?.date) === todayKey
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
    // T-019 FIX: aceitar objeto Firebase
    const safeCategories = toArray(categories);
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
        // T-019 FIX: tasks podem ser objeto
        const tasks = toArray(c?.tasks);
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
    // T-019 FIX: normalização universal
    const safeCategories = toArray(categories);
    const safeLogs = toArray(studyLogs);

    // T-024 FIX: se duration vier 0 mas minutes existir, usa minutes.
    const getMinutes = (entry) => {
        const minutes = Number(entry?.minutes);
        const duration = Number(entry?.duration);

        if (Number.isFinite(minutes) && minutes > 0) return Math.max(0, minutes);
        if (Number.isFinite(duration) && duration > 0) return Math.max(0, duration);

        return 0;
    };

    const totalMinutes = safeLogs.length > 0
        ? safeLogs.reduce((sum, l) => sum + getMinutes(l), 0)
        : safeCategories.reduce((sum, c) => sum + Math.max(0, Number(c?.totalMinutes) || 0), 0);
    // Bug fix: optional chaining on c.tasks throughout to avoid crash if tasks is undefined
    // T-019 FIX: tasks normalizadas
    const totalTasks = safeCategories.reduce((sum, c) => {
        return sum + toArray(c?.tasks).length;
    }, 0);

    const completedTasks = safeCategories.reduce((sum, c) => {
        return sum + toArray(c?.tasks).filter(t => t?.completed).length;
    }, 0);

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
    // T-019 FIX: tasks normalizadas
    const highPriorityTasks = safeCategories.flatMap(c =>
        toArray(c?.tasks).filter(t => t?.priority === 'high')
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
    // T-019 FIX: normalização universal
    const categoriesArray = toArray(categories);
    const now = new Date();
    // BUG-02 FIX: Usar âncora de 12:00:00 para comparação de dias, 
    // garantindo paridade com o resto do sistema de datas (dateHelper).
    const normalizedNow = normalizeDate(now).getTime();
    const warnings = [];

    // Fix 3: Pre-index logs by taskId and categoryId to avoid O(logs) filter inside each loop
    const logsByTaskId = {};
    const logsByCategoryId = {};
    const logsArray = toArray(studyLogs);
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
            const matchingCat = categoriesArray.find(c => c.name === log.categoryName);
            if (matchingCat) {
                if (!logsByCategoryId[matchingCat.id]) logsByCategoryId[matchingCat.id] = [];
                logsByCategoryId[matchingCat.id].push(log);
            }
        }
    });

    // 1. Tarefas de alta prioridade sem progresso recente
    categoriesArray.forEach(cat => {
        // T-019 FIX: tasks normalizadas
        toArray(cat?.tasks).forEach(task => {
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
    categoriesArray.forEach(cat => {
        if (toArray(cat?.tasks).length > 0) {
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

        // T-024 FIX: remover chaves inválidas/null do set
        const uniqueDays = new Set(
            last7Days
                .map(log => getDateKey(log.date))
                .filter(Boolean)
        ).size;

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

    // T-019 FIX: normalização universal
    const safeStudySessions = toArray(studySessions);
    const safeStudyLogs = toArray(studyLogs);
    const safeCategories = toArray(categories);

    // Get dynamic goal
    const dynamicGoal = calculateDailyPomodoroGoal(safeCategories, user);
    const dailyGoalPomodoros = dynamicGoal.daily;
    const pomodoroDuration = settings?.pomodoroWork || 25;
    const dailyGoalMinutes = dailyGoalPomodoros * pomodoroDuration;

    // T-024 FIX: usar range ancorado em Manaus, com fallback local
    const todayRange = getManausDayRange(new Date()) || {
        start: getLocalMidnight().getTime(),
        end: getLocalMidnight().getTime() + MS_PER_DAY
    };

    const todaySessions = safeStudySessions.filter(s => {
        const start = safeDate(s?.startTime);
        if (!start) return false;

        const end = s?.endTime
            ? safeDate(s.endTime)
            : new Date(start.getTime() + (Number(s.duration) || 0) * 60000);

        return (
            Number.isFinite(end?.getTime()) &&
            end.getTime() > todayRange.start &&
            start.getTime() < todayRange.end
        );
    });

    let todayMinutes = 0;
    let fractionalPomodoros = 0;
    const todaySubjects = {};

    todaySessions.forEach(session => {
        const start = safeDate(session.startTime);
        if (!start) return;

        let sessionDuration = Number(session.duration) || 0;

        if (sessionDuration === 0 && session.startTime && session.endTime) {
            const end = safeDate(session.endTime);
            if (end) {
                sessionDuration = Math.round((end.getTime() - start.getTime()) / 60000);
            }
        }

        const end = session.endTime
            ? safeDate(session.endTime)
            : new Date(start.getTime() + sessionDuration * 60000);

        if (!Number.isFinite(end?.getTime())) return;

        const effectiveStart = Math.max(start.getTime(), todayRange.start);
        const effectiveEnd = Math.min(end.getTime(), todayRange.end);

        let minutesToCount = 0;
        if (effectiveEnd > effectiveStart) {
            minutesToCount = Math.round((effectiveEnd - effectiveStart) / 60000);
        }

        const safeSessionDuration = Math.max(0, Number(sessionDuration) || 0);
        minutesToCount = Math.min(safeSessionDuration, minutesToCount);

        todayMinutes += minutesToCount;
        fractionalPomodoros += (minutesToCount / pomodoroDuration);

        const cat = safeCategories.find(c => c?.id === session.categoryId);
        if (cat) {
            todaySubjects[cat.name] = (todaySubjects[cat.name] || 0) + minutesToCount;
        }
    });

    const streakSource = safeStudyLogs.length > 0
        ? safeStudyLogs
        : safeStudySessions.map(s => ({ date: s?.startTime || s?.date }));

    const streak = calculateStudyStreak(streakSource);

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
    // T-020 FIX: normalizar categories e tasks
    const categoriesArray = toArray(categories);

    const getTasks = (cat) => toArray(cat?.tasks);

    const pendingTasks = categoriesArray.reduce((sum, c) => {
        return sum + getTasks(c).filter(t => t && !t.completed).length;
    }, 0);

    const highPriorityPending = categoriesArray.reduce((sum, c) => {
        return sum + getTasks(c).filter(t => t && !t.completed && t.priority === 'high').length;
    }, 0);

    // Fórmula: 2 pomodoros por alta prioridade + 1 por tarefa normal
    const baseGoal = (highPriorityPending * 2) + (pendingTasks - highPriorityPending);

    // Ajuste por nível
    const lvl = user?.level || 1;
    const levelMultiplier = 1 + (lvl * 0.05); // 5% por nível
    const adjustedGoal = Math.ceil(baseGoal * levelMultiplier);

    // Limitar entre 3 e 12 pomodoros
    const dailyGoal = pendingTasks === 0
        ? 0
        : Math.max(3, Math.min(12, adjustedGoal));

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
    // T-019 FIX: normalização universal antes de todos os motores
    const studyLogs = toArray(data?.studyLogs);
    const categories = toArray(data?.categories);
    const user = data?.user || {};
    const settings = data?.settings || {};

    const streak = calculateStudyStreak(studyLogs);
    const balance = analyzeSubjectBalance(categories);
    const efficiency = analyzeEfficiency(categories, studyLogs, user);
    const procrastination = detectProcrastination(categories, studyLogs);
    const goals = calculateDailyPomodoroGoal(categories, user);

    const pomodoroWork = settings?.pomodoroWork || 25;
    const pomodorosToday = countPomodorosToday(studyLogs, pomodoroWork);

    return {
        performance: {
            xp: data?.user?.xp || 0,
            level: data?.user?.level || 1,
            xpProgress: getXPProgress(data?.user?.xp || 0),
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

## `src/utils/scoreHelper.js` <a id="src-utils-scorehelper-js"></a>

- **Localização:** `src/utils/scoreHelper.js`
- **Linhas:** 255
- **Tamanho:** 8.97 KB

```javascript
export const SYNTHETIC_EVIDENCE_TOTAL = 20;

export function getSyntheticTotal(_maxScore = 100) {
  return SYNTHETIC_EVIDENCE_TOTAL;
}

export const normalizePercentInput = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return n;
};

// ✅ FIX: Parser robusto para números com separadores BR (1.234,56)
export function parseLocaleNumber(value, fallback = NaN) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined) return fallback;
  
  let raw = String(value).trim();
  if (!raw) return fallback;
  
  raw = raw.replace(/\s/g, '');
  
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Formato BR: 1.234,56
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    const parts = raw.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastComma === -1 && parts.length === 2 && lastPart.length === 3) {
      // Formato US: 1.234 (milhar)
      raw = raw.replace(/\./g, '');
    } else {
      // Formato US: 1,234.56
      raw = raw.replace(/,/g, '');
    }
  } else {
    raw = raw.replace(/[,.]/g, '');
  }
  
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSafeScore(historyRow, maxScore = 100, minScore = 0) {
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMaxScore) : 0;
  
  if (typeof historyRow === 'number') {
    return Math.max(safeMinScore, Math.min(safeMaxScore, historyRow));
  }
  
  if (!historyRow) return NaN;
  
  if (historyRow.score != null) {
    let s;
    if (typeof historyRow.score === 'number') {
      s = historyRow.score;
    } else {
      // ✅ FIX: Usa parseLocaleNumber para tratar 1.234,56
      s = parseLocaleNumber(historyRow.score, NaN);
    }
    
    if (historyRow.isPercentage) {
      const pctValue = normalizePercentInput(s);
      if (!Number.isFinite(pctValue)) return NaN;

      // ✅ FIX: Se o valor excede 100, provavelmente NÃO é percentual.
      // Trata como score absoluto para evitar inflação.
      if (Math.abs(pctValue) > 100.01) {
        s = Math.max(safeMinScore, Math.min(safeMaxScore, pctValue));
      } else {
        const clampedPct = Math.max(0, Math.min(100, pctValue));
        s = safeMinScore + (clampedPct / 100) * (safeMaxScore - safeMinScore);
      }
    }
    
    return Number.isFinite(s) ? Math.max(safeMinScore, Math.min(safeMaxScore, s)) : NaN;
  }
  
  // ✅ FIX: Usa parseLocaleNumber para total e correct
  const total = parseLocaleNumber(historyRow.total, NaN);
  const correct = parseLocaleNumber(historyRow.correct, NaN);
  
  if (historyRow.isPercentage) {
    if (!Number.isFinite(correct)) return NaN;
    const pValue = normalizePercentInput(correct);
    if (!Number.isFinite(pValue)) return NaN;
    // ✅ FIX: Mesmo tratamento para correct como percentual
    if (Math.abs(pValue) > 100.01) {
      return Math.max(safeMinScore, Math.min(safeMaxScore, pValue));
    }
    const clampedPct = Math.max(0, Math.min(100, pValue));
    const scoreFromPercentage = safeMinScore + (clampedPct / 100) * (safeMaxScore - safeMinScore);
    return Number.isFinite(scoreFromPercentage) ? Math.max(safeMinScore, Math.min(safeMaxScore, scoreFromPercentage)) : NaN;
  }
  
  if (total > 0) {
    return Math.max(safeMinScore, Math.min(safeMaxScore, safeMinScore + (correct / total) * (safeMaxScore - safeMinScore)));
  }
  
  return 0;
}

export function getSafeQuestionStats(historyRow, maxScore = 100, options = {}) {
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const syntheticTotal = Number.isFinite(Number(options.syntheticTotal))
    ? Math.max(0, Number(options.syntheticTotal))
    : getSyntheticTotal(safeMaxScore);
  
  if (!historyRow || typeof historyRow !== 'object') {
    return { total: 0, correct: 0, wrong: 0, score: NaN, percentage: 0, hasData: false, isSynthetic: false };
  }
  
  const rawTotal = parseLocaleNumber(historyRow.total, NaN);
  const rawCorrect = parseLocaleNumber(historyRow.correct, NaN);
  const rawWrong = parseLocaleNumber(historyRow.wrong, NaN);
  const safeScore = getSafeScore(historyRow, safeMaxScore);
  
  const hasExplicitTotal = Number.isFinite(rawTotal) && rawTotal > 0;
  let total = hasExplicitTotal ? rawTotal : 0;
  let correct = NaN;
  let isSynthetic = false;
  
  if (total > 0) {
    if (Number.isFinite(rawCorrect) && !historyRow.isPercentage) {
      correct = rawCorrect;
    } else if (Number.isFinite(safeScore)) {
      correct = (safeScore / safeMaxScore) * total;
    } else if (Number.isFinite(rawWrong)) {
      correct = total - rawWrong;
    }
  } else if (Number.isFinite(rawCorrect) || Number.isFinite(rawWrong)) {
    const c = Math.max(0, Number.isFinite(rawCorrect) ? rawCorrect : 0);
    const w = Math.max(0, Number.isFinite(rawWrong) ? rawWrong : 0);
    total = c + w;
    correct = c;
  } else if (Number.isFinite(safeScore) && syntheticTotal > 0) {
    total = syntheticTotal;
    correct = (safeScore / safeMaxScore) * total;
    isSynthetic = true;
  }
  
  if (!(total > 0)) {
    return { total: 0, correct: 0, wrong: 0, score: NaN, percentage: 0, hasData: false, isSynthetic };
  }
  
  const boundedCorrect = Math.max(0, Math.min(total, Number.isFinite(correct) ? correct : 0));
  const wrong = Math.max(0, total - boundedCorrect);
  const score = (boundedCorrect / total) * safeMaxScore;
  
  return {
    total, correct: boundedCorrect, wrong, score,
    percentage: (boundedCorrect / total) * 100,
    hasData: true, isSynthetic
  };
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '0%';
  let num;
  if (typeof value === 'number') {
    num = value;
  } else {
    num = parseLocaleNumber(value, 0);
  }
  const formatted = parseFloat(num.toFixed(2));
  return `${formatted}%`;
}

export function formatValue(value) {
  if (value === null || value === undefined) return '0';
  let num;
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '0';
    num = value;
  } else {
    num = parseLocaleNumber(value, 0);
  }
  return String(parseFloat(num.toFixed(2)));
}

/** @typedef {number} ScorePoints  — pontos absolutos na escala [minScore, maxScore] */
/** @typedef {number} ScorePct     — percentual normatizado [0, 100] */
/** @typedef {number} ScoreRatio   — razão proporcional [0, 1] */

/**
 * Converte qualquer valor em pontos (ScorePoints) no domínio [minScore, maxScore].
 * Padrão (unit = 'points') assume que val já está em pontos e aplica clamp no intervalo.
 */
export function toPoints(val, maxScore = 100, minScore = 0, unit = 'points') {
  const v = Number(val);
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  if (!Number.isFinite(v)) return safeMin;
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMin ? Number(maxScore) : 100;
  const range = safeMax - safeMin;

  if (unit === 'pct' || unit === '%') {
    return Math.max(safeMin, Math.min(safeMax, safeMin + (v / 100) * range));
  }
  if (unit === 'ratio') {
    return Math.max(safeMin, Math.min(safeMax, safeMin + v * range));
  }
  if (unit === 'auto') {
    if (v >= 0 && v <= 1 && safeMax > 1) {
      return Math.max(safeMin, Math.min(safeMax, safeMin + v * range));
    }
    if (safeMax !== 100 && v >= 0 && v <= 100) {
      return Math.max(safeMin, Math.min(safeMax, safeMin + (v / 100) * range));
    }
  }
  return Math.max(safeMin, Math.min(safeMax, v));
}

/**
 * Converte valor em percentual (ScorePct) [0, 100].
 * Padrão (unit = 'points') converte pontos na escala [minScore, maxScore] para % [0, 100].
 */
export function toPct(val, maxScore = 100, minScore = 0, unit = 'points') {
  const v = Number(val);
  if (!Number.isFinite(v)) return 0;
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMin ? Number(maxScore) : 100;
  const range = safeMax - safeMin;

  if (unit === 'ratio') {
    return Math.max(0, Math.min(100, v * 100));
  }
  if (unit === 'auto' && v >= 0 && v <= 1 && safeMax > 1) {
    return Math.max(0, Math.min(100, v * 100));
  }
  return Math.max(0, Math.min(100, ((v - safeMin) / range) * 100));
}

/**
 * Converte qualquer pontuação para razão proporcional (ScoreRatio) [0, 1].
 */
export function toRatio(val, maxScore = 100, minScore = 0, unit = 'points') {
  return Math.max(0, Math.min(1, toPct(val, maxScore, minScore, unit) / 100));
}

export {
  ratioToPoints,
  pctToPoints,
  pointsToRatio,
  pointsToPct,
  toAccuracyRatio,
  ratioToCorrect
} from './scoreHelper.conversions.js';



```

---

## `src/utils/scoreHelper.conversions.js` <a id="src-utils-scorehelper-conversions-js"></a>

- **Localização:** `src/utils/scoreHelper.conversions.js`
- **Linhas:** 58
- **Tamanho:** 2.39 KB

```javascript
// ============================================================================
// scoreHelper.conversions.js
// Fonte única de verdade para conversão de unidades de nota.
//
// REGRA DE OURO: a unidade é SEMPRE declarada pelo chamador.
// NUNCA auto-detectar (a auto-detecção é a raiz dos bugs toPoints/toPct:
// uma nota bruta "1" é indistinguível de "razão 1.0 = 100%" sem contexto).
//
// Substitua as heurísticas toPoints()/toPct() do scoreHelper.js por estas
// funções explícitas e atualize os call sites para a função correta.
// ============================================================================

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toNum = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function safeDomain(maxScore, minScore) {
  const max = Math.max(1, toNum(maxScore, 100));
  const min = Math.min(toNum(minScore, 0), max);
  return { max, min, range: Math.max(1e-9, max - min) };
}

/** Razão [0,1] → pontos na escala [minScore, maxScore]. */
export function ratioToPoints(ratio, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return min + clamp(toNum(ratio, 0), 0, 1) * range;
}

/** Percentual [0,100] → pontos na escala. */
export function pctToPoints(pct, maxScore, minScore = 0) {
  return ratioToPoints(toNum(pct, 0) / 100, maxScore, minScore);
}

/** Pontos na escala → razão [0,1] (posição no intervalo útil). */
export function pointsToRatio(points, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return clamp((toNum(points, min) - min) / range, 0, 1);
}

/** Pontos na escala → percentual [0,100] do intervalo útil. */
export function pointsToPct(points, maxScore, minScore = 0) {
  return pointsToRatio(points, maxScore, minScore) * 100;
}

/**
 * Fração de acertos derivada de uma nota — "quantas questões efetivamente certas".
 * score ∈ [minScore,maxScore] → razão [0,1] relativa ao intervalo útil.
 * (Convenção usada por CriticalTopics/Subtopics/subjectAgg.)
 */
export function toAccuracyRatio(score, maxScore, minScore = 0) {
  return pointsToRatio(score, maxScore, minScore);
}

/** Razão de acerto → contagem de acertos, clampada em [0, total]. */
export function ratioToCorrect(ratio, total) {
  const t = Math.max(0, toNum(total, 0));
  return clamp(toNum(ratio, 0) * t, 0, t);
}
```

---

## `src/utils/scoreDomain.js` <a id="src-utils-scoredomain-js"></a>

- **Localização:** `src/utils/scoreDomain.js`
- **Linhas:** 89
- **Tamanho:** 2.72 KB

```javascript
/**
 * scoreDomain.js
 * 
 * Módulo centralizador de domínio para pontuações, normalização por amplitude,
 * clamping, conversão de escalas e formatação de unidades (%, pts, horas).
 */

import { formatDuration } from './dateHelper.js';
import { formatValue } from './scoreHelper.js';

const toNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/**
 * Normaliza e extrai limites seguros de domínio.
 * Garante que max >= min e range > 0.
 */
export function safeDomain(maxScore = 100, minScore = 0) {
  const safeMax = Math.max(1, toNum(maxScore, 100));
  const safeMin = Math.min(toNum(minScore, 0), safeMax);
  const range = Math.max(1e-9, safeMax - safeMin);
  return { min: safeMin, max: safeMax, range };
}

/**
 * Clampa um valor numérico dentro do domínio [minScore, maxScore].
 */
export function clampScore(value, { minScore = 0, maxScore = 100 } = {}) {
  const { min, max } = safeDomain(maxScore, minScore);
  const n = toNum(value, min);
  return Math.max(min, Math.min(max, n));
}

/**
 * Converte pontuação no domínio [minScore, maxScore] para razão [0, 1].
 */
export function scoreToRatio(score, { minScore = 0, maxScore = 100 } = {}) {
  const { min, max, range } = safeDomain(maxScore, minScore);
  const n = toNum(score, min);
  const clamped = Math.max(min, Math.min(max, n));
  return Math.max(0, Math.min(1, (clamped - min) / range));
}

/**
 * Converte razão [0, 1] para pontuação no domínio [minScore, maxScore].
 */
export function ratioToScore(ratio, { minScore = 0, maxScore = 100 } = {}) {
  const { min, range } = safeDomain(maxScore, minScore);
  const r = Math.max(0, Math.min(1, toNum(ratio, 0)));
  return min + r * range;
}

/**
 * Converte pontuação no domínio [minScore, maxScore] para percentual [0, 100].
 */
export function scoreToPct(score, { minScore = 0, maxScore = 100 } = {}) {
  return scoreToRatio(score, { minScore, maxScore }) * 100;
}

/**
 * Converte percentual [0, 100] para pontuação no domínio [minScore, maxScore].
 */
export function pctToScore(pct, { minScore = 0, maxScore = 100 } = {}) {
  return ratioToScore(toNum(pct, 0) / 100, { minScore, maxScore });
}

/**
 * Formata um valor respeitando a unidade informada (%, pts, horas, etc.).
 */
export function formatUnitValue(value, unit = '%') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—';
  }
  const n = Number(value);
  if (unit === 'horas') {
    return formatDuration(n);
  }
  if (unit === '%') {
    return `${formatValue(n)}%`;
  }
  return `${formatValue(n)}${unit}`;
}

/**
 * Verifica se um valor é pontuação finita e válida.
 */
export function isValidScore(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}
```

---

## `src/utils/monteCarloScenario.js` <a id="src-utils-montecarloscenario-js"></a>

- **Localização:** `src/utils/monteCarloScenario.js`
- **Linhas:** 52
- **Tamanho:** 3.27 KB

```javascript
export const SCENARIO_CONFIG = {
  // BUG-5 FIX: meanBiasFactor é percentual da escala (0.025 = 2.5% do maxScore)
  // Antes era absoluto (±2.5 pts), distorcendo provas fora da escala 0-100.
  conservative: { meanBiasFactor: -0.015, ciMult: 1.5, probMultFactor: 0.045 },
  base: { meanBiasFactor: 0, ciMult: 1, probMultFactor: 0 },
  optimistic: { meanBiasFactor: 0.025, ciMult: 0.85, probMultFactor: 0.045 },
};

export function applyScenarioAdjustments(data = [], scenario = 'base', maxScore = 100, minScore = 0) {
  const cfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const lowerBound = Math.min(safeMinScore, safeMaxScore);
  const upperBound = Math.max(safeMinScore, safeMaxScore);
  
  // CORREÇÃO B3b: Bias proporcional à amplitude real (Range) e não ao Teto absoluto.
  const meanBias = (cfg.meanBiasFactor || 0) * (upperBound - lowerBound);
  // BUG-GLOBAL-09 FIX: Ajuste de probabilidade deve ser baseado em 100 (%), não no maxScore.
  // Antes: 0.045 * 200 = 9pp (errado). Agora: 0.045 * 100 = 4.5pp (correto).
  const probMult = (cfg.probMultFactor || 0) * 100;
  return (data || []).map((d) => {
    const mean = Math.max(lowerBound, Math.min(upperBound, (Number(d.mean) || 0) + meanBias));
    const projectedMean = d.projectedMean !== undefined ? Math.max(lowerBound, Math.min(upperBound, (Number(d.projectedMean) || 0) + meanBias)) : mean;
    const low = Math.max(lowerBound, Math.min(upperBound, mean - ((mean - (d?.ciRange?.[0] ?? mean)) * cfg.ciMult)));
    const high = Math.max(lowerBound, Math.min(upperBound, mean + (((d?.ciRange?.[1] ?? mean) - mean) * cfg.ciMult)));
    const probBase = Number.isFinite(Number(d?.probability)) ? Number(d.probability) : 0;
    const probAdj = Math.max(0, Math.min(100, probBase + (meanBias > 0 ? probMult : meanBias < 0 ? -probMult : 0)));
    return { ...d, mean, projectedMean, probability: probAdj, ciRange: [Math.min(low, high), Math.max(low, high)] };
  });
}

export function classifyScenarioSignal(data = [], maxScore = 100, minScore = 0) {
  if (!data.length) return null;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const range = Math.max(1, safeMaxScore - safeMinScore); // Prevenção de divisão por zero
  
  const latest = data[data.length - 1];
  const high = Number(latest?.ciRange?.[1]);
  const low = Number(latest?.ciRange?.[0]);
  const width = Number.isFinite(high) && Number.isFinite(low) ? Math.max(0, high - low) : Number.POSITIVE_INFINITY;

  // CORREÇÃO: Eliminar os valores estáticos (12, 6) e usar proporções matemáticas do range (12% e 6%)
  if (data.length < 4 || width >= (range * 0.18)) {
    return { label: 'Sinal Fraco', color: 'text-amber-300 border-amber-500/40 bg-amber-500/10' };
  }
  if (width <= (range * 0.10) && data.length >= 8) {
    return { label: 'Sinal Forte', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' };
  }
  return { label: 'Sinal Médio', color: 'text-sky-300 border-sky-500/40 bg-sky-500/10' };
}
```

---

## `src/utils/weeklyEvolutionInsights.js` <a id="src-utils-weeklyevolutioninsights-js"></a>

- **Localização:** `src/utils/weeklyEvolutionInsights.js`
- **Linhas:** 99
- **Tamanho:** 2.83 KB

```javascript
import { toDateMs } from './dateHelper.js';

export function computeTopRegressions({ viewMode, chartData = [], keys = [], activeKeys = {}, hiddenKeys = {} }) {
  if (viewMode !== 'variation' || !Array.isArray(chartData) || chartData.length === 0) return [];

  const latestWeekWithDelta = [...chartData].reverse().find(point =>
    keys.some(key => Number.isFinite(Number(point?.[`delta_${key}`])))
  );

  if (!latestWeekWithDelta) return [];

  return keys
    .map((key) => {
      const delta = latestWeekWithDelta[`delta_${key}`];

      if (!Number.isFinite(Number(delta)) || Number(delta) >= 0 || hiddenKeys[key]) return null;

      return {
        key,
        name: activeKeys[key]?.name || key,
        fullName: activeKeys[key]?.fullName || activeKeys[key]?.name || key,
        delta: Number(delta),
        color: activeKeys[key]?.color || '#ef4444',
        week: latestWeekWithDelta.displayDate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);
}

export function computeTrendKpi({ chartData = [], keys = [], hiddenKeys = {} }) {
  if (!Array.isArray(chartData) || chartData.length < 2) return null;

  const visibleKeys = keys.filter((key) => !hiddenKeys[key]);
  if (visibleKeys.length === 0) return null;

  const recentWindow = chartData.slice(-4);
  const previousWindow = chartData.slice(-8, -4);

  if (!previousWindow.length) return null;

  const calculateEMA = (windowData, alphaBase = 0.3) => {
    if (!windowData.length) return null;

    let ema = null;
    let lastTime = null;

    windowData.forEach((week) => {
      const currentTime = toDateMs(week.week);

      if (!Number.isFinite(currentTime)) return;

      const deltaT = lastTime ? Math.max(1, (currentTime - lastTime) / 86400000) : 1;
      const alpha = 1 - Math.pow(1 - alphaBase, deltaT);
      const safeAlpha = Math.min(0.9, alpha);

      let weekSum = 0;
      let weekVol = 0;

      visibleKeys.forEach(key => {
        const meta = week[`meta_${key}`];

        if (meta && meta.currTot > 0 && Number.isFinite(Number(week[key]))) {
          weekSum += (Number(week[key]) * meta.currTot);
          weekVol += meta.currTot;
        }
      });

      if (weekVol > 0) {
        const weekAvg = weekSum / weekVol;

        if (ema === null) {
          ema = weekAvg;
        } else {
          ema = (weekAvg * safeAlpha) + (ema * (1 - safeAlpha));
        }
      }

      lastTime = currentTime;
    });

    return ema;
  };

  const recentAvg = calculateEMA(recentWindow);
  const previousAvg = calculateEMA(previousWindow);

  if (recentAvg === null || previousAvg === null) return null;

  return {
    recentAvg,
    previousAvg,
    delta: recentAvg - previousAvg,
    recentN: recentWindow.length,
    previousN: previousWindow.length,
  };
}
```

---

## `src/utils/dateHelper.js` <a id="src-utils-datehelper-js"></a>

- **Localização:** `src/utils/dateHelper.js`
- **Linhas:** 283
- **Tamanho:** 9.58 KB

```javascript
import { addDays } from 'date-fns';

export const APP_TIMEZONE = 'America/Manaus';

export const safeDateParse = (dateInput) => {
  if (!dateInput) return new Date(0);
  const normalizedString = typeof dateInput === 'string'
    ? dateInput.replace(' ', 'T')
    : dateInput;
  const d = new Date(normalizedString);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

export function parseGoalDateUnified(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string') {
        // Formato yyyy-mm-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);

            const date = new Date(year, month - 1, day, 12, 0, 0, 0);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        // Se for datetime sem T, tenta normalizar
        const normalized = value.includes('T')
            ? value
            : `${value}T12:00:00`;

        const date = new Date(normalized);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const fallback = new Date(value);

    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export const getDateKey = (rawDate) => {
  if (!rawDate) return null;
  let date;
  
  if (typeof rawDate === 'object' && (rawDate.seconds != null || rawDate._seconds != null)) {
    const secs = rawDate.seconds != null ? rawDate.seconds : rawDate._seconds;
    date = new Date(secs * 1000);
  } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
    const parts = rawDate.split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      // ✅ FIX: Ancora ao meio-dia de Manaus (UTC-4)
      // eslint-disable-next-line no-restricted-syntax
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`);
    } else {
      date = new Date(rawDate);
    }
  } else if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    // ✅ FIX: Ancora ao meio-dia de Manaus para evitar shift de dia em UTC
    // eslint-disable-next-line no-restricted-syntax
    date = new Date(`${rawDate.trim()}T12:00:00-04:00`);
  } else {
    date = new Date(rawDate);
  }
  
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  
  try {
    // ✅ FIX: Formata na timezone explicitamente ligada a Manaus (UTC-4) em vez de UTC genérico
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Manaus',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
  } catch {
    // ignore
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalMidnight = (date = new Date()) => {
  try {
    const dateKey = getDateKey(date);
    if (!dateKey) {
      // Fallback: extrair componentes UTC e ancorar em Manaus (UTC-4)
      const utc = new Date(date);
      return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) + 4 * 3600000);
    }
    // ✅ FIX: Offset fixo de Manaus (-04:00) em vez de timezone local
    // eslint-disable-next-line no-restricted-syntax
    return new Date(`${dateKey}T00:00:00-04:00`);
  } catch {
    // Fallback: extrair componentes UTC e ancorar em Manaus (UTC-4)
    const utc = new Date(date);
    return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) + 4 * 3600000);
  }
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'number' || (typeof dateStr === 'string' && /^\d{10,13}$/.test(dateStr.trim()))) {
    const d = new Date(Number(dateStr));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    }
  }
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length < 3) return cleanStr;
  return `${parts[2]}/${parts[1]}`;
};

export const normalizeDate = (raw) => {
  if (!raw) return null;
  let d;
  const isDateOnly = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw);
  
  if (typeof raw === 'object' && (raw.seconds != null || raw._seconds != null)) {
    const secs = raw.seconds != null ? raw.seconds : raw._seconds;
    d = new Date(secs * 1000);
  } else if (typeof raw === 'string' && raw.includes('/')) {
    const parts = raw.split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      // ✅ FIX: Ancora ao meio-dia de Manaus
      // eslint-disable-next-line no-restricted-syntax
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`);
    } else {
      d = new Date(raw);
    }
  } else if (typeof raw === 'string') {
    // ✅ FIX: Strings YYYY-MM-DD ancoradas ao meio-dia de Manaus
    // eslint-disable-next-line no-restricted-syntax
    d = isDateOnly ? new Date(`${raw}T12:00:00-04:00`) : new Date(raw);
  } else {
    d = new Date(raw);
  }
  
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d;
};

export const toDateMs = (value) => {
  if (!value) return Number.NaN;
  if (typeof value === 'object' && (value.seconds != null || value._seconds != null)) {
    const secs = value.seconds != null ? value.seconds : value._seconds;
    return Number(secs) * 1000;
  }
  const parsed = normalizeDate(value);
  return parsed ? parsed.getTime() : new Date(value).getTime();
};

export const formatTimeAgo = (date) => {
  if (!date) return 'Nunca';
  const timeMs = toDateMs(date);
  if (Number.isNaN(timeMs)) return 'Data inválida';
  
  const rawDiff = Date.now() - timeMs;
  if (rawDiff < 0) {
    if (Math.abs(rawDiff) <= 60_000) return 'Agora há pouco';
    return 'No futuro';
  }
  
  const diff = rawDiff;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (hours < 1) return 'Agora há pouco';
  if (hours < 24) return `${hours}h atrás`;
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
};

export const formatDuration = (decimalHours) => {
  const safe = Number.isFinite(Number(decimalHours)) ? Number(decimalHours) : 0;
  const normalized = Math.max(0, safe);
  let hours = Math.floor(normalized);
  let minutes = Math.round((normalized - hours) * 60);
  
  if (minutes >= 60) {
    hours += 1;
    minutes = 0;
  }
  
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '0h00';
  return `${hours}h${String(Math.max(0, minutes)).padStart(2, '0')}`;
};

export const formatDatePtBR = (date) => {
  try {
    if (!date) return '--/--/----';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/----';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(parsed);
  } catch {
    return '--/--/----';
  }
};

export const formatDateTimePtBR = (date) => {
  try {
    if (!date) return '--/--/---- --:--:--';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/---- --:--:--';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(parsed);
  } catch {
    return '--/--/---- --:--:--';
  }
};

export const formatWeekdayShortPtBR = (date) => {
  try {
    if (!date) return '';
    const parsed = normalizeDate(date);
    if (!parsed || Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE, weekday: 'short'
    }).format(parsed).replace('.', '').toUpperCase();
  } catch {
    return '';
  }
};

export const getFlashcardTodayKey = () => getDateKey(new Date());

export const getFlashcardNextDueKey = (intervalDays = 1) => {
  // ✅ FIX: Validar e clamp intervalDays para prevenir datas absurdas
  const raw = Number(intervalDays);
  const safeDays = Math.max(1, Math.min(3650, Math.floor(Number.isFinite(raw) ? raw : 1)));
  const future = addDays(new Date(), safeDays);
  return getDateKey(future);
};

export const isFlashcardDue = (cardDue, referenceKey = null) => {
  if (!cardDue) return true;
  const todayKey = referenceKey || getFlashcardTodayKey();
  return cardDue <= todayKey;
};

export const parseNoonLocal = (input) => {
  if (!input) return null;
  try {
    const key = getDateKey(input);
    if (!key) {
      const fallback = normalizeDate(input);
      if (!fallback || Number.isNaN(fallback.getTime())) return null;
      fallback.setHours(12, 0, 0, 0);
      return fallback;
    }
    const [y, m, d] = key.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const fullYear = y >= 0 && y < 100 ? y + 2000 : y;
    const date = new Date(0);
    date.setFullYear(fullYear, m - 1, d);
    date.setHours(12, 0, 0, 0);
    return date;
  } catch {
    return null;
  }
};


```

---

# 7. GERENCIAMENTO DE ESTADO (ZUSTAND STORE)

## `src/store/slices/createMonteCarloSlice.js` <a id="src-store-slices-createmontecarloslice-js"></a>

- **Localização:** `src/store/slices/createMonteCarloSlice.js`
- **Linhas:** 112
- **Tamanho:** 4.56 KB

```javascript
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { safeClone } from '../safeClone.js';

function safeNumber(val, fallback = 0) {
    if (val === null || val === undefined || val === '') return fallback;
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
}

export const createMonteCarloSlice = (set) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        try {
            const activeId = state.appState?.activeId;
            if (!activeId) return;
            const activeData = state.appState.contests?.[activeId];
            if (!activeData) return;

            if (!Array.isArray(activeData.monteCarloHistory)) {
                activeData.monteCarloHistory = [];
            }
            
            const rawProb = safeNumber(prob, null);
            if (rawProb === null) return; 
            
            const snapshot = { 
                date: getDateKey(normalizeDate(date)), 
                probability: rawProb, 
                ...safeClone(metadata) 
            };
            
            const targetDateStr = snapshot.date;
            const targetCategoryId = snapshot.categoryId || null;

            // ✅ FIX 1.3: buscar por data + categoria
            const idx = activeData.monteCarloHistory.findIndex(h =>
                getDateKey(normalizeDate(h.date)) === targetDateStr &&
                (h.categoryId || null) === targetCategoryId
            );

            if (idx >= 0) {
                activeData.monteCarloHistory[idx] = { ...activeData.monteCarloHistory[idx], ...snapshot };
            } else {
                activeData.monteCarloHistory.push(snapshot);
            }

            activeData.monteCarloHistory.sort((a, b) => {
                const timeA = new Date(a.date).getTime() || 0;
                const timeB = new Date(b.date).getTime() || 0;
                return timeA - timeB;
            });
            // ✅ FIX 1.3b: limite escala com nº de categorias
            const categoryCount = (activeData.categories || []).length || 1;
            const MAX_SNAPSHOTS = 30 * categoryCount;
            if (activeData.monteCarloHistory.length > MAX_SNAPSHOTS) {
                activeData.monteCarloHistory = activeData.monteCarloHistory.slice(-MAX_SNAPSHOTS);
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        } catch (e) {
            console.warn('Error saving MC snapshot:', e);
        }
    }),

    setMcEqualWeights: (enabled) => set((state) => {
        state.appState.mcEqualWeights = Boolean(enabled);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setHistoricalCutoffs: (cutoffs) => set((state) => {
        const activeId = state.appState?.activeId;
        if (!activeId || !state.appState.contests?.[activeId]) return;

        state.appState.contests[activeId].historicalCutoffs = safeClone(cutoffs);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    updateCoachScore: (score) => set((state) => {
        const activeId = state.appState?.activeId;
        if (!activeId || !state.appState.contests?.[activeId]) return;

        const currentScore = state.appState.contests[activeId].coachScore;
        const newScore = safeNumber(score, currentScore);

        if (Object.is(currentScore, newScore)) return;

        state.appState.contests[activeId].coachScore = newScore;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setExamConfig: (durationMinutes, totalQuestions) => set((state) => {
        const activeId = state.appState?.activeId;
        if (!activeId || !state.appState.contests?.[activeId]) return;

        const dMin = safeNumber(durationMinutes, 240);
        const tQ = safeNumber(totalQuestions, 100);

        state.appState.contests[activeId].examDurationMinutes = dMin;
        state.appState.contests[activeId].examTotalQuestions = tQ;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    })
});
```

---

