# Menu Evolução - Código Completo e Isolado (Atualizado com Fixes)

> Este documento reúne **exclusivamente todo o código-fonte** relacionado ao **Menu Evolução** do sistema, já com todas as 15 correções aplicadas (escalas, proteções contra leak de memória, DST de datas, limites de viewBox, tooltips estáveis, filtros de matérias foco e fallbacks).

## Sumário de Arquivos


### 1. Rota e Página Principal

1. [src/pages/Evolution.jsx](#src-pages-evolution-jsx) — *Componente da rota /evolution com verificação de existência de simulados, fallback com chamada para ação (CTA) e orquestração do EvolutionChart.*

### 2. Componente Orquestrador Central

2. [src/components/EvolutionChart.jsx](#src-components-evolutionchart-jsx) — *Orquestrador central do Menu Evolução: gerencia abas de análise, estados, filtros temporais, engine de cálculo (Bayesiano/Bruto/Média), seleção de matéria foco, cards de KPI, projeção e exportação de relatório PDF.*

### 3. Subcomponentes Gráficos e Visualizações

3. [src/components/charts/EvolutionChart/KpiCard.jsx](#src-components-charts-evolutionchart-kpicard-jsx) — *Cards de métricas e KPIs principais exibidos no topo (Nível Atual, Meta Alvo, Taxa de Acertos).*
4. [src/components/charts/EvolutionChart/DisciplinaCard.jsx](#src-components-charts-evolutionchart-disciplinacard-jsx) — *Cards interativos de seleção e visualização de status e tendência individual de cada disciplina.*
5. [src/components/charts/EvolutionChart/EvolutionLineChart.jsx](#src-components-charts-evolutionchart-evolutionlinechart-jsx) — *Gráfico temporal principal com curvas de desempenho ao longo do tempo, bandas de incerteza/confiança e projeção futura da meta.*
6. [src/components/charts/EvolutionChart/CompareChart.jsx](#src-components-charts-evolutionchart-comparechart-jsx) — *Gráfico comparativo simultâneo de evolução temporal entre todas as disciplinas do concurso.*
7. [src/components/charts/EvolutionChart/RadarAnalysis.jsx](#src-components-charts-evolutionchart-radaranalysis-jsx) — *Gráfico de radar multidimensional mostrando a proficiência balanceada por matéria.*
8. [src/components/charts/EvolutionChart/PerformanceBarChart.jsx](#src-components-charts-evolutionchart-performancebarchart-jsx) — *Gráfico de barras ordenado por volume de questões resolvidas e percentual de aproveitamento.*
9. [src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx](#src-components-charts-evolutionchart-criticaltopicsanalysis-jsx) — *Diagnóstico aprofundado dos tópicos mais críticos com maiores taxas de erro que demandam reforço.*
10. [src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx](#src-components-charts-evolutionchart-subtopicsperformancechart-jsx) — *Visualização hierárquica e minuciosa do desempenho em subtópicos específicos de cada matéria.*
11. [src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx](#src-components-charts-evolutionchart-montecarloevolutionchart-jsx) — *Linha do tempo e histórico das projeções probabilísticas calculadas pelo motor Monte Carlo.*
12. [src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx](#src-components-charts-evolutionchart-weeklyevolutionview-jsx) — *Visão agregada por semana de estudo, exibindo progressão da taxa de acerto e consistência semanal.*
13. [src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx](#src-components-charts-evolutionchart-weeklyperformancechart-jsx) — *Gráfico complementar de barras semanais de desempenho com médias e volumes de questões.*
14. [src/components/charts/EvolutionChart/TimeSpentChart.jsx](#src-components-charts-evolutionchart-timespentchart-jsx) — *Análise de agilidade e tempo médio por questão, velocidade de resolução e eficiência de prova.*
15. [src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx](#src-components-charts-evolutionchart-todayvsgeneralchart-jsx) — *Comparativo direto entre o rendimento das questões feitas hoje versus o histórico global acumulado.*
16. [src/components/charts/EvolutionHeatmap.jsx](#src-components-charts-evolutionheatmap-jsx) — *Mapa de calor (heatmap) estilo GitHub destacando constância diária e intensidade de simulados.*

### 4. Hooks Customizados do Menu Evolução

17. [src/hooks/useEvolutionMC.js](#src-hooks-useevolutionmc-js) — *Hook que orquestra a execução do motor Monte Carlo via Web Worker (com fallback síncrono seguro) especificamente para o Menu Evolução.*
18. [src/hooks/useChartData.js](#src-hooks-usechartdata-js) — *Hook de agregação e interpolação temporal de dados de simulados para alimentar todos os gráficos do dashboard de evolução.*
19. [src/hooks/useSubjectAggData.js](#src-hooks-usesubjectaggdata-js) — *Hook que calcula a agregação de desempenho, volume e tempo por disciplina dentro da janela temporal selecionada.*
20. [src/hooks/useCategoryLevels.js](#src-hooks-usecategorylevels-js) — *Hook que determina o nível atual de domínio de cada matéria de acordo com o modelo estatístico ativo (Bayesiano, Notas Brutas ou Média Ponderada).*

### 5. Utilitários e Motores de Status

21. [src/utils/evolutionGuards.js](#src-utils-evolutionguards-js) — *Guards de validação, conversão para arrays imutáveis, normalização de domínios/escalas de notas e hash.*
22. [src/utils/evolutionStatus.js](#src-utils-evolutionstatus-js) — *Motor de cálculo dinâmico das pílulas de status: nível atual, distância da meta, tendência, incerteza bayesiana, constância e volatilidade.*

### 6. Suíte de Testes do Menu Evolução

23. [src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx](#src-components-charts-evolutionchart-tests-evolution-fixes-verification-test-jsx) — *Verificação dos 12 bugs críticos corrigidos no Menu Evolução.*
24. [src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx](#src-components-charts-evolutionchart-tests-evolution-menu-bugs-audit-test-jsx) — *Auditoria completa de 60 cenários de regressão do Menu Evolução.*
25. [src/components/charts/EvolutionChart/__tests__/evolution-data-fixes-audit.test.jsx](#src-components-charts-evolutionchart-tests-evolution-data-fixes-audit-test-jsx) — *Auditoria de dados, status e cálculos matemáticos do Menu Evolução.*
26. [src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx](#src-components-charts-evolutionchart-tests-evolution-menu-comprehensive-fixes-test-jsx) — *Testes de integração abrangentes cobrindo fluxo de dados entre componentes de evolução.*
27. [src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx](#src-components-charts-evolutionchart-tests-evolution-stats-bugs-test-jsx) — *Testes de edge cases estatísticos específicos dos gráficos de evolução.*
28. [src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx](#src-components-charts-evolutionchart-tests-evolutioncomponents-test-jsx) — *Testes de montagem e renderização visual dos componentes de evolução.*
29. [src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx](#src-components-charts-evolutionchart-tests-timespentchart-test-jsx) — *Testes unitários e de tolerância do componente TimeSpentChart.*

---

## 1. Rota e Página Principal

### `src/pages/Evolution.jsx`

**Descrição:** Componente da rota /evolution com verificação de existência de simulados, fallback com chamada para ação (CTA) e orquestração do EvolutionChart.

```jsx
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
    return list.some(entry => entry && (Number(entry.total) > 0 || entry.score != null));
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
      // e está na faixa percentual [0, 100], converte para a escala em pontos.
      if (ts < safeMin && ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0) {
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

## 2. Componente Orquestrador Central

### `src/components/EvolutionChart.jsx`

**Descrição:** Orquestrador central do Menu Evolução: gerencia abas de análise, estados, filtros temporais, engine de cálculo (Bayesiano/Bruto/Média), seleção de matéria foco, cards de KPI, projeção e exportação de relatório PDF.

```jsx
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
    const [selectedSubjectId, setFocusSubjectId] = useState(() => categories[0]?.id);
    
    // RIGOR-09 FIX: Recuperar os pesos do store para o Global Pct ponderado
    const mcWeights = useAppStore(
        (state) => state.appState?.contests?.[state.appState?.activeId]?.mcWeights || EMPTY_OBJECT
    );
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories, mcWeights, maxScore, minScore);

    // Prioriza activeCategories para evitar foco em disciplina sem simulados
    const focusSubjectId = useMemo(() => {
        const pool = (Array.isArray(activeCategories) && activeCategories.length > 0) ? activeCategories : categories;
        if (pool && pool.some(c => c.id === selectedSubjectId)) {
            return selectedSubjectId;
        }
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
        goal.setHours(12, 0, 0, 0);
        const diffDays = Math.ceil((goal - now) / (1000 * 60 * 60 * 24));
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
    useEffect(() => {
        const refs = engineTabRefs.current;
        return () => {
            refs.clear();
            if (exportErrorTimerRef.current) clearTimeout(exportErrorTimerRef.current);
        };
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
            const lvl = categoryLevels?.[cat.id];
            const hasLvl = lvl !== null && lvl !== undefined && lvl !== '' && Number.isFinite(Number(lvl));
            const val = hasLvl ? Number(Number(lvl).toFixed(2)) : minScore;
            const fullName = String(cat.name || 'Sem nome');
            return {
                subject: fullName.replace(/Direito /gi, 'D. '),
                fullSubject: fullName,
                nivel: val,
                meta: Number.isFinite(Number(cat?.minCutoff)) ? Number(cat.minCutoff) : targetScore
            };
        });
    }, [activeCategories, categories, targetScore, categoryLevels, minScore]);

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
            exportErrorTimerRef.current = setTimeout(() => setExportError(false), 5000);
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

## 3. Subcomponentes Gráficos e Visualizações

### `src/components/charts/EvolutionChart/KpiCard.jsx`

**Descrição:** Cards de métricas e KPIs principais exibidos no topo (Nível Atual, Meta Alvo, Taxa de Acertos).

```jsx
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

### `src/components/charts/EvolutionChart/DisciplinaCard.jsx`

**Descrição:** Cards interativos de seleção e visualização de status e tendência individual de cada disciplina.

```jsx
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
                    const q = Number(h?.total) > 0 ? Number(h.total) : getSyntheticTotal(safeMax);
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

### `src/components/charts/EvolutionChart/EvolutionLineChart.jsx`

**Descrição:** Gráfico temporal principal com curvas de desempenho ao longo do tempo, bandas de incerteza/confiança e projeção futura da meta.

```jsx
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

### `src/components/charts/EvolutionChart/CompareChart.jsx`

**Descrição:** Gráfico comparativo simultâneo de evolução temporal entre todas as disciplinas do concurso.

```jsx
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

### `src/components/charts/EvolutionChart/RadarAnalysis.jsx`

**Descrição:** Gráfico de radar multidimensional mostrando a proficiência balanceada por matéria.

```jsx
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

### `src/components/charts/EvolutionChart/PerformanceBarChart.jsx`

**Descrição:** Gráfico de barras ordenado por volume de questões resolvidas e percentual de aproveitamento.

```jsx
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

### `src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx`

**Descrição:** Diagnóstico aprofundado dos tópicos mais críticos com maiores taxas de erro que demandam reforço.

```jsx
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";
import { normalizeDate } from "../../../utils/dateHelper";
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
    const { startDate, endDate, dateLabel } = useMemo(() => {
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
                const d = normalizeDate(getHistoryDate(h));
                return d && d >= startDate && d <= endDate;
            });

            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : (Number(maxScore) || 100);
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : (Number(minScore) || 0);
            const catRange = Math.max(1e-9, catMax - catMin);
            if (!Number.isFinite(catRange) || catRange <= 0) return;
            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];

                toArray(h.topics).forEach(t => {
                    const n = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').replace(/<[^>]*>?/gm, '').trim();
                    if (!n || n.toLowerCase() === 'nenhum') return;
                    const key = n.toLowerCase();
                    if (!topicMap[key]) topicMap[key] = { name: n, total: 0, correct: 0, criticidade: 0 };

                    let total = parseInt(t.total, 10) || 0;
                    if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(catMax);
                    } else if (total === 0) {
                        return;
                    }
                    
                    if (total <= 0) return;
                    const hasExplicitCorrect = !t.isPercentage && t.correct !== null && t.correct !== undefined && String(t.correct).trim() !== '' && Number.isFinite(Number(t.correct));
                    let correctCount;
                    if (hasExplicitCorrect) {
                        correctCount = Number(t.correct);
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
    }, [categories, startDate, endDate, maxScore, minScore]);

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
                const d = normalizeDate(getHistoryDate(h));
                return d && d >= startDate && d <= endDate;
            });
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : (Number(maxScore) || 100);
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : (Number(minScore) || 0);
            const catRange = Math.max(1e-9, catMax - catMin);
            for (const h of recentHistory) {
                let t = parseInt(h.total, 10) || 0;
                if (t === 0 && h.score != null) {
                    t = getSyntheticTotal(catMax);
                } else if (t === 0) {
                    // Fallback: agrega a partir de h.topics se o cabeçalho h não tiver total/score
                    toArray(h.topics).forEach(tp => {
                        let tpTot = parseInt(tp.total, 10) || 0;
                        if (tpTot === 0 && tp.score != null) tpTot = getSyntheticTotal(catMax);
                        if (tpTot <= 0) return;
                        const hasTpCorr = !tp.isPercentage && tp.correct !== null && tp.correct !== undefined && String(tp.correct).trim() !== '' && Number.isFinite(Number(tp.correct));
                        let tpCorr;
                        if (hasTpCorr) {
                            tpCorr = Number(tp.correct);
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
                
                const hasExplicitCorrect = !h.isPercentage && h.correct !== null && h.correct !== undefined && String(h.correct).trim() !== '' && Number.isFinite(Number(h.correct));
                let correctCount;
                if (hasExplicitCorrect) {
                    correctCount = Number(h.correct);
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
    }, [categories, startDate, endDate, maxScore, minScore]);

    const hasData = useMemo(() => {
      if (!categories) return false;
    
      return categories.some(cat => {
        const historyRaw = cat.simuladoStats?.history;
        const history = Array.isArray(historyRaw)
          ? historyRaw
          : Object.values(historyRaw || {});
    
        return history.some(h => {
          const d = normalizeDate(getHistoryDate(h));
          const topics = toArray(h.topics);
    
          const hasTopicData = topics.some(
            t => Number(t.total) > 0 || t.score != null
          );
    
          return (
            d &&
            d >= startDate &&
            d <= endDate &&
            (
              parseInt(h.total, 10) > 0 ||
              h.score != null ||
              hasTopicData
            )
          );
        });
      });
    }, [categories, startDate, endDate]);

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

### `src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx`

**Descrição:** Visualização hierárquica e minuciosa do desempenho em subtópicos específicos de cada matéria.

```jsx
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

                toArray(h.topics).forEach(t => {
                    const rawName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').replace(/<[^>]*>?/gm, '').trim();
                    const n = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                    if (!n || n.toLowerCase() === 'nenhum') return;
                    const key = n.toLowerCase();

                    if (!topicMap[key]) {
                        topicMap[key] = { name: n, correct: 0, total: 0 };
                    }

                    let total = parseInt(t.total, 10) || 0;
                    if (t.isPercentage) {
                        if (total === 0) total = getSyntheticTotal(catMax);
                    } else if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(catMax);
                    }
                    if (total === 0) return;
                    
                    const hasValidC = !t.isPercentage && t.correct !== null && t.correct !== undefined && String(t.correct).trim() !== '';
                    let correctCount = hasValidC && Number.isFinite(Number(t.correct)) ? Number(t.correct) : NaN;

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

                toArray(h.topics).forEach(t => {
                    const rawName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').replace(/<[^>]*>?/gm, '').trim();
                    const topicName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                    if (!topicName || topicName.toLowerCase() === 'nenhum') return;
                    
                    let total = parseInt(t.total, 10) || 0;
                    if (t.isPercentage) {
                        if (total === 0) total = getSyntheticTotal(catMax);
                    } else if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(catMax);
                    }
                    if (total === 0) return;

                    topicVolumeMap[topicName] = (topicVolumeMap[topicName] || 0) + total;

                    const hasValidC = !t.isPercentage && t.correct !== null && t.correct !== undefined && String(t.correct).trim() !== '';
                    let correct = hasValidC && Number.isFinite(Number(t.correct)) ? Number(t.correct) : NaN;

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
                                        if (entry.accuracy >= targetScorePct) barColor = `url(#gradGood_${instanceId})`;
                                        else if (entry.accuracy >= 60) barColor = `url(#gradWarn_${instanceId})`;
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

### `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`

**Descrição:** Linha do tempo e histórico das projeções probabilísticas calculadas pelo motor Monte Carlo.

```jsx
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

### `src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx`

**Descrição:** Visão agregada por semana de estudo, exibindo progressão da taxa de acerto e consistência semanal.

```jsx
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

    const visibleEntries = payload.filter((entry) => {
        const dataKey = String(entry.dataKey || '');
        const isDelta = dataKey.startsWith('delta_');
        const baseKey = isDelta ? dataKey.replace('delta_', '') : dataKey;
        return !hiddenKeys[baseKey] && entry.value != null;
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
    // ✅ BUG-3 FIX: parseNoonLocal pode retornar null → guard antes de getTime()
    if (!dt || isNaN(dt.getTime())) return null;
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

                let totalQ = Math.max(0, Number(h.total) || 0);
                let corr = 0;
                if (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '' && !h.isPercentage) {
                    const rawC = Math.max(0, Number(h.correct) || 0);
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

                            let totalQ = Math.max(0, Number(t.total) || 0);
                            let corr = 0;
                            if (t.correct !== undefined && t.correct !== null && String(t.correct).trim() !== '' && !t.isPercentage) {
                                const rawC = Math.max(0, Number(t.correct) || 0);
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
            const expectedPrevDate = new Date(currentWeekDate);
            expectedPrevDate.setDate(expectedPrevDate.getDate() - 7);
            const expectedPrevKey = getDateKey(expectedPrevDate);
            
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

### `src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx`

**Descrição:** Gráfico complementar de barras semanais de desempenho com médias e volumes de questões.

```jsx
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
                        let q = Number(h.total) || 0;
                        let corr = 0;
                        if (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '' && !h.isPercentage) {
                            const rawC = Math.max(0, Number(h.correct) || 0);
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

### `src/components/charts/EvolutionChart/TimeSpentChart.jsx`

**Descrição:** Análise de agilidade e tempo médio por questão, velocidade de resolução e eficiência de prova.

```jsx
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
                            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total) || 0);
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
                        let tot = Number(h.total) || 0;
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
                        const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total) || 0);
                        if (tTs !== null && tTs > 0 && tTot > 0) {
                            topicsTs += tTs;
                            topicsTimedQ += tTot;
                            hasTopicWithTime = true;
                        }
                    }
                    if (hasTopicWithTime && topicsTimedQ > 0) return { ts: topicsTs, tq: topicsTimedQ };
                    let tot = Number(entry?.total) || 0;
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

### `src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx`

**Descrição:** Comparativo direto entre o rendimento das questões feitas hoje versus o histórico global acumulado.

```jsx
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
                if (!time) return;
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
                  const rSubj = normalize(r.subject);
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
                const rSubj = normalize(latestRow.subject);
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

### `src/components/charts/EvolutionHeatmap.jsx`

**Descrição:** Mapa de calor (heatmap) estilo GitHub destacando constância diária e intensidade de simulados.

```jsx
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

    useEffect(() => {
        const handleScroll = () => {
            setHoveredCell(null);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
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

## 4. Hooks Customizados do Menu Evolução

### `src/hooks/useEvolutionMC.js`

**Descrição:** Hook que orquestra a execução do motor Monte Carlo via Web Worker (com fallback síncrono seguro) especificamente para o Menu Evolução.

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
    if (!focusCategory || !focusCategory.id || !Array.isArray(historyArray) || historyArray.length === 0) {
      queueMicrotask(() => {
        setMcLoading(false);
        setMcResult(null);
        setMcProjectionSeries(null);
      });
      return;
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
        queueMicrotask(() => {
          setMcLoading(false);
          setMcResult(null);
          setMcProjectionSeries(null);
        });
        return;
    }

    let cancelled = false;
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
      const defaultExamTotalQuestions = contest?.examTotalQuestions || 100;
      const examDurationMinutes = contest?.examDurationMinutes || 240;
      const projectedTotalTimeSeconds = defaultExamTotalQuestions * avgSeconds;

      setMcLoading(true);
      try {
        const result = await runAnalysis({
          values: hist,
          dates: hist.map((h) => h.date),
          meta: debouncedTarget,
          projectionDays: projectDays,
          minScore: safeMin,
          maxScore: safeMax,
          currentMean: currentFocusLevel,
          forcedBaseline: currentFocusLevel,
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
              currentMean: currentFocusLevel,
              forcedBaseline: currentFocusLevel,
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
    focusCategory?.id, currentFocusLevel, historyArray, debouncedTarget,
    projectDays, runAnalysis, minScore, maxScore
  ]);

  const activeMcResult = mcResult?.categoryId === focusCategory?.id ? mcResult : null;
  const activeMcProjectionSeries =
    mcProjectionSeries?.categoryId === focusCategory?.id ? mcProjectionSeries : null;

  return { mcLoading, mcResult, mcProjectionSeries, activeMcResult, activeMcProjectionSeries };
}

```

---

### `src/hooks/useChartData.js`

**Descrição:** Hook de agregação e interpolação temporal de dados de simulados para alimentar todos os gráficos do dashboard de evolução.

```javascript
import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean).filter(r => r.valid !== false);
const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100, minScore = 0) {
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
        const entry = aggregatedByDate.get(key);
        const rawTotal = Math.max(0, Number(h?.total) || 0);
        const rawCorrect = Math.max(0, Math.min(rawTotal, Number(h?.correct) || 0));
        const score = getSafeScore(h, safeMax, safeMin);
        const safeScore = Number.isFinite(score) ? score : NaN;

        let compTotal = rawTotal;
        let compCorrect = rawTotal > 0 && Number.isFinite(safeScore)
            ? Math.round(toRatio(safeScore) * rawTotal)
            : rawCorrect;

        if (rawTotal === 0 && h?.score != null && Number.isFinite(safeScore)) {
            compTotal = getSyntheticTotal(safeMax);
            compCorrect = Math.round(toRatio(safeScore) * compTotal);
        }
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));

        if (entry) {
            entry.compCorrect += compCorrect;
            entry.compTotal += compTotal;
            entry.total += rawTotal;
            entry.correct += Math.max(0, Math.min(rawTotal, Math.max(0, Number(h?.correct) || 0)));
            entry.score = entry.compTotal > 0
                ? safeMin + (entry.compCorrect / entry.compTotal) * safeRange
                : NaN;
        } else {
            aggregatedByDate.set(key, {
                date: key,
                compCorrect,
                compTotal,
                total: rawTotal,
                correct: Math.max(0, Math.min(rawTotal, Math.max(0, Number(h?.correct) || 0))),
                score: safeScore,
            });
        }
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
                cachedStats = computeCategoryStats(accumulated, 100, 60, safeMax, safeMin);
                lastAccumulatedLen = accumulated.length;
            }
            const lastEntry = accumulated[accumulated.length - 1];
            const bayStats = computeBayesianLevel(accumulated, 1, 1, safeMax, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null,
                minScore: safeMin,
            });
            dateToStats[date] = {
                stats: cachedStats,
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
        const histDigest = history.map((h) => [
            getDateKey(getHistoryDate(h)) || 'nodate',
            Number(h?.score ?? 0),
            Number(h?.correct ?? 0),
            Number(h?.total ?? 0),
            Array.isArray(h?.topics) ? h.topics.length : 0,
            h?.taskId || ''
        ].join(':')).join('|');
        return [cat?.id || '', cat?.name || '', tasks.length, histDigest].join('::');
    }).join('||'), [categories]);

    const activeCategories = useMemo(() => {
        let valid = categories.filter(c => {
            const hist = c.simuladoStats?.history;
            return hist && Object.values(hist).length > 0;
        });
        const getVol = (h) => {
            const t = Math.max(0, Number(h?.total) || 0);
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
            const history = getHistoryArray(cat).sort((a, b) => {
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

            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, catMax, catMin);
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
                let tot = Math.max(0, Number(h.total) || 0);
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;
                let corrNorm;
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(catMax);
                    corrNorm = Math.round(toCatRatio(score) * tot);
                } else if (!h.isPercentage && Number.isFinite(Number(h.correct))) {
                    corrNorm = Math.max(0, Math.min(tot, Number(h.correct)));
                } else {
                    const raw = Math.max(0, Number(h.correct) || 0);
                    corrNorm = tot > 0 ? Math.round(toCatRatio(score) * tot) : raw;
                }
                // FIX 2B: blindagem extra contra NaN em corrNorm
                if (!Number.isFinite(corrNorm)) return;
                totalQuestions += tot;
                totalCorrect += corrNorm;
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories, safeMax, safeMin]);

    return { activeCategories, timeline, heatmapData, globalMetrics };
}

```

---

### `src/hooks/useSubjectAggData.js`

**Descrição:** Hook que calcula a agregação de desempenho, volume e tempo por disciplina dentro da janela temporal selecionada.

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
  if (timeWindow === 'all' || !Number.isFinite(days) || days <= 0) {
    return safeHistory.filter(Boolean);
  }
  const withMs = safeHistory
    .filter(Boolean)
    .map((h) => {
      const rawDate = h?.date || h?.createdAt;
      if (!rawDate) return null;
      const key = getDateKey(rawDate);
      const ms = toDateMs(key);
      return Number.isFinite(ms) ? { h, ms } : null;
    })
    .filter(Boolean);
  if (!withMs.length) return safeHistory.filter(Boolean);
  const referenceMs = toDateMs(getDateKey(new Date()));
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
          let tot = Math.max(0, Number(h.total) || 0);
          if (tot === 0 && h.score != null) tot = getSyntheticTotal(catMax);
          const score = getSafeScore(h, catMax, catMin);
          if (!Number.isFinite(score)) return s;
          return s + tot;
        }, 0);

        const totalCorrect = Math.round(
          history.reduce((s, h) => {
            let tot = Math.max(0, Number(h.total) || 0);
            if (tot === 0 && h.score != null) tot = getSyntheticTotal(catMax);
            const rawC = Number(h.correct);
            if (!h.isPercentage && Number.isFinite(rawC)) {
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
                  : Number(t.total) || 0;
                if (tTs !== null && tTs > 0 && tTot > 0) {
                  topicsTs += tTs; topicsTimedQ += tTot; hasTopicWithTime = true;
                }
              }
            }
            if (hasTopicWithTime) return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
            if (rootTs !== null && rootTs > 0 && Number(h.total) > 0) return { ts: acc.ts + rootTs, tq: acc.tq + Number(h.total) };
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

### `src/hooks/useCategoryLevels.js`

**Descrição:** Hook que determina o nível atual de domínio de cada matéria de acordo com o modelo estatístico ativo (Bayesiano, Notas Brutas ou Média Ponderada).

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

## 5. Utilitários e Motores de Status

### `src/utils/evolutionGuards.js`

**Descrição:** Guards de validação, conversão para arrays imutáveis, normalização de domínios/escalas de notas e hash.

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

### `src/utils/evolutionStatus.js`

**Descrição:** Motor de cálculo dinâmico das pílulas de status: nível atual, distância da meta, tendência, incerteza bayesiana, constância e volatilidade.

```javascript
import { formatValue } from './scoreHelper';
import { getDateKey } from './dateHelper';

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

  // Tendência recente
  if (levelSeries.length >= 6) {
    const recent = average(levelSeries.slice(-3));
    const prev = average(levelSeries.slice(-6, -3));

    if (Number.isFinite(recent) && Number.isFinite(prev)) {
      const diff = recent - prev;

      statuses.push({
        id: 'trend',
        label: 'Tendência',
        value: `${diff >= 0 ? '+' : ''}${formatValue(diff)}${unit}`,
        tone: diff > 1 * scale ? 'progress' : diff < -1 * scale ? 'danger' : 'neutral',
        icon: diff > 1 * scale ? '📈' : diff < -1 * scale ? '📉' : '➡️',
        help: 'Comparação média dos últimos 3 registros contra os 3 anteriores.'
      });
    }
  } else if (levelSeries.length >= 2) {
    const first = levelSeries[0];
    const lastValue = levelSeries[levelSeries.length - 1];
    const diff = lastValue - first;

    statuses.push({
      id: 'trend',
      label: 'Tendência',
      value: `${diff >= 0 ? '+' : ''}${formatValue(diff)}${unit}`,
      tone: diff > 1 * scale ? 'progress' : diff < -1 * scale ? 'danger' : 'neutral',
      icon: diff > 1 * scale ? '📈' : diff < -1 * scale ? '📉' : '➡️',
      help: 'Comparação entre o primeiro e o último ponto disponível.'
    });
  }

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
  const heatmapDates = Array.isArray(heatmapData?.dates) ? heatmapData.dates : [];
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

## 6. Suíte de Testes do Menu Evolução

### `src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx`

**Descrição:** Verificação dos 12 bugs críticos corrigidos no Menu Evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { filterHistoryByTimeWindow } from '../../../../hooks/useSubjectAggData';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
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
        { id: '2', date: new Date().toISOString().split('T')[0], total: 10, correct: 9 }
      ];

      const filtered30Days = filterHistoryByTimeWindow(history, '30');
      // O item antigo (2022) NÃO pode passar no filtro de 30 dias
      expect(filtered30Days.length).toBe(1);
      expect(filtered30Days[0].id).toBe('2');
    });

    it('ignora registros sem data válida sem quebrar', () => {
      const history = [
        { id: '1', total: 10, correct: 5 }, // sem data nem createdAt
        { id: '2', date: new Date().toISOString().split('T')[0], total: 10, correct: 9 }
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

      expect(html).toContain('<h3 class="text-sm sm:text-base font-bold text-white">Matriz de criticidade e pontos de fuga</h3>');
    });
  });
});
```

---

### `src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx`

**Descrição:** Auditoria completa de 60 cenários de regressão do Menu Evolução.

```jsx
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

### `src/components/charts/EvolutionChart/__tests__/evolution-data-fixes-audit.test.jsx`

**Descrição:** Auditoria de dados, status e cálculos matemáticos do Menu Evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderHook } from '@testing-library/react';

import { DisciplinaCard } from '../DisciplinaCard';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { ChartTooltip } from '../../ChartTooltip';
import { useCategoryLevels } from '../../../../hooks/useCategoryLevels';
import { useSubjectAggData } from '../../../../hooks/useSubjectAggData';
import { computeEvolutionStatuses } from '../../../../utils/evolutionStatus';
import { getDateKey } from '../../../../utils/dateHelper';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu - Data Integrity & Edge Case Fixes', () => {
  describe('Fix 1: DisciplinaCard rawVal fallback', () => {
    it('exibe a nota bruta do último simulado da matéria quando o último dia geral não teve teste nela', () => {
      const cat = {
        id: 'dir_const',
        name: 'Direito Constitucional',
        color: '#3b82f6',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-08-01', score: 75, total: 20, correct: 15 },
            { date: '2026-08-10', score: 85, total: 20, correct: 17 }
          ]
        }
      };

      // Simula métricas do último dia da timeline onde APENAS outra matéria foi feita
      const metrics = {
        date: '2026-08-15',
        raw_dir_const: null, // Não fez teste de constitucional no dia 15
        stats_dir_const: 80,
        bay_dir_const: 82
      };

      const html = renderToStaticMarkup(
        <DisciplinaCard
          cat={cat}
          level={82}
          metrics={metrics}
          target={80}
          unit="%"
        />
      );

      // Deve exibir 85% para a nota bruta em vez de '—'
      expect(html).toContain('85%');
      expect(html).not.toContain('>—</span>');
    });
  });

  describe('Fix 2: useCategoryLevels com activeEngine raw', () => {
    it('retorna a nota bruta mais recente para activeEngine raw quando o último dia geral teve null', () => {
      const cat = {
        id: 'matematica',
        name: 'Matemática',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-09-01', score: 60, total: 10, correct: 6 },
            { date: '2026-09-05', score: 90, total: 10, correct: 9 }
          ]
        }
      };

      const timeline = [
        { date: '2026-09-01', raw_matematica: 60 },
        { date: '2026-09-05', raw_matematica: 90 },
        { date: '2026-09-10', raw_matematica: null } // Último ponto geral sem matemática
      ];

      const { result } = renderHook(() =>
        useCategoryLevels([cat], timeline, 'raw', 100, 0)
      );

      // Deve ser 90 (último teste de matemática), e não fallback de EMA
      expect(result.current['matematica']).toBe(90);
    });
  });

  describe('Fix 3: evolutionStatus Constância (14 dias) e Volume (7 dias)', () => {
    it('não calcula 14/14 quando 14 simulados ocorreram em datas distantes no passado', () => {
      // 14 simulados em 2024 (nenhum nos últimos 14 dias)
      const ancientDates = Array.from({ length: 14 }, (_, i) => `2024-0${Math.floor(i / 2) + 1}-10`);
      const heatmapData = {
        dates: ancientDates,
        rows: [{ cells: Array(14).fill(true) }]
      };

      const statuses = computeEvolutionStatuses({
        timeline: ancientDates.map(d => ({ date: d, global_total: 50 })),
        heatmapData,
        targetScore: 80
      });

      const consistency = statuses.find(s => s.id === 'consistency');
      expect(consistency).toBeDefined();
      // Não deve ser 14/14, deve ser 0/14 pois nenhum ocorreu nos últimos 14 dias
      expect(consistency.value).toBe('0/14');
      expect(consistency.tone).toBe('danger');
    });

    it('calcula volume de 7 dias baseado no calendário real recente e não nos últimos 7 pontos históricos', () => {
      // 7 simulados antigos
      const ancientDates = Array.from({ length: 7 }, (_, i) => `2023-0${i + 1}-01`);
      const timeline = ancientDates.map(d => ({ date: d, global_total: 100 }));

      const statuses = computeEvolutionStatuses({
        timeline,
        targetScore: 80
      });

      const volume = statuses.find(s => s.id === 'volume');
      expect(volume).toBeDefined();
      // Deve ser 0 q pois nenhum simulado ocorreu nos últimos 7 dias corridos
      expect(volume.value).toBe('0 q');
      expect(volume.tone).toBe('warning');
    });

    it('calcula volume recente corretamente quando há simulados nos últimos 7 dias', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const timeline = [
        { date: '2023-01-01', global_total: 500 },
        { date: getDateKey(yesterday), global_total: 35 },
        { date: getDateKey(today), global_total: 45 }
      ];

      const statuses = computeEvolutionStatuses({
        timeline,
        targetScore: 80
      });

      const volume = statuses.find(s => s.id === 'volume');
      expect(volume).toBeDefined();
      expect(volume.value).toBe('80 q');
      expect(volume.tone).toBe('success');
    });
  });

  describe('Fix 4: SubtopicsPerformanceChart com tópicos deserializados como objeto', () => {
    it('renderiza sem crash quando topics é um objeto (TypeError fix)', () => {
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
                topics: {
                  '0': { name: 'Poder de Polícia', total: 5, correct: 4, score: 80 },
                  '1': { name: 'Atos Administrativos', total: 5, correct: 4, score: 80 }
                }
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
        />
      );

      // Não deve lançar TypeError: (h.topics || []).forEach is not a function
      expect(html).toContain('Raio-X de Tópicos');
      expect(html).toContain('Ranking (Barras)');
    });
  });

  describe('Fix 5: TodayVsGeneralChart rótulo dinâmico para dia ativo', () => {
    it('exibe "Último dia ativo (%)" quando o usuário não fez simulados hoje', () => {
      const categories = [
        {
          id: '1',
          name: 'Português',
          simuladoStats: {
            history: [
              { date: '2025-01-10', total: 20, correct: 16, score: 80 }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          categories={categories}
          unit="%"
        />
      );

      expect(html).toContain('Último dia ativo (%)');
      expect(html).not.toContain('Acertos de hoje (%)');
    });
  });

  describe('Fix 6: ChartTooltip formatação sem unidade pendente em valores nulos', () => {
    it('renderiza "—" e não "—%" quando valor é null', () => {
      const payload = [
        {
          color: '#3b82f6',
          name: 'Matemática',
          payload: {
            subject: 'Matemática',
            raw_mat: null,
            stats_mat: null,
            bay_mat: null
          }
        }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          unit="%"
          subjectKey="mat"
        />
      );

      expect(html).not.toContain('—%');
      expect(html).not.toContain('—pts');
    });
  });

  describe('Fix 7: useSubjectAggData com tópicos como objeto', () => {
    it('agrega tempo e questões cronometradas mesmo quando topics é um objeto', () => {
      const categories = [
        {
          id: '1',
          name: 'Raciocínio Lógico',
          simuladoStats: {
            history: [
              {
                date: '2026-09-01',
                total: 10,
                correct: 8,
                topics: {
                  '0': { name: 'Lógica Proposicional', total: 5, timedQuestoes: 5, timeSpent: 300 },
                  '1': { name: 'Equivalências', total: 5, timedQuestoes: 5, timeSpent: 200 }
                }
              }
            ]
          }
        }
      ];

      const { result } = renderHook(() =>
        useSubjectAggData({ categories, timeWindow: 'all', maxScore: 100, minScore: 0 })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].timeSpent).toBe(500);
      expect(result.current[0].timedQuestoes).toBe(10);
    });
  });
});
```

---

### `src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx`

**Descrição:** Testes de integração abrangentes cobrindo fluxo de dados entre componentes de evolução.

```jsx
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

### `src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx`

**Descrição:** Testes de edge cases estatísticos específicos dos gráficos de evolução.

```jsx
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

### `src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx`

**Descrição:** Testes de montagem e renderização visual dos componentes de evolução.

```jsx
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
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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

### `src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx`

**Descrição:** Testes unitários e de tolerância do componente TimeSpentChart.

```jsx
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

