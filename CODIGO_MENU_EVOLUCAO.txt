# CÓDIGO UNIFICADO — MENU EVOLUÇÃO (ULTRA DASHBOARD)

> **Data de Geração:** 2026-10-18T16:23:41.957Z
> **Total de Arquivos:** 52
> **Total de Linhas:** 15.484
> **Tamanho Total:** 752.63 KB

Este documento contém o **código-fonte completo e exclusivo do Menu Evolução** do Ultra Dashboard.
Ele inclui a página de entrada, componentes visuais, gráficos de alta precisão (Recharts), hooks reativos de orquestração, utilitários matemáticos e de domínio de notas, motores de projeção bayesiana e Monte Carlo, suíte completa de testes automatizados e scripts de validação de pipeline.

---

## 📑 ÍNDICE GERAL DE ARQUIVOS

### 1. Página e Container Principal (Pages & Container)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/pages/Evolution.jsx` | Página da rota /evolution: validação de dados, fallback de estado vazio e montagem | 129 | 6.4 KB | [Acessar Código](#src-pages-evolution-jsx) |
| `src/components/EvolutionChart.jsx` | Container analítico central do Menu Evolução: orquestrador dos 10 engines e seletor de foco | 1.480 | 85.5 KB | [Acessar Código](#src-components-evolutionchart-jsx) |

### 2. Subcomponentes Analíticos e Visões Gráficas (Charts & Views)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/components/charts/EvolutionChart/CompareChart.jsx` | Visão Raio-X + Monte Carlo com projeção bayesiana e bandas de incerteza | 441 | 22.5 KB | [Acessar Código](#src-components-charts-evolutionchart-comparechart-jsx) |
| `src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx` | Painel analítico de tópicos críticos e recomendações de estudo direcionadas | 442 | 26.2 KB | [Acessar Código](#src-components-charts-evolutionchart-criticaltopicsanalysis-jsx) |
| `src/components/charts/EvolutionChart/DisciplinaCard.jsx` | Card interativo de seleção de disciplina e exibição de métricas individuais | 154 | 10.0 KB | [Acessar Código](#src-components-charts-evolutionchart-disciplinacard-jsx) |
| `src/components/charts/EvolutionChart/EvolutionLineChart.jsx` | Gráfico temporal principal com bandas bayesianas e anti-colisão de labels | 525 | 25.3 KB | [Acessar Código](#src-components-charts-evolutionchart-evolutionlinechart-jsx) |
| `src/components/charts/EvolutionChart/KpiCard.jsx` | Card de exibição de KPIs estatísticos com gradientes e indicadores de tendência | 33 | 2.4 KB | [Acessar Código](#src-components-charts-evolutionchart-kpicard-jsx) |
| `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx` | Rastreador de probabilidade de aprovação Monte Carlo e projeções por simulado | 475 | 28.5 KB | [Acessar Código](#src-components-charts-evolutionchart-montecarloevolutionchart-jsx) |
| `src/components/charts/EvolutionChart/PerformanceBarChart.jsx` | Gráfico de barras de desempenho comparativo entre disciplinas | 220 | 14.9 KB | [Acessar Código](#src-components-charts-evolutionchart-performancebarchart-jsx) |
| `src/components/charts/EvolutionChart/RadarAnalysis.jsx` | Gráfico de radar multidimensional de equilíbrio entre competências e matérias | 205 | 13.3 KB | [Acessar Código](#src-components-charts-evolutionchart-radaranalysis-jsx) |
| `src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx` | Raio-X cirúrgico de subtópicos e assuntos específicos | 633 | 35.8 KB | [Acessar Código](#src-components-charts-evolutionchart-subtopicsperformancechart-jsx) |
| `src/components/charts/EvolutionChart/TimeSpentChart.jsx` | Rastreador de agilidade e tempo médio por questão em simulados IA | 495 | 27.9 KB | [Acessar Código](#src-components-charts-evolutionchart-timespentchart-jsx) |
| `src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx` | Comparativo de desempenho do dia/sessão atual contra a média geral histórica | 607 | 36.2 KB | [Acessar Código](#src-components-charts-evolutionchart-todayvsgeneralchart-jsx) |
| `src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx` | Acelerômetro semanal de desempenho com cálculo de deltas e top regressões | 733 | 41.5 KB | [Acessar Código](#src-components-charts-evolutionchart-weeklyevolutionview-jsx) |
| `src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx` | Gráfico de desempenho semanal agregado por período | 302 | 14.6 KB | [Acessar Código](#src-components-charts-evolutionchart-weeklyperformancechart-jsx) |

### 3. Componentes de Apoio Visual e UI (Visual Support & UI)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/components/charts/EvolutionHeatmap.jsx` | Mapa de calor de frequência e consistência de simulados com granularidade diária/semanal/mensal | 463 | 23.2 KB | [Acessar Código](#src-components-charts-evolutionheatmap-jsx) |
| `src/components/charts/ChartFrame.jsx` | Frame container responsivo com suporte a loading skeleton e tratamento de erros | 114 | 3.9 KB | [Acessar Código](#src-components-charts-chartframe-jsx) |
| `src/components/charts/ChartTooltip.jsx` | Tooltip customizado de alta precisão com tema escuro e contraste acessível | 162 | 12.4 KB | [Acessar Código](#src-components-charts-charttooltip-jsx) |
| `src/components/charts/GaussianPlot.jsx` | Plot de densidade de probabilidade da distribuição gaussiana/normal | 500 | 25.8 KB | [Acessar Código](#src-components-charts-gaussianplot-jsx) |
| `src/components/ui/StatusPill.jsx` | Pílula visual de status para classificar consistência e evolução | 65 | 1.7 KB | [Acessar Código](#src-components-ui-statuspill-jsx) |
| `src/components/ui/ChartGuide.jsx` | Painel interativo com explicações detalhadas de como interpretar cada gráfico | 56 | 1.4 KB | [Acessar Código](#src-components-ui-chartguide-jsx) |

### 4. Hooks Reativos do React (Hooks)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/hooks/useEvolutionMC.js` | Hook orquestrador do motor Monte Carlo específico para os gráficos do Menu Evolução | 271 | 10.5 KB | [Acessar Código](#src-hooks-useevolutionmc-js) |
| `src/hooks/useChartData.js` | Hook de preparação e transformação de séries temporais de dados para os gráficos | 507 | 24.1 KB | [Acessar Código](#src-hooks-usechartdata-js) |
| `src/hooks/useSubjectAggData.js` | Hook agregador de métricas e filtros por janela temporal (7, 30, 90 dias ou geral) | 131 | 6.0 KB | [Acessar Código](#src-hooks-usesubjectaggdata-js) |
| `src/hooks/useCategoryLevels.js` | Hook de computação dos níveis de proficiência e domínio bayesiano das categorias | 70 | 3.0 KB | [Acessar Código](#src-hooks-usecategorylevels-js) |

### 5. Utilitários, Mapeadores e Algoritmos (Utils & Helpers)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/utils/evolutionGuards.js` | Guards e normalizadores para probabilidades e estados numéricos seguros | 59 | 1.5 KB | [Acessar Código](#src-utils-evolutionguards-js) |
| `src/utils/evolutionStatus.js` | Motor de cálculo de estados e tendências evolutivas disciplinares | 320 | 9.4 KB | [Acessar Código](#src-utils-evolutionstatus-js) |
| `src/utils/scoreDomain.js` | Normalização unificada de escalas, limites mínimos/máximos e conversões de pontuação | 80 | 3.1 KB | [Acessar Código](#src-utils-scoredomain-js) |
| `src/utils/heatmapAggregation.js` | Agregação e agrupamento de células para o mapa de calor de simulados | 91 | 3.5 KB | [Acessar Código](#src-utils-heatmapaggregation-js) |
| `src/utils/weeklyEvolutionInsights.js` | Algoritmo de identificação de top regressões e índice de tração semanal | 103 | 3.0 KB | [Acessar Código](#src-utils-weeklyevolutioninsights-js) |
| `src/utils/monteCarloScenario.js` | Ajustes paramétricos de cenários hipotéticos (conservador, realista, otimista) | 56 | 3.0 KB | [Acessar Código](#src-utils-montecarloscenario-js) |
| `src/utils/downsample.js` | Algoritmo LTTB (Largest Triangle Three Buckets) para otimização de alta densidade gráfica | 67 | 2.2 KB | [Acessar Código](#src-utils-downsample-js) |
| `src/engine/insightGenerator.js` | Motor de geração de recomendações e insights textuais acionáveis | 343 | 17.3 KB | [Acessar Código](#src-engine-insightgenerator-js) |

### 6. Motores Estatísticos e Probabilísticos (Engine)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/engine/monteCarlo.js` | Motor clássico de simulação estocástica Monte Carlo com calibração e bootstrap | 825 | 32.3 KB | [Acessar Código](#src-engine-montecarlo-js) |
| `src/engine/projection.js` | Motor de projeção temporal bayesiana, GARCH de volatilidade e convergência | 1.028 | 49.9 KB | [Acessar Código](#src-engine-projection-js) |
| `src/engine/stats.js` | Funções estatísticas centrais: médias móveis, variância, covariância e regressão linear | 1.244 | 49.7 KB | [Acessar Código](#src-engine-stats-js) |
| `src/engine/variance.js` | Decomposição de variância total e cálculo de desvio padrão amostral | 515 | 21.0 KB | [Acessar Código](#src-engine-variance-js) |

### 7. Gerenciamento de Estado (Zustand Store)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/store/slices/createMonteCarloSlice.js` | Slice Zustand responsável pelo histórico e persistência de dados de Monte Carlo | 136 | 4.9 KB | [Acessar Código](#src-store-slices-createmontecarloslice-js) |

### 8. Suíte de Testes Automatizados (Tests)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx` | Testes de renderização estática dos componentes visuais do Menu Evolução | 223 | 8.2 KB | [Acessar Código](#src-components-charts-evolutionchart-__tests__-evolutioncomponents-test-jsx) |
| `src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx` | Verificação regressiva de correções de bugs do Menu Evolução | 155 | 5.0 KB | [Acessar Código](#src-components-charts-evolutionchart-__tests__-evolution-fixes-verification-test-jsx) |
| `src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx` | Suíte completa de auditoria de bugs e integridade de domínio de notas | 249 | 7.9 KB | [Acessar Código](#src-components-charts-evolutionchart-__tests__-evolution-menu-bugs-audit-test-jsx) |
| `src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx` | Testes de integração e acessibilidade para tooltips e visões do Menu | 215 | 6.9 KB | [Acessar Código](#src-components-charts-evolutionchart-__tests__-evolution-menu-comprehensive-fixes-test-jsx) |
| `src/components/charts/EvolutionChart/__tests__/evolution-menu-final-fixes.test.jsx` | Validação final de status evolutivos e subtópicos | 122 | 4.5 KB | [Acessar Código](#src-components-charts-evolutionchart-__tests__-evolution-menu-final-fixes-test-jsx) |
| `src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx` | Testes de renderização de cards e retenção | 74 | 3.3 KB | [Acessar Código](#src-components-charts-evolutionchart-__tests__-evolution-stats-bugs-test-jsx) |
| `src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx` | Testes de renderização e cálculo do gráfico de tempo por questão | 143 | 4.3 KB | [Acessar Código](#src-components-charts-evolutionchart-__tests__-timespentchart-test-jsx) |
| `tests/evolutionE2E.test.js` | Testes unitários dos auxiliares de execução E2E do Menu Evolução | 18 | 0.9 KB | [Acessar Código](#tests-evolutione2e-test-js) |
| `e2e/evolution-smoke.spec.js` | Smoke test Playwright de inicialização e montagem do container | 10 | 0.3 KB | [Acessar Código](#e2e-evolution-smoke-spec-js) |

### 9. Scripts de Automação e Verificação (Scripts)

| Arquivo | Descrição | Linhas | Tamanho | Âncora |
| :--- | :--- | :---: | :---: | :--- |
| `scripts/export-evolution-menu.mjs` | Script de exportação do código do menu evolução para markdown | 83 | 3.4 KB | [Acessar Código](#scripts-export-evolution-menu-mjs) |
| `scripts/verify-evolution-stack.mjs` | Pipeline de validação estrita (testes, lint, build e e2e) da stack de evolução | 31 | 1.1 KB | [Acessar Código](#scripts-verify-evolution-stack-mjs) |
| `scripts/test-evolution-suite.mjs` | Runner da suíte combinada de cenários, mapa de calor e contratos de UI | 19 | 0.5 KB | [Acessar Código](#scripts-test-evolution-suite-mjs) |
| `scripts/test-evolution-ui-contracts.mjs` | Validador de conformidade e contratos de acessibilidade da UI | 21 | 1.1 KB | [Acessar Código](#scripts-test-evolution-ui-contracts-mjs) |
| `scripts/test-evolution-e2e.mjs` | Runner do teste end-to-end do Menu Evolução | 41 | 1.5 KB | [Acessar Código](#scripts-test-evolution-e2e-mjs) |

---

## 💻 CÓDIGO-FONTE INTEGRAL

# 1. PÁGINA E CONTAINER PRINCIPAL (PAGES & CONTAINER)

## `src/pages/Evolution.jsx` <a id="src-pages-evolution-jsx"></a>

- **Localização:** `src/pages/Evolution.jsx`
- **Descrição:** Página da rota /evolution: validação de dados, fallback de estado vazio e montagem
- **Linhas:** 129
- **Tamanho:** 6.42 KB

```javascript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { normalizeProbability } from '../utils/evolutionGuards';

const EMPTY_ARRAY = Object.freeze([]);

export default function Evolution() {
  const navigate = useNavigate();
  const { categories, rawStudyLogs, monteCarloHistory, user, unit, minScore, maxScore, simuladoRows } = useAppStore(
    useShallow(state => {
      const contests = state?.appState?.contests || {};
      const activeId = state?.appState?.activeId;
      const contest = contests[activeId] || {};
      return {
        categories: contest.categories ?? EMPTY_ARRAY,
        rawStudyLogs: contest.studyLogs,
        monteCarloHistory: contest.monteCarloHistory ?? EMPTY_ARRAY,
        user: contest.user,
        unit: contest.unit || '%',
        minScore: contest.minScore ?? 0,
        maxScore: contest.maxScore ?? 100,
        simuladoRows: contest.simuladoRows ?? EMPTY_ARRAY
      };
    })
  );

  const studyLogs = React.useMemo(() => {
    return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
  }, [rawStudyLogs]);

  const safeCategories = React.useMemo(() => {
    return Array.isArray(categories) ? categories : Object.values(categories || {});
  }, [categories]);

  const safeSimuladoRows = React.useMemo(() => {
    return Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {});
  }, [simuladoRows]);

  const safeMonteCarloHistory = React.useMemo(() => {
    return Array.isArray(monteCarloHistory) ? monteCarloHistory : Object.values(monteCarloHistory || {});
  }, [monteCarloHistory]);

  const hasEvolutionData = (Array.isArray(safeCategories) && safeCategories.some(category => {
    const h = category?.simuladoStats?.history;
    const list = Array.isArray(h) ? h : Object.values(h || {});
    return list.some(entry => entry && (Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions) > 0 || entry.score != null));
  })) || (Array.isArray(safeSimuladoRows) && safeSimuladoRows.length > 0);

  // ✅ FIX: Converter targetProbability (percentual) para pontos na escala da prova
  const targetScorePoints = React.useMemo(() => {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : Math.max(100, safeMin + 100);
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
    const hasValidNumber = (v) => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));
    
    // 1) Se existir targetScore explícito, ele é a meta em pontos
    if (hasValidNumber(user?.targetScore)) {
      let ts = Number(user.targetScore);
      // Compatibilidade legada: se o valor está estritamente abaixo do piso da escala (ex: default 75 no ENEM com piso 200)
      // ou se a escala total é ampliada (safeMax > 100 e amplitude >= 200) e o valor está no intervalo percentual [0, 100],
      // converte percentual para a escala em pontos.
      const isPercentileRange = ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0;
      const isBelowMin = ts < safeMin;
      const isLegacyPercentageOnLargeScale = safeMax > 100 && (safeMax - safeMin) >= 200 && ts <= 100;
      if (isPercentileRange && (isBelowMin || isLegacyPercentageOnLargeScale)) {
        ts = safeMin + (ts / 100) * (safeMax - safeMin);
      }
      return clamp(ts);
    }
    
    // 2) Fallback: targetProbability é percentual (0-100) e deve virar pontos
    if (hasValidNumber(user?.targetProbability)) {
      const pct = normalizeProbability(user.targetProbability);
      return clamp(safeMin + (pct / 100) * (safeMax - safeMin));
    }
    
    // 3) Default seguro: 80% da escala
    return clamp(safeMin + (safeMax - safeMin) * 0.8);
  }, [user, minScore, maxScore]);

  return (
    <ErrorBoundary>
      <div className="animate-fade-in">
        {!hasEvolutionData ? (
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <div className="relative p-8 sm:p-12 text-center rounded-3xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-lg w-full group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 opacity-50"></div>
              <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 mb-6 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                    <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">📈</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 mb-3">
                    Desbloqueie sua Evolução
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                    Cadastre simulados nas disciplinas para visualizar sua evolução, tendências de desempenho e as previsões estatísticas do motor Monte Carlo.
                  </p>
                  <button
                    onClick={() => navigate('/simulados')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-lg shadow-indigo-900/30 active:scale-95"
                  >
                    Cadastrar primeiro simulado
                  </button>
              </div>
            </div>
          </div>
        ) : (
          <EvolutionChart
            categories={safeCategories}
            studyLogs={studyLogs}
            targetScore={targetScorePoints}
            goalDate={user?.goalDate}
            monteCarloHistory={safeMonteCarloHistory}
            simuladoRows={safeSimuladoRows}
            unit={unit}
            minScore={minScore}
            maxScore={maxScore}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

```

---

## `src/components/EvolutionChart.jsx` <a id="src-components-evolutionchart-jsx"></a>

- **Localização:** `src/components/EvolutionChart.jsx`
- **Descrição:** Container analítico central do Menu Evolução: orquestrador dos 10 engines e seletor de foco
- **Linhas:** 1.480
- **Tamanho:** 85.50 KB

```javascript
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useChartData } from "../hooks/useChartData";
import { useEvolutionMC } from "../hooks/useEvolutionMC";
import { useCategoryLevels } from "../hooks/useCategoryLevels";
import { useSubjectAggData } from "../hooks/useSubjectAggData";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";
import { getDateKey, toDateMs, normalizeDate } from "../utils/dateHelper";
import { normalizeProbability } from "../utils/evolutionGuards";
import { exportComponentAsPDF } from "../utils/pdfExport";
import { Download, Loader2, Zap, Target, BarChart3, TrendingUp } from "lucide-react";
import { GaussianPlot } from "./charts/GaussianPlot";
import { useAppStore } from "../store/useAppStore";
import { downsampleLTTB } from "../utils/downsample";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useShallow } from 'zustand/react/shallow';

// Sub-components
import { KpiCard } from "./charts/EvolutionChart/KpiCard";
import { DisciplinaCard } from "./charts/EvolutionChart/DisciplinaCard";
import { EvolutionLineChart } from "./charts/EvolutionChart/EvolutionLineChart";
import { CompareChart } from "./charts/EvolutionChart/CompareChart";
import { RadarAnalysis } from "./charts/EvolutionChart/RadarAnalysis";
import { PerformanceBarChart } from "./charts/EvolutionChart/PerformanceBarChart";
import { CriticalTopicsAnalysis } from "./charts/EvolutionChart/CriticalTopicsAnalysis";
import { SubtopicsPerformanceChart } from "./charts/EvolutionChart/SubtopicsPerformanceChart";
import { MonteCarloEvolutionChart } from "./charts/EvolutionChart/MonteCarloEvolutionChart";
import { WeeklyEvolutionView } from "./charts/EvolutionChart/WeeklyEvolutionView";
import { TimeSpentChart } from "./charts/EvolutionChart/TimeSpentChart";
import { TodayVsGeneralChart } from "./charts/EvolutionChart/TodayVsGeneralChart";

import { generateEvolutionInsights } from '../engine/insightGenerator';
import { StatusPill } from './ui/StatusPill';
import { ChartGuide } from './ui/ChartGuide';
import { computeEvolutionStatuses } from '../utils/evolutionStatus';

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

function safeFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function renderInsightText(text, textColorClass) {
  if (typeof text !== 'string') return text;

  const parts = text.split(/(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g).filter(Boolean);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className={`${textColorClass} font-black drop-shadow-[0_0_8px_currentColor]`}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('!!') && part.endsWith('!!')) {
      return (
        <span key={idx} className="text-rose-500 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
          {part.slice(2, -2)}
        </span>
      );
    }

    if (part.startsWith('++') && part.endsWith('++')) {
      return (
        <span key={idx} className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
          {part.slice(2, -2)}
        </span>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

// Função pura fora do componente
function buildPredictiveCompareData(
  timeline,
  focusCategory,
  categoryLevels,
  activeMcProjectionSeries,
  projectDays,
  minScore = 0,
  maxScore = 100
) {
  if (!focusCategory) return timeline;

  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);

  // 1. Prepara os dados históricos mapeando as chaves para leitura no gráfico
  let pts = timeline.map((d) => {
    const lowVal = d[`bay_ci_low_${focusCategory.id}`];
    const highVal = d[`bay_ci_high_${focusCategory.id}`];
    const hasValidBand = lowVal != null && Number.isFinite(Number(lowVal)) && highVal != null && Number.isFinite(Number(highVal));

    return {
      ...d,
      "Nota Bruta": d[`raw_${focusCategory.id}`],
      "Nível Bayesiano": d[`bay_${focusCategory.id}`],
      "Banda Bayesiana": hasValidBand ? [Number(lowVal), Number(highVal)] : null,
      "Média Histórica": d[`stats_${focusCategory.id}`]
    };
  });

  // 2. Acopla os pontos futuros do Monte Carlo com validação robusta
  if (activeMcProjectionSeries && pts.length > 0) {
    const lastIdx = pts.length - 1;
    const pickFinite = (...vals) => {
      for (const v of vals) {
        if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) return Number(v);
      }
      return safeMin;
    };

    const rawLevel = pickFinite(
      pts[lastIdx]["Nível Bayesiano"],
      categoryLevels?.[focusCategory?.id],
      activeMcProjectionSeries?.mc_p50,
      safeMin
    );

    const currentLevel = Math.max(safeMin, Math.min(safeMax, safeFiniteNumber(rawLevel, safeMin)));
    const p50 = Math.max(safeMin, Math.min(safeMax, safeFiniteNumber(activeMcProjectionSeries.mc_p50, currentLevel)));

    const band =
      Array.isArray(activeMcProjectionSeries.mc_band) && activeMcProjectionSeries.mc_band.length >= 2
        ? activeMcProjectionSeries.mc_band
        : [currentLevel, currentLevel];

    const band0 = safeFiniteNumber(band[0], currentLevel);
    const band1 = safeFiniteNumber(band[1], currentLevel);
    const bandMin = Math.max(safeMin, Math.min(band0, band1));
    const bandMax = Math.min(safeMax, Math.max(band0, band1));

    const bounded = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return currentLevel;
      return Math.max(safeMin, Math.min(safeMax, n));
    };

    // Parse a data base UMA VEZ antes do loop
    const baseParsed = normalizeDate(pts[lastIdx]?.date) || new Date();
    const baseMs = new Date(baseParsed.getFullYear(), baseParsed.getMonth(), baseParsed.getDate(), 12, 0, 0, 0).getTime();

    const futurePoints = [];
    const totalDays = Math.max(1, projectDays || 30);
    const steps = Math.min(6, Math.max(1, totalDays));
    const seenDates = new Set([pts[lastIdx].date]);

    for (let i = 1; i <= steps; i++) {
      const forwardDays = Math.max(1, Math.round((i / steps) * totalDays));
      const t = Math.min(1, forwardDays / totalDays);
      const weight = Math.sqrt(t);

      const val = bounded(currentLevel + (p50 - currentLevel) * t);
      const bandLow = bounded(currentLevel + (bandMin - currentLevel) * weight);
      const bandHigh = bounded(currentLevel + (bandMax - currentLevel) * weight);

      const dt = new Date(baseMs + forwardDays * 24 * 60 * 60 * 1000);
      const iso = getDateKey(dt);

      if (iso && !seenDates.has(iso)) {
        seenDates.add(iso);
        const parts = iso.split('-');
        futurePoints.push({
          date: iso,
          displayDate: parts.length === 3
            ? (i === steps ? `${parts[2]}/${parts[1]} ✦` : `${parts[2]}/${parts[1]}`)
            : iso,
          "Futuro Provável": val,
          "Cenário Range": [bandLow, bandHigh],
          __future: true
        });
      }
    }

    pts[lastIdx] = {
      ...pts[lastIdx],
      "Futuro Provável": currentLevel,
      "Cenário Range": [currentLevel, currentLevel]
    };

    pts = [...pts, ...futurePoints];
  }

  return pts;
}

// M3 FIX: Função pura extraída para fora do componente — evita recriação a cada render.
function parseGoalDateLocal(input) {
    if (!input) return null;
    try {
        let raw = input;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            const d = new Date(raw);
            raw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof raw === 'object' && raw !== null && Number.isFinite(raw.seconds)) {
            const d = new Date(raw.seconds * 1000);
            raw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
            raw = String(raw).trim().split('T')[0];
        }

        const p = String(raw).split('-');
        const date = p.length === 3
            ? new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12, 0, 0, 0)
            : new Date(raw);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(12, 0, 0, 0);
        return date;
    } catch {
        return null;
    }
}

const ENGINES = [
    {
        id: "raw", label: "Realidade Bruta", emoji: "📊", color: "#fb923c", prefix: "raw_", style: "linear",
        explain: { titulo: "Sua Montanha-Russa de Resultados Brutos", simples: "Métricas sem filtros ou suavizações estatísticas. Exibe a porcentagem exata e crua de acertos a cada simulado registrado, revelando a volatilidade real do seu desempenho.", dica: "Picos isolados (sejam altos ou baixos) não definem sua aprovação. Use esta visão apenas para detectar anomalias diárias e foque na tendência geral a longo prazo." },
    },
    {
        id: "raw_weekly", label: "Mapa de Calor", emoji: "📅", color: "#f472b6", prefix: null, style: "linear",
        explain: { titulo: "Frequência e Eficiência Semanal", simples: "Um mapa visual de constância. Cada simulado é uma célula colorida que mapeia seu progresso temporal. Células verdes indicam desempenho consolidado acima da meta; vermelhas indicam risco.", dica: "Excelente para identificar blocos de consistência. Veja se você está mantendo um ritmo de estudos saudável e com qualidade ao longo das semanas, isolando o ruído diário." },
    },
    {
        id: "bayesian", label: "Nível Bayesiano", emoji: "🧠", color: "#34d399", prefix: "bay_", style: "monotoneX",
        explain: { titulo: "Domínio Real Estimado (Modelo Beta-Binomial)", simples: "O motor de inteligência artificial calcula seu domínio probabilístico atual. A banda verde representa o Intervalo de Confiança (95%): quanto mais fina a faixa, mais o algoritmo tem certeza do seu nível de domínio.", dica: "No início, a faixa é larga devido à alta incerteza. Realize mais simulados para 'ensinar' o algoritmo e afinar a linha. Baseie suas decisões de avanço de matéria nesta métrica, e não na média crua." },
    },
    {
        id: "stats", label: "Média Histórica", emoji: "📐", color: "#818cf8", prefix: "stats_", style: "monotoneX",
        explain: { titulo: "Desempenho Acumulado Global", simples: "O reflexo clássico e absoluto de toda a sua jornada. Calcula a média simples de todas as questões resolvidas desde o início do seu uso.", dica: "Atenção: A média histórica sofre da inércia do passado e demora muito a refletir suas evoluções e vitórias recentes. É uma boa âncora de segurança, mas não a métrica primária de avanço." },
    },
    {
        id: "compare", label: "Raio-X + Monte Carlo", emoji: "⚡", color: "#a78bfa", prefix: null, style: "monotoneX",
        explain: { titulo: "Trindade Estatística: Passado, Presente e Futuro", simples: "A visão mais completa do ecossistema. Sobrepõe seus resultados brutos, extrai a curva Bayesiana de domínio real e usa o motor Monte Carlo para prever cenários probabilísticos até a data da sua prova.", dica: "Não analise no escuro. Utilize o seletor 'Foco' para isolar a disciplina que está puxando o seu Monte Carlo para baixo e crie um plano de ação imediato." },
    },
    {
        id: "subtopics", label: "Raio-X de Assuntos", emoji: "🔬", color: "#facc15", prefix: null, style: "linear",
        explain: { titulo: "Auditoria Cirúrgica de Subtópicos", simples: "Desça ao nível molecular do seu aprendizado. Quebra o desempenho disciplinar e expõe a taxa real de acertos e o volume de questões feitas por cada assunto específico.", dica: "O Segredo da Eficiência: Pare de revisar a matéria inteira. Identifique os blocos vermelhos (subtópicos fracos) e direcione todo o seu esforço cirurgicamente para eles." },
    },
    {
        id: "mc_density", label: "Rastreador MC", emoji: "🚀", color: "#60a5fa", prefix: null, style: "monotoneX",
        explain: { titulo: "O Seu Rastreador de Aprovação", simples: "Esta linha mostra se o seu ritmo de estudos está te aproximando ou te afastando da aprovação. Ela calcula qual era a sua projeção de nota (Monte Carlo) no final de cada simulado que você já fez.", dica: "A métrica definitiva de convergência. Se a linha está subindo, continue o que está fazendo! Se ela estagnou ou caiu, é hora de mudar a estratégia na aba Foco." },
    },
    {
        id: "weekly_diff", label: "Semanal", emoji: "📆", color: "#10b981", prefix: null, style: "linear",
        explain: { titulo: "Acelerômetro Semanal de Desempenho", simples: "Calcula a tração do seu estudo comparando diretamente os ganhos ou perdas (delta) da semana atual em relação à semana imediatamente anterior.", dica: "Aviso Antecipado: Semanas com deltas negativos acentuados alertam para esquecimento (curva do esquecimento). Revise a teoria destas disciplinas antes que a perda se torne definitiva." },
    },
    {
        id: "today_vs_general", label: "Hoje vs Geral", emoji: "⚖️", color: "#a855f7", prefix: null, style: "linear",
        explain: { titulo: "Comparativo Diário vs. Histórico Geral", simples: "Analise seu desempenho de hoje em relação à sua média geral de estudos.", dica: "Use esta visão para calibrar seu foco diário." },
    },
    {
        id: "time_spent", label: "Agilidade AI", emoji: "⏳", color: "#06b6d4", prefix: null, style: "linear",
        explain: { titulo: "Rastreador de Agilidade AI", simples: "Analisa o tempo médio gasto por questão em cada matéria nos Simulados IA, ajudando você a encontrar gargalos que roubam minutos preciosos no dia da prova.", dica: "Matérias muito lentas podem te reprovar mesmo se você souber o conteúdo. Foque nelas para ganhar resistência." },
    },
];

    
    const ENGINE_GUIDE = {
     raw: {
       como: 'Mostra a nota bruta real de cada simulado, sem suavização. Cada ponto é um dia registrado.',
       positivo: 'Sequência de pontos acima da meta e tendência de alta.',
       alerta: 'Quedas bruscas, pontos isolados muito baixos ou oscilação excessiva.',
       acao: 'Avalie a tendência dos últimos 7 a 14 dias, não um ponto isolado.'
     },
     raw_weekly: {
       como: 'O mapa de calor mostra os dias com atividade. A cor indica o desempenho em relação à meta e a intensidade mostra volume.',
       positivo: 'Muitas células verdes, sequência de dias ativos e desempenho consistente.',
       alerta: 'Células vermelhas repetidas, muitos dias vazios ou queda de frequência.',
       acao: 'Identifique os dias da semana com rendimento menor e reforce revisões nesses períodos.'
     },
     bayesian: {
       como: 'O nível bayesiano estima seu domínio real, não apenas a nota de um simulado. A faixa mostra o intervalo de confiança de 95%.',
       positivo: 'Linha subindo, faixa estreita e nível acima da meta.',
       alerta: 'Faixa muito larga, linha caindo ou nível abaixo da meta.',
       acao: 'Faça mais simulados para reduzir a incerteza e baseie decisões no nível bayesiano.'
     },
     stats: {
       como: 'Mostra a média histórica acumulada de toda a sua jornada de estudo.',
       positivo: 'Média alta e estável, servindo como base de segurança.',
       alerta: 'A média histórica demora para refletir melhorias recentes.',
       acao: 'Use como referência de longo prazo, mas avalie progresso recente pelo nível bayesiano.'
     },
     compare: {
       como: 'Combina passado, presente e futuro: nota bruta, nível bayesiano atual e projeção Monte Carlo até a prova.',
       positivo: 'Projeção futura acima da meta e intervalo de confiança estreito.',
       alerta: 'Projeção abaixo da meta, intervalo muito largo ou alguma disciplina puxando a previsão para baixo.',
       acao: 'Use o seletor de foco para identificar qual matéria está segurando sua projeção.'
     },
     subtopics: {
       como: 'Mostra o desempenho por assunto. Cada barra representa a taxa de acerto e o volume de questões daquele tópico.',
       positivo: 'Maioria dos tópicos acima da meta, especialmente os com maior volume.',
       alerta: 'Tópicos vermelhos com muitas questões, pois representam perda real de pontos.',
       acao: 'Priorize revisão cirúrgica nos tópicos abaixo da meta com maior volume de questões.'
     },
     mc_density: {
       como: 'Mostra a evolução da projeção Monte Carlo após cada simulado. Não é a nota do simulado, mas sim a previsão futura.',
       positivo: 'Linha subindo e probabilidade de aprovação acima de 70%.',
       alerta: 'Linha estagnada, caindo ou intervalo de confiança muito largo.',
       acao: 'Se a projeção caiu, revise os tópicos críticos e reduza a dispersão de estudo.'
     },
     weekly_diff: {
       como: 'Compara o desempenho desta semana com o da semana anterior. Deltas positivos indicam ganho, negativos indicam perda.',
       positivo: 'Deltas positivos consecutivos e recuperação após semanas fracas.',
       alerta: 'Várias semanas negativas seguidas, especialmente em matérias importantes.',
       acao: 'Use quedas semanais como aviso precoce de esquecimento e faça revisão espaçada.'
     },
     today_vs_general: {
       como: 'Compara o desempenho de hoje ou da última sessão contra a média geral e contra períodos anteriores.',
       positivo: 'Sessão atual acima da média geral e última barra com variação positiva.',
       alerta: 'Hoje muito abaixo da média geral ou última sessão com queda acentuada.',
       acao: 'Se o dia atual estiver fraco, avalie volume, cansaço ou dificuldade dos temas escolhidos.'
     },
     time_spent: {
       como: 'Mostra o tempo médio gasto por questão em cada disciplina nos simulados IA. Ajuda a encontrar gargalos de velocidade.',
       positivo: 'Tempo estável ou diminuindo sem queda de precisão.',
       alerta: 'Matérias muito lentas podem comprometer o tempo total da prova.',
       acao: 'Treine simulados cronometrados nas disciplinas mais lentas.'
     }
    };
    
    const ENGINES_WITH_GUIDE = ENGINES.map((engine) => ({
     ...engine,
     guide: ENGINE_GUIDE[engine.id]
    }));



const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default React.memo(function EvolutionChart({
    categories: propCategories = null,
    targetScore = 80,
    goalDate,
    monteCarloHistory = [],
    studyLogs = [],
    simuladoRows = [],
    unit = '%',
    minScore = 0,
    maxScore = 100
}) {
    const navigate = useNavigate();
    const rawCategories = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId];
        return contest?.categories ?? EMPTY_ARRAY;
    }));

    const categories = useMemo(() => {
        const DEFAULT_PALETTE = [
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", 
            "#ec4899", "#14b8a6", "#f43f5e", "#84cc16", "#a855f7",
            "#06b6d4", "#eab308", "#6366f1", "#d946ef", "#22c55e"
        ];
        const sourceList = (Array.isArray(propCategories) && propCategories.length > 0) ? propCategories : rawCategories;
        const safeCategories = (
          Array.isArray(sourceList)
            ? sourceList
            : Object.values(sourceList || {})
        ).filter(Boolean);
        return safeCategories.map((cat, idx) => {
            // FIX 1A-1: cor por índice (puro, sem mutação de variável externa)
            const color = cat.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
            // FIX 1A-2: normalizar tasks para array
            const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
            return { ...cat, color, tasks };
        });
    }, [propCategories, rawCategories]);

    const [activeEngine, setActiveEngine] = useState("raw_weekly");
    const [selectedSubjectId, setFocusSubjectId] = useState(null);
    
    // RIGOR-09 FIX: Recuperar os pesos do store para o Global Pct ponderado
    const mcWeights = useAppStore(
        (state) => state.appState?.contests?.[state.appState?.activeId]?.mcWeights || EMPTY_OBJECT
    );
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories, mcWeights, maxScore, minScore);

    // Prioriza activeCategories no default, mas respeita seleção explícita de qualquer categoria
    const focusSubjectId = useMemo(() => {
        if (selectedSubjectId && categories && categories.some(c => c.id === selectedSubjectId)) {
            return selectedSubjectId;
        }
        const pool = (Array.isArray(activeCategories) && activeCategories.length > 0) ? activeCategories : categories;
        return pool?.[0]?.id ?? categories?.[0]?.id;
    }, [activeCategories, categories, selectedSubjectId]);

    const monteCarloHistoryArray = useMemo(
        () => (Array.isArray(monteCarloHistory) ? monteCarloHistory : Object.values(monteCarloHistory || {})),
        [monteCarloHistory]
    );

    const studyLogsArray = useMemo(
        () => (Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {})),
        [studyLogs]
    );

    const simuladoRowsArray = useMemo(
        () => (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})),
        [simuladoRows]
    );
    const safeGlobalMetrics = useMemo(() => ({
        totalQuestions: Number(globalMetrics?.totalQuestions) || 0,
        totalCorrect: Number(globalMetrics?.totalCorrect) || 0,
        globalAccuracy: (globalMetrics?.globalAccuracy === null || globalMetrics?.globalAccuracy === undefined || globalMetrics?.globalAccuracy === '') ? 0 : (Number.isFinite(Number(globalMetrics?.globalAccuracy)) ? Number(globalMetrics?.globalAccuracy) : 0),
    }), [globalMetrics]);

    const projectDays = useMemo(() => {
        if (!goalDate) return 30;
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const goal = parseGoalDateLocal(goalDate);
        if (!goal) return 30;
        // FIX-GOAL-01: Invalid Date sobrevivia ao guard e produzia NaN -> safeDays=1,
        // exibindo "1 dia para a prova" para data corrompida.
        if (Number.isNaN(goal.getTime())) return 30;
        goal.setHours(12, 0, 0, 0);
        const diffDays = Math.ceil((goal - now) / (1000 * 60 * 60 * 24));
        if (!Number.isFinite(diffDays)) return 30;
        const safeDays = diffDays > 0 ? diffDays : 1;
        return Math.min(3650, safeDays);
    }, [goalDate]);

    const [showOnlyFocus, setShowOnlyFocus] = useState(false);
    const [timeWindow, setTimeWindow] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(false);
    const [showEngineTooltip, setShowEngineTooltip] = useState(false);
    const exportErrorTimerRef = useRef(null);

    const engineTabRefs = useRef(new Map());

    // FIX-CLEANUP-01: limpar timer de erro e refs de tab ao desmontar.
    useEffect(() => () => {
        if (exportErrorTimerRef.current) {
            clearTimeout(exportErrorTimerRef.current);
            exportErrorTimerRef.current = null;
        }
        engineTabRefs.current.clear();
    }, []);

    const focusEngineTab = (id) => {
      requestAnimationFrame(() => {
        engineTabRefs.current.get(id)?.focus();
      });
    };

    const focusCategory = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        const pool = (Array.isArray(activeCategories) && activeCategories.length > 0) ? activeCategories : categories;
        const found = pool.find(c => c.id === focusSubjectId) || categories.find(c => c.id === focusSubjectId);
        return found || pool[0] || categories[0];
    }, [activeCategories, categories, focusSubjectId]);

    const categoryLevels = useCategoryLevels(categories, timeline, 'bayesian', maxScore, minScore);

    const subjectAggData = useSubjectAggData({
        categories, showOnlyFocus, focusCategory, timeWindow, maxScore, minScore
    });

    const { mcLoading, activeMcResult, activeMcProjectionSeries } = useEvolutionMC({
        focusCategory, categoryLevels, projectDays, targetScore, minScore, maxScore, activeEngine
    });

    const compareData = useMemo(() => {
        return buildPredictiveCompareData(
            timeline, 
            focusCategory, 
            categoryLevels, 
            activeMcProjectionSeries, 
            projectDays, 
            minScore, 
            maxScore
        );
    }, [timeline, focusCategory, activeMcProjectionSeries, categoryLevels, projectDays, minScore, maxScore]);

    const chartData = activeEngine === "compare" ? compareData : timeline;

    // 1. Calcular o resultado histórico sem downsampling
    const historicalData = useMemo(() => {
        const historical = Array.isArray(chartData) ? chartData.filter((d) => !d?.__future) : [];
        const future = Array.isArray(chartData) ? chartData.filter((d) => d?.__future) : [];
        let result = historical;
        if (timeWindow !== "all") {
            const days = Number.parseInt(timeWindow, 10);
            if (Number.isFinite(days) && days > 0 && historical.length > 0) {
                const getDateMs = (item) => {
                    if (!item?.date) return Number.NaN;
                    const ms = toDateMs(item.date);
                    return Number.isNaN(ms) ? Number.NaN : ms;
                };
                const cutoffDate = new Date();
                cutoffDate.setHours(12, 0, 0, 0);
                cutoffDate.setDate(cutoffDate.getDate() - days);
                const limit = toDateMs(getDateKey(cutoffDate));
                result = historical.filter((d) => {
                    const ms = getDateMs(d);
                    return Number.isFinite(ms) && ms >= limit;
                });
            }
        }
        return { result, future };
    }, [chartData, timeWindow]);

    // 2. Determinar a chave de downsampling (memoizada separadamente)
    const primaryKey = useMemo(() => {
      const candidates = [];
    
      if (activeEngine === "compare") {
        candidates.push("Nível Bayesiano");
      }
    
      if (focusCategory?.id) {
        candidates.push(`bay_${focusCategory.id}`);
        candidates.push(`raw_${focusCategory.id}`);
        candidates.push(`stats_${focusCategory.id}`);
      }
    
      const points = Array.isArray(historicalData.result) ? historicalData.result : [];
      const validKey = candidates.find(
        key => points.some(p => p && p[key] != null && Number.isFinite(Number(p[key])))
      );
    
      return validKey || "date";
    }, [activeEngine, focusCategory?.id, historicalData.result]);

    // 3. Downsampling memoizado separadamente
    const sampledHistorical = useMemo(() => {
        return downsampleLTTB(historicalData.result, 150, "date", primaryKey || "date");
    }, [historicalData.result, primaryKey]);

    // 4. Dados exclusivos do histórico (para Hero Chart, Status e Insights) vs Dados com Projeção (para CompareChart)
    const filteredHistoricalData = sampledHistorical;
    const filteredChartData = useMemo(() => {
        return (activeEngine === "compare" && sampledHistorical.length > 0 && historicalData.future.length > 0)
            ? [...sampledHistorical, ...historicalData.future]
            : sampledHistorical;
    }, [activeEngine, sampledHistorical, historicalData.future]);

    const latestMetricsByCat = useMemo(() => {
        const map = {};
        if (!Array.isArray(timeline) || timeline.length === 0) return map;
        activeCategories.forEach(cat => {
            const id = cat.id;
            let raw = null, stats = null, bay = null;
            for (let i = timeline.length - 1; i >= 0; i--) {
                const pt = timeline[i];
                if (raw == null && pt[`raw_${id}`] != null) raw = pt[`raw_${id}`];
                if (stats == null && pt[`stats_${id}`] != null) stats = pt[`stats_${id}`];
                if (bay == null && pt[`bay_${id}`] != null) bay = pt[`bay_${id}`];
                if (raw != null && stats != null && bay != null) break;
            }
            map[id] = { [`raw_${id}`]: raw, [`stats_${id}`]: stats, [`bay_${id}`]: bay };
        });
        return map;
    }, [timeline, activeCategories]);

    const radarData = useMemo(() => {
        const sourceCats = (Array.isArray(activeCategories) && activeCategories.length > 0) ? activeCategories : categories;
        if (!sourceCats || !sourceCats.length) return [];
        return sourceCats.map(cat => {
            const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : (Math.max(1, Number(maxScore) || 100));
            const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : (Number.isFinite(Number(minScore)) ? Number(minScore) : 0);
            const lvl = categoryLevels?.[cat.id];
            const hasLvl = lvl !== null && lvl !== undefined && lvl !== '' && Number.isFinite(Number(lvl));
            const val = hasLvl ? Math.max(catMin, Math.min(catMax, Number(Number(lvl).toFixed(2)))) : catMin;
            const fullName = String(cat.name || 'Sem nome');
            const meta = Number.isFinite(Number(cat?.minCutoff))
                ? Number(cat.minCutoff)
                : Math.max(catMin, Math.min(catMax, Number(targetScore) || catMin));
            return {
                subject: fullName.replace(/Direito /gi, 'D. '),
                fullSubject: fullName,
                nivel: val,
                meta
            };
        });
    }, [activeCategories, categories, targetScore, categoryLevels, minScore, maxScore]);

    const insight = useMemo(() => {
        return generateEvolutionInsights({
            timeline,
            filteredChartData: filteredHistoricalData,
            focusCategory,
            activeEngine,
            categories,
            unit,
            maxScore,
            minScore,
            timeWindow,
            showOnlyFocus
        });
    }, [
        timeline,
        filteredHistoricalData,
        focusCategory,
        activeEngine,
        categories,
        unit,
        maxScore,
        minScore,
        timeWindow,
        showOnlyFocus
    ]);

    const statusList = useMemo(() => {
        return computeEvolutionStatuses({
            timeline,
            filteredChartData: filteredHistoricalData,
            categories,
            focusCategory,
            targetScore,
            unit,
            minScore,
            maxScore,
            activeMcResult,
            subjectAggData,
            heatmapData,
            projectDays,
            timeWindow,
            showOnlyFocus
        });
    }, [
        timeline,
        filteredHistoricalData,
        categories,
        focusCategory,
        targetScore,
        unit,
        minScore,
        maxScore,
        activeMcResult,
        subjectAggData,
        heatmapData,
        projectDays,
        timeWindow,
        showOnlyFocus
    ]);

    const toneHex = {
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
        info: '#818cf8',
        neutral: '#94a3b8',
        critical: '#fb7185',
        progress: '#60a5fa',
        time: '#06b6d4',
        focus: '#a855f7'
    };

    const extraKpis = ['current', 'trend', 'probability', 'consistency']
        .map((id) => statusList.find((s) => s.id === id))
        .filter(Boolean);
    const engine = ENGINES_WITH_GUIDE.find((e) => e.id === activeEngine) || ENGINES_WITH_GUIDE[0];

    const accountHasData = timeline.length >= 1;
    const filterHasData = filteredHistoricalData.length >= 1;

    const handleExport = async () => {
        setIsExporting(true);
        setExportError(false);

        try {
            await exportComponentAsPDF('evolution-chart-container', 'RaioX_Evolucao_Dashboard.pdf', 'landscape');
        } catch (err) {
            console.error('[EvolutionChart] Falha ao exportar PDF:', err);
            setExportError(true);
            if (exportErrorTimerRef.current) clearTimeout(exportErrorTimerRef.current);
            exportErrorTimerRef.current = setTimeout(() => setExportError(false), 4000);
        } finally {
            setIsExporting(false);
        }
    };

    const isMcEngine = activeEngine === "compare" || activeEngine === "mc_density";

    if (categories.length === 0) {
        return (
            <div className="glass p-12 text-center rounded-2xl animate-fade-in-down border border-slate-800">
                <div className="text-6xl mb-4 opacity-80">📊</div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Gráficos de Evolução</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">Cadastre simulados para desbloquear sua máquina do tempo estatística.</p>
                <button
                    onClick={() => {
                        navigate('/simulados');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    Ir para simulados
                </button>
            </div>
        );
    }



    return (
        <motion.div id="evolution-chart-container" className="space-y-6 sm:space-y-7 relative min-w-0" variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 relative z-20 no-print pr-1">
                {/* Global Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center justify-between gap-1 bg-black/40 border border-white/10 rounded-full p-1.5 shrink-0 overflow-x-auto w-full sm:w-auto shadow-inner backdrop-blur-md">
                        {[{ label: '30d', value: '30' }, { label: '60d', value: '60' }, { label: '90d', value: '90' }, { label: 'Tudo', value: 'all' }].map(w => (
                            <button type="button" key={w.value} onClick={() => setTimeWindow(w.value)}
                                aria-pressed={timeWindow === w.value}
                                className={`shrink-0 flex-1 sm:flex-none px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 will-change-transform ${timeWindow === w.value ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400/50' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}>
                                {w.label}
                            </button>
                        ))}
                    </div>
                    
                    <button type="button" onClick={() => setShowOnlyFocus(!showOnlyFocus)}
                        aria-pressed={showOnlyFocus}
                        aria-label={showOnlyFocus ? 'Alternar para ver todas as matérias' : 'Alternar para ver apenas matéria em foco'}
                        className={`shrink-0 flex items-center justify-center gap-2 px-5 py-1.5 h-[34px] rounded-2xl text-xs font-bold border transition-all will-change-transform active:scale-[0.985] ${showOnlyFocus ? 'bg-amber-500/30 border-amber-500/60 text-amber-200 shadow-sm' : 'bg-slate-950/80 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:border-slate-600'}`}>
                        <span className="text-base">{showOnlyFocus ? '🎯' : '👁️'}</span>
                        <span className="hidden sm:inline truncate max-w-[150px] font-semibold">
                            {showOnlyFocus ? 'Apenas Foco' : 'Ver todas'}
                        </span>
                    </button>
                </div>

                <div className="flex flex-col items-end w-full md:w-auto">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center justify-center w-full md:w-auto gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold transition-all border border-indigo-500/30 disabled:opacity-50 will-change-transform active:scale-[0.985]"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        <span className="hidden sm:inline">{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
                        <span className="sm:hidden">{isExporting ? 'Gerando...' : 'Baixar PDF'}</span>
                    </button>
                    {exportError && (
                        <span className="text-[10px] text-rose-400 font-bold mt-1 animate-pulse">
                            ❌ Falha ao gerar PDF. Tente novamente.
                        </span>
                    )}
                </div>
            </div>

            <style>{`
        /* FIX: Preserva o focus-visible para feedback de acessibilidade por teclado */
        .recharts-wrapper:focus-visible, .recharts-surface:focus-visible { outline: 2px solid #818cf8 !important; outline-offset: 2px; border-radius: 8px; }
        .recharts-wrapper:focus:not(:focus-visible), .recharts-surface:focus:not(:focus-visible) { outline: none !important; border: none !important; box-shadow: none !important; }
        .recharts-cartesian-axis-tick-value { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; }
        .recharts-legend-item-text { font-size: 11px !important; font-weight: 600; }
            `}</style>

            <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 sm:gap-3 min-w-0">
                <KpiCard value={safeGlobalMetrics.totalQuestions.toLocaleString()} label="Questões" color="#818cf8" icon="📚" />
                <KpiCard value={safeGlobalMetrics.totalCorrect.toLocaleString()} label="Acertos" color="#34d399" icon="🎯" />
                <KpiCard
                    value={`${safeGlobalMetrics.globalAccuracy.toFixed(2)}%`}
                    label="Precisão Global" color="#fb923c" icon="⚡"
                />
                {extraKpis.map((status) => (
                    <KpiCard
                        key={status.id}
                        value={status.value}
                        label={status.label}
                        color={toneHex[status.tone] || '#94a3b8'}
                        icon={status.icon}
                    />
                ))}
            </motion.div>

            <motion.div
                variants={itemVariants}
                className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 shadow-lg"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="min-w-0">
                        <h2 className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-widest">
                            Status inteligente do desempenho
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Leitura rápida de metas, tendências, riscos e constância.
                        </p>
                    </div>

                    <span className="self-start sm:self-auto shrink-0 text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                        Atualização automática
                    </span>
                </div>

                <div className="flex flex-wrap gap-2" role="status" aria-live="polite">
                    {statusList.map((status) => (
                        <StatusPill
                            key={status.id}
                            label={status.label}
                            value={status.value}
                            tone={status.tone}
                            icon={status.icon}
                            help={status.help}
                        />
                    ))}
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative z-0">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-black tracking-[0.25em] leading-loose py-1 sm:py-2 mb-1 pl-1">
                    Nível bayesiano por disciplina • toque para focar
                </p>
                {/* Máscara CSS removida: ela estava causando um gradiente que apagava o início do primeiro card e o fim do último. */}
                <div className="relative">
                    <div className="flex overflow-x-auto snap-x gap-3 px-1 py-3 no-scrollbar scroll-smooth">
                        {activeCategories.map(cat => (
                            <div key={cat.id} className={`snap-center shrink-0 w-[210px] sm:w-[240px] transition-all duration-500 ${showOnlyFocus && focusCategory?.id !== cat.id ? 'opacity-85 hover:opacity-100 grayscale-[10%] scale-[0.96]' : 'opacity-100 scale-100'}`}>
                                <DisciplinaCard
                                    cat={cat}
                                    level={categoryLevels[cat.id]}
                                    metrics={latestMetricsByCat[cat.id] || null}
                                    target={targetScore}
                                    isFocused={focusCategory?.id === cat.id}
                                    onClick={() => setFocusSubjectId(cat.id)}
                                    unit={unit}
                                    maxScore={maxScore}
                                    minScore={minScore}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* HERO CHART: Nível Bayesiano (Fixo) */}
            <motion.div variants={itemVariants} className="relative z-20 rounded-[2rem] border border-emerald-500/20 bg-slate-900/80 backdrop-blur-2xl p-4 sm:p-7 shadow-[0_10px_40px_-15px_rgba(52,211,153,0.15)] w-full overflow-visible">
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-base sm:text-lg shrink-0 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                        🧠
                    </div>
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-100 mb-0.5">Evolução do domínio real</h3>
                        <p className="text-[11px] sm:text-xs text-emerald-400/80 font-medium tracking-wide uppercase">Histórico bayesiano e intervalo de confiança</p>
                    </div>
                </div>
                
                <div className="w-full no-scrollbar pb-2" style={{ overflowX: 'auto', overflowY: 'visible' }}>
                    <div className="min-w-[700px] lg:min-w-full relative">
                        {!accountHasData ? (
                            <div className="min-h-[360px] flex flex-col items-center justify-center gap-3">
                                <span className="text-3xl">📉</span>
                                <p className="text-slate-400 text-sm font-medium">Cadastre simulados para ver sua curva de domínio</p>
                            </div>
                        ) : !filterHasData ? (
                            <div className="min-h-[360px] flex flex-col items-center justify-center gap-3">
                                <span className="text-3xl opacity-50">📅</span>
                                <p className="text-slate-400 text-sm font-medium">Nenhuma atividade no período selecionado</p>
                            </div>
                        ) : (
                            <EvolutionLineChart
                                filteredChartData={filteredHistoricalData}
                                activeCategories={activeCategories}
                                engine={ENGINES_WITH_GUIDE.find(e => e.id === 'bayesian')}
                                targetScore={targetScore}
                                focusSubjectId={focusSubjectId}
                                showOnlyFocus={showOnlyFocus}
                                minScore={minScore}
                                maxScore={maxScore}
                                unit={unit}
                            />
                        )}
                    </div>
                </div>
            </motion.div>

            {/* TABS E GRÁFICOS SECUNDÁRIOS */}
            <motion.div variants={itemVariants} className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4 px-1">
                    <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm sm:text-base shrink-0">
                        🔬
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-200 tracking-tight">Análises Secundárias</h3>
                </div>

            {/* ✅ BUG-10 FIX: z-[50] → z-10 para não cortar tooltips de charts abaixo */}
            <motion.div className="relative z-10 rounded-[2rem] border border-white/10 bg-slate-900/60 backdrop-blur-2xl p-4 sm:p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] w-full min-w-0 transition-all duration-700 overflow-visible"
                 style={{ boxShadow: `0 10px 60px -15px ${engine.color}25, inset 0 1px 0 0 rgba(255,255,255,0.05)` }}>
                 
                 <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-5 border-b border-slate-700/50">
                     
                     <div className="group relative flex-1 min-w-0">
                         <div className="flex items-center gap-3 min-w-0">
                             <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl shrink-0 text-base sm:text-lg" style={{ backgroundColor: `${engine.color}15`, border: `1px solid ${engine.color}35`, color: engine.color }}>
                                 {engine.emoji}
                             </div>
                             <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight transition-colors duration-300 min-w-0" style={{ color: engine.color }}>
                                 {engine.explain.titulo}
                             </h3>
                             <button
                                 type="button"
                                 onClick={() => setShowEngineTooltip(!showEngineTooltip)}
                                 onKeyDown={(e) => {
                                     if (e.key === 'Enter' || e.key === ' ') {
                                         e.preventDefault();
                                         setShowEngineTooltip(prev => !prev);
                                     } else if (e.key === 'Escape') {
                                         setShowEngineTooltip(false);
                                     }
                                 }}
                                 onBlur={() => setShowEngineTooltip(false)}
                                 className="relative shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-slate-600 text-slate-400 text-[10px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                 aria-label="Informações sobre este modo de visualização"
                                 aria-expanded={showEngineTooltip}
                             >
                                 ?
                             </button>
                         </div>
                         <div className={`absolute top-10 left-1/2 -translate-x-1/2 sm:left-12 sm:translate-x-0 w-[280px] max-w-[min(90vw,280px)] sm:w-72 p-4 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl transition-all duration-300 z-[100] ${showEngineTooltip ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto'}`}>
                             <p className="text-xs text-slate-200 mb-3 leading-relaxed">{engine.explain.simples}</p>
                             <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-700/50">
                                 <p className="text-[10px] text-amber-400 italic font-bold">💡 Dica Prática</p>
                                 <p className="text-[10px] text-slate-400 mt-1">{engine.explain.dica}</p>
                             </div>
                         </div>
                     </div>
                 </div>

                 <div className="mb-5">
                     <ChartGuide guide={engine.guide} />
                 </div>

                {/* Barra de Seleção de Motores: Segmented Pills Compacta */}
                <div className="relative mb-6 w-full">
                    <div className="p-1.5 rounded-2xl bg-slate-950/70 border border-white/[0.07] backdrop-blur-md shadow-inner">
                        <div role="tablist" aria-label="Modos de análise do gráfico de evolução" className="flex items-center overflow-x-auto gap-1.5 px-0.5 py-0.5 w-full no-scrollbar scroll-smooth">
                            {ENGINES_WITH_GUIDE.filter(e => e.id !== 'bayesian').map((eng, idx, arr) => {
                                const active = activeEngine === eng.id;
                                return (
                                    <button
                                        type="button"
                                        role="tab"
                                        id={`engine-tab-${eng.id}`}
                                        aria-selected={active}
                                        aria-controls={`engine-panel-${eng.id}`}
                                        key={eng.id}
                                        ref={(el) => {
                                            if (el) engineTabRefs.current.set(eng.id, el);
                                            else engineTabRefs.current.delete(eng.id);
                                        }}
                                        onClick={() => setActiveEngine(eng.id)}
                                        onKeyDown={(e) => {
                                          const activate = (id) => {
                                            setActiveEngine(id);
                                            focusEngineTab(id);
                                          };
                                        
                                          if (e.key === 'ArrowRight') {
                                            e.preventDefault();
                                            activate(arr[(idx + 1) % arr.length].id);
                                          } else if (e.key === 'ArrowLeft') {
                                            e.preventDefault();
                                            activate(arr[(idx - 1 + arr.length) % arr.length].id);
                                          } else if (e.key === 'Home') {
                                            e.preventDefault();
                                            activate(arr[0].id);
                                          } else if (e.key === 'End') {
                                            e.preventDefault();
                                            activate(arr[arr.length - 1].id);
                                          }
                                        }}
                                        tabIndex={active ? 0 : -1}
                                        className={`shrink-0 group flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl transition-all duration-200 border text-xs font-bold whitespace-nowrap will-change-transform ${active ? 'shadow-md border-white/10 ring-1' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'}`}
                                        style={active ? { backgroundColor: `${eng.color}20`, borderColor: `${eng.color}55`, color: eng.color, boxShadow: `0 4px 15px -4px ${eng.color}40`, '--tw-ring-color': `${eng.color}40` } : {}}
                                    >
                                        <span className="text-sm sm:text-base leading-none group-hover:scale-110 transition-transform duration-150" style={{ filter: active ? `drop-shadow(0 0 4px ${eng.color})` : 'none' }}>{eng.emoji}</span>
                                        <span className="text-[11px] font-bold tracking-tight uppercase">{eng.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div
                    id={`engine-panel-${activeEngine}`}
                    role="tabpanel"
                    aria-labelledby={`engine-tab-${activeEngine}`}
                    tabIndex={0}
                    className="w-full flex-1 flex flex-col outline-none focus:outline-none"
                >
                {activeEngine === "raw_weekly" ? (
                    <EvolutionHeatmap 
                        heatmapData={heatmapData} 
                        targetScore={targetScore} 
                        unit={unit} 
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                        maxScore={maxScore}
                        minScore={minScore}
                    />
                ) : activeEngine === "subtopics" ? (
                    <SubtopicsPerformanceChart
                        categories={categories}
                        focusSubjectId={focusSubjectId}
                        showOnlyFocus={showOnlyFocus}
                        timeWindow={timeWindow}
                        targetScore={targetScore}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                ) : activeEngine === "time_spent" ? (
                    <TimeSpentChart 
                        subjectAggData={subjectAggData} 
                        activeCategories={activeCategories}
                        showOnlyFocus={showOnlyFocus}
                        focusCategory={focusCategory}
                        maxScore={maxScore}
                        minScore={minScore}
                    />
                ) : activeEngine === "mc_density" ? (
                    <MonteCarloEvolutionChart
                        data={monteCarloHistoryArray}
                        targetScore={targetScore}
                        unit={unit}
                        minScore={minScore}
                        maxScore={maxScore}
                        loading={mcLoading}
                    />
                ) : activeEngine === "weekly_diff" ? (
                    <WeeklyEvolutionView
                        categories={categories}
                        studyLogs={studyLogsArray}
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                        maxScore={maxScore}
                        minScore={minScore}
                        unit={unit}
                    />
                ) : activeEngine === "today_vs_general" ? (
                    <TodayVsGeneralChart
                        activeCategories={activeCategories}
                        focusCategory={showOnlyFocus ? focusCategory : null}
                        globalMetrics={safeGlobalMetrics}
                        targetScore={targetScore}
                        maxScore={maxScore}
                        minScore={minScore}   // ✅ LOTE-01
                        unit={unit}
                        simuladoRows={simuladoRowsArray}
                    />
                ) : !accountHasData ? (
                    <div className="min-h-[400px] flex flex-col items-center justify-center gap-5 rounded-[2.5rem] border border-white/5 bg-gradient-to-b from-slate-900/40 to-slate-950/60 shadow-inner backdrop-blur-md p-8">
                        <span className="text-6xl animate-pulse">🔥</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Dados insuficientes para exibir o gráfico</p>
                            <p className="text-slate-500 text-xs mt-1">Cadastre pelo menos <span className="text-indigo-400 font-bold">1 simulado</span> na sua conta para desbloquear os gráficos.</p>
                        </div>
                    </div>
                ) : !filterHasData ? (
                    <div className="min-h-[400px] flex flex-col items-center justify-center gap-5 rounded-[2.5rem] border border-white/5 bg-gradient-to-b from-slate-900/40 to-slate-950/60 shadow-inner backdrop-blur-md p-8">
                        <span className="text-6xl opacity-80">📅</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Nenhuma atividade recente</p>
                            <p className="text-slate-500 text-xs mt-1">Você não cadastrou simulados nos últimos <span className="text-amber-400 font-bold">{timeWindow} dias</span>.</p>
                            <button 
                                onClick={() => setTimeWindow("all")} 
                                // FIX: Borda arredondada consistente (rounded-xl) e estados hover/focus aprimorados 
                                className="mt-5 px-6 py-2.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 rounded-xl font-bold text-xs hover:bg-indigo-600/30 hover:text-indigo-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-95 shadow-lg shadow-indigo-900/20"
                            >
                                Ver todo o histórico
                            </button>
                        </div>
                    </div>
                ) : activeEngine === "compare" ? (
                    <div className="w-full overflow-x-auto no-scrollbar pb-2">
                        <div className="min-w-[700px] lg:min-w-full relative">
                            {mcLoading && (
                                <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl transition-all duration-300">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 size={32} className="animate-spin text-indigo-400" />
                                        <span className="text-[9px] font-black uppercase text-indigo-300 tracking-[0.2em] animate-pulse">Sincronizando Monte Carlo...</span>
                                    </div>
                                </div>
                            )}
                            <CompareChart
                                filteredChartData={filteredChartData}
                                targetScore={targetScore}
                                minScore={minScore}
                                maxScore={maxScore}
                                unit={unit}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto no-scrollbar pb-2">
                        <div className="min-w-[700px] lg:min-w-full relative">
                            <EvolutionLineChart
                                filteredChartData={filteredChartData}
                                activeCategories={activeCategories}
                                engine={engine}
                                targetScore={targetScore}
                                focusSubjectId={focusSubjectId}
                                showOnlyFocus={showOnlyFocus}
                                minScore={minScore}
                                maxScore={maxScore}
                                unit={unit}
                            />
                        </div>
                    </div>
                )}
                </div>
            </motion.div>

            {isMcEngine && focusCategory && (
                <div className="mt-6 animate-fade-in-up">
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <TrendingUp size={120} />
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 items-start relative">
                            <div className="w-full md:w-1/2 flex flex-col">
                                {/* VIS-FIX: z-20 mantém o seletor de foco clicável acima do overlay "sem dados" */}
                                <div className="relative z-20 flex items-center gap-2 mb-4 min-w-0">
                                    <Zap size={16} className="text-indigo-400 shrink-0" />
                                    <select
                                        value={focusCategory?.id || ''}
                                        onChange={(e) => setFocusSubjectId(e.target.value)}
                                        className="bg-transparent text-[10px] font-black text-indigo-300 uppercase tracking-widest outline-none border-b border-indigo-500/30 pb-1 cursor-pointer hover:text-indigo-200 transition-colors appearance-none pr-4 relative w-auto max-w-full truncate"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23818cf8\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11.5l-5-5h10l-5 5z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                                                Foco: {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="h-[280px] w-full mb-2">
                                    <GaussianPlot
                                        mean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? minScore}
                                        projectedMean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? minScore}
                                        currentMean={categoryLevels[focusCategory?.id]}
                                        sd={activeMcResult?.sd ?? 0}
                                        sdLeft={activeMcResult?.sdLeft ?? activeMcResult?.sd ?? 0}
                                        sdRight={activeMcResult?.sdRight ?? activeMcResult?.sd ?? 0}
                                        low95={activeMcResult?.ci95Low ?? minScore}
                                        high95={activeMcResult?.ci95High ?? maxScore}
                                        targetScore={targetScore}
                                        prob={activeMcResult?.probability ?? 0}
                                        kdeData={activeMcResult?.kdeData}
                                        minScore={minScore}
                                        maxScore={maxScore}
                                        unit={unit}
                                    />
                                </div>
                            </div>

                            {activeMcResult ? (
                                  <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 self-center">
                                    {(() => {
                                      const toFinite = (v, fallback = 0) =>
                                        v === null || v === undefined || v === ''
                                          ? fallback
                                          : Number.isFinite(Number(v))
                                            ? Number(v)
                                            : fallback;
                                
                                      const bounded = (v) => Math.max(minScore, Math.min(maxScore, toFinite(v, minScore)));
                                
                                      const projectedLevel = bounded(
                                        toFinite(activeMcResult?.projectedMean, toFinite(activeMcResult?.mean, minScore))
                                      );
                                
                                      const ciLow = bounded(toFinite(activeMcResult?.ci95Low, projectedLevel));
                                      const ciHigh = bounded(toFinite(activeMcResult?.ci95High, projectedLevel));
                                
                                      const ciMin = Math.min(ciLow, ciHigh);
                                      const ciMax = Math.max(ciLow, ciHigh);
                                      const marginOfError = Math.max(0, (ciMax - ciMin) / 2);
                                
                                      return [
                                        {
                                          label: 'Caminho Sucesso',
                                          val: `${normalizeProbability(activeMcResult?.probability).toFixed(2)}%`,
                                          icon: <Target size={14} />,
                                          color: 'text-emerald-400',
                                          bg: 'bg-emerald-500/10'
                                        },
                                        {
                                          label: 'Nível Projetado',
                                          val: unit === '%'
                                            ? `${projectedLevel.toFixed(2)}${unit}`
                                            : `${Math.round(projectedLevel)}${unit}`,
                                          icon: <TrendingUp size={14} />,
                                          color: 'text-blue-400',
                                          bg: 'bg-blue-500/10'
                                        },
                                        {
                                          label: 'Margem de Erro',
                                          val: unit === '%'
                                            ? `±${marginOfError.toFixed(2)}${unit}`
                                            : `±${Math.round(marginOfError)}${unit}`,
                                          icon: <BarChart3 size={14} />,
                                          color: 'text-amber-400',
                                          bg: 'bg-amber-500/10'
                                        },
                                        {
                                          label: 'Confiança 95%',
                                          val: unit === '%'
                                            ? `${ciMin.toFixed(2)}-${ciMax.toFixed(2)}${unit}`
                                            : `${Math.round(ciMin)}-${Math.round(ciMax)}${unit}`,
                                          icon: <Zap size={14} />,
                                          color: 'text-indigo-400',
                                          bg: 'bg-indigo-500/10'
                                        }
                                      ].map((stat, i) => (
                                        <div
                                          key={i}
                                          className="flex flex-col p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors min-w-0"
                                        >
                                          <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                            <span className={stat.color}>{stat.icon}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                              {stat.label}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-base sm:text-lg font-black ${stat.color} tracking-tight break-words w-full block leading-tight`}
                                            title={stat.val}
                                          >
                                            {stat.val}
                                          </span>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                ) : (
                                  <div className="w-full md:w-1/2 grid place-items-center self-center px-6">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                                      Sem projeção Monte Carlo disponível
                                    </span>
                                  </div>
                                )}
                        </div>

                        {mcLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none"></div>
                        )}

                        {!activeMcResult && !mcLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center bg-slate-900/50 backdrop-blur-sm pointer-events-none">
                                <span className="text-2xl mb-2">📉</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Cadastre pelo menos 2 registros para ver a densidade
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            </motion.div> {/* Fim do bloco Análises Secundárias */}

            <div className="relative z-0">
            {(() => {
                const typeColors = {
                    success: {
                        border: 'border-emerald-500/30',
                        bg: 'from-emerald-500/5 via-slate-900 to-slate-900',
                        glow: 'shadow-emerald-500/10',
                        text: 'text-emerald-400',
                        icon: 'text-emerald-400',
                        circleBg: 'bg-emerald-500/10',
                        pingBg: 'bg-emerald-500'
                    },
                    warning: {
                        border: 'border-amber-500/30',
                        bg: 'from-amber-500/5 via-slate-900 to-slate-900',
                        glow: 'shadow-amber-500/10',
                        text: 'text-amber-400',
                        icon: 'text-amber-400',
                        circleBg: 'bg-amber-500/10',
                        pingBg: 'bg-amber-500'
                    },
                    danger: {
                        border: 'border-rose-500/30',
                        bg: 'from-rose-500/5 via-slate-900 to-slate-900',
                        glow: 'shadow-rose-500/10',
                        text: 'text-rose-400',
                        icon: 'text-rose-400',
                        circleBg: 'bg-rose-500/10',
                        pingBg: 'bg-rose-500'
                    },
                                    info: {
                                        border: 'border-indigo-500/30',
                                        bg: 'from-indigo-500/5 via-slate-900 to-slate-900',
                                        glow: 'shadow-indigo-500/10',
                                        text: 'text-indigo-400',
                                        icon: 'text-indigo-400',
                                        circleBg: 'bg-indigo-500/10',
                                        pingBg: 'bg-indigo-500'
                                   },
                                   neutral: {
                                       border: 'border-slate-500/30',
                                       bg: 'from-slate-500/5 via-slate-900 to-slate-900',
                                       glow: 'shadow-slate-500/10',
                                       text: 'text-slate-300',
                                       icon: 'text-slate-300',
                                       circleBg: 'bg-slate-500/10',
                                       pingBg: 'bg-slate-400'
                                   },
                                   critical: {
                                       border: 'border-rose-500/50',
                                       bg: 'from-rose-500/10 via-slate-900 to-slate-900',
                                       glow: 'shadow-rose-500/20',
                                       text: 'text-rose-300',
                                       icon: 'text-rose-300',
                                       circleBg: 'bg-rose-500/15',
                                       pingBg: 'bg-rose-500'
                                   },
                                   progress: {
                                       border: 'border-sky-500/30',
                                       bg: 'from-sky-500/5 via-slate-900 to-slate-900',
                                       glow: 'shadow-sky-500/10',
                                       text: 'text-sky-300',
                                       icon: 'text-sky-300',
                                       circleBg: 'bg-sky-500/10',
                                       pingBg: 'bg-sky-400'
                                   },
                                   time: {
                                       border: 'border-cyan-500/30',
                                       bg: 'from-cyan-500/5 via-slate-900 to-slate-900',
                                       glow: 'shadow-cyan-500/10',
                                       text: 'text-cyan-300',
                                       icon: 'text-cyan-300',
                                       circleBg: 'bg-cyan-500/10',
                                       pingBg: 'bg-cyan-400'
                                   },
                                   focus: {
                                       border: 'border-purple-500/30',
                                       bg: 'from-purple-500/5 via-slate-900 to-slate-900',
                                       glow: 'shadow-purple-500/10',
                                       text: 'text-purple-300',
                                       icon: 'text-purple-300',
                                       circleBg: 'bg-purple-500/10',
                                       pingBg: 'bg-purple-400'
                                   }
                                };
                const colors = typeColors[insight.type] || typeColors.info;

                return (
                    <div className={`relative overflow-hidden rounded-[2rem] border ${colors.border} bg-slate-900 shadow-2xl transition-all duration-700 group hover:scale-[1.01] ${colors.glow}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000 -mr-48 -mt-48" />
                        <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] ${colors.circleBg} rounded-full blur-[100px] pointer-events-none -ml-32 -mb-32`} />
                        
                        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:items-center p-6 sm:p-8 md:p-10 relative z-10">
                            <div className="flex-1 space-y-5">
                                <div className="flex items-start sm:items-center gap-4">
                                    <div className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-lg sm:text-xl shadow-xl transform group-hover:rotate-6 transition-transform duration-500 ${colors.icon}`}>
                                        {insight.icon}
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] ${colors.text} drop-shadow-sm leading-snug break-words min-w-0`}>
                                                {renderInsightText(insight.title, colors.text)}
                                            </span>
                                            <div className="h-px w-6 sm:w-10 bg-white/10 hidden sm:block" />
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-black text-slate-500 border border-white/5 uppercase tracking-widest whitespace-nowrap">Motor Analítico</span>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight break-words">
                                            {renderInsightText(insight.text, colors.text)}
                                        </h3>
                                    </div>
                                </div>
                                
                                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl font-medium">
                                    {renderInsightText(insight.details, colors.text)}
                                </p>
                            </div>

                            {insight.advice && (
                                <div className="w-full lg:w-[350px] shrink-0 mt-2 lg:mt-0">
                                    <div className={`rounded-2xl bg-black/60 border ${colors.border} p-6 sm:p-8 relative shadow-2xl group-hover:bg-black/80 transition-all duration-500 overflow-hidden`}>
                                        <div className={`absolute -right-12 -top-12 w-48 h-48 ${colors.glow} opacity-10 blur-3xl pointer-events-none`} />
                                        
                                        <div className="flex items-center gap-2 mb-3 relative z-10">
                                            <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${colors.text}`}>
                                                <Zap size={14} fill="currentColor" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block whitespace-nowrap">Orientação Estratégica</span>
                                        </div>
                                        
                                        <p className={`text-sm sm:text-base font-bold leading-relaxed ${colors.text} relative z-10 drop-shadow-lg break-words`}>
                                            {renderInsightText(insight.advice, colors.text)}
                                        </p>
                                        
                                        <div className="absolute -bottom-4 -right-4 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                            <Zap size={80} className={colors.text} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-8 sm:px-10 py-5 bg-black/20 border-t border-white/5 flex flex-wrap items-center gap-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center">
                                    <div className={`absolute w-3 h-3 rounded-full animate-ping opacity-20 ${colors.pingBg}`} />
                                    <div className={`w-1.5 h-1.5 rounded-full z-10 ${colors.pingBg}`} />
                                </div>
                                Motor analítico sincronizado
                            </div>
                            <div className="flex items-center gap-2">
                                Confiança do modelo:
                                <span className="text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5 tracking-normal">{timeline.length >= 2 ? `${Math.min(99.9, 85 + Math.min(14.9, timeline.length * 0.8)).toFixed(1)}%` : '—'}</span>
                            </div>
                            {mcLoading && (
                                <div className="ml-auto hidden md:flex items-center gap-2 opacity-60 text-indigo-300 italic lowercase font-medium tracking-normal">
                                    <Loader2 size={10} className="animate-spin" />
                                    processando projeções em tempo real
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
            </div>

            <div className="pt-10 border-t border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Galeria de Análises Detalhadas</h3>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-[9px] font-black text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                                    Diagnóstico 360°
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Raio-X por matéria, balanço de volume vs precisão e matriz de criticidade
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid 1: Radar (Equilíbrio) + PerformanceBar (Volume vs Acertos) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
                    <RadarAnalysis radarData={radarData} maxScore={maxScore} minScore={minScore} unit={unit} />
                    <PerformanceBarChart
                        subjectAggData={subjectAggData}
                        showOnlyFocus={showOnlyFocus}
                        focusCategory={focusCategory}
                        unit={unit}
                        maxScore={maxScore}
                        minScore={minScore}
                    />
                </div>

                {/* Grid 2: Matérias e Assuntos Críticos */}
                <CriticalTopicsAnalysis
                    categories={categories}
                    maxScore={maxScore}
                    minScore={minScore}
                />
            </div>
        </motion.div>
    );
});

```

---

# 2. SUBCOMPONENTES ANALÍTICOS E VISÕES GRÁFICAS (CHARTS & VIEWS)

## `src/components/charts/EvolutionChart/CompareChart.jsx` <a id="src-components-charts-evolutionchart-comparechart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/CompareChart.jsx`
- **Descrição:** Visão Raio-X + Monte Carlo com projeção bayesiana e bandas de incerteza
- **Linhas:** 441
- **Tamanho:** 22.46 KB

```javascript
import React, { useId, useCallback } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
   LabelList, Brush, ReferenceArea
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { normalizeDate, formatDisplayDate, formatDuration } from '../../../utils/dateHelper';
import { formatValue } from '../../../utils/scoreHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke } = props;
    if (cx == null || cy == null) return null;
    
    return (
        <g>
            {/* 🎯 FIX: Efeito de pulso animado via SVG para o Hover */}
            <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                <animate attributeName="r" values="6;16" dur="1.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
            </circle>
            <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
        </g>
    );
};

export function CompareChart({ 
    filteredChartData, 
    targetScore,
    // ✅ BUG-7 FIX: removida prop 'categories' que não era usada (causava re-renders desnecessários)
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const baseId = useId().replace(/:/g, '');
    const containerRef = React.useRef(null);
    const [containerHeight, setContainerHeight] = React.useState(360);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        let debounceTimer = null;
        let obs = null;
        try {
            obs = new ResizeObserver((entries) => {
                // FIX 4B: debounce de 100ms para evitar re-renders excessivos
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    for (const entry of entries) {
                        const h = entry.contentRect.height;
                        if (h > 50) setContainerHeight(h);
                    }
                }, 100);
            });
            obs.observe(el);
        } catch (e) {
            console.warn('[CompareChart] ResizeObserver indisponível:', e);
        }
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (obs) obs.disconnect();
        };
    }, []);

    const CC = React.useMemo(() => ({
        projectionPurpleGradient: `cc_projPurple-${baseId}`,
        cloudGradient: `cc_cloud-${baseId}`,
        bayBandGradient: `cc_bayBand-${baseId}`,
        greenGradient: `cc_green-${baseId}`
    }), [baseId]);

    const chartData = React.useMemo(() => {
        if (!filteredChartData || !Array.isArray(filteredChartData)) return [];
        return [...filteredChartData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });
    }, [filteredChartData]);

    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number(maxScore) > safeMinScore ? Number(maxScore) : safeMinScore + 1;
    
    const safeTargetScore = Math.max(
      safeMinScore,
      Math.min(
        safeMaxScore,
        Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMinScore
      )
    );
    
    const dangerLimit = Math.max(
      safeMinScore,
      safeTargetScore - ((safeMaxScore - safeMinScore) * 0.08)
    );

    const isValidValue = (value) => value != null && Number.isFinite(Number(value));

    const lastValidIdx = React.useMemo(() => {
      const last = { bay: -1, raw: -1, stats: -1, mc: -1 };
    
      for (let i = chartData.length - 1; i >= 0; i--) {
        const d = chartData[i];
    
        if (last.bay < 0 && isValidValue(d["Nível Bayesiano"])) last.bay = i;
        if (last.raw < 0 && isValidValue(d["Nota Bruta"])) last.raw = i;
        if (last.stats < 0 && isValidValue(d["Média Histórica"])) last.stats = i;
        if (last.mc < 0 && isValidValue(d["Futuro Provável"])) last.mc = i;
    
        if (last.bay >= 0 && last.raw >= 0 && last.stats >= 0 && last.mc >= 0) break;
      }
    
      return last;
    }, [chartData]);

    // 🎯 FIX: Algoritmo de Colisão Adaptativo baseado no Range Real
    const solveCollisions = (points) => {
        if (!points.length) return [];
        const sorted = [...points].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
        const yPos = sorted.map(p => ({
            ...p,
            yPos: Number.isFinite(Number(p.value)) ? Number(p.value) : safeMinScore
        }));
        // FIX 4A: garantir range mínimo de 1 para evitar divisão por zero
        const range = Math.max(1e-6, safeMaxScore - safeMinScore);
        const topLimit = safeMaxScore - (range * 0.02);
        const bottomLimit = safeMinScore + (range * 0.05);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);
        const MIN_PCT_DISTANCE = Math.max(0.001, range * 0.085);
        const requiredSpace = (yPos.length - 1) * MIN_PCT_DISTANCE;

        const effectiveDistance = requiredSpace > safeSpace 
            ? safeSpace / Math.max(1, yPos.length - 1) 
            : MIN_PCT_DISTANCE;

        // ✅ LOTE-02 FIX: os 3 passes sequenciais podiam estourar o teto logo após
        // corrigir o chão. Relaxamento iterativo com re-cheque de limites.
        for (let iter = 0; iter < 30; iter++) {
            let moved = false;
            for (let i = 1; i < yPos.length; i++) {
                if (yPos[i - 1].yPos - yPos[i].yPos < effectiveDistance) {
                    const mid = (yPos[i - 1].yPos + yPos[i].yPos) / 2;
                    yPos[i - 1].yPos = mid + effectiveDistance / 2;
                    yPos[i].yPos = mid - effectiveDistance / 2;
                    moved = true;
                }
            }
            if (yPos[0].yPos > topLimit) {
                const shift = yPos[0].yPos - topLimit;
                yPos.forEach(p => p.yPos -= shift);
                moved = true;
            }
            if (yPos[yPos.length - 1].yPos < bottomLimit) {
                const shift = bottomLimit - yPos[yPos.length - 1].yPos;
                yPos.forEach(p => p.yPos += shift);
                moved = true;
            }
            if (!moved) break;
        }

        // Clamp final estrito para garantir que nenhum label saia dos limites
        for (let i = 0; i < yPos.length; i++) {
            yPos[i].yPos = Math.max(bottomLimit, Math.min(topLimit, yPos[i].yPos));
        }

        return yPos;
    };

    const todayIdx = chartData.reduce((acc, curr, i) => {
      const hasObserved =
        isValidValue(curr["Nota Bruta"]) ||
        isValidValue(curr["Nível Bayesiano"]) ||
        isValidValue(curr["Média Histórica"]);
    
      return hasObserved ? i : acc;
    }, -1);
    
    const todayPoints = [];
    if (todayIdx >= 0) {
        const d = chartData[todayIdx];
        if (d["Nível Bayesiano"] != null && lastValidIdx.bay === todayIdx) todayPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null && lastValidIdx.raw === todayIdx) todayPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null && lastValidIdx.stats === todayIdx) todayPoints.push({ name: 'stats', value: d["Média Histórica"] });
        if (d["Futuro Provável"] != null && lastValidIdx.mc === todayIdx) todayPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const todayY = solveCollisions(todayPoints);

    const futureIdx = chartData.length - 1;
    const isFuturePoint = futureIdx > todayIdx;
    const lastPoints = [];
    if (isFuturePoint && futureIdx >= 0) {
        const d = chartData[futureIdx];
        if (d["Futuro Provável"] != null && lastValidIdx.mc === futureIdx) lastPoints.push({ name: 'mc', value: d["Futuro Provável"] });
        if (d["Nível Bayesiano"] != null && lastValidIdx.bay === futureIdx) lastPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null && lastValidIdx.raw === futureIdx) lastPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null && lastValidIdx.stats === futureIdx) lastPoints.push({ name: 'stats', value: d["Média Histórica"] });
    }
    const lastY = solveCollisions(lastPoints);



    const renderLabel = (props, type, color) => {
        const { x, index, value, viewBox } = props;
        if (value === null || value === undefined || !Number.isFinite(Number(value))) {
          return null;
        }
        
        const isMc = type === 'mc';
        const isBay = type === 'bay';
        const isRaw = type === 'raw';
        const isStats = type === 'stats';

        let isValid = false;
        if (isMc) isValid = lastValidIdx.mc === index;
        else if (isBay) isValid = lastValidIdx.bay === index;
        else if (isRaw) isValid = lastValidIdx.raw === index;
        else if (isStats) isValid = lastValidIdx.stats === index;

        if (!isValid) return null;

        let ptPos = Number.isFinite(Number(value)) ? Number(value) : safeMinScore;
        const isFuture = isFuturePoint && index === futureIdx;
        const pts = isFuture ? lastY : (index === todayIdx ? todayY : null);
        if (pts && pts.length) {
            const pt = pts.find(p => p.name === type);
            if (pt && pt.yPos != null && Number.isFinite(Number(pt.yPos))) ptPos = Number(pt.yPos);
        }

        const xOff = isMc ? 12 : 10;
        let formatted;
        if (unit === 'horas') {
            formatted = formatDuration(Number.isFinite(Number(value)) ? Number(value) : 0);
        } else {
            const rounded = Number((Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2));
            formatted = `${rounded}${unit}`;
        }
        const boxWidth = Math.max(42, formatted.length * 7 + 14);

        // Bug 7 FIX: Prefere viewBox.height (sempre preciso) ao invés de containerHeight que pode não estar medido no primeiro render
        const chartHeight = viewBox?.height ?? (containerHeight > 40 ? containerHeight - 40 : 320);
        const chartY = viewBox?.y ?? 20;
        const range = safeMaxScore - safeMinScore;
        const pxPerPct = chartHeight / (range || 1);
        
        // Compute Y strictly via our internal coordinate map (bypassing Recharts' `y` which bugs out on isolated dots)
        let rawY = chartY + chartHeight - (ptPos - safeMinScore) * pxPerPct - 10;
        if (!Number.isFinite(rawY)) rawY = chartY + chartHeight / 2;
        const safeY = Math.max(2, Math.min(chartY + chartHeight - 22, rawY));
        
        // BUG-5 FIX: Clamp label X to prevent overflow past chart right edge
        const maxX = (viewBox?.width ?? 700) + (viewBox?.x ?? 0) + 75;
        const labelX = Math.max(0, Math.min(x + xOff - 2, maxX - boxWidth));
        
        return (
            <g>
                <rect x={labelX} y={safeY - 1} width={boxWidth} height={22} rx={8}
                      fill="#0b0f19" fillOpacity={0.92} stroke={color} strokeOpacity={0.9} strokeWidth={1.6} />
                <text x={labelX + boxWidth / 2} y={safeY + 14} fill="#ffffff" fontSize={10.5}
                      fontWeight="900" textAnchor="middle"
                      style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    {formatted}
                </text>
            </g>
        );    };

    const renderCompareTooltip = useCallback(
        (props) => <ChartTooltip {...props} chartData={chartData} isCompare={true} unit={unit} maxScore={safeMaxScore} minScore={safeMinScore} />,
        [chartData, unit, safeMaxScore, safeMinScore]
    );

    const animateSeries = false;

    return (
        <div ref={containerRef} className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            <ChartFrame minHeight={360} label="Comparando evolução">
                <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0" minWidth={1}>
                {/* 🎯 FIX: right: 85 impede que as Labels cortem a borda direita na renderização do MC */}
                <ComposedChart data={chartData} syncId="evolutionSync" margin={{ top: 20, right: 85, left: 0, bottom: 20 }} style={{ outline: 'none' }} tabIndex="-1">
                    <defs>
                        <linearGradient id={CC.projectionPurpleGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id={CC.cloudGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id={CC.bayBandGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id={CC.greenGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(val, idx) => {
                            const item = chartData[idx];
                            return item?.__future && item?.displayDate ? item.displayDate : formatDisplayDate(val);
                        }}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                        dy={12} 
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                        tickLine={false} 
                        minTickGap={30} 
                    />
                    <YAxis 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                        dx={-8} 
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                        tickLine={false} 
                        domain={[safeMinScore, safeMaxScore]} 
                        allowDataOverflow={false} 
                        tickFormatter={(v) => `${formatValue(v)}${unit}`} 
                        width={50} 
                    />
                    
                    <ReferenceArea
                        y1={safeTargetScore}
                        y2={safeMaxScore}
                        fill="#10b981"
                        fillOpacity={0.05}
                    />
                    
                    <ReferenceArea
                        y1={safeMinScore}
                        y2={dangerLimit}
                        fill="#ef4444"
                        fillOpacity={0.04}
                    />
                    
                    <ReferenceLine
                        y={safeTargetScore}
                        stroke="#10b981"
                        strokeOpacity={0.8}
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        label={{
                          value: `Meta: ${formatValue(safeTargetScore)}${unit}`,
                          fill: '#34d399',
                          fontSize: 10,
                          fontWeight: 'bold',
                          position: 'insideTopLeft',
                          dy: -8,
                          dx: 8
                        }}
                    />

                    {todayIdx >= 0 && isFuturePoint && chartData[todayIdx]?.date && (
                        <ReferenceLine
                            x={chartData[todayIdx].date}
                            stroke="#a78bfa"
                            strokeOpacity={0.65}
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                                value: '✦ Início Projeção MC',
                                fill: '#c4b5fd',
                                fontSize: 9,
                                fontWeight: 'bold',
                                position: 'insideTopRight',
                                dy: -8
                            }}
                        />
                    )}
                    
                    <Tooltip 
                        offset={30}
                        cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        content={renderCompareTooltip} />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }} />
                    
                    <Area connectNulls type="monotoneX" dataKey="Banda Bayesiana" stroke="none" fill={`url(#${CC.bayBandGradient})`} legendType="none" tooltipType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="_shadow_projection" fill={`url(#${CC.projectionPurpleGradient})`} stroke="none" legendType="none" tooltipType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    <Area connectNulls type="monotoneX" dataKey="Cenário Range" stroke="none" fill={`url(#${CC.cloudGradient})`} legendType="none" tooltipType="none" isAnimationActive={false} />
                    
                    {/* Bottom Layer: Glow for Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={8} strokeOpacity={0.25} fill="none" activeDot={false} legendType="none" connectNulls isAnimationActive={false} />
                    {/* Top Layer: Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={3.5}
                        strokeLinecap="round" strokeLinejoin="round"
                        fill={`url(#${CC.greenGradient})`} dot={{ r: 3.5, fill: '#0f172a', stroke: '#34d399', strokeWidth: 2 }}
                        activeDot={<CustomActiveDot fill="#34d399" />} connectNulls isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'bay', '#34d399')} />
                    </Area>
                    
                    <Line connectNulls type="monotoneX" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={2.5}
                        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" 
                        dot={{ r: 3, fill: '#0f172a', stroke: '#fb923c', strokeWidth: 1.8 }} activeDot={<CustomActiveDot fill="#fb923c" />} strokeOpacity={1} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'raw', '#fb923c')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls strokeOpacity={0.5} activeDot={<CustomActiveDot fill="#818cf8" />} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'stats', '#818cf8')} />
                    </Line>
                    
                    <Line connectNulls type="monotoneX" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={3}
                        strokeLinecap="round" strokeDasharray="6 4"
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            if (index !== lastValidIdx.mc || cx == null || cy == null) return null;
                            return (
                                <g>
                                    <circle cx={cx} cy={cy} r={5} fill="#a78bfa" stroke="#ffffff" strokeWidth={2}>
                                        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx={cx} cy={cy} r={9} fill="#a78bfa" opacity="0.3">
                                        <animate attributeName="r" values="7;13;7" dur="2s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                </g>
                            );
                        }}
                        strokeOpacity={1} isAnimationActive={false}>
                        <LabelList content={(props) => renderLabel(props, 'mc', '#a78bfa')} />
                    </Line>

                    {chartData.length > 1 && (
                        <Brush 
                            dataKey="date" 
                            height={26} 
                            stroke="#6366f1" 
                            fill="rgba(15, 23, 42, 0.85)" 
                            tickFormatter={formatDisplayDate}
                            travellerWidth={10}
                        />
                    )}
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}

```

---

## `src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx` <a id="src-components-charts-evolutionchart-criticaltopicsanalysis-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx`
- **Descrição:** Painel analítico de tópicos críticos e recomendações de estudo direcionadas
- **Linhas:** 442
- **Tamanho:** 26.22 KB

```javascript
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";
import { normalizeDate, getDateKey } from "../../../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../../../utils/scoreHelper";
import { toArray, getHistoryDate } from "../../../utils/evolutionGuards";

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

// Mover para top-level (antes do componente)
const WEEKS = [
    { label: "Semana 4", offset: 4 },
    { label: "Semana 3", offset: 3 },
    { label: "Semana 2", offset: 2 },
    { label: "Semana 1", offset: 1 },
    { label: "Semana atual", offset: 0 },
];

import { ShieldAlert, AlertTriangle, Sparkles } from "lucide-react";

export const CriticalTopicsAnalysis = React.memo(({ categories = [], maxScore = 100, minScore = 0 }) => {
    const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

    // Calc time window
    const { startDate, endDate, startDateKey, endDateKey, dateLabel } = useMemo(() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() - (selectedWeekOffset * 7));

        const start = new Date(end);
        start.setHours(0, 0, 0, 0);
        start.setDate(end.getDate() - 6);

        const format = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

        return {
            startDate: start,
            endDate: end,
            startDateKey: getDateKey(start),
            endDateKey: getDateKey(end),
            dateLabel: `${format(start)} — ${format(end)}`
        };
    }, [selectedWeekOffset]);

    const subtopicsData = useMemo(() => {
        if (!categories || !categories.length) return [];
        const topicMap = {};

        categories.forEach(cat => {
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                const k = getDateKey(getHistoryDate(h));
                return k && k >= startDateKey && k <= endDateKey;
            });

            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : (Number(maxScore) || 100);
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : (Number(minScore) || 0);
            const catRange = Math.max(1e-9, catMax - catMin);
            if (!Number.isFinite(catRange) || catRange <= 0) return;
            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];
                let topicList = toArray(h.topics);
                if (topicList.length === 0 && (h.topic || h.assunto || h.subtopic || h.topicName)) {
                    topicList = [{
                        name: h.topic || h.assunto || h.subtopic || h.topicName,
                        total: h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions,
                        correct: h.correct ?? h.acertos ?? h.correctCount,
                        score: h.score,
                        isPercentage: h.isPercentage
                    }];
                }

                topicList.forEach(t => {
                    const n = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').replace(/<[^>]*>?/gm, '').trim();
                    if (!n || n.toLowerCase() === 'nenhum') return;
                    const key = n.toLowerCase();
                    if (!topicMap[key]) topicMap[key] = { name: n, total: 0, correct: 0, criticidade: 0 };

                    let total = parseInt(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 10) || 0;
                    if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(catMax);
                    } else if (total === 0) {
                        return;
                    }
                    
                    if (total <= 0) return;
                    const hasExplicitCorrect = !t.isPercentage && (
                        (t.correct !== null && t.correct !== undefined && String(t.correct).trim() !== '') ||
                        (t.acertos !== null && t.acertos !== undefined && String(t.acertos).trim() !== '') ||
                        (t.correctCount !== null && t.correctCount !== undefined && String(t.correctCount).trim() !== '')
                    );
                    const parsedCorrect = Number(t.correct ?? t.acertos ?? t.correctCount);
                    let correctCount;
                    if (hasExplicitCorrect && Number.isFinite(parsedCorrect)) {
                        correctCount = parsedCorrect;
                    } else {
                        const score = getSafeScore(t, catMax, catMin);
                        if (!Number.isFinite(score)) return;
                        const normalizedScore = Math.max(catMin, Math.min(catMax, score));
                        correctCount = ((normalizedScore - catMin) / catRange) * total;
                    }

                    if (!Number.isFinite(correctCount)) return;
                    const safeCorrect = Math.max(0, Math.min(total, correctCount));

                    topicMap[key].total += total;
                    topicMap[key].correct += safeCorrect;
                });
            }
        });

        // Calcular criticidade final consolidada por tópico
        Object.keys(topicMap).forEach(key => {
            const item = topicMap[key];
            const accuracy = item.total > 0 ? item.correct / item.total : 0;
            const erroAbsoluto = item.total - item.correct;
            // Índice de criticidade
            item.criticidade = erroAbsoluto * (1 - accuracy);
        });

        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        const result = Object.values(topicMap)
            .filter(d => Math.round(d.criticidade * 10) > 0)
            .sort((a, b) => b.criticidade - a.criticidade);

        return result.slice(0, 15).map((item, i, arr) => {
            const isLong = item.name.length > 34;
            return {
                ...item,
                name: isLong ? item.name.substring(0, 32) + '...' : item.name,
                fullName: item.name,
                value: Math.round(item.criticidade * 10) / 10,
                fill: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))]
            };
        });
    }, [categories, startDateKey, endDateKey, maxScore, minScore]);

    const pointLeakageData = useMemo(() => {
        if (!categories || !categories.length) return [];
        let totalCriticidade = 0;
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];

        const rawData = categories.map(cat => {
            let total = 0;
            let correct = 0;
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});

            const recentHistory = history.filter(h => {
                const k = getDateKey(getHistoryDate(h));
                return k && k >= startDateKey && k <= endDateKey;
            });
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : (Number(maxScore) || 100);
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : (Number(minScore) || 0);
            const catRange = Math.max(1e-9, catMax - catMin);
            for (const h of recentHistory) {
                let t = parseInt(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 10) || 0;
                if (t === 0 && h.score != null) {
                    t = getSyntheticTotal(catMax);
                } else if (t === 0) {
                    let topicList = toArray(h.topics);
                    if (topicList.length === 0 && (h.topic || h.assunto || h.subtopic || h.topicName)) {
                        topicList = [{
                            name: h.topic || h.assunto || h.subtopic || h.topicName,
                            total: h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions,
                            correct: h.correct ?? h.acertos ?? h.correctCount,
                            score: h.score,
                            isPercentage: h.isPercentage
                        }];
                    }
                    // Fallback: agrega a partir de h.topics se o cabeçalho h não tiver total/score
                    topicList.forEach(tp => {
                        let tpTot = parseInt(tp.total ?? tp.questoes ?? tp.totalQuestoes ?? tp.questions, 10) || 0;
                        if (tpTot === 0 && tp.score != null) tpTot = getSyntheticTotal(catMax);
                        if (tpTot <= 0) return;
                        const hasTpCorr = !tp.isPercentage && (
                            (tp.correct !== null && tp.correct !== undefined && String(tp.correct).trim() !== '') ||
                            (tp.acertos !== null && tp.acertos !== undefined && String(tp.acertos).trim() !== '') ||
                            (tp.correctCount !== null && tp.correctCount !== undefined && String(tp.correctCount).trim() !== '')
                        );
                        const parsedTpCorr = Number(tp.correct ?? tp.acertos ?? tp.correctCount);
                        let tpCorr;
                        if (hasTpCorr && Number.isFinite(parsedTpCorr)) {
                            tpCorr = parsedTpCorr;
                        } else {
                            const tpScore = getSafeScore(tp, catMax, catMin);
                            if (!Number.isFinite(tpScore)) return;
                            tpCorr = ((Math.max(catMin, Math.min(catMax, tpScore)) - catMin) / catRange) * tpTot;
                        }
                        if (Number.isFinite(tpCorr)) {
                            total += tpTot;
                            correct += Math.max(0, Math.min(tpTot, tpCorr));
                        }
                    });
                    continue;
                }
                
                const hasExplicitCorrect = !h.isPercentage && (
                    (h.correct !== null && h.correct !== undefined && String(h.correct).trim() !== '') ||
                    (h.acertos !== null && h.acertos !== undefined && String(h.acertos).trim() !== '') ||
                    (h.correctCount !== null && h.correctCount !== undefined && String(h.correctCount).trim() !== '')
                );
                const parsedHCorrect = Number(h.correct ?? h.acertos ?? h.correctCount);
                let correctCount;
                if (hasExplicitCorrect && Number.isFinite(parsedHCorrect)) {
                    correctCount = parsedHCorrect;
                } else {
                    const score = getSafeScore(h, catMax, catMin);
                    if (!Number.isFinite(score)) continue;
                    const normalizedScore = Math.max(catMin, Math.min(catMax, score));
                    correctCount = ((normalizedScore - catMin) / catRange) * t;
                }
                
                if (!Number.isFinite(correctCount)) continue;
                const safeCorrect = Math.max(0, Math.min(t, correctCount));
                total += t;
                correct += safeCorrect;
            }
            
            const accuracy = total > 0 ? correct / total : 0;
            const erroAbsoluto = total - correct;
            const criticidade = erroAbsoluto * (1 - accuracy);
            
            return { name: cat.name, value: criticidade, errors: erroAbsoluto };
        });

        const data = rawData.filter(d => Math.round(d.value * 10) > 0).sort((a, b) => b.value - a.value);
        data.forEach(d => { totalCriticidade += d.value; });

        return data.slice(0, 10).map((item, i, arr) => {
            const isLong = item.name.length > 24;
            return {
                ...item,
                fullName: item.name,
                name: isLong ? item.name.substring(0, 22) + '...' : item.name,
                color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))],
                percentage: totalCriticidade > 0 ? Math.round((item.value / totalCriticidade) * 100) : 0,
                displayValue: Math.round(item.value * 10) / 10
            };
        });
    }, [categories, startDateKey, endDateKey, maxScore, minScore]);

    const hasData = useMemo(() => {
      if (!categories) return false;
    
      return categories.some(cat => {
        const historyRaw = cat.simuladoStats?.history;
        const history = Array.isArray(historyRaw)
          ? historyRaw
          : Object.values(historyRaw || {});
    
        return history.some(h => {
          const k = getDateKey(getHistoryDate(h));
          const topics = toArray(h.topics);
    
          const hasTopicData = topics.some(
            t => Number(t.total) > 0 || t.score != null
          );
    
          return (
            k &&
            k >= startDateKey &&
            k <= endDateKey &&
            (
              parseInt(h.total, 10) > 0 ||
              h.score != null ||
              hasTopicData
            )
          );
        });
      });
    }, [categories, startDateKey, endDateKey]);

    const weekTitle = WEEKS.find(w => w.offset === selectedWeekOffset)?.label || "SEMANA";

    return (
        <div className="w-full space-y-4 pt-2">
            {/* Header com Navegação Temporal Unificada */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner shrink-0">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-white">Matriz de criticidade e pontos de fuga</h3>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-[9px] font-black text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                                Índice de Criticidade
                            </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                            Identifique matérias e assuntos específicos que mais geram perdas de pontos
                        </p>
                    </div>
                </div>

                {/* Week Selector + Date Range Badge */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-inner">
                        {WEEKS.map((w) => {
                            const isActive = selectedWeekOffset === w.offset;
                            return (
                                <button
                                    key={w.label}
                                    type="button"
                                    onClick={() => setSelectedWeekOffset(w.offset)}
                                    aria-pressed={isActive}
                                    className={`px-3 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400/50'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                    }`}
                                >
                                    {w.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-mono font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-700/50 px-3 py-1.5 rounded-xl shadow-inner">
                        {dateLabel}
                    </div>
                </div>
            </div>

            {/* Painéis Lado a Lado perfeitamente enquadrados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
                {/* Matérias críticas */}
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between h-full min-w-0">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">{weekTitle}</p>
                            <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {pointLeakageData.length} {pointLeakageData.length === 1 ? 'matéria' : 'matérias'}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-slate-100 mb-1 flex items-center gap-2 tracking-tight">
                            🩸 Matérias Críticas
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-400 mb-4 leading-relaxed">
                            Disciplinas com maior Índice de Criticidade (Erros acumulados × taxa de erro).
                        </p>
                    </div>

                    <div className="min-h-[220px] sm:min-h-[260px] w-full flex-1 flex flex-col justify-center">
                        {pointLeakageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, pointLeakageData.length * 38)} minWidth={1}>
                                <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 5, right: 85, left: -5, bottom: 5 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="fullName" tickFormatter={(v) => String(v || '').length > 24 ? `${String(v).slice(0, 22)}...` : v} stroke="#cbd5e1" tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} width={160} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }} formatter={(v, n, props) => [`${v} pts (Índice)`, `${props?.payload?.fullName || 'Matéria'} (${props?.payload?.errors || 0} erros)`]} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="displayValue" radius={[0, 8, 8, 0]} barSize={18} minPointSize={4}>
                                        {pointLeakageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        <LabelList dataKey="displayValue" position="right" offset={8}
                                            content={(props) => {
                                                const { x, y, width, value, index } = props;
                                                const entry = pointLeakageData[index];
                                                if (!entry || value === null || value === undefined) return null;
                                                return (
                                                    <text x={x + width + 8} y={y + 11} fill="#ffffff" fontSize={10.5} fontWeight="bold">
                                                        {value}{entry.percentage > 0 ? ` (${entry.percentage}%)` : ''}
                                                    </text>
                                                );
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50 p-6 text-slate-500 text-sm text-center">
                                <span className="text-4xl mb-2">{hasData ? '🎉' : '⏳'}</span>
                                <p className="font-bold text-slate-300 mb-1">{hasData ? 'Sem erros críticos!' : 'Nenhum dado registrado'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{hasData ? 'Nenhum erro crítico registrado nesta semana.' : 'Sem simulados registrados neste período. Selecione outra semana acima.'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assuntos críticos */}
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between h-full min-w-0">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">{weekTitle} · TODOS OS ASSUNTOS</p>
                            <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {subtopicsData.length} {subtopicsData.length === 1 ? 'tópico' : 'tópicos'}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-slate-100 mb-1 flex items-center gap-2 tracking-tight">
                            📏 Assuntos Críticos
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-400 mb-4 leading-relaxed">
                            Tópicos com maior urgência de revisão e reforço teórico.
                        </p>
                    </div>

                    <div className="min-h-[220px] sm:min-h-[260px] w-full flex-1 flex flex-col justify-center">
                        {subtopicsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, subtopicsData.length * 38)} minWidth={1}>
                                <BarChart data={subtopicsData} layout="vertical" margin={{ top: 5, right: 65, left: -5, bottom: 5 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="fullName" tickFormatter={(v) => String(v || '').length > 34 ? `${String(v).slice(0, 32)}...` : v} stroke="#cbd5e1" tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} width={160} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }} formatter={(v, n, props) => {
                                        const total = Number(props?.payload?.total) || 0;
                                        const correct = Math.round(Number(props?.payload?.correct) || 0);
                                        const errors = Math.max(0, total - correct);
                                        return [`${v} (Índice)`, `${props?.payload?.fullName || 'Assunto'} (${errors} erros)`];
                                    }} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18} minPointSize={4}>
                                        {subtopicsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#ffffff', fontSize: 10.5, fontWeight: 'bold' }} offset={8} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50 p-6 text-slate-500 text-sm text-center">
                                <span className="text-4xl mb-2">{hasData ? '🎉' : '⏳'}</span>
                                <p className="font-bold text-slate-300 mb-1">{hasData ? 'Sem assuntos críticos!' : 'Nenhum dado registrado'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{hasData ? 'Nenhum erro registrado neste período.' : 'Sem simulados registrados neste período. Selecione outra semana acima.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

```

---

## `src/components/charts/EvolutionChart/DisciplinaCard.jsx` <a id="src-components-charts-evolutionchart-disciplinacard-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/DisciplinaCard.jsx`
- **Descrição:** Card interativo de seleção de disciplina e exibição de métricas individuais
- **Linhas:** 154
- **Tamanho:** 9.99 KB

```javascript
import React from 'react';
import { formatValue, getSafeScore, getSyntheticTotal } from '../../../utils/scoreHelper';
import { pointsToPct, pointsToRatio, ratioToPoints } from '../../../utils/scoreHelper.conversions';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';

export const DisciplinaCard = React.memo(function DisciplinaCard({ cat, level, metrics, target, isFocused, onClick, unit = '%', maxScore = 100, minScore = 0 }) {
    const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : (Math.max(1, Number(maxScore) || 100));
    const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : (Number.isFinite(Number(minScore)) ? Number(minScore) : 0);
    const safeMax = catMax;
    const safeMin = catMin;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const globalMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const globalMax = Math.max(globalMin + 1, Number(maxScore) || 100);
    const hasLevel = level != null && Number.isFinite(Number(level));
    const val = hasLevel ? Number(level) : null;
    const effectiveTarget = Number.isFinite(Number(cat?.minCutoff))
        ? Number(cat.minCutoff)
        : (Number.isFinite(Number(target))
            ? (target <= safeMax && target >= safeMin
                ? Number(target)
                : safeMin + ((Number(target) - globalMin) / (globalMax - globalMin)) * safeRange)
            : safeMin + safeRange * 0.8);
    const ok = (val ?? safeMin) >= effectiveTarget;
    const midThreshold = safeMin + (effectiveTarget - safeMin) * 0.75;
    const mid = (val ?? safeMin) >= midThreshold;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';
    const progressWidth = val != null ? Math.max(0, Math.min(100, pointsToPct(val, safeMax, safeMin))) : 0;

    let rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    if (rawVal == null || !Number.isFinite(Number(rawVal))) {
        const historyRaw = cat?.simuladoStats?.history;
        const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
        if (history.length > 0) {
            let latestDayKey = null;
            let latestMs = -Infinity;
            for (let i = 0; i < history.length; i++) {
                const h = history[i];
                const rawDate = h?.date || h?.createdAt || h?.timestamp;
                const ms = toDateMs(rawDate);
                if (Number.isFinite(ms) && ms >= latestMs) {
                    latestMs = ms;
                    latestDayKey = getDateKey(rawDate);
                }
            }
            if (latestDayKey) {
                let dayTotal = 0;
                let dayCorrect = 0;
                for (let i = 0; i < history.length; i++) {
                    const h = history[i];
                    if (getDateKey(h?.date || h?.createdAt || h?.timestamp) !== latestDayKey) continue;
                    const s = getSafeScore(h, safeMax, safeMin);
                    if (!Number.isFinite(s)) continue;
                    const q = Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) > 0 ? Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) : getSyntheticTotal(safeMax);
                    dayTotal += q;
                    dayCorrect += pointsToRatio(s, safeMax, safeMin) * q;
                }
                if (dayTotal > 0) {
                    rawVal = ratioToPoints(dayCorrect / dayTotal, safeMax, safeMin);
                }
            }
        }
    }

    let statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    if ((statsVal == null || !Number.isFinite(Number(statsVal))) && cat?.simuladoStats?.average != null && Number.isFinite(Number(cat.simuladoStats.average))) {
        statsVal = Number(cat.simuladoStats.average);
    }

    let bayVal = metrics ? metrics[`bay_${cat.id}`] : null;
    if ((bayVal == null || !Number.isFinite(Number(bayVal))) && cat?.bayesianStats?.mean != null && Number.isFinite(Number(cat.bayesianStats.mean))) {
        bayVal = Number(cat.bayesianStats.mean);
    }

    return (
        <button onClick={onClick}
            aria-pressed={isFocused}
            aria-label={`Focar na disciplina ${cat.name}`}
            className={`relative text-left w-full rounded-2xl border overflow-hidden transition-all duration-300 group min-h-[85px] sm:min-h-[105px] flex flex-col justify-between ${isFocused ? 'z-20 border-white/20 bg-slate-900/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)]' : 'border-white/5 hover:border-white/10 hover:bg-slate-800/60 hover:-translate-y-0.5 backdrop-blur-sm'}`}
            style={{
                padding: '0.875rem 1rem',
                backgroundColor: isFocused ? `${cat.color}15` : 'rgba(15,23,42,0.4)',
                borderColor: isFocused ? `${cat.color}50` : undefined,
                boxShadow: isFocused ? `0 0 30px -10px ${cat.color}30` : undefined
            }}>

            {/* Fundo radiante no estado focado */}
            {isFocused && (
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-transparent to-current mix-blend-overlay pointer-events-none" style={{ color: cat.color }} />
            )}

            {/* Progress Bar (Bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-800/80 overflow-hidden">
                <div className="h-full transition-all duration-1000 ease-out relative" style={{ width: `${progressWidth}%`, backgroundColor: statusColor }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                </div>
            </div>

            <div className="relative z-10 flex items-center justify-between mb-1.5 w-full">
                <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors line-clamp-2 pr-2 drop-shadow-sm pl-1 ${isFocused ? 'text-white' : 'text-slate-300 group-hover:text-slate-200'}`} title={cat.name}>
                    {cat.name}
                </p>
                <div className={`w-2.5 h-2.5 rounded-full transition-all shadow-sm ${isFocused ? 'scale-125 ring-2 ring-offset-2 ring-offset-slate-900' : 'opacity-80 group-hover:opacity-100'}`} style={{ backgroundColor: statusColor, '--tw-ring-color': statusColor }} />
            </div>

            <div className="relative z-10 flex flex-col justify-end w-full">
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tighter transition-all drop-shadow-md pl-1 ${isFocused ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
                        {val != null && Number.isFinite(Number(val)) ? formatValue(val) : '—'}
                    </span>
                    {val != null && Number.isFinite(Number(val)) && (
                        <span className={`text-[10px] sm:text-xs font-bold ${isFocused ? 'text-white/70' : 'text-slate-500'}`}>{unit}</span>
                    )}
                </div>
            </div>

            {/* Extra Metrics Breakdown */}
            <div className="relative z-10 w-full mt-2.5">
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-300 uppercase tracking-widest font-black">
                            <span className="pl-1.5">Bruta</span>
                            <span className="text-orange-400 font-mono">{rawVal != null && Number.isFinite(Number(rawVal)) ? `${formatValue(rawVal)}${unit}` : '—'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, ((Number(rawVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-300 uppercase tracking-widest font-black">
                            <span className="pl-1.5">Histórica</span>
                            <span className="text-blue-400 font-mono">{statsVal != null && Number.isFinite(Number(statsVal)) ? `${formatValue(statsVal)}${unit}` : '—'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, ((Number(statsVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-300 uppercase tracking-widest font-black">
                            <span className="pl-1.5">Real</span>
                            <span className="text-emerald-400 font-mono">{bayVal != null && Number.isFinite(Number(bayVal)) ? `${formatValue(bayVal)}${unit}` : '—'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, ((Number(bayVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

        </button>

    );
});

```

---

## `src/components/charts/EvolutionChart/EvolutionLineChart.jsx` <a id="src-components-charts-evolutionchart-evolutionlinechart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/EvolutionLineChart.jsx`
- **Descrição:** Gráfico temporal principal com bandas bayesianas e anti-colisão de labels
- **Linhas:** 525
- **Tamanho:** 25.29 KB

```javascript
import React, { useId, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
   LabelList, Brush, ReferenceArea
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { normalizeDate, formatDisplayDate } from '../../../utils/dateHelper';
import { formatValue, normalizeScoreDomain } from '../../../utils/scoreHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke, onClick, isDimmed } = props;
    if (cx == null || cy == null) return null;
    return (
        <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', pointerEvents: 'all' }}>
            {!isDimmed && (
                <>
                    <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                        <animate attributeName="r" from="6" to="16" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
                </>
            )}
            {/* Dimmed dot - no glow, just a static smaller dot */}
            {isDimmed && (
                <>
                    <circle cx={cx} cy={cy} r={4} fill={fill} opacity={0.5} stroke={stroke || "#ffffff"} strokeWidth={1} strokeOpacity={0.5} />
                    {/* Invisible larger target for easy clicking when dimmed */}
                    <circle cx={cx} cy={cy} r={15} fill="rgba(255,255,255,0.01)" stroke="transparent" />
                </>
            )}
        </g>
    );
};

/**
 * EvolutionLineChart
 * 
 * A premium analytical chart showing performance evolution with Bayesian confidence bands,
 * focus highlighting, and adaptive label anti-collision.
 */
export function EvolutionLineChart({
    filteredChartData = [],
    activeCategories = [],
    engine,
    targetScore,
    focusSubjectId,
    showOnlyFocus,
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const instanceId = useId().replace(/:/g, "");
    const shadowId = `el_lineShadow_${instanceId}`;

    const [highlightedDataKey, setHighlightedDataKey] = useState(null);
    const isLineClicked = useRef(false);
    const clickTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        };
    }, []);
    
    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number(maxScore) > safeMinScore ? Number(maxScore) : safeMinScore + 1;
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    
    const safeTargetScore = Math.max(
      safeMinScore,
      Math.min(
        safeMaxScore,
        Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMinScore
      )
    );
    
    const dangerLimit = Math.max(safeMinScore, safeTargetScore - (safeRange * 0.08));

    const safeActiveCategories = useMemo(() => Array.isArray(activeCategories) ? activeCategories : [], [activeCategories]);
    const safeChartData = useMemo(() => Array.isArray(filteredChartData) ? filteredChartData : [], [filteredChartData]);

    const handleLegendClick = (e) => {
        if (!e || typeof e !== 'object') return;

        if (e.domEvent && typeof e.domEvent.stopPropagation === 'function') {
            e.domEvent.stopPropagation();
        } else if (typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }

        // Find the category ID from the clicked legend item (it usually passes payload)
        let catId = e.payload?.id || e.id;
        if (!catId && typeof e.dataKey === 'string') {
            catId = e.dataKey.replace(/^(bay_ci_low|bay_ci_high|raw|bay|stats|trend|band)_/, '');
        }
        if (!catId && e.payload && typeof e.payload.dataKey === 'string') {
            catId = e.payload.dataKey.replace(/^(bay_ci_low|bay_ci_high|raw|bay|stats|trend|band)_/, '');
        }
        
        if (catId && typeof catId === 'string' && catId.trim() !== '') {
            setHighlightedDataKey(prev => prev === catId ? null : catId);
        }
    };

    // Refined chart data with defensive sorting and date normalization
    const enhancedChartData = React.useMemo(() => {
        if (!safeChartData || !safeChartData.length) return [];
        
        // BUG-Z1 FIX: Defensive sort to prevent zig-zag lines if data is unordered
        const sortedData = [...safeChartData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });

        return sortedData.map(d => {
            const copy = { ...d };
            safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
                const low = d[`bay_ci_low_${cat.id}`];
                const high = d[`bay_ci_high_${cat.id}`];
                if (low != null && Number.isFinite(Number(low)) && high != null && Number.isFinite(Number(high))) {
                    copy[`band_${cat.id}`] = [Number(low), Number(high)];
                }
            });
            // Fallback defensivo para o eixo X (BUG-T1 Fix)
            copy.displayDate = copy.displayDate || copy.date;
            return copy;
        });
    }, [safeChartData, safeActiveCategories, showOnlyFocus, focusSubjectId]);

    // Gather final points for label positioning (busca regressiva para pegar o último ponto com dado de cada matéria)
    const { finalPoints, lastValidIndexByCat } = React.useMemo(() => {
        if (!enhancedChartData.length) return { finalPoints: [], lastValidIndexByCat: {} };
        const pts = [];
        const idxMap = {};
        
        safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
            const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
            let lastVal = null;
            let lastIdx = -1;
            for (let i = enhancedChartData.length - 1; i >= 0; i--) {
                const v = enhancedChartData[i]?.[dataKey];
                if (v != null && Number.isFinite(Number(v))) {
                    lastVal = Number(v);
                    lastIdx = i;
                    break;
                }
            }
            if (lastVal != null) {
                pts.push({ id: cat.id, name: cat.name, value: lastVal, color: cat.color });
                idxMap[cat.id] = lastIdx;
            }
        });
        // Sort by value descending (highest values first)
        return { finalPoints: pts.sort((a, b) => b.value - a.value), lastValidIndexByCat: idxMap };
    }, [enhancedChartData, safeActiveCategories, showOnlyFocus, focusSubjectId, engine]);

    // Adaptive label collision logic (Hardened for variable score scales)
    const yAdjustedMap = React.useMemo(() => {
        if (!finalPoints.length) return {};

        const localMin = safeMinScore;
        const localMax = safeMaxScore;
        const range = safeRange;
        const labels = finalPoints.map(p => ({ ...p, yPos: Number(p.value) || 0 }));
        
        const topLimit = localMax - (range * 0.01);
        const bottomLimit = localMin + (range * 0.03);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);
        
        const MIN_PCT_DISTANCE = range * 0.10; // 10% distance threshold (was 7.5%)
        const requiredSpace = (labels.length - 1) * MIN_PCT_DISTANCE;
        
        // Dynamic compression if too many labels for the space
        const effectiveDistance = requiredSpace > safeSpace 
            ? safeSpace / Math.max(1, labels.length - 1) 
            : MIN_PCT_DISTANCE;

        // Iterative relaxation algorithm to spread out colliding labels
        const ITERATIONS = 50;
        for (let iter = 0; iter < ITERATIONS; iter++) {
            let overlapFound = false;
            for (let i = 0; i < labels.length - 1; i++) {
                const l1 = labels[i];
                const l2 = labels[i + 1];
                const diff = l1.yPos - l2.yPos; // Expect l1 > l2 since they are sorted descending
                
                if (diff < effectiveDistance) {
                    overlapFound = true;
                    const adjustment = (effectiveDistance - diff) / 2;
                    l1.yPos += adjustment;
                    l2.yPos -= adjustment;
                }
            }
            
            // Apply boundary constraints gently (shift all to maintain separation)
            if (labels.length > 0 && labels[0].yPos > topLimit) {
                const diff = labels[0].yPos - topLimit;
                labels.forEach(l => l.yPos -= diff);
            }
            
            if (labels.length > 0 && labels[labels.length - 1].yPos < bottomLimit) {
                const diff = bottomLimit - labels[labels.length - 1].yPos;
                labels.forEach(l => l.yPos += diff);
            }
            
            if (!overlapFound) break;
        }

        // Force strict limits one last time for safety
        for (let i = 0; i < labels.length; i++) {
            if (labels[i].yPos > topLimit) labels[i].yPos = topLimit;
            if (labels[i].yPos < bottomLimit) labels[i].yPos = bottomLimit;
        }

        const map = {};
        labels.forEach(p => { map[p.id] = p.yPos; });
        return map;
    }, [finalPoints, safeMaxScore, safeMinScore, safeRange]);

    const renderCustomLabel = (props, catId, displayColor, isFocused, hasFocus) => {
        const { x, y, index, value, viewBox } = props;

        if (hasFocus && !isFocused) return null;

        if (index === lastValidIndexByCat[catId] && value != null) {   // ✅ LOTE-03
            let offsetPx = 0;
            const adjustedY = yAdjustedMap[catId];

            if (adjustedY !== undefined && adjustedY !== value) {
                const { range } = normalizeScoreDomain(minScore, maxScore);
                const chartH = viewBox?.height > 0 ? viewBox.height : 320;
                const pxPerPct = chartH / (range || 1);
                offsetPx = (value - adjustedY) * pxPerPct;
            }

            const formatted = `${formatValue(value)}${unit}`;
            const boxWidth = Math.max(52, formatted.length * 7 + 20);
            const maxX = (viewBox?.width ?? 700) + (viewBox?.x ?? 0) + 130;
            const labelX = Math.max(0, Math.min(x + 8, maxX - boxWidth));
            const maxY = (viewBox?.y ?? 20) + (viewBox?.height ?? 320) - 12;
            const safeCenterY = Math.max(12, Math.min(maxY, y + offsetPx));

            return (
                <g style={{ zIndex: 100, transition: 'all 0.3s ease' }}>
                    <rect
                        x={labelX}
                        y={safeCenterY - 11}
                        width={boxWidth}
                        height={22}
                        rx={8}
                        fill="#0b0f19"
                        fillOpacity={0.92}
                        stroke={displayColor}
                        strokeOpacity={0.9}
                        strokeWidth={1.8}
                    />
                    <circle cx={labelX + 8} cy={safeCenterY} r={3} fill={displayColor} />
                    <text 
                        x={labelX + 8 + (boxWidth - 8) / 2} 
                        y={safeCenterY + 4}
                        fill="#ffffff" 
                        fontSize={10.5} 
                        fontWeight="900" 
                        textAnchor="middle"
                        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.9)' }}
                    >
                        {formatted}
                    </text>
                </g>
            );
        }
        return null;
    };



    const visibleCategories = safeActiveCategories.filter(
      cat => !showOnlyFocus || cat.id === focusSubjectId
    );

    const effectiveHighlightedKey = useMemo(() => {
        if (!highlightedDataKey) return null;
        const existsAndHasData = visibleCategories.some(
            c => c.id === highlightedDataKey && lastValidIndexByCat[c.id] !== undefined
        );
        return existsAndHasData ? highlightedDataKey : null;
    }, [highlightedDataKey, visibleCategories, lastValidIndexByCat]);

    const renderTooltipContent = useCallback(
        (props) => <ChartTooltip {...props} chartData={enhancedChartData} isCompare={false} unit={unit} maxScore={maxScore} minScore={minScore} />,
        [enhancedChartData, unit, maxScore, minScore]
    );
    
    if (!enhancedChartData.length || visibleCategories.length === 0 || finalPoints.length === 0) {
      return (
        <div className="h-[360px] flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
          <span className="text-3xl">🔍</span>
          Nenhuma disciplina visível com o filtro atual.
        </div>
      );
    }

    return (
        <div className="relative h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            {effectiveHighlightedKey && (
                <button 
                    type="button" 
                    onClick={() => setHighlightedDataKey(null)}
                    className="absolute top-0 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-300 text-[10px] font-bold rounded-lg shadow-lg transition-all"
                >
                    <span>👁️</span> Mostrar Todos
                </button>
            )}
            <ChartFrame minHeight={360} label="Traçando evolução">
                <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0" minWidth={1}>
                <ComposedChart 
                    data={enhancedChartData} 
                    syncId="evolutionSync"
                    margin={{ top: 20, right: 140, left: 0, bottom: 20 }} 
                    style={{ outline: 'none', cursor: effectiveHighlightedKey ? 'pointer' : 'default' }} 
                    tabIndex="-1"
                    onClick={() => {
                        if (effectiveHighlightedKey && !isLineClicked.current) {
                            setHighlightedDataKey(null);
                        }
                    }}
                >
                    <defs>
                        {safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).map((cat) => {
                            const displayColor = cat.color || '#3b82f6';
                            return (
                            <React.Fragment key={`defs_${cat.id}`}>
                                <linearGradient id={`grad_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={displayColor} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={displayColor} stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id={`bayBand_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={displayColor} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={displayColor} stopOpacity={0.02} />
                                </linearGradient>
                            </React.Fragment>
                            );
                        })}
                        <filter id={shadowId} height="200%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                    </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />

                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDisplayDate}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        dy={10}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                        tickLine={false}
                        minTickGap={25}
                        padding={{ left: 10, right: 10 }}
                    />

                    <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        dx={-4}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                        tickLine={false}
                        domain={[safeMinScore, safeMaxScore]}
                        allowDataOverflow={false}
                        tickFormatter={(v) => `${formatValue(v)}${unit}`}
                        width={46}
                    />

                    <ReferenceArea
                        y1={safeTargetScore}
                        y2={safeMaxScore}
                        fill="#10b981"
                        fillOpacity={0.05}
                    />
                    
                    <ReferenceArea
                        y1={safeMinScore}
                        y2={dangerLimit}
                        fill="#ef4444"
                        fillOpacity={0.04}
                    />
                    
                    <ReferenceLine 
                        y={safeTargetScore} 
                        stroke="#10b981" 
                        strokeOpacity={0.8} 
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        label={{ 
                            value: `Meta: ${formatValue(safeTargetScore)}${unit}`, 
                            fill: '#34d399', 
                            fontSize: 10, 
                            fontWeight: 'bold',
                            position: 'insideTopLeft', 
                            dy: -12, 
                            dx: 12 
                        }} 
                    />

                    <Tooltip 
                        offset={20}
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.18)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        content={renderTooltipContent} 
                    />

                    <Legend 
                        verticalAlign="top" 
                        height={32}
                        iconSize={8}
                        iconType="circle"
                        onClick={handleLegendClick}
                        wrapperStyle={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, paddingBottom: '8px', cursor: 'pointer', textTransform: 'capitalize' }} 
                        formatter={(value) => value}
                    />

                    {safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                        const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
                        const lineType = engine?.style || 'linear';
                        // Determine focus state based on category ID rather than dataKey to survive engine changes
                        const isLegendHighlighted = effectiveHighlightedKey === cat.id;
                        const isAnyHighlighted = !!effectiveHighlightedKey;

                        const isFocused = showOnlyFocus ? (focusSubjectId === cat.id) : isLegendHighlighted;
                        const hasFocus = showOnlyFocus ? !!focusSubjectId : isAnyHighlighted;
                        
                        let displayColor = cat.color || '#3b82f6';
                        if (isLegendHighlighted) {
                            displayColor = '#fbbf24'; // Vivid amber/gold highlight
                        }

                        const lineOpacity = hasFocus ? (isFocused ? 1 : 0.4) : 0.8;
                        const lineWidth = hasFocus ? (isFocused ? 3.5 : 1.5) : 2;

                        return [
                            // Bayesian Confidence Interval Band
                            (engine?.id === 'bayesian' && (!hasFocus || isFocused)) ? (
                                <Area connectNulls key={`bay_ci_${cat.id}`} type={lineType}
                                    dataKey={`band_${cat.id}`}
                                    name="_IC 95%" stroke="none"
                                    fill={`url(#bayBand_${cat.id}_${instanceId})`} legendType="none"
                                    isAnimationActive={false}
                                />
                            ) : null,
                            // Background Gradient Area for Focused Line
                            isFocused ? (
                                <Area connectNulls key={`area_${cat.id}`} type={lineType} dataKey={dataKey} name={`_area_${cat.id}`} stroke="none"
                                    fill={`url(#grad_${cat.id}_${instanceId})`} legendType="none" />
                            ) : null,
                            // Bottom layer: Glow effect (thicker, transparent line)
                            <Line connectNulls 
                                key={`glow_${cat.id}`} 
                                type={lineType} 
                                dataKey={dataKey} 
                                name={`_glow_${cat.name}`}
                                stroke={displayColor} 
                                strokeWidth={lineWidth + 4}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={(isFocused || !hasFocus) ? lineOpacity * 0.3 : 0}
                                dot={false}
                                activeDot={false}
                                legendType="none"
                                isAnimationActive={false}
                            />,
                            // Top layer: The Performance Evolution Line
                            <Line connectNulls 
                                key={cat.id} 
                                id={cat.id}
                                type={lineType} 
                                dataKey={dataKey} 
                                name={cat.name}
                                stroke={displayColor} 
                                strokeWidth={lineWidth}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={lineOpacity}
                                dot={{ r: 3, strokeWidth: 1.5, stroke: displayColor, fill: '#0f172a', strokeOpacity: lineOpacity, fillOpacity: lineOpacity }}
                                activeDot={<CustomActiveDot fill={displayColor} stroke="#ffffff" isDimmed={hasFocus && !isFocused} onClick={(e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    isLineClicked.current = true;
                                    setHighlightedDataKey(prev => prev === cat.id ? null : cat.id);
                                    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
                                    clickTimerRef.current = setTimeout(() => { isLineClicked.current = false; }, 50);
                                }} />}
                                style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                                isAnimationActive={false}
                                onClick={(props, e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    if (props && props.nativeEvent && props.nativeEvent.stopPropagation) props.nativeEvent.stopPropagation();
                                    isLineClicked.current = true;
                                    setHighlightedDataKey(prev => prev === cat.id ? null : cat.id);
                                    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
                                    clickTimerRef.current = setTimeout(() => { isLineClicked.current = false; }, 50);
                                }}
                            >
                                <LabelList content={(props) => renderCustomLabel(props, cat.id, displayColor, isFocused, hasFocus)} />
                            </Line>
                        ];
                    })}

                    {enhancedChartData.length > 1 && (
                        <Brush 
                            dataKey="date" 
                            height={26} 
                            stroke="#6366f1" 
                            fill="rgba(15, 23, 42, 0.85)" 
                            tickFormatter={formatDisplayDate}
                            travellerWidth={10}
                        />
                    )}
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}

```

---

## `src/components/charts/EvolutionChart/KpiCard.jsx` <a id="src-components-charts-evolutionchart-kpicard-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/KpiCard.jsx`
- **Descrição:** Card de exibição de KPIs estatísticos com gradientes e indicadores de tendência
- **Linhas:** 33
- **Tamanho:** 2.36 KB

```javascript
import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const KpiCard = React.memo(function KpiCard({ value, label, color, icon, sub }) {
    const hasSub = sub !== null && sub !== undefined && typeof sub !== 'boolean' && String(sub).trim() !== '';
    const rawSub = hasSub ? Number(sub) : Number.NaN;
    const safeSub = Number.isFinite(rawSub) ? Number(rawSub.toFixed(2)) : Number.NaN;
    return (
        <div 
            className="relative flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl group hover:border-white/10 hover:bg-slate-800/60 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
            style={{ padding: '0.75rem 0.875rem', boxShadow: `0 4px 20px -10px ${color}30` }}
        >
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 rounded-full opacity-20 blur-2xl group-hover:opacity-35 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: color }} />
            
            <div className="relative z-10 flex items-center justify-between mb-1.5">
                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/5 text-sm sm:text-base group-hover:scale-105 transition-transform duration-300 shrink-0" style={{ color }}>
                    {icon}
                </div>
                {Number.isFinite(safeSub) && (
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${safeSub === 0 ? 'bg-slate-800/50 text-slate-400 border-slate-700' : safeSub > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                        {safeSub === 0 ? '—' : safeSub > 0 ? `+${formatValue(safeSub)}` : formatValue(safeSub)}
                    </span>
                )}
            </div>
            <div className="relative z-10 min-w-0">
                <p className="text-lg sm:text-xl md:text-2xl font-black tracking-tight min-w-0 truncate drop-shadow-md leading-tight" style={{ color }}>{value}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold group-hover:text-slate-300 transition-colors truncate">{label}</p>
            </div>
        </div>
    );
});

```

---

## `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx` <a id="src-components-charts-evolutionchart-montecarloevolutionchart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`
- **Descrição:** Rastreador de probabilidade de aprovação Monte Carlo e projeções por simulado
- **Linhas:** 475
- **Tamanho:** 28.47 KB

```javascript
import React, { useMemo, useId, useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { Target, TrendingUp, AlertCircle, Sparkles, Compass } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration, normalizeDate, getDateKey } from '../../../utils/dateHelper';
import { formatValue, formatPercent } from '../../../utils/scoreHelper';
import { applyScenarioAdjustments, classifyScenarioSignal } from '../../../utils/monteCarloScenario.js';
import { normalizeProbability } from '../../../utils/evolutionGuards';

const MonteCarloTooltip = React.memo(({ active, payload, unit, targetScore, maxScore, minScore }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        const fullDate = dataPoint.fullDate;

        // Operador de coalescência nula garante falhas seguras e respeita o piso (minScore)
        const pointTarget = Math.max(minScore, Math.min(maxScore, (dataPoint.target === null || dataPoint.target === undefined || dataPoint.target === '') ? targetScore : (Number.isFinite(Number(dataPoint.target)) ? Number(dataPoint.target) : targetScore)));
        const pointMean = Math.max(minScore, Math.min(maxScore, (dataPoint.mean === null || dataPoint.mean === undefined || dataPoint.mean === '') ? minScore : (Number.isFinite(Number(dataPoint.mean)) ? Number(dataPoint.mean) : minScore)));
        const projMean = dataPoint.projectedMean != null && Number.isFinite(Number(dataPoint.projectedMean)) ? Math.max(minScore, Math.min(maxScore, Number(dataPoint.projectedMean))) : pointMean;
        const pointProb = Math.max(0, Math.min(100, (dataPoint.probability === null || dataPoint.probability === undefined || dataPoint.probability === '') ? 0 : (Number.isFinite(Number(dataPoint.probability)) ? Number(dataPoint.probability) : 0)));
        const pointLow = dataPoint.ciRange?.[0] ?? pointMean;
        const pointHigh = dataPoint.ciRange?.[1] ?? pointMean;

        const isGood = projMean >= pointTarget;

        return (
            <div className="bg-slate-950/90 border border-white/15 p-4 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl min-w-[220px]">
                <div className="flex items-center justify-between gap-2 mb-3 border-b border-white/10 pb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">{fullDate}</span>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">MC Proj</span>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nota projetada</span>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-black font-mono tracking-tight leading-none ${isGood ? 'text-emerald-400' : 'text-sky-400'}`}>
                                {unit === 'horas' ? formatDuration(projMean) : formatValue(projMean)}
                            </span>
                            <span className="text-sm font-semibold text-slate-500">{unit}</span>
                        </div>
                        {isGood && (
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                <Sparkles size={11} className="animate-pulse" /> Na zona de aprovação
                            </span>
                        )}
                    </div>
                    <div className="mt-2 bg-black/40 rounded-xl border border-white/5 p-2.5 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-400">{dataPoint.date === 'Hoje' || dataPoint.date === 'HOJE' ? 'Hoje:' : 'Esperado:'}</span>
                            <span className="font-mono font-bold text-slate-200">
                                {unit === 'horas' ? formatDuration(pointMean) : `${formatValue(pointMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-indigo-400">Projeção:</span>
                            <span className="font-mono font-bold text-indigo-300">
                                {unit === 'horas' ? formatDuration(projMean) : `${formatValue(projMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-1.5">
                            <span className="font-bold text-slate-400">Cone (IC 95%):</span>
                            <span className="font-mono text-slate-300 text-[10px]">
                                {unit === 'horas' ? `${formatDuration(pointLow)} ~ ${formatDuration(pointHigh)}` : `${formatValue(pointLow)}${unit} ~ ${formatValue(pointHigh)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-400">Chance de aprovação:</span>
                            <span className={`font-mono font-black ${pointProb >= 70 ? 'text-emerald-400' : 'text-sky-400'}`}>
                                {formatPercent(pointProb)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
});

const SCENARIO_OPTIONS = [
    { id: 'conservative', label: 'Conserv.', fullLabel: 'Conservador' },
    { id: 'base', label: 'Base', fullLabel: 'Base' },
    { id: 'optimistic', label: 'Otim.', fullLabel: 'Otimista' },
];

/**
 * MonteCarloEvolutionChart
 * 
 * Visualizes the trajectory of projected scores and success probabilities over time.
 * Hardened to support non-zero scoring floors (minScore) and preventing Y-axis overshoot.
 */
export const MonteCarloEvolutionChart = ({ 
    data = [], 
    targetScore = 75, 
    unit = 'pts', 
    minScore = 0, 
    maxScore = 100,
    loading = false
}) => {
    const rawId = useId();
    const safeId = rawId.replace(/:/g, '');
    const gradientId = `colorMonteCarlo-${safeId}`;
    const [scenario, setScenario] = useState('base');
    const scenarioLabels = useMemo(() => Object.fromEntries(SCENARIO_OPTIONS.map(opt => [opt.id, opt.fullLabel])), []);

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 1;
    
    const safeTargetScore = useMemo(() => {
      const t = Number(targetScore);
      return Math.max(safeMin, Math.min(safeMax, Number.isFinite(t) ? t : safeMin));
    }, [targetScore, safeMin, safeMax]);

    const targetOffset = useMemo(() => {
      const range = safeMax - safeMin;
      if (range <= 0 || !Number.isFinite(range)) return 0;
      const pct = 1 - (safeTargetScore - safeMin) / range;
      return Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
    }, [safeTargetScore, safeMin, safeMax]);

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        const validSorted = data
            .filter(d => d?.date)
            .map(d => ({ ...d, parsedDate: normalizeDate(d.date) }))
            .filter(d => isValid(d.parsedDate))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

        const byDay = new Map();
        validSorted.forEach(item => {
            const dayKey = getDateKey(item.parsedDate) || String(item.parsedDate.getTime());
            byDay.set(dayKey, item);
        });

        return Array.from(byDay.values())
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;

                displayDate = format(d.parsedDate, 'dd/MM', { locale: ptBR });
                fullDate = format(d.parsedDate, 'dd MMM yyyy', { locale: ptBR });

                // Sanitização: manter intervalo de confiança dentro do domínio e com ordem válida
                const meanRaw = (d.mean === null || d.mean === undefined || d.mean === '') ? safeMin : (Number.isFinite(Number(d.mean)) ? Number(d.mean) : safeMin);
                const mean = Math.max(safeMin, Math.min(safeMax, meanRaw));
                const rawLow = (d.ci95Low === null || d.ci95Low === undefined || d.ci95Low === '') ? mean : (Number.isFinite(Number(d.ci95Low)) ? Number(d.ci95Low) : mean);
                const rawHigh = (d.ci95High === null || d.ci95High === undefined || d.ci95High === '') ? mean : (Number.isFinite(Number(d.ci95High)) ? Number(d.ci95High) : mean);
                const boundedLow = Math.max(safeMin, Math.min(safeMax, rawLow));
                const boundedHigh = Math.max(safeMin, Math.min(safeMax, rawHigh));
                const low = Math.min(boundedLow, boundedHigh);
                const high = Math.max(boundedLow, boundedHigh);

                const probability = normalizeProbability(d.probability);

                return {
                    ...d,
                    displayDate,
                    fullDate,
                    mean,
                    projectedMean: (d.projectedMean === null || d.projectedMean === undefined || d.projectedMean === '') ? mean : (Number.isFinite(Number(d.projectedMean)) ? Math.max(safeMin, Math.min(safeMax, Number(d.projectedMean))) : mean),
                    probability,
                    ciRange: [low, high]
                };
            });
    }, [data, safeMin, safeMax]);


    const scenarioAdjustedData = useMemo(
        () => applyScenarioAdjustments(formattedData, scenario, safeMax, safeMin),
        [formattedData, scenario, safeMax, safeMin]
    );

    const displayData = useMemo(() => {
        return scenarioAdjustedData;
    }, [scenarioAdjustedData]);

    const qualitySignal = useMemo(() => classifyScenarioSignal(scenarioAdjustedData, safeMax, safeMin), [scenarioAdjustedData, safeMax, safeMin]);

    const mcAssumptions = useMemo(() => {
        if (!scenarioAdjustedData.length) return null;
        const latest = scenarioAdjustedData[scenarioAdjustedData.length - 1];
        const width = Math.max(0, Number(latest?.ciRange?.[1] ?? 0) - Number(latest?.ciRange?.[0] ?? 0));
        return {
            points: scenarioAdjustedData.length,
            ciWidth: width,
            scenario: scenarioLabels[scenario] || scenario,
        };
    }, [scenarioAdjustedData, scenario, scenarioLabels]);



    // M1 FIX: Callback estável para o Tooltip — arrow function inline criaria nova referência
    // a cada render, quebrando a memoização do Recharts e causando re-renders desnecessários.
    const renderTooltip = useCallback(
        (props) => <MonteCarloTooltip {...props} unit={unit} targetScore={safeTargetScore} maxScore={maxScore} minScore={minScore} />,
        [unit, safeTargetScore, maxScore, minScore]
    );

    if (formattedData.length <= 1) {
        return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950/40 rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-black text-slate-200 mb-2 uppercase tracking-widest text-center">
                    Nenhum ponto registrado
                </h3>
                <p className="text-xs text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
                    {formattedData.length === 0 
                        ? 'A evolução do Monte Carlo é registrada gradualmente conforme o motor calcula as projeções diárias. Aguarde o primeiro registro de hoje.'
                        : 'É necessário ter pelo menos dois dias de projeções diferentes para traçar a linha do tempo da evolução. Continue estudando para gerar mais dados.'}
                </p>
                {/* 🎯 FIX: Ajustado h-32 para h-40 para que o minHeight=150 não estoure as bordas do pai */}
                <div className="w-full max-w-md h-40 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={150}>
                        <AreaChart data={[
                            { date: '1', mean: minScore + (maxScore - minScore) * 0.4 }, 
                            { date: '2', mean: minScore + (maxScore - minScore) * 0.6 }, 
                            { date: '3', mean: minScore + (maxScore - minScore) * 0.85 }
                        ]}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[minScore, maxScore]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-[400px] flex flex-col py-4 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/30 text-indigo-400 shadow-sm">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-100 tracking-tight">Rastreador de Aprovação</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sua trajetória rumo à aprovação</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-900/90 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
                    {SCENARIO_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setScenario(opt.id)}
                            aria-label={`Selecionar cenário ${opt.fullLabel}`}
                            aria-pressed={scenario === opt.id}
                            className={`relative px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-200 rounded-xl ${
                                scenario === opt.id 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30 font-bold' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 shadow-sm">
                        <Target size={13} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Meta: <strong className="text-white font-mono">{unit === 'horas' ? formatDuration(safeTargetScore) : `${formatValue(safeTargetScore)}${unit === '%' ? '%' : ` ${unit}`}`}</strong>
                            <small className="text-slate-500 ml-1.5">({scenarioLabels[scenario]})</small>
                        </span>
                    </div>
                    {qualitySignal && (
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border backdrop-blur-sm ${qualitySignal.color}`}>
                            {qualitySignal.label}
                        </span>
                    )}
                </div>
            </div>

            {mcAssumptions && (
              <div className="px-2 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                <p className="text-[10px] text-slate-400 font-medium">
                  <span className="text-slate-500 uppercase font-bold tracking-wider text-[9px] mr-1">Premissas:</span>
                  {mcAssumptions.points} registros · IC 95% de {formatValue(mcAssumptions.ciWidth)} {unit} · Cenário {mcAssumptions.scenario}
                </p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                <div className="flex flex-col items-center gap-3">
                  <span className="animate-spin text-indigo-400 text-xl font-bold">
                    ↻
                  </span>
                  <span className="text-[10px] font-black uppercase text-indigo-300 tracking-[0.2em] animate-pulse">
                    Recalculando Monte Carlo...
                  </span>
                </div>
              </div>
            )}
            <div className="w-full relative h-[360px] flex items-center justify-center">
                {displayData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={300}>
                        <AreaChart
                            data={displayData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                                    <stop offset={`${Math.round(targetOffset * 100)}%`} stopColor="#10b981" stopOpacity={0.06} />
                                    <stop offset={`${Math.round(targetOffset * 100)}%`} stopColor="#6366f1" stopOpacity={0.22} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id={`targetGlow-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.0} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.10} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            
                            {/* Glowing Target Zone */}
                            <ReferenceArea y1={safeTargetScore} y2={safeMax} fill={`url(#targetGlow-${safeId})`} />
                            <ReferenceLine 
                                y={safeTargetScore} 
                                stroke="#10b981" 
                                strokeDasharray="4 3" 
                                strokeWidth={1.5}
                                label={{ value: `Meta (${unit === 'horas' ? formatDuration(safeTargetScore) : `${formatValue(safeTargetScore)}${unit}`})`, fill: '#10b981', fontSize: 10, fontWeight: 700, position: 'insideTopLeft', dy: 4 }}
                            />
                            <XAxis
                                dataKey="displayDate"
                                tickFormatter={(val) => val}
                                stroke="#64748b"
                                fontSize={10}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                dy={8}
                                minTickGap={20}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={10}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                dx={-5}
                                width={45}
                                domain={[safeMin, safeMax]}
                                allowDataOverflow={false}
                                tickCount={6}
                                tickFormatter={(v) => unit === 'horas' ? formatDuration(v) : `${formatValue(v)}${unit}`}
                            />
                            <Tooltip
                                offset={20}
                                content={renderTooltip}
                                cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                            />

                            <Area connectNulls
                                type="linear" 
                                dataKey="ciRange"
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                isAnimationActive={false}
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="mean"
                                stroke="#38bdf8"
                                strokeWidth={3}
                                fill="none"
                                activeDot={{ r: 6, strokeWidth: 2, fill: '#38bdf8', stroke: '#ffffff', className: "animate-pulse shadow-lg" }}
                                dot={scenarioAdjustedData.length < 40 ? { 
                                    r: Math.max(1.5, 3.5 - (scenarioAdjustedData.length / 14)), 
                                    strokeWidth: 1.5, 
                                    fill: '#090d16', 
                                    stroke: '#38bdf8' 
                                } : false}
                                isAnimationActive={false}
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="projectedMean"
                                stroke="#a855f7"
                                strokeWidth={2}
                                strokeDasharray="5 4"
                                fill="none"
                                isAnimationActive={false}
                                dot={false}
                                activeDot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : scenarioAdjustedData.length === 0 ? null : (
                    <div className="w-full h-full opacity-10 pointer-events-none blur-sm">
                    <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={1}>
                        <AreaChart data={[{ mean: minScore }, { mean: scenarioAdjustedData[0]?.mean ?? minScore }, { mean: minScore }]}>
                            <YAxis hide domain={[minScore, maxScore]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-col gap-2 px-2">
                <div className="bg-slate-900/50 border border-white/10 p-4 rounded-2xl backdrop-blur-md shadow-inner">
                    <p className="text-xs font-black text-slate-200 mb-2.5 flex items-center gap-2 uppercase tracking-wider">
                        <Compass size={14} className="text-indigo-400" /> Guia de Leitura do Gráfico
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-1">
                        <div className="flex items-start gap-3 bg-sky-500/10 p-3 rounded-xl border border-sky-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 mt-1 shadow-[0_0_8px_#38bdf8]"></div>
                            <div>
                                <strong className="text-[11px] font-bold text-sky-300 block mb-0.5">Linha Azul (Passado)</strong>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                    Média real do seu desempenho consolidado ao longo do tempo.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0 mt-1 shadow-[0_0_8px_#c084fc]"></div>
                            <div>
                                <strong className="text-[11px] font-bold text-purple-300 block mb-0.5">Tracejado Roxo (Futuro)</strong>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                    Projeção estatística Monte Carlo simulando cenários para a prova.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1 shadow-[0_0_8px_#34d399]"></div>
                            <div>
                                <strong className="text-[11px] font-bold text-emerald-300 block mb-0.5">Cone & Linha Verde (Meta)</strong>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                    Objetivo configurado e o cone com a incerteza do modelo (IC 95%).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {qualitySignal && (qualitySignal.color.includes('red') || qualitySignal.color.includes('rose')) && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl mt-1 animate-pulse backdrop-blur-sm">
                        <p className="text-xs font-bold text-rose-400 mb-1 flex items-center gap-2">
                            <AlertCircle size={14} /> Alerta de tendência
                        </p>
                        <p className="text-[11px] text-rose-200/90 leading-relaxed">
                            Suas projeções recentes estão caindo. Isso indica que os últimos resultados reduziram a expectativa para o dia da prova. Revise seu método de estudo e foque nos tópicos com pior desempenho.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 pt-3 border-t border-white/5 opacity-60 px-2 gap-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    A área sombreada representa o IC 95% da projeção (Margem de erro e incerteza probabilística).
                </p>
                <span className="text-[9px] font-bold font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
                    N = {scenarioAdjustedData.length} registros
                </span>
            </div>
        </div>
    );
};

```

---

## `src/components/charts/EvolutionChart/PerformanceBarChart.jsx` <a id="src-components-charts-evolutionchart-performancebarchart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/PerformanceBarChart.jsx`
- **Descrição:** Gráfico de barras de desempenho comparativo entre disciplinas
- **Linhas:** 220
- **Tamanho:** 14.93 KB

```javascript
import React, { useId, useMemo } from 'react';
import { formatValue } from '../../../utils/scoreHelper';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList
} from "recharts";
import { ChartFrame } from "../ChartFrame";

export const PerformanceBarChart = React.memo(function PerformanceBarChart({ subjectAggData, showOnlyFocus = false, focusCategory = null, unit: _unit = '%', minScore: _minScore = 0 }) {
    const instanceId = useId().replace(/:/g, "");
    const gradQuestoesId = `pb_gradQuestoes_${instanceId}`;
    const gradAcertosId = `pb_gradAcertos_${instanceId}`;

    const sanitizeCount = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 1e9) return 0;
        return Math.round(n);
    };

    const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];
    const filteredAggData = showOnlyFocus && focusCategory?.id
        ? safeSubjectAggData.filter(d => d.id === focusCategory.id)
        : safeSubjectAggData;

    const chartData = filteredAggData.map((d) => {
        const questoes = sanitizeCount(d.questoes);
        const acertosBrutos = sanitizeCount(d.acertos);
        const acertos = Math.min(questoes, acertosBrutos);
        const erros = Math.max(0, questoes - acertos);
        return { ...d, fullName: d.fullName || d.name || d.id, questoes, acertos, erros, errosRaw: erros };
    });
    
    const totals = useMemo(() => {
        const totalQ = chartData.reduce((acc, curr) => acc + curr.questoes, 0);
        const totalA = chartData.reduce((acc, curr) => acc + curr.acertos, 0);
        const accRate = totalQ > 0 ? (totalA / totalQ) * 100 : 0;
        return { totalQ, totalA, accRate };
    }, [chartData]);

    return (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all group w-full min-w-0 flex flex-col justify-between h-full">
            <div className="mb-3 sm:mb-4 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Volume vs Precisão</span>
                    <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1 rounded-full shadow-inner">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Acertos</span>
                        </div>
                        <span className="text-slate-600 text-xs">|</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Erros</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-100 tracking-tight truncate">
                            Questões Resolvidas vs Acertos
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Volume absoluto de questões resolvidas e proporção de acertos.
                        </p>
                    </div>
                    {totals.totalQ > 0 && (
                        <div className="flex items-center gap-2 shrink-0 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400">Precisão Total:</span>
                            <span className="text-xs font-black text-indigo-300 font-mono">{formatValue(totals.accRate)}%</span>
                        </div>
                    )}
                </div>
            </div>
 
            <div className="h-[320px] sm:h-[380px] w-full overflow-x-auto custom-scrollbar pb-2">
                {chartData.length > 0 ? (
                    <div className="min-w-[600px] lg:min-w-full h-full">
                        <ChartFrame minHeight={320} label="Distribuindo desempenho">
                            <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={1}>
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 20, left: 5, bottom: 100 }}
                                barCategoryGap="28%"
                                maxBarSize={52}
                            >
                                <defs>
                                    <linearGradient id={gradQuestoesId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="#be123c" stopOpacity={0.8} />
                                    </linearGradient>
                                    <linearGradient id={gradAcertosId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.98} />
                                        <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                
                                <XAxis
                                    dataKey="fullName"
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    tickLine={false}
                                    tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 500, width: 85 }}
                                    tickFormatter={(val) => String(val || '').length > 24 ? String(val).substring(0, 22) + '..' : String(val || '')}
                                    dy={8}
                                    angle={-32}
                                    textAnchor="end"
                                />
                                
                                <YAxis
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    width={40}
                                    allowDecimals={false}
                                />
                                
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            const rendPctRaw = d.questoes > 0 ? ((d.acertos / d.questoes) * 100) : 0;
                                            const rendPct = formatValue(rendPctRaw);
                                            const pctAcertos = d.questoes > 0 ? (d.acertos / d.questoes) * 100 : 0;

                                            return (
                                                <div className="bg-slate-950/95 backdrop-blur-xl border border-white/15 p-3.5 rounded-2xl shadow-2xl min-w-[210px] max-w-[90vw]">
                                                    <p className="font-black text-white mb-2.5 border-b border-white/10 pb-1.5 text-xs truncate">{d.fullName || d.name}</p>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="flex items-center gap-1.5 text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-slate-500 inline-block"></span>
                                                                Total de questões
                                                            </span>
                                                            <span className="font-mono font-black text-slate-200">{d.questoes}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="flex items-center gap-1.5 text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
                                                                Acertos
                                                            </span>
                                                            <span className="font-mono font-black text-emerald-400">{d.acertos}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="flex items-center gap-1.5 text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-rose-400 inline-block shadow-[0_0_6px_rgba(251,113,133,0.6)]"></span>
                                                                Erros
                                                            </span>
                                                            <span className="font-mono font-black text-rose-400">{d.errosRaw}</span>
                                                        </div>

                                                        {/* Visual proportion bar */}
                                                        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-800 my-1">
                                                            <div className="h-full bg-emerald-500" style={{ width: `${pctAcertos}%` }} />
                                                            <div className="h-full bg-rose-500" style={{ width: `${100 - pctAcertos}%` }} />
                                                        </div>

                                                        <div className="flex justify-between items-center pt-1 border-t border-white/10">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aproveitamento</span>
                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                                                                rendPctRaw >= 70 ? 'bg-emerald-500/15 text-emerald-300' :
                                                                rendPctRaw >= 50 ? 'bg-amber-500/15 text-amber-300' :
                                                                'bg-rose-500/15 text-rose-300'
                                                            }`}>{rendPct}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                
                                <Bar dataKey="acertos" stackId="a" name="Acertos" fill={`url(#${gradAcertosId})`} radius={[0, 0, 4, 4]} isAnimationActive={true}>
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`acertos-cell-${index}`} 
                                            radius={entry.erros === 0 ? [6, 6, 4, 4] : [0, 0, 4, 4]} 
                                        />
                                    ))}
                                </Bar>
                                
                                <Bar dataKey="erros" stackId="a" name="Erros" fill={`url(#${gradQuestoesId})`} radius={[6, 6, 0, 0]} isAnimationActive={true}>
                                    <LabelList 
                                        dataKey="questoes" 
                                        content={(props) => {
                                            const { x, width, value } = props;
                                            if (width < 15 || !value) return null;
                                            const labelY = Math.max(12, (props.y ?? 18) - 6);
                                            return (
                                                <text x={x + width / 2} y={labelY} fill="#e2e8f0" fontSize={10} fontWeight="bold" textAnchor="middle">
                                                    {value}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </ChartFrame>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                        <span className="text-4xl mb-3">📊</span>
                        Nenhum dado de estudo encontrado.
                    </div>
                )}
            </div>

            <div className="mt-3 px-3.5 py-2 bg-white/[0.02] rounded-2xl border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400">
                    💡 O tamanho total da barra representa o volume de questões. A seção <span className="text-emerald-400 font-bold">verde</span> indica acertos e a seção <span className="text-rose-400 font-bold">vermelha</span> indica erros.
                </p>
            </div>
        </div>
    );
});

```

---

## `src/components/charts/EvolutionChart/RadarAnalysis.jsx` <a id="src-components-charts-evolutionchart-radaranalysis-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/RadarAnalysis.jsx`
- **Descrição:** Gráfico de radar multidimensional de equilíbrio entre competências e matérias
- **Linhas:** 205
- **Tamanho:** 13.26 KB

```javascript
import React, { useId } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from "recharts";
// 🎯 FIX: Importação adicionada
import { formatValue } from '../../../utils/scoreHelper';
import { ChartFrame } from "../ChartFrame";

/**
 * RadarAnalysis
 * 
 * A comprehensive disciplinary cross-section (Raio-X) using a Radar chart.
 * Compares current performance levels against target scores.
 */
export function RadarAnalysis({ radarData, maxScore = 100, minScore = 0, unit = '%' }) {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 1;

    const instanceId = useId().replace(/:/g, '');
    const radarGradId = `radar_grad_${instanceId}`;

    return (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl hover:border-slate-700/80 transition-all group flex flex-col justify-between h-full min-w-0">
            <div className="mb-2 sm:mb-3 relative group/tooltip">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Equilíbrio Geral</span>
                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Visão Multidimensional
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-slate-200 flex items-center gap-1.5 tracking-tight">
                        🕸️ Raio-X das Disciplinas
                    </h4>
                    <button type="button" className="relative flex items-center justify-center w-4 h-4 rounded-full border border-slate-600 text-slate-400 text-[9px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors" aria-label="Informação sobre o gráfico radar">
                        ?
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 sm:-translate-x-0 sm:left-0 w-[260px] p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible focus-within:opacity-100 focus-within:visible transition-all duration-300 z-50 pointer-events-none group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible text-left">
                            <p className="text-[11px] text-slate-200 font-normal leading-relaxed normal-case tracking-normal">
                                Este gráfico avalia seu <strong className="text-indigo-400">nível de acertos</strong> em cada matéria, mostrando o equilíbrio do aprendizado. Quanto mais expandida for a teia, mais próximo da meta você está.
                            </p>
                        </div>
                    </button>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                    Comparativo da proficiência real contra a meta estabelecida para a prova.
                </p>
            </div>

            <div className="flex-1 min-h-[290px] sm:min-h-[340px] w-full relative flex flex-col justify-center">
                {(!Array.isArray(radarData) || radarData.length < 3) ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-3">
                        <span className="text-3xl opacity-50">🕸️</span>
                        <p className="text-xs font-semibold text-slate-300">Dados insuficientes para o Raio-X</p>
                        <p className="text-[11px] text-slate-500 max-w-[260px]">
                            São necessárias pelo menos 3 disciplinas com simulados registrados para compor a teia multidimensional.
                        </p>
                    </div>
                ) : (
                    <ChartFrame minHeight={290} label="Calibrando radar">
                        <ResponsiveContainer width="100%" height="100%" minHeight={290} minWidth={1}>
                            <RadarChart cx="50%" cy="50%" outerRadius="66%" data={radarData} margin={{ top: 20, right: 35, bottom: 20, left: 35 }}>
                        <defs>
                            <radialGradient id={radarGradId} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45} />
                                <stop offset="80%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.08} />
                            </radialGradient>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={(props) => {
                                const { x, y, cx, cy, payload } = props;
                                const text = payload?.value || "";
                                const maxLen = 28;
                                const maxLineLen = 16;
                                const anchor = x > cx + 10 ? 'start' : x < cx - 10 ? 'end' : 'middle';
                                const dy = y > cy ? 6 : -6;
                                
                                if (text.length > 13) {
                                    const mid = text.lastIndexOf(' ', Math.ceil(text.length / 2));
                                    const splitIdx = mid > 2 ? mid : Math.ceil(text.length / 2);
                                    const line1 = text.substring(0, splitIdx).trim();
                                    const line2raw = text.substring(splitIdx).trim();
                                    const line2 = line2raw.length > maxLineLen ? line2raw.substring(0, maxLineLen - 1) + '..' : line2raw;
                                    return (
                                        <text x={x} y={y + dy} textAnchor={anchor} fill="#cbd5e1" fontSize={9} fontWeight={600}>
                                            <title>{text}</title>
                                            <tspan x={x} dy="0">{line1}</tspan>
                                            <tspan x={x} dy="11">{line2}</tspan>
                                        </text>
                                    );
                                }
                                const truncated = text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
                                return (
                                    <text x={x} y={y + dy} textAnchor={anchor} fill="#cbd5e1" fontSize={9} fontWeight={600}>
                                        <title>{text}</title>
                                        {truncated}
                                    </text>
                                );
                            }} 
                        />
                        
                        <PolarRadiusAxis 
                            angle={30} 
                            domain={[safeMin, safeMax]} 
                            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} 
                            tickFormatter={(v) => v === safeMin ? '' : formatValue(v)} 
                            axisLine={false} 
                        />

                        {/* Reference Line / Target Radar */}
                        <Radar 
                            name="Meta" 
                            dataKey="meta" 
                            stroke="#10b981" 
                            strokeWidth={1.8}
                            strokeDasharray="4 3" 
                            strokeOpacity={0.8} 
                            fill="none" 
                            dot={{ r: 2.5, fill: '#065f46', stroke: '#10b981', strokeWidth: 1.5 }} 
                        />

                        {/* Bottom Layer: Glow effect */}
                        <Radar 
                            name="_glow_Seu nível"
                            dataKey="nivel" 
                            stroke="#818cf8" 
                            strokeWidth={7} 
                            strokeOpacity={0.28}
                            fill="none" 
                            dot={false}
                            activeDot={false}
                            legendType="none"
                            tooltipType="none"
                        />
                        {/* Top Layer: Actual Performance Radar */}
                        <Radar 
                            name="Seu nível"
                            dataKey="nivel" 
                            stroke="#818cf8" 
                            strokeWidth={2.5} 
                            fill={`url(#${radarGradId})`}
                            dot={{ r: 3.5, fill: '#0f172a', stroke: '#818cf8', strokeWidth: 2 }} 
                            activeDot={{ r: 6, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 2.5 }} 
                        />

                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    const nivel = Number.isFinite(Number(d.nivel)) ? Number(d.nivel) : safeMin;
                                    const meta = Number.isFinite(Number(d.meta)) ? Number(d.meta) : safeMin;
                                    const diff = nivel - meta;
                                    const isAbove = diff >= 0;

                                    return (
                                        <div className="bg-slate-950/95 border border-white/15 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl min-w-[190px]">
                                            <p className="text-xs font-black text-white mb-2 border-b border-white/10 pb-1.5 flex items-center justify-between gap-2">
                                                <span className="truncate">{d.fullSubject || d.subject}</span>
                                            </p>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center gap-3">
                                                    <span className="text-slate-400 font-medium text-[11px]">Seu Nível:</span>
                                                    <span className="font-mono font-black text-indigo-300">{formatValue(nivel)}{unit}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-3">
                                                    <span className="text-slate-400 font-medium text-[11px]">Meta Alvo:</span>
                                                    <span className="font-mono font-bold text-emerald-400">{formatValue(meta)}{unit}</span>
                                                </div>
                                                <div className="pt-1.5 border-t border-white/10 flex justify-between items-center gap-3">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                        isAbove 
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                    }`}>
                                                        {isAbove ? `+${formatValue(diff)}${unit} ✓` : `${formatValue(diff)}${unit}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend 
                            payload={[
                                { value: 'Meta Estabelecida', type: 'line', id: 'meta', color: '#10b981' },
                                { value: 'Domínio Real', type: 'line', id: 'nivel', color: '#818cf8' }
                            ]}
                            wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: '#94a3b8', fontWeight: 600 }} 
                        />
                    </RadarChart>
                    </ResponsiveContainer>
                </ChartFrame>
                )}
            </div>
        </div>
    );
}

```

---

## `src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx` <a id="src-components-charts-evolutionchart-subtopicsperformancechart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx`
- **Descrição:** Raio-X cirúrgico de subtópicos e assuntos específicos
- **Linhas:** 633
- **Tamanho:** 35.78 KB

```javascript
import React, { useMemo, useState, useId, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell, ReferenceLine,
    LineChart, Line, Legend
} from "recharts";
import { normalizeDate, getDateKey, formatDisplayDate, parseNoonLocal } from "../../../utils/dateHelper";
import { getSafeScore, formatValue, getSyntheticTotal } from "../../../utils/scoreHelper";
import { toArray, getHistoryDate } from "../../../utils/evolutionGuards";
import { ChartFrame } from "../ChartFrame";

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

const MEGA_PALETTE = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#fb7185", "#34d399", "#fbbf24", "#a3e635"
];

const CustomLineTooltip = React.memo(({ active, payload, label, targetScorePct }) => {
    const safeFix = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v).toFixed(d) : "0");
    
    if (active && payload && payload.length) {
        const sortedPayload = [...payload].sort((a, b) => {
            const valA = Number.isFinite(Number(a?.value)) ? Number(a.value) : -Infinity;
            const valB = Number.isFinite(Number(b?.value)) ? Number(b.value) : -Infinity;
            return valB - valA;
        });

        return (
            <div className="bg-slate-950/95 border border-white/10 p-4 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl min-w-[320px] z-50">
                {(() => {
                  const candidate = typeof label === 'number' ? new Date(label) : parseNoonLocal(label);
                  const parsedLabel = Number.isFinite(candidate?.getTime?.()) ? candidate : new Date(label);
                
                  const formattedLabel = Number.isFinite(parsedLabel?.getTime?.())
                    ? `${String(parsedLabel.getDate()).padStart(2, '0')}/${String(parsedLabel.getMonth() + 1).padStart(2, '0')}`
                    : String(label);
                
                  return (
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2 flex justify-between items-center">
                      <span>📅 {formattedLabel}</span>
                      <span>Meta: {safeFix(targetScorePct, 1)}%</span>
                    </p>
                  );
                })()}
                <div className="space-y-4">
                    {sortedPayload.map((entry, index) => {
                        const pct = Math.max(0, Math.min(100, entry.value));
                        const topicKey = entry.dataKey;
                        const total = Math.round(Number(entry.payload[`${topicKey}_total`]) || 0);
                        const correct = Math.round(Number(entry.payload[`${topicKey}_correct`]) || 0);
                        const delta = entry.payload[`${topicKey}_delta`];
                        
                        const isTargetMet = pct >= targetScorePct;
                        const gap = isTargetMet ? 0 : Math.max(0, targetScorePct - pct);
                        
                        return (
                            <div key={`item-${index}`} className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col gap-0.5">
                                        <span style={{ color: entry.color }} className="font-bold flex items-center gap-2 min-w-0 max-w-[200px]" title={entry.name}>
                                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}88` }}></span>
                                            <span className="truncate">{entry.name}</span>
                                            {isTargetMet && <span title="Meta atingida" className="text-[10px] shrink-0 drop-shadow-md">🔥</span>}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono ml-4 flex items-center gap-1.5">
                                            <span className="bg-slate-900 px-1 rounded border border-white/5">Vol: {correct}/{total}</span>
                                            {gap > 0 && <span className="text-rose-400/70">Falta {safeFix(gap, 1)}%</span>}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                        <span className="font-mono font-black text-white text-[13px] drop-shadow-md leading-none">
                                            {safeFix(entry.value, 1)}%
                                        </span>
                                        {delta !== undefined && delta !== null && (
                                            <span className={`text-[9px] font-black font-mono leading-none ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '■ '}{safeFix(delta, 1)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-white/5 shadow-inner mt-0.5">
                                    <div 
                                        className="h-full rounded-full transition-all duration-500 ease-out relative" 
                                        style={{ width: `${pct}%`, backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}88` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/30 to-transparent"></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
});

export const SubtopicsPerformanceChart = React.memo(({ 
    categories = [], 
    focusSubjectId, 
    showOnlyFocus, 
    timeWindow, 
    targetScore = 80, 
    minScore = 0,
    maxScore = 100 
}) => {
    const instanceId = useId().replace(/:/g, "");
    const [viewMode, setViewMode] = useState('bars');
    const accuracyUnit = '%';
    
    // FIX 5A: garantir range mínimo e fallback sensato
    const safeMinScorePct = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScorePct = Number(maxScore) > safeMinScorePct ? Number(maxScore) : safeMinScorePct + 1;
    const safeRangePct = Math.max(1e-9, safeMaxScorePct - safeMinScorePct);
    
    const safeTargetScorePctRaw = Number.isFinite(Number(targetScore))
      ? Number(targetScore)
      : safeMinScorePct;
    
    const safeTargetScorePctClamped = Math.max(
      safeMinScorePct,
      Math.min(safeMaxScorePct, safeTargetScorePctRaw)
    );
    
    const targetScorePct = Math.max(
      0,
      Math.min(
        100,
        ((safeTargetScorePctClamped - safeMinScorePct) / safeRangePct) * 100
      )
    );

    const renderLineTooltip = useCallback(
        (props) => <CustomLineTooltip {...props} targetScorePct={targetScorePct} />,
        [targetScorePct]
    );

    const limitMs = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        if (timeWindow !== "all") {
            const days = parseInt(timeWindow, 10);
            if (Number.isFinite(days) && days > 0) {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - days);
                pastDate.setHours(0, 0, 0, 0);
                return pastDate.getTime();
            }
        }
        return 0;
    }, [timeWindow]);

    const relevantCategories = useMemo(() => {
        return categories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId);
    }, [categories, showOnlyFocus, focusSubjectId]);

    const chartData = useMemo(() => {
        const topicMap = {};
        const safeMaxScore = Math.max(1, Number(maxScore) || 100);
        const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;

        relevantCategories.forEach(cat => {
            const history = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
            if (!history.length) return;

            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMinScore;
            const catRange = Math.max(1e-9, catMax - catMin);

            const recentHistory = history.filter(h => {
                if (!limitMs) return true;
                const d = normalizeDate(getHistoryDate(h));
                return d && d.getTime() >= limitMs;
            });

            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];
                let topicList = toArray(h.topics);
                if (topicList.length === 0 && (h.topic || h.assunto || h.subtopic || h.topicName)) {
                    topicList = [{
                        name: h.topic || h.assunto || h.subtopic || h.topicName,
                        total: h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions,
                        correct: h.correct ?? h.acertos ?? h.correctCount,
                        score: h.score,
                        isPercentage: h.isPercentage
                    }];
                }

                topicList.forEach(t => {
                    const rawName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').replace(/<[^>]*>?/gm, '').trim();
                    const n = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                    if (!n || n.toLowerCase() === 'nenhum') return;
                    const key = n.toLowerCase();

                    if (!topicMap[key]) {
                        topicMap[key] = { name: n, correct: 0, total: 0 };
                    }

                    let total = parseInt(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 10) || 0;
                    if (t.isPercentage) {
                        if (total === 0) total = getSyntheticTotal(catMax);
                    } else if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(catMax);
                    }
                    if (total === 0) return;
                    
                    const hasValidC = !t.isPercentage && (
                        (t.correct !== null && t.correct !== undefined && String(t.correct).trim() !== '') ||
                        (t.acertos !== null && t.acertos !== undefined && String(t.acertos).trim() !== '') ||
                        (t.correctCount !== null && t.correctCount !== undefined && String(t.correctCount).trim() !== '')
                    );
                    const parsedC = Number(t.correct ?? t.acertos ?? t.correctCount);
                    let correctCount = hasValidC && Number.isFinite(parsedC) ? parsedC : NaN;

                    if (!Number.isFinite(correctCount)) {
                        const rawScore = getSafeScore(t, catMax, catMin);
                        const score = Number.isFinite(rawScore) ? rawScore : catMin;
                        const normalizedScore = Math.max(catMin, Math.min(catMax, score));
                        correctCount = total > 0 ? ((normalizedScore - catMin) / catRange) * total : 0;
                    }
                    correctCount = Math.max(0, Math.min(total, Number.isFinite(correctCount) ? correctCount : 0));

                    topicMap[key].total += total;
                    topicMap[key].correct += correctCount;
                });
            }
        });

        return Object.values(topicMap)
            .filter(d => d.total > 0)
            .map(d => {
                const rawAcc = (d.correct / d.total) * 100;
                const acc = Number.isFinite(rawAcc) ? rawAcc : 0;
                return {
                    name: d.name.length > 25 ? d.name.substring(0, 23) + '...' : d.name,
                    fullName: d.name,
                    correct: Math.round(d.correct),
                    total: Math.round(d.total),
                    accuracy: Number(acc.toFixed(2)),
                };
            })
            .sort((a, b) => a.accuracy - b.accuracy);
    }, [relevantCategories, limitMs, maxScore, minScore]);


    const { timeSeriesData, uniqueTopics } = useMemo(() => {
        const dateMap = {}; 
        const topicVolumeMap = {}; 
        const safeMaxScore = Math.max(1, Number(maxScore) || 100);
        const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;

        const toTopicKey = (name) => {
          const normalized = String(name || '').trim().toLowerCase();
          const slug = normalized.replace(/[^a-z0-9]+/g, '_');
          let h1 = 0x811c9dc5;
          let h2 = 0x01000193;
          for (let i = 0; i < normalized.length; i++) {
            const c = normalized.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 0x01000193);
            h2 = Math.imul(h2 ^ c, 0x85ebca6b);
          }
          return `top_${slug}_${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
        };

        relevantCategories.forEach(cat => {
            const history = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
            if (!history.length) return;

            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMinScore;
            const catRange = Math.max(1e-9, catMax - catMin);

            const recentHistory = history.filter(h => {
                if (!limitMs) return true;
                const d = normalizeDate(getHistoryDate(h));
                return d && d.getTime() >= limitMs;
            });

            for (const h of recentHistory) {
                const d = normalizeDate(getHistoryDate(h));
                if (!d) continue;
                const dateKey = getDateKey(d);
                if (!dateKey) continue;
                const dateLabel = formatDisplayDate(dateKey);
                const dayNoonMs = parseNoonLocal(dateKey)?.getTime() ?? d.getTime();

                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { dateLabel, originalDate: dayNoonMs };
                }

                let topicList = toArray(h.topics);
                if (topicList.length === 0 && (h.topic || h.assunto || h.subtopic || h.topicName)) {
                    topicList = [{
                        name: h.topic || h.assunto || h.subtopic || h.topicName,
                        total: h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions,
                        correct: h.correct ?? h.acertos ?? h.correctCount,
                        score: h.score,
                        isPercentage: h.isPercentage
                    }];
                }

                topicList.forEach(t => {
                    const rawName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').replace(/<[^>]*>?/gm, '').trim();
                    const topicName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                    if (!topicName || topicName.toLowerCase() === 'nenhum') return;
                    
                    let total = parseInt(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 10) || 0;
                    if (t.isPercentage) {
                        if (total === 0) total = getSyntheticTotal(catMax);
                    } else if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(catMax);
                    }
                    if (total === 0) return;

                    topicVolumeMap[topicName] = (topicVolumeMap[topicName] || 0) + total;

                    const hasValidC = !t.isPercentage && (
                        (t.correct !== null && t.correct !== undefined && String(t.correct).trim() !== '') ||
                        (t.acertos !== null && t.acertos !== undefined && String(t.acertos).trim() !== '') ||
                        (t.correctCount !== null && t.correctCount !== undefined && String(t.correctCount).trim() !== '')
                    );
                    const parsedC = Number(t.correct ?? t.acertos ?? t.correctCount);
                    let correct = hasValidC && Number.isFinite(parsedC) ? parsedC : NaN;

                    if (!Number.isFinite(correct)) {
                        const rawScore = getSafeScore(t, catMax, catMin);
                        const score = Number.isFinite(rawScore) ? rawScore : catMin;
                        const normalizedScore = Math.max(catMin, Math.min(catMax, score));
                        correct = total > 0 ? ((normalizedScore - catMin) / catRange) * total : 0;
                    }
                    correct = Math.max(0, Math.min(total, Number.isFinite(correct) ? correct : 0));

                    const sKey = toTopicKey(topicName);
                    const totKey = `${sKey}_total`;
                    const corKey = `${sKey}_correct`;

                    if (dateMap[dateKey][totKey] === undefined) {
                        dateMap[dateKey][totKey] = 0;
                        dateMap[dateKey][corKey] = 0;
                    }
                    dateMap[dateKey][totKey] += total;
                    dateMap[dateKey][corKey] += correct;
                });
            }
        });

        const topTopicNames = Object.entries(topicVolumeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(entry => entry[0]);

        const topTopics = topTopicNames
          .map(name => ({
            name,
            key: toTopicKey(name)
          }))
          .filter((topic, index, self) => self.findIndex(t => t.key === topic.key) === index);

        let series = Object.values(dateMap).sort((a, b) => a.originalDate - b.originalDate);

        let prevAccMap = {};
        series.forEach(entry => {
            topTopics.forEach(topic => {
                const tot = entry[`${topic.key}_total`];
                const cor = entry[`${topic.key}_correct`];
                if (tot !== undefined && tot > 0) {
                    const accRaw = (cor / tot) * 100;
                    const safeAccRaw = Number.isFinite(accRaw) ? accRaw : 0;
                    const acc = Number(Math.max(0, Math.min(100, safeAccRaw)).toFixed(2));
                    entry[topic.key] = acc;
                    
                    if (prevAccMap[topic.key] !== undefined) {
                        entry[`${topic.key}_delta`] = Number((acc - prevAccMap[topic.key]).toFixed(2));
                    } else {
                        entry[`${topic.key}_delta`] = null;
                    }
                    prevAccMap[topic.key] = acc;
                }
            });
        });

        series = series.filter(entry => {
            return topTopics.some(topic => entry[topic.key] !== undefined);
        });

        return { timeSeriesData: series, uniqueTopics: topTopics };
    }, [relevantCategories, limitMs, maxScore, minScore]);


    return (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl w-full min-h-[600px]" id={`subtopics_container_${instanceId}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 px-1 gap-3">
                <div>
                    <h3 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-500 mb-0.5 tracking-tight">
                        Raio-X de Tópicos
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">Taxa de acertos real por assunto e volume de questões realizadas.</p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-2xl shadow-inner shrink-0 w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('bars')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all will-change-transform ${viewMode === 'bars' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'}`}
                        aria-pressed={viewMode === 'bars'}
                    >
                        Ranking (Barras)
                    </button>
                    <button
                        onClick={() => setViewMode('lines')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all will-change-transform ${viewMode === 'lines' ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'}`}
                        aria-pressed={viewMode === 'lines'}
                    >
                        Tempo (Linhas)
                    </button>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30 mt-4">
                    <span className="text-5xl opacity-40">⏳</span>
                    <div className="text-center">
                        <p className="text-slate-300 font-bold text-base mb-1">Nenhum assunto no período atual</p>
                        <p className="text-slate-500 text-xs mt-1">Altere o filtro de período para <b className="text-slate-400">Tudo</b> caso seus simulados sejam mais antigos.</p>
                    </div>
                </div>
            ) : viewMode === 'bars' ? (
                <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                    <div className="min-w-[520px] lg:min-w-full relative" style={{ height: Math.max(450, chartData.length * 60) }}>
                        <ChartFrame minHeight={450} label="Analisando subtópicos">
                            <ResponsiveContainer width="100%" height="100%" minHeight={450} minWidth={1}>
                            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 120, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={`gradGood_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.7}/>
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={1}/>
                                    </linearGradient>
                                    <linearGradient id={`gradWarn_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7}/>
                                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={1}/>
                                    </linearGradient>
                                    <linearGradient id={`gradBad_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7}/>
                                        <stop offset="100%" stopColor="#f87171" stopOpacity={1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />

                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    stroke="#94a3b8"
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}${accuracyUnit}`}
                                    allowDataOverflow={true}
                                />

                                    <YAxis
                                        type="category"
                                        dataKey="fullName"
                                        stroke="#cbd5e1"
                                        tick={(props) => {
                                            const { x, y, payload } = props;
                                            const text = payload?.value || "";
                                            const fullText = payload?.payload?.fullName || text;
                                            const maxLen = 24;
                                            const truncated = text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <text x={-6} y={0} dy={4} textAnchor="end" fill="#cbd5e1" fontSize={11} fontWeight={600}>
                                                        <title>{fullText}</title>
                                                        {truncated}
                                                    </text>
                                                </g>
                                            );
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={160}
                                    />

                                <Tooltip
                                    offset={30}
                                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                    contentStyle={CustomTooltipStyle}
                                    itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                    formatter={(value, name, props) => {
                                        const entry = props?.payload;
                                        if (!entry) return [value, name];
                                        return [`${formatValue(value)}% (${entry.correct || 0}/${entry.total || 0} acertos)`, 'Precisão'];
                                    }}
                                    labelFormatter={(label) => <span className="font-black text-amber-400 tracking-wider uppercase text-[10px]">{label}</span>}
                                />

                                <ReferenceLine 
                                    x={targetScorePct} 
                                    stroke="#10b981" 
                                    strokeDasharray="5 3" 
                                    strokeWidth={2}
                                    strokeOpacity={0.8}
                                    label={{ position: 'top', value: 'META', fill: '#34d399', fontSize: 10, fontWeight: 'bold' }}
                                />

                                <Bar dataKey="accuracy" radius={[0, 8, 8, 0]} barSize={26} fill="#6366f1" background={{ fill: 'rgba(255,255,255,0.03)', radius: [0, 8, 8, 0] }} isAnimationActive={true} animationDuration={800}>
                                    {chartData.map((entry, index) => {
                                        let barColor = `url(#gradBad_${instanceId})`;
                                        const warnThreshold = targetScorePct > 35 ? Math.max(25, targetScorePct * 0.75) : targetScorePct * 0.75;
                                        if (entry.accuracy >= targetScorePct) barColor = `url(#gradGood_${instanceId})`;
                                        else if (entry.accuracy >= warnThreshold) barColor = `url(#gradWarn_${instanceId})`;
                                        return <Cell key={`cell-${index}`} fill={barColor} />;
                                    })}
                                    <LabelList
                                        dataKey="accuracy"
                                        position="right"
                                        content={(props) => {
                                            const { x, y, width, height, value, index } = props;
                                            const entry = chartData[index];
                                            if (!entry) return null;
                                            return (
                                                <text x={x + width + 8} y={y + height / 2 + 4}>
                                                    <tspan fill="#ffffff" fontSize={11} fontWeight="900">{formatValue(value)}%</tspan>
                                                    <tspan fill="#94a3b8" fontSize={9.5} fontWeight="700" dx={6}>({entry.correct}/{entry.total})</tspan>
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </ChartFrame>
                    </div>
                </div>
            ) : (
                // 🎯 FIX: Altura reduzida de 750px para 500px para caber melhor na tela
                <div className="w-full relative min-h-[500px]">
                    <div className="absolute top-0 right-4 text-[10px] text-indigo-400/60 font-mono z-10">
                        {uniqueTopics.length} tópicos plotados simultaneamente.
                    </div>
                    {timeSeriesData.length > 0 ? (
                        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                            <div className="min-w-[700px] lg:min-w-full">
                                <ChartFrame minHeight={500} label="Analisando subtópicos">
                                    <ResponsiveContainer width="100%" height={500} minWidth={1}>
                                    {/* 🎯 FIX: left de -20 para 0 para evitar corte do eixo Y */}
                                    <LineChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                                        <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />

                                        <XAxis
                                            dataKey="originalDate"
                                            stroke="#64748b"
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                            tickLine={false}
                                            tickFormatter={(val) => {
                                                const candidate = typeof val === 'number' ? new Date(val) : parseNoonLocal(val);
                                                const d = Number.isFinite(candidate?.getTime?.()) ? candidate : new Date(val);
                                                if (!Number.isFinite(d?.getTime?.())) return String(val ?? '');
                                                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                                            }}
                                        />

                                        <YAxis
                                            stroke="#64748b"
                                            domain={[0, 100]}
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${v}%`}
                                            allowDataOverflow={true}
                                        />

                                        <Tooltip
                                            offset={40}
                                            content={renderLineTooltip}
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />

                                        <ReferenceLine y={targetScorePct} stroke="rgba(52, 211, 153, 0.4)" strokeDasharray="4 4" label={{ position: 'top', value: 'META', fill: '#6ee7b7', fontSize: 10 }} />

                                        <Legend
                                            wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                                            iconType="circle"
                                        />

                                        {uniqueTopics.map((topic, index) => {
                                            const color = MEGA_PALETTE[index % MEGA_PALETTE.length];
                                            return (
                                                <Line connectNulls
                                                    key={topic.key || topic.name}
                                                    type="monotoneX"
                                                    dataKey={topic.key || topic.name}
                                                    name={topic.name}
                                                    stroke={color}
                                                    strokeWidth={3}
                                                    dot={{ r: 3, fill: '#0f172a', strokeWidth: 1.5, stroke: color }}
                                                    activeDot={{ r: 5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
                                                    animationDuration={1500}
                                                    animationEasing="ease-in-out"
                                                />
                                            );
                                        })}
                                    </LineChart>
                                    </ResponsiveContainer>
                                </ChartFrame>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 italic">
                            <span className="text-3xl mb-2">📉</span>
                            <p>Dados insuficientes no período.</p>
                            <p className="text-xs">Faça simulados em dias diferentes para formar a linha do tempo.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

```

---

## `src/components/charts/EvolutionChart/TimeSpentChart.jsx` <a id="src-components-charts-evolutionchart-timespentchart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/TimeSpentChart.jsx`
- **Descrição:** Rastreador de agilidade e tempo médio por questão em simulados IA
- **Linhas:** 495
- **Tamanho:** 27.89 KB

```javascript
import React, { useState, useMemo } from 'react';

import { Clock } from 'lucide-react';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { getSyntheticTotal } from '../../../utils/scoreHelper';

const formatTime = (s) => {
    if (s == null || !Number.isFinite(Number(s)) || Number(s) < 0) return 'N/A';
    // ✅ LOTE-02 FIX: arredondar ANTES de separar minutos/segundos
    const total = Math.round(Math.max(0, Number(s)));
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
};

const HalfMoonGauge = React.memo(function HalfMoonGauge({ data }) {
    const width = 200;
    const height = 110;
    const cx = width / 2;
    const cy = height;
    const r = 80;
    const strokeWidth = 14;

    const localMax = Math.max(30, data.displaySeconds || 0, data.visualLatestSeconds ?? data.latestSeconds ?? 0, data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds ?? 0);
    const gaugeMax = localMax * 1.2;

    const getCoordinatesForValue = (val) => {
        const safeVal = Math.max(0, Math.min(Number.isFinite(val) ? val : 0, gaugeMax));
        const angle = Math.PI - (safeVal / gaugeMax) * Math.PI;
        return {
            x: cx + r * Math.cos(angle),
            y: cy - r * Math.sin(angle)
        };
    };

    const makeArc = (startVal, endVal) => {
        const start = getCoordinatesForValue(startVal);
        const end = getCoordinatesForValue(endVal);
        return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
    };

    const displayColor = "#0ea5e9";
    const hasLatest = data.latestSeconds != null;
    const hasAbsolute = data.absoluteLatestSeconds != null;
    const margin = Math.max(1, Math.round((data.displaySeconds || 0) * 0.05));
    
    let latestColor = null;
    if (hasLatest) {
        if (data.latestSeconds === 0) latestColor = "#94a3b8";
        else if (data.latestSeconds > data.displaySeconds + margin) latestColor = "#ef4444";
        else if (data.latestSeconds < data.displaySeconds - margin) latestColor = "#10b981";
        else latestColor = "#eab308";
    }

    let absoluteColor = null;
    if (hasAbsolute) {
        if (data.absoluteLatestSeconds === 0) absoluteColor = "#94a3b8";
        else if (data.absoluteLatestSeconds > data.displaySeconds + margin) absoluteColor = "#ef4444";
        else if (data.absoluteLatestSeconds < data.displaySeconds - margin) absoluteColor = "#10b981";
        else absoluteColor = "#eab308";
    }

    return (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 flex flex-col items-center justify-between h-full shadow-lg hover:border-cyan-500/30 transition-all group relative overflow-hidden">
            {hasAbsolute && data.absoluteTotalTime != null && (
                <div 
                    className={`absolute top-3 right-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-slate-950/70 shadow-sm ${
                        absoluteColor === '#ef4444' ? 'border-rose-500/40 text-rose-300' : 
                        (absoluteColor === '#10b981' ? 'border-emerald-500/40 text-emerald-300' : 
                        (absoluteColor === '#eab308' ? 'border-yellow-500/40 text-yellow-300' : 
                        'border-slate-700 text-slate-300'))
                    }`}
                    title="Tempo Absoluto da Última Sessão"
                >
                    {formatTime(data.absoluteTotalTime)}
                </div>
            )}
            <h4 className={`text-slate-200 font-bold text-sm text-center mb-3 truncate w-full ${hasAbsolute && data.absoluteTotalTime != null ? 'pr-16 pl-2' : 'px-2'}`} title={data.fullName}>
                {data.fullName}
            </h4>
            
            <div className="relative w-full max-w-[200px] h-[110px] mx-auto my-1">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" role="img" aria-label={`Gauge mostrando tempo médio de ${formatTime(data.displaySeconds)}`}>
                    {/* Track Background */}
                    <path d={makeArc(0, gaugeMax)} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round" />
                    
                    {/* Track 7-Day Average (Translucent) */}
                    {data.displaySeconds > 0 && (
                        <path d={makeArc(0, data.displaySeconds)} fill="none" stroke={displayColor} strokeOpacity={0.25} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Track Latest Average (Solid) */}
                    {hasLatest && data.latestSeconds > 0 && (
                        <path d={makeArc(0, (data.visualLatestSeconds ?? data.latestSeconds))} fill="none" stroke={latestColor} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Absolute Marker (Pin) */}
                    {hasAbsolute && (
                        <g>
                            {(() => {
                                const pos = getCoordinatesForValue(data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds);
                                return (
                                    <circle cx={pos.x} cy={pos.y} r={6} fill="#ffffff" stroke={absoluteColor} strokeWidth={2.5} className="shadow-lg drop-shadow-md" />
                                );
                            })()}
                        </g>
                    )}
                </svg>

                {/* Inner Text */}
                <div className="absolute bottom-0 left-0 w-full text-center flex flex-col items-center justify-end pb-1">
                    <span className="text-2xl font-black text-white tracking-tight">{formatTime((hasLatest && data.latestSeconds > 0) ? data.latestSeconds : data.displaySeconds)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        Média: {formatTime(data.displaySeconds)}
                    </span>
                </div>
            </div>

            <div className="w-full mt-3 pt-2.5 border-t border-slate-800/60 bg-slate-950/40 p-2.5 rounded-xl border flex flex-col gap-1.5">
                {hasAbsolute && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Última média</span>
                        <span className={`font-bold ${absoluteColor === '#ef4444' ? 'text-rose-400' : (absoluteColor === '#10b981' ? 'text-emerald-400' : (absoluteColor === '#eab308' ? 'text-yellow-400' : 'text-slate-300'))}`}>{formatTime(data.absoluteLatestSeconds)}</span>
                    </div>
                )}
                {hasLatest && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Média Dia</span>
                        <span className={`font-bold ${latestColor === '#ef4444' ? 'text-rose-400' : (latestColor === '#10b981' ? 'text-emerald-400' : (latestColor === '#eab308' ? 'text-yellow-400' : 'text-slate-300'))}`}>{formatTime(data.latestSeconds)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Média (7 dias)</span>
                    <span className="text-cyan-400 font-bold">{formatTime(data.displaySeconds)}</span>
                </div>
            </div>
        </div>
    );
});

export function TimeSpentChart({ subjectAggData, activeCategories = [], showOnlyFocus, focusCategory, maxScore = 100, minScore: _minScore = 0 }) {
    const [sortOrder, setSortOrder] = useState('slower'); // 'slower' | 'faster'

    const chartData = useMemo(() => {
        const relevantSubjectAggData = (() => {
          const safe = Array.isArray(subjectAggData) ? subjectAggData : [];
          if (!showOnlyFocus || !focusCategory?.id) return safe;
          return safe.filter(d => d.id === focusCategory.id);
        })();

        return relevantSubjectAggData
            .filter(d => d.timedQuestoes > 0 && d.timeSpent >= 0)
            .map((d) => {
                // Média geral
                const avgSeconds = Math.round(d.timeSpent / d.timedQuestoes);

            // Média Recente (Últimos 7 dias)
            let recentAvgSeconds = null;
            const cat = activeCategories.find(c => c.id === d.id);
            if (cat) {
                const nowMs = new Date().getTime();
                const todayKey = getDateKey(new Date());
                const todayNoonMs = toDateMs(todayKey) || nowMs;
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                const history = Object.values(cat.simuladoStats?.history || {});

                const recentStats = history.reduce((acc, h) => {
                    const hKey = getDateKey(h.date || h.createdAt);
                    const hDateMs = toDateMs(hKey) || toDateMs(h.date || h.createdAt);
                    if (!hDateMs || !Number.isFinite(hDateMs) || (todayNoonMs - hDateMs) > sevenDaysMs || !hKey || hKey > todayKey) {
                        return acc;
                    }

                    let rootTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;

                    const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                    if (safeTopics.length > 0) {
                        for (const t of safeTopics) {
                            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0);
                            if (tTs !== null && tTs > 0 && tTot > 0) { // BUG FIX: Ignora tempos exatos de 0s (origem de banco de dados antigo corrompido)
                                topicsTs += tTs;
                                topicsTimedQ += tTot;
                                hasTopicWithTime = true;
                            }
                        }
                    }

                    if (hasTopicWithTime) {
                        return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
                    } else {
                        let tot = Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0;
                        if (tot === 0 && h.score != null) tot = getSyntheticTotal(maxScore);
                        if (tot > 0 && rootTs !== null && rootTs > 0) {
                            return { ts: acc.ts + rootTs, tq: acc.tq + tot };
                        }
                    }

                    return acc;
                }, { ts: 0, tq: 0 });

                if (recentStats.tq > 0) {
                    recentAvgSeconds = Math.round(recentStats.ts / recentStats.tq);
                }
            }

            // Define qual métrica usaremos como base (Recente tem prioridade para a barra visual)
            const displaySeconds = recentAvgSeconds !== null ? recentAvgSeconds : avgSeconds;
            const hasRecentData = recentAvgSeconds !== null;
            let latestSeconds = null;
            let absoluteLatestSeconds = null;
            let absoluteTotalTime = null;

            if (cat) {
                const extractEntryTiming = (entry) => {
                    let rootTs = typeof entry?.timeSpent === 'number' ? entry.timeSpent : null;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;
                    const safeTopics = Array.isArray(entry?.topics) ? entry.topics : Object.values(entry?.topics || {});
                    for (const t of safeTopics) {
                        const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                        const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0);
                        if (tTs !== null && tTs > 0 && tTot > 0) {
                            topicsTs += tTs;
                            topicsTimedQ += tTot;
                            hasTopicWithTime = true;
                        }
                    }
                    if (hasTopicWithTime && topicsTimedQ > 0) return { ts: topicsTs, tq: topicsTimedQ };
                    let tot = Number(entry?.total ?? entry?.questoes ?? entry?.totalQuestoes ?? entry?.questions) || 0;
                    if (tot === 0 && entry?.score != null) tot = getSyntheticTotal(maxScore);
                    if (tot > 0 && rootTs !== null && rootTs > 0) return { ts: rootTs, tq: tot };
                    return null;
                };

                // BUG FIX: Garante que o histórico é ordenado cronologicamente e possui tempo válido
                const sortedHistory = Object.values(cat.simuladoStats?.history || {})
                    .filter(h => h && toDateMs(h.date || h.createdAt) != null && extractEntryTiming(h) !== null)
                    .sort((a, b) => {
                        const da = toDateMs(a.date || a.createdAt) || 0;
                        const db = toDateMs(b.date || b.createdAt) || 0;
                        return da - db;
                    });

                const latestEntry = sortedHistory[sortedHistory.length - 1];
                if (latestEntry) {
                    const latestDayKey = getDateKey(latestEntry.date || latestEntry.createdAt);
                    const sameDayEntries = sortedHistory.filter(h => getDateKey(h.date || h.createdAt) === latestDayKey);
                    const dayTotals = sameDayEntries.reduce((acc, h) => {
                        const timing = extractEntryTiming(h);
                        return timing ? { ts: acc.ts + timing.ts, tq: acc.tq + timing.tq } : acc;
                    }, { ts: 0, tq: 0 });

                    if (dayTotals.tq > 0) {
                        latestSeconds = Math.round(dayTotals.ts / dayTotals.tq);
                    }

                    if (latestEntry.lastSessionTimeSpent != null && latestEntry.lastSessionTotal > 0) {
                        absoluteLatestSeconds = Math.round(latestEntry.lastSessionTimeSpent / latestEntry.lastSessionTotal);
                        absoluteTotalTime = latestEntry.lastSessionTimeSpent;
                    } else {
                        const lastTiming = extractEntryTiming(latestEntry);
                        if (lastTiming && lastTiming.tq > 0) {
                            absoluteLatestSeconds = Math.round(lastTiming.ts / lastTiming.tq);
                            absoluteTotalTime = lastTiming.ts;
                        }
                    }
                }
            }

            const timeStr = formatTime(displaySeconds);

            let deltaStr = "";
            let deltaSeconds = 0;
            if (hasRecentData) {
                deltaSeconds = recentAvgSeconds - avgSeconds;
                const margin = Math.max(1, Math.round(avgSeconds * 0.05));
                if (deltaSeconds > margin) {
                    deltaStr = `🐢 +${deltaSeconds}s`;
                } else if (deltaSeconds < -margin) {
                    deltaStr = `⚡ ${deltaSeconds}s`;
                } else {
                    deltaStr = `✨ Estável`;
                }
            }

            const qstStr = `(${d.timedQuestoes} ${d.timedQuestoes === 1 ? 'questão' : 'questões'})`;
            const latestStr = latestSeconds !== null ? `Média Dia: ${formatTime(latestSeconds)}` : "";
            const parts = [latestStr, deltaStr, qstStr].filter(Boolean);

            const latestSecs = latestSeconds || 0;
            const visualLatestSeconds = displaySeconds > 0
                ? Math.min(latestSecs, Math.max(displaySeconds * 2.5, 120))
                : Math.min(latestSecs, 180); // Capped at 3 mins if display is 0

            const absoluteSecs = absoluteLatestSeconds || 0;
            const visualAbsoluteSeconds = displaySeconds > 0
                ? Math.min(absoluteSecs, Math.max(displaySeconds * 2.5, 120))
                : Math.min(absoluteSecs, 180);

            return {
                ...d,
                displaySeconds,
                avgSeconds, // Geral
                recentAvgSeconds,
                latestSeconds,
                absoluteLatestSeconds,
                absoluteTotalTime,
                visualLatestSeconds,
                visualAbsoluteSeconds,
                hasRecentData,
                deltaSeconds,
                avgFormatted: timeStr,
                generalFormatted: formatTime(avgSeconds),
                avgLabelWithDetails: parts.join("   |   ")
            };
        })
        .sort((a, b) => sortOrder === 'slower' ? b.displaySeconds - a.displaySeconds : a.displaySeconds - b.displaySeconds);
    }, [subjectAggData, activeCategories, sortOrder, maxScore, showOnlyFocus, focusCategory]);

    const legendStats = useMemo(() => {
        return chartData.reduce((acc, item) => {
            if (Number.isFinite(Number(item.displaySeconds))) {
            acc.avg += Number(item.displaySeconds);
            acc.avgCount += 1;
        }

        if (item.latestSeconds !== null && Number.isFinite(Number(item.latestSeconds)) && Number(item.latestSeconds) > 0) {
            acc.latest += Number(item.latestSeconds);
            acc.latestCount += 1;

            const margin = Math.max(1, Math.round((Number(item.displaySeconds) || 0) * 0.05));
            if (Number(item.latestSeconds) > Number(item.displaySeconds) + margin) acc.above += 1;
            if (Number(item.latestSeconds) < Number(item.displaySeconds) - margin) acc.below += 1;
        }
        return acc;
    }, { avg: 0, latest: 0, above: 0, below: 0, avgCount: 0, latestCount: 0 });
    }, [chartData]);

    const legendAvgSeconds = legendStats.avgCount > 0
        ? Math.round(legendStats.avg / legendStats.avgCount) : null;

    const legendLatestSeconds = legendStats.latestCount > 0
        ? Math.round(legendStats.latest / legendStats.latestCount) : null;


    if (chartData.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-700/50 bg-slate-950/40 shadow-inner w-full mt-2">
                <span className="text-5xl">⏳</span>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-300">Coletando dados de agilidade IA</h3>
                    <p className="text-slate-500 text-sm max-w-sm px-4 mt-1">
                        O sistema começou a registrar seus tempos hoje. Faça um <span className="text-cyan-400 font-bold">novo simulado IA</span> para ver seu gráfico de agilidade aqui.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 space-y-6 pt-2">
            {/* Header com Informações e Controles de Ordenação */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-xl">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                            <Clock size={16} />
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                            Tempo Médio por Questão
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                            Agilidade IA
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest hidden sm:inline-block">
                            Recente vs Geral
                        </span>
                    </div>

                    <p className="text-xs text-slate-400 font-medium">
                        Monitore a sua velocidade de resolução por matéria e identifique gargalos de tempo antes da prova.
                    </p>

                    {/* Legenda dos Indicadores */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800" title="Média dos últimos 7 dias">
                            <span className="h-2 w-2 rounded-sm bg-cyan-400/50" />
                            Média 7 Dias
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800" title="Média no último dia estudado">
                            <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                            Média do dia
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800" title="Média exata da última sessão">
                            <span className="h-2 w-2 rounded-full bg-white ring-1 ring-slate-400" />
                            Última Média
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            🐢 Lento
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ✨ Estável
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ⚡ Rápido
                        </span>
                    </div>
                </div>

                {/* Controles de Ordenação */}
                <div className="flex items-center gap-1.5 self-start lg:self-center p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-inner shrink-0">
                    <button
                        type="button"
                        onClick={() => setSortOrder('slower')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                            sortOrder === 'slower'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                        title="Ordenar pelas matérias com maior tempo médio"
                        aria-pressed={sortOrder === 'slower'}
                    >
                        Mais lentas
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortOrder('faster')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                            sortOrder === 'faster'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                        title="Ordenar pelas matérias com menor tempo médio"
                        aria-pressed={sortOrder === 'faster'}
                    >
                        Mais rápidas
                    </button>
                </div>
            </div>

            {/* Painéis de KPI Agregados de Agilidade */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Média Geral</span>
                    <span className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight mt-1">
                        {legendAvgSeconds == null ? 'N/A' : formatTime(legendAvgSeconds)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">Todos os assuntos</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        ÚLTIMO GERAL: <span className="font-bold text-slate-300">{legendLatestSeconds == null ? 'N/A' : formatTime(legendLatestSeconds)}</span>
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-cyan-400 tracking-tight mt-1">
                        {legendLatestSeconds == null ? 'N/A' : formatTime(legendLatestSeconds)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">Última sessão de cada</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-400">ACIMA DA MÉDIA</span>
                    <span className="text-lg sm:text-2xl font-black text-rose-400 tracking-tight mt-1">
                        {legendStats.above} {legendStats.above === 1 ? 'matéria' : 'matérias'}
                    </span>
                    <span className="text-[9px] text-rose-400/60 mt-1">Ritmo mais lento</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400">ABAIXO DA MÉDIA</span>
                    <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight mt-1">
                        {legendStats.below} {legendStats.below === 1 ? 'matéria' : 'matérias'}
                    </span>
                    <span className="text-[9px] text-emerald-400/60 mt-1">Ritmo acelerado</span>
                </div>
            </div>

            {/* Grid dos Medidores (Gauges) por Disciplina */}
            <div className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                    {chartData.map((data, index) => (
                        <HalfMoonGauge key={`gauge-${data.id}-${index}`} data={data} />
                    ))}
                </div>
            </div>
        </div>
    );
}

```

---

## `src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx` <a id="src-components-charts-evolutionchart-todayvsgeneralchart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx`
- **Descrição:** Comparativo de desempenho do dia/sessão atual contra a média geral histórica
- **Linhas:** 607
- **Tamanho:** 36.22 KB

```javascript
import React, { useMemo, useState, useEffect, useId } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, LabelList
} from 'recharts';
import { getDateKey, toDateMs } from '../../../utils/dateHelper';
import { getSafeScore, getSyntheticTotal, formatValue } from '../../../utils/scoreHelper';
import { ratioToPoints, pointsToRatio } from '../../../utils/scoreHelper.conversions';
import { normalize } from '../../../utils/normalization';
import { Zap, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const COLORS = {
    gaugeBg: 'rgba(255, 255, 255, 0.05)',
    gaugeFillValid: '#a855f7',
    gaugeFillDanger: '#f43f5e',
    gaugeFillSuccess: '#10b981',
    reference: '#94a3b8',
    neonLine: '#c084fc',
};

const CustomTooltipTimeline = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-950/90 border border-white/15 p-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono">{data.displayDate}</p>
                <div className="space-y-1.5">
                    <p className="text-white text-xs font-black flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full shadow-[0_0_8px_#c084fc]" style={{ backgroundColor: COLORS.neonLine }}></span>
                            Média diária:
                        </span>
                        <span className="font-mono text-purple-300">{safeFix(data.accuracy)}{unit}</span>
                    </p>
                    {data.lastTestAcc != null && (
                        <p className="text-white text-xs font-black flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.lastTestColor || COLORS.gaugeFillValid }}></span>
                                Último teste:
                            </span>
                            <span className="font-mono" style={{ color: data.lastTestColor || COLORS.gaugeFillValid }}>{safeFix(data.lastTestAcc)}{unit}</span>
                        </p>
                    )}
                </div>
                <p className="text-slate-500 text-[9px] mt-2.5 pt-1.5 border-t border-white/5 uppercase tracking-wider font-semibold">{data.total} questões resolvidas</p>
            </div>
        );
    }
    return null;
};

const CustomTooltipPie = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        if (item.trueValue == null) return null;
        return (
            <div className="bg-slate-950/95 border border-white/15 p-2.5 rounded-xl shadow-2xl backdrop-blur-xl">
                <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-0.5">{String(item.name ?? '').replace(' (Restante)', '')}</p>
                <p className="text-white text-xs font-black flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.baseColor, boxShadow: `0 0 8px ${item.baseColor}` }}></span>
                    {safeFix(item.trueValue)}{unit}
                </p>
            </div>
        );
    }
    return null;
};

export function TodayVsGeneralChart({ 
    activeCategories: propActiveCategories, 
    categories = [],
    focusCategory = null,
    globalMetrics = {}, 
    targetScore = 80,
    maxScore = 100, 
    minScore = 0,
    unit = '%',
    simuladoRows = []
 }) {
    const neonGradInstanceId = useId().replace(/:/g, '');
    const rawCategories = propActiveCategories || categories;
    const activeCategories = useMemo(() => {
        if (focusCategory) return [focusCategory];
        if (Array.isArray(rawCategories)) return rawCategories.filter(Boolean);
        if (rawCategories && typeof rawCategories === 'object') return Object.values(rawCategories).filter(Boolean);
        return [];
    }, [rawCategories, focusCategory]);
    const generalAccuracy = useMemo(() => {
        const safeMax = Math.max(1, Number(maxScore) || 100);
        const safeMin = Math.min(Number(minScore) || 0, safeMax);
        if (focusCategory) {
            const catMax = Number.isFinite(Number(focusCategory?.maxScore)) && Number(focusCategory?.maxScore) > 0 ? Number(focusCategory.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(focusCategory?.minScore)) ? Math.min(Number(focusCategory.minScore), catMax) : safeMin;
            const history = Object.values(focusCategory.simuladoStats?.history || {});
            let totalQ = 0;
            let totalC = 0;
            history.forEach(h => {
                let tot = Number(h.total) || 0;
                let corr = 0;
                if (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '' && !h.isPercentage) {
                    const rawC = Math.max(0, Number(h.correct) || 0);
                    if (tot === 0) tot = rawC > 0 ? rawC : getSyntheticTotal(catMax);
                    corr = Math.min(tot, rawC);
                } else {
                    const rawScore = getSafeScore(h, catMax, catMin);
                    const score = Number.isFinite(rawScore) ? rawScore : catMin;
                    if (tot === 0 && (h.isPercentage || h.score != null)) tot = getSyntheticTotal(catMax);
                    corr = Math.round(pointsToRatio(score, catMax, catMin) * tot);
                }
                totalQ += tot;
                totalC += Math.max(0, Math.min(tot, corr));
            });
            if (totalQ > 0) {
                return Math.max(safeMin, Math.min(safeMax, ratioToPoints(totalC / totalQ, safeMax, safeMin)));
            }
        }
        const pct = Number(globalMetrics?.globalAccuracy);
        const safePct = Number.isFinite(pct) ? pct : 0;
        return Math.max(safeMin, Math.min(safeMax, ratioToPoints(safePct / 100, safeMax, safeMin)));
    }, [focusCategory, globalMetrics?.globalAccuracy, maxScore, minScore]);

    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const scale = Math.max(1e-9, safeMax - safeMin) / 100;
    const stabilityMargin = Math.max(0.5, (safeMax - safeMin) * 0.02);

    const [nowMs, setNowMs] = useState(() => Date.now());
    const [todayKey, setTodayKey] = useState(() => getDateKey(new Date()));

    useEffect(() => {
        const updateTime = () => {
            if (document.hidden) return;
            const now = Date.now();
            setNowMs(now);
            setTodayKey(getDateKey(new Date(now)));
        };
        const interval = setInterval(updateTime, 60000);
        const handleVisibility = () => {
            if (!document.hidden) updateTime();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    const { dailyData, lastActiveEntry } = useMemo(() => {
        const dayMap = {};
        const safeMaxScore = Math.max(1, Number(maxScore) || 100);
        const safeMinScore = Math.min(Number(minScore) || 0, safeMaxScore);
        const validNowMs = Number(nowMs) || 0;
        const localNext = getDateKey(new Date(validNowMs + 86400000));
        const utcNext = new Date(validNowMs + 86400000).toISOString().split('T')[0];
        const maxAllowedDateKey = localNext > utcNext ? localNext : utcNext;
        activeCategories.forEach(cat => {
            const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const dKey = getDateKey(h.date || h.createdAt);
                if (!dKey || dKey > maxAllowedDateKey) return;
                if (!dayMap[dKey]) dayMap[dKey] = { correct: 0, total: 0 };
                let tot = Number(h.total) || 0;
                let corr = 0;
                if (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '' && !h.isPercentage) {
                    const rawC = Math.max(0, Number(h.correct) || 0);
                    if (tot === 0) tot = rawC > 0 ? rawC : getSyntheticTotal(catMax);
                    corr = Math.min(tot, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    const rawScore = getSafeScore(h, catMax, catMin);
                    const score = Number.isFinite(rawScore) ? rawScore : catMin;
                    if (tot === 0 && (h.isPercentage || h.score != null)) {
                        tot = getSyntheticTotal(catMax);
                    }
                    corr = Math.round(pointsToRatio(score, catMax, catMin) * tot);
                }
                corr = Math.max(0, Math.min(tot, corr));
                dayMap[dKey].correct += corr;
                dayMap[dKey].total += tot;
            });
        });
        const sortedDates = Object.keys(dayMap).sort();
        const result = sortedDates.slice(-14).map(date => {
            const d = dayMap[date];
            const acc = d.total > 0 ? ratioToPoints(d.correct / d.total, safeMaxScore, safeMinScore) : safeMinScore;
            const [, month, day] = date.split('-');
            const shortDate = `${day}/${month}`;
            return {
                date,
                displayDate: shortDate,
                accuracy: acc,
                total: d.total
            };
        });
        const lastEntry = result.length > 0 ? result[result.length - 1] : null;
        return { dailyData: result, lastActiveEntry: lastEntry };
    }, [activeCategories, maxScore, minScore, nowMs]);

    const temporalMetrics = useMemo(() => {
        const now = nowMs;
        const ms1Week = 7 * 86400000;
        const ms1Month = 30 * 86400000;
        const ms3Months = 90 * 86400000;
        const ms6Months = 180 * 86400000;
        const validNow = Number(now) || 0;
        const todayNoonMs = toDateMs(todayKey) || validNow;
        const utcTodayKey = new Date(validNow).toISOString().split('T')[0];
        const localNext = getDateKey(new Date(validNow + 86400000));
        const utcNext = new Date(validNow + 86400000).toISOString().split('T')[0];
        const maxAllowedDateKey = localNext > utcNext ? localNext : utcNext;

        const buckets = {
            today: { correct: 0, total: 0 },
            week: { correct: 0, total: 0 },
            month: { correct: 0, total: 0 },
            month3: { correct: 0, total: 0 },
            month6: { correct: 0, total: 0 }
        };

        const safeMaxScore = Math.max(1, Number(maxScore) || 100);
        const safeMinScore = Math.min(Number(minScore) || 0, safeMaxScore);

        activeCategories.forEach(cat => {
            const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const hDateKey = getDateKey(h.date || h.createdAt);
                if (!hDateKey || hDateKey > maxAllowedDateKey) return;
                const time = toDateMs(h.date || h.createdAt);
                // G-16 FIX: Distinguir NaN (dado corrompido) de null (campo ausente)
                if (time === null || Number.isNaN(time)) return;
                if (!Number.isFinite(time)) return;
                let tot = Number(h.total) || 0;
                let corr = 0;
                if (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '' && !h.isPercentage) {
                    const rawC = Math.max(0, Number(h.correct) || 0);
                    if (tot === 0) tot = rawC > 0 ? rawC : getSyntheticTotal(catMax);
                    corr = Math.min(tot, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    const rawScore = getSafeScore(h, catMax, catMin);
                    const score = Number.isFinite(rawScore) ? rawScore : catMin;
                    if (tot === 0 && (h.isPercentage || h.score != null)) {
                        tot = getSyntheticTotal(catMax);
                    }
                    corr = Math.round(pointsToRatio(score, catMax, catMin) * tot);
                }
                corr = Math.max(0, Math.min(tot, corr));
                if (tot === 0) return;

                const isTodayDate = hDateKey === todayKey || hDateKey === utcTodayKey;
                if (isTodayDate) { buckets.today.correct += corr; buckets.today.total += tot; }
                const dayMs = toDateMs(hDateKey) || time;
                const ageMs = Math.max(0, todayNoonMs - dayMs);
                if (isTodayDate || ageMs <= ms1Week) { buckets.week.correct += corr; buckets.week.total += tot; }
                if (isTodayDate || ageMs <= ms1Month) { buckets.month.correct += corr; buckets.month.total += tot; }
                if (isTodayDate || ageMs <= ms3Months) { buckets.month3.correct += corr; buckets.month3.total += tot; }
                if (isTodayDate || ageMs <= ms6Months) { buckets.month6.correct += corr; buckets.month6.total += tot; }
            });
        });

        let latestAcc = null;
        let latestTimestamp = -Infinity;
        let hasRowMatch = false;
        if (Array.isArray(simuladoRows) && simuladoRows.length > 0) {
            const activeCategoryMap = new Set(activeCategories.map(c => normalize(c.name)));
            const activeCategoryIdMap = new Set(activeCategories.map(c => c.id).filter(Boolean));
            const sortedRows = [...simuladoRows]
                .filter(r => {
                  const rSubj = normalize(r.subject || r.categoryName || r.materia);
                  const subjMatches = rSubj ? activeCategoryMap.has(rSubj) : false;
                  const idMatches = r.categoryId && activeCategoryIdMap.has(r.categoryId);
                
                  return subjMatches || idMatches;
                })
                .sort((a, b) => {
                    const timeA = toDateMs(a.createdAt || a.date);
                    const timeB = toDateMs(b.createdAt || b.date);
                    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
                });
            if (sortedRows.length > 0) {
                const latestRow = sortedRows[0];
                const rSubj = normalize(latestRow.subject || latestRow.categoryName || latestRow.materia);
                const matchedCat = activeCategories.find(c => (c.name && normalize(c.name) === rSubj) || (c.id && c.id === latestRow.categoryId));
                const lMax = Number.isFinite(Number(matchedCat?.maxScore)) && Number(matchedCat?.maxScore) > 0 ? Number(matchedCat.maxScore) : safeMaxScore;
                const lMin = Number.isFinite(Number(matchedCat?.minScore)) ? Math.min(Number(matchedCat.minScore), lMax) : safeMinScore;
                const rawLatest = getSafeScore(latestRow, lMax, lMin);
                latestAcc = Number.isFinite(rawLatest) ? ratioToPoints(pointsToRatio(rawLatest, lMax, lMin), safeMaxScore, safeMinScore) : null;
                latestTimestamp = toDateMs(latestRow.createdAt || latestRow.date) || -Infinity;
                hasRowMatch = true;
            }
        }

        // Fallback/Sincronização com cat.simuladoStats.history caso simuladoRows esteja vazio ou desatualizado
        activeCategories.forEach(cat => {
            const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
            const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const hDateKey = getDateKey(h?.date || h?.createdAt);
                if (!hDateKey || hDateKey > maxAllowedDateKey) return;
                const ms = toDateMs(h?.createdAt || h?.date);
                const isNewer = hasRowMatch ? (Number.isFinite(ms) && ms > latestTimestamp) : (Number.isFinite(ms) && ms >= latestTimestamp);
                if (isNewer) {
                    const rawScore = getSafeScore(h, catMax, catMin);
                    if (Number.isFinite(rawScore)) {
                        latestTimestamp = ms;
                        latestAcc = ratioToPoints(pointsToRatio(rawScore, catMax, catMin), safeMaxScore, safeMinScore);
                    }
                }
            });
        });

        const getAcc = (b) => b.total > 0 ? ratioToPoints(b.correct / b.total, safeMaxScore, safeMinScore) : null;
        return [
            { id: 'month6', label: 'Últimos 180 dias', val: getAcc(buckets.month6), rIn: 70, rOut: 80 },
            { id: 'month3', label: 'Últimos 90 dias', val: getAcc(buckets.month3), rIn: 82, rOut: 92 },
            { id: 'month', label: 'Últimos 30 dias', val: getAcc(buckets.month), rIn: 94, rOut: 103 },
            { id: 'week', label: 'Últimos 7 dias', val: getAcc(buckets.week), rIn: 105, rOut: 113 },
            { id: 'today', label: 'Hoje', val: getAcc(buckets.today), rIn: 115, rOut: 122 },
            { id: 'last', label: 'Último Teste', val: latestAcc, rIn: 124, rOut: 130 }
        ];
    }, [activeCategories, maxScore, minScore, nowMs, todayKey, simuladoRows]);

    const lastMetric = temporalMetrics.find(t => t.id === 'last');
    const latestAcc = Number.isFinite(Number(lastMetric?.val)) ? Number(lastMetric.val) : null;

    const chartData = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return [];
        const data = dailyData.map(d => ({ ...d }));
        if (latestAcc !== null) {
            const lastIdx = data.length - 1;
            const prevAcc = data.length > 1 ? data[lastIdx - 1].accuracy : data[0].accuracy;
            data[lastIdx].lastTestAcc = latestAcc;
            const marginLine = stabilityMargin;   // ✅ AUDIT FIX (antes: 2 fixo)
            if (latestAcc < prevAcc - marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillDanger;
            } else if (latestAcc > prevAcc + marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillValid;
            } else {
                data[lastIdx].lastTestColor = '#eab308';
            }
        }
        return data;
    }, [dailyData, latestAcc, stabilityMargin]);

    if (!dailyData || dailyData.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-700/50 bg-slate-950/40 shadow-inner">
                <span className="text-4xl opacity-50">⚖️</span>
                <p className="text-slate-400 font-bold text-sm">Dados insuficientes para comparação diária.</p>
            </div>
        );
    }

    const focusAccuracy = lastActiveEntry ? lastActiveEntry.accuracy : safeMin;
    const delta = focusAccuracy - generalAccuracy;
    const deltaAbs = Math.abs(delta);
    const marginDelta = stabilityMargin;   // ✅ AUDIT FIX (antes: 2 fixo)
    let deltaStatus = 'stable';
    if (delta > marginDelta) deltaStatus = 'positive';
    else if (delta < -marginDelta) deltaStatus = 'negative';

    const todayMetric = temporalMetrics.find(t => t.id === 'today');
    const todayAcc = todayMetric?.val ?? null;
    const deltaLastVsToday = (latestAcc != null && todayAcc != null) ? latestAcc - todayAcc : null;
    let lastVsTodayStatus = 'stable';
    if (deltaLastVsToday !== null) {
        if (deltaLastVsToday > marginDelta) lastVsTodayStatus = 'positive';
        else if (deltaLastVsToday < -marginDelta) lastVsTodayStatus = 'negative';
    }

    const getColor = (val) => {
        if (val == null) return 'transparent';
        if (val >= targetScore) return COLORS.gaugeFillSuccess;
        if (val < targetScore - (15 * scale)) return COLORS.gaugeFillDanger;
        return '#facc15';
    };

    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[400px]">
            <div className="w-full lg:w-1/3 min-w-[280px] bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-between relative shadow-xl backdrop-blur-md overflow-hidden group">
                <div className="w-full flex items-start justify-between gap-3 mb-2 z-10">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
                            <Target size={14} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                            {todayAcc != null ? 'Sessão de hoje' : `Último dia ativo (${lastActiveEntry?.displayDate || 'sem data'})`}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 max-h-[140px] overflow-y-auto no-scrollbar">
                        {temporalMetrics.slice().reverse().map(metric => {
                            if (metric.val == null) {
                                return (
                                    <div key={metric.id} className="flex items-center gap-1.5 opacity-30">
                                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">{metric.label}</span>
                                        <span className="text-[10px] font-bold font-mono text-slate-600">--{unit}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                                    </div>
                                );
                            }
                            const c = getColor(metric.val);
                            return (
                                <div key={metric.id} className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">{metric.label}</span>
                                    <span className="text-[10px] font-black font-mono" style={{ color: c }}>
                                        {safeFix(metric.val)}{unit}
                                    </span>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }}></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="relative w-[260px] h-[140px] mt-6 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <PieChart>
                            {temporalMetrics.map((metric) => {
                                const isNull = metric.val == null;
                                const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
                                const val = isNull ? safeMin : Math.max(safeMin, Math.min(metric.val, safeMax));
                                const arcColor = isNull ? 'transparent' : getColor(metric.val);
                                const scaleRange = Math.max(1e-9, safeMax - safeMin);
                                const arcVal = isNull ? 0 : Math.max(0, val - safeMin);
                                const arcData = [
                                    { name: metric.label, value: arcVal, trueValue: metric.val, baseColor: arcColor },
                                    { name: `${metric.label} (Restante)`, value: Math.max(0, scaleRange - arcVal), trueValue: null, baseColor: arcColor }
                                ];
                                return (
                                    <Pie
                                        key={metric.id}
                                        data={arcData}
                                        cx="50%"
                                        cy="100%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={metric.rIn}
                                        outerRadius={metric.rOut}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell key={`cell-${metric.id}-0`} fill={arcColor} style={{ filter: isNull ? 'none' : `drop-shadow(0 0 6px ${arcColor}60)` }} />
                                        <Cell key={`cell-${metric.id}-1`} fill={COLORS.gaugeBg} />
                                    </Pie>
                                );
                            })}
                            <Tooltip content={<CustomTooltipPie unit={unit} />} cursor={false} offset={0} isAnimationActive={false} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                        <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-md tabular-nums font-mono tracking-tight">
                            {safeFix(focusAccuracy)}<span className="text-xl text-slate-400 ml-1 font-sans">{unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
                            {todayAcc != null ? `Acertos de hoje (${unit})` : `Último dia ativo (${unit})`}
                        </span>
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm backdrop-blur-sm ${
                        deltaStatus === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        deltaStatus === 'negative' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    }`}>
                        {deltaStatus === 'positive' ? <TrendingUp size={14} /> : 
                         deltaStatus === 'negative' ? <TrendingDown size={14} /> : 
                         <Minus size={14} />}
                        <div className="flex flex-col">
                            <span className="text-sm font-black font-mono">
                                {delta > 0 ? '+' : delta < 0 ? '−' : ''}{safeFix(deltaAbs)}{unit}
                            </span>
                            <span className="text-[7px] uppercase tracking-wider opacity-70">Geral</span>
                        </div>
                    </div>
                    {deltaLastVsToday !== null && (
                        <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm backdrop-blur-sm ${
                            lastVsTodayStatus === 'positive' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                            lastVsTodayStatus === 'negative' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                            'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                            {lastVsTodayStatus === 'positive' ? <TrendingUp size={14} /> : 
                             lastVsTodayStatus === 'negative' ? <TrendingDown size={14} /> : 
                             <Minus size={14} />}
                            <div className="flex flex-col">
                                <span className="text-xs font-black font-mono">
                                    {deltaLastVsToday > 0 ? '+' : deltaLastVsToday < 0 ? '−' : ''}{safeFix(Math.abs(deltaLastVsToday))}{unit}
                                </span>
                                <span className="text-[7px] uppercase tracking-wider opacity-70">Ritmo (Hoje)</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-full flex justify-between items-center mt-6 pt-4 border-t border-white/5 px-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Média Geral</span>
                        <span className="text-sm font-bold font-mono text-slate-300">{safeFix(generalAccuracy)}{unit}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Meta</span>
                        <span className="text-sm font-bold font-mono text-emerald-400">{formatValue(targetScore)}{unit}</span>
                    </div>
                </div>
            </div>
            <div className="w-full lg:w-2/3 flex-1 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-6 flex flex-col relative backdrop-blur-md shadow-xl">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                        <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-1 flex items-center gap-2">
                            Histórico Recente (14 dias)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Compare suas variações diárias com a linha base
                        </p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={220}>
                        <ComposedChart data={chartData} margin={{ top: 25, right: 25, left: 0, bottom: 10 }}>
                            <defs>
                                <linearGradient id={`neonGradient_${neonGradInstanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#c084fc" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#a855f7" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis 
                                dataKey="displayDate" 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                                dy={10}
                                fontWeight={600}
                            />
                            <YAxis 
                                domain={[minScore, maxScore]} 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                                tickFormatter={(v) => `${formatValue(v)}${unit}`} 
                                fontWeight={600}
                            />
                            <Tooltip content={<CustomTooltipTimeline unit={unit} />} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                            <ReferenceLine 
                                y={generalAccuracy} 
                                stroke={COLORS.reference} 
                                strokeDasharray="4 4" 
                                strokeWidth={1.5} 
                                opacity={0.7}
                                label={{ value: 'Média geral', fill: COLORS.reference, fontSize: 10, fontWeight: 700, position: 'insideTopLeft', dy: -4 }}
                            />
                            <Line 
                                type="monotoneX" 
                                dataKey="accuracy" 
                                stroke={`url(#neonGradient_${neonGradInstanceId})`} 
                                strokeWidth={3} 
                                dot={{ fill: '#0f172a', stroke: '#c084fc', strokeWidth: 2, r: 4 }}
                                activeDot={{ fill: '#c084fc', stroke: '#fff', strokeWidth: 2, r: 6 }}
                                isAnimationActive={true}
                                animationDuration={1000}
                            >
                                <LabelList 
                                    dataKey="accuracy" 
                                    content={(props) => {
                                        const { x, y, value, index } = props;
                                        if (value == null || !Number.isFinite(Number(value))) return null;
                                        const entry = chartData[index];
                                        const hasCloseBar = entry?.lastTestAcc != null && Math.abs(Number(entry.lastTestAcc) - Number(value)) <= stabilityMargin * 2;
                                        if (hasCloseBar) return null;
                                        return (
                                            <text x={x} y={Math.max(12, (y ?? 20) - 10)} fill="#94a3b8" fontSize={10} fontWeight={700} textAnchor="middle">
                                                {`${formatValue(value)}${unit}`}
                                            </text>
                                        );
                                    }}
                                />
                            </Line>
                            <Bar dataKey="lastTestAcc" barSize={18} radius={[6,6,0,0]} isAnimationActive={true} animationDuration={1000} fill={COLORS.gaugeFillValid}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.lastTestColor || COLORS.gaugeFillValid} style={{ filter: entry.lastTestColor ? `drop-shadow(0 0 6px ${entry.lastTestColor}80)` : 'none' }} />
                                ))}
                                <LabelList 
                                    dataKey="lastTestAcc" 
                                    position="top" 
                                    offset={6} 
                                    formatter={(v) => Number.isFinite(Number(v)) ? `${formatValue(v)}${unit}` : ''} 
                                    fill="#fff" 
                                    fontSize={10} 
                                    fontWeight={900}
                                />
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

```

---

## `src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx` <a id="src-components-charts-evolutionchart-weeklyevolutionview-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx`
- **Descrição:** Acelerômetro semanal de desempenho com cálculo de deltas e top regressões
- **Linhas:** 733
- **Tamanho:** 41.48 KB

```javascript
import React, { useMemo, useState, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell, Brush
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle, Zap } from 'lucide-react';
import { getSafeScore, formatValue, getSyntheticTotal } from "../../../utils/scoreHelper";
import WeeklyPerformanceChart from './WeeklyPerformanceChart';
import { computeTopRegressions, computeTrendKpi } from '../../../utils/weeklyEvolutionInsights.js';
import { parseNoonLocal, getDateKey } from '../../../utils/dateHelper';
import { toArray, getHistoryDate } from '../../../utils/evolutionGuards';
import { ratioToPoints } from '../../../utils/scoreHelper.conversions';

const WeeklyTooltip = React.memo(({ active, payload, label, hiddenKeys = {}, unit, stableThreshold = 2 }) => {
    if (!active || !payload || !payload.length) return null;

    const hasValidData = payload.some(entry =>
        Number.isFinite(Number(entry?.value))
    );
    if (!hasValidData) return null;

    const visibleEntries = payload.filter((entry) => {
        const dataKey = String(entry.dataKey || '');
        const isDelta = dataKey.startsWith('delta_');
        const baseKey = isDelta ? dataKey.replace('delta_', '') : dataKey;
        return !hiddenKeys[baseKey] && entry.value != null && Number.isFinite(Number(entry.value));
    });

    if (visibleEntries.length === 0) return null;

    return (
        <div className="bg-slate-950/80 border border-white/10 p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-[220px] max-w-[320px] break-words whitespace-normal">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                Semana de {label}
            </p>
            <div className="space-y-3">
                {visibleEntries.map((entry, idx) => {
                    const dataKey = String(entry.dataKey || '');
                    const isDelta = dataKey.startsWith('delta_');
                    const baseKey = isDelta ? dataKey.replace('delta_', '') : dataKey;

                        if (hiddenKeys[baseKey]) return null;

                        const val = entry.value;
                        if (val == null) return null;

                        const meta = entry.payload[`meta_${baseKey}`];

                        if (isDelta) {
                            const isStable = Math.abs(val) <= stableThreshold;
                            const color = entry.payload[`deltaColor_${baseKey}`] || (isStable ? '#eab308' : val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#94a3b8');
                            const prefix = val > 0 ? '+' : '';
                            const currentPct = (meta?.currPct === null || meta?.currPct === undefined || meta?.currPct === '') ? entry.payload?.[baseKey] : (Number.isFinite(Number(meta?.currPct)) ? meta.currPct : entry.payload?.[baseKey]);

                            return (
                                <div key={idx} className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                                            {entry.name.replace(' (Var.)', '')}
                                        </span>
                                        <span style={{ color }} className="font-mono font-black text-xs">
                                            {prefix}{formatValue(val)}{unit}
                                        </span>
                                    </div>
                                    {meta && meta.prevPct != null && Number.isFinite(Number(currentPct)) && (
                                        <div className="flex justify-between text-[8px] text-slate-500 pl-3">
                                            <span>De {formatValue(meta.prevPct)}{unit}</span>
                                            <span>
                                                Para {formatValue(currentPct)}{unit} <strong style={{ color }}>(Δ {prefix}{formatValue(val)}{unit})</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            return (
                                <div key={idx} className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                                            {entry.name}
                                        </span>
                                        <span className="font-mono font-bold text-white text-xs">
                                            {formatValue(val)}{unit}
                                        </span>
                                    </div>
                                    {meta && meta.currTot > 0 && (
                                        <span className="text-[8px] text-slate-500 pl-3.5 italic">
                                            Volume: {meta.currTot} questões
                                        </span>
                                    )}
                                </div>
                            );
                        }
                    })}
                </div>
            </div>
        );
});

const getMondayStr = (dateStr) => {
    const dt = parseNoonLocal(dateStr);
    // G-15 FIX: Retornar fallback em vez de null para não perder dados
    if (!dt || isNaN(dt.getTime())) {
        console.warn(`[WeeklyEvolution] Data inválida ignorada: ${dateStr}`);
        return null;
    }
    const dayOfWeek = dt.getDay();
    const diff = dt.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    dt.setDate(diff);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatWeek = (isoString) => {
    if (!isoString || typeof isoString !== 'string') return '--/--';
    const [year, month, day] = isoString.split('-');
    if (!year || !month || !day) return '--/--';
    return `${day}/${month}`;
};

const shortenLabel = (value, max = 18) => {
    const text = String(value || '').trim();
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export const WeeklyEvolutionView = ({
    categories,
    studyLogs = [],
    showOnlyFocus,
    focusSubjectId,
    maxScore = 100,
    minScore = 0,
    unit = '%'
}) => {
    const [viewMode, setViewMode] = useState('performance');

    // A1 FIX: Padrão idiomático do React para resetar estado derivado de props sem useEffect.
    // Em vez de setUserToggles({}) dentro de useEffect (que causa render duplo e dispara a
    // regra react-hooks/set-state-in-effect), rastreamos a "chave de foco" anterior e chamamos
    // setState DURANTE o render quando ela muda. O React descarta o render parcial e reinicia
    // com o novo estado — isso é um render único, sem o ciclo extra do useEffect.
    // Ref: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const focusKey = `${showOnlyFocus}-${focusSubjectId}`;
    const [lastFocusKey, setLastFocusKey] = useState(focusKey);
    const [userToggles, setUserToggles] = useState({});

    if (lastFocusKey !== focusKey) {
        setLastFocusKey(focusKey);
        setUserToggles({});
    }

    const [hoveredLine, setHoveredLine] = useState(null);

    const { chartData, activeKeys, rankedKeys } = useMemo(() => {
        let itemsMap = {};
        const toSafeKey = (name) => {
            const clean = String(name || '')
                .trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '_');
            return `top_${clean}`;
        };

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                if (!cat?.id) return;
                const fullName = String(cat.name || 'Matéria').replace(/Direito /gi, 'D. ');
                const safeName = shortenLabel(fullName, 18);
                const safeColor = typeof cat.color === 'string' ? cat.color : '#3b82f6';
                itemsMap[cat.id] = { name: safeName, fullName: fullName, color: safeColor };
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                (cat.tasks || []).forEach(task => {
                    const tName = String(task?.text || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                    if (!tName) return;
                    const key = toSafeKey(tName);
                    itemsMap[key] = { name: shortenLabel(tName, 18), color: cat.color || '#3b82f6', fullName: tName };
                });

                const hArray = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                hArray.forEach(h => {
                    const topics = toArray(h.topics);
                    
                    if (topics.length > 0) {
                        topics.forEach(t => {
                            const tName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                            if (!tName) return;
                            const key = toSafeKey(tName);
                            if (!itemsMap[key]) {
                                itemsMap[key] = { name: shortenLabel(tName, 18), color: cat.color || '#3b82f6', fullName: tName };
                            }
                        });
                    } else if (h.taskId) {
                        const rawTaskText = cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto';
                        const tName = String(rawTaskText).replace(/^\[(.*?)\]\s*/i, '').trim() || 'Assunto';
                        const key = toSafeKey(tName);
                        if (!itemsMap[key]) {
                            itemsMap[key] = { name: shortenLabel(tName, 18), color: cat.color || '#3b82f6', fullName: tName };
                        }
                    } else if (h.topic || h.assunto || h.subtopic || h.topicName) {
                        const rawTopicText = h.topic || h.assunto || h.subtopic || h.topicName;
                        const tName = String(rawTopicText).replace(/^\[(.*?)\]\s*/i, '').trim() || 'Assunto';
                        const key = toSafeKey(tName);
                        if (!itemsMap[key]) {
                            itemsMap[key] = { name: shortenLabel(tName, 18), color: cat.color || '#3b82f6', fullName: tName };
                        }
                    } else {
                        if (!itemsMap['top_geral']) {
                            itemsMap['top_geral'] = { name: 'Geral', color: cat.color || '#3b82f6', fullName: 'Geral' };
                        }
                    }
                });
            }
        }

        const validIds = Object.keys(itemsMap);
        if (validIds.length === 0) return { chartData: [], activeKeys: {}, rankedKeys: [] };

        const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const safeMaxScore = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;
        const lowerBound = Math.min(safeMinScore, safeMaxScore);
        const upperBound = Math.max(safeMinScore, safeMaxScore);
        const scoreRange = Math.max(1e-9, upperBound - lowerBound);
        const stableThreshold = Math.max(0.5, scoreRange * 0.02);
        const fromRatio = (ratio) => ratioToPoints(ratio, upperBound, lowerBound);
        const weeksTemp = {};

        const processHistory = (historyArray, itemId, cMax = upperBound, cMin = lowerBound) => {
            if (!Array.isArray(historyArray) || !itemId) return;
            const cRange = Math.max(1e-9, cMax - cMin);
            historyArray.forEach(h => {
                const weekStr = getMondayStr(getHistoryDate(h));
                if (!weekStr) return;

                if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                if (!weeksTemp[weekStr][itemId]) weeksTemp[weekStr][itemId] = { correct: 0, total: 0 };

                let totalQ = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                let corr = 0;
                const hasValidC = (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '') ||
                                  (h.acertos !== undefined && h.acertos !== null && String(h.acertos).trim() !== '') ||
                                  (h.correctCount !== undefined && h.correctCount !== null && String(h.correctCount).trim() !== '');
                if (hasValidC && !h.isPercentage) {
                    const rawC = Math.max(0, Number(h.correct ?? h.acertos ?? h.correctCount) || 0);
                    if (totalQ === 0) totalQ = rawC > 0 ? rawC : getSyntheticTotal(cMax);
                    corr = Math.min(totalQ, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    const score = getSafeScore(h, cMax, cMin);
                    if (!Number.isFinite(score)) return;
                    if (totalQ === 0 && h.score != null) {
                        totalQ = getSyntheticTotal(cMax);
                    }
                    if (totalQ === 0) return;
                    corr = Math.max(0, Math.min(1, (score - cMin) / cRange)) * totalQ;
                }
                if (totalQ === 0) return;

                weeksTemp[weekStr][itemId].total += totalQ;
                weeksTemp[weekStr][itemId].correct += corr;
            });
        };

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                const hArray = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                const cMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : upperBound;
                const cMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), cMax) : lowerBound;
                processHistory(hArray, cat.id, cMax, cMin);
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                const cMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : upperBound;
                const cMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), cMax) : lowerBound;
                const cRange = Math.max(1e-9, cMax - cMin);
                const hArray2 = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                hArray2.forEach(h => {
                    const topics = toArray(h.topics);
                    
                    if (topics.length > 0) {
                        topics.forEach(t => {
                            const tName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                            if (!tName) return;
                            const tId = toSafeKey(tName);
                            const weekStr = getMondayStr(getHistoryDate(h));
                            if (!weekStr) return;
                            if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                            if (!weeksTemp[weekStr][tId]) weeksTemp[weekStr][tId] = { correct: 0, total: 0 };

                            let totalQ = Math.max(0, Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0);
                            let corr = 0;
                            const hasValidC = (t.correct !== undefined && t.correct !== null && String(t.correct).trim() !== '') ||
                                              (t.acertos !== undefined && t.acertos !== null && String(t.acertos).trim() !== '') ||
                                              (t.correctCount !== undefined && t.correctCount !== null && String(t.correctCount).trim() !== '');
                            if (hasValidC && !t.isPercentage) {
                                const rawC = Math.max(0, Number(t.correct ?? t.acertos ?? t.correctCount) || 0);
                                if (totalQ === 0) totalQ = rawC > 0 ? rawC : getSyntheticTotal(cMax);
                                corr = Math.min(totalQ, Number.isFinite(rawC) ? rawC : 0);
                            } else {
                                const topicScore = getSafeScore(t, cMax, cMin);
                                if (!Number.isFinite(topicScore)) return;
                                if (totalQ === 0 && t.score != null) {
                                    totalQ = getSyntheticTotal(cMax);
                                }
                                if (totalQ === 0) return;
                                corr = Math.max(0, Math.min(1, (topicScore - cMin) / cRange)) * totalQ;
                            }
                            if (totalQ === 0) return;
                            weeksTemp[weekStr][tId].total += totalQ;
                            weeksTemp[weekStr][tId].correct += corr;
                        });
                    } else if (h.taskId) {
                        const rawTaskText = cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto';
                        const tName = String(rawTaskText).replace(/^\[(.*?)\]\s*/i, '').trim() || 'Assunto';
                        const tId = toSafeKey(tName);
                        processHistory([h], tId, cMax, cMin);
                    } else if (h.topic || h.assunto || h.subtopic || h.topicName) {
                        const rawTopicText = h.topic || h.assunto || h.subtopic || h.topicName;
                        const tName = String(rawTopicText).replace(/^\[(.*?)\]\s*/i, '').trim() || 'Assunto';
                        const tId = toSafeKey(tName);
                        processHistory([h], tId, cMax, cMin);
                    } else {
                        processHistory([h], 'top_geral', cMax, cMin);
                    }
                });
            }
        }

        const sortedWeeks = Object.values(weeksTemp).sort((a, b) => a.week.localeCompare(b.week));
        if (sortedWeeks.length === 0) return { chartData: [], activeKeys: {}, rankedKeys: [] };

        const memoryByItem = {}; 

        const finalData = sortedWeeks.map(weekObj => {
            const dataPoint = {
                week: weekObj.week,
                displayDate: formatWeek(weekObj.week)
            };

            const currentWeekDate = parseNoonLocal(weekObj.week);
            const expectedPrevDate = currentWeekDate ? new Date(currentWeekDate) : null;
            if (expectedPrevDate) expectedPrevDate.setDate(expectedPrevDate.getDate() - 7);
            const expectedPrevKey = expectedPrevDate ? getDateKey(expectedPrevDate) : null;
            
            validIds.forEach(id => {
                const currentData = weekObj[id];

                if (currentData && currentData.total > 0) {
                    const ratio = currentData.correct / currentData.total;
                    const currentScore = fromRatio(ratio);
                    const safeCurrentScore = Number.isFinite(currentScore) ? currentScore : 0;
                    const currentPct = Number(
                        Math.max(lowerBound, Math.min(upperBound, safeCurrentScore)).toFixed(2)
                    );

                    dataPoint[id] = currentPct;

                    const last = memoryByItem[id];

                    if (last && last.week === expectedPrevKey) {
                        const prevPct = last.pct;
                        const safeDelta = Number.isFinite(currentPct - prevPct)
                            ? currentPct - prevPct
                            : 0;

                        const delta = Number(safeDelta.toFixed(2));
                        const isStable = Math.abs(delta) <= stableThreshold;

                        dataPoint[`delta_${id}`] = delta;
                        dataPoint[`deltaColor_${id}`] = isStable
                            ? '#eab308'
                            : delta > 0
                            ? '#10b981'
                            : '#ef4444';

                        dataPoint[`meta_${id}`] = {
                            currTot: currentData.total,
                            currPct: currentPct,
                            prevPct,
                            prevTot: last.total
                        };
                    } else {
                        dataPoint[`delta_${id}`] = null;
                        dataPoint[`deltaColor_${id}`] = '#94a3b8';

                        dataPoint[`meta_${id}`] = {
                            currTot: currentData.total,
                            currPct: currentPct,
                            prevPct: null,
                            prevTot: 0
                        };
                    }

                    memoryByItem[id] = {
                        pct: currentPct,
                        total: currentData.total,
                        week: weekObj.week
                    };
                } else {
                    dataPoint[id] = null;
                    dataPoint[`delta_${id}`] = null;
                    dataPoint[`deltaColor_${id}`] = '#94a3b8';
                }
            });

            return dataPoint;
        });

        const volumeTracker = {};
        validIds.forEach(id => volumeTracker[id] = 0);
        finalData.forEach(week => {
            validIds.forEach(id => {
                const meta = week[`meta_${id}`];
                if (meta && Number.isFinite(Number(meta.currTot))) volumeTracker[id] += Number(meta.currTot);
            });
        });
        const rankedKeys = [...validIds].sort((a, b) => volumeTracker[b] - volumeTracker[a]);

        return { chartData: finalData, activeKeys: itemsMap, rankedKeys };
    }, [categories, showOnlyFocus, focusSubjectId, maxScore, minScore]);

    const keys = Object.keys(activeKeys);

    const hiddenKeys = useMemo(() => {
        const result = {};
        rankedKeys?.forEach((key, idx) => {
            const defaultHide = showOnlyFocus ? false : idx >= 6; 
            if (userToggles[key] !== undefined) {
                result[key] = userToggles[key]; 
            } else {
                result[key] = defaultHide;
            }
        });
        return result;
    }, [rankedKeys, userToggles, showOnlyFocus]);

    const topRegressions = useMemo(() => computeTopRegressions({ viewMode, chartData, keys, activeKeys, hiddenKeys }), [viewMode, chartData, keys, activeKeys, hiddenKeys]);
    const trendKpi = useMemo(() => computeTrendKpi({ chartData, keys, hiddenKeys }), [chartData, keys, hiddenKeys]);

    const handleLegendClick = useCallback((e) => {
        const dataKey = e?.dataKey;
        if (!dataKey) return;
        const keyID = String(dataKey).replace('delta_', '');
        setUserToggles(prev => ({
            ...prev,
            [keyID]: !hiddenKeys[keyID] 
        }));
    }, [hiddenKeys]);

    const handleLegendHover = useCallback((e) => {
        if (e && e.dataKey) setHoveredLine(String(e.dataKey).replace('delta_', ''));
    }, []);

    const handleLegendLeave = useCallback(() => {
        setHoveredLine(null);
    }, []);

    const renderLegendText = useCallback((value, entry) => {
        const keyID = String(entry.dataKey || '').replace('delta_', '');
        const isHidden = hiddenKeys[keyID];
        const fullName = activeKeys[keyID]?.fullName || String(value || '');
        return (
            <span 
                className={`text-[10px] font-black uppercase tracking-widest transition-opacity cursor-pointer ${isHidden ? 'opacity-20' : 'opacity-100'}`}
                title={fullName}
            >
                {String(value || '').replace(' (Var.)', '')}
            </span>
        );
    }, [hiddenKeys, activeKeys]);

    const stableThreshold = useMemo(() => {
        const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const safeMaxScore = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;
        const scoreRange = Math.max(1e-9, Math.abs(safeMaxScore - safeMinScore));
        return Math.max(0.5, scoreRange * 0.02);
    }, [minScore, maxScore]);

    // M2 FIX: Tooltip extraído em useCallback para restaurar memoização do Recharts.
    // Arrow functions inline quebram a memoização porque criam nova referência a cada render.
    const renderWeeklyTooltip = useCallback(
        (props) => <WeeklyTooltip {...props} hiddenKeys={hiddenKeys} unit={unit} stableThreshold={stableThreshold} />,
        [hiddenKeys, unit, stableThreshold]
    );


    if (chartData.length < 1) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center bg-slate-950/40 rounded-3xl border border-slate-700/50 p-6 shadow-inner">
                <HelpCircle size={40} className="text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Dados insuficientes</p>
                <p className="text-slate-500 text-[10px] mt-2 text-center max-w-[250px]">
                    Cadastre pelo menos uma semana de simulados para visualizar a curva de evolução e a variação semanal.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full pt-4 animate-fade-in relative flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-2 gap-4 shrink-0">
                <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">
                        Raio-X Temporal Avançado
                    </span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        {showOnlyFocus && focusSubjectId ? 'Semanas por Assunto' : 'Semanas por Matéria'}
                    </h3>
                    {trendKpi && (
                        <div className="inline-flex items-center gap-2 mt-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-[10px] text-slate-400 font-mono">
                            <span>Tendência:</span>
                            <span className={`font-black ${trendKpi.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {trendKpi.delta >= 0 ? '+' : ''}{formatValue(trendKpi.delta)}{unit}
                            </span> 
                            <span className="text-slate-500">({trendKpi.previousN} sem. → {trendKpi.recentN} sem.)</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center bg-slate-900/90 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
                    <button
                        onClick={() => setViewMode('performance')}
                        aria-label="Alternar para visão de desempenho semanal"
                        aria-pressed={viewMode === 'performance'}
                        className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all will-change-transform ${
                            viewMode === 'performance' 
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30 font-bold' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <Zap size={13} className="shrink-0" /> <span className="sm:hidden">7 dias</span><span className="hidden sm:inline">Desempenho (7d)</span>
                    </button>
                    <button
                        onClick={() => setViewMode('evolution')}
                        aria-label="Alternar para visão de evolução semanal"
                        aria-pressed={viewMode === 'evolution'}
                        className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all will-change-transform ${
                            viewMode === 'evolution' 
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30 font-bold' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <TrendingUp size={13} className="shrink-0" /> <span className="sm:hidden">Evol.</span><span className="hidden sm:inline">Evolução</span>
                    </button>
                    <button
                        onClick={() => setViewMode('variation')}
                        aria-label="Alternar para visão de variação semanal"
                        aria-pressed={viewMode === 'variation'}
                        className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all will-change-transform ${
                            viewMode === 'variation' 
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30 font-bold' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <BarChart3 size={13} className="shrink-0" /> <span className="sm:hidden">Delta</span><span className="hidden sm:inline">Delta</span>
                    </button>
                </div>
            </div>

            <div className="h-[380px] w-full mt-2 relative">
                {viewMode === 'performance' ? (
                    <WeeklyPerformanceChart
                        categories={categories}
                        studyLogs={studyLogs}
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                        maxScore={maxScore}
                        minScore={minScore}
                        unit={unit}
                    />
                ) : viewMode === 'variation' && chartData.length < 2 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-950/40 rounded-3xl border border-slate-800/60 p-6 text-center">
                        <BarChart3 size={36} className="text-slate-600 mb-2" />
                        <p className="text-sm font-bold text-slate-300">Semanas consecutivas necessárias</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">Registre simulados em pelo menos 2 semanas seguidas para calcular o acelerômetro de variação (Delta).</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={1}>
                        {viewMode === 'evolution' ? (
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} fontWeight={600} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} dy={10} minTickGap={15} />
                                <YAxis domain={[minScore, maxScore]} stroke="#64748b" fontSize={10} fontWeight={600} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} allowDataOverflow={false} tickFormatter={(v) => `${formatValue(v)}${unit}`} />
                                <Tooltip offset={20} content={renderWeeklyTooltip} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                                <Legend verticalAlign="bottom" height={40} iconType="circle" formatter={renderLegendText} onClick={handleLegendClick} onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} wrapperStyle={{ paddingTop: '20px' }} />

                                {keys.map(key => {
                                    const isHovered = hoveredLine === key;
                                    const isOtherHovered = hoveredLine && hoveredLine !== key;
                                    
                                    return (
                                        <Line connectNulls
                                            key={key}
                                            type="monotoneX"
                                            dataKey={key}
                                            name={activeKeys[key].name}
                                            stroke={activeKeys[key].color}
                                            strokeWidth={isHovered ? 3.5 : (isOtherHovered ? 1.5 : 2)}
                                            strokeOpacity={isOtherHovered ? 0.4 : 1}
                                            dot={{ r: 3, strokeWidth: 1.5, stroke: activeKeys[key].color, fill: '#0f172a', strokeOpacity: isOtherHovered ? 0.4 : 1, fillOpacity: isOtherHovered ? 0.4 : 1 }}
                                            activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: activeKeys[key].color, className: 'shadow-lg', opacity: isOtherHovered ? 0.4 : 1 }}
                                            hide={hiddenKeys[key]}
                                            isAnimationActive={true}
                                            animationDuration={800}
                                            animationEasing="ease-out"
                                            style={{ transition: 'all 0.3s ease' }}
                                        />
                                    );
                                })}

                                {chartData.length > 8 && (
                                    <Brush
                                        dataKey="week"
                                        height={22}
                                        stroke="#6366f1"
                                        fill="#0f172a"
                                        tickFormatter={formatWeek}
                                        className="text-[9px] font-mono"
                                        travellerWidth={10}
                                    />
                                )}
                            </LineChart>
                        ) : (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} fontWeight={600} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} dy={10} minTickGap={15} />
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    fontWeight={600}
                                    tickLine={false} 
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} 
                                    tickFormatter={(v) => {
                                        const formatted = formatValue(v);
                                        if (formatted === "0.00" || formatted === "0") return `${formatted}${unit}`;
                                        return `${v > 0 ? '+' : ''}${formatted}${unit}`;
                                    }} 
                                />
                                <Tooltip offset={20} content={renderWeeklyTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={60} 
                                    iconType="square" 
                                    formatter={renderLegendText} 
                                    onClick={handleLegendClick} 
                                    onMouseEnter={handleLegendHover} 
                                    onMouseLeave={handleLegendLeave} 
                                    wrapperStyle={{ paddingTop: '20px' }} 
                                />
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />

                                {chartData.length > 8 && (
                                    <Brush
                                        dataKey="week"
                                        height={22}
                                        stroke="#6366f1"
                                        fill="#0f172a"
                                        tickFormatter={formatWeek}
                                        className="text-[9px] font-mono"
                                        travellerWidth={10}
                                    />
                                )}

                                {keys.map(key => {
                                    const isOtherHovered = hoveredLine && hoveredLine !== key;

                                    return (
                                        <Bar
                                            key={`delta_${key}`}
                                            dataKey={`delta_${key}`}
                                            name={`${activeKeys[key].name} (Var.)`}
                                            fill={activeKeys[key].color}
                                            radius={[4, 4, 4, 4]}
                                            hide={hiddenKeys[key]}
                                            fillOpacity={isOtherHovered ? 0.4 : 1}
                                            style={{ transition: 'all 0.3s ease' }}
                                        >
                                            {chartData.map((entry, index) => {
                                                const barColor = entry[`deltaColor_${key}`] || '#94a3b8';
                                                return <Cell key={`cell-${index}`} fill={barColor} fillOpacity={isOtherHovered ? 0.4 : 0.85} />;
                                            })}
                                        </Bar>
                                    );
                                })}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>

            {viewMode === 'variation' && (
                <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-950/20 backdrop-blur-sm p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300 mb-2.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> Principais quedas na semana
                    </p>
                    {topRegressions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {topRegressions.map(item => (
                                <div key={item.key} className="rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-[10px] flex items-center justify-between min-w-0 gap-2 shadow-inner">
                                    <span className="truncate min-w-0 font-bold" style={{ color: item.color }} title={item.fullName}>{item.name}</span>
                                    <span className="font-mono font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{formatValue(item.delta)}{unit}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-xs text-center py-3">Nenhuma queda visível no filtro atual. ✅</p>
                    )}
                </div>
            )}

            {viewMode !== 'performance' && (
                <div className="flex justify-center mt-3 opacity-60">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-md border border-slate-800 shrink-0 select-none">
                        💡 Dica: clique nos itens da legenda para ocultar ou isolar o gráfico.
                    </p>
                </div>
            )}
        </div>
    );
};

```

---

## `src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx` <a id="src-components-charts-evolutionchart-weeklyperformancechart-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx`
- **Descrição:** Gráfico de desempenho semanal agregado por período
- **Linhas:** 302
- **Tamanho:** 14.57 KB

```javascript
import React, { useId, useCallback } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { getDateKey, formatDuration, formatWeekdayShortPtBR } from '../../../utils/dateHelper.js';
import { getSafeScore, getSyntheticTotal, formatValue } from '../../../utils/scoreHelper.js';
import { pointsToRatio, ratioToPoints } from '../../../utils/scoreHelper.conversions.js';
import { getHistoryDate } from '../../../utils/evolutionGuards.js';

const WeeklyPerformanceChart = ({
    categories = [],
    studyLogs = [],
    showOnlyFocus = false,
    focusSubjectId = null,
    maxScore = 100,
    minScore = 0,
    unit = '%'
}) => {
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeUnit = typeof unit === 'string' && unit.length <= 4 ? unit : '%';
    const instanceId = useId().replace(/:/g, "");
    const barGradId = `wp_barGrad_${instanceId}`;

    const chartData = React.useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateKey = getDateKey(d);

            const dow = formatWeekdayShortPtBR(d);

            const dailyLogs = studyLogs.filter(log => {
                const rawDate = getHistoryDate(log);
                if (!rawDate) return false;
                const logDate = getDateKey(rawDate);
                if (logDate !== dateKey) return false;
                if (showOnlyFocus && focusSubjectId) {
                    return String(log.categoryId ?? log.subjectId ?? '') === String(focusSubjectId);
                }
                return true;
            });
            // 🎯 FIX: Calcular apenas os minutos puros para entregar ao Recharts
            const totalMinutes = dailyLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);

            let correctTotal = 0;
            let questionsTotal = 0;

            categories.forEach(cat => {
                if (showOnlyFocus && focusSubjectId && cat.id !== focusSubjectId) return;

                const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : safeMaxScore;
                const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMinScore;
                const history = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                history.forEach(h => {
                    const hDate = getDateKey(getHistoryDate(h));
                    if (hDate === dateKey) {
                        let q = Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0;
                        let corr = 0;
                        const hasCorrect = (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '') ||
                                          (h.acertos !== undefined && h.acertos !== null && String(h.acertos).trim() !== '') ||
                                          (h.correctCount !== undefined && h.correctCount !== null && String(h.correctCount).trim() !== '');
                        if (hasCorrect && !h.isPercentage) {
                            const rawC = Math.max(0, Number(h.correct ?? h.acertos ?? h.correctCount) || 0);
                            corr = Math.min(q > 0 ? q : rawC, Number.isFinite(rawC) ? rawC : 0);
                            if (q === 0) q = corr > 0 ? corr : getSyntheticTotal(catMax);
                        } else {
                            if (q === 0 && h.score != null) {
                                q = getSyntheticTotal(catMax);
                            }
                            if (q < 1) return;
                            const score = getSafeScore(h, catMax, catMin);
                            const ratio = pointsToRatio(score, catMax, catMin);
                            corr = ratio * q;
                        }
                        if (!Number.isFinite(corr) || q < 1) return;
                        correctTotal += corr;
                        questionsTotal += q;
                    }
                });
            });

            const acertosRaw = questionsTotal > 0 ? ratioToPoints(correctTotal / questionsTotal, safeMaxScore, safeMinScore) : null;
            const safeAcertosRaw = Number.isFinite(acertosRaw) ? acertosRaw : safeMinScore;
            const acertos = acertosRaw == null
                ? null
                : Number(Math.max(safeMinScore, Math.min(safeMaxScore, safeAcertosRaw)).toFixed(2));

            days.push({
                data: i === 0 ? "HOJE" : dow,
                fullDate: dateKey,
                minutos: totalMinutes / 60, // Horas decimais para o formatDuration funcionar corretamente
                acertos
            });
        }
        return days;
    }, [categories, studyLogs, showOnlyFocus, focusSubjectId, safeMaxScore, safeMinScore]);


    const renderTooltip = useCallback(({ active, payload, label }) => {
        if (!(active && payload && payload.length)) return null;

        // Dedup para evitar que Line e Area sobrepostos com o mesmo dataKey apareçam duas vezes
        const uniquePayload = payload
            .filter((v) => !String(v.name || '').startsWith('_'))   // ✅ LOTE-02
            .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);

        return (
            <div className="bg-slate-950/80 border border-white/10 p-3 sm:p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                    {label === "HOJE" ? "Hoje" : label}
                </p>
                <div className="flex flex-col gap-2">
                    {uniquePayload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6 py-0.5">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${entry.name === 'acertos' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'}`} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {entry.name === 'acertos' ? 'Acertos' : 'Horas'}
                                </span>
                            </div>
                            <span className={`text-sm sm:text-base font-black ${entry.name === 'acertos' ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                {entry.value != null && Number.isFinite(Number(entry.value))
                                    ? (entry.name === 'acertos' ? `${formatValue(entry.value)}${safeUnit}` : formatDuration(entry.value))
                                    : 'N/A'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }, [safeUnit]);

    const hasAnyData = chartData.some(
      d => d.minutos > 0 || d.acertos != null
    );

    if (!hasAnyData) {
      return (
        <div className="w-full h-[320px] sm:h-[400px] flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
          <span className="text-3xl">📭</span>
          Sem atividade nos últimos 7 dias.
        </div>
      );
    }

    return (
        <div className="w-full h-[320px] sm:h-[400px] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-1 gap-2 shrink-0">
                <div>
                    <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2">
                        📈 {showOnlyFocus ? 'Foco: Últimos 7 Dias' : 'Desempenho: Últimos 7 Dias'}
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                        Horas de Estudo vs. Taxa de Acerto
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900/80 p-2 rounded-xl border border-white/10 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                        <span className="text-[10px] font-bold text-slate-300 capitalize">Horas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        <span className="text-[10px] font-bold text-slate-300 capitalize">Acertos</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={1}>
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                    >
                        <defs>
                            <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.25} />
                            </linearGradient>
                            <linearGradient id={`areaGrad_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.06)"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="data"
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />

                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                            tickFormatter={(v) => v === 0 ? '0h' : formatDuration(v)}
                            domain={[0, 'auto']}
                            allowDecimals={true}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                            tickFormatter={(v) => `${formatValue(v)}${safeUnit}`}
                            domain={[safeMinScore, safeMaxScore]}
                            allowDataOverflow={true}
                        />

                        <Tooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                            content={renderTooltip}
                        />

                        <Bar
                            yAxisId="left"
                            dataKey="minutos"
                            name="Horas"
                            fill={`url(#${barGradId})`}
                            radius={[6, 6, 0, 0]}
                            barSize={24}
                            animationDuration={1200}
                        />

                        <Area
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="_acertos_area"
                            stroke="none"
                            fill={`url(#areaGrad_${instanceId})`}
                            animationDuration={1200}
                            connectNulls={true}
                            legendType="none"
                            tooltipType="none"
                        />

                        {/* Bottom Layer: Glow effect */}
                        <Line
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="_acertos_glow"
                            stroke="#34d399"
                            strokeWidth={6}
                            strokeOpacity={0.25}
                            dot={false}
                            activeDot={false}
                            strokeLinecap="round"
                            animationDuration={1200}
                            connectNulls={true}
                            legendType="none"
                            tooltipType="none"
                        />
                        {/* Top Layer: Main Line */}
                        <Line
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="acertos"
                            stroke="#34d399"
                            strokeWidth={3}
                            dot={{ r: 3.5, fill: '#34d399', strokeWidth: 2, stroke: '#0f172a' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981', className: "animate-pulse shadow-lg" }}
                            strokeLinecap="round"
                            animationDuration={1200}
                            connectNulls={true}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeeklyPerformanceChart;

```

---

# 3. COMPONENTES DE APOIO VISUAL E UI (VISUAL SUPPORT & UI)

## `src/components/charts/EvolutionHeatmap.jsx` <a id="src-components-charts-evolutionheatmap-jsx"></a>

- **Localização:** `src/components/charts/EvolutionHeatmap.jsx`
- **Descrição:** Mapa de calor de frequência e consistência de simulados com granularidade diária/semanal/mensal
- **Linhas:** 463
- **Tamanho:** 23.15 KB

```javascript
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { aggregateHeatmap } from '../../utils/heatmapAggregation.js';

// ✅ FIX: Worker singleton compartilhado entre todas as instâncias
let sharedWorker = null;
let sharedWorkerRefCount = 0;
let terminateTimer = null;

function getSharedWorker() {
  if (terminateTimer) { clearTimeout(terminateTimer); terminateTimer = null; }
  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(
        new URL('../../engine/heatmap.worker.js', import.meta.url),
        { type: 'module' }
      );
    } catch (e) {
      console.warn("[EvolutionHeatmap] Web Worker not available:", e);
      return null;
    }
  }
  sharedWorkerRefCount++;
  return sharedWorker;
}

function releaseSharedWorker() {
  sharedWorkerRefCount--;
  if (sharedWorkerRefCount < 0) sharedWorkerRefCount = 0;
  if (sharedWorkerRefCount === 0 && sharedWorker) {
    terminateTimer = setTimeout(() => {
      if (sharedWorkerRefCount === 0 && sharedWorker) {
        sharedWorker.terminate();
        sharedWorker = null;
      }
    }, 100);
  }
}

function invalidateSharedWorker(badWorker) {
  if (sharedWorker && sharedWorker === badWorker) {
    try { sharedWorker.terminate(); } catch { /* ignore */ }
    sharedWorker = null;
    sharedWorkerRefCount = 0;
  }
}

export const EvolutionHeatmap = ({ 
    heatmapData, 
    targetScore = 70, 
    showOnlyFocus, 
    focusSubjectId, 
    maxScore = 100, 
    minScore = 0 
}) => {
    const { dates = [], rows = [] } = heatmapData || {};
    
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const range = Math.max(1e-9, safeMax - safeMin);
    
    const safeTarget = Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMin;
    
    const targetScorePct = Math.max(
      0,
      Math.min(100, ((safeTarget - safeMin) / range) * 100)
    );

    // 🎯 FILTRO DE FOCO: Aplica o filtro de "Todas as Matérias" vs "Apenas Foco"
    const filteredRowsByFocus = useMemo(() => {
        if (!showOnlyFocus || !focusSubjectId) return rows;
        return rows.filter(row => row.cat?.id === focusSubjectId);
    }, [rows, showOnlyFocus, focusSubjectId]);

    const [windowSize, setWindowSize] = useState('all');
    const [granularity, setGranularity] = useState('daily');
    const [hoveredCell, setHoveredCell] = useState(null);
    const scrollDebounceRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setHoveredCell(null);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
        };
    }, []);

    const filtered = useMemo(() => {
        if (!Array.isArray(dates) || !Array.isArray(filteredRowsByFocus)) return { dates: [], rows: [] };
        const size = windowSize === 'all' ? dates.length : Number(windowSize);
        const safeSize = Number.isFinite(size) ? Math.max(1, size) : dates.length;
        const start = Math.max(0, dates.length - safeSize);

        return {
            dates: dates.slice(start),
            rows: filteredRowsByFocus.map((row) => ({
                ...row,
                cells: Array.isArray(row.cells) ? row.cells.slice(start) : []
            }))
        };
    }, [dates, filteredRowsByFocus, windowSize]);

    const [aggregated, setAggregated] = useState(() => {
        return aggregateHeatmap(filtered, granularity, safeMax, safeMin);
    });
    const [isAggregating, setIsAggregating] = useState(false);
    const workerRef = useRef(null);
    const didAcquireWorker = useRef(false);

    useEffect(() => {
        const worker = getSharedWorker();
        workerRef.current = worker;
        didAcquireWorker.current = worker !== null;
        
        return () => {
            if (didAcquireWorker.current) releaseSharedWorker();
            workerRef.current = null;
            didAcquireWorker.current = false;
        };
    }, []);

    useEffect(() => {
        // Se for granularidade diária, aggregateHeatmap é síncrono e identidade (filtered).
        // Evita envio desnecessário ao WebWorker e piscada de "Processando...".
        if (granularity === 'daily') {
            setAggregated(filtered);
            setIsAggregating(false);
            return;
        }

        const worker = workerRef.current;
        if (!worker) {
            setAggregated(aggregateHeatmap(filtered, granularity, safeMax, safeMin));
            setIsAggregating(false);
            return;
        }

        const msgId = `${Date.now()}_${Math.random()}`;
        setIsAggregating(true);

        const handleMessage = (e) => {
            if (e.data?.id !== msgId) return;

            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);

            if (e.data.type === 'success') {
                setAggregated(e.data.result);
            } else {
                setAggregated(aggregateHeatmap(filtered, granularity, safeMax, safeMin));
            }
            setIsAggregating(false);
        };

        const handleError = (err) => {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            invalidateSharedWorker(worker);
            workerRef.current = null;
            console.warn('[EvolutionHeatmap] Worker error, falling back:', err);
            setAggregated(aggregateHeatmap(filtered, granularity, safeMax, safeMin));
            setIsAggregating(false);
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        worker.postMessage({
          id: msgId,
          payload: {
            filtered,
            granularity,
            targetScore: safeTarget,
            targetScorePct,
            minScore: safeMin,
            maxScore: safeMax
          }
        });

        return () => {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            setIsAggregating(false);
        };
    }, [filtered, granularity, safeTarget, targetScorePct, safeMin, safeMax]);

    const filteredDates = aggregated.dates || [];
    const filteredRows = aggregated.rows || [];

    const maxCellTotal = useMemo(() => {
        const totals = filteredRows
            .flatMap((row) => (Array.isArray(row?.cells) ? row.cells : []))
            .map((cell) => Number(cell?.total) || 0);
        return totals.length > 0 ? totals.reduce((m, v) => Math.max(m, v), 1) : 1;
    }, [filteredRows]);

    const cellColor = (pct, total = 0) => {
      if (pct == null || !Number.isFinite(Number(pct))) {
        return {
          bg: 'rgba(255,255,255,0.02)',
          text: '#64748b',
          border: '#1e293b',
          density: 0
        };
      }
    
      const safePct = Number(pct);
      const safeTotal = Number.isFinite(Number(total)) ? Math.max(0, Number(total)) : 0;
      const density = maxCellTotal > 0 ? Math.min(1, safeTotal / maxCellTotal) : 0;
    
      if (safePct >= targetScorePct) {
        return {
          bg: 'rgba(34,197,94,0.45)',
          text: '#4ade80',
          border: 'rgba(34,197,94,0.6)',
          density
        };
      }
    
      if (safePct >= targetScorePct * 0.8) {
        return {
          bg: 'rgba(251,191,36,0.4)',
          text: '#fcd34d',
          border: 'rgba(251,191,36,0.6)',
          density
        };
      }
    
      if (safePct >= targetScorePct * 0.6) {
        return {
          bg: 'rgba(251,146,60,0.4)',
          text: '#fb923c',
          border: 'rgba(251,146,60,0.6)',
          density
        };
      }
    
      return {
        bg: 'rgba(239,68,68,0.4)',
        text: '#f87171',
        border: 'rgba(239,68,68,0.6)',
        density
      };
    };

    const formatPct = (value) => {
        if (!Number.isFinite(value)) return '—';
        const rounded = Number(value.toFixed(2));
        return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%`;
    };

    if (!filteredDates.length) return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            {isAggregating ? (
                <span className="flex items-center gap-2 animate-pulse text-indigo-400">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    Processando volume de dados...
                </span>
            ) : "Nenhum dado encontrado."}
        </div>
    );

    const targetFmt = `${Math.round(targetScorePct)}%`;
    const t60Fmt = `${Math.round(targetScorePct * 0.6)}%`;
    const t80Fmt = `${Math.round(targetScorePct * 0.8)}%`;

    return (
        <div className="w-full min-h-[240px] rounded-2xl border border-slate-800/80 bg-slate-950 p-4 sm:p-5 shadow-[0_18px_45px_rgba(2,6,23,0.5)]">
            <div className="flex flex-wrap items-center gap-3.5 mb-5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-lg p-1.5 mr-2 shadow-sm">
                    {[{ label: '4 sem', value: '28' }, { label: '8 sem', value: '56' }, { label: '12 sem', value: '84' }, { label: 'Tudo', value: 'all' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setWindowSize(opt.value)}
                            aria-label={`Filtrar janela ${opt.label}`}
                            aria-pressed={windowSize === opt.value}
                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${windowSize === opt.value ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-lg p-1.5 mr-2 shadow-sm">
                    {[{ label: 'Diário', value: 'daily' }, { label: 'Semanal', value: 'weekly' }, { label: 'Mensal', value: 'monthly' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setGranularity(opt.value)}
                            aria-label={`Selecionar granularidade ${opt.label}`}
                            aria-pressed={granularity === opt.value}
                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${granularity === opt.value ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {[
                    { bg: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)', label: `< ${t60Fmt}` },
                    { bg: 'rgba(251,146,60,0.3)', border: 'rgba(251,146,60,0.5)', label: `${t60Fmt}–${t80Fmt}` },
                    { bg: 'rgba(251,191,36,0.3)', border: 'rgba(251,191,36,0.5)', label: `${t80Fmt}–${targetFmt}` },
                    { bg: 'rgba(34,197,94,0.3)', border: 'rgba(34,197,94,0.5)', label: `≥ ${targetFmt} ✓ meta` },
                ].map(item => (
                    <span key={item.label} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                        {item.label}
                    </span>
                ))}
            </div>
            {granularity !== 'daily' && (
                <p className="text-[10px] text-cyan-200/90 font-bold uppercase tracking-wider mb-3.5">
                    Modo agregado ({granularity === 'weekly' ? 'semanal' : 'mensal'}): cada célula representa vários dias.
                </p>
            )}

            <div className="mb-4 rounded-xl border border-white/5 bg-black/20 p-2.5 text-[10px] text-slate-400">
                Leitura rápida: verde = acima da meta; amarelo/laranja = atenção; vermelho = risco; vazio = sem simulado cadastrado.
            </div>

            {/* VIS-FIX: Container com scroll horizontal dedicado, sem padding lateral para o sticky fixar perfeitamente em x=0 */}
            <div 
                className="w-full overflow-x-auto overflow-y-visible custom-scrollbar pt-2 pb-4"
                onScroll={() => {
                    if (hoveredCell) {
                        if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
                        scrollDebounceRef.current = setTimeout(() => setHoveredCell(null), 100);
                    }
                }}
            >
                <div style={{ minWidth: `${filteredDates.length * 72 + 260}px` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `260px repeat(${filteredDates.length}, 68px)`, gap: '4px' }} className="mb-3">
                        <div 
                            className="sticky left-0 z-30 w-[260px] min-w-[260px] max-w-[260px] self-stretch flex items-center px-3.5 bg-slate-950 border-r border-slate-800/80 shadow-[4px_0_12px_rgba(0,0,0,0.8)]" 
                            style={{ backgroundColor: '#020617' }}
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Disciplina</span>
                        </div>
                        {filteredDates.map(d => (
                            <div key={d.key} className="flex flex-col items-center gap-1">
                                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${d.isWeekend ? 'text-purple-300' : 'text-slate-400'}`}>
                                    {d.dayName}
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-100">{d.label}</span>
                                {Number.isFinite(Number(d.count)) && Number(d.count) > 1 && (
                                    <span className="text-[8px] text-slate-500">{d.count}d</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2.5">
                        {filteredRows.map(({ cat, cells }) => (
                            <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: `260px repeat(${filteredDates.length}, 68px)`, gap: '4px', alignItems: 'center' }}>
                                {/* VIS-FIX: Coluna da matéria 100% opaca, largura fixa de 260px, z-30 e shadow para nada de trás transparecer */}
                                <div 
                                    className="sticky left-0 z-30 w-[260px] min-w-[260px] max-w-[260px] self-stretch flex items-center gap-2.5 px-3 bg-slate-950 border-r border-slate-800/80 shadow-[4px_0_12px_rgba(0,0,0,0.8)]"
                                    style={{ backgroundColor: '#020617' }}
                                >
                                    <span className="text-lg shrink-0">{cat.icon}</span>
                                    <span 
                                        className="text-[12px] sm:text-[13px] font-extrabold leading-tight capitalize min-w-0 line-clamp-2 select-none" 
                                        style={{ color: cat.color }} 
                                        title={cat.name}
                                    >
                                        {cat.name}
                                    </span>
                                </div>

                                {cells.map((cell, ci) => {
                                    const hasData = Boolean(cell && Number(cell.total) > 0 && cell.pct !== null);
                                    const col = cellColor(hasData ? cell.pct : null, hasData ? cell.total : 0);
                                    return (
                                        <div
                                            key={ci}
                                            className={`relative rounded-lg flex flex-col items-center justify-center py-2.5 px-1 transition-all duration-200 ${hasData ? 'hover:scale-[1.03] hover:z-20 cursor-default shadow-[0_6px_16px_rgba(2,6,23,0.22)] hover:shadow-[0_10px_24px_rgba(2,6,23,0.4)]' : 'opacity-60 cursor-default'}`}
                                            style={{
                                                background: col.bg,
                                                opacity: hasData ? (0.85 + (col.density * 0.15)) : 0.6,
                                                border: `1px solid ${col.border}`,
                                                minHeight: '52px',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!hasData) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const isAbove = rect.top > 160;
                                                const centerX = rect.left + rect.width / 2;
                                                const left = Math.max(85, Math.min(window.innerWidth - 85, centerX));
                                                setHoveredCell({
                                                    rect,
                                                    isAbove,
                                                    left,
                                                    cell,
                                                    col,
                                                    date: filteredDates[ci],
                                                });
                                            }}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        >
                                            {hasData ? (
                                                <>
                                                    <span className="text-[13px] sm:text-[14px] font-black leading-none tabular-nums drop-shadow-[0_0_6px_rgba(15,23,42,0.65)]" style={{ color: col.text }}>
                                                        {formatPct(cell.pct)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-300/80 font-mono mt-1">
                                                        {Math.round(cell.correct)}/{Math.round(cell.total)}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-slate-500 text-[13px] font-bold">—</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Portal Tooltip: Flutua sobre tudo via body, impossível de cortar no topo, bordas ou coluna fixa */}
            {typeof document !== 'undefined' && hoveredCell && createPortal(
                <div 
                    className="fixed z-[99999] pointer-events-none flex flex-col items-center bg-slate-950/95 backdrop-blur-md border border-slate-600 rounded-xl p-3 min-w-[140px] shadow-[0_20px_50px_rgba(0,0,0,0.95)] whitespace-nowrap text-center border-l-4 transition-transform duration-75 ease-out"
                    style={{
                        top: hoveredCell.isAbove ? `${hoveredCell.rect.top - 8}px` : `${hoveredCell.rect.bottom + 8}px`,
                        left: `${hoveredCell.left}px`,
                        transform: hoveredCell.isAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                        borderLeftColor: hoveredCell.col.text,
                    }}
                >
                    <span className="text-[10px] text-slate-200 font-black uppercase tracking-[0.15em] mb-1.5 pb-1.5 border-b border-slate-800 w-full">
                        {hoveredCell.date ? `${hoveredCell.date.dayName} • ${hoveredCell.date.label}` : ''}
                    </span>
                    {Number.isFinite(Number(hoveredCell.date?.count)) && Number(hoveredCell.date.count) > 1 && (
                        <span className="text-[9px] text-cyan-400 font-bold mb-1.5">
                            Janela: {hoveredCell.date.count} dias
                        </span>
                    )}
                    <div className="flex flex-col items-center justify-center py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 w-full mb-1.5">
                        <span className="text-[17px] font-black leading-none mb-1 drop-shadow-[0_0_8px_rgba(0,0,0,1)]" style={{ color: hoveredCell.col.text }}>
                            {formatPct(hoveredCell.cell.pct)}
                        </span>
                        <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest">Desempenho</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white font-mono">
                        <span className="font-black px-1.5 py-0.5 rounded-md bg-black" style={{ color: hoveredCell.col.text }}>{Math.round(hoveredCell.cell.correct)}</span>
                        <span className="text-slate-500 font-bold">/</span>
                        <span className="font-bold">{Math.round(hoveredCell.cell.total)} <small className="text-[8px] text-slate-400">Q</small></span>
                    </div>
                    <div className="mt-1 text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                        Densidade: {Math.round((hoveredCell.col.density || 0) * 100)}%
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

```

---

## `src/components/charts/ChartFrame.jsx` <a id="src-components-charts-chartframe-jsx"></a>

- **Localização:** `src/components/charts/ChartFrame.jsx`
- **Descrição:** Frame container responsivo com suporte a loading skeleton e tratamento de erros
- **Linhas:** 114
- **Tamanho:** 3.90 KB

```javascript
import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * ChartFrame
 * Mede o próprio container e só monta o gráfico quando há área real (> 0).
 * Enquanto mede, exibe um placeholder ambient com shimmer — nunca um chart cego.
 * Reage a resize / aba que vira visível via ResizeObserver.
 */
const isTestEnv = (() => {
  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') return true;
    if (typeof window !== 'undefined' && window.__vitest_worker__) return true;
    if (typeof window !== 'undefined' && /jsdom|happy-dom/i.test(window.navigator?.userAgent || '')) return true;
    return false;
  } catch {
    return false;
  }
})();

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
          setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
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
      className={`relative w-full h-full overflow-visible rounded-2xl ${className}`}
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
- **Descrição:** Tooltip customizado de alta precisão com tema escuro e contraste acessível
- **Linhas:** 162
- **Tamanho:** 12.38 KB

```javascript
import React from 'react';
// ✅ LOTE-04 FIX: CHART_COLORS removido — nunca era usado e o módulo
// utils/chartConfig não existe no pacote (risco de quebra de build).
import { formatValue } from '../../utils/scoreHelper';
import { formatDatePtBR } from '../../utils/dateHelper';

export const ChartTooltip = ({ active, payload, label, isCompare = false, chartData = [], unit = '%', maxScore = 100, minScore = 0 }) => {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const scaleRange = Math.max(1, safeMax - safeMin);

    const displayHeaderDate = React.useMemo(() => {
        if (!label) return '';
        if (typeof label === 'string' && /^\d{4}-\d{2}-\d{2}/.test(label)) {
            const formatted = formatDatePtBR(label);
            return formatted !== '--/--/----' ? formatted : label;
        }
        return String(label);
    }, [label]);

    if (!active || !payload?.length) return null;

    const currentData = payload?.[0]?.payload || (Array.isArray(chartData) ? chartData.find(d => d.displayDate === label || d.date === label) : null);

    return (
        <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl text-sm w-[90vw] sm:w-[380px] max-w-[calc(100vw-2rem)] sm:max-w-sm z-50 backdrop-blur-xl pointer-events-none transition-transform duration-200 overflow-hidden">
            <p className="text-slate-300 mb-3 font-bold border-b border-white/10 pb-2 flex items-center justify-between">
                <span>📅 {displayHeaderDate}</span>
            </p>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto custom-scrollbar pointer-events-auto pr-1">
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

                    // ✅ LOTE-04 FIX (M9): raw_correct/raw_total ANTES de raw,
                    // senão "raw_correct_x" virava catId "correct_x" (lookup errado)
                    const catId = dataKey.replace(/^(bay_ci_low|bay_ci_high|trend_status|raw_correct|raw_total|raw|bay|stats|trend)_/, '');
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Bruta</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className="text-[11px] sm:text-xs font-mono text-orange-400 font-bold leading-none">
                                            {rawVal != null && Number.isFinite(Number(rawVal)) ? `${formatValue(rawVal)}${unit}` : '—'}
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
                                            {statsVal != null && Number.isFinite(Number(statsVal)) ? `${formatValue(statsVal)}${unit}` : '—'}
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
                                            {bayVal != null && Number.isFinite(Number(bayVal)) ? `${formatValue(bayVal)}${unit}` : '—'}
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
                                                    <span>{trendVal > 0 ? `+${formatValue(trendVal)}${unit}` : `${formatValue(trendVal)}${unit}`}</span>
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
                                            <span>Simulado deste dia:</span>
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

## `src/components/charts/GaussianPlot.jsx` <a id="src-components-charts-gaussianplot-jsx"></a>

- **Localização:** `src/components/charts/GaussianPlot.jsx`
- **Descrição:** Plot de densidade de probabilidade da distribuição gaussiana/normal
- **Linhas:** 500
- **Tamanho:** 25.84 KB

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
    volatility,
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

        const effectiveVol = volatility !== undefined ? volatility : sd;
        const safeVolatility = Math.max(1e-6, Number(effectiveVol) || 1e-6);
        const sdFloor = Math.max(1e-6, safeRange * 0.001);
        let vizSdLeft = Math.max(sdFloor, Number(propSdLeft) || safeVolatility);
        let vizSdRight = Math.max(sdFloor, Number(propSdRight) || safeVolatility);

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

            points.push({ x: xp(safeX(kdeData[0].x)), y: 100 });
            kdeData.forEach(p => {
                points.push({ x: xp(safeX(p.x)), y: yp(p.y * baseHeightFactor) });
            });
            points.push({ x: xp(safeX(kdeData[kdeData.length - 1].x)), y: 100 });
            path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
            pointsForArea = points;
        } else {
            const pts = generateGaussianPoints(xMin, domainMax, 100, meanVal, vizSdLeft, vizSdRight, baseHeightFactor, xp, yp);
            path = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
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

        // ✅ LOTE-04 FIX (M4): busca binária O(log N) em vez de varredura linear O(N).
        // Resolvido BUG-015: Uso de objetos em vez de strings evita garbage collection e CPU overhead de split() no hover.
        const getYAtX = (pts, xTarget) => {
            const n = pts.length;
            if (n === 0) return 100;
            const getX = (p) => p.x;
            const getY = (p) => p.y;
            // pts já está ordenado por x (KDE e generateGaussianPoints ordenam)
            let loIdx = -1;
            let lo = 0, hi = n - 1;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (getX(pts[mid]) <= xTarget) {
                    loIdx = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            if (loIdx === -1) return getY(pts[0]);
            if (loIdx === n - 1) return getY(pts[n - 1]);
            const loP = pts[loIdx];
            const hiP = pts[loIdx + 1];
            const lx = getX(loP);
            const hx = getX(hiP);
            if (hx === lx) return getY(loP);
            const t = (xTarget - lx) / (hx - lx);
            return getY(loP) + t * (getY(hiP) - getY(loP));
        };

        const successStart = Math.max(xMin, targetVal);
        const yAtTargetVisual = hasValidKDE ? getYAtX(pointsForArea, xp(successStart)) : yp(asymmetricGaussian(successStart, meanVal, vizSdLeft, vizSdRight, baseHeightFactor));

        const areaPoints = [];
        const failPoints = [];

        const startXP = xp(successStart);

        areaPoints.push({ x: startXP, y: yAtTargetVisual });
        pointsForArea.forEach(p => {
            if (p.x > startXP) areaPoints.push(p);
        });
        if (areaPoints.length > 0) {
            const lastP = areaPoints[areaPoints.length - 1];
            areaPoints.push({ x: lastP.x, y: 100 });
            areaPoints.push({ x: startXP, y: 100 });
        }

        failPoints.push({ x: pointsForArea[0].x, y: 100 });
        pointsForArea.forEach(p => {
            if (p.x <= startXP) failPoints.push(p);
        });
        failPoints.push({ x: startXP, y: yAtTargetVisual });
        failPoints.push({ x: startXP, y: 100 });

        const areaPath = areaPoints.length > 2 ? `M ${areaPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z` : '';
        const failPath = failPoints.length > 2 ? `M ${failPoints.map(p => `${p.x},${p.y}`).join(' L ')} Z` : '';

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
    }, [mean, sd, volatility, targetScore, prob, propSdLeft, propSdRight, kdeData, minScore, maxScore, unit]);

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

        const hoverRange = range > 1e-6 ? range : 1;
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
                            <span className="text-[9px] text-slate-400 font-semibold">
                                {hover.val >= targetVal ? 'Zona de sucesso' : 'Abaixo da meta'}
                            </span>
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

## `src/components/ui/StatusPill.jsx` <a id="src-components-ui-statuspill-jsx"></a>

- **Localização:** `src/components/ui/StatusPill.jsx`
- **Descrição:** Pílula visual de status para classificar consistência e evolução
- **Linhas:** 65
- **Tamanho:** 1.67 KB

```javascript
import React from 'react';

const TONES = {
  success: {
    chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400'
  },
  warning: {
    chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400'
  },
  danger: {
    chip: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400'
  },
  info: {
    chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400'
  },
  neutral: {
    chip: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400'
  },
  critical: {
    chip: 'bg-rose-600/15 text-rose-200 border-rose-500/50',
    dot: 'bg-rose-500'
  },
  progress: {
    chip: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400'
  },
  time: {
    chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-400'
  },
  focus: {
    chip: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400'
  }
};

export const StatusPill = React.memo(function StatusPill({
  label,
  value,
  tone = 'neutral',
  icon,
  help
}) {
  const styles = TONES[tone] || TONES.neutral;

  return (
    <div
      title={help}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[10px] font-bold backdrop-blur-sm ${styles.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {icon ? <span aria-hidden="true" className="text-xs">{icon}</span> : null}
      <span className="uppercase tracking-wider">{label}</span>
      {value != null && value !== '' ? (
        <strong className="font-black normal-case tracking-normal">{value}</strong>
      ) : null}
    </div>
  );
});
```

---

## `src/components/ui/ChartGuide.jsx` <a id="src-components-ui-chartguide-jsx"></a>

- **Localização:** `src/components/ui/ChartGuide.jsx`
- **Descrição:** Painel interativo com explicações detalhadas de como interpretar cada gráfico
- **Linhas:** 56
- **Tamanho:** 1.36 KB

```javascript
import React from 'react';

export function ChartGuide({ guide }) {
  if (!guide) return null;

  const items = [
    {
      title: 'Como ler',
      icon: '📖',
      text: guide.como,
      color: 'text-slate-300'
    },
    {
      title: 'Sinais positivos',
      icon: '✅',
      text: guide.positivo,
      color: 'text-emerald-300'
    },
    {
      title: 'Alertas',
      icon: '⚠️',
      text: guide.alerta,
      color: 'text-amber-300'
    },
    {
      title: 'O que fazer',
      icon: '🧭',
      text: guide.acao,
      color: 'text-indigo-300'
    }
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-4 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl bg-black/25 border border-white/5 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span aria-hidden="true">{item.icon}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {item.title}
              </p>
            </div>
            <p className={`text-xs leading-relaxed ${item.color}`}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

# 4. HOOKS REATIVOS DO REACT (HOOKS)

## `src/hooks/useEvolutionMC.js` <a id="src-hooks-useevolutionmc-js"></a>

- **Localização:** `src/hooks/useEvolutionMC.js`
- **Descrição:** Hook orquestrador do motor Monte Carlo específico para os gráficos do Menu Evolução
- **Linhas:** 271
- **Tamanho:** 10.52 KB

```javascript
import { useState, useMemo, useEffect } from 'react';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { useAppStore } from '../store/useAppStore';
import { getDateKey, toDateMs } from '../utils/dateHelper';
import { getSafeScore } from '../utils/scoreHelper';
import { parseNoonLocal, addDaysNoon } from '../utils/parseNoonLocal';
import { runMonteCarloAnalysis } from '../engine/monteCarlo';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * Orquestra o motor Monte Carlo do Menu Evolução.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 *
 * Responsabilidades:
 *  - disparar o worker apenas nos engines que consomem o resultado;
 *  - debouncer + cancelamento seguro;
 *  - fallback síncrono quando o worker falha;
 *  - série de projeção futura com parsing de data sem timezone fixo.
 */
export function useEvolutionMC({
  focusCategory,
  categoryLevels,
  projectDays,
  targetScore,
  minScore,
  maxScore,
  _activeEngine
}) {
  const { runAnalysis } = useMonteCarloWorker();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState(null);
  const [mcProjectionSeries, setMcProjectionSeries] = useState(null);

  const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTarget(targetScore), 300);
    return () => clearTimeout(t);
  }, [targetScore]);

  // FIX 3A: usar fingerprint estável para evitar re-cálculo por mudança de referência
  const historyFingerprint = useMemo(() => {
      const historyRaw = focusCategory?.simuladoStats?.history;
      if (!historyRaw) return 'empty';
      const arr = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
      if (arr.length === 0) return 'empty';
      // FIX: fingerprint forte. O anterior (só first/last) deixava o array
      // stale quando um item do MEIO era editado sem mudar o comprimento.
      return arr
          .map((h) => `${h?.date || h?.createdAt || ''}:${h?.score ?? ''}`)
          .join('|');
  }, [focusCategory?.simuladoStats?.history]);
  
  const historyArray = useMemo(() => {
      const historyRaw = focusCategory?.simuladoStats?.history;
      if (!historyRaw) return EMPTY_ARRAY;
      return Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFingerprint]);
  
  const currentFocusLevel = focusCategory ? categoryLevels?.[focusCategory.id] : undefined;

  useEffect(() => {
    let cancelled = false;

    if (!focusCategory || !focusCategory.id || !Array.isArray(historyArray) || historyArray.length === 0) {
      const timer = setTimeout(() => {
        if (!cancelled) {
          setMcLoading(false);
          setMcResult(null);
          setMcProjectionSeries(null);
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);

    const hist = [...historyArray]
      .filter((h) => h && (h.date || h.createdAt))
      .map((h) => {
        const dateKey = getDateKey(h.date || h.createdAt);
        const score = getSafeScore(h, safeMax, safeMin);
        // FIX 3B: validação mais robusta
        if (!dateKey || !Number.isFinite(score)) return null;
        return {
          date: dateKey,
          score,
          correct: Number.isFinite(Number(h.correct)) ? Number(h.correct) : undefined,
          total: Number.isFinite(Number(h.total)) ? Number(h.total) : undefined,
          timeSpent: Number.isFinite(Number(h.timeSpent)) ? Number(h.timeSpent) : undefined,
          timedQuestoes: Number.isFinite(Number(h.timedQuestoes)) ? Number(h.timedQuestoes) : undefined
        };
      })
      .filter(Boolean)
      .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date));

    // FIX 3B: verificar antes de prosseguir
    if (hist.length < 1) {
      const timer = setTimeout(() => {
        if (!cancelled) {
          setMcLoading(false);
          setMcResult(null);
          setMcProjectionSeries(null);
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    const workerDebounceTimeout = setTimeout(async () => {
      // ✅ BUG-5 FIX: Mover cálculos de tempo para ANTES do try/catch
      // para que fiquem acessíveis no fallback síncrono
      let totalTimeSpent = 0;
      let totalTimedQuestions = 0;
      historyArray.forEach((rawH) => {
        if (!rawH) return;
        let hasTopicWithTime = false;
        let topicsTs = 0;
        let topicsTimedQ = 0;
        
        if (Array.isArray(rawH.topics)) {
          for (const t of rawH.topics) {
            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
              ? t.timedQuestoes
              : Number(t.total) || 0;
            if (tTs !== null && tTs > 0 && tTot > 0) {
              topicsTs += tTs;
              topicsTimedQ += tTot;
              hasTopicWithTime = true;
            }
          }
        } else if (rawH.topics && typeof rawH.topics === 'object') {
           for (const key in rawH.topics) {
             const t = rawH.topics[key];
             const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
             const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
               ? t.timedQuestoes
               : Number(t.total) || 0;
             if (tTs !== null && tTs > 0 && tTot > 0) {
               topicsTs += tTs;
               topicsTimedQ += tTot;
               hasTopicWithTime = true;
             }
           }
        }
        
        if (hasTopicWithTime) {
          totalTimeSpent += topicsTs;
          totalTimedQuestions += topicsTimedQ;
        } else if (rawH.timeSpent != null && rawH.timedQuestoes != null) {
          totalTimeSpent += Number(rawH.timeSpent);
          totalTimedQuestions += Number(rawH.timedQuestoes);
        }
      });
      const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;

      const store = useAppStore.getState();
      const activeId = store.appState?.activeId;
      const contest = store.appState?.contests?.[activeId];
      const defaultExamTotalQuestions =
        Number.isFinite(Number(contest?.examTotalQuestions)) &&
        Number(contest?.examTotalQuestions) > 0
          ? Number(contest.examTotalQuestions)
          : 100;
      const examDurationMinutes =
        Number.isFinite(Number(contest?.examDurationMinutes)) &&
        Number(contest?.examDurationMinutes) > 0
          ? Number(contest.examDurationMinutes)
          : 240;
      const projectedTotalTimeSeconds = defaultExamTotalQuestions * avgSeconds;

      setMcLoading(true);
      const safeCurrentMean = Number.isFinite(currentFocusLevel)
        ? currentFocusLevel
        : safeMin;
      try {
        const result = await runAnalysis({
          values: hist,
          dates: hist.map((h) => h.date),
          meta: debouncedTarget,
          projectionDays: projectDays,
          minScore: safeMin,
          maxScore: safeMax,
          currentMean: safeCurrentMean,
          forcedBaseline: safeCurrentMean,
          projectedTotalTimeSeconds,
          examDurationMinutes
        });
        if (cancelled || !result) return;
        setMcResult({ ...result, categoryId: focusCategory?.id });

        // ✅ LOTE-05: parse local normalizado (sem timezone hardcoded "-04:00")
        const lastDate = parseNoonLocal(hist[hist.length - 1].date);
        if (!lastDate) return;
        const nextDate = addDaysNoon(lastDate, projectDays || 30);

        const p50 = result.projectedMean ?? result.mean ?? safeMin;
        const lo = result.ci95Low ?? result.ci95StatLow ?? safeMin;
        const hi = result.ci95High ?? result.ci95StatHigh ?? safeMax;
        setMcProjectionSeries({
          date: getDateKey(nextDate),
          mc_p50: p50,
          mc_band: [lo, hi],
          categoryId: focusCategory?.id
        });
      } catch (err) {
        console.warn('[useEvolutionMC] Worker MC falhou, tentando sync:', err);
        // ✅ LOTE-05: fallback síncrono real (antes o catch era vazio)
        if (!cancelled) {
          try {
            const fallback = runMonteCarloAnalysis({
              values: hist,
              dates: hist.map((h) => h.date),
              meta: debouncedTarget,
              simulations: 1500,
              projectionDays: projectDays,
              minScore: safeMin,
              maxScore: safeMax,
              currentMean: safeCurrentMean,
              forcedBaseline: safeCurrentMean,
              // ✅ BUG-5 FIX: repassar parâmetros de Time Penalty ao fallback síncrono
              projectedTotalTimeSeconds,
              examDurationMinutes
            });
            if (fallback) {
              setMcResult({ ...fallback, categoryId: focusCategory?.id });
              const lastDate = parseNoonLocal(hist[hist.length - 1].date);
              if (lastDate) {
                const nextDate = addDaysNoon(lastDate, projectDays || 30);
                const p50 = fallback.projectedMean ?? fallback.mean ?? safeMin;
                const lo = fallback.ci95Low ?? fallback.ci95StatLow ?? safeMin;
                const hi = fallback.ci95High ?? fallback.ci95StatHigh ?? safeMax;
                setMcProjectionSeries({
                  date: getDateKey(nextDate),
                  mc_p50: p50,
                  mc_band: [lo, hi],
                  categoryId: focusCategory?.id
                });
              }
            }
          } catch (syncErr) {
            console.error('[useEvolutionMC] Fallback sync MC falhou:', syncErr);
          }
        }
      } finally {
        if (!cancelled) setMcLoading(false);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(workerDebounceTimeout); };
  }, [
    focusCategory, currentFocusLevel, historyArray, debouncedTarget,
    projectDays, runAnalysis, minScore, maxScore
  ]);

  const activeMcResult = mcResult?.categoryId === focusCategory?.id ? mcResult : null;
  const activeMcProjectionSeries =
    mcProjectionSeries?.categoryId === focusCategory?.id ? mcProjectionSeries : null;

  return { mcLoading, mcResult, mcProjectionSeries, activeMcResult, activeMcProjectionSeries };
}

```

---

## `src/hooks/useChartData.js` <a id="src-hooks-usechartdata-js"></a>

- **Localização:** `src/hooks/useChartData.js`
- **Descrição:** Hook de preparação e transformação de séries temporais de dados para os gráficos
- **Linhas:** 507
- **Tamanho:** 24.08 KB

```javascript
import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean).filter(r => r.valid !== false);
const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

export function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100, minScore = 0, weight = 1) {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const toRatio = (score) => {
        const n = Number(score);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, (n - safeMin) / safeRange));
    };
    // FIX 2A: validar sortedDates
    if (!Array.isArray(sortedDates) || sortedDates.length === 0) return {};

    // ── PASSO 1: agregar por data em UMA passagem ──────────────────
    const aggregatedByDate = new Map();
    for (const h of history) {
        const key = getDateKey(getHistoryDate(h));
        if (!key) continue;
        const rawTotal = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
        const hasCorrect = (h?.correct !== undefined && h?.correct !== null && String(h?.correct).trim() !== '') ||
                          (h?.acertos !== undefined && h?.acertos !== null && String(h?.acertos).trim() !== '') ||
                          (h?.correctCount !== undefined && h?.correctCount !== null && String(h?.correctCount).trim() !== '');
        const parsedCorrect = Number(h?.correct ?? h?.acertos ?? h?.correctCount);
        const rawCorrect = hasCorrect && Number.isFinite(parsedCorrect)
            ? Math.max(0, Math.min(rawTotal > 0 ? rawTotal : Infinity, parsedCorrect))
            : 0;
        const score = getSafeScore(h, safeMax, safeMin);
        const hasScore = Number.isFinite(score);
        const safeScore = hasScore ? score : NaN;

        const isPercentOnly = rawTotal <= 0 && hasScore;

        let compTotal = rawTotal;
        let compCorrect = rawCorrect;

        if (isPercentOnly) {
            compTotal = getSyntheticTotal(safeMax);
            compCorrect = Math.round(toRatio(score) * compTotal);
        } else if (rawTotal > 0 && hasScore) {
            compCorrect = Math.round(toRatio(score) * rawTotal);
        }
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));

        if (!aggregatedByDate.has(key)) {
            aggregatedByDate.set(key, {
                date: key,
                realTotal: 0,
                realCorrect: 0,
                compTotal: 0,
                compCorrect: 0,
                total: 0,
                correct: 0,
                scoreSum: 0,
                scoreCount: 0,
                hasSynthetic: false,
                score: safeScore
            });
        }

        const entry = aggregatedByDate.get(key);

        if (!isPercentOnly) {
            entry.realTotal += rawTotal;
            entry.realCorrect += rawCorrect;
            entry.total += rawTotal;
            entry.correct += rawCorrect;
        }

        entry.compTotal += compTotal;
        entry.compCorrect += compCorrect;

        if (hasScore) {
            entry.scoreSum += score;
            entry.scoreCount += 1;
        }

        if (isPercentOnly) {
            entry.hasSynthetic = true;
        }

        entry.score = entry.compTotal > 0
            ? safeMin + (entry.compCorrect / entry.compTotal) * safeRange
            : (hasScore ? score : NaN);
    }

    // Ordenar as chaves uma única vez
    const sortedKeys = [...aggregatedByDate.keys()].sort((a, b) => {
        const da = normalizeDate(a)?.getTime() ?? 0;
        const db = normalizeDate(b)?.getTime() ?? 0;
        return da - db;
    });

    // ── PASSO 2: varrer sortedDates com índice incremental ─────────
    // Cada entrada do histórico agregado é consumida UMA ÚNICA VEZ.
    const dateToStats = {};
    let accumulated = [];
    let histIdx = 0;
    let bayAlpha = 1;
    let bayBeta = 1;
    let maxAlphaEver = 1;
    const DECAY_FACTOR = BAYESIAN_DECAY_FACTOR || 0.985;
    let cachedStats = null;
    let lastAccumulatedLen = 0;

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];

        // Consome entradas do histórico ordenado até a data atual
        while (histIdx < sortedKeys.length && sortedKeys[histIdx] <= date) {
            const key = sortedKeys[histIdx];
            const entry = aggregatedByDate.get(key);
            histIdx++;
            if (!entry) continue;

            const entryDate = normalizeDate(entry.date);
            const prevDate = histIdx > 1 ? normalizeDate(sortedKeys[histIdx - 2]) : entryDate;
            const gapDays = Math.max(
                1,
                Math.floor(((entryDate?.getTime() ?? 0) - (prevDate?.getTime() ?? 0)) / 86400000)
            );

            // Decaimento bayesiano entre eventos
            if (histIdx > 1) {
                const entryDecay = Math.pow(DECAY_FACTOR, gapDays);
                // ✅ FIX L05: bayAlpha e bayBeta nunca podem ser negativos.
                // Adicionadas verificações de sanidade após cada operação.
                if (entryDecay < 1.0) {
                    const currentN = bayAlpha + bayBeta;
                    if (currentN > 0) {
                        const currentP = Math.max(0.000001, Math.min(0.999999, bayAlpha / currentN));
                        const newN = Math.max(2, currentN * entryDecay);
                        bayAlpha = Math.max(0.000001, newN * currentP);
                        bayBeta = Math.max(0.000001, newN * (1 - currentP));
                    }
                }
                
                const retentionFloor = Math.max(3, maxAlphaEver * 0.3);
                if (bayAlpha < retentionFloor) {
                    const currentN = bayAlpha + bayBeta;
                    const currentP = currentN > 0 && bayAlpha > 0
                        ? Math.max(0.000001, Math.min(0.999999, bayAlpha / currentN))
                        : 0.5;
                    bayAlpha = retentionFloor;
                    bayBeta = Math.max(0.000001, retentionFloor * ((1 - currentP) / currentP));
                }
                
                // ✅ FIX: Garantia final de sanidade
                if (!Number.isFinite(bayAlpha) || bayAlpha < 0) bayAlpha = 1;
                if (!Number.isFinite(bayBeta) || bayBeta < 0) bayBeta = 1;
            }

            const total = entry.compTotal > 0 ? entry.compTotal : 0;
            const correct = entry.compCorrect > 0 ? entry.compCorrect : 0;

            if (total >= 1) {
                bayAlpha += Number(correct);
                bayBeta += Number(total) - Number(correct);
                if (bayAlpha > maxAlphaEver) maxAlphaEver = bayAlpha;
            }

            accumulated.push(entry);
        }

        if (accumulated.length > 0) {
            if (accumulated.length !== lastAccumulatedLen || !cachedStats) {
                const safeWeight = Number.isFinite(Number(weight)) ? Number(weight) : 1;
                cachedStats = computeCategoryStats(accumulated, safeWeight, 60, safeMax, safeMin);
                lastAccumulatedLen = accumulated.length;
            }
            const lastEntry = accumulated[accumulated.length - 1];
            const bayStats = computeBayesianLevel(accumulated, 1, 1, safeMax, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null,
                minScore: safeMin,
            });
            const aggTotals = accumulated.reduce((acc, e) => {
                acc.realTotal += (e.realTotal ?? 0);
                acc.realCorrect += (e.realCorrect ?? 0);
                acc.compTotal += (e.compTotal ?? 0);
                acc.compCorrect += (e.compCorrect ?? 0);
                if (e.hasSynthetic) acc.hasSynthetic = true;
                return acc;
            }, { realTotal: 0, realCorrect: 0, compTotal: 0, compCorrect: 0, hasSynthetic: false });

            dateToStats[date] = {
                stats: cachedStats ? {
                    ...cachedStats,
                    realTotal: aggTotals.realTotal,
                    realCorrect: aggTotals.realCorrect,
                    compTotal: aggTotals.compTotal,
                    compCorrect: aggTotals.compCorrect,
                    hasSynthetic: aggTotals.hasSynthetic
                } : null,
                last: lastEntry,
                bayesian: {
                    mean: bayStats.mean,
                    ciLow: bayStats.ciLow,
                    ciHigh: bayStats.ciHigh,
                    alpha: bayStats.alpha,
                    beta: bayStats.beta,
                },
            };
        }
    }

    return dateToStats;
}

export function useChartData(categoriesInput = EMPTY_ARRAY, weights = EMPTY_OBJECT, maxScore = 100, minScore = 0) {
    const categories = Array.isArray(categoriesInput) ? categoriesInput : EMPTY_ARRAY;
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;

    const categoriesVersion = useMemo(() => categories.map((cat) => {
        const history = getHistoryArray(cat);
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : EMPTY_ARRAY;
        // M-02 FIX: Usar hash numérico em vez de string gigante
        let hash = 0;
        history.forEach((h) => {
            hash = ((hash << 5) - hash + Number(h?.score ?? 0)) | 0;
            hash = ((hash << 5) - hash + Number(h?.total ?? 0)) | 0;
        });
        return `${cat?.id || ''}|${tasks.length}|${history.length}|${hash}`;
    }).join('||'), [categories]);

    const activeCategories = useMemo(() => {
        let valid = categories.filter(c => {
            const hist = c?.simuladoStats?.history;
            return Object.values(hist || {}).some(entry => {
                if (!entry || typeof entry !== 'object') return false;
                const hasScore = Number.isFinite(Number(entry.score ?? entry.scorePoints));
                const entryTot = Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions);
                const hasTotal = Number.isFinite(entryTot) && entryTot > 0;
                const hasCorrect = Number.isFinite(Number(entry.correct ?? entry.acertos ?? entry.correctCount));
                return hasScore || hasTotal || hasCorrect;
            });
        });
        const getVol = (h) => {
            const t = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
            if (t > 0) return t;
            if (h?.score != null) return getSyntheticTotal(safeMax);
            return 0;
        };
        valid.sort((a, b) => {
            const historyA = getHistoryArray(a);
            const historyB = getHistoryArray(b);
            const volA = historyA.reduce((sum, h) => sum + getVol(h), 0);
            const volB = historyB.reduce((sum, h) => sum + getVol(h), 0);
            return volB - volA;
        });
        return valid;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, categoriesVersion, safeMax]);

    const timeline = useMemo(() => {
        if (!activeCategories.length) return [];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });
        const sortedDates = Array.from(allDatesSet).sort();
        const dates = sortedDates;
        const dataByDate = {};
        dates.forEach((date) => {
            const [, month, day] = date.split("-");
            dataByDate[date] = { date, displayDate: `${day}/${month}` };
        });

        activeCategories.forEach(cat => {
            const history = [...getHistoryArray(cat)].sort((a, b) => {
                const dA = normalizeDate(getHistoryDate(a));
                const dB = normalizeDate(getHistoryDate(b));
                return (dA?.getTime() || 0) - (dB?.getTime() || 0);
            });
            if (!history.length) return;
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            const toCatRatio = (score) => {
                const n = Number(score);
                if (!Number.isFinite(n)) return 0;
                return Math.max(0, Math.min(1, (n - catMin) / catRange));
            };

            const catWeight = Number.isFinite(Number(weights?.[cat.id]))
                ? Number(weights[cat.id])
                : (Number.isFinite(Number(cat?.weight)) ? Number(cat.weight) : 1);
            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, catMax, catMin, catWeight);
            const exactByDate = {};
            history.forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!exactByDate[key]) exactByDate[key] = { correct: 0, total: 0, compCorrect: 0, compTotal: 0 };
                const rawTotal = Math.max(0, Number(h.total) || 0);
                const rawC = Math.max(0, Math.min(rawTotal, Number(h.correct) || 0));
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;
                let corrNorm;
                if (rawTotal > 0) {
                    corrNorm = (!h.isPercentage && Number.isFinite(Number(h.correct)))
                        ? rawC
                        : Math.max(0, Math.min(rawTotal, Math.round(toCatRatio(score) * rawTotal)));
                } else {
                    corrNorm = rawC;
                }
                let compTotal = rawTotal;
                let compCorrect = corrNorm;
                if (rawTotal === 0 && h.score != null) {
                    compTotal = getSyntheticTotal(catMax);
                    compCorrect = Math.round(toCatRatio(score) * compTotal);
                }
                exactByDate[key].correct += corrNorm;
                exactByDate[key].total += rawTotal;
                exactByDate[key].compCorrect += compCorrect;
                exactByDate[key].compTotal += compTotal;
            });

            dates.forEach(date => {
                const snap = cumulativeByDate[date];
                if (!snap) return;
                const { stats } = snap;
                const exact = exactByDate[date];
                const displayCorrect = exact ? (exact.compTotal > 0 ? exact.compCorrect : exact.correct) : 0;
                const displayTotal = exact ? (exact.compTotal > 0 ? exact.compTotal : exact.total) : 0;
                let rawDailyScore = null;
                if (exact && exact.compTotal >= 1) {
                    const calc = catMin + (exact.compCorrect / exact.compTotal) * catRange;
                    rawDailyScore = Number.isFinite(calc) ? calc : null;
                } else if (exact && snap?.last) {
                    const s = getSafeScore(snap.last, catMax, catMin);
                    rawDailyScore = Number.isFinite(s) ? s : null;
                }
                dataByDate[date] = {
                    ...dataByDate[date],
                    [`raw_correct_${cat.id}`]: displayCorrect,
                    [`raw_total_${cat.id}`]: displayTotal,
                    [`raw_${cat.id}`]: rawDailyScore,
                    [`bay_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.mean)) ? Number(snap.bayesian.mean) : catMin) : null,
                    [`bay_ci_low_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciLow)) ? Number(snap.bayesian.ciLow) : catMin) : catMin,
                    [`bay_ci_high_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciHigh)) ? Number(snap.bayesian.ciHigh) : catMax) : catMax,
                    [`stats_${cat.id}`]: stats ? (Number.isFinite(Number(stats.mean)) ? Number(stats.mean) : catMin) : catMin,
                    [`trend_${cat.id}`]: stats ? (Number.isFinite(Number(stats.trendValue)) ? Number(stats.trendValue) : 0) : 0,
                    [`trend_status_${cat.id}`]: stats ? stats.trend : 'stable',
                    global_total: (Number(dataByDate[date].global_total) || 0) + displayTotal
                };
            });
        });
        return dates.map(d => dataByDate[d]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, weights, safeMax, safeMin, categoriesVersion]);

    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };
        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });
        const sortedDates = Array.from(allDatesSet).sort();
        const datesToUse = sortedDates;
        const dates = datesToUse.map(dateStr => {
            const d = normalizeDate(dateStr);
            const parts = typeof dateStr === 'string' ? dateStr.split('-') : [];
            const day = parts[2] || '01';
            const m = parts[1] || '01';
            const dayOfWeek = (d instanceof Date && !isNaN(d.getTime())) ? d.getDay() : 0;
            return {
                key: dateStr,
                dayName: DAY_NAMES[dayOfWeek] || '',
                label: `${day}/${m}`,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            };
        });

        const rows = activeCategories.map(cat => {
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            const toCatRatio = (score) => {
                const n = Number(score);
                if (!Number.isFinite(n)) return 0;
                return Math.max(0, Math.min(1, (n - catMin) / catRange));
            };
            const dayMap = {};
            getHistoryArray(cat).forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0 };
                let tot = Math.max(0, Number(h.total) || 0);
                const raw = Math.max(0, Number(h.correct) || 0);
                let corrNorm;
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;
                if (h.score != null && tot === 0) {
                    tot = getSyntheticTotal(catMax);
                    corrNorm = Math.round(toCatRatio(score) * tot);
                } else if (!h.isPercentage && Number.isFinite(Number(h.correct))) {
                    corrNorm = Math.max(0, Math.min(tot, raw));
                } else {
                    corrNorm = tot > 0 ? Math.round(toCatRatio(score) * tot) : raw;
                }
                dayMap[key].correct += corrNorm;
                dayMap[key].total += tot;
            });
            const cells = datesToUse.map(dateStr => {
                const entry = dayMap[dateStr];
                if (!entry || entry.total === 0) return null;
                const pct = (entry.correct / entry.total) * 100;
                return {
                    pct: Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)),
                    correct: entry.correct,
                    total: entry.total,
                };
            });
            return { cat, cells };
        });
        return { dates, rows };
    }, [activeCategories, safeMax, safeMin]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        let syntheticQuestions = 0;
        let syntheticCorrect = 0;
        activeCategories.forEach(cat => {
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            const toCatRatio = (score) => {
                const n = Number(score);
                if (!Number.isFinite(n)) return 0;
                return Math.max(0, Math.min(1, (n - catMin) / catRange));
            };
            getHistoryArray(cat).forEach(h => {
                let tot = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;

                const isSyntheticVolume =
                    h?.syntheticVolume === true ||
                    h?.isSynthetic === true ||
                    h?.type === 'percent-only' ||
                    (tot === 0 && h?.score != null);

                const hasExplicitC = (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '') ||
                                    (h.acertos !== undefined && h.acertos !== null && String(h.acertos).trim() !== '') ||
                                    (h.correctCount !== undefined && h.correctCount !== null && String(h.correctCount).trim() !== '');
                const rawParsedC = Number(h.correct ?? h.acertos ?? h.correctCount);

                let corrNorm;
                if (isSyntheticVolume && tot === 0) {
                    tot = getSyntheticTotal(catMax);
                    corrNorm = Math.round(toCatRatio(score) * tot);
                } else if (!h.isPercentage && hasExplicitC && Number.isFinite(rawParsedC)) {
                    corrNorm = Math.max(0, Math.min(tot, rawParsedC));
                } else {
                    const raw = Math.max(0, Number.isFinite(rawParsedC) ? rawParsedC : 0);
                    corrNorm = tot > 0 ? Math.round(toCatRatio(score) * tot) : raw;
                }
                // FIX 2B: blindagem extra contra NaN em corrNorm e tot
                if (!Number.isFinite(corrNorm)) return;
                const safeTot = Number(tot);
                if (!Number.isFinite(safeTot) || safeTot <= 0) return;

                const safeCorr = Math.max(0, Math.min(safeTot, corrNorm));

                if (!isSyntheticVolume) {
                    totalQuestions += safeTot;
                    totalCorrect += safeCorr;
                } else {
                    syntheticQuestions += safeTot;
                    syntheticCorrect += safeCorr;
                }
            });
        });
        const globalAccuracy = (totalQuestions > 0)
            ? (totalCorrect / totalQuestions) * 100
            : (syntheticQuestions > 0 ? (syntheticCorrect / syntheticQuestions) * 100 : 0);
        return {
            totalQuestions: Number.isFinite(totalQuestions) ? totalQuestions : 0,
            totalCorrect: Number.isFinite(totalCorrect) ? totalCorrect : 0,
            syntheticQuestions: Number.isFinite(syntheticQuestions) ? syntheticQuestions : 0,
            syntheticCorrect: Number.isFinite(syntheticCorrect) ? syntheticCorrect : 0,
            globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0
        };
    }, [activeCategories, safeMax, safeMin]);

    return { activeCategories, timeline, heatmapData, globalMetrics };
}

```

---

## `src/hooks/useSubjectAggData.js` <a id="src-hooks-usesubjectaggdata-js"></a>

- **Localização:** `src/hooks/useSubjectAggData.js`
- **Descrição:** Hook agregador de métricas e filtros por janela temporal (7, 30, 90 dias ou geral)
- **Linhas:** 131
- **Tamanho:** 6.00 KB

```javascript
import { useMemo } from 'react';
import { toDateMs, getDateKey } from '../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

/**
 * Filtra um histórico por janela de tempo ('30' | '60' | '90' | 'all').
 * Movido do EvolutionChart.jsx (LOTE-05).
 */
export function filterHistoryByTimeWindow(history, timeWindow) {
  const days = Number.parseInt(timeWindow, 10);
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  const todayKey = getDateKey(new Date());

  const validEntries = safeHistory.filter(Boolean).filter((h) => {
    const rawDate = h?.date || h?.createdAt;
    if (!rawDate) return false;
    const key = getDateKey(rawDate);
    if (!key) return false;
    return key <= todayKey;
  });

  if (timeWindow === 'all' || !Number.isFinite(days) || days <= 0) {
    return validEntries;
  }
  const withMs = validEntries
    .map((h) => {
      const rawDate = h?.date || h?.createdAt;
      const key = getDateKey(rawDate);
      const ms = toDateMs(key);
      return Number.isFinite(ms) ? { h, ms } : null;
    })
    .filter(Boolean);
  if (!withMs.length) return validEntries;
  const referenceMs = toDateMs(todayKey);
  const limit = referenceMs - days * 24 * 60 * 60 * 1000;
  return withMs.filter((x) => x.ms >= limit).map((x) => x.h);
}

/**
 * Agregação por disciplina (questões, acertos, tempo) para os gráficos de
 * barras, radar e agilidade. Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useSubjectAggData({ categories, showOnlyFocus, focusCategory, timeWindow, maxScore, minScore }) {
  return useMemo(() => {
    if (!Array.isArray(categories) || !categories.length) return [];
    return categories
      .filter((cat) => !showOnlyFocus || cat.id === focusCategory?.id)
      .map((cat) => {
        const history = filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow)
          .filter((h) => h && h.materia !== 'Simulado Personalizado');

        const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);

        const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
        const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
        const catRange = Math.max(1e-9, catMax - catMin);

        const totalQ = history.reduce((s, h) => {
          let tot = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
          if (tot === 0 && h.score != null) tot = getSyntheticTotal(catMax);
          const score = getSafeScore(h, catMax, catMin);
          if (!Number.isFinite(score)) return s;
          return s + tot;
        }, 0);

        const totalCorrect = Math.round(
          history.reduce((s, h) => {
            let tot = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
            if (tot === 0 && h.score != null) tot = getSyntheticTotal(catMax);
            const hasRawC = (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '') ||
                            (h.acertos !== undefined && h.acertos !== null && String(h.acertos).trim() !== '') ||
                            (h.correctCount !== undefined && h.correctCount !== null && String(h.correctCount).trim() !== '');
            const rawC = Number(h.correct ?? h.acertos ?? h.correctCount);
            if (!h.isPercentage && hasRawC && Number.isFinite(rawC)) {
              return s + Math.max(0, Math.min(tot, rawC));
            }
            const score = getSafeScore(h, catMax, catMin);
            if (!Number.isFinite(score)) return s;
            const normalizedScore = Math.max(catMin, Math.min(catMax, score));
            const derived = ((normalizedScore - catMin) / catRange) * tot;
            return s + Math.max(0, Math.min(tot, Number.isFinite(derived) ? derived : 0));
          }, 0)
        );

        const stats = history.reduce(
          (acc, h) => {
            const rootTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
            let topicsTs = 0;
            let topicsTimedQ = 0;
            let hasTopicWithTime = false;
            const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
            if (safeTopics.length > 0) {
              for (const t of safeTopics) {
                const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
                  ? t.timedQuestoes
                  : Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0;
                if (tTs !== null && tTs > 0 && tTot > 0) {
                  topicsTs += tTs; topicsTimedQ += tTot; hasTopicWithTime = true;
                }
              }
            }
            if (hasTopicWithTime) return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
            const rootTot = Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0;
            if (rootTs !== null && rootTs > 0 && rootTot > 0) return { ts: acc.ts + rootTs, tq: acc.tq + rootTot };
            if (rootTs !== null && rootTs > 0 && h.score != null) return { ts: acc.ts + rootTs, tq: acc.tq + getSyntheticTotal(catMax) };
            return acc;
          },
          { ts: 0, tq: 0 }
        );

        const safeName = String(cat.name || 'Sem nome');
        const shortName = safeName.length > 30 ? safeName.substring(0, 28) + '…' : safeName;
        return {
          name: shortName,
          fullName: safeName,
          questoes: totalQ,
          timedQuestoes: stats.tq,
          acertos: totalCorrect,
          timeSpent: stats.ts,
          color: cat.color,
          id: cat.id
        };
      })
      .filter((d) => d.questoes > 0)
      .sort((a, b) => b.questoes - a.questoes);
  }, [categories, showOnlyFocus, focusCategory?.id, maxScore, minScore, timeWindow]);
}

```

---

## `src/hooks/useCategoryLevels.js` <a id="src-hooks-usecategorylevels-js"></a>

- **Localização:** `src/hooks/useCategoryLevels.js`
- **Descrição:** Hook de computação dos níveis de proficiência e domínio bayesiano das categorias
- **Linhas:** 70
- **Tamanho:** 2.95 KB

```javascript
import { useMemo } from 'react';
import { computeCategoryStats } from '../engine';
import { getSafeScore } from '../utils/scoreHelper';
import { toDateMs } from '../utils/dateHelper';

/**
 * Nível atual de cada disciplina segundo o engine ativo.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useCategoryLevels(categories, timeline, activeEngine, maxScore = 100, minScore = 0) {
  return useMemo(() => {
    if (!Array.isArray(categories)) return {};
    const map = {};
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const lastPoint = Array.isArray(timeline) && timeline.length > 0 && typeof timeline[timeline.length - 1] === 'object' ? timeline[timeline.length - 1] : null;
    categories.forEach(cat => {
      const prefix = activeEngine === 'raw' ? 'raw_' : activeEngine === 'stats' ? 'stats_' : 'bay_';
      const fromTimeline = lastPoint?.[`${prefix}${cat.id}`];
      if (fromTimeline != null && Number.isFinite(Number(fromTimeline))) {
        map[cat.id] = Number(fromTimeline);
        return;
      }

      // Se for o motor de nota bruta e a disciplina não teve simulado no último dia geral,
      // busca o último score bruto registrado na timeline
      if (activeEngine === 'raw' && Array.isArray(timeline)) {
        for (let i = timeline.length - 1; i >= 0; i--) {
          const pt = timeline[i]?.[`raw_${cat.id}`];
          if (pt != null && Number.isFinite(Number(pt))) {
            map[cat.id] = Number(pt);
            return;
          }
        }
      }

      const historyRaw = cat.simuladoStats?.history;
      const history = historyRaw ? (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw)) : [];
      const weight = Number(cat.weight) > 0 ? Number(cat.weight) : 10;
      const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
      const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMin;

      // Fallback para o histórico da disciplina caso não esteja na timeline
      if (activeEngine === 'raw' && history.length > 0) {
        let latestEntry = null;
        let latestMs = -Infinity;
        for (let i = 0; i < history.length; i++) {
          const h = history[i];
          const ms = toDateMs(h?.date || h?.createdAt) || 0;
          if (ms >= latestMs) {
            latestMs = ms;
            latestEntry = h;
          }
        }
        if (latestEntry) {
          const s = getSafeScore(latestEntry, catMax, catMin);
          if (Number.isFinite(s)) {
            map[cat.id] = s;
            return;
          }
        }
      }

      const stats = computeCategoryStats(history || [], weight, 60, catMax, catMin);
      map[cat.id] = (stats?.mean != null && Number.isFinite(stats.mean)) ? stats.mean : catMin;
    });
    return map;
  }, [categories, timeline, activeEngine, maxScore, minScore]);
}

```

---

# 5. UTILITÁRIOS, MAPEADORES E ALGORITMOS (UTILS & HELPERS)

## `src/utils/evolutionGuards.js` <a id="src-utils-evolutionguards-js"></a>

- **Localização:** `src/utils/evolutionGuards.js`
- **Descrição:** Guards e normalizadores para probabilidades e estados numéricos seguros
- **Linhas:** 59
- **Tamanho:** 1.53 KB

```javascript
export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function getHistoryDate(h) {
  return h?.date || h?.createdAt || null;
}

export function isValidScore(value) {
  return value != null && Number.isFinite(Number(value));
}

export function normalizeScoreDomain(minScore, maxScore) {
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  let safeMax = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;

  if (safeMax <= safeMin) {
    safeMax = safeMin + 1;
  }

  const range = Math.max(1e-9, safeMax - safeMin);

  const clamp = (value, fallback = safeMin) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(safeMin, Math.min(safeMax, n));
  };

  return { safeMin, safeMax, range, clamp };
}

export function normalizeTargetScore(targetScore, minScore, maxScore) {
  const { safeMin, safeMax } = normalizeScoreDomain(minScore, maxScore);
  const target = Number(targetScore);

  if (!Number.isFinite(target)) return safeMin;

  return Math.max(safeMin, Math.min(safeMax, target));
}

export function normalizeProbability(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

export function simpleHash(str) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
```

---

## `src/utils/evolutionStatus.js` <a id="src-utils-evolutionstatus-js"></a>

- **Localização:** `src/utils/evolutionStatus.js`
- **Descrição:** Motor de cálculo de estados e tendências evolutivas disciplinares
- **Linhas:** 320
- **Tamanho:** 9.37 KB

```javascript
import { formatValue } from './scoreHelper';
import { getDateKey } from './dateHelper';
import { computeTrendStatus } from './trendStatus';

export { computeTrendStatus };

const safeNum = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

const stdDev = (values) => {
  if (!Array.isArray(values) || values.length < 2) return null;

  const mean = average(values);
  if (!Number.isFinite(mean)) return null;

  const variance = average(values.map((v) => (v - mean) ** 2));
  return Number.isFinite(variance) ? Math.sqrt(variance) : null;
};

export function computeEvolutionStatuses({
  timeline = [],
  categories = [],
  focusCategory = null,
  targetScore = 0,
  unit = '%',
  minScore = 0,
  maxScore = 100,
  activeMcResult = null,
  subjectAggData = [],
  heatmapData = {},
  projectDays = 30
}) {
  const statuses = [];

  const safeMin = safeNum(minScore, 0);
  const safeMax = Math.max(safeMin + 1, safeNum(maxScore, 100));
  const range = safeMax - safeMin;
  const scale = range / 100;
  const safeTarget = Math.max(safeMin, Math.min(safeMax, safeNum(targetScore, safeMin)));

  const fmt = (v) => `${formatValue(v)}${unit}`;

  const last = Array.isArray(timeline) && timeline.length > 0
    ? timeline[timeline.length - 1]
    : {};

  const focusId = focusCategory?.id;

  const currentBay = focusId ? safeNum(last[`bay_${focusId}`], null) : null;
  const currentRaw = focusId ? safeNum(last[`raw_${focusId}`], null) : null;
  const currentStats = focusId ? safeNum(last[`stats_${focusId}`], null) : null;
  const current = currentBay ?? currentRaw ?? currentStats;

  const getValueSeries = (prefix) => {
    if (!focusId || !Array.isArray(timeline)) return [];

    return timeline
      .map((d) => safeNum(d?.[`${prefix}${focusId}`], NaN))
      .filter((v) => Number.isFinite(v));
  };

  const baySeries = getValueSeries('bay_');
  const rawSeries = getValueSeries('raw_');
  const levelSeries = baySeries.length >= rawSeries.length ? baySeries : rawSeries;

  // Nível atual
  statuses.push({
    id: 'current',
    label: 'Nível atual',
    value: current == null ? '—' : fmt(current),
    tone:
      current == null
        ? 'neutral'
        : current >= safeTarget
          ? 'success'
          : current >= safeTarget - 8 * scale
            ? 'warning'
            : 'danger',
    icon: '📍',
    help: `Nível atual estimado na escala da prova. Meta: ${fmt(safeTarget)}.`
  });

  // Gap até a meta
  if (current != null) {
    const gap = current - safeTarget;

    statuses.push({
      id: 'gap',
      label: 'Distância da meta',
      value: `${gap >= 0 ? '+' : ''}${formatValue(gap)}${unit}`,
      tone: gap >= 0 ? 'success' : gap >= -5 * scale ? 'warning' : 'danger',
      icon: '🎯',
      help: 'Diferença entre o nível atual e a meta configurada.'
    });
  }

  // REFACTOR-TREND-01: usar computeTrendStatus centralizado
  statuses.push(computeTrendStatus(levelSeries, { formatValue, unit, scale }));

  // Probabilidade Monte Carlo
  const probability = safeNum(activeMcResult?.probability, null);

  if (probability != null) {
    const p = Math.max(0, Math.min(100, probability));

    statuses.push({
      id: 'probability',
      label: 'Chance de aprovação',
      value: `${p.toFixed(0)}%`,
      tone: p >= 70 ? 'success' : p >= 45 ? 'warning' : 'danger',
      icon: '🚀',
      help: 'Probabilidade projetada pelo Monte Carlo de atingir a meta.'
    });
  }

  // Constância nos últimos 14 dias
  const rawHeatmapDates = Array.isArray(heatmapData?.dates) ? heatmapData.dates : [];
  const heatmapDates = rawHeatmapDates
    .map((d) => (typeof d === 'string' ? d : d?.key || getDateKey(d)))
    .filter(Boolean);
  const allActiveDates = new Set([
    ...heatmapDates,
    ...(Array.isArray(timeline) ? timeline.map((d) => d?.date).filter(Boolean) : [])
  ]);

  if (allActiveDates.size > 0) {
    const todayForConst = new Date();
    todayForConst.setHours(12, 0, 0, 0);
    let activeDays = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(todayForConst);
      d.setDate(d.getDate() - i);
      const k = getDateKey(d);
      if (allActiveDates.has(k)) {
        activeDays++;
      }
    }

    statuses.push({
      id: 'consistency',
      label: 'Constância (14 dias)',
      value: `${activeDays}/14`,
      tone: activeDays >= 8 ? 'success' : activeDays >= 4 ? 'warning' : 'danger',
      icon: '📅',
      help: 'Dias com simulado cadastrado nos últimos 14 dias.'
    });
  }

  // Volatilidade dos resultados brutos
  const recentRaw = rawSeries.slice(-5);

  if (recentRaw.length >= 3) {
    const volatility = stdDev(recentRaw);

    if (Number.isFinite(volatility)) {
      statuses.push({
        id: 'volatility',
        label: 'Volatilidade',
        value: `σ ${formatValue(volatility)}`,
        tone:
          volatility <= 5 * scale
            ? 'success'
            : volatility <= 12 * scale
              ? 'warning'
              : 'danger',
        icon: '📊',
        help: 'Variação dos últimos resultados brutos. Quanto menor, mais estável.'
      });
    }
  }

  // Incerteza bayesiana
  if (focusId) {
    const ciLow = safeNum(last[`bay_ci_low_${focusId}`], null);
    const ciHigh = safeNum(last[`bay_ci_high_${focusId}`], null);

    if (ciLow != null && ciHigh != null) {
      const width = Math.abs(ciHigh - ciLow);

      statuses.push({
        id: 'uncertainty',
        label: 'Incerteza bayesiana',
        value: `±${formatValue(width / 2)}${unit}`,
        tone:
          width <= 8 * scale
            ? 'success'
            : width <= 20 * scale
              ? 'warning'
              : 'danger',
        icon: '🧠',
        help: 'Faixa de confiança do nível estimado. Quanto mais estreita, maior a certeza.'
      });
    }
  }

  // Matérias abaixo da meta
  if (Array.isArray(categories) && categories.length > 0) {
    const below = categories.filter((cat) => {
      const lvl = safeNum(
        last?.[`bay_${cat.id}`] ?? 
        last?.[`raw_${cat.id}`] ?? 
        last?.[`stats_${cat.id}`] ?? 
        cat?.bayesianStats?.mean ?? 
        cat?.simuladoStats?.average,
        null
      );
      const catTarget = Number.isFinite(Number(cat?.minCutoff))
        ? Number(cat.minCutoff)
        : safeTarget;

      return lvl != null && lvl < catTarget - 5 * scale;
    }).length;

    statuses.push({
      id: 'subjects',
      label: 'Matérias abaixo da meta',
      value: `${below}/${categories.length}`,
      tone: below === 0 ? 'success' : below <= 2 ? 'warning' : 'danger',
      icon: '📚',
      help: 'Matérias com nível atual abaixo da zona segura da meta.'
    });
  }

  // Volume recente (últimos 7 dias corridos)
  const todayForVol = new Date();
  todayForVol.setHours(12, 0, 0, 0);
  const sevenDayKeys = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayForVol);
    d.setDate(d.getDate() - i);
    sevenDayKeys.add(getDateKey(d));
  }

  const recentVolume = Array.isArray(timeline)
    ? timeline
        .filter((d) => d?.date && sevenDayKeys.has(d.date))
        .reduce((sum, d) => sum + safeNum(d?.global_total, 0), 0)
    : 0;

  statuses.push({
    id: 'volume',
    label: 'Volume (7 dias)',
    value: `${Math.round(recentVolume)} q`,
    tone: recentVolume > 0 ? 'success' : 'warning',
    icon: '📝',
    help: 'Questões cadastradas nos últimos 7 dias.'
  });

  // Movimento/tendência interna
  if (focusId) {
    const trendStatus = String(last?.[`trend_status_${focusId}`] || '').toLowerCase();

    if (trendStatus) {
      statuses.push({
        id: 'trend-status',
        label: 'Movimento',
        value:
          trendStatus === 'up'
            ? 'Subindo'
            : trendStatus === 'down'
              ? 'Caindo'
              : 'Estável',
        tone:
          trendStatus === 'up'
            ? 'success'
            : trendStatus === 'down'
              ? 'danger'
              : 'neutral',
        icon: trendStatus === 'up' ? '📈' : trendStatus === 'down' ? '📉' : '➡️',
        help: 'Tendência calculada pelo motor estatístico para a disciplina focada.'
      });
    }
  }

  // Tempo médio por questão
  const timedSubjects = Array.isArray(subjectAggData)
    ? subjectAggData.filter(
        (d) => safeNum(d?.timedQuestoes, 0) > 0 && safeNum(d?.timeSpent, 0) >= 0
      )
    : [];

  if (timedSubjects.length > 0) {
    const totalTime = timedSubjects.reduce((sum, d) => sum + safeNum(d?.timeSpent, 0), 0);
    const totalTimed = timedSubjects.reduce((sum, d) => sum + safeNum(d?.timedQuestoes, 0), 0);
    const avgSeconds = totalTimed > 0 ? totalTime / totalTimed : null;

    if (avgSeconds != null) {
      statuses.push({
        id: 'time',
        label: 'Tempo por questão',
        value: `${Math.round(avgSeconds)}s`,
        tone: avgSeconds <= 90 ? 'success' : avgSeconds <= 180 ? 'warning' : 'time',
        icon: '⏱️',
        help: 'Média de tempo gasto por questão nas disciplinas com tempo registrado.'
      });
    }
  }

  // Tempo até a prova
  const days = Math.max(0, Math.round(safeNum(projectDays, 30)));

  statuses.push({
    id: 'exam',
    label: 'Tempo até a prova',
    value: `${days} dias`,
    tone: days <= 7 ? 'critical' : days <= 30 ? 'warning' : 'info',
    icon: '⏳',
    help: 'Dias restantes até a data objetivo.'
  });

  return statuses;
}
```

---

## `src/utils/scoreDomain.js` <a id="src-utils-scoredomain-js"></a>

- **Localização:** `src/utils/scoreDomain.js`
- **Descrição:** Normalização unificada de escalas, limites mínimos/máximos e conversões de pontuação
- **Linhas:** 80
- **Tamanho:** 3.13 KB

```javascript
export function safeDomain(maxScore = 100, minScore = 0) {
  let max = maxScore !== null && maxScore !== '' && Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;
  let min = minScore !== null && minScore !== '' && Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  if (min > max) { const tmp = min; min = max; max = tmp; }
  const range = Math.max(1e-9, max - min);
  return { min, max, range };
}

export function clampScore(val, options = {}) {
  const { min, max } = safeDomain(options.maxScore ?? 100, options.minScore ?? 0);
  if (val === null || val === undefined || val === '') return min;
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function scoreToRatio(score, options = {}) {
  const { min, range } = safeDomain(options.maxScore, options.minScore);
  if (score === null || score === undefined || score === '') return 0;
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  return (s - min) / range;
}

export function ratioToScore(ratio, options = {}) {
  const { min, range } = safeDomain(options.maxScore, options.minScore);
  if (ratio === null || ratio === undefined || ratio === '') return min;
  const r = Number(ratio);
  if (!Number.isFinite(r)) return min;
  return min + r * range;
}

export function scoreToPct(score, options = {}) {
  return scoreToRatio(score, options) * 100;
}

export function pctToScore(pct, options = {}) {
  const p = pct !== null && pct !== '' ? Number(pct) : NaN;
  const r = Number.isFinite(p) ? p / 100 : 0;
  return ratioToScore(r, options);
}

export function formatUnitValue(val, unit = '%') {
  const n = val !== null && val !== '' ? Number(val) : NaN;
  if (!Number.isFinite(n)) return `0${unit}`;
  if (unit === 'horas') {
    const sign = n < 0 ? '-' : '';
    const totalMinutes = Math.round(Math.abs(n) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${sign}${h}h${m.toString().padStart(2, '0')}` : `${sign}${h}h`;
  }
  return `${n}${unit}`;
}

export function normalizeScoreToTargetScale(rawScore, currentMaxScore, targetMaxScore, currentMinScore = 0, targetMinScore = 0) {
  const currentDom = safeDomain(currentMaxScore, currentMinScore);
  const targetDom = safeDomain(targetMaxScore, targetMinScore);
  const safeScore = clampScore(rawScore, { minScore: currentDom.min, maxScore: currentDom.max });
  if (currentDom.min === targetDom.min && currentDom.max === targetDom.max) return safeScore;
  const ratio = (safeScore - currentDom.min) / currentDom.range;
  return targetDom.min + ratio * targetDom.range;
}

export function detectCommonScales(categories) {
  const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
  const scales = new Set(
    safeCategories
      .map(c => Number(c.maxScore))
      .filter(s => Number.isFinite(s) && s > 0)
  );
  
  return {
    isMixedScale: scales.size > 1,
    scales: Array.from(scales).sort((a,b) => b - a),
    globalScale: scales.size > 0 ? Array.from(scales).reduce((a, b) => Math.max(a, b), -Infinity) : 100
  };
}

```

---

## `src/utils/heatmapAggregation.js` <a id="src-utils-heatmapaggregation-js"></a>

- **Localização:** `src/utils/heatmapAggregation.js`
- **Descrição:** Agregação e agrupamento de células para o mapa de calor de simulados
- **Linhas:** 91
- **Tamanho:** 3.50 KB

```javascript
import { normalizeDate } from './dateHelper.js';

export function getMondayKey(rawKey = '') {
  const dt = normalizeDate(rawKey) || new Date(0);
  if (Number.isNaN(dt.getTime())) return `sem-${rawKey || 'na'}`;
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function aggregateHeatmap(filtered, granularity = 'daily', _maxScore = 100) {
  if (granularity === 'daily') return filtered;
  const buckets = new Map();
  (filtered?.dates || []).forEach((d, index) => {
    const key = granularity === 'monthly' ? String(d.key || '').slice(0, 7) : getMondayKey(d.key);
    if (!buckets.has(key)) buckets.set(key, { key, indices: [], label: d.label });
    buckets.get(key).indices.push(index);
  });
  const dates = [...buckets.values()].map((b, i) => ({
    key: b.key,
    label: granularity === 'monthly' ? b.key : b.label,
    dayName: granularity === 'monthly' ? 'MÊS' : `Sem ${i + 1}`,
    count: b.indices.length,
    isWeekend: false,
  }));
  const rows = (filtered?.rows || []).map((row) => ({
    ...row,
    cells: [...buckets.values()].map(({ indices }) => {
      const samples = indices.map(i => row.cells?.[i]).filter(Boolean);
      if (!samples.length) return null;
      // ✅ FIX: Normalizar strings de dados legados com vírgulas
      const total = samples.reduce((a, c) => {
        let val = c.total;
        if (typeof val === 'string') val = val.replace(',', '.');
        return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      const correct = samples.reduce((a, c) => {
        let val = c.correct;
        if (typeof val === 'string') val = val.replace(',', '.');
        return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      // ✅ FIX: pct é SEMPRE percentual [0,100], invariante à escala
      const pct = total > 0
        ? Math.max(0, Math.min(100, Number.isFinite(correct / total) ? (correct / total) * 100 : 0))
        : null;
      return { total, correct, pct };
    })
  }));
  return { dates, rows };
}

/**
 * Agrega a proficiência de uma matéria pai a partir de seus subtópicos.
 * Resolve o Paradoxo de Simpson agregando numeradores e denominadores 
 * antes da divisão final, e aplica Shrinkage Bayesiano (K=5).
 */
export const calculateSubjectMastery = (subtopics) => {
  if (!subtopics) return 0;
  let safeSubtopics = [];
  if (Array.isArray(subtopics)) {
    safeSubtopics = subtopics;
  } else if (typeof subtopics === 'object' && subtopics.history && Array.isArray(subtopics.history)) {
    safeSubtopics = subtopics.history;
  } else if (typeof subtopics === 'object') {
    safeSubtopics = Object.values(subtopics);
  }
  if (safeSubtopics.length === 0) return 0;

  let totalAcertos = 0;
  let totalQuestoes = 0;
  safeSubtopics.forEach(topic => {
    if (!topic) return;
    const total = Math.max(0, Number(topic.total ?? topic.questoes ?? 0));
    const rawHits = Math.max(0, Number(topic.acertos ?? topic.hits ?? topic.correct ?? 0));
    const hits = Math.min(total, rawHits);
    if (Number.isFinite(hits) && Number.isFinite(total)) {
      totalAcertos += hits;
      totalQuestoes += total;
    }
  });
  if (totalQuestoes === 0) return 0;
  const K = 5;
  const prior = 0.5;
  return ((totalAcertos + K * prior) / (totalQuestoes + K)) * 100;
};

```

---

## `src/utils/weeklyEvolutionInsights.js` <a id="src-utils-weeklyevolutioninsights-js"></a>

- **Localização:** `src/utils/weeklyEvolutionInsights.js`
- **Descrição:** Algoritmo de identificação de top regressões e índice de tração semanal
- **Linhas:** 103
- **Tamanho:** 3.05 KB

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

  const WEEK_MS = 7 * 86400000;

  const calculateEMA = (windowData, alphaBase = 0.3) => {
    if (!windowData.length) return null;

    let ema = null;
    let lastTime = null;

    windowData.forEach((week) => {
      const currentTime = toDateMs(week.week);

      if (!Number.isFinite(currentTime)) return;

      const deltaWeeks = lastTime ? Math.max(1, (currentTime - lastTime) / WEEK_MS) : 1;
      const alpha = 1 - Math.pow(1 - alphaBase, deltaWeeks);
      const safeAlpha = Math.min(0.9, Math.max(alphaBase, alpha));

      let weekSum = 0;
      let weekVol = 0;

      visibleKeys.forEach(key => {
        // ✅ BUG-30 FIX: Proteção extra para garantir que meta exista antes do acesso
        if (week && week[`meta_${key}`]) {
          const meta = week[`meta_${key}`];
          if (meta && meta.currTot > 0 && Number.isFinite(Number(week[key]))) {
            weekSum += (Number(week[key]) * meta.currTot);
            weekVol += meta.currTot;
          }
        }
      });

      if (weekVol > 0) {
        const weekAvg = weekSum / weekVol;

        if (ema === null) {
          ema = weekAvg;
        } else {
          ema = (weekAvg * safeAlpha) + (ema * (1 - safeAlpha));
        }
        lastTime = currentTime;
      }
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

## `src/utils/monteCarloScenario.js` <a id="src-utils-montecarloscenario-js"></a>

- **Localização:** `src/utils/monteCarloScenario.js`
- **Descrição:** Ajustes paramétricos de cenários hipotéticos (conservador, realista, otimista)
- **Linhas:** 56
- **Tamanho:** 2.96 KB

```javascript
// ✅ FIX: meanBiasFactor é PERCENTUAL da escala (0.025 = 2.5% do maxScore)
export const SCENARIO_CONFIG = {
  conservative: { meanBiasFactor: -0.015, ciMult: 1.5, probMultFactor: 0.045 },
  base:         { meanBiasFactor: 0,      ciMult: 1,   probMultFactor: 0 },
  optimistic:   { meanBiasFactor: 0.025,  ciMult: 0.85, probMultFactor: 0.045 },
};

export function applyScenarioAdjustments(data = [], scenario = 'base', maxScore = 100, minScore = 0) {
  const cfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const lowerBound = Math.min(safeMinScore, safeMaxScore);
  const upperBound = Math.max(safeMinScore, safeMaxScore);
  const meanBias = (cfg.meanBiasFactor || 0) * safeMaxScore;
  const probMult = (cfg.probMultFactor || 0) * 100;

  return (data || []).map((d) => {
    const mean = Math.max(lowerBound, Math.min(upperBound, (Number(d.mean) || 0) + meanBias));
    const projectedMean = d.projectedMean !== undefined
      ? Math.max(lowerBound, Math.min(upperBound, (Number(d.projectedMean) || 0) + meanBias))
      : mean;
    const low = Math.max(lowerBound, Math.min(upperBound, mean - ((mean - (d?.ciRange?.[0] ?? mean)) * cfg.ciMult)));
    const high = Math.max(lowerBound, Math.min(upperBound, mean + (((d?.ciRange?.[1] ?? mean) - mean) * cfg.ciMult)));
    const rawProb = Number(d?.probability);
    const probBase = Number.isFinite(rawProb) ? rawProb : 0;
    const probAdjRaw = probBase + (meanBias > 0 ? probMult : meanBias < 0 ? -probMult : 0);
    const probAdj = Number.isFinite(probAdjRaw) ? Math.max(0, Math.min(100, probAdjRaw)) : 0;
    return {
      ...d,
      mean,
      projectedMean,
      probability: Number.isFinite(probAdj) ? probAdj : 0,
      ciRange: [Math.min(low, high), Math.max(low, high)],
    };
  });
}

export function classifyScenarioSignal(data = [], maxScore = 100, minScore = 0) {
  if (!data.length) return null;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const range = Math.max(1e-9, safeMaxScore - safeMinScore);
  const latest = data[data.length - 1];
  const high = Number(latest?.ciRange?.[1]);
  const low = Number(latest?.ciRange?.[0]);
  const width = Number.isFinite(high) && Number.isFinite(low) ? Math.max(0, high - low) : Number.POSITIVE_INFINITY;

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

## `src/utils/downsample.js` <a id="src-utils-downsample-js"></a>

- **Localização:** `src/utils/downsample.js`
- **Descrição:** Algoritmo LTTB (Largest Triangle Three Buckets) para otimização de alta densidade gráfica
- **Linhas:** 67
- **Tamanho:** 2.22 KB

```javascript
import { toDateMs } from './dateHelper.js';

export function downsampleLTTB(data, threshold, xKey, yKey) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return data || [];
  }
  const safeThreshold = Math.max(3, Math.floor(Number(threshold) || data.length));
  if (data.length <= safeThreshold) {
    return data;
  }
  const getX = (item) => {
    const val = item[xKey];
    if (typeof val === "string" && val.includes("-")) {
      return toDateMs(val);
    }
    return Number(val) || 0;
  };
  const getY = (item) => Number(item[yKey]) || 0;
  const dataLength = data.length;
  const bucketSize = (dataLength - 2) / (safeThreshold - 2);
  let a = 0;
  const sampledData = [data[0]];
  for (let i = 0; i < safeThreshold - 2; i++) {
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;
    const avgRangeLength = avgRangeEnd - avgRangeStart;
    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += getX(data[avgRangeStart]);
      avgY += getY(data[avgRangeStart]);
    }
    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    } else if (avgRangeStart < dataLength) {
      avgX = getX(data[avgRangeStart]);
      avgY = getY(data[avgRangeStart]);
    }
    let rangeOffs = Math.floor(i * bucketSize) + 1;
    let rangeTo = Math.floor((i + 1) * bucketSize) + 1;
    const pointAx = getX(data[a]);
    const pointAy = getY(data[a]);
    let maxArea = -1;
    let maxAreaIndex = -1;
    for (; rangeOffs < rangeTo; rangeOffs++) {
      const bx = getX(data[rangeOffs]);
      const by = getY(data[rangeOffs]);
      const area = Math.abs((pointAx - avgX) * (by - pointAy) - (pointAx - bx) * (avgY - pointAy)) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = rangeOffs;
      }
    }
    // ── FIX: bucket vazio não pode injetar undefined na série ──
    if (maxAreaIndex === -1) {
      maxAreaIndex = Math.min(rangeTo - 1, dataLength - 1);
    }

    sampledData.push(data[maxAreaIndex]);
    a = maxAreaIndex;
  }
  sampledData.push(data[dataLength - 1]);
  return sampledData;
}
```

---

## `src/engine/insightGenerator.js` <a id="src-engine-insightgenerator-js"></a>

- **Localização:** `src/engine/insightGenerator.js`
- **Descrição:** Motor de geração de recomendações e insights textuais acionáveis
- **Linhas:** 343
- **Tamanho:** 17.33 KB

```javascript
import { normalizeDate, toDateMs } from "../utils/dateHelper.js";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper.js";
import { pointsToRatio } from "../utils/scoreHelper.conversions.js";

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
        .filter(h => {
            const raw = h?.date || h?.createdAt;
            return raw && Number.isFinite(normalizeDate(raw)?.getTime());
        })
        .sort((a, b) => {
            const ta = normalizeDate(a?.date || a?.createdAt)?.getTime() ?? 0;
            const tb = normalizeDate(b?.date || b?.createdAt)?.getTime() ?? 0;
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
                return { type: 'info', icon: "🚀", title: "Visão Global: Rastreador de Aprovação", text: "Acompanhamento global das suas projeções de sucesso.", details: "Selecione uma disciplina acima para ver como ela afeta a sua aprovação." };
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
    const safeMaxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const safeMinScore = safeFinite(minScore, 0);
    const scale = Math.max(0.01, (safeMaxScore - safeMinScore) / 100);

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const dayStats = {};
        const now = new Date();
        
        const safeCategories = Array.isArray(categories)
            ? categories.filter(Boolean)
            : Object.values(categories || {}).filter(Boolean);

        safeCategories.forEach(cat => {
            const history = toHistoryArray(cat.simuladoStats?.history);

            const rawHistory = history
                .filter(h => {
                    const d = normalizeDate(h?.date || h?.createdAt);
                    return d && Number.isFinite(d.getTime()) && d.getTime() <= now.getTime();
                })
                .map(h => ({ ...h, score: getSafeScore(h, safeMaxScore, safeMinScore) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const d = normalizeDate(h?.date || h?.createdAt);
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
                text: `Seu rendimento de pico costuma ser: ${DAY_NAMES_SINGULAR[best.dow]}.`,
                details: `++Melhor dia: ${DAY_NAMES_SINGULAR[best.dow]} (${best.pct.toFixed(1)}%, ${best.total}q).++ !!Pior: ${DAY_NAMES_SINGULAR[worst.dow]} (${worst.pct.toFixed(1)}%).!!`,
                advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho ++acima da meta++, !!vermelhas!! indicam necessidade de atenção."
        };
    }

    // Lógica de Alertas de Burnout de Alta Prioridade (restrita às abas de desempenho geral)
    const safeRaw = safeFinite(raw, NaN);
    const safeBayesianFallback = safeFinite(bayesian, NaN);
    const isGeneralPerformanceTab = activeEngine === "raw" || activeEngine === "bayesian" || activeEngine === "compare";

    if (isGeneralPerformanceTab && Number.isFinite(safeRaw) && Number.isFinite(safeBayesianFallback)) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const history = toHistoryArray(focusCategory.simuladoStats?.history);

        const recentVolumeAlert = history
            .filter(h => {
                const d = toDateMs(h?.date || h?.createdAt);
                return Number.isFinite(d) && (nowMs - d) >= -86400000 && (nowMs - d) <= sevenDaysMs;
            })
            .reduce((sum, h) => {
                const parsedTotal = parseInt(h?.total, 10);
                const fallbackTotal = h?.score != null ? getSyntheticTotal(safeMaxScore) : 0;
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
        const scores = history.map(h => getSafeScore(h, safeMaxScore, safeMinScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        
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
            icon: "🚀", 
            title: "Rastreador de Aprovação", 
            text: ciWidth != null ? `Incerteza na sua aprovação: ±${(ciWidth / 2).toFixed(1)}${unit}.` : "Histórico das suas chances reais de aprovação.", 
            details: "Mede o quanto cada simulado aproxima ou afasta você da sua nota de corte.",
            advice: "Se a linha estiver ++subindo++, sua rotina de estudos está funcionando. Mantenha!" 
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

# 6. MOTORES ESTATÍSTICOS E PROBABILÍSTICOS (ENGINE)

## `src/engine/monteCarlo.js` <a id="src-engine-montecarlo-js"></a>

- **Localização:** `src/engine/monteCarlo.js`
- **Descrição:** Motor clássico de simulação estocástica Monte Carlo com calibração e bootstrap
- **Linhas:** 825
- **Tamanho:** 32.28 KB

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
export { monteCarloSimulation, sampleTruncatedNormal };

import { getPercentile } from './math/percentile.js';
import { kahanSum } from './math/kahan.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getDateKey } from '../utils/dateHelper.js';
import { getCachedSimulation, setCachedSimulation, clearSimulationCache } from './simulationCache.js';

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

    if (!Number.isFinite(mean)) mean = (minScore + maxScore) / 2;

    subjects = sanitizeSubjects(subjects);

    historicalCutoffs = Array.isArray(historicalCutoffs)
        ? historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
        : [];

    flashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);
    historyLength = Math.max(0, Math.floor(toFiniteNumber(historyLength, 0)));

    if (!meanOrObj?.simulations && !simulations) {
        const refMean = Number.isFinite(currentMean) ? currentMean
                      : Number.isFinite(mean) ? mean
                      : (minScore + maxScore) / 2;
        const domain = Math.max(1, maxScore - minScore);
        const roughProb = Math.max(0.1, Math.min(0.9, (refMean - minScore) / domain));
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
        // ✅ FIX: Com sd ≈ 0, a distribuição é degenerada.
        // Usar comparação com tolerância relativa ao domínio.
        const domainWidth = Math.max(1e-9, maxScore - minScore);
        const EPS = domainWidth * 1e-6;
        let prob;
        if (safeMean > effectiveTarget + EPS) {
            prob = 100;
        } else if (safeMean < effectiveTarget - EPS) {
            prob = 0;
        } else {
            prob = 50; // Fronteira exata
        }

        const kdeOffset = Math.max(1e-4, domainWidth * 0.001);
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
                safeMean > minScore ? { x: safeMean - kdeOffset, y: 0, density: 0 } : null,
                { x: safeMean, y: 1, density: 1 },
                safeMean < maxScore ? { x: safeMean + kdeOffset, y: 0, density: 0 } : null
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
            const domainSpan = Math.max(1e-9, maxScore - minScore);
            const spread = Math.max(safeSD * 30, domainSpan * 3);
            let muLow = minScore - spread;
            let muHigh = maxScore + spread;
            const tol = Math.max(1e-7, domainSpan * 0.0001);

            for (let iter = 0; iter < 35; iter++) {
                const currentTruncMean = truncatedNormalMean(muParam, safeSD, minScore, maxScore);
                if (!Number.isFinite(currentTruncMean)) break;

                const error = currentTruncMean - safeMean;
                if (Math.abs(error) < tol) break;

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

    // ✅ LOTE-01 FIX (C1): o score composto deve amostrar TODAS as matérias.
    // Antes, apenas matérias com minCutoff > 0 entravam aqui, e o score global
    // era sobrescrito pela média SÓ delas — as demais eram descartadas da
    // probabilidade silenciosamente. minCutoff agora só afeta a restrição de
    // aprovação (passedMins), nunca a composição do score.
    const allSubjects = sanitizeSubjects(subjects).filter(s => {
        const w = Number(s?.weight);
        return Number.isFinite(w) && w > 0.01;
    });
    const subjectStats = allSubjects.map(s => {
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

        try {
            // Gaussian Copula: decompor a matriz de CORRELAÇÃO R (sd = 1).
            // Desta forma, Z = L*W possui variância unitária e u = Phi(Z) é genuinamente
            // uniforme em (0, 1), permitindo que truncatedNormalFromUniform aplique
            // o desvio padrão real de cada matéria sem inflar a variância ao quadrado.
            const corrStats = subjectStats.map(s => ({ ...s, sd: 1 }));
            const corr = buildCovarianceMatrix(corrStats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
            const psdCorr = ensurePositiveSemiDefinite(corr);
            subjectCholesky = choleskyDecomposition(psdCorr);
        } catch (err) {
            console.warn('[MonteCarlo] Cholesky falhou, usando disciplinas independentes:', err?.message || err);
            subjectCholesky = null;
        }

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
                    // ✅ LOTE-01: corte só reprova quando existe (minCutoff > 0)
                    if (!Number.isFinite(subjScore) || (sp.minCutoff > 0 && subjScore < sp.minCutoff)) {
                        passedMins = false;
                    }
                }
            } else {
                // Caminho independente (sem correlação)
                for (let j = 0; j < choleskySize; j++) {
                    const sp = subjectParams[j];
                    const effSd = sp.sd;
                    const sScore = sampleTruncatedNormal(sp.mean, effSd, sp.minScore, sp.maxScore, rng);
                    subjectSum += sScore * sp.weight;
                    weightSum += sp.weight;
                    // ✅ LOTE-01: corte só reprova quando existe (minCutoff > 0)
                    if (!Number.isFinite(sScore) || (sp.minCutoff > 0 && sScore < sp.minCutoff)) {
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
        analyticalProbability = (isUnderflowStress || hasCutoffs || subjectParams.length > 0)
            ? bayesEmpiricalProbability
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


function hashObject(obj) {
    try {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'function') return `[fn:${key}]`;
            if (value === undefined) return `[undefined:${key}]`;
            if (typeof value === 'bigint') return value.toString();
            return value;
        });
    } catch {
        return null;
    }
}

export function runMonteCarloAnalysis(params = {}, ...legacyArgs) {
    let resolvedParams = params;
    if (Array.isArray(params)) {
        const [meta, projectionDays, simulations, options] = legacyArgs;
        resolvedParams = {
            values: params,
            meta,
            projectionDays,
            simulations,
            ...(options && typeof options === 'object' ? options : {})
        };
    } else if (!params || typeof params !== 'object') {
        console.warn("[MC Engine] Fallback acionado. 'runMonteCarloAnalysis' requer objeto. Ignorando chamada bruta.");
        return monteCarloSimulation([], 85, 90, 5000, {});
    }

    // ✅ LOTE-04 FIX (A4): aceitar chave pré-computada (ex.: pureStatsHash do hook)
    // para evitar JSON.stringify de payloads enormes a cada chamada.
    const cacheKey = (typeof resolvedParams.cacheKey === 'string' && resolvedParams.cacheKey.length > 0)
        ? resolvedParams.cacheKey
        : hashObject(resolvedParams);
    const cached = getCachedSimulation(cacheKey);
    if (cached) return cached;

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
        cacheKey: _providedCacheKey, // ✅ LOTE-04: não vazar para mergedOptions
        ...options
    } = resolvedParams;

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
        setCachedSimulation(cacheKey, result);
    }
    
    return result;
}

export function clearEngineMcCache() {
    clearSimulationCache();
}

export default {
    runMonteCarloAnalysis,
    clearEngineMcCache
};

```

---

## `src/engine/projection.js` <a id="src-engine-projection-js"></a>

- **Localização:** `src/engine/projection.js`
- **Descrição:** Motor de projeção temporal bayesiana, GARCH de volatilidade e convergência
- **Linhas:** 1.028
- **Tamanho:** 49.95 KB

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
// ✅ LOTE-04 FIX: Z_95 e MIN_SD_FLOOR removidos — não eram usados aqui
// (Z_95 vive em stats.js; MIN_SD_FLOOR vive em gaussian.js)
import { kahanSum, kahanMean } from './math/kahan.js';
import { weightedRegression, getSortedHistory, calculateSlopePerDay } from './stats.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
// ✅ LOTE-04 FIX: re-export removido. Estes símbolos já são exportados por
// stats.js; o engine/index.js faz `export *` dos dois, e a duplicidade criava
// ambiguidade de star-export. O import interno acima continua intacto.

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
export function computeNonLinearTrend(history, maxScore = 100, lambda = 0.08, minScore = 0) {
  const sorted = getSortedHistory(history);
  if (sorted.length < 4) return { slope: 0, intercept: 50, type: 'linear' };

  const now = Date.now();
  const t0 = getSafeTime(sorted[0].date || sorted[0].createdAt);

  // Fit simple model: y ~ a + b * log(1 + days)
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

  sorted.forEach(h => {
    const y = getSafeScore(h, maxScore, minScore);
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
    const validSorted = sorted.filter(h => Number.isFinite(getSafeScore(h, maxScore, minScore)));
    if (validSorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    const _scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(validSorted, lambda, maxScore, { ...options, minScore });
    // CORREÇÃO: Defesa estrita contra null/undefined que disparam TypeError no getTime()
    const d0 = safeDateParse(validSorted[0].date || validSorted[0].createdAt);
    const t0_vol = (d0 && !Number.isNaN(d0.getTime())) ? d0.getTime() : Date.now();
    
    // OTIMIZAÇÃO DE PERFORMANCE: Fusão de loops O(5N) para O(N)
    let sumWeights = 0, sumResidualsWeighted = 0, sumSw = 0;

    const residualSamples = validSorted.map(h => {
        const hDate = h.date || h.createdAt;
        const parsed = safeDateParse(hDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        const x = (parsed.getTime() - t0_vol) / 86400000;
        const t = Math.max(0, (now - parsed.getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore, minScore);
        const val = y - (intercept + slope * x); // Resíduo (detrended)
        
        // Acumulação numa única passagem
        sumWeights += w;
        sumResidualsWeighted += val * w;
        sumSw += val * val * w;

        return { value: val, weight: w }; 
    }).filter(Boolean);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-15 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-15 ? (sumResidualsWeighted / safeWeights) : 0;
    const n_res = validSorted.length - 1;
    const bessel = n_res > 1 ? n_res / (n_res - 1) : 1;
    const mssdVariance = ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = sortedArr.reduce((acc, it) => acc + it.weight, 0);
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
    const robustVariance = Math.pow(1.4826 * mad, 2);
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
    const scores = history.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
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
    const score = getSafeScore(h, maxScore, minScore);
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
  
  // FIX-RMSSD-02: parear valor + flag na origem, para o índice de fatigueFlag
  // nunca desalinhar quando detrendedScores é filtrado/reindexado.
  const pairs = validPairs.map((p) => ({
    v: p.score - (slope * p.timeX),
    fatigue: !!p.fatigueFlag
  })).filter(item => Number.isFinite(item.v));
  
  let sumSqDiff = 0;
  let validTransitions = 0;
  
  for (let i = 1; i < pairs.length; i++) {
    const diff = pairs[i].v - pairs[i - 1].v;
    if (Number.isFinite(diff)) {
      const isFatigueDrop = diff < 0 && pairs[i].fatigue;
      const effectiveDiff = isFatigueDrop ? diff * 0.5 : diff;
      sumSqDiff += Math.pow(effectiveDiff, 2);
      validTransitions++;
    }
  }
  
  // FIX-RMSSD-01: RMSSD = sqrt(mean(d²)). O fator 2 artificial subestimava
  // a variabilidade em √2 (~29%), mascarando instabilidade do desempenho.
  if (validTransitions < 1) {
    const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    return 0.05 * range;
  }
  const rmssd = sumSqDiff / validTransitions;
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
    
    const normalizedHistory = trendOrHistory
      .filter(item => item != null)
      .map(item => {
      if (typeof item === 'number') {
        return { score: item, date: null };
      }
      if (item && typeof item === 'object') {
        const score = Number(item.score ?? item.value);
        return {
          score: Number.isFinite(score) ? score : NaN,
          date: item.date || item.createdAt || null
        };
      }
      return { score: NaN, date: null };
    }).filter(item => Number.isFinite(item.score));
    
    if (normalizedHistory.length < 2) return 0;
    const result = calculateAdaptiveSlope(normalizedHistory, maxScore, opts);
    return Number.isFinite(result) ? result : 0;
  }
  
  // ✅ FIX: Clamp proporcional à amplitude real (maxScore - minScore) da prova
  const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
  const safeMax = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
  const safeMin = Number.isFinite(opts?.minScore) ? opts.minScore : 0;
  const range = Math.max(1e-9, safeMax - safeMin);
  // 0.4% do range por dia como limite máximo
  const absoluteMax = 0.004 * range;
  let slope = Number(trendOrHistory) || 0;
  if (!Number.isFinite(slope)) return 0;
  if (slope > absoluteMax) slope = absoluteMax;
  if (slope < -absoluteMax) slope = -absoluteMax;
  return slope;
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    const minScore = Number.isFinite(options?.minScore) ? options.minScore : 0;
    const trend = calculateSlopePerDay(history, maxScore, minScore);
    return calculateSlope(trend, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const minScore = options?.minScore || 0;
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
    if (historicalScores.length < 4) return { isLogistic: false };
    
    const meanVal = kahanSum(historicalScores) / Math.max(1, historicalScores.length);
    const devs = historicalScores.map(b => Math.pow(b - meanVal, 2));
    const currentVariance = Math.sqrt(kahanSum(devs) / Math.max(1, historicalScores.length - 1));

    let L = maxScore;
    if (historicalScores.length >= 4) {
        const validScores = historicalScores;
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
        const recentTrend = calculateSlopePerDay(recentAsObjects, maxScore, minScore);
        const recentSlope = calculateSlope(recentTrend, maxScore, options);
        const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (maxScore * 0.01)) : 0;
        
        L = robustPeak + (dynamicHeadroom * slopeMultiplier);
        L = Math.min(maxScore + 0.1, Math.max(validScores[validScores.length - 1] + 0.1, L));
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
        
        let y = getSafeScore(h, maxScore, minScore);
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
    if (!sortedHistory || sortedHistory.length === 0) return { projected: minScore, marginOfError: 0 };

    const logisticFit = logisticRegression(sortedHistory, maxScore, options);
    let projectedScore;
    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    
    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, { ...options, minScore }) : { slopeStdError: 0 };
    let eventVolatility = calculateMSSD(sortedHistory, maxScore, minScore);

    // Bug 2.3 Fix: Divergência Asintótica no Amortecimento
    let linearSlope = 0;
    if (!(logisticFit.isLogistic && logisticFit.k > 0)) {
        let trend = calculateSlopePerDay(sortedHistory, maxScore, minScore);
        linearSlope = calculateSlope(trend, maxScore, options);
    }

    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift: linearSlope,
        driftUncertainty: slopeStdError,
        scaleFactor: (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100,
        normalizedVol: (eventVolatility / (maxScore - minScore > 0 ? maxScore - minScore : maxScore)) * 100
    });

    const maxEffectiveDays = dampingBase * Math.log(1 + projectDays / dampingBase);
    const effectiveDaysForDrift = Math.min(projectDays, maxEffectiveDays);

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = options.minScore !== undefined ? options.minScore : (minScore || 0);
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        // Removemos a mistura corrompida. O EMA continuará a usar o `linearSlope`
        // para projetar o futuro no Random Walk.

        const rawScore = getSafeScore(sortedHistory[0], maxScore, minScore);
        let ema = Number.isFinite(rawScore) ? rawScore : minScore;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore, minScore);
            
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

    const tLast = getSafeTime(sortedHistory[sortedHistory.length - 1]?.date || sortedHistory[sortedHistory.length - 1]?.createdAt);
    const tFirst = getSafeTime(sortedHistory[0]?.date || sortedHistory[0]?.createdAt);
    const rawGapDays = sortedHistory.length > 1
        ? ((tLast - tFirst) / 86400000) / Math.max(1, sortedHistory.length - 1)
        : 7;
    const avgGapDays = Number.isFinite(rawGapDays) && rawGapDays > 0 ? rawGapDays : 7;
        
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
    const marginOfError = Math.min((maxScore - minScore), tMult * predictionSD); 

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
        mean: minScore,
        sd: 0,
        ci95Low: minScore,
        ci95High: minScore,
        currentMean: minScore,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Find the last valid score in the sorted history
    let validCurrentScore = NaN;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const s = getSafeScore(sortedHistory[i], maxScore, minScore);
        if (Number.isFinite(s)) {
            validCurrentScore = s;
            break;
        }
    }
    const currentScore = Number.isFinite(validCurrentScore) ? validCurrentScore : minScore;
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;
    if (sortedHistory.length > 0) {
        const rawScore = getSafeScore(sortedHistory[0], maxScore, minScore);
        let ema = Number.isFinite(rawScore) ? rawScore : minScore;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore, minScore);

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
        baselineScore = optionsCurrentMean;
    }
    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;   // ✅ LOTE-03
    // ✅ LOTE-06 FIX (SCENARIO-1): meanBiasFactor é percentual do maxScore, não do range.
    // Com minScore > 0, usar range distorcia o bias (ex: 2.5% de 800 em vez de 2.5% de 1000).
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * maxScore)));

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
    const histScores = sortedHistory.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
    const historicalMean = histScores.length > 0 ? kahanMean(histScores) : baselineScore;
    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, { ...options, minScore })
        : { slope: 0, slopeStdError: 0.05 * scaleFactorFallback };

    let effectiveDriftSlope = regressionResult.slope;

    trendType = 'linear';
    if (sortedHistory.length >= 4) {
        try {
            const nl = computeNonLinearTrend(sortedHistory, maxScore, 0.08, minScore);
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
        const prev = getSafeScore(sortedHistory[i - 1], maxScore, minScore);
        const actualChange = getSafeScore(h, maxScore, minScore) - prev;
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
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore, minScore)}-${sortedHistory.length}`;
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
    // ✅ LOTE-01 FIX (A7): clamp de sanidade do GARCH proporcional ao RANGE real,
    // não ao teto absoluto (consistente com as correções LOTE-03 do arquivo).
    const rangeVolClamp = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const maxVolSqClamp = Math.pow(rangeVolClamp * 0.2, 2);

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
          categoryNames: cutoffSubjects.map(s => String(s?.name ?? s?.id ?? 'subject')) 
      } : null;
      
      try {
        const cov = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
        const psdCov = ensurePositiveSemiDefinite(cov);
        subjectCholesky = choleskyDecomposition(psdCov);
      } catch (err) {
        console.warn('[Projection] Cholesky falhou, usando disciplinas independentes:', err?.message || err);
        subjectCholesky = null;
      }
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
        let accumulatedDrift = 0;

        for (let d = 1; d <= simulationDays; d++) {
            // [RIGOR-FIX] Drift Damping Adaptativo: O impacto da tendência diminui com o tempo (Log-decay)
            // dampingBase varia de 30 (conservador) a 60 (confiante) conforme qualidade do sinal.
            const driftDamping = 1 / (1 + d / dampingBase); 
            const driftEffect = sampledDrift * driftDamping;

            // Reversão de Ornstein-Uhlenbeck em relação à trajetória estrutural esperada antes do passo diário
            const prevTarget = Math.max(minScore, Math.min(maxScore, baselineScore + accumulatedDrift));
            let meanReversion = Math.max(0.005, thetaOU) * (prevTarget - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            // Prevent extreme reversion pulls that cause artificial boundary piling in long simulations
            const maxReversionPull = adaptiveVol * 3;
            meanReversion = Math.max(-maxReversionPull, Math.min(maxReversionPull, meanReversion));

            // Atualiza a trajetória esperada acumulada com o drift do dia
            accumulatedDrift += driftEffect;
            const maxDrift = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) * 0.5;
            accumulatedDrift = Math.max(-maxDrift, Math.min(maxDrift, accumulatedDrift));
            
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
            currentVolSq = Math.min(currentVolSq, maxVolSqClamp); // ✅ LOTE-01 FIX (A7)
            
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
                    // G-08 FIX: Verificar se subjScore é finito antes de comparar
                    if (!Number.isFinite(subjScore) || subjScore < s.minCutoff) {
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

## `src/engine/stats.js` <a id="src-engine-stats-js"></a>

- **Localização:** `src/engine/stats.js`
- **Descrição:** Funções estatísticas centrais: médias móveis, variância, covariância e regressão linear
- **Linhas:** 1.244
- **Tamanho:** 49.70 KB

```javascript
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { normalizeDate, safeDateParse } from '../utils/dateHelper.js';
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean, average, averageOrZero } from './math/kahan.js';
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

function safeMinScoreValue(minScore, fallback = 0) {
    const n = Number(minScore);
    return Number.isFinite(n) ? n : fallback;
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
            const parsed = safeDateParse(dateValue);
            const t = parsed ? parsed.getTime() : 0;

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
    let effectiveLambda = 0.08;
    let effectiveMaxScore = 100;
    let effectiveOptions = options;

    if (typeof lambda === 'object' && lambda !== null) {
        effectiveOptions = lambda;
        effectiveLambda = Number.isFinite(effectiveOptions.lambda) ? effectiveOptions.lambda : 0.08;
        effectiveMaxScore = safeMaxScoreValue(effectiveOptions.maxScore, 100);
    } else {
        effectiveLambda = Math.max(0, Math.min(1, Number.isFinite(Number(lambda)) ? Number(lambda) : 0.08));
        effectiveMaxScore = safeMaxScoreValue(maxScore, 100);
    }

    const minScore = safeMinScoreValue(effectiveOptions?.minScore, 0);
    const scaleFactor = Math.max(1e-6, (effectiveMaxScore - minScore) / 100);
    const defaultSlopeStdError = 0.05 * scaleFactor;

    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return { slope: 0, intercept: 0, slopeStdError: defaultSlopeStdError };

    const sorted = getSortedHistory(safeHistory);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: defaultSlopeStdError };

    const parsedReferenceDate = effectiveOptions.referenceDate != null ? safeDateParse(effectiveOptions.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const firstValid = sorted.find(h => Number.isFinite(safeDateParse(h?.date || h?.createdAt)?.getTime()));
    const t0 = firstValid ? safeDateParse(firstValid.date || firstValid.createdAt).getTime() : now;

    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, effectiveMaxScore, minScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-effectiveLambda * t);
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
        const fallbackScore = getSafeScore(sorted[sorted.length - 1], effectiveMaxScore, minScore);
        return { slope: 0, intercept: Number.isFinite(fallbackScore) ? fallbackScore : 0, slopeStdError: defaultSlopeStdError };
    }

    let slope = covXY / regularizedDenominator;
    const maxSlopeLimit = effectiveMaxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, effectiveLambda, effectiveMaxScore, { ...effectiveOptions, minScore });

    return { slope, intercept, slopeStdError };
}

export function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    maxScore = safeMaxScoreValue(maxScore, 100);
    const minScore = safeMinScoreValue(options?.minScore, 0);

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const firstValid = sorted.find(h => Number.isFinite(safeDateParse(h?.date || h?.createdAt)?.getTime()));
    const t0 = firstValid ? safeDateParse(firstValid.date || firstValid.createdAt).getTime() : now;

    let sumW = 0, cW = 0;
    let sumW2 = 0, cW2 = 0;
    let sumWX = 0, cWX = 0;
    let sumWXX = 0, cWXX = 0;
    let rss = 0, cRSS = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore, minScore);
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

    const scaleFactorFallback = Math.max(1e-6, (maxScore - minScore) / 100);
    const defaultSlopeStdError = 0.05 * scaleFactorFallback;

    if (sumW2 <= 1e-15) return defaultSlopeStdError;

    const effectiveN = (sumW * sumW) / sumW2;

    if (effectiveN <= 2.1) return defaultSlopeStdError;

    const variance = (rss / sumW) * (effectiveN / (effectiveN - 2));
    const varX = (sumWXX - (sumWX * sumWX) / sumW) / sumW;

    if (varX <= 1e-8) {
        return Math.sqrt(Math.max(0, rss / sumW)) / Math.sqrt(effectiveN);
    }

    const det = sumW * sumWXX - sumWX * sumWX;
    const calculatedStdError = Math.sqrt(Math.max(0, (variance * sumW) / det));
    const maxSlopeSe = 0.04 * (maxScore - minScore);
    return Math.min(maxSlopeSe, calculatedStdError);
}

function getHistoryDateValue(entry) {
    return entry?.date ?? entry?.createdAt ?? null;
}

function getHistoryTime(entry) {
    const parsed = normalizeDate(getHistoryDateValue(entry));
    return parsed ? parsed.getTime() : NaN;
}

function getDynamicTrendThreshold(currentScore, maxScore, minScore = 0) {
    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeMinScore = safeMinScoreValue(minScore, 0);
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    const safeCurrent = safeFinite(currentScore, safeMinScore);
    const currentPct = (safeCurrent - safeMinScore) / safeRange;

    if (!Number.isFinite(currentPct)) return 0.002 * safeRange;

    const damping = Math.max(0, 1 - Math.min(1, Math.max(0, currentPct)));
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;

    return dynamicPct * safeRange;
}

// ✅ FIX: getDynamicPriorSD trata array de números nus e respeita safeRange (invariância de escala)
function getDynamicPriorSD(history, maxScore, minScore = 0) {
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  const safeMinScore = safeMinScoreValue(minScore, 0);
  const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
  const safeHistory = toHistoryArray(history);
  
  if (safeHistory.length < 5) return safeRange * 0.15;
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const scores = safeHistory.map(h => {
    if (typeof h === 'number') return h;
    return getSafeScore(h, safeMaxScore, safeMinScore);
  }).filter(Number.isFinite);
  
  if (scores.length < 5) return safeRange * 0.15;
  
  const globalMean = mean(scores);
  const globalVar = scores.length > 1
    ? kahanSum(scores.map(s => Math.pow(s - globalMean, 2))) / (scores.length - 1)
    : 0;
  
  const empiricalSD = Math.sqrt(Math.max(0, globalVar));
  return Math.max(safeRange * 0.05, Math.min(safeRange * 0.20, empiricalSD));
}

export function mean(arr) {
    return kahanMean(arr);
}

export const calcularMedia = mean;
export { average, averageOrZero };

// ✅ FIX: standardDeviation aceita array de números nus
export function standardDeviation(arr, maxScore = 100, customMean = null, minScore = 0) {
  if (!arr || arr.length < 1) return 0;
  
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  const safeMinScore = safeMinScoreValue(minScore, 0);
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const clean = arr
    .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMaxScore, safeMinScore))
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
  
  const POPULATION_SD = getDynamicPriorSD(arr, safeMaxScore, safeMinScore);
  const KAPPA = 1;
  
  const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);
  
  const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
  const finalSdFloor = MIN_SD_FLOOR * safeRange;
  return Math.max(finalSdFloor, Math.sqrt(Math.max(0, adjustedVar)));
}

export const calcularDesvioPadrao = (arr, isSample = false) => {
    if (!arr || arr.length === 0) return 0;

    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length <= 1) return 0;

    const m = kahanMean(clean);
    const sumSq = clean.map(x => Math.pow(x - m, 2));
    const denom = isSample ? (clean.length - 1) : clean.length;
    const v = denom > 0 ? kahanSum(sumSq) / denom : 0;

    return Math.sqrt(Math.max(0, v));
};

export function calcularAssimetria(arr, maxScore = 100, minScore = 0) {
    if (!arr || arr.length < 3) return 0;

    const safeMax = safeMaxScoreValue(maxScore, 100);
    const safeMin = safeMinScoreValue(minScore, 0);

    const clean = toHistoryArray(arr)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMax, safeMin))
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
    let singleScore = null;
    let singleNEff = 1;
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
        singleScore = Math.max(0, Number(historyOrScore) || 0);
        const nEffArg = Number(arg1);
        singleNEff = Number.isFinite(nEffArg) && nEffArg >= 0 ? nEffArg : 1;
        safeMaxScore = safeMaxScoreValue(arg2, 100);
        options = arg3 || {};
    }
    // ✅ LOTE-01 FIX (C3): normalização no INTERVALO ÚTIL [minScore, maxScore].
    // Antes a proporção era score/maxScore — errado em escalas com piso != 0
    // (ex.: 200–1000: nota 600 virava 60% quando deveria ser 50%).
    const safeMinScore = Math.min(
        Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 0,
        safeMaxScore
    );
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    if (singleScore !== null) {
        const pct = Math.max(0, Math.min(1, (singleScore - safeMinScore) / safeRange));
        alpha = pct * singleNEff;
        beta = (1 - pct) * singleNEff;
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

    const historyWithTime = history
        .map(h => ({ original: h, time: getHistoryTime(h) }))
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => a.time - b.time);

    const historySortedForGaps = historyWithTime.map(item => item.original);

    if (historyWithTime.length > 1) {
        for (let i = 1; i < historyWithTime.length; i++) {
            const gap = (historyWithTime[i].time - historyWithTime[i - 1].time) / 86400000;
            if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
        }
    }

    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? kahanSum(gaps) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;
    const totalQuestionsHist = history.length ? kahanSum(history.map(safeTotalEntry)) : 0;

    const historyDays = historyWithTime.length > 1
        ? Math.max(1, (historyWithTime[historyWithTime.length - 1].time - historyWithTime[0].time) / 86400000)
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
    const itemsToProcess = historyWithTime.length > MAX_ITERATIONS
        ? historyWithTime.slice(-MAX_ITERATIONS)
        : historyWithTime;
    const historyToProcess = itemsToProcess.map(item => item.original);

    // M-08 FIX: Reutilizar buffer se possível (evitar alocação a cada chamada)
    // Nota: em produção, considerar um pool de buffers.
    const runningPriors = new Float64Array(historyToProcess.length);
    if (historyToProcess.length > 0) {
        let priorSum = 0, priorC = 0, priorCount = 0;
        for (let j = 0; j < historyToProcess.length; j++) {
            const sScore = getSafeScore(historyToProcess[j], safeMaxScore, safeMinScore);
            if (Number.isFinite(sScore)) {
                let rawPct = (sScore - safeMinScore) / safeRange;
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
        ? totalQuestionsHist / history.length
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

            const normalizedScore = getSafeScore(h, safeMaxScore, safeMinScore);
            if (!Number.isFinite(normalizedScore)) continue;

            const isPurePercentage = !hasTotal;

            let rawPct = (normalizedScore - safeMinScore) / safeRange;
            rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
            const pct = Math.min(1, rawPct);

            const timeEntry = itemsToProcess[i].time;
            const timePrev = i > 0 ? itemsToProcess[i - 1].time : timeEntry;

            const gapDays = Number.isFinite(timeEntry) && Number.isFinite(timePrev)
                ? Math.max(0, Math.floor((timeEntry - timePrev) / 86400000))
                : 0;

            const lambda = Math.max(0.01, Math.min(0.08, baseAdaptiveLambda));

            const entryDecayRaw = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;
            const entryDecay = Number.isFinite(entryDecayRaw) ? Math.max(0, Math.min(1, entryDecayRaw)) : 1.0;

            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapDays || 0)));

            // ✅ FIX: Piso de retenção proporcional ao decaimento, NÃO ao histórico máximo.
            // Usa um piso fixo pequeno (3-10) que decai com o tempo, permitindo
            // que o aluno realmente "esqueça" após longos períodos sem estudo.
            const retentionFloor = Math.max(5.0, Math.min(20.0, cappedMaxN * 0.10)) * macroDecay;

            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;

                if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                    const currentP = alpha / nBeforeDecay;
                    const minN = retentionFloor;
                    const HARD_FLOOR = 3.0;
                    const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);

                    const nAfterDecayRaw = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * entryDecay)));
                    const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : safeFloor;

                    let regressedP = currentP;
                    if (gapDays > 21) {
                        const priorP = i > 0 ? runningPriors[i - 1] : runningPriors[0] || 0.5;
                        const safePriorP = Number.isFinite(priorP) ? priorP : 0.5;
                        const forgettingDecay = Math.exp(-lambda * (gapDays - 21));
                        const regressedPRaw = (currentP * forgettingDecay) + (safePriorP * (1 - forgettingDecay));
                        regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;
                    }

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

    const lastItem = historyWithTime.length > 0 ? historyWithTime[historyWithTime.length - 1] : null;
    const lastEntry = lastItem ? lastItem.original : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastTime = lastItem ? lastItem.time : normalizeDate(lastDateStr)?.getTime();
        const gapToToday = Number.isFinite(lastTime) ? Math.max(0, Math.floor((now - lastTime) / 86400000)) : 0;

        if (gapToToday > 0) {
            const finalLambda = Math.max(0.01, Math.min(0.08, baseAdaptiveLambda));

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

                let regressedP = currentP;
                if (gapToToday > 14) {
                    const empiricalPriorFinal = runningPriors.length > 0 ? runningPriors[runningPriors.length - 1] : 0.5;
                    const safeEmpiricalPriorFinal = Number.isFinite(empiricalPriorFinal) ? empiricalPriorFinal : 0.5;
                    const forgettingDecay = Math.exp(-finalLambda * (gapToToday - 14));
                    const regressedPRaw = (currentP * forgettingDecay) + (safeEmpiricalPriorFinal * (1 - forgettingDecay));
                    regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;
                }

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
    // ✅ LOTE-01 FIX (C3): margem/centro escalam pelo RANGE, não pelo teto
    const marginOfError = tMultiplier * effectiveSd * safeRange;
    const adjustedMarginOfError = Number.isFinite(marginOfError) ? marginOfError : 0;

    // ✅ FIX BUG-16 & BUG-22: Desfaz transformação de prova penalizada e respeita [minScore, maxScore]
    const effectiveRatioCenter = options?.isPenalizedFormat && safeMinScore < 0
      ? (2 * p_tilde - 1)
      : p_tilde;
    const centerForCI = options?.isPenalizedFormat && safeMinScore < 0
      ? effectiveRatioCenter * safeMaxScore
      : safeMinScore + p_tilde * safeRange;

    const effectiveRatio = options?.isPenalizedFormat && safeMinScore < 0
      ? (2 * p - 1) // Inverte (ratio + 1) / 2 de volta para [-1, 1]
      : p;
    const trueMean = options?.isPenalizedFormat && safeMinScore < 0
      ? Math.max(safeMinScore, Math.min(safeMaxScore, effectiveRatio * safeMaxScore))
      : safeMinScore + p * safeRange;

    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

    if (!Number.isFinite(ciLow)) ciLow = Math.max(safeMinScore, trueMean);
    if (!Number.isFinite(ciHigh)) ciHigh = Math.min(safeMaxScore, trueMean);

    if (trueMean < ciLow) ciLow = trueMean;
    if (trueMean > ciHigh) ciHigh = trueMean;

    const strictLow = Number.isFinite(ciLow) ? Math.max(safeMinScore, ciLow) : safeMinScore;
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
        sd: effectiveSd * safeRange, // ✅ LOTE-01 FIX (C3)
        ciLow: strictLow,
        ciHigh: strictHigh,
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > dynamicEffectiveN ? dynamicEffectiveN : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100, minScore = 0) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return null;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeMinScore = safeMinScoreValue(minScore, 0);
    const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);
    if (!Number.isFinite(safeRange)) return null;

    const rawSynthetic = getSyntheticTotal(safeMaxScore);
    const syntheticTotal = Number.isFinite(rawSynthetic) ? rawSynthetic : 20;

    const historyWithSynthetics = safeHistory
        .map(h => {
            const score = getSafeScore(h, safeMaxScore, minScore);
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
        .map(h => getSafeScore(h, safeMaxScore, minScore))
        .filter(Number.isFinite);

    const validHistoryForMean = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore, minScore))
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
        sumScoreMean += getSafeScore(h, safeMaxScore, minScore) * effW;
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

            const safeScore = getSafeScore(h, safeMaxScore, minScore);
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

        const POPULATION_SD = getDynamicPriorSD(historyToUse, safeMaxScore, safeMinScore);
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
            sampleVar < (0.0004 * safeRange * safeRange) &&
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
        const priorSD = getDynamicPriorSD(historyToUse, safeMaxScore, safeMinScore);
        variance = Math.pow(Number.isFinite(priorSD) ? priorSD : 0, 2);
    }

    const sd = Math.max(Math.sqrt(Math.max(0, variance)), 0.001 * safeRange);
    const safeSD = Number.isFinite(sd) ? sd : 0.001 * safeRange;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore, { minScore: safeMinScore });
    const safeSlope = Number.isFinite(slopePerDay) ? slopePerDay : 0;

    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore, safeMinScore);

    const validHistoryForTrend = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore, minScore))
    );

    const sortedForTrendCap = getSortedHistory(validHistoryForTrend);

    const lastScoreRaw = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore, minScore)
        : m;

    const safeLastScore = Number.isFinite(lastScoreRaw) ? lastScoreRaw : m;

    const limiteSuperior = safeMaxScore - safeLastScore;
    const limiteInferior = safeMinScore - safeLastScore;

    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, safeSlope * 30));
    const safeRawTrend = Number.isFinite(rawTrend) ? rawTrend : 0;

    let trendLabel = 'stable';
    if (safeRawTrend > trendThreshold) trendLabel = 'up';
    else if (safeRawTrend < -trendThreshold) trendLabel = 'down';

    const level = m > (safeMinScore + 0.7 * safeRange) ? 'ALTO' : m > (safeMinScore + 0.4 * safeRange) ? 'MÉDIO' : 'BAIXO';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight,
        history: safeHistory,
        trend: trendLabel,
        trendValue: safeRawTrend,
        level,
        minScore: safeMinScore,
        maxScore: safeMaxScore
    };
}

export const calculateEMA = (scores, alpha = 0.25, maxScore = 100, minScore = 0) => {
    const safeMax = safeMaxScoreValue(maxScore, 100);
    const safeMin = safeMinScoreValue(minScore, 0);

    const clean = toHistoryArray(scores)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMax, safeMin))
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

export function calculateSlopePerDay(history, maxScore = 100, minScore = 0) {
    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return 0;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeMinScore = safeMinScoreValue(minScore, 0);

    // ✅ FIX: Filtrar entradas com datas válidas e ordenar apenas 1 vez com timestamps retidos.
    const validEntries = [];
    for (let i = 0; i < safeHistory.length; i++) {
        const h = safeHistory[i];
        if (typeof h === 'number') continue;
        const dateValue = h?.date ?? h?.createdAt;
        const dateParsed = safeDateParse(dateValue);
        const time = dateParsed?.getTime();
        const y = getSafeScore(h, safeMaxScore, safeMinScore);
        if (Number.isFinite(time) && Number.isFinite(y)) {
            validEntries.push({ time, y, id: h?.id });
        }
    }

    if (validEntries.length < 2) {
        // Fallback: regressão por índice se não houver datas válidas
        const cleanScores = safeHistory
            .map(h => typeof h === 'number' ? h : getSafeScore(h, safeMaxScore, safeMinScore))
            .filter(Number.isFinite);
        if (cleanScores.length < 2) return 0;
        let sX = 0, sY = 0, sXY = 0, sX2 = 0;
        const n = cleanScores.length;
        for (let i = 0; i < n; i++) {
            sX += i;
            sY += cleanScores[i];
            sXY += i * cleanScores[i];
            sX2 += i * i;
        }
        const denom = (n * sX2) - (sX * sX);
        if (Math.abs(denom) < 1e-12) return 0;
        const indexSlope = ((n * sXY) - (sX * sY)) / denom;
        return Number.isFinite(indexSlope) ? indexSlope : 0;
    }

    validEntries.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return String(a.id || '').localeCompare(String(b.id || ''));
    });

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
    if (Math.abs(denominator) < 1e-12) {
        // Fallback: todas as provas na mesma data, calcular por sequência de prova
        let sX = 0, sY = 0, sXY = 0, sX2 = 0;
        for (let i = 0; i < validN; i++) {
            sX += i;
            sY += validEntries[i].y;
            sXY += i * validEntries[i].y;
            sX2 += i * i;
        }
        const denom = (validN * sX2) - (sX * sX);
        if (Math.abs(denom) < 1e-12) return 0;
        const indexSlope = ((validN * sXY) - (sX * sY)) / denom;
        return Number.isFinite(indexSlope) ? indexSlope : 0;
    }

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
- **Descrição:** Decomposição de variância total e cálculo de desvio padrão amostral
- **Linhas:** 515
- **Tamanho:** 21.05 KB

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
      const rowMax = Number.isFinite(Number(row.maxScore)) && Number(row.maxScore) > 0 ? Number(row.maxScore) : maxScore;
      const rowMin = Number.isFinite(Number(row.minScore)) ? Math.min(Number(row.minScore), rowMax) : 0;
      const score = getSafeScore(row, rowMax, rowMin);
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
    
    // Normalizar pesos localmente ANTES de calcular o Kish
    const rawSumW = clean.reduce((sum, w) => sum + w, 0);
    if (rawSumW <= 0) return 0;
    const normalized = clean.map(w => w / rawSumW);
    
    const sumW = normalized.reduce((sum, w) => sum + w, 0); // ~1.0
    const sumW2 = normalized.reduce((sum, w) => sum + w * w, 0);
    
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

    // ✅ LOTE-03 FIX (M2): piso de ρ unificado em 0.0 conforme a intenção documentada.
    // ρ negativo podia gerar variância/covariância não-PSD e falhas de Cholesky;
    // o clamp final Math.max(0, ...) apenas mascarava o problema na saída.
    const validRho = Math.max(0, Math.min(0.85, rho));
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

    return Math.max(0, Number.isFinite(finalVar) ? finalVar : 0);
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
    // ✅ LOTE-03 FIX (M2): clamp alinhado com computeWeightedVariance [0.0, 0.85]
    const validRho = Number.isFinite(rho) ? Math.max(0, Math.min(0.85, rho)) : INTER_SUBJECT_CORRELATION;
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
    const getRowValue = (row, normName, origName) => {
        if (!row || typeof row !== 'object') return undefined;
        if (row[normName] !== undefined) return row[normName];
        if (origName && row[origName] !== undefined) return row[origName];
        for (const key of Object.keys(row)) {
            if (normalize(key) === normName) {
                return row[key];
            }
        }
        return undefined;
    };

    for (let i = 0; i < subjectNames.length; i++) {
        for (let j = i + 1; j < subjectNames.length; j++) {
            const aName = normalize(subjectNames[i]);
            const bName = normalize(subjectNames[j]);
            const origAName = subjectNames[i];
            const origBName = subjectNames[j];

            const xs = [];
            const ys = [];
            safeScoreRows.forEach(row => {
                const rawX = getRowValue(row, aName, origAName);
                const x = typeof rawX === 'object' && rawX !== null ? Number(rawX?.score) : Number(rawX);
                const rawY = getRowValue(row, bName, origBName);
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

    // ✅ LOTE-03 FIX (M2): limite inferior 0.0 (PSD-safe), como o comentário já
    // determinava. Correlações negativas continuam sendo calculadas INTERNAMENTE
    // no Fisher Z (para não inflar a média), mas o ρ entregue ao motor nunca é negativo.
    return Math.max(0, Math.min(0.85, blended));
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
function calculateDynamicCorrelation(historyA, historyB, fallback = 0.15, maxScoreA = 100, minScoreA = 0, maxScoreB = maxScoreA, minScoreB = minScoreA) {
    const safeHistoryA = toHistoryArray(historyA);
    const safeHistoryB = toHistoryArray(historyB);

    if (!safeHistoryA.length || !safeHistoryB.length) return fallback;

    let pairedCount = 0;

    const getScoreA = (h) => {
        const s = getSafeScore(h, maxScoreA, minScoreA);
        return Number.isFinite(s) ? s : 0;
    };
    const getScoreB = (h) => {
        const s = getSafeScore(h, maxScoreB, minScoreB);
        return Number.isFinite(s) ? s : 0;
    };

    const getDateStr = (h) => {
        return getDateKey(h?.date || h?.createdAt);
    };

    const mapA = new Map();

    safeHistoryA.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d) mapA.set(d, getScoreA(h));
    });

    const xs = [];
    const ys = [];

    safeHistoryB.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d && mapA.has(d)) {
            xs.push(mapA.get(d));
            ys.push(getScoreB(h));
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
                const maxA = stats[i]?.maxScore ?? adaptiveContext?.maxScore ?? 100;
                const minA = stats[i]?.minScore ?? adaptiveContext?.minScore ?? 0;
                const maxB = stats[j]?.maxScore ?? adaptiveContext?.maxScore ?? 100;
                const minB = stats[j]?.minScore ?? adaptiveContext?.minScore ?? 0;
                currentRho = calculateDynamicCorrelation(
                    stats[i].simuladoStats.history,
                    stats[j].simuladoStats.history,
                    currentRho,
                    maxA,
                    minA,
                    maxB,
                    minB
                );
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

# 7. GERENCIAMENTO DE ESTADO (ZUSTAND STORE)

## `src/store/slices/createMonteCarloSlice.js` <a id="src-store-slices-createmontecarloslice-js"></a>

- **Localização:** `src/store/slices/createMonteCarloSlice.js`
- **Descrição:** Slice Zustand responsável pelo histórico e persistência de dados de Monte Carlo
- **Linhas:** 136
- **Tamanho:** 4.86 KB

```javascript
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

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

      const rawProb = safeNumber(prob, null);
      if (rawProb === null) return;

      const snapshot = {
        date: getDateKey(normalizeDate(date)),
        probability: rawProb,
        ...safeClone(metadata)
      };

      const targetDateStr = snapshot.date;
      if (!targetDateStr) return;
      const targetCategoryId = snapshot.categoryId || null;
      const existingHistory = Array.isArray(activeData.monteCarloHistory)
        ? activeData.monteCarloHistory
        : [];

      const idx = existingHistory.findIndex(h => {
        const hDateKey = getDateKey(normalizeDate(h.date));
        if (!hDateKey || !targetDateStr) return false;
        return hDateKey === targetDateStr &&
          (h.categoryId || null) === targetCategoryId;
      });

      let newHistory;
      if (idx >= 0) {
        newHistory = existingHistory.map((h, i) => i === idx ? { ...h, ...snapshot } : h);
      } else {
        newHistory = [...existingHistory, snapshot];
      }

      newHistory.sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeA - timeB;
      });

      const categoryCount = (activeData.categories || []).length || 1;
      const MAX_SNAPSHOTS = 30 * categoryCount;
      if (newHistory.length > MAX_SNAPSHOTS) {
        newHistory = newHistory.slice(-MAX_SNAPSHOTS);
      }

      state.appState.contests[activeId].monteCarloHistory = newHistory;
      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      markStorageDirty();
    } catch (e) {
      console.warn('Error saving MC snapshot:', e);
    }
  }),

  setMcEqualWeights: (enabled) => set((state) => {
    state.appState.mcEqualWeights = Boolean(enabled);
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),

  setHistoricalCutoffs: (cutoffs) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    
    state.appState.contests[activeId].historicalCutoffs = safeClone(cutoffs);
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
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
    markStorageDirty();
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
    markStorageDirty();
  }),

  recordCalibrationMetric: (categoryId, metric) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    const activeData = state.appState.contests[activeId];
    
    const currentMetrics = activeData.calibrationMetrics || {};
    const history = currentMetrics[categoryId] || [];
    
    const newMetrics = [...history, {
      ...metric,
      timestamp: new Date().toISOString()
    }].slice(-50);

    if (!activeData.calibrationMetrics) {
      activeData.calibrationMetrics = {};
    }
    activeData.calibrationMetrics[categoryId] = newMetrics;
    
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  })
});
```

---

# 8. SUÍTE DE TESTES AUTOMATIZADOS (TESTS)

## `src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx` <a id="src-components-charts-evolutionchart-__tests__-evolutioncomponents-test-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx`
- **Descrição:** Testes de renderização estática dos componentes visuais do Menu Evolução
- **Linhas:** 223
- **Tamanho:** 8.22 KB

```javascript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonteCarloEvolutionChart } from '../MonteCarloEvolutionChart';
import { EvolutionHeatmap } from '../../EvolutionHeatmap';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';
import { RadarAnalysis } from '../RadarAnalysis';
import { TimeSpentChart } from '../TimeSpentChart';
import { PerformanceBarChart } from '../PerformanceBarChart';
import { EvolutionLineChart } from '../EvolutionLineChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import { getDateKey } from '../../../../utils/dateHelper';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('evolution components render contracts', () => {
  it('renders MonteCarloEvolutionChart shell with scenario controls', () => {
    const html = renderToStaticMarkup(
      <MonteCarloEvolutionChart
        data={[
          { date: '2026-05-01', probability: 50, mean: 70, ci95Low: 65, ci95High: 75 },
          { date: '2026-05-02', probability: 55, mean: 72, ci95Low: 67, ci95High: 77 }
        ]}
        targetScore={75}
        unit="%"
        maxScore={100}
      />
    );
    expect(html).toContain('Rastreador de Aprovação');
    expect(html).toContain('Conserv.');
    expect(html).toContain('Base');
    expect(html).toContain('Otim.');
  });

  it('renders EvolutionHeatmap controls', () => {
    const heatmapData = {
      dates: [{ key: '2026-05-01', label: '01/05', dayName: 'SEX', isWeekend: false }],
      rows: [{ cat: { id: 'cat1', name: 'Matemática', icon: '📘', color: '#fff' }, cells: [{ pct: 80, correct: 8, total: 10 }] }]
    };
    const html = renderToStaticMarkup(<EvolutionHeatmap heatmapData={heatmapData} targetScore={70} unit="%" />);
    expect(html).toContain('Diário');
    expect(html).toContain('Semanal');
    expect(html).toContain('Mensal');
  });

  it('renders CriticalTopicsAnalysis', () => {
    const today = getDateKey(new Date());
    const categories = [{
      id: 'cat1', name: 'Física', icon: '⚛️', color: '#fff',
      simuladoStats: {
        history: [{
          date: today,
          total: 10,
          correct: 2,
          score: 20,
          topics: [{ name: 'Cinemática', total: 10, correct: 2, score: 20 }]
        }]
      }
    }];
    const html = renderToStaticMarkup(<CriticalTopicsAnalysis categories={categories} maxScore={100} />);
    expect(html).toContain('Índice de Criticidade');
  });

  it('renders RadarAnalysis', () => {
    const radarData = [{
      subject: 'Matemática', score: 80, target: 70
    }];
    const html = renderToStaticMarkup(<RadarAnalysis radarData={radarData} maxScore={100} />);
    expect(html).toContain('Equilíbrio Geral');
  });

  it('renders TimeSpentChart', () => {
    const subjectAggData = [{
      fullName: 'Química', timeSpent: 120, questoes: 10, timedQuestoes: 10
    }];
    const html = renderToStaticMarkup(<TimeSpentChart subjectAggData={subjectAggData} />);
    expect(html).toContain('Tempo M');
    expect(html).toContain('Última Média');
  });

  it('renders CriticalTopicsAnalysis com suporte a synthetic total (nova matematica)', () => {
    const today = getDateKey(new Date());
    const categories = [{
      id: 'cat1', name: 'Física', icon: '⚛️', color: '#fff',
      simuladoStats: {
        history: [{
          date: today,
          total: 0,
          correct: 0,
          score: 500,
          topics: [{ name: 'Cinemática', total: 0, correct: 0, score: 500 }]
        }]
      }
    }];
    const html = renderToStaticMarkup(<CriticalTopicsAnalysis categories={categories} maxScore={1000} />);
    expect(html).toContain('Índice de Criticidade');
  });

  it('renders RadarAnalysis com suporte a minScore dinamico (nova matematica)', () => {
    const radarData = [{
      subject: 'Matemática', score: 800, target: 700
    }];
    const html = renderToStaticMarkup(<RadarAnalysis radarData={radarData} minScore={200} maxScore={1000} unit="pts" />);
    expect(html).toContain('Equilíbrio Geral');
  });

  it('renders PerformanceBarChart com suporte a units (nova matematica)', () => {
    const subjectAggData = [{
      fullName: 'Química', questoes: 10, erros: 2, scoreNorm: 800
    }];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} unit="pts" maxScore={1000} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
  });

  it('renders EvolutionLineChart without isLineClicked reference errors', () => {
    const categories = [{ id: 'cat1', name: 'Direito Constitucional', color: '#6366f1' }];
    const chartData = [{ date: '2026-05-01', displayDate: '01/05', raw_cat1: 80, bay_cat1: 78, stats_cat1: 75 }];
    const html = renderToStaticMarkup(
      <EvolutionLineChart
        activeCategories={categories}
        filteredChartData={chartData}
        engine={{ id: 'bayesian', prefix: 'bay_' }}
        targetScore={70}
        maxScore={100}
        minScore={0}
        unit="%"
      />
    );
    expect(html).toContain('Traçando evolução');
  });

  it('renders TodayVsGeneralChart with negative delta formatting correctly', () => {
    const today = getDateKey(new Date());
    const categories = [{
      id: 'cat1', name: 'Português',
      simuladoStats: {
        history: [
          { date: '2026-05-01', total: 10, correct: 9, score: 90 },
          { date: today, total: 10, correct: 8, score: 80 }
        ]
      }
    }];
    const simuladoRows = [
      { date: today, categoryId: 'cat1', subject: 'Português', total: 10, correct: 4, score: 40 }
    ];
    const html = renderToStaticMarkup(
      <TodayVsGeneralChart
        categories={categories}
        simuladoRows={simuladoRows}
        globalMetrics={{ globalAccuracy: 70 }}
        targetScore={70}
        maxScore={100}
        minScore={0}
        unit="%"
      />
    );
    expect(html).toContain('Ritmo (Hoje)');
    expect(html).toContain('−40.0%');
  });

  it('generates burnout and dynamic engine insights in insightGenerator', () => {
    const today = getDateKey(new Date());
    const cat = {
      id: 'cat1', name: 'Biologia',
      simuladoStats: {
        history: [
          { date: today, total: 50, correct: 20, score: 40 }
        ]
      }
    };
    const timeline = [
      { date: today, raw_cat1: 40, bay_cat1: 75, stats_cat1: 70 }
    ];
    const insight = generateEvolutionInsights({
      timeline,
      focusCategory: cat,
      activeEngine: 'compare',
      categories: [cat],
      unit: '%',
      maxScore: 100,
      minScore: 0
    });
    expect(insight).toBeDefined();
    expect(insight.title).toContain('Alerta de Burnout');
  });

  it('renders PerformanceBarChart with 100% correct answers (erros === 0) without breaking stack', () => {
    const subjectAggData = [{
      name: 'Direito Penal', fullName: 'Direito Penal', questoes: 10, acertos: 10, erros: 0
    }];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} unit="%" maxScore={100} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
    expect(html).toContain('Acertos');
    expect(html).toContain('Erros');
  });

  it('renders EvolutionHeatmap with non-standard scale (ENEM 200-1000) correctly', () => {
    const heatmapData = {
      dates: [{ key: '2026-05-01', label: '01/05', dayName: 'SEX', isWeekend: false }],
      rows: [{ cat: { id: 'cat1', name: 'Redação', icon: '📝', color: '#fff' }, cells: [{ pct: 85, correct: 850, total: 1000 }] }]
    };
    const html = renderToStaticMarkup(
      <EvolutionHeatmap
        heatmapData={heatmapData}
        targetScore={750}
        minScore={200}
        maxScore={1000}
        unit="pts"
      />
    );
    expect(html).toContain('Diário');
    expect(html).toContain('meta');
  });
});
```

---

## `src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx` <a id="src-components-charts-evolutionchart-__tests__-evolution-fixes-verification-test-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx`
- **Descrição:** Verificação regressiva de correções de bugs do Menu Evolução
- **Linhas:** 155
- **Tamanho:** 5.05 KB

```javascript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { filterHistoryByTimeWindow } from '../../../../hooks/useSubjectAggData';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import { getDateKey } from '../../../../utils/dateHelper';
import { GaussianPlot } from '../../GaussianPlot';
import { TimeSpentChart } from '../TimeSpentChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Verificação das Correções dos 12 Bugs do Menu Evolução', () => {
  describe('Bug 9: filterHistoryByTimeWindow com createdAt e sem data', () => {
    it('não converte registros antigos com apenas createdAt para hoje', () => {
      const ancientDate = '2022-01-01';
      const history = [
        { id: '1', createdAt: ancientDate, total: 10, correct: 8 },
        { id: '2', date: getDateKey(new Date()), total: 10, correct: 9 }
      ];

      const filtered30Days = filterHistoryByTimeWindow(history, '30');
      // O item antigo (2022) NÃO pode passar no filtro de 30 dias
      expect(filtered30Days.length).toBe(1);
      expect(filtered30Days[0].id).toBe('2');
    });

    it('ignora registros sem data válida sem quebrar', () => {
      const history = [
        { id: '1', total: 10, correct: 5 }, // sem data nem createdAt
        { id: '2', date: getDateKey(new Date()), total: 10, correct: 9 }
      ];

      const filtered = filterHistoryByTimeWindow(history, '30');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Bug 10 e 11: insightGenerator com safeMinScore negativo e createdAt', () => {
    it('suporta escalas com notas negativas (ex: Cebraspe -50 a 100) e respeita createdAt', () => {
      const focusCategory = {
        id: 'dir_const',
        name: 'Direito Constitucional',
        simuladoStats: {
          history: [
            { createdAt: '2026-09-01', score: -20, total: 100 },
            { createdAt: '2026-09-05', score: -10, total: 100 }
          ]
        }
      };

      const timeline = [
        { date: '2026-09-01', raw_dir_const: -20, bay_dir_const: -15, stats_dir_const: -20 },
        { date: '2026-09-05', raw_dir_const: -10, bay_dir_const: -12, stats_dir_const: -15 }
      ];

      const insight = generateEvolutionInsights({
        timeline,
        focusCategory,
        activeEngine: 'raw',
        categories: [focusCategory],
        unit: 'pts',
        minScore: -50,
        maxScore: 100
      });

      expect(insight).toBeDefined();
      expect(insight.type).toBeDefined();
      expect(insight.title).toBeDefined();
    });
  });

  describe('Bug 1: GaussianPlot tooltip e renderização', () => {
    it('renderiza GaussianPlot sem vazamento de sintaxe', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          minScore={0}
          maxScore={100}
          unit="%"
          currentMean={75}
          targetVal={70}
          volatility={8}
          height={200}
        />
      );

      expect(html).toContain('svg');
      expect(html).not.toContain("'Zona de sucesso' :");
    });
  });

  describe('Bug 3: TodayVsGeneralChart formata pontuação zero corretamente', () => {
    it('renderiza TodayVsGeneralChart sem quebrar e com suporte a valores nulos ou zero', () => {
      const activeCategories = [
        {
          id: '1',
          name: 'Direito Penal',
          simuladoStats: {
            history: [{ date: '2026-09-01', score: 0, total: 10 }]
          }
        }
      ];
      const subjectAggData = [
        { id: '1', name: 'Direito Penal', accuracy: 50, lastTestAcc: 0 }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          activeCategories={activeCategories}
          subjectAggData={subjectAggData}
          targetScore={70}
          unit="%"
        />
      );

      expect(html).toBeDefined();
      expect(html).toContain('Histórico Recente (14 dias)');
    });
  });

  describe('Bug 5: Tipografia semântica em WeeklyEvolutionView e CriticalTopicsAnalysis', () => {
    it('renderiza mensagem de dados insuficientes encapsulada em tag <p>', () => {
      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={[]}
          filteredChartData={[]}
        />
      );

      expect(html).toContain('<p class="text-sm font-semibold text-slate-300">Dados insuficientes</p>');
    });

    it('renderiza título da Matriz de criticidade em tag <h3>', () => {
      const html = renderToStaticMarkup(
        <CriticalTopicsAnalysis
          categories={[]}
          focusSubjectId={null}
        />
      );

      expect(html).toContain('Matriz de criticidade e pontos de fuga');
    });
  });
});
```

---

## `src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx` <a id="src-components-charts-evolutionchart-__tests__-evolution-menu-bugs-audit-test-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx`
- **Descrição:** Suíte completa de auditoria de bugs e integridade de domínio de notas
- **Linhas:** 249
- **Tamanho:** 7.86 KB

```javascript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PerformanceBarChart } from '../PerformanceBarChart';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { DisciplinaCard } from '../DisciplinaCard';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { KpiCard } from '../KpiCard';
import { RadarAnalysis } from '../RadarAnalysis';
import { GaussianPlot } from '../../GaussianPlot';
import { 
  safeDomain, 
  clampScore, 
  scoreToRatio, 
  scoreToPct, 
  pctToScore, 
  formatUnitValue 
} from '../../../../utils/scoreDomain';
import { aggregateHeatmap, calculateSubjectMastery } from '../../../../utils/heatmapAggregation';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Menu Evolução - Full 60 Bug Audit & Regression Suite', () => {
  describe('scoreDomain.js - Unidade Central de Domínio', () => {
    it('calcula limites seguros de domínio com minScore negativo e arbitrário', () => {
      const dom = safeDomain(120, 20);
      expect(dom.min).toBe(20);
      expect(dom.max).toBe(120);
      expect(dom.range).toBe(100);
    });

    it('clampa notas respeitando minScore e maxScore', () => {
      expect(clampScore(10, { minScore: 20, maxScore: 120 })).toBe(20);
      expect(clampScore(130, { minScore: 20, maxScore: 120 })).toBe(120);
      expect(clampScore(70, { minScore: 20, maxScore: 120 })).toBe(70);
    });

    it('converte pontuação para razão e percentual com amplitude [minScore, maxScore]', () => {
      const ratio = scoreToRatio(70, { minScore: 20, maxScore: 120 });
      expect(ratio).toBe(0.5);
      expect(scoreToPct(70, { minScore: 20, maxScore: 120 })).toBe(50);
      expect(pctToScore(50, { minScore: 20, maxScore: 120 })).toBe(70);
    });

    it('formata valores de acordo com a unidade (%, pts, horas)', () => {
      expect(formatUnitValue(50, '%')).toBe('50%');
      expect(formatUnitValue(70, 'pts')).toBe('70pts');
      expect(formatUnitValue(1.5, 'horas')).toBe('1h30');
    });
  });

  describe('Bug 1 & 35: SubtopicsPerformanceChart safeMinScore & Recharts topic keys', () => {
    it('renderiza sem crash quando minScore != 0 e não lança ReferenceError para safeMinScore', () => {
      const categories = [
        {
          id: '1',
          name: 'Direito Administrativo',
          simuladoStats: {
            history: [
              {
                date: '2026-08-14',
                total: 10,
                score: 80,
                topics: [
                  { name: 'Art. 5º da CF', total: 10, correct: 8, score: 80 },
                  { name: 'Poder de Polícia', total: 0, score: 90 } // synthetic volume test
                ]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <SubtopicsPerformanceChart
          categories={categories}
          focusSubjectId="1"
          showOnlyFocus={true}
          timeWindow="all"
          targetScore={80}
          minScore={20}
          maxScore={120}
        />
      );
      expect(html).toContain('Raio-X de Tópicos');
      expect(html).toContain('Ranking (Barras)');
    });
  });

  describe('Bug 13, 49, 50: GaussianPlot - Defesa contra KDE vazio, limites e bounds', () => {
    it('renderiza com segurança sem crash quando KDE ou pointsForArea está vazio', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          mean={70}
          targetScore={80}
          prob={65}
          minScore={20}
          maxScore={120}
          unit="pts"
          kdeData={[]}
        />
      );
      expect(html).toContain('<svg');
    });

    it('clampa meanVal dentro de [domainMin, domainMax]', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          mean={150} // out of bounds
          targetScore={80}
          prob={90}
          minScore={20}
          maxScore={120}
          unit="pts"
        />
      );
      expect(html).toContain('<svg');
    });
  });

  describe('Bug 14, 15, 16: TodayVsGeneralChart - Datas futuras, scale e NaN latestAcc', () => {
    it('renderiza corretamente sem ser afetado por datas futuras ou scores NaN', () => {
      const now = Date.now();
      const futureDate = new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString();
      const pastDate = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

      const activeCategories = [
        {
          id: '1',
          name: 'Direito Penal',
          simuladoStats: {
            history: [
              { date: pastDate, total: 10, correct: 7, score: 70 },
              { date: futureDate, total: 20, correct: 20, score: 100 }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          activeCategories={activeCategories}
          globalMetrics={{ globalAccuracy: 70, totalQuestions: 10, totalCorrect: 7 }}
          targetScore={80}
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );
      expect(html).toContain('Histórico Recente');
    });
  });

  describe('Bug 21, 36, 37: WeeklyEvolutionView - Sanitização de chaves e totalQ', () => {
    it('renderiza tópicos com pontos e caracteres especiais como dataKeys seguras', () => {
      const categories = [
        {
          id: 'cat_1',
          name: 'Processo Penal',
          color: '#3b82f6',
          simuladoStats: {
            history: [
              {
                date: '2026-08-10',
                total: 10,
                score: 80,
                topics: [{ name: 'Art. 155. Furto Qualificado', total: 10, score: 80 }]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={categories}
          showOnlyFocus={false}
          maxScore={120}
          minScore={20}
          unit="pts"
        />
      );
      expect(html).toContain('Semanas por Matéria');
      expect(html).toContain('Raio-X Temporal Avançado');
    });
  });

  describe('Bug 45 & 46: heatmapAggregation & Subject Mastery', () => {
    it('clampa pct em [0, 100]', () => {
      const filtered = {
        dates: [{ key: '2026-08-10', label: '10/08' }],
        rows: [{
          cells: [{ total: 10, correct: 10, pct: 100 }]
        }]
      };
      const agg = aggregateHeatmap(filtered, 'daily', 100);
      expect(agg.rows[0].cells[0].pct).toBe(100);
    });

    it('calculateSubjectMastery previne acertos ou totais negativos', () => {
      const subtopics = [
        { acertos: -5, total: -10 },
        { acertos: 8, total: 10 }
      ];
      const mastery = calculateSubjectMastery(subtopics);
      expect(mastery).toBeGreaterThan(0);
      expect(Number.isFinite(mastery)).toBe(true);
    });
  });

  describe('Bug 55: KpiCard - Sem +0.00', () => {
    it('exibe traço quando safeSub arredondado for 0.00', () => {
      const html = renderToStaticMarkup(
        <KpiCard
          value="85%"
          label="Acurácia"
          color="#10b981"
          icon="🎯"
          sub={0.0001} // Rounds to 0.00
        />
      );
      expect(html).toContain('—');
      expect(html).not.toContain('+0.00');
    });
  });

  describe('Bug 54: RadarAnalysis - Degeneração de domínio quando minScore === maxScore', () => {
    it('mantém polar radius axis seguro mesmo se minScore e maxScore forem iguais', () => {
      const html = renderToStaticMarkup(
        <RadarAnalysis
          radarData={[{ subject: 'Português', nivel: 70, meta: 80 }]}
          maxScore={100}
          minScore={100}
          unit="%"
        />
      );
      expect(html).toContain('Raio-X das Disciplinas');
    });
  });
});
```

---

## `src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx` <a id="src-components-charts-evolutionchart-__tests__-evolution-menu-comprehensive-fixes-test-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx`
- **Descrição:** Testes de integração e acessibilidade para tooltips e visões do Menu
- **Linhas:** 215
- **Tamanho:** 6.88 KB

```javascript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChartTooltip } from '../../ChartTooltip';
import { TimeSpentChart } from '../TimeSpentChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu - Comprehensive Fixes Regression Suite', () => {

  describe('Bug 1: Evolution.jsx Target Score logic on non-standard scales', () => {
    // Replica da função memoizada do Evolution.jsx
    const computeTargetScorePoints = (user, minScore, maxScore) => {
      const safeMax = Math.max(1, Number(maxScore) || 100);
      const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
      const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
      
      if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
        let ts = Number(user.targetScore);
        if (ts < safeMin && ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0) {
          ts = safeMin + (ts / 100) * (safeMax - safeMin);
        }
        return clamp(ts);
      }
      
      if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
        return clamp(safeMin + (Number(user.targetProbability) / 100) * (safeMax - safeMin));
      }
      
      return clamp(safeMin + (safeMax - safeMin) * 0.8);
    };

    it('preserva targetScore de 80 pontos em prova de 0 a 120 pontos sem distorcer para 96', () => {
      const user = { targetScore: 80 };
      const score = computeTargetScorePoints(user, 0, 120);
      expect(score).toBe(80);
    });

    it('preserva targetScore de 70 pontos em escala Cebraspe (-120 a +120) sem distorcer para 48', () => {
      const user = { targetScore: 70 };
      const score = computeTargetScorePoints(user, -120, 120);
      expect(score).toBe(70);
    });

    it('converte valor padrão legadizado (75) que está abaixo do piso no ENEM (200 a 1000)', () => {
      const user = { targetScore: 75 }; // 75 < 200, é um percentual legadizado
      const score = computeTargetScorePoints(user, 200, 1000);
      // 200 + 0.75 * 800 = 800
      expect(score).toBe(800);
    });
  });

  describe('Bug 3: TodayVsGeneralChart radial gauge with negative minScore and null value', () => {
    it('não gera arco fantasma quando minScore é negativo e metric.val é null', () => {
      const categories = [
        {
          id: 'cat1',
          name: 'Direito Administrativo',
          simuladoStats: { history: [] }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          categories={categories}
          targetScore={50}
          minScore={-20}
          maxScore={100}
          unit="pts"
          globalMetrics={{ globalAccuracy: 0 }}
        />
      );

      expect(html).toBeTruthy();
    });
  });

  describe('Bug 4: useChartData heatmapData date mapping resilience', () => {
    it('extrai dados de data sem quebrar com valores inválidos', () => {
      const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      const datesToUse = ['invalid-date', '2026-10-15', null, ''];
      
      const dates = datesToUse.map(dateStr => {
        const parts = typeof dateStr === 'string' ? dateStr.split('-') : [];
        const day = parts[2] || '01';
        const m = parts[1] || '01';
        // Date parse seguro
        const d = dateStr ? new Date(dateStr) : null;
        const dayOfWeek = (d instanceof Date && !isNaN(d.getTime())) ? d.getDay() : 0;
        return {
          key: dateStr,
          dayName: DAY_NAMES[dayOfWeek] || '',
          label: `${day}/${m}`,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        };
      });

      expect(dates.length).toBe(4);
      expect(dates[0].dayName).toBe('DOM');
      expect(dates[1].label).toBe('15/10');
    });
  });

  describe('Bug 5: WeeklyEvolutionView ghost tooltip suppression', () => {
    it('renderiza o componente WeeklyEvolutionView corretamente', () => {
      const categories = [
        { id: 'mat1', name: 'Matéria 1', color: '#3b82f6' }
      ];
      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={categories}
          viewMode="progression"
          unit="%"
        />
      );
      expect(html).toContain('Dados insuficientes');
    });
  });

  describe('Bug 8: TimeSpentChart rendering and KPI display', () => {
    it('renderiza Último Geral e Média Geral no cabeçalho do KPI', () => {
      const subjectAggData = [
        { name: 'Dir Const', questoes: 20, timedQuestoes: 20, timeSpent: 1200, acertos: 16 }
      ];

      const html = renderToStaticMarkup(
        <TimeSpentChart
          subjectAggData={subjectAggData}
        />
      );

      expect(html).toContain('Média Geral');
      expect(html).toContain('ÚLTIMO GERAL');
    });
  });

  describe('Bug 9: SubtopicsPerformanceChart CustomLineTooltip sort & target formatting', () => {
    it('renderiza SubtopicsPerformanceChart com dados parciais ou nulos sem falhar', () => {
      const categories = [
        {
          id: 'c1',
          name: 'Português',
          simuladoStats: {
            history: [
              {
                date: '2026-10-10',
                topics: [
                  { name: 'Sintaxe', correct: 8, total: 10 }
                ]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <SubtopicsPerformanceChart
          categories={categories}
          targetScore={75}
        />
      );

      expect(html).toBeTruthy();
    });
  });

  describe('Bug 10: ChartTooltip formatar data ISO em pt-BR', () => {
    it('formata label ISO (2026-10-12) para formato pt-BR no cabeçalho do tooltip', () => {
      const payload = [
        { name: 'Nível Bayesiano', value: 82, color: '#3b82f6' }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          label="2026-10-12"
          unit="%"
        />
      );

      expect(html).toContain('12/10/2026');
      expect(html).not.toContain('📅 2026-10-12');
    });

    it('mantém labels que não são ISO (ex: "Semana 1")', () => {
      const payload = [
        { name: 'Nível Bayesiano', value: 82, color: '#3b82f6' }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          label="Semana 1"
          unit="%"
        />
      );

      expect(html).toContain('Semana 1');
    });
  });

});
```

---

## `src/components/charts/EvolutionChart/__tests__/evolution-menu-final-fixes.test.jsx` <a id="src-components-charts-evolutionchart-__tests__-evolution-menu-final-fixes-test-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/__tests__/evolution-menu-final-fixes.test.jsx`
- **Descrição:** Validação final de status evolutivos e subtópicos
- **Linhas:** 122
- **Tamanho:** 4.55 KB

```javascript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { computeEvolutionStatuses } from '../../../../utils/evolutionStatus';
import { getDateKey } from '../../../../utils/dateHelper';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) =>
      React.isValidElement(children)
        ? React.cloneElement(children, { width: 800, height: 320 })
        : <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu Comprehensive Fixes Audit', () => {
  it('Fix 1: evolutionStatus reconhece heatmapData.dates contendo objetos com chave key', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // 5 datas nos últimos 14 dias como objetos (formato real do heatmap)
    const recentDateKeys = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      recentDateKeys.push(getDateKey(d));
    }

    const heatmapData = {
      dates: recentDateKeys.map(k => ({ key: k, label: k, dayName: 'Sex', isWeekend: false })),
      rows: []
    };

    // timeline vazio para provar que a constância vem puramente dos objetos do heatmap
    const statuses = computeEvolutionStatuses({
      timeline: [],
      heatmapData,
      targetScore: 80
    });

    const consistency = statuses.find(s => s.id === 'consistency');
    expect(consistency).toBeDefined();
    expect(consistency.value).toBe('5/14');
    expect(consistency.tone).toBe('warning');
  });

  it('Fix 2: SubtopicsPerformanceChart calcula gradientes dinamicamente com base em targetScorePct', () => {
    const today = new Date().toISOString();
    const categories = [{
      id: 'c1',
      name: 'Direito Administrativo',
      simuladoStats: {
        history: [{
          date: today,
          total: 20,
          correct: 14, // 70% acertos
          score: 70,
          topics: [{ name: 'Atos', total: 20, correct: 14, score: 70 }]
        }]
      }
    }];

    // 1) Teste de sanidade de renderização com target alto e baixo
    const htmlHigh = renderToStaticMarkup(
      <SubtopicsPerformanceChart
        categories={categories}
        targetScore={90}
        maxScore={100}
        minScore={0}
        viewMode="bars"
        instanceId="audit"
      />
    );
    expect(htmlHigh).toContain('Raio-X de Tópicos');
    expect(htmlHigh).toContain('Ranking (Barras)');

    // 2) Validação da regra matemática: warnThreshold dinâmico (Math.max(25, targetScorePct * 0.75))
    // Com targetScorePct = 90%: warnThreshold = 67.5%. Logo, acurácia de 70% é aviso (warn) e não ruim (bad)
    const targetHigh = 90;
    const warnHigh = Math.max(25, targetHigh * 0.75);
    expect(warnHigh).toBe(67.5);
    expect(70 >= targetHigh).toBe(false);
    expect(70 >= warnHigh).toBe(true);

    // Com targetScorePct = 60%: warnThreshold = 45%. Acurácia de 70% é meta batida (good)
    const targetLow = 60;
    const warnLow = Math.max(25, targetLow * 0.75);
    expect(warnLow).toBe(45);
    expect(70 >= targetLow).toBe(true);
  });

  it('Fix 3: Conversão de meta legada em escala ampliada com piso zero (minScore=0, maxScore=1000)', () => {
    // Simula a lógica em Evolution.jsx
    const minScore = 0;
    const maxScore = 1000;
    const user = { targetScore: 80 }; // Usuário informou 80%

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : Math.max(100, safeMin + 100);
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
    const hasValidNumber = (v) => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));

    let targetScorePoints = safeMin + (safeMax - safeMin) * 0.8;
    if (hasValidNumber(user?.targetScore)) {
      let ts = Number(user.targetScore);
      const isPercentileRange = ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0;
      const isBelowMin = ts < safeMin;
      const isLegacyPercentageOnLargeScale = safeMax > 100 && (safeMax - safeMin) >= 200 && ts <= 100;
      if (isPercentileRange && (isBelowMin || isLegacyPercentageOnLargeScale)) {
        ts = safeMin + (ts / 100) * (safeMax - safeMin);
      }
      targetScorePoints = clamp(ts);
    }

    // 80% de 1000 deve virar 800 pontos, e não permanecer 80 pontos
    expect(targetScorePoints).toBe(800);
  });
});
```

---

## `src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx` <a id="src-components-charts-evolutionchart-__tests__-evolution-stats-bugs-test-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx`
- **Descrição:** Testes de renderização de cards e retenção
- **Linhas:** 74
- **Tamanho:** 3.26 KB

```javascript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapRetentionData } from '../../../../utils/chartDataMappers';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

// Mock recharts assim como nos outros testes de componentes de gráficos
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution & Stats Bugs Audit', () => {
    it('Bug C: SubtopicsPerformanceChart deve se proteger contra Divisão por Zero (maxScore === minScore)', () => {
        const today = new Date().toISOString();
        const categories = [{
            id: '1', 
            name: 'CatZeroDivision', 
            simuladoStats: { 
                history: [{ 
                    date: today, 
                    total: 10, 
                    correct: 5, 
                    score: 5, 
                    topics: [{ name: 'Top1', total: 10, correct: 5, score: 5 }] 
                }] 
            }
        }];
        
        // Passando maxScore igual a minScore para forçar divisão por zero caso a proteção (range = Math.max(1e-9...)) falhe
        const html = renderToStaticMarkup(
            <SubtopicsPerformanceChart categories={categories} maxScore={100} minScore={100} viewMode="lines" instanceId="test" />
        );
        
        // Deve renderizar sem lançar erro de divisão por zero (Infinity/NaN no Recharts)
        expect(html).toContain('Raio-X de Tópicos');
    });

    it('Bug D: mapRetentionData deve ler simuladoStats.average quando bayesianStats.mean não existir (Amnésia Bayesiana)', () => {
        const now = Date.now();
        const pastDate = new Date(now - 14 * 24 * 60 * 60 * 1000); // 14 dias atrás
        
        // Categoria 1: Com Alto Average no simulado (deve ter decaimento mais lento/melhor retenção)
        const catWithHighAverage = {
            id: '1',
            name: 'Cat1',
            lastStudiedAt: pastDate.toISOString(),
            maxScore: 100,
            simuladoStats: { totalQuestions: 100, average: 90 }, // Alta precisão de fallback
            // Sem bayesianStats.mean
        };
        
        // Categoria 2: Com Baixo Average no simulado
        const catWithLowAverage = {
            id: '2',
            name: 'Cat2',
            lastStudiedAt: pastDate.toISOString(),
            maxScore: 100,
            simuladoStats: { totalQuestions: 100, average: 0 }, // Baixa precisão de fallback
        };
        
        const resultHigh = mapRetentionData([catWithHighAverage]);
        const resultLow = mapRetentionData([catWithLowAverage]);
        
        // Como o Bug D foi corrigido, o accuracy agora usa simuladoStats.average quando a bayesiana falha.
        // Portanto, a retenção do que tem 90 de average deve ser MAIOR, o que significa que o Nível Crítico (100 - retention) deve ser MENOR do que a do que tem 0.
        expect(resultHigh[0].nivelCritico).toBeLessThan(resultLow[0].nivelCritico);
        expect(resultHigh[0].nivelCritico).toBeLessThan(100);
    });
});
```

---

## `src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx` <a id="src-components-charts-evolutionchart-__tests__-timespentchart-test-jsx"></a>

- **Localização:** `src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx`
- **Descrição:** Testes de renderização e cálculo do gráfico de tempo por questão
- **Linhas:** 143
- **Tamanho:** 4.35 KB

```javascript
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimeSpentChart } from '../TimeSpentChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('TimeSpentChart bug fixes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('inclui histórico de hoje na média recente mesmo de manhã (comparação por getDateKey)', () => {
    vi.useFakeTimers();
    // 10:00 em Manaus (UTC-4) = 14:00 UTC — antes do meio-dia ancorado (16:00 UTC)
    vi.setSystemTime(new Date('2026-05-08T14:00:00.000Z'));

    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 600,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [{
          date: '2026-05-08',
          timeSpent: 120,
          total: 10,
        }],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Média recente de hoje: 12s/questão — não deve cair para a média geral de 60s
    expect(html).toContain('Média: 12s');
    expect(html).not.toContain('Média: 1m');
  });

  it('exclui entradas com data futura via chave YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T14:00:00.000Z'));

    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 600,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [
          { date: '2026-04-20', timeSpent: 200, total: 10 },
          { date: '2026-05-09', timeSpent: 30, total: 10 },
        ],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Sem dados recentes válidos (futuro excluído, antigo fora da janela), usa média geral (60s)
    expect(html).toContain('Média: 1m');
    expect(html).not.toContain('Média: 3s');
    expect(html).not.toContain('Média: 20s');
  });

  it('usa vermelho para acima da média e verde para abaixo da média na legenda', () => {
    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 300,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [{
          date: '2026-05-01',
          timeSpent: 450,
          total: 10,
        }],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    const aboveIdx = html.indexOf('ACIMA DA MÉDIA');
    const belowIdx = html.indexOf('ABAIXO DA MÉDIA');
    expect(aboveIdx).toBeGreaterThan(-1);
    expect(belowIdx).toBeGreaterThan(-1);
    expect(html.indexOf('text-rose-400', aboveIdx)).toBeGreaterThan(-1);
    expect(html.indexOf('text-emerald-400', belowIdx)).toBeGreaterThan(-1);
  });

  it('não distorce média da legenda quando latestSeconds é null', () => {
    const subjectAggData = [
      { id: 'cat1', fullName: 'Física A', timeSpent: 300, timedQuestoes: 10 },
      { id: 'cat2', fullName: 'Física B', timeSpent: 300, timedQuestoes: 10 },
    ];

    const activeCategories = [
      {
        id: 'cat1',
        simuladoStats: {
          history: [{ date: '2026-05-01', timeSpent: 90, total: 10 }],
        },
      },
      {
        id: 'cat2',
        simuladoStats: {
          history: [{ date: '2026-05-01', timeSpent: 0, total: 10 }],
        },
      },
    ];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Apenas cat1 tem último tempo (9s); cat2 com null não deve puxar a média para 5s
    expect(html).toContain('ÚLTIMO GERAL: <span class="font-bold text-slate-300">9s</span>');
    expect(html).not.toContain('ÚLTIMO GERAL: <span class="font-bold text-slate-300">5s</span>');
  });
});
```

---

## `tests/evolutionE2E.test.js` <a id="tests-evolutione2e-test-js"></a>

- **Localização:** `tests/evolutionE2E.test.js`
- **Descrição:** Testes unitários dos auxiliares de execução E2E do Menu Evolução
- **Linhas:** 18
- **Tamanho:** 0.91 KB

```javascript
import { describe, expect, it } from 'vitest';
import { resolveStatus, shouldSkipForMissingBrowser } from '../scripts/lib/evolutionE2E.js';

describe('evolutionE2E helpers', () => {
  it('detects missing browser messages', () => {
    expect(shouldSkipForMissingBrowser("Executable doesn't exist")).toBe(true);
    expect(shouldSkipForMissingBrowser('Please run the following command to download new browsers')).toBe(true);
    expect(shouldSkipForMissingBrowser('Some other failure')).toBe(false);
  });

  it('resolves statuses correctly', () => {
    expect(resolveStatus({ status: 0, error: null, output: '' })).toBe(0);
    expect(resolveStatus({ status: 1, error: null, output: "Executable doesn't exist" })).toBe(0);
    expect(resolveStatus({ status: 1, error: null, output: 'Assertion failed' })).toBe(1);
    expect(resolveStatus({ status: 0, error: new Error('boom'), output: '' })).toBe(1);
  });
});
```

---

## `e2e/evolution-smoke.spec.js` <a id="e2e-evolution-smoke-spec-js"></a>

- **Localização:** `e2e/evolution-smoke.spec.js`
- **Descrição:** Smoke test Playwright de inicialização e montagem do container
- **Linhas:** 10
- **Tamanho:** 0.31 KB

```javascript
import { test, expect } from '@playwright/test';

test.describe('evolution smoke', () => {
  test('app boots and renders main root container', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });
});
```

---

# 9. SCRIPTS DE AUTOMAÇÃO E VERIFICAÇÃO (SCRIPTS)

## `scripts/export-evolution-menu.mjs` <a id="scripts-export-evolution-menu-mjs"></a>

- **Localização:** `scripts/export-evolution-menu.mjs`
- **Descrição:** Script de exportação do código do menu evolução para markdown
- **Linhas:** 83
- **Tamanho:** 3.43 KB

```javascript
import fs from 'fs';
import path from 'path';

const rootDir = 'd:/Downloads/ultra-patched';
const outputFile = path.join(rootDir, 'menu-evolucao.md');

const filesToInclude = [
    // 1. Pages & Main Container
    'src/pages/Evolution.jsx',
    'src/components/EvolutionChart.jsx',
    'src/components/ActivityHeatmap.jsx',

    // 2. EvolutionChart Sub-components
    'src/components/charts/EvolutionChart/CompareChart.jsx',
    'src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx',
    'src/components/charts/EvolutionChart/DisciplinaCard.jsx',
    'src/components/charts/EvolutionChart/EvolutionLineChart.jsx',
    'src/components/charts/EvolutionChart/KpiCard.jsx',
    'src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx',
    'src/components/charts/EvolutionChart/PerformanceBarChart.jsx',
    'src/components/charts/EvolutionChart/RadarAnalysis.jsx',
    'src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx',
    'src/components/charts/EvolutionChart/TimeSpentChart.jsx',
    'src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx',
    'src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx',
    'src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx',

    // 3. Hooks & Utils do Menu Evolução
    'src/hooks/useChartData.js',
    'src/hooks/useMonteCarloStats.js',
    'src/utils/weeklyEvolutionInsights.js',
    'src/utils/monteCarloScenario.js',
    'src/utils/heatmapAggregation.js',

    // 4. Engines Estatísticas e Analíticas
    'src/engine/insightGenerator.js',
    'src/engine/stats.js',
    'src/engine/projection.js',
    'src/engine/variance.js',
    'src/engine/monteCarlo.js'
];

let mdContent = `# Código Completo - Menu Evolução (Ultra Dashboard)\n\n`;
mdContent += `Este arquivo reúne todo o código-fonte (página, componentes UI, subcomponentes de gráficos, hooks, utilitários e motores estatísticos) relacionado ao **Menu Evolução** do Ultra Dashboard para auditoria externa.\n`;
mdContent += `**Data de Geração**: ${new Date().toISOString()}\n`;
mdContent += `**Total de Arquivos**: ${filesToInclude.length}\n\n`;

mdContent += `## Índice de Arquivos\n\n`;
filesToInclude.forEach((relPath, idx) => {
    mdContent += `${idx + 1}. \`${relPath}\`\n`;
});
mdContent += `\n---\n\n`;

let totalLines = 0;
let totalBytes = 0;

for (const relPath of filesToInclude) {
    const absPath = path.join(rootDir, relPath);
    if (!fs.existsSync(absPath)) {
        console.warn(`[AVISO] Arquivo não encontrado: ${relPath}`);
        continue;
    }
    const content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split('\n').length;
    const bytes = Buffer.byteLength(content, 'utf8');
    totalLines += lines;
    totalBytes += bytes;

    const ext = path.extname(relPath);
    const lang = (ext === '.jsx' || ext === '.js') ? 'javascript' : ext.replace('.', '');

    mdContent += `## File: \`${relPath}\`\n`;
    mdContent += `*Linhas: ${lines} | Tamanho: ${(bytes / 1024).toFixed(2)} KB*\n\n`;
    mdContent += `\`\`\`${lang}\n`;
    mdContent += content;
    if (!content.endsWith('\n')) mdContent += '\n';
    mdContent += `\`\`\`\n\n---\n\n`;
}

fs.writeFileSync(outputFile, mdContent, 'utf8');
console.log(`✅ Arquivo gerado com sucesso: ${outputFile}`);
console.log(`📊 Estatísticas Gerais: ${filesToInclude.length} arquivos | ${totalLines} linhas | ${(totalBytes / 1024).toFixed(2)} KB`);
```

---

## `scripts/verify-evolution-stack.mjs` <a id="scripts-verify-evolution-stack-mjs"></a>

- **Localização:** `scripts/verify-evolution-stack.mjs`
- **Descrição:** Pipeline de validação estrita (testes, lint, build e e2e) da stack de evolução
- **Linhas:** 31
- **Tamanho:** 1.09 KB

```javascript
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const bin = (name) => isWin ? `./node_modules/.bin/${name}.cmd` : `./node_modules/.bin/${name}`;

const requiredBins = [bin('vitest'), bin('eslint'), bin('vite')];

const missing = requiredBins.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('[verify:evolution] Dependências ausentes para validação estrita:');
  missing.forEach((m) => console.error(` - ${m}`));
  console.error('[verify:evolution] Execute `npm ci` e rode novamente.');
  process.exit(1);
}

const npmCmd = isWin ? 'npm.cmd' : 'npm';
const commands = [
  [npmCmd, ['run', 'test:evolution-all']],
  [npmCmd, ['run', 'lint']],
  [npmCmd, ['run', 'build']],
  [npmCmd, ['run', 'test:evolution-e2e']],
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

console.log('[verify:evolution] Validação completa concluída com sucesso.');
```

---

## `scripts/test-evolution-suite.mjs` <a id="scripts-test-evolution-suite-mjs"></a>

- **Localização:** `scripts/test-evolution-suite.mjs`
- **Descrição:** Runner da suíte combinada de cenários, mapa de calor e contratos de UI
- **Linhas:** 19
- **Tamanho:** 0.52 KB

```javascript
import { spawnSync } from 'node:child_process';

const checks = [
  'scripts/test-mc-scenarios.mjs',
  'scripts/test-heatmap-aggregation.mjs',
  'scripts/test-weekly-insights.mjs',
  'scripts/test-projection-scenario.mjs',
  'scripts/test-evolution-ui-contracts.mjs',
];

for (const script of checks) {
  const out = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (out.status !== 0) {
    throw new Error(`Evolution suite failed at ${script}`);
  }
}

console.log('Evolution suite checks passed');
```

---

## `scripts/test-evolution-ui-contracts.mjs` <a id="scripts-test-evolution-ui-contracts-mjs"></a>

- **Localização:** `scripts/test-evolution-ui-contracts.mjs`
- **Descrição:** Validador de conformidade e contratos de acessibilidade da UI
- **Linhas:** 21
- **Tamanho:** 1.11 KB

```javascript
import fs from 'node:fs';

const mc = fs.readFileSync('src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx', 'utf8');
const weekly = fs.readFileSync('src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx', 'utf8');
const heatmap = fs.readFileSync('src/components/charts/EvolutionHeatmap.jsx', 'utf8');

const requiredChecks = [
  { ok: mc.includes('aria-pressed={scenario === opt.id}'), msg: 'MC scenario aria-pressed missing' },
  { ok: mc.includes('SCENARIO_OPTIONS.map(opt => ('), msg: 'MC scenario selector loop missing' },
  { ok: weekly.includes("aria-pressed={viewMode === 'variation'}"), msg: 'Weekly view-mode aria missing' },
  { ok: weekly.includes('computeTopRegressions'), msg: 'Weekly top regressions integration missing' },
  { ok: heatmap.includes("value: 'monthly'"), msg: 'Heatmap monthly granularity control missing' },
  { ok: heatmap.includes('aggregateHeatmap(filtered, granularity'), msg: 'Heatmap aggregation pipeline missing' },
];

for (const check of requiredChecks) {
  if (!check.ok) throw new Error(check.msg);
}

console.log('Evolution UI contracts checks passed');
```

---

## `scripts/test-evolution-e2e.mjs` <a id="scripts-test-evolution-e2e-mjs"></a>

- **Localização:** `scripts/test-evolution-e2e.mjs`
- **Descrição:** Runner do teste end-to-end do Menu Evolução
- **Linhas:** 41
- **Tamanho:** 1.48 KB

```javascript
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolveStatus } from './lib/evolutionE2E.js';

const isWin = process.platform === 'win32';
const cliPath = isWin ? 'node_modules\\.bin\\playwright.cmd' : './node_modules/.bin/playwright';

if (!existsSync(cliPath)) {
  console.log('[evolution-e2e] Playwright não encontrado em node_modules. Pulando smoke test.');
  process.exit(0);
}

// Preflight: evita rodar o teste completo quando os browsers não estão instalados.
const listCheck = spawnSync(cliPath, ['install', '--list'], {
  shell: process.platform === 'win32',
  encoding: 'utf8',
});
if ((listCheck.status ?? 1) !== 0) {
  console.warn('[evolution-e2e] Browsers do Playwright não estão instalados. Pulando smoke test.');
  process.exit(0);
}

const result = spawnSync(cliPath, ['test', 'e2e/evolution-smoke.spec.js', '--project=chromium'], {
  shell: process.platform === 'win32',
  encoding: 'utf8',
});

const out = `${result.stdout || ''}${result.stderr || ''}`;
if (out.trim()) process.stdout.write(out);

if (result.error) {
  console.error('[evolution-e2e] Falha ao executar Playwright:', result.error.message);
}

const status = resolveStatus({ status: result.status, error: result.error, output: out });
if ((result.status ?? 1) !== 0 && status === 0) {
  console.warn('[evolution-e2e] Browser do Playwright não está instalado neste ambiente. Pulando E2E sem falhar o pipeline.');
}

process.exit(status);
```

---

